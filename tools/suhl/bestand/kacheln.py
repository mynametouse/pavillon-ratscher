#!/usr/bin/env python3
"""suhl-bestand, deliverable 2: which tiles of the Thuringian state data (DGM1 and DOM1: 1 km; LoD2: 2 km, even numbers; ETRS89 / UTM 32N,
lower-left corner in km) cover Suhl -> tools/suhl/out/bestand/kacheln.csv, kacheln.json and the map pictures for Falko.

  P1 = zentrum + 300 m, P2 = kernstadt + 300 m, P3 = the rest of stadt, P4 = the two road corridors garden -> Suhl (motorway A 73/A 71
  and country road, routes of feat/suhl-fahrt, 600 m to both sides) outside P1-P3. A tile takes the best priority of what it touches
  (touching = more than 1 m2 in common).

  python3 -I tools/suhl/bestand/kacheln.py [--routes DIR] [--maps DIR] [--dop]
"""
import argparse, csv, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib

NAMES = {
    'DGM1': ('dgm1_32_{e}_{n}_1_th_2020-2025.zip', 'dgm1_32_{e}_{n}_1_th_2014-2019.zip', 1),
    'DOM1': ('dom1_32_{e}_{n}_1_th_2020-2025.zip', 'dom1_32_{e}_{n}_1_th_2014-2019.zip', 1),
    'LoD2': ('LoD2_32_{e}_{n}_2_TH.zip', '', 2),
}
COL = {1: '#d62728', 2: '#ff7f0e', 3: '#2ca02c', 4: '#7f52c7'}
PNAME = {1: 'P1 Zentrum + 300 m', 2: 'P2 Kernstadt + 300 m', 3: 'P3 übrige Stadt', 4: 'P4 Straßen Garten – Suhl'}
WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'


def model_xf():
    """model metres -> UTM (viz3/manifests.json geoman.xf, as tools/welt/wlib.py)"""
    xf = {'a': 1.0127906473420232, 'b': 0.07715765993901931, 'ex': 625469.0070213208, 'ey': 5595624.323524626}
    try:
        xf = dict(json.load(open(os.path.join(sblib.REPO, 'viz3', 'manifests.json')))['geoman']['xf'])
    except Exception:
        pass
    return xf


def load_routes(d):
    """the routes garden -> Suhl of feat/suhl-fahrt (dist/fahrt/suhl.json: pts = x, y in model decimetres) as UTM line strings"""
    from shapely.geometry import LineString
    xf = model_xf()
    out = {}
    p = os.path.join(d, 'suhl.json')
    if not os.path.exists(p):
        return out
    r = json.load(open(p))['routes']
    for k in ('suhl_ab', 'suhl_land'):
        pts = r[k]['pts']
        step = 2 if len(pts) % 2 == 0 and len(pts) % 3 != 0 else (3 if len(pts) % 3 == 0 else 2)
        xy = [(pts[i] / 10.0, pts[i + 1] / 10.0) for i in range(0, len(pts) - step + 1, step)]
        utm = [(xf['a'] * x - xf['b'] * y + xf['ex'], xf['b'] * x + xf['a'] * y + xf['ey']) for x, y in xy]
        out[k] = (LineString(utm), r[k].get('m'))
    return out


def grid(geom, s):
    """tiles of side s km whose square has more than 1 m2 in common with geom: {(e_km, n_km): common area m2}"""
    from shapely.geometry import box
    from shapely.prepared import prep
    b = geom.bounds
    pg = prep(geom)
    res = {}
    e0, n0 = int(math.floor(b[0] / 1000 / s) * s), int(math.floor(b[1] / 1000 / s) * s)
    e = e0
    while e * 1000 < b[2]:
        n = n0
        while n * 1000 < b[3]:
            q = box(e * 1000, n * 1000, (e + s) * 1000, (n + s) * 1000)
            if pg.intersects(q):
                a = geom.intersection(q).area
                if a > 1.0:
                    res[(e, n)] = a
            n += s
        e += s
    return res


def fetch_dop(bbox, w, h, name):
    """one GetMap of the state's orthophoto (th_dop, CC BY 4.0, (c) GDI-Th), cached; returns the path or None"""
    p = os.path.join(sblib.RAW, 'dop', f'{name}_{w}x{h}.jpg')
    if os.path.exists(p) and os.path.getsize(p) > 5000:
        return p
    url = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=th_dop&STYLES=&CRS=EPSG:25832'
           f'&BBOX={bbox[0]:.1f},{bbox[1]:.1f},{bbox[2]:.1f},{bbox[3]:.1f}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
    st, b, ct = sblib.http_get(url, timeout=240)
    if st == 200 and ct.startswith('image/'):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(b)
        return p
    sblib.log('WMS failed', st, ct, b[:200])
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--routes', default=os.path.join(sblib.RAW, 'fahrt'))
    ap.add_argument('--maps', default=None)
    ap.add_argument('--dop', action='store_true')
    ap.add_argument('--opl', default=None)
    a = ap.parse_args()
    from shapely.geometry import shape, box, Point, LineString
    from shapely.ops import unary_union

    fc = json.load(open(os.path.join(sblib.OUT, 'gebiete.geojson'), encoding='utf-8'))
    G = {f['properties']['id']: sblib.tf_geom(shape(f['geometry']), sblib.to_utm) for f in fc['features'] if f['properties']['art'] == 'gebiet'}
    stadt, kern, zen = G['stadt'], G['kernstadt'], G['zentrum']
    zen300, kern300 = zen.buffer(300, 16), kern.buffer(300, 16)
    routes = load_routes(a.routes)
    cor = {k: v[0].buffer(600, 16) for k, v in routes.items()}
    corr = unary_union(list(cor.values())) if cor else None
    sblib.log('routes:', {k: (round(v[0].length), v[1]) for k, v in routes.items()})

    o = sblib.load_osm(a.opl)
    bpts = [p.representative_point() for k, i, t, p in o.areas(lambda t: 'building' in t and t['building'] != 'no')]

    rows, summ = [], {}
    tiles = {}
    for prod, (fn, fn_old, s) in NAMES.items():
        if (s,) in tiles:
            T = tiles[(s,)]
        else:
            g1, g2, g3 = grid(zen300, s), grid(kern300, s), grid(stadt, s)
            gz, gk = grid(zen, s), grid(kern, s)
            gc = {k: grid(v, s) for k, v in cor.items()}
            T = {}
            for key in set(g1) | set(g2) | set(g3) | set().union(*[set(v) for v in gc.values()]) if gc else set(g1) | set(g2) | set(g3):
                if key in g1:
                    pr, why = 1, 'Zentrum + 300 m'
                elif key in g2:
                    pr, why = 2, 'Kernstadt + 300 m'
                elif key in g3:
                    pr, why = 3, 'Stadtgebiet'
                else:
                    pr = 4
                    why = ' und '.join(n for k, n in (('suhl_ab', 'Korridor Autobahn A 73/A 71'), ('suhl_land', 'Korridor Landstraße')) if key in gc.get(k, {}))
                q = box(key[0] * 1000, key[1] * 1000, (key[0] + s) * 1000, (key[1] + s) * 1000)
                nb = sum(1 for p in bpts if q.contains(p))
                T[key] = {'prio': pr, 'grund': why, 'anteil_stadt': g3.get(key, 0.0) / (s * s * 1e6), 'gebaeude_osm': nb,
                          'zentrum': gz.get(key, 0.0) / zen.area, 'kernstadt': gk.get(key, 0.0) / kern.area,
                          'korridor': [k for k in gc if key in gc[k]]}
            tiles[(s,)] = T
        for (e, n), t in T.items():
            rows.append({'produkt': prod, 'prio': 'P%d' % t['prio'], 'e_km': e, 'n_km': n, 'kachel_km': s,
                         'datei': fn.format(e=e, n=n), 'datei_aelter': fn_old.format(e=e, n=n) if fn_old else '',
                         'anteil_stadt_prozent': round(100 * t['anteil_stadt'], 1),
                         'zentrum_prozent': round(100 * t['zentrum'], 1) if t['zentrum'] else '',
                         'kernstadt_prozent': round(100 * t['kernstadt'], 1) if t['kernstadt'] else '',
                         'gebaeude_osm': t['gebaeude_osm'] if t['prio'] < 4 or t['gebaeude_osm'] else '',
                         'grund': t['grund']})
        cnt = {}
        for t in T.values():
            cnt['P%d' % t['prio']] = cnt.get('P%d' % t['prio'], 0) + 1
        nb_tiles = sum(1 for t in T.values() if t['prio'] <= 3 and t['gebaeude_osm'] > 0)
        zt = sorted(((round(100 * t['zentrum'], 1), k) for k, t in T.items() if t['zentrum'] > 0), reverse=True)
        summ[prod] = {'kachel_km': s, 'je_prioritaet': dict(sorted(cnt.items())), 'gesamt': len(T),
                      'zentrum_anteile_prozent': {f'{k[0]}_{k[1]}': v for v, k in zt},
                      'P1_bis_P3': sum(v for k, v in cnt.items() if k != 'P4'),
                      'P1_bis_P3_mit_osm_gebaeuden': nb_tiles,
                      'P3_ohne_osm_gebaeude': sum(1 for t in T.values() if t['prio'] == 3 and t['gebaeude_osm'] == 0)}
    rows.sort(key=lambda r: (list(NAMES).index(r['produkt']), r['prio'], -r['n_km'], r['e_km']))
    p = os.path.join(sblib.OUT, 'kacheln.csv')
    with open(p, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    T1, T2 = tiles[(1,)], tiles[(2,)]
    blockB = (620.7, 5590.8, 630.3, 5600.4)
    p4_in_b = sum(1 for (e, n), t in T1.items() if t['prio'] == 4 and e >= 620 and e + 1 <= 631 and n >= 5590 and n + 1 <= 5601)
    info = {'made': sblib.now(), 'regel': __doc__.split('\n\n')[1].strip(), 'produkte': summ,
            'p4_1km_kacheln_im_block_b_um_den_garten': p4_in_b,
            'routen_m': {k: round(v[0].length) for k, v in routes.items()},
            'bbox_stadt_km': sblib.bbox_km(stadt), 'quelle_gebiete': 'tools/suhl/out/bestand/gebiete.geojson',
            'quelle_routen': 'origin/feat/suhl-fahrt:viz3/extra/suhl-fahrt/dist/fahrt/suhl.json (26.10.2026, OpenStreetMap)',
            'dateinamen': {k: v[0] for k, v in NAMES.items()}, 'zeilen_csv': len(rows)}
    sblib.write_json(os.path.join(sblib.OUT, 'kacheln.json'), info, indent=1)
    sblib.log('written', p, len(rows), 'rows')
    sblib.log(json.dumps(summ, ensure_ascii=False))
    sblib.log('P4 1-km tiles inside block B:', p4_in_b)
    if a.maps:
        maps(a, o, fc, G, zen300, kern300, routes, cor, T1, T2)


def maps(a, o, fc, G, zen300, kern300, routes, cor, T1, T2):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import matplotlib.patheffects as pe
    from matplotlib.patches import Rectangle, Patch
    from matplotlib.lines import Line2D
    from shapely.geometry import box, LineString
    os.makedirs(a.maps, exist_ok=True)
    stadt, kern, zen = G['stadt'], G['kernstadt'], G['zentrum']
    roads = []
    for w, (nd, t) in o.ways.items():
        hw = t.get('highway')
        if hw in ('motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'motorway_link', 'residential', 'unclassified', 'living_street', 'pedestrian') or t.get('railway') == 'rail':
            c = o.line(w)
            if c:
                roads.append(('rail' if t.get('railway') == 'rail' else hw, c))
    blds = [p for k, i, t, p in o.areas(lambda t: 'building' in t and t['building'] != 'no')]
    places = [(f['properties']['name'], sblib.to_utm(*f['geometry']['coordinates'])) for f in fc['features'] if f['properties']['art'] == 'ortsteil']
    halo = [pe.withStroke(linewidth=2.5, foreground='white')]

    def draw(name, bb, title, s=1, px=1200, labels=True, dop=False, detail=False, show=(1, 2, 3, 4), fs=None):
        T = T1 if s == 1 else T2
        wkm, hkm = (bb[2] - bb[0]) / 1000, (bb[3] - bb[1]) / 1000
        dpi = 100
        fw = px / dpi
        fh = fw * hkm / wkm + 0.9
        fig = plt.figure(figsize=(fw, fh), dpi=dpi)
        ax = fig.add_axes([0.055, 0.5 / fh, 0.93, 1 - 0.9 / fh])
        q = box(*bb)
        if dop:
            pw = min(2400, int(px * 1.6))
            ph = int(pw * hkm / wkm)
            pth = fetch_dop(bb, pw, ph, name)
            if pth:
                from PIL import Image
                ax.imshow(Image.open(pth), extent=(bb[0], bb[2], bb[1], bb[3]), zorder=0)
        else:
            ax.set_facecolor('#f4f4ee')
            if detail:
                for p in blds:
                    if p.intersects(q):
                        for g in (p.geoms if p.geom_type == 'MultiPolygon' else [p]):
                            x, y = g.exterior.xy
                            ax.fill(x, y, color='#b9b9b9', lw=0, zorder=1)
        for hw, c in roads:
            if not detail and hw in ('residential', 'unclassified', 'living_street', 'pedestrian'):
                continue
            x, y = zip(*c)
            if max(x) < bb[0] or min(x) > bb[2] or max(y) < bb[1] or min(y) > bb[3]:
                continue
            st = {'motorway': ('#1f4e9c', 2.2), 'motorway_link': ('#1f4e9c', 1.0), 'trunk': ('#a04000', 1.8), 'primary': ('#a04000', 1.6),
                  'secondary': ('#b86a1c', 1.3), 'tertiary': ('#b89a5c', 1.0), 'rail': ('#222222', 0.9)}.get(hw, ('#9a9a9a', 0.5))
            ax.plot(x, y, color='#ffe680' if (dop and hw != 'rail' and st[1] < 1.5) else st[0], lw=st[1], zorder=2,
                    ls=(0, (4, 2)) if hw == 'rail' else '-')
        for k, (ln, m) in routes.items():
            x, y = ln.xy
            ax.plot(x, y, '-', color='#7f52c7', lw=2.0, zorder=3, alpha=0.9)
        for (e, n), t in T.items():
            if t['prio'] not in show:
                continue
            if (e + s) * 1000 <= bb[0] or e * 1000 >= bb[2] or (n + s) * 1000 <= bb[1] or n * 1000 >= bb[3]:
                continue
            ax.add_patch(Rectangle((e * 1000, n * 1000), s * 1000, s * 1000, facecolor=COL[t['prio']], alpha=0.16 if dop else 0.26,
                                   edgecolor='none', zorder=4))
            ax.add_patch(Rectangle((e * 1000, n * 1000), s * 1000, s * 1000, facecolor='none', edgecolor=COL[t['prio']], lw=1.1, zorder=5))
            if labels:
                tpx = px * 0.93 * s / wkm
                f = fs or max(5.0, min(13.0, tpx / 7.2))
                ax.text((e + s / 2) * 1000, (n + s / 2) * 1000, f'{e}\n{n}', ha='center', va='center', fontsize=f, fontweight='bold',
                        color='black', zorder=8, path_effects=halo, linespacing=0.95)
        for g, c, lw in ((stadt, 'black', 2.2), (kern, '#e07000', 1.6), (zen, '#d62728', 1.8)):
            x, y = g.exterior.xy
            ax.plot(x, y, '-', color=c, lw=lw, zorder=6)
        for n, (x, y) in places:
            if bb[0] < x < bb[2] and bb[1] < y < bb[3] and not labels:
                ax.text(x, y, n, fontsize=7.5, color='#083', zorder=7, ha='center', path_effects=halo)
        ax.set_xlim(bb[0], bb[2])
        ax.set_ylim(bb[1], bb[3])
        ax.set_aspect('equal')
        step = s if wkm <= 26 else 2
        xt = [v * 1000 for v in range(int(math.ceil(bb[0] / 1000 / step) * step), int(bb[2] / 1000) + 1, step)]
        yt = [v * 1000 for v in range(int(math.ceil(bb[1] / 1000 / step) * step), int(bb[3] / 1000) + 1, step)]
        ax.set_xticks(xt)
        ax.set_yticks(yt)
        ax.set_xticklabels([str(int(v / 1000)) for v in xt], fontsize=7.5, rotation=90 if len(xt) > 16 else 0)
        ax.set_yticklabels([str(int(v / 1000)) for v in yt], fontsize=7.5)
        ax.tick_params(length=2, pad=1.5)
        ax.grid(True, color='#888', lw=0.3, zorder=1)
        ax.set_title(title, fontsize=10.5, loc='left', pad=4)
        hs = [Patch(facecolor=COL[k], alpha=0.5, label=PNAME[k]) for k in show] + [
            Line2D([0], [0], color='black', lw=2, label='Stadtgrenze'), Line2D([0], [0], color='#e07000', lw=1.6, label='Kernstadt'),
            Line2D([0], [0], color='#d62728', lw=1.8, label='Zentrum')]
        fig.legend(handles=hs, loc='lower center', ncol=4, fontsize=7.5, frameon=False, bbox_to_anchor=(0.5, 0.0), handlelength=1.4, columnspacing=1.0)
        fig.text(0.995, 0.002, 'Zahlen = linke untere Ecke in km (UTM 32N: Ost, Nord) · Karte © OpenStreetMap-Mitwirkende' + (' · Luftbild © GDI-Th' if dop else ''),
                 ha='right', va='bottom', fontsize=5.5, color='#444')
        out = os.path.join(a.maps, name + ('.jpg' if dop else '.png'))
        if dop:
            fig.savefig(out, dpi=dpi, pil_kwargs={'quality': 84})
        else:
            fig.savefig(out, dpi=dpi)
        plt.close(fig)
        sblib.log('map', out, os.path.getsize(out))

    sb = stadt.bounds
    full = (math.floor(sb[0] / 1000) * 1000 - 0, math.floor(sb[1] / 1000) * 1000, math.ceil(sb[2] / 1000) * 1000, math.ceil(sb[3] / 1000) * 1000)
    allb = list(full)
    for k, (ln, m) in routes.items():
        b = ln.buffer(600).bounds
        allb = [min(allb[0], math.floor(b[0] / 1000) * 1000), min(allb[1], math.floor(b[1] / 1000) * 1000),
                max(allb[2], math.ceil(b[2] / 1000) * 1000), max(allb[3], math.ceil(b[3] / 1000) * 1000)]
    kb = kern300.bounds
    kbb = (math.floor(kb[0] / 1000) * 1000, math.floor(kb[1] / 1000) * 1000, math.ceil(kb[2] / 1000) * 1000, math.ceil(kb[3] / 1000) * 1000)
    zb = zen300.bounds
    zbb = (math.floor(zb[0] / 1000) * 1000 - 1000, math.floor(zb[1] / 1000) * 1000 - 1000, math.ceil(zb[2] / 1000) * 1000 + 1000, math.ceil(zb[3] / 1000) * 1000 + 1000)
    mid = (full[0] + full[2]) / 2
    mid = round(mid / 1000) * 1000
    draw('1_uebersicht', allb, 'Suhl – Kacheln der Landesdaten, Übersicht (1-km-Raster DGM1/DOM1)', labels=False, px=1100)
    draw('2_zentrum_P1', zbb, 'P1 Zentrum: 1-km-Kacheln DGM1/DOM1 (Ost/Nord in km)', dop=a.dop, detail=True, px=1100)
    draw('3_kernstadt_P1_P2', kbb, 'P1 + P2 Kernstadt: 1-km-Kacheln DGM1/DOM1 (Ost/Nord in km)', detail=True, px=1300)
    draw('4_stadt_west', (full[0], full[1], mid, full[3]), 'Stadt Suhl, Westhälfte: 1-km-Kacheln DGM1/DOM1 (Ost/Nord in km)', px=1300)
    draw('5_stadt_ost', (mid, full[1], full[2], full[3]), 'Stadt Suhl, Osthälfte: 1-km-Kacheln DGM1/DOM1 (Ost/Nord in km)', px=1300)
    if routes:
        draw('6_korridor_P4', (allb[0] if allb[0] < full[0] else 617000, allb[1], allb[2], full[1] + 2000),
             'P4 Straßen Garten – Suhl (Autobahn A 73/A 71 und Landstraße): 1-km-Kacheln DGM1/DOM1', px=1300)
    f2 = (math.floor(allb[0] / 2000) * 2000, math.floor(allb[1] / 2000) * 2000, math.ceil(allb[2] / 2000) * 2000, math.ceil(allb[3] / 2000) * 2000)
    draw('7_lod2_2km', f2, 'LoD2-Gebäude: 2-km-Kacheln (Ost/Nord in km, gerade Zahlen)', s=2, px=1300)


if __name__ == '__main__':
    main()
