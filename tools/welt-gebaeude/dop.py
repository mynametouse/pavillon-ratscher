#!/usr/bin/env python3
"""The Thuringian orthophoto (DOP 20 cm, flown 07.04.2024 around the garden; © GDI-Th, dl-de/by-2-0) in UTM 32N for any area and
resolution, straight from the state's WMS (tools/geo/dop_th.py does the same on model axes at 0.1 m/px).

  python3 -I tools/welt-gebaeude/dop.py OUT.jpg E0 N0 E1 N1 RES [layer]      # layer th_dop (default) or th_dop20cir (infrared)

Pixel (u, v) of OUT is UTM (E0 + (u + 0.5) RES, N1 - (v + 0.5) RES). Analysis copies only – never commit the photos.
"""
import io, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                return r.read()
        except Exception as e:
            if k == tries - 1:
                raise
            time.sleep(3 + 7 * k)


def fetch(out, e0, n0, e1, n1, res, layer='th_dop', T=2000):
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    W, H = round((e1 - e0) / res), round((n1 - n0) / res)
    canvas = Image.new('RGB', (W, H))
    jobs = []
    for ty in range(0, H, T):
        for tx in range(0, W, T):
            w, h = min(T, W - tx), min(T, H - ty)
            be0, bn1 = e0 + tx * res, n1 - ty * res
            q = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832'
                 f'&BBOX={be0},{bn1 - h * res},{be0 + w * res},{bn1}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
            jobs.append((tx, ty, q))
    with ThreadPoolExecutor(3) as ex:
        for (tx, ty, q), b in zip(jobs, ex.map(lambda j: get(j[2]), jobs)):
            canvas.paste(Image.open(io.BytesIO(b)).convert('RGB'), (tx, ty))
    canvas.save(out, quality=92)
    print(out, canvas.size, flush=True)


if __name__ == '__main__':
    a = sys.argv[1:]
    fetch(a[0], *map(float, a[1:6]), *(a[6:7] or ['th_dop']))
