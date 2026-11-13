"""suhl-gebaeude: the roof of a building - form, ridge direction, eave and faces - ESTIMATED from what is known today (footprint, the
height to the highest point from ETHOS / LoD2, floors and function from the cadastre, the neighbours, an OpenStreetMap roof tag, the
aerial image). LoD2 will replace it by the real roof faces (flag `rq` 3); until then every roof carries `rq`:
  0 = rule from form, type and floors      1 = rule, with the aerial image (flat or pitched, the way the ridge runs)
  2 = roof shape tagged in OpenStreetMap   3 = LoD2 (not yet)
Roof forms `r` (as tools/welt-gebaeude/prep.py): 0 flat, 1 mono-pitch, 2 gable, 3 hip. Coordinates: metres relative to the tile centre on
the UTM axes; azimuths in degrees from true north, clockwise; areas in m² (true metres, UTM).
"""
import math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from regeln import hh
from zone_schleusingen import roof_faces, walls_of      # tools/welt (read only): planes -> faces and the top line of every wall

STOREY = {'hochhaus': 2.8, 'platte': 2.8, 'zeile': 2.9, 'stadthaus': 3.2, 'villa': 3.3, 'dorf': 2.7, 'efh': 2.8, 'block': 3.5, 'kirche': 6.0}
PLINTH = {'hochhaus': 1.0, 'platte': 1.0, 'zeile': 0.8, 'stadthaus': 0.5, 'villa': 0.9, 'dorf': 0.5, 'efh': 0.5, 'block': 0.5}
OSM_SHAPE = {'flat': 0, 'skillion': 1, 'lean_to': 1, 'gabled': 2, 'gambrel': 2, 'saltbox': 2, 'half-hipped': 2, 'half_hipped': 2, 'hipped': 3,
             'mansard': 3, 'pyramidal': 3, 'side_hipped': 3, 'dome': 3, 'onion': 3, 'round': 2, 'sawtooth': 0}
PITCH_SHAPE = {'mansard': 52.0, 'gambrel': 48.0, 'pyramidal': 40.0, 'dome': 45.0, 'onion': 55.0}


def estimate(sh, h, k, typ, use, gs, osm_tags, ridge=None, img=None, part=False):
    """form, pitch, eave and ridge of one building. sh = regeln.shape_of(footprint); h = height to the highest point (m);
    ridge = (unit vector, why) from the neighbours or None; img = {'flat': bool|None, 'ridge': unit vector|None} from the aerial image"""
    A, Wd, Lr, ux = sh['A'], sh['Wd'], sh['Lr'], np.array(sh['ux'], dtype=float)
    t = osm_tags or {}
    rq, rs, why = 0, None, []
    img = img or {}
    g = gs
    form, pitch = None, None
    shape = (t.get('roof:shape') or '').lower()
    if shape in OSM_SHAPE:
        form, rq, rs = OSM_SHAPE[shape], 2, shape
        pitch = PITCH_SHAPE.get(shape)
        why.append('osm')
    hf, pl = STOREY.get(typ, 3.0), PLINTH.get(typ, 0.4)
    if g and g * 2.5 > h + 0.5:
        g = None                # the floors of the cadastre do not fit under the measured height (a low part of a taller house): not used
    wall = (g * hf + pl) if g else None
    room = (h - wall) if wall is not None else None        # what is left above the storeys for a roof
    attic = False
    if form in (1, 2, 3) and room is not None and room < 1.2 and g and g >= 2 and k in (0, 6):
        # a pitched roof (known from a tag) but no room above the storeys: the top storey lies in the roof
        wall = (g - 1) * hf + pl
        room, attic = h - wall, True
    if form is None:
        if k in (3, 4, 5, 8):
            form = 0
        elif part and A < 40:
            form = 0            # a small part attached to a bigger building (stair tower, bay, lift): flat at its own height
        elif k == 6:
            form, pitch = 2, 50.0
        elif typ in ('hochhaus', 'platte'):
            form = 0
        elif k == 0:
            if g and g >= 8:
                form = 0
            elif room is not None:
                # floors from the cadastre: a roof needs room above them
                lim = 1.5 if (g or 1) <= 4 else 2.5
                if room < lim:
                    form = 0
                elif img.get('flat') is True and room < 3.2:
                    form, rq = 0, 1
                    why.append('bild flach')
                else:
                    form = 3 if (typ == 'villa' and hh(str(A) + 'v') < 0.5) else 2
            else:
                ms = h >= 10.0 and 6.5 <= Wd <= 18.0 and A >= 120
                if ms and (h >= 12.5 or Lr / max(Wd, 0.1) >= 2.5):
                    fl = img.get('flat')
                    form = 0 if (fl if fl is not None else Lr / max(Wd, 0.1) >= 2.5) else 2
                    if fl is not None:
                        rq = 1
                else:
                    form = 2
            if form in (2, 3) and typ == 'block':
                # offices, schools, shops: wide ones are flat unless there is clearly room for a roof above the floors (then hipped)
                rm = room if room is not None else 0.0
                if img.get('flat') is True and rm < 4.5:
                    form, rq = 0, 1
                elif img.get('flat') is False and Wd < 30:
                    form, rq = (3 if A >= 300 else 2), 1
                elif (A >= 600 or Wd >= 18) and rm < 3.0:
                    form = 0
                elif A >= 300 and rm >= 3.0:
                    form = 3
        elif k == 1:
            form = 2 if Wd < 45 else 0
            if img.get('flat') is True:
                form, rq = 0, 1
            pitch = 14.0
        else:   # k == 2: outbuildings
            if h < 3.4:
                form, pitch = (0, 0.0) if (sh['rect'] > 0.9 and 14 <= A <= 140 and (use == 'garage' or hh(str(A) + 'g') < 0.6)) else (1, 9.0)
            else:
                form, pitch = 2, 32.0
    # the ridge: along the longer side; in a row along the row (across the party walls); a squarish house as the image shows it
    if form in (2, 3):
        if ridge is not None:
            r_ = np.array(ridge[0], dtype=float)
            if abs(float(r_ @ ux)) < 0.5:        # the row runs across the longer side: a deep house in a row
                ux, Wd, Lr = np.array([-ux[1], ux[0]]), Lr, Wd
                why.append(ridge[1])
        elif img.get('ridge') is not None and Lr / max(Wd, 0.1) < 1.35:
            r_ = np.array(img['ridge'], dtype=float)
            if abs(float(r_ @ ux)) < 0.5:
                ux, Wd, Lr = np.array([-ux[1], ux[0]]), Lr, Wd
            rq = max(rq, 1)
            why.append('bild first')
    emin = {0: 2.6, 1: 2.8, 2: 2.0, 6: 4.0}.get(k, 2.0)
    if form == 0:
        eave, rise, pitch = h, 0.0, 0.0
    else:
        span = Wd if form == 1 else Wd / 2
        if pitch is None:
            if room is not None and room >= 1.2:
                # the eave sits on the storeys, the ridge is the measured highest point
                rise = room
                p_ = math.degrees(math.atan2(rise, max(span, 0.5)))
                if p_ > 56.0:
                    rise = span * math.tan(math.radians(56.0))
                elif p_ < 14.0:
                    rise = max(rise, min(span * math.tan(math.radians(14.0)), h - emin))
            else:
                p0 = {'stadthaus': 45.0, 'dorf': 47.0, 'villa': 40.0, 'efh': 40.0, 'zeile': 35.0, 'block': 25.0, 'halle': 14.0}.get(typ, 38.0)
                rise = span * math.tan(math.radians(p0))
                if k in (0, 6) and h >= 6.0:
                    rise = min(rise, 0.5 * h)       # a roof is at most half of a house
        else:
            rise = span * math.tan(math.radians(pitch))
            if room is not None and room >= 1.2:
                rise = min(rise, room) if not attic else room
            elif k in (0, 6) and h >= 6.0:
                rise = min(rise, 0.5 * h)
        if h - rise < emin:
            rise = max(0.0, h - emin)
        eave = h - rise
        if rise < 0.35:
            form, eave, rise = 0, h, 0.0
        pitch = math.degrees(math.atan2(rise, max(span, 0.5))) if form else 0.0
    return dict(form=form, pitch=pitch, eave=eave, rise=rise, ux=ux, Wd=Wd, Lr=Lr, ctr=np.array(sh['ctr'], dtype=float), rq=rq, rs=rs, why=why, h=h,
                gs_fit=g)


def planes_of(est, sid):
    """the roof as planes z = a t + b d + c in the frame of the ridge (t along it, d across), as prep.py make()"""
    if est.get('planes'):
        return est['planes']        # measured on the surface model (dom.py)
    eave, rise, form, Wd, Lr = est['eave'], est['rise'], est['form'], est['Wd'], est['Lr']
    if form == 0:
        return [(0.0, 0.0, eave)]
    if form == 1:
        sg = 1.0 if hh(sid + 'm') < 0.5 else -1.0      # which side is high: not known before LoD2
        return [(0.0, sg * rise / max(Wd, 0.5), eave + rise / 2)]
    k_ = rise / max(Wd / 2, 0.5)
    pl = [(0.0, -k_, eave + rise), (0.0, k_, eave + rise)]
    if form == 3:
        ce = eave + k_ * Lr / 2
        pl += [(-k_, 0.0, ce), (k_, 0.0, ce)]
    return pl


def build(poly, est, sid, k, shared):
    """roof faces and the top line of every wall. poly: the footprint (shapely, CCW, holes allowed), metres relative to the tile centre.
    -> (faces, walls): faces = [{'v': [x, y, z, ...], 't': [i, j, k, ...], 'sl': slope deg, 'az': downslope azimuth from true north or None,
    'a': area m² on the slope inside the footprint}], walls = [(ring index, edge index, apex u, apex top, top a, top b, length)]"""
    from shapely.geometry import Polygon
    ux, ctr = est['ux'], est['ctr']
    uy = np.array([-ux[1], ux[0]])
    planes = planes_of(est, sid)
    loc = lambda Q: np.stack([(Q[:, 0] - ctr[0]) * ux[0] + (Q[:, 1] - ctr[1]) * ux[1], (Q[:, 0] - ctr[0]) * uy[0] + (Q[:, 1] - ctr[1]) * uy[1]], 1)
    rings = [np.array(poly.exterior.coords)[:-1]] + [np.array(r.coords)[:-1] for r in poly.interiors]
    lrings = [loc(r) for r in rings]
    lp = Polygon(lrings[0], lrings[1:])
    if not lp.is_valid:
        lp = lp.buffer(0)
        if lp.geom_type != 'Polygon':
            lp = max(lp.geoms, key=lambda q: q.area)
    walls = []
    for ri, lr in enumerate(lrings):
        for (i, uA, tA, ta, tb, L) in walls_of([tuple(p) for p in lr], planes):
            walls.append((ri, i, uA, tA, ta, tb, L))
    over = 0.0 if est['form'] == 0 else (0.25 if shared else 0.45) if k in (0, 6) else 0.3 if k == 1 else 0.2

    def plane_of(vv):
        return min(range(len(planes)), key=lambda q: float(np.abs(planes[q][0] * vv[:, 0] + planes[q][1] * vv[:, 1] + planes[q][2] - vv[:, 2]).max()))

    def tri_area(vv, tri):
        t = np.asarray(tri).reshape(-1, 3)
        a_, b_, c_ = vv[t[:, 0], :2], vv[t[:, 1], :2], vv[t[:, 2], :2]
        return float(np.abs((b_[:, 0] - a_[:, 0]) * (c_[:, 1] - a_[:, 1]) - (b_[:, 1] - a_[:, 1]) * (c_[:, 0] - a_[:, 0])).sum() / 2)

    if est['form'] == 0:
        # a flat roof is the footprint at the eave: no vertices needed
        X = ctr[0] + lrings[0][:, 0] * ux[0] + lrings[0][:, 1] * uy[0]
        Y = ctr[1] + lrings[0][:, 0] * ux[1] + lrings[0][:, 1] * uy[1]
        return [{'v': None, 't': None, 'sl': 0.0, 'az': None, 'a': round(lp.area, 1), '_pg': poly}], walls, rings
    # the areas count inside the footprint (without the overhang), per plane; the drawn faces carry the overhang
    inside = {}
    for vv, tri in roof_faces(lp, planes, 0.0):
        q = plane_of(vv)
        inside[q] = inside.get(q, 0.0) + tri_area(vv, tri)
    drawn = [(vv, tri, plane_of(vv), tri_area(vv, tri)) for vv, tri in roof_faces(lp, planes, over)]
    dsum = {}
    for vv, tri, q, ta in drawn:
        dsum[q] = dsum.get(q, 0.0) + ta
    faces = []
    for vv, tri, q, ta in drawn:
        gt, gd = planes[q][0], planes[q][1]
        gn = math.hypot(gt, gd)
        sl = math.degrees(math.atan(gn))
        az = None
        if gn > 1e-6:
            dv = -(gt * ux + gd * uy) / gn                 # the way the water runs (east, north)
            az = round((math.degrees(math.atan2(dv[0], dv[1])) + G.CONV) % 360.0, 1) % 360.0
        plan = inside.get(q, 0.0) * ta / max(dsum[q], 1e-9)
        X = ctr[0] + vv[:, 0] * ux[0] + vv[:, 1] * uy[0]
        Y = ctr[1] + vv[:, 0] * ux[1] + vv[:, 1] * uy[1]
        v = []
        for x, y, z in zip(X, Y, vv[:, 2]):
            v += [G.r2(x), G.r2(y), G.r2(z)]
        xy = np.column_stack([X, Y])
        try:
            pg = Polygon(xy)
            if (not pg.is_valid) or abs(pg.area - ta) > 0.02 * ta + 0.05:
                from shapely.ops import unary_union
                t3 = np.asarray(tri).reshape(-1, 3)
                pg = unary_union([Polygon(xy[list(t_)]) for t_ in t3]).buffer(0)
        except Exception:
            pg = None
        faces.append({'v': v, 't': np.asarray(tri).ravel().tolist(), 'sl': round(sl, 1), 'az': None if az is None else round(az, 1),
                      'a': round(plan * math.sqrt(1.0 + gn * gn), 1), '_pg': pg})
    return faces, walls, rings


def ridge_from_neighbours(poly, others, sh):
    """a house in a row: the ridge runs along the row, i.e. across its party walls. others: the footprints that touch this one.
    -> (unit vector, 'reihe') or None"""
    if not others:
        return None
    from shapely.geometry import LineString
    ring = np.array(poly.exterior.coords)
    acc = np.zeros(2)
    tot = 0.0
    for i in range(len(ring) - 1):
        p0, p1 = ring[i], ring[i + 1]
        L = float(np.hypot(*(p1 - p0)))
        if L < 1.5:
            continue
        seg = LineString([p0, p1])
        sharedL = 0.0
        for o in others:
            try:
                sharedL = max(sharedL, seg.intersection(o.buffer(0.35)).length)
            except Exception:
                pass
        if sharedL < 0.5 * L or sharedL < 2.5:
            continue
        d = (p1 - p0) / L
        n = np.array([d[1], -d[0]])
        # fold the normal onto one half plane so opposite party walls add up
        if n @ sh['ux'] < 0 or (abs(n @ sh['ux']) < 1e-6 and n[0] < 0):
            n = -n
        # snap to the rectangle's axes
        a = abs(float(n @ sh['ux']))
        nn = np.array(sh['ux']) if a >= 0.7071 else np.array([-sh['ux'][1], sh['ux'][0]])
        acc += nn * sharedL
        tot += sharedL
    if tot < 3.0:
        return None
    a_long = abs(float(acc @ sh['ux']))
    a_cross = abs(float(acc @ np.array([-sh['ux'][1], sh['ux'][0]])))
    v = np.array(sh['ux']) if a_long >= a_cross else np.array([-sh['ux'][1], sh['ux'][0]])
    return v, 'reihe'
