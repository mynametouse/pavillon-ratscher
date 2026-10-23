"""Terrain and imagery tiles of the quadtree (see wlib.py for the tiling).

Terrain tile t/{L}/{x}/{y}.bin – 101 x 101 heights, little endian:
  0  'WTH1'           magic
  4  uint16 n         samples per side (101)
  6  uint16 flags     bit 0: residuals are int32 (else zigzag uint16 split in a low-byte and a high-byte plane)
  8  int32  base      height of sample (0, 0) in cm relative to H0 (meta.json)
  12 float32 hmin     lowest height in the tile, m relative to H0
  16 float32 hmax     highest
  20 zlib stream (RFC 1950, DecompressionStream('deflate') in the browser) of the residuals of the 2-D Lorenzo predictor
     r[j][i] = q[j][i] - q[j-1][i] - q[j][i-1] + q[j-1][i-1] (first row / column: 1-D differences, r[0][0] = 0),
     q = heights in cm relative to H0, row j = 0 at the SOUTH edge, i east.
Imagery tile i/{L}/{x}/{y}.webp – 512 x 512, row 0 = north edge, pixel areas (u = (E - E0) / s, v = (N - N0) / s).
"""
import os, sys, struct, zlib
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log, tbounds, tsize, tiles, TILE_PX, TERR_N, H0

Image.MAX_IMAGE_PIXELS = None


def encode_heights(h):
    q = np.round((np.asarray(h, np.float64) - H0) * 100).astype(np.int64)
    r = np.zeros_like(q)
    r[0, 1:] = q[0, 1:] - q[0, :-1]
    r[1:, 0] = q[1:, 0] - q[:-1, 0]
    r[1:, 1:] = q[1:, 1:] - q[:-1, 1:] - q[1:, :-1] + q[:-1, :-1]
    zz = (r << 1) ^ (r >> 63)
    flags = 0
    if zz.max() < 65536:
        z16 = zz.astype(np.uint16)
        payload = (z16 & 255).astype(np.uint8).tobytes() + (z16 >> 8).astype(np.uint8).tobytes()
    else:
        flags = 1
        payload = r.astype('<i4').tobytes()
    hd = struct.pack('<4sHHiff', b'WTH1', q.shape[0], flags, int(q[0, 0]), float(q.min()) / 100, float(q.max()) / 100)
    return hd + zlib.compress(payload, 9)


def decode_heights(b):
    """inverse of encode_heights (tests) -> heights relative to H0 in m, row 0 = south"""
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
    for j in range(1, n):   # q[j][i] = q[j][i-1] + (r[j][i] + q[j-1][i] - q[j-1][i-1])
        q[j, 1:] = q[j, 0] + np.cumsum(r[j, 1:] + q[j - 1, 1:] - q[j - 1, :-1])
    return q / 100.0


def terrain_level(dem, L, area, out):
    n = 0
    tot = 0
    hmin, hmax = 1e9, -1e9
    s = tsize(L)
    step = s / (TERR_N - 1)
    for x, y in tiles(L, area):
        e0, n0, _, _ = tbounds(L, x, y)
        g = dem.grid(e0, n0, step, TERR_N)
        b = encode_heights(g)
        d = os.path.join(out, 't', str(L), str(x))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, f'{y}.bin'), 'wb').write(b)
        n += 1
        tot += len(b)
        hmin, hmax = min(hmin, float(g.min())), max(hmax, float(g.max()))
    log(f'Gelände Stufe {L}: {n} Kacheln, {tot / 1e6:.1f} MB, Höhen {hmin:.1f} .. {hmax:.1f}')
    return n, tot, hmin, hmax


# ---------------- imagery ----------------
def _save_webp(args):
    arr, path, q = args
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr).save(path, 'WEBP', quality=q, method=4)
    return os.path.getsize(path)


IDT_Q = np.linspace(0.5, 99.5, 41)


def _map1d(x, qs, qt):
    """piecewise linear through the quantile pairs, slope 1 beyond the ends (rare colours keep their distance)"""
    y = np.interp(x, qs, qt)
    y = np.where(x < qs[0], qt[0] + (x - qs[0]), y)
    return np.where(x > qs[-1], qt[-1] + (x - qs[-1]), y)


def colour_transfer(src, tgt, iters=10, seed=1):
    """3-D colour transfer (iterative distribution transfer, Pitie et al. 2005): src colours (n, 3) are moved until their joint
    distribution matches tgt (m, 3) - in turn along the R, G, B axes and along random rotations of them, each time by matching
    the quantiles. Returns a 64^3 table of colour shifts (int16, index (r >> 2) * 4096 + (g >> 2) * 64 + (b >> 2)); a shift
    rather than the colour keeps the two low bits of every channel."""
    rng = np.random.default_rng(seed)
    steps, x, t = [], src.astype(np.float64), tgt.astype(np.float64)
    for k in range(iters):
        R = np.linalg.qr(rng.normal(size=(3, 3)))[0] if k else np.eye(3)
        xs, ts = x @ R.T, t @ R.T
        maps = []
        for ax in range(3):
            qs, qt = np.percentile(xs[:, ax], IDT_Q), np.percentile(ts[:, ax], IDT_Q)
            qs_u, inv = np.unique(np.round(qs, 3), return_inverse=True)
            qt_u = np.maximum.accumulate(np.bincount(inv, qt) / np.bincount(inv))
            maps.append((qs_u, qt_u))
            xs[:, ax] = _map1d(xs[:, ax], qs_u, qt_u)
        x = xs @ R
        steps.append((R, maps))
    g = np.arange(64) * 4 + 1.5
    c = np.stack(np.meshgrid(g, g, g, indexing='ij'), -1).reshape(-1, 3)
    y = c.copy()
    for R, maps in steps:
        ys = y @ R.T
        for ax in range(3):
            ys[:, ax] = _map1d(ys[:, ax], *maps[ax])
        y = ys @ R
    return np.clip(np.round(y - c), -127, 127).astype(np.int16)


def shift_colours(table, img):
    """apply a colour_transfer table to uint8 colours (..., 3)"""
    i = (img[..., 0].astype(np.int32) >> 2) * 4096 + (img[..., 1].astype(np.int32) >> 2) * 64 + (img[..., 2].astype(np.int32) >> 2)
    return np.clip(img.astype(np.int16) + table[i], 0, 255).astype(np.uint8)


class Harmonizer:
    """colour balance of the orthophoto mosaic. The Thuringian DOP service joins flights of different days along 1 km lines
    (around the garden: 7 April 2024, 15 May 2024 north of N = 5597 km, 12 May 2025 east of E = 632 km; the April flight is
    lighter, hazier and more cyan, the May flights darker and yellow-green). Tiles of one flight day share their radiometry, so
    each flight block (dates from the DOP metadata, fetch.flight_dates) gets one 3-D colour transfer. Starting from the garden's
    block, the next block (most shared boundary first) is matched to the blocks done so far, with the pixels facing each other a
    few metres either side of the common km lines, pooled over the whole boundary (fields, forests and water continue across a
    line, so both sides see the same ground). Solved once on the coarse context mosaic, applied to every chunk of every level.
    What stays is real: crops grew between April and May. (Tried first: gains per 1 km cell from strip means - they mistook
    forest against field for a step; then one tone curve per channel and flight - brightness matched, the hue did not.)"""
    def __init__(self, img, bbox, dates, band=4, anchor=None):
        e0, n0, e1, n1 = bbox
        H, W = img.shape[:2]
        p = (e1 - e0) / W
        self.ce0, self.cn0 = int(np.floor(e0 / 1000)), int(np.floor(n0 / 1000))
        nE, nN = int(np.ceil(e1 / 1000)) - self.ce0, int(np.ceil(n1 / 1000)) - self.cn0
        self.nE, self.nN = nE, nN
        self.names = sorted({v for v in (dates or {}).values() if v})
        nb = len(self.names)
        lab = np.full((nN, nE), nb, int)       # index nb: unknown (outside Thuringia, no metadata) -> unchanged
        for j in range(nN):
            for i in range(nE):
                v = (dates or {}).get(f'{self.ce0 + i}_{self.cn0 + j}')
                if v:
                    lab[j, i] = self.names.index(v)
        self.lab = lab
        valid = (img.min(axis=2) > 6) & (img.max(axis=2) < 248)   # no-data (white/black) outside the state
        d = np.arange(1, band + 1)      # pixel 0 on either side is skipped (resampling and JPEG blur the line itself)
        pool = {}                       # (block x, block y) -> list of (colours on x's side (k, 3), facing colours on y's side)

        def add(lx, ly, xa, xb, va, vb):
            if lx == ly or lx == nb or ly == nb:
                return
            ok = va & vb
            if ok.sum() < 16:
                return
            pool.setdefault((lx, ly), []).append((xa[ok], xb[ok]))
            pool.setdefault((ly, lx), []).append((xb[ok], xa[ok]))
        for i in range(1, nE):          # vertical km lines x = 1000 (ce0 + i): cell i - 1 west, cell i east
            c = int(round((1000.0 * (self.ce0 + i) - e0) / p))       # first pixel column east of the line
            cw, ce = c - 1 - d, c + d
            if cw.min() < 0 or ce.max() >= W:
                continue
            for j in range(nN):
                r0 = max(int(round((n1 - 1000.0 * (self.cn0 + j + 1)) / p)), 0)
                r1 = min(int(round((n1 - 1000.0 * (self.cn0 + j)) / p)), H)
                if r1 - r0 >= 4:
                    add(lab[j, i - 1], lab[j, i], img[r0:r1][:, cw], img[r0:r1][:, ce], valid[r0:r1][:, cw], valid[r0:r1][:, ce])
        for j in range(1, nN):          # horizontal km lines y = 1000 (cn0 + j): cell j north, cell j - 1 south
            r = int(round((n1 - 1000.0 * (self.cn0 + j)) / p))       # first pixel row south of the line
            rn, rs = r - 1 - d, r + d
            if rn.min() < 0 or rs.max() >= H:
                continue
            for i in range(nE):
                c0 = max(int(round((1000.0 * (self.ce0 + i) - e0) / p)), 0)
                c1 = min(int(round((1000.0 * (self.ce0 + i + 1) - e0) / p)), W)
                if c1 - c0 >= 4:
                    add(lab[j, i], lab[j - 1, i], img[rn][:, c0:c1], img[rs][:, c0:c1], valid[rn][:, c0:c1], valid[rs][:, c0:c1])
        self.table = [None] * (nb + 1)  # colour shifts per block; None = unchanged
        look = lambda b, v: v if self.table[b] is None else shift_colours(self.table[b], v)
        # the reference: the garden's flight block (else the largest)
        start = None
        if anchor is not None:
            ai, aj = int(np.floor(anchor[0] / 1000)) - self.ce0, int(np.floor(anchor[1] / 1000)) - self.cn0
            if 0 <= ai < nE and 0 <= aj < nN and lab[aj, ai] < nb:
                start = int(lab[aj, ai])
        if start is None and nb:
            start = int(np.bincount(lab[lab < nb].ravel(), minlength=nb).argmax())
        done = {start} if start is not None else set()
        while True:
            cand = {}
            for (x, y), lst in pool.items():
                if x in done and y not in done:
                    cand[y] = cand.get(y, 0) + sum(len(A) for A, _ in lst)
            if not cand:
                break
            y = max(cand, key=cand.get)
            src = np.concatenate([B for (x, yy), lst in pool.items() if yy == y and x in done for _, B in lst])
            tgt = np.concatenate([look(x, A) for (x, yy), lst in pool.items() if yy == y and x in done for A, _ in lst])
            self.table[y] = colour_transfer(src, tgt)
            done.add(y)
        # the step across each boundary (median difference of the facing pixels, grey levels, worst channel) before and after
        spread = lambda v: np.subtract(*np.percentile(v.astype(float), [90, 10], axis=0))
        self.stats = {'cells_km': [nE, nN], 'flights': {nm: int((lab == k).sum()) for k, nm in enumerate(self.names)},
                      'reference': self.names[start] if start is not None else None, 'boundaries': {}}
        for (x, y), lst in pool.items():
            if x < y:
                A = np.concatenate([a for a, _ in lst])
                B = np.concatenate([b for _, b in lst])
                A2, B2 = look(x, A).astype(float), look(y, B).astype(float)
                self.stats['boundaries'][f'{self.names[x]}|{self.names[y]}'] = {
                    'pairs': len(A), 'step_before': round(float(np.abs(np.median(B.astype(float) - A, axis=0)).max()), 1),
                    'step_after': round(float(np.abs(np.median(B2 - A2, axis=0)).max()), 1),
                    'contrast_before': round(float(np.median(spread(B) / np.maximum(spread(A), 1))), 2),
                    'contrast_after': round(float(np.median(spread(B2) / np.maximum(spread(A2), 1))), 2)}
        log('Farbausgleich der Bildflüge: ' + (', '.join(f'{k} ({v} km²)' for k, v in self.stats['flights'].items()) or 'keine Bildflugdaten')
            + f"; Bezug {self.stats['reference']}; " + '; '.join(f"{k}: Stufe {v['step_before']} -> {v['step_after']} Grauwerte, "
                                                               f"Kontrast {v['contrast_before']} -> {v['contrast_after']}"
                                                               for k, v in self.stats['boundaries'].items()))

    def apply(self, img, bbox):
        """the colour transfer of each cell's flight block on its part of the image (bbox of the image, row 0 = north)"""
        e0, n0, e1, n1 = bbox
        H, W = img.shape[:2]
        p = (e1 - e0) / W
        ci = np.clip(np.floor((e0 + (np.arange(W) + 0.5) * p) / 1000).astype(int) - self.ce0, 0, self.nE - 1)
        rj = np.clip(np.floor((n1 - (np.arange(H) + 0.5) * p) / 1000).astype(int) - self.cn0, 0, self.nN - 1)
        runs = lambda v: zip(np.r_[0, np.flatnonzero(np.diff(v)) + 1], np.r_[np.flatnonzero(np.diff(v)) + 1, len(v)])
        out = img.copy()
        for r0, r1 in runs(rj):
            for c0, c1 in runs(ci):
                t = self.table[self.lab[rj[r0], ci[c0]]]
                if t is not None:
                    out[r0:r1, c0:c1] = shift_colours(t, img[r0:r1, c0:c1])
        return out


def wms_mosaic(raw, L, area, chunk_level, layer='th_dop'):
    """the WMS chunks of level L over an area joined into one image (row 0 = north) -> (image, bbox)"""
    from fetch import fetch_wms
    k = 1 << (L - chunk_level)
    px = TILE_PX * k
    ch = tiles(chunk_level, area)
    xs, ys = sorted({c[0] for c in ch}), sorted({c[1] for c in ch})
    img = np.zeros((len(ys) * px, len(xs) * px, 3), np.uint8)
    for cx, cy in ch:
        a = fetch_wms(raw, layer, tbounds(chunk_level, cx, cy), px, px)
        r0 = (ys[-1] - cy) * px
        c0 = (cx - xs[0]) * px
        img[r0:r0 + px, c0:c0 + px] = a
    bb = tbounds(chunk_level, xs[0], ys[0])[:2] + tbounds(chunk_level, xs[-1], ys[-1])[2:]
    return img, bb


class ImagePyramid:
    """collects 512 px tiles of one level from big WMS chunks, then builds the coarser levels by 2x2 reduction"""
    def __init__(self, out, quality=74, pool=None, harm=None):
        self.out, self.q, self.pool, self.harm = out, quality, pool, harm
        self.bytes = {}
        self.count = {}

    def path(self, L, x, y):
        return os.path.join(self.out, 'i', str(L), str(x), f'{y}.webp')

    def write(self, jobs):
        sizes = list(self.pool.map(_save_webp, jobs, chunksize=8)) if self.pool else [_save_webp(j) for j in jobs]
        for (arr, p, q), sz in zip(jobs, sizes):
            L = int(p.split(os.sep)[-3])
            self.bytes[L] = self.bytes.get(L, 0) + sz
            self.count[L] = self.count.get(L, 0) + 1

    def from_wms(self, raw, L, area, layer='th_dop', chunk_level=None):
        """fetch level L over the area in chunks of one tile of chunk_level (default L - 3: 8 x 8 tiles = 4096 px per request)"""
        from fetch import fetch_wms
        cl = chunk_level if chunk_level is not None else L - 3
        k = 1 << (L - cl)
        px = TILE_PX * k
        chunks = tiles(cl, area)
        # download the chunks three at a time first (the server takes ~20 s per 4096 px image), cut them afterwards
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(3) as ex:
            list(ex.map(lambda c: fetch_wms(raw, layer, tbounds(cl, *c), px, px, decode=False), chunks))
        for cx, cy in chunks:
            bb = tbounds(cl, cx, cy)
            img = fetch_wms(raw, layer, bb, px, px)
            if self.harm is not None:
                img = self.harm.apply(img, bb)
            jobs = []
            x0, y0 = cx * k, cy * k
            for j in range(k):            # j north: image row 0 = north edge
                for i in range(k):
                    x, y = x0 + i, y0 + j
                    e0, n0, e1, n1 = tbounds(L, x, y)
                    if e1 <= area[0] or e0 >= area[2] or n1 <= area[1] or n0 >= area[3]:
                        continue
                    r0 = (k - 1 - j) * TILE_PX
                    jobs.append((np.ascontiguousarray(img[r0:r0 + TILE_PX, i * TILE_PX:(i + 1) * TILE_PX]), self.path(L, x, y), self.q))
            self.write(jobs)
        log(f'Luftbild Stufe {L}: {self.count.get(L, 0)} Kacheln, {self.bytes.get(L, 0) / 1e6:.1f} MB')

    def reduce(self, L, area):
        """level L from level L + 1 (2x2 children -> 1024 px -> 512 px box filter); missing children are left grey"""
        jobs = []
        for x, y in tiles(L, area):
            big = np.full((2 * TILE_PX, 2 * TILE_PX, 3), 128, np.uint8)
            any_ = False
            for dj in (0, 1):
                for di in (0, 1):
                    p = self.path(L + 1, 2 * x + di, 2 * y + dj)
                    if os.path.exists(p):
                        r0 = (1 - dj) * TILE_PX
                        big[r0:r0 + TILE_PX, di * TILE_PX:(di + 1) * TILE_PX] = np.asarray(Image.open(p).convert('RGB'))
                        any_ = True
            if not any_:
                continue
            arr = np.asarray(Image.fromarray(big).reduce(2))
            jobs.append((arr, self.path(L, x, y), self.q))
            if len(jobs) >= 64:
                self.write(jobs)
                jobs = []
        self.write(jobs)
        log(f'Luftbild Stufe {L}: {self.count.get(L, 0)} Kacheln, {self.bytes.get(L, 0) / 1e6:.1f} MB')
