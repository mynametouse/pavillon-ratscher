"""suhl-boden: aerial image tiles (i/{L}/{x}/{y}.webp, 512 px, row 0 = north) for tile lists.

Source: the Thuringian orthophoto service (WMS TH DOP, layer th_dop, 20 cm, (c) GDI-Th, CC BY 4.0) through tools/welt/fetch.py
fetch_wms (cached in the raw directory, retries with backoff). Every level is asked for at its own resolution - the municipality is
no rectangle, so a coarser tile cannot be put together from finer ones without grey holes. One request covers the listed tiles of
one chunk (a tile CHUNK levels up: at most 8 x 8 tiles = 4096 px, the service allows 5000) and only their bounding box, so sparse
lists (corridors, the edge of the town) ask for little. Polite: two requests at a time at most, a pause after every download.
"""
import os, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blib
from blib import log, tbounds, wlib
import fetch as wfetch
import tiles as wtiles

LAYER = 'th_dop'
CHUNK = {12: 3, 11: 3, 10: 3, 9: 3, 8: 2, 7: 2, 6: 2}     # tile level -> how many levels up a request reaches (3: 8 x 8 tiles)
PX = wlib.TILE_PX


def path(out, L, x, y):
    return os.path.join(out, 'i', str(L), str(x), f'{y}.webp')


def requests_of(L, ts):
    """the tiles of a list grouped into requests: [(bbox, width, height, x0, y1, [tiles])] - bbox = the tiles' bounding box in their chunk"""
    k = CHUNK[L]
    by = {}
    for x, y in ts:
        by.setdefault((x >> k, y >> k), []).append((x, y))
    out = []
    for c in sorted(by):
        v = by[c]
        x0, x1 = min(t[0] for t in v), max(t[0] for t in v)
        y0, y1 = min(t[1] for t in v), max(t[1] for t in v)
        bb = tbounds(L, x0, y0)[:2] + tbounds(L, x1, y1)[2:]
        out.append((bb, (x1 - x0 + 1) * PX, (y1 - y0 + 1) * PX, x0, y1, sorted(v)))
    return out


def build_level(raw, out, L, ts, quality=74, pool=None, harm=None, threads=2, pause=0.6):
    """the image tiles of one level; tiles that are already there are kept (a second start goes on). Returns (n, bytes, requests made)."""
    reqs = [r for r in requests_of(L, ts) if not all(os.path.exists(path(out, L, x, y)) for x, y in r[5])]
    made = [0]

    def get(r):
        bb, w, h = r[:3]
        p = os.path.join(raw, 'dop', f'{LAYER}_{w}x{h}_{bb[0]:.0f}_{bb[1]:.0f}_{bb[2]:.0f}_{bb[3]:.0f}.jpg')
        if os.path.exists(p) and os.path.getsize(p) > 1000:
            return
        wfetch.fetch_wms(raw, LAYER, bb, w, h, decode=False)
        made[0] += 1
        time.sleep(pause)
    if reqs:
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max(1, threads)) as ex:
            list(ex.map(get, reqs))
    for bb, w, h, x0, y1, v in reqs:
        img = wfetch.fetch_wms(raw, LAYER, bb, w, h)
        if img.shape[0] != h or img.shape[1] != w:
            raise RuntimeError(f'WMS image {img.shape} instead of {h} x {w} for {bb}')
        blank = float(((img.min(axis=2) > 250) | (img.max(axis=2) < 5)).mean())
        if blank > 0.02:
            log(f'  Hinweis: Luftbild Stufe {L} {bb}: {100 * blank:.1f} % weiß/schwarz (ohne Daten?)')
        if harm is not None:
            img = harm.apply(img, bb)
        jobs = []
        for x, y in v:
            r0, c0 = (y1 - y) * PX, (x - x0) * PX
            jobs.append((np.ascontiguousarray(img[r0:r0 + PX, c0:c0 + PX]), path(out, L, x, y) + '.tmp', quality))
        sizes = list(pool.map(wtiles._save_webp, jobs, chunksize=8)) if pool else [wtiles._save_webp(j) for j in jobs]
        for j in jobs:
            os.replace(j[1], j[1][:-4])
    n = tot = 0
    for x, y in ts:
        n += 1
        tot += os.path.getsize(path(out, L, x, y))
    log(f'Luftbild Stufe {L}: {n} Kacheln, {tot / 1e6:.2f} MB ({len(reqs)} Ausschnitte, {made[0]} neu vom Dienst geholt)')
    return n, tot, made[0]


def build(raw, out, T, quality=74, jobs=1, harm=None, threads=2):
    t0 = time.time()
    info, nreq = {}, 0
    pool = None
    if jobs > 1:
        import multiprocessing as mp
        pool = mp.get_context('fork').Pool(jobs)
    try:
        for L in sorted(T, reverse=True):
            n, tot, made = build_level(raw, out, L, T[L], quality, pool, harm, threads)
            info[L] = {'n': n, 'bytes': tot}
            nreq += made
    finally:
        if pool:
            pool.close()
            pool.join()
    return {'levels': info, 'requests': nreq, 'seconds': round(time.time() - t0, 1), 'quality': quality, 'layer': LAYER}
