#!/usr/bin/env python3
"""suhl-boden: checks of a finished ground tile set (plan 5.3) - no browser, seconds to a few minutes.

  python3 -I tools/suhl/boden/pruefen.py --set DIR [--mode probe|stadt] [--json FILE]

  lists     every tile of meta.json `has` has its terrain and its image file, no file besides them; rect = frame of has;
            levels 11 and 12 in complete quads; every tile of the levels 7-12 has its parent; the list equals the plan of the mode
  centre    the tile holding the centre of Suhl (E 619762, N 5607680) is in every level; the ground there lies at a plausible height
  edges     neighbouring terrain tiles of one level have the same heights (cm) on their common edge - every pair of the set
  levels    how far a tile lies from its parent at the points they share (reported, no limit: the levels are drawn with skirts)
  sizes     bytes per tile and level inside the expected range; every image is 512 x 512 RGB and not blank
  heights   lowest and highest point of the set inside what Suhl has (Markt ~ 430 m, Grosser Beerberg 983 m)
Exit code 1 when a check fails. The numbers go to --json (and into the workflow summary).
"""
import argparse, json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blib
from blib import tsize, tbounds, kids, parents, rect_of, wlib
import tiles as wtiles

# bytes per tile (mean of a level): terrain WTH1, image WebP 512 px (measured on the test block, Vessra and the sample set of Suhl)
T_RANGE = (700, 40000)
I_RANGE = {12: (6000, 60000), 11: (9000, 90000), 10: (12000, 120000), 9: (15000, 140000), 8: (15000, 140000), 7: (15000, 140000), 6: (15000, 140000)}
I_MIN = 1500          # a single image below this is blank (one colour)
H_CENTRE = (400.0, 480.0)     # NHN at the centre of Suhl
H_ALL = (250.0, 1000.0)       # NHN anywhere in the set


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', required=True)
    ap.add_argument('--mode', default='')
    ap.add_argument('--json', default='')
    ap.add_argument('--images', default='all', help="'all' or a number: how many images per level are opened")
    ap.add_argument('--terrain-only', action='store_true', help='a set without images (the ground before the road cut)')
    a = ap.parse_args()
    R = {'set': a.set, 'checks': {}, 'fails': []}

    def ck(name, ok, info=''):
        R['checks'][name] = {'ok': bool(ok), 'info': info}
        if not ok:
            R['fails'].append(name)
        print(('PASS ' if ok else 'FAIL ') + name + (' – ' + str(info) if info else ''), flush=True)

    meta = json.load(open(os.path.join(a.set, 'meta.json'), encoding='utf-8'))
    lv = meta['tiling']['levels']
    T = {int(L): {tuple(t) for t in v['has']} for L, v in lv.items()}
    H0 = meta['H0']

    # ---- lists ----
    missing, extra = [], []
    for sub, ext in ((('t', '.bin'),) if a.terrain_only else (('t', '.bin'), ('i', '.webp'))):
        found = {}
        base = os.path.join(a.set, sub)
        for Ls in (os.listdir(base) if os.path.isdir(base) else []):
            for xs in os.listdir(os.path.join(base, Ls)):
                for f in os.listdir(os.path.join(base, Ls, xs)):
                    y = f[:-len(ext)] if f.endswith(ext) else None
                    if y is None or not (Ls.isdigit() and xs.isdigit() and y.isdigit()):
                        extra.append(f'{sub}/{Ls}/{xs}/{f}')
                    else:
                        found.setdefault(int(Ls), set()).add((int(xs), int(y)))
        for L in sorted(set(T) | set(found)):
            missing += [f'{sub}/{L}/{x}/{y}' for x, y in sorted(T.get(L, set()) - found.get(L, set()))]
            extra += [f'{sub}/{L}/{x}/{y}' for x, y in sorted(found.get(L, set()) - T.get(L, set()))]
    ck('lists: every listed tile has its terrain' if a.terrain_only else 'lists: every listed tile has terrain and image', not missing, f'{len(missing)} missing {missing[:5]}' if missing else f'{sum(len(v) for v in T.values())} tiles in {len(T)} levels')
    ck('lists: no file besides the lists', not extra, f'{len(extra)} extra {extra[:5]}' if extra else '')
    ck('lists: rect is the frame of has', all(lv[str(L)]['rect'] == rect_of(T[L]) for L in T))
    ck('lists: levels 11 and 12 in complete quads', all(T[L] == kids(parents(T[L])) for L in (11, 12) if L in T))
    orphan = {L: len(parents(T[L]) - T[L - 1]) for L in sorted(T) if L - 1 in T}
    ck('lists: every tile has its parent', not any(orphan.values()), str(orphan) if any(orphan.values()) else '')
    if a.mode:
        import plan as planmod
        P, _ = planmod.make(a.mode)
        cut = (meta.get('suhl') or {}).get('cut')
        same = all(T[L] == P[L] for L in T if not (cut and L == 12)) and (a.terrain_only or set(T) == set(P))
        ck('lists: equal to the plan of mode ' + a.mode, same and (not cut or T[12] <= P[12]), f'cut: {cut}' if cut else '')
    R['counts'] = {str(L): len(T[L]) for L in sorted(T)}

    # ---- centre ----
    inside = {L: blib.tile_of(L, *blib.CENTRE) in T[L] for L in sorted(T)}
    ck('centre of Suhl inside every level', all(inside.values()), str(blib.CENTRE))

    # ---- terrain: decode all, edges, levels, heights ----
    H = {}
    tb = {}
    for L in sorted(T):
        tot = 0
        for x, y in T[L]:
            p = os.path.join(a.set, 't', str(L), str(x), f'{y}.bin')
            if not os.path.exists(p):
                continue
            b = open(p, 'rb').read()
            tot += len(b)
            H[(L, x, y)] = np.round(wtiles.decode_heights(b) * 100).astype(np.int32)      # cm relative to H0, row 0 = south
        tb[L] = tot
    worst, pairs = 0, 0
    bad = []
    for (L, x, y), h in H.items():
        e = H.get((L, x + 1, y))
        if e is not None:
            d = int(np.abs(h[:, -1] - e[:, 0]).max())
            pairs += 1
            worst = max(worst, d)
            if d:
                bad.append(f'{L}/{x}/{y}|E {d} cm')
        n = H.get((L, x, y + 1))
        if n is not None:
            d = int(np.abs(h[-1, :] - n[0, :]).max())
            pairs += 1
            worst = max(worst, d)
            if d:
                bad.append(f'{L}/{x}/{y}|N {d} cm')
    ck('edges: neighbouring terrain tiles agree', not bad, f'{pairs} pairs, worst {worst} cm' + (f', {len(bad)} differ: {bad[:6]}' if bad else ''))
    R['edges'] = {'pairs': pairs, 'worst_cm': worst, 'differ': len(bad)}
    lev = {}
    for L in sorted(T):
        if L - 1 not in T:
            continue
        ds = []
        for x, y in T[L]:
            h, p = H.get((L, x, y)), H.get((L - 1, x >> 1, y >> 1))
            if h is None or p is None:
                continue
            i0, j0 = (x & 1) * 50, (y & 1) * 50
            ds.append(np.abs(h[::2, ::2] - p[j0:j0 + 51, i0:i0 + 51]).ravel())
        if ds:
            d = np.concatenate(ds) / 100.0
            lev[str(L)] = {'median_m': round(float(np.median(d)), 2), 'p95_m': round(float(np.percentile(d, 95)), 2), 'max_m': round(float(d.max()), 2)}
    R['level_to_parent'] = lev
    print('     level to parent (m):', json.dumps(lev), flush=True)
    c12 = max(T)
    cx, cy = blib.tile_of(c12, *blib.CENTRE)
    hc = None
    if (c12, cx, cy) in H:
        e0, n0 = tbounds(c12, cx, cy)[:2]
        st = tsize(c12) / 100
        hc = H[(c12, cx, cy)][int(round((blib.CENTRE[1] - n0) / st)), int(round((blib.CENTRE[0] - e0) / st))] / 100.0 + H0
    ck('centre: ground height plausible', hc is not None and H_CENTRE[0] <= hc <= H_CENTRE[1], f'{hc:.1f} m NHN (level {c12})' if hc is not None else 'no tile')
    lo = min(float(h.min()) for h in H.values()) / 100 + H0
    hi = max(float(h.max()) for h in H.values()) / 100 + H0
    ck('heights: inside what Suhl has', H_ALL[0] <= lo and hi <= H_ALL[1], f'{lo:.1f} .. {hi:.1f} m NHN')
    R['heights_nhn'] = {'centre': None if hc is None else round(hc, 1), 'min': round(lo, 1), 'max': round(hi, 1)}
    mm = meta['tiling']
    if not a.terrain_only:
        ck('heights: meta hmin/hmax hold every tile', mm.get('hmin') is not None and mm['hmin'] - 0.011 <= lo - H0 and hi - H0 <= mm['hmax'] + 0.011,
           f"meta {mm.get('hmin')} .. {mm.get('hmax')}, tiles {lo - H0:.2f} .. {hi - H0:.2f} (relative to H0)")

    # ---- sizes, images ----
    from PIL import Image
    sizes = {}
    okT = okI = okImg = True
    blank = []
    for L in sorted(T):
        n = len(T[L])
        ib = [os.path.getsize(os.path.join(a.set, 'i', str(L), str(x), f'{y}.webp')) for x, y in T[L] if os.path.exists(os.path.join(a.set, 'i', str(L), str(x), f'{y}.webp'))]
        sizes[str(L)] = {'n': n, 'terrain_bytes': tb[L], 'image_bytes': sum(ib), 'terrain_mean': round(tb[L] / max(n, 1)), 'image_mean': round(sum(ib) / max(len(ib), 1)),
                         'image_min': min(ib) if ib else 0, 'image_max': max(ib) if ib else 0}
        okT &= T_RANGE[0] <= tb[L] / max(n, 1) <= T_RANGE[1]
        okI &= a.terrain_only or (bool(ib) and I_RANGE[L][0] <= sum(ib) / len(ib) <= I_RANGE[L][1])
        todo = sorted(T[L])
        if a.images != 'all':
            todo = todo[::max(1, len(todo) // max(1, int(a.images)))]
        for x, y in todo:
            p = os.path.join(a.set, 'i', str(L), str(x), f'{y}.webp')
            if not os.path.exists(p):
                continue
            if os.path.getsize(p) < I_MIN:
                blank.append(f'{L}/{x}/{y}')
            with Image.open(p) as im:
                okImg &= im.size == (wlib.TILE_PX, wlib.TILE_PX) and im.mode == 'RGB'
    R['sizes'] = sizes
    ck('sizes: terrain bytes per tile in range', okT, ', '.join(f"{L}: {v['terrain_mean']}" for L, v in sizes.items()))
    if not a.terrain_only:
        ck('sizes: image bytes per tile in range', okI, ', '.join(f"{L}: {v['image_mean']}" for L, v in sizes.items()))
        ck('images: 512 x 512 RGB', okImg)
        ck('images: none blank', not blank, f'{len(blank)} under {I_MIN} bytes: {blank[:8]}' if blank else '')
    tot_t, tot_i = sum(v['terrain_bytes'] for v in sizes.values()), sum(v['image_bytes'] for v in sizes.values())
    R['total'] = {'tiles': sum(v['n'] for v in sizes.values()), 'terrain_mb': round(tot_t / 1e6, 2), 'image_mb': round(tot_i / 1e6, 2)}
    print(f"     {R['total']['tiles']} tiles: terrain {tot_t / 1e6:.2f} MB, image {tot_i / 1e6:.2f} MB", flush=True)
    for L, v in sizes.items():
        print(f"     level {L:>2}: {v['n']:5d} tiles  terrain {v['terrain_bytes'] / 1e6:7.2f} MB ({v['terrain_mean']:6d} B/tile)  "
              f"image {v['image_bytes'] / 1e6:7.2f} MB ({v['image_mean']:6d} B/tile, {v['image_min']} .. {v['image_max']})", flush=True)
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        json.dump(R, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('pruefen:', 'ok' if not R['fails'] else f"{len(R['fails'])} FAILED: {R['fails']}", flush=True)
    sys.exit(1 if R['fails'] else 0)


if __name__ == '__main__':
    main()
