#!/usr/bin/env python3
"""Suhl by bus: the timetable of the world's buses (viz3/extra/bus/quellen/fahrplan.py, imported) with Suhl's roads in
its road network, so the trips that end at the edge of the world today run on into Suhl: line 203 Ratscher – Schleusingen – Suhl,
200–202 from Schleusingen, 300 (Ilmenau), 400 (Meiningen) and the city buses of the SNG Suhl/Zella-Mehlis (A1, A2, B, C1, C2, C12,
D1, D2, G, H, K, R …). The app loads it instead of the world's timetable (welt/suhl.js SUHL.busPlan, hook B1 in bus/bus.js; off with
?suhl=0). Per point of a pattern on Suhl's ways the lane's offset 'o' (dm; hook B2 in bus/bus_fahrplan.js).

    python3 -I tools/suhl/bus/fahrplan_suhl.py --gtfs latest.zip --suhl-fahrt <folder> [--woche 2026-11-16] [--cache <osm>] [--bild <png>]

--suhl-fahrt: the drive files of the street package suhl-strassen (its whole-city run, e.g. 43354754104, branch suhl/strassen
tools/suhl/out/strassen/stadt/fahrt/): suhl.json.gz (the city), suhl-anfahrt.json.gz (the approach outside Suhl's ground),
suhl-anfahrt-grund.json.gz (on its corridor tiles), suhl-orte.json.gz (built-up areas: 50 km/h inside them). Tunnels are left out.
Source of the timetable: gtfs.de, GTFS für Deutschland (frei), data provided by DELFI e.V., CC BY 4.0 (as the world's).
Output: viz3/extra/suhl-laufzeit/dist/bus/fahrplan_suhl.json (the format of the world's timetable; the build copies it to bus/).
"""
import argparse, gzip, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'viz3', 'extra', 'bus', 'quellen'))
import fahrplan as F  # noqa: E402  the world's bus tool, imported

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


def lane_offsets(d, folder):
    """per point of each pattern on Suhl's ways the lane's distance right of the way's centre line in dm (-1: the app's own 1.55 m):
    a one-way street in its middle or its right lane, a two-way street in the right lane, a narrow street with the bus over the centre
    line rather than over the kerb (feat/suhl, Falko 13.11.2026 22:03: „die Busse fahren auch nicht auf den Straßen“) – read by the app
    as P.O (hook B2 in bus/bus_fahrplan.js)"""
    C = 20.0
    grid = {}
    for fn in FILES:
        s = json.load(gzip.open(os.path.join(folder, fn)))
        lanes = s.get('lanes') or []
        for wi, w in enumerate(s['ways']):
            k, sf, w10, fl, ni, ri, q = w[:7]
            if k > 5 or fl & 2:
                continue
            hw, n = w10 / 20, (lanes[wi] if wi < len(lanes) else 0) or 0
            if fl & 4:
                n = n or (1 if hw < 3.2 else 2)
            else:
                n = n if n >= 2 else 2
            o = min(hw - hw / n, max(0.0, hw - 1.3))
            P = [(q[3 * i] / 10, q[3 * i + 1] / 10) for i in range(len(q) // 3)]
            for (ax, ay), (bx, by) in zip(P, P[1:]):
                for cx in range(int(math.floor(min(ax, bx) / C)), int(math.floor(max(ax, bx) / C)) + 1):
                    for cy in range(int(math.floor(min(ay, by) / C)), int(math.floor(max(ay, by) / C)) + 1):
                        grid.setdefault((cx, cy), []).append((ax, ay, bx, by, o))

    def seg_o(x, y, ux, uy):
        best = None
        for s in grid.get((int(math.floor(x / C)), int(math.floor(y / C))), ()):
            ax, ay, bx, by, o = s
            ex, ey = bx - ax, by - ay
            l2 = ex * ex + ey * ey
            if l2 < 1e-6:
                continue
            l = math.sqrt(l2)
            if abs((ex * ux + ey * uy) / l) < 0.85:
                continue
            t = max(0.0, min(1.0, ((x - ax) * ex + (y - ay) * ey) / l2))
            dd = math.hypot(x - ax - ex * t, y - ay - ey * t)
            if dd < 1.0 and (best is None or dd < best[0]):
                best = (dd, o)
        return None if best is None else best[1]

    touched = 0
    for p in d['pats']:
        xy = p['p']
        n = len(xy) // 2
        seg = []
        for i in range(n - 1):
            x0, y0, x1, y1 = xy[2 * i] / 10, xy[2 * i + 1] / 10, xy[2 * i + 2] / 10, xy[2 * i + 3] / 10
            L = math.hypot(x1 - x0, y1 - y0)
            seg.append(None if L < 1e-3 else seg_o((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / L, (y1 - y0) / L))
        if not any(v is not None for v in seg):
            continue
        touched += 1
        o = []
        for i in range(n):
            vs = [v for v in (seg[i - 1] if i > 0 else None, seg[i] if i < n - 1 else None) if v is not None]
            o.append(round(min(vs) * 10) if vs else -1)
        p['o'] = o
    return touched


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
    print(f'lanes: offsets for {lane_offsets(d, a.suhl)} patterns on Suhl\'s ways', file=sys.stderr)
    d['note_suhl'] = ('Fahrplan der Welt mit den Straßen von Suhl (tools/suhl/bus/fahrplan_suhl.py; Straßen: ' + os.path.basename(os.path.abspath(a.suhl))
                      + ') – nur mit ?suhl=… statt bus/fahrplan.json')
    with open(a.out, 'w') as f:
        json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
    suhl = [s['n'] for s in d['stations'] if s['n'].startswith('Suhl')]
    print(f"written {a.out}: {len(d['lines'])} lines, {len(d['stations'])} stations ({len(suhl)} in Suhl), {len(d['trips'])} trips", file=sys.stderr)


if __name__ == '__main__':
    main()
