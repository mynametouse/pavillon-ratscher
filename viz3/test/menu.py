# The simpler menu and the introduction for beginners (Falko, 26.10.2026: „Das Menü ist total überladen, bitte vereinfachen, sodass man sich
# auch als Anfänger leicht zurechtfindet. Überlege dir ein Konzept für ein Tutorial und setze es um“; docs/features/tutorial.md).
# Menu: the start page short (back to the game, tasks, things, five areas), each area a page with a back button and its title, Backspace
# back, every button of the old menu still there (other modules and tests find them by id), the places by group. The introduction: not by
# itself under test automation; started, it leads from the model into the garden, notices walking, looking, the menu, the way to Hubert,
# the talk and the tasks, and is saved as done; skipping, closing, the welcome. A phone: the start page fits without scrolling, the card
# for touch, small above the menu sheet. Pictures in out/menu/.
#   python3 viz3/test/menu.py PORT [nogeo=1]
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else 'nogeo=1'
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
QUERY = '?bauphase=0' + ('&nogeo=1' if opts.get('nogeo', '1') == '1' else '')
OUT = lib.out('menu')
ck = lib.Checks('menu')
errs = []
# what the old menu had – modules (audio, input, quests, KI, planner …) and tests find these
IDS = ['questbtn', 'invbtn', 'planbtn', 'gplanbtn', 'facbtn', 'intbtn', 'stilmenubtn', 'sharebtn', 'soundbtn', 'kibtn', 'qualbtn', 'collbtn',
       'fullbtn', 'perfbtn', 'reportbtn', 'volbox', 'figseg', 'crateseg', 'viewseg', 'lockseg', 'fignote', 'scen-menu', 'scen-note', 'ph-menu', 'hint']
SPOTS = ['modell', 'draufsicht', 'garten', 'carport', 'eingang', 'bibliothek', 'treppe', 'arbeitsraum', 'lounge', 'dach', 'wohnwagen', 'holzhaus',
         'bungalow', 'ziegen', 'hubert', 'werkstatt', 'dorf', 'schleusingen', 'vessra']

def visible_buttons(pg, sel):
    return pg.evaluate(f"[...document.querySelectorAll('{sel} button')].filter(b => b.getClientRects().length && !b.closest('[hidden]')).length")

with lib.browser() as b:
    pg = lib.page(b, 1280, 800, errs=errs)
    E = pg.evaluate
    lib.boot(pg, port, QUERY)
    # the first page screenshot draws the whole scene once more in software GL – ~20–35 s on CI and in the container, at the 30 s default
    pg.set_default_timeout(120000)
    # ---------------- the menu ----------------
    ck('every button of the old menu is still there', E(f"{json.dumps(IDS)}.every(id => !!document.getElementById(id))"),
       str(E(f"{json.dumps(IDS)}.filter(id => !document.getElementById(id))")))
    ck('every place is still there', E(f"{json.dumps(SPOTS)}.every(s => !!document.querySelector('#menu [data-spot=\"' + s + '\"]'))"))
    ck('the introduction does not start by itself under test automation', E("!TUT.step && document.getElementById('tutcard').hidden"))
    pg.click('#menubtn'); time.sleep(0.5)
    ck('the menu opens on the start page', E("HUD.open && HUD.page === 'start' && document.getElementById('m-title').textContent === 'Menü'"))
    n = visible_buttons(pg, '#menu .msheet')
    ck('start page: few buttons (back, introduction, tasks, things, five areas, close)', n <= 11, f'{n} buttons')
    ck('start page: five areas', E("document.querySelectorAll('#menu .mnav [data-go]').length") == 5)
    ck('start page: „Neu hier?“ while the introduction is not done', E("!document.getElementById('tutbtn').hidden"))
    ck('start page: tasks and things at hand', E("!!document.getElementById('questbtn').getClientRects().length && !!document.getElementById('invbtn').getClientRects().length"))
    ck('start page: no back button', E("document.getElementById('mback').hidden"))
    pg.screenshot(path=os.path.join(OUT, 'desk_start.png'))
    pages = {}
    for name, title, probe in [('orte', 'Hingehen', '[data-spot="hubert"]'), ('erleben', 'Erleben', '[data-light="auto"]'),
                               ('gestalten', 'Gestalten', '#planbtn'), ('einstellungen', 'Einstellungen', '#figseg'), ('hilfe', 'Hilfe', '#hint')]:
        pg.click(f'#menu [data-go="{name}"]'); time.sleep(0.3)
        pages[name] = E(f"""(() => ({{ page: HUD.page, title: document.getElementById('m-title').textContent, back: !document.getElementById('mback').hidden,
            probe: !!document.querySelector('#menu {probe}').getClientRects().length, start: !!document.querySelector('#menu .mresume').getClientRects().length }}))()""")
        ok = pages[name] == {'page': name, 'title': title, 'back': True, 'probe': True, 'start': False}
        ck(f'page {title}: its title, the back button, what belongs there', ok, json.dumps(pages[name]))
        if name in ('orte', 'einstellungen'): pg.screenshot(path=os.path.join(OUT, f'desk_{name}.png'))
        pg.click('#mback'); time.sleep(0.2)
        if name == 'orte': ck('back: the start again', E("HUD.page === 'start'"))
    pg.click('#menu [data-go="hilfe"]'); time.sleep(0.2)
    pg.keyboard.press('Backspace'); time.sleep(0.2)
    ck('Backspace: back to the start', E("HUD.open && HUD.page === 'start'"))
    ck('places by group (Pavillon, Garten, Nachbarn, Weiter weg …)', E("document.querySelectorAll('#menu [data-page=\"orte\"] .msec h3').length") >= 5)
    pg.keyboard.press('Escape'); time.sleep(0.2)
    ck('Esc closes the menu', E("!HUD.open"))
    E("HUD.setMenu(true, 'einstellungen')")
    ck('opened on a page (HUD.setMenu(true, page))', E("HUD.page === 'einstellungen'"))
    E("HUD.setMenu(false)"); E("HUD.setMenu(true)")
    ck('opened again: the start', E("HUD.page === 'start'"))
    E("HUD.setMenu(false)")
    # a place from the menu still leads there
    E("HUD.setMenu(true, 'orte')"); pg.click('#menu [data-spot="werkstatt"]'); time.sleep(0.3)
    ck('a place from its page: there, menu closed', E("GAME.P.mode === 'walk' && !HUD.open"))
    E("document.querySelector('#menu [data-spot=\"modell\"]').click()"); E("GAME.step(0.2)")
    # ---------------- the introduction ----------------
    E("TUT.start()")
    ck('introduction: starts with going in (from the model)', E("TUT.step") == 'hinein' and E("!document.getElementById('tutcard').hidden"), str(E("TUT.step")))
    ck('introduction: „Losgehen“ lights up', E("document.querySelector('#orbithud .ogo').classList.contains('tut-hi')"))
    pg.screenshot(path=os.path.join(OUT, 'desk_tut1.png'))
    pg.click('#orbithud .ogo'); time.sleep(0.2); E("GAME.step(0.2); TUT.check()")
    ck('introduction: in the garden → walking', E("TUT.step") == 'gehen', str(E("TUT.step")))
    ck('walking: the keys named', 'WASD' in E("document.querySelector('#tutcard .tut-t').textContent").replace(' ', ''))
    E("GAME.step(3, 1)"); E("TUT.check()")
    ck('walking noticed → looking around', E("TUT.step") == 'umschauen', f"{E('TUT.step')} at {E('JSON.stringify(GAME.step(0))')}")
    E("GAME.step(1.5, 0, 1)"); E("TUT.check()")
    if E("TUT.step") == 'umschauen':   # the turn input of GAME.step may be slow: look by the view
        E("(() => { const s = GAME.step(0); GAME.view(s.x, s.y, s.feet + 1.62, GAME.P.yaw + 120, 0); })()"); E("TUT.check()")
    ck('looking noticed → the menu', E("TUT.step") == 'menue', str(E("TUT.step")))
    ck('the menu button lights up', E("document.getElementById('menubtn').classList.contains('tut-hi')"))
    pg.click('#menubtn'); time.sleep(0.3); E("TUT.check()")
    ck('menu open → go somewhere', E("TUT.step") == 'hingehen', str(E("TUT.step")))
    ck('„Hingehen“ lights up', E("document.querySelector('#menu [data-go=\"orte\"]').classList.contains('tut-hi')"))
    r = E("(() => { const c = document.getElementById('tutcard').getBoundingClientRect(), m = document.querySelector('#menu .msheet').getBoundingClientRect(); return { cr: c.right, ml: m.left }; })()")
    ck('the card beside the menu, not on it', r['cr'] <= r['ml'] + 1, json.dumps(r))
    pg.screenshot(path=os.path.join(OUT, 'desk_tut_menu.png'))
    pg.click('#menu [data-go="orte"]'); time.sleep(0.3); E("TUT.check()")
    ck('on the places: Hubert lights up, the text names him', E("document.querySelector('#menu [data-spot=\"hubert\"]').classList.contains('tut-hi')") and 'Hubert' in E("document.querySelector('#tutcard .tut-t').textContent"))
    pg.click('#menu [data-spot="hubert"]'); time.sleep(0.3); E("GAME.step(0.3); TUT.check()")
    ck('at Hubert → talk to him', E("TUT.step") == 'sprechen', str(E("TUT.step")))
    E("GAME.view(NPC.NPCS.hubert.x + 1.4, NPC.NPCS.hubert.y, 1.62, -90, -5); LIFE.force('hubert', 'off'); GAME.step(0.1)")
    E("NPC.NPCUI.start(NPC.NPCS.hubert)"); time.sleep(0.3); E("TUT.check()")
    ck('talking → the talk', E("TUT.step") == 'gespraech', str(E("TUT.step")))
    pg.screenshot(path=os.path.join(OUT, 'desk_tut_talk.png'))
    E("NPC.NPCUI.end(false)"); time.sleep(0.2); E("TUT.check()")
    ck('talk ended → the tasks', E("TUT.step") == 'aufgaben', str(E("TUT.step")))
    E("HUD.setMenu(true)"); E("TUT.check()")
    ck('the tasks light up in the menu', E("document.getElementById('questbtn').classList.contains('tut-hi')"))
    pg.click('#questbtn'); time.sleep(0.3); E("TUT.check()")
    ck('tasks open → done', E("TUT.step") == 'fertig', str(E("TUT.step")))
    E("QUESTS.toggleJournal(false)"); E("LIFE.force('hubert', null)")
    pg.screenshot(path=os.path.join(OUT, 'desk_tut_end.png'))
    pg.click('#tutcard .tut-go'); time.sleep(0.2)
    ck('finished: saved as done, the card away, nothing lights up', E("TUT.state.done && !TUT.step && document.getElementById('tutcard').hidden && !document.querySelector('.tut-hi')"))
    E("HUD.setMenu(true)")
    ck('done: no „Neu hier?“ on the start page, still under Hilfe', E("document.getElementById('tutbtn').hidden && !!document.getElementById('tutbtn2')"))
    E("HUD.setMenu(false)")
    # skipping, closing, the welcome
    E("TUT.start()"); s0 = E("TUT.step")
    pg.click('#tutcard .tut-skip'); time.sleep(0.1)
    ck('„Überspringen“: the next step', E("TUT.step") != s0 and E("TUT.step") is not None, f"{s0} → {E('TUT.step')}")
    pg.click('#tutcard .x'); time.sleep(0.1)
    ck('×: the introduction ends', E("!TUT.step && TUT.state.closed"))
    E("TUT.welcome()")
    ck('the welcome: what this is, two choices', E("TUT.step") == 'willkommen' and E("!document.querySelector('#tutcard .tut-go').hidden && !document.querySelector('#tutcard .tut-skip').hidden"))
    pg.screenshot(path=os.path.join(OUT, 'desk_welcome.png'))
    pg.click('#tutcard .tut-go'); time.sleep(0.1)
    ck('welcome → the introduction', E("TUT.step") not in (None, 'willkommen'), str(E("TUT.step")))
    E("TUT.stop()")
    pg.close()
    # ---------------- a phone held upright ----------------
    p2 = lib.page(b, 390, 844, errs, is_mobile=True, has_touch=True, device_scale_factor=2)
    E = p2.evaluate
    lib.boot(p2, port, QUERY)
    E("HUD.setMenu(true)"); time.sleep(0.4)
    r = E("(() => { const b = document.querySelector('#menu .mbody'), s = document.querySelector('#menu .msheet').getBoundingClientRect(); return { sh: b.scrollHeight, ch: b.clientHeight, top: s.top, h: innerHeight }; })()")
    ck('phone: the start page fits without scrolling', r['sh'] <= r['ch'] + 2, json.dumps(r))
    p2.screenshot(path=os.path.join(OUT, 'phone_start.png'))
    E("HUD.menuPage('orte')"); time.sleep(0.3)
    p2.screenshot(path=os.path.join(OUT, 'phone_orte.png'))
    E("HUD.setMenu(false)")
    E("TUT.start()"); p2.tap('#orbithud .ogo'); time.sleep(0.2); E("GAME.step(0.2); TUT.check()")
    t = E("document.querySelector('#tutcard .tut-t').textContent")
    ck('phone: walking by the circle at the bottom left, the circle lights up', E("TUT.step") == 'gehen' and 'Kreis' in t and E("document.getElementById('joy').classList.contains('tut-hi')"), t[:90])
    r = E("(() => { const c = document.getElementById('tutcard').getBoundingClientRect(); return { l: c.left, r: c.right, t: c.top, b: c.bottom, w: innerWidth, h: innerHeight }; })()")
    ck('phone: the card inside the screen, in the upper half', r['l'] >= 0 and r['r'] <= r['w'] and r['b'] <= r['h'] / 2, json.dumps(r))
    p2.screenshot(path=os.path.join(OUT, 'phone_tut_walk.png'))
    p2.tap('#tutcard .tut-skip'); p2.tap('#tutcard .tut-skip'); time.sleep(0.1)
    ck('phone: skipped to the menu step', E("TUT.step") == 'menue', str(E("TUT.step")))
    p2.tap('#menubtn'); time.sleep(0.4); E("TUT.check()")
    r = E("(() => { const c = document.getElementById('tutcard').getBoundingClientRect(), m = document.querySelector('#menu .msheet').getBoundingClientRect(); return { cb: c.bottom, mt: m.top }; })()")
    ck('phone: with the menu open the card small above the sheet', E("TUT.step") == 'hingehen' and r['cb'] <= r['mt'] + 1, json.dumps(r))
    p2.screenshot(path=os.path.join(OUT, 'phone_tut_menu.png'))
    E("TUT.stop()")
    ck.errors(errs)
ck.done()
