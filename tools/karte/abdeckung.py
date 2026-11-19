# Coverage analysis: what of South Thuringia (and of the map the app has) is in 3D – terrain, imagery, buildings, trees, vegetation
# (feat/karte, 19.11.2026; results in the project document claude/pavillon-karte-daten.md).
#   python3 tools/karte/abdeckung.py RAW      RAW holds: kreis_*.json (Nominatim polygons of the four districts), meta.json (welt-test),
#   vessra_meta.json, suhl_boden_meta.json, suhl_g.json, suhl_b.json (the data repo's indexes), wd_orte.json (wd_orte.py) and the
#   ESA WorldCover tile wc_N48E009.tif; writes abdeckung.json, masks.npz, grid.json there (never into the repo)
import json, base64, math, sys, os
import numpy as np, rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from rasterio.features import rasterize
from shapely.geometry import shape, mapping, Point
from shapely.ops import unary_union, transform as stransform
import pyproj

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = sys.argv[1] if len(sys.argv) > 1 else '/tmp/an'
RES = 20.0
XF = json.load(open(f'{R}/viz3/manifests.json'))['geoman']['xf']
a, b, ex, ey = XF['a'], XF['b'], XF['ex'], XF['ey']
S2 = a * a + b * b
to_utm = pyproj.Transformer.from_crs(4326, 25832, always_xy=True).transform
to_ll = pyproj.Transformer.from_crs(25832, 4326, always_xy=True).transform

# ---- counties (Nominatim, OSM) ----
K = {}
for name, f in [('Hildburghausen', 'kreis_Landkreis_Hildburghausen.json'), ('Schmalkalden-Meiningen', 'kreis_Landkreis_Schmalkalden-Meiningen.json'),
                ('Sonneberg', 'kreis_Landkreis_Sonneberg.json'), ('Suhl', 'kreis_Suhl__Thuuringen.json')]:
    d = json.load(open(f'{A}/{f}'))
    d = [r for r in d if r['geojson']['type'] in ('Polygon', 'MultiPolygon')][0]
    K[name] = stransform(to_utm, shape(d['geojson']))
REG = unary_union(list(K.values()))
E0, N0, E1, N1 = [math.floor(v / 400) * 400 for v in REG.bounds[:2]] + [math.ceil(v / 400) * 400 for v in REG.bounds[2:]]
W, H = int((E1 - E0) / RES), int((N1 - N0) / RES)
tr = rasterio.transform.from_origin(E0, N1, RES, RES)
print('grid', W, H, file=sys.stderr)
kreis = np.zeros((H, W), np.uint8)
for k, (name, g) in enumerate(K.items(), 1):
    kreis |= rasterize([(mapping(g), k)], out_shape=(H, W), transform=tr, dtype=np.uint8) * (kreis == 0)
# pixel centres in UTM and in model metres
ee = E0 + (np.arange(W) + 0.5) * RES
nn = N1 - (np.arange(H) + 0.5) * RES
EE, NN = np.meshgrid(ee, nn)
dE, dN = EE - ex, NN - ey
MX = (a * dE + b * dN) / S2
MY = (-b * dE + a * dN) / S2
CI = np.floor(MX / 400).astype(np.int32)
CJ = np.floor(MY / 400).astype(np.int32)
CK = CI.astype(np.int64) * 100000 + CJ

def cellmask(keys):
    ks = np.array([int(k.split('_')[0]) * 100000 + int(k.split('_')[1]) for k in keys], np.int64)
    return np.isin(CK, ks)

def mrect(x0, y0, x1, y1):
    return (MX >= x0) & (MX < x1) & (MY >= y0) & (MY < y1)

def urect(e0, n0, e1, n1):
    return (EE >= e0) & (EE < e1) & (NN >= n0) & (NN < n1)

ROOT_E0, ROOT_N0, ROOT = 420700.0, 5390800.0, 409600.0
def tiles_mask(L, tl):
    s = ROOT / (1 << L)
    tx = np.floor((EE - ROOT_E0) / s).astype(np.int64)
    ty = np.floor((NN - ROOT_N0) / s).astype(np.int64)
    ks = np.array([x * 1000000 + y for x, y in tl], np.int64)
    return np.isin(tx * 1000000 + ty, ks)

def rect_tiles(rect):
    x0, y0, x1, y1 = rect
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]

def has_tiles(h):
    b = base64.b64decode(h['bits'])
    return [(h['x0'] + k % h['w'], h['y0'] + k // h['w']) for k in range(h['w'] * h['h']) if b[k >> 3] >> (k & 7) & 1]

meta = json.load(open(f'{A}/meta.json'))
vmeta = json.load(open(f'{A}/vessra_meta.json'))
smeta = json.load(open(f'{A}/suhl_boden_meta.json'))
def set_levels(m):
    out = {}
    for L, v in m['tiling']['levels'].items():
        out[int(L)] = [tuple(t) for t in v['has']] if 'has' in v else rect_tiles(v['rect'])
    return out
SETS = {'haupt': set_levels(meta), 'vessra': set_levels(vmeta), 'suhl': set_levels(smeta)}
GZ = urect(636300, 5585000, 639100, 5586200)  # Grenzland zone (2.8 x 1.2 km, Bavarian DGM1), approximate N from docs

karte = GZ.copy()
img10 = GZ.copy()
img12 = np.zeros_like(GZ)
for nm, lv in SETS.items():
    for L, tl in lv.items():
        m = tiles_mask(L, tl)
        karte |= m
        if L >= 10: img10 |= m
        if L >= 12: img12 |= m
SQ = mrect(-1031.6, -1335.6, 1368.4, 1064.4)       # Ratscher's 2.4 km square (DGM1 at 10 m, own buildings and trees)
img12 |= SQ
dgm_km = smeta['sources']['dgm1_tiles_km']
dgm1 = SQ | GZ | np.isin(np.floor(EE / 1000).astype(np.int64) * 10000 + np.floor(NN / 1000).astype(np.int64),
                         np.array([int(k.split('_')[0]) * 10000 + int(k.split('_')[1]) for k in dgm_km], np.int64))

gidx = json.load(open(f'{R}/viz3/extra/welt-gebaeude/dist/gebaeude/z/index.json'))
widx = json.load(open(f'{R}/viz3/extra/welt-wald/dist/weltwald/z/index.json'))
bidx = json.load(open(f'{R}/viz3/extra/bewuchs-daten/dist/bewuchs/z/index.json'))
sg = json.load(open(f'{A}/suhl_g.json')); sb = json.load(open(f'{A}/suhl_b.json'))
SCHL = mrect(-1644.7, 681.9, -524.7, 1801.9)
bld3d = cellmask(gidx['cells'].keys()) | SQ | tiles_mask(10, has_tiles(sg['has']['10']))
tree3d = cellmask(widx['cells'].keys()) | SQ | SCHL | tiles_mask(10, has_tiles(sb['has']['10']))
veg3d = cellmask(bidx['cells'].keys())
print('masks done', file=sys.stderr)

# ---- land cover: ESA WorldCover 2021 (10 m), resampled to 20 m UTM by mode ----
url = f'{A}/wc_N48E009.tif'  # https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N48E009_Map.tif
cache = f'{A}/wc20.npy'
if os.path.exists(cache):
    LC = np.load(cache)
else:
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MULTIRANGE='YES', VSI_CACHE='TRUE', GDAL_HTTP_CAINFO=os.path.expanduser('~/.ccr/ca-bundle.crt'), CURL_CA_BUNDLE=os.path.expanduser('~/.ccr/ca-bundle.crt')):
        with rasterio.open(url) as src:
            with WarpedVRT(src, crs='EPSG:25832', transform=tr, width=W, height=H, resampling=Resampling.mode) as v:
                LC = v.read(1)
    np.save(cache, LC)
print('landcover', file=sys.stderr)
px = RES * RES / 1e6
CLS = {'Wald': LC == 10, 'Gebüsch': LC == 20, 'Grünland': LC == 30, 'Acker': LC == 40, 'Siedlung': LC == 50, 'Wasser': LC == 80}
inreg = kreis > 0

def km2(m): return round(float(m.sum()) * px, 1)
res = {'gebiete': {}, 'karte': {}}
for k, name in enumerate(K, 1):
    m = kreis == k
    res['gebiete'][name] = {'km2': km2(m), 'karte_km2': km2(m & karte), 'img10_km2': km2(m & img10), 'dgm1_km2': km2(m & dgm1)}
res['gebiete']['Südthüringen'] = {'km2': km2(inreg), 'karte_km2': km2(inreg & karte), 'img10_km2': km2(inreg & img10), 'dgm1_km2': km2(inreg & dgm1)}
# everything on the map (also beyond the counties: Bavaria in the south of the context square)
for scope, sm in [('karte', karte), ('karte_fein', img10), ('suedthueringen', inreg)]:
    r = {'km2': km2(sm)}
    for c, cm in CLS.items():
        r[c] = {'km2': km2(sm & cm)}
    r['Wald']['3d_km2'] = km2(sm & CLS['Wald'] & tree3d)
    r['Siedlung']['3d_km2'] = km2(sm & CLS['Siedlung'] & bld3d)
    r['Grünland']['3d_km2'] = km2(sm & CLS['Grünland'] & veg3d)
    r['Acker']['3d_km2'] = km2(sm & CLS['Acker'] & veg3d)
    r['dgm1_km2'] = km2(sm & dgm1); r['img10_km2'] = km2(sm & img10); r['img12_km2'] = km2(sm & img12)
    res[scope] = r

# ---- places: settlements of Wikidata; their built-up area (WorldCover) within 700 m and how much of it is in 3D ----
wd = json.load(open(f'{A}/wd_orte.json'))
orte = []
yy, xx = np.mgrid[-35:36, -35:36]
disk = (xx * xx + yy * yy) <= 35 * 35
for o in wd:
    if o['g'] != 'ort': continue
    E, N = to_utm(o['lon'], o['lat'])
    c, r = int((E - E0) / RES), int((N1 - N) / RES)
    if not (35 <= c < W - 35 and 35 <= r < H - 35): continue
    sl = (slice(r - 35, r + 36), slice(c - 35, c + 36))
    bu = (LC[sl] == 50) & disk
    if bu.sum() < 5: continue
    def share(m): return round(float((bu & m[sl]).sum()) / float(bu.sum()), 2)
    fo = (LC[sl] == 10) & disk
    gr = ((LC[sl] == 30) | (LC[sl] == 40)) & disk
    orte.append({'n': o['n'], 'q': o['q'], 'pop': o.get('pop'), 'in': list(o['in'].values())[:2], 'kreis': list(K)[kreis[r, c] - 1] if kreis[r, c] else '',
                 'E': round(E), 'N': round(N), 'x': round(float(MX[r, c])), 'y': round(float(MY[r, c])),
                 'bebaut_ha': round(float(bu.sum()) * RES * RES / 1e4, 1), 'karte': share(karte), 'luftbild_fein': share(img10),
                 'gebaeude3d': share(bld3d), 'gelaende1m': share(dgm1),
                 'wald_ha': round(float(fo.sum()) * 0.04, 1), 'wald3d': round(float((fo & tree3d[sl]).sum()) / max(1, fo.sum()), 2),
                 'flur_ha': round(float(gr.sum()) * 0.04, 1), 'flur3d': round(float((gr & veg3d[sl]).sum()) / max(1, gr.sum()), 2)})
res['orte'] = orte
json.dump(res, open(f'{A}/abdeckung.json', 'w'), ensure_ascii=False, indent=1)
np.savez_compressed(f'{A}/masks.npz', karte=karte, img10=img10, img12=img12, dgm1=dgm1, bld3d=bld3d, tree3d=tree3d, veg3d=veg3d, kreis=kreis, LC=LC)
json.dump({'E0': E0, 'N1': N1, 'RES': RES, 'W': W, 'H': H}, open(f'{A}/grid.json', 'w'))
print(json.dumps({k: v for k, v in res.items() if k != 'orte'}, ensure_ascii=False, indent=1))
