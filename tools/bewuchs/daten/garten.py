"""Falko's garden and the modelled site around it (x −50…42, y −52…48, docs/ARCHITECTURE.md §11) at 25 cm: the classes of the land as the
general rules give them (the plots south of the field path treated as gardens), then the site as the app models it – the lawn of
garden/grass.js inside the garden's fence (viz3/site.js `garden`), a fringe the mower misses along the fence and round the trunks, the
brook's banks (garden/stream_geo.js), the slab terrace and the culvert, the dug patches of the young trees (garden/garten_heute.js),
Ronald's goat paddock (npc/npc.js PAD) and his mown meadow north of it. Buildings, gravel paths and the water of the brook are left to the
runtime (they move with the plan view or are drawn by it): lawn there, as the brief asks."""
import os, sys
import numpy as np
from scipy import ndimage as ndi
from shapely.geometry import Point, Polygon, box
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import Grid, K, SITE_ZONE  # noqa: E402
import handdaten  # noqa: E402
import klassen  # noqa: E402
import raster  # noqa: E402

RES = 0.25
FRINGE = 0.5      # m along the fence the mower does not reach
TRUNK = 0.6       # m round a trunk
BANK_TOP = 0.6    # m of bank beyond the ditch's top edge


def grid():
    x0, y0, x1, y1 = SITE_ZONE
    return Grid(x0, y1, RES, round((x1 - x0) / RES), round((y1 - y0) / RES))


def brook_across(app, X, Y):
    """signed distance from the brook's centre line (+ towards the gardens) and t along the field path (garden/stream_geo.js across, loc)"""
    s = app['stream']
    U, N, P1 = np.asarray(s['U']), np.asarray(s['N']), np.asarray(s['P1'])
    dx, dy = X - P1[0], Y - P1[1]
    t = dx * U[0] + dy * U[1]
    o = dx * N[0] + dy * N[1]
    L = np.asarray(s['line'])
    c = np.interp(t, L[:, 0], L[:, 1])
    return o - c, t, o


def base_classes(q, g, app):
    """the general classes of the cells under the zone (the DLM has the plots as built-up land: gardens), sampled at 25 cm"""
    X, Y = g.centres()
    out = np.zeros((g.h, g.w), np.uint8)
    x0, y0, x1, y1 = SITE_ZONE
    from gemeinsam import cells_in
    for (i, j) in cells_in(x0, y0, x1, y1):
        cls, nd, info = klassen.classify(q, i, j, model_zone=True)
        cg = Grid.cell(i, j, klassen.RES)
        u, v = cg.to_px(X, Y)
        ins = (u >= 0) & (u < cg.w) & (v >= 0) & (v < cg.h)
        out[ins] = cls[v[ins].astype(int), u[ins].astype(int)]
    return out


def build(q, base=None):
    app = q.app
    S = app['site']
    s = app['stream']
    g = grid()
    X, Y = g.centres()
    cls = base_classes(q, g, app) if base is None else base.copy()
    # bushes from the height model: the site's plants are the app's own (garden/trees.js, Hubert's yard), and the model stands a few metres
    # off the photo there – the land round them instead
    b = cls == K['gebuesch']
    if b.any():
        d, idx = ndi.distance_transform_edt(b, return_indices=True)
        cls[b] = cls[idx[0], idx[1]][b]
    # Ronald's meadow north of his paddock and east of the garden (he mows it with his tractor): green there is meadow, not lawn
    gpoly = Polygon(S['garden'])
    gx1 = max(p[0] for p in S['garden'])
    a, t, o = brook_across(app, X, Y)
    P = handdaten.PAD
    ronald = (X > gx1) & (Y > P['y1']) & (a > s['WT'] + BANK_TOP) & ~raster.draw_polys(g, [gpoly]).astype(bool)
    cls[ronald & np.isin(cls, [K['zierrasen'], K['oeffentlich']])] = K['maehwiese']
    # the paddock: pasture, a fringe along its fence
    pad = (X > P['x0']) & (X < P['x1']) & (Y > P['y0']) & (Y < P['y1'])
    keep = np.isin(cls, [K['nichts'], K['gebuesch']])
    cls[pad & ~keep] = K['weide']
    pad_edge = pad & ((X - P['x0'] < FRINGE) | (P['x1'] - X < FRINGE) | (Y - P['y0'] < FRINGE) | (P['y1'] - Y < FRINGE))
    cls[pad_edge & ~keep] = K['saum']
    # Falko's garden: lawn inside the fence, the fringe along it
    gm = raster.draw_polys(g, [gpoly]).astype(bool)
    cls[gm] = K['zierrasen']
    inner = ndi.distance_transform_edt(gm) * RES
    cls[gm & (inner <= FRINGE)] = K['saum']
    # round the trunks of the garden's trees (garden/grass.js keeps 0.35 m free and sets tall tufts there)
    near = gpoly.buffer(1.0)
    tr = [tt for tt in S['trees'] if near.contains(Point(tt[0], tt[1]))]
    if tr:
        cls[raster.disc_mask(g, [tt[:2] for tt in tr], TRUNK) & gm] = K['saum']
    # the brook: banks on both sides from the water to 0.6 m beyond the ditch's top edge; the water itself is the runtime's (lawn)
    ditch_t = (t > s['tLim'][0]) & (t < s['tLim'][1])
    bank = ditch_t & (np.abs(a) >= s['WW']) & (np.abs(a) < s['WT'] + BANK_TOP)
    cls[bank] = K['ufer']
    cls[ditch_t & (np.abs(a) < s['WW'])] = K['zierrasen']
    # the culvert under the gate slab (STREAM.BR) and the slab terrace with its steps: paved, nothing grows
    BR, TE = s['BR'], s['TERR']
    cls[(np.abs(t - BR['t']) < BR['w']) & (np.abs(o - s['OFF']) < BR['l'])] = K['nichts']
    cls[(np.abs(t - TE['t']) < TE['ht']) & (np.abs(o - TE['o']) < TE['ho'])] = K['nichts']
    for st in s['STAIRS']:
        cls[(np.abs(t - st['t']) < s['SW']) & (a > 0.4) & (a < s['YT'])] = K['nichts']
    # the young trees' dug patches
    cls[raster.disc_mask(g, [p[:2] for p in handdaten.PFLANZFLECKEN], [p[2] for p in handdaten.PFLANZFLECKEN])] = K['nichts']
    return cls, g
