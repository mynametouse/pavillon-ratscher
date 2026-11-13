"""The product d - scenario numbers (package S2-9, plan 6.3): tiles {schema, product: 'd', key, o, made, n, d: {building id: record}} on the
same level-10 tiles as g, and viertel.json (the quarters: raster, outlines, sums, official numbers, the list of assumptions).

All areas are true square metres computed in UTM, directions are degrees from geographic north, heights true metres. Numbers that are
not measured are estimates by a rule and say so in q (0 rule or assumption, 1 derived from data, 2 measured or official, 3 checked).
Written by tools/suhl/daten/zahlen.py; the contract for people is docs/features/suhl-daten.md, section 13.
"""
import base64

from .core import is_num, is_int, unknown_keys, check_envelope
from .g import USES, ERAS, KINDS, ROOF_CLASSES, QUALITY

R_COLS = ('a', 'ap', 'az', 'sl', 'c', 'us', 'kwp', 'ir')
DIRECTIONS = ('flach', 'N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW')
# how a building is heated (census 2022, energy carrier of the heating) - a model estimate per building, a count per quarter
HEAT_KINDS = {'fern': 'district heating', 'gas': 'gas', 'oel': 'heating oil', 'holz': 'wood, wood pellets', 'bio': 'biomass, biogas',
              'wp': 'solar or geothermal energy, heat pumps', 'strom': 'electricity (without heat pump)', 'kohle': 'coal',
              'kein': 'no energy carrier (no heating)', 'unbekannt': 'not known'}
QUARTER_KINDS = ('viertel', 'ortsteil')

# (key, 'R' required | 'O' optional, type, unit, meaning) - the order of docs/features/suhl-daten.md, section 13
D_FIELDS = (
    ('vt', 'R', 'int', 'number of the quarter', 'the quarter (statistical district) the building lies in: nr of viertel.json, 1..17; 0 = outside the municipality'),
    ('m', 'R', '[x, y]', 'tile-local m', 'middle of the footprint in the frame of g (model metres relative to the tile centre o)'),
    ('use', 'R', 'word', 'USES', 'use of the building, as in g'),
    ('era', 'R', 'int', 'ERAS', 'era of construction, as in g (0 unknown, 1 up to 1918, 2 1919-1948, 3 1949-1990, 4 from 1991); its quality is q.era'),
    ('k', 'R', 'int', 'KINDS', 'kind of building, as in g'),
    ('bt', 'O', 'word', '', 'type of building, as in g (efh, block, platte, halle ...)'),
    ('fa', 'R', 'number', 'm2', 'footprint (outer ring minus courtyards), true area'),
    ('lv', 'R', 'int', '', 'storeys above ground: from the cadastre (q.lv 2), estimated by g (1) or by the rule eave height / 2.9 m (0)'),
    ('gfa', 'R', 'number', 'm2', 'gross floor area above ground = fa x lv (no basement, no attic)'),
    ('dg', 'O', 'number', 'm2', 'attic floor under a pitched roof, by rule (not part of gfa)'),
    ('h', 'R', 'number', 'm', 'height from the foot to the highest point, as in g'),
    ('e', 'R', 'number', 'm', 'eave height above the foot, as in g'),
    ('vol', 'R', 'number', 'm3', 'volume between the foot plane and the roof (q.vol 0: by rule, the roof mesh does not cover the footprint)'),
    ('rf', 'R', 'number', 'm2', 'roof area, true (sloped) area without overhang = sum of R[][0]'),
    ('R', 'R', '[[a, ap, az, sl, c, us, kwp, ir], ...]', 'm2, m2, degrees, degrees, ROOF_CLASSES, m2, kWp, percent',
     'the roof planes in the order of the field R of g (same numbers): true area, plan area, direction the plane faces in degrees from '
     'geographic north (180 = south; null = flat), slope, covering, area that can carry modules (rule), their power, yearly irradiation '
     'in percent of the best plane'),
    ('ru', 'O', 'number', 'm2', 'module area on the planes that are suitable for solar power (ir at least 75), sum of their us'),
    ('pv', 'O', 'number', 'kWp', 'solar POTENTIAL on those planes (what could be built - what is on the roof today is not known)'),
    ('pe', 'O', 'number', 'kWh per year', 'yearly yield of that potential'),
    ('res', 'O', 'number', 'persons', 'residents: MODEL ESTIMATE - the residents of the census cell (100 m) distributed by housing floor area; '
     'absent where the census shows no value for the cell'),
    ('heat', 'O', '{k, d}', 'HEAT_KINDS, kWh per year', 'k: how the building is probably heated (the most frequent energy carrier of its census '
     'cell - an estimate), d: heat demand per year by rule (floor area x value by use and era)'),
    ('fg', 'O', 'int', 'FLAGS', 'the flags of g (2 monument, 8 vacant, 16 demolition planned, 64 cadastre only, 128 new)'),
    ('q', 'R', '{field: 0..3}', 'QUALITY', 'quality of lv, rf (the roof planes), pv, era, vol, res, heat. A field missing here counts as 0.'),
    ('src', 'O', '{field: source id}', '', 'only where a field has another source than the tile names'),
)
D_KEYS = tuple(f[0] for f in D_FIELDS)
D_REQUIRED = tuple(f[0] for f in D_FIELDS if f[1] == 'R')

# what every quarter and area of viertel.json carries (plan 6.3, SUHL.data.quarter)
QUARTER_SUMS = ('buildings', 'byUse', 'byEra', 'footprint', 'floorArea', 'floorAreaHousing', 'volume', 'roofArea', 'roofBy', 'roofUsable', 'pvKwp',
                'pvKwh', 'pvKwpToday', 'heatDemand', 'complete')
QUARTER_KEYS = ('nr', 'id', 'name', 'kind', 'area', 'center', 'r', 'poly', 'outline', 'tiles', 'official') + QUARTER_SUMS


def check_d_record(d, rep, where, half=None):
    """the scenario numbers of one building (an entry of a d tile); half = half the tile edge in model metres"""
    if not isinstance(d, dict):
        rep.err(where, 'the numbers of a building must be an object', 'd record')
        return
    unknown_keys(d, D_KEYS, rep, where, 'scenario numbers')
    miss = [k for k in D_REQUIRED if k not in d]
    if miss:
        rep.err(where, f'missing field(s): {", ".join(miss)}', 'd missing ' + miss[0])
        return
    if not (is_int(d['vt']) and 0 <= d['vt'] <= 99):
        rep.err(where, f'"vt" must be the number of a quarter (0 = outside): {d["vt"]!r}', 'd vt')
    elif d['vt'] == 0:
        rep.stat('d: buildings outside every quarter (vt 0)')
    m = d['m']
    if not (isinstance(m, list) and len(m) == 2 and all(is_num(v) for v in m)):
        rep.err(where, '"m" must be [x, y] (tile-local metres)', 'd m')
    elif half is not None and (abs(m[0]) > half + 60 or abs(m[1]) > half + 60):
        rep.err(where, f'"m" = {m} lies outside the tile (half edge {half:.0f} m)', 'd m outside')
    if d['use'] not in USES:
        rep.err(where, f'"use" = {d["use"]!r} is not a word of USES', 'd use')
    if d['era'] not in ERAS:
        rep.err(where, f'"era" = {d["era"]!r} is not 0..4', 'd era')
    if d['k'] not in KINDS:
        rep.err(where, f'"k" = {d["k"]!r} is not a kind of building', 'd k')
    for key, lo, hi in (('fa', 0.5, 2e5), ('gfa', 0.5, 4e6), ('vol', 0.0, 4e7), ('rf', 0.0, 4e5), ('h', 0.0, 400.0), ('e', 0.0, 400.0)):
        if not (is_num(d[key]) and lo <= d[key] <= hi):
            rep.err(where, f'"{key}" out of range {lo:g}..{hi:g}: {d[key]!r}', 'd ' + key)
            return
    for key, lo, hi in (('dg', 0.0, 2e5), ('ru', 0.0, 4e5), ('pv', 0.0, 1e5), ('pe', 0.0, 1e8), ('res', 0.0, 5000.0)):
        if key in d and not (is_num(d[key]) and lo <= d[key] <= hi):
            rep.err(where, f'"{key}" out of range {lo:g}..{hi:g}: {d[key]!r}', 'd ' + key)
    if not (is_int(d['lv']) and 1 <= d['lv'] <= 60):
        rep.err(where, f'"lv" must be an integer 1..60: {d["lv"]!r}', 'd lv')
    elif abs(d['gfa'] - d['fa'] * d['lv']) > 0.01 * d['gfa'] + 1.5:
        rep.err(where, f'"gfa" = {d["gfa"]} is not fa x lv = {d["fa"] * d["lv"]:.1f}', 'd gfa')
    if d['e'] > d['h'] + 0.06:
        rep.err(where, f'eave {d["e"]} above the top {d["h"]}', 'd e')
    R = d['R']
    if not isinstance(R, list):
        rep.err(where, '"R" must be the list of roof planes', 'd R')
        return
    sa = skw = sus = 0.0
    for i, row in enumerate(R):
        if not (isinstance(row, list) and len(row) == len(R_COLS)):
            rep.err(where, f'"R[{i}]" must be {len(R_COLS)} values [{", ".join(R_COLS)}]', 'd R row')
            return
        a, ap, az, sl, c, us, kwp, ir = row
        if not (is_num(a) and is_num(ap) and a >= 0 and 0 <= ap <= a + 0.11 + 0.002 * a):
            rep.err(where, f'"R[{i}]": plan area {ap!r} must lie between 0 and the true area {a!r}', 'd R area')
            return
        if az is not None and not (is_num(az) and 0 <= az <= 360):
            rep.err(where, f'"R[{i}]": direction {az!r} must be null (flat) or 0..360 degrees from geographic north', 'd R az')
        if not (is_num(sl) and 0 <= sl <= 90):
            rep.err(where, f'"R[{i}]": slope {sl!r} must be 0..90 degrees', 'd R sl')
        if c not in ROOF_CLASSES:
            rep.err(where, f'"R[{i}]": covering {c!r} is not a roof class', 'd R c')
        if not (is_num(us) and 0 <= us <= a + 0.11 and is_num(kwp) and kwp >= 0 and is_num(ir) and 0 <= ir <= 100):
            rep.err(where, f'"R[{i}]": module area {us!r} (0..a), power {kwp!r}, irradiation {ir!r} (0..100)', 'd R solar')
            return
        sa += a
        skw += kwp
        sus += us
        rep.stat('d: roof planes')
    if abs(sa - d['rf']) > 0.01 * sa + 0.2 * len(R) + 0.2:
        rep.err(where, f'"rf" = {d["rf"]} is not the sum of the planes {sa:.1f}', 'd rf')
    if d.get('pv', 0) > skw + 0.06 * len(R) + 0.1 or d.get('ru', 0) > sus + 0.06 * len(R) + 0.1:
        rep.err(where, f'"pv"/"ru" = {d.get("pv")}/{d.get("ru")} exceed the sums of the planes {skw:.1f}/{sus:.1f}', 'd pv')
    if 'heat' in d:
        h = d['heat']
        if not (isinstance(h, dict) and set(h) <= {'k', 'd'} and (('k' not in h) or h['k'] in HEAT_KINDS)
                and (('d' not in h) or (is_num(h['d']) and 0 <= h['d'] <= 1e9))):
            rep.err(where, f'"heat" must be {{k: {" | ".join(HEAT_KINDS)}, d: kWh per year}}: {h!r}', 'd heat')
    if 'fg' in d and not (is_int(d['fg']) and 0 <= d['fg'] < 256):
        rep.err(where, '"fg" must be the flags of g (0..255)', 'd fg')
    q = d['q']
    if not (isinstance(q, dict) and all(v in QUALITY for v in q.values())):
        rep.err(where, '"q" must be {field: 0..3}', 'd q')
    else:
        if 'res' in d:
            rep.stat('d: buildings with residents (estimate)')
            if 'res' not in q:
                rep.err(where, '"res" is an estimate: it needs its quality q.res', 'd res q')
        if isinstance(d.get('heat'), dict) and 'k' in d['heat'] and 'heat' not in q:
            rep.err(where, '"heat.k" is an estimate: it needs its quality q.heat', 'd heat q')
    if 'src' in d and not (isinstance(d['src'], dict) and all(isinstance(v, str) for v in d['src'].values())):
        rep.err(where, '"src" must be {field: source id}', 'd src')
    rep.stat('d: buildings')


def check_d_tile(doc, key, rep, where):
    """a d tile: {schema, product: 'd', key, o, made, n, d: {building id: numbers}}"""
    fr = check_envelope(doc, 'd', key, rep, where)
    if fr is None:
        return
    if not isinstance(doc.get('d'), dict):
        rep.err(where, '"d" must be an object {building id: numbers}', 'd')
        return
    if 'n' in doc and doc['n'] != len(doc['d']):
        rep.err(where, f'"n" = {doc["n"]!r} but the tile holds {len(doc["d"])} buildings', 'n')
    try:
        import suhllib as S
        half = S.tsize(key[0]) / S.MODEL_SCALE / 2 if isinstance(key, tuple) else None
    except Exception:
        half = None
    for bid, d in doc['d'].items():
        try:
            check_d_record(d, rep, f'{where} {bid}', half)
        except Exception as ex:                             # a broken record must not stop the report
            rep.err(f'{where} {bid}', f'record unreadable: {ex}', 'd record unreadable')


def _sums(j, rep, w):
    for k in QUARTER_SUMS:
        if k not in j:
            rep.err(w, f'missing "{k}"', 'viertel sums ' + k)
            return False
    for k in ('buildings', 'footprint', 'floorArea', 'floorAreaHousing', 'volume', 'roofArea', 'roofUsable', 'pvKwp', 'pvKwh', 'heatDemand'):
        if not (is_num(j[k]) and j[k] >= 0):
            rep.err(w, f'"{k}" must be a number >= 0: {j[k]!r}', 'viertel ' + k)
            return False
    if j['pvKwpToday'] is not None and not is_num(j['pvKwpToday']):
        rep.err(w, '"pvKwpToday" must be null (not known) or a number', 'viertel pvKwpToday')
    if not (isinstance(j['byUse'], dict) and all(k in USES and isinstance(v, list) and len(v) == 3 for k, v in j['byUse'].items())):
        rep.err(w, '"byUse" must be {use: [buildings, footprint m2, floor area m2]}', 'viertel byUse')
    elif sum(v[0] for v in j['byUse'].values()) != j['buildings']:
        rep.err(w, f'"byUse" counts {sum(v[0] for v in j["byUse"].values())} buildings, "buildings" says {j["buildings"]}', 'viertel byUse sum')
    if not (isinstance(j['byEra'], dict) and all(k in ('0', '1', '2', '3', '4') and isinstance(v, list) and len(v) == 2 for k, v in j['byEra'].items())):
        rep.err(w, '"byEra" must be {"0".."4": [buildings without outbuildings and garages, floor area m2]}', 'viertel byEra')
    if not (isinstance(j['roofBy'], dict) and all(k in DIRECTIONS and is_num(v) for k, v in j['roofBy'].items())):
        rep.err(w, f'"roofBy" must be {{{" | ".join(DIRECTIONS)}: m2}}', 'viertel roofBy')
    elif abs(sum(j['roofBy'].values()) - j['roofArea']) > 0.001 * j['roofArea'] + 10:
        rep.err(w, f'"roofBy" sums to {sum(j["roofBy"].values())}, "roofArea" says {j["roofArea"]}', 'viertel roofBy sum')
    if not isinstance(j['complete'], bool):
        rep.err(w, '"complete" must be true or false (false: the sums cover only a part, e.g. a sample set)', 'viertel complete')
    if 'residents' in j:
        r = j['residents']
        if not (isinstance(r, dict) and is_num(r.get('model')) and r.get('q') in QUALITY and isinstance(r.get('how'), str)):
            rep.err(w, '"residents" must be {model: persons, q: 0..3, how: text, ...} - an estimate names its method', 'viertel residents')
    return True


def check_viertel(doc, rep, where='d/viertel.json', version=None):
    """viertel.json of the product d: the quarters with raster, outlines and sums"""
    if not isinstance(doc, dict):
        rep.err(where, 'must be a JSON object')
        return
    for k in ('schema', 'product', 'version', 'made', 'area', 'partial', 'crs', 'meta', 'raster', 'viertel', 'gebiete'):
        if k not in doc:
            rep.err(where, f'missing "{k}"', 'viertel ' + k)
            return
    if doc['schema'] != 1 or doc['product'] != 'd':
        rep.err(where, '"schema" must be 1 and "product" "d"', 'viertel head')
    if version is not None and doc['version'] != version:
        rep.err(where, f'"version" = {doc["version"]!r}, the folder says {version}', 'viertel version')
    if doc['crs'] != 'EPSG:25832':
        rep.err(where, '"crs" must be EPSG:25832 (all positions of this file are UTM metres)', 'viertel crs')
    meta = doc['meta']
    if not (isinstance(meta, dict) and isinstance(meta.get('annahmen'), list) and meta['annahmen']
            and all(isinstance(a, dict) and isinstance(a.get('id'), str) and isinstance(a.get('text'), str) for a in meta['annahmen'])):
        rep.err(where, '"meta.annahmen" must list the assumptions [{id, text}] (the app shows them as the "why?")', 'viertel annahmen')
    ra = doc['raster']
    cells = None
    if not (isinstance(ra, dict) and all(is_int(ra.get(k)) for k in ('x0', 'y0', 'w', 'h', 'level')) and is_num(ra.get('cell'))
            and is_num(ra.get('e0')) and is_num(ra.get('n0')) and isinstance(ra.get('data'), str)):
        rep.err(where, '"raster" must be {level, cell, x0, y0, w, h, e0, n0, data (base64, one byte per cell)}', 'viertel raster')
    else:
        try:
            cells = base64.b64decode(ra['data'], validate=True)
        except Exception:
            rep.err(where, '"raster.data" is not base64', 'viertel raster data')
        if cells is not None and len(cells) != ra['w'] * ra['h']:
            rep.err(where, f'"raster.data" holds {len(cells)} bytes, w x h = {ra["w"] * ra["h"]}', 'viertel raster size')
            cells = None
    vq = doc['viertel']
    if not (isinstance(vq, list) and vq):
        rep.err(where, '"viertel" must be the list of quarters', 'viertel list')
        return
    nrs, ids = [], set()
    for j in vq:
        w = f'{where} {j.get("id") if isinstance(j, dict) else "?"}'
        if not isinstance(j, dict):
            rep.err(w, 'a quarter must be an object')
            continue
        unknown_keys(j, QUARTER_KEYS + ('listed', 'vacant', 'attic', 'quality', 'residents', 'census', 'heat', 'age', 'households', 'housing'),
                     rep, w, 'quarter')
        miss = [k for k in ('nr', 'id', 'name', 'kind', 'area', 'center', 'poly', 'outline', 'tiles', 'official') if k not in j]
        if miss:
            rep.err(w, f'missing: {", ".join(miss)}', 'viertel quarter ' + miss[0])
            continue
        nrs.append(j['nr'])
        ids.add(j['id'])
        if j['kind'] not in QUARTER_KINDS:
            rep.err(w, f'"kind" must be one of {QUARTER_KINDS}', 'viertel kind')
        o = j['outline']
        if not (isinstance(o, dict) and o.get('q') in QUALITY and isinstance(o.get('how'), str)):
            rep.err(w, '"outline" must be {q: 0..3, src, how} - an assumed outline says so (q 0)', 'viertel outline')
        if not (isinstance(j['poly'], list) and all(isinstance(r, list) and len(r) >= 3 and all(isinstance(p, list) and len(p) == 2 for p in r)
                                                    for r in j['poly'])):
            rep.err(w, '"poly" must be a list of rings [[E, N], ...]', 'viertel poly')
        of = j['official']
        if not (isinstance(of, dict) and is_num(of.get('residents')) and is_int(of.get('year')) and isinstance(of.get('src'), str) and of['src']):
            rep.err(w, '"official" must be {residents, year, src}', 'viertel official')
        if not (isinstance(j['tiles'], list) and all(isinstance(t, str) and t.count('/') == 1 for t in j['tiles'])):
            rep.err(w, '"tiles" must list the level-10 tiles "x/y" that hold buildings of the quarter', 'viertel tiles')
        _sums(j, rep, w)
        rep.stat('d: quarters')
    if sorted(nrs) != list(range(1, len(nrs) + 1)):
        rep.err(where, f'the quarters must be numbered 1..{len(nrs)} without gaps: {sorted(nrs)}', 'viertel numbers')
    if len(ids) != len(nrs):
        rep.err(where, 'two quarters share an id', 'viertel ids')
    if cells is not None and nrs:
        top = max(cells)
        if top > len(nrs):
            rep.err(where, f'the raster names quarter {top}, the list ends at {len(nrs)}', 'viertel raster nr')
        try:
            import suhllib as S
            E, N = S.CENTRE_UTM
            c, r = int((E - ra['e0']) // ra['cell']), int((N - ra['n0']) // ra['cell'])
            if not (0 <= c < ra['w'] and 0 <= r < ra['h'] and cells[r * ra['w'] + c]):
                rep.err(where, 'the centre of Suhl lies in no quarter of the raster', 'viertel centre')
        except ImportError:
            pass
    ga = doc['gebiete']
    if not (isinstance(ga, list) and {g.get('id') for g in ga if isinstance(g, dict)} >= {'zentrum', 'kernstadt', 'stadt'}):
        rep.err(where, '"gebiete" must hold the sums of zentrum, kernstadt and stadt', 'viertel gebiete')
    else:
        for g in ga:
            _sums(g, rep, f'{where} {g.get("id")}')
    if not isinstance(doc['partial'], bool):
        rep.err(where, '"partial" must be true (a sample: the sums cover only its tiles) or false', 'viertel partial')
    elif doc['partial']:
        rep.stat('d: viertel.json of a part (sums incomplete, see "complete")')
