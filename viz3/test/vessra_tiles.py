# The world tiles of the zone Kloster Veßra for the tests (viz3/test/vessra*.py): from the published site into viz3/dist/welt-test/zonen/vessra/
# (the test server serves dist) – the tiles the app asks for around the place (levels 10-12, rings of welt/welt.js) and under it (sampler).
import os, json, time, urllib.request, urllib.error, concurrent.futures
import lib

SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/') + 'zonen/vessra/'
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test', 'zonen', 'vessra')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
ORT = (-8850.0, -300.0)
KL = (-8770.0, -377.0)


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


FAILED = []


def fetch_tiles():
    """the tiles the app asks for in the zone (levels 10-12, rings of welt/welt.js) and under it (sampler), into dist/welt-test/zonen/vessra/"""
    os.makedirs(DIST, exist_ok=True)

    def get(rel):
        p = os.path.join(DIST, rel)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return 0
        os.makedirs(os.path.dirname(p), exist_ok=True)
        for k in range(4):   # GitHub Pages now and then drops a connection: try again
            try:
                with urllib.request.urlopen(SITE + rel, timeout=60) as r:
                    b = r.read()
                break
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return 0
            except Exception:
                pass
            time.sleep(1 + 2 * k)
        else:
            FAILED.append(rel)
            return 0
        open(p + '.part', 'wb').write(b)
        os.replace(p + '.part', p)
        return len(b)
    get('meta.json')
    try:
        meta = json.load(open(os.path.join(DIST, 'meta.json')))
    except Exception as e:
        print('no zone tiles on the site:', e, flush=True)
        return
    lv = meta['tiling']['levels']
    jobs = set()
    cs = [utm(ORT[0] + sx * 700, ORT[1] + sy * 700) for sx in (-1, 1) for sy in (-1, 1)]
    for L, pad in ((10, 800), (11, 400), (12, 160)):
        s = 409600 / (1 << L)
        r = lv[str(L)]['rect']
        E0, E1 = min(c[0] for c in cs) - pad, max(c[0] for c in cs) + pad
        N0, N1 = min(c[1] for c in cs) - pad, max(c[1] for c in cs) + pad
        for x in range(int((E0 - 420700) // s), int((E1 - 420700) // s) + 1):
            for y in range(int((N0 - 5390800) // s), int((N1 - 5390800) // s) + 1):
                if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                    jobs.add(f't/{L}/{x}/{y}.bin')
                    jobs.add(f'i/{L}/{x}/{y}.webp')
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'zone tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s' + (f', not fetched: {FAILED[:5]}' if FAILED else ''), flush=True)
