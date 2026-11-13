#!/usr/bin/env python3
"""suhl-boden: the height query - the ground height (NHN) at UTM points, read from a ground tile set (terrain tiles WTH1).
For suhl-gebaeude (building feet), suhl-strassen, suhl-gruen: everybody stands on the same ground as the app draws.

    import os, sys
    sys.path.insert(0, os.path.join(REPO, 'tools', 'suhl', 'boden'))
    from hoehe import Hoehe
    h = Hoehe('tools/suhl/out/boden/probe/suhl/boden/v0')        # a folder with meta.json and t/, or an https address of one
    h.nhn(619762.0, 5607680.0)                                    # -> 440.0 (m NHN), None where the set has no tile
    h.nhn_many(E, N)                                              # numpy arrays -> array, NaN where the set has no tile
    h.z(E, N)                                                     # the same minus H0 = the app's model z

  The finest level that holds the point answers (12, then 11, 10; `levels=` chooses others). Between the samples (1 m at level 12,
  2 m at 11, 4 m at 10) the height is bilinear. The app draws every second sample of a tile as triangles (viz3/src/welt/welt.js
  heightAt); `drawn=True` gives exactly that surface instead - it differs from the bilinear one by centimetres on smooth ground.
  On the command line:  python3 -I tools/suhl/boden/hoehe.py --set DIR 619762 5607680 [E N ...]
"""
import json, os, struct, sys, zlib
import numpy as np

ROOT_E0, ROOT_N0, ROOT_SIZE = 420700.0, 5390800.0, 409600.0      # the quadtree of tools/welt/wlib.py
UA = 'PavillonRatscher-Suhl/0.1 (+https://github.com/mynametouse/pavillon-ratscher)'


def decode(b):
    """a WTH1 terrain tile -> (n, n) heights in m relative to H0, row 0 = south edge, column 0 = west edge (tools/welt/tiles.py)"""
    magic, n, flags, base, hmin, hmax = struct.unpack('<4sHHiff', b[:20])
    if magic != b'WTH1':
        raise ValueError('not a WTH1 terrain tile')
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
    return q / 100.0


class Hoehe:
    def __init__(self, base, levels=(12, 11, 10), keep=400):
        self.base = base.rstrip('/')
        self.url = self.base.startswith('http://') or self.base.startswith('https://')
        meta = json.loads(self._read('meta.json').decode('utf-8'))
        self.meta, self.H0 = meta, float(meta['H0'])
        lv = meta['tiling']['levels']
        self.has = {}
        for L in levels:
            v = lv.get(str(L))
            if not v:
                continue
            if 'has' in v:
                self.has[L] = {tuple(t) for t in v['has']}
            else:                                   # an old set: the rect is the list
                x0, y0, x1, y1 = v['rect']
                self.has[L] = {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}
        self.levels = [L for L in levels if L in self.has]
        self._t, self._keep = {}, keep

    def _read(self, rel):
        if self.url:
            import urllib.request
            with urllib.request.urlopen(urllib.request.Request(self.base + '/' + rel, headers={'User-Agent': UA}), timeout=60) as r:
                return r.read()
        with open(os.path.join(self.base, *rel.split('/')), 'rb') as f:
            return f.read()

    def tile(self, L, x, y):
        k = (L, x, y)
        t = self._t.get(k)
        if t is None:
            if len(self._t) >= self._keep:
                self._t.pop(next(iter(self._t)))
            t = self._t[k] = decode(self._read(f't/{L}/{x}/{y}.bin'))
        return t

    def source(self, E, N):
        """(level, x, y) of the tile that answers for a point, or None"""
        for L in self.levels:
            s = ROOT_SIZE / (1 << L)
            x, y = int(np.floor((E - ROOT_E0) / s)), int(np.floor((N - ROOT_N0) / s))
            if (x, y) in self.has[L]:
                return L, x, y
        return None

    def z(self, E, N, drawn=False):
        """height relative to H0 (the app's model z) at one point, None where the set has no tile"""
        k = self.source(E, N)
        if k is None:
            return None
        L, x, y = k
        s = ROOT_SIZE / (1 << L)
        h = self.tile(L, x, y)
        n = h.shape[0] - 1
        if drawn:                                   # the app's mesh: every second sample, triangles (a, b, c) and (a, c, d)
            h, n = h[::2, ::2], n // 2
        fu, fv = (E - ROOT_E0 - x * s) / s * n, (N - ROOT_N0 - y * s) / s * n
        i, j = min(n - 1, max(0, int(np.floor(fu)))), min(n - 1, max(0, int(np.floor(fv))))
        u, v = fu - i, fv - j
        za, zb, zc, zd = h[j, i], h[j, i + 1], h[j + 1, i + 1], h[j + 1, i]
        if drawn:
            return float(za + u * (zb - za) + v * (zc - zb) if u >= v else za + v * (zd - za) + u * (zc - zd))
        return float(za * (1 - u) * (1 - v) + zb * u * (1 - v) + zd * (1 - u) * v + zc * u * v)

    def nhn(self, E, N, drawn=False):
        z = self.z(E, N, drawn)
        return None if z is None else z + self.H0

    def nhn_many(self, E, N, drawn=False):
        E, N = np.asarray(E, float), np.asarray(N, float)
        out = np.full(E.shape, np.nan)
        for i in np.ndindex(E.shape):
            z = self.z(float(E[i]), float(N[i]), drawn)
            if z is not None:
                out[i] = z + self.H0
        return out


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', required=True)
    ap.add_argument('--drawn', action='store_true')
    ap.add_argument('coords', nargs='+', type=float)
    a = ap.parse_args()
    h = Hoehe(a.set)
    for i in range(0, len(a.coords) - 1, 2):
        E, N = a.coords[i], a.coords[i + 1]
        z = h.nhn(E, N, a.drawn)
        print(f'{E:.1f} {N:.1f}  ' + ('kein Boden im Satz' if z is None else f'{z:.2f} m NHN  (Kachel {"/".join(map(str, h.source(E, N)))})'))


if __name__ == '__main__':
    main()
