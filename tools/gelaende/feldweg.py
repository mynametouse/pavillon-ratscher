#!/usr/bin/env python3
"""The field path east of the garden as it really runs (Karten-Chat, 19.11.2026; Falko 11:41: „der Weg parallel zum Bach weicht auch ab“).

The village roads of the 2.4 km square (geo/roads.b64.json on the website, OSM of 10/2026, smoothed) bring the track past the garden as
three ways: the modelled axis (site.json path, heading 117°) on to t = 53, a "bridge" (none there, Falko 30.10.) and a bend down to the
Ratschner Anger. OpenStreetMap today (way 1484532662, matching the orthophoto 2024 and the 1 m terrain) has it straight from the
gate to the Anger, heading 139°. This replaces those three ways by one along that line, rounded at the gate exactly as
garden/stream_geo.js STREAM.pathOff (the painted ground follows the same function) and joined to the service way to the Anger.

    python3 -I tools/gelaende/feldweg.py [--src <roads.b64.json>] [--out viz3/extra/bach/dist/geo/roads.b64.json]
"""
import argparse, base64, json, math, os, sys, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = 'https://mynametouse.github.io/pavillon-ratscher/geo/roads.b64.json'
KINDS = ['motorway', 'main', 'county', 'street', 'lane', 'service', 'track', 'path', 'foot']
PK, PS = 34.2, 0.395           # STREAM.pathOff: 0 west of t = PK - 6, PS * (t - PK) east of PK + 6, a parabola between


def path_off(t):
    u = t - PK
    return 0.0 if u <= -6 else PS * u if u >= 6 else PS * (u + 6) ** 2 / 24


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=SRC)
    ap.add_argument('--out', default=os.path.join(REPO, 'viz3', 'extra', 'bach', 'dist', 'geo', 'roads.b64.json'))
    a = ap.parse_args()
    raw = open(a.src, 'rb').read() if os.path.exists(a.src) else urllib.request.urlopen(a.src, timeout=60).read()
    d = json.loads(raw)
    arr = np.frombuffer(base64.b64decode(d['b64']), '<i2')
    ways, o = [], 0
    while o + 5 <= len(arr):
        n = int(arr[o])
        ways.append((arr[o:o + 5].copy(), arr[o + 5:o + 5 + 2 * n].copy()))
        o += 5 + 2 * n
    site = json.load(open(os.path.join(REPO, 'viz3', 'site.json')))
    P1, P2 = site['path']
    L = math.hypot(P2[0] - P1[0], P2[1] - P1[1])
    U = ((P2[0] - P1[0]) / L, (P2[1] - P1[1]) / L)
    N = (-U[1], U[0])
    if N[1] > 0:
        N = (-N[0], -N[1])
    loc = lambda x, y: ((x - P1[0]) * U[0] + (y - P1[1]) * U[1], (x - P1[0]) * N[0] + (y - P1[1]) * N[1])
    wpt = lambda t, q: (P1[0] + U[0] * t + N[0] * q, P1[1] + U[1] * t + N[1] * q)
    # the three ways of the old track east of the garden: kind track, all points within t 40..95 and o -2..25
    drop = []
    for i, (h, p) in enumerate(ways):
        if KINDS[int(h[1])] != 'track':
            continue
        P = p.reshape(-1, 2) / 10.0
        TO = np.array([loc(x, y) for x, y in P])
        if (TO[:, 0] > 40).all() and (TO[:, 0] < 95).all() and (TO[:, 1] > -2).all() and (TO[:, 1] < 25).all():
            drop.append(i)
    if len(drop) != 3:
        sys.exit(f'expected the three ways of the old track, found {drop} - the source changed, look first')
    h0 = ways[drop[0]][0]
    t0 = loc(*(ways[drop[0]][1][:2] / 10.0))[0]           # where the old track began (t = 44)
    t1 = 92.6                                              # the service way to the Anger begins there
    ts = list(np.arange(t0, t1, 3.0)) + [t1]
    pts = [wpt(t, path_off(t)) for t in ts]
    end = loc(53.6, -18.3)
    if abs(pts[-1][0] - 53.6) > 0.6 or abs(pts[-1][1] + 18.3) > 0.6:
        sys.exit(f'the new track does not meet the service way: {pts[-1]} vs (53.6, -18.3), {end}')
    pts[-1] = (53.6, -18.3)
    new = np.array([len(pts), h0[1], h0[2], h0[3], 0], '<i2'), np.round(np.array(pts).ravel() * 10).astype('<i2')
    # the modelled field path itself (site.json axis, o = 0) runs on to t = 64: east of the gate it turns with the real track (pathOff) and
    # ends where the new way begins
    axis = [i for i, (h, p) in enumerate(ways) if KINDS[int(h[1])] == 'track' and i not in drop
            and (lambda TO: (np.abs(TO[:, 1]) < 0.4).all() and TO[:, 0].min() < 0 and TO[:, 0].max() > 50)(
                np.array([loc(x, y) for x, y in ways[i][1].reshape(-1, 2) / 10.0]))]
    if len(axis) != 1:
        sys.exit(f'expected one way on the modelled axis, found {axis}')
    h, p = ways[axis[0]]
    keep = [(t, q) for t, q in (loc(x, y) for x, y in p.reshape(-1, 2) / 10.0) if t < t0 - 0.5]
    keep += [(t, 0.0) for t in np.arange(PK - 6, t0, 2.0) if t > keep[-1][0] + 0.5] + [(t0, 0.0)]
    ax = [wpt(t, path_off(t)) for t, _ in sorted(keep)]
    ways[axis[0]] = (np.array([len(ax), h[1], h[2], h[3], h[4]], '<i2'), np.round(np.array(ax).ravel() * 10).astype('<i2'))
    out = []
    for i, w in enumerate(ways):
        if i == drop[0]:
            out.append(new)
        elif i not in drop:
            out.append(w)
    b = b''.join(h.astype('<i2').tobytes() + p.astype('<i2').tobytes() for h, p in out)
    d2 = dict(d)
    d2['b64'] = base64.b64encode(b).decode()
    d2['feldweg'] = ('der Feldweg östlich des Gartens nach OSM 2026 (Weg 1484532662) und dem 1-m-Gelände, tools/gelaende/feldweg.py, '
                     'Karten-Chat 19.11.2026')
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    json.dump(d2, open(a.out, 'w'), separators=(',', ':'))
    print(f'{len(ways)} -> {len(out)} ways; the old track ({drop}) replaced by {len(pts)} points from t = {t0:.1f} to {t1}; '
          f'the axis way {axis[0]} ends at t = {t0:.1f} ({len(ax)} points); {a.out}')


if __name__ == '__main__':
    main()
