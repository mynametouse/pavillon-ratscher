# feat/grenzland-polizei: the wanted level of „Grenzland“ in the real world (the decisions themselves are tested without a browser:
# viz3/test/unit/grenzland_polizei.test.mjs). One run, several scenes:
#   roads      the square's road graph: five road ends, a line from each to the Anger lies on the roads of the world
#   witness    a witness takes out the phone – talked to in time, the report is not made; a serious deed is reported: hollow stars
#   patrol     the car comes, sees him standing by the road, stops, two officers get out and walk over, the arrest, nothing left
#   escape     out of sight the officers go to where he was last seen, walk back and get in, the car searches, the stars go, it leaves
#   moped      a moped on the road is followed on the road; standing in the field he is fetched on foot
#   block      three stars: a road block ahead on the road he rides (two cars, cones, a sign); clear() leaves nothing
#   night      the patrol car with its lights at night (picture)
#   1989       the Volkspolizei's saloon, the ABV on foot who knows everybody, the arrest ends the flashback's attempt
#   heli       four stars: the helicopter flies in, circles, sees him in the open and not under the trees
#   sek        five stars: vans of the special forces across the road ends, others hunt
#   stadt      Schleusingen: a patrol car over the town's streets (its own run: the town takes memory)
# Pictures in out/grenzland_polizei/.   python3 viz3/test/grenzland_polizei.py 9016 [scenes, comma separated]   (~8 min here)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda s: ONLY is None or s in ONLY
ck = lib.Checks('grenzland_polizei')
OUT = lib.out('grenzland_polizei')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    def steps(secs, dt=0.1):
        E(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    def pic(name, hud=False):
        try:
            lib.shot(pg, OUT, name)
            if hud: pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    def until(cond, secs, dt=1.0, nap=0.0):
        """step game time in pieces of dt until cond holds; returns the seconds it took, or None"""
        t = 0.0
        while t < secs:
            steps(dt); t += dt
            if E(cond): return t
            if nap: time.sleep(nap)
        return None
    stand = lambda: J("GLFAHNDUNG.stand()")
    # helpers on the page: the nearest car of the police brought close along its line; the view of something from a few metres
    E("""window.TP = {
      near(m) { const u = GLFAHNDUNG.cars.find(q => q.st === 'anfahrt' && q.c && q.c.line); if (!u) return false; u.c.s = Math.max(u.c.s, u.c.line.L - m); u.c.v = Math.min(u.c.v, 12); return true },
      look(x, y, d, az, h) { const a = az * Math.PI / 180; GAME.view(x - Math.sin(a) * d, y - Math.cos(a) * d, KERN.ground(x - Math.sin(a) * d, y - Math.cos(a) * d) + (h || 1.7), az, -6) },
      onRoad(x, y) { const s = KERN.surface(x, y); return !!s && s.e > -1.5 },
      figs() { return GLFIG.figs.filter(F => F.cop).length },
      figsVis() { return GLFIG.figs.filter(F => F.cop && F.g.visible).length },
      events: [],
    }; KERN.on('grenzland:erwischt', d => TP.events.push(['erwischt', d])); KERN.on('grenzland:sperre', d => TP.events.push(['sperre', d])); KERN.on('grenzland:zeuge', d => TP.events.push(['zeuge', d])); 0""")
    ok = E("GLSTATE.on")
    ck('the scene runs', ok)
    E("GRENZLAND.folgen(false)")   # (Sarah waits in the garden: she is not part of these scenes)
    AN = (226, -100)               # beside the street at the Anger, in the open
    # ------------------------------------------------------------------ roads ------------------------------------------------------------------
    if want('roads'):
        r = J("""(() => { const N = GLFAHNDUNG.netz(222, -108); if (!N) return null; let n = 0, on = 0, bad = [], L = [];
          for (const x of N.exits) { const R = N.linie({ x: x.x, y: x.y, hd: null }, [222, -108], { k: 1.3 }); if (!R) { bad.push([x.x, x.y]); continue }
            L.push(Math.round(R.line.L)); const o = {}; for (let s = 20; s < R.line.L - 5; s += 9) { VERKEHR.net.at(R.line, s, o); n++; if (TP.onRoad(o.x, o.y)) on++; else if (bad.length < 6) bad.push([Math.round(o.x), Math.round(o.y)]) } }
          return { exits: N.exits.length, n, on, bad, L, nodes: N.G.nodes.length } })()""")
        ck('roads: five road ends, a line from each to the Anger', r and r['exits'] == 5 and len(r['L']) == 5 and min(r['L']) > 500, str(r and {k: r[k] for k in ('exits', 'L', 'nodes')}))
        ck('roads: the lines lie on the roads of the world', r and r['n'] > 300 and r['on'] >= r['n'] * 0.985, str(r and (r['on'], r['n'], r['bad'])))
    # ------------------------------------------------------------------ witness ------------------------------------------------------------------
    if want('witness'):
        # (out in the meadows: nobody else there to see it)
        E("GAME.view(60, -420, KERN.ground(60, -420) + 1.62, 90, -4); GLFAHNDUNG.clear()")
        E("window.TZ = null; GLFIG.make('haendler', {}).then(F => { window.TZ = F; if (F) { GLFIG.place(F, P.x + 5, P.y + 0.5, -1.57); F.sees = true } }); 0")
        okf = None
        for i in range(240):   # (the first figure of a file takes long on a busy machine)
            steps(0.1)
            if E("window.TZ !== null"): okf = i; break
            time.sleep(0.7)
        steps(0.5)
        z = J("GLFAHNDUNG.zeugen().map(q => [q.name, q.knows, q.police, Math.round(q.d)])")
        ck('witness: the woman at the stall sees him (a stranger: a description only)', okf is not None and any(q[0] == 'Verkäuferin' and not q[1] and not q[2] for q in z), str(z))
        g = E("GLFAHNDUNG.tat('boeller')")
        st = stand()
        lab = E("(KERN.acts().find(a => a.id === 'gl-zeuge') || { label: () => null }).label()")
        ck('witness: she takes out the phone – no stars yet, the call takes a few seconds', g == 0 and st['sterne'] == 0 and len(st['offen']) == 1 and 2.5 < st['offen'][0]['t'] < 8, str(st['offen']))
        ck('witness: one can talk to her', lab == 'Mit Verkäuferin reden', str(lab))
        pic('01_zeugin')
        steps(1.5)
        E("KERN.acts().find(a => a.id === 'gl-zeuge').run()")
        steps(9)
        st = stand()
        ck('witness: talked to in time, the report is not made', st['sterne'] == 0 and not st['offen'] and st['wait'] == 0, str(st))
        q = J("(() => { const Z = GLFAHNDUNG.zeugen(), g = GLFAHNDUNG.tat('einbruch'); return { g, knows: Z.some(z => z.knows), n: Z.length } })()")
        lab = E("(KERN.acts().find(a => a.id === 'gl-zeuge') || { label: () => null }).label()")
        t = until("GLLOGIK.stars(GLSTATE.W) > 0", 12, 0.5)
        st = stand()
        ck('witness: a break-in cannot be talked away – the call goes through: two stars (hollow unless a villager saw it too), the police are called',
           q['g'] == 0 and lab is None and t is not None and 2 < t < 9 and st['voll'] == 2 and st['bekannt'] == q['knows'] and st['wait'] > 10, str((q, lab, t, st['voll'], st['bekannt'], st['wait'])))
        # knocked down she reports that herself once she is up again (hurting people never pays)
        E("GLFAHNDUNG.clear(); GLFIG.down(TZ, 5); KERN.emit('grenzland:schlag', { id: 'haendler' })")
        st0 = stand()
        t = until("GLLOGIK.stars(GLSTATE.W) > 0", 20, 0.5)
        ck('witness: knocked down, she reports it herself when she is up again', st0['sterne'] == 0 and len(st0['offen']) == 1 and t is not None and t > 6, str((st0['offen'], t)))
        E("GLFAHNDUNG.clear(); GLFIG.drop(TZ)")
    # ------------------------------------------------------------------ patrol ------------------------------------------------------------------
    if want('patrol'):
        E(f"GLFAHNDUNG.clear(); GLSTATE.geld = 300; GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 100, -3)")
        E("GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Testzeuge', knows: false }] }); GLFAHNDUNG.E.wait = 0.3")
        steps(1)
        st = stand()
        c0 = st['cars'][0] if st['cars'] else None
        ck('patrol: a car comes in at a road end, far away', c0 and c0['st'] == 'anfahrt' and ((c0['x'] - AN[0]) ** 2 + (c0['y'] - AN[1]) ** 2) ** 0.5 > 600, str(st['cars']))
        E("TP.near(230)")
        steps(4)
        on = J("GLFAHNDUNG.cars.map(u => [TP.onRoad(u.x, u.y), Math.round(u.v * 10) / 10, u.c.blau, u.c.horn])")
        ck('patrol: it drives on the road with blue light and horn', on and on[0][0] and on[0][1] > 4 and on[0][2] and on[0][3], str(on))
        t = until("GLFAHNDUNG.seen", 40, 0.5)
        st = stand()
        ck('patrol: it sees him standing by the road', t is not None and st['state'] == 'verfolgt', str((t, st['state'], st['cars'])))
        pic('02_streife')
        t = until("GLFAHNDUNG.cops.length === 2 && GLFAHNDUNG.cops.every(c => c.da && c.F)", 60, 0.5, 0.3)
        st = stand()
        car = next((c for c in st['cars'] if c['st'] == 'steht'), None)
        dcar = ((car['x'] - AN[0]) ** 2 + (car['y'] - AN[1]) ** 2) ** 0.5 if car else -1
        ck('patrol: it stops near him and two officers get out', t is not None and car and 4 < dcar < 30 and car['crew'], str((t, dcar, st['cars'], st['cops'])))
        steps(2)
        E(f"GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, Math.atan2(GLFAHNDUNG.cops[0].x - {AN[0]}, GLFAHNDUNG.cops[0].y - {AN[1]}) * 180 / Math.PI, -4)")
        pic('03_beamte', True)
        t = until("TP.events.some(e => e[0] === 'erwischt')", 60, 0.5)
        st = J("({ bust: !document.getElementById('glbust').hidden, geld: GLSTATE.geld, sterne: GLLOGIK.stars(GLSTATE.W), cars: GLFAHNDUNG.cars.length, cops: GLFAHNDUNG.cops.length, figs: TP.figs(), glcars: GLAUTO.cars.length, ev: TP.events.filter(e => e[0] === 'erwischt') })")
        ck('patrol: they walk over and whoever stands is caught (the screen, the fine)', t is not None and t > 3 and st['bust'] and st['geld'] < 300 and st['sterne'] == 0, str((t, st)))
        ck('patrol: after the arrest nothing of the police is left', st['cars'] == 0 and st['cops'] == 0 and st['figs'] == 0 and st['glcars'] == 0, str(st))
        E("document.getElementById('glbust').hidden = true; TP.events.length = 0")
    # ------------------------------------------------------------------ escape ------------------------------------------------------------------
    if want('escape'):
        E(f"GLFAHNDUNG.clear(); GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 100, -3)")
        E("GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Testzeuge', knows: false }] }); GLFAHNDUNG.E.wait = 0.3")
        steps(1); E("TP.near(160)")
        t = until("GLFAHNDUNG.cops.length === 2 && GLFAHNDUNG.cops.every(c => c.da && c.F)", 90, 0.5, 0.3)
        ck('escape: the officers are out again', t is not None, str(stand()['cars']))
        # he is gone: a good hundred metres off, out of everybody's sight (as if he had run)
        E("GAME.view(130, -180, KERN.ground(130, -180) + 1.62, 0, -3)")
        steps(1)
        st = stand()
        ck('escape: out of sight', not st['seen'] and st['state'] == 'gesucht', str((st['seen'], st['state'])))
        t1 = until("GLFAHNDUNG.cops.some(c => c.st === 'sucht')", 20, 0.5)
        t2 = until("GLFAHNDUNG.cops.some(c => c.st === 'zurück')", 80, 1)
        t3 = until("GLFAHNDUNG.cops.length === 0 && GLFAHNDUNG.cars.some(u => u.st === 'suche')", 60, 1)
        st = stand()
        ck('escape: they go to where he was last seen, walk back and get in; the car searches',
           t1 is not None and t2 is not None and t3 is not None, str((t1, t2, t3, st['cars'], st['cops'])))
        ck('escape: the officers\' figures are out of the picture (kept for the next time they get out)', E("TP.figsVis()") == 0, str(E("TP.figs()")))
        E("GAME.view(60, -420, KERN.ground(60, -420) + 1.62, 0, -3)")
        t = until("GLLOGIK.stars(GLSTATE.W) === 0", 240, 2)
        ck('escape: out of sight the stars go', t is not None and E("GLSTATE.stats.entkommen") >= 1, str((t, stand())))
        st = stand()
        ck('escape: the cars drive off, lights out', all(c['st'] == 'abzug' for c in st['cars']) and E("GLFAHNDUNG.cars.every(u => !u.c.blau && !u.c.horn)"), str(st['cars']))
        t = until("GLFAHNDUNG.cars.length === 0", 260, 4)
        steps(1)
        ck('escape: and are gone, the officers\' figures freed', t is not None and E("GLAUTO.cars.length") == 0 and E("TP.figs()") == 0, str((t, stand()['cars'], E("TP.figs()"))))
    # ------------------------------------------------------------------ moped ------------------------------------------------------------------
    if want('moped'):
        # on the main road south of the village, heading north; the car comes up the same road from the south
        m = J("""(() => { GLFAHNDUNG.clear(); const N = GLFAHNDUNG.netz(440, -600), A = N.nah(440, -600), q = N.punkt(A.e, 120), hd = Math.atan2(-q[2], -q[3]);
          const x = q[0] + Math.cos(hd) * 1.5, y = q[1] - Math.sin(hd) * 1.5; GAME.view(x - 3, y, KERN.ground(x, y) + 1.62, hd * 180 / Math.PI, -3);
          GLAUTO.mopedAt(x, y, hd); GLSTATE.tank = 3; return { x, y, hd, kind: A.e.kind } })()""")
        steps(0.5); E("VEH.enter('gl-moped')"); steps(1)
        E("GLFAHNDUNG.tat('rempeln', { force: [{ name: 'Streife', police: true }] }); GLFAHNDUNG.E.wait = 0.2")
        steps(0.6); E("TP.near(150)")
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
        steps(9, 0.05)
        r = J("({ id: VEH.cur && VEH.cur.id, u: VEH.cur ? VEH.cur.st.u : 0, cars: GLFAHNDUNG.cars.map(u => ({ st: u.st, v: Math.round(u.v), on: TP.onRoad(u.x, u.y), d: Math.round(Math.hypot(u.x - VEH.cur.st.x, u.y - VEH.cur.st.y)) })), fz: GLSTATE.W.fz, st: GLSTATE.W.state })")
        ck('moped: the car follows the moped along the road', r['id'] == 'gl-moped' and r['u'] > 6 and r['cars'] and r['cars'][0]['st'] == 'verfolgt' and r['cars'][0]['on'] and r['cars'][0]['v'] > 5 and r['cars'][0]['d'] < 150 and r['st'] == 'verfolgt', str(r))
        E("TP.look(VEH.cur.st.x, VEH.cur.st.y, 9, VEH.cur.st.psi * 180 / Math.PI + 200, 2.2)")
        pic('04_verfolgung')
        ck('moped: now they know the moped', r['fz'], str(r['fz']))
        # off into the field and stand there (the moped set 60 m beside the road)
        E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })")
        steps(3, 0.05)
        f = J("""(() => { const v = VEH.cur.st, a = v.psi + Math.PI / 2; let x = v.x + Math.sin(a) * 60, y = v.y + Math.cos(a) * 60; const N = GLFAHNDUNG.netz(x, y);
          if (N.abstand(x, y) < 30) { x = v.x - Math.sin(a) * 60; y = v.y - Math.cos(a) * 60 } GLAUTO.mopedAt(x, y, v.psi); return { x, y, off: N.abstand(x, y) } })()""")
        t = until("GLFAHNDUNG.cops.some(c => c.da)", 80, 1, 0.2)
        st = stand()
        on = J("GLFAHNDUNG.cars.map(u => TP.onRoad(u.x, u.y))")
        ck('moped: he stands in the field – the car stays on the road, the officers walk over', f['off'] > 25 and t is not None and all(on) and any(c['st'] == 'steht' for c in st['cars']), str((f, t, on, st['cars'], st['cops'])))
        t = until("TP.events.some(e => e[0] === 'erwischt')", 90, 1)
        ck('moped: standing there he is caught', t is not None, str((t, stand())))
        E("VEH.auto = null; if (VEH.cur) VEH.exit(); document.getElementById('glbust').hidden = true; TP.events.length = 0")
        steps(0.5)
    # ------------------------------------------------------------------ block ------------------------------------------------------------------
    if want('block'):
        m = J("""(() => { GLFAHNDUNG.clear(); const N = GLFAHNDUNG.netz(440, -600), A = N.nah(440, -600), q = N.punkt(A.e, 30), hd = Math.atan2(q[2], q[3]);
          const x = q[0] + Math.cos(hd) * 1.5, y = q[1] - Math.sin(hd) * 1.5; GAME.view(x - 3, y, KERN.ground(x, y) + 1.62, hd * 180 / Math.PI, -3);
          GLAUTO.mopedAt(x, y, hd); GLSTATE.tank = 3; return { x, y, hd } })()""")
        steps(0.5); E("VEH.enter('gl-moped')"); steps(1)
        E("for (const id of ['einbruch', 'widerstand']) GLFAHNDUNG.tat(id, { force: [{ name: 'Streife', police: true }] }); GLFAHNDUNG.E.wait = 99")
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
        t = until("!!GLFAHNDUNG.block", 12, 0.5)
        E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })")
        steps(5, 0.05)
        B = J("""(() => { const B = GLFAHNDUNG.block; if (!B) return null; const v = VEH.cur.st; return { x: B.x, y: B.y, hd: B.hd, cars: B.cars.length, vis: B.cars.every(c => c.g.visible && c.blau), mesh: !!B.mesh && !!B.mesh.parent,
          road: TP.onRoad(B.x, B.y), d: Math.hypot(B.x - v.x, B.y - v.y), ahead: (B.x - v.x) * Math.sin(v.psi) + (B.y - v.y) * Math.cos(v.psi), sterne: GLLOGIK.starsOf(GLSTATE.W.heat), ev: TP.events.filter(e => e[0] === 'sperre').length,
          solid: VEH.extra.filter(e => e.grenzland).length } })()""")
        ck('block: three stars put a road block ahead on the road he rides', t is not None and B and B['sterne'] >= 3 and B['cars'] == 2 and B['vis'] and B['mesh'] and B['road'] and B['ahead'] > 120 and B['d'] < 420 and B['ev'] == 1, str((t, B)))
        if B:
            # up to it on the moped (the picture), then past it: another deed (the moped set beyond the block, as if he had gone round over the field)
            E(f"VEH.auto = null; GLAUTO.mopedAt({B['x']} + Math.sin({B['hd']}) * 26 + Math.cos({B['hd']}) * 1.5, {B['y']} + Math.cos({B['hd']}) * 26 - Math.sin({B['hd']}) * 1.5, {B['hd']} + Math.PI)")
            steps(1.5)
            pic('05_sperre', True)
            E(f"GLAUTO.mopedAt({B['x']} + Math.sin({B['hd']}) * 30 + Math.cos({B['hd']}) * 9, {B['y']} + Math.cos({B['hd']}) * 30 - Math.sin({B['hd']}) * 9, {B['hd']} + Math.PI)")
            steps(1)
            h0 = E("GLSTATE.W.heat")
            E(f"GLAUTO.mopedAt({B['x']} - Math.sin({B['hd']}) * 30 + Math.cos({B['hd']}) * 9, {B['y']} - Math.cos({B['hd']}) * 30 - Math.sin({B['hd']}) * 9, {B['hd']} + Math.PI)")
            steps(1)
            r = J("({ heat: GLSTATE.W.heat, log: GLSTATE.W.log.map(q => q.id), passed: !!(GLFAHNDUNG.block && GLFAHNDUNG.block.passed) })")
            ck('block: riding past it is another deed', r['heat'] > h0 and 'sperre' in r['log'], str((h0, r)))
        E("VEH.auto = null; if (VEH.cur) VEH.exit(); GLFAHNDUNG.clear()")
        steps(0.5)
        r = J("({ cars: GLFAHNDUNG.cars.length, cops: GLFAHNDUNG.cops.length, block: !!GLFAHNDUNG.block, glcars: GLAUTO.cars.length, figs: TP.figs(), solid: VEH.extra.filter(e => e.grenzland).length, sterne: GLLOGIK.stars(GLSTATE.W), offen: GLSTATE.W.offen.length })")
        ck('block: clear() leaves nothing behind', r['cars'] == 0 and r['cops'] == 0 and not r['block'] and r['glcars'] == 0 and r['figs'] == 0 and r['solid'] == 0 and r['sterne'] == 0, str(r))
    # ------------------------------------------------------------------ night ------------------------------------------------------------------
    if want('night'):
        E(f"GLFAHNDUNG.clear(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 22 * 60 + 30; if (DN && DN.active) DN.update(true); GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 100, -3)")
        lib.settle_light(pg, 40)
        E("GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Testzeuge', knows: true }] }); GLFAHNDUNG.E.wait = 0.3")
        steps(1); E("TP.near(90)")
        t = until("GLFAHNDUNG.cars.some(u => Math.hypot(u.x - P.x, u.y - P.y) < 30)", 40, 0.5)
        r = J("({ dark: !!VAUTO.dark(), head: GLAUTO.LM.head.emissiveIntensity, blau: Math.max(GLAUTO.LM.blau.emissiveIntensity, GLAUTO.LM.blau2.emissiveIntensity), cars: GLFAHNDUNG.stand().cars })")
        ck('night: the patrol car comes with headlamps and blue light', t is not None and r['dark'] and r['head'] > 1 and r['blau'] > 1, str(r))
        E("(() => { const u = GLFAHNDUNG.cars[0]; if (u) TP.look(u.x, u.y, 11, u.hd * 180 / Math.PI + 150, 1.8) })()")
        pic('06_nacht')
        E(f"GLFAHNDUNG.clear(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15 * 60; if (DN && DN.active) DN.update(true)")
        lib.settle_light(pg, 40)
    # ------------------------------------------------------------------ 1989 ------------------------------------------------------------------
    if want('1989'):
        E(f"GLFAHNDUNG.clear(); TP.events.length = 0; GLSTATE.era = '1989'; GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 100, -3)")
        g = E("GLFAHNDUNG.tat('kiste', { force: [{ name: 'Erna', knows: false }] })")
        st = stand()
        ck('1989: a deed a stranger reports – hollow stars, the Volkspolizei is called sooner than today\'s police', g >= 1 and not st['bekannt'] and 5 < st['wait'] < 30, str(st))
        E("GLFAHNDUNG.E.wait = 3")
        t = until("GLFAHNDUNG.cops.some(c => c.kind === 'abv' && c.da && c.F)", 40, 0.5, 0.3)
        t2 = until("GLSTATE.W.known", 30, 0.5)
        st = stand()
        ck('1989: the ABV comes on foot – and knows him at once (filled stars)', t is not None and t2 is not None and st['bekannt'] and any(c['id'] == 'abv' for c in st['cops']), str((t, t2, st['cops'])))
        r = J("GLFAHNDUNG.cars.map(u => ({ kind: u.kind, typ: u.c.typ, bar: u.c.o.bar }))")
        ck('1989: one saloon of the Volkspolizei with a single beacon, no road block', len(r) == 1 and r[0]['kind'] == 'vopo' and r[0]['typ'] == 'limo89' and r[0]['bar'] == 'rundum' and not st['block'], str(r))
        E("TP.near(60)")
        steps(4)
        E("(() => { const c = GLFAHNDUNG.cops[0]; if (c) GAME.view(P.x, P.y, P.feet + 1.62, Math.atan2(c.x - P.x, c.y - P.y) * 180 / Math.PI, -4) })()")
        pic('07_abv_1989')
        t = until("TP.events.some(e => e[0] === 'erwischt')", 80, 0.5)
        ev = J("TP.events.filter(e => e[0] === 'erwischt').map(e => e[1])")
        ck('1989: the arrest ends the attempt (event with era 1989)', t is not None and ev and ev[0]['era'] == '1989', str((t, ev)))
        E("GLSTATE.era = 'heute'; document.getElementById('glbust').hidden = true; GLFAHNDUNG.clear(); TP.events.length = 0")
    # ------------------------------------------------------------------ heli ------------------------------------------------------------------
    if want('heli') and E("!!(window.GLHELI && GLHELI.fly)"):
        E(f"GLFAHNDUNG.clear(); GAME.view(60, -420, KERN.ground(60, -420) + 1.62, 0, 10)")
        E("for (const id of ['einbruch', 'widerstand', 'sperre']) GLFAHNDUNG.tat(id, { force: [{ name: 'Streife', police: true }] }); GLFAHNDUNG.E.wait = 999")
        st = stand()
        t = until("GLHELI.on && GLHELI.st === 'kreist'", 90, 1)
        h = J("GLHELI.stand()")
        ck('heli: at four stars the helicopter flies in and circles over where he was last seen', st['voll'] >= 4 and t is not None and h['on'] and h['h'] > 25 and h['d'] < 140, str((st['voll'], t, h)))
        t = until("GLHELI.sieht", 40, 0.5)
        st = stand()
        if not st['seen']: print('open?', J("({ krone: GLFAHNDUNG.stand().krone, wald: GLFAHNDUNG.stand().wald, h: GLHELI.stand() })"))
        ck('heli: it sees him in the open (the radar gets its place)', t is not None and st['seen'] and st['heli'] is not None, str((t, st['seen'], st['heli'])))
        E("(() => { const H = GLHELI.stand(); GAME.view(P.x, P.y, P.feet + 1.62, Math.atan2(H.x - P.x, H.y - P.y) * 180 / Math.PI, 28) })()")
        pic('08_hubschrauber', True)
        # under the trees of the Klinge it does not (they are told he is there: it comes over and circles – and sees nothing)
        f = J("(() => { for (let r = 0; r < 160; r += 8) for (let a = 0; a < 6.28; a += 0.4) { const x = -548 + Math.sin(a) * r, y = -566 + Math.cos(a) * r; if (GLFAHNDUNG.unterBaeumen(x, y)) return [x, y] } return null })()")
        if f: E(f"GAME.view({f[0]}, {f[1]}, KERN.ground({f[0]}, {f[1]}) + 1.62, 0, 0)")
        steps(1)
        E("GLFAHNDUNG.E.melde(P.x, P.y, 0)")
        w = J("({ wald: GLFAHNDUNG.stand().krone, place: KERN.place(P.x, P.y, 0) })")
        t = until("GLHELI.st === 'kreist' && Math.hypot(GLHELI.stand().x - P.x, GLHELI.stand().y - P.y) < 110", 120, 2)
        steps(12)
        r = J("({ sieht: GLHELI.sieht, seen: GLFAHNDUNG.seen, h: GLHELI.stand() })")
        ck('heli: under the trees of the Klinge it does not see him', f and w['wald'] and t is not None and not r['sieht'] and not r['seen'], str((f, w, t, r)))
        E("GLFAHNDUNG.clear()")
        steps(1)
        t = until("!GLHELI.on", 60, 2)
        ck('heli: the search over, it flies off and is gone', t is not None and E("GLFAHNDUNG.stand().heli") is None and not J("GLHELI.stand()")['modell'], str((t, J("GLHELI.stand()"))))
    # ------------------------------------------------------------------ sek ------------------------------------------------------------------
    if want('sek'):
        E("GLFAHNDUNG.clear(); GAME.view(60, -420, KERN.ground(60, -420) + 1.62, 0, 0)")
        E("for (const id of ['einbruch', 'widerstand', 'sperre', 'einbruch']) GLFAHNDUNG.tat(id, { force: [{ name: 'Streife', police: true }] }); GLFAHNDUNG.E.wait = 0.5")
        steps(12)
        r = J("({ voll: GLFAHNDUNG.stand().voll, riegel: GLFAHNDUNG.cars.filter(u => u.st === 'riegel').map(u => ({ x: Math.round(u.x), y: Math.round(u.y), typ: u.c.typ, d: Math.round(GLFAHNDUNG.netz(u.x, u.y).abstand(u.x, u.y) * 10) / 10 })), jagd: GLFAHNDUNG.cars.filter(u => u.st !== 'riegel').map(u => u.kind + ':' + u.c.typ) })")
        ck('sek: five stars – a van of the special forces across the road at each of the five road ends', r['voll'] == 5 and len(r['riegel']) == 5 and all(q['d'] < 3 for q in r['riegel']), str(r))
        t = until("GLFAHNDUNG.cars.some(u => u.kind === 'sek' && u.st !== 'riegel')", 60, 2)
        ck('sek: and vans that hunt with the patrol cars', t is not None, str((t, stand()['cars'])))
        if r['riegel']:
            q = min(r['riegel'], key=lambda q: (q['x'] - 60) ** 2 + (q['y'] + 420) ** 2)
            E(f"(() => {{ const u = GLFAHNDUNG.cars.find(v => v.st === 'riegel' && Math.round(v.x) === {q['x']}); GAME.view(u.x + Math.sin(u.hd + 1.2) * 13, u.y + Math.cos(u.hd + 1.2) * 13, KERN.ground(u.x, u.y) + 1.9, (u.hd + 1.2) * 180 / Math.PI + 180, -5) }})()")
            steps(0.5)
            pic('09_riegel')
        E("GLFAHNDUNG.clear()")
        steps(0.5)
        ck('sek: clear() leaves nothing', E("GLFAHNDUNG.cars.length + GLFAHNDUNG.cops.length + GLAUTO.cars.length") == 0)
    # ------------------------------------------------------------------ stadt ------------------------------------------------------------------
    if want('stadt'):
        E("GLFAHNDUNG.clear(); GAME.go('schleusingen')")
        okz = None
        for i in range(300):
            steps(0.2)
            if E("SCHL.state === 'ready' && !!(VERKEHR.places.stadt && VERKEHR.places.stadt.on && VERKEHR.places.stadt.G)"): okz = i; break
            time.sleep(1)
        n = J("(() => { const N = GLFAHNDUNG.netz(P.x, P.y); return N ? { exits: N.exits.length, nodes: N.G.nodes.length, d: N.abstand(P.x, P.y), sq: GLFAHNDUNG.inSquare(P.x, P.y) } : null })()")
        ck('stadt: Schleusingen has its own road network for the police', okz is not None and n and n['exits'] >= 2 and not n['sq'], str((okz, n)))
        if n:
            E("(() => { const N = GLFAHNDUNG.netz(P.x, P.y), A = N.nah(P.x, P.y); GAME.view(A.x + A.dy * 4, A.y - A.dx * 4, KERN.ground(A.x, A.y) + 1.62, 0, -3) })()")
            E("GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Testzeuge', knows: false }] }); GLFAHNDUNG.E.wait = 0.3")
            steps(1)
            c0 = stand()['cars']
            E("TP.near(140)")
            t = until("GLFAHNDUNG.seen", 60, 0.5)
            on = J("GLFAHNDUNG.cars.map(u => Math.round(GLFAHNDUNG.netz(P.x, P.y).abstand(u.x, u.y) * 10) / 10)")
            ck('stadt: a patrol car comes over the town\'s streets and sees him', len(c0) == 1 and t is not None and on and max(on) < 3.6, str((c0, t, on)))
            t = until("GLFAHNDUNG.cops.some(c => c.da)", 60, 0.5, 0.3)
            E("(() => { const c = GLFAHNDUNG.cops[0]; if (c) GAME.view(P.x, P.y, P.feet + 1.62, Math.atan2(c.x - P.x, c.y - P.y) * 180 / Math.PI, -3) })()")
            pic('10_stadt')
            t2 = until("TP.events.some(e => e[0] === 'erwischt')", 90, 0.5)
            ck('stadt: the officers get out and take him', t is not None and t2 is not None, str((t, t2, stand())))
            E("document.getElementById('glbust').hidden = true; GLFAHNDUNG.clear(); TP.events.length = 0")
    # ------------------------------------------------------------------ the end ------------------------------------------------------------------
    E("GRENZLAND.stop()")
    steps(0.5)
    st = J("({ on: GLSTATE.on, figs: GLFIG.figs.length, cars: GLAUTO.cars.length, units: GLFAHNDUNG.cars.length, solid: VEH.extra.filter(e => e.grenzland).length, heli: !!(window.GLHELI && GLHELI.on) })")
    ck('„Beenden“ leaves nothing of the police', not st['on'] and st['figs'] == 0 and st['cars'] == 0 and st['units'] == 0 and st['solid'] == 0 and not st['heli'], str(st))
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}))
    ck.errors(errs)
    ck.done()
