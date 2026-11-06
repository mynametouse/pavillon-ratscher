#!/usr/bin/env python3
"""feat/welt-gebaeude: stream ETHOS.BUILDA DEG.csv (Thuringia, EPSG:3035 WKT) from stdin, keep the buildings of our area (Suhl to south of
Ratscher, Kloster Vessra in the west: UTM E 610000..640000, N 5580000..5616000) and write them in UTM 25832 as JSON lines.

  curl -sSL https://zenodo.org/api/records/11845992/files/DEG.csv/content | python3 -I tools/welt-gebaeude/filter_ethos.py OUT.jsonl
"""
import sys, json, csv, io
from pyproj import Transformer
from shapely import wkt
from shapely.ops import transform as stransform  # noqa (deprecated in shapely 2.1, still works)

out = open(sys.argv[1], 'w')
# area of interest (UTM): Suhl in the north to south of Ratscher, Kloster Vessra in the west
E0, E1, N0, N1 = 610000, 640000, 5580000, 5616000
X0, X1, Y0, Y1 = 4359892 - 200, 4390381 + 200, 3027495 - 200, 3063898 + 200
tr = Transformer.from_crs(3035, 25832, always_xy=True)
n = kept = bad = 0
inp = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace', newline='')
header = inp.readline()
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
    cm = line.find(',', sp)
    cp = line.find(')', sp)
    end = min(c for c in (cm, cp) if c > 0)
    try:
        x = float(line[k:sp])
        y = float(line[sp + 1:end])
    except ValueError:
        bad += 1
        continue
    if not (X0 <= x <= X1 and Y0 <= y <= Y1):
        continue
    row = next(csv.reader([line]))
    try:
        g = wkt.loads(row[2])
        h = json.loads(row[3])
    except Exception:
        bad += 1
        continue
    g = stransform(lambda a, b, c=None: tr.transform(a, b), g)
    c = g.representative_point()
    if not (E0 <= c.x <= E1 and N0 <= c.y <= N1):
        continue
    polys = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    rings = []
    for p in polys:
        rings.append([[[round(a, 2), round(b, 2)] for a, b in p.exterior.coords]] +
                     [[[round(a, 2), round(b, 2)] for a, b in r.coords] for r in p.interiors])
    out.write(json.dumps({'id': row[0], 'src': row[1], 'h': h.get('value'), 'lin': h.get('lineage'), 'hs': h.get('source'),
                          'poly': rings}, separators=(',', ':')) + '\n')
    kept += 1
out.close()
print('done rows', n, 'kept', kept, 'bad', bad, file=sys.stderr, flush=True)
