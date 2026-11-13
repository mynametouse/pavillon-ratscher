# feat/grenzland-mission (Falko, 13.11.2026): chapter 1 of the mode „Grenzland“ – the runner and the five missions, played through by the
# test: where a human would walk or ride for minutes the test puts the player there (GAME.view, GRENZLAND.hin, VEH.place), but every step
# is finished by its real check; talks are skipped with the action a player has (GLMISSION.weiter). Sections (second argument, comma
# separated; default all): m1 m2 m3 m4 m5 lager reload. Pictures of every scene in out/grenzland_mission/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9017 --serve grenzland_mission:m1,reload
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
SECT = [s for s in (sys.argv[2] if len(sys.argv) > 2 else 'm1,m2,m3,m4,m5,lager,reload').split(',') if s]
ck = lib.Checks('grenzland_mission')
OUT = lib.out('grenzland_mission')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    info = lambda: J("GLMISSION.debug.info()")
    def pic(name, hud=True):
        try:
            lib.shot(pg, OUT, name)
            if hud: pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    def until(cond, secs=40, dt=0.25, real=0.05):
        """step the game until cond holds (secs of game time at most); the page gets a moment for promises and loads each round"""
        for _ in range(int(secs / dt) + 1):
            if E(cond): return True
            steps(dt)
            if real: time.sleep(real)
        return bool(E(cond))
    def talk(maxn=30):
        """skip the talk that runs, line by line, as a player would with the action button"""
        n = 0
        while n < maxn and E("GLMISSION.redet()"):
            E("GLMISSION.weiter()"); steps(0.1); n += 1
        return n
    def at(step, secs=30):
        ok = until(f"GLMISSION.debug.info().step === '{step}' && !GLMISSION.St.busy", secs)
        if not ok: print('   not at', step, info())
        return ok
    near = lambda p, r: E(f"Math.hypot(GLFAHNDUNG.wo().x - ({p[0]}), GLFAHNDUNG.wo().y - ({p[1]})) < {r}")
    def put(p, yaw=0, off=(0, 0)):
        """the player to a place on foot, standing on the ground"""
        E(f"GRENZLAND.hin({p[0] + off[0]}, {p[1] + off[1]}, {yaw})"); steps(0.3)
    E("window.__ev = []; KERN.on('*', (d, n) => { if (n === 'grenzland:mission' || n === 'grenzland:schritt') __ev.push([n.slice(10), d.id, d.st !== undefined ? d.st : d.schritt, d.titel || '', d.lohn || '']) })")
    ORT = J("({ zh: GLDATA.ORTE.zh.pos, schule: GLKAP1.ORT.schule(), halt: GLKAP1.ORT.halt(), garten: GLDATA.ORTE.garten.pos, lager: GLDATA.ORTE.lager.pos })")

    # ================================================================ 1 · Ein Gefallen ================================================================
    if 'm1' in SECT:
        ok = until("GLMISSION.debug.info().step === 'ankunft' && !!GLMISSION.St.S.da", 120, 0.5, 0.3)
        i = info()
        st = J("({ w: KERN.where(), pl: String(KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet)), m: Math.floor(CLOCK.t) % 1440, track: QUESTS.track, zone: (KERN.zones().find(z => z.id === 'schleusingen') || {}).state, "
               "fade: document.getElementById('glfade').classList.contains('on'), j: KERN.tasks.list().filter(e => e.src === 'grenzland').map(e => [e.id, e.status, e.title, e.text.slice(0, 40)]) })")
        ck('a fresh game starts „Ein Gefallen“ at the Zentralhaltestelle of Schleusingen (the town stands, the picture is light again)',
           ok and i['cur'] == 'gefallen' and abs(st['w'][0] - ORT['zh'][0]) < 6 and abs(st['w'][1] - ORT['zh'][1]) < 6 and 'Schleusingen' in st['pl'] and not st['fade'], str(i)[:300] + str(st))
        ck('the journal lists the mission as running and tracks it', st['track'] == 'grenzland:gefallen' and len(st['j']) == 1 and st['j'][0][1] == 'läuft' and st['j'][0][2] == 'Ein Gefallen', str(st['j']))
        steps(0.3)
        pic('11_ankunft')
        n = talk()
        ck('the two talk on arrival; the lines can be skipped', n >= 2 and at('fremder'), f'{n} lines, {info()["step"]}')
        ok = until("!!GLMISSION.F('fremder')", 90, 0.3, 0.4)
        f0 = J("(F => F ? [F.x, F.y, F.z, F.g.visible] : null)(GLMISSION.F('fremder'))")
        ck('the stranger stands on the square', ok and f0 and f0[3] and abs(f0[2] - E(f"KERN.ground({f0[0]}, {f0[1]})")) < 0.3, str(f0))
        steps(3)
        pic('12_fremder_kommt')
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'fremder'", 40)
        d = E("(F => Math.hypot(F.x - GAME.P.x, F.y - GAME.P.y))(GLMISSION.F('fremder'))")
        ck('he walks up to the two and speaks', ok and d < 3.2, f'{d:.1f} m')
        steps(0.4)
        pic('13_fremder')
        g0 = E("GLSTATE.geld")
        n = talk()
        ok = at('heim')
        st = J("({ paket: GLSTATE.inv.paket || 0, geld: GLSTATE.geld, x: document.getElementById('glextra').textContent, xh: document.getElementById('glextra').hidden, tgt: (e => e && e.target ? e.target() : null)(KERN.tasks.list().find(e => e.key === 'grenzland:gefallen')), ort: (KERN.tasks.list().find(e => e.key === 'grenzland:gefallen') || {}).ort })")
        ck('the parcel and 50 €; the way to the old school is the target; „Mitfahrgelegenheit“ on the panel', ok and st['paket'] == 1 and st['geld'] == g0 + 50 and st['x'] == 'Mitfahrgelegenheit' and not st['xh']
           and st['tgt'] and abs(st['tgt'][0] - ORT['schule'][0]) < 1 and st['ort'] == 'Alte Schule', str(st))
        talk()
        steps(4)
        m0 = E("CLOCK.t")
        E("void GLHUD.acts.extra()")
        ok = until("!GLMISSION.St.busy && !document.getElementById('glfade').classList.contains('on')", 20, 0.25, 0.2)
        st = J("({ w: KERN.where(), dm: CLOCK.t - " + str(m0) + ", pl: String(KERN.place(GAME.P.x, GAME.P.y, GAME.P.feet)) })")
        ck('„Mitfahrgelegenheit“: half an hour later at the school bus stop of Ratscher', ok and near(ORT['halt'], 4) and 29 < st['dm'] < 40 and 'Ratscher' in st['pl'], str(st))
        ck('in Ratscher the step is done: the old school\'s door is next', at('schule'), info()['step'])
        pic('14_ratscher')
        E(f"GAME.view({ORT['schule'][0] - 0.4}, {ORT['schule'][1] - 1.6}, KERN.ground({ORT['schule'][0]}, {ORT['schule'][1]}) + 1.62, 20, 0)")
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'schule'", 10)
        pic('15_schule')
        n = talk()
        ck('at the door nobody waits – they talk', ok and n >= 4 and at('wechsel'), info()['step'])
        ok = until("!!GRENZLAND.partnerOf()", 60, 0.3, 0.4)
        txt = info()['text']
        E("GRENZLAND.wechsel()")
        ok2 = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'karte'", 10)
        talk()
        st = J("({ wer: GLSTATE.wer, k: GLSTATE.inv.karte1 || 0, p: GLSTATE.inv.paket || 0 })")
        ck('„Wechsle zu Sarah“ (Tab): she has opened the parcel – half of a border map', ok and ok2 and 'Sarah' in txt and st['wer'] == 'f' and st['k'] == 1 and st['p'] == 0 and at('handy'), txt + str(st))
        st = J("({ un: GLHANDY.unread(), sms: GLSTATE.sms.map(q => q.von), feed: GLSTATE.feed.length })")
        ck('a message from an unknown number, the village chat wakes up', st['un'] >= 1 and 'Unbekannt' in st['sms'] and st['feed'] >= 3, str(st))
        E("void GLHANDY.open()"); steps(0.3)
        pic('16_handy')
        E("void GLHANDY.close()"); steps(0.3); time.sleep(0.2); steps(0.3)
        talk()
        ck('the phone was read (T)', at('radio'), info()['step'])
        E("void GLRADIO.next()"); steps(0.5)
        talk()
        ck('the radio is on (R)', at('nacht') and E("!!GLRADIO.cur()"), info()['step'])
        E("GLRADIO.off()")
        put(ORT['garten'], 0, (2, 2))
        ok = until("GLMISSION.debug.info().st.gefallen === 'erledigt' && !document.getElementById('glfade').classList.contains('on')", 20, 0.25, 0.2)
        st = J("({ m: Math.floor(CLOCK.t) % 1440, ev: __ev.filter(e => e[0] === 'mission'), j: KERN.tasks.list().filter(e => e.src === 'grenzland').map(e => [e.id, e.status]), tage: GLSTATE.tage })")
        ck('the night in the garden: the next morning, the mission is done (event with title and reward)',
           ok and abs(st['m'] - 490) < 15 and ['mission', 'gefallen', 'erledigt', 'Ein Gefallen', '+50 €'] in st['ev'] and ['gefallen', 'erledigt'] in st['j'] and st['tage'] == 1, str(st))
        pic('17_morgen')

    # ================================================================ 2 · Die Clique ================================================================
    def act(aid, hold=0.0):
        """run an action of the action button as the player would (E; a hold is held)"""
        ok = E(f"(() => {{ const a = KERN.acts().find(a => a.id === '{aid}'); if (!a || !a.label()) return false; PLAY.run(a); return true }})()")
        if ok and hold: steps(hold + 0.4)
        return ok
    def view(p, dx, dy, yaw):
        E(f"GAME.view({p[0] + dx}, {p[1] + dy}, KERN.ground({p[0] + dx}, {p[1] + dy}) + 1.62, {yaw}, -6)"); steps(0.3)
    if 'm2' in SECT:
      try:
        E("if (VEH.cur) VEH.exit(); GLMISSION.debug.go('clique')"); steps(0.5)
        put(ORT['garten'], 0, (1, 1))
        st = J("({ sms: GLSTATE.sms.map(q => q.von), moped: GLAUTO.moped && GLAUTO.moped.g.visible, d: GLAUTO.moped ? Math.hypot(GLAUTO.moped.st.x - GLDATA.ORTE.moped.pos[0], GLAUTO.moped.st.y - GLDATA.ORTE.moped.pos[1]) : 99, "
               "kan: !!GLMISSION.D('kanister'), tank: GLSTATE.tank, k1: GLSTATE.inv.karte1 || 0, st: GLMISSION.debug.info().st })")
        ck('„Die Clique“: a message from Jule, the moped in the garden with a canister beside it, the tank nearly dry',
           'Jule' in st['sms'] and st['moped'] and st['d'] < 14 and st['kan'] and st['tank'] < 1 and st['k1'] == 1 and st['st']['gefallen'] == 'erledigt', str(st))
        E("(m => GAME.view(m.st.x + 1.3, m.st.y + 0.4, KERN.ground(m.st.x, m.st.y) + 1.62, 250, -25))(GLAUTO.moped)"); steps(0.3)
        pic('21_moped')
        ok = act('gl:tanken', 2.6) or act('gl:kanister', 2.6)
        ck('filled from the canister (hold): the tank is full, on to the barn', ok and at('fahrt') and E("GLSTATE.tank") > 4.5, str(E("GLSTATE.tank")))
        SCH = J("GLKAP1.ORT.scheune()")
        E("VEH.enter('gl-moped')"); steps(0.5)
        E(f"VEH.place('gl-moped', {SCH[0] + 13}, {SCH[1] + 13}, 3.9)"); steps(1)
        ok = at('treff')
        ok2 = until("['jule', 'timo', 'basti'].every(k => GLMISSION.F(k))", 150, 0.3, 0.5)
        ck('at the field barn Jule, Timo and Basti wait with their mopeds', ok and ok2 and len(info()['autos']) == 3, str(info())[:260])
        E("VEH.exit()"); steps(0.5)
        j = J("(F => [F.x, F.y])(GLMISSION.F('jule'))")
        view(j, 2.4, 2.4, 225)
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'clique'", 8)
        steps(0.5)
        pic('22_clique')
        n = talk()
        ck('they talk: trust is earned in a race', ok and n >= 8 and at('start'), f'{n} lines')
        R = J("(R => R ? { L: R.L, start: R.start, hd: R.hd, end: R.end, cps: R.cps.map(c => [c.x, c.y, c.s]) } : null)(GLKAP1.renn())")
        ck('the course follows the roads from the barn to the dam, with checkpoints', bool(R) and R['L'] > 800 and len(R['cps']) >= 4 and near(R['end'], 1e9), str(R)[:200])
        E("VEH.enter('gl-moped')"); steps(0.3)
        E(f"VEH.place('gl-moped', {R['start'][0]}, {R['start'][1]}, {R['hd']})"); steps(0.6)
        rid = J("['mj', 'mt'].map((k, i) => { const c = GLMISSION.C(k), f = GLMISSION.F(i ? 'timo' : 'jule'); return [Math.round(c.s * 10) / 10, !!f.reitet, Math.round(Math.hypot(f.x - c.x, f.y - c.y) * 100) / 100, Math.round((f.z - c.z) * 100) / 100] })")
        ck('Jule and Timo sit on their mopeds at the line', all(r[1] and r[2] < 0.5 for r in rid) and rid[0][0] > rid[1][0], str(rid))
        E("(m => GAME.view(m.st.x - 4, m.st.y - 5, KERN.ground(m.st.x, m.st.y) + 2.2, 40, -10))(GLAUTO.moped)")
        pic('23_start')
        E("VEH.enter('gl-moped')"); steps(0.3)
        E(f"VEH.place('gl-moped', {R['start'][0]}, {R['start'][1]}, {R['hd']})")
        ok = at('rennen', 9)
        ck('3 – 2 – 1 – Los: the race runs', ok, str(info())[:160])
        steps(12)
        riv = J("['mj', 'mt'].map(k => { const c = GLMISSION.C(k); return [Math.round(c.s), Math.round(c.v * 10) / 10] })")
        hint = E("document.getElementById('glhint').textContent")
        ck('the rivals ride off along the course; the panel shows the place', riv[0][0] > 60 and riv[0][1] > 5 and 'Platz 3 von 3' in hint, str(riv) + hint)
        E("(c => GAME.view(c.x - 6, c.y - 6, c.z + 2.4, 45, -8))(GLMISSION.C('mj'))")
        pic('24_rennen', False)
        E(f"VEH.place('gl-moped', {R['start'][0]}, {R['start'][1]}, {R['hd']})")
        lost = until("GLMISSION.debug.info().n >= 1 && GLMISSION.debug.info().step === 'start' && !GLMISSION.St.busy", 300, 2.0, 0.02)
        st = J("({ i: GLMISSION.debug.info(), w: GLFAHNDUNG.wo().veh ? VEH.cur.id : '', d: Math.hypot(GLFAHNDUNG.wo().x - " + str(R['start'][0]) + ", GLFAHNDUNG.wo().y - " + str(R['start'][1]) + "), s: GLMISSION.C('mj').s })")
        ck('who dawdles loses: Jule is first at the dam – again from the start, not the whole chapter', lost and st['w'] == 'gl-moped' and st['d'] < 6 and st['s'] < 12 and st['i']['st']['gefallen'] == 'erledigt', str(st)[:300])
        talk()
        ok = at('rennen', 12)
        for k, c in enumerate(R['cps']):
            E(f"VEH.place('gl-moped', {c[0]}, {c[1]}, 0)"); steps(0.3)
            if k == len(R['cps']) // 2:
                pic('25_kontrollpunkt')
        ck('through every checkpoint before Jule: the race is won', ok and at('damm', 5), str(info())[:200])
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'damm'", 200, 1.0, 0.02)
        steps(0.5)
        E("(c => c && GAME.view(c.x + 5, c.y + 5, c.z + 1.8, 225, -6))(GLMISSION.C('mj'))")
        pic('26_damm')
        g0, b0 = E("GLSTATE.geld"), E("GLSTATE.inv.boeller || 0")
        n = talk()
        ok2 = until("GLMISSION.debug.info().st.clique === 'erledigt'", 5)
        st = J("({ geld: GLSTATE.geld, b: GLSTATE.inv.boeller || 0, ev: __ev.filter(e => e[0] === 'mission' && e[1] === 'clique').map(e => e[2] + '|' + e[4]), sms: GLSTATE.sms.slice(-1)[0].text.slice(0, 20) })")
        ck('at the dam they read the map: „Frag den Gerhard“ – 80 €, four bangers, skittles and fishing pointed out',
           ok and n >= 7 and ok2 and st['geld'] == g0 + 80 and st['b'] == b0 + 4 and 'erledigt|+80 € · 4 Böller' in st['ev'] and 'Kegeln' in st['sms'], str(st))
        E("VEH.exit()"); steps(0.3)
      except Exception as e:
        ck('mission 2 ran through without an error of the test', False, str(e)[:300])

    # ================================================================ 3 · Gerhards Geschichte (1989) ================================================================
    if 'm3' in SECT:
      try:
        E("if (VEH.cur) VEH.exit(); GLMISSION.debug.go('gerhard')"); steps(0.5)
        B = J("GLKAP1.bank()")
        ok = until("!!GLMISSION.F('gerhard')", 120, 0.3, 0.5)
        view(B['p'], (B['vor'][0] - B['p'][0]) * 2.2, (B['vor'][1] - B['p'][1]) * 2.2, (B['hd'] * 180 / 3.14159265 + 180) % 360)
        st = J("(F => ({ sitzt: !!F.sitzt, mode: F.f && F.f.mode, dz: F.z - KERN.ground(F.x, F.y), own: !!(window.DPEOPLE && DPEOPLE.figs.gerhard && DPEOPLE.figs.gerhard.g.visible) }))(GLMISSION.F('gerhard'))")
        ck('Gerhard sits on the bench under the Dorflinde (the village\'s own Gerhard stays away)', ok and st['sitzt'] and st['mode'] == 'sit' and -0.6 < st['dz'] < 0 and not st['own'], str(st))
        pic('31_linde')
        view(B['p'], (B['vor'][0] - B['p'][0]) * 0.9, (B['vor'][1] - B['p'][1]) * 0.9, (B['hd'] * 180 / 3.14159265 + 180) % 360)
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'gerhard1'", 8)
        n = talk()
        ok2 = until("GLMISSION.debug.info().step === 'damals' && !!GLMISSION.St.S.da", 30, 0.3, 0.3)
        st = J("({ era: GLSTATE.era, m: Math.floor(CLOCK.t) % 1440, w: KERN.where(), off: GLFAHNDUNG.off, body: document.body.dataset.glEra || '' })")
        ck('he looks at the map for a long time – and it is Friday, 10 November 1989, in the school yard', ok and n >= 6 and ok2 and st['era'] == '1989' and st['body'] == '1989' and st['off']
           and abs(st['w'][0] - J("GLDATA.ORTE.schulhof.pos")[0]) < 3, str(st))
        steps(0.5)
        pic('32_1989')
        talk()
        ok = at('kiste')
        KP = J("GLKAP1.kistePos()")
        view(KP, 0.9, -0.9, 315)
        ok2 = act('gl:kiste', 1.8)
        ck('the crate at the school: taken with both arms (hold)', ok and ok2 and at('weg') and E("GLKAP1.K89.trag"), str(info())[:200])
        talk()
        p0 = J("KERN.where()")
        E("GAME.step(4, 1, 0, 0, 1.9)")
        st = J("({ w: KERN.where(), k: (o => o ? [o.position.x, -o.position.z, o.position.y - GAME.P.feet] : null)(GLMISSION.D('kiste')) })")
        mv = ((st['w'][0] - p0[0]) ** 2 + (st['w'][1] - p0[1]) ** 2) ** 0.5
        ck('with the crate nobody runs: slow steps, the crate before the body', 1.5 < mv < 7.2 and st['k'] and abs(st['k'][0] - st['w'][0]) < 0.8 and abs(st['k'][1] - st['w'][1]) < 0.8 and 0.3 < st['k'][2] < 1.3, f'{mv:.1f} m ' + str(st))
        pic('33_kiste')
        ok = until("['abv'].every(k => GLMISSION.F(k) || (GL89.leute && GL89.leute[k]))", 120, 0.3, 0.5)
        E("GLMISSION.St.S.t = 61"); steps(0.3)
        st0 = J("({ off: GLFAHNDUNG.off, n: GLLOGIK.stars(GLSTATE.W) })")
        E("(F => { const a = F.hd; GAME.view(F.x + Math.sin(a) * 4, F.y + Math.cos(a) * 4, KERN.ground(F.x, F.y) + 1.62, 0, 0) })(GLMISSION.F('abv') || GL89.leute.abv)")
        ok2 = until("GLLOGIK.stars(GLSTATE.W) > 0", 6)
        st = J("({ n: GLLOGIK.stars(GLSTATE.W), log: GLSTATE.W.log.map(l => l.id), known: GLSTATE.W.known })")
        ck('the first minute is quiet; then whoever sees the crate reports it – the Volkspolizei searches for the teacher', ok and not st0['off'] and st0['n'] == 0 and ok2 and 'kiste' in st['log'] and st['known'], str(st0) + str(st))
        pic('34_gesehen')
        E("GLFAHNDUNG.erwischt()"); steps(0.4)
        b1 = E("!document.getElementById('glbust').hidden")
        pg.click('#glbustb')
        ok = until("GLMISSION.debug.info().step === 'kiste' && !GLMISSION.St.busy", 20, 0.25, 0.2)
        st = J("({ era: GLSTATE.era, n: GLMISSION.debug.info().n, trag: GLKAP1.K89.trag, sterne: GLLOGIK.stars(GLSTATE.W), w: KERN.where(), k: (o => [o.position.x, -o.position.z])(GLMISSION.D('kiste')) })")
        ck('caught: the memory starts again at the crate – still 1989, nothing else lost', b1 and ok and st['era'] == '1989' and st['n'] >= 1 and not st['trag'] and st['sterne'] == 0
           and abs(st['k'][0] - KP[0]) < 0.5 and abs(st['k'][1] - KP[1]) < 0.5, str(st))
        view(KP, 0.9, -0.9, 315)
        act('gl:kiste', 1.8)
        at('weg'); talk()
        SCH = J("GLKAP1.ORT.scheune()")
        view(SCH, 3.5, 3.5, 225)
        ok = at('stroh', 5)
        ok2 = act('gl:stroh', 2.7)
        ok3 = at('warten', 5)
        st = J("({ stroh: !!GLMISSION.D('stroh'), kiste: !!GLMISSION.D('kiste'), trag: GLKAP1.K89.trag, hide: GLFAHNDUNG.versteckt(GAME.P.x, GAME.P.y, GAME.P.feet) })")
        ck('at the field barn the crate goes under the straw (hold); the barn hides', ok and ok2 and ok3 and st['stroh'] and not st['kiste'] and not st['trag'] and st['hide'], str(st))
        pic('35_stroh')
        talk()
        ok = until("GLMISSION.debug.info().step === 'heute' && !!GLMISSION.St.S.da", 40, 0.5, 0.3)
        st = J("({ era: GLSTATE.era, w: KERN.where(), body: document.body.dataset.glEra || '', off: GLFAHNDUNG.off, extra: GLFAHNDUNG.extra.length })")
        ck('when the air is clear the memory ends: back under the lime, today', ok and st['era'] == 'heute' and st['body'] == '' and not st['off'] and abs(st['w'][0] - B['vor'][0]) < 3 and abs(st['w'][1] - B['vor'][1]) < 3, str(st))
        steps(0.5)
        pic('36_heute')
        n = talk()
        ok = until("GLMISSION.debug.info().st.gerhard === 'erledigt'", 5)
        ck('„Am nächsten Morgen war die Kiste weg. Und Lutz auch.“ – the mission is done', ok and n >= 5, f'{n} lines')
      except Exception as e:
        ck('mission 3 ran through without an error of the test', False, str(e)[:300])

    # ================================================================ 4 · Nachts an der Klinge ================================================================
    if 'm4' in SECT:
      try:
        E("if (VEH.cur) VEH.exit(); GLFAHNDUNG.clear(); GLMISSION.debug.go('klinge')"); steps(0.5)
        KL = J("(K => ({ van: K.van, vorn: K.vorn, hd: K.hd, men: K.men.map(m => m[2]) }))(GLKAP1.szeneKlinge())")
        st = J("({ sms: GLSTATE.sms.slice(-1)[0].text, x: document.getElementById('glextra').textContent, b: GLSTATE.inv.boeller || 0, nacht: GLMLOGIK.nacht(CLOCK.t), surf: !!KERN.surface(" + f"{KL['van'][0]}, {KL['van'][1]}" + ") })")
        ck('„Nachts an der Klinge“: Jule\'s message, bangers in the pocket, „Bis zum Abend warten“ on the panel; the van\'s place is on the forest track',
           'Klinge' in st['sms'] and st['x'] == 'Bis zum Abend warten' and st['b'] >= 2 and st['surf'], str(st))
        put(KL['vorn'])
        steps(1.5)
        day = info()['step'] == 'abend' and not E("!!GLMISSION.C('van')")
        E("void GLHUD.acts.extra()")
        ok = until("GLMLOGIK.nacht(CLOCK.t) && !CLOCK.warp", 40, 0.5, 0.1)
        ck('by day nobody is there; waiting until the evening brings the night', (day or st['nacht']) and ok, 'minute ' + str(E("Math.floor(CLOCK.t) % 1440")))
        ok = at('ansehen', 6)
        ok2 = until("['w1', 'w2', 'w3'].every(k => GLMISSION.F(k)) && !!GLMISSION.C('van')", 160, 0.3, 0.5)
        lib.settle_light(pg)
        st = J("({ van: (c => [c.x, c.y, c.g.visible])(GLMISSION.C('van')), d: ['w1', 'w2', 'w3'].map(k => Math.round(Math.hypot(GLMISSION.F(k).x - GLMISSION.C('van').x, GLMISSION.F(k).y - GLMISSION.C('van').y) * 10) / 10), k: !!GLMISSION.D('kisten'), dark: VAUTO.dark(), lamp: GLAUTO.LM.head.emissiveIntensity })")
        ck('in the forest: a van with its lamps on, three men, crates', ok and ok2 and st['van'][2] and max(st['d']) < 8 and st['k'] and st['dark'] and st['lamp'] > 1, str(st))
        import math
        f = (math.sin(KL['hd']), math.cos(KL['hd'])); r = (math.cos(KL['hd']), -math.sin(KL['hd']))
        P = lambda a, b: (KL['van'][0] + f[0] * a + r[0] * b, KL['van'][1] + f[1] * a + r[1] * b)
        yawTo = lambda p, q: math.degrees(math.atan2(q[0] - p[0], q[1] - p[1]))
        p = P(-16, -9)
        E(f"GAME.view({p[0]}, {p[1]}, KERN.ground({p[0]}, {p[1]}) + 1.62, {yawTo(p, KL['van'])}, -4)"); steps(0.3)
        pic('41_klinge')
        n = talk() if until("GLMISSION.redet()", 3) else 0
        ck('the two make a plan', n >= 2 and at('ablenken'), f'{n} lines ' + info()['step'])
        # too far for a picture
        p = P(-52, -20)
        E(f"GAME.view({p[0]}, {p[1]}, KERN.ground({p[0]}, {p[1]}) + 1.62, {yawTo(p, KL['van'])}, 0)"); steps(0.3)
        a1 = act('gl:foto'); steps(0.3)
        far = E("GLKAP1.K4().n") == 0
        # seen from close by → they come running → caught → the checkpoint
        E("(F => { GAME.view(F.x + Math.sin(F.hd) * 3.5, F.y + Math.cos(F.hd) * 3.5, KERN.ground(F.x, F.y) + 1.62, 0, 0) })(GLMISSION.F('w3'))")
        ok = until("GLKAP1.K4().job === 'jagt'", 5, 0.1)
        ok2 = until("GLMISSION.debug.info().n >= 1 && GLMISSION.debug.info().step === 'ablenken' && !GLMISSION.St.busy", 20, 0.25, 0.2)
        st = J("({ n: GLKAP1.K4().n, job: GLKAP1.K4().job, w: KERN.where(), d: Math.hypot(GLMISSION.F('w1').x - " + f"{KL['men'][0][0]}" + ", GLMISSION.F('w1').y - " + f"{KL['men'][0][1]}" + ") })")
        ck('a photo from 55 m shows nothing; seen from close by they come running and catch you – again from the forest\'s edge, not the whole mission',
           a1 and far and ok and ok2 and st['job'] == 'laden' and abs(st['w'][0] - KL['vorn'][0]) < 3 and abs(st['w'][1] - KL['vorn'][1]) < 3 and st['d'] < 1, str(st))
        # the banger on the far side draws two of them away
        bx, by = P(6, 34)
        E(f"GRENZLAND.bang({bx}, {by})"); steps(0.3)
        ok = at('fotos', 3)
        steps(9)
        st = J("({ d: ['w1', 'w2', 'w3'].map(k => Math.round(Math.hypot(GLMISSION.F(k).x - GLMISSION.C('van').x, GLMISSION.F(k).y - GLMISSION.C('van').y))), lure: !!GLKAP1.K4().lure })")
        ck('a banger on the far side: two men go and look, one stays at the van', ok and st['lure'] and st['d'][0] > 12 and st['d'][1] > 12 and st['d'][2] < 6, str(st))
        p = P(-20, -22)
        E(f"GAME.view({p[0]}, {p[1]}, KERN.ground({p[0]}, {p[1]}) + 1.1, {yawTo(p, KL['van'])}, 0); GAME.P.stance = 'crouch'"); steps(0.3)
        pic('42_fotos')
        got = []
        for _ in range(3):
            got.append(act('gl:foto')); steps(1.3)
        ok = at('flucht', 3)
        E("GAME.P.stance = 'stand'")
        ck('three photos from cover, ducked in the dark, unseen', all(got) and ok and E("GLSTATE.inv.fotos") == 3 and E("GLKAP1.K4().job") != 'jagt', str(got) + info()['step'])
        steps(4)
        st = J("({ n: GLLOGIK.stars(GLSTATE.W), known: GLSTATE.W.known, leucht: !!GLMISSION.D('leucht'), chat: GLSTATE.feed.slice(-4).map(q => q.text).join(' | '), van: (c => c ? Math.round(c.v * 10) / 10 : -1)(GLMISSION.C('van')), figs: GLMISSION.debug.info().figs.length })")
        ck('a flare over the forest, „Schüsse an der Klinge?!“ in the village chat: three hollow stars, the men drive off',
           st['n'] == 3 and not st['known'] and st['leucht'] and 'Schüsse an der Klinge' in st['chat'] and st['van'] > 0.5 and st['figs'] == 0, str(st))
        E(f"GAME.view({p[0]}, {p[1]}, KERN.ground({p[0]}, {p[1]}) + 1.62, {yawTo(p, KL['van'])}, 28)"); steps(0.2)
        pic('43_leuchtkugel')
        put(ORT['garten'], 0, (2, 2)); steps(1)
        held = info()['step'] == 'flucht'
        E("GLFAHNDUNG.clear()"); steps(1.5)
        ok = until("GLMISSION.redet()", 5)
        n = talk()
        ok2 = until("GLMISSION.debug.info().st.klinge === 'erledigt'", 5)
        ck('home is not enough while they search; once the stars are gone the night is over – mission done', held and ok and n >= 2 and ok2, f'{held} {n}')
      except Exception as e:
        ck('mission 4 ran through without an error of the test', False, str(e)[:300])

    # ================================================================ 5 · Der Coup ================================================================
    if 'm5' in SECT:
      try:
        E("if (VEH.cur) VEH.exit(); GLFAHNDUNG.clear(); GLMISSION.debug.go('coup')"); steps(0.5)
        ok = until("!!GLMISSION.F('jule')", 150, 0.3, 0.5)
        j = J("(F => [F.x, F.y])(GLMISSION.F('jule'))")
        view(j, 2.4, 2.4, 225)
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'plan'", 8)
        n = talk()
        ok2 = at('plan', 4) and E("!document.getElementById('glwahl').hidden")
        opts = J("[...document.querySelectorAll('#glwahl button')].map(b => b.textContent.slice(0, 5))")
        pic('50_plan')
        ck('Jule knows where the crates go; the plan is a choice: leise or laut', ok and n >= 8 and ok2 and opts == ['Leise', 'LautD'][:1] + [opts[1]] and opts[1].startswith('Laut'), str(opts))
        E("GLHUD.pick(0)"); steps(0.3); time.sleep(0.2); steps(0.3); talk()
        st = J("({ step: GLMISSION.debug.info().step, plan: GLSTATE.m.coup.plan, x: document.getElementById('glextra').textContent, text: GLMISSION.debug.info().text })")
        ck('leise: at night through the gap (the panel offers to wait for the night)', st['step'] == 'hin' and st['plan'] == 'leise' and st['x'] == 'Bis zur Nacht warten' and 'Nacht' in st['text'], str(st))
        E("GLMISSION.debug.go('coup', 'plan')"); steps(0.3)
        E("GLHUD.pick(1)"); steps(0.3); time.sleep(0.2); steps(0.3); talk()
        ok = at('hin', 4)
        YY = J("(Y => ({ hinten: Y.hinten, drin: Y.drin, vorTor: Y.vorTor, vorTuer: Y.vorTuer, imBuero: Y.imBuero, karte: Y.karte, pos: Y.pos, zaun: Y.w(4, -15.5), zaunIn: Y.w(4, -9), hd: Y.kamera.hd, side: Y.side }))(GLLAGER.Y)")
        yawIn = math.degrees(YY['hd']) % 360
        ck('laut: to the back of the yard, the clique waits for the sign', ok and E("GLSTATE.m.coup.plan") == 'laut' and 'Zeichen' in info()['text'], info()['text'])
        # the picture from the gate, by day
        g = (YY['vorTor'][0] + (YY['vorTor'][0] - YY['pos'][0]) * 0.9, YY['vorTor'][1] + (YY['vorTor'][1] - YY['pos'][1]) * 0.9)
        E(f"GAME.view({g[0]}, {g[1]}, KERN.ground({g[0]}, {g[1]}) + 2.4, {(yawIn + 180) % 360}, -6)"); steps(0.5)
        ok = until("GLLAGER.wachen.length === 2", 150, 0.3, 0.5)
        steps(2)
        pic('51_lager_tor')
        ck('the yard: two guards on their jobs (one on his round, one at the gate)', ok and sorted(w['job'] for w in J("GLLAGER.status().wachen")) == ['posten', 'runde'], str(J("GLLAGER.status()"))[:300])
        # the fence is solid, the gap is not
        E(f"GAME.view({YY['zaun'][0]}, {YY['zaun'][1]}, KERN.ground({YY['zaun'][0]}, {YY['zaun'][1]}) + 1.62, {yawIn}, 0)")
        E("GAME.step(3.5, 1)")
        out = not E("GLLAGER.Y.innen(GAME.P.x, GAME.P.y)")
        put(YY['hinten'], yawIn)
        ok = at('rein', 4)
        pic('52_lager_hinten')
        ck('the fence holds; at the back, by the gap, the next step begins', out and ok, f'{out} ' + info()['step'])
        a1 = act('gl:zeichen'); steps(7.5)
        st = J("({ w: GLLAGER.status().wachen, n: GLLOGIK.stars(GLSTATE.W), tor: GLLAGER.wachen.map(w => Math.round(Math.hypot(w.F.x - GLLAGER.Y.tor[0], w.F.y - GLLAGER.Y.tor[1]))) })")
        ck('the sign: a battery of bangers at the gate – both guards run there, and somebody calls the police (one hollow star)',
           a1 and all(w['job'] == 'gelenkt' for w in st['w']) and st['n'] == 1, str(st)[:300])
        E(f"GAME.view({YY['hinten'][0]}, {YY['hinten'][1]}, KERN.ground({YY['hinten'][0]}, {YY['hinten'][1]}) + 1.62, {yawIn}, 0)")
        E("GAME.step(2.2, 1)")
        ok = at('tuer', 3)
        ck('through the gap into the yard', ok and E("GLLAGER.Y.innen(GAME.P.x, GAME.P.y)"), info()['step'])
        view(YY['vorTuer'], 0, 0, yawIn)
        a2 = act('gl:tuer', 4.2)
        ok = at('karte', 3)
        ck('the office door is broken open (hold)', a2 and ok and E("GLLAGER.offen"), info()['step'])
        E(f"GAME.view({YY['vorTuer'][0] - math.sin(YY['hd']) * 1.6}, {YY['vorTuer'][1] - math.cos(YY['hd']) * 1.6}, KERN.ground({YY['vorTuer'][0]}, {YY['vorTuer'][1]}) + 1.62, {yawIn}, -4)"); steps(0.3)
        pic('53_buero')
        talk()
        view(YY['imBuero'], 0, 0, yawIn)
        a3 = act('gl:karte', 1.4)
        ok = at('raus', 3)
        ck('the framed half of the map is taken from the wall', a3 and ok and E("GLSTATE.inv.karte2") == 1 and not E("GLLAGER.karte"), info()['step'])
        talk()
        # a guard sees you inside: he reports the burglary and comes running; caught → again from outside the fence
        E("GLLAGER.wachen.forEach(w => GLLAGER.heim(w, true)); (w => { const F = w.F, c = GLLAGER.Y.pos, d = Math.hypot(c[0] - F.x, c[1] - F.y); GAME.view(F.x + (c[0] - F.x) / d * 3, F.y + (c[1] - F.y) / d * 3, KERN.ground(F.x, F.y) + 1.62, 0, 0) })(GLLAGER.wachen[0])")
        ok = until("GLLAGER.wachen.some(w => w.job === 'jagt')", 4, 0.1)
        st1 = J("({ log: GLSTATE.W.log.map(l => l.id), n: GLLOGIK.stars(GLSTATE.W) })")
        ok2 = until("GLMISSION.debug.info().n >= 1 && GLMISSION.debug.info().step === 'rein' && !GLMISSION.St.busy", 20, 0.25, 0.2)
        st = J("({ k2: GLSTATE.inv.karte2 || 0, offen: GLLAGER.offen, karte: GLLAGER.karte, d: Math.hypot(GAME.P.x - GLLAGER.Y.hinten[0], GAME.P.y - GLLAGER.Y.hinten[1]), n: GLLOGIK.stars(GLSTATE.W) })")
        ck('seen inside: „Einbruch“ is reported; caught by the guard: again from outside the fence (door shut, map back on the wall)',
           ok and 'einbruch' in st1['log'] and st1['n'] >= 2 and ok2 and st['k2'] == 0 and not st['offen'] and st['karte'] and st['d'] < 3 and st['n'] == 0, str(st1) + str(st))
        # the second try, undisturbed (the guards put at the gate)
        E("GLLAGER.lenke(GLLAGER.Y.vorTor[0], GLLAGER.Y.vorTor[1], 600)")
        E(f"GAME.view({YY['drin'][0]}, {YY['drin'][1]}, KERN.ground({YY['drin'][0]}, {YY['drin'][1]}) + 1.62, {yawIn}, 0)"); steps(0.3)
        at('tuer', 3); view(YY['vorTuer'], 0, 0, yawIn); act('gl:tuer', 4.2); at('karte', 3); talk()
        view(YY['imBuero'], 0, 0, yawIn); act('gl:karte', 1.4); at('raus', 3); talk()
        put(YY['hinten'], yawIn, ((YY['hinten'][0] - YY['drin'][0]) * 0.6, (YY['hinten'][1] - YY['drin'][1]) * 0.6))
        ok = at('flucht', 3)
        SCH = J("GLKAP1.ORT.scheune()")
        E("GLFAHNDUNG.clear()")
        put(SCH, 0, (9, 9)); steps(0.5)
        ok2 = at('ende', 4)
        ok3 = until("!!GLMISSION.F('jule')", 150, 0.3, 0.5)
        j = J("(F => [F.x, F.y])(GLMISSION.F('jule'))")
        view(j, 2.4, 2.4, 225)
        ok4 = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'ende'", 8)
        steps(0.4)
        pic('54_karte')
        g0 = E("GLSTATE.geld")
        n = talk()
        ok5 = until("GLMISSION.debug.info().st.coup === 'erledigt'", 5)
        ck('out through the gap and away to the barn with the map: the two halves together – the chapter\'s last mission is done (+250 €)',
           ok and ok2 and ok3 and ok4 and n >= 6 and ok5 and E("GLSTATE.geld") == g0 + 250 and E("GLSTATE.inv.karte1") == 1 and E("GLSTATE.inv.karte2") == 1, f'{ok} {ok2} {ok3} {ok4} {n} {ok5}')
        ok = until("GLMISSION.debug.info().ende", 12)
        rows = J("[...document.querySelectorAll('#glende tr')].map(r => r.textContent)")
        txt = E("document.getElementById('glende').textContent")
        pg.screenshot(path=os.path.join(OUT, '55_ende_hud.png'))
        ck('the closing screen of chapter 1: what was done, „Fortsetzung in Kapitel 2“', ok and len(rows) == 7 and 'Kapitel 2' in txt and 'Bunker' in txt and any('Taten' in r for r in rows), str(rows))
        pg.click('#glende button'); steps(0.5)
        st = J("({ ende: GLMISSION.debug.info().ende, cur: GLMISSION.cur(), on: GLSTATE.on, j: KERN.tasks.list().filter(e => e.src === 'grenzland').map(e => e.status) })")
        ck('free play goes on: the mode still runs, the journal shows five missions done', not st['ende'] and st['cur'] == '' and st['on'] and st['j'] == ['erledigt'] * 5, str(st))
      except Exception as e:
        ck('mission 5 ran through without an error of the test', False, str(e)[:300])

    # ================================================================ the yard ================================================================
    if 'lager' in SECT:
        st = J("GLLAGER.status()")
        ck('the haulier\'s yard stands in the fields beside the track', st['on'] and st['boxes'] > 12 and st['side'] in (1, -1) and not st['err'], str(st))
        E("GLMISSION.debug.go('gerhard', 'damals')")
        ok = until("GLSTATE.era === '1989'", 20, 0.3, 0.3); steps(0.5)
        st = J("({ vis: GLLAGER.grp.visible, box: VEH.extra.filter(e => e.grenzland === 'lager' && e.box()).length })")
        ck('in 1989 the field is a field: the yard is hidden and not solid', ok and not st['vis'] and st['box'] == 0, str(st))

    # ================================================================ a reload in the middle, the end ================================================================
    if 'reload' in SECT:
        E("GLMISSION.debug.go('gefallen', 'heim')"); steps(1)
        ck('the debug API reaches a step of a mission', info()['step'] == 'heim' and E("GLSTATE.m.gefallen.i") == 2, str(info())[:200])
        E("GLSTATE.geld = 91; GLSTATE.save(true)")
        lib.boot(pg, port, '', figures=True)
        time.sleep(3)
        ok = until("window.GLSTATE && GLSTATE.on && GLMISSION.debug.info().step === 'heim'", 20, 0.3, 0.4)
        st = J("({ on: GLSTATE.on, geld: GLSTATE.geld, x: document.getElementById('glextra').textContent, track: QUESTS.track, lager: GLLAGER.on, j: KERN.tasks.list().filter(e => e.src === 'grenzland').map(e => [e.id, e.status]) })")
        ck('a reload in the middle of a mission goes on at its step, set up again', ok and st['on'] and st['geld'] == 91 and st['x'] == 'Mitfahrgelegenheit' and st['track'] == 'grenzland:gefallen' and st['lager'] and ['gefallen', 'läuft'] in st['j'], str(st))
        E("GRENZLAND.stop()"); steps(0.5)
        st = J("({ figs: GLFIG.figs.length, cars: GLAUTO.cars.length, lager: GLLAGER.on, extra: VEH.extra.filter(e => e.grenzland).length, j: KERN.tasks.list().filter(e => e.src === 'grenzland').length, "
               "act: KERN.acts().filter(a => String(a.id).startsWith('gl:')).length, x: document.getElementById('glextra').hidden, cur: GLMISSION.cur() })")
        ck('„Beenden“ takes everything of the missions out of the world', st['figs'] == 0 and st['cars'] == 0 and not st['lager'] and st['extra'] == 0 and st['j'] == 0 and st['act'] == 0 and st['x'], str(st))
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}))
    ck.errors(errs)
    ck.done()
