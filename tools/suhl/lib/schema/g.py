"""Product g: one record per building, in level-10 tiles suhl/g/v<N>/10/<x>/<y>.json (plan 2.3).

Schema 1, revision 1.1 (13.11.2026). The body of a record is that of revision 1.0, which suhl-gebaeude writes since its commit
4c9e9722: it starts from the layout viz3/src/gebaeude/gebaeude.js reads today (tools/welt-gebaeude/prep.py: f, k, e, h, F, rv, rt, rk,
rc, r, az, p, id, fl) and adds the fields of plan 2.3. Two names differ from the plan because today's readers already use them:
  h  = height (as today), so the holes of the footprint are 'fh' (the plan called the holes 'h' and the height 'hr');
  fl = 1 for a flat roof (as today), so the flags are 'fg' (the plan called the flags 'fl').
Revision 1.1 changes the head of the tile (schema, product instead of v, p) and gives the fields suhl-gebaeude had to keep private
(x_...) their places: fas + the tile table fat (facade parameters of the whole building), teil, zv, lvk, lm, kat, S[].hof, the tile
list tief; fg 32 = no longer standing (not drawn), 64 = in the cadastre only.

Frame: positions are tile-local model metres (x = model x - o[0], y = model y - o[1], o = the tile centre, suhllib.TileFrame),
heights true metres. One model metre is 1.0157 m: areas, lengths and angles for scenarios are given as numbers (computed in UTM by the
pipeline), never taken from this geometry.
"""
import re

from .core import S, check_envelope, is_int, is_num, num_list, ring_area, unknown_keys

# ---- code lists (the app shows German words for them; the numbers and words here are the contract)
KINDS = {0: 'house (dwelling, town house, block of flats, office: plastered, windows on every storey)', 1: 'hall or barn',
         2: 'outbuilding (shed, garage)', 3: 'church', 4: 'round tank', 5: 'tower, silo, chimney'}
ROOF_FORMS = {0: 'flat', 1: 'mono-pitch', 2: 'gable', 3: 'hip', 4: 'half-hip', 5: 'mansard', 6: 'pyramid / tent', 7: 'barrel / arched',
              8: 'shed (saw-tooth)', 9: 'free form (faces from LoD2)'}
ROOF_CLASSES = {0: 'clay tiles (red)', 1: 'fibre cement', 2: 'sheet metal', 3: 'slate', 4: 'flat: bitumen or gravel', 5: 'clay tiles dark',
                6: 'concrete tiles', 7: 'green roof', 8: 'glass'}
USES = ('wohnen', 'handel', 'buero', 'gastro', 'hotel', 'schule', 'kita', 'kirche', 'kultur', 'gesundheit', 'verwaltung', 'gewerbe',
        'industrie', 'lager', 'landwirtschaft', 'verkehr', 'garage', 'neben', 'sport', 'versorgung', 'leer', 'sonst')
ERAS = {0: 'unknown', 1: 'before 1918', 2: '1919-1948', 3: '1949-1990', 4: 'after 1990'}
FLAGS = {1: 'landmark (gets a model of its own, SUHL.detail)', 2: 'listed monument', 4: 'enterable', 8: 'vacant', 16: 'demolition planned',
         32: 'no longer standing: not in the cadastre any more (not drawn)', 64: 'in the cadastre only (ETHOS / LoD2 does not have it)',
         128: 'under construction or new'}
QUALITY = {0: 'rule or assumption', 1: 'derived from data (aerial image, surface model, tags)', 2: 'measured or official (LoD2, cadastre, a photo read by an agent)',
           3: 'checked by eye'}
SOURCES = ('ethos', 'lod2', 'alkis', 'osm', 'dop', 'dgm1', 'dom1', 'ndom1', 'cop30', 'foto', 'wissen', 'zensus', 'regel')
Q_FIELDS = ('f', 'h', 'e', 'z0', 'k', 'use', 'eg', 'era', 'yr', 'bt', 'lv', 'rk', 'rc', 'n', 'adr', 'S', 'A', 'd')
ADDONS = ('kamin', 'gaube', 'dachfenster', 'pv', 'aufbau', 'antenne')
SIDE_KEYS = ('st', 'sd', 'q', 'src', 'hof', 'mat', 'col', 'col2', 'lv', 'h0', 'hf', 'sock', 'win', 'eg', 'balk', 'gable', 'brand', 'sign')
FAS_KEYS = ('t', 'q', 'src', 'mat', 'col', 'col2', 'lv', 'h0', 'hf', 'sock', 'win', 'eg', 'balk')          # fas and the entries of fat
BALK = ('keine', 'balkone', 'loggien', 'franzoesisch')
SIDE_EG = ('nichts', 'laden', 'arkade', 'garagen', 'durchfahrt', 'eingang')
MATS = ('putz', 'platte', 'klinker', 'schiefer', 'fachwerk', 'sandstein', 'sichtbeton', 'glas', 'blech', 'holz')
D_KEYS = ('fa', 'lv', 'gfa', 'vol', 'rf', 'ro', 'ru', 'res', 'heat', 'pv', 'q', 'src')

# (key, 'R' required | 'O' optional, type, unit / frame, meaning) - the order of docs/features/suhl-daten.md
BUILDING_FIELDS = (
    ('id', 'R', 'string', '', 'the LoD2 / ETHOS / cadastre id (e.g. DETHL51P000004BA), the same in every data version; a part of a split building '
     '<id>_<n>; a building only OSM knows: way/<n> or relation/<n>; a scenario building: neu-<...>. Unique in the product.'),
    ('f', 'R', '[x0, y0, x1, y1, ...]', 'tile-local m', 'footprint, outer ring, counter-clockwise, not closed, at least 3 points'),
    ('fh', 'O', '[[x0, y0, ...], ...]', 'tile-local m', 'holes of the footprint (courtyards), each ring clockwise'),
    ('k', 'R', 'int', 'KINDS', 'kind of building: 0 house, 1 hall or barn, 2 outbuilding, 3 church, 4 round tank, 5 tower'),
    ('h', 'R', 'number', 'm', 'height from the foot to the highest point'),
    ('e', 'R', 'number', 'm', 'eave height above the foot (0 <= e <= h)'),
    ('z0', 'O', 'number', 'm, model z = NHN - H0', 'height of the foot; absent: the runtime sets the building on its ground'),
    ('r', 'R', 'int', 'ROOF_FORMS', 'roof form: 0 flat, 1 mono-pitch, 2 gable, 3 hip, 4 half-hip, 5 mansard, 6 pyramid, 7 barrel, 8 shed, 9 free'),
    ('az', 'O', 'number', 'degrees, model frame', 'direction of the ridge, clockwise from the model +y axis, 0 <= az < 180 (true north = az - 3.05 at Suhl)'),
    ('p', 'O', 'number', 'degrees', 'roof pitch (true, 0 = flat)'),
    ('rq', 'R', 'int', 'QUALITY', 'how the roof (r, az, p, rv, rt, R) was found: 0 rule from footprint and height, 1 with data (aerial image, tags), '
     '2 LoD2, 3 checked'),
    ('rk', 'R', 'int', 'ROOF_CLASSES', 'roof covering of the whole building (the most frequent of its faces)'),
    ('rc', 'R', '[r, g, b]', 'sRGB 0..1', 'roof colour'),
    ('rv', 'R', '[x, y, z, ...]', 'tile-local m, z above the foot', 'roof mesh: vertices'),
    ('rt', 'R', '[i, j, k, ...]', 'indices into rv', 'roof mesh: triangles, counter-clockwise seen from above'),
    ('R', 'O', '[{...}, ...]', '', 'roof faces (planes): {vi: [first vertex, count] in rv = the outline in order, ti: [first triangle, count] in rt, '
     'c: ROOF_CLASSES, col: [r, g, b], sl: slope in degrees, az: downhill direction in degrees from TRUE north, a: area in m2 (true, on the slope, '
     'computed in UTM), ap: area in plan m2, at: [u0, v0, u1, v1] cut-out in the roof atlas (optional)}'),
    ('A', 'O', '[{...}, ...]', '', 'things on the roof: {t: kamin | gaube | dachfenster | pv | aufbau | antenne, x, y (tile-local m), z (m above the foot), '
     'w, d, h (m), az (degrees, model frame), f: index of the roof face, q: QUALITY}'),
    ('F', 'R', '[[10 numbers], ...]', 'tile-local m, heights above the foot', 'walls: [ax, ay, bx, by, top at a, apex position u (0..1) along the wall, '
     'top at the apex, top at b, flags (1 = party wall, no windows), metres to the nearest street (99 = none)]. The apex position is a FRACTION '
     'of the wall length (today\'s gebaeude.js uses metres: the runtime converts)'),
    ('S', 'O', '[{...} | null, ...]', '', 'sides: one entry per row of F, same order - only what a side has of its own: {st: street name, sd: metres '
     'to it, hof: 1 (faces a courtyard), eg: nichts | laden | arkade | garagen | durchfahrt | eingang, sign: [names], q: QUALITY of the facade '
     'parameters, src: [photo ids], and any facade parameter that differs from fas: mat, col, col2, lv, h0, hf, sock, win, balk, gable, brand}'),
    ('fas', 'O', '{...}', '', 'facade parameters of the whole building (plan 4b): {t: index into the tile\'s table fat, col: [r, g, b], q: QUALITY, '
     'lv: storeys when the building has no lv} - merged over fat[t] = {mat, col2, sock, win, balk}; storey height hf = (e - sock) / lv, ground floor '
     'h0 = hf unless given; a side of S overrides single values'),
    ('fl', 'O', '0 | 1', '', '1 = flat roof (as today; the same as r = 0)'),
    ('lv', 'O', 'int', '', 'storeys above ground'),
    ('lvk', 'O', 'int', '', 'the storeys the cadastre names when they do not fit under the measured height of this body (lv is then an estimate)'),
    ('use', 'O', 'string', 'USES', 'main use'),
    ('eg', 'O', 'string', 'USES', 'use of the ground floor when it differs (a shop under flats)'),
    ('fkt', 'O', 'string', '', 'the function in the words of the cadastre (ALKIS funktion)'),
    ('era', 'O', 'int', 'ERAS', 'age class: 0 unknown, 1 before 1918, 2 1919-1948, 3 1949-1990, 4 after 1990'),
    ('yr', 'O', 'int', 'year', 'year of construction when known'),
    ('bt', 'O', 'string', '', 'building type in one word, e.g. wbs70, zeilenbau, punkthochhaus, fachwerk, gruenderzeit, efh, reihenhaus'),
    ('n', 'O', 'string', '', 'name'),
    ('adr', 'O', 'string', '', 'address: "<street> <number>" (several joined with "; ")'),
    ('osm', 'O', 'string', '', 'the OSM object it was matched with (overlap > 50 %): way/<n> or relation/<n>'),
    ('fg', 'O', 'int', 'FLAGS, bits', 'flags: 1 landmark, 2 monument, 4 enterable, 8 vacant, 16 demolition planned, 32 no longer standing (not drawn), '
     '64 in the cadastre only, 128 new or under construction'),
    ('lm', 'O', 'string', '', 'the number of the landmark in docs/plans/suhl/wahrzeichen.md (e.g. "Z10")'),
    ('kat', 'O', '0 | 1', '', 'the match with the cadastre when it is not by the same id: 1 = joined by position, 0 = not in the cadastre'),
    ('teil', 'O', 'string', '', 'the id of the bigger building a small part (stair tower, bay, balcony stack, annex) is attached to'),
    ('zv', 'O', '[m, ...]', 'm above z0', 'the ground above z0 at every corner of f, then of the holes fh'),
    ('d', 'O', '{...}', '', 'scenario numbers (plan 6.3), true metres computed in UTM: {fa: footprint m2, lv: storeys, gfa: gross floor area m2, '
     'vol: m3, rf: roof area m2, ro: {N, O, S, W, flach: m2}, ru: usable roof m2, res: residents, heat: {k, kwh}, pv: kWp today, q: {...}}; '
     'may also come as the product d'),
    ('q', 'R', '{field: 0..3}', 'QUALITY', 'quality of every estimated field: keys f, h, e, z0, k, use, eg, era, yr, bt, lv, rk, rc, n, adr, S, A, d; '
     'a field that is absent here counts as 0 (rule or assumption)'),
    ('src', 'O', '{field: source}', 'SOURCES', 'where a field comes from: ethos, lod2, alkis, osm, dop, dgm1, dom1, ndom1, cop30, foto, wissen, zensus, regel'),
)
_KNOWN = {f[0] for f in BUILDING_FIELDS}
_REQUIRED = [f[0] for f in BUILDING_FIELDS if f[1] == 'R']
_ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:/\-]{2,63}$')
_OSM = re.compile(r'^(way|relation|node)/[0-9]+$')
REACH = 700.0          # a footprint may reach this far from the tile centre (half diagonal 279 model m + a very long building)


def _ring(f, rep, where, name, ccw=True):
    if not num_list(f, mult=2, minlen=6):
        rep.err(where, f'"{name}" must be a flat list [x0, y0, x1, y1, ...] with at least 3 points', name)
        return None
    if f[0] == f[-2] and f[1] == f[-1]:
        rep.err(where, f'"{name}": the ring is closed - drop the repeated first point', name + ' closed')
    a = ring_area(f)
    if abs(a) < 0.5:
        rep.err(where, f'"{name}": the ring has no area ({a:.2f} m2)', name + ' area')
    elif (a > 0) != ccw:
        rep.err(where, f'"{name}": the ring must run {"counter-" if ccw else ""}clockwise', name + ' orientation')
    if max(abs(v) for v in f) > REACH:
        rep.err(where, f'"{name}": a point lies {max(abs(v) for v in f):.0f} m from the tile centre - absolute model metres instead of '
                       f'tile-local ones?', name + ' frame')
    return a


def check_fas(fa, rep, where, what, nfat=None):
    """facade parameters: the field fas of a building, or one entry of the tile table fat (nfat = None)"""
    if not isinstance(fa, dict):
        rep.err(where, f'"{what}" must be an object', what)
        return
    unknown_keys(fa, FAS_KEYS, rep, where, what)
    if nfat is not None and 't' in fa and not (is_int(fa['t']) and 0 <= fa['t'] < nfat):
        rep.err(where, f'"{what}.t" must be an index into the tile\'s table "fat" ({nfat} entries), found {fa["t"]!r}', 'fas t')
    if 'mat' in fa and fa['mat'] not in MATS:
        rep.err(where, f'"{what}.mat" must be one of {MATS}, found {fa["mat"]!r}', 'fas mat')
    for key in ('col', 'col2'):
        if key in fa and not (num_list(fa[key], n=3) and all(0 <= q <= 1 for q in fa[key])):
            rep.err(where, f'"{what}.{key}" must be [r, g, b] in sRGB 0..1', 'fas col')
    if 'lv' in fa and not (is_int(fa['lv']) and 1 <= fa['lv'] <= 60):
        rep.err(where, f'"{what}.lv" (storeys) must be an integer 1..60', 'fas lv')
    for key in ('h0', 'hf', 'sock'):
        if key in fa and not (is_num(fa[key]) and 0 <= fa[key] <= 30):
            rep.err(where, f'"{what}.{key}" must be metres, found {fa[key]!r}', 'fas ' + key)
    if 'win' in fa and fa['win'] is not None and not num_list(fa['win'], minlen=4):
        rep.err(where, f'"{what}.win" must be a list of numbers [axis spacing, width, height, sill, kind, ...] or null', 'fas win')
    if 'balk' in fa and fa['balk'] not in BALK:
        rep.err(where, f'"{what}.balk" must be one of {BALK}, found {fa["balk"]!r}', 'fas balk')
    if 'q' in fa and (fa['q'] not in QUALITY or isinstance(fa['q'], bool)):
        rep.err(where, f'"{what}.q" must be 0..3', 'fas q')


def _holes_area(b):
    """the area of the holes of a footprint in model m2 (0 when fh is not a list of rings)"""
    h = b.get('fh')
    return sum(abs(ring_area(r)) for r in h if num_list(r, mult=2, minlen=6)) if isinstance(h, list) else 0.0


def check_building(b, fr, rep, where, tile=None):
    """one building record; fr = suhllib.TileFrame of its tile; tile = the tile document (for the table fat)"""
    if not isinstance(b, dict):
        rep.err(where, 'a building must be a JSON object')
        return
    for k in _REQUIRED:
        if k not in b:
            rep.err(where, f'required field "{k}" is missing', 'missing ' + k)
    unknown_keys(b, _KNOWN, rep, where, 'building')
    bid = b.get('id')
    if 'id' in b:
        if not isinstance(bid, str) or not _ID.match(bid):
            rep.err(where, f'"id" {bid!r} is not an id (3..64 characters A-Z a-z 0-9 _ . : / -)', 'id')
        elif bid in rep.ids:
            rep.err(where, f'id {bid!r} occurs twice (also in {rep.ids[bid]}) - a building belongs to exactly one tile', 'id twice')
        else:
            rep.ids[bid] = fr.key
    area = None
    if 'f' in b:
        area = _ring(b['f'], rep, where, 'f')
        if area is not None:
            n = len(b['f']) // 2
            cx, cy = sum(b['f'][0::2]) / n, sum(b['f'][1::2]) / n
            e, nn = fr.to_utm(cx, cy)
            u = fr.utm
            if not (u[0] - 150 <= e <= u[2] + 150 and u[1] - 150 <= nn <= u[3] + 150):
                rep.err(where, f'the footprint lies outside its tile {fr.key} (its middle is at UTM {e:.0f}, {nn:.0f})', 'outside tile')
            elif not fr.holds(e, nn):
                rep.stat('g: footprint middle in the neighbour tile')
    if 'fh' in b:
        if not isinstance(b['fh'], list):
            rep.err(where, '"fh" must be a list of rings', 'fh')
        else:
            for r in b['fh']:
                _ring(r, rep, where, 'fh', ccw=False)
    for key, table in (('k', KINDS), ('r', ROOF_FORMS), ('rk', ROOF_CLASSES), ('rq', QUALITY), ('era', ERAS)):
        if key in b and (not is_int(b[key]) or b[key] not in table):
            hint = ' (prep.py writes rq: "foto" - that is rq: 1 here)' if key == 'rq' and b[key] == 'foto' else ''
            rep.err(where, f'"{key}" must be one of {sorted(table)}, found {b[key]!r}{hint}', key)
    h, e = b.get('h'), b.get('e')
    if 'h' in b and not (is_num(h) and 0.5 <= h <= 250):
        rep.err(where, f'"h" must be a height in metres between 0.5 and 250, found {h!r}', 'h')
        h = None
    if 'e' in b and not (is_num(e) and 0 <= e <= 250):
        rep.err(where, f'"e" must be an eave height in metres, found {e!r}', 'e')
        e = None
    if is_num(h) and is_num(e) and e > h + 0.011:
        rep.err(where, f'the eave ({e}) lies above the highest point ({h})', 'e > h')
    if 'z0' in b and not (is_num(b['z0']) and -250 <= b['z0'] <= 700):
        rep.err(where, f'"z0" must be the foot height as model z = NHN - {S.H0} (Suhl: about 0 to 610), found {b["z0"]!r}', 'z0')
    if 'az' in b and not (is_num(b['az']) and 0 <= b['az'] < 360):
        rep.err(where, f'"az" must be 0 <= az < 360 degrees, found {b["az"]!r}', 'az')
    if 'p' in b and not (is_num(b['p']) and 0 <= b['p'] <= 85):
        rep.err(where, f'"p" must be a pitch of 0..85 degrees, found {b["p"]!r}', 'p')
    if is_int(b.get('r')) and b['r'] in (1, 2, 3, 4, 5) and b.get('rq') in (0, 1) and ('az' not in b or 'p' not in b):
        rep.warn(where, 'a pitched estimated roof should carry "az" and "p"', 'az/p missing')
    if 'rc' in b and not (num_list(b['rc'], n=3) and all(0 <= v <= 1 for v in b['rc'])):
        rep.err(where, f'"rc" must be [r, g, b] in sRGB 0..1, found {b["rc"]!r}', 'rc')
    nv = nt = 0
    if 'rv' in b:
        if not num_list(b['rv'], mult=3, minlen=9):
            rep.err(where, '"rv" must be a flat list [x, y, z, ...] with at least 3 vertices', 'rv')
        else:
            nv = len(b['rv']) // 3
            if max(max(abs(v) for v in b['rv'][0::3]), max(abs(v) for v in b['rv'][1::3])) > REACH:
                rep.err(where, '"rv": a vertex lies too far from the tile centre - absolute model metres?', 'rv frame')
            zs = b['rv'][2::3]
            if is_num(h) and (max(zs) > h + 1.0 or min(zs) < -0.5):
                rep.warn(where, f'"rv": roof heights {min(zs):.1f}..{max(zs):.1f} m do not fit h = {h} (z counts from the foot)', 'rv z')
    if 'rt' in b:
        if not (isinstance(b['rt'], list) and len(b['rt']) >= 3 and len(b['rt']) % 3 == 0 and all(is_int(v) for v in b['rt'])):
            rep.err(where, '"rt" must be a flat list of vertex indices, three per triangle', 'rt')
        else:
            nt = len(b['rt']) // 3
            if nv and (min(b['rt']) < 0 or max(b['rt']) >= nv):
                rep.err(where, f'"rt" points outside "rv" (indices {min(b["rt"])}..{max(b["rt"])}, {nv} vertices)', 'rt range')
    if 'F' in b:
        if not isinstance(b['F'], list) or not b['F']:
            rep.err(where, '"F" must be a list of walls', 'F')
        else:
            for row in b['F']:
                if not num_list(row, n=10):
                    rep.err(where, '"F": every wall has 10 numbers [ax, ay, bx, by, top a, apex u, apex top, top b, flags, street metres]', 'F row')
                    break
                if max(abs(v) for v in row[:4]) > REACH:
                    rep.err(where, '"F": a wall lies too far from the tile centre - absolute model metres?', 'F frame')
                    break
                if is_num(h) and max(row[4], row[6], row[7]) > h + 1.0:
                    rep.warn(where, f'"F": a wall top ({max(row[4], row[6], row[7])}) lies above h = {h}', 'F top')
                    break
    if 'R' in b:
        if not isinstance(b['R'], list):
            rep.err(where, '"R" must be a list of roof faces', 'R')
        else:
            for i, fc in enumerate(b['R']):
                w = f'{where} R[{i}]'
                if not isinstance(fc, dict):
                    rep.err(w, 'a roof face must be an object', 'R item')
                    continue
                unknown_keys(fc, ('vi', 'ti', 'c', 'col', 'sl', 'az', 'a', 'ap', 'at'), rep, w, 'roof face')
                for key, n in (('vi', nv), ('ti', nt)):
                    v = fc.get(key)
                    if not (isinstance(v, list) and len(v) == 2 and all(is_int(q) for q in v) and v[0] >= 0 and v[1] >= (3 if key == 'vi' else 1)
                            and v[0] + v[1] <= n):
                        rep.err(w, f'"{key}" must be [first, count] inside {"rv" if key == "vi" else "rt"} ({n} entries), found {v!r}', 'R ' + key)
                if not (is_int(fc.get('c')) and fc['c'] in ROOF_CLASSES):
                    rep.err(w, f'"c" must be a roof class {sorted(ROOF_CLASSES)}, found {fc.get("c")!r}', 'R c')
                if 'col' in fc and not (num_list(fc['col'], n=3) and all(0 <= q <= 1 for q in fc['col'])):
                    rep.err(w, '"col" must be [r, g, b] in sRGB 0..1', 'R col')
                if not (is_num(fc.get('sl')) and 0 <= fc['sl'] <= 90):
                    rep.err(w, f'"sl" must be the slope in degrees 0..90, found {fc.get("sl")!r}', 'R sl')
                if not (is_num(fc.get('az')) and 0 <= fc['az'] < 360) and not (is_num(fc.get('sl')) and fc['sl'] < 1 and 'az' not in fc):
                    rep.err(w, f'"az" must be the downhill direction from true north, 0 <= az < 360 (may be absent on a flat face), found {fc.get("az")!r}', 'R az')
                if not (is_num(fc.get('a')) and fc['a'] > 0):
                    rep.err(w, f'"a" must be the true area in m2 (> 0), found {fc.get("a")!r}', 'R a')
                if 'ap' in fc and not (is_num(fc['ap']) and 0 < fc['ap'] <= (fc.get('a') or 1e9) + 0.5):
                    rep.err(w, '"ap" must be the plan area in m2, at most the true area', 'R ap')
                if 'at' in fc and not (num_list(fc['at'], n=4) and all(0 <= q <= 1 for q in fc['at'])):
                    rep.err(w, '"at" must be [u0, v0, u1, v1] in 0..1', 'R at')
            if area and all(isinstance(fc, dict) and is_num(fc.get('ap')) for fc in b['R']) and b['R']:
                ap = sum(fc['ap'] for fc in b['R'])
                true_fp = (abs(area) - _holes_area(b)) * S.MODEL_SCALE ** 2
                if not 0.85 * true_fp - 3 <= ap <= 1.6 * true_fp + 20:
                    rep.warn(where, f'the plan areas of the roof faces ({ap:.0f} m2) do not fit the footprint ({true_fp:.0f} m2 in UTM)', 'R sum')
    if 'A' in b:
        if not isinstance(b['A'], list):
            rep.err(where, '"A" must be a list', 'A')
        else:
            for i, a in enumerate(b['A']):
                w = f'{where} A[{i}]'
                if not isinstance(a, dict) or a.get('t') not in ADDONS:
                    rep.err(w, f'"t" must be one of {ADDONS}', 'A t')
                    continue
                unknown_keys(a, ('t', 'x', 'y', 'z', 'w', 'd', 'h', 'az', 'f', 'q', 'kwp'), rep, w, 'roof add-on')
                if not all(is_num(a.get(q)) for q in ('x', 'y')):
                    rep.err(w, '"x", "y" (tile-local metres) are required', 'A xy')
                if 'q' in a and a['q'] not in QUALITY:
                    rep.err(w, '"q" must be 0..3', 'A q')
    if 'S' in b:
        if not isinstance(b['S'], list) or (isinstance(b.get('F'), list) and len(b['S']) != len(b['F'])):
            rep.err(where, '"S" must have one entry (object or null) per row of "F", in the same order', 'S length')
        else:
            for i, s in enumerate(b['S']):
                if s is None:
                    continue
                w = f'{where} S[{i}]'
                if not isinstance(s, dict):
                    rep.err(w, 'a side must be an object or null', 'S item')
                    continue
                unknown_keys(s, SIDE_KEYS, rep, w, 'side')
                if s.get('q') not in QUALITY:
                    rep.err(w, f'"q" (quality of the facade parameters, 0..3) is required, found {s.get("q")!r}', 'S q')
                if 'mat' in s and s['mat'] not in MATS:
                    rep.err(w, f'"mat" must be one of {MATS}, found {s["mat"]!r}', 'S mat')
                for key in ('col', 'col2'):
                    if key in s and not (num_list(s[key], n=3) and all(0 <= q <= 1 for q in s[key])):
                        rep.err(w, f'"{key}" must be [r, g, b] in sRGB 0..1', 'S col')
                if 'lv' in s and not (is_int(s['lv']) and 1 <= s['lv'] <= 60):
                    rep.err(w, '"lv" (storeys) must be an integer 1..60', 'S lv')
                if 'st' in s and not isinstance(s['st'], str):
                    rep.err(w, '"st" must be the street name', 'S st')
                if 'eg' in s and s['eg'] not in SIDE_EG:
                    rep.err(w, f'"eg" must be one of {SIDE_EG}, found {s["eg"]!r}', 'S eg')
                if 'sign' in s and not (isinstance(s['sign'], list) and all(isinstance(q, str) and q for q in s['sign'])):
                    rep.err(w, '"sign" must be a list of names', 'S sign')
                if 'hof' in s and s['hof'] != 1:
                    rep.err(w, '"hof" is 1 on a side that faces a courtyard (leave it out otherwise)', 'S hof')
                if 'balk' in s and s['balk'] not in BALK:
                    rep.err(w, f'"balk" must be one of {BALK}, found {s["balk"]!r}', 'S balk')
                if 'src' in s and not (isinstance(s['src'], list) and all(isinstance(q, str) for q in s['src'])):
                    rep.err(w, '"src" must be a list of photo ids', 'S src')
                if s.get('q', 0) >= 2 and not s.get('src'):
                    rep.warn(w, 'quality 2 or 3 without a photo id in "src"', 'S q src')
    if 'fl' in b and b['fl'] not in (0, 1):
        rep.err(where, '"fl" is 1 for a flat roof (the flags of plan 2.3 are called "fg")', 'fl')
    elif b.get('fl') == 1 and is_int(b.get('r')) and b['r'] != 0:
        rep.err(where, '"fl": 1 (flat roof) with a roof form r != 0', 'fl r')
    if 'lv' in b and not (is_int(b['lv']) and 1 <= b['lv'] <= 60):
        rep.err(where, f'"lv" (storeys above ground) must be an integer 1..60, found {b["lv"]!r}', 'lv')
    elif is_int(b.get('lv')) and is_num(e) and b.get('k') == 0 and not (1.9 * b['lv'] <= max(e, 2.0) + 1.0 and e <= 6.5 * b['lv'] + 3.0):
        rep.warn(where, f'{b["lv"]} storeys do not fit an eave of {e} m', 'lv e')
    for key in ('use', 'eg'):
        if key in b and b[key] not in USES:
            rep.err(where, f'"{key}" must be one of {USES}, found {b[key]!r}', key)
    for key in ('fkt', 'bt', 'n', 'adr'):
        if key in b and not (isinstance(b[key], str) and b[key].strip()):
            rep.err(where, f'"{key}" must be a non-empty string (leave the field out when unknown)', key)
    if 'yr' in b and not (is_int(b['yr']) and 1000 <= b['yr'] <= 2100):
        rep.err(where, f'"yr" must be a year, found {b["yr"]!r}', 'yr')
    if 'osm' in b and not (isinstance(b['osm'], str) and _OSM.match(b['osm'])):
        rep.err(where, f'"osm" must be way/<n> or relation/<n>, found {b["osm"]!r}', 'osm')
    if 'fg' in b and not (is_int(b['fg']) and 0 <= b['fg'] < 256):
        rep.err(where, f'"fg" must be a sum of the flag bits {sorted(FLAGS)}, found {b["fg"]!r}', 'fg')
    if 'q' in b:
        if not isinstance(b['q'], dict):
            rep.err(where, '"q" must be an object {field: 0..3}', 'q')
        else:
            for k, v in b['q'].items():
                if k not in Q_FIELDS:
                    rep.warn(where, f'"q": no quality is defined for the field {k!r} (the roof has "rq")', 'q key ' + k)
                if v not in QUALITY:
                    rep.err(where, f'"q.{k}" must be 0..3, found {v!r}', 'q value')
    if 'src' in b:
        if not isinstance(b['src'], dict):
            rep.err(where, '"src" must be an object {field: source}', 'src')
        else:
            for k, v in b['src'].items():
                if v not in SOURCES:
                    rep.err(where, f'"src.{k}" must be one of {SOURCES}, found {v!r}', 'src value')
    if 'd' in b:
        check_d(b['d'], rep, where)
    if 'fas' in b:
        check_fas(b['fas'], rep, where, 'fas', nfat=len((tile or {}).get('fat') or []))
    for key in ('lm', 'teil'):
        if key in b and not (isinstance(b[key], str) and b[key].strip()):
            rep.err(where, f'"{key}" must be a non-empty string', key)
    if 'kat' in b and b['kat'] not in (0, 1):
        rep.err(where, f'"kat" must be 1 (joined to the cadastre by position) or 0 (not in the cadastre), found {b["kat"]!r}', 'kat')
    if 'lvk' in b and not (is_int(b['lvk']) and 1 <= b['lvk'] <= 60):
        rep.err(where, f'"lvk" (storeys the cadastre names) must be an integer 1..60, found {b["lvk"]!r}', 'lvk')
    if 'zv' in b:
        nring = (len(b['f']) // 2 if num_list(b.get('f'), mult=2) else 0) + sum(len(r) // 2 for r in (b.get('fh') or []) if num_list(r, mult=2)) \
            if isinstance(b.get('fh') or [], list) else 0
        if not (num_list(b['zv']) and len(b['zv']) == nring and min(b['zv'], default=0) >= -0.01):
            rep.err(where, f'"zv" must give the ground above z0 (>= 0) at each of the {nring} corners of f and the holes fh', 'zv')
        if 'z0' not in b:
            rep.err(where, '"zv" counts from "z0", which is missing', 'zv z0')
    if is_int(b.get('fg')) and b['fg'] & 32:
        rep.stat('g: buildings no longer standing (fg 32, not drawn)')
    if 'z0' not in b:
        rep.stat('g: buildings without z0 (the runtime sets them on its ground)')
    rep.stat('g: buildings')


def check_d(d, rep, where):
    """the scenario numbers of one building (inline field d, or an entry of the product d)"""
    if not isinstance(d, dict):
        rep.err(where, '"d" must be an object', 'd')
        return
    unknown_keys(d, D_KEYS, rep, where, 'scenario numbers')
    for key, lo, hi in (('fa', 1, 2e5), ('gfa', 1, 2e6), ('vol', 1, 2e7), ('rf', 1, 4e5), ('ru', 0, 4e5), ('res', 0, 5000), ('pv', 0, 1e4)):
        if key in d and not (is_num(d[key]) and lo <= d[key] <= hi):
            rep.err(where, f'"d.{key}" out of range {lo}..{hi:g}: {d[key]!r}', 'd ' + key)
    if 'lv' in d and not (is_int(d['lv']) and 1 <= d['lv'] <= 60):
        rep.err(where, '"d.lv" must be an integer 1..60', 'd lv')
    if 'ro' in d and not (isinstance(d['ro'], dict) and all(k in ('N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW', 'flach') and is_num(v) and v >= 0
                                                           for k, v in d['ro'].items())):
        rep.err(where, '"d.ro" must be {N | NO | O | SO | S | SW | W | NW | flach: m2}', 'd ro')
    if 'q' in d and not (isinstance(d['q'], dict) and all(v in QUALITY for v in d['q'].values())):
        rep.err(where, '"d.q" must be {field: 0..3}', 'd q')


def check_g_tile(doc, key, rep, where):
    """a g tile: {schema, product: 'g', key, o, b: [building, ...]} plus made, n, src ({field: source} for the whole tile), fat (the
    table of facade parameters fas.t points into), tief (underground car parks: [{id, f, fkt, adr, fa}], not drawn), dgm, lod2"""
    fr = check_envelope(doc, 'g', key, rep, where)
    if fr is None:
        return
    if not isinstance(doc.get('b'), list):
        rep.err(where, '"b" must be the list of buildings', 'b')
        return
    if not doc['b']:
        rep.warn(where, 'a tile without buildings should not be written (the index lists the tiles that exist)', 'empty tile')
    if 'n' in doc and doc['n'] != len(doc['b']):
        rep.err(where, f'"n" = {doc["n"]!r} but the tile holds {len(doc["b"])} buildings', 'n')
    for key2 in ('dgm', 'lod2'):
        if key2 in doc and doc[key2] not in (0, 1):
            rep.err(where, f'"{key2}" must be 0 or 1', key2)
    if 'src' in doc and not (isinstance(doc['src'], dict) and all(v in SOURCES for v in doc['src'].values())):
        rep.err(where, f'"src" must be {{field: source}} with sources of {SOURCES}', 'tile src')
    if 'fat' in doc:
        if not isinstance(doc['fat'], list):
            rep.err(where, '"fat" must be the list of facade parameter sets', 'fat')
        else:
            for i, fa in enumerate(doc['fat']):
                check_fas(fa, rep, f'{where} fat[{i}]', 'fat entry')
    if 'tief' in doc:
        if not (isinstance(doc['tief'], list) and all(isinstance(t, dict) and isinstance(t.get('id'), str) and num_list(t.get('f'), mult=2, minlen=6)
                                                      for t in doc['tief'])):
            rep.err(where, '"tief" must be a list of underground car parks {id, f: [x0, y0, ...], fkt, adr, fa}', 'tief')
        else:
            rep.stat('g: underground car parks (tief, not drawn)', len(doc['tief']))
    for k in doc:
        if k.startswith('x_'):
            rep.stat('g: private tile fields (x_...)')
    for i, b in enumerate(doc['b']):
        bid = b.get('id') if isinstance(b, dict) else None
        w = f'{where} b[{i}] {bid if isinstance(bid, str) else ""}'.rstrip()
        try:
            check_building(b, fr, rep, w, doc)
        except Exception as ex:           # a record so far from the layout that a check itself fails: that is an error of the record
            rep.err(w, f'the record cannot be checked ({type(ex).__name__}: {ex}) - a field has an unexpected type', 'record unreadable')
