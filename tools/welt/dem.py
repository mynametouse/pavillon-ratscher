"""Height model of a block: a 1 m mosaic (DGM1 Thüringen where it can be had, Copernicus GLO-30 elsewhere and as the fallback),
its 2x2 mip pyramid for the coarser tile levels, and Copernicus beyond the mosaic for the context rings.
Heights are NHN metres (absolute). The roads step carves the 1 m mosaic before the mips are built."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log
from fetch import fetch_dgm1, read_dgm1, Cop30


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def bilinear(M, E, N, e0, n1, px):
    """pixel centres at (e0 + (c + .5) px, n1 - (r + .5) px); NaN outside"""
    E = np.asarray(E, float)
    N = np.asarray(N, float)
    c = (E - e0) / px - 0.5
    r = (n1 - N) / px - 0.5
    nr, nc = M.shape
    inside = (c >= -0.5) & (c <= nc - 0.5) & (r >= -0.5) & (r <= nr - 0.5)
    c0 = np.clip(np.floor(c).astype(int), 0, nc - 2)
    r0 = np.clip(np.floor(r).astype(int), 0, nr - 2)
    fc = np.clip(c - c0, 0, 1)
    fr = np.clip(r - r0, 0, 1)
    v = (M[r0, c0] * (1 - fc) * (1 - fr) + M[r0, c0 + 1] * fc * (1 - fr) + M[r0 + 1, c0] * (1 - fc) * fr + M[r0 + 1, c0 + 1] * fc * fr)
    return np.where(inside, v, np.nan)


class CopGround:
    """Copernicus GLO-30 with the forest canopy lowered (WorldCover tree mask x an offset fitted on the data itself: the high-pass
    of the surface regressed on the high-pass of the tree mask). Without WorldCover the plain surface model."""
    def __init__(self, raw, ctx, use_trees=True):
        self.cop = Cop30(raw, ctx)
        self.trees, self.canopy = None, 0.0
        if not use_trees:
            return
        try:
            from landcover import TreeMask
            self.trees = TreeMask(raw, ctx)
        except Exception as e:
            log('WorldCover nicht verfügbar – Copernicus ohne Kronenabzug:', repr(e)[:200])
            return
        from scipy import ndimage
        T = self.trees
        H, W = T.m.shape
        EE, NN = np.meshgrid(T.e0 + (np.arange(W) + 0.5) * T.res, T.n1 - (np.arange(H) + 0.5) * T.res)
        C = self.cop(EE, NN).astype(np.float64)
        M = T.m.astype(np.float64)
        hc = C - ndimage.gaussian_filter(C, 25)
        hm = M - ndimage.gaussian_filter(M, 25)
        k = float(np.sum(hc * hm) / max(np.sum(hm * hm), 1e-9))
        self.canopy = float(np.clip(k, 5.0, 30.0))
        log(f'Copernicus: Kronenhöhe aus den Daten geschätzt {k:.1f} m -> abgezogen {self.canopy:.1f} m unter Wald')

    def __call__(self, E, N):
        v = self.cop(E, N)
        if self.trees is not None:
            v = v - self.canopy * self.trees(np.asarray(E, float), np.asarray(N, float))
        return v


class Dem:
    def __init__(self, raw, area, ctx, use_dgm=True, blend=300.0, use_trees=True):
        self.cop = CopGround(raw, ctx, use_trees)
        e0, n0, e1, n1 = [float(v) for v in area]
        self.e0, self.n1, self.px = e0, n1, 1.0
        W, H = int(round(e1 - e0)), int(round(n1 - n0))
        log(f'DEM mosaic {W} x {H} m at 1 m')
        mos = np.full((H, W), np.nan, np.float32)
        have = np.zeros((H, W), bool)
        n_ok = n_try = 0
        if use_dgm:
            for ex in range(int(e0 // 1000), int(np.ceil(e1 / 1000))):
                for ny in range(int(n0 // 1000), int(np.ceil(n1 / 1000))):
                    n_try += 1
                    p = fetch_dgm1(raw, 'dgm', ex, ny)
                    if p is None:
                        continue
                    try:
                        a, te0, tn1, tpx = read_dgm1(p)
                    except Exception as ex_:
                        log('DGM1 unreadable', p, ex_)
                        continue
                    if abs(tpx - 1.0) > 1e-3:
                        log('DGM1 pixel size', tpx, 'skipped', p)
                        continue
                    r0, c0 = int(round(self.n1 - tn1)), int(round(te0 - self.e0))
                    rs, cs = max(0, -r0), max(0, -c0)
                    re, ce = min(a.shape[0], H - r0), min(a.shape[1], W - c0)
                    if re <= rs or ce <= cs:
                        continue
                    mos[r0 + rs:r0 + re, c0 + cs:c0 + ce] = a[rs:re, cs:ce]
                    n_ok += 1
            have = np.isfinite(mos)
        self.dgm_tiles = (n_ok, n_try)
        # Copernicus for the rest, row by row (bilinear at the 1 m pixel centres)
        cols = self.e0 + np.arange(W) + 0.5
        cop_off = 0.0
        if have.any():
            # offset Copernicus (surface model, EGM2008) -> DGM1 (bare earth, NHN): low quantile, forests stand above the ground
            rr, cc = np.nonzero(have[::25, ::25])
            hs = self.cop(cols[::25][cc], self.n1 - (rr * 25 + 0.5))
            d = hs - mos[::25, ::25][rr, cc]
            cop_off = float(np.nanpercentile(d, 30))
        self.cop_off = cop_off
        if not have.all():
            for r in range(0, H, 256):
                rows = np.arange(r, min(H, r + 256))
                EE, NN = np.meshgrid(cols, self.n1 - rows - 0.5)
                c = self.cop(EE, NN) - cop_off
                blk = mos[rows[0]:rows[-1] + 1]
                hv = have[rows[0]:rows[-1] + 1]
                blk[~hv] = c[~hv]
        if have.any() and not have.all():
            # soft edge: DGM1 fades into Copernicus over `blend` metres
            from scipy import ndimage
            dist = ndimage.distance_transform_edt(have).astype(np.float32)
            k = smoothstep(0, blend, dist)
            for r in range(0, H, 512):
                sl = slice(r, min(H, r + 512))
                rows = np.arange(sl.start, sl.stop)
                EE, NN = np.meshgrid(cols, self.n1 - rows - 0.5)
                c = self.cop(EE, NN) - cop_off
                mos[sl] = mos[sl] * k[sl] + c * (1 - k[sl])
        self.mos = mos
        self.source = 'dgm1' if have.all() else ('cop30' if not have.any() else 'dgm1+cop30')
        self.dgm_share = float(have.mean())
        log(f'DEM source {self.source}: DGM1 tiles {n_ok}/{n_try}, share {self.dgm_share:.2f}, Copernicus offset {cop_off:.2f} m,'
            f' heights {np.nanmin(mos):.1f} .. {np.nanmax(mos):.1f}')
        self.mips = None

    @property
    def area(self):
        H, W = self.mos.shape
        return (self.e0, self.n1 - H, self.e0 + W, self.n1)

    def sample(self, E, N):
        """bilinear heights from the 1 m mosaic, Copernicus outside"""
        v = bilinear(self.mos, E, N, self.e0, self.n1, 1.0)
        bad = ~np.isfinite(v)
        if bad.any():
            v = np.where(bad, self.cop(np.asarray(E, float), np.asarray(N, float)) - self.cop_off, v)
        return v

    def build_mips(self, levels=8):
        """2x2 means: mip k has 2**k m pixels (after the roads carved the 1 m mosaic)"""
        self.mips = [self.mos]
        m = self.mos
        for k in range(1, levels + 1):
            h, w = (m.shape[0] // 2) * 2, (m.shape[1] // 2) * 2
            if h < 4 or w < 4:
                break
            m = m[:h, :w].reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3)).astype(np.float32)
            self.mips.append(m)

    def grid(self, e0, n0, step, n):
        """n x n heights at (e0 + i step, n0 + j step), j north (row 0 = south). The mip whose pixel matches the step is
        sampled where the mosaic is, Copernicus (minus the offset) elsewhere."""
        xs = e0 + np.arange(n) * step
        ys = n0 + np.arange(n) * step
        EE, NN = np.meshgrid(xs, ys)
        k = int(np.clip(np.round(np.log2(max(step, 1.0))), 0, len(self.mips) - 1))
        px = float(2 ** k)
        v = bilinear(self.mips[k], EE, NN, self.e0, self.n1, px)
        # near the mosaic border the coarse mips are not defined: fill from Copernicus
        bad = ~np.isfinite(v)
        if bad.any():
            v[bad] = self.cop(EE[bad], NN[bad]) - self.cop_off
        return v.astype(np.float32)
