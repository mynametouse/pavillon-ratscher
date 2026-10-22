import sys, json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8811/chars/figtest.html'); pg.wait_for_function('window.ready', timeout=60000)
    pg.evaluate("makeFig('ronald', {h: 1.72})")
    for n in (1, 5, 30, 100):
        pg.evaluate(f"sim({n}, 0.033, 0, 'stand', 0, {{pos: [0, 1.6, 1.4], at: [0, 1.5, 0]}})")
        r = pg.evaluate("""(() => { const B = FIG.bones; const m = FIG.model; const out = {};
          for (const c of ['Hips', 'Spine2', 'Head', 'LeftUpLeg']) out[c] = B[c].quaternion.toArray().map(v => +v.toFixed(3));
          out.hipsWorldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(B.Hips.getWorldQuaternion(new THREE.Quaternion())).toArray().map(v => +v.toFixed(2));
          return out; })()""")
        print(n, json.dumps(r))
    print(errs)
    b.close()
