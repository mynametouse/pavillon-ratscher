#!/usr/bin/env python3
"""Downloads for the vegetation-class maps, cached under BEWUCHS_RAW (default /home/claude/bewuchs-raw) – raw data never goes into the repo.

  python3 -I tools/bewuchs/daten/holen.py osm  [x0 y0 x1 y1]     # OpenStreetMap through the API (small tiles, one call a second)
  python3 -I tools/bewuchs/daten/holen.py dop  i0 j0 i1 j1       # orthophoto 20 cm, colour and colour infrared, per 400 m cell
  python3 -I tools/bewuchs/daten/holen.py dlm  [x0 y0 x1 y1]     # ATKIS Basis-DLM layers rendered by the state's WMS (1 m)
  python3 -I tools/bewuchs/daten/holen.py korridor               # part (b): OSM, DLM (blocks of 5 × 5 cells), photos and flight dates

Model boxes in metres (default: Ratscher's square). Sources: © OpenStreetMap contributors (ODbL 1.0); DOP and Basis-DLM © GDI-Th
(dl-de/by-2-0), WMS www.geoproxy.geoportal-th.de (reachable from the chat machine; Overpass and Geofabrik are not)."""
import io, json, os, sys, time, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import RAW, CELL, m2u, square_box  # noqa: E402

UA = 'pavillon-ratscher bewuchs-daten/1.0 (open-data research for a hobby 3D map; github.com/mynametouse/pavillon-ratscher)'
WMS_DOP = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'
WMS_DLM = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DLM'
OSM_API = 'https://api.openstreetmap.org/api/0.6/map'
TILE = 0.0125  # degrees, as tools/daten/osm_extrakt.py


def get(url, timeout=180, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                raise
            time.sleep(4 * (k + 1))
        except Exception:
            if k == tries - 1:
                raise
            time.sleep(4 * (k + 1))
    raise RuntimeError('failed: ' + url)


def utm_box(x0, y0, x1, y1, pad=0.0):
    E, N = m2u([x0, x1, x1, x0], [y0, y0, y1, y1])
    return min(E) - pad, min(N) - pad, max(E) + pad, max(N) + pad


# ---------------- OpenStreetMap ----------------
def osm_tiles(x0, y0, x1, y1, pad=150.0):
    from pyproj import Transformer
    tr = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
    e0, n0, e1, n1 = utm_box(x0, y0, x1, y1, pad)
    lo0, la0 = tr.transform(e0, n0)
    lo1, la1 = tr.transform(e1, n1)
    lo2, la2 = tr.transform(e0, n1)
    lo3, la3 = tr.transform(e1, n0)
    s, n = min(la0, la1, la2, la3), max(la0, la1, la2, la3)
    w, e = min(lo0, lo1, lo2, lo3), max(lo0, lo1, lo2, lo3)
    # snap to a fixed lattice, so other boxes reuse the cached tiles
    import math
    s, w = math.floor(s / TILE) * TILE, math.floor(w / TILE) * TILE
    out = []
    la = s
    while la < n:
        lo = w
        while lo < e:
            out.append((round(la, 5), round(lo, 5), round(la + TILE, 5), round(lo + TILE, 5)))
            lo += TILE
        la += TILE
    return out


def osm_fetch(s, w, n, e):
    d = os.path.join(RAW, 'osm')
    os.makedirs(d, exist_ok=True)
    fn = os.path.join(d, f'osm_{s:.5f}_{w:.5f}_{n:.5f}_{e:.5f}.xml')
    if os.path.exists(fn):
        return [fn]
    try:
        data = get(f'{OSM_API}?bbox={w:.5f},{s:.5f},{e:.5f},{n:.5f}')
    except urllib.error.HTTPError as ex:
        if ex.code != 400:
            raise
        hs, hw = (n - s) / 2, (e - w) / 2  # too many nodes: four quarters
        out = []
        for a in (s, s + hs):
            for b in (w, w + hw):
                out += osm_fetch(round(a, 6), round(b, 6), round(a + hs, 6), round(b + hw, 6))
        return out
    open(fn, 'wb').write(data)
    time.sleep(1.1)
    return [fn]


def osm(box):
    files = []
    for t in osm_tiles(*box):
        files += osm_fetch(*t)
    print('osm', len(files), 'files in', os.path.join(RAW, 'osm'))
    return files


def osm_cells(cells, pad=150.0):
    """the OSM tiles that touch any of the cells (i, j, …) – a corridor needs far fewer than its bounding box"""
    from shapely.geometry import box as sbox
    from shapely.ops import unary_union
    from pyproj import Transformer
    tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    need = unary_union([sbox(*utm_box(CELL * c[0], CELL * c[1], CELL * (c[0] + 1), CELL * (c[1] + 1), pad)) for c in cells])
    files = []
    for s, w, n, e in osm_tiles(*need_box(cells, pad)):
        E, N = tr.transform([w, e, e, w], [s, s, n, n])
        if need.intersects(sbox(min(E), min(N), max(E), max(N))):
            files += osm_fetch(s, w, n, e)
    print('osm', len(files), 'files')
    return files


def need_box(cells, pad):
    xs = [c[0] for c in cells]
    ys = [c[1] for c in cells]
    return CELL * min(xs), CELL * min(ys), CELL * (max(xs) + 1), CELL * (max(ys) + 1)


# ---------------- orthophoto, colour and colour infrared ----------------
def dop_cell(i, j, margin=12.0, res=0.2, layers=('th_dop', 'th_dop20cir')):
    """the orthophoto around cell (i, j) in UTM at res (the 20 cm DOP: 0.2 m for the 0.5 m cells, 0.4 m for the 1 m cells); JPEG + meta
    (bbox) per layer"""
    d = os.path.join(RAW, 'dop')
    os.makedirs(d, exist_ok=True)
    x0, y0, x1, y1 = CELL * i - margin, CELL * j - margin, CELL * (i + 1) + margin, CELL * (j + 1) + margin
    e0, n0, e1, n1 = utm_box(x0, y0, x1, y1, 2.0)
    e0, n0 = res * int(e0 / res), res * int(n0 / res)
    W, H = int((e1 - e0) / res) + 1, int((n1 - n0) / res) + 1
    out = {}
    for L in layers:
        fn = os.path.join(d, f'{L}_{i}_{j}.jpg')
        meta = {'e0': e0, 'n1': n0 + H * res, 'res': res, 'w': W, 'h': H, 'layer': L}
        if os.path.exists(fn) and os.path.exists(fn + '.json'):  # a cell that changed its resolution: fetched again
            with open(fn + '.json') as fh:
                if abs(json.load(fh).get('res', res) - res) > 1e-6:
                    os.remove(fn)
        if not os.path.exists(fn):
            q = (f'{WMS_DOP}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={L}&STYLES=&CRS=EPSG:25832'
                 f'&BBOX={e0:.2f},{n0:.2f},{e0 + W * res:.2f},{n0 + H * res:.2f}&WIDTH={W}&HEIGHT={H}&FORMAT=image/jpeg')
            data = get(q)
            if data[:2] != b'\xff\xd8':
                raise RuntimeError('no JPEG for ' + fn + ': ' + data[:200].decode('utf-8', 'replace'))
            open(fn + '.part', 'wb').write(data)
            os.replace(fn + '.part', fn)
            json.dump(meta, open(fn + '.json', 'w'))
        out[L] = (fn, meta)
    return out


def flight(i, j):
    """flight date of the orthophoto tile under the centre of cell (i, j) (cached in dop/flug.json)"""
    fn = os.path.join(RAW, 'dop', 'flug.json')
    d = json.load(open(fn)) if os.path.exists(fn) else {}
    key = f'{i}_{j}'
    if key not in d:
        E, N = m2u(CELL * (i + 0.5), CELL * (j + 0.5))
        q = (f'{WMS_DOP}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=th_dop_info&QUERY_LAYERS=th_dop_info&STYLES='
             f'&CRS=EPSG:25832&BBOX={E - 50},{N - 50},{E + 50},{N + 50}&WIDTH=100&HEIGHT=100&I=50&J=50&INFO_FORMAT=text/plain')
        t = get(q, 60).decode('utf-8', 'replace')
        a = {k: v.strip() for k, v in (p.split('=', 1) for p in t.split('$#$') if '=' in p)}
        dd = a.get('Erstellung', '')
        d[key] = '-'.join(reversed(dd.split('.'))) if dd.count('.') == 2 else dd
        json.dump(d, open(fn, 'w'), indent=0)
    return d[key]


# ---------------- ATKIS Basis-DLM (rendered by the WMS; colours are read in klassen.py) ----------------
DLM_LAYERS = ['veg01_f', 'veg02_f', 'veg03_f_1', 'veg03_f_5', 'sie01_f', 'sie02_f_1', 'sie02_f_2', 'sie02_f_6', 'sie02_f_7', 'sie02_f_8',
              'sie02_f_9', 'ver01_f_1', 'ver01_f_2', 'gew01_f_1', 'gew01_f_3', 'gew01_l_1', 'gew01_l_2', 'veg04_l', 'veg04_f', 'rel01_l_1']
DLM_USED = ['veg01_f', 'veg02_f', 'veg03_f_1', 'veg03_f_5', 'sie01_f', 'sie02_f_1', 'sie02_f_2', 'sie02_f_6', 'sie02_f_7', 'sie02_f_8',
            'sie02_f_9', 'ver01_f_1', 'gew01_f_1', 'gew01_f_3', 'veg04_f']  # what klassen.py reads
BLOCK = 5  # cells per side of a DLM block beyond the square


def dlm_blocks(cells):
    """the DLM in blocks of 5 × 5 cells (2 km, 1 m) – one set of pictures per block that holds a cell"""
    done = []
    for bi, bj in sorted({(c[0] // BLOCK, c[1] // BLOCK) for c in cells}):
        x0, y0 = CELL * BLOCK * bi, CELL * BLOCK * bj
        dlm((x0, y0, x0 + CELL * BLOCK, y0 + CELL * BLOCK), name=f'b{bi}_{bj}', layers=DLM_USED)
        done.append((bi, bj))
    return done


def dlm(box, res=1.0, name='ratscher', layers=None):
    d = os.path.join(RAW, 'dlm')
    os.makedirs(d, exist_ok=True)
    e0, n0, e1, n1 = utm_box(*box, pad=30.0)
    e0, n0 = int(e0), int(n0)
    W, H = int((e1 - e0) / res) + 1, int((n1 - n0) / res) + 1
    meta = {'e0': e0, 'n1': n0 + H * res, 'res': res, 'w': W, 'h': H}
    json.dump(meta, open(os.path.join(d, f'{name}.json'), 'w'))
    for L in layers or DLM_LAYERS:
        fn = os.path.join(d, f'{name}_{L}.png')
        if os.path.exists(fn):
            continue
        tiles = []
        T = 2400
        from PIL import Image
        canvas = Image.new('RGBA', (W, H))
        for ty in range(0, H, T):
            for tx in range(0, W, T):
                w, h = min(T, W - tx), min(T, H - ty)
                be0, bn1 = e0 + tx * res, n0 + H * res - ty * res
                q = (f'{WMS_DLM}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={L}&STYLES=&CRS=EPSG:25832'
                     f'&BBOX={be0:.2f},{bn1 - h * res:.2f},{be0 + w * res:.2f},{bn1:.2f}&WIDTH={w}&HEIGHT={h}&FORMAT=image/png&TRANSPARENT=true')
                data = get(q)
                canvas.paste(Image.open(io.BytesIO(data)).convert('RGBA'), (tx, ty))
                tiles.append(1)
        canvas.save(fn + '.part.png')
        os.replace(fn + '.part.png', fn)
        print('dlm', name, L, len(tiles), 'tile(s)', flush=True)
    return meta


def dlm_info(layer, E, N):
    """attributes of the DLM object of a layer at UTM (E, N) (GetFeatureInfo)"""
    q = (f'{WMS_DLM}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS={layer}&QUERY_LAYERS={layer}&STYLES=&CRS=EPSG:25832'
         f'&BBOX={E - 5},{N - 5},{E + 5},{N + 5}&WIDTH=11&HEIGHT=11&I=5&J=5&INFO_FORMAT=text/plain')
    t = get(q, 60).decode('utf-8', 'replace')
    return {k: v.strip() for k, v in (p.split('=', 1) for p in t.split('$#$') if '=' in p)}


if __name__ == '__main__':
    what = sys.argv[1]
    a = [float(v) for v in sys.argv[2:]]
    if what == 'osm':
        osm(a if a else square_box())
    elif what == 'dlm':
        dlm(a if a else square_box())
    elif what == 'korridor':
        import gebiete
        cells = gebiete.korridor()
        osm_cells(cells)
        for k, (i, j, r) in enumerate(cells):
            t0 = time.time()
            dop_cell(i, j, res=0.2 if r <= 0.5 else 0.4)
            print('dop', k, i, j, r, flight(i, j), f'{time.time() - t0:.1f} s', flush=True)
        dlm_blocks(cells)
    elif what == 'dop':
        i0, j0, i1, j1 = map(int, a)
        for j in range(j0, j1 + 1):
            for i in range(i0, i1 + 1):
                t0 = time.time()
                r = dop_cell(i, j)
                print('dop', i, j, {k: os.path.getsize(v[0]) // 1024 for k, v in r.items()}, 'KB', f'{time.time() - t0:.1f} s', flush=True)
    else:
        sys.exit(__doc__)
