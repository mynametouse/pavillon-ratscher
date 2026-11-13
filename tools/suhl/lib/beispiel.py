#!/usr/bin/env python3
"""A tiny INVENTED example of every Suhl product in the layout of schema 1, revision 1.1 - for the tests of the validator, for the
publish test (suhl/_probe) and as the smallest thing a reader can parse. The real samples are the ones of the data agents
(tools/suhl/out/<paket>/probe on their branches).

    python3 -I tools/suhl/lib/beispiel.py [<root>]      -> <root>/suhl/{g,s,m,b,gr,w,d,_probe}/v0/... + suhl/aktuell.json
                                                           (default <root>: tools/suhl/lib/beispiel)

Nothing here is real: the houses are boxes with gable roofs set on the Markt tile, their ids start with BEISPIEL.
"""
import math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import suhllib as S   # noqa: E402
import schema         # noqa: E402

MADE = '2026-11-13T00:30:00Z'      # fixed, so that the committed example does not change with every run
NOTE = 'BEISPIEL - erfunden, keine echten Daten (tools/suhl/lib/beispiel.py)'


def r2(v):
    return round(float(v), 2)


def house(fr, bid, cx, cy, length, width, az, eave, pitch, **extra):
    """an invented gable house: centre (cx, cy) in tile-local model metres, the ridge runs along `length` in direction az (model frame)"""
    a = math.radians(az)
    ux, uy = math.sin(a), math.cos(a)            # along the ridge
    vx, vy = uy, -ux                             # across, to the right of the ridge direction
    hl, hw = length / 2, width / 2
    P = lambda t, d: (cx + t * ux + d * vx, cy + t * uy + d * vy)   # noqa: E731
    ring = [P(-hl, hw), P(hl, hw), P(hl, -hw), P(-hl, -hw)]         # counter-clockwise
    if schema.core.ring_area([c for p in ring for c in p]) < 0:
        ring.reverse()
    true_w = hw * S.MODEL_SCALE                   # horizontal lengths in the file are model metres, the pitch is a true angle
    rise = true_w * math.tan(math.radians(pitch))
    h = eave + rise
    f = [r2(c) for p in ring for c in p]
    rv, rt, R = [], [], []
    for side in (1, -1):                          # the two roof faces
        q = [P(-hl, side * hw), P(hl, side * hw), P(hl, 0), P(-hl, 0)]
        z = [eave, eave, h, h]
        if side == 1:                             # keep the outline counter-clockwise seen from above
            q, z = q[::-1], z[::-1]
        if schema.core.ring_area([c for p in q for c in p]) < 0:
            q, z = q[::-1], z[::-1]
        v0 = len(rv) // 3
        for (x, y), zz in zip(q, z):
            rv += [r2(x), r2(y), r2(zz)]
        t0 = len(rt) // 3
        rt += [v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3]
        plan = length * hw * S.MODEL_SCALE ** 2
        down = (az + (90 if side == 1 else 270)) % 360          # the downhill direction in the model frame
        R.append({'vi': [v0, 4], 'ti': [t0, 2], 'c': 0, 'col': [0.62, 0.3, 0.22], 'sl': round(pitch, 1),
                  'az': round(S.true_azimuth_from_model(down, *fr.centre_utm), 1), 'a': r2(plan / math.cos(math.radians(pitch))), 'ap': r2(plan)})
    F, n = [], len(ring)
    for i in range(n):
        (ax, ay), (bx, by) = ring[i], ring[(i + 1) % n]
        along = abs((bx - ax) * ux + (by - ay) * uy) > abs((bx - ax) * vx + (by - ay) * vy)
        F.append([r2(ax), r2(ay), r2(bx), r2(by), r2(eave), 0.5, r2(eave if along else h), r2(eave), 0, 99.0])
    b = {'id': bid, 'f': f, 'k': 0, 'h': r2(h), 'e': r2(eave), 'r': 2, 'az': round(az % 180, 1), 'p': round(pitch, 1), 'rq': 0, 'rk': 0,
         'rc': [0.62, 0.3, 0.22], 'rv': rv, 'rt': rt, 'R': R, 'F': F, 'lv': max(1, int(eave // 2.9)), 'use': 'wohnen', 'era': 0,
         'q': {'h': 2, 'k': 0, 'use': 0, 'era': 0, 'lv': 0, 'rk': 0, 'rc': 0}, 'src': {'f': 'regel', 'h': 'regel'}}
    b.update(extra)
    return b


def d_record(h):
    """the scenario numbers of an invented house in the layout of the product d (the real ones: tools/suhl/daten/zahlen.py)"""
    sc = S.MODEL_SCALE ** 2
    f = h['f']
    fa = abs(schema.core.ring_area(f)) * sc
    rows, ru, pv = [], 0.0, 0.0
    for r in h['R']:
        us = r2(0.7 * r['a'])
        ir = 96 if 90 <= r['az'] <= 270 else 70
        rows.append([r['a'], r['ap'], round(r['az']), round(r['sl']), r['c'], us, r2(us * 0.2), ir])
        if ir >= 75:
            ru, pv = ru + us, pv + us * 0.2
    d = {'vt': 1, 'm': [r2(sum(f[0::2]) / (len(f) // 2)), r2(sum(f[1::2]) / (len(f) // 2))], 'use': h['use'], 'era': h['era'], 'k': h['k'],
         'bt': h.get('bt', 'efh'), 'fa': r2(fa), 'lv': h['lv'], 'gfa': r2(fa * h['lv']), 'h': h['h'], 'e': h['e'],
         'vol': r2(fa * (h['e'] + (h['h'] - h['e']) / 2)), 'rf': r2(sum(r[0] for r in rows)), 'R': rows,
         'ru': r2(ru), 'pv': r2(pv), 'pe': round(pv * 950 * 0.96), 'q': {'lv': 0, 'rf': 0, 'pv': 0}}
    if h['use'] == 'wohnen':
        d.update({'res': round(fa * h['lv'] / 45.0, 1), 'heat': {'k': 'gas', 'd': round(0.8 * fa * h['lv'] * 150)}})
        d['q'].update({'res': 0, 'heat': 0})
    if h.get('fg'):
        d['fg'] = h['fg']
    return d


def d_viertel(recs):
    """viertel.json of the example: ONE invented quarter on a raster of 8 x 8 cells of 100 m around the Markt tile"""
    import base64
    L, x, y = 10, 497, 542
    x0, y0 = (x - 1) * 4, y * 4                       # level-12 tile numbers of the south-west corner of the tile west of the Markt tile
    e0, n0 = S.tbounds(12, x0, y0)[:2]
    all_ = [d for t in recs.values() for d in t.values()]
    use, era = {}, {}
    for d in all_:
        u = use.setdefault(d['use'], [0, 0.0, 0.0])
        u[0], u[1], u[2] = u[0] + 1, u[1] + d['fa'], u[2] + d['gfa']
        if d['use'] not in ('neben', 'garage'):
            e = era.setdefault(str(d['era']), [0, 0.0])
            e[0], e[1] = e[0] + 1, e[1] + d['gfa']
    tot = lambda k: round(sum(d.get(k, 0) for d in all_))        # noqa: E731
    roof = {}
    for d in all_:
        for r in d['R']:
            k = 'flach' if r[2] is None else ('N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW')[int(((r[2] % 360) + 22.5) // 45) % 8]
            roof[k] = roof.get(k, 0.0) + r[0]
    sums = {'buildings': len(all_), 'byUse': {k: [v[0], round(v[1]), round(v[2])] for k, v in use.items()},
            'byEra': {k: [v[0], round(v[1])] for k, v in era.items()}, 'footprint': tot('fa'), 'floorArea': tot('gfa'),
            'floorAreaHousing': round(sum(d['gfa'] for d in all_ if d['use'] == 'wohnen')), 'volume': tot('vol'),
            'roofArea': round(sum(roof.values())), 'roofBy': {k: round(v) for k, v in roof.items()}, 'roofUsable': tot('ru'), 'pvKwp': tot('pv'),
            'pvKwh': tot('pe'), 'pvKwpToday': None, 'heatDemand': round(sum(d.get('heat', {}).get('d', 0) for d in all_)), 'complete': False}
    q = {'nr': 1, 'id': 'beispiel', 'name': 'Beispielviertel (erfunden)', 'kind': 'viertel', 'area': 0.64,
         'center': [int(e0 + 400), int(n0 + 400)], 'r': 566, 'poly': [[[int(e0), int(n0)], [int(e0 + 800), int(n0)], [int(e0 + 800), int(n0 + 800)],
                                                                        [int(e0), int(n0 + 800)]]],
         'outline': {'q': 0, 'src': 'regel', 'how': 'erfunden'}, 'tiles': sorted(f'{t[0]}/{t[1]}' for t in recs),
         'official': {'residents': 12, 'year': 2022, 'src': 'erfunden'},
         'residents': {'model': round(sum(d.get('res', 0) for d in all_), 1), 'q': 0, 'how': 'erfunden: Geschossfläche / 45 m²'}}
    q.update(sums)
    areas = []
    for aid in ('zentrum', 'kernstadt', 'stadt'):
        a = {'id': aid, 'name': aid, 'kind': 'gebiet'}
        a.update(sums)
        areas.append(a)
    return {'schema': S.SCHEMA, 'product': 'd', 'version': 0, 'made': MADE, 'area': 'probe', 'partial': True, 'crs': 'EPSG:25832',
            'meta': {'stand': MADE, 'annahmen': [{'id': 'beispiel', 'text': NOTE}], 'felder': {'R': list(schema.R_COLS)}},
            'raster': {'crs': 'EPSG:25832', 'level': 12, 'cell': 100.0, 'x0': x0, 'y0': y0, 'w': 8, 'h': 8, 'e0': e0, 'n0': n0,
                       'order': 'row 0 = south, column 0 = west; byte = quarter number, 0 = outside the municipality',
                       'data': base64.b64encode(bytes([1]) * 64).decode('ascii')},
            'viertel': [q], 'gebiete': areas}


def write(root):
    """write the example below root; returns the list of product version folders"""
    L, x, y = 10, 497, 542                                           # the Markt tile
    fr, fr2 = S.tile_frame(L, x, y), S.tile_frame(L, x - 1, y)
    head = lambda p, f: {'schema': S.SCHEMA, 'product': p, 'version': 0, 'key': f.key, 'o': f.o_json(), 'made': MADE}   # noqa: E731
    # ---- g: buildings (revision 1.0 body; fas / fat, zv, teil, lm and the side fields of revision 1.1)
    h1 = house(fr, 'BEISPIEL_1', 20.0, -30.0, 14.0, 9.0, 30.0, 6.2, 42.0, n='Beispielhaus (erfunden)', adr='Beispielweg 1', fkt='Wohnhaus', bt='efh',
               z0=57.4, zv=[0.0, 0.3, 0.5, 0.2], fas={'t': 0, 'col': [0.86, 0.82, 0.74], 'q': 0},
               S=[{'st': 'Beispielweg', 'sd': 6.0, 'eg': 'laden', 'sign': ['Beispielladen'], 'q': 1}, None, None, None])
    h1['q']['z0'] = 0
    h1['d'] = {'fa': r2(14.0 * 9.0 * S.MODEL_SCALE ** 2), 'lv': 2, 'gfa': r2(2 * 14.0 * 9.0 * S.MODEL_SCALE ** 2),
               'rf': r2(sum(f['a'] for f in h1['R'])), 'ro': {'O': h1['R'][0]['a'], 'W': h1['R'][1]['a']}, 'q': {'lv': 0, 'gfa': 0}}
    h2 = house(fr, 'BEISPIEL_2', -60.0, 45.0, 30.0, 11.0, 118.0, 14.5, 25.0, bt='zeilenbau', era=3, lv=5, z0=57.9, fg=2, lm='Z99',
               fas={'t': 1, 'col': [0.8, 0.8, 0.78], 'q': 0})
    h2['q']['z0'] = 0
    h3 = house(fr2, 'BEISPIEL_3', 110.0, 12.0, 8.0, 6.0, 0.0, 3.0, 35.0, k=2, use='neben', bt='nebengebaeude', teil='BEISPIEL_1', kat=1)
    for f, bl in ((fr, [h1, h2]), (fr2, [h3])):
        d = head('g', f)
        d.update({'n': len(bl), 'src': {'f': 'regel', 'h': 'regel'},
                  'fat': [{'mat': 'putz', 'col2': [0.55, 0.53, 0.49], 'sock': 0.4, 'win': [3.2, 1.3, 1.3, 0.9, 0, 0, 0]},
                          {'mat': 'platte', 'col2': [0.5, 0.5, 0.5], 'sock': 0.6, 'win': [3.0, 1.8, 1.4, 0.9, 0, 0, 0], 'balk': 'loggien'}], 'b': bl})
        S.write_json(os.path.join(root, S.tile_path('g', 0, f.L, f.x, f.y)), d)
    # ---- b: trees (east, north from the south-west corner in UTM metres, height, crown radius, kind, flags)
    p = os.path.join(root, S.tile_path('b', 0, L, x, y))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as fh:
        fh.write(schema.tree_pack([(188.0, 280.5, 14.0, 4.0, 0, 1 | 8), (195.5, 282.0, 11.5, 3.2, 10, 2 | 16 | 64), (350.0, 80.0, 22.0, 3.0, 2, 1)]))
    # ---- gr: green areas (decimetres from the south-west corner, UTM) and w: forest cells (6 layers of 20 x 20 bytes)
    S.write_json(os.path.join(root, S.tile_path('gr', 0, L, x, y)), {'f': [[4, 'w0', [[1700, 2700, 2100, 2700, 2100, 2950, 1700, 2950]]]]})
    cells = bytearray(2400)
    for i in range(3):                                               # three cells of deciduous forest in the north-east corner
        k = 19 * 20 + 17 + i
        cells[k], cells[400 + k], cells[800 + k], cells[1200 + k], cells[1600 + k] = 1, 0, 80, 96, 22
    p = os.path.join(root, S.tile_path('w', 0, L, x, y))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as fh:
        fh.write(bytes(cells))
    # ---- m: street furniture (the layout of suhl-strassen: layers of rows, whole decimetres relative to o)
    d = head('m', fr)
    d.update({'unit': 'dm; x, y relative to o along the model axes, z = NHN - H0', 'pfosten': [], 'planken': [], 'masten': [],
              'lampen': [123, -410, 30, 0, 480, -395, 30, 0], 'schilder': [['205', 342, -430, 4]], 'linien': [['zebra', 100, -450, 30, 20]],
              'ampeln': [], 'querungen': [], 'halte': [[-200, -445, 120, 'Beispielplatz', 0, 1, 1, '', 0]],
              'namen': [[600, -440, 'Beispielweg', 30, 'Nebenweg', 120]]})
    S.write_json(os.path.join(root, S.tile_path('m', 0, L, x, y)), d)
    # ---- s: streets (the layout of suhl-strassen: whole decimetres relative to o, z = NHN - H0)
    d = head('s', fr)
    pts = [v for t in range(-1500, 1501, 500) for v in (t, -450 + t // 50, 570 + t // 100)]
    d.update({'unit': 'dm; x, y relative to o along the model axes, z = NHN - H0',
              'kinds': ['motorway', 'main', 'county', 'street', 'lane', 'service', 'track', 'path', 'foot'],
              'surf': ['asphalt', 'concrete', 'paving', 'gravel', 'ground', 'grass'], 'hws': ['residential'], 'atypes': ['platz', 'parken', 'bus', 'steig'],
              'names': ['', 'Beispielweg'],
              'ways': [[3, 0, 60, 0, 1, 0, pts, 0, 0, 0, 0, 0, 2]],
              'areas': [[0, 2, 0, 0, 'w0', 1, 0, [-300, 600, 572, 100, 600, 572, 100, 1000, 573, -300, 1000, 573], []]]})
    S.write_json(os.path.join(root, S.tile_path('s', 0, L, x, y)), d)
    # ---- d: scenario numbers as a product of their own (package S2-9): the numbers of the houses and viertel.json with one quarter
    recs = {(fr.x, fr.y): {h['id']: d_record(h) for h in (h1, h2)}, (fr2.x, fr2.y): {h3['id']: d_record(h3)}}
    for f in (fr, fr2):
        d = head('d', f)
        d.update({'n': len(recs[(f.x, f.y)]), 'd': recs[(f.x, f.y)]})
        S.write_json(os.path.join(root, S.tile_path('d', 0, f.L, f.x, f.y)), d)
    S.write_json(os.path.join(root, S.product_dir('d', 0), 'viertel.json'), d_viertel(recs), compact=False)
    # ---- _probe: what the publish test sends
    d = head('_probe', fr)
    d['b'] = []
    S.write_json(os.path.join(root, S.tile_path('_probe', 0, L, x, y)), d)
    out, akt = [], None
    for prod in ('g', 's', 'm', 'b', 'gr', 'w', 'd', '_probe'):
        folder = os.path.join(root, S.product_dir(prod, 0))
        doc = schema.make_index(folder, prod, 0, 'probe', ['regel'], note=NOTE, extra={'attribution': NOTE}, write=False)
        doc['made'] = MADE
        S.write_json(os.path.join(folder, 'index.json'), doc)
        akt = schema.make_aktuell(akt, schema.index_doc_of(folder))
        out.append(folder)
    akt['made'] = MADE
    S.write_json(os.path.join(root, 'suhl', 'aktuell.json'), akt, compact=False)
    return out


if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'beispiel')
    for f in write(root):
        print(f)
