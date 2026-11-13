#!/usr/bin/env python3
"""suhl-daten, package S2-9 "Zahlen": the scenario numbers of every building and the sums of every quarter (plan 6.3, SUHL.data).

Reads the building records of suhl-gebaeude (product g, schema 1) and writes the product d:
    suhl/d/v<N>/10/<x>/<y>.json   {schema, product: 'd', key, o, d: {building id: numbers}}   - same tiles as g
    suhl/d/v<N>/viertel.json      the 17 quarters (raster, outlines, sums, official numbers) and the areas zentrum, kernstadt, stadt
    suhl/d/v<N>/index.json        the common index (has, based_on {g: N}, sources, attribution) + the lists of fields and assumptions

Rules of this tool (docs/features/suhl-daten.md, section 13):
  * every area is TRUE square metres, computed in UTM (EPSG:25832) from the tile-local model coordinates of g; heights are true metres;
  * every direction is degrees from GEOGRAPHIC north (grid bearing + meridian convergence at the building), computed here from the
    roof mesh - the azimuths of g are only compared, never copied blindly;
  * numbers that are not measured are estimates by a named rule (RULES below, written into viertel.json for the "why?" of the app)
    and carry their quality: 0 rule or assumption, 1 derived from data, 2 measured or official, 3 checked;
  * census values are used as published per 100 m cell and distributed to buildings as MODEL ESTIMATES; a value the census does not
    show stays unknown - nothing here tries to reconstruct it; nothing about persons, owners or parcels is read or written.

    python3 -I tools/suhl/daten/zahlen.py --g <.../suhl/g/v1> --out <root>/suhl/d/v1 --area stadt [--zensus <folder>] [--report f.json]
    python3 -I tools/suhl/daten/zahlen.py --g <...> --out <...> --area probe        # only the tiles of the sample set
"""
import argparse, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
sys.path.insert(0, HERE)
import suhllib as S
import schema as SC
import viertel as V

L10 = S.CONTENT_LEVEL
DIRS = ('N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW')
R_COLS = ('a', 'ap', 'az', 'sl', 'c', 'us', 'kwp', 'ir')

# relative yearly irradiation on a plane in percent of the best plane (south, 30-40 degrees), rows: slope 0..90 in steps of 10,
# columns: degrees away from south 0..180 in steps of 30. Rounded values of the usual irradiation disc for central Germany - an
# assumption of this tool (no shading by trees, neighbours or the valley sides).
IR_TABLE = (
    (87, 87, 87, 87, 87, 87, 87),
    (93, 93, 91, 87, 83, 80, 79),
    (97, 96, 93, 86, 79, 73, 70),
    (100, 98, 93, 84, 73, 65, 61),
    (100, 98, 92, 81, 68, 58, 53),
    (98, 96, 89, 77, 63, 51, 46),
    (94, 92, 85, 73, 58, 46, 40),
    (88, 86, 79, 67, 53, 41, 36),
    (80, 78, 72, 61, 48, 37, 32),
    (70, 69, 64, 54, 43, 33, 29),
)

# every assumption of this tool, with its number: written into viertel.json (meta.annahmen) so the app can answer "why?"
RULES = {
    'flat_deg': 10.0,           # a roof plane below this slope counts as flat
    'storey_m': 2.9,            # storey height when the cadastre names no storeys: levels = eave height / storey_m (at least 1)
    'attic_min_m': 2.5,         # a pitched roof at least this high above the eave holds an attic floor ...
    'attic_share': 0.6,         # ... of this share of the footprint (not part of the gross floor area, field dg)
    'pv_share_pitched': 0.70,   # module area on a pitched plane: share of its area (edge distances, chimneys, roof windows, dormers)
    'pv_share_flat': 0.45,      # module area on a flat roof (edge strip, plant, rows with gaps)
    'pv_min_m2': 10.0,          # smaller module areas do not count (2 kWp)
    'pv_not_bt': ['laube', 'behaelter', 'turm'],     # types of building that carry no solar plant (garden huts, tanks, towers)
    'pv_kwp_m2': 0.20,          # kWp per m2 of module area
    'pv_ir_min': 75,            # a plane is "suitable" from this share of the best irradiation
    'pv_kwh_kwp': 950,          # yearly yield of 1 kWp on the best plane at Suhl
    'heated_share': 0.8,        # heated floor area = share of (gross floor area + attic)
    'heat_era': {'0': 150, '1': 165, '2': 170, '3': 140, '4': 90},      # dwellings: kWh per m2 heated area and year (heating + hot water)
    'heat_slab': 110,           # dwellings in slab blocks of 1949-1990 (mostly refurbished after 1990)
    'heat_use': {'hotel': 150, 'gastro': 200, 'handel': 110, 'buero': 110, 'verwaltung': 110, 'schule': 110, 'kita': 130, 'gesundheit': 180,
                 'kultur': 100, 'kirche': 50, 'sport': 120, 'gewerbe': 90, 'industrie': 90, 'lager': 40, 'verkehr': 50},
}
RULE_TEXT = [
    ('flaeche', 'Alle Flächen sind echte Quadratmeter, in UTM (EPSG:25832) aus den Modellkoordinaten der Gebäude-Datensätze gerechnet; '
                'die Abweichung von der Naturfläche liegt unter 0,05 %.'),
    ('richtung', 'Richtungen der Dachflächen sind die Fallrichtung in Grad von geografisch Nord (Gitterrichtung + Meridiankonvergenz am '
                 'Gebäude), aus dem Dach-Netz gerechnet. 180 = die Fläche schaut nach Süden.'),
    ('geschosse', 'Geschosse: Zahl des Katasters; fehlt sie, Traufhöhe / {storey_m} m (mindestens 1), Nebengebäude und Garagen 1. '
                  'Geschossfläche = Grundfläche × Geschosse (Bruttofläche über Gelände, ohne Keller).'),
    ('dachgeschoss', 'Dachgeschoss: bei geneigtem Dach ab {attic_min_m} m Höhe über der Traufe {attic_share_pct} % der Grundfläche '
                     '(eigenes Feld dg, nicht in der Geschossfläche).'),
    ('volumen', 'Volumen: Raum zwischen Fußebene und Dachfläche (aus dem Dach-Netz); wo das Netz den Grundriss nicht deckt, '
                'Grundfläche × (Traufe + 0,4 × Dachhöhe).'),
    ('solar_flaeche', 'Belegbare Dachfläche: {pv_share_pitched_pct} % einer geneigten Dachfläche, {pv_share_flat_pct} % eines Flachdachs '
                      '(unter {flat_deg} Grad); weniger als {pv_min_m2} m² zählen nicht; Glasdächer, Gartenlauben, Behälter und Türme zählen nicht.'),
    ('solar_leistung', 'Solar-Potenzial: {pv_kwp_m2} kWp je m² belegbarer Fläche auf Flächen mit mindestens {pv_ir_min} % der besten '
                       'Einstrahlung (Tabelle „einstrahlung“); Ertrag {pv_kwh_kwp} kWh je kWp und Jahr auf der besten Fläche. Ohne '
                       'Verschattung durch Bäume, Nachbarn und Talhänge, ohne Statik und Denkmalschutz. Was heute schon auf den Dächern '
                       'liegt, ist je Gebäude nicht bekannt (das Register nennt kleine Anlagen nur je Postleitzahl).'),
    ('waerme', 'Wärmebedarf: beheizte Fläche ({heated_share_pct} % von Geschossfläche + Dachgeschoss) × Kennwert in kWh je m² und Jahr '
               '(Heizung und Warmwasser): Wohnen nach Baualter {heat_era}, Plattenbau 1949–1990 {heat_slab}; andere Nutzungen {heat_use}; '
               'Nebengebäude, Garagen, Versorgung und Unbekanntes 0. Eigene Annahmen in der Größenordnung üblicher Kennwerte – kein Messwert.'),
    ('viertel', 'Stadtteile: die 17 statistischen Stadtteile der Stadt; Umrisse nur für Gehlberg und Schmiedefeld aus OpenStreetMap, alle '
                'anderen sind eine Annahme (100-m-Zellen des nächsten Saatpunkts) – siehe outline.q je Stadtteil.'),
    ('zensus', 'Zensus 2022: Werte je 100-m-Zelle, wie veröffentlicht (zur Geheimhaltung leicht verändert). Zahlen je Gebäude sind '
               'Modell-Schätzungen: Die Einwohner einer Zelle werden nach Wohn-Geschossfläche auf ihre Wohngebäude verteilt. Zeigt der '
               'Zensus für eine Zelle keinen Wert, bleibt er unbekannt – nichts wird zurückgerechnet.'),
]


def rule_texts():
    f = dict(RULES)
    for k in ('attic_share', 'pv_share_pitched', 'pv_share_flat', 'heated_share'):
        f[k + '_pct'] = round(RULES[k] * 100)
    f['heat_era'] = ', '.join(f'{("unbekannt", "bis 1918", "1919–1948", "1949–1990", "ab 1991")[int(k)]} {v}' for k, v in sorted(RULES['heat_era'].items()))
    f['heat_use'] = ', '.join(f'{k} {v}' for k, v in sorted(RULES['heat_use'].items()))
    return [{'id': i, 'text': t.format(**f)} for i, t in RULE_TEXT]


# ---------------------------------------------------------------- geometry (UTM)
def ring_area(r):
    """signed area of a ring of (E, N); positive anticlockwise. Computed relative to the first point: UTM numbers are large."""
    ox, oy = r[0]
    s = 0.0
    n = len(r)
    for i in range(n):
        x0, y0 = r[i][0] - ox, r[i][1] - oy
        x1, y1 = r[(i + 1) % n][0] - ox, r[(i + 1) % n][1] - oy
        s += x0 * y1 - x1 * y0
    return 0.5 * s


def ring_centroid(r):
    """centre of area of a ring; a ring without area (a sliver) gives the mean of its points"""
    ox, oy = r[0]
    a = ring_area(r)
    mx, my = sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)
    if abs(a) < 0.05:
        return mx, my
    cx = cy = 0.0
    n = len(r)
    for i in range(n):
        x0, y0 = r[i][0] - ox, r[i][1] - oy
        x1, y1 = r[(i + 1) % n][0] - ox, r[(i + 1) % n][1] - oy
        w = x0 * y1 - x1 * y0
        cx += (x0 + x1) * w
        cy += (y0 + y1) * w
    cx, cy = ox + cx / (6 * a), oy + cy / (6 * a)
    # a ring that crosses itself can throw the centre of area far out: then the mean of the points is the better middle
    reach = max(math.hypot(p[0] - mx, p[1] - my) for p in r)
    return (cx, cy) if math.hypot(cx - mx, cy - my) <= reach else (mx, my)


def ring_utm(fr, flat):
    return [fr.to_utm(flat[i], flat[i + 1]) for i in range(0, len(flat) - 1, 2)]


def irradiation(az, slope):
    """relative yearly irradiation (percent of the best plane) for a plane facing `az` (degrees from true north, None = flat) with `slope`"""
    if az is None or slope < 0.5:
        return float(IR_TABLE[0][0])
    dev = abs((az - 180.0 + 180.0) % 360.0 - 180.0)          # 0 = south ... 180 = north
    si = min(max(slope, 0.0), 90.0) / 10.0
    di = dev / 30.0
    i0, j0 = min(int(si), 8), min(int(di), 5)
    fi, fj = si - i0, di - j0
    t = IR_TABLE
    return (t[i0][j0] * (1 - fi) * (1 - fj) + t[i0 + 1][j0] * fi * (1 - fj) + t[i0][j0 + 1] * (1 - fi) * fj + t[i0 + 1][j0 + 1] * fi * fj)


def direction(az):
    """the eighth of the compass an azimuth falls into"""
    return DIRS[int(((az % 360.0) + 22.5) // 45.0) % 8]


def roof_planes(b, fr, conv, fa=None):
    """the roof planes of a record in the order of b['R']: [{a, ap, az (true north, None when flat), sl, c, mesh}] and the volume of
    the roof body above the eave plane.
    Slope and direction are computed here from the roof mesh in UTM (grid bearing of the downhill direction + meridian convergence).
    The mesh of g carries a roof overhang (drawn, not measured), so its areas are larger than the roof above the walls: the areas
    a (true) and ap (plan) are the ones g gives WITHOUT overhang; a plane without them gets the mesh area scaled by
    footprint / plan area of the whole mesh. Volume: plan area x height above the eave, with the same scaling."""
    rv, rt, R = b.get('rv') or [], b.get('rt') or [], b.get('R') or []
    e = float(b.get('e') or 0.0)
    pts = []
    for i in range(len(rv) // 3):
        E, N = fr.to_utm(rv[3 * i], rv[3 * i + 1])
        pts.append((E, N, rv[3 * i + 2]))
    raw, plan_all, vol = [], 0.0, 0.0
    for f in R:
        t0, tn = (list(f.get('ti') or [0, 0]) + [0, 0])[:2]
        nx = ny = nz = a3 = ap = 0.0
        ok = tn > 0
        for k in range(t0, t0 + tn):
            try:
                p0, p1, p2 = pts[rt[3 * k]], pts[rt[3 * k + 1]], pts[rt[3 * k + 2]]
            except IndexError:
                ok = False
                break
            ux, uy, uz = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
            vx, vy, vz = p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]
            cx, cy, cz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            if cz < 0:
                cx, cy, cz = -cx, -cy, -cz
            a3 += 0.5 * math.sqrt(cx * cx + cy * cy + cz * cz)
            ap += 0.5 * cz
            nx, ny, nz = nx + cx, ny + cy, nz + cz
            vol += 0.5 * cz * (max(p0[2] - e, 0.0) + max(p1[2] - e, 0.0) + max(p2[2] - e, 0.0)) / 3.0
        raw.append((ok and a3 > 0, a3, ap, nx, ny, nz))
        if ok:
            plan_all += ap
    scale = (fa / plan_all) if (fa and plan_all > 0) else 1.0           # takes the overhang off the mesh areas
    out = []
    for f, (ok, a3, ap, nx, ny, nz) in zip(R, raw):
        g_sl = f.get('sl') if isinstance(f.get('sl'), (int, float)) else None
        if ok:
            hh = math.hypot(nx, ny)
            sl = math.degrees(math.atan2(hh, nz))
            az = (math.degrees(math.atan2(nx, ny)) + conv) % 360.0 if hh > 1e-9 and sl >= 0.5 else None
        else:
            sl = g_sl or 0.0
            az = f.get('az') if isinstance(f.get('az'), (int, float)) else None
        if isinstance(f.get('a'), (int, float)) and f['a'] > 0:
            a = float(f['a'])
            apl = float(f['ap']) if isinstance(f.get('ap'), (int, float)) else a * math.cos(math.radians(g_sl if g_sl is not None else sl))
            src = 'g'
        else:
            a, apl, src = a3 * scale, ap * scale, 'mesh'
        out.append({'a': a, 'ap': apl, 'az': az, 'sl': sl, 'c': f.get('c', 0), 'mesh': ok, 'area_from': src, 'a_mesh': a3, 'ap_mesh': ap})
    return out, plan_all, vol * scale


# ---------------------------------------------------------------- one building
MINOR = ('neben', 'garage')


def numbers(b, fr, quarters, stats=None):
    """the scenario numbers of one record of g -> (d record, extras for the sums) or (None, None) for a building that no longer stands"""
    if isinstance(b.get('fg'), int) and b['fg'] & 32:
        return None, None
    ring = ring_utm(fr, b['f'])
    fa = abs(ring_area(ring))
    for hole in b.get('fh') or []:
        fa -= abs(ring_area(ring_utm(fr, hole)))
    cE, cN = ring_centroid(ring)
    conv = S.convergence_deg(cE, cN)
    q_in = b.get('q') or {}
    use = b.get('use', 'sonst')
    h, e = float(b.get('h') or 0.0), float(b.get('e') or 0.0)
    # storeys
    if isinstance(b.get('lv'), int) and b['lv'] >= 1:
        lv, qlv = b['lv'], q_in.get('lv', 0)
    elif use in MINOR or b.get('k') == 2:
        lv, qlv = 1, 0
    else:
        lv, qlv = max(1, int(round(e / RULES['storey_m']))), 0
    gfa = fa * lv
    planes, plan_all, roof_vol = roof_planes(b, fr, conv, fa)
    rq = b.get('rq', 0) if isinstance(b.get('rq'), int) else 0
    # the mesh covers the footprint (with its overhang up to 60 % more) - else the volume falls back to a rule
    mesh_ok = fa > 0 and bool(planes) and all(p['mesh'] for p in planes) and 0.97 * fa - 0.5 <= plan_all <= 1.6 * fa + 2.0
    vol = fa * e + roof_vol if mesh_ok else fa * (e + 0.4 * max(0.0, h - e))
    pitched = any(p['sl'] >= RULES['flat_deg'] for p in planes)
    dg = RULES['attic_share'] * fa if (pitched and h - e >= RULES['attic_min_m'] and use not in MINOR and b.get('k') in (0, None)) else 0.0
    # roof and solar
    rows, ro = [], {}
    rf = ru = pv = pe = 0.0
    for p in planes:
        flat = p['sl'] < RULES['flat_deg'] or p['az'] is None
        ir = irradiation(None if flat else p['az'], 0.0 if flat else p['sl'])
        us = p['a'] * (RULES['pv_share_flat'] if flat else RULES['pv_share_pitched'])
        if us < RULES['pv_min_m2'] or p['c'] == 8 or b.get('bt') in RULES['pv_not_bt']:
            us = 0.0
        kwp = us * RULES['pv_kwp_m2']
        rf += p['a']
        key = 'flach' if flat else direction(p['az'])
        ro[key] = ro.get(key, 0.0) + p['a']
        if us > 0 and ir >= RULES['pv_ir_min']:
            ru += us
            pv += kwp
            pe += kwp * RULES['pv_kwh_kwp'] * ir / 100.0
        rows.append([round(p['a'], 1), round(p['ap'], 1), None if flat else round(p['az']), round(p['sl']), p['c'], round(us, 1),
                     round(kwp, 1), round(ir)])
        if stats is not None and p['mesh']:
            stats.face(b['R'][len(rows) - 1], p, flat)
    if stats is not None and planes and fa > 5:
        stats.building(fa, sum(p['ap'] for p in planes), plan_all)
    # heat demand (rule)
    era = b.get('era', 0) if isinstance(b.get('era'), int) else 0
    heated = RULES['heated_share'] * (gfa + dg)
    if use == 'wohnen':
        kwh = RULES['heat_slab'] if (era == 3 and b.get('bt') in ('platte', 'block', 'punkthochhaus', 'zeilenbau')) else RULES['heat_era'][str(era)]
    else:
        kwh = RULES['heat_use'].get(use, 0)
    if b.get('k') == 2 and use not in RULES['heat_use'] and use != 'wohnen':
        kwh = 0
    demand = heated * kwh
    nr = quarters.nearest_nr(cE, cN)
    x, y = fr.from_utm(cE, cN)
    d = {'vt': nr, 'm': [round(x, 1), round(y, 1)], 'use': use, 'era': era, 'k': b.get('k', 0)}
    if b.get('bt'):
        d['bt'] = b['bt']
    d.update({'fa': round(fa, 1), 'lv': lv, 'gfa': round(gfa)})
    if dg:
        d['dg'] = round(dg)
    d.update({'h': round(h, 1), 'e': round(e, 1), 'vol': round(vol), 'rf': round(rf, 1), 'R': rows})
    if ru:
        d.update({'ru': round(ru, 1), 'pv': round(pv, 1), 'pe': round(pe)})
    if demand:
        d['heat'] = {'d': round(demand)}
    fg = b.get('fg') if isinstance(b.get('fg'), int) else 0
    if fg:
        d['fg'] = fg
    q = {'lv': qlv, 'rf': rq, 'pv': 1 if rq >= 1 else 0}
    if 'era' in q_in:
        q['era'] = q_in['era']
    if not mesh_ok:
        q['vol'] = 0
    d['q'] = q
    ex = {'E': cE, 'N': cN, 'nr': nr, 'fa': fa, 'gfa': gfa, 'dg': dg, 'vol': vol, 'rf': rf, 'ro': ro, 'ru': ru, 'pv': pv, 'pe': pe,
          'demand': demand, 'use': use, 'era': era, 'lv': lv, 'qlv': qlv, 'rq': rq, 'mesh_ok': mesh_ok, 'fg': fg, 'k': b.get('k', 0),
          'bt': b.get('bt'), 'eg': b.get('eg'), 'id': b['id']}
    return d, ex


# ---------------------------------------------------------------- sums
class Sum:
    """the sums of one quarter or area"""

    def __init__(self):
        self.n = 0
        self.fa = self.gfa = self.gfa_res = self.dg = self.vol = self.rf = self.ru = self.pv = self.pe = self.demand = 0.0
        self.by_use, self.by_era, self.ro, self.tiles = {}, {}, {}, set()
        self.lv_q = [0, 0, 0, 0]
        self.rq = [0, 0, 0, 0]
        self.res = 0.0
        self.res_n = 0
        self.listed = self.vacant = 0

    def add(self, ex, tile):
        self.n += 1
        self.tiles.add(tile)
        for k in ('fa', 'gfa', 'dg', 'vol', 'rf', 'ru', 'pv', 'pe', 'demand'):
            setattr(self, k, getattr(self, k) + ex[k])
        if ex['use'] == 'wohnen':
            self.gfa_res += ex['gfa']
        u = self.by_use.setdefault(ex['use'], [0, 0.0, 0.0])
        u[0] += 1
        u[1] += ex['fa']
        u[2] += ex['gfa']
        if ex['use'] not in MINOR:
            e = self.by_era.setdefault(str(ex['era']), [0, 0.0])
            e[0] += 1
            e[1] += ex['gfa']
        for k, v in ex['ro'].items():
            self.ro[k] = self.ro.get(k, 0.0) + v
        self.lv_q[min(3, max(0, ex['qlv']))] += 1
        self.rq[min(3, max(0, ex['rq']))] += 1
        if ex['fg'] & 2:
            self.listed += 1
        if ex['fg'] & 8:
            self.vacant += 1
        if ex.get('res'):
            self.res += ex['res']
            self.res_n += 1

    def json(self):
        order = ('flach',) + DIRS
        return {'buildings': self.n,
                'byUse': {k: [v[0], round(v[1]), round(v[2])] for k, v in sorted(self.by_use.items(), key=lambda kv: -kv[1][2])},
                'byEra': {k: [v[0], round(v[1])] for k, v in sorted(self.by_era.items())},
                'footprint': round(self.fa), 'floorArea': round(self.gfa), 'floorAreaHousing': round(self.gfa_res), 'attic': round(self.dg),
                'volume': round(self.vol), 'roofArea': round(self.rf), 'roofBy': {k: round(self.ro[k]) for k in order if k in self.ro},
                'roofUsable': round(self.ru), 'pvKwp': round(self.pv), 'pvKwh': round(self.pe), 'pvKwpToday': None,
                'heatDemand': round(self.demand), 'listed': self.listed, 'vacant': self.vacant,
                'quality': {'lv': self.lv_q, 'roof': self.rq}}


class FaceStats:
    """checks of the roof planes: slope and direction computed here against the numbers g carries (frame check), plan areas against
    the footprint, the overhang of the mesh"""

    def __init__(self):
        self.daz, self.dsl, self.cos, self.cover, self.over = [], [], [], [], []
        self.n = 0

    def face(self, f, p, flat):
        """f: the plane as g carries it ({a, ap, sl, az}), p: the same plane computed here"""
        self.n += 1
        if isinstance(f.get('sl'), (int, float)):
            self.dsl.append(p['sl'] - f['sl'])
        if not flat and isinstance(f.get('az'), (int, float)) and p['az'] is not None and p['sl'] >= 15:
            self.daz.append((p['az'] - f['az'] + 180.0) % 360.0 - 180.0)
        if p['area_from'] == 'g' and p['ap'] > 1 and p['sl'] < 75:
            self.cos.append(p['a'] * math.cos(math.radians(p['sl'])) / p['ap'])

    def building(self, fa, ap_sum, plan_mesh):
        self.cover.append(ap_sum / fa)
        if plan_mesh > 0:
            self.over.append(plan_mesh / fa)

    @staticmethod
    def _q(v, ps=(0.05, 0.5, 0.95)):
        if not v:
            return None
        s = sorted(v)
        return [round(s[min(len(s) - 1, int(p * len(s)))], 3) for p in ps]

    def json(self):
        return {'planes': self.n, 'n_az': len(self.daz),
                'az_here_minus_g_deg_p5_p50_p95': self._q(self.daz),
                'slope_here_minus_g_deg_p5_p50_p95': self._q(self.dsl),
                'true_area_x_cos_slope_over_plan_area_p5_p50_p95': self._q(self.cos),
                'plan_areas_over_footprint_p5_p50_p95': self._q(self.cover),
                'mesh_plan_over_footprint_p5_p50_p95': self._q(self.over),
                'model_to_true_deg': round(-S.MODEL_TURN_DEG + S.convergence_deg(*S.CENTRE_UTM), 3),
                'reading': 'az_here_minus_g near 0: g gives roof directions from geographic north; near +3.05: g gives them in the model frame. '
                           'mesh_plan_over_footprint above 1: the roof mesh of g carries an overhang; areas here are without it.'}


# ---------------------------------------------------------------- the run
def g_version(folder):
    try:
        return int(S.read_json(os.path.join(folder, 'index.json')).get('version'))
    except Exception:
        return None


def run(g_folder, out, version, area='stadt', census=None, report=None, quiet=False, min_buildings=50):
    """g tiles -> d tiles, viertel.json, index.json; returns the report dict"""
    lv, _ = S.scan_tiles(g_folder, 'json')
    tiles = sorted(lv.get(L10, []))
    if area == 'probe':
        probe = {tuple(t[-2:]) for t in S.probe_tiles()}
        tiles = [t for t in tiles if tuple(t) in probe]
    if not tiles:
        raise S.GuardError(f'zahlen: no g tiles of level {L10} under {g_folder}')
    boxes = [S.tbounds(L10, x, y) for x, y in tiles]
    S.guard(box=(min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)), what='zahlen')
    Q = V.build()
    areas = {a: S.area(a) for a in ('zentrum', 'kernstadt', 'stadt')}
    stats = FaceStats()
    recs = {}                                   # tile -> {id: d}
    exs = []                                    # (tile, d, ex)
    heads = {}
    dropped = 0
    for x, y in tiles:
        doc = S.read_json(os.path.join(g_folder, str(L10), str(x), f'{y}.json'))
        fr = S.tile_frame(L10, x, y)
        out_d = {}
        for b in doc.get('b') or []:
            try:
                d, ex = numbers(b, fr, Q, stats)
            except Exception as err:                  # one broken record must not stop the city
                S.log(f'zahlen: record {b.get("id")!r} in {x}/{y} unreadable: {err}')
                dropped += 1
                continue
            if d is None:
                dropped += 1
                continue
            out_d[b['id']] = d
            exs.append(((x, y), d, ex))
        recs[(x, y)] = out_d
        heads[(x, y)] = fr
    if len(exs) < min_buildings:
        raise S.GuardError(f'zahlen: only {len(exs)} buildings read from {g_folder} - wrong folder?')
    if area in ('stadt', 'kernstadt', 'zentrum'):
        S.guard_count(len(exs), 'buildings', area, what='zahlen')
    # census: residents and heating per building (model estimates), sums per quarter straight from the cells
    cz = None
    if census:
        import zensus as Z
        cz = Z.apply(census, exs, Q, RULES)
    # sums
    sums_q = {q['nr']: Sum() for q in Q.q}
    sums_a = {a: Sum() for a in areas}
    for tile, d, ex in exs:
        key = f'{tile[0]}/{tile[1]}'
        if ex['nr']:
            sums_q[ex['nr']].add(ex, key)
        for a, ar in areas.items():
            if ar.contains(ex['E'], ex['N']):
                sums_a[a].add(ex, key)
    # files
    made = S.now()
    gv = g_version(g_folder)
    os.makedirs(out, exist_ok=True)
    for (x, y), out_d in recs.items():
        if not out_d:
            continue
        fr = heads[(x, y)]
        S.write_json(os.path.join(out, str(L10), str(x), f'{y}.json'),
                     {'schema': S.SCHEMA, 'product': 'd', 'key': S.tile_key(L10, x, y), 'o': fr.o_json(), 'made': made, 'n': len(out_d), 'd': out_d})
    gi = {}
    try:
        gi = S.read_json(os.path.join(g_folder, 'index.json'))
    except Exception:
        pass
    whole = area == 'stadt' and gi.get('area') in ('stadt', None)
    # the sample set holds every tile that touches the Zentrum, so its sums of the Zentrum are complete
    complete_areas = {'stadt': whole, 'kernstadt': whole or (area == 'kernstadt' and gi.get('area') in ('stadt', 'kernstadt', None)),
                      'zentrum': whole or area in ('kernstadt', 'zentrum', 'probe')}
    vq = []
    for q in Q.q:
        j = Q.quarter_json(q)
        j.update(sums_q[q['nr']].json())
        j['tiles'] = sorted(sums_q[q['nr']].tiles)
        j['complete'] = whole
        j['official'] = {'residents': q['einwohner'], 'year': 2022, 'date': Q.doc['einwohner_quelle']['stand'], 'src': Q.doc['einwohner_quelle']['src']}
        if cz:
            j.update(cz.quarter(q['nr']))
        vq.append(j)
    va = []
    for a, ar in areas.items():
        c = ring_centroid(max(ar.rings, key=lambda r: abs(ring_area(r))))
        j = {'id': a, 'name': ar.name, 'kind': 'gebiet', 'area': round(sum(abs(ring_area(r)) for r in ar.rings[:1]) / 1e6, 2),
             'center': [int(round(c[0])), int(round(c[1]))]}
        j.update(sums_a[a].json())
        j['complete'] = complete_areas[a]
        if cz:
            j.update(cz.area(a, ar))
        va.append(j)
    meta = {'stand': made, 'g': gv, 'annahmen': rule_texts(), 'regeln': RULES,
            'einstrahlung': {'neigung': list(range(0, 100, 10)), 'abweichung_von_sued': list(range(0, 210, 30)), 'prozent': [list(r) for r in IR_TABLE]},
            'felder': {'R': list(R_COLS)},
            'hinweise': ['Zahlen je Gebäude sind Schätzungen des Modells, keine Angaben über Personen oder Eigentümer.',
                         'pvKwpToday ist nicht bekannt (null): das Marktstammdatenregister nennt Anlagen unter 30 kW ohne Adresse.']}
    if cz:
        meta['zensus'] = cz.meta()
    viertel = {'schema': S.SCHEMA, 'product': 'd', 'version': SC.version_of(version), 'made': made, 'area': area, 'partial': not whole,
               'crs': 'EPSG:25832', 'meta': meta, 'raster': Q.raster_json(), 'viertel': vq, 'gebiete': va}
    S.write_json(os.path.join(out, 'viertel.json'), viertel)
    sources = [s for s in (gi.get('sources') or []) if isinstance(s, dict)] or ['ethos', 'alkis', 'osm']
    have = {s.get('id') for s in sources if isinstance(s, dict)}
    for sid in ('osm', 'wissen', 'regel') + (('zensus',) if cz else ()):
        if sid not in have:
            sources.append(sid)
    idx = SC.make_index(out, 'd', version, area, sources, based_on=({'g': gv} if gv is not None else {}),
                        note='Szenario-Zahlen je Gebäude (Schätzungen mit Güte) und Summen je Stadtteil (viertel.json). Flächen in echten m², '
                             'in UTM gerechnet; Richtungen von geografisch Nord.',
                        extra={'fields': {'R': list(R_COLS)}, 'viertel': 'viertel.json',
                               'counts': {'buildings': len(exs), 'dropped': dropped}})
    rep = {'made': made, 'area': area, 'g_folder': os.path.basename(os.path.abspath(g_folder)), 'g_version': gv, 'tiles': len(tiles),
           'buildings': len(exs), 'dropped_not_standing_or_unreadable': dropped, 'bytes': idx['n']['bytes'],
           'bytes_viertel': os.path.getsize(os.path.join(out, 'viertel.json')), 'roof_check': stats.json(),
           'stadt': sums_a['stadt'].json(), 'zentrum': sums_a['zentrum'].json(), 'complete': complete_areas,
           'viertel': {q['id']: {k: v for k, v in j.items() if k in ('buildings', 'floorArea', 'floorAreaHousing', 'roofArea', 'pvKwp',
                                                                       'heatDemand', 'residents', 'official', 'census', 'area')}
                       for q, j in zip(Q.q, vq)}}
    if cz:
        rep['zensus'] = cz.report()
    if report:
        S.write_json(report, rep, compact=False)
    if not quiet:
        s = rep['stadt']
        S.log(f'zahlen: {len(tiles)} tiles, {len(exs)} buildings ({dropped} dropped), d {idx["n"]["bytes"] / 1e6:.2f} MB, viertel.json '
              f'{rep["bytes_viertel"] / 1e3:.0f} kB; inside the municipality: footprint {s["footprint"] / 1e4:.1f} ha, floor area {s["floorArea"] / 1e4:.1f} ha, '
              f'roofs {s["roofArea"] / 1e4:.1f} ha, solar potential {s["pvKwp"] / 1e3:.1f} MWp')
        S.log('zahlen: roof planes against g:', json.dumps(rep['roof_check']))
    return rep


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--g', required=True, help='the folder suhl/g/v<N> (its 10/<x>/<y>.json and index.json)')
    ap.add_argument('--out', required=True, help='the folder <root>/suhl/d/v<N> to write')
    ap.add_argument('--version', default=None, help='N of the version (default: from the name of --out)')
    ap.add_argument('--area', default='stadt', choices=('stadt', 'kernstadt', 'zentrum', 'probe'))
    ap.add_argument('--zensus', default=None, help='folder with the census cells of Suhl (tools/suhl/out/daten/zensus)')
    ap.add_argument('--report', default=None)
    a = ap.parse_args()
    v = a.version if a.version is not None else os.path.basename(os.path.abspath(a.out))
    if SC.version_of(v) is None:
        raise SystemExit(f'zahlen: cannot tell the version from {a.out!r} - name the folder v<N> or pass --version')
    run(a.g, a.out, SC.version_of(v), a.area, census=a.zensus, report=a.report)
