# feat/zombie-ziele (Falko, 5.11.2026: „Ziele mit Wegweiser“, „Steigende Nächte mit Ende“): the objectives of the zombie night
# (zombie/z_ziele.js ZZIEL on TASKS). Starts the scene: the chain begins with Hubert's shotgun, tracked on the task card (shown beside the
# zombie panel) with an arrow and a distance that falls as the walker goes there; the marker in the world over the target (≤ 150 m, gone
# near the target, far away and in the free view, no new shader program); taking the gun → „Hubert fragen“ (target: Hubert), he joins →
# „Vorräte“ (target: the nearest house not searched), supplies found → „Ein Haus vernageln“, two openings boarded → the night's task
# („Halte durch …“), the siren → „Überlebe …“, the morning → day 2 („Ronald hat Hunger“); a reload in the middle of night 2 goes on with
# the chain; day 3: „Nachrichten“ first, the radio in a house announces the bus; night 3 at 4:00 the bus comes to the old school (the last
# wave), „Einsteigen“ → the ending screen, „Weiterspielen“ → the next morning; a second run: the bus leaves without the player („Weg. Dann
# eben allein.“, the task „Allein weiter“). No new shader program for the marker or the bus, no page errors. Pictures in out/zombie_ziele/.
# Two players without a second browser: ZNETZ with a recording transport, the other's messages as their events (the host gets in →
# the guest's bus goes six seconds later; the guest gets in → the host hears it and has him on the bus).
#   python3 viz3/test/zombie_ziele.py 8998 [sections]      sections: tag1,nacht,reload,tag3,bus,verpasst,zuzweit (default all)
import sys, os, json, time, math, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'tag1,nacht,reload,tag3,bus,verpasst,zuzweit').split(','))
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
    E("(() => { window.__thoughts = []; const t0 = PLAY.think; PLAY.think = (t, ms) => { window.__thoughts.push(String(t)); return t0(t, ms); }; })()")
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
    steps(4.5)  # the intro first, then the chain starts
    E("GAME.shot()")  # (the marker's program is made in the first drawn frame of the mode)
    steps(0.2)
    st = J("({ warm: ZZIEL.MK.warm, mode: ZSTATE.on, old: TASKS.list().includes('zombie-1'), flinte: TASKS.state('zz-flinte') })")
    ck('the zombie night runs, the old task zombie-1 is gone (moved to zombie/z_ziele.js)', st['mode'] and not st['old'], str(st))
    ck('the link\'s ?szenario=zombie is gone from the address (a reload goes on with the night instead of starting it afresh)',
       'szenario' not in E("location.search"), E("location.href"))
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
        apart = lambda a, b: a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1]
        ck('the card does not cover the zombie panel (the panel on the right of a wide screen)', apart(k, z) and z[0] > 550, str(rect))
        page_pic('01_karte')
        # a talk (Falko 5.11. 21:48: the zombie panel lay over the talk's topics): the two apart, the card under the talk panel
        talk = "(() => { const R = id => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); }, p = document.getElementById('npcpanel'); return { zhud: R('zhud'), npc: R('npcpanel'), card: R('qtrack'), open: !p.hidden, zi: [+getComputedStyle(document.getElementById('qtrack')).zIndex || 0, +getComputedStyle(p).zIndex || 0], w: innerWidth }; })()"
        E("window.__pp = [GAME.P.x, GAME.P.y, GAME.P.feet, GAME.P.yaw]; (() => { const w = NPC.NPCS.hubert, P = GAME.P; P.x = w.x + 1.6; P.y = w.y; P.feet = GAME.floorAt(P.x, P.y, w.z || P.feet); P.yaw = P.body = Math.atan2(w.x - P.x, w.y - P.y) * 180 / Math.PI; })()")
        steps(0.3); E("NPC.NPCUI.start(NPC.NPCS.hubert)"); time.sleep(0.6); steps(0.2)
        rr = J(talk)
        ck('a talk on a wide screen: the zombie panel apart from the talk panel, the card under it', rr['open'] and apart(rr['zhud'], rr['npc']) and (apart(rr['card'], rr['npc']) or rr['zi'][0] < rr['zi'][1]), str(rr))
        page_pic('01c_gespraech')
        E("NPC.NPCUI.end(false); (() => { const P = GAME.P, a = window.__pp; P.x = a[0]; P.y = a[1]; P.feet = a[2]; P.yaw = P.body = a[3]; })()"); steps(0.2)
        # a phone's width: the card under the panel, inside the screen
        pg.set_viewport_size({'width': 390, 'height': 780})
        steps(0.6)
        rect = J("(() => { const a = document.getElementById('zhud').getBoundingClientRect(), b = document.getElementById('qtrack').getBoundingClientRect(); return { zhud: [a.left, a.top, a.right, a.bottom].map(Math.round), card: [b.left, b.top, b.right, b.bottom].map(Math.round), w: innerWidth }; })()")
        z, k = rect['zhud'], rect['card']
        ck('on a phone the card stands under the panel, inside the screen', k[1] >= z[3] and k[2] <= rect['w'] and k[3] > k[1], str(rect))
        page_pic('01b_karte_handy')
        E("window.__pp = [GAME.P.x, GAME.P.y, GAME.P.feet, GAME.P.yaw]; (() => { const w = NPC.NPCS.hubert, P = GAME.P; P.x = w.x + 1.6; P.y = w.y; P.feet = GAME.floorAt(P.x, P.y, w.z || P.feet); P.yaw = P.body = Math.atan2(w.x - P.x, w.y - P.y) * 180 / Math.PI; })()")
        steps(0.3); E("NPC.NPCUI.start(NPC.NPCS.hubert)"); time.sleep(0.6); steps(0.2)
        rr = J(talk)
        ck('a talk on a phone: zombie panel and card out of the talk panel\'s way', rr['open'] and apart(rr['zhud'], rr['npc']) and apart(rr['card'], rr['npc']), str(rr))
        E("NPC.NPCUI.end(false); (() => { const P = GAME.P, a = window.__pp; P.x = a[0]; P.y = a[1]; P.feet = a[2]; P.yaw = P.body = a[3]; })()"); steps(0.2)
        pg.set_viewport_size({'width': 1100, 'height': 680})
        steps(0.6)
        ds = walk_to(g[0], g[1], stop=12, n=4)
        ck('walking to the gun: the distance on the card falls', falls(ds), str(ds))
        c = cur()
        ck('the marker is over the target (3.5–150 m)', c['mk'], str(c)[:200])
        qm = J("GAME.scene.children.filter(o => o.isSprite && o.renderOrder === 999).map(o => o.visible)")
        ck('… and the task card\'s own diamond (game/quests.js) is not shown for it', not any(qm), str(qm))
        # the marker's share alone: hidden, a frame; shown, a frame
        E("document.body.dataset.clean = '1'")
        steps(0.3)
        E("GAME.shot()")
        pa = progs()
        E("document.body.dataset.clean = ''")
        steps(0.3)
        pic('02_marker_flinte')
        ck('no new shader program for the marker', progs() <= pa, f'{pa} -> {progs()} (start {p0})')
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
    # ---- the clock to a time of the zombie day: k = 'siren' | 'dawn' | minutes; the next one ahead ----
    def clock_to(k, settle=True):
        E(f"""(() => {{ const T = ZOMBIE.times(), m = ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440, to = {json.dumps(k)};
          const w = typeof to === 'number' ? to : T[to]; CLOCK.t += ((w - m + 1440) % 1440 || 1440) + (typeof to === 'number' ? 0.2 : 4); }})()""")
        # (+4 min for the sun's times: the next day's dawn and siren are a minute or two later or earlier)
        if settle: lib.settle_light(pg)
        steps(1.2)
    def think_text():
        # every thought since the last call (others – a villager turning at the siren – may come in between in real time)
        return E("(() => { const t = (window.__thoughts || []).join(' | '); window.__thoughts = []; return t; })()")
    if 'reload' in want:
        # night 2: the siren of the second day, then the page anew – the chain must go on where it was
        E("ZSTATE.hp = 100; for (const e of ZSTATE.ents) e.hold = 'idle'")
        if J("ZSTATE.night") < 1:
            E("ZSTATE.night = 1; ZSTATE.survived = Math.max(1, ZSTATE.survived)")
        clock_to('siren')
        steps(2)
        before = J("({ night: ZSTATE.night, phase: ZSTATE.phase, n2: TASKS.state('zz-nacht2'), ron: TASKS.state('zz-ronald'), flinte: TASKS.state('zz-flinte'), track: QUESTS.track })")
        ck('night 2 runs: „Die zweite Nacht“ at „Überlebe …“', before['night'] == 2 and before['phase'] == 'nacht' and before['n2'] and before['n2']['i'] == 1, str(before))
        E("ZSTATE.save(true)")
        time.sleep(1)
        # (without ?szenario=zombie – that would start the scene afresh; a saved night goes on by itself)
        pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        time.sleep(3)
        pg.wait_for_function("window.ZSTATE && ZSTATE.on", timeout=60000, polling=500)
        E("window.FREEZE = true")
        E("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")
        steps(2)
        E("(() => { window.__thoughts = []; const t0 = PLAY.think; PLAY.think = (t, ms) => { window.__thoughts.push(String(t)); return t0(t, ms); }; })()")
        mode = E("GAME.P.mode")
        after = J("({ night: ZSTATE.night, phase: ZSTATE.phase, n2: TASKS.state('zz-nacht2'), ron: TASKS.state('zz-ronald'), flinte: TASKS.state('zz-flinte'), track: QUESTS.track, cur: ZZIEL.cur })")
        print('after the reload: mode', mode, 'menu', E("!!(window.HUD && HUD.open)"), 'clock', E("CLOCK.hm()"), flush=True)
        # (the saved night puts one back where one stood outdoors, walking – not in the overview: zombie/z_modus.js)
        ck('after the reload one walks again where one stood (not the overview)', mode == 'walk' and len(J("ZSTATE.pos")) == 4, f'{mode} {J("ZSTATE.pos")}')
        if mode != 'walk': E("GAME.go('garten')")
        steps(0.5)
        ck('after a reload in night 2 the chain goes on (night 2 at „Überlebe …“, tracked; day 1 and 2 as they were)',
           after['night'] == 2 and after['phase'] == 'nacht' and after['n2'] == before['n2'] and after['ron'] == before['ron'] and after['flinte'] == before['flinte']
           and after['track'] == 'aufgaben:zz-nacht2', f'{before} -> {after}')
        E("ZSTATE.hp = 100; for (const e of ZSTATE.ents) e.hold = 'idle'")
    if 'tag3' in want or 'bus' in want:
        # (to the morning of day 3: two nights behind us)
        E("ZSTATE.hp = 100; for (const e of ZSTATE.ents) e.hold = 'idle'")
        if not (J("ZSTATE.night") == 2 and J("ZSTATE.phase") == 'nacht'):
            if J("ZSTATE.phase") == 'nacht': clock_to('dawn')
            E("ZSTATE.night = 1; ZSTATE.survived = Math.max(1, ZSTATE.survived)")
            clock_to('siren')
        clock_to('dawn')
        st = J("({ night: ZSTATE.night, phase: ZSTATE.phase, track: QUESTS.track, radio: TASKS.state('zz-radio') })")
        if not ck('day 3 begins with „Nachrichten“ (before what is left of day 2)', st['phase'] == 'tag' and st['track'] == 'aufgaben:zz-radio', str(st)):
            print('debug', J("({ t: CLOCK.t, hm: CLOCK.hm(), times: ZOMBIE.times(), ph: ZOMBIE.phaseOf(((Math.floor(CLOCK.t) % 1440) + 1440) % 1440), errs: (LOADLOG.errs || []).slice(-6).map(e => e.slice(0, 260)), ticks: KERN.ticks ? KERN.ticks().filter(n => /zombie/.test(n)) : null })"), flush=True)
    if 'tag3' in want:
        # into a house with a radio (the nearest few), switch it on
        got = None
        hs = J("ZINNEN.list().map(h => ({ id: h.id, d: Math.hypot(h.door.x - 250, h.door.y + 100) })).sort((a, b) => a.d - b.d).slice(0, 6).map(o => o.id)")
        for hid in hs:
            E(f"(async () => {{ await ZHAUS.enter(ZHAUS.doors().find(h => h.id === {hid})); }})()")
            for i in range(60):
                time.sleep(0.5)
                if E("!!ZHAUS.H && !ZHAUS.busy"): break
            steps(0.6)
            r = J("(() => { const H = ZHAUS.H; if (!H) return null; const s = (H.spots || []).find(s => s.kind === 'radio' || s.kind === 'tv'); return s ? { id: s.id, pos: s.pos, kind: s.kind } : null; })()")
            if r:
                got = r; break
            E("(async () => { const st = ZSTATE.house(ZHAUS.bid), f = ZHAUS.H.openings.find(o => o.front); if (f) st.bar[f.id] = 0; await ZHAUS.leave(); })()")
            for i in range(40):
                time.sleep(0.5)
                if E("!ZHAUS.H && !ZHAUS.busy"): break
        c = cur()
        ck('inside a house the target is its radio', got and c['tp'] and math.hypot(c['tp'][0] - got['pos'][0], c['tp'][1] - got['pos'][1]) < 0.5, f'{got} {c["tp"]}')
        if got:
            E(f"(() => {{ const H = ZHAUS.H, s = H.spots.find(s => s.id === {json.dumps(got['id'])}); H.onUse(s, H); }})()")
            steps(1.2)
            msg = E("(() => { const e = document.getElementById('zmsg'); return e && !e.hidden ? e.textContent : ''; })()")
            ck('the radio announces the bus („Um 4 Uhr … alten Schule“), „Nachrichten“ done', '4 Uhr' in msg and 'Schule' in msg and J("TASKS.state('zz-radio')")['st'] == 'erledigt',
               msg[:160] + ' ' + str(J("TASKS.state('zz-radio')")))
            page_pic('07_radio')
        E("(async () => { if (!ZHAUS.H) return; const st = ZSTATE.house(ZHAUS.bid); for (const o of ZHAUS.H.openings) if (o.front) st.bar[o.id] = 0; await ZHAUS.leave(); })()")
        for i in range(40):
            time.sleep(0.5)
            if E("!ZHAUS.H && !ZHAUS.busy"): break
    if 'bus' in want:
        E("if (!ZBUS.heard) ZBUS.announce('radio')")
        steps(0.6)
        p1 = progs()
        K1 = set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
        clock_to('siren')
        c = cur()
        ck('night 3: „Der Bus um vier“ – to the old school', c['key'] == 'aufgaben:zz-bus' and 'Schule' in (c['text'] or '') and c['tp'] is not None, str(c)[:300])
        sp = J("ZBUS.stopPt()")
        E(f"(() => {{ const P = GAME.P; P.x = {sp[0]} + 6; P.y = {sp[1]} + 9; P.feet = GAME.floorAt(P.x, P.y, 30); }})()")
        steps(1.5)
        c = cur()
        ck('at the school: „Halte … durch, bis der Bus kommt“', 'bis der Bus kommt' in (c['text'] or ''), str(c)[:300])
        E("ZSTATE.hp = 100; for (const e of ZSTATE.ents) e.hold = 'idle'")
        clock_to(4 * 60, settle=False)
        st = J("({ st: ZBUS.st, line: !!ZBUS.line, s0: ZBUS.s0, sStop: ZBUS.sStop })")
        ck('4:00: the bus comes along the street', st['st'] == 'kommt' and st['line'], str(st))
        # (looking down the street from the stop towards it, when it is 40 m away)
        shot = False
        for i in range(90):
            steps(0.5)
            E("ZSTATE.hp = 100")
            if not shot and E("ZBUS.st === 'kommt' && ZBUS.sStop - ZBUS.s < 45"):
                shot = True
                E("""(() => { const P = GAME.P, sp = ZBUS.stopPt(); P.x = sp[0] + 2; P.y = sp[1] + 2; P.feet = GAME.floorAt(P.x, P.y, 30);
                  P.yaw = P.body = Math.atan2(ZBUS.x - P.x, ZBUS.y - P.y) * 180 / Math.PI; P.pitch = 0; for (const e of ZSTATE.ents) e.hold = 'idle'; })()""")
                steps(0.1)
                pic('08_bus_kommt')
            if E("ZBUS.st") == 'steht': break
        st = J("({ st: ZBUS.st, x: ZBUS.x, y: ZBUS.y, door: ZBUS.doorAt(), wave: ZBUS.waveN || 0, search: ZSTATE.ents.filter(e => e.kind === 'zombie' && !e.dead && e.st === 'search').length, alive: ZSTATE.ents.filter(e => e.kind === 'zombie' && !e.dead).length, vis: ZBUS.g && ZBUS.g.visible })")
        sp = J("ZBUS.shelter()")
        ck('it stops at the school bus stop (beside the shelter, door side to it)', st['st'] == 'steht' and st['vis'] and math.hypot(st['door'][0] - sp['x'], st['door'][1] - sp['y']) < 14, str(st))
        ck('the last wave: more of them, all heading to the bus', (st['wave'] or 0) > 0 and st['search'] >= 1, str(st))
        c = cur()
        ck('the task: „Der Bus ist da – steig ein …“, target its door', 'steig ein' in (c['text'] or '') and c['tp'] and math.hypot(c['tp'][0] - st['door'][0], c['tp'][1] - st['door'][1]) < 1, str(c)[:300])
        # a picture: the coach at the stop at night, from the shelter's side
        E(f"""(() => {{ const P = GAME.P, d = ZBUS.doorAt(); P.x = d[0] + Math.cos(ZBUS.hd) * 9 - Math.sin(ZBUS.hd) * 5; P.y = d[1] - Math.sin(ZBUS.hd) * 9 - Math.cos(ZBUS.hd) * 5; P.feet = GAME.floorAt(P.x, P.y, 30);
          P.yaw = P.body = Math.atan2(ZBUS.x - P.x, ZBUS.y - P.y) * 180 / Math.PI; P.pitch = 2; for (const e of ZSTATE.ents) e.hold = 'idle'; }})()""")
        steps(0.4)
        pic('09_bus_steht')
        # the coach's own materials: each drawn with a program that was there before it came (what else came meanwhile – the people of the last
        # wave seen for the first time, their blood – is not the coach's)
        newp = [n for n, k in J("GAME.R.info.programs.map(p => [p.name, p.cacheKey])") if k not in K1]
        busk = J("(() => { const out = []; ZBUS.g.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) { const p = GAME.R.properties.get(m).currentProgram; if (p) out.push(p.cacheKey); } }); return out; })()")
        ours = [k for k in busk if k not in K1]
        ck('no new shader program for the coach (plain materials, a borrowed light)', busk and not ours, f'{len(busk)} drawn materials of the coach, {len(ours)} with a new program; new in all: {newp}')
        # (after the count: the walk below looks at the coach from its other side)
        # the coach is solid (VEH.extra): walking at its far side from 3.2 m away ends at its side, not inside it
        E("""(() => { const P = GAME.P, fx = Math.sin(ZBUS.hd), fy = Math.cos(ZBUS.hd); P.x = ZBUS.x - fy * 3.2; P.y = ZBUS.y + fx * 3.2;
          P.feet = GAME.floorAt(P.x, P.y, 30); P.yaw = P.body = Math.atan2(ZBUS.x - P.x, ZBUS.y - P.y) * 180 / Math.PI; P.pitch = 0; })()""")
        E("GAME.step(1.5, 1)"); steps(0.1)
        dd = J("(() => { const fx = Math.sin(ZBUS.hd), fy = Math.cos(ZBUS.hd); return Math.abs((GAME.P.x - ZBUS.x) * fy - (GAME.P.y - ZBUS.y) * fx); })()")
        ck('the coach is solid: one walks up to its side, not into it', 1.3 < dd < 2.4, f'{dd:.2f} m from its middle line (from 3.2 m)')
        # (and a zombie in its middle is put out at a side or an end)
        zin = J("(() => { const e = ZSTATE.ents.find(q => q.kind === 'zombie' && !q.dead && !q.net && !q.house); if (!e) return null; e.hold = 'idle'; e.x = ZBUS.x + 0.2; e.y = ZBUS.y + 0.1; return e.id; })()")
        steps(0.2)
        if zin is not None:
            zd = J("(() => { const e = ZSTATE.ents.find(q => q.id === " + json.dumps(zin) + "), fx = Math.sin(ZBUS.hd), fy = Math.cos(ZBUS.hd), dx = e.x - ZBUS.x, dy = e.y - ZBUS.y; return [dx * fy - dy * fx, dx * fx + dy * fy]; })()")
            ck('a zombie in the coach is put out at its side or end', abs(zd[0]) >= 1.6 or abs(zd[1]) >= 6.3, str([round(q, 2) for q in zd]))
        # in: the action button at the door
        E("(() => { const P = GAME.P, d = ZBUS.doorAt(); P.x = d[0]; P.y = d[1]; P.feet = GAME.floorAt(P.x, P.y, 30); })()")
        steps(0.4)
        lab = E("(() => { const a = KERN.acts().find(a => a.id === 'zbus:ein'); try { return a ? a.label() : null; } catch (e) { return 'ERR ' + e.message; } })()")
        ck('at the door the button says „Einsteigen“', lab == 'Einsteigen', str(lab))
        E("(() => { const a = KERN.acts().find(a => a.id === 'zbus:ein'); a.run(); })()")
        for i in range(20):
            time.sleep(0.4)
            steps(0.1)
            if E("!!document.getElementById('zende') && !document.getElementById('zende').hidden"): break
        en = J("(() => { const e = document.getElementById('zende'); return { shown: !!e && !e.hidden, text: e ? e.textContent : '' }; })()")
        ck('boarding → the ending: nights, zombies, who came along, deaths; „Weiterspielen“, „Neu beginnen“',
           en['shown'] and 'Nächte' in en['text'] and 'Zombies' in en['text'] and 'Weiterspielen' in en['text'] and 'Neu beginnen' in en['text'], en['text'][:300])
        ck('„Der Bus um vier“ done', J("TASKS.state('zz-bus')")['st'] == 'erledigt', str(J("TASKS.state('zz-bus')")))
        page_pic('10_ende')
        sv = J("ZSTATE.survived")
        E("document.querySelector('#zende [data-z=weiter]').click()")
        steps(1.5)
        st = J("({ shown: !document.getElementById('zende').hidden, phase: ZSTATE.phase, survived: ZSTATE.survived, on: ZSTATE.on, track: QUESTS.track, bus: ZBUS.st })")
        ck('„Weiterspielen“: the next morning, the night counted, the nights go on', not st['shown'] and st['phase'] == 'tag' and st['survived'] == sv + 1 and st['on'] and st['bus'] == 'weg',
           str(st))
    if 'verpasst' in want:
        # a second run: night 3 again, the bus waits – and leaves without us
        E("ZOMBIE.start()")
        steps(4.5)
        E("ZSTATE.night = 2; ZSTATE.survived = 2; ZSTATE.hp = 100")
        clock_to('siren')
        E("ZSTATE.hp = 100; for (const e of ZSTATE.ents) e.hold = 'idle'")
        clock_to(4 * 60, settle=False)
        for i in range(90):
            steps(0.5)
            E("ZSTATE.hp = 100")
            if E("ZBUS.st") == 'steht': break
        think_text()
        E("ZBUS.t = ZBUS.BUS.wait - 0.2")
        steps(0.6)
        tt = think_text()
        st = J("({ bus: ZBUS.st, allein: TASKS.state('zz-allein'), zzbus: TASKS.state('zz-bus'), track: QUESTS.track })")
        ck('missed: the bus leaves – „Weg. Dann eben allein.“, the task „Allein weiter“', st['bus'] == 'faehrt' and 'Weg. Dann eben allein.' in tt and st['allein'] and st['allein']['st'] == 'läuft'
           and st['zzbus'] is None and st['track'] == 'aufgaben:zz-allein', tt[:100] + ' ' + str(st))
        for i in range(80):
            steps(0.5)
            if E("ZBUS.st") == 'weg': break
        ck('… and drives off out of sight', E("ZBUS.st") == 'weg' and not E("ZBUS.g.visible"), E("ZBUS.st"))
    def bus_night3(role):
        # night 3 afresh, a recording transport for two, the bus at its stop
        E("ZOMBIE.start()")
        steps(4.5)
        E("ZSTATE.night = 2; ZSTATE.survived = 2; ZSTATE.hp = 100")
        clock_to('siren')
        E("ZSTATE.hp = 100; for (const e of ZSTATE.ents) e.hold = 'idle'")
        E(f"""(() => {{ window.__sent = []; ZNETZ.on = true; ZNETZ.role = '{role}'; ZNETZ.T = {{ id: 'me', peers: new Set(['p1']), handlers: {{}},
          send: (t, d) => window.__sent.push([t, d]), on() {{}}, leave() {{}}, start() {{}} }}; ZNETZ.peers.p1 = {{ id: 'p1', name: 'Sarah', st: null }}; }})()""")
        clock_to(4 * 60, settle=False)
        for i in range(90):
            steps(0.5)
            E("ZSTATE.hp = 100")
            if E("ZBUS.st") == 'steht': break
        return E("ZBUS.st") == 'steht'
    sent_bus = lambda: J("(window.__sent || []).filter(m => m[0] === 'ev' && m[1] && m[1].k === 'x:bus').map(m => m[1])")
    if 'zuzweit' in want:
        ok = bus_night3('gast')
        # the guest away from the door: the host gets in – the bus goes six seconds later, without him
        E("(() => { const P = GAME.P, d = ZBUS.doorAt(); P.x = d[0] + 25; P.y = d[1] + 25; P.feet = GAME.floorAt(P.x, P.y, 30); })()")
        think_text()
        E("KERN.emit('znetz:bus', { st: 'drin', host: true, from: 'p1' })")
        steps(0.5)
        tt = think_text()
        st1 = E("ZBUS.st")
        for i in range(20):
            steps(0.5)
            if E("ZBUS.st") != 'steht': break
        st = J("({ bus: ZBUS.st, allein: TASKS.state('zz-allein') })")
        ck('two players, the guest: the host is in → „Sarah ist im Bus – er fährt gleich ab!“, a few seconds later it goes without him',
           ok and st1 == 'steht' and 'Sarah ist im Bus' in tt and st['bus'] == 'faehrt' and st['allein'] and not [m for m in sent_bus() if m.get('st') == 'faehrt'],
           f"{tt[:80]} {st1} {st} sent {sent_bus()}")
        E("ZNETZ.close()")
        ok = bus_night3('host')
        # the host: the guest is in first – the host hears it; at the door he gets in, the guest is on the bus with him
        think_text()
        E("KERN.emit('znetz:bus', { st: 'drin', host: false, from: 'p1' })")
        steps(0.3)
        tt = think_text()
        E("(() => { const P = GAME.P, d = ZBUS.doorAt(); P.x = d[0]; P.y = d[1]; P.feet = GAME.floorAt(P.x, P.y, 30); })()")
        steps(0.3)
        E("(() => { const a = KERN.acts().find(a => a.id === 'zbus:ein'); if (a) a.run(); })()")
        for i in range(20):
            time.sleep(0.4)
            steps(0.1)
            if E("!document.getElementById('zende').hidden"): break
        en = E("document.getElementById('zende').textContent")
        ck('two players, the host: „Sarah ist im Bus.“, he gets in, she is on the bus with him, his message goes out',
           ok and 'Sarah ist im Bus.' in tt and 'Sarah' in en and any(m.get('st') == 'drin' and m.get('host') for m in sent_bus()), f"{tt[:60]} | {en[:200]} | {sent_bus()}")
        E("document.querySelector('#zende [data-z=neu]').click()")
        steps(4.5)
        E("ZNETZ.close()")
        ck('„Neu beginnen“: the 31st of October anew, the chain from the start', J("({ n: ZSTATE.night, t: QUESTS.track, end: document.getElementById('zende').hidden })") == {'n': 0, 't': 'aufgaben:zz-flinte', 'end': True},
           str(J("({ n: ZSTATE.night, t: QUESTS.track, end: document.getElementById('zende').hidden })")))
    terr = E("(window.LOADLOG && LOADLOG.errs || []).filter(e => /Takt zombie/.test(e)).map(e => e.slice(0, 300))")
    ck('no zombie tick broke', not terr, ' | '.join(terr[:2]))
    ck.errors(errs)
ck.done()
