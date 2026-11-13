# feat/grenzland (Falko, 13.11.2026): the mode „Grenzland“ – its core. Starts the scene (?szenario=grenzland), checks the mode (panel, the
# clock on Friday evening, the moped in the garden, the other of the two as a figure), switches between Falko and Sarah, rides the moped,
# a deed nobody saw (no stars) and one somebody saw (hollow stars, a patrol car comes over the roads, searches, the stars go, it leaves),
# an arrest (the fine, the next morning in the garden), a reload goes on, „Beenden“ puts everything back. Pictures in out/grenzland/.
#   python3 viz3/test/grenzland.py 9011        (~6 min in the chat machine)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
import grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = grenzland_ci.wrap(lib.Checks('grenzland'), 'grenzland')
OUT = lib.out('grenzland')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try:
            lib.shot(pg, OUT, name)
            pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    def wait(cond, secs=40):
        for _ in range(int(secs * 2)):
            steps(0.3)
            if E(cond): return True
            time.sleep(0.5)
        return False
    # ---- the scene starts the mode ----
    # (free play for this test: the chapter's missions count as done – they have their own test, viz3/test/grenzland_mission.py; the
    # first mission would take the two to Schleusingen)
    for _ in range(6):
        steps(0.3); time.sleep(0.3)
    E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d) for (const id of Object.keys(d.info().st)) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; "
      "GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); "
      "CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); "
      "GLAUTO.mopedAt(GLDATA.ORTE.moped.pos[0], GLDATA.ORTE.moped.pos[1], GLDATA.ORTE.moped.az * Math.PI / 180); GLSTATE.save(true); })()")
    steps(1)
    st = J("({ on: GLSTATE.on, wer: GLSTATE.wer, hud: !document.getElementById('glhud').hidden, m: Math.floor(CLOCK.t) % 1440, fig: AVATAR.kind, "
           "moped: !!(GLAUTO.moped && GLAUTO.moped.g.visible), url: location.search, scen: KERN.scenarios().some(s => s.name === 'grenzland'), geld: GLSTATE.geld })")
    ck('the scene starts the mode (on, panel, Friday 17:20, Falko, the moped in the garden)',
       st['on'] and st['hud'] and st['wer'] == 'm' and st['fig'] == 'm' and abs(st['m'] - (17 * 60 + 20)) < 3 and st['moped'] and st['scen'], str(st))
    ck('the address no longer names the scene (a reload goes on)', 'szenario' not in st['url'], st['url'])
    KAL = ("({ wd: new Date((DN.e0 + Math.floor(CLOCK.t / 1440)) * 864e5).getUTCDay(), iso: new Date((DN.e0 + Math.floor(CLOCK.t / 1440)) * 864e5)"
           ".toISOString().slice(0, 10), alt: GLSTATE.e0alt, e0: DN.e0, map: !document.getElementById('glmap').hidden })")
    kal = J(KAL)
    e0alt = kal['alt']
    ck('the story begins on Friday, 4 September 2026; the radar is there', kal['wd'] == 5 and kal['iso'] == '2026-09-04' and kal['map']
       and kal['e0'] != e0alt, str(kal))
    ok = wait("!!GRENZLAND.partnerOf()", 60)
    p = J("(() => { const F = GRENZLAND.partnerOf(); return F ? { id: F.id, vis: F.g.visible, d: Math.hypot(F.x - KERN.where()[0], F.y - KERN.where()[1]) } : null })()")
    ck('Sarah stands by as a figure', ok and p and p['id'] == 'sarah' and p['vis'] and p['d'] < 6, str(p))
    pic('01_start')
    # ---- switching: Sarah is played, Falko stays ----
    w0 = J("KERN.where()")
    ok = E("GRENZLAND.wechsel()")
    wait("!!GRENZLAND.partnerOf() && GRENZLAND.partnerOf().id === 'falko'", 60)
    st = J("({ wer: GLSTATE.wer, fig: AVATAR.kind, w: KERN.where(), p: GRENZLAND.partnerOf() && [GRENZLAND.partnerOf().x, GRENZLAND.partnerOf().y, GRENZLAND.partnerOf().id] })")
    ck('Tab: Sarah is played, Falko stands where one was', ok and st['wer'] == 'f' and st['fig'] == 'f' and st['p'] and st['p'][2] == 'falko'
       and abs(st['p'][0] - w0[0]) < 1.5 and abs(st['p'][1] - w0[1]) < 1.5, str(st))
    E("GRENZLAND.wechsel()")
    wait("!!GRENZLAND.partnerOf() && GRENZLAND.partnerOf().id === 'sarah'", 60)
    ck('and back to Falko', E("GLSTATE.wer") == 'm' and E("AVATAR.kind") == 'm')
    # the other one follows, and waits when told to
    E("GAME.view(20, 24, 0, 90, 0)")
    steps(10)
    d1 = E("(() => { const F = GRENZLAND.partnerOf(); return Math.hypot(F.x - KERN.where()[0], F.y - KERN.where()[1]) })()")
    ck('she comes along', d1 < 6, str(d1))
    E("GRENZLAND.folgen(false); GAME.view(60, 30, 0, 90, 0)")
    steps(6)
    d2 = E("(() => { const F = GRENZLAND.partnerOf(); return Math.hypot(F.x - KERN.where()[0], F.y - KERN.where()[1]) })()")
    ck('„Warte hier“: she stays', d2 > 25, str(d2))
    E("GRENZLAND.folgen(true)")
    # ---- the moped ----
    E("GAME.view(104, -316, 0, 30, -5); GLAUTO.mopedAt(108, -312, 0.5); GLSTATE.tank = 3")
    steps(0.5)
    E("VEH.enter('gl-moped')")
    steps(1)
    ort = J("({ on: document.getElementById('glort').classList.contains('on'), t: document.getElementById('glort').textContent })")
    ck('getting onto the moped shows its name for a moment', ort['on'] and len(ort['t']) > 2, str(ort))
    E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
    steps(9, 0.05)
    mv = J("({ id: VEH.cur && VEH.cur.id, u: VEH.cur.st.u, tank: GLSTATE.tank, km: GLSTATE.stats.km })")
    ck('the moped is ridden (speed, the tank goes down)', mv['id'] == 'gl-moped' and mv['u'] > 7 and mv['tank'] < 3 and mv['km'] > 0.01, str(mv))
    pic('02_moped')
    E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: true })")
    steps(6, 0.05)
    E("VEH.auto = null; VEH.exit()")
    steps(0.5)
    # ---- deeds: unseen, seen ----
    E("GAME.go('dorf')")
    steps(1)
    g0 = E("GLFAHNDUNG.tat('autoklau', { force: [] })")
    ck('a deed nobody saw: no stars', g0 == 0 and E("GLLOGIK.stars(GLSTATE.W)") == 0)
    g1 = E("GLFAHNDUNG.tat('einbruch', { force: [{ name: 'Testzeuge', knows: false }] })")
    st = J("GLFAHNDUNG.stand()")
    ck('a deed somebody saw: two hollow stars, the police are called', g1 == 2 and st['sterne'] == 2 and not st['bekannt'] and st['state'] == 'gesucht', str(st))
    cls = J("[...document.querySelectorAll('#glsterne i')].map(i => i.className)")
    steps(0.6)
    cls = J("[...document.querySelectorAll('#glsterne i')].map(i => i.className)")
    ck('the panel shows two hollow stars', cls[0].startswith('hohl') and cls[1].startswith('hohl') and cls[2] == '', str(cls))
    # the stars hold while the patrol is on its way; it comes over the roads
    steps(25)
    ck('the stars hold while nobody searches yet', E("GLLOGIK.stars(GLSTATE.W)") == 2)
    ok = wait("GLFAHNDUNG.cars.length > 0", 40)
    c0 = J("GLFAHNDUNG.stand().cars")
    ck('a patrol car comes in at a road end, far away', ok and len(c0) > 0 and c0[0]['st'] == 'anfahrt', str(c0))
    # away from the roads into the fields (out of sight): they search, the stars go, they leave
    E("GAME.view(60, -420, 0, 180, 0)")
    ok = False
    for _ in range(130):  # (the way from the road end is long: up to four game minutes)
        steps(2)
        if E("GLFAHNDUNG.cars.some(u => u.st === 'suche')"):
            ok = True
            break
    ck('it reaches the village and searches', ok, str(J("GLFAHNDUNG.stand().cars")))
    bl = J("GLKARTE.blips()")
    # (like GTA 6 since round 2: a patrol is on the radar only while it sees the player – welt's `gesehen`)
    seen = E("GLFAHNDUNG.stand().cars.some(c => c.gesehen !== false)")
    ck('the radar marks the patrol car (while it sees him), the place they search and the garden', (any(q['k'] == 'polizei' for q in bl) or not seen) and any(q['k'] == 'such' for q in bl)
       and any(q['k'] == 'ort' for q in bl), str(bl))
    pic('03_streife')
    ok = wait("GLLOGIK.stars(GLSTATE.W) === 0", 200)
    ck('out of sight the stars go – escaped', ok and E("GLSTATE.stats.entkommen") >= 1, str(J("GLFAHNDUNG.stand()")))
    # ---- caught ----
    E("GLFAHNDUNG.clear(); GLSTATE.geld = 300; GLFAHNDUNG.tat('schlag', { force: [{ name: 'Streife', police: true }] }); GLFAHNDUNG.erwischt()")
    steps(0.5)
    st = J("({ bust: !document.getElementById('glbust').hidden, geld: GLSTATE.geld, n: GLSTATE.stats.erwischt, sterne: GLLOGIK.stars(GLSTATE.W) })")
    ck('caught: the screen, the fine, the level calm', st['bust'] and st['geld'] < 300 and st['n'] == 1 and st['sterne'] == 0, str(st))
    pg.click('#glbustb')
    for _ in range(12):
        time.sleep(0.5); steps(0.3)
    st = J("({ w: KERN.where(), m: Math.floor(CLOCK.t) % 1440, bust: document.getElementById('glbust').hidden })")
    ck('the next morning in the garden', st['bust'] and abs(st['w'][0]) < 30 and abs(st['w'][1]) < 40 and abs(st['m'] - 450) < 20, str(st))
    # ---- a mission that is done: the big line ----
    E("KERN.emit('grenzland:mission', { id: 'probe', st: 'erledigt', titel: 'Ein Gefallen', lohn: '+50 €' })")
    steps(0.3)
    ps = J("({ on: !document.getElementById('glpass').hidden, t: document.getElementById('glpass').textContent })")
    ck('„Mission bestanden“ with title and reward', ps['on'] and 'Mission bestanden' in ps['t'] and 'Ein Gefallen' in ps['t'] and '50' in ps['t'], str(ps))
    pic('04_bestanden')
    # ---- a reload goes on ----
    E("GLSTATE.geld = 77; GLSTATE.save(true)")
    lib.boot(pg, port, '', figures=True)
    time.sleep(3)
    for _ in range(8):
        steps(0.3); time.sleep(0.4)
    st = J("({ on: GLSTATE.on, geld: GLSTATE.geld, hud: !document.getElementById('glhud').hidden, mode: KERN.where().length })")
    ck('a reload goes on with the saved state', st['on'] and st['geld'] == 77 and st['hud'], str(st))
    kal = J(KAL)
    ck('and with the story\'s calendar (the Saturday after the night at the station), the radar again', kal['iso'] == '2026-09-05' and kal['map'], str(kal))
    # ---- the end ----
    E("GRENZLAND.stop()")
    steps(0.5)
    st = J("({ on: GLSTATE.on, hud: document.getElementById('glhud').hidden, figs: GLFIG.figs.length, cars: GLAUTO.cars.length, fig: AVATAR.kind, "
           "moped: GLAUTO.moped ? GLAUTO.moped.g.visible : false, era: document.body.dataset.glEra || '' })")
    ck('„Beenden“ puts everything back', not st['on'] and st['hud'] and st['figs'] == 0 and st['cars'] == 0 and not st['moped'] and st['era'] == '', str(st))
    kal = J(KAL)
    ck('the game\'s own calendar is back, the radar gone', kal['e0'] == e0alt and not kal['map'], str(kal) + ' ' + str(e0alt))
    okgl, rep = lib.check_gl(pg)
    ck('at most 16 textures per shader program, none broken', okgl, str({k: rep[k] for k in ('maxFrag', 'maxVert')}))
    ck.errors(errs)
    ck.done()
