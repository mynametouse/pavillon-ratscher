#!/usr/bin/env python3
"""suhl-daten, package S2-9: the census 2022 on the 100 m grid for Suhl (Statistische Ämter des Bundes und der Länder, Zensus 2022,
reference day 15.05.2022, grid in EPSG:3035; licence dl-de/by-2-0, name the source with the date of retrieval).

Step 1 - fetch and cut (GitHub Actions; a download is ~10-90 MB per theme and stays outside git):
    python3 -I tools/suhl/daten/zensus.py --fetch --raw ~/suhl-raw/zensus --out tools/suhl/out/daten/zensus [--themes einwohner,...]
  reads the links of the official download page, loads the ZIP of every theme of THEMES, keeps the cells of the 100 m grid that
  touch the municipality of Suhl with all their columns and writes one small JSON per theme (+ abruf.json: what was fetched).
Step 2 - use (tools/suhl/daten/zahlen.py --zensus <folder>):  apply() distributes cell values to buildings and sums them per quarter.

What this module never does (docs/features/suhl-daten.md, section 13):
  * it does not undo the census' secrecy: a value a cell does not show ("-", empty) stays unknown - it is neither derived from totals
    nor from neighbours, and a number per building is only ever a share of a shown cell value, marked as a model estimate;
  * it reads nothing about single persons, owners or parcels - only the published cell counts.
"""
import argparse, csv, io, json, math, os, re, sys, time, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import suhllib as S

PAGE = 'https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Zensus2022/_inhalt.html'
BASE = 'https://www.destatis.de/static/DE/zensus/gitterdaten/'
SOURCE = 'Statistische Ämter des Bundes und der Länder, Zensus 2022 (Stichtag 15.05.2022), Gitterdaten 100 m; Werte zur Geheimhaltung leicht verändert'
LICENCE = 'Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0)'
OUT = os.path.join(S.REPO, 'tools', 'suhl', 'out', 'daten', 'zensus')

# theme -> the file of the download page (name without .zip). Counts can be summed per quarter; rates and means cannot.
THEMES = {
    'einwohner': 'Zensus2022_Bevoelkerungszahl',
    'alter': 'Alter_in_5_Altersklassen',
    'alter10': 'Alter_in_10er-Jahresgruppen',
    'haushalte': 'Zensus2022_Groesse_des_privaten_Haushalts_in_Gitterzellen',
    'heizungsart': 'Gebaeude_mit_Wohnraum_nach_ueberwiegender_Heizungsart',
    'energietraeger': 'Gebaeude_mit_Wohnraum_nach_Energietraeger_der_Heizung',
    'wohnungen': 'Wohnungen_nach_Gebaeudetyp_Groesse',
    'leerstand': 'Leerstandsquote_in_Gitterzellen',
    'eigentum': 'Eigentuemerquote_in_Gitterzellen',
    'wohnflaeche': 'Durchschnittliche_Wohnflaeche_je_Bewohner_in_Gitterzellen',
    'gebaeudetyp': 'Gebaeude_mit_Wohnraum_nach_Gebaeudetyp_Groesse',
    'baujahr': 'Gebaeude_nach_Baujahr_in_Mikrozensus_Klassen',
}
NO_VALUE = ('', '-', '–', '—', '.', '/', 'x', 'X', '...')


def num(v):
    """a cell value as a number, or None when the census shows none (kept secret, or nothing there)"""
    v = (v or '').strip().strip('"')
    if v in NO_VALUE:
        return None
    try:
        return float(v.replace(',', '.'))
    except ValueError:
        return None


# ---------------------------------------------------------------- step 1: fetch and cut
def discover(log=S.log):
    """{file name without .zip: url} of the grid files the official page links to; {} when the page cannot be read"""
    try:
        st, body, _, _ = S.http_get(PAGE, tries=3, timeout=90, quiet=True)
    except Exception as ex:
        log(f'zensus: the download page could not be read ({type(ex).__name__}) - using the known folder {BASE}')
        return {}
    import html
    out = {}
    for href in re.findall(r'href="([^"]+?\.zip)"', body.decode('utf-8', 'replace')):
        url = html.unescape(href).replace('http://', 'https://')
        if '/zensus/gitterdaten/' in url:
            out[url.rsplit('/', 1)[-1][:-4]] = url
    log(f'zensus: the download page names {len(out)} grid files of the census 2022')
    return out


def touches_suhl(stadt, E, N, half=50.0):
    """does the 100 m cell with midpoint (E, N) touch the municipality? (midpoint or a corner inside)"""
    return (stadt.contains(E, N) or stadt.contains(E - half, N - half) or stadt.contains(E + half, N - half)
            or stadt.contains(E - half, N + half) or stadt.contains(E + half, N + half))


def cut(path, theme, url=None, log=S.log):
    """the cells of Suhl of one census grid file (ZIP with CSVs for 100 m, 1 km, 10 km) -> dict for <theme>.json"""
    stadt = S.area('stadt')
    b = stadt.bbox
    cs = [S.laea_from_utm(e, n) for e in (b[0] - 200, b[2] + 200) for n in (b[1] - 200, b[3] + 200)]
    X0, X1 = min(c[0] for c in cs) - 200, max(c[0] for c in cs) + 200
    Y0, Y1 = min(c[1] for c in cs) - 200, max(c[1] for c in cs) + 200
    z = zipfile.ZipFile(path)
    names = [n for n in z.namelist() if n.lower().endswith('.csv') and '100m' in n.lower()]
    if not names:
        raise S.SuhlError(f'no CSV of the 100 m grid in {os.path.basename(path)}: {z.namelist()[:6]}')
    f = io.TextIOWrapper(z.open(names[0]), encoding='utf-8-sig', errors='replace', newline='')
    head = f.readline()
    delim = ';' if head.count(';') >= head.count(',') else ','
    cols = [c.strip().strip('"') for c in head.rstrip('\r\n').split(delim)]
    ix = next((i for i, c in enumerate(cols) if c.lower().startswith('x_mp')), None)
    iy = next((i for i, c in enumerate(cols) if c.lower().startswith('y_mp')), None)
    if ix is None or iy is None:
        raise S.SuhlError(f'no x_mp / y_mp columns in {names[0]}: {cols}')
    cells, n = [], 0
    for row in csv.reader(f, delimiter=delim):
        n += 1
        try:
            x, y = float(row[ix]), float(row[iy])
        except (ValueError, IndexError):
            continue
        if not (X0 <= x <= X1 and Y0 <= y <= Y1):
            continue
        E, N = S.utm_from_laea(x, y)
        if touches_suhl(stadt, E, N):
            cells.append([c.strip() for c in row])
    if n < 1000:
        raise S.GuardError(f'zensus: only {n} rows in {names[0]} - not a grid file of Germany')
    doc = {'thema': theme, 'quelle': SOURCE, 'lizenz': LICENCE, 'url': url or BASE + os.path.basename(path), 'abruf': time.strftime('%Y-%m-%d', time.gmtime()),
           'datei': names[0], 'zeilen_gelesen': n, 'zellen': len(cells), 'spalten': cols, 'x': ix, 'y': iy,
           'auswahl': 'Zellen, deren Mittelpunkt oder eine Ecke in der Gemeinde Suhl liegt (OSM-Grenze, tools/suhl/out/bestand/gebiete.geojson)',
           'cells': cells}
    log(f'zensus: {theme}: {names[0]} rows {n}, cells of Suhl {len(cells)}, columns {cols}')
    return doc


def fetch(raw, out, themes=None, log=S.log, pause=2.0):
    """download and cut the themes; a theme that cannot be fetched is skipped with a clear line. Returns the report (abruf.json)."""
    os.makedirs(raw, exist_ok=True)
    os.makedirs(out, exist_ok=True)
    links = discover(log)
    rep = {'made': S.now(), 'page': PAGE, 'themes': {}}
    for theme in (themes or list(THEMES)):
        name = THEMES[theme]
        url = links.get(name) or (BASE + name + '.zip')
        dest = os.path.join(raw, name + '.zip')
        entry = {'file': name + '.zip', 'url': url, 'listed_on_page': name in links}
        try:
            if not (os.path.exists(dest) and os.path.getsize(dest) > 10000 and zipfile.is_zipfile(dest)):
                if os.path.exists(dest):
                    os.remove(dest)                      # a broken or cut-off download of an earlier run
                got, st, note = S.http_download(url, dest, tries=3, timeout=600, pause=pause, magic=b'PK')
                if got is None:
                    raise S.SuhlError(f'download failed: {note[:120]}')
                entry['fetched'] = True
            entry['bytes'] = os.path.getsize(dest)
            doc = cut(dest, theme, url, log)
            S.write_json(os.path.join(out, theme + '.json'), doc)
            entry.update({'cells': doc['zellen'], 'columns': doc['spalten'], 'rows': doc['zeilen_gelesen'], 'ok': True})
        except (Exception, SystemExit) as ex:
            entry.update({'ok': False, 'error': f'{type(ex).__name__}: {str(ex)[:200]}'})
            log(f'zensus: SKIPPED {theme}: {entry["error"]}')
        rep['themes'][theme] = entry
    rep['ok'] = sum(1 for e in rep['themes'].values() if e['ok'])
    S.write_json(os.path.join(out, 'abruf.json'), rep, compact=False)
    return rep


# ---------------------------------------------------------------- step 2: read
class Grid:
    """one theme: {(column, row) of the 100 m cell: {column name: number or None}}"""

    def __init__(self, path):
        d = S.read_json(path)
        self.doc = d
        self.theme = d.get('thema')
        cols = d['spalten']
        skip = {d['x'], d['y']}
        self.value_cols = [(i, c) for i, c in enumerate(cols) if i not in skip and not c.lower().startswith(('gitter_id', 'werterl'))]
        self.cells = {}
        for row in d['cells']:
            try:
                key = (int(float(row[d['x']]) // 100), int(float(row[d['y']]) // 100))
            except (ValueError, IndexError):
                continue
            self.cells[key] = {c: (num(row[i]) if i < len(row) else None) for i, c in self.value_cols}

    def at(self, E, N):
        return self.cells.get(S.census_cell(E, N))

    @staticmethod
    def centre_utm(key):
        return S.utm_from_laea(key[0] * 100 + 50.0, key[1] * 100 + 50.0)


def load(folder):
    """{theme: Grid} of the files that are there"""
    out = {}
    for theme in THEMES:
        p = os.path.join(folder, theme + '.json')
        if os.path.exists(p):
            out[theme] = Grid(p)
    return out


# ---------------------------------------------------------------- step 2: distribute and sum
MINOR = ('neben', 'garage')
AGE = (('unter18', 'u18'), ('18bis29', '18_29'), ('30bis49', '30_49'), ('50bis64', '50_64'), ('65und', '65plus'))
HOUSEHOLDS = (('1_person', '1'), ('2_person', '2'), ('3_person', '3'), ('4_person', '4'), ('5_person', '5'), ('6_person', '6plus'))
# order matters: "Biomasse_Biogas" holds the word gas
CARRIERS = (('biomasse', 'bio'), ('gas', 'gas'), ('oel', 'oel'), ('holz', 'holz'), ('solar', 'wp'), ('strom', 'strom'), ('kohle', 'kohle'),
            ('fernw', 'fern'), ('kein', 'kein'))
HEAT_TYPES = (('fernheiz', 'fern'), ('etagen', 'etage'), ('blockheiz', 'block'), ('zentral', 'zentral'), ('oefen', 'ofen'), ('keine', 'keine'))
BUILDING_TYPES = (('freiefh', 'efh'), ('efh_dhh', 'efh'), ('efh_reihen', 'efh'), ('freist_zfh', 'zfh'), ('zfh_dhh', 'zfh'), ('zfh_reihen', 'zfh'),
                  ('mfh_3bis6', 'mfh_3_6'), ('mfh_7bis12', 'mfh_7_12'), ('mfh_13', 'mfh_13plus'), ('anderer', 'anderer'))


def _classes(row, table):
    """{class: value} of the columns of a cell that show a value; a column the table does not know is left out"""
    out = {}
    for col, v in row.items():
        if v is None or col.lower().startswith('insgesamt'):
            continue
        lc = col.lower()
        for word, name in table:
            if word in lc:
                out[name] = out.get(name, 0.0) + v
                break
    return out


def _total(row):
    """the value of the column Insgesamt_..., else of the only column"""
    for col, v in row.items():
        if col.lower().startswith('insgesamt'):
            return v
    return next(iter(row.values())) if len(row) == 1 else None


class Agg:
    """the census of a set of cells: sums of the values the cells show. Counts below 3 are not shown by the census and are missing here."""

    def __init__(self):
        self.cells = 0
        self.res = 0.0
        self.age, self.age_total = {}, 0.0
        self.hh, self.hh_total = {}, 0.0
        self.bld = 0.0
        self.carrier, self.htype, self.btype = {}, {}, {}
        self.dw = 0.0
        self.vacant, self.vac_cells, self.vac_dw = 0.0, 0, 0.0
        self.owner, self.owner_dw = 0.0, 0.0
        self.living, self.living_res = 0.0, 0.0

    @staticmethod
    def _add(dst, src):
        for k, v in src.items():
            dst[k] = dst.get(k, 0.0) + v

    def add(self, key, g):
        r = g['einwohner'].cells.get(key) if 'einwohner' in g else None
        pop = _total(r) if r else None
        if pop is not None:
            self.cells += 1
            self.res += pop
        r = g['alter'].cells.get(key) if 'alter' in g else None
        if r:
            self._add(self.age, _classes(r, AGE))
            self.age_total += _total(r) or 0.0
        r = g['haushalte'].cells.get(key) if 'haushalte' in g else None
        if r:
            self._add(self.hh, _classes(r, HOUSEHOLDS))
            self.hh_total += _total(r) or 0.0
        r = g['energietraeger'].cells.get(key) if 'energietraeger' in g else None
        if r:
            self._add(self.carrier, _classes(r, CARRIERS))
            self.bld += _total(r) or 0.0
        r = g['heizungsart'].cells.get(key) if 'heizungsart' in g else None
        if r:
            self._add(self.htype, _classes(r, HEAT_TYPES))
        r = g['gebaeudetyp'].cells.get(key) if 'gebaeudetyp' in g else None
        if r:
            self._add(self.btype, _classes(r, BUILDING_TYPES))
        r = g['wohnungen'].cells.get(key) if 'wohnungen' in g else None
        dw = _total(r) if r else None
        if dw is not None:
            self.dw += dw
            v = g['leerstand'].cells.get(key) if 'leerstand' in g else None
            rate = v.get('Leerstandsquote') if v else None
            if rate is not None:
                self.vacant += rate / 100.0 * dw
                self.vac_cells += 1
                self.vac_dw += dw
            v = g['eigentum'].cells.get(key) if 'eigentum' in g else None
            rate = v.get('Eigentuemerquote') if v else None
            if rate is not None:
                self.owner += rate / 100.0 * dw
                self.owner_dw += dw
        v = g['wohnflaeche'].cells.get(key) if 'wohnflaeche' in g else None
        per = v.get('durchschnFlaechejeBew') if v else None
        if per is not None and pop is not None:
            self.living += per * pop
            self.living_res += pop

    def json(self):
        r0 = lambda d: {k: round(v) for k, v in d.items()}      # noqa: E731
        j = {'year': 2022, 'date': '2022-05-15', 'cells': self.cells, 'residents': round(self.res)}
        if self.age:
            shown = sum(self.age.values())
            j['age'] = dict(r0(self.age), shown=round(shown), share65=round(self.age.get('65plus', 0.0) / shown, 3) if shown else None,
                            shareU18=round(self.age.get('u18', 0.0) / shown, 3) if shown else None)
        if self.hh_total:
            j['households'] = dict(r0(self.hh), n=round(self.hh_total), share1=round(self.hh.get('1', 0.0) / self.hh_total, 3))
        if self.bld:
            j['housingBuildings'] = round(self.bld)
            j['heatBy'] = dict(r0(self.carrier), shown=round(sum(self.carrier.values())))
            if self.htype:
                j['heatType'] = r0(self.htype)
            if self.btype:
                j['buildingTypes'] = r0(self.btype)
        if self.dw:
            j['dwellings'] = round(self.dw)
            j['vacantShown'] = round(self.vacant)
            j['vacancyMin'] = round(self.vacant / self.dw, 3)
            j['ownerShown'] = round(self.owner)
            j['ownerRateMin'] = round(self.owner / self.dw, 3)
        if self.living_res:
            j['livingArea'] = round(self.living)
            j['livingAreaPerResident'] = round(self.living / self.living_res, 1)
        return j


def housing_weight(d, ex):
    """the floor area of a building people live on (model): dwellings only, a shop floor taken off, nothing for a vacant house"""
    if ex['use'] != 'wohnen' or ex['k'] not in (0, None) or ex['fg'] & 8:
        return 0.0
    w = ex['gfa'] + ex['dg']
    if ex.get('eg') and ex['eg'] != 'wohnen' and ex['lv'] > 1:
        w -= ex['fa']
    return max(w, 0.0)


def fallback_weight(d, ex):
    """a cell with residents but without a dwelling house in the records (a care home, a hostel, a house the cadastre calls otherwise)"""
    if ex['use'] in MINOR or ex['k'] not in (0, None) or ex['fg'] & 8:
        return 0.0
    return ex['gfa']


class Applied:
    """what apply() found: the census per quarter and area, the numbers written into the building records"""

    def __init__(self, grids, quarters):
        self.g, self.Q = grids, quarters
        self.keys = set()
        for gr in grids.values():
            self.keys |= set(gr.cells)
        self.pos = {k: Grid.centre_utm(k) for k in self.keys}
        self.nr = {k: quarters.nearest_nr(*self.pos[k]) for k in self.keys}
        self.agg = {}
        for k in self.keys:
            self.agg.setdefault(self.nr[k], Agg()).add(k, grids)
        self.unassigned = {}                 # cell -> residents no building could take
        self.points = []                     # (E, N, residents, quarter nr) of every building with residents
        self.n_res = {1: 0, 0: 0}
        self.n_heat = {1: 0, 0: 0}
        self.dense = 0

    def _model(self, pts, cells):
        un = sum(self.unassigned[k] for k in cells if k in self.unassigned)
        return {'model': round(sum(p[2] for p in pts) + un, 1), 'q': 1, 'buildings': len(pts), 'unassigned': round(un),
                'how': 'Modell-Schätzung: Einwohner jeder Zensus-Zelle (100 m, 15.05.2022) nach Wohn-Geschossfläche auf ihre Wohngebäude '
                       'verteilt; „unassigned“ = Einwohner von Zellen ohne passendes Gebäude, hier nach Zellmitte gezählt'}

    def quarter(self, nr):
        out = {'residents': self._model([p for p in self.points if p[3] == nr], [k for k in self.unassigned if self.nr[k] == nr])}
        if nr in self.agg:
            out['census'] = self.agg[nr].json()
        return out

    def area(self, aid, ar):
        a = Agg()
        cells = [k for k in self.keys if ar.contains(*self.pos[k])]
        for k in cells:
            a.add(k, self.g)
        return {'residents': self._model([p for p in self.points if ar.contains(p[0], p[1])], cells), 'census': a.json()}

    def meta(self):
        docs = [gr.doc for gr in self.g.values()]
        return {'quelle': SOURCE, 'lizenz': LICENCE, 'abruf': max(d.get('abruf', '') for d in docs), 'themen': sorted(self.g),
                'hinweis': 'Summen der Werte, die die Zellen zeigen; Zahlen unter 3 zeigt der Zensus nicht, sie fehlen in den Summen. '
                           'Leerstand und Eigentümerquote sind deshalb Untergrenzen (vacancyMin, ownerRateMin: leere bzw. vom Eigentümer '
                           'bewohnte Wohnungen der Zellen mit Angabe, geteilt durch alle Wohnungen).'}

    def report(self):
        tot = Agg()
        for k in self.keys:
            tot.add(k, self.g)
        return {'cells': len(self.keys), 'city': tot.json(), 'buildings_with_residents': {'q1': self.n_res[1], 'q0': self.n_res[0]},
                'residents_on_buildings': round(sum(p[2] for p in self.points), 1),
                'residents_unassigned': round(sum(self.unassigned.values())), 'cells_unassigned': len(self.unassigned),
                'cells_dense_over_1_per_10m2': self.dense, 'buildings_with_heat_kind': {'q1': self.n_heat[1], 'q0': self.n_heat[0]}}


def _inside(ring, x, y):
    n, c = len(ring), False
    for i in range(n):
        (x0, y0), (x1, y1) = ring[i], ring[(i + 1) % n]
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            c = not c
    return c


def cell_shares(ring, centre):
    """{census cell: share of the footprint in it} for a footprint ring in UTM. A building inside one cell (the usual case) is found
    by its corners; a long block is sampled on a 4 m grid, so each of its house entrances counts in its own cell."""
    es, ns = [p[0] for p in ring], [p[1] for p in ring]
    box = (min(es), min(ns), max(es), max(ns))
    corners = {S.census_cell(e, n) for e in (box[0], box[2]) for n in (box[1], box[3])}
    if len(corners) == 1:
        return {corners.pop(): 1.0}
    step = max(1.0, min(4.0, min(box[2] - box[0], box[3] - box[1]) / 3.0))
    count, n = {}, 0
    y = box[1] + step / 2
    while y < box[3]:
        x = box[0] + step / 2
        while x < box[2]:
            if _inside(ring, x, y):
                k = S.census_cell(x, y)
                count[k] = count.get(k, 0) + 1
                n += 1
            x += step
        y += step
    if not n:
        return {S.census_cell(*centre): 1.0}
    return {k: v / n for k, v in count.items()}


def apply(folder, exs, quarters, rules=None, log=S.log):
    """write residents (res, q.res) and the probable energy carrier (heat.k, heat.p, q.heat) into the records of zahlen.py;
    exs = [(tile, d record, extras)]. Returns an Applied, or None when the folder holds no population grid."""
    grids = load(folder)
    if 'einwohner' not in grids:
        log(f'zensus: no einwohner.json under {folder} - the numbers stay without residents')
        return None
    A = Applied(grids, quarters)
    by_cell, by_centre = {}, {}
    for _, d, ex in exs:
        by_centre.setdefault(S.census_cell(ex['E'], ex['N']), []).append((d, ex))
        if ex['use'] in MINOR:
            continue
        for key, share in cell_shares(ex['ring'], (ex['E'], ex['N'])).items():
            by_cell.setdefault(key, []).append((share, d, ex))
    got = {}                                              # id -> [residents, worst quality]
    for key, row in grids['einwohner'].cells.items():
        pop = _total(row)
        if pop is None:
            continue
        bl = by_cell.get(key, [])
        w, q = [sh * housing_weight(d, ex) for sh, d, ex in bl], 1
        if sum(w) <= 0:
            w, q = [sh * fallback_weight(d, ex) for sh, d, ex in bl], 0
        tot = sum(w)
        if tot <= 0:
            A.unassigned[key] = pop
            continue
        if pop / tot > 0.1:
            A.dense += 1
        for wi, (_, d, ex) in zip(w, bl):
            if wi > 0:
                g = got.setdefault(ex['id'], [0.0, 1, d, ex])
                g[0] += pop * wi / tot
                g[1] = min(g[1], q)
    for r, q, d, ex in got.values():
        if r >= 0.05:
            ex['res'] = r
            d['res'] = round(r, 1)
            d['q']['res'] = q
            A.points.append((ex['E'], ex['N'], r, ex['nr']))
            A.n_res[q] += 1
    by_cell = by_centre                                   # the energy carrier: the cell of the building's middle
    if 'energietraeger' in grids:
        for key, row in grids['energietraeger'].cells.items():
            cl = _classes(row, CARRIERS)
            tot = _total(row)
            if not cl or not tot:
                continue
            kind = max(cl, key=lambda k: cl[k])
            share = min(1.0, cl[kind] / tot)
            q = 1 if share >= 0.6 else 0
            for d, ex in by_cell.get(key, []):
                if ex['use'] == 'wohnen' and ex['k'] in (0, None):
                    d.setdefault('heat', {})
                    d['heat'] = dict({'k': kind, 'p': round(share, 2)}, **{k: v for k, v in d['heat'].items() if k == 'd'})
                    d['q']['heat'] = q
                    A.n_heat[q] += 1
    return A


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--fetch', action='store_true')
    ap.add_argument('--raw', default=os.path.expanduser('~/suhl-raw/zensus'))
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--themes', default=None, help='comma separated, default all: ' + ','.join(THEMES))
    a = ap.parse_args()
    if a.fetch:
        th = [t for t in (a.themes.split(',') if a.themes else THEMES) if t]
        bad = [t for t in th if t not in THEMES]
        if bad:
            raise SystemExit(f'zensus: unknown theme(s) {bad}; known: {", ".join(THEMES)}')
        r = fetch(a.raw, a.out, th)
        S.log(f'zensus: {r["ok"]} of {len(r["themes"])} themes written to {a.out}')
    else:
        g = load(a.out)
        for t, gr in g.items():
            S.log(f'{t}: {len(gr.cells)} cells, columns {[c for _, c in gr.value_cols]}')
