# feat/grenzland-zone (Kapitel 2, Etappe 2): the border zone at the Grünes Band south of Eisfeld. Free play in the mode, sections
# (comma separated):
#   weg      the zone loads when one gets there (GLZONE.hin on the Simson to the Kolonnenweg), its tiles are drawn, the ground on the
#            Kolonnenweg is its smoothed profile, the slabs lie on it; the Simson rides 300 m along it (VEH.follow) and stays on it;
#            draw calls; pictures by day and at dusk
#   bunker   the bunker's outside: the old foundation (one stands on it), the mound, the wall with the iron door and its padlock
#            (the action „Tür ansehen“: locked); the walker cannot pass through the wall; a picture
#   heide    (next version) the heath: heather, birches, pines, the hide
#   (every run ends with leaving: back in the garden, the zone is freed – meshes, roads, collisions, the tiles' need)
# Pictures in out/grenzland_zone/.   python3 viz3/test/grenzland_zone.py 9061 [sections]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '9061'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda s: ONLY is None or s in ONLY
ck = grenzland_ci.wrap(lib.Checks('grenzland_zone'), 'grenzland_zone')
OUT = lib.out('grenzland_zone')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
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
    def until(js, secs, real=0.6, dt=0.1):
        t = 0
        while t < secs:
            if E(js): return True
            steps(0.5, dt); time.sleep(real); t += 0.5
        return bool(E(js))
    # free play (the scene starts mission 1): every mission done, a weekday morning in the garden
    for _ in range(6): steps(0.3); time.sleep(0.3)
    X("GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 11 * 60; GAME.go('garten'); GLSTATE.save(true)")
    steps(1)
    X("""window.TS = {
      look(x, y, az, d, h, pitch) { const a = az * Math.PI / 180, cx = x - Math.sin(a) * d, cy = y - Math.cos(a) * d; GAME.setView3(false); GAME.view(cx, cy, KERN.ground(cx, cy) + (h || 1.7), az, pitch ?? -6) },
      calls() { const R = GAME.R, I = [0, 0], rbd = R.renderBufferDirect; R.renderBufferDirect = function (camera, scene, geometry, material, object, group) { if (scene) { I[0]++; I[1] += (object.isInstancedMesh ? object.count : 1) * ((geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3) } return rbd.call(this, camera, scene, geometry, material, object, group) }; try { GAME.film(0, true) } finally { R.renderBufferDirect = rbd } return I },
      progs() { return (GAME.R.info.programs || []).length },
    }; 0""")
    ck('the zone is not built before one gets there', J("GLZONE.state().an") is False and J("GLZONE.state().meshes") == 0, str(J("GLZONE.state()")))
    base_calls = J("TS.calls()")
    base_progs = J("TS.progs()")
    print('garden: calls, triangles', base_calls, 'programs', base_progs, flush=True)
    # ------------------------------------------------------------------ weg ------------------------------------------------------------------
    if want('weg') or want('bunker'):
        X("window._hin = 0; GLZONE.hin({ mit: 'moped', ort: 'kolonnenweg_a' }).then(r => window._hin = r ? 1 : -1)")
        ok = until("window._hin !== 0", 150)
        st = J("GLZONE.state()")
        ck('GLZONE.hin brings one there on the Simson (the zone loads, its tiles are drawn)', ok and E("window._hin") == 1 and st['an'] and E("GLZONE.da()"), str(st) + ' hin=' + str(E("window._hin")))
        ck('the Kolonnenweg lies there in slabs (two lanes of 0.75 x 2.5 m over ~3 km)', st['platten'] > 2000, str(st['platten']))
        ck('GLZONE.ort and GLZONE.weg answer', all(J(f"GLZONE.ort('{n}')") for n in ('kolonnenweg_a', 'kolonnenweg_b', 'bunker', 'museum', 'heide', 'parkplatz')) and len(J("GLZONE.weg()")) > 1000 and len(J("GLZONE.anfahrt()")) > 300,
           str([J(f"GLZONE.ort('{n}')") for n in ('bunker', 'parkplatz')]) + ' weg ' + str(len(J("GLZONE.weg()"))) + ' anfahrt ' + str(len(J("GLZONE.anfahrt()"))))
        ck('on the Simson at the Kolonnenweg', E("!!VEH.cur && VEH.cur.id === 'gl-moped'") and E("KERN.place(VEH.cur.st.x, VEH.cur.st.y) === 'Kolonnenweg'"), str(E("VEH.cur && VEH.cur.id")) + ' ' + str(E("VEH.cur && KERN.place(VEH.cur.st.x, VEH.cur.st.y)")))
        until("(() => { const w = GLZONE.weg(), v = VEH.cur; if (!v) return false; let n = 0; for (const p of w) if (Math.hypot(p[0] - v.st.x, p[1] - v.st.y) < 90 && WELT.heightAt(p[0], p[1]) !== undefined) n++; return n > 40 })()", 60)
        # the ground on the way: the drawn tiles at the profile's height (within the 90 m around the moped: the finest tiles)
        gr = J("""(() => { const w = GLZONE.weg(), v = VEH.cur, out = []; for (const p of w) { if (Math.hypot(p[0] - v.st.x, p[1] - v.st.y) > 90) continue; const g = WELT.heightAt(p[0], p[1]); if (g !== undefined) out.push(+(g - p[2]).toFixed(3)); } return out })()""")
        dz = max([abs(v) for v in gr]) if gr else 99
        ck('the ground on the Kolonnenweg is its smoothed profile (drawn tiles within 0.25 m)', len(gr) > 40 and dz < 0.25, f'{len(gr)} points, max |dz| {dz}')
        if want('weg'):
            for _ in range(4): steps(0.3); time.sleep(0.4)
            # the pictures on foot beside the moped (on it the camera is the rider's)
            X("const v = VEH.cur; window._mo = [v.st.x, v.st.y, v.st.psi]; VEH.exit()")
            steps(0.3)
            X("const m = _mo; TS.look(m[0], m[1], m[2] * 57.2958 + 12, 7, 1.7, -7)")
            for _ in range(5): steps(0.3); time.sleep(0.6)
            pic('01_kolonnenweg_tag')
            calls = J("TS.calls()")
            print('zone: calls, triangles', calls, 'programs', J("TS.progs()"), flush=True)
            ck('draw calls on the Kolonnenweg within reason (< 1.6 x the garden, < 900)', calls[0] < max(900, base_calls[0] * 1.6), f'{calls} garden {base_calls}')
            ck('no more than two new shader programs for the zone', J("TS.progs()") - base_progs <= 2, f'{base_progs} -> {J("TS.progs()")}')
            X("VEH.enter('gl-moped')")
            steps(0.5)
            # ride: 300 m along the way, the follower steering (the test's hand on the bars)
            X("""const w = GLZONE.weg(), v = VEH.cur; let i = 0, b = 1e9; w.forEach((p, k) => { const d = Math.hypot(p[0] - v.st.x, p[1] - v.st.y); if (d < b) { b = d; i = k } }); const dir = i > w.length / 2 ? -1 : 1, pts = []; for (let k = i; k >= 0 && k < w.length && pts.length < 180; k += dir) pts.push([w[k][0], w[k][1]]); window._pts = pts; window._s0 = [v.st.x, v.st.y]; VEH.follow(pts, 8, { look: 6 })""")
            lat, zs, t = [], [], 0
            while t < 60:
                steps(1.0, 0.05); t += 1; time.sleep(0.15)
                if t <= 2: continue
                q = J("(() => { const v = VEH.cur, L = GLZDATA.linie(GLZONE.weg().flatMap(p => [p[0] * 10, p[1] * 10, p[2] * 100]), 3), n = GLZDATA.naechst(L, v.st.x, v.st.y); return { d: n.d, dz: v.st.z - KERN.ground(v.st.x, v.st.y), go: Math.hypot(v.st.x - _s0[0], v.st.y - _s0[1]), kmh: v.st.u * 3.6, end: FAHRT.capEnd || false } })()")
                lat.append(q['d']); zs.append(q['dz'])
                if q['go'] > 300: break
            X("VEH.auto = null")
            ck('the Simson rides 300 m along the Kolonnenweg', q['go'] > 280 and not q['end'], str(q))
            ck('… and stays on it (within 1.6 m of its middle)', max(lat) < 1.6, f'max {max(lat):.2f} m')
            ck('… on the ground, not above or in it', max(abs(z) for z in zs) < 0.35, f'max |dz| {max(abs(z) for z in zs):.2f}')
            X("const v = VEH.cur; window._mo = [v.st.x, v.st.y, v.st.psi]; VEH.exit()")
            steps(0.3)
            X("const m = _mo; TS.look(m[0], m[1], m[2] * 57.2958 + 150, 6, 1.6, -6)")
            for _ in range(5): steps(0.3); time.sleep(0.6)
            pic('02_simson_auf_dem_weg')
            # dusk (November: the sun sets ~16:30)
            X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 16 * 60 + 35")
            lib.settle_light(pg)
            X("const m = _mo; TS.look(m[0], m[1], m[2] * 57.2958 + 180, 14, 1.8, -4)")
            for _ in range(5): steps(0.3); time.sleep(0.6)
            pic('03_kolonnenweg_daemmerung')
            X("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 11 * 60")
            lib.settle_light(pg)
    # ------------------------------------------------------------------ bunker ------------------------------------------------------------------
    if want('bunker'):
        X("if (VEH.cur) VEH.exit()")
        steps(0.5)
        bk = J("GLZONE.debug.BK.tuer")
        o = J("GLZONE.ort('bunker')")
        X(f"const P = GAME.P; P.x = {bk[0]}; P.y = {bk[1]}; P.feet = KERN.ground({bk[0]}, {bk[1]}); P.yaw = 0")
        until(f"WELT.heightAt({bk[0]}, {bk[1]}) !== undefined", 60)
        steps(1)
        acts = J("KERN.acts().map(a => a.id)")
        ck('the bunker: its door can be looked at (locked)', 'glzone-bunker-tuer' in acts, str(acts[:12]))
        X("const a = KERN.acts().find(a => a.id === 'glzone-bunker-tuer'); if (a) a.run()")
        g0 = E(f"KERN.ground({o['x']}, {o['y']})")
        t0 = E(f"WELT.heightAt({o['x'] + 6}, {o['y'] + 6})")
        ck('the old foundation stands above the heath (one stands on it)', g0 is not None and o['z'] + 0.2 < g0 < o['z'] + 0.6, f"ground {g0} heath {o['z']} beside {t0}")
        # the wall stops the walker: a point in the wall is pushed out
        pw = J(f"(() => {{ const p = [{bk[0]}, {bk[1]}], F = GLZONE.debug.BK.F, w = F.P(0, -5.6 + 2.35, 0); p[0] = w[0]; p[1] = w[1]; const m = KERN.pushOut(p, 0.3); return {{ m, d: Math.hypot(p[0] - w[0], p[1] - w[1]) }} }})()")
        ck('the bunker wall stops the walker', pw['m'] and pw['d'] > 0.1, str(pw))
        ck('KERN.place names the place', E(f"KERN.place({o['x']}, {o['y']})") == 'Altes Fundament in der Heide', str(E(f"KERN.place({o['x']}, {o['y']})")))
        F = J("(() => { const F = GLZONE.debug.BK.F; return [F.ox, F.oy, F.hd] })()")
        X(f"TS.look({F[0]}, {F[1]}, {F[2] * 57.2958 + 200}, 13, 2.6, -9)")
        for _ in range(5): steps(0.3); time.sleep(0.6)
        pic('04_bunker_aussen')
        X(f"const F = GLZONE.debug.BK.F, w = F.P(0, -2.2, 0); TS.look(w[0], w[1], F.hd * 57.2958 + 180, 4.5, 1.6, -4)")
        for _ in range(4): steps(0.3); time.sleep(0.6)
        pic('05_bunker_tuer')
    # ------------------------------------------------------------------ leaving ------------------------------------------------------------------
    if want('weg') or want('bunker'):
        X("if (VEH.cur) VEH.exit(); GAME.go('garten')")
        until("!GLZONE.state().an", 60, 0.3, 0.2)
        st = J("GLZONE.state()")
        ck('leaving: the zone is freed (meshes, roads, collisions)', not st['an'] and st['meshes'] == 0 and st['cols'] == 0 and 'grenzland-zone' not in J("FAHRT.sets ? FAHRT.sets() : []"), str(st))
    ck.errors(errs)
    ck.done()
