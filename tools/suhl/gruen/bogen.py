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

COL = {'laub': (255, 235, 60), 'nadel': (60, 220, 255), 'strauch': (255, 150, 40), 'osm': (255, 60, 255)}
CREDIT = 'Luftbild © GDI-Th (TLBG), CC BY 4.0, Bildflug 15.05.2024 · Bäume: suhl-gruen (Schätzung aus dem Infrarot-Luftbild), OSM-Bäume © OpenStreetMap-Mitwirkende'


def colour(kind):
    return COL['strauch'] if kind == 30 else COL['nadel'] if kind in baeume.CONIFER else COL['laub']


def draw(img, bb, T, osm=(), scale=1.0, label=''):
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
        c = colour(int(k))
        rr = r * s
        d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=c, width=1 if scale < 0.8 else 2)
        q = 1.5 if scale < 0.8 else 2.5
        d.ellipse([x - q, y - q, x + q, y + q], fill=(255, 255, 255) if (int(f) & 3) == baeume.POS_OSM else c)
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
        lines = [label, 'gelb Laubbaum · blau Nadelbaum · orange Strauch/sehr klein · weißer Punkt = Lage aus OSM · magenta Kreuz = OSM-Baum', CREDIT]
        hh = 17 * len(lines) + 6
        out = Image.new('RGB', (im.width, im.height + hh), (20, 20, 20))
        out.paste(im, (0, 0))
        dd = ImageDraw.Draw(out)
        for i, t in enumerate(lines):
            dd.text((5, im.height + 3 + 17 * i), t, fill=(235, 235, 235), font=font)
        im = out
    return im


def tile_sheet(tx, ty, T, U=None, layer='th_dop', window=None, width=1024, label=None):
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
    return draw(img, bb, T, osm, scale=width / img.shape[1], label=lab)


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


WALD_COL = {0: (90, 90, 90), 1: (120, 220, 90), 2: (10, 90, 40), 3: (120, 150, 40), 5: (250, 230, 80), 6: (170, 110, 70)}


def wald_sheet(bx, by, U, width=510):
    """forest stands of one image block (4 km): infrared orthophoto at 1 m | classes of the 20 m cells"""
    from PIL import Image, ImageDraw, ImageFont
    import wald
    C = wald.cells_of_block(bx, by, U)
    img, (e0, n0) = wald.block_image(bx, by)
    A = C['art']
    rgb = np.zeros(A.shape + (3,), np.uint8)
    for k, c in WALD_COL.items():
        rgb[A == k] = c
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
             'Luftbild © GDI-Th (TLBG), CC BY 4.0, Bildflug 15.05.2024 · Waldflächen © OpenStreetMap-Mitwirkende · Klassen: suhl-gruen (Schätzung)']
    out = Image.new('RGB', (2 * width + 4, width + 17 * len(lines) + 6), (20, 20, 20))
    out.paste(a, (0, 0))
    out.paste(b, (width + 4, 0))
    d = ImageDraw.Draw(out)
    for i, t in enumerate(lines):
        d.text((5, width + 3 + 17 * i), t, fill=(235, 235, 235), font=font)
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
    a = ap.parse_args()
    import kontext
    U = baeume.Umfeld(kontext.load(a.kontext))
    os.makedirs(a.out, exist_ok=True)
    tiles = [tuple(int(v) for v in t.split('_')) for t in a.tiles.split(',') if t]
    if not tiles:
        import json
        tiles = [tuple(int(v) for v in k.split('_')) for k in json.load(open(os.path.join(a.b, 'index.json')))['kacheln']]
    if a.wald:
        for blk in a.wald.split(','):
            bx, by = (int(v) for v in blk.split('_'))
            wald_sheet(bx, by, U).save(os.path.join(a.out, f'wald_{bx}_{by}.jpg'), quality=82)
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
