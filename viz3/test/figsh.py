# figure sun shadows: python3 figsh.py PORT PREFIX MODE[,MODE] [QARG]  — wide views of Ronald, Hubert, goats, tractor with their shadows
import sys, os, time, base64, math
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port, prefix = sys.argv[1], sys.argv[2]; MODES = (sys.argv[3] if len(sys.argv) > 3 else 'gold').split(','); QARG = sys.argv[4] if len(sys.argv) > 4 else ''
OUT = lib.out('real')
def shot(pg, name):
    pg.evaluate("GAME.shot()"); pg.evaluate("GAME.shot()"); d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.88)")
    open(os.path.join(OUT, f'{prefix}_{name}.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, pg.evaluate("JSON.stringify({on: FIGSH_STATE()})"), flush=True)
# camera placed off to the side of the figure, so that figure and its (long) shadow are both in the picture
VIEW = """(([x, y, side, dist, h, pitch, fov]) => { const sd = GAME_SUNAZ(); const shAz = sd + 180; const camAz = shAz + side; const r = camAz * Math.PI / 180;
  const cx = x + Math.sin(r) * dist, cy = y + Math.cos(r) * dist; const look = (Math.atan2(x + Math.sin(shAz * Math.PI / 180) * 2.5 - cx, y + Math.cos(shAz * Math.PI / 180) * 2.5 - cy) * 180 / Math.PI);
  GAME.view(cx, cy, h, look, pitch, fov); })"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1000, 'height': 640}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('response', lambda r: errs.append('HTTP %d %s' % (r.status, r.url)) if r.status >= 400 else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html?offline=1' + QARG, timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000); print('real', pg.evaluate("JSON.stringify(NPC.real)"), round(time.time() - t0), 's', flush=True)
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e=>e.style.visibility='hidden')")
    pg.evaluate("window.FIGSH_STATE = () => (window.FIGSHADOW ? 'pass' : 'nopass'); window.GAME_SUNAZ = () => { const M = { day: 228, gold: 246, dusk: 262 }; return M[window.MODE_NOW] || 246; }")
    for mode in MODES:
        pg.evaluate(f"GAME.setMode('{mode}'); GAME.setPhase(GAME.PHASES.length-1)"); time.sleep(2)
        pg.evaluate("(() => { const w = NPC.NPCS.ronald; w.target = null; w.wait = 90; w.place(); })()")
        pg.evaluate(f"(() => {{ const w = NPC.NPCS.ronald; ({VIEW})([w.x, w.y, 75, 6.5, 2.0, -14, 62]); }})()"); time.sleep(1.2); shot(pg, f'{mode}_ronald')
        pg.evaluate(f"(() => {{ const w = NPC.NPCS.ronald; ({VIEW})([w.x, w.y, -60, 3.2, 1.65, -18, 55]); }})()"); time.sleep(0.6); shot(pg, f'{mode}_ronald_near')
        pg.evaluate("(() => { const w = NPC.NPCS.hubert; w.target = null; w.wait = 90; w.place(); })()")
        pg.evaluate(f"(() => {{ const w = NPC.NPCS.hubert; ({VIEW})([w.x, w.y, 70, 7.5, 2.2, -14, 62]); }})()"); time.sleep(1.2); shot(pg, f'{mode}_hubert')
        pg.evaluate("NPC.GOATS.forEach(x => { x.target = null; x.wait = 90; })")
        pg.evaluate(f"(() => {{ const a = NPC.GOATS[0]; ({VIEW})([a.x, a.y, 80, 5.5, 1.7, -16, 60]); }})()"); time.sleep(1.5); shot(pg, f'{mode}_ziegen')
    print('errors', [e for e in errs if 'Datei fehlt' not in e][:10]); b.close()
