# Baseline/after metrics: bytes at start, load timeline, main-thread profile during load, shader programs compiled during a tour,
# triangles + draw calls per view (all passes of one frame), JS time per frame.  Usage: python3 perfbase.py [tag] [url]
import json, os, sys, time, collections
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(H, 'out')
tag = sys.argv[1] if len(sys.argv) > 1 else 'base'
url = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8765/index.html'
res = {'tag': tag}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.add_init_script("try{localStorage.setItem('pav-tier','hoch')}catch(e){}"); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    cdp = pg.context.new_cdp_session(pg); cdp.send('Network.enable'); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 2000})
    sizes = collections.Counter(); urls = {}
    cdp.on('Network.responseReceived', lambda e: urls.__setitem__(e['requestId'], e['response']['url']))
    def fin(e):
        u = urls.get(e['requestId'], '?'); k = u.split('?')[0].split('/')[-2] if '/' in u else u
        if u.endswith('.html') or 'index' in u.split('/')[-1]: k = 'page'
        if 'fonts' in u: k = 'fonts'
        sizes[k] += e['encodedDataLength']
    cdp.on('Network.loadingFinished', fin)
    cdp.send('Profiler.start'); t0 = time.time()
    pg.goto(url, timeout=300000, wait_until='domcontentloaded'); res['dom_s'] = round(time.time() - t0, 1)
    pg.wait_for_function("window.GAME && GAME.loaded()", timeout=900000, polling=500); res['loaded_s'] = round(time.time() - t0, 1)
    pg.wait_for_function("!document.getElementById('loading') || document.getElementById('loading').hidden", timeout=900000, polling=500); res['shown_s'] = round(time.time() - t0, 1)
    prof = cdp.send('Profiler.stop')['profile']
    # self time per function
    nodes = {n['id']: n for n in prof['nodes']}; selft = collections.Counter(); dts = prof['timeDeltas']
    for sid, dt in zip(prof['samples'], dts): n = nodes[sid]; cf = n['callFrame']; selft[(cf['functionName'] or '(anon)') + ' ' + cf['url'].split('/')[-1][:20] + ':' + str(cf['lineNumber'])] += dt
    tot = sum(dts) / 1000; res['profile_ms_total'] = round(tot)
    res['profile_top'] = [(k, round(v / 1000)) for k, v in selft.most_common(25)]
    res['bytes_at_start_MB'] = {k: round(v / 1e6, 2) for k, v in sizes.most_common()}; res['bytes_total_MB'] = round(sum(sizes.values()) / 1e6, 2)
    E = pg.evaluate
    res['programs_after_load'] = E("GAME.R.info.programs.length")
    res['quality'] = E("GAME.RENDER.hq ? 'high' : 'low'"); res['pixelRatio'] = E("GAME.R.getPixelRatio()")
    E("GAME.R.info.autoReset = false")
    views = [('orbit', "GAME.orbit(200,55,34,[4,6,1])"), ('orbitS', "GAME.orbit(20,25,40,[4,4,1])"), ('garten', "GAME.go('garten')"), ('carport', "GAME.go('carport')"),
             ('eingang', "GAME.go('eingang')"), ('bibliothek', "GAME.go('bibliothek')"), ('treppe', "GAME.go('treppe')"), ('arbeitsraum', "GAME.go('arbeitsraum')"),
             ('dach', "GAME.go('dach')"), ('wohnwagen', "GAME.go('wohnwagen')"), ('bungalow', "GAME.go('bungalow')"), ('ziegen', "GAME.go('ziegen')")]
    per = []
    for name, js in views:
        E(js); pr0 = E("GAME.R.info.programs.length")
        for yaw in (0, 120, 240):
            E(f"(()=>{{ if (GAME.P.mode==='walk') GAME.P.yaw += {yaw}; else GAME.P.az += {yaw}; }})()")
            E("GAME.R.info.reset()"); t1 = time.time(); E("GAME.shot()"); dt = time.time() - t1
            inf = E("({t: GAME.R.info.render.triangles, c: GAME.R.info.render.calls})")
            per.append([name, yaw, inf['t'], inf['c'], round(dt * 1000)])
        res.setdefault('programs_new_by_view', {})[name] = E("GAME.R.info.programs.length") - pr0
    res['views'] = per
    res['programs_after_tour'] = E("GAME.R.info.programs.length")
    res['tris_max'] = max(v[2] for v in per); res['tris_avg'] = round(sum(v[2] for v in per) / len(per)); res['calls_avg'] = round(sum(v[3] for v in per) / len(per))
    res['textures'] = E("GAME.R.info.memory.textures"); res['geometries'] = E("GAME.R.info.memory.geometries")
    res['errors'] = errs[:5]
    b.close()
open(os.path.join(OUT, 'perf_' + tag + '.json'), 'w').write(json.dumps(res, indent=1))
print(json.dumps({k: v for k, v in res.items() if k not in ('views', 'profile_top')}, indent=1))
print('top self time (ms):'); [print('  ', v, k) for k, v in res['profile_top'][:20]]
