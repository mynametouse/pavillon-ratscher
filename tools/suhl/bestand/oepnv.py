#!/usr/bin/env python3
"""suhl-bestand, deliverable 7: public transport in the municipality of Suhl from the free Germany feed of gtfs.de (data provided by
DELFI e.V., CC BY 4.0; pattern: viz3/extra/bus/quellen/fahrplan.py): stops and lines inside stadt, trips per day type of a reference
week, which lines connect Suhl with Schleusingen and Ratscher, railway stations and train lines -> oepnv.json. Counts and names only.

  python3 -I tools/suhl/bestand/oepnv.py --gtfs latest.zip [--woche 2026-11-16]
"""
import argparse, csv, datetime, io, json, os, sys, zipfile
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib


def rd(zf, name):
    with zf.open(name) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig', newline=''))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gtfs', default=os.path.join(sblib.RAW, 'gtfs', 'latest.zip'))
    ap.add_argument('--woche', default='2026-11-16')
    ap.add_argument('--out', default=os.path.join(sblib.OUT, 'oepnv.json'))
    a = ap.parse_args()
    from shapely.geometry import shape, Point
    from shapely.prepared import prep
    fc = json.load(open(os.path.join(sblib.OUT, 'gebiete.geojson'), encoding='utf-8'))
    G = {f['properties']['id']: shape(f['geometry']) for f in fc['features'] if f['properties']['art'] == 'gebiet'}   # lon/lat
    PG = {k: prep(v) for k, v in G.items()}
    w, s, e, n = G['stadt'].bounds
    zf = zipfile.ZipFile(a.gtfs)
    feed = next(iter(rd(zf, 'feed_info.txt')), {}) if 'feed_info.txt' in zf.namelist() else {}
    suhl, schl, rat, sname = {}, set(), set(), {}
    for r in rd(zf, 'stops.txt'):
        nm = r.get('stop_name', '')
        try:
            la, lo = float(r['stop_lat']), float(r['stop_lon'])
        except (ValueError, KeyError):
            continue
        if w <= lo <= e and s <= la <= n and PG['stadt'].contains(Point(lo, la)):
            suhl[r['stop_id']] = {'name': nm, 'kern': PG['kernstadt'].contains(Point(lo, la)), 'zen': PG['zentrum'].contains(Point(lo, la)),
                                  'typ': r.get('location_type', ''), 'eltern': r.get('parent_station', '')}
        if nm.startswith('Schleusingen'):
            schl.add(r['stop_id'])
        if nm.startswith('Ratscher'):
            rat.add(r['stop_id'])
        if r['stop_id'] in suhl or nm.startswith(('Schleusingen', 'Ratscher')):
            sname[r['stop_id']] = nm
    sblib.log('stops in stadt', len(suhl), 'Schleusingen', len(schl), 'Ratscher', len(rat))
    # stop_times: streamed; which trips call at which of the three stop sets, calls per Suhl stop
    trips = defaultdict(lambda: [0, False, False])     # trip -> [calls in Suhl, touches Schleusingen, touches Ratscher]
    calls = Counter()
    bsuhl = {k.encode() for k in suhl}
    bschl, brat = {k.encode() for k in schl}, {k.encode() for k in rat}
    with zf.open('stop_times.txt') as f:
        head = f.readline().decode('utf-8-sig').strip().split(',')
        it, isd = head.index('trip_id'), head.index('stop_id')
        mx = max(it, isd) + 1
        nrow = 0
        for ln in f:
            nrow += 1
            p = ln.split(b',', mx)
            sid = p[isd].strip(b'"\r\n')
            if sid in bsuhl:
                t = trips[p[it].strip(b'"')]
                t[0] += 1
                calls[sid.decode()] += 1
            elif sid in bschl:
                trips[p[it].strip(b'"')][1] = True
            elif sid in brat:
                trips[p[it].strip(b'"')][2] = True
    sblib.log('stop_times rows', nrow, 'trips touching the sets', len(trips))
    tsuhl = {k.decode(): v for k, v in trips.items() if v[0] > 0}
    troute, tserv = {}, {}
    for r in rd(zf, 'trips.txt'):
        if r['trip_id'] in tsuhl:
            troute[r['trip_id']] = r['route_id']
            tserv[r['trip_id']] = r['service_id']
    routes = {r['route_id']: r for r in rd(zf, 'routes.txt') if r['route_id'] in set(troute.values())}
    agency = {r.get('agency_id', ''): r.get('agency_name', '') for r in rd(zf, 'agency.txt')}
    # days of the reference week per service
    mon = datetime.date.fromisoformat(a.woche)
    days = [mon + datetime.timedelta(d) for d in range(7)]
    used = set(tserv.values())
    runs = defaultdict(set)
    wd = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    if 'calendar.txt' in zf.namelist():
        for r in rd(zf, 'calendar.txt'):
            if r['service_id'] in used:
                for i, d in enumerate(days):
                    if r[wd[i]] == '1' and r['start_date'] <= d.strftime('%Y%m%d') <= r['end_date']:
                        runs[r['service_id']].add(i)
    if 'calendar_dates.txt' in zf.namelist():
        dstr = {d.strftime('%Y%m%d'): i for i, d in enumerate(days)}
        for r in rd(zf, 'calendar_dates.txt'):
            if r['service_id'] in used and r['date'] in dstr:
                (runs[r['service_id']].add if r['exception_type'] == '1' else runs[r['service_id']].discard)(dstr[r['date']])
    lines = {}
    for tid, rid in troute.items():
        r = routes[rid]
        key = (agency.get(r.get('agency_id', ''), ''), r.get('route_short_name') or r.get('route_long_name') or rid, r.get('route_type', ''))
        L = lines.setdefault(key, {'fahrten_di': 0, 'fahrten_sa': 0, 'fahrten_so': 0, 'fahrten_im_feed': 0, 'schleusingen': 0, 'ratscher': 0})
        L['fahrten_im_feed'] += 1
        ds = runs.get(tserv[tid], set())
        L['fahrten_di'] += 1 in ds
        L['fahrten_sa'] += 5 in ds
        L['fahrten_so'] += 6 in ds
        L['schleusingen'] += tsuhl[tid][1]
        L['ratscher'] += tsuhl[tid][2]
    rail = lambda t: t in ('2', '100', '101', '102', '103', '104', '105', '106', '107', '108', '109')
    out_lines = [{'betreiber': k[0], 'linie': k[1], 'route_type': k[2], **v} for k, v in sorted(lines.items(), key=lambda kv: (kv[0][0], kv[0][1]))]
    names = Counter(v['name'] for v in suhl.values())
    served = {sid for sid in calls}
    # railway stations: stops in stadt called at by rail trips
    rail_trips = {tid for tid, rid in troute.items() if rail(routes[rid].get('route_type', ''))}
    res = {'made': sblib.now(), 'quelle': 'gtfs.de – GTFS für Deutschland (frei), Daten bereitgestellt von DELFI e.V.; https://download.gtfs.de/germany/free/latest.zip',
           'lizenz': 'CC BY 4.0 (gtfs.de, DELFI e.V.)', 'feed': {k: feed.get(k) for k in ('feed_version', 'feed_start_date', 'feed_end_date', 'feed_publisher_name')},
           'referenzwoche': {'montag': a.woche, 'werktag': str(days[1]), 'samstag': str(days[5]), 'sonntag': str(days[6])},
           'haltestellen': {'stop_eintraege_in_stadt': len(suhl), 'verschiedene_namen': len(names),
                            'mit_halt_im_feed': len(served), 'namen_mit_halt': len({suhl[s_]['name'] for s_ in served}),
                            'in_kernstadt_namen': len({v['name'] for v in suhl.values() if v['kern']}),
                            'im_zentrum_namen': sorted({v['name'] for v in suhl.values() if v['zen']}),
                            'meiste_halte': [[suhl[s_]['name'], c] for s_, c in calls.most_common(12)]},
           'linien': {'anzahl': len(out_lines), 'bahn': [x for x in out_lines if rail(x['route_type'])],
                      'bus_und_andere': [x for x in out_lines if not rail(x['route_type'])]},
           'fahrten_mit_halt_in_suhl': {'im_feed': len(tsuhl), 'werktag': sum(x['fahrten_di'] for x in out_lines),
                                        'samstag': sum(x['fahrten_sa'] for x in out_lines), 'sonntag': sum(x['fahrten_so'] for x in out_lines)},
           'nach_schleusingen': sorted({(x['betreiber'], x['linie'], x['schleusingen']) for x in out_lines if x['schleusingen']}),
           'nach_ratscher': sorted({(x['betreiber'], x['linie'], x['ratscher']) for x in out_lines if x['ratscher']}),
           'stop_times_zeilen': nrow}
    sblib.write_json(a.out, res, indent=1)
    sblib.log('written', a.out)
    sblib.log(json.dumps({k: res[k] for k in ('feed', 'fahrten_mit_halt_in_suhl', 'nach_schleusingen', 'nach_ratscher')}, ensure_ascii=False))
    sblib.log('lines', [(x['betreiber'][:18], x['linie'], x['route_type'], x['fahrten_di'], x['fahrten_sa'], x['fahrten_so']) for x in out_lines])
    sblib.log('stops', res['haltestellen']['stop_eintraege_in_stadt'], res['haltestellen']['verschiedene_namen'], res['haltestellen']['mit_halt_im_feed'])


if __name__ == '__main__':
    main()
