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
import os
import struct
import sys
import zlib

import numpy as np

CELL, RES = 400, 20
NR = CELL // RES


def decode(buf):
    if buf[:4] != b'WWB2':
        raise ValueError('not WWB2')
    n = struct.unpack_from('<I', buf, 4)[0]
    raw = np.frombuffer(zlib.decompress(buf[8:]), np.uint8)
    pl = [raw[k * n:(k + 1) * n].astype(np.int64) for k in range(7)]
    x = (pl[0] | (pl[1] << 8)) / 10.0
    y = (np.cumsum(pl[2] | (pl[3] << 8)) & 0xFFFF) / 10.0
    return x, y, pl[4] / 4.0, pl[5] / 10.0, pl[6] & 15


def cell(path):
    x, y, h, r, k = decode(open(path, 'rb').read())
    if not len(x):
        return None
    ok = (k != 7) & (h >= 3)  # (shrubs and young growth stay out: the canopy is the forest's roof)
    x, y, h, r, k = x[ok], y[ok], h[ok], r[ok], k[ok]
    ix = np.clip((x // RES).astype(int), 0, NR - 1)
    iy = np.clip((y // RES).astype(int), 0, NR - 1)
    q = iy * NR + ix
    a = np.pi * np.maximum(r, 1.0) ** 2
    A = np.bincount(q, a, NR * NR)
    H = np.bincount(q, a * h, NR * NR)
    C = np.bincount(q, a * (k <= 2), NR * NR)
    out = np.zeros((NR * NR, 2), np.uint8)
    has = A > 0
    out[has, 0] = np.clip(np.round(H[has] / A[has] * 2), 1, 255)
    cov = np.clip(np.round(A / (RES * RES) * 15), 0, 15).astype(np.uint8)
    con = np.where(has, np.clip(np.round(C / np.maximum(A, 1e-9) * 15), 0, 15), 0).astype(np.uint8)
    out[:, 1] = cov | (con << 4)
    out[~has] = 0
    return out.tobytes() if has.any() else None


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
