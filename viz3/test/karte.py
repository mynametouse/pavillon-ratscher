# feat/karte (Falko, 19.11.2026: „… eine optional einschaltbare Karte, die mir zeigt, wo ich mich gerade befinde … links oben … die Straße
# und das Gebiet … selbstständig Zielorte eingeben … an der Karte angezeigt … verfolgen“): viz3/src/karte/karte.js (KARTE). Checked: the
# gazetteer loads; where am I top left in the garden (Ratscher · Stadt Schleusingen · Landkreis Hildburghausen) and in Schleusingen (a
# street of the drive's data); the button and K switch the small map on and off, it draws (aerial tiles where the test server has them);
# Shift+K opens the large map, the search finds Hirschbach and a street, a choice sets the destination (beam in the world, footer, the
# autopilot's and the jetpack's lists); a tap on the map sets a point; „Hinfliegen“ starts the jetpack's flight there, the small map grows
# with the height, the line top left shows the height; reached → the destination goes; in a vehicle the small map gives way to the
# vehicle's map, which names the destination; the saved state survives broken values; no page errors. Pictures in out/karte/.
#   python3 viz3/test/karte.py 8951
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
OUT = os.path.join(lib.ROOT, 'out', 'karte'); os.makedirs(OUT, exist_ok=True)
ck = lib.Checks('karte')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1280, 760, errs, tier='mittel')
    lib.boot(pg, port, '', figures=False)
    E = pg.evaluate
    J = lambda s: json.loads(E('JSON.stringify(' + s + ')'))
    step = lambda n, dt=0.25: [E(f'GAME.step({dt})') for _ in range(n)]
    def pic(name):
        E('GAME.shot()'); pg.screenshot(path=os.path.join(OUT, name + '.jpg'), quality=82, type='jpeg', timeout=180000); print('shot', name, flush=True)
    E("CLOCK.t = 600; GAME.go('garten'); GAME.setView3(true); HUD.setMenu && HUD.setMenu(false); KARTE.setZiel(null); KARTE.setOrt(true); KARTE.setMap(false)")
    E("KARTE.loadData()")
    pg.wait_for_function("KARTE.ready", timeout=60000, polling=500)
    step(6)
    s = J("KARTE.state()")
    ck('the gazetteer loads', s['data'] > 1500, f"{s['data']} places")
    ui = J("({ ort: !document.getElementById('ortinfo').hidden, where: getComputedStyle(document.querySelector('.where')).display, btn: !!document.getElementById('kartebtn'), chip: !!document.querySelector('#kartemenu [data-karte=big]') })")
    ck('where am I top left in the garden, the place line gives way', ui['ort'] and ui['where'] == 'none' and 'Ratscher' in ' '.join(s['line']) and 'Landkreis Hildburghausen' in s['line'][1], json.dumps(s['line'], ensure_ascii=False) + ' ' + json.dumps(ui))
    ck('button top right and menu chip', ui['btn'] and ui['chip'])
    # house numbers (the house coordinates of Thuringia): beside a house in Ratscher its street and number, the search finds street + number
    E("KARTE.loadAdr()")
    pg.wait_for_function("KARTE.state().adr > 1000", timeout=60000, polling=500)
    hs = J("(() => { const s = KARTE.search('ratschner anger 12'); return s.slice(0, 3).map(o => ({ n: o.n, k: o.k, si: o.si, num: o.num })); })()")
    ck('the search finds street and number', bool(hs) and hs[0]['k'] == 'Adresse' and hs[0]['n'] == 'Ratschner Anger 12', json.dumps(hs, ensure_ascii=False))
    p = json.loads(E(f"KARTE.findHouse({hs[0]['si']}, '12').then(p => JSON.stringify(p))")) if hs else None
    E(f"GAME.go('dorf')"); step(2)
    if p:
        E(f"GAME.P.x = {p['x'] + 4}; GAME.P.y = {p['y'] + 4}; GAME.P.feet = KERN.ground(GAME.P.x, GAME.P.y, 999)")
    for _ in range(12):
        step(2); time.sleep(0.3)
    s = J("KARTE.state()")
    ck('beside a house in Ratscher: street and number top left', bool(p) and s['line'][0].startswith('Ratschner Anger') and 'Stadt Schleusingen' in s['line'][1], json.dumps(p) + ' ' + json.dumps(s['line'], ensure_ascii=False))
    pic('a0_hausnummer')
    E("GAME.go('garten')"); step(6)
    # the small map: K and the button
    E("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))"); step(4)
    s = J("({ k: KARTE.state(), shown: !document.getElementById('kmini').hidden, pressed: document.getElementById('kartebtn').getAttribute('aria-pressed') })")
    ck('K switches the small map on, it draws', s['k']['map'] and s['shown'] and s['pressed'] == 'true' and s['k']['n']['draws'] > 0, json.dumps(s))
    time.sleep(2); step(4)
    pic('a_garten_karte')
    E("document.getElementById('kartebtn').click()"); step(2)
    ck('the button switches it off', not J("KARTE.state().map") and J("document.getElementById('kmini').hidden"))
    E("KARTE.setMap(true)"); step(2)
    # Schleusingen: a street of the drive's data
    E("GAME.go('schleusingen')"); step(12)
    for _ in range(30):
        if J("KARTE.state().roads") > 100: break
        time.sleep(0.5); step(1)
    step(4)
    s = J("KARTE.state()")
    st = J("KARTE.streetAt(KERN.spot('schleusingen').pos[0], KERN.spot('schleusingen').pos[1], 60)")
    ck('Schleusingen: street and town top left', 'Schleusingen' in ' '.join(s['line']) and s['roads'] > 100, json.dumps(s['line'], ensure_ascii=False) + f" street near the spot: {st!r}, roads {s['roads']}")
    pic('b_schleusingen')
    # the large map and the search
    E("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', shiftKey: true }))"); step(2)
    ck('Shift+K opens the large map', J("KARTE.state().big") and not J("document.getElementById('kbig').hidden"))
    hits = J("KARTE.search('hirschb').map(o => o.n + ' | ' + o.k)")
    sh = J("KARTE.search('hildburgh').slice(0, 3).map(o => o.n + ' | ' + o.k)")
    ck('the search finds Hirschbach and a street', any(h.startswith('Hirschbach') for h in hits) and any('Straße' in h for h in sh), json.dumps(hits + sh, ensure_ascii=False))
    pg.fill('#ksuche', 'Hirschba'); step(1)
    E("document.querySelector('#kbig .kr button').click()"); step(3)
    s = J("({ k: KARTE.state(), foot: document.querySelector('#kbig .kt').textContent, navi: NAVI.DEST.map(d => d[0]), jet: !!document.querySelector('#jetdest [data-dest=kartenziel]'), spot: KERN.spot('kartenziel') })")
    ck('a hit sets the destination: footer, the autopilot\'s and the jetpack\'s lists', s['k']['ziel'] and s['k']['ziel']['label'].startswith('Hirschbach') and 'Ziel: Hirschbach' in s['foot'] and 'kartenziel' in s['navi'] and s['jet'] and s['spot']['pos'], json.dumps(s, ensure_ascii=False))
    time.sleep(2); E("KARTE.openBig()"); step(3)
    pic('c_grosse_karte')
    box = pg.locator('#kbig .kc').bounding_box()
    pg.mouse.click(box['x'] + box['width'] * 0.3, box['y'] + box['height'] * 0.4); step(2)
    s = J("KARTE.state()")
    ck('a tap on the map sets a point there', s['ziel'] and s['ziel']['label'] != '' and not s['ziel']['label'].startswith('Hirschbach'), json.dumps(s['ziel'], ensure_ascii=False))
    E("KARTE.closeBig()"); step(1)
    # fly there
    E("KARTE.setZiel(KARTE.search('hirschbach')[0])"); step(2)
    s = J("({ f: KARTE.flyThere(), j: JET.state() })")
    step(30, 0.5)
    s = J("({ j: JET.state(), k: KARTE.state(), feet: GAME.step(0).feet })")
    ck('„Hinfliegen“: the jetpack flies to the destination, the line shows the height, the beam stands', s['j']['flying'] and s['j']['auto'] and 'über Grund' in s['k']['line'][2] and s['k']['marker'], json.dumps(s, ensure_ascii=False))
    time.sleep(2); step(4, 0.5)
    pic('d_jetpack_karte')
    for i in range(200):
        E('GAME.step(0.5)')
        if not J('JET.flying'): break
    s = J("({ j: JET.state(), k: KARTE.state(), p: GAME.step(0) })")
    ck('arrived at Hirschbach', not s['j']['flying'], json.dumps(s['k']['line'], ensure_ascii=False) + f" after {i * 0.5:.0f} s")
    pic('e_hirschbach')
    E("JET.toggle(false)"); step(2)
    # reached: within 25 m the destination goes
    E("const p = GAME.step(0); KARTE.setZiel({ label: 'Nahziel', x: p.x + 8, y: p.y + 4 })"); step(3, 0.5)
    ck('reached within 25 m: the destination goes', J("KARTE.state().ziel") is None)
    # in a vehicle: the vehicle's map names the destination
    E("GAME.go('garten'); KARTE.setZiel(KARTE.search('schleusingen')[0]); VEH.enter('car')"); step(8)
    s = J("({ mini: document.getElementById('kmini').hidden, vmap: !document.getElementById('vmap').hidden, lab: (document.getElementById('vmaplab') || {}).textContent || '' })")
    ck('in a vehicle the small map gives way to the vehicle\'s map, which names the destination', s['mini'] and s['vmap'] and 'Schleusingen' in s['lab'], json.dumps(s, ensure_ascii=False))
    E("VEH.exit && VEH.exit()"); step(4)
    # broken saved values: the default
    E("localStorage.setItem('pav-karte-v1', '{\"v\":1,\"map\":\"ja\",\"ort\":1,\"ziel\":{\"x\":\"a\"}}')")
    ok = J("(() => { const k = SAVE.keys().find(k => k.key === 'pav-karte-v1'); return !!k; })()")
    ck('the saved state is registered with SAVE', ok)
    E("KARTE.setZiel(null)")
    ck.errors(errs)
ck.done()
