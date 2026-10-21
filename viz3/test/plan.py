import time, json, base64, os
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 800, 'height': 450}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.type + ': ' + m.text[:200]) if m.type == 'error' and '404' not in m.text else None)
    pg.goto('http://localhost:8765/index.html?offline=1', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=600000, polling=2000)
    E = lambda js: pg.evaluate(js)
    time.sleep(1.0); E("localStorage.removeItem('pav-layout'); document.querySelectorAll('.bar,.toggles,.where,#joy,.pad').forEach(e=>e.style.visibility='hidden')")
    print('items', E("PLANNER.ITEMS.length"), E("PLANNER.ITEMS.slice(0,6).map(i=>[i.key,i.label,+i.x.toFixed(2),+i.y.toFixed(2),+i.z.toFixed(2),i.rot])"))
    # go to library, enable planning, select the side table via raycast at screen centre-ish
    E("GAME.go('bibliothek'); GAME.P.x=2.6; GAME.P.y=3.0; GAME.P.yaw=128; GAME.P.pitch=-28; GAME.shot()"); E("PLANNER.setPlan(true)")
    print('planbar', E("document.getElementById('planbar').hidden"))
    def shot(name):
        E("GAME.shot(); GAME.shot()"); d = E("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.85)"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
    # find the side table item and project to screen
    sp = E("""(()=>{ const it=PLANNER.ITEMS.find(i=>i.type==='side_table'); if(!it) return null; const v=new (GAME.cam.position.constructor)(it.x, it.z+0.3, -it.y); v.project(GAME.cam); const r=GAME.R.domElement.getBoundingClientRect(); return [it.key, (v.x+1)/2*r.width+r.left, (1-v.y)/2*r.height+r.top]; })()""")
    print('side table on screen', sp)
    if sp:
        x, y = sp[1], sp[2]
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 60, y + 10, steps=8); pg.mouse.move(x + 120, y + 20, steps=8); pg.mouse.up(); time.sleep(0.3)
        it = E("(()=>{const it=PLANNER.ITEMS.find(i=>i.type==='side_table'); return [+it.x.toFixed(2),+it.y.toFixed(2),+it.z.toFixed(2), PLANNER.PLAN.sel&&PLANNER.PLAN.sel.key]; })()"); print('after drag', it, 'sel name', E("document.getElementById('pb-name').textContent"))
        E("document.querySelector('#planbar [data-pa=rotr]').click()"); print('rot', E("PLANNER.ITEMS.find(i=>i.type==='side_table').rot"))
        shot('p_drag')
        # stack: move the bowl onto the side table position
        E("""(()=>{ const t=PLANNER.ITEMS.find(i=>i.type==='side_table'); const bw=PLANNER.ITEMS.find(i=>i.type==='bowl'); PLANNER.select(bw); const f={fx:0.1,fy:0.1}; bw.x=t.x; bw.y=t.y; bw.z=PLANNER.supportZ(t.x,t.y,0.08,0.08,bw.z,bw.colIdx); })()""")
        print('bowl z on table', E("(()=>{const bw=PLANNER.ITEMS.find(i=>i.type==='bowl'); return [+bw.z.toFixed(2), +PLANNER.ITEMS.find(i=>i.type==='side_table').z.toFixed(2)]})()"))
    # add an item from the palette
    E("document.querySelector('#planbar [data-pa=add]').click()"); print('palette buttons', E("document.querySelectorAll('#palette .prow button').length"))
    E("[...document.querySelectorAll('#palette .prow button')].find(b=>b.textContent==='Gartenbank').click()"); time.sleep(0.5)
    print('added', E("PLANNER.ITEMS.filter(i=>i.added).map(i=>[i.type,+i.x.toFixed(2),+i.y.toFixed(2),+i.z.toFixed(2)])"))
    E("[...document.querySelectorAll('#palette .prow button')].find(b=>b.textContent==='Sessel').click()"); time.sleep(1.5)
    print('added2', E("PLANNER.ITEMS.filter(i=>i.added).map(i=>[i.type,+i.x.toFixed(2),+i.y.toFixed(2),+i.z.toFixed(2)])"))
    print('saved', E("localStorage.getItem('pav-layout')")[:300])
    shot('p_added')
    # outdoor: add fire bowl and lounger on the lawn
    E("PLANNER.select(null); GAME.go('garten'); GAME.P.pitch=-10"); E("[...document.querySelectorAll('#palette .prow button')].find(b=>b.textContent==='Feuerschale').click()"); time.sleep(0.3); E("[...document.querySelectorAll('#palette .prow button')].find(b=>b.textContent==='Liege').click()"); time.sleep(0.3)
    E("(()=>{const l=PLANNER.ITEMS.filter(i=>i.added).pop(); l.x+=1.6; PLANNER.PLAN.sel=l; })()"); E("document.querySelector('#planbar [data-pa=rotr]').click()"); shot('p_outdoor')
    # reload persistence
    pg.reload(wait_until='domcontentloaded', timeout=300000); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=600000, polling=2000); time.sleep(4)
    print('after reload added', E("PLANNER.ITEMS.filter(i=>i.added).length"), 'side table', E("(()=>{const it=PLANNER.ITEMS.find(i=>i.type==='side_table'); return it?[+it.x.toFixed(2),+it.y.toFixed(2),it.rot]:null})()"))
    print('errors', errs[:6]); b.close()
