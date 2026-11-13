"""suhl-strassen: where the heights of the road profiles come from – dem.sample(E, N) -> NHN (m), as tools/welt/roads.py expects.

Order of the sources (best first), per point:
  1. the ground tiles of suhl-boden (suhl/boden/v<N>/t/<L>/<x>/<y>.bin, format WTH1 of tools/welt/tiles.py; finest level that holds the
     point) – so that the roads lie on the ground the app draws, and on DGM1 as soon as suhl-boden has it;
  2. Copernicus GLO-30 with the forest lowered (tools/welt/dem.py CopGround, unchanged) – the terrain available on 13.11.2026.
The profile step is repeatable: a later run with better tiles replaces the heights, nothing is edited by hand.
Copernicus DEM © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and
ESA; WorldCover 2021 © ESA (CC BY 4.0); DGM1 © GDI-Th (CC BY 4.0).
"""
import os, struct, sys, zlib
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sslib as S


def decode_wth1(b):
    """a terrain tile of tools/welt/tiles.py (as viz3/extra/fahrt/strecke.py decode): n x n heights above H0, row 0 = south edge"""
    magic, n, flags, base, hmin, hmax = struct.unpack('<4sHHiff', b[:20])
    raw = zlib.decompress(b[20:])
    if flags & 1:
        r = np.frombuffer(raw, '<i4').reshape(n, n).astype(np.int64)
    else:
        lo = np.frombuffer(raw[:n * n], np.uint8).astype(np.int64)
        hi = np.frombuffer(raw[n * n:], np.uint8).astype(np.int64)
        zz = lo | (hi << 8)
        r = ((zz >> 1) ^ -(zz & 1)).reshape(n, n)
    q = np.zeros((n, n), np.int64)
    q[0, 0] = base
    q[0, 1:] = base + np.cumsum(r[0, 1:])
    q[1:, 0] = base + np.cumsum(r[1:, 0])
    for j in range(1, n):
        q[j, 1:] = q[j, 0] + np.cumsum(r[j, 1:] + q[j - 1, 1:] - q[j - 1, :-1])
    return (q / 100.0).astype(np.float32)


class Tiles:
    """heights from a folder of ground tiles <dir>/<L>/<x>/<y>.bin (the t/ folder of suhl-boden), finest level first; NaN where none"""

    def __init__(self, folder, levels=(12, 11, 10, 9, 8, 7, 6)):
        self.dir = folder
        self.have = {}
        # what the set says about itself (suhl-boden writes meta.json beside t/): which terrain, when, from which commit
        self.meta = {}
        mp = os.path.join(os.path.dirname(os.path.abspath(folder)), 'meta.json')
        if os.path.exists(mp):
            import json
            try:
                self.meta = json.load(open(mp, encoding='utf-8'))
            except Exception as e:
                S.log('meta.json of the ground tiles not read:', repr(e)[:120])
        for L in levels:
            d = os.path.join(folder, str(L))
            if not os.path.isdir(d):
                continue
            for xs in os.listdir(d):
                if xs.isdigit():
                    for fn in os.listdir(os.path.join(d, xs)):
                        if fn.endswith('.bin'):
                            self.have[(L, int(xs), int(fn[:-4]))] = None
        self.levels = [L for L in levels if any(k[0] == L for k in self.have)]
        self.n = 0
        S.log('ground tiles', folder, {L: sum(1 for k in self.have if k[0] == L) for L in self.levels})

    def _tile(self, k):
        h = self.have[k]
        if h is None:
            L, x, y = k
            h = self.have[k] = decode_wth1(open(os.path.join(self.dir, str(L), str(x), f'{y}.bin'), 'rb').read())
        return h

    def sample(self, E, N):
        E = np.asarray(E, float).ravel()
        N = np.asarray(N, float).ravel()
        out = np.full(len(E), np.nan)
        todo = np.ones(len(E), bool)
        for L in self.levels:
            if not todo.any():
                break
            s = S.ROOT / (1 << L)
            tx = np.floor((E - S.ROOT_E0) / s).astype(int)
            ty = np.floor((N - S.ROOT_N0) / s).astype(int)
            idx = np.nonzero(todo)[0]
            for key in {(int(a), int(b)) for a, b in zip(tx[idx], ty[idx])}:
                if (L, key[0], key[1]) not in self.have:
                    continue
                m = idx[(tx[idx] == key[0]) & (ty[idx] == key[1])]
                h = self._tile((L, key[0], key[1]))
                n = h.shape[0]
                fu = (E[m] - S.ROOT_E0 - key[0] * s) / s * (n - 1)
                fv = (N[m] - S.ROOT_N0 - key[1] * s) / s * (n - 1)
                i0 = np.clip(np.floor(fu).astype(int), 0, n - 2)
                j0 = np.clip(np.floor(fv).astype(int), 0, n - 2)
                u = np.clip(fu - i0, 0, 1)
                v = np.clip(fv - j0, 0, 1)
                out[m] = (h[j0, i0] * (1 - u) + h[j0, i0 + 1] * u) * (1 - v) + (h[j0 + 1, i0] * (1 - u) + h[j0 + 1, i0 + 1] * u) * v
                todo[m] = False
        self.n += int((~todo).sum())
        return out + S.H0


class Heights:
    """the sources in their order; counts how many samples came from where (reported with every result)"""

    def __init__(self, raw, box, tiles=None, trees=True):
        self.tiles = Tiles(tiles) if tiles and os.path.isdir(tiles) else None
        from dem import CopGround   # tools/welt/dem.py
        ctx = (box[0] - 500, box[1] - 500, box[2] + 500, box[3] + 500)
        # rasterio reads WorldCover through GDAL's curl: it needs the proxy's CA bundle where there is one (the chat machine)
        ca = os.environ.get('CURL_CA_BUNDLE') or os.environ.get('SSL_CERT_FILE')
        if ca and 'GDAL_CURL_CA_BUNDLE' not in os.environ:
            os.environ['GDAL_CURL_CA_BUNDLE'] = ca
        px = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
        if px and 'GDAL_HTTP_PROXY' not in os.environ:
            os.environ['GDAL_HTTP_PROXY'] = px
        self.cop = CopGround(raw, ctx, trees)
        # one ground for everybody: where a point lies beyond the ground tiles (the 400 m of context around the run's tiles), the
        # own Copernicus sampling lowers the forest by the amount the tile set used, not by its own fit (5.0 m against 9.3 m gave
        # steps of 4 m under trees)
        cm = ((self.tiles.meta or {}).get('sources') or {}).get('canopy_m') if self.tiles is not None else None
        if cm is not None and self.cop.trees is not None:
            S.log(f'forest lowered as in the ground tiles: {float(cm):.2f} m (own fit {self.cop.canopy:.1f} m)')
            self.cop.canopy = float(cm)
        self.canopy = float(self.cop.canopy)
        # … and is shifted by the offset the tile set gave Copernicus to meet its 1 m terrain
        self.cop_off = float((((self.tiles.meta or {}).get('sources') or {}).get('copernicus_offset_m') or 0.0) if self.tiles is not None else 0.0)
        self.n_tile = self.n_cop = 0

    def sample(self, E, N):
        E = np.asarray(E, float).ravel()
        N = np.asarray(N, float).ravel()
        out = self.tiles.sample(E, N) if self.tiles is not None else np.full(len(E), np.nan)
        bad = ~np.isfinite(out)
        if bad.any():
            out[bad] = self.cop(E[bad], N[bad]) + self.cop_off
        self.n_tile += int((~bad).sum())
        self.n_cop += int(bad.sum())
        return out

    def info(self):
        d = {'tiles': self.n_tile, 'copernicus': self.n_cop, 'tile_dir': self.tiles.dir if self.tiles else None,
             'copernicus_canopy_m': round(self.canopy, 1),
             'note': 'samples per source: tiles = the uncut ground tiles of suhl-boden (the one ground of all Suhl packages); copernicus = own '
                     'sampling of Copernicus GLO-30 with the forest lowered (tools/welt/dem.py CopGround) where no tile holds the point'}
        if self.tiles is not None and self.tiles.meta:
            m = self.tiles.meta
            src = m.get('sources', {})
            d['ground'] = {'generated': m.get('generated'), 'commit': m.get('commit'), 'plan': m.get('plan'), 'terrain': src.get('terrain'),
                           'terrain_source': src.get('terrain_source'), 'canopy_m': src.get('canopy_m'),
                           'copernicus_offset_m': src.get('copernicus_offset_m'), 'dgm1_level10_tiles': src.get('dgm1_level10_tiles'),
                           'dgm1_tiles_km': src.get('dgm1_tiles_km'), 'dgm1_via': (src.get('dgm1') or {}).get('via'),
                           'dgm1_have': (src.get('dgm1') or {}).get('have'), 'note': m.get('note')}
        return d

    def dgm1_share(self, T):
        """the share of 1 m terrain under the level-10 tiles T of the run, as the tile set states it (0 when it does not say)"""
        src = ((self.tiles.meta or {}).get('sources') or {}) if self.tiles is not None else {}
        sh = src.get('dgm1_share_level10')
        if isinstance(sh, dict) and T:
            return float(sum(sh.get(f'{x}/{y}', 0.0) for x, y in T) / len(T))
        n = src.get('dgm1_level10_tiles')
        return float(min(1.0, n / len(T))) if n and T else 0.0

    def coarse(self, T):
        """True while the heights are a 30 m surface model (own Copernicus sampling, or ground tiles without 1 m terrain under most
        of the run's tiles T)"""
        if self.tiles is None or self.n_cop > self.n_tile:
            return True
        return self.dgm1_share(T) < 0.5
