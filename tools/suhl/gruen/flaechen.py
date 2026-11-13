#!/usr/bin/env python3
"""suhl-gruen: green areas – product gr. The mapped areas of OpenStreetMap that carry a surface for the ground (lawn, meadow, park,
garden, allotments, cemetery, pitch, playground, field, orchard, scrub, forest floor, heath, wetland), cut to level-10 tiles.

File gr/10/{x}/{y}.json: {"f": [[klasse, osm, [ring, ring, ...]], ...]} – ring = [x0, y0, x1, y1, ...] in decimetres from the tile's
south-west corner (ETRS89 / UTM 32N), first ring the outline, further rings holes. Classes: klassen.KLASSEN; surface per class:
klassen.BELAG (pitches: "s" in the index of surfaces by OSM id where a surface is tagged). Later polygons lie on top of earlier ones.

  python3 -I tools/suhl/gruen/flaechen.py --gebiet zentrum --out OUT/suhl/gr/v0
"""
import argparse, json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib, kontext, klassen


GM_KLASSEN = {0: 'kein Grün (versiegelt, Dach, Wasser, kahler Boden)', 1: 'niedriges Grün (Rasen, Wiese, Beete)', 2: 'Gehölz (Kronendach)'}


def masks(work, tiles, out):
    """the green masks the tree search left in its work folder (2 m cells from the infrared image) -> gr/10/{x}/{y}.png, 8-bit grey
    with the class numbers 0, 1, 2 as pixel values, 200 x 200, row 0 = NORTH edge. -> (tiles written, hectares per class)"""
    from PIL import Image
    n, ha = 0, {1: 0.0, 2: 0.0}
    for tx, ty in tiles:
        p = os.path.join(work, 't', f'{tx}_{ty}.npz')
        if not os.path.exists(p):
            continue
        z = np.load(p)
        if 'gm' not in z.files:
            continue
        gm = z['gm']
        q = os.path.join(out, str(glib.L), str(tx), f'{ty}.png')
        os.makedirs(os.path.dirname(q), exist_ok=True)
        Image.fromarray(gm, 'L').save(q, optimize=True)
        cell = (400.0 / gm.shape[0]) ** 2 / 1e4
        for k in ha:
            ha[k] += float((gm == k).sum()) * cell
        n += 1
    return n, ha


def build(K, gebiet, rows, out, work=None, mask_tiles=()):
    from shapely.geometry import Polygon, box
    from shapely import STRtree
    F = klassen.Flaechen(K)
    polys, meta = [], []
    for k, r, i, t in F.items:
        if k not in klassen.GREEN:
            continue
        try:
            p = Polygon(r[0], [h for h in r[1:] if len(h) >= 4])
            if not p.is_valid:
                p = p.buffer(0)
        except Exception:
            continue
        if p.is_empty or p.area < 4.0:
            continue
        polys.append(p)
        meta.append((k, i, t))
    order = sorted(range(len(polys)), key=lambda j: F.rank.get(meta[j][0], 0))
    tree = STRtree(polys) if polys else None
    geom = glib.area_utm(gebiet)
    os.makedirs(out, exist_ok=True)
    rank = {j: n for n, j in enumerate(order)}
    tiles, area, n_poly, belag = {}, {}, 0, {}
    for r in rows:
        tx, ty = r['t']
        e0, n0, e1, n1 = glib.wlib.tbounds(glib.L, tx, ty)
        bx = box(e0, n0, e1, n1)
        feats = []
        for j in sorted((int(v) for v in tree.query(bx)), key=lambda v: rank[v]) if tree is not None else []:
            g = polys[j].intersection(bx)
            if g.is_empty:
                continue
            k, i, t = meta[j]
            for part in (g.geoms if g.geom_type in ('MultiPolygon', 'GeometryCollection') else [g]):
                if part.geom_type != 'Polygon' or part.area < 2.0:
                    continue
                part = part.simplify(0.15)
                rings = [[int(round((c - o) * 10)) for x, y in ring.coords for c, o in ((x, e0), (y, n0))]
                         for ring in [part.exterior] + list(part.interiors)]
                feats.append([k, i, rings])
                area[k] = area.get(k, 0.0) + part.intersection(geom).area / 1e4
            if k == 9 and t.get('surface'):
                belag[i] = t['surface']
            elif k == 9 and t.get('sport'):
                belag.setdefault(i, 'sport:' + t['sport'])
        if not feats:
            continue
        p = os.path.join(out, str(glib.L), str(tx), f'{ty}.json')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            json.dump({'f': feats}, f, separators=(',', ':'))
        tiles[f'{tx}_{ty}'] = len(feats)
        n_poly += len(feats)
    n_gm, ha_gm = masks(work, mask_tiles, out) if work else (0, {})
    idx = {
        'produkt': 'gr', 'name': 'Grünflächen (kartierte Flächen mit Belag)', 'schema': 1, 'made': glib.now(), 'level': glib.L, 'kachel_m': 400.0,
        'pfad': '{level}/{x}/{y}.json',
        'format': {'f': '[klasse, osm-kennung, ringe]', 'ring': '[x0, y0, x1, y1, …] in Dezimetern ab der Südwest-Ecke der Kachel (UTM 32N); erster Ring Umriss, weitere Löcher',
                   'reihenfolge': 'spätere Flächen liegen über früheren (klein und speziell zuletzt)'},
        'klassen': {str(k): klassen.KLASSEN[k] for k in klassen.GREEN}, 'belag': {str(k): v for k, v in klassen.BELAG.items()},
        'belag_sportplaetze_osm': belag,
        'kacheln': tiles, 'flaechen': n_poly, 'flaeche_ha_im_gebiet': {klassen.KLASSEN[k]: round(v, 1) for k, v in sorted(area.items())},
        'gruenmaske': {'pfad': '{level}/{x}/{y}.png', 'kacheln': n_gm, 'zelle_m': 2.0, 'klassen': {str(k): v for k, v in GM_KLASSEN.items()},
                       'format': 'PNG, 8 Bit Grau, 200 x 200, Pixelwert = Klasse, Zeile 0 = Nordrand; gemessen im Infrarot-Luftbild (und im Höhenmodell, wo vorhanden)',
                       'flaeche_ha': {GM_KLASSEN[k]: round(v, 1) for k, v in ha_gm.items()},
                       'hinweis': 'nur für die Kacheln mit Einzelbäumen (Luftbild 20 cm); zeigt auch das Grün, das in OSM nicht kartiert ist'},
        'hinweis': 'Nur was in OpenStreetMap als Fläche kartiert ist. Rasen zwischen Wohnblöcken ist oft nicht kartiert – dafür zeigt das Luftbild selbst das Grün.',
        'attribution': '© OpenStreetMap-Mitwirkende, ODbL 1.0',
    }
    glib.write_json(os.path.join(out, 'index.json'), idx, indent=1)
    return {'kacheln': len(tiles), 'flaechen': n_poly, 'flaeche_ha_im_gebiet': idx['flaeche_ha_im_gebiet'],
            'gruenmaske_kacheln': n_gm, 'gruenmaske_flaeche_ha': idx['gruenmaske']['flaeche_ha']}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gebiet', default='zentrum')
    ap.add_argument('--out', required=True)
    ap.add_argument('--kontext', default=os.path.join(glib.RAW, 'kontext.pkl'))
    a = ap.parse_args()
    import stadt
    K = kontext.load(a.kontext)
    print(json.dumps(build(K, a.gebiet, stadt.tile_table(K, a.gebiet), a.out), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
