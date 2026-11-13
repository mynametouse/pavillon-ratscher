#!/usr/bin/env python3
"""suhl-strassen: the two routes garden -> Suhl (and back), recomputed from today's OpenStreetMap – the country road and the motorway.

The first attempt (feat/suhl-fahrt, 26.10.2026: viz3/extra/suhl-fahrt/suhl_strecke.py, recherche.json) led the motorway route over the
A 73, the Dreieck Suhl and the A 71 through the tunnel Berg Bock (2.7 km). The design asks for a route without the tunnel: over the exit
Suhl-Zentrum (2) of the A 73. Here: the same graph and speeds as the first attempt (Dijkstra by time), motorway tunnels closed, the
motorway route forced through the exit named in --exit; the free routes are reported beside it.

  python3 -I tools/suhl/strassen/routen.py --opl suhl-strassen.opl.gz --out out/stadt
      -> <out>/fahrt/routen-suhl.json   routes (model dm), legs, junctions, bridges and tunnels on them (format of `routes` in strassen.json)
      -> <out>/routen.json              the numbers
With --corridor the roads along the routes outside the city's tiles are written in the format of the drive data, their profiles
solved with the city's heights held where the two meet (<out>/fahrt/suhl-anfahrt.json).
© OpenStreetMap contributors (ODbL 1.0).
"""
import argparse, collections, gzip, heapq, json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import numpy as np
import sslib as S
import suhllib as L
import netz as NZ

WR, ST = NZ.WR, NZ.ST
SPD = {'motorway': 120, 'motorway_link': 55, 'main': 80, 'county': 70, 'lane': 50, 'street': 30, 'service': 12, 'track': 8}


def graph(o, M):
    """node -> [(next node, seconds, model metres, way id, on a motorway)] over the roads a car may take; motorway tunnels are closed"""
    G = {}
    closed = []
    for wid, (refs, tg) in o.ways.items():
        hwv = tg.get('highway')
        if not hwv or hwv == 'pedestrian' or tg.get('area') == 'yes':
            continue
        c = WR.classify(tg)
        if not c or c[0] not in SPD:
            continue
        if tg.get('access') in ('private', 'no') or tg.get('motor_vehicle') in ('private', 'no') or tg.get('motorcar') == 'no':
            continue
        if tg.get('service') in ('parking_aisle', 'driveway', 'drive-through', 'emergency_access'):
            continue
        mw = hwv in ('motorway', 'motorway_link')
        if mw and tg.get('tunnel') not in (None, 'no'):
            closed.append(wid)
            continue
        ow = tg.get('oneway') in ('yes', '1', 'true') or tg.get('junction') == 'roundabout' or hwv == 'motorway'
        rev = tg.get('oneway') == '-1'
        kmh = SPD['motorway_link'] if hwv == 'motorway_link' else 10 if hwv == 'living_street' else SPD[c[0]]
        ms = tg.get('maxspeed', '')
        if ms.isdigit():
            kmh = min(kmh, int(ms) * 0.95)
        v = kmh / 3.6
        for p, q in zip(refs, refs[1:]):
            if p in M and q in M:
                if rev:
                    p, q = q, p
                Ld = math.dist(M[p], M[q])
                G.setdefault(p, []).append((q, Ld / v, Ld, wid, mw))
                if not ow and not rev:
                    G.setdefault(q, []).append((p, Ld / v, Ld, wid, mw))
    return G, closed


def dijkstra(G, s, goal=None, motorway=True):
    dist, prev, pq = {s: 0.0}, {}, [(0.0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == goal:
            break
        if d > dist[u]:
            continue
        for v, c, Ld, wid, mw in G.get(u, ()):
            if mw and not motorway:
                continue
            if d + c < dist.get(v, 1e18):
                dist[v] = d + c
                prev[v] = (u, Ld, wid)
                heapq.heappush(pq, (d + c, v))
    return dist, prev


def route(G, stops, motorway=True):
    """the time-shortest path through the stops -> nodes, ways, seconds; None when a leg has no connection"""
    nodes, wids, secs = [stops[0]], [], 0.0
    for s, g in zip(stops, stops[1:]):
        dist, prev = dijkstra(G, s, g, motorway)
        if g not in dist:
            return None
        p = [g]
        while p[-1] != s:
            p.append(prev[p[-1]][0])
        p = p[::-1]
        wids += [prev[k][2] for k in p[1:]]
        nodes += p[1:]
        secs += dist[g]
    return nodes, wids, secs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--opl')
    ap.add_argument('--api-dir')
    ap.add_argument('--raw', default=S.RAW)
    ap.add_argument('--out', default=os.path.join(S.OUT, 'stadt'))
    ap.add_argument('--exit', default='Suhl-Zentrum')
    ap.add_argument('--start')                     # 'x,y' in model metres instead of the garden (tests on a part of the map)
    a = ap.parse_args()
    t0 = time.time()
    o = S.load_osm(opl=a.opl, api_dir=a.api_dir)
    ids = list(o.nodes)
    E = np.array([o.nodes[i][0] for i in ids])
    N = np.array([o.nodes[i][1] for i in ids])
    mx, my = S.u2m(E, N)
    M = {i: (float(x), float(y)) for i, x, y in zip(ids, mx, my)}
    L.guard(box=(E.min(), N.min(), E.max(), N.max()), what='suhl-strassen routen')
    G, closed = graph(o, M)
    S.log('graph:', len(G), 'nodes; motorway tunnels closed:', len(closed), 'ways')
    tgw = lambda wid: o.ways[wid][1]
    start = tuple(float(v) for v in a.start.split(',')) if a.start else ST.GARDEN
    gn = list(G)
    gxy = np.array([M[k] for k in gn])
    s0 = gn[int(np.argmin((gxy[:, 0] - start[0]) ** 2 + (gxy[:, 1] - start[1]) ** 2))]
    if math.dist(M[s0], start) > 300:
        raise SystemExit(f'no road within 300 m of the start {start} – the OSM cut does not reach the garden')
    cx, cy = (float(v) for v in S.u2m(*S.CENTRE_UTM))
    # the goal: the Markt – the nearest road for cars that is no motorway
    nm = np.array([not all(mw for *_, mw in G[k]) for k in gn])
    d2 = (gxy[:, 0] - cx) ** 2 + (gxy[:, 1] - cy) ** 2
    markt = gn[int(np.argmin(np.where(nm, d2, 1e18)))]
    S.log('start', s0, [round(v) for v in M[s0]], '· Markt', markt, [round(v) for v in M[markt]], round(math.dist(M[markt], (cx, cy))), 'm from the centre')
    junctions = {}
    for i, t in o.ntags.items():
        if t.get('highway') == 'motorway_junction' and i in M:
            junctions[i] = {'id': i, 'ref': t.get('ref', ''), 'name': t.get('name', ''), 'x': round(M[i][0], 1), 'y': round(M[i][1], 1)}
    for wid, (refs, tg) in o.ways.items():
        if tg.get('highway') == 'motorway':
            for r in refs:
                if r in junctions:
                    junctions[r].setdefault('on', set()).add(tg.get('ref', ''))
    for J in junctions.values():
        J['on'] = sorted(J.get('on', ()))
    exits = [J for J in junctions.values() if J['name'] == a.exit]
    S.log('junctions:', sorted({(J['ref'], J['name'], ' '.join(J['on'])) for J in junctions.values()}), '· exit', a.exit, len(exits), 'nodes')
    R = {}

    def take(key, res, note=''):
        if res is None:
            S.log('route', key, 'has no connection', note)
            return
        p, w, secs = res
        R[key] = (p, w, secs, note)
    take('suhl_land', route(G, [s0, markt], False))
    take('suhl_land_rueck', route(G, [markt, s0], False))
    # the motorway route over the exit of the design; the free route (no tunnel) beside it
    best = None
    for J in exits:
        r = route(G, [s0, J['id'], markt], True)
        if r and (best is None or r[2] < best[2]):
            best = r
    take('suhl_ab', best, f'über die Anschlussstelle {a.exit} der A 73, ohne Tunnel')
    take('suhl_ab_frei', route(G, [s0, markt], True), 'schnellste Route mit Autobahn, Autobahntunnel gesperrt')
    take('suhl_ab_rueck', route(G, [markt, s0], True), 'zurück: schnellste Route mit Autobahn, Autobahntunnel gesperrt')
    out_routes, info = {}, {}
    for key, (p, w, secs, note) in R.items():
        pts = np.array([M[k] for k in p])
        Lm = S.way_len(pts)
        legs = []
        for k, wid in enumerate(w):
            tg = tgw(wid)
            lab = tg.get('ref') or tg.get('name') or tg.get('highway')
            dL = math.dist(M[p[k]], M[p[k + 1]])
            if legs and legs[-1]['road'] == lab:
                legs[-1]['m'] += dL
            else:
                legs.append({'road': lab, 'hw': tg.get('highway'), 'name': tg.get('name', ''), 'm': dL})
        for lg in legs:
            lg['m'] = round(lg['m'] * S.MSCALE)
        uw = list(dict.fromkeys(w))
        br = [(tgw(x).get('bridge:name') or tgw(x).get('name', '')) for x in uw if tgw(x).get('bridge') not in (None, 'no')]
        tn = [(tgw(x).get('tunnel:name') or tgw(x).get('name', '')) for x in uw if tgw(x).get('tunnel') not in (None, 'no', 'building_passage')]
        on_mw = sum(math.dist(M[p[k]], M[p[k + 1]]) for k, wid in enumerate(w) if tgw(wid).get('highway') in ('motorway', 'motorway_link')) * S.MSCALE
        out_routes[key] = {'pts': [int(round(v * 10)) for v in pts.ravel()], 'm': round(Lm)}
        info[key] = {'model_m': round(Lm), 'true_m': round(Lm * S.MSCALE), 'minutes': round(secs / 60, 1), 'motorway_m': round(on_mw), 'note': note,
                     'legs': [lg for lg in legs if lg['m'] >= 30], 'junctions': [{k: v for k, v in junctions[n].items() if k != 'id'} for n in p if n in junctions],
                     'bridges': len(br), 'bridges_named': sorted({b for b in br if b}), 'tunnels': tn, 'ways': uw}
        S.log('route', key, round(Lm * S.MSCALE), 'm,', round(secs / 60, 1), 'min:', ' → '.join(f"{lg['road']} {lg['m']}" for lg in legs if lg['m'] >= 150),
              '| exits passed:', [(J['ref'], J['name']) for J in info[key]['junctions']], '| tunnels', tn)
    # how the first attempt compares (its recherche.json, when the branch was fetched: git fetch --depth 30 origin feat/suhl-fahrt)
    old = None
    for cand in (os.path.join(a.raw, 'recherche.json'), '/tmp/suhl-bestand/raw/fahrt/recherche.json'):
        if os.path.exists(cand):
            oj = json.load(open(cand, encoding='utf-8'))
            old = {k: {'model_m': v['m'], 'tunnels': [t.get('tunnel:name') or t.get('name') for t in v['tunnels']],
                       'junctions': [(J['ref'], J['name']) for J in v['junctions']]} for k, v in oj['routes'].items()}
            break
    numbers = {'made': S.now(), 'osm': o.source, 'osm_stamp': o.stamp, 'start_model': [round(v, 1) for v in M[s0]], 'markt_model': [round(v, 1) for v in M[markt]],
               'exit': a.exit, 'exit_nodes': len(exits), 'motorway_tunnels_closed': len(closed), 'routes': {k: {q: v for q, v in r.items() if q != 'ways'} for k, r in info.items()},
               'first_attempt_2026_10_26': old,
               'note': 'model_m: Modellmeter wie das Feld m der Fahrtdaten; true_m: echte Meter (× 1,0157); Fahrzeit nach den Regelgeschwindigkeiten des ersten Versuchs'}
    doc = {'v': 1, 'made': S.now()[:10], 'note': 'Suhl: the routes garden -> Markt Suhl and back (model dm), as `routes` of fahrt/strassen.json',
           'credits': 'Straßen © OpenStreetMap-Mitwirkende (ODbL 1.0)', 'routes': out_routes, 'info': info,
           'junctions': sorted(({k: v for k, v in J.items() if k != 'id'} for J in junctions.values()), key=lambda J: -J['y'])}
    S.write_json(os.path.join(a.out, 'fahrt', 'routen-suhl.json'), doc)
    S.write_json(os.path.join(a.out, 'routen.json'), numbers, indent=1, separators=(',', ': '))
    S.log('fertig:', len(out_routes), 'routes in', round(time.time() - t0), 's')


if __name__ == '__main__':
    main()
