# settlements, mountains, waters, forests and landmarks of South Thuringia from Wikidata (CC0) inside a lat/lon box (feat/karte)
#   python3 tools/karte/wd_orte.py RAW/wd_orte.json   (then tools/karte/orte.py)
import json, sys, time, urllib.request, urllib.parse
S, W, N, E = 50.15, 9.95, 50.85, 11.45
Q = """
SELECT ?item ?itemLabel ?t ?lat ?lon ?pop ?in ?inLabel WHERE {
  SERVICE wikibase:box { ?item wdt:P625 ?c . bd:serviceParam wikibase:cornerSouthWest "Point(%f %f)"^^geo:wktLiteral .
                         bd:serviceParam wikibase:cornerNorthEast "Point(%f %f)"^^geo:wktLiteral . }
  ?item wdt:P31 ?t .
  VALUES ?t { %s }
  BIND(geof:latitude(?c) AS ?lat) BIND(geof:longitude(?c) AS ?lon)
  OPTIONAL { ?item wdt:P1082 ?pop . }
  OPTIONAL { ?item wdt:P131 ?in . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}"""
GROUPS = {
  'ort': 'wd:Q262166 wd:Q42744322 wd:Q116457956 wd:Q253019 wd:Q532 wd:Q5084 wd:Q1549591 wd:Q515 wd:Q3957 wd:Q123705 wd:Q2514025 wd:Q1115575 wd:Q1867183 wd:Q15715406',
  'natur': 'wd:Q8502 wd:Q54050 wd:Q4421 wd:Q131681 wd:Q23397 wd:Q4022 wd:Q47521 wd:Q1898954 wd:Q46831 wd:Q190429 wd:Q179049 wd:Q1286517',
  'bau': 'wd:Q23413 wd:Q16970 wd:Q33506 wd:Q16560 wd:Q44539 wd:Q55488 wd:Q12280 wd:Q1137809 wd:Q2977',
  'bau2': 'wd:Q12323 wd:Q751876 wd:Q1785071 wd:Q44613 wd:Q160742 wd:Q109607 wd:Q22698 wd:Q12518 wd:Q1440300 wd:Q820477 wd:Q130003 wd:Q1076486 wd:Q35509 wd:Q15243209',
}
out = {}
for g, vals in GROUPS.items():
    q = Q % (W, S, E, N, vals)
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q, 'format': 'json'})
    req = urllib.request.Request(url, headers={'User-Agent': 'pavillon-ratscher-analyse/1.0 (private, one-off)'})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    rows = d['results']['bindings']
    for r in rows:
        qid = r['item']['value'].rsplit('/', 1)[1]
        o = out.setdefault(qid, {'q': qid, 'n': r['itemLabel']['value'], 'g': 'bau' if g == 'bau2' else g, 'lat': float(r['lat']['value']), 'lon': float(r['lon']['value']), 't': set(), 'in': {}})
        o['t'].add(r['t']['value'].rsplit('/', 1)[1])
        if 'pop' in r:
            try: o['pop'] = max(o.get('pop', 0), int(float(r['pop']['value'])))
            except Exception: pass
        if 'in' in r: o['in'][r['in']['value'].rsplit('/', 1)[1]] = r.get('inLabel', {}).get('value', '')
    print(g, len(rows), file=sys.stderr)
    time.sleep(2)
for o in out.values(): o['t'] = sorted(o['t'])
json.dump(list(out.values()), open(sys.argv[1], 'w'), ensure_ascii=False)
print(len(out))
