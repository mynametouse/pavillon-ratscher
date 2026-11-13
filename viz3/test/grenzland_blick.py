# feat/grenzland: a look at the whole mode for the eye – one walk through what Falko sees first: the first mission's opening in
# Schleusingen, the garden with the moped, the phone, the radio, the moped from outside and from the saddle, the barn with the skittle
# alley, the shop on wheels, a wanted level with the radar, the flashback of 1989, a phone held upright. Few checks (the panel's and the
# radar's places, no page errors); the pictures are the point: out/grenzland_blick/.
#   python3 viz3/test/grenzland_blick.py 9011        (~8 min in the chat machine)
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
import grenzland_ci
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = grenzland_ci.wrap(lib.Checks('grenzland_blick'), 'grenzland_blick')
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
            E("GAME.shot && GAME.shot()")
            pg.screenshot(path=os.path.join(OUT, name + '.png')); print('shot', name, flush=True)
        except Exception as e:
            print('shot failed', name, e)
    def settle(n=10, s=0.3):
        for _ in range(n):
            steps(s); time.sleep(0.35)
    def part(name, fn):
        try:
            fn()
        except Exception as e:
            ck('the part „%s“ runs through' % name, False, repr(e)[:300])
    # ---- the first mission opens in Schleusingen ----
    def m1():
        for _ in range(60):
            steps(0.4); time.sleep(0.5)
            if E("!!GRENZLAND.partnerOf()"): break
        settle(10, 0.5)
        inf = J("({ cur: GLSTATE.cur, w: KERN.where() })")
        ck('the scene opens with the first mission', inf['cur'] != '', str(inf)[:300])
        pic('01_mission1_beginn')
    part('mission 1', m1)
    # (the town and the village in one page are more than the chat machine's browser may hold: free play after a reload)
    def neu():
        E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; "
          "GLSTATE.cur = ''; GLSTATE.kap1 = true; GLSTATE.pos = [4, 15, 0]; GLSTATE.save(true); })()")
        lib.boot(pg, port, '', figures=True)
        for _ in range(80):
            steps(0.3); time.sleep(0.5)
            if E("!!(window.GLSTATE && GLSTATE.on && window.GRENZLAND && GRENZLAND.partnerOf())"): break
    part('reload', neu)
    # ---- free play in the garden ----
    def frei():
        E("(() => { GLMISSION.stop(); const d = GLMISSION.debug; if (d && d.info) for (const id of Object.keys(d.info().st || {})) GLSTATE.m[id] = { st: 'erledigt', i: 0, n: 0 }; "
          "GLSTATE.cur = ''; GLSTATE.kap1 = true; GLHUD.fade(false); if (window.GLRADIO && GLRADIO.off) GLRADIO.off(); GLFAHNDUNG.off = true; "
          "CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 17 * 60 + 20; GAME.go('garten'); "
          "GLAUTO.mopedAt(GLDATA.ORTE.moped.pos[0], GLDATA.ORTE.moped.pos[1], GLDATA.ORTE.moped.az * Math.PI / 180); GLSTATE.tank = 3; GLSTATE.save(true); })()")
        settle(8)
        lib.settle_light(pg)
        E("(() => { const m = GLDATA.ORTE.moped.pos; GAME.view(m[0] - 3.2, m[1] - 2.6, KERN.ground(m[0], m[1]) + 1.5, 50, -12); })()")
        settle(4)
        pic('02_garten_moped')
        box = J("(() => { const r = document.getElementById('glmap').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), "
                "x: Math.round(r.left), y: Math.round(r.top), vh: innerHeight } })()")
        ck('the radar is a small round map bottom left', 150 < box['w'] < 200 and box['w'] == box['h'] and box['x'] < 40 and box['y'] > box['vh'] / 2, str(box))
    part('free play', frei)
    # ---- the phone, the radio ----
    def handy():
        E("GLHANDY.sms && GLHANDY.sms('Jule', 'Staumauer, 20 Uhr. Bring Gemisch mit.'); GLHANDY.toggle(); 0")
        settle(4)
        pic('03_handy')
        E("GLHANDY.close ? GLHANDY.close() : GLHANDY.toggle(); 0")
        E("GLRADIO.next(); 0")
        settle(8, 0.5)
        pic('04_radio')
    part('phone and radio', handy)
    # ---- the moped: from outside, from the saddle ----
    def moped():
        E("GAME.view(104, -316, KERN.ground(104, -316) + 1.6, 30, -5); GLAUTO.mopedAt(108, -312, 0.5)")
        steps(0.5)
        E("if (window.CAM3) CAM3.want = true; VEH.enter('gl-moped')")
        steps(1.2)
        vm = J("({ v: getComputedStyle(document.getElementById('vmap')).display, o: document.getElementById('glort').textContent })")
        ck('on the moped the game\'s own small map is hidden, the vehicle\'s name shows', vm['v'] == 'none' and len(vm['o']) > 2, str(vm))
        pic('05_moped_aussen')
        E("VEH.auto = () => ({ thr: 1, brk: 0, steer: 0, hand: false })")
        steps(5, 0.05)
        E("if (window.CAM3) CAM3.want = false")
        steps(0.5, 0.05)
        pic('06_moped_sattel')
        E("VEH.auto = null; VEH.exit(); if (window.GLRADIO && GLRADIO.off) GLRADIO.off()")
        steps(0.5)
    part('moped', moped)
    # ---- the barn with the skittle alley, the shop on wheels ----
    def orte():
        E("(() => { const a = GLORTE.P.treff, b = GLORTE.P.scheune, d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, x = b[0] + (a[0] - b[0]) / d * 17, y = b[1] + (a[1] - b[1]) / d * 17; "
          "GAME.view(x, y, KERN.ground(x, y) + 1.7, Math.atan2(b[0] - x, b[1] - y) * 180 / Math.PI, -3); })()")
        settle(6)
        pic('07_scheune')
        E("(() => { const w = GLORTE.P.wagen, x = w[0] - 9, y = w[1] - 7; GAME.view(x, y, KERN.ground(x, y) + 1.65, Math.atan2(w[0] - x, w[1] - y) * 180 / Math.PI, -3); })()")
        settle(6)
        pic('08_verkaufswagen')
    part('places', orte)
    # ---- wanted: the panel and the radar ----
    def fahndung():
        E("GAME.view(226, -112, KERN.ground(226, -112) + 1.62, 300, -4)")
        E("GLFAHNDUNG.off = false; GLFAHNDUNG.tat('schlag', { force: [{ name: 'Probe' }] })")
        settle(6, 0.5)
        pic('09_gesucht')
        E("GLFAHNDUNG.clear(); GLFAHNDUNG.off = true")
    part('wanted', fahndung)
    # ---- 1989 ----
    def damals():
        E("window.__in = false; GL89.enter({ pos: [238.5, -72.5], yaw: 320 }).then(() => { window.__in = true; }); 0")
        for _ in range(40):
            steps(0.3); time.sleep(0.4)
            if E("window.__in === true"): break
        settle(8)
        lib.settle_light(pg)
        steps(1)
        pic('10_1989_schule')
        E("GAME.view(226, -106, KERN.ground(226, -106) + 1.62, 20, -4)")
        settle(6)
        pic('11_1989_anger')
        E("window.__in = true; GL89.leave().then(() => { window.__in = false; }); 0")
        for _ in range(30):
            steps(0.3); time.sleep(0.4)
            if E("window.__in === false"): break
        settle(4)
    part('1989', damals)
    # ---- a phone held upright ----
    def hochkant():
        pg.set_viewport_size({'width': 390, 'height': 800})
        E("GAME.go('garten')")
        settle(6)
        box = J("(() => { const r = document.getElementById('glmap').getBoundingClientRect(), q = document.getElementById('qtrack').getBoundingClientRect(); "
                "return { w: Math.round(r.width), x: Math.round(r.left), y: Math.round(r.top), qb: Math.round(q.bottom), vh: innerHeight } })()")
        ck('on a phone the radar sits top left under the task card, smaller', 90 < box['w'] < 130 and box['y'] < box['vh'] / 2, str(box))
        pic('12_handy_hochkant')
    part('phone upright', hochkant)
    E("GRENZLAND.stop()")
    steps(0.5)
    ck.errors(errs)
    ck.done()
