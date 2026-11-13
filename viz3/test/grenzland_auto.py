# feat/grenzland-auto (13.11.2026): the vehicles of the mode „Grenzland“ – bodies that look like the real types, the player's moped, the
# cockpits. One run: every type spawns and stands on the ground (a line-up in the fields, pictures of each in three-quarter view from the
# front and of the important ones from behind), the first version's names still work, a car and a moped drive a line, the player's
# Simson rides (name and second line for the HUD, about 60 km/h, leans into the curve, the handlebar turns), the speedometer reads
# the truth, pictures from the saddle by day and at night; no new shader programs beyond what is reported, at most 16 textures each.
#   python3 viz3/test/grenzland_auto.py 9012        (~7 min in the chat machine; pictures in out/grenzland_auto/)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('grenzland_auto')
OUT = lib.out('grenzland_auto')
# type, options, three-quarter view from behind as well
TYPES = [
    ('s51', {'col': '#3d6b4a'}, True),
    ('streife', {'col': '#c9cdd2', 'band': '#1f4fa8', 'band2': '#cfe23c', 'bar': 'balken'}, True),
    ('trabant', {'col': '#d9d3bd'}, True),
    ('limo89', {'col': '#f1f0e8', 'band': '#2f6b3a', 'bar': 'rundum'}, True),
    ('wartburg', {'col': '#c8b25a'}, False),
    ('trabant_kombi', {'col': '#9fc1d2'}, False),
    ('kasten', {'col': '#f1f1ee'}, False),
    ('barkas', {'col': '#c9c7b4'}, False),
    ('w50', {'col': '#3f6f9a'}, False),
    ('schwalbe', {'col': '#3f6f9e'}, False),
    ('kombi', {'col': '#7d8791'}, False),
    ('klein89', {'col': '#8fb08a'}, False),
    ('lkw89', {}, False),
    ('moped', {'col': '#a23a2a'}, False),
]
X0, Y0, DX, HD = 30.0, -430.0, 4.6, 3.55
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try:
            lib.shot(pg, OUT, name)
        except Exception as e:
            print('shot failed', name, e)
    progs = lambda: J("GAME.R.info.programs.map(p => p.name + '#' + p.id)")
    # ---- before: the programs of the normal game at this place ----
    E("CAM3.want = false; GAME.view(%f, %f, KERN.ground(%f, %f) + 1.6, 0, -6)" % (X0 + 20, Y0 - 9, X0 + 20, Y0 - 9))
    steps(0.3)
    pic('00_vorher')
    p0 = progs()
    # ---- the mode, the line-up ----
    ok = E("GRENZLAND.start()")
    steps(1)
    st = J("({ on: GLSTATE.on, moped: !!(GLAUTO.moped && GLAUTO.moped.g.visible), name: GLAUTO.moped && GLAUTO.moped.name, sub: GLAUTO.moped && GLAUTO.moped.gl && GLAUTO.moped.gl.sub })")
    ck('the mode starts, the moped stands in the garden with its name for the HUD', ok and st['on'] and st['moped'] and st['name'] == 'Simson S 51' and 'PS' in (st['sub'] or ''), str(st))
    E("window.GLT = {}")
    info = {}
    for i, (typ, o, _) in enumerate(TYPES):
        x = X0 + i * DX
        r = J("(() => { const c = GLAUTO.spawn(%s, %s); if (!c) return null; GLAUTO.park(c, %f, %f, %f); GLT[%s] = c; let n = 0, m = 0; "
              "c.g.traverse(q => { if (q.isMesh) { m++; n += q.geometry.attributes.position.count / 3; } }); "
              "return { vis: c.g.visible, z: c.z, gz: KERN.ground(c.x, c.y), tris: Math.round(n), meshes: m, len: c.T.yf - c.T.yr, form: c.T.form }; })()"
              % (json.dumps(typ), json.dumps(o), x, Y0, HD, json.dumps(typ)))
        info[typ] = r
    bad = [t for t, r in info.items() if not r or not r['vis'] or abs(r['z'] - r['gz']) > 0.6]
    ck('every type spawns and stands on the ground', not bad, 'bad: %s' % bad + ' | ' + ', '.join('%s %d tris %d meshes' % (t, r['tris'], r['meshes']) for t, r in info.items() if r))
    ck('the bodies are real bodies (the rebuilt types have thousands of faces)', all(info[t] and info[t]['tris'] > 4000 for t in ('s51', 'trabant', 'moped', 'klein89')),
       str({t: info[t] and info[t]['tris'] for t in info}))
    ck('the first version\'s names give the new types (klein89 = Trabant, moped = S 51)',
       abs(info['klein89']['len'] - 3.555) < 0.01 and info['moped']['form'] == 'moped' and abs(info['moped']['len'] - 1.89) < 0.03, str(info['klein89']) + str(info['moped']))
    steps(0.3)
    for i, (typ, o, rear) in enumerate(TYPES):
        x = X0 + i * DX
        big = info[typ] and info[typ]['len'] > 5
        d = 9.5 if big else (4.2 if info[typ] and info[typ]['form'] == 'moped' else 6.6)
        import math
        # the vehicles face HD (south-west): the camera stands in front of them, a little to their left
        ax = HD + 0.6
        cx, cy = x + math.sin(ax) * d, Y0 + math.cos(ax) * d
        yaw = math.degrees(math.atan2(x - cx, Y0 - cy))
        E("GAME.view(%f, %f, KERN.ground(%f, %f) + %f, %f, %f, 34)" % (cx, cy, x, Y0, 1.7 if not big else 2.4, yaw, -9 if not big else -7))
        pic('1_%02d_%s' % (i, typ))
        if rear:
            ax = HD + math.pi - 0.62
            cx, cy = x + math.sin(ax) * d, Y0 + math.cos(ax) * d
            yaw = math.degrees(math.atan2(x - cx, Y0 - cy))
            E("GAME.view(%f, %f, KERN.ground(%f, %f) + 1.8, %f, -10, 34)" % (cx, cy, x, Y0, yaw))
            pic('1_%02d_%s_heck' % (i, typ))
    # the whole row
    E("GAME.view(%f, %f, KERN.ground(%f, %f) + 6, 8, -14, 60)" % (X0 + 6 * DX, Y0 - 26, X0 + 6 * DX, Y0))
    pic('2_reihe')
    # ---- a car and a moped drive a line along the roads ----
    r = J("(() => { const out = {}; for (const t of ['streife', 'moped', 'limo89']) { const c = GLT[t], L = GLAUTO.route([c.x, c.y], [222, -108]); if (!L) { out[t] = null; continue; } "
          "GLAUTO.onLine(c, L, 2, 3); const a = [c.x, c.y]; for (let i = 0; i < 60; i++) GLAUTO.drive(c, 0.1, {}); out[t] = { d: Math.hypot(c.x - a[0], c.y - a[1]), v: c.v, z: c.z - KERN.ground(c.x, c.y) }; } return out; })()")
    ck('patrol car, moped and the Volkspolizei\'s car drive their lines on the ground', all(r[t] and r[t]['d'] > 8 and abs(r[t]['z']) < 0.5 for t in r), str(r))
    # ---- the player's Simson ----
    E("GAME.view(104, -316, KERN.ground(104, -316) + 1.6, 30, -5); GLAUTO.mopedAt(108, -312, 0.5); GLSTATE.tank = 3")
    steps(0.5)
    E("CAM3.want = true; VEH.enter('gl-moped')")
    steps(1.2)
    pic('3_moped_aussen')
    E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
    steps(8, 0.05)
    m1 = J("({ id: VEH.cur && VEH.cur.id, u: VEH.cur.st.u, gear: VEH.cur.st.gear, c: GLCOCKPIT.stand(), want: GLZWEIRAD.nadelWinkel(Math.abs(VEH.cur.st.u) * 3.6) })")
    ck('the Simson rides (over 40 km/h after 8 s)', m1['id'] == 'gl-moped' and m1['u'] * 3.6 > 40, str(m1))
    ck('the speedometer reads the truth (needle within 4 km/h of the speed)', m1['c']['on'] and abs(m1['c']['kmh'] - m1['u'] * 3.6) < 4 and abs(m1['c']['winkel'] - m1['want']) < 0.2, str(m1))
    E("CAM3.want = false")
    steps(0.3, 0.05)
    pic('4_cockpit_tag')
    E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0.35, hand: false })")
    steps(1.6, 0.05)
    m2 = J("({ lean: VEH.cur.model.lean(), steer: VEH.cur.st.steer, q: VEH.cur.model.cockpit.steer.quaternion.w, ex: VEH.cur.spec.eye[0], u: VEH.cur.st.u })")
    ck('it leans into the curve, the handlebar turns, the eyes go with the lean', m2['lean'] > 0.06 and m2['steer'] > 0.02 and m2['q'] < 0.99999 and m2['ex'] > 0.05, str(m2))
    pic('5_cockpit_kurve')
    E("CAM3.want = true")
    steps(0.2, 0.05)
    pic('6_moped_kurve_aussen')
    E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
    steps(16, 0.05)
    m3 = J("({ kmh: VEH.cur.st.u * 3.6, gear: VEH.cur.st.gear, tank: GLSTATE.tank })")
    ck('about 60 km/h at full throttle in fourth gear, the tank goes down', 50 < m3['kmh'] < 74 and m3['tank'] < 3, str(m3))
    E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })")
    steps(5, 0.05)
    # ---- at night: the cockpit lit, the lamps, the beacons ----
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 23 * 60 + 10; if (window.DN && DN.active) DN.update(true)")
    lib.settle_light(pg)
    E("CAM3.want = false; VEH.auto = () => ({ thr: 0.6, brk: 0, steer: 0, hand: false })")
    steps(3, 0.05)
    n1 = J("({ c: GLCOCKPIT.stand(), head: VEH.cur.model.lamps.head[0].emissiveIntensity, dark: VAUTO.dark() })")
    ck('at night the lamp is on and the speedometer is lit', n1['dark'] and n1['head'] > 1 and n1['c']['hell'] > 0.3, str(n1))
    pic('7_cockpit_nacht')
    E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })")
    steps(4, 0.05)
    E("VEH.auto = null; VEH.exit()")
    steps(0.4)
    i = [t for t, _, _ in TYPES].index('streife')
    E("for (const t of ['streife', 'limo89']) { const c = GLT[t]; GLAUTO.park(c, %f + (t === 'streife' ? 0 : 5), %f, %f); c.blau = true; }" % (X0 + i * DX, Y0, HD))
    steps(0.4)
    import math
    ax = HD + 0.5
    cx, cy = X0 + i * DX + 2.5 + math.sin(ax) * 9, Y0 + math.cos(ax) * 9
    E("GAME.view(%f, %f, KERN.ground(%f, %f) + 1.7, %f, -7, 40)" % (cx, cy, X0 + i * DX, Y0, math.degrees(math.atan2(X0 + i * DX + 2.5 - cx, Y0 - cy))))
    pic('8_streifen_nacht')
    bl = J("({ a: GLMOD.LM.blau.emissiveIntensity, b: GLMOD.LM.blau2.emissiveIntensity, head: GLMOD.LM.head.emissiveIntensity })")
    ck('the beacons flash, the lamps glow at night', max(bl['a'], bl['b']) > 3 and bl['head'] > 1, str(bl))
    # ---- shader programs: what the vehicles added ----
    p1 = progs()
    new = [p for p in p1 if p not in p0]
    print('programs before', len(p0), 'after', len(p1), 'new:', new, flush=True)
    ck('at most three new shader programs for all the vehicles and the mode', len(new) <= 3, str(new))
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}) + str(rep['bad'])[:200])
    # ---- the end ----
    E("GRENZLAND.stop()")
    steps(0.5)
    st = J("({ on: GLSTATE.on, cars: GLAUTO.cars.length, moped: GLAUTO.moped ? GLAUTO.moped.g.visible : false, zt: !!GLAUTO.zt })")
    ck('„Beenden“ takes the vehicles away', not st['on'] and st['cars'] == 0 and not st['moped'] and not st['zt'], str(st))
    ck.errors(errs)
    ck.done()
