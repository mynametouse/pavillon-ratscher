# V15b save/reload: work on a board up to the first glue-up in the clamps, carry a tool, store a blank; reload the page; check that the
# workpieces, the clamps, the tools and the clock come back. Also Ronald's board quest and the tracker text; the phone layout of the windows.
import sys, os, time, base64, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = lib.out('v15b'); os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
HELP = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'v15b.py')).read().split('HELP = r"""')[1].split('"""')[0]
def shot(pg, name):
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.88); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
def boot(pg):
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.AVATAR || AVATAR.ready || AVATAR.failed", timeout=900000, polling=1000); time.sleep(3); pg.evaluate("window.FREEZE = true"); pg.evaluate(HELP)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1000, 'height': 640}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type == 'error' else None)
    boot(pg); E = lambda js: pg.evaluate(js); L = lambda s: print(s, flush=True)
    E("QUESTS.reset(); GAME.go('werkstatt'); GAME.setView3(false, true); GAME.step(0.3)")
    # the quest with Ronald
    L('topics ' + E("JSON.stringify(QUESTS.topics('ronald'))"))
    L('ask ' + E("(() => { const r = QUESTS.ask('ronald', 'q_werkstatt'); r.after(); return QUESTS.Q.board.st + ' | ' + QUESTS.objective('board')[0]; })()"))
    E("__W.ppe(['brille', 'ohr'])")
    L('to clamps: ' + E("""(() => { __W.atXY(2.15, -39.6, 2.15, -40.3, 0.5); __W.run('werk:rack'); __W.at('saw'); __W.op('saw'); __W.go(); __W.op('saw'); __W.op('saw'); __W.go(); __W.rep('saw', 'Kantel', 0, 12); __W.op('saw');
      __W.at('glue'); __W.op('glue'); __W.op('glue'); __W.check('dry'); __W.check('foil'); __W.check('cauls'); __W.go(); __W.rep('glue', 'Leim auftragen', 0.7, 12); __W.op('glue'); __W.rep('glue', 'Zwinge', 0.68, 8); __W.op('glue');
      return __W.stwp('glue') + ' | rack ' + WERK.RACK.items.map(w => w.st).join(',') + ' | inv ' + PLAY.inv.slots.filter(Boolean).map(t => t.id).join(',') + ' | ' + QUESTS.objective('board')[0]; })()"""))
    E("GAME.step(0.6)"); time.sleep(1.5)
    before = E("JSON.stringify({ glue: __W.stwp('glue'), clamps: WERK.ST.glue.wp && WERK.ST.glue.wp.g && WERK.ST.glue.wp.g.clamps.length, rack: WERK.RACK.items.length, clock: CLOCK.hm(), gear: GEAR.on, inv: PLAY.inv.slots.filter(Boolean).map(t => t.id) })")
    L('before ' + before)
    pg.reload(timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); time.sleep(4); pg.evaluate("window.FREEZE = true"); pg.evaluate(HELP)
    E("GAME.go('werkstatt'); GAME.step(0.5)")
    after = E("JSON.stringify({ glue: __W.stwp('glue'), clamps: WERK.ST.glue.wp && WERK.ST.glue.wp.g && WERK.ST.glue.wp.g.clamps.length, rack: WERK.RACK.items.length, clock: CLOCK.hm(), gear: GEAR.on, inv: PLAY.inv.slots.filter(Boolean).map(t => t.id) })")
    L('after  ' + after); L('quest ' + E("QUESTS.Q.board.st + ' | ' + QUESTS.objective('board')[0]"))
    E("(() => { const [x, y] = WERK.WT(-2.6, -39.3), [tx, ty] = WERK.WT(-3.32, -40.02); __W.look(x, y, 1.45, tx, ty, 0.9, 55); })()"); shot(pg, 'r1_after_reload')
    L('continue: ' + E("(() => { __W.at('glue'); const a = __W.op('glue'); const c = __W.op('glue'); return a + ' | ' + c + ' -> ' + __W.stwp('glue'); })()"))
    # textures of the board in several states (painted from the material points)
    tex = E("""(() => { const wp = WERK.newWP('panel'); const out = {}; const dump = k => { const T = WERK.faceTextures(wp); out[k + '_top'] = T.top.toDataURL('image/png'); out[k + '_end'] = T.end.toDataURL('image/png'); out[k + '_edge'] = T.edge.toDataURL('image/png'); };
      dump('a_panel'); wp.L = 500; wp.st = 'panel1'; wp.fence = 45; wp.strips = []; for (let i = 0; i < 8; i++) wp.strips.push({ v0: i * 48.2, fa: false, fb: i % 2 === 1 }); wp.Zcur = 43; wp.rmB = [0, 1]; wp.Z = 43; dump('b_panel1');
      wp.st = 'board'; wp.slices = []; for (let j = 0; j < 10; j++) wp.slices.push({ flip: j % 2 === 1 }); wp.H = 42; wp.stop = 42; wp.rmT = [1.5, 1.5]; dump('c_board');
      wp.fum = { B: { H: 30, rm: [1.5, 1.5] } }; wp.rmT = [1.8, 1.8]; dump('d_fumed'); wp.fum = { sl: wp.slices.map((s, j) => j % 2 ? null : { H: 30, rm: [0, 0] }) }; dump('e_stripes'); wp.fum = { P: 40 }; dump('f_panelfumed');
      WERK.W.list.splice(WERK.W.list.indexOf(wp), 1); return out; })()""")
    for k, u in tex.items(): open(os.path.join(OUT, 't_' + k + '.png'), 'wb').write(base64.b64decode(u.split(',')[1]))
    print('textures', len(tex), flush=True)
    # the figure with protective gear, seen from the front
    E("__W.ppe(['korb', 'ohr', 'abek'])"); E("(() => { const [x, y] = WERK.WT(0.6, -33.6); GAME.view(x, y, 1.62, 180, -6); GAME.P.body = 0; GAME.setView3(true, true); GAME.step(1.0); })()"); print('cam3', E("JSON.stringify({on: GAME.CAM3.on, cur: GAME.CAM3.cur})"), flush=True); shot(pg, 'g1_figure_korb_abek')
    E("__W.ppe(['brille', 'ohr', 'ffp2'])"); E("GAME.step(0.6)"); shot(pg, 'g2_figure_brille_ffp2')
    E("GAME.setView3(false, true); GAME.go('werkstatt'); GAME.step(0.5)"); shot(pg, 'g3_spot_werkstatt')
    # phone: the machine window and the card
    mp = ctx.new_page(); mp.set_viewport_size({'width': 390, 'height': 780})
    mp.on('pageerror', lambda e: errs.append('M PAGEERR ' + str(e)))
    boot(mp); mp.evaluate("GAME.go('werkstatt'); GAME.step(0.3)")
    mp.evaluate("(() => { __W.at('saw'); return __W.lbl('werk:saw'); })()"); mp.evaluate("WERK.carriedWP() || 0")
    print('phone saw', mp.evaluate("(() => { __W.atXY(2.15, -39.6, 2.15, -40.3, 0.5); const r = __W.lbl('werk:rack'); __W.run('werk:rack'); __W.at('saw'); __W.run('werk:saw'); return r + ' | ' + __W.win(); })()"), flush=True)
    mp.evaluate("GAME.shot()"); mp.screenshot(path=os.path.join(OUT, 'p1_phone_machine.png'), timeout=240000)
    mp.evaluate("WUI.close(true); GAME.step(0.3); GAME.shot()"); mp.screenshot(path=os.path.join(OUT, 'p2_phone_card.png'), timeout=240000)
    mp.evaluate("WUI.book(true); GAME.shot()"); mp.screenshot(path=os.path.join(OUT, 'p3_phone_book.png'), timeout=240000)
    print('\n'.join(errs[:30]) or 'no errors', flush=True)
    b.close()
