# feat/haeuser (Falko, 13.11.2026): every house of Ratscher can be entered in the normal game (haeuser/haeuser.js, the look of today
# haeuser/haeuser_heute.js on the zombie night's kit ZINNEN). In front of a house by day and by night: the door action, going in, walls stop
# one, the floor carries, the stairs up and down, the cellar through the trapdoor, the attic, coming out, the memory back, no new program;
# all enterable houses mounted and freed once (time per house, draw calls, errors); pictures in three houses by day and night; the other
# looks drawn once without a new program; a villager at home (his own figure, freed again); a save from inside puts one in front of the
# door after a reload. Pictures into out/haeuser/.
#   python3 viz3/test/haeuser.py PORT [only=door+walk+night+shots+looks+gast+sweep+save,tier=hoch,haus=<id>]
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
TIER = opts.get('tier', 'hoch')
ONLY = set(opts.get('only', '').split('+')) - {''}
OUT = lib.out('haeuser')
ck = lib.Checks('haeuser')
errs = []

def want(k):
    return not ONLY or k in ONLY

HELP = r"""
window.__T = {
  hide() { document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#qtrack,#quests,#qbanner,#vhud,#tut').forEach(e => e.style.visibility = 'hidden'); },
  mem() { const m = GAME.R.info.memory; return { g: m.geometries, t: m.textures, p: GAME.R.info.programs.length }; },
  progKeys() { return GAME.R.info.programs.map(p => p.cacheKey); },
  stand(x, y, z, yaw) { const P = GAME.P; P.mode = 'walk'; P.x = x; P.y = y; P.feet = z; P.vz = 0; P.yaw = yaw; P.body = yaw; P.pitch = -6; GAME.step(0.1); },
  walkTo(x, y, secs = 8) { const P = GAME.P; for (let t = 0; t < secs; t += 0.05) { const dx = x - P.x, dy = y - P.y; if (Math.hypot(dx, dy) < 0.25) break; P.yaw = Math.atan2(dx, dy) * 180 / Math.PI; P.body = P.yaw; GAME.step(0.05, 1); }
    GAME.step(0.6);
    const H = HAEUSER.H; return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), room: H ? H.roomAt(P.x, P.y, P.feet + 1) : null }; },
  // straight on for secs (towards yaw): where one ends
  push(yaw, secs) { const P = GAME.P; P.yaw = P.body = yaw; for (let t = 0; t < secs; t += 0.05) GAME.step(0.05, 1); GAME.step(0.3); return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2) }; },
  best() { const a = PLAY.best; try { return a ? { id: a.id, label: a.label() } : null; } catch (e) { return { err: String(e) }; } },
  label(id) { const a = KERN.acts().find(q => q.id === id); try { return a ? a.label() : 'no act'; } catch (e) { return 'ERR ' + e.message; } },
  act(id) { const a = KERN.acts().find(q => q.id === id); if (!a) return false; a.run(); return true; },
  // the programs the house's meshes use that were not there before
  ownPrograms(H, before) {
    const R = GAME.R, keys = new Set(before), bad = new Set(), groups = [H.group].concat(H.lamps.map(l => l.g), H.doorKeys.map(k => DOORS[k].group));
    for (const g of groups) g.traverse(o => { if (!o.isMesh) return; const p = R.properties.get(o.material).currentProgram; if (p && !keys.has(p.cacheKey)) bad.add((o.material.name || o.material.type) + ' ' + p.cacheKey.slice(-80)); });
    return [...bad];
  },
  // a view in a room: from the corner by its door towards the room's middle, eye height; the walker behind the camera
  roomView(H, rid, corner) {
    const P = H.plan, r = P.rooms.find(q => q.id === rid), d = H.doors.find(q => q.room === rid), dp = d ? P.toL(d.pos[0], d.pos[1]) : [(r.x0 + r.x1) / 2, r.y0];
    const cs = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].sort((a, b) => Math.hypot(a[0] - dp[0], a[1] - dp[1]) - Math.hypot(b[0] - dp[0], b[1] - dp[1]));
    const c = cs[corner || 0], m = [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2], e = [c[0] + Math.sign(m[0] - c[0]) * 0.75, c[1] + Math.sign(m[1] - c[1]) * 0.75];
    const ew = P.toW(e[0], e[1]), mw = P.toW(m[0], m[1]), sw = P.toW(c[0] + Math.sign(m[0] - c[0]) * 0.3, c[1] + Math.sign(m[1] - c[1]) * 0.3);
    const yaw = Math.atan2(mw[0] - ew[0], mw[1] - ew[1]) * 180 / Math.PI;
    this.stand(sw[0], sw[1], r.z0, yaw); CAM3.want = false; GAME.view(ew[0], ew[1], r.z0 + 1.62, yaw, -12, 80); GAME.step(0.05);
  },
  waitH(ms) { return new Promise(res => { const t0 = performance.now(); const f = () => (HAEUSER.H || performance.now() - t0 > ms ? res(!!HAEUSER.H) : setTimeout(f, 50)); f(); }); },
};
"""

def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def shot(name): lib.shot(pg, OUT, name)

# the whole page with the action button of the HUD shown („Hineingehen · E“; on a touch screen the same button without „· E“) – slow
# in SwiftShader: a long time limit, and never fatal
def page_shot(name):
    try:
        E("document.querySelectorAll('#doorbtn,#act2').forEach(e => e.style.visibility = 'visible'); GAME.step(0.05); GAME.shot(); 1")
        lbl = E("(document.querySelector('#doorbtn') || {}).textContent || ''")
        pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=180000)
        print('page shot', name, repr(lbl), flush=True)
        return lbl
    except Exception as e:
        print('page shot failed', name, str(e)[:200], flush=True)
        return None
    finally:
        E("document.querySelectorAll('#doorbtn,#act2').forEach(e => e.style.visibility = 'hidden'); 1")

def boot(q=''):
    t0 = time.time()
    hs = opts.get('haus')
    pg.goto(f'http://localhost:{port}/index.html?szenario=haeuser' + (f'&haus={hs}' if hs else '') + q, timeout=300000, wait_until='domcontentloaded')
    while not E("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1500:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3)
    E("window.FREEZE = true")
    print('loaded', round(time.time() - t0), 's', flush=True)
    E(HELP)
    E("__T.hide(); GAME.setMode('day'); GAME.step(0.1)")
    for _ in range(60):
        if E("!!(window.HAEUSER && HAEUSER.scen && HAEUSER.doors)"): break
        E("GAME.step(0.1)"); time.sleep(0.5)

def enter(hid):
    E(f"window.__EN = null; HAEUSER.enter({hid}).then(v => window.__EN = {{ ok: v }}, e => window.__EN = {{ err: String(e) }}); 1")
    for _ in range(300):
        if E("!!window.__EN"): break
        E("GAME.step(0.05)"); time.sleep(0.05)
    return J("window.__EN")

def leave():
    E("window.__LV = null; HAEUSER.leave().then(v => window.__LV = { ok: v }, e => window.__LV = { err: String(e) }); 1")
    for _ in range(300):
        if E("!!window.__LV"): break
        E("GAME.step(0.05)"); time.sleep(0.05)
    return J("window.__LV")

def night(on):
    E(f"GAME.setMode('{'night' if on else 'day'}'); GAME.step(0.3)")
    lib.settle_light(pg)

# in front of a house's door outside, looking at it, third person
def outside(hid):
    E(f"(() => {{ const h = HAEUSER.list().find(q => q.id === {hid}); const x = h.door.x + h.door.nx * 1.6, y = h.door.y + h.door.ny * 1.6; __T.stand(x, y, KERN.terrain(x, y), (Math.atan2(-h.door.nx, -h.door.ny) * 180 / Math.PI + 360) % 360); CAM3.want = true; GAME.step(0.5); return 1; }})()")

with lib.browser() as b:
    pg = lib.page(b, 1920, 1080, errs=errs, tier=TIER)
    boot()
    n = E("HAEUSER.list().length")
    ck('the enterable houses are listed', n > 200, n)
    looks = J("(() => { const o = {}; for (const h of HAEUSER.list()) { const l = HAEUSER.lookOf(h.id); o[l] = (o[l] || 0) + 1; } return o; })()")
    print('looks', json.dumps(looks), flush=True)
    ck('most houses are of today, some kept after 1990 or with the DDR living room, „alt“ only one or two', looks.get('heute', 0) > n * 0.5 and 0 < looks.get('alt', 0) <= 2 and looks.get('heute-ddr', 0) > 5 and looks.get('heute-90', 0) > 5, looks)
    hid = E("HAEUSER.scen")
    print('scene house', hid, E(f"HAEUSER.lookOf({hid})"), flush=True)
    E("GAME.P.mode = 'walk'; CAM3.want = true; GAME.step(0.4)")
    # ---- at the door by day: the action, going in ----
    if want('door') or want('walk'):
        st = J("(() => { GAME.step(0.4); return { best: __T.best(), near: HAEUSER.near && HAEUSER.near.id, label: __T.label('haeuser:rein') }; })()")
        print('door', json.dumps(st, ensure_ascii=False), flush=True)
        ck('at the front door the action „Hineingehen“', st['label'] == 'Hineingehen' and st['near'] == hid and st['best'] and st['best']['id'] == 'haeuser:rein', st)
        shot('00_tuer_tag')
        lbl = page_shot('00_tuer_tag_hud')
        ck('the HUD\'s action button says „Hineingehen · E“', lbl is None or lbl.replace(' ', '') in ('Hineingehen·E', 'Hineingehen'), lbl)
        # the world streams around the walker after the jump (near details, parked cars, the villagers' cars): let it settle first
        for _ in range(8): E("GAME.step(0.5); GAME.shot(); 1")
        base = J("__T.mem()")
        E("window.__K0 = __T.progKeys(); 1")
        E("PLAY.run ? PLAY.run(KERN.acts().find(a => a.id === 'haeuser:rein')) : __T.act('haeuser:rein'); 1")
        for _ in range(300):
            if E("!!HAEUSER.H && !HAEUSER.busy"): break
            E("GAME.step(0.05)"); time.sleep(0.05)
        info = J("(() => { const H = HAEUSER.H; if (!H) return null; return { id: H.id, look: H.plan.look, stats: { ms: H.stats.ms, draws: H.stats.draws, tris: H.stats.tris }, rooms: H.rooms.map(r => r.kind + r.floor + ':' + r.name), walker: { x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet }, entry: H.entry, saved: SAVE.get(HAEUSER.KEY), acts: KERN.acts().filter(a => a.id.startsWith('zinnen:' + H.id + ':c:')).length, place: KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet + 1) }; })()")
        print('inside', json.dumps(info, ensure_ascii=False), flush=True)
        ck('going in: the house is built, one stands in the hall', bool(info) and abs(info['walker']['x'] - info['entry']['x']) < 0.3 and abs(info['walker']['feet'] - info['entry']['z']) < 0.1, info)
        ck('no cupboards to search in the normal game', bool(info) and info['acts'] == 0, info and info['acts'])
        ck('inside: ≤ 60 draw calls', bool(info) and info['stats']['draws'] <= 60, info and info['stats'])
        ck('saved while inside (the door to come back to)', bool(info) and info['saved'] and info['saved']['id'] == hid, info and info['saved'])
        E("GAME.step(0.3)")
        shot('01_flur_tag')
        if want('walk'):
            # walls stop one: straight at the wall beside the entry for 3 s – still inside
            r = J("(() => { const H = HAEUSER.H, P = H.plan; const e = H.entry; __T.stand(e.x, e.y, e.z, e.yaw); const a = __T.push((e.yaw + 90) % 360, 3); const b = __T.push((e.yaw + 270) % 360, 6); return { a, b, insideA: H.inside(a.x, a.y, a.feet), insideB: H.inside(b.x, b.y, b.feet), zG: P.zG }; })()")
            print('walls', json.dumps(r), flush=True)
            ck('walls stop one (inside after walking into them)', r['insideA'] and r['insideB'], r)
            ck('the floor carries (feet on the ground floor)', abs(r['b']['feet'] - r['zG']) < 0.06, r)
            # up the stairs, down again
            r = J("""(() => { const H = HAEUSER.H, P = H.plan, out = {}; if (!P.stair || P.nSt < 2) return { none: true };
              const st = P.stair, cx = (st.x0 + st.x1) / 2, a = P.toW(cx, st.y0 - 0.6), b = P.toW(cx, st.y1 - 0.15), c = P.toW(st.side === 'R' ? st.x0 - 0.3 : st.x1 + 0.3, st.y1 - 0.2);
              __T.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              out.foot = __T.walkTo(a[0], a[1], 10); out.step = __T.walkTo(b[0], b[1], 14); out.top = __T.walkTo(c[0], c[1], 4); out.zTop = P.zF[1];
              const back = P.toW(cx, st.y1 - 0.2); out.back = __T.walkTo(back[0], back[1], 4); out.down = __T.walkTo(a[0], a[1], 14); out.zG = P.zG; return out; })()""")
            print('stairs', json.dumps(r), flush=True)
            if not r.get('none'):
                ck('up the stairs to the upper floor', abs(r['top']['feet'] - r['zTop']) < 0.1, r)
                ck('and down again', abs(r['down']['feet'] - r['zG']) < 0.1, r)
            # the attic stair
            r = J("""(() => { const H = HAEUSER.H, P = H.plan, out = {}; if (!P.astair) return { none: true };
              const st = P.astair, cx = (st.x0 + st.x1) / 2, dir = st.y1 >= st.y0 ? 1 : -1, a = P.toW(cx, st.y0 - dir * 0.7), b = P.toW(cx, st.y1 + dir * 0.7);
              __T.stand(a[0], a[1], P.zF[P.nSt - 1], Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI);
              out.top = __T.walkTo(b[0], b[1], 14); out.zA = P.zA; return out; })()""")
            print('attic', json.dumps(r), flush=True)
            if not r.get('none'):
                ck('up into the attic', abs(r['top']['feet'] - r['zA']) < 0.1, r)
                shot('02_dachboden')
            # the cellar through the trapdoor in the kitchen
            r = J("""(() => { const H = HAEUSER.H, P = H.plan, out = {}; if (!P.hatch) return { none: true };
              const h = P.hatch, cx = (h.x0 + h.x1) / 2, kr = P.rooms.find(q => q.id === h.room.id), dd = H.doors.find(q => q.room === kr.id);
              __T.stand(H.entry.x, H.entry.y, H.entry.z, H.entry.yaw);
              if (dd) GAME.setDoorNow(dd.key, true);
              const p = P.doors.find(q => q.room === kr.id); if (p) { const vert = p.axis === 'y', into = vert ? Math.sign((kr.x0 + kr.x1) / 2 - p.x) : Math.sign((kr.y0 + kr.y1) / 2 - p.y);
                const a = P.toW(vert ? p.x - into * 0.7 : p.x, vert ? p.y : p.y - into * 0.7), b = P.toW(vert ? p.x + into * 0.8 : p.x, vert ? p.y : p.y + into * 0.8); out.door = __T.walkTo(a[0], a[1], 10); out.inKitchen = __T.walkTo(b[0], b[1], 6); }
              const t = P.toW(cx, h.y0 - 0.5); out.atHatch = __T.walkTo(t[0], t[1], 8);
              GAME.setDoorNow(H.hatch.key, true); GAME.step(0.2);
              const d = P.toW(cx, h.y1 + 0.3); out.down = __T.walkTo(d[0], d[1], 12); out.zK = P.cellar.z0; out.place = KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet + 1);
              const u = P.toW(cx, h.y0 - 0.6); out.up = __T.walkTo(u[0], u[1], 14); out.zG = P.zG; return out; })()""")
            print('cellar', json.dumps(r, ensure_ascii=False), flush=True)
            if not r.get('none'):
                ck('down into the cellar through the trapdoor', abs(r['down']['feet'] - r['zK']) < 0.15, r)
                ck('and up again', abs(r['up']['feet'] - r['zG']) < 0.15, r)
            # an inner door opens (the doors' own action), sitting on the sofa
            r = J("""(() => { const H = HAEUSER.H, d = H.doors[0]; if (!d) return { none: true }; const D = DOORS[d.key];
              __T.stand(d.pos[0], d.pos[1], d.pos[2], 0); GAME.step(0.2); const t0 = D.t; GAME.toggleDoor ? GAME.toggleDoor(d.key) : (D.target = 1); GAME.step(1.2); return { t0, t1: D.t }; })()""")
            print('door inside', json.dumps(r), flush=True)
            if not r.get('none'): ck('a door between rooms opens', r['t1'] > 0.8 or r['t0'] > 0.8, r)
            r = J("""(() => { const H = HAEUSER.H, sp = H.spots.find(s => s.kind === 'sitz') || H.spots.find(s => s.kind === 'tisch'); if (!sp) return { none: true };
              const rm = H.rooms.find(q => q.id === sp.room); __T.stand(sp.pos[0], sp.pos[1], rm.z0, 0); GAME.step(0.2);
              const a = KERN.acts().find(q => q.id === 'zinnen:' + H.id + ':s:' + sp.id); const lbl = a ? a.label() : null; if (a) a.run(); GAME.step(0.8);
              const seated = PLAY.seated(); if (seated) PLAY.stand(true); GAME.step(0.2); return { kind: sp.kind, lbl, seated }; })()""")
            print('sit', json.dumps(r, ensure_ascii=False), flush=True)
            if not r.get('none'): ck('sitting down (sofa or chair)', r['seated'], r)
            r = J("""(() => { const H = HAEUSER.H, sp = H.spots.find(s => s.kind === 'bett'); if (!sp) return { none: true };
              const rm = H.rooms.find(q => q.id === sp.room); __T.stand(sp.pos[0], sp.pos[1], rm.z0, 0); GAME.step(0.2);
              const a = KERN.acts().find(q => q.id === 'zinnen:' + H.id + ':s:' + sp.id); const lbl = a ? a.label() : null; if (a) a.run(); GAME.step(0.8);
              const lying = PLAY.seated() && PLAY.seat && PLAY.seat.kind === 'lie'; if (PLAY.seated()) PLAY.stand(true); GAME.step(0.2); return { lbl, lying }; })()""")
            print('lie', json.dumps(r, ensure_ascii=False), flush=True)
            if not r.get('none'): ck('lying on a bed', r['lying'], r)
        # ---- coming out ----
        r = J("(() => { const H = HAEUSER.H; __T.stand(H.entry.x, H.entry.y, H.entry.z, (H.entry.yaw + 180) % 360); GAME.step(0.3); return { best: __T.best(), label: __T.label('haeuser:raus') }; })()")
        print('exit', json.dumps(r, ensure_ascii=False), flush=True)
        ck('inside at the door „Hinausgehen“', r['label'] == 'Hinausgehen', r)
        lbl = page_shot('04_tuer_innen_hud')
        ck('inside the HUD\'s action button says „Hinausgehen · E“', lbl is None or lbl.replace(' ', '') in ('Hinausgehen·E', 'Hinausgehen'), lbl)
        E("__T.act('haeuser:raus'); 1")
        for _ in range(300):
            if E("!HAEUSER.H && !HAEUSER.busy"): break
            E("GAME.step(0.05)"); time.sleep(0.05)
        E("GAME.shot(); GAME.step(0.2); GAME.shot()")
        r = J("({ H: !!HAEUSER.H, mounted: ZINNEN.mounted().length, x: GAME.P.x, y: GAME.P.y, saved: SAVE.get(HAEUSER.KEY), mem: __T.mem() })")
        print('out', json.dumps(r), flush=True)
        ck('coming out: in front of the door, nothing mounted, nothing saved', not r['H'] and r['mounted'] == 0 and r['saved'] is None, r)
        shot('03_draussen')
        # a pure cycle in front of the door (in, drawn, out, drawn): the geometries and textures come back to the count before, and the
        # first house's one program (the terrain cut out under it) is there already – no new one. Streamed cells may finish meanwhile
        # (they add to the count): a cycle that ends above its start is run once more – a leak of the house repeats, a cell does not
        for rep in range(3):
            for _ in range(4): E("GAME.step(0.5); GAME.shot(); 1")
            m0 = J("__T.mem()")
            enter(hid)
            E("GAME.shot(); 1")
            m1 = J("__T.mem()")
            leave()
            E("GAME.step(0.2); GAME.shot(); 1")
            m2 = J("__T.mem()")
            print('cycle', rep, json.dumps({'m0': m0, 'm1': m1, 'm2': m2}), flush=True)
            if m2['g'] <= m0['g'] and m2['t'] <= m0['t'] and m2['p'] <= m0['p']: break
        ck('in and out again: the memory back (geometries, textures), no new program', m2['g'] <= m0['g'] and m2['t'] <= m0['t'] and m1['p'] <= m0['p'], {'m0': m0, 'm1': m1, 'm2': m2})
    # ---- at night: the door, inside with the lamps on ----
    if want('night'):
        night(True)
        E("(() => { const h = HAEUSER.list().find(q => q.id === HAEUSER.scen); const x = h.door.x + h.door.nx * 1.6, y = h.door.y + h.door.ny * 1.6; __T.stand(x, y, KERN.terrain(x, y), (Math.atan2(-h.door.nx, -h.door.ny) * 180 / Math.PI + 360) % 360); CAM3.want = true; GAME.step(0.5); return 1; })()")
        r = J("({ label: __T.label('haeuser:rein'), best: __T.best() })")
        ck('at night the door action too', r['label'] == 'Hineingehen', r)
        shot('10_tuer_nacht')
        lbl = page_shot('10_tuer_nacht_hud')
        ck('at night the HUD\'s action button says „Hineingehen · E“ too', lbl is None or lbl.replace(' ', '') in ('Hineingehen·E', 'Hineingehen'), lbl)
        r = enter(hid)
        r2 = J("(() => { const H = HAEUSER.H; if (!H) return null; GAME.step(0.4); return { lit: Object.keys(H.lit).filter(k => H.lit[k]), lights: KERN.lights.status() }; })()")
        print('night inside', json.dumps(r2), flush=True)
        ck('at night the hall\'s lamp is on, a lamp of the pool lent', bool(r2) and any(k.startswith('flur') for k in r2['lit']) and any(s['id'] == 'zinnen' and s['has'] == 1 for s in r2['lights']), r2)
        E("GAME.step(0.3)")
        shot('11_flur_nacht')
        leave()
        night(False)
    # ---- pictures: three houses (today, a kept one, a villager's), their rooms by day and at night ----
    if want('shots'):
        picks = J("""(() => { const L = HAEUSER.list().map(h => h.id), lk = id => HAEUSER.lookOf(id), P = id => ZIPLAN.plan(id), out = [];
          const ok = id => P(id) && P(id).rooms.some(r => r.kind === 'stube') && P(id).rooms.some(r => r.kind === 'kueche') && P(id).nSt > 1;
          out.push(L.find(id => lk(id) === 'heute' && ok(id) && P(id).rooms.some(r => r.kind === 'kinderzimmer')));
          out.push(L.find(id => lk(id) === 'heute-ddr' && ok(id)) || L.find(id => lk(id) === 'heute-90' && ok(id)));
          out.push(L.find(id => lk(id) === 'heute' && ok(id) && !out.includes(id) && id % 3 === 1) || L.find(id => lk(id) === 'heute' && ok(id) && !out.includes(id)));
          return out.filter(Boolean); })()""")
        if opts.get('haus'): picks = [int(opts['haus'])] + picks[:2]
        print('picture houses', picks, [E(f"HAEUSER.lookOf({h})") for h in picks], flush=True)
        for hi, h in enumerate(picks):
            if not enter(h).get('ok'):
                ck(f'house {h} entered', False, ''); continue
            rooms = J("""(() => { const H = HAEUSER.H, P = H.plan, pick = k => P.rooms.filter(r => r.kind === k)[0];
              return ['stube', 'kueche', 'schlafzimmer', 'kinderzimmer', 'bad', 'kammer', 'flur'].map(pick).filter(Boolean).map(r => r.id); })()""")
            st = J("(() => { const H = HAEUSER.H; return { id: H.id, look: H.plan.look, stats: { ms: H.stats.ms, draws: H.stats.draws, tris: H.stats.tris }, pal: HAEUSER.pal() }; })()")
            print('pictures in', json.dumps(st), rooms, flush=True)
            ck(f'house {h}: ≤ 60 draw calls', st['stats']['draws'] <= 60, st)
            for mode in ('day', 'night'):
                night(mode == 'night')
                for rid in rooms:
                    E(f"(() => {{ const H = HAEUSER.H; if ('{mode}' === 'night') H.light('{rid}', true); __T.roomView(H, '{rid}', 0); GAME.step(0.2); __T.roomView(H, '{rid}', 0); return 1; }})()")
                    shot(f"2{hi}_{h}_{rid}_{'tag' if mode == 'day' else 'nacht'}")
                    if rid.startswith('stube') or rid.startswith('kueche'):
                        E(f"__T.roomView(HAEUSER.H, '{rid}', 2); GAME.step(0.05); 1")
                        shot(f"2{hi}_{h}_{rid}_b_{'tag' if mode == 'day' else 'nacht'}")
                    if mode == 'night': E(f"HAEUSER.H.light('{rid}', false); 1")
            night(False)
            leave()
    # ---- the other looks drawn once (a kept one of the nineties, an old people's, one of before 1960): in front of the door the street
    # drawn till nothing new comes, then in, the living room and the kitchen drawn, out again, the street drawn once more – a program
    # that is new then belongs to the house (the street's are there already: they come with the place, not with the house) ----
    if want('looks'):
        for lk in ('heute-90', 'heute-ddr', 'alt'):
            h = E(f"(() => {{ const P = id => ZIPLAN.plan(id); const L = HAEUSER.list().filter(q => HAEUSER.lookOf(q.id) === '{lk}' && P(q.id).rooms.some(r => r.kind === 'stube') && P(q.id).rooms.some(r => r.kind === 'kueche')); return L.length ? L[L.length >> 1].id : null; }})()")
            if not h:
                ck(f'a house in the look {lk}', False, ''); continue
            outside(h)
            for _ in range(6): E("GAME.step(0.5); GAME.shot(); 1")
            E("window.__K2 = __T.progKeys(); 1")
            if not (enter(h) or {}).get('ok'):
                ck(f'house {h} ({lk}) entered', False, ''); continue
            E("""(() => { const H = HAEUSER.H, P = H.plan; for (const k of ['stube', 'kueche']) { const r = P.rooms.find(q => q.kind === k); if (!r) continue;
              __T.roomView(H, r.id, 0); GAME.step(0.1); GAME.shot(); __T.roomView(H, r.id, 2); GAME.step(0.1); GAME.shot(); } return 1; })()""")
            rid = E("(() => { const r = HAEUSER.H.plan.rooms.find(q => q.kind === 'stube'); __T.roomView(HAEUSER.H, r.id, 0); GAME.step(0.1); return r.id; })()")
            shot(f"40_{lk}_{h}_{rid}")
            st = J("(() => { const H = HAEUSER.H; return { id: H.id, look: H.plan.look, draws: H.stats.draws, warmN: HAEUSER.warmN || 0 }; })()")
            # the programs the house's own meshes use (a program that came with the view out of the windows – the gardens behind the
            # houses, not seen from the street – is the street's business, not the house's)
            own = J("__T.ownPrograms(HAEUSER.H, window.__K2)")
            leave()
            outside(h)
            for _ in range(2): E("GAME.step(0.5); GAME.shot(); 1")
            new = [k for k in J("__T.progKeys()") if k not in set(J("window.__K2"))]
            print('look', lk, json.dumps(st), 'new programs', len(new), 'of the house', len(own), flush=True)
            for k in new: print('  new program', k[:160], '…', k[-200:], flush=True)
            for k in own: print('  the house\'s own', k, flush=True)
            json.dump({'before': J("window.__K2"), 'new': new, 'own': own}, open(os.path.join(OUT, f'programme_{lk}.json'), 'w'))
            ck(f'look {lk} (house {h}): its meshes drawn with programs that were there before, ≤ 60 draw calls', not own and st['draws'] <= 60, {'st': st, 'own': own, 'new': [k[-120:] for k in new]})
    # ---- all houses once: mounted with their look of today and freed, no error, time and draw calls (the street drawn first: the
    # programs counted are those mounting and freeing make; drawing the houses is the business of the sections above) ----
    if want('sweep'):
        for _ in range(3): E("GAME.step(0.3); GAME.shot(); 1")
        E("window.__K1 = __T.progKeys(); 1")
        t1 = time.time()
        sw = json.loads(E("""(async () => { const bad = [], ids = HAEUSER.list().map(h => h.id), m0 = __T.mem(); let n = 0, ms = 0, mx = 0, dr = 0, tris = 0, own = new Set();
          for (const id of ids) { let H = null; try { H = await ZINNEN.mount(id, { look: HAEUSER.lookOf(id), still: true }); } catch (e) { bad.push({ id, err: String(e).slice(0, 200) }); continue; }
            if (!H) { bad.push({ id, err: 'no handle' }); continue; } n++; ms += H.stats.ms; mx = Math.max(mx, H.stats.ms); dr = Math.max(dr, H.stats.draws); tris = Math.max(tris, H.stats.tris);
            if (H.stats.draws > 60 || ZINNEN.err) bad.push({ id, look: H.plan.look, draws: H.stats.draws, err: ZINNEN.err ? ZINNEN.err.slice(0, 300) : null });
            ZINNEN.unmount(H); }
          GAME.shot(); const m1 = __T.mem();
          return JSON.stringify({ ids: ids.length, n, msAvg: Math.round(ms / Math.max(1, n)), msMax: Math.round(mx), drawsMax: dr, trisMax: tris, bad, m0, m1, pal: HAEUSER.pal() }); })()"""))
        print('sweep', round(time.time() - t1), 's', json.dumps({k: sw[k] for k in ('ids', 'n', 'msAvg', 'msMax', 'drawsMax', 'trisMax', 'm0', 'm1', 'pal')}), 'bad', len(sw['bad']), flush=True)
        for bb in sw['bad'][:30]: print('  sweep', json.dumps(bb), flush=True)
        ck('all houses mount in their look of today and are freed (≤ 60 draw calls, no error)', sw['n'] == sw['ids'] and not sw['bad'], {'n': sw['n'], 'bad': [x['id'] for x in sw['bad']]})
        ck('the palette has room left (no colour falls back to a material of its own)', sw['pal'] < 1024, sw['pal'])
        new = [k for k in J("__T.progKeys()") if k not in set(J("window.__K1"))]
        ck('no new shader program after the first house', not new, [k[-120:] for k in new])
    # ---- a villager at home (dorf knows the homes and the day): Gerhard on his couch, a figure of its own; freed on coming out ----
    if want('gast'):
        t = J("""(() => { const d = Math.floor(CLOCK.t / 1440); for (let m = 9 * 60; m < 21 * 60; m += 10) { const t = d * 1440 + m;
          if (!DLIFE.away('gerhard', t) && !DLIFE.routine('gerhard', t) && !DCAL.on('skat', t) && !DCAL.on('fire', t)) { CLOCK.t = t; return t; } } return null; })()""")
        print('gerhard at home at', t, flush=True)
        # (in front of his door first, the street drawn till it is complete: the count before is taken where the count after is)
        outside(247)
        for _ in range(8): E("GAME.step(0.5); GAME.shot(); 1")
        m0 = J("__T.mem()")
        r = enter(247)
        for _ in range(200):
            if E("!!(window.HGAST && HGAST.f) || !HAEUSER.guest"): break
            E("GAME.step(0.05)"); time.sleep(0.1)
        g = J("({ guest: HAEUSER.guest, fig: !!HGAST.f, err: HGAST.err, label: __T.label('haeuser:gast'), head: HGAST.head() })")
        print('gast', json.dumps(g, ensure_ascii=False), flush=True)
        ck('Gerhard is at home: on his couch (his own figure), „Gerhard grüßen“', g['guest'] == 'gerhard' and g['fig'] and g['label'] == 'Gerhard grüßen', g)
        if g['fig']:
            E("""(() => { const H = HAEUSER.H, f = HGAST.f, r = H.rooms.find(q => q.id === H.roomAt(f.at.x, f.at.y, f.at.z + 0.5)), c = [0, 1].map(i => r.poly.reduce((s, p) => s + p[i], 0) / 4);
              const dx = f.at.x - c[0], dy = f.at.y - c[1], L = Math.hypot(dx, dy) || 1, ex = f.at.x - dx / L * 2.6 + 0.3, ey = f.at.y - dy / L * 2.6 + 0.3;
              __T.stand(ex, ey, r.z0, Math.atan2(f.at.x - ex, f.at.y - ey) * 180 / Math.PI); CAM3.want = false; GAME.view(ex, ey, r.z0 + 1.62, Math.atan2(f.at.x - ex, f.at.y - ey) * 180 / Math.PI, -14, 78); GAME.step(0.2); return 1; })()""")
            shot('30_gerhard_zu_hause')
        leave()
        outside(247)
        for _ in range(3): E("GAME.step(0.5); GAME.shot(); 1")
        m1 = J("__T.mem()")
        # a cell of the street that finished meanwhile adds to the count once; a figure that is not freed adds again each time: once
        # more in and out, and the second count must not grow
        m2 = m1
        if m1['g'] > m0['g'] or m1['t'] > m0['t']:
            enter(247)
            for _ in range(200):
                if E("!!(window.HGAST && HGAST.f) || !HAEUSER.guest"): break
                E("GAME.step(0.05)"); time.sleep(0.1)
            E("GAME.step(0.2); GAME.shot(); 1")
            leave()
            outside(247)
            for _ in range(3): E("GAME.step(0.5); GAME.shot(); 1")
            m2 = J("__T.mem()")
        lf = J("({ loads: HGAST.loads, frees: HGAST.frees, f: !!HGAST.f })")
        ck('coming out: the figure is gone, its geometries and textures freed', not lf['f'] and lf['loads'] == lf['frees'] and ((m1['g'] <= m0['g'] and m1['t'] <= m0['t']) or (m2['g'] <= m1['g'] and m2['t'] <= m1['t'])), {'m0': m0, 'm1': m1, 'm2': m2, 'hgast': lf})
    # ---- a save from inside: after a reload one stands in front of the door ----
    if want('save'):
        r = enter(hid)
        s = J("SAVE.get(HAEUSER.KEY)")
        print('saved', json.dumps(s), flush=True)
        pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        for _ in range(40):
            if E("window.GAME && GAME.P.mode === 'walk'"): break
            time.sleep(0.5)
        r = J("({ mode: GAME.P.mode, x: GAME.P.x, y: GAME.P.y, mounted: window.ZINNEN ? ZINNEN.mounted().length : -1, saved: SAVE.get('pav-haeuser-v1') })")
        print('after reload', json.dumps(r), flush=True)
        ck('after a reload: in front of the door outside (not in the house)', bool(s) and r['mode'] == 'walk' and abs(r['x'] - s['out'][0]) < 0.5 and abs(r['y'] - s['out'][1]) < 0.5 and r['mounted'] == 0 and r['saved'] is None, {'saved': s, 'now': r})
    ok, gl = lib.check_gl(pg, 16)
    ck('shader programs within 16 textures, none broken', ok, {k: gl[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')})
    ck.errors(errs)
    ck.done()
