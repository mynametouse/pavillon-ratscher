#!/usr/bin/env python3
"""Sums per place from the cells cut by zensus_gitter.py: python3 -I tools/daten/zensus_zusammen.py CELLS_DIR OUT.json
Hidden cells (value '–' or under 3) count as 0, so every sum is a lower bound; the cells count says how many 100-m cells carry data."""
import json, sys, os

def num(v):
    v = (v or '').strip().replace(',', '.')
    try: return float(v)
    except ValueError: return 0.0

def main():
    src, dst = sys.argv[1], sys.argv[2]
    res = {}
    for area in ('ratscher', 'schleusingen', 'vessra'):
        d = json.load(open(os.path.join(src, f'zensus_{area}.json')))
        def cells(p): return d[p]['cells'], d[p]['columns']
        r = {}
        c, h = cells('Zensus2022_Bevoelkerungszahl')
        r['einwohner_summe'] = int(sum(num(x[3]) for x in c)); r['zellen_mit_einwohnern'] = len(c)
        c, h = cells('Zensus2022_Groesse_des_privaten_Haushalts_in_Gitterzellen')
        r['haushalte_summe'] = int(sum(num(x[3]) for x in c)); r['zellen_mit_haushalten'] = len(c)
        r['haushalte_nach_groesse'] = {h[i]: int(sum(num(x[i]) for x in c)) for i in range(4, len(h))}
        c, h = cells('Gebaeude_nach_Baujahr_Jahrzehnte')
        r['gebaeude_mit_wohnraum_summe'] = int(sum(num(x[3]) for x in c))
        r['gebaeude_nach_baujahr'] = {h[i]: int(sum(num(x[i]) for x in c)) for i in range(4, len(h))}
        c, h = cells('Gebaeude_mit_Wohnraum_nach_Gebaeudetyp_Groesse')
        r['gebaeude_nach_typ'] = {h[i]: int(sum(num(x[i]) for x in c)) for i in range(4, len(h))}
        c, h = cells('Zensus2022_Heizungsart')
        r['heizung_gebaeude'] = {h[i]: int(sum(num(x[i]) for x in c)) for i in range(3, len(h))}
        c, h = cells('Alter_in_10er-Jahresgruppen')
        r['alter_10er'] = {h[i]: int(sum(num(x[i].replace('â€“', '')) for x in c)) for i in range(3, len(h))}
        c, h = cells('Durchschnittsalter_in_Gitterzellen')
        cb, hb = cells('Zensus2022_Bevoelkerungszahl'); pop = {x[0]: num(x[3]) for x in cb}
        tw = sum(num(x[3]) * pop.get(x[0], 0) for x in c); tp = sum(pop.get(x[0], 0) for x in c)
        r['durchschnittsalter_gewichtet'] = round(tw / tp, 1) if tp else None
        c, h = cells('Zensus2022_Staatsangehoerigkeit_in_Gitterzellen')
        r['ausland_summe'] = int(sum(num(x[5]) for x in c))
        res[area] = r
    res['_hinweis'] = 'Zensus 2022, Gitterzellen 100 m, © Statistische Ämter des Bundes und der Länder, 2024 (Vervielfältigung und Verbreitung mit Quellenangabe gestattet); Zellen mit weniger als 3 Fällen sind verdeckt – Summen sind Untergrenzen; die Boxen der Orte stehen in tools/daten/zensus_gitter.py.'
    json.dump(res, open(dst, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False, indent=1))

if __name__ == '__main__': main()
