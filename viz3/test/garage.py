# feat/garage (Falko, 23.10.2026 10:53): the old tin garage of construction phase 0 – two sliding leaves to the north, shelves with tools,
# the petrol lawn mower (take it out, start it, mow a strip, the tank goes down, refuel, park it; the task „Rasen mähen“ in the journal),
# the red petrol can, the generator's petrol, Hubert's diesel can in the garage, a reload keeps the mown lawn and the mower's place.
# Pictures into out/garage/.
#   python3 viz3/test/garage.py PORT [nogeo=1,tier=hoch,only=programs+doors+inside+night+mower+petrol+diesel+sued+reload]
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
TIER = opts.get('tier', 'hoch')
QUERY = '?bauphase=0' + ('&nogeo=1' if opts.get('nogeo') == '1' else '')
ONLY = set(opts.get('only', '').split('+')) - {''}
OUT = lib.out('garage')
ck = lib.Checks('garage')
errs = []

def want(k):
    return not ONLY or k in ONLY

HELP = r"""
window.__G = {
  hide() { document.querySelectorAll('.ov,#doorbtn,#act2,#joy,header,#ppanel,#talkbtn,#npcsub,#toast,#qtrack,#quests,#qbanner,#vhud').forEach(e => e.style.visibility = 'hidden'); },
  act(id) { return PLAY.acts().find(a => a.id === id); },
  label(id) { const a = this.act(id); try { return a ? a.label() : 'no act'; } catch (e) { return 'ERR ' + e.message; } },
  // stand d metres from an act (on the side given by az, compass degrees from the act), facing it
  at(id, d, az) { const a = this.act(id); const p = a.pos(); const r = az * Math.PI / 180, x = p[0] + Math.sin(r) * d, y = p[1] + Math.cos(r) * d;
    GAME.view(x, y, 1.62 + GAME.floorAt(x, y, 0.5), Math.atan2(p[0] - x, p[1] - y) * 180 / Math.PI, -12); GAME.step(0.1); return this.label(id); },
  // do an act the way the button does (with its hold time)
  run(id, secs = 0.3) { const a = this.act(id); if (!a) return 'no act ' + id; let l = null; try { l = a.label(); } catch (e) {} if (!l) return 'no label';
    PLAY.run(a); for (let t = 0; t < secs; t += 0.05) GAME.step(0.05); return l; },
  // walk: forward (f = 1) or back (f = -1) for secs, in steps
  walk(secs, f = 1) { for (let t = 0; t < secs; t += 0.05) GAME.step(0.05, f); const P = GAME.P; return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), place: KERN.place(P.x, P.y, P.feet) }; },
  m() { const M = GPLAY.M; return { x: +M.x.toFixed(2), y: +M.y.toFixed(2), z: +M.z.toFixed(2), az: +M.az.toFixed(1), mode: M.mode, run: M.run, fuel: +M.fuel.toFixed(3) }; },
  leaves() { return GARAGE.GAR.alt.leaves.map(L => ({ k: +L.k.toFixed(2), want: L.want, x: +L.g.position.x.toFixed(2) })); },
};
"""

def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def shot(name): lib.shot(pg, OUT, name)
def view(x, y, z, yaw, pitch, fov=70): E(f"GAME.view({x}, {y}, {z}, {yaw}, {pitch}, {fov}); GAME.step(0.05)")
# the mowing task in the journal: its state and its entry (text, status, where its arrow points)
TASK = "(() => { const e = KERN.tasks.list().find(e => e.key === 'aufgaben:garage-rasen'); return { st: TASKS.state('garage-rasen'), e: e ? { text: e.text, status: e.status, tg: typeof e.target === 'function' ? e.target() : null } : null }; })()"

def boot():
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{QUERY}', timeout=300000, wait_until='domcontentloaded')
    while not E("!!(window.GAME && GAME.loaded && GAME.loaded())"):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad or time.time() - t0 > 1500:
            ck('page loads', False, ' | '.join(bad[:3]) or 'time-out'); ck.errors(errs); ck.done()
        time.sleep(2)
    time.sleep(3); E("window.FREEZE = true"); print('loaded', round(time.time() - t0), 's', flush=True)
    E(HELP)
    E("__G.hide(); GAME.setMode('day'); CAM3.want = false; GAME.step(0.1)")
    # the start in phase 0, the garage's things placed (its module loads after the model)
    for _ in range(40):
        if E("!!(window.GPLAY && GPLAY.M && window.PHASE === 0 && QUESTS.things.CAN.pos)"): break
        E("GAME.step(0.1)"); time.sleep(0.25)

with lib.browser() as b:
    pg = lib.page(b, 1100, 660, errs=errs, tier=TIER)
    boot()
    st = J("{ phase: window.PHASE, leaves: GARAGE.GAR.alt.leaves.length, acts: PLAY.acts().filter(a => /^garage:/.test(a.id)).map(a => a.id), progs: GAME.perf().programs, m: __G.m(), save: SAVE.keys().some(k => k.key === 'pav-garage-v1') }")
    print('state', json.dumps(st), flush=True)
    ck('starts in phase 0 with the old garage', st['phase'] == 0 and st['leaves'] == 2, st)
    ck('actions registered (two leaves, mower, motor, tanken, generator)', all(('garage:' + k) in st['acts'] for k in ['garageW', 'garageO', 'maeher', 'motor', 'tanken', 'aggregat']), st['acts'])
    ck('save key registered', st['save'])
    E("SAVE.load({ 'pav-garage-v1': null }); GPLAY.load(); GAME.step(0.1)")
    # shader programs the old garage needs beyond the finished model's (the GPU is prepared with the finished pavilion; a program first
    # needed in phase 0 compiles when the garage comes into view)
    if want('programs'):
        E("GAME.setPhase(GAME.PHASES.length - 1); GAME.view(2.0, 9.0, 1.65, 180, -6, 62); GAME.step(0.05); GAME.shot()")
        k0 = J("GAME.R.info.programs.map(p => p.cacheKey)")
        E("GAME.setPhase(0); GARAGE.GAR.alt.leaves.forEach(L => GPLAY.slide(L, 1, true)); GAME.step(1.5)")
        for v_ in ["2.0, 9.0, 1.65, 180, -6, 62", "2.0, 4.6, 1.62, 180, -14, 78", "2.9, 3.5, 1.6, 225, -16, 80", "1.0, 3.3, 1.6, 140, -16, 80"]:
            E(f"GAME.view({v_}); GAME.step(0.05); GAME.shot()")
        new_ = J(f"GAME.R.info.programs.filter(p => !{json.dumps(k0)}.includes(p.cacheKey)).map(p => p.name + ' ' + p.cacheKey.slice(-160))")
        print('new programs in phase 0:', len(new_), json.dumps(new_, ensure_ascii=False)[:3000], flush=True)
        ck('the old garage needs at most 2 programs of its own', len(new_) <= 2, len(new_))
    # ---------------- the doors: closed they block, the action slides them open, south wall closed ----------------
    if want('doors'):
        E("GARAGE.GAR.alt.leaves.forEach(L => GPLAY.slide(L, 0, true)); GAME.step(1.5)")
        view(2.0, 9.0, 1.65, 180, -6, 62); shot('nord_zu')
        r = E("(() => { GAME.view(1.6, 6.0, 1.62, 180, 0); return JSON.stringify(__G.walk(4.0)); })()")
        r = json.loads(r); ck('closed leaves block the way in from the north', r['y'] > 4.05, r)
        lab = E("__G.at('garage:garageW', 0.9, 0)")
        ck('at the west leaf (outside): "Tor aufschieben"', lab == 'Tor aufschieben', lab)
        E("__G.run('garage:garageW', 0.2)")
        lv = J("__G.leaves()"); ck('the west leaf starts to slide', lv[0]['want'] == 1 and 0 < lv[0]['k'] < 1, lv)
        view(2.6, 7.5, 1.65, 200, -6, 62); shot('nord_halb_offen')
        E("GAME.step(1.4)")
        lv = J("__G.leaves()"); ck('… and stands open (1.3 m to the west)', lv[0]['k'] == 1 and abs(lv[0]['x'] + 1.3) < 0.01, lv)
        lab = E("__G.at('garage:garageO', 0.9, 10)")
        ck('the east leaf on its own: "Tor aufschieben"', lab == 'Tor aufschieben', lab)
        E("__G.run('garage:garageO', 1.6)")
        lv = J("__G.leaves()"); ck('both leaves open', all(L['k'] == 1 for L in lv), lv)
        lab = E("__G.at('garage:garageO', 0.9, 0)")
        ck('open leaf offers "Tor zuschieben"', lab == 'Tor zuschieben', lab)
        view(2.0, 9.0, 1.65, 180, -6, 62); shot('nord_offen')
        view(-2.6, 7.6, 1.7, 148, -8, 62); shot('nordwest_offen')
        r = json.loads(E("(() => { GAME.view(1.4, 6.0, 1.62, 180, 0); return JSON.stringify(__G.walk(2.2)); })()"))
        ck('walk in through the open door: "Alte Garage"', r['place'] == 'Alte Garage' and r['y'] < 3.8, r)
        r = json.loads(E("(() => { GAME.view(2.0, -3.0, 1.62, 0, 0); return JSON.stringify(__G.walk(3.0)); })()"))
        ck('the south wall is closed now', r['y'] < 0.0, r)
        # the leaves are obstacles where they are: the open west leaf west of the opening
        r = json.loads(E("(() => { GAME.view(0.0, 6.0, 1.62, 180, 0); return JSON.stringify(__G.walk(3.0)); })()"))
        ck('the open leaf blocks in front of the west wall', r['y'] > 4.05, r)
    # ---------------- inside: shelves, bench, tools, mower, cans ----------------
    if want('inside'):
        E("GARAGE.GAR.alt.leaves.forEach(L => GPLAY.slide(L, 1, true)); GAME.step(1.5)")
        view(2.0, 4.6, 1.62, 180, -14, 78); shot('innen_von_tuer')
        view(2.9, 3.5, 1.6, 225, -16, 80); shot('innen_regal_west')
        view(1.0, 3.3, 1.6, 140, -16, 80); shot('innen_regal_ost_kanister')
        view(2.0, 2.2, 1.55, 180, -10, 80); shot('innen_werkbank')
        view(3.0, 1.2, 1.55, 300, -20, 80); shot('innen_maeher')
        cans = J("{ petrol: GPLAY.CANT.pos, diesel: QUESTS.things.CAN.pos, inP: GARAGE.inside(GPLAY.CANT.pos[0], GPLAY.CANT.pos[1]), inD: GARAGE.inside(QUESTS.things.CAN.pos[0], QUESTS.things.CAN.pos[1]), m: __G.m() }")
        ck('petrol can, diesel can and the mower inside the garage', cans['inP'] and cans['inD'] and 0.1 < cans['m']['x'] < 3.9 and 0.1 < cans['m']['y'] < 3.9, cans)
        cost = E("""(() => { const I = GAME.R.info; GAME.view(2.0, 4.6, 1.62, 180, -14, 78); I.autoReset = false; I.reset(); GAME.shot(); const o = { calls: I.render.calls, tris: I.render.triangles, programs: I.programs.length }; I.autoReset = true; return JSON.stringify(o); })()""")
        print('render cost (from the door)', cost, flush=True)
    # ---------------- night: the fluorescent tube (a borrowed pavilion light, free in phase 0) ----------------
    if want('night'):
        E("GARAGE.GAR.alt.leaves.forEach(L => GPLAY.slide(L, 1, true)); GAME.step(1.5)")
        E("GAME.setMode('night')"); lib.settle_light(pg)
        lab = E("__G.at('garage:licht', 0.8, 180)")
        ck('switch inside by the door: "Licht an"', lab == 'Licht an', lab)
        E("__G.run('garage:licht', 1.4)")
        st_ = J("{ lent: KERN.lights.status().find(b => b.id === 'garage-licht'), glow: GARAGE.tube.emissiveIntensity }")
        ck('the tube lights (a pavilion light lent to it)', st_['lent'] and st_['lent']['has'] == 1 and st_['glow'] > 0.5, st_)
        view(2.0, 4.6, 1.62, 180, -14, 78); shot('nacht_innen_licht')
        view(2.0, 9.0, 1.65, 180, -6, 62); shot('nacht_aussen_licht')
        E("__G.at('garage:licht', 0.8, 180); __G.run('garage:licht', 0.3)")
        st_ = J("{ lent: KERN.lights.status().find(b => b.id === 'garage-licht'), glow: GARAGE.tube.emissiveIntensity }")
        ck('switched off: the light goes back', st_['lent'] and st_['lent']['has'] == 0 and st_['glow'] == 0, st_)
        E("GAME.setMode('day')"); lib.settle_light(pg)
    # ---------------- the mower: take it out, start, mow a strip, fuel, park ----------------
    if want('mower'):
        E("GARAGE.GAR.alt.leaves.forEach(L => GPLAY.slide(L, 1, true)); GAME.step(1.5)")
        E("GPLAY.M.fuel = 0.5; GPLAY.mowerHome(0); GAME.step(0.1)")
        lab = E("__G.at('garage:maeher', 0.4, 180)")
        ck('behind the handle: "Rasenmäher nehmen"', lab == 'Rasenmäher nehmen', lab)
        E("__G.run('garage:maeher', 0.2)")
        m = J("{ m: __G.m(), carry: PLAY.carry && PLAY.carry.id, body: GAME.P.body }")
        ck('pushing: the handle in the hand', m['m']['mode'] == 'push' and m['carry'] == 'maeher', m)
        r = J("__G.walk(4.5)")
        m = J("__G.m()")
        ck('pushed out through the door to the north', m['y'] > 5.0 and r['y'] > 3.6, {'m': m, 'p': r})
        # the figure pushing it, seen from behind (third person; GAME.view would move the walker – only the view turns here)
        E("CAM3.want = true; GAME.P.yaw = GPLAY.M.az; GAME.P.pitch = -16; GAME.step(1.0)"); shot('maeher_schieben')
        E("CAM3.want = false; GAME.P.pitch = -28; GAME.step(0.2)"); shot('maeher_ich_sicht')
        E("GAME.P.pitch = -10; GAME.step(0.1)")
        # turning with the view: the heading follows
        E("(() => { GAME.P.yaw = GPLAY.M.az + 60; })(); GAME.step(1.2)")
        m2 = J("__G.m()"); ck('the mower turns with the view', abs(((m2['az'] - m['az'] + 540) % 360) - 180) > 40, [m['az'], m2['az']])
        E("(() => { GAME.P.yaw = 0; })(); GAME.step(1.4)")
        lab = E("__G.label('garage:motor')")
        ck('motor action while pushing', lab.startswith('Motor starten'), lab)
        E("__G.run('garage:motor', 1.0)")
        r1 = J("__G.m()")
        if not r1['run']: E("__G.run('garage:motor', 1.0)")
        m = J("__G.m()"); ck('the engine runs (pull cord, a cold engine twice)', m['run'], m)
        tk = J(TASK)
        ck('journal: "Rasen mähen" begins with the engine', bool(tk['st']) and tk['st']['st'] == 'läuft' and bool(tk['e']) and 'm²' in tk['e']['text'], tk)
        f0 = m['fuel']; t0 = E("CLOCK.t")
        a0 = E("GRASS.cutArea(CLOCK.t)")
        # mow a strip to the north, between the carport and the bungalow
        E("GAME.P.yaw = 4; GAME.step(1.2)")
        p0 = J("__G.m()")
        r = J("__G.walk(6.0)")
        p1 = J("__G.m()")
        cnt = J(f"(() => {{ const a = [{p0['x']}, {p0['y']}], b = [{p1['x']}, {p1['y']}], o = []; for (let k = 0.25; k < 0.8; k += 0.25) o.push(GRASS.cutCount(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 0.2)); return o; }})()")
        print('cut along the strip', json.dumps(cnt), flush=True)
        n_cut = sum(c['n'] for c in cnt); n_all = sum(c['all'] for c in cnt)
        ck('the lawn is short where the running mower passed', n_all > 0 and n_cut >= 0.8 * n_all, f'{n_cut}/{n_all} clumps cut, mower {p0} → {p1}')
        # beside the strip (the first spot 1.4–3 m to either side that has lawn): long
        side = J(f"""(() => {{ const a = [{p0['x']}, {p0['y']}], b = [{p1['x']}, {p1['y']}], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
          q = [(b[1] - a[1]) / L, -(b[0] - a[0]) / L]; for (const d of [1.4, -1.4, 2, -2, 2.6, -2.6, 3, -3]) {{ const c = GRASS.cutCount(m[0] + q[0] * d, m[1] + q[1] * d, 0.6); if (c.all > 0) return Object.assign(c, {{ d }}); }} return {{ n: 0, all: 0 }}; }})()""")
        ck('… and only there (beside the strip the lawn is long)', side['all'] > 0 and side['n'] == 0, side)
        a1 = E("GRASS.cutArea(CLOCK.t)")
        ck('mown area grows', a1 > a0 + 0.5, f'{a0} → {a1} m²')
        m = J("__G.m()"); dt_ = E("CLOCK.t") - t0
        ck('the tank goes down while it runs (about 1 l per game hour)', m['fuel'] < f0 and abs((f0 - m['fuel']) - dt_ / 60) < 0.02, f"{f0} → {m['fuel']} l in {dt_:.1f} game min")
        # the task: for the test a small lawn is enough – then it asks for the mower back in the garage
        E("GPLAY.LAWN.m2 = 0.5; GAME.step(0.6)")
        tk = J(TASK)
        ck('… mown: next "Stell den Rasenmäher zurück in die Garage" (with a target)', bool(tk['st']) and tk['st']['i'] == 1 and 'Garage' in tk['e']['text'] and tk['e']['tg'] is not None, tk)
        E("CAM3.want = true; GAME.P.pitch = -16; GAME.step(1.0)"); shot('maehen')
        E("CAM3.want = false; GAME.step(0.1)")
        strip = (p0, p1)
        # the tank runs dry: the engine stops by itself
        E("GPLAY.M.fuel = 0.002; GAME.step(0.6)")
        m = J("__G.m()"); ck('empty tank: the engine stops', not m['run'] and m['fuel'] == 0, m)
        lab = E("__G.label('garage:motor')"); ck('… "Tank leer"', lab == 'Tank leer', lab)
        ev = J("KERN.events().filter(e => e.name === 'garage:gemaeht').map(e => e.data)")
        ck('event garage:gemaeht with the mown m²', len(ev) > 0 and ev[-1]['m2'] > 0, ev[-1:] if ev else ev)
        # let go (Q) and refuel from the red can
        E("PLAY.secondary(); GAME.step(0.2)")
        m = J("{ m: __G.m(), carry: PLAY.carry && PLAY.carry.id }")
        ck('Q lets go of the mower', m['m']['mode'] == 'park' and m['carry'] is None, m)
        a, b_ = strip
        view(a['x'] - 3.2, a['y'] - 1.0, 2.6, 30, -24, 66); shot('gemaehter_streifen')
        E("PLAY.give(GPLAY.CANT); GAME.step(0.2)")
        c0 = E("GPLAY.C.fuel")
        lab = E("__G.at('garage:tanken', 0.7, 90)")
        ck('with the petrol can: "Rasenmäher tanken"', lab.startswith('Rasenmäher tanken'), lab)
        E("CAM3.want = true; GAME.step(0.4)")
        E("PLAY.run(__G.act('garage:tanken')); GAME.step(1.2)"); shot('tanken')
        E("GAME.step(1.8)")
        m = J("{ m: __G.m(), can: GPLAY.C.fuel }")
        ck('refuelled: tank full, the can lighter', abs(m['m']['fuel'] - 1.0) < 1e-6 and abs(m['can'] - (c0 - 1.0)) < 1e-6, m)
        E("CAM3.want = false; GAME.step(0.2)")
        E("PLAY.secondary(); GAME.step(0.2)")
        # park it back in the garage: take it again, turn round, push it in
        E("(() => { const M = GPLAY.M; M.x = 2.0; M.y = 6.6; M.az = 180; GPLAY.mowerHome && 0; })(); GAME.step(0.1)")
        E("GPLAY.M.z = 0; GAME.step(0.1)")
        lab = E("__G.at('garage:maeher', 0.4, 0)")
        E("__G.run('garage:maeher', 0.2)")
        r = J("__G.walk(4.0)")
        m = J("__G.m()")
        ck('pushed back into the garage', 0.4 < m['y'] < 3.6 and 0.4 < m['x'] < 3.6 and m['mode'] == 'push', {'m': m, 'p': r})
        E("PLAY.secondary(); GAME.step(0.6)")
        tk = J(TASK)
        ck('… parked: the task "Rasen mähen" is done', bool(tk['st']) and tk['st']['st'] == 'erledigt' and 'gemäht' in tk['e']['text'], tk)
        E("GPLAY.LAWN.m2 = 120")
        view(2.0, 5.6, 1.65, 180, -16, 70); shot('maeher_geparkt')
    # ---------------- petrol for the generator ----------------
    if want('petrol'):
        E("GPLAY.GEN.fuel = 5; GAME.step(0.1)")
        lab = E("(() => { PLAY.select(-1, true); return __G.at('garage:aggregat', 1.0, 0); })()")
        ck('the generator says it runs on petrol', 'Benzin' in (lab or ''), lab)
        E("PLAY.give(GPLAY.CANT); GAME.step(0.2)")
        lab = E("__G.at('garage:aggregat', 1.0, 0)")
        ck('with the can: "Aggregat tanken"', (lab or '').startswith('Aggregat tanken'), lab)
        c0 = E("GPLAY.C.fuel")
        E("__G.run('garage:aggregat', 3.6)")
        g = J("{ gen: GPLAY.GEN.fuel, can: GPLAY.C.fuel }")
        ck('generator refuelled from the petrol can', g['gen'] > 5 and g['can'] < c0, g)
        E("GPLAY.GEN.fuel = 0; DOORS.planer && (DOORS.planer.target = 1); GAME.step(0.3)")
        on = E("!!(DOORS.planer && DOORS.planer.target > 0.5)")
        ck('empty generator: the machines stop', not on, on)
        E("GPLAY.GEN.fuel = 9; PLAY.select(-1, true); PLAY.secondary(); GAME.step(0.2)")
    # ---------------- Hubert's diesel can is in the garage ----------------
    if want('diesel'):
        d = J("{ pos: QUESTS.things.CAN.pos, inside: GARAGE.inside(QUESTS.things.CAN.pos[0], QUESTS.things.CAN.pos[1]) }")
        ck('the diesel can stands in the old garage', d['inside'], d)
        E("QUESTS.Q.diesel.st = 'fetch'")
        txt = J("(() => { const a = QUESTS.objective ? QUESTS.objective('diesel') : null; return a; })()")
        print('objective', txt, flush=True)
        ans = J("QUESTS.ask('hubert', 'q_kanister')")
        ck("Hubert's answer names the garage", 'garage' in json.dumps(ans, ensure_ascii=False).lower(), ans)
        E("GARAGE.GAR.alt.leaves.forEach(L => GPLAY.slide(L, 0, true)); GAME.step(1.5)")
        lab = E("(() => { const p = QUESTS.things.CAN.pos; GAME.view(p[0], 4.6, 1.62, 180, -20); GAME.step(0.1); return __G.label('take:can'); })()")
        ck('not through the closed door', lab is None, lab)
        E("GARAGE.GAR.alt.leaves.forEach(L => GPLAY.slide(L, 1, true)); GAME.step(1.5)")
        lab = E("(() => { const p = QUESTS.things.CAN.pos; GAME.view(p[0] - 0.7, 3.4, 1.62 + 0.15, 110, -30); GAME.step(0.1); return __G.label('take:can'); })()")
        ck('inside: "Dieselkanister nehmen"', lab == 'Dieselkanister nehmen', lab)
        view(2.6, 4.4, 1.6, 140, -28, 70); shot('kanister')
        E("QUESTS.Q.diesel.st = 'new'")
        # phase 1: the things move to the garage at the south end (the petrol can back at its place first)
        E("(() => { if (PLAY.has(GPLAY.CANT)) PLAY.take(GPLAY.CANT); const h = GPLAY.home().petrol; GPLAY.CANT.place(h[0], h[1], h[2], 0); })()")
        E("GAME.setPhase(1); GAME.step(0.3)")
        h = J("{ m: __G.m(), can: QUESTS.things.CAN.pos, petrol: GPLAY.CANT.pos, home: GPLAY.home() }")
        ck('phase 1: mower and cans at the garage at the south end', h['m']['y'] < -14 and h['can'][1] < -14 and h['petrol'][1] < -14, h)
        E("(() => { const H = GPLAY.home(); GAME.view(H.mower[0] - 1.5, H.mower[1] + 4.5, 1.7, 165, -12, 66); GAME.step(0.1); })()"); shot('phase1_garage_sued')
        E("GAME.setPhase(0); GAME.step(0.3)")
    # ---------------- from phase 1: the garage at the south end (store for the wood) with the same leaves; the mower lives there ----------------
    if want('sued'):
        E("GAME.setPhase(1); GAME.step(0.3)")
        g1 = J("{ acts: PLAY.acts().filter(a => /^garage:sued/.test(a.id)).map(a => a.id), home: GPLAY.home(), m: __G.m(), inM: GARAGE.insideAt(1, GPLAY.M.x, GPLAY.M.y), lv: GARAGE.GAR.sued.leaves.map(L => L.k) }")
        ck('phase 1: the garage at the south end has its two leaves', g1['acts'] == ['garage:suedW', 'garage:suedO'], g1['acts'])
        ck('… the mower stands inside it', g1['inM'], g1)
        E("GARAGE.GAR.sued.leaves.forEach(L => GPLAY.slide(L, 0, true)); GAME.step(1.5)")
        door = J("(() => { const G = GARAGE.GAR.sued; return { out: G.toW(0, G.door.y + 3.0), inn: G.toW(0, G.door.y - 1.0), head: GARAGE.headOf(G) }; })()")
        E(f"GAME.view({door['out'][0]}, {door['out'][1]}, 1.65, {door['head']} + 180, -6, 62); GAME.step(0.1)"); shot('sued_zu')
        r = J(f"(() => {{ GAME.view({door['out'][0]}, {door['out'][1]}, 1.62, {door['head']} + 180, 0); return __G.walk(3.0); }})()")
        lp = J(f"GARAGE.GAR.sued.toL({r['x']}, {r['y']})")
        ck('closed leaves of the south garage block', lp[1] > 2.95, {'p': r, 'local': lp})
        for k in ['suedW', 'suedO']:
            E(f"__G.at('garage:{k}', 0.8, {door['head']}); __G.run('garage:{k}', 1.6)")
        lv = J("GARAGE.GAR.sued.leaves.map(L => L.k)")
        ck('… both slide open', lv == [1, 1], lv)
        E(f"GAME.view({door['out'][0]}, {door['out'][1]}, 1.65, {door['head']} + 180, -6, 62); GAME.step(0.1)"); shot('sued_offen')
        E(f"GAME.view({door['inn'][0]}, {door['inn'][1]}, 1.6, {door['head']} + 180, -18, 80); GAME.step(0.1)"); shot('sued_innen')
        pl = E(f"KERN.place({door['inn'][0]}, {door['inn'][1]}, 0.2)")
        ck('inside: "Garage (Holzlager)"', pl == 'Garage (Holzlager)', pl)
        # take the mower out through the north door
        E("GPLAY.mowerHome(1); GAME.step(0.1)")
        lab = J("__G.at('garage:maeher', 0.4, GPLAY.M.az + 180)")
        E("__G.run('garage:maeher', 0.2)")
        r = J("__G.walk(4.0)")
        m = J("{ m: __G.m(), inG: GARAGE.insideAt(1, GPLAY.M.x, GPLAY.M.y), local: GARAGE.GAR.sued.toL(GPLAY.M.x, GPLAY.M.y) }")
        ck('the mower comes out of the south garage', lab == 'Rasenmäher nehmen' and not m['inG'] and m['local'][1] > 3.2, {'label': lab, 'm': m})
        E("PLAY.secondary(); GAME.step(0.2)")
        E("GPLAY.mowerHome(1); GAME.setPhase(0); GAME.step(0.3)")
        m = J("{ m: __G.m(), in0: GARAGE.inside(GPLAY.M.x, GPLAY.M.y) }")
        ck('back to phase 0: the mower goes back into the old garage', m['in0'], m)
    # ---------------- reload: the mown lawn and the mower's place stay ----------------
    if want('reload'):
        E("(() => { const M = GPLAY.M; M.x = 6.5; M.y = 9.0; M.z = 0; M.az = 90; })(); GAME.step(0.1)")
        E("GRASS.cut(6.0, 12.0, 0.6, CLOCK.t, 1); GPLAY.save()")
        before = J("{ m: __G.m(), cut: GRASS.cutCount(6.0, 12.0, 0.4), area: GRASS.cutArea(CLOCK.t), saved: (SAVE.raw('pav-garage-v1') || '').length }")
        print('before reload', json.dumps(before), flush=True)
        pg.reload(wait_until='domcontentloaded')
        boot()
        after = J("{ m: __G.m(), cut: GRASS.cutCount(6.0, 12.0, 0.4), area: GRASS.cutArea(CLOCK.t) }")
        ck('reload: the mower stays where it was left', abs(after['m']['x'] - before['m']['x']) < 0.05 and abs(after['m']['y'] - before['m']['y']) < 0.05, after['m'])
        ck('reload: the mown lawn stays short', after['cut']['all'] > 0 and after['cut']['n'] >= 0.8 * after['cut']['all'], after['cut'])
        # growing back over game days
        E("CLOCK.t = CLOCK.t + 2.5 * 1440; GAME.step(0.2)")
        mid = J("GRASS.cutCount(6.0, 12.0, 0.4)")
        E("CLOCK.t = CLOCK.t + 3 * 1440; GAME.step(0.2)")
        late = J("GRASS.cutCount(6.0, 12.0, 0.4)")
        ck('the lawn grows back over a few game days', late['n'] == 0, {'after 2.5 d': mid, 'after 5.5 d': late})
        tk = J(TASK)
        ck('… and the task "Rasen mähen" can begin again', tk['st'] is None and tk['e'] is None, tk)
    ck('GL: textures per program within 16', *lib.check_gl(pg, 16)[:1], '')
    ck.errors(errs)
    ck.done()
