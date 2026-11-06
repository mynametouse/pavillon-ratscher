# feat/welt-dinge in Schleusingen: the parked cars of the aerial photo 2024 in the town (dinge/dinge.js, data dinge/schleusingen.json).
# Orte → Schleusingen (the old town and the world tiles load), the town's places come when one is near, the cells round the Markt are
# built, every car stands on the ground of the tiles (also when the tiles came after the cell: set down again), a street from the
# ground and from above, no new shader programs of the things, no page errors. The tiles come from the published site (as
# viz3/test/schleusingen.py does it) into viz3/dist/welt-test/. Pictures in out/welt_dinge_stadt/.
#   python3 viz3/test/welt_dinge_stadt.py 8998
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('welt_dinge_stadt')
OUT = lib.out('welt_dinge_stadt')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test')
XF = json.load(open(os.path.join(lib.ROOT, 'viz3', 'manifests.json')))['geoman']['xf']
MARKT = (-1084.7, 1241.9)


def utm(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def fetch_tiles():
    """the tiles round the Markt (levels 10-12) into dist/welt-test/ (as viz3/test/schleusingen.py)"""
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
    pg = lib.page(b, 1100, 680, errs, tier='hoch')
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e)
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    E("GAME.shot()")
    K0 = set(J("GAME.R.info.programs.map(p => p.cacheKey)"))
    a0 = J("DINGE.areaState()")
    ck('the areas are known; the town\'s data waits until one comes near (garden: 1.5 km)', 'ratscher' in a0 and 'schleusingen' in a0, str(a0))
    # a weekday morning in the town: the kerbs full, drives emptier
    tue = J("(() => { for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === 2) return d; return 1; })()")
    E(f"CLOCK.t = {tue * 1440 + 10 * 60 + 30}")
    E("document.querySelector('#menu [data-spot=schleusingen]').click()")
    t0 = time.time()
    while time.time() - t0 < 200:
        E("GAME.step(0.25)")
        if J("SCHL.status().state") in ('ready', 'error') and J("DINGE.areaState().schleusingen || null") in ('da', 'fehlt', 'fehler'):
            break
        time.sleep(0.4)
    for _ in range(40):
        E("GAME.step(0.25)")
        if J("WELT.state().loading") == 0:
            break
        time.sleep(0.3)
    st = J("({ schl: SCHL.status().state, area: DINGE.areaState(), s: DINGE.state() })")
    ck('near the town its places load', st['area'].get('schleusingen') == 'da', json.dumps(st)[:400])
    E("DINGE.settle()")
    steps(6)
    n = J("({ all: DINGE.places.filter(p => p.area === 'schleusingen').length, built: DINGE.places.filter(p => p.area === 'schleusingen' && p.im).length, on: DINGE.places.filter(p => p.area === 'schleusingen' && p.im && p.on && !p.hide).length })")
    ck('the town has many parking places, those near the Markt built', n['all'] >= 150 and n['built'] >= 40, json.dumps(n))
    st2 = J("DINGE.state()")
    ck('few draw calls: one mesh per body type and cell (≤ 120 in the town)', st2['drawn'] <= 120, f"{st2['drawn']} meshes, {st2['built']} cells, triangles per car {st2['tris']}")
    # on the ground: each built car's height against the ground under it now
    g = J("DINGE.places.filter(p => p.area === 'schleusingen' && p.im).map(p => +(p.zc - KERN.ground(p.x, p.y)).toFixed(2))")
    bad = [d for d in g if abs(d) > 0.25]
    ck('the cars stand on the ground of the tiles', len(g) > 0 and len(bad) <= 0.03 * len(g), f'{len(bad)} of {len(g)} off by > 0.25 m: {bad[:8]}; set down again: {J("DINGE.state().reposed")}')
    # the street with the most cars within 300 m of the Markt: from above and from the ground
    best = J(f"""(() => {{ const L = DINGE.places.filter(p => p.area === 'schleusingen' && p.im && Math.hypot(p.x - ({MARKT[0]}), p.y - {MARKT[1]}) < 300);
        let b = null, bn = -1; for (const p of L) {{ const n = L.filter(q => Math.hypot(q.x - p.x, q.y - p.y) < 25).length; if (n > bn) {{ bn = n; b = p; }} }}
        return b ? {{ x: b.x, y: b.y, az: b.az, n: bn }} : null; }})()""")
    if best:
        E(f"GAME.orbit(200, 50, 55, [{best['x']}, {best['y']}, KERN.ground({best['x']}, {best['y']}) + 1])")
        E("GAME.shot()")
        pic('01_strasse_von_oben')
        E(f"GAME.orbit({(best['az'] + 70) % 360}, 8, 20, [{best['x']}, {best['y']}, KERN.ground({best['x']}, {best['y']}) + 1])")
        E("GAME.shot()")
        pic('02_strasse')
    E(f"GAME.orbit(160, 35, 140, [{MARKT[0]}, {MARKT[1]}, KERN.ground({MARKT[0]}, {MARKT[1]}) + 2])")
    E("GAME.shot()")
    pic('03_markt_umgebung')
    # car parks of OSM (empty in the photo of a Sunday morning): a shop's fills on Saturday morning, empty on Sunday
    kinds = J("DINGE.state().kinds")
    print('kinds', kinds, flush=True)
    if kinds.get('laden', 0) >= 5:
        sat = J("(() => { for (let d = 0; d < 14; d++) if (DCAL.wd(d * 1440 + 600) === 6) return d; return 5; })()")
        r = J(f"""(() => {{ const L = DINGE.places.map((p, i) => i).filter(i => DINGE.places[i].kind === 'laden');
            const n = t => L.filter(i => DINGE.want(i, t)).length; return {{ all: L.length, sa10: n({sat} * 1440 + 600), so10: n({sat + 1} * 1440 + 600) }}; }})()""")
        ck('a shop\'s car park: full on Saturday at 10:00, empty on Sunday', r['sa10'] > 0.7 * r['all'] and r['so10'] < 0.15 * r['all'], str(r))
    newp = [[nm, k[-60:]] for nm, k in J("GAME.R.info.programs.map(p => [p.name, p.cacheKey])") if k not in K0]
    ck('no new shader programs of the things', not [x for x in newp if 'dinge' in x[1]], f'new: {newp}')
    ck('no error in the round', not J("DINGE.err"), str(J("DINGE.err")))
    ck.errors(errs)
ck.done()
