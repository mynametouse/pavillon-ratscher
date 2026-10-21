# V12b: built-in furniture as planner items – move the desk (things on it go along), turn it, copy it, persistence
import sys, os, time, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1] if len(sys.argv) > 1 else '8765'
OUT = lib.out('v12')
def wait_loaded(pg):
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=900000, polling=1000)
    pg.evaluate("window.NPC && (NPC.update = () => {})")   # neighbours and goats stand still: the software renderer would otherwise redraw non-stop
SCR = """(k => { const it = PLANNER.ITEMS.find(i => i.key === k); const v = GEOH.V(it.x, it.y, it.z + it.size[1] * 0.8).project(GAME.cam); const c = document.querySelector('#stage canvas').getBoundingClientRect(); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; })"""
POS = "(ks => ks.map(k => { const it = PLANNER.ITEMS.find(i => i.key === k) || GLB_PLACED.find(i => i.key === k); return it ? k.split('#')[0] + '@' + it.x.toFixed(2) + ',' + it.y.toFixed(2) + ',' + it.z.toFixed(2) + ' r' + (+it.rot).toFixed(0) : k + ':?'; }).join(' | '))"
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1100, 'height': 700}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); wait_loaded(pg); time.sleep(4)
    print('merged', pg.evaluate("JSON.stringify(GAME.MERGED)"), '| grp items', pg.evaluate("GLB_PLACED.filter(i => i.kind === 'grp').map(i => i.key).join(', ')"))
    print('registered grp', pg.evaluate("PLANNER.ITEMS.filter(i => i.kind === 'grp').length"), '| desk children', pg.evaluate("GLB_PLACED.find(i => i.key === 'grp:desk').root.children.length"))
    near = pg.evaluate("PLANNER.ITEMS.filter(i => !i.removed && i.kind === 'glb' && Math.hypot(i.x - 0.95, i.y - (GAME.GEO.OG ? 0 : 0)) < 9).length")
    pg.evaluate("GAME.view(0.95, 1.9, GAME.GEO.zO + 1.62, 180, -38)"); time.sleep(1.5)
    keys = pg.evaluate("(() => { const d = GLB_PLACED.find(i => i.key === 'grp:desk'); return PLANNER.ITEMS.filter(o => o !== d && !o.removed && o.z > d.z + 0.15 && Math.hypot(o.x - d.x, o.y - d.y) < 1).map(o => o.key); })()")
    print('on the desk', keys); print('before', pg.evaluate(POS, ['grp:desk'] + keys))
    pg.click('#planbtn'); time.sleep(0.5)
    xy = pg.evaluate(SCR, 'grp:desk'); pg.mouse.move(xy[0], xy[1]); pg.mouse.down(); pg.mouse.move(xy[0] + 40, xy[1] + 5, steps=6); pg.mouse.move(xy[0] + 80, xy[1] + 10, steps=6); pg.mouse.up(); time.sleep(1)
    print('selected', pg.evaluate("PLANNER.PLAN.sel && PLANNER.PLAN.sel.key")); print('moved ', pg.evaluate(POS, ['grp:desk'] + keys))
    pg.keyboard.press('r'); time.sleep(0.8); print('turned', pg.evaluate(POS, ['grp:desk'] + keys))
    pg.screenshot(path=os.path.join(OUT, 'c_desk.png'))
    pg.click('#planbar [data-pa="dup"]'); time.sleep(1.2); print('copy', pg.evaluate("PLANNER.ITEMS.filter(i => i.added && !i.removed).map(i => i.type + '@' + i.x.toFixed(2) + ',' + i.y.toFixed(2)).join(' ')"))
    pg.screenshot(path=os.path.join(OUT, 'c_copy.png'))
    lay = pg.evaluate("localStorage.getItem('pav-layout')"); print('layout', lay[:400])
    pg.reload(wait_until='domcontentloaded'); wait_loaded(pg); time.sleep(5)
    print('after reload', pg.evaluate(POS, ['grp:desk'] + keys), '| added', pg.evaluate("PLANNER.ITEMS.filter(i => i.added && !i.removed).map(i => i.type).join(' ')"))
    pg.evaluate("GAME.view(0.95, 1.9, GAME.GEO.zO + 1.62, 180, -38)"); time.sleep(1.5); pg.screenshot(path=os.path.join(OUT, 'c_reload.png'))
    print('errors', errs[:10]); b.close()
