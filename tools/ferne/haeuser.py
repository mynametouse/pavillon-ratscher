#!/usr/bin/env python3
"""feat/ferne: the houses of the world as far blocks – one small record per building (dist/ferne/haeuser.bin).

Run by viz3/build.py after the extras are copied into dist/ (so the cells of viz3/extra/welt-gebaeude and Schleusingen's old town of
viz3/extra/schleusingen are there): python3 tools/ferne/haeuser.py <dist>. Reads dist/gebaeude/z/<i>_<j>.json (the ETHOS cells of
gebaeude/gebaeude.js, 400 m) and dist/schleusingen/stadt.json (welt/schleusingen.js), writes one record of 16 bytes per building that
is worth seeing from far away (sheds and garages under 60 m² and 4 m are left out):

  header   'FRN1', uint32 blocks, then per block: int16 I, int16 J (block of 1600 m: x = I * 1600), uint32 first record, uint32 count
  record   uint16 x, y   centre, 0.025 m from the block's corner
           uint16 L, W   length (along the ridge or the long side) and width, cm – the oriented rectangle round the footprint, shrunk
                         to the footprint's area (an L-shaped house is not drawn as its whole bounding box)
           uint8  a      direction of L, 0–180° in 256 steps (0 = east, counter-clockwise)
           uint8  e, h   eave and top above the ground, 0.25 m
           uint8  f      kind (bits 0–2: 0 house, 1 barn or hall, 2 shed or garage, 4 tank, 5 tower) | form << 3 (0 flat, 1 gable,
                         2 hipped, 3 mono-pitch) | 64 for Schleusingen's old town
           uint8  r, g, b roof colour (sRGB, from the 2024 orthophoto)
           uint8  c      the 400 m cell in the block (i - 4 I) + 4 (j - 4 J); 255: Schleusingen's old town (hidden with its zone)

Little-endian. Pure Python (no numpy): the build runs it on CI and on the chat machine.
"""
import glob, json, math, os, struct, sys

BLOCK = 1600.0
CELL = 400.0


def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def area(pts):
    s = 0.0
    for k in range(len(pts)):
        x0, y0 = pts[k]
        x1, y1 = pts[(k + 1) % len(pts)]
        s += x0 * y1 - x1 * y0
    return abs(s) / 2


def extents(pts, ang):
    c, s = math.cos(ang), math.sin(ang)
    us = [x * c + y * s for x, y in pts]
    vs = [-x * s + y * c for x, y in pts]
    return min(us), max(us), min(vs), max(vs)


def rect(pts, ridge=None):
    """The smallest rectangle round pts (over the hull's edge directions), or the one along the ridge's direction when given.
    Returns centre, length along the angle, width across it, angle."""
    h = hull(pts)
    if len(h) < 3:
        return None
    if ridge is None:
        best = None
        for k in range(len(h)):
            dx, dy = h[(k + 1) % len(h)][0] - h[k][0], h[(k + 1) % len(h)][1] - h[k][1]
            if dx * dx + dy * dy < 1e-6:
                continue
            a = math.atan2(dy, dx)
            u0, u1, v0, v1 = extents(h, a)
            A = (u1 - u0) * (v1 - v0)
            if best is None or A < best[0]:
                best = (A, a, u0, u1, v0, v1)
        _, a, u0, u1, v0, v1 = best
        if v1 - v0 > u1 - u0:   # the long side first
            a += math.pi / 2
            u0, u1, v0, v1 = extents(h, a)
    else:
        a = ridge
        u0, u1, v0, v1 = extents(h, a)
    c, s = math.cos(a), math.sin(a)
    uc, vc = (u0 + u1) / 2, (v0 + v1) / 2
    return uc * c - vc * s, uc * s + vc * c, u1 - u0, v1 - v0, a


def ridge_dir(rv, top):
    """The direction between the two farthest roof vertices at the top (a ridge), None for a point or none."""
    P = [(rv[k], rv[k + 1]) for k in range(0, len(rv) - 2, 3) if rv[k + 2] > top - 0.06]
    best, bd = None, 1.0
    for i in range(len(P)):
        for j in range(i + 1, len(P)):
            d = math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1])
            if d > bd:
                bd, best = d, math.atan2(P[j][1] - P[i][1], P[j][0] - P[i][0])
    return best


def record(b, schl):
    f = b.get('f') or []
    pts = [(f[k], f[k + 1]) for k in range(0, len(f) - 1, 2)]
    if len(pts) < 3:
        return None
    A = area(pts)
    kind = int(b.get('k', 0))
    e = float(b.get('e', 3.0))
    rv = b.get('rv') or []
    hv = b.get('h')
    top = max([rv[k + 2] for k in range(0, len(rv) - 2, 3)] + [float(hv) if isinstance(hv, (int, float)) else 0.0, e])
    if kind == 2 and A < 60 and top < 4.0:
        return None   # a garage or garden shed: a pixel at 700 m
    form = b.get('r')
    if form is None:   # Schleusingen: from the roof's faces
        form = 0 if top - e < 0.4 else 2
    form = int(form)
    rd = ridge_dir(rv, top) if form in (2, 3) else None
    if form == 3 and rd is None:
        form = 2
    rf = rect(pts, rd)
    if rf is None:
        return None
    cx, cy, L, W, a = rf
    if L <= 0.2 or W <= 0.2:
        return None
    k = math.sqrt(min(1.0, A / (L * W)))
    L, W = L * max(0.75, k), W * max(0.75, k)
    a %= math.pi
    fm = {0: 0, 1: 3, 2: 1, 3: 2}.get(form, 0)
    rc = b.get('rc') or [0.5, 0.3, 0.25]
    return (cx, cy, L, W, a, e, top, (kind & 7) | (fm << 3) | (64 if schl else 0), [max(0, min(255, round(v * 255))) for v in rc[:3]])


def main(D):
    out = os.path.join(D, 'ferne', 'haeuser.bin')
    blocks = {}
    n_in = n_out = 0
    for fn in sorted(glob.glob(os.path.join(D, 'gebaeude', 'z', '*_*.json'))):
        key = os.path.basename(fn)[:-5]
        try:
            i, j = (int(v) for v in key.split('_'))
        except ValueError:
            continue
        I, J = i // 4, j // 4
        c = (i - 4 * I) + 4 * (j - 4 * J)
        for b in json.load(open(fn)).get('b', []):
            n_in += 1
            r = record(b, False)
            if r:
                blocks.setdefault((I, J), []).append((r, c))
    sj = os.path.join(D, 'schleusingen', 'stadt.json')
    if os.path.exists(sj):
        for b in json.load(open(sj)).get('b', []):
            n_in += 1
            r = record(b, True)
            if r:
                I, J = math.floor(r[0] / BLOCK), math.floor(r[1] / BLOCK)
                blocks.setdefault((I, J), []).append((r, 255))
    keys = sorted(blocks)
    head = bytearray(b'FRN1' + struct.pack('<I', len(keys)))
    body = bytearray()
    first = 0
    for (I, J) in keys:
        recs = blocks[(I, J)]
        head += struct.pack('<hhII', I, J, first, len(recs))
        for (cx, cy, L, W, a, e, top, fl, rc), c in recs:
            ux = round((cx - I * BLOCK) / 0.025)
            uy = round((cy - J * BLOCK) / 0.025)
            if not (0 <= ux <= 65535 and 0 <= uy <= 65535):
                continue
            body += struct.pack('<HHHHBBBB3BB', ux, uy, min(65535, round(L * 100)), min(65535, round(W * 100)),
                                round(a / math.pi * 256) % 256, min(255, round(e / 0.25)), min(255, round(top / 0.25)), fl, *rc, c)
            n_out += 1
        first += len(recs)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'wb') as fh:
        fh.write(head + body)
    print('ferne: %d of %d buildings in %d blocks, %d KB' % (n_out, n_in, len(keys), (len(head) + len(body)) // 1024))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', 'viz3', 'dist'))
