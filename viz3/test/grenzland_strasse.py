# feat/grenzland-strasse (Kapitel 2, Etappe 1 – „Verkehr mit Ziel“, „Begegnungen unterwegs“, „Rast an der A 73“). Free play, one area per
# page (sections, comma separated):
#   linien      traffic with a purpose: every run has a line on the roads (no turning back on itself)
#   holz        the timber lorry drives to the pile at the Klinge, stops, loads (its driver in the cab) and drives on; draw calls
#   milch       the milk lorry drives through the village to Uwe's farm by the Anger and stops there
#   kraeh       the haulier's lorry at the yard's gate; GLLINIEN.folgen gives its tour
#   streife     the patrol with two officers on its round past the Anger; a star – it steps aside
#   schule      on a school day before 7:02 three pupils wait at the shelter by the Anger (they get on the real bus when it stands there)
#   liefer      Schleusingen: the refrigerated lorry comes to REWE's loading door before six – past the yard's lane, backwards to the door,
#               stands there with its back to it, and leaves forward
#   (every traffic section ends with „Beenden“: no vehicle, driver or pile left)
#   begegnung   the new encounters on the way: a hitchhiker (taken along on the moped to his place, five euros), a breakdown (hazard
#               lights, bonnet up, the triangle behind; help that fits – the car drives off), the hunter on his high seat at dusk; each
#               with its point on the radar, each gone cleanly; the old fair is not planned when a festival calendar is there
#   probe       measures the ground by the A 73 and near the Klinge, pictures from above (only for choosing places; not in tests.txt)
# Pictures in out/grenzland_strasse/.   python3 viz3/test/grenzland_strasse.py 9043 [sections]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '9043'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda s: ONLY is None or s in ONLY
ck = grenzland_ci.wrap(lib.Checks('grenzland_strasse'), 'grenzland_strasse')
OUT = lib.out('grenzland_strasse')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    X = lambda js: pg.evaluate('(() => { ' + js + ' })(); 0')
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    def steps(secs, dt=0.1):
        X(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    def pic(name, hud=False):
        try:
            lib.shot(pg, OUT, name)
            if hud: pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    # free play (the scene starts mission 1): every mission done, Friday evening in the garden
    for _ in range(6): steps(0.3); time.sleep(0.3)
    X("GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); GLSTATE.save(true)")
    steps(1)
    X("""window.TS = {
      // a view of (x, y) from d metres off at the compass angle az (degrees) seen from there, h over the ground
      look(x, y, az, d, h, pitch) { const a = az * Math.PI / 180, cx = x - Math.sin(a) * d, cy = y - Math.cos(a) * d; GAME.setView3(false); GAME.view(cx, cy, KERN.ground(cx, cy) + (h || 1.7), az, pitch ?? -6) },
      car(id) { return GLAUTO.cars.find(c => c.linie === id) || null },
      info(id) { const v = GLLINIEN.debug.info().find(q => q.id === id); return v || null },
      calls() { const R = GAME.R, I = [0, 0], rbd = R.renderBufferDirect; R.renderBufferDirect = function (camera, scene, geometry, material, object, group) { if (scene) I[0]++; return rbd.call(this, camera, scene, geometry, material, object, group) }; try { GAME.film(0, true) } finally { R.renderBufferDirect = rbd } return I[0] },
    }; 0""")
    # ------------------------------------------------------------------ linien ------------------------------------------------------------------
    VERKEHR = [k for k in ('linien', 'holz', 'milch', 'kraeh', 'streife', 'schule', 'liefer') if want(k)]
    if VERKEHR:
        X("GLLINIEN.aus = false; GLFAHNDUNG.clear()")
        steps(0.5)
    if want('linien'):
        L = {}
        for rid in ['milch', 'holz', 'streife', 'k1-frueh', 'k1-nacht', 'k2-tag']:
            L[rid] = J(f"GLLINIEN.debug.linie('{rid}')")
            li = L[rid]
            ck(f'linie {rid}: a way on the roads', li is not None and li['L'] > 300, str(li and {k: li[k] for k in ('L', 'ws', 'dauer', 'kehre')}))
            if li: ck(f'linie {rid}: never turns back on itself', li['kehre'] == 0, str(li['kehre']))
        open(os.path.join(OUT, 'linien.json'), 'w').write(json.dumps(L))
    if want('holz'):
        # ---- the timber lorry: Friday 14:05 run, 230 m before the pile, the player by the pile ----
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60 + 30; if (DN && DN.active) DN.update(true)")
        wp = J("GLLINIEN.debug.wp('holz', 1)")
        print('pile waypoint', wp, flush=True)
        if wp:
            X(f"TS.look({wp['x']}, {wp['y']}, {wp['hd'] * 57.3 + 160}, 26, 2.2, -5)")
            steps(1)
            el = E("GLLINIEN.debug.vor('holz', 1, 230)")
            X(f"GLLINIEN.debug.run('holz', {el})")
            for _ in range(4): steps(0.5); time.sleep(0.2)
            i0 = J("TS.info('holz')")
            pol = J("GLLINIEN.debug.polter()")
            ck('holz: the lorry appears on its way to the pile (empty), the pile stands', i0 and i0['c'] and i0['leer'] and pol is not None, str((i0, pol)))
            # drive up; the driver loads in meanwhile
            t = 0
            while t < 90:
                steps(1); t += 1
                i1 = J("TS.info('holz')")
                if i1 and i1['hold'] > 0: break
            i1 = J("TS.info('holz')")
            ck('holz: drives up to the pile and stops there to load', i1 and i1['hold'] > 0 and i1['v'] < 0.3, f'{t} s: {i1}')
            ck('holz: a driver in the cab', i1 and i1['figs'] == 1, str(i1))
            X(f"const c = TS.car('holz'); if (c) TS.look(c.x, c.y, c.hd * 57.3 + 130, 16, 2.0, -6)")
            for _ in range(5): steps(0.3); time.sleep(0.3)
            pic('01_holz_am_polter')
            # its draw calls: the same picture with the lorry and its driver hidden
            n1 = E("TS.calls()")
            n0 = E("(() => { const c = TS.car('holz'), F = GLLINIEN.debug.S.V.holz.F; c.g.visible = false; for (const f of F) f.g.visible = false; const n = TS.calls(); c.g.visible = true; for (const f of F) f.g.visible = true; return n })()")
            ck('holz: draw calls of the lorry with its driver within budget', n1 - n0 <= 40, f'{n1} with, {n0} without')
            for _ in range(60):
                steps(1)
                i2 = J("TS.info('holz')")
                if i2 and not i2['leer'] and i2['v'] > 1: break
            i2 = J("TS.info('holz')")
            ck('holz: loaded after the stop, drives on', i2 and not i2['leer'] and i2['v'] > 1, str(i2))
            steps(3)
            X(f"const c = TS.car('holz'); if (c) TS.look(c.x, c.y, c.hd * 57.3 + 200, 18, 2.2, -6)")
            for _ in range(5): steps(0.3); time.sleep(0.3)
            pic('02_holz_beladen')
            X("GLLINIEN.debug.S.V.holz && (GLLINIEN.debug.S.V.holz.run = null)")
            steps(0.6)
    if want('milch'):
        # ---- the milk lorry at Uwe's farm, Friday 6:10 ----
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 6 * 60 + 20; if (DN && DN.active) DN.update(true)")
        wp = J("GLLINIEN.debug.wp('milch', 1)")
        print('farm waypoint', wp, flush=True)
        if wp:
            X(f"TS.look({wp['x']}, {wp['y']}, {wp['hd'] * 57.3 - 120}, 24, 1.8, -5)")
            steps(1)
            el = E("GLLINIEN.debug.vor('milch', 1, 240)")
            X(f"GLLINIEN.debug.run('milch', {el})")
            t = 0
            while t < 80:
                steps(1); t += 1
                i1 = J("TS.info('milch')")
                if i1 and i1['hold'] > 0: break
            ck('milch: drives through the village to the farm and stops there', i1 and i1['hold'] > 0, f'{t} s: {i1}')
            X(f"const c = TS.car('milch'); if (c) TS.look(c.x, c.y, c.hd * 57.3 + 140, 15, 1.9, -6)")
            for _ in range(5): steps(0.3); time.sleep(0.3)
            pic('03_milch_am_hof')
            X("GLLINIEN.debug.S.V.milch && (GLLINIEN.debug.S.V.milch.run = null)")
            steps(0.6)
    if want('kraeh'):
        # ---- the haulier's lorry at the yard, Friday 13:25 ----
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 13 * 60 + 40; if (DN && DN.active) DN.update(true)")
        wp = J("GLLINIEN.debug.wp('k2-tag', 1)")
        print('yard waypoint', wp, flush=True)
        if wp:
            X(f"TS.look({wp['x']}, {wp['y']}, {wp['hd'] * 57.3 + 150}, 30, 2.0, -5)")
            steps(1)
            el = E("GLLINIEN.debug.vor('k2-tag', 1, 220)")
            X(f"GLLINIEN.debug.run('k2-tag', {el})")
            t = 0
            while t < 80:
                steps(1); t += 1
                i1 = J("TS.info('k2')")
                if i1 and i1['hold'] > 0: break
            ck('k2: drives to the yard\'s gate and stops to load', i1 and i1['hold'] > 0, f'{t} s: {i1}')
            X(f"const c = TS.car('k2'); if (c) TS.look(c.x, c.y, c.hd * 57.3 + 135, 17, 2.0, -6)")
            for _ in range(5): steps(0.3); time.sleep(0.3)
            pic('04_kraehwinkel_am_lager')
            fo = J("GLLINIEN.folgen('k2')")
            fz = J("GLLINIEN.fahrzeuge()")
            ck('k2: folgen gives its tour and where it is now', fo and fo['jetzt'] and len(fo['tour']) >= 1 and any(f['id'] == 'k2' and f['sichtbar'] for f in fz), str((fo, fz))[:400])
            X("GLLINIEN.debug.S.V.k2 && (GLLINIEN.debug.S.V.k2.run = null)")
            steps(0.6)
    if want('streife'):
        # ---- the patrol at the Anger, Friday 15:40: two officers; a deed – it steps aside ----
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15 * 60 + 45; if (DN && DN.active) DN.update(true)")
        wp = J("GLLINIEN.debug.wp('streife', 1)")
        if wp:
            X(f"TS.look({wp['x']}, {wp['y']}, {wp['hd'] * 57.3 - 140}, 22, 1.7, -4)")
            steps(1)
            el = E("GLLINIEN.debug.vor('streife', 1, 230)")
            X(f"GLLINIEN.debug.run('streife', {el})")
            t = 0
            while t < 60:
                steps(1); t += 1
                i1 = J("TS.info('streife')")
                if i1 and i1['figs'] >= 2 and i1['hold'] > 0: break
            i1 = J("TS.info('streife')")
            ck('streife: on its round past the Anger with two officers', i1 and i1['c'] and i1['figs'] == 2, f'{t} s: {i1}')
            X(f"const c = TS.car('streife'); if (c) TS.look(c.x, c.y, c.hd * 57.3 + 150, 11, 1.6, -5)")
            for _ in range(5): steps(0.3); time.sleep(0.3)
            pic('05_streife_am_anger')
            X("GLFAHNDUNG.tat('rempeln', { force: [{ name: 'Test', police: true }] })")
            X("GAME.view(0, 0, KERN.ground(0, 0) + 1.7, 0, -4)")
            t = 0
            while t < 30:
                steps(1); t += 1
                if not J("TS.info('streife')")['c']: break
            st = J("({ i: TS.info('streife'), sterne: GLFAHNDUNG.stand().sterne })")
            ck('streife: a star – the patrol steps aside for the wanted level\'s cars', st['sterne'] >= 1 and not st['i']['c'], f'{t} s: {st}')
            X("GLFAHNDUNG.clear()")
    if want('schule'):
        # ---- the pupils: Friday (a school day in September) 6:52, the player at the Anger ----
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 6 * 60 + 52; if (DN && DN.active) DN.update(true)")
        X("TS.look(250.6, -99.6, 20, 16, 1.7, -6)")
        for _ in range(12):
            steps(0.5); time.sleep(0.3)
            if len(J("GLLINIEN.debug.kinder()")) >= 3: break
        k = J("GLLINIEN.debug.kinder()")
        ck('schule: three pupils wait at the shelter by the Anger before the 268', len(k) == 3 and all(abs(q['x'] - 250.6) < 6 and abs(q['y'] + 99.6) < 6 for q in k), str(k))
        for _ in range(4): steps(0.3); time.sleep(0.3)
        pic('06_schueler_am_anger')
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 9 * 60; GAME.view(0, 0, KERN.ground(0, 0) + 1.7, 0, -4)")
        steps(1.5)
        ck('schule: after the departure they are gone', len(J("GLLINIEN.debug.kinder()")) == 0, str(J("GLLINIEN.debug.kinder()")))
    if want('liefer'):
        # ---- Schleusingen, Friday 5:02: REWE's yard; the town and its shops load first ----
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 5 * 60 + 2; if (DN && DN.active) DN.update(true); GAME.go('schleusingen')")
        okz = None
        for i in range(240):
            steps(0.2)
            if E("SCHL.state === 'ready' && !!(window.LAEDEN && LAEDEN.data) && !!(window.FAHRT && FAHRT.data && FAHRT.data.ways.length)"): okz = i; break
            time.sleep(1)
        X("GAME.view(-1700, 950, KERN.ground(-1700, 950) + 1.7, 225, -5)")
        for i in range(120):
            steps(0.2)
            if E("!!GLLINIEN.debug.rampe('rewe', 0) && !!GLLINIEN.debug.linie('l-rewe-1')"): break
            time.sleep(1)
        R = J("GLLINIEN.debug.rampe('rewe', 0)")
        li = J("GLLINIEN.debug.linie('l-rewe-1')")
        ck('liefer: the town, REWE\'s loading door and the lorry\'s way (in, backwards, out)', okz is not None and R and li and [l[0] for l in li['legs']] == ['V', 'R', 'V'] and li['kehre'] == 0, str((okz, R, li and {k: li[k] for k in ('L', 'ws', 'legs', 'kehre')})))
        if R and li:
            # the player at the yard's edge looking at the door; the lorry 180 m before the door on its way in
            X(f"TS.look({R['x']}, {R['y']}, {R['hd'] * 57.3 + 215}, 30, 1.8, -6)")
            steps(0.5)
            el = E("GLLINIEN.debug.vor('l-rewe-1', 1, 180)")
            X(f"GLLINIEN.debug.run('l-rewe-1', {el})")
            t, seen_rev = 0, False
            while t < 150:
                steps(1); t += 1
                i1 = J("TS.info('l-rewe-1')")
                if i1 and i1['c'] and i1['leg'] == 1: seen_rev = True
                if i1 and i1['hold'] > 0: break
            i1 = J("TS.info('l-rewe-1')")
            off = ((i1['x'] - R['x']) ** 2 + (i1['y'] - R['y']) ** 2) ** 0.5 if i1 and i1['x'] is not None else 99
            ck('liefer: it reverses into the yard and stands at the door, its back to it', i1 and i1['hold'] > 0 and seen_rev and off < 1.6, f'{t} s: {i1}, {off:.1f} m off')
            X(f"TS.look({R['x']}, {R['y']}, {R['hd'] * 57.3 + 200}, 17, 2.0, -8)")
            for _ in range(5): steps(0.3); time.sleep(0.3)
            pic('07_liefer_rewe')
            # unloaded: it leaves forward
            X("GLLINIEN.debug.S.V['l-rewe-1'].hold = 0.05")
            t = 0
            while t < 30:
                steps(1); t += 1
                i2 = J("TS.info('l-rewe-1')")
                if i2 and i2['c'] and i2['leg'] == 2 and i2['v'] > 1: break
            i2 = J("TS.info('l-rewe-1')")
            ck('liefer: then it drives off forward', i2 and i2['leg'] == 2 and i2['v'] > 1, f'{t} s: {i2}')
    if VERKEHR:
        # ---- „Beenden“ ----
        X("GRENZLAND.stop()")
        steps(0.6)
        left = J("({ cars: GLAUTO.cars.filter(c => c.strasse).length, figs: GLFIG.figs.filter(F => F.linie).length, polter: !!GLLINIEN.debug.polter(), list: GLLINIEN.fahrzeuge().length })")
        ck('linien: „Beenden“ takes every vehicle, driver and the pile away', left['cars'] == 0 and left['figs'] == 0 and not left['polter'] and left['list'] == 0, str(left))
        ck('linien: no error', not E("GLLINIEN.err"), str(E("GLLINIEN.err")))
    # ------------------------------------------------------------------ begegnung ------------------------------------------------------------------
    if want('begegnung'):
        X("GLFAHNDUNG.clear(); GLEREIGNIS.stop()")
        evs = J("Object.keys(GLLOGIK.EREIGNISSE)")
        ck('begegnung: the hitchhiker, the breakdown and the hunter are in the planner', all(k in evs for k in ('anhalter', 'panne', 'jaeger')), str(evs))
        # the old fair: not planned once a festival calendar is there (a stand-in GLFESTE)
        X("window.GLFESTE = window.GLFESTE || { aktiv: () => null, kalender: () => [], _test: true }; GLEREIGNIS.plan.fahrt = 999; GLEREIGNIS.plan.zuletzt = {}")
        X("GLEREIGNIS.planT = 0; GLEREIGNIS.tick(0.6)")
        kz = J("GLEREIGNIS.plan.zuletzt.kirmes || 0")
        ck('begegnung: with a festival calendar the random fair is planned no more', kz > 1e8, str(kz))
        X("if (window.GLFESTE && GLFESTE._test) delete window.GLFESTE; GLEREIGNIS.stop(); GLEREIGNIS.plan = GLLOGIK.planNeu()")
        # on the long straight road east of the Anger, the moped under the player
        X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 15 * 60; if (DN && DN.active) DN.update(true)")
        # (the other of the two waits at home: one seat behind the rider for the hitchhiker)
        X("GRENZLAND.folgen(false); GAME.view(300, -150, KERN.ground(300, -150) + 1.62, 120, -4); GLAUTO.mopedAt(300, -150, 120 * Math.PI / 180); GLSTATE.tank = 4")
        steps(0.5)
        E("VEH.enter('gl-moped')")
        steps(0.5)
        # ---- the hitchhiker ----
        ok = E("GLEREIGNIS.debug.start('anhalter')")
        for _ in range(10): steps(0.3); time.sleep(0.3)
        info = J("GLEREIGNIS.debug.info()")
        bl = J("(GLKARTE.blips ? GLKARTE.blips() : []).filter(b => b.k === 'ereignis').map(b => b.name)")
        ck('anhalter: stands at the roadside with his sign, a point on the radar', ok and info and info['name'] == 'anhalter' and info['figs'] == 1 and info['meshes'] >= 1 and 'Anhalter' in bl, str((ok, info, bl, E("GLEREIGNIS.err"))))
        if ok and info and info['figs'] == 1:
            # (the picture from the free view – on the moped the camera is the rider's)
            X("const E = GLEREIGNIS.E, F = E.F; VEH.cur && VEH.exit(); TS.look(F.x, F.y, E.hd * 57.3 + 200, 8, 1.7, -6)")
            for _ in range(3): steps(0.3); time.sleep(0.3)
            pic('10_anhalter')
            X("const E = GLEREIGNIS.E, F = E.F; GLAUTO.mopedAt(F.x - Math.sin(E.hd) * 12, F.y - Math.cos(E.hd) * 12, E.hd); GAME.view(F.x - Math.sin(E.hd) * 12, F.y - Math.cos(E.hd) * 12, KERN.ground(F.x, F.y) + 1.62, E.hd * 57.3, -4)")
            steps(0.4)
            E("VEH.enter('gl-moped')")
            steps(0.4)
            # ride up beside him, stop: the action to take him along
            X("const F = GLEREIGNIS.E.F, v = VEH.cur; v.st.x = F.x - Math.sin(GLEREIGNIS.E.hd) * 4; v.st.y = F.y - Math.cos(GLEREIGNIS.E.hd) * 4; v.st.u = 0; v.st.v = 0")
            steps(0.6)
            lab = E("(KERN.acts().find(a => a.id === 'gl-ereignis-mit') || { label: () => null }).label()")
            ck('anhalter: stopped beside him on the moped – „… mitnehmen“', bool(lab) and 'mitnehmen' in lab, str(lab))
            X("const a = KERN.acts().find(a => a.id === 'gl-ereignis-mit'); if (a) a.run()")
            steps(0.5)
            st = J("({ st: (GLEREIGNIS.E && GLEREIGNIS.E.mit.st) || '', wp: (GLKARTE.blips ? GLKARTE.blips() : []).filter(b => b.k === 'punkt').length })")
            ck('anhalter: he gets on, his place is a waypoint on the radar', st['st'] == 'faehrt' and st['wp'] >= 1, str(st))
            # at his place (the moped set down there, slow)
            g0 = E("GLSTATE.geld")
            X("const z = GLEREIGNIS.E.mit.ziel.pos(), v = VEH.cur; v.st.x = z[0] + 6; v.st.y = z[1] + 6; v.st.u = 0; v.st.v = 0")
            steps(1)
            st = J("({ ende: (GLEREIGNIS.E && GLEREIGNIS.E.ende) || '', geld: GLSTATE.geld })")
            ck('anhalter: at his place he gets off, thanks and pays five euros', st['ende'] == 'mitgenommen' and st['geld'] == g0 + 5, str((g0, st)))
            steps(16)
            ck('anhalter: then it is over', not E("GLEREIGNIS.aktiv()"), str(J("GLEREIGNIS.debug.info()")))
        X("GLEREIGNIS.stop(); VEH.cur && VEH.exit()")
        steps(0.5)
        # ---- the breakdown ----
        X("GAME.view(300, -150, KERN.ground(300, -150) + 1.62, 120, -4)")
        steps(0.5)
        ok = E("GLEREIGNIS.debug.start('panne')")
        for _ in range(10): steps(0.3); time.sleep(0.3)
        info = J("GLEREIGNIS.debug.info()")
        ck('panne: a car on the verge, the bonnet up, the triangle behind, the driver', ok and info and info['cars'] == 1 and info['meshes'] >= 2 and info['figs'] == 1, str((ok, info, E("GLEREIGNIS.err"))))
        if ok and info and info['figs'] == 1:
            X("const E = GLEREIGNIS.E; E.t = 0.1; GLEREIGNIS.DEF.panne.tick(E, 0.05, { x: E.x, y: E.y, v: 0 })")
            bl = J("GLEREIGNIS.E.mats.map(m => m.emissiveIntensity)")
            ck('panne: the hazard lights blink (its own lamps only)', any(v > 1 for v in bl) and E("GLAUTO.LM.blink !== GLEREIGNIS.E.mats[0]"), str(bl))
            X("const E = GLEREIGNIS.E, c = E.car; TS.look(c.x, c.y, c.hd * 57.3 + 150, 9, 1.7, -7)")
            for _ in range(4): steps(0.3); time.sleep(0.3)
            pic('11_panne')
            # walk to the driver; help with what fits (a canister for an empty tank, a push for a flat battery)
            X("const F = GLEREIGNIS.E.F; GAME.view(F.x + 1.2, F.y + 1.2, KERN.ground(F.x + 1.2, F.y + 1.2) + 1.62, 225, -4); GLSTATE.add('kanister')")
            steps(0.5)
            lab = E("(KERN.acts().find(a => a.id === 'gl-ereignis-hilfe') || { label: () => null }).label()")
            ck('panne: at the driver – „Helfen“', lab == 'Helfen', str(lab))
            g0 = E("GLSTATE.geld")
            X("const a = KERN.acts().find(a => a.id === 'gl-ereignis-hilfe'); if (a) a.run()")
            steps(0.3)
            X("GLHUD.pick(GLEREIGNIS.E.grund === 'tank' ? 0 : 1)")
            steps(1); time.sleep(3.2); steps(1)
            st = J("({ ende: (GLEREIGNIS.E && GLEREIGNIS.E.ende) || '', weg: !!(GLEREIGNIS.E && GLEREIGNIS.E.weg), geld: GLSTATE.geld })")
            ck('panne: the help that fits – paid, the car starts', st['ende'] in ('benzin', 'geschoben') and st['weg'] and st['geld'] > g0, str((g0, st)))
            steps(8)
            ck('panne: it drives off', not E("GLEREIGNIS.aktiv()") or E("GLEREIGNIS.E.car.v > 1"), str(J("GLEREIGNIS.debug.info()")))
        X("GLEREIGNIS.stop()")
        steps(0.5)
        # ---- the hunter at dusk by a forest edge (the wood near the Klinge) ----
        X("const rs = DN.riseSet(CLOCK.t, 'sun'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + Math.round(rs.down) - 20; if (DN && DN.active) DN.update(true)")
        X("GAME.view(-640, -470, KERN.ground(-640, -470) + 1.62, 150, -4)")
        steps(1)
        ok = E("GLEREIGNIS.debug.start('jaeger')")
        for _ in range(10): steps(0.3); time.sleep(0.3)
        info = J("GLEREIGNIS.debug.info()")
        ck('jaeger: a high seat at the forest edge, the hunter in it, a point on the radar', ok and info and info['meshes'] >= 1 and info['figs'] == 1, str((ok, info, E("GLEREIGNIS.err"))))
        if ok and info:
            X("const E = GLEREIGNIS.E; TS.look(E.x, E.y, E.hd * 57.3 + 180, 22, 2.0, -3)")
            for _ in range(4): steps(0.3); time.sleep(0.3)
            pic('12_jaeger_hochsitz')
            X("const E = GLEREIGNIS.E; GAME.view(E.x - Math.sin(E.hd) * 4, E.y - Math.cos(E.hd) * 4, KERN.ground(E.x - Math.sin(E.hd) * 4, E.y - Math.cos(E.hd) * 4) + 1.62, E.hd * 57.3, -4)")
            steps(14)
            st = J("({ unten: !!(GLEREIGNIS.E && GLEREIGNIS.E.unten), mit: (GLEREIGNIS.E && GLEREIGNIS.E.mit && GLEREIGNIS.E.mit.st) || '' })")
            ck('jaeger: at the foot of the seat he climbs down and would like a lift', st['unten'] and st['mit'] == 'wartet', str(st))
        X("GLEREIGNIS.stop('test')")
        steps(0.5)
        now = J("({ cars: GLAUTO.cars.filter(c => c.ereignis).length, figs: GLFIG.figs.filter(F => F.ereignis).length, meshes: (() => { let n = 0; GAME.scene.traverse(o => { if (o.name === 'grenzland ereignis') n++ }); return n })(), aktiv: GLEREIGNIS.aktiv() })")
        ck('begegnung: everything gone cleanly', now['cars'] == 0 and now['figs'] == 0 and now['meshes'] == 0 and not now['aktiv'], str(now))
        ck('begegnung: no error', not E("GLEREIGNIS.err"), str(E("GLEREIGNIS.err")))
        lin = J("GLEREIGNIS.linien().filter(l => l[0].startsWith('sl_')).length")
        ck('begegnung: their lines for the recordings (linien)', lin >= 20, str(lin))
    # ------------------------------------------------------------------ probe ------------------------------------------------------------------
    if want('probe'):
        g = J("""(() => { const out = {}; const H = []; for (let y = 380; y <= 640; y += 20) { const row = []; for (let x = 760; x <= 980; x += 20) { const z = KERN.ground(x, y); const s = KERN.surface(x, y); row.push(Math.round(z * 10) / 10 + (s && s.kind <= 7 && s.e > -2 ? '*' : '')) } H.push(y + ': ' + row.join(' ')) } out.H = H;
          out.place = [[870, 500], [840, 534], [900, 460], [820, 580], [-548, -566]].map(([x, y]) => [x, y, KERN.place(x, y, 0)]);
          const G = GLAUTO.netz(); out.nodes = G.nodes.length; out.zuf = GLAUTO.zufahrten().map(p => p.map(Math.round));
          const near = (x, y, r) => G.nodes.map((n, i) => [i, Math.round(n.x), Math.round(n.y), n.edges.map(e => e.kind).join('')]).filter(q => Math.hypot(q[1] - x, q[2] - y) < r);
          out.klinge = near(-548, -566, 220); out.rast = near(870, 500, 160);
          out.forest = [[-548, -566], [-600, -560], [-500, -600], [-650, -620]].map(([x, y]) => [x, y, !!(window.FOREST && FOREST.owns && FOREST.owns(x, y))]);
          out.bus = window.BUS ? BUS.state().state : 'none';
          out.dn = window.DN ? { wd: DN.weekday ? DN.weekday() : null, keys: Object.keys(DN).slice(0, 40) } : null;
          return out })()""")
        for k, v in g.items():
            if k == 'H':
                print('ground (x 760..980 step 20):'); [print('  ', r) for r in v]
            else: print(k, v)
        # along the motorway (both carriageways' middle): the ground beside it, relative to the road, every 40 m
        a = J("""(() => { const W = ROADS.ways.filter(w => w.kind === 0); const out = [];
          for (const w of W.slice(0, 1)) { const p = w.p; let acc = 0; for (let i = 0; i + 3 < p.length; i += 2) { const x0 = p[i], y0 = p[i + 1], x1 = p[i + 2], y1 = p[i + 3], l = Math.hypot(x1 - x0, y1 - y0);
            for (let s = 0; s < l; s += 40) { const x = x0 + (x1 - x0) * s / l, y = y0 + (y1 - y0) * s / l, nx = (y1 - y0) / l, ny = -(x1 - x0) / l, z = KERN.ground(x, y);
              out.push([Math.round(x), Math.round(y), Math.round(z), [-120, -90, -60, -35, 35, 60, 90, 120].map(o => Math.round(KERN.ground(x + nx * o, y + ny * o) - z))]) } } }
          return out })()""")
        print('motorway: x y z | ground beside it at -120 -90 -60 -35 (left of travel) 35 60 90 120 (right), relative')
        for r in a: print('  ', r)
        # the whole square every 40 m: z, and a road/forest/inside mark (for a place with room)
        m = J("""(() => { const out = []; for (let y = -1320; y <= 1050; y += 40) { const row = []; for (let x = -1020; x <= 1360; x += 40) { const z = KERN.ground(x, y); row.push(Math.round(z)) } out.push(row) } return out })()""")
        open(os.path.join(OUT, 'probe_hoehen.json'), 'w').write(json.dumps(m))
        for (x, y, az, h, pitch, name) in ([] if 'nopics' in (ONLY or ()) else [(870, 500, 143, 130, -55, 'p1_rast_oben'), (790, 470, 70, 6, -6, 'p2_rast_vom_weg'), (-548, -566, 0, 120, -60, 'p3_klinge_oben')]):
            X(f"GAME.setView3(false); const a = {az} * Math.PI / 180; const d = {h} * 0.6; GAME.view({x} - Math.sin(a) * d, {y} - Math.cos(a) * d, KERN.ground({x}, {y}) + {h}, {az}, {pitch})")
            for _ in range(8): steps(0.3); time.sleep(0.4)
            pic(name)
    ck.errors(errs)
    ck.done()
