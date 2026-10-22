"""Single trees for the forests, until the surface model (DOM1) and the colour-infrared orthophoto give the real tree tops:
candidates on a jittered grid inside the WorldCover 2021 tree cover, away from roads and buildings, on the (carved) terrain; height and
crown from a distribution, ~60 % conifers (Thuringian forest).
Per level-9 tile v/9_{x}_{y}.bin: int16 little endian, 6 values per tree relative to the tile centre (Ec, Nc) –
  x = (E - Ec) dm, z = -(N - Nc) dm, y = ground height - H0 in dm, tree height dm, crown radius dm, type (0 conifer, 1 broadleaf)."""
import math, os, sys, zlib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log, H0, CONTENT_LEVEL, tiles, tbounds, tcentre


def build(dem, road_lines, bld_polys, area, out_dir, spacing=8.0):
    """road_lines: [(points (k, 2) UTM, half width)], bld_polys: [(E, N, radius)]"""
    tm = getattr(dem.cop, 'trees', None)
    if tm is None:
        log('Bäume: keine Landbedeckung – übersprungen')
        return {}
    from scipy.spatial import cKDTree
    # roads: points every 2 m with their half width + 2.5 m clearance
    rp, rw = [], []
    for P, hw in road_lines:
        P = np.asarray(P, float)
        if len(P) < 2:
            continue
        seg = np.hypot(*np.diff(P, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        s = np.arange(0, cum[-1] + 1e-9, 2.0)
        rp.append(np.stack([np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1])], 1))
        rw.append(np.full(len(s), hw + 2.5))
    rtree = cKDTree(np.concatenate(rp)) if rp else None
    RW = np.concatenate(rw) if rw else None
    # buildings: centres with a radius (enclosing circle approximation)
    btree = cKDTree(np.array([b[:2] for b in bld_polys])) if bld_polys else None
    BR = np.array([b[2] for b in bld_polys]) if bld_polys else None
    os.makedirs(os.path.join(out_dir, 'v'), exist_ok=True)
    files, total = {}, 0
    for tx, ty in tiles(CONTENT_LEVEL, area):
        e0, n0, e1, n1 = tbounds(CONTENT_LEVEL, tx, ty)
        rng = np.random.default_rng(zlib.crc32(f'{tx}_{ty}'.encode()))
        xs = np.arange(e0 + spacing / 2, e1, spacing)
        ys = np.arange(n0 + spacing / 2, n1, spacing)
        E, N = np.meshgrid(xs, ys)
        E = (E + rng.uniform(-0.45, 0.45, E.shape) * spacing).ravel()
        N = (N + rng.uniform(-0.45, 0.45, N.shape) * spacing).ravel()
        c = np.floor((E - tm.e0) / tm.res).astype(int)
        r = np.floor((tm.n1 - N) / tm.res).astype(int)
        ok = (c >= 0) & (r >= 0) & (c < tm.m.shape[1]) & (r < tm.m.shape[0])
        keep = np.zeros(len(E), bool)
        keep[ok] = tm.m[r[ok], c[ok]] > 0.5
        if rtree is not None and keep.any():
            d, j = rtree.query(np.stack([E[keep], N[keep]], 1), distance_upper_bound=12.0)
            hit = np.isfinite(d)
            bad = np.zeros(len(d), bool)
            bad[hit] = d[hit] < RW[j[hit]]
            idx = np.flatnonzero(keep)
            keep[idx[bad]] = False
        if btree is not None and keep.any():
            d, j = btree.query(np.stack([E[keep], N[keep]], 1), distance_upper_bound=40.0)
            hit = np.isfinite(d)
            bad = np.zeros(len(d), bool)
            bad[hit] = d[hit] < BR[j[hit]] + 3.0
            idx = np.flatnonzero(keep)
            keep[idx[bad]] = False
        n = int(keep.sum())
        if not n:
            continue
        E, N = E[keep], N[keep]
        G = dem.sample(E, N)
        con = rng.random(n) < 0.6
        hgt = np.clip(rng.normal(np.where(con, 24.0, 20.0), 4.0), 10.0, 34.0)
        rad = np.where(con, 0.17, 0.27) * hgt * rng.uniform(0.85, 1.15, n)
        Ec, Nc = tcentre(CONTENT_LEVEL, tx, ty)
        arr = np.stack([np.round((E - Ec) * 10), np.round(-(N - Nc) * 10), np.round((G - H0) * 10), np.round(hgt * 10),
                        np.round(rad * 10), (~con).astype(float)], 1).astype('<i2')
        p = os.path.join(out_dir, 'v', f'{CONTENT_LEVEL}_{tx}_{ty}.bin')
        open(p, 'wb').write(arr.tobytes())
        files[f'{tx}_{ty}'] = n
        total += n
    log(f'Bäume: {total} in {len(files)} Kacheln (Raster {spacing:.0f} m in der Baumbedeckung)')
    return files
