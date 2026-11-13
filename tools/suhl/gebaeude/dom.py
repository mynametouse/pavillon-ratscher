#!/usr/bin/env python3
"""suhl-gebaeude: the roof MEASURED on the state's surface model. DOM1 (laser surface, 1 m) and DGM1 (terrain, 1 m) of Thuringia
((c) GDI-Th, CC BY 4.0), fetched through easygeodata.de by tools/suhl/lib/easygeodata.py (GitHub Actions only) into the raw folder:
<raw>/dom1/dom1_32_<E>_<N>.zip and the terrain as <raw>/dgm1/... or, in its place, the object heights <raw>/ndom1/... (DOM1 - DGM1).

Per building: the surface cells inside the footprint (0.7 m in from its edge), as heights above the building's foot (the lowest
terrain height along its outline, the level ETHOS / LoD2 count the height from). To these cells the roof models are fitted - flat,
mono-pitch, gable and hip, the ridge along the longer or the shorter side of the footprint's rectangle, the ridge off centre if need
be - and the model with the smallest robust error wins. This gives, measured instead of guessed: flat or pitched, the way the ridge
runs, the pitch, the heights of eave and ridge. It replaces the rule of dach.py where the fit is good; LoD2 will replace both.
In the record: rq 1 (derived from data) with src.r = 'dom1'; the eave q.e 1.

  python3 -I tools/suhl/gebaeude/dom.py --selftest      # fits roofs it made itself (no data needed)
"""
import math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G

MIN_CELLS = 12
PITCHES = np.arange(8.0, 62.1, 2.0)
TANS = np.tan(np.radians(PITCHES))
MONO = np.tan(np.radians(np.arange(3.0, 40.1, 1.5)))


class Dom:
    """the 1 m surface and terrain tiles of the raw folder, a few in memory at a time"""

    def __init__(self, raw, keep=28):
        self.raw, self.keep, self.t, self.order, self.missing = raw, keep, {}, [], set()
        sys.path.insert(1, os.path.join(G.REPO, 'tools', 'suhl', 'lib'))
        import easygeodata as EG
        self.EG = EG

    def tile(self, product, e_km, n_km):
        k = (product, e_km, n_km)
        if k in self.t:
            return self.t[k]
        if k in self.missing:
            return None
        p = self.EG.raw_path(self.raw, product, e_km, n_km)
        if not os.path.exists(p):
            self.missing.add(k)
            return None
        try:
            a, e0, n1, px = self.EG.read_tile(p)
        except Exception as ex:
            G.log('unreadable tile', p, repr(ex)[:160])
            self.missing.add(k)
            return None
        self.t[k] = (a, e0, n1, px)
        self.order.append(k)
        while len(self.order) > self.keep:
            self.t.pop(self.order.pop(0), None)
        return self.t[k]

    def has(self, product, box):
        """are all tiles of a product there that a UTM box touches?"""
        for e in range(int(math.floor(box[0] / 1000)), int(math.floor(box[2] / 1000)) + 1):
            for n in range(int(math.floor(box[1] / 1000)), int(math.floor(box[3] / 1000)) + 1):
                if self.tile(product, e, n) is None:
                    return False
        return True

    def at(self, product, E, N):
        """heights at points (the cell a point lies in); NaN where a tile is missing"""
        E, N = np.asarray(E, float), np.asarray(N, float)
        out = np.full(E.shape, np.nan)
        ek, nk = np.floor(E / 1000).astype(int), np.floor(N / 1000).astype(int)
        for e, n in set(zip(ek.tolist(), nk.tolist())):
            t = self.tile(product, e, n)
            if t is None:
                continue
            a, e0, n1, px = t
            m = (ek == e) & (nk == n)
            c = np.clip(((E[m] - e0) / px).astype(int), 0, a.shape[1] - 1)
            r = np.clip(((n1 - N[m]) / px).astype(int), 0, a.shape[0] - 1)
            out[m] = a[r, c]
        return out

    def cells(self, poly, inset=0.7):
        """the surface cells whose centres lie inside the polygon, `inset` metres in from its edge: (E, N, height NHN) or None"""
        import shapely
        inner = poly.buffer(-inset)
        if inner.is_empty:
            return None
        x0, y0, x1, y1 = inner.bounds
        xs = np.arange(math.floor(x0) + 0.5, x1, 1.0)
        ys = np.arange(math.floor(y0) + 0.5, y1, 1.0)
        if len(xs) < 2 or len(ys) < 2:
            return None
        XX, YY = np.meshgrid(xs, ys)
        m = shapely.contains_xy(inner, XX, YY)
        if m.sum() < MIN_CELLS:
            return None
        X, Y = XX[m], YY[m]
        Z = self.at('dom', X, Y)
        ok = np.isfinite(Z)
        if ok.sum() < MIN_CELLS:
            return None
        return X[ok], Y[ok], Z[ok]

    def foot(self, poly, step=2.0):
        """the lowest terrain height along the outline (outer ring and courtyards), NHN, or None without terrain"""
        PE, PN = [], []
        for ring in [poly.exterior] + list(poly.interiors):
            L = ring.length
            for s in np.arange(0.0, L, step):
                q = ring.interpolate(float(s))
                PE.append(q.x)
                PN.append(q.y)
        PE, PN = np.array(PE), np.array(PN)
        h = self.at('dgm', PE, PN)
        if not np.isfinite(h).any():
            # without the terrain tile: the surface minus the object height above ground (nDOM1 = DOM1 - DGM1) is the terrain
            h = self.at('dom', PE, PN) - self.at('ndom', PE, PN)
        if not np.isfinite(h).any():
            return None
        return float(np.nanmin(h))


def rob(R, m):
    """robust error of residuals (rows = models): root of the mean of the m smallest squares"""
    return np.sqrt(np.sort(R * R, axis=-1)[..., :m].mean(axis=-1))


def fit(X, Y, Z, ctr, ux, Wd, Lr, h=None, k=0):
    """fit the roof models to surface cells (X, Y in metres, Z above the foot). ctr, ux, Wd, Lr: the footprint's smallest rectangle
    (centre, long axis, short and long side). -> dict(form, ux, Wd, Lr, planes, eave, rise, pitch, zr, d0, rms, rms_flat, n, why) or
    None when no model fits well (the caller keeps its rule)"""
    n = len(Z)
    if n < MIN_CELLS:
        return None
    ux = np.asarray(ux, float)
    uy = np.array([-ux[1], ux[0]])
    t = (X - ctr[0]) * ux[0] + (Y - ctr[1]) * ux[1]
    d = (X - ctr[0]) * uy[0] + (Y - ctr[1]) * uy[1]
    m = max(6, int(0.85 * n))
    z_med = float(np.median(Z))
    rms_flat = float(rob(Z - z_med, m))
    span = float(np.percentile(Z, 95) - np.percentile(Z, 5))
    cand = []       # (rms, form, axis, zr, tan, d0, sign)
    for axis, (ac, al, W, L) in enumerate(((d, t, Wd, Lr), (t, d, Lr, Wd))):
        if W < 2.5:
            continue
        # gable, the ridge off centre by d0
        for d0 in np.arange(-0.2 * W, 0.2 * W + 1e-9, max(0.5, 0.05 * W)):
            a_ = np.abs(ac - d0)
            Gd = -TANS[:, None] * a_[None, :]
            zr = np.median(Z[None, :] - Gd, axis=1)
            r = rob(Z[None, :] - zr[:, None] - Gd, m)
            i = int(np.argmin(r))
            cand.append((float(r[i]), 2, axis, float(zr[i]), float(TANS[i]), float(d0), 0))
        # hip (equal pitch on all four sides), the ridge in the middle
        if L > 1.05 * W:
            a_ = np.maximum(np.abs(ac), np.abs(al) - (L - W) / 2)
            Gd = -TANS[:, None] * a_[None, :]
            zr = np.median(Z[None, :] - Gd, axis=1)
            r = rob(Z[None, :] - zr[:, None] - Gd, m)
            i = int(np.argmin(r))
            cand.append((float(r[i]), 3, axis, float(zr[i]), float(TANS[i]), 0.0, 0))
        # mono-pitch, falling across this axis to either side
        for sg in (1.0, -1.0):
            Gd = -MONO[:, None] * (sg * ac)[None, :]
            zr = np.median(Z[None, :] - Gd, axis=1)
            r = rob(Z[None, :] - zr[:, None] - Gd, m)
            i = int(np.argmin(r))
            cand.append((float(r[i]), 1, axis, float(zr[i]), float(MONO[i]), 0.0, sg))
    if not cand:
        return None

    def score(c):
        # a simpler roof wins a near tie: hip must be clearly better than gable, the ridge along the longer side is preferred
        return c[0] * (1.0 if c[1] == 2 else 1.12 if c[1] == 3 else 1.08) * (1.0 if c[2] == 0 else 1.08)
    best = min(cand, key=score)
    rms_p = best[0]
    why = []
    # flat: the cells lie in one level (parapets, lift rooms and chimneys are the robust error's outliers)
    if rms_flat <= 0.30 or span < 0.8:
        form = 0
    elif rms_p <= max(0.5, 0.14 * span) and rms_p < 0.7 * rms_flat:
        form = best[1]
    elif rms_flat <= 0.55 and rms_flat <= 1.12 * rms_p + 0.04:
        form = 0
        why.append('eher flach')
    else:
        # no simple roof fits (an L-shaped roof, a roof of many parts, trees above it) - but it is not flat: only the heights are taken,
        # the eave from the lowest cells, the top from the highest; the caller keeps the form of its rule
        ev, tp = float(np.percentile(Z, 8)), float(np.percentile(Z, 97))
        if h is not None and (tp > h + 1.5 or tp < 0.5 * h - 0.5):
            return None
        if tp - ev < 0.8 or ev < 1.6:
            return None
        return dict(partial=True, eave=ev, top=tp if h is None else min(tp, h), rms=rms_p, rms_flat=rms_flat, n=n, span=span)
    if form == 0:
        zr = z_med
        if zr < 1.8:
            return None         # the surface is the ground: the building is not in the surface model (newer than the flight, or gone)
        if h is not None and (zr > h + 1.0 or zr < 0.45 * h - 0.5):
            return None         # the surface model and the height of the building disagree
        return dict(form=0, ux=ux, Wd=Wd, Lr=Lr, planes=[(0.0, 0.0, zr)], eave=zr, rise=0.0, pitch=0.0, zr=zr, d0=0.0, rms=rms_flat, rms_flat=rms_flat,
                    n=n, why=why)
    _, form, axis, zr, tn, d0, sg = best
    if axis == 1:               # the ridge runs along the shorter side: turn the frame
        ux2, W, L = uy, Lr, Wd
        d0, sg = -d0, -sg
    else:
        ux2, W, L = ux, Wd, Lr
    if h is not None:
        if zr > h + 1.5 or zr < 0.5 * h - 0.5:
            return None
        zr = min(zr, h)
    if form == 1:
        # z = zr - tn * sg * d  (d across, measured from the rectangle's middle)
        planes = [(0.0, -tn * sg, zr)]
        top, eave = zr + tn * W / 2, zr - tn * W / 2
        if h is not None and top > h:
            planes = [(0.0, -tn * sg, zr - (top - h))]
            top, eave = h, eave - (top - h)
        rise = top - eave
    else:
        planes = [(0.0, -tn, zr + tn * d0), (0.0, tn, zr - tn * d0)]
        eave = zr - tn * (W / 2 + abs(d0))
        if form == 3:
            ce = (zr - tn * W / 2) + tn * L / 2
            planes += [(-tn, 0.0, ce), (tn, 0.0, ce)]
        rise = zr - eave
    if eave < 1.6 or rise < 0.35:
        return None
    return dict(form=form, ux=np.asarray(ux2, float), Wd=W, Lr=L, planes=planes, eave=eave, rise=rise, pitch=math.degrees(math.atan(tn)), zr=zr, d0=d0,
                rms=rms_p, rms_flat=rms_flat, n=n, why=why)


def measure(dom, poly):
    """the surface cells of one footprint (shapely polygon in UTM) as heights above its foot: (X, Y, Z, info) or (None, None, None,
    info) - info['why'] says what is missing ('kein dom', 'zu klein', 'kein gelaende'); info: top (98 % of the heights), med, n, z0"""
    if not dom.has('dom', poly.bounds):
        return None, None, None, {'why': 'kein dom'}
    c = dom.cells(poly)
    if c is None:
        return None, None, None, {'why': 'zu klein'}
    z0 = dom.foot(poly)
    if z0 is None:
        return None, None, None, {'why': 'kein gelaende'}
    X, Y, Z = c
    Z = Z - z0
    return X, Y, Z, {'top': float(np.percentile(Z, 98)), 'med': float(np.median(Z)), 'n': int(len(Z)), 'z0': z0}


def fit_building(dom, poly, sh, h, k, cells=None):
    """the fit for one footprint (sh = regeln.shape_of of it): (fit or None, info); info['why'] = 'passt nicht' when no model fits"""
    X, Y, Z, info = cells if cells is not None else measure(dom, poly)
    if X is None:
        return None, info
    f = fit(X, Y, Z, np.asarray(sh['ctr'], float), sh['ux'], sh['Wd'], sh['Lr'], h, k)
    if f is None:
        info = dict(info, why='passt nicht')
        return None, info
    return f, info


def selftest():
    """roofs of known form, rasterised at 1 m with noise and a chimney, must come back"""
    rng = np.random.default_rng(1)
    ok = 0
    cases = []
    for form in (0, 1, 2, 3):
        for (Wd, Lr, ang, pitch) in ((9.0, 14.0, 20.0, 40.0), (12.0, 40.0, 75.0, 25.0), (8.0, 9.0, 130.0, 45.0)):
            cases.append((form, Wd, Lr, ang, pitch, 0))
    cases.append((2, 9.0, 14.0, 33.0, 38.0, 1))      # the ridge along the SHORT side
    for form, Wd, Lr, ang, pitch, cross in cases:
        ux = np.array([math.cos(math.radians(ang)), math.sin(math.radians(ang))])
        uy = np.array([-ux[1], ux[0]])
        tn = math.tan(math.radians(pitch if form != 1 else 12.0))
        eave = 6.0
        xs = np.arange(-30.5, 31, 1.0)
        XX, YY = np.meshgrid(xs, xs)
        t, d = XX * ux[0] + YY * ux[1], XX * uy[0] + YY * uy[1]
        ins = (np.abs(t) < Lr / 2 - 0.7) & (np.abs(d) < Wd / 2 - 0.7)
        if cross:
            t, d = d, t
            W, L = Lr, Wd
        else:
            W, L = Wd, Lr
        if form == 0:
            z = np.full(XX.shape, eave)
        elif form == 1:
            z = eave + tn * (d + W / 2)
        elif form == 2:
            z = eave + tn * (W / 2 - np.abs(d))
        else:
            z = eave + tn * np.minimum(W / 2 - np.abs(d), L / 2 - np.abs(t))
        X, Y, Z = XX[ins], YY[ins], z[ins] + rng.normal(0, 0.08, ins.sum())
        Z[:2] += 1.5        # a chimney
        f = fit(X, Y, Z, np.array([0.0, 0.0]), ux, Wd, Lr, h=float(z[ins].max()) + 0.3)
        good = f is not None and f['form'] == form
        if good and form in (2, 3):
            along_long = abs(float(f['ux'] @ ux)) > 0.9
            good = (along_long != bool(cross)) and abs(f['pitch'] - pitch) <= 3.0 and abs(f['eave'] - eave) <= 0.6
        if good and form == 0:
            good = abs(f['eave'] - eave) < 0.3
        ok += bool(good)
        print('ok  ' if good else 'FAIL', 'form', form, 'W', Wd, 'L', Lr, 'pitch', pitch, 'cross', cross, '->',
              None if f is None else (f['form'], round(f['pitch'], 1), round(f['eave'], 2), round(f['rms'], 2), round(f['rms_flat'], 2)))
    print(ok, 'of', len(cases), 'recovered')
    return ok == len(cases)


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(0 if selftest() else 1)
    print(__doc__)
