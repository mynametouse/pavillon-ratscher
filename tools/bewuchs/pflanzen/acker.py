#!/usr/bin/env python3
"""The third atlas of the vegetation template (feat/bewuchs-pflanzen, part 3): the field crops of viz3/src/bewuchs/bw_arten.js
(BWARTEN.feldfruechte, zwischenfrucht) – rapeseed from the autumn rosette to the ripe pods, maize from the young plant to the dry stalk
and its stubble, sugar beet, potato, sunflower, clover-grass and lucerne, the mustard of the catch crops, and the ears of the cereals
(wheat without awns, barley with long awns, rye, triticale; green and ripe – the template draws the stalks itself). Drawn with the painter
of atlas.py in the same format (1024 x 1024 RGBA, 8 x 8 cells of 128 px, cell (c, r) from the top left, one plant – or one ear – in side
view, its foot at the bottom centre, filling the cell's height, straight alpha with the colour bled into the transparent pixels; our own
work). Cells nobody uses stay empty and are not listed in acker.json.

    nice -n 19 python3 tools/bewuchs/pflanzen/acker.py [OUT_DIR] [--sheets SHEET_DIR] [--only id,id]

writes OUT_DIR/acker.png and acker.json (default viz3/extra/bewuchs-pflanzen/dist/bewuchs).
"""
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas as A
import beete as BE
from atlas import hx, mix, mul, stem_path, leaves_along


def sgn(x):
    return 1 if x > 0 else -1


# ---------------------------------------------------------------- rapeseed and mustard (crucifers)

RAPS_LEAF = hx('#5a8a5c')


def lyrate_leaf(p, base, a, L, col, fore=1.0, bend=0.1):
    """a rapeseed leaf: a big rounded end lobe and small lobes down the stalk; blue-green with pale veins"""
    rib = p.leaf(base, a, L, L * 0.55, col, shape='oval', bend=bend, teeth=5, tooth=0.12, foreshort=fore)
    for t in (0.18, 0.32):
        q, d = p.at(rib, t)
        for s in (-1, 1):
            p.leaf(q, math.atan2(d[0], d[1]) + s * 1.1, L * 0.18, L * 0.1, mul(col, 0.95), shape='oval', rib=False)
    return rib


def f_raps_rosette(p):
    items = sorted([(p.r(-1.4, 1.4), p.r(0.36, 0.5)) for _ in range(14)], key=lambda q: -abs(q[0]))
    for a, L in items:  # the outer leaves first (behind), the upright ones in front
        col = p.jit(RAPS_LEAF, 0.06)
        if p.r() < 0.2:
            col = mix(col, hx('#7a4a5a'), 0.3)  # frost reddens a few leaves
        lyrate_leaf(p, (p.r(-0.03, 0.03), 0.0), a, L, col, fore=0.88 + 0.12 * math.cos(a), bend=0.15 * sgn(a))


def raps_stems(p, n, top_rng, col=hx('#6a8a4a'), spread=0.26, leaves=True, leaf_col=None):
    paths = []
    for k in range(n):
        u = p.r(-spread, spread)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(*top_rng), p.r(-0.05, 0.05))
        p.stroke(path, 0.012, 0.006, col, hl=0.1)
        if leaves:  # clasping leaves on the lower stem
            for t in (0.18, 0.32, 0.48):
                q, d = p.at(path, t)
                s = 1 if p.r() < 0.5 else -1
                p.leaf(q, math.atan2(d[0], d[1]) + s * 0.8, 0.13 * (1.2 - t), 0.06, p.jit(leaf_col or RAPS_LEAF, 0.05), shape='eilanz',
                       bend=0.08 * s)
        paths.append(path)
    return paths


def raceme_tips(p, path, n_side=3):
    """the flowering branches at the top of a stem: their tips"""
    tips = [path[-1]]
    for i in range(n_side):
        q, d = p.at(path, 0.62 + 0.1 * i)
        s = 1 if i % 2 else -1
        a = math.atan2(d[0], d[1]) + s * p.r(0.35, 0.6)
        L = p.r(0.12, 0.2)
        br = p.bez(q, (q[0] + math.sin(a) * L * 0.5, q[1] + math.cos(a) * L * 0.6), (q[0] + math.sin(a) * L, q[1] + math.cos(a) * L + 0.03), 8)
        p.stroke(br, 0.007, 0.004, hx('#6a8a4a'), hl=0)
        tips.append(br[-1])
    return tips


def f_raps_knospe(p):
    for path in raps_stems(p, 5, (0.72, 0.95)):
        for tip in raceme_tips(p, path, 2):
            dts = [(tip[0] + p.r(-0.022, 0.022), tip[1] + p.r(-0.03, 0.012), p.r(0.007, 0.011), p.jit(hx('#86a048'), 0.06)) for _ in range(16)]
            dts.sort(key=lambda q: q[1])
            p.dots(dts)
            p.dots([(tip[0] + p.r(-0.012, 0.012), tip[1] + p.r(0, 0.012), 0.006, hx('#d8c840')) for _ in range(3)])  # the first yellow


def crucifer_cluster(p, tip, col, n=22, rad=0.05, pods=0):
    """a raceme in flower: open four-petalled flowers round the top, buds above, young pods below"""
    for k in range(pods):
        q = (tip[0] + p.r(-0.03, 0.03), tip[1] - p.r(0.05, 0.16))
        a = p.r(-0.5, 0.5)
        p.stroke([q, (q[0] + math.sin(a) * 0.06, q[1] + math.cos(a) * 0.06)], 0.006, 0.004, hx('#7a9a48'), hl=0)
    items = []
    for k in range(n):
        ang = p.r(0, 6.283)
        rr = rad * math.sqrt(p.r(0, 1))
        items.append((tip[0] + math.cos(ang) * rr, tip[1] + math.sin(ang) * rr * 0.7 - 0.01, p.r(0.011, 0.015)))
    items.sort(key=lambda q: q[1])
    for u, v, r in items:
        c = p.jit(col, 0.05)
        p.rays((u, v), p.head_normal(0.55, 0.6), r * 0.15, r, r * 0.9, 4, c, col_tip=mix(c, (1, 1, 0.9), 0.15), cup=0.1, shape='rund',
               jitter=0.2)
    p.dots([(tip[0] + p.r(-0.012, 0.012), tip[1] + rad * 0.6 + p.r(0, 0.015), 0.006, mix(col, hx('#a8b048'), 0.4)) for _ in range(5)])


def f_raps_bluete(p):
    for path in raps_stems(p, 7, (0.66, 0.95), leaves=True, spread=0.3):
        for tip in raceme_tips(p, path, 3):
            crucifer_cluster(p, tip, hx('#f0d020'), n=24, rad=0.055, pods=3)


def pods_on(p, path, col, n=10, L=0.08, droop=0.0):
    for i in range(n):
        t = 0.5 + 0.5 * i / n
        q, d = p.at(path, t)
        s = 1 if i % 2 else -1
        a = math.atan2(d[0], d[1]) + s * p.r(0.3, 0.6) + droop * s
        e = (q[0] + math.sin(a) * L, q[1] + math.cos(a) * L)
        p.stroke([q, ((q[0] + e[0]) / 2 + 0.005 * s, (q[1] + e[1]) / 2), e], 0.015, 0.007, p.jit(col, 0.06), hl=0.15)


def f_raps_schoten(p):
    for path in raps_stems(p, 6, (0.75, 0.97), leaves=False, col=hx('#6a8a48'), spread=0.3):
        tips = raceme_tips(p, path, 3)
        pods_on(p, path, hx('#6e9040'), n=16)
        for tip in tips[1:]:
            q = (tip[0], tip[1] - 0.08)
            pods_on(p, [q, tip], hx('#6e9040'), n=8, L=0.07)


def f_raps_reif(p):
    for path in raps_stems(p, 6, (0.72, 0.95), col=hx('#7e6e50'), leaves=False, spread=0.3):
        tips = raceme_tips(p, path, 3)
        pods_on(p, path, hx('#857652'), n=16, droop=0.15)
        for tip in tips[1:]:
            q = (tip[0], tip[1] - 0.08)
            pods_on(p, [q, tip], hx('#7a6c4c'), n=8, L=0.07, droop=0.15)


def f_senf_jung(p):
    # the leafy mustard of a catch crop before it flowers: big lobed leaves, a few upright stems
    for k in range(9):
        a = p.r(-1.2, 1.2)
        lyrate_leaf(p, (p.r(-0.03, 0.03), 0.0), a, p.r(0.32, 0.45), p.jit(hx('#5e9a44'), 0.05), fore=0.8 + 0.2 * math.cos(a), bend=0.1 * sgn(a))
    for path in raps_stems(p, 3, (0.7, 0.92), col=hx('#6a9a48'), spread=0.18, leaf_col=hx('#5e9a44')):
        p.dots([(path[-1][0] + p.r(-0.01, 0.01), path[-1][1] + p.r(-0.01, 0.01), 0.008, hx('#8aaa50')) for _ in range(6)])


def f_senf_bluete(p):
    for k in range(5):
        a = p.r(-1.2, 1.2)
        lyrate_leaf(p, (p.r(-0.03, 0.03), 0.0), a, p.r(0.25, 0.32), p.jit(hx('#5e9a44'), 0.05), fore=0.8, bend=0.1 * sgn(a))
    for path in raps_stems(p, 6, (0.7, 0.95), col=hx('#6a9a48'), spread=0.3, leaf_col=hx('#5e9a44')):
        for tip in raceme_tips(p, path, 2):
            crucifer_cluster(p, tip, hx('#e8d850'), n=12, rad=0.04, pods=3)


# ---------------------------------------------------------------- clover-grass and lucerne


def grass_blades(p, n, top_rng, col=hx('#4e8a3a'), spread=0.4):
    for k in range(n):
        a = p.r(-spread, spread)
        L = p.r(*top_rng)
        p.leaf((p.r(-0.04, 0.04), 0.0), a, L, 0.025, p.jit(col, 0.07), shape='linear', bend=0.15 * sgn(a) + p.r(-0.05, 0.05), rib=False)


def f_kleegras_bluete(p):
    grass_blades(p, 26, (0.5, 0.95))
    A.clover_leaves(p, 9, 0.25, 0.6, 0.09, hx('#4a7a34'), spread=0.38)
    for k in range(5):
        path = stem_path(p, p.r(-0.03, 0.03), p.r(-0.3, 0.3), p.r(0.62, 0.85), p.r(-0.05, 0.05))
        p.stroke(path, 0.008, 0.006, hx('#5a7a3a'), hl=0)
        tip = path[-1]
        p.globe((tip[0], tip[1] + 0.03), 0.045, hx('#c04a7a'), count=40, fl=0.55, elong=1.3, dark=0.6)
    grass_blades(p, 10, (0.4, 0.8), col=hx('#5a9440'))


def f_luzerne(p):
    # a bushy lucerne plant: many stems with small trifoliate leaves, purple racemes on top
    for k in range(9):
        path = stem_path(p, p.r(-0.03, 0.03), p.r(-0.3, 0.3), p.r(0.65, 0.92), p.r(-0.06, 0.06))
        p.stroke(path, 0.008, 0.005, hx('#5e7e44'), hl=0)
        for t in (0.25, 0.4, 0.55, 0.7, 0.82):
            q, d = p.at(path, t)
            s = 1 if p.r() < 0.5 else -1
            A.trefoil(p, (q[0] + s * 0.03, q[1]), 0.05, p.jit(hx('#4e7e3a'), 0.06), chevron=False)
        tip = path[-1]
        dts = [(tip[0] + p.r(-0.02, 0.02), tip[1] + p.r(-0.01, 0.05), p.r(0.008, 0.011), p.jit(hx('#7a5ab0'), 0.08)) for _ in range(14)]
        dts.sort(key=lambda q: q[1])
        p.dots(dts)


# ---------------------------------------------------------------- maize

MAIS_LEAF = hx('#3f7a2e')


def maize_leaf(p, base, a, L, col, droop=0.35, w=0.06, fore=1.0):
    """a long strap-shaped maize leaf arching out and down, with its pale midrib"""
    rib = p.leaf(base, a, L, w, col, shape='linear', bend=droop * sgn(a), rib=True, foreshort=fore)
    return rib


def maize_stem(p, top, col=hx('#5e8a3e'), w=0.035, u0=0.0, lean=0.0):
    path = p.bez((u0, 0.0), (u0 + lean * 0.5, top * 0.5), (u0 + lean, top), 16)
    p.stroke(path, w, w * 0.55, col, hl=0.15)
    return path


def f_mais_jung(p):
    # four to six leaves from the whorl, bright green, the soil still bare around it
    p.stroke([(0, 0), (0, 0.12)], 0.03, 0.025, hx('#6a9a46'), hl=0.1)
    for k in range(6):
        a = (-1 if k % 2 else 1) * (0.25 + 0.14 * k) + p.r(-0.1, 0.1)
        maize_leaf(p, (0, 0.05 + 0.025 * k), a, p.r(0.55, 0.75) * (1 - 0.06 * k), p.jit(hx('#6aa044'), 0.05), droop=0.3, w=0.075)
    p.leaf((0, 0.15), p.r(-0.08, 0.08), 0.5, 0.05, hx('#7ab050'), shape='linear', bend=0.02, rib=False)  # the rolled leaf in the whorl


def maize_plant(p, stage):
    top = {'streckung': 0.9, 'fahne': 0.8, 'kolben': 0.8, 'reif': 0.8, 'trocken': 0.78}[stage]
    dry = stage == 'trocken'
    ripe = stage == 'reif'
    stem_col = hx('#a8966a') if dry else hx('#7e8a44') if ripe else hx('#5e8a3e')
    path = maize_stem(p, top, stem_col, w=0.035 if stage != 'streckung' else 0.03, lean=p.r(-0.02, 0.02))
    n = 10 if stage == 'streckung' else 12
    for i in range(n):
        t = 0.06 + 0.86 * i / n + p.r(-0.02, 0.02)
        q, d = p.at(path, t)
        s = (1 if i % 2 else -1) if p.r() < 0.85 else (-1 if i % 2 else 1)
        L = (0.42 * (1 - abs(t - 0.45) * 0.9) + 0.1) * p.r(0.8, 1.15)
        fore = 1.0 if p.r() < 0.7 else p.r(0.45, 0.75)  # some leaves point towards the viewer
        if dry:
            col = p.jit(hx('#b09a6c'), 0.06)
            droop = p.r(1.1, 1.5)
        elif ripe:
            col = p.jit(mix(MAIS_LEAF, hx('#b0a060'), 0.7 if t < 0.35 else 0.25), 0.05)
            droop = p.r(0.9, 1.3) if t < 0.35 else p.r(0.7, 1.0)
        else:
            col = p.jit(MAIS_LEAF if t > 0.2 else hx('#4a8034'), 0.05)
            droop = p.r(0.7, 1.1)
        maize_leaf(p, q, s * p.r(0.35, 0.75), L, col, droop=droop, w=p.r(0.045, 0.06), fore=fore)
    tip = path[-1]
    if stage in ('fahne', 'kolben', 'reif', 'trocken'):
        # the tassel: a central spike and branches, pale yellow with anthers (drier later)
        tcol = hx('#c8b878') if stage == 'fahne' else hx('#b8a070') if stage != 'trocken' else hx('#9a8660')
        p.stroke([tip, (tip[0], tip[1] + 0.2)], 0.01, 0.006, tcol, hl=0)
        for b in range(9):
            a = p.r(-1.0, 1.0)
            L = p.r(0.1, 0.18)
            st = (tip[0], tip[1] + p.r(0.0, 0.05))
            br = p.bez(st, (st[0] + math.sin(a) * L * 0.6, st[1] + math.cos(a) * L * 0.5 + 0.02), (st[0] + math.sin(a) * L, st[1] + math.cos(a) * L * 0.4 - 0.01), 8)
            p.stroke(br, 0.005, 0.003, tcol, hl=0)
            if stage == 'fahne':
                p.dots([(q[0] + p.r(-0.004, 0.004), q[1] - 0.006, 0.004, hx('#d8c890')) for q in br[2::2]])
    if stage in ('kolben', 'reif', 'trocken'):
        # one or two ears in their husks at the middle of the stem, with the silk
        for t, s in ((0.5, 1), (0.42, -1)):
            if t == 0.42 and stage != 'kolben':
                continue
            q, d = p.at(path, t)
            hcol = {'kolben': hx('#7aa04a'), 'reif': hx('#b8b070'), 'trocken': hx('#c8b48a')}[stage]
            a = s * (0.35 if stage == 'kolben' else 0.7 if stage == 'reif' else 1.4)
            base = (q[0] + s * 0.01, q[1])
            rib = p.leaf(base, a, 0.2, 0.075, hcol, shape='lanzett', bend=0.05 * s, rib=False)
            p.leaf(base, a + 0.12 * s, 0.17, 0.035, mix(hcol, (1, 1, 0.9), 0.25), shape='lanzett', bend=0.05 * s, rib=False)
            end = rib[-1]
            silk = hx('#8a5a30') if stage == 'kolben' else hx('#6a4a2a')
            p.soft_lines([(end, (end[0] + p.r(-0.03, 0.03), end[1] + p.r(-0.04, 0.03))) for _ in range(12)], silk, 2, 0.85)


def f_mais_streckung(p):
    maize_plant(p, 'streckung')


def f_mais_fahne(p):
    maize_plant(p, 'fahne')


def f_mais_kolben(p):
    maize_plant(p, 'kolben')


def f_mais_reif(p):
    maize_plant(p, 'reif')


def f_mais_trocken(p):
    maize_plant(p, 'trocken')


def f_mais_stoppel(p):
    # the chopped field: stubs of a hand's height and torn leaf remains
    for k, u in enumerate((-0.36, -0.2, -0.05, 0.1, 0.24, 0.38)):
        h = p.r(0.45, 0.9)
        lean = p.r(-0.05, 0.05)
        p.stroke([(u, 0.0), (u + lean, h)], 0.045, 0.04, p.jit(hx('#a89870'), 0.05), hl=0.2)
        for f in range(3):  # the frayed, torn top
            a = p.r(-0.5, 0.5)
            p.stroke([(u + lean, h - 0.02), (u + lean + math.sin(a) * 0.05, h + math.cos(a) * 0.05)], 0.01, 0.004, hx('#c8b88a'), hl=0)
        if p.r() < 0.6:
            a = p.r(-1.4, 1.4)
            p.leaf((u, p.r(0.08, h * 0.6)), a, p.r(0.12, 0.2), 0.03, p.jit(hx('#a89060'), 0.06), shape='linear', bend=0.5 * sgn(a), rib=False)


# ---------------------------------------------------------------- sugar beet

RUEBE_LEAF = hx('#3f7c3a')


def beet_leaf(p, base, a, L, col, fore=1.0, droop=0.15):
    # a glossy spatulate leaf on a pale stalk, wavy edge
    q = (base[0] + math.sin(a) * L * 0.35, base[1] + math.cos(a) * L * 0.35 * fore)
    p.stroke([base, q], 0.016, 0.012, mix(col, hx('#d8e0b0'), 0.55), hl=0)
    p.leaf(q, a + droop * sgn(a) * 0.4, L * 0.7, L * 0.42, col, shape='oval', bend=droop * sgn(a), teeth=7, tooth=0.08, foreshort=fore)


def beet_rosette(p, n, Lr, col, yellow=0.0, crown=False):
    items = sorted([(p.r(-1.35, 1.35), p.r(*Lr)) for _ in range(n)], key=lambda q: -abs(q[0]))
    for a, L in items:
        c = p.jit(col, 0.05)
        if yellow and abs(a) > 0.8 and p.r() < yellow:
            c = mix(c, hx('#c8b048'), p.r(0.5, 0.8))
            beet_leaf(p, (p.r(-0.02, 0.02), 0.03), a * 1.15, L * 0.9, c, fore=0.8, droop=0.5)
        else:
            beet_leaf(p, (p.r(-0.02, 0.02), 0.03), a, L, c, fore=0.7 + 0.3 * math.cos(a))
    if crown:
        p.ellipse(0, 0.03, 0.09, 0.05, 0, hx('#d8d0b0'), n=16)  # the beet's crown above the soil
        p.ellipse(-0.02, 0.045, 0.05, 0.02, 0, hx('#e8e2c8'), n=12)


def f_ruebe_jung(p):
    for k in range(8):
        a = p.r(-0.8, 0.8)
        beet_leaf(p, (p.r(-0.02, 0.02), 0.0), a, p.r(0.55, 0.8), p.jit(hx('#5e9a46'), 0.05), fore=0.9, droop=0.08)


def f_ruebe_blatt(p):
    beet_rosette(p, 16, (0.55, 0.8), RUEBE_LEAF)


def f_ruebe_herbst(p):
    beet_rosette(p, 13, (0.5, 0.72), mix(RUEBE_LEAF, hx('#6a8a40'), 0.4), yellow=0.8, crown=True)


# ---------------------------------------------------------------- potato (the bed atlas' plant, as a field stand)


def f_kartoffel_jung(p):
    col = hx('#5e8a40')
    for k in range(8):
        u = p.r(-0.24, 0.24)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.4, 0.65), p.r(-0.06, 0.06))
        p.stroke(path, 0.014, 0.01, hx('#6a8a44'), hl=0)
        for t in (0.45, 0.75, 0.95):
            pt, d = p.at(path, t)
            p.pinnate(pt, math.atan2(d[0], d[1]) + (0.7 if p.r() < 0.5 else -0.7), 0.18, 0.11, p.jit(col, 0.07), pairs=2, leaflet='oval', bend=0.12,
                      fine=1.3)


def f_kartoffel_kraut(p):
    BE.potato(p)


def f_kartoffel_bluete(p):
    BE.potato(p, flowers=True)


def f_kartoffel_welk(p):
    BE.potato(p, wilted=True)


def f_kartoffel_krautfrei(p):
    # the haulm killed before the harvest: dark brown stalks fallen over the ridge
    for k in range(9):
        a = p.r(-1.2, 1.2)
        L = p.r(0.35, 0.55)
        tip = (math.sin(a) * L, 0.05 + abs(math.cos(a)) * L * 0.6)
        path = p.bez((p.r(-0.03, 0.03), 0.0), (tip[0] * 0.4, tip[1] + 0.12), tip, 12)
        p.stroke(path, 0.012, 0.007, p.jit(hx('#4a3a2a'), 0.08), hl=0)
        for t in (0.4, 0.7, 0.95):
            q, d = p.at(path, t)
            p.leaf(q, math.atan2(d[0], d[1]) + p.r(-1, 1), 0.07, 0.04, p.jit(hx('#3a2e22'), 0.1), shape='oval', bend=0.3, rib=False)


# ---------------------------------------------------------------- sunflower (field: one head per plant)


def f_sonnenblume_jung(p):
    BE.sunflower(p, 'jung')


def f_sonnenblume_knospe(p):
    path = BE.stalk(p, 0.0, 0.86, 0.02, w=0.04, col=hx('#5a8a3a'), u0=0.0)
    for i, t in enumerate((0.15, 0.3, 0.45, 0.6, 0.75, 0.88)):
        pt, d = p.at(path, t)
        s = 1 if i % 2 else -1
        p.leaf(pt, math.atan2(d[0], d[1]) + s * 1.0, 0.26 - 0.02 * i, 0.16, p.jit(hx('#3e6a2e'), 0.06), shape='herz', bend=0.2 * s, teeth=6,
               tooth=0.1)
    tip = path[-1]
    c = (tip[0], tip[1] + 0.035)
    p.rays(c, (0.0, 0.85, 0.5), 0.02, 0.07, 0.035, 16, hx('#4a7a30'), col_tip=hx('#6a9a40'), cup=0.7, shape='lanzett', jitter=0.1)
    p.ball(c[0], c[1] + 0.01, 0.04, hx('#5a8a38'), hl=0.2, dark=0.6)


def f_sonnenblume_bluete(p):
    BE.sunflower(p, 'bluete')


def f_sonnenblume_reif(p):
    BE.sunflower(p, 'samen')


# ---------------------------------------------------------------- cereal ears (one ear on a piece of its stalk; no darkening at the foot)


def ear_axis(p, L, nod, top=0.97, sway=0.0):
    """the axis of an ear from the top of its stalk piece: straight up, or bowing over by nod (0–1)"""
    stalk_h = 0.18 if nod < 0.5 else 0.42
    p0 = (0.0, 0.0)
    p1 = (sway * 0.3, stalk_h)
    if nod < 0.5:
        a = nod * 0.9
        end = (p1[0] + math.sin(a) * L, p1[1] + math.cos(a) * L)
        ax = p.bez(p1, ((p1[0] + end[0]) / 2 - 0.01, (p1[1] + end[1]) / 2), end, 16)
    else:
        a = 0.6 + nod * 1.8  # bowed: up and over, the tip hanging
        mid = (p1[0] + 0.12, p1[1] + 0.2)
        end = (mid[0] + math.sin(a) * L * 0.8, mid[1] + math.cos(a) * L * 0.8)
        ax = p.bez(p1, (p1[0] + 0.02, mid[1] + 0.12), end, 16)
    return [p0, p1], ax


def spikelets(p, ax, col, n, w, h, spread=0.45, awn=0.0, awn_col=None, rows=2, fat=1.0, awn_w=0.004):
    """spikelets alternating along the axis (two rows seen from the side; rows=3 for a six-row barley), each an oval of glumes, with an
    awn of length awn (share of the cell) from its tip"""
    items = []
    for i in range(n):
        t = 0.04 + 0.92 * i / max(1, n - 1)
        q, d = p.at(ax, t)
        ang = math.atan2(d[0], d[1])
        for r in range(rows):
            s = (1 if (i + r) % 2 else -1) * (1 if rows != 3 or r < 2 else 0)
            a = ang + s * spread
            size = (0.75 + 0.25 * math.sin(math.pi * min(1, t * 1.2))) * fat
            c = (q[0] + math.sin(a) * w * 0.9 * size, q[1] + math.cos(a) * w * 0.9 * size)
            items.append((r, t, c, a, size))
    items.sort(key=lambda it: it[0])
    for r, t, c, a, size in items:
        cc = mul(p.jit(col, 0.04), 0.9 if r == 1 else 1.0)
        if awn > 0:
            e = (c[0] + math.sin(a * 0.6 + 0.0) * awn * 0.35, c[1] + math.cos(a * 0.6) * awn)
            p.stroke([c, ((c[0] + e[0]) / 2, (c[1] + e[1]) / 2 + 0.01), e], awn_w, awn_w * 0.5, awn_col or mix(cc, (1, 1, 0.9), 0.2), hl=0)
        p.ellipse(c[0], c[1], w * size, h * size, -a, cc, n=14)
        p.ellipse(c[0] - w * 0.25 * size, c[1] + h * 0.15 * size, w * 0.45 * size, h * 0.6 * size, -a, mix(cc, (1, 1, 0.9), 0.18), n=10)


def ear(p, kind, ripe, flowering=False):
    if kind == 'weizen':
        col = hx('#d2b06a') if ripe else hx('#7a9a48')
        stalk, ax = ear_axis(p, 0.62, 0.12 if ripe else 0.02)
        p.stroke(stalk + ax[1:3], 0.03, 0.026, mul(col, 0.92), hl=0.1)
        p.stroke(ax, 0.02, 0.012, mul(col, 0.85), hl=0)
        spikelets(p, ax, col, 16, 0.042, 0.05, spread=0.5, fat=1.1)
    elif kind == 'gerste':
        col = hx('#d8c890') if ripe else hx('#7e9e58')
        nod = 0.85 if ripe else 0.1
        stalk, ax = ear_axis(p, 0.3 if ripe else 0.36, nod)
        p.stroke(stalk + ax[1:2], 0.028, 0.022, mul(col, 0.92), hl=0.1)
        p.stroke(ax, 0.016, 0.01, mul(col, 0.85), hl=0)
        spikelets(p, ax, col, 12, 0.028, 0.045, spread=0.35, awn=0.42 if not ripe else 0.3, awn_col=hx('#b8cc90') if not ripe else hx('#e8dcb0'),
                  rows=3, awn_w=0.007)
    elif kind == 'roggen':
        col = hx('#c8a86a') if ripe else hx('#7e9a7a')
        stalk, ax = ear_axis(p, 0.62, 0.35 if ripe else 0.05)
        p.stroke(stalk + ax[1:3], 0.026, 0.022, mul(col, 0.92), hl=0.1)
        p.stroke(ax, 0.016, 0.01, mul(col, 0.85), hl=0)
        spikelets(p, ax, col, 18, 0.03, 0.042, spread=0.4, awn=0.14, awn_col=mix(col, (1, 1, 0.9), 0.2))
        if flowering:  # the anthers hanging out on their filaments
            segs, dts = [], []
            for k in range(26):
                q, d = p.at(ax, p.r(0.05, 0.95))
                s = 1 if p.r() < 0.5 else -1
                e = (q[0] + s * p.r(0.03, 0.06), q[1] - p.r(0.02, 0.05))
                segs.append((q, e))
                dts.append((e[0], e[1], p.r(0.008, 0.011), p.jit(hx('#d8cc80'), 0.06)))
            p.soft_lines(segs, hx('#e8e4c8'), 1.5, 0.8)
            p.dots(dts)
    elif kind == 'triticale':
        col = hx('#c8a868') if ripe else hx('#6e9a5a')
        stalk, ax = ear_axis(p, 0.5, 0.25 if ripe else 0.04)
        p.stroke(stalk + ax[1:3], 0.032, 0.026, mul(col, 0.92), hl=0.1)
        p.stroke(ax, 0.02, 0.012, mul(col, 0.85), hl=0)
        spikelets(p, ax, col, 13, 0.046, 0.055, spread=0.5, awn=0.28, awn_col=mix(col, (1, 1, 0.9), 0.2), fat=1.15)


def no_ao(fn):
    fn.no_ao = True
    return fn


@no_ao
def f_weizen_gruen(p):
    ear(p, 'weizen', False)


@no_ao
def f_weizen_reif(p):
    ear(p, 'weizen', True)


@no_ao
def f_gerste_gruen(p):
    ear(p, 'gerste', False)


@no_ao
def f_gerste_reif(p):
    ear(p, 'gerste', True)


@no_ao
def f_roggen_gruen(p):
    ear(p, 'roggen', False)


@no_ao
def f_roggen_bluete(p):
    ear(p, 'roggen', False, flowering=True)


@no_ao
def f_roggen_reif(p):
    ear(p, 'roggen', True)


@no_ao
def f_triticale_gruen(p):
    ear(p, 'triticale', False)


@no_ao
def f_triticale_reif(p):
    ear(p, 'triticale', True)


# ---------------------------------------------------------------- the layout (must match BWARTEN.feldfruechte's cells – the unit tests check it)
# (cell, id, frame(s), species, drawer); empty cells are left out

LAYOUT3 = [
    # row 0: rapeseed, mustard, clover-grass
    ((0, 0), 'raps-rosette', 'rosette', ['winterraps'], f_raps_rosette),
    ((1, 0), 'raps-knospe', 'knospe', ['winterraps'], f_raps_knospe),
    ((2, 0), 'raps-bluete', 'bluete', ['winterraps'], f_raps_bluete),
    ((3, 0), 'raps-schoten', 'schoten', ['winterraps'], f_raps_schoten),
    ((4, 0), 'raps-reif', 'reif', ['winterraps'], f_raps_reif),
    ((5, 0), 'senf-bluete', 'bluete', ['zwischenfrucht'], f_senf_bluete),
    ((6, 0), 'luzerne', 'luzerne', ['kleegras'], f_luzerne),
    ((7, 0), 'kleegras-bluete', 'bluete', ['kleegras'], f_kleegras_bluete),
    # row 1: maize
    ((0, 1), 'mais-jung', 'jung', ['silomais', 'koernermais'], f_mais_jung),
    ((1, 1), 'mais-streckung', 'streckung', ['silomais', 'koernermais'], f_mais_streckung),
    ((2, 1), 'mais-fahne', 'fahne', ['silomais', 'koernermais'], f_mais_fahne),
    ((3, 1), 'mais-kolben', 'kolben', ['silomais', 'koernermais'], f_mais_kolben),
    ((4, 1), 'mais-reif', 'reif', ['silomais', 'koernermais'], f_mais_reif),
    ((5, 1), 'mais-trocken', 'trocken', ['silomais', 'koernermais'], f_mais_trocken),
    ((6, 1), 'mais-stoppel', 'stoppel', ['silomais', 'koernermais'], f_mais_stoppel),
    # row 2: sugar beet, potato
    ((0, 2), 'ruebe-jung', 'jung', ['zuckerruebe'], f_ruebe_jung),
    ((1, 2), 'ruebe-blatt', 'blatt', ['zuckerruebe'], f_ruebe_blatt),
    ((2, 2), 'ruebe-herbst', 'herbst', ['zuckerruebe'], f_ruebe_herbst),
    ((3, 2), 'kartoffel-jung', 'jung', ['kartoffel'], f_kartoffel_jung),
    ((4, 2), 'kartoffel-kraut', 'kraut', ['kartoffel'], f_kartoffel_kraut),
    ((5, 2), 'kartoffel-bluete', 'bluete', ['kartoffel'], f_kartoffel_bluete),
    ((6, 2), 'kartoffel-welk', 'welk', ['kartoffel'], f_kartoffel_welk),
    ((7, 2), 'kartoffel-krautfrei', 'krautfrei', ['kartoffel'], f_kartoffel_krautfrei),
    # row 3: sunflower, rye in flower, young mustard
    ((0, 3), 'sonnenblume-jung', 'jung', ['sonnenblume'], f_sonnenblume_jung),
    ((1, 3), 'sonnenblume-knospe', 'knospe', ['sonnenblume'], f_sonnenblume_knospe),
    ((2, 3), 'sonnenblume-bluete', 'bluete', ['sonnenblume'], f_sonnenblume_bluete),
    ((3, 3), 'sonnenblume-reif', 'reif', ['sonnenblume'], f_sonnenblume_reif),
    ((4, 3), 'roggen-bluete', 'bluete', ['winterroggen'], f_roggen_bluete),
    ((5, 3), 'senf-jung', 'jung', ['zwischenfrucht'], f_senf_jung),
    # row 4: the ears of the cereals (green, ripe)
    ((0, 4), 'weizen-gruen', 'gruen', ['winterweizen'], f_weizen_gruen),
    ((1, 4), 'weizen-reif', 'reif', ['winterweizen'], f_weizen_reif),
    ((2, 4), 'gerste-gruen', 'gruen', ['wintergerste', 'sommergerste'], f_gerste_gruen),
    ((3, 4), 'gerste-reif', 'reif', ['wintergerste', 'sommergerste'], f_gerste_reif),
    ((4, 4), 'roggen-gruen', 'gruen', ['winterroggen'], f_roggen_gruen),
    ((5, 4), 'roggen-reif', 'reif', ['winterroggen'], f_roggen_reif),
    ((6, 4), 'triticale-gruen', 'gruen', ['triticale'], f_triticale_gruen),
    ((7, 4), 'triticale-reif', 'reif', ['triticale'], f_triticale_reif),
]

NOTE = ('Zelle (Spalte, Zeile) von oben links; eine Feldfrucht von der Seite, Fuß unten in der Mitte, füllt die Höhe der Zelle (bei den '
        'Getreideähren: eine Ähre auf einem Stück Halm, ohne Abdunkeln am Fuß – die Halme zeichnet die Vorlage); breite = Anteil der '
        'Zellbreite (Alpha ≥ 0,5); farbe = mittlere Farbe (sRGB); leere Zellen fehlen in der Liste. Erzeugt von '
        'tools/bewuchs/pflanzen/acker.py (eigene Zeichnung).')


def main(argv):
    out = os.path.join(A.ROOT, 'viz3', 'extra', 'bewuchs-pflanzen', 'dist', 'bewuchs')
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
    im, meta = A.build(out, only, layout=LAYOUT3, name='acker', tinted=set(), seed0=9000, note=NOTE)
    if sh:
        A.sheets(im, meta, sh, prefix='acker', meadow='acker_bildschirm')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
