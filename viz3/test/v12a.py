# V12 smoke test: boot, plan view, select + drag a building, rotate, draw a fence, gate, undo, persistence after reload
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
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); wait_loaded(pg)
    print('loaded', round(time.time() - t0), 's | merged', pg.evaluate("JSON.stringify(GAME.MERGED)"), '| builds', pg.evaluate("Object.keys(BUILD).join(',')"), '| fences', pg.evaluate("FENCES.length"))
    print('errors after load', errs[:6])
    pg.click('[data-spot="draufsicht"]'); time.sleep(2.5)
    print('mode', pg.evaluate("GAME.P.mode"), '| sitebar', pg.evaluate("!document.getElementById('sitebar').hidden"), '| svg texts', pg.evaluate("document.querySelectorAll('#topsvg text').length"))
    pg.screenshot(path=os.path.join(OUT, 'top_1.png'))
    # bungalow on screen
    xy = pg.evaluate("""(() => { const B = BUILD.bungalow, r = GEOH.bldRects(B)[0]; const v = GEOH.V(r.c[0], r.c[1], 2.0).project(GAME.cam); const c = document.querySelector('#stage canvas').getBoundingClientRect(); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; })()""")
    print('bungalow at', [round(v) for v in xy])
    pg.mouse.move(xy[0], xy[1]); pg.mouse.down(); pg.mouse.move(xy[0] + 30, xy[1] + 10, steps=6); pg.mouse.move(xy[0] + 60, xy[1] + 25, steps=6); pg.mouse.up(); time.sleep(1.0)
    print('bungalow moved', pg.evaluate("[BUILD.bungalow.dx, BUILD.bungalow.dy, BUILD.bungalow.da]"), '| sel', pg.evaluate("SITEPLAN.S.sel"), '| warn', pg.evaluate("document.getElementById('sb-warn').textContent"))
    pg.click('#sitebar [data-sa="rotr"]'); time.sleep(0.6)
    print('after rotr', pg.evaluate("[BUILD.bungalow.dx, BUILD.bungalow.dy, BUILD.bungalow.da]"), '| inputs', pg.evaluate("[sbdx=document.getElementById('sb-dx').value, document.getElementById('sb-dy').value, document.getElementById('sb-da').value]"))
    pg.screenshot(path=os.path.join(OUT, 'top_2.png'))
    # collider / floor moved with it: the bungalow floor under its new centre
    print('floor at new centre', pg.evaluate("(() => { const r = GEOH.bldRects(BUILD.bungalow)[0]; return GAME.floorAt(r.c[0], r.c[1], 1.0); })()"), '| at old centre', pg.evaluate("GAME.floorAt(8.6, 15.0, 1.0)"))
    print('bungalow doors', pg.evaluate("BUILD.bungalow.doors.map(q => q.key + ':' + DOORS[q.key].hx.toFixed(2) + ',' + DOORS[q.key].hy.toFixed(2)).join(' ')"))
    # draw a fence: three taps west of the pavilion, then Fertig
    pg.click('#sitebar [data-sa="draw"]'); time.sleep(0.3)
    pts = pg.evaluate("""(() => { const c = document.querySelector('#stage canvas').getBoundingClientRect(); return [[-6, -6], [-6, -16], [2, -16]].map(([x, y]) => { const v = GEOH.V(x, y, 0).project(GAME.cam); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; }); })()""")
    for q in pts: pg.mouse.click(q[0], q[1]); time.sleep(0.35)
    print('draw pts', pg.evaluate("SITEPLAN.S.draw && SITEPLAN.S.draw.pts"))
    pg.click('#sitebar [data-sa="finish"]'); time.sleep(0.8)
    print('fences', pg.evaluate("FENCES.map(f => f.kind + ':' + f.pts.length + (f.gate != null ? ' gate' : '')).join(' | ')"), '| fsel', pg.evaluate("!!SITEPLAN.S.fsel"))
    pg.click('#sitebar [data-sa="gate"]'); time.sleep(0.8)
    print('after gate', pg.evaluate("FENCES.map(f => f.kind + ':' + f.pts.length + (f.gate != null ? ' gate@' + f.gate.toFixed(2) : '')).join(' | ')"), '| doors with fence', pg.evaluate("Object.values(DOORS).filter(d => d.fence).map(d => d.key).join(',')"))
    pg.screenshot(path=os.path.join(OUT, 'top_3.png'))
    st = pg.evaluate("localStorage.getItem('pav-site')"); print('saved site', st[:300])
    # undo the gate, then reload and check persistence
    pg.click('#sitebar [data-sa="undo"]'); time.sleep(0.8)
    print('after undo', pg.evaluate("FENCES.map(f => f.kind + ':' + f.pts.length + (f.gate != null ? ' gate' : '')).join(' | ')"))
    print('errors', errs[:8])
    pg.reload(wait_until='domcontentloaded'); wait_loaded(pg); time.sleep(3)
    print('after reload bungalow', pg.evaluate("[BUILD.bungalow.dx, BUILD.bungalow.dy, BUILD.bungalow.da]"), '| fences', pg.evaluate("FENCES.map(f => f.kind + ':' + f.pts.length + (f.gate != null ? ' gate' : '')).join(' | ')"))
    pg.evaluate("GAME.go('bungalow')"); time.sleep(1.5); print('spot bungalow', pg.evaluate("[GAME.P.x.toFixed(2), GAME.P.y.toFixed(2), GAME.P.yaw.toFixed(1)]"))
    pg.screenshot(path=os.path.join(OUT, 'walk_bungalow.png'))
    print('errors final', errs[:10]); b.close()
