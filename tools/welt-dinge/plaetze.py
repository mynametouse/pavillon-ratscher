#!/usr/bin/env python3
"""Car parks of OpenStreetMap as parking places that fill by the time (feat/welt-dinge): the photo of 07.04.2024 was flown on a Sunday
morning, so a supermarket's car park is empty there and gives no places of its own. Each public car park (amenity=parking, not private,
not underground or a multi-storey) is filled with slots – rows of 2.5 m along its long side, 5 m deep, a 6 m aisle between the rows;
a strip along a street (parking=street_side/lane or narrower than 4.6 m) one line of cars parked parallel, 6 m apart –
and gets the kind of what it belongs to (the nearest shop, church, school, doctor, inn, sports ground, cemetery within 80 m, or its own
name; a lot for employees is a works yard), whose curve says when it fills (dinge/dinge_zeit.js); no more slots than its capacity.
Slots on buildings, on the roads' carriageway or within 2.5 m of a car of the photo (that one is a place already) are left out.

  python3 tools/welt-dinge/plaetze.py OSM.json GEBIET [--geb DIR]     # OSM.json from tools/welt-dinge/osm_parkplaetze.py (GitHub Actions)

Writes viz3/extra/welt-dinge/plaetze_<gebiet>.json: { "quelle", "plaetze": [{ "x", "y", "az", "art", "osm" }], "parkplaetze": [ … ] };
prep.py adds them as places of their kind (a body type and colour by chance, seeded by the place)."""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wdlib

EXTRA = os.path.join(wdlib.REPO, 'viz3/extra/welt-dinge')
DIENST = {'doctors', 'pharmacy', 'townhall', 'bank', 'post_office', 'hospital', 'clinic', 'library', 'community_centre'}
GAST = {'restaurant', 'pub', 'cafe', 'fast_food'}


def art_of(k, name=''):
    n = (name or '').lower()
    key, _, val = k.partition('=')
    if val == 'marketplace':
        return 'stadt'  # the town's square: kerb parking of the town, not a supermarket's
    if key == 'shop' or 'markt' in n or 'netto' in n or 'rewe' in n or 'lidl' in n or 'aldi' in n or 'penny' in n:
        return 'laden'
    if val == 'place_of_worship' or 'kirche' in n:
        return 'kirche'
    if val in ('school', 'kindergarten') or 'schule' in n or 'kita' in n:
        return 'schule'
    if val in ('grave_yard',) or (key == 'landuse' and val == 'cemetery') or 'friedhof' in n:
        return 'friedhof'
    if val in GAST:
        return 'gaststaette'
    if key == 'leisure' or 'sport' in n:
        return 'sport'
    if val in DIENST or key in ('office', 'craft') or 'rathaus' in n or 'arzt' in n:
        return 'dienst'
    return None


def main():
    from pyproj import Transformer
    from shapely.geometry import Polygon, Point, box
    from shapely import affinity
    from shapely.strtree import STRtree
    src, gebiet = sys.argv[1], sys.argv[2]
    geb = sys.argv[sys.argv.index('--geb') + 1] if '--geb' in sys.argv else None
    T = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    model = lambda lat, lon: wdlib.to_model(*T.transform(lon, lat))
    A = json.load(open(src))['areas'].get(gebiet, {'parking': [], 'pois': []})
    FP = wdlib.footprints(geb)
    tree = STRtree(FP)
    ways = [w for w in wdlib.roads() + (wdlib.roads_fahrt() if gebiet != 'ratscher' else []) if w['kind'] <= 5]
    for w in ways:
        w['bb'] = (w['p'][:, 0].min(), w['p'][:, 1].min(), w['p'][:, 0].max(), w['p'][:, 1].max())
    P = json.load(open(os.path.join(EXTRA, f'pruefung_{gebiet}.json')))
    cars = [(k['x'], k['y']) for k in P['ja'] if k['t'] in ('auto', 'van')]
    pois = []
    for q in A['pois']:
        x, y = model(*q['c'])
        g = Polygon([model(a, b) for a, b in q['ring']]) if q.get('ring') and len(q['ring']) >= 4 else Point(x, y)
        a = art_of(q['k'], q.get('name', ''))
        if a:
            pois.append((g.buffer(0) if g.geom_type == 'Polygon' else g, a, q.get('name', '') or q['k']))
    slots, lots = [], []
    for lot in A['parking']:
        t = lot['tags']
        if not lot.get('ring') or len(lot['ring']) < 4:
            continue
        if t.get('access') in ('private', 'no') or t.get('parking') in ('underground', 'multi-storey', 'rooftop'):
            continue
        poly = Polygon([model(a, b) for a, b in lot['ring']]).buffer(0)
        if poly.area < 60:
            continue
        art = 'betrieb' if t.get('access') == 'employees' else art_of('', t.get('name', ''))
        if not art and 'parkplatz' in t.get('name', '').lower():
            art = 'allgemein'  # a named public car park (am Schützenplatz …): everybody's, not the nearest shop's
        if not art:
            near = sorted(((p.distance(poly), a, n) for p, a, n in pois if p.distance(poly) < 80), key=lambda v: v[0])
            art, why = (near[0][1], near[0][2]) if near else ('allgemein', '')
            # a big car park by a lake, a pool or a pitch is theirs, not the kiosk's next to it (Bergsee Ratscher: 1.3 ha)
            if poly.area > 3000 and art in ('gaststaette', 'allgemein'):
                sp = sorted((p.distance(poly), n) for p, a, n in pois if a == 'sport' and p.distance(poly) < 250)
                if sp:
                    art, why = 'sport', sp[0][1]
        else:
            why = t.get('name', '')
        # rows along the long side of the smallest rectangle round the lot
        rect = poly.minimum_rotated_rectangle
        c = list(rect.exterior.coords)
        e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1])
        e2 = (c[2][0] - c[1][0], c[2][1] - c[1][1])
        u = e1 if math.hypot(*e1) >= math.hypot(*e2) else e2
        ul = math.hypot(*u)
        u = (u[0] / ul, u[1] / ul)
        v = (-u[1], u[0])
        pu = [px * u[0] + py * u[1] for px, py in poly.exterior.coords]
        pv = [px * v[0] + py * v[1] for px, py in poly.exterior.coords]
        u0, u1, v0, v1 = min(pu), max(pu), min(pv), max(pv)
        n0 = len(slots)

        def slot(uc, vc, along):
            # a car at (uc, vc) of the lot's frame, its length along u (parallel to a kerb) or along v (rows); free of buildings, roads
            # and of the photo's cars
            x, y = u[0] * uc + v[0] * vc, u[1] * uc + v[1] * vc
            ax = u if along else v
            fp = affinity.rotate(box(-0.95, -2.3, 0.95, 2.3), math.degrees(math.atan2(ax[1], ax[0])) - 90, origin=(0, 0))
            fp = affinity.translate(fp, x, y)
            if not (area.contains(fp) and not any(FP[i].intersects(fp) for i in tree.query(fp))
                    and not any(math.hypot(x - a, y - b) < 2.5 for a, b in cars)):
                return None
            for w in ways:
                bb = w['bb']
                if x < bb[0] - 20 or x > bb[2] + 20 or y < bb[1] - 20 or y > bb[3] + 20:
                    continue
                d, q, _ = wdlib.seg_dist(x, y, w['p'])
                if d < w['w'] / 2 + 0.5:
                    return None
            return x, y

        if t.get('parking') in ('street_side', 'lane', 'on_kerb', 'half_on_kerb') or v1 - v0 < 4.6:
            # a strip along the street: one line of cars parked parallel, 6 m apart (the strip as drawn may be a little narrow)
            area = poly.buffer(0.45)
            vc, uc = (v0 + v1) / 2, u0 + 3.0
            while uc <= u1 - 2.9:
                q = slot(uc, vc, True)
                if q:
                    az = (math.degrees(math.atan2(u[0], u[1])) + 360) % 360
                    slots.append({'x': round(q[0], 2), 'y': round(q[1], 2), 'az': round(az, 1), 'art': art, 'osm': lot['id']})
                uc += 6.0
        else:
            area = poly
            k = 0
            vc = v0 + 2.6
            while vc <= v1 - 2.4:
                face = 1 if k % 2 == 0 else -1  # the cars face the aisle between their row and the next
                uc = u0 + 1.3
                while uc <= u1 - 1.3:
                    q = slot(uc, vc, False)
                    if q:
                        dv = (v[0] * face, v[1] * face)
                        az = (math.degrees(math.atan2(dv[0], dv[1])) + 360) % 360
                        slots.append({'x': round(q[0], 2), 'y': round(q[1], 2), 'az': round(az, 1), 'art': art, 'osm': lot['id']})
                    uc += 2.5
                vc += 11.0 if k % 2 == 0 else 5.0  # a row, the aisle (6 m), the row across it; the next row back to back …
                k += 1
        made = len(slots) - n0
        # no more than the lot holds (OSM capacity, else 150): every k-th slot, spread over the lot
        try:
            cap = min(150, int(t.get('capacity', '150')))
        except ValueError:
            cap = 150
        if made > cap:
            keep = [slots[n0 + round(i * made / cap)] for i in range(cap)]
            slots[n0:] = keep
            made = len(keep)
        lots.append({'osm': lot['id'], 'art': art, 'wegen': why, 'name': t.get('name', ''), 'flaeche': round(poly.area), 'plaetze': made})
    out = {'quelle': '© OpenStreetMap-Mitwirkende (ODbL 1.0): amenity=parking und die Orte daneben; Reihen von tools/welt-dinge/plaetze.py',
           'plaetze': slots, 'parkplaetze': lots}
    # compact, one slot or car park per line
    rows = lambda L: ',\n'.join(json.dumps(q, ensure_ascii=False, separators=(',', ':')) for q in L)
    with open(os.path.join(EXTRA, f'plaetze_{gebiet}.json'), 'w') as f:
        f.write('{"quelle":' + json.dumps(out['quelle'], ensure_ascii=False) + ',\n"plaetze":[\n' + rows(slots) + '\n],\n"parkplaetze":[\n'
                + rows(lots) + '\n]}\n')
    from collections import Counter
    print(gebiet, len(lots), 'car parks', len(slots), 'slots', dict(Counter(s['art'] for s in slots)))
    for l in lots:
        print('  ', l)


if __name__ == '__main__':
    main()
