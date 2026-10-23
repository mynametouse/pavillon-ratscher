"""The road profile method on real 1 m terrain while the Thuringian DGM1 server is down: four Bavarian DGM1 tiles (open data,
CC BY 4.0, Bayerische Vermessungsverwaltung) near Rödental (Landkreis Coburg, ~16 km south of the garden) and the OSM roads there.
Prints the metric per class (waves per km, change of grade per 10 m) for the plain axis profile, the smoothed profile and the smoothed
profile with the axis moved onto the carriageway; writes profile images.
  python3 -I tools/welt/demo_dgm1.py <raw dir> <out dir> [E_km N_km]   (default 633 5580: 2 x 2 km)"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import http_get, log
from dem import bilinear


class TifDem:
    """1 m mosaic from Bavarian DGM1 GeoTIFFs (1 km, pixel areas, tie point = upper-left corner)"""
    def __init__(self, raw, e_km, n_km, n=2):
        import tifffile
        self.e0, self.n1 = e_km * 1000.0, (n_km + n) * 1000.0
        self.mos = np.full((n * 1000, n * 1000), np.nan, np.float32)
        for i in range(n):
            for j in range(n):
                name = f'{e_km + i}_{n_km + j}.tif'
                p = os.path.join(raw, 'dgm1_by', name)
                if not os.path.exists(p):
                    st, b, ct = http_get(f'https://download1.bayernwolke.de/a/dgm/dgm1/{name}')
                    if st != 200:
                        raise RuntimeError(f'{name}: HTTP {st}')
                    os.makedirs(os.path.dirname(p), exist_ok=True)
                    open(p, 'wb').write(b)
                with tifffile.TiffFile(p) as t:
                    a = t.pages[0].asarray().astype(np.float32)
                    tp = t.pages[0].tags[33922].value
                a[a < -1000] = np.nan
                r0, c0 = int(round(self.n1 - tp[4])), int(round(tp[3] - self.e0))
                self.mos[r0:r0 + a.shape[0], c0:c0 + a.shape[1]] = a

    def sample(self, E, N):
        v = bilinear(self.mos, E, N, self.e0, self.n1, 1.0)
        return np.where(np.isfinite(v), v, np.nanmean(self.mos))


def main():
    raw, out = sys.argv[1], sys.argv[2]
    e_km, n_km = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (633, 5580)
    os.makedirs(out, exist_ok=True)
    dem = TifDem(raw, e_km, n_km)
    log(f'DGM1 Bayern {e_km}_{n_km} (2 x 2 km): Höhen {np.nanmin(dem.mos):.1f} .. {np.nanmax(dem.mos):.1f}')
    from pyproj import Transformer
    from fetch import fetch_osm
    import roads
    toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
    area = (dem.e0 + 50, dem.n1 - 2000 + 50, dem.e0 + 1950, dem.n1 - 50)
    lo, la = toLL.transform([area[0] - 200, area[2] + 200], [area[1] - 200, area[3] + 200])
    osm = fetch_osm(raw, (round(lo[0], 4), round(la[0], 4), round(lo[1], 4), round(la[1], 4)))
    ways, nodeE = roads.load_ways(osm, area, margin=0)
    # keep the roads inside the 1 m data (the profile of a way leaving the tiles would read NaN-filled heights)
    pos, chains = roads.network(ways, nodeE)
    inside = (pos[:, 0] > dem.e0 + 5) & (pos[:, 0] < dem.e0 + 1995) & (pos[:, 1] > dem.n1 - 1995) & (pos[:, 1] < dem.n1 - 5)
    chains = [(w, ids[inside[ids]]) for w, ids in chains]
    chains = [(w, ids) for w, ids in chains if len(ids) > 2]
    log(f'{len(chains)} Wege im Ausschnitt')
    h, axis, _ = roads.solve_profile(pos, chains, dem)
    res = roads.metrics(pos, chains, h, axis)
    roads.print_metrics(res, 'DGM1 Bayern, Achse wie in OSM')
    pos2, sa = roads.fit_axis(pos, chains, dem)
    h2, axis2, _ = roads.solve_profile(pos2, chains, dem)
    res2 = roads.metrics(pos2, chains, h2, axis2)
    roads.print_metrics(res2, 'DGM1 Bayern, Achse auf die Fahrbahn geschoben')
    rts = roads.routes(pos2, chains, h2, area, n=2)
    for k, r in enumerate(rts):
        P = np.array(r['pts'])
        ss = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P[:, :2], axis=0).T))])
        roads.profile_png(os.path.join(out, f'profil_bayern_{k}.png'), f"DGM1 Bayern: {r['name']} ({r['kind']}, {r['length_m']} m)",
                          ss, dem.sample(P[:, 0], P[:, 1]), P[:, 2])
    import json
    json.dump({'area_utm': area, 'metric_osm_axis': res, 'metric_fitted_axis': res2,
               'axis_shift_m': {'mean': round(float(sa.mean()), 2), 'p95': round(float(np.percentile(sa, 95)), 2)}},
              open(os.path.join(out, 'metrik_dgm1_bayern.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
