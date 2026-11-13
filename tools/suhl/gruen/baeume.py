#!/usr/bin/env python3
"""suhl-gruen: single trees per level-10 tile (400 m) from the colour-infrared orthophoto at 20 cm and OpenStreetMap.

Method (the object-height model nDOM1 is not there yet – see hoehen() for the switch):
  1. vegetation = NDVI of the infrared image (near infrared against red) above a threshold;
  2. woody vegetation = vegetation whose near infrared is rough at the metre scale (crowns are lit and shaded, lawn and meadow are even),
     cleaned of thin strips; never on water;
  3. crowns = watershed over the distance to the edge of the woody mask plus the smoothed brightness (crown tops are bright);
     crown radius from the crown's area;
  4. the trunk stands at the centre of the crown's part that lies neither on a building footprint nor on a carriageway – a crown
     that lies entirely on a roof (roof garden) or in a road is dropped;
  5. mapped trees (OSM natural=tree) give the position where a crown was found at them, and the species where it is tagged;
  6. kind: broadleaf / conifer from the infrared signature (conifers are dark in the near infrared), a shrub class for the small ones;
  7. height: estimated from the crown radius and the kind (flag) until nDOM1 gives measured heights.

Product b (plan 2.4): one file per tile, 8 bytes per tree, little endian –
  uint16 east offset from the tile's west edge in cm, uint16 north offset from the south edge in cm (ETRS89 / UTM 32N),
  uint8 height in 0.25 m, uint8 crown radius in 0.1 m, uint8 kind (KINDS), uint8 flags (FLAGS).
The ground height is not stored: the terrain may be exchanged (Copernicus -> DGM1), the runtime asks the ground.

  python3 -I tools/suhl/gruen/baeume.py --gebiet zentrum --out tools/suhl/out/gruen/probe/suhl/b/v0
"""
import argparse, json, os, struct, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib, kontext, gbild

PX = gbild.PX
MARGIN = gbild.MARGIN
SCHEMA = 1
FLIGHT = '2024-05-15T23:59:59Z'   # the flight day of the orthophoto over Suhl (tools/suhl/out/bestand/luftbild.json)
ND_VEG = 0.15        # NDVI above this is vegetation (8-bit orthophoto, not calibrated; looked at on the Zentrum)
TEX_MIN = 0.05       # relative roughness of the near infrared above this is woody
NIR_LIT = 90.0       # smoothed near infrared above this: lit by the sun (cast shadows on lawn are dappled like crowns, but dark)
DT_CAP, BRIGHT, SIGMA_TOP, MIN_DIST = 2.5, 4.0, 8.0, 11   # crown tops: see crowns()
SIGMA_TOP_CON, MIN_DIST_CON, NIR_CON_AREA = 3.5, 6, 118.0   # the same for conifer canopy (narrow crowns)
NIR_CON_PEAK, NIR_CON_MEAN, TEX_CON = 152.0, 125.0, 0.09   # conifer: crown top and crown mean darker than this, and rough
R_MIN = 0.9          # m, smaller crowns are dropped
R_SHRUB = 1.6        # m, below this a crown counts as a shrub or a very small tree
BAND = 6.0           # m around a tile kept for the merge of neighbours
KINDS = {
    0: 'Laubbaum (Art unbestimmt)', 1: 'Nadelbaum (Art unbestimmt)', 2: 'Fichte', 3: 'Kiefer', 4: 'Lärche', 5: 'Tanne/Douglasie',
    10: 'Linde', 11: 'Ahorn', 12: 'Eiche', 13: 'Buche', 14: 'Birke', 15: 'Esche', 16: 'Rosskastanie', 17: 'Platane', 18: 'Pappel',
    19: 'Weide', 20: 'Obstbaum', 21: 'Robinie', 22: 'Hainbuche', 23: 'Eberesche/Mehlbeere', 24: 'Erle', 25: 'Zierkirsche',
    30: 'Strauch/Hecke/sehr kleiner Baum',
}
CONIFER = {1, 2, 3, 4, 5}
# flags: bits 0-1 where the position comes from, bit 2 height measured, bit 3 crown radius measured in the image or the height model,
# bit 4 kind from a mapped tag (else from the infrared signature), bit 5 trunk moved off a roof or carriageway,
# bit 6 the tree is mapped in OpenStreetMap, bit 7 the tree stands in a mapped forest (a stand of product w).
POS_RULE, POS_IMAGE, POS_OSM, POS_NDOM = 0, 1, 2, 3
F_H, F_R, F_KIND, F_MOVED, F_OSM, F_FOREST = 4, 8, 16, 32, 64, 128
FLAGS = {'bits0-1': {0: 'Lage nach Regel gesetzt', 1: 'Lage aus dem Luftbild (Krone, 20 cm)', 2: 'Lage aus OpenStreetMap (kartierter Baum)',
                     3: 'Lage aus dem Kronenhöhenmodell (nDOM1)'},
         'bit2': 'Höhe gemessen (nDOM1); sonst geschätzt aus Kronenradius und Art',
         'bit3': 'Kronenradius gemessen (Kronenfläche im Luftbild oder nDOM1); sonst geschätzt',
         'bit4': 'Art aus einer kartierten Angabe (OSM species/genus/leaf_type); sonst aus der Infrarot-Signatur geschätzt',
         'bit5': 'Stamm von Dach oder Fahrbahn weggerückt',
         'bit6': 'der Baum ist in OpenStreetMap kartiert (natural=tree)',
         'bit7': 'der Baum steht in einem kartierten Wald (Bestand im Produkt w)'}
GENUS = {  # OSM genus / species / German names -> kind
    'tilia': 10, 'linde': 10, 'acer': 11, 'ahorn': 11, 'quercus': 12, 'eiche': 12, 'fagus': 13, 'buche': 13, 'betula': 14, 'birke': 14,
    'fraxinus': 15, 'esche': 15, 'aesculus': 16, 'kastanie': 16, 'platanus': 17, 'platane': 17, 'populus': 18, 'pappel': 18,
    'salix': 19, 'weide': 19, 'malus': 20, 'pyrus': 20, 'prunus': 25, 'apfel': 20, 'birne': 20, 'kirsche': 25, 'robinia': 21,
    'robinie': 21, 'carpinus': 22, 'hainbuche': 22, 'sorbus': 23, 'eberesche': 23, 'alnus': 24, 'erle': 24, 'picea': 2, 'fichte': 2,
    'pinus': 3, 'kiefer': 3, 'larix': 4, 'lärche': 4, 'abies': 5, 'tanne': 5, 'pseudotsuga': 5, 'douglasie': 5, 'thuja': 1, 'taxus': 1,
}


class Umfeld:
    """the context (kontext.py) with a spatial index; rasters for a box"""

    def __init__(self, K):
        from shapely import STRtree, box
        self.K = K
        self.bld = K['bld']
        self.bbox = np.array([[min(p[0] for p in r[0]), min(p[1] for p in r[0]), max(p[0] for p in r[0]), max(p[1] for p in r[0])]
                              for r in self.bld]) if self.bld else np.zeros((0, 4))
        self.roads = K['roads']
        self.rbox = np.array([[min(p[0] for p in c) - hw, min(p[1] for p in c) - hw, max(p[0] for p in c) + hw, max(p[1] for p in c) + hw]
                              for c, hw, _, _ in self.roads]) if self.roads else np.zeros((0, 4))
        self.water = K['water']
        self.wbox = np.array([[min(p[0] for p in r[0]), min(p[1] for p in r[0]), max(p[0] for p in r[0]), max(p[1] for p in r[0])]
                              for r in self.water]) if self.water else np.zeros((0, 4))
        self.forest = [r for (_, t, rr, _) in K['green'] if t.get('landuse') == 'forest' or t.get('natural') == 'wood' for r in rr]
        self.fbox = np.array([[min(p[0] for p in r[0]), min(p[1] for p in r[0]), max(p[0] for p in r[0]), max(p[1] for p in r[0])]
                              for r in self.forest]) if self.forest else np.zeros((0, 4))
        self.trees = np.array([[t[0], t[1]] for t in K['trees']]) if K['trees'] else np.zeros((0, 2))
        self.ttags = [t[3] for t in K['trees']]

    @staticmethod
    def _hit(bx, bb):
        return np.flatnonzero((bx[:, 0] <= bb[2]) & (bx[:, 2] >= bb[0]) & (bx[:, 1] <= bb[3]) & (bx[:, 3] >= bb[1])) if len(bx) else []

    def raster(self, bb, px, grow_bld=0.3, grow_road=0.5):
        """-> building mask, carriageway mask, water mask (bool arrays, rows from the north) for the box at px metres per pixel"""
        from PIL import Image, ImageDraw
        e0, n0, e1, n1 = bb
        w, h = int(round((e1 - e0) / px)), int(round((n1 - n0) / px))

        def xy(ring):
            return [((x - e0) / px, (n1 - y) / px) for x, y in ring]
        ib = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(ib)
        for i in self._hit(self.bbox, bb):
            r = self.bld[i]
            d.polygon(xy(r[0]), fill=1)
        # courtyards (holes) after all exteriors of the same source would be wrong where OSM and ETHOS overlap: a hole of one
        # footprint may be roofed in the other; holes are cut only where no other exterior covers them (drawn into a second image)
        ihole = Image.new('L', (w, h), 0)
        dh = ImageDraw.Draw(ihole)
        for i in self._hit(self.bbox, bb):
            for hole in self.bld[i][1:]:
                if len(hole) >= 3:
                    dh.polygon(xy(hole), fill=1)
        bld = np.asarray(ib, bool)
        ir = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(ir)
        for i in self._hit(self.rbox, bb):
            c, hw, kind, bridge = self.roads[i]
            if hw <= 0:
                continue
            d.line(xy(c), fill=1, width=max(1, int(round(2 * (hw + grow_road) / px))), joint='curve')
        road = np.asarray(ir, bool)
        iw = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(iw)
        for i in self._hit(self.wbox, bb):
            r = self.water[i]
            d.polygon(xy(r[0]), fill=1)
            for hole in r[1:]:
                if len(hole) >= 3:
                    d.polygon(xy(hole), fill=0)
        water = np.asarray(iw, bool)
        if grow_bld > 0:
            from scipy import ndimage as ndi
            bld = ndi.binary_dilation(bld, iterations=max(1, int(round(grow_bld / px))))
        return bld, road, water

    def forest_mask(self, bb, px):
        """the mapped forest (OSM landuse=forest, natural=wood) as a mask of the box"""
        from PIL import Image, ImageDraw
        e0, n0, e1, n1 = bb
        w, h = int(round((e1 - e0) / px)), int(round((n1 - n0) / px))
        im = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(im)
        for i in self._hit(self.fbox, bb):
            r = self.forest[i]
            d.polygon([((x - e0) / px, (n1 - y) / px) for x, y in r[0]], fill=1)
        for i in self._hit(self.fbox, bb):
            for hole in self.forest[i][1:]:
                if len(hole) >= 3:
                    d.polygon([((x - e0) / px, (n1 - y) / px) for x, y in hole], fill=0)
        return np.asarray(im, bool)

    def osm_trees(self, bb):
        if not len(self.trees):
            return []
        m = (self.trees[:, 0] >= bb[0]) & (self.trees[:, 0] < bb[2]) & (self.trees[:, 1] >= bb[1]) & (self.trees[:, 1] < bb[3])
        return [(self.trees[i, 0], self.trees[i, 1], self.ttags[i]) for i in np.flatnonzero(m)]


def woody(cir, water=None, shade_ok=None):
    """-> (woody mask, ndvi, relative roughness, vegetation mask) from the infrared image (float32 channels nir, red, green)"""
    from scipy import ndimage as ndi
    nir, red = cir[..., 0], cir[..., 1]
    nd = ndi.uniform_filter((nir - red) / (nir + red + 1.0), 3)
    veg = nd > ND_VEG
    if water is not None:
        veg &= ~water
    vf = veg.astype(np.float32)
    w = ndi.uniform_filter(vf, 9) + 1e-6
    m = ndi.uniform_filter(nir * vf, 9) / w
    m2 = ndi.uniform_filter(nir * nir * vf, 9) / w
    sd = np.sqrt(np.maximum(m2 - m * m, 0))
    tex = np.where(veg, sd / (m + 20.0), 0).astype(np.float32)
    texs = ndi.uniform_filter(tex * vf, 15) / (ndi.uniform_filter(vf, 15) + 1e-6)
    lit = ndi.gaussian_filter(nir, 4.0) > NIR_LIT           # in direct sun (or `shade_ok`: the even shade of a building)
    if shade_ok is not None:
        lit |= shade_ok
    wood = veg & (texs > TEX_MIN) & lit
    from skimage.morphology import disk
    wood = ndi.binary_opening(wood, structure=disk(3))       # strips thinner than ~1.4 m go (hedge lines, lawn edges)
    wood = ndi.binary_closing(wood, structure=disk(3)) & veg
    wood = ndi.binary_fill_holes(wood) & (ndi.uniform_filter(vf, 5) > 0.5)
    wood = ndi.binary_dilation(wood, structure=disk(2)) & veg & (texs > 0.6 * TEX_MIN)   # the shaded side of a crown
    return wood, nd, texs, veg


def crowns(cir, wood, px=PX):
    """watershed crowns -> label image (0 = none) and the number of crowns"""
    from scipy import ndimage as ndi
    from skimage.feature import peak_local_max
    from skimage.segmentation import watershed
    nir = cir[..., 0]
    dt = ndi.distance_transform_edt(wood) * px
    # inside a closed canopy the distance to the edge says nothing about single crowns: it is capped, the bright crown tops decide.
    # Conifers (dark in the near infrared at the scale of a few metres) have narrow crowns: finer smoothing, closer tops.
    dts = ndi.gaussian_filter(np.minimum(dt, DT_CAP), 1.5)
    f = dts + BRIGHT * ndi.gaussian_filter(nir, SIGMA_TOP) / 255.0
    fc = dts + BRIGHT * ndi.gaussian_filter(nir, SIGMA_TOP_CON) / 255.0
    wf = wood.astype(np.float32)                              # mean over the canopy only (5 m: a stand, not the shaded side of
    con = ndi.gaussian_filter(nir * wf, 25.0) / (ndi.gaussian_filter(wf, 25.0) + 1e-3) < NIR_CON_AREA   # one broadleaf crown)
    lab = wood.astype(np.int32)
    pk = peak_local_max(f, min_distance=MIN_DIST, labels=lab * ~con, exclude_border=False)
    pc = peak_local_max(fc, min_distance=MIN_DIST_CON, labels=lab * con, exclude_border=False)
    pk = np.concatenate([pk, pc]) if len(pc) else pk
    f = np.where(con, fc, f)
    mk = np.zeros(wood.shape, np.int32)
    mk[pk[:, 0], pk[:, 1]] = np.arange(1, len(pk) + 1)
    seg = watershed(-f, mk, mask=wood)
    return seg, len(pk)


def hoehen(E, N, r, kind, ndom=None, oh=None):
    """heights of the trees: measured from the object-height model where one is given (ndom(E, N, r) -> heights, NaN where it has
    no data), otherwise estimated from crown radius and kind. -> (height m, measured bool array)"""
    con = np.isin(kind, list(CONIFER))
    h = np.where(kind == 30, np.clip(1.0 + 1.3 * r, 1.2, 4.0), np.where(con, np.clip(4.0 + 4.5 * r, 5.0, 34.0), np.clip(3.0 + 2.4 * r, 4.0, 28.0)))
    meas = np.zeros(len(r), bool)
    if oh is not None:
        h = np.where(np.isfinite(oh), oh, h)       # a mapper's estimate beats the rule; it is still an estimate
    if ndom is not None:
        hm = ndom(E, N, r)
        ok = np.isfinite(hm) & (hm > 1.5)
        h = np.where(ok, hm, h)
        meas = ok
    return h, meas


def kind_of_tags(tags):
    for k in ('genus', 'species', 'taxon', 'genus:de', 'species:de'):
        v = (tags.get(k) or '').lower()
        for name, code in GENUS.items():
            if name in v:
                return code
    lt = tags.get('leaf_type')
    if lt == 'needleleaved':
        return 1
    if lt == 'broadleaved':
        return 0
    return None


def osm_height(tags):
    try:
        v = float(str(tags.get('height', '')).replace(',', '.').split()[0])
        return v if 1.5 <= v <= 50 else float('nan')
    except (ValueError, IndexError):
        return float('nan')


def tile_trees(tx, ty, U, ndom=None, keep=None):
    """the trees of one tile -> dict of arrays (E, N, h, r, kind, flags, + nd, nir, tex for the statistics) and counters"""
    from scipy import ndimage as ndi
    bb = gbild.tile_box(tx, ty)
    e0, n0, e1, n1 = bb
    rgb, cir8 = gbild.fetch(tx, ty)
    cir = cir8.astype(np.float32)
    bld, road, water = U.raster(bb, PX)
    wood, nd, tex, veg = woody(cir, water)
    seg, n = crowns(cir, wood)
    st = {'kronen_roh': int(n), 'gruen_anteil': float(veg.mean()), 'gehoelz_anteil': float(wood.mean())}
    out = {k: [] for k in ('E', 'N', 'r', 'kind', 'flags', 'nd', 'nir', 'tex', 'red', 'grn', 'pk')}
    forest = U.forest_mask(bb, PX)
    if n:
        idx = np.arange(1, n + 1)
        area = ndi.sum(np.ones(seg.shape, np.float32), seg, idx) * PX * PX
        allowed = ~(bld | road)
        a_area = ndi.sum(allowed.astype(np.float32), seg, idx) * PX * PX
        mnd = ndi.mean(nd, seg, idx)
        mnir = ndi.mean(cir[..., 0], seg, idx)
        mred = ndi.mean(cir[..., 1], seg, idx)
        mgrn = ndi.mean(cir[..., 2], seg, idx)
        mtex = ndi.mean(tex, seg, idx)
        peak = ndi.maximum(ndi.gaussian_filter(cir[..., 0], 3.0), seg, idx)     # the sunlit top of the crown
        segA = np.where(allowed, seg, 0)
        com = ndi.center_of_mass(allowed.astype(np.float32), segA, idx)
        full = ndi.center_of_mass(np.ones(seg.shape, np.float32), seg, idx)
        obj = ndi.find_objects(seg)
        H, W = seg.shape
        drop_roof = drop_small = moved = 0
        for k in range(n):
            r = float(np.sqrt(area[k] / np.pi))
            if r < R_MIN:
                drop_small += 1
                continue
            if a_area[k] < 0.25 * area[k] and a_area[k] < 1.5:
                drop_roof += 1          # (nearly) all of it lies on a roof or in a carriageway
                continue
            cy, cx = com[k]
            iy, ix = int(round(cy)), int(round(cx))
            fl = POS_IMAGE | F_R
            if not (0 <= iy < H and 0 <= ix < W and segA[iy, ix] == k + 1):
                sl = obj[k]
                sub = segA[sl] == k + 1
                yy, xx = np.nonzero(sub)
                if not len(yy):
                    drop_roof += 1
                    continue
                j = np.argmin((yy + sl[0].start - cy) ** 2 + (xx + sl[1].start - cx) ** 2)
                iy, ix = yy[j] + sl[0].start, xx[j] + sl[1].start
            if np.hypot(iy - full[k][0], ix - full[k][1]) * PX > 0.75:
                fl |= F_MOVED
                moved += 1
            E, N = e0 + (ix + 0.5) * PX, n1 - (iy + 0.5) * PX
            # kind: conifers are dark in the near infrared even where the sun is on them (two clear modes in the forest above
            # Goldlauter: crown tops 130-150 against 170-190); in the mapped forest a conifer counts as spruce (the usual
            # conifer of the Thuringian Forest – an estimate); small crowns outside the forest are shrubs
            inf = bool(forest[iy, ix])
            con = peak[k] < NIR_CON_PEAK and mnir[k] < NIR_CON_MEAN and mtex[k] > TEX_CON
            kd = (2 if inf else 1) if con else 0
            if r < R_SHRUB and not inf:
                kd = 30
            if inf:
                fl |= F_FOREST
            out['E'].append(E); out['N'].append(N); out['r'].append(r); out['kind'].append(kd); out['flags'].append(fl)
            out['nd'].append(mnd[k]); out['nir'].append(mnir[k]); out['tex'].append(mtex[k]); out['red'].append(mred[k]); out['grn'].append(mgrn[k])
            out['pk'].append(peak[k])
        st.update(verworfen_klein=drop_small, verworfen_dach_fahrbahn=drop_roof, geruecket=moved)
    T = {k: np.array(v, float) for k, v in out.items()}
    T['kind'] = T['kind'].astype(int)
    T['flags'] = T['flags'].astype(int)
    T['oh'] = np.full(len(T['E']), np.nan)      # height tagged in OSM (a mapper's estimate), where there is one
    # mapped trees (OSM natural=tree): a crown found at a mapped tree is a tree (never a shrub) and takes the mapped species; the
    # position stays the crown's (the 20 cm image is sharper than most mapping, the Markt's rows lie 2-3 m off in OSM). A mapped tree
    # without a crown of its own is added at the mapped position where the image shows vegetation there.
    O = U.osm_trees(bb)
    n0c = len(T['E'])
    pairs = []
    for i, (oe, on, tags) in enumerate(O):
        if n0c:
            d = np.hypot(T['E'][:n0c] - oe, T['N'][:n0c] - on)
            for j in np.flatnonzero(d <= np.maximum(3.5, T['r'][:n0c])):
                pairs.append((d[j], i, int(j)))
    pairs.sort()
    o_used, c_used = {}, set()
    for d, i, j in pairs:
        if i in o_used or j in c_used:
            continue
        o_used[i] = j
        c_used.add(j)
    osm_hit = osm_added = osm_gone = osm_new = 0
    for i, (oe, on, tags) in enumerate(O):
        kd = kind_of_tags(tags)
        if i in o_used:
            j = o_used[i]
            osm_hit += 1
            T['flags'][j] |= F_OSM
            T['oh'][j] = osm_height(tags)
            if kd is not None:
                T['kind'][j] = kd
                T['flags'][j] |= F_KIND
            elif T['kind'][j] == 30:
                T['kind'][j] = 0
            continue
        ix, iy = int((oe - e0) / PX), int((n1 - on) / PX)
        inside = 0 <= iy < veg.shape[0] and 0 <= ix < veg.shape[1]
        if inside and veg[max(0, iy - 10):iy + 11, max(0, ix - 10):ix + 11].mean() > 0.08 and not (bld[iy, ix] or road[iy, ix]):
            osm_added += 1
            r = 1.5
            try:
                r = max(0.8, min(12.0, float(str(tags.get('diameter_crown', '')).replace(',', '.').split()[0]) / 2))
            except (ValueError, IndexError):
                pass
            for k, v in (('E', oe), ('N', on), ('r', r), ('kind', 0 if kd is None else kd),
                         ('flags', POS_OSM | F_OSM | (F_KIND if kd is not None else 0)), ('nd', nd[iy, ix]), ('nir', cir[iy, ix, 0]),
                         ('tex', tex[iy, ix]), ('red', cir[iy, ix, 1]), ('grn', cir[iy, ix, 2]), ('pk', cir[iy, ix, 0]), ('oh', osm_height(tags))):
                T[k] = np.append(T[k], v)
        elif inside and tags.get('_v') == 1 and str(tags.get('_t', '')) > FLIGHT and not (bld[iy, ix] or road[iy, ix] or water[iy, ix]):
            # mapped for the first time after the flight and not in the image: a new planting, set as a young tree
            osm_new += 1
            for k, v in (('E', oe), ('N', on), ('r', 1.0), ('kind', 0 if kd is None else kd),
                         ('flags', POS_OSM | F_OSM | (F_KIND if kd is not None else 0)), ('nd', 0.0), ('nir', 0.0), ('tex', 0.0),
                         ('red', 0.0), ('grn', 0.0), ('pk', 0.0), ('oh', 4.0)):
                T[k] = np.append(T[k], v)
        else:
            osm_gone += 1
    st.update(osm_baeume=len(O), osm_mit_krone=osm_hit, osm_ohne_krone_gesetzt=osm_added, osm_neu_gepflanzt=osm_new, osm_nicht_sichtbar=osm_gone)
    # keep the trees of the tile and of a band around it: merge() gives every tree to the tile its trunk stands in and drops doubles
    te0, tn0, te1, tn1 = glib.wlib.tbounds(glib.L, tx, ty)
    m = (T['E'] >= te0 - BAND) & (T['E'] < te1 + BAND) & (T['N'] >= tn0 - BAND) & (T['N'] < tn1 + BAND)
    T = {k: v[m] for k, v in T.items()}
    if keep is not None:
        keep.update(rgb=rgb, cir=cir8, seg=seg, wood=wood, veg=veg, bld=bld, road=road, bb=bb)
    return T, st


def pack(T, tx, ty):
    """-> bytes of the tile file (8 bytes per tree)"""
    e0, n0, e1, n1 = glib.wlib.tbounds(glib.L, tx, ty)
    n = len(T['E'])
    a = np.zeros(n, dtype=[('x', '<u2'), ('y', '<u2'), ('h', 'u1'), ('r', 'u1'), ('k', 'u1'), ('f', 'u1')])
    a['x'] = np.clip(np.round((T['E'] - e0) * 100), 0, 39999)
    a['y'] = np.clip(np.round((T['N'] - n0) * 100), 0, 39999)
    a['h'] = np.clip(np.round(T['h'] / 0.25), 1, 255)
    a['r'] = np.clip(np.round(T['r'] / 0.1), 1, 255)
    a['k'] = T['kind']
    a['f'] = T['flags']
    return a.tobytes()


def unpack(b, tx, ty):
    e0, n0, e1, n1 = glib.wlib.tbounds(glib.L, tx, ty)
    a = np.frombuffer(b, dtype=[('x', '<u2'), ('y', '<u2'), ('h', 'u1'), ('r', 'u1'), ('k', 'u1'), ('f', 'u1')])
    return {'E': e0 + a['x'] / 100.0, 'N': n0 + a['y'] / 100.0, 'h': a['h'] * 0.25, 'r': a['r'] * 0.1, 'kind': a['k'].astype(int),
            'flags': a['f'].astype(int)}


# ---------------- run over tiles, merge of neighbours, product files ----------------


def run(tiles, work, U, redo=False):
    """detect the trees of every tile (with its band) into work/t/{tx}_{ty}.npz; a tile that is there is not computed again"""
    os.makedirs(os.path.join(work, 't'), exist_ok=True)
    for k, (tx, ty) in enumerate(tiles):
        p = os.path.join(work, 't', f'{tx}_{ty}.npz')
        if os.path.exists(p) and not redo:
            continue
        t0 = time.time()
        T, st = tile_trees(tx, ty, U)
        st['sekunden'] = round(time.time() - t0, 1)
        np.savez_compressed(p + '.part.npz', st=json.dumps(st), **T)
        os.replace(p + '.part.npz', p)
        glib.log(f'{k + 1}/{len(tiles)} tile {tx}_{ty}: {len(T["E"])} trees with band, {st}')


def merge(tiles, work):
    """every tree goes to the tile its trunk stands in; of two finds of one tree (seen from two tiles) the one found by the tile
    that owns the spot stays. -> {(tx, ty): T}, per-tile statistics"""
    from scipy.spatial import cKDTree
    parts, stats = [], {}
    for tx, ty in tiles:
        p = os.path.join(work, 't', f'{tx}_{ty}.npz')
        if not os.path.exists(p):
            continue
        z = np.load(p)
        stats[f'{tx}_{ty}'] = json.loads(str(z['st']))
        n = len(z['E'])
        if not n:
            continue
        T = {k: z[k] for k in z.files if k != 'st'}
        e0, n0, e1, n1 = glib.wlib.tbounds(glib.L, tx, ty)
        T['own'] = ((T['E'] >= e0) & (T['E'] < e1) & (T['N'] >= n0) & (T['N'] < n1)).astype(int)
        parts.append(T)
    if not parts:
        return {}, stats
    A = {k: np.concatenate([p[k] for p in parts]) for k in parts[0]}
    # doubles: two finds within max(1.5 m, half the smaller radius); the find of the owning tile wins, then the larger crown
    tree = cKDTree(np.stack([A['E'], A['N']], 1))
    order = np.lexsort((-A['r'], -A['own']))
    alive = np.ones(len(order), bool)
    for i in order:
        if not alive[i]:
            continue
        for j in tree.query_ball_point([A['E'][i], A['N'][i]], max(1.5, 0.5 * A['r'][i])):
            if j != i and alive[j] and np.hypot(A['E'][i] - A['E'][j], A['N'][i] - A['N'][j]) < max(1.5, 0.5 * min(A['r'][i], A['r'][j])):
                alive[j] = False
    A = {k: v[alive] for k, v in A.items()}
    s = glib.wlib.tsize(glib.L)
    kx = np.floor((A['E'] - glib.wlib.ROOT_E0) / s).astype(int)
    ky = np.floor((A['N'] - glib.wlib.ROOT_N0) / s).astype(int)
    out = {}
    want = set(tiles)
    for tx, ty in sorted(set(zip(kx.tolist(), ky.tolist()))):
        if (tx, ty) not in want:
            continue                      # a band tree of a tile outside the run: its own tile will find it
        m = (kx == tx) & (ky == ty)
        out[(tx, ty)] = {k: v[m] for k, v in A.items()}
    return out, stats


def write_product(M, out, extra=None, ndom=None):
    """the tile files and index.json of product b under `out` (…/suhl/b/v<N>)"""
    tiles, n_all = {}, 0
    for (tx, ty), T in sorted(M.items()):
        h, meas = hoehen(T['E'], T['N'], T['r'], T['kind'], ndom=ndom, oh=T.get('oh'))
        T['h'] = h
        T['flags'] = (T['flags'] & ~F_H) | np.where(meas, F_H, 0)
        p = os.path.join(out, str(glib.L), str(tx), f'{ty}.bin')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(pack(T, tx, ty))
        tiles[f'{tx}_{ty}'] = int(len(T['E']))
        n_all += len(T['E'])
    idx = {
        'produkt': 'b', 'name': 'Bäume (Einzelbäume)', 'schema': SCHEMA, 'made': glib.now(), 'level': glib.L, 'kachel_m': glib.wlib.tsize(glib.L),
        'crs': 'EPSG:25832 (ETRS89 / UTM 32N); Kacheln im Quadtree von tools/welt/wlib.py',
        'pfad': '{level}/{x}/{y}.bin',
        'format': {'bytes_je_baum': 8, 'byteorder': 'little',
                   'felder': [['x', 'uint16', 'Ost-Abstand vom Westrand der Kachel in cm'], ['y', 'uint16', 'Nord-Abstand vom Südrand der Kachel in cm'],
                              ['h', 'uint8', 'Baumhöhe in 0,25 m'], ['r', 'uint8', 'Kronenradius in 0,1 m'], ['art', 'uint8', 'siehe arten'],
                              ['merker', 'uint8', 'siehe merker']],
                   'hinweis': 'Die Geländehöhe steht nicht in der Datei: die Laufzeit fragt den Boden (KERN.ground). UTM -> Modell mit xf aus viz3/manifests.json.'},
        'arten': {str(k): v for k, v in KINDS.items()}, 'nadel': sorted(CONIFER), 'merker': FLAGS,
        'kacheln': tiles, 'anzahl': int(n_all),
        'attribution': glib.ATTRIBUTION,
        'quellen': [{'name': 'DOP20 Thüringen, Ebenen th_dop und th_dop20cir (WMS), Bildflug 15.05.2024', 'lizenz': 'CC BY 4.0 (dl-de/by-2-0), © GDI-Th',
                     'url': glib.WMS},
                    {'name': 'OpenStreetMap (natural=tree, Gebäude, Straßen, Wasser)', 'lizenz': 'ODbL 1.0, © OpenStreetMap-Mitwirkende'},
                    {'name': 'ETHOS.BUILDA (Gebäudegrundrisse, nur zum Ausschluss von Dächern)', 'lizenz': 'ODbL 1.0, Forschungszentrum Jülich, Zenodo 11845992'}],
    }
    idx.update(extra or {})
    glib.write_json(os.path.join(out, 'index.json'), idx, indent=1)
    return idx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gebiet', default='zentrum')
    ap.add_argument('--tiles', default='')
    ap.add_argument('--work', default=os.path.join(glib.RAW, 'work'))
    ap.add_argument('--out', required=True)
    ap.add_argument('--kontext', default=os.path.join(glib.RAW, 'kontext.pkl'))
    ap.add_argument('--redo', action='store_true')
    ap.add_argument('--stand', default='', help='a note for the index, e.g. "Probesatz Zentrum"')
    a = ap.parse_args()
    tiles = [tuple(int(v) for v in t.split('_')) for t in a.tiles.split(',') if t] or glib.tiles_of(glib.area_utm(a.gebiet))
    U = Umfeld(kontext.load(a.kontext))
    run(tiles, a.work, U, redo=a.redo)
    M, stats = merge(tiles, a.work)
    idx = write_product(M, a.out, {'stand': a.stand or f'Gebiet {a.gebiet}', 'gebiet': a.gebiet if not a.tiles else None})
    glib.log(f"{idx['anzahl']} trees in {len(idx['kacheln'])} tiles -> {a.out}")
    return M, stats


if __name__ == '__main__':
    main()
