# V16a checks: moon phases (zoomed), daytime moon, plan view at night, neighbours at night, October date, fixed night for the gallery
import sys, os, time, base64, json
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/v16a'; os.makedirs(OUT, exist_ok=True)
def shot(pg, name):
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
    time.sleep(3); pg.evaluate("window.FREEZE = true"); E = lambda js: pg.evaluate(js)
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false, true)")
    def at(day, h, m, view):
        E(f"CLOCK.t = {(day - 1) * 1440 + h * 60 + m}; GAME.view({','.join(map(str, view))}); DN.update(true)")
        for i in range(80):
            E("GAME.step(0.05)")
            if E("DN.ready()"): break
            time.sleep(0.3)
        E("DN.update(true); GAME.step(0.05)")
        print(E("JSON.stringify(Object.assign((s => ({ t: DN.dateStr() + ' ' + CLOCK.hm(), sunEl: +s.sunEl.toFixed(1), moonAz: +s.moonAz.toFixed(1), moonEl: +s.moonEl.toFixed(1), il: +s.illum.toFixed(2) }))(DN.state), DN.dbg()))"), flush=True)
    # moon phases, zoomed (fov 3)
    at(22, 22, 0, [2.5, 12.0, 1.65, 215.3, 24.7, 3]); shot(pg, 'm_firstq_22jun_2200')
    at(22, 20, 0, [2.5, 12.0, 1.65, 183.1, 31.3, 3]); shot(pg, 'm_firstq_day_2000')
    at(22, 20, 0, [2.5, 12.0, 1.65, 183.1, 22, 60]); shot(pg, 'm_daymoon_wide')
    at(8, 6, 0, [2.5, 12.0, 1.65, 159.0, 31.5, 3]); shot(pg, 'm_lastq_8jun_0600')
    at(2, 0, 45, [2.5, 12.0, 1.65, 157, 7.5, 3]); shot(pg, 'm_full_2jun_0045')
    # neighbours at night: look away from Ronald for a few seconds
    at(1, 23, 0, [2.0, -9.0, 1.65, 270, 0, 60]); E("GAME.step(3.0)")
    print('npc night', E("JSON.stringify({ r: { away: !!NPC.NPCS.ronald.away, vis: NPC.NPCS.ronald.fig.g.visible }, h: { away: !!NPC.NPCS.hubert.away, vis: NPC.NPCS.hubert.fig.g.visible } })"))
    at(2, 7, 0, [2.0, -9.0, 1.65, 270, 0, 60]); E("GAME.step(3.0)")
    print('npc morning', E("JSON.stringify({ r: { away: !!NPC.NPCS.ronald.away, vis: NPC.NPCS.ronald.fig.g.visible }, h: { away: !!NPC.NPCS.hubert.away, vis: NPC.NPCS.hubert.fig.g.visible } })"))
    # plan view at night: neutral midday light
    at(1, 23, 30, [2.0, -9.0, 1.65, 0, 6, 70]); E("GAME.go('draufsicht')"); E("GAME.step(0.5)"); print('top', E("JSON.stringify(DN.dbg())")); shot(pg, 'top_at_night')
    E("GAME.go('werkstatt'); GAME.step(0.5)"); print('back', E("JSON.stringify(DN.dbg())"))
    # October: the "today" button
    E("CLOCK.setWin(true)"); time.sleep(0.3); E("document.querySelector('#clockwin [data-dmon=\"0\"]').click()"); time.sleep(0.3)
    print('today', E("DN.dateStr(CLOCK.t, true) + ' | ' + document.querySelector('#clockwin .ckdate').innerText.replace(/\\n/g, ' | ')")); E("CLOCK.setWin(false)")
    d = E("Math.floor(CLOCK.t / 1440) + 1")
    at(d, 13, 0, [2.0, -9.0, 1.65, 0, 6, 70]); shot(pg, 'oct_1300')
    at(d, 18, 15, [9.9, -1.0, 1.65, -80, 8, 72]); shot(pg, 'oct_1815')
    E(f"(() => {{ const q = DN.e0; }})()")
    # back to June 1 and the fixed night for the gallery
    E("CLOCK.setWin(true)"); E("document.querySelector('#clockwin [data-dmon=\"-1\"]').click()"); E("document.querySelector('#clockwin [data-dmon=\"-1\"]').click()"); E("document.querySelector('#clockwin [data-dmon=\"-1\"]').click()"); E("document.querySelector('#clockwin [data-dmon=\"-1\"]').click()"); time.sleep(0.3)
    print('back to', E("DN.dateStr(CLOCK.t, true)")); E("CLOCK.setWin(false)")
    E("document.querySelector('[data-light=\"night\"]').click()")
    for i in range(60):
        E("GAME.step(0.05)")
        if E("DN.ready()"): break
        time.sleep(0.3)
    for v, n in [([2.6, 15.5, 1.65, 160, 9, 66], 'g_b21a'), ([4.0, 17.5, 1.65, 165, 12, 60], 'g_b21b'), ([-6.4, -3.8, 1.65, 55, 8, 64], 'g_b21c')]:
        E(f"GAME.view({','.join(map(str, v))}); GAME.step(0.2)"); shot(pg, n)
    E("document.querySelector('[data-light=\"auto\"]').click()"); E("GAME.step(0.2)")
    print('\n'.join(errs[:20]) or 'no errors'); b.close()
