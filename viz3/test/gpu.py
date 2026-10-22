# V16b1 GPU limits and ground: visits every part of the world (garden, pavilion inside, workshop, village by car, the Klinge, plan view,
# night), so that every shader program gets compiled, then checks that none uses more textures than a GPU must allow (16 per stage –
# the near ground once used 21 and vanished on such GPUs) and none failed; looks down at the ground in each place and checks that ground
# was drawn there (not sky). Pictures in out/gpu/. Usage: python3 test/gpu.py <port>
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; OUT = lib.out('gpu'); ok = []; fails = []
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
# places: name, x, y, eye height, yaw, pitch (looking down at the ground)
SPOTS = [('garden_lawn', 6, 12, 1.7, 30, -55), ('field_path', 10, 30, 1.7, 117, -50), ('garden_south', -4, -20, 1.7, 180, -55),
         ('near_edge', 60, -60, 1.7, 135, -50), ('village', 108, -93, 1.7, 116, -50), ('l1625', -150, -405, 1.7, 230, -45), ('klinge', -560, -592, 1.7, 110, -45)]
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1000, 640, errs, tier='mittel'); lib.boot(pg, port); E = pg.evaluate
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    print('limits', E("JSON.stringify((gl => ({ frag: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), vert: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS), comb: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) }))(GAME.R.getContext()))"), flush=True)
    for mode, t in [('day', 13 * 60), ('night', 23 * 60 + 30)]:
        E(f"CLOCK.t = {t}; DN.update(true)"); lib.settle_light(pg)
        for name, x, y, h, yaw, pitch in SPOTS:
            E(f"GAME.view({x}, {y}, (window.ROADS ? ROADS.groundAt({x}, {y}) : 0) + {h}, {yaw}, {pitch}, 60); GAME.step(0.1)"); lib.shot(pg, OUT, f'{mode}_{name}')
            # ground or sky? the lower third of the picture against the sky colour straight up
            r = json.loads(E("""JSON.stringify((() => { GAME.shot(); const c = document.querySelector('#stage canvas'), w = 96, h = 60, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                const g = cv.getContext('2d'); g.drawImage(c, 0, 0, w, h); const d = g.getImageData(0, h * 2 / 3, w, h / 3).data; let s = [0, 0, 0], n = 0, blue = 0;
                for (let i = 0; i < d.length; i += 4) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++; if (d[i + 2] > d[i] + 25 && d[i + 2] > 140) blue++; } return { mean: s.map(v => Math.round(v / n)), blue: +(blue / n).toFixed(2) }; })())"""))
            if mode == 'day': check(f'ground drawn at {name}', r['blue'] < 0.35, str(r))
        if mode == 'day':   # inside the pavilion, the workshop, the plan view, a car ride: their programs too
            E("GAME.go('bibliothek'); GAME.step(0.5)"); lib.shot(pg, OUT, 'day_inside')
            E("GAME.go('werkstatt'); GAME.step(0.5)"); lib.shot(pg, OUT, 'day_workshop')
            if E("!!window.VEH"): E("VEH.enter('car'); GAME.setView3(true)"); E("for (let i = 0; i < 40; i++) GAME.step(0.05)"); lib.shot(pg, OUT, 'day_car'); E("VEH.exit(); GAME.step(0.5)")
            E("GAME.go('draufsicht'); GAME.step(0.5)"); lib.shot(pg, OUT, 'day_plan'); E("GAME.go('garten'); GAME.step(0.5)")
    good, r = lib.check_gl(pg)
    print('programs', r['programs'], 'max textures fragment', r['maxFrag'], 'vertex', r['maxVert'], flush=True)
    for x in r['bad']: print('  too many:', x, flush=True)
    for x in r['broken']: print('  broken:', x, flush=True)
    check('every shader within 16 textures per stage', good, f"fragment {r['maxFrag']}, vertex {r['maxVert']}")
    errs = [e for e in errs if 'Texture marked' not in e]
    print('\n'.join(errs[:20]) or 'no errors'); check('no errors', not errs)
    print(f"{len(ok)} ok, {len(fails)} failed: {fails}")
