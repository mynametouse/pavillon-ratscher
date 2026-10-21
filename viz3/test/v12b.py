# V12 deeper checks: labels/outlines in the plan view, workshop move (machines, saw), fence collision, furniture with buildings,
# a published plan.json applied on first visit, plan code round trip, share box
import sys, os, time, json
from playwright.sync_api import sync_playwright
port = sys.argv[1] if len(sys.argv) > 1 else '8765'
OUT = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/v12'
def wait_loaded(pg):
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=900000, polling=1000)
    pg.evaluate("window.NPC && (NPC.update = () => {})")   # neighbours and goats stand still: the software renderer would otherwise redraw non-stop
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1200, 'height': 760}); pg = ctx.new_page(); pg.set_default_timeout(180000); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); wait_loaded(pg); time.sleep(4)
    print('loaded', round(time.time() - t0), 's | published plan applied:', pg.evaluate("[BUILD.carport.dx, BUILD.carport.dy, BUILD.carport.da, localStorage.getItem('pav-plan-ts'), !!SITEPLAN.S.published]"))
    print('plan fences', pg.evaluate("FENCES.map(f => f.kind + ':' + f.pts.length).join(' | ')"), '| facade', pg.evaluate("JSON.stringify(FACADE.state())"), '| variant', pg.evaluate("GAME.variant()"))
    pg.click('[data-spot="draufsicht"]'); time.sleep(3)
    print('svg visible', pg.evaluate("getComputedStyle(document.getElementById('topsvg')).display"), '| labels', pg.evaluate("[...document.querySelectorAll('#topsvg text')].map(t => t.textContent).join(', ')"))
    pg.screenshot(path=os.path.join(OUT, 'b_top_1.png'))
    # workshop: move 3 m north, turn 10°; machine buttons and sounds follow
    m0 = pg.evaluate("JSON.stringify(Object.values(DOORS).filter(d => d.kind === 'machine').map(d => d.pos.map(v => +v.toFixed(2))))")
    pg.evaluate("SITEPLAN.select('werkstatt')"); pg.fill('#sb-dy', '3'); pg.press('#sb-dy', 'Enter'); time.sleep(0.5); pg.fill('#sb-da', '10'); pg.press('#sb-da', 'Enter'); time.sleep(0.8)
    print('werkstatt', pg.evaluate("[BUILD.werkstatt.dx, BUILD.werkstatt.dy, BUILD.werkstatt.da]"), '| warn', pg.evaluate("document.getElementById('sb-warn').textContent"))
    print('machines before', m0, '\n         after ', pg.evaluate("JSON.stringify(Object.values(DOORS).filter(d => d.kind === 'machine').map(d => d.pos.map(v => +v.toFixed(2))))"))
    print('workshop items', pg.evaluate("BUILD.werkstatt.items.slice(0,4).map(it => it.type + '@' + it.x.toFixed(2) + ',' + it.y.toFixed(2) + ' r' + (+it.rot).toFixed(0)).join(' ')"))
    pg.screenshot(path=os.path.join(OUT, 'b_top_2.png'))
    # holzhaus items move along; furniture reset keeps them with the building
    print('holzhaus items before', pg.evaluate("BUILD.holzhaus.items.map(it => it.type + '@' + it.x.toFixed(2) + ',' + it.y.toFixed(2)).join(' ')"))
    pg.evaluate("SITEPLAN.select('holzhaus')"); pg.fill('#sb-dx', '-2'); pg.press('#sb-dx', 'Enter'); time.sleep(0.6)
    print('holzhaus items after ', pg.evaluate("BUILD.holzhaus.items.map(it => it.type + '@' + it.x.toFixed(2) + ',' + it.y.toFixed(2)).join(' ')"))
    pg.evaluate("PLANNER.resetLayout()"); time.sleep(0.5)
    print('holzhaus items reset ', pg.evaluate("BUILD.holzhaus.items.map(it => it.type + '@' + it.x.toFixed(2) + ',' + it.y.toFixed(2)).join(' ')"), '| layout', pg.evaluate("localStorage.getItem('pav-layout')"))
    # fence collision in walk mode: a fence drawn across the lawn west of the pavilion blocks walking
    pg.evaluate("SITEPLAN.select(null)"); pg.evaluate("(() => { const f = GEOH.mkFence({ kind: 'wood', pts: [[-6, -3], [-6, -9]] }); SITEPLAN.applySite(SITEPLAN.siteState()); })()"); time.sleep(0.5)
    print('fences now', pg.evaluate("FENCES.map(f => f.kind + ':' + f.pts.length).join(' | ')"))
    pg.evaluate("GAME.view(-4, -6, 1.62, -90, 0)"); r = pg.evaluate("GAME.sim(1, 0, 0, 3)"); print('walk west into the wooden fence ->', r)
    pg.screenshot(path=os.path.join(OUT, 'b_fence_walk.png'))
    # plan code round trip
    code = pg.evaluate("JSON.stringify(SITEPLAN.fullState())"); print('plan code', len(code), 'chars')
    pg.evaluate("SITEPLAN.applySite(null)"); print('after reset', pg.evaluate("[BUILD.werkstatt.dy, FENCES.length]"))
    pg.evaluate(f"SITEPLAN.applyFull({code})"); time.sleep(0.5); print('after code import', pg.evaluate("[BUILD.werkstatt.dy, BUILD.werkstatt.da, FENCES.length]"))
    # share box (not on github.io here: shows the link and the plan code)
    pg.click('[data-spot="draufsicht"]'); time.sleep(0.5); pg.click('#sharebtn'); time.sleep(0.5)
    print('share box', pg.evaluate("document.getElementById('sh-body').innerText.slice(0, 300).replace(/\\n/g, ' / ')"))
    pg.screenshot(path=os.path.join(OUT, 'b_share.png'))
    print('errors', errs[:10]); b.close()
