#!/usr/bin/env python3
"""The second atlas of the vegetation template (feat/bewuchs-pflanzen, part 2): the bed plants of viz3/src/bewuchs/bw_arten.js (BWARTEN.beet) –
spring and summer bedding, autumn heather, perennials, roses, ground cover, the plants of graves, vegetables in their stages – drawn with the
painter of atlas.py (same format: 1024 x 1024 RGBA, 8 x 8 cells of 128 px, cell (c, r) from the top left, one plant in side view, its
foot at the bottom centre, filling the cell's height, straight alpha with the colour bled into the transparent pixels; our own work).

    nice -n 10 python3 tools/bewuchs/pflanzen/beete.py [OUT_DIR] [--sheets SHEET_DIR] [--only id,id]

writes OUT_DIR/beete.png and beete.json (default viz3/extra/bewuchs-pflanzen/dist/bewuchs). A cell that serves several frames of a plant
(a young potato is the grown one, smaller) lists the others under 'auch'.

Drawing rule (see atlas.fit_of): at scale 1 every drawing stays inside u in [-0.48, 0.48] and v <= 1 – what the canvas clips, the fit cannot
see. Leaf bend: negative for a leaf leaning right curls it in and up, positive arches it out and down (atlas.Painter.leaf).
"""
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import atlas as A
from atlas import hx, mix, mul, stem_path, rosette, leaves_along


def sgn(x):
    return 1 if x > 0 else -1


# ---------------------------------------------------------------- small helpers


def stalk(p, u_top, top, bend=0.0, w=0.012, col=None, u0=None):
    path = stem_path(p, p.r(-0.03, 0.03) if u0 is None else u0, u_top, top, bend)
    p.stroke(path, w, w * 0.7, col or hx('#5f8a3c'))
    return path


def mound(p, n, leaf_len, leaf_w, col, shape='oval', spread=1.3, teeth=0, amin=0.2):
    """a low rounded clump of leaves from the foot (front ones foreshortened)"""
    rosette(p, n, leaf_len * 0.7, leaf_len, leaf_w, col, shape=shape, spread=spread, teeth=teeth, amin=amin)


def flat_flower(p, c, rad, col, eye, petals=5, shape='rund', nrm=None, cup=0.15, wid=None):
    nrm = nrm or p.head_normal(0.45, 0.75)
    wid = rad * min(0.9, 4.0 / petals) if wid is None else wid
    p.rays(c, nrm, rad * 0.08, rad, wid, petals, col, col_tip=mix(col, (1, 1, 1), 0.15), cup=cup, shape=shape, jitter=0.12)
    p.disc(c, nrm, rad * 0.22, eye, dome=0.3, hl=0.15)


def leafy_bush(p, n_stems, top_rng, leaf_len, leaf_w, col, shape='oval', spread=0.32, ts=(0.25, 0.45, 0.65, 0.85), stem_col=None, opp=False):
    paths = []
    for k in range(n_stems):
        u = p.r(-spread, spread)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(*top_rng), p.r(-0.06, 0.06) - u * 0.2)
        p.stroke(path, 0.012, 0.007, stem_col or hx('#5a8038'), hl=0)
        leaves_along(p, path, list(ts), leaf_len, leaf_w, col, shape=shape, ang=0.9, opp=opp)
        paths.append(path)
    return paths


def needles_ball(p, c, ru, rv, col, n=420, l=0.03, w=0.008):
    """a dense round shape of needles or tiny leaves: short strokes on an ellipse, lit from the upper left"""
    items = []
    for i in range(n):
        a = p.r(0, 6.283)
        rr = math.sqrt(p.r(0, 1))
        x, y = math.cos(a) * rr, math.sin(a) * rr
        z = math.sqrt(max(0.0, 1 - x * x - y * y))
        items.append((z, x, y))
    items.sort()
    for z, x, y in items:
        lit = 0.55 + 0.45 * max(0.0, -0.45 * x + 0.75 * y + 0.5 * z)
        q = (c[0] + x * ru, c[1] + y * rv)
        ang = math.atan2(x, y) + p.r(-0.6, 0.6)
        p.stroke([q, (q[0] + math.sin(ang) * l, q[1] + math.cos(ang) * l)], w, w * 0.5, mul(p.jit(col, 0.06), lit * 1.05), hl=0)


def pole(p, u, top, col=hx('#8a6a44'), w=0.018):
    p.stroke([(u, 0.0), (u + 0.005, top)], w, w * 0.85, col, col1=mul(col, 1.1), hl=0.2)


# ---------------------------------------------------------------- spring bedding


def tulip_leaves(p, n=3, L=0.75, amax=0.35):
    for k in range(n):
        a = (-amax + 2 * amax * k / max(1, n - 1)) + p.r(-0.08, 0.08)
        p.leaf((p.r(-0.02, 0.02), 0), a, L * p.r(0.85, 1.05), 0.15, p.jit(hx('#6a8a62'), 0.05), shape='eilanz', bend=0.06 * sgn(a))


def tulip_head(p, base, col):
    """a closed cup of six tepals in side view: the three behind darker, then the three in front"""
    for a in (-0.3, 0.3, 0.0):
        p.leaf(base, a + p.r(-0.05, 0.05), 0.12, 0.07, mul(col, 0.78), shape='oval', rib=False)
    for a in (-0.16, 0.16):
        p.leaf(base, a + p.r(-0.04, 0.04), 0.125, 0.075, p.jit(col, 0.04), shape='oval', rib=False, bend=-0.06 * sgn(a))


def f_tulpe_blatt(p):
    tulip_leaves(p, 4, 0.8, 0.38)


def tulip(p, col):
    tulip_leaves(p, 3, 0.45, 0.5)
    for u, top in ((-0.12, 0.7), (0.1, 0.8)):
        path = stalk(p, u, top, p.r(-0.03, 0.03), w=0.02, col=hx('#6a8a5a'))
        tulip_head(p, (path[-1][0], path[-1][1] - 0.01), col)


def f_tulpe_rot(p):
    tulip(p, hx('#d8202a'))


def f_tulpe_gelb(p):
    tulip(p, hx('#f2c418'))


def f_narzisse(p):
    for k in range(6):
        a = p.r(-0.35, 0.35)
        p.leaf((p.r(-0.02, 0.02), 0), a, p.r(0.6, 0.85), 0.05, p.jit(hx('#5a8a4a'), 0.05), shape='linear', bend=0.08 * sgn(a))
    for u, top, s in ((-0.14, 0.76, -1), (0.12, 0.84, 1), (0.0, 0.64, 1)):
        path = stalk(p, u, top, 0.02 * s, w=0.016, col=hx('#6a9a5a'))
        c = (path[-1][0] + 0.03 * s, path[-1][1] + 0.01)
        nrm = (0.75 * s, 0.25, 0.6)
        p.rays(c, nrm, 0.01, 0.09, 0.06, 6, hx('#f4e070'), cup=0.1, shape='lanzett', jitter=0.08)
        p.bell(c, s * 1.2, 0.07, 0.05, hx('#f2c418'), inner=hx('#e0a010'), lobes=6, flare=0.4)


def f_stiefmuetterchen(p):
    mound(p, 10, 0.32, 0.14, hx('#3e6a2e'), shape='oval', spread=1.35)
    cols = [hx('#6a4ab0'), hx('#f2c418'), hx('#f4f0ea'), hx('#a02a4a'), hx('#e88a2a')]
    items = sorted([(p.r(0.38, 0.85), p.r(-0.32, 0.32)) for _ in range(7)], key=lambda q: -q[0])
    for top, u in items:
        path = stalk(p, u, top - 0.05, 0, w=0.01)
        col = cols[p.ri(0, len(cols) - 1)]
        c = (path[-1][0], path[-1][1] + 0.03)
        nrm = (p.r(-0.25, 0.25), 0.35, 0.9)
        p.rays(c, nrm, 0.01, 0.1, 0.1, 5, col, col_tip=mix(col, (1, 1, 1), 0.1), cup=0.1, shape='rund', jitter=0.25)
        p.ellipse(c[0], c[1] - 0.005, 0.035, 0.028, 0, mix(col, hx('#1a1020'), 0.75), n=14)  # the dark face
        p.dots([(c[0], c[1] + 0.004, 0.009, hx('#f2d040'))])


def f_vergissmeinnicht(p):
    mound(p, 9, 0.35, 0.09, hx('#4a7a3a'), shape='lanzett', spread=1.2)
    dots = []
    for k in range(7):
        path = stalk(p, p.r(-0.3, 0.3), p.r(0.55, 0.9), p.r(-0.05, 0.05), w=0.008, col=hx('#6a8a50'))
        tip = path[-1]
        for f in range(p.ri(14, 22)):
            a = p.r(0, 6.283)
            rr = p.r(0, 0.07)
            q = (tip[0] + math.cos(a) * rr, tip[1] + math.sin(a) * rr * 0.6)
            dots.append((q[1], q[0], q[1], p.r(0.011, 0.015)))
    dots.sort()
    p.dots([(u, v, r, p.jit(hx('#7aa0e0'), 0.06)) for _, u, v, r in dots])
    p.dots([(u, v, r * 0.3, hx('#f4e060')) for _, u, v, r in dots[::2]])


def f_immergruen(p):
    # trailing stems with glossy leaves in pairs, blue five-petalled flowers held up
    for k in range(7):
        a = p.r(-1.3, 1.3)
        L = p.r(0.3, 0.4)
        tip = (math.sin(a) * L, 0.08 + abs(math.cos(a)) * 0.25)
        path = p.bez((0, 0), (tip[0] * 0.5, tip[1] + 0.1), tip, 12)
        p.stroke(path, 0.008, 0.006, hx('#5a7a3a'), hl=0)
        leaves_along(p, path, [0.25, 0.5, 0.75, 0.95], 0.09, 0.045, hx('#2e5a26'), shape='oval', opp=True, alt=False, ang=1.0)
    for k in range(7):
        path = stalk(p, p.r(-0.3, 0.3), p.r(0.45, 0.85), 0, w=0.007)
        flat_flower(p, path[-1], p.r(0.06, 0.075), hx('#6a7ad0'), hx('#f0f0f0'), petals=5, shape='spatel', nrm=p.head_normal(0.45, 0.8))


def f_efeu(p):
    # a mat of dark lobed leaves with pale veins, piled up a little
    items = [(p.r(0, 1), p.r(-0.38, 0.38), p.r(0.08, 0.85) ** 1.4) for _ in range(34)]
    items.sort()
    for z, u, v in items:
        c = mul(p.jit(hx('#2e4a24'), 0.08), 0.85 + 0.25 * z)
        p.palmate((u, v * 0.9 + 0.05), p.r(0.07, 0.1), c, lobes=5, cut=0.45, tilt=p.r(0.5, 0.85), rot=p.r(0, 6.28), teeth=1)


# ---------------------------------------------------------------- summer and autumn bedding


def geranium_umbel(p, c, rad, col):
    p.globe(c, rad, col, count=26, fl=0.55, elong=1.1, dark=0.6)
    for k in range(5):
        a = p.r(0, 6.28)
        q = (c[0] + math.cos(a) * rad * 0.7, c[1] + math.sin(a) * rad * 0.6 + rad * 0.2)
        p.rays(q, (0, 0.5, 0.85), 0.002, rad * 0.4, rad * 0.35, 5, mix(col, (1, 1, 1), 0.1), cup=0.1, shape='rund')


def geranie(p, col):
    for k in range(9):  # round leaves with the dark zone (a horseshoe ring)
        q = (p.r(-0.3, 0.3), p.r(0.15, 0.5))
        p.stroke([(p.r(-0.03, 0.03), 0), q], 0.012, 0.009, hx('#5a8038'), hl=0)
        c = p.jit(hx('#4a7a30'), 0.06)
        size, tilt = p.r(0.1, 0.13), p.r(0.5, 0.7)
        p.palmate(q, size, c, lobes=7, cut=0.12, tilt=tilt, rot=p.r(0, 6.28), teeth=2)
        p.ellipse(q[0], q[1], size * 0.55, size * 0.55 * tilt, 0, mix(c, hx('#3a3018'), 0.25), n=18)
        p.ellipse(q[0], q[1] + 0.003, size * 0.38, size * 0.38 * tilt, 0, mul(c, 0.92), n=14)
    for u, top in ((-0.16, 0.8), (0.14, 0.86), (0.0, 0.72), (-0.04, 0.9)):
        path = stalk(p, u, top - 0.1, 0, w=0.012)
        geranium_umbel(p, (path[-1][0], path[-1][1] + 0.05), p.r(0.07, 0.085), p.jit(col, 0.05))


def f_geranie(p):
    geranie(p, hx('#d8202a'))


def f_begonie(p):
    # a dome of glossy rounded leaves (green, a touch of bronze), lighter on top
    for k in range(34):
        a = p.r(0, math.pi)
        rr = math.sqrt(p.r(0, 1))
        u, v = math.cos(a) * rr * 0.34, 0.06 + math.sin(a) * rr * 0.5
        c = mul(mix(p.jit(hx('#4f8034'), 0.08), hx('#6a4a2a'), 0.1), 0.88 + 0.3 * v)
        rot = p.r(0, 3.14)
        p.ellipse(u, v, 0.07, 0.05, rot, mul(c, 0.8), n=16)
        p.ellipse(u - 0.006, v + 0.006, 0.058, 0.04, rot, c, n=16)
        p.ellipse(u - 0.02, v + 0.016, 0.02, 0.01, rot, mix(c, (1, 1, 1), 0.35), n=8)  # the gloss
    for k in range(18):
        u, v = p.r(-0.36, 0.36), p.r(0.45, 0.86)
        flat_flower(p, (u, v), p.r(0.04, 0.05), p.jit(hx('#e04a6a'), 0.06), hx('#f2d040'), petals=4, shape='rund', nrm=p.head_normal(0.5, 0.7))


def f_tagetes(p):
    for k in range(10):
        a = p.r(-0.8, 0.8)
        p.pinnate((p.r(-0.02, 0.02), 0), a, p.r(0.35, 0.5), 0.14, p.jit(hx('#3e6a2a')), pairs=6, leaflet='lanzett', fine=0.6, bend=-0.1 * sgn(a))
    for k in range(9):
        u, top = p.r(-0.32, 0.32), p.r(0.55, 0.86)
        path = stalk(p, u * 0.7, top - 0.04, 0, w=0.01)
        c = (path[-1][0], path[-1][1] + 0.03)
        col = p.jit(hx('#e8901a'), 0.06)
        p.rays(c, p.head_normal(0.7, 0.5), 0.01, 0.07, 0.04, 14, col, col_tip=hx('#f4b030'), cup=0.6, shape='rund', jitter=0.3)
        p.globe((c[0], c[1] + 0.01), 0.035, mix(col, hx('#8a2a10'), 0.45), count=18, fl=0.5, elong=1.2, dark=0.6)


def f_heide(p):
    # upright twiggy shoots densely set with pink-purple buds; below them the grey-green scale leaves
    for k in range(16):
        a = p.r(-0.6, 0.6)
        L = p.r(0.6, 0.95)
        tip = (math.sin(a) * L * 0.6, L)
        path = p.bez((p.r(-0.04, 0.04), 0), (tip[0] * 0.3, L * 0.5), tip, 12)
        p.stroke(path, 0.012, 0.004, hx('#6a5a44'), hl=0)
        dts = []
        for i, q in enumerate(path[3:]):
            for s in (-1, 1):
                dts.append((q[0] + s * p.r(0.006, 0.016), q[1] + p.r(-0.01, 0.01), p.r(0.009, 0.013),
                            p.jit(hx('#c05a9a') if i > 2 else hx('#6a7a5a'), 0.08)))
        p.dots(dts)


def f_chrysantheme(p):
    mound(p, 8, 0.3, 0.12, hx('#3e6230'), shape='oval', spread=1.3, teeth=4)
    # a cushion covered with small flowers
    items = []
    for k in range(60):
        a = p.r(0, math.pi)
        rr = math.sqrt(p.r(0, 1))
        items.append((0.3 + math.sin(a) * rr * 0.6, math.cos(a) * rr * 0.42))
    items.sort(key=lambda q: -q[0])
    col = hx('#d8902a')
    for y, x in items:
        lit = 0.75 + 0.25 * (y - 0.3) / 0.6 - 0.15 * x
        flat_flower(p, (x, y), p.r(0.04, 0.05), mul(p.jit(col, 0.06), lit), hx('#c8a020'), petals=11, shape='lanzett',
                    nrm=p.head_normal(0.6, 0.6, side=x))


def f_zwergkonifere(p):
    p.stroke([(0, 0), (0, 0.15)], 0.03, 0.02, hx('#6a5038'), hl=0)
    needles_ball(p, (0, 0.5), 0.36, 0.46, hx('#3a5a2e'), n=900, l=0.035)


def f_tannengruen(p):
    # fir branches laid flat: fishbone twigs overlapping, a low heap
    for k in range(14):
        a = p.r(-1.3, 1.3)
        L = p.r(0.22, 0.33)
        base = (p.r(-0.12, 0.12), p.r(0.0, 0.2))
        tip = (base[0] + math.sin(a) * L, base[1] + abs(math.cos(a)) * L * 0.6 + 0.05)
        path = p.bez(base, ((base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 + 0.06), tip, 12)
        p.stroke(path, 0.012, 0.006, hx('#5a4a34'), hl=0)
        col = p.jit(hx('#2e4a2a'), 0.08)
        for i, q in enumerate(path[1:]):
            j = min(len(path) - 1, i + 2)
            d = (path[j][0] - path[i][0], path[j][1] - path[i][1])
            for s in (-1, 1):
                nx, ny = -d[1] * s, d[0] * s
                ln = math.hypot(nx, ny) or 1
                e = (q[0] + nx / ln * 0.045, q[1] + ny / ln * 0.045)
                p.stroke([q, e], 0.009, 0.005, mul(col, 0.9 + 0.2 * (i % 2)), hl=0)


def f_buchskugel(p):
    p.stroke([(0, 0), (0, 0.12)], 0.025, 0.02, hx('#7a6040'), hl=0)
    needles_ball(p, (0, 0.52), 0.44, 0.45, hx('#3a5e2a'), n=1100, l=0.022)


# ---------------------------------------------------------------- perennials


def lavender_cushion(p, h=0.65):
    # many short shoots from a woody base, each set with narrow grey leaves: a dome
    for k in range(54):
        a = p.r(-0.8, 0.8)
        L = p.r(0.45, 0.8) * h
        tip = (math.sin(a) * L * 0.72, math.cos(a) * L)
        path = p.bez((p.r(-0.04, 0.04), 0), (tip[0] * 0.4, tip[1] * 0.55), tip, 8)
        p.stroke(path, 0.007, 0.004, hx('#7a7a62'), hl=0)
        for t in (0.35, 0.55, 0.75, 0.95):
            q, d = p.at(path, t)
            for s in (-1, 1):
                p.leaf(q, math.atan2(d[0], d[1]) + s * 0.55, 0.07 * min(1.0, h + 0.2), 0.016, p.jit(hx('#86a07c'), 0.06), shape='linear', rib=False)


def f_lavendel_blatt(p):
    lavender_cushion(p, 1.0)


def f_lavendel_bluete(p):
    lavender_cushion(p, 0.62)
    for k in range(26):
        a = p.r(-0.7, 0.7)
        L = p.r(0.65, 0.95)
        tip = (math.sin(a) * L * 0.55, L)
        path = p.bez((p.r(-0.04, 0.04), 0.02), (tip[0] * 0.4, L * 0.5), tip, 10)
        p.stroke(path, 0.007, 0.005, hx('#8a9a70'), hl=0)
        dts = []
        for i in range(8):
            q, d = p.at(path, 0.84 + 0.16 * i / 7)
            dts.append((q[0] + p.r(-0.005, 0.005), q[1], 0.011 - 0.0006 * i, p.jit(hx('#7a6ab8'), 0.08)))
        p.dots(dts)


def f_katzenminze(p):
    for k in range(18):
        a = p.r(-0.9, 0.9)
        L = p.r(0.55, 0.92)
        tip = (math.sin(a) * L * 0.6, L * 0.9)
        path = p.bez((p.r(-0.04, 0.04), 0), (tip[0] * 0.4, L * 0.55), tip, 10)
        p.stroke(path, 0.007, 0.005, hx('#7a8a6a'), hl=0)
        leaves_along(p, path, [0.2, 0.45, 0.7], 0.05, 0.035, hx('#7a8a70'), shape='herz', opp=True, alt=False, ang=1.0)
        dts = []
        for i in range(10):
            q, d = p.at(path, 0.7 + 0.3 * i / 9)
            dts.append((q[0] + p.r(-0.012, 0.012), q[1] + p.r(-0.008, 0.008), 0.012, p.jit(hx('#8a8ad0'), 0.08)))
        p.dots(dts)


def coneflower(p, c, rad, ray_col, cone_col, droop=0.0, nrm=None):
    nrm = nrm or p.head_normal(0.55, 0.65)
    ph = p.r(0, 6.283)  # the same rays behind and in front of the cone
    kw = dict(col_tip=mix(ray_col, (1, 1, 1), 0.1), cup=-0.2 - droop, droop=droop, shape='linear', notch=1, phase=ph, jitter=0.0)
    p.rays(c, nrm, rad * 0.25, rad, rad * 0.26, 14, ray_col, front=False, **kw)
    p.ball(c[0], c[1] + rad * 0.12, rad * 0.32, cone_col, hl=0.15, dark=0.5)
    p.rays(c, nrm, rad * 0.25, rad, rad * 0.26, 14, ray_col, front=True, **kw)


def f_sonnenhut_gelb(p):
    mound(p, 8, 0.32, 0.12, hx('#3e6a2e'), shape='lanzett', spread=1.2)
    for k in range(7):
        u, top = p.r(-0.3, 0.3), p.r(0.6, 0.86)
        path = stalk(p, u * 0.7, top - 0.06, 0, w=0.011)
        coneflower(p, (path[-1][0], path[-1][1] + 0.03), p.r(0.07, 0.085), p.jit(hx('#f0b81a'), 0.05), hx('#2a1a10'))


def f_sonnenhut_samen(p):
    for k in range(9):
        u, top = p.r(-0.3, 0.3), p.r(0.55, 0.92)
        path = stalk(p, u * 0.7, top, 0, w=0.011, col=hx('#5a4a36'))
        p.ball(path[-1][0], path[-1][1] + 0.02, p.r(0.025, 0.032), hx('#2a1e16'), hl=0.08, dark=0.6)
        if p.r() < 0.5:
            pt, d = p.at(path, 0.5)
            p.leaf(pt, math.atan2(d[0], d[1]) + 0.9, 0.08, 0.02, hx('#6a5440'), shape='lanzett', rib=False)


def f_sonnenhut_rot(p):
    mound(p, 8, 0.3, 0.12, hx('#3e6a2e'), shape='lanzett', spread=1.2)
    for k in range(6):
        u, top = p.r(-0.3, 0.3), p.r(0.62, 0.86)
        path = stalk(p, u * 0.7, top - 0.06, 0, w=0.012)
        coneflower(p, (path[-1][0], path[-1][1] + 0.03), p.r(0.085, 0.1), p.jit(hx('#c05a8a'), 0.05), hx('#b0602a'), droop=0.5)


def sedum(p, head_col, stem_col=None, leaf_col=None):
    for k in range(9):
        u = p.r(-0.28, 0.28)
        path = stem_path(p, p.r(-0.03, 0.03), u, p.r(0.65, 0.85), p.r(-0.04, 0.04))
        p.stroke(path, 0.016, 0.012, stem_col or hx('#7a9a6a'), hl=0.1)
        for t in (0.2, 0.35, 0.5, 0.65):
            pt, d = p.at(path, t)
            for s in (-1, 1):
                p.leaf(pt, math.atan2(d[0], d[1]) + s * 0.95, 0.08, 0.055, p.jit(leaf_col or hx('#7a9a7a'), 0.05), shape='oval', rib=False)
        tip = path[-1]
        p.globe((tip[0], tip[1] + 0.025), 0.065, head_col, count=40, fl=0.35, elong=1.0, squash=0.55, dark=0.6)


def f_fetthenne_blatt(p):
    sedum(p, hx('#9ab07a'))


def f_fetthenne_bluete(p):
    sedum(p, hx('#c86a8a'))


def f_fetthenne_samen(p):
    sedum(p, hx('#7a3a2a'), stem_col=hx('#7a5a3e'), leaf_col=hx('#7a6a4a'))


def f_aster(p):
    paths = leafy_bush(p, 6, (0.65, 0.8), 0.11, 0.03, hx('#3e6a2e'), shape='lanzett', spread=0.25)
    for path in paths:
        tip = path[-1]
        for b in range(p.ri(6, 9)):
            s = p.r(-1, 1)
            q = (tip[0] + s * p.r(0.03, 0.16), tip[1] + p.r(-0.02, 0.14))
            p.stroke([tip, q], 0.004, 0.003, hx('#5a7a3a'), hl=0)
            flat_flower(p, q, p.r(0.035, 0.045), p.jit(hx('#8a5ac0'), 0.06), hx('#f2c418'), petals=16, shape='linear',
                        nrm=p.head_normal(0.6, 0.6, side=s * 0.4))


def peony_leaves(p, n=7, scale=1.0):
    for k in range(n):
        u = p.r(-0.3, 0.3) / scale ** 0.5
        q = (u, p.r(0.22, 0.48) * scale)
        p.stroke([(p.r(-0.03, 0.03), 0), q], 0.012, 0.009, hx('#6a4a3a'), hl=0)
        for s in (-1, 0, 1):
            p.leaf(q, s * 0.8 + p.r(-0.2, 0.2), 0.16 * scale, 0.06 * scale, p.jit(hx('#3a6230'), 0.06), shape='lanzett', bend=0.1 * s)


def f_pfingstrose_blatt(p):
    peony_leaves(p, 9, 1.5)


def f_pfingstrose_bluete(p):
    peony_leaves(p, 7, 1.0)
    for u, top in ((-0.18, 0.7), (0.15, 0.76), (0.0, 0.6)):
        path = stalk(p, u, top, 0, w=0.014, col=hx('#5a7a3a'))
        c = (path[-1][0], path[-1][1] + 0.06)
        col = hx('#d8306a')
        p.globe(c, 0.1, col, count=70, fl=0.5, elong=1.0, dark=0.55)
        p.rays(c, (0, 0.6, 0.8), 0.04, 0.13, 0.09, 8, mul(col, 0.9), cup=0.9, shape='rund', front=True, jitter=0.3)


def f_frauenmantel(p):
    for k in range(12):
        q = (p.r(-0.3, 0.3), p.r(0.1, 0.42))
        p.stroke([(p.r(-0.03, 0.03), 0), q], 0.01, 0.007, hx('#7a9a5a'), hl=0)
        p.palmate(q, p.r(0.1, 0.13), p.jit(hx('#7a9a5a'), 0.05), lobes=9, cut=0.12, tilt=p.r(0.45, 0.65), rot=p.r(0, 6.28), teeth=2)
    dts = []
    for k in range(9):
        path = stalk(p, p.r(-0.35, 0.35), p.r(0.55, 0.9), p.r(-0.05, 0.05), w=0.006, col=hx('#8aa060'))
        tip = path[-1]
        for f in range(20):
            a = p.r(0, 6.283)
            rr = p.r(0, 0.08)
            dts.append((tip[0] + math.cos(a) * rr, tip[1] + math.sin(a) * rr * 0.6, p.r(0.007, 0.011), p.jit(hx('#c8c84a'), 0.08)))
    p.dots(dts)


def miscanthus(p, col, plumes=False):
    # a fountain: most leaves near upright, arching out at the tips
    for k in range(34):
        a = 0.5 * (1 if p.r() < 0.5 else -1) * p.r(0, 1) ** 1.5
        L = p.r(0.45, 0.7)
        p.leaf((p.r(-0.04, 0.04), 0), a, L, 0.035, p.jit(col, 0.06), shape='linear', bend=0.25 * sgn(a), rib=True)
    if plumes:
        segs = []
        for k in range(10):
            u = p.r(-0.22, 0.22)
            path = stalk(p, u, p.r(0.75, 0.86), 0, w=0.007, col=hx('#c8b890'))
            tip = path[-1]
            root = (tip[0], tip[1] - 0.04)
            for b in range(7):
                a = p.r(-0.5, 0.5) + u * 0.8
                L = p.r(0.06, 0.12)
                e = (root[0] + math.sin(a) * L, root[1] + math.cos(a) * L)
                p.stroke([root, e], 0.006, 0.003, hx('#d8ccb4'), hl=0)
                for h in range(6):
                    t = p.r(0.2, 1)
                    q = (root[0] + (e[0] - root[0]) * t, root[1] + (e[1] - root[1]) * t)
                    aa = a + p.r(-0.6, 0.6)
                    segs.append((q, (q[0] + math.sin(aa) * 0.03, q[1] + math.cos(aa) * 0.03)))
        p.soft_lines(segs, hx('#efe8da'), 3, 0.7)


def f_chinaschilf_blatt(p):
    miscanthus(p, hx('#5a8a4a'))


def f_chinaschilf_samen(p):
    miscanthus(p, hx('#b8a878'), plumes=True)


def f_stockrose(p):
    for k in range(5):
        q = (p.r(-0.25, 0.25), p.r(0.05, 0.22))
        p.stroke([(0, 0), q], 0.012, 0.01, hx('#5a8038'), hl=0)
        p.palmate(q, p.r(0.1, 0.13), p.jit(hx('#4a7a30')), lobes=7, cut=0.2, tilt=0.6, rot=p.r(0, 6.28), teeth=2)
    path = stalk(p, p.r(-0.04, 0.04), 0.97, p.r(-0.03, 0.03), w=0.02, col=hx('#5a7a3a'))
    for i in range(12):
        t = 0.3 + 0.68 * i / 11
        pt, d = p.at(path, t)
        s = 1 if i % 2 else -1
        q = (pt[0] + s * 0.04, pt[1])
        if i < 9:
            flat_flower(p, q, 0.075 * (1 - 0.35 * i / 12), p.jit(hx('#d86a9a'), 0.05), hx('#f4e8c0'), petals=5, shape='rund',
                        nrm=(0.6 * s, 0.25, 0.75), cup=0.4)
        else:
            p.ball(q[0], q[1], 0.018, hx('#7a9a5a'), hl=0.2)


# ---------------------------------------------------------------- roses and ground cover


def rose_bush(p, h=0.95, flowers=0, col=None, small=False):
    for k in range(9):
        u = p.r(-0.3, 0.3)
        path = stem_path(p, p.r(-0.04, 0.04), u, p.r(0.6, 0.92) * h, p.r(-0.08, 0.08))
        p.stroke(path, 0.012, 0.008, hx('#4a6a2a'), hl=0)
        for t in (0.25, 0.4, 0.55, 0.7, 0.85, 0.97):
            pt, d = p.at(path, t)
            p.pinnate(pt, math.atan2(d[0], d[1]) + (0.9 if p.r() < 0.5 else -0.9), 0.13, 0.08, p.jit(hx('#2e5a26'), 0.05), pairs=2, leaflet='oval',
                      bend=0.1, fine=1.3)
    for k in range(flowers):
        u, v = p.r(-0.36, 0.36), p.r(0.45, 0.9) * h + 0.05
        if small:
            flat_flower(p, (u, v), p.r(0.04, 0.05), p.jit(col, 0.06), hx('#f2d040'), petals=5, shape='rund', nrm=p.head_normal(0.6, 0.6))
        else:
            c = (u, v)
            p.globe(c, 0.05, mul(col, 0.85), count=30, fl=0.55, elong=1.1, dark=0.5)
            p.rays(c, p.head_normal(0.6, 0.6), 0.02, 0.07, 0.06, 6, col, cup=1.0, shape='rund', jitter=0.3)


def f_rose_blatt(p):
    rose_bush(p, 0.9)


def f_beetrose_bluete(p):
    rose_bush(p, 0.85, flowers=9, col=hx('#c81a3a'))


def f_bodendeckerrose(p):
    rose_bush(p, 0.6, flowers=22, col=hx('#e070a0'), small=True)


def cotoneaster(p, berries=False):
    for k in range(9):
        a = p.r(-1.35, 1.35)
        L = p.r(0.33, 0.44)
        tip = (math.sin(a) * L, 0.1 + abs(math.cos(a)) * 0.55)
        path = p.bez((0, 0), (tip[0] * 0.5, tip[1] + 0.12), tip, 12)
        p.stroke(path, 0.009, 0.005, hx('#5a4a3a'), hl=0)
        dts = []
        for i, q in enumerate(path[2:]):
            for s in (-1, 1):
                p.ellipse(q[0] + s * 0.018, q[1] + p.r(-0.01, 0.01), 0.02, 0.013, p.r(0, 3), p.jit(hx('#2e5a26'), 0.08), n=10)
            if berries and p.r() < 0.35:
                dts.append((q[0] + p.r(-0.02, 0.02), q[1] - 0.01, 0.012, p.jit(hx('#c8201a'), 0.06)))
        p.dots(dts)


def f_zwergmispel_blatt(p):
    cotoneaster(p)


def f_zwergmispel_frucht(p):
    cotoneaster(p, berries=True)


def fingerstrauch(p, flowers):
    p.rng = np.random.default_rng(4242)  # the same bush in both frames (in leaf, in flower)
    for k in range(12):
        u = p.r(-0.3, 0.3)
        path = stem_path(p, p.r(-0.04, 0.04), u, p.r(0.6, 0.92), p.r(-0.08, 0.08))
        p.stroke(path, 0.009, 0.005, hx('#7a5a3a'), hl=0)
        for t in (0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92):
            pt, d = p.at(path, t)
            for s in (-1, 1):
                p.leaf(pt, math.atan2(d[0], d[1]) + s * p.r(0.6, 1.0), 0.07, 0.02, p.jit(hx('#5a7a4a'), 0.06), shape='lanzett', rib=False)
    pos = [(p.r(-0.36, 0.36), p.r(0.4, 0.92), p.r(0.035, 0.045)) for k in range(18)]
    if flowers:
        for u, v, rad in pos:
            flat_flower(p, (u, v), rad, p.jit(hx('#f2c418'), 0.05), hx('#d8a010'), petals=5, shape='rund', nrm=p.head_normal(0.6, 0.6))
    else:  # small leaves where the flowers will be
        for u, v, rad in pos:
            for k in range(3):
                p.leaf((u, v - 0.03), p.r(-1.0, 1.0), 0.065, 0.02, p.jit(hx('#5a7a4a'), 0.06), shape='lanzett', rib=False)


def f_fingerstrauch_bluete(p):
    fingerstrauch(p, True)


def f_fingerstrauch_blatt(p):
    fingerstrauch(p, False)


def f_staude_blatt(p):
    # the leaves of a perennial before it flowers (Sonnenhut, Aster, Frauenmantel, Stockrose): a leafy clump
    mound(p, 14, 0.45, 0.15, hx('#3e6a2e'), shape='lanzett', spread=1.0, teeth=3)
    leafy_bush(p, 7, (0.55, 0.92), 0.14, 0.05, hx('#456e32'), shape='lanzett', spread=0.24, ts=(0.2, 0.35, 0.5, 0.65, 0.8, 0.92))


# ---------------------------------------------------------------- vegetables


def lettuce(p, n, rad, col, heart=True):
    for k in range(n):
        a = p.r(-1.4, 1.4)
        p.leaf((p.r(-0.02, 0.02), 0), a, rad * p.r(0.9, 1.2), rad * 0.9, p.jit(col, 0.06), shape='rund', bend=-0.2 * sgn(a), teeth=6, tooth=0.15,
               foreshort=p.r(0.6, 1))
    if heart:
        p.ball(0, rad * 0.55, rad * 0.45, mix(col, hx('#d8e8a0'), 0.4), hl=0.3, dark=0.75)


def f_salat_jung(p):
    lettuce(p, 7, 0.35, hx('#7ab04a'), heart=False)


def f_salat_reif(p):
    lettuce(p, 14, 0.4, hx('#7ab04a'))


def cabbage_leaf(p, base, a, L, col, bend=0.1, fore=1.0):
    rib = p.leaf(base, a, L, L * 0.85, col, shape='rund', bend=bend, foreshort=fore)
    vein = mix(col, (0.9, 0.95, 0.85), 0.3)
    for t in (0.3, 0.5, 0.7):
        q, d = p.at(rib, t)
        for s in (-1, 1):
            e = (q[0] + (d[0] * 0.6 - s * d[1] * 0.8) * L * 0.25, q[1] + (d[1] * 0.6 + s * d[0] * 0.8) * L * 0.25)
            p.stroke([q, e], 0.006, 0.002, vein, hl=0)


def cabbage(p, ripe):
    col = hx('#6a8c84')
    for k in range(9 if ripe else 6):
        a = p.r(-1.3, 1.3)
        L = p.r(0.3, 0.42) if ripe else p.r(0.3, 0.4)
        cabbage_leaf(p, (p.r(-0.02, 0.02), 0.02), a, L, p.jit(col, 0.05), bend=0.12 * sgn(a), fore=p.r(0.6, 1))
    if ripe:
        head = hx('#a2bc98')
        p.ball(0, 0.27, 0.2, head, hl=0.1, dark=0.8)
        for s in (-1, 1):  # two leaves wrapping the head
            p.leaf((s * 0.04, 0.08), s * 0.45, 0.32, 0.26, p.jit(mul(head, 0.9), 0.03), shape='rund', bend=-0.3 * s, rib=False)


def f_kohl_jung(p):
    cabbage(p, False)


def f_kohl_reif(p):
    cabbage(p, True)


def onion(p, wilted):
    col = hx('#8aa060') if wilted else hx('#5a8a5a')
    for k in range(7):
        if wilted:  # fallen over, yellowing
            a, L, bend = p.r(-1.0, 1.0), p.r(0.3, 0.42), 0.35
            c = p.jit(mix(col, hx('#c8b060'), 0.5), 0.06)
        else:
            a, L, bend = p.r(-0.35, 0.35), p.r(0.65, 0.85), -0.1
            c = p.jit(col, 0.06)
        p.leaf((p.r(-0.02, 0.02), 0.08), a, L, 0.04, c, shape='linear', bend=bend * sgn(a), rib=False)
    p.ball(0, 0.08, 0.1, hx('#c8a060'), hl=0.25, dark=0.7)


def f_zwiebel_blatt(p):
    onion(p, False)


def f_zwiebel_welk(p):
    onion(p, True)


def f_moehre(p):
    for k in range(8):
        a = p.r(-0.4, 0.4)
        p.pinnate((p.r(-0.03, 0.03), 0), a, p.r(0.6, 0.85), 0.25, p.jit(hx('#4f8a3a')), pairs=6, sub=3, fine=0.7, bend=-0.12 * sgn(a))
    p.ellipse(0, 0.01, 0.04, 0.02, 0, hx('#e8801a'), n=12)


def f_lauch(p):
    p.stroke([(0, 0), (0, 0.38)], 0.07, 0.06, hx('#e8ecd8'), col1=hx('#c8d8b0'), hl=0.2)
    for k in range(8):
        a = (-1 if k % 2 else 1) * p.r(0.15, 0.55)
        p.leaf((p.r(-0.01, 0.01), 0.3 + k * 0.03), a, p.r(0.4, 0.55), 0.07, p.jit(hx('#4f7a62'), 0.05), shape='linear', bend=0.3 * sgn(a), rib=True)


def potato(p, flowers=False, wilted=False):
    col = hx('#3e6a2e') if not wilted else hx('#a89a4a')
    for k in range(10):
        u = p.r(-0.28, 0.28)
        path = stem_path(p, p.r(-0.04, 0.04), u, p.r(0.55, 0.85) * (0.6 if wilted else 1), p.r(-0.1, 0.1) + (u * 0.6 if wilted else 0))
        p.stroke(path, 0.014, 0.009, hx('#5a7a3a') if not wilted else hx('#8a7a44'), hl=0)
        for t in (0.3, 0.5, 0.7, 0.88):
            pt, d = p.at(path, t)
            p.pinnate(pt, math.atan2(d[0], d[1]) + (0.8 if p.r() < 0.5 else -0.8), 0.2, 0.12, p.jit(col, 0.07), pairs=3, leaflet='oval',
                      bend=0.15 if not wilted else 0.5, fine=1.3)
        if flowers and p.r() < 0.8:
            tip = path[-1]
            for f in range(p.ri(3, 5)):
                q = (tip[0] + p.r(-0.06, 0.06), tip[1] + p.r(0.0, 0.07))
                flat_flower(p, q, 0.035, mix(hx('#f0e8f4'), hx('#b8a0d8'), p.r(0, 0.6)), hx('#f2c418'), petals=5, shape='lanzett',
                            nrm=p.head_normal(0.5, 0.7))


def f_kartoffel_kraut(p):
    potato(p)


def f_kartoffel_bluete(p):
    potato(p, flowers=True)


def f_kartoffel_welk(p):
    potato(p, wilted=True)


def bean(p, full):
    pole(p, 0.0, 0.95)
    path = p.bez((0.0, 0.0), (0.06, 0.45), (0.0, 0.9 if full else 0.32), 30)
    pts = [(q[0] + 0.02 * math.sin(i * 1.3), q[1]) for i, q in enumerate(path)]  # twining round the pole
    p.stroke(pts, 0.006, 0.004, hx('#5a8a3a'), hl=0)
    n = 20 if full else 4
    for i in range(n):
        q, d = p.at(pts, 0.1 + 0.85 * i / max(1, n - 1))
        s = 1 if i % 2 else -1
        base = (q[0] + s * 0.02, q[1])
        for k in (-1, 0, 1):  # trifoliate
            p.leaf(base, s * 0.9 + k * 0.6, 0.1, 0.075, p.jit(hx('#4f8a3a'), 0.06), shape='herz', bend=0.1 * k)
        if full and i % 2 == 0:
            p.dots([(base[0] + s * 0.04, base[1] + 0.02, 0.01, hx('#d84a3a') if i % 4 else hx('#f4f0ea'))])
            for j in range(2):
                p.ellipse(base[0] - s * 0.03 + j * 0.012, base[1] - 0.07, 0.006, 0.06, 0.1 * s, hx('#6a9a3a'), n=10)


def f_bohne_jung(p):
    bean(p, False)


def f_bohne_reif(p):
    bean(p, True)


def tomato(p, fruit):
    pole(p, 0.03, 0.95, w=0.014)
    path = stalk(p, 0.0, 0.75, 0.02, w=0.018, col=hx('#5a8a3a'), u0=0.0)
    for i, t in enumerate((0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)):
        pt, d = p.at(path, t)
        p.pinnate(pt, math.atan2(d[0], d[1]) + (0.9 if i % 2 else -0.9), 0.25, 0.16, p.jit(hx('#3e6a2e'), 0.06), pairs=3, leaflet='oval', bend=0.3,
                  fine=1.2)
    if fruit:
        for t in (0.35, 0.55, 0.72):
            pt, d = p.at(path, t)
            s = 1 if t > 0.5 else -1
            for k in range(4):
                p.ball(pt[0] + s * (0.05 + 0.035 * k), pt[1] - 0.04 - 0.02 * (k % 2), 0.032, hx('#d03020') if k < 3 else hx('#e89a2a'), hl=0.35,
                       dark=0.6)
    else:
        p.dots([(path[-1][0] + p.r(-0.08, 0.08), p.r(0.5, 0.8), 0.012, hx('#f2d020')) for _ in range(6)])


def f_tomate_jung(p):
    tomato(p, False)


def f_tomate_frucht(p):
    tomato(p, True)


def squash_leaf(p, a):
    q = (math.sin(a) * p.r(0.12, 0.3), p.r(0.18, 0.6))
    p.stroke([(0, 0), q], 0.016, 0.012, hx('#6a8a44'), hl=0)
    p.palmate(q, p.r(0.13, 0.16), p.jit(hx('#4a7a30'), 0.06), lobes=5, cut=0.3, tilt=p.r(0.45, 0.65), rot=p.r(0, 6.28), teeth=2)


def f_kuerbis(p):
    # the young plant serves this cell too: the fruit low, half under the leaves
    for k in range(6):
        squash_leaf(p, p.r(-1.2, 1.2))
    p.ball(0.16, 0.1, 0.1, hx('#e8801a'), hl=0.3, dark=0.65)
    for k in range(2):
        squash_leaf(p, p.r(0.2, 1.0))
    for k in range(3):
        q = (p.r(-0.28, 0.28), p.r(0.5, 0.72))
        p.bell(q, p.r(-0.4, 0.4), 0.09, 0.07, hx('#f2c020'), inner=hx('#e0a010'), lobes=5, flare=0.5)


def f_rhabarber(p):
    for k in range(7):
        a = p.r(-0.85, 0.85)
        L = p.r(0.35, 0.5)
        tip = (math.sin(a) * L * 0.8, math.cos(a) * L * 0.9 + 0.05)
        p.stroke(p.bez((0, 0), (tip[0] * 0.4, tip[1] * 0.6), tip, 10), 0.03, 0.02, hx('#b03a3a'), col1=hx('#8a5a3a'), hl=0.2)
        p.palmate((tip[0], tip[1] + 0.08), p.r(0.14, 0.18), p.jit(hx('#4a7a3a'), 0.06), lobes=7, cut=0.15, tilt=p.r(0.4, 0.6), rot=p.r(0, 6.28),
                  teeth=3)


def strawberry(p, fruit):
    for k in range(9):
        a = p.r(-1.2, 1.2)
        q = (math.sin(a) * p.r(0.15, 0.33), p.r(0.25, 0.65))
        p.stroke([(0, 0), q], 0.008, 0.006, hx('#6a8a4a'), hl=0)
        A.trefoil(p, q, p.r(0.12, 0.15), p.jit(hx('#3e6a2e'), 0.06), chevron=False)
    if fruit:  # ripe and green berries hanging, a few late flowers
        for k in range(7):
            q = (p.r(-0.3, 0.3), p.r(0.2, 0.6))
            col = hx('#d0202a') if k < 5 else hx('#b8c870')
            p.ellipse(q[0], q[1] - 0.03, 0.03, 0.04, 0, col, n=14)
            p.dots([(q[0] + p.r(-0.015, 0.015), q[1] - 0.03 + p.r(-0.02, 0.02), 0.003, hx('#f2d040')) for _ in range(5)])
        for k in range(2):
            flat_flower(p, (p.r(-0.3, 0.3), p.r(0.5, 0.7)), 0.04, hx('#f8f8f0'), hx('#f2c418'), petals=5, shape='rund')
    else:  # the cell also shows the plant out of flower: only a few flowers
        for k in range(4):
            flat_flower(p, (p.r(-0.3, 0.3), p.r(0.45, 0.72)), 0.04, hx('#f8f8f0'), hx('#f2c418'), petals=5, shape='rund')


def f_erdbeere_bluete(p):
    strawberry(p, False)


def f_erdbeere_frucht(p):
    strawberry(p, True)


def dahlia(p, flowers):
    pole(p, 0.03, 0.9, w=0.012)
    leafy_bush(p, 7, (0.6, 0.85) if flowers else (0.75, 0.92), 0.13, 0.065, hx('#2e5a26'), shape='oval', spread=0.24, opp=True,
               ts=(0.2, 0.35, 0.5, 0.65, 0.8, 0.92))
    if flowers:
        for k in range(5):
            u, v = p.r(-0.25, 0.25), p.r(0.68, 0.86)
            col = p.jit(hx('#d8306a'), 0.06)
            p.rays((u, v), p.head_normal(0.4, 0.8), 0.01, 0.1, 0.05, 16, col, cup=0.4, shape='lanzett', jitter=0.1)
            p.rays((u, v), p.head_normal(0.4, 0.8), 0.005, 0.065, 0.04, 12, mix(col, (1, 1, 1), 0.15), cup=0.9, shape='lanzett', jitter=0.2)
            p.dots([(u, v + 0.01, 0.015, mix(col, hx('#f2c418'), 0.4))])


def f_dahlie_blatt(p):
    dahlia(p, False)


def f_dahlie_bluete(p):
    dahlia(p, True)


def sunflower(p, stage):
    top = {'jung': 0.85, 'bluete': 0.78, 'samen': 0.84}[stage]
    path = stalk(p, 0.0, top, 0.03, w=0.04 if stage != 'jung' else 0.03, col=hx('#8a7a44') if stage == 'samen' else hx('#5a8a3a'), u0=0.0)
    lc = hx('#8a7a3a') if stage == 'samen' else hx('#3e6a2e')
    for i, t in enumerate((0.15, 0.3, 0.45, 0.6, 0.75)):
        pt, d = p.at(path, t)
        s = 1 if i % 2 else -1
        p.leaf(pt, math.atan2(d[0], d[1]) + s * (2.0 if stage == 'samen' else 1.0), 0.3 if stage == 'jung' else 0.24, 0.17, p.jit(lc, 0.06),
               shape='herz', bend=0.2 * s, teeth=6, tooth=0.1)
    tip = path[-1]
    if stage == 'bluete':
        c = (tip[0], tip[1] + 0.02)
        nrm = (0.15, 0.25, 0.95)
        p.rays(c, nrm, 0.07, 0.17, 0.05, 26, hx('#f2c418'), col_tip=hx('#f8d84a'), cup=0.1, shape='lanzett', jitter=0.08)
        p.disc(c, nrm, 0.085, hx('#4a2a14'), dome=0.15, hl=0.08)
    elif stage == 'samen':  # the heavy head bowed, the ray florets dry
        hook = p.bez(tip, (tip[0] + 0.08, tip[1] + 0.04), (tip[0] + 0.12, tip[1] - 0.06), 8)
        p.stroke(hook, 0.03, 0.025, hx('#8a7a44'), hl=0)
        c = hook[-1]
        p.ellipse(c[0], c[1] - 0.04, 0.09, 0.11, 0.6, hx('#5a4228'), n=20)
        p.rays((c[0], c[1] - 0.04), (0.7, -0.5, 0.5), 0.07, 0.12, 0.03, 18, hx('#8a6a3a'), cup=0.3, shape='lanzett', jitter=0.2)


def f_sonnenblume_jung(p):
    sunflower(p, 'jung')


def f_sonnenblume_bluete(p):
    sunflower(p, 'bluete')


def f_sonnenblume_samen(p):
    sunflower(p, 'samen')


# ---------------------------------------------------------------- the layout (must match BWARTEN.beet's cells – the unit tests check it)
# frame: one, or a list when the cell serves several frames (the first is its main one)

LAYOUT2 = [
    # row 0: spring bedding, ground cover of graves
    ((0, 0), 'tulpe-blatt', 'blatt', ['tulpe', 'narzisse'], f_tulpe_blatt),
    ((1, 0), 'tulpe-bluete', 'bluete', ['tulpe'], f_tulpe_rot),
    ((2, 0), 'tulpe-bluete-gelb', 'bluete', ['tulpe'], f_tulpe_gelb),
    ((3, 0), 'narzisse-bluete', 'bluete', ['narzisse'], f_narzisse),
    ((4, 0), 'stiefmuetterchen-bluete', 'bluete', ['stiefmuetterchen'], f_stiefmuetterchen),
    ((5, 0), 'vergissmeinnicht-bluete', 'bluete', ['vergissmeinnicht'], f_vergissmeinnicht),
    ((6, 0), 'immergruen-bluete', 'bluete', ['immergruen'], f_immergruen),
    ((7, 0), 'efeu-blatt', 'blatt', ['efeu', 'immergruen'], f_efeu),
    # row 1: summer and autumn bedding, evergreens
    ((0, 1), 'geranie-bluete', 'bluete', ['geranie'], f_geranie),
    ((1, 1), 'begonie-bluete', 'bluete', ['begonie'], f_begonie),
    ((2, 1), 'tagetes-bluete', 'bluete', ['tagetes'], f_tagetes),
    ((3, 1), 'heide-bluete', 'bluete', ['heide'], f_heide),
    ((4, 1), 'chrysantheme-bluete', 'bluete', ['chrysantheme'], f_chrysantheme),
    ((5, 1), 'zwergkonifere', 'blatt', ['zwergkonifere'], f_zwergkonifere),
    ((6, 1), 'tannengruen', 'blatt', ['tannengruen'], f_tannengruen),
    ((7, 1), 'buchskugel', 'blatt', ['buchskugel'], f_buchskugel),
    # row 2: perennials
    ((0, 2), 'lavendel-blatt', 'blatt', ['lavendel', 'katzenminze'], f_lavendel_blatt),
    ((1, 2), 'lavendel-bluete', 'bluete', ['lavendel'], f_lavendel_bluete),
    ((2, 2), 'katzenminze-bluete', 'bluete', ['katzenminze'], f_katzenminze),
    ((3, 2), 'sonnenhut-gelb-bluete', 'bluete', ['sonnenhut_gelb'], f_sonnenhut_gelb),
    ((4, 2), 'sonnenhut-samen', 'samen', ['sonnenhut_gelb', 'sonnenhut_rot'], f_sonnenhut_samen),
    ((5, 2), 'sonnenhut-rot-bluete', 'bluete', ['sonnenhut_rot'], f_sonnenhut_rot),
    ((6, 2), 'fetthenne-blatt', 'blatt', ['fetthenne'], f_fetthenne_blatt),
    ((7, 2), 'fetthenne-bluete', 'bluete', ['fetthenne'], f_fetthenne_bluete),
    # row 3
    ((0, 3), 'fetthenne-samen', 'samen', ['fetthenne'], f_fetthenne_samen),
    ((1, 3), 'aster-bluete', 'bluete', ['aster'], f_aster),
    ((2, 3), 'pfingstrose-blatt', 'blatt', ['pfingstrose'], f_pfingstrose_blatt),
    ((3, 3), 'pfingstrose-bluete', 'bluete', ['pfingstrose'], f_pfingstrose_bluete),
    ((4, 3), 'frauenmantel-bluete', 'bluete', ['frauenmantel'], f_frauenmantel),
    ((5, 3), 'chinaschilf-blatt', 'blatt', ['chinaschilf'], f_chinaschilf_blatt),
    ((6, 3), 'chinaschilf-samen', 'samen', ['chinaschilf'], f_chinaschilf_samen),
    ((7, 3), 'stockrose-bluete', 'bluete', ['stockrose'], f_stockrose),
    # row 4: roses, ground cover of traffic islands, the leaves of perennials
    ((0, 4), 'rose-blatt', 'blatt', ['beetrose', 'bodendeckerrose'], f_rose_blatt),
    ((1, 4), 'beetrose-bluete', 'bluete', ['beetrose'], f_beetrose_bluete),
    ((2, 4), 'bodendeckerrose-bluete', 'bluete', ['bodendeckerrose'], f_bodendeckerrose),
    ((3, 4), 'zwergmispel-blatt', 'blatt', ['zwergmispel'], f_zwergmispel_blatt),
    ((4, 4), 'zwergmispel-frucht', 'frucht', ['zwergmispel'], f_zwergmispel_frucht),
    ((5, 4), 'fingerstrauch-bluete', 'bluete', ['fingerstrauch'], f_fingerstrauch_bluete),
    ((6, 4), 'staude-blatt', 'blatt', ['sonnenhut_gelb', 'sonnenhut_rot', 'aster', 'frauenmantel', 'stockrose'], f_staude_blatt),
    ((7, 4), 'fingerstrauch-blatt', 'blatt', ['fingerstrauch'], f_fingerstrauch_blatt),
    # row 5: vegetables
    ((0, 5), 'salat-jung', 'jung', ['salat'], f_salat_jung),
    ((1, 5), 'salat-reif', 'reif', ['salat'], f_salat_reif),
    ((2, 5), 'kohl-jung', 'jung', ['kohl'], f_kohl_jung),
    ((3, 5), 'kohl-reif', 'reif', ['kohl'], f_kohl_reif),
    ((4, 5), 'zwiebel-blatt', 'blatt', ['zwiebel'], f_zwiebel_blatt),
    ((5, 5), 'zwiebel-welk', 'welk', ['zwiebel'], f_zwiebel_welk),
    ((6, 5), 'moehre-blatt', 'blatt', ['moehre'], f_moehre),
    ((7, 5), 'lauch-blatt', 'blatt', ['lauch'], f_lauch),
    # row 6
    ((0, 6), 'kartoffel-kraut', ['reif', 'jung'], ['kartoffel'], f_kartoffel_kraut),
    ((1, 6), 'kartoffel-bluete', 'bluete', ['kartoffel'], f_kartoffel_bluete),
    ((2, 6), 'kartoffel-welk', 'welk', ['kartoffel'], f_kartoffel_welk),
    ((3, 6), 'bohne-jung', 'jung', ['bohne'], f_bohne_jung),
    ((4, 6), 'bohne-reif', 'reif', ['bohne'], f_bohne_reif),
    ((5, 6), 'tomate-jung', 'jung', ['tomate'], f_tomate_jung),
    ((6, 6), 'tomate-frucht', 'frucht', ['tomate'], f_tomate_frucht),
    ((7, 6), 'kuerbis', ['frucht', 'jung'], ['kuerbis'], f_kuerbis),
    # row 7
    ((0, 7), 'rhabarber-blatt', 'blatt', ['rhabarber'], f_rhabarber),
    ((1, 7), 'erdbeere-bluete', ['bluete', 'blatt'], ['erdbeere'], f_erdbeere_bluete),
    ((2, 7), 'erdbeere-frucht', 'frucht', ['erdbeere'], f_erdbeere_frucht),
    ((3, 7), 'dahlie-blatt', 'blatt', ['dahlie'], f_dahlie_blatt),
    ((4, 7), 'dahlie-bluete', 'bluete', ['dahlie'], f_dahlie_bluete),
    ((5, 7), 'sonnenblume-jung', 'jung', ['sonnenblume'], f_sonnenblume_jung),
    ((6, 7), 'sonnenblume-bluete', 'bluete', ['sonnenblume'], f_sonnenblume_bluete),
    ((7, 7), 'sonnenblume-samen', 'samen', ['sonnenblume'], f_sonnenblume_samen),
]

NOTE = ('Zelle (Spalte, Zeile) von oben links; eine Beetpflanze von der Seite, Fuß unten in der Mitte, füllt die Höhe der Zelle; breite = Anteil '
        'der Zellbreite (Alpha ≥ 0,5); farbe = mittlere Farbe (sRGB); bild = das Bild der Zelle, auch = weitere Bilder derselben Art, die sie '
        'zeigt (eine junge Kartoffel ist die große, kleiner). Erzeugt von tools/bewuchs/pflanzen/beete.py (eigene Zeichnung).')


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
    im, meta = A.build(out, only, layout=LAYOUT2, name='beete', tinted=set(), seed0=5000, note=NOTE)
    if sh:
        A.sheets(im, meta, sh, prefix='beete', meadow='beete_bildschirm')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
