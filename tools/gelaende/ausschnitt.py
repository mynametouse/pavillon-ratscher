#!/usr/bin/env python3
"""A 1 m DGM1 window as a working file for a closer look (Karten-Chat, 19.11.2026: the brook and the field path between the garden and
the lower village of Ratscher). Reads the zips the check fetched (<raw>/dgm1/, tools/gelaende/pruefung.py) and writes
<out>/dgm1_<name>.npz: a = heights NHN (float32, row 0 = north), e0 = E of the left edge, n1 = N of the top edge, px = 1.
For the workflow artifact only - DGM1 © GDI-Th (CC BY 4.0), bezogen über easygeodata.de; not for the repository.

    python3 -I tools/gelaende/ausschnitt.py --raw ~/gel-raw --out out/gelaende --egd ext/suhl/tools/suhl/lib \
        --name ratscher --box 625000 5595000 626300 5596100
"""
import argparse, os, sys
import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--egd', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--box', nargs=4, type=float, required=True, metavar=('E0', 'N0', 'E1', 'N1'))
    a = ap.parse_args()
    sys.path.insert(0, os.path.abspath(a.egd))
    import easygeodata as EG
    e0, n0, e1, n1 = a.box
    W, H = int(e1 - e0), int(n1 - n0)
    A = np.full((H, W), np.nan, np.float32)
    got = 0
    for ek in range(int(e0 // 1000), int((e1 - 1) // 1000) + 1):
        for nk in range(int(n0 // 1000), int((n1 - 1) // 1000) + 1):
            p = os.path.join(a.raw, 'dgm1', f'dgm1_32_{ek}_{nk}.zip')
            if not os.path.exists(p):
                print('fehlt', p)
                continue
            t, el, nt, px = EG.read_tile(p)
            if abs(px - 1) > 1e-6:
                continue
            # tile pixel (r, c) covers E el + c .. el + c + 1, N nt - r - 1 .. nt - r
            c0, r0 = int(round(el - e0)), int(round(n1 - nt))
            rs, cs = max(0, -r0), max(0, -c0)
            r1, c1 = min(H, r0 + t.shape[0]), min(W, c0 + t.shape[1])
            if r1 > max(r0, 0) and c1 > max(c0, 0):
                A[max(r0, 0):r1, max(c0, 0):c1] = t[rs:rs + r1 - max(r0, 0), cs:cs + c1 - max(c0, 0)]
                got += 1
    os.makedirs(a.out, exist_ok=True)
    p = os.path.join(a.out, f'dgm1_{a.name}.npz')
    np.savez_compressed(p, a=A, e0=e0, n1=n1, px=1.0)
    print(f'{p}: {W} x {H} m aus {got} Kacheln, {np.isfinite(A).mean() * 100:.1f} % belegt, {os.path.getsize(p) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
