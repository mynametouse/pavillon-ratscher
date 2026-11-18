#!/usr/bin/env python3
"""The flower atlas of the vegetation template (feat/bewuchs-pflanzen): every wildflower, herb and grass head of viz3/src/bewuchs/bw_arten.js
drawn procedurally – stems, leaves, petals, umbels, heads, soft shading – no photos, no foreign artwork, our own work.

    nice -n 10 python3 tools/bewuchs/pflanzen/atlas.py [OUT_DIR] [--sheets SHEET_DIR] [--only id,id]

writes OUT_DIR/blumen.png (1024 x 1024 RGBA, 8 x 8 cells of 128 px, cell (c, r) from the top left; one plant in side view, its stem foot at
the bottom centre, the plant filling the cell's height; straight alpha with the colour bled into the transparent pixels, so mipmaps get no
dark or white halo) and OUT_DIR/blumen.json (cell -> species and frame, the share of the width it covers, its mean colour).
OUT_DIR defaults to viz3/extra/bewuchs-pflanzen/dist/bewuchs. With --sheets: sheets to judge it (1:1 with labels, 1:4, a meadow at the
sizes a plant has on screen, the colour channels without alpha).

Drawing: each cell is painted at 4x (512 px) with the painter's algorithm in sRGB, darkened towards the foot (it stands in grass), given a
fine noise, then reduced to 128 px in linear light (premultiplied, box filter = 16 samples per pixel: the antialiasing). Coordinates of a
plant: u in [-0.5, 0.5] across (0 = the stem foot), v in [0, 1] up (1 = the top of the cell = the plant's height in this frame).
Deterministic: a fixed seed per cell.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
SS = 4
CELL = 128
N = CELL * SS
GRID = 8

# ---------------------------------------------------------------- colour helpers


def hx(c):
    """'#rrggbb' -> (r, g, b) floats 0..1 (sRGB)"""
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))


def to8(c):
    return tuple(int(max(0, min(1, x)) * 255 + 0.5) for x in c)


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def mul(a, k):
    return tuple(min(1.0, x * k) for x in a)


def s2l(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def l2s(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def to_hex(c):
    return '#%02x%02x%02x' % to8(c)


# ---------------------------------------------------------------- the painter


class Painter:
    """One cell at 4x: opaque shapes overwrite (painter's algorithm), a few soft ones blend (fluff, hairs)."""

    def __init__(self, seed, k=1.0):
        self.k = k  # the whole drawing scaled about the stem foot (the fit to the cell, see draw_cell)
        self.im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        self.dr = ImageDraw.Draw(self.im)
        self.rng = np.random.default_rng(seed)
        self.light = np.array([-0.45, 0.75, 0.5])
        self.light /= np.linalg.norm(self.light)

    # random helpers
    def r(self, a=0.0, b=1.0):
        return float(self.rng.uniform(a, b))

    def ri(self, a, b):
        return int(self.rng.integers(a, b + 1))

    def jit(self, c, k=0.06, hue=0.02):
        """a colour varied a little in brightness and warmth"""
        f = 1 + self.r(-k, k)
        w = self.r(-hue, hue)
        return (min(1, c[0] * f + w), min(1, c[1] * f), min(1, c[2] * f - w))

    def P(self, u, v):
        return ((u * self.k + 0.5) * N, (1 - v * self.k) * N)

    # ---- shapes
    def poly(self, pts, col, grad=None, op=1.0):
        """pts [(u, v)]; col (r, g, b); grad (p0, p1, c0, c1): a linear gradient between two points; op < 1 blends"""
        if len(pts) < 3:
            return
        xy = [self.P(u, v) for u, v in pts]
        if grad is None and op >= 1:
            self.dr.polygon(xy, fill=to8(col) + (255,))
            return
        xs = [p[0] for p in xy]
        ys = [p[1] for p in xy]
        x0, x1 = max(0, int(math.floor(min(xs))) - 1), min(N, int(math.ceil(max(xs))) + 2)
        y0, y1 = max(0, int(math.floor(min(ys))) - 1), min(N, int(math.ceil(max(ys))) + 2)
        if x1 <= x0 or y1 <= y0:
            return
        m = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).polygon([(x - x0, y - y0) for x, y in xy], fill=int(255 * op))
        if grad is None:
            arr = np.empty((y1 - y0, x1 - x0, 4), np.uint8)
            arr[..., :3] = to8(col)
        else:
            (pu0, pv0), (pu1, pv1), c0, c1 = grad
            yy, xx = np.mgrid[y0:y1, x0:x1]
            U = ((xx + 0.5) / N - 0.5) / self.k
            V = (1 - (yy + 0.5) / N) / self.k
            du, dv = pu1 - pu0, pv1 - pv0
            t = np.clip(((U - pu0) * du + (V - pv0) * dv) / max(1e-9, du * du + dv * dv), 0, 1)[..., None]
            a = np.array(c0)[None, None, :]
            b = np.array(c1)[None, None, :]
            arr = np.empty((y1 - y0, x1 - x0, 4), np.uint8)
            arr[..., :3] = np.clip((a + (b - a) * t) * 255 + 0.5, 0, 255).astype(np.uint8)
        arr[..., 3] = 255
        src = Image.fromarray(arr, 'RGBA')
        if op >= 1:
            self.im.paste(src, (x0, y0), m)
        else:
            src.putalpha(m)
            sub = self.im.crop((x0, y0, x1, y1))
            self.im.paste(Image.alpha_composite(sub, src), (x0, y0))

    def ellipse(self, cu, cv, ru, rv, rot=0.0, col=(1, 1, 1), grad=None, op=1.0, n=24):
        ca, sa = math.cos(rot), math.sin(rot)
        pts = []
        for i in range(n):
            t = 2 * math.pi * i / n
            x, y = ru * math.cos(t), rv * math.sin(t)
            pts.append((cu + x * ca - y * sa, cv + x * sa + y * ca))
        self.poly(pts, col, grad, op)

    def ball(self, cu, cv, rad, col, hl=0.35, dark=0.55, n=20):
        """a small shaded sphere (bud, berry, button): darker below, a highlight towards the light"""
        self.ellipse(cu, cv, rad, rad, 0, mul(col, dark), n=n)
        self.ellipse(cu - rad * 0.12, cv + rad * 0.12, rad * 0.82, rad * 0.82, 0, col, n=n)
        if hl > 0:
            self.ellipse(cu - rad * 0.35, cv + rad * 0.38, rad * 0.32, rad * 0.28, 0, mix(col, (1, 1, 1), hl), n=12)

    def dots(self, items):
        """many small round dots at once: items [(u, v, radius, colour)] – drawn in the given order"""
        for u, v, rad, col in items:
            x, y = self.P(u, v)
            rr = max(0.6, rad * N * self.k)
            self.dr.ellipse((x - rr, y - rr, x + rr, y + rr), fill=to8(col) + (255,))

    def soft_lines(self, segs, col, width_px, op):
        """thin translucent lines (fluff, hairs): segs [((u0, v0), (u1, v1))], blended with opacity op"""
        lay = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        c8 = to8(col) + (int(255 * op),)
        for a, b in segs:
            d.line([self.P(*a), self.P(*b)], fill=c8, width=max(1, int(round(width_px * self.k))))
        self.im = Image.alpha_composite(self.im, lay)
        self.dr = ImageDraw.Draw(self.im)

    def soft_dots(self, items, op):
        lay = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for u, v, rad, col in items:
            x, y = self.P(u, v)
            rr = max(0.6, rad * N * self.k)
            d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=to8(col) + (int(255 * op),))
        self.im = Image.alpha_composite(self.im, lay)
        self.dr = ImageDraw.Draw(self.im)

    # ---- curves
    @staticmethod
    def bez(p0, p1, p2, n=24):
        """a quadratic Bezier curve as n + 1 points"""
        out = []
        for i in range(n + 1):
            t = i / n
            a = (1 - t) ** 2
            b = 2 * (1 - t) * t
            c = t * t
            out.append((a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]))
        return out

    @staticmethod
    def at(path, t):
        """the point and the unit tangent at share t of a polyline"""
        n = len(path) - 1
        f = max(0.0, min(1.0, t)) * n
        i = min(n - 1, int(f))
        k = f - i
        a, b = path[i], path[i + 1]
        p = (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        return p, (dx / L, dy / L)

    def stroke(self, path, w0, w1, col, col1=None, hl=0.18, op=1.0):
        """a tapered stroke along a polyline (stem, petiole, ray, culm): width w0 at the start, w1 at the end; a lighter edge
        towards the light"""
        if len(path) < 2:
            return
        L, R = [], []
        n = len(path)
        for i, p in enumerate(path):
            a = path[max(0, i - 1)]
            b = path[min(n - 1, i + 1)]
            dx, dy = b[0] - a[0], b[1] - a[1]
            l = math.hypot(dx, dy) or 1.0
            nx, ny = -dy / l, dx / l
            w = (w0 + (w1 - w0) * i / (n - 1)) / 2
            L.append((p[0] + nx * w, p[1] + ny * w))
            R.append((p[0] - nx * w, p[1] - ny * w))
        c1 = col1 if col1 is not None else col
        self.poly(L + R[::-1], col, (path[0], path[-1], col, c1), op)
        if hl > 0 and max(w0, w1) * N > 5:
            # the lit edge: a thin lighter band on the side that faces the light (left)
            side = L if (L[0][0] < R[0][0]) else R
            band = []
            for i, p in enumerate(path):
                q = side[i]
                band.append((p[0] + (q[0] - p[0]) * 0.85, p[1] + (q[1] - p[1]) * 0.85))
            inner = []
            for i, p in enumerate(path):
                q = side[i]
                inner.append((p[0] + (q[0] - p[0]) * 0.2, p[1] + (q[1] - p[1]) * 0.2))
            self.poly(band + inner[::-1], mix(col, (1, 1, 0.9), hl), (path[0], path[-1], mix(col, (1, 1, 0.9), hl), mix(c1, (1, 1, 0.9), hl)), op)

    # ---- leaves
    def leaf(self, base, ang, length, width, col, shape='lanzett', bend=0.0, light_side=None, rib=True, teeth=0, tooth=0.25,
             tip=None, n=28, foreshort=1.0, op=1.0):
        """a leaf from base at angle ang (radians from the +v axis, positive = to the right) with its midrib curved by bend
        (share of the length, sideways). shape: lanzett | oval | linear | spatel | herz | rund | eilanz. teeth: number of teeth
        along each edge (serrated). foreshort < 1 shortens it (pointing towards or away from the viewer). Two-tone: the half
        towards the light is lighter."""
        length *= foreshort
        rib_pts = []
        ca, sa = math.cos(ang), math.sin(ang)
        for i in range(n + 1):
            t = i / n
            # along the leaf: x along, y sideways (bend), then rotated: along = (sa, ca)
            x = t * length
            y = bend * length * (t * t)
            rib_pts.append((base[0] + x * sa + y * ca, base[1] + x * ca - y * sa))

        def wprof(t):
            if shape == 'linear':
                return (1 - t) ** 0.6 * min(1, t * 8)
            if shape == 'oval':
                return math.sin(math.pi * min(1, t * 0.98)) ** 0.55
            if shape == 'rund':
                return math.sin(math.pi * min(1, t)) ** 0.4
            if shape == 'spatel':
                return (t ** 0.9) * (1 - t) ** 0.35 * 1.9
            if shape == 'herz':
                return (math.sin(math.pi * min(1, t)) ** 0.5) * (1 - 0.55 * t) * 1.25 * min(1, t * 6 + 0.3)
            if shape == 'eilanz':
                return math.sin(math.pi * t ** 0.75) ** 0.7
            return math.sin(math.pi * t) ** 0.8  # lanzett

        Lp, Rp = [], []
        for i, p in enumerate(rib_pts):
            t = i / n
            a = rib_pts[max(0, i - 1)]
            b = rib_pts[min(n, i + 1)]
            dx, dy = b[0] - a[0], b[1] - a[1]
            l = math.hypot(dx, dy) or 1.0
            nx, ny = -dy / l, dx / l
            w = width / 2 * wprof(t)
            if teeth:
                ph = (t * teeth) % 1.0
                w *= 1 + tooth * (ph - 0.5) * (1 if ph < 0.85 else -4)
            Lp.append((p[0] + nx * w, p[1] + ny * w))
            Rp.append((p[0] - nx * w, p[1] - ny * w))
        dark = mul(col, 0.78)
        lite = mix(col, (0.95, 1, 0.75), 0.18)
        # which half faces the light: the one more to the upper left
        sideL = (Lp[n // 2][0] - Rp[n // 2][0]) * -0.45 + (Lp[n // 2][1] - Rp[n // 2][1]) * 0.75 > 0
        if light_side is not None:
            sideL = light_side
        base_c, tip_c = mul(col, 0.8), col
        self.poly(Lp + Rp[::-1], col, (rib_pts[0], rib_pts[-1], base_c, tip_c), op)
        half = Lp if sideL else Rp
        self.poly(half + rib_pts[::-1], lite, (rib_pts[0], rib_pts[-1], mul(lite, 0.85), lite), op)
        other = Rp if sideL else Lp
        # a little shadow along the far edge
        edge = []
        for i in range(n + 1):
            p, q = rib_pts[i], other[i]
            edge.append((p[0] + (q[0] - p[0]) * 0.55, p[1] + (q[1] - p[1]) * 0.55))
        self.poly(other + edge[::-1], dark, None, op)
        if rib and width * N > 10:
            self.stroke(rib_pts[: int(n * 0.92)], width * 0.07, width * 0.02, mix(col, (0.9, 0.95, 0.7), 0.3), hl=0, op=op)
        return rib_pts

    def runcinate(self, base, ang, length, width, col, lobes=5, bend=0.05, foreshort=1.0):
        """a dandelion leaf: deep lobes whose teeth point back towards the base"""
        length *= foreshort
        n = 60
        ca, sa = math.cos(ang), math.sin(ang)
        rib = []
        for i in range(n + 1):
            t = i / n
            x, y = t * length, bend * length * t * t
            rib.append((base[0] + x * sa + y * ca, base[1] + x * ca - y * sa))
        Lp, Rp = [], []
        for i, p in enumerate(rib):
            t = i / n
            a, b = rib[max(0, i - 1)], rib[min(n, i + 1)]
            dx, dy = b[0] - a[0], b[1] - a[1]
            l = math.hypot(dx, dy) or 1.0
            nx, ny = -dy / l, dx / l
            env = math.sin(math.pi * min(1, t ** 0.8)) ** 0.7
            ph = (t * lobes) % 1.0
            lob = 0.35 + 0.65 * (ph ** 1.6)  # rises slowly, drops at the tooth (teeth pointing back)
            if t > 0.86:
                lob = 1.0
            w = width / 2 * env * lob
            Lp.append((p[0] + nx * w, p[1] + ny * w))
            Rp.append((p[0] - nx * w * (0.9 + 0.2 * math.sin(t * 9)), p[1] - ny * w * (0.9 + 0.2 * math.sin(t * 9))))
        self.poly(Lp + Rp[::-1], col, (rib[0], rib[-1], mul(col, 0.75), col))
        half = Lp
        self.poly(half + rib[::-1], mix(col, (0.95, 1, 0.75), 0.15), None)
        self.stroke(rib[:56], width * 0.08, width * 0.03, mix(col, (0.95, 0.9, 0.75), 0.35), hl=0)

    def pinnate(self, base, ang, length, width, col, pairs=7, sub=0, leaflet='lanzett', bend=0.12, foreshort=1.0, fine=1.0,
                rachis=None, tip_leaflet=True):
        """a pinnate leaf: a rachis with pairs of leaflets (sub > 0: each leaflet pinnate itself – feathery, as the umbellifers);
        fine scales the leaflets' width"""
        length *= foreshort
        ca, sa = math.cos(ang), math.sin(ang)
        rp = []
        n = 30
        for i in range(n + 1):
            t = i / n
            x, y = t * length, bend * length * t * t
            rp.append((base[0] + x * sa + y * ca, base[1] + x * ca - y * sa))
        rc = rachis if rachis is not None else mul(col, 0.9)
        self.stroke(rp, max(0.004, width * 0.05), max(0.002, width * 0.02), rc, hl=0)
        for k in range(pairs):
            t = 0.12 + 0.85 * k / max(1, pairs - 1) * 0.92
            p, d = self.at(rp, t)
            env = math.sin(math.pi * min(0.98, 0.15 + t * 0.85)) ** 0.6
            ll = width * 0.55 * env * (1.0 - 0.2 * t)
            for s in (-1, 1):
                a = math.atan2(d[0], d[1]) + s * (0.95 - 0.35 * t) + self.r(-0.1, 0.1)
                c = self.jit(col, 0.05)
                if sub:
                    self.pinnate(p, a, ll, ll * 0.6, c, pairs=sub, sub=0, leaflet=leaflet, bend=0.1 * s, fine=fine)
                else:
                    self.leaf(p, a, ll, ll * 0.42 * fine, c, shape=leaflet, bend=0.08 * s, rib=False)
        if tip_leaflet:
            p, d = self.at(rp, 0.97)
            a = math.atan2(d[0], d[1])
            if sub:
                self.pinnate(p, a, width * 0.4, width * 0.25, col, pairs=max(2, sub - 1), sub=0, leaflet=leaflet, bend=0.05, fine=fine)
            else:
                self.leaf(p, a, width * 0.45, width * 0.2 * fine, col, shape=leaflet, rib=False)
        return rp

    def palmate(self, c, size, col, lobes=5, cut=0.6, tilt=0.55, rot=0.0, teeth=3, n=150):
        """a palmately lobed leaf seen at a slant (tilt: vertical squash), centred at c; cut 0..1 how deep the lobes are"""
        pts = []
        for i in range(n):
            a = 2 * math.pi * i / n
            ph = (a / (2 * math.pi) * lobes) % 1.0
            lobe = 1 - cut * (1 - math.sin(math.pi * ph) ** 0.7)
            tt = (a / (2 * math.pi) * lobes * teeth) % 1.0
            lobe *= 1 + 0.08 * (tt - 0.5)
            r = size * lobe
            x, y = r * math.cos(a + rot), r * math.sin(a + rot) * tilt
            pts.append((c[0] + x, c[1] + y))
        self.poly(pts, col, ((c[0] - size, c[1] + size * tilt), (c[0] + size, c[1] - size * tilt), mix(col, (0.95, 1, 0.75), 0.15), mul(col, 0.75)))
        # veins from the centre to the lobes
        for k in range(lobes):
            a = 2 * math.pi * (k + 0.5) / lobes + rot
            self.stroke([c, (c[0] + size * 0.8 * math.cos(a), c[1] + size * 0.8 * math.sin(a) * tilt)], size * 0.05, size * 0.015,
                        mul(col, 0.82), hl=0)

    # ---- flower heads in 3D (orthographic: x right, y up, z towards the viewer)
    @staticmethod
    def basis(nrm):
        n = np.array(nrm, float)
        n /= np.linalg.norm(n)
        a = np.array([0.0, 0.0, 1.0]) if abs(n[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
        e1 = np.cross(n, a)
        e1 /= np.linalg.norm(e1)
        e2 = np.cross(n, e1)
        return n, e1, e2

    def head_normal(self, up=0.75, toward=0.45, side=0.0):
        """the normal of a head that faces up, tilted towards the viewer (z) and to a side"""
        return (side + self.r(-0.12, 0.12), up, toward + self.r(-0.1, 0.1))

    def rays(self, c, nrm, r0, r1, wid, count, col, col_tip=None, cup=0.0, shape='lanzett', jitter=0.08, phase=None,
             notch=0, back_dark=0.82, droop=0.0, length_jit=0.08, front=None):
        """petals or ray florets around a centre: from radius r0 to r1 in the plane of nrm (a shallow cup lifts the tips along the
        normal; droop lowers them). front: None = all, True = only those towards the viewer, False = only the back ones.
        Returns nothing; draws back to front."""
        n, e1, e2 = self.basis(nrm)
        ph = self.r(0, 6.283) if phase is None else phase
        items = []
        for k in range(count):
            a = ph + 2 * math.pi * k / count + self.r(-jitter, jitter)
            d = math.cos(a) * e1 + math.sin(a) * e2
            w = np.cross(n, d)
            L = (r1 - r0) * (1 + self.r(-length_jit, length_jit))
            pts3 = []
            m = 10
            prof = []
            for i in range(m + 1):
                s = i / m
                if shape == 'oval':
                    hw = math.sin(math.pi * min(0.97, 0.12 + s * 0.88)) ** 0.6
                elif shape == 'spatel':
                    hw = (0.35 + 0.65 * s ** 0.7) * (1 - s ** 6) ** 0.5
                elif shape == 'rund':
                    hw = math.sin(math.pi * (0.1 + 0.9 * s)) ** 0.35
                elif shape == 'trichter':
                    hw = 0.25 + 0.75 * s
                elif shape == 'linear':
                    hw = 0.7 + 0.3 * math.sin(math.pi * s)
                else:
                    hw = math.sin(math.pi * min(0.97, 0.08 + s * 0.92)) ** 0.8
                prof.append(hw)
            for i in range(m + 1):
                s = i / m
                p = d * (r0 + s * L) + n * (cup * (s * L) ** 1.6 / max(1e-6, L ** 0.6)) - np.array([0, 1, 0]) * droop * (s * L) ** 2 / max(1e-6, L)
                pts3.append(p)
            left = [pts3[i] + w * wid / 2 * prof[i] for i in range(m + 1)]
            right = [pts3[i] - w * wid / 2 * prof[i] for i in range(m + 1)]
            if notch:
                tipL = [left[-1] + (pts3[-1] - left[-1]) * 0.5 - d * L * 0.06 * notch]
            else:
                tipL = []
            outline = left + tipL + right[::-1]
            z = float(np.mean([p[2] for p in pts3]))
            # shade by how the petal faces the light and by depth
            pn = n + d * (-cup * 0.8)
            pn = pn / (np.linalg.norm(pn) or 1)
            lam = 0.78 + 0.22 * max(0.0, float(pn @ self.light))
            items.append((z, outline, lam, pts3))
        items.sort(key=lambda q: q[0])
        zs = [q[0] for q in items]
        zmin, zmax = min(zs), max(zs)
        for z, outline, lam, pts3 in items:
            isfront = z >= (zmin + zmax) / 2
            if front is not None and front != isfront:
                continue
            depth = 1.0 if zmax - zmin < 1e-6 else (z - zmin) / (zmax - zmin)
            k = lam * (back_dark + (1 - back_dark) * depth)
            c0 = self.jit(col, 0.04)
            ct = col_tip if col_tip is not None else c0
            pts2 = [(c[0] + p[0], c[1] + p[1]) for p in outline]
            self.poly(pts2, mul(c0, k), ((c[0] + pts3[0][0], c[1] + pts3[0][1]), (c[0] + pts3[-1][0], c[1] + pts3[-1][1]),
                                        mul(mix(c0, (0.6, 0.7, 0.3), 0.15), k * 0.9), mul(ct, k)))

    def disc(self, c, nrm, rad, col, dome=0.25, ring=None, hl=0.3):
        """the disc of a composite head (or the eye of a flower): an ellipse in the plane of nrm, domed"""
        n, e1, e2 = self.basis(nrm)
        pts = []
        for i in range(24):
            a = 2 * math.pi * i / 24
            p = (math.cos(a) * e1 + math.sin(a) * e2) * rad
            pts.append((c[0] + p[0], c[1] + p[1]))
        top = n * rad * dome
        self.poly(pts, mul(col, 0.7), None)
        pts2 = [(c[0] + top[0] * 0.5 + (x - c[0]) * 0.85, c[1] + top[1] * 0.5 + (y - c[1]) * 0.85) for x, y in pts]
        cc = (c[0] + top[0], c[1] + top[1])
        self.poly(pts2, col, ((cc[0] - rad * 0.5, cc[1] + rad * 0.5), (cc[0] + rad * 0.6, cc[1] - rad * 0.6), mix(col, (1, 1, 0.8), hl), mul(col, 0.8)))
        if ring is not None:
            for i in range(14):
                a = 2 * math.pi * i / 14 + self.r(0, 0.3)
                p = (math.cos(a) * e1 + math.sin(a) * e2) * rad * 0.55 + top * 0.7
                self.dots([(c[0] + p[0], c[1] + p[1], rad * 0.09, ring)])

    def globe(self, c, rad, col, count=60, fl=0.25, elong=1.6, squash=1.0, bottom_col=None, spread=1.0, dark=0.6, out=0.0):
        """a round head of many small florets (clover, thistle brush, buttons): florets on a sphere, back to front, shaded by the
        light; bottom_col: the colour of the lowest (oldest, reflexed) florets"""
        pts = []
        ga = math.pi * (3 - math.sqrt(5))
        for i in range(count):
            y = 1 - 2 * (i + 0.5) / count
            rr = math.sqrt(max(0.0, 1 - y * y))
            a = ga * i + self.r(-0.2, 0.2)
            p = np.array([math.cos(a) * rr, y, math.sin(a) * rr])
            pts.append(p)
        pts.sort(key=lambda p: p[2])
        for p in pts:
            if p[1] < -1 + 2 * (1 - spread):
                continue
            lam = 0.5 + 0.5 * max(0.0, float(p @ self.light))
            depth = 0.6 + 0.4 * (p[2] + 1) / 2
            k = lam * depth
            base = col if (bottom_col is None or p[1] > -0.35) else bottom_col
            cc = mul(self.jit(base, 0.05), max(dark, k) * 1.08)
            ctr = (c[0] + p[0] * rad * (1 + out), c[1] + p[1] * rad * squash * (1 + out))
            ang = math.atan2(p[0], p[1] * squash)
            self.ellipse(ctr[0], ctr[1], rad * fl * 0.5, rad * fl * 0.5 * elong, -ang, cc, n=10)

    def bell(self, base, ang, length, width, col, inner=None, lobes=5, flare=0.45, n=16):
        """a bell or tube from base pointing at angle ang (radians from +v): narrow at the base, open at the mouth, lobed rim"""
        ca, sa = math.cos(ang), math.sin(ang)
        ax = (sa, ca)
        nx = (ca, -sa)
        L, R = [], []
        for i in range(n + 1):
            t = i / n
            w = width / 2 * (0.35 + 0.65 * t ** 0.8 + flare * t ** 6)
            p = (base[0] + ax[0] * length * t, base[1] + ax[1] * length * t)
            L.append((p[0] + nx[0] * w, p[1] + nx[1] * w))
            R.append((p[0] - nx[0] * w, p[1] - nx[1] * w))
        mouth = (base[0] + ax[0] * length, base[1] + ax[1] * length)
        # rim lobes
        rim = []
        wm = width / 2 * (1 + flare)
        for i in range(lobes * 4 + 1):
            t = i / (lobes * 4)
            s = -1 + 2 * t
            lob = abs(math.sin(math.pi * t * lobes)) * length * 0.12
            rim.append((mouth[0] + nx[0] * wm * s + ax[0] * lob, mouth[1] + nx[1] * wm * s + ax[1] * lob))
        # the outline: up the left side, along the rim from left to right, down the right side
        self.poly(L + list(reversed(rim)) + R[::-1], col, (base, mouth, mul(col, 0.75), mix(col, (1, 1, 1), 0.12)))
        # the opening: a darker ellipse at the mouth
        if inner is not None:
            self.ellipse(mouth[0] + ax[0] * length * 0.02, mouth[1] + ax[1] * length * 0.02, wm * 0.8, wm * 0.32,
                         math.atan2(nx[1], nx[0]), inner, n=16)
        return mouth


# ---------------------------------------------------------------- colours of the plants (sRGB)

C = {
    'blatt': hx('#4f7a32'), 'blatt_hell': hx('#6a9440'), 'blatt_dunkel': hx('#3c5e2a'), 'blatt_grau': hx('#6d8a62'),
    'blatt_blau': hx('#5a7e5a'), 'stiel': hx('#5e8a3a'), 'stiel_rot': hx('#8a4a3a'), 'stiel_hell': hx('#7fa04e'),
    'gelb': hx('#f4c400'), 'gelb_hell': hx('#ffe14a'), 'gold': hx('#e8b414'), 'orange': hx('#e89a10'),
    'weiss': hx('#f6f4ec'), 'creme': hx('#f2ecd6'), 'rosa': hx('#e8b8c4'), 'lila_hell': hx('#e4d6ee'),
    'violett': hx('#8a78d0'), 'blauviolett': hx('#7c84d2'), 'purpur': hx('#b0509a'), 'magenta': hx('#c8408a'),
    'rotklee': hx('#c25a8c'), 'rot': hx('#e0201c'), 'blau': hx('#3a62d8'), 'himmelblau': hx('#82a8ea'),
    'braun': hx('#6a5440'), 'braun_hell': hx('#9a8466'), 'stroh': hx('#c8b07a'), 'trocken': hx('#8a7a60'),
}


# ---------------------------------------------------------------- building blocks of plants


def stem_path(p, u0, u1, top, bend=0.0, n=24):
    """a stem from (u0, 0) to (u1, top), bowed sideways by bend"""
    return p.bez((u0, 0.0), ((u0 + u1) / 2 + bend, top * 0.55), (u1, top), n)


def rosette(p, count, lmin, lmax, wid, col, shape='lanzett', spread=1.25, teeth=0, upright=0.0, fn=None, amin=0.35):
    """leaves from the foot fanning out to both sides (front ones foreshortened); fn(p, base, ang, length, col, fore) draws one"""
    order = list(range(count))
    p.rng.shuffle(order)
    leaves = []
    for k in order:
        side = -1 if k % 2 == 0 else 1
        a = side * p.r(amin, spread) * (1 - upright) + p.r(-0.15, 0.15)
        L = p.r(lmin, lmax)
        fore = p.r(0.55, 1.0)
        z = p.r(-1, 1)
        leaves.append((z, a, L, fore))
    leaves.sort(key=lambda q: q[0])
    for z, a, L, fore in leaves:
        c = mul(p.jit(col, 0.06), 0.85 + 0.15 * (z + 1) / 2)
        base = (p.r(-0.015, 0.015), 0.0)
        if fn:
            fn(p, base, a, L, c, fore)
        else:
            p.leaf(base, a, L, wid * p.r(0.8, 1.15), c, shape=shape, bend=-0.12 * (1 if a > 0 else -1), teeth=teeth, foreshort=fore)


def leaves_along(p, path, ts, length, wid, col, shape='lanzett', ang=0.75, teeth=0, alt=True, opp=False, droop=0.0, fore=(0.7, 1.0)):
    """leaves along a stem at the shares ts: alternate (or opposite pairs), angle ang from the stem"""
    side = 1 if p.r() < 0.5 else -1
    for i, t in enumerate(ts):
        pt, d = p.at(path, t)
        base_ang = math.atan2(d[0], d[1])
        sides = (-1, 1) if opp else (side,)
        for s in sides:
            a = base_ang + s * (ang + p.r(-0.15, 0.15))
            L = length * (1 - 0.35 * t) * p.r(0.85, 1.1)
            p.leaf(pt, a, L, wid * (1 - 0.3 * t), p.jit(col, 0.06), shape=shape, bend=(-0.18 - droop) * s, teeth=teeth,
                   foreshort=p.r(*fore))
        if alt:
            side = -side


# ---------------------------------------------------------------- the species (each draws one frame into a Painter)


def loewenzahn_rosette(p, scale=1.0, col=None):
    col = col or hx('#4c7d2c')

    def one(p, base, a, L, c, fore):
        p.runcinate(base, a, L, 0.16 * scale, c, lobes=p.ri(4, 6), bend=0.05 * (1 if a > 0 else -1), foreshort=fore)

    if scale > 1:  # the rosette alone: as it stands in the grass, more upright
        rosette(p, p.ri(10, 12), 0.5 * scale, 0.85 * scale, 0.16 * scale, col, spread=0.55, amin=0.08, fn=one)
    else:
        rosette(p, p.ri(9, 12), 0.45 * scale, 0.85 * scale, 0.16 * scale, col, spread=1.35, fn=one)


def f_loewenzahn_blatt(p):
    loewenzahn_rosette(p, 1.12)


def dandelion_head(p, c, rad, nrm=None, col=None):
    col = col or C['gelb']
    nrm = nrm or p.head_normal(0.6, 0.55)
    # green bracts (some reflexed) behind
    n, e1, e2 = p.basis(nrm)
    for k in range(7):
        a = 2 * math.pi * k / 7 + p.r(0, 0.4)
        d = math.cos(a) * e1 + math.sin(a) * e2 - n * 0.9
        tipp = (c[0] + d[0] * rad * 0.9, c[1] + d[1] * rad * 0.9)
        p.leaf((c[0], c[1] - rad * 0.15), math.atan2(tipp[0] - c[0], tipp[1] - c[1]), rad * 0.9, rad * 0.22, hx('#55803a'), rib=False)
    # three rings of ligules: outer long and flat, inner short and upright
    for ring, (r1, wid, cnt, cup, tone) in enumerate([(1.0, 0.2, 22, 0.15, 0.92), (0.78, 0.18, 18, 0.5, 1.0), (0.5, 0.17, 12, 1.2, 1.05)]):
        p.rays(c, nrm, rad * 0.05, rad * r1, rad * wid, cnt, mul(col, tone), col_tip=mix(mul(col, tone), C['gelb_hell'], 0.3),
               cup=cup, shape='linear', notch=1, back_dark=0.8)
    p.disc(c, nrm, rad * 0.22, mul(C['orange'], 0.95), dome=0.6, hl=0.25)


def dandelion_bud(p, c, rad, ang=0.0, opened=0.0):
    """a closed head: a green bud with bracts, a yellow tip when about to open (opened 0..1)"""
    L = rad * 2.4
    p.bell((c[0], c[1]), ang, L * 0.9, rad * 1.1, hx('#5a8a3c'), inner=None, lobes=6, flare=-0.15)
    tip = (c[0] + math.sin(ang) * L * 0.85, c[1] + math.cos(ang) * L * 0.85)
    if opened > 0:
        p.ellipse(tip[0], tip[1], rad * 0.45, rad * 0.35, -ang, mix(hx('#7a9a40'), C['gelb'], opened))
    for s in (-1, 1):  # reflexed outer bracts
        p.leaf((c[0], c[1] + L * 0.1), ang + math.pi + s * 0.6, rad * 1.0, rad * 0.25, hx('#4f7d34'), rib=False)


def scape(p, u_top, top, bend=0.0, w=0.014, col=None):
    """a leafless flower stalk (dandelion, daisy, plantain) from the foot"""
    path = stem_path(p, p.r(-0.02, 0.02), u_top, top, bend)
    p.stroke(path, w, w * 0.75, col or hx('#7f9a52'), col1=mix(col or hx('#7f9a52'), hx('#a8a070'), 0.2))
    return path


def f_loewenzahn_knospe(p):
    loewenzahn_rosette(p, 0.62)
    for k in range(p.ri(3, 4)):
        top = p.r(0.55, 0.92)
        u = p.r(-0.22, 0.22)
        path = scape(p, u, top, p.r(-0.08, 0.08), w=0.016)
        _, d = p.at(path, 1.0)
        dandelion_bud(p, path[-1], 0.065, math.atan2(d[0], d[1]), opened=p.r(0, 0.8))


def f_loewenzahn_bluete(p):
    loewenzahn_rosette(p, 0.48)
    heads = []
    for k in range(p.ri(4, 5)):
        top = p.r(0.55, 0.95)
        u = p.r(-0.3, 0.3)
        heads.append((top, u))
    heads.sort(key=lambda h: -h[0])
    for top, u in heads:
        path = scape(p, u, top - 0.04, p.r(-0.06, 0.06) - u * 0.15, w=0.017)
        dandelion_head(p, (path[-1][0], path[-1][1] + 0.02), p.r(0.075, 0.095), nrm=p.head_normal(0.62, 0.5, side=u * 0.6))
    # one closed head (yesterday's flower)
    path = scape(p, p.r(-0.1, 0.1), 0.42, 0.05, w=0.015)
    _, d = p.at(path, 1.0)
    dandelion_bud(p, path[-1], 0.028, math.atan2(d[0], d[1]))


def pappus_ball(p, c, rad):
    """the seed head (Pusteblume): a sphere of parachutes – fine hairs out to tiny white tufts – around a brown receptacle"""
    segs, tufts = [], []
    ga = math.pi * (3 - math.sqrt(5))
    cnt = 150
    for i in range(cnt):
        y = 1 - 2 * (i + 0.5) / cnt
        rr = math.sqrt(max(0, 1 - y * y))
        a = ga * i
        x, z = math.cos(a) * rr, math.sin(a) * rr
        if y < -0.75:
            continue
        e = (c[0] + x * rad, c[1] + y * rad)
        s = (c[0] + x * rad * 0.15, c[1] + y * rad * 0.15)
        segs.append((s, e))
        tufts.append((e[0], e[1], rad * 0.075, (0.97, 0.97, 0.95) if z > -0.2 else (0.88, 0.88, 0.85)))
    p.soft_lines(segs, (0.95, 0.95, 0.92), 1.6, 0.6)
    p.soft_dots(tufts, 0.85)
    p.ball(c[0], c[1], rad * 0.13, hx('#8a6a3a'), hl=0.2)


def f_loewenzahn_samen(p):
    loewenzahn_rosette(p, 0.42)
    for k in range(p.ri(2, 3)):
        top = p.r(0.62, 0.86)
        u = p.r(-0.25, 0.25)
        path = scape(p, u, top, p.r(-0.05, 0.05), w=0.016, col=hx('#8a9a5a'))
        pappus_ball(p, (path[-1][0], path[-1][1] + 0.08), 0.11)
    path = scape(p, 0.12, 0.4, 0.03, w=0.014)
    _, d = p.at(path, 1.0)
    dandelion_bud(p, path[-1], 0.026, math.atan2(d[0], d[1]))


def daisy(p, c, rad, nrm, pink=0.5):
    rays_c = C['weiss']
    # under sides of the rays are pinkish: the back rays show their top, the front ones curl a little and show the pink
    p.rays(c, nrm, rad * 0.25, rad, rad * 0.16, 30, rays_c, col_tip=mix(rays_c, C['rosa'], pink * 0.5), cup=0.15, shape='linear',
           front=False)
    p.disc(c, nrm, rad * 0.32, C['gelb'], dome=0.5)
    p.rays(c, nrm, rad * 0.25, rad, rad * 0.16, 30, mix(rays_c, C['rosa'], 0.15), col_tip=mix(rays_c, C['rosa'], pink), cup=0.25,
           shape='linear', front=True)


def f_gaensebluemchen_bluete(p):
    # the small spoon-shaped rosette
    rosette(p, p.ri(8, 10), 0.2, 0.34, 0.11, hx('#4a7a30'), shape='spatel', spread=1.45)
    heads = []
    for k in range(p.ri(5, 6)):
        heads.append((p.r(0.45, 0.9), p.r(-0.32, 0.32)))
    heads.sort(key=lambda h: -h[0])
    for top, u in heads:
        path = scape(p, u, top - 0.05, p.r(-0.04, 0.04), w=0.02, col=hx('#86a05a'))
        daisy(p, (path[-1][0], path[-1][1] + 0.02), p.r(0.085, 0.11), p.head_normal(0.62, 0.55, side=u * 0.5), pink=p.r(0.2, 0.7))
    # two closed buds
    for k in range(2):
        path = scape(p, p.r(-0.2, 0.2), p.r(0.3, 0.45), 0, w=0.017)
        p.ball(path[-1][0], path[-1][1] + 0.015, 0.03, mix(C['weiss'], C['rosa'], 0.55), hl=0.2)


def trefoil(p, c, size, col, nrm=None, chevron=True):
    """three leaflets of clover around a point, at a slant"""
    tilt = p.r(0.35, 0.7)
    rot = p.r(0, 6.28)
    for k in range(3):
        a = rot + 2 * math.pi * k / 3
        cu = c[0] + math.cos(a) * size * 0.55
        cv = c[1] + math.sin(a) * size * 0.55 * tilt
        cc = p.jit(col, 0.06)
        p.ellipse(cu, cv, size * 0.55, size * 0.42 * tilt, a, mul(cc, 0.85))
        p.ellipse(cu - size * 0.05, cv + size * 0.04, size * 0.47, size * 0.34 * tilt, a, cc)
        if chevron:
            p.ellipse(cu, cv, size * 0.25, size * 0.1 * tilt, a, mix(cc, (0.85, 0.92, 0.8), 0.45), n=12)


def clover_leaves(p, count, hmin, hmax, size, col, spread=0.4):
    items = []
    for k in range(count):
        items.append((p.r(-1, 1), p.r(-spread, spread), p.r(hmin, hmax)))
    items.sort()
    for z, u, h in items:
        path = stem_path(p, p.r(-0.04, 0.04), u, h, p.r(-0.05, 0.05))
        p.stroke(path, 0.012, 0.009, hx('#6a9046'), hl=0)
        trefoil(p, path[-1], size * p.r(0.85, 1.15), mul(col, 0.9 + 0.1 * (z + 1) / 2))


def f_klee_blatt(p):
    clover_leaves(p, 22, 0.3, 0.95, 0.1, hx('#4e8034'), spread=0.42)


def f_weissklee_bluete(p):
    clover_leaves(p, 10, 0.25, 0.6, 0.075, hx('#4e8034'), spread=0.42)
    heads = [(p.r(0.62, 0.92), p.r(-0.28, 0.28)) for _ in range(p.ri(3, 4))]
    heads.sort(key=lambda h: -h[0])
    for top, u in heads:
        path = stem_path(p, p.r(-0.05, 0.05), u, top - 0.06, p.r(-0.05, 0.05))
        p.stroke(path, 0.013, 0.011, hx('#7a9a56'))
        p.globe((path[-1][0], path[-1][1] + 0.025), 0.075, C['weiss'], count=70, fl=0.3, elong=1.9,
                bottom_col=hx('#c8b49a'), dark=0.7)


def f_rotklee_bluete(p):
    stems = []
    for k in range(p.ri(4, 5)):
        stems.append((p.r(0.6, 0.95), p.r(-0.3, 0.3)))
    stems.sort(key=lambda h: -h[0])
    for top, u in stems:
        path = stem_path(p, p.r(-0.04, 0.04), u, top - 0.08, p.r(-0.1, 0.1))
        p.stroke(path, 0.016, 0.011, hx('#6a8a44'))
        for t in (0.35, 0.65):
            pt, d = p.at(path, t)
            s = 1 if p.r() < 0.5 else -1
            q = (pt[0] + s * 0.07, pt[1] + 0.03)
            p.stroke([pt, q], 0.008, 0.006, hx('#6a8a44'), hl=0)
            trefoil(p, q, 0.075, hx('#4f7f34'))
        h = (path[-1][0], path[-1][1] + 0.04)
        trefoil(p, (h[0], h[1] - 0.04), 0.06, hx('#4a7a32'))
        p.globe(h, 0.068, C['rotklee'], count=60, fl=0.33, elong=2.0, squash=1.15, dark=0.55)


def buttercup(p, c, rad, nrm):
    p.rays(c, nrm, rad * 0.1, rad, rad * 0.95, 5, C['gelb'], col_tip=hx('#ffe23a'), cup=0.9, shape='rund', jitter=0.12, back_dark=0.75)
    p.disc(c, nrm, rad * 0.28, hx('#c9b02a'), dome=0.7, hl=0.2)
    # the gloss of the petals
    n, e1, e2 = p.basis(nrm)
    for k in range(2):
        a = p.r(0, 6.28)
        q = (math.cos(a) * e1 + math.sin(a) * e2) * rad * 0.55 + n * rad * 0.35
        p.ellipse(c[0] + q[0], c[1] + q[1], rad * 0.14, rad * 0.08, a, hx('#fff6b0'), n=10)


def f_hahnenfuss_bluete(p):
    # few basal leaves, tall thin branched stems with small cups
    for k in range(4):
        q = (p.r(-0.18, 0.18), p.r(0.04, 0.12))
        p.stroke([(0, 0), q], 0.008, 0.006, hx('#5a8a3a'), hl=0)
        p.palmate(q, p.r(0.06, 0.08), p.jit(hx('#4c7a30')), lobes=5, cut=0.7, tilt=p.r(0.4, 0.6), rot=p.r(0, 6.28))
    for k in range(3):
        u_top = p.r(-0.2, 0.2)
        path = stem_path(p, p.r(-0.03, 0.03), u_top, p.r(0.7, 0.85), p.r(-0.06, 0.06))
        p.stroke(path, 0.012, 0.007, hx('#6a9244'))
        leaves_along(p, path, [0.35], 0.09, 0.03, hx('#4f7d34'), shape='lanzett', ang=0.6)
        for b in range(p.ri(2, 3)):
            t = p.r(0.5, 0.8)
            pt, d = p.at(path, t)
            s = 1 if b % 2 else -1
            tip = (pt[0] + s * p.r(0.12, 0.22), pt[1] + p.r(0.12, 0.25))
            br = p.bez(pt, (pt[0] + s * 0.05, (pt[1] + tip[1]) / 2 + 0.05), tip, 10)
            p.stroke(br, 0.008, 0.006, hx('#6a9244'), hl=0)
            buttercup(p, (tip[0], tip[1] + 0.01), p.r(0.038, 0.048), p.head_normal(0.7, 0.5, side=s * 0.3))
        buttercup(p, (path[-1][0], path[-1][1] + 0.01), p.r(0.04, 0.05), p.head_normal(0.7, 0.45))
    for k in range(3):  # buds and fruit heads
        u = p.r(-0.3, 0.3)
        path = stem_path(p, 0, u, p.r(0.55, 0.95), p.r(-0.05, 0.05))
        p.stroke(path, 0.007, 0.005, hx('#6a9244'), hl=0)
        p.ball(path[-1][0], path[-1][1], 0.014, hx('#7aa040'), hl=0.25)


def f_lappig_blatt(p):
    # palmate basal leaves on long petioles: Hahnenfuß, Storchschnabel
    items = [(p.r(-1, 1), p.r(-0.33, 0.33), p.r(0.25, 0.85)) for _ in range(11)]
    items.sort()
    for z, u, h in items:
        path = stem_path(p, p.r(-0.03, 0.03), u, h - 0.05, p.r(-0.06, 0.06))
        p.stroke(path, 0.012, 0.008, hx('#5a8a3a'), hl=0)
        p.palmate((path[-1][0], path[-1][1]), p.r(0.1, 0.14), mul(p.jit(hx('#4a7a2e')), 0.88 + 0.12 * (z + 1) / 2), lobes=5 if p.r() < 0.5 else 7,
                  cut=p.r(0.55, 0.75), tilt=p.r(0.35, 0.65), rot=p.r(0, 6.28), teeth=3)


def crucifer(p, c, rad, nrm, col):
    """a flower of four petals (Wiesenschaumkraut, Weidenröschen)"""
    p.rays(c, nrm, rad * 0.15, rad, rad * 0.85, 4, col, col_tip=mix(col, (1, 1, 1), 0.25), cup=0.3, shape='spatel', jitter=0.15)
    p.dots([(c[0], c[1], rad * 0.14, hx('#e0d040'))])


def f_wiesenschaumkraut_bluete(p):
    # the small rosette of round leaflets
    for k in range(5):
        a = p.r(-1.3, 1.3)
        p.pinnate((0, 0), a, p.r(0.12, 0.2), 0.08, hx('#527f36'), pairs=3, leaflet='rund', bend=0.1, foreshort=p.r(0.6, 1))
    for k in range(p.ri(2, 3)):
        u_top = p.r(-0.12, 0.12)
        top = p.r(0.72, 0.84)
        path = stem_path(p, p.r(-0.02, 0.02), u_top, top, p.r(-0.04, 0.04))
        p.stroke(path, 0.012, 0.008, hx('#6a8f48'))
        for t in (0.3, 0.55):
            pt, d = p.at(path, t)
            p.pinnate(pt, math.atan2(d[0], d[1]) + (0.7 if p.r() < 0.5 else -0.7), 0.09, 0.03, hx('#557f3a'), pairs=3,
                      leaflet='linear', bend=0.05)
        # a loose raceme: open flowers below, buds at the top
        tip = path[-1]
        fl = []
        for i in range(7):
            a = 2 * math.pi * i / 7 + p.r(-0.3, 0.3)
            rr = 0.04 + 0.1 * (1 - i / 7)
            h = -0.03 + i * 0.014
            fl.append((math.sin(a) * rr, h + math.cos(a) * 0.012, i))
        fl.sort(key=lambda q: q[1])
        for du, dv, i in fl:
            q = (tip[0] + du, tip[1] + dv + 0.02)
            p.stroke([(tip[0], tip[1] - 0.02), q], 0.005, 0.004, hx('#7a9a56'), hl=0)
            if i < 5:
                crucifer(p, (q[0], q[1] + 0.005), p.r(0.05, 0.06), p.head_normal(0.55, 0.6, side=du * 3), hx('#dcc6ec'))
            else:
                p.ball(q[0], q[1] + 0.008, 0.012, mix(C['lila_hell'], hx('#a0b070'), 0.5), hl=0.15)


def plantain_leaf(p, base, a, L, c, fore, broad=False):
    if broad:
        p.leaf(base, a, L, L * 0.62, c, shape='oval', bend=-0.05 * (1 if a > 0 else -1), foreshort=fore)
    else:
        rib = p.leaf(base, a, L, L * 0.16, c, shape='lanzett', bend=-0.08 * (1 if a > 0 else -1), foreshort=fore)
        # parallel veins
        for off in (-0.25, 0.25):
            pts = []
            for i in range(2, len(rib) - 4):
                q = rib[i]
                pts.append((q[0] + off * L * 0.05 * math.cos(a), q[1] - off * L * 0.05 * math.sin(a)))
            if len(pts) > 2:
                p.stroke(pts, L * 0.008, L * 0.004, mix(c, (0.9, 0.95, 0.7), 0.25), hl=0)


def f_spitzwegerich_blatt(p):
    rosette(p, p.ri(9, 12), 0.6, 0.95, 0.15, hx('#4a7a32'), spread=0.7,
            fn=lambda p, b, a, L, c, f: plantain_leaf(p, b, a, L, c, f))


def f_spitzwegerich_bluete(p):
    rosette(p, p.ri(8, 10), 0.3, 0.45, 0.07, hx('#4a7a32'), spread=0.95,
            fn=lambda p, b, a, L, c, f: plantain_leaf(p, b, a, L, c, f))
    spikes = [(p.r(0.68, 0.98), p.r(-0.28, 0.28)) for _ in range(p.ri(4, 6))]
    spikes.sort(key=lambda h: -h[0])
    for top, u in spikes:
        path = stem_path(p, p.r(-0.03, 0.03), u, top - 0.09, p.r(-0.05, 0.05))
        p.stroke(path, 0.014, 0.011, hx('#7a9254'))
        _, d = p.at(path, 1)
        ang = math.atan2(d[0], d[1])
        base = path[-1]
        L = p.r(0.1, 0.13)
        # the dark spike, a ring of pale stamens around its lower part (flowering upwards)
        p.bell(base, ang, L, 0.045, hx('#4e3e28'), flare=-0.3, lobes=1)
        ring_t = p.r(0.25, 0.6)
        st = []
        for k in range(20):
            a = 2 * math.pi * k / 20
            q = (base[0] + math.sin(ang) * L * ring_t + math.cos(a) * 0.034, base[1] + math.cos(ang) * L * ring_t + math.sin(a) * 0.012)
            st.append((q[0], q[1], 0.0075, hx('#efe8c8')))
        p.dots(st)


def f_breitwegerich_bluete(p):
    # the broad leaves lie in a flat rosette: from the side they rise at a low angle to both sides, the front ones short
    leaves = [(a + p.r(-0.12, 0.12), p.r(0.2, 0.3), p.r(0.55, 1.0)) for a in (-1.25, -0.95, -0.6, -0.25, 0.25, 0.6, 0.95, 1.25)]
    p.rng.shuffle(leaves)
    for a, L, fore in leaves:
        c = p.jit(hx('#4c7c34'), 0.07)
        rib = p.leaf((p.r(-0.01, 0.01), 0.0), a, L, L * 0.55, c, shape='oval', bend=-0.08 * (1 if a > 0 else -1), foreshort=fore)
        for off in (-0.5, 0.5):  # the arching parallel veins
            pts = [(q[0] + off * L * 0.1 * math.cos(a), q[1] - off * L * 0.1 * math.sin(a)) for q in rib[3:-5]]
            p.stroke(pts, L * 0.012, L * 0.006, mix(c, (0.9, 0.95, 0.7), 0.3), hl=0)
    for k in range(p.ri(3, 4)):
        u = p.r(-0.25, 0.25)
        top = p.r(0.75, 0.98)
        path = stem_path(p, p.r(-0.02, 0.02), u, top, p.r(-0.05, 0.05))
        p.stroke(path[:12], 0.012, 0.011, hx('#7a8a54'))
        # the long slender spike: the upper half of the stalk, dotted with small green-brown fruits
        sp = path[11:]
        p.stroke(sp, 0.016, 0.008, hx('#7a7a44'), col1=hx('#8a8a5a'), hl=0)
        dts = []
        for i, q in enumerate(sp[:-1]):
            for s in (-1, 1):
                dts.append((q[0] + s * 0.007, q[1], 0.0055, hx('#6a6a3a') if i % 2 else hx('#8a8456')))
        p.dots(dts)


def margerite_head(p, c, rad, nrm):
    p.rays(c, nrm, rad * 0.3, rad, rad * 0.3, 22, C['weiss'], cup=0.08, shape='linear', notch=1, front=False, back_dark=0.84)
    p.disc(c, nrm, rad * 0.34, C['gelb'], dome=0.4)
    p.rays(c, nrm, rad * 0.3, rad, rad * 0.3, 22, C['weiss'], cup=0.1, shape='linear', notch=1, front=True, droop=0.05)


def leafy_herb(p, stems, top_rng, leaf_len, leaf_w, col, shape='lanzett', teeth=0, ts=None, stem_col=None, basal=0):
    """upright stems with alternate leaves (returns the stem paths) – the frame of many meadow herbs"""
    paths = []
    if basal:
        rosette(p, basal, leaf_len * 1.3, leaf_len * 2.2, leaf_w * 1.3, col, shape='spatel', spread=1.2, teeth=teeth)
    tops = sorted([(p.r(*top_rng), p.r(-0.25, 0.25)) for _ in range(stems)], key=lambda q: q[1])
    for top, u in tops:
        path = stem_path(p, p.r(-0.03, 0.03), u, top, p.r(-0.06, 0.06) - u * 0.2)
        p.stroke(path, 0.016, 0.009, stem_col or hx('#5f8a3c'))
        leaves_along(p, path, ts or [0.12, 0.3, 0.48, 0.66], leaf_len, leaf_w, col, shape=shape, teeth=teeth, ang=0.6)
        paths.append(path)
    return paths


def f_margerite_bluete(p):
    paths = leafy_herb(p, 5, (0.55, 0.88), 0.11, 0.032, hx('#4a7a32'), teeth=4, basal=6)
    heads = sorted([(path[-1], path) for path in paths], key=lambda q: -q[0][1])
    for tip, path in heads:
        margerite_head(p, (tip[0] * 1.15, tip[1] + 0.02), p.r(0.09, 0.11), p.head_normal(0.62, 0.55, side=tip[0] * 0.8))


def f_margerite_samen(p):
    paths = leafy_herb(p, p.ri(3, 4), (0.75, 0.92), 0.11, 0.03, hx('#5a7a38'), teeth=4, basal=5, stem_col=hx('#6f8a44'))
    for path in paths:
        tip = path[-1]
        nrm = p.head_normal(0.7, 0.5)
        # withered rays hanging down, the disc brown and domed
        p.rays((tip[0], tip[1] + 0.01), nrm, 0.018, 0.06, 0.016, 14, hx('#b0a080'), cup=-0.6, droop=0.8, shape='linear', jitter=0.3)
        p.disc((tip[0], tip[1] + 0.012), nrm, 0.032, hx('#a07830'), dome=0.9, hl=0.15)


def f_lanzett_blatt(p):
    leafy_herb(p, p.ri(4, 5), (0.7, 0.98), 0.17, 0.05, hx('#4c7c32'), teeth=3, basal=7, ts=[0.1, 0.25, 0.4, 0.55, 0.7, 0.84])


def campanula(p, base, ang, size, col):
    """a widely open bell of the Wiesen-Glockenblume: a short tube and five spreading pointed lobes"""
    mouth = p.bell(base, ang, size * 0.7, size * 0.5, mul(col, 0.9), inner=None, lobes=5, flare=0.6)
    nrm = (math.sin(ang) * 0.8, math.cos(ang) * 0.8, 0.55)
    p.rays(mouth, nrm, size * 0.05, size * 0.55, size * 0.32, 5, col, col_tip=mix(col, (1, 1, 1), 0.15), cup=0.25, shape='lanzett', jitter=0.1)
    p.disc(mouth, nrm, size * 0.12, mix(col, (1, 1, 1), 0.5), dome=0.2, hl=0.1)


def f_glockenblume_bluete(p):
    paths = leafy_herb(p, p.ri(2, 3), (0.55, 0.7), 0.09, 0.022, hx('#4f7d34'), ts=[0.15, 0.3, 0.45], basal=4)
    for path in paths:
        # a loose panicle: thin branches each with a bell
        for b in range(p.ri(3, 4)):
            t = p.r(0.55, 0.95)
            pt, d = p.at(path, t)
            s = 1 if b % 2 else -1
            tip = (pt[0] + s * p.r(0.08, 0.2), pt[1] + p.r(0.1, 0.25))
            br = p.bez(pt, (pt[0] + s * 0.04, (pt[1] + tip[1]) / 2 + 0.04), tip, 10)
            p.stroke(br, 0.006, 0.005, hx('#6a8a48'), hl=0)
            campanula(p, tip, s * p.r(0.2, 0.8), p.r(0.075, 0.09), p.jit(C['violett'], 0.05))
        campanula(p, path[-1], p.r(-0.3, 0.3), 0.085, C['violett'])


def geranium(p, c, rad, nrm):
    col = C['blauviolett']
    p.rays(c, nrm, rad * 0.12, rad, rad * 1.0, 5, col, col_tip=mix(col, hx('#a0a8e8'), 0.25), cup=0.35, shape='rund', jitter=0.06)
    n, e1, e2 = p.basis(nrm)
    # fine dark veins and the pale eye
    for k in range(10):
        a = 2 * math.pi * k / 10 + p.r(0, 0.2)
        d = math.cos(a) * e1 + math.sin(a) * e2
        q0 = d * rad * 0.2 + n * rad * 0.02
        q1 = d * rad * 0.75 + n * rad * 0.2
        p.stroke([(c[0] + q0[0], c[1] + q0[1]), (c[0] + q1[0], c[1] + q1[1])], 0.004, 0.002, mul(col, 0.7), hl=0)
    p.disc(c, nrm, rad * 0.25, hx('#d8d8f0'), dome=0.3, hl=0.1)


def f_storchschnabel_bluete(p):
    # deeply cut leaves on the stems, flowers in pairs on top
    for k in range(5):
        q = (p.r(-0.25, 0.25), p.r(0.12, 0.45))
        p.stroke([(p.r(-0.03, 0.03), 0), q], 0.01, 0.007, hx('#5a8a3a'), hl=0)
        p.palmate(q, p.r(0.08, 0.12), p.jit(hx('#4a7a2e')), lobes=7, cut=0.8, tilt=p.r(0.35, 0.6), rot=p.r(0, 6.28), teeth=4)
    for k in range(p.ri(3, 4)):
        u = p.r(-0.25, 0.25)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.65, 0.82), p.r(-0.08, 0.08))
        p.stroke(path, 0.013, 0.008, hx('#5f8a3c'))
        pt, d = p.at(path, 0.6)
        p.palmate(pt, 0.07, hx('#4c7c30'), lobes=7, cut=0.8, tilt=0.5, rot=p.r(0, 6.28))
        tip = path[-1]
        for s in (-1, 1):
            q = (tip[0] + s * p.r(0.04, 0.08), tip[1] + p.r(0.05, 0.12))
            p.stroke([tip, q], 0.006, 0.005, hx('#6a8a48'), hl=0)
            if p.r() < 0.8:
                geranium(p, q, p.r(0.075, 0.09), p.head_normal(0.6, 0.6, side=s * 0.4))
            else:
                p.ball(q[0], q[1], 0.018, hx('#6a7aa0'), hl=0.2)


def knapweed(p, c, rad, nrm, col):
    # the brown fringed involucre, then the brush of florets with the enlarged outer ones spreading
    p.ball(c[0], c[1] - rad * 0.35, rad * 0.42, hx('#6a5034'), hl=0.15)
    for k in range(10):
        a = p.r(0, 6.28)
        p.dots([(c[0] + math.cos(a) * rad * 0.35, c[1] - rad * 0.35 + math.sin(a) * rad * 0.3, rad * 0.06, hx('#3a2a1a'))])
    p.rays(c, nrm, rad * 0.15, rad * 1.15, rad * 0.34, 16, col, col_tip=mix(col, hx('#ec9ad4'), 0.45), cup=0.4, shape='trichter', jitter=0.25,
           length_jit=0.2, notch=1)
    p.globe((c[0], c[1] + rad * 0.12), rad * 0.3, mul(col, 0.85), count=20, fl=0.4, elong=1.4, squash=0.6, dark=0.55)


def f_flockenblume_bluete(p):
    paths = leafy_herb(p, p.ri(2, 3), (0.62, 0.8), 0.11, 0.025, hx('#4c7a34'), ts=[0.1, 0.25, 0.4, 0.55], basal=4)
    for path in paths:
        for b in range(p.ri(1, 2)):
            t = p.r(0.55, 0.85)
            pt, d = p.at(path, t)
            s = 1 if b % 2 else -1
            tip = (pt[0] + s * p.r(0.08, 0.16), pt[1] + p.r(0.12, 0.2))
            br = p.bez(pt, (pt[0] + s * 0.04, (pt[1] + tip[1]) / 2 + 0.04), tip, 10)
            p.stroke(br, 0.008, 0.006, hx('#5f8a3c'), hl=0)
            if p.r() < 0.75:
                knapweed(p, tip, p.r(0.06, 0.075), p.head_normal(0.75, 0.45), p.jit(C['purpur'], 0.05))
            else:
                p.ball(tip[0], tip[1], 0.025, hx('#6a5034'), hl=0.15)
        knapweed(p, path[-1], p.r(0.065, 0.08), p.head_normal(0.75, 0.45), C['purpur'])


def f_wiesenpippau_bluete(p):
    loewenzahn_rosette(p, 0.3)
    paths = []
    for k in range(p.ri(2, 3)):
        u = p.r(-0.12, 0.12)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.55, 0.7), p.r(-0.05, 0.05))
        p.stroke(path, 0.015, 0.01, hx('#6a9a44'))
        leaves_along(p, path, [0.2, 0.42], 0.13, 0.04, hx('#5a8a38'), teeth=3, ang=0.5)
        paths.append(path)
    for path in paths:
        tip = path[-1]
        for b in range(p.ri(4, 6)):
            s = -1 + 2 * (b % 2)
            q = (tip[0] + s * p.r(0.04, 0.22), tip[1] + p.r(0.12, 0.3))
            br = p.bez(tip, (tip[0] + s * 0.03, (tip[1] + q[1]) / 2), q, 8)
            p.stroke(br, 0.007, 0.006, hx('#6a9a44'), hl=0)
            if p.r() < 0.8:
                dandelion_head(p, q, p.r(0.045, 0.058), nrm=p.head_normal(0.7, 0.5, side=s * 0.3), col=hx('#f2c418'))
            else:
                dandelion_bud(p, q, 0.016, s * 0.3)


def f_vogelwicke_bluete(p):
    # weak climbing stems with pinnate leaves; one-sided racemes of small violet flowers hanging from their axis
    for k in range(p.ri(4, 5)):
        u = p.r(-0.28, 0.28)
        top = p.r(0.55, 0.92)
        path = stem_path(p, p.r(-0.05, 0.05), u, top, p.r(-0.15, 0.15))
        p.stroke(path, 0.009, 0.006, hx('#6a8a4a'), hl=0)
        for t in (0.3, 0.55, 0.78):
            pt, d = p.at(path, t)
            a = math.atan2(d[0], d[1]) + (0.8 if p.r() < 0.5 else -0.8)
            p.pinnate(pt, a, p.r(0.12, 0.16), 0.07, hx('#557f3a'), pairs=7, leaflet='lanzett', bend=0.15, fine=0.9)
        # the raceme from the upper part
        pt, d = p.at(path, p.r(0.75, 0.95))
        s = 1 if p.r() < 0.5 else -1
        L = p.r(0.14, 0.2)
        ax = p.bez(pt, (pt[0] + s * L * 0.6, pt[1] + L * 0.5), (pt[0] + s * L, pt[1] + L * 0.2), 12)
        p.stroke(ax, 0.008, 0.005, hx('#6a7a4a'), hl=0)
        for i in range(18):
            q, dd = p.at(ax, 0.2 + 0.8 * i / 17)
            col = p.jit(hx('#6c5cc0'), 0.06) if i > 3 else mix(hx('#6c5cc0'), hx('#a090d8'), 0.4)
            p.ellipse(q[0] + p.r(-0.004, 0.004), q[1] - 0.014, 0.011, 0.02, 0.25 * s, mul(col, 0.85), n=10)
            p.ellipse(q[0] - 0.003, q[1] - 0.008, 0.007, 0.011, 0.25 * s, mix(col, (1, 1, 1), 0.2), n=8)


def f_labkraut_bluete(p):
    # much branched airy stems with whorls of narrow leaves, a white frothy cloud of tiny flowers
    paths = []
    for k in range(p.ri(3, 4)):
        u = p.r(-0.2, 0.2)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.55, 0.72), p.r(-0.1, 0.1))
        p.stroke(path, 0.011, 0.007, hx('#6a8f48'))
        for t in (0.18, 0.36, 0.54):
            pt, d = p.at(path, t)
            for w in range(6):
                a = math.atan2(d[0], d[1]) + (w - 2.5) * 0.45
                p.leaf(pt, a, 0.05, 0.009, hx('#4f7d34'), shape='linear', rib=False, foreshort=p.r(0.5, 1))
        paths.append(path)
    dots = []
    for path in paths:
        tip = path[-1]
        for b in range(p.ri(6, 9)):
            s = p.r(-1, 1)
            q = (tip[0] + s * p.r(0.05, 0.25), tip[1] + p.r(0.0, 0.25))
            br = p.bez(tip, (tip[0] + s * 0.04, (tip[1] + q[1]) / 2 + 0.03), q, 8)
            p.stroke(br, 0.004, 0.003, hx('#7a9a56'), hl=0)
            for f in range(p.ri(14, 22)):
                a = p.r(0, 6.28)
                rr = p.r(0, 0.045)
                dots.append((q[0] + math.cos(a) * rr, q[1] + math.sin(a) * rr * 0.7, p.r(0.005, 0.008),
                             mix(C['weiss'], hx('#c8c8b0'), p.r(0, 0.4) if math.sin(a) < 0 else 0.0)))
    dots.sort(key=lambda d: -d[1])
    p.dots(dots)


def hypericum(p, c, rad, nrm):
    p.rays(c, nrm, rad * 0.1, rad, rad * 0.55, 5, hx('#f2c418'), col_tip=hx('#ffd84a'), cup=0.1, shape='oval', jitter=0.25)
    st = []
    for k in range(26):
        a = p.r(0, 6.28)
        rr = p.r(0.05, 0.55) * rad
        st.append((c[0] + math.cos(a) * rr, c[1] + math.sin(a) * rr * 0.6 + rad * 0.08, rad * 0.06, hx('#ffe060') if k % 3 else hx('#c08010')))
    p.dots(st)


def f_johanniskraut_bluete(p):
    paths = []
    for k in range(p.ri(3, 4)):
        u = p.r(-0.15, 0.15)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.62, 0.78), p.r(-0.05, 0.05))
        p.stroke(path, 0.012, 0.008, hx('#8a7a40'), col1=hx('#7a8a44'))
        leaves_along(p, path, [0.15, 0.3, 0.45, 0.58], 0.07, 0.03, hx('#4f7d34'), shape='oval', opp=True, alt=False, ang=0.9)
        paths.append(path)
    for path in paths:
        tip = path[-1]
        for b in range(p.ri(5, 7)):
            s = p.r(-1, 1)
            q = (tip[0] + s * p.r(0.03, 0.18), tip[1] + p.r(0.04, 0.2))
            br = p.bez(tip, (tip[0] + s * 0.04, (tip[1] + q[1]) / 2), q, 8)
            p.stroke(br, 0.005, 0.004, hx('#6a7a3a'), hl=0)
            if p.r() < 0.75:
                hypericum(p, q, p.r(0.04, 0.05), p.head_normal(0.7, 0.55, side=s * 0.3))
            else:
                p.ball(q[0], q[1], 0.012, hx('#e0a020'), hl=0.25)


def corymb(p, tip, width, count, florets, col, head_r, height=0.05, dome=0.3, rays_col=None, ray_w=0.004, flat=0.35):
    """a flat-topped cluster of small heads (Schafgarbe, Rainfarn, dried ones): branches from below to a shallow dome"""
    heads = []
    for k in range(count):
        a = p.r(0, 6.28)
        rr = width * math.sqrt(p.r(0, 1))
        x = math.cos(a) * rr
        z = math.sin(a) * rr
        y = height + dome * width * (1 - (rr / width) ** 2) * 0.3
        heads.append((z, (tip[0] + x, tip[1] + y + z * flat * 0.25)))
    heads.sort(key=lambda q: q[0])
    for z, q in heads:
        p.stroke([tip, (q[0] * 0.6 + tip[0] * 0.4, q[1] - 0.02), q], ray_w, ray_w * 0.7, rays_col or hx('#7a9456'), hl=0)
    items = []
    for z, q in heads:
        k = 0.8 + 0.2 * (z / width + 1) / 2
        for f in range(florets):
            a = p.r(0, 6.28)
            rr = p.r(0, head_r)
            items.append((q[1] + math.sin(a) * rr * 0.5, (q[0] + math.cos(a) * rr, q[1] + math.sin(a) * rr * 0.5, head_r * 0.45, mul(p.jit(col, 0.05), k))))
    items.sort(key=lambda q: q[0])
    p.dots([q[1] for q in items])
    # light on top
    tops = [(q[0] - head_r * 0.2, q[1] + head_r * 0.3, head_r * 0.35, mix(col, (1, 1, 1), 0.2)) for z, q in heads if z > 0]
    p.dots(tops)


def feathery_leaf(p, base, a, L, c, fore=1.0):
    """the finely cut leaf of Schafgarbe and Kamille"""
    p.pinnate(base, a, L, L * 0.28, c, pairs=10, sub=0, leaflet='linear', bend=0.1 * (1 if a > 0 else -1), foreshort=fore, fine=0.5)


def f_schafgarbe_bluete(p):
    rosette(p, 6, 0.25, 0.4, 0.1, hx('#4c7c34'), spread=1.2, fn=lambda p, b, a, L, c, f: feathery_leaf(p, b, a, L, c, f))
    paths = []
    for k in range(p.ri(2, 3)):
        u = p.r(-0.15, 0.15)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.72, 0.86), p.r(-0.05, 0.05))
        p.stroke(path, 0.014, 0.01, hx('#6f8a50'))
        for t in (0.2, 0.38, 0.55):
            pt, d = p.at(path, t)
            feathery_leaf(p, pt, math.atan2(d[0], d[1]) + (0.7 if p.r() < 0.5 else -0.7), 0.13, hx('#4f7d38'))
        paths.append(path)
    for path in sorted(paths, key=lambda q: q[-1][1]):
        corymb(p, path[-1], p.r(0.12, 0.16), 26, 7, C['weiss'], 0.016, height=0.05)


def f_dolde_trocken(p):
    # dry stems with flat brown heads (Schafgarbe, Rainfarn in autumn and winter)
    paths = []
    for k in range(p.ri(3, 4)):
        u = p.r(-0.2, 0.2)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.75, 0.88), p.r(-0.08, 0.08))
        p.stroke(path, 0.013, 0.009, hx('#8a7a5e'), col1=hx('#9a8a6a'))
        for t in (0.25, 0.45, 0.62):
            pt, d = p.at(path, t)
            p.pinnate(pt, math.atan2(d[0], d[1]) + (0.9 if p.r() < 0.5 else -0.9), 0.1, 0.04, hx('#7a6a4e'), pairs=5, leaflet='linear',
                      bend=0.3, fine=0.6, rachis=hx('#7a6a4e'))
        paths.append(path)
    for path in paths:
        corymb(p, path[-1], p.r(0.1, 0.14), 22, 6, hx('#6e5a42'), 0.016, height=0.045, rays_col=hx('#8a7a5e'))


def f_fieder_blatt(p):
    # feathery basal leaves arching from the foot: Wilde Möhre, Wiesenkerbel, Rainfarn, Mohn, Kamille, Schafgarbe
    items = [(p.r(-1, 1), p.r(-1.2, 1.2), p.r(0.55, 0.95)) for _ in range(9)]
    items.sort()
    for z, a, L in items:
        p.pinnate((p.r(-0.02, 0.02), 0), a * 0.8, L, 0.32, mul(p.jit(hx('#4c7c30')), 0.85 + 0.15 * (z + 1) / 2), pairs=7, sub=3,
                  leaflet='lanzett', bend=-0.15 * (1 if a > 0 else -1), foreshort=p.r(0.65, 1), fine=0.9)


def umbel(p, tip, rad, rays_n, flowers_n, col, height=0.06, dome=0.15, ray_col=None, fl_r=0.009, center=None, outer_big=0.0,
          concave=0.0, umbellet_r=None, droop_rays=0.0, flat=0.35, seeds=False):
    """a compound umbel seen from the side and a little above: rays from the tip of the stem up to umbellets on a shallow dome
    (concave < 0: a bird's nest); each umbellet a small cluster of florets"""
    ur = umbellet_r or rad * 0.22
    lets = []
    for k in range(rays_n):
        a = 2 * math.pi * k / rays_n + p.r(-0.15, 0.15)
        rr = rad * (0.35 + 0.65 * math.sqrt(p.r(0.2, 1.0))) if k % 3 else rad * p.r(0.15, 0.4)
        x, z = math.cos(a) * rr, math.sin(a) * rr
        y = height + dome * rad * (1 - (rr / rad) ** 2) + concave * (rr / rad) ** 2 * rad
        lets.append((z, x, y, rr))
    lets.sort(key=lambda q: q[0])
    rc = ray_col or hx('#7a9456')
    for z, x, y, rr in lets:
        q = (tip[0] + x, tip[1] + y + z * flat * 0.3)
        mid = (tip[0] + x * 0.5, tip[1] + y * 0.45 + z * flat * 0.1 - droop_rays * rr)
        p.stroke(p.bez(tip, mid, q, 6), 0.0045, 0.0035, rc, hl=0)
    items = []
    for z, x, y, rr in lets:
        q = (tip[0] + x, tip[1] + y + z * flat * 0.3)
        kz = 0.82 + 0.18 * (z / rad + 1) / 2
        big = 1 + outer_big * (rr / rad) ** 3
        for f in range(flowers_n):
            a = p.r(0, 6.28)
            r2 = ur * math.sqrt(p.r(0, 1))
            fu = q[0] + math.cos(a) * r2
            fv = q[1] + math.sin(a) * r2 * 0.45 + ur * 0.25 * (1 - (r2 / ur) ** 2)
            items.append((fv, (fu, fv, fl_r * big * p.r(0.8, 1.2), mul(p.jit(col, 0.04), kz * (0.88 if math.sin(a) < 0 else 1.0)))))
    items.sort(key=lambda q: -q[0] if seeds else q[0])
    p.dots([q[1] for q in items])
    if center is not None:
        p.dots([(tip[0], tip[1] + height + dome * rad + 0.004, fl_r * 1.6, center)])


def f_wilde_moehre_bluete(p):
    rosette(p, 5, 0.2, 0.32, 0.12, hx('#4c7c30'), fn=lambda p, b, a, L, c, f: p.pinnate(b, a, L, L * 0.35, c, pairs=5, sub=3, fine=0.8, foreshort=f))
    paths = []
    for k in range(p.ri(2, 3)):
        u = p.r(-0.18, 0.18)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.72, 0.85), p.r(-0.06, 0.06))
        p.stroke(path, 0.013, 0.009, hx('#6a8a48'))
        pt, d = p.at(path, 0.35)
        p.pinnate(pt, math.atan2(d[0], d[1]) + (0.7 if p.r() < 0.5 else -0.7), 0.15, 0.06, hx('#4f7d34'), pairs=5, sub=2, fine=0.8)
        paths.append(path)
    for path in paths:
        # the bracts below the umbel (pinnate, thread-like) and the white umbel with its dark middle floret
        tip = path[-1]
        for s in (-1, -0.4, 0.4, 1):
            p.stroke([tip, (tip[0] + s * 0.06, tip[1] - 0.02)], 0.003, 0.002, hx('#7a9456'), hl=0)
        umbel(p, tip, p.r(0.13, 0.16), 24, 14, C['weiss'], height=0.05, dome=0.1, fl_r=0.008, center=hx('#4a1a3a'), outer_big=0.4)


def f_wilde_moehre_samen(p):
    rosette(p, 4, 0.18, 0.28, 0.1, hx('#5a7a3a'), fn=lambda p, b, a, L, c, f: p.pinnate(b, a, L, L * 0.35, c, pairs=5, sub=3, fine=0.8, foreshort=f))
    paths = []
    for k in range(3):
        u = p.r(-0.18, 0.18)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.75, 0.86), p.r(-0.06, 0.06))
        p.stroke(path, 0.013, 0.009, hx('#7f8a52'), col1=hx('#8f8a5e'))
        pt, d = p.at(path, 0.35)
        p.pinnate(pt, math.atan2(d[0], d[1]) + 0.8, 0.12, 0.05, hx('#6a7a44'), pairs=4, sub=2, fine=0.8)
        paths.append(path)
    for path in paths:
        tip = path[-1]
        # the bird's nest: rays curved inwards, the bristly fruits brown-green
        umbel(p, tip, p.r(0.1, 0.12), 24, 12, hx('#7a6a48'), height=0.06, dome=-0.35, concave=0.9, fl_r=0.01, ray_col=hx('#8a8456'),
              seeds=True)


def f_baerenklau_bluete(p):
    for k in range(3):
        q = (p.r(-0.2, 0.2), p.r(0.08, 0.2))
        p.stroke([(0, 0), q], 0.014, 0.01, hx('#6a8a44'), hl=0)
        p.palmate(q, p.r(0.1, 0.13), p.jit(hx('#4c7a30')), lobes=5, cut=0.55, tilt=p.r(0.4, 0.6), rot=p.r(0, 6.28), teeth=4)
    paths = []
    for k in range(2):
        u = p.r(-0.15, 0.15)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.72, 0.84), p.r(-0.05, 0.05))
        p.stroke(path, 0.02, 0.013, hx('#6a8a44'))
        pt, d = p.at(path, 0.4)
        p.palmate((pt[0] + 0.08 * (1 if u < 0 else -1), pt[1] + 0.02), 0.09, hx('#4a7a30'), lobes=5, cut=0.55, tilt=0.5, rot=p.r(0, 6.28))
        paths.append(path)
    for path in paths:
        umbel(p, path[-1], p.r(0.16, 0.19), 18, 16, hx('#efebdd'), height=0.04, dome=0.05, fl_r=0.009, outer_big=0.9)
    # a smaller side umbel
    pt, d = p.at(paths[0], 0.7)
    q = (pt[0] - 0.12, pt[1] + 0.08)
    p.stroke([pt, q], 0.01, 0.008, hx('#6a8a44'), hl=0)
    umbel(p, q, 0.08, 10, 10, hx('#ebe6d6'), height=0.03, dome=0.05, fl_r=0.008)


def f_baerenklau_samen(p):
    paths = []
    for k in range(2):
        u = p.r(-0.15, 0.15)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.74, 0.86), p.r(-0.05, 0.05))
        p.stroke(path, 0.02, 0.013, hx('#7a8a4c'), col1=hx('#8a8a56'))
        pt, d = p.at(path, 0.35)
        p.palmate((pt[0] + 0.08 * (1 if u < 0 else -1), pt[1]), 0.08, hx('#5a7a38'), lobes=5, cut=0.55, tilt=0.5, rot=p.r(0, 6.28))
        paths.append(path)
    for path in paths:
        # flat round fruits, pale green-brown, in loose umbellets
        umbel(p, path[-1], p.r(0.15, 0.18), 16, 7, hx('#b8b08a'), height=0.045, dome=0.05, fl_r=0.012, ray_col=hx('#8a9056'))


def f_baerenklau_blatt(p):
    # big rough leaves on thick petioles: pinnate with broad lobed leaflets
    items = [(p.r(-1, 1), p.r(-1.0, 1.0), p.r(0.55, 0.95)) for _ in range(6)]
    items.sort()
    for z, a, L in items:
        base = (p.r(-0.03, 0.03), 0)
        tip = (base[0] + math.sin(a) * L * 0.55, base[1] + math.cos(a) * L * 0.75)
        path = p.bez(base, (base[0] + math.sin(a) * L * 0.2, L * 0.45), tip, 12)
        p.stroke(path, 0.018, 0.012, hx('#6a8a44'), hl=0.1)
        c = mul(p.jit(hx('#4a7a2e')), 0.85 + 0.15 * (z + 1) / 2)
        for t, sz in ((0.55, 0.1), (0.8, 0.12), (1.0, 0.15)):
            q, d = p.at(path, t)
            off = 0.07 if t < 1 else 0
            for s in ((-1, 1) if t < 1 else (0,)):
                p.palmate((q[0] + s * off, q[1] + 0.01), sz, p.jit(c, 0.05), lobes=3 if t < 1 else 5, cut=0.5, tilt=p.r(0.45, 0.65),
                          rot=p.r(0, 6.28), teeth=4)


def f_wiesenkerbel_bluete(p):
    paths = []
    for k in range(p.ri(3, 4)):
        u = p.r(-0.2, 0.2)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.7, 0.85), p.r(-0.06, 0.06))
        p.stroke(path, 0.015, 0.009, hx('#6a8a44'), col1=hx('#7a7a4a'))
        paths.append(path)
    # the fern-like leaves low, light green
    for k in range(6):
        a = p.r(-1.1, 1.1)
        p.pinnate((p.r(-0.03, 0.03), 0), a, p.r(0.3, 0.45), 0.18, p.jit(hx('#5a8c38')), pairs=6, sub=3, fine=0.9,
                  bend=-0.15 * (1 if a > 0 else -1), foreshort=p.r(0.6, 1))
    for path in paths:
        pt, d = p.at(path, 0.5)
        p.pinnate(pt, math.atan2(d[0], d[1]) + (0.8 if p.r() < 0.5 else -0.8), 0.12, 0.06, hx('#5a8a38'), pairs=4, sub=2, fine=0.8)
        tip = path[-1]
        umbel(p, tip, p.r(0.12, 0.15), 11, 12, hx('#f6f5ee'), height=0.05, dome=0.12, fl_r=0.0075, umbellet_r=0.032)
        # a side umbel
        q0, d = p.at(path, 0.8)
        s = 1 if p.r() < 0.5 else -1
        q = (q0[0] + s * 0.1, q0[1] + 0.06)
        p.stroke([q0, q], 0.007, 0.006, hx('#6a8a44'), hl=0)
        umbel(p, q, 0.08, 8, 10, hx('#f2f1e8'), height=0.04, dome=0.12, fl_r=0.007, umbellet_r=0.026)


def f_wiesenkerbel_samen(p):
    paths = []
    for k in range(p.ri(3, 4)):
        u = p.r(-0.2, 0.2)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.72, 0.86), p.r(-0.06, 0.06))
        p.stroke(path, 0.015, 0.009, hx('#7a8a4a'), col1=hx('#7a6a4a'))
        paths.append(path)
    for k in range(4):
        a = p.r(-1.1, 1.1)
        p.pinnate((0, 0), a, p.r(0.2, 0.32), 0.14, p.jit(hx('#5f8a3a')), pairs=5, sub=2, fine=0.9, foreshort=p.r(0.6, 1))
    for path in paths:
        tip = path[-1]
        # slender dark seeds in pairs at the ray tips, standing up
        lets = []
        for k in range(10):
            a = 2 * math.pi * k / 10 + p.r(-0.2, 0.2)
            rr = p.r(0.04, 0.13)
            lets.append((math.sin(a) * rr, (tip[0] + math.cos(a) * rr, tip[1] + 0.06 + math.sin(a) * rr * 0.12)))
        lets.sort()
        for z, q in lets:
            p.stroke([tip, ((tip[0] + q[0]) / 2, (tip[1] + q[1]) / 2 + 0.01), q], 0.004, 0.003, hx('#7a8a4a'), hl=0)
            for s in range(p.ri(3, 5)):
                du = p.r(-0.02, 0.02)
                p.ellipse(q[0] + du, q[1] + 0.012, 0.0045, 0.014, du * 8, p.jit(hx('#3e3a22'), 0.08), n=8)


def f_rainfarn_bluete(p):
    paths = []
    for k in range(p.ri(3, 4)):
        u = p.r(-0.18, 0.18)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.75, 0.88), p.r(-0.05, 0.05))
        p.stroke(path, 0.015, 0.011, hx('#5a7a3a'), col1=hx('#6a7a3e'))
        for t in (0.12, 0.28, 0.44, 0.6):
            pt, d = p.at(path, t)
            p.pinnate(pt, math.atan2(d[0], d[1]) + (0.75 if (int(t * 10) % 2) else -0.75), 0.16 * (1 - t * 0.4), 0.07, p.jit(hx('#3f6a2a')),
                      pairs=7, leaflet='lanzett', bend=0.15, fine=0.8)
        paths.append(path)
    for path in paths:
        tip = path[-1]
        heads = []
        for k in range(18):
            a = p.r(0, 6.28)
            rr = 0.11 * math.sqrt(p.r(0, 1))
            heads.append((math.sin(a) * rr, (tip[0] + math.cos(a) * rr, tip[1] + 0.05 + math.sin(a) * rr * 0.12)))
        heads.sort()
        for z, q in heads:
            p.stroke([tip, ((tip[0] + q[0]) / 2, (tip[1] + q[1]) / 2), q], 0.004, 0.003, hx('#6a8a48'), hl=0)
        for z, q in heads:
            p.ball(q[0], q[1], p.r(0.013, 0.016), p.jit(C['gold'], 0.05), hl=0.25, dark=0.6)


def chicory(p, c, rad, nrm):
    col = C['himmelblau']
    p.rays(c, nrm, rad * 0.15, rad, rad * 0.36, 16, col, col_tip=mix(col, hx('#c0d4f8'), 0.3), cup=0.05, shape='linear', notch=1, jitter=0.12)
    p.disc(c, nrm, rad * 0.22, hx('#4a5ab0'), dome=0.2, hl=0.1)


def f_wegwarte_bluete(p):
    loewenzahn_rosette(p, 0.22)
    paths = []
    for k in range(p.ri(2, 3)):
        u = p.r(-0.15, 0.15)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.82, 0.95), p.r(-0.05, 0.05))
        p.stroke(path, 0.013, 0.009, hx('#6a8a4e'))
        paths.append(path)
    for path in paths:
        # stiff zigzag branches with flowers sitting in the axils
        for b in range(p.ri(3, 4)):
            t = p.r(0.35, 0.8)
            pt, d = p.at(path, t)
            s = 1 if b % 2 else -1
            q = (pt[0] + s * p.r(0.1, 0.18), pt[1] + p.r(0.08, 0.16))
            p.stroke([pt, ((pt[0] + q[0]) / 2 + s * 0.01, (pt[1] + q[1]) / 2 - 0.01), q], 0.008, 0.006, hx('#6a8a4e'), hl=0)
            chicory(p, q, p.r(0.05, 0.06), p.head_normal(0.4, 0.7, side=s * 0.45))
            if p.r() < 0.6:
                mid = ((pt[0] + q[0]) / 2, (pt[1] + q[1]) / 2)
                p.ball(mid[0], mid[1] + 0.01, 0.011, hx('#7a8a5a'), hl=0.2)
        chicory(p, path[-1], 0.055, p.head_normal(0.5, 0.65))
        pt, d = p.at(path, 0.55)
        chicory(p, (pt[0] + 0.02, pt[1]), 0.05, p.head_normal(0.3, 0.8, side=-0.3))


def poppy(p, c, rad, nrm):
    col = C['rot']
    n, e1, e2 = p.basis(nrm)
    # back petals, the capsule with the stamens, front petals (big, crumpled)
    p.rays(c, nrm, rad * 0.05, rad, rad * 1.35, 4, mul(col, 0.92), col_tip=hx('#f03a2a'), cup=1.2, shape='rund', jitter=0.25, front=False,
           back_dark=0.7, length_jit=0.12)
    p.ball(c[0], c[1] + rad * 0.15, rad * 0.22, hx('#4a6a3a'), hl=0.2)
    st = []
    for k in range(30):
        a = p.r(0, 6.28)
        st.append((c[0] + math.cos(a) * rad * 0.3, c[1] + rad * 0.12 + math.sin(a) * rad * 0.12, rad * 0.05, hx('#1a1418')))
    p.dots(st)
    p.ellipse(c[0], c[1] + rad * 0.32, rad * 0.16, rad * 0.06, 0, hx('#2a2030'), n=12)
    p.rays(c, nrm, rad * 0.05, rad, rad * 1.35, 4, col, col_tip=hx('#ff4a30'), cup=1.0, shape='rund', jitter=0.25, front=True,
           back_dark=0.7, length_jit=0.12)
    # the black blotches at the petals' base are seen inside the cup
    for k in range(2):
        a = p.r(0, 6.28)
        q = (math.cos(a) * e1 + math.sin(a) * e2) * rad * 0.3 + n * rad * 0.12
        p.ellipse(c[0] + q[0], c[1] + q[1], rad * 0.1, rad * 0.06, a, hx('#1a1214'), n=10)


def poppy_bud(p, tip, rad):
    """the nodding hairy bud on its hooked stalk"""
    p.ellipse(tip[0], tip[1] - rad * 0.8, rad * 0.65, rad, 0.2, hx('#5a7a3e'), n=16)
    p.ellipse(tip[0] - rad * 0.15, tip[1] - rad * 0.65, rad * 0.4, rad * 0.65, 0.2, hx('#7a9a54'), n=12)
    hairs = []
    for k in range(14):
        a = p.r(0, 6.28)
        q0 = (tip[0] + math.cos(a) * rad * 0.6, tip[1] - rad * 0.8 + math.sin(a) * rad * 0.9)
        q1 = (q0[0] + math.cos(a) * rad * 0.35, q0[1] + math.sin(a) * rad * 0.35)
        hairs.append((q0, q1))
    p.soft_lines(hairs, (0.85, 0.88, 0.75), 1.2, 0.6)


def f_klatschmohn_bluete(p):
    for k in range(4):
        a = p.r(-1.2, 1.2)
        p.leaf((0, 0), a, p.r(0.18, 0.26), 0.07, p.jit(hx('#5a8040')), teeth=5, tooth=0.6, bend=-0.1 * (1 if a > 0 else -1), foreshort=p.r(0.6, 1))
    stems = sorted([(top, u) for top, u in zip((0.86, 0.74, 0.64, 0.8), (-0.26, 0.24, -0.05, 0.08))][: p.ri(3, 4)], key=lambda q: -q[0])
    for top, u in stems:
        path = stem_path(p, p.r(-0.03, 0.03), u, top + p.r(-0.03, 0.03), p.r(-0.04, 0.04))
        p.stroke(path, 0.012, 0.009, hx('#6a8f48'))
        leaves_along(p, path, [0.2, 0.4], 0.1, 0.035, hx('#5a8040'), teeth=4, ang=0.55)
        poppy(p, (path[-1][0], path[-1][1] + 0.02), p.r(0.085, 0.1), p.head_normal(0.7, 0.45, side=u * 0.6))
    for k in range(2):
        u = p.r(-0.3, 0.3)
        top = p.r(0.5, 0.68)
        path = stem_path(p, 0, u, top, p.r(-0.05, 0.05))
        # the hook at the top
        hook = p.bez(path[-1], (path[-1][0] + 0.03, path[-1][1] + 0.04), (path[-1][0] + 0.05, path[-1][1] - 0.01), 8)
        p.stroke(path + hook[1:], 0.009, 0.007, hx('#6a8f48'), hl=0)
        poppy_bud(p, hook[-1], 0.022)


def f_klatschmohn_frucht(p):
    for k in range(3):
        a = p.r(-1.2, 1.2)
        p.leaf((0, 0), a, p.r(0.15, 0.22), 0.06, p.jit(hx('#6a8044')), teeth=5, tooth=0.6, foreshort=p.r(0.6, 1))
    stems = sorted([(p.r(0.62, 0.86), p.r(-0.25, 0.25)) for _ in range(4)], key=lambda q: -q[0])
    for top, u in stems:
        path = stem_path(p, p.r(-0.03, 0.03), u, top, p.r(-0.06, 0.06))
        p.stroke(path, 0.011, 0.009, hx('#7a9050'))
        tip = path[-1]
        # the pepper-pot capsule with its flat lid of stigma rays
        p.ellipse(tip[0], tip[1] + 0.035, 0.026, 0.04, 0, hx('#6a8a5a'), grad=((tip[0] - 0.02, tip[1] + 0.06), (tip[0] + 0.02, tip[1] + 0.01), hx('#9ab08a'), hx('#5a7a4a')))
        p.ellipse(tip[0], tip[1] + 0.075, 0.03, 0.009, 0, hx('#5a6a4a'), n=16)
        for s in range(6):
            a = math.pi * s / 6
            p.stroke([(tip[0], tip[1] + 0.077), (tip[0] + math.cos(a) * 0.028, tip[1] + 0.074 + math.sin(a) * 0.006)], 0.003, 0.002,
                     hx('#3a3a2a'), hl=0)
    # one last flower
    path = stem_path(p, 0, 0.18, 0.55, 0.03)
    p.stroke(path, 0.01, 0.008, hx('#6a8f48'))
    poppy(p, (path[-1][0], path[-1][1] + 0.015), 0.06, p.head_normal(0.6, 0.5))


def cornflower(p, c, rad, nrm):
    # the involucre: a scaly green cup with dark fringed edges
    p.ellipse(c[0], c[1] - rad * 0.35, rad * 0.35, rad * 0.42, 0, hx('#6a8a5a'), n=14)
    for k in range(8):
        a = p.r(0, 6.28)
        p.dots([(c[0] + math.cos(a) * rad * 0.28, c[1] - rad * 0.35 + math.sin(a) * rad * 0.3, rad * 0.05, hx('#3a3a2e'))])
    col = C['blau']
    p.rays(c, nrm, rad * 0.15, rad, rad * 0.42, 9, col, col_tip=hx('#5a82f0'), cup=0.4, shape='trichter', notch=2, jitter=0.2,
           length_jit=0.15)
    p.globe((c[0], c[1] + rad * 0.1), rad * 0.3, hx('#5a3a8a'), count=16, fl=0.45, elong=1.3, squash=0.7, dark=0.6)


def f_kornblume_bluete(p):
    paths = []
    for k in range(p.ri(3, 4)):
        u = p.r(-0.2, 0.2)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.62, 0.8), p.r(-0.06, 0.06))
        p.stroke(path, 0.01, 0.007, hx('#7a9070'))
        leaves_along(p, path, [0.15, 0.32, 0.5], 0.12, 0.018, hx('#6a8a62'), shape='linear', ang=0.45)
        paths.append(path)
    for path in paths:
        for b in range(p.ri(1, 2)):
            pt, d = p.at(path, p.r(0.6, 0.85))
            s = 1 if b % 2 else -1
            q = (pt[0] + s * p.r(0.08, 0.15), pt[1] + p.r(0.1, 0.18))
            p.stroke([pt, ((pt[0] + q[0]) / 2, (pt[1] + q[1]) / 2 + 0.02), q], 0.007, 0.005, hx('#7a9070'), hl=0)
            if p.r() < 0.7:
                cornflower(p, q, p.r(0.055, 0.065), p.head_normal(0.6, 0.6, side=s * 0.4))
            else:
                p.ellipse(q[0], q[1], 0.018, 0.024, 0, hx('#6a8a5a'), n=12)
        cornflower(p, path[-1], p.r(0.06, 0.07), p.head_normal(0.65, 0.55))


def chamomile(p, c, rad, nrm, old=False):
    p.rays(c, nrm, rad * 0.35, rad, rad * 0.3, 15, C['weiss'], cup=-0.6 if old else 0.0, droop=0.6 if old else 0.1, shape='linear',
           front=False)
    # the conical yellow disc
    p.ellipse(c[0], c[1] + rad * 0.12, rad * 0.32, rad * 0.4, 0, C['gelb'], grad=((c[0] - rad * 0.2, c[1] + rad * 0.4), (c[0] + rad * 0.3, c[1]), hx('#ffe060'), hx('#c8a010')))
    p.rays(c, nrm, rad * 0.35, rad, rad * 0.3, 15, C['weiss'], cup=-0.6 if old else 0.0, droop=0.6 if old else 0.1, shape='linear',
           front=True)


def f_kamille_bluete(p):
    paths = []
    for k in range(p.ri(4, 5)):
        u = p.r(-0.22, 0.22)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.55, 0.72), p.r(-0.08, 0.08))
        p.stroke(path, 0.01, 0.007, hx('#6a9048'))
        for t in (0.2, 0.4, 0.6):
            pt, d = p.at(path, t)
            feathery_leaf(p, pt, math.atan2(d[0], d[1]) + (0.8 if p.r() < 0.5 else -0.8), 0.1, hx('#5a8a3a'))
        paths.append(path)
    for path in paths:
        tip = path[-1]
        for b in range(p.ri(2, 4)):
            s = p.r(-1, 1)
            q = (tip[0] + s * p.r(0.05, 0.18), tip[1] + p.r(0.06, 0.22))
            p.stroke([tip, ((tip[0] + q[0]) / 2, (tip[1] + q[1]) / 2 + 0.01), q], 0.006, 0.005, hx('#6a9048'), hl=0)
            chamomile(p, q, p.r(0.036, 0.045), p.head_normal(0.7, 0.5, side=s * 0.4), old=p.r() < 0.35)


def colchicum(p, base, top, col, open_=0.5):
    """a crocus-like goblet on its long white tube"""
    tube = p.bez(base, (base[0] + p.r(-0.02, 0.02), (base[1] + top[1]) / 2), top, 10)
    p.stroke(tube, 0.009, 0.013, hx('#d8d0c8'), col1=mix(col, (1, 1, 1), 0.3), hl=0.05)
    nrm = (p.r(-0.25, 0.25), 1.0, 0.35)
    p.rays((top[0], top[1] - 0.01), nrm, 0.006, p.r(0.13, 0.15), 0.105, 6, col, col_tip=mix(col, (1, 1, 1), 0.2), cup=2.2, shape='oval',
           jitter=0.1, back_dark=0.72, length_jit=0.05)


def f_herbstzeitlose_bluete(p):
    fl = sorted([(p.r(0.45, 0.82), p.r(-0.3, 0.3)) for _ in range(p.ri(5, 6))], key=lambda q: -q[0])
    for top, u in fl:
        colchicum(p, (u * 0.4 + p.r(-0.04, 0.04), 0), (u, top), p.jit(hx('#c8a0d2'), 0.05))


def f_herbstzeitlose_blatt(p):
    # spring: the broad, glossy leaves upright like a tulip's, last autumn's green capsule in their middle
    items = [(p.r(-1, 1), p.r(-0.45, 0.45), p.r(0.8, 0.98)) for _ in range(4)]
    items.sort()
    for z, a, L in items:
        p.leaf((p.r(-0.02, 0.02), 0), a, L, 0.16, mul(p.jit(hx('#4f8a38')), 0.85 + 0.15 * (z + 1) / 2), shape='eilanz',
               bend=-0.12 * (1 if a > 0 else -1))
    p.stroke([(0, 0), (0.01, 0.32)], 0.02, 0.016, hx('#6a9a48'))
    p.ellipse(0.01, 0.4, 0.04, 0.08, 0.05, hx('#5a8a3a'), grad=((-0.02, 0.46), (0.04, 0.34), hx('#8ab060'), hx('#4a7a30')))
    p.leaf((0, 0), 0.12, 0.85, 0.15, hx('#55903c'), shape='eilanz', bend=-0.1)


def thistle_head(p, c, rad, col, seed=False):
    # the involucre: ovoid with appressed spiny bracts; on top the brush of florets (or the white fluff of the seeds)
    p.ellipse(c[0], c[1] - rad * 0.4, rad * 0.42, rad * 0.55, 0, hx('#5a7a40'), grad=((c[0] - rad * 0.3, c[1]), (c[0] + rad * 0.3, c[1] - rad * 0.8), hx('#7a9a58'), hx('#4a6a34')))
    for k in range(8):
        a = p.r(0.2, 2.9)
        q = (c[0] + math.cos(a) * rad * 0.3, c[1] - rad * 0.5 + math.sin(a) * rad * 0.3)
        p.dots([(q[0], q[1], rad * 0.06, hx('#6a3a4a'))])
    if seed:
        segs = []
        for k in range(40):
            a = p.r(0.15, math.pi - 0.15)
            L = rad * p.r(0.8, 1.6)
            segs.append(((c[0], c[1] - rad * 0.05), (c[0] + math.cos(a) * L, c[1] + math.sin(a) * L * 0.9)))
        p.soft_lines(segs, (0.96, 0.95, 0.9), 2.0, 0.55)
        p.soft_dots([(c[0], c[1] + rad * 0.35, rad * 0.55, (0.95, 0.94, 0.9))], 0.5)
    else:
        segs = []
        for k in range(36):
            a = p.r(0.35, math.pi - 0.35)
            L = rad * p.r(0.45, 0.8)
            segs.append((a, L))
        segs.sort(key=lambda q: math.sin(q[0]))
        for a, L in segs:
            q = (c[0] + math.cos(a) * L, c[1] + math.sin(a) * L)
            p.stroke([(c[0], c[1] - rad * 0.05), q], rad * 0.07, rad * 0.05, p.jit(col, 0.06), col1=mix(col, (1, 0.9, 1), 0.25), hl=0)


def spiny_leaf(p, base, a, L, c, fore=1.0):
    p.leaf(base, a, L, L * 0.42, c, shape='lanzett', teeth=7, tooth=0.7, bend=-0.1 * (1 if a > 0 else -1), foreshort=fore)


def thistle_plant(p, seed=False, flowers=True):
    paths = []
    for k in range(p.ri(2, 3)):
        u = p.r(-0.12, 0.12)
        path = stem_path(p, p.r(-0.02, 0.02), u, p.r(0.62, 0.75) if flowers else p.r(0.7, 0.9), p.r(-0.04, 0.04))
        p.stroke(path, 0.016, 0.01, hx('#6a8a4a') if not seed else hx('#7a7a50'))
        for t in ((0.12, 0.28, 0.44, 0.58) if flowers else (0.1, 0.24, 0.38, 0.52, 0.66, 0.8)):
            pt, d = p.at(path, t)
            spiny_leaf(p, pt, math.atan2(d[0], d[1]) + (0.8 if int(t * 100) % 2 else -0.8), 0.17 * (1 - t * 0.4),
                       p.jit(hx('#4f7a3a') if not seed else hx('#6a7444')), fore=p.r(0.7, 1))
        paths.append(path)
    if not flowers:
        return
    for path in paths:
        tip = path[-1]
        for b in range(p.ri(3, 5)):
            s = p.r(-1, 1)
            q = (tip[0] + s * p.r(0.05, 0.18), tip[1] + p.r(0.06, 0.22))
            p.stroke([tip, ((tip[0] + q[0]) / 2, (tip[1] + q[1]) / 2 + 0.01), q], 0.007, 0.005, hx('#6a8a4a'), hl=0)
            thistle_head(p, q, p.r(0.045, 0.058), hx('#b05aa8'), seed=seed)


def f_distel_bluete(p):
    thistle_plant(p)


def f_distel_samen(p):
    thistle_plant(p, seed=True)


def f_distel_blatt(p):
    thistle_plant(p, flowers=False)
    rosette(p, 8, 0.32, 0.5, 0.1, hx('#4f7a3a'), spread=1.1, fn=lambda p, b, a, L, c, f: spiny_leaf(p, b, a, L, c, max(0.75, f)))


def f_brennnessel_blatt(p):
    # several upright four-angled shoots with pairs of heart-shaped serrated leaves; greenish flower strings in the upper axils
    shoots = sorted([(p.r(0.8, 0.98), p.r(-0.18, 0.18)) for _ in range(p.ri(3, 4))], key=lambda q: q[1])
    for top, u in shoots:
        path = stem_path(p, p.r(-0.04, 0.04), u, top, p.r(-0.04, 0.04))
        p.stroke(path, 0.016, 0.008, hx('#4e6e34'))
        ts = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.95]
        for i, t in enumerate(ts):
            pt, d = p.at(path, t)
            base = math.atan2(d[0], d[1])
            for s in (-1, 1):
                L = 0.13 * (1.15 - t * 0.7) * p.r(0.9, 1.1)
                a = base + s * (1.15 - t * 0.4) + p.r(-0.1, 0.1)
                p.leaf(pt, a, L, L * 0.62, p.jit(hx('#3e6230'), 0.05), shape='herz', teeth=9, tooth=0.35, bend=0.12 * s,
                       foreshort=p.r(0.65, 1.0))
                if 2 <= i <= 6 and p.r() < 0.6:
                    q = (pt[0] + s * 0.05, pt[1] - 0.06)
                    pp = p.bez(pt, (pt[0] + s * 0.04, pt[1] - 0.01), q, 6)
                    p.stroke(pp, 0.006, 0.004, hx('#7a8a4a'), hl=0)
                    p.dots([(pp[j][0] + p.r(-0.004, 0.004), pp[j][1], 0.004, hx('#8a9a5a')) for j in range(1, 7)])


def impatiens_flower(p, c, size, col):
    """the helmet flower of the Drüsiges Springkraut hanging from its stalk"""
    p.ellipse(c[0], c[1], size * 0.55, size * 0.4, p.r(-0.4, 0.4), mul(col, 0.85), n=16)
    p.ellipse(c[0] - size * 0.08, c[1] + size * 0.05, size * 0.42, size * 0.3, 0.2, col, n=14)
    p.ellipse(c[0] + size * 0.2, c[1] - size * 0.25, size * 0.3, size * 0.2, -0.4, mix(col, (1, 1, 1), 0.15), n=12)
    p.dots([(c[0] - size * 0.15, c[1] - size * 0.05, size * 0.1, hx('#f0e0a0'))])


def impatiens_plant(p, flowers):
    shoots = sorted([(p.r(0.8, 0.96), p.r(-0.14, 0.14)) for _ in range(p.ri(2, 3))], key=lambda q: q[1])
    for top, u in shoots:
        path = stem_path(p, p.r(-0.03, 0.03), u, top, p.r(-0.04, 0.04))
        p.stroke(path, 0.024, 0.012, hx('#9a5a4a'), col1=hx('#7a8a4a'), hl=0.25)
        for t in (0.25, 0.42, 0.58, 0.72, 0.85):
            pt, d = p.at(path, t)
            base = math.atan2(d[0], d[1])
            for w in range(3):  # whorls of three
                a = base + (w - 1) * 1.1 + p.r(-0.2, 0.2)
                L = 0.16 * (1.1 - t * 0.5)
                p.leaf(pt, a, L, L * 0.26, p.jit(hx('#4a7a34'), 0.05), shape='lanzett', teeth=8, tooth=0.2, bend=0.15 * (1 if a > base else -1),
                       foreshort=p.r(0.55, 1.0))
        if flowers:
            tip = path[-1]
            for k in range(p.ri(6, 8)):
                s = p.r(-1, 1)
                q0 = (tip[0] + s * p.r(0.02, 0.12), tip[1] - p.r(0.0, 0.1))
                q = (q0[0] + s * 0.04, q0[1] - p.r(0.02, 0.05))
                p.stroke([tip, q0, q], 0.004, 0.003, hx('#9a6a5a'), hl=0)
                impatiens_flower(p, q, p.r(0.05, 0.065), p.jit(hx('#d25a9c'), 0.07))
            for k in range(2):
                q = (tip[0] + p.r(-0.08, 0.08), tip[1] - p.r(0.12, 0.2))
                p.ellipse(q[0], q[1], 0.008, 0.025, p.r(-0.5, 0.5), hx('#7a9a54'), n=10)


def f_springkraut_bluete(p):
    impatiens_plant(p, True)


def f_springkraut_blatt(p):
    impatiens_plant(p, False)


def foxglove_rosette(p, scale=1.0):
    rosette(p, p.ri(8, 10), 0.4 * scale, 0.7 * scale, 0.22 * scale, hx('#5a7e4e'), shape='eilanz', spread=1.35)


def f_fingerhut_bluete(p):
    foxglove_rosette(p, 0.38)
    path = stem_path(p, 0, p.r(-0.03, 0.03), 0.97, p.r(-0.03, 0.03))
    p.stroke(path, 0.016, 0.008, hx('#6a7a4a'))
    leaves_along(p, path, [0.08, 0.18, 0.28], 0.12, 0.05, hx('#5a7e4e'), shape='eilanz', ang=0.6)
    # one-sided spike of hanging bells, large below, buds at the top
    n = 22
    for i in range(n):
        t = 0.36 + 0.62 * i / (n - 1)
        pt, d = p.at(path, t)
        size = 0.085 * (1 - 0.6 * (i / n)) * p.r(0.9, 1.05)
        s = 1 if i % 3 else -1
        if i > n - 5:
            p.ellipse(pt[0] + s * 0.012, pt[1], 0.01, 0.016, 0, mix(hx('#c4508e'), hx('#8a9a5a'), 0.5), n=10)
            continue
        base = (pt[0] + s * 0.012, pt[1])
        ang = math.pi * (0.62 + p.r(-0.05, 0.05)) * s
        col = p.jit(hx('#c4508e'), 0.05)
        mouth = p.bell(base, ang, size, size * 0.5, col, inner=hx('#e8c0d8'), lobes=4, flare=0.2)
        p.dots([(mouth[0] - s * size * 0.05 + p.r(-0.005, 0.005), mouth[1] + size * 0.05, size * 0.05, hx('#5a1a3a'))])


def f_fingerhut_blatt(p):
    rosette(p, p.ri(9, 11), 0.55, 0.85, 0.24, hx('#5a7e4e'), shape='eilanz', spread=0.85)


def meadowsweet_leaf(p, pt, a, L, c):
    p.pinnate(pt, a, L, L * 0.5, c, pairs=3, leaflet='oval', bend=0.12, fine=1.2, tip_leaflet=False)
    p.palmate((pt[0] + math.sin(a) * L, pt[1] + math.cos(a) * L), L * 0.28, c, lobes=3, cut=0.6, tilt=0.6, rot=a)


def meadowsweet_plant(p, flowers):
    shoots = sorted([(p.r(0.78, 0.92), p.r(-0.16, 0.16)) for _ in range(p.ri(3, 4))], key=lambda q: q[1])
    tips = []
    for top, u in shoots:
        path = stem_path(p, p.r(-0.03, 0.03), u, top, p.r(-0.04, 0.04))
        p.stroke(path, 0.016, 0.009, hx('#8a4a3a'), col1=hx('#7a5a3e'))
        for t in (0.1, 0.25, 0.4, 0.55, 0.68):
            pt, d = p.at(path, t)
            a = math.atan2(d[0], d[1]) + (0.75 if int(t * 100) % 2 else -0.75)
            meadowsweet_leaf(p, pt, a, 0.2 * (1.1 - t * 0.6), p.jit(hx('#3e6a2e'), 0.05))
        tips.append(path[-1])
    if flowers:
        dots = []
        for tip in tips:
            for b in range(p.ri(5, 8)):
                s = p.r(-1, 1)
                q = (tip[0] + s * p.r(0.03, 0.14), tip[1] + p.r(0.02, 0.1))
                p.stroke([tip, q], 0.005, 0.004, hx('#8a5a4a'), hl=0)
                for f in range(p.ri(18, 28)):
                    a = p.r(0, 6.28)
                    rr = p.r(0, 0.05)
                    lit = 1.0 if math.sin(a) > 0 else 0.85
                    dots.append((q[0] + math.cos(a) * rr, q[1] + math.sin(a) * rr * 0.6 + 0.02, p.r(0.006, 0.009),
                                 mul(p.jit(C['creme'], 0.04), lit)))
        dots.sort(key=lambda d: d[1])
        p.dots(dots)


def f_maedesuess_bluete(p):
    meadowsweet_plant(p, True)


def f_maedesuess_blatt(p):
    meadowsweet_plant(p, False)


def willowherb_plant(p, stage):
    shoots = sorted([(p.r(0.85, 0.97), p.r(-0.1, 0.1)) for _ in range(p.ri(2, 3))], key=lambda q: q[1])
    for top, u in shoots:
        path = stem_path(p, p.r(-0.03, 0.03), u, top, p.r(-0.03, 0.03))
        p.stroke(path, 0.016, 0.008, hx('#7a4a40'), col1=hx('#8a5a4a'))
        t_fl = 0.62
        ts = [0.08 + 0.06 * i for i in range(10)]
        leaves_along(p, path, [t for t in ts if t < t_fl], 0.13, 0.025, hx('#3e6a30') if stage != 'samen' else hx('#6a7a3a'), ang=0.5)
        n = 12
        for i in range(n):
            t = t_fl + (0.98 - t_fl) * i / (n - 1)
            pt, d = p.at(path, t)
            s = 1 if i % 2 else -1
            q = (pt[0] + s * 0.04, pt[1] + 0.01)
            if stage == 'bluete':
                if i < 3:  # pods below the flowers
                    p.stroke([pt, (pt[0] + s * 0.05, pt[1] + 0.07)], 0.006, 0.004, hx('#8a4a5a'), hl=0)
                elif i < n - 3:
                    q = (pt[0] + s * 0.055, pt[1] + 0.015)
                    p.stroke([pt, q], 0.005, 0.004, hx('#8a4a5a'), hl=0)
                    crucifer(p, q, p.r(0.048, 0.056), p.head_normal(0.3, 0.8, side=s * 0.6), p.jit(hx('#d64a9c'), 0.05))
                else:
                    p.ellipse(q[0] - s * 0.015, q[1], 0.008, 0.016, 0, hx('#a0507a'), n=10)
            else:
                # split pods with the white silky fluff coming out
                p.stroke([pt, (pt[0] + s * 0.06, pt[1] + 0.08)], 0.005, 0.003, hx('#6a4a3a'), hl=0)
        if stage == 'samen':
            segs = []
            for k in range(70):
                t = p.r(t_fl, 0.98)
                pt, d = p.at(path, t)
                a = p.r(0, 6.28)
                L = p.r(0.03, 0.09)
                segs.append(((pt[0] + p.r(-0.03, 0.03), pt[1]), (pt[0] + math.cos(a) * L, pt[1] + math.sin(a) * L * 0.8 + 0.02)))
            p.soft_lines(segs, (0.97, 0.96, 0.94), 2.2, 0.5)


def f_weidenroeschen_bluete(p):
    willowherb_plant(p, 'bluete')


def f_weidenroeschen_samen(p):
    willowherb_plant(p, 'samen')


def f_farn_blatt(p):
    # fronds arching out of the centre like a shuttlecock; the back ones longer and upright
    items = [(p.r(-1, 1), p.r(-1.05, 1.05)) for _ in range(9)]
    items.sort()
    for z, a in items:
        L = 0.95 * (1 - 0.25 * abs(a)) * p.r(0.85, 1.05) * (0.9 + 0.1 * (1 - z) / 2)
        c = mul(p.jit(hx('#4f8a32')), 0.82 + 0.18 * (z + 1) / 2)
        p.pinnate((p.r(-0.02, 0.02), 0), a * 0.75, L, 0.24, c, pairs=14, sub=0, leaflet='lanzett', bend=-0.22 * (1 if a > 0 else -1),
                  foreshort=p.r(0.75, 1), fine=0.65, rachis=hx('#5a7a3a'))


def f_heidelbeere_blatt(p):
    # a low shrub: green angular twigs branching, small oval leaves
    def twig(pt, a, L, depth):
        tip = (pt[0] + math.sin(a) * L, pt[1] + math.cos(a) * L)
        mid = ((pt[0] + tip[0]) / 2 + p.r(-0.02, 0.02), (pt[1] + tip[1]) / 2)
        path = [pt, mid, tip]
        p.stroke(path, 0.012 * (0.7 ** (3 - depth)) + 0.004, 0.006, hx('#5a8a3a'), hl=0)
        for t in (0.35, 0.65, 0.95):
            q, d = p.at(path, t)
            for s in (-1, 1):
                if p.r() < 0.75:
                    p.leaf(q, math.atan2(d[0], d[1]) + s * 0.9, 0.05, 0.03, p.jit(hx('#5a8a34'), 0.06), shape='oval', rib=False,
                           foreshort=p.r(0.6, 1))
        if depth > 0:
            for s in (-1, 1):
                twig(p.at(path, p.r(0.5, 0.9))[0], a + s * p.r(0.4, 0.8), L * 0.65, depth - 1)

    for k in range(p.ri(4, 5)):
        twig((p.r(-0.04, 0.04), 0), p.r(-0.6, 0.6), p.r(0.38, 0.5), 2)


# ---- grass heads: drawn light and nearly neutral, to be multiplied by the species' colour


G_CULM = hx('#c8ccb4')
G_SPK = hx('#e6e2d2')


def culms(p, count, top_rng, spread=0.18, col=G_CULM, w=0.009, nod=0.0):
    paths = []
    for k in range(count):
        u = p.r(-spread, spread)
        top = p.r(*top_rng)
        path = stem_path(p, p.r(-0.02, 0.02), u + nod * 0.5 * (1 if u > 0 else -1), top, p.r(-0.04, 0.04) + nod * (1 if u > 0 else -1))
        p.stroke(path, w, w * 0.6, mul(col, 0.92), col1=col, hl=0)
        paths.append(path)
    return paths


def f_gras_rispe(p, ripe=False):
    paths = culms(p, p.ri(3, 4), (0.85, 0.97), nod=0.12 if ripe else 0.0)
    for path in paths:
        # whorls of branches along the upper 45 %, spikelets along each branch
        for i in range(5):
            t = 0.55 + 0.45 * i / 5
            pt, d = p.at(path, t)
            base = math.atan2(d[0], d[1])
            for s in (-1, 1):
                for j in range(p.ri(1, 2)):
                    L = 0.16 * (1 - (t - 0.55) / 0.5) * p.r(0.7, 1.1) + 0.03
                    a = base + s * (p.r(0.35, 0.7) if not ripe else p.r(0.6, 1.1))
                    tip = (pt[0] + math.sin(a) * L, pt[1] + math.cos(a) * L - (0.05 * L / 0.16 if ripe else 0))
                    br = p.bez(pt, (pt[0] + math.sin(a) * L * 0.5, pt[1] + math.cos(a) * L * 0.55), tip, 8)
                    p.stroke(br, 0.004, 0.0025, G_CULM, hl=0)
                    for k in range(p.ri(3, 5)):
                        q, dd = p.at(br, 0.35 + 0.65 * k / 4)
                        ang = math.atan2(dd[0], dd[1]) + (0.6 if ripe else 0.25) * s
                        p.ellipse(q[0] + math.sin(ang) * 0.008, q[1] + math.cos(ang) * 0.008, 0.0045, 0.012, -ang,
                                  mul(p.jit(G_SPK, 0.06), 0.9 + 0.1 * (k % 2)), n=10)
        tip = path[-1]
        p.ellipse(tip[0], tip[1] + 0.008, 0.004, 0.012, 0, G_SPK, n=10)


def f_gras_rispe_reif(p):
    f_gras_rispe(p, ripe=True)


def f_gras_aehrenrispe(p):
    paths = culms(p, p.ri(3, 4), (0.82, 0.97))
    for path in paths:
        _, d = p.at(path, 1)
        ang = math.atan2(d[0], d[1])
        base = path[-1]
        L = p.r(0.16, 0.24)
        head = [(base[0] + math.sin(ang) * L * t, base[1] + math.cos(ang) * L * t - L) for t in np.linspace(0, 1, 10)]
        p.stroke(head, 0.03, 0.022, mul(G_SPK, 0.85), col1=G_SPK, hl=0.15)
        # the fuzzy surface: many short bristles and the hanging anthers
        segs = []
        for k in range(60):
            t = p.r(0.02, 0.98)
            q = (head[0][0] + (head[-1][0] - head[0][0]) * t, head[0][1] + (head[-1][1] - head[0][1]) * t)
            a = p.r(0, 6.28)
            segs.append((q, (q[0] + math.cos(a) * 0.02, q[1] + math.sin(a) * 0.012)))
        p.soft_lines(segs, mix(G_SPK, (1, 1, 1), 0.3), 1.6, 0.7)
        an = [(head[0][0] + p.r(-0.017, 0.017), head[0][1] + p.r(0, L), 0.004, hx('#b8a8b0')) for _ in range(14)]
        p.dots(an)


def f_gras_aehre(p):
    paths = culms(p, p.ri(3, 4), (0.86, 0.97))
    for path in paths:
        _, d = p.at(path, 1)
        ang = math.atan2(d[0], d[1])
        top = path[-1]
        L = p.r(0.22, 0.3)
        base = (top[0] - math.sin(ang) * L, top[1] - math.cos(ang) * L)
        # spikelets alternating left and right of the axis, edge-on (Weidelgras, Quecke)
        n = 9
        for i in range(n):
            t = i / (n - 1)
            q = (base[0] + math.sin(ang) * L * t, base[1] + math.cos(ang) * L * t)
            s = 1 if i % 2 else -1
            a = ang + s * 0.35
            p.ellipse(q[0] + math.sin(a) * 0.012, q[1] + math.cos(a) * 0.012, 0.007, 0.02, -a, mul(p.jit(G_SPK, 0.05), 0.92), n=12)
        p.stroke([base, top], 0.004, 0.003, G_CULM, hl=0)


def f_gras_knaeuel(p):
    paths = culms(p, p.ri(3, 4), (0.84, 0.96), w=0.01)
    for path in paths:
        tip = path[-1]
        _, d = p.at(path, 1)
        base_a = math.atan2(d[0], d[1])
        # a one-sided panicle: a few stiff branches ending in dense clusters
        for k in range(p.ri(3, 4)):
            t = 0.82 + 0.18 * k / 3
            pt, dd = p.at(path, t)
            s = 1 if k % 2 else -1
            L = 0.09 * (1.2 - k * 0.2)
            a = base_a + s * 0.7
            q = (pt[0] + math.sin(a) * L, pt[1] + math.cos(a) * L)
            p.stroke([pt, q], 0.004, 0.003, G_CULM, hl=0)
            p.globe(q, 0.03, mul(G_SPK, 0.92), count=22, fl=0.5, elong=1.3, dark=0.6)
        p.globe((tip[0], tip[1] + 0.025), 0.034, G_SPK, count=26, fl=0.5, elong=1.3, dark=0.6)


def f_gras_schmiele(p):
    paths = culms(p, p.ri(4, 5), (0.8, 0.96), w=0.007)
    dots = []
    for path in paths:
        # a big airy panicle: very fine branches, tiny shining spikelets
        for i in range(6):
            t = 0.45 + 0.55 * i / 6
            pt, d = p.at(path, t)
            base = math.atan2(d[0], d[1])
            for s in (-1, 1):
                for j in range(p.ri(2, 3)):
                    L = 0.22 * (1 - (t - 0.45) / 0.6) * p.r(0.6, 1.1) + 0.03
                    a = base + s * p.r(0.4, 1.0)
                    tip = (pt[0] + math.sin(a) * L, pt[1] + math.cos(a) * L)
                    br = p.bez(pt, (pt[0] + math.sin(a) * L * 0.5, pt[1] + math.cos(a) * L * 0.6), tip, 8)
                    p.stroke(br, 0.0032, 0.002, G_CULM, hl=0, op=0.9)
                    for k in range(p.ri(4, 7)):
                        q, dd = p.at(br, p.r(0.3, 1.0))
                        dots.append((q[0] + p.r(-0.006, 0.006), q[1] + p.r(-0.004, 0.004), p.r(0.004, 0.006),
                                     mul(p.jit(G_SPK, 0.08), p.r(0.85, 1.05))))
    p.dots(dots)


def f_gras_schilf(p):
    paths = culms(p, p.ri(3, 4), (0.88, 0.98), w=0.014, spread=0.12)
    for path in paths:
        # leaves standing off the culm, then the plume: a dense feathery panicle nodding to one side
        for t in (0.25, 0.4, 0.55):
            pt, d = p.at(path, t)
            s = 1 if int(t * 100) % 2 else -1
            p.leaf(pt, math.atan2(d[0], d[1]) + s * 0.9, 0.22, 0.03, mul(G_CULM, 0.9), shape='linear', bend=0.35 * s, rib=False)
        tip = path[-1]
        s = 1 if tip[0] > 0 else -1
        segs = []
        for k in range(90):
            t = p.r(0, 1)
            base = (tip[0] - s * 0.02 * t, tip[1] - 0.25 * t)
            a = p.r(-0.4, 0.9) * s + math.pi * 0.0
            L = p.r(0.05, 0.12) * (1 - 0.5 * t)
            segs.append((base, (base[0] + math.sin(a) * L, base[1] + math.cos(a) * L * 0.5 + 0.02)))
        p.soft_lines(segs, mul(G_SPK, 0.95), 2.4, 0.75)
        p.soft_lines(segs[::3], mul(G_SPK, 0.75), 1.6, 0.6)


def f_gras_segge(p):
    # long keeled arching leaves, three-angled culms with dark spikes (male above, female below)
    for k in range(8):
        a = p.r(-0.9, 0.9)
        p.leaf((p.r(-0.02, 0.02), 0), a * 0.6, p.r(0.6, 0.85), 0.04, p.jit(hx('#c4c8b0'), 0.05), shape='linear', bend=-0.3 * (1 if a > 0 else -1),
               rib=True)
    paths = culms(p, 3, (0.9, 0.98), w=0.01, spread=0.1)
    for path in paths:
        for t, L, w in ((0.98, 0.1, 0.02), (0.84, 0.07, 0.026), (0.74, 0.07, 0.026)):
            pt, d = p.at(path, t)
            ang = math.atan2(d[0], d[1]) + p.r(-0.2, 0.2)
            p.bell((pt[0] - math.sin(ang) * L, pt[1] - math.cos(ang) * L), ang, L, w, hx('#8a8070'), flare=-0.3, lobes=1)


# ---------------------------------------------------------------- the layout: cell (c, r) -> id, frame, species, drawer

LAYOUT = [
    # row 0
    ((0, 0), 'loewenzahn-blatt', 'blatt', ['loewenzahn', 'wegwarte', 'wiesenpippau'], f_loewenzahn_blatt),
    ((1, 0), 'loewenzahn-knospe', 'knospe', ['loewenzahn'], f_loewenzahn_knospe),
    ((2, 0), 'loewenzahn-bluete', 'bluete', ['loewenzahn'], f_loewenzahn_bluete),
    ((3, 0), 'loewenzahn-samen', 'samen', ['loewenzahn'], f_loewenzahn_samen),
    ((4, 0), 'gaensebluemchen-bluete', 'bluete', ['gaensebluemchen'], f_gaensebluemchen_bluete),
    ((5, 0), 'weissklee-bluete', 'bluete', ['weissklee'], f_weissklee_bluete),
    ((6, 0), 'klee-blatt', 'blatt', ['weissklee', 'rotklee'], f_klee_blatt),
    ((7, 0), 'rotklee-bluete', 'bluete', ['rotklee'], f_rotklee_bluete),
    # row 1
    ((0, 1), 'hahnenfuss-bluete', 'bluete', ['hahnenfuss'], f_hahnenfuss_bluete),
    ((1, 1), 'lappig-blatt', 'blatt', ['hahnenfuss', 'storchschnabel'], f_lappig_blatt),
    ((2, 1), 'wiesenschaumkraut-bluete', 'bluete', ['wiesenschaumkraut'], f_wiesenschaumkraut_bluete),
    ((3, 1), 'spitzwegerich-bluete', 'bluete', ['spitzwegerich'], f_spitzwegerich_bluete),
    ((4, 1), 'spitzwegerich-blatt', 'blatt', ['spitzwegerich'], f_spitzwegerich_blatt),
    ((5, 1), 'breitwegerich-bluete', 'bluete', ['breitwegerich'], f_breitwegerich_bluete),
    ((6, 1), 'margerite-bluete', 'bluete', ['margerite'], f_margerite_bluete),
    ((7, 1), 'margerite-samen', 'samen', ['margerite'], f_margerite_samen),
    # row 2
    ((0, 2), 'lanzett-blatt', 'blatt', ['margerite', 'glockenblume', 'flockenblume', 'kornblume', 'weidenroeschen'], f_lanzett_blatt),
    ((1, 2), 'glockenblume-bluete', 'bluete', ['glockenblume'], f_glockenblume_bluete),
    ((2, 2), 'storchschnabel-bluete', 'bluete', ['storchschnabel'], f_storchschnabel_bluete),
    ((3, 2), 'flockenblume-bluete', 'bluete', ['flockenblume'], f_flockenblume_bluete),
    ((4, 2), 'wiesenpippau-bluete', 'bluete', ['wiesenpippau'], f_wiesenpippau_bluete),
    ((5, 2), 'vogelwicke-bluete', 'bluete', ['vogelwicke'], f_vogelwicke_bluete),
    ((6, 2), 'labkraut-bluete', 'bluete', ['labkraut'], f_labkraut_bluete),
    ((7, 2), 'johanniskraut-bluete', 'bluete', ['johanniskraut'], f_johanniskraut_bluete),
    # row 3
    ((0, 3), 'schafgarbe-bluete', 'bluete', ['schafgarbe'], f_schafgarbe_bluete),
    ((1, 3), 'dolde-trocken', 'samen', ['schafgarbe', 'rainfarn'], f_dolde_trocken),
    ((2, 3), 'fieder-blatt', 'blatt', ['schafgarbe', 'wilde_moehre', 'wiesenkerbel', 'rainfarn', 'klatschmohn', 'kamille'], f_fieder_blatt),
    ((3, 3), 'wilde_moehre-bluete', 'bluete', ['wilde_moehre'], f_wilde_moehre_bluete),
    ((4, 3), 'wilde_moehre-samen', 'samen', ['wilde_moehre'], f_wilde_moehre_samen),
    ((5, 3), 'baerenklau-bluete', 'bluete', ['baerenklau'], f_baerenklau_bluete),
    ((6, 3), 'baerenklau-samen', 'samen', ['baerenklau'], f_baerenklau_samen),
    ((7, 3), 'baerenklau-blatt', 'blatt', ['baerenklau'], f_baerenklau_blatt),
    # row 4
    ((0, 4), 'wiesenkerbel-bluete', 'bluete', ['wiesenkerbel'], f_wiesenkerbel_bluete),
    ((1, 4), 'wiesenkerbel-samen', 'samen', ['wiesenkerbel'], f_wiesenkerbel_samen),
    ((2, 4), 'rainfarn-bluete', 'bluete', ['rainfarn'], f_rainfarn_bluete),
    ((3, 4), 'wegwarte-bluete', 'bluete', ['wegwarte'], f_wegwarte_bluete),
    ((4, 4), 'klatschmohn-bluete', 'bluete', ['klatschmohn'], f_klatschmohn_bluete),
    ((5, 4), 'klatschmohn-frucht', 'frucht', ['klatschmohn'], f_klatschmohn_frucht),
    ((6, 4), 'kornblume-bluete', 'bluete', ['kornblume'], f_kornblume_bluete),
    ((7, 4), 'kamille-bluete', 'bluete', ['kamille'], f_kamille_bluete),
    # row 5
    ((0, 5), 'herbstzeitlose-bluete', 'bluete', ['herbstzeitlose'], f_herbstzeitlose_bluete),
    ((1, 5), 'herbstzeitlose-blatt', 'blatt', ['herbstzeitlose'], f_herbstzeitlose_blatt),
    ((2, 5), 'distel-bluete', 'bluete', ['distel'], f_distel_bluete),
    ((3, 5), 'distel-samen', 'samen', ['distel'], f_distel_samen),
    ((4, 5), 'distel-blatt', 'blatt', ['distel'], f_distel_blatt),
    ((5, 5), 'brennnessel-blatt', 'blatt', ['brennnessel'], f_brennnessel_blatt),
    ((6, 5), 'springkraut-bluete', 'bluete', ['springkraut'], f_springkraut_bluete),
    ((7, 5), 'springkraut-blatt', 'blatt', ['springkraut'], f_springkraut_blatt),
    # row 6
    ((0, 6), 'fingerhut-bluete', 'bluete', ['fingerhut'], f_fingerhut_bluete),
    ((1, 6), 'fingerhut-blatt', 'blatt', ['fingerhut'], f_fingerhut_blatt),
    ((2, 6), 'maedesuess-bluete', 'bluete', ['maedesuess'], f_maedesuess_bluete),
    ((3, 6), 'maedesuess-blatt', 'blatt', ['maedesuess'], f_maedesuess_blatt),
    ((4, 6), 'weidenroeschen-bluete', 'bluete', ['weidenroeschen'], f_weidenroeschen_bluete),
    ((5, 6), 'weidenroeschen-samen', 'samen', ['weidenroeschen'], f_weidenroeschen_samen),
    ((6, 6), 'farn-blatt', 'blatt', ['farn'], f_farn_blatt),
    ((7, 6), 'heidelbeere-blatt', 'blatt', ['heidelbeere'], f_heidelbeere_blatt),
    # row 7: grass heads (neutral, to be tinted)
    ((0, 7), 'gras-rispe', 'aehre', ['wiesenrispe', 'jaehrige_rispe', 'gemeine_rispe', 'rotschwingel', 'glatthafer', 'goldhafer',
                                     'wiesenschwingel', 'rohrglanzgras'], f_gras_rispe),
    ((1, 7), 'gras-rispe-reif', 'reif', ['wiesenrispe', 'jaehrige_rispe', 'gemeine_rispe', 'rotschwingel', 'glatthafer', 'goldhafer',
                                         'wiesenschwingel', 'rohrglanzgras'], f_gras_rispe_reif),
    ((2, 7), 'gras-aehrenrispe', 'aehre', ['fuchsschwanz', 'lieschgras', 'ruchgras'], f_gras_aehrenrispe),
    ((3, 7), 'gras-aehre', 'aehre', ['weidelgras', 'kammgras', 'quecke'], f_gras_aehre),
    ((4, 7), 'gras-knaeuel', 'aehre', ['knaulgras'], f_gras_knaeuel),
    ((5, 7), 'gras-schmiele', 'aehre', ['straussgras', 'honiggras', 'rasenschmiele', 'drahtschmiele', 'windhalm'], f_gras_schmiele),
    ((6, 7), 'gras-schilf', 'aehre', ['schilf'], f_gras_schilf),
    ((7, 7), 'gras-segge', 'aehre', ['segge', 'binse'], f_gras_segge),
]
TINTED = {'gras-rispe', 'gras-rispe-reif', 'gras-aehrenrispe', 'gras-aehre', 'gras-knaeuel', 'gras-schmiele', 'gras-schilf', 'gras-segge'}

# ---------------------------------------------------------------- render, reduce, bleed


def fit_of(im):
    """the scale about the stem foot that makes the plant fill the cell: its top at 97.5 % of the height, unless its sides would leave
    the cell first (wide rosettes); 1 = as drawn"""
    a = np.asarray(im)[..., 3] >= 128
    if not a.any():
        return 1.0
    ys, xs = np.nonzero(a)
    top = 1 - ys.min() / N
    side = max(abs(xs.min() / N - 0.5), abs((xs.max() + 1) / N - 0.5)) * 2
    return float(np.clip(min(0.975 / top, 0.97 / max(side, 1e-3)), 0.6, 2.2))


def draw_cell(fn, seed):
    p = Painter(seed)
    fn(p)
    k = fit_of(p.im)
    if abs(k - 1) > 0.02:  # the same plant again (same seed), scaled to fill the cell
        p = Painter(seed, k)
        fn(p)
    arr = np.asarray(p.im, np.float32) / 255.0  # sRGB, straight alpha, mostly binary at 4x
    rgb, a = arr[..., :3], arr[..., 3]
    # it stands in the grass: darker towards the foot; and a fine noise against the flat look
    v = 1 - (np.arange(N) + 0.5) / N
    ao = 0.76 + 0.24 * np.clip(v / 0.3, 0, 1) ** 0.8  # mild: the template darkens the roots too
    rgb = rgb * ao[:, None, None]
    rng = np.random.default_rng(seed + 991)
    noise = rng.normal(0, 1, (N // 2, N // 2)).astype(np.float32)
    noise = np.kron(noise, np.ones((2, 2), np.float32))
    rgb = np.clip(rgb * (1 + 0.045 * noise[..., None]), 0, 1)
    # to linear light, premultiplied, box 4 x 4
    lin = s2l(rgb) * a[..., None]
    lin = lin.reshape(CELL, SS, CELL, SS, 3).mean(axis=(1, 3))
    aa = a.reshape(CELL, SS, CELL, SS).mean(axis=(1, 3))
    out = np.zeros((CELL, CELL, 3), np.float32)
    m = aa > 1e-4
    out[m] = lin[m] / aa[m, None]
    return l2s(out), aa


def bleed(rgb, a, thr=0.02):
    """fill the colour of (nearly) transparent pixels from the nearest covered pixel of the same cell, then smooth it, so that
    filtering and mipmaps mix only plant colours"""
    from scipy import ndimage
    covered = a > thr
    if not covered.any():
        return rgb
    dist, idx = ndimage.distance_transform_edt(~covered, return_distances=True, return_indices=True)
    filled = rgb[idx[0], idx[1]]
    w = a[covered]
    mean = (rgb[covered] * w[:, None]).sum(0) / max(1e-6, w.sum())
    k = np.clip((dist - 2.0) / 10.0, 0, 1)[..., None]  # within ~2 px the nearest colour, beyond ~12 px the plant's mean colour
    filled = filled * (1 - k) + mean[None, None, :] * k
    sm = np.stack([ndimage.gaussian_filter(filled[..., j], 1.5) for j in range(3)], -1)
    return np.where(covered[..., None], rgb, sm)


def measure(rgb, a):
    m = a >= 0.5
    if not m.any():
        return {'breite': 0, 'oben': 0, 'deckung': 0, 'farbe': '#000000'}
    ys, xs = np.nonzero(m)
    u = (xs + 0.5) / CELL - 0.5
    v = 1 - (ys + 0.5) / CELL
    w = a[m]
    col = (rgb[m] * w[:, None]).sum(0) / w.sum()
    return {
        'breite': round(float(min(1.0, 2 * np.abs(u).max() + 1.0 / CELL)), 3),
        'oben': round(float(v.max() + 0.5 / CELL), 3),
        'deckung': round(float(m.mean()), 4),
        'farbe': to_hex(tuple(col)),
    }


def build(out_dir, only=None):
    atlas_rgb = np.zeros((CELL * GRID, CELL * GRID, 3), np.float32)
    atlas_a = np.zeros((CELL * GRID, CELL * GRID), np.float32)
    cells = []
    for i, ((c, r), cid, frame, species, fn) in enumerate(LAYOUT):
        if only and cid not in only:
            continue
        rgb, a = draw_cell(fn, 1000 + 37 * i)
        rgb = bleed(rgb, a)
        atlas_rgb[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] = rgb
        atlas_a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL] = a
        e = {'zelle': [c, r], 'id': cid, 'bild': frame, 'arten': species}
        e.update(measure(rgb, a))
        if cid in TINTED:
            e['toenen'] = True
        cells.append(e)
        print('cell', c, r, cid, e['breite'], e['farbe'], flush=True)
    img = np.dstack([atlas_rgb, atlas_a])
    im = Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8), 'RGBA')
    os.makedirs(out_dir, exist_ok=True)
    png = os.path.join(out_dir, 'blumen.png')
    im.save(png, optimize=True)
    meta = {
        'v': 1,
        'bild': 'blumen.png',
        'groesse_px': CELL * GRID,
        'zelle_px': CELL,
        'spalten': GRID,
        'zeilen': GRID,
        'hinweis': 'Zelle (Spalte, Zeile) von oben links; eine Pflanze von der Seite, Stängelfuß unten in der Mitte, die Pflanze füllt die '
                   'Höhe der Zelle; breite = Anteil der Zellbreite, den sie bedeckt (Alpha ≥ 0,5); farbe = mittlere Farbe (sRGB); '
                   'toenen: Grasähren hell und fast neutral gezeichnet – mit der Farbe der Art / farbe multiplizieren. Erzeugt von '
                   'tools/bewuchs/pflanzen/atlas.py (eigene Zeichnung).',
        'zellen': cells,
    }
    with open(os.path.join(out_dir, 'blumen.json'), 'w', encoding='utf8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print('wrote', png, os.path.getsize(png), 'bytes', flush=True)
    return im, meta


# ---------------------------------------------------------------- sheets to judge it


def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def sheets(im, meta, d):
    os.makedirs(d, exist_ok=True)
    G = (96, 122, 62)
    # 1:1 with labels, on a grass-green ground
    lab = 18
    W = CELL * GRID
    sh = Image.new('RGB', (W, GRID * (CELL + lab)), G)
    dr = ImageDraw.Draw(sh)
    fnt = font(11)
    by = {tuple(e['zelle']): e for e in meta['zellen']}
    for r in range(GRID):
        for c in range(GRID):
            cell = im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL))
            bg = Image.new('RGBA', (CELL, CELL), G + (255,))
            bg = Image.alpha_composite(bg, cell)
            sh.paste(bg.convert('RGB'), (c * CELL, r * (CELL + lab)))
            e = by.get((c, r))
            dr.text((c * CELL + 3, r * (CELL + lab) + CELL + 2), (e['id'] if e else '–')[:21], fill=(240, 240, 230), font=fnt)
            dr.rectangle((c * CELL, r * (CELL + lab), (c + 1) * CELL - 1, r * (CELL + lab) + CELL - 1), outline=(70, 90, 46))
    sh.save(os.path.join(d, 'atlas_1zu1.png'))
    # 1:4 (32 px cells, as a texture at that size gives it), magnified x3 with nearest neighbour
    small = im.resize((W // 4, W // 4), Image.BOX)
    bg = Image.new('RGBA', small.size, G + (255,))
    s4 = Image.alpha_composite(bg, small).convert('RGB').resize((W // 4 * 3, W // 4 * 3), Image.NEAREST)
    s4.save(os.path.join(d, 'atlas_1zu4.png'))
    # the colour channels alone (alpha ignored): the bled colour must look like the plant, without dark or white borders
    Image.fromarray(np.asarray(im)[..., :3]).save(os.path.join(d, 'atlas_rgb.png'))
    # a meadow: plants at the sizes they have on screen (5–60 px), over grass-coloured noise, mixed by kind
    rng = np.random.default_rng(5)
    Wm, Hm = 1200, 600
    base = np.zeros((Hm, Wm, 3), np.float32)
    nz = rng.normal(0, 1, (Hm // 4, Wm // 4))
    nz = np.kron(nz, np.ones((4, 4)))
    for k, cval in enumerate((88, 118, 56)):
        base[..., k] = cval * (1 + 0.12 * nz)
    mead = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert('RGBA')
    plants = [e for e in meta['zellen'] if not e.get('toenen')]
    for row in range(10):
        y = 60 + row * 58
        size = int(6 + row * 6)
        for k in range(int(Wm / max(10, size * 0.55))):
            e = plants[rng.integers(len(plants))]
            c, r = e['zelle']
            cell = im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize((size, size), Image.BOX)
            x = int(k * size * 0.55 + rng.integers(0, max(1, size // 3)))
            mead.alpha_composite(cell, (min(Wm - size, x), min(Hm - size, y - size + int(rng.integers(0, 10)))))
    mead.convert('RGB').save(os.path.join(d, 'wiese_bildschirm.png'))
    print('sheets in', d, flush=True)


def main(argv):
    out = os.path.join(ROOT, 'viz3', 'extra', 'bewuchs-pflanzen', 'dist', 'bewuchs')
    sh = None
    only = None
    it = iter(argv)
    for a in it:
        if a == '--sheets':
            sh = next(it)
        elif a == '--only':
            only = set(next(it).split(','))
        else:
            out = a
    im, meta = build(out, only)
    if sh:
        sheets(im, meta, sh)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
