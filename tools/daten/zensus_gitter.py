#!/usr/bin/env python3
"""Zensus 2022 100-m grid (Destatis; © Statistische Ämter des Bundes und der Länder, 2024, Vervielfältigung und Verbreitung mit Quellenangabe gestattet): cut the cells that cover our places out of the national CSVs.

  python3 -I tools/daten/zensus_gitter.py CACHE_DIR OUT_DIR [product ...]

Each product is a ZIP at https://www.destatis.de/static/DE/zensus/gitterdaten/<name>.zip holding Zensus2022_<..>_100m-Gitter.csv
(semicolon separated, cell id CRS3035RES100mN<y>E<x>, cell mid point x_mp_100m / y_mp_100m in EPSG:3035). Cells with fewer than 3
persons/units are hidden by the statistics office (empty or -1) – sums are therefore lower bounds. Writes OUT_DIR/zensus_<area>.json:
{ product: { "columns": [...], "cells": [[...], ...] } } and prints the sums. Places: bounding boxes in WGS84 (S, W, N, E) of the
built-up area (same boxes as tools/welt-dinge/osm_parkplaetze.py, village + about 100 m)."""
import csv, io, json, os, sys, urllib.request, zipfile
from pyproj import Transformer

BASE = 'https://www.destatis.de/static/DE/zensus/gitterdaten/'
AREAS = {
    'ratscher': (50.49482, 10.76539, 50.49993, 10.77694),
    'schleusingen': (50.49684, 10.72576, 50.52261, 10.77567),
    'vessra': (50.48815, 10.63301, 50.49882, 10.65245),
}
PRODUCTS = ['Zensus2022_Bevoelkerungszahl', 'Durchschnittliche_Haushaltsgroesse_in_Gitterzellen', 'Zensus2022_Groesse_des_privaten_Haushalts_in_Gitterzellen',
            'Durchschnittsalter_in_Gitterzellen', 'Alter_in_10er-Jahresgruppen', 'Zensus2022_Heizungsart', 'Gebaeude_nach_Baujahr_Jahrzehnte',
            'Gebaeude_mit_Wohnraum_nach_Gebaeudetyp_Groesse', 'Eigentuemerquote_in_Gitterzellen', 'Leerstandsquote_in_Gitterzellen',
            'Zensus2022_Staatsangehoerigkeit_in_Gitterzellen']
TR = Transformer.from_crs('EPSG:4326', 'EPSG:3035', always_xy=True)


def boxes():
    out = {}
    for k, (s, w, n, e) in AREAS.items():
        xs, ys = zip(*[TR.transform(lo, la) for la in (s, n) for lo in (w, e)])
        out[k] = (min(xs), min(ys), max(xs), max(ys))
    return out


def get(name, cache):
    fn = os.path.join(cache, name + '.zip')
    if not os.path.exists(fn):
        req = urllib.request.Request(BASE + name + '.zip', headers={'User-Agent': 'pavillon-ratscher daten-katalog'})
        with urllib.request.urlopen(req, timeout=300) as r, open(fn, 'wb') as f:
            while True:
                b = r.read(1 << 20)
                if not b: break
                f.write(b)
    return fn


def cut(fn, bx):
    res = {k: {'columns': None, 'cells': []} for k in bx}
    with zipfile.ZipFile(fn) as z:
        names = [n for n in z.namelist() if n.lower().endswith('.csv') and '100m' in n]
        if not names: return None
        enc = 'utf-8-sig'
        with z.open(names[0]) as probe:
            try: probe.read(1 << 22).decode('utf-8')
            except UnicodeDecodeError: enc = 'cp1252'
        with z.open(names[0]) as raw:
            rd = csv.reader(io.TextIOWrapper(raw, encoding=enc), delimiter=';')
            head = next(rd)
            ix, iy = head.index('x_mp_100m'), head.index('y_mp_100m')
            for k in bx: res[k]['columns'] = head
            for row in rd:
                try: x, y = float(row[ix]), float(row[iy])
                except ValueError: continue
                for k, (x0, y0, x1, y1) in bx.items():
                    if x0 <= x <= x1 and y0 <= y <= y1: res[k]['cells'].append(row)
    return res


def main():
    cache, out = sys.argv[1], sys.argv[2]
    prods = sys.argv[3:] or PRODUCTS
    os.makedirs(cache, exist_ok=True); os.makedirs(out, exist_ok=True)
    bx = boxes(); all_ = {}
    for k in bx:
        fn = os.path.join(out, f'zensus_{k}.json')
        all_[k] = json.load(open(fn)) if os.path.exists(fn) else {}  # several runs add products to the same files
    for p in prods:
        try:
            r = cut(get(p, cache), bx)
        except Exception as e:
            print('FAIL', p, e); continue
        if r is None: print('no 100m csv in', p); continue
        for k in bx: all_[k][p] = r[k]
        print(p, {k: len(r[k]['cells']) for k in bx})
    for k in bx:
        json.dump(all_[k], open(os.path.join(out, f'zensus_{k}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__': main()
