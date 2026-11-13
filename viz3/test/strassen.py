# The roads (feat/strassen, package 1 of Falko's wish of 12.11.2026 for a more real region): the styles of the roads in the square's road
# map (open country, no overtaking, town, village), the furniture beside them – delineators, guard rails, signs, lamps, power lines – built
# near the observer and never on a carriageway, lamps at night, wet roads in the rain, the road map of the window beyond the square on a
# drive along the L 1625, no new shader program after the start, the cost per frame. Pictures in out/strassen/.
# Round 2 (13.11.2026, the wishes of the Suhl chat): road data and furniture that come and go while the app runs (FAHRT.add / FAHRT.drop,
# STRDAT.add / STRDAT.drop) – a made-up little town on a meadow beside the L 1625 with every case: a pedestrian street and a square
# without kerbs, a car park, a roundabout and a one-way street without a centre line, a street with one pavement, steps left out.
# Sections (optional second argument, comma-separated): start,moebel,stadt,nass,fahrt,sets,gl
# The world tiles come from the published site (welt-test/) and are copied into viz3/dist/welt-test/ first (as viz3/test/fahrt.py does).
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda k: not ONLY or k in ONLY
ck = lib.Checks('strassen')
OUT = lib.out('strassen')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
G = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']
XF, TI = G['xf'], G['terrain']['inner']
RB = (TI['x0'], TI['y0'], TI['x0'] + (TI['n'] - 1) * TI['step'], TI['y0'] + (TI['n'] - 1) * TI['step'])
DATA = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'fahrt', 'dist', 'fahrt', 'strassen.json')))
ROUTE = [(DATA['routes']['baumschule']['pts'][i] / 10, DATA['routes']['baumschule']['pts'][i + 1] / 10) for i in range(0, len(DATA['routes']['baumschule']['pts']), 2)]
A = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'strassen', 'dist', 'strassen', 'ausstattung.json')))


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def at(route, dist):
    d = 0
    for i in range(len(route) - 1):
        L = math.dist(route[i], route[i + 1])
        if d + L >= dist:
            f = (dist - d) / L
            a, b = route[i], route[i + 1]
            return i, (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, math.atan2(b[0] - a[0], b[1] - a[1]))
        d += L
    return len(route) - 2, (*route[-1], 0.0)


I0, START = at(ROUTE, 3700)     # on the L 1625 west of the square, open country
I1, _ = at(ROUTE, 4700)
# round 2: a meadow north of the L 1625 before Rappelsdorf, flat within 2 m over 160 m × 120 m, no road on it (probed 13.11.2026)
PC = (-2775.0, -380.0)


def probe_town(cx, cy):
    """a made-up town of 190 m × 150 m around (cx, cy) in the format of fahrt/strassen.json with the extra fields of round 2, and its furniture"""
    dm = lambda v: int(round(v * 10))
    line = lambda pts: [c for (x, y) in pts for c in (dm(cx + x), dm(cy + y), 0)]
    ring = [(40 + 12 * math.sin(math.radians(a)), -30 + 12 * math.cos(math.radians(a))) for a in range(0, 361, 15)]
    ways = [
        # kind, surface, width in dm, flags, name, number, points – and beside it: lanes, s0 (dm along the whole way)
        ([1, 0, 70, 0, 1, 3, line([(-85, -30), (-40, -30), (0, -30), (28, -30)])], None, 0),          # 0 the main street, west arm
        ([1, 0, 70, 0, 1, 3, line([(52, -30), (85, -30)])], None, 1370),                              # 1 its east arm: the dashes go on
        ([1, 0, 65, 4 | 32, 1, 3, line(ring)], 1, 0),                                                # 2 a roundabout
        ([3, 0, 55, 512, 2, 0, line([(-60, -30), (-60, 10), (-60, 55)])], None, 0),                  # 3 a street, no pavement on its right
        ([3, 2, 60, 64, 2, 0, line([(40, -18), (40, 22)])], None, 0),                                # 4 a level street of paving stones
        ([5, 0, 40, 0, 0, 0, line([(-60, 20), (-10, 20)])], None, 0),                                # 5 the lane of the car park
        ([2, 0, 60, 4, 0, 0, line([(-20, -30), (-20, -65)])], 1, 0),                                 # 6 one way, one lane: no centre line
        ([1, 0, 70, 4, 0, 0, line([(0, -30), (0, -65)])], 2, 0),                                     # 7 one way, two lanes: a lane divider
        ([8, 2, 16, 128, 0, 0, line([(70, 40), (88, 40)])], None, 0),                                # 8 steps: not in the map
    ]
    rect = lambda x0, y0, x1, y1: line([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
    town = [c for (x, y) in [(-95, -75), (95, -75), (95, 75), (-95, 75)] for c in (cx + x, cy + y)]
    roads = {
        'v': 1, 'kinds': DATA['kinds'], 'surf': DATA['surf'], 'names': ['', 'Probestraße', 'Am Probeplatz', 'L 9999'],
        'ways': [w for w, _, _ in ways], 'lanes': [l for _, l, _ in ways], 's0': [s for _, _, s in ways],
        'areas': [[2, 64, 2, rect(10, 22, 70, 60), [rect(37, 38, 43, 44)], 'platz'], [0, 0, 0, rect(-50, 2, -12, 40), [], 'parken']],
        'places': [{'n': 'Probestadt', 'k': 'town', 'x': cx, 'y': cy, 'a': [town]}],
        'orte': [{'n': 'Probestadt', 't': 2, 'a': [[dm(v) for v in town]]}],
        'signs': [], 'routes': {'probe': {'n': 'Probestadt', 'pts': [dm(cx - 85), dm(cy - 30), dm(cx + 28), dm(cy - 30)]}},
    }
    furn = {
        'lampen': [c for x in (-75, -45, -15, 15) for c in (dm(cx + x), dm(cy - 23.5), 180, 0)],
        'schilder': [['274-40', dm(cx - 70), dm(cy - 34.6), 90], ['km', dm(cx + 62), dm(cy - 34.6), 90, '99,9']],
        'linien': [['zebra', dm(cx - 40), dm(cy - 30), 90, 35]],
    }
    return roads, furn


def fetch_tiles():
    """the tiles the app asks for along the kilometre of the drive (levels 10–12, the rings of welt/welt.js), into dist/"""
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
    try:
        meta = json.load(open(os.path.join(DIST, 'meta.json')))
    except Exception:
        print('welt tiles: no meta.json', flush=True)
        return False
    jobs = set()
    for L, pad in ((10, 900), (11, 500), (12, 270)):
        s = 409600 / (1 << L)
        r = meta['tiling']['levels'].get(str(L), {}).get('rect')
        for x, y in ROUTE[max(0, I0 - 3):I1 + 4]:
            E, N = utm(x, y)
            for tx in range(int((E - pad - 420700) // s), int((E + pad - 420700) // s) + 1):
                for ty in range(int((N - pad - 5390800) // s), int((N + pad - 5390800) // s) + 1):
                    if r and r[0] <= tx <= r[2] and r[1] <= ty <= r[3]:
                        jobs.add(f't/{L}/{tx}/{ty}.bin')
                        jobs.add(f'i/{L}/{tx}/{ty}.webp')
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(12) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'welt tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)
    return True


TILES = fetch_tiles() if want('fahrt') or want('sets') else False
# an Open-Meteo answer with the same weather in every hour (viz3/test/wetter.py)
MOCK = r"""window.__wxAnswer = rec => url => {
  const names = { T: 'temperature_2m', P: 'precipitation', R: 'rain', SH: 'showers', SN: 'snowfall', C: 'cloud_cover', V: 'visibility', W: 'wind_speed_10m',
    G: 'wind_gusts_10m', D: 'wind_direction_10m', WC: 'weather_code', H: 'relative_humidity_2m', SD: 'snow_depth' };
  const q = new URL(url).searchParams, now = Math.floor(Date.now() / 1000), hourly = { time: [] };
  let t0, t1;
  if (q.get('start_date')) { t0 = Date.parse(q.get('start_date') + 'T00:00:00Z') / 1000; t1 = Date.parse(q.get('end_date') + 'T23:00:00Z') / 1000; }
  else { t0 = Math.floor(now / 86400) * 86400 - 86400; t1 = t0 + 4 * 86400 - 3600; }
  for (const n of Object.values(names)) hourly[n] = [];
  for (let t = t0; t <= t1; t += 3600) { hourly.time.push(t); for (const [k, n] of Object.entries(names)) hourly[n].push(rec[k] ?? null); }
  const out = { latitude: 50.47, longitude: 10.78, utc_offset_seconds: 0, hourly };
  if (!q.get('start_date')) { const c = { time: Math.floor(now / 900) * 900, interval: 900 };
    for (const [k, n] of Object.entries(names)) if (rec[k] !== undefined) c[n] = ['P', 'R', 'SH', 'SN'].includes(k) ? rec[k] / 4 : rec[k]; out.current = c; }
  return out;
};"""
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='mittel')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {int(round(secs / dt))}; i++) GAME.step({dt})")
    st = lambda: J("STRASSEN.state()")
    progs = lambda: E("(GAME.R.info.programs || []).length")
    # the programs by a short hash of their key (to name a new one)
    plist = lambda: J("(GAME.R.info.programs || []).map(p => { const k = p.cacheKey || ''; let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; return [h, p.name, k.slice(0, 160)]; })")
    E("document.querySelectorAll('.ov,#doorbtn,#joy,#toast').forEach(e => e.style.visibility = 'hidden')")
    E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60 + 30; CLOCK.setRate('real'); DN.update(true)")
    lib.settle_light(pg)
    # the weather of the test: clear and dry, whatever it is outside today
    E(MOCK)
    E("WETTER.mock(__wxAnswer(WETTER.data.PRESETS.heiter))")
    time.sleep(0.2)
    E("WETTER.snap()")
    steps(1)

    def view(x, y, yaw, pitch=-4, fov=58):
        """the walker at (x, y) looking yaw degrees (clockwise from north); the tiles and the furniture near are there before it returns"""
        E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, {pitch}, {fov}); for (let i = 0; i < 4; i++) GAME.step(0.25); }})()")
        for k in range(60):
            steps(0.3)
            if k > 1 and not J("WELT.state ? WELT.state() : {}").get('loading'):
                break
            time.sleep(0.3)
        E("STRKARTE.flush && STRKARTE.flush(); STRASSEN.fill()")
        E(f"(() => {{ GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, {pitch}, {fov}); for (let i = 0; i < 6; i++) GAME.step(0.1); STRKARTE.flush && STRKARTE.flush(); STRASSEN.fill(); GAME.step(0.05); }})()")

    def before(x, y, h, back=7.0, side=-1.6):
        """a place `back` metres before a thing at (x, y) that belongs to the traffic heading h (radians), a little to the left of it"""
        f = (math.sin(h), math.cos(h))
        r = (math.cos(h), -math.sin(h))
        cx, cy = x - f[0] * back + r[0] * side, y - f[1] * back + r[1] * side
        return cx, cy, math.degrees(math.atan2(x - cx, y - cy))

    s0 = st()
    print('start', json.dumps(s0), flush=True)
    pl_start = plist()
    if want('start'):
        ck('the data is there: towns and villages, the furniture in its cells', E("STRDAT.ready && STRDAT.orte.length >= 15") and s0['ready'] and not s0['err']
           and s0['n']['posts'] > 1500 and s0['n']['signs'] > 200 and s0['n']['lamps'] > 800 and s0['n']['masts'] > 400 and s0['n']['rails'] > 100, json.dumps(s0['n']))
        # the styles in the road map of the square: a stretch of each style that the ways hold, read back at its middle
        sty = J("""(() => { const out = {}; for (const w of ROADS.ways) { if (w.kind > 2 || w.surf > 1 || w.fl & 1 || !w.st) continue;
          for (let k = 0; k < w.st.length; k++) { const s = w.st[k]; if (out[s]) continue; const x = (w.p[k * 2] + w.p[k * 2 + 2]) / 2, y = (w.p[k * 2 + 1] + w.p[k * 2 + 3]) / 2,
            l = Math.hypot(w.p[k * 2 + 2] - w.p[k * 2], w.p[k * 2 + 3] - w.p[k * 2 + 1]); if (l < 8) continue; const r = ROADS.at(x, y); out[s] = { x, y, kind: w.kind, w: w.w, at: r }; } }
          return out; })()""")
        ck('the road map of the square carries the styles of its roads: open country, no overtaking, town',
           all(str(k) in sty and sty[str(k)]['at'] and sty[str(k)]['at']['style'] == k and sty[str(k)]['at']['kind'] == sty[str(k)]['kind'] for k in (0, 1, 2)),
           json.dumps({k: [round(v['x']), round(v['y']), v['at']] for k, v in sty.items()})[:400])
        ck('the place decides the style: in Schleusingen a town, on the Landstraße beside Ratscher open country',
           E("STRDAT.placeAt(-908, 1007) === 2 && STRDAT.placeAt(448, -125) === 0 && STRDAT.placeAt(200, -220) === 1"),
           str(J("[STRDAT.placeAt(-908, 1007), STRDAT.placeAt(448, -125), STRDAT.placeAt(200, -220)]")))
        ck('the bridges of the square carry their markings as paint on the deck (the road map leaves bridges out)', s0['n']['decks'] > 0 and s0['n']['lines'] > 50, json.dumps(s0['n']))
        ck('at the start only the cells near the garden are built', s0['built'] < 60 and s0['extra'] < 500, f"{s0['built']} cells, {s0['extra']} colliders")
        # nothing stands on a carriageway: every post, sign, lamp and rail of the square against the road map
        au = J(f"STRASSEN.audit({RB[0] + 5}, {RB[1] + 5}, {RB[2] - 5}, {RB[3] - 5})")
        bad = [a for a in au if a[3] > (-0.15 if a[0] == 'rail' else -0.25)]
        kinds = {k: sum(1 for a in au if a[0] == k) for k in ('post', 'sign', 'lamp', 'rail')}
        ck('in the square nothing of it stands on a carriageway (posts, signs, lamps a quarter metre off the edge or more)', len(au) > 300 and not bad, f"{kinds}, on the road: {bad[:6]}")
    if want('moebel'):
        # a delineator of the square: the nearest ones to the Landstraße north-east of Ratscher
        q = A['pfosten']
        P = [(q[i] / 10, q[i + 1] / 10, math.radians(q[i + 2])) for i in range(0, len(q), 3)]
        px, py, ph = min(P, key=lambda p: math.hypot(p[0] - 462, p[1] + 209))
        cx, cy, yaw = before(px, py, ph, 5.0, -1.4)
        view(cx, cy, yaw, -7)
        s = st()
        ck('delineators stand along the Landstraße near the observer', s['shown']['posts'] > 20 and s['tris'] > 1000, json.dumps(s['shown']))
        ck('their meshes are in the scene, the posts of signs are solid for vehicles',
           s['meshes'] > 0 and s['extra'] > 0 and E("VEH.extra.filter(x => x.strassen).length") == s['extra'], f"{s['meshes']} meshes, {s['extra']} colliders")
        lib.shot(pg, OUT, '01_leitpfosten')
        # a speed limit of the square, seen by the traffic it speaks to
        sg = [s2 for s2 in A['schilder'] if s2[0].startswith('274-') and RB[0] + 80 < s2[1] / 10 < RB[2] - 80 and RB[1] + 80 < s2[2] / 10 < RB[3] - 80]
        if ck('the square has speed limits where OpenStreetMap changes the limit', len(sg) > 2, str(len(sg))):
            x, y, h = sg[0][1] / 10, sg[0][2] / 10, math.radians(sg[0][3])
            cx, cy, yaw = before(x, y, h, 8.0)
            view(cx, cy, yaw, 3)
            ck('a sign stands there with its face (the cell of the sign in the picture of the faces)', st()['shown']['signs'] > 0 and E(f"!!STRASSEN.atlas.cell['{sg[0][0]}']"), sg[0][0])
            lib.shot(pg, OUT, '02_tempolimit')
        # a guard rail (the motorway)
        rl = [r for r in A['planken'] if len(r) > 80 and RB[0] + 100 < r[1 + (len(r) // 4) * 2] / 10 < RB[2] - 100 and RB[1] + 100 < r[2 + (len(r) // 4) * 2] / 10 < RB[3] - 100]
        if rl:
            r = rl[0]
            m = (len(r) - 1) // 4
            x, y = r[1 + m * 2] / 10, r[2 + m * 2] / 10
            x2, y2 = r[1 + (m + 12) * 2] / 10, r[2 + (m + 12) * 2] / 10
            view(x - 2.5 * r[0] * (y2 - y) / math.hypot(x2 - x, y2 - y), y + 2.5 * r[0] * (x2 - x) / math.hypot(x2 - x, y2 - y), math.degrees(math.atan2(x2 - x, y2 - y)) - 12 * r[0], -6)
            ck('guard rails stand where OpenStreetMap has them', st()['shown']['rails'] > 0, json.dumps(st()['shown']))
            lib.shot(pg, OUT, '03_schutzplanke')
    if want('stadt'):
        view(-905, 1000, 300, -5)
        s = st()
        ck('in Schleusingen street lamps stand along the streets', s['shown']['lamps'] > 10, json.dumps(s['shown']))
        ck('the lamps are dark by day', s['glow'] < 0.01 and E("[...STRASSEN.cells.values()].filter(c => c.built && c.pool && c.pool.visible).length") == 0, str(s['glow']))
        lib.shot(pg, OUT, '04_stadt')
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 23 * 60 + 40; DN.update(true)")
        lib.settle_light(pg)
        steps(1)
        s = st()
        pools = E("[...STRASSEN.cells.values()].filter(c => c.built && c.pool && c.pool.visible).length")
        lit = E("(VPROPS.lamps || []).filter(l => l.str).length")
        ck('at night they glow, their light lies on the ground, the nearest light the facades', s['glow'] > 3 and pools > 0 and lit >= s['shown']['lamps'] > 0, f"glow {s['glow']}, {pools} cells with light, {lit} lamps for the facades")
        lib.shot(pg, OUT, '05_nacht')
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60 + 30; DN.update(true)")
        lib.settle_light(pg)
        steps(1)
        ck('… and go out again by day', st()['glow'] < 0.01, str(st()['glow']))
    if want('nass'):
        view(-905, 1000, 300, -8)
        u0 = J("[ROADS.U.uRoad.value.y, ROADS.W.uRoad.value.y]")
        E("WETTER.mock(__wxAnswer(WETTER.data.PRESETS.regen))")
        time.sleep(0.2)
        E("WETTER.snap()")
        steps(30, 0.5)
        E("DN.update(true)")
        steps(1)
        u1 = J("[ROADS.U.uRoad.value.y, ROADS.W.uRoad.value.y]")
        ck('dry roads do not shine; in the rain the wetness reaches both road maps (the square, the window beyond)', max(u0) < 0.05 and min(u1) > 0.5, f"{u0} → {u1}")
        lib.shot(pg, OUT, '06_regen')
        E("WETTER.mock(__wxAnswer(WETTER.data.PRESETS.schnee))")
        time.sleep(0.2)
        E("WETTER.snap()")
        steps(40, 0.5)
        E("DN.update(true)")
        steps(1)
        sn = J("{ snow: WETTER.state().snowCover, u: ROADS.U.uRoad.value.y, paint: [...STRASSEN.cells.values()].filter(c => c.built && c.paint).map(c => c.paint.visible) }")
        ck('under snow nothing shines and the painted lines are covered', sn['snow'] > 0.3 and sn['u'] < 0.2 and not any(sn['paint']), json.dumps(sn)[:200])
        lib.shot(pg, OUT, '07_schnee')
        E("WETTER.mock(__wxAnswer(WETTER.data.PRESETS.heiter))")
        time.sleep(0.2)
        E("WETTER.snap()")
        steps(60, 0.5)
    if want('fahrt') and ck('the tiles of the drive are there', TILES):
        # by car on the L 1625 west of the square, in open country
        E("VEH.enter('car'); GAME.setView3(true)")
        E(f"VEH.follow([[0, 0], [0, 1]]); VEH.auto = null; VEH.place('car', {START[0]}, {START[1]}, {START[2]})")
        for k in range(80):
            steps(0.2, 0.025)
            w = J("WELT.state()")
            if k > 3 and not w.get('loading') and E("FAHRT.ready && WELT.active"):
                break
            time.sleep(0.3)
        steps(1, 0.025)
        E("STRKARTE.flush(); STRASSEN.fill()")
        steps(0.5, 0.025)
        k = J("{ on: STRKARTE.on, active: STRKARTE.active, n: STRKARTE.n, ms: STRKARTE.ms, ways: STRKARTE.ways, u: ROADS.W.uRoad.value.toArray(), far: STRKARTE.FAR }")
        r = J(f"STRKARTE.at({START[0]}, {START[1]})")
        ck('beyond the square the tiles read the road map of a window around the vehicle', k['active'] and k['u'][0] == 1 and abs(k['u'][2] - k['far']) < 1 and k['ways'] > 0, json.dumps(k))
        ck('on the L 1625 it says: a main road, asphalt, open country, the middle of the carriageway', bool(r) and r['kind'] == 1 and r['surf'] == 0 and r['style'] in (0, 1) and r['e'] > 2 and abs(r['lat']) < 1.5, json.dumps(r))
        # the finest tiles under the car came after the first cells: within a few seconds everything is set down on them
        steps(4, 0.05)
        E("STRASSEN.fill()")
        s = st()
        ck('delineators along it, standing on the ground of the tiles',
           s['shown']['posts'] > 10 and E("[...STRASSEN.cells.values()].filter(c => c.built && Math.hypot(c.x - VEH.cur.st.x, c.y - VEH.cur.st.y) < 250).every(c => c.ref.every(r => Math.abs(KERN.ground(r[0], r[1]) - r[2]) < 0.12))"), json.dumps(s['shown']))
        E("GAME.setView3(true)")
        steps(0.3, 0.025)
        lib.shot(pg, OUT, '08_landstrasse')
        # a kilometre along the road at 70 km/h: the window follows, the furniture comes and goes, no long frame for either
        n0, rb0 = k['n'], s['rebuilt']
        E("STRASSEN.msMax = 0; STRKARTE.msMax = 0; KERN.profile(true)")
        E(f"window._fs = VEH.follow({json.dumps([list(p) for p in ROUTE[I0 + 1:I1 + 2]])}, 19.5, {{ look: 12 }})")
        t0 = time.time()
        for i in range(120):
            steps(0.5, 0.025)
            c = J("VEH.state().find(v => v.id === 'car')")
            if math.dist((c['x'], c['y']), ROUTE[I1]) < 60 or time.time() - t0 > 600:
                break
        prof = J("KERN.profile()") or {}
        E("KERN.profile(false)")
        k2 = J("{ n: STRKARTE.n, msMax: STRKARTE.msMax, busy: STRKARTE.busy }")
        s2 = st()
        moved = math.dist((c['x'], c['y']), (START[0], START[1]))
        ck('the car drove on along the road', moved > 600, f"{moved:.0f} m")
        ck('the window followed the car (a new road map on the way)', k2['n'] > n0, f"{n0} → {k2['n']} maps, the longest {k2['msMax']} ms of raster in all")
        pr = {n: round(v['ms'] / max(1, v['n']), 3) for n, v in prof.items() if n.startswith('strassen')}
        ck('the roads cost little per frame on the drive (the raster in slices, the furniture two cells per round)',
           len(pr) >= 2 and all(v < 1.0 for v in pr.values()) and s2['msMax'] < 60, f"mean per frame {pr} ms, the longest round of the furniture {s2['msMax']} ms, set down again {s2['rebuilt'] - rb0} cells")
        ck('what was built is freed behind the car', s2['built'] < 80 and s2['tris'] < 600000, f"{s2['built']} cells, {s2['tris']} triangles, {s2['extra']} colliders")
        steps(4, 0.05)
        ck('everything still stands on the ground under it (finer tiles came on the way)',
           E("[...STRASSEN.cells.values()].filter(c => c.built && Math.hypot(c.x - VEH.cur.st.x, c.y - VEH.cur.st.y) < 250).every(c => c.ref.every(r => Math.abs(KERN.ground(r[0], r[1]) - r[2]) < 0.15))"))
        lib.shot(pg, OUT, '09_weiter')
        # at night the reflectors of the delineators shine back at the car one drives (its lamps come on in the dark); not at a walker
        g0 = st()['glint']
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 23 * 60 + 40; DN.update(true)")
        lib.settle_light(pg)
        steps(1, 0.025)
        g1 = st()['glint']
        vis = E("[...STRASSEN.cells.values()].filter(c => c.built && c.glint && c.glint.visible).length")
        ck('at night the reflectors shine back at the car one drives', not g0 and g1 and vis > 0, f"day {g0}, night {g1}, {vis} cells")
        lib.shot(pg, OUT, '10_nachtfahrt')
        E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60 + 30; DN.update(true)")
        lib.settle_light(pg)
        steps(1, 0.025)
        E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null")
    if want('sets') and ck('the tiles around the made-up town are there', TILES):
        roads, furn = probe_town(*PC)
        cx, cy = PC
        P = lambda x, y: f"{cx + x}, {cy + y}"
        at_ = lambda x, y: J(f"STRKARTE.at({P(x, y)})")
        surf = lambda x, y: J(f"KERN.surface({P(x, y)}) || null")
        E("if (VEH.cur) VEH.exit()")
        view(cx, cy - 20, 0)
        E("STRKARTE.flush(); STRASSEN.fill()")
        steps(3, 0.05)
        base = J("{ ways: FAHRT.data.ways.length, signs: FAHRT.data.signs.length, places: FAHRT.data.places.length, grid: FAHRT.data.grid.size, orte: STRDAT.orte.length, extra: VEH.extra.length, n: STRASSEN.state().n, faces: STRASSEN.state().faces, maps: STRKARTE.n }")
        gnd = f"[[0, 0], [40, 40], [-30, 20], [40, -30], [-60, 30], [80, -30]].map(q => KERN.ground({cx} + q[0], {cy} + q[1]))"
        g0 = J(gnd)
        ck('a meadow before: no road there, open country', at_(0, -30) is None and surf(40, 40) is None and E(f"STRDAT.placeAt({P(0, 0)})") == 0, json.dumps(base)[:200])
        E(f"window._probe = {json.dumps(roads)}; window._probeF = {json.dumps(furn)}")
        ok = E("FAHRT.add('probe', _probe, { carve: false })")
        s1 = J("FAHRT.status()")
        ck('FAHRT.add takes a road file while the app runs: ways, areas, a place, its built-up area', ok and s1['sets'] == ['probe'] and s1['ways'] == base['ways'] + 9 and s1['areas'] == 2
           and E("STRDAT.sets.has('fahrt:probe')") and E(f"STRDAT.placeAt({P(0, 0)})") == 2 and E(f"FAHRT.place({P(-40, -30)})") == 'Probestraße, Probestadt'
           and E("FAHRT.data.dests.probe") == 'Probestadt' and E("!!FAHRT.data.routes.probe"),
           json.dumps({k: s1[k] for k in ('sets', 'ways', 'areas', 'rev')}) + ' ' + str(E(f"FAHRT.place({P(-40, -30)})")))
        ck('the road map is rastered again at once', E("STRKARTE.busy || STRKARTE.n >= 0") and (E("STRKARTE.flush()") or True) and E("STRKARTE.n") > base['maps'], f"{base['maps']} → {E('STRKARTE.n')} maps, {E('STRKARTE.ms')} ms")
        m = {k: at_(*q) for k, q in {'main': (-40, -30), 'ring': (40, -18), 'ringE': (40, -42), 'level': (40, 5), 'square': (25, 40), 'hole': (40, 41), 'park': (-30, 10), 'lane': (-30, 20),
                                    'one1': (-20, -50), 'one2': (0, -50), 'sideL': (-65, 30), 'sideR': (-55, 30), 'steps': (82, 40), 'mainW': (-70, -27)}.items()}
        ck('the main street in the town: a main road with kerbs and a centre line (its axis in the map)', m['main'] and m['main']['kind'] == 1 and m['main']['style'] == 2 and abs(m['main']['lat']) < 0.8, json.dumps(m['main']))
        ck('the roundabout and the one-way street of one lane keep off the axis (no centre line); two lanes one way keep their divider',
           m['ring'] and m['ring']['kind'] == 1 and m['ring']['lat'] >= 0.5 and m['ringE']['lat'] >= 0.5 and m['one1']['lat'] >= 0.5 and m['one1']['kind'] == 2 and abs(m['one2']['lat']) < 0.8,
           json.dumps({k: m[k] for k in ('ring', 'one1', 'one2')}))
        ck('the level street is kind 9 with its paving, no kerb', m['level'] and m['level']['kind'] == 9 and m['level']['surf'] == 2, json.dumps(m['level']))
        ck('the square: kind 9, paving, deep inside; its hole is outside', m['square'] and m['square']['kind'] == 9 and m['square']['surf'] == 2 and m['square']['e'] > 6 and m['hole'] and m['hole']['e'] < 0, json.dumps([m['square'], m['hole']]))
        ck('the car park: kind 9, asphalt – also where its lane crosses it', m['park'] and m['park']['kind'] == 9 and m['park']['surf'] == 0 and m['lane']['kind'] == 9 and m['lane']['surf'] == 0, json.dumps([m['park'], m['lane']]))
        ck('the street without a pavement on its right: that half kerb and gutter only (a through road of a village in the map), the left half town',
           m['sideR'] and m['sideR']['style'] == 3 and m['sideR']['kind'] == 2 and m['sideL']['style'] == 2 and m['sideL']['kind'] == 3, json.dumps([m['sideL'], m['sideR']]))
        ck('steps are left out of the map', m['steps'] is None or m['steps']['kind'] != 8, json.dumps(m['steps']))
        sf = {k: surf(*q) for k, q in {'square': (25, 40), 'level': (40, 5), 'main': (-40, -30), 'meadow': (-80, 60)}.items()}
        ck('KERN.surface: the square and the streets carry (grip), the meadow not', sf['square'] and sf['square'].get('area') and sf['square']['surf'] == 2 and sf['level'] and sf['level']['kind'] == 3 and sf['level']['e'] > 2
           and sf['main']['kind'] == 1 and sf['meadow'] is None, json.dumps(sf))
        steps(2, 0.05)
        g1 = J(gnd)
        ck('carve: false – the ground stays as it was', all(abs(a - b) < 0.01 for a, b in zip(g0, g1)), json.dumps([round(b - a, 3) for a, b in zip(g0, g1)]))
        # its furniture: four lamps, a speed limit and a kilometre stone with faces the picture did not have, a zebra crossing
        orev = E("STRDAT.orev")
        ok = E("STRDAT.add('probe', _probeF)") and E("STRDAT.orev") == orev   # (furniture alone: the styles of the roads stay)
        E("STRASSEN.fill()")
        steps(1, 0.05)
        E("STRASSEN.fill()")
        s2 = st()
        ck('STRDAT.add brings furniture: lamps, signs with new faces in the picture, paint', ok and 'probe' in s2['sets'] and s2['n']['lamps'] == base['n']['lamps'] + 4 and s2['n']['signs'] == base['n']['signs'] + 2
           and s2['faces'] == base['faces'] + 2 and E("!!STRASSEN.atlas.cell['274-40'] && !!STRASSEN.atlas.cell['km|99,9']") and s2['n']['lines'] == base['n']['lines'] + 1 and not s2['err'],
           json.dumps({'sets': s2['sets'], 'faces': s2['faces'], 'n': s2['n'], 'err': s2['err']}))
        near = J(f"STRASSEN.audit({cx - 95}, {cy - 75}, {cx + 95}, {cy + 75})")
        ck('they stand beside the carriageway, on the ground', len([o for o in near if o[0] == 'lamp']) == 4 and len([o for o in near if o[0] == 'sign']) == 2 and all(o[3] is None or o[3] < -0.25 for o in near), json.dumps(near))
        E("STRKARTE.flush(); STRASSEN.fill()")
        steps(0.5, 0.05)
        for nm, (x, y, yaw, pitch, up) in {'11_probestadt': (0, -150, 0, -24, 42), '12_platz': (40, -4, 0, -10, 0), '13_kreisel': (2, -27, 90, -9, 0),
                                            '14_einseitig': (-60, -14, 0, -9, 0), '15_parkplatz': (-66, 14, 80, -12, 0), '16_hauptstrasse': (-80, -28.5, 92, -7, 0)}.items():
            E(f"GAME.view({cx + x}, {cy + y}, KERN.ground({cx + x}, {cy + y}) + 1.6 + {up}, {yaw}, {pitch}, 58)")
            lib.shot(pg, OUT, nm)
        view(cx, cy - 20, 0)
        # ... and away again: everything as it was before
        ok = E("FAHRT.drop('probe')") and E("STRDAT.drop('probe')")
        E("STRKARTE.flush(); STRASSEN.fill()")
        steps(1, 0.05)
        E("STRKARTE.flush(); STRASSEN.fill()")
        end = J("{ ways: FAHRT.data.ways.length, signs: FAHRT.data.signs.length, places: FAHRT.data.places.length, grid: FAHRT.data.grid.size, orte: STRDAT.orte.length, extra: VEH.extra.length, n: STRASSEN.state().n, faces: STRASSEN.state().faces, maps: STRKARTE.n }")
        s3 = J("FAHRT.status()")
        same = all(end[k] == base[k] for k in ('ways', 'signs', 'places', 'grid', 'orte', 'extra')) and end['n'] == base['n']
        ck('FAHRT.drop and STRDAT.drop take it all out again: tables, grid, places, furniture, colliders', ok and same and s3['sets'] == [] and s3['areas'] == 0 and not E("STRDAT.sets.size") and st()['sets'] == [],
           json.dumps({k: [base[k], end[k]] for k in ('ways', 'signs', 'places', 'grid', 'orte', 'extra')}) + json.dumps(end['n']))
        ck('the meadow is a meadow again', at_(0, -30) is None and at_(25, 40) is None and surf(25, 40) is None and E(f"STRDAT.placeAt({P(0, 0)})") == 0 and E(f"FAHRT.place({P(-40, -30)})") != 'Probestraße, Probestadt')
        lib.shot(pg, OUT, '17_wieder_wiese')
        # a set that comes before the region's own roads are loaded waits for them (FAHRT asleep: a fresh page would be needed – here only
        # the contract: add answers true and drop takes a waiting set out again)
        ck('add and drop answer what they did', E("FAHRT.drop('nie')") is False and E("STRDAT.drop('nie')") is False and E("FAHRT.add('', _probe)") is False and E("FAHRT.add('x', {})") is False)
        # a set may leave the place names to its zone; a zone with ground of its own tells where it is (or will be)
        np0 = E("FAHRT.data.places.length")
        rk = J("Object.keys(FAHRT.data.routes).sort()")
        E("FAHRT.add('p2', { ways: [], places: _probe.places, routes: { markt: { pts: [0, 0, 10, 10], n: 'Falsch' } }, areas: [[0, 0, 0, [0, 0, 0, 100, 0, 0, 100, 100, 0], 'kein Ring']] }, { places: false })")
        ck('opts.places: false – the set brings no place names; it cannot take the place of a route of the region; an area without holes',
           E("FAHRT.data.places.length") == np0 and J("Object.keys(FAHRT.data.routes).sort()") == rk and E("FAHRT.data.routes.markt.length") > 100 and not E("FAHRT.data.dests.markt")
           and E("FAHRT.data.areas.length") == 1 and E("FAHRT.drop('p2')") and E("FAHRT.data.routes.markt.length") > 100 and not E("FAHRT.data.dests.probe"))
        far = (-20500.0, 3000.0)
        r0 = E(f"FAHRT.ready_({far[0]}, {far[1]})")
        E(f"FAHRT.ground((x, y) => (Math.abs(x - {far[0]}) < 50 && Math.abs(y - {far[1]}) < 50 ? window._zg : undefined))")
        E("window._zg = false")
        r1 = E(f"FAHRT.ready_({far[0]}, {far[1]})")
        E("window._zg = true")
        r2 = E(f"FAHRT.ready_({far[0]}, {far[1]})")
        ck('FAHRT.ground: a zone with ground of its own says where it is there (and where it is still loading)', r0 is False and r1 is False and r2 is True and E(f"FAHRT.ready_({far[0] + 200}, {far[1]})") is False, f"{r0} {r1} {r2}")
    if want('gl'):
        # the programs the roads' own meshes are drawn with: all of them were compiled while the loading screen was up
        mine = J("""(() => { const out = {}; for (const c of [...STRASSEN.cells.values(), ...STRASSEN.big.values()]) for (const o of c.meshes) for (const m of [].concat(o.material)) {
          const pr = GAME.R.properties.get(m); for (const p of pr && pr.programs ? pr.programs.values() : []) { const k = p.cacheKey || ''; let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
            out[h] = (o.name || '').split(' ').slice(0, 2).join(' '); } } return out; })()""")
        h0 = {str(p[0]) for p in pl_start}
        late = {v for k, v in mine.items() if k not in h0}
        ck('the roads bring no shader program after the start (their materials are compiled while the loading screen is up)', len(mine) >= 2 and not late, f"{len(mine)} programs in use, compiled late: {sorted(late)}; all programs {len(pl_start)} → {progs()}")
        ok, r = lib.check_gl(pg, 16)
        ck('every shader program links and stays within 16 textures (the ground shaders with the road map)', ok, json.dumps({k2: r[k2] for k2 in ('programs', 'maxFrag', 'maxVert', 'broken')})[:300] + json.dumps(r['bad'])[:300])
    ck('no error in the roads', not st()['err'] and not E("STRDAT.err || ''"), str(st()['err']))
    ck.errors(errs)
ck.done()
