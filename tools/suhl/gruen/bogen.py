#!/usr/bin/env python3
"""suhl-gruen: picture sheets to look at – the orthophoto with the found trees drawn on it (crown circle by kind, a dot at the trunk,
mapped OSM trees as crosses). Sheets are at most 1024 px wide, carry tile, place, flight date and attribution, and go ONLY to the scratch
branch ref/suhl-gruen (the orthophoto is © GDI-Th, CC BY 4.0), never to the work branch.

  python3 -I tools/suhl/gruen/bogen.py --b tools/suhl/out/gruen/probe/suhl/b/v0 --out /tmp/suhl-gruen/bogen --tiles 497_542 [--zoom]
"""
import argparse, os, sys
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--b', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--tiles', default='')
    ap.add_argument('--zoom', action='store_true', help='also four quarter sheets per tile at 20 cm')
    a = ap.parse_args()
    import kontext
    U = baeume.Umfeld(kontext.load())
    os.makedirs(a.out, exist_ok=True)
    tiles = [tuple(int(v) for v in t.split('_')) for t in a.tiles.split(',') if t]
    if not tiles:
        import json
        tiles = [tuple(int(v) for v in k.split('_')) for k in json.load(open(os.path.join(a.b, 'index.json')))['kacheln']]
    for tx, ty in tiles:
        p = os.path.join(a.b, str(glib.L), str(tx), f'{ty}.bin')
        T = baeume.unpack(open(p, 'rb').read(), tx, ty) if os.path.exists(p) else {k: np.zeros(0) for k in ('E', 'N', 'r', 'kind', 'flags')}
        tile_sheet(tx, ty, T, U).save(os.path.join(a.out, f'b_{tx}_{ty}.jpg'), quality=82)
        if a.zoom:
            e0, n0, e1, n1 = glib.wlib.tbounds(glib.L, tx, ty)
            for qi, (qe, qn) in enumerate(((e0, n0 + 200), (e0 + 200, n0 + 200), (e0, n0), (e0 + 200, n0))):
                for layer in ('th_dop', 'th_dop20cir'):
                    tile_sheet(tx, ty, T, U, layer=layer, window=(qe, qn, qe + 200, qn + 200), width=1000).save(
                        os.path.join(a.out, f'b_{tx}_{ty}_q{qi}_{"rgb" if layer == "th_dop" else "cir"}.jpg'), quality=82)
        glib.log('sheet', tx, ty, len(T['E']))


if __name__ == '__main__':
    main()
