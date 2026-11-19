#!/usr/bin/env python3
"""feat/ferne: the fields of the vegetation maps, coarse – for the crops far away (viz3/extra/ferne/dist/ferne/felder.bin).

The maps of bewuchs (viz3/extra/bewuchs-daten/dist/bewuchs/z/<i>_<j>.png: 400 m cells, 1 m texels, north up; value = class | vigour << 5,
bewuchs/bw_karte.js) are loaded by the app only within ~520 m of the walker; bewuchs/bw_ferne.js shows the crops of the fields in the
ground out to ~340 m. For the crops out to ~2 km a coarse copy: per cell 50 × 50 texels of 8 m (row 0 the south), the class of a crop
(9, 19–22) where at least half of the 8 m square is that crop's field, else 0. Only cells with fields; zlib-compressed:

  'FLD1', uint32 cells, per cell int16 i, int16 j; then 2500 bytes per cell in that order

Run by hand when the maps change (Pillow and numpy; the build does not need them): python3 tools/ferne/felder.py
"""
import glob, os, struct, zlib
import numpy as np
from PIL import Image

H = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(H, '..', '..', 'viz3', 'extra', 'bewuchs-daten', 'dist', 'bewuchs', 'z')
OUT = os.path.join(H, '..', '..', 'viz3', 'extra', 'ferne', 'dist', 'ferne', 'felder.bin')
CROPS = (9, 19, 20, 21, 22)
S = 8


def main():
    cells = []
    for fn in sorted(glob.glob(os.path.join(SRC, '*_*.png'))):
        try:
            i, j = (int(v) for v in os.path.basename(fn)[:-4].split('_'))
        except ValueError:
            continue
        a = np.asarray(Image.open(fn).convert('L'))
        if a.shape != (400, 400):
            a = np.asarray(Image.open(fn).convert('L').resize((400, 400), Image.NEAREST))
        cls = (a & 31)[::-1]   # row 0 the south
        out = np.zeros((50, 50), np.uint8)
        any_ = False
        for c in CROPS:
            m = (cls == c).reshape(50, S, 50, S).mean(axis=(1, 3))
            sel = m >= 0.5
            if sel.any():
                out[sel] = c
                any_ = True
        if any_:
            cells.append((i, j, out.tobytes()))
    head = b'FLD1' + struct.pack('<I', len(cells)) + b''.join(struct.pack('<hh', i, j) for i, j, _ in cells)
    raw = head + b''.join(b for _, _, b in cells)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    z = zlib.compress(raw, 9)
    open(OUT, 'wb').write(z)
    print('felder: %d cells with fields, %d KB (%d KB raw)' % (len(cells), len(z) // 1024, len(raw) // 1024))


if __name__ == '__main__':
    main()
