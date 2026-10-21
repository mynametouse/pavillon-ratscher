# V15b check: the rebuilt workshop (band sawmill outside, table saw, thickness planer, glue table, fuming tent, PSA board) and the whole
# end-grain board process driven step by step through the station actions; screenshots of the scene and of the windows
import sys, os, time, base64, json
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/v15b'; os.makedirs(OUT, exist_ok=True)
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda n: not only or n in only
def ui(pg, name): pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=240000); print('ui', name, flush=True)
def shot(pg, name):
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.88); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
HELP = r"""
window.__W = {
  look(x, y, z, tx, ty, tz, fov) { const yaw = Math.atan2(tx - x, ty - y) * 180 / Math.PI, d = Math.hypot(tx - x, ty - y), pitch = Math.atan2(tz - z, d) * 180 / Math.PI; GAME.view(x, y, z, yaw, pitch, fov || 70); GAME.P.body = yaw; GAME.step(0.05); },
  // stand at a station (operator position), looking at the work
  at(k, fov) { const S = WERK.ST[k]; const [x, y] = WERK.WT(S.op[0], S.op[1]); const [tx, ty] = WERK.WT(S.at[0], S.at[1]); this.look(x, y, 1.62, tx, ty, S.at[2], fov); },
  atXY(x0, y0, tx0, ty0, tz) { const [x, y] = WERK.WT(x0, y0), [tx, ty] = WERK.WT(tx0, ty0); this.look(x, y, 1.62, tx, ty, tz); },
  act(id) { return PLAY.acts().find(a => a.id === id); },
  lbl(id) { const a = this.act(id); try { return a ? a.label() : 'no act'; } catch (e) { return 'ERR ' + e.message; } },
  run(id) { const a = this.act(id); const l = this.lbl(id); if (!a || !l) return 'NO LABEL ' + id; PLAY.run(a); GAME.step(0.05); return l; },
  hold(max) { let n = 0; max = max || 30; while (PLAY.hold && n < max * 40) { GAME.step(0.025); n++; } return +(n * 0.025).toFixed(2); },
  gauge(k) { const h = PLAY.hold; if (!h || !h.g) return 'no gauge'; GAME.step(h.dur * k); PLAY.primary(); GAME.step(0.05); return 'ok ' + k; },
  go() { const w = document.getElementById('machwin'); if (!w || w.hidden) return 'no window'; w.querySelector('.go').click(); GAME.step(0.05); return 'go'; },
  win() { const w = document.getElementById('machwin'); return w && !w.hidden ? w.querySelector('h3').textContent : null; },
  check(k) { const b = document.querySelector('#machwin [data-ck="' + k + '"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); return !!b; },
  choose(k, v) { const b = document.querySelector('#machwin [data-ch="' + k + '"][data-v="' + v + '"]'); if (b) b.click(); return !!b; },
  wp() { const c = WERK.carriedWP(); return c ? c.st + ' ' + WERK.dimsOf(c) : null; },
  stwp(k) { const w = WERK.ST[k].wp; return w ? w.st + ' ' + WERK.dimsOf(w) : null; },
  wait() { let n = 0; while (CLOCK.warp && n < 3000) { GAME.step(0.1); n++; } return CLOCK.hm(); },
  // run the station's operation; holds run to their end, gauges stop at k
  op(k, gk) { const l = this.run('werk:' + k); if (l.startsWith('NO')) return l; if (PLAY.hold && PLAY.hold.g) this.gauge(gk || 0.68); else if (PLAY.hold) this.hold(); if (CLOCK.warp) this.wait(); return l; },
  // repeat while the label starts with a prefix
  rep(k, pre, gk, max) { const out = []; for (let i = 0; i < (max || 20); i++) { const l = this.lbl('werk:' + k); if (!l || !l.startsWith(pre)) break; out.push(this.op(k, gk)); } return out.length + 'x ' + (out[out.length - 1] || ''); },
  think() { const s = document.getElementById('npcsub'); return s && !s.hidden ? s.textContent : ''; },
  ppe(list) { GEAR.give(); for (const id of ['brille', 'korb', 'ohr', 'ffp2', 'abek', 'nitril']) GEAR.wear(id, false); for (const id of list) GEAR.wear(id, true); GAME.step(0.05); return JSON.stringify(GEAR.on); },
};
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1100, 'height': 680}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') and 'Texture marked' not in m.text and 'GPU stall' not in m.text and 'KHR_parallel' not in m.text else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.AVATAR || AVATAR.ready || AVATAR.failed", timeout=900000, polling=1000)
    time.sleep(2); pg.evaluate("window.FREEZE = true"); pg.evaluate(HELP); E = lambda js: pg.evaluate(js)
    print('werk', E("JSON.stringify({on: WERK.on, rack: WERK.RACK.items.length, tools: Object.keys(WERK.TOOLS).length, clock: CLOCK.fmt(CLOCK.t)})"), flush=True)
    E("QUESTS.reset(); GAME.go('werkstatt'); GAME.setView3(false, true); GAME.setPhase(GAME.PHASES.length - 1); GAME.step(0.3)")
    print('after reset', E("JSON.stringify({rack: WERK.RACK.items.length, gear: GEAR.have})"), flush=True)
    if want('look'):
        E("__W.atXY(2.5, -31.0, -1.5, -36.5, 0.6)"); shot(pg, 'w1_front')
        E("__W.atXY(-5.2, -31.5, -1.5, -31.5, 0.4)"); shot(pg, 'w2_bandsaw')
        E("__W.atXY(3.2, -37.6, -3.0, -38.6, 0.7)"); shot(pg, 'w3_inside_west')
        E("__W.atXY(-4.8, -37.4, 1.0, -40.2, 0.9)"); shot(pg, 'w4_back_wall')
        E("__W.atXY(5.6, -37.4, 5.1, -40.1, 0.4)"); shot(pg, 'w5_tent')
        E("__W.atXY(0.8, -38.9, 0.7, -40.6, 1.4)"); shot(pg, 'w6_psa_rack')
    if want('flow'):
        L = lambda s: print(s, flush=True)
        L('rack: ' + E("(() => { __W.at('bench'); __W.atXY(2.15, -39.6, 2.15, -40.3, 0.5); return __W.run('werk:rack') + ' -> ' + __W.wp(); })()"))
        L('psa: ' + E("(() => { __W.atXY(0.63, -39.7, 0.63, -40.5, 1.4); const l = __W.run('werk:psa'); GEAR.setWin(false); return l + ' have=' + GEAR.have; })()"))
        L('saw without gear: ' + E("(() => { __W.at('saw'); __W.ppe([]); const a = __W.op('saw'); const w = __W.win(); __W.go(); const b = __W.op('saw'); return a + ' | ' + w + ' | ' + b + ' | ' + __W.think(); })()"))
        E("__W.ppe(['brille', 'ohr'])")
        L('cross: ' + E("(() => { const a = __W.op('saw'); return a + ' -> ' + __W.stwp('saw') + ' rack=' + WERK.RACK.items.length; })()"))
        shot(pg, 'f1_saw_blank')
        L('rip set: ' + E("(() => { const a = __W.op('saw'); const w = __W.win(); return a + ' | ' + w; })()")); ui(pg, 'u1_saw_window'); E("__W.go()")
        L('rip: ' + E("__W.rep('saw', 'Kantel sägen', 0, 12) + ' -> ' + __W.stwp('saw') + ' carry=' + (PLAY.carry && PLAY.carry.name)"))
        E("(() => { const [x, y] = WERK.WT(-5.0, -37.0), [tx, ty] = WERK.WT(-5.7, -38.05); __W.look(x, y, 1.5, tx, ty, 0.8, 60); })()"); shot(pg, 'f2_strips_cart')
        L('take strips: ' + E("__W.op('saw') + ' -> ' + __W.wp()"))
        L('lay1: ' + E("(() => { __W.at('glue'); const a = __W.op('glue'); return a + ' -> ' + __W.stwp('glue'); })()"))
        L('prep1: ' + E("(() => { const a = __W.op('glue'); const w = __W.win(); __W.check('dry'); __W.check('foil'); __W.check('cauls'); return a + ' | ' + w; })()")); ui(pg, 'u2_prep_window'); E("__W.go()")
        L('glue1: ' + E("(() => { const j = __W.rep('glue', 'Leim auftragen', 0.7, 12); const p = __W.op('glue'); return j + ' | ' + p + ' focus=' + CLOCK.focused + ' ' + __W.stwp('glue'); })()"))
        ui(pg, 'u3_glue_label')
        L('clamps1: ' + E("(() => { const c = __W.rep('glue', 'Zwinge', 0.68, 8); const z = __W.op('glue'); return c + ' | ' + z + ' -> ' + __W.stwp('glue') + ' focus=' + CLOCK.focused; })()"))
        E("(() => { const [x, y] = WERK.WT(-2.6, -39.3), [tx, ty] = WERK.WT(-3.32, -40.02); __W.look(x, y, 1.45, tx, ty, 0.9, 55); })()"); shot(pg, 'f3_clamp1')
        L('dry1: ' + E("(() => { const w = __W.op('glue'); const u = __W.op('glue'); return w + ' | ' + u + ' -> ' + __W.stwp('glue') + ' ' + __W.think(); })()"))
        E("(() => { const [x, y] = WERK.WT(-2.8, -39.45), [tx, ty] = WERK.WT(-3.32, -40.02); __W.look(x, y, 1.3, tx, ty, 0.9, 50); })()"); shot(pg, 'f4_panel1')
        L('scrape1: ' + E("(() => { __W.op('glue'); __W.at('bench'); const a = __W.op('bench'); const s = __W.rep('bench', 'Leim abkratzen', 0, 3); const t = __W.op('bench'); return a + ' | ' + s + ' | ' + t + ' -> ' + __W.wp(); })()"))
        L('planer: ' + E("(() => { __W.at('planer'); const c = __W.op('planer'); const a = __W.op('planer'); const w = __W.win(); __W.go(); const p = __W.rep('planer', 'Hobeln', 0, 12); const t = __W.lbl('werk:planer'); return c + ' | ' + a + ' | ' + w + ' | ' + p + ' | ' + t; })()"))
        shot(pg, 'f5_planer')
        L('planed: ' + E("__W.op('planer') + ' -> ' + __W.wp()"))
        L('slice: ' + E("(() => { __W.at('saw'); const a = __W.op('saw'); const w = __W.win(); __W.go(); const s = __W.rep('saw', 'Ende', 0, 2); const r = __W.rep('saw', 'Scheibe', 0, 14); return a + ' | ' + w + ' | ' + s + ' | ' + r + ' -> ' + __W.stwp('saw'); })()"))
        L('take slices: ' + E("__W.op('saw') + ' -> ' + __W.wp()"))
        L('lay2: ' + E("(() => { __W.at('glue'); const a = __W.op('glue'); return a + ' -> ' + __W.stwp('glue'); })()"))
        E("(() => { const [x, y] = WERK.WT(-2.8, -39.4), [tx, ty] = WERK.WT(-3.32, -40.02); __W.look(x, y, 1.4, tx, ty, 0.9, 50); })()"); shot(pg, 'f6_lay2')
        L('glue2: ' + E("(() => { __W.op('glue'); __W.check('dry'); __W.check('foil'); __W.check('cauls'); __W.go(); const j = __W.rep('glue', 'Leim auftragen', 0.7, 14); const p = __W.op('glue'); const c = __W.rep('glue', 'Zwinge', 0.68, 8); const z = __W.op('glue'); return j + ' | ' + p + ' | ' + c + ' | ' + z + ' -> ' + __W.stwp('glue'); })()"))
        E("(() => { const [x, y] = WERK.WT(-2.6, -39.3), [tx, ty] = WERK.WT(-3.32, -40.02); __W.look(x, y, 1.45, tx, ty, 0.9, 55); })()"); shot(pg, 'f7_clamp2')
        L('dry2: ' + E("(() => { const w = __W.op('glue'); const u = __W.op('glue'); return w + ' | ' + u + ' -> ' + __W.stwp('glue'); })()"))
        E("(() => { const [x, y] = WERK.WT(-2.9, -39.5), [tx, ty] = WERK.WT(-3.32, -40.02); __W.look(x, y, 1.25, tx, ty, 0.9, 45); })()"); shot(pg, 'f8_board_raw')
        L('planer refuses end grain: ' + E("(() => { __W.op('glue'); __W.at('planer'); const l = __W.lbl('werk:planer'); __W.op('planer'); return l + ' | ' + __W.think(); })()"))
        L('scrape2: ' + E("(() => { __W.at('bench'); const a = __W.op('bench'); const s = __W.rep('bench', 'Leim abkratzen', 0, 3); const t = __W.op('bench'); return a + ' | ' + s + ' | ' + t + ' -> ' + __W.wp(); })()"))
        E("__W.ppe(['brille', 'ohr', 'ffp2'])")
        L('sander: ' + E("(() => { __W.at('sander'); const c = __W.op('sander'); const a = __W.op('sander'); const w = __W.win(); __W.go(); const p = __W.rep('sander', 'Planschleifen', 0, 20); const t = __W.op('sander'); return c + ' | ' + a + ' | ' + w + ' | ' + p + ' | ' + t + ' -> ' + __W.wp(); })()"))
        E("__W.ppe(['korb', 'abek', 'nitril'])")
        L('tent: ' + E("(() => { __W.at('tent'); const out = [__W.op('tent'), __W.op('tent')]; for (let i = 0; i < 10; i++) { const l = __W.lbl('werk:tent'); if (!l || l.startsWith('Zelt öffnen')) break; out.push(__W.op('tent')); } return out.join(' | ') + ' H=' + WERK.fumeH(WERK.ST.tent.wp).toFixed(1) + ' next=' + __W.lbl('werk:tent'); })()"))
        shot(pg, 'f9_tent')
        L('tent out: ' + E("(() => { const a = __W.op('tent'); const b = __W.op('tent'); const c = __W.op('tent'); return a + ' | ' + b + ' | ' + c + ' -> ' + __W.wp(); })()"))
        E("(() => { const [x, y] = WERK.WT(5.1, -39.2), [tx, ty] = WERK.WT(5.25, -40.0); __W.look(x, y, 1.2, tx, ty, 0.2, 50); })()")
        E("__W.ppe(['brille', 'ohr'])")
        L('trim: ' + E("(() => { __W.at('saw'); const a = __W.op('saw'); __W.choose('sac', 'true'); __W.go(); const r = __W.rep('saw', 'Besäumen', 0, 6); const t = __W.op('saw'); return a + ' | ' + r + ' | ' + t + ' -> ' + __W.wp(); })()"))
        E("__W.ppe(['brille', 'ffp2'])")
        L('bench: ' + E("(() => { __W.at('bench'); const a = __W.op('bench'); const c = __W.op('bench'); return a + ' | ' + c + ' -> ' + __W.stwp('bench'); })()"))
        L('sanding: ' + E("(() => { const out = []; for (let i = 0; i < 6; i++) { const l = __W.lbl('werk:bench'); if (!l) break; if (l.startsWith('Schleifen')) { __W.run('werk:bench'); out.push(__W.win()); __W.go(); __W.hold(); } else if (l.startsWith('Wässern') || l.startsWith('Trocknet')) out.push(__W.op('bench')); else break; } return out.join(' | ') + ' grit=' + WERK.ST.bench.wp.grit; })()"))
        L('brand: ' + E("(() => { const a = __W.op('bench'); const b = __W.op('bench'); const c = __W.op('bench', 0.6); return [a, b, c].join(' | ') + ' brand=' + WERK.ST.bench.wp.brand; })()"))
        E("__W.ppe(['nitril'])")
        L('oil: ' + E("(() => { const out = []; for (let i = 0; i < 12; i++) { const l = __W.lbl('werk:bench'); if (!l || l.startsWith('Schneidebrett fertig')) break; out.push(__W.op('bench')); } return out.join(' | ') + ' -> ' + __W.lbl('werk:bench'); })()"))
        E("(() => { const [x, y] = WERK.WT(-0.4, -39.55), [tx, ty] = WERK.WT(-0.9, -40.12); __W.look(x, y, 1.3, tx, ty, 0.9, 40); })()"); shot(pg, 'f10_finished_bench')
        L('finish: ' + E("(() => { __W.at('bench'); const a = __W.op('bench'); const c = WERK.carriedWP(); return a + ' -> ' + (c && WERK.nameOf(c)) + ' stars=' + (c && c.stars) + ' | ' + (c && WERK.starsTxt(c)); })()"))
        ui(pg, 'u4_done')
        L('shelf: ' + E("(() => { __W.atXY(2.15, -39.75, 2.15, -40.4, 1.6); const a = __W.run('werk:shelf'); GAME.step(0.2); return a + ' shelf=' + WERK.SHELF.items.length; })()"))
        E("(() => { const [x, y] = WERK.WT(2.15, -38.9), [tx, ty] = WERK.WT(2.15, -40.4), [, , ] = [0, 0, 0]; __W.look(x, y, 1.6, tx, ty, 1.45, 55); })()"); shot(pg, 'f11_shelf')
        L('clock ' + E("CLOCK.fmt(CLOCK.t)") + ' focus=' + str(E("CLOCK.focused")))
    if want('ui'):
        E("GAME.go('werkstatt'); GAME.step(0.3)"); E("WUI.book(true); GAME.step(0.2)"); ui(pg, 'u5_book'); E("WUI.book(false)")
        E("GEAR.give(); GEAR.setWin(true); GAME.step(0.1)"); ui(pg, 'u6_gear'); E("GEAR.setWin(false)")
        E("CLOCK.setWin(true); GAME.step(0.1)"); ui(pg, 'u7_clock'); E("CLOCK.setWin(false)")
        E("GAME.setView3(true, true); __W.ppe(['korb', 'ohr', 'abek']); GAME.step(0.6)")
        E("(() => { const [x, y] = WERK.WT(-2.0, -37.6); GAME.view(x, y, 1.62, 160, -8); GAME.P.body = -20; GAME.setView3(true, true); GAME.step(0.8); })()"); shot(pg, 'u8_figure_gear')
        E("__W.ppe(['brille', 'ohr', 'ffp2'])"); E("(() => { const [x, y] = WERK.WT(-2.0, -37.6); GAME.view(x, y, 1.62, 160, -8); GAME.P.body = -20; GAME.step(0.8); })()"); shot(pg, 'u9_figure_gear2')
    print('\n'.join(errs[:40]) or 'no errors', flush=True)
    b.close()
