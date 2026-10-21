# V14 check 2: play all four quests through with the real acts (positions, holds, NPC reactions), plus seats, piano, records, lights
import sys, os, time, base64, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = lib.out('v14'); os.makedirs(OUT, exist_ok=True)
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def shot(pg, name, ui=False):
    if ui: pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=240000); print('ui', name, flush=True); return
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.86); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
HELP = r"""
window.__T = {
  act(id) { return PLAY.acts().find(a => a.id === id); },
  pos(a) { const p = typeof a.pos === 'function' ? a.pos() : a.pos; return p; },
  // stand d metres from the act, looking at it; floor height from the act's own height (house floors) or 0
  go(id, d = 1.0, floor = null) { const a = this.act(id); if (!a) return 'no act ' + id; const p = this.pos(a); if (!p) return 'no pos ' + id;
    const z0 = floor != null ? floor : ((p[2] || 0) > 2.2 ? Math.floor((p[2] - 0.2) * 10) / 10 - 0.6 : 0); const ang = Math.atan2(GAME.P.x - p[0], GAME.P.y - p[1]);
    const x = p[0] + Math.sin(ang) * d, y = p[1] + Math.cos(ang) * d; const yaw = Math.atan2(p[0] - x, p[1] - y) * 180 / Math.PI;
    GAME.view(x, y, z0 + 1.62, yaw, -18); GAME.step(0.1); let l = null; try { l = a.label(); } catch (e) { l = 'ERR ' + e.message; } return l; },
  async run(id, secs = 0.3) { const a = this.act(id); if (!a) return 'no act ' + id; let l = null; try { l = a.label(); } catch (e) {} if (!l) return 'no label for ' + id;
    PLAY.run(a); for (let t = 0; t < secs; t += 0.1) { GAME.step(0.1); await new Promise(r => setTimeout(r, 5)); } return l; },
  async wait(ms, stepping = true) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (stepping) GAME.step(0.05); await new Promise(r => setTimeout(r, 25)); } },
  ask(who, k) { const r = QUESTS.ask(who, k); if (!r) return 'no answer'; if (r.before) r.before(); if (r.after) r.after(); return JSON.stringify(QUESTS.Q); },
  st() { return Object.fromEntries(Object.entries(QUESTS.Q).map(([k, q]) => [k, q.st])); },
  obj(k) { const o = QUESTS.objective(k); if (!o) return null; let p = null; try { p = o[1] ? o[1]() : null; } catch (e) {} return [o[0], p]; }
};
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 960, 'height': 600}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') else None); pg.on('response', lambda r: errs.append('HTTP %d %s' % (r.status, r.url)) if r.status >= 400 else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    pg.wait_for_function("!window.CHARMAN || (NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=900000, polling=1000)
    time.sleep(1); pg.evaluate("window.FREEZE = true"); pg.evaluate(HELP)
    pg.evaluate("QUESTS.reset(); GAME.setSound && GAME.setSound(true)")
    print('state', pg.evaluate("JSON.stringify(__T.st())"), 'music', pg.evaluate("(window.MUSICMAN||[]).length"), flush=True)
    def want(n): return not only or n in only
    E = lambda js: pg.evaluate(js)
    if want('fire'):
        print('-- fire', flush=True)
        E("GAME.go('bibliothek'); GAME.step(0.2)")
        print('stove label', E("__T.go('fire:stove', 0.9, GEO.zF)"), flush=True)
        print('look', E("__T.run('fire:stove', 0.4)"), E("JSON.stringify(__T.st())"), flush=True)
        print('to axe', E("JSON.stringify(__T.obj('fire'))"), flush=True)
        print('axe label', E("__T.go('take:axe', 1.0)"), flush=True); print('take', E("__T.run('take:axe', 0.6)"), E("PLAY.carry && PLAY.carry.id"), E("JSON.stringify(__T.st())"), flush=True)
        shot(pg, 'b_axe_in_hand')
        for i in range(3):
            print('chop', i, E("__T.go('fire:chop', 1.0)"), E("__T.run('fire:chop', 1.4)"), E("QUESTS.Q.fire.chopped"), flush=True)
        shot(pg, 'b_chopped')
        print('gather', E("__T.go('fire:gather', 1.0)"), E("__T.run('fire:gather', 0.5)"), E("PLAY.carry && PLAY.carry.id"), E("JSON.stringify(__T.st())"), flush=True)
        E("GAME.go('bibliothek'); GAME.step(0.2)")
        print('stove label', E("__T.go('fire:stove', 0.9, GEO.zF)"), flush=True)
        print('light', E("__T.run('fire:stove', 4.0)"), E("JSON.stringify({ st: __T.st().fire, lit: STOVE.lit })"), flush=True)
        shot(pg, 'b_stove_lit')
    if want('goat'):
        print('-- goat', flush=True)
        E("GAME.go('ziegen'); GAME.step(0.3)")
        print('ronald', E("__T.ask('ronald', 'q_helfen')").split('"goat":')[1][:40], flush=True)
        print('hay', E("__T.go('goat:haypile', 1.2)"), E("__T.run('goat:haypile', 0.5)"), E("PLAY.carry && PLAY.carry.id"), flush=True)
        shot(pg, 'b_hay')
        for name in ('Lotte', 'Frieda', 'Egon'):
            print('feed', name, E(f"__T.go('goat:feed:{name}', 1.1)"), E(f"__T.run('goat:feed:{name}', 0.4)"), E("JSON.stringify(QUESTS.Q.goat)"), flush=True)
        shot(pg, 'b_fed')
        E("__T.wait(3500)"); time.sleep(4)
        print('after feeding', E("JSON.stringify(__T.st())"), E("JSON.stringify(__T.obj('goat'))"), flush=True)
        # let her run away (look elsewhere so she is out of sight)
        E("GAME.view(26, 2, 1.62, 90, 0)"); E("__T.wait(6000)"); time.sleep(6.5)
        print('frieda', E("(() => { const f = NPC.GOATS.find(g => g.gname === 'Frieda'); return JSON.stringify({ x: +f.x.toFixed(1), y: +f.y.toFixed(1), ctl: !!f.ctl }); })()"), E("JSON.stringify(__T.st())"), flush=True)
        print('lead', E("__T.go('goat:lead', 1.2)"), E("__T.run('goat:lead', 0.3)"), E("JSON.stringify(__T.st())"), flush=True)
        shot(pg, 'b_frieda_found')
        # walk her home in small steps: to the gate, then into the paddock
        tgt = E("JSON.stringify(__T.obj('goat'))"); print('lead target', tgt, flush=True)
        r = E("""(async () => { const path = [[-8, -6], [0, -4], [8, -2], [14.5, -1.6], [18, -1.5], [21, -1.0], [23, 0.5]]; let x = GAME.P.x, y = GAME.P.y;
          for (const [tx, ty] of path) { for (let k = 0; k < 80; k++) { const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy); if (d < 0.3) break; x += dx / d * 0.25; y += dy / d * 0.25;
              GAME.view(x, y, 1.62, Math.atan2(dx, dy) * 180 / Math.PI, 0); GAME.step(0.1); await new Promise(r => setTimeout(r, 2)); if (QUESTS.Q.goat.st === 'report') break; } if (QUESTS.Q.goat.st === 'report') break; }
          for (let k = 0; k < 40 && QUESTS.Q.goat.st !== 'report'; k++) { GAME.step(0.1); await new Promise(r => setTimeout(r, 2)); }
          const f = NPC.GOATS.find(g => g.gname === 'Frieda'); return JSON.stringify({ st: QUESTS.Q.goat.st, f: [+f.x.toFixed(1), +f.y.toFixed(1)], p: [+GAME.P.x.toFixed(1), +GAME.P.y.toFixed(1)] }); })()""")
        print('walked', r, flush=True)
        shot(pg, 'b_frieda_home')
        if 'report' in r: print('report', E("__T.ask('ronald', 'q_frieda')").split('"goat":')[1][:30], flush=True)
    if want('diesel'):
        print('-- diesel', flush=True)
        E("GAME.go('hubert'); GAME.step(0.3)")
        print('hubert', E("__T.ask('hubert', 'q_hilfe')").split('"diesel":')[1][:40], flush=True)
        print('can', E("JSON.stringify(__T.obj('diesel'))"), flush=True)
        print('take can', E("__T.go('take:can', 1.0)"), E("__T.run('take:can', 0.5)"), E("PLAY.carry && PLAY.carry.id"), flush=True)
        shot(pg, 'b_can')
        print('fill label', E("__T.go('diesel:fill', 1.2)"), flush=True)
        print('fill', E("__T.run('diesel:fill', 5.2)"), E("JSON.stringify(__T.st())"), flush=True)
        print('tell', E("__T.ask('hubert', 'q_voll')").split('"diesel":')[1][:40], flush=True)
        E("__T.wait(2000)")
        print('mount label', E("__T.go('diesel:mount', 1.0)"), flush=True)
        print('mount', E("__T.run('diesel:mount', 0.5)"), E("JSON.stringify({ st: __T.st().diesel, seat: PLAY.seat && PLAY.seat.kind })"), flush=True)
        r = E("""(async () => { for (let k = 0; k < 900; k++) { GAME.step(0.1); await new Promise(r => setTimeout(r, 2)); if (NPC.NPCS.hubert.drive) break; }
          const h = NPC.NPCS.hubert; return JSON.stringify({ drive: !!h.drive, pass: !!(h.drive && h.drive.passenger), h: [+h.x.toFixed(1), +h.y.toFixed(1)] }); })()"""); print('hubert drives', r, flush=True)
        E("__T.wait(3000)"); shot(pg, 'b_ride')
        r = E("""(async () => { for (let k = 0; k < 2400; k++) { GAME.step(0.1); if (k % 10 === 0) await new Promise(r => setTimeout(r, 2)); if (!NPC.NPCS.hubert.drive) break; }
          await new Promise(r => setTimeout(r, 3000)); return JSON.stringify({ st: QUESTS.Q.diesel.st, seat: !!PLAY.seat, p: [+GAME.P.x.toFixed(1), +GAME.P.y.toFixed(1)] }); })()"""); print('ride over', r, flush=True)
    if want('board'):
        print('-- board', flush=True)
        E("GAME.go('ziegen'); GAME.step(0.3)")
        print('ronald', E("__T.ask('ronald', 'q_werkstatt')").split('"board":')[1][:40], flush=True)
        E("GAME.go('werkstatt'); GAME.step(0.3)")
        print('saw label', E("__T.go('board:saw', 1.4)"), flush=True)
        print('saw', E("__T.run('board:saw', 0.5)"), flush=True)
        r = E("""(async () => { for (let k = 0; k < 600; k++) { GAME.step(0.1); if (k % 10 === 0) await new Promise(r => setTimeout(r, 2)); if (QUESTS.Q.board.st !== 'saw') break; } return JSON.stringify({ st: QUESTS.Q.board.st, carry: PLAY.carry && PLAY.carry.id }); })()"""); print('sawn', r, flush=True)
        shot(pg, 'b_board_sawn')
        for k, secs in (('plane', 5.6), ('glue', 6.0), ('endgrain', 6.0), ('sand', 6.6), ('oil', 5.0)):
            print(k, E(f"__T.go('board:{k}', 0.9)"), E(f"__T.run('board:{k}', {secs})"), E("JSON.stringify({ st: QUESTS.Q.board.st, stage: QUESTS.Q.board.stage })"), flush=True)
        shot(pg, 'b_board_done')
        E("GAME.go('ziegen'); GAME.step(0.3)")
        print('deliver', E("JSON.stringify(QUESTS.topics('ronald'))"), E("__T.ask('ronald', 'q_brett')").split('"board":')[1][:30], flush=True)
    if want('home'):
        print('-- home', flush=True)
        E("GAME.go('bibliothek'); GAME.step(0.2)")
        print('light', E("__T.go('light:eg', 0.8, GEO.zF)"), E("__T.run('light:eg', 0.3)"), E("JSON.stringify(LIGHTSTATE.SW || null)"), flush=True)
        E("GAME.go('arbeitsraum'); GAME.step(0.2)")
        print('piano', E("__T.go('piano', 0.9, GEO.zO)"), E("__T.run('piano', 0.8)"), E("JSON.stringify({ seat: PLAY.seat && PLAY.seat.kind, on: PIANO.on })"), flush=True)
        shot(pg, 'b_piano', ui=True); E("PLAY.stand(true); GAME.step(0.5)")
        print('records', E("__T.go('records', 1.0, GEO.zO)"), E("__T.run('records', 0.5)"), E("JSON.stringify({ on: RECORDS.on, rec: RECORDS.st.rec && RECORDS.st.rec.title, mode: RECORDS.st.mode })"), flush=True)
        time.sleep(2); print('playing', E("JSON.stringify({ t: RECORDS.st.el && RECORDS.st.el.currentTime, err: RECORDS.st.el && RECORDS.st.el.error && RECORDS.st.el.error.code, paused: RECORDS.st.el && RECORDS.st.el.paused })"), flush=True)
        E("RECORDS.stop()")
    print('final', E("JSON.stringify(__T.st())"), flush=True)
    print('errors', [e for e in errs if 'Texture marked' not in e and 'ReadPixels' not in e and 'parallel_shader' not in e][:20], flush=True); b.close()
