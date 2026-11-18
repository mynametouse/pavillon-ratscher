# feat/grenzland-kapitel2 (18.11.2026): chapter 2 „Kolonnenweg“ of the mode „Grenzland“ – the opening after chapter 1 and mission 2
# „Ein Auto für die Nacht“ (cracking a Wartburg, the owner as a witness, repainting, other plates, the haulier's jacket), played through by
# the test like viz3/test/grenzland_mission.py: where a human would walk or drive for minutes the test puts the player there, every step is
# finished by its real check; talks are skipped with the action a player has (GLMISSION.weiter). Sections (second argument, comma
# separated; default all): start m2 knacken m1. Pictures in out/grenzland_kapitel2/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 9062 --serve grenzland_kapitel2:start,m2
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
SECT = [s for s in (sys.argv[2] if len(sys.argv) > 2 else 'start,m2,knacken').split(',') if s]
ck = grenzland_ci.wrap(lib.Checks('grenzland_kapitel2'), 'grenzland_kapitel2')
OUT = lib.out('grenzland_kapitel2')
# chapter 1 done, nothing of chapter 2 yet: free play on a Friday evening in the garden
KAP1 = ("(() => { GLMISSION.stop(); for (const id of ['gefallen', 'clique', 'gerhard', 'klinge', 'coup']) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; "
        "for (const id of ['k2m1', 'k2m2']) delete GLSTATE.m[id]; GLSTATE.cur = ''; GLSTATE.kap = 1; GLSTATE.kap1 = true; GLHUD.fade(false); "
        "if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; if (window.DN && DN.active) DN.update(true); "
        "GAME.go('garten'); GLSTATE.save(true); })()")
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    # (mission 1 is off in the preview – switched on for its own section before the page loads; run m1 alone)
    if 'm1' in SECT: pg.add_init_script("window.GLK2_M1 = true")
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
        for _ in range(int(secs / dt) + 1):
            if E(cond): return True
            steps(dt)
            if real: time.sleep(real)
        return bool(E(cond))
    def talk(maxn=40):
        n = 0
        while n < maxn and E("GLMISSION.redet()"):
            E("GLMISSION.weiter()"); steps(0.1); n += 1
        return n
    def at(step, secs=30):
        ok = until(f"GLMISSION.debug.info().step === '{step}' && !GLMISSION.St.busy", secs)
        if not ok: print('   not at', step, info())
        return ok
    def bis(step, secs=25):
        """wait for a step, skipping the talks on the way as a player would (Space)"""
        for _ in range(int(secs / 0.25) + 1):
            if E(f"GLMISSION.debug.info().step === '{step}' && !GLMISSION.St.busy"): return True
            if E("GLMISSION.redet()"): E("GLMISSION.weiter()")
            steps(0.25); time.sleep(0.03)
        print('   not at', step, info())
        return False
    def put(p, yaw=0, off=(0, 0)):
        E(f"GRENZLAND.hin({p[0] + off[0]}, {p[1] + off[1]}, {yaw})"); steps(0.3)
    def act(aid, hold=0.0):
        ok = E(f"(() => {{ const a = KERN.acts().find(a => a.id === '{aid}'); if (!a || !a.label()) return false; PLAY.run(a); return true }})()")
        if ok and hold: steps(hold + 0.4)
        return ok
    def view(p, dx, dy, yaw, pitch=-6, h=1.62):
        E(f"GAME.view({p[0] + dx}, {p[1] + dy}, KERN.ground({p[0] + dx}, {p[1] + dy}) + {h}, {yaw}, {pitch})"); steps(0.3)
    yawTo = lambda a, b: math.degrees(math.atan2(b[0] - a[0], b[1] - a[1])) % 360
    E("window.__ev = []; KERN.on('*', (d, n) => { if (n === 'grenzland:mission' || n === 'grenzland:kapitel' || n === 'grenzland:knacken') __ev.push([n.slice(10), d.id || d.kap, d.st, d.titel || '', d.lohn || '']) }); 0")
    # (the first mission's opening – the fade, the town – finishes before anything else)
    until("GLMISSION.debug.info().step === 'ankunft' && !!GLMISSION.St.S.da", 120, 0.5, 0.3)
    talk()

    # ================================================================ start · the chapter opens after chapter 1 ================================================================
    if 'start' in SECT:
      try:
        E(KAP1); steps(1)
        ok = until("GLHUD.xl === 'Kapitel 2 beginnen'", 20, 0.5, 0.05)
        st = J("({ cur: GLMISSION.cur(), j: KERN.tasks.list().filter(e => e.src === 'grenzland').map(e => [e.id, e.status]), kap: GLSTATE.kap, i: GLKAP2.debug.info() })")
        ck('free play after chapter 1: chapter 2 is offered on the panel („Kapitel 2 beginnen“), its missions are still a secret',
           ok and st['cur'] == '' and st['kap'] == 1 and [s for _, s in st['j']] == ['erledigt'] * 5, str(st))
        E("void GLHUD.acts.extra()")
        ok = until("GLMISSION.cur() === 'k2m2' && GLMISSION.debug.info().step === 'scheune'", 10)
        ok2 = until("!!GLMISSION.St.S.da && !document.getElementById('glfade').classList.contains('on')", 40, 0.25, 0.1)
        st = J("({ d: DN.dateStr(CLOCK.t, true), m: Math.floor(CLOCK.t) % 1440, kap: GLSTATE.kap, wx: window.WETTER ? WETTER.state().preset : 'kein WETTER', "
               "p: [GAME.P.x, GAME.P.y], ich: GLKAP2.debug.hof().ich, t: document.getElementById('glmtitel').textContent, track: QUESTS.track })")
        ck('„Drei Monate später“: Friday, 4 December 2026, 16:40, snow – the two at the field barn, the chapter\'s card „Kapitel 2 – Vorabversion · Kolonnenweg“',
           ok and ok2 and '4. Dezember 2026' in st['d'] and abs(st['m'] - 1000) < 8 and st['kap'] == 2 and st['wx'] in ('schnee', 'kein WETTER')
           and math.hypot(st['p'][0] - st['ich'][0], st['p'][1] - st['ich'][1]) < 3 and 'Kolonnenweg' in st['t'] and 'Vorabversion' in st['t'] and st['track'] == 'grenzland:k2m2', str(st))
        ok = until("['jule', 'timo', 'basti', 'gerhard'].every(k => GLMISSION.F(k))", 90, 0.3, 0.4)
        ck('the clique and Gerhard wait at the barn (winter hats)', ok, str(info()['figs']))
        steps(0.5)
        pic('01_dezember_scheune')
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2auftakt'", 12)
        steps(1.5)
        kino = E("GLKAMERA.on()")
        E("GLMISSION.weiter()"); steps(0.4); E("GLMISSION.weiter()"); steps(1.2)
        pic('02_szene_gerhard')
        n = talk()
        ck('the scene as a cutscene: the crate was evidence with Westgeld, its driver was Krähwinkel, the stranger asks for Lutz', ok and kino and n >= 10, f'{ok} kino {kino} {n} lines')
        ok = at('spur', 6)
        ok2 = until("!!GLMISSION.C('k2lkw')", 10)
        steps(3)
        st = J("({ sms: GLSTATE.sms.map(q => q.von + ': ' + q.text.slice(0, 26)), c: (c => c ? [c.typ, Math.round(c.x), Math.round(c.y)] : null)(GLMISSION.C('k2lkw')), ziel: GLKAP2.debug.lkw() })")
        ck('the traitor\'s first trace: a lorry of the haulier on the field track, a message „Schöne Grüße in die Feldscheune“',
           ok and ok2 and st['c'] and st['c'][0] == 'koffer' and any('Schöne Grüße' in q for q in st['sms']), str(st))
        L = st['ziel']['p']; H = J("GLKAP2.debug.hof().ich")
        view(H, 0, 0, yawTo(H, L), -4)
        pic('03_lkw_feldweg')
        E("void GLHANDY.open()"); steps(0.4); E("void GLHANDY.close()"); steps(0.4); time.sleep(0.2); steps(0.4)
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2spur'", 8)
        talk()
        ck('they talk about it – who knew they were there? (the lorry drives off)', ok and bis('nacht', 15), info()['step'])
        put(J("GLDATA.ORTE.garten.pos"), 0, (2, 2))
        ok = until("GLMISSION.debug.info().step === 'treff' && !document.getElementById('glfade').classList.contains('on')", 30, 0.25, 0.2)
        steps(1)
        st = J("({ d: DN.dateStr(CLOCK.t, true), m: Math.floor(CLOCK.t) % 1440, t: GLMISSION.debug.info().titel, chat: GLSTATE.feed.slice(-4).map(q => q.text ? q.text.slice(0, 20) : ''), "
               "j: KERN.tasks.list().filter(e => e.src === 'grenzland').map(e => [e.id, e.status, e.title]) })")
        ck('the night in the garden: Saturday, 5 December, 10:20 – mission 2 „Ein Auto für die Nacht“ begins with its title card (Kapitel 2 · Mission 2)',
           ok and 'Samstag, 5. Dezember' in st['d'] and abs(st['m'] - 620) < 10 and st['t'] == 'Ein Auto für die Nacht' and ['k2m2', 'läuft', 'Ein Auto für die Nacht'] in st['j'], str(st))
        pic('04_samstag_garten')
      except Exception as e:
        ck('the opening ran through without an error of the test', False, str(e)[:300])

    # ================================================================ m2 · Ein Auto für die Nacht ================================================================
    if 'm2' in SECT:
      try:
        E(KAP1); steps(0.5)
        E("GLMISSION.debug.go('k2m2', 'treff')"); steps(0.5)
        H = J("GLKAP2.debug.hof()")
        put(H['ich'], H['ichYaw'])
        ok = until("['jule', 'timo', 'basti'].every(k => GLMISSION.F(k))", 90, 0.3, 0.4)
        st = J("({ kap: GLSTATE.kap, d: DN.dateStr(CLOCK.t, true), sms: GLSTATE.sms.map(q => q.von), t: GLMISSION.debug.info().titel })")
        ck('mission 2: at the barn on Saturday, 5 December – a message from Jule, the clique waits', ok and st['kap'] == 2 and '5. Dezember' in st['d'] and 'Jule' in st['sms'], str(st))
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2auto'", 15)
        steps(1)
        pic('10_plan_scheune')
        n = talk()
        ok2 = at('abend', 6)
        st = J("({ draht: GLSTATE.inv.draht || 0, jacke: GLSTATE.inv.arbeitsjacke || 0, x: GLHUD.xl })")
        ck('the plan: Fiedler\'s Wartburg, wire and the haulier\'s work jacket from Timo; „Bis zum Abend warten“', ok and n >= 9 and ok2 and st['draht'] == 1 and st['jacke'] == 1 and st['x'] == 'Bis zum Abend warten', str(st))
        E("void GLHUD.acts.extra()")
        ok = until("(m => m >= 17 * 60 + 30)(Math.floor(CLOCK.t) % 1440) && !CLOCK.warp", 60, 0.5, 0.05)
        st = J("({ m: Math.floor(CLOCK.t) % 1440, fest: window.GLFESTE && GLFESTE.aktiv() ? GLFESTE.aktiv().id : '' })")
        ck('the evening: the Christmas market of Schleusingen is open', ok and st['fest'] == 'weihnachtsmarkt', str(st))
        Z = J("GLDATA.ORTE.zh.pos")
        put(Z, 90, (-30, 0))
        ok = until("(z => !z || z.state === 'ready' || z.state === 'error')(KERN.zones().find(z => z.id === 'schleusingen'))", 150, 0.5, 0.4)
        steps(2)
        PK = J("GLKAP2.debug.park()")
        D0 = J("GLKNACKEN.tuer('fiedler')")
        put(D0, yawTo(D0, PK['p']), (-12, -6))
        ok2 = at('knacken', 10)
        ok3 = until("!!GLMISSION.F('fiedler') || !(GLFESTE.aktiv())", 60, 0.3, 0.4)
        st = J("GLKNACKEN.stand()")
        ck('Schleusingen: the white Wartburg at the kerb by the Zentralhaltestelle, a car of today behind it; Fiedler at the mulled wine',
           ok and ok2 and ok3 and st['welt']['fiedler']['sichtbar'] and st['welt']['nachbar']['sichtbar'] and st['autos']['fiedler']['kz'] == 'HBN-RF 53' and not st['autos']['fiedler']['offen'], str(st)[:400])
        view(PK['p'], -7, -7, 45, -8, 1.8)
        pic('11_wartburg')
        M = J("GLFESTE.aktiv() ? [GLFESTE.aktiv().x, GLFESTE.aktiv().y] : null")
        if M:
            view(M, -24, -18, yawTo((M[0] - 24, M[1] - 18), M), -6, 1.75)
            pic('12_markt')
        # a car of today: its alarm
        N0 = J("GLKNACKEN.tuer('nachbar')")
        put(N0, 90)
        a1 = act('gl:kn:nachbar:neu', 1.4)
        steps(0.5)
        st = J("({ al: GLKNACKEN.stand().welt.nachbar.alarm, ev: __ev.filter(e => e[0] === 'knacken').map(e => e[2]) })")
        ck('a car of today refuses: immobiliser and alarm', a1 and st['al'] > 0 and 'alarm' in st['ev'], str(st))
        view(PK['hinter'], -5, -5, 45, -6, 1.7)
        pic('13_alarm')
        steps(9)
        # the Wartburg with the wire (held)
        D0 = J("GLKNACKEN.tuer('fiedler')")
        put(D0, yawTo(D0, PK['p']))
        lab = E("(a => a ? a.label() : null)(KERN.acts().find(a => a.id === 'gl:kn:fiedler:draht'))")
        a2 = act('gl:kn:fiedler:draht', 8.4)
        ok = until("!!VEH.cur && VEH.cur.id === 'gl-wartburg'", 6)
        ok2 = at('weg', 6)
        ck('cracked with the wire (E held, 8 s): in the Wartburg, the engine runs', lab == 'Mit Draht öffnen' and a2 and ok and ok2 and E("GLKNACKEN.auto('fiedler').offen"), f'{lab} {a2} {ok} {ok2}')
        steps(4)
        st = J("({ s: GLFAHNDUNG.stand(), a: GLKNACKEN.auto('fiedler') })")
        ck('Fiedler sees his car go and calls the police: wanted, the police know the vehicle', st['s']['sterne'] >= 1 and st['s']['wissen']['fahrzeug'] and st['a']['gestohlen'] and st['a']['bekannt']['kz'] == 'HBN-RF 53', str({k: st['s'][k] for k in ('sterne', 'wissen', 'fz')}) + str(st['a']['bekannt']))
        E("(v => GAME.view(v.st.x - 6, v.st.y - 6, v.st.z + 2.2, 45, -10))(VEH.cur)")
        pic('14_fiedler_ruft', False)
        # to the barn (the drive is skipped; the police are lost on the way as a human would lose them)
        # (half under the roof along the barn's open front, as one would park it – not among the den's furniture)
        SC = J("(() => { const b = GLORTE.P.scheune, t = GLORTE.P.treff, d = Math.hypot(t[0] - b[0], t[1] - b[1]), u = [(t[0] - b[0]) / d, (t[1] - b[1]) / d]; "
               "return { p: [b[0] + u[0] * 1.7, b[1] + u[1] * 1.7], hd: Math.atan2(u[1], -u[0]) }; })()")
        E(f"VEH.place('gl-wartburg', {SC['p'][0]}, {SC['p'][1]}, {SC['hd']})"); steps(0.5)
        E("GLFAHNDUNG.clear()"); steps(1.5)
        ok = at('lackieren', 8)
        E("VEH.exit()"); steps(0.6)
        ok2 = until("['jule', 'timo', 'basti'].every(k => GLMISSION.F(k))", 90, 0.3, 0.4)
        talk()
        v = J("(v => [v.st.x, v.st.y])(VEH.by['gl-wartburg'])")
        put(v, 0, (1.6, 1.2))
        a3 = act('gl:k2lack')
        steps(0.3)
        E("GLHUD.pick(0)")
        ok3 = until("GLKNACKEN.auto('fiedler').farbe === 'dunkelblau' && !document.getElementById('glfade').classList.contains('on')", 20, 0.25, 0.2)
        st = J("({ a: GLKNACKEN.auto('fiedler'), fz: GLSTATE.W.fz })")
        ck('in the barn: repainted (the colour chosen: dark blue) – the police lose the vehicle', ok and ok2 and a3 and ok3 and st['a']['farbe'] == 'dunkelblau' and not st['fz'], str(st))
        ok = bis('schilder', 25)
        view(v, -5.5, -3.5, yawTo((v[0] - 5.5, v[1] - 3.5), v), -10, 1.7)
        pic('15_lackiert')
        put(v, 0, (1.6, 1.2))
        a4 = act('gl:k2schild', 4.4)
        talk()
        st = J("GLKNACKEN.auto('fiedler')")
        ck('the plates of Basti\'s old Golf (E held)', ok and a4 and st['kz'] == 'HBN-BM 47', str(st))
        E("(v => { const p = VEH.toW(v, 0, -4.2); GAME.view(p[0], p[1], v.st.z + 1.2, (v.st.psi * 180 / Math.PI), -8); })(VEH.by['gl-wartburg'])"); steps(0.3)
        pic('16_schilder')
        ok = bis('jacke', 25)
        a5 = act('gl:k2jacke')
        steps(0.5)
        j = J("(F => [F.x, F.y])(GLMISSION.F('jule'))")
        put(j, 0, (1.6, 1.6))
        ok2 = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2jacke'", 8)
        pic('17_jacke')
        ok3 = bis('ende', 25)
        ok4 = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2ende'", 8)
        talk()
        ok5 = until("GLMISSION.debug.info().st.k2m2 === 'erledigt'", 8)
        ck('the haulier\'s jacket on (orange, „Spedition Krähwinkel“) – mission 2 done', ok and a5 and E("GLFAHNDUNG.kleidVon[GLSTATE.wer]") == 'warn' and ok2 and ok3 and ok4 and ok5, f'{ok} {a5} {ok2} {ok3} {ok4} {ok5}')
        ok = until("document.getElementById('glmtitel').textContent.includes('Fortsetzung folgt')", 25, 0.25, 0.1)
        st = J("({ ev: __ev.filter(e => e[0] === 'mission' && e[2] === 'erledigt').map(e => e.slice(1)), sv: SAVE.get('pav-gl-knacken-v1') })")
        ck('„Mission bestanden“ with title and reward; „Fortsetzung folgt“; the car is saved (dark blue, other plates, stolen)',
           ok and ['k2m2', 'erledigt', 'Ein Auto für die Nacht', 'Ein Wartburg ohne Vergangenheit'] in st['ev'] and st['sv']['autos']['fiedler']['farbe'] == 'dunkelblau' and st['sv']['autos']['fiedler']['gestohlen'], str(st)[:400])
        pic('18_ende')
        E("GRENZLAND.stop()"); steps(0.5)
        st = J("({ v: VEH.by['gl-wartburg'] ? VEH.by['gl-wartburg'].g.visible : null, w: Object.keys(GLKNACKEN.S.welt), act: KERN.acts().filter(a => /^gl:(kn|k2)/.test(String(a.id))).length, x: GLHUD.xl, wx: window.WETTER ? WETTER.state().preset : null })")
        ck('„Beenden“: the car is put away, no actions stay, the weather is the player\'s again', st['v'] is False and st['w'] == [] and st['act'] == 0 and not st['x'] and st['wx'] != 'schnee', str(st))
      except Exception as e:
        ck('mission 2 ran through without an error of the test', False, str(e)[:300])
    # ================================================================ knacken · GLKNACKEN alone: the window, the wires, the report, paint, plates, saved ================================================================
    if 'knacken' in SECT:
      try:
        # (free play with chapter 2 out of the way: at the barn it would begin)
        E(KAP1 + "; GLSTATE.m.k2m2 = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.m.k2m1 = { st: 'erledigt', i: 0, n: 0 }"); steps(0.5)
        H = J("GLKAP2.debug.hof()")
        q = J("GLKAP2.debug.hof().at(10, 5)")
        c = J(f"GLKNACKEN.stelle('probe', {{ typ: 'wartburg', alt: true, x: {q[0]}, y: {q[1]}, hd: 1.2, farbe: 'pastellweiss', kz: 'HBN-PR 1', neu: true }})")
        steps(1.5)
        st = J("({ s: GLKNACKEN.stand().welt.probe, z: (v => v.st.z - KERN.ground(v.st.x, v.st.y))(VEH.by['gl-wartburg']), lab: (a => a ? a.label() : 'kein')(KERN.acts().find(a => a.id === 'veh:gl-wartburg')) })")
        ck('a Wartburg of the story stands on the ground, locked (no „Einsteigen“)', st['s']['fahrbar'] and st['s']['sichtbar'] and abs(st['z']) < 0.3 and st['lab'] is None, str(st))
        D0 = J("GLKNACKEN.tuer('probe')")
        E("if (GLSTATE.inv.draht) GLSTATE.use('draht', GLSTATE.inv.draht)")
        put(D0, yawTo(D0, q))
        a0 = act('gl:kn:probe:draht', 0.6)
        ck('without a wire the wire does not work', a0 and not E("GLKNACKEN.offen('probe')"), str(a0))
        n0 = E("GLSTATE.W.log.length")
        a1 = act('gl:kn:probe:scheibe', 1.5)
        st = J("({ a: GLKNACKEN.auto('probe'), s: GLKNACKEN.stand().welt.probe, log: GLSTATE.W.log.slice(" + str(n0) + ").map(l => l.id) })")
        ck('the window: glass on the ground, a deed heard around (Fahrzeugdiebstahl), the wires still to do', a1 and st['a']['scheibe'] and not st['a']['offen'] and st['s']['splitter'] and 'autoklau' in st['log'], str(st))
        E(f"GAME.view({D0[0] - 2.2}, {D0[1] - 1.6}, KERN.ground({D0[0]}, {D0[1]}) + 1.5, {yawTo((D0[0] - 2.2, D0[1] - 1.6), D0)}, -32)"); steps(0.3)
        pic('30_scheibe')
        put(D0, yawTo(D0, q))
        a2 = act('gl:kn:probe:kurz', 3.6)
        ok = until("!!VEH.cur && VEH.cur.id === 'gl-wartburg'", 4)
        ck('the wires: in, the engine runs', a2 and ok and E("GLKNACKEN.offen('probe')"), str(a2))
        E("GLKNACKEN.melde('probe', 'Probe')"); steps(1)
        st = J("({ n: GLLOGIK.stars(GLSTATE.W), fz: GLSTATE.W.fz, b: GLKNACKEN.auto('probe').bekannt })")
        ck('the owner\'s report while one sits in it: wanted, the vehicle known (colour and plate in the report)', st['n'] >= 1 and st['fz'] and st['b']['kz'] == 'HBN-PR 1', str(st))
        E("GLFAHNDUNG.clear()")
        E("VEH.exit()"); steps(0.5)
        ok1 = E("GLKNACKEN.lackieren('probe', 'weinrot')")
        ok2 = E("GLKNACKEN.schildern('probe', 'HBN-PR 2')")
        st = J("({ a: GLKNACKEN.auto('probe'), fz: GLSTATE.W.fz, mat: (v => { let c = null; v.g.traverse(o => { if (o.isMesh && o.name === 'lack0' && !c) c = o.material.color.getHexString(); }); return c; })(VEH.by['gl-wartburg']), sv: SAVE.get('pav-gl-knacken-v1').autos.probe })")
        ck('repainted (wine red) and other plates: the paint shows, the police lose the vehicle, it is saved', ok1 and ok2 and st['a']['farbe'] == 'weinrot' and not st['fz'] and st['sv']['kz'] == 'HBN-PR 2' and st['mat'] not in (None, 'ffffff'), str(st))
        v = J("(v => [v.st.x, v.st.y, v.st.psi])(VEH.by['gl-wartburg'])")
        E(f"GAME.view({v[0] - 5}, {v[1] - 4}, KERN.ground({v[0]}, {v[1]}) + 1.7, {yawTo((v[0] - 5, v[1] - 4), v)}, -8)"); steps(0.3)
        pic('31_weinrot')
        E("GRENZLAND.stop()"); steps(0.5)
        st1 = J("({ w: Object.keys(GLKNACKEN.S.welt), v: VEH.by['gl-wartburg'].g.visible })")
        E("GRENZLAND.start()"); steps(1)
        st2 = J("({ s: GLKNACKEN.stand().welt.probe || null, a: GLKNACKEN.auto('probe') })")
        ck('„Beenden“ puts the car away; the next start sets the stolen car up again where it was (for the missions that follow)',
           st1['w'] == [] and st1['v'] is False and st2['s'] and st2['s']['sichtbar'] and abs(st2['s']['x'] - v[0]) < 0.5 and st2['a']['farbe'] == 'weinrot', str(st1) + str(st2))
        E("GLKNACKEN.weg('probe'); (s => { delete s.autos.probe; GLKNACKEN.save(); })(GLKNACKEN.S)")
      except Exception as e:
        ck('knacken ran through without an error of the test', False, str(e)[:300])

    # ================================================================ m1 · Grünes Band (against the zone's stand-in; mission 1 is off in the preview) ================================================================
    if 'm1' in SECT:
      try:
        E(KAP1); steps(0.5)
        E("GLKAP2.debug.zone(window.GLZONE && GLZONE.ort && GLZONE.ort('bunker') ? undefined : null)")
        E("GLMISSION.debug.go('k2m1', 'aufbruch')"); steps(0.5)
        ok = until("GLMISSION.debug.info().titel === 'Grünes Band'", 30, 0.25, 0.05)
        st = J("({ sms: GLSTATE.sms.map(q => q.von + ': ' + q.text.slice(0, 20)), x: GLHUD.xl, tank: GLSTATE.tank, moped: !!(GLAUTO.moped && GLAUTO.moped.g.visible), d: DN.dateStr(CLOCK.t, true), ersatz: GLKAP2.ersatz(), wx: window.WETTER ? WETTER.state().preset : '' })")
        ck('mission 1 „Grünes Band“ (Kapitel 2 · Mission 1): a message from Jule, the Simson in the garden (full), „Hinfahren“', ok and any(q.startswith('Jule') for q in st['sms']) and st['x'] == 'Hinfahren' and st['tank'] >= 3 and st['moped'] and 'Dezember' in st['d'], str(st))
        pic('20_aufbruch')
        m0 = E("CLOCK.t")
        E("void GLHUD.acts.extra()")
        ok = until("!GLMISSION.St.busy && !document.getElementById('glfade').classList.contains('on')", 40, 0.25, 0.2)
        PK = J("GLKAP2.ort('parkplatz')")
        st = J("({ dm: CLOCK.t - " + str(m0) + ", d: Math.hypot(GAME.P.x - " + str(PK[0]) + ", GAME.P.y - " + str(PK[1]) + "), m: GLAUTO.moped ? Math.hypot(GLAUTO.moped.st.x - " + str(PK[0]) + ", GLAUTO.moped.st.y - " + str(PK[1]) + ") : 99 })")
        ck('„Hinfahren“: half an hour later at the car park by the border tower, the Simson beside', ok and 28 < st['dm'] < 45 and st['d'] < 6 and st['m'] < 4, str(st))
        ok = bis('museum', 10)
        ok2 = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2museum'", 20)
        steps(0.6)
        pic('21_grenzturm')
        n = talk()
        ck('Sarah on the crossing point Eisfeld–Rottenbach (1973) and the Grünes Band (Hof, 9 December 1989)', ok and ok2 and n >= 3 and bis('kolonnenweg', 10), info()['step'])
        B = J("(B => ({ b: B.b, s: B.s, van: B.van, vorn: B.vorn, men: B.men.map(m => m[2]), fremder: B.fremder }))(GLKAP2.debug.bp())")
        p = J("GLK2LOGIK.entlang(GLKAP2.weg(), 160)")
        E("VEH.enter('gl-moped')"); steps(0.3)
        E(f"VEH.place('gl-moped', {p['x']}, {p['y']}, {p['hd']})"); steps(1)
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2platten'", 6)
        talk()
        E("(v => GAME.view(v.st.x - Math.sin(v.st.psi) * 6, v.st.y - Math.cos(v.st.psi) * 6, v.st.z + 2.2, v.st.psi * 180 / Math.PI, -10))(VEH.cur)")
        pic('22_kolonnenweg', False)
        p = J(f"GLK2LOGIK.entlang(GLKAP2.weg(), {B['s']} - 100)")
        E(f"VEH.place('gl-moped', {p['x']}, {p['y']}, {p['hd']})"); steps(1)
        ok2 = bis('bunker', 8)
        ok3 = until("['w1', 'w2', 'w3'].every(k => GLMISSION.F(k)) && !!GLMISSION.C('k2van')", 90, 0.3, 0.4)
        st = J("({ i: GLMISSION.debug.info(), e: GLKAP2.ersatz() })")
        ck('on the Kolonnenweg (the slabs, Sarah) into the heath; at the bunker Krähwinkel\'s van and three men', ok and ok2 and ok3 and ('k2bunker' in st['i']['dinge'] or not st['e']), str(st['i'])[:300])
        E("VEH.exit()"); steps(0.4)
        put(B['vorn'], yawTo(B['vorn'], B['b']))
        E(f"GAME.view({B['vorn'][0]}, {B['vorn'][1]}, KERN.ground({B['vorn'][0]}, {B['vorn'][1]}) + 1.62, {yawTo(B['vorn'], B['b'])}, -2)"); steps(0.3)
        pic('23_bunker_fern')
        # too loud: the moped is heard – on foot they come and catch one
        w3 = B['men'][2]
        E("VEH.enter('gl-moped')"); steps(0.3)
        E(f"VEH.place('gl-moped', {w3[0] + 24}, {w3[1] + 24}, 0)"); steps(3)
        al = E("GLKAP2.K1.job") == 'jagt'
        E("VEH.exit()"); steps(0.3)
        caught = until("GLMISSION.debug.info().n >= 1 && GLMISSION.debug.info().step === 'bunker' && !GLMISSION.St.busy", 40, 0.25, 0.05)
        ck('a moped is heard: they come running – caught on foot, again from the edge of the heath', al and caught and E(f"Math.hypot(GAME.P.x - {B['vorn'][0]}, GAME.P.y - {B['vorn'][1]})") < 4, f'{al} {caught}')
        # from the side, ducked, within 40 m
        b = B['b']; v0 = B['van']
        ux, uy = (b[0] - v0[0]), (b[1] - v0[1]); dd = math.hypot(ux, uy); ux /= dd; uy /= dd
        side = (b[0] + uy * 31 - ux * 6, b[1] - ux * 31 - uy * 6)
        E(f"GAME.view({side[0]}, {side[1]}, KERN.ground({side[0]}, {side[1]}) + 1.1, {yawTo(side, b)}, 0); GAME.P.stance = 'crouch'"); steps(0.5)
        ok = bis('fotos', 10)
        a1 = act('gl:k2foto'); steps(1.3)
        ok2 = until("!!GLMISSION.F('fremder')", 60, 0.3, 0.3)
        f = J("(F => [F.x, F.y])(GLMISSION.F('fremder'))") if ok2 else None
        if f:
            E(f"GAME.view({side[0]}, {side[1]}, KERN.ground({side[0]}, {side[1]}) + 1.1, {yawTo(side, f)}, 0)"); steps(0.4)
            pic('24_fremder')
        a2 = act('gl:k2foto'); steps(0.6)
        ok3 = bis('rueckzug', 8)
        ck('two photos from cover (ducked, from the side); the stranger at the edge of the heath', ok and a1 and a2 and ok2 and ok3 and E("GLKAP2.K1.n") == 2, f'{ok} {a1} {a2} {ok2} {ok3}')
        E("GAME.P.stance = 'stand'")
        steps(6)
        st = J("({ v: GLKAP2.V1, men: ['w1', 'w2', 'w3'].map(k => !!GLMISSION.F(k)) })")
        c = J("(c => c ? [c.x, c.y, c.hd] : null)(GLMISSION.C('k2van'))")
        if c:
            E(f"GAME.view({c[0] - math.sin(c[2]) * -14}, {c[1] - math.cos(c[2]) * -14}, KERN.ground({c[0]}, {c[1]}) + 1.7, {math.degrees(c[2]) + 180}, -4)"); steps(0.2)
            pic('25_transporter', False)
        ck('the men pack up and get into the van, it drives the Kolonnenweg out', st['v']['fahrt'] and not any(st['men']), str(st))
        # in its way: seen – again from the bunker
        q = J("GLK2LOGIK.entlang(GLKAP2.weg(), Math.max(0, GLKAP2.V1.s - 14))")
        put([q['x'], q['y']], 0)
        seen = until("GLMISSION.debug.info().n >= 2 && GLMISSION.debug.info().step === 'rueckzug' && !GLMISSION.St.busy", 20, 0.25, 0.05)
        ck('in the van\'s way on the Kolonnenweg: seen – again from the bunker', seen, str(info())[:200])
        # away from the way, far
        far = (b[0] + uy * 330, b[1] - ux * 330)
        put(far, 0)
        ok = bis('heim', 60)
        st = J("({ sms: GLSTATE.sms.map(q => q.text.slice(0, 30)) })")
        ck('away from the way and out of the heath: a signal – the stranger\'s message („Ich will die Akte, nicht das Geld.“)', ok and any('Mein Vater stand 1989' in t or 'Ihr wart am Bunker' in t for t in st['sms']), str(st))
        talk()
        E("void GLHUD.acts.extra()")
        ok = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2heim1'", 40, 0.25, 0.2)
        talk()
        ok2 = until("GLMISSION.debug.info().st.k2m1 === 'erledigt'", 10)
        ev = J("__ev.filter(e => e[0] === 'mission' && e[2] === 'erledigt').map(e => e.slice(1))")
        ck('„Heimfahren“: home – mission 1 done („Zwei Fotos vom Bunker“)', ok and ok2 and ['k2m1', 'erledigt', 'Grünes Band', 'Zwei Fotos vom Bunker'] in ev, str(ev))
        pic('26_heim')
      except Exception as e:
        ck('mission 1 ran through without an error of the test', False, str(e)[:300])

    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}))
    ck.errors(errs)
    ck.done()
