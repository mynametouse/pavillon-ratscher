#!/usr/bin/env python3
"""suhl-gebaeude: where a building stands on the ground - its foot `z0` and the ground along its outline `zv` - read from a terrain
and written into the building tiles WITHOUT touching anything else of a record. Run it again whenever the ground changes
(today Copernicus, later the terrain tiles of suhl-boden with DGM1 and the roads cut in): the buildings then fit the ground the app shows.

  # from terrain tiles (WTH1, tools/welt/tiles.py) laid out <L>/<x>/<y>.bin - a folder or a URL; the finest level that has the tile wins:
  python3 -I tools/suhl/gebaeude/fuss.py --tiles tools/suhl/out/gebaeude/probe/suhl/g/v0 --terrain DIR_OR_URL/t --source 'suhl-boden v0' --q 0
  # until such tiles exist: Copernicus GLO-30 straight from the open data bucket (tools/welt/fetch.py Cop30), 30 m, a SURFACE model:
  python3 -I tools/suhl/gebaeude/fuss.py --tiles … --cop RAW

Per record:  z0    the lowest ground height under the outline of the footprint (outer ring and courtyards), as model z = NHN - H0 in
                   true metres - the level all heights of the record count from (e, h, the roof rv, the wall tops of F). This is how
                   LoD2 / ETHOS define the height of a building: from its lowest ground point to its highest roof point.
             x_zv  the ground above z0 at every corner of the footprint, in the order of `f` and then the holes `fh` (metres, >= 0;
                   left out when the ground is level within 0.4 m): on a slope a house stands deeper in the ground on its uphill side.
             q.z0  1 = from a surface model or terrain derived from it (Copernicus GLO-30: preliminary), 2 = from terrain with DGM1 (1 m)
             src.z0  cop30 | dgm1
Index: `based_on` {boden: N} when the terrain tiles of suhl-boden version N were read (docs/features/suhl-daten.md section 3), the
source entry of the terrain, `x_z0` = {src, q, made, with_z0, z0_min, z0_max}.
"""
import argparse, glob, json, os, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from gblib import wlib, S

STEP = 2.0      # the outline is sampled at its corners and every 2 m between them


class Wth:
    """heights (NHN) from WTH1 terrain tiles <L>/<x>/<y>.bin in a folder or below a URL; bilinear on the 101 x 101 samples"""

    def __init__(self, base, levels, cache=None):
        self.base, self.levels, self.cache_dir, self.t = base.rstrip('/'), levels, cache, {}
        self.url = base.startswith('http://') or base.startswith('https://')
        self.used = {}

    def tile(self, L, x, y):
        k = (L, x, y)
        if k in self.t:
            return self.t[k]
        import tiles as WT      # tools/welt/tiles.py: decode_heights (read only)
        b = None
        if self.url:
            p = os.path.join(self.cache_dir or os.path.join(G.RAW, 'terrain'), str(L), str(x), f'{y}.bin')
            try:
                b, _ = G.http_cached(f'{self.base}/{L}/{x}/{y}.bin', p, pause=0.2, timeout=60, tries=2, min_bytes=24)
            except Exception:
                b = None
        else:
            p = os.path.join(self.base, str(L), str(x), f'{y}.bin')
            if os.path.exists(p):
                b = open(p, 'rb').read()
        a = None
        if b and b[:4] == b'WTH1':
            a = WT.decode_heights(b) + wlib.H0          # NHN metres, row 0 = south
        self.t[k] = a
        return a

    def __call__(self, E, N):
        E, N = np.asarray(E, float), np.asarray(N, float)
        out = np.full(E.shape, np.nan)
        for L in self.levels:
            todo = np.isnan(out)
            if not todo.any():
                break
            s = wlib.tsize(L)
            tx = np.floor((E - wlib.ROOT_E0) / s).astype(int)
            ty = np.floor((N - wlib.ROOT_N0) / s).astype(int)
            for (x, y) in set(zip(tx[todo].tolist(), ty[todo].tolist())):
                a = self.tile(L, x, y)
                if a is None:
                    continue
                m = todo & (tx == x) & (ty == y)
                n = a.shape[0] - 1
                fi = (E[m] - wlib.ROOT_E0 - x * s) / s * n
                fj = (N[m] - wlib.ROOT_N0 - y * s) / s * n
                i0 = np.clip(np.floor(fi).astype(int), 0, n - 1)
                j0 = np.clip(np.floor(fj).astype(int), 0, n - 1)
                u, v = fi - i0, fj - j0
                out[m] = (a[j0, i0] * (1 - u) * (1 - v) + a[j0, i0 + 1] * u * (1 - v) + a[j0 + 1, i0] * (1 - u) * v + a[j0 + 1, i0 + 1] * u * v)
                self.used[L] = self.used.get(L, 0) + int(m.sum())
        return out


def outline(rec, fr):
    """the corners of a record's rings in UTM: (E, N, number of corners)"""
    rings = [rec['f']] + list(rec.get('fh') or [])
    xs = np.array([v for r in rings for v in r[0::2]], dtype=float)
    ys = np.array([v for r in rings for v in r[1::2]], dtype=float)
    E, N = fr.to_utm(xs, ys)
    return rings, np.asarray(E), np.asarray(N)


def patch(doc, ground, q, src_id):
    """z0, zv, zq of every record of one tile; returns (records, records without ground)"""
    L, x, y = S.parse_key(doc['key'])
    fr = S.tile_frame(L, x, y)
    miss = 0
    for rec in doc['b']:
        rings, E, N = outline(rec, fr)
        # corners and points every STEP metres along the edges, ring by ring
        PE, PN, o = [], [], 0
        for r in rings:
            n = len(r) // 2
            e, nn = E[o:o + n], N[o:o + n]
            o += n
            for i in range(n):
                j = (i + 1) % n
                d = float(np.hypot(e[j] - e[i], nn[j] - nn[i]))
                m = max(1, int(np.ceil(d / STEP)))
                for k in range(m):
                    PE.append(e[i] + (e[j] - e[i]) * k / m)
                    PN.append(nn[i] + (nn[j] - nn[i]) * k / m)
        hz = ground(np.array(PE), np.array(PN))
        hc = ground(E, N)
        for key in ('z0', 'x_zv'):
            rec.pop(key, None)
        rec.get('q', {}).pop('z0', None)
        if 'src' in rec:
            rec['src'].pop('z0', None)
            if not rec['src']:
                del rec['src']
        if not np.isfinite(hz).any() or not np.isfinite(hc).all():
            miss += 1
            continue
        z0 = float(np.nanmin(hz))
        zv = np.maximum(0.0, hc - z0)
        # keep the record's key order: z0, zq, zv go in front of the footprint
        new = {}
        for kk, vv in rec.items():
            new[kk] = vv
            if kk == 'e':       # z0 follows the heights h, e
                new['z0'] = round(z0 - wlib.H0, 2)
                if float(zv.max()) >= 0.4:
                    new['x_zv'] = [round(float(v), 1) for v in zv]
        new.setdefault('q', {})['z0'] = q
        rec.clear()
        rec.update(new)
    # the tile's default source of z0 (a building's src lists only what differs)
    if isinstance(doc.get('src'), dict):
        doc['src']['z0'] = src_id
    return len(doc['b']), miss


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tiles', required=True, help='the version folder of the building tiles (holds 10/<x>/<y>.json and index.json)')
    ap.add_argument('--terrain', default=None, help='folder or URL with WTH1 tiles <L>/<x>/<y>.bin')
    ap.add_argument('--levels', default='12,11,10,9,8,7,6')
    ap.add_argument('--cop', default=None, help='raw folder for Copernicus GLO-30 (tools/welt/fetch.py)')
    ap.add_argument('--source', default=None)
    ap.add_argument('--q', type=int, default=None, help='quality of z0: 1 terrain from a surface model (Copernicus), 2 terrain with DGM1')
    ap.add_argument('--src-id', default=None, help='source id of the terrain in the catalogue: cop30 | dgm1')
    ap.add_argument('--boden', type=int, default=None, help='version N of the product boden the terrain tiles belong to -> based_on {boden: N}')
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(a.tiles, str(G.LEVEL), '*', '*.json')))
    if not files:
        raise SystemExit('no building tiles below ' + a.tiles)
    boxes = [wlib.tbounds(*S.parse_key(f)) for f in files]
    bb = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    S.guard(box=bb, part_of='stadt', what='suhl-gebaeude fuss')
    if a.terrain:
        ground = Wth(a.terrain, [int(v) for v in a.levels.split(',')])
        q, src = (a.q if a.q is not None else 1), (a.source or f'terrain tiles {a.terrain}')
        src_id = a.src_id or ('dgm1' if q >= 2 else 'cop30')
    elif a.cop:
        import fetch as WF      # tools/welt/fetch.py (read only)
        ground = WF.Cop30(a.cop, (bb[0] - 200, bb[1] - 200, bb[2] + 200, bb[3] + 200))
        q, src, src_id = 1, a.source or 'Copernicus DEM GLO-30 straight from the open data bucket (30 m surface model) - preliminary', 'cop30'
    else:
        raise SystemExit('give --terrain or --cop')
    n = miss = 0
    zs = []
    for f in files:
        doc = json.load(open(f, encoding='utf-8'))
        a_, m_ = patch(doc, ground, q, src_id)
        n += a_
        miss += m_
        zs += [r['z0'] for r in doc['b'] if 'z0' in r]
        G.write_json(f, doc)
    ip = os.path.join(a.tiles, 'index.json')
    if os.path.exists(ip):
        sys.path.insert(0, os.path.join(G.REPO, 'tools', 'suhl', 'lib'))
        from schema import index as IX
        idx = json.load(open(ip, encoding='utf-8'))
        idx['x_z0'] = {'src': src, 'q': q, 'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'with_z0': n - miss, 'without': miss,
                       'z0_min': round(min(zs), 1) if zs else None, 'z0_max': round(max(zs), 1) if zs else None, 'H0': wlib.H0}
        if a.boden is not None:
            idx['based_on'] = {'boden': a.boden}
        else:
            idx.pop('based_on', None)
        srcs = [s_ for s_ in idx.get('sources', []) if s_.get('id') not in ('cop30', 'dgm1')]
        srcs.append(IX.source(src_id))
        idx['sources'] = srcs
        idx['attribution'] = IX.attribution_line(srcs)
        tot = 0
        for f in files:
            L, x, y = S.parse_key(f)
            sz = os.path.getsize(f)
            tot += sz
            if f'{x}/{y}' in idx.get('counts', {}):
                idx['counts'][f'{x}/{y}'][1] = sz
        if isinstance(idx.get('n'), dict):
            idx['n']['bytes'] = tot
        G.write_json(ip, idx)
    G.log('z0 written for', n - miss, 'of', n, 'buildings; source:', src[:60], '; levels used:', getattr(ground, 'used', None),
          '; z0 (model z) from', round(min(zs), 1) if zs else None, 'to', round(max(zs), 1) if zs else None)
    if miss > 0.02 * n:
        raise SystemExit(f'{miss} of {n} buildings have no ground - the terrain does not cover the tiles')


if __name__ == '__main__':
    main()
