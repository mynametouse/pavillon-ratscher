#!/usr/bin/env python3
"""Wikidata facts for our places (population with date, area, coordinates, German Wikipedia title, Commons category) -> OUT_DIR/wikidata_orte.json.
CC0.  python3 -I tools/daten/wikidata_orte.py OUT_DIR   (the Wikimedia APIs answer 429 on shared proxy addresses – run on GitHub Actions)"""
import json, os, sys, time, urllib.request
UA = 'pavillon-ratscher daten-katalog/1.0 (open-data research; github.com/mynametouse/pavillon-ratscher)'
ITEMS = {'Ratscher': 'Q2132850', 'Schleusingen': 'Q504914', 'Landkreis Hildburghausen': 'Q10372'}


def ent(q):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(f'https://www.wikidata.org/wiki/Special:EntityData/{q}.json', headers={'User-Agent': UA}), timeout=60) as r:
                return json.loads(r.read())['entities'][q]
        except Exception:
            time.sleep(4 * (i + 1))
    return None


def search(name):
    import urllib.parse
    u = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode({'action': 'wbsearchentities', 'search': name, 'language': 'de', 'limit': 5, 'format': 'json'})
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=60) as r:
        return json.loads(r.read()).get('search', [])


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    res = {}
    items = dict(ITEMS)
    for s in search('Kloster Veßra'):
        if 'Gemeinde' in (s.get('description') or '') or 'human settlement' in (s.get('description') or '') or 'municipality' in (s.get('description') or ''):
            items['Kloster Veßra'] = s['id']; break
    for name, q in items.items():
        d = ent(q)
        if not d:
            res[name] = {'id': q, 'fehler': 'nicht abrufbar'}; continue
        cl = d.get('claims', {})

        def vals(p):
            o = []
            for c in cl.get(p, []):
                v = c['mainsnak'].get('datavalue', {}).get('value')
                q_ = [x['datavalue']['value'].get('time') for x in c.get('qualifiers', {}).get('P585', []) if 'datavalue' in x]
                o.append({'wert': v, 'stand': q_})
            return o
        res[name] = {'id': q, 'bezeichnung': d.get('labels', {}).get('de', {}).get('value'), 'beschreibung': d.get('descriptions', {}).get('de', {}).get('value'), 'einwohner': vals('P1082'), 'flaeche': vals('P2046'), 'koordinate': vals('P625'),
                     'gehoert_zu': vals('P131'), 'commons_kategorie': vals('P373'), 'dewiki': d.get('sitelinks', {}).get('dewiki', {}).get('title'), 'denkmalliste': vals('P1435')[:3]}
        time.sleep(1)
    json.dump(res, open(os.path.join(out, 'wikidata_orte.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False)[:600])


if __name__ == '__main__': main()
