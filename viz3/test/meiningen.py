# Meiningen and the Werra valley (welt/meiningen.js; Karten-Chat 19.11.2026, Falko 18:52: „Meiningen … und den Weg nach Meiningen, sodass
# dort keine flache Karte erscheint, sondern echte Gebäude“): from ?szenario=meiningen the walker stands on the Markt, the town's own tile
# set (welt-test/zonen/meiningen/: DGM1 1 m, aerial 2024) carries him at the real height, the ETHOS houses stand around him, the Stadtkirche
# with its twin towers and the theatre's portico are built, the street's name comes from OSM; then in the Werra valley at Belrieth
# (welt-test/zonen/werratal/): its tiles and the village's houses. Pictures in out/meiningen/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8981 --serve meiningen
import sys, os, json, time, math, urllib.request, concurrent.futures
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
import vessra_tiles as VT

port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('meiningen')
OUT = lib.out('meiningen')
SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/')
MARKT = (-24240.0, 8787.0)
BELRIETH = (-18890.0, 4233.0)   # the village (Wikidata) on the B 89
D = json.load(open(os.path.join(lib.ROOT, 'viz3', 'extra', 'meiningen', 'dist', 'meiningen', 'ort.json')))


def tiles(sub, places, R=260):
    """the zone's tiles of levels 10-12 around the places into dist (the test server serves dist)"""
    dist = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test', 'zonen', sub)
    os.makedirs(dist, exist_ok=True)
    mp = os.path.join(dist, 'meta.json')
    if not os.path.exists(mp):
        open(mp, 'wb').write(urllib.request.urlopen(SITE + f'zonen/{sub}/meta.json', timeout=60).read())
    lv = json.load(open(mp))['tiling']['levels']
    jobs = set()
    for c in places:
        E, N = VT.utm(*c)
        for L in (10, 11, 12):
            s = 409600 / (1 << L)
            r = lv[str(L)]['rect']
            pad = R + (400 if L == 10 else 0)
            for x in range(int((E - pad - 420700) // s), int((E + pad - 420700) // s) + 1):
                for y in range(int((N - pad - 5390800) // s), int((N + pad - 5390800) // s) + 1):
                    if r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                        jobs |= {f't/{L}/{x}/{y}.bin', f'i/{L}/{x}/{y}.webp'}

    def get(rel):
        p = os.path.join(dist, rel)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return 0
        os.makedirs(os.path.dirname(p), exist_ok=True)
        for k in range(4):
            try:
                b = urllib.request.urlopen(SITE + f'zonen/{sub}/' + rel, timeout=60).read()
                open(p, 'wb').write(b)
                return len(b)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return 0
            except Exception:
                time.sleep(1 + 2 * k)
        return 0
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        n = sum(ex.map(get, sorted(jobs)))
    print(f'{sub}: {len(jobs)} files, {n / 1e6:.1f} MB new', flush=True)


tiles('meiningen', [MARKT, D['theatre']['front'][0]])
tiles('werratal', [BELRIETH])
NEAR = """((cx, cy, R) => { let n = 0; for (const c of GEB.Z.cells.values()) { if (!c.meshes.length) continue;
    for (const b of c.data.b) if (b.cx !== undefined && Math.hypot(b.cx - cx, b.cy - cy) < R) n++; }
    return { z: GEB.Z.state, err: GEB.Z.err || '', jobs: GEB.jobs(), busy: GEB.Z.busy, w: WELT.state().loading, n }; })"""
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1000, 640, errs, tier='mittel')
    lib.boot(pg, port, '?szenario=meiningen')
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    E("for (let i = 0; i < 8; i++) GAME.step(0.1)")
    a = J("{ ev: KERN.events().map(e => e.name + (e.data && e.data.name ? ':' + e.data.name : '')), x: GAME.P.x, y: GAME.P.y }")
    ck('the start situation ran (?szenario=meiningen), the walker on the Markt', any(e == 'scenario:meiningen' for e in a['ev'])
       and math.hypot(a['x'] - MARKT[0], a['y'] - MARKT[1]) < 3, json.dumps(a)[:300])

    def settle(cx, cy, limit=300, R=350, zone='meiningen'):
        t0, calm, s = time.time(), 0, {}
        while time.time() - t0 < limit:
            E("GAME.step(0.5)")
            s = J(f"{NEAR}({cx}, {cy}, {R})")
            zs = {z['id']: z['state'] for z in J("MEININGEN.status().zones")}
            quiet = zs.get(zone) == 'ready' and s['z'] == 'ready' and not s['jobs'] and not s['busy'] and s['w'] == 0 and s['n'] > 0
            calm = calm + 1 if quiet else 0
            if calm >= 6 and time.time() - t0 > 12:
                break
            time.sleep(0.25)
        s['secs'] = round(time.time() - t0)
        return s

    def eye(x, y, yaw, pitch=4.0, fov=62, h=1.7):
        E(f"(() => {{ document.body.dataset.mode = 'walk'; GAME.setView3(false, true); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); GAME.step(0.05); GAME.view({x}, {y}, KERN.ground({x}, {y}) + {h}, {yaw}, {pitch}, {fov}); }})()")

    s = settle(*MARKT)
    g = J("{ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, w: WELT.heightAt(GAME.P.x, GAME.P.y), g: KERN.ground(GAME.P.x, GAME.P.y), place: KERN.place(GAME.P.x, GAME.P.y) }")
    hz = (g['w'] or 0) + 374.617
    ck('the town\'s tiles in, the ground at the Markt\'s real height (DGM1: about 290 m NHN), the walker on it', g['w'] is not None and 280 < hz < 305
       and abs(g['feet'] - g['g']) < 0.15, f"{hz:.1f} m NHN; {json.dumps(g, ensure_ascii=False)}")
    ck('… the street\'s name from OSM on the HUD (Markt)', 'Markt' in (g['place'] or ''), json.dumps(g['place'], ensure_ascii=False))
    ck('the houses of the town stand around him (ETHOS cells, at least 400 within 350 m)', s['n'] >= 400 and not s['err'], json.dumps(s))
    st = J("MEININGEN.status()")
    lm = st.get('landmarks') or {}
    print('status', json.dumps(st, ensure_ascii=False), flush=True)
    ch, th = lm.get('church') or {}, lm.get('theatre') or {}
    ck('the Stadtkirche with its two towers (the crosses about 58 m over the Markt) and the theatre\'s portico with six columns are built',
       ch.get('towers') == 2 and 50 < ch.get('top', 0) - ch.get('ground', 0) < 65 and th.get('columns') == 6, json.dumps(lm))
    E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 11 * 60; DN.update(true)")
    lib.settle_light(pg)
    E("GAME.step(0.5)")
    eye(MARKT[0] + 2, MARKT[1] - 30, 5, 22)
    E("GAME.step(0.3)")
    lib.shot(pg, OUT, 'a_markt_stadtkirche')
    if th:
        f0 = D['theatre']['front'][0]
        tx, ty = f0[0] - 34, (D['theatre']['front'][0][1] + D['theatre']['front'][1][1]) / 2
        eye(tx, ty, 90, 10)
        settle(tx, ty, limit=90, R=200)
        eye(tx, ty, 90, 10)
        E("GAME.step(0.3)")
        lib.shot(pg, OUT, 'b_theater')
    # the Werra valley: Belrieth on the B 89
    eye(BELRIETH[0], BELRIETH[1], 270, 2)
    s2 = settle(*BELRIETH, zone='werratal')
    w2 = J(f"{{ w: WELT.heightAt({BELRIETH[0]}, {BELRIETH[1]}), z: MEININGEN.status().zones }}")
    ck('in the Werra valley at Belrieth: the valley\'s tiles and the village\'s houses (at least 60 within 350 m)', w2['w'] is not None and s2['n'] >= 60,
       json.dumps([s2, w2], ensure_ascii=False))
    eye(BELRIETH[0], BELRIETH[1], 270, 2)
    E("GAME.step(0.3)")
    lib.shot(pg, OUT, 'c_belrieth')
    eye(MARKT[0], MARKT[1], 0, 5)
    settle(*MARKT, limit=120)
    E(f"GAME.orbit(200, 50, 300, [{MARKT[0]}, {MARKT[1]}, KERN.ground({MARKT[0]}, {MARKT[1]}) + 1])")
    for _ in range(6):
        E("GAME.step(0.5)")
        time.sleep(0.3)
    lib.shot(pg, OUT, 'd_von_oben')
    ck.errors(errs)
ck.done()
