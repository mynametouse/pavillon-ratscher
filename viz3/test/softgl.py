# V16b2/V16b3 loading on software rendering (no graphics card): SwiftShader counts as one, like Windows' "Microsoft Basic Render Driver".
# Loads WITHOUT a tier preset (the page picks the tier itself) and checks: software renderer recognised, lightest tier at once without
# timing, GPU preparation finished in reasonable time, the loading text moves on (no "… 100 %" after the assets are in) and counts the
# shaders, the page stays responsive meanwhile (V16b3: it froze for minutes on Windows), no broken shader programs, the hint about software
# rendering.   python3 viz3/test/softgl.py 8951   (~4–6 min)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1000, 640, errs, tier=None)
    texts = []; waits = []; t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); last = None
    while time.time() - t0 < 1500:
        q0 = time.time()
        try: s = pg.evaluate("(() => { const l = document.getElementById('loading'); return JSON.stringify({ t: l ? l.textContent : '', h: !!(l && l.hidden), a: !!(window.GAME && GAME.assetsLoaded()), p: window.GAME && GAME.RENDER ? GAME.RENDER.prepMs || 0 : 0 }); })()")
        except Exception as e: s = json.dumps({ 't': 'ERR', 'h': False, 'a': False, 'p': 0 })
        d = json.loads(s); lat = time.time() - q0
        if d['a'] and not d['p']: waits.append(lat)   # how long the page made us wait while it prepared the GPU
        if s != last: texts.append((round(time.time() - t0), d)); last = s
        if d['p']: break
        time.sleep(1.0)
    for t, d in texts: print(f"{t:5d}s {'[hidden] ' if d['h'] else ''}{d['t']}  assets={d['a']}")
    r = json.loads(pg.evaluate("JSON.stringify({ gl: window.GLINFO || null, tier: GAME.RENDER.tier, bench: GAME.RENDER.bench, prep: GAME.RENDER.prepMs, pr: GAME.R.getPixelRatio() })")); print(r)
    check('software renderer recognised (SwiftShader)', bool(r['gl'] and r['gl']['soft']), (r['gl'] or {}).get('renderer', '')[:80])
    check('lightest tier at once, no timing', r['tier'] == 'schnell' and (r['bench'] or {}).get('soft') == 1, f"{r['tier']} {r['bench']}")
    check('GPU preparation within 3 minutes', r['prep'] and r['prep'] < 180000, f"{r['prep']} ms")
    after = [d for t, d in texts if d['a']]; stuck = [d['t'] for d in after if d['t'].startswith('Modell wird geladen') and not d['h']]
    check('loading text moves on after the assets (no "100 %" left standing)', not stuck and any('Grafik wird vorbereitet' in d['t'] for t, d in texts), str(stuck[:2]))
    import re
    par = pg.evaluate("!!GAME.R.getContext().getExtension('KHR_parallel_shader_compile')")   # without it the count cannot be asked without waiting
    check('shaders counted on the loading screen', any(re.search(r'Shader \d+ von \d+', d['t']) for t, d in texts), f"parallel compile: {par}")
    check('page responsive while preparing (longest wait ≤ 15 s: the first picture)', waits and max(waits) <= 15, f"longest {max(waits or [0]):.1f} s over {len(waits)} looks")
    time.sleep(4)
    toast = pg.evaluate("(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; })()")
    check('hint about software rendering', 'ohne Grafikkarte' in toast, toast[:90])
    g = json.loads(pg.evaluate("JSON.stringify((() => { const g = GLCHECK.run(16); return { maxFrag: g.maxFrag, broken: g.broken.slice(0, 5), bad: g.bad.slice(0, 3) }; })())"))
    check('no broken shader programs, ≤ 16 textures', not g['broken'] and not g['bad'], str(g))
    check('no errors', not [e for e in errs if 'PAGEERR' in e], '\n'.join(errs[:5]))
print(f"\n{len(ok)} ok, {len(fails)} failed: {fails}")
