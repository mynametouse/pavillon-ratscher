# feat/grenzland-figuren (13.11.2026, Grenzland round 2): people who move like people. One page, free play in Ratscher: the player
# on the moped (hips on the saddle, balls of the feet on the pegs, hands at the grips; at a stop the left foot down; leaning in the
# curve), a figure riding a moped of the mode (GLFIG.reite, and the way grenzland/gl_mission.js does it: F.reitet), an officer told to
# run (≥ 3.5 m/s), a figure sitting on the bench under the Dorflinde and one on a bar stool's height, every gesture (a contact sheet),
# the look (the head turns toward the target), no page errors, the shader programs unchanged by the poses and the phone.
#   python3 viz3/test/grenzland_figuren.py 9015 [parts]     parts: moped,reiter,rennen,sitzen,gesten,blick (default: all)
#   pictures in out/grenzland_figuren/
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
PARTS = set((sys.argv[2] if len(sys.argv) > 2 else 'moped,reiter,rennen,sitzen,gesten,blick').split(','))
ck = grenzland_ci.wrap(lib.Checks('grenzland_figuren'), 'grenzland_figuren')
OUT = lib.out('grenzland_figuren')
NOTES = []
def note(t):
    NOTES.append(str(t)); print('note', t, flush=True)
# free play (as viz3/test/grenzland_auto.py): every mission done, no fade, no radio, Friday 17:20, back to the garden
FREI = ("(() => { const T = fn => { try { fn(); } catch (e) { return String(e).slice(0, 90); } return ''; }; return ["
        "T(() => GLMISSION.stop()), "
        "T(() => { const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; }), "
        "T(() => { GLSTATE.cur = ''; GLSTATE.kap1 = true; }), "
        "T(() => GLHUD.fade(false)), "
        "T(() => { if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); }), "
        "T(() => { CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 13 * 60 + 20; if (window.DN && DN.active) DN.update(true); }), "
        "T(() => GAME.go('garten')), "
        "T(() => GLSTATE.save(true))].filter(Boolean).join(' | '); })()")
BRAKE = "VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })"
X0, Y0 = 20.0, -430.0      # the fields south of the village (where grenzland_auto lines up its vehicles)
MX, MY, MH = 104.0, -316.0, 0.5   # the player's moped (as grenzland_auto)
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    do = lambda js: E("(() => { " + js + "; })()") and None
    def pic(name):
        try:
            lib.shot(pg, OUT, name)
        except Exception as e:
            print('shot failed', name, e)
    def part(name, fn):
        if name not in PARTS: return
        try:
            fn()
        except Exception as e:
            ck('the part „%s“ runs through' % name, False, (type(e).__name__ + ': ' + str(e))[:500])
    # a look at a figure: from (dist) m in front of it, turned by (side) rad round it, the eyes at height h over its ground
    def look_at(fx, fy, hd, dist=3.0, side=0.0, h=1.35, fov=38, pitch=-5):
        a = hd + side
        cx, cy = fx + math.sin(a) * dist, fy + math.cos(a) * dist
        yaw = math.degrees(math.atan2(fx - cx, fy - cy))
        do("GAME.view(%f, %f, KERN.ground(%f, %f) + %f, %f, %f, %f)" % (cx, cy, fx, fy, h, yaw, pitch, fov))
    progs = lambda: E("GAME.R.info.programs.length")

    # ---- the mode in free play, the figures loaded ----
    def start():
        do("GRENZLAND.start()")
        for _ in range(6):
            steps(0.3); time.sleep(0.3)
        fr = E(FREI)
        if fr: note('free play, not there on this branch: ' + fr)
        do("CAM3.want = false")
        steps(1)
        do("window.GT = {}; for (const id of ['jule', 'polizei1', 'gerhard', 'timo', 'erna']) GLFIG.make(id, {}).then(F => { GT[id] = F || 0; })")
        for _ in range(90):
            steps(0.2)
            n = J("Object.keys(GT).length")
            if n >= 5: break
            time.sleep(0.5)
        got = J("Object.fromEntries(Object.entries(GT).map(([k, F]) => [k, !!F]))")
        note('figures: %s' % got)
        ck('the mode starts and the figures load (GLPOSE there, each figure with a rig)',
           J("GLSTATE.on && !!window.GLPOSE && Object.values(GT).every(F => F && F.rig && F.rig.B && F.rig.B.Hips)") and len(got) == 5, str(got))
    start()

    # ---- the player on the moped ----
    def moped():
        do("GAME.view(%f, %f, KERN.ground(%f, %f) + 1.6, 30, -5); GLAUTO.mopedAt(%f, %f, %f); GLSTATE.tank = 3" % (MX - 4, MY - 4, MX - 4, MY - 4, MX, MY, MH))
        steps(0.5)
        do("CAM3.want = true; CAM3.d = 1.7; VEH.enter('gl-moped')")
        steps(1.6, 0.05)
        st = J("GLPOSE.stand()")
        note('standing on the moped: %s' % st)
        c = st.get('chk') or {}
        ck('the player is posed on the moped (after the vehicles, every frame)', st['player'] > 10 and not st['err'], str(st))
        ck('the hip joint sits over the saddle (0.80–0.97 m over the moped\'s ground)', 0.8 < c.get('hip', 0) < 0.97, str(c))
        ck('at a stop the left foot is down on the ground, the right one on its peg (balls of the feet within 8 cm)',
           c.get('down', 0) > 0.9 and max(c.get('feet', [9, 9])) < 0.08, str(c))
        ck('the hands are at the grips (wrists within 6 cm)', max(c.get('hands', [9, 9])) < 0.06, str(c))
        def side(name, k=90, pitch=-6, d=1.7):
            do("CAM3.d = %f; GAME.P.yaw = VEH.cur.st.psi * 180 / Math.PI + %f; GAME.P.pitch = %f" % (d, k, pitch))
            pic(name)
        side('1_moped_stand_links')
        side('1_moped_stand_vorn', 155, -8, 2.2)
        do("VEH.auto = () => ({ thr: 0.85, brk: 0, steer: 0, hand: false })")
        steps(4.5, 0.05)
        st = J("GLPOSE.stand()")
        c = st.get('chk') or {}
        sp = E("VEH.cur.st.u * 3.6")
        note('riding at %.1f km/h: %s' % (sp, c))
        ck('riding, both balls of the feet are on the pegs and the hands at the grips',
           sp > 8 and c.get('down', 1) < 0.1 and max(c.get('feet', [9, 9])) < 0.06 and max(c.get('hands', [9, 9])) < 0.06, str(c))
        ck('riding, the rider bends forward a little (lean 0.05–0.7 rad)', 0.05 < c.get('lean', 0) < 0.7, str(c))
        side('2_moped_fahrt_links')
        side('2_moped_fahrt_rechts', -90)
        do("VEH.auto = () => ({ thr: 0.6, brk: 0, steer: 0.4, hand: false })")
        steps(1.6, 0.05)
        r = J("({ lean: VEH.cur.model.lean(), q: AVATAR.fig.g.quaternion.toArray(), body: VEH.cur.model.body.getWorldQuaternion(new AVATAR.fig.g.quaternion.constructor()).toArray() })")
        dq = abs(sum(a * b for a, b in zip(r['q'], r['body'])))
        ck('in the curve the rider leans with the moped (the figure turned as the moped\'s leaning body)', abs(r['lean']) > 0.04 and dq > 0.999, str(r))
        side('3_moped_kurve_hinten', 180, -8, 2.4)
        side('3_moped_kurve_vorn', 20, -6, 2.4)
        do(BRAKE)
        steps(3, 0.05)
        do("VEH.auto = null; VEH.exit()")
        steps(0.5)
        ok = J("({ x: AVATAR.fig.g.rotation.x, z: AVATAR.fig.g.rotation.z, on: !!VEH.cur })")
        ck('off the moped the figure stands upright again', abs(ok['x']) < 1e-6 and abs(ok['z']) < 1e-6 and not ok['on'], str(ok))
        do("CAM3.want = false; CAM3.d = 3.3")
    part('moped', moped)

    # ---- a figure riding a moped of the mode ----
    def reiter():
        x, y, hd = X0 + 6, Y0 + 2, 1.2
        do("window.GM = GLAUTO.spawn('s51', { col: '#a23a2a' }); GLAUTO.park(GM, %f, %f, %f); GLFIG.reite(GT.jule, GM)" % (x, y, hd))
        do("window.GM2 = GLAUTO.spawn('schwalbe', { col: '#3f6f9e' }); GLAUTO.park(GM2, %f, %f, %f); const F = GT.timo; "
           "GLFIG.place(F, GM2.x, GM2.y, GM2.hd); F.reitet = true; F.f.mode = 'sit'" % (x, y - 4, hd))
        steps(0.6, 0.05)
        # as grenzland/gl_mission.js holds its riders: each frame hung behind the moped, upright (here once before each step)
        hang = ("(() => { const f = GT.timo, c = GM2; f.st = 'steht'; f.path = null; f.hd = c.hd; f.x = c.x - Math.sin(c.hd) * 0.22; "
                "f.y = c.y - Math.cos(c.hd) * 0.22; f.z = c.z + 0.84 - f.f.hipH + 0.1; f.g.position.set(f.x, f.z, -f.y); f.g.rotation.set(0, -f.hd, 0); })()")
        for _ in range(6):
            E(hang); steps(0.1, 0.05)
        a, b2 = J("GLPOSE.chk(GT.jule)"), J("GLPOSE.chk(GT.timo)")
        note('riders standing: jule (S 51) %s, timo (Schwalbe, F.reitet) %s' % (a, b2))
        ck('a figure on a moped (GLFIG.reite): hips over the saddle, feet down/on the peg, hands at the grips',
           a and 0.8 < a['hip'] < 0.97 and max(a['feet']) < 0.08 and max(a['hands']) < 0.06, str(a))
        ck('a rider of grenzland/gl_mission.js (F.reitet) on the Schwalbe is posed too', b2 and 0.8 < b2['hip'] < 1.0 and max(b2['hands']) < 0.06, str(b2))
        look_at(x, y, hd, 2.6, -math.pi / 2 - 0.15, 1.2, 40, -6)
        pic('4_reiter_s51_stand')
        look_at(x, y - 4, hd, 2.6, -math.pi / 2 + 0.2, 1.2, 40, -6)
        pic('4_reiter_schwalbe_stand')
        # off along a road: the rider stays on the moped
        r = J("(() => { const L = GLAUTO.route([GM.x, GM.y], [222, -108]); if (!L) return null; GLAUTO.onLine(GM, L, 2, 6); "
              "for (let i = 0; i < 60; i++) { GLAUTO.drive(GM, 0.05, {}); GAME.step(0.05); } const F = GT.jule; "
              "return { d: Math.hypot(F.x - GM.x, F.y - GM.y), v: GM.v, lean: GM.lean || 0, chk: GLPOSE.chk(F) }; })()")
        note('jule riding: %s' % r)
        ck('the rider goes with the moped along the road, feet on the pegs', r and r['d'] < 1.0 and r['v'] > 2 and max(r['chk']['feet']) < 0.06, str(r))
        hx, hy, hh = J("[GM.x, GM.y, GM.hd]")
        look_at(hx, hy, hh, 3.2, -math.pi / 2, 1.3, 42, -6)
        pic('4_reiter_s51_fahrt')
        do("GLFIG.reite(GT.jule, null); GT.timo.reitet = false; GT.timo.f.mode = 'stand'; GLFIG.place(GT.timo, %f, %f, 0); GLAUTO.remove(GM); GLAUTO.remove(GM2)" % (X0 + 14, Y0 + 9))
        steps(0.3)
        ck('off the moped the rider stands again', J("!GT.jule.reitet && GT.jule.f.mode === 'stand' && !GT.jule.ritt"), '')
    part('reiter', reiter)

    # ---- an officer runs ----
    def rennen():
        x, y = X0 - 30, Y0 + 14
        # (the camera near: beyond 70 m nobody is posed)
        look_at(x + 8, y, math.pi / 2, 8, -math.pi / 2, 1.4, 50, -4)
        do("GLFIG.place(GT.polizei1, %f, %f, Math.PI / 2); GLFIG.go(GT.polizei1, %f, %f, { renn: true })" % (x, y, x + 80, y))
        steps(0.5, 0.05)
        a = J("[GT.polizei1.x, GT.polizei1.y]")
        steps(2.0, 0.05)
        b2 = J("[GT.polizei1.x, GT.polizei1.y, GT.polizei1.vNow || 0, GT.polizei1.rig.st.runW || 0]")
        v = math.hypot(b2[0] - a[0], b2[1] - a[1]) / 2.0
        note('the officer runs %.2f m/s (after half a second), run weight %.2f' % (v, b2[3]))
        ck('an officer told to run covers at least 3.5 m a second', v >= 3.5, '%.2f m/s' % v)
        ck('he runs with the sprint laid over the walk (run weight > 0.9)', b2[3] > 0.9, str(b2))
        px, py = b2[0], b2[1]
        look_at(px, py, math.pi / 2, 5.5, -math.pi / 2, 1.2, 40, -4)
        pic('5_rennen_seite')
        steps(0.13, 0.05)
        px, py = J("[GT.polizei1.x, GT.polizei1.y]")
        look_at(px, py, math.pi / 2, 5.5, -0.5, 1.2, 40, -4)
        pic('5_rennen_vorn')
        do("GLFIG.stop(GT.polizei1)")
        # the old form with a high speed runs too (welt's officers before this round)
        look_at(x + 5, y - 6, math.pi / 2, 8, -math.pi / 2, 1.4, 50, -4)
        do("GLFIG.place(GT.polizei1, %f, %f, 0); GLFIG.go(GT.polizei1, [%f, %f], 4.2)" % (x, y - 6, x + 40, y - 6))
        steps(1.5, 0.05)
        ck('go(F, pts, 4.2) runs as well', J("GT.polizei1.renn && GT.polizei1.rig.st.runW > 0.5"), J("[GT.polizei1.renn, GT.polizei1.rig.st.runW]"))
        do("GLFIG.stop(GT.polizei1); GLFIG.place(GT.polizei1, %f, %f, 0)" % (X0 + 20, Y0 + 9))
        steps(0.3)
    part('rennen', rennen)

    # ---- sitting: the bench under the Dorflinde, a bar stool's height ----
    def sitzen():
        # a bench of the ring round the Dorflinde (GLFIG.platz: the nearest free seat)
        b3 = J("(() => { const l = VPROPS.LINDE, q = GLFIG.platz(l[0] + 3, l[1] + 1, 10); return q ? [q.x, q.y, q.hd, q.z] : null; })()")
        ck('GLFIG.platz finds a seat on the benches round the Dorflinde', b3 is not None, str(b3))
        bx, by, bh, bz = b3
        look_at(bx, by, bh, 3.4, 0.5, 1.3, 42, -8)
        steps(1.5)
        do("GLFIG.sitz(GT.gerhard, %f, %f, %f, %f)" % (bx, by, bh, bz))
        steps(1.0)
        r = J("(() => { const F = GT.gerhard, B = F.f.bones, g = KERN.ground(F.x, F.y), h = B.Hips.getWorldPosition(B.Hips.position.clone()).y, "
              "fl = B.LeftToeBase ? B.LeftToeBase.getWorldPosition(B.Hips.position.clone()).y : null, "
              "fr = B.RightToeBase ? B.RightToeBase.getWorldPosition(B.Hips.position.clone()).y : null; "
              "return { sitzt: F.sitzt, mode: F.f.mode, hip: h - g, fl: fl - g, fr: fr - g }; })()")
        note('Gerhard on the bench: %s' % r)
        ck('a figure sits on the bench: hips over the seat (0.5–0.66 m over the ground), the feet on the floor (balls under 8 cm)',
           r['sitzt'] and r['mode'] == 'sit' and 0.5 < r['hip'] < 0.66 and r['fl'] < 0.08 and r['fr'] < 0.08, str(r))
        look_at(bx, by, bh, 3.4, 0.5, 1.3, 42, -8)
        pic('6_sitzen_bank')
        look_at(bx, by, bh, 3.0, math.pi / 2, 1.0, 42, -4)
        pic('6_sitzen_bank_seite')
        do("GLFIG.talking(GT.gerhard, true)")
        steps(0.8)
        look_at(bx, by, bh, 2.6, 0.3, 1.2, 40, -6)
        pic('6_sitzen_bank_redet')
        do("GLFIG.talking(GT.gerhard, false); GLFIG.steh(GT.gerhard)")
        steps(0.5)
        ck('up again: standing', J("!GT.gerhard.sitzt && GT.gerhard.f.mode === 'stand'"), '')
        # a bar stool's height in the field (no stool: the pose alone)
        look_at(X0 + 2, Y0 + 9, 0.4, 2.8, math.pi / 2 + 0.3, 1.2, 40, -6)
        do("GLFIG.sitz(GT.erna, %f, %f, 0.4, 0.76)" % (X0 + 2, Y0 + 9))
        steps(0.8)
        look_at(X0 + 2, Y0 + 9, 0.4, 2.8, math.pi / 2 + 0.3, 1.2, 40, -6)
        pic('6_sitzen_hocker')
        do("GLFIG.steh(GT.erna)")
    part('sitzen', sitzen)

    # ---- every gesture, a contact sheet ----
    def gesten():
        x, y, hd = X0 + 4, Y0 + 9, 0.35
        do("GLFIG.place(GT.timo, %f, %f, %f)" % (x, y, hd))
        steps(0.6)
        look_at(x, y, hd, 2.6, 0.25, 1.3, 40, -6)
        pic('7_g_ruhe')
        p0 = progs()
        ARTS = [('zeigen', 0.9), ('nicken', 0.27), ('kopf', 0.58), ('achsel', 0.8), ('arme', 0.9), ('winken', 0.75), ('telefon', 0.9),
                ('filmen', 0.9), ('haende', 0.9), ('abwinken', 0.45)]
        shots = []
        for art, t in ARTS:
            tx, ty = x + math.sin(hd + 1.0) * 6, y + math.cos(hd + 1.0) * 6
            sec = J("GLFIG.geste(GT.timo, %s, { ziel: [%f, %f, KERN.ground(%f, %f) + 1.2] })" % (json.dumps(art), tx, ty, tx, ty))
            steps(t, 0.05 if t < 0.4 else 0.1)
            st = J("({ g: GT.timo.gest && GT.timo.gest.art, w: GT.timo.gest && GT.timo.gest.w, err: GLPOSE.stand().err, phone: !!GT.timo.handyG })")
            ck('the gesture „%s“ runs (weight up, no error)' % art, st['g'] == art and st['w'] > 0.6 and not st['err'], str(st))
            if art in ('telefon', 'filmen'):
                ck('„%s“: the phone is in the hand' % art, st['phone'], str(st))
            look_at(x, y, hd, 2.6, 0.25, 1.3, 40, -6)
            pic('7_g_' + art)
            shots.append(art)
            do("GLFIG.geste(GT.timo, null)")
            steps(0.5)
        gone = J("({ g: GT.timo.gest, phone: !!GT.timo.handyG })")
        ck('ended gestures are gone, and the phone with them', not gone['g'] and not gone['phone'], str(gone))
        look_at(x, y, hd, 2.6, 0.25, 1.3, 40, -6)
        pic('7_g_danach')
        p1 = progs()
        ck('the poses and the phone add no shader program', p1 <= p0, '%d → %d' % (p0, p1))
        # the contact sheet
        try:
            from PIL import Image, ImageDraw
            ims = [Image.open(os.path.join(OUT, '7_g_%s.jpg' % a)) for a in shots]
            w, h = ims[0].size
            cw, chh = w // 3, h
            sheet = Image.new('RGB', (cw * 5, chh * 2), (20, 20, 20))
            for i, (a, im) in enumerate(zip(shots, ims)):
                crop = im.crop(((w - cw) // 2, 0, (w + cw) // 2, h))
                sheet.paste(crop, ((i % 5) * cw, (i // 5) * chh))
                ImageDraw.Draw(sheet).text(((i % 5) * cw + 8, (i // 5) * chh + 8), a, fill=(255, 220, 90))
            sheet.save(os.path.join(OUT, '7_gesten.jpg'), quality=86)
            print('shot 7_gesten (contact sheet)', flush=True)
        except Exception as e:
            note('no contact sheet: %s' % e)
    part('gesten', gesten)

    # ---- the look ----
    def blick():
        x, y, hd = X0 + 4, Y0 + 9, 0.35
        do("GLFIG.place(GT.timo, %f, %f, %f)" % (x, y, hd))
        steps(0.5)
        a = hd - 1.0
        tx, ty = x + math.sin(a) * 4, y + math.cos(a) * 4
        tz = J("KERN.ground(%f, %f) + 1.5" % (tx, ty))
        w0 = J("GLPOSE.winkel(GT.timo, [%f, %f, %f])" % (tx, ty, tz))
        do("GLFIG.blick(GT.timo, %f, %f, %f)" % (tx, ty, tz))
        steps(1.2, 0.05)
        w1 = J("GLPOSE.winkel(GT.timo, [%f, %f, %f])" % (tx, ty, tz))
        note('look: %.2f rad off before, %.2f after' % (w0, w1))
        ck('blick turns the head toward the target (from %.2f to under 0.3 rad)' % w0, w0 > 0.7 and w1 < 0.3, '%.2f → %.2f' % (w0, w1))
        look_at(x, y, hd, 3.0, -0.4, 1.3, 40, -6)
        pic('8_blick')
        # follow the player
        do("GLFIG.blick(GT.timo, 'spieler')")
        steps(1.0, 0.05)
        pic('8_blick_spieler')
        do("GLFIG.blick(GT.timo, null)")
        steps(0.8, 0.05)
        ck('blick(F, null): looking ahead again', J("!GT.timo.look"), '')
    part('blick', blick)

    ck.errors(errs)
    ck('no error in the poses', not J("GLPOSE.stand().err"), str(J("GLPOSE.stand().err")))
    for n in NOTES[-6:]: print('note', n[:300])
    ck.done()
