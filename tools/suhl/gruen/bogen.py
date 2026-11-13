#!/usr/bin/env python3
"""suhl-gruen: picture sheets to look at – the orthophoto with the found trees drawn on it (crown circle by kind, a dot at the trunk,
mapped OSM trees as crosses). Sheets are at most 1024 px wide, carry tile, place, flight date and attribution, and go ONLY to the scratch
branch ref/suhl-gruen (the orthophoto is © GDI-Th, CC BY 4.0), never to the work branch.

  python3 -I tools/suhl/gruen/bogen.py --b tools/suhl/out/gruen/probe/suhl/b/v0 --out /tmp/suhl-gruen/bogen --tiles 497_542 [--zoom]
"""
import argparse, json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib, gbild, baeume

COL = {'laub': (255, 235, 60), 'nadel': (60, 220, 255), 'strauch': (255, 150, 40), 'osm': (255, 60, 255), 'mess': (90, 230, 255), 'schaetz': (255, 150, 40)}
CREDIT = 'Luftbild © GDI-Th (TLBG), CC BY 4.0, Bildflug 15.05.2024 · Bäume: suhl-gruen (Schätzung aus dem Infrarot-Luftbild), OSM-Bäume © OpenStreetMap-Mitwirkende'


def colour(kind):
    return COL['strauch'] if kind == 30 else COL['nadel'] if kind in baeume.CONIFER else COL['laub']


def draw(img, bb, T, osm=(), scale=1.0, label='', mode='art', legend=None, rings=None):
    """img: uint8 array of the box bb (rows from the north) -> PIL image with the trees drawn, scaled by `scale`"""
    from PIL import Image, ImageDraw, ImageFont
    e0, n0, e1, n1 = bb
    h, w = img.shape[:2]
    im = Image.fromarray(img).resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    s = scale / gbild.PX
    for E, N, r, k, f in zip(T['E'], T['N'], T['r'], T['kind'], T['flags']):
        x, y = (E - e0) * s, (n1 - N) * s
        if x < -20 or y < -20 or x > im.width + 20 or y > im.height + 20:
            continue
        c = colour(int(k)) if mode == 'art' else (COL['mess'] if int(f) & baeume.F_H else COL['schaetz'])
        rr = r * s
        d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=c, width=1 if scale < 0.8 else 2)
        q = 1.5 if scale < 0.8 else 2.5
        d.ellipse([x - q, y - q, x + q, y + q], fill=(255, 255, 255) if (int(f) & 3) == baeume.POS_OSM else c)
    for E, N, r in (rings if rings is not None else ()):          # the doubt list: wide crowns without a laser return
        x, y = (E - e0) * s, (n1 - N) * s
        if -30 < x < im.width + 30 and -30 < y < im.height + 30:
            rr = r * s + 2
            d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(255, 60, 255), width=2)
    for oe, on, _ in osm:
        x, y = (oe - e0) * s, (n1 - on) * s
        q = 3 if scale < 0.8 else 5
        d.line([x - q, y, x + q, y], fill=COL['osm'], width=1)
        d.line([x, y - q, x, y + q], fill=COL['osm'], width=1)
    if label:
        try:
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
        except OSError:
            font = ImageFont.load_default()
        lines = [label, legend or ('gelb Laubbaum · blau Nadelbaum · orange Strauch/sehr klein · weißer Punkt = Lage aus OSM · magenta Kreuz = OSM-Baum'
                                   if mode == 'art' else 'hellblau Höhe gemessen (nDOM1) · orange Höhe geschätzt · weißer Punkt = Lage aus OSM · magenta Kreuz = OSM-Baum'), CREDIT]
        hh = 17 * len(lines) + 6
        out = Image.new('RGB', (im.width, im.height + hh), (20, 20, 20))
        out.paste(im, (0, 0))
        dd = ImageDraw.Draw(out)
        for i, t in enumerate(lines):
            dd.text((5, im.height + 3 + 17 * i), t, fill=(235, 235, 235), font=font)
        im = out
    return im


def tile_sheet(tx, ty, T, U=None, layer='th_dop', window=None, width=1024, label=None, mode='art'):
    """a sheet of one tile (or of a window (E0, N0, E1, N1) inside it)"""
    bb = gbild.tile_box(tx, ty)
    rgb, cir = gbild.fetch(tx, ty)
    img = rgb if layer == 'th_dop' else cir
    if window:
        e0, n0, e1, n1 = bb
        c0, c1 = int(round((window[0] - e0) / gbild.PX)), int(round((window[2] - e0) / gbild.PX))
        r0, r1 = int(round((n1 - window[3]) / gbild.PX)), int(round((n1 - window[1]) / gbild.PX))
        img = img[max(0, r0):r1, max(0, c0):c1]
        bb = window
    osm = U.osm_trees(bb) if U is not None else ()
    lab = label or f'Kachel 10/{tx}/{ty}  UTM32 E {bb[0]:.0f}–{bb[2]:.0f}  N {bb[1]:.0f}–{bb[3]:.0f}  ({"RGB" if layer == "th_dop" else "Infrarot CIR"})  {len(T["E"])} Bäume in der Kachel'
    return draw(img, bb, T, osm, scale=width / img.shape[1], label=lab, mode=mode)


def model_picture(bb, T, U, scale, wald_dir=None):
    """the model from above as a plain drawing: ground grey, carriageways, building footprints, mapped forest, crowns as discs"""
    from PIL import Image, ImageDraw
    e0, n0, e1, n1 = bb
    px = gbild.PX / scale
    w, h = int(round((e1 - e0) / px)), int(round((n1 - n0) / px))
    bld, road, water = U.raster(bb, px, grow_bld=0.0, grow_road=0.0)
    forest = U.forest_mask(bb, px)
    a = np.full((h, w, 3), (206, 200, 188), np.uint8)
    a[forest] = (150, 176, 132)
    a[road] = (120, 120, 124)
    a[water] = (110, 150, 190)
    a[bld] = (92, 84, 80)
    im = Image.fromarray(a)
    d = ImageDraw.Draw(im, 'RGBA')
    fill = {'laub': (70, 150, 50, 215), 'nadel': (20, 90, 70, 225), 'strauch': (140, 175, 70, 215)}
    order = np.argsort(-np.asarray(T['r']))
    for i in order:
        E, N, r, k = T['E'][i], T['N'][i], T['r'][i], int(T['kind'][i])
        x, y = (E - e0) / px, (n1 - N) / px
        if x < -30 or y < -30 or x > w + 30 or y > h + 30:
            continue
        rr = r / px
        key = 'strauch' if k == 30 else 'nadel' if k in baeume.CONIFER else 'laub'
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=fill[key], outline=(30, 70, 30, 255))
    return im


def vergleich_sheet(tx, ty, T, U, window, title, width=500):
    """model against orthophoto for one place: orthophoto | model, and the numbers of plan 5.2 (crowns against the green mask):
    how much of the woody mask the crown discs cover (found), how much of the disc area lies on no vegetation (invented)"""
    from PIL import Image, ImageDraw, ImageFont
    keep = {}
    baeume.tile_trees(tx, ty, U, keep=keep)
    bb = keep['bb']
    e0, n0, e1, n1 = bb
    c0, c1 = int(round((window[0] - e0) / gbild.PX)), int(round((window[2] - e0) / gbild.PX))
    r0, r1 = int(round((n1 - window[3]) / gbild.PX)), int(round((n1 - window[1]) / gbild.PX))
    rgb = keep['rgb'][r0:r1, c0:c1]
    wood, veg = keep['wood'][r0:r1, c0:c1], keep['veg'][r0:r1, c0:c1]
    disc = Image.new('L', (c1 - c0, r1 - r0), 0)
    dd = ImageDraw.Draw(disc)
    n_in = 0
    for E, N, r in zip(T['E'], T['N'], T['r']):
        x, y = (E - window[0]) / gbild.PX, (window[3] - N) / gbild.PX
        rr = r / gbild.PX
        if -rr < x < c1 - c0 + rr and -rr < y < r1 - r0 + rr:
            dd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=1)
            n_in += window[0] <= E < window[2] and window[1] <= N < window[3]
    disc = np.asarray(disc, bool)
    found = float((disc & wood).sum() / max(1, wood.sum()))
    invented = float((disc & ~veg).sum() / max(1, disc.sum()))
    scale = width / rgb.shape[1]
    a = Image.fromarray(rgb).resize((width, int(rgb.shape[0] * scale)), Image.LANCZOS)
    b = model_picture(window, T, U, scale)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    except OSError:
        font = ImageFont.load_default()
    lines = [f'{title} – Kachel 10/{tx}/{ty}, UTM32 E {window[0]:.0f}–{window[2]:.0f}, N {window[1]:.0f}–{window[3]:.0f}: links Luftbild, rechts Modell von oben',
             f'{n_in} Bäume · Gehölzmaske des Luftbilds zu {100 * found:.0f} % von Kronen bedeckt · {100 * invented:.1f} % der Kronenfläche liegen auf Nicht-Grün'
             f' · Kronendeckung Modell {100 * disc.mean():.0f} %, Gehölz im Bild {100 * wood.mean():.0f} %',
             CREDIT]
    out = Image.new('RGB', (2 * width + 4, a.height + 17 * len(lines) + 6), (20, 20, 20))
    out.paste(a, (0, 0))
    out.paste(b.resize((width, a.height)), (width + 4, 0))
    d2 = ImageDraw.Draw(out)
    for i, t in enumerate(lines):
        d2.text((5, a.height + 3 + 17 * i), t, fill=(235, 235, 235), font=font)
    return out, {'ort': title, 'kachel': f'{tx}_{ty}', 'fenster_utm': [round(v) for v in window], 'baeume': int(n_in),
                 'gehoelzmaske_von_kronen_bedeckt_prozent': round(100 * found, 1), 'kronenflaeche_auf_nicht_gruen_prozent': round(100 * invented, 1),
                 'kronendeckung_modell_prozent': round(100 * float(disc.mean()), 1), 'gehoelz_im_bild_prozent': round(100 * float(wood.mean()), 1)}


def _font():
    from PIL import ImageFont
    try:
        return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    except OSError:
        return ImageFont.load_default()


def window_images(window):
    """(rgb, cir) of any window on the 20 cm grid, put together from the tile images of the cache (fetched where missing)"""
    e0, n0, e1, n1 = window
    px = gbild.PX
    W, H = int(round((e1 - e0) / px)), int(round((n1 - n0) / px))
    rgb, cir = np.zeros((H, W, 3), np.uint8), np.zeros((H, W, 3), np.uint8)
    x0, y0, x1, y1 = glib.wlib.trange(glib.L, window)
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            te0, tn0, te1, tn1 = glib.wlib.tbounds(glib.L, tx, ty)
            oe0, oe1, on0, on1 = max(e0, te0), min(e1, te1), max(n0, tn0), min(n1, tn1)
            if oe0 >= oe1 or on0 >= on1:
                continue
            a, c = gbild.fetch(tx, ty)
            bb = gbild.tile_box(tx, ty)
            sc0, sr0 = int(round((oe0 - bb[0]) / px)), int(round((bb[3] - on1) / px))
            w, h = int(round((oe1 - oe0) / px)), int(round((on1 - on0) / px))
            dc0, dr0 = int(round((oe0 - e0) / px)), int(round((n1 - on1) / px))
            rgb[dr0:dr0 + h, dc0:dc0 + w] = a[sr0:sr0 + h, sc0:sc0 + w]
            cir[dr0:dr0 + h, dc0:dc0 + w] = c[sr0:sr0 + h, sc0:sc0 + w]
    return rgb, cir


def window_trees(bdir, window, margin=15.0):
    """the trees of a product folder in and around a window (from every tile that touches it)"""
    x0, y0, x1, y1 = glib.wlib.trange(glib.L, (window[0] - margin, window[1] - margin, window[2] + margin, window[3] + margin))
    parts = []
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            p = os.path.join(bdir, str(glib.L), str(tx), f'{ty}.bin')
            if os.path.exists(p):
                parts.append(baeume.unpack(open(p, 'rb').read(), tx, ty))
    if not parts:
        return {k: np.zeros(0, int if k in ('kind', 'flags') else float) for k in ('E', 'N', 'h', 'r', 'kind', 'flags')}
    return {k: np.concatenate([q[k] for q in parts]) for k in parts[0]}


def _inside(T, w):
    return (T['E'] >= w[0]) & (T['E'] < w[2]) & (T['N'] >= w[1]) & (T['N'] < w[3])


def height_colours(h):
    """heights (m) -> RGB: 0 dark blue, 5 green, 15 yellow, 30 red; NaN grey"""
    stops = np.array([0.0, 2.5, 8.0, 15.0, 22.0, 32.0])
    cols = np.array([(20, 24, 60), (40, 90, 150), (60, 170, 80), (235, 225, 70), (240, 140, 40), (200, 40, 40)], float)
    v = np.nan_to_num(h, nan=0.0)
    out = np.stack([np.interp(v, stops, cols[:, c]) for c in range(3)], -1).astype(np.uint8)
    out[~np.isfinite(h)] = (110, 110, 110)
    return out


def v0v1_sheet(T0, T1, window, title, width=500, rings=None):
    """the same place twice: the trees estimated from the image alone (v0) | with the object-height model (v1)"""
    from PIL import Image, ImageDraw
    rgb, _ = window_images(window)
    sc = width / rgb.shape[1]
    a = draw(rgb, window, T0, (), scale=sc)
    b = draw(rgb, window, T1, (), scale=sc, mode='mess', rings=rings)
    m0, m1 = _inside(T0, window), _inside(T1, window)
    nz = sum(1 for E, N, r in (rings if rings is not None else ()) if window[0] <= E < window[2] and window[1] <= N < window[3])
    meas = (T1['flags'][m1] & baeume.F_H) > 0
    q = lambda v: (f'{np.median(v):.1f}' if len(v) else '–')
    lines = [f'{title} – UTM32 E {window[0]:.0f}–{window[2]:.0f}, N {window[1]:.0f}–{window[3]:.0f}',
             f'links v0 (nur Luftbild): {int(m0.sum())} Bäume, Höhe geschätzt (Median {q(T0["h"][m0])} m), Kronenradius Median {q(T0["r"][m0])} m – gelb Laub, blau Nadel, orange Strauch',
             f'rechts v1 (mit Höhenmodell): {int(m1.sum())} Bäume, {int(meas.sum())} mit gemessener Höhe (hellblau, Median {q(T1["h"][m1][meas])} m), {int((~meas).sum())} geschätzt (orange)',
             f'magenta Ring: breite Krone ohne einen Laser-Treffer ({nz}) – gefällt nach dem Bildflug, seither gewachsen oder hohes Gras; bleibt im Produkt',
             'Luftbild © GDI-Th, CC BY 4.0, 15.05.2024 · nDOM1 © GDI-Th, über easygeodata.de · Bäume: suhl-gruen · OSM © OpenStreetMap-Mitwirkende']
    out = Image.new('RGB', (2 * width + 4, a.height + 17 * len(lines) + 6), (20, 20, 20))
    out.paste(a, (0, 0))
    out.paste(b, (width + 4, 0))
    d = ImageDraw.Draw(out)
    for i, t in enumerate(lines):
        d.text((5, a.height + 3 + 17 * i), t, fill=(235, 235, 235), font=_font())
    res = {'ort': title, 'fenster_utm': [round(v) for v in window], 'breite_kronen_ohne_laser_treffer': nz, 'v0_baeume': int(m0.sum()), 'v1_baeume': int(m1.sum()), 'v1_hoehe_gemessen': int(meas.sum()),
           'v0_hoehe_median_m': float(np.median(T0['h'][m0])) if m0.any() else None,
           'v1_hoehe_median_gemessen_m': float(np.median(T1['h'][m1][meas])) if meas.any() else None}
    return out, res


def hoehen_sheet(T, nd, window, title, width=500, rings=None):
    """orthophoto with the crowns | the object-height model in colours with the same crowns – to look whether tops and crowns fit"""
    from PIL import Image, ImageDraw
    rgb, _ = window_images(window)
    sc = width / rgb.shape[1]
    a = draw(rgb, window, T, (), scale=sc, mode='mess', rings=rings)
    chm = nd.window(window)
    # draw() takes an image on the 20 cm grid: bring the colours of the 1 m model to that grid first
    k5 = int(round(1.0 / gbild.PX))
    hc = np.repeat(np.repeat(height_colours(chm), k5, 0), k5, 1)[:rgb.shape[0], :rgb.shape[1]]
    b = draw(hc, window, T, (), scale=sc, mode='mess', rings=rings)
    m = _inside(T, window)
    meas = (T['flags'][m] & baeume.F_H) > 0
    lines = [f'{title} – UTM32 E {window[0]:.0f}–{window[2]:.0f}, N {window[1]:.0f}–{window[3]:.0f}: links Luftbild, rechts Höhenmodell nDOM1 (1 m, Laser ohne Laub)',
             f'{int(m.sum())} Bäume: {int(meas.sum())} mit gemessener Höhe (hellblau), {int((~meas).sum())} geschätzt (orange); magenta Ring = breite Krone ohne Laser-Treffer',
             'Farben rechts: 0 m dunkelblau, 5 m grün, 15 m gelb, 30 m rot, grau = keine Daten',
             'Luftbild © GDI-Th, CC BY 4.0, 15.05.2024 · nDOM1 © GDI-Th, über easygeodata.de · Bäume: suhl-gruen']
    out = Image.new('RGB', (2 * width + 4, a.height + 17 * len(lines) + 6), (20, 20, 20))
    out.paste(a, (0, 0))
    out.paste(b, (width + 4, 0))
    d = ImageDraw.Draw(out)
    for i, t in enumerate(lines):
        d.text((5, a.height + 3 + 17 * i), t, fill=(235, 235, 235), font=_font())
    return out


WALD_COL = {0: (90, 90, 90), 1: (120, 220, 90), 2: (10, 90, 40), 3: (120, 150, 40), 5: (250, 230, 80), 6: (170, 110, 70)}


def wald_sheet(bx, by, U, width=510, nd=None):
    """forest stands of one image block (4 km): infrared orthophoto at 1 m | classes of the 20 m cells"""
    from PIL import Image, ImageDraw, ImageFont
    import wald
    C = wald.cells_of_block(bx, by, U, nd)
    img, (e0, n0) = wald.block_image(bx, by)
    A = C['art']
    rgb = np.zeros(A.shape + (3,), np.uint8)
    for k, c in WALD_COL.items():
        rgb[A == k] = c
    rgb[C['geraeumt']] = (230, 60, 60)          # forest in the laser data, none in the image of 2024
    a = Image.fromarray(img).resize((width, width), Image.LANCZOS)
    b = Image.fromarray(rgb).resize((width, width), Image.NEAREST)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    except OSError:
        font = ImageFont.load_default()
    u, c = np.unique(A, return_counts=True)
    ha = {int(k): v * 0.04 for k, v in zip(u, c)}
    lines = [f'Waldbestände, Bildblock {bx}/{by}: UTM32 E {e0:.0f}–{e0 + 4000:.0f}, N {n0:.0f}–{n0 + 4000:.0f} (4 km) – links Infrarot-Luftbild 1 m, rechts Zellen 20 m',
             'hellgrün Laubwald %.0f ha · dunkelgrün Nadelwald %.0f ha · oliv Mischwald %.0f ha · gelb Jungbestand/Schlagflur %.0f ha · braun Blöße %.0f ha · grau kein kartierter Wald'
             % tuple(ha.get(k, 0) for k in (1, 2, 3, 5, 6)),
             ('rot: seit dem Laserflug geräumt %.0f ha · ' % (float(C['geraeumt'].sum()) * 0.04) if nd else '') +
             'Luftbild © GDI-Th (TLBG), CC BY 4.0, Bildflug 15.05.2024 · Waldflächen © OpenStreetMap-Mitwirkende · Klassen: suhl-gruen'
             + (' · Höhenmodell nDOM1 © GDI-Th, über easygeodata.de' if nd else ' (Schätzung)')]
    out = Image.new('RGB', (2 * width + 4, width + 17 * len(lines) + 6), (20, 20, 20))
    out.paste(a, (0, 0))
    out.paste(b, (width + 4, 0))
    d = ImageDraw.Draw(out)
    for i, t in enumerate(lines):
        d.text((5, width + 3 + 17 * i), t, fill=(235, 235, 235), font=font)
    return out


def fenster():
    """the windows of the sheets v0 against v1 and orthophoto against height model: the three places of the comparison and the
    box the lead can judge (Steinweg / Markt and the park at the Herrenteich, E 619 500–619 900, N 5 607 500–5 607 900) in
    quarters of 200 m, plus that box as a whole -> [(name for the file, title, window)]"""
    out = []
    for tx, ty, (x0, y0, x1, y1), title in ORTE:
        e0, n0, _, _ = glib.wlib.tbounds(glib.L, tx, ty)
        out.append((f'{tx}_{ty}', title, (e0 + x0, n0 + y0, e0 + x1, n0 + y1)))
    E, N = 619500.0, 5607500.0
    out += [('herrenteich', 'Park am Herrenteich (Nordwest-Viertel des Fensters Steinweg/Markt)', (E, N + 200, E + 200, N + 400)),
            ('markt_steinweg', 'Markt (Südteil) und Steinweg Nord (Nordost-Viertel)', (E + 200, N + 200, E + 400, N + 400)),
            ('suedwest', 'südlich des Herrenteichs (Südwest-Viertel)', (E, N, E + 200, N + 200)),
            ('steinweg_sued', 'Steinweg Süd (Südost-Viertel)', (E + 200, N, E + 400, N + 200)),
            ('steinweg_markt_400', 'Steinweg, Markt, Herrenteich – das ganze Fenster (400 m)', (E, N, E + 400, N + 400))]
    return out


ORTE = [   # the three places of the comparison (plan 5.2): tile, window offsets from the tile's south-west corner (m), title
    (497, 542, (180, 200, 380, 400), 'Zentrum (Markt)'),
    (495, 541, (130, 90, 330, 290), 'Plattenbau-Gebiet (Aue, Friedrich-König-Straße)'),
    (496, 543, (150, 0, 350, 200), 'Waldrand (Domberg, Nordrand des Zentrums)'),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--b', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--tiles', default='')
    ap.add_argument('--zoom', action='store_true', help='also four quarter sheets per tile at 20 cm')
    ap.add_argument('--kontext', default=os.path.join(glib.RAW, 'kontext.pkl'))
    ap.add_argument('--vergleich', action='store_true', help='the three comparison sheets model against orthophoto')
    ap.add_argument('--wald', default='', help='forest stand sheets for image blocks, e.g. 49_54,51_55')
    ap.add_argument('--v0v1', default='', help='folder of the older tree product: sheets old against --b for the three places')
    ap.add_argument('--hoehen', default='', help='folder with nDOM1 tiles: sheets orthophoto against height model for the three places')
    ap.add_argument('--zweifel', default='', help='zweifel.json of the run: wide crowns without a laser return, drawn as magenta rings')
    a = ap.parse_args()
    import kontext
    U = baeume.Umfeld(kontext.load(a.kontext))
    os.makedirs(a.out, exist_ok=True)
    tiles = [tuple(int(v) for v in t.split('_')) for t in a.tiles.split(',') if t]
    if not tiles:
        import json
        tiles = [tuple(int(v) for v in k.split('_')) for k in json.load(open(os.path.join(a.b, 'index.json')))['kacheln']]
    if a.wald:
        nd = None
        if a.hoehen:
            import ndom
            nd = ndom.Ndom(a.hoehen) or None
        for blk in a.wald.split(','):
            bx, by = (int(v) for v in blk.split('_'))
            wald_sheet(bx, by, U, nd=nd).save(os.path.join(a.out, f'wald_{bx}_{by}.jpg'), quality=82)
        return
    if a.v0v1 or a.hoehen:
        res = []
        nd = None
        if a.hoehen:
            import ndom
            nd = ndom.Ndom(a.hoehen)
        rings = None
        if a.zweifel and os.path.exists(a.zweifel):
            rings = json.load(open(a.zweifel, encoding='utf-8')).get('baeume', [])
        for name, title, w in fenster():
            T1 = window_trees(a.b, w)
            if not len(T1['E']):
                continue
            if a.v0v1:
                im, r = v0v1_sheet(window_trees(a.v0v1, w), T1, w, title, rings=rings)
                im.save(os.path.join(a.out, f'v0v1_{name}.jpg'), quality=85)
                res.append(r)
            if nd:
                hoehen_sheet(T1, nd, w, title, rings=rings).save(os.path.join(a.out, f'hoehen_{name}.jpg'), quality=85)
                if w[2] - w[0] <= 200:
                    wz = (w[0] + 50, w[1] + 50, w[2] - 50, w[3] - 50)    # the middle 100 m at 20 cm: do tops and crowns sit on each other?
                    hoehen_sheet(T1, nd, wz, title + ', Mitte', rings=rings).save(os.path.join(a.out, f'hoehen_{name}_mitte.jpg'), quality=88)
        if res:
            glib.write_json(os.path.join(a.out, 'v0v1.json'), res, indent=1)
            print(json.dumps(res, ensure_ascii=False, indent=1))
        return
    if a.vergleich:
        res = []
        for tx, ty, (x0, y0, x1, y1), title in ORTE:
            p = os.path.join(a.b, str(glib.L), str(tx), f'{ty}.bin')
            if not os.path.exists(p):
                continue
            T = baeume.unpack(open(p, 'rb').read(), tx, ty)
            e0, n0, _, _ = glib.wlib.tbounds(glib.L, tx, ty)
            im, r = vergleich_sheet(tx, ty, T, U, (e0 + x0, n0 + y0, e0 + x1, n0 + y1), title)
            im.save(os.path.join(a.out, f'vergleich_{tx}_{ty}.jpg'), quality=85)
            res.append(r)
        glib.write_json(os.path.join(a.out, 'vergleich.json'), res, indent=1)
        print(json.dumps(res, ensure_ascii=False, indent=1))
        return
    for tx, ty in tiles:
        p = os.path.join(a.b, str(glib.L), str(tx), f'{ty}.bin')
        T = baeume.unpack(open(p, 'rb').read(), tx, ty) if os.path.exists(p) else {k: np.zeros(0) for k in ('E', 'N', 'r', 'kind', 'flags')}
        tile_sheet(tx, ty, T, U).save(os.path.join(a.out, f'b_{tx}_{ty}.jpg'), quality=82)
        if a.zoom:
            e0, n0, e1, n1 = glib.wlib.tbounds(glib.L, tx, ty)
            T = {k: v for k, v in T.items()}
            for qi, (qe, qn) in enumerate(((e0, n0 + 200), (e0 + 200, n0 + 200), (e0, n0), (e0 + 200, n0))):
                for layer in ('th_dop', 'th_dop20cir'):
                    tile_sheet(tx, ty, T, U, layer=layer, window=(qe, qn, qe + 200, qn + 200), width=1000).save(
                        os.path.join(a.out, f'b_{tx}_{ty}_q{qi}_{"rgb" if layer == "th_dop" else "cir"}.jpg'), quality=82)
        glib.log('sheet', tx, ty, len(T['E']))


if __name__ == '__main__':
    main()
