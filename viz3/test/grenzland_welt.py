# feat/grenzland-welt: a world that notices the player (Grenzland, round 2). Free play, one area per page:
#   wissen     what the police know: a report sets the clothes, the helmet on the moped hides the face and resets the clothes; a patrol
#              car's `gesehen`; the warning jacket from the bungalow (pictures: helmet, jacket)
#   funk       the radio describes him: the fragments in order on a new level, „Weiterhin gesucht …“ after he changed
#   film       a wild deed near people: one to three of them film (gesture flag), a post with a real snapshot in the phone's feed
#   wahl       by a named person: four answers; „Provozieren“ can give a star
#   ereignis   every random event starts by GLEREIGNIS.debug.start(name), shows, and ends cleanly (no figures or vehicles left)
# Pictures in out/grenzland_welt/.   python3 viz3/test/grenzland_welt.py 9016 [scenes, comma separated]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib, grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '9016'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
want = lambda s: ONLY is None or s in ONLY
ck = grenzland_ci.wrap(lib.Checks('grenzland_welt'), 'grenzland_welt')
OUT = lib.out('grenzland_welt')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    X = lambda js: pg.evaluate('(() => { ' + js + ' })(); 0')
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    def steps(secs, dt=0.1):
        X(f"for (let i = 0; i < {max(1, int(round(secs / dt)))}; i++) GAME.step({dt})")
    def pic(name, hud=False):
        try:
            lib.shot(pg, OUT, name)
            if hud: pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    def until(cond, secs, dt=0.5, nap=0.0):
        t = 0.0
        while t < secs:
            steps(dt); t += dt
            if E(cond): return t
            if nap: time.sleep(nap)
        return None
    stand = lambda: J("GLFAHNDUNG.stand()")
    X("""window.TW = { ev: [], funk: [], wissen: [],
      look(x, y, d, az, h) { const a = az * Math.PI / 180; GAME.view(x - Math.sin(a) * d, y - Math.cos(a) * d, KERN.ground(x - Math.sin(a) * d, y - Math.cos(a) * d) + (h || 1.7), az, -6) },
      act(id) { const a = KERN.acts().find(q => q.id === id); return a ? a.label() : null },
      run(id) { const a = KERN.acts().find(q => q.id === id); if (a) a.run(); return !!a },
      get x() { return KERN.where()[0] }, get y() { return KERN.where()[1] } };
      KERN.on('grenzland:funk', d => TW.funk.push(d)); KERN.on('grenzland:wissen', d => TW.wissen.push(d)); 0""")
    # free play (the scene starts mission 1): every mission done, Friday evening in the garden
    for _ in range(6): steps(0.3); time.sleep(0.3)
    X("GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); GLSTATE.save(true)")
    steps(1)
    ck('the scene runs in free play', E("GLSTATE.on && !GLSTATE.cur"))
    X("GRENZLAND.folgen && GRENZLAND.folgen(false)")
    AN = (226, -100)
    # ------------------------------------------------------------------ wissen ------------------------------------------------------------------
    if want('wissen') or want('funk'):
        st = stand()
        ck('wissen: the fields are there and nothing is known', st.get('wissen') == {'gesicht': False, 'kleidung': False, 'fahrzeug': False} and 'beschreibung' in st, str(st.get('wissen')))
        # the warning jacket at the bungalow, the helmet at the moped (pictures)
        X("GAME.view(8.2, 9.6, KERN.ground(8.2, 9.6) + 1.62, 40, -4)")
        steps(0.5)
        lab = E("TW.act('gl-umziehen')")
        ck('wissen: the bungalow offers the warning jacket', lab == 'Warnjacke anziehen', str(lab))
        X("TW.run('gl-umziehen')")
        steps(0.5)
        ck('wissen: the warning jacket is the clothes now', J("GLFAHNDUNG.ist()")['kleid'] == 'warn', str(J("GLFAHNDUNG.ist()")))
        X("GAME.view(4.5, 3.5, KERN.ground(4.5, 3.5) + 1.62, 200, -4); GAME.setView3(true)")
        steps(0.6)
        pic('01_warnjacke')
        X("TW.run('gl-umziehen')")
        steps(0.3)
        ck('wissen: and off again', J("GLFAHNDUNG.ist()")['kleid'] == 'karo', str(J("GLFAHNDUNG.ist()")))
        hl = E("TW.act('gl-helm')")
        ck('wissen: the helmet can be taken at the moped', hl == 'Helm mitnehmen', str(hl))
        X("TW.run('gl-helm')")
        ck('wissen: the helmet is in the bag', E("GLSTATE.has('helm')"))
        # a report: the description
        X(f"GLFAHNDUNG.clear(); GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 100, -3); TW.funk.length = 0; TW.wissen.length = 0")
        steps(0.5)
        X("GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Testzeuge', knows: false }] })")
        steps(0.5)
        st = stand()
        ck('wissen: a report gives the clothes (and that he is on foot), no face', st['wissen'] == {'gesicht': False, 'kleidung': True, 'fahrzeug': False} and st['bild']['kleid'] == 'karo' and st['bild']['fuss'], str((st['wissen'], st['bild'])))
        if want('funk'):
            t = until("TW.funk.some(f => f.k === 'bild')", 20, 0.5)
            f = J("TW.funk.find(f => f.k === 'bild') || null")
            teile = f and f['teile']
            ck('funk: on the new level the radio describes him – the fragments in order',
               t is not None and teile and teile[0] == 'Zentrale an alle Streifen.' and teile[1] == 'Gesucht wird eine Person,' and teile[2] == 'männlich,'
               and teile[3] == 'rotes Karohemd,' and teile[4] == 'zu Fuß.' and teile[5] == 'Zuletzt gesehen in Ratscher.' and teile[-1] == 'Kommen.', str((t, teile)))
            ck('funk: every fragment is a line for the recordings', teile and all(['funk', x] in J("GLFAHNDUNG.linien()") for x in teile), str(teile))
        # on the moped with the helmet: the face hidden, the clothes reset
        m = J(f"""(() => {{ GLAUTO.mopedAt({AN[0]} + 3, {AN[1]} + 2, 1.6); GLSTATE.tank = 3; return true }})()""")
        steps(0.5); E("VEH.enter('gl-moped')"); steps(1)
        ist = J("GLFAHNDUNG.ist()")
        st = stand()
        ck('wissen: on the moped the helmet is on – the clothes do not fit the description, the vehicle is unknown', ist['kopf'] == 'helm' and ist['fz'] == 'moped' and st['wissen'] == {'gesicht': False, 'kleidung': False, 'fahrzeug': False}, str((ist, st['wissen'])))
        ck('wissen: the change was told (the clothes went)', E("TW.wissen.some(w => (w.weg || []).includes('kleidung'))"), str(J("TW.wissen")))
        ck('wissen: the helmet sits on the head', E("!!(GLFAHNDUNG.helmG && GLFAHNDUNG.helmG.g && GLFAHNDUNG.helmG.g.parent)"))
        X("GAME.setView3(true)")
        steps(0.6)
        pic('02_helm')
        if want('funk'):
            t = until("TW.funk.some(f => f.k === 'bild-alt')", 25, 0.5)
            f = J("TW.funk.find(f => f.k === 'bild-alt') || null")
            ck('funk: after the change the radio gives the old description („Weiterhin gesucht …“)', t is not None and f and f['teile'][1] == 'Weiterhin gesucht wird eine Person,' and 'rotes Karohemd,' in f['teile'] and 'mit Helm,' not in f['teile'], str((t, f)))
        # a patrol car: `gesehen` only while it sees him (or did within 4 s)
        X("GLFAHNDUNG.E.wait = 0.3")
        steps(1)
        st = stand()
        c0 = st['cars'][0] if st['cars'] else None
        ck('wissen: a patrol car far away has not seen him', c0 is not None and c0.get('gesehen') is False, str(st['cars']))
        X("const u = GLFAHNDUNG.cars.find(q => q.st === 'anfahrt' && q.c && q.c.line); if (u) { u.c.s = Math.max(u.c.s, u.c.line.L - 140); u.c.v = Math.min(u.c.v, 12) }")
        t = until("GLFAHNDUNG.seen", 40, 0.5)
        st = stand()
        ck('wissen: the car that sees him: gesehen', t is not None and any(c.get('gesehen') for c in st['cars']), str((t, st['cars'])))
        t = until("GLFAHNDUNG.stand().bild.fz === 'moped' && GLFAHNDUNG.stand().bild.kopf === 'helm'", 40, 0.5)
        st = stand()
        ck('wissen: seen on the moped from nearer: the vehicle and the helmet are in the description', t is not None and st['bild']['fz'] == 'moped' and st['bild']['kopf'] == 'helm' and st['wissen']['fahrzeug'] and st['wissen']['kleidung'], str((t, st['bild'], st['wissen'], st['cars'])))
        pic('03_gesehen', True)
        E("VEH.exit()")
        X("GLFAHNDUNG.clear()")
        steps(1)
        ck('wissen: no error in the police frame', E("GLFAHNDUNG.err === null && !GLFAHNDUNG.errW"), str(E("GLFAHNDUNG.err || GLFAHNDUNG.errW")))
    # a figure of the mode beside the player (the van's seller: she is a named person of today)
    def figur(id, dx, dy, face=True):
        X(f"window.TF = null; GLFIG.make('{id}', {{}}).then(F => {{ window.TF = F; if (F) {{ GLFIG.place(F, TW.x + {dx}, TW.y + {dy}, Math.atan2(-{dx}, -{dy})); F.sees = true }} }}); 0")
        for i in range(240):
            steps(0.1)
            if E("window.TF !== null"): return E("!!window.TF")
            time.sleep(0.6)
        return False
    # ------------------------------------------------------------------ film ------------------------------------------------------------------
    if want('film'):
        X(f"GLFAHNDUNG.clear(); GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 100, -3); GAME.setView3(true)")
        steps(0.5)
        okf = figur('haendler', 9, 4)
        ck('film: a figure stands by (the seller)', okf)
        steps(0.5)
        n0 = J("GLHANDY.posts().length")
        X("GLREAKTION.filmT = 0; GLFAHNDUNG.tat('rempeln', { force: [{ name: 'Testzeugin', knows: false }] })")
        steps(0.3)
        f = J("({ filmt: TF ? +(TF.filmt || 0).toFixed(1) : -1, filmer: GLREAKTION.filmer.length, posts: GLREAKTION.debug.posts(), snaps: GLREAKTION.snaps, err: GLREAKTION.err, geste: !!GLFIG.geste })")
        ck('film: the witness raises the phone (filming flag)', f['filmt'] > 3 and f['filmer'] >= 1, str(f))
        ck('film: the moment is photographed (a picture of more than 1000 characters)', f['posts'] and f['posts'][0]['img'] > 1000, str(f))
        steps(1)
        pic('04_filmt', True)
        t = until(f"GLHANDY.posts().length > {n0}", 40, 1)
        p = J("GLHANDY.posts().slice(-1)[0] || null")
        ck('film: some twenty seconds later the post is in the feed with the picture', t is not None and 12 < t < 32 and p and len(p.get('img', '')) > 1000 and p.get('likes', 0) > 0, str((t, p and {k: (v if k != 'img' else len(v)) for k, v in p.items()})))
        steps(20)
        X("GLHANDY.open('feed')")
        steps(0.5)
        try:
            pg.screenshot(path=os.path.join(OUT, '05_feed.png'))
        except Exception as e:
            print('shot failed', e)
        X("GLHANDY.close()")
        # a big moment: LIVE
        X("GLREAKTION.debug.wild('live', { sofort: true })")
        t = until("GLHANDY.posts().some(q => /^LIVE/.test(q.text) && q.img && q.img.length > 1000)", 5, 0.5)
        ck('film: a big moment is a LIVE post', t is not None, str(J("GLHANDY.posts().map(q => q.text.slice(0, 40))")))
        X("GLFAHNDUNG.clear(); if (window.TF) GLFIG.drop(TF); window.TF = null")
        ck('film: no error', E("!GLREAKTION.err"), str(E("GLREAKTION.err")))
    # ------------------------------------------------------------------ wahl ------------------------------------------------------------------
    if want('wahl'):
        X(f"GLFAHNDUNG.clear(); GAME.view({AN[0]}, {AN[1]}, KERN.ground({AN[0]}, {AN[1]}) + 1.62, 100, -3); GAME.setView3(true)")
        steps(0.5)
        okf = figur('haendler', 1.8, 0.1)
        steps(0.5)
        lab = E("TW.act('gl-ansprechen')")
        ck('wahl: by a named person: „Ansprechen“', okf and lab == 'Ansprechen: Verkäuferin', str(lab))
        X("TW.run('gl-ansprechen')")
        steps(0.2)
        n = J("[...document.querySelectorAll('#glwahl button')].map(b => b.textContent)")
        ck('wahl: four answers', len(n) == 4 and 'Grüßen' in n[0] and 'Provozieren' in n[3], str(n))
        pic('06_wahl', True)
        X("GLHUD.pick(3)")
        for _ in range(6): steps(0.2); time.sleep(0.3)
        st = stand()
        ck('wahl: „Provozieren“ – she takes the phone (a report under way)', any(o['id'] == 'poebeln' for o in st['offen']), str(st['offen']))
        t = until("GLLOGIK.stars(GLSTATE.W) > 0", 15, 0.5)
        ck('wahl: … and the call gives a star', t is not None and stand()['sterne'] == 1, str((t, stand()['sterne'])))
        # Grüßen after a comeback: she remembers
        X("GLFAHNDUNG.clear(); GLREAKTION.gemerkt = {}")
        steps(0.5)
        X("TW.run('gl-ansprechen')"); steps(0.2); X("GLHUD.pick(1)")
        for _ in range(6): steps(0.2); time.sleep(0.3)
        X("TW.run('gl-ansprechen')"); steps(0.2); X("GLHUD.pick(0)")
        for _ in range(6): steps(0.2); time.sleep(0.3)
        ck('wahl: after a comeback she remembers it when greeted', E("GLREAKTION.n.wahl >= 3") and E("!GLREAKTION.gemerkt.haendler"), str(J("({ n: GLREAKTION.n, g: GLREAKTION.gemerkt })")))
        X("if (window.TF) GLFIG.drop(TF); window.TF = null; GLFAHNDUNG.clear()")
        ck('wahl: no error', E("!GLREAKTION.err"), str(E("GLREAKTION.err")))
    # ------------------------------------------------------------------ ereignis ------------------------------------------------------------------
    if want('ereignis'):
        X("GLFAHNDUNG.clear()")
        base = J("({ cars: GLAUTO.cars.length, figs: GLFIG.figs.length, meshes: (() => { let n = 0; GAME.scene.traverse(o => { if (o.name === 'grenzland ereignis') n++ }); return n })() })")
        # each where it belongs: the roads east of the Anger (country road towards the dam) for the road ones, the Anger for the fair
        SPOTS = {
            'blitzer': (300, -150, 120), 'traktorstau': (300, -150, 120), 'korso': (300, -150, 120), 'wildunfall': (300, -150, 120),
            'boeller': (230, -112, 100), 'kirmes': (205, -125, 30),
        }
        for k in ['blitzer', 'traktorstau', 'kirmes', 'korso', 'boeller', 'wildunfall']:
            x, y, az = SPOTS[k]
            X(f"GLEREIGNIS.stop(); GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.62, {az}, -4); GAME.setView3(true)")
            steps(0.3)
            ok = E(f"GLEREIGNIS.debug.start('{k}')")
            info = J("GLEREIGNIS.debug.info()")
            ck(f'ereignis {k}: starts at the player', ok and info and info['name'] == k, str((ok, info, E("GLEREIGNIS.err"))))
            # its point on the radar
            steps(0.5)
            bl = J("(GLKARTE.blips ? GLKARTE.blips() : []).filter(b => b.k === 'ort').map(b => b.name)")
            ck(f'ereignis {k}: a point on the radar', len(bl) > 0, str(bl))
            # let it show (figures load), look at it
            for _ in range(10): steps(0.3); time.sleep(0.4)
            info = J("GLEREIGNIS.debug.info()")
            X(f"const i = GLEREIGNIS.debug.info(); if (i) {{ const a = Math.atan2(i.x - {x}, i.y - ({y})) * 180 / Math.PI; GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.62, a, -4) }}")
            steps(0.3)
            pic(f'1{["blitzer", "traktorstau", "kirmes", "korso", "boeller", "wildunfall"].index(k)}_{k}')
            ck(f'ereignis {k}: shows (cars, figures or props)', info and (info['cars'] + info['figs'] + info['meshes']) > 0, str(info))
            X("GLEREIGNIS.stop('test')")
            steps(0.5)
            now = J("({ cars: GLAUTO.cars.filter(c => c.ereignis).length, figs: GLFIG.figs.filter(F => F.ereignis).length, meshes: (() => { let n = 0; GAME.scene.traverse(o => { if (o.name === 'grenzland ereignis') n++ }); return n })(), aktiv: GLEREIGNIS.aktiv() })")
            ck(f'ereignis {k}: ends cleanly (no figures, vehicles or props left)', now['cars'] == 0 and now['figs'] == 0 and now['meshes'] == 0 and not now['aktiv'], str(now))
        # the speed camera flashes and the letter comes
        X("GLEREIGNIS.stop(); GAME.view(300, -150, KERN.ground(300, -150) + 1.62, 120, -4)")
        steps(0.3)
        ok = E("GLEREIGNIS.debug.start('blitzer')")
        if ok:
            # on the moped, right beside the camera, fast
            X("const E = GLEREIGNIS.E; GLAUTO.mopedAt(E.x - Math.sin(E.dir) * 30, E.y - Math.cos(E.dir) * 30, E.dir); GLSTATE.tank = 3")
            steps(0.5); E("VEH.enter('gl-moped')"); steps(0.5)
            X("const E = GLEREIGNIS.E, v = VEH.cur; if (v && E) { v.st.x = E.x + Math.sin(E.dir) * 2; v.st.y = E.y + Math.cos(E.dir) * 2; v.st.u = Math.sin(v.st.psi) * 16; v.st.v = Math.cos(v.st.psi) * 16 }")
            X("const E = GLEREIGNIS.E, v = VEH.cur; if (v && E) { GLEREIGNIS.DEF.blitzer.tick(E, 0.05, { x: v.st.x, y: v.st.y, v: 16.5, hd: v.st.psi }) }")
            g = J("({ ende: GLEREIGNIS.E && GLEREIGNIS.E.ende, briefe: GLEREIGNIS.briefe.length })")
            ck('ereignis blitzer: too fast – the flash', g['ende'] == 'geblitzt' and g['briefe'] == 1, str(g))
            n0 = E("GLSTATE.sms.length")
            steps(61, 0.5)
            ck('ereignis blitzer: a minute later the letter is in the phone', E("GLSTATE.sms.length") > n0 and E("/Verwarnungsgeld/.test(GLSTATE.sms.slice(-1)[0].text)"), str(J("GLSTATE.sms.slice(-1)")))
            E("VEH.exit()")
        X("GLEREIGNIS.stop()")
        steps(0.5)
        left = J("({ cars: GLAUTO.cars.filter(c => c.ereignis).length, figs: GLFIG.figs.filter(F => F.ereignis).length })")
        ck('ereignis: nothing left over', left['cars'] == 0 and left['figs'] == 0, str(left))
        ck('ereignis: no error', not E("GLEREIGNIS.err"), str(E("GLEREIGNIS.err")))
    ck.errors(errs)
    ck.done()
