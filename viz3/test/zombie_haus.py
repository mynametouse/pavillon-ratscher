# feat/zombie (Falko, 4.11.2026): the houses in the zombie night (zombie/z_haus.js on ZINNEN). Starts the scene, walks to a house door near
# the Anger, the action button says „Ins Haus gehen“, goes in (fade, interior mounted, the player inside), searches a container (supplies
# grow, a second time nothing), boards up a ground-floor window with two boards and nails (boards in the scene), then the night: a zombie
# outside smells the player, comes to the boarded window, hammers on the boards (they wear down), breaks in; the player goes out (the
# interior away, geometries back, no new shader programs). Pictures in out/zombie_haus/.
#   python3 viz3/test/zombie_haus.py 8996        (~5 min in the chat machine)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('zombie_haus')
OUT = lib.out('zombie_haus')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=zombie', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e)
    mem = lambda: J("({ g: GAME.R.info.memory.geometries, t: GAME.R.info.memory.textures, p: GAME.R.info.programs.length })")
    # a house near the Anger (the walk from the 'dorf' spot), its door
    h = J("""(() => { GAME.go('dorf'); const P = GAME.P, L = ZHAUS.doors();
      const s = L.map(h => ({ h, d: Math.hypot(h.door.x - P.x, h.door.y - P.y) })).filter(o => o.d > 4).sort((a, b) => a.d - b.d);
      return s.length ? { id: s[0].h.id, door: s[0].h.door, n: L.length } : { n: L.length }; })()""")
    ck('houses to enter (ZINNEN)', h.get('n', 0) > 50 and 'id' in h, str(h)[:300])
    if 'id' not in h:
        ck.errors(errs); ck.done()
    hid = h['id']
    E(f"""(() => {{ const d = {json.dumps(h['door'])}, P = GAME.P; P.x = d.x + d.nx * 1.0; P.y = d.y + d.ny * 1.0; P.feet = GAME.floorAt(P.x, P.y, (d.z || P.feet) + 0.5);
      P.yaw = P.body = Math.atan2(-d.nx, -d.ny) * 180 / Math.PI; }})()""")
    steps(0.5)
    lab = E("(() => { const a = KERN.acts().find(a => a.id === 'zhaus:enter'); try { return a ? a.label() : null; } catch (e) { return 'ERR ' + e.message; } })()")
    ck('at the door the button says „Ins Haus …“', bool(lab) and lab.startswith('Ins Haus'), str(lab))
    pic('01_tuer')
    m0 = mem()
    # in
    E(f"(async () => {{ await ZHAUS.enter(ZHAUS.doors().find(h => h.id === {hid})); }})()")
    for i in range(60):
        time.sleep(0.5)
        if E("!!ZHAUS.H && !ZHAUS.busy"): break
    steps(0.3)
    st = J("({ H: !!ZHAUS.H, bid: ZHAUS.bid, inside: ZHAUS.H ? ZHAUS.H.inside(GAME.P.x, GAME.P.y, GAME.P.feet + 1) : false, rooms: ZHAUS.H ? ZHAUS.H.rooms.length : 0, cont: ZHAUS.H ? ZHAUS.H.containers.length : 0, ops: ZHAUS.H ? ZHAUS.H.openings.length : 0 })")
    ck('in the house (interior mounted, the player inside)', st['H'] and st['inside'] and st['rooms'] >= 3, str(st))
    pic('02_drinnen')
    # search a container
    sr = J("""(() => { const H = ZHAUS.H, c = H.containers[0]; if (!c) return null; const before = JSON.stringify(ZSTATE.sup); const r1 = ZHAUS.search(c), r2 = ZHAUS.search(c);
      return { kind: c.kind, t1: r1.text, t2: r2.text, before, after: JSON.stringify(ZSTATE.sup), looted: ZSTATE.house(ZHAUS.bid).looted.length }; })()""")
    ck('a container is searched once (then „nichts mehr“)', sr and sr['looted'] >= 1 and 'nichts mehr' in sr['t2'], str(sr))
    # board up a ground-floor window
    E("ZSTATE.add('brett', 4); ZSTATE.add('nagel', 2)")
    op = J("""(() => { const o = ZHAUS.H.openings.find(o => o.kind === 'window' && !o.floor) || ZHAUS.H.openings.find(o => !o.floor && !o.front); return o ? { id: o.id, kind: o.kind, a: o.a, b: o.b, n: o.n, z0: o.z0 } : null; })()""")
    ok_bar = False
    if op:
        E(f"""(() => {{ const a = KERN.acts().find(a => a.id === 'zhaus:bar:{op['id']}'); a.run(); }})()""")
        steps(0.2)
        bar = J(f"({{ hp: ZSTATE.house(ZHAUS.bid).bar['{op['id']}'] || 0, boards: !!ZHAUS.boards.get('{op['id']}'), brett: ZSTATE.sup.brett || 0 }})")
        ok_bar = bar['hp'] >= 99 and bar['boards'] and bar['brett'] == 2
        ck('a window boarded up (2 boards, nails; boards in the scene)', ok_bar, str(bar) + ' ' + str(op))
    else:
        ck('a window boarded up (2 boards, nails; boards in the scene)', False, 'no ground-floor opening')
    # look at the boards from inside
    if op:
        E(f"""(() => {{ const o = {json.dumps(op)}, P = GAME.P, mx = (o.a[0] + o.b[0]) / 2, my = (o.a[1] + o.b[1]) / 2;
          P.x = mx - o.n[0] * 1.6; P.y = my - o.n[1] * 1.6; P.feet = GAME.floorAt(P.x, P.y, o.z0 + 0.3); P.yaw = P.body = Math.atan2(o.n[0], o.n[1]) * 180 / Math.PI; }})()""")
        steps(0.4)
        pic('03_brettern')
    # night: a zombie outside the boarded window – it smells the player, hammers, breaks in
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + ZOMBIE.times().siren - 0.5")
    lib.settle_light(pg)
    steps(1.0)
    ck('the night begins with the player inside', E("ZSTATE.phase") == 'nacht', E("ZSTATE.phase"))
    E("CLOCK.focus('test')")  # real time from here (a fast machine would step through the night)
    zid = None
    t0 = time.time()
    while time.time() - t0 < 90:
        steps(0.5)
        zid = E("(() => { const e = ZSTATE.ents.find(q => q.kind === 'zombie' && q.F && !q.dead && !q.house); return e ? e.id : null; })()")
        if zid: break
        time.sleep(0.5)
    if not zid:
        zid = E("(() => { const e = ZHORDE.ent(ZFIG.people()[0], GAME.P.x + 20, GAME.P.y, GAME.P.feet, 0); return e.id; })()")
    if op:
        E(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'), o = {json.dumps(op)}, mx = (o.a[0] + o.b[0]) / 2, my = (o.a[1] + o.b[1]) / 2;
          for (const q of ZSTATE.ents) if (q !== e && !q.house) q.hold = 'idle';
          e.x = mx + o.n[0] * 4; e.y = my + o.n[1] * 4; e.z = GAME.floorAt(e.x, e.y, o.z0 + 0.5); e.st = 'chase'; e.op = null; e.hold = false; e.sp = 1; }})()""")
    hp0 = J(f"ZSTATE.house(ZHAUS.bid).bar['{op['id']}'] || 0") if op else 0
    banged = broke = False
    for i in range(120):
        steps(0.25)
        st = J(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'); return {{ hp: ZSTATE.house(ZHAUS.bid).bar['{op['id'] if op else ''}'] || 0, house: e ? e.house : null, st: e ? e.st : null,
          d: e ? +Math.hypot(e.x - GAME.P.x, e.y - GAME.P.y).toFixed(1) : null }}; }})()""")
        if st['hp'] < hp0: banged = True
        if st['house'] == hid: broke = True; break
        if i == 30: pic('04_haemmern')
        if i % 12 == 0: time.sleep(0.2)
    ck('a zombie hammers on the boards (they wear down)', banged, str(st))
    ck('… and breaks in', broke, str(st))
    steps(0.6)
    pic('05_drin')
    # out (the window was the way in; the front door is free)
    E("ZSTATE.hp = 100; (async () => { await ZHAUS.leave(); })()")
    for i in range(40):
        time.sleep(0.5)
        if E("!ZHAUS.H && !ZHAUS.busy"): break
    steps(0.5)
    m1 = mem()
    st = J("({ H: !!ZHAUS.H, mounted: ZINNEN.mounted().length, out: !document.getElementById('zdead') || document.getElementById('zdead').hidden })")
    ck('out again: interior away', not st['H'] and st['mounted'] == 0, str(st))
    ck('no new shader programs from the house', m1['p'] <= m0['p'] + 1, f"{m0} -> {m1}")
    pic('06_draussen')
    ck.errors(errs)
ck.done()
