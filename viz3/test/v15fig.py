# V15a figure check: third-person view with the player figure (man / woman): standing, walking, running, postures, carrying, sitting, lying, jumping
import sys, os, time, base64, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = lib.out('v15fig'); os.makedirs(OUT, exist_ok=True)
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda n: not only or n in only
def shot(pg, name):
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.86); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
HELP = r"""
window.__T = {
  act(id) { return PLAY.acts().find(a => a.id === id); },
  pos(a) { return typeof a.pos === 'function' ? a.pos() : a.pos; },
  go(id, d = 1.0, floor = 0) { const a = this.act(id); if (!a) return 'no act ' + id; const p = this.pos(a); const ang = Math.atan2(GAME.P.x - p[0], GAME.P.y - p[1]);
    const x = p[0] + Math.sin(ang) * d, y = p[1] + Math.cos(ang) * d, yaw = Math.atan2(p[0] - x, p[1] - y) * 180 / Math.PI;
    GAME.view(x, y, floor + 1.62, yaw, -10); GAME.P.body = yaw; GAME.step(0.1); let l = null; try { l = a.label(); } catch (e) { l = 'ERR ' + e.message; } return l; },
  run(id) { const a = this.act(id); if (!a) return 'no act'; const l = a.label(); PLAY.run(a); GAME.step(0.2); return l; },
  st() { const F = AVATAR.fig; if (!F) return 'no fig'; const w = Object.entries(F.w).filter(([k, v]) => v > 0.05).map(([k, v]) => k + ':' + v.toFixed(2)).join(' '); return { st: GAME.P.stance, sp: +GAME.P.speed.toFixed(2), vis: F.g.visible, cur: +GAME.CAM3.cur.toFixed(2), w }; },
  // stand at (x,y), camera from behind at an angle: yaw = where the camera looks, body turned by db degrees
  place(x, y, yaw, db = 0, pitch = -8, z = 0) { GAME.view(x, y, z + 1.62, yaw, pitch); GAME.P.body = yaw + db; GAME.setView3(true, true); GAME.step(0.4); }
};
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 960, 'height': 600}); lib.preset(pg); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') and 'Texture marked' not in m.text else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000)
    pg.wait_for_function("window.AVATAR && (AVATAR.ready || AVATAR.failed)", timeout=900000, polling=1000)
    time.sleep(1); pg.evaluate("window.FREEZE = true"); pg.evaluate(HELP); E = lambda js: pg.evaluate(js)
    print('avatar', E("JSON.stringify({ready: AVATAR.ready, failed: AVATAR.failed, kind: AVATAR.kind, clips: AVATAR.fig ? Object.keys(AVATAR.fig.clips).length : 0})"), flush=True)
    E("QUESTS.reset(); GAME.setPhase(GAME.PHASES.length - 1)")
    if want('basic'):
        E("__T.place(4.0, 9.0, 180, 0, -6)"); print('idle', E("JSON.stringify(__T.st())"), flush=True); shot(pg, 'a1_idle_back')
        E("__T.place(4.0, 9.0, 0, 180, -6)"); E("GAME.step(0.6)"); shot(pg, 'a2_idle_front')
        E("__T.place(4.0, 9.0, 90, 0, -6)"); E("GAME.step(0.5, 1, 0, 0)"); print('jog', E("JSON.stringify(__T.st())"), flush=True); shot(pg, 'a3_jog')
        E("GAME.step(0.5, 1, 0, 0, 1.9)"); print('sprint', E("JSON.stringify(__T.st())"), flush=True); shot(pg, 'a4_sprint')
        E("__T.place(4.0, 9.0, 90, -90, -6)"); E("GAME.step(0.4, 0, 0, -1)"); shot(pg, 'a5_side_walk')
    if want('stance'):
        for k, nm in [('c', 'crouch'), ('x', 'crawl'), ('z', 'prone')]:
            E("__T.place(4.0, 9.0, 120, -40, -14)"); pg.keyboard.press(k); E("GAME.step(0.9)"); print(nm, E("JSON.stringify(__T.st())"), flush=True); shot(pg, 'b_' + nm)
            if nm == 'crawl': E("GAME.step(0.8, 1, 0, 0)"); shot(pg, 'b_crawl_move')
            pg.keyboard.press(k); E("GAME.step(0.5)")
        E("__T.place(4.0, 9.0, 120, -40, -6)"); pg.keyboard.press(' ')
        E("GAME.step(0.25)"); print('jump', E("JSON.stringify(__T.st())"), E("GAME.P.feet.toFixed(2)"), flush=True); shot(pg, 'b_jump')
        E("GAME.step(1.0)")
    if want('carry'):
        print('axe', E("__T.go('take:axe', 0.9)"), E("__T.run('take:axe')"), flush=True); E("GAME.step(1.5)"); E("GAME.P.yaw += 130; GAME.step(0.4)"); shot(pg, 'c1_axe')
        print('can', E("__T.go('take:can', 0.9)"), E("__T.run('take:can')"), flush=True); E("GAME.step(1.5)"); E("__T.place(6.0, 10.0, 0, 180, -10)"); E("PLAY.toHand(QUESTS.things.CAN); GAME.step(0.6)"); shot(pg, 'c2_can')
        E("PLAY.give(QUESTS.things.HAY); GAME.step(0.6)"); shot(pg, 'c3_hay_front'); E("__T.place(6.0, 10.0, 60, 180, -10)"); E("PLAY.give(QUESTS.things.HAY); GAME.step(0.4, 1, 0, 0)"); shot(pg, 'c3_hay_walk')
        E("QUESTS.Q.fire.st = 'chop'; PLAY.toHand(QUESTS.things.AXE)"); print('chop', E("__T.go('fire:chop', 1.0)"), flush=True); E("GAME.P.yaw += 60; GAME.step(0.2)")
        E("PLAY.run(__T.act('fire:chop'))"); E("GAME.step(0.45)"); shot(pg, 'c4_chop')
        E("GAME.step(1.2)")
    if want('seat'):
        E("PLAY.clearInv()")
        print('bench', E("__T.go('seat:guenterbench', 1.0)"), E("__T.run('seat:guenterbench')"), flush=True); E("GAME.step(1.0)"); E("GAME.P.yaw += 150; GAME.step(0.4)"); print('sit', E("JSON.stringify(__T.st())"), flush=True); shot(pg, 'd1_sit_bench')
        E("PLAY.stand(true); GAME.step(0.6)")
        lie = E("(PLAY.acts().find(a => a.id.startsWith('seat:') && /Liege/.test((()=>{try{return a.label()||''}catch(e){return ''}})())) || {}).id || null")
        print('lounger act', lie, flush=True)
        if lie:
            print('lie', E(f"__T.go('{lie}', 1.0)"), E(f"__T.run('{lie}')"), flush=True); E("GAME.step(1.0)"); E("GAME.P.yaw += 120; GAME.P.pitch = -25; GAME.step(0.4)"); shot(pg, 'd2_lounger'); E("PLAY.stand(true); GAME.step(0.5)")
        E("GAME.go('bibliothek'); GAME.step(0.4)"); shot(pg, 'd3_library_3rd')
        E("GAME.go('lounge'); GAME.step(0.4)"); shot(pg, 'd4_lounge_3rd')
    if want('female'):
        E("AVATAR.setKind('f')"); pg.wait_for_function("AVATAR.fig && AVATAR.fig.kind === 'f'", timeout=300000, polling=1000)
        E("__T.place(4.0, 9.0, 180, 0, -6)"); E("GAME.step(0.6)"); shot(pg, 'e1_female_back')
        E("__T.place(4.0, 9.0, 0, 180, -6)"); E("GAME.step(0.6)"); shot(pg, 'e2_female_front')
        E("__T.place(4.0, 9.0, 90, 0, -6)"); E("GAME.step(0.5, 1, 0, 0)"); shot(pg, 'e3_female_jog')
        E("AVATAR.setKind('m')")
    print('\n'.join(errs[:40]) or 'no errors', flush=True)
    b.close()
