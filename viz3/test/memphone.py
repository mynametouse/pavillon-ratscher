# V16b6: memory like an iPhone visitor (iPhone 13 context: UA, 390 × 844 at 3×, touch; no tier preset). Until V16b6 the model held ~880 MB of
# decoded texture images there and Safari dropped the page while the textures went up (Falko, 22.10. 18:55). Now phones get the images at half
# size; if a load at that level breaks off anyway, the next one takes a quarter and keeps it.
# Checks: first visit – textures halved (level 1), decoded images < 350 MB, loads without errors; then a broken-off attempt at level 1 (the load
# log left open, like after a crash) – the next visit goes to a quarter (level 2, remembered in pav-texlevel), less memory again, loads.
# Prints the resident memory of the renderer and GPU processes (ps) – SwiftShader, so the GPU side is only a hint.
#   python3 viz3/test/memphone.py 8951   (~4 min)
import sys, os, json, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
def rss():
    r = {}
    for ln in subprocess.run(['ps', '-eo', 'rss,args'], capture_output=True, text=True).stdout.split('\n'):
        if 'headless_shell' not in ln: continue
        kb = int(ln.split()[0]); t = 'renderer' if '--type=renderer' in ln else 'gpu' if '--type=gpu-process' in ln else None
        if t: r[t] = r.get(t, 0) + kb // 1024
    return r
# decoded size of every image a material or the scene uses (each source once)
TEXMB = """(() => { const seen = new Set(); let mb = 0, n = 0; const add = t => { if (!t || !t.isTexture || t.isRenderTargetTexture) return; const s = t.source; if (!s || seen.has(s)) return; seen.add(s);
    const im = s.data; if (!im || !im.width) return; n++; mb += im.width * im.height * (im.depth || 1) * 4 / 1e6; };
  GAME.scene.traverse(o => { for (const m of o.material ? [].concat(o.material) : []) { for (const k in m) add(m[k]); if (m.uniforms) for (const k in m.uniforms) { const u = m.uniforms[k]; if (u && u.value) [].concat(u.value).forEach(add); } } });
  return JSON.stringify({ n, mb: Math.round(mb), level: TEXHALF.level, halved: TEXHALF.n, saved: Math.round(TEXHALF.mb), kept: localStorage.getItem('pav-texlevel') }); })()"""
def visit(pg, label):
    t0 = time.time(); peak = {}; pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    while time.time() - t0 < 900:
        for k, v in rss().items(): peak[k] = max(peak.get(k, 0), v)
        try:
            if pg.evaluate("!!(window.GAME && GAME.loaded && GAME.loaded())"): break
        except Exception: pass
        time.sleep(1)
    loaded = pg.evaluate("!!(window.GAME && GAME.loaded && GAME.loaded())"); pg.evaluate("window.FREEZE = true"); time.sleep(2)
    m = json.loads(pg.evaluate(TEXMB)) if loaded else {}
    steps = json.loads(pg.evaluate("localStorage.getItem('pav-loadlog') || '{}'")).get('steps', [])
    print(f"{label}: loaded {loaded} in {round(time.time() - t0)} s, peak MB {peak}, textures {m}, log: {[s[1] for s in steps if 'Textur' in s[1]]}", flush=True)
    return loaded, m, peak
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=lib.ARGS); ctx = b.new_context(**p.devices['iPhone 13']); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    l1, m1, p1 = visit(pg, 'first visit')
    check('first visit on a phone: textures halved, loads', l1 and m1.get('level') == 1 and m1.get('halved', 0) > 100, str(m1))
    check('decoded texture images < 350 MB (were ~880 MB)', l1 and m1.get('mb', 9999) < 350, f"{m1.get('mb')} MB")
    # a load at level 1 that broke off (Safari dropped the page): the log is left open with its level
    pg.evaluate("localStorage.setItem('pav-loadlog', JSON.stringify({ open: true, at: Date.now() - 60000, t: 23000, steps: [[23000, 'Grafik wird vorbereitet … Texturen 6 von 382']], errs: [], tex: 1 }))")
    pg.evaluate("window.FREEZE = true"); pg.goto('about:blank', timeout=180000); time.sleep(1)
    l2, m2, p2 = visit(pg, 'after a broken-off attempt')
    check('after a broken-off attempt: a quarter, remembered', l2 and m2.get('level') == 2 and m2.get('kept') == '2', str(m2))
    check('less memory again', l2 and m2.get('mb', 9999) < m1.get('mb', 0), f"{m1.get('mb')} → {m2.get('mb')} MB")
    pg.evaluate("window.FREEZE = true"); pg.goto('about:blank', timeout=180000); time.sleep(1)
    l3, m3, p3 = visit(pg, 'next visit')
    check('the quarter is kept on the next visit', l3 and m3.get('level') == 2, str(m3))
    check('no page errors', not errs, '\n'.join(errs[:5]))
    b.close()
print(f"\n{len(ok)} ok, {len(fails)} failed: {fails}")
