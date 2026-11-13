#!/usr/bin/env python3
"""Suhl by bus: the timetable of the world's buses (viz3/extra/bus/quellen/fahrplan.py, unchanged – imported) with Suhl's roads in
its road network, so the trips that end at the edge of the world today run on into Suhl: line 203 Ratscher – Schleusingen – Suhl,
200–202 from Schleusingen, 300 (Ilmenau), 400 (Meiningen) and the city buses of the SNG Suhl/Zella-Mehlis (A1, A2, B, C1, C2, C12,
D1, D2, G, H, K, R …). The app loads it instead of the world's timetable only with ?suhl=… (welt/suhl.js SUHL.busPlan, hook B1 in
bus/bus.js) until the city is released.

    python3 -I tools/suhl/bus/fahrplan_suhl.py --gtfs latest.zip --suhl-fahrt <folder> [--woche 2026-11-16] [--cache <osm>] [--bild <png>]

--suhl-fahrt: the drive files of the street package suhl-strassen (its whole-city run, e.g. 43354754104, branch suhl/strassen
tools/suhl/out/strassen/stadt/fahrt/): suhl.json.gz (the city), suhl-anfahrt.json.gz (the approach outside Suhl's ground),
suhl-anfahrt-grund.json.gz (on its corridor tiles), suhl-orte.json.gz (built-up areas: 50 km/h inside them). Tunnels are left out.
Source of the timetable: gtfs.de, GTFS für Deutschland (frei), data provided by DELFI e.V., CC BY 4.0 (as the world's).
Output: viz3/extra/suhl-laufzeit/dist/bus/fahrplan_suhl.json (the format of the world's timetable; the build copies it to bus/).
"""
import argparse, gzip, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'viz3', 'extra', 'bus', 'quellen'))
import fahrplan as F  # noqa: E402  the world's bus tool, unchanged

OUT = os.path.join(REPO, 'viz3', 'extra', 'suhl-laufzeit', 'dist', 'bus', 'fahrplan_suhl.json')
FILES = ('suhl.json.gz', 'suhl-anfahrt.json.gz', 'suhl-anfahrt-grund.json.gz')


def suhl_ways(folder):
    """the ways of Suhl's drive files in the form of fahrplan.load_ways (kinds 0-5, no tunnels) and the built-up areas"""
    ways, towns = [], []
    for fn in FILES:
        s = json.load(gzip.open(os.path.join(folder, fn)))
        nm = s.get('names') or []
        for w in s['ways']:
            k, sf, w10, fl, ni, ri, q = w[:7]
            if k > 5 or fl & 2:
                continue
            n = len(q) // 3
            if n < 2:
                continue
            ways.append(dict(kind=k, hw=w10 / 20, p=[(q[3 * i] / 10, q[3 * i + 1] / 10) for i in range(n)], z=[q[3 * i + 2] / 10 for i in range(n)],
                             src='out', name=nm[ni] if isinstance(ni, int) and ni < len(nm) else '', ref=nm[ri] if isinstance(ri, int) and ri < len(nm) else ''))
    o = json.load(gzip.open(os.path.join(folder, 'suhl-orte.json.gz')))
    for pl in o.get('places', []):
        for r in pl.get('a', []):
            towns.append([(r[i], r[i + 1]) for i in range(0, len(r), 2)])
    return ways, towns


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--gtfs', required=True)
    ap.add_argument('--suhl-fahrt', required=True, dest='suhl')
    ap.add_argument('--woche', default='2026-11-16')
    ap.add_argument('--cache', default=None)
    ap.add_argument('--bild', default=None)
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args()
    world = F.load_ways
    sw, st = suhl_ways(a.suhl)

    def load_ways():
        ways, towns = world()
        print(f'Suhl: {len(sw)} ways and {len(st)} built-up areas added to the network of the world ({len(ways)} ways)', file=sys.stderr)
        return ways + sw, towns + st
    F.load_ways = load_ways
    F.OUT = a.out
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    sys.argv = [sys.argv[0], '--gtfs', a.gtfs, '--woche', a.woche] + (['--cache', a.cache] if a.cache else []) + (['--bild', a.bild] if a.bild else [])
    F.main()
    d = F.merge_alias(json.load(open(a.out)))     # as the world's timetable: the stop "Ratscher" is the one at the Schleusebrücke
    d['note_suhl'] = ('Fahrplan der Welt mit den Straßen von Suhl (tools/suhl/bus/fahrplan_suhl.py; Straßen: ' + os.path.basename(os.path.abspath(a.suhl))
                      + ') – nur mit ?suhl=… statt bus/fahrplan.json')
    with open(a.out, 'w') as f:
        json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
    suhl = [s['n'] for s in d['stations'] if s['n'].startswith('Suhl')]
    print(f"written {a.out}: {len(d['lines'])} lines, {len(d['stations'])} stations ({len(suhl)} in Suhl), {len(d['trips'])} trips", file=sys.stderr)


if __name__ == '__main__':
    main()
