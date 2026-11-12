"""Photo coverage of the streets of Suhl: for every named street of the Kernstadt the share of its length that has a
street-level photo within 25 m, and the share where a photo looks across the street at one side (heading within 60 degrees
of the perpendicular, at most 15 m along the street away, not from behind that side; a 360 degree photo counts for both
sides). Sums per quarter (nearest place point of OpenStreetMap), for the Kernstadt and for the Zentrum; the landmarks.
Street-level photos = Panoramax (and KartaView if the probe found any). Commons photos are counted at the landmarks only.
    python3 tools/suhl/fotos/coverage.py [gebiete.geojson]     ->  tools/suhl/out/fotos/abdeckung.json (+ abdeckung_strassen.csv)"""
import sys, os, re, math, json, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

STEP, NEAR, ALONG, BEHIND, SIDE_ANGLE, LOOK_R = 5.0, 25.0, 15.0, 8.0, 60.0, 80.0
ROAD = {'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link',
        'unclassified', 'residential', 'living_street', 'pedestrian', 'service', 'road'}
PATH = {'footway', 'path', 'steps', 'cycleway', 'track', 'bridleway', 'corridor'}
WIND = ['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest']
# landmarks of the Zentrum: name -> pattern for the OSM name (objects) or the street name; chosen after a look at the OSM objects found
LANDMARKS = [
    ('Rathaus (Markt)', 'obj', r'^Rathaus$'),
    ('Markt (Marktplatz)', 'street', r'^(Markt|Marktplatz|Am Markt)$'),
    ('Hauptkirche St. Marien', 'obj', r'Hauptkirche|St\. Marien'),
    ('Kreuzkirche', 'obj', r'^Kreuzkirche$'),
    ('Waffenmuseum (Malzhaus)', 'obj', r'Waffenmuseum|Malzhaus'),
    ('Congress Centrum Suhl (CCS)', 'obj', r'Congress Centrum'),
    ('Bahnhof Suhl (Empfangsgebäude und Bahnhofspunkt)', 'obj', r'^Suhl$|^Bahnhof Suhl$'),
    ('Platz der Deutschen Einheit', 'street', r'^Platz der Deutschen Einheit$'),
    ('Steinweg', 'street', r'^Steinweg$'),
    ('Neues Rathaus', 'obj', r'^Neues Rathaus$'),
    ('Lauterbogen-Center', 'obj', r'^Lauterbogen-Center$'),
    ('Einkaufszentrum Am Steinweg', 'obj', r'^Am Steinweg$'),
    ('Haus der Geschichte', 'obj', r'^Haus der Geschichte$'),
    ('Stadtbücherei', 'obj', r'^Stadtbücherei'),
    ('Villa Simson', 'obj', r'^Villa Simson$'),
    ('Waffenschmied-Denkmal', 'obj', r'^Waffenschmied$'),
    ('Dianabrunnen', 'obj', r'^Dianabrunnen$'),
]


def wind(deg):
    return WIND[int((deg % 360 + 22.5) // 45) % 8]


def load_photos():
    ph = [p for p in slib.load('panoramax.json.gz')['photos']]
    try: ph += [p for p in slib.load('kartaview.json')['photos'] if p.get('place', '').find('Vergleich') < 0 and p.get('heading') is not None]
    except Exception: pass
    # the same picture uploaded twice (same author, same second, same place) counts once
    seen, out = set(), []
    for p in ph:
        key = ((p['author'] or '').lower(), p['date'], round(p['lat'], 5), round(p['lon'], 5))
        if key in seen: continue
        seen.add(key); out.append(p)
    for p in out: p['x'], p['y'] = slib.xy(p['lat'], p['lon'])
    load_photos.course = slib.add_course(out)   # 'blick' = stored heading, or the direction of travel where the stored one scatters
    return out


def grid_of(items, cell):
    g = collections.defaultdict(list)
    for i, p in enumerate(items): g[(int(p['x'] // cell), int(p['y'] // cell))].append(i)
    return g


def near(g, cell, x, y, r):
    n = int(r // cell) + 1
    cx, cy = int(x // cell), int(y // cell)
    for i in range(cx - n, cx + n + 1):
        for j in range(cy - n, cy + n + 1):
            yield from g.get((i, j), ())


def samples(pts):
    """Points every STEP metres along a way: (x, y, bearing, length it stands for)."""
    xy = [slib.xy(la, lo) for la, lo in pts]
    out = []
    for (x0, y0), (x1, y1) in zip(xy, xy[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        if L < 0.05: continue
        n = max(1, int(round(L / STEP))); br = slib.bearing(x0, y0, x1, y1)
        for k in range(n):
            t = (k + 0.5) / n
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, br, L / n))
    return out


def main():
    areas = slib.Areas(sys.argv[1] if len(sys.argv) > 1 else None)
    osm = slib.load('strassen.json.gz')
    photos = load_photos()
    CELL = 25.0
    pg = grid_of(photos, CELL)
    places = [dict(p, x=slib.xy(p['lat'], p['lon'])[0], y=slib.xy(p['lat'], p['lon'])[1]) for p in osm['places'] if p['place'] in ('suburb', 'quarter', 'neighbourhood', 'village', 'hamlet', 'town')]

    def viertel(x, y):
        if not places: return None
        n = min(places, key=lambda p: (p['x'] - x) ** 2 + (p['y'] - y) ** 2)
        return 'Suhl-Mitte (Ortspunkt Suhl)' if n['place'] == 'town' else n['name']

    # --- sample every highway way, mark area and photos
    ways = []
    for w in osm['ways']:
        hw = w['tags'].get('highway')
        if hw not in ROAD and hw not in PATH: continue
        is_area = w['tags'].get('area') == 'yes'
        if is_area and hw != 'pedestrian': continue
        ss = samples(w['pts'])
        if not ss: continue
        rec = dict(id=w['id'], name=w['tags'].get('name'), hw=hw, tags=w['tags'], area=is_area, s=[])
        for x, y, br, L in ss:
            la, lo = slib.ll(x, y)
            zen = areas.has('zentrum', la, lo)
            kern = zen or areas.has('kernstadt', la, lo)
            if not kern: continue
            got, left, right, ids = False, False, False, []
            nl = ((br - 90) % 360)
            # unit vectors: along the way and to its left
            ax, ay = math.sin(math.radians(br)), math.cos(math.radians(br))
            lx, ly = -ay, ax
            for i in near(pg, CELL, x, y, NEAR):
                p = photos[i]; dx, dy = p['x'] - x, p['y'] - y
                if dx * dx + dy * dy > NEAR * NEAR: continue
                got = True; ids.append(i)
                if p['blick'] is None: continue
                along, off_l = dx * ax + dy * ay, dx * lx + dy * ly
                if abs(along) > ALONG: continue
                if p.get('pano'):
                    left = right = True
                else:
                    if slib.angdiff(p['blick'], nl) <= SIDE_ANGLE and off_l <= BEHIND: left = True
                    if slib.angdiff(p['blick'], (br + 90) % 360) <= SIDE_ANGLE and -off_l <= BEHIND: right = True
            rec['s'].append((x, y, br, L, zen, got, left, right, ids))
        if rec['s']: ways.append(rec)

    # --- every sample point with its flags, for the maps (metres east/north of the centre)
    pts = dict(x=[], y=[], f=[])
    for w in ways:
        base = (16 if w['name'] else 0) | (32 if w['hw'] in PATH else 0) | (64 if w['area'] else 0)
        for q in w['s']:
            pts['x'].append(round(q[0])); pts['y'].append(round(q[1]))
            pts['f'].append(base | (1 if q[5] else 0) | (2 if q[6] else 0) | (4 if q[7] else 0) | (8 if q[4] else 0))
    slib.save('abdeckung_punkte.json.gz', dict(note='sample points every 5 m along the highway ways of the Kernstadt; x/y = metres east/north of the centre; '
                                                    'f = bits: 1 photo within 25 m, 2 photo looks at the left side, 4 at the right side, 8 in the Zentrum, 16 way has a name, 32 footway/path/track class, 64 outline of a pedestrian area',
                                               centre=list(slib.CENTRE), step_m=STEP, **pts))

    # --- streets: ways of one name that lie together (within 250 m) are one street
    by_name = collections.defaultdict(list)
    for w in ways:
        if w['name']: by_name[(w['name'], w['area'])].append(w)   # a square mapped as an area is kept apart: its length is its outline
    streets = []
    for (name, is_area), ws in by_name.items():
        parent = list(range(len(ws)))
        def find(a):
            while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
            return a
        pts = [[(s[0], s[1]) for s in w['s'][::4]] + [(w['s'][-1][0], w['s'][-1][1])] for w in ws]
        for a in range(len(ws)):
            for b in range(a + 1, len(ws)):
                if find(a) == find(b): continue
                if any((xa - xb) ** 2 + (ya - yb) ** 2 <= 250.0 ** 2 for xa, ya in pts[a] for xb, yb in pts[b]): parent[find(a)] = find(b)
        groups = collections.defaultdict(list)
        for a in range(len(ws)): groups[find(a)].append(ws[a])
        for g in groups.values(): streets.append((name, is_area, g))

    out_streets = []
    for name, is_area, g in streets:
        S = [s for w in g for s in w['s']]
        L = sum(s[3] for s in S)
        cx, cy = sum(s[0] * s[3] for s in S) / L, sum(s[1] * s[3] for s in S) / L
        # main axis from doubled angles; side A = the side whose normal points north (east for a north-south street)
        c2 = sum(math.cos(2 * math.radians(s[2])) * s[3] for s in S); s2 = sum(math.sin(2 * math.radians(s[2])) * s[3] for s in S)
        axis = (math.degrees(math.atan2(s2, c2)) / 2) % 180
        nref = (axis - 90) % 360
        ny = math.cos(math.radians(nref)); nx = math.sin(math.radians(nref))
        if (abs(ny) >= 0.383 and ny < 0) or (abs(ny) < 0.383 and nx < 0): nref = (nref + 180) % 360
        def agg(sel):
            SS = [s for s in S if sel(s)]
            LL = sum(s[3] for s in SS)
            if LL <= 0: return None
            a = b = 0.0
            for s in SS:
                if is_area:   # outline of a square: a photo that looks across the edge, whichever way
                    if s[6] or s[7]: a += s[3]
                    continue
                left_is_a = slib.angdiff((s[2] - 90) % 360, nref) <= 90
                if (s[6] if left_is_a else s[7]): a += s[3]
                if (s[7] if left_is_a else s[6]): b += s[3]
            ids = sorted({i for s in SS for i in s[8]})
            dates = sorted(photos[i]['date'][:10] for i in ids if photos[i]['date'])
            return dict(laenge_m=round(LL, 1), mit_foto_m=round(sum(s[3] for s in SS if s[5]), 1), anteil_foto=round(sum(s[3] for s in SS if s[5]) / LL, 3),
                        seite_a_m=round(a, 1), seite_b_m=round(b, 1), anteil_seite_a=round(a / LL, 3), anteil_seite_b=round(b / LL, 3),
                        fotos=len(ids), neuestes=dates[-1] if dates else None, aeltestes=dates[0] if dates else None, foto_ids=ids)
        hws = collections.Counter()
        for w in g: hws[w['hw']] += sum(s[3] for s in w['s'])
        main_hw = hws.most_common(1)[0][0]
        kern = agg(lambda s: True); zen = agg(lambda s: s[4])
        out_streets.append(dict(name=name, klasse='platz' if is_area else 'strasse' if main_hw in ROAD else 'weg', highway=main_hw, viertel=viertel(cx, cy),
                                mitte=[round(v, 6) for v in slib.ll(cx, cy)], achse_grad=round(axis, 1),
                                seite_a='Rand (Blick über den Rand)' if is_area else wind(nref) + 'seite', seite_b=None if is_area else wind(nref + 180) + 'seite',
                                way_ids=sorted(w['id'] for w in g), surface=collections.Counter(w['tags'].get('surface') for w in g if w['tags'].get('surface')).most_common(1)[0][0] if any(w['tags'].get('surface') for w in g) else None,
                                kernstadt=kern, zentrum=zen))
    # same name twice (different places): add the quarter to tell them apart
    cnt = collections.Counter((s['name'], s['klasse'] == 'platz') for s in out_streets)
    for s in out_streets:
        s['label'] = f"{s['name']} ({s['viertel']})" if cnt[(s['name'], s['klasse'] == 'platz')] > 1 and s['viertel'] else s['name']
        if s['klasse'] == 'platz': s['label'] += ' [Fläche]'
    out_streets.sort(key=lambda s: (s['label']))

    def total(rows, key):
        rr = [r[key] for r in rows if r[key]]
        L = sum(r['laenge_m'] for r in rr)
        if not L: return None
        ids = set(i for r in rr for i in r['foto_ids'])
        return dict(strassen=len(rr), laenge_km=round(L / 1000, 2), mit_foto_km=round(sum(r['mit_foto_m'] for r in rr) / 1000, 2),
                    anteil_foto=round(sum(r['mit_foto_m'] for r in rr) / L, 3), anteil_seite_a=round(sum(r['seite_a_m'] for r in rr) / L, 3),
                    anteil_seite_b=round(sum(r['seite_b_m'] for r in rr) / L, 3),
                    anteil_beide_seiten_mittel=round((sum(r['seite_a_m'] for r in rr) + sum(r['seite_b_m'] for r in rr)) / (2 * L), 3),
                    strassen_ohne_foto=sum(1 for r in rr if r['fotos'] == 0), strassen_ganz=sum(1 for r in rr if r['anteil_foto'] >= 0.9), fotos=len(ids))

    roads = [s for s in out_streets if s['klasse'] == 'strasse']; paths = [s for s in out_streets if s['klasse'] == 'weg']
    squares = [s for s in out_streets if s['klasse'] == 'platz']
    sums = dict(kernstadt=dict(strassen=total(roads, 'kernstadt'), wege=total(paths, 'kernstadt'), plaetze_umriss=total(squares, 'kernstadt')),
                zentrum=dict(strassen=total(roads, 'zentrum'), wege=total(paths, 'zentrum'), plaetze_umriss=total(squares, 'zentrum')))
    # roads without a name, as one line each
    for key, sel in (('kernstadt', lambda s: True), ('zentrum', lambda s: s[4])):
        SS = [s for w in ways if not w['name'] and w['hw'] in ROAD for s in w['s'] if sel(s)]
        LL = sum(s[3] for s in SS)
        sums[key]['strassen_ohne_namen'] = dict(laenge_km=round(LL / 1000, 2), anteil_foto=round(sum(s[3] for s in SS if s[5]) / LL, 3) if LL else None)
    by_v = collections.defaultdict(list)
    for s in roads: by_v[s['viertel']].append(s)
    viertel_sum = {v: total(rows, 'kernstadt') for v, rows in sorted(by_v.items(), key=lambda kv: str(kv[0]))}
    by_hw = collections.defaultdict(list)
    for s in roads: by_hw[s['highway']].append(s)
    hw_sum = {v: total(rows, 'kernstadt') for v, rows in sorted(by_hw.items())}

    zen_rows = [s for s in out_streets if s['zentrum'] and s['zentrum']['laenge_m'] >= 30]
    schlecht = sorted((s for s in zen_rows if s['zentrum']['anteil_foto'] < 0.5),
                      key=lambda s: -(s['zentrum']['laenge_m'] - s['zentrum']['mit_foto_m']))
    ohne_seiten = sorted((s for s in zen_rows if s['klasse'] == 'strasse' and s['zentrum']['anteil_foto'] >= 0.5 and max(s['zentrum']['anteil_seite_a'], s['zentrum']['anteil_seite_b']) < 0.25),
                         key=lambda s: -s['zentrum']['laenge_m'])

    # --- landmarks: photos within 80 m of the outline that have a part of it inside their field of view
    def outline(pts):
        xy = [slib.xy(la, lo) for la, lo in pts]
        o = list(xy)
        for (x0, y0), (x1, y1) in zip(xy, xy[1:]):
            L = math.hypot(x1 - x0, y1 - y0)
            for k in range(1, int(L // 4) + 1): o.append((x0 + (x1 - x0) * k * 4 / L, y0 + (y1 - y0) * k * 4 / L))
        return o

    def looked_at(o):
        n_near, n_look, ids, by_author = 0, 0, [], collections.Counter()
        seen = set()
        for i, p in enumerate(photos):
            best = None; sees = False
            for x, y in o:
                d = math.hypot(x - p['x'], y - p['y'])
                if d > LOOK_R: continue
                best = d if best is None else min(best, d)
                if p['blick'] is None: continue
                if p.get('pano') or d < 3 or slib.angdiff(slib.bearing(p['x'], p['y'], x, y), p['blick']) <= (p.get('fov') or 70) / 2: sees = True
            if best is None: continue
            n_near += 1
            if sees: n_look += 1; ids.append(p['id']); by_author[p['author']] += 1
        return n_near, n_look, ids, by_author

    marks = []
    zobjs = [o for o in osm['objects'] if any(areas.has('zentrum', *q) for q in o['pts'])]
    used = set()
    for label, kind, rx in LANDMARKS:
        geo, src = [], []
        if kind == 'obj':
            for o in zobjs:
                if re.search(rx, o['tags'].get('name', '')): geo += outline(o['pts']); src.append(o['id'] + ' ' + o['tags'].get('name', '')); used.add(o['id'])
        else:
            for s in out_streets:
                if re.search(rx, s['name']) and s['zentrum']:
                    for w in ways:
                        if w['id'] in s['way_ids']: geo += [(q[0], q[1]) for q in w['s'] if q[4]]
                    src.append(('area ' if s['klasse'] == 'platz' else 'street ') + s['label'])
        if not geo: marks.append(dict(name=label, osm=[], hinweis='in OSM im Zentrum nicht gefunden')); continue
        a, b, ids, au = looked_at(geo)
        marks.append(dict(name=label, osm=src, fotos_bis_80m=a, fotos_mit_blick=b, je_urheber=dict(au), foto_ids=ids))
    others = []
    for o in zobjs:
        t = o['tags']
        if o['id'] in used: continue
        if not (t.get('tourism') in ('museum', 'attraction') or t.get('historic') in ('building', 'monument', 'memorial', 'castle', 'church', 'city_gate', 'manor', 'tower', 'fountain')
                or t.get('amenity') in ('place_of_worship', 'theatre', 'townhall', 'library', 'arts_centre', 'cinema', 'courthouse', 'bus_station', 'fountain', 'events_venue')
                or t.get('building') in ('train_station', 'church', 'civic') or t.get('shop') in ('mall', 'department_store') or t.get('wikidata')): continue
        a, b, ids, au = looked_at(outline(o['pts']))
        kind = next((f'{k}={t[k]}' for k in ('tourism', 'historic', 'amenity', 'shop', 'building', 'railway', 'man_made', 'leisure', 'place') if t.get(k)), '')
        others.append(dict(name=t['name'], osm=o['id'], art=kind, lat=o['pts'][0][0], lon=o['pts'][0][1], fotos_bis_80m=a, fotos_mit_blick=b))
    others.sort(key=lambda r: (-r['fotos_mit_blick'], r['name']))

    def slim(s):
        r = dict(s)
        for k in ('kernstadt', 'zentrum'):
            if r[k]: r[k] = {kk: vv for kk, vv in r[k].items() if kk != 'foto_ids'}
        return r

    res = dict(
        version=1, made=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), areas=areas.source,
        method=dict(step_m=STEP, near_m=NEAR, along_m=ALONG, behind_m=BEHIND, side_angle_deg=SIDE_ANGLE, landmark_radius_m=LOOK_R,
                    street_photos='Panoramax (' + str(sum(1 for p in photos if p['source'] == 'panoramax')) + ' different pictures; pictures uploaded twice count once)' + (', KartaView (' + str(sum(1 for p in photos if p['source'] == 'kartaview')) + ')' if any(p['source'] == 'kartaview' for p in photos) else ''),
                    streets='OpenStreetMap ways with highway=' + '/'.join(sorted(ROAD)) + ' (klasse strasse) and ' + '/'.join(sorted(PATH)) + ' (klasse weg), with a name; ways of one name within 250 m are one street',
                    sides='seite_a/seite_b are named after the compass side of the street axis; rough for winding streets',
                    viewing_direction='blick: the stored heading where it keeps a fixed angle to the direction of travel (camera fixed in the car), else the direction of travel '
                                      '(phone compass headings scatter; those cameras look forward through the windscreen)',
                    heading_check=getattr(load_photos, 'course', None),
                    quarter='nearest OSM place point (suburb, quarter, neighbourhood, village, hamlet) to the middle of the street'),
        summen=sums, viertel=viertel_sum, strassenklasse=hw_sum,
        zentrum_schlecht=[dict(name=s['label'], klasse=s['klasse'], highway=s['highway'], laenge_m=s['zentrum']['laenge_m'], anteil_foto=s['zentrum']['anteil_foto'],
                               ohne_foto_m=round(s['zentrum']['laenge_m'] - s['zentrum']['mit_foto_m'], 1)) for s in schlecht],
        zentrum_ohne_fassadenblick=[dict(name=s['label'], laenge_m=s['zentrum']['laenge_m'], anteil_foto=s['zentrum']['anteil_foto'],
                                         anteil_seite_a=s['zentrum']['anteil_seite_a'], anteil_seite_b=s['zentrum']['anteil_seite_b']) for s in ohne_seiten],
        wahrzeichen=marks, weitere_objekte_im_zentrum=others, strassen=[slim(s) for s in out_streets])
    print(slib.save('abdeckung.json', res, indent=1))
    # the street lists with their photo ids, for the contact sheets and maps (not for people)
    slib.save('abdeckung_fotos.json.gz', dict(photos=[p['id'] for p in photos], strassen=[dict(label=s['label'], name=s['name'], klasse=s['klasse'], way_ids=s['way_ids'], achse_grad=s['achse_grad'],
              seite_a=s['seite_a'], seite_b=s['seite_b'], zentrum=s['zentrum'], kernstadt_fotos=(s['kernstadt'] or {}).get('foto_ids', [])) for s in out_streets]))
    with open(os.path.join(slib.OUT, 'abdeckung_strassen.csv'), 'w', encoding='utf-8') as f:
        f.write('strasse;klasse;highway;viertel;laenge_kernstadt_m;anteil_foto;anteil_seite_a;anteil_seite_b;seite_a;seite_b;fotos;neuestes_foto;laenge_zentrum_m;zentrum_anteil_foto;zentrum_anteil_seite_a;zentrum_anteil_seite_b;zentrum_fotos\n')
        for s in out_streets:
            k, z = s['kernstadt'], s['zentrum'] or {}
            f.write(';'.join(str(v if v is not None else '') for v in (s['label'], s['klasse'], s['highway'], s['viertel'], k['laenge_m'], k['anteil_foto'], k['anteil_seite_a'], k['anteil_seite_b'],
                    s['seite_a'], s['seite_b'], k['fotos'], k['neuestes'], z.get('laenge_m'), z.get('anteil_foto'), z.get('anteil_seite_a'), z.get('anteil_seite_b'), z.get('fotos'))) + '\n')
    print(json.dumps(sums, ensure_ascii=False, indent=1))
    print('Zentrum: streets with poor coverage:', [(s['label'], s['zentrum']['laenge_m'], s['zentrum']['anteil_foto']) for s in schlecht][:25])
    for m in marks: print(' ', m['name'], m.get('osm'), m.get('fotos_bis_80m'), m.get('fotos_mit_blick'), m.get('hinweis', ''))


main()
