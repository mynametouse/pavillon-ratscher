#!/usr/bin/env python3
"""suhl-boden: quick tests without network (seconds) - the tile plan, the block terrain with and without DGM1, the image requests.
  python3 -I tools/suhl/boden/test_boden.py"""
import io, json, os, sys, tempfile, zipfile
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blib
from blib import kids, parents, tbounds, tsize, wlib
import plan as planmod
import gelaende, bild, hoehe
import tiles as wtiles
import fetch as wfetch

fails = 0


def ck(name, cond, info=''):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name, info, flush=True)
    fails += 0 if cond else 1


# ---- the plan ----
T, info = planmod.make('probe')
ck('probe: 11 level-10 tiles, the bounding box of the sample', len(T[10]) == 11 and blib.bbox_of(10, T[10]) == (618700.0, 5606800.0, 620300.0, 5608400.0))
ck('probe: children, parents, and a far ground that reaches beyond the sample tiles', T[11] == kids(T[10]) and T[12] == kids(T[11])
   and all(parents(T[L + 1]) <= T[L] for L in (9, 8, 7, 6)) and blib.bbox_of(8, T[8])[3] >= 5608400.0 + 1600 and len(T[8]) == 12 and len(T[9]) == 8, str(info['counts']))
try:
    sys.path.insert(0, os.path.join(blib.REPO, 'tools', 'suhl', 'lib'))
    import suhllib as S
    ck('probe: the same tiles as tools/suhl/lib (probe.json)', sorted(T[10]) == sorted(tuple(t)[-2:] for t in S.probe_tiles()))
    ck('centre: the same as tools/suhl/lib', tuple(S.CENTRE_UTM) == blib.CENTRE)
except ImportError:
    print('SKIP tools/suhl/lib not merged yet')
if os.path.exists(planmod.BEBAUT):
    T, info = planmod.make('stadt')
    c = info['counts']
    ck('stadt: level 10 holds every tile touching the municipality', info['level10']['stadt'] == 1013 and c['10'] >= 1013, str(c))
    ck('stadt: quads and parents', all(T[L] == kids(parents(T[L])) and parents(T[L]) <= T[L - 1] for L in (11, 12))
       and all(parents(T[L]) <= T[L - 1] for L in (7, 8, 9, 10)))
    ck('stadt: the far ground is a quadtree (a tile of level 6-8 has four children or none)', all(T[L] == kids(parents(T[L])) for L in (7, 8, 9)), str(info['far']))
    old = blib.in_rect(10, blib.BLOCK_B) | blib.in_rect(10, blib.BLOCK_V)
    ck('stadt: no level-10 tile inside the existing blocks (test block B, Kloster Vessra)', not (T[10] & old))
    ck('stadt: sizes as planned (level 12 ~ 2 600-3 000, level 11 ~ 1 300-2 200)', 2600 <= len(T[12]) <= 3000 and 1300 <= len(T[11]) <= 2200, str(c))
    ck('stadt: every route point north of block B lies in a level-10 tile', all(
        blib.tile_of(10, x, y) in T[10] for r in blib.routes().values() for x, y in r.coords
        if not (blib.BLOCK_B[0] <= x < blib.BLOCK_B[2] and blib.BLOCK_B[1] <= y < blib.BLOCK_B[3])))


def _guard_fails():
    try:
        blib.guard({10: {(1, 1)}})
    except SystemExit:
        return True
    return False


ck('guard: stops when the centre of Suhl is not in a list', _guard_fails())
ck('guard: the centre tile of level 10 is 497/542', blib.tile_of(10, *blib.CENTRE) == (497, 542))
mx, my = wlib.model_from_utm(*blib.CENTRE)
ck('model: the centre of Suhl lies ~400 m north of the outer terrain of the existing world (y = 11 864)',
   380 < my - blib.OUTER_MODEL[3] < 410 and blib.OUTER_MODEL[0] < mx < blib.OUTER_MODEL[2], f'x = {mx:.1f}, y = {my:.1f}')
from shapely.geometry import Point
ck('outer terrain as a UTM polygon: the garden inside, the centre of Suhl outside',
   blib.outer_square().contains(Point(wlib.XF['ex'], wlib.XF['ey'])) and not blib.outer_square().contains(Point(*blib.CENTRE)))


# ---- terrain in blocks: a smooth synthetic ground, two neighbouring blocks, DGM1 on a part ----
class FakeGround(gelaende.Ground):
    def __init__(self):
        self.raw, self.trees, self.canopy, self.canopy_fit = '', None, 0.0, None
        self.dgm, self.off, self.dgm_log = {}, 0.0, {}
        self.cop = lambda E, N: (400 + 60 * np.sin(np.asarray(E, float) / 700.0) + 45 * np.cos(np.asarray(N, float) / 500.0)).astype(np.float32)


def dgm_zip(path, ex, ny, fn):
    """a 1 km DGM1 tile as the state delivers it: zip with a GeoTIFF (pixel areas, tie point = upper-left corner)"""
    import tifffile
    E, N = np.meshgrid(ex * 1000 + np.arange(1000) + 0.5, (ny + 1) * 1000 - np.arange(1000) - 0.5)
    b = io.BytesIO()
    tifffile.imwrite(b, fn(E, N).astype(np.float32), extratags=[(33550, 'd', 3, (1.0, 1.0, 0.0), False),
                                                                 (33922, 'd', 6, (0.0, 0.0, 0.0, ex * 1000.0, (ny + 1) * 1000.0, 0.0), False)])
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr(f'dgm1_32_{ex}_{ny}_1_th_2020-2025.tif', b.getvalue())
    return path


with tempfile.TemporaryDirectory() as td:
    raw, out = os.path.join(td, 'raw'), os.path.join(td, 'out')
    g = FakeGround()
    g.raw = raw
    gelaende.G = g
    bx, by = gelaende.block_of(10, 497, 542)
    core = tbounds(7, bx, by)
    # tiles on both sides of the edge between block (bx, by) and its western neighbour, all three fine levels
    x10 = (bx << 3)
    lists = {10: [(x10 - 1, 541), (x10, 541), (x10 - 1, 542), (x10, 542), (x10 - 1, 543), (x10, 543)]}
    lists[11] = sorted(kids(set(lists[10])))
    lists[12] = sorted(kids(set(lists[11])))

    def run(tag):
        o = os.path.join(out, tag)
        res = {}
        for b in sorted({gelaende.block_of(L, x, y) for L, v in lists.items() for x, y in v}):
            st, core8 = gelaende.do_block((b[0], b[1], {L: [t for t in v if gelaende.block_of(L, *t) == b] for L, v in lists.items()}, {}, o, os.path.join(raw, 'work')))
            res[b] = (st, core8)
        H = {(L, x, y): np.round(wtiles.decode_heights(open(os.path.join(o, 't', str(L), str(x), f'{y}.bin'), 'rb').read()) * 100).astype(int)
             for L, v in lists.items() for x, y in v}
        worst = 0
        for (L, x, y), h in H.items():
            if (L, x + 1, y) in H:
                worst = max(worst, int(np.abs(h[:, -1] - H[(L, x + 1, y)][:, 0]).max()))
            if (L, x, y + 1) in H:
                worst = max(worst, int(np.abs(h[-1, :] - H[(L, x, y + 1)][0, :]).max()))
        return res, H, worst, o

    res, H, worst, o1 = run('cop')
    ck('blocks without DGM1: tiles of two blocks agree on every common edge', worst == 0 and len(res) == 2, f'worst {worst} cm, {len(H)} tiles')
    e0, n0 = tbounds(12, *lists[12][0])[:2]
    want = g.cop(e0 + np.arange(101.0)[None, :], n0 + np.arange(101.0)[:, None]) - wlib.H0
    ck('blocks without DGM1: level 12 is the ground itself', np.abs(H[(12,) + tuple(lists[12][0])] / 100.0 - want).max() < 0.03)
    c8 = res[(bx, by)][1]
    ck('block: 8 m means of the core', c8.shape == (400, 400) and abs(float(c8[0, 0]) - float(g.cop(core[0] + 4, core[3] - 4))) < 0.05, str(c8.shape))
    st2, _ = gelaende.do_block((bx, by, {L: [t for t in v if gelaende.block_of(L, *t) == (bx, by)] for L, v in lists.items()}, {}, o1, os.path.join(raw, 'work')))
    ck('block: a second start takes the finished block', st2.get('resumed') is True)

    # DGM1: real ground 3 m below the surface model and with small detail; tiles on both sides of the block edge and one hole
    real = lambda E, N: g.cop(E, N) - 3.0 + 0.4 * np.sin(E / 9.0) * np.cos(N / 7.0)
    kx, ky = int(core[0] // 1000), int((tbounds(10, x10, 541)[1]) // 1000)
    km = [(kx - 1, ky), (kx, ky), (kx - 1, ky + 1)]            # (kx, ky + 1) is missing: DGM1 fades out towards it
    for ex, ny in km:
        dgm_zip(wfetch.dgm1_path(raw, 'dgm', ex, ny), ex, ny, real)
    wfetch._host_down['th'] = True                             # never ask the state's host in a test
    log_ = g.collect_dgm(km + [(kx, ky + 1)])
    ck('DGM1: tiles found in the raw cache, one missing', log_['have'] == 3 and log_['from_cache'] == 3 and log_['asked'] == 4, json.dumps(log_))
    ck('DGM1: one offset Copernicus -> DGM1 for the run (30 % quantile)', 2.6 < g.off < 3.4, f'{g.off:.2f} m')
    res, H, worst, o2 = run('dgm')
    ck('blocks with DGM1: tiles of two blocks agree on every common edge', worst == 0, f'worst {worst} cm')
    st = res[(bx, by)][0]
    ck('blocks with DGM1: source and share', st['source'] == 'dgm1+cop30' and 0 < st['dgm_share'] < 1, f"{st['source']} {st['dgm_share']}")
    # deep inside the DGM1 area the tile is the real ground; far from it Copernicus minus the offset
    d = gelaende.BlockDem((core[0] - gelaende.MARGIN, core[1] - gelaende.MARGIN, core[2] + gelaende.MARGIN, core[3] + gelaende.MARGIN), g)
    pe, pn = kx * 1000 + 500.5, ky * 1000 + 480.5
    ck('DGM1: real ground where the tile is (beyond the blend)', abs(float(d.sample(np.array([pe]), np.array([pn]))[0]) - float(real(pe, pn))) < 0.02)
    qe, qn = kx * 1000 + 600.5, (ky + 1) * 1000 + 700.5
    ck('DGM1: Copernicus minus the offset where no tile is', abs(float(d.sample(np.array([qe]), np.array([qn]))[0]) - (float(g.cop(qe, qn)) - g.off)) < 0.02)
    re_, rn_ = kx * 1000 + 600.5, (ky + 1) * 1000 - 150.5      # 150 m inside the DGM1 edge: a mix of both
    v, a_, b_ = float(d.sample(np.array([re_]), np.array([rn_]))[0]), float(real(re_, rn_)), float(g.cop(re_, rn_)) - g.off
    ck('DGM1: fades into Copernicus over 300 m', min(a_, b_) - 0.01 <= v <= max(a_, b_) + 0.01)
    d10 = {k: v for b in res.values() for k, v in b[0]['dgm10'].items()}
    ck('DGM1: share per level-10 tile (full, three quarters, none)', len(d10) == 6 and d10[f'{x10}/542'] == 1.0
       and abs(d10[f'{x10 - 1}/543'] - 0.75) < 0.01 and d10[f'{x10}/543'] == 0.0, json.dumps(d10))

    # the height query (hoehe.py) reads the same tiles
    meta = {'H0': wlib.H0, 'tiling': {'levels': {str(L): {'has': [list(t) for t in v]} for L, v in lists.items()}}}
    json.dump(meta, open(os.path.join(o2, 'meta.json'), 'w'))
    hq = hoehe.Hoehe(o2)
    he, hn = pe - 200.0, pn
    z, zd = hq.nhn(he, hn), hq.nhn(he, hn, drawn=True)
    ck('height query: NHN at a point from the finest tile', z is not None and abs(z - float(real(he, hn))) < 0.05 and hq.source(he, hn)[0] == 12, f'{z}')
    ck('height query: the surface as the app draws it (every second sample)', zd is not None and abs(zd - z) < 0.3, f'{zd}')
    ck('height query: None outside the set', hq.nhn(pe + 50000, pn) is None)

    # coarse mosaic
    cb = (core[0] - 3200 - 128, core[1] - 128, core[2] + 128, core[3] + 128)
    co = gelaende.Coarse(g, cb)
    for b, (st_, c8_) in res.items():
        co.paste(b[0], b[1], c8_)
    gg = co.grid(9, x10 >> 1, 541 >> 1)
    ck('coarse: a level-9 tile from the 8 m mosaic', gg.shape == (101, 101) and np.isfinite(gg).all())

# ---- the road cut from the profiles of suhl-strassen (its sample file, when the branch is merged) ----
RF = os.path.join(blib.REPO, 'tools', 'suhl', 'out', 'strassen', 'probe', 'fahrt', 'suhl-zentrum.json')
if os.path.exists(RF):
    import roads as wroads
    with tempfile.TemporaryDirectory() as td:
        g = FakeGround()
        g.cop = lambda E, N: (440 + 0.004 * (np.asarray(E, float) - 619762) + 0.006 * (np.asarray(N, float) - 5607680)).astype(np.float32)
        g.raw = os.path.join(td, 'raw')
        gelaende.G, gelaende.ROH = g, os.path.join(td, 'roh')
        R = gelaende.load_roads([RF])
        ck('roads: profiles loaded, bridges and tunnels marked, some ways left out by flag', len(R['chains']) > 1000 and R['bridges'] > 0 and R['tunnels'] > 0
           and R['skipped_by_flag'] > 50 and not any(w['fl'] & gelaende.SKIP_BITS for w, _ in R['chains'])
           and gelaende.SKIP_BITS & 32768, f"{len(R['chains'])} ways")
        ck('roads: our own bild and lauf are not shadowed by the modules of tools/suhl/strassen', bild.__file__.startswith(blib.HERE)
           and not any(os.path.abspath(p_) == os.path.join(blib.REPO, 'tools', 'suhl', 'strassen') for p_ in sys.path))
        # the two blocks of the sample meet at E 619100: tiles on both sides, cut by the same roads
        lists = {10: [(495, 541), (496, 541), (495, 542), (496, 542)]}
        lists[11] = sorted(kids(set(lists[10])))
        lists[12] = sorted(kids(set(lists[11])))
        o = os.path.join(td, 'out')
        res = {}
        for b in sorted({gelaende.block_of(L, x, y) for L, v in lists.items() for x, y in v}):
            mine = {L: [t for t in v if gelaende.block_of(L, *t) == b] for L, v in lists.items()}
            res[b] = gelaende.do_block((b[0], b[1], mine, mine, o, os.path.join(td, 'work')))[0]
        rd = lambda base, k: np.round(wtiles.decode_heights(open(os.path.join(base, 't', str(k[0]), str(k[1]), f'{k[2]}.bin'), 'rb').read()) * 100).astype(int)
        H = {(L, x, y): rd(o, (L, x, y)) for L, v in lists.items() for x, y in v}
        H0_ = {(L, x, y): rd(gelaende.ROH, (L, x, y)) for L, v in lists.items() for x, y in v}
        worst = 0
        for (L, x, y), h in H.items():
            if (L, x + 1, y) in H:
                worst = max(worst, int(np.abs(h[:, -1] - H[(L, x + 1, y)][:, 0]).max()))
            if (L, x, y + 1) in H:
                worst = max(worst, int(np.abs(h[-1, :] - H[(L, x, y + 1)][0, :]).max()))
        ck('roads: after the cut the tiles of two blocks still agree on every common edge', worst == 0 and len(res) == 2, f'worst {worst} cm')
        ch = sum(int((np.abs(H[k] - H0_[k]) > 0).sum()) for k in H if k[0] == 12)
        ck('roads: the cut changed the ground, the tiles before the cut are kept apart', ch > 10000 and all(r['cut'] and r['cut']['pixel'] > 0 for r in res.values()), f'{ch} level-12 samples differ')
        # on the axis of a main road the ground lies UNDER (6 cm) below the profile
        hq = hoehe.Hoehe.__new__(hoehe.Hoehe)
        hq.base, hq.url, hq.H0, hq._t, hq._keep = o, False, wlib.H0, {}, 400
        hq.has = {L: set(v) for L, v in lists.items()}
        hq.levels = [12, 11, 10]
        dz = []
        for w, ids in R['chains']:
            if w['kind'] == 'main' and not (w['fl'] & 3):
                for i in ids[::10]:
                    z = hq.nhn(*R['pos'][i])
                    if z is not None:
                        dz.append(R['h'][i] - z)
        dz = np.array(dz)
        ck('roads: on the axis of the main roads the ground lies 6 cm below the profile', len(dz) > 50 and abs(float(np.median(dz)) - wroads.UNDER) < 0.03
           and float(np.percentile(np.abs(dz - wroads.UNDER), 90)) < 0.25, f'{len(dz)} points, median {np.median(dz):.3f} m')
        fit = res[sorted(res)[-1]]['cut']['fit']
        ck('roads: fit of the profiles to the ground before the cut is counted', fit and fit['n'] > 100 and len(fit['hist']) == 200)
    # the clamp: on real 1 m ground a piece of a way that lies more than CLAMP_M off its profile is not cut, and the spot is listed
    with tempfile.TemporaryDirectory() as td:
        g = FakeGround()
        g.cop = lambda E, N: (440 + 0.004 * (np.asarray(E, float) - 619762) + 0.006 * (np.asarray(N, float) - 5607680)).astype(np.float32)
        g.raw = os.path.join(td, 'raw')
        wfetch._host_down['th'] = True
        for ex, ny in ((619, 5607),):
            dgm_zip(wfetch.dgm1_path(g.raw, 'dgm', ex, ny), ex, ny, lambda E, N: g.cop(E, N) + 0.0)
        g.collect_dgm([(619, 5607)])
        gelaende.G, gelaende.ROH = g, os.path.join(td, 'roh')
        R = gelaende.load_roads([RF])
        lists = {10: [(496, 541), (497, 541), (496, 542), (497, 542)]}
        lists[11] = sorted(kids(set(lists[10])))
        lists[12] = sorted(kids(set(lists[11])))
        o = os.path.join(td, 'out')
        b = gelaende.block_of(10, 496, 541)
        st = gelaende.do_block((b[0], b[1], lists, lists, o, os.path.join(td, 'work')))[0]
        sp = st['cut']['spots']
        ck('clamp: pieces far off real ground are listed', len(sp) > 3 and all(abs(q['dz_m']) > gelaende.CLAMP_M for q in sp), f"{len(sp)} spots")
        hq = hoehe.Hoehe.__new__(hoehe.Hoehe)
        hq.base, hq.url, hq.H0, hq._t, hq._keep, hq.has, hq.levels = o, False, wlib.H0, {}, 400, {L: set(v) for L, v in lists.items()}, [12, 11, 10]
        hr = hoehe.Hoehe.__new__(hoehe.Hoehe)
        hr.base, hr.url, hr.H0, hr._t, hr._keep, hr.has, hr.levels = gelaende.ROH, False, wlib.H0, {}, 400, {L: set(v) for L, v in lists.items()}, [12, 11, 10]
        same = [abs(hq.nhn(q['E'], q['N']) - hr.nhn(q['E'], q['N'])) for q in sp if hq.nhn(q['E'], q['N']) is not None and 619000 <= q['E'] < 620000 and 5607000 <= q['N'] < 5608000]
        ck('clamp: on real ground no square metre moves by more than the limit', st['cut'].get('dgm_pixel', 0) > 1000
           and max(st['cut']['dgm_max_auftrag_m'], st['cut']['dgm_max_abtrag_m']) <= gelaende.CLAMP_M + 1e-6 and st['cut']['restored_m2'] > 0,
           f"fill {st['cut'].get('dgm_max_auftrag_m')} cut {st['cut'].get('dgm_max_abtrag_m')} restored {st['cut'].get('restored_m2')} m2")
        ck('clamp: the ground at such a spot stays as it was', len(same) > 0 and float(np.median(same)) < 0.02, f'{len(same)} spots, median change {np.median(same) if same else None}')
    gelaende.ROADS = gelaende.ROH = None
else:
    print('SKIP roads: tools/suhl/out/strassen/probe/fahrt/suhl-zentrum.json not there (merge origin/suhl/strassen)')

# ---- colour balance: where the flight days of a set's cells come from (no network: the days are committed) ----
import farbe
bal = farbe.Balance.__new__(farbe.Balance)
bal.dates = farbe.load_flugtage()
bal.guessed, bal._near = {'x'}, {}
bal.known = np.array([[int(v) for v in k.split('_')] for k, d in bal.dates.items() if d], int)
bal.known_day = [d for d in bal.dates.values() if d]
cs = bal.cells_of(T)
ck('balance: every 1 km cell under the sample has a count, the run counters stay as they were', cs['cells'] > 100
   and sum(cs['by_day'].values()) == cs['cells'] and cs['by_day'].get('2024-05-15', 0) > 0 and 0 < cs['day_from_nearest_cell'] < cs['cells']
   and bal.guessed == {'x'}, str({k: v for k, v in cs.items() if k != 'note'}))
one = bal.cells_of({12: [blib.tile_of(12, *blib.CENTRE)]})
ck('balance: the tile at the centre lies in one cell flown on 15.05.2024', one['cells'] == 1 and one['by_day'] == {'2024-05-15': 1}
   and one['day_from_nearest_cell'] == 0, str(one['by_day']))

# ---- image requests ----
ts = [(1984, 2160), (1985, 2160), (1991, 2167), (1992, 2168)]
rq = bild.requests_of(12, ts)
ck('image requests: tiles grouped by chunk, only their bounding box', len(rq) == 2 and rq[0][1:3] == (8 * 512, 8 * 512) and rq[1][1:3] == (512, 512)
   and rq[0][0] == tbounds(12, 1984, 2160)[:2] + tbounds(12, 1991, 2167)[2:], str([r[:3] for r in rq]))
ck('image requests: never more than 4096 px', all(max(r[1], r[2]) <= 4096 for L in bild.CHUNK for r in bild.requests_of(L, [(x, y) for x in range(40) for y in range(40)])))
# ---- seams at block borders ----
with tempfile.TemporaryDirectory() as td:
    rng = np.random.default_rng(7)
    N = wlib.TERR_N
    # four level-10 tiles around the corner of four blocks (8 tiles per block side) plus one inside a block
    quad = [(7, 7), (8, 7), (7, 8), (8, 8), (6, 7)]
    base = rng.integers(40000, 60000, (N * 3, N * 3)).astype(np.int64)        # one consistent surface in cm, then cut out per tile

    def cut_out(x, y):
        c0, r0 = (x - 6) * (N - 1), (y - 7) * (N - 1)
        return base[r0:r0 + N, c0:c0 + N].copy()
    for x, y in quad:
        q = cut_out(x, y)
        if (x, y) == (8, 7):
            q[30, 0] += 1                           # one centimetre off on the west edge (from another block)
        if (x, y) == (8, 8):
            q[0, 0] -= 1                            # the corner shared by four tiles
            q[0, 55] += 1                           # and the south edge
        gelaende.write_tile(td, 10, x, y, wtiles.encode_heights(q / 100.0 + wtiles.H0))
    st = gelaende.seam(td, {10: set(quad)})
    H = {t: np.round(wtiles.decode_heights(open(os.path.join(td, 't', '10', str(t[0]), f'{t[1]}.bin'), 'rb').read()) * 100).astype(np.int64) for t in quad}
    ok = (np.array_equal(H[(7, 7)][:, -1], H[(8, 7)][:, 0]) and np.array_equal(H[(7, 8)][:, -1], H[(8, 8)][:, 0])
          and np.array_equal(H[(7, 7)][-1, :], H[(7, 8)][0, :]) and np.array_equal(H[(8, 7)][-1, :], H[(8, 8)][0, :])
          and np.array_equal(H[(6, 7)][:, -1], H[(7, 7)][:, 0]))
    ck('seam: tiles of different blocks agree on every common edge and corner', ok, json.dumps(st))
    ck('seam: the west / south tile wins, untouched tiles stay as they were', np.array_equal(H[(7, 7)], cut_out(7, 7)) and np.array_equal(H[(8, 7)], cut_out(8, 7))
       and np.array_equal(H[(8, 8)], cut_out(8, 8)) and st['aligned'] == 3 and st['max_cm'] == 1 and st['tiles_written'] == 2, json.dumps(st))

print('test_boden:', 'ok' if not fails else f'{fails} FAILED')
sys.exit(1 if fails else 0)
