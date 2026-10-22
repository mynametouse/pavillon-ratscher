# V16c the forest at the Klinge (world/forest.js): the stand, the views into and over it, walking among the trunks, the tractor on the
# forest track, place names and forest sound, the larch's year, texture limits, a phone. Pictures in out/v16c/.
# Sections (optional second argument, comma-separated): stand,views,walk,tractor,season,night,phone,fell
# fell (V16c2): forest box, a marked tree from the plan to the logs: notch, sapwood cuts, calls, bore cut, wedge, band, the fall, delimbing,
# trimming, the top, bucking (compression side), measuring; the stump and the logs, the forest book; reload keeps it all.
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('v16c'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
# views: x, y, eye height above the ground, yaw (0 north, 90 east), pitch, fov
VIEWS = [
    ('a_edge_j', -606, -598, 1.7, 62, 2, 62),            # from the junction below the Untere Klinge onto the forest edge (the family's corner)
    ('b_core', -478, -602, 1.7, 100, 3, 62),             # inside the Familienwald
    ('c_stand', -300, -660, 1.7, 205, 1, 62),            # the middle of the stand
    ('d_up', -470, -612, 1.6, 40, 62, 70),               # looking up into the crowns
    ('e_drone', -640, -520, 48, 128, -24, 60),           # over the edge: the canopy from above (a drone's view)
    ('f_fields', -150, -400, 2.2, 230, -3, 55),          # from the fields by the L 1625: the forest far away
]
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 640, errs, tier='hoch'); lib.boot(pg, port, query='?fell=1' if want('fell') else '', figures=True); E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    steps = lambda secs: E(f"for (let i = 0; i < {int(secs / 0.025)}; i++) GAME.step(0.025)")
    E("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(pg); E("GAME.setView3 && GAME.setView3(false, true)")
    st = json.loads(E("JSON.stringify({ on: FOREST.on, ready: FOREST.ready, stats: FOREST.ready && FOREST.stats(), trunks: FOREST.trunks ? FOREST.trunks.length / 3 : 0, wcolTrees: WCOL.nTree, detail: DETAIL.layers, season: FOREST.season && FOREST.season() })"))
    print('forest', st, flush=True)
    if want('stand'):
        s = st['stats'] or {}
        check('forest built', st['ready'] and s.get('trees', 0) > 5000, f"{s.get('trees')} trees, {s.get('core')} in the core, built in {s.get('build')} ms")
        check('family forest (core) planted', s.get('core', 0) > 400, str(s.get('core')))
        check('trunks are obstacles', st['trunks'] > 4000 and st['wcolTrees'] >= st['trunks'], f"{st['trunks']} trunks, {st['wcolTrees']} in WCOL")
        sp = json.loads(E("JSON.stringify(FOREST.list.reduce((a, t) => (a[t.sp] = (a[t.sp] || 0) + 1, a), {}))")); print('species', sp)
        check('spruce leads, larch and pine mixed in', sp.get('spruce', 0) > sp.get('larch', 0) > 0 and sp.get('pine', 0) > 0, str(sp))
        check('ground detail layers loaded', (st['detail'] or 0) >= 6, str(st['detail']))
    if want('views'):
        for name, x, y, h, yaw, pitch, fov in VIEWS:
            E(f"GAME.view({x}, {y}, ROADS.groundAt({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); GAME.step(0.1)")
            lib.shot(pg, OUT, name); s = json.loads(E("JSON.stringify(Object.assign(FOREST.stats(), { calls: GAME.R.info.render.calls, tris: GAME.R.info.render.triangles }))")); print(name, s, flush=True)
            if name == 'b_core': check('near and middle trees drawn in the forest', s['near'] > 100 and s['mid'] > 300, f"near {s['near']}, middle {s['mid']}, cover {s['cover']}, {s['calls']} draw calls, {s['tris']} triangles")
            if name == 'b_core': check('choosing the trees is quick', s['ms'] < 25, f"{s['ms']} ms")
        g_ok, g = lib.check_gl(pg); check('textures per shader ≤ 16 (forest shaders)', g_ok, f"max fragment {g['maxFrag']}, vertex {g['maxVert']}, programs {g['programs']} {g['bad'][:3]} {g['broken'][:3]}")
    if want('walk'):   # into the forest on foot: the place name, the forest sound, the trunks stop you
        E("GAME.view(-470, -600, ROADS.groundAt(-470, -600) + 1.7, 90, 0, 62); GAME.step(0.3)")
        w = json.loads(E("JSON.stringify({ where: document.getElementById('where').textContent, amb: FOREST.amb(), feet: GAME.P.feet, g: ROADS.groundAt(GAME.P.x, GAME.P.y) })")); print('walk', w)
        check('place name in the family forest', 'Klinge' in w['where'], w['where'])
        check('forest sound on inside', w['amb'] > 0.9, str(w['amb']))
        t = json.loads(E("""JSON.stringify((() => { let b = null, bd = 1e9; for (const t of FOREST.list) { if (t.h < 12 || !t.core) continue; const d = Math.hypot(t.x + 470, t.y + 600); if (d < bd) { bd = d; b = t; } } return b; })())"""))
        r = t['dbh'] / 2 + 0.05; ang = math.radians(40); sx, sy = t['x'] - math.sin(ang) * 3.2, t['y'] - math.cos(ang) * 3.2
        E(f"GAME.view({sx}, {sy}, ROADS.groundAt({sx}, {sy}) + 1.7, 40, 0, 62); GAME.step(0.1)")
        dmin = 9
        for k in range(16):
            E("GAME.step(0.25, 1, 0, 0)"); p = json.loads(E("JSON.stringify({ x: GAME.P.x, y: GAME.P.y })")); dmin = min(dmin, math.hypot(p['x'] - t['x'], p['y'] - t['y']))
        check('a trunk stops the walker', dmin > r + 0.15, f"closest {dmin:.2f} m to a trunk of r {r:.2f} m")
        E(f"GAME.P.yaw = 220; GAME.P.pitch = 4; GAME.step(0.05)"); lib.shot(pg, OUT, 'g_at_trunk')
        z = E("GAME.P.feet") - E("ROADS.groundAt(GAME.P.x, GAME.P.y)"); check('on the forest floor', abs(z) < 0.2, f"{z:.2f}")
    if want('tractor'):   # the tractor on the forest track through the stand
        tr = json.loads(E("""JSON.stringify((() => { const out = []; for (let y = -880; y < -450; y += 3) for (let x = -560; x < -10; x += 3) { if (!FOREST.owns(x, y)) continue; const r = ROADS.at(x, y);
            if (r && r.e > 0.6 && ROADS.KINDS[r.kind] === 'track') out.push([x, y]); } return out; })())"""))
        print('track points in the forest', len(tr))
        check('a forest track inside the stand', len(tr) > 30, str(len(tr)))
        if tr:
            a = tr[len(tr) // 2]; bb = min(tr, key=lambda q: abs(math.hypot(q[0] - a[0], q[1] - a[1]) - 12))
            psi = math.atan2(bb[0] - a[0], bb[1] - a[1])
            E(f"VEH.place('tractor', {a[0]}, {a[1]}, {psi}); VEH.enter('tractor'); GAME.setView3(true)"); steps(0.8)
            s0 = json.loads(E("JSON.stringify(VEH.state()[1])"))
            E("window._fs = VEH.follow((() => { const P = []; let x = VEH.cur.st.x, y = VEH.cur.st.y, a = VEH.cur.st.psi; for (let i = 0; i < 40; i++) { let best = null, bd = -1; for (let d = -0.5; d <= 0.5; d += 0.1) { const xx = x + Math.sin(a + d) * 4, yy = y + Math.cos(a + d) * 4, r = ROADS.at(xx, yy); const e = r ? r.e : -9; if (e > bd) { bd = e; best = [xx, yy, a + d]; } } x = best[0]; y = best[1]; a = best[2]; P.push([x, y]); } return P; })(), 3)")
            for k in range(24): steps(0.5)
            s1 = json.loads(E("JSON.stringify(VEH.state()[1])")); d = math.hypot(s1['x'] - s0['x'], s1['y'] - s0['y']); print('tractor', s0, s1, E("JSON.stringify(window._fs)"))
            check('tractor drives along the forest track', d > 25, f"{d:.1f} m, {s1['kmh']} km/h, place {E('ROADS.place(VEH.cur.st.x, VEH.cur.st.y)')}")
            lib.shot(pg, OUT, 'h_tractor_track'); E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null")
            # straight into the stand: the trunks stop it
            E(f"VEH.auto = () => ({{ thr: 0, brk: 1, steer: 0, hand: false }})"); steps(2); E("VEH.auto = null")
            c = json.loads(E("""JSON.stringify((() => { const v = VEH.cur.st; let b = null, bd = 1e9; for (const t of FOREST.list) { if (t.h < 14) continue; const d = Math.hypot(t.x - v.x, t.y - v.y); if (d > 9 && d < bd && ROADS.edge(t.x, t.y) < -3) { bd = d; b = t; } } return b; })())"""))
            sx, sy = c['x'] - 8, c['y']; E(f"VEH.place('tractor', {sx}, {sy}, Math.PI / 2)"); steps(0.3)
            E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })"); steps(5); E("VEH.auto = null")
            s2 = json.loads(E("JSON.stringify(VEH.state()[1])")); print('crash', c['x'], c['y'], s2)
            check('a trunk stops the tractor', s2['x'] < c['x'] - 0.5, f"front at {s2['x'] - c['x']:.2f} m from the trunk line")
            lib.shot(pg, OUT, 'i_tractor_trunk'); E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: false })"); steps(1); E("VEH.auto = null; VEH.exit(); GAME.step(0.3)")
    if want('season'):   # the larch's year: gold on the game's first day (22 October), bare in January, green in July
        e0 = E("Math.round(DN.jdOf(0) - 2440587.5)"); res = {}
        for label, y, m, d in [('okt', 2026, 9, 22), ('jan', 2027, 0, 15), ('jul', 2027, 6, 15)]:
            day = int(E(f"Date.UTC({y}, {m}, {d}) / 864e5") - e0)
            if day < 0: continue
            E(f"CLOCK.t = {day} * 1440 + 13 * 60; DN.update(true)"); lib.settle_light(pg)
            for k in range(3): E("GAME.step(1.0)")
            res[label] = json.loads(E("JSON.stringify(Object.assign(FOREST.season(), { date: DN.dateStr(CLOCK.t, true) }))"))
            E("GAME.view(-520, -640, ROADS.groundAt(-520, -640) + 1.7, 60, 8, 62); GAME.step(0.1)"); lib.shot(pg, OUT, 'j_larch_' + label)
        print('season', res)
        if 'okt' in res: check('larch golden late in October', res['okt']['gold'] > 0.6 and res['okt']['bare'] < 0.15, str(res['okt']))
        if 'jan' in res: check('larch bare in January', res['jan']['bare'] > 0.95, str(res['jan']))
        if 'jul' in res: check('larch green in July', res['jul']['gold'] < 0.05 and res['jul']['bare'] < 0.05, str(res['jul']))
        E("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(pg)

    if want('fell'):   # V16c2 felling: the whole way with a marked tree, cut by cut as a forester would
        def act(aid): return E(f"(() => {{ const a = PLAY.acts().find(a => a.id === '{aid}'); if (!a) return null; let l = null; try {{ l = a.label(); }} catch (e) {{ l = 'ERR ' + e; }} PLAY.run(a); return l; }})()")
        def go(): return E("(() => { const b = document.querySelector('#machwin .go'); if (!b || document.getElementById('machwin').hidden) return false; b.click(); return true; })()")
        def wait_hold(gauge=False):
            for i in range(60):
                if E("!!(PLAY.hold && " + ("PLAY.hold.g" if gauge else "true") + ")"): return True
                time.sleep(0.2); E("GAME.step(0.025)")
            return False
        def gauge(k):
            if not wait_hold(True): return None
            h = json.loads(E("JSON.stringify({ dur: PLAY.hold.dur, t: PLAY.hold.t })")); E(f"for (let i = 0; i < {int((k * h['dur'] - h['t']) / 0.025)}; i++) GAME.step(0.025)"); E("PLAY.primary()"); return h
        def hold():
            if not wait_hold(): return None
            d = E("PLAY.hold.dur"); steps(d + 0.3); return d
        rec = lambda: json.loads(E("JSON.stringify((() => { const r = FELL.rec(); return r ? { st: r.st, az: r.az, p: r.p, cut: r.cut, notes: r.notes, out: r.out || null, stars: r.stars || 0, pose: r.pose || null } : null; })())"))
        def look_at(cx, cy, ch, tx, ty, tz, fov=60):
            gz = E(f"ROADS.groundAt({cx}, {cy})"); tg = E(f"ROADS.groundAt({tx}, {ty})"); yaw = math.degrees(math.atan2(tx - cx, ty - cy)); pitch = math.degrees(math.atan2(tg + tz - gz - ch, math.hypot(tx - cx, ty - cy)))
            E(f"PLAY.select(-1); GAME.setView3(false, true); GAME.view({cx}, {cy}, {gz + ch}, {yaw}, {pitch}, {fov}); GAME.step(0.05)")
        E("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(pg)
        check('felling ready, trees marked', E("FELL.ready && FELL.marked.length >= 8"), str(E("FELL.marked.length")))
        k = E("FELL.kitPos()"); E(f"GAME.view({k[0]} - 1.2, {k[1]}, ROADS.groundAt({k[0]} - 1.2, {k[1]}) + 1.7, 90, -10, 62); GAME.step(0.2)")
        act('fell:kit'); steps(0.2); go(); steps(0.3)
        g = json.loads(E("JSON.stringify({ have: GEAR.haveForest, on: GEAR.on, saw: PLAY.has(PLAY.things.motorsaege) })"))
        check('forest box: gear on, saw taken', g['have'] and g['saw'] and all(g['on'][s] for s in ('head', 'body', 'legs', 'feet', 'hands')), str(g['on']))
        t = json.loads(E("JSON.stringify((() => { const t = FELL.marked[0]; return { id: t.id, x: t.x, y: t.y, z: t.z, h: t.h, sp: t.sp }; })())"))
        E(f"GAME.view({t['x']} - 1.4, {t['y']} - 0.6, ROADS.groundAt({t['x']} - 1.4, {t['y']} - 0.6) + 1.7, 60, 10, 62); GAME.step(0.2)")
        check('a marked tree offers felling', 'fällen' in (act('fell:pick') or ''), '')
        steps(0.2); go(); steps(0.2); r = rec(); az = r['az']; fx, fy = math.sin(math.radians(az)), math.cos(math.radians(az)); rx, ry = fy, -fx
        check('direction chosen into a free lane', r['st'] == 'retreat', f"{az}°")
        act('fell:op'); hold()
        act('fell:op'); steps(0.1); go(); gauge(0.53); r = rec()
        D = 2 * E(f"FELL.geomOf(FOREST.byId({t['id']}), FELL.rec().p).R")
        check('notch floor 1/5 to 1/3 of the diameter', r['st'] == 'roof' and 0.2 <= r['p']['d'] / D <= 0.334, f"{r['p']['d'] * 100:.1f} cm of Ø {D * 100:.0f} cm")
        act('fell:op'); steps(0.1); go(); gauge(0.8); steps(1.0); r = rec()
        check('roof meets the floor, the piece drops out', r['cut'].get('open') == 1 and r['st'] == 'splint' and not r['notes'], str(r['notes']))
        look_at(t['x'] + fx * 1.5 + rx * 0.6, t['y'] + fy * 1.5 + ry * 0.6, 0.75, t['x'], t['y'], 0.32, 50); lib.shot(pg, OUT, 'm_notch')
        act('fell:op'); hold(); act('fell:op'); steps(2.4)
        r = rec(); check('sapwood cuts, then the call', r['cut'].get('splint') == 1 and r['st'] == 'back', r['st'])
        act('fell:op'); steps(0.1); go(); gauge(0.55); r = rec()
        check('hinge about 1/10 Ø', r['st'] == 'wedge' and 0.07 <= r['p']['T'] / D <= 0.13, f"{r['p']['T'] * 100:.1f} cm")
        act('fell:op'); hold(); act('fell:op'); steps(2.4)
        look_at(t['x'] - fx * 1.1 + rx * 1.2, t['y'] - fy * 1.1 + ry * 1.2, 0.7, t['x'], t['y'], 0.33, 50); lib.shot(pg, OUT, 'n_back_wedge')
        r = rec(); check('wedge driven, second call', r['cut'].get('wedge') == 1 and r['st'] == 'band', r['st'])
        act('fell:op'); hold(); steps(3.4)
        look_at(t['x'] - rx * 18 + fx * 4, t['y'] - ry * 18 + fy * 4, 2.0, t['x'] + fx * 6, t['y'] + fy * 6, 6, 75); lib.shot(pg, OUT, 'o_falling')
        for i in range(30):
            steps(0.5)
            if rec()['st'] == 'down': break
        r = rec(); print('down', r, flush=True)
        check('the tree is down, close to the chosen direction', r['st'] == 'down' and abs(r['out']['dev']) < 8, f"dev {r['out']['dev']:.1f}°, stars {r['stars']}")
        look_at(t['x'] - rx * 9 + fx * 2, t['y'] - ry * 9 + fy * 2, 2.6, t['x'] + fx * 8, t['y'] + fy * 8, 0.3, 75); lib.shot(pg, OUT, 'p_down')
        look_at(t['x'] - fx * 0.9 + rx * 0.9, t['y'] - fy * 0.9 + ry * 0.9, 1.25, t['x'], t['y'], 0.3, 55); lib.shot(pg, OUT, 'q_stump')
        check('trunk gone from the collisions', not E(f"(() => {{ const p = [{t['x']} + 0.05, {t['y']}]; return WCOL.pushCircle(p, 0.3); }})()"), '')
        n = 0
        while rec()['st'] in ('down', 'delimb') and n < 12: act('fell:op'); hold(); n += 1
        look_at(t['x'] - rx * 7 + fx * 3, t['y'] - ry * 7 + fy * 3, 2.4, t['x'] + fx * 9, t['y'] + fy * 9, 0.3, 75); lib.shot(pg, OUT, 'r_delimbed')
        check('delimbed to the top', rec()['st'] == 'trim', f"{n} sections")
        act('fell:op'); hold(); act('fell:op'); hold(); steps(0.2); go(); steps(0.2)
        cuts = E("FELL.rec().cuts"); print('cuts', cuts)
        for i in range(10):
            if rec()['st'] != 'buck': break
            act('fell:op'); steps(0.1)
            side = E("(() => { const r = FELL.rec(); return FELL.pressSide(r, r.cuts[r.cutDone || 0]); })()")   # the right side first (the window asks)
            E(f"(() => {{ const b = document.querySelector('#machwin [data-ch=\"side\"][data-v=\"{side}\"]'); if (b) b.click(); }})()"); steps(0.05)
            go(); hold()
        act('fell:op'); hold(); steps(0.3)
        logs = json.loads(E("JSON.stringify(FELL.logs)")); r = rec(); print('logs', logs, flush=True)
        check('bucked and measured into logs', len(logs) >= 2 and all(2.5 <= l['L'] <= 4.2 for l in logs[:-1]), ', '.join(f"{l['L']} m Ø{l['dm']} {l['vol']} Fm" for l in logs))
        look_at(t['x'] - rx * 5 + fx * 4, t['y'] - ry * 5 + fy * 4, 1.8, t['x'] + fx * 8, t['y'] + fy * 8, 0.3, 70); lib.shot(pg, OUT, 's_logs')
        E("FELL.book(true)"); time.sleep(0.3); pg.screenshot(path=os.path.join(OUT, 't_book.png')); E("FELL.book(false)")
        st_ = json.loads(E("JSON.stringify(Object.values(FELL.trees).map(r => ({ st: r.st, stars: r.stars, notes: r.notes })))")); print('trees', st_)
        check('tree done with stars', st_ and st_[0]['st'] == 'done' and st_[0]['stars'] >= 4, str(st_))
        # reload: the stump, the logs and the list survive
        pg.reload(wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); time.sleep(3); E("window.FREEZE = true")
        rl = json.loads(E("JSON.stringify({ trees: Object.keys(FELL.trees).length, logs: FELL.logs.length, gone: FOREST.byId(" + str(t['id']) + ").gone })"))
        check('reload keeps the felled tree and its logs', rl['trees'] == 1 and rl['logs'] == len(logs) and rl['gone'], str(rl))
    if want('night'):
        E("CLOCK.t = 22 * 60 + 30; DN.update(true)"); lib.settle_light(pg)
        E("GAME.view(-606, -598, ROADS.groundAt(-606, -598) + 1.7, 62, 4, 62); GAME.step(0.1)"); lib.shot(pg, OUT, 'k_night_edge')
        E("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(pg)
    print('\n'.join(e for e in errs if 'favicon' not in e)[:3000] or 'no errors')
    check('no errors', not [e for e in errs if 'PAGEERR' in e])
if want('phone'):   # a phone: the lightest tier, the forest still built and within its texture limits
    with lib.browser() as b:
        errs = []; ctx = b.new_context(viewport={'width': 390, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mp = ctx.new_page(); lib.preset(mp, 'schnell'); mp.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); lib.boot(mp, port); M = mp.evaluate
        M("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        M("CLOCK.t = 13 * 60; DN.update(true)"); lib.settle_light(mp)
        M("GAME.view(-478, -602, ROADS.groundAt(-478, -602) + 1.7, 100, 3, 62); GAME.step(0.2)"); lib.shot(mp, OUT, 'l_phone_core')
        s = json.loads(M("JSON.stringify(Object.assign(FOREST.stats(), { calls: GAME.R.info.render.calls, tris: GAME.R.info.render.triangles, tier: GAME.RENDER.tier }))")); print('phone', s)
        check('phone: forest drawn lighter', s['tier'] == 'schnell' and s['near'] > 30 and s['near'] < 400, str(s))
        g_ok, g = lib.check_gl(mp); check('phone: textures per shader ≤ 16', g_ok, f"max fragment {g['maxFrag']}, vertex {g['maxVert']}")
        check('phone: no errors', not errs, '\n'.join(errs[:5]))
print(f"\n{len(ok)} ok, {len(fails)} failed: {fails}")
