# V15a check: menu instead of button rows, HUD (bar of things, actions, task), inventory, postures and jumping, third-person view
import sys, os, time, base64, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = lib.out('v15'); os.makedirs(OUT, exist_ok=True)
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda n: not only or n in only
def ui(pg, name): pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=240000); print('ui', name, flush=True)
def shot(pg, name):
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.86); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
HELP = r"""
window.__T = {
  act(id) { return PLAY.acts().find(a => a.id === id); },
  pos(a) { return typeof a.pos === 'function' ? a.pos() : a.pos; },
  go(id, d = 1.0, floor = 0) { const a = this.act(id); if (!a) return 'no act ' + id; const p = this.pos(a); const ang = Math.atan2(GAME.P.x - p[0], GAME.P.y - p[1]);
    const x = p[0] + Math.sin(ang) * d, y = p[1] + Math.cos(ang) * d, yaw = Math.atan2(p[0] - x, p[1] - y) * 180 / Math.PI;
    GAME.view(x, y, floor + 1.62, yaw, -14); GAME.P.body = yaw; GAME.step(0.1); let l = null; try { l = a.label(); } catch (e) { l = 'ERR ' + e.message; } return l; },
  run(id) { const a = this.act(id); if (!a) return 'no act'; const l = a.label(); PLAY.run(a); GAME.step(0.2); return l; },
  inv() { return PLAY.inv.slots.map((t, i) => t ? (i + ':' + t.id) : null).filter(Boolean).join(' ') + ' sel=' + PLAY.inv.sel + ' carry=' + (PLAY.carry ? PLAY.carry.id : '-'); },
  pst() { const P = GAME.P; return { st: P.stance, eye: +P.eyeH.toFixed(2), feet: +P.feet.toFixed(2), vz: +P.vz.toFixed(2), air: P.air, view: GAME.CAM3.on, cur: +GAME.CAM3.cur.toFixed(2) }; }
};
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1100, 'height': 680}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000)
    pg.wait_for_function("!window.AVATAR || AVATAR.ready || AVATAR.failed", timeout=900000, polling=1000)
    time.sleep(1); pg.evaluate("window.FREEZE = true"); pg.evaluate(HELP); E = lambda js: pg.evaluate(js)
    print('avatar', E("window.AVATAR ? JSON.stringify({ready: AVATAR.ready, failed: AVATAR.failed, kind: AVATAR.kind}) : 'none'"), flush=True)
    if want('menu'):
        ui(pg, 'a1_orbit')
        pg.click('#menubtn'); time.sleep(0.6); ui(pg, 'a2_menu')
        print('menu open', E("HUD.open"), 'phases in', E("document.querySelector('.phases').parentNode.id"), flush=True)
        pg.keyboard.press('Escape'); time.sleep(0.3); print('after esc', E("HUD.open"), flush=True)
        pg.click('#menubtn'); time.sleep(0.4); pg.click('#menu [data-spot="werkstatt"]'); time.sleep(0.6)
        print('mode', E("GAME.P.mode"), 'menu', E("HUD.open"), 'phases in', E("document.querySelector('.phases').parentNode.id"), flush=True)
        E("GAME.step(0.5)"); ui(pg, 'a3_walk')
    if want('inv'):
        E("QUESTS.reset(); GAME.go('werkstatt'); GAME.step(0.3)")
        print('axe', E("__T.go('take:axe', 0.9)"), E("__T.run('take:axe')"), E("__T.inv()"), flush=True)
        print('can', E("__T.go('take:can', 0.9)"), E("__T.run('take:can')"), E("__T.inv()"), flush=True)
        time.sleep(2.5); E("HUD.render()"); time.sleep(0.5)
        pg.keyboard.press('Digit1'); time.sleep(0.2); print('key1', E("__T.inv()"), flush=True)
        pg.keyboard.press('Digit1'); time.sleep(0.2); print('key1 again (hands free)', E("__T.inv()"), flush=True)
        pg.keyboard.press('Digit2'); time.sleep(0.2); print('key2', E("__T.inv()"), flush=True)
        E("GAME.step(0.3)"); ui(pg, 'b1_bar')
        pg.keyboard.press('i'); time.sleep(0.5); print('inv open', E("HUD.invOpen"), flush=True); ui(pg, 'b2_inv')
        pg.click('#invwin .is[data-i="0"]'); time.sleep(0.2); pg.click('#invwin .is[data-i="9"]'); time.sleep(0.3); print('swap 0→9', E("__T.inv()"), flush=True)
        pg.keyboard.press('Escape'); time.sleep(0.3); print('inv after esc', E("HUD.invOpen"), 'menu', E("HUD.open"), flush=True)
        print('chop needs axe from bag:', E("__T.go('fire:chop', 1.0)"), flush=True)
        E("QUESTS.Q.fire.st = 'chop'"); print('label', E("__T.act('fire:chop').label()"), flush=True)
        print('run chop', E("__T.run('fire:chop')"), E("__T.inv()"), flush=True)
    if want('move'):
        E("GAME.go('garten'); GAME.setView3(false); GAME.step(0.3)")
        for k in ['c', 'x', 'z', 'z']:
            pg.keyboard.press(k); E("GAME.step(0.6)"); print('key', k, E("JSON.stringify(__T.pst())"), flush=True)
        pg.keyboard.press(' '); out = []
        for i in range(8): E("GAME.step(0.08)"); out.append(E("GAME.P.feet.toFixed(2)"))
        E("GAME.step(0.6)"); print('jump feet', out, E("JSON.stringify(__T.pst())"), flush=True)
        # under the workshop roof: no standing up under the low parts? (just a check that headroom works at all)
        E("GAME.go('bibliothek'); GAME.step(0.3)"); pg.keyboard.press(' '); E("GAME.step(1.0)"); print('jump indoors', E("JSON.stringify(__T.pst())"), flush=True)
    if want('third'):
        print('avatar ready', E("!!(window.AVATAR && AVATAR.ready)"), flush=True)
        E("GAME.go('garten'); GAME.setView3(true); GAME.step(0.5)"); print('3rd', E("JSON.stringify(__T.pst())"), flush=True); shot(pg, 'c1_third_garden'); ui(pg, 'c1_third_ui')
        E("GAME.go('bibliothek'); GAME.step(0.6)"); print('3rd in', E("JSON.stringify(__T.pst())"), flush=True); shot(pg, 'c2_third_library')
        E("GAME.go('werkstatt'); GAME.step(0.6)"); shot(pg, 'c3_third_workshop')
        for k in ['c', 'x', 'z']:
            pg.keyboard.press(k); E("GAME.step(0.8)"); shot(pg, 'c4_stance_' + k)
        pg.keyboard.press('z'); E("GAME.step(0.6)")
        E("GAME.step(1.2, 1, 0, 0)"); shot(pg, 'c5_walk')
    if want('hud3'):
        E("QUESTS.reset(); GAME.go('garten'); GAME.setView3(true); GAME.step(0.6)"); E("PLAY.give(QUESTS.things.AXE); PLAY.give(QUESTS.things.CAN); GAME.step(0.6)")
        time.sleep(3); E("HUD.render(); GAME.step(0.3)"); ui(pg, 'h1_third_hud')
        E("GAME.go('bibliothek'); GAME.step(0.6)"); ui(pg, 'h2_third_inside')
        E("GAME.go('hubert'); GAME.step(0.3)"); print('bench', E("(() => { const a = PLAY.acts().find(a => a.id === 'seat:hubertbench'); GAME.view(-13.25, 1.4, 1.62, 180, -10); GAME.step(0.2); const l = a.label(); PLAY.run(a); GAME.step(1.2); GAME.P.yaw = -60; GAME.P.pitch = -12; GAME.step(0.4); return l; })()"), flush=True); ui(pg, 'h3_bench')
    if want('phone'):
        ctx = b.new_context(viewport={'width': 390, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mp = ctx.new_page(); mp.on('pageerror', lambda e: errs.append('M PAGEERR ' + str(e)))
        mp.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
        mp.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); time.sleep(2); mp.evaluate("window.FREEZE = true")
        mp.evaluate("GAME.shot()"); mp.screenshot(path=os.path.join(OUT, 'd1_phone_orbit.png'), timeout=240000)
        mp.tap('#menubtn'); time.sleep(0.6); mp.screenshot(path=os.path.join(OUT, 'd2_phone_menu.png'), timeout=240000)
        mp.tap('#menu [data-spot="garten"]'); time.sleep(0.6); mp.wait_for_function("window.AVATAR && (AVATAR.ready || AVATAR.failed)", timeout=600000, polling=1000); mp.evaluate("GAME.step(0.8); GAME.shot()"); mp.screenshot(path=os.path.join(OUT, 'd3_phone_walk.png'), timeout=240000)
        print('phone mode', mp.evaluate("GAME.P.mode"), 'moves visible', mp.evaluate("getComputedStyle(document.getElementById('moves')).display"), flush=True)
    print('\n'.join(errs[:40]) or 'no errors', flush=True)
    b.close()
