#!/usr/bin/env python3
"""suhl-strassen: the checks of the data (plan 5.3), without a browser, on the output of lauf.py.

  python3 -I tools/suhl/strassen/pruefen.py --out tools/suhl/out/strassen/probe [--opl suhl.opl.gz]

1. Counting: kilometres per OSM class inside the areas (zentrum, kernstadt, stadt – those the run's tiles cover) against stage 1
   (tools/suhl/out/bestand/osm_bestand.json).
2. No building inside a carriageway: every road for cars (not on a bridge, in a tunnel, through a house) against the building
   footprints – OpenStreetMap here; the limit is 0.3 m as in the test of welt-gebaeude.
3. Junctions level, profiles within the limits of their class: the numbers lauf.py measured (zahlen.json), judged here.
4. Tile edges: the two pieces of a way on both sides of an edge meet in the same point with the same height.
-> <out>/pruefung.json. The script reports and never fails a run: what does not hold is listed.
© OpenStreetMap contributors (ODbL 1.0).
"""
import argparse, collections, glob, json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import numpy as np
import sslib as S
import suhllib as L


def is_building(t):
    """a building that stands on the ground (no roof over a filling station, no carport, nothing underground or on a bridge)"""
    b = t.get('building')
    if not b or b in ('no', 'roof', 'carport'):
        return False
    if t.get('location') == 'underground' or 'bridge' in t:
        return False
    try:
        if int(t.get('layer', '0')) < 0:
            return False
    except ValueError:
        pass
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(S.OUT, 'probe'))
    ap.add_argument('--opl')
    ap.add_argument('--api-dir')
    a = ap.parse_args()
    t0 = time.time()
    from shapely.geometry import LineString, box as sbox
    from shapely.ops import unary_union
    from shapely.prepared import prep
    from shapely.strtree import STRtree
    fz = [p for p in sorted(glob.glob(os.path.join(a.out, 'fahrt', '*.json'))) if not os.path.basename(p).startswith('routen')]
    F = json.load(open(fz[0], encoding='utf-8'))
    Z = json.load(open(os.path.join(a.out, 'zahlen.json'), encoding='utf-8'))
    idx = json.load(open(os.path.join(a.out, L.index_path('s', 0)), encoding='utf-8'))
    T = [tuple(t) for t in L.tileset_decode(idx['tiles'][str(S.LEVEL)])]
    cover = unary_union([sbox(*L.tbounds(S.LEVEL, x, y)) for x, y in T])
    res = {'made': S.now(), 'run': os.path.relpath(a.out, S.REPO), 'drive_file': os.path.basename(fz[0]), 'tiles': len(T)}
    # the ways in UTM
    W = []
    for n, (k, sf, w10, fl, ni, ri, q) in enumerate(F['ways']):
        P = np.asarray(q, float).reshape(-1, 3) / 10.0
        E, N = S.m2u(P[:, 0], P[:, 1])
        W.append((n, k, w10 / 10.0, fl, F['hws'][F['hw'][n]], F['names'][ni], LineString(np.c_[E, N]), F['ids'][n]))
    # ---- 1. counting against stage 1 ----
    areas, _ = S.gebiete()
    best = json.load(open(os.path.join(S.REPO, 'tools', 'suhl', 'out', 'bestand', 'osm_bestand.json'), encoding='utf-8'))['strassenraum']
    res['zaehlung'] = {}
    for aid in ('zentrum', 'kernstadt', 'stadt'):
        poly = areas[aid]
        if poly.difference(cover).area > 0.002 * poly.area:
            continue
        pp = prep(poly)
        km = collections.Counter()
        for n, k, w, fl, hw, name, ln, wid in W:
            if pp.contains(ln):
                km[hw] += ln.length / 1000
            elif pp.intersects(ln):
                km[hw] += ln.intersection(poly).length / 1000
        ref = best[aid]['highway_km']
        tot, rtot = sum(km.values()), best[aid]['highway_km_gesamt']
        cls = {}
        for h in sorted(set(km) | set(ref), key=lambda q: -max(km.get(q, 0), ref.get(q, 0))):
            if h == 'sonstige':
                continue
            cls[h] = {'hier_km': round(km.get(h, 0), 2), 'stufe1_km': ref.get(h, 0), 'differenz_km': round(km.get(h, 0) - ref.get(h, 0), 2)}
        res['zaehlung'][aid] = {'hier_km': round(tot, 1), 'stufe1_km': rtot, 'differenz_prozent': round(100 * (tot - rtot) / rtot, 2), 'klassen': cls,
                                'ok': abs(tot - rtot) / rtot < 0.03,
                                'hinweis': 'Stufe 1 zählt auch Baustellen, Bahnsteige und Flächen-Wege (sonstige, platform); hier stehen Flächen in areas'}
        S.log('Zählung', aid, round(tot, 1), 'km hier,', rtot, 'km in Stufe 1,', res['zaehlung'][aid]['differenz_prozent'], '%')
    # ---- 2. buildings in a carriageway ----
    tb = [L.tbounds(S.LEVEL, x, y) for x, y in T]
    core = (min(b[0] for b in tb), min(b[1] for b in tb), max(b[2] for b in tb), max(b[3] for b in tb))
    lo0, la0 = S.u2ll(core[0], core[1])
    lo1, la1 = S.u2ll(core[2], core[3])
    o = S.load_osm(opl=a.opl, api_dir=a.api_dir, box=(min(lo0, lo1) - 0.002, min(la0, la1) - 0.002, max(lo0, lo1) + 0.002, max(la0, la1) + 0.002))
    B, Bid = [], []
    for kind, i, t, p in o.areas(is_building):
        if p.intersects(cover):
            B.append(p)
            Bid.append((f'{kind}{i}', t.get('building'), t.get('name', '')))
    tree = STRtree(B)
    LIMIT = 0.3
    hits = []
    n_roads = 0
    for n, k, w, fl, hw, name, ln, wid in W:
        if k > 5 or fl & (1 | 2 | 2048 | 4096) or hw in ('pedestrian',):
            continue
        n_roads += 1
        hwid = w / 2
        if hwid <= LIMIT:
            continue
        for j in tree.query(ln.buffer(hwid - LIMIT), predicate='intersects'):
            depth = hwid - ln.distance(B[j])
            hits.append((round(float(depth), 2), wid, name or hw, round(w, 1), Bid[j][0], Bid[j][1], Bid[j][2]))
    hits.sort(reverse=True)
    by_road = collections.Counter(h[1] for h in hits)
    res['gebaeude_in_fahrbahn'] = {
        'quelle_gebaeude': 'OpenStreetMap (building=*, ohne Dächer und Carports, ohne Unterirdisches) – die Grundrisse von suhl-gebaeude folgen',
        'gebaeude': len(B), 'strassen_geprueft': n_roads, 'grenze_m': LIMIT, 'treffer': len(hits), 'strassenstuecke_betroffen': len(by_road),
        'gebaeude_betroffen': len({h[4] for h in hits}), 'ok': len(hits) == 0,
        'tiefste': [{'tiefe_m': h[0], 'osm_weg': h[1], 'strasse': h[2], 'breite_m': h[3], 'gebaeude': h[4], 'art': h[5], 'name': h[6]} for h in hits[:25]],
        'hinweis': 'Tiefe = halbe Fahrbahnbreite minus Abstand der Achse zum Grundriss; meist ist die angenommene Breite zu groß oder die OSM-Achse liegt neben der Fahrbahn',
    }
    S.log('Gebäude in der Fahrbahn:', len(hits), 'Treffer an', len(by_road), 'Straßenstücken von', n_roads, '(', len(B), 'Gebäude ); tiefster', hits[0][:4] if hits else '-')
    # ---- 3. junctions, profiles ----
    J = Z.get('junctions', {})
    res['kreuzungen'] = {'ziel': 'jede Kreuzung eine Ebene, ±3 cm (3 m um den Knoten)', 'alle': J.get('alle'), 'fahrstrassen': J.get('fahr'),
                         'ok': bool(J.get('fahr', {}).get('share_within_3cm', 0) >= 0.999)}
    prof = {}
    for kind, r in Z.get('metric', {}).items():
        if 'grenzwerte' in r:
            prof[kind] = {'km': r['km'], 'wellen_je_km': r['wellen_je_km'], 'grenze_wellen': r['grenzwerte']['wellen_je_km'],
                          'steigungswechsel_10m': r['steigungswechsel_10m'], 'grenze_steigungswechsel': r['grenzwerte']['steigungswechsel_10m'], 'ok': r['test']}
    res['profile'] = {'klassen': prof, 'ok': all(p['ok'] for p in prof.values()), 'gerechnet_auf': Z.get('heights', {}).get('solved_on')}
    C = Z.get('clearance', {})
    res['bruecken'] = {'kreuzungen_mit_anderen_wegen': C.get('crossings'), 'unter_4_5_m': C.get('low'), 'ok': C.get('low') == 0, 'niedrigste': C.get('lowest', [])[:8]}
    # ---- 4. tile edges ----
    pieces = collections.defaultdict(list)
    for x, y in T:
        t = json.load(open(os.path.join(a.out, L.tile_path('s', 0, S.LEVEL, x, y)), encoding='utf-8'))
        ox, oy = int(round(t['o'][0] * 10)), int(round(t['o'][1] * 10))
        for w in t['ways']:
            q = w[6]
            pieces[w[7]].append((w[8], (q[0] + ox, q[1] + oy, q[2]), (q[-3] + ox, q[-2] + oy, q[-1]), sum(math.hypot(q[i + 3] - q[i], q[i + 4] - q[i + 1]) for i in range(0, len(q) - 3, 3)), (x, y)))
    n_edge = bad_xy = bad_z = 0
    worst = 0.0
    for wid, ps in pieces.items():
        ps.sort()
        for (s0a, a0, a1, la, ta), (s0b, b0, b1, lb, tb_) in zip(ps[:-1], ps[1:]):
            if ta == tb_ or abs((s0a + la) - s0b) > 3:
                continue        # not the same run (a way leaving the tile set and coming back), or the same tile
            n_edge += 1
            d = math.hypot(a1[0] - b0[0], a1[1] - b0[1]) / 10
            worst = max(worst, d)
            if d > 0.11:
                bad_xy += 1
            if a1[2] != b0[2]:
                bad_z += 1
    res['kachelkanten'] = {'uebergaenge': n_edge, 'lage_ueber_0_1_m': bad_xy, 'hoehe_ungleich': bad_z, 'groesster_abstand_m': round(worst, 3), 'ok': bad_xy == 0 and bad_z == 0}
    S.log('Kachelkanten:', res['kachelkanten'])
    res['ok'] = {k: v['ok'] for k, v in res.items() if isinstance(v, dict) and 'ok' in v}
    res['ok'].update({'zaehlung_' + k: v['ok'] for k, v in res['zaehlung'].items()})
    S.write_json(os.path.join(a.out, 'pruefung.json'), res, indent=1, separators=(',', ': '))
    S.log('Prüfungen:', res['ok'], 'in', round(time.time() - t0), 's')


if __name__ == '__main__':
    main()
