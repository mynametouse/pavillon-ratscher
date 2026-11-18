"""The class map of one 400 m cell: OSM and the Basis-DLM say what the land is used for, the orthophoto (colour and colour infrared, flown
07.04.2024) says where it is green, bare or sealed, the height model says where bushes stand, the app's roads, buildings and water say
where nothing grows. Rules in order (later ones win); the reasons are in docs/features/bewuchs-daten.md.

  cls, ndvi, info = classify(q, i, j, res=0.5)   # q: quellen.Quellen; arrays on Grid.cell(i, j, res) (no margin); res 0.5 or 1 m"""
import os, sys
import numpy as np
from scipy import ndimage as ndi
from shapely.geometry import LineString, Polygon, box
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import Grid, K, SITE_ZONE  # noqa: E402
import handdaten  # noqa: E402
import raster  # noqa: E402

RES = 0.5  # default; villages and towns 0.5 m, the open land beyond the square 1 m (gebiete.py)
MARGIN = 10.0  # m around the cell (the orthophoto is fetched with 12 m)
MP = int(MARGIN / RES)
# thresholds of the April 2024 colour-infrared image (8 bit, NDVI = (NIR − R) / (NIR + R)); checked on the OSM meadows (median 0.52–0.58),
# fields (0.36–0.48), lawns (0.34–0.5), roofs and roads (< 0.12) of Ratscher's square
T_GREEN = 0.30  # vegetation: grass, crops, evergreens
T_BARE = 0.18   # below: soil, gravel, asphalt, roofs (and the bare twigs of leafless crowns)
# verge widths beyond the carriageway edge (m) by road kind (world/roads.js KINDS: motorway main county street lane service track path foot)
VERGE = [3.0, 2.5, 2.5, 2.0, 2.0, 1.5, 1.0, 0.5, 0.5]
VERGE_IN = 0.3  # the first 0.3 m beyond the edge: the road's own shoulder (roads.js roadShade), class 0
# DLM: colours of the WMS rendering (holen.py; their meaning read with GetFeatureInfo)
DLM_ACKER, DLM_GRUEN = (255, 255, 239), (217, 255, 191)  # AX_Landwirtschaft Vegetationsmerkmal 1010 Ackerland, 1020 Grünland
DLM_SPORT = {(64, 241, 175): 'sport', (16, 239, 175): 'bad', (60, 239, 110): 'allot', (225, 244, 189): 'enclosure'}  # Funktion 4100, 4320, 4440/4310, 4200
DLM_UNLAND = (242, 244, 243)  # AX_UnlandVegetationsloseFlaeche: 1100 next to water (shore), 1300 near-natural
USE = {n: k + 1 for k, n in enumerate(['field', 'meadow', 'pasture', 'orchard', 'forest', 'scrub', 'garden', 'public', 'sport', 'pitch', 'cemetery',
                                       'allot', 'yard', 'naturnah', 'ufer', 'bad', 'enclosure', 'roadland', 'wiese_dorf'])}
# OSM kinds (quellen.kind_of) → use
OSM_USE = [('field', 'field'), ('meadow', 'meadow'), ('grass', 'meadow'), ('pasture', 'pasture'), ('orchard', 'orchard'), ('forest', 'forest'),
           ('scrub', 'scrub'), ('residential', 'garden'), ('yard', 'yard'), ('public', 'public'), ('sport', 'sport'), ('allotments', 'allot'),
           ('cemetery', 'cemetery'), ('pitch', 'pitch')]


def _half(a):
    h, w = a.shape[:2]
    return a.reshape(h // 2, 2, w // 2, 2, *a.shape[2:]).mean((1, 3))


def features(i, j, res=RES):
    """image and height features of a cell on its grid (res) with margin, from the photo at res / 2"""
    g25 = Grid.cell(i, j, res / 2, MARGIN)
    rgb = raster.dop(i, j, 'th_dop', g25).astype(np.float32)
    cir = raster.dop(i, j, 'th_dop20cir', g25).astype(np.float32)
    nir, red = cir[..., 0], cir[..., 1]
    nd = (nir - red) / (nir + red + 1.0)
    # coarseness: the local spread of the infrared at 25 cm (window 1.25 m) relative to its level – smooth lawn low, meadow and crops higher
    m1 = ndi.uniform_filter(nir, 5)
    m2 = ndi.uniform_filter(nir * nir, 5)
    cv = np.sqrt(np.maximum(m2 - m1 * m1, 0)) / (m1 + 8.0)
    g = Grid.cell(i, j, res, MARGIN)
    gr, hag = raster.heights(g)
    if hag is None:  # no height model here: no bushes from heights, no slopes
        hag = np.zeros((g.h, g.w), np.float32)
    return {'grid': g, 'ndvi': _half(nd), 'cv': _half(cv), 'rgb': _half(rgb), 'ground': gr, 'hag': np.nan_to_num(hag, nan=0.0),
            'valid': _half((rgb.sum(-1) > 0).astype(np.float32)) > 0.5}


def roads_raster(q, g):
    """carriageway mask, distance to the nearest carriageway edge (m) and that road's kind; bridges left out (ground under them)"""
    bx = box(g.x0 - 20, g.y0 - 20, g.x1 + 20, g.y1 + 20)
    lab = np.zeros((g.h, g.w), np.uint8)
    for r in sorted(q.roads_in(bx) if hasattr(q, 'roads_in') else q.roads, key=lambda r: -r['kind']):  # wide roads first, narrow over them
        if r['bridge']:
            continue
        ln = LineString(r['p'])
        if ln.intersects(bx):
            raster.draw_lines(g, [ln], max(r['w'], 0.6), r['kind'] + 1, lab)
    carr = lab > 0
    if not carr.any():
        return carr, np.full((g.h, g.w), 1e3), np.full((g.h, g.w), -1, np.int16)
    d, idx = ndi.distance_transform_edt(~carr, return_indices=True)
    kind = lab[idx[0], idx[1]].astype(np.int16) - 1
    return carr, np.where(carr, 0.0, d * g.res - g.res / 2), kind


def _sizes(mask, lab, n, res):
    return ndi.sum(mask, lab, np.arange(1, n + 1)) * res * res


def classify(q, i, j, f=None, garten=None, extra=(), model_zone=True, res=RES):
    """extra: [(polygon, use name)] drawn over OSM; garten: (map, x0, y0, res) – decides in the site zone; model_zone: OSM waters left out
    in the site zone (the modelled brook replaces them there)"""
    f = f or features(i, j, res)
    g = f['grid']
    P = lambda m: max(1, int(round(m / g.res)))  # noqa: E731  metres → pixels (iterations of the morphology)
    H, W = g.h, g.w
    X, Y = g.centres()
    bx = box(g.x0, g.y0, g.x1, g.y1)
    nd, hag, cv = f['ndvi'], f['hag'], f['cv']
    R, G, B = f['rgb'][..., 0], f['rgb'][..., 1], f['rgb'][..., 2]
    lum = (R + G + B) / 3
    Z = lambda: np.zeros((H, W), bool)  # noqa: E731
    dil = lambda m, n: ndi.binary_dilation(m, iterations=n) if n > 0 and m.any() else m  # noqa: E731

    # ---------- vector layers ----------
    A = {}
    for geom, kind, tags, oid in q.areas_in(bx):
        A.setdefault(kind, []).append(geom)
    mk = {k: raster.draw_polys(g, v).astype(bool) for k, v in A.items()}
    get = lambda k: mk.get(k, Z())  # noqa: E731
    more = q.ethos + (q.ethos_z(i, j) if hasattr(q, 'ethos_z') else []) + getattr(q, 'zone_b', [])
    bld = get('building') | raster.draw_polys(g, [p for p in more if p.intersects(bx)]).astype(bool)
    water = get('water')
    stream_m, ditch_m = Z(), Z()
    zone = box(*SITE_ZONE)
    for ln, w, k in q.waters:
        if model_zone and ln.intersects(zone):
            ln = ln.difference(zone)
            if ln.is_empty:
                continue
        if ln.intersects(bx):
            m = raster.draw_lines(g, [ln], max(w, 0.6)).astype(bool)
            if k in ('ditch', 'drain'):
                ditch_m |= m
            else:
                stream_m |= m
    carr, edge, rkind = roads_raster(q, g)
    orte = raster.draw_polys(g, [p for n, t, p in q.orte if p.intersects(bx)]).astype(bool)
    # ---------- DLM ----------
    d_lw = raster.dlm('veg01_f', g)
    d_sp = raster.dlm('sie02_f_8', g)
    d_unl = raster.colour_mask(raster.dlm('veg03_f_5', g), DLM_UNLAND, 6)
    d_strasse = raster.dlm('ver01_f_1', g)[..., 3] > 60
    d_water = (raster.dlm('gew01_f_1', g)[..., 3] > 60) | (raster.dlm('gew01_f_3', g)[..., 3] > 60)
    d_busch = raster.dlm('veg04_f', g)[..., 3] > 30
    d_ort = raster.dlm('sie01_f', g)[..., 3] > 60
    water_all = water | stream_m | (d_water & (f['ndvi'] < T_BARE))
    bank_d = ndi.distance_transform_edt(~water_all) * g.res if water_all.any() else np.full((H, W), 1e3)

    # ---------- what the image says ----------
    valid = f['valid']
    green = nd >= T_GREEN
    bare = nd < T_BARE
    # soil: brownish (red over blue, not too dark or bright) – ploughed land (rgb ~170/162/152 in this flight), worn ground; asphalt and
    # concrete are grey (a gravel yard looks like ploughed soil: it is told apart by the buildings round it, below)
    chroma = (R - B) / np.maximum(lum, 1.0)
    soil = bare & (chroma >= 0.08) & (R >= G - 4) & (lum > 45) & (lum < 200)
    grey = bare & ~soil
    canopy = hag >= 3.0
    shrub_h = (hag >= 0.5) & (hag < 4.0)

    # ---------- land use: DLM first, OSM over it (OSM is drawn more finely), hand-made data last ----------
    use = np.zeros((H, W), np.uint8)
    use[d_strasse] = USE['roadland']
    d_acker, d_gruen = raster.colour_mask(d_lw, DLM_ACKER, 10), raster.colour_mask(d_lw, DLM_GRUEN, 10)
    use[d_acker] = USE['field']
    use[d_gruen] = USE['meadow']
    use[raster.dlm('veg02_f', g)[..., 3] > 60] = USE['forest']
    use[raster.dlm('veg03_f_1', g)[..., 3] > 60] = USE['scrub']
    use[(raster.dlm('sie02_f_1', g)[..., 3] > 60) | (raster.dlm('sie02_f_6', g)[..., 3] > 60)] = USE['garden']
    use[raster.dlm('sie02_f_2', g)[..., 3] > 60] = USE['yard']  # industry and trade: rough grass, not lawn
    use[raster.dlm('sie02_f_7', g)[..., 3] > 60] = USE['public']
    use[raster.dlm('sie02_f_9', g)[..., 3] > 60] = USE['cemetery']
    for col, u in DLM_SPORT.items():
        use[raster.colour_mask(d_sp, col, 10)] = USE[u]
    use[d_unl] = USE['naturnah']
    use[d_unl & dil(water_all | d_water, P(20))] = USE['ufer']  # Unland by the water: the reservoir's shore
    for k, u in OSM_USE:
        if k in mk:
            use[mk[k]] = USE[u]
    # field or grassland: the Basis-DLM (official, kept up to date) decides where OSM and the DLM disagree
    agri = np.isin(use, [USE['field'], USE['meadow']])
    use[agri & d_acker] = USE['field']
    use[agri & d_gruen] = USE['meadow']
    for poly, u in list(extra) + [(Polygon(p), 'public') for p in handdaten.OEFFENTLICH.values()] + \
            [(Polygon(p), 'wiese_dorf') for p in handdaten.WIESE.values()]:
        if poly.intersects(bx):
            use[raster.draw_polys(g, [poly]).astype(bool)] = USE[u]
    village = orte | d_ort | np.isin(use, [USE['garden'], USE['yard']])
    if 'grass' in mk:  # grass inside the village (OSM landuse=grass): public green
        use[mk['grass'] & village] = USE['public']

    # ---------- classes from the use ----------
    cls = np.full((H, W), 255, np.uint8)
    for u, c in (('field', 'acker'), ('meadow', 'maehwiese'), ('wiese_dorf', 'maehwiese'), ('pasture', 'weide'), ('enclosure', 'weide'),
                 ('orchard', 'streuobst'), ('forest', 'waldboden'), ('scrub', 'gebuesch'), ('cemetery', 'friedhof'), ('naturnah', 'saum'),
                 ('ufer', 'ufer')):
        cls[use == USE[u]] = K[c]
    # village land (gardens, yards, public greens, sport, allotments, the bathing lawn): what the image shows
    vil = np.isin(use, [USE['garden'], USE['yard'], USE['public'], USE['sport'], USE['pitch'], USE['allot'], USE['bad']]) | ((use == 0) & village)
    # the grass of yards, works and depots is mown now and then (a meadow), not a lawn
    lawn_cls = np.select([np.isin(use, [USE['public'], USE['bad'], USE['sport']]), use == USE['pitch'], use == USE['yard']],
                         [K['oeffentlich'], K['sportrasen'], K['maehwiese']], K['zierrasen'])
    vg = vil & ~bare
    cls[vg] = lawn_cls[vg]
    # coarse grass in big gardens and yards (last year's grass in April; the lawns are mown smooth): a meadow
    # (the cap of the NDVI follows the flight: the 60th percentile of the village's green – lusher in May than in April)
    vgn = nd[vil & green]
    cap = float(np.percentile(vgn, 60)) if vgn.size > 1000 else 0.42
    coarse = vil & green & (cv > 0.16) & (nd < cap) & (lawn_cls == K['zierrasen'])
    cls[ndi.binary_opening(coarse, iterations=P(1.0))] = K['maehwiese']
    cls[vil & bare] = K['nichts']
    # dug beds in gardens: in early April a vegetable plot is soil with a few weeds – between lawn and paving in the infrared (NDVI
    # 0.12–0.27, a plot in Ratscher 0.17–0.23), rough (cv ≥ 0.03), flat, compact (≥ 1.5 m across), 8–400 m², mostly framed by green
    # (not the joints of a paved yard), away from the road and the eaves. Ornamental beds are not told apart in the image (stage 4).
    dug = vil & (nd >= 0.12) & (nd < 0.27) & (cv >= 0.03) & (hag < 0.5) & (lum > 60) & ~carr & (edge > 2.0) & ~dil(bld, P(1.5))
    dug &= g.res <= 0.5  # (only where the map is fine enough)
    dug &= ~np.isin(use, [USE['yard'], USE['public'], USE['sport'], USE['pitch'], USE['bad']])
    dug = ndi.binary_opening(dug, iterations=P(1.0))
    lab, n = ndi.label(dug)
    if n:
        ids = np.arange(1, n + 1)
        sz = _sizes(dug, lab, n, g.res)
        mnd = ndi.mean(nd, lab, ids)
        rim = dil(dug, 2) & ~dug
        rim_lab = np.where(rim, ndi.grey_dilation(lab, size=5), 0)
        bare_rim = np.nan_to_num(ndi.mean(nd < 0.12, rim_lab, ids))
        al = ndi.maximum(use == USE['allot'], lab, ids) > 0
        ok = (((sz >= 8) & (sz <= 400)) | (al & (sz >= 2))) & (mnd < 0.25) & (bare_rim <= 0.3)
        cls[np.isin(lab, ids[ok])] = K['gemuese']
    # dark water (tanks, ponds OSM lacks): nothing
    cls[vil & (lum < 40) & (nd < 0.25)] = K['nichts']
    # unknown land outside the village: green strips (< 8 m wide) are margins, wider ones meadow; brown soil by a field is field
    unk = cls == 255
    gu = unk & ~bare
    if gu.any():
        wdt = ndi.distance_transform_edt(gu) * g.res
        lab, n = ndi.label(gu)
        wide = np.r_[False, ndi.maximum(wdt, lab, np.arange(1, n + 1)) > 4.0]
        cls[gu & wide[lab]] = K['maehwiese']
        cls[gu & ~wide[lab]] = K['saum']
    cls[unk & soil & dil(cls == K['acker'], P(4))] = K['acker']
    cls[cls == 255] = K['nichts']
    pl = ndi.binary_opening((cls == K['maehwiese']) & soil & ~vil, iterations=P(1.5))
    lab, n = ndi.label(pl)
    if n:
        cls[np.isin(lab, np.flatnonzero(_sizes(pl, lab, n, g.res) >= 1000) + 1)] = K['acker']

    # buildings the maps lack (barns in the fields, sheds, stacks): 2 m and more above the ground, not green, flat on top (a leafless
    # crown in April is not green either, but rough), not a measured tree; then the yards round them
    T = q.trees
    sel = (T[:, 0] > g.x0 - 15) & (T[:, 0] < g.x1 + 15) & (T[:, 1] > g.y0 - 15) & (T[:, 1] < g.y1 + 15) & (T[:, 2] >= 4)
    tree_m = raster.disc_mask(g, T[sel, :2], T[sel, 3] * 1.25 + 0.5) if sel.any() else Z()
    h1 = ndi.uniform_filter(hag, 3)
    hstd = np.sqrt(np.maximum(ndi.uniform_filter(hag * hag, 3) - h1 * h1, 0))
    struct = ndi.binary_opening((hag >= 2.0) & (nd < 0.2) & (hstd < 0.35) & ~tree_m, iterations=1)
    lab, n = ndi.label(struct)
    if n:
        struct = np.isin(lab, np.flatnonzero(_sizes(struct, lab, n, g.res) >= 15) + 1)
    bldx = bld | struct
    # farm yards round the barns that stand in a field block: bare ground within 15 m of a building is a yard, not the field
    cls[np.isin(cls, [K['acker'], K['maehwiese']]) & (nd < 0.15) & dil(bldx, P(15))] = K['nichts']

    # ---------- bushes: 0.5–4 m above the ground, not a building, car, wall or tree; or OSM/DLM scrub where the heights agree ----------
    in_forest = cls == K['waldboden']
    tallc = hag >= 4.0
    bush = shrub_h & ~tree_m & ~dil(bldx, P(1)) & ~carr & ~water_all & (nd >= 0.12)
    bush &= ~((use == USE['field']) & (hag < 1.5)) & (use != USE['yard'])
    bush = ndi.binary_opening(bush, iterations=1)
    lab, n = ndi.label(bush)
    if n:
        ids = np.arange(1, n + 1)
        rim = dil(bush, 2) & ~bush
        sz = _sizes(bush, lab, n, g.res)
        # share of tall crown in the 1 m round each bush: a crown's lower edge is part of the tree
        ring_lab = np.where(rim, ndi.grey_dilation(lab, size=5), 0)
        share = ndi.mean(tallc, ring_lab, ids)
        keep = (sz >= 2.0) & ~(np.nan_to_num(share) > 0.25)
        bush = np.isin(lab, ids[keep])
    cls[bush & ~in_forest] = K['gebuesch']
    cls[d_busch & shrub_h & ~in_forest & ~carr & ~bld] = K['gebuesch']
    hl = [h for h in q.hedges if h.intersects(bx)]  # OSM hedges (stadtgruen's and the Anger's own are drawn by them: 0 below)
    if hl:
        cls[raster.draw_lines(g, hl, 1.6).astype(bool) & ~carr] = K['gebuesch']

    # ---------- under crowns outside the forest: the ground of the neighbourhood (the lawn under a garden's apple tree) ----------
    under = canopy & ~in_forest & ~bld & ~carr & (cls != K['gebuesch'])
    if under.any():
        src = ~under & ((cls != K['nichts']) | ~vil)
        d, idx = ndi.distance_transform_edt(~src, return_indices=True)
        ok = under & (d * g.res < 12)
        cls[ok] = cls[idx[0], idx[1]][ok]
    # closed canopy outside the forest areas and the village (copses, the gallery along the river): forest floor
    big = ndi.binary_closing(canopy, iterations=P(1)) & ~vil
    lab, n = ndi.label(big)
    if n:
        cls[np.isin(lab, np.flatnonzero(_sizes(big, lab, n, g.res) >= 1500) + 1) & ~carr & ~bld & (cls != K['acker'])] = K['waldboden']

    # ---------- roads: carriageway and shoulder nothing, the verge outside the villages, green strips inside ----------
    cls[carr | (edge < VERGE_IN)] = K['nichts']
    vw = np.where(rkind >= 0, np.take(VERGE, np.clip(rkind, 0, 8)), 0.0)
    built = d_ort  # verges only outside the built-up area of the Basis-DLM (Ortslage); the green strips along streets inside it
    verge = ~carr & (edge >= VERGE_IN) & (edge <= vw) & ~built & ~bldx & ~water_all
    verge &= ~np.isin(cls, [K['nichts'], K['gebuesch']]) | ((cls == K['nichts']) & ~bare) | ((cls == K['gebuesch']) & (edge <= 1.5))
    verge &= ~(np.isin(cls, [K['acker'], K['ackerrand']]) & (edge > 1.5))
    cls[verge] = K['bankett']
    strip = ~carr & (edge >= VERGE_IN) & (edge <= 1.5) & built & (rkind >= 0) & (rkind <= 4) & green & np.isin(cls, [K['zierrasen'], K['maehwiese']])
    cls[strip] = K['oeffentlich']
    # road land of the DLM beyond the verge (embankments and cuttings of the motorway and the main roads): margins
    cls[d_strasse & ~carr & (edge > vw) & ~built & np.isin(cls, [K['maehwiese'], K['weide'], K['zierrasen']])] = K['saum']
    # traffic green: green islands enclosed by carriageway (junction triangles, islands, a roundabout's centre)
    isl = ~carr & (edge < 6) & green & ~bldx
    lab, n = ndi.label(isl)
    if n:
        sz = _sizes(isl, lab, n, g.res)
        for k in np.flatnonzero((sz >= 4) & (sz <= 500)) + 1:
            comp = lab == k
            rim = dil(comp, P(1.5)) & ~comp
            if carr[rim].mean() >= 0.75:
                cls[comp] = K['verkehrsgruen']


    # ---------- strips: field margins, field-meadow margins, forest edges, banks, ditches, embankments ----------
    field = cls == K['acker']
    d_in = ndi.distance_transform_edt(field) * g.res  # inside a field: distance to its edge
    cls[field & (d_in <= 2.0)] = K['ackerrand']
    # inside a field block of the DLM: where a large ploughed part meets a large green one (two fields of one block, or grass on arable
    # land), a margin on both sides (smoothed over 15 m, parts of at least 0.5 ha: tramlines and patches inside one field do not count)
    if field.any():
        sm = ndi.uniform_filter((nd < 0.25).astype(np.float32), 2 * P(7.5) + 1) > 0.5
        parts = []
        for m in (sm & field, ~sm & field):
            m = ndi.binary_opening(m, iterations=P(3))
            lab, n = ndi.label(m)
            parts.append(np.isin(lab, np.flatnonzero(_sizes(m, lab, n, g.res) >= 5000) + 1) if n else m)
        cls[dil(parts[0], P(1)) & dil(parts[1], P(1)) & field] = K['ackerrand']
    d_f = ndi.distance_transform_edt(~field) * g.res
    cls[np.isin(cls, [K['maehwiese'], K['weide']]) & (d_f <= 1.0)] = K['saum']
    forest = cls == K['waldboden']
    d_w = ndi.distance_transform_edt(~forest) * g.res
    cls[(d_w > 0) & (d_w <= 2.0) & np.isin(cls, [K['maehwiese'], K['weide'], K['ackerrand'], K['acker'], K['streuobst']]) & ~village] = K['saum']
    vegc = ~np.isin(cls, [K['nichts']]) & ~carr & ~bld
    cls[vegc & (bank_d > 0) & (bank_d <= 2.5)] = K['ufer']  # banks: along streams, ponds and the reservoir (also under the gallery's trees)
    if ditch_m.any():
        dd = ndi.distance_transform_edt(~ditch_m) * g.res
        cls[(dd <= 1.2) & vegc & (cls != K['ufer'])] = K['saum']
    gr = f['ground']
    if gr is not None:  # steep slopes outside the village (embankments, the dam): margins
        gy, gx = np.gradient(np.nan_to_num(gr, nan=0.0), g.res)
        steep = (np.hypot(gx, gy) > 0.6) & ~village & np.isin(cls, [K['maehwiese'], K['weide'], K['acker'], K['ackerrand']])
        cls[ndi.binary_opening(steep, iterations=P(1))] = K['saum']

    # ---------- built things: buildings, water, the app's own village centre and stadtgruen's hedges ----------
    cls[bldx | water | (stream_m & ~carr)] = K['nichts']
    dk = q.app.get('dorfkern') or {}
    if dk and bx.intersects(box(150, -200, 350, 0)):
        cls[raster.draw_lines(g, [LineString(h['p']) for h in dk.get('hedges', [])], 1.2).astype(bool)] = K['nichts']
        cls[raster.draw_polys(g, [Polygon(p['p']) for p in dk.get('paving', [])]).astype(bool)] = K['nichts']
        if dk.get('well'):
            cls[raster.disc_mask(g, [dk['well']['c']], max(dk['well']['size']) / 2 + 0.3)] = K['nichts']
    zl = [(ln, w) for ln, w in getattr(q, 'zone_lines', []) if ln.intersects(bx)]
    for ln, w in zl:
        cls[raster.draw_lines(g, [ln], w).astype(bool)] = K['nichts']
    sh = [h for h in q.stadtgruen_hedges if g.x0 - 5 < h[0] < g.x1 + 5 and g.y0 - 5 < h[1] < g.y1 + 5]
    if sh:
        cls[raster.disc_mask(g, [h[:2] for h in sh], [h[2] for h in sh])] = K['nichts']
    cls[~valid] = K['nichts']

    # ---------- the modelled site: the garden map (finer) decides there ----------
    if garten is not None:
        gm, gx0, gy0, gres = garten
        zx0, zy0, zx1, zy1 = SITE_ZONE
        inz = (X >= zx0) & (X < zx1) & (Y >= zy0) & (Y < zy1)
        if inz.any():
            u = np.clip(((X[inz] - gx0) / gres).astype(int), 0, gm.shape[1] - 1)
            v = np.clip(((gy0 + gm.shape[0] * gres - Y[inz]) / gres).astype(int), 0, gm.shape[0] - 1)
            cls[inz] = gm[v, u]

    core = g.inner(int(round(MARGIN / g.res)))
    return cls[core], nd[core], {'use': use[core]}
