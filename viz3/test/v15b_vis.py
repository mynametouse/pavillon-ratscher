# V15b visual check: boards built directly in given states (finished on the bench, slices on the glue table), the figure with protective gear,
# the tent, the sawdust; quick compared to running the whole process
import sys, os, time, base64, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = lib.out('v15b'); os.makedirs(OUT, exist_ok=True)
HELP = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'v15b.py')).read().split('HELP = r"""')[1].split('"""')[0]
def shot(pg, name):
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
MK = r"""
window.__mk = (st, at, o) => { const wp = WERK.newWP(st, Object.assign({ L: 500, fence: 45, Zcur: 43, Z: 43, rmB: [0, 1], stop: 42, H: 39.5 }, o || {}));
  wp.strips = []; for (let i = 0; i < 8; i++) wp.strips.push({ v0: i * 48.2, fa: false, fb: i % 2 === 1 });
  wp.slices = []; for (let j = 0; j < 10; j++) wp.slices.push({ flip: j % 2 === 1 });
  WERK.ST[at].wp = wp; wp.where = at; WERK.render(at); return wp.id; };
0;
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1100, 'height': 680}); lib.preset(pg); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type == 'error' else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.AVATAR || AVATAR.ready || AVATAR.failed", timeout=900000, polling=1000); time.sleep(3)
    pg.evaluate("window.FREEZE = true"); pg.evaluate(HELP); pg.evaluate(MK); E = lambda js: pg.evaluate(js)
    E("QUESTS.reset(); GAME.go('werkstatt'); GAME.setView3(false, true); GAME.step(0.3)")
    # a finished board on the bench (oak, oiled, branded, chamfered) and slices on the glue table
    E("__mk('finish', 'bench', { trim: true, cham: true, grit: 240, oil: { n: 2, t: 0, wiped: true, rag: false }, brand: 1 })")
    E("__mk('lay2', 'glue', { H: 42 })")
    E("(() => { const [x, y] = WERK.WT(-0.75, -39.62), [tx, ty] = WERK.WT(-0.9, -40.12); __W.look(x, y, 1.25, tx, ty, 0.9, 40); })()"); shot(pg, 'v1_board_oiled')
    E("(() => { const [x, y] = WERK.WT(-3.2, -39.55), [tx, ty] = WERK.WT(-3.32, -40.02); __W.look(x, y, 1.3, tx, ty, 0.88, 42); })()"); shot(pg, 'v2_slices')
    # fumed board (Räuchereiche) on the bench
    E("(() => { const S = WERK.ST.bench; S.wp = null; WERK.render('bench'); __mk('finish', 'bench', { trim: true, cham: true, grit: 240, oil: { n: 2, t: 0, wiped: true, rag: false }, brand: 1, fum: { B: { H: 40, rm: [0, 0] } }, rmT: [0.3, 0.3] }); })()")
    E("(() => { const [x, y] = WERK.WT(-0.75, -39.62), [tx, ty] = WERK.WT(-0.9, -40.12); __W.look(x, y, 1.25, tx, ty, 0.9, 40); })()"); shot(pg, 'v3_board_fumed')
    # stripes: every second slice fumed, raw end grain
    E("(() => { const S = WERK.ST.bench; S.wp = null; WERK.render('bench'); __mk('flat', 'bench', { fum: { sl: [0,1,2,3,4,5,6,7,8,9].map(j => j % 2 ? null : { H: 30, rm: [0, 0] }) }, rmT: [1.5, 1.5] }); })()")
    E("(() => { const [x, y] = WERK.WT(-0.75, -39.62), [tx, ty] = WERK.WT(-0.9, -40.12); __W.look(x, y, 1.25, tx, ty, 0.9, 40); })()"); shot(pg, 'v4_board_stripes')
    # the figure with gear, from the front
    E("__W.ppe(['korb', 'ohr', 'abek'])"); E("(() => { const [x, y] = WERK.WT(0.6, -33.6); GAME.view(x, y, 1.62, 180, -6); GAME.P.body = 0; GAME.setView3(true, true); GAME.step(1.0); GAME.CAM3.d = 1.9; GAME.step(1.0); })()")
    print('cam3', E("JSON.stringify({on: GAME.CAM3.on, cur: GAME.CAM3.cur, gear: !!(AVATAR.fig && AVATAR.fig.gear)})"), flush=True); shot(pg, 'v5_fig_korb')
    E("__W.ppe(['brille', 'ohr', 'ffp2'])"); E("GAME.step(0.6)"); shot(pg, 'v6_fig_brille')
    E("AVATAR.setKind('f')"); pg.wait_for_function("AVATAR.fig && AVATAR.fig.kind === 'f'", timeout=300000, polling=1000); E("GAME.step(0.8)"); shot(pg, 'v7_fig_f'); E("AVATAR.setKind('m')")
    E("GAME.setView3(false, true); __W.atXY(5.6, -37.6, 5.15, -40.1, 0.4)"); shot(pg, 'v8_tent')
    E("__W.atXY(-3.5, -30.0, -1.4, -33.0, 0.0)"); shot(pg, 'v9_sawdust')
    print('\n'.join(errs[:30]) or 'no errors', flush=True)
    b.close()
