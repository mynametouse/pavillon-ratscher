"""feat/gebaeude: the ETHOS "towers" (ETHOS.BUILDA kind 4/5) standing in the gaps of Schleusingen's old town – 12–18 m tall, 21–37 m²,
each touching (within 1 m) a house of the town data (stadt.json) and walled in on every side in ETHOS: parts of the LoD2 roofs and upper
floors of town houses the town draws itself. gebaeude/gebaeude.js builds them as tall blank concrete blocks (one stood at the Markt);
viz3/src/fassade/fassade.js leaves them out (GEB.skip, after laeden's). Prints the ids for the list there.
  python3 -I viz3/extra/gebaeude/quellen/teile.py   (after a build: reads viz3/dist/gebaeude/z/ and the town data)
Needs shapely."""
import json, os
from shapely.geometry import Polygon
from shapely.strtree import STRtree
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
Z = os.path.join(ROOT, 'viz3', 'dist', 'gebaeude', 'z')
TOWN = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen', 'dist', 'schleusingen', 'stadt.json')


def poly(f):
    return Polygon([(f[k], f[k + 1]) for k in range(0, len(f), 2)]).buffer(0)


town = [poly(b['f']) for b in json.load(open(TOWN))['b']]
tree = STRtree(town)
x0, y0 = min(p.bounds[0] for p in town), min(p.bounds[1] for p in town)
x1, y1 = max(p.bounds[2] for p in town), max(p.bounds[3] for p in town)
idx = json.load(open(os.path.join(Z, 'index.json')))
C = idx['cell']
out = []
for key in sorted(idx['cells']):
    i, j = map(int, key.split('_'))
    if (i + 1) * C < x0 or i * C > x1 or (j + 1) * C < y0 or j * C > y1:
        continue
    for b in json.load(open(os.path.join(Z, key + '.json')))['b']:
        if b['k'] not in (4, 5) or not all(F[8] & 1 for F in b['F']):
            continue
        g = poly(b['f'])
        if any(g.distance(town[k]) < 1.0 for k in tree.query(g.buffer(1.0))):
            out.append((b['id'], key, round(g.centroid.x), round(g.centroid.y), b['h'], round(g.area)))
for o in out:
    print(o)
print(json.dumps([o[0] for o in out]))
