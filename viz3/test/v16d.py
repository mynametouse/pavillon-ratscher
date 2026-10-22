# V16d wood: the stake trailer behind the tractor (coupling, towing, the fold limit, parked as an obstacle), over the garden bridge,
# logs on the pallet fork (pick up, carry tilted back, put down on the ground, on the trailer, on the band sawmill), the sawmill (clamp,
# plan, cut board by board), the blocks of boards, the drying stack (foundation, layers, roof), the moisture meter, the time-lapse.
# Pictures in out/v16d/.   python3 viz3/test/v16d.py 8954 [sections: trailer,bridge,fork,saw,stack]
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('v16d'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 640, errs, tier='hoch'); lib.boot(pg, port, query='?fell=1', figures=True); E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    steps = lambda secs: E(f"for (let i = 0; i < {int(secs / 0.025)}; i++) GAME.step(0.025)")
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    E("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(pg)
    for i in range(40):
        if E("!!(window.HOLZ && HOLZ.ready)"): break
        E("GAME.step(0.1)"); time.sleep(0.5)
    check('wood module ready', E("!!(HOLZ.ready && window.TRAILER && window.HOLZSAW && window.HOLZDRY)"))
    def cam(cx, cy, ch, tx, ty, tz, fov=60):
        gz = E(f"ROADS.groundAt({cx}, {cy})"); tg = E(f"ROADS.groundAt({tx}, {ty})"); yaw = math.degrees(math.atan2(tx - cx, ty - cy)); pitch = math.degrees(math.atan2(tg + tz - gz - ch, math.hypot(tx - cx, ty - cy)))
        E(f"GAME.setView3(false, true); GAME.view({cx}, {cy}, {gz + ch}, {yaw}, {pitch}, {fov}); GAME.step(0.05)")
    def drive(thr, brk, steer, secs): E(f"VEH.auto = () => ({{ thr: {thr}, brk: {brk}, steer: {steer}, hand: false }})"); steps(secs); E("VEH.auto = null")
    def stop(): drive(0, 1, 0, 1.2)
    gap = lambda: J("(() => { const v = VEH.by.tractor, h = TRAILER.hitchW(v), e = TRAILER.eyeW(); return Math.hypot(h[0] - e[0], h[1] - e[1]); })()")
    if want('trailer'):
        s0 = J("{ c: !!TRAILER.tow, t: TRAILER.st, v: VEH.by.tractor.st }"); print('start', s0['c'], {k: s0['t'][k] for k in ('x', 'y', 'psi')})
        check('trailer coupled behind the tractor at the start', s0['c'] and gap() < 0.05, f"gap {gap():.3f} m")
        E("VEH.enter('tractor'); GAME.setView3(true)"); steps(0.5)
        t0 = J("[TRAILER.st.x, TRAILER.st.y]"); drive(0.7, 0, 0.35, 6); s1 = J("{ t: TRAILER.st, v: VEH.by.tractor.st }")
        moved = math.hypot(s1['t']['x'] - t0[0], s1['t']['y'] - t0[1]); rel = abs((s1['t']['psi'] - s1['v']['psi'] + math.pi) % (2 * math.pi) - math.pi)
        check('towing: the trailer follows on its drawbar', moved > 6 and gap() < 0.05 and rel < 1.4, f"{moved:.1f} m, gap {gap():.3f} m, angle {math.degrees(rel):.0f}°")
        cam(s1['v']['x'] + 9, s1['v']['y'] - 6, 3.5, s1['v']['x'], s1['v']['y'], 1, 60); lib.shot(pg, OUT, 'a_towing')
        stop(); drive(0, 0.7, -0.4, 5); s2 = J("{ t: TRAILER.st, v: VEH.by.tractor.st }"); rel2 = abs((s2['t']['psi'] - s2['v']['psi'] + math.pi) % (2 * math.pi) - math.pi)
        check('reversing folds it, but not past the stop', rel2 <= math.radians(75.5) and gap() < 0.05, f"angle {math.degrees(rel2):.0f}°")
        stop(); E("TRAILER.toggle()"); check('uncoupled', E("!TRAILER.tow"))
        tp = J("[TRAILER.st.x, TRAILER.st.y]"); drive(0.7, 0, 0, 3); stop(); tq = J("[TRAILER.st.x, TRAILER.st.y]")
        check('a parked trailer stays put', math.hypot(tq[0] - tp[0], tq[1] - tp[1]) < 0.01, str(tq))
        # back to it: the hitch right at the eye, then K
        E("(() => { const e = TRAILER.eyeW(), p = TRAILER.st.psi, f = [Math.sin(p), Math.cos(p)]; VEH.place('tractor', e[0] + f[0] * 2.18, e[1] + f[1] * 2.18, p); })()"); steps(0.4)
        E("TRAILER.toggle()"); check('coupled again with K', E("!!TRAILER.tow") and gap() < 0.05, f"gap {gap():.3f}")
        # a vehicle runs into the parked trailer
        E("TRAILER.toggle()"); E("(() => { const s = TRAILER.st, f = [Math.sin(s.psi), Math.cos(s.psi)], r = [Math.cos(s.psi), -Math.sin(s.psi)]; VEH.place('tractor', s.x + r[0] * 7, s.y + r[1] * 7, s.psi - Math.PI / 2); })()"); steps(0.3)
        drive(0.8, 0, 0, 4); bx = J("(() => { const s = TRAILER.st, v = VEH.by.tractor.st, r = [Math.cos(s.psi), -Math.sin(s.psi)]; return (v.x - s.x) * r[0] + (v.y - s.y) * r[1]; })()")
        check('the parked trailer stops the tractor', bx > 2.0, f"tractor {bx:.2f} m beside the trailer's axis")
        stop(); E("VEH.exit()"); steps(0.3)
    if want('bridge'):   # the tractor with the trailer from the field path over the garden bridge into the garden
        br = J("{ a: STREAM.wpt(STREAM.TB, STREAM.OFF - 12), b: STREAM.wpt(STREAM.TB, STREAM.OFF - 5), c: STREAM.wpt(STREAM.TB, STREAM.OFF), d: STREAM.wpt(STREAM.TB, STREAM.OFF + 6), e: STREAM.wpt(STREAM.TB, STREAM.OFF + 14), psi: Math.atan2(STREAM.N[0], STREAM.N[1]) }")
        E(f"VEH.place('tractor', {br['a'][0]}, {br['a'][1]}, {br['psi']}); TRAILER.home(); VEH.enter('tractor')"); steps(0.5)
        check('trailer coupled for the bridge', E("!!TRAILER.tow"))
        E(f"window._fs = VEH.follow({json.dumps([br['a'], br['b'], br['c'], br['d'], br['e']])}, 3)"); zmin = 9; tz = 9
        for k in range(30):
            steps(0.5); s = J("{ v: VEH.by.tractor.st, t: TRAILER.st }"); zmin = min(zmin, s['v']['z']); tz = min(tz, s['t']['z'])
            if k == 9: cam(br['c'][0] + 7, br['c'][1] - 3, 3, br['c'][0], br['c'][1], 1, 62); lib.shot(pg, OUT, 'b_bridge'); E("GAME.setView3(true)")
            if E("window._fs && window._fs.done"): break
        e = J("VEH.by.tractor.st"); dd = math.hypot(e['x'] - br['e'][0], e['y'] - br['e'][1])
        check('over the bridge into the garden, no wheel in the stream', dd < 4 and zmin > -0.2 and tz > -0.2, f"end {dd:.1f} m from the target, lowest z tractor {zmin:.2f}, trailer {tz:.2f}")
        E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null"); stop(); E("VEH.exit()"); steps(0.3)
    if want('fork') or want('saw') or want('stack'):   # a log in the garden: on the fork, to the sawmill
        E("TRAILER.uncouple && TRAILER.tow && TRAILER.uncouple(true)")
        lid = E("HOLZ.testLog({ sp: 'spruce', x: -5, y: -17.5, az: 0, L: 4.1, d0: 34, d1: 28 })"); steps(0.2)
        # the tractor west of it, facing east; the tines' middle ~3.1 m ahead of its centre with the fork on the ground
        E("VEH.place('tractor', -5 - 3.4, -17.5, Math.PI / 2); VEH.enter('tractor'); (() => { const LD = TRACTOR2.model.LD; LD.liftT = LD.min; })()"); steps(3)
        # line the tines' middle up under the log (a driver creeps forward until the tines are under it)
        E("""(() => { const F = TRACTOR2.model.fork; F.tool.updateWorldMatrix(true, false); const p = new THREE.Vector3(0, F.top, -(F.y0 + F.y1) / 2).applyMatrix4(F.tool.matrixWorld), m = [p.x, -p.z];
          const l = HOLZ.logs.find(l => l.id === '""" + lid + """'), c = HOLZ.mid(l), v = VEH.by.tractor.st; VEH.place('tractor', v.x + (c[0] - m[0]), v.y + (c[1] - m[1]) * 0 + 0, v.psi); })()"""); steps(0.4)
        info = J("(() => { const l = HOLZ.logs.find(l => l.id === '" + lid + "'); return { st: l.st, v: VEH.by.tractor.st.x }; })()"); print('before lift', info)
        E("TRACTOR2.model.key('r', true)"); steps(1.8); E("TRACTOR2.model.key('r', false)"); steps(0.2)
        st = E(f"HOLZ.logs.find(l => l.id === '{lid}').st"); check('lifting with the tines under it: the log lies on the fork', st == 'fork', st)
        E("TRACTOR2.model.key('t', true); TRACTOR2.model.key('t', false)"); steps(1.0)
        v = J("VEH.by.tractor.st"); cam(v['x'] + 2, v['y'] - 7.5, 2.2, v['x'] + 2.5, v['y'], 1.0, 60); lib.shot(pg, OUT, 'c_log_on_fork')
        if st == 'fork':
            # to the band sawmill: the log's middle over the bunks, tractor facing east
            sc = J("(() => { const p = BUILD.werkstatt ? BUILD.werkstatt.tf(-1.5, -31.65) : [-1.5, -31.65]; const l = HOLZ.logs.find(l => l.st === 'fork'), m = HOLZ.mid(l), v = VEH.by.tractor.st; return { p, d: [m[0] - v.x, m[1] - v.y] }; })()")
            E(f"VEH.place('tractor', {sc['p'][0] - sc['d'][0]}, {sc['p'][1] - sc['d'][1]}, Math.PI / 2)"); steps(0.5)
            E("TRACTOR2.model.key('r', true)"); steps(1.5); E("TRACTOR2.model.key('r', false)"); steps(0.3)
            E("TRACTOR2.model.key('g', true)"); steps(5.5); E("TRACTOR2.model.key('g', false)"); steps(0.3)
            st2 = E(f"HOLZ.logs.find(l => l.id === '{lid}').st"); check('lowered onto the band sawmill', st2 == 'saw', st2)
            drive(0, 0.6, 0, 2.2); stop(); E("VEH.exit()"); steps(0.4)
            cam(-1.5 - 3.5, -31.65 - 5, 2.2, -1.5, -31.6, 0.6, 62); lib.shot(pg, OUT, 'd_log_on_mill')
    if want('saw') or want('stack'):
        E("GEAR.give(); GEAR.wear('ohr', true); GEAR.wear('brille', true); GEAR.wear('hands', false)")
        def act(aid): return E(f"(() => {{ const a = PLAY.acts().find(a => a.id === '{aid}'); if (!a) return null; let l = null; try {{ l = a.label(); }} catch (e) {{ l = 'ERR ' + e; }} PLAY.run(a); return l; }})()")
        def go(): return E("(() => { const b = document.querySelector('#machwin .go'); if (!b || document.getElementById('machwin').hidden) return false; b.click(); return true; })()")
        def hold():
            for i in range(40):
                if E("!!PLAY.hold"): break
                time.sleep(0.2); E("GAME.step(0.025)")
            d = E("PLAY.hold ? PLAY.hold.dur : 0"); steps(d + 0.3); return d
        sp = J("BUILD.werkstatt ? BUILD.werkstatt.tf(-1.5 + 0.95, -31.65 - 2.3) : [-0.55, -33.95]"); E(f"GAME.view({sp[0]}, {sp[1]}, ROADS.groundAt({sp[0]}, {sp[1]}) + 1.65, 0, -10, 62); GAME.step(0.2)")
        print('clamp', act('hs:op')); hold(); steps(0.2); print('plan window', go()); steps(0.2)
        check('clamped and planned', E("!!(HOLZSAW.clamp && HOLZSAW.plan)"), str(J("HOLZSAW.plan && HOLZSAW.plan.cuts.length")))
        n = 0
        while E("!!HOLZSAW.log") and n < 20: act('hs:op'); hold(); n += 1
        bs = J("HOLZSAW.boards.map(b => ({ t: b.t, wS: b.wS, wW: b.wW, mc: b.mc0, pith: b.pith }))"); print('boards', bs)
        check('cut board by board: boards with wane, green moisture from their place in the log', len(bs) >= 5 and all(0.02 < x['t'] < 0.06 for x in bs) and any(x['wS'] < x['wW'] - 0.03 for x in bs) and min(x['mc'] for x in bs) < max(x['mc'] for x in bs), f"{len(bs)} boards in {n} cuts")
        check('the log is used up', E("!HOLZSAW.log && HOLZ.logs.every(l => !l.id.startsWith('T') || l.st === 'sawn' || l.st === 'ground')"))
        cam(-1.5 + 5, -31.6 - 4, 2.2, -0.2, -31.6, 0.3, 62); lib.shot(pg, OUT, 'e_blocks')
    if want('stack'):
        stp = J("BUILD.werkstatt ? BUILD.werkstatt.tf(2.25, -26.6) : [2.25, -26.6]"); E(f"GAME.view({stp[0]}, {stp[1]}, ROADS.groundAt({stp[0]}, {stp[1]}) + 1.65, 0, -10, 62); GAME.step(0.2)")
        print('setup', act('hd:op')); steps(0.1); go(); hold()
        check('foundation set', E("!!HOLZDRY.stack"), str(J("HOLZDRY.stack && { found: HOLZDRY.stack.found, sp: HOLZDRY.stack.sp }")))
        n = 0
        while E("HOLZSAW.pileBoards().length > 0") and n < 12: act('hd:op'); hold(); n += 1
        check('all boards stacked layer by layer', E("HOLZSAW.pileBoards().length === 0 && HOLZDRY.stack.layers.length >= 2"), f"{E('HOLZDRY.stack.layers.length')} layers")
        print('roof', act('hd:op')); steps(0.1); go(); hold()
        check('covered and weighted', E("HOLZDRY.stack.roof && HOLZDRY.stack.weight"))
        cam(stp[0] + 4.5, stp[1] - 3.5, 2.0, stp[0] - 0.2, stp[1] + 1.3, 0.6, 62); lib.shot(pg, OUT, 'f_stack')
        m0 = J("HOLZDRY.stackMC()"); print('stack', m0)
        print('meter', act('hd:meter')); steps(0.1); go(); hold(); r = J("HOLZDRY.lastRead || null"); print('read', r)
        check('the meter reads (pins, group 3, temperature)', r is not None, str(r))
        print('lapse', act('hd:lapse')); steps(0.1)
        E("(() => { const b = document.querySelector('#machwin [data-ch=\"span\"][data-v=\"m\"]'); if (b) b.click(); })()"); steps(0.1); go()
        for i in range(30):
            steps(0.5)
            if not E("!!CLOCK.warp"): break
        steps(1.5); m1 = J("HOLZDRY.stackMC()"); print('after a month', m1)
        check('a month later the stack is drier', m1 and m0 and m1['avg'] < m0['avg'] - 5, f"{m0 and round(m0['avg'], 1)} → {m1 and round(m1['avg'], 1)} %")
        fc = E("HOLZDRY.forecast(20)"); print('days to 20 %', fc)
    print('\n'.join(e for e in errs if 'favicon' not in e)[:3000] or 'no errors')
    check('no errors', not [e for e in errs if 'PAGEERR' in e])
print(f"\n{len(ok)} ok, {len(fails)} failed: {fails}")
