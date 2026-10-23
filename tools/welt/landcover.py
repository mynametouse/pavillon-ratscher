"""ESA WorldCover 2021 (10 m, CC BY 4.0) on a UTM grid: tree cover mask for the Copernicus fallback (GLO-30 is a surface model:
forests stand ~15-30 m above the ground; without DGM1 the canopy is lowered by an estimated offset so that roads through forests run
near the ground). Windowed reads straight from the public COG on S3 (rasterio/GDAL), cached as .npy in the raw directory."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log

WC = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif'


def tile_name(lat, lon):
    la, lo = int(np.floor(lat / 3) * 3), int(np.floor(lon / 3) * 3)
    return f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"


class TreeMask:
    """tree cover share (0..1) on a 10 m UTM grid over `area`, smoothed; call with (E, N) -> share"""
    def __init__(self, raw, area, res=10.0):
        e0, n0, e1, n1 = area
        self.e0, self.n1, self.res = e0, n1, res
        W, H = int(np.ceil((e1 - e0) / res)), int(np.ceil((n1 - n0) / res))
        p = os.path.join(raw, 'worldcover', f'trees_{e0:.0f}_{n0:.0f}_{e1:.0f}_{n1:.0f}_{res:.0f}.npy')
        if os.path.exists(p):
            self.m = np.load(p)
        else:
            import rasterio
            from rasterio.warp import reproject, Resampling
            from rasterio.transform import from_origin
            from pyproj import Transformer
            toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
            lons, lats = toLL.transform([e0, e1, e0, e1], [n0, n0, n1, n1])
            names = sorted({tile_name(la, lo) for la in (min(lats), max(lats)) for lo in (min(lons), max(lons))})
            cls = np.zeros((H, W), np.uint8)
            for nm in names:
                part = np.zeros((H, W), np.uint8)
                with rasterio.open(WC.format(tile=nm)) as src:
                    reproject(source=rasterio.band(src, 1), destination=part, src_transform=src.transform, src_crs=src.crs,
                              dst_transform=from_origin(e0, n1, res, res), dst_crs='EPSG:25832', resampling=Resampling.mode)
                cls = np.where(part > 0, part, cls)
                log('WorldCover', nm, 'gelesen')
            os.makedirs(os.path.dirname(p), exist_ok=True)
            self.m = (cls == 10).astype(np.float32)
            np.save(p, self.m)
        from scipy import ndimage
        self.s = ndimage.gaussian_filter(self.m, 2.0)   # ~20 m soft forest edges
        log(f'Baumbedeckung (WorldCover 2021): {100 * self.m.mean():.0f} % der Fläche')

    def __call__(self, E, N):
        from dem import bilinear
        v = bilinear(self.s, E, N, self.e0, self.n1, self.res)
        return np.nan_to_num(v, nan=0.0)
