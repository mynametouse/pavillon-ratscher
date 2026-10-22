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
import io, os, sys, struct, zlib
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log, tbounds, tsize, tiles, trange, aligned, TILE_PX, TERR_N, H0

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


class ImagePyramid:
    """collects 512 px tiles of one level from big WMS chunks, then builds the coarser levels by 2x2 reduction"""
    def __init__(self, out, quality=74, pool=None):
        self.out, self.q, self.pool = out, quality, pool
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
        for cx, cy in tiles(cl, area):
            bb = tbounds(cl, cx, cy)
            img = fetch_wms(raw, layer, bb, px, px)
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
