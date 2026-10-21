# realism check views (before/after): python3 realviews.py PORT PREFIX [names] [w h]
import sys, os, time, base64, json
from playwright.sync_api import sync_playwright
port = sys.argv[1]; prefix = sys.argv[2]; QARG = os.environ.get('QARG', ''); only = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] != 'all' else None
W, H = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (1100, 640)
OUT = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/real'; os.makedirs(OUT, exist_ok=True)
VIEWS = [
  ('modell', "GAME.orbit(225, 16, 21)"),
  ('garten', "GAME.go('garten')"),
  ('ronald', "(() => { const w = NPC.NPCS.ronald; w.target = null; w.wait = 30; GAME.view(w.x - 3.2, w.y - 1.0, 1.62, Math.atan2(3.2, 1.0) * 180 / Math.PI, -6, 55); })()"),
  ('ziegen', "(() => { const g = NPC.GOATS[0]; g.target = null; g.wait = 30; GAME.view(g.x - 3.0, g.y - 1.4, 1.5, Math.atan2(3.0, 1.4) * 180 / Math.PI, -14, 55); })()"),
  ('hubert', "(() => { const w = NPC.NPCS.hubert; w.target = null; w.wait = 30; GAME.view(w.x + 3.2, w.y - 1.0, 1.62, Math.atan2(-3.2, 1.0) * 180 / Math.PI, -6, 55); })()"),
  ('bungalow', "GAME.view(3.2, 9.0, 1.62, 40, 2, 68)"),
  ('holzhaus', "GAME.view(7.6, -9.6, 1.62, 40, 3, 68)"),
  ('carport', "GAME.go('carport')"),
  ('innen_eg', "GAME.go('bibliothek')"),
  ('innen_og', "GAME.go('arbeitsraum')"),
  ('werkstatt', "GAME.view(-1.5, -31.0, 1.62, 180, -4, 68)"),
  ('pavillon', "GAME.view(9.5, -5.5, 1.62, -58, 6, 66)"),
  ('p_bungalow', "GAME.view(8.9, 21.0, 1.6, 180, -14, 60)"),
  ('p_werkstatt', "GAME.view(8.2, -34.2, 1.6, 230, -12, 60)"),
  ('p_compost', "GAME.view(-5.6, -33.6, 1.6, 230, -14, 60)"),
  ('p_hubert', "GAME.view(-14.2, 31.4, 1.6, 235, -14, 60)"),
  ('p_gartenset', "GAME.view(3.6, 9.3, 1.6, 315, -14, 60)"),
  ('innen_gi', "GAME.go('bibliothek')"),
  ('bach', "(() => { const S = STREAM, t = S.TB + 9, p = S.wpt(t, S.cOff(t) - 2.4), q = S.wpt(S.TB, S.cOff(S.TB)); GAME.view(p[0], p[1], 1.55, Math.atan2(q[0] - p[0], q[1] - p[1]) * 180 / Math.PI, -16, 62); })()"),
  ('dorf', "GAME.view(-14.0, 44.0, 1.7, 300, 1, 60)"),
]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None); pg.on('response', lambda r: errs.append('HTTP %d %s' % (r.status, r.url)) if r.status >= 400 else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html?offline=1' + QARG, timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000); print('figures', pg.evaluate("JSON.stringify(NPC.real)"), flush=True)
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e=>e.style.visibility='hidden')")
    pg.evaluate(f"GAME.setMode('{os.environ.get('MODE', 'gold')}'); GAME.setPhase(GAME.PHASES.length-1)"); time.sleep(3)
    for name, js in VIEWS:
        if only and name not in only: continue
        t = time.time(); pg.evaluate(js); time.sleep(0.4); pg.evaluate("GAME.shot()"); pg.evaluate("GAME.shot()")
        d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.88)")
        open(os.path.join(OUT, f'{prefix}_{name}.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, round(time.time() - t, 1), 's', flush=True)
    print('errors', errs[:8]); b.close()
