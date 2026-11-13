"""suhl-gebaeude: the rules that turn the cadastre's words, OpenStreetMap tags and the form of a building into kind, use, house type
and era class. Everything a rule decides is an ESTIMATE and carries its flag in the record (docs/features/suhl-gebaeude.md).

kind `k`  : 0 house (a main building with storeys), 1 hall (wide span: industry, trade, sport, barn), 2 outbuilding (garage, shed,
            garden house), 3 open roof (carport, canopy: posts, no walls), 4 tank, 5 tower / mast / chimney, 6 church or chapel,
            8 underground (underground car park: nothing to draw above ground)
use       : wohnen, gemischt, handel, gastro, buero, oeffentlich, bildung, kultur, kirche, gesundheit, sozial, sport, freizeit, gewerbe,
            land, verkehr, versorgung, friedhof, garage, neben, turm, unbekannt
type `typ`: hochhaus, platte, zeile, stadthaus, villa, efh, dorf, laube, block (office / public / commercial block), halle, kirche,
            garage, neben, dach (open roof), tank, turm, tief - what the facade rules and the era rule start from
era       : 0 unknown, 1 up to 1918, 2 1919-1948, 3 1949-1990, 4 from 1991
"""
import math, os, re, zlib

# the cadastre's function in words (ALKIS 'Gebäudefunktion' / 'Bauwerksfunktion') -> (use, kind or None = decide from the form)
FN = [
    (r'tiefgarage', 'verkehr', 8),
    (r'überdachung|carport', 'neben', 3),
    (r'parkhaus|parkdeck', 'verkehr', 1),
    (r'garage', 'garage', 2),
    (r'gemischt genutztes gebäude mit wohnen|wohn- und|wohnhaus mit|wohngebäude mit', 'gemischt', 0),
    (r'wohnheim|schwesternwohnheim|studenten|seniorenheim|altenheim|pflege', 'sozial', 0),
    (r'^wohn|wohngebäude|wohnhaus', 'wohnen', 0),
    (r'freizeitgestaltung|erholungszweck|wochenend|ferienhaus|gartenhaus|laube|schutzhütte', 'freizeit', None),
    (r'hotel|motel|pension|gaststätte|restaurant|herberge|kantine|beherbergung|bewirtung', 'gastro', 0),
    (r'kirche|kapelle', 'kirche', 6),
    (r'religiös|kloster|synagoge|moschee|gemeindehaus', 'kirche', 0),
    (r'sport-|turnhalle|sporthalle|schwimm|hallenbad|badegebäude|stadion|reithalle|schieß|kegel|tennis', 'sport', None),
    (r'museum|theater|oper|kino|kulturelle|bibliothek|bücherei|veranstaltung|schloss|burg|festsaal|stadthalle', 'kultur', None),
    (r'schule|bildung|forschung|hochschule|universität|kindergarten|kinderkrippe|kindertag|hort', 'bildung', 0),
    (r'krankenhaus|gesundheit|klinik|ärztehaus|heilanstalt|sanatorium|kur|rettung', 'gesundheit', 0),
    (r'soziale zwecke|jugend|obdach|asyl|freizeitheim', 'sozial', 0),
    (r'rathaus|gericht|polizei|feuerwehr|zoll|justizvollzug|öffentliche zwecke|verwaltung|post|botschaft|parlament|kaserne', 'oeffentlich', 0),
    (r'büro|bank|versicherung|kreditinstitut', 'buero', 0),
    (r'handel und dienstleistung|kaufhaus|laden|geschäft|einkaufszentrum|markthalle|kiosk|tankstelle|apotheke|messehalle', 'handel', None),
    (r'land- und forstwirtschaft|scheune|stall|landwirt|forsthaus|treibhaus|gewächshaus', 'land', None),
    (r'wasserbehälter|behälter|silo|speicher', 'versorgung', 4),
    (r'versorgung|umform|trafo|pump|wasserwerk|heizwerk|kraftwerk|gaswerk|entsorgung|klär|müll|elektrizität|fernmelde|sende', 'versorgung', None),
    (r'verkehrsanlagen|empfangsgebäude|bahnhof|busbahnhof|stellwerk|lokschuppen|wartehalle|flug|straßenmeisterei|schifffahrt|seilbahn', 'verkehr', None),
    (r'friedhof|trauerhalle|krematorium', 'friedhof', None),
    (r'funkmast|aussichtsturm|schornstein|wasserturm|turm|mast', 'turm', 5),
    (r'fabrik|werkstatt|gewerbe|industrie|wirtschaft|lager|produktion|betriebsgebäude|brauerei|mühle|sägewerk|bergwerk', 'gewerbe', None),
    (r'schuppen|nebengebäude|abstell', 'neben', 2),
]
FN = [(re.compile(p), u, k) for p, u, k in FN]

# OpenStreetMap building=* -> (use, kind or None); used where the cadastre does not know the building
OSMB = {
    'house': ('wohnen', 0), 'detached': ('wohnen', 0), 'semidetached_house': ('wohnen', 0), 'terrace': ('wohnen', 0), 'apartments': ('wohnen', 0),
    'residential': ('wohnen', 0), 'bungalow': ('wohnen', 0), 'dormitory': ('sozial', 0), 'farm': ('wohnen', 0),
    'garage': ('garage', 2), 'garages': ('garage', 2), 'carport': ('neben', 3), 'roof': ('neben', 3), 'shed': ('neben', 2), 'hut': ('neben', 2),
    'cabin': ('freizeit', 2), 'allotment_house': ('freizeit', 2), 'greenhouse': ('land', 2), 'retail': ('handel', None), 'commercial': ('handel', None),
    'supermarket': ('handel', 1), 'kiosk': ('handel', 2), 'industrial': ('gewerbe', None), 'warehouse': ('gewerbe', 1), 'manufacture': ('gewerbe', None),
    'office': ('buero', 0), 'school': ('bildung', 0), 'kindergarten': ('bildung', 0), 'university': ('bildung', 0), 'college': ('bildung', 0),
    'church': ('kirche', 6), 'chapel': ('kirche', 6), 'cathedral': ('kirche', 6), 'hospital': ('gesundheit', 0), 'hotel': ('gastro', 0),
    'public': ('oeffentlich', 0), 'civic': ('oeffentlich', 0), 'government': ('oeffentlich', 0), 'townhall': ('oeffentlich', 0),
    'fire_station': ('oeffentlich', None), 'train_station': ('verkehr', None), 'transportation': ('verkehr', None), 'parking': ('verkehr', 1),
    'sports_hall': ('sport', 1), 'sports_centre': ('sport', 1), 'stadium': ('sport', 1), 'barn': ('land', 1), 'farm_auxiliary': ('land', 1),
    'stable': ('land', 1), 'cowshed': ('land', 1), 'service': ('versorgung', 2), 'transformer_tower': ('versorgung', 5), 'water_tower': ('versorgung', 5),
    'storage_tank': ('versorgung', 4), 'silo': ('versorgung', 4), 'ruins': ('unbekannt', None), 'construction': ('unbekannt', None),
}
STOREYED = {'wohnen', 'gemischt', 'gastro', 'buero', 'oeffentlich', 'bildung', 'gesundheit', 'sozial', 'kultur', 'kirche'}
ERA_WORDS = ['unbekannt', 'bis 1918', '1919–1948', '1949–1990', 'ab 1991']
# streets of the old town strip that survived the rebuilding of the centre (docs/plans/suhl/stadt.md section 5, wahrzeichen.md 1.1)
OLD_TOWN = {'Steinweg', 'Marktplatz', 'Topfmarkt', 'Kirchgasse'}
VILLAGES = {'Heinrichs', 'Neundorf', 'Goldlauter', 'Heidersbach', 'Mäbendorf', 'Albrechts', 'Dietzhausen', 'Wichtshausen', 'Vesser',
            'Schmiedefeld am Rennsteig', 'Gehlberg', 'Lauter'}


def hh(s):
    """a stable pseudo-random number 0..1 from a string (the same building always gets the same choice)"""
    return (zlib.crc32(s.encode()) & 0xffff) / 65535.0


def use_kind(fn, nutz, osm_tags):
    """(use, kind hint or None, source: 2 cadastre, 1 OSM, 0 nothing known)"""
    f = (fn or '').lower()
    if nutz == 'Turm':
        return 'turm', 5, 2
    if f and 'nicht zu spezifizieren' not in f and f != 'sonstiges':
        for rx, u, k in FN:
            if rx.search(f):
                return u, k, 2
    t = osm_tags or {}
    b = t.get('building')
    if t.get('location') == 'underground':
        return 'verkehr', 8, 1
    if b in OSMB:
        return OSMB[b][0], OSMB[b][1], 1
    for key, u in (('shop', 'handel'), ('office', 'buero'), ('tourism', 'gastro')):
        if t.get(key):
            return u, None, 1
    am = t.get('amenity')
    if am in ('restaurant', 'cafe', 'pub', 'bar', 'fast_food'):
        return 'gastro', None, 1
    if am in ('school', 'kindergarten', 'university', 'college'):
        return 'bildung', 0, 1
    if am == 'place_of_worship':
        return 'kirche', 6, 1
    if am in ('hospital', 'clinic', 'doctors'):
        return 'gesundheit', 0, 1
    if am in ('townhall', 'courthouse', 'police', 'fire_station', 'public_building'):
        return 'oeffentlich', 0, 1
    if f:
        return 'unbekannt', None, 2
    return 'unbekannt', None, 0


SHOP_AMENITY = {'restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'ice_cream', 'bank', 'pharmacy', 'post_office', 'biergarten', 'nightclub',
                'cinema', 'casino', 'car_rental', 'driving_school', 'internet_cafe', 'bureau_de_change', 'food_court', 'travel_agency'}


def shoplike(kd):
    """does a named place ('shop=bakery', 'amenity=cafe', ...) make a shop window zone in the ground floor"""
    key, _, val = kd.partition('=')
    return key in ('shop', 'craft') or (key == 'amenity' and val in SHOP_AMENITY)


def shape_of(poly):
    """area, perimeter, compactness, the longer and shorter side of the smallest enclosing rectangle and its long axis"""
    import numpy as np
    A, per = poly.area, poly.length
    mrr = np.array(poly.minimum_rotated_rectangle.exterior.coords)[:4]
    e1, e2 = mrr[1] - mrr[0], mrr[2] - mrr[1]
    l1, l2 = float(np.hypot(*e1)), float(np.hypot(*e2))
    if l1 >= l2:
        ux, Wd, Lr = e1 / max(l1, 1e-9), l2, l1
    else:
        ux, Wd, Lr = e2 / max(l2, 1e-9), l1, l2
    return dict(A=A, per=per, circ=4 * math.pi * A / max(per * per, 1e-9), nv=len(poly.exterior.coords) - 1, ux=ux, Wd=Wd, Lr=Lr,
                ctr=mrr.mean(axis=0), rect=A / max(Wd * Lr, 1e-9))


def kind_of(use, khint, sh, h, gs):
    """the kind from the hint of the function, else from use and form (the form rules follow tools/welt-gebaeude/prep.py classify)"""
    A, Wd, Lr = sh['A'], sh['Wd'], sh['Lr']
    if khint in (3, 8, 6, 5, 4):
        if khint == 6 and A < 25:
            return 2
        return khint
    if sh['circ'] > 0.86 and sh['nv'] >= 10 and use in ('versorgung', 'land', 'gewerbe', 'unbekannt'):
        return 4
    if h > 12 and h > 2.2 * math.sqrt(A) and use not in STOREYED and (gs or 0) <= 2 and A < 200:
        return 5
    if khint == 2:
        return 2
    if use == 'freizeit':
        return 2 if A <= 60 and (gs or 1) <= 1 else 0
    if use in STOREYED or khint == 0:
        if A < 18 and h < 4.5 and (gs or 1) <= 1:
            return 2            # a small annex the cadastre lists under the main use
        return 0
    if khint == 1:
        return 1 if A >= 150 else 2
    if use in ('handel', 'gewerbe', 'sport', 'land', 'verkehr', 'versorgung', 'friedhof', 'kultur'):
        if A >= 350 and (gs or 1) <= 2 and Wd >= 12:
            return 1
        if (gs or 0) >= 2 or (h >= 6.0 and A >= 60):
            return 0 if use in ('handel', 'kultur', 'verkehr', 'friedhof') or (gs or 0) >= 2 else 1
        return 2 if A < 60 else (1 if A >= 150 else 0 if h >= 4.5 else 2)
    # nothing known: the form decides
    if A >= 350:
        return 1 if (gs or 1) <= 2 else 0
    if (gs or 0) >= 2:
        return 0
    if A >= 35 and h >= 4.5:
        if h >= 6.5 and A <= 320 and Lr / max(Wd, 0.1) <= 1.9 and Wd >= 6.0:
            return 0
        return 1 if A >= 150 else 0 if h >= 5.5 and Wd >= 5.5 else 2
    return 2


def type_of(k, use, sh, h, gs, shared, village, oldtown):
    """the house type the facade and era rules start from"""
    A, Wd, Lr = sh['A'], sh['Wd'], sh['Lr']
    g = gs or max(1, int(round((h - 1.0) / 3.0)))
    if k == 8:
        return 'tief'
    if k == 3:
        return 'dach'
    if k == 4:
        return 'tank'
    if k == 5:
        return 'turm'
    if k == 6:
        return 'kirche'
    if k == 2:
        return 'garage' if use == 'garage' else 'laube' if use == 'freizeit' else 'neben'
    if k == 1:
        return 'halle'
    res = use in ('wohnen', 'gemischt', 'sozial')
    if g >= 12 or (h >= 34 and A >= 250):
        return 'hochhaus'
    if res and g >= 5 and (Lr >= 28 or g >= 8) and Wd <= 20:
        return 'platte'
    if res and g in (3, 4) and Lr >= 30 and 9 <= Wd <= 15 and not oldtown:
        return 'zeile'
    if not res and use not in ('unbekannt', 'freizeit') and (A >= 300 or g >= 4):
        return 'block'
    if oldtown and (shared >= 1 or g >= 2):
        return 'stadthaus'
    if village and g <= 3:
        return 'dorf'
    if shared >= 2 and g >= 2:
        return 'stadthaus'
    if res and g >= 3 and A >= 140 and shared == 0:
        return 'villa' if A <= 420 and Lr / max(Wd, 0.1) <= 1.6 else 'zeile' if Lr >= 30 else 'stadthaus'
    if not res and use != 'unbekannt':
        return 'block' if g >= 2 else 'neben' if A < 40 else 'block'
    return 'efh'


def era_of(typ, use, osm_tags, lm_year=None, oldtown=False):
    """(era class, flag: 0 rule from form and quarter, 1 from data - a year in OpenStreetMap or in the landmark list)"""
    y = None
    sd = (osm_tags or {}).get('start_date', '')
    m = re.search(r'(1[0-9]{3}|20[0-2][0-9])', sd)
    if m:
        y = int(m.group(1))
    elif lm_year:
        y = lm_year
    if y:
        return (1 if y <= 1918 else 2 if y <= 1948 else 3 if y <= 1990 else 4), 1
    if typ in ('hochhaus', 'platte'):
        return 3, 0
    if typ == 'zeile':
        return 3, 0
    if typ == 'dorf' or typ == 'kirche' or (typ == 'stadthaus' and oldtown):
        return 1, 0
    return 0, 0


# ---------------- the landmark list of stage 1 (docs/plans/suhl/wahrzeichen.md) ----------------
def landmarks(repo):
    """rows of the tables in wahrzeichen.md: [{nr, name, lat, lon, osm: ['way/..', 'node/..'], year, enter, monument}]"""
    p = os.path.join(repo, 'docs', 'plans', 'suhl', 'wahrzeichen.md')
    out = []
    if not os.path.exists(p):
        return out
    for ln in open(p, encoding='utf-8'):
        m = re.match(r'\|\s*([ZKO]\d+)\s*\|', ln)
        if not m:
            continue
        cells = [c.strip() for c in ln.strip().strip('|').split('|')]
        if len(cells) < 6:
            continue
        nr, name, lage, zeit = cells[0], cells[1], cells[2], cells[3]
        ll = re.search(r'(5\d\.\d{3,6}),\s*(1\d\.\d{3,6})', lage)
        osm = [{'w': 'way/', 'n': 'node/', 'r': 'relation/'}[a] + b for a, b in re.findall(r'`([wnr])(\d+)`', lage)]
        ym = re.search(r'(1[0-9]{3}|20[0-2][0-9])', zeit)
        year = int(ym.group(1)) if ym else None
        if year and re.search(r'nach\s+' + str(year), zeit):
            year += 1           # 'nach 1990' = after 1990
        if nr.startswith('Z'):
            enter = cells[6] if len(cells) > 6 else ''
            mon = cells[7] if len(cells) > 7 else ''
        else:
            enter, mon = (cells[6] if len(cells) > 6 else ''), ''
        out.append({'nr': nr, 'name': re.sub(r'[*`]', '', name), 'lat': float(ll.group(1)) if ll else None, 'lon': float(ll.group(2)) if ll else None,
                    'osm': osm, 'year': year, 'enter': enter.lower().startswith('ja'),
                    'monument': bool(re.match(r'(ja|osm)', mon.lower()))})
    return out
