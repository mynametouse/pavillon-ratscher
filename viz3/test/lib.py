"""Shared helpers for the browser tests (Playwright + Chromium/SwiftShader, see docs/WORKFLOW.md).

    import lib; out = lib.out('v16a')                 # <repo>/out/v16a, created
    with lib.browser() as b: pg = lib.page(b, 1000, 600); lib.boot(pg, port)
    lib.shot(pg, out, 'name')                          # renders one full frame (GAME.shot) → out/name.jpg
Port: first CLI argument of every test (test server: bash tools/csp/start8951.sh → 8951).
"""
import os, time, base64, contextlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']

def out(name):
    d = os.path.join(ROOT, 'out', name); os.makedirs(d, exist_ok=True); return d

@contextlib.contextmanager
def browser():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        try: yield b
        finally: b.close()

def preset(pg, tier='schnell'):
    """Skip the GPU benchmark at load (several minutes in SwiftShader): the render tier is preset like a choice by hand.
    'schnell' for logic tests, 'hoch' for pictures. Load time then ~2 min, with ?nogeo=1 (no real surroundings) ~1 min."""
    pg.add_init_script("try { localStorage.setItem('pav-tier', '" + tier + "'); } catch (e) {}")

def page(b, w=1000, h=640, errs=None, tier='schnell', **kw):
    pg = b.new_page(viewport={'width': w, 'height': h}, **kw)
    if tier: preset(pg, tier)
    if errs is not None:
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    return pg

def boot(pg, port, query='', freeze=True, figures=False):
    """Load the page and wait until the model is ready (SwiftShader: several minutes). freeze: stop the frame loop (tests step with GAME.step)."""
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{query}', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
    if figures: pg.wait_for_function("!window.AVATAR || AVATAR.ready || AVATAR.failed", timeout=900000, polling=1000)
    time.sleep(3)
    if freeze: pg.evaluate("window.FREEZE = true")
    print('loaded', round(time.time() - t0), 's', flush=True)

def shot(pg, d, name, q=0.88):
    data = pg.evaluate(f"(() => {{ GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', {q}); }})()")
    open(os.path.join(d, name + '.jpg'), 'wb').write(base64.b64decode(data.split(',')[1])); print('shot', name, flush=True)

def settle_light(pg, tries=80):
    """After changing the clock or the light mode: wait until the day/night textures (sky, image light, baked GI mix) are there."""
    for i in range(tries):
        pg.evaluate("GAME.step(0.05)")
        if pg.evaluate("!window.DN || !DN.active || DN.ready()"): break
        time.sleep(0.3)
    pg.evaluate("window.DN && DN.active && DN.update(true); GAME.step(0.05)")

# the same count without the app's GLCHECK (older builds, e.g. the published one)
GLCOUNT = """(R, lim) => { const gl = R.getContext(), ST = new Set([gl.SAMPLER_2D, gl.SAMPLER_CUBE, gl.SAMPLER_3D, gl.SAMPLER_2D_ARRAY, gl.SAMPLER_2D_SHADOW, gl.SAMPLER_CUBE_SHADOW, gl.SAMPLER_2D_ARRAY_SHADOW]);
  const out = { limit: lim, programs: 0, maxFrag: 0, maxVert: 0, bad: [], broken: [] };
  for (const p of R.info.programs || []) { const prog = p.program; if (!prog) continue; out.programs++; if (p.diagnostics && p.diagnostics.runnable === false) out.broken.push(p.name);
    const fs = (gl.getShaderSource(p.fragmentShader) || '').replace(/\\/\\/.*$/gm, ''), vs = (gl.getShaderSource(p.vertexShader) || '').replace(/\\/\\/.*$/gm, ''); let f = 0, v = 0; const names = [];
    for (let i = 0; i < gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); i++) { const u = gl.getActiveUniform(prog, i); if (!u || !ST.has(u.type)) continue; const b = u.name.replace(/\\[.*$/, ''), re = new RegExp('\\\\b' + b + '\\\\b');
      const inF = re.test(fs), inV = re.test(vs); if (inF || !inV) f += u.size; if (inV) v += u.size; names.push(b); }
    out.maxFrag = Math.max(out.maxFrag, f); out.maxVert = Math.max(out.maxVert, v); if (f > lim || v > lim) out.bad.push({ name: p.name, frag: f, vert: v, samplers: names }); }
  return out; }"""

def check_gl(pg, limit=16):
    """V16b1: every compiled shader program within the textures a GPU must allow (WebGL 2 minimum: 16 per shader stage; many laptops,
    Macs and phones have no more – SwiftShader here allows 32, so too many would go unnoticed), and none broken. Returns (ok, report)."""
    import json as _j
    r = _j.loads(pg.evaluate(f"JSON.stringify(window.GLCHECK ? GLCHECK.run({limit}) : ({GLCOUNT})(GAME.R, {limit}))"))
    ok = not r['bad'] and not r['broken'] and r['maxFrag'] <= limit and r['maxVert'] <= limit
    return ok, r
