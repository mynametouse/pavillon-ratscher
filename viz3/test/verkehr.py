# feat/verkehr: life on the streets – walkers in Ratscher by day (on walkable ground, never in a house), fewer at night; a car drives
# through on the right-hand lane and leaves; a car brakes for the player standing in its lane (and honks); waving a car down stops it
# beside the player; „Mitfahren“ carries the player and lets him out; „Selbst fahren“ hands the car over and the driver gets it back;
# Schleusingen has people and cars when one is there and frees them when one leaves (textures/geometries before and after); the time
# per frame; textures per shader. Pictures in out/verkehr/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8986 --serve verkehr        (or: python3 viz3/test/verkehr.py 8986 walk,car)
# Sections (second argument, comma-separated): net,walk,night,car,brake,wave,ride,selbst,yield,fahrt,stadt,prof,gl
import sys, os, time, json, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
OUT = lib.out('verkehr')
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda k: not ONLY or k in ONLY
ck = lib.Checks('verkehr')
ANGER = (222, -108)
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
MARKT = (-1084.7, 1241.9)


# the world tiles around the Markt (as viz3/test/schleusingen.py: from the published site into dist/welt-test/; without them the town
# stands on the coarse terrain)
def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def fetch_tiles():
    """the tiles the app asks for around the Markt (levels 10-12, rings of welt/welt.js) and under the zone (sampler), into dist/welt-test/"""
    os.makedirs(DIST, exist_ok=True)

    def get(rel):
        p = os.path.join(DIST, rel)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return 0
        os.makedirs(os.path.dirname(p), exist_ok=True)
        try:
            with urllib.request.urlopen(SITE + rel, timeout=60) as r:
                b = r.read()
        except Exception:
            return 0
        open(p, 'wb').write(b)
        return len(b)
    get('meta.json')
    meta = json.load(open(os.path.join(DIST, 'meta.json')))
    lv = meta['tiling']['levels']
    jobs = set()
    cs = [utm(MARKT[0] + sx * 650, MARKT[1] + sy * 650) for sx in (-1, 1) for sy in (-1, 1)]
    for L, pad in ((10, 900), (11, 450), (12, 150)):
        s = 409600 / (1 << L)
        r = lv[str(L)]['rect']
        E0, E1 = min(c[0] for c in cs) - pad, max(c[0] for c in cs) + pad
        N0, N1 = min(c[1] for c in cs) - pad, max(c[1] for c in cs) + pad
        for x in range(int((E0 - 420700) // s), int((E1 - 420700) // s) + 1):
            for y in range(int((N0 - 5390800) // s), int((N1 - 5390800) // s) + 1):
                if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                    jobs.add(f't/{L}/{x}/{y}.bin')
                    jobs.add(f'i/{L}/{x}/{y}.webp')
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'welt tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)


HELP = r"""
window.VNETZ = VERKEHR.net;
window.__vk = {
  day(h) { CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + h * 60; if (window.DN && DN.active) DN.update(true); },
  // step the world (25 ms steps) in chunks, up to secs or until cond() holds
  until(cond, secs) { for (let t = 0; t < secs; t += 0.5) { GAME.step(0.5); if (cond()) return t; } return -1; },
  // a walker inside a wall? the point pushed out of the walls (KERN.pushOut) moves
  inWall(x, y) { const q = [x, y]; KERN.pushOut(q, 0.25); return Math.hypot(q[0] - x, q[1] - y) > 0.12; },
  // the right-hand lane: the car's position against the centre line of its route (+ right)
  side(id) { const c = VERKEHR.car(id); if (!c) return null; const L = c.line, ex = L.ex; const Pl = VERKEHR.places[c.place];
    const path = VNETZ.route(Pl.G, ex[0], ex[1], Pl.cost); const C = VNETZ.line(path, { off: () => 0, cut: 6 });
    const pr = VNETZ.project(C, c.x, c.y, 0, C.L); return pr ? +pr.lat.toFixed(2) : null; },
  // a car of the place whose route passes closest to (x, y): exits a, b and the arc length there
  through(place, x, y) { const Pl = VERKEHR.places[place]; let best = null;
    for (const a of Pl.exits) for (const b of Pl.exits) { if (a === b) continue; const L = VERKEHR.line(place, a, b); if (!L) continue;
      const pr = VNETZ.project(L, x, y, 0, L.L); if (pr && (!best || pr.d < best.d)) best = { a, b, s: pr.s, d: pr.d, L: L.L }; }
    return best; },
  // a point on a car's line ahead, shifted to the side (+ right)
  ahead(id, ds, lat) { const c = VERKEHR.car(id), p = VNETZ.at(c.line, c.s + ds); return [p.x + Math.cos(p.hd) * lat, p.y - Math.sin(p.hd) * lat, p.hd]; },
};
"""


def E(pg, js):
    return pg.evaluate(js)


def J(pg, js):
    return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))


def page_shot(pg, name):
    try:
        pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=120000); print('page shot', name, flush=True)
    except Exception as ex:
        print('note: page shot', name, 'failed:', repr(ex)[:160], flush=True)


def stand(pg, x, y, yaw, pitch=-2):
    E(pg, f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.62, {yaw}, {pitch})")


def look_at(pg, x, y, z, dist=7, side=25, h=1.5):
    """the camera some metres away from a point, looking at it"""
    a = math.radians(side)
    E(pg, f"""(() => {{ const d = {dist}, x = {x}, y = {y};
      const c = VERKEHR.S.peds.find(q => Math.hypot(q.x - x, q.y - y) < 0.1) || null;
      const hd = c ? c.hd : 0, ax = x + Math.sin(hd + {a}) * d, ay = y + Math.cos(hd + {a}) * d;
      GAME.view(ax, ay, KERN.ground(ax, ay) + {h}, Math.atan2(x - ax, y - ay) * 180 / Math.PI, -4); }})()""")


if want('stadt'):
    try:
        fetch_tiles()
    except Exception as ex:
        print('note: no world tiles:', repr(ex)[:200], flush=True)
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 700, errs, tier='mittel')
    lib.boot(pg, port, '?szenario=verkehr')
    E(pg, HELP)
    E(pg, "document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    has = J(pg, "({ v: !!window.VERKEHR, figs: Object.keys(window.CHARMAN || {}).filter(k => k.startsWith('vk_')).length })")
    print('start', json.dumps(has), flush=True)
    ck('the module is there, ten figure files in the manifest', has['v'] and has['figs'] == 10, json.dumps(has))
    E(pg, "if (!DN.active) GAME.setMode('auto'); __vk.day(10)")
    lib.settle_light(pg)
    t = E(pg, "__vk.until(() => VERKEHR.state().places.dorf.on, 60)")
    st = J(pg, "VERKEHR.state()")
    print('places', json.dumps(st['places']), flush=True)

    if want('net'):
        try:
            d = st['places']['dorf']
            ck('Ratscher: the networks are built near the village', d['on'] and d['carEdges'] > 20 and d['exits'] >= 3, json.dumps(d))
            ck('Ratscher: the walkers have their side of most ways (not through walls)', d['walkOk'] >= 0.7 * d['walkEdges'] and d['walkEdges'] > 20,
               f"{d['walkOk']}/{d['walkEdges']}")
            ck('built quickly', (d['ms'] or 0) < 1500, f"{d['ms']} ms")
            ki = J(pg, "window.KI && KI.people ? KI.people().filter(k => k.startsWith('vk_')) : []")
            ck('all ten registered for the free conversation (KI.person)', len(ki) == 10, str(ki))
        except Exception as ex:
            ck('section ran: net', False, repr(ex)[:400])

    if want('walk'):
        try:
            # by day: some come along; they are loaded and shown; sampled for a minute – never in a wall, always on the ground
            E(pg, "VERKEHR.force(null); VERKEHR.autoOn(true)")
            t0 = time.time()
            for i in range(80):
                E(pg, "GAME.step(1)")
                s = J(pg, "VERKEHR.state()")
                if sum(1 for p in s['peds'] if p['shown']) >= 2:
                    break
                time.sleep(0.4)
            s = J(pg, "VERKEHR.state()")
            print('walkers', round(time.time() - t0), 's', json.dumps(s['peds'], ensure_ascii=False), s['figErr'], flush=True)
            ck('by day walkers come along in Ratscher (figures loaded and shown)', sum(1 for p in s['peds'] if p['shown']) >= 2 and not s['figErr'],
               f"{[p['key'] for p in s['peds']]} {s['figErr']}")
            bad, n, off, zbad = 0, 0, 0, 0
            for i in range(60):
                E(pg, "GAME.step(1)")
                r = J(pg, "VERKEHR.state().peds.map(p => [p.x, p.y, p.z, __vk.inWall(p.x, p.y), ROADS.edge(p.x, p.y), KERN.ground(p.x, p.y), p.st])")
                for x, y, z, wall, edge, g, stt in r:
                    n += 1
                    bad += 1 if wall else 0
                    off += 1 if edge < -1.5 else 0
                    zbad += 1 if abs(z - g) > 0.3 else 0
            print('samples', n, 'in walls', bad, 'off the ways', off, 'off the ground', zbad, flush=True)
            ck('walkers never inside a wall or fence (sampled each second for a minute)', n > 60 and bad == 0, f'{bad} of {n}')
            ck('walkers on the ways (road, path) and on the ground', off <= n * 0.02 and zbad == 0, f'off {off}, z {zbad} of {n}')
            s = J(pg, "VERKEHR.state()")
            ck('at most a handful at a time', len(s['peds']) <= 4, str(len(s['peds'])))
            # a picture: the camera near a walker
            p = next((q for q in s['peds'] if q['shown']), None)
            if p:
                look_at(pg, p['x'], p['y'], p['z'], 6, 30)
                E(pg, "GAME.step(0.1)")
                lib.shot(pg, OUT, 'a_walker_day')
            # Bettina with her dachshund
            if E(pg, f"VERKEHR.addPed('bettina', 'dorf', [GAME.P.x, GAME.P.y], true)") or any(q['key'] == 'bettina' for q in s['peds']):
                for i in range(40):   # the figure loads over the network: real time, not only game time
                    E(pg, "GAME.step(0.5)")
                    if J(pg, "VERKEHR.state().peds.some(p => p.key === 'bettina' && p.shown)"):
                        break
                    time.sleep(0.5)
                q = next((q for q in J(pg, "VERKEHR.state()")['peds'] if q['key'] == 'bettina'), None)
                if q:
                    look_at(pg, q['x'], q['y'], q['z'], 4.5, 40, 1.3)
                    E(pg, "GAME.step(0.1)")
                    lib.shot(pg, OUT, 'a2_walker_dog')
                    ck('Bettina walks her dog', q['dog'], json.dumps(q))
            # talking to a walker: walk up to him, the action button, the panel
            p = next((q for q in J(pg, "VERKEHR.state()")['peds'] if q['shown']), None)
            if p:
                E(pg, f"""(() => {{ const d = VERKEHR.S.peds.find(q => q.key === '{p['key']}'); const f = [Math.sin(d.hd), Math.cos(d.hd)];
                    const x = d.x + f[0] * 1.6, y = d.y + f[1] * 1.6; GAME.view(x, y, KERN.ground(x, y) + 1.62, Math.atan2(d.x - x, d.y - y) * 180 / Math.PI, -6); }})()""")
                best = J(pg, "GAME.step(0.2).best")
                ck('„Mit … sprechen“ at a walker', bool(best) and best.startswith('Mit '), str(best))
                E(pg, f"VERKEHR.talk('{p['key']}'); GAME.step(0.5)")
                s = J(pg, "VERKEHR.state()")
                txt = E(pg, "document.querySelector('#verkehrpanel .say').textContent")
                ck('the talk panel: greeting with du, topics', s['panel'] == p['key'] and len(txt) > 5 and ' Sie ' not in txt, txt[:80])
                page_shot(pg, 'b_walker_talk')
                greet = s['stats']['greet']
                E(pg, "VERKEHR.close()")
                print('greetings so far', greet, flush=True)
        except Exception as ex:
            ck('section ran: walk', False, repr(ex)[:400])

    if want('night'):
        try:
            E(pg, "VERKEHR.clear(); __vk.day(2)")
            lib.settle_light(pg)
            mx = 0
            for i in range(90):
                E(pg, "GAME.step(1)")
                mx = max(mx, len(J(pg, "VERKEHR.state().peds")))
            s = J(pg, "VERKEHR.state()")
            ck('at night almost nobody walks (2 o\'clock: at most one in 90 s)', mx <= 1, f"max {mx}, targets {s['places']['dorf']['target']}")
            # a car at night: head lamps and the light on the road
            E(pg, "VERKEHR.autoOn(false); VERKEHR.clear()")
            thr = J(pg, f"__vk.through('dorf', {ANGER[0]}, {ANGER[1]})")
            cid = E(pg, f"VERKEHR.addCar({{ from: {thr['a']}, to: {thr['b']}, s: {max(0, thr['s'] - 60)}, v: 6 }})")
            x, y, hd = J(pg, f"__vk.ahead({cid}, 30, 4.5)")
            stand(pg, x, y, math.degrees(hd) + 200, -3)
            E(pg, "GAME.step(1.5)")
            lamps = J(pg, "VAUTO.LM.head.emissiveIntensity")
            lib.shot(pg, OUT, 'j_car_night')
            ck('at night the cars have their lamps on', lamps > 1, str(lamps))
            E(pg, "VERKEHR.clear(); VERKEHR.autoOn(true)")
            E(pg, "__vk.day(10)")
            lib.settle_light(pg)
        except Exception as ex:
            ck('section ran: night', False, repr(ex)[:400])

    car_ok = False
    if want('car') or want('brake') or want('wave') or want('ride') or want('selbst'):
        E(pg, "VERKEHR.autoOn(false); VERKEHR.clear(); __vk.day(10)")
        thr = J(pg, f"__vk.through('dorf', {ANGER[0]}, {ANGER[1]})")
        print('route through the village', json.dumps(thr), flush=True)

    if want('car'):
        try:
            cid = E(pg, f"VERKEHR.addCar({{ from: {thr['a']}, to: {thr['b']}, s: {max(0, thr['s'] - 160)}, v: 8 }})")
            x, y, hd = J(pg, f"__vk.ahead({cid}, 60, 6)")  # beside the way, out of its lane
            stand(pg, x, y, math.degrees(hd) + 180)
            sides, vmax, spun, near, lastS = [], 0, 0, 1e9, 0
            for i in range(160):
                E(pg, "GAME.step(0.5)")
                c = J(pg, f"(() => {{ const c = VERKEHR.car({cid}); return c ? {{ x: c.x, y: c.y, v: c.v, s: c.s, L: c.line.L, st: c.st, spin: c.spin, side: __vk.side({cid}) }} : null; }})()")
                if not c:
                    break
                if c['side'] is not None:
                    sides.append(c['side'])
                d = math.hypot(c['x'] - ANGER[0], c['y'] - ANGER[1])
                if d < 300:
                    vmax = max(vmax, c['v'])
                near = min(near, d)
                spun, lastS = c['spin'], c['s']
                if i == 30:
                    E(pg, f"(() => {{ const c = VERKEHR.car({cid}); const f = [Math.sin(c.hd), Math.cos(c.hd)], r = [Math.cos(c.hd), -Math.sin(c.hd)];"
                          f" const x = c.x + f[0] * 14 + r[0] * 4.5, y = c.y + f[1] * 14 + r[1] * 4.5; GAME.view(x, y, KERN.ground(x, y) + 1.6, Math.atan2(c.x - x, c.y - y) * 180 / Math.PI, -5); }})()")
                    lib.shot(pg, OUT, 'c_car_village')
            gone = J(pg, f"!VERKEHR.car({cid})")
            right = sum(1 for v in sides if v > 0.3) / max(1, len(sides))
            print(f'car: right {right:.2f}, vmax in the village {vmax * 3.6:.0f} km/h, nearest to the Anger {near:.0f} m, wheels {spun:.0f} rad, s {lastS:.0f}', flush=True)
            ck('a car drives through the village on the right-hand lane', right > 0.9 and near < 60, f'right {right:.2f}, near {near:.0f} m')
            ck('at village speed (30–50 km/h)', 6 < vmax < 14.5, f'{vmax * 3.6:.0f} km/h')
            ck('the wheels turn', spun > 50, f'{spun:.0f}')
            ck('it leaves at the other end (gone)', gone, '')
            car_ok = True
        except Exception as ex:
            ck('section ran: car', False, repr(ex)[:400])

    if want('brake'):
        try:
            cid = E(pg, f"VERKEHR.addCar({{ from: {thr['a']}, to: {thr['b']}, s: {max(0, thr['s'] - 120)}, v: 8 }})")
            x, y, hd = J(pg, f"__vk.ahead({cid}, 45, 0)")
            stand(pg, x, y, math.degrees(hd) + 180)
            mind, stopped, honk0 = 1e9, False, J(pg, "VERKEHR.state().stats.honk")
            for i in range(60):
                E(pg, "GAME.step(0.5)")
                c = J(pg, f"(() => {{ const c = VERKEHR.car({cid}); return {{ x: c.x, y: c.y, v: c.v, hd: c.hd }}; }})()")
                mind = min(mind, math.hypot(c['x'] - x, c['y'] - y))
                if c['v'] < 0.05 and mind < 12:
                    stopped = True
            honk = J(pg, "VERKEHR.state().stats.honk") - honk0
            print(f'brake: nearest {mind:.1f} m (centre), stopped {stopped}, honks {honk}', flush=True)
            E(pg, f"(() => {{ const c = VERKEHR.car({cid}); const f = [Math.sin(c.hd), Math.cos(c.hd)], x = c.x + f[0] * 11 + Math.cos(c.hd) * 2.5, y = c.y + f[1] * 11 - Math.sin(c.hd) * 2.5;"
                  f" GAME.view(x, y, KERN.ground(x, y) + 1.6, Math.atan2(c.x - x, c.y - y) * 180 / Math.PI, -6); }})()")
            lib.shot(pg, OUT, 'd_car_waits')
            ck('a car brakes for the player standing in its lane (never drives through him; after a while it goes round him slowly)',
               stopped and mind > 1.25, f'{mind:.1f} m')
            ck('it honks if he stays', honk >= 1, str(honk))
            stand(pg, x + 30, y + 30, 0)
            moved = E(pg, f"(() => {{ const s0 = VERKEHR.car({cid}).s; for (let i = 0; i < 16; i++) GAME.step(0.5); return VERKEHR.car({cid}).s - s0; }})()")
            ck('it drives on when he steps aside', moved > 10, f'{moved:.0f} m')
            E(pg, "VERKEHR.clear()")
        except Exception as ex:
            ck('section ran: brake', False, repr(ex)[:400])

    def wave_car(label):
        """a car comes; the player at the right-hand edge 35 m ahead; the button; waved down → it stops beside him"""
        cid = E(pg, f"VERKEHR.addCar({{ from: {thr['a']}, to: {thr['b']}, s: {max(0, thr['s'] - 150)}, v: 8 }})")
        x, y, hd = J(pg, f"__vk.ahead({cid}, 38, 2.3)")
        stand(pg, x, y, math.degrees(hd) + 180)
        best = None
        for i in range(10):
            best = J(pg, "GAME.step(0.3).best")
            if best == 'Auto anhalten':
                break
        ok = E(pg, f"VERKEHR.wave({cid})")
        t = E(pg, f"__vk.until(() => VERKEHR.car({cid}) && VERKEHR.car({cid}).st === 'steht', 30)")
        c = J(pg, f"(() => {{ const c = VERKEHR.car({cid}); return {{ x: c.x, y: c.y, st: c.st, hd: c.hd }}; }})()")
        d = math.hypot(c['x'] - x, c['y'] - y)
        print(label, 'wave: best', best, 'ok', ok, 'stopped after', t, 's, distance', round(d, 2), flush=True)
        return cid, best, ok, t, d, (x, y)

    if want('wave') or want('ride'):
        try:
            cid, best, ok, t, d, (x, y) = wave_car('ride')
            ck('„Auto anhalten“ when a car comes towards the player', best == 'Auto anhalten', str(best))
            ck('waved down, the car stops beside the player', ok and t >= 0 and d < 4.5, f'{d:.1f} m after {t} s')
            s = J(pg, "VERKEHR.state()")
            ev = J(pg, "KERN.events().filter(e => e.name === 'verkehr:angehalten').length")
            ck('the driver asks (panel opens), event verkehr:angehalten', s['panel'] is not None and ev >= 1, f"{s['panel']} {ev}")
            lib.shot(pg, OUT, 'e_waved_down')
            # a second car comes along behind the one that stands: it waits a moment, then goes round it
            sh = J(pg, f"VERKEHR.car({cid}).s")
            c2 = E(pg, f"VERKEHR.addCar({{ from: {thr['a']}, to: {thr['b']}, s: {max(0, sh - 90)}, v: 8 }})")
            t2 = -1
            for i in range(10):
                if E(pg, f"__vk.until(() => VERKEHR.car({c2}) && VERKEHR.car({c2}).s > VERKEHR.car({cid}).s + 8, 4)") >= 0:
                    t2 = i * 4 + 1
                    break
                print('behind', json.dumps(J(pg, f"(() => {{ const c = VERKEHR.car({c2}), h = VERKEHR.car({cid}); return {{ st: c.st, v: c.v, s: c.s, hs: h.s, why: c.why, lat: c.lat, block: c.blockT, pass: c.passT, lane: c.laneOff }}; }})()")), flush=True)
            ck('a car behind a stopped one waits, then goes round it', t2 > 2, f'{t2} s')
            if want('ride'):
                E(pg, "VERKEHR.ride()")
                E(pg, "GAME.step(0.6)")
                s = J(pg, "VERKEHR.state()")
                seat = J(pg, "PLAY.seat ? { kind: PLAY.seat.kind, fp: !!PLAY.seat.fp } : null")
                ck('„Mitfahren“: the player sits in the car (first person)', s['ride'] is not None and seat and seat['kind'] == 'ride', json.dumps([s['ride'], seat]))
                for i in range(6):
                    E(pg, "GAME.step(1)")
                lib.shot(pg, OUT, 'f_ride_passenger')
                t = E(pg, "__vk.until(() => !VERKEHR.state().ride, 150)")
                s = J(pg, "VERKEHR.state()")
                where = J(pg, "({ x: GAME.P.x, y: GAME.P.y, seated: !!PLAY.seat })")
                dist = math.hypot(where['x'] - x, where['y'] - y)
                inwall = E(pg, f"__vk.inWall({where['x']}, {where['y']})")
                ev = J(pg, "KERN.events().filter(e => e.name === 'verkehr:mitfahrt').map(e => e.data.phase)")
                print('ride ended after', t, 's at', json.dumps(where), 'moved', round(dist), 'm', ev, flush=True)
                ck('the ride carries the player and lets him out (standing, not in a wall)', t >= 0 and not where['seated'] and dist > 50 and not inwall,
                   f'{dist:.0f} m, {t} s')
                ck('events verkehr:mitfahrt ein and aus', 'ein' in ev and 'aus' in ev, str(ev))
                lib.shot(pg, OUT, 'g_ride_out')
            E(pg, "VERKEHR.clear(); for (let i = 0; i < 4; i++) GAME.step(0.5)")
        except Exception as ex:
            ck('section ran: wave/ride', False, repr(ex)[:400])

    if want('selbst'):
        try:
            cid, best, ok, t, d, (x, y) = wave_car('selbst')
            ck('waved down for „Selbst fahren“', ok and t >= 0, f'{t}')
            E(pg, "VERKEHR.selbst()")
            E(pg, "GAME.step(0.5)")
            s = J(pg, "VERKEHR.state()")
            v = J(pg, "VEH.cur ? { id: VEH.cur.id, mass: VEH.cur.spec.mass, Cf: VEH.cur.spec.Cf, gears: VEH.cur.spec.gears.length } : null")
            car = J(pg, "({ mass: VEH.by.car.spec.mass, Cf: VEH.by.car.spec.Cf, gears: VEH.by.car.spec.gears.length })")
            ck('„Selbst fahren“: the player drives that car (the vehicle controls)', v and v['id'] == 'verkehr' and s['lent'] is not None, json.dumps([v, s['lent']]))
            ck('it handles like the player\'s car (same physics)', v and v['mass'] == car['mass'] and v['Cf'] == car['Cf'] and v['gears'] == car['gears'], json.dumps([v, car]))
            # the driver waits at the kerb (figure loads), the player drives 60 m and gets out
            E(pg, "__vk.until(() => VERKEHR.state().lent && VERKEHR.state().lent.driver, 20)")
            p0 = J(pg, "VAUTO.where()")
            E(pg, "VEH.auto = (v, dt) => ({ thr: v.st.u < 7 ? 0.6 : 0, brk: 0, steer: 0, hand: false }); GAME.step(4); VEH.auto = (v) => ({ thr: 0, brk: 1, steer: 0, hand: false }); GAME.step(3); VEH.auto = null")
            p1 = J(pg, "VAUTO.where()")
            moved = math.hypot(p1['x'] - p0['x'], p1['y'] - p0['y'])
            E(pg, "VEH.exit(); GAME.step(0.5)")
            lib.shot(pg, OUT, 'h_lent_car_left')
            t = E(pg, "__vk.until(() => !VERKEHR.state().lent, 90)")
            s = J(pg, "VERKEHR.state()")
            ev = J(pg, "KERN.events().filter(e => e.name === 'verkehr:zurueck').map(e => e.data)")
            hidden = J(pg, "!VEH.by.verkehr.g.visible")
            print('lent: moved', round(moved), 'm; back after', t, 's', json.dumps(s['stats']), json.dumps(ev), flush=True)
            ck('the player drove it', moved > 8, f'{moved:.0f} m')
            ck('the driver gets it back (walks over, drives on), nothing kept', t >= 0 and s['lent'] is None and hidden and s['stats']['back'] >= 1, json.dumps(ev))
            E(pg, "VERKEHR.clear()")
        except Exception as ex:
            ck('section ran: selbst', False, repr(ex)[:400])

    if want('yield'):
        try:
            # the player drives his car along the middle of the village street (like a test driver following a route): a car ahead in
            # the same direction and one coming towards him make room at the kerb – no bump
            E(pg, "VERKEHR.autoOn(false); VERKEHR.clear(); VERKEHR.force({ peds: 0, cars: 0 })")
            thr = J(pg, f"__vk.through('dorf', {ANGER[0]}, {ANGER[1]})")
            E(pg, f"""(() => {{ const Pl = VERKEHR.places.dorf, path = VNETZ.route(Pl.G, {thr['a']}, {thr['b']}, Pl.cost);
                window.__mid = VNETZ.line(path, {{ off: () => 0, cut: 6 }}); }})()""")
            s0 = max(0, thr['s'] - 140)
            res = {}
            for case in ('behind', 'head'):
                E(pg, "VERKEHR.clear(); if (VEH.cur) VEH.exit(); VEH.auto = null")
                if case == 'behind':
                    cid = E(pg, f"VERKEHR.addCar({{ from: {thr['a']}, to: {thr['b']}, s: {s0 + 45}, v: 5 }})")
                else:
                    cid = E(pg, f"VERKEHR.addCar({{ from: {thr['b']}, to: {thr['a']}, s: 0, v: 7 }})")
                    # the other way round: start it some 150 m ahead of the player on its own line
                    E(pg, f"""(() => {{ const c = VERKEHR.car({cid}), p = VNETZ.at(__mid, {s0}), pr = VNETZ.project(c.line, p.x, p.y, 0, c.line.L);
                        c.s = Math.max(2, pr.s - 150); }})()""")
                pts = J(pg, f"(() => {{ const o = []; for (let s = {s0}; s < Math.min(__mid.L, {s0} + 320); s += 4) {{ const p = VNETZ.at(__mid, s); o.push([+p.x.toFixed(2), +p.y.toFixed(2)]); }} return o; }})()")
                hd = math.atan2(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])
                E(pg, f"VEH.enter('car'); VEH.place('car', {pts[0][0]}, {pts[0][1]}, {hd}); GAME.step(0.3); window._fs = VEH.follow({json.dumps(pts)}, 11, {{ look: 9 }})")
                bump, latmax, mind, prev = 0, 0, 1e9, None
                for i in range(120):
                    E(pg, "GAME.step(0.25)")
                    r = J(pg, f"(() => {{ const c = VERKEHR.car({cid}), v = VEH.cur; return c && v ? {{ u: v.st.u, lat: c.lat, d: Math.hypot(c.x - v.st.x, c.y - v.st.y) }} : null; }})()")
                    if not r:
                        break
                    if prev is not None and prev - r['u'] > 2.2:
                        bump += 1
                    prev = r['u']
                    latmax = max(latmax, r['lat'])
                    mind = min(mind, r['d'])
                    if case == 'head' and i > 4 and r['d'] < 14 and 'shot' not in res:
                        lib.shot(pg, OUT, 'l_yield_head')
                        res['shot'] = 1
                res[case] = (bump, latmax, mind)
                print('yield', case, 'bumps', bump, 'kerb', round(latmax, 2), 'nearest', round(mind, 1), flush=True)
            E(pg, "VEH.auto = null; if (VEH.cur) VEH.exit(); VERKEHR.clear(); VERKEHR.force(null)")
            ck('a car ahead makes room for the player\'s car (to the kerb, no bump)', res['behind'][0] == 0 and res['behind'][1] > 0.5, str(res['behind']))
            ck('a car coming towards the player\'s car keeps to the kerb (no bump)', res['head'][0] == 0 and res['head'][1] > 0.5, str(res['head']))
        except Exception as ex:
            ck('section ran: yield', False, repr(ex)[:400])

    if want('fahrt'):
        try:
            # in the car on the main road west of the village (way to Ratscher from the L 1625), the oncoming car
            E(pg, "VERKEHR.clear(); VERKEHR.autoOn(true); VERKEHR.force({ peds: 0, cars: 0 })")
            x0, y0, x1, y1 = -600.2, -126.1, -35.5, -487.1
            x, y = x0 + (x1 - x0) * 0.15, y0 + (y1 - y0) * 0.15
            psi = math.atan2(x1 - x0, y1 - y0)
            x, y = x + math.cos(psi) * 1.7, y - math.sin(psi) * 1.7  # in the right-hand lane
            E(pg, f"VEH.enter('car'); VEH.place('car', {x}, {y}, {psi}); GAME.step(0.5); VEH.cur.st.u = 9; VERKEHR.oncoming(); GAME.step(0.1);"
                  "VEH.auto = () => ({ thr: 0, brk: 0, steer: 0, hand: true })")
            s = J(pg, "VERKEHR.state()")
            on = [c for c in s['cars'] if c['place'] == 'fahrt']
            print('oncoming', json.dumps(on), flush=True)
            ck('on the drive: now and then an oncoming car on the road ahead', len(on) == 1, json.dumps(on))
            if on:
                cid = on[0]['id']
                me = J(pg, "({ x: VEH.cur.st.x, y: VEH.cur.st.y })")
                mind, stopped, shot = 1e9, 0, False
                for i in range(90):
                    E(pg, "GAME.step(0.5)")
                    c = J(pg, f"(() => {{ const c = VERKEHR.car({cid}); return c ? {{ x: c.x, y: c.y, v: c.v }} : null; }})()")
                    if not c:
                        break
                    d = math.hypot(c['x'] - me['x'], c['y'] - me['y'])
                    mind = min(mind, d)
                    stopped += 1 if c['v'] < 0.5 else 0
                    if not shot and d < 45:
                        lib.shot(pg, OUT, 'k_oncoming')
                        shot = True
                    if d > mind + 60:
                        break
                print(f'oncoming: nearest {mind:.1f} m, stood {stopped} steps', flush=True)
                ck('it passes in the other lane without stopping', 1.8 < mind < 6 and stopped == 0, f'{mind:.1f} m')
            E(pg, "VEH.auto = null; VEH.exit(); VERKEHR.force(null); VERKEHR.clear()")
        except Exception as ex:
            ck('section ran: fahrt', False, repr(ex)[:400])

    if want('prof'):
        try:
            E(pg, "VERKEHR.clear(); VERKEHR.force({ peds: 4, cars: 2 }); VERKEHR.autoOn(true)")
            stand(pg, ANGER[0] - 10, ANGER[1] - 8, 60)
            E(pg, "__vk.until(() => VERKEHR.state().peds.filter(p => p.shown).length >= 3, 60)")
            E(pg, "KERN.profile(true)")
            E(pg, "GAME.step(20)")
            prof = J(pg, "KERN.profile()")
            E(pg, "KERN.profile(false)")
            r = prof.get('verkehr/verkehr', {'ms': 0, 'n': 1})
            per = r['ms'] / max(1, r['n'])
            tot = sum(v['ms'] for v in prof.values()) / max(1, r['n'])
            s = J(pg, "VERKEHR.state()")
            print(f"per frame: verkehr {per:.3f} ms of {tot:.3f} ms of all ticks; {len(s['peds'])} walkers, {len(s['cars'])} cars", flush=True)
            ck('the frame time: walkers and cars cost little per frame', per < 0.6, f'{per:.3f} ms ({len(s["peds"])} walkers, {len(s["cars"])} cars)')
            # memory of the figures: decoded images of each loaded figure (an iPhone gets them at half size, core/assets.js TEXHALF)
            fm = J(pg, """Object.fromEntries(Object.entries(VFIG.figs).map(([k, f]) => { const seen = new Set(); let mb = 0;
              f.g.traverse(o => { for (const m of o.material ? [].concat(o.material) : []) for (const t of ['map', 'normalMap', 'alphaMap'])
                { const x = m[t]; if (x && x.image && !seen.has(x.image)) { seen.add(x.image); mb += x.image.width * x.image.height * 4 / 1e6; } } });
              return [k, +mb.toFixed(1)]; }))""")
            print('figure images (MB decoded):', json.dumps(fm), 'draw calls', J(pg, "GAME.R.info.render.calls"), flush=True)
            ck('each figure light on memory (< 8 MB of images, a phone halves them)', fm and max(fm.values()) < 8, json.dumps(fm))
            E(pg, "VERKEHR.force(null)")
        except Exception as ex:
            ck('section ran: prof', False, repr(ex)[:400])

    if want('stadt'):
        try:
            E(pg, "VERKEHR.clear(); VERKEHR.force({ peds: 3, cars: 2 }); VERKEHR.autoOn(true)")
            m0 = J(pg, "GAME.R.info.memory")
            E(pg, "GAME.go('schleusingen')")
            t0 = time.time()
            t = -1
            for i in range(150):   # the town loads over the network: real time
                E(pg, "GAME.step(0.5)")
                if J(pg, "SCHL.state === 'ready' && !!VERKEHR.state().places.stadt && VERKEHR.state().places.stadt.on"):
                    t = round(time.time() - t0)
                    break
                time.sleep(0.5)
            print('Schleusingen ready after', t, 's', json.dumps(J(pg, "VERKEHR.state().places.stadt")), 'no tiles:', J(pg, "!!SCHL.noTiles"), flush=True)
            for i in range(60):
                E(pg, "GAME.step(1)")
                s = J(pg, "VERKEHR.state()")
                if sum(1 for p in s['peds'] if p['shown'] and p['place'] == 'stadt') >= 2 and any(c['place'] == 'stadt' for c in s['cars']):
                    break
                time.sleep(0.3)
            s = J(pg, "VERKEHR.state()")
            sp = [p for p in s['peds'] if p['place'] == 'stadt']
            sc = [c for c in s['cars'] if c['place'] == 'stadt']
            ck('Schleusingen: people on the streets and cars', len(sp) >= 2 and len(sc) >= 1, f'{len(sp)} walkers, {len(sc)} cars')
            p = next((q for q in sp if q['shown']), None)
            if p:
                look_at(pg, p['x'], p['y'], p['z'], 9, 35, 1.8)
                lib.shot(pg, OUT, 'i_stadt_walker')
            m1 = J(pg, "GAME.R.info.memory")
            E(pg, "VERKEHR.force(null); GAME.go('garten')")
            t = E(pg, "__vk.until(() => !VERKEHR.state().places.stadt.on && !VERKEHR.state().peds.some(p => p.place === 'stadt') && !VERKEHR.state().cars.some(c => c.place === 'stadt'), 60)")
            # the town and its world tiles go too (welt/schleusingen.js, welt/welt.js keep them a while): then everything is back
            for i in range(60):
                E(pg, "GAME.step(1)")
                if J(pg, "SCHL.state !== 'ready' && (!window.WELT || !WELT.state || !WELT.state().tiles) && !Object.keys(VFIG.figs).length"):
                    break
                time.sleep(0.3)
            s = J(pg, "VERKEHR.state()")
            m2 = J(pg, "GAME.R.info.memory")
            print('memory before', m0, 'in town', m1, 'after', m2, 'figures', s['figs'], flush=True)
            ck('leaving Schleusingen frees its walkers and cars', t >= 0 and not any(q['place'] == 'stadt' for q in s['peds'] + s['cars']), f'{t}')
            ck('their figures are freed (textures and geometries back)', not [k for k in s['figs'] if k in [q['key'] for q in sp]] and m2['textures'] <= m0['textures'] + 4,
               f"tex {m0['textures']} → {m1['textures']} → {m2['textures']}, geo {m0['geometries']} → {m1['geometries']} → {m2['geometries']}")
        except Exception as ex:
            ck('section ran: stadt', False, repr(ex)[:400])

    if want('gl'):
        ok, r = lib.check_gl(pg, 16)
        ck('textures per shader within 16, no broken program', ok, f"{r['programs']} programs, max {r['maxFrag']}/{r['maxVert']}")
    ck.errors(errs)
ck.done()
