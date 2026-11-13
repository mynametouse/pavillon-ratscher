#!/usr/bin/env python3
"""A tiny INVENTED example of every Suhl product in the final layout - for readers who want to parse something before real data
exists, for the tests of the validator and for the publish test (suhl/_probe).

    python3 -I tools/suhl/lib/beispiel.py [<root>]      -> <root>/suhl/{g,b,m,s,d,_probe}/v0/... + suhl/aktuell.json
                                                           (default <root>: tools/suhl/lib/beispiel)

Nothing here is real: the houses are boxes with gable roofs set on the Markt tile, their ids start with BEISPIEL.
"""
import math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import suhllib as S   # noqa: E402
import schema         # noqa: E402
from schema import index as IX   # noqa: E402

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


def write(root):
    """write the example below root; returns the list of product version folders"""
    out = []
    L, x, y = 10, 497, 542                                           # the Markt tile
    fr, fr2 = S.tile_frame(L, x, y), S.tile_frame(L, x - 1, y)
    head = lambda p, f: {'v': S.SCHEMA, 'p': p, 'key': f.key, 'o': f.o_json(), 'made': MADE}   # noqa: E731
    # ---- g: buildings
    h1 = house(fr, 'BEISPIEL_1', 20.0, -30.0, 14.0, 9.0, 30.0, 6.2, 42.0, n='Beispielhaus (erfunden)', adr='Beispielweg 1', fg=0,
               S=[{'st': 'Beispielweg', 'sd': 6.0, 'q': 0, 'mat': 'putz', 'col': [0.86, 0.82, 0.74], 'lv': 2}, None, None, None],
               d={'fa': 130.0, 'lv': 2, 'gfa': 260.0, 'ro': {'O': 87.5, 'W': 87.5}, 'q': {'lv': 0, 'gfa': 0}})
    h1['d']['fa'] = r2(14.0 * 9.0 * S.MODEL_SCALE ** 2)
    h1['d']['gfa'] = r2(2 * h1['d']['fa'])
    h1['d']['ro'] = {'O': h1['R'][0]['a'], 'W': h1['R'][1]['a']}
    h2 = house(fr, 'BEISPIEL_2', -60.0, 45.0, 30.0, 11.0, 118.0, 14.5, 25.0, bt='zeilenbau', era=3, lv=5, z0=57.4)
    h2['q']['z0'] = 0
    h3 = house(fr2, 'BEISPIEL_3', 110.0, 12.0, 8.0, 6.0, 0.0, 3.0, 35.0, k=2, use='neben')
    for f, bl in ((fr, [h1, h2]), (fr2, [h3])):
        d = head('g', f)
        d['b'] = bl
        S.write_json(os.path.join(root, S.tile_path('g', 0, f.L, f.x, f.y)), d)
    # ---- b: trees (x, y, height, crown radius, kind, flags)
    trees = [(188.0, 280.5, 14.0, 4.0, 0, 1 | 8), (195.5, 282.0, 11.5, 3.2, 10, 2 | 16 | 64), (350.0, 80.0, 22.0, 3.0, 2, 1)]   # east, north from the SW corner
    p = os.path.join(root, S.tile_path('b', 0, L, x, y))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as fh:
        fh.write(schema.tree_pack(trees))
    # ---- m: street furniture
    d = head('m', fr)
    d['items'] = [{'t': 'laterne', 'x': 12.3, 'y': -41.0, 'h': 6.0, 'q': 0}, {'t': 'haltestelle', 'x': -20.0, 'y': -44.5, 'az': 120.0,
                                                                              'n': 'Beispielplatz', 'q': 0}]
    S.write_json(os.path.join(root, S.tile_path('m', 0, L, x, y)), d)
    # ---- s: streets (absolute model decimetres, as fahrt/strassen.json)
    d = head('s', fr)
    ox, oy = fr.o
    pts = []
    for t in range(-150, 151, 50):
        pts += [int(round((ox + t) * 10)), int(round((oy - 45.0 + 0.02 * t) * 10)), int(round((57.0 + 0.01 * t) * 10))]
    d.update({'unit': 'dm', 'kinds': ['motorway', 'main', 'county', 'street', 'lane', 'service', 'track', 'path', 'foot'],
              'surf': ['asphalt', 'concrete', 'paving', 'gravel', 'ground', 'grass'], 'names': ['', 'Beispielweg'],
              'ways': [[3, 0, 60, 0, 1, 0, pts]],
              'areas': [{'k': 'platz', 'surf': 2, 'n': 0, 'f': [int(round((ox + a) * 10)) if i % 2 == 0 else int(round((oy + a) * 10))
                                                               for i, a in enumerate([-30, 60, 10, 60, 10, 100, -30, 100])]}]})
    S.write_json(os.path.join(root, S.tile_path('s', 0, L, x, y)), d)
    # ---- d: scenario numbers as a product of their own
    d = {'v': S.SCHEMA, 'p': 'd', 'key': fr.key, 'made': MADE, 'd': {'BEISPIEL_1': h1['d']}}
    S.write_json(os.path.join(root, 'suhl', 'd', 'v0', '10', str(x), f'{y}.json'), d)
    # ---- _probe: what the publish test sends
    d = head('_probe', fr)
    d['b'] = []
    S.write_json(os.path.join(root, S.tile_path('_probe', 0, L, x, y)), d)
    akt = None
    for prod in ('g', 'b', 'm', 's', 'd', '_probe'):
        folder = os.path.join(root, S.product_dir(prod, 0))
        doc = IX.make_index(folder, prod, 0, 'probe', ['regel'], note=NOTE, write=False)
        doc['made'] = MADE
        doc['attribution'] = NOTE
        S.write_json(os.path.join(folder, 'index.json'), doc)
        akt = IX.make_aktuell(akt, doc)
        out.append(folder)
    akt['made'] = MADE
    S.write_json(os.path.join(root, 'suhl', 'aktuell.json'), akt, compact=False)
    return out


if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'beispiel')
    for f in write(root):
        print(f)
