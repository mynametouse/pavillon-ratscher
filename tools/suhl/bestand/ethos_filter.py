#!/usr/bin/env python3
"""suhl-bestand: stream ETHOS.BUILDA DEG.csv (Thuringia; Forschungszentrum Jülich, Zenodo record 11845992, ODbL; geometry as WKT in
EPSG:3035) from stdin and keep the buildings in the bounding box of the municipality of Suhl (+ 300 m) as JSON lines in UTM 32N.
Same idea as tools/welt-gebaeude/filter_ethos.py, with Suhl's box and all columns kept. Raw data: the output is never committed.

  curl -sSL https://zenodo.org/api/records/11845992/files/DEG.csv/content | python3 -I tools/suhl/bestand/ethos_filter.py OUT.jsonl
"""
import csv, io, json, sys
from pyproj import Transformer
from shapely import wkt
from shapely.ops import transform as stransform

E0, E1, N0, N1 = 609500, 630700, 5602000, 5617100          # UTM 32N: bbox of relation 62450 + 300 m
tr = Transformer.from_crs(3035, 25832, always_xy=True)
inv = Transformer.from_crs(25832, 3035, always_xy=True)
xs, ys = zip(*[inv.transform(e, n) for e in (E0, E1) for n in (N0, N1)])
X0, X1, Y0, Y1 = min(xs) - 200, max(xs) + 200, min(ys) - 200, max(ys) + 200
out = open(sys.argv[1], 'w')
n = kept = bad = 0
inp = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace', newline='')
header = inp.readline().rstrip('\r\n')
out.write(json.dumps({'header': header}) + '\n')
for line in inp:
    n += 1
    if n % 500000 == 0:
        print('rows', n, 'kept', kept, file=sys.stderr, flush=True)
    k = line.find('((')
    if k < 0:
        continue
    k += 2
    while line[k] == '(':
        k += 1
    sp = line.find(' ', k)
    cm, cp = line.find(',', sp), line.find(')', sp)
    end = min(c for c in (cm, cp) if c > 0)
    try:
        x, y = float(line[k:sp]), float(line[sp + 1:end])
    except ValueError:
        bad += 1
        continue
    if not (X0 <= x <= X1 and Y0 <= y <= Y1):
        continue
    row = next(csv.reader([line]))
    try:
        g = wkt.loads(row[2])
        h = json.loads(row[3]) if row[3] else {}
    except Exception:
        bad += 1
        continue
    g = stransform(lambda a, b, c=None: tr.transform(a, b), g)
    c = g.representative_point()
    if not (E0 <= c.x <= E1 and N0 <= c.y <= N1):
        continue
    polys = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    rings = [[[[round(a, 2), round(b, 2)] for a, b in p.exterior.coords]] +
             [[[round(a, 2), round(b, 2)] for a, b in r.coords] for r in p.interiors] for p in polys]
    out.write(json.dumps({'id': row[0], 'src': row[1], 'h': h.get('value'), 'lin': h.get('lineage'), 'hs': h.get('source'),
                          'rest': row[4:], 'hraw': h if len(h) > 3 else None, 'poly': rings}, separators=(',', ':')) + '\n')
    kept += 1
out.close()
print(json.dumps({'rows': n, 'kept': kept, 'bad': bad, 'header': header}), file=sys.stderr, flush=True)
