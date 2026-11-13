# feat/grenzland-partner: talking with the other of the two (Falko 13.11.2026 20:37). Free play in the garden (one area per page):
#   frei    near Sarah the action button offers „Mit Sarah reden“, E opens the panel, each topic plays its fixed line for the state
#           (free play after chapter 1; mission 1 at the old school), „Warte hier“ stops the following and „Komm mit“ resumes it,
#           E and Esc close; nothing in 1989, nothing during a scene; playing Sarah: „Mit Falko reden“ and Falko's lines
#   ki      both people registered with npc/ki.js; the <lage> of the partner carries the objective and the stars, the neighbours' <lage>
#           keeps the building phase; with a key (no request is made) the talk is free: the sheet, no aufgabe_geben, the microphone box
#           in the panel
# Pictures in out/grenzland_partner/ (the prompt, the panel desktop and phone, the AI box).   python3 viz3/test/grenzland_partner.py 9016 [scenes]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '9016'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda s: ONLY is None or s in ONLY
ck = grenzland_ci.wrap(lib.Checks('grenzland_partner'), 'grenzland_partner')
OUT = lib.out('grenzland_partner')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    X = lambda js: pg.evaluate('(() => { ' + js + ' })(); 0')
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    def steps(secs, dt=0.1):
        X(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    def hud(name):
        for i in range(2):
            try:
                E("GAME.shot()")
                pg.screenshot(path=os.path.join(OUT, name + '.jpg'), type='jpeg', quality=82, timeout=60000)
                print('shot', name, flush=True)
                return
            except Exception as e:
                print('shot failed', name, i, e)
                steps(0.2); time.sleep(2)
    def until(cond, secs, dt=0.25, nap=0.05):
        t = 0.0
        while t < secs:
            steps(dt); t += dt
            if E(cond): return t
            if nap: time.sleep(nap)
        return None
    X("""window.TP = {
      lab() { const a = KERN.acts().find(q => q.id === 'gl:partner'); return a ? a.label() : null },
      btn() { const b = document.getElementById('doorbtn'); return b && !b.hidden ? b.textContent : '' },
      // the player at (x, y) facing az, the partner d metres in front of him, facing him
      vor(x, y, az, d) { GAME.view(x, y, KERN.ground(x, y) + 1.62, az, -4); const F = GRENZLAND.partnerOf(); if (!F) return false;
        const a = az * Math.PI / 180; GLFIG.place(F, x + Math.sin(a) * d, y + Math.cos(a) * d, a + Math.PI); return true },
      dist() { const F = GRENZLAND.partnerOf(), w = KERN.where(); return F ? Math.hypot(F.x - w[0], F.y - w[1]) : -1 },
      said() { return GLPARTNER.log.slice() } }; 0""")
    # free play (the scene starts mission 1): every mission done, Friday evening in the garden
    for _ in range(6): steps(0.3); time.sleep(0.3)
    X("GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); GLSTATE.tank = 5; GLSTATE.save(true)")
    steps(1)
    ck('the scene runs in free play', E("GLSTATE.on && !GLSTATE.cur"))
    X("GLPARTNER.tempo = 0.05; GAME.setView3(true)")
    ok = until("!!GRENZLAND.partnerOf() && GRENZLAND.partnerOf().id === 'sarah'", 60, 0.5, 0.5)
    ck('Sarah is there as the partner', ok is not None, str(J("GRENZLAND.partnerOf() && GRENZLAND.partnerOf().id")))
    W0 = J("KERN.where()")
    X0, Y0 = W0[0], W0[1]
    D = J("({ JETZT: GLPDATA.JETZT, FREI: GLPDATA.FREI, BISHER: GLPDATA.BISHER, WARTE: GLPDATA.WARTE, KOMM: GLPDATA.KOMM, GEHT: GLPDATA.GEHT })")
    # ------------------------------------------------------------------ frei ------------------------------------------------------------------
    if want('frei'):
        X(f"TP.vor({X0}, {Y0}, 90, 6)"); steps(0.4)
        ck('frei: six metres away there is no prompt', E("TP.lab()") is None, str(E("TP.lab()")))
        X(f"TP.vor({X0}, {Y0}, 90, 2)"); steps(0.4)
        ck('frei: two metres in front of her the prompt says „Mit Sarah reden“', E("TP.lab()") == 'Mit Sarah reden', str(E("TP.lab()")))
        ck('frei: the action button shows it', 'Mit Sarah reden' in E("TP.btn()"), E("TP.btn()"))
        X(f"TP.vor({X0}, {Y0}, 270, 2); GAME.view({X0}, {Y0}, KERN.ground({X0}, {Y0}) + 1.62, 90, -4)"); steps(0.4)
        ck('frei: with the back to her there is none', E("TP.lab()") is None or 'Sarah' not in E("TP.btn()"), E("TP.btn()"))
        X(f"TP.vor({X0}, {Y0}, 90, 2); if (GLHUD.subAus) GLHUD.subAus()"); steps(0.4)
        hud('01_prompt')
        pg.keyboard.press('e'); steps(0.3)
        ck('frei: E opens the talk', E("GLPARTNER.offen()") and E("!document.getElementById('glpartner').hidden"))
        ck('frei: she stands and looks at the player', E("GRENZLAND.partnerOf().st !== 'geht' && !!GRENZLAND.partnerOf().look"), str(J("({ st: GRENZLAND.partnerOf().st, look: !!GRENZLAND.partnerOf().look })")))
        ck('frei: four topics', J("[...document.querySelectorAll('#glp-chips button')].map(b => b.dataset.k)") == ['jetzt', 'bisher', 'geht', 'warte'], str(J("[...document.querySelectorAll('#glp-chips button')].map(b => b.dataset.k)")))
        time.sleep(0.4); X("GLPARTNER.log.length = 0")
        X("document.querySelector('#glp-chips button[data-k=jetzt]').click()")
        until("GLPARTNER.log.length >= 2", 6, 0.1, 0.1)
        s = J("TP.said()")
        ck('frei: „Was machen wir jetzt?“ – Falko asks, Sarah answers with the free-play line', s[:2] == [['falko', 'Was machen wir jetzt?'], ['sarah', D['FREI'][0]]], str(s))
        steps(0.2)
        hud('02_panel')
        time.sleep(0.4); X("GLPARTNER.log.length = 0")
        pg.keyboard.press('2')
        until("GLPARTNER.log.length >= 3", 8, 0.1, 0.1)
        s = J("TP.said()")
        ck('frei: „Was wissen wir bisher?“ – the last two missions', s[:3] == [['falko', 'Was wissen wir bisher?'], ['sarah', D['BISHER']['klinge'][0]], ['sarah', D['BISHER']['coup'][0]]], str(s))
        time.sleep(0.4); X("GLPARTNER.log.length = 0")
        pg.keyboard.press('3')
        until("GLPARTNER.log.length >= 2", 6, 0.1, 0.1)
        s = J("TP.said()")
        ck('frei: „Alles gut bei dir?“ – a line of the evening', len(s) >= 2 and s[1][0] == 'sarah' and s[1][1] in D['GEHT']['tag'][0], str(s))
        time.sleep(0.3); X("GLPARTNER.log.length = 0")
        pg.keyboard.press('4')
        until("GLPARTNER.log.length >= 2", 6, 0.1, 0.1)
        s = J("TP.said()")
        ck('frei: „Warte hier“ – she says she waits', len(s) >= 2 and s[0] == ['falko', 'Warte hier.'] and s[1][1] in D['WARTE'][0], str(s))
        ck('frei: the topic turns into „Komm mit“', J("GLPARTNER.debug.chips().map(c => c.k)")[3] == 'komm')
        pg.keyboard.press('e'); steps(0.3)
        ck('frei: E closes the talk', not E("GLPARTNER.offen()") and E("document.getElementById('glpartner').hidden"))
        ck('frei: she waits now (GL.folgt false)', E("GLSTATE.folgt === false"))
        X(f"GAME.view({X0} - 12, {Y0}, KERN.ground({X0} - 12, {Y0}) + 1.62, 270, -4)"); steps(4, 0.2)
        d1 = E("TP.dist()")
        ck('frei: twelve metres off she does not follow', d1 > 10, str(d1))
        # back to her, „Komm mit“, Esc closes
        X(f"TP.vor({X0} - 12, {Y0}, 90, 2)"); steps(0.4)
        pg.keyboard.press('e'); steps(0.3)
        ck('frei: open again', E("GLPARTNER.offen()"))
        time.sleep(0.3); X("GLPARTNER.log.length = 0")
        X("document.querySelector('#glp-chips button[data-k=komm]').click()")
        until("GLPARTNER.log.length >= 2", 6, 0.1, 0.1)
        s = J("TP.said()")
        ck('frei: „Komm mit“ – she comes', len(s) >= 2 and s[0] == ['falko', 'Komm mit.'] and s[1][1] in D['KOMM'][0], str(s))
        ck('frei: while the talk runs she still stands', E("GLSTATE.folgt === false && GRENZLAND.partnerOf().st !== 'geht'"))
        pg.keyboard.press('Escape'); steps(0.3)
        ck('frei: Esc closes the talk', not E("GLPARTNER.offen()"))
        ck('frei: she follows again (GL.folgt true)', E("GLSTATE.folgt === true"))
        X(f"GAME.view({X0} + 6, {Y0}, KERN.ground({X0} + 6, {Y0}) + 1.62, 90, -4)"); steps(0.2)
        d1 = E("TP.dist()")
        steps(8, 0.2)
        d2 = E("TP.dist()")
        ck('frei: she walks after the player', 0 <= d2 < min(8, d1 - 5), str(d1) + ' → ' + str(d2))
        # walking away ends the talk
        X(f"TP.vor({X0}, {Y0}, 90, 2)"); steps(0.4); pg.keyboard.press('e'); steps(0.2)
        X(f"GAME.view({X0} - 8, {Y0}, KERN.ground({X0} - 8, {Y0}) + 1.62, 270, -4)"); steps(0.4)
        ck('frei: walking away ends the talk', not E("GLPARTNER.offen()"))
        # a scene, 1989: nothing
        X(f"TP.vor({X0}, {Y0}, 90, 2)"); steps(0.4)
        pg.keyboard.press('e'); steps(0.2)
        X("GLHUD.kino(true)"); steps(0.3)
        ck('frei: a scene closes the talk and hides the prompt', not E("GLPARTNER.offen()") and E("TP.lab()") is None, str(E("TP.lab()")))
        X("GLHUD.kino(false)"); steps(0.3)
        ck('frei: after the scene the prompt is back', E("TP.lab()") == 'Mit Sarah reden', str(E("TP.lab()")))
        X("GLSTATE.era = '1989'"); steps(0.2)
        ck('frei: in 1989 there is no prompt and no talk', E("TP.lab()") is None and not E("GLPARTNER.auf()"))
        X("GLSTATE.era = 'heute'"); steps(0.4)
        # mission 1 at the old school: the step's own line
        X("GLMISSION.debug.go('gefallen', 'schule')"); steps(0.6)
        st = J("GLPARTNER.debug.zustand()")
        ck('frei: mission 1 runs at „schule“', st['mission'] == 'gefallen' and st['step'] == 'schule', str(st))
        # (in the garden, far from the school door: the step's talk does not start)
        X(f"TP.vor({X0}, {Y0}, 90, 2)"); steps(0.4)
        if E("TP.lab()") and E("GLPARTNER.auf()"):
            time.sleep(0.3); X("GLPARTNER.log.length = 0; GLPARTNER.thema('jetzt')")
            until("GLPARTNER.log.length >= 2", 6, 0.1, 0.1)
            s = J("TP.said()")
            ck('frei: mission 1 – „Was machen wir jetzt?“ says the step at the school', len(s) >= 2 and s[1] == ['sarah', D['JETZT']['gefallen']['schule'][0]], str(s))
            lg = E("KI.lage('gl_p_sarah')")
            ck('ki: the <lage> of the partner carries the mission and the step', 'Ein Gefallen' in lg and 'Zur Tür der alten Schule' in lg, lg[:600])
            X("GLPARTNER.zu()")
        else:
            ck('frei: mission 1 – the prompt at the school', False, str(J("({ lab: TP.lab(), redet: GLMISSION.redet(), kino: document.body.dataset.glKino, d: TP.dist() })")))
        # back to free play
        X("GLMISSION.stop(); for (const id of GLPDATA.ORDER) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.save(true)"); steps(0.5)
        # riding together on the moped: B opens the talk (without „Komm mit“ / „Warte hier“), she keeps riding along, E only ends the talk
        X(f"GLAUTO.mopedAt({X0} + 3, {Y0} + 2, 1.6); GLSTATE.tank = 3; GRENZLAND.folgen(true)"); steps(0.3)
        X(f"TP.vor({X0} + 2, {Y0} + 2, 90, 1.5)"); steps(0.3)
        E("VEH.enter('gl-moped')"); steps(0.6)
        ok = until("GLPARTNER.debug.imAuto()", 6, 0.25, 0.05)
        ck('fahrt: on the moped together', ok is not None, str(J("({ veh: VEH.cur && VEH.cur.id, rides: !!(GRENZLAND.partnerOf() && GRENZLAND.partnerOf().rides), folgt: GLSTATE.folgt })")))
        if ok is not None:
            ck('fahrt: the button „B · Mit Sarah reden“ shows for a moment', E("(b => !!b && !b.hidden && b.textContent)(document.getElementById('glpreden'))") == 'B · Mit Sarah reden', str(E("(b => b && b.textContent)(document.getElementById('glpreden'))")))
            hud('06_fahrt_knopf')
            pg.keyboard.press('b'); steps(0.3)
            ck('fahrt: B opens the talk while riding', E("GLPARTNER.offen() && GLPARTNER.auto"))
            ck('fahrt: … and not the workshop book of the base game', E("(b => !b || b.hidden)(document.getElementById('werkbuch'))"))
            ck('fahrt: three topics, no „Warte hier“', J("GLPARTNER.debug.chips().map(c => c.k)") == ['jetzt', 'bisher', 'geht'], str(J("GLPARTNER.debug.chips().map(c => c.k)")))
            time.sleep(0.3); X("GLPARTNER.log.length = 0")
            pg.keyboard.press('1')
            until("GLPARTNER.log.length >= 2", 6, 0.1, 0.1)
            s = J("TP.said()")
            ck('fahrt: „Was machen wir jetzt?“ on the way', s[:2] == [['falko', 'Was machen wir jetzt?'], ['sarah', D['FREI'][0]]], str(s))
            ck('fahrt: she keeps riding along', E("GRENZLAND.partnerOf().rides && GLSTATE.folgt === true"))
            hud('07_fahrt_panel')
            pg.keyboard.press('e'); steps(0.3)
            ck('fahrt: E ends the talk, not the ride', not E("GLPARTNER.offen()") and E("!!VEH.cur"))
        E("VEH.cur && VEH.exit()"); steps(1)
    # ------------------------------------------------------------------ ki ------------------------------------------------------------------
    if want('ki'):
        ppl = J("KI.people()")
        ck('ki: both are people of the free talks', 'gl_p_sarah' in ppl and 'gl_p_falko' in ppl, str([p for p in ppl if p.startswith('gl_')]))
        X("GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Testzeuge', knows: true }] })"); steps(0.3)
        n = E("GLFAHNDUNG.stand().sterne")
        lg = E("KI.lage('gl_p_sarah')")
        ck('ki: the <lage> of the partner carries the stars', n > 0 and ('Stern' in lg) and 'Polizei: keine' not in lg, str(n) + ' ' + lg[:700])
        ck('ki: … and the free play, money, the following – not the building phase', 'Kapitel 1 ist geschafft' in lg and 'Geld:' in lg and 'Baustand' not in lg and 'Ort:' not in lg, lg[:700])
        hb = E("KI.lage('hubert')")
        ck('ki: the neighbours keep their <lage> (place, building phase)', 'Ort:' in hb and 'Baustand' in hb and 'Wo ihr seid' not in hb, hb[:400])
        X("GLFAHNDUNG.clear()"); steps(0.3)
        # with a key (none is used: no request is made before the player speaks)
        X("KI.configure({ key: 'sk-test-keine-anfrage', hands: false })")
        X(f"TP.vor({X0}, {Y0}, 90, 2)"); steps(0.4)
        E("GLPARTNER.auf()"); steps(0.3)
        c = J("KI.conv && { who: KI.conv.who, sys: KI.conv.system[0].text.slice(0, 80), tools: KI.conv.tools.map(t => t.name), box: !!document.querySelector('#glpartner #np-ki:not([hidden])') }")
        ck('ki: a free talk with Sarah runs in the panel', c and c['who'] == 'gl_p_sarah' and c['box'], str(c))
        ck('ki: her sheet, no aufgabe_geben, the doings through spielaufgabe', c and c['sys'].startswith('Du bist Sarah aus Berlin') and 'aufgabe_geben' not in c['tools'] and 'spielaufgabe' in c['tools'], str(c))
        r = J("GLPARTNER.debug.aktion('warten')")
        ck('ki: the AI can make her wait', r and 'wartest' in r['text'] and E("GLPARTNER.debug.chips()[3].k") == 'komm', str(r))
        X("GLPARTNER.debug.aktion('mitkommen')")
        steps(0.2)
        hud('04_panel_ki')
        X("GLPARTNER.zu()"); steps(0.2)
        ck('ki: closing ends the free talk', E("!KI.conv") and E("GLSTATE.folgt === true"))
        X("KI.configure({ key: '', hands: true })")
    # ------------------------------------------------------------------ the phone layout ------------------------------------------------------------------
    if want('frei'):
        pg.set_viewport_size({'width': 390, 'height': 760}); steps(0.5)
        X(f"TP.vor({X0}, {Y0}, 90, 2)"); steps(0.4)
        if E("GLPARTNER.auf()"):
            time.sleep(0.3); X("GLPARTNER.thema('jetzt')"); until("GLPARTNER.log.length >= 2", 4, 0.1, 0.1); steps(0.2)
            hud('03_panel_handy')
            box = J("(() => { const r = document.getElementById('glpartner').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] })()")
            ck('frei: on a phone the panel fits the screen', box[0] >= 0 and box[2] <= 390 and box[1] >= 0 and box[3] <= 760, str(box))
            X("GLPARTNER.zu()")
        pg.set_viewport_size({'width': 1100, 'height': 680}); steps(0.3)
        # playing Sarah: Falko is the one to talk to
        X("GRENZLAND.wechsel()")
        ok = until("GLSTATE.wer === 'f' && !!GRENZLAND.partnerOf() && GRENZLAND.partnerOf().id === 'falko'", 60, 0.5, 0.5)
        ck('sarah: playing Sarah, Falko is the partner', ok is not None)
        W2 = J("KERN.where()")
        X(f"TP.vor({W2[0]}, {W2[1]}, 180, 2)"); steps(0.4)
        ck('sarah: the prompt says „Mit Falko reden“', E("TP.lab()") == 'Mit Falko reden', str(E("TP.lab()")))
        pg.keyboard.press('e'); steps(0.3)
        time.sleep(0.4); X("GLPARTNER.log.length = 0")
        pg.keyboard.press('1')
        until("GLPARTNER.log.length >= 2", 6, 0.1, 0.1)
        s = J("TP.said()")
        ck('sarah: Sarah asks, Falko answers with his line', s[:2] == [['sarah', 'Was machen wir jetzt?'], ['falko', D['FREI'][1]]], str(s))
        hud('05_panel_falko')
        pg.keyboard.press('Escape'); steps(0.3)
        ck('sarah: Esc closes', not E("GLPARTNER.offen()"))
        X("GRENZLAND.wechsel()"); steps(1)
    ck('no error in the module', not E("GLPARTNER.err"), str(E("GLPARTNER.err")))
    ck.errors(errs)
    ck.done()
