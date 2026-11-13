# feat/grenzland-auto (13.11.2026): the vehicles of the mode „Grenzland“ – bodies that look like the real types, the player's moped, the
# Trabant to drive in 1989, the cockpits. One run: every type spawns and stands on the ground (a line-up in the fields, pictures of each
# in three-quarter view from the front and of the important ones from behind), the first version's names still work, cars and a moped
# drive a line, the player's Simson rides (name and small line for the HUD, about 60 km/h, leans into the curve, the handlebar turns,
# the rider's hands, the fuel tap), the Trabant drives (about 105 km/h, the steering wheel turns, the radio's dial), the speedometers
# read the truth, odometer and control lamps live, pictures from the saddle and from the driver's seat by day and at night; the shader
# programs the vehicles add, at most 16 textures each. Every part runs on its own: one that stops does not hide the others.
#   python3 viz3/test/grenzland_auto.py 9012        (~8 min in the chat machine; pictures in out/grenzland_auto/)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
_ck = lib.Checks('grenzland_auto')
OUT = lib.out('grenzland_auto')
FAILS, NOTES = [], []
def ck(what, cond, info=''):
    if not cond: FAILS.append((what, str(info)))
    return _ck(what, cond, info)
def note(text):
    NOTES.append(str(text)); print('note', text, flush=True)
def annotate():
    """On GitHub Actions the log of a job is not public, its annotations are: what failed goes there (the runner reads the step's
    output – this test's own output goes to a file, so the lines are written to the runner's pipe of the parent process).
    (The helper of viz3/test/grenzland_polizei.py.)"""
    if not os.environ.get('GITHUB_ACTIONS'): return
    esc = lambda t: t.replace('%', '%25').replace('\r', ' ').replace('\n', '%0A')
    try:
        with open(f'/proc/{os.getppid()}/fd/1', 'w') as f:
            for i in range(0, len(FAILS), 3):
                f.write('::error title=grenzland_auto::' + esc('\n'.join(f'FAIL {w}: {inf[:700]}' for w, inf in FAILS[i:i + 3])) + '\n')
            f.write(f'::notice title=grenzland_auto::{len(_ck.ok)} checks ok, {len(FAILS)} failed' + esc('\n' + '\n'.join(n[:400] for n in NOTES[:12])) + '\n')
    except Exception as e:
        print('annotate failed', e)
import atexit; atexit.register(annotate)
def _hook(t, v, tb, _old=sys.excepthook):
    FAILS.append(('the test itself stopped', f'{t.__name__}: {str(v)[:300]}')); _old(t, v, tb)
sys.excepthook = _hook
# type, options, three-quarter view from behind as well
TYPES = [
    ('s51', {'col': '#3d6b4a'}, True),
    ('streife', {'col': '#c9cdd2', 'band': '#1f4fa8', 'band2': '#cfe23c', 'bar': 'balken'}, True),
    ('trabant', {'col': '#d9d3bd'}, True),
    ('limo89', {'col': '#f1f0e8', 'band': '#2f6b3a', 'bar': 'rundum'}, True),
    ('wartburg', {'col': '#c8b25a'}, False),
    ('trabant_kombi', {'col': '#9fc1d2'}, False),
    ('kasten', {'col': '#f1f1ee', 'text': 'Spedition Krähwinkel'}, False),
    ('barkas', {'col': '#c9c7b4'}, False),
    ('w50', {'col': '#3f6f9a'}, False),
    ('schwalbe', {'col': '#3f6f9e'}, True),
    ('kombi', {'col': '#7d8791'}, False),
    ('klein89', {'col': '#8fb08a'}, False),
    ('lkw89', {'col': '#5d6f7a', 'plane': '#4a5046'}, False),
    ('moped', {'col': '#a23a2a'}, False),
]
X0, Y0, DX, HD = 20.0, -430.0, 5.6, 3.3
# the top speed on the flat from a vehicle's own data: where the drive in the top gear meets air and rolling resistance
TOP = ("(id => { const sp = VEH.by[id].spec, c = sp.eng.curve, T = r => { if (r <= c[0][0]) return c[0][1]; for (let i = 1; i < c.length; i++) if (r <= c[i][0]) "
       "return c[i - 1][1] + (c[i][1] - c[i - 1][1]) * (r - c[i - 1][0]) / (c[i][0] - c[i - 1][0]); return 0; }, q = sp.gears[sp.gears.length - 1] * sp.final; "
       "let v = 1; for (; v < 80; v += 0.05) { const rpm = v / sp.rw * 60 / (2 * Math.PI) * q; if (rpm > sp.eng.red || T(rpm) * q * sp.eff / sp.rw < 0.6 * sp.cdA * v * v + 0.012 * sp.mass * 9.81) break; } return v * 3.6; })")
BRAKE = "VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })"
# free play (the lead, 03:35): in the merged game the start begins mission 1 (a fade, the two stand in Schleusingen, figures and vehicles
# come, the radio may play) – every mission counts as done, the fade goes, the radio is off, Friday 17:20, back to the garden.
# Each step on its own: what a branch does not have yet is told, the rest still happens
FREI = ("(() => { const T = fn => { try { fn(); } catch (e) { return String(e).slice(0, 90); } return ''; }; return ["
        "T(() => GLMISSION.stop()), "
        "T(() => { const d = GLMISSION.debug; if (d) for (const id of Object.keys(d.info().st)) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; }), "
        "T(() => { GLSTATE.cur = ''; GLSTATE.kap1 = true; }), "
        "T(() => GLHUD.fade(false)), "
        "T(() => { if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); }), "
        "T(() => { CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; if (window.DN && DN.active) DN.update(true); }), "
        "T(() => GAME.go('garten')), "
        "T(() => GLSTATE.save(true))].filter(Boolean).join(' | '); })()")
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
    def part(name, fn):
        try:
            fn()
        except Exception as e:
            ck('the part „%s“ runs through' % name, False, (type(e).__name__ + ': ' + str(e))[:500])
    def off():
        # out of whatever one sits in, standing
        try:
            if E("!!VEH.cur"):
                E(BRAKE); steps(5, 0.05); E("VEH.auto = null; VEH.exit()"); steps(0.4)
            E("VEH.auto = null")
        except Exception as e:
            print('off failed', e)
    progs = lambda: J("GAME.R.info.programs.map(p => p.name + '#' + p.id)")
    info, info0, P0 = {}, {}, []

    # ---- before: the programs of the normal game at this place; then the mode ----
    def start():
        # the baseline of the shader programs: the normal game with the player's car in view (the vehicles' paint, glass and chrome
        # are copies of its materials), then the field of the line-up
        try:
            E("(() => { const s = VEH.by.car.st; GAME.view(s.x - 5, s.y - 5, KERN.ground(s.x - 5, s.y - 5) + 1.7, 45, -8); })()")
            steps(0.3)
            E("GAME.shot()")
        except Exception as e:
            note('no look at the player\'s car before the baseline: %s' % str(e)[:200])
        E("CAM3.want = false; GAME.view(%f, %f, KERN.ground(%f, %f) + 1.6, 0, -6)" % (X0 + 20, Y0 - 9, X0 + 20, Y0 - 9))
        steps(0.3)
        pic('00_vorher')
        P0.extend(progs())
        ok = E("GRENZLAND.start()")
        for _ in range(6):
            steps(0.3); time.sleep(0.3)
        fr = E(FREI)
        if fr: note('free play, not there on this branch: ' + fr)
        steps(1)
        E("GLAUTO.mopedVeh()")
        st = J("({ on: GLSTATE.on, moped: !!GLAUTO.moped, name: GLAUTO.moped && GLAUTO.moped.name, sub: GLAUTO.moped && GLAUTO.moped.gl && GLAUTO.moped.gl.sub, "
               "cars: GLAUTO.cars.length, w: KERN.where().slice(0, 2).map(Math.round) })")
        info0.update(st)
        note('after the start: %s' % st)
        ck('the mode starts, the player\'s moped is there with its name and small line for the HUD',
           ok and st['on'] and st['moped'] and st['name'] == 'Simson S 51' and 'PS' in (st['sub'] or '') and 'Tank' in (st['sub'] or ''), str(st))
    part('start', start)

    # ---- the line-up: every type ----
    def reihe():
        E("window.GLT = {}")
        for i, (typ, o, _) in enumerate(TYPES):
            x = X0 + i * DX
            info[typ] = J("(() => { const c = GLAUTO.spawn(%s, %s); if (!c) return null; GLAUTO.park(c, %f, %f, %f); GLT[%s] = c; let n = 0, m = 0; "
                          "c.g.traverse(q => { if (q.isMesh) { m++; n += q.geometry.attributes.position.count / 3; } }); "
                          "return { vis: c.g.visible, z: c.z, gz: KERN.ground(c.x, c.y), tris: Math.round(n), meshes: m, len: c.T.yf - c.T.yr, form: c.T.form, name: c.T.name }; })()"
                          % (json.dumps(typ), json.dumps(o), x, Y0, HD, json.dumps(typ)))
        bad = [t for t, r in info.items() if not r or not r['vis'] or abs(r['z'] - r['gz']) > 0.6]
        ck('every type spawns and stands on the ground', not bad and len(info) == len(TYPES),
           'bad: %s' % bad + ' | ' + ', '.join('%s %d tris %d meshes' % (t, r['tris'], r['meshes']) for t, r in info.items() if r))
        ck('the bodies are real bodies (every type has thousands of faces)', all(r and r['tris'] > 4000 for r in info.values()), str({t: r and r['tris'] for t, r in info.items()}))
        L = lambda t: info[t]['len']
        ck('the types have their real lengths (Trabant 3.555, Wartburg 4.22, Barkas 4.52, W 50 6.535, S 51 1.89, Schwalbe 1.815 m)',
           abs(L('trabant') - 3.555) < 0.01 and abs(L('wartburg') - 4.22) < 0.01 and abs(L('barkas') - 4.52) < 0.01 and abs(L('w50') - 6.535) < 0.01
           and abs(L('s51') - 1.89) < 0.03 and abs(L('schwalbe') - 1.815) < 0.03, str({t: round(r['len'], 3) for t, r in info.items() if r}))
        ck('the first version\'s names give the new types (limo89 Wartburg, klein89 Trabant, lkw89 W 50, moped S 51)',
           info['limo89']['name'] == 'Wartburg 353' and info['klein89']['name'] == 'Trabant 601' and info['lkw89']['name'] == 'W 50' and info['moped']['name'] == 'Simson S 51',
           str({t: info[t]['name'] for t in ('limo89', 'klein89', 'lkw89', 'moped')}))
        steps(0.3)
        for i, (typ, o, rear) in enumerate(TYPES):
            x = X0 + i * DX
            big = info[typ] and info[typ]['len'] > 5
            d = 9.5 if big else (4.0 if info[typ] and info[typ]['form'] == 'moped' else 6.4)
            # the vehicles face HD (south): the camera stands in front of them, to their left; from behind: to their right
            for name, ax in (('', HD - 0.62),) + ((('_heck', HD + math.pi + 0.62),) if rear else ()):
                cx, cy = x + math.sin(ax) * d, Y0 + math.cos(ax) * d
                yaw = math.degrees(math.atan2(x - cx, Y0 - cy))
                E("GAME.view(%f, %f, KERN.ground(%f, %f) + %f, %f, %f, 34)" % (cx, cy, x, Y0, 2.4 if big else 1.7, yaw, -7 if big else -9))
                pic('1_%02d_%s%s' % (i, typ, name))
        E("GAME.view(%f, %f, KERN.ground(%f, %f) + 6, 8, -14, 60)" % (X0 + 6 * DX, Y0 - 26, X0 + 6 * DX, Y0))
        pic('2_reihe')
    part('line-up', reihe)

    # ---- cars and a moped drive a line along the roads ----
    def linien():
        r = J("(() => { const out = {}; for (const t of ['streife', 'moped', 'limo89']) { const c = GLT[t], L = GLAUTO.route([c.x, c.y], [222, -108]); if (!L) { out[t] = null; continue; } "
              "GLAUTO.onLine(c, L, 2, 3); const a = [c.x, c.y]; for (let i = 0; i < 60; i++) GLAUTO.drive(c, 0.1, {}); out[t] = { d: Math.hypot(c.x - a[0], c.y - a[1]), v: c.v, z: c.z - KERN.ground(c.x, c.y) }; } return out; })()")
        ck('patrol car, moped and the Volkspolizei\'s car drive their lines on the ground', all(r[t] and r[t]['d'] > 8 and abs(r[t]['z']) < 0.5 for t in r), str(r))
    part('lines', linien)

    # ---- the player's Simson ----
    def simson():
        E("GAME.view(104, -316, KERN.ground(104, -316) + 1.6, 30, -5); GLAUTO.mopedAt(108, -312, 0.5); GLSTATE.tank = 3")
        steps(0.5)
        E("CAM3.want = true; VEH.enter('gl-moped')")
        steps(1.2)
        pic('3_moped_aussen')
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
        steps(8, 0.05)
        m1 = J("({ id: VEH.cur && VEH.cur.id, u: VEH.cur.st.u, gear: VEH.cur.st.gear, c: GLCOCKPIT.stand(), want: GLCOCKPIT.winkel(Math.abs(VEH.cur.st.u) * 3.6, 100) })")
        note('Simson after 8 s on the field: %.1f km/h, gear %s' % (m1['u'] * 3.6, m1['gear']))
        ck('the Simson rides (over 20 km/h after 8 s on the field)', m1['id'] == 'gl-moped' and m1['u'] * 3.6 > 20, str(m1))
        ck('the speedometer reads the truth (needle within 4 km/h of the speed)', m1['c']['on'] and abs(m1['c']['kmh'] - m1['u'] * 3.6) < 4 and abs(m1['c']['winkel'] - m1['want']) < 0.25, str(m1))
        E("CAM3.want = false")
        steps(0.3, 0.05)
        pic('4_cockpit_tag')
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0.35, hand: false })")
        steps(1.6, 0.05)
        m2 = J("({ lean: VEH.cur.model.lean(), steer: VEH.cur.st.steer, q: VEH.cur.model.cockpit.steer.quaternion.w, ex: VEH.cur.spec.eye[0], u: VEH.cur.st.u, c: GLCOCKPIT.stand() })")
        ck('it leans into the curve, the handlebar turns, the eyes go with the lean', m2['lean'] > 0.04 and m2['steer'] > 0.02 and m2['q'] < 0.99999 and m2['ex'] > 0.03, str(m2))
        ck('from the saddle one sees the rider\'s hands on the grips', m2['c']['haende'], str(m2['c']))
        pic('5_cockpit_kurve')
        E("CAM3.want = true")
        steps(0.2, 0.05)
        pic('6_moped_kurve_aussen')
        top = E(TOP + "('gl-moped')")
        note('Simson top speed on the flat from its data: %.1f km/h' % top)
        ck('the Simson\'s data give about 60 km/h on the flat', 56 <= top <= 68, '%.1f km/h' % top)
        E(BRAKE)
        steps(5, 0.05)
        tk = J("({ tank: GLSTATE.tank, c: GLCOCKPIT.stand(), sub: VEH.cur.gl.sub })")
        ck('the tank went down, the odometer counted, the small line tells the tank', tk['tank'] < 3 and tk['c']['km'] > 27418.31 and 'Tank ' in tk['sub'] and ' l' in tk['sub'], str(tk))
        E("GLSTATE.tank = 0.5")
        steps(0.2, 0.05)
        tk = J("({ tap: VEH.cur.model.cockpit.tap.rotation.x, sub: VEH.cur.gl.sub })")
        ck('under 0.8 l the fuel tap stands on reserve', tk['tap'] < -1 and 'Reserve' in tk['sub'], str(tk))
        E("GLSTATE.tank = 3")
    part('the Simson', simson)
    off()

    # ---- the Trabant of 1989 ----
    def trabant():
        E("GLAUTO.mopedAt(96, -318, 0.5); GLAUTO.trabiAt(108, -312, 0.5)")
        steps(0.5)
        E("CAM3.want = true; VEH.enter('gl-trabi')")
        steps(1.2)
        t0 = J("({ id: VEH.cur && VEH.cur.id, name: VEH.cur && VEH.cur.name, sub: VEH.cur && VEH.cur.gl && VEH.cur.gl.sub, z: VEH.cur ? VEH.cur.st.z - KERN.ground(VEH.cur.st.x, VEH.cur.st.y) : 9 })")
        ck('the Trabant stands there, one gets in, its name and small line for the HUD', t0['id'] == 'gl-trabi' and t0['name'] == 'Trabant 601' and 'PS' in (t0['sub'] or '') and abs(t0['z']) < 0.4, str(t0))
        pic('9a_trabi_aussen')
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
        steps(7, 0.05)
        t1 = J("({ u: VEH.cur.st.u, gear: VEH.cur.st.gear, c: GLCOCKPIT.stand(), want: GLCOCKPIT.winkel(Math.abs(VEH.cur.st.u) * 3.6, 120) })")
        note('Trabant after 7 s on the field: %.1f km/h, gear %s' % (t1['u'] * 3.6, t1['gear']))
        ck('the Trabant drives (over 15 km/h after 7 s on the field), its speedometer reads the truth',
           t1['u'] * 3.6 > 15 and t1['c']['on'] and abs(t1['c']['kmh'] - t1['u'] * 3.6) < 5 and abs(t1['c']['winkel'] - t1['want']) < 0.25, str(t1))
        ck('its odometer counts', t1['c']['km'] > 86302.62, str(t1['c']))
        top = E(TOP + "('gl-trabi')")
        note('Trabant top speed on the flat from its data: %.1f km/h' % top)
        ck('the Trabant\'s data give about 105 km/h on the flat', 96 <= top <= 114, '%.1f km/h' % top)
        E("CAM3.want = false; if (window.GLRADIO && GLRADIO.stations && GLRADIO.stations().length) GLRADIO.tune(GLRADIO.stations()[0].id)")
        steps(0.4, 0.05)
        pic('9b_trabi_cockpit_tag')
        E("VEH.auto = () => ({ thr: 0.4, brk: 0, steer: 0.5, hand: false })")
        steps(1.0, 0.05)
        t2 = J("({ rad: VEH.cur.model.cockpit.wheel.rotation.z, steer: VEH.cur.st.steer, radio: GLCOCKPIT.stand().radio, cur: window.GLRADIO && GLRADIO.cur ? GLRADIO.cur() : null, "
               "haende: GLCOCKPIT.stand().haende, hz: VEH.cur.model.cockpit.hands.rotation.z })")
        ck('the steering wheel turns with the steering, the hands go a little way with it', t2['steer'] > 0.02 and t2['rad'] < -0.2 and t2['haende'] and -0.61 < t2['hz'] < -0.1, str(t2))
        if not t2['cur']: note('the radio plays no station after tune() – the dial shows none')
        ck('the radio\'s dial follows the radio (the station that plays)', t2['radio'] == t2['cur'], str(t2))
        pic('9c_trabi_cockpit_kurve')
    part('the Trabant', trabant)

    # ---- at night: the cockpits lit, the lamps, the beacons ----
    def nacht():
        if not E("!!VEH.cur"):
            E("GLAUTO.trabiAt(108, -312, 0.5)"); steps(0.3); E("VEH.enter('gl-trabi')"); steps(1)
        E(BRAKE)
        steps(4, 0.05)
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 23 * 60 + 10; if (window.DN && DN.active) DN.update(true)")
        lib.settle_light(pg)
        E("CAM3.want = false; VEH.auto = () => ({ thr: 0.5, brk: 0, steer: 0, hand: false })")
        steps(2.5, 0.05)
        n0 = J("({ id: VEH.cur.id, c: GLCOCKPIT.stand(), head: VEH.cur.model.lamps.head[0].emissiveIntensity, dark: VAUTO.dark() })")
        ck('at night the Trabant\'s lamps are on and its instruments lit', n0['dark'] and n0['head'] > 1 and n0['c']['hell'] > 0.3, str(n0))
        pic('9d_trabi_cockpit_nacht')
        off()
        E("GLSTATE.tank = 3; VEH.enter('gl-moped'); VEH.auto = () => ({ thr: 0.6, brk: 0, steer: 0, hand: false })")
        steps(3, 0.05)
        n1 = J("({ id: VEH.cur && VEH.cur.id, c: GLCOCKPIT.stand(), head: VEH.cur.model.lamps.head[0].emissiveIntensity })")
        ck('at night the Simson\'s lamp is on and the speedometer is lit', n1['id'] == 'gl-moped' and n1['head'] > 1 and n1['c']['hell'] > 0.3, str(n1))
        pic('7_cockpit_nacht')
        off()
        i = [t for t, _, _ in TYPES].index('streife')
        E("for (const t of ['streife', 'limo89']) { const c = GLT[t]; GLAUTO.park(c, %f + (t === 'streife' ? 0 : 5.6), %f, %f); c.blau = true; }" % (X0 + i * DX, Y0, HD))
        steps(0.4)
        ax = HD - 0.5
        cx, cy = X0 + i * DX + 2.8 + math.sin(ax) * 9.5, Y0 + math.cos(ax) * 9.5
        E("CAM3.want = false; GAME.view(%f, %f, KERN.ground(%f, %f) + 1.7, %f, -7, 40)" % (cx, cy, X0 + i * DX, Y0, math.degrees(math.atan2(X0 + i * DX + 2.8 - cx, Y0 - cy))))
        pic('8_streifen_nacht')
        bl = J("({ a: GLMOD.LM.blau.emissiveIntensity, b: GLMOD.LM.blau2.emissiveIntensity, head: GLMOD.LM.head.emissiveIntensity })")
        ck('the beacons flash, the lamps glow at night', max(bl['a'], bl['b']) > 3 and bl['head'] > 1, str(bl))
    part('the night', nacht)
    off()

    # ---- shader programs: what the vehicles added ----
    def programme():
        p1 = progs()
        mine = J("(() => { const ids = new Set(), add = g => g && g.traverse(o => { if (!o.isMesh) return; const pr = GAME.R.properties.get(o.material), cp = pr && pr.currentProgram; "
                 "if (cp) ids.add(cp.name + '#' + cp.id); }); for (const c of GLAUTO.cars) add(c.g); add(GLAUTO.moped && GLAUTO.moped.g); add(GLAUTO.trabi && GLAUTO.trabi.g); return [...ids]; })()")
        new = [p for p in mine if p not in P0]
        note('programs before %d, after the mode %d; the vehicles use %d: %s; of them new: %s' % (len(P0), len(p1), len(mine), mine, new))
        # ours alone: the unlit dials and the shadow patch; the rest are copies of materials of the normal game (the car's paint, glass,
        # chrome and plate, the traffic's lamps and vertex colours) – they count here only where the baseline had not drawn them yet
        ck('the vehicles add few shader programs (the unlit dials, the shadow patch; copies of the game\'s materials share theirs)', len(new) <= 6,
           '%d used, new: %s' % (len(mine), new))
        okgl, rep = lib.check_gl(pg)
        ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}) + str(rep['bad'])[:200])
    part('programs', programme)

    # ---- the end ----
    def ende():
        E("GRENZLAND.stop()")
        steps(0.5)
        st = J("({ on: GLSTATE.on, cars: GLAUTO.cars.length, mine: Object.values(window.GLT || {}).filter(c => c && (GLAUTO.cars.includes(c) || c.g.visible)).length, "
               "moped: GLAUTO.moped ? GLAUTO.moped.g.visible : false, trabi: GLAUTO.trabi ? GLAUTO.trabi.g.visible : false, zt: !!GLAUTO.zt })")
        ck('„Beenden“ takes the vehicles away', not st['on'] and st['mine'] == 0 and not st['moped'] and not st['trabi'] and not st['zt'], str(st))
    part('the end', ende)
    bad = [e for e in errs if e.startswith('PAGEERR')]
    if bad: FAILS.append(('page errors', ' | '.join(e[:200] for e in bad[:4])))
    _ck.errors(errs)
    _ck.done()
