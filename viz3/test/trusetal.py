# Trusetal (welt/trusetal.js; Karten-Chat 19.11.2026, Falko: „die Stadt Trusetal mit Originaldaten, 3D-Daten“): from the start situation
# ?szenario=trusetal the walker stands on a street in the town's core, the zone's own tile set (welt-test/zonen/trusetal/: DGM1 1 m,
# aerial image 2024) carries him at the town's real height, the ETHOS houses of the cells (gebaeude/gebaeude.js, tools/welt-gebaeude/orte.py)
# stand around him on that ground, no page errors. Pictures at eye height and from above in out/trusetal/.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8981 --serve trusetal
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
import vessra_tiles as VT

port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('trusetal')
OUT = lib.out('trusetal')
# the zone's tiles into dist as for Kloster Veßra (the same rings around the place)
VT.SITE = os.environ.get('WELT_SITE', 'https://mynametouse.github.io/pavillon-ratscher/welt-test/') + 'zonen/trusetal/'
VT.DIST = os.path.join(lib.ROOT, 'viz3', 'dist', 'welt-test', 'zonen', 'trusetal')
VT.ORT = (-23310.0, 32709.0)
VT.fetch_tiles()
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
    t0 = time.time()
    s, calm = {}, 0
    while time.time() - t0 < 400:
        E("GAME.step(0.5)")
        s = J(f"{NEAR}(GAME.P.x, GAME.P.y, 350)")
        quiet = J("TRUSETAL.state") == 'ready' and s['z'] == 'ready' and not s['jobs'] and not s['busy'] and s['w'] == 0 and s['n'] > 0
        calm = calm + 1 if quiet else 0
        if calm >= 6 and time.time() - t0 > 20:
            break
        time.sleep(0.25)
    s['secs'] = round(time.time() - t0)
    g = J("{ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, w: WELT.heightAt(GAME.P.x, GAME.P.y), g: KERN.ground(GAME.P.x, GAME.P.y) }")
    ck('the zone built around the walker from its own tiles (TRUSETAL ready, the tiles in)', J("TRUSETAL.state") == 'ready' and s['w'] == 0 and g['w'] is not None, json.dumps(s))
    hz = (g['w'] or 0) + 374.617
    ck('… the ground at the town\'s real height (DGM1: the valley floor 380–480 m NHN), the walker on it', 380 < hz < 480 and abs(g['feet'] - g['g']) < 0.15,
       f"{hz:.1f} m NHN; {json.dumps(g)}")
    ck('the houses stand around him (ETHOS cells, at least 250 within 350 m)', s['n'] >= 250 and not s['err'], json.dumps(s))
    E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 11 * 60; DN.update(true)")
    lib.settle_light(pg)
    E("GAME.step(0.5)")
    lib.shot(pg, OUT, 'a_strasse')
    x, y = g['x'], g['y']
    E(f"GAME.orbit(200, 50, 260, [{x}, {y}, KERN.ground({x}, {y}) + 1])")
    for _ in range(6):
        E("GAME.step(0.5)")
        time.sleep(0.3)
    lib.shot(pg, OUT, 'b_von_oben')
    ck.errors(errs)
ck.done()
