# feat/grenzland-neben (13.11.2026): the mode's own places and what one does there besides the story. Starts the scene
# (?szenario=grenzland) and checks: the field barn, the skittle alley, the yard, the shop on wheels and the angling spot stand (and are gone
# with the mode), one can walk into the barn and it hides, walls hold, the alley's approach and the jetty carry, the field west of the
# barn stays free (the core's moped test rides there); the shop (hours, the basket through the panel of choices, selling fish); a game of
# skittles through its API with fixed seeds; a fishing round with a forced bite; the side mission „Karpfen für Suhl“ from the message to
# the reward. Pictures in out/grenzland_neben/ (barn, den, alley, the games' views, van open and shut, jetty, the yard at night, 1989).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9015 --serve grenzland_neben      (~7 min in the chat machine)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('grenzland_neben')
OUT = lib.out('grenzland_neben')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1, f=0: E(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt}, {f})")
    def pic(name, hud=False):
        try:
            lib.shot(pg, OUT, name)
            if hud: pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    def wait(cond, secs=40):
        for _ in range(int(secs * 2)):
            steps(0.3)
            if E(cond): return True
            time.sleep(0.5)
        return False
    # the eyes at a spot (x, y) looking along the compass heading yaw (degrees)
    def look(x, y, yaw, pitch=-4, up=1.62):
        E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {up}, {yaw}, {pitch})")
        steps(0.2)
    E("setView3(false, true); 0")
    HD = math.degrees(E("GLORTE.HD"))
    UV = lambda u, v: J(f"GLORTE.UV({u}, {v})")
    BX = lambda r, f: J(f"GLORTE.BX({r}, {f})")
    # ------------------------------------------------------------------ the places stand ------------------------------------------------------------------
    st = J("({ on: GLSTATE.on, built: GLORTE.built, ms: GLORTE.ms, m: Object.keys(GLORTE.meshes).filter(k => GLORTE.meshes[k]).sort(), P: GLORTE.P, "
           "tris: Math.round(Object.values(GLORTE.meshes).reduce((n, m) => n + (m ? m.geometry.attributes.position.count / 3 : 0), 0)), "
           "cols: GLORTE.cols.length, hide: GLFAHNDUNG.extra.length, kb: GLORTE.KB.z, an: [GLORTE.AN.sA, GLORTE.AN.sB, GLORTE.AN.z, GLORTE.AN.w], "
           "scene: ['grenzland-treff', 'grenzland-wagen-auf', 'grenzland-steg'].map(n => !!GAME.scene.getObjectByName(n)) })"
           if E("!!(window.GAME && GAME.scene)") else
           "({ on: GLSTATE.on, built: GLORTE.built, ms: GLORTE.ms, m: Object.keys(GLORTE.meshes).filter(k => GLORTE.meshes[k]).sort(), P: GLORTE.P, "
           "tris: Math.round(Object.values(GLORTE.meshes).reduce((n, m) => n + (m ? m.geometry.attributes.position.count / 3 : 0), 0)), "
           "cols: GLORTE.cols.length, hide: GLFAHNDUNG.extra.length, kb: GLORTE.KB.z, an: [GLORTE.AN.sA, GLORTE.AN.sB, GLORTE.AN.z, GLORTE.AN.w], "
           "scene: ['treff', 'wagenAuf', 'steg'].map(n => !!(GLORTE.meshes[n] && GLORTE.meshes[n].parent)) })")
    print('places', json.dumps(st)[:900])
    Pp = st['P']
    need = ['alt', 'altM', 'glut', 'lampen', 'steg', 'treff', 'treffM', 'wagenAuf', 'wagenZu']
    ck('the mode builds its places (barn today and 1989, alley, yard, bulbs, van open and shut, jetty)',
       st['on'] and st['built'] and all(k in st['m'] for k in need) and all(st['scene']), str(st['m']) + ' in ' + str(st['ms']) + ' ms')
    ck('they are light: under 60 000 triangles, built in under 1.5 s', st['tris'] < 60000 and st['ms'] < 1500, f"{st['tris']} triangles, {st['ms']} ms")
    names = J("Object.fromEntries(Object.entries(GLORTE.P).map(([k, p]) => [k, KERN.place(p[0], p[1], KERN.ground(p[0], p[1]))]))")
    ck('place names: Feldscheune, Kegelbahn, Verkaufswagen, Angelstelle', names['scheune'] == 'Feldscheune' and names['kegel'] == 'Kegelbahn'
       and names['wagen'] == 'Verkaufswagen' and 'Angelstelle' in str(names['angel']) and names['treff'] == 'An der Feldscheune', str(names))
    free = J("Object.fromEntries(Object.entries(GLORTE.P).map(([k, p]) => { const q = [p[0], p[1]]; VEH.pushWalker(q, 0.32, KERN.ground(p[0], p[1])); "
             "return [k, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) * 100) / 100] }))")
    ck('every named spot is free to stand on (GLORTE.P)', all(v < 0.02 for v in free.values()), str(free))
    hid = J("({ in: GLFAHNDUNG.versteckt(...GLORTE.P.scheune, KERN.ground(...GLORTE.P.scheune)), t: GLFAHNDUNG.versteckt(...GLORTE.T, KERN.ground(...GLORTE.T)), "
            "hof: GLFAHNDUNG.versteckt(...GLORTE.P.treff, KERN.ground(...GLORTE.P.treff)), i1: GLORTE.inScheune(...GLORTE.T), i2: GLORTE.inScheune(...GLORTE.P.treff), "
            "ins: KERN.inside(...GLORTE.P.scheune, KERN.ground(...GLORTE.P.scheune) + 1) })")
    ck('the barn hides (the place\'s point lies under its roof), the yard does not', hid['in'] and hid['t'] and not hid['hof'] and hid['i1'] and not hid['i2'] and hid['ins'], str(hid))
    # walls hold, the open front lets one out
    sx, sy = Pp['scheune']
    look(sx, sy, HD + 270)
    steps(4, 0.1, 1)
    w1 = J("[P.x, P.y, GLORTE.inScheune(P.x, P.y)]")
    look(sx, sy, HD + 180)
    steps(5, 0.1, 1)
    w2 = J("[P.x, P.y, GLORTE.inScheune(P.x, P.y)]")
    look(sx, sy, HD + 90)
    steps(4, 0.1, 1)
    w3 = J("[P.x, P.y, GLORTE.inScheune(P.x, P.y)]")
    ck('the back wall and the end wall stop the walker, the open front lets him out', w1[2] and w2[2] and not w3[2], f'{w1} {w2} {w3}')
    # the alley: the approach carries, the lane is no path
    kx, ky = Pp['kegel']
    g = J(f"({{ g: KERN.ground({kx}, {ky}), z: GLORTE.KB.z, t: KERN.terrain({kx}, {ky}) }})")
    look(kx, ky, HD)
    steps(5, 0.1, 1)
    w4 = J("GLORTE.KB.F.loc(P.x, P.y)")
    ck('the approach of the alley carries; nobody walks down the lane', abs(g['g'] - g['z']) < 0.01 and g['z'] >= g['t'] - 0.01 and g['z'] - g['t'] < 0.4 and w4[1] < 0.7, f'{g} {w4}')
    # the jetty carries, beyond its end is water
    a = J("(() => { const A = GLORTE.AN, p = GLORTE.P.angel, q = A.F.xy(0, A.sB + 1.5), top = A.F.xy(0, 2); return { g: KERN.ground(p[0], p[1]), z: A.z, w: A.w, "
          "out: KERN.ground(q[0], q[1]), top: KERN.ground(top[0], top[1]), sA: A.sA, sB: A.sB } })()")
    ck('the jetty lies 0.4 m over the water at the foot of the dam, 7 m long', abs(a['g'] - a['z']) < 0.01 and 0.3 < a['z'] - a['w'] < 0.6 and a['out'] < a['z'] - 0.3
       and a['top'] > a['z'] + 2 and 8 < a['sA'] < 45, str(a))
    # the field west of the barn stays free: the core's test rides the moped there (from 108, −312 at 0.5 rad)
    cor = J("(() => { let worst = 0; for (let s = 0; s <= 95; s += 0.5) { const p = [108 + Math.sin(0.5) * s, -312 + Math.cos(0.5) * s], q = [p[0], p[1]]; "
            "VEH.pushWalker(q, 1.0, KERN.ground(p[0], p[1])); worst = Math.max(worst, Math.hypot(q[0] - p[0], q[1] - p[1])); } return worst })()")
    ck('the strip the core\'s moped test rides on is free (1 m to each side)', cor < 0.001, str(cor))
    # ---- pictures: the place from the track, the barn, the den, the alley, the yard ----
    p = UV(-7, 15.5); look(p[0], p[1], HD - 52, -3); pic('01_treff_vom_weg')
    p = BX(0.5, 9.5); look(p[0], p[1], HD - 90 + 8, -2); pic('02_scheune_front')
    p = BX(-1.2, 1.6); look(p[0], p[1], HD + 200, -8); pic('03_scheune_innen_werkbank')
    p = BX(0.8, 0.6); look(p[0], p[1], HD + 15, -10); pic('04_scheune_innen_sofa')
    p = UV(-1.5, 8.0); look(p[0], p[1], HD, -1); pic('05_kegelbahn_eingang')
    look(kx, ky, HD, -7); pic('06_kegelbahn_blick')
    p = BX(0.2, 8.6); look(p[0], p[1], HD + 250, -12); pic('07_hof_grill')
    p = UV(22, 13.5); look(p[0], p[1], HD + 215, -4); pic('08_kegelbahn_von_norden')
    # ------------------------------------------------------------------ 1989: the barn newer and emptier, no alley ------------------------------------------------------------------
    E("GLSTATE.era = '1989'; KERN.emit('grenzland:era', { era: '1989' }); 0")
    steps(0.6)
    e = J("({ alt: GLORTE.meshes.alt.visible, treff: GLORTE.meshes.treff.visible, wagen: GLORTE.meshes.wagenAuf.visible || GLORTE.meshes.wagenZu.visible, "
          "kegel: KERN.place(...GLORTE.P.kegel, 5), scheune: KERN.place(...GLORTE.P.scheune, 5), hid: GLFAHNDUNG.versteckt(...GLORTE.P.scheune, 5), "
          "g: KERN.ground(...GLORTE.P.kegel) - KERN.terrain(...GLORTE.P.kegel) })")
    ck('1989: the barn of then, no alley, no van; it still hides', e['alt'] and not e['treff'] and not e['wagen'] and e['kegel'] != 'Kegelbahn'
       and e['scheune'] == 'Feldscheune' and e['hid'] and abs(e['g']) < 0.01, str(e))
    p = BX(0.5, 9.5); look(p[0], p[1], HD - 90 + 8, -2); pic('09_scheune_1989')
    E("GLSTATE.era = 'heute'; KERN.emit('grenzland:era', { era: 'heute' }); 0")
    steps(0.6)
    ck('and today again', E("GLORTE.meshes.treff.visible && !GLORTE.meshes.alt.visible"))
    # ------------------------------------------------------------------ the shop on wheels ------------------------------------------------------------------
    wx, wy = Pp['wagen']
    WH = math.degrees(E("GLORTE.WG.hd"))
    look(wx, wy, WH - 90, 2)
    ok = wait("!!GLWAGEN.frau && GLWAGEN.frau.g.visible", 60)
    s = J("({ offen: GLORTE.offen, auf: GLORTE.meshes.wagenAuf.visible, zu: GLORTE.meshes.wagenZu.visible, m: Math.floor(CLOCK.t) % 1440, "
          "frau: GLWAGEN.frau ? [GLWAGEN.frau.z - GLORTE.WG.z, Math.hypot(GLWAGEN.frau.x - GLORTE.WG.o[0], GLWAGEN.frau.y - GLORTE.WG.o[1])] : null, "
          "act: KERN.acts().filter(a => a.id === 'gl:wagen').map(a => a.label())[0], "
          "wall: (() => { const q = [GLORTE.WG.o[0], GLORTE.WG.o[1]]; KERN.pushOut(q, 0.3); return Math.hypot(q[0] - GLORTE.WG.o[0], q[1] - GLORTE.WG.o[1]) })() })")
    ck('Friday 17:20: the van is open, the saleswoman stands behind the counter, „Einkaufen“', s['offen'] and s['auf'] and not s['zu'] and ok and s['frau']
       and 0.5 < s['frau'][0] < 0.75 and s['frau'][1] < 1.5 and s['act'] == 'Einkaufen', str(s))
    pic('10_wagen_kunde')
    p = J("GLORTE.WG.F.xy(6.5, 4.5)"); look(p[0], p[1], WH - 125, -4); pic('11_wagen_offen')
    p = J("GLORTE.WG.F.xy(-6, -5.5)"); look(p[0], p[1], WH + 48, -3); pic('12_wagen_von_hinten')
    look(wx, wy, WH - 90, 2)
    # the basket through the panel: Angelbedarf → Mais, Gastkarte → back → pay → done
    g0 = E("GLSTATE.geld")
    E("window.__kauf = null; GLWAGEN.open().then(k => { window.__kauf = k }); 0")
    time.sleep(0.2)
    t0 = J("[...document.querySelectorAll('#glwahl button')].map(b => b.textContent)")
    for i in (2, 0, 3, 3):
        E(f"GLHUD.pick({i})"); time.sleep(0.15)
    t1 = J("[...document.querySelectorAll('#glwahl button')].map(b => b.textContent)")
    pic('13_wagen_korb', True)
    E("GLHUD.pick(3)"); time.sleep(0.15)
    E("GLHUD.pick(3)"); time.sleep(0.3)
    s = J("({ geld: GLSTATE.geld, inv: GLSTATE.inv, kauf: window.__kauf, wahl: document.getElementById('glwahl').hidden })")
    ck('shopping through the panel: corn and the guest permit for 8,99 € – 9 € paid, the things in the rucksack', len(t0) == 4 and 'Angelbedarf' in t0[2]
       and any('Bezahlen: 9' in t for t in t1) and g0 - s['geld'] == 9 and s['inv'].get('mais') == 5 and s['inv'].get('angelkarte') == 1 and s['kauf'] == 'angelkarte' and s['wahl'],
       f"{t0} {t1} {s}")
    s = J("(() => { const g = GLSTATE.geld, a = GLWAGEN.kaufen({ bratwurst: 1, milchreis: 1, worcester: 1, kanister: 1 }), g1 = GLSTATE.geld; GLSTATE.geld = 1; "
          "const b = GLWAGEN.kaufen({ blinker: 1 }); GLSTATE.geld = g1; GLSTATE.add('karpfen', 2); GLSTATE.add('karpfen_gross', 1); "
          "const c = GLWAGEN.verkaufen({ karpfen_gross: 1 }); return { a, paid: g - g1, b, c, got: GLSTATE.geld - g1, inv: GLSTATE.inv } })()")
    ck('a sausage is eaten at once, Milchreis, Worcestersauce and the canister go along; no money, no goods; fish sold but the big carp',
       s['a']['ok'] and s['paid'] == 17 and 'bratwurst' not in s['inv'] and s['inv'].get('milchreis') == 1 and s['inv'].get('worcester') == 1 and s['inv'].get('kanister') == 1
       and not s['b']['ok'] and 'blinker' not in s['inv'] and s['c']['n'] == 2 and s['got'] == 12 and 'karpfen' not in s['inv'] and s['inv'].get('karpfen_gross') == 1, str(s))
    # shut at noon
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 13 * 60; 0")
    steps(1.5)
    E("window.__kauf = 'x'; GLWAGEN.open().then(k => { window.__kauf = k }); 0")
    time.sleep(0.2)
    s = J("({ offen: GLORTE.offen, auf: GLORTE.meshes.wagenAuf.visible, zu: GLORTE.meshes.wagenZu.visible, frau: !!GLWAGEN.frau && GLWAGEN.frau.g.visible, kauf: window.__kauf, "
          "act: KERN.acts().filter(a => a.id === 'gl:wagen').map(a => a.label())[0] })")
    ck('at 13:00 the van is shut: the flap down, nobody behind the counter, nothing to buy', not s['offen'] and s['zu'] and not s['auf'] and not s['frau'] and s['kauf'] is None
       and 'geschlossen' in str(s['act']), str(s))
    lib.settle_light(pg)
    p = J("GLORTE.WG.F.xy(6.5, 4.5)"); look(p[0], p[1], WH - 125, -4); pic('14_wagen_zu')
    # ------------------------------------------------------------------ the angling spot (pictures; the game below) ------------------------------------------------------------------
    AH = math.degrees(E("GLORTE.AN.hd"))
    p = J("GLORTE.AN.F.xy(0.3, 3.5)"); look(p[0], p[1], AH, -22); pic('15_steg_von_oben')
    p = J("GLORTE.AN.F.xy(-5.5, GLORTE.AN.sA - 1)"); look(p[0], p[1], AH - 62, -8); pic('16_steg_seite')
    ax, ay = Pp2 = J("GLORTE.P.angel")
    look(ax, ay, AH, -10); pic('17_steg_ende')
    MORE = True
    # ------------------------------------------------------------------ the yard at night ------------------------------------------------------------------
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 21 * 60 + 50; 0")
    p = BX(-2.5, 10.5); look(p[0], p[1], HD + 232, -2)
    lib.settle_light(pg)
    steps(2)
    n = J("({ dark: GLORTE.dark, lamp: GLORTE.meshes.lampen.material.emissiveIntensity, glut: GLORTE.meshes.glut.material.emissiveIntensity, "
          "light: KERN.lights.status().filter(b => b.id === 'grenzland:hof').map(b => b.has)[0] })")
    ck('at night the bulbs and the embers glow, one borrowed light over the yard', n['dark'] and n['lamp'] > 1 and n['glut'] > 1 and n['light'] == 1, str(n))
    pic('18_hof_nacht')
    # ------------------------------------------------------------------ the end: everything gone ------------------------------------------------------------------
    n0 = E("VEH.extra.length")
    E("GRENZLAND.stop()")
    steps(0.5)
    s = J("({ built: GLORTE.built, m: Object.keys(GLORTE.meshes).length, gl: VEH.extra.filter(x => x.gl).length, n: VEH.extra.length, hide: GLFAHNDUNG.extra.length, "
          "g: KERN.ground(...GLORTE.P.kegel) - KERN.terrain(...GLORTE.P.kegel), place: KERN.place(...GLORTE.P.scheune, 5), ins: KERN.inside(...GLORTE.P.scheune, 5), "
          "act: KERN.acts().filter(a => /^gl:/.test(a.id)).map(a => a.id), frau: !!GLWAGEN.frau, light: KERN.lights.status().filter(b => b.id === 'grenzland:hof').map(b => b.has)[0] })")
    ck('„Beenden“: the places are gone – no meshes, no walls, no names, no ground, no actions, the light back', not s['built'] and s['m'] == 0 and s['gl'] == 0 and s['n'] < n0
       and s['hide'] == 0 and abs(s['g']) < 0.01 and s['place'] != 'Feldscheune' and not s['ins'] and not s['act'] and not s['frau'] and s['light'] == 0, str(s))
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}))
    ck.errors(errs)
    ck.done()
