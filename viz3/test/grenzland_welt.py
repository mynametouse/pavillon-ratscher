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
        X("GAME.view(8.2, 9.6, KERN.ground(8.2, 9.6) + 1.62, 40, -4); GAME.setView3(true)")
        steps(0.3)
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
    ck.errors(errs)
    ck.done()
