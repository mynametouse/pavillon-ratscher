"""Roads as their own geometry (Falko 22.10.2026: roads must be smooth and even).
OpenStreetMap gives the axis, DGM1 (1 m) the heights:
  1. Network: OSM ways by class; shared OSM nodes are the junctions; every way densified to <= 2 m.
  2. Data: per node the road surface height = median of DGM1 samples across the carriageway (robust against an axis that is off by a
     metre or two, against ditches and slopes beside the road).
  3. Longitudinal profile: one least-squares problem for all roads together (Whittaker smoother): stay near the data, penalise the
     curvature per class so that waves shorter than L are removed (motorway 320 m, main 240, county 210, street/lane 130,
     service/track 100, path/foot 60); junction nodes are shared, so the roads meet at one height; bridges and tunnels stay straight.
  4. Cross-section: carriageway with a 2.5 % crown, shoulder (Bankett) at 8 %, a short buried skirt; the terrain under the road is set
     6 cm below it, beside the road it is cut or filled with 1:1.5 slopes (clamp between the shoulder height -/+ distance / 1.5).
  5. Ribbon meshes per level-9 tile (GLB), centre lines with heights (JSON) and drive routes for the viewer.
  6. Metric per class (printed and in meta.json): waves per km, change of grade per 10 m, max grade, share of length beyond the
     RAL 2012 limits (grade, crest and sag radius; values from memory - check against the RAL before using them as a hard test).
"""
import collections, json, math, os, sys
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import spsolve
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log, H0, CONTENT_LEVEL, tiles, tcentre, tbounds
from glb import write_glb, flat_normals

# kind: default width (m), default surface, centre/edge markings, wave cut-off L (m), shoulder width (m), rank (drawing order)
KINDS = {
    'motorway': (9.0, 'asphalt', 2, 320, 1.5, 9),
    'main': (6.5, 'asphalt', 2, 240, 1.5, 8),
    'county': (6.0, 'asphalt', 1, 210, 1.5, 7),
    'street': (5.0, 'asphalt', 0, 130, 0.5, 6),
    'lane': (3.6, 'asphalt', 0, 130, 0.75, 5),
    'service': (3.0, 'asphalt', 0, 100, 0.5, 4),
    'track': (3.0, 'ground', 0, 100, 0.5, 3),
    'path': (1.4, 'ground', 0, 60, 0.25, 2),
    'foot': (1.8, 'paving', 0, 60, 0.25, 1),
}
KLIST = list(KINDS)
# RAL 2012 (Landstraßen) limits per design class, used as reference: max grade %, min crest radius m, min sag radius m.
# main ~ EKL 2, county ~ EKL 3, lane/street ~ EKL 4 (inside villages RASt applies; there it is only a reference)
RAL = {'motorway': (4.0, 13000, 8800), 'main': (5.5, 6000, 3500), 'county': (6.5, 5000, 3000), 'street': (8.0, 3000, 2000),
       'lane': (8.0, 3000, 2000)}
SURF = ['asphalt', 'concrete', 'paving', 'gravel', 'ground', 'grass']
SURF_OSM = {'asphalt': 'asphalt', 'paved': 'asphalt', 'chipseal': 'asphalt', 'concrete': 'concrete', 'concrete:plates': 'concrete',
            'concrete:lanes': 'concrete', 'paving_stones': 'paving', 'sett': 'paving', 'cobblestone': 'paving', 'unhewn_cobblestone': 'paving',
            'bricks': 'paving', 'wood': 'paving', 'metal': 'paving', 'gravel': 'gravel', 'fine_gravel': 'gravel', 'compacted': 'gravel',
            'pebblestone': 'gravel', 'unpaved': 'ground', 'ground': 'ground', 'dirt': 'ground', 'earth': 'ground', 'mud': 'ground',
            'sand': 'ground', 'grass': 'grass', 'grass_paver': 'grass'}
COL = {'asphalt': (0.30, 0.30, 0.31), 'concrete': (0.56, 0.56, 0.54), 'paving': (0.47, 0.44, 0.41), 'gravel': (0.63, 0.58, 0.49),
       'ground': (0.50, 0.42, 0.32), 'grass': (0.40, 0.47, 0.29)}
SHOULDER_COL = (0.47, 0.46, 0.37)
CROWN = 0.025        # carriageway cross fall from the centre
SH_SLOPE = 0.08      # shoulder fall
SLOPE = 1.5          # cut / fill slopes 1 : 1.5
UNDER = 0.06         # terrain this much below the road surface


def classify(t):
    hw = t.get('highway')
    if t.get('area') == 'yes':
        return None
    if hw in ('motorway', 'motorway_link'):
        k = 'motorway'
    elif hw in ('trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link'):
        k = 'main'
    elif hw in ('tertiary', 'tertiary_link'):
        k = 'county'
    elif hw in ('residential', 'living_street', 'road', 'pedestrian'):
        k = 'street'
    elif hw == 'unclassified':
        k = 'lane'
    elif hw == 'service':
        k = 'service'
    elif hw == 'track':
        k = 'track'
    elif hw in ('path', 'bridleway'):
        k = 'path'
    elif hw in ('footway', 'cycleway', 'steps'):
        k = 'foot'
    else:
        return None
    wd, sf = KINDS[k][0], KINDS[k][1]
    s = SURF_OSM.get(t.get('surface', ''))
    if s is None:
        if k == 'track':
            s = {'grade1': 'asphalt', 'grade2': 'gravel', 'grade3': 'ground', 'grade4': 'ground', 'grade5': 'grass'}.get(t.get('tracktype'), 'ground')
        elif k == 'path':
            s = 'ground'
        else:
            s = sf
    if k == 'path' and ('agricultural' in t.get('motor_vehicle', '') or s in ('asphalt', 'concrete')):
        k = 'lane' if s in ('asphalt', 'concrete') else 'track'
        wd = 3.0
    if k == 'service' and t.get('service') in ('driveway', 'parking_aisle'):
        wd = 2.8
    try:
        if 'width' in t:
            wd = float(t['width'].replace(',', '.').replace('m', '').strip())
        elif 'lanes' in t and k in ('motorway', 'main', 'county'):
            wd = max(wd, 3.25 * int(t['lanes']))
    except ValueError:
        pass
    wd = float(np.clip(wd, 1.0, 16.0))
    fl = (1 if t.get('bridge') not in (None, 'no') else 0) | (2 if t.get('tunnel') not in (None, 'no', 'building_passage') else 0)
    return k, s, wd, fl


def load_ways(osm, area, margin=150.0):
    """OSM highways touching the area (+ margin) -> list of ways with UTM node coordinates"""
    from pyproj import Transformer
    tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    ids = list(osm['nodes'].keys())
    ll = np.array([osm['nodes'][i][:2] for i in ids], float)
    E, N = tr.transform(ll[:, 0], ll[:, 1])
    nodeE = {i: (e, n) for i, e, n in zip(ids, E, N)}
    e0, n0, e1, n1 = area[0] - margin, area[1] - margin, area[2] + margin, area[3] + margin
    out = []
    for wid, (refs, tags) in osm['ways'].items():
        if 'highway' not in tags:
            continue
        c = classify(tags)
        if c is None:
            continue
        pts = [nodeE[r] for r in refs if r in nodeE]
        if len(pts) < 2:
            continue
        P = np.array(pts)
        if not ((P[:, 0] > e0) & (P[:, 0] < e1) & (P[:, 1] > n0) & (P[:, 1] < n1)).any():
            continue
        k, s, wd, fl = c
        out.append(dict(id=wid, kind=k, surf=s, w=wd, fl=fl, refs=[r for r in refs if r in nodeE], name=tags.get('name', ''),
                        ref=tags.get('ref', ''), layer=tags.get('layer', '0')))
    return out, nodeE


def network(ways, nodeE, step=2.0):
    """shared OSM nodes + densified points; chains = (way, node indices)"""
    idx_of, pos, chains = {}, [], []
    for w in ways:
        ids = []
        for r in w['refs']:
            i = idx_of.get(r)
            if i is None:
                i = len(pos)
                pos.append(nodeE[r])
                idx_of[r] = i
            if ids:
                if i == ids[-1]:
                    continue
                a, b = np.array(pos[ids[-1]]), np.array(pos[i])
                m = int(math.ceil(math.hypot(*(b - a)) / step))
                for t in range(1, m):
                    pos.append(tuple(a + (b - a) * t / m))
                    ids.append(len(pos) - 1)
            ids.append(i)
        if len(ids) >= 2:
            chains.append((w, np.array(ids)))
    return np.array(pos, float), chains


def tangents(P):
    d = np.diff(P, axis=0)
    L = np.maximum(np.hypot(d[:, 0], d[:, 1]), 1e-9)
    u = d / L[:, None]
    t = np.zeros_like(P)
    t[:-1] += u
    t[1:] += u
    t /= np.maximum(np.hypot(t[:, 0], t[:, 1]), 1e-9)[:, None]
    return t, L


def solve_profile(pos, chains, dem):
    """least squares over all roads -> heights per node; also returns the raw axis heights and the cross-section medians"""
    N = len(pos)
    rows_d, vals_d, rhs_d = [], [], []
    axis = dem.sample(pos[:, 0], pos[:, 1])
    data_t = np.full(N, np.nan)
    for w, ids in chains:
        P = pos[ids]
        t, L = tangents(P)
        nrm = np.stack([-t[:, 1], t[:, 0]], 1)
        hw = max(w['w'] / 2, 1.0)
        offs = np.linspace(-hw, hw, max(3, int(round(2 * hw / 0.5)) + 1))
        S = P[:, None, :] + offs[None, :, None] * nrm[:, None, :]
        H = dem.sample(S[..., 0].ravel(), S[..., 1].ravel()).reshape(len(P), len(offs))
        med = np.nanmedian(H, axis=1)
        mad = np.nanmedian(np.abs(H - med[:, None]), axis=1)
        ds = np.zeros(len(P))
        ds[:-1] += L / 2
        ds[1:] += L / 2
        conf = 1.0 / (1.0 + (mad / 0.35) ** 2)
        wgt = np.where(w['fl'] & 3, 1e-6, np.maximum(ds, 0.2) * conf)
        rows_d.append(ids)
        vals_d.append(wgt)
        rhs_d.append(wgt * med)
        data_t[ids] = np.where(np.isfinite(data_t[ids]), data_t[ids], med)
    I = np.concatenate(rows_d)
    Wd = np.bincount(I, weights=np.concatenate(vals_d), minlength=N)
    bd = np.bincount(I, weights=np.concatenate(rhs_d), minlength=N)
    Wd += 1e-6   # every node has some data (Copernicus outside the mosaic), keeps isolated pieces solvable
    bd += 1e-6 * np.nan_to_num(axis, nan=np.nanmean(axis))
    # curvature rows: sqrt(lam dm) * h'' with h'' from three neighbours on uneven spacing
    rr, cc, vv = [], [], []
    r0 = 0
    for w, ids in chains:
        if len(ids) < 3:
            continue
        P = pos[ids]
        d = np.maximum(np.hypot(*np.diff(P, axis=0).T), 0.05)
        d1, d2 = d[:-1], d[1:]
        dm = (d1 + d2) / 2
        lam = 1e9 if w['fl'] & 3 else (KINDS[w['kind']][3] / (2 * math.pi)) ** 4
        sw = np.sqrt(lam * dm)
        n = len(d1)
        rows = np.arange(r0, r0 + n)
        rr += [rows, rows, rows]
        cc += [ids[:-2], ids[1:-1], ids[2:]]
        vv += [sw / (d1 * dm), -sw * (1 / d1 + 1 / d2) / dm, sw / (d2 * dm)]
        r0 += n
    C = coo_matrix((np.concatenate(vv), (np.concatenate(rr), np.concatenate(cc))), shape=(r0, N)).tocsr()
    A = (C.T @ C + diags(Wd)).tocsc()
    h = spsolve(A, bd)
    return h, axis, data_t


def resample(P, z, step=2.0):
    seg = np.hypot(*np.diff(P, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    s = np.arange(0, cum[-1] + 1e-9, step)
    return s, np.interp(s, cum, z), np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1])


def profile_stats(hh, step=2.0):
    """the prototype's measures on a profile sampled every 2 m"""
    g10 = (hh[5:] - hh[:-5]) / 10 * 100
    dg = np.abs(np.diff(g10[::5]))
    sm = np.convolve(np.pad(hh, 15, mode='edge'), np.ones(31) / 31, 'valid')
    dev = hh - sm
    bumps = int(np.sum((np.abs(np.diff(np.sign(np.diff(hh)))) > 0) & (np.abs(dev[1:-1]) > 0.15)))
    # vertical curvature over a 20 m base (radius = 1 / |h''|)
    k = (hh[10:] - 2 * hh[5:-5] + hh[:-10]) / (10.0 * step) ** 2 if len(hh) > 10 else np.zeros(0)
    return g10, dg, bumps, k


def metrics(pos, chains, h, axis):
    out = {}
    for w, ids in chains:
        if w['fl'] & 3:
            continue
        P = pos[ids]
        if np.hypot(*np.diff(P, axis=0).T).sum() < 60:
            continue
        r = out.setdefault(w['kind'], dict(km=0.0, waves_before=0, waves_after=0, dg_b=[], dg_a=[], maxg_b=0.0, maxg_a=0.0,
                                           over_grade=0.0, over_crest=0.0, over_sag=0.0))
        for lab, z in (('b', axis[ids]), ('a', h[ids])):
            s, hh, _, _ = resample(P, z)
            g10, dg, bumps, k = profile_stats(hh)
            r['dg_' + lab] += list(dg)
            r['waves_before' if lab == 'b' else 'waves_after'] += bumps
            r['maxg_' + lab] = max(r['maxg_' + lab], float(np.max(np.abs(g10))) if len(g10) else 0.0)
            if lab == 'a':
                r['km'] += s[-1] / 1000
                if w['kind'] in RAL and len(k):
                    gmax, rk, rw = RAL[w['kind']]
                    r['over_grade'] += float(np.sum(np.abs(g10) > gmax)) * 2.0 / 1000
                    r['over_crest'] += float(np.sum(k < -1.0 / rk)) * 2.0 / 1000
                    r['over_sag'] += float(np.sum(k > 1.0 / rw)) * 2.0 / 1000
    res = {}
    for kind, r in sorted(out.items(), key=lambda kv: -kv[1]['km']):
        km = max(r['km'], 1e-6)
        res[kind] = dict(km=round(r['km'], 2), wellen_je_km_vorher=round(r['waves_before'] / km, 1), wellen_je_km=round(r['waves_after'] / km, 1),
                         steigungswechsel_10m_vorher=round(float(np.mean(r['dg_b'])), 2) if r['dg_b'] else None,
                         steigungswechsel_10m=round(float(np.mean(r['dg_a'])), 2) if r['dg_a'] else None,
                         max_steigung_vorher=round(r['maxg_b'], 1), max_steigung=round(r['maxg_a'], 1))
        if kind in RAL:
            res[kind].update(ral=dict(zip(('max_steigung', 'min_kuppe', 'min_wanne'), RAL[kind])),
                             anteil_ueber_steigung=round(r['over_grade'] / km, 3), anteil_kuppe_zu_eng=round(r['over_crest'] / km, 3),
                             anteil_wanne_zu_eng=round(r['over_sag'] / km, 3))
    return res


def print_metrics(res, label):
    log(f'== Straßen {label}: Wellen je km (Ausschläge > 15 cm gegen das 62-m-Mittel), Steigungswechsel je 10 m, max. Steigung')
    for k, r in res.items():
        extra = ''
        if 'ral' in r:
            extra = (f"  RAL: über {r['ral']['max_steigung']} % {100 * r['anteil_ueber_steigung']:.0f} %, Kuppe < {r['ral']['min_kuppe']} m "
                     f"{100 * r['anteil_kuppe_zu_eng']:.0f} %, Wanne < {r['ral']['min_wanne']} m {100 * r['anteil_wanne_zu_eng']:.0f} % der Länge")
        print(f"   {k:9s} {r['km']:6.1f} km  Wellen/km {r['wellen_je_km_vorher']:6.1f} -> {r['wellen_je_km']:5.1f}   "
              f"Steigungswechsel/10 m {r['steigungswechsel_10m_vorher']:5.2f} -> {r['steigungswechsel_10m']:5.2f} %   "
              f"max {r['max_steigung_vorher']:5.1f} -> {r['max_steigung']:5.1f} %{extra}", flush=True)


# ---------------- cross-section, ribbons, carving ----------------
def cross(w):
    """offsets and height drops of the cross-section (left to right): skirt, shoulder, edge, centre, edge, shoulder, skirt"""
    hw = w['w'] / 2
    sw = KINDS[w['kind']][4]
    crown = CROWN if w['surf'] in ('asphalt', 'concrete', 'paving') else 0.04
    edge = crown * hw
    sh = edge + SH_SLOPE * sw
    o = np.array([-(hw + sw + 0.6), -(hw + sw), -hw, 0.0, hw, hw + sw, hw + sw + 0.6])
    dz = -np.array([sh + 0.45, sh, edge, 0.0, edge, sh, sh + 0.45])
    return o, dz, hw, sw, crown


def decimate(P, z, tol_xy=0.03, tol_z=0.01, max_gap=20):
    """indices of the cross-sections to keep: a section may be dropped while the centre line between the kept ones stays within
    tol (straight, evenly sloped stretches need few sections)"""
    keep = [0]
    k = 0
    n = len(P)
    while k < n - 1:
        m = min(n - 1, k + 1)
        best = m
        while m <= min(n - 1, k + max_gap):
            if m > k + 1:
                t = np.linspace(0, 1, m - k + 1)[1:-1]
                Pl = P[k] + (P[m] - P[k]) * t[:, None]
                zl = z[k] + (z[m] - z[k]) * t
                if np.max(np.hypot(*(P[k + 1:m] - Pl).T)) > tol_xy or np.max(np.abs(z[k + 1:m] - zl)) > tol_z:
                    break
            best = m
            m += 1
        keep.append(best)
        k = best
    return np.array(keep)


def ribbons(pos, chains, h, area, lift=0.0):
    """ribbon meshes of all non-tunnel roads, cut into level-9 tiles by the centre of each segment -> {tile: arrays}"""
    from wlib import ROOT_E0, ROOT_N0, tsize
    s9 = tsize(CONTENT_LEVEL)
    groups = collections.defaultdict(lambda: dict(pos=[], col=[], uv=[], idx=[], n=0))
    order = sorted(range(len(chains)), key=lambda i: KINDS[chains[i][0]['kind']][5])
    nsec = nkept = 0
    for ci in order:
        w, ids = chains[ci]
        if w['fl'] & 2:
            continue
        P0 = pos[ids]
        z0 = h[ids] + lift + 0.002 * KINDS[w['kind']][5]   # higher classes a few mm above the lower ones at junctions
        t0, L0 = tangents(P0)                              # tangents from the full chain, then fewer sections
        keep = decimate(P0, z0)
        nsec += len(P0)
        nkept += len(keep)
        P, z, t = P0[keep], z0[keep], t0[keep]
        vcum = np.concatenate([[0], np.cumsum(L0)])[keep]
        nrm = np.stack([-t[:, 1], t[:, 0]], 1)
        o, dz, hw, sw, _ = cross(w)
        V = P[:, None, :] + o[None, :, None] * nrm[:, None, :]           # (n, 7, 2)
        Z = z[:, None] + dz[None, :]
        m = len(o)
        col = np.array([SHOULDER_COL, SHOULDER_COL] + [COL[w['surf']]] * 3 + [SHOULDER_COL, SHOULDER_COL], np.float32)
        mid = (P[:-1] + P[1:]) / 2
        inA = (mid[:, 0] >= area[0]) & (mid[:, 0] < area[2]) & (mid[:, 1] >= area[1]) & (mid[:, 1] < area[3])
        tx = np.floor((mid[:, 0] - ROOT_E0) / s9).astype(int)
        ty = np.floor((mid[:, 1] - ROOT_N0) / s9).astype(int)
        seg = 0
        nseg = len(P) - 1
        while seg < nseg:                     # runs of consecutive segments in the same tile share their vertex rows
            if not inA[seg]:
                seg += 1
                continue
            e = seg
            while e + 1 < nseg and inA[e + 1] and tx[e + 1] == tx[seg] and ty[e + 1] == ty[seg]:
                e += 1
            rows = np.arange(seg, e + 2)
            g = groups[(int(tx[seg]), int(ty[seg]))]
            Vr, Zr = V[rows], Z[rows]
            g['pos'].append(np.stack([Vr[..., 0].ravel(), Vr[..., 1].ravel(), Zr.ravel()], 1))
            g['col'].append(np.tile(col, (len(rows), 1)))
            g['uv'].append(np.stack([np.tile(o, len(rows)), np.repeat(vcum[rows], m)], 1))
            ii, jj = np.meshgrid(np.arange(len(rows) - 1), np.arange(m - 1), indexing='ij')
            a = g['n'] + ii * m + jj
            b = a + m
            c = b + 1
            d = a + 1
            # a back, b forward, d one step across (to the left): (a, d, c), (a, c, b) run clockwise seen from above
            g['idx'].append(np.stack([a, d, c, a, c, b], -1).ravel())
            g['n'] += len(rows) * m
            seg = e + 1
    log(f'Straßenbänder: {nkept} von {nsec} Querschnitten behalten')
    return groups


def write_ribbons(groups, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    files = {}
    for (tx, ty), g in groups.items():
        Ec, Nc = tcentre(CONTENT_LEVEL, tx, ty)
        P = np.concatenate(g['pos'])
        pos = np.stack([P[:, 0] - Ec, P[:, 2] - H0, -(P[:, 1] - Nc)], 1).astype(np.float32)
        idx = np.concatenate(g['idx']).astype(np.uint32)
        # the triangles run clockwise seen from above; (E, N, H) -> (x, y, z) = (E, H, -N) is a rotation, so they stay clockwise
        # seen from +y – glTF front faces are counter-clockwise: reverse each triangle
        idx = idx.reshape(-1, 3)[:, ::-1].ravel()
        nrm = flat_normals(pos, idx)
        fn = os.path.join(out_dir, f'{CONTENT_LEVEL}_{tx}_{ty}.glb')
        size = write_glb(fn, [dict(name='roads', pos=pos, idx=idx, nrm=nrm, col=np.concatenate(g['col']), uv=np.concatenate(g['uv']).astype(np.float32),
                                   rough=0.9)], extras={'utm_centre': [Ec, Nc], 'H0': H0, 'crs': 'EPSG:25832'})
        files[f'{tx}_{ty}'] = size
    return files


def carve(dem, pos, chains, h, area):
    """cut / fill the 1 m mosaic along the roads inside `area` (in place). Returns the number of changed pixels and stats."""
    S_xy, S_t, S_n, S_h, S_hw, S_sw, S_cr, S_max = [], [], [], [], [], [], [], []
    bridges = []
    for w, ids in chains:
        P = pos[ids]
        if w['fl'] & 3:
            if w['fl'] & 1:
                bridges.append((P, w['w'] / 2 + 3.0))
            continue
        seg = np.hypot(*np.diff(P, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        s = np.arange(0, cum[-1] + 1e-9, 0.5)
        x, y, z = np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1]), np.interp(s, cum, h[ids])
        Q = np.stack([x, y], 1)
        t, _ = tangents(Q) if len(Q) > 1 else (np.array([[1.0, 0.0]]), None)
        o, dz, hw, sw, cr = cross(w)
        S_xy.append(Q)
        S_t.append(t)
        S_h.append(z)
        S_hw.append(np.full(len(Q), hw))
        S_sw.append(np.full(len(Q), sw))
        S_cr.append(np.full(len(Q), cr))
        S_max.append(np.full(len(Q), 4.0 if w['kind'] in ('path', 'foot') else 30.0))
    if not S_xy:
        return 0, {}
    Q = np.concatenate(S_xy)
    T = np.concatenate(S_t)
    Hc = np.concatenate(S_h)
    HW = np.concatenate(S_hw)
    SW = np.concatenate(S_sw)
    CR = np.concatenate(S_cr)
    MX = np.concatenate(S_max)
    tree = cKDTree(Q)
    rmax = float((HW + SW).max() + 30.0)
    M = dem.mos
    Hh, Ww = M.shape
    c0 = max(0, int(math.floor(area[0] - dem.e0)))
    c1 = min(Ww, int(math.ceil(area[2] - dem.e0)))
    r0 = max(0, int(math.floor(dem.n1 - area[3])))
    r1 = min(Hh, int(math.ceil(dem.n1 - area[1])))
    # bridge corridors stay as they are: densified bridge axes in a KD-tree with their half widths
    btree, BHW, bmax = None, None, 0.0
    if bridges:
        bp, bw = [], []
        for P, hb in bridges:
            seg = np.hypot(*np.diff(P, axis=0).T)
            cum = np.concatenate([[0], np.cumsum(seg)])
            s_ = np.arange(0, cum[-1] + 1e-9, 0.5)
            bp.append(np.stack([np.interp(s_, cum, P[:, 0]), np.interp(s_, cum, P[:, 1])], 1))
            bw.append(np.full(len(s_), hb))
        btree, BHW = cKDTree(np.concatenate(bp)), np.concatenate(bw)
        bmax = float(BHW.max())
    changed = 0
    dz_all = []
    K = 6
    for rs in range(r0, r1, 128):
        re_ = min(r1, rs + 128)
        rows = np.arange(rs, re_)
        cols = np.arange(c0, c1)
        EE, NN = np.meshgrid(dem.e0 + cols + 0.5, dem.n1 - rows - 0.5)
        pts = np.stack([EE.ravel(), NN.ravel()], 1)
        d, j = tree.query(pts, k=K, distance_upper_bound=rmax, workers=-1)
        valid = np.isfinite(d[:, 0])
        if not valid.any():
            continue
        pv = pts[valid]
        jj = j[valid]
        dd = d[valid]
        okk = np.isfinite(dd)
        jj = np.where(okk, jj, 0)
        v = pv[:, None, :] - Q[jj]
        tt = T[jj]
        along = np.abs(v[..., 0] * tt[..., 0] + v[..., 1] * tt[..., 1])
        off = np.abs(-v[..., 0] * tt[..., 1] + v[..., 1] * tt[..., 0])
        hw, sw, cr, hc = HW[jj], SW[jj], CR[jj], Hc[jj]
        core = okk & (off <= hw + sw) & (along <= 0.55)
        surf = hc - cr * np.minimum(off, hw) - SH_SLOPE * np.clip(off - hw, 0, None) - UNDER
        surf = np.where(core, surf, -np.inf)
        best_core = surf.max(axis=1)
        T0 = M[rows[0]:rows[-1] + 1, c0:c1].ravel()[valid]
        new = T0.copy()
        has_core = np.isfinite(best_core)
        new[has_core] = best_core[has_core]
        # slopes from the nearest sample (index 0 = nearest)
        nc = ~has_core
        if nc.any():
            o0, a0 = off[nc, 0], along[nc, 0]
            s = np.sqrt(np.clip(o0 - (hw[nc, 0] + sw[nc, 0]), 0, None) ** 2 + np.clip(a0 - 0.55, 0, None) ** 2)
            He = hc[nc, 0] - cr[nc, 0] * hw[nc, 0] - SH_SLOPE * sw[nc, 0] - UNDER
            lim = s <= MX[jj[nc, 0]]
            t0 = T0[nc]
            tn = np.clip(t0, He - s / SLOPE, He + s / SLOPE)
            new[nc] = np.where(lim, tn, t0)
        if btree is not None:
            # inside a bridge corridor nothing changes (the valley under the deck)
            db, jb = btree.query(pv, k=1, distance_upper_bound=bmax, workers=-1)
            hit = np.isfinite(db)
            keep = np.zeros(len(pv), bool)
            keep[hit] = db[hit] < BHW[jb[hit]]
            new[keep] = T0[keep]
        blk = M[rows[0]:rows[-1] + 1, c0:c1].reshape(-1)
        idxv = np.flatnonzero(valid)
        dzv = new - T0
        ch = np.abs(dzv) > 0.005
        blk[idxv[ch]] = new[ch]
        M[rows[0]:rows[-1] + 1, c0:c1] = blk.reshape(len(rows), c1 - c0)
        changed += int(ch.sum())
        if ch.any():
            dz_all.append(dzv[ch])
    dz = np.concatenate(dz_all) if dz_all else np.zeros(1)
    st = dict(pixel=changed, mittel_m=round(float(np.mean(np.abs(dz))), 3), p95_m=round(float(np.percentile(np.abs(dz), 95)), 2),
              max_auftrag_m=round(float(dz.max()), 2), max_abtrag_m=round(float(-dz.min()), 2))
    return changed, st


def routes(pos, chains, h, area, n=3):
    """the longest connected runs of main/county/street roads with the same ref/name -> polylines with heights for driving"""
    cand = [(w, ids) for w, ids in chains if w['kind'] in ('main', 'county', 'street', 'lane') and not (w['fl'] & 2)]
    groups = collections.defaultdict(list)
    for w, ids in cand:
        groups[(w['ref'] or w['name'] or w['id'], w['kind'])].append(ids)
    out = []
    for (key, kind), parts in groups.items():
        parts = [list(p) for p in parts]
        # greedy join at shared end nodes
        joined = True
        while joined and len(parts) > 1:
            joined = False
            for i in range(len(parts)):
                for j in range(len(parts)):
                    if i == j:
                        continue
                    a, b = parts[i], parts[j]
                    if a[-1] == b[0]:
                        parts[i] = a + b[1:]
                    elif a[-1] == b[-1]:
                        parts[i] = a + b[::-1][1:]
                    elif a[0] == b[-1]:
                        parts[i] = b + a[1:]
                    elif a[0] == b[0]:
                        parts[i] = b[::-1] + a[1:]
                    else:
                        continue
                    parts.pop(j)
                    joined = True
                    break
                if joined:
                    break
        for p in parts:
            P = pos[p]
            inside = (P[:, 0] >= area[0]) & (P[:, 0] <= area[2]) & (P[:, 1] >= area[1]) & (P[:, 1] <= area[3])
            if inside.sum() < 50:
                continue
            # the longest inside run
            best, cur = (0, 0), None
            for k, f in enumerate(inside):
                if f and cur is None:
                    cur = k
                if (not f or k == len(inside) - 1) and cur is not None:
                    e = k if f else k - 1
                    if e - cur > best[1] - best[0]:
                        best = (cur, e)
                    cur = None
            sel = p[best[0]:best[1] + 1]
            L = float(np.hypot(*np.diff(pos[sel], axis=0).T).sum())
            out.append((L, key, kind, sel))
    out.sort(key=lambda r: -r[0])
    res = []
    for L, key, kind, sel in out[:n]:
        P = pos[sel]
        s, z, x, y = resample(P, h[sel], 2.0)
        res.append({'name': str(key), 'kind': kind, 'length_m': round(L), 'pts': np.round(np.stack([x, y, z], 1), 2).tolist()})
    return res


def build(osm, dem, area, out_dir):
    """the whole roads step for one area -> writes r/*.glb, roads.json, routes.json; carves dem.mos; returns the meta entry"""
    ways, nodeE = load_ways(osm, area)
    pos, chains = network(ways, nodeE)
    log(f'Straßen: {len(ways)} Wege, {len(pos)} Knoten, {sum(len(i) for _, i in chains)} Kettenpunkte')
    h, axis, data_t = solve_profile(pos, chains, dem)
    res = metrics(pos, chains, h, axis)
    print_metrics(res, '(vorher = Achse punktweise aus dem Gelände, nachher = geglättetes Längsprofil)')
    n, cst = carve(dem, pos, chains, h, area)
    log('Gelände an Straßen angepasst:', cst)
    groups = ribbons(pos, chains, h, area)
    files = write_ribbons(groups, os.path.join(out_dir, 'r'))
    # centre lines for the app (physics, later): per way kind, surface, width, flags, points (E, N, H) rounded to cm
    lines = []
    for w, ids in chains:
        P = pos[ids]
        lines.append({'id': w['id'], 'kind': w['kind'], 'surf': w['surf'], 'w': w['w'], 'fl': w['fl'], 'name': w['name'], 'ref': w['ref'],
                      'pts': np.round(np.stack([P[:, 0], P[:, 1], h[ids]], 1)[::2 if len(P) > 4 else 1], 2).tolist()})
    json.dump({'crs': 'EPSG:25832', 'heights': 'NHN m (road surface at the axis)', 'ways': lines}, open(os.path.join(out_dir, 'roads.json'), 'w'),
              separators=(',', ':'))
    rts = routes(pos, chains, h, area)
    json.dump({'crs': 'EPSG:25832', 'routes': rts}, open(os.path.join(out_dir, 'routes.json'), 'w'), separators=(',', ':'))
    log('Fahrstrecken:', [(r['name'], r['kind'], r['length_m']) for r in rts])
    return {'metric': res, 'terrain_change': cst, 'tiles': files, 'ways': len(ways), 'km': round(sum(r['km'] for r in res.values()), 1)}
