"""Products s (streets), m (street furniture), b (trees), gr (green areas), w (forest cells), d (scenario numbers): the tile files.

Schema 1, revision 1.1: s, m, b, gr and w are checked in the layout their owners deliver (suhl-strassen, suhl-gruen, 13.11.2026).
The validator is strict about head and frame and tolerant about the rest.
"""
import struct

from .core import S, check_envelope, is_int, is_num
from .g import QUALITY, check_d

# ---------------------------------------------------------------- b: trees (binary) - the layout suhl-gruen delivers
# n x 8 bytes, little endian, no head (the number of trees is the file size / 8):
#   uint16 x   centimetres east of the tile's west edge  (UTM 32N, true metres - not the model frame)
#   uint16 y   centimetres north of the tile's south edge
#   uint8  h   height of the tree in 0.25 m
#   uint8  r   crown radius in 0.1 m
#   uint8  kind    TREE_KINDS
#   uint8  flags   TREE_FLAGS
# The ground height is not in the file: the runtime asks its ground. UTM -> model with xf (suhllib.model_from_utm).
S_REACH_DM = 3300        # tile-local decimetres: half a tile is 1970 model dm, its half diagonal 2790 dm; ways are cut at the tile edge
TREE_REC = struct.Struct('<HHBBBB')
TREE_KINDS = {0: 'deciduous tree (species unknown)', 1: 'conifer (species unknown)', 2: 'spruce', 3: 'pine', 4: 'larch', 5: 'fir or Douglas fir',
              10: 'lime', 11: 'maple', 12: 'oak', 13: 'beech', 14: 'birch', 15: 'ash', 16: 'horse chestnut', 17: 'plane', 18: 'poplar',
              19: 'willow', 20: 'fruit tree', 21: 'robinia', 22: 'hornbeam', 23: 'rowan or whitebeam', 24: 'alder', 25: 'ornamental cherry',
              30: 'shrub, hedge or very small tree'}
TREE_CONIFERS = (1, 2, 3, 4, 5)
TREE_FLAGS = {'bits 0-1': 'where the position comes from: 0 set by rule, 1 aerial image (crown, 20 cm), 2 OpenStreetMap (mapped tree), '
                          '3 canopy height model (nDOM1)',
              4: 'height measured (nDOM1); otherwise estimated from crown radius and kind',
              8: 'crown radius measured (crown area in the aerial image or nDOM1); otherwise estimated',
              16: 'kind from a mapped value (OSM species / genus / leaf_type); otherwise estimated from the infrared signature',
              32: 'trunk moved off a roof or a carriageway', 64: 'the tree is mapped in OpenStreetMap (natural=tree)', 128: 'free'}
TREE_MAX_CM = 40000       # a level-10 tile is 400 m


def tree_pack(trees):
    """[(east m, north m, height m, crown radius m, kind, flags)] with east/north measured from the tile's south-west corner in UTM
    metres -> the bytes of a b tile"""
    out = []
    for e, n, h, r, kind, fl in trees:
        x, y = int(round(e * 100)), int(round(n * 100))
        if not (0 <= x < TREE_MAX_CM and 0 <= y < TREE_MAX_CM):
            raise S.SuhlError(f'tree at {e:.2f}, {n:.2f} m lies outside its tile (0 <= east, north < 400)')
        out.append(TREE_REC.pack(x, y, max(1, min(255, int(round(h * 4)))), max(1, min(255, int(round(r * 10)))), int(kind), int(fl)))
    return b''.join(out)


def tree_unpack(b):
    """the bytes of a b tile -> [(east m, north m, height m, crown radius m, kind, flags)], metres from the tile's south-west corner"""
    if len(b) % TREE_REC.size:
        raise S.SuhlError('not a b tile (trees): the size is not a multiple of 8')
    return [(x / 100, y / 100, h / 4, r / 10, kind, fl) for x, y, h, r, kind, fl in TREE_REC.iter_unpack(b)]


def tree_model(key, tree):
    """a tree of tree_unpack -> its place in model metres (x, y)"""
    e0, n0 = S.tbounds(*key)[:2]
    return S.model_from_utm(e0 + tree[0], n0 + tree[1])


def check_b_tile(data, key, rep, where):
    if len(data) % TREE_REC.size:
        rep.err(where, f'a b tile is n x {TREE_REC.size} bytes without a head; found {len(data)} bytes', 'b size')
        return
    n = len(data) // TREE_REC.size
    if n == 0:
        rep.warn(where, 'a tile without trees should not be written', 'empty tile')
    bad_kind = out = zero = 0
    for x, y, h, r, kind, fl in TREE_REC.iter_unpack(data):
        if kind not in TREE_KINDS:
            bad_kind += 1
        if x >= TREE_MAX_CM or y >= TREE_MAX_CM:
            out += 1
        if h == 0 or r == 0:
            zero += 1
    if bad_kind:
        rep.err(where, f'{bad_kind} of {n} trees have an unknown kind (known: {sorted(TREE_KINDS)}; a new kind: tell suhl-daten)', 'b kind')
    if out:
        rep.err(where, f'{out} of {n} trees lie outside the tile (x, y are centimetres from the south-west corner, below {TREE_MAX_CM})', 'b outside')
    if zero:
        rep.err(where, f'{zero} of {n} trees have height 0 or crown radius 0', 'b zero')
    rep.stat('b: trees', n)


# ---------------------------------------------------------------- w: forest cells (binary) - the layout suhl-gruen delivers
# 6 layers of 20 x 20 cells (20 m), one byte per cell, 2400 bytes; row 0 = south edge, cell 0 = west edge (UTM):
#   kind (0 none, 1 deciduous, 2 conifer (spruce), 3 mixed, 5 young stand / clearing regrowth, 6 bare), conifer share in percent,
#   crown cover in percent, height in 0.25 m, density, flags
W_LAYERS = ('art', 'nadel', 'deckung', 'hoehe', 'dichte', 'merker')
W_CELLS = 20
W_KINDS = {0: 'no stand', 1: 'deciduous forest', 2: 'conifer forest (spruce)', 3: 'mixed forest', 5: 'young stand or clearing regrowth', 6: 'bare ground'}


def check_w_tile(data, key, rep, where):
    want = len(W_LAYERS) * W_CELLS * W_CELLS
    if len(data) != want:
        rep.err(where, f'a w tile is {len(W_LAYERS)} layers of {W_CELLS} x {W_CELLS} bytes = {want} bytes; found {len(data)}', 'w size')
        return
    n = W_CELLS * W_CELLS
    kinds = set(data[:n])
    if not kinds <= set(W_KINDS):
        rep.err(where, f'unknown stand kinds {sorted(kinds - set(W_KINDS))} (known: {sorted(W_KINDS)}; a new kind: tell suhl-daten)', 'w kind')
    if max(data[n:3 * n], default=0) > 100:
        rep.err(where, 'conifer share and crown cover are percentages (0..100)', 'w percent')
    rep.stat('w: forest cells', sum(1 for k in data[:n] if k))


# ---------------------------------------------------------------- gr: green areas (JSON) - the layout suhl-gruen delivers
# {"f": [[class, "<osm id>", [ring, ...]], ...]}: ring = [x0, y0, x1, y1, ...] in DECIMETRES from the tile's south-west corner (UTM 32N),
# first ring outline, further rings holes; later areas lie on top of earlier ones. No head is required (no tile-local model frame).
GR_CLASSES = {1: 'forest', 2: 'scrub', 3: 'meadow', 4: 'lawn', 5: 'park', 6: 'garden', 7: 'allotment', 8: 'cemetery', 9: 'pitch', 10: 'playground',
              11: 'field', 12: 'orchard', 17: 'heath', 18: 'wetland'}


def check_gr_tile(doc, key, rep, where):
    if not isinstance(doc, dict) or not isinstance(doc.get('f'), list):
        rep.err(where, 'a gr tile is {"f": [[class, osm id, [ring, ...]], ...]}', 'gr')
        return
    for name, want in (('schema', S.SCHEMA), ('product', 'gr'), ('key', S.tile_key(*key) if key else None)):
        if name in doc and want is not None and doc[name] != want:
            rep.err(where, f'"{name}" is {doc[name]!r}, expected {want!r}', 'gr ' + name)
    lim = 4000 + 60          # decimetres; an outline may touch the edge
    for i, a in enumerate(doc['f']):
        w = f'{where} f[{i}]'
        if not (isinstance(a, list) and len(a) >= 3 and is_int(a[0]) and isinstance(a[1], str) and isinstance(a[2], list) and a[2]):
            rep.err(w, 'an area is [class, "<osm id>", [ring, ...]]', 'gr area')
            continue
        if a[0] not in GR_CLASSES:
            rep.err(w, f'unknown class {a[0]} (known: {sorted(GR_CLASSES)}; a new class: tell suhl-daten)', 'gr class')
        for r in a[2]:
            if not (isinstance(r, list) and len(r) >= 6 and len(r) % 2 == 0 and all(is_int(q) for q in r)):
                rep.err(w, 'a ring is [x0, y0, x1, y1, ...] in whole decimetres from the south-west corner, at least 3 points', 'gr ring')
                break
            if min(r) < -60 or max(r) > lim:
                rep.err(w, f'a ring leaves the tile ({min(r)}..{max(r)} dm; the tile is 0..4000) - another frame?', 'gr frame')
                break
    rep.stat('gr: areas', len(doc['f']))


# ---------------------------------------------------------------- m: street furniture (JSON) - the layout suhl-strassen delivers
# {schema, product: 'm', key, o, unit: 'dm; ...', <layer>: [...], ...} - one list per kind of thing, positions in whole DECIMETRES relative
# to o along the model axes (tile-local, as in s), directions in degrees. The layers (index.json "fields" describes each row):
#   pfosten    flat: x, y, az                      lampen     flat: x, y, az, kind (0 at a road, 1 free-standing)
#   planken    [side, x, y, x, y, ...]             schilder   [code, x, y, az(, text)]
#   masten     [x, y, type, az, [x, y, ...]]       linien     [halt | warte | zebra, x, y, az, half width]
#   ampeln     [kind, x, y, arms, osm node, [mast x, y, az, ...]]      querungen  [type, x, y, az, width, ..., osm node]
#   halte      [x, y, az, name, ...]               namen      [x, y, street name, az, crossing street name, az]
M_FLAT = {'pfosten': 3, 'lampen': 4}               # flat layers: numbers per thing
M_ROWS = {'planken': (1, 2), 'schilder': (1, 2), 'masten': (0, 1), 'linien': (1, 2), 'ampeln': (1, 2), 'querungen': (1, 2), 'halte': (0, 1),
          'namen': (0, 1)}                         # row layers: where x and y stand in a row
FURNITURE = tuple(M_FLAT) + tuple(M_ROWS)


def m_count(doc):
    """the number of things in an m tile"""
    n = 0
    for k, per in M_FLAT.items():
        n += len(doc.get(k) or []) // per
    for k in M_ROWS:
        n += len(doc.get(k) or [])
    return n


def check_m_tile(doc, key, rep, where):
    fr = check_envelope(doc, 'm', key, rep, where)
    if fr is None:
        return
    if not (isinstance(doc.get('unit'), str) and doc['unit'].startswith('dm')):
        rep.warn(where, '"unit" is missing: say it as in the s tiles ("dm; x, y relative to o along the model axes, z = NHN - H0")', 'm unit')
    layers = [k for k in doc if k in M_FLAT or k in M_ROWS]
    if not layers:
        rep.err(where, f'no layer of street furniture found (known: {", ".join(FURNITURE)}; a new layer: tell suhl-daten)', 'm layers')
        return
    for k in layers:
        v = doc[k]
        if not isinstance(v, list):
            rep.err(where, f'"{k}" must be a list', 'm layer')
            continue
        if k in M_FLAT:
            per = M_FLAT[k]
            if len(v) % per or not all(is_num(q) for q in v):
                rep.err(where, f'"{k}" is a flat list of numbers, {per} per thing; found {len(v)} entries', 'm flat')
                continue
            far = max((abs(q) for i, q in enumerate(v) if i % per < 2), default=0)
        else:
            ix, iy = M_ROWS[k]
            if not all(isinstance(r, list) and len(r) > iy and is_num(r[ix]) and is_num(r[iy]) for r in v):
                rep.err(where, f'"{k}": every row is a list with x at place {ix} and y at place {iy}', 'm row')
                continue
            far = max((max(abs(r[ix]), abs(r[iy])) for r in v), default=0)
        if far > S_REACH_DM:
            rep.err(where, f'"{k}": a thing lies {far} dm from the tile centre - absolute instead of tile-local decimetres?', 'm frame')
    rep.stat('m: things', m_count(doc))


# ---------------------------------------------------------------- s: streets (JSON) - the layout suhl-strassen delivers
# {schema, product: 's', key, o, unit: 'dm; ...', kinds, surf, hws, atypes, names, ways: [row, ...], areas: [row, ...], m: {...}}
#   a way:   [kind, surf, width_dm, fl, name, ref, xyz_dm, osm_way, s0_dm, lanes, hw, maxspeed, style]   (the first seven as in
#            fahrt/strassen.json; kind, surf, name, ref, hw are indices into the tile's tables)
#   an area: [type, surf, fl, name, osm, home, q, xyz_dm, holes]
# xyz_dm = [x, y, z, ...] in whole DECIMETRES: x, y relative to o along the model axes (tile-local), z = NHN - H0.
S_WAY_LEN, S_AREA_LEN = 13, 9


def check_s_tile(doc, key, rep, where):
    fr = check_envelope(doc, 's', key, rep, where)
    if fr is None:
        return
    if not (isinstance(doc.get('unit'), str) and doc['unit'].startswith('dm')):
        rep.err(where, '"unit" must start with "dm": points are whole decimetres relative to o (tile-local), z = NHN - H0', 's unit')
    for tab in ('kinds', 'surf', 'names'):
        if not (isinstance(doc.get(tab), list) and all(isinstance(q, str) for q in doc[tab])):
            rep.err(where, f'"{tab}" must be a list of strings (the table the rows of "ways" point into)', 's ' + tab)
            return
    if not isinstance(doc.get('ways'), list):
        rep.err(where, '"ways" must be a list', 's ways')
        return
    nk, ns, nn, nh = len(doc['kinds']), len(doc['surf']), len(doc['names']), len(doc.get('hws') or [])
    for i, w in enumerate(doc['ways']):
        ww = f'{where} ways[{i}]'
        if not (isinstance(w, list) and len(w) >= 7 and all(is_int(q) for q in w[:6]) and isinstance(w[6], list)):
            rep.err(ww, 'a way is [kind, surf, width_dm, fl, name, ref, [x, y, z, ...], osm_way, s0_dm, lanes, hw, maxspeed, style]', 's way')
            continue
        if len(w) != S_WAY_LEN:
            rep.warn(ww, f'a way has {S_WAY_LEN} entries (index.json "fields.ways"), found {len(w)}', 's way length')
        if not (0 <= w[0] < nk and 0 <= w[1] < ns and 0 <= w[4] < nn and 0 <= w[5] < nn) or (len(w) > 10 and nh and not (is_int(w[10]) and 0 <= w[10] < nh)):
            rep.err(ww, 'kind, surface, name, ref or hw point outside their tables', 's way index')
        if not (3 <= w[2] <= 600):
            rep.err(ww, f'width {w[2]} dm is not plausible', 's way width')
        p = w[6]
        if not (len(p) >= 6 and len(p) % 3 == 0 and all(is_int(q) for q in p)):
            rep.err(ww, 'points must be whole decimetres [x, y, z, ...], at least two points', 's way pts')
            continue
        far = max(max(abs(q) for q in p[0::3]), max(abs(q) for q in p[1::3]))
        if far > S_REACH_DM:
            rep.err(ww, f'a point lies {far} dm from the tile centre - absolute model decimetres instead of tile-local ones?', 's way frame')
    areas = doc.get('areas')
    if areas is not None and not isinstance(areas, list):
        rep.err(where, '"areas" must be a list', 's areas')
        areas = []
    for i, a in enumerate(areas or []):
        ww = f'{where} areas[{i}]'
        if not (isinstance(a, list) and len(a) >= 8 and isinstance(a[7], list) and len(a[7]) >= 9 and len(a[7]) % 3 == 0 and all(is_int(q) for q in a[7])):
            rep.err(ww, 'an area is [type, surf, fl, name, osm, home, q, [x, y, z, ...], holes] with at least 3 points in whole decimetres', 's area')
            continue
        if max(max(abs(q) for q in a[7][0::3]), max(abs(q) for q in a[7][1::3])) > S_REACH_DM + 3000:
            rep.err(ww, 'an area lies far outside the tile - absolute model decimetres instead of tile-local ones?', 's area frame')
    rep.stat('s: ways', len(doc['ways']))
    rep.stat('s: areas', len(areas or []))


# ---------------------------------------------------------------- d: scenario numbers per building (JSON)
def check_d_tile(doc, key, rep, where):
    """{schema, product: 'd', key, d: {building id: {gf, bgf, da, ...}}} - the same numbers as the field d of a building record"""
    fr = check_envelope(doc, 'd', key, rep, where, need_o=False)
    if fr is None:
        return
    if not isinstance(doc.get('d'), dict):
        rep.err(where, '"d" must be an object {building id: numbers}', 'd')
        return
    for bid, d in doc['d'].items():
        check_d(d, rep, f'{where} {bid}')
    rep.stat('d: buildings', len(doc['d']))
