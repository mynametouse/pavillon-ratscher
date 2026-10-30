# The workshop of today (Falko 30.10.2026, photos of 26.10.2026): in construction phase 0 the open lean-to – the band sawmill's head between
# its front posts under a blue tarpaulin, the rails on wooden blocks running north, the drum sander (Holzmann) under a tarpaulin in the
# annex, the table saw on its stand, the benches; the hall with the planer, the glue table, the fuming tent and the log yard only from
# phase 1. Checks: the lean-to there and the hall not, no visible mesh in the hall's area that is not today's, no action there without an
# object, the tarpaulins off (saved), the machines on and off (with the generator and their sound), one production step at each machine
# (table saw, drum sander – the long-grain panel, as there is no thicknesser today –, band sawmill, workbench), back to phase 1: the mill and
# the stations where the plan has them. Pictures: out/werkstatt_heute/.
#   python3 viz3/test/werkstatt_heute.py PORT [nogeo=1,tier=mittel]
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
QUERY = '?bauphase=0' + ('&nogeo=1' if opts.get('nogeo') == '1' else '')
OUT = lib.out('werkstatt_heute')
ck = lib.Checks('werkstatt_heute')
errs = []

HELP = r"""
window.__H = {
  hide() { document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#qtrack,#quests,#qbanner,#vhud,#wpcard,#hud,#topbar,#minimap').forEach(e => e.style.visibility = 'hidden'); },
  act(id) { return PLAY.acts().find(a => a.id === id); },
  label(id) { const a = this.act(id); try { return a ? a.label() : 'no act'; } catch (e) { return 'ERR ' + e.message; } },
  W(x, y) { return BUILD.werkstatt ? BUILD.werkstatt.tf(x, y) : [x, y]; },
  // stand at a point (workshop as built) looking at another
  look(x0, y0, tx0, ty0, tz, fov) { const [x, y] = this.W(x0, y0), [tx, ty] = this.W(tx0, ty0), d = Math.hypot(tx - x, ty - y);
    GAME.view(x, y, 1.62 + GAME.floorAt(x, y, 0.5), Math.atan2(tx - x, ty - y) * 180 / Math.PI, Math.atan2(tz - 1.62, d) * 180 / Math.PI, fov || 66); GAME.P.body = Math.atan2(tx - x, ty - y) * 180 / Math.PI; GAME.step(0.05); },
  // stand d metres from an act, on the side given by az (compass degrees from the act), facing it
  at(id, d, az) { const a = this.act(id); if (!a) return 'no act ' + id; const p = a.pos(); if (!p) return 'no pos'; const r = az * Math.PI / 180, x = p[0] + Math.sin(r) * d, y = p[1] + Math.cos(r) * d;
    GAME.view(x, y, 1.62 + GAME.floorAt(x, y, 0.5), Math.atan2(p[0] - x, p[1] - y) * 180 / Math.PI, -12); GAME.P.body = Math.atan2(p[0] - x, p[1] - y) * 180 / Math.PI; GAME.step(0.05); return this.label(id); },
  // stand at a station's operator place, facing the work
  st(k) { const S = WERK.ST[k]; if (!S.op) return null; this.look(S.op[0], S.op[1], S.at[0], S.at[1], S.at[2]); return this.label('werk:' + k); },
  // do an act the way the button does: holds run to their end, gauges stop at k
  run(id, k) { const a = this.act(id); const l = this.label(id); if (!a || !l) return 'NO LABEL ' + id; PLAY.run(a); GAME.step(0.05);
    if (PLAY.hold && PLAY.hold.g) { GAME.step(PLAY.hold.dur * (k || 0.68)); PLAY.primary(); GAME.step(0.05); }
    else { let n = 0; while (PLAY.hold && n < 2400) { GAME.step(0.025); n++; } }
    let n = 0; while (CLOCK.warp && n < 3000) { GAME.step(0.1); n++; }
    return l; },
  go() { const w = document.getElementById('machwin'); if (!w || w.hidden) return null; const t = w.querySelector('h3').textContent; w.querySelector('.go').click(); GAME.step(0.05); return t; },
  wp() { const c = WERK.carriedWP(); return c ? c.st : null; },
  ppe(list) { GEAR.give(); for (const id of ['brille', 'korb', 'ohr', 'ffp2', 'abek', 'nitril']) GEAR.wear(id, false); for (const id of list) GEAR.wear(id, true); GEAR.setWin(false); GAME.step(0.05); },
  // visible meshes in the workshop's area, each with what it belongs to: today (ph 0), the hall (ph >= 1), the mill or the generator
  // (there in every phase), a thing (tool, workpiece) or something else (no phase: the garden)
  meshes() {
    const B = BUILD.werkstatt, tfi = (x, y) => { if (!B) return [x, y]; const a = -B.da * Math.PI / 180, px = B.pivot[0], py = B.pivot[1], qx = x - px - B.dx, qy = y - py - B.dy; return [px + qx * Math.cos(a) - qy * Math.sin(a), py + qx * Math.sin(a) + qy * Math.cos(a)]; };
    const saw = WORKS.machines.find(m => m.key === 'saw').state.g, gen = WORKS.GEN.g, things = new Set();
    for (const T of Object.values(PLAY.things)) if (T.world) things.add(T.world);
    const box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3(), out = [];
    GAME.scene.updateMatrixWorld(true);
    GAME.scene.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
      for (let a = o; a; a = a.parent) if (!a.visible) return;
      box.setFromObject(o); if (box.isEmpty()) return; box.getSize(s); if (s.x > 30 || s.z > 30) return;
      box.getCenter(c); const [x, y] = tfi(c.x, -c.z);
      if (x < -11.5 || x > 6.8 || y < -42 || y > -26) return;
      let ph; for (let a = o; a && ph === undefined; a = a.parent) ph = a.userData.ph; // placed models carry it on their root
      let who = ph === 0 ? 'today' : ph >= 1 ? 'hall' : 'none';
      for (let a = o; a; a = a.parent) { if (a === saw) who = who === 'none' ? 'mill' : who; if (a === gen) who = 'gen'; if (things.has(a)) who = 'thing'; if (a.name === 'werk') who = who === 'none' ? 'werk' : who; }
      out.push({ x: +x.toFixed(2), y: +y.toFixed(2), z: +c.y.toFixed(2), w: +s.x.toFixed(2), d: +s.z.toFixed(2), h: +s.y.toFixed(2), who, ph, merged: !!o.userData.merged });
    });
    return out;
  },
};
"""

def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def shot(name): lib.shot(pg, OUT, name)
def look(x, y, tx, ty, tz, fov=66): E(f"__H.look({x}, {y}, {tx}, {ty}, {tz}, {fov})")
HALL = (-6.6, 3.6, -40.6, -36.85)      # the hall's floor (workshop as built)
LEAN = (-5.65, 1.25, -40.6, -37.85)    # today's lean-to with its annex
inside = lambda m, r, pad=0: r[0] - pad <= m['x'] <= r[1] + pad and r[2] - pad <= m['y'] <= r[3] + pad

with lib.browser() as b:
    pg = lib.page(b, 1000, 640, errs=errs, tier=opts.get('tier', 'mittel'))
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{QUERY}', timeout=300000, wait_until='domcontentloaded')
    while not E("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1500:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3); E("window.FREEZE = true"); print('loaded', round(time.time() - t0), 's', flush=True)
    E(HELP)
    E("__H.hide(); GAME.setMode('day'); GAME.setView3 && GAME.setView3(false); GAME.step(0.1)")
    for _ in range(60):   # the workshop game loads its things a moment after the model
        if E("!!(window.WERK && WERK.RACK.items.length && window.HOLZ && HOLZ.ready && window.PHASE === 0)"): break
        E("GAME.step(0.1)"); time.sleep(0.5)
    E("WERK.reset(); GAME.step(0.3)")

    # ---------------- phase 0: the lean-to, not the hall ----------------
    st = J("{ phase: window.PHASE, cov: WORKS.cov, off: WORKS.machines.find(m => m.key === 'saw').state.off, gen: WORKS.machines.find(m => m.key === 'gen').pos }")
    ck('start in construction phase 0, both machines under their tarpaulins', st['phase'] == 0 and st['cov'] == {'saw': True, 'sander': True}, st)
    ms = J("__H.meshes()")
    today = [m for m in ms if m['who'] == 'today' and inside(m, LEAN)]
    hall = [m for m in ms if m['who'] == 'hall']
    ck('the lean-to of today is there (posts, roof, benches, machines)', len(today) >= 10, f'{len(today)} meshes of today in the lean-to')
    ck('nothing of the hall is visible', not hall, hall[:4])
    stray = [m for m in ms if inside(m, HALL) and m['who'] not in ('today', 'mill', 'gen') and not (m['who'] in ('thing', 'werk') and inside(m, LEAN, 0.1))]
    ck("no visible mesh in the hall's area that is not today's", not stray, stray[:5])
    ck('the band sawmill stands between the front posts (head at y −38.0, rails to the north)', abs(st['off'][1] + 3.7) < 1e-6 and abs(st['off'][0] + 0.45) < 1e-6, st['off'])
    ck('the generator stands west of the lean-to under its table', st['gen'][0] < -6.5 and -39.5 < st['gen'][1] - 0.8 < -38.9, st['gen'])
    # actions with a label in the workshop's area: each has an object near its position (and the hall's stations have none today)
    acts = J("""(() => { const out = [], ms = __H.meshes(); for (const a of PLAY.acts()) { let p = null; try { p = a.pos(); } catch (e) {} if (!p) continue;
        const B = BUILD.werkstatt; if (Math.hypot(p[0] - (B ? B.tf(-1.5, -38.7)[0] : -1.5), p[1] - (B ? B.tf(-1.5, -38.7)[1] : -38.7)) > 9.5) continue;
        if (/^(winde|garage:motor|gplan|seat:|npc:|tut)/.test(a.id)) continue;
        GAME.view(p[0], p[1] + 0.6, 1.62 + GAME.floorAt(p[0], p[1] + 0.6, 0.5), 180, -10); GAME.step(0.02); let l = null; try { l = a.label(); } catch (e) { l = 'ERR'; }
        if (!l) continue; const W = B ? (x, y) => B.tf(x, y) : (x, y) => [x, y]; let near = 9;
        for (const m of ms) { const [x, y] = W(m.x, m.y); near = Math.min(near, Math.hypot(x - p[0], y - p[1]) - Math.max(m.w, m.d) / 2); }
        out.push({ id: a.id, l, near: +near.toFixed(2) }); } return out; })()""")
    print('acts with a label', acts, flush=True)
    lonely = [a for a in acts if a['near'] > 1.3]
    ck('every action in the workshop has an object there', acts and not lonely, lonely[:4])
    ids = {a['id'] for a in acts}
    ck('no planer, glue table, fuming tent, drying cabinet, chopping block today', not ids & {'werk:planer', 'werk:tent', 'hd:kiln', 'fire:chop', 'take:axe', 'take:ammo'}, sorted(ids & {'werk:planer', 'werk:tent', 'hd:kiln', 'fire:chop', 'take:axe', 'take:ammo'}))
    look(-1.6, -31.6, -1.8, -39.0, 0.9); shot('a_lean_to_covered')
    look(-2.59, -34.84, -1.7, -39.4, 0.9, 64); shot('b_like_IMG_7290_covered')
    look(3.0, -39.1, -1.0, -39.1, 0.9, 70); shot('c_sander_covered')

    # ---------------- the tarpaulins off (saved), the machines on and off ----------------
    lab = E("__H.at('werk:plane:saw', 0.6, 0)")
    ck('at the head: "Plane abnehmen (Blockbandsäge)"', lab == 'Plane abnehmen (Blockbandsäge)', lab)
    E("(() => { const p = DOORS.saw.pos; GAME.view(p[0], p[1] + 0.3, 1.62, 180, -10); GAME.step(0.05); GAME.toggleDoor('saw'); GAME.step(0.1); })()")
    cs = J("{ near: GAME.nearDoor(), t: DOORS.saw.target }")
    ck('covered, the band sawmill cannot be switched on', cs['near'] != 'saw' and cs['t'] == 0, cs)
    E("__H.at('werk:plane:saw', 0.6, 0); __H.run('werk:plane:saw')")
    lab = E("__H.at('werk:plane:sander', 0.5, 0)")
    ck('at the drum sander: "Plane abnehmen (Trommelschleifer)"', lab == 'Plane abnehmen (Trommelschleifer)', lab)
    E("__H.run('werk:plane:sander'); GAME.step(0.6)"); time.sleep(0.8)   # the workshop's record is written a moment later
    cv = J("{ cov: WORKS.cov, saw: WORKS.machines.find(m => m.key === 'saw').state.cover.visible, sd: WORKS.T0.covers.sander.visible, saved: JSON.parse(SAVE.raw('pav-werk-v1') || '{}').cov }")
    ck('both tarpaulins off – and saved', cv['cov'] == {'saw': False, 'sander': False} and not cv['saw'] and not cv['sd'] and cv['saved'] == {'saw': False, 'sander': False}, cv)
    look(-1.6, -31.6, -1.8, -39.0, 0.9); shot('d_lean_to_uncovered')
    look(-2.59, -34.84, -1.7, -39.4, 0.9, 64); shot('e_like_IMG_7290_uncovered')
    look(3.0, -39.1, -1.0, -39.1, 0.9, 70); shot('f_sander_uncovered')
    # the machines are switched at their place (the door button, E): there the nearest „door“ is the machine
    for k, name in [('sander', 'Trommelschleifer'), ('tablesaw', 'Tischkreissäge'), ('saw', 'Blockbandsäge')]:
        snd = 'ts' if k == 'tablesaw' else k
        E(f"GPLAY.GEN.fuel = 9; (() => {{ const p = DOORS['{k}'].pos; GAME.view(p[0], p[1], 1.62 + GAME.floorAt(p[0], p[1], 0.5), 180, -10); GAME.step(0.05); }})()")
        near = E("GAME.nearDoor()"); E(f"GAME.toggleDoor('{k}'); GAME.step(0.6)")
        on = J(f"{{ t: DOORS['{k}'].target, gen: WORKS.genOn, snd: WORKS.sndWant('{snd}') }}")
        E(f"GAME.toggleDoor('{k}'); GAME.step(0.6)")
        off = J(f"{{ t: DOORS['{k}'].target, snd: WORKS.sndWant('{snd}') }}")
        ck(f'{name}: switched on (sound{", generator" if k != "saw" else ""}) and off again at its place', near == k and on['t'] == 1 and on['snd'] and (k == 'saw' or on['gen']) and off['t'] == 0 and not off['snd'], {'near': near, 'on': on, 'off': off})

    # ---------------- one production step at each machine ----------------
    E("__H.ppe(['brille', 'ohr'])")
    # the table saw: a glued panel from the stock under the white bench, cut to length
    E("__H.look(-2.75, -39.15, -2.45, -40.3, 0.4)"); lab = E("__H.label('werk:rack')"); E("__H.run('werk:rack')")
    ck('the stock is under the white bench: a panel taken', (lab or '').startswith('Leimholzplatte Eiche nehmen') and E("__H.wp()") == 'panel', lab)
    l1 = E("__H.st('saw')"); E("__H.run('werk:saw')"); w = E("__H.go()"); l2 = E("__H.label('werk:saw')"); E("__H.run('werk:saw')")
    st = J("{ saw: WERK.ST.saw.wp && WERK.ST.saw.wp.st, rack: WERK.RACK.items.length }")
    ck('table saw: cut to 500 mm (the other half into the stock)', st['saw'] == 'blank' and (w or '').startswith('Tischkreissäge') and (l2 or '').startswith('Ablängen'), {'put': l1, 'win': w, 'cut': l2, 'st': st})
    E("__H.look(-3.0, -38.55, -4.13, -38.88, 0.9, 60)"); shot('g_table_saw_cut')
    # the drum sander: today it flattens the long-grain panel (no thicknesser); a glued, scraped, cured panel of 8 strips
    E("""(() => { if (WERK.ST.saw.wp) { const wp = WERK.ST.saw.wp; WERK.ST.saw.wp = null; WERK.render('saw'); wp.where = 'gone'; }
        const wp = WERK.newWP('panel1', { L: 500, fence: 45, Z: 45, Zcur: 45, strips: Array.from({ length: 8 }, (_, i) => ({ v0: i * 48.2, fa: false, fb: i % 2 === 1 })), sq: false, tc: CLOCK.t - 300, need: [0.6, 0.6], rmT: [0, 0], rmB: [0, 0], g1: { glue: 'D3' } });
        const T = WERK.mkThing(wp); WERK.refreshThing(wp); PLAY.give(T); PLAY.toHand(T); wp.where = 'inv'; GAME.step(0.1); })()""")
    E("__H.ppe(['brille', 'ohr', 'ffp2'])")
    l1 = E("__H.st('sander')"); E("__H.run('werk:sander')"); w = E("__H.go()")
    passes = []
    for i in range(8):
        l = E("__H.label('werk:sander')")
        if not l or not l.startswith('Planschleifen'): break
        passes.append(l); E("__H.run('werk:sander')")
    l3 = E("__H.label('werk:sander')"); E("__H.run('werk:sander')")
    ck('drum sander: the glued panel flattened on both sides (instead of the thicknesser)', l1 == 'Leimholz auf den Trommelschleifer legen' and len(passes) >= 2 and (l3 or '').startswith('Leimholz nehmen') and E("__H.wp()") == 'planed1', {'put': l1, 'win': w, 'passes': passes, 'take': l3, 'wp': E("__H.wp()")})
    E("__H.look(1.9, -38.4, 0.33, -39.1, 0.8, 60)"); shot('h_sander_panel')
    # the band sawmill: a log on its bunks (laid there as the fork does), clamped, planned, the first cut (the slab)
    E("(() => { const c = WERK.carriedWP(); if (c && c.T) { PLAY.take(c.T); c.T.gone(); c.where = 'gone'; } })()")
    r = J("""(() => { const id = HOLZ.testLog({ sp: 'spruce', x: -12, y: -30, az: 0, L: 4.1, d0: 34, d1: 28 }), l = HOLZ.logs.find(l => l.id === id), S = WORKS.machines.find(m => m.key === 'saw').state;
        const yc = (-33.75 - 29.55) / 2, rr = 0.155, W = (x, y) => __H.W(...S.at(x, y)), a = W(-1.5, yc - 2.05), bb = W(-1.5, yc + 2.05), z = 0.5 + rr + 0.05;
        l.wp0 = l.p0; l.wp1 = l.p1; const res = HOLZSAW.dropOn(l, [a[0], a[1], z], [bb[0], bb[1], z], [(a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2, z], rr); GAME.step(0.1);
        return { res, st: l.st, mid: HOLZ.mid(l).map(v => +v.toFixed(2)) }; })()""")
    ck('a log on the bunks in front of the lean-to', r['res'] == 'done' and r['st'] == 'saw' and r['mid'][1] < -34.5, r)
    lab = E("__H.at('hs:op', 0.4, 60)"); E("__H.run('hs:op')"); w = E("__H.go()")
    l2 = E("__H.label('hs:op')"); E("__H.run('hs:op')")
    s3 = J("{ cut: HOLZSAW.cut, fire: HOLZSAW.fire, plan: !!HOLZSAW.plan, head: +WORKS.machines.find(m => m.key === 'saw').state.s.toFixed(2) }")
    ck('band sawmill: clamped, planned, the slab off', (lab or '').startswith('Stamm festklemmen') and (w or '').startswith('Blockbandsäge') and (l2 or '').startswith('Schwarte abnehmen') and s3['cut'] == 1 and s3['plan'], {'clamp': lab, 'win': w, 'cut': l2, 's': s3})
    E("__H.look(1.4, -34.0, -1.95, -36.0, 0.7, 64)"); shot('i_sawmill_first_cut')
    # the workbench: a trimmed end-grain board, its edges chamfered with the block plane
    E("""(() => { const wp = WERK.newWP('trimmed', { L: 500, fence: 45, Z: 42, Zcur: 42, H: 40, strips: Array.from({ length: 8 }, (_, i) => ({ v0: i * 48.2, fa: false, fb: i % 2 === 1 })), slices: Array.from({ length: 10 }, (_, j) => ({ flip: j % 2 === 1 })), trim: true, sq: false, grit: 80, rmT: [0, 0], rmB: [0, 0] });
        const T = WERK.mkThing(wp); WERK.refreshThing(wp); PLAY.give(T); PLAY.toHand(T); wp.where = 'inv'; GAME.step(0.1); })()""")
    l1 = E("__H.st('bench')"); E("__H.run('werk:bench')"); l2 = E("__H.label('werk:bench')"); E("__H.run('werk:bench')")
    ck('workbench: the trimmed board chamfered with the block plane', (l1 or '').endswith('auf die Hobelbank legen') is False and (l1 or '').startswith('Brett auf die') and (l2 or '').startswith('Kanten fasen') and J("WERK.ST.bench.wp && WERK.ST.bench.wp.st") == 'finish', {'put': l1, 'op': l2})
    nx = J("(() => { const wp = WERK.ST.bench.wp; return { n: WERK.nextStep(wp), book: WERK.BOOK.map(b => b[1]) }; })()")
    ck('texts of today: the workbench, no thicknesser in the book', 'Dickenhobel' not in json.dumps(nx['book'], ensure_ascii=False) and any('Trommelschleifer' in t for t in nx['book']), nx['book'][7:9])
    E("__H.look(-2.25, -38.9, -2.25, -40.2, 0.9, 60)"); shot('j_workbench')

    # ---------------- own boards: instead of the drying cabinet under the lean-to's roof ----------------
    r = J("""(() => { const bs = HOLZSAW.boards; for (let i = 0; i < 4; i++) bs.push({ id: 'BT' + i, lid: 'T0', sp: 'spruce', n: i, t: 0.052, L: 4.1, zb: -0.05 + i * 0.054, zt: 0.002 + i * 0.054,
        r0: 0.17, r1: 0.14, wS: 0.22, wW: 0.26, pith: false, mc0: 60, mc: 19, st: 'stack', layer: 0, sa: 0, t0: CLOCK.t, tu: CLOCK.t });
        HOLZDRY.stack = HOLZDRY.stack || { found: 0.45, sp: 0.5, gap: true, seal: true, layers: [{ t: 0.052, boards: ['BT0', 'BT1', 'BT2', 'BT3'] }], roof: true, weight: true, L: 4.1, t0: CLOCK.t };
        HOLZDRY.rebuild(); GAME.step(0.1); const a = PLAY.acts().find(a => a.id === 'hd:kiln'); const p = a.pos(); GAME.view(p[0] + 0.6, p[1] + 0.4, 1.62, 225, -12); GAME.step(0.05);
        return { label: a.label(), pos: p.map(v => +v.toFixed(2)) }; })()""")
    lab = r['label']; E("__H.run('hd:kiln')"); E("(() => { let n = 0; while (PLAY.hold && n < 400) { GAME.step(0.025); n++; } return n; })()")
    sh = J("{ kiln: HOLZDRY.kiln, st: HOLZSAW.boards.filter(b => b.id.startsWith('BT')).map(b => b.st), label: __H.label('hd:kiln') }")
    ck('today the dry boards go under the lean-to roof (no drying cabinet)', (lab or '').endswith('unter dem Pultdach nachtrocknen') and sh['kiln'] and sh['kiln'].get('shed') and all(s == 'kiln' for s in sh['st']) and (sh['label'] or '').startswith('Bretter unter dem Dach'), {'first': r, 'then': sh})
    E("__H.look(-4.0, -38.9, -4.65, -40.15, 0.3, 60)"); shot('l_boards_under_the_roof')
    n0 = E("WERK.RACK.items.length")
    E("HOLZSAW.boards.filter(b => b.id.startsWith('BT')).forEach(b => b.mc = 11.6); GAME.step(0.05)")
    lab = E("__H.label('hd:kiln')"); E("__H.run('hd:kiln')"); E("(() => { let n = 0; while (PLAY.hold && n < 400) { GAME.step(0.025); n++; } })()")
    n1 = E("WERK.RACK.items.length")
    ck('… dried below 12 %: own glued panels in the stock under the white bench', (lab or '').startswith('Trockene Bretter') and n1 > n0, {'label': lab, 'stock': [n0, n1]})

    # ---------------- phase 1: the hall, the mill north of it, as before ----------------
    E("GAME.setPhase(1); GAME.step(0.4)")
    p1 = J("""{ off: WORKS.machines.find(m => m.key === 'saw').state.off, door: DOORS.saw.pos.map(v => +v.toFixed(2)), want: __H.W(-0.55, -34.45).map(v => +v.toFixed(2)),
        planer: WERK.ST.planer.op, tent: WERK.ST.tent.op, bench: WERK.ST.bench.op, cover: (() => { GAME.view(...__H.W(-1.95, -37.0), 1.62, 180, -10); GAME.step(0.05); return __H.label('werk:plane:saw'); })(),
        log: (() => { const l = HOLZ.logs.find(l => l.st === 'saw'); return l ? HOLZ.mid(l).map(v => +v.toFixed(2)) : null; })(), hall: __H.meshes().filter(m => m.who === 'hall').length }""")
    ck('phase 1: the mill where the plan has it (the log on it moved along), the hall with planer and fuming tent, no tarpaulin',
       p1['off'] == [0, 0] and abs(p1['door'][0] - p1['want'][0]) < 0.01 and abs(p1['door'][1] - p1['want'][1]) < 0.01 and p1['planer'] and p1['tent'] and p1['cover'] is None and p1['log'] and p1['log'][1] > -34.0 and p1['hall'] > 20, p1)
    E("__H.look(2.5, -31.0, -1.5, -36.5, 0.6)"); shot('k_phase1_hall')
    E("GAME.setPhase(0); GAME.step(0.4)")
    p0 = J("{ off: WORKS.machines.find(m => m.key === 'saw').state.off, log: (() => { const l = HOLZ.logs.find(l => l.st === 'saw'); return l ? HOLZ.mid(l).map(v => +v.toFixed(2)) : null; })() }")
    ck('back in phase 0: the mill and its log in front of the lean-to again', p0['off'] == [-0.45, -3.7] and p0['log'] and p0['log'][1] < -34.5, p0)
    ck.errors(errs)
    ck.done()
