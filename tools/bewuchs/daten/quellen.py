"""The vector sources of the class maps, loaded once: OpenStreetMap areas and lines (sorted into the kinds the classifier asks for), the
app's roads (inside the square dist/geo/roads.b64.json; beyond it the drive's dist/fahrt/strassen.json and OSM's streets, tracks and
paths with the widths of tools/geo/build_roads.py), its built-up areas (dist/strassen/ausstattung.json), its buildings (OSM footprints of
the fetch, ETHOS footprints of dist/gebaeude/ratscher.json and z/, the towns' own of dist/schleusingen/stadt.json and dist/vessra/ort.json),
its measured trees (dist/geo/trees.b64.json), the site and brook (app_daten.mjs), the centre of the village (world/dorfkern_data.js), the
hedges of stadtgruen and of Kloster Veßra (drawn there, so 0 here), the streets the two towns paint over the photo (TOWN_ST)."""
import base64, glob, json, math, os, subprocess, sys
import numpy as np
from shapely.geometry import LineString, Point, Polygon, box
from shapely.strtree import STRtree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import DIST, RAW, REPO  # noqa: E402
import osm_flaechen  # noqa: E402

# width (m) of waterways without a width tag
WATER_W = {'river': 6.0, 'canal': 4.0, 'stream': 1.4, 'ditch': 0.8, 'drain': 0.8, 'brook': 1.2}
SEALED_SURF = {'asphalt', 'concrete', 'paving_stones', 'sett', 'paved', 'tartan', 'artificial_turf', 'compacted', 'gravel', 'fine_gravel',
               'sand', 'concrete:plates', 'cobblestone', 'clay', 'acrylic', 'rubber', 'metal', 'wood'}


# OSM highways → kind, surface, width: the rules of tools/geo/build_roads.py (classify), kept the same here (that script cannot be imported:
# it builds when loaded). Kinds as world/roads.js KINDS.
RKINDS = [('motorway', 11.5, 'concrete'), ('main', 6.6, 'asphalt'), ('county', 6.0, 'asphalt'), ('street', 5.0, 'asphalt'), ('lane', 3.6, 'asphalt'),
          ('service', 3.0, 'asphalt'), ('track', 3.0, 'ground'), ('path', 1.4, 'ground'), ('foot', 1.8, 'paving')]
RKI = {k[0]: i for i, k in enumerate(RKINDS)}
RSURF = ['asphalt', 'concrete', 'paving', 'gravel', 'ground', 'grass']
SURF_OSM = {'asphalt': 'asphalt', 'paved': 'asphalt', 'chipseal': 'asphalt', 'concrete': 'concrete', 'concrete:plates': 'concrete',
            'concrete:lanes': 'concrete', 'paving_stones': 'paving', 'sett': 'paving', 'cobblestone': 'paving', 'unhewn_cobblestone': 'paving',
            'bricks': 'paving', 'wood': 'paving', 'metal': 'paving', 'gravel': 'gravel', 'fine_gravel': 'gravel', 'compacted': 'gravel',
            'pebblestone': 'gravel', 'unpaved': 'ground', 'ground': 'ground', 'dirt': 'ground', 'earth': 'ground', 'mud': 'ground', 'sand': 'ground',
            'grass': 'grass', 'grass_paver': 'grass'}


def road_of(t):
    """(kind, surface, width m, bridge) of an OSM highway, or None"""
    hw = t.get('highway')
    if hw in ('motorway', 'motorway_link'):
        k = 'motorway'
    elif hw in ('trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link'):
        k = 'main'
    elif hw in ('tertiary', 'tertiary_link'):
        k = 'county'
    elif hw in ('residential', 'living_street', 'road', 'raceway'):
        k = 'street'
    elif hw == 'unclassified':
        k = 'lane'
    elif hw == 'service':
        k = 'service'
    elif hw == 'track':
        k = 'track'
    elif hw in ('path', 'bridleway'):
        k = 'path'
    elif hw in ('footway', 'pedestrian', 'cycleway'):
        k = 'foot'
    else:
        return None
    name, wd, sf = RKINDS[RKI[k]]
    s = SURF_OSM.get(t.get('surface', ''), None)
    if s is None:
        if k == 'track':
            s = {'grade1': 'asphalt', 'grade2': 'gravel', 'grade3': 'ground', 'grade4': 'ground', 'grade5': 'grass'}.get(t.get('tracktype'), 'ground')
        elif k == 'path':
            s = 'asphalt' if 'agricultural' in t.get('motor_vehicle', '') else 'ground'
        else:
            s = sf
    if k == 'track' and t.get('tracktype') == 'grade1' and s == 'ground':
        s = 'asphalt'
    if k == 'path' and ('agricultural' in t.get('motor_vehicle', '') or s in ('asphalt', 'concrete')):
        k = 'lane' if s in ('asphalt', 'concrete') else 'track'
        wd = 3.0
    if k == 'service' and t.get('service') in ('driveway', 'parking_aisle'):
        wd = 2.8
    if k == 'track' and s in ('asphalt', 'concrete', 'paving'):
        wd = 3.0
    if k == 'lane' and t.get('name') == 'Flurweg':
        wd = 3.2
    try:
        wd = float(t['width'].replace(',', '.').replace('m', '').strip()) if 'width' in t else wd
    except ValueError:
        pass
    return RKI[k], RSURF.index(s), float(np.clip(wd, 1.0, 14.0)), t.get('bridge') not in (None, 'no')


# the towns' streets as their modules paint them over the photo (welt/schleusingen.js and welt/vessra.js streetMap(): a window of
# 2 × 460 m round the Markt / the monastery, one width per kind) – wider than build_roads.py's for the main roads, so the carriageway is
# the wider of the two (test_daten.py compares these numbers with the modules)
TOWN_ST = {
    'schleusingen': {'file': 'schleusingen/stadt.json', 'c': (-1084.7, 1241.9), 'half': 460.0,
                     'w': {1: 8.0, 2: 7.0, 3: 5.6, 5: 3.6, 8: 2.2}},
    'vessra': {'file': 'vessra/ort.json', 'c': (-8790.0, -235.0), 'half': 460.0,
               'w': {1: 7.0, 2: 6.5, 3: 5.2, 5: 3.2, 6: 2.8, 7: 1.8, 8: 1.8}},
}
# vessra.js paints a track or path only with a known surface (or inside the museum's grounds); the others the photo shows
TOWN_SURF = {'asphalt', 'concrete', 'paved', 'chipseal', 'sett', 'cobblestone', 'paving_stones', 'gravel', 'fine_gravel', 'compacted',
             'unpaved', 'dirt', 'ground', 'pebblestone'}


def town_streets(name, data):
    """the streets a town paints (TOWN_ST[name]) from its data (stadt.json / ort.json): [{kind, surf, w, bridge, p}] clipped to the window"""
    T = TOWN_ST[name]
    cx, cy = T['c']
    win = box(cx - T['half'], cy - T['half'], cx + T['half'], cy + T['half'])
    mu = next((Polygon(np.asarray(a['p'], float).reshape(-1, 2)) for a in data.get('areas', []) if a.get('k') == 'museum'), None)
    out = []
    for s in data.get('st', []):
        k, sf, q = s.get('k'), s.get('s') or '', s.get('p') or []
        if k not in T['w'] or len(q) < 4:
            continue
        if name == 'vessra' and k > 5 and sf not in TOWN_SURF:
            mi = (len(q) >> 2) * 2
            if not (k >= 7 and mu is not None and mu.contains(Point(q[mi], q[mi + 1]))):
                continue
        ln = LineString(np.asarray(q, float).reshape(-1, 2)).intersection(win)
        for g in getattr(ln, 'geoms', [ln]):
            if g.geom_type == 'LineString' and g.length > 0.5:
                out.append({'kind': k, 'surf': 0, 'w': T['w'][k], 'bridge': False, 'p': np.asarray(g.coords)[:, :2], 'town': name})
    return out


def kind_of(t):
    """the kind of an OSM area for the classifier (None: not used)"""
    lu, le, na, am = t.get('landuse'), t.get('leisure'), t.get('natural'), t.get('amenity')
    if 'building' in t or t.get('building:part') or t.get('man_made') in ('bunker_silo', 'silo', 'storage_tank', 'wastewater_plant', 'water_tower'):
        return 'building'
    if na == 'water' or lu in ('reservoir', 'basin') or t.get('waterway') in ('riverbank', 'dock') or le == 'swimming_pool':
        return 'water'
    if am in ('parking', 'fuel', 'bicycle_parking') or 'area:highway' in t or t.get('highway') in ('pedestrian', 'service', 'footway') \
            or t.get('railway') or lu in ('railway', 'construction', 'garages') or t.get('parking'):
        return 'sealed'
    if le == 'pitch':
        return 'sealed' if t.get('surface') in SEALED_SURF else 'pitch'
    if le in ('track',) or t.get('surface') in SEALED_SURF and le in ('sports_centre', 'stadium'):
        return 'sealed'
    if lu == 'farmland' or lu == 'greenhouse_horticulture':
        return 'field'
    if lu == 'orchard' or t.get('trees') in ('apple_trees', 'pear_trees', 'cherry_trees', 'plum_trees'):
        return 'orchard'
    if lu in ('meadow',) or na in ('grassland', 'fell'):
        return 'pasture' if t.get('meadow') == 'pasture' or lu == 'pasture' else 'meadow'
    if lu == 'pasture':
        return 'pasture'
    if lu == 'grass':
        return 'grass'
    if lu == 'forest' or na == 'wood':
        return 'forest'
    if na in ('scrub', 'heath') or lu == 'shrubs':
        return 'scrub'
    if lu in ('cemetery',) or am == 'grave_yard':
        return 'cemetery'
    if lu == 'allotments':
        return 'allotments'
    if le in ('park', 'playground', 'garden', 'common', 'dog_park', 'picnic_site', 'recreation_ground') or lu in ('village_green', 'recreation_ground', 'religious') \
            or am in ('school', 'kindergarten', 'place_of_worship', 'townhall', 'community_centre', 'social_facility', 'hospital', 'fire_station', 'library'):
        return 'public'
    if le in ('stadium', 'sports_centre'):
        return 'sport'
    if lu in ('residential', 'retail', 'commercial'):
        return 'residential'
    if lu in ('farmyard', 'industrial', 'quarry', 'landfill', 'depot'):
        return 'yard'
    return None


class Quellen:
    def __init__(self, osm_files=None):
        files = osm_files or sorted(glob.glob(os.path.join(RAW, 'osm', '*.xml')))
        areas, lines, points = osm_flaechen.extract(files)
        self.areas = []
        for g, t, i in areas:
            k = kind_of(t)
            if k:
                self.areas.append((g, k, t, i))
        self.waters = []  # (LineString, width, kind)
        self.hedges = []
        self.fences = []
        self.highways = []  # OSM roads beyond the square: {kind, surf, w, bridge, p, osm}
        for g, t, i in lines:
            r = road_of(t) if 'highway' in t and t.get('area') != 'yes' and t.get('tunnel') in (None, 'no') else None
            if r:
                self.highways.append({'kind': r[0], 'surf': r[1], 'w': r[2], 'bridge': r[3], 'p': np.asarray(g.coords), 'osm': True})
            w = t.get('waterway')
            if w in WATER_W and t.get('tunnel') not in ('culvert', 'yes'):
                try:
                    wd = float(t.get('width', '').replace(',', '.').replace('m', '').strip())
                except ValueError:
                    wd = WATER_W[w]
                self.waters.append((g, wd, w))
            if t.get('barrier') == 'hedge':
                self.hedges.append(g)
            if t.get('barrier') in ('fence', 'wall'):
                self.fences.append(g)
        self.points = points
        self.area_tree = STRtree([a[0] for a in self.areas])
        self.roads = self._roads()
        self.fahrt = self._fahrt()
        self.orte = self._orte()
        self.trees = self._trees()
        self.ethos = self._ethos()
        self.app = json.load(open(os.path.join(RAW, 'app.json'))) if os.path.exists(os.path.join(RAW, 'app.json')) else self._app()
        self.stadtgruen_hedges = self._stadtgruen()
        self.zone_b, self.zone_lines = self._zones()
        self.town_st = []
        for name, T in TOWN_ST.items():
            fn = os.path.join(DIST, T['file'])
            if os.path.exists(fn):
                with open(fn) as fh:
                    self.town_st += town_streets(name, json.load(fh))
        self._zcells = {}
        from shapely.geometry import box as _box
        x0, y0, x1, y1 = (json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']['roads']['box'])
        self.square = _box(x0, y0, x1, y1)

    # ---- app data ----
    def _roads(self):
        j = json.load(open(os.path.join(DIST, 'geo', 'roads.b64.json')))
        a = np.frombuffer(base64.b64decode(j['b64']), '<i2')
        out, o = [], 0
        while o + 5 <= len(a):
            n, kind, surf, w, fl = (int(v) for v in a[o:o + 5])
            o += 5
            p = a[o:o + 2 * n].astype(float).reshape(-1, 2) / 10
            o += 2 * n
            out.append({'kind': kind, 'surf': surf, 'w': w / 10, 'bridge': bool(fl & 1), 'p': p})
        return out

    def _fahrt(self):
        """the drive's roads beyond the square (welt/fahrt.js): [kind, surface, width dm, flags, name, ref, x y z … in dm]"""
        fn = os.path.join(DIST, 'fahrt', 'strassen.json')
        if not os.path.exists(fn):
            return []
        j = json.load(open(fn))
        km = [RKI.get(k, -1) for k in j.get('kinds', [k[0] for k in RKINDS])]
        out = []
        for row in j['ways']:
            k0, sf, w10, fl, ni, ri, q = row
            if km[k0] < 0 or not q or len(q) < 6:
                continue
            p = np.asarray(q, float).reshape(-1, 3)[:, :2] / 10
            out.append({'kind': km[k0], 'surf': sf, 'w': w10 / 10, 'bridge': bool(fl & 1), 'p': p, 'tunnel': bool(fl & 2)})
        return [w for w in out if not w['tunnel']]

    def _zones(self):
        """the towns' own buildings (footprints) and their walls and hedges (drawn by welt/schleusingen.js, welt/vessra.js)"""
        polys, lines = [], []
        for f in ('schleusingen/stadt.json', 'vessra/ort.json'):
            fn = os.path.join(DIST, f)
            if not os.path.exists(fn):
                continue
            j = json.load(open(fn))
            for b in j.get('b', []):
                ff = np.asarray(b['f'], float).reshape(-1, 2)
                if len(ff) >= 3:
                    p = Polygon(ff)
                    polys.append(p if p.is_valid else p.buffer(0))
            for key in ('hedges', 'walls'):
                for h in j.get(key, []):
                    pp = np.asarray(h['p'], float).reshape(-1, 2)
                    if len(pp) >= 2:
                        lines.append((LineString(pp), 1.2 if key == 'hedges' else 0.6))
        return polys, lines

    def ethos_z(self, i, j):
        """ETHOS footprints of the building cells (dist/gebaeude/z/) round cell (i, j)"""
        out = []
        for a in (i - 1, i, i + 1):
            for b in (j - 1, j, j + 1):
                key = f'{a}_{b}'
                if key not in self._zcells:
                    fn = os.path.join(DIST, 'gebaeude', 'z', key + '.json')
                    L = []
                    if os.path.exists(fn):
                        for bb in json.load(open(fn)).get('b', []):
                            ff = np.asarray(bb['f'], float).reshape(-1, 2)
                            if len(ff) >= 3:
                                p = Polygon(ff)
                                L.append(p if p.is_valid else p.buffer(0))
                    self._zcells[key] = L
                out += self._zcells[key]
        return out

    def roads_in(self, bx):
        """the roads of a box: inside the square the app's own (roads.b64.json); beyond it the drive's ways and OSM's (streets, tracks,
        paths – the drive has the roads one drives; OSM adds the town streets, tracks and paths with the widths of build_roads.py) and the
        streets Schleusingen and Kloster Veßra paint over the photo (TOWN_ST; where two overlap, the wider one shows)"""
        from shapely.geometry import LineString as LS
        out = []
        if self.square.intersects(bx):
            out += self.roads
        if not self.square.contains(bx):
            for r in self.fahrt + self.highways + getattr(self, 'town_st', []):
                ln = LS(r['p'])
                if not ln.intersects(bx):
                    continue
                part = ln.difference(self.square) if ln.intersects(self.square) else ln
                for g in getattr(part, 'geoms', [part]):
                    if g.geom_type == 'LineString' and g.length > 0.5:
                        out.append(dict(r, p=np.asarray(g.coords)[:, :2]))
        return out

    def _orte(self):
        j = json.load(open(os.path.join(DIST, 'strassen', 'ausstattung.json')))
        out = []
        for o in j.get('orte', []):
            for q in o['a']:
                r = np.asarray(q, float).reshape(-1, 2) / 10
                p = Polygon(r)
                out.append((o['n'], o['t'], p if p.is_valid else p.buffer(0)))
        return out

    def _trees(self):
        j = json.load(open(os.path.join(DIST, 'geo', 'trees.b64.json')))
        t = np.frombuffer(base64.b64decode(j['b64']), '<i2').astype(float).reshape(-1, 5)
        return np.c_[t[:, 0] / 10, t[:, 1] / 10, t[:, 2] / 100, t[:, 3] / 100, t[:, 4] > 0]  # x, y, height, crown radius, conifer

    def _ethos(self):
        fn = os.path.join(DIST, 'gebaeude', 'ratscher.json')
        out = []
        if os.path.exists(fn):
            for b in json.load(open(fn))['b']:
                f = np.asarray(b['f'], float).reshape(-1, 2)
                if len(f) >= 3:
                    p = Polygon(f)
                    out.append(p if p.is_valid else p.buffer(0))
        return out

    def _app(self):
        out = subprocess.run(['node', os.path.join(REPO, 'tools', 'bewuchs', 'daten', 'app_daten.mjs')], capture_output=True, text=True, check=True)
        open(os.path.join(RAW, 'app.json'), 'w').write(out.stdout)
        return json.loads(out.stdout)

    def _stadtgruen(self):
        """the hedge bushes of stadtgruen in Ratscher and Schleusingen (viz3/extra/stadtgruen/dist/stadtgruen/ratscher.json, baeume.json)"""
        out = []
        for f in ('ratscher.json', 'baeume.json'):
            rel = 'viz3/extra/stadtgruen/dist/stadtgruen/' + f
            fn = os.path.join(REPO, rel)
            try:
                j = json.load(open(fn)) if os.path.exists(fn) else json.loads(subprocess.run(
                    ['git', '-C', REPO, 'show', 'origin/src:' + rel], capture_output=True, text=True, check=True).stdout)
            except Exception:
                continue
            b = np.asarray(j['b'], float).reshape(-1, 6)
            hk = j['arten'].index('hecke') if 'hecke' in j['arten'] else -1
            sel = (b[:, 2] == hk) | ((b[:, 5].astype(int) & 64) > 0)
            out += [(x / 10, y / 10, max(r / 10, 0.6)) for x, y, _, _, r, _ in b[sel]]
        return out

    # ---- queries ----
    def areas_in(self, bx):
        idx = self.area_tree.query(bx)
        return [self.areas[k] for k in idx if self.areas[k][0].intersects(bx)]
