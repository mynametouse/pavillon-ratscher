#!/usr/bin/env python3
"""suhl-gebaeude: do the roofs in the aerial image lie on the footprints? The state's service names 'bDOM' as the reference of the
picture over Suhl (rectified on a surface model = a true orthophoto); in a classic orthophoto a roof lies off its footprint by
height x distance from the picture's centre / flight height - metres for a tall building. Only if roofs lie off would the lean have to
be corrected as tools/welt-gebaeude/retusche.py does.

The test: for the tall buildings of the sample tiles (flat roofs with a clear edge) the outline of the footprint is shifted over the
picture in steps of 0.4 m up to +-6 m; where the picture has its strongest edges under the outline, the roof is. A shift near zero
for buildings of 30 to 57 m means: the roofs lie in place.

  python3 -I tools/suhl/gebaeude/versatz.py [--tiles tools/suhl/out/gebaeude/probe/suhl/g/v0] [--min-height 20]
-> tools/suhl/out/gebaeude/versatz.json
"""
import argparse, glob, json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from gblib import S
import dachbild as LB


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tiles', default=os.path.join(G.OUT, 'probe', 'suhl', 'g', 'v0'))
    ap.add_argument('--min-height', type=float, default=20.0)
    ap.add_argument('--min-area', type=float, default=250.0)
    ap.add_argument('--out', default=os.path.join(G.OUT, 'versatz.json'))
    a = ap.parse_args()
    T = LB.Tiles(os.path.join(G.RAW, 'dop'), cir=False)
    rows = []
    for f in sorted(glob.glob(os.path.join(a.tiles, str(G.LEVEL), '*', '*.json'))):
        doc = json.load(open(f, encoding='utf-8'))
        L, tx, ty = S.parse_key(doc['key'])
        fr = S.tile_frame(L, tx, ty)
        cand = [b for b in doc['b'] if b['hr'] >= a.min_height and b['d']['gf'] >= a.min_area and b['hq'] == 2 and b['k'] in (0, 1)]
        if not cand:
            continue
        img = T.tile(tx, ty)
        if img is None:
            continue
        lum = img.rgb @ LB.LUMA
        gy, gx = np.gradient(lum)
        grad = np.hypot(gx, gy)
        for b in cand:
            E, N = fr.to_utm(np.array(b['f'][0::2]), np.array(b['f'][1::2]))
            # points every 0.4 m along the outline
            PE, PN = [], []
            n = len(E)
            for i in range(n):
                j = (i + 1) % n
                d = float(np.hypot(E[j] - E[i], N[j] - N[i]))
                m = max(1, int(d / 0.4))
                t = np.arange(m) / m
                PE.append(E[i] + (E[j] - E[i]) * t)
                PN.append(N[i] + (N[j] - N[i]) * t)
            PE, PN = np.concatenate(PE), np.concatenate(PN)
            best, zero = (-1.0, 0.0, 0.0), 0.0
            steps = np.arange(-6.0, 6.01, 0.4)
            for de in steps:
                for dn in steps:
                    u = ((PE + de - img.e0) / img.res).astype(int)
                    v = ((img.n1 - (PN + dn)) / img.res).astype(int)
                    ok = (u >= 0) & (u < img.w) & (v >= 0) & (v < img.h)
                    if ok.sum() < 0.9 * len(u):
                        continue
                    sc = float(grad[v[ok], u[ok]].mean())
                    if abs(de) < 1e-6 and abs(dn) < 1e-6:
                        zero = sc
                    if sc > best[0]:
                        best = (sc, float(de), float(dn))
            if best[0] <= 0:
                continue
            rows.append({'id': b['id'], 'hr': b['hr'], 'gf': b['d']['gf'], 'adr': (b.get('adr') or '')[:40], 'de': round(best[1], 1), 'dn': round(best[2], 1),
                         'shift_m': round(float(np.hypot(best[1], best[2])), 1), 'edge_best': round(best[0], 4), 'edge_at_zero': round(zero, 4)})
    rows.sort(key=lambda r: -r['hr'])
    sh = np.array([r['shift_m'] for r in rows]) if rows else np.array([0.0])
    res = {'made': S.now() if hasattr(S, 'now') else '', 'quelle': 'WMS th_dop (DOP20, Bildflug 15.05.2024), © GDI-Th, CC BY 4.0; 0,4 m je Bildpunkt',
           'gebaeude': len(rows), 'min_hoehe_m': a.min_height, 'versatz_median_m': round(float(np.median(sh)), 2),
           'versatz_p90_m': round(float(np.percentile(sh, 90)), 2), 'versatz_max_m': round(float(sh.max()), 2),
           'innerhalb_1_m': int((sh <= 1.0).sum()), 'erwartung_klassisches_orthofoto': 'mehrere Meter bei 30-57 m Höhe', 'liste': rows}
    G.write_json(a.out, res, compact=False)
    G.log({k: v for k, v in res.items() if k != 'liste'})
    for r in rows[:25]:
        G.log(r)


if __name__ == '__main__':
    main()
