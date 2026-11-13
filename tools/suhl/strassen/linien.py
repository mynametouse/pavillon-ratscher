"""suhl-strassen: water as its own layer – the streams and rivers (Lauter, Hasel and their side streams), their culverted parts, ponds.

A stream has no smoothed road profile: it runs downhill. Per waterway: the terrain along its line, smoothed over 40 m, lowered by the
depth of its bed, kept at least a metre below every road it crosses, then made to fall monotonically in the direction of flow (OSM draws
waterways downstream) – across the joints between ways and at the mouths of side streams. Ponds lie level at the low end of their bank.
On the 30 m surface model this is a plausible bed, not a surveyed one; with 1 m terrain the same step gives the real one.
© OpenStreetMap contributors (ODbL 1.0).
"""
import collections, math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sslib as S

WTYPES = ['river', 'stream', 'canal', 'ditch', 'drain']
WIDTH = {'river': 5.0, 'stream': 1.6, 'canal': 4.0, 'ditch': 0.8, 'drain': 0.8}
DEPTH = {'river': 0.9, 'stream': 0.5, 'canal': 0.9, 'ditch': 0.35, 'drain': 0.35}


def water_lines(o, box, dem, pos, h, hw_of=None, step=5.0):
    """-> [dict(id, type, fl, w, name, U (n, 2) UTM, z (n) NHN)]; fl: 2 = culverted or covered (tunnel=culvert/yes/flooded, covered=yes)"""
    from scipy.spatial import cKDTree
    e0, n0, e1, n1 = box
    W = []
    for wid, (nd, t) in o.ways.items():
        ww = t.get('waterway')
        if ww not in WTYPES or t.get('intermittent') == 'yes' and ww in ('ditch', 'drain'):
            continue
        refs = [r for r in nd if r in o.nodes]
        if len(refs) < 2:
            continue
        P = np.array([o.nodes[r] for r in refs])
        if not ((P[:, 0] > e0) & (P[:, 0] < e1) & (P[:, 1] > n0) & (P[:, 1] < n1)).any():
            continue
        seg = np.hypot(*np.diff(P, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        if cum[-1] < 1.0:
            continue
        s = np.unique(np.concatenate([cum, np.arange(0, cum[-1], step)]))
        U = np.stack([np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1])], 1)
        z = dem.sample(U[:, 0], U[:, 1])
        if not np.isfinite(z).any():
            continue
        z = np.where(np.isfinite(z), z, np.nanmean(z))
        k = max(1, int(round(20.0 / step)))
        zs = np.convolve(np.pad(z, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), 'valid') - DEPTH[ww]
        wd = S_num(t.get('width')) or WIDTH[ww]
        fl = 2 if (t.get('tunnel') in ('culvert', 'yes', 'flooded') or t.get('covered') == 'yes') else 0
        W.append(dict(id=wid, type=ww, fl=fl, w=float(np.clip(wd, 0.4, 40.0)), name=t.get('name', ''), refs=refs, U=U, z=zs, s=s, cum=cum))
    if not W:
        return W
    # at least a metre under the roads and tracks it crosses (their solved heights)
    if len(pos):
        kd = cKDTree(pos)
        for w in W:
            d, j = kd.query(w['U'], distance_upper_bound=4.0)
            ok = np.isfinite(d)
            w['z'][ok] = np.minimum(w['z'][ok], h[j[ok]] - 1.0)
    # downhill: ways in the order of flow; the first point of a way is not above the end of the way that runs into it, a way is not
    # above the mouth of a side stream at the node where it joins
    start = collections.defaultdict(list)
    for i, w in enumerate(W):
        start[w['refs'][0]].append(i)
    node_way = collections.defaultdict(list)       # OSM node -> [(way, position s)] for all nodes of a way
    for i, w in enumerate(W):
        for r, sv in zip(w['refs'], w['cum']):
            node_way[r].append((i, float(sv)))
    indeg = [0] * len(W)
    succ = collections.defaultdict(set)
    for i, w in enumerate(W):
        for k, sv in node_way.get(w['refs'][-1], ()):
            if k != i and sv < W[k]['cum'][-1] - 1e-6:
                succ[i].add(k)
    for i, ks in succ.items():
        for k in ks:
            indeg[k] += 1
    cap = collections.defaultdict(list)            # way -> [(s, z)]: not above z from s on
    order = [i for i in range(len(W)) if indeg[i] == 0]
    seen = 0
    while order or seen < len(W):
        if not order:                                # a ring (two arms that meet again): take any way left
            order = [next(i for i in range(len(W)) if indeg[i] > 0)]
            indeg[order[0]] = 0
        i = order.pop()
        seen += 1
        w = W[i]
        z = w['z']
        for sv, zc in cap[i]:
            k = int(np.searchsorted(w['s'], sv - 1e-6))
            if k < len(z):
                z[k] = min(z[k], zc)
        np.minimum.accumulate(z, out=z)
        for k in succ.get(i, ()):
            sv = next(s_ for kk, s_ in node_way[w['refs'][-1]] if kk == k)
            cap[k].append((sv, float(z[-1])))
            indeg[k] -= 1
            if indeg[k] == 0:
                order.append(k)
        indeg[i] = -1
    for w in W:
        del w['s'], w['cum']
    return W


def S_num(v):
    try:
        return float(str(v).replace(',', '.').replace('m', '').strip())
    except (ValueError, TypeError):
        return None


def water_areas(o, box, dem):
    """ponds, lakes, basins, wide river beds -> [dict(id, name, kind, poly (UTM), z NHN)]"""
    from shapely.geometry import box as sbox
    B = sbox(*box)
    pred = lambda t: t.get('natural') == 'water' or t.get('landuse') in ('basin', 'reservoir') or t.get('waterway') in ('riverbank', 'dock') \
        or t.get('amenity') == 'fountain' and t.get('area') != 'no'
    out = []
    for kind, i, t, p in o.areas(pred):
        if not p.intersects(B) or p.area < 6:
            continue
        for pi, pg in enumerate(p.geoms if hasattr(p, 'geoms') else [p]):
            if pg.area < 6 or not pg.intersects(B):
                continue
            pg = pg.simplify(0.2)
            ring = np.array(pg.exterior.coords)
            d = np.hypot(*np.diff(ring, axis=0).T)
            cum = np.concatenate([[0], np.cumsum(d)])
            s = np.arange(0, cum[-1], 4.0)
            z = dem.sample(np.interp(s, cum, ring[:, 0]), np.interp(s, cum, ring[:, 1]))
            z = z[np.isfinite(z)]
            if not len(z):
                continue
            out.append(dict(id=f'{kind}{i}' + (f'.{pi}' if hasattr(p, 'geoms') else ''), name=t.get('name', ''),
                            kind=t.get('water') or t.get('amenity') or t.get('landuse') or 'water', poly=pg, z=float(np.percentile(z, 10)) - 0.3))
    out.sort(key=lambda a: a['id'])
    return out
