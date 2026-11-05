# feat/zombie-ziele (Falko, 5.11.2026: „Ziele mit Wegweiser“, „Steigende Nächte mit Ende“): the objectives of the zombie night
# (zombie/z_ziele.js ZZIEL on TASKS). Starts the scene: the chain begins with Hubert's shotgun, tracked on the task card (shown beside the
# zombie panel) with an arrow and a distance that falls as the walker goes there; the marker in the world over the target (≤ 150 m, gone
# near the target, far away and in the free view, no new shader program); taking the gun → „Hubert fragen“ (target: Hubert), he joins →
# „Vorräte“ (target: the nearest house not searched), supplies found → „Ein Haus vernageln“, two openings boarded → the night's task
# („Halte durch …“), the siren → „Überlebe …“, the morning → day 2 („Ronald hat Hunger“). Pictures in out/zombie_ziele/.
#   python3 viz3/test/zombie_ziele.py 8998 [sections]      sections: tag1,nacht (default all)
import sys, os, json, time, math, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'tag1,nacht').split(','))
ck = lib.Checks('zombie_ziele')
OUT = lib.out('zombie_ziele')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=zombie')
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    # page pictures with the panels: without the blurred backdrops (minutes in SwiftShader otherwise)
    E("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e)
    def page_pic(name):
        try:
            E("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
        except Exception as e: print('note: page shot', name, 'failed:', repr(e)[:160], flush=True)
    progs = lambda: E("GAME.R.info.programs.length")
    # the tracked entry: id, step text, target, distance on the card
    def cur():
        return J("""(() => { const e = KERN.tasks.list().find(e => e.key === QUESTS.track), t = document.getElementById('qtrack'), cs = getComputedStyle(t);
          let tp = null; try { tp = e && e.target ? e.target() : null; } catch (err) {}
          const em = t.querySelector('em');
          return { key: QUESTS.track, title: e ? e.title : null, text: e ? e.text : null, status: e ? e.status : null, tp, own: !!(e && e.target && e.target.ownMark),
            card: !t.hidden && cs.display !== 'none', cardText: t.textContent, dist: em ? parseInt(em.textContent) : null,
            mk: !!(ZZIEL.MK.on && ZZIEL.MK.ring && ZZIEL.MK.ring.visible), P: [+GAME.P.x.toFixed(1), +GAME.P.y.toFixed(1)] }; })()""")
    # walk towards (x, y) in n steps, stopping `stop` m before it; the card's distances on the way
    def walk_to(x, y, stop=4.0, n=5):
        ds = []
        for i in range(n):
            E(f"""(() => {{ const P = GAME.P, dx = {x} - P.x, dy = {y} - P.y, d = Math.hypot(dx, dy), s = (d - {stop}) / {n - i};
              if (s > 0) {{ P.x += dx / d * s; P.y += dy / d * s; }} P.feet = GAME.floorAt(P.x, P.y, P.feet + 1.5); P.yaw = P.body = Math.atan2(dx, dy) * 180 / Math.PI; P.pitch = -4; }})()""")
            steps(0.3)
            c = cur()
            ds.append(c['dist'])
        return ds
    falls = lambda ds: len([d for d in ds if d is not None]) >= 3 and all(a is not None and b is not None and b < a for a, b in zip(ds, ds[1:]))
    steps(3.5)  # the intro first, then the chain starts
    E("GAME.shot()")  # (the marker's program is made in the first drawn frame of the mode)
    steps(0.2)
    st = J("({ warm: ZZIEL.MK.warm, mode: ZSTATE.on, old: TASKS.list().includes('zombie-1'), flinte: TASKS.state('zz-flinte') })")
    ck('the zombie night runs, the old task zombie-1 is gone (moved to zombie/z_ziele.js)', st['mode'] and not st['old'], str(st))
    ck('the marker\'s program was made when the mode started', st['warm'], str(st))
    p0 = progs()
    if 'tag1' in want:
        c = cur()
        ck('the chain begins: „Huberts Flinte“ runs and is tracked', c['key'] == 'aufgaben:zz-flinte' and c['status'] == 'läuft', str(c)[:300])
        ck('the task card is shown beside the zombie panel, with the step and a distance', c['card'] and 'Flinte' in (c['cardText'] or '') and (c['dist'] or 0) > 5, str(c)[:300])
        g = J("ZWAFFE.thing('flinte').pos")
        ck('its target is the gun on Hubert\'s table (own marker, none of the task card\'s)', c['tp'] and math.hypot(c['tp'][0] - g[0], c['tp'][1] - g[1]) < 0.3 and c['own'], f"{c['tp']} gun {g}")
        rect = J("(() => { const a = document.getElementById('zhud').getBoundingClientRect(), b = document.getElementById('qtrack').getBoundingClientRect(); return { zhud: [a.left, a.top, a.right, a.bottom].map(Math.round), card: [b.left, b.top, b.right, b.bottom].map(Math.round) }; })()")
        z, k = rect['zhud'], rect['card']
        ck('the card does not cover the zombie panel', k[0] >= z[2] or k[1] >= z[3], str(rect))
        page_pic('01_karte')
        ds = walk_to(g[0], g[1], stop=12, n=4)
        ck('walking to the gun: the distance on the card falls', falls(ds), str(ds))
        c = cur()
        ck('the marker is over the target (3.5–150 m)', c['mk'], str(c)[:200])
        pic('02_marker_flinte')
        ck('no new shader program for the marker', progs() <= p0, f'{p0} -> {progs()}')
        # far and in the free view: no marker
        E(f"(() => {{ const P = GAME.P; P.x = {g[0]} + 205; P.y = {g[1]} + 20; P.feet = GAME.floorAt(P.x, P.y, 30); }})()")
        steps(0.4)
        far = cur()
        E(f"(() => {{ const P = GAME.P; P.x = {g[0]} + 30; P.y = {g[1]} + 6; P.feet = GAME.floorAt(P.x, P.y, 5); P.yaw = P.body = -100; }})()")
        steps(0.4)
        near_ = cur()
        E("document.body.dataset.clean = '1'")
        steps(0.3)
        clean = cur()
        E("document.body.dataset.clean = ''")
        steps(0.3)
        ck('the marker: not beyond 150 m, there at 30 m, not in the free view („Sicht“, the card neither)', not far['mk'] and near_['mk'] and not clean['mk'] and not clean['card'],
           f"far {far['mk']} near {near_['mk']} clean {clean['mk']}/{clean['card']}")
        ds2 = walk_to(g[0], g[1], stop=2.0, n=3)
        c = cur()
        ck('… and gone right at the target', not c['mk'], str(ds2) + ' ' + str(c)[:200])
        # take it (the action button's run) → the next objective: Hubert
        E("(() => { const a = KERN.acts().find(a => a.id === 'take:zw_flinte'); if (a) a.run(); })()")
        steps(1.2)
        c = cur()
        h = J("[NPC.NPCS.hubert.x, NPC.NPCS.hubert.y]")
        ck('the gun taken → „Hubert fragen“, its target is Hubert', c['key'] == 'aufgaben:zz-hubert' and c['tp'] and math.hypot(c['tp'][0] - h[0], c['tp'][1] - h[1]) < 0.5,
           str(c)[:300] + ' hubert ' + str(h))
        ck('„Huberts Flinte“ is done', J("TASKS.state('zz-flinte')")['st'] == 'erledigt', str(J("TASKS.state('zz-flinte')")))
        # he joins (the talk's topic „Hilfst du mir gegen die Zombies?“)
        E("(() => { const r = QUESTS.ask('hubert', 'q_zhilf'); if (r && r.after) r.after(); })()")
        steps(1.2)
        c = cur()
        hd = J("ZINNEN.list().map(h => [h.id, h.door.x + h.door.nx * 1.4, h.door.y + h.door.ny * 1.4])")
        near = [q for q in hd if c['tp'] and math.hypot(q[1] - c['tp'][0], q[2] - c['tp'][1]) < 0.5]
        ck('Hubert with us → „Vorräte“, its target is the door of a house not searched', c['key'] == 'aufgaben:zz-vorrat' and len(near) == 1, str(c)[:300])
        hid = near[0][0] if near else None
        tp = c['tp'] or [0, 0]
        d0 = math.hypot(tp[0] - c['P'][0], tp[1] - c['P'][1])
        # (no house nearer to where we are than the chosen one, give or take a few metres)
        dn = min(math.hypot(q[1] - c['P'][0], q[2] - c['P'][1]) for q in hd)
        ck('… the nearest one', d0 <= dn * 1.25 + 8, f'{d0:.0f} m, nearest {dn:.0f} m')
        ds = walk_to(tp[0], tp[1], stop=10, n=4)
        ck('walking to the house: the distance on the card falls', falls(ds), str(ds))
        c = cur()
        ck('the marker over the house', c['mk'], str(c)[:200])
        pic('03_marker_haus')
        # supplies found → the house
        E("ZSTATE.add('konserve', 2); ZSTATE.add('wasser', 1)")
        steps(1.2)
        c = cur()
        ck('supplies found → „Ein Haus vernageln“ (no boards yet: it says where to find them)', c['key'] == 'aufgaben:zz-haus' and 'Bretter' in (c['text'] or ''), str(c)[:300])
        E("ZSTATE.add('brett', 4); ZSTATE.add('nagel', 2)")
        steps(0.8)
        c = cur()
        ck('with boards and nails: „Vernagle … (0/2)“', '0/2' in (c['text'] or ''), str(c)[:300])
        # two openings of that house boarded (as ZHAUS does it)
        if hid is not None:
            E(f"(() => {{ const st = ZSTATE.house({hid}); st.bar['t1'] = 100; st.bar['t2'] = 100; ZSTATE.save(); }})()")
        steps(1.2)
        c = cur()
        ck('two boarded → the night\'s task: „Halte durch, bis die Sirene heult“, target the safe house',
           c['key'] == 'aufgaben:zz-nacht1' and 'Sirene' in (c['text'] or '') and c['tp'] is not None, str(c)[:300])
        page_pic('04_halte_durch')
    if 'nacht' in want:
        if 'tag1' not in want:
            # (the day's objectives done at once)
            E("""(() => { ZSTATE.weap.flinte = { cond: 100, fuel: 0, ammo: 2 }; ZSTATE.clan.members.push('hubert'); ZSTATE.add('konserve', 3); ZSTATE.add('wasser', 2);
              const h = ZINNEN.list()[0]; const st = ZSTATE.house(h.id); st.bar.t1 = 100; st.bar.t2 = 100; })()""")
            steps(3)
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + ZOMBIE.times().siren - 0.5")
        lib.settle_light(pg)
        steps(1.5)
        c = cur()
        ck('the siren → night 1: „Überlebe bis zum Morgengrauen …“', c['key'] == 'aufgaben:zz-nacht1' and 'Morgengrauen' in (c['text'] or '') and J("ZSTATE.phase") == 'nacht',
           str(c)[:300] + ' ' + J("ZSTATE.phase"))
        # look towards the safe house from 30 m: the marker at night
        if c['tp']:
            tp = c['tp']
            E(f"""(() => {{ const P = GAME.P; P.x = {tp[0]} + 22; P.y = {tp[1]} + 18; P.feet = GAME.floorAt(P.x, P.y, 30); P.yaw = P.body = Math.atan2({tp[0]} - P.x, {tp[1]} - P.y) * 180 / Math.PI; P.pitch = 2;
              for (const e of ZSTATE.ents) e.hold = 'idle'; }})()""")
            # the night brings its own programs (the zombies, blood): the marker's share measured alone – hidden, a frame; shown, a frame
            E("document.body.dataset.clean = '1'")
            steps(0.3)
            E("GAME.shot()")
            pa = progs()
            E("document.body.dataset.clean = ''")
            steps(0.6)
            c = cur()
            ck('at night the marker shows the way to the safe house', c['mk'], str(c)[:200])
            pic('05_nacht_marker')
            ck('no new shader program for the marker at night', progs() <= pa, f'{pa} -> {progs()} (start {p0})')
            page_pic('06_nacht_karte')
        # the morning: survived → day 2
        E("ZSTATE.hp = 100; for (const e of ZSTATE.ents) e.hold = 'idle'")
        E("CLOCK.t = (Math.floor(CLOCK.t / 1440) + (((Math.floor(CLOCK.t) % 1440) > 720) ? 1 : 0)) * 1440 + ZOMBIE.times().dawn + 1")
        lib.settle_light(pg)
        steps(1.5)
        c = cur()
        ck('the morning → night 1 done, day 2 begins with „Ronald hat Hunger“', J("TASKS.state('zz-nacht1')")['st'] == 'erledigt' and c['key'] == 'aufgaben:zz-ronald',
           str(J("TASKS.state('zz-nacht1')")) + ' ' + str(c)[:300])
    terr = E("(window.LOADLOG && LOADLOG.errs || []).filter(e => /Takt zombie/.test(e)).map(e => e.slice(0, 300))")
    ck('no zombie tick broke', not terr, ' | '.join(terr[:2]))
    ck.errors(errs)
ck.done()
