# V16c the forest at the Klinge (world/forest.js): the stand, the views into and over it, walking among the trunks, the tractor on the
# forest track, place names and forest sound, the larch's year, texture limits, a phone. Pictures in out/v16c/.
# Sections (optional second argument, comma-separated): stand,views,walk,tractor,season,night,phone
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
    errs = []; pg = lib.page(b, 1100, 640, errs, tier='hoch'); lib.boot(pg, port, figures=True); E = pg.evaluate
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
        s = json.loads(M("JSON.stringify(Object.assign(FOREST.stats(), { calls: GAME.R.info.render.calls, tris: GAME.R.info.render.triangles, tier: RENDER.tier }))")); print('phone', s)
        check('phone: forest drawn lighter', s['tier'] == 'schnell' and s['near'] > 30 and s['near'] < 400, str(s))
        g_ok, g = lib.check_gl(mp); check('phone: textures per shader ≤ 16', g_ok, f"max fragment {g['maxFrag']}, vertex {g['maxVert']}")
        check('phone: no errors', not errs, '\n'.join(errs[:5]))
print(f"\n{len(ok)} ok, {len(fails)} failed: {fails}")
