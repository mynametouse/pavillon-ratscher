# feat/grenzland-licht (13.11.2026): the nights of the mode „Grenzland“ – lamps, beams and pools of the vehicles, the police's beacons, torches,
# the flare of mission 4, readable nights, rain at the Klinge, the grade of today. One page, one area (the Ratscher square): free play at
# 22:00 on the village road (the player's moped, a patrol car, a car of today and a Trabant with their lamps), a guard with a torch and the
# partner at 15 m; then mission 4 at the Klinge in the night (rain, the guards' torches) and the flare. Every picture is taken twice, with
# the module switched off (GLLICHT.an(false)) and on – side by side in out/grenzland_licht/*_vergleich.jpg. Checks: the pool brightens the
# road ahead, the beacons flash left and right in turn, the figure at 15 m is brighter, torches and rain come, the picture turns red under
# the flare, no new shader program (at most two), „Beenden“ gives every value back, no page errors.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9014 --serve grenzland_licht
import sys, os, json, time, math, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
# sections (second argument, comma separated; default all): strasse leute klinge 1989
SECT = [q for q in (sys.argv[2] if len(sys.argv) > 2 else 'strasse,leute,klinge,1989').split(',') if q]
ck = grenzland_ci.wrap(lib.Checks('grenzland_licht'), 'grenzland_licht')
OUT = lib.out('grenzland_licht')
# free play (as the lead gives it), at 22:00
FREI = ("(() => { const T = fn => { try { fn(); } catch (e) { return String(e).slice(0, 90); } return ''; }; return ["
        "T(() => GLMISSION.stop()), "
        "T(() => { const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; }), "
        "T(() => { GLSTATE.cur = ''; GLSTATE.kap1 = true; }), "
        "T(() => GLHUD.fade(false)), "
        "T(() => { if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); }), "
        "T(() => { CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 22 * 60; if (window.DN && DN.active) DN.update(true); }), "
        "T(() => GAME.go('garten')), "
        "T(() => GLSTATE.save(true))].filter(Boolean).join(' | '); })()")
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    do = lambda js: E("(() => { " + js + "; })()") and None
    def until(cond, secs=40, dt=0.25, real=0.05):
        for _ in range(int(secs / dt) + 1):
            if E(cond): return True
            steps(dt)
            if real: time.sleep(real)
        return bool(E(cond))
    # (no PIL on the runners of GitHub Actions: the pictures are kept and measured in the page, on 2D canvases)
    E("window.__img = {}; 0")
    def save(name, data):
        open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(data.split(',')[1]))
        print('shot', name, flush=True)
    def grab(name):
        """one full frame: as a file, and kept in the page (window.__img[name]) to be measured"""
        save(name, E("(n => { GAME.shot(); const s = document.querySelector('#stage canvas'), c = document.createElement('canvas'); c.width = s.width; c.height = s.height; "
                     "c.getContext('2d').drawImage(s, 0, 0); __img[n] = c; return c.toDataURL('image/jpeg', 0.9); })(" + json.dumps(name) + ")"))
        return name
    NEU = set()
    def paar(name, settle=0.3, aus="GLLICHT.an(false)", an="GLLICHT.an(true)"):
        """the same view without and with the lights of this module, and both side by side; the shader programs that appear only with
        our lights are counted"""
        do(aus); steps(settle, 0.05)
        a = grab(name + '_vorher')
        k0 = pnames()
        do(an); steps(settle, 0.05)
        c = grab(name + '_nachher')
        NEU.update(pnames() - k0)
        save(name + '_vergleich', E("((a, b) => { const A = __img[a], B = __img[b], w = A.width, h = A.height, c = document.createElement('canvas'); c.width = w * 2 + 8; c.height = h + 26; "
                                    "const x = c.getContext('2d'); x.fillStyle = '#181818'; x.fillRect(0, 0, c.width, c.height); x.drawImage(A, 0, 26); x.drawImage(B, w + 8, 26); "
                                    "x.font = '14px sans-serif'; x.fillStyle = '#e6e6e6'; x.fillText('vorher (ohne grenzland/gl_licht.js)', 10, 18); x.fillStyle = '#ffd278'; x.fillText('nachher', w + 18, 18); "
                                    "return c.toDataURL('image/jpeg', 0.86); })(" + json.dumps(a) + ", " + json.dumps(c) + ")"))
        return a, c
    def rgb(img, box):
        """mean colour of a box of a kept picture"""
        return J("((n, b) => { const c = __img[n], x0 = Math.max(0, Math.round(b[0])), y0 = Math.max(0, Math.round(b[1])), x1 = Math.min(c.width, Math.round(b[2])), y1 = Math.min(c.height, Math.round(b[3])); "
                 "if (x1 <= x0 || y1 <= y0) return [-1, -1, -1]; const d = c.getContext('2d').getImageData(x0, y0, x1 - x0, y1 - y0).data; let r = 0, g = 0, bb = 0; "
                 "for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bb += d[i + 2]; } const k = d.length / 4; return [r / k, g / k, bb / k]; })("
                 + json.dumps(img) + ", " + json.dumps(list(box)) + ")")
    def lum(img, box):
        r, g, bb = rgb(img, box)
        return -1 if r < 0 else 0.2126 * r + 0.7152 * g + 0.0722 * bb
    def size(img):
        return J("(c => [c.width, c.height])(__img[" + json.dumps(img) + "])")
    # a point of the world (x, y east/north, z up) on the picture: [px, py] or null
    SCR = ("((x, y, z) => { const v = new THREE.Vector3(x, z, -y).project(GAME.cam || window.cam); const c = document.querySelector('#stage canvas'); "
           "if (v.z > 1) return null; return [(v.x + 1) / 2 * c.width, (1 - v.y) / 2 * c.height]; })")
    pnames = lambda: set(J("GAME.R.info.programs.map(p => p.name + '|' + p.cacheKey)"))

    # ---------------------------------------------------------------- the mode at 22:00 ----------------------------------------------------------------
    try:
        E("window.__g0 = (() => { try { return { exp: Object.getOwnPropertyDescriptor(GAME.R, 'toneMappingExposure').get ? 'acc' : 'val', wx: WETTER.state().preset } } catch (e) { return { err: String(e) } } })(); 0")
        do("GRENZLAND.start()")
        for _ in range(6):
            steps(0.3); time.sleep(0.3)
        fr = E(FREI)
        if fr: print('note free play:', fr)
        steps(1)
        lib.settle_light(pg)
        st = J("({ on: GLSTATE.on, licht: !!window.GLLICHT, s: window.GLLICHT && GLLICHT.stand(), dark: VAUTO.dark(), min: Math.floor(CLOCK.t) % 1440 })")
        ck('the mode runs at 22:00, the light module is there and knows it is night', st['on'] and st['licht'] and st['dark'] and st['s']['nachtK'] > 0.8, str(st))
    except Exception as e:
        ck('the mode starts', False, str(e)[:300])

    # ---------------------------------------------------------------- the village road: the player's moped, a patrol car, cars ----------------------------------------------------------------
    R0 = None
    try:
        # a line along the road from the garden to the old school: where the moped stands, where the others stand
        R0 = J("(() => { const L = GLAUTO.route(GLDATA.ORTE.garten.pos, GLDATA.ORTE.schule.pos); if (!L) return null; window.__L = L; const c = GLAUTO.spawn('kombi', { col: '#2b3a4a' }); "
               "const at = s => { GLAUTO.onLine(c, L, s, 0); return [c.x, c.y, c.hd]; }; const o = { len: L.L, a: at(70), b: at(92), c: at(116), d: at(138) }; window.__C = c; return o; })()")
        ck('a road line from the garden into the village', R0 and R0['len'] > 150, str(R0))
        mx, my, mh = R0['a']
        if 'strasse' not in SECT: raise StopIteration
        bx, by, bh = R0['b']
        # the moped on the road, the player on it, its lamp on; the patrol car ahead, coming the other way, beacons on; a car of today
        # drives towards us; a Trabant parked
        do(f"GLAUTO.mopedAt({mx}, {my}, {mh}); GLSTATE.tank = 3")
        steps(0.3)
        do("CAM3.want = true; VEH.enter('gl-moped')")
        steps(1.5)
        do("VEH.auto = () => ({ thr: 0, brk: 0.3, steer: 0, hand: false })")
        # (the line keeps to the right-hand lane: the other lane is some 2.5 m to its left)
        do(f"window.__P = GLAUTO.spawn('streife', {{ col: '#c9cdd2', band: '#1f4fa8', band2: '#cfe23c', bar: 'balken' }}); GLAUTO.park(__P, {bx - math.cos(bh) * 2.5}, {by + math.sin(bh) * 2.5}, {bh + math.pi}); __P.blau = true")
        cx, cy, ch = R0['c']
        do(f"window.__T = GLAUTO.spawn('trabant', {{ col: '#9fc1d2' }}); GLAUTO.park(__T, {cx + math.cos(ch) * 1.2}, {cy - math.sin(ch) * 1.2}, {ch})")
        # the car of today: further on in the other lane, coming towards the moped (standing, lamps on)
        dx_, dy_, dh_ = R0['d']
        do(f"GLAUTO.park(__C, {dx_ - math.cos(dh_) * 2.5}, {dy_ + math.sin(dh_) * 2.5}, {dh_ + math.pi})")
        steps(1.2, 0.05)
        st = J("({ cur: VEH.cur && VEH.cur.id, lamp: VEH.cur && VEH.cur.model.lamps.head[0].emissiveIntensity, s: GLLICHT.stand(), lm: GLMOD.LM.head.emissiveIntensity, lm89: GLMOD.LM.head89 && GLMOD.LM.head89.emissiveIntensity })")
        ck('on the moped at night: its lamp burns, the cars\' lamps burn (today and 1989), beams and pools are dressed', st['cur'] == 'gl-moped' and st['lamp'] > 1 and st['lm'] > 1 and (st['lm89'] or 0) > 1 and st['s']['kegel'] >= 3, str(st))
        a, c = paar('1_strasse_moped')
        # the pool: the road 7 m ahead of the moped against the road 7 m ahead and 4.5 m to the side (same distance, out of the beam)
        P = J(f"(() => {{ const v = VEH.cur.st; "
              f"const S = {SCR}, at = (d, s) => {{ const x = v.x + Math.sin({mh}) * d + Math.cos({mh}) * s, y = v.y + Math.cos({mh}) * d - Math.sin({mh}) * s; return S(x, y, KERN.ground(x, y) + 0.05); }}; "
              "return { vorn: at(7, 0), seite: at(7, -4.5), x: v.x, y: v.y }; })()")
        if P['vorn'] and P['seite']:
            bx_ = lambda q: (q[0] - 14, q[1] - 8, q[0] + 14, q[1] + 8)
            l0 = (lum(a, bx_(P['vorn'])), lum(a, bx_(P['seite'])))
            l1 = (lum(c, bx_(P['vorn'])), lum(c, bx_(P['seite'])))
            ck('the moped\'s pool of light brightens the road ahead (7 m ahead against the same distance out of the beam)',
               l1[0] > l1[1] * 1.4 and l1[0] > l0[0] * 1.15, f'vorher {l0[0]:.1f}/{l0[1]:.1f}, nachher {l1[0]:.1f}/{l1[1]:.1f} at {P}')
        else:
            ck('the moped\'s pool of light is in the picture', False, str(P))
        # from the saddle
        do("CAM3.want = false"); steps(0.4, 0.05)
        paar('2_sattel')
        do("CAM3.want = true; VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })"); steps(1.0, 0.05)
        st = J("({ brems: VEH.cur.st.brakeOn, s: GLLICHT.stand() })")
        grab('3_bremslicht')
        do("VEH.auto = null; VEH.exit()"); steps(0.6)
        # the beacons: left and right in turn, never together; the glows follow
        seq = J("(() => { const out = []; for (let i = 0; i < 34; i++) { GAME.step(0.025); out.push([+GLMOD.LM.blau.emissiveIntensity.toFixed(2), +GLMOD.LM.blau2.emissiveIntensity.toFixed(2), +((GLLICHT.stand().blau) || 0)]); } return out; })()")
        lon = [q for q in seq if q[0] > 3]
        ron = [q for q in seq if q[1] > 3]
        both = [q for q in seq if q[0] > 3 and q[1] > 3]
        ck('the patrol car\'s beacons flash left and right in turn (double flash), never both at once, and the glow cards are there',
           lon and ron and not both and all(q[2] >= 1 for q in seq), str(seq[:16]))
        # a look at the police car and the cars from the roadside
        sx, sy = bx - math.sin(bh) * 9 - math.cos(bh) * 6, by - math.cos(bh) * 9 + math.sin(bh) * 6
        yaw = math.degrees(math.atan2(bx - sx, by - sy))
        do(f"GAME.view({sx}, {sy}, KERN.ground({sx}, {sy}) + 1.65, {yaw}, -3, 62)")
        # (a flash: the frame at the left lamp's flash)
        E("(() => { for (let i = 0; i < 40; i++) { const p = GLLICHT.blauPuls(GLAUTO.blink); if (p[0]) break; GAME.step(0.02); } })()")
        paar('4_streife', settle=0.0)
        # the lent blue light: short, dark between the flashes
        bl = J("(window.LIGHTS || []).filter(l => l.userData && l.userData.lent && l.color.getHex() === 0x2a5cff).map(l => ({ d: l.distance, dec: l.decay, i: +l.intensity.toFixed(1) }))")
        ck('the blue light the police borrows reaches the nearest walls only (12 m), not the whole street', all(q['d'] <= 12 for q in bl), str(bl))
    except StopIteration:
        pass
    except Exception as e:
        ck('the village road ran through without an error of the test', False, str(e)[:300])

    # ---------------------------------------------------------------- people at night: a torch, the partner at 15 m ----------------------------------------------------------------
    try:
        if 'leute' not in SECT or not R0: raise StopIteration
        mh = R0['a'][2]
        do("window.__W = null; GLFIG.make('wache1', {}).then(F => { window.__W = F; })")
        until("!!window.__W", 60, 0.25, 0.4)
        # the camera on the road, the partner 15 m ahead, the guard with his torch 9 m ahead and to the left, looking about
        vx, vy = R0['a'][0], R0['a'][1]
        f = (math.sin(mh), math.cos(mh)); r = (math.cos(mh), -math.sin(mh))
        do(f"GAME.view({vx}, {vy}, KERN.ground({vx}, {vy}) + 1.62, {math.degrees(mh)}, -2, 60)")
        px_, py_ = vx + f[0] * 15, vy + f[1] * 15
        do(f"(F => {{ if (F) GLFIG.place(F, {px_}, {py_}, {mh + math.pi}); }})(GRENZLAND.partnerOf())")
        wx, wy = vx + f[0] * 9 - r[0] * 2.5, vy + f[1] * 9 - r[1] * 2.5
        do(f"GLFIG.place(__W, {wx}, {wy}, {mh + math.pi * 0.8}); __W.lampe = true")
        steps(0.6, 0.05)
        st = J("({ s: GLLICHT.stand(), p: !!GRENZLAND.partnerOf() })")
        ck('the guard carries a torch (F.lampe): its glass, beam and the patch on the ground', st['s']['fackeln'] >= 1, str(st))
        a, c = paar('5_leute')
        box = J(f"(F => {{ if (!F) return null; const S = {SCR}, h = S(F.x, F.y, F.z + 1.7), u = S(F.x, F.y, F.z + 0.1); return h && u ? [h, u] : null; }})(GRENZLAND.partnerOf())")
        if box:
            (hx, hy), (ux, uy) = box
            hh = abs(uy - hy)
            bb = (hx - hh * 0.13, hy + hh * 0.08, hx + hh * 0.13, uy - hh * 0.05)
            l0, l1 = lum(a, bb), lum(c, bb)
            ck('a person at 15 m reads as a person: brighter than before (readable nights)', l1 > l0 * 1.3 and l1 > 14, f'{l0:.1f} → {l1:.1f} in {[round(q) for q in bb]}')
        else:
            ck('the partner is in the picture', False, str(box))
    except StopIteration:
        pass
    except Exception as e:
        ck('the people at night ran through without an error of the test', False, str(e)[:300])

    # ---------------------------------------------------------------- the Klinge: rain, the guards' torches, the flare ----------------------------------------------------------------
    try:
        if 'klinge' not in SECT: raise StopIteration
        do("if (VEH.cur) VEH.exit(); GLFAHNDUNG.clear(); GLMISSION.debug.go('klinge', 2)"); steps(0.5)
        ok = until("['w1', 'w2', 'w3'].every(k => GLMISSION.F(k)) && !!GLMISSION.C('van')", 160, 0.3, 0.5)
        lib.settle_light(pg)
        steps(3)
        KL = J("(K => ({ van: K.van, vorn: K.vorn, hd: K.hd }))(GLKAP1.szeneKlinge())")
        st = J("({ s: GLLICHT.stand(), wx: WETTER.state().preset, step: GLMISSION.debug.info().step })")
        ck('at the Klinge in the night it rains (the weather\'s own rain), the guards carry torches',
           ok and st['s']['regen'] and st['wx'] == 'regen' and st['s']['fackeln'] >= 2, str(st))
        f = (math.sin(KL['hd']), math.cos(KL['hd'])); r = (math.cos(KL['hd']), -math.sin(KL['hd']))
        PP = lambda a_, b_: (KL['van'][0] + f[0] * a_ + r[0] * b_, KL['van'][1] + f[1] * a_ + r[1] * b_)
        yawTo = lambda p, q: math.degrees(math.atan2(q[0] - p[0], q[1] - p[1]))
        p = PP(-16, -9)
        do(f"GAME.view({p[0]}, {p[1]}, KERN.ground({p[0]}, {p[1]}) + 1.62, {yawTo(p, KL['van'])}, -4, 62)"); steps(0.3)
        paar('6_klinge_regen')
        # the flare over the van
        K0 = pnames()
        E(f"KERN.emit('grenzland:flare', {{ x: {KL['van'][0]}, y: {KL['van'][1]}, z: KERN.ground({KL['van'][0]}, {KL['van'][1]}) + 1.5 }})")
        steps(1.6, 0.05)
        # (from further away: the flare stands some 60 m over the van)
        q = PP(-52, -26)
        do(f"GAME.view({q[0]}, {q[1]}, KERN.ground({q[0]}, {q[1]}) + 1.62, {yawTo(q, KL['van'])}, 22, 62)")
        grab('7_flare_steigt')
        steps(5, 0.05)
        st = J("GLLICHT.stand()")
        do(f"GAME.view({q[0]}, {q[1]}, KERN.ground({q[0]}, {q[1]}) + 1.62, {yawTo(q, KL['van'])}, 26, 62)")
        img = grab('8_flare_brennt')
        do(f"GAME.view({p[0]}, {p[1]}, KERN.ground({p[0]}, {p[1]}) + 1.62, {yawTo(p, KL['van'])}, -2, 62)")
        img2 = grab('9_flare_wald')
        w, h = size(img)
        up = rgb(img, (0, 0, w, h // 2))
        ck('the flare burns high over the van (a light of its own, smoke, sparks)', st['flare'] and st['flare']['z'] > 35 and st['flare']['k'] > 0.6 and st['flare']['puffs'] > 10, str(st['flare']))
        ck('under the flare the picture turns red (upper half: red clearly above green)', up[0] > up[1] * 1.35 and up[0] > 30, str([round(q, 1) for q in up]))
        lo = rgb(img2, (0, h // 2, w, h))
        ck('the forest and the ground are lit red', lo[0] > lo[1] * 1.15, str([round(q, 1) for q in lo]))
        NEU.update(pnames() - K0)
        steps(20, 0.1)
        do(f"GAME.view({q[0]}, {q[1]}, KERN.ground({q[0]}, {q[1]}) + 1.62, {yawTo(q, KL['van'])}, 18, 62)")
        grab('10_flare_sinkt')
        st = J("GLLICHT.stand()")
        ck('it sinks slowly on its parachute and still burns after 25 s', st['flare'] and st['flare']['k'] > 0.5 and 10 < st['flare']['z'] < 50, str(st['flare']))
    except StopIteration:
        pass
    except Exception as e:
        ck('the Klinge ran through without an error of the test', False, str(e)[:300])

    # ---------------------------------------------------------------- 1989: the bare lime, the lamps of the time ----------------------------------------------------------------
    try:
        if '1989' not in SECT: raise StopIteration
        do("if (VEH.cur) VEH.exit(); GLMISSION.stop(); GLFAHNDUNG.clear()"); steps(0.5)
        E("window.__e89 = false; GL89.enter({ uhr: 15 * 60 + 35, pos: [209, -113], yaw: 62 }).then(() => { window.__e89 = true; })")
        ok = until("!!window.__e89", 120, 0.3, 0.4)
        lib.settle_light(pg)
        st = J("({ era: GLSTATE.era, w: GL89WELT.state(), s: GLLICHT.stand() })")
        ck('1989: the flashback stands, the Dorflinde has its fine twigs', ok and st['era'] == '1989' and st['w']['zweige'], str(st)[:400])
        LI = J("(VPROPS.lindeMeshes && VPROPS.lindeMeshes[0]) ? (b => { b.geometry.computeBoundingBox(); const c = b.geometry.boundingBox.getCenter(new THREE.Vector3()); return [c.x, -c.z]; })(VPROPS.lindeMeshes[0]) : [216.5, -106.5]")
        vx, vy = LI[0] - 15, LI[1] - 17
        do(f"GAME.view({vx}, {vy}, KERN.ground({vx}, {vy}) + 1.62, {math.degrees(math.atan2(LI[0] - vx, LI[1] - vy))}, 14, 64)"); steps(0.3)
        paar('11_linde_1989', aus="GL89WELT.zweige && (GL89WELT.zweige.visible = false)", an="GL89WELT.zweige && (GL89WELT.zweige.visible = true)")
        # the evening of 1989: the lamps of the time, orange; the grade of today is not ours to touch there
        do("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 25; DN.update(true)"); lib.settle_light(pg); steps(1)
        do(f"GAME.view(214, -99, KERN.ground(214, -99) + 1.62, 98, -2, 62)"); steps(0.3)
        st = J("({ s: GLLICHT.stand(), g: [GAME.R && 0] })")
        paar('12_abend_1989')
        do("GL89.leave()")
        until("GLSTATE.era === 'heute' && !GL89.busy", 60, 0.3, 0.3)
    except StopIteration:
        pass
    except Exception as e:
        ck('1989 ran through without an error of the test', False, str(e)[:300])

    # ---------------------------------------------------------------- shader programs ----------------------------------------------------------------
    try:
        # what appeared only when our lights were switched on, and with the flare (at most two; the cards share the program of the vehicles'
        # shadow patch: unlit, one texture, transparent)
        mine = J("(() => { const out = new Set(); GAME.scene.traverse(o => { if (o.isMesh && o.userData && o.userData.gllicht) out.add(o.material.type + ':' + (o.material.transparent ? 't' : 'o')); }); return [...out]; })()")
        print('note programs now', len(pnames()), 'new with our lights:', [q.split('|')[0] for q in NEU], flush=True)
        ck('at most two new shader programs with the lights (counted between the pictures without and with them, and over the flare)',
           len(NEU) <= 2 and all(m.startswith('MeshBasicMaterial') for m in mine), str([q.split('|')[0] for q in NEU]) + ' ' + str(mine))
        ok, rep = lib.check_gl(pg, 16)
        ck('every program within 16 textures, none broken', ok, str(rep.get('bad'))[:300])
    except Exception as e:
        ck('the programs could be counted', False, str(e)[:300])

    # ---------------------------------------------------------------- „Beenden“: every value back ----------------------------------------------------------------
    try:
        do("GLMISSION.stop(); GRENZLAND.stop(true)"); steps(1)
        st = J("({ acc: !!Object.getOwnPropertyDescriptor(GAME.R, 'toneMappingExposure').get, n: (() => { let n = 0; GAME.scene.traverse(o => { if (o.userData && o.userData.gllicht) n++; }); return n; })(), wx: WETTER.state().preset, s: GLLICHT.stand(), g0: window.__g0 })")
        ck('„Beenden“: nothing of the lights is left in the scene, the exposure is the renderer\'s own again, the weather as before',
           not st['acc'] and st['n'] == 0 and st['wx'] == (st['g0'] or {}).get('wx') and not st['s']['regen'], str(st))
    except Exception as e:
        ck('„Beenden“ ran through', False, str(e)[:300])
    ck.errors(errs)
    ck.done()
