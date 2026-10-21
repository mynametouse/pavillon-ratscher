# open geodata for Ratscher: Thuringian DGM1/DOM1 tiles (1 m, © GDI-Th), orthophotos (DOP, colour + infrared) via WMS, Copernicus DEM (outer ring), OSM
import os, sys, time, json
sys.path.insert(0, os.path.dirname(__file__)); from wms import get, dop
from common import DATA as D; os.makedirs(D, exist_ok=True)
def save(name, b): open(os.path.join(D, name), 'wb').write(b); print('saved', name, len(b), flush=True)
CX, CY = 625650, 5595500   # centre of the inner area (between the garden and the village), EPSG:25832
# 1) orthophotos
jobs = [('dop_near.jpg', (625470 - 320, 5595625 - 320, 625470 + 320, 5595625 + 320), 2048, 'th_dop'),
        ('dop_inner.jpg', (CX - 1200, CY - 1200, CX + 1200, CY + 1200), 2048, 'th_dop'),
        ('dop_outer.jpg', (CX - 5000, CY - 5000, CX + 5000, CY + 5000), 2048, 'th_dop200rgb'),
        ('cir_inner.jpg', (CX - 1200, CY - 1200, CX + 1200, CY + 1200), 2400, 'th_dop20cir')]
for name, (x0, y0, x1, y1), px, layer in jobs:
    if os.path.exists(os.path.join(D, name)): continue
    save(name, dop(x0, y0, x1, y1, px, px, layer=layer)); time.sleep(2)
# 2) DGM1 / DOM1 tiles (1 km)
for kind in ('DGM', 'DOM'):
    for ex in (624, 625, 626):
        for ny in (5594, 5595, 5596):
            fn = f'{kind.lower()}1_{ex}_{ny}.zip'
            if os.path.exists(os.path.join(D, fn)): continue
            url = f'https://geoportal.geoportal-th.de/hoehendaten/{kind}/{kind.lower()}_2020-2025/{kind.lower()}1_32_{ex}_{ny}_1_th_2020-2025.zip'
            try: save(fn, get(url))
            except Exception as e: print('FAIL', fn, e, flush=True)
            time.sleep(1)
# 3) Copernicus DEM GLO-30 (surface model, 1 arc second) for the outer ring
fn = 'cop30_N50_E010.tif'
if not os.path.exists(os.path.join(D, fn)):
    save(fn, get('https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N50_00_E010_00_DEM/Copernicus_DSM_COG_10_N50_00_E010_00_DEM.tif'))
# 4) OSM: the wider area (water, forest, places) in four quarters
from pyproj import Transformer
T = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
for i, (qx, qy) in enumerate([(-1, -1), (0, -1), (-1, 0), (0, 0)]):
    fn = f'osm_outer_{i}.osm'
    if os.path.exists(os.path.join(D, fn)): continue
    x0, y0 = CX + qx * 5000, CY + qy * 5000; lon0, lat0 = T.transform(x0, y0); lon1, lat1 = T.transform(x0 + 5000, y0 + 5000)
    try: save(fn, get(f'https://api.openstreetmap.org/api/0.6/map?bbox={lon0:.5f},{lat0:.5f},{lon1:.5f},{lat1:.5f}'))
    except Exception as e: print('FAIL osm', i, e, flush=True)
    time.sleep(3)
print('ALL DONE', flush=True)
