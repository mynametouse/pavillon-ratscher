# feat/grenzland-alltag: the day of the village people in the mode „Grenzland“ (Ratscher, Schleusingen), the birds, the festivals.
# Free play in the mode, one area per page:
#   blick   top views of the Anger and the Markt with marker posts every 10 m (to place things; pictures only)
#   tag     the people by the clock: the morning at the Anger (the van, the school bus stop), the evening at the Feldscheune and the bus
#           stop, Sunday at St. Johannis, the clique at the fountain on the Markt, shoppers into the bakery's door; greetings, E, the API
#   fest    the festivals by the calendar (GLFESTE.debug.zu): Kirmes at night, Christmas market, Feuerwehrfest
# Pictures in out/grenzland_alltag/.   python3 viz3/test/grenzland_alltag.py 9041 [sections, comma separated]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '9041'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda s: ONLY is None or s in ONLY
ck = grenzland_ci.wrap(lib.Checks('grenzland_alltag'), 'grenzland_alltag')
OUT = lib.out('grenzland_alltag')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch' if want('blick') else 'schnell')
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    X = lambda js: pg.evaluate('(() => { ' + js + ' })(); 0')
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    def steps(secs, dt=0.1):
        X(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    def pic(name):
        try:
            lib.shot(pg, OUT, name)
        except Exception as e:
            print('shot failed', name, e)
    def until(cond, secs, dt=0.5, nap=0.0):
        t = 0.0
        while t < secs:
            steps(dt); t += dt
            if E(cond): return t
            if nap: time.sleep(nap)
        return None
    # free play (the scene starts mission 1): every mission done, in the garden
    for _ in range(6): steps(0.3); time.sleep(0.3)
    X("GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); GAME.go('garten'); GLSTATE.save(true)")
    steps(1)
    ck('the scene runs in free play', E("GLSTATE.on && !GLSTATE.cur"))
    X("GRENZLAND.folgen && GRENZLAND.folgen(false)")
    # ------------------------------------------------------------------ blick ------------------------------------------------------------------
    if want('blick'):
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 12 * 60; if (DN.active) DN.update(true)")
        X("""window.MARK = (cx, cy, n) => { const T = THREE, g = new T.Group(), C = [0xff2020, 0x20ff20, 0x2060ff, 0xffff20];
          for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const x = cx + i * 10, y = cy + j * 10, z = KERN.ground(x, y) || 0;
            const m = new T.Mesh(new T.BoxGeometry(i === 0 && j === 0 ? 1.2 : 0.5, 4, i === 0 && j === 0 ? 1.2 : 0.5), new T.MeshBasicMaterial({ color: C[((i + 10) % 2) + 2 * ((j + 10) % 2)] }));
            m.position.set(x, z + 2, -y); g.add(m) } GAME.scene.add(g); return g }""")
        X("window.MK = MARK(235, -110, 4); GAME.view(235, -110, KERN.ground(235, -110) + 75, 0, -89.9, 50)")
        steps(2); time.sleep(1); steps(1)
        pic('00_anger_oben')
        X("GAME.view(236, -138, KERN.ground(236, -138) + 9, 0, -14, 60)")
        steps(1); pic('00_anger_sued')
        info = J("""(() => { const H = window.DLIFE && DLIFE.homes ? DLIFE.homes() : null, o = {};
          if (H) for (const [k, h] of Object.entries(H)) o[k] = { door: h.door.map(v => Math.round(v * 10) / 10), spot: h.spot.map(v => Math.round(v * 10) / 10) };
          const seats = (GLPOSE.seats ? GLPOSE.seats() : []).map(s => [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10, Math.round(s.hd * 100) / 100]);
          return { homes: o, seats, orte: GLORTE.P, place: [KERN.place(226, -104), KERN.place(239, -121), KERN.place(248, -102), KERN.place(230, -97)] } })()""")
        print('INFO ratscher', json.dumps(info), flush=True)
        X("GAME.scene.remove(MK); GAME.view(-1084.7, 1241.9, 400, 0, -30)")
        ok = until("window.SCHL && SCHL.state === 'ready'", 240, 1.0, 0.5)
        print('schleusingen ready after', ok, flush=True)
        X("window.MK = MARK(-1085, 1235, 4); GAME.view(-1085, 1235, KERN.ground(-1085, 1235) + 75, 0, -89.9, 50)")
        steps(2); time.sleep(1); steps(1)
        pic('00_markt_oben')
        info = J("""(() => { const S = window.SCHL, I = window.SINNEN, M = [-1085, 1235];
          const doors = I && I.doors ? [...I.doors.values()].filter(h => h.shop && Math.hypot(h.door.x - M[0], h.door.y - M[1]) < 260).map(h => [h.id, h.shop, Math.round(h.door.x * 10) / 10, Math.round(h.door.y * 10) / 10, Math.round(h.door.nx * 100) / 100, Math.round(h.door.ny * 100) / 100]) : null;
          return { fountain: S.fountain, benches: (S.benchSpots || []).filter(b => Math.hypot(b.x - M[0], b.y - M[1]) < 60).map(b => [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.z * 100) / 100, Math.round(b.yaw)]), doors, sinnen: I ? I.state : null } })()""")
        print('INFO schleusingen', json.dumps(info), flush=True)
        X("GAME.view(-1250, 1176, KERN.ground(-1250, 1176) + 6, 0, -10, 60)")
        steps(1); pic('00_kirche')
    # ------------------------------------------------------------------ helpers for the people ------------------------------------------------------------------
    X("""window.TA = {
      // a view of (x, y) from d metres, h above the ground: the first direction (from az round) with a clear line and not indoors
      blick(x, y, az, d, h, pitch) { for (const dd of [d, d * 0.7, d * 1.3]) for (let i = 0; i < 12; i++) { const a = (az + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 30) * Math.PI / 180, cx = x - Math.sin(a) * dd, cy = y - Math.cos(a) * dd;
          if (KERN.inside(cx, cy, KERN.ground(cx, cy) + 1.5) || !GLFAHNDUNG.los(cx, cy, x, y)) continue; GAME.view(cx, cy, KERN.ground(cx, cy) + h, a * 180 / Math.PI, pitch ?? -6); return true } return false },
      st: () => GLALLTAG.debug.stand(),
      an: platz => GLALLTAG.leute().filter(q => q.platz === platz && q.gezeigt).map(q => q.id),
      // arrived (standing or sitting at the spot) at a place
      da: platz => GLALLTAG.leute().filter(q => q.platz === platz && q.gezeigt && GLALLTAG.debug.stand().st[q.id] === 'da').map(q => q.id),
      // the view on people: d metres from their middle, from the side az (round it if blocked)
      zeig(ids, az, d, h) { const P2 = ids.map(id => GLALLTAG.debug.hin(id)).filter(Boolean); if (!P2.length) return false;
        const x = P2.reduce((a, q) => a + q[0], 0) / P2.length, y = P2.reduce((a, q) => a + q[1], 0) / P2.length; return TA.blick(x, y, az, d || 8, h || 1.65, -3) } }; 0""")
    def warte_figuren(cond, secs=90):
        # the figures load asynchronously (real time), the game is stepped meanwhile (the clock runs in real time: CLOCK 'real')
        for _ in range(int(secs / 0.8)):
            steps(0.4, 0.1); time.sleep(0.4)
            if E(cond): return True
        return False
    X("CLOCK.setRate('real'); GAME.setView3 && GAME.setView3(false)")
    st0 = J("({ geo: GAME.R.info.memory.geometries, tex: GAME.R.info.memory.textures, prog: GAME.R.info.programs.length, figs: GLFIG.figs.length })")
    # ------------------------------------------------------------------ tag: Ratscher by the clock ------------------------------------------------------------------
    if want('tag'):
        L = J("GLALLTAG.leute()")
        ck('tag: the API lists the village people (12 of Ratscher, 5 of Schleusingen) with place and doing',
           len(L) == 17 and all(k in L[0] for k in ('id', 'name', 'ort', 'x', 'y', 'tun')) and sum(1 for q in L if q['ort'] == 'ratscher') >= 10, str(L[:2]))
        ck('tag: person() by name and id, linien() for the recordings', E("GLALLTAG.person('Ingrid').id === 'ingrid' && GLALLTAG.person('anja').name === 'Anja' && GLALLTAG.person('Hubert') === null && GLALLTAG.linien().length > 150"))
        # the school bus stop on a Tuesday morning
        X("GLALLTAG.debug.zeit(6 * 60 + 57, 2); TA.blick(248.4, -102.4, 20, 16, 1.65, -4)")
        ok = warte_figuren("TA.an('haltestelle').length >= 2", 90)
        ck('tag: Lea and Max wait at the school bus stop at 6:57 on a school day', ok, json.dumps(J("TA.st()"))[:400])
        ok = warte_figuren("TA.da('haltestelle').length >= 2", 120)
        ck('tag: … they walked there along the street and stand at the stop', ok, json.dumps(J("TA.st()"))[:300])
        X("TA.zeig(['lea', 'max'], 200, 7)")
        steps(2, 0.1)
        pic('01_schulbus')
        # the van's morning: Ingrid queues every working morning
        X("GLALLTAG.debug.zeit(8 * 60 + 22, 2); TA.blick(237, -121.5, 300, 13, 1.65, -5)")
        ok = warte_figuren("TA.an('wagen').length >= 1", 60)
        ck('tag: Ingrid comes to the shop on wheels at 8:22', ok, json.dumps(J("TA.st()"))[:400])
        ok = warte_figuren("TA.st().st.ingrid === 'da'", 150)
        ck('tag: … and queues there', ok, json.dumps(J("TA.st()"))[:300])
        gone = E("!TA.an('haltestelle').length")
        ck('tag: the school bus has taken the two (none at the stop later)', gone, str(J("TA.an('haltestelle')")))
        X("TA.zeig(TA.da('wagen'), 160, 7)")
        steps(3, 0.1)
        pic('02_morgen_wagen')
        # a greeting when one passes, and E
        n0 = J("TA.st().n.gruss")
        X("const F = GLALLTAG.debug.hin('ingrid'); GAME.view(F[0] - 3.2, F[1] - 2.5, KERN.ground(F[0] - 3.2, F[1] - 2.5) + 1.65, Math.atan2(3.2, 2.5) * 180 / Math.PI, -5)")
        steps(3, 0.1)
        g = J("TA.st()")
        ck('tag: passing by, the people at the van greet (neutral without the agent ruf: „Morgen.“)', g['n']['gruss'] > n0 and g['gruesse'] and g['gruesse'][-1]['text'] == 'Morgen.', str(g['gruesse'][-3:]))
        X("const F = GLALLTAG.debug.hin('ingrid'); GAME.view(F[0] - 1.2, F[1] - 1.0, KERN.ground(F[0] - 1.2, F[1] - 1.0) + 1.65, Math.atan2(1.2, 1.0) * 180 / Math.PI, -5)")
        steps(0.3, 0.1)
        lab = E("(KERN.acts().find(a => a.id === 'gl-alltag') || { label: () => null }).label()")
        txt = E("GLALLTAG.reden()")
        ck('tag: E by the people at the van: „Reden mit …“ and a line', bool(lab) and lab.startswith('Reden mit ') and isinstance(txt, str) and len(txt) > 5, f'{lab} | {txt}')
        steps(2, 0.1)
        pic('03_reden')
        # the cost per frame of the module (the numbers of everybody, the figures' behaviour)
        ms = E("(() => { const t0 = performance.now(); for (let i = 0; i < 200; i++) GLALLTAG.tick(0.016); return (performance.now() - t0) / 200 })()")
        mem = J("({ geo: GAME.R.info.memory.geometries, tex: GAME.R.info.memory.textures, prog: GAME.R.info.programs.length, figs: GLFIG.figs.length })")
        print('cost per tick', round(ms, 3), 'ms; memory before', st0, 'with figures', mem, flush=True)
        ck('tag: cheap per frame (< 1.5 ms per tick here, SwiftShader)', ms < 1.5, f'{ms:.3f} ms')
        ck('tag: no new shader program for the people', mem['prog'] - st0['prog'] <= 2, f"{st0['prog']} → {mem['prog']}")
        # the evening at the Feldscheune: skittles on a Wednesday in September
        X("GLALLTAG.debug.zeit(19 * 60 + 25, 3); const T = GLORTE.P.kegel; TA.blick(T[0] + 2, T[1] + 1.5, 200, 14, 1.65, -5)")
        ok = warte_figuren("TA.an('treff').length >= 2", 120)
        ck('tag: Wednesday 19:25 – skittles at the Feldscheune', ok, json.dumps(J("TA.st()"))[:400])
        ok = warte_figuren("TA.da('treff').length >= 2", 150)
        X("TA.zeig(TA.da('treff'), 200, 7)")
        steps(3, 0.1)
        pic('04_feldscheune_abend')
        # the base game's evening first: on Friday at eight the seven are at the Skat evening in the old school (dorf/), none drawn twice
        X("GLALLTAG.debug.zeit(20 * 60, 5); TA.blick(236, -95, 180, 14, 1.65, -5)")
        steps(2, 0.1)
        j = J("TA.st().jetzt")
        ck('tag: Friday 20:00 – Ingrid and Manfred are the base game’s (Skat evening), not drawn by the mode', j.get('ingrid', '').startswith('schule:skat:basis') and 'ingrid' not in J("TA.st().gezeigt"), str(j.get('ingrid')))
        ok = warte_figuren("TA.da('haltestelle').length >= 1", 120)
        if ok: X("TA.zeig(TA.da('haltestelle'), 220, 7)")
        steps(2, 0.1)
        pic('05_freitagabend')
        # Anja's round at a quarter past nine
        X("GLALLTAG.debug.zeit(21 * 60 + 18, 5)")
        ok = warte_figuren("TA.an('runde').length >= 1 && TA.st().st.anja === 'hin'", 90)
        ck('tag: Anja walks her round of the Anger in the evening', ok, json.dumps(J("TA.st()"))[:300])
        if ok:
            steps(6, 0.1)
            X("TA.zeig(['anja'], 300, 9)")
            steps(0.5, 0.1)
            pic('05b_abendrunde')
        # night: nobody
        X("GLALLTAG.debug.zeit(2 * 60, 4); GAME.view(226, -110, KERN.ground(226, -110) + 1.65, 0, -5)")
        ok = warte_figuren("TA.st().gezeigt.length === 0", 60)
        ck('tag: at two in the night nobody of them is out', ok, str(J("TA.st().gezeigt")))
        st = J("TA.st()")
        ck('tag: no errors in the module', not st['err'], str(st['err']))
    # ------------------------------------------------------------------ stadt: Schleusingen by the clock ------------------------------------------------------------------
    if want('stadt'):
        X("GAME.view(-1084.7, 1225, 400, 0, -30)")
        ok = until("window.SCHL && SCHL.state === 'ready' && window.SINNEN && SINNEN.state === 'ready'", 300, 1.0, 0.5)
        ck('stadt: Schleusingen and its shop doors are there', bool(ok), E("[window.SCHL && SCHL.state, window.SINNEN && SINNEN.state].join()"))
        # Saturday evening: the clique by the fountain on the Markt
        X("GLALLTAG.debug.zeit(20 * 60 + 10, 6); const f = SCHL.fountain; TA.blick(f[0] + 5.2, f[1] - 0.8, 250, 15, 1.65, -5)")
        ok = warte_figuren("TA.an('marktmitte').length >= 2", 150)
        ck('stadt: Saturday 20:10 – the young ones by the fountain on the Markt', ok, json.dumps(J("TA.st()"))[:400])
        ok = warte_figuren("TA.da('marktmitte').length >= 2", 150)
        X("TA.zeig(TA.da('marktmitte'), 250, 8)")
        steps(3, 0.1)
        pic('06_markt_clique')
        # Sunday: before church and after it at the south door of St. Johannis
        X("GLALLTAG.debug.zeit(9 * 60 + 48, 0); TA.blick(-1250.2, 1187.9, 0, 14, 1.65, -3)")
        ok = warte_figuren("TA.da('kirche').length >= 2", 200)
        ck('stadt: Sunday 9:48 – people before St. Johannis', ok, json.dumps(J("TA.st()"))[:400])
        X("TA.zeig(TA.da('kirche'), 200, 9)")
        steps(2, 0.1)
        pic('07_kirche_vor')
        X("GLALLTAG.debug.zeit(9 * 60 + 58)")
        ok = warte_figuren("TA.an('kirche').length === 0", 90)
        ck('stadt: at 9:58 they go in at the door', ok and J("TA.st().n.tuer") >= 1, json.dumps(J("TA.st()"))[:300])
        X("GLALLTAG.debug.zeit(11 * 60 + 1)")
        ok = warte_figuren("TA.an('kirche').length >= 2", 120)
        steps(4, 0.1)
        ck('stadt: at 11:01 they come out and stand about', ok, json.dumps(J("TA.st()"))[:300])
        pic('08_kirche_nach')
        # a Monday morning: Bärbel goes to the café's (or a bakery’s) door and in
        X("GLALLTAG.debug.zeit(9 * 60 + 6, 1)")
        w = J("GLALLTAG.debug.wo('baerbel')")
        ck('stadt: Monday 9:06 – Bärbel heads for a shop’s door', bool(w and w.get('tuer')), str(w)[:300])
        if w and w.get('tuer'):
            X(f"TA.blick({w['tuer']['x']}, {w['tuer']['y']}, 200, 16, 1.65, -4)")
            n0 = J("TA.st().n.tuer")
            ok = warte_figuren(f"TA.st().n.tuer > {n0}", 180)
            ck('stadt: and goes in at the door (gone there)', ok, json.dumps(J("TA.st()"))[:300])
            pic('09_laden_tuer')
        st = J("TA.st()")
        ck('stadt: no errors in the module', not st['err'], str(st['err']))
    # ------------------------------------------------------------------ voegel: the birds (base game – the same in the mode) ------------------------------------------------------------------
    if want('voegel'):
        prog0 = E("GAME.R.info.programs.length")
        # sparrows at the hedges of the Anger on a Tuesday morning
        X("GLALLTAG.debug.zeit(10 * 60, 2); GAME.view(236, -104.6, KERN.ground(236, -104.6) + 1.2, 180, -18)")
        ok = until("(VOEGEL.stand().aktiv.spatz || 0) > 0", 20, 0.5)
        ck('voegel: sparrows at the hedges of the Anger by day', bool(ok), str(J("VOEGEL.stand()")))
        X("const b = VOEGEL.debug.voegel('spatz')[0]; GAME.view(b.x - 2.2, b.y - 1.2, KERN.ground(b.x - 2.2, b.y - 1.2) + 0.9, Math.atan2(2.2, 1.2) * 180 / Math.PI, -14)")
        steps(0.6, 0.05)
        pic('20_spatzen')
        # walking at them: they dart into the hedge
        X("const b = VOEGEL.debug.voegel('spatz')[0]; GAME.view(b.x - 0.8, b.y - 0.6, KERN.ground(b.x - 0.8, b.y - 0.6) + 1.6, 50, -10)")
        ok = until("VOEGEL.stand().versteckt > 0", 6, 0.1)
        ck('voegel: come near and the sparrows hide in the hedge', bool(ok), str(J("VOEGEL.stand()")))
        # crows over the fields by day, out of the village
        X("GAME.view(330, -40, KERN.ground(330, -40) + 1.7, 90, 12)")
        ok = until("(VOEGEL.stand().aktiv.kraehe || 0) > 0", 10, 0.5)
        ck('voegel: crows circle over the land by day', bool(ok), str(J("VOEGEL.stand()")))
        X("const b = VOEGEL.debug.voegel('kraehe'); const c = b[0]; GAME.view(c.x - 40, c.y - 30, KERN.ground(c.x - 40, c.y - 30) + 1.7, Math.atan2(40, 30) * 180 / Math.PI, 18)")
        steps(1, 0.05)
        pic('21_kraehen')
        # swallows (forced: the story's September is past their time) over the Anger
        X("VOEGEL.debug.an('schwalbe', true); GAME.view(222, -128, KERN.ground(222, -128) + 1.7, 20, 4)")
        steps(1.5, 0.05)
        ck('voegel: swallows fly over the Anger (forced)', (J("VOEGEL.stand()")['aktiv'].get('schwalbe') or 0) > 0, str(J("VOEGEL.stand()")))
        pic('22_schwalben')
        X("VOEGEL.debug.an('schwalbe', null)")
        # starlings at dusk in September
        X("const s = DN.riseSet(CLOCK.t, 'sun'); GLALLTAG.debug.zeit(Math.round(s.down - 25)); GAME.view(300, -60, KERN.ground(300, -60) + 1.7, 0, 10)")
        ok = until("(VOEGEL.stand().aktiv.star || 0) > 0", 10, 0.5)
        ck('voegel: a flock of starlings at dusk in autumn', bool(ok), str(J("VOEGEL.stand()")))
        if ok:
            X("const b = VOEGEL.debug.voegel('star'); let x = 0, y = 0; for (const q of b) { x += q.x; y += q.y } x /= b.length; y /= b.length; GAME.view(x - 120, y - 90, KERN.ground(x - 120, y - 90) + 1.7, Math.atan2(120, 90) * 180 / Math.PI, 16)")
            steps(1, 0.05)
            pic('23_stare')
        # pigeons on the Markt of Schleusingen: they flutter up when one comes close and come down again
        X("GLALLTAG.debug.zeit(11 * 60, 2); GAME.view(-1084.7, 1225, 400, 0, -30)")
        ok = until("window.SCHL && SCHL.state === 'ready'", 300, 1.0, 0.5)
        ok = until("(VOEGEL.stand().aktiv.taube || 0) > 0", 20, 0.5)
        ck('voegel: pigeons on the Markt by day', bool(ok), str(J("VOEGEL.stand()")))
        X("const b = VOEGEL.debug.voegel('taube'); const c = b[0]; GAME.view(c.x - 5, c.y - 4, KERN.ground(c.x - 5, c.y - 4) + 1.3, Math.atan2(5, 4) * 180 / Math.PI, -12)")
        steps(0.5, 0.05)
        pic('24_tauben')
        X("const b = VOEGEL.debug.voegel('taube'); const c = b[0]; GAME.view(c.x - 1.2, c.y - 1.0, KERN.ground(c.x - 1.2, c.y - 1.0) + 1.65, Math.atan2(1.2, 1.0) * 180 / Math.PI, 10)")
        ok = until("VOEGEL.stand().flug > 3", 4, 0.1)
        steps(1.2, 0.05)
        ck('voegel: come close and the pigeons flutter up', bool(ok) and J("VOEGEL.stand().auf") >= 1, str(J("VOEGEL.stand()")))
        pic('25_tauben_auf')
        X("GAME.view(-1084.7, 1200, KERN.ground(-1084.7, 1200) + 1.7, 0, 0)")
        ok = until("VOEGEL.stand().flug === 0", 60, 0.5)
        ck('voegel: and come down again on the square when nobody is near', bool(ok), str(J("VOEGEL.stand()")))
        st = J("VOEGEL.stand()")
        prog1 = E("GAME.R.info.programs.length")
        ck('voegel: cheap (< 0.6 ms per frame here) and no new shader program', st['ms'] < 0.6 and prog1 - prog0 <= 1 and not st['err'], f"{st['ms']} ms, programs {prog0} → {prog1}, err {st['err']}")
    ck.errors(errs)
    ck.done()
