"""suhl-gebaeude: the sides of a building (one per footprint edge) and their facade parameters by RULE (plan section 4b).

A side (field `S` of the record) is a compact array:
  [ax, ay, bx, by, top a, apex u, apex top, top b, flags, street distance, street index]
  ax..by: start and end (metres relative to the tile centre, the wall's outside is to the right when walking a -> b);
  top a / top b: height of the wall's top edge above the foot at both ends; apex u / apex top: where along the wall (metres from a) the
  top edge is highest and how high (a gable); flags: 1 party wall (a neighbour stands against it), 2 gable side, 4 courtyard side (ring of a
  hole), 8 faces a street; street distance: metres from the wall to the edge of the carriageway it faces (-1: faces none within 40 m
  or another building stands in between); street index: into the tile's list `str` (-1 none).
The facade parameters are kept once per building (`fa`, quality `q` 0 = rule, 1 = from data such as floors of the cadastre or a shop of
OpenStreetMap) and per side only where a side differs (`Sp`: {side index: {...}}) - stage 3 overwrites single sides after photos
(q 2, 3) without touching the rest.
"""
import math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from regeln import hh

MAT = ['putz', 'platte', 'klinker', 'schiefer', 'fachwerk', 'sandstein', 'sichtbeton', 'glas', 'blech', 'holz']
WIN = ['loch', 'band', 'bodentief', 'schaufenster']
EG = ['nichts', 'laden', 'arkade', 'garagentore', 'durchfahrt']
BALK = ['keine', 'balkone', 'loggien', 'franzoesisch']
# palettes by type (sRGB hex): wall colours and the colour of plinth, bands and reveals. Rule values - a photo replaces them in stage 3.
PAL = {
    'hochhaus': (['#d8d4c8', '#cfd3d6', '#e3ddc9', '#c9c2b4'], '#8f8a80'),
    'platte': (['#d9d3c4', '#e6dcc0', '#cdd3d4', '#e0cdb8', '#d6d9cf'], '#9a948a'),
    'zeile': (['#e2d6b8', '#d9c9a8', '#e6dfcf', '#cfc4ae'], '#8c8375'),
    'stadthaus': (['#e8dcc0', '#d9b99a', '#efe6d2', '#c9d2c4', '#e3c9a0', '#d6c2b0', '#f1ead9'], '#8a7f72'),
    'villa': (['#e9e0cc', '#d8c7a6', '#f0ebe0', '#cdb79a'], '#7f766a'),
    'dorf': (['#efe8d8', '#e6dcc4', '#f4f0e6', '#d9ccb2'], '#6f665a'),
    'efh': (['#f0ebdf', '#e8dcc2', '#f5f2ea', '#dfd3bd', '#e6d9c8'], '#8d877c'),
    'block': (['#d9d6cf', '#cfcabd', '#e4e0d6', '#bfc5c8'], '#84807a'),
    'halle': (['#c9ccce', '#d6d3c8', '#b9c0c4', '#dcd8cc'], '#7c7f82'),
    'kirche': (['#e9d9a6', '#e3d3b0', '#d9cdb6'], '#8a7f6c'),
    'garage': (['#cfcabf', '#d9d5cb', '#bdb8ad'], '#7d7a74'),
    'neben': (['#b9aa92', '#c9c2b4', '#a89a84', '#d2cbbd'], '#7a7266'),
    'laube': (['#a98f6e', '#b9a886', '#8f7a5e', '#c4b89c'], '#6e6456'),
}


def hexmix(c, f):
    """darken (f < 1) a '#rrggbb' colour"""
    v = [int(c[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(round(x * f)))) for x in v)


def osm_colour(s):
    s = (s or '').strip().lower()
    names = {'white': '#f2f0ea', 'grey': '#b8b8b4', 'gray': '#b8b8b4', 'yellow': '#e8d48a', 'beige': '#e3d6b8', 'red': '#b5523f', 'brown': '#8a6a4f',
             'green': '#9fb59a', 'orange': '#e0a060', 'blue': '#9fb3c8', 'pink': '#e3bdb4', 'black': '#3a3a3a', 'cream': '#efe6cf',
             'lightgrey': '#d2d2ce', 'light_grey': '#d2d2ce', 'darkgrey': '#77777a', 'silver': '#c4c7c9'}
    if len(s) == 7 and s[0] == '#':
        try:
            int(s[1:], 16)
            return s
        except ValueError:
            return None
    return names.get(s)


def params(sid, typ, k, use, gs, gsq, eave, osm_tags, era, narrow=False):
    """the building's facade parameters by rule -> dict (or None for kinds that have no facade: open roofs, tanks, underground)"""
    if k in (3, 8):
        return None
    t = osm_tags or {}
    q = 1 if gsq >= 1 else 0
    pal, col2 = PAL.get(typ, PAL['efh'])
    col = pal[int(hh(sid + 'c') * len(pal)) % len(pal)]
    oc = osm_colour(t.get('building:colour'))
    if oc:
        col, q = oc, 1
    mat = {'platte': 1, 'hochhaus': 1, 'halle': 8, 'laube': 9, 'kirche': 0}.get(typ, 0)
    om = (t.get('building:material') or '').lower()
    if om:
        m_ = {'brick': 2, 'clinker': 2, 'timber_framing': 4, 'wood': 9, 'sandstone': 5, 'stone': 5, 'concrete': 6, 'glass': 7, 'metal': 8,
              'steel': 8, 'plaster': 0, 'slate': 3}.get(om)
        if m_ is not None:
            mat, q = m_, 1
    elif typ == 'dorf' and hh(sid + 'f') < 0.35:
        mat = 4                 # timber framing: frequent in the village cores (docs/plans/suhl/stadt.md section 6) - a rule, not seen
    elif typ == 'halle' and hh(sid + 'h') < 0.3:
        mat = 6
    sock = {'hochhaus': 1.0, 'platte': 1.0, 'zeile': 0.8, 'stadthaus': 0.5, 'villa': 0.9, 'block': 0.5, 'kirche': 0.8}.get(typ, 0.4 if k == 0 else 0.2)
    sock = min(sock, max(0.0, eave - 2.0))
    g = max(1, int(gs or 1))
    hf = (eave - sock) / g
    if k in (1, 2, 4, 5, 6):
        win = None if k in (2, 4, 5) and typ != 'laube' else [6.0, 1.6, 1.2, max(1.2, min(hf * 0.55, 3.5)), 1 if k == 1 else 0, 0, 0]
        if typ == 'laube':
            win = [2.4, 0.9, 0.9, 0.9, 0, 0, 0]
        if k == 6:
            win = [4.5, 1.4, min(5.0, max(2.5, eave * 0.45)), 2.2, 0, 0, 1]
        return {'mat': mat, 'col': col, 'col2': col2, 'gs': g, 'h0': G.r2(hf), 'hf': G.r2(hf), 'sock': G.r2(sock), 'win': win, 'eg': 0, 'balk': 0, 'q': q}
    # houses: axis spacing, window width and height, sill height, kind, frame colour (0 white, 1 brown, 2 anthracite), glazing bars
    win = {'hochhaus': [3.0, 1.8, 1.4, 0.9, 0, 0, 0], 'platte': [3.0, 1.8, 1.4, 0.9, 0, 0, 0], 'zeile': [2.9, 1.2, 1.4, 0.9, 0, 0, 0],
           'stadthaus': [2.4, 1.0, 1.6, 0.85, 0, 0, 1], 'villa': [2.8, 1.1, 1.7, 0.85, 0, 0, 1], 'dorf': [2.3, 0.95, 1.25, 0.9, 0, 1, 1],
           'block': [3.6, 2.2, 1.6, 0.9, 1 if era in (3, 4) else 0, 2, 0], 'efh': [3.2, 1.3, 1.3, 0.9, 0, 0, 0]}.get(typ, [3.0, 1.2, 1.3, 0.9, 0, 0, 0])
    win = list(win)
    if narrow:
        win = None              # a body narrower than 3 m (a part): no window grid
    if win is not None:
        win[2] = G.r2(min(win[2], max(0.8, hf - win[3] - 0.45)))
    balk = 2 if typ in ('platte', 'hochhaus') else 1 if typ == 'zeile' and hh(sid + 'b') < 0.6 else 0
    return {'mat': mat, 'col': col, 'col2': col2, 'gs': g, 'h0': G.r2(hf), 'hf': G.r2(hf), 'sock': G.r2(sock), 'win': win, 'eg': 0, 'balk': balk, 'q': q}


def sides(rings, walls, sid, poly, ctx, k):
    """the sides of a building. rings: its rings (outer first) as arrays; walls: dach.build's top lines; ctx: neighbours and streets.
    -> (S list, shared count, {side index: (street name, distance)}, list of touching neighbour polygons)"""
    from shapely.geometry import LineString, Point
    S, front, shared_n = [], {}, 0
    for (ri, i, uA, tA, ta, tb, L) in walls:
        ring = rings[ri]
        p0, p1 = ring[i], ring[(i + 1) % len(ring)]
        dx, dy = (p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L
        # outward normal: the outer ring runs counter-clockwise, a hole clockwise - in both cases the outside is to the right
        nx, ny = dy, -dx
        fl = 0
        if ri > 0:
            fl |= 4
        hits = 0
        if k not in (4, 5) and L >= 0.8:
            for f in (0.2, 0.5, 0.8):
                pr = Point(p0[0] + (p1[0] - p0[0]) * f + nx * 0.5, p0[1] + (p1[1] - p0[1]) * f + ny * 0.5)
                for j in ctx['tree'].query(pr.buffer(0.35)):
                    if ctx['ids'][j] != sid and ctx['polys'][j].distance(pr) < 0.35:
                        hits += 1
                        break
        if hits >= 2:
            fl |= 1
            shared_n += 1
        if tA > max(ta, tb) + 0.3:
            fl |= 2
        sd, si = -1.0, -1
        if not (fl & 1) and ri == 0 and L >= 2.5 and ctx.get('rtree') is not None:
            mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
            ray = LineString([(mx + nx * 0.3, my + ny * 0.3), (mx + nx * 40.0, my + ny * 40.0)])
            best = None
            for j in ctx['rtree'].query(ray):
                name, cl, hw, ls = ctx['roads'][j]
                try:
                    x = ray.intersection(ls)
                except Exception:
                    continue
                if x.is_empty:
                    continue
                d = min(math.hypot(q.x - mx, q.y - my) for q in (x.geoms if hasattr(x, 'geoms') else [x]) if q.geom_type == 'Point') \
                    if (hasattr(x, 'geoms') or x.geom_type == 'Point') else None
                if d is None:
                    continue
                d = max(0.0, d - hw)
                if best is None or d < best[0] or (abs(d - best[0]) < 1.0 and name and not best[1]):
                    best = (d, name)
            if best is not None:
                # another building between the wall and the street: the wall does not face it
                blocked = False
                seg = LineString([(mx + nx * 0.6, my + ny * 0.6), (mx + nx * max(0.7, best[0] - 0.5), my + ny * max(0.7, best[0] - 0.5))])
                for j in ctx['tree'].query(seg):
                    if ctx['ids'][j] != sid and ctx['polys'][j].intersects(seg):
                        blocked = True
                        break
                if not blocked:
                    sd = best[0]
                    si = ctx['street_index'](best[1])
                    fl |= 8
                    front[len(S)] = (best[1], sd)
        S.append([G.r2(p0[0]), G.r2(p0[1]), G.r2(p1[0]), G.r2(p1[1]), G.r2(ta), G.r2(uA), G.r2(tA), G.r2(tb), fl, G.r1(sd), si])
    return S, shared_n, front
