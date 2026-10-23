# Driving out of the square (welt/fahrt.js, feat/fahrt): nothing of it at the start; the car drives out of the 2.4 km square on the real
# roads to the Markt of Schleusingen (the ground ahead loads before the wheels, held while it loads, never through the ground), smooth on
# the carved road profile, speed holds on the L 1625 westwards, place-name signs and place names on the way, the end of the map at the
# edge of the tiles (or on to the Baumschule Kammbach in Kloster Veßra when the tiles of feat/vessra are there), tiles freed behind and
# after coming home, textures per shader. Pictures in out/fahrt/.
# The world tiles come from the published site (welt-test/, welt-test/zonen/vessra/) and are copied into viz3/dist/welt-test/ first.
# Sections (optional second argument, comma-separated): start,edge,markt,west,free,gl
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda k: not ONLY or k in ONLY
ck = lib.Checks('fahrt')
OUT = lib.out('fahrt')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
G = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']
XF, TI = G['xf'], G['terrain']['inner']
RB = (TI['x0'], TI['y0'], TI['x0'] + (TI['n'] - 1) * TI['step'], TI['y0'] + (TI['n'] - 1) * TI['step'])
DATA = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'fahrt', 'dist', 'fahrt', 'strassen.json')))
ROUTE = {k: [(r['pts'][i] / 10, r['pts'][i + 1] / 10) for i in range(0, len(r['pts']), 2)] for k, r in DATA['routes'].items()}
SETS = os.path.exists(os.path.join(lib.ROOT, 'viz3', 'src', 'welt', 'welt.js')) and 'addSet' in open(os.path.join(lib.ROOT, 'viz3', 'src', 'welt', 'welt.js')).read()


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def outside(x, y, m=12):
    return not (RB[0] + m < x < RB[2] - m and RB[1] + m < y < RB[3] - m)


def resample(pts, step=20):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        L = math.dist(a, b)
        for k in range(1, int(L // step) + 1):
            out.append((a[0] + (b[0] - a[0]) * k * step / L, a[1] + (b[1] - a[1]) * k * step / L))
        out.append(b)
    return out


def fetch_tiles():
    """the tiles the app asks for along the routes (levels 10-12, rings of welt/welt.js around a point up to 110 m ahead), into dist/"""
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
    subs = [''] + (['zonen/vessra/'] if SETS else [])
    metas = {}
    for sub in subs:
        get(sub + 'meta.json')
        try:
            metas[sub] = json.load(open(os.path.join(DIST, sub, 'meta.json')))
        except Exception:
            pass
    pts = []
    for k in ROUTE:
        pts += resample(ROUTE[k])
    jobs = set()
    for L, pad in ((10, 900), (11, 500), (12, 270)):
        s = 409600 / (1 << L)
        for x, y in pts:
            if not outside(x, y, 400):
                continue   # deep inside the square nobody asks for tiles
            E, N = utm(x, y)
            for tx in range(int((E - pad - 420700) // s), int((E + pad - 420700) // s) + 1):
                for ty in range(int((N - pad - 5390800) // s), int((N + pad - 5390800) // s) + 1):
                    for sub, m in metas.items():
                        r = m['tiling']['levels'].get(str(L), {}).get('rect')
                        if r and r[0] <= tx <= r[2] and r[1] <= ty <= r[3]:
                            jobs.add(f'{sub}t/{L}/{tx}/{ty}.bin')
                            jobs.add(f'{sub}i/{L}/{tx}/{ty}.webp')
                            break
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(12) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'welt tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s (sets {list(metas)})', flush=True)


def along(route, i0, dist):
    """index on the route dist metres after (dist > 0) or before i0"""
    i, d = i0, 0
    while 0 < i < len(route) - 1 and d < abs(dist):
        j = i + (1 if dist > 0 else -1)
        d += math.dist(route[i], route[j])
        i = j
    return i


fetch_tiles()
# a recorder in the page: per frame of the driven vehicle – vertical acceleration (from the vertical speed of the body), flights, the gap to
# the drawn ground, the speed
REC = """window._rec = { n: 0, az4: 0, az8: 0, azMax: 0, air: 0, gap: 0, gapAt: null, out: 0, outNoGround: 0, spd: [], last: null, t: 0, bumps: [] };
window.TICKS.push(dt => { const v = VEH.cur, R = window._rec; if (!v || !dt) return; const s = v.st; R.t += dt;
  const vz = s.air ? s.vz : s.vzLP; if (R.last !== null) { const a = Math.abs(vz - R.last) / dt; if (Math.abs(s.u) > 3) { R.n++; if (a > 4) R.az4++; if (a > 8) R.az8++;
    if (a > R.azMax) { R.azMax = a; R.azAt = [+s.x.toFixed(1), +s.y.toFixed(1), +(s.u * 3.6).toFixed(0)]; }
    if (a > 8) { const b = R.bumps, l = b[b.length - 1]; if (!l || Math.hypot(l[0] - s.x, l[1] - s.y) > 6) b.push([+s.x.toFixed(1), +s.y.toFixed(1), +(s.u * 3.6).toFixed(0), +a.toFixed(1)]); else if (a > l[3]) l[3] = +a.toFixed(1); } } } R.last = vz; if (s.air) R.air++;
  const B = RATSCHER.box, o = s.x < B[0] || s.x > B[2] || s.y < B[1] || s.y > B[3];
  if (o) { R.out++; const w = WELT.heightAt(s.x, s.y); if (w === undefined) R.outNoGround++; else if (!s.air) { const g = Math.abs(s.z - KERN.ground(s.x, s.y, s.z)); if (g > R.gap) { R.gap = g; R.gapAt = [+s.x.toFixed(1), +s.y.toFixed(1)]; } } }
  if (R.t > 0.5) { R.t = 0; R.spd.push([+s.x.toFixed(0), +s.y.toFixed(0), +(s.u * 3.6).toFixed(1)]); } });"""
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='mittel')
    lib.boot(pg, port)
    E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    st0 = json.loads(E("""JSON.stringify({ f: FAHRT.status(), res: performance.getEntriesByType('resource').filter(e => /welt-test|fahrt\\//.test(e.name)).length,
        progs: (GAME.R.info.programs || []).length, tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, kern: KERN.providers() })"""))
    print('start', json.dumps(st0), flush=True)
    if want('start'):
        ck('nothing of the drive at the start', st0['f']['on'] and not st0['f']['active'] and st0['f']['state'] == 'idle' and st0['res'] == 0 and st0['f']['welt']['tiles'] == 0,
           json.dumps(st0['f']))
        ck('vehicle hooks in place (edge, limit, walls)', E("typeof VEH.edge === 'function' && typeof VEH.limit === 'function' && typeof VEH.hitsOut === 'function'"))
    E(REC)
    # 14:30, and the clock in real time (a long drive must not run into the evening: other textures, other light)
    E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 14 * 60 + 30; CLOCK.setRate('real'); DN.update(true)")
    lib.settle_light(pg)
    tex0 = E("GAME.R.info.memory.textures")
    st = lambda: json.loads(E("JSON.stringify(VEH.state().find(v => v.id === 'car'))"))
    sub = lambda: E("(() => { const e = document.getElementById('npcsub'); return e && !e.hidden ? e.textContent : ''; })()")
    where = lambda: E("document.getElementById('where').textContent")
    places, signs, msgs = set(), set(), set()

    def chunk(secs=0.5, wait=True, limit=6.0):
        """drive secs of game time; with wait the tiles near the vehicle are allowed to arrive first (a fast connection)"""
        E(f"for (let i = 0; i < {int(round(secs / 0.025))}; i++) GAME.step(0.025)")
        if wait:
            t0 = time.time()
            while time.time() - t0 < limit and json.loads(E("JSON.stringify(WELT.state())"))['loading'] > 0:
                time.sleep(0.15)
        places.add(where())
        f = json.loads(E("JSON.stringify(FAHRT.status())"))
        signs.update(f['signsNear'])
        m = sub()
        if m:
            msgs.add(m)
        return f

    def shot(name, third=True):
        E(f"GAME.setView3({'true' if third else 'false'})")
        E("for (let i = 0; i < 8; i++) GAME.step(0.025)")
        for _ in range(30):
            if json.loads(E("JSON.stringify(WELT.state())"))['loading'] == 0:
                break
            time.sleep(0.3)
        E("GAME.step(0.05)")
        lib.shot(pg, OUT, name)

    def place_on(route, i, back=0):
        E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null")
        a, c = route[i], route[min(len(route) - 1, i + 1)]
        E(f"VEH.place('car', {a[0]}, {a[1]}, Math.atan2({c[0] - a[0]}, {c[1] - a[1]}))")

    def stats():
        return json.loads(E("JSON.stringify((() => { const R = window._rec; return { n: R.n, az4: R.az4, az8: R.az8, azMax: +R.azMax.toFixed(1), azAt: R.azAt, air: R.air, gap: +R.gap.toFixed(2), gapAt: R.gapAt, out: R.out, outNoGround: R.outNoGround, bumps: R.bumps.slice().sort((a, b) => b[3] - a[3]).slice(0, 12) }; })())"))

    def reset_rec():
        E("Object.assign(window._rec, { n: 0, az4: 0, az8: 0, azMax: 0, air: 0, gap: 0, gapAt: null, out: 0, outNoGround: 0, spd: [], last: null, bumps: [] })")

    E("VEH.enter('car'); GAME.setView3(true)")
    E("for (let i = 0; i < 20; i++) GAME.step(0.025)")
    rm = ROUTE['markt']
    i_out = next(i for i, p in enumerate(rm) if outside(*p))
    if want('edge') or want('markt'):
        # 120 m before the place-name sign of Schleusingen on the L 3004 (inside the square, 220 m from its edge), at up to 80 km/h
        # towards the edge – nothing of the drive is loaded yet
        sg = min((s2 for s2 in DATA['signs'] if s2['t'] == 'ort' and s2['n'] == 'Schleusingen'), key=lambda s2: min(math.dist((s2['x'], s2['y']), p) for p in rm))
        i_sg = min(range(len(rm)), key=lambda i: math.dist(rm[i], (sg['x'], sg['y'])))
        i0 = along(rm, i_sg, -120)
        place_on(rm, i0)
        E(f"window._fs = VEH.follow({json.dumps(rm[i0:])}, 16, {{ look: 12 }})")
        reset_rec()
        held = False
        caps = []
        shot_sign = False
        for k in range(90):   # 45 s of game time, as fast as the page steps (no waiting for the network)
            f = chunk(0.5, wait=False)
            caps.append(f['cap'])
            s = st()
            if f['cap'] is not None and f['cap'] < abs(s['kmh']) / 3.6:
                held = True
            if not shot_sign and math.dist((s['x'], s['y']), (sg['x'], sg['y'])) < 40 and 'Schleusingen' in f['signsNear']:
                shot_sign = True
                shot('b_ortstafel')
            if outside(s['x'], s['y'], -40):
                break
        r = stats()
        print('edge', json.dumps(r), 'caps', [c for c in caps if c is not None][:12], flush=True)
        ck('woken before the edge: data and tiles asked for', json.loads(E("JSON.stringify(FAHRT.status())"))['active'] and E("WELT.state().req") > 0,
           json.dumps(json.loads(E("JSON.stringify(FAHRT.status())"))['welt']))
        ck('never on ground that is not there', r['outNoGround'] == 0, json.dumps(r))
        # now with time for the tiles: out of the square
        for k in range(80):
            chunk(0.5)
            s = st()
            if outside(s['x'], s['y'], -40):
                break
        s = st()
        ck('drives out of the square', outside(s['x'], s['y'], -30), json.dumps(s))
        shot('a_raus')
    if want('markt'):
        # in town at 50 km/h
        E(f"window._fs = VEH.follow({json.dumps(rm[i_out:])}, 13.5, {{ look: 9 }})")
        reset_rec()
        T = 0
        shots = {'b_ortstafel': True, 'c_altstadt': False}
        slow = False
        while T < 400:
            f = chunk(0.5)
            T += 0.5
            s = st()
            # the old town is a 30 zone (OSM maxspeed on Burgstraße and Markt): the last 400 m at 30 km/h
            if not slow and math.dist((s['x'], s['y']), rm[-1]) < 400:
                slow = True
                i_n = min(range(len(rm)), key=lambda i: math.dist(rm[i], (s['x'], s['y'])))
                E(f"window._fs = VEH.follow({json.dumps(rm[i_n:])}, 8.3, {{ look: 7 }})")
            fs = json.loads(E("JSON.stringify(window._fs)"))
            if not shots['b_ortstafel'] and 'Schleusingen' in f['signsNear']:
                d = E("""(() => { const v = VEH.cur.st; let best = 1e9; for (const s of FAHRT.data.signs) if (s.n === 'Schleusingen' && s.t === 'ort') best = Math.min(best, Math.hypot(s.x - v.x, s.y - v.y)); return best; })()""")
                if d < 45:
                    shots['b_ortstafel'] = True
                    shot('b_ortstafel')
            if not shots['c_altstadt'] and math.dist((s['x'], s['y']), rm[-1]) < 130 and outside(s['x'], s['y']):
                shots['c_altstadt'] = True
                shot('c_altstadt')
            if fs['done']:
                break
        r = stats()
        s = st()
        print('markt', T, 's', json.dumps(r), json.dumps(s), flush=True)
        ck('at the Markt of Schleusingen', math.dist((s['x'], s['y']), rm[-1]) < 12, f"{math.dist((s['x'], s['y']), rm[-1]):.1f} m from the end, {T} s")
        ck('on the ground all the way (no flights, no gap)', r['outNoGround'] == 0 and r['gap'] < 0.3 and r['air'] < 10, json.dumps(r))
        ck('smooth: few hard bumps (> 8 m/s² vertical)', r['n'] > 0 and r['az8'] / max(1, r['n']) < 0.01, f"{r['az8']} of {r['n']} frames, max {r['azMax']} at {r['azAt']}; worst {r['bumps'][:8]}")
        ck('place-name sign Schleusingen on the way', 'Schleusingen' in signs, str(sorted(signs)))
        ck('place names on the way', any('Schleusingen' in p for p in places), str(sorted(p for p in places if p)[:14]))
        E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: false })")
        chunk(2)
        E("VEH.auto = null")
        shot('d_markt')
        shot('e_markt_fahrer', third=False)
        # the small map while driving: the roads beyond the square, the routes, where the car heads
        E("for (let i = 0; i < 8; i++) GAME.step(0.025)")
        mp = E("(() => { const c = document.getElementById('vmap'); return c && !c.hidden ? c.toDataURL('image/png') : null; })()")
        lab = E("(() => { const l = document.getElementById('vmaplab'); return l ? l.textContent : ''; })()")
        if mp:
            import base64
            open(os.path.join(OUT, 'k_karte.png'), 'wb').write(base64.b64decode(mp.split(',')[1]))
        ck('the small map draws out there (roads, routes, destination)', bool(mp) and E("typeof MMAP.more === 'function'"), f'label {lab!r}')
        mem = json.loads(E("JSON.stringify({ tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, progs: (GAME.R.info.programs || []).length, welt: WELT.state(), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0 })"))
        print('memory at the Markt', json.dumps(mem), flush=True)
    if want('west'):
        rb = ROUTE['baumschule']
        # on the L 1625 west of the square
        i0 = next(i for i, p in enumerate(rb) if outside(*p) and p[0] < RB[0] - 60)
        place_on(rb, i0)
        # put there by hand: first the ground comes (tiles), then it drives
        for _ in range(40):
            chunk(0.25)
            if json.loads(E("JSON.stringify(WELT.state())"))['loading'] == 0 and E(f"WELT.heightAt({rb[i0][0]}, {rb[i0][1]}) !== undefined"):
                break
        E(f"VEH.place('car', {rb[i0][0]}, {rb[i0][1]}, Math.atan2({rb[i0 + 1][0] - rb[i0][0]}, {rb[i0 + 1][1] - rb[i0][1]}))")
        chunk(0.5)
        E(f"window._fs = VEH.follow({json.dumps(rb[i0:])}, 22, {{ look: 15 }})")
        reset_rec()
        T = 0
        mem = []
        stop_t = 0
        shots = {'f_l1625': False, 'g_ende': False, 'h_zollbrueck': False, 'j_wegweiser': False, 'h_bruecke': False}
        wegs = [s2 for s2 in DATA['signs'] if s2['t'] == 'weg']
        while T < 700:
            f = chunk(0.5)
            T += 0.5
            s = st()
            fs = json.loads(E("JSON.stringify(window._fs)"))
            if int(T * 2) % 40 == 0:
                mem.append(json.loads(E("JSON.stringify({ x: Math.round(VEH.cur.st.x), tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, tiles: WELT.state().tiles })")))
            if not shots['j_wegweiser'] and any(math.dist((s['x'], s['y']), (w2['x'], w2['y'])) < 35 for w2 in wegs):
                shots['j_wegweiser'] = True
                shot('j_wegweiser')
            if not shots['h_bruecke'] and math.dist((s['x'], s['y']), (-1880, -305)) < 70 and f['decks']:
                shots['h_bruecke'] = True
                shot('h_bruecke')
            if not shots['f_l1625'] and s['x'] < -2300:
                shots['f_l1625'] = True
                shot('f_l1625')
            if not shots['h_zollbrueck'] and 'Zollbrück' in f['signsNear'] and s['x'] < -5200:
                shots['h_zollbrueck'] = True
                shot('h_zollbrueck')
            stop_t = stop_t + 0.5 if abs(s['kmh']) < 2 else 0
            if fs['done'] or stop_t > 6:
                break
        r = stats()
        s = st()
        spd = json.loads(E("JSON.stringify(window._rec.spd)"))
        main = [v for x, y, v in spd if -4400 < x < -1800]
        med = sorted(main)[len(main) // 2] if main else 0
        print('west', T, 's', json.dumps(r), json.dumps(s), 'speeds', main[::6], 'memory', mem, flush=True)
        ck('speed holds on the L 1625 (median ≥ 70 km/h)', med >= 70, f'median {med} km/h over {len(main)} samples')
        ck('west: on the ground, no flights', r['outNoGround'] == 0 and r['gap'] < 0.3 and r['air'] < 10, json.dumps(r))
        ck('west: few hard bumps', r['n'] > 0 and r['az8'] / max(1, r['n']) < 0.01, f"{r['az8']} of {r['n']} frames, max {r['azMax']} at {r['azAt']}; worst {r['bumps'][:8]}")
        ck('names on the L 1625', any('L 1625' in p for p in places), str(sorted(p for p in places if p and 'L 1625' in p)))
        tiles = [m['tiles'] for m in mem]
        ck('tiles behind are freed (no growth along the drive)', not tiles or max(tiles) < 260, str(tiles))
        if fs['done']:
            pk = DATA['park']['baumschule']
            ck('at the gate of the Baumschule Kammbach (Schulstraße)', math.dist((s['x'], s['y']), (pk[0], pk[1])) < 12, json.dumps(s))
            shot('i_baumschule_tor')
            # through the gate into the nursery's yard (welt/vessra.js: the gate G, u along the street, w into the grounds), slowly
            B = json.loads(E("JSON.stringify(window.VESSRA && VESSRA.baumschule ? VESSRA.baumschule.frame : null)"))
            if B:
                G, u, w = B['G'], B['u'], B['w']
                Y = lambda a, b: [G[0] + u[0] * a + w[0] * b, G[1] + u[1] * a + w[1] * b]
                pts = [[s['x'], s['y']], Y(0, -6), Y(0, -2.5), Y(0, 2), Y(0, 7)]
                E(f"window._fs = VEH.follow({json.dumps(pts)}, 2.2, {{ look: 3.5 }})")
                for _ in range(120):
                    chunk(0.5)
                    if json.loads(E("JSON.stringify(window._fs)"))['done']:
                        break
                E("VEH.auto = () => ({ thr: 0, brk: 1, steer: 0, hand: false })")
                chunk(1.5)
                E("VEH.auto = null")
                chunk(1)
                s = st()
                tgt = Y(0, 7)
                wh = where()
                ck('through the gate into the nursery yard', math.dist((s['x'], s['y']), tgt) < 4 and abs(s['kmh']) < 1 and 'Baumschule' in (wh or ''),
                   f"{math.dist((s['x'], s['y']), tgt):.1f} m from the yard point, {wh!r}")
                ck('the word on arrival', any('Baumschule Kammbach' in m for m in msgs), str(sorted(msgs)))
                shot('i_baumschule_hof')
        else:
            ck('the end of the map: held at the edge of the tiles, with a word', s['x'] < -4300 and abs(s['kmh']) < 3 and any('endet' in m for m in msgs),
               f"x {s['x']}, {s['kmh']} km/h, {sorted(msgs)}")
            shot('g_ende')
    if want('west'):
        # up close: the nearest place-name sign out there, front and back, on foot (then back into the car)
        sg = json.loads(E("JSON.stringify((() => { const v = VEH.cur ? VEH.cur.st : GAME.P; let b = null, bd = 1e9; for (const s of FAHRT.data.signs) { if (s.t !== 'ort') continue; const d = Math.hypot(s.x - v.x, s.y - v.y); if (d < bd) { bd = d; b = s; } } return b && bd < 1500 ? b : null; })())"))
        if sg:
            E("VEH.exit()")
            chunk(0.5)
            a = math.radians(sg['h'])
            for side, nm in ((1, 'l_ortstafel_vorn'), (-1, 'l_ortstafel_hinten')):
                x, y = sg['x'] + math.sin(a) * 7 * side, sg['y'] + math.cos(a) * 7 * side
                yaw = math.degrees(math.atan2(sg['x'] - x, sg['y'] - y))
                E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + 1.6, {yaw}, 4, 50)")
                for _ in range(6):
                    chunk(0.5)
                shot(nm, third=False)
            E("VEH.enter('car')")
            chunk(0.5)
    if want('free'):
        E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null; VEH.place('car', 8.6, 33.4, 2.04); CLOCK.t = 14 * 60 + 30; DN.update(true)")
        for _ in range(4):
            E("for (let i = 0; i < 400; i++) GAME.step(0.025)")
            time.sleep(0.3)
        f = json.loads(E("JSON.stringify(FAHRT.status())"))
        mem = json.loads(E("JSON.stringify({ tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries })"))
        print('home', json.dumps(f), json.dumps(mem), flush=True)
        ck('home again: asleep, tiles, signs and overlay freed', not f['active'] and f['welt']['tiles'] == 0 and not f['signsNear'] and not f['carved'] and f['tex'] == 0, json.dumps(f))
        # all textures of the page: the zones that were visited (Schleusingen, Kloster Veßra) free theirs on their own
        print('textures', tex0, '->', mem['tex'], flush=True)
    if want('gl'):
        ok, rep = lib.check_gl(pg, 16)
        ck('textures per shader ≤ 16, no broken program', ok, json.dumps({k: rep[k] for k in ('programs', 'maxFrag', 'maxVert', 'bad', 'broken')}))
    print('places', sorted(p for p in places if p)[:40])
    print('signs', sorted(signs), 'messages', sorted(msgs))
    ck.errors(errs)
ck.done()
