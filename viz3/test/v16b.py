# V16b vehicles: the car and the tractor on the roads from OpenStreetMap – getting in, driving (gears, brakes, reverse, handbrake),
# collisions, the route from the garden through Ratscher to the Untere Klinge, getting out and walking on the terrain, the front loader,
# headlights at night. Pictures in out/v16b/. Sections (optional second argument, comma-separated): car,drive,crash,route,tractor,night,walk
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('v16b'); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def want(k): return not ONLY or k in ONLY
ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1100, 680, errs, tier='mittel'); lib.boot(pg, port, figures=True); E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    st = lambda: json.loads(E("JSON.stringify(VEH.state())"))
    steps = lambda secs: E(f"for (let i = 0; i < {int(secs / 0.025)}; i++) GAME.step(0.025)")
    def drive(secs, thr=0, brk=0, steer=0, hand=False):
        E(f"VEH.auto = () => ({{ thr: {thr}, brk: {brk}, steer: {steer}, hand: {str(hand).lower()} }})"); steps(secs); E("VEH.auto = null")
    print('world', E("JSON.stringify({ roads: ROADS.ready, raster: ROADS.rasterMs, decks: ROADS.decks.length, walls: WCOL.nSeg, trunks: WCOL.nTree, veh: VEH.state() })"), flush=True)
    check('roads and collisions ready', E("ROADS.ready && WCOL.ready && VEH.list.length === 2"))
    if want('car'):
        E("VEH.goTo('car'); GAME.step(0.3)"); s = st()[0]
        E(f"GAME.view({s['x']} - 5.2 * Math.cos({s['psi']} * Math.PI / 180), {s['y']} + 5.2 * Math.sin({s['psi']} * Math.PI / 180), {s['z']} + 1.4, {s['psi']} + 90, -6, 55)"); lib.shot(pg, OUT, 'a_car_side')
        E("VEH.enter('car'); GAME.setView3(true)"); steps(1.0); lib.shot(pg, OUT, 'a_car_chase')
        E("GAME.setView3(false)"); steps(0.8); lib.shot(pg, OUT, 'a_car_driver'); E("GAME.setView3(true)")
        check('car entered', E("VEH.cur && VEH.cur.id === 'car' && PLAY.seat && PLAY.seat.kind === 'drive'"))
    if want('drive'):
        if not E("VEH.cur"): E("VEH.enter('car')")
        x0 = st()[0]; drive(6, thr=1); s = st()[0]; d = ((s['x'] - x0['x']) ** 2 + (s['y'] - x0['y']) ** 2) ** 0.5
        check('accelerates on the field path', s['kmh'] > 20 and d > 25, f"{s['kmh']} km/h, {d:.1f} m, gear {s['gear']}")
        drive(4, brk=1); s = st()[0]; check('brakes to a stop', abs(s['kmh']) < 1, f"{s['kmh']} km/h")
        drive(3, brk=1); s = st()[0]; check('reverses when the brake is held', s['gear'] == -1 and s['kmh'] < -2, f"gear {s['gear']} {s['kmh']} km/h")
        drive(3, thr=1); s = st()[0]; check('forward again', s['gear'] >= 1, f"gear {s['gear']} {s['kmh']} km/h")
        drive(3, brk=1)
    if want('crash'):   # straight into a house in Ratscher: stops at the wall, does not go through
        if not E("VEH.cur"): E("VEH.enter('car')")
        r = E("""(() => { const W = RATSCHER.walls; let best = null, bd = 1e9; for (let i = 0; i < W.length; i += 4) { const mx = (W[i] + W[i + 2]) / 2, my = (W[i + 1] + W[i + 3]) / 2, L = Math.hypot(W[i + 2] - W[i], W[i + 3] - W[i + 1]);
            const d = Math.hypot(mx - 260, my + 200); if (L > 8 && d < bd) { bd = d; best = [W[i], W[i + 1], W[i + 2], W[i + 3]]; } } return best; })()""")
        ax, ay, bx_, by = r; mx, my = (ax + bx_) / 2, (ay + by) / 2; L = ((bx_ - ax) ** 2 + (by - ay) ** 2) ** 0.5; nx, ny = -(by - ay) / L, (bx_ - ax) / L
        # start 14 m out on whichever side is free, facing the wall
        sx, sy = mx + nx * 14, my + ny * 14
        if E(f"ROADS.groundAt({sx}, {sy}) > ROADS.groundAt({mx}, {my}) + 4 || WCOL.pushCircle([{sx}, {sy}], 1.5)"): sx, sy, nx, ny = mx - nx * 14, my - ny * 14, -nx, -ny
        import math; psi = math.atan2(-nx, -ny)
        E(f"VEH.place('car', {sx}, {sy}, {psi})"); drive(5, thr=1); s = st()[0]
        side = (s['x'] - ax) * nx + (s['y'] - ay) * ny
        check('stops at a house wall', side > 0.5, f"{side:.2f} m in front of the wall, {s['kmh']} km/h"); lib.shot(pg, OUT, 'b_crash')
        drive(3, brk=1)
    if want('route'):
        if not E("VEH.cur"): E("VEH.enter('car')")
        R = E("ROADS.routes.klinge"); E(f"VEH.place('car', {R[0][0]}, {R[0][1]}, Math.atan2({R[1][0] - R[0][0]}, {R[1][1] - R[0][1]}))"); E("window._fs = VEH.follow(ROADS.routes.klinge, 10)")
        T = 0; places = set()
        for secs, shot in [(8, 'c_bridge'), (10, 'c_anger'), (16, 'c_village'), (24, 'c_fields'), (20, 'c_l1625'), (30, 'c_forest_edge'), (40, None), (30, None)]:
            for k in range(int(secs / 0.5)): steps(0.5); places.add(E("document.getElementById('where').textContent"))
            T += secs; s = st()[0]; fs = E("window._fs"); print(T, 's', s, fs, flush=True)
            if shot: lib.shot(pg, OUT, shot)
            if fs['done']: break
        print('places', sorted(places))
        check('drives the route to the Klinge', E("window._fs.done") and E("ROADS.place(VEH.cur.st.x, VEH.cur.st.y)") == 'Untere Klinge', f"{T} s")
        check('names on the way', 'Ratscher' in places and any('Landstraße' in p or 'Feldweg' in p for p in places), '')
        E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null"); lib.shot(pg, OUT, 'c_klinge')
    if want('walk') or want('tractor'):
        if not E("VEH.cur") and not E("PLAY.seated()"):
            R = E("ROADS.routes.klinge"); E(f"VEH.place('car', {R[-1][0]}, {R[-1][1]}, Math.atan2({R[-1][0] - R[-2][0]}, {R[-1][1] - R[-2][1]})); VEH.enter('car')"); steps(0.5)
        E("VEH.exit()"); steps(0.6); w = E("JSON.stringify({ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, g: ROADS.groundAt(GAME.P.x, GAME.P.y), where: document.getElementById('where').textContent })"); print('out', w)
        w = json.loads(w); check('gets out beside the car, on the ground', abs(w['feet'] - w['g']) < 0.15 and not E("VEH.cur"), str(w))
        lib.shot(pg, OUT, 'd_out_klinge')
        if want('walk'):
            z0 = E("GAME.P.feet"); r = E("GAME.step(4, 1, 0, 0)"); print('walked', r); z1 = E("GAME.P.feet")
            check('walks on the terrain', abs(z1 - E("ROADS.groundAt(GAME.P.x, GAME.P.y)")) < 0.2, f"{z0:.2f} → {z1:.2f}")
    if want('tractor'):
        E("VEH.enter('tractor'); GAME.setView3(true)"); steps(1.0); lib.shot(pg, OUT, 'e_tractor_chase')
        check('tractor entered', E("VEH.cur && VEH.cur.id === 'tractor'"))
        E("VEH.by.tractor.model.key('r', true)"); steps(4); E("VEH.by.tractor.model.key('r', false); VEH.by.tractor.model.key('t', true); VEH.by.tractor.model.key('t', false)"); steps(1.5)
        ld = E("JSON.stringify(VEH.by.tractor.model.LD)"); print('loader', ld); ld = json.loads(ld)
        check('front loader rises and tilts', ld['lift'] > 0.5 and ld['tilt'] > 0.2, '')
        s = st()[1]; E(f"GAME.P.yaw = {s['psi']} + 100; GAME.P.pitch = -8"); E("GAME.shot()"); lib.shot(pg, OUT, 'e_tractor_side_up')
        E("VEH.by.tractor.model.key('g', true)"); steps(5); E("VEH.by.tractor.model.key('g', false); VEH.by.tractor.model.key('t', true); VEH.by.tractor.model.key('t', false)"); steps(1)
        x0 = st()[1]; drive(8, thr=1); s = st()[1]; check('tractor drives', s['kmh'] > 8, f"{s['kmh']} km/h gear {s['gear']}")
        drive(4, brk=1); E(f"GAME.P.yaw = {s['psi']} - 120; GAME.P.pitch = -10"); lib.shot(pg, OUT, 'e_tractor_front')
    if want('night'):
        if not E("VEH.cur"): E("VEH.enter('car')")
        E("CLOCK.t = 22 * 60 + 40; DN.update(true)"); lib.settle_light(pg)
        R = E("ROADS.routes.klinge"); i = 60; E(f"VEH.place(VEH.cur.id, {R[i][0]}, {R[i][1]}, Math.atan2({R[i + 1][0] - R[i][0]}, {R[i + 1][1] - R[i][1]}))"); steps(0.5)
        E("GAME.setView3(true)"); steps(0.5); lib.shot(pg, OUT, 'f_night_chase')
        check('lights on at night (auto)', E("VEH.lightsOn(VEH.cur)"))
        E("GAME.setView3(false)"); steps(0.5); lib.shot(pg, OUT, 'f_night_driver'); E("GAME.setView3(true)")
    errs = [e for e in errs if 'Texture marked' not in e]
    print('\n'.join(errs[:30]) or 'no errors'); check('no errors', not errs)
    print(f"{len(ok)} ok, {len(fails)} failed: {fails}")
