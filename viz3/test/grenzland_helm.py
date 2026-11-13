# feat/grenzland-helm (13.11.2026, Falko 20:44 „Die Helme sehen leider völlig unrealistisch aus“): the helmets of grenzland/gl_helm.js on
# every head that wears one – Jule and Timo (cast: hut 'helm'), Basti, Falko and Sarah as figures, the special forces' tactical helmet –
# standing (front, side, three-quarter, close, at talk distance; by day and at night), a figure on a moped, the player riding with his
# helmet. Checks: the rim's lowest front point over the eyes, nothing of the helmet before the eyes and brows (the helmet's vertices in a
# box round them), triangles and draw calls per helmet within the budget, no new shader program, the helmets gone after „Beenden“.
#   python3 viz3/test/grenzland_helm.py 9015 [parts]     parts: stehen,nacht,reiten (default: all)
#   pictures in out/grenzland_helm/
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
PARTS = set((sys.argv[2] if len(sys.argv) > 2 else 'stehen,nacht,reiten').split(','))
ck = grenzland_ci.wrap(lib.Checks('grenzland_helm'), 'grenzland_helm')
OUT = lib.out('grenzland_helm')
NOTES = []
def note(t):
    NOTES.append(str(t)); print('note', t, flush=True)
FREI = ("(() => { const T = fn => { try { fn(); } catch (e) { return String(e).slice(0, 90); } return ''; }; return ["
        "T(() => GLMISSION.stop()), "
        "T(() => { const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; }), "
        "T(() => { GLSTATE.cur = ''; GLSTATE.kap1 = true; }), "
        "T(() => GLHUD.fade(false)), "
        "T(() => { if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); }), "
        "T(() => { CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60 + 10; if (window.DN && DN.active) DN.update(true); }), "
        "T(() => GAME.go('garten')), "
        "T(() => GLSTATE.save(true))].filter(Boolean).join(' | '); })()")
X0, Y0 = 20.0, -430.0      # the fields south of the village
MX, MY, MH = 104.0, -316.0, 0.5   # the player's moped (as grenzland_auto)
# who wears what (the suggestion for gl_data.js, see docs/features/grenzland-figuren.md): id, helmet kind
WHO = [('jule', 'helmblau'), ('timo', 'helmweiss'), ('basti', 'helmjetschwarz'), ('falko', 'helmrot'), ('sarah', 'helmcreme'),
       ('polizei1', 'helmschwarz')]
# the helmet's facts in the page: triangles, meshes, the rim's lowest point in front against the eyes, vertices before the eyes
INFO = r"""(F) => {
  const g = F && F.hat; if (!g || !g.userData.helm) return null;
  const V3 = g.position.constructor, h = g.userData.helm, f = h.fit;
  g.updateWorldMatrix(true, true);
  const w = (x, y, z) => g.localToWorld(new V3(x, z, -y));
  let low = 1e9, lowK = 1e9;
  for (const p of f.rim) if (Math.abs(p[0]) < 0.045 && p[1] > 0) { low = Math.min(low, w(p[0], p[1], p[2]).y); lowK = Math.min(lowK, p[2]); }
  // the eyes: the eyeballs' bones if the rig has them (the higher of the two), else the helmet's own guess (GLHELM.fit)
  let eyeB = null, eyeBK = null;
  F.f.model.traverse(o => { if (o.isBone && /[LR]_?Eye$/i.test(o.name)) { const p = o.getWorldPosition(new V3()); eyeB = eyeB === null ? p.y : Math.max(eyeB, p.y);
    const q = g.worldToLocal(p.clone()); eyeBK = eyeBK === null ? q.y : Math.max(eyeBK, q.y); } });
  const eyeF = w(0, f.ny - 0.025, f.eye).y;
  // vertices of the helmet (not the strap) in the box before the eyes and brows
  let inFace = 0, tris = 0;
  for (const m of g.children) {
    const P = m.geometry.attributes.position; tris += P.count / 3;
    const skip = m.userData.helmPart === 'matt' ? h.strap : [0, 0];
    for (let i = 0; i < P.count; i++) {
      if (i >= skip[0] && i < skip[1]) continue;
      const x = P.getX(i), y = -P.getZ(i), z = P.getY(i);
      if (Math.abs(x) < 0.055 && y > f.ny - 0.06 && z > f.eye - 0.02 && z < f.brow + 0.006) inFace++;
    }
  }
  return { art: h.art, tris, meshes: g.children.length, low: +low.toFixed(4), lowK: +lowK.toFixed(4), eyeK: +f.eye.toFixed(4),
    eyeBone: eyeB === null ? null : +eyeB.toFixed(4), eyeBoneK: eyeBK === null ? null : +eyeBK.toFixed(4), eyeFit: +eyeF.toFixed(4), inFace, top: +w(0, 0, 0).y.toFixed(3),
    nose: f.nz, rx: f.rx, rz: f.rz };
}"""
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
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
    def look_at(fx, fy, hd, dist=3.0, side=0.0, h=1.35, fov=38, pitch=-5):
        a = hd + side
        cx, cy = fx + math.sin(a) * dist, fy + math.cos(a) * dist
        yaw = math.degrees(math.atan2(fx - cx, fy - cy))
        do("GAME.view(%f, %f, KERN.ground(%f, %f) + %f, %f, %f, %f)" % (cx, cy, fx, fy, h, yaw, pitch, fov))
    progs = lambda: E("GAME.R.info.programs.length")

    do("GRENZLAND.start()")
    for _ in range(6):
        steps(0.3); time.sleep(0.3)
    fr = E(FREI)
    if fr: note('free play, not there on this branch: ' + fr)
    do("CAM3.want = false")
    steps(1)
    E("window.HINFO = " + INFO)
    # the figures without anything on the head first (the shader programs counted with them), then the helmets
    ids = [w[0] for w in WHO]
    do("window.GT = {}; for (const id of %s) GLFIG.make(id, { hut: null }).then(F => { GT[id] = F || 0; })" % json.dumps(ids))
    for _ in range(120):
        steps(0.2)
        if J("Object.keys(GT).length") >= len(ids): break
        time.sleep(0.5)
    got = J("Object.fromEntries(Object.entries(GT).map(([k, F]) => [k, !!F]))")
    note('figures: %s' % got)
    ck('the figures load', all(got.get(i) for i in ids), str(got))
    POS = {}
    for k, (id, kind) in enumerate(WHO):
        x, y = X0 + k * 3.0, Y0
        POS[id] = (x, y, 0.0)
        do("const F = GT.%s; if (F) { F.sees = false; GLFIG.place(F, %f, %f, 0); F.g.visible = true; }" % (id, x, y))
    # the mode's vehicles in the picture too (a moped and a car of grenzland/gl_modelle.js: their paint and glass are the helmets')
    do("window.GK = GLAUTO.spawn('kombi', { col: '#2b3a4a' }); GLAUTO.park(GK, %f, %f, 0.3); window.GS = GLAUTO.spawn('s51', { col: '#a23a2a' }); GLAUTO.park(GS, %f, %f, 1.2)" % (X0 + 4.5, Y0 + 6, X0 + 10.5, Y0 + 5))
    steps(1.0)
    look_at(X0 + 7.5, Y0, 0, 9, 0, 1.5, 50, -4)
    steps(0.3)
    pic('0_reihe_ohne')
    p0 = progs()
    E("window.PK0 = GAME.R.info.programs.map(p => p.cacheKey)")
    note('shader programs with the figures and the mode\'s vehicles, before the helmets: %d' % p0)
    for id, kind in WHO:
        do("const F = GT.%s; if (F) F.hat = GLFIG.hatOn(F.f.model, null, '%s')" % (id, kind))
    steps(0.3)
    look_at(X0 + 7.5, Y0, 0, 9, 0, 1.5, 50, -4)
    steps(0.3)
    pic('0_reihe')
    for id, kind in WHO:
        x, y, hd = POS[id]
        look_at(x, y, hd, 1.4, 0.7, 1.55, 30, -3)
        steps(0.1)
    p1 = progs()
    if p1 > p0:
        note('new programs: %s' % J("GAME.R.info.programs.map(p => p.cacheKey).filter(k => !PK0.includes(k)).map(k => k.slice(0, 260))"))
    ck('the helmets add no shader program (the paint: the mode\'s vehicles\' paint; the rest the traffic\'s material)', p1 <= p0, '%d → %d' % (p0, p1))

    # ---- the facts per head ----
    INF = {}
    for id, kind in WHO:
        r = J("HINFO(GT.%s)" % id)
        INF[id] = r
        note('%s (%s): %s' % (id, kind, r))
        if not r:
            ck('%s wears a helmet' % id, False, 'none'); continue
        eye = r['eyeBone'] if r['eyeBone'] is not None else r['eyeFit']
        eyeK = r['eyeBoneK'] if r['eyeBoneK'] is not None else r['eyeK']
        # (in the head's own frame ≥ 1.5 cm; in the world, where the idle clip tilts the head a little, over the eyes at all)
        ck('%s: the rim\'s lowest point in front is over the eyes (≥ 1.5 cm in the head\'s frame)' % id, r['low'] > eye and r['lowK'] > eyeK + 0.015,
           'rim %.3f, eye %.3f (bone %s, fit %.3f)' % (r['low'], eye, r['eyeBone'], r['eyeFit']))
        ck('%s: nothing of the helmet before the eyes and brows' % id, r['inFace'] == 0, str(r['inFace']))
        ck('%s: ≤ 3000 triangles in ≤ 3 meshes' % id, r['tris'] <= 3000 and r['meshes'] <= 3, '%d tris, %d meshes' % (r['tris'], r['meshes']))

    def stehen():
        for id, kind in WHO:
            x, y, hd = POS[id]
            # (the figures turn to whoever comes near: held facing ahead for the pictures)
            do("const F = GT.%s; F.sees = false; F.look = null; GLFIG.place(F, %f, %f, %f)" % (id, x, y, hd))
            steps(0.3)
            r = INF.get(id) or {}
            hh = (r.get('top') or 1.7) - J("KERN.ground(%f, %f)" % (x, y))
            look_at(x, y, hd, 1.15, 0.0, hh - 0.1, 30, -2)
            pic('1_%s_vorn' % id)
            look_at(x, y, hd, 1.15, math.pi / 2, hh - 0.1, 30, -2)
            pic('2_%s_seite' % id)
            look_at(x, y, hd, 1.2, -0.75, hh - 0.08, 30, -4)
            pic('3_%s_dreiviertel' % id)
            look_at(x, y, hd, 0.5, 0.35, hh - 0.1, 30, -3)
            pic('4_%s_nah' % id)
            look_at(x, y, hd, 1.15, math.pi, hh - 0.06, 30, -6)
            pic('5_%s_hinten' % id)
        # at talk distance: two and two, as a cutscene would frame them
        do("GLFIG.place(GT.timo, %f, %f, %f); GLFIG.place(GT.jule, %f, %f, %f)" % (X0 + 40, Y0, math.pi / 2, X0 + 41.3, Y0, -math.pi / 2))
        steps(0.5)
        look_at(X0 + 40.65, Y0, 0, 2.8, 0.0, 1.55, 38, -3)
        pic('6_gespraech_timo_jule')
        do("GLFIG.place(GT.timo, %f, %f, 0); GLFIG.place(GT.jule, %f, %f, 0)" % (POS['timo'][0], POS['timo'][1], POS['jule'][0], POS['jule'][1]))
        steps(0.3)
    part('stehen', stehen)

    def nacht():
        do("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 22 * 60 + 30")
        lib.settle_light(pg)
        steps(0.5)
        for id in ('jule', 'timo', 'falko', 'polizei1'):
            x, y, hd = POS[id]
            hh = (INF.get(id) or {}).get('top') or 1.7
            hh -= J("KERN.ground(%f, %f)" % (x, y))
            look_at(x, y, hd, 1.3, -0.6, hh - 0.08, 32, -4)
            pic('7_nacht_%s' % id)
        do("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60 + 10")
        lib.settle_light(pg)
    part('nacht', nacht)

    def reiten():
        # Jule on an S 51 (GLFIG.reite), her helmet on
        x, y, hd = X0 + 6, Y0 + 8, 1.2
        do("window.GM = GLAUTO.spawn('s51', { col: '#a23a2a' }); GLAUTO.park(GM, %f, %f, %f); GLFIG.reite(GT.jule, GM)" % (x, y, hd))
        steps(0.8, 0.05)
        look_at(x, y, hd, 2.2, -math.pi / 2 - 0.2, 1.35, 34, -5)
        pic('8_jule_reitet_seite')
        look_at(x, y, hd, 1.6, -0.5, 1.45, 30, -6)
        pic('8_jule_reitet_vorn')
        do("GLFIG.reite(GT.jule, null)")
        steps(0.3)
        # the player (Falko) on his moped: the helmet from the hook in the carport, on the head while riding (grenzland/gl_fahndung.js)
        do("GAME.view(%f, %f, KERN.ground(%f, %f) + 1.6, 30, -5); GLAUTO.mopedAt(%f, %f, %f); GLSTATE.tank = 3; GLSTATE.add('helm')" % (MX - 4, MY - 4, MX - 4, MY - 4, MX, MY, MH))
        steps(0.5)
        do("CAM3.want = true; CAM3.d = 1.7; VEH.enter('gl-moped')")
        steps(1.6, 0.05)
        pl = J("(() => { let g = null; AVATAR.fig.model.traverse(o => { if (/^grenzland helm/.test(o.name || '')) g = o; }); return g ? HINFO({ hat: g, f: { model: AVATAR.fig.model } }) : null; })()")
        note('the player riding: %s' % pl)
        ck('the player wears his helmet on the moped (a jet helmet of gl_helm.js)', bool(pl) and pl['art'] == 'jet', str(pl))
        if pl:
            # (riding, the head leans: measured in the head's own frame)
            eye = pl['eyeBoneK'] if pl['eyeBoneK'] is not None else pl['eyeK']
            ck('the player: the rim in front over the eyes (in the head\'s frame, ≥ 1.5 cm)', pl['lowK'] > eye + 0.015, 'rim %.3f, eye %.3f' % (pl['lowK'], eye))
        def side(name, k=90, pitch=-6, d=1.7):
            do("CAM3.d = %f; GAME.P.yaw = VEH.cur.st.psi * 180 / Math.PI + %f; GAME.P.pitch = %f" % (d, k, pitch))
            pic(name)
        side('9_spieler_moped_seite', 90, -6, 1.6)
        side('9_spieler_moped_vorn', 160, -8, 1.8)
        side('9_spieler_moped_hinten', -10, -10, 1.8)
        do("VEH.auto = () => ({ thr: 0.8, brk: 0, steer: 0, hand: false })")
        steps(3, 0.05)
        side('9_spieler_moped_fahrt', 60, -6, 1.8)
        do("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })")
        steps(2, 0.05)
        do("VEH.auto = null; VEH.exit()")
        steps(0.6)
        off = J("(() => { let n = 0; AVATAR.fig.model.traverse(o => { if (/^grenzland helm/.test(o.name || '')) n++; }); return n; })()")
        ck('off the moped the helmet is off the player\'s head', off == 0, str(off))
        # Falko's head in Falko's photo of 20:44 (dark face, a grey band): the balaclava of grenzland/gl_fahndung.js – a look at it
        do("GLSTATE.add('haube'); GLFAHNDUNG.haubeAn(true)")
        steps(0.5)
        pp = J("[GAME.P.x, GAME.P.y, GAME.P.yaw]")
        hd = math.radians(pp[2])
        look_at(pp[0], pp[1], hd, 1.2, -0.5, 1.68, 30, -3)
        pic('9_spieler_sturmhaube')
        do("GLFAHNDUNG.haubeAn(false)")
        steps(0.3)
        do("CAM3.want = false")
    part('reiten', reiten)

    # ---- „Beenden“: every helmet gone from the scene ----
    E("GRENZLAND.stop()")
    steps(1.0)
    left = J("(() => { let n = 0; GAME.scene ? GAME.scene.traverse(o => { if (/^grenzland helm/.test(o.name || '')) n++; }) : 0; return n; })()")
    if left is None or left == 0:
        sc = J("(() => { let n = 0, s = null; (window.AVATAR && AVATAR.fig && AVATAR.fig.g) && (s = AVATAR.fig.g); while (s && s.parent) s = s.parent; if (s) s.traverse(o => { if (/^grenzland helm/.test(o.name || '')) n++; }); return n; })()")
        left = sc
    ck('after „Beenden“ no helmet is left in the scene', left == 0, str(left))
    ck.errors(errs)
    for n in NOTES[-8:]: print('note', n[:300])
    ck.done()
