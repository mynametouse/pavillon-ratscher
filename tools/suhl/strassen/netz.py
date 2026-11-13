"""suhl-strassen: Suhl's roads and ways as a network with smoothed profiles – the part every run shares (sample set and whole city).

- record():  one OSM highway -> a way of the drive data (kind, surface, width, flags) with what a town needs on top: one-way, lanes,
             roundabout, level surface without kerb (pedestrian zone, living street), steps, pavements per side, private, passages.
             The classes and default widths are those of tools/welt/roads.py classify() – the region and Suhl stay one system.
- solve():   the profile of all ways in one least-squares problem (the data and curvature terms of tools/welt/roads.py solve_profile,
             as viz3/extra/fahrt/strecke.py solve_pinned and the first attempt's suhl_strecke.py solve): junction nodes are shared, so
             ways meet at one height; bridges and tunnels stay straight; nodes can be held (pins); new here: the curvature term also
             runs across the node where exactly two ways continue each other (OSM cuts a street wherever a tag changes).
- areas():   pedestrian areas, squares, parking areas, bus stations, platforms as polygons with a fitted plane.
- cut():     a way cut at the edges of the level-10 tiles (400 m), each piece with the metres along the way at its first point.
© OpenStreetMap contributors (ODbL 1.0).
"""
import collections, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sslib as S
import roads as WR      # tools/welt/roads.py (imported, never edited)
import strecke as ST    # viz3/extra/fahrt/strecke.py (imported, never edited): simplify, overpasses, KINDS, SURF

KINDS, SURF = ST.KINDS, ST.SURF
# flags of a way (field 4 of a way in the drive data). The app reads 1 and 2 (viz3/src/welt/fahrt.js); strecke.py writes 4; the first
# Suhl attempt wrote 8 and 16. From 32 on: Suhl's proposal to the roads chat (docs/features/suhl-strassen.md).
FL = {'bridge': 1, 'tunnel': 2, 'oneway': 4, 'motorway': 8, 'link': 16, 'roundabout': 32, 'level': 64, 'steps': 128,
      'no_walk_left': 256, 'no_walk_right': 512, 'private': 1024, 'passage': 2048, 'covered': 4096, 'sidewalk': 8192, 'crossing': 16384}
FL_DOC = {1: 'Brücke', 2: 'Tunnel', 4: 'Einbahnstraße in Punktrichtung', 8: 'Autobahn-Fahrbahn', 16: 'Autobahn-Rampe', 32: 'Kreisverkehr',
          64: 'niveaugleich ohne Bord (Fußgängerzone, verkehrsberuhigt)', 128: 'Treppe', 256: 'links kein Gehweg', 512: 'rechts kein Gehweg',
          1024: 'nicht öffentlich (access=private/no)', 2048: 'Hausdurchgang', 4096: 'überdacht', 8192: 'eigens kartierter Gehweg neben einer Straße',
          16384: 'Querung (Fußweg über die Fahrbahn)'}
HW_SKIP = {'construction', 'proposed', 'platform', 'rest_area', 'services', 'elevator', 'corridor', 'raceway', 'bus_stop', 'razed',
           'abandoned', 'planned', 'escape', 'via_ferrata', 'emergency_bay', 'disused'}
NONE_WALK = ('no', 'none', 'separate')


def _num(v):
    try:
        return float(str(v).replace(',', '.').replace('m', '').strip())
    except ValueError:
        return None


def record(wid, nd, t, nodes):
    """an OSM highway -> dict for tools/welt/roads.py network()/solve (id, kind, surf, w, fl, refs, name, ref, layer) plus Suhl's extras;
    None for what is no way of the street space (areas, construction sites, platforms)"""
    hw = t.get('highway')
    if not hw or hw in HW_SKIP or t.get('area') == 'yes':
        return None
    c = WR.classify(dict(t, highway='service') if hw == 'busway' else t)
    if c is None:
        return None
    kind, surf, wd, fl = c
    refs = [r for r in nd if r in nodes]
    if len(refs) < 2:
        return None
    ow = t.get('oneway')
    rev = ow == '-1'
    ring = t.get('junction') in ('roundabout', 'circular')
    oneway = ow in ('yes', '1', 'true') or rev or ring or hw == 'motorway'
    ln = _num(t.get('lanes', ''))
    lanes = int(ln) if ln and 0 < ln < 9 else 0
    if _num(t.get('width', '')) is None:      # no usable width in OSM: the rule of roads.py, refined for a town
        if hw == 'motorway':
            wd = 0.75 + (lanes or 2) * 3.75 + 2.5      # as the first attempt: edge strip, lanes, hard shoulder
        elif hw == 'motorway_link':
            wd = (lanes or 1) * 3.6 + 2.0
        elif oneway and kind in ('main', 'county', 'street', 'lane'):
            wd = max(3.5, 3.25 * lanes + 0.5) if lanes else {'main': 4.5, 'county': 4.25, 'street': 4.0, 'lane': 3.5}[kind]
        elif kind in ('street', 'lane') and lanes >= 2:
            wd = max(wd, 2.75 * lanes)
        if hw == 'living_street':
            wd = min(wd, 4.5)
        elif hw == 'steps':
            wd = 1.6
    f = fl
    if oneway:
        f |= FL['oneway']
    if hw == 'motorway':
        f |= FL['motorway']
    elif hw == 'motorway_link':
        f |= FL['link']
    if ring:
        f |= FL['roundabout']
    if hw in ('pedestrian', 'living_street'):
        f |= FL['level']
    if hw == 'steps':
        f |= FL['steps']
    sw = t.get('sidewalk') or t.get('sidewalk:both')
    nl = sw in NONE_WALK or sw == 'right' or t.get('sidewalk:left') in NONE_WALK
    nr = sw in NONE_WALK or sw == 'left' or t.get('sidewalk:right') in NONE_WALK
    if t.get('sidewalk:left') in ('yes', 'both') or sw in ('both', 'left', 'yes'):
        nl = False
    if t.get('sidewalk:right') in ('yes', 'both') or sw in ('both', 'right', 'yes'):
        nr = False
    if rev:
        refs = refs[::-1]
        nl, nr = nr, nl
    if nl:
        f |= FL['no_walk_left']
    if nr:
        f |= FL['no_walk_right']
    if t.get('access') in ('private', 'no'):
        f |= FL['private']
    if t.get('tunnel') == 'building_passage':
        f |= FL['passage']
    if t.get('covered') in ('yes', 'arcade', 'colonnade'):
        f |= FL['covered']
    if t.get('footway') == 'sidewalk':
        f |= FL['sidewalk']
    if t.get('footway') == 'crossing' or t.get('cycleway') == 'crossing' or t.get('path') == 'crossing':
        f |= FL['crossing']
    # what the drive data say: until the road map knows 'no kerb' (wish W1) a pedestrian street goes as 'foot' and a living street
    # as 'service' – the shader draws neither with kerb and pavement; the OSM class stays in 'hw'
    kout = kind
    if hw == 'pedestrian':
        kout = 'foot'
        if 'surface' not in t:
            surf = 'paving'
    elif hw == 'living_street':
        kout = 'service'
    ms = _num(t.get('maxspeed', ''))
    try:
        layer = int(t.get('layer', '0'))
    except ValueError:
        layer = 0
    return dict(id=wid, kind=kind, kout=kout, surf=surf, w=float(np.clip(wd, 1.0, 16.0)), fl=f, refs=refs, name=t.get('name', ''),
                ref=t.get('ref', ''), layer=layer, hw=hw, lanes=lanes, ms=int(ms) if ms and ms < 200 else 0,
                lit={'yes': 1, '24/7': 1, 'automatic': 1, 'no': 2}.get(t.get('lit'), 0), service=t.get('service', ''),
                bname=t.get('bridge:name', '') or t.get('tunnel:name', ''))


def select(o, box):
    """all ways of the street space with a node inside the UTM box"""
    e0, n0, e1, n1 = box
    out = []
    for wid, (nd, t) in o.ways.items():
        if 'highway' not in t:
            continue
        r = record(wid, nd, t, o.nodes)
        if r is None:
            continue
        P = np.array([o.nodes[i] for i in r['refs']])
        if ((P[:, 0] > e0) & (P[:, 0] < e1) & (P[:, 1] > n0) & (P[:, 1] < n1)).any():
            out.append(r)
    out.sort(key=lambda w: w['id'])
    return out


def lam_of(w, grob=1.0):
    """curvature weight of a way: the cut-off wavelength of its class (roads.py KINDS), stiff on bridges and in tunnels. grob > 1:
    longer waves are removed on the small classes (street and below) – for heights from the 30 m surface model, which carries
    houses and tree tops that the cut-offs made for 1 m terrain let through"""
    if w['fl'] & 3:
        return 1e9
    L = w.get('L') or WR.KINDS[w['kind']][3]
    if grob != 1.0 and WR.KINDS[w['kind']][5] <= 6:
        L *= grob
    return (L / (2 * math.pi)) ** 4


def solve(pos, chains, dem, pin=None, joints=True, flat=True, twins=True, offset=None, grob=1.0, cache=None):
    """heights per node (NHN), the raw heights at the axis, and what was added to the system: {'joints', 'flat', 'twins'} (rows).
    offset: metres added to the terrain per node before the fit (the lift of a bridge and its approaches, see lauf.py).
    cache: dict kept between two calls with the same network (the terrain samples are taken once)."""
    from scipy.sparse import coo_matrix, diags
    from scipy.sparse.linalg import spsolve
    from scipy.spatial import cKDTree
    N = len(pos)
    cache = {} if cache is None else cache
    if 'axis' not in cache:
        cache['axis'] = dem.sample(pos[:, 0], pos[:, 1])
        cache['data'] = []
        for w, ids in chains:
            P = pos[ids]
            t, L = WR.tangents(P)
            nrm = np.stack([-t[:, 1], t[:, 0]], 1)
            hw = max(w['w'] / 2, 1.0)
            offs = np.linspace(-hw, hw, max(3, int(round(2 * hw / 0.5)) + 1))
            Sx = P[:, None, :] + offs[None, :, None] * nrm[:, None, :]
            H = dem.sample(Sx[..., 0].ravel(), Sx[..., 1].ravel()).reshape(len(P), len(offs))
            med = np.nanmedian(H, axis=1)
            mad = np.nanmedian(np.abs(H - med[:, None]), axis=1)
            ds = np.zeros(len(P))
            ds[:-1] += L / 2
            ds[1:] += L / 2
            conf = 1.0 / (1.0 + (mad / 0.35) ** 2)
            cache['data'].append((np.where(w['fl'] & 3, 1e-6, np.maximum(ds, 0.2) * conf), med))
    axis0 = cache['axis']
    off = np.zeros(N) if offset is None else np.asarray(offset, float)
    axis = axis0 + off
    rows_d, vals_d, rhs_d = [], [], []
    for (w, ids), (wgt, med) in zip(chains, cache['data']):
        rows_d.append(ids)
        vals_d.append(wgt)
        rhs_d.append(wgt * (med + off[ids]))
    I = np.concatenate(rows_d)
    Wd = np.bincount(I, weights=np.concatenate(vals_d), minlength=N) + 1e-6
    bd = np.bincount(I, weights=np.concatenate(rhs_d), minlength=N) + 1e-6 * np.nan_to_num(axis, nan=np.nanmean(axis))
    for i, z in (pin or {}).items():
        Wd[i] += 1e7
        bd[i] += 1e7 * z
    # a bridge or tunnel with a loose end (a passage into a yard, a pier): its line is stiff and its data weigh almost nothing, so
    # the slope would be left to rounding (seen: 41 m down in 23 m). The loose end is held at the terrain.
    cnt = np.bincount(np.concatenate([np.unique(ids) for _, ids in chains]), minlength=N)
    for w, ids in chains:
        if w['fl'] & 3:
            for i in (int(ids[0]), int(ids[-1])):
                if cnt[i] == 1 and np.isfinite(axis[i]):
                    Wd[i] += 1.0
                    bd[i] += axis[i]
    rr, cc, vv = [], [], []
    r0 = 0

    def add_rows(cols, vals):
        """rows of the smoothness matrix: cols and vals are lists of equally long arrays (one per column of the row)"""
        nonlocal r0
        n = len(cols[0])
        if not n:
            return 0
        rows = np.arange(r0, r0 + n)
        for c, v in zip(cols, vals):
            rr.append(rows)
            cc.append(np.asarray(c))
            vv.append(np.asarray(v, float))
        r0 += n
        return n
    ends = collections.defaultdict(list)    # node -> [(chain, neighbour node, distance, lam, the chain's other end)] for the chains ending there
    occ = collections.defaultdict(list)     # node -> [(chain, index in the chain)]
    lams = []
    for ci, (w, ids) in enumerate(chains):
        lam = lam_of(w, grob)
        lams.append(lam)
        idl = ids.tolist()
        for k, i in enumerate(idl):
            occ[i].append((ci, k))
        if len(ids) >= 2:
            d0 = max(float(np.hypot(*(pos[ids[1]] - pos[ids[0]]))), 0.05)
            d1 = max(float(np.hypot(*(pos[ids[-2]] - pos[ids[-1]]))), 0.05)
            ends[idl[0]].append((ci, idl[1], d0, lam, idl[-1]))
            ends[idl[-1]].append((ci, idl[-2], d1, lam, idl[0]))
        if len(ids) < 3:
            continue
        P = pos[ids]
        d = np.maximum(np.hypot(*np.diff(P, axis=0).T), 0.05)
        d1, d2 = d[:-1], d[1:]
        dm = (d1 + d2) / 2
        sw = np.sqrt(lam * dm)
        add_rows([ids[:-2], ids[1:-1], ids[2:]], [sw / (d1 * dm), -sw * (1 / d1 + 1 / d2) / dm, sw / (d2 * dm)])
    info = {'joints': 0, 'flat': 0, 'twins': 0}
    if joints:
        ja, jb, jc, va, vb, vc = [], [], [], [], [], []
        for j, e in ends.items():
            # exactly two way ends meet and nothing else touches the node (a closed way counts once)
            if len(e) != 2 or cnt[j] != len({e[0][0], e[1][0]}):
                continue
            (c1, a, d1, l1, f1), (c2, b, d2, l2, f2) = e
            if a == b or a == j or b == j:
                continue
            # a bridge or tunnel that ends in nothing would be turned by the slope of the way before it: such a joint stays free
            if (l1 >= 1e9 and cnt[f1] < 2) or (l2 >= 1e9 and cnt[f2] < 2):
                continue
            dm = (d1 + d2) / 2
            sw = math.sqrt(min(l1, l2) * dm)
            ja.append(a)
            jb.append(j)
            jc.append(b)
            va.append(sw / (d1 * dm))
            vb.append(-sw * (1 / d1 + 1 / d2) / dm)
            vc.append(sw / (d2 * dm))
        info['joints'] = add_rows([ja, jb, jc], [va, vb, vc])
    if flat:
        # junctions as one plane: where three or more arms meet, the arms that join follow, over the half width of the through road,
        # the plane that road has there (its longitudinal grade; flat across). h_k - h_j - g t_k = 0 with g = (h_b - h_a) / |ab|.
        SQ = 40.0
        ck, cj, ca, cb, vk, vj, va, vb = [], [], [], [], [], [], [], []
        rank = lambda ci: (WR.KINDS[chains[ci][0]['kind']][5], chains[ci][0]['w'])
        stiff = lambda ci: chains[ci][0]['fl'] & (3 | FL['steps'])
        for j, oc in occ.items():
            arms = []     # (chain, index of j in it, direction)
            for ci, k in oc:
                n = len(chains[ci][1])
                if k > 0:
                    arms.append((ci, k, -1))
                if k < n - 1:
                    arms.append((ci, k, 1))
            if len(arms) < 3:
                continue
            thru = [(ci, k) for ci, k in oc if 0 < k < len(chains[ci][1]) - 1 and not stiff(ci)]
            if thru:
                ci, k = max(thru, key=lambda t: rank(t[0]))
                ids = chains[ci][1]
                a, b = int(ids[k - 1]), int(ids[k + 1])
                major = {(ci, k, -1), (ci, k, 1)}
                hwm = chains[ci][0]['w'] / 2
            else:
                cand = [m for m in arms if not stiff(m[0])]
                if len(cand) < 2:
                    continue
                A = max(cand, key=lambda m: rank(m[0]))
                na = int(chains[A[0]][1][A[1] + A[2]])
                ua = pos[na] - pos[j]
                ua = ua / (np.hypot(*ua) or 1e-9)
                best, bdot = None, -0.5
                for m in cand:
                    if m is A:
                        continue
                    nb = int(chains[m[0]][1][m[1] + m[2]])
                    ub = pos[nb] - pos[j]
                    ub = ub / (np.hypot(*ub) or 1e-9)
                    dt = float(ua @ ub)
                    if dt < bdot:
                        best, bdot = (m, nb), dt
                if best is None:
                    continue
                a, b = na, best[1]
                major = {A, best[0]}
                hwm = max(chains[A[0]][0]['w'], chains[best[0][0]][0]['w']) / 2
            D = float(np.hypot(*(pos[b] - pos[a])))
            if D < 0.2 or a == b:
                continue
            u = (pos[b] - pos[a]) / D
            reach = min(max(hwm + 1.5, 4.5), 8.0)
            for m in arms:
                if m in major or stiff(m[0]):
                    continue
                ids = chains[m[0]][1]
                k, s = m[1] + m[2], 0.0
                prev = j
                while 0 <= k < len(ids):
                    n = int(ids[k])
                    s += float(np.hypot(*(pos[n] - pos[prev])))
                    if s > reach or n == j:
                        break
                    t = float((pos[n] - pos[j]) @ u)
                    ck.append(n)
                    cj.append(j)
                    ca.append(a)
                    cb.append(b)
                    vk.append(SQ)
                    vj.append(-SQ)
                    va.append(SQ * t / D)
                    vb.append(-SQ * t / D)
                    prev = n
                    k += m[2]
        info['flat'] = add_rows([ck, cj, ca, cb], [vk, vj, va, vb])
    if twins:
        # the two carriageways of one road (one-way ways with the same name or number, running against each other within 30 m) lie
        # at one level: every few metres the nearest node of the twin is tied softly
        tw = [ci for ci, (w, ids) in enumerate(chains) if w['fl'] & FL['oneway'] and not w['fl'] & (3 | FL['roundabout'] | FL['motorway'] | FL['link'])
              and w['kind'] in ('main', 'county', 'street') and (w['ref'] or w['name'])]
        if len(tw) >= 2:
            nodes, key, tang = [], [], []
            for ci in tw:
                w, ids = chains[ci]
                t, _ = WR.tangents(pos[ids])
                for k in range(0, len(ids), 3):
                    nodes.append(int(ids[k]))
                    key.append(ci)
                    tang.append(t[k])
            nodes, key, tang = np.array(nodes), np.array(key), np.array(tang)
            kd = cKDTree(pos[nodes])
            ti, tk = [], []
            for q, nb in enumerate(kd.query_ball_point(pos[nodes], 30.0)):
                w = chains[key[q]][0]
                best, bd_ = -1, 1e9
                for r in nb:
                    if key[r] == key[q] or float(tang[q] @ tang[r]) > -0.7:
                        continue
                    w2 = chains[key[r]][0]
                    if (w['ref'] or w['name']) != (w2['ref'] or w2['name']):
                        continue
                    # beside each other, not one behind the other
                    dv = pos[nodes[r]] - pos[nodes[q]]
                    if abs(float(dv @ tang[q])) > 6.0:
                        continue
                    d = float(np.hypot(*dv))
                    if d < bd_:
                        best, bd_ = r, d
                if best >= 0 and nodes[best] != nodes[q]:
                    ti.append(nodes[q])
                    tk.append(nodes[best])
            info['twins'] = add_rows([ti, tk], [np.full(len(ti), 2.0), np.full(len(ti), -2.0)])
    C = coo_matrix((np.concatenate(vv), (np.concatenate(rr), np.concatenate(cc))), shape=(r0, N)).tocsr()
    h = spsolve((C.T @ C + diags(Wd)).tocsc(), bd)
    return h, axis, info


def junction_stats(pos, chains, h, reach=3.0):
    """how flat the junctions are: at every node where three or more arms meet, the heights of the arms `reach` metres from the node
    against the plane fitted through them and the node -> per group (all; 'fahr': at least three arms are roads for cars; 'fuss': the
    rest) the number of junctions, median, p95 and max of the largest deviation, the share within 3 cm. Arms on bridges, in tunnels
    and on steps are left out."""
    CAR = ('motorway', 'main', 'county', 'street', 'lane', 'service')
    arms = collections.defaultdict(list)
    for w, ids in chains:
        if w['fl'] & 3 or w['fl'] & FL['steps']:
            continue
        P = pos[ids]
        d = np.hypot(*np.diff(P, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(d)])
        car = w['kind'] in CAR
        hh = h[ids]
        for k, i in enumerate(ids.tolist()):
            arms[i].append((k, cum, P, hh, car))
    dev = {'alle': [], 'fahr': [], 'fuss': []}
    for i, lst in arms.items():
        if len(lst) < 2:
            continue
        pts, ncar = [], 0
        for k, cum, P, hh, car in lst:
            for sgn in (-1, 1):
                s = cum[k] + sgn * reach
                if s < 0 or s > cum[-1]:
                    continue
                pts.append((np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1]), np.interp(s, cum, hh)))
                ncar += car
        if len(pts) < 3:
            continue
        Q = np.array(pts + [(pos[i][0], pos[i][1], h[i])])
        A = np.c_[Q[:, 0] - pos[i][0], Q[:, 1] - pos[i][1], np.ones(len(Q))]
        coef, *_ = np.linalg.lstsq(A, Q[:, 2], rcond=None)
        dv = float(np.abs(A @ coef - Q[:, 2]).max())
        dev['alle'].append(dv)
        dev['fahr' if ncar >= 3 else 'fuss'].append(dv)
    out = {'reach_m': reach}
    for k, v in dev.items():
        if not v:
            out[k] = {'n': 0}
            continue
        d = np.array(v)
        out[k] = {'n': int(len(d)), 'median_cm': round(float(np.median(d)) * 100, 1), 'p95_cm': round(float(np.percentile(d, 95)) * 100, 1),
                  'max_cm': round(float(d.max()) * 100, 1), 'share_within_3cm': round(float((d <= 0.03).mean()), 3)}
    return out


def clearance(pos, chains, h, clear=4.5):
    """bridges that cross another way of the network with less than `clear` metres between them – on a 30 m surface model a bridge and
    the road below get nearly the same height; strecke.overpasses() lifts a bridge by up to 3.5 m and leaves larger gaps alone"""
    from scipy.spatial import cKDTree
    segs = [(ci, a, b) for ci, (w, ids) in enumerate(chains) if not w['fl'] & 1 for a, b in zip(ids[:-1], ids[1:])]
    if not segs:
        return {'bridges': 0, 'crossings': 0, 'low': 0}
    kd = cKDTree(np.array([(pos[a] + pos[b]) / 2 for _, a, b in segs]))
    nb = ncross = nlow = 0
    worst = []
    for w, ids in chains:
        if not w['fl'] & 1:
            continue
        nb += 1
        idset = set(ids.tolist())
        for a, b in zip(ids[:-1], ids[1:]):
            P, Q = pos[a], pos[b]
            for k in kd.query_ball_point((P + Q) / 2, float(np.hypot(*(Q - P))) / 2 + 3):
                cj, c, d = segs[k]
                if c in idset or d in idset:
                    continue
                A, B = pos[c], pos[d]
                r, sv = Q - P, B - A
                den = r[0] * sv[1] - r[1] * sv[0]
                if abs(den) < 1e-9:
                    continue
                t = ((A[0] - P[0]) * sv[1] - (A[1] - P[1]) * sv[0]) / den
                u = ((A[0] - P[0]) * r[1] - (A[1] - P[1]) * r[0]) / den
                if not (0 <= t <= 1 and 0 <= u <= 1):
                    continue
                ncross += 1
                gap = float(h[a] + t * (h[b] - h[a]) - (h[c] + u * (h[d] - h[c])))
                if gap < clear:
                    nlow += 1
                    worst.append((round(gap, 1), w['id'], w['name'] or w['ref'] or w['hw'], chains[cj][0]['id']))
    worst.sort()
    return {'bridges': nb, 'crossings': ncross, 'low': nlow, 'clear_m': clear,
            'lowest': [{'gap_m': g, 'bridge_way': a, 'name': n, 'below_way': b} for g, a, n, b in worst[:12]]}


# ---------------- areas ----------------
ATYPES = ['platz', 'parken', 'bus', 'steig']


def area_type(t):
    if t.get('building') or t.get('indoor'):
        return None
    if (t.get('highway') in ('pedestrian', 'footway', 'living_street', 'service', 'residential', 'path', 'unclassified') and t.get('area') == 'yes') \
            or t.get('place') == 'square':
        return 'platz'
    if t.get('amenity') == 'parking' and t.get('parking', 'surface') in ('surface', 'street_side', 'lane', 'yes', 'rooftop') and t.get('parking') != 'rooftop':
        return 'parken'
    if t.get('amenity') == 'bus_station':
        return 'bus'
    if t.get('public_transport') == 'platform' or t.get('highway') == 'platform' or t.get('railway') == 'platform':
        return 'steig'
    return None


def areas(o, box, pos, h, dem):
    """[(type, surf, fl, name, id, polygon UTM, plane (cE, cN, z0, gE, gN), q)] for the areas touching the box. The plane: least
    squares through the solved network nodes on the area (q 1), else through the terrain at its outline (q 0)."""
    from shapely.geometry import box as sbox, Point
    from shapely.prepared import prep
    from scipy.spatial import cKDTree
    B = sbox(*box)
    kd = cKDTree(pos) if len(pos) else None
    out = []
    for kind, i, t, p in o.areas(lambda t: area_type(t) is not None):
        if not p.intersects(B) or p.area < 12:
            continue
        ty = area_type(t)
        surf = WR.SURF_OSM.get(t.get('surface', '')) or {'platz': 'paving', 'parken': 'asphalt', 'bus': 'asphalt', 'steig': 'paving'}[ty]
        fl = FL['level'] if ty == 'platz' else 0
        if t.get('access') in ('private', 'no'):
            fl |= FL['private']
        polys = list(p.geoms) if hasattr(p, 'geoms') else [p]
        for pi, pg in enumerate(polys):
            if pg.area < 12 or not pg.intersects(B):
                continue
            pg = pg.simplify(0.15)
            c = pg.centroid
            q, plane = 0, None
            if kd is not None:
                e0, n0, e1, n1 = pg.bounds
                cand = kd.query_ball_point(((e0 + e1) / 2, (n0 + n1) / 2), math.hypot(e1 - e0, n1 - n0) / 2 + 3)
                pp = prep(pg.buffer(2.0))
                ins = [k for k in cand if pp.contains(Point(pos[k]))]
                if len(ins) >= 6:
                    Q = pos[ins]
                    A = np.c_[Q[:, 0] - c.x, Q[:, 1] - c.y, np.ones(len(Q))]
                    if np.linalg.matrix_rank(A[:, :2] - A[:, :2].mean(0)) == 2:
                        coef, *_ = np.linalg.lstsq(A, h[ins], rcond=None)
                        if math.hypot(coef[0], coef[1]) < 0.25:
                            plane, q = (c.x, c.y, float(coef[2]), float(coef[0]), float(coef[1])), 1
            if plane is None:
                ring = np.array(pg.exterior.coords)
                d = np.hypot(*np.diff(ring, axis=0).T)
                s = np.arange(0, d.sum(), 5.0)
                cum = np.concatenate([[0], np.cumsum(d)])
                Q = np.c_[np.interp(s, cum, ring[:, 0]), np.interp(s, cum, ring[:, 1])]
                Q = np.vstack([Q, [[c.x, c.y]]])
                z = dem.sample(Q[:, 0], Q[:, 1])
                A = np.c_[Q[:, 0] - c.x, Q[:, 1] - c.y, np.ones(len(Q))]
                ok = np.isfinite(z)
                if ok.sum() >= 3 and np.linalg.matrix_rank(A[ok, :2] - A[ok, :2].mean(0)) == 2:
                    coef, *_ = np.linalg.lstsq(A[ok], z[ok], rcond=None)
                    plane = (c.x, c.y, float(coef[2]), float(coef[0]), float(coef[1]))
                else:
                    plane = (c.x, c.y, float(np.nanmean(z)), 0.0, 0.0)
            out.append(dict(type=ty, surf=surf, fl=fl, name=t.get('name', ''), id=f'{kind}{i}' + (f'.{pi}' if len(polys) > 1 else ''),
                            poly=pg, plane=plane, q=q, capacity=t.get('capacity', '')))
    out.sort(key=lambda a: a['id'])
    return out


def plane_z(plane, E, N):
    cE, cN, z0, gE, gN = plane
    return z0 + gE * (np.asarray(E) - cE) + gN * (np.asarray(N) - cN)


# ---------------- cutting ways at the tile edges ----------------
def cut(U, M, L=S.LEVEL):
    """a way (U: UTM (n, 2), M: model x, y, z (n, 3)) cut at the edges of the level-L tiles -> [((tx, ty), points (k, 3), s0)] in the
    order along the way; s0 = model metres along the way at the piece's first point. The cut points lie on the edge (both pieces
    hold the same point)."""
    s = S.ROOT / (1 << L)
    seg = np.hypot(*np.diff(M[:, :2], axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    pieces, cur, cur_t, cur_s0 = [], [], None, 0.0
    for i in range(len(U) - 1):
        a, b = U[i], U[i + 1]
        ts = [0.0, 1.0]
        for ax, o0 in ((0, S.ROOT_E0), (1, S.ROOT_N0)):
            lo, hi = min(a[ax], b[ax]), max(a[ax], b[ax])
            if hi - lo < 1e-9:
                continue
            k0, k1 = math.floor((lo - o0) / s) + 1, math.ceil((hi - o0) / s) - 1
            for k in range(k0, k1 + 1):
                t = (o0 + k * s - a[ax]) / (b[ax] - a[ax])
                if 1e-9 < t < 1 - 1e-9:
                    ts.append(t)
        ts = sorted(set(ts))
        for t0, t1 in zip(ts[:-1], ts[1:]):
            tm = (t0 + t1) / 2
            mid = a + (b - a) * tm
            key = (int(math.floor((mid[0] - S.ROOT_E0) / s)), int(math.floor((mid[1] - S.ROOT_N0) / s)))
            p0 = M[i] + (M[i + 1] - M[i]) * t0
            p1 = M[i] + (M[i + 1] - M[i]) * t1
            if key != cur_t:
                if cur:
                    pieces.append((cur_t, np.array(cur), cur_s0))
                cur, cur_t, cur_s0 = [p0], key, float(cum[i] + seg[i] * t0)
            cur.append(p1)
    if cur:
        pieces.append((cur_t, np.array(cur), cur_s0))
    return pieces
