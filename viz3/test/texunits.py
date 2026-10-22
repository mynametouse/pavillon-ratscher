# texture units per shader program (mobile GPUs: 16): python3 texunits.py PORT — loads, renders a view with figure shadows on, reports the max
import sys, time
from playwright.sync_api import sync_playwright
port = sys.argv[1]
HOOK = """(() => { const P = window.__progs = []; const L = WebGL2RenderingContext.prototype.linkProgram;
  WebGL2RenderingContext.prototype.linkProgram = function (p) { P.push([this, p]); return L.call(this, p); }; })();"""
COUNT = """(() => { let best = [], max = 0, n = 0;
  for (const [gl, p] of window.__progs) { let k = 0, names = [];
    try { if (!gl.getProgramParameter(p, gl.LINK_STATUS)) continue; const N = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); n++;
      for (let i = 0; i < N; i++) { const u = gl.getActiveUniform(p, i); if ([gl.SAMPLER_2D, gl.SAMPLER_3D, gl.SAMPLER_CUBE, gl.SAMPLER_2D_SHADOW, gl.SAMPLER_2D_ARRAY].includes(u.type)) { k += u.size; names.push(u.name); } } } catch (e) { continue; }
    if (k > max) { max = k; best = names; } }
  return { programs: n, max, names: best, limit: window.__progs.length ? window.__progs[0][0].getParameter(window.__progs[0][0].MAX_TEXTURE_IMAGE_UNITS) : 0 }; })()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}); pg.add_init_script(HOOK); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type in ('error', 'warning') and 'Texture marked' not in m.text else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html?offline=1', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000)
    pg.evaluate("GAME.setMode('day'); GAME.setPhase(GAME.PHASES.length-1)"); time.sleep(2)
    pg.evaluate("(() => { const w = NPC.NPCS.bernd; w.target = null; w.wait = 60; GAME.view(w.x + 2.5, w.y + 2.5, 1.6, 225, -10, 60); })()"); time.sleep(1); pg.evaluate("GAME.shot()"); pg.evaluate("GAME.shot()")
    print('figsh on', pg.evaluate("window.FIGSH ? FIGSH.on.value : 'n/a'"), flush=True)
    pg.evaluate("GAME.go('garten')"); pg.evaluate("GAME.shot()"); pg.evaluate("GAME.go('bibliothek')"); pg.evaluate("GAME.shot()")
    print(pg.evaluate(COUNT)); print('errors', errs[:6]); b.close()
