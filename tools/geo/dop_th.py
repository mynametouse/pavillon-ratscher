#!/usr/bin/env python3
"""Thüringen orthophoto (DOP, 20 cm; GDI-Th, open data, dl-de/by-2-0) for a part of the model, straight from the WMS – reachable from the
chat machine (30.10.2026). The tile around the garden (32_625_5595) was flown on 07.04.2024: much newer than viz3/dist/geo/ortho_*.jpg.

  python3 tools/geo/dop_th.py OUT.jpg x0 x1 y0 y1 [m_per_px]     # model metres (x east, y north) → a picture on model axes (north up)
  python3 tools/geo/dop_th.py --info E N                         # flight date of the tile at UTM E, N

The picture is fetched in UTM (EPSG:25832) around the area and resampled with the model's frame (model_xf: scale 1.0157, 4.36°), so its
pixel (u, v) is model (x0 + u·s, y1 − v·s). Analysis only – keep the pictures out of the repo (size; if one is ever shown in the app,
credit „© GDI-Th“ in viz3/buildlib/credits.py)."""
import io, sys, urllib.request
WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'
# model (x, y) → UTM: E = ex + a x − b y, N = ey + b x + a y (viz3/site meta, model_xf)
A, B, EX, EY = 1.0127906473420232, 0.07715765993901931, 625469.0070213208, 5595624.323524626


def get(url, timeout=120):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def info(e, n):
    q = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=th_dop_info&QUERY_LAYERS=th_dop_info&STYLES=&CRS=EPSG:25832'
         f'&BBOX={e - 50},{n - 50},{e + 50},{n + 50}&WIDTH=100&HEIGHT=100&I=50&J=50&INFO_FORMAT=text/plain')
    t = get(q, 60).decode('utf-8', 'replace')
    return {k: v for k, v in (p.split('=', 1) for p in t.split('$#$') if '=' in p)}


def fetch(out, x0, x1, y0, y1, s=0.05):
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    xs, ys = (x0, x1, x1, x0), (y0, y0, y1, y1)
    E = [EX + A * x - B * y for x, y in zip(xs, ys)]
    N = [EY + B * x + A * y for x, y in zip(xs, ys)]
    e0, e1, n0, n1 = min(E) - 2, max(E) + 2, min(N) - 2, max(N) + 2
    res = 0.1  # the WMS serves the 20 cm DOP; 0.1 m/px keeps the detail when it is turned
    W, H = round((e1 - e0) / res), round((n1 - n0) / res)
    tiles, T = [], 1600  # the service answers up to a few thousand pixels – fetch in pieces
    canvas = Image.new('RGB', (W, H))
    for ty in range(0, H, T):
        for tx in range(0, W, T):
            w, h = min(T, W - tx), min(T, H - ty)
            be0, bn1 = e0 + tx * res, n1 - ty * res
            q = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=th_dop&STYLES=&CRS=EPSG:25832'
                 f'&BBOX={be0},{bn1 - h * res},{be0 + w * res},{bn1}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
            canvas.paste(Image.open(io.BytesIO(get(q))).convert('RGB'), (tx, ty))
    # output (u, v) → model x = x0 + u s, y = y1 − v s → E, N → source pixel ((E − e0)/res, (n1 − N)/res)
    Wo, Ho = round((x1 - x0) / s), round((y1 - y0) / s)
    cA, cB, cC = A * s / res, B * s / res, (EX + A * x0 - B * y1 - e0) / res
    cD, cE, cF = -B * s / res, A * s / res, (n1 - (EY + B * x0 + A * y1)) / res
    img = canvas.transform((Wo, Ho), Image.AFFINE, (cA, cB, cC, cD, cE, cF), resample=Image.BICUBIC)
    img.save(out, quality=90)
    d = info((e0 + e1) / 2, (n0 + n1) / 2)
    print(out, img.size, 'flown', d.get('Erstellung'), 'tile', d.get('Name'))


if __name__ == '__main__':
    if sys.argv[1] == '--info':
        print(info(float(sys.argv[2]), float(sys.argv[3])))
    else:
        a = sys.argv[1:]
        fetch(a[0], *map(float, a[1:5]), *(map(float, a[5:6]) if len(a) > 5 else ()))
