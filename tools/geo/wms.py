import urllib.request, ssl, os, time
CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt'); PX = os.environ.get('HTTPS_PROXY')
OP = urllib.request.build_opener(urllib.request.ProxyHandler({'https': PX, 'http': PX}), urllib.request.HTTPSHandler(context=CTX))
def get(url, tries=4):
    for k in range(tries):
        try: return OP.open(urllib.request.Request(url, headers={'User-Agent': 'PavillonRatscher/1.0 (private non-commercial garden model)'}), timeout=180).read()
        except Exception as e: print('retry', e); time.sleep(5 + 10 * k)
    raise RuntimeError('failed ' + url)
def dop(x0, y0, x1, y1, w, h, layer='th_dop', fmt='image/jpeg', svc='DOP'):
    url = f'https://www.geoproxy.geoportal-th.de/geoproxy/services/{svc}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832&BBOX={x0},{y0},{x1},{y1}&WIDTH={w}&HEIGHT={h}&FORMAT={fmt}'
    return get(url)
