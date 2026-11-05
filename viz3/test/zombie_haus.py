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
    mi = mem()
    ck('no new shader programs from the house (mounted, drawn)', mi['p'] <= m0['p'], f"{m0} -> {mi}")
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
    # the other ground-floor openings boarded as well (else it takes the easiest way in – an open window next to it)
    E("""(() => { const st = ZSTATE.house(ZHAUS.bid); for (const o of ZHAUS.H.openings) if (!o.floor) st.bar[o.id] = 100; ZHAUS.boardsAll(); })()""")
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
    # the player right behind the boarded window (Falko 5.11., 17:57: they hurt him from outside, unseen – they must break in first)
    if op:
        E(f"""(() => {{ const o = {json.dumps(op)}, P = GAME.P, mx = (o.a[0] + o.b[0]) / 2, my = (o.a[1] + o.b[1]) / 2;
          P.x = mx - o.n[0] * 0.8; P.y = my - o.n[1] * 0.8; P.feet = GAME.floorAt(P.x, P.y, o.z0 + 0.3); P.yaw = P.body = Math.atan2(o.n[0], o.n[1]) * 180 / Math.PI; }})()""")
        # one right outside the wall, 1.2 m from him: no blow through it
        thru = J(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'), o = {json.dumps(op)}, mx = (o.a[0] + o.b[0]) / 2, my = (o.a[1] + o.b[1]) / 2,
          x0 = e.x, y0 = e.y, z0 = e.z; e.x = mx + o.n[0] * 0.4; e.y = my + o.n[1] * 0.4; e.z = GAME.floorAt(e.x, e.y, o.z0 + 0.5);
          const r = {{ reach: ZHORDE.canReach(e, ZHORDE.me()), wall: ZHORDE.wallBetween(e.x, e.y, GAME.P.x, GAME.P.y, GAME.P.feet), d: +Math.hypot(e.x - GAME.P.x, e.y - GAME.P.y).toFixed(2) }};
          e.x = x0; e.y = y0; e.z = z0; return r; }})()""")
        ck('a zombie outside the wall cannot strike the player inside (1.2 m apart)', not thru['reach'], str(thru))
    E("ZSTATE.hp = 100")
    banged = broke = False
    hurt_out = 0
    for i in range(120):
        steps(0.25)
        st = J(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'); return {{ hp: ZSTATE.house(ZHAUS.bid).bar['{op['id'] if op else ''}'] || 0, house: e ? e.house : null, st: e ? e.st : null,
          d: e ? +Math.hypot(e.x - GAME.P.x, e.y - GAME.P.y).toFixed(1) : null, php: ZSTATE.hp }}; }})()""")
        if st['hp'] < hp0: banged = True
        if st['house'] == hid: broke = True; break
        hurt_out = max(hurt_out, 100 - st['php'])
        if i == 30: pic('04_haemmern')
        if i % 12 == 0: time.sleep(0.2)
    ck('a zombie hammers on the boards (they wear down)', banged, str(st))
    ck('… while it is outside the player takes no harm (nothing through the wall)', hurt_out == 0, f'hp lost {hurt_out}')
    ck('… and breaks in', broke, str(st))
    steps(0.6)
    # inside: drawn, on the floor of the room, facing the player – and now it can reach him
    st = J(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zid}'); if (!e) return null; const P = GAME.P;
      P.yaw = P.body = Math.atan2(e.x - P.x, e.y - P.y) * 180 / Math.PI;
      return {{ drawn: !!(e.F && e.F.g.visible && e.F.g.parent), dz: +(e.z - P.feet).toFixed(2), inside: ZHAUS.H.inside(e.x, e.y, e.z + 0.5), d: +Math.hypot(e.x - P.x, e.y - P.y).toFixed(2) }}; }})()""")
    ck('the zombie that broke in is drawn, inside, on the floor of the room', bool(st) and st['drawn'] and st['inside'] and abs(st['dz']) < 0.35, str(st))
    steps(0.3)
    pic('05_drin')
    hp1 = E("ZSTATE.hp")
    for i in range(24):
        steps(0.25)
        if E("ZSTATE.hp") < hp1: break
    ck('… and inside it reaches the player', E("ZSTATE.hp") < hp1, str(J("[ZSTATE.hp, ZSTATE.ents.filter(q => q.house).map(q => [q.st, +q.d.toFixed(2)])]")))
    # ---- hiding (Falko 5.11., 17:57: „Schleichen“ – „Verstecke im Haus“): under a bed or in a searched wardrobe ----
    E("ZHORDE.clear(); ZSTATE.hp = 100")
    hs = J("""(() => { const H = ZHAUS.H, b = (H.spots || []).find(s => s.kind === 'bett'), k = (H.containers || []).find(c => c.kind === 'kleiderschrank');
      const cel = new Set(H.rooms.filter(r => r.kind === 'keller').map(r => r.id)), g = (H.containers || []).find(c => c.kind === 'regal' && cel.has(c.room));
      const t = b ? { id: 'zhaus:hidebed:' + b.id, pos: b.pos } : k ? { id: 'zhaus:hide:' + k.id, pos: k.pos, cid: k.id } : g ? { id: 'zhaus:hidecellar:' + g.id, pos: g.pos } : null;
      if (!t) return null; if (t.cid) ZSTATE.house(ZHAUS.bid).looted.push(t.cid);
      const P = GAME.P, r = H.rooms.find(q => H.roomAt && H.roomAt(t.pos[0], t.pos[1], t.pos[2] + 0.3) === q.id), c = r ? [r.poly.reduce((s, q) => s + q[0], 0) / r.poly.length, r.poly.reduce((s, q) => s + q[1], 0) / r.poly.length] : [P.x, P.y],
        dx = c[0] - t.pos[0], dy = c[1] - t.pos[1], L = Math.hypot(dx, dy) || 1;
      P.x = t.pos[0] + dx / L * 0.9; P.y = t.pos[1] + dy / L * 0.9; P.feet = GAME.floorAt(P.x, P.y, t.pos[2] + 0.3); P.yaw = P.body = Math.atan2(-dx, -dy) * 180 / Math.PI;
      return t; })()""")
    if hs:
        steps(0.3)
        lab = E(f"(() => {{ const a = KERN.acts().find(a => a.id === '{hs['id']}'); return a ? a.label() : null; }})()")
        ck('at night: „Unters Bett kriechen“ / „Im Kleiderschrank verstecken“ / „Hinter dem Regal verstecken“', bool(lab) and ('Bett' in lab or 'Kleiderschrank' in lab or 'Regal' in lab), str(lab) + ' ' + hs['id'])
        E(f"KERN.acts().find(a => a.id === '{hs['id']}').run()")
        steps(0.8)
        st = J("({ hidden: !!ZSTATE.hidden, view: !!document.getElementById('zhide') && !document.getElementById('zhide').hidden, seated: PLAY.seated() })")
        ck('hidden: the view from inside, seated there', st['hidden'] and st['view'] and st['seated'], str(st))
        pic('07_versteckt')
        try: pg.screenshot(path=os.path.join(OUT, '07_versteckt_hud.png'))
        except Exception as e: print('screenshot failed', e)
        # one in the house 4 m away does not find him; one right in front of where he went in finds him after a while
        zf = E("""(() => { const P = GAME.P, a = (P.yaw + 180) * Math.PI / 180, x = P.x + Math.sin(a) * 3.5, y = P.y + Math.cos(a) * 3.5;
          const e = ZHORDE.ent(ZFIG.people()[0], x, y, P.feet, 0, { st: 'wander', house: ZHAUS.bid, art: 'normal' }); return e.id; })()""")
        for i in range(30):
            steps(0.2)
            if E(f"(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zf}'); return !!(e && e.F); }})()"): break
            time.sleep(0.2)
        E(f"(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zf}'); e.st = 'wander'; e.tx = e.x; e.ty = e.y; }})()")
        steps(3)
        far = J(f"(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zf}'); return [e.st, !!ZSTATE.hidden, +e.d.toFixed(1)]; }})()")
        ck('… one in the room 3.5 m away does not notice him', far[0] != 'chase' and far[1], str(far))
        # (right in front of the hiding place: from where he went in, a step further into the room)
        E(f"""(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zf}'), P = GAME.P, a = (P.yaw + 180) * Math.PI / 180;
          e.x = P.x + Math.sin(a) * 0.65; e.y = P.y + Math.cos(a) * 0.65; e.z = P.feet; e.hold = 'idle'; }})()""")
        # (it stays right there – busy with something on the floor – and looks round now and then)
        E(f"(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zf}'); e.hold = false; e.st = 'eat'; }})()")
        found = False
        for i in range(60):
            steps(0.25)
            if not E("!!ZSTATE.hidden"): found = True; break
        st = J(f"(() => {{ const e = ZSTATE.ents.find(q => q.id === '{zf}'); return {{ st: e.st, d: +e.d.toFixed(2), seated: PLAY.seated(), view: !document.getElementById('zhide').hidden }}; }})()")
        ck('… one right in front of it finds him: out, it is on him', found and st['st'] == 'chase' and not st['seated'] and not st['view'], str(st))
        E("ZHORDE.clear()")
    else:
        ck('a bed, a wardrobe or a cellar shelf to hide behind', False, 'none in this house')
    # out: the boards off the front door first
    E("""(() => { const st = ZSTATE.house(ZHAUS.bid), f = ZHAUS.H.openings.find(o => o.front); if (f) st.bar[f.id] = 0; })()""")
    E("ZSTATE.hp = 100; (async () => { await ZHAUS.leave(); })()")
    for i in range(40):
        time.sleep(0.5)
        if E("!ZHAUS.H && !ZHAUS.busy"): break
    steps(0.5)
    m1 = mem()
    st = J("({ H: !!ZHAUS.H, mounted: ZINNEN.mounted().length, out: !document.getElementById('zdead') || document.getElementById('zdead').hidden })")
    ck('out again: interior away', not st['H'] and st['mounted'] == 0, str(st))
    print('memory before, inside, after', m0, mi, m1, flush=True)  # (the night's zombies and blood add their own)
    pic('06_draussen')
    terr = pg.evaluate("(window.LOADLOG && LOADLOG.errs || []).filter(e => /Takt (zombie|zinnen)/.test(e)).map(e => e.slice(0, 300))")
    ck('no zombie tick broke', not terr, ' | '.join(terr[:2]))
    ck('no zombie lost its place (NaN)', not pg.evaluate("ZHORDE.badAt || ''"), pg.evaluate("ZHORDE.badAt || ''"))
    ck.errors(errs)
ck.done()
