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
        ck('they talk about it – who knew they were there? (the lorry drives off)', ok and at('nacht', 6), info()['step'])
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
        SC = J("GLORTE.P.scheune")
        E(f"VEH.place('gl-wartburg', {SC[0]}, {SC[1]}, (VEH.cur ? VEH.cur.st.psi : 0))"); steps(0.5)
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
        talk()
        view(v, -5.5, -3.5, yawTo((v[0] - 5.5, v[1] - 3.5), v), -10, 1.7)
        pic('15_lackiert')
        ok = at('schilder', 6)
        a4 = act('gl:k2schild', 4.4)
        talk()
        st = J("GLKNACKEN.auto('fiedler')")
        ck('the plates of Basti\'s old Golf (E held)', ok and a4 and st['kz'] == 'HBN-BM 47', str(st))
        E("(v => { const p = VEH.toW(v, 0, -4.2); GAME.view(p[0], p[1], v.st.z + 1.2, (v.st.psi * 180 / Math.PI), -8); })(VEH.by['gl-wartburg'])"); steps(0.3)
        pic('16_schilder')
        ok = at('jacke', 6)
        a5 = act('gl:k2jacke')
        steps(0.5)
        j = J("(F => [F.x, F.y])(GLMISSION.F('jule'))")
        put(j, 0, (1.6, 1.6))
        ok2 = until("GLMISSION.redet() && GLMISSION.St.talk.key === 'k2jacke'", 8)
        pic('17_jacke')
        talk()
        ok3 = at('ende', 6)
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
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}))
    ck.errors(errs)
    ck.done()
