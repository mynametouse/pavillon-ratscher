# Gallery picture 27 (V16c2): a tree felled the professional way – the stump with notch, hinge and band, the stem lying in the chosen
# direction. The felled state cannot be set up by bilder.py, so this script fells the first marked tree cut by cut (as test/v16c.py 'fell'
# does) and then takes the picture like bilder.py (offline quality, 1280 × 720, JPEG 0.9) into dist/img/b27.jpg.
#   PORT=8951 python3 viz3/test/b27.py        (~8 min)
import sys, os, time, json, math, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = os.environ.get('PORT', '8951'); OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'img'); os.makedirs(OUT, exist_ok=True)
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1280, 720, errs, tier='hoch'); lib.boot(pg, port, query='?offline=1', figures=True); E = pg.evaluate
    E("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#toast').forEach(e => e.style.visibility = 'hidden')")
    steps = lambda secs: E(f"for (let i = 0; i < {int(secs / 0.025)}; i++) GAME.step(0.025)")
    def act(aid): return E(f"(() => {{ const a = PLAY.acts().find(a => a.id === '{aid}'); if (!a) return null; let l = null; try {{ l = a.label(); }} catch (e) {{ l = 'ERR ' + e; }} PLAY.run(a); return l; }})()")
    def go(): return E("(() => { const b = document.querySelector('#machwin .go'); if (!b || document.getElementById('machwin').hidden) return false; b.click(); return true; })()")
    def wait_hold(gauge=False):
        for i in range(60):
            if E("!!(PLAY.hold && " + ("PLAY.hold.g" if gauge else "true") + ")"): return True
            time.sleep(0.2); E("GAME.step(0.025)")
        return False
    def gauge(k):
        if not wait_hold(True): return None
        h = json.loads(E("JSON.stringify({ dur: PLAY.hold.dur, t: PLAY.hold.t })")); E(f"for (let i = 0; i < {int((k * h['dur'] - h['t']) / 0.025)}; i++) GAME.step(0.025)"); E("PLAY.primary()"); return h
    def hold():
        if not wait_hold(): return None
        d = E("PLAY.hold.dur"); steps(d + 0.3); return d
    rec = lambda: json.loads(E("JSON.stringify((() => { const r = FELL.rec(); return r ? { st: r.st, az: r.az } : null; })())"))
    E("CLOCK.t = Math.round(Date.UTC(2026, 9, 22) / 864e5 - (DN.jdOf(0) - 2440587.5 + 0.5 | 0)) * 1440 + 13 * 60 + 30; DN.update(true)"); lib.settle_light(pg)
    k = E("FELL.kitPos()"); E(f"GAME.view({k[0]} - 1.2, {k[1]}, ROADS.groundAt({k[0]} - 1.2, {k[1]}) + 1.7, 90, -10, 62); GAME.step(0.2)")
    act('fell:kit'); steps(0.2); go(); steps(0.3)
    t = json.loads(E("JSON.stringify((() => { const t = FELL.marked[0]; return { id: t.id, x: t.x, y: t.y }; })())"))
    E(f"GAME.view({t['x']} - 1.4, {t['y']} - 0.6, ROADS.groundAt({t['x']} - 1.4, {t['y']} - 0.6) + 1.7, 60, 10, 62); GAME.step(0.2)")
    act('fell:pick'); steps(0.2); go(); steps(0.2); az = rec()['az']
    act('fell:op'); hold()
    act('fell:op'); steps(0.1); go(); gauge(0.53)
    act('fell:op'); steps(0.1); go(); gauge(0.8); steps(1.0)
    act('fell:op'); hold(); act('fell:op'); steps(2.4)
    act('fell:op'); steps(0.1); go(); gauge(0.55)
    act('fell:op'); hold(); act('fell:op'); steps(2.4)
    act('fell:op'); hold(); steps(3.4)
    for i in range(30):
        steps(0.5)
        if rec()['st'] == 'down': break
    print('state', rec(), flush=True)
    # the picture: from beside the stump, looking past it along the stem
    fx, fy = math.sin(math.radians(az)), math.cos(math.radians(az)); rx, ry = fy, -fx
    cx, cy = t['x'] - fx * 2.6 + rx * 1.9, t['y'] - fy * 2.6 + ry * 1.9; gz = E(f"ROADS.groundAt({cx}, {cy})")
    tx, ty = t['x'] + fx * 5.0, t['y'] + fy * 5.0; tg = E(f"ROADS.groundAt({tx}, {ty})")
    yaw = math.degrees(math.atan2(tx - cx, ty - cy)); pitch = math.degrees(math.atan2(tg + 0.2 - gz - 1.55, math.hypot(tx - cx, ty - cy)))
    E(f"PLAY.select(-1); GAME.setView3(false, true); GAME.view({cx}, {cy}, {gz + 1.55}, {yaw}, {pitch}, 64)"); steps(0.5); time.sleep(2.5)
    E("GAME.shot()"); E("GAME.shot()")
    d = E("document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9)")
    open(os.path.join(OUT, 'b27.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot b27', flush=True)
    print('errors', [e for e in errs if 'PAGEERR' in e][:5])
