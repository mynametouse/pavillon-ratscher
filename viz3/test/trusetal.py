# Trusetal (welt/trusetal.js; Karten-Chat 19.11.2026, Falko: „die Stadt Trusetal mit Originaldaten, 3D-Daten“, 18:15: „verfeinern inkl.
# bekannter Gebäude und Sehenswürdigkeiten“): from the start situation ?szenario=trusetal the walker stands on the Rathausstraße, the zone's
# own tile set (welt-test/zonen/trusetal/: DGM1 1 m, aerial image 2024) carries him at the town's real height, the ETHOS houses of the cells
# (gebaeude/gebaeude.js) stand around him; the known places are built (the church with its tower, the Wallenburger Turm, the waterfall with
# its drop from the DGM1, the gnomes of the Zwergen-Park, the mine portal), the street's name comes from OSM, no page errors.
# Pictures at eye height, of each place and from above in out/trusetal/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8981 --serve trusetal
# (the first push of a new branch starts no run, nor does a push of docs alone)
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
import vessra_tiles as VT

port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('trusetal')
OUT = lib.out('trusetal')
# the zone's tiles into dist as for Kloster Veßra (the same rings around the core), and the fine tiles around each known place
VT.SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/') + 'zonen/trusetal/'
VT.DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test', 'zonen', 'trusetal')
VT.ORT = (-23310.0, 32709.0)
VT.fetch_tiles()
D = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'trusetal', 'dist', 'trusetal', 'ort.json')))
PLACES = {'kirche': D['church']['f'][:2], 'turm': D['tower']['c'], 'wasserfall': D['falls']['top'], 'zwerge': D['park']['path'][:2],
          'bergwerk': D['mine']['adit']}


def fine_tiles(R=150):
    meta = json.load(open(os.path.join(VT.DIST, 'meta.json')))['tiling']['levels']
    jobs = set()
    for c in PLACES.values():
        E, N = VT.utm(*c)
        for L in (10, 11, 12):
            s = 409600 / (1 << L)
            r = meta[str(L)]['rect']
            for x in range(int((E - R - 420700) // s), int((E + R - 420700) // s) + 1):
                for y in range(int((N - R - 5390800) // s), int((N + R - 5390800) // s) + 1):
                    if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                        jobs |= {f't/{L}/{x}/{y}.bin', f'i/{L}/{x}/{y}.webp'}

    def get(rel):
        p = os.path.join(VT.DIST, rel)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return 0
        os.makedirs(os.path.dirname(p), exist_ok=True)
        for k in range(4):
            try:
                with urllib.request.urlopen(VT.SITE + rel, timeout=60) as r:
                    b = r.read()
                open(p, 'wb').write(b)
                return len(b)
            except Exception:
                time.sleep(1 + 2 * k)
        return 0
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'tiles of the places: {len(jobs)} files, {n / 1e6:.1f} MB new', flush=True)


fine_tiles()
NEAR = """((cx, cy, R) => { let cells = 0, n = 0; for (const c of GEB.Z.cells.values()) { if (!c.meshes.length) continue; cells++;
    for (const b of c.data.b) if (b.cx !== undefined && Math.hypot(b.cx - cx, b.cy - cy) < R) n++; }
    return { z: GEB.Z.state, err: GEB.Z.err || '', jobs: GEB.jobs(), busy: GEB.Z.busy, w: WELT.state().loading, cells, n }; })"""
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1000, 640, errs, tier='mittel')
    lib.boot(pg, port, '?szenario=trusetal')
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    E("for (let i = 0; i < 8; i++) GAME.step(0.1)")
    a = J("{ ev: KERN.events().map(e => e.name + (e.data && e.data.name ? ':' + e.data.name : '')), x: GAME.P.x, y: GAME.P.y, spot: KERN.spots().trusetal.pos }")
    ck('the start situation ran (?szenario=trusetal), the walker at the spot', any(e == 'scenario:trusetal' for e in a['ev'])
       and math.hypot(a['x'] - a['spot'][0], a['y'] - a['spot'][1]) < 3, json.dumps(a)[:300])

    def settle(cx, cy, limit=300, R=350, need_n=True):
        t0, calm, s = time.time(), 0, {}
        while time.time() - t0 < limit:
            E("GAME.step(0.5)")
            s = J(f"{NEAR}({cx}, {cy}, {R})")
            quiet = J("TRUSETAL.state") == 'ready' and s['z'] == 'ready' and not s['jobs'] and not s['busy'] and s['w'] == 0 and (s['n'] > 0 or not need_n)
            calm = calm + 1 if quiet else 0
            if calm >= 6 and time.time() - t0 > 12:
                break
            time.sleep(0.25)
        s['secs'] = round(time.time() - t0)
        return s

    s = settle(a['x'], a['y'])
    g = J("{ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, w: WELT.heightAt(GAME.P.x, GAME.P.y), g: KERN.ground(GAME.P.x, GAME.P.y), place: KERN.place(GAME.P.x, GAME.P.y) }")
    ck('the zone built around the walker from its own tiles (TRUSETAL ready, the tiles in)', J("TRUSETAL.state") == 'ready' and s['w'] == 0 and g['w'] is not None, json.dumps(s))
    hz = (g['w'] or 0) + 374.617
    # DGM1 there: about 338 m NHN (the town lies in the Truse valley, 280–420 m from Herges-Auwallenburg up to the waterfall)
    ck('… the ground at the town\'s real height (DGM1: about 338 m NHN at the town hall), the walker on it', 325 < hz < 350 and abs(g['feet'] - g['g']) < 0.15,
       f"{hz:.1f} m NHN; {json.dumps(g, ensure_ascii=False)}")
    ck('… the street\'s name from OSM on the HUD (Rathausstraße)', 'Rathaus' in (g['place'] or ''), json.dumps(g['place'], ensure_ascii=False))
    ck('the houses stand around him (ETHOS cells, at least 250 within 350 m)', s['n'] >= 250 and not s['err'], json.dumps(s))
    st = J("TRUSETAL.status()")
    lm = st['landmarks'] or {}
    print('status', json.dumps(st, ensure_ascii=False), flush=True)
    ck('the known places are built (church, tower, waterfall, gnome park, mine) without errors', all(k in lm for k in ('church', 'tower', 'falls', 'park', 'mine'))
       and not st['err'], json.dumps(st, ensure_ascii=False)[:600])
    ch, tw, fl = lm.get('church') or {}, lm.get('tower') or {}, lm.get('falls') or {}
    ck('… the church tower with its cross about 25 m high, the Wallenburger Turm 27.5 m over its foot',
       22 < ch.get('top', 0) - ch.get('ground', 0) < 28 and 27 < tw.get('top', 0) - tw.get('ground', 0) < 29, json.dumps([ch, tw]))
    ck('… the waterfall falls 35–60 m (DGM1, from the Wasserfallgraben to the Truse), rocks along it', 35 < fl.get('drop', 0) < 60 and fl.get('rocks', 0) > 30, json.dumps(fl))
    ck('… gnomes in the Zwergen-Park (at least 50)', (lm.get('park') or {}).get('gnomes', 0) >= 50, json.dumps(lm.get('park')))
    E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 11 * 60; DN.update(true)")
    lib.settle_light(pg)
    E("GAME.step(0.5)")
    lib.shot(pg, OUT, 'a_rathausstrasse')

    def eye(x, y, yaw, pitch=4.0, fov=62, h=1.7):
        E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); GAME.step(0.05); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); }})()")

    def look(name, cx, cy, dist, az, pitch, h=1.7):
        # stand dist m from (cx, cy) in the direction az (degrees from north) and look at it
        x, y = cx + dist * math.sin(math.radians(az)), cy + dist * math.cos(math.radians(az))
        yaw = math.degrees(math.atan2(cx - x, cy - y))
        eye(x, y, yaw, pitch, h=h)
        settle(x, y, limit=120, R=200, need_n=False)
        eye(x, y, yaw, pitch, h=h)
        E("GAME.step(0.3)")
        lib.shot(pg, OUT, name)

    if ch and tw and fl and 'mine' in lm:
        look('b_kirche', ch['x'] + 14, ch['y'], 42, 160, 14)
        look('c_wallenburger_turm', tw['x'], tw['y'], 30, 250, 24)
        look('d_wasserfall', fl['x'], fl['y'] - 14, 34, 175, 18)
        pp = PLACES['zwerge']
        look('e_zwergenpark', pp[0], pp[1], 14, 200, -8)
        mm = lm['mine']
        look('f_bergwerk', mm['x'], mm['y'], 14, (90 - mm['out']) % 360, 2)
    x, y = a['x'], a['y']
    E(f"GAME.orbit(200, 50, 260, [{x}, {y}, KERN.ground({x}, {y}) + 1])")
    for _ in range(6):
        E("GAME.step(0.5)")
        time.sleep(0.3)
    lib.shot(pg, OUT, 'g_von_oben')
    ck.errors(errs)
ck.done()
