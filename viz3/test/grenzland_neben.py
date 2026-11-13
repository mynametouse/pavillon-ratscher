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
    w1 = J("[...KERN.where(), GLORTE.inScheune(...KERN.where())]")
    look(sx, sy, HD + 180)
    steps(5, 0.1, 1)
    w2 = J("[...KERN.where(), GLORTE.inScheune(...KERN.where())]")
    look(sx, sy, HD + 90)
    steps(4, 0.1, 1)
    w3 = J("[...KERN.where(), GLORTE.inScheune(...KERN.where())]")
    ck('the back wall and the end wall stop the walker, the open front lets him out', w1[2] and w2[2] and not w3[2], f'{w1} {w2} {w3}')
    # the alley: the approach carries, the lane is no path
    kx, ky = Pp['kegel']
    g = J(f"({{ g: KERN.ground({kx}, {ky}), z: GLORTE.KB.z, t: KERN.terrain({kx}, {ky}) }})")
    look(kx, ky, HD)
    steps(5, 0.1, 1)
    w4 = J("GLORTE.KB.F.loc(...KERN.where())")
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
    # ------------------------------------------------------------------ Kegeln ------------------------------------------------------------------
    def until(cond, secs=60, dt=0.1):
        for _ in range(int(secs / 1.0)):
            E(f"for (let i = 0; i < {int(1.0 / dt)} && !({cond}); i++) GAME.step({dt})")
            if E(cond): return True
        return False
    look(kx, ky, HD, -6)
    w0 = J("KERN.where()")
    AUTO = "[{ aim: 0.09, kraft: 0.85 }, { aim: -0.09, kraft: 0.85 }, { aim: 0.6, dir: 0.03 }, { aim: 0.08, drall: 0.5, kraft: 0.6 }, { aim: 0 }]"
    exp = J(f"{AUTO}.map((v, i) => {{ const r = GLNLOGIK.wurf(v.aim || 0, v.dir || 0, v.drall || 0, v.kraft ?? 0.8, null, 11 + i * 17); return [r.fallen.length, r.rinne] }})")
    E(f"window.__kg = null; GLSTATE.geld = 100; GLKEGELN.spielen({{ seed: 11, auto: {AUTO} }}).then(r => {{ window.__kg = r }}); 0")
    steps(0.4)
    s = J("({ st: GLKEGELN.stand(), seat: PLAY.seated(), panel: GLSPIEL.shown(), geld: GLSTATE.geld, pins: GLKEGELN.meshes.pins.length })")
    ck('Kegeln: 2 € into the till, one stands at the foul line, the panel is there, the first ball rolls', s['st']['on'] and s['st']['ph'] == 'rollt' and s['seat'] and s['panel']
       and s['geld'] == 98 and s['pins'] == 9, str(s))
    until("GLKEGELN.ballS > 12.5", 10, 0.05)
    pic('20_kegeln_kugel_rollt', True)
    until("GLKEGELN.ph === 'schau'", 10, 0.05)
    steps(0.3)
    pic('21_kegeln_gefallen', True)
    ok = until("!!window.__kg", 90)
    r = J("window.__kg")
    st = J("({ best: GLSTATE.stats.kegel, seat: PLAY.seated(), panel: GLSPIEL.shown(), w: KERN.where(), on: GLKEGELN.on, up: GLKEGELN.meshes.pins.every(m => Math.abs(m.quaternion.w) > 0.999) })")
    ck('five throws in die Vollen: the wood is what the rules say for these throws, a Pudel among them, the sum is the best game on the slate',
       ok and r and r['liste'] == [e[0] for e in exp] and exp[2] == [0, True] and r['punkte'] == sum(e[0] for e in exp) and not r['abbruch'] and st['best'] == r['punkte']
       and r['punkte'] >= 15, f'{r} expected {exp} {st}')
    ck('after the game one stands where one stood, the pins are set up again', not st['seat'] and not st['panel'] and not st['on'] and st['up']
       and abs(st['w'][0] - w0[0]) < 0.3 and abs(st['w'][1] - w0[1]) < 0.3, str(st))
    # by hand: the choice, the ball to the right, spin, the swinging line, the swinging bar
    E("window.__kg = null; GLKEGELN.spielen({ seed: 5 }).then(r => { window.__kg = r }); 0")
    time.sleep(0.2)
    t = J("[...document.querySelectorAll('#glwahl button')].map(b => b.textContent)")
    E("GLHUD.pick(0)"); time.sleep(0.2); steps(0.3)
    E("for (const k of ['r', 'r', 'r', 'dr']) GLKEGELN.taste(k); 0")
    steps(0.2)
    pic('22_kegeln_zielen', True)
    a0 = J("GLKEGELN.stand()")
    E("GLKEGELN.los()"); steps(0.5)
    a1 = J("GLKEGELN.stand()")
    E("GLKEGELN.los()"); steps(0.4)
    a2 = J("({ st: GLKEGELN.stand(), bar: !document.querySelector('#glspiel .gb').hidden, btn: [...document.querySelectorAll('#glspiel button')].map(b => b.textContent) })")
    pic('23_kegeln_schwung', True)
    E("GLKEGELN.los()"); steps(0.3)
    a3 = J("GLKEGELN.stand()")
    ck('by hand: alone for 2 €; ball 9 cm to the right with spin; the line swings and is stopped; the bar swings; the throw rolls',
       len(t) == 2 and 'Allein' in t[0] and abs(a0['aim'] - 0.09) < 1e-6 and a0['drall'] == 0.5 and a0['ph'] == 'ziel' and a1['ph'] == 'richtung' and abs(a1['dir']) > 0.005
       and a2['st']['ph'] == 'kraft' and a2['bar'] and 'Wurf!' in a2['btn'] and 0.3 < a2['st']['kraft'] <= 1 and a3['ph'] == 'rollt' and abs(a3['dir'] - a2['st']['dir']) < 1e-9, f'{t} {a0} {a1} {a2} {a3}')
    until("GLKEGELN.ph === 'ziel'", 20)
    E("GLKEGELN.taste('aus')"); steps(0.3)
    r = J("window.__kg")
    ck('„Aufhören“ ends the game: one throw counted, no record', r and r['abbruch'] and r['wuerfe'] == 1 and not E("PLAY.seated()") and E("GLSTATE.stats.kegel") == st['best'], str(r))
    # against Timo for a stake
    g0 = E("GLSTATE.geld")
    E("window.__kg = null; GLKEGELN.spielen({ seed: 3, gegner: 'Timo', einsatz: 10, auto: [{ aim: 0.09, kraft: 0.85 }] }).then(r => { window.__kg = r }); 0")
    ok = until("!!window.__kg", 150)
    r = J("window.__kg")
    g1 = E("GLSTATE.geld")
    won = r and r['gewonnen']
    ck('against Timo for 10 €: both throw five times in turns, the stake goes to who has more wood', ok and r and len(r['gegner']['liste']) == 5 and len(r['liste']) == 5
       and g1 - g0 == (8 if won else -2 if won is None else -12) and (won is None) == (r['punkte'] == r['gegner']['punkte']) and r['gegner']['punkte'] > 10, f'{r} money {g0} → {g1}')
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
    # ------------------------------------------------------------------ Angeln ------------------------------------------------------------------
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 18 * 60 + 40; 0")
    lib.settle_light(pg)
    look(ax, ay, AH, -8)
    i0 = J("({ inv: GLSTATE.inv, n: GLSTATE.stats.fische, act: KERN.acts().filter(a => a.id === 'gl:angeln').map(a => a.label())[0] })")
    E("window.__f = 0; GLANGELN.angeln('mais', { seed: 4, biss: 1.4, fisch: { art: 'karpfen', kg: 3.4 }, auto: true }).then(f => { window.__f = f || 'nichts' }); 0")
    steps(0.5)
    s0 = J("({ st: GLANGELN.stand(), seat: PLAY.seated(), panel: GLSPIEL.shown() })")
    until("GLANGELN.ph === 'warten'", 5, 0.05); steps(0.6)
    pic('24_angeln_pose', True)
    ok1 = until("GLANGELN.ph === 'drill'", 10, 0.05); steps(1.5)
    s1 = J("({ st: GLANGELN.stand(), bar: !document.querySelector('#glspiel .gb').hidden })")
    pic('25_angeln_drill', True)
    ok2 = until("GLANGELN.ph === 'fang'", 90, 0.05); steps(0.8)
    pic('26_angeln_fang', True)
    s2 = J("({ st: GLANGELN.stand(), inv: GLSTATE.inv, n: GLSTATE.stats.fische, best: GLSTATE.stats.best, fisch: GLANGELN.meshes.fisch.visible })")
    ck('Angeln: the act at the jetty\'s end, a cast uses one bait, the float lies, the forced bite is struck, the fight lands a carp of 3,4 kg',
       i0['act'] == 'Angeln' and s0['st']['on'] and s0['seat'] and s0['panel'] and ok1 and s1['bar'] and s1['st']['D'] and ok2 and s2['inv'].get('mais') == i0['inv'].get('mais') - 1
       and s2['inv'].get('karpfen_gross', 0) == i0['inv'].get('karpfen_gross', 0) + 1 and s2['n'] == i0['n'] + 1 and abs(s2['best'] - 3.4) < 1e-6 and s2['fisch'], f'{s0} {s1} {s2}')
    E("setView3(true, true); 0"); steps(0.6)
    pic('27_angeln_schulter')
    E("setView3(false, true); 0")
    E("GLANGELN.taste('aus')"); steps(0.3)
    f = J("window.__f")
    ck('packing up gives the catch back and lets one stand', f and f != 'nichts' and f['ding'] == 'karpfen_gross' and not E("PLAY.seated()") and not E("GLSPIEL.shown()")
       and not E("GLANGELN.meshes.rute.visible"), str(f))
    # struck too early: nothing; only reeling in a heavy fish: the line breaks
    E("window.__f = 0; GLANGELN.angeln('mais', { seed: 9, biss: 30 }).then(f => { window.__f = f || 'nichts' }); 0")
    until("GLANGELN.ph === 'warten'", 5, 0.05); steps(0.5)
    E("GLANGELN.anhieb()"); steps(0.2)
    e1 = J("GLANGELN.stand()")
    E("GLANGELN.taste('aus')"); steps(0.2)
    E("window.__f = 0; GLANGELN.angeln('mais', { seed: 9, biss: 0.5, fisch: { art: 'karpfen', kg: 8.5 }, auto: 'reissen' }).then(f => { window.__f = f || 'nichts' }); 0")
    until("GLANGELN.ph === 'biss'", 8, 0.05)
    E("GLANGELN.anhieb()")
    until("GLANGELN.ph === 'leer'", 40, 0.05)
    e2 = J("GLANGELN.stand()")
    E("GLANGELN.taste('aus')"); steps(0.2)
    ck('a strike before the bite scares the fish; only reeling breaks the line of a carp of 8,5 kg', e1['ph'] == 'leer' and 'früh' in e1['letzter'] and e2['ph'] == 'leer'
       and 'gerissen' in e2['letzter'] and J("window.__f") == 'nichts', f'{e1} {e2}')
    # without the permit a cast is a deed – if somebody sees it
    E("GLSTATE.use('angelkarte'); GLSTATE.add('mais', 2); GLFAHNDUNG.clear(); GLFAHNDUNG.hooks.zeuge = () => [{ x: KERN.where()[0] + 4, y: KERN.where()[1], hd: null, r: 30, name: 'Ein Angler', knows: false }]; 0")
    t0 = J("({ heat: GLSTATE.W.heat, n: GLSTATE.stats.taten })")
    E("GLANGELN.angeln('mais', { seed: 2, biss: 40 }); 0"); steps(0.5)
    t1 = J("({ heat: GLSTATE.W.heat, n: GLSTATE.stats.taten })")
    E("GLANGELN.taste('aus'); GLFAHNDUNG.hooks.zeuge = null; GLFAHNDUNG.clear(); GLSTATE.add('angelkarte', 1); 0"); steps(0.2)
    E("GLANGELN.angeln('mais', { seed: 2, biss: 40 }); 0"); steps(0.5)
    t2 = J("({ heat: GLSTATE.W.heat, n: GLSTATE.stats.taten })")
    E("GLANGELN.taste('aus')"); steps(0.2)
    ck('fishing without the guest permit is a deed when somebody sees it; with the permit it is none', t1['n'] == t0['n'] + 1 and t1['heat'] > t0['heat'] and t2['n'] == t1['n'] and t2['heat'] == 0, f'{t0} {t1} {t2}')
    # ------------------------------------------------------------------ the side mission „Karpfen für Suhl“ ------------------------------------------------------------------
    m0 = J("({ sms: GLSTATE.sms.length, st: GLNEBEN.stand(), tasks: KERN.tasks.list().filter(t => t.src === 'grenzland-neben').length })")
    E("KERN.emit('grenzland:mission', { id: 'clique', st: 'erledigt' }); 0"); steps(0.3)
    m1 = J("({ sms: GLSTATE.sms.length, von: GLSTATE.sms[GLSTATE.sms.length - 1].von, st: GLNEBEN.stand(), task: KERN.tasks.list().filter(t => t.src === 'grenzland-neben').map(t => ({ s: t.status, o: t.ort, t: t.target && t.target() }))[0] })")
    ck('once the clique is met Yuki writes; the journal lists „Karpfen für Suhl“ with the bus stop as its place', m0['st'] is None and m0['tasks'] == 0 and m1['sms'] == m0['sms'] + 1
       and m1['von'] == 'Yuki' and m1['st']['st'] == 'läuft' and m1['st']['i'] == 0 and m1['task']['o'] == 'Schulbushaltestelle' and abs(m1['task']['t'][0] - 249) < 4, f'{m0} {m1}')
    yx, yy = J("GLNEBEN.ORT.pos")
    YH = math.degrees(E("GLNEBEN.ORT.hd"))
    look(yx + math.sin(math.radians(YH)) * 2.6, yy + math.cos(math.radians(YH)) * 2.6, YH + 180, -2)
    ok = wait("!!GLNEBEN.F && GLNEBEN.F.g.visible", 60)
    y = J("GLNEBEN.F ? { d: Math.hypot(GLNEBEN.F.x - GLNEBEN.ORT.pos[0], GLNEBEN.F.y - GLNEBEN.ORT.pos[1]), act: KERN.acts().filter(a => a.id === 'gl:yuki').map(a => a.label())[0] } : null")
    ck('in the evening she stands at the school bus stop', ok and y and y['d'] < 1.5 and y['act'] == 'Mit Yuki reden', str(y))
    pic('28_yuki_haltestelle', True)
    def talk(pick=None):
        E("window.__r = 0; GLNEBEN.reden().then(() => { window.__r = 1 }); 0")
        for _ in range(60):
            time.sleep(0.1); steps(0.1)
            if pick is not None and E("!document.getElementById('glwahl').hidden"):
                E(f"GLHUD.pick({pick})"); pick = None
            if E("window.__r === 1"): return True
        return False
    g0 = E("GLSTATE.geld")
    ok = talk(1)
    m2 = J("({ st: GLNEBEN.stand(), text: KERN.tasks.list().filter(t => t.src === 'grenzland-neben')[0].text, sub: document.getElementById('glsub').textContent })")
    ck('she tells of the Waffenschmied and what she needs (and what is true and what is hers)', ok and m2['st']['i'] == 1 and 'Karpfen ab 2 kg' in m2['text'] and 'Milchreis' in m2['text'], str(m2))
    E("GLSTATE.use('karpfen_gross', 9); 0")
    talk()
    m3 = J("({ st: GLNEBEN.stand(), geld: GLSTATE.geld, sub: document.getElementById('glsub').textContent })")
    E("GLSTATE.add('karpfen_gross', 1); 0")
    talk()
    m4 = J("({ st: GLNEBEN.stand(), geld: GLSTATE.geld, inv: GLSTATE.inv, note: GLNEBEN.note, task: KERN.tasks.list().filter(t => t.src === 'grenzland-neben')[0].status })")
    ck('without the carp she waits; with carp, Milchreis and Worcestersauce: 80 €, the things are hers, the true story is a note in the phone', m3['st']['st'] == 'läuft' and m3['geld'] == g0
       and 'Karpfen' in m3['sub'] and m4['st']['st'] == 'erledigt' and m4['geld'] == g0 + 80 and 'karpfen_gross' not in m4['inv'] and 'milchreis' not in m4['inv']
       and 'worcester' not in m4['inv'] and m4['note'] and m4['task'] == 'erledigt', f'{m3} {m4}')
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
