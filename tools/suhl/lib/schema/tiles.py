"""Products s (streets), m (street furniture), b (trees), d (scenario numbers): the tile files.

s, m and b are owned by suhl-strassen and suhl-gruen: this is version 0 of their layout, written from plan 2.4 and their briefs.
The validator is strict about the head and the frame and tolerant about the rest; the owners say what they need, then it is tightened.
"""
import struct

from .core import S, check_envelope, is_int, is_num, num_list, unknown_keys
from .g import QUALITY, check_d

# ---------------------------------------------------------------- b: trees (binary) - the layout suhl-gruen delivers (13.11.2026)
# n x 8 bytes, little endian, no head (the number of trees is the file size / 8):
#   uint16 x   centimetres east of the tile's west edge  (UTM 32N, true metres - not the model frame)
#   uint16 y   centimetres north of the tile's south edge
#   uint8  h   height of the tree in 0.25 m
#   uint8  r   crown radius in 0.1 m
#   uint8  kind    TREE_KINDS
#   uint8  flags   TREE_FLAGS
# The ground height is not in the file: the runtime asks its ground. UTM -> model with xf (suhllib.model_from_utm).
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


# ---------------------------------------------------------------- m: street furniture (JSON)
FURNITURE = ('laterne', 'ampel', 'schild', 'strassenschild', 'ortstafel', 'wegweiser', 'haltestelle', 'wartehalle', 'bank', 'ueberweg', 'poller',
             'leitpfosten', 'leitplanke', 'mast', 'papierkorb', 'briefkasten', 'ladenschild', 'brunnen', 'denkmal', 'fahne', 'fahrradstaender',
             'parkautomat', 'schranke', 'zaun', 'mauer', 'treppe', 'sonst')
M_KEYS = ('t', 'x', 'y', 'z', 'az', 'h', 'k', 'n', 'pts', 'osm', 'ref', 'q', 'w')


def check_m_tile(doc, key, rep, where):
    """{v, p: 'm', key, o, items: [{t, x, y, ...}]} - positions tile-local model metres"""
    fr = check_envelope(doc, 'm', key, rep, where)
    if fr is None:
        return
    unknown_keys(doc, ('v', 'p', 'key', 'o', 'items', 'made', 'src'), rep, where, 'm tile')
    if not isinstance(doc.get('items'), list):
        rep.err(where, '"items" must be the list of things', 'items')
        return
    for i, it in enumerate(doc['items']):
        w = f'{where} items[{i}]'
        if not isinstance(it, dict):
            rep.err(w, 'an item must be an object', 'm item')
            continue
        if it.get('t') not in FURNITURE:
            rep.err(w, f'"t" must be one of {FURNITURE}, found {it.get("t")!r} (a new kind: tell suhl-daten)', 'm t')
        if not (is_num(it.get('x')) and is_num(it.get('y'))):
            rep.err(w, '"x", "y" (tile-local model metres) are required', 'm xy')
        elif abs(it['x']) > 320 or abs(it['y']) > 320:
            rep.err(w, f'the item lies {max(abs(it["x"]), abs(it["y"])):.0f} m from the tile centre - absolute model metres?', 'm frame')
        if 'az' in it and not (is_num(it['az']) and 0 <= it['az'] < 360):
            rep.err(w, '"az" must be 0 <= az < 360 (degrees clockwise from the model +y axis)', 'm az')
        if 'q' in it and it['q'] not in QUALITY:
            rep.err(w, '"q" must be 0..3', 'm q')
        if 'pts' in it and not num_list(it['pts'], mult=2, minlen=4):
            rep.err(w, '"pts" must be a flat line [x0, y0, x1, y1, ...] in tile-local metres', 'm pts')
        unknown_keys(it, M_KEYS, rep, w, 'furniture item')
    rep.stat('m: items', len(doc['items']))


# ---------------------------------------------------------------- s: streets (JSON), the layout of fahrt/strassen.json cut into tiles
S_KEYS = ('v', 'p', 'key', 'o', 'made', 'src', 'unit', 'kinds', 'surf', 'names', 'ways', 'areas', 'water', 'rail', 'bridges', 'signs', 'style', 'metric')


def check_s_tile(doc, key, rep, where):
    """{v, p: 's', key, o, kinds, surf, names, ways: [[kind, surf, width dm, flags, name, ref, [x, y, z, ...]], ...], areas, water, rail}.
    As in fahrt/strassen.json (viz3/extra/fahrt/strecke.py) the points are ABSOLUTE model coordinates in whole decimetres
    (x east, y north, z = NHN - H0) - the road code of the region reads them as they are; "unit" says so: "dm"."""
    fr = check_envelope(doc, 's', key, rep, where)
    if fr is None:
        return
    unknown_keys(doc, S_KEYS, rep, where, 's tile')
    if doc.get('unit') != 'dm':
        rep.err(where, '"unit" must be "dm": points are absolute model coordinates in whole decimetres, as in fahrt/strassen.json', 's unit')
    for tab in ('kinds', 'surf', 'names'):
        if not (isinstance(doc.get(tab), list) and all(isinstance(q, str) for q in doc[tab])):
            rep.err(where, f'"{tab}" must be a list of strings (the table the rows of "ways" point into)', 's ' + tab)
            return
    if not isinstance(doc.get('ways'), list):
        rep.err(where, '"ways" must be a list', 's ways')
        return
    u = fr.utm
    for i, w in enumerate(doc['ways']):
        ww = f'{where} ways[{i}]'
        if not (isinstance(w, list) and len(w) >= 7 and all(is_int(q) for q in w[:6]) and isinstance(w[6], list)):
            rep.err(ww, 'a way is [kind, surface, width dm, flags, name, ref, [x, y, z, ...], ...]', 's way')
            continue
        if not (0 <= w[0] < len(doc['kinds']) and 0 <= w[1] < len(doc['surf']) and 0 <= w[4] < len(doc['names']) and 0 <= w[5] < len(doc['names'])):
            rep.err(ww, 'kind, surface, name or ref point outside their tables', 's way index')
        if not (5 <= w[2] <= 600):
            rep.err(ww, f'width {w[2]} dm is not plausible', 's way width')
        p = w[6]
        if not (len(p) >= 6 and len(p) % 3 == 0 and all(is_int(q) for q in p)):
            rep.err(ww, 'points must be whole decimetres [x, y, z, ...], at least two points', 's way pts')
            continue
        near = False
        for k in range(0, len(p), 3):
            e, n = S.utm_from_model(p[k] / 10, p[k + 1] / 10)
            if u[0] - 5 <= e <= u[2] + 5 and u[1] - 5 <= n <= u[3] + 5:
                near = True
                break
        if not near:
            rep.err(ww, f'no point of the way lies in the tile {fr.key} - tile-local instead of absolute decimetres, or the wrong tile?', 's way frame')
    for name in ('areas', 'water', 'rail', 'bridges', 'signs'):
        if name in doc and not isinstance(doc[name], list):
            rep.err(where, f'"{name}" must be a list', 's ' + name)
    for i, a in enumerate(doc.get('areas') or []):
        ww = f'{where} areas[{i}]'
        if not (isinstance(a, dict) and isinstance(a.get('k'), str) and isinstance(a.get('f'), list) and len(a['f']) >= 6 and len(a['f']) % 2 == 0
                and all(is_int(q) for q in a['f'])):
            rep.err(ww, 'an area is {k: kind, surf: index, f: [x, y, ...] in whole decimetres (absolute model), n: name index, z: dm}', 's area')
    rep.stat('s: ways', len(doc['ways']))


# ---------------------------------------------------------------- d: scenario numbers per building (JSON)
def check_d_tile(doc, key, rep, where):
    """{v, p: 'd', key, d: {building id: {fa, lv, gfa, ...}}} - the same numbers as the field d of a building record"""
    fr = check_envelope(doc, 'd', key, rep, where, need_o=False)
    if fr is None:
        return
    if not isinstance(doc.get('d'), dict):
        rep.err(where, '"d" must be an object {building id: numbers}', 'd')
        return
    for bid, d in doc['d'].items():
        check_d(d, rep, f'{where} {bid}')
    rep.stat('d: buildings', len(doc['d']))
