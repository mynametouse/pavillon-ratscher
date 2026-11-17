# feat/jetpack (Falko, 17.11.2026: „… einen Jetpack anlegen … hoch und weit fliegen … Überblick … über der Stadt … cool aussehen, Spaß
# machen … schnell herumreisen“): viz3/src/jetpack/jetpack.js (JET) and the hook J1 in game/game.js physics. Checked: the button at the top
# right and the chip in Menü → Hingehen, putting it on (third-person view, the pack on the back), the take-off with Space, the climb, flying
# forwards with Shift (fast low down, faster high up), the overview (camera 220 m back and looking down, the names of the places), flying to
# Schleusingen by itself (it arrives and lands within a few metres of the spot), landing back to walking with the pack still on, taking it
# off; in the zombie night it stays off; no page errors. Pictures in out/jetpack/.
#   python3 viz3/test/jetpack.py 8951
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
OUT = os.path.join(lib.ROOT, 'out', 'jetpack'); os.makedirs(OUT, exist_ok=True)
ck = lib.Checks('jetpack')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1200, 720, errs, tier='mittel')
    lib.boot(pg, port, '', figures=True)
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    step = lambda n, a='': [E('GAME.step(0.25' + a + ')') for _ in range(n)]
    E("CLOCK.t = 600; GAME.go('garten'); GAME.setView3(true); HUD.setMenu && HUD.setMenu(false)")
    step(12)
    ui = J("({ btn: !!document.getElementById('jetbtn'), shown: !!document.getElementById('jetbtn') && !document.getElementById('jetbtn').hidden, chip: !!document.querySelector('#jetmenu [data-jet]') })")
    ck('button and menu chip', ui['btn'] and ui['shown'] and ui['chip'], json.dumps(ui))
    E("document.getElementById('jetbtn').click()")
    step(4)
    s = J("({ j: JET.state(), panel: !document.getElementById('jetpanel').hidden, view3: CAM3.on })")
    ck('put on: worn, on the back, panel, third person', s['j']['worn'] and s['j']['pack'] and s['panel'] and s['view3'], json.dumps(s))
    lib.shot(pg, OUT, 'a_angelegt')
    f0 = J("GAME.step(0)")['feet']
    E("window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))")
    step(12)
    E("window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }))")
    s = J("({ j: JET.state(), p: GAME.step(0) })")
    ck('Space takes off and climbs', s['j']['flying'] and s['p']['feet'] - f0 > 12, f"{s['p']['feet'] - f0:.1f} m up, {json.dumps(s['j'])}")
    lib.shot(pg, OUT, 'b_schweben')
    p0 = J("GAME.step(0)")
    step(16, ', 1, 0, 0, 1.9')
    s = J("({ j: JET.state(), p: GAME.step(0) })")
    d = ((s['p']['x'] - p0['x']) ** 2 + (s['p']['y'] - p0['y']) ** 2) ** 0.5
    ck('Shift forwards: fast', d > 120 and s['j']['thrust'] > 0.4, f'{d:.0f} m in 4 s, {json.dumps(s["j"])}')
    lib.shot(pg, OUT, 'c_flug')
    E("JET.overview(true)")
    step(8, ', 1, 0, 0, 1.9')
    s = J("JET.state()")
    ck('overview: camera far back, looking down, place names', s['cam'] > 150 and s['pitch'] < -40 and s['labels'], json.dumps(s))
    lib.shot(pg, OUT, 'd_uebersicht')
    E("JET.overview(false); JET.flyTo('schleusingen', 'Schleusingen')")
    for i in range(240):
        E('GAME.step(0.5)')
        if not J('JET.flying'): break
    s = J("({ j: JET.state(), p: GAME.step(0), sp: KERN.spot('schleusingen').pos })")
    d = ((s['p']['x'] - s['sp'][0]) ** 2 + (s['p']['y'] - s['sp'][1]) ** 2) ** 0.5
    ck('flies to Schleusingen by itself and lands there', not s['j']['flying'] and s['j']['worn'] and d < 8, f'{d:.1f} m from the spot after {i * 0.5:.0f} s')
    lib.shot(pg, OUT, 'e_schleusingen')
    E("window.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }))"); step(2)
    ck('9 takes it off', not J('JET.worn'))
    E("window.ZSTATE = window.ZSTATE || {}; window.__z = ZSTATE.on; ZSTATE.on = true")
    ck('in the zombie night it stays off', E('JET.toggle(true)') is False and not J('JET.worn'))
    E("ZSTATE.on = window.__z")
    ck.errors(errs)
ck.done()
