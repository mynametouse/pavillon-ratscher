#!/usr/bin/env python3
"""suhl-gruen: fetch the orthophoto (RGB th_dop and colour infrared th_dop20cir, 20 cm) for level-10 tiles into the raw cache, one
request at a time with a pause (the Thuringian WMS, © GDI-Th, CC BY 4.0). A second start continues where the first stopped.

  python3 -I tools/suhl/gruen/gbild.py --gebiet zentrum            # the sample tiles
  python3 -I tools/suhl/gruen/gbild.py --tiles 497_542,496_542
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib

MARGIN = 12.0   # metres around a tile: a crown on the edge is seen whole by both neighbours
PX = 0.2


def tile_box(tx, ty, margin=MARGIN):
    e0, n0, e1, n1 = glib.wlib.tbounds(glib.L, tx, ty)
    return (e0 - margin, n0 - margin, e1 + margin, n1 + margin)


def fetch(tx, ty):
    bb = tile_box(tx, ty)
    return glib.wms_image('th_dop', bb, PX), glib.wms_image('th_dop20cir', bb, PX)


def prefetch(tiles, workers=2):
    """fetch the images of many tiles into the cache, at most `workers` requests at a time; -> number of tiles that failed"""
    from concurrent.futures import ThreadPoolExecutor
    bad = []

    def one(t):
        try:
            bb = tile_box(*t)
            for layer in ('th_dop', 'th_dop20cir'):
                e0, n0, e1, n1 = bb
                p = os.path.join(glib.RAW, 'dop', f'{layer}_{int(round(PX * 100))}cm_{e0:.0f}_{n0:.0f}_{e1:.0f}_{n1:.0f}.jpg')
                if not (os.path.exists(p) and os.path.getsize(p) > 2000):
                    glib.wms_image(layer, bb, PX)
        except Exception as ex:
            bad.append((t, repr(ex)[:200]))
    with ThreadPoolExecutor(workers) as ex:
        for k, _ in enumerate(ex.map(one, tiles)):
            if (k + 1) % 25 == 0:
                glib.log(f'images: {k + 1}/{len(tiles)} tiles')
    for t, e in bad:
        glib.log('image failed', t, e)
    return len(bad)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gebiet', default='zentrum')
    ap.add_argument('--tiles', default='')
    a = ap.parse_args()
    tiles = [tuple(int(v) for v in t.split('_')) for t in a.tiles.split(',') if t] or glib.tiles_of(glib.area_utm(a.gebiet))
    for k, (tx, ty) in enumerate(tiles):
        rgb, cir = fetch(tx, ty)
        glib.log(f'{k + 1}/{len(tiles)} tile {tx}_{ty} {rgb.shape} {cir.shape}')


if __name__ == '__main__':
    main()
