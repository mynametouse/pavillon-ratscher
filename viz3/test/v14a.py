# V14 check 1: boot under the artifact CSP (not offline: game on), errors, journal, acts near a few places, first screenshots
import sys, os, time, base64, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = lib.out('v14')
def shot(pg, name, ui=False):
    if ui: pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png')); print('ui', name, flush=True); return
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.86); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 960, 'height': 600}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') else None); pg.on('response', lambda r: errs.append('HTTP %d %s' % (r.status, r.url)) if r.status >= 400 else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/pavillon-ratscher.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000); print('figures', pg.evaluate("JSON.stringify(NPC.real)"), flush=True)
    time.sleep(2); pg.evaluate("window.FREEZE = true")
    print('state', pg.evaluate("JSON.stringify({ on: QUESTS.on, track: QUESTS.track, q: QUESTS.Q, acts: PLAY.acts().length, things: Object.keys(PLAY.things), music: (window.MUSICMAN||[]).length, voices: (VOICEMAN.lines||[]).length })"), flush=True)
    print('errors so far', errs[:12], flush=True)
    # library: what can I do here?
    pg.evaluate("GAME.go('bibliothek')"); r = pg.evaluate("JSON.stringify(GAME.step(0.3))"); print('bib', r, flush=True)
    print('cands', pg.evaluate("PLAY.candidates().map(a => { try { return a.id + ':' + a.label(); } catch (e) { return a.id + ':ERR ' + e.message; } }).filter(s => !s.endsWith(':null')).join(' | ')"), flush=True)
    shot(pg, 'a_bib_cold')
    # look at the stove, ask
    pg.evaluate("GAME.view(0.95, 2.35, 0.316 + 1.62, 0, -15)"); r = pg.evaluate("JSON.stringify(GAME.step(0.2))"); print('stove', r, flush=True)
    pg.evaluate("PLAY.primary()"); pg.evaluate("GAME.step(0.2)"); print('fire', pg.evaluate("JSON.stringify(QUESTS.Q.fire)"), pg.evaluate("document.getElementById('npcsub').textContent"), flush=True)
    shot(pg, 'a_bib_ui', ui=True)
    # light the stove directly, look at it
    pg.evaluate("STOVE.light(true); GAME.step(0.5)"); shot(pg, 'a_stove_lit')
    pg.evaluate("GAME.setMode('dusk'); GAME.view(2.6, 1.4, 0.316 + 1.62, -40, -12); GAME.step(0.3)"); shot(pg, 'a_bib_dusk_fire')
    # sit in the armchair (variant B)
    a = pg.evaluate("(() => { const a = PLAY.acts().find(a => a.id.startsWith('seat:B:armchair')); if (!a) return 'none: ' + PLAY.acts().filter(a=>a.id.startsWith('seat:')).map(a=>a.id).join(','); const p = a.pos(); GAME.view(p[0] + 0.8, p[1] - 0.6, 0.316 + 1.62, -60, -5); GAME.step(0.1); PLAY.run(a); GAME.step(0.8); return JSON.stringify({ seat: !!PLAY.seat, cam: P.cam, yaw: P.yaw }); })()"); print('armchair', a, flush=True)
    shot(pg, 'a_sit_armchair')
    pg.evaluate("PLAY.stand(); GAME.step(0.6)")
    # lie on the daybed
    a = pg.evaluate("(() => { const a = PLAY.acts().find(a => a.id.startsWith('seat:grp:daybed')); if (!a) return 'none'; const p = a.pos(); GAME.view(p[0] + 0.5, p[1] + 0.9, 0.316 + 1.62, 180, -10); GAME.step(0.1); PLAY.run(a); GAME.step(0.8); return JSON.stringify({ seat: PLAY.seat && PLAY.seat.kind, cam: P.cam }); })()"); print('daybed', a, flush=True)
    shot(pg, 'a_lie_daybed'); pg.evaluate("PLAY.stand(); GAME.step(0.6)")
    # OG: piano
    pg.evaluate("GAME.setMode('gold'); GAME.go('arbeitsraum'); GAME.step(0.2)")
    a = pg.evaluate("(() => { const a = PLAY.acts().find(a => a.id === 'piano'); const p = a.pos(); GAME.view(p[0], p[1] - 0.8, 2.986 + 1.62, 0, -10); GAME.step(0.2); const l = a.label(); PLAY.run(a); GAME.step(0.8); return JSON.stringify({ l, seat: PLAY.seat && PLAY.seat.kind, on: PIANO.on, keys: document.querySelectorAll('#pkeys .wk').length }); })()"); print('piano', a, flush=True)
    shot(pg, 'a_piano_ui', ui=True); pg.evaluate("PLAY.stand(); GAME.step(0.6)")
    # records
    a = pg.evaluate("(() => { const a = PLAY.acts().find(a => a.id === 'records'); const p = a.pos(); if (!p) return 'no pos'; GAME.view(p[0], p[1] - 1.0, 2.986 + 1.62, 0, -25); GAME.step(0.2); return JSON.stringify({ p, l: a.label(), best: PLAY.best && PLAY.best.id }); })()"); print('records', a, flush=True)
    shot(pg, 'a_records')
    # workshop: the axe in the block, the can at the generator
    pg.evaluate("GAME.setMode('day'); GAME.go('werkstatt'); GAME.step(0.3)"); shot(pg, 'a_werkstatt')
    a = pg.evaluate("(() => { const T = QUESTS.things.AXE; return JSON.stringify({ axe: T.state, pos: T.pos, kids: T.world.children.length, can: QUESTS.things.CAN.pos }); })()"); print('workshop things', a, flush=True)
    pg.evaluate("(() => { const p = QUESTS.things.AXE.pos; GAME.view(p[0] + 1.3, p[1] + 1.0, 1.62, -125, -28); })()"); shot(pg, 'a_axe_block')
    pg.evaluate("(() => { const p = QUESTS.things.CAN.pos; GAME.view(p[0] - 1.4, p[1] + 1.1, 1.62, 120, -25); })()"); shot(pg, 'a_can')
    # take the axe: held view
    pg.evaluate("(() => { const T = QUESTS.things.AXE; GAME.view(T.pos[0] + 0.9, T.pos[1] + 0.5, 1.62, -120, -20); GAME.step(0.2); PLAY.give(T); GAME.step(0.3); })()"); shot(pg, 'a_axe_held')
    print('errors', [e for e in errs if 'Texture marked' not in e][:20], flush=True); b.close()
