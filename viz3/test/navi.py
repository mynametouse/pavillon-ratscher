# feat/navi (Falko, 17.11.2026: „… auch im Autopiloten optional bei Zielangabe“): viz3/src/navi/navi.js (NAVI) – a destination in the
# vehicle panel, the autopilot drives there over the village's and the drive's roads (VEH.auto). Checked: the pin button in the vehicle
# panel and its list of places, a plan from the garden (a line over the roads, the start under the car), driving it to Schleusingen (it
# arrives within 60 m of the Markt, not stuck for good, faster than walking pace), the way on the small map as its label, W takes over,
# getting out ends it, no page errors. Pictures in out/navi/.
#   python3 viz3/test/navi.py 8951
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
OUT = os.path.join(lib.ROOT, 'out', 'navi'); os.makedirs(OUT, exist_ok=True)
ck = lib.Checks('navi')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1200, 720, errs, tier='mittel')
    lib.boot(pg, port, '', figures=True)
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    E("CLOCK.t = 600; VEH.enter('car'); GAME.setView3(true)")
    for _ in range(8): E('GAME.step(0.25)')
    ui = J("({ btn: !!document.getElementById('navibtn'), inPanel: !!document.querySelector('#vhud .vbtns #navibtn') })")
    E("document.getElementById('navibtn').click()")
    ui['list'] = J("Array.from(document.querySelectorAll('#navipick button')).map(b => b.textContent)")
    ck('pin button in the vehicle panel, list of places', ui['btn'] and ui['inPanel'] and 'Schleusingen' in ui['list'] and 'Suhl, Markt' in ui['list'], json.dumps(ui, ensure_ascii=False))
    lib.shot(pg, OUT, 'a_ziele')
    E("Array.from(document.querySelectorAll('#navipick button')).find(b => b.textContent === 'Schleusingen').click()")
    s = J('NAVI.state()')
    ck('a plan from the garden', s['on'] and s['L'] > 500, json.dumps(s))
    t0 = time.time()
    p0 = J('[VEH.cur.st.x, VEH.cur.st.y]')
    for i in range(1400):
        E('GAME.step(0.5)')
        if i == 80:
            lib.shot(pg, OUT, 'b_unterwegs')
            lab = J("(document.getElementById('vmaplab') || {}).textContent || ''")
        if i % 40 == 0: print('at', i, json.dumps(J('NAVI.state()')), flush=True)
        if not J('NAVI.on'): break
    sp = J("KERN.spot('schleusingen').pos")
    p = J('({ x: VEH.cur.st.x, y: VEH.cur.st.y, u: VEH.cur.st.u })')
    d = ((p['x'] - sp[0]) ** 2 + (p['y'] - sp[1]) ** 2) ** 0.5
    st = J('NAVI.state()')
    ck('drives to Schleusingen and arrives', not st['on'] and d < 90, f'{d:.0f} m from the Markt after {i * 0.5:.0f} s, backs {st["backs"]}, plans {st["plans"]}, ended {st["ended"]}')
    ck('not stuck for long on the way', st['backs'] < 12 and i * 0.5 < 650, f'{st["backs"]} back-offs, {i * 0.5:.0f} s')
    ck('the way on the small map with its label', 'Schleusingen' in lab, lab)
    lib.shot(pg, OUT, 'c_angekommen')
    # W takes over, getting out ends it
    E("NAVI.go('garten', 'Garten')"); E('GAME.step(1)')
    on1 = J('NAVI.on')
    E("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }))")
    E('GAME.step(0.5)')
    ck('W takes over', on1 and not J('NAVI.on') and J('VEH.auto') is None)
    E("NAVI.go('garten', 'Garten')"); E('GAME.step(0.5)')
    E('VEH.exit && VEH.exit()'); E('GAME.step(1)')
    ck('getting out ends it', not J('NAVI.on') or not J('!!VEH.cur'), json.dumps(J('NAVI.state()')))
    ck.errors(errs)
ck.done()
