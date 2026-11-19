#!/usr/bin/env python3
"""feat/ferne step 2: the forests far away as a canopy – per 400 m cell of weltwald/z/ (tools/weltwald/baeume.py, WWB2) a grid of
20 x 20 squares of 20 m: the crowns' cover, their mean top height and the conifers' share.

Reads <dist>/weltwald/z/*.bin (the copy in the build output – the data themselves belong to the map chat and are not changed here) and
writes <dist>/ferne/wald.bin:
  b'FWD1' + uint32 n + n x <hh> (i, j) + n x 400 x 2 bytes (row 0 south, column 0 west):
    byte 0  top height in ½ m (0: no crowns)
    byte 1  cover in 16ths (low nibble, 0–15 for 0–1) | conifers in 16ths (high nibble)
  the whole deflated (zlib).
Run by viz3/build.py after the extras are copied: new forest cells come with the build by themselves.
"""
import glob
import math
import os
import struct
import sys
import zlib

CELL, RES = 400, 20
NR = CELL // RES


def decode(buf):
    """the trees of a cell: lists x, y (m in the cell), h (m), r (m), kind (plain Python: the build machine has no numpy)"""
    if buf[:4] != b'WWB2':
        raise ValueError('not WWB2')
    n = struct.unpack_from('<I', buf, 4)[0]
    raw = zlib.decompress(buf[8:])
    x, y, h, r, k = [], [], [], [], []
    yd = 0
    for t in range(n):
        yd = (yd + (raw[2 * n + t] | (raw[3 * n + t] << 8))) & 0xFFFF
        x.append((raw[t] | (raw[n + t] << 8)) / 10.0)
        y.append(yd / 10.0)
        h.append(raw[4 * n + t] / 4.0)
        r.append(raw[5 * n + t] / 10.0)
        k.append(raw[6 * n + t] & 15)
    return x, y, h, r, k


def cell(path):
    x, y, h, r, k = decode(open(path, 'rb').read())
    A = [0.0] * (NR * NR)
    H = [0.0] * (NR * NR)
    C = [0.0] * (NR * NR)
    for t in range(len(x)):
        if k[t] == 7 or h[t] < 3:  # (shrubs and young growth stay out: the canopy is the forest's roof)
            continue
        q = min(NR - 1, max(0, int(y[t] // RES))) * NR + min(NR - 1, max(0, int(x[t] // RES)))
        a = math.pi * max(r[t], 1.0) ** 2
        A[q] += a
        H[q] += a * h[t]
        C[q] += a * (k[t] <= 2)
    out = bytearray(NR * NR * 2)
    has = False
    for q in range(NR * NR):
        if A[q] <= 0:
            continue
        has = True
        out[q * 2] = min(255, max(1, int(round(H[q] / A[q] * 2))))
        cov = min(15, max(0, int(round(A[q] / (RES * RES) * 15))))
        con = min(15, max(0, int(round(C[q] / A[q] * 15))))
        out[q * 2 + 1] = cov | (con << 4)
    return bytes(out) if has else None


def main(dist):
    fs = sorted(glob.glob(os.path.join(dist, 'weltwald', 'z', '*_*.bin')))
    ij, body = [], []
    for f in fs:
        try:
            i, j = map(int, os.path.basename(f)[:-4].split('_'))
            b = cell(f)
        except Exception as e:  # a broken cell: leave it out, the rest stands
            print('ferne wald: skip', os.path.basename(f), e)
            continue
        if b:
            ij.append(struct.pack('<hh', i, j))
            body.append(b)
    raw = b'FWD1' + struct.pack('<I', len(ij)) + b''.join(ij) + b''.join(body)
    os.makedirs(os.path.join(dist, 'ferne'), exist_ok=True)
    out = zlib.compress(raw, 9)
    open(os.path.join(dist, 'ferne', 'wald.bin'), 'wb').write(out)
    print(f'ferne wald: {len(ij)} of {len(fs)} forest cells, {len(out) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', 'viz3', 'dist'))
