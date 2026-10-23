# V16h the forestry winch on the tractor (werk/winde.js, vehicles/tractor.js model.winch): at the Klinge, the tractor on the track, a log in
# the stand behind it – the winch down, the cable out by hand (walking, up to 50 m), the choker at the log's near end, out of the danger zone,
# wound in by radio until the log lies against the shield (dragged on the ground, past the trunks), the choker off, the cable hung in, the
# winch up; the fork takes the log from the side and puts it on the trailer. Skidding: a log lifted at the shield, dragged along by driving.
# A log behind a trunk hangs and stops the winch. The saved state; the fork's hints (lengthwise, too heavy).
# The crane on the trailer (werk/kran.js) loads a log lying at an angle.
# Pictures in out/winde/.   python3 viz3/test/winde.py 8975 [sections: model,pull,fork,skid,stuck,save,kran,hints]
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('winde'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ck = lib.Checks('winde')
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 640, errs, tier=os.environ.get('TIER', 'hoch')); lib.boot(pg, port, query='?fell=1', figures=True); E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    steps = lambda secs: E(f"for (let i = 0; i < {int(round(secs / 0.025))}; i++) GAME.step(0.025)")
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    E("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(pg)
    for i in range(60):
        if E("!!(window.HOLZ && HOLZ.ready && window.WINDE)"): break
        E("GAME.step(0.1)"); time.sleep(0.5)
    ck('winch module ready, the winch on the tractor', E("!!(window.WINDE && HOLZ.ready && TRACTOR2.model.winch && TRACTOR2.model.winch.g)"))
    sub = lambda: E("(document.getElementById('npcsub') || {}).textContent || ''")
    best = lambda: E("PLAY.best ? PLAY.best.id + ' | ' + PLAY.best.label() : ''")
    st = lambda: J("WINDE.state()")
    def walk_mode(): E("GAME.P.mode = 'walk'; document.body.dataset.mode = 'walk'")
    def orbit(tx, ty, tz, az, el, r): E(f"GAME.orbit({az}, {el}, {r}, [{tx}, {ty}, {tz}])")
    def shot(name):
        lib.shot(pg, OUT, name); walk_mode()
    def stand(x, y, yaw):   # the player stands there (on the ground), looking along yaw (deg)
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.65, {yaw}, -8); GAME.step(0.05)")
    def walk_to(x, y, near=0.9, limit=60):   # walking with the physics (trunks hold me), turning towards the target
        for i in range(int(limit / 0.5)):
            p = J("[GAME.P.x, GAME.P.y]"); d = math.hypot(x - p[0], y - p[1])
            if d < near: return True
            E(f"GAME.P.yaw = {math.degrees(math.atan2(x - p[0], y - p[1]))}")
            E(f"GAME.step({min(0.5, d / 1.45)}, 1)")
        return False
    def act():   # what E does now
        return E("(() => { const b = PLAY.best; const l = b ? b.label() : null; PLAY.primary(); return l; })()")
    tr = lambda: J("VEH.by.tractor.st")
    def drive(thr, secs, steer=0): E(f"VEH.auto = v => (v ? {{ thr: {thr}, brk: 0, steer: {steer}, hand: false }} : null)"); steps(secs); E("VEH.auto = null")
    def stop(): E("VEH.auto = v => { if (!v) return null; const u = v.st.u; return Math.abs(u) < 0.15 ? { thr: 0, brk: 0, steer: 0, hand: true } : u > 0 ? { thr: 0, brk: 1, steer: 0, hand: false } : { thr: 1, brk: 0, steer: 0, hand: false }; }"); steps(2.0); E("VEH.auto = null")
    # the tractor on the track, its rear turned towards the denser stand (where a log would lie)
    TURN = """(() => { const v = VEH.by.tractor.st, T = []; WCOL.each(v.x - 32, v.y - 32, v.x + 32, v.y + 32, null, (i, Q) => T.push([Q[i * 3], Q[i * 3 + 1]]));
      let best = null; for (let a = 0; a < 360; a += 10) { const az = a * Math.PI / 180, d = [Math.sin(az), Math.cos(az)]; let n = 0;
        for (const t of T) { const dx = t[0] - v.x, dy = t[1] - v.y, al = dx * d[0] + dy * d[1], sd = Math.abs(dx * d[1] - dy * d[0]); if (al > 8 && al < 30 && sd < 9) n++; }
        if (!best || n > best.n) best = { az, n }; }
      VEH.place('tractor', v.x, v.y, best.az + Math.PI); return best; })()"""
    # ---- the place: the tractor at the Klinge on the track, its rear towards the stand; the trailer parked out of the way ----
    E("TRAILER.tow && TRAILER.uncouple(true)")
    print('turned', J(TURN), flush=True); steps(0.3)
    t0 = tr()
    E(f"(() => {{ const s = TRAILER.st; s.x = {t0['x']} + Math.sin({t0['psi']}) * 16; s.y = {t0['y']} + Math.cos({t0['psi']}) * 16; s.psi = {t0['psi']}; s.z = ROADS.groundAt(s.x, s.y); TRAILER.pose(); }})()")
    FIND = """((psiOff, minD, maxD) => {   // a log place behind the tractor: a free corridor from the winch, trunks around (the stand), a free lie
      const v = VEH.by.tractor.st, f = [Math.sin(v.psi), Math.cos(v.psi)], rear = [v.x - f[0] * 2.8, v.y - f[1] * 2.8];
      const T = []; WCOL.each(rear[0] - 50, rear[1] - 50, rear[0] + 50, rear[1] + 50, null, (i, Q) => T.push([Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]]));
      const segD = (p, a, b) => { const ux = b[0] - a[0], uy = b[1] - a[1], L2 = ux * ux + uy * uy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / L2)); return Math.hypot(a[0] + ux * t - p[0], a[1] + uy * t - p[1]); };
      const out = [];
      for (let a = -56; a <= 56; a += 4) for (let dist = minD; dist <= maxD; dist += 2) {
        const az = v.psi + Math.PI + (a + psiOff) * Math.PI / 180, d = [Math.sin(az), Math.cos(az)], p = [rear[0] + d[0] * dist, rear[1] + d[1] * dist];
        let corr = 1e9, stand = 0; for (const t of T) { corr = Math.min(corr, segD([t[0], t[1]], rear, p) - t[2]); if (Math.hypot(t[0] - p[0], t[1] - p[1]) < 7) stand++; }
        if (corr < 0.8 || stand < 3) continue;
        // the log across the pull (60–80°), its body clear of trunks
        for (const lay of [70, -70, 60, -60, 80, -80]) {
          const la = az + lay * Math.PI / 180, u = [Math.sin(la), Math.cos(la)], a0 = [p[0] - u[0] * 2.1, p[1] - u[1] * 2.1], a1 = [p[0] + u[0] * 2.1, p[1] + u[1] * 2.1];
          let cl = 1e9; for (const t of T) cl = Math.min(cl, segD([t[0], t[1]], a0, a1) - t[2]);
          if (cl > 0.5) { out.push({ a, dist, p, az: la, corr: +corr.toFixed(2), stand, cl: +cl.toFixed(2), pull: az }); break; }
        }
      }
      out.sort((x, y) => y.dist - x.dist || Math.abs(x.a) - Math.abs(y.a));
      return { rear, n: T.length, c: out.slice(0, 6) };
    })"""
    if want('model') or want('pull') or want('fork') or want('save'):
        spot = J(FIND + "(0, 12, 26)"); print('spot', spot['n'], spot['c'][:3], flush=True)
        ck('a log place in the stand behind the tractor', len(spot['c']) > 0, f"{len(spot['c'])} candidates, {spot['n']} trunks around")
        c = spot['c'][0] if spot['c'] else {'p': [t0['x'] - math.sin(t0['psi']) * 18, t0['y'] - math.cos(t0['psi']) * 18], 'az': t0['psi'] + math.pi / 2, 'dist': 18}
        lid = E(f"HOLZ.testLog({{ sp: 'spruce', x: {c['p'][0]}, y: {c['p'][1]}, az: {c['az']}, L: 4.2, d0: 36, d1: 30 }})"); steps(0.2)
        L0 = J(f"(() => {{ const l = HOLZ.by['{lid}']; return {{ p0: l.p0, p1: l.p1, kg: HOLZ.mass(l) }}; }})()"); print('log', lid, L0, flush=True)
    if want('model') or want('pull') or want('fork') or want('save'):
        v = tr(); R = J("WINDE.exitW()")
        orbit(R[0], R[1], R[2] - 0.6, math.degrees(v['psi']) + 180 + 38, 14, 7.5); shot('a_winch_up')
        ck('transport: the winch up, its lower edge high enough for a drawbar', E("TRACTOR2.model.winch.lift") > 0.99 and J("WINDE.state()")['cable'] == 'drum')
        # behind the winch: E takes the cable – the winch goes down first
        bp = J("TRACTOR2.model.winch.toW([0, -1.35, 0])"); stand(bp[0], bp[1], math.degrees(v['psi']))
        b0 = best(); print('at the winch:', b0, flush=True)
        ck('behind the winch the action is „Seil ausziehen“', b0.startswith('winde:cable') and 'Seil ausziehen' in b0, b0)
        act(); steps(3.0)
        s1 = st(); print('after taking', s1, flush=True)
        ck('the winch is down (shield on the ground), the cable end in the hand', s1['lift'] < 0.01 and s1['cable'] == 'hand' and E("PLAY.carry && PLAY.carry.id") == 'winde:seil', str(s1))
        sz = J("(() => { const p = TRACTOR2.model.winch.toW([0, -0.56, 0]); return [p[2], KERN.ground(p[0], p[1])]; })()")
        ck('the shield touches the ground', abs(sz[0] - sz[1]) < 0.25, f"shield edge {sz[0]:.2f}, ground {sz[1]:.2f}")
        orbit(R[0], R[1], R[2] - 1.0, math.degrees(v['psi']) + 180 + 38, 12, 7.0); shot('b_winch_down')
        ck('the tractor is held while the winch is down', E("TRACTOR2.model.hold()"))
    if want('pull') or want('fork') or want('save'):
        # walk to the log's near end with the cable
        ends = J(f"(() => {{ const l = HOLZ.by['{lid}'], X = WINDE.exitW(); const d0 = Math.hypot(l.p0[0] - X[0], l.p0[1] - X[1]), d1 = Math.hypot(l.p1[0] - X[0], l.p1[1] - X[1]); return d0 < d1 ? {{ e: 0, p: l.p0, q: l.p1 }} : {{ e: 1, p: l.p1, q: l.p0 }}; }})()")
        ex, ey = ends['p'][0], ends['p'][1]; ux, uy = ex - ends['q'][0], ey - ends['q'][1]; ul = math.hypot(ux, uy); tx, ty = ex + ux / ul * 0.9, ey + uy / ul * 0.9
        ok = walk_to(tx, ty, 0.6); s2 = st(); dX = J(f"(() => {{ const X = WINDE.exitW(); return Math.hypot(GAME.P.x - X[0], GAME.P.y - X[1]); }})()")
        print('walked', ok, s2, round(dX, 2), flush=True)
        ck('walking away unwinds the cable (as far as I am from the fairlead)', ok and s2['cable'] == 'hand' and abs(s2['out'] - dX) < 1.6 and s2['out'] > 10, f"out {s2['out']} m, I am {dX:.1f} m away")
        # a look back: the figure with the hook, the rope to the winch
        E(f"GAME.P.yaw = {math.degrees(math.atan2(R[0] - tx, R[1] - ty))}; GAME.setView3(true); GAME.step(0.3)"); lib.shot(pg, OUT, 'c_cable_out')
        E(f"GAME.P.yaw = {math.degrees(math.atan2(ex - tx, ey - ty))}"); steps(0.2)
        b1 = best(); print('at the log:', b1, flush=True)
        ck('at the log end: „Seil anschlagen“', b1.startswith('winde:fasten'), b1)
        act(); steps(0.2); s3 = st()
        ck('the choker sits on the log, the log is on the winch', s3['cable'] == 'log' and s3['log'] == lid and E(f"HOLZ.by['{lid}'].st") == 'winch', str(s3))
        ch = J("WINDE.chokerAt(HOLZ.by['" + lid + "'])"); orbit(ch[0], ch[1], ch[2] - 0.2, math.degrees(math.atan2(tx - ex, ty - ey)) + 40, 28, 3.2); shot('d_choker')
        # the danger zone: in the cable's line the remote refuses
        X = J("WINDE.exitW()"); mx, my = (X[0] + ex) / 2, (X[1] + ey) / 2
        ok = walk_to(mx, my, 0.8); steps(0.1)
        lab = E("(() => { const a = PLAY.acts().find(a => a.id === 'winde:funk'); return a ? a.label() : null; })()")
        E("WINDE.pullStart()"); steps(0.1); s4 = st()
        ck('standing in the cable line: the winch does not start (danger zone)', lab == 'Seil einholen (Funk)' and not s4['pull'] and 'Gefahrenbereich' in sub(), f"label {lab}, said: {sub()[:80]}")
        # a safe place beside the tractor, then the remote
        sp = J(f"(() => {{ const v = VEH.by.tractor; return VEH.toW(v, -4.6, 0.8); }})()"); walk_to(sp[0], sp[1], 0.8, 90); steps(0.1)
        b2 = best(); print('safe place:', b2, flush=True)
        ck('beside the tractor: „Seil einholen (Funk)“', b2.startswith('winde:funk') and 'einholen' in b2, b2)
        act(); steps(0.1); ck('it pulls', st()['pull'])
        L = lambda: J(f"(() => {{ const l = HOLZ.by['{lid}'], e = WINDE.state().ae, E = e ? l.p1 : l.p0, O = e ? l.p0 : l.p1, R = WINDE.restPt(l); return {{ E, O, dR: Math.hypot(E[0] - R[0], E[1] - R[1]), gO: O[2] - KERN.ground(O[0], O[1]), gE: E[2] - KERN.ground(E[0], E[1]) }}; }})()")
        start = L(); traj = []; shotDone = False; tpull = 0
        for k in range(160):
            steps(1.0); tpull += 1; s = st(); q = L(); traj.append(round(q['dR'], 2))
            if not shotDone and q['dR'] < start['dR'] * 0.55:
                shotDone = True; m = [(q['E'][0] + R[0]) / 2, (q['E'][1] + R[1]) / 2]
                orbit(m[0], m[1], q['E'][2], math.degrees(v['psi']) + 90 + 25, 24, 17); lib.shot(pg, OUT, 'e_pulling'); walk_mode()
                ck('while it pulls: the log slides on the ground (both ends on the forest floor)', 0.05 < q['gO'] < 0.45 and 0.05 < q['gE'] < 0.6, f"ends above ground {q['gE']:.2f} / {q['gO']:.2f} m")
            if not s['pull']: break
        s5 = st(); q = L(); print('pulled', tpull, 's, trajectory', traj[::8], s5, flush=True)
        moved = math.hypot(q['E'][0] - start['E'][0], q['E'][1] - start['E'][1])
        ck('wound in: the log lies against the shield', s5['atShield'] and q['dR'] < 0.6, f"{moved:.1f} m in {tpull} s, {q['dR']:.2f} m from the shield, said: {sub()[:90]}")
        ck('about half a metre a second', moved / max(1, tpull) > 0.3 and moved / max(1, tpull) < 0.65, f"{moved / max(1, tpull):.2f} m/s")
        orbit(R[0], R[1], R[2] - 1.0, math.degrees(v['psi']) + 180 + 50, 22, 9); shot('f_at_shield')
    if want('save'):
        sv = J("HOLZ.part2().winde"); print('saved', sv, flush=True)
        E("HOLZ.save()"); time.sleep(0.8); raw = J("JSON.parse(SAVE.raw('pav-holz-v1'))")
        rl = [o for o in raw['logs'] if o['id'] == lid]
        ck('saved: the cable on the log in part2.winde, the log itself as lying (older builds read it)', sv['c'] == 'log' and sv['log'] == lid and rl and rl[0]['st'] == 'ground' and 'p0' in rl[0] and raw.get('part2', {}).get('winde', {}).get('log') == lid, json.dumps(rl[:1])[:200])
        E("WINDE.reset()"); steps(0.1); E(f"HOLZ.by['{lid}'].st = 'ground'")
        E(f"WINDE.restore({json.dumps(sv)})"); steps(0.1); s6 = st()
        ck('restored from the saved state', s6['cable'] == 'log' and s6['log'] == lid and s6['atShield'] == sv['sh'] and E(f"HOLZ.by['{lid}'].st") == 'winch', str(s6))
        bad = E("(() => { try { for (const w of [null, 3, 'x', { c: 'log', log: 'nope' }, { c: 'free', end: [NaN, 1] }, { c: 'log', log: 5, out: 'a' }]) WINDE.restore(w); return 'ok'; } catch (e) { return String(e); } })()")
        ck('a broken saved winch state is ignored', bad == 'ok', bad)
    if want('fork'):
        # the choker off (at the log), the cable back at the winch, the winch up
        ch = J("WINDE.chokerAt(HOLZ.by['" + lid + "'])"); vv = tr()
        side = J(f"""(() => {{ const l = HOLZ.by['{lid}'], c = WINDE.chokerAt(l), u = [l.p1[0] - l.p0[0], l.p1[1] - l.p0[1]], ul = Math.hypot(u[0], u[1]), n = [-u[1] / ul, u[0] / ul], v = VEH.by.tractor.st;
          const a = [c[0] + n[0] * 1.1, c[1] + n[1] * 1.1], b = [c[0] - n[0] * 1.1, c[1] - n[1] * 1.1]; return Math.hypot(a[0] - v.x, a[1] - v.y) > Math.hypot(b[0] - v.x, b[1] - v.y) ? a : b; }})()""")
        walk_to(side[0], side[1], 0.4); E(f"GAME.P.yaw = {math.degrees(math.atan2(ch[0] - side[0], ch[1] - side[1]))}"); steps(0.2)
        b3 = best(); print('at the shield:', b3, flush=True)
        ck('at the log end: „Choker lösen“', b3.startswith('winde:release'), b3)
        act(); steps(0.2); s7 = st()
        ck('the choker off: the log lies on the ground, the hook in my hand', s7['cable'] == 'hand' and E(f"HOLZ.by['{lid}'].st") == 'ground', str(s7))
        bp = J("TRACTOR2.model.winch.toW([0, -1.0, 0])"); walk_to(bp[0], bp[1], 0.6); E(f"GAME.P.yaw = {math.degrees(vv['psi'])}"); steps(0.2)
        b4 = best(); ck('behind the winch: „Seil an der Winde einhängen“', b4.startswith('winde:cable') and 'einhängen' in b4, b4)
        act(); steps(0.2)
        lp = J("VEH.toW(VEH.by.tractor, -1.22, -1.95)"); ls = J("VEH.toW(VEH.by.tractor, -2.0, -2.3)"); walk_to(ls[0], ls[1], 0.4)
        E(f"GAME.P.yaw = {math.degrees(math.atan2(lp[0] - ls[0], lp[1] - ls[1]))}"); steps(0.2)
        b5 = best(); ck('at the left wing: „Winde anheben (Außenbedienung)“', b5.startswith('winde:lift') and 'anheben' in b5, b5)
        act(); steps(3.0); s8 = st()
        ck('cable in, winch up: the tractor may drive', s8['cable'] == 'drum' and s8['lift'] > 0.99 and not s8['hold'], str(s8))
        # the fork from the side: the tractor across the log, the tines' middle under its middle
        E("VEH.enter('tractor'); (() => { const LD = TRACTOR2.model.LD; LD.liftT = LD.min; LD.tiltT = 0; })()"); steps(3)
        al = J(f"""(() => {{ const l = HOLZ.by['{lid}'], m = HOLZ.mid(l), u = [l.p1[0] - l.p0[0], l.p1[1] - l.p0[1]], ul = Math.hypot(u[0], u[1]), n = [-u[1] / ul, u[0] / ul];
          const v = VEH.by.tractor.st, X = [v.x - m[0], v.y - m[1]], sd = Math.sign(X[0] * n[0] + X[1] * n[1]) || 1, psi = Math.atan2(-n[0] * sd, -n[1] * sd);
          VEH.place('tractor', m[0] + n[0] * sd * 3.4, m[1] + n[1] * sd * 3.4, psi); return {{ m, psi }}; }})()""")
        steps(0.4)
        E(f"""(() => {{ const F = TRACTOR2.model.fork; F.tool.updateWorldMatrix(true, false); const p = new THREE.Vector3(0, F.top, -(F.y0 + F.y1) / 2).applyMatrix4(F.tool.matrixWorld), q = [p.x, -p.z];
          const m = HOLZ.mid(HOLZ.by['{lid}']), v = VEH.by.tractor.st; VEH.place('tractor', v.x + m[0] - q[0], v.y + m[1] - q[1], v.psi); }})()"""); steps(0.4)
        E("TRACTOR2.model.key('r', true)"); steps(1.8); E("TRACTOR2.model.key('r', false)"); steps(0.2)
        stf = E(f"HOLZ.by['{lid}'].st"); ck('after winching the fork takes the log from the side', stf == 'fork', f"{stf}, said: {sub()[:100]}")
        E("TRACTOR2.model.key('t', true); TRACTOR2.model.key('t', false)"); steps(1.0)
        vt = tr(); orbit(vt['x'], vt['y'], J(f"KERN.ground({vt['x']}, {vt['y']})") + 1.2, math.degrees(vt['psi']) + 60, 18, 9); shot('g_on_fork')
        if stf == 'fork':
            # onto the trailer (as v16d: in the garden, from the side, over the stakes)
            E("(() => { const s = TRAILER.st; s.x = -2; s.y = -11; s.psi = 0; s.z = ROADS.groundAt(-2, -11); TRAILER.pose(); })()"); steps(0.3)
            E("VEH.place('tractor', -9.5 - 3.4, -11, Math.PI / 2)"); steps(0.4)
            E("TRACTOR2.model.key('r', true)"); steps(4.5); E("TRACTOR2.model.key('r', false)"); steps(0.2)
            drive(0.35, 4.0); stop()
            E("TRACTOR2.model.key('g', true)"); steps(7); E("TRACTOR2.model.key('g', false)"); steps(0.3)
            st3 = J(f"(() => {{ const l = HOLZ.by['{lid}']; return {{ st: l.st, cargo: TRAILER.cargo || 0 }}; }})()")
            ck('and puts it on the trailer', st3['st'] == 'trailer' and st3['cargo'] > 100, str(st3))
            vt = J("TRAILER.st"); orbit(vt['x'], vt['y'], J(f"KERN.ground({vt['x']}, {vt['y']})") + 1.0, 215, 20, 9); shot('h_on_trailer')
        E("VEH.exit()"); steps(0.3)
    if want('skid'):
        E("VEH.cur && VEH.exit(); WINDE.reset()"); steps(0.3)
        p = J("(() => { const p = VEH.by.tractor.spec.home(); VEH.place('tractor', p[0], p[1], p[2]); return p; })()"); steps(0.3); J(TURN); steps(0.3)
        spot2 = J(FIND + "(0, 12, 18)"); c2 = spot2['c'][0] if spot2['c'] else None
        ck('a second log place for skidding', c2 is not None, str(spot2['c'][:1]))
        if c2:
            lid2 = E(f"HOLZ.testLog({{ sp: 'larch', x: {c2['p'][0]}, y: {c2['p'][1]}, az: {c2['pull']}, L: 3.6, d0: 30, d1: 26 }})"); steps(0.2)
            bq = J("TRACTOR2.model.winch.toW([0, -1.4, 0])"); stand(bq[0], bq[1], 0)
            E("WINDE.takeCable()"); steps(3)
            e2 = J(f"WINDE.nearEnd(HOLZ.by['{lid2}'].p0[0], HOLZ.by['{lid2}'].p0[1], 0.1) || WINDE.nearEnd(HOLZ.by['{lid2}'].p1[0], HOLZ.by['{lid2}'].p1[1], 0.1)")
            X = J("WINDE.exitW()"); l2 = J(f"HOLZ.by['{lid2}']")
            ne = 0 if math.hypot(l2['p0'][0] - X[0], l2['p0'][1] - X[1]) < math.hypot(l2['p1'][0] - X[0], l2['p1'][1] - X[1]) else 1
            pe = l2['p0'] if ne == 0 else l2['p1']; walk_to(pe[0], pe[1], 1.3)
            E(f"WINDE.fasten(HOLZ.by['{lid2}'], {ne})"); sp = J("VEH.toW(VEH.by.tractor, -4.6, 0.8)"); walk_to(sp[0], sp[1], 0.8, 90)
            E("WINDE.pullStart()")
            for k in range(80):
                steps(1.0)
                if not st()['pull']: break
            ck('the second log at the shield', st()['atShield'], str(st()))
            E("VEH.enter('tractor')"); steps(0.2); E("TRACTOR2.model.key('n', true); TRACTOR2.model.key('n', false)"); steps(2.5)
            s9 = st(); ck('N lifts the log at the shield a little (skidding position), the tractor may drive', abs(s9['liftT'] - 0.5) < 0.01 and not s9['hold'], str(s9))
            m0 = J(f"HOLZ.mid(HOLZ.by['{lid2}'])"); v0 = tr()
            drive(0.45, 6.0); stop()
            m1 = J(f"HOLZ.mid(HOLZ.by['{lid2}'])"); v1 = tr()
            gap = J(f"(() => {{ const l = HOLZ.by['{lid2}'], e = WINDE.state().ae, E = e ? l.p1 : l.p0, R = WINDE.restPt(l), O = e ? l.p0 : l.p1; return {{ d: Math.hypot(E[0] - R[0], E[1] - R[1]), up: E[2] - KERN.ground(E[0], E[1]), gO: O[2] - KERN.ground(O[0], O[1]) }}; }})()")
            dv = math.hypot(v1['x'] - v0['x'], v1['y'] - v0['y']); dm = math.hypot(m1[0] - m0[0], m1[1] - m0[1])
            ck('skidding: the tractor drives, the log follows (its end lifted at the shield, the rest on the ground)', dv > 3 and abs(dm - dv) < 1.5 and gap['d'] < 0.2 and gap['up'] > 0.35 and gap['gO'] < 0.4, f"tractor {dv:.1f} m, log {dm:.1f} m, {gap}")
            orbit(m1[0], m1[1], m1[2], math.degrees(v1['psi']) + 120, 20, 10); shot('i_skidding')
            E("TRACTOR2.model.key('n', true); TRACTOR2.model.key('n', false)"); steps(2.5)
            ck('N again: the winch down, the log lies', st()['liftT'] == 0, str(st()))
            E("VEH.exit()"); steps(0.3)
            E("WINDE.release(); WINDE.hangIn(); WINDE.toggleLift()"); steps(3)
    if want('stuck'):
        E("VEH.cur && VEH.exit(); WINDE.reset()"); steps(0.3)
        p = J("(() => { const p = VEH.by.tractor.spec.home(); VEH.place('tractor', p[0], p[1], p[2]); return p; })()"); steps(0.3); J(TURN); steps(0.3)
        # a trunk 8–20 m behind the winch, the log right behind it on the same line (head-on)
        sc = J("""(() => { const v = VEH.by.tractor.st, X = WINDE.exitW(), f = [Math.sin(v.psi), Math.cos(v.psi)]; const T = [];
          WCOL.each(X[0] - 22, X[1] - 22, X[0] + 22, X[1] + 22, null, (i, Q) => T.push([Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]]));
          const c = T.map(t => ({ t, d: Math.hypot(t[0] - X[0], t[1] - X[1]), back: -((t[0] - X[0]) * f[0] + (t[1] - X[1]) * f[1]) })).filter(o => o.d > 8 && o.d < 20 && o.back > o.d * 0.6).sort((a, b) => a.d - b.d);
          return c.length ? c[0] : null; })()""")
        ck('a trunk behind the tractor for the stuck test', sc is not None, str(sc))
        if sc:
            t = sc['t']; X = J("WINDE.exitW()"); u = [(t[0] - X[0]) / sc['d'], (t[1] - X[1]) / sc['d']]
            r = 0.15; c = [t[0] + u[0] * (t[2] + r + 0.25 + 1.6), t[1] + u[1] * (t[2] + r + 0.25 + 1.6)]
            lid3 = E(f"HOLZ.testLog({{ sp: 'spruce', x: {c[0]}, y: {c[1]}, az: {math.atan2(u[0], u[1])}, L: 3.2, d0: 30, d1: 26 }})"); steps(0.2)
            l3 = J(f"HOLZ.by['{lid3}']"); ne = 0 if math.hypot(l3['p0'][0] - X[0], l3['p0'][1] - X[1]) < math.hypot(l3['p1'][0] - X[0], l3['p1'][1] - X[1]) else 1
            bq = J("TRACTOR2.model.winch.toW([0, -1.4, 0])"); stand(bq[0], bq[1], 0)
            E("WINDE.takeCable()"); steps(3); E(f"WINDE.fasten(HOLZ.by['{lid3}'], {ne})")
            sp = J("VEH.toW(VEH.by.tractor, -4.6, 0.8)"); stand(sp[0], sp[1], 0); E("WINDE.pullStart()")
            for k in range(30):
                steps(0.5)
                if not st()['pull']: break
            s10 = st(); said = sub()
            ck('a log behind a trunk hangs: the winch stops and says why', not s10['pull'] and not s10['atShield'] and 'fest' in said, f"{s10}, said: {said[:100]}")
            orbit(t[0], t[1], J(f"KERN.ground({t[0]}, {t[1]})") + 0.6, math.degrees(math.atan2(u[0], u[1])) + 90, 25, 6); shot('j_stuck')
            # the choker to the other end: now it comes free (glances off the trunk) – or at least moves
            E("WINDE.release()"); E(f"WINDE.fasten(HOLZ.by['{lid3}'], {1 - ne})"); m0 = J(f"HOLZ.mid(HOLZ.by['{lid3}'])"); E("WINDE.pullStart()"); steps(6)
            m1 = J(f"HOLZ.mid(HOLZ.by['{lid3}'])"); print('other end', st(), round(math.hypot(m1[0] - m0[0], m1[1] - m0[1]), 2), flush=True)
            E("WINDE.reset()")
    if want('kran'):   # the crane on the trailer: a log lying at an angle beside it – grip, swing over the bed, lay it between the stakes
        E("VEH.cur && VEH.exit(); WINDE.reset(); TRAILER.tow && TRAILER.uncouple(true)"); steps(0.3)
        E("(() => { const s = TRAILER.st; s.x = -2; s.y = -11; s.psi = 0; s.z = ROADS.groundAt(-2, -11); TRAILER.pose(); })()"); steps(0.3)
        E("VEH.place('tractor', 8, -30, 0)"); steps(0.3)
        E("HOLZ.logs.filter(l => l.st === 'trailer').forEach(l => { l.st = 'ground'; l.p0 = [20, -40 - l.L, 0]; l.p1 = [20, -40, 0]; }); HOLZ.trailerMass(); HOLZ.redraw()")
        lk = E("HOLZ.testLog({ sp: 'spruce', x: -6.3, y: -8.6, az: 0.5, L: 4.0, d0: 32, d1: 26 })"); steps(0.2)
        cp = J("(() => { const T = TRAILER, c = T.toW(0.86 + 0.7, 2.62 + 0.2); return c; })()"); m = J(f"HOLZ.mid(HOLZ.by['{lk}'])")
        stand(cp[0], cp[1], math.degrees(math.atan2(m[0] - cp[0], m[1] - cp[1]))); steps(0.2)
        b6 = best(); print('at the crane:', b6, flush=True)
        ck('at the crane\'s levers: „Kran: … aufladen“', b6.startswith('kran:op') and 'aufladen' in b6, b6)
        act(); steps(0.1); ck('the crane works', E("KRAN.busy"))
        shotA = shotB = False
        for k in range(80):
            steps(0.5); q = J(f"(() => {{ const l = HOLZ.by['{lk}']; return {{ busy: KRAN.busy, st: l.st, z: HOLZ.mid(l)[2] - KERN.ground(HOLZ.mid(l)[0], HOLZ.mid(l)[1]), i: KRAN.Q && 0 }}; }})()")
            if not shotA and E("KRAN.Q.open") > 0.9:
                shotA = True; t = J("TRAILER.st"); orbit(t['x'] - 3.5, t['y'] + 1.5, J(f"KERN.ground({t['x']}, {t['y']})") + 1.5, 215, 22, 11); shot('k_crane_reach')
            if not shotB and q['st'] == 'crane' and q['z'] > 1.5:
                shotB = True; t = J("TRAILER.st"); orbit(t['x'] - 2.5, t['y'] + 1.0, J(f"KERN.ground({t['x']}, {t['y']})") + 2.0, 235, 18, 11); shot('l_crane_lift')
            if not q['busy']: break
        r = J(f"(() => {{ const l = HOLZ.by['{lk}'], a = TRAILER.local(l.wp0), b = TRAILER.local(l.wp1); return {{ st: l.st, cargo: TRAILER.cargo || 0, along: Math.abs(a[0] - b[0]) < 0.05 && a[1] > b[1], busy: KRAN.busy }}; }})()")
        ck('the crane lays the log on the trailer, lengthwise, butt to the front', r['st'] == 'trailer' and r['cargo'] > 100 and r['along'] and not r['busy'], str(r))
        t = J("TRAILER.st"); orbit(t['x'], t['y'] + 0.5, J(f"KERN.ground({t['x']}, {t['y']})") + 1.2, 230, 20, 9); shot('m_crane_loaded')
        lk2 = E("HOLZ.testLog({ sp: 'larch', x: -6.6, y: -11.3, az: 0.2, L: 6.0, d0: 52, d1: 44 })"); steps(0.2)
        m2 = J(f"HOLZ.mid(HOLZ.by['{lk2}'])"); stand(cp[0], cp[1], math.degrees(math.atan2(m2[0] - cp[0], m2[1] - cp[1]))); steps(0.2)
        act(); steps(0.2); said = sub()
        ck('a heavy log far out: too heavy at that reach, it says so', not E("KRAN.busy") and 'schwer' in said and E(f"HOLZ.by['{lk2}'].st") == 'ground', said[:120])
    if want('hints'):
        E("VEH.cur && VEH.exit(); WINDE.reset()"); steps(0.3)
        lh = E("HOLZ.testLog({ sp: 'spruce', x: -5, y: -17.5, az: Math.PI / 2, L: 4.1, d0: 34, d1: 28 })"); steps(0.2)   # lying east–west
        E("VEH.place('tractor', -5 - 3.4, -17.5, Math.PI / 2); VEH.enter('tractor'); (() => { const LD = TRACTOR2.model.LD; LD.liftT = LD.min; LD.tiltT = 0; })()"); steps(3)
        E("TRACTOR2.model.key('r', true)"); steps(1.5); E("TRACTOR2.model.key('r', false)"); steps(0.2)
        said = sub(); ck('the fork along a log: it says the tines must go across', 'längs' in said and E(f"HOLZ.by['{lh}'].st") == 'ground', said[:120])
        E("VEH.exit()"); steps(0.2)
        lh2 = E("HOLZ.testLog({ sp: 'spruce', x: -5, y: -23, az: 0, L: 7.0, d0: 64, d1: 60 })"); steps(0.2)
        E("VEH.place('tractor', -5 - 3.4, -23, Math.PI / 2); VEH.enter('tractor'); (() => { const LD = TRACTOR2.model.LD; LD.liftT = LD.min; LD.tiltT = 0; })()"); steps(3)
        E(f"""(() => {{ const F = TRACTOR2.model.fork; F.tool.updateWorldMatrix(true, false); const p = new THREE.Vector3(0, F.top, -(F.y0 + F.y1) / 2).applyMatrix4(F.tool.matrixWorld), q = [p.x, -p.z];
          const m = HOLZ.mid(HOLZ.by['{lh2}']), v = VEH.by.tractor.st; VEH.place('tractor', v.x + m[0] - q[0], v.y, v.psi); }})()"""); steps(0.4)
        E("TRACTOR2.model.key('r', true)"); steps(1.5); E("TRACTOR2.model.key('r', false)"); steps(0.2)
        said = sub(); ck('a log over 1500 kg: too heavy, it says so', 'schwer' in said and E(f"HOLZ.by['{lh2}'].st") == 'ground', said[:120])
        E("VEH.exit()"); steps(0.2)
        ck('the winch button at the tacho (touch) is there', E("!!document.querySelector('#vhud [data-vb=\"winch\"]')"))
    ck.errors(errs)
    print('\n'.join(e for e in errs if 'favicon' not in e)[:3000] or 'no errors')
ck.done()
