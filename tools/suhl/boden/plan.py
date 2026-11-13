#!/usr/bin/env python3
"""suhl-boden: the tile plan - which ground tiles (terrain t/ and aerial image i/) exist at which level. Tile lists, no rectangles.

  python3 -I tools/suhl/boden/plan.py [--mode probe|stadt] [--write]      -> tools/suhl/out/boden/plan/<mode>.json (with --write)

The app (viz3/src/welt/welt.js) starts from level-10 tiles within 760 m of the camera and refines a tile into its four children
only when all four exist. So the lists obey three rules:
  1. level 10 covers every place one can stand on (the municipality and the road corridors);
  2. levels 11 and 12 come in complete quads: the level-(L+1) list is the set of all four children of chosen level-L tiles;
  3. every tile of the levels 7..12 has its parent in the list above it (the far ground of levels 6-9 never has a hole under a finer tile).

mode probe (the sample set for the runtime agent): the level-10 tiles touching `zentrum`, all their children (levels 11, 12), their
  parents (levels 9..6).
mode stadt (the whole city, GitHub Actions):
  level 10  the tiles touching `stadt` + the tiles touching the road corridors garden -> Suhl (the four routes of korridor.json,
            600 m to both sides) that the existing world does not have (outside test block B and the block of Kloster Vessra)
  level 11  the children of the level-10 tiles that are built-up or driven on: touching `kernstadt`; in a road corridor; holding
            at least BUILT buildings (bebaut10.json); around a village centre of gebiete.geojson (VILLAGE_R)
  level 12  the children of the level-11 tiles touching `kernstadt`
  level 9, 8  the parents            level 7, 6  the parents and, where the existing world has no outer terrain (north of model
            y = 11 864 and west of model x = -11 832), one ring of neighbours for the horizon
"""
import argparse, json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blib
from blib import touching, kids, parents, ring, rect_of, tbounds, tsize

CORRIDOR_M = 600.0
VILLAGE_R = 300.0        # level 11 around every Ortsteil point of gebiete.geojson, whatever the building count says
BUILT = 8                # a level-10 tile (400 m, 16 ha) with at least this many buildings counts as built-up
BEBAUT = os.path.join(blib.HERE, 'bebaut10.json')


def corridor():
    from shapely.ops import unary_union
    return unary_union([r.buffer(CORRIDOR_M, 16) for r in blib.routes().values()])


def built_tiles():
    """level-10 tiles with their building count (bebaut10.json, derived from OpenStreetMap) -> {(x, y): n}; {} when the file is missing"""
    if not os.path.exists(BEBAUT):
        return {}
    j = json.load(open(BEBAUT, encoding='utf-8'))
    return {(int(k.split('/')[0]), int(k.split('/')[1])): v for k, v in j['tiles'].items()}


def make(mode):
    """-> (lists {level: set of (x, y)}, info dict)"""
    G, places, centre = blib.areas()
    info = {'mode': mode, 'centre_utm': [round(v, 1) for v in centre]}
    T = {}
    if mode == 'probe':
        T[10] = touching(10, G['zentrum'])
        T[11] = kids(T[10])
        T[12] = kids(T[11])
        for L in (9, 8, 7, 6):
            T[L] = parents(T[L + 1])
        info['rule'] = 'level 10: tiles touching zentrum; 11, 12: all their children; 9..6: their parents'
    elif mode == 'stadt':
        from shapely.geometry import Point
        from shapely.ops import unary_union
        cor = corridor()
        old = blib.in_rect(10, blib.BLOCK_B) | blib.in_rect(10, blib.BLOCK_V)
        s10 = touching(10, G['stadt'])
        c10 = touching(10, cor) - old
        k10 = touching(10, G['kernstadt'])
        T[10] = s10 | c10
        bt = built_tiles()
        b10 = {t for t, n in bt.items() if n >= BUILT} & T[10]
        v10 = touching(10, unary_union([Point(p[2]).buffer(VILLAGE_R) for p in places])) & T[10]
        sel = (k10 | c10 | b10 | v10) & T[10]
        T[11] = kids(sel)
        k11 = touching(11, G['kernstadt'])
        T[12] = kids(k11)
        assert k11 <= T[11]
        T[9] = parents(T[10])
        T[8] = parents(T[9])
        outer = blib.outer_square()
        beyond = lambda L, ts: {t for t in ts if not outer.contains(Point(*[(a + b) / 2 for a, b in zip(tbounds(L, *t)[:2], tbounds(L, *t)[2:])]))}
        p7 = parents(T[8])
        T[7] = p7 | beyond(7, ring(p7) - p7)
        p6 = parents(T[7])
        T[6] = p6 | beyond(6, ring(p6) - p6)
        info.update({
            'rule': __doc__.split('mode stadt (the whole city, GitHub Actions):')[1].strip(),
            'corridor_m': CORRIDOR_M, 'village_r_m': VILLAGE_R, 'built_min_buildings': BUILT, 'bebaut10': bool(bt),
            'level10': {'stadt': len(s10), 'corridor_outside_the_existing_blocks': len(c10), 'corridor_only': len(c10 - s10)},
            'level11_parents': {'kernstadt': len(k10), 'corridor': len(c10), 'built': len(b10), 'village': len(v10), 'union': len(sel),
                                'only_corridor': len(c10 - k10 - b10 - v10), 'only_built': len(b10 - k10 - c10 - v10),
                                'only_village': len(v10 - k10 - c10 - b10)},
            'level12_parents': {'kernstadt_level11': len(k11)},
            'ring': {'7': len(T[7] - p7), '6': len(T[6] - p6)}})
    else:
        raise SystemExit('mode?')
    blib.guard(T)
    # rule 2 and 3
    for L in (11, 12):
        assert T[L] == kids(parents(T[L])) and parents(T[L]) <= T[L - 1], f'level {L}: no complete quads'
    for L in (7, 8, 9, 10):
        assert parents(T[L]) <= T[L - 1], f'level {L}: a tile without its parent'
    info['counts'] = {str(L): len(T[L]) for L in sorted(T)}
    info['km2'] = {str(L): round(len(T[L]) * tsize(L) ** 2 / 1e6, 2) for L in sorted(T)}
    return T, info


def to_json(T, info):
    return {'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), **info,
            'tiling': 'quadtree of tools/welt/wlib.py: root 409.6 km at E 420700 / N 5390800 (UTM 32N), tile (L, x, y), x east, y north',
            'levels': {str(L): {'size_m': tsize(L), 'rect': rect_of(T[L]), 'n': len(T[L]), 'has': sorted(list(t) for t in T[L])} for L in sorted(T)}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', default='probe')
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    T, info = make(a.mode)
    print(json.dumps({k: v for k, v in info.items() if k != 'rule'}, ensure_ascii=False, indent=1))
    if a.write:
        p = os.path.join(blib.OUT, 'plan', a.mode + '.json')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        json.dump(to_json(T, info), open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print('written', p, os.path.getsize(p), 'bytes')


if __name__ == '__main__':
    main()
