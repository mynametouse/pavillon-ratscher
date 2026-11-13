# feat/grenzland: a look at the mode's panel and radar (no checks worth a test of its own – pictures for the eye): on foot, wanted with a
# patrol car near, on the moped, in 1989, on a phone's screen. Pictures in out/grenzland_blick/.
#   python3 viz3/test/grenzland_blick.py 9011        (~4 min in the chat machine)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('grenzland_blick')
OUT = lib.out('grenzland_blick')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1100, 680, errs)
    lib.boot(pg, port, '?szenario=grenzland', figures=True)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.1: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    def pic(name):
        try:
            E("GAME.shot()")
            pg.screenshot(path=os.path.join(OUT, name + '.png')); print('shot', name, flush=True)
        except Exception as e:
            print('shot failed', name, e)
    for _ in range(120):
        steps(0.3)
        if E("!!GRENZLAND.partnerOf()"): break
        time.sleep(0.5)
    # in the village, wanted, a patrol car on the road near by
    E("GAME.view(226, -112, 0, 300, -4)")
    steps(3)
    E("GLFAHNDUNG.tat('schlag', { force: [{ name: 'Probe' }] })")
    E("(() => { const r = GLAUTO.route([330, -160], [230, -118], {}); const c = GLAUTO.spawn('streife', {}); GLAUTO.onLine(c, r, 0); "
      "GLFAHNDUNG.cars.push({ c, st: 'suche', crew: 2, routeT: 0, t: 0 }); })()")
    steps(1.5)
    box = J("(() => { const r = document.getElementById('glmap').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), "
            "x: Math.round(r.left), y: Math.round(r.top), vh: innerHeight } })()")
    ck('the radar is a small round map bottom left', 150 < box['w'] < 200 and box['w'] == box['h'] and box['x'] < 40 and box['y'] > box['vh'] / 2, str(box))
    pic('01_dorf_gesucht')
    E("GLFAHNDUNG.clear()")
    # on the moped: the game's own small map is hidden, the name shows
    E("GAME.view(104, -316, 0, 30, -5); GLAUTO.mopedAt(108, -312, 0.5); GLSTATE.tank = 3")
    steps(0.5)
    E("VEH.enter('gl-moped')")
    steps(1.2)
    vm = J("({ v: getComputedStyle(document.getElementById('vmap')).display, o: document.getElementById('glort').textContent })")
    ck('on the moped the game\'s own small map is hidden, the vehicle\'s name shows', vm['v'] == 'none' and len(vm['o']) > 2, str(vm))
    pic('02_moped')
    E("VEH.exit()")
    steps(0.5)
    # 1989
    E("GL89.enter({ pos: [222, -100], yaw: 0 })")
    for _ in range(10):
        steps(0.3); time.sleep(0.3)
    lib.settle_light(pg)
    steps(1)
    pic('03_1989')
    E("GL89.leave()")
    for _ in range(8):
        steps(0.3); time.sleep(0.3)
    # a phone held upright
    pg.set_viewport_size({'width': 390, 'height': 800})
    steps(1)
    E("GLFAHNDUNG.tat('schlag', { force: [{ name: 'Probe' }] })")
    steps(1)
    box = J("(() => { const r = document.getElementById('glmap').getBoundingClientRect(), q = document.getElementById('qtrack').getBoundingClientRect(); "
            "return { w: Math.round(r.width), x: Math.round(r.left), y: Math.round(r.top), qb: Math.round(q.bottom), vh: innerHeight } })()")
    ck('on a phone the radar sits top left under the task card, smaller', 90 < box['w'] < 130 and box['y'] < box['vh'] / 2 and box['y'] >= box['qb'] - 2, str(box))
    pic('04_handy')
    E("GRENZLAND.stop()")
    steps(0.5)
    ck.errors(errs)
    ck.done()
