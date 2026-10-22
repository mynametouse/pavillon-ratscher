# Gallery picture 28 (V16d): from log to board – the log yard north of the band sawmill with logs on its squared timbers, a log on the
# sawmill’s bunks, the tractor with the stake trailer behind. The state is set up directly (logs from HOLZ.testLog put on the
# trailer through its slots, on the yard, on the mill through HOLZSAW.dropOn), then the picture is taken like bilder.py (offline quality,
# 1280 × 720, JPEG 0.9) into dist/img/b28.jpg.
#   PORT=8954 python3 viz3/test/b28.py        (~4 min)
import sys, os, time, json, math, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = os.environ.get('PORT', '8951'); OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'img'); os.makedirs(OUT, exist_ok=True)
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1280, 720, errs, tier='hoch'); lib.boot(pg, port, query='?offline=1', figures=True); E = pg.evaluate
    E("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#toast').forEach(e => e.style.visibility = 'hidden')")
    steps = lambda secs: E(f"for (let i = 0; i < {int(secs / 0.025)}; i++) GAME.step(0.025)")
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    for i in range(60):
        if E("!!(window.HOLZ && HOLZ.ready && window.HOLZSAW)"): break
        E("GAME.step(0.1)"); time.sleep(0.5)
    E("CLOCK.t = Math.round(Date.UTC(2026, 9, 22) / 864e5 - (DN.jdOf(0) - 2440587.5 + 0.5 | 0)) * 1440 + 15 * 60 + 10; DN.update(true)"); lib.settle_light(pg)
    Y = J("[HOLZ.YARD0.x, HOLZ.YARD0.y]")
    # the tractor heading north with the trailer behind, the bed alongside the yard (east of it)
    E(f"VEH.place('car', 40, 52, Math.PI / 2); VEH.place('tractor', {Y[0]} + 2.9, {Y[1]} - 0.3 + 6.4, 0); TRAILER.home(); GAME.step(0.05)")
    # logs: three on the trailer (through its slots: they lie in the gaps), three in the yard on the timbers, one on the mill's bunks
    spec = [('spruce', 4.1, 36, 30), ('spruce', 4.1, 31, 27), ('larch', 3.6, 30, 26)]
    for i, (sp, L, d0, d1) in enumerate(spec):
        lid = E(f"HOLZ.testLog({{ sp: '{sp}', x: 60 + {i} * 2, y: 60, az: 0, L: {L}, d0: {d0}, d1: {d1} }})")
        E(f"""(() => {{ const l = HOLZ.logs.find(l => l.id === '{lid}'), r = (l.d0 + l.d1) / 400, s = TRAILER.slot({[-0.5, 0.5, 0.0][i]}, r); if (!s) return;
          l.st = 'trailer'; l.tx = s.x; l.tz = s.z; l.ta = {[0.25, 0.3, 0.2][i]}; TRAILER.loadList = HOLZ.logs.filter(o => o.st === 'trailer'); }})()""")
    for i, (sp, L, d0, d1, dx) in enumerate([('spruce', 4.1, 40, 33, -1.2), ('spruce', 4.0, 33, 28, -0.45), ('larch', 3.9, 35, 29, 0.3)]):
        E(f"HOLZ.testLog({{ sp: '{sp}', x: {Y[0]} + {dx}, y: {Y[1]}, az: 0, L: {L}, d0: {d0}, d1: {d1} }})")
    E("""(() => { const id = HOLZ.testLog({ sp: 'spruce', x: 70, y: 70, az: 0, L: 4.0, d0: 38, d1: 31 }), l = HOLZ.logs.find(o => o.id === id), r = (l.d0 + l.d1) / 400;
      const a = [-1.5, -31.65 - 2.0, 0.5 + r], b = [-1.5, -31.65 + 2.0, 0.5 + r], m = [-1.5, -31.65, 0.5 + r]; l.wp0 = a; l.wp1 = b; HOLZSAW.dropOn(l, a, b, m, r); })()""")
    E("TRAILER.cargo = HOLZ.logs.filter(l => l.st === 'trailer').length * 300; HOLZ.redraw()"); steps(0.5)
    print('logs', J("HOLZ.logs.map(l => l.st)"), flush=True)
    # the picture: from the west, the sun behind (afternoon in late October)
    cx, cy, ch, tx, ty, tz = Y[0] - 7.6, Y[1] - 5.6, 1.75, Y[0] + 1.6, Y[1] - 1.2, 0.6
    gz = E(f"ROADS.groundAt({cx}, {cy})"); tg = E(f"ROADS.groundAt({tx}, {ty})")
    yaw = math.degrees(math.atan2(tx - cx, ty - cy)); pitch = math.degrees(math.atan2(tg + tz - gz - ch, math.hypot(tx - cx, ty - cy)))
    E(f"PLAY.select(-1); GAME.setView3(false, true); GAME.view({cx}, {cy}, {gz + ch}, {yaw}, {pitch}, 60)"); steps(0.5); time.sleep(2.5)
    E("GAME.shot()"); E("GAME.shot()")
    d = E("document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9)")
    open(os.path.join(OUT, 'b28.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot b28', flush=True)
    print('errors', [e for e in errs if 'PAGEERR' in e][:5])
