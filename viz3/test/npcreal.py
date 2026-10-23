# realistic NPC check: python3 npcreal.py PORT PREFIX [MODE]
import sys, os, time, base64
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port, prefix = sys.argv[1], sys.argv[2]; MODE = sys.argv[3] if len(sys.argv) > 3 else 'day'
OUT = lib.out('real')
def shot(pg, name):
    pg.evaluate("GAME.shot()"); pg.evaluate("GAME.shot()"); d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.88)")
    open(os.path.join(OUT, f'{prefix}_{name}.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1000, 'height': 640}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type in ('error', 'warning') else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html?offline=1', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000); print('real', pg.evaluate("JSON.stringify(NPC.real)"), round(time.time() - t0), 's', flush=True)
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e=>e.style.visibility='hidden')")
    pg.evaluate(f"GAME.setMode('{MODE}'); GAME.setPhase(GAME.PHASES.length-1)"); time.sleep(2)
    # standing figures, close
    pg.evaluate("window.LIFE && LIFE.force('hubert', 'off'); window.LIFE && LIFE.force('ronald', 'off');")  # since 23.10.2026 they follow a day plan (npc/life.js) – posed by hand here
    pg.evaluate("(() => { const w = NPC.NPCS.ronald; w.target = null; w.wait = 60; w.az = 0.4; w.place(); GAME.view(w.x + Math.sin(0.4) * 2.6, w.y + Math.cos(0.4) * 2.6, 1.6, (0.4 * 180 / Math.PI) + 180, -8, 50); })()"); time.sleep(1.5); shot(pg, 'ronald_front')
    pg.evaluate("(() => { const w = NPC.NPCS.ronald; GAME.view(w.x + Math.sin(0.4) * 1.1, w.y + Math.cos(0.4) * 1.1, 1.62, (0.4 * 180 / Math.PI) + 180, -6, 40); })()"); time.sleep(0.5); shot(pg, 'ronald_face')
    pg.evaluate("(() => { const w = NPC.NPCS.hubert; w.target = null; w.wait = 60; w.az = 1.2; w.place(); GAME.view(w.x + Math.sin(1.2) * 2.6, w.y + Math.cos(1.2) * 2.6, 1.6, (1.2 * 180 / Math.PI) + 180, -8, 50); })()"); time.sleep(1.5); shot(pg, 'hubert_front')
    pg.evaluate("(() => { const w = NPC.NPCS.hubert; GAME.view(w.x + Math.sin(1.2) * 1.1, w.y + Math.cos(1.2) * 1.1, 1.6, (1.2 * 180 / Math.PI) + 180, -6, 40); })()"); time.sleep(0.5); shot(pg, 'hubert_face')
    # walking: side view while he walks
    pg.evaluate("(() => { const w = NPC.NPCS.ronald; w.target = [w.x + 8, w.y]; w.az = Math.PI / 2; })()"); time.sleep(1.2)
    pg.evaluate("(() => { const w = NPC.NPCS.ronald; GAME.view(w.x + 0.6, w.y - 3.2, 1.3, 0, -4, 50); })()"); time.sleep(0.25); shot(pg, 'ronald_walk')
    pg.evaluate("(() => { const w = NPC.NPCS.hubert; w.target = [w.x, w.y + 9]; w.az = 0; })()"); time.sleep(1.2)
    pg.evaluate("(() => { const w = NPC.NPCS.hubert; GAME.view(w.x + 3.2, w.y + 0.6, 1.3, -90, -4, 50); })()"); time.sleep(0.25); shot(pg, 'hubert_walk')
    # goats
    pg.evaluate("(() => { const g = NPC.GOATS; g.forEach((x, i) => { x.target = null; x.wait = 60; }); const a = g[0]; GAME.view(a.x - 3.0, a.y - 2.0, 1.3, Math.atan2(3.0, 2.0) * 180 / Math.PI, -10, 55); })()"); time.sleep(2); shot(pg, 'ziegen')
    pg.evaluate("(() => { const g = NPC.GOATS[1]; g.target = [g.x - 6, g.y]; })()"); time.sleep(1.0)
    pg.evaluate("(() => { const g = NPC.GOATS[1]; GAME.view(g.x + 0.4, g.y - 2.6, 0.9, 0, -6, 50); })()"); time.sleep(0.2); shot(pg, 'ziege_walk')
    pg.evaluate("NPC.startDrive()"); time.sleep(4)
    pg.evaluate("(() => { const t = NPC.TRACTOR.g.position; GAME.view(t.x + 3.0, -t.z - 2.0, 1.7, -55, -8, 55); })()"); time.sleep(0.3); shot(pg, 'traktor')
    print('errors', [e for e in errs if 'Datei fehlt' not in e][:10]); b.close()
