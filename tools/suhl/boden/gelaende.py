"""suhl-boden: terrain tiles (t/{L}/{x}/{y}.bin, format WTH1 of tools/welt/tiles.py) for tile lists.

Built on tools/welt/dem.py without changing it. The height model of the existing pipeline holds one 1 m mosaic for a whole block in
memory; the municipality of Suhl (20.6 x 14.5 km) is too big for that, so the mosaic is built block by block:

  block        = one level-7 tile (3.2 x 3.2 km, aligned to every level's tile grid) + MARGIN on every side
  fine levels  (10, 11, 12: 4, 2, 1 m) are sampled from the block's 1 m mosaic and its 2x2 means, exactly as Dem.grid does
  coarse levels (9, 8, 7, 6: 8 .. 64 m) are sampled from ONE mosaic of 8 m cells over the whole area: the 8 m means of every block
               that was built, Copernicus where no block was built (far away, beyond the fine tiles)

What is in a block's mosaic is what Dem puts there: DGM1 (1 m, state data) where a tile is in the raw cache, else Copernicus GLO-30
with the forest canopy lowered, shifted by the offset Copernicus -> DGM1 (30 % quantile of the difference), DGM1 fading into
Copernicus over BLEND metres. Two things are shared by all blocks of a run so that neighbouring blocks agree on their common edge to
the centimetre: the Copernicus ground (one canopy height, fitted on the fixed window FIT) and the offset (one number for the run).
MARGIN = BLEND + 20 m: every pixel within 20 m of a block edge sees the same DGM1 neighbourhood from both blocks.
"""
import hashlib, json, os, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blib
from blib import log, tbounds, tsize, wlib
import dem as wdem
import fetch as wfetch
import tiles as wtiles

BLOCK_L = 7
MARGIN = 320.0
BLEND = 300.0
CPX = 8.0                                            # cell size of the coarse mosaic = the step of level 9
FIT = (608800.0, 5601300.0, 631400.0, 5617800.0)     # canopy fit window: bounding box of the municipality + ~1 km (fixed for every run)
VERSION = 'g1'                                       # part of the block cache key: raise when the method changes
G = None                                             # the run's Ground (set before the worker pool forks)


class Ground(wdem.CopGround):
    """Copernicus GLO-30 with the forest canopy lowered - tools/welt/dem.py CopGround with the canopy height fitted on the fixed window
    FIT instead of the whole context, so that the sample set and the whole-city run stand on the same heights; plus the DGM1 tiles of
    the run and the one offset Copernicus -> DGM1."""

    def __init__(self, raw, ctx, use_trees=True):
        self.raw = raw
        self.cop = wfetch.Cop30(raw, ctx)
        self.trees, self.canopy, self.canopy_fit = None, 0.0, None
        self.dgm, self.off, self.dgm_log = {}, 0.0, {}
        if not use_trees:
            return
        # no silent fallback: without the tree mask every forest would stand a canopy height higher than in the last run
        from landcover import TreeMask
        self.trees = TreeMask(raw, ctx)
        from scipy import ndimage
        T = self.trees
        c0, c1 = int(round((FIT[0] - T.e0) / T.res)), int(round((FIT[2] - T.e0) / T.res))
        r0, r1 = int(round((T.n1 - FIT[3]) / T.res)), int(round((T.n1 - FIT[1]) / T.res))
        if not (0 <= c0 < c1 <= T.m.shape[1] and 0 <= r0 < r1 <= T.m.shape[0]):
            raise SystemExit(f'Ground: the context {ctx} does not hold the canopy fit window {FIT}')
        EE, NN = np.meshgrid(T.e0 + (np.arange(c0, c1) + 0.5) * T.res, T.n1 - (np.arange(r0, r1) + 0.5) * T.res)
        C = self.cop(EE, NN).astype(np.float64)
        M = T.m[r0:r1, c0:c1].astype(np.float64)
        hc = C - ndimage.gaussian_filter(C, 25)
        hm = M - ndimage.gaussian_filter(M, 25)
        k = float(np.sum(hc * hm) / max(np.sum(hm * hm), 1e-9))
        self.canopy_fit = k
        self.canopy = float(np.clip(k, 5.0, 30.0))
        self.tree_share = float(M.mean())
        log(f'Copernicus: Kronenhöhe im Fenster {FIT} geschätzt {k:.2f} m -> abgezogen {self.canopy:.2f} m unter Wald '
            f'(Wald {100 * self.tree_share:.0f} % des Fensters)')

    # ---- DGM1 (state data, 1 km tiles) ----
    def collect_dgm(self, km, providers=()):
        """get DGM1 for the 1 km tiles `km` (lower-left corners in km, in priority order): the raw cache, then the state's old download
        address (tools/welt/fetch.py fetch_dgm1 recognises its maintenance page and stops asking), then other providers - functions
        (raw, ex, ny) -> path of <raw>/dgm1/dgm1_32_{ex}_{ny}.zip or None. Then the one offset Copernicus -> DGM1 of the run."""
        n_cache = n_state = n_prov = 0
        for ex, ny in km:
            cached = os.path.exists(wfetch.dgm1_path(self.raw, 'dgm', ex, ny))
            p = wfetch.fetch_dgm1(self.raw, 'dgm', ex, ny)
            if p is not None:
                n_cache += cached
                n_state += not cached
            else:
                for prov in providers:
                    try:
                        p = prov(self.raw, ex, ny)
                    except Exception as e:
                        log('DGM1 provider failed', ex, ny, repr(e)[:200])
                        p = None
                    if p:
                        n_prov += 1
                        break
            if p:
                self.dgm[(ex, ny)] = p
        d = []
        for (ex, ny), p in sorted(self.dgm.items()):
            try:
                a, e0, n1, px = wfetch.read_dgm1(p)
            except Exception as e:
                log('DGM1 unreadable', p, repr(e)[:200])
                self.dgm.pop((ex, ny), None)
                continue
            rr, cc = np.nonzero(np.isfinite(a[::25, ::25]))
            hs = self(e0 + (cc * 25 + 0.5) * px, n1 - (rr * 25 + 0.5) * px)
            d.append(hs - a[::25, ::25][rr, cc])
        self.off = float(np.nanpercentile(np.concatenate(d), 30)) if d else 0.0
        self.dgm_log = {'asked': len(km), 'have': len(self.dgm), 'from_cache': n_cache, 'from_state_host': n_state, 'from_providers': n_prov,
                        'state_host_down': bool(wfetch._host_down.get('th')), 'offset_m': round(self.off, 3)}
        log('DGM1:', json.dumps(self.dgm_log))
        return self.dgm_log


class BlockDem(wdem.Dem):
    """the 1 m mosaic of one block. The steps of tools/welt/dem.py Dem.__init__ (DGM1 where there is a tile, Copernicus minus the offset
    elsewhere, DGM1 fading out over `blend` metres) with the ground and the offset of the run; sample, build_mips and grid are Dem's."""

    def __init__(self, area, ground, blend=BLEND):
        self.cop, self.cop_off = ground, ground.off
        e0, n0, e1, n1 = [float(v) for v in area]
        self.e0, self.n1, self.px = e0, n1, 1.0
        W, H = int(round(e1 - e0)), int(round(n1 - n0))
        mos = np.full((H, W), np.nan, np.float32)
        n_ok = n_try = 0
        for ex in range(int(e0 // 1000), int(np.ceil(e1 / 1000))):
            for ny in range(int(n0 // 1000), int(np.ceil(n1 / 1000))):
                n_try += 1
                p = ground.dgm.get((ex, ny))
                if p is None:
                    continue
                a, te0, tn1, tpx = wfetch.read_dgm1(p)
                if abs(tpx - 1.0) > 1e-3:
                    log('DGM1 pixel size', tpx, 'skipped', p)
                    continue
                r0, c0 = int(round(self.n1 - tn1)), int(round(te0 - self.e0))
                rs, cs = max(0, -r0), max(0, -c0)
                re, ce = min(a.shape[0], H - r0), min(a.shape[1], W - c0)
                if re <= rs or ce <= cs:
                    continue
                mos[r0 + rs:r0 + re, c0 + cs:c0 + ce] = a[rs:re, cs:ce]
                n_ok += 1
        have = np.isfinite(mos)
        self.dgm_tiles = (n_ok, n_try)
        cols = self.e0 + np.arange(W) + 0.5
        some, every = bool(have.any()), bool(have.all())
        k = None
        if some and not every:
            from scipy import ndimage
            k = wdem.smoothstep(0, blend, ndimage.distance_transform_edt(have).astype(np.float32))
        if not every:
            for r in range(0, H, 256):
                sl = slice(r, min(H, r + 256))
                EE, NN = np.meshgrid(cols, self.n1 - np.arange(sl.start, sl.stop) - 0.5)
                c = (ground(EE, NN) - ground.off).astype(np.float32)
                if k is None:
                    mos[sl] = c
                else:
                    mos[sl] = np.where(have[sl], mos[sl] * k[sl] + c * (1 - k[sl]), c)
        self.mos, self.have = mos, have
        self.source = 'dgm1' if every else ('cop30' if not some else 'dgm1+cop30')
        self.dgm_share = float(have.mean())
        self.mips = None


def block_of(L, x, y):
    return x >> (L - BLOCK_L), y >> (L - BLOCK_L)


def write_tile(out, L, x, y, b):
    d = os.path.join(out, 't', str(L), str(x))
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, f'{y}.bin')
    with open(p + '.tmp', 'wb') as f:
        f.write(b)
    os.replace(p + '.tmp', p)


def _init_worker():
    # every process gets its own PROJ transformer (the one made before the fork is not safe to share)
    from pyproj import Transformer
    G.cop.toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)


def do_block(job):
    """build one block: the level 10-12 tiles of the lists inside it -> files; returns the statistics and the 8 m means of its core"""
    bx, by, lists, out, work = job
    t0 = time.time()
    core = tbounds(BLOCK_L, bx, by)
    key = hashlib.sha1(json.dumps([VERSION, bx, by, sorted((L, sorted(v)) for L, v in lists.items()), round(G.off, 4), round(G.canopy, 4),
                                   sorted((k, os.path.getsize(p)) for k, p in G.dgm.items()
                                          if k[0] * 1000 < core[2] + MARGIN and (k[0] + 1) * 1000 > core[0] - MARGIN
                                          and k[1] * 1000 < core[3] + MARGIN and (k[1] + 1) * 1000 > core[1] - MARGIN)]).encode()).hexdigest()[:16]
    cache = os.path.join(work, f'block_{bx}_{by}_{key}.npz')
    files = [os.path.join(out, 't', str(L), str(x), f'{y}.bin') for L, v in lists.items() for x, y in v]
    if os.path.exists(cache) and all(os.path.exists(f) for f in files):
        z = np.load(cache, allow_pickle=False)
        st = json.loads(str(z['stats']))
        st['resumed'] = True
        return st, z['core8']
    d = BlockDem((core[0] - MARGIN, core[1] - MARGIN, core[2] + MARGIN, core[3] + MARGIN), G)
    d.build_mips(3)
    st = {'block': [bx, by], 'source': d.source, 'dgm_share': round(d.dgm_share, 4), 'dgm_tiles': list(d.dgm_tiles), 'levels': {},
          'hmin': 1e9, 'hmax': -1e9, 'dgm10': {}}
    for L in sorted(lists):
        s = tsize(L)
        n = tot = 0
        for x, y in sorted(lists[L]):
            e0, n0, e1, n1 = tbounds(L, x, y)
            g = d.grid(e0, n0, s / (wlib.TERR_N - 1), wlib.TERR_N)
            if not np.isfinite(g).all():
                raise RuntimeError(f'terrain tile {L}/{x}/{y}: heights missing')
            b = wtiles.encode_heights(g)
            write_tile(out, L, x, y, b)
            n += 1
            tot += len(b)
            st['hmin'], st['hmax'] = min(st['hmin'], float(g.min())), max(st['hmax'], float(g.max()))
            if L == 10:      # how much of the tile stands on real 1 m terrain
                r0, c0 = int(round(d.n1 - n1)), int(round(e0 - d.e0))
                st['dgm10'][f'{x}/{y}'] = round(float(d.have[r0:r0 + int(s), c0:c0 + int(s)].mean()), 3)
        st['levels'][str(L)] = {'n': n, 'bytes': tot}
    m = int(MARGIN / CPX)
    core8 = np.ascontiguousarray(d.mips[3][m:-m, m:-m])
    st['seconds'] = round(time.time() - t0, 1)
    os.makedirs(work, exist_ok=True)
    np.savez(cache + '.tmp.npz', stats=json.dumps(st), core8=core8)
    os.replace(cache + '.tmp.npz', cache)
    return st, core8


class Coarse:
    """one mosaic of 8 m cells over the whole area (row 0 = north) and its 2x2 means: the heights of the levels 9, 8, 7, 6"""

    def __init__(self, ground, bbox):
        e0, n0, e1, n1 = bbox
        self.e0, self.n1 = e0, n1
        W, H = int(round((e1 - e0) / CPX)), int(round((n1 - n0) / CPX))
        self.m = np.empty((H, W), np.float32)
        cols = e0 + (np.arange(W) + 0.5) * CPX
        for r in range(0, H, 128):
            rows = np.arange(r, min(H, r + 128))
            EE, NN = np.meshgrid(cols, n1 - (rows + 0.5) * CPX)
            self.m[rows[0]:rows[-1] + 1] = ground(EE, NN) - ground.off
        self.pyr = None

    def paste(self, bx, by, core8):
        c = tbounds(BLOCK_L, bx, by)
        r0, c0 = int(round((self.n1 - c[3]) / CPX)), int(round((c[0] - self.e0) / CPX))
        h, w = core8.shape
        if r0 < 0 or c0 < 0 or r0 + h > self.m.shape[0] or c0 + w > self.m.shape[1]:
            raise RuntimeError(f'coarse mosaic does not hold block {bx}/{by}')
        self.m[r0:r0 + h, c0:c0 + w] = core8

    def grid(self, L, x, y):
        if self.pyr is None:
            self.pyr = [self.m]
            m = self.m
            for _ in range(3):
                h, w = (m.shape[0] // 2) * 2, (m.shape[1] // 2) * 2
                m = m[:h, :w].reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3)).astype(np.float32)
                self.pyr.append(m)
        j = 9 - L
        e0, n0 = tbounds(L, x, y)[:2]
        step = tsize(L) / (wlib.TERR_N - 1)
        EE, NN = np.meshgrid(e0 + np.arange(wlib.TERR_N) * step, n0 + np.arange(wlib.TERR_N) * step)
        v = wdem.bilinear(self.pyr[j], EE, NN, self.e0, self.n1, CPX * (1 << j))
        if not np.isfinite(v).all():
            raise RuntimeError(f'coarse terrain tile {L}/{x}/{y}: outside the mosaic')
        return v.astype(np.float32)


def dgm_km_list():
    """the 1 km tiles of the state data in the order Falko was given (P1 Zentrum, P2 Kernstadt, P3 Stadt, P4 corridors):
    tools/suhl/out/bestand/kacheln.csv"""
    import csv
    rows = [r for r in csv.DictReader(open(os.path.join(blib.BESTAND, 'kacheln.csv'), encoding='utf-8')) if r['produkt'] == 'DGM1']
    rows.sort(key=lambda r: r['prio'])
    return [(int(r['e_km']), int(r['n_km'])) for r in rows]


def build(raw, out, T, jobs=1, use_dgm=True, providers=(), use_trees=True):
    """terrain tiles of every level of the lists T -> out/t/; returns the statistics for meta.json"""
    global G
    t0 = time.time()
    r100 = lambda v, up: (np.ceil(v / 100) if up else np.floor(v / 100)) * 100
    cb = blib.bbox_of(6, T[6])
    cbox = (cb[0] - 128, cb[1] - 128, cb[2] + 128, cb[3] + 128)
    ctx = (r100(min(FIT[0], cbox[0] - 300), 0), r100(min(FIT[1], cbox[1] - 300), 0), r100(max(FIT[2], cbox[2] + 300), 1), r100(max(FIT[3], cbox[3] + 300), 1))
    G = Ground(raw, ctx, use_trees)
    if use_dgm:
        G.collect_dgm(dgm_km_list(), providers)
    # the blocks: every level-7 tile that holds a fine tile, or that a DGM1 tile (+ margin) reaches
    blocks = {}
    for L in (10, 11, 12):
        for x, y in T.get(L, ()):
            blocks.setdefault(block_of(L, x, y), {}).setdefault(L, []).append((x, y))
    s7 = tsize(BLOCK_L)
    for ex, ny in G.dgm:
        for bx in range(int((ex * 1000 - MARGIN - wlib.ROOT_E0) // s7), int(((ex + 1) * 1000 + MARGIN - wlib.ROOT_E0) // s7) + 1):
            for by in range(int((ny * 1000 - MARGIN - wlib.ROOT_N0) // s7), int(((ny + 1) * 1000 + MARGIN - wlib.ROOT_N0) // s7) + 1):
                blocks.setdefault((bx, by), {})
    coarse = Coarse(G, cbox)
    log(f'Gelände: {len(blocks)} Blöcke (Stufe {BLOCK_L}, {s7:.0f} m + {MARGIN:.0f} m Rand), grobes Mosaik {coarse.m.shape[1]} x {coarse.m.shape[0]} Zellen à {CPX:.0f} m')
    work = os.path.join(raw, 'work')
    todo = [(bx, by, lists, out, work) for (bx, by), lists in sorted(blocks.items())]
    info = {L: {'n': 0, 'bytes': 0} for L in sorted(T)}
    hmin, hmax = 1e9, -1e9
    dgm10, bstat = {}, []

    def take(res):
        nonlocal hmin, hmax
        st, core8 = res
        b = st['block']
        if tbounds(BLOCK_L, *b)[0] >= cbox[0] and tbounds(BLOCK_L, *b)[2] <= cbox[2] and tbounds(BLOCK_L, *b)[1] >= cbox[1] and tbounds(BLOCK_L, *b)[3] <= cbox[3]:
            coarse.paste(b[0], b[1], core8)
        for L, v in st['levels'].items():
            info[int(L)]['n'] += v['n']
            info[int(L)]['bytes'] += v['bytes']
        hmin, hmax = min(hmin, st['hmin']), max(hmax, st['hmax'])
        dgm10.update(st['dgm10'])
        bstat.append({k: st[k] for k in ('block', 'source', 'dgm_share', 'dgm_tiles') if k in st} | {'s': st.get('seconds'), 'resumed': st.get('resumed', False)})
        log(f"  Block {b[0]}/{b[1]}: {st['source']}, DGM1-Anteil {st['dgm_share']:.2f}, "
            + ', '.join(f"Stufe {L}: {v['n']}" for L, v in st['levels'].items()) + (' (aus dem Zwischenstand)' if st.get('resumed') else f" in {st.get('seconds')} s"))

    if jobs > 1 and len(todo) > 1:
        import multiprocessing as mp
        with mp.get_context('fork').Pool(jobs, initializer=_init_worker) as pool:
            for res in pool.imap_unordered(do_block, todo):
                take(res)
    else:
        for job in todo:
            take(do_block(job))
    for L in (9, 8, 7, 6):
        for x, y in sorted(T.get(L, ())):
            g = coarse.grid(L, x, y)
            b = wtiles.encode_heights(g)
            write_tile(out, L, x, y, b)
            info[L]['n'] += 1
            info[L]['bytes'] += len(b)
            hmin, hmax = min(hmin, float(g.min())), max(hmax, float(g.max()))
    for L in sorted(T):
        log(f"Gelände Stufe {L}: {info[L]['n']} Kacheln, {info[L]['bytes'] / 1e6:.2f} MB")
    src = 'cop30' if not G.dgm else ('dgm1+cop30')
    return {'levels': info, 'hmin': hmin, 'hmax': hmax, 'source': src, 'dgm': G.dgm_log, 'dgm_tiles_km': sorted(f'{e}_{n}' for e, n in G.dgm),
            'dgm10': dgm10, 'canopy_m': round(G.canopy, 2), 'canopy_fit_m': None if G.canopy_fit is None else round(G.canopy_fit, 2),
            'canopy_fit_window': list(FIT), 'copernicus_offset_m': round(G.off, 3), 'blocks': sorted(bstat, key=lambda b: b['block']),
            'block_level': BLOCK_L, 'margin_m': MARGIN, 'blend_m': BLEND, 'coarse_cell_m': CPX, 'seconds': round(time.time() - t0, 1),
            'worldcover': G.trees is not None}
