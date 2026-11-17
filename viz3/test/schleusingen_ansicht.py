# feat/schleusingen-ansicht: Schleusingen after private views from the street – facades and the Markt.
# Without a browser (section data): viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json is valid
# (tools/schleusingen-ansicht/check.py) and covers the buildings the viewpoints of viz3/extra/schleusingen-ansicht/views.json show.
# In the browser: Orte → Schleusingen, wait for the town and what loads round it; then
#   fassaden – the game uses the data for the right buildings (style, wall and roof colour of SCHL.bld as in the data)
#   markt    – the Markt's props of MARKT are there (statue, seated figure, benches, planters, bollards …), at most +4 draw calls at
#              the Markt and no new shader programs
#   bilder   – model pictures from the viewpoints (the model only; the private views stay on the chat machine) → out/schleusingen_ansicht/
# The world tiles come from the published site (as viz3/test/laeden.py).
#   python3 viz3/test/schleusingen_ansicht.py PORT [sections]      sections: data,fassaden,markt,bilder (default all)
#   environment: SA_VIEWS=v000,v010 (only these pictures), SA_DUMP=1 (the town's buildings with their feet → out/…/stadt_dump.json)
import sys, os, json, time, math, urllib.request, concurrent.futures, base64, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else 'data,fassaden,markt,bilder').split(','))
ck = lib.Checks('schleusingen_ansicht')
OUT = lib.out('schleusingen_ansicht')
EXTRA = os.path.join(lib.ROOT, 'viz3', 'extra', 'schleusingen-ansicht')
VIEWS = json.load(open(os.path.join(EXTRA, 'views.json')))
FASS_P = os.path.join(EXTRA, 'dist', 'schleusingen-ansicht', 'fassaden.json')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
MARKT = (-1084.7, 1241.9)


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def fetch_tiles(centres, half=420):
    """the world tiles round the viewpoints (levels 10-12) into dist/welt-test/ (as viz3/test/laeden.py)"""
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
    r = subprocess.run([sys.executable, os.path.join(lib.ROOT, 'tools', 'schleusingen-ansicht', 'check.py')], capture_output=True, text=True)
    ck('fassaden.json is valid (tools/schleusingen-ansicht/check.py)', r.returncode == 0, (r.stdout + r.stderr).strip()[-400:])

# ---------------------------------------------------------------- in the browser -----------------------------------------------------
BROWSER = [s for s in ('fassaden', 'markt', 'bilder') if s in want]
if BROWSER:
    only = set(filter(None, os.environ.get('SA_VIEWS', '').split(',')))
    views = [v for v in VIEWS if not only or v['name'] in only]
    fetch_tiles([MARKT, (-1480, 1040), (-1110, 1620), (-650, 1430)])
    with lib.browser() as b:
        errs = []
        pg = lib.page(b, 1366, 559, errs, tier='hoch')
        lib.boot(pg, port)
        E = pg.evaluate
        J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))

        def settle(limit=120):
            t0 = time.time()
            st = None
            while time.time() - t0 < limit:
                E("GAME.step(0.25)")
                st = J("({ w: WELT.state().loading, pq: WELT.padQueue ? WELT.padQueue() : 0, busy: !!(window.GEB && GEB.Z && GEB.Z.busy), "
                       "jobs: window.GEB && GEB.jobs ? GEB.jobs() : 0, d: window.DINGE ? DINGE.areaState().schleusingen || null : null })")
                if st['w'] == 0 and st['pq'] == 0 and not st['busy'] and st['jobs'] == 0 and time.time() - t0 > 4:
                    break
                time.sleep(0.25)
            return st

        E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
        # an autumn afternoon like most of the views (October, 14:00)
        E("if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60; DN.update(true)")
        lib.settle_light(pg)
        E("document.querySelector('#menu [data-spot=schleusingen]').click()")
        t0 = time.time()
        while time.time() - t0 < 300:
            E("GAME.step(0.25)")
            if J("SCHL.status().state") in ('ready', 'error'):
                break
            time.sleep(0.3)
        st = settle(150)
        S0 = J("SCHL.status()")
        ck('the town stands', S0['state'] == 'ready' and S0['buildings'] > 700, json.dumps(S0)[:300] + ' ' + json.dumps(st))
        if os.environ.get('SA_DUMP'):
            dump = J("SCHL.bld.map(b => [b.i, +b.z0.toFixed(2), +b.zmin.toFixed(2), b.st.style, b.st.col.map(c => +c.toFixed(3)), b.rk, b.rc])")
            gz = {v['name']: J(f"KERN.ground({v['x']}, {v['y']})") for v in views}
            json.dump({'bld': dump, 'ground': gz}, open(os.path.join(OUT, 'stadt_dump.json'), 'w'))
            print('dump', len(dump), flush=True)
        if 'bilder' in want:
            done = 0
            for v in views:
                x, y = v['x'], v['y']
                E(f"GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['vfov']})")
                settle(60)
                E(f"GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v['eye']}, {v['yaw']}, {v['pitch']}, {v['vfov']})")
                d = E("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.88); })()")
                open(os.path.join(OUT, v['name'] + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
                cam = J(f"({{ z: KERN.ground({x}, {y}) }})")
                json.dump({**v, **cam}, open(os.path.join(OUT, v['name'] + '.json'), 'w'))
                done += 1
                print('view', v['name'], flush=True)
            ck('model pictures from every viewpoint', done == len(views), f'{done} of {len(views)}')
        ck.errors(errs)
ck.done()
