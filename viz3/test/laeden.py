# feat/laeden: the shops of Schleusingen as what they are (laeden/laeden.js, data laeden/laeden.json from tools/laeden/laeden.py).
# Without a browser: the lists of what the shops replace are the same in the data and in the module, every shop has a main door on one
# of its walls (an OSM entrance within 1 m where OSM has one), its name in the lettering, its car parks bays inside them.
# In the browser: nothing at the start; Orte → Schleusingen (the town and its programs), then each group of shops: built, the ground
# levelled, the main doors where the data has them, the label at a door with the opening hours (open on a weekday morning, closed on
# Sunday), no ETHOS hall and no old-town house left inside a shop, the parked cars in the bays, the walker stops at the glass of the
# door and reaches it, a car drives from the road onto the car park, no new shader programs after the town, draw calls and triangles
# near the Mega Center, no page errors; pictures at eye height from the street and from the car park, from 60 m above, the drive-in.
# The world tiles come from the published site (as viz3/test/welt_dinge_stadt.py). Pictures in out/laeden/.
#   python3 viz3/test/laeden.py 9017 [sections]      sections: data,nord,mitte,rewe,nacht (default all)
import sys, os, json, time, math, re, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'data,nord,mitte,rewe,nacht').split(','))
ck = lib.Checks('laeden')
OUT = lib.out('laeden')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
DATA = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'laeden', 'dist', 'laeden', 'laeden.json')))
JS = open(os.path.join(lib.ROOT, 'viz3', 'src', 'laeden', 'laeden.js')).read()
SHOP = {s['id']: s for s in DATA['shops']}
CENTRES = {'nord': (-885, 2060), 'mitte': (-1075, 1570), 'rewe': (-1765, 915)}
GROUP_OF = {'obi': 'nord', 'mega': 'nord', 'edeka': 'nord', 'getraenke': 'nord', 'zeile40': 'nord', 'shell': 'nord', 'mcd': 'mitte', 'lidl': 'mitte', 'rewe': 'rewe'}
# from the street (x, y, yaw): eye height on the pavement of the road the shop faces
STREET = {'obi': (-1001.0, 1846.0, 72), 'mega': (-986.0, 1990.0, 78), 'edeka': (-938.0, 2172.0, 105), 'shell': (-934.0, 2292.0, 92),
          'mcd': (-1066.0, 1738.0, 228), 'lidl': (-1096.0, 1418.0, 48), 'rewe': (-1758.0, 872.0, 340)}
# the feet of what stands on posts (LAEDEN.detail): the ground drawn under each (WELT.heightAt), under a pylon's plinth corners too
FEET = ("(([cx, cy, R, gid]) => { const D = LAEDEN.detail(gid), out = []; for (const f of D.feet) { if (Math.hypot(f.x - cx, f.y - cy) > R) continue; "
        "const h = WELT.heightAt(f.x, f.y); out.push([f.what, +f.x.toFixed(1), +f.y.toFixed(1), +f.z.toFixed(2), h === undefined ? null : +h.toFixed(2), "
        "f.z0 === undefined ? null : +f.z0.toFixed(2), (f.corners || []).map(([x, y]) => { const q = WELT.heightAt(x, y); return q === undefined ? null : +q.toFixed(2); })]); } return out; })")
# the walls along the pads' edges: before a cut's wall the pad's level (no ramp leaning on it), on its cover the upper ground; on a
# fill's cover the pad's level, below its wall the low ground
WALLS = ("(gid) => { const D = LAEDEN.detail(gid), bad = []; let n = 0; for (const w of D.walls) for (const [x, y, ex, ey, s, out, nx, ny] of w.pts.slice(2, -2)) { n++; "
         "if (w.kind === 'cut') { const lo = KERN.ground(x - ex * 0.5, y - ey * 0.5); if (!(Math.abs(lo - s) <= 0.35)) bad.push(['before the wall', x, y, s, lo]); "
         "for (const k of [1.6, 2.5, 4.0, 5.5]) { const qx = x + nx * k, qy = y + ny * k, c = KERN.ground(qx, qy), t = WELT.heightAt(qx, qy); "
         "if (!(c >= t - 0.02) || (k === 2.5 && !(c >= s + 0.3))) bad.push(['cover', k, x, y, s, c, t]); } } "
         "else { const lid = KERN.ground(x - ex, y - ey), low = WELT.heightAt(x + ex * 4.4, y + ey * 4.4); "
         "if (!(Math.abs(lid - s) <= 0.3)) bad.push(['cover', x, y, s, lid]); if (!(low <= s - 1.0)) bad.push(['below', x, y, s, low]); } } "
         "return { walls: D.walls.map(w => [w.kind, w.drop, w.pts.length * 2]), n, bad: bad.slice(0, 6) }; }")
# the roofs stay on their buildings: every vertex of the roofs' mesh inside a footprint of the group's shops (the cap's lip 4 cm out)
ROOFS = ("(gid) => { const g = LAEDEN.groups.find(q => q.id === gid), m = g.meshes.find(q => q.name.endsWith('dächer')); if (!m) return null; "
         "const P = m.geometry.attributes.position.array, polys = []; for (const sh of g.shops) for (const p of sh.parts.concat(sh.annex)) polys.push(p.f); "
         "const inP = (f, x, y) => { let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) { const xi = f[p], yi = f[p + 1], xj = f[q], yj = f[q + 1]; "
         "if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }; "
         "const eD = (f, x, y) => { let d = 1e9; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) { const ax = f[q], ay = f[q + 1], dx = f[p] - ax, dy = f[p + 1] - ay, "
         "l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)); d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return d; }; "
         "let worst = 0, at = null; for (let i = 0; i < P.length; i += 3) { const x = P[i], y = -P[i + 2]; let b = 1e9; for (const f of polys) { if (inP(f, x, y)) { b = 0; break; } b = Math.min(b, eD(f, x, y)); } "
         "if (b > worst) { worst = b; at = [+x.toFixed(1), +y.toFixed(1)]; } } return { n: P.length / 3, worst: +worst.toFixed(3), at }; }")


def ring(f):
    return [(f[i], f[i + 1]) for i in range(0, len(f), 2)]


def seg_dist(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy or 1
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
    return math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t)


def wall_dist(sh, p):
    best = 1e9
    for part in sh['parts'] + sh['annex']:
        r = ring(part['f'])
        for i in range(len(r)):
            best = min(best, seg_dist(p, r[i], r[(i + 1) % len(r)]))
    return best


def inside(f, x, y):
    c = False
    r = ring(f)
    for i in range(len(r)):
        (xi, yi), (xj, yj) = r[i], r[i - 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
    return c


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def fetch_tiles(centres, half=420):
    """the world tiles around the groups (levels 10-12) into dist/welt-test/ (as viz3/test/welt_dinge_stadt.py), with the set without roofs"""
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
    except Exception as e:
        print('note: no world tiles', e, flush=True)
        return
    lv = meta['tiling']['levels']
    jobs = set()
    for cx, cy in centres:
        cs = [utm(cx + sx * half, cy + sy * half) for sx in (-1, 1) for sy in (-1, 1)]
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
    get('v2/index.json')
    try:
        v2 = set(json.load(open(os.path.join(DIST, 'v2', 'index.json')))['tiles'])
    except Exception:
        v2 = set()
    for j in list(jobs):
        if j.startswith('i/') and j[2:-5] in v2:
            jobs.add('v2/' + j)
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'welt tiles: {len(jobs)} files, {n / 1e6:.1f} MB new in {time.time() - t0:.0f} s', flush=True)


# ---------------------------------------------------------------- without a browser ------------------------------------------------
if 'data' in want:
    js_ethos = set(re.findall(r"'(DEG_DETHL\w+)'", JS.split('const SKIP_ETHOS')[1].split(']);')[0]))
    ck('the ETHOS buildings the shops replace: the same list in the data and in the module', js_ethos == set(DATA['skip']['ethos']),
       f"{len(js_ethos)} in laeden.js, {len(DATA['skip']['ethos'])} in laeden.json; differ: {sorted(js_ethos ^ set(DATA['skip']['ethos']))[:6]}")
    js_stadt = [[m[1], m[3]] for m in re.findall(r"\[\s*([\"'])(.+?)\1,\s*([\"'])(.+?)\3\s*\]", JS.split('const SKIP_STADT')[1].split('];')[0])]
    ck('the old-town houses the shops replace (McDonald\'s, Lidl): the same in the data and in the module',
       sorted(tuple(x) for x in js_stadt) == sorted(tuple(x) for x in DATA['skip']['stadt']), f'{js_stadt} vs {DATA["skip"]["stadt"]}')
    bad = []
    for sh in DATA['shops']:
        mains = [d for d in sh['doors'] if d['k'] == 'main']
        if not mains:
            bad.append(sh['id'] + ': no main door')
        for d in sh['doors']:
            wd = wall_dist(sh, (d['x'], d['y']))
            if wd > 0.6:
                bad.append(f"{sh['id']}: door {d['who'] or d['k']} {wd:.1f} m off the walls")
    ck('every shop has a main door, every door lies on one of its walls', not bad, '; '.join(bad[:5]))
    # the doors OSM knows: ours within 1 m of them (McDonald's, REWE)
    osm_doors = {'mcd': (-1088.2, 1712.7), 'rewe': (-1772.6, 912.2)}
    dd = {k: min(math.dist(p, (d['x'], d['y'])) for d in SHOP[k]['doors'] if d['k'] == 'main') for k, p in osm_doors.items()}
    ck('where OSM has the entrance, the main door is there (≤ 1 m)', all(v <= 1.0 for v in dd.values()), str({k: round(v, 2) for k, v in dd.items()}))
    signs = {sh['id']: [s['t'] for s in sh['signs']] for sh in DATA['shops']}
    miss = [sh['id'] for sh in DATA['shops'] if not any(sh['name'].lower().replace("'", '') in t.lower().replace("'", '') or t.lower() in sh['name'].lower() for t in signs[sh['id']]) and sh['id'] not in ('zeile40',)]
    ck('every shop has its name in the lettering', not miss, f'missing: {miss}; signs: {signs}')
    badb, nb = [], 0
    for L in DATA['lots']:
        for bx, by, az in L['bays']:
            nb += 1
            a = math.radians(az)
            vx, vy, ux, uy = math.sin(a), math.cos(a), math.cos(a), -math.sin(a)
            for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                if not inside(L['f'], bx + ux * su * 1.2 + vx * sv * 2.4, by + uy * su * 1.2 + vy * sv * 2.4):
                    badb.append(L['id'])
                    break
    ck('the bays (2.5 × 5 m) lie inside their car parks', nb > 300 and not badb, f'{nb} bays in {len(DATA["lots"])} car parks; outside: {badb[:5]}')
    lic = DATA.get('src', '')
    ck('the data names its sources (OSM ODbL, ETHOS ODbL, DOP dl-de/by-2-0)', 'ODbL' in lic and 'OpenStreetMap' in lic and 'ETHOS' in lic and 'GDI-Th' in lic, lic[:120])

# ---------------------------------------------------------------- in the browser -----------------------------------------------------
GROUPS = [g for g in ('nord', 'mitte', 'rewe') if g in want]
if GROUPS or 'nacht' in want:
    fetch_tiles([(-1084.7, 1241.9)] + [CENTRES[g] for g in (GROUPS or ['mitte'])])
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1920, 1080, errs, tier='hoch')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))

        def steps(secs, dt=0.25):
            E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")

        def pic(name):
            try:
                lib.shot(pg, OUT, name)
            except Exception as e:
                print('shot failed', name, e, flush=True)

        def eye(x, y, yaw, pitch=2.0, fov=62, h=1.7):
            E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov})")
            E("GAME.step(0.05)")
            E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov})")
            E("GAME.shot()")

        def above(x, y, az=200, el=58, r=72):
            E(f"GAME.orbit({az}, {el}, {r}, [{x}, {y}, KERN.ground({x}, {y}) + 1])")
            E("GAME.shot()")

        def settle(limit=150):
            t0 = time.time()
            st = None
            while time.time() - t0 < limit:
                E("GAME.step(0.25)")
                st = J("({ w: WELT.state().loading, pq: WELT.padQueue(), busy: GEB.Z.busy, jobs: GEB.jobs(), l: LAEDEN.status().groups.map(g => g.state).join(','), d: DINGE.areaState().schleusingen || null })")
                if st['w'] == 0 and st['pq'] == 0 and not st['busy'] and st['jobs'] == 0 and 'pads' not in st['l'] and time.time() - t0 > 6:
                    break
                time.sleep(0.25)
            return st

        E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
        E("GAME.shot()")
        st0 = J("LAEDEN.status()")
        ck('the shops are on and nothing is loaded at the start (the garden is 1.9 km away)', st0['on'] and st0['state'] == 'idle' and all(g.get('state') in ('idle', None) for g in st0['groups']), json.dumps(st0)[:300])
        # a weekday morning: Tuesday 10:30
        tue = J("(() => { for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === 2) return d; return 1; })()")
        E(f"CLOCK.t = {tue * 1440 + 10 * 60 + 30}; DN.active && DN.update(true)")
        lib.settle_light(pg)
        # the town first: its programs (the signs' atlas …) are there before the shops
        E("document.querySelector('#menu [data-spot=schleusingen]').click()")
        t0 = time.time()
        while time.time() - t0 < 200:
            E("GAME.step(0.25)")
            if J("SCHL.status().state") in ('ready', 'error'):
                break
            time.sleep(0.3)
        settle(60)
        K1 = set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
        names = J("SCHL.bld.map(b => b.n || '').filter(n => n)")
        ck('the old town no longer builds McDonald\'s and Lidl as houses', "McDonald's" not in names and 'Lidl' not in names, f'{len(names)} named houses')
        tris_near = None
        for gid in GROUPS:
            c = CENTRES[gid]
            shops = [s for s in DATA['shops'] if GROUP_OF.get(s['id']) == gid]
            # stand in the group's car park and wait for everything near
            first = shops[0]
            md = next(d for d in first['doors'] if d['k'] == 'main')
            sx, sy = md['x'] + md['nx'] * 20, md['y'] + md['ny'] * 20
            E(f"GAME.setView3(false, true); GAME.view({sx}, {sy}, KERN.ground({sx}, {sy}) + 1.7, 0, 0)")
            st = settle()
            E("DINGE.settle()")
            steps(8)
            settle(40)
            gs = next(g for g in J("LAEDEN.status().groups") if g['id'] == gid)
            ck(f'{gid}: the group stands (shops, signs, door labels)', gs['state'] == 'built' and gs['meshes'] >= 8 and gs['signs'] >= len(shops) and gs['acts'] >= 1,
               json.dumps(gs)[:400] + ' ' + json.dumps(st))
            # the ground levelled: under each main door the walker's ground is the levelled one, the building's floor there
            off = []
            for sh in shops:
                for d in sh['doors']:
                    if d['k'] != 'main':
                        continue
                    x, y = d['x'] + d['nx'] * 1.5, d['y'] + d['ny'] * 1.5
                    z = J(f"[KERN.ground({x}, {y}), LAEDEN.groundAt({x}, {y})]")
                    if z[1] is None or abs(z[0] - z[1]) > 0.35:
                        off.append([sh['id'], d['who'], z])
            ck(f'{gid}: before every main door the ground is the levelled one (the walker stands at the door\'s sill)', not off, str(off[:4]))
            # no ETHOS hall left inside a shop, none of the replaced ones built
            left = J("""(() => { const out = []; const shops = LAEDEN.data.shops; const inP = (f, x, y) => { let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) { const xi = f[p], yi = f[p + 1], xj = f[q], yj = f[q + 1]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
                for (const c of GEB.Z.cells.values()) { if (!c.meshes.length || !c.data) continue; for (const b of c.data.b) { if (typeof b.id === 'string') continue; for (const sh of shops) for (const p of sh.parts.concat(sh.annex)) if (inP(p.f, b.cx, b.cy)) out.push([sh.id, b.id, +b.cx.toFixed(1), +b.cy.toFixed(1)]); } } return out; })()""")
            ck(f'{gid}: no ETHOS hall left inside a shop', not left, str(left[:5]))
            # the parked cars in the car parks stand in bays
            cars = J(f"""(() => {{ const L = LAEDEN.data.lots.filter(l => {json.dumps([s['id'] for s in shops])}.includes(l.shop)); const inP = (f, x, y) => {{ let c = false; for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) {{ const xi = f[p], yi = f[p + 1], xj = f[q], yj = f[q + 1]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; }} return c; }};
                let n = 0, inBay = 0, shown = 0; for (const p of DINGE.places) {{ if (p.laeden === 'weg') continue; const l = L.find(q => inP(q.f, p.x, p.y)); if (!l) continue; n++; if (p.im && p.on && !p.hide && !p.door) shown++; if (l.bays.some(b => Math.hypot(b[0] - p.x, b[1] - p.y) < 0.05)) inBay++; }} return {{ n, inBay, shown, moved: LAEDEN.moved, dropped: LAEDEN.dropped }}; }})()""")
            ck(f'{gid}: the parked cars of the car parks stand in the bays (a weekday morning: some are there)', cars['n'] > 0 and cars['inBay'] == cars['n'] and cars['shown'] > 0, json.dumps(cars))
            # the signs: every text inside its sign with a margin (the letters measured, the font shrunk to fit), no canopy before a name band
            D = J(f"LAEDEN.detail('{gid}')")
            badt = []
            for sg in D['signs']:
                pw, ph, bx = sg['pw'], sg['ph'], sg.get('boxes') or []
                if not bx:
                    badt.append(f"{sg['t'][:24]}: no letters")
                for b in bx:
                    if b[0] < 0.03 * pw or b[2] > 0.97 * pw or b[1] < 0.04 * ph or b[3] > 0.96 * ph:
                        badt.append(f"{sg['t'][:24]}: {b} in {pw}×{ph}")
                for b1, b2 in zip(bx, bx[1:]):
                    if b2[1] < b1[3]:
                        badt.append(f"{sg['t'][:24]}: its lines overlap")
            ck(f'{gid}: every text stays inside its sign with a margin (the letters measured, the font shrunk to fit)', D['signs'] and not badt,
               f"{len(D['signs'])} signs; {badt[:4]}")
            badc = []
            for sg in D['signs']:
                if sg['k'] != 'band':
                    continue
                for c in D['canopies']:
                    if sg['nx'] * c['nx'] + sg['ny'] * c['ny'] < 0.9:
                        continue
                    along = abs((sg['x'] - c['x']) * -c['ny'] + (sg['y'] - c['y']) * c['nx'])
                    off = (sg['x'] - c['x']) * c['nx'] + (sg['y'] - c['y']) * c['ny']
                    if along < sg['w'] / 2 + c['w'] / 2 and -c['d'] / 2 - 0.6 < off < 0.6 and sg['z'] < c['z1'] + 0.1:
                        badc.append(f"{sg['t']}: the band from {sg['z']:.2f} m, the canopy up to {c['z1']:.2f} m")
            ck(f'{gid}: no canopy hides a name band (each band over the canopy in front of it)', not badc, f"{len(D['canopies'])} canopies; {badc[:3]}")
            # the roofs stay on their buildings (no attica running past an acute corner)
            rf = pg.evaluate(ROOFS, gid)
            ck(f'{gid}: the roofs stay on their buildings (every vertex of the roofs inside the walls, the cap\'s lip 4 cm out)', rf and rf['worst'] <= 0.08, json.dumps(rf))

            def feet_bad(rows):
                bad = []
                for what, fx_, fy_, z, h, z0, cs in rows:
                    if h is None:
                        continue
                    if abs(z - h) > 0.3:
                        bad.append(f'{what} at {fx_}, {fy_}: foot {z}, ground {h}')
                    for hc in cs:
                        if hc is not None and z0 is not None and hc < z0 - 0.02:
                            bad.append(f'{what} at {fx_}, {fy_}: plinth from {z0} over the ground {hc}')
                return bad
            rows = pg.evaluate(FEET, [sx, sy, 140, gid])
            fb = feet_bad(rows)
            ck(f'{gid}: lamps, columns and posts near the car park stand on the ground (each foot within 0.3 m of the ground drawn there)', rows and not fb,
               f"{len(rows)} feet within 140 m; {fb[:4]}")
            # every pylon, seen from near by (the finest tiles under it): its foot on the ground drawn there, the plinth down to it all round
            pyl = [p for p in DATA['props'] if GROUP_OF.get(p['shop']) == gid]
            pb, pn = [], 0
            for p in pyl:
                E(f"GAME.setView3(false, true); GAME.view({p['x'] + 14}, {p['y'] + 14}, KERN.ground({p['x'] + 14}, {p['y'] + 14}) + 1.7, 225, 0)")
                settle(40)
                rows = pg.evaluate(FEET, [p['x'], p['y'], 0.5, gid])
                pn += len(rows)
                pb += feet_bad(rows)
            ck(f'{gid}: every pylon stands on the ground (its foot within 0.3 m of the ground drawn under it, the plinth down to the ground at every corner)',
               pn == len(pyl) and not pb, f'{pn} of {len(pyl)} pylons; {pb[:3]}')
            # the retaining walls (where the ground outside a pad lies more than 1.5 m above or below it), seen from near by
            if D['walls']:
                w0 = max(D['walls'], key=lambda w: len(w['pts']))
                x, y, ex, ey, zs, out = w0['pts'][len(w0['pts']) // 2]
                vx, vy = (x - ex * 12, y - ey * 12) if w0['kind'] == 'cut' else (x + ex * 14, y + ey * 14)
                yw = (math.degrees(math.atan2(ex, ey)) + (0 if w0['kind'] == 'cut' else 180)) % 360
                E(f"GAME.setView3(false, true); GAME.view({vx}, {vy}, KERN.ground({vx}, {vy}) + 1.7, {yw}, 0)")
                settle(60)
            wl = pg.evaluate(WALLS, gid)
            ck(f'{gid}: retaining walls where the ground beside a pad lies more than 1.5 m above or below it: the pad flat up to the wall, its cover on the upper level',
               not wl['bad'], json.dumps(wl))
            if gid == 'nord' and D['walls']:
                eye(vx, vy, yw, 4)
                pic('mega_lieferhof')
                above(x, y, (yw + 180) % 360, 35, 55)
                pic('mega_lieferhof_oben')
            # each shop: the label at its main door, its building from the street and from the car park
            for sh in shops:
                md = next(d for d in sh['doors'] if d['k'] == 'main')
                fx, fy = md['x'] + md['nx'] * 2.0, md['y'] + md['ny'] * 2.0
                yaw = (math.degrees(math.atan2(-md['nx'], -md['ny'])) + 360) % 360
                E(f"GAME.setView3(false, true); GAME.view({fx}, {fy}, KERN.ground({fx}, {fy}) + 1.7, {yaw}, 0)")
                r = J("GAME.step(0.3)")
                lbl = r.get('best') or ''
                ok_lbl = (md['who'] or sh['name']) in lbl
                if sh.get('oh') or md.get('oh'):
                    ok_lbl = ok_lbl and ('geöffnet' in lbl or 'geschlossen' in lbl)
                ck(f"{sh['id']}: the label at the main door names it" + (' with its hours' if sh.get('oh') else ''), ok_lbl, lbl)
                # walk into the door: stopped at the glass, at the door
                sx, sy = md['x'] + md['nx'] * 7.0, md['y'] + md['ny'] * 7.0
                E(f"GAME.view({sx}, {sy}, KERN.ground({sx}, {sy}) + 1.7, {yaw}, 0)")
                E("GAME.step(0.1)")
                w = J("GAME.step(6, 1, 0, 0, 1)")
                dw = math.hypot(w['x'] - md['x'], w['y'] - md['y'])
                ins = any(inside(p['f'], w['x'], w['y']) for p in sh['parts'] + sh['annex'])
                ck(f"{sh['id']}: walking at the main door one reaches it and stops at the glass", dw < 1.6 and not ins, f"walker at {w['x']}, {w['y']}, {dw:.2f} m from the door, inside: {ins}")
                if sh['id'] in STREET:
                    x, y, yw = STREET[sh['id']]
                    eye(x, y, yw, 3)
                    pic(f"{sh['id']}_strasse")
                lx, ly = md['x'] + md['nx'] * 24, md['y'] + md['ny'] * 24
                eye(lx, ly, yaw, 4)
                pic(f"{sh['id']}_parkplatz")
                cx_, cy_ = sh['parts'][0]['f'][0], sh['parts'][0]['f'][1]
                ccx = sum(sh['parts'][0]['f'][0::2]) / (len(sh['parts'][0]['f']) // 2)
                ccy = sum(sh['parts'][0]['f'][1::2]) / (len(sh['parts'][0]['f']) // 2)
                above(ccx, ccy, 200, 60, 75 if sh['id'] not in ('mega', 'obi') else 140)
                pic(f"{sh['id']}_oben")
            if gid == 'nord':
                # draw calls and triangles with the Mega Center in view (one frame), and of the shops' own meshes
                above(-905, 1990, 250, 25, 160)
                fr = J("(() => { const i = GAME.R.info; i.autoReset = false; i.reset(); GAME.shot(); const r = { calls: i.render.calls, tris: i.render.triangles }; i.autoReset = true; return r; })()")
                tris_near = fr
                ck('nord: few draw calls of the shops (≤ 24 meshes) and a frame with the Mega Center in view within bounds', gs['meshes'] <= 24 and fr['calls'] < 3000,
                   f"shops' meshes {gs['meshes']} ({gs['tris']} triangles, built in {gs['ms']} ms); the frame: {fr['calls']} draw calls, {fr['tris']} triangles")
                pic('mega_center_west')
            if gid == 'mitte':
                # the drive-in: from the order post along the lane, and from above
                D = SHOP['mcd']['drive']
                po = D['post']
                lp = ring(D['p'])
                yaw = (math.degrees(math.atan2(lp[3][0] - lp[2][0], lp[3][1] - lp[2][1])) + 360) % 360
                eye(lp[1][0], lp[1][1], (math.degrees(math.atan2(lp[2][0] - lp[1][0], lp[2][1] - lp[1][1])) + 360) % 360, 2, 68, 1.25)
                pic('mcd_drivein_einfahrt')
                yw = (math.degrees(math.atan2(lp[5][0] - lp[4][0], lp[5][1] - lp[4][1])) + 360) % 360
                eye(lp[4][0] + (lp[5][0] - lp[4][0]) * 0.12, lp[4][1] + (lp[5][1] - lp[4][1]) * 0.12, (yw - 25) % 360, 2, 68, 1.25)
                pic('mcd_drivein_fenster')
                above(-1100, 1712, 160, 62, 70)
                pic('mcd_drivein_oben')
        own = J("LAEDEN.groups.flatMap(g => g.meshes || []).map(m => { const pr = GAME.R.properties.get(m.material); return [m.name, pr && pr.currentProgram ? pr.currentProgram.cacheKey : null]; })")
        ownNew = [[nm, (k or '')[-60:]] for nm, k in own if k and k not in K1]
        ck('the shops\' meshes draw with programs that were there before (the town\'s, the village\'s, the parked cars\')', own and not ownNew, f'{len(own)} meshes; new: {ownNew[:6]}')
        newp = [[nm, k[-70:]] for nm, k in J("GAME.R.info.programs.map(p => [p.name, p.cacheKey])") if k not in K1]
        print('note: programs new after the town (all features):', newp, flush=True)
        # a car from the road onto each group's car park (after the programs' check: the car's inside compiles its own)
        for gid in GROUPS:
            shops = [x for x in DATA['shops'] if GROUP_OF.get(x['id']) == gid]
            md = next(d for d in shops[0]['doors'] if d['k'] == 'main')
            sx, sy = md['x'] + md['nx'] * 20, md['y'] + md['ny'] * 20
            E(f"GAME.setView3(false, true); GAME.view({sx}, {sy}, KERN.ground({sx}, {sy}) + 1.7, 0, 0)")
            settle(60)
            L0 = next(l for l in DATA['lots'] if l['shop'] == shops[0]['id'] and l['aisles'])
            # along the aisle as OSM draws it (its first 40 m; a loop round the car park is longer than the drive)
            a = ring(L0['aisles'][0])
            path, run_ = [list(a[0])], 0.0
            for q0, q1 in zip(a, a[1:]):
                seg = math.dist(q0, q1)
                if run_ + seg >= 40:
                    t = (40 - run_) / seg
                    path.append([q0[0] + (q1[0] - q0[0]) * t, q0[1] + (q1[1] - q0[1]) * t])
                    break
                path.append(list(q1))
                run_ += seg
            if len(path) == 2:
                path.insert(1, [(path[0][0] + path[1][0]) / 2, (path[0][1] + path[1][1]) / 2])
            p0, p1 = path[0], path[-1]
            E(f"VEH.place('car', {p0[0]}, {p0[1]}, Math.atan2({path[1][0] - p0[0]}, {path[1][1] - p0[1]})); VEH.enter('car'); GAME.setView3(true)")
            E(f"window._lf = VEH.follow({json.dumps(path)}, 4)")
            steps(14, 0.05)
            v = J("({ x: VEH.cur.st.x, y: VEH.cur.st.y })")
            dend = math.hypot(v['x'] - p1[0], v['y'] - p1[1])
            lot_in = inside(L0['f'], v['x'], v['y'])
            ck(f'{gid}: a car drives along the aisle onto the car park ({L0["id"]})', dend < 6 or lot_in, f"car at {v['x']:.1f}, {v['y']:.1f}, {dend:.1f} m from the aisle's end, in the car park: {lot_in}")
            E("VEH.follow([[0, 0], [0, 1]]); VEH.auto = null; VEH.exit()")
            steps(1)
        if 'nacht' in want:
            # Sunday 22:00: the lamps of the car parks lit, the windows of a closed shop dark, McDonald's open
            sun_ = J("(() => { for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === 0) return d; return 6; })()")
            E(f"CLOCK.t = {sun_ * 1440 + 22 * 60}; DN.active && DN.update(true)")
            lib.settle_light(pg)
            steps(3)
            gid = GROUPS[-1] if GROUPS else 'mitte'
            n = J("LAEDEN.status()")
            lamps = J("(VPROPS.lamps || []).filter(l => l.str && Math.hypot(l.x + 1075, l.y - 1570) < 600).length")
            gl = J("LAEDEN.groups.flatMap(g => (g.glass || []).map(q => [q.id, +q.mat.emissiveIntensity.toFixed(2)]))")
            glm = dict((a, b) for a, b in gl)
            ck('night: lamps on the car parks, McDonald\'s windows lit (open till midnight, warm and soft), Lidl\'s dimmed (Sunday)',
               lamps > 0 and 0.3 <= glm.get('mcd', 0) <= 0.8 and glm.get('mcd', 0) >= 3 * glm.get('lidl', 1), f'lamps near {lamps}; glass {gl}')
            if 'mitte' in GROUPS:
                eye(*STREET['mcd'], 3)
                pic('mcd_nacht')
                md = next(d for d in SHOP['mcd']['doors'] if d['k'] == 'main')
                yaw = (math.degrees(math.atan2(-md['nx'], -md['ny'])) + 360) % 360
                eye(md['x'] + md['nx'] * 11, md['y'] + md['ny'] * 11, yaw, 4)
                pic('mcd_nacht_fenster')
            if 'nord' in GROUPS:
                # the station at night: the lights under its canopy (built again: the group was dropped on the way south)
                x, y, yw = STREET['shell']
                eye(x, y, yw, 3)
                settle(120)
                steps(4)
                eye(x, y, yw, 3)
                pic('shell_nacht')
        ck.errors(errs)
ck.done()
