"""Headless check of the world viewer (GitHub Actions only – the chat sandbox has 2 cores and runs the app's browser tests).
  python3 -I tools/welt/check_viewer.py <site dir with welt-test/> [--url <viewer url>] [--out <dir>] [--wait 240]
Without --url a local server serves the site dir and the viewer loads the tiles relative to itself (welt-test/viewer/?base=../).
Checks: the page starts, terrain tiles load (none fail), roads/buildings load, no console errors; reports MB loaded, texture memory,
triangles, draw calls, time to the first frame; screenshots (overview, Ratscher, driving) and check.json into --out."""
import argparse, functools, http.server, json, os, re, sys, threading, time

ap = argparse.ArgumentParser()
ap.add_argument('site')
ap.add_argument('--url')
ap.add_argument('--out', default='check')
ap.add_argument('--wait', type=float, default=240)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

srv = None
if not a.url:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    Quiet.extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webp': 'image/webp', '.glb': 'model/gltf-binary',
                            '.bin': 'application/octet-stream', '.js': 'text/javascript', '.json': 'application/json'}
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Quiet, directory=os.path.abspath(a.site)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    a.url = 'http://127.0.0.1:8765/welt-test/viewer/?base=../'

from playwright.sync_api import sync_playwright

res = {'url': a.url, 'checks': {}, 'console_errors': [], 'page_errors': []}
ok = True


def check(name, cond, info=''):
    global ok
    res['checks'][name] = {'ok': bool(cond), 'info': info}
    print(f"{'PASS' if cond else 'FAIL'} {name} {info}", flush=True)
    ok = ok and bool(cond)


def shot(page, name):
    """screenshot; one slow software-rendered frame must not end the check: 2 min, once more, else a failed check"""
    for k in range(2):
        try:
            page.screenshot(path=os.path.join(a.out, name), timeout=120000)
            return True
        except Exception as e:
            err = repr(e)[:200]
            print(f'Bildschirmfoto {name}: Versuch {k + 1} gescheitert: {err}', flush=True)
    check('bildschirmfoto_' + name.split('.')[0], False, err)
    return False


def wait_idle(pg, limit):
    t0 = time.time()
    calm = 0
    while time.time() - t0 < limit:
        if pg.evaluate('window.WELT && WELT.idle && WELT.idle()'):
            calm += 1
            if calm >= 3:
                return time.time() - t0
        else:
            calm = 0
        time.sleep(1.0)
    return None


with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('console', lambda m: m.type == 'error' and res['console_errors'].append(m.text[:300]))
    pg.on('pageerror', lambda e: res['page_errors'].append(str(e)[:300]))
    t0 = time.time()
    try:
        pg.goto(a.url, wait_until='load', timeout=120000)
        pg.wait_for_function('window.WELT && window.WELT.ready === true', timeout=120000)
    except Exception as e:   # the page did not start: keep what can be seen
        check('start', False, f'{e!r}'[:300] + f" console: {res['console_errors'][:3]} page: {res['page_errors'][:3]}")
        shot(pg, '0_start.png')
        json.dump(res, open(os.path.join(a.out, 'check.json'), 'w'), indent=1, ensure_ascii=False)
        sys.exit(1)
    check('start', True, f'{time.time() - t0:.1f} s')
    t_idle = wait_idle(pg, a.wait)
    st = pg.evaluate('WELT.stats()')
    check('kacheln_geladen', st['tilesReady'] >= 20 and t_idle is not None,
          f"{st['tilesReady']} Kacheln, sichtbar {st['drawn']}, bereit nach {t_idle and round(t_idle)} s")
    shot(pg, '1_ueberblick.png')
    res['overview'] = st
    # Ratscher from close by: the finest level, roads and buildings
    pg.evaluate("WELT.place('dorf')")
    time.sleep(2)
    wait_idle(pg, a.wait)
    time.sleep(3)
    pg.evaluate("WELT.place('dorf')")
    wait_idle(pg, a.wait)
    st2 = pg.evaluate('WELT.stats()')
    shot(pg, '2_ratscher.png')
    check('strassen_gebaeude', st2['contentLoaded'] >= 2, f"{st2['contentLoaded']} Inhalts-Kacheln (Straßen/Gebäude)")
    res['village'] = st2
    routes = pg.evaluate('WELT.routes()')
    res['routes'] = routes
    check('strecken', len(routes) >= 1, json.dumps(routes, ensure_ascii=False)[:200])
    if routes:
        pg.evaluate("WELT.setMode('drive')")
        pg.evaluate("WELT.drive.s = 300")
        time.sleep(4)
        wait_idle(pg, 90)
        time.sleep(2)
        shot(pg, '3_fahren.png')
        res['drive'] = pg.evaluate('WELT.stats()')
    fin = pg.evaluate('WELT.stats()')
    res['final'] = fin
    check('keine_fehlgeschlagenen_kacheln', fin['failed'] == 0, f"{fin['failed']} fehlgeschlagen; {fin['errors'][:3]}")
    # 5xx/429 for single files are retried by the viewer (GitHub Pages right after a deploy); Chrome still logs them – count separately
    transient = [m for m in res['console_errors'] if re.search(r'status of (5\d\d|429)', m)]
    other = [m for m in res['console_errors'] if m not in transient]
    res['transient_errors'] = len(transient)
    check('keine_konsolenfehler', not other and not res['page_errors'],
          f"{other[:3]} {res['page_errors'][:3]} (vorübergehende 5xx, wiederholt: {len(transient)}, Wiederholungen: {fin.get('retries', 0)})")
    check('keine_fehlermeldungen', not fin['errors'], f"{fin['errors'][:3]}")
    mbl = fin['bytes'] / 1e6
    mtex = fin['texBytes'] / 1e6
    print(f"geladen {mbl:.1f} MB in {fin['requests']} Anfragen (Inhalt {fin['contentBytes'] / 1e6:.1f} MB), Texturspeicher {mtex:.0f} MB, "
          f"erstes Bild nach {fin['firstFrameMs'] / 1000:.1f} s, Draw-Calls {fin['renderer']['calls']}, Dreiecke {fin['renderer']['triangles']}, "
          f"GL: {fin['gl']}", flush=True)
    res['summary'] = {'mb_loaded': round(mbl, 1), 'texture_mb': round(mtex), 'requests': fin['requests'], 'first_frame_s': fin['firstFrameMs'] / 1000,
                      'calls': fin['renderer']['calls'], 'triangles': fin['renderer']['triangles'], 'gl': fin['gl']}
    pg.close()
    # the same as an iPhone 13 (Chromium with the phone's screen and user agent: the viewer's phone budget – LOD 1.7, <= 170 tiles)
    try:
        ctx = br.new_context(**p.devices['iPhone 13'])
        mp = ctx.new_page()
        mp.on('pageerror', lambda e: res['page_errors'].append('iPhone: ' + str(e)[:300]))
        mp.goto(a.url, wait_until='load', timeout=120000)
        mp.wait_for_function('window.WELT && window.WELT.ready === true', timeout=120000)
        wait_idle(mp, a.wait)
        mp.evaluate("WELT.place('dorf')")
        time.sleep(2)
        wait_idle(mp, a.wait)
        ms = mp.evaluate('WELT.stats()')
        shot(mp, '4_iphone.png')
        res['iphone'] = {'tiles': ms['tilesReady'], 'mb_loaded': round(ms['bytes'] / 1e6, 1), 'texture_mb': round(ms['texBytes'] / 1e6),
                         'triangles': ms['renderer']['triangles'], 'calls': ms['renderer']['calls']}
        check('iphone_budget', ms['texBytes'] / 1e6 <= 300, f"Texturen {ms['texBytes'] / 1e6:.0f} MB (Budget 300), {ms['tilesReady']} Kacheln, "
              f"{ms['bytes'] / 1e6:.1f} MB geladen")
        ctx.close()
    except Exception as e:
        check('iphone_budget', False, repr(e)[:300])
    br.close()
res['ok'] = ok
json.dump(res, open(os.path.join(a.out, 'check.json'), 'w'), indent=1, ensure_ascii=False)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
        f.write(f"### Viewer-Prüfung {'bestanden' if ok else 'FEHLER'} – {a.url}\n\n")
        for k, v in res['checks'].items():
            f.write(f"- {'✅' if v['ok'] else '❌'} {k}: {v['info']}\n")
        s = res.get('summary', {})
        if res.get('iphone'):
            f.write(f"- iPhone-13-Emulation: {res['iphone']}\n")
        f.write(f"\nGeladen {s.get('mb_loaded')} MB in {s.get('requests')} Anfragen, Texturspeicher {s.get('texture_mb')} MB, "
                f"erstes Bild {s.get('first_frame_s')} s, Draw-Calls {s.get('calls')}, Dreiecke {s.get('triangles')}, GL {s.get('gl')}\n")
if srv:
    srv.shutdown()
sys.exit(0 if ok else 1)
