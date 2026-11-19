#!/usr/bin/env python3
"""The OSM input of baeume.py (--osm-ways, --osm-green: Overpass JSON with geometry) from dumps of the OSM editing API (the pieces
tools/welt/zone_trusetal.py fetches and caches, one folder per block): ways (highways, railways, power lines) and green areas (forest,
wood, scrub, orchards, tree rows, single trees, hedges, water, land use). The editing API answers from the chat machine where the Overpass
servers time out (Karten-Chat, 19.11.2026).

  python3 tools/weltwald/osm_api.py OUT_DIR DUMP_DIR [DUMP_DIR …]     → OUT_DIR/ways.json, OUT_DIR/green.json
"""
import glob, json, os, sys

out, dirs = sys.argv[1], sys.argv[2:]
N, W, R = {}, {}, {}
for d in dirs:
    for f in sorted(glob.glob(os.path.join(d, 'p*.json'))):
        for el in json.load(open(f))['elements']:
            {'node': N, 'way': W, 'relation': R}[el['type']][el['id']] = el
geom = lambda w: [{'lat': N[n]['lat'], 'lon': N[n]['lon']} for n in w['nodes'] if n in N]
ways, green = [], []
for w in W.values():
    t = w.get('tags', {})
    e = {'type': 'way', 'id': w['id'], 'tags': t, 'geometry': geom(w)}
    if 'highway' in t or t.get('railway') in ('rail', 'light_rail', 'disused', 'abandoned', 'narrow_gauge') or t.get('power') == 'line':
        ways.append(e)
    if any(k in t for k in ('landuse', 'natural', 'barrier', 'leisure', 'waterway')):
        green.append(e)
for r in R.values():
    t = r.get('tags', {})
    if t.get('landuse') in ('forest', 'orchard') or t.get('natural') in ('wood', 'scrub', 'water', 'wetland'):
        green.append({'type': 'relation', 'id': r['id'], 'tags': t, 'members': [
            {'type': 'way', 'ref': m['ref'], 'role': m['role'], 'geometry': geom(W[m['ref']])} for m in r['members'] if m['type'] == 'way' and m['ref'] in W]})
for n in N.values():
    if n.get('tags', {}).get('natural') == 'tree':
        green.append({'type': 'node', 'id': n['id'], 'lat': n['lat'], 'lon': n['lon'], 'tags': n['tags']})
os.makedirs(out, exist_ok=True)
json.dump({'elements': ways}, open(os.path.join(out, 'ways.json'), 'w'))
json.dump({'elements': green}, open(os.path.join(out, 'green.json'), 'w'))
print(len(N), 'nodes;', len(ways), 'ways,', len(green), 'green features →', out)
# (the first push of kern/wald starts no run: this line came with the second)
