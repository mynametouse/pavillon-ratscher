# Kloster Veßra from the start situation ?szenario=baumschule (boot/boot.js → KERN.scenario, welt/vessra.js): after loading the walker
# stands on the Schulstraße in front of the nursery gate, the zone (KERN.zone) builds around him from its own world tiles, the ground
# carries him, walking in through the gate reaches the sales yard with its name on the HUD; a picture of the start.
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8981 --serve vessra_szenario
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
from vessra_tiles import fetch_tiles

port = sys.argv[1]
ck = lib.Checks('vessra_szenario')
OUT = lib.out('vessra')
fetch_tiles()
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1000, 640, errs, tier='mittel')
    lib.boot(pg, port, '?szenario=baumschule')
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false)")
    E("for (let i = 0; i < 8; i++) GAME.step(0.1)")
    a = J("{ ev: KERN.events().map(e => e.name + (e.data && e.data.name ? ':' + e.data.name : '')), x: GAME.P.x, y: GAME.P.y, spot: KERN.spots().baumschule.pos }")
    ck('the start situation ran (?szenario=baumschule)', any(e == 'scenario:baumschule' for e in a['ev']), ','.join(a['ev'][-8:]))
    ck('… the walker stands at the jump spot in front of the nursery gate', math.hypot(a['x'] - a['spot'][0], a['y'] - a['spot'][1]) < 3, json.dumps(a)[:300])
    t0 = time.time()
    while time.time() - t0 < 300:
        E("GAME.step(0.25)")
        if J("VESSRA.state") in ('ready', 'error'):
            break
        time.sleep(0.4)
    for _ in range(40):
        E("GAME.step(0.25)")
        if J("WELT.state().loading") == 0:
            break
        time.sleep(0.3)
    E("GAME.step(1)")
    s = J("VESSRA.status()")
    ck('the zone built around the walker (KERN.zone)', s['state'] == 'ready' and s['zone'] == 'ready' and not s['noTiles'] and s['beete'] == 5,
       f"state {s['state']}, zone {s['zone']}, {s['buildings']} buildings, {round(time.time() - t0)} s, err {s['err']}")
    g = J("{ x: GAME.P.x, y: GAME.P.y, feet: GAME.P.feet, g: KERN.ground(GAME.P.x, GAME.P.y), place: KERN.place(GAME.P.x, GAME.P.y), e: VESSRA.baumschule && VESSRA.baumschule.eingang }")
    ck('… on the ground on the street in front of the gate', abs(g['feet'] - g['g']) < 0.1 and g['e'] and math.hypot(g['x'] - g['e']['x'], g['y'] - g['e']['y']) < 8, json.dumps(g, ensure_ascii=False))
    E("if (!DN.active) GAME.setMode('auto'); CLOCK.t = 11 * 60; DN.update(true)")
    lib.settle_light(pg)
    E("GAME.step(0.5)")
    lib.shot(pg, OUT, 'm_szenario_baumschule')
    w = J("(() => { GAME.step(6, 1); return { x: GAME.P.x, y: GAME.P.y, place: KERN.place(GAME.P.x, GAME.P.y) }; })()")
    ck('walking in through the gate reaches the sales yard', 'Baumschule Kammbach' in (w['place'] or ''), json.dumps(w, ensure_ascii=False))
    ck.errors(errs)
ck.done()
