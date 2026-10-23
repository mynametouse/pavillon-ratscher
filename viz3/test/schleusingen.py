# Schleusingen (welt/welt.js, welt/schleusingen.js): nothing of it at the start; Orte → „Schleusingen“ leads to the Markt, the world tiles
# and the old town load there; ground under the feet, walls stop the walker, the Rathaus door leads into the hall, street names; pictures of
# the Markt, the Rathaus, St. Johannis, the Bertholdsburg, the hall, from above and at night; going home frees it again.
# The world tiles come from the published site (welt-test/) and are copied into viz3/dist/welt-test/ first (the test server serves dist).
# Sections (optional second argument, comma-separated): start,load,walk,names,shots,night,free
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

port = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
want = lambda k: not ONLY or k in ONLY
ck = lib.Checks('schleusingen')
OUT = lib.out('schleusingen')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
MARKT = (-1084.7, 1241.9)


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


fetch_tiles()
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs, tier='mittel')
    lib.boot(pg, port)
    E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    st0 = json.loads(E("""JSON.stringify({ s: SCHL.status(), res: performance.getEntriesByType('resource').filter(e => /welt-test|schleusingen/.test(e.name)).length,
        progs: (GAME.R.info.programs || []).length, tex: GAME.R.info.memory.textures, geo: GAME.R.info.memory.geometries, kern: KERN.providers() })"""))
    print('start', json.dumps(st0), flush=True)
    if want('start'):
        ck('nothing of Schleusingen at the start', st0['s']['state'] == 'idle' and st0['res'] == 0 and st0['s']['welt']['tiles'] == 0, json.dumps(st0['s']))
        ck('KERN knows the providers (terrain, ground, free, place)', st0['kern'].get('free', 0) >= 2 and st0['kern'].get('terrain', 0) >= 2, json.dumps(st0['kern']))
        ck('menu: Orte → Schleusingen', E("!!document.querySelector('#menu [data-spot=schleusingen]')"))

    def wait_ready(limit=180):
        t0 = time.time()
        while time.time() - t0 < limit:
            E("GAME.step(0.25)")
            s = json.loads(E("JSON.stringify(SCHL.status())"))
            if s['state'] in ('ready', 'error'):
                return s, time.time() - t0
            time.sleep(0.4)
        return json.loads(E("JSON.stringify(SCHL.status())")), time.time() - t0

    # Orte → Schleusingen (the menu chip, as by hand)
    E("document.querySelector('#menu [data-spot=schleusingen]').click()")
    s, dt = wait_ready()
    for _ in range(40):   # the tiles near the camera
        E("GAME.step(0.25)")
        if json.loads(E("JSON.stringify(WELT.state())"))['loading'] == 0:
            break
        time.sleep(0.3)
    E("GAME.step(1)")
    s = json.loads(E("JSON.stringify(SCHL.status())"))
    print('loaded', json.dumps(s), flush=True)
    p = json.loads(E("JSON.stringify({ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, g: KERN.ground(GAME.P.x, GAME.P.y), w: WELT.heightAt(GAME.P.x, GAME.P.y) ?? null, where: (document.getElementById('where') || {}).textContent || '' })"))
    if want('load'):
        ck('Orte → Schleusingen: on the Markt', math.hypot(p['x'] + 1100.5, p['y'] - 1214.5) < 2, json.dumps(p, ensure_ascii=False))
        ck('the old town is built there', s['state'] == 'ready' and s['buildings'] > 700 and s['segs'] > 3000, f"{s['buildings']} buildings, {s['segs']} wall segments, {s['ms']} ms build, {s['loadMs']} ms data + {round(dt)} s")
        ck('world tiles around the camera', s['welt']['visible'] >= 12 and s['welt']['err'] == 0 and s['welt']['lowered'] > 0, json.dumps(s['welt']))
        ck('ground under the feet (tiles)', p['w'] is not None and abs(p['feet'] - p['g']) < 0.05 and abs(p['g'] - p['w']) < 0.01, json.dumps(p))
    if want('walk'):
        # walk straight at a house wall north of the Markt: the wall stops the walker
        r = json.loads(E("""JSON.stringify((() => { const b = SCHL.bld.find(b => !b.lm && b.F.length > 3 && Math.hypot(b.cx - SCHL.MARKT[0], b.cy - SCHL.MARKT[1]) < 60);
            const f = b.F.find(f => !(f[8] & 1)) || b.F[0], mx = (f[0] + f[2]) / 2, my = (f[1] + f[3]) / 2, L = Math.hypot(f[2] - f[0], f[3] - f[1]), nx = (f[3] - f[1]) / L, ny = -(f[2] - f[0]) / L;
            const x = mx + nx * 3, y = my + ny * 3, yaw = Math.atan2(-nx, -ny) * 180 / Math.PI;
            GAME.view(x, y, SCHL.gz(x, y) + 1.62, yaw, 0, 60); GAME.step(0.5); GAME.step(4, 1);
            const d = (GAME.P.x - mx) * nx + (GAME.P.y - my) * ny; return { d, x: GAME.P.x, y: GAME.P.y }; })())"""))
        ck('a house wall stops the walker', 0.1 < r['d'] < 0.6, json.dumps(r))
        # into the Rathaus: from the Markt side through the door into the hall
        r = json.loads(E("""JSON.stringify((() => { const R = SCHL.rathaus, d = R.door, x = d[0] + R.nx * 4, y = d[1] + R.ny * 4, yaw = Math.atan2(-R.nx, -R.ny) * 180 / Math.PI;
            GAME.view(x, y, SCHL.gz(x, y) + 1.62, yaw, 0, 60); GAME.step(0.5); GAME.step(4, 1);
            return { inHall: SCHL.inHall(GAME.P.x, GAME.P.y), feet: GAME.P.feet, floor: R.floor, where: SCHL.place(GAME.P.x, GAME.P.y), x: GAME.P.x, y: GAME.P.y }; })())"""))
        ck('through the Rathaus door into the hall', r['inHall'] and abs(r['feet'] - r['floor']) < 0.05, json.dumps(r, ensure_ascii=False))
        ck('the hall has a name', 'Rathaus' in (r['where'] or ''), r['where'] or '')
        r2 = json.loads(E("""JSON.stringify((() => { GAME.step(6, 1); return { inHall: SCHL.inHall(GAME.P.x, GAME.P.y), x: GAME.P.x, y: GAME.P.y }; })())"""))
        ck('the back wall of the hall stops the walker', r2['inHall'], json.dumps(r2))
        # the named spots of the council chamber (for the Ortsvorsteher task) and sitting down on a visitor's chair
        sp = json.loads(E("""JSON.stringify((() => { const s = SCHL.rathaus.spots; return { vorsitz: !!s.vorsitz, seats: s.seats.length, visitors: s.visitors.length,
            counter: !!s.counter, clerk: !!s.clerk, pult: !!s.rednerpult, inside: [s.vorsitz, s.counter, s.rednerpult].every(q => SCHL.inHall(q.x, q.y)) }; })())"""))
        ck('council chamber: chair, seats, visitors, counter, clerk, speaker – all inside the hall', sp['vorsitz'] and sp['seats'] >= 9 and sp['visitors'] >= 10 and sp['counter'] and sp['clerk'] and sp['pult'] and sp['inside'], json.dumps(sp))
        si = json.loads(E("""JSON.stringify((() => { const v = SCHL.rathaus.spots.visitors[0]; GAME.view(v.x + 0.5, v.y, v.z + 1.62, 0, 0, 60); const st = GAME.step(0.5);
            const label = st.best; let sat = false; if (label === 'Hinsetzen') { PLAY.best.run(); GAME.step(1); sat = !!PLAY.seat; PLAY.stand(true); GAME.step(0.5); } return { label, sat }; })())"""))
        ck('sitting down on a chair in the hall', si['label'] == 'Hinsetzen' and si['sat'], json.dumps(si, ensure_ascii=False))
    if want('names'):
        n = json.loads(E("JSON.stringify([[-1085, 1230], [-1180, 1190], [-1290, 1185], [-1250, 1203]].map(([x, y]) => SCHL.place(x, y)))"))
        ck('place names: Markt, a street, the castle, the church', n[0].startswith('Markt') and 'Schleusingen' in n[1] and 'Bertholdsburg' in n[2] and 'Johannis' in n[3], json.dumps(n, ensure_ascii=False))

    def view(x, y, yaw, pitch=4, fov=62, steps=12):
        E(f"GAME.view({x}, {y}, SCHL.gz({x}, {y}) + 1.62, {yaw}, {pitch}, {fov}); for (let i = 0; i < {steps}; i++) GAME.step(0.25)")
        for _ in range(30):
            if json.loads(E("JSON.stringify(WELT.state())"))['loading'] == 0:
                break
            time.sleep(0.3)
            E("GAME.step(0.25)")
    yaw = lambda x, y, tx, ty: math.degrees(math.atan2(tx - x, ty - y))
    if want('shots'):
        E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 14 * 60 + 30; DN.update(true)")
        lib.settle_light(pg)
        view(-1062, 1236, yaw(-1062, 1236, -1131, 1198), 5)
        lib.shot(pg, OUT, 'a_markt_rathaus')
        view(-1106, 1206, yaw(-1106, 1206, -1131, 1198), 14)
        lib.shot(pg, OUT, 'b_rathaus')
        view(-1088, 1214, yaw(-1088, 1214, -1080, 1260), 3)
        lib.shot(pg, OUT, 'c_markt_nord')
        # viewpoints on the streets near the church tower and below the castle (found in the street data)
        vp = json.loads(E("""JSON.stringify((() => { const st = SCHL.data ? SCHL.data.st : [], best = (tx, ty, d0, d1, f) => { let b = null, bs = -1e9;
              for (const s of st) { if (s.k > 5) continue; for (let k = 0; k < s.p.length; k += 2) { const x = s.p[k], y = s.p[k + 1], d = Math.hypot(x - tx, y - ty);
                if (d < d0 || d > d1) continue; const sc = f(x, y); if (sc > bs) { bs = sc; b = [x, y]; } } } return b; };
            return { kirche: best(-1246, 1213, 40, 70, (x, y) => x + y * 0.3), burg: best(-1293, 1175, 75, 120, (x, y) => -y - Math.abs(x + 1290) * 0.5) }; })())"""))
        print('viewpoints', vp, flush=True)
        if vp.get('kirche'):
            x, y = vp['kirche']
            view(x, y, yaw(x, y, -1246, 1210), 18)
            lib.shot(pg, OUT, 'd_johannis')
        if vp.get('burg'):
            x, y = vp['burg']
            view(x, y, yaw(x, y, -1290, 1172), 14)
            lib.shot(pg, OUT, 'e_bertholdsburg')
        # the castle: its courtyard with the stair towers from above, and from the north-east
        cb = json.loads(E("JSON.stringify((() => { const b = SCHL.bld.find(q => q.lm === 'burg'); return b ? [b.cx, b.cy, b.z0] : null; })())"))
        if cb:
            E(f"GAME.orbit(150, 38, 75, [{cb[0]}, {cb[1]}, {cb[2] + 8}]); GAME.step(0.5)")
            for _ in range(20):
                E("GAME.step(0.25)")
                if json.loads(E("JSON.stringify(WELT.state())"))['loading'] == 0:
                    break
                time.sleep(0.3)
            lib.shot(pg, OUT, 'e2_burg_hof')
            E(f"GAME.orbit(40, 14, 95, [{cb[0]}, {cb[1]}, {cb[2] + 10}]); GAME.step(0.5)")
            lib.shot(pg, OUT, 'e3_burg_nordost')
        E("""(() => { const R = SCHL.rathaus, p = R.Q(R.L / 2 - 2, 1.4, 0), q = R.Q(R.L / 2, R.w1, 0);
            GAME.view(p[0], p[1], R.floor + 1.62, Math.atan2(q[0] - p[0], q[1] - p[1]) * 180 / Math.PI, -4, 70); for (let i = 0; i < 8; i++) GAME.step(0.25); })()""")
        lib.shot(pg, OUT, 'f_rathaus_halle')
        E(f"GAME.orbit(200, 32, 260, [{MARKT[0]}, {MARKT[1]}, SCHL.gz({MARKT[0]}, {MARKT[1]})]); GAME.step(0.5)")
        for _ in range(20):
            E("GAME.step(0.25)")
            if json.loads(E("JSON.stringify(WELT.state())"))['loading'] == 0:
                break
            time.sleep(0.3)
        lib.shot(pg, OUT, 'g_oben')
    if want('night'):
        E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 22 * 60 + 40; DN.update(true)")
        lib.settle_light(pg)
        view(-1062, 1236, yaw(-1062, 1236, -1131, 1198), 5)
        lib.shot(pg, OUT, 'h_markt_nacht')
        n = json.loads(E("JSON.stringify({ glass: VPROPS.glass ? VPROPS.glass.emissiveIntensity : -1, lampV: VILLAGE.U ? VILLAGE.U.uLampV.value.filter(v => v.w > 0).length : -1, mine: SCHL.lamps.length })"))
        ck('night: the lamps glow and light the walls', n['glass'] > 3 and n['lampV'] >= 4 and n['mine'] > 50, json.dumps(n))
    progs = E("(GAME.R.info.programs || []).length")
    print('programs at the start', st0['progs'], 'after Schleusingen', progs, 'textures', st0['tex'], '->', E("GAME.R.info.memory.textures"), flush=True)
    if want('free'):
        E("GAME.go('garten')")
        for _ in range(130):
            E("GAME.step(0.25)")
            s = json.loads(E("JSON.stringify(SCHL.status())"))
            if s['state'] == 'idle' and not s['welt']['active']:
                break
        s = json.loads(E("JSON.stringify(SCHL.status())"))
        ck('back in the garden: Schleusingen and the tiles are freed', s['state'] == 'idle' and s['welt']['tiles'] == 0 and s['welt']['lowered'] == 0, json.dumps(s))
    good, r = lib.check_gl(pg)
    ck('every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}, {r['bad'][:3]}")
    ck.errors(errs)
ck.done()
