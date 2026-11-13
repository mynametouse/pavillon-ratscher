#!/usr/bin/env python3
"""suhl-bestand: OpenStreetMap for the whole municipality of Suhl through the OSM API map call, in small boxes (chat machine: neither
Geofabrik nor Overpass is reachable there). Boxes of 0.04 x 0.025 degrees over the boundary's bounding box (+ margin), nearest to the
centre first; a box with more than 50,000 nodes (HTTP 400) is split in four. One call at a time with a pause; every answer is cached in
SUHL_RAW/osm/ (raw data, never committed). In GitHub Actions the same data come from the Geofabrik extract instead (osm_bestand.py --opl).

  python3 -I tools/suhl/bestand/osm_api.py [--margin 0.004] [--pause 1.0]
"""
import argparse, json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib

API = 'https://api.openstreetmap.org/api/0.6/map.json?bbox={:.6f},{:.6f},{:.6f},{:.6f}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--margin', type=float, default=0.004)   # degrees around the boundary (~300-450 m)
    ap.add_argument('--pause', type=float, default=1.0)
    a = ap.parse_args()
    from shapely.geometry import box
    out = os.path.join(sblib.RAW, 'osm')
    os.makedirs(out, exist_ok=True)
    stadt, _, _ = sblib.stadt_polygon_wgs()
    area = stadt.buffer(a.margin)
    w0, s0, e0, n0 = area.bounds
    dx, dy = 0.04, 0.025
    boxes = []
    y = s0
    while y < n0:
        x = w0
        while x < e0:
            b = (x, y, min(x + dx, e0), min(y + dy, n0))
            if box(*b).intersects(area):
                boxes.append(b)
            x += dx
        y += dy
    clat, clon = sblib.CENTRE
    boxes.sort(key=lambda b: ((b[0] + b[2]) / 2 - clon) ** 2 * 0.4 + ((b[1] + b[3]) / 2 - clat) ** 2)
    sblib.log(f'{len(boxes)} boxes over {w0:.4f},{s0:.4f},{e0:.4f},{n0:.4f}')
    calls = splits = 0
    t0 = time.time()
    while boxes:
        b = boxes.pop(0)
        p = os.path.join(out, 'map_{:.6f}_{:.6f}_{:.6f}_{:.6f}.json'.format(*b))
        if os.path.exists(p) and os.path.getsize(p) > 50:
            continue
        st, body, ct = sblib.http_get(API.format(*b), timeout=180)
        calls += 1
        if st == 200 and body[:1] == b'{':
            open(p, 'wb').write(body)
            sblib.log(f'{calls:3d} ok   {len(body) / 1e6:6.2f} MB  {b}  ({len(boxes)} left, {time.time() - t0:.0f} s)')
        elif st == 400 and (b'too many nodes' in body or b'limit' in body):
            mx, my = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            boxes[:0] = [(b[0], b[1], mx, my), (mx, b[1], b[2], my), (b[0], my, mx, b[3]), (mx, my, b[2], b[3])]
            splits += 1
            sblib.log(f'{calls:3d} split {b}: {body[:80]!r}')
        else:
            sblib.log(f'{calls:3d} FAIL {st} {b}: {body[:200]!r}')
            open(os.path.join(out, 'FAILED.txt'), 'a').write(f'{sblib.now()} {st} {b}\n')
        time.sleep(a.pause)
    sblib.log(f'done: {calls} calls, {splits} splits, {time.time() - t0:.0f} s')
    json.dump({'made': sblib.now(), 'calls': calls, 'splits': splits, 'margin_deg': a.margin}, open(os.path.join(out, 'done.json'), 'w'))


if __name__ == '__main__':
    main()
