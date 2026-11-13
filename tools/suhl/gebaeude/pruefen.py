#!/usr/bin/env python3
"""suhl-gebaeude: checks of the building tiles without a browser (plan section 5.3, pattern tools/welt/test_welt.py).

  python3 -I tools/suhl/gebaeude/pruefen.py --tiles tools/suhl/out/gebaeude/probe/suhl/g/v0 [--area probe|stadt] [--out FILE]

Checks: the index matches the files; every record has the fields of the schema; ids unique over all tiles; footprints valid and
inside (or close to) their tile, the representative point of every footprint in its own tile (no building in two tiles); heights
plausible; the roof is closed (the faces cover the footprint) and its areas fit the footprint; sides match the edges of the rings;
floors x storey height fits the eave; footprints do not overlap; for the city: the count against stage 1 (30,929 ETHOS bodies in
`stadt`) and the centre of Suhl inside. Exit status 1 when a hard check fails.
"""
import argparse, glob, json, math, os, sys
from collections import Counter
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from gblib import wlib, S

NEED = ('id', 'k', 'use', 'typ', 'era', 'eraq', 'kat', 'f', 'e', 'hr', 'hq', 'r', 'rq', 'R', 'S', 'd')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tiles', required=True)
    ap.add_argument('--area', default='probe', choices=['probe', 'stadt'])
    ap.add_argument('--out', default=None)
    ap.add_argument('--max-bytes', type=int, default=0, help='hard limit for all tiles together (the sample set: 3 MB)')
    a = ap.parse_args()
    from shapely.geometry import Polygon, Point
    from shapely.strtree import STRtree
    res, fails, warns = {'checks': {}}, [], []

    def ck(name, ok, info, hard=True):
        res['checks'][name] = {'ok': bool(ok), 'info': info}
        if not ok:
            (fails if hard else warns).append(name)
        G.log('ok  ' if ok else ('FAIL' if hard else 'warn'), name, '-', info)

    idx = json.load(open(os.path.join(a.tiles, 'index.json'), encoding='utf-8'))
    files = sorted(glob.glob(os.path.join(a.tiles, str(G.LEVEL), '*', '*.json')))
    keys = {'%d/%d' % S.parse_key(f)[1:] for f in files}
    ck('index lists the files', keys == set(idx['tiles']) and sorted(S.tileset_decode(idx['has'][str(G.LEVEL)])) == sorted(
        tuple(int(v) for v in k.split('/')) for k in keys), f'{len(files)} files, {len(idx["tiles"])} in the index')
    cx, cy = G.tile_of(*G.CENTRE)
    ck('centre of Suhl inside', f'{cx}/{cy}' in keys, f'tile {cx}/{cy}')
    ids, n, bytes_ = Counter(), 0, 0
    bad_field, bad_geom, out_tile, far, bad_h, open_roof, bad_area, bad_sides, bad_floor, no_z0 = [], [], [], [], [], [], [], [], [], 0
    tall = []
    polys, pid = [], []
    stadt = G.areas()['stadt']
    from shapely.prepared import prep
    pstadt = prep(stadt.buffer(1.0))
    outside = 0
    for f in files:
        bytes_ += os.path.getsize(f)
        doc = json.load(open(f, encoding='utf-8'))
        L, tx, ty = S.parse_key(doc['key'])
        fr = S.tile_frame(L, tx, ty)
        if [round(v, 3) for v in fr.o] != [round(v, 3) for v in doc['o']] or len(doc['b']) != doc['n'] or idx['tiles'][f'{tx}/{ty}'][0] != doc['n']:
            bad_field.append((doc['key'], 'header'))
        e0, n0, e1, n1 = fr.utm
        for b in doc['b']:
            n += 1
            ids[b['id']] += 1
            miss = [k for k in NEED if k not in b]
            if miss:
                bad_field.append((b['id'], miss))
                continue
            fx, fy = np.array(b['f'][0::2]), np.array(b['f'][1::2])
            E, N = fr.to_utm(fx, fy)
            holes = []
            for h in b.get('h', []):
                hE, hN = fr.to_utm(np.array(h[0::2]), np.array(h[1::2]))
                holes.append(list(zip(hE, hN)))
            try:
                p = Polygon(list(zip(E, N)), holes)
            except Exception:
                bad_geom.append(b['id'])
                continue
            if not p.is_valid or p.area < 0.8 or len(fx) < 3:
                bad_geom.append(b['id'])
                continue
            rp = p.representative_point()
            if G.tile_of(rp.x, rp.y) != (tx, ty):
                # the tile is chosen with the source footprint; the simplified outline may move the point by centimetres at an edge
                if not (e0 - 1 <= rp.x <= e1 + 1 and n0 - 1 <= rp.y <= n1 + 1):
                    out_tile.append(b['id'])
            if p.bounds[0] < e0 - 250 or p.bounds[2] > e1 + 250 or p.bounds[1] < n0 - 250 or p.bounds[3] > n1 + 250:
                far.append(b['id'])
            if a.area == 'stadt' and not pstadt.contains(rp):
                outside += 1
            if not (0.3 <= b['hr'] <= 120 and 0.3 <= b['e'] <= b['hr'] + 0.01):
                bad_h.append((b['id'], b['e'], b['hr']))
            # the roof: areas against the footprint (a sloped roof is larger than its footprint by 1 / cos(slope))
            ra = sum(r_['a'] for r_ in b['R'])
            plan = sum(r_['a'] * math.cos(math.radians(r_.get('sl', 0))) for r_ in b['R'])
            if b['k'] != 8 and abs(plan - p.area) > max(1.5, 0.06 * p.area):
                open_roof.append((b['id'], round(plan, 1), round(p.area, 1)))
            if abs(b['d']['gf'] - p.area) > max(1.0, 0.03 * p.area):
                bad_area.append((b['id'], b['d']['gf'], round(p.area, 1)))
            ne = len(fx) + sum(len(h) // 2 for h in b.get('h', []))
            if len(b['S']) != ne and 'Sx' not in b:
                bad_sides.append((b['id'], len(b['S']), ne))
            fa = b.get('fa')
            if fa and b['k'] == 0 and b.get('gs'):
                top = fa['sock'] + fa['h0'] + (fa['gs'] - 1) * fa['hf']
                if abs(top - b['e']) > 1.0:
                    bad_floor.append((b['id'], round(top, 1), b['e']))
            if 'z0' not in b:
                no_z0 += 1
            if b['hr'] >= 25:
                tall.append(b)
            if b['k'] != 8:
                polys.append(p)
                pid.append(b['id'])
    dup = [k for k, v in ids.items() if v > 1]
    ck('fields complete', not bad_field, f'{len(bad_field)} records or headers with missing fields {bad_field[:3]}')
    ck('ids unique', not dup, f'{n} records, {len(dup)} ids more than once {dup[:3]}')
    ck('footprints valid', not bad_geom, f'{len(bad_geom)} invalid {bad_geom[:3]}')
    ck('no building in two tiles', not out_tile, f'{len(out_tile)} with their point outside their tile {out_tile[:3]}')
    ck('footprints near their tile', len(far) == 0, f'{len(far)} reach more than 250 m beyond their tile {far[:3]}', hard=False)
    ck('heights plausible', not bad_h, f'{len(bad_h)} outside 0.3..120 m or eave above the top {bad_h[:3]}')
    ck('roof closed', len(open_roof) <= 0.002 * n, f'{len(open_roof)} roofs whose faces do not cover the footprint (plan area differs by more than 6 %) {open_roof[:3]}')
    ck('areas in true m²', not bad_area, f'{len(bad_area)} footprint areas differ from the outline by more than 3 % {bad_area[:3]}')
    ck('sides match the edges', not bad_sides, f'{len(bad_sides)} {bad_sides[:3]}')
    ck('floors fit the eave', len(bad_floor) <= 0.01 * n, f'{len(bad_floor)} houses where plinth + floors x storey height misses the eave by more than 1 m {bad_floor[:3]}')
    ck('foot heights', no_z0 == 0, f'{no_z0} records without z0 (run fuss.py)', hard=False)
    # footprints do not overlap (the sources are cadastre parts: they touch, they must not cover each other)
    tree = STRtree(polys)
    ov, worst = 0, []
    for i, p in enumerate(polys):
        for j in tree.query(p):
            if j <= i:
                continue
            try:
                ia = p.intersection(polys[j]).area
            except Exception:
                continue
            if ia > 1.0:
                ov += 1
                worst.append((round(ia, 1), pid[i], pid[j]))
    worst.sort(reverse=True)
    ck('footprints do not overlap', ov <= 0.01 * n, f'{ov} pairs overlap by more than 1 m² (largest {worst[:3]})', hard=ov > 0.03 * n)
    # the tall buildings (25 m and more) one by one against stage 1 (tools/suhl/out/bestand/ethos.json)
    try:
        ref_t = {t_['id'][4:]: t_ for t_ in json.load(open(os.path.join(G.BESTAND, 'ethos.json'), encoding='utf-8'))['hohe_gebaeude_ab_25_m']['liste']}
    except Exception:
        ref_t = {}
    mine = {b_['id']: b_ for b_ in tall}
    wrong = [(i_, mine[i_]['hr'], ref_t[i_]['hoehe_m']) for i_ in mine if i_ in ref_t and abs(mine[i_]['hr'] - ref_t[i_]['hoehe_m']) > 0.11]
    extra = [i_ for i_ in mine if i_ not in ref_t and mine[i_].get('hq') == 2]
    lost = [i_ for i_ in ref_t if i_ not in mine] if a.area == 'stadt' else []
    res['tall'] = [{**{k_: mine[i_].get(k_) for k_ in ('id', 'hr', 'k', 'typ', 'use', 'gs', 'gsq', 'r', 'n', 'adr')}, 'gf': mine[i_]['d']['gf'],
                    'stage1_m': ref_t.get(i_, {}).get('hoehe_m')} for i_ in sorted(mine, key=lambda q: -mine[q]['hr'])]
    ck('tall buildings against stage 1', not wrong and not lost and not extra,
       f'{len(mine)} records of 25 m and more ({sum(1 for v in mine.values() if v["d"]["gf"] >= 100)} with 100 m² and more), stage 1 lists {len(ref_t)} in the city; '
       f'height differs {wrong[:3]}, missing {lost[:3]}, not in stage 1 {extra[:3]}')
    if a.area == 'stadt':
        ref = json.load(open(os.path.join(G.BESTAND, 'bestand.json'), encoding='utf-8'))
        ne_ = None
        try:
            ne_ = json.load(open(os.path.join(G.BESTAND, 'ethos.json'), encoding='utf-8'))['gebiete']['stadt']['anzahl']
        except Exception:
            pass
        st = json.load(open(os.path.join(os.path.dirname(a.tiles.rstrip('/')), 'bauen_stadt.json'), encoding='utf-8')) if os.path.exists(
            os.path.join(os.path.dirname(a.tiles.rstrip('/')), 'bauen_stadt.json')) else {}
        from_ethos = st.get('src', {}).get('e')
        ck('count against stage 1', ne_ is not None and from_ethos is not None and abs(from_ethos - ne_) <= 0.005 * ne_,
           f'{from_ethos} records from ETHOS bodies, stage 1 counted {ne_} in stadt; {n} records in all (with buildings only the cadastre knows)')
        ck('more than 10 000 buildings', n > 10000, str(n))
        ck('inside the municipality', outside == 0, f'{outside} records with their point outside the boundary')
    if a.max_bytes:
        ck('size limit', bytes_ <= a.max_bytes, f'{bytes_} bytes, limit {a.max_bytes}')
    res.update({'tiles': len(files), 'buildings': n, 'bytes': bytes_, 'kb_per_building': round(bytes_ / 1024 / max(n, 1), 2), 'failed': fails, 'warnings': warns})
    if a.out:
        G.write_json(a.out, res, compact=False)
    G.log('checks', len(res['checks']), 'failed', fails, 'warnings', warns, '| tiles', len(files), 'buildings', n, 'bytes', bytes_)
    if fails:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
