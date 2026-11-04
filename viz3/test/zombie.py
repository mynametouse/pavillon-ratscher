# feat/zombie (Falko, 4.11.2026): the zombie night. Starts the scene (?szenario=zombie), checks the mode (panel, weapons in the garden, the
# clock at 16:30), takes the spade, then the evening at the Anger: the siren at 21:00, the villagers out of doors turn and more come out of
# the houses (figures loaded, zombie posture), they see and chase the player, strike (health falls), the spade hits (knock-back, death),
# the chainsaw cuts (limbs off, blood on the ground), the shotgun fires, a car runs one over, dawn sends them back into the houses, dying
# brings the morning, „Beenden“ puts everything back (no zombies, no panel, the village as before). Pictures in out/zombie/.
#   python3 viz3/test/zombie.py 8996        (~6 min in the chat machine)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('zombie')
OUT = lib.out('zombie')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=zombie', figures=True)
    E = pg.evaluate
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try:
            lib.shot(pg, OUT, name)
            pg.screenshot(path=os.path.join(OUT, name + '_hud.png'))
        except Exception as e:
            print('shot failed', name, e)
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    st = J("({ on: ZSTATE.on, phase: ZSTATE.phase, hud: !document.getElementById('zhud').hidden, hm: CLOCK.hm(), date: DN.dateShort ? DN.dateShort() : '', T: ZOMBIE.times(), m: Math.floor(CLOCK.t) % 1440, w: Object.fromEntries(Object.entries(ZWAFFE.things).map(([k, t]) => [k, t.state])), tasks: KERN.tasks.list().filter(t => t.key.includes('zombie')).map(t => t.status) })")
    ck('the scene starts the zombie night (mode on, panel, 31 October, 2.5 h before the siren)', st['on'] and st['hud'] and '31.10' in st['date'] and abs(st['m'] - st['T']['start']) < 3 and 16 * 60 < st['T']['siren'] + 30 < 19 * 60, str(st))
    ck('weapons lie in the garden', sum(1 for v in st['w'].values() if v == 'world') >= 4, str(st['w']))
    steps(0.5)
    pic('01_start')
    # take the spade
    E("PLAY.give(ZWAFFE.things.spaten)")
    ck('the spade in the hand', E("ZWAFFE.cur()") == 'spaten', E("ZWAFFE.cur()"))
    # to the Anger in the evening, just before the siren
    E("GAME.go('dorf'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + ZOMBIE.times().siren - 0.5; DN && DN.active && DN.update(true)")
    lib.settle_light(pg)
    steps(1.0)
    st = J("({ phase: ZSTATE.phase, night: ZSTATE.night, siren: ZTON.sirenOn(), hm: CLOCK.hm() })")
    ck('at dusk the siren, the night begins', st['phase'] == 'nacht' and st['night'] == 1, str(st))
    E("CLOCK.focus('test')")  # the clock in real time from here (a fast machine would step through the whole night in the loops below)
    # they turn after a few seconds and load
    t0 = time.time()
    while time.time() - t0 < 120:
        steps(0.5)
        n = J("({ n: ZSTATE.ents.length, f: ZSTATE.ents.filter(e => e.F).length })")
        if n['f'] >= 3: break
        time.sleep(1)
    n = J("({ n: ZSTATE.ents.length, f: ZSTATE.ents.filter(e => e.F).length, keys: ZSTATE.ents.map(e => e.key), loads: ZFIG.loads, err: ZFIG.err })")
    ck('zombies come (figures loaded)', n['f'] >= 3, str(n))
    # bring the nearest one in front of the player and look at it
    E("""(() => { const e = ZSTATE.ents.find(q => q.F); const a = P.yaw * Math.PI / 180; e.x = P.x + Math.sin(a) * 3; e.y = P.y + Math.cos(a) * 3;
      e.z = GAME.floorAt(e.x, e.y, P.feet + 0.5); e.st = 'wander'; e.F.g.visible = true; })()""".replace('P.', 'GAME.P.'))
    steps(0.6)
    pic('02_zombie_near')
    hp0 = E("ZSTATE.hp")
    # it sees the player, comes and strikes
    t0 = time.time()
    while time.time() - t0 < 40 and E("ZSTATE.hp") >= hp0:
        steps(0.5)
    st = J("({ hp: ZSTATE.hp, st: ZSTATE.ents.filter(e => e.F).map(e => e.st) })")
    ck('a zombie chases and strikes (health falls)', st['hp'] < hp0, str(st))
    pic('03_attacked')
    # the spade: hit the nearest until it falls
    killed = False
    for i in range(30):
        E("""(() => { const e = ZHORDE.nearest(GAME.P.x, GAME.P.y, 6); if (!e) return; GAME.P.yaw = GAME.P.body = Math.atan2(e.x - GAME.P.x, e.y - GAME.P.y) * 180 / Math.PI;
          if (Math.hypot(e.x - GAME.P.x, e.y - GAME.P.y) > 1.6) { e.x = GAME.P.x + (e.x - GAME.P.x) * 0.5; e.y = GAME.P.y + (e.y - GAME.P.y) * 0.5; } ZSTATE.stam = 100; ZWAFFE.press(); })()""")
        steps(0.6)
        E("ZWAFFE.release()")
        if E("ZSTATE.kills") > 0:
            killed = True
            break
    ck('the spade kills one', killed, J("({ kills: ZSTATE.kills, hp: ZSTATE.ents.map(e => Math.round(e.hp)) })"))
    steps(1.0)
    pic('04_dead')
    # the chainsaw: fuel, start, cut
    E("ZSTATE.hp = 100; PLAY.give(ZWAFFE.things.motorsaege); ZWAFFE.state('motorsaege').fuel = 0.5")
    E("""(() => { const e = ZSTATE.ents.find(q => q.F && !q.dead) || ZHORDE.ent(ZFIG.people()[0], GAME.P.x + 1, GAME.P.y + 1, GAME.P.feet, 0);
      window.__saw = e.id; })()""")
    t0 = time.time()
    while time.time() - t0 < 30 and not E("!!(ZSTATE.ents.find(e => e.id === __saw) || {}).F"):
        steps(0.3); time.sleep(0.5)
    E("ZWAFFE.press()")
    steps(2.0)
    cuts0 = E("ZSTATE.cuts")
    for i in range(40):
        E("""(() => { const e = ZSTATE.ents.find(q => q.id === __saw); if (!e || e.dead) return; const a = GAME.P.yaw * Math.PI / 180;
          e.x = GAME.P.x + Math.sin(a) * 1.0; e.y = GAME.P.y + Math.cos(a) * 1.0; e.wind = 0; e.cd = 1; ZSTATE.hp = 100; })()""")
        steps(0.2)
        if E("(ZSTATE.ents.find(e => e.id === __saw) || { dead: true }).dead"): break
    E("ZWAFFE.release()")
    st = J("({ cuts: ZSTATE.cuts, kills: ZSTATE.kills, saw: ZWAFFE.info(), stains: ZFX.stains, drops: ZFX.drops.length, gibs: ZFX.gibs.length })")
    ck('the chainsaw cuts (limbs off, blood)', st['cuts'] > cuts0 and st['stains'] > 3, str(st))
    pic('05_chainsaw')
    # the shotgun
    E("PLAY.give(ZWAFFE.thing('flinte')); ZWAFFE.state('flinte').ammo = 2; ZSTATE.add('schrot', 6)")
    E("""(() => { const e = ZSTATE.ents.find(q => q.F && !q.dead); if (!e) return; const a = GAME.P.yaw * Math.PI / 180; e.x = GAME.P.x + Math.sin(a) * 5;
      e.y = GAME.P.y + Math.cos(a) * 5; e.z = GAME.floorAt(e.x, e.y, GAME.P.feet + 0.5); window.__gun = e.id; window.__hp = e.hp; GAME.P.pitch = 0; })()""")
    steps(0.2)
    E("ZWAFFE.press(); ZWAFFE.release()")
    steps(0.4)
    st = J("({ ammo: ZWAFFE.state('flinte').ammo, hp: (ZSTATE.ents.find(e => e.id === window.__gun) || { hp: -1 }).hp, was: window.__hp })")
    ck('the shotgun fires and hits', st['ammo'] == 1 and (st['hp'] < st['was']), str(st))
    E("ZWAFFE.reload()")
    time.sleep(2.6)
    steps(0.2)
    ck('R reloads', E("ZWAFFE.state('flinte').ammo") == 2, str(E("ZWAFFE.state('flinte').ammo")))
    # a car runs one over
    ok_car = E("!!(window.VEH && VEH.by && VEH.by.car)")
    if ok_car:
        E("""(() => { const e = ZSTATE.ents.find(q => q.F && !q.dead) || ZHORDE.ent(ZFIG.people()[0], GAME.P.x, GAME.P.y, GAME.P.feet, 0);
          window.__run = e.id; const x = e.x - 18, y = e.y; VEH.place('car', x, y, Math.PI / 2); VEH.enter('car'); e.st = 'wander'; e.sp = 0.001; })()""")
        steps(0.5)
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
        hit = False
        for i in range(30):
            steps(0.25)
            E("(() => { const e = ZSTATE.ents.find(q => q.id === __run); const v = VEH.cur; if (e && v && !e.fly && !e.dead) { e.y = v.st.y; } })()")
            if E("ZSTATE.runover") > 0: hit = True; break
        E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: false })"); steps(1.0); E("VEH.auto = null")
        ck('a car runs one over (it flies)', hit, J("({ runover: ZSTATE.runover, u: VEH.cur ? VEH.cur.st.u : null })"))
        pic('06_car')
        E("VEH.exit()")
        steps(0.5)
    # dying: the screen, then the morning in the garden
    E("ZSTATE.hurt(500, 'Test')")
    steps(0.3)
    ck('dying shows the screen', E("!document.getElementById('zdead').hidden"))
    pic('07_dead')
    E("document.getElementById('zdeadb').click()")
    steps(0.5)
    st = J("({ hp: ZSTATE.hp, phase: ZSTATE.phase, hm: CLOCK.hm(), ents: ZSTATE.ents.length, deaths: ZSTATE.deaths })")
    ck('the morning after, in the garden, alive', st['hp'] > 0 and st['deaths'] == 1 and st['ents'] == 0, str(st))
    # the end puts everything back
    E("ZOMBIE.stop()")
    steps(0.5)
    st = J("({ on: ZSTATE.on, hud: !document.getElementById('zhud').hidden, ents: ZSTATE.ents.length, live: ZFIG.live.size, protos: Object.keys(ZFIG.protos).length, w: Object.values(ZWAFFE.things).filter(t => t.state !== 'gone').length })")
    ck('„Beenden“ puts everything back', not st['on'] and not st['hud'] and st['ents'] == 0 and st['live'] == 0 and st['w'] == 0, str(st))
    print('programs', E("GAME.R.info.programs.length"), flush=True)
    ck.errors(errs)
ck.done()
