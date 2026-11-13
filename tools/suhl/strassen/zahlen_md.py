#!/usr/bin/env python3
"""suhl-strassen: the numbers of a run as German tables, written into docs/features/suhl-strassen.md between the markers
<!-- zahlen:<name> --> and <!-- /zahlen:<name> --> – so that every number in the document comes from a file of the run.

  python3 -I tools/suhl/strassen/zahlen_md.py probe tools/suhl/out/strassen/probe
  python3 -I tools/suhl/strassen/zahlen_md.py stadt tools/suhl/out/strassen/stadt
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
DOC = os.path.join(REPO, 'docs', 'features', 'suhl-strassen.md')


def de(v, n=1):
    s = f'{v:,.{n}f}'.replace(',', ' ').replace('.', ',')
    return s


def gz(v):
    return f'{int(round(v)):,}'.replace(',', ' ')


def load(d, name):
    p = os.path.join(d, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def tables(name, d):
    z = load(d, 'zahlen.json')
    if z is None:
        return f'(noch keine Zahlen in `{os.path.relpath(d, REPO)}`)\n'
    rel = os.path.relpath(d, REPO)
    o = []
    h = z['heights']
    o.append(f"Aus `{rel}/zahlen.json` (Lauf vom {z['made'][:10]} {z['made'][11:16]} UTC, OSM-Stand {z['osm_stamp'][:16].replace('T', ' ')} UTC, {z['tiles']} Kacheln). "
             f"Längen sind echte Meter (UTM).\n")
    o.append(f"**Gerechnet auf:** {h['solved_on']}. " + ('Der Lauf zählt (ein Boden für alle).' if h.get('zaehlt') else '**Der Lauf zählt nicht** – er prüft nur die Technik.') + '\n')
    kk, wk = z['km_by_kind'], z['ways_by_kind']
    o.append('| Art in den Fahrtdaten | km | OSM-Wege |\n|---|---:|---:|')
    for k in kk:
        o.append(f"| `{k}` | {de(kk[k], 2)} | {gz(wk.get(k, 0))} |")
    o.append(f"| **zusammen** | **{de(z['km'])}** | **{gz(sum(wk.values()))}** |\n")
    if z.get('korridor'):
        c = z['korridor']
        o.append(f"Davon **Anfahrt** (Fahrstraßen an den zwei Routen außerhalb der Stadt-Kacheln): {c['tiles']} Kacheln, {gz(c['ways'])} Stücke, {de(c['km'])} km "
                 f"({', '.join(f'`{k}` {de(v)}' for k, v in c['km_by_kind'].items())}); {gz(c['pinned_nodes'])} Punkte am Profil von `fahrt/strassen.json` gehalten.\n")
    ar = z.get('areas', {})
    nm = {'platz': 'Fußgängerflächen und Plätze', 'parken': 'Parkplätze', 'bus': 'Busbahnhöfe', 'steig': 'Bahn- und Bussteige'}
    o.append('Flächen: ' + '; '.join(f"{ar[k]['n']} {nm[k]} mit {gz(ar[k]['m2'])} m²" for k in ('platz', 'parken', 'bus', 'steig') if k in ar) + '. '
             f"Brückenstücke: {z['bridges']}, Tunnelstücke: {z['tunnels']}. "
             f"Fahrbahnen an Häusern: {gz(z['buildings']['narrowed'])} verschmälert, {gz(z['buildings']['into_building'])} führen in ein Gebäude.\n" if 'buildings' in z else '')
    r = z.get('rail_km', {})
    if r:
        o.append('Bahn: ' + ', '.join(f'{k} {de(v, 2)} km' for k, v in r.items()) + '; ' + ', '.join(f'{v} × {k}' for k, v in z.get('rail_points', {}).items()) + '.')
    w = z.get('water_km', {})
    if w:
        o.append('Wasser: ' + ', '.join(f'{k} {de(v, 2)} km' for k, v in w.items()) + f"; {z['water_areas']['n']} Wasserflächen mit {gz(z['water_areas']['m2'])} m². "
                 'Mit Namen: ' + ', '.join(f'{k} {de(v, 2)} km' for k, v in list(z.get('water_named_km', {}).items())[:8]) + '.\n')
    o.append('| Art (Regel der Region) | km | Wellen je km vorher → nachher | Steigungswechsel je 10 m in % | größte Steigung nachher | Grenze | eingehalten |\n|---|---:|---|---|---:|---|---|')
    m = z['metric']
    for k in ('motorway', 'main', 'county', 'street', 'lane', 'service', 'track', 'path', 'foot', 'rail'):
        if k not in m:
            continue
        q = m[k]
        g = q.get('grenzwerte')
        o.append(f"| `{k}` | {de(q['km'])} | {de(q['wellen_je_km_vorher'])} → **{de(q['wellen_je_km'])}** | {de(q['steigungswechsel_10m_vorher'], 2)} → {de(q['steigungswechsel_10m'], 2)} | "
                 f"{de(q['max_steigung'])} % | " + (f"{g['wellen_je_km']} / {de(g['steigungswechsel_10m'])} | {'ja' if q['test'] else '**nein**'} |" if g else '– | – |'))
    o.append('')
    J = z['junctions']
    o.append(f"Kreuzungen (Knoten mit drei und mehr Armen; größte Abweichung von einer Ebene, 3 m um den Knoten): {gz(J['alle']['n'])} Knoten, Mitte {de(J['alle']['median_cm'])} cm, "
             f"95 % unter {de(J['alle']['p95_cm'])} cm, größte {de(J['alle']['max_cm'])} cm; **{de(J['alle']['share_within_3cm'] * 100)} % innerhalb von 3 cm** "
             f"(Kreuzungen von Fahrstraßen: {gz(J['fahr']['n'])} Knoten, {de(J['fahr']['share_within_3cm'] * 100)} %).")
    C = z['clearance']
    o.append(f"Brücken über anderen Wegen: {C['crossings']} Stellen, an {C['low']} davon weniger als {de(C['clear_m'])} m Abstand.")
    s = z['solve']
    o.append(f"Rechnung: {gz(z['nodes'])} Punkte; {gz(s['joints'])} Nahtstellen geglättet, {gz(s['flat'])} Zeilen für ebene Kreuzungen, {gz(s['twins'])} Verbindungen zwischen "
             f"Richtungsfahrbahnen; Brücken bis {de(s['lift_max_m'], 2)} m angehoben; Glättung der kleinen Klassen × {de(s['grob'])}. "
             f"Größe: Kacheln {gz(z['bytes_tiles'] / 1000)} kB, Datei im Format der Fahrtdaten {gz(z['bytes_drive'] / 1000)} kB.\n")
    mo = load(d, 'moebel.json')
    if mo:
        c = mo['counts']
        nn = {'pfosten': 'Leitpfosten', 'planken': 'Schutzplanken-Stücke', 'schilder': 'Verkehrszeichen', 'lampen': 'Laternen', 'linien': 'Halt-, Wartelinien und Zebrastreifen',
              'masten': 'Strommasten', 'ampeln': 'Ampelknoten', 'querungen': 'Querungen', 'halte': 'Bushaltestellen', 'namen': 'Straßennamensschilder'}
        o.append(f"**Ausstattung** (`{rel}/moebel.json`): " + ', '.join(f'{gz(c[k])} {nn[k]}' for k in nn if k in c) +
                 f". Schutzplanken {de(mo['guard_rail_m'] / 1000)} km. Zeichen nach Nummer: " + ', '.join(f'{k}: {v}' for k, v in mo['signs_by_code'].items()) +
                 f". Ampeln: {mo['signals']['Fahrzeuge']} für Fahrzeuge, {mo['signals']['Fußgänger']} für Fußgänger, {mo['signals']['masts']} Masten. Querungen: " +
                 ', '.join(f'{v} {k}' for k, v in mo['crossings_by_type'].items()) + f". Haltestellen mit Namen: {mo['bus_stops_named']}. "
                 f"Orte: {', '.join(f'{n} ({k})' for n, k in mo['places'])}. Größe: Kacheln {gz(mo['bytes_tiles'] / 1000)} kB, eine Datei {gz(mo['bytes_one_file'] / 1000)} kB.\n")
    ro = load(d, 'routen.json')
    if ro:
        o.append(f"**Routen** (`{rel}/routen.json`, OSM-Stand {ro['osm_stamp'][:10]}):\n")
        o.append('| Route | Länge (echt) | Modellmeter | Fahrzeit | davon Autobahn | Verlauf | Tunnel |\n|---|---:|---:|---:|---:|---|---|')
        lab = {'suhl_land': 'Landstraße hin', 'suhl_land_rueck': 'Landstraße zurück', 'suhl_ab': 'Autobahn hin, über die Anschlussstelle Suhl-Zentrum',
               'suhl_ab_frei': 'Autobahn hin, frei gerechnet (Autobahntunnel gesperrt)', 'suhl_ab_rueck': 'Autobahn zurück, frei gerechnet'}
        for k, v in ro['routes'].items():
            legs = ' → '.join(f"{l['road']} {de(l['m'] / 1000)}" for l in v['legs'] if l['m'] >= 300)
            o.append(f"| {lab.get(k, k)} | {de(v['true_m'] / 1000, 2)} km | {gz(v['model_m'])} | {de(v['minutes'])} min | {de(v['motorway_m'] / 1000)} km | {legs} | "
                     f"{', '.join(t or 'ohne Namen' for t in v['tunnels']) or '–'} |")
        fa = ro.get('first_attempt_2026_10_26')
        if fa:
            o.append(f"\nErster Versuch vom 26.10.: Autobahn {gz(fa['suhl_ab']['model_m'])} Modellmeter durch den {', '.join(fa['suhl_ab']['tunnels'])}; "
                     f"Landstraße {gz(fa['suhl_land']['model_m'])} Modellmeter.\n")
    pr = load(d, 'pruefung.json')
    if pr:
        o.append(f"**Prüfungen** (`{rel}/pruefung.json`):\n")
        o.append('| Prüfung | Ergebnis | bestanden |\n|---|---|---|')
        for a, v in pr['zaehlung'].items():
            o.append(f"| Zählung `{a}` gegen Stufe 1 | {de(v['hier_km'])} km hier, {de(v['stufe1_km'])} km in Stufe 1 ({de(v['differenz_prozent'], 2)} %) | {'ja' if v['ok'] else '**nein**'} |")
        g = pr['gebaeude_in_fahrbahn']
        o.append(f"| kein Gebäude in einer Fahrbahn (Grenze 0,3 m) | {g['treffer']} Treffer an {g['strassenstuecke_betroffen']} von {gz(g['strassen_geprueft'])} Straßenstücken, "
                 f"{g['gebaeude_betroffen']} von {gz(g['gebaeude'])} Gebäuden (OSM); {g.get('fuehren_in_ein_gebaeude', 0)} Wege führen in ein Gebäude und sind so gemerkt | {'ja' if g['ok'] else '**nein**'} |")
        k = pr['kreuzungen']
        o.append(f"| Kreuzungen eben (±3 cm) | {de(k['fahrstrassen']['share_within_3cm'] * 100)} % der Fahrstraßen-Kreuzungen, 95 % unter {de(k['fahrstrassen']['p95_cm'])} cm | {'ja' if k['ok'] else '**nein**'} |")
        p = pr['profile']
        o.append(f"| Profile je Klasse in den Grenzen | {sum(1 for q in p['klassen'].values() if q['ok'])} von {len(p['klassen'])} Klassen | {'ja' if p['ok'] else '**nein**'} |")
        b = pr['bruecken']
        o.append(f"| Brücken mit 4,5 m Abstand zum Weg darunter | {b['unter_4_5_m']} von {b['kreuzungen_mit_anderen_wegen']} Stellen darunter | {'ja' if b['ok'] else '**nein**'} |")
        e = pr['kachelkanten']
        o.append(f"| Kachelkanten: gleiche Punkte, gleiche Höhe | {gz(e['uebergaenge'])} Übergänge, {e['lage_ueber_0_1_m']} mit mehr als 0,1 m Abstand, {e['hoehe_ungleich']} mit ungleicher Höhe | {'ja' if e['ok'] else '**nein**'} |")
        o.append('')
    return '\n'.join(o) + '\n'


def main():
    name, d = sys.argv[1], os.path.abspath(sys.argv[2])
    txt = tables(name, d)
    s = open(DOC, encoding='utf-8').read()
    a, b = f'<!-- zahlen:{name} -->', f'<!-- /zahlen:{name} -->'
    if a not in s or b not in s:
        print(txt)
        raise SystemExit(f'markers {a} … {b} not found in {DOC}: tables printed only')
    i0, i1 = s.index(a) + len(a), s.index(b)
    s = s[:i0] + '\n' + txt + s[i1:]
    open(DOC, 'w', encoding='utf-8').write(s)
    print('written', name, len(txt), 'characters')


if __name__ == '__main__':
    main()
