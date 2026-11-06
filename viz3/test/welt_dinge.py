# feat/welt-dinge (Falko, 5.11.2026: „Parkplätze mit Autos, über die ich gerade laufen kann, als flache 2D-Oberfläche … in 3D“; 23:02:
# „Stellplätze, belebt“ – more at night, fewer by day): the parked cars and things of the aerial photo of 07.04.2024 (dinge/dinge.js).
# Checks: the data (places per body type and kind, things), cells built near the observer, a known place from the ground and from above,
# a workday's 3:00 against 10:00 (fewer cars, the share as the curves say), nothing changes in view (places in the camera's view keep their
# state until one looks away), walking into a parked car stops, no new shader programs, no page errors; the zombie night keeps them.
# Pictures in out/welt_dinge/.
#   python3 viz3/test/welt_dinge.py 8998
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('welt_dinge')
OUT = lib.out('welt_dinge')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e)
    progs = lambda: E("GAME.R.info.programs.length")
    for i in range(60):
        if E("!!(window.DINGE && DINGE.ready && DINGE.areaState().ratscher === 'da')"): break
        steps(0.5); time.sleep(0.5)
    st = J("DINGE.state()")
    ck('the data is there: parking places and things of Ratscher', st['ready'] and st['places'] >= 30, str(st)[:400])
    ck('five body types are used', len(st['types']) >= 4, str(st['types']))
    ck('places of all kinds: drives and yards, kerbs, works yards', all(k in st['kinds'] for k in ('hof', 'strasse', 'betrieb')), str(st['kinds']))
    ck('things besides cars (pool, lorry …)', sum(st['things'].values()) >= 1, str(st['things']))
    E("GAME.shot()")
    p0 = progs()
    K0 = set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
    nk = J("[GAME.R.info.programs.filter(p => /\\|dinge$/.test(p.cacheKey)).length, GAME.R.info.programs.filter(p => /\\|dinge-schatten$/.test(p.cacheKey)).length]")
    ck('the three programs of the things were made at the start (warm meshes: cars and things, their soft shadows)', nk == [2, 1], str(nk))
    # a workday: the first Tuesday of the calendar, 3:00 and 10:00
    day = J("(() => { for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === 2) return d; return 1; })()")
    t3, t10 = day * 1440 + 180, day * 1440 + 600
    # at the Anger, looking east along the street towards the school bus stop
    E(f"CLOCK.t = {t3}")
    E("GAME.view(205, -101, KERN.ground(205, -101) + 1.7, 95, -4, 62)")
    E("DINGE.settle()"); steps(1)
    s3 = J("DINGE.state()")
    ck('cells near the observer are built', s3['built'] >= 2 and s3['builtPlaces'] >= 10, f"built {s3['built']} cells, {s3['builtPlaces']} places")
    on3 = J("DINGE.places.filter(p => p.im).map(p => p.on && !p.hide)")
    share3 = J(f"({{ hof: DINGE.share('hof', {t3}), strasse: DINGE.share('strasse', {t3}), betrieb: DINGE.share('betrieb', {t3}) }})")
    E(f"CLOCK.t = {t10}")
    share10 = J(f"({{ hof: DINGE.share('hof', {t10}), strasse: DINGE.share('strasse', {t10}), betrieb: DINGE.share('betrieb', {t10}) }})")
    ck('the curves: at 3:00 more cars on drives and at kerbs than at 10:00 on a workday, works yards the other way round',
       share3['hof'] > share10['hof'] + 0.25 and share3['strasse'] > share10['strasse'] + 0.25 and share10['betrieb'] > share3['betrieb'] + 0.5, f'{share3} {share10}')
    # what the camera sees now must not change while it looks
    seen = J("DINGE.places.map((p, i) => i).filter(i => DINGE.places[i].im && DINGE.seen(i))")
    before = J(f"{json.dumps(seen)}.map(i => DINGE.places[i].on)")
    wantd = J(f"{json.dumps(seen)}.filter(i => DINGE.want(i, {t10}) !== DINGE.places[i].on).length")
    h0 = J("DINGE.held")
    steps(4)
    after = J(f"{json.dumps(seen)}.map(i => DINGE.places[i].on)")
    ck('in view: no car appears or leaves while one looks', before == after and len(seen) >= 3, f'{len(seen)} places in view, {wantd} would change, held {J("DINGE.held") - h0}')
    pic('01_anger_10uhr_im_blick')
    # look away (west, over the fields): the places behind change to the hour
    E("GAME.view(205, -101, KERN.ground(205, -101) + 1.7, 275, 10, 62)")
    steps(4)
    on10 = J("DINGE.places.filter(p => p.im).map(p => p.on && !p.hide)")
    n3, n10 = sum(on3), sum(on10)
    ck('3:00 against 10:00 on a workday: fewer cars parked at 10:00 once nobody looks', n10 < n3 and n3 >= 0.7 * len(on3), f'{n3} of {len(on3)} at 3:00, {n10} at 10:00')
    E("GAME.view(205, -101, KERN.ground(205, -101) + 1.7, 95, -4, 62)")
    steps(0.5)
    pic('02_anger_10uhr')
    # the evening: they come back (seen from above, the whole village centre)
    E(f"CLOCK.t = {day * 1440 + 19 * 60}")
    E("GAME.view(150, -180, KERN.ground(150, -180) + 1.7, 0, 0, 62)")
    steps(4)
    n19 = J("DINGE.places.filter(p => p.im && p.on && !p.hide).length")
    ck('19:00: most are back', n19 > n10, f'{n19} at 19:00, {n10} at 10:00')
    # Sunday late morning, as when the photo was flown (07.04.2024): most cars at home (looking away while the hour changes)
    sun = J("(() => { for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === 0) return d; return 0; })()")
    E(f"CLOCK.t = {sun * 1440 + 11 * 60}")
    lib.settle_light(pg)
    E("GAME.view(205, -101, KERN.ground(205, -101) + 1.7, 275, 60, 62)")
    steps(4)
    nsun = J("DINGE.places.filter(p => p.im && p.on && !p.hide).length")
    ck('Sunday 11:00 (the time of the photo): most places taken', nsun >= 0.7 * len(on3), f'{nsun} of {len(on3)}')
    # pictures without the walker: the orbit camera round a target (az: from where it looks, el: how high)
    def orbit(name, x, y, az, el, r):
        E(f"GAME.orbit({az}, {el}, {r}, [{x}, {y}, KERN.ground({x}, {y}) + 1])")
        E("GAME.shot()")
        pic(name)
    orbit('03_von_oben_sonntag', 228, -108, 200, 55, 70)
    orbit('05_strasse_sonntag', 234, -103, 290, 9, 24)
    orbit('06_holzlager', 105, -190, 200, 28, 48)
    orbit('07_guellebehaelter', -100, -38, 115, 18, 75)
    E("GAME.view(205, -101, KERN.ground(205, -101) + 1.7, 95, -4, 62)")
    steps(0.3)
    # a known place: the white van at the kerb south of the Anger (photo 192.5 / −132.2); the white van of the photo at the school bus
    # stop east of the Anger (236.9 / −103.8) is no place – the bus stops there (no parking 15 m before and after the sign)
    k = J("(() => { let b = -1, bd = 1e9; DINGE.places.forEach((p, i) => { const d = Math.hypot(p.x - 192.5, p.y + 132.2); if (d < bd) { bd = d; b = i; } }); return { i: b, d: bd, p: DINGE.info(b) }; })()")
    ck('the white van south of the Anger is a place (a van at the kerb)', k['d'] < 1.5 and k['p']['type'] == 'van', str(k))
    dv = J("({ doors: DINGE.state().doors, atDoors: DINGE.state().atDoors })")
    ck('the village\'s doors are known (2 m in front of each kept free)', dv['doors'] > 50, str(dv))
    kb = J("Math.min(...DINGE.places.map(p => Math.hypot(p.x - 236.9, p.y + 103.8)))")
    ck('the school bus stop is kept free (no place within 5 m of the van the photo shows there)', kb > 5, f'nearest place {kb:.1f} m')
    # walking into a parked car: find one that stands, come from its side
    E("for (const p of DINGE.places) if (p.im && !p.on) {}")
    tgt = J("(() => { const L = DINGE.places.filter(p => p.im && p.on && !p.hide); const p = L[0]; return p ? { i: p.i, x: p.x, y: p.y, az: p.az, w: p.box.ex } : null; })()")
    if tgt:
        a = math.radians(tgt['az'])
        rx, ry = math.cos(a), -math.sin(a)
        sx, sy = tgt['x'] + rx * 3.2, tgt['y'] + ry * 3.2
        yaw = (math.degrees(math.atan2(-rx, -ry)) + 360) % 360
        E(f"GAME.view({sx}, {sy}, GAME.floorAt({sx}, {sy}, KERN.ground({sx}, {sy}) + 1) + 1.7, {yaw}, -10, 62)")
        steps(0.2)
        E(f"window.__w = GAME.step(3, 1)")
        pp = J("[GAME.P.x, GAME.P.y]")
        d = abs((pp[0] - tgt['x']) * rx + (pp[1] - tgt['y']) * ry)
        ck('walking into a parked car stops at its side', d >= tgt['w'] + 0.15, f'distance from the middle across: {d:.2f} m (half width {tgt["w"]:.2f})')
        pic('04_am_auto')
    else:
        ck('walking into a parked car stops at its side', False, 'no parked car built')
    nob = J("(() => { const o = []; DINGE.obstacles(o); return { n: o.length, kinds: [...new Set(o.map(q => q.kind))] }; })()")
    ck('the traffic sees the parked cars (three circles each, like the villagers\' cars)', nob['n'] >= 30 and nob['kinds'] == ['dcar'], str(nob))
    E("GAME.shot()")
    p1 = progs()
    newp = [[n, k[-60:]] for n, k in J("GAME.R.info.programs.map(p => [p.name, p.cacheKey])") if k not in K0]
    mine = [x for x in newp if 'dinge' in x[1]]
    ck('no new shader programs of the things (cars and things drawn with the warm programs)', not mine, f'{p0} → {p1}, new: {newp}')
    # the zombie night: the parked cars stay as they are
    E("KERN.emit('zombie:start', {})")
    E(f"CLOCK.t = {day * 1440 + 9 * 60}")
    c0 = J("DINGE.changes")
    E("GAME.view(205, -101, KERN.ground(205, -101) + 1.7, 275, 10, 62)")
    steps(3)
    ck('zombie night: no changes', J("DINGE.changes") == c0 and J("DINGE.frozen"), f'changes {c0} → {J("DINGE.changes")}')
    E("KERN.emit('zombie:stop', {})")
    ck('no error in the round', not J("DINGE.err"), str(J("DINGE.err")))
    ck.errors(errs)
ck.done()
