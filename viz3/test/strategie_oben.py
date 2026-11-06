# feat/strategie: what one sees from above at the Klinge (the strategy view, P.th 120 over the meadow by the forest) – which objects stand
# well above the ground there (rays over a grid of the view; reported by name and material), a picture, no page errors. Written to find the
# dark leaf-like things over the meadow (6.11.2026) and to keep them away once they are.
#   python3 viz3/test/strategie_oben.py 9002
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
ck = lib.Checks('strategie_oben')
OUT = lib.out('strategie')
with lib.browser() as b:
    errs = []
    pg = lib.page(b, 1200, 760, errs)
    lib.boot(pg, port, '?szenario=strategie')
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    E("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")
    E("STRAT.W.force = { cloud: 0.2, rain: 0, wind: 8, storm: false, src: 'Test' }")
    J("STRAT.setDate('2026-11-14', 11 * 60)")
    E("(() => { const c = STRAT.place.pos('klinge'); GAME.P.tx = c[0] + 40; GAME.P.ty = c[1] + 30; GAME.P.th = 120; })()")
    for i in range(12): E("GAME.step(0.25)")
    E("GAME.shot(); STHUD.draw()")
    pg.screenshot(path=os.path.join(OUT, 'oben_klinge.png'), timeout=120000)
    res = J("""(() => {
      const THREE = window.THREE, cam = GAME.cam, scene = GAME.scene, out = {}, rc = new THREE.Raycaster(), v = new THREE.Vector2();
      const chainOf = o => { const n = []; for (let p = o, k = 0; p && k < 5; p = p.parent, k++) n.push(p.name || p.type); return n.join(' < '); };
      let rays = 0, high = 0;
      for (let gy = 0; gy < 20; gy++) for (let gx = 0; gx < 30; gx++) {
        v.set((gx + 0.5) / 30 * 2 - 1, -((gy + 0.5) / 20 * 2 - 1)); rays++;
        rc.setFromCamera(v, cam);
        const hits = rc.intersectObjects(scene.children, true).filter(h => { for (let p = h.object; p; p = p.parent) if (!p.visible) return false; return true; });
        if (!hits.length) continue;
        const h = hits[0], g = KERN.ground(h.point.x, -h.point.z) || 0, above = h.point.y - g;
        if (above < 2.5) continue;
        high++;
        const M = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
        const k = chainOf(h.object) + ' | ' + h.object.type + ' | ' + (M ? (M.name || M.type) + (M.map ? ' map' : '') + (M.alphaTest ? ' at' + M.alphaTest : '') + (M.side === 2 ? ' double' : '') : '-');
        const e = out[k] || (out[k] = { n: 0, above: [], inst: h.object.isInstancedMesh ? h.object.count : null });
        e.n++; if (e.above.length < 5) e.above.push(Math.round(above * 10) / 10);
      }
      return { rays, high, cam: [cam.position.x, cam.position.y, cam.position.z].map(Math.round), out: Object.entries(out).sort((a, b) => b[1].n - a[1].n).slice(0, 20) };
    })()""")
    print('rays', res['rays'], 'hits more than 2.5 m above the ground', res['high'], 'camera', res['cam'], flush=True)
    for k, e in res['out']: print('  ', e['n'], k, e, flush=True)
    ck('the view from above at the Klinge was looked at (objects above the ground reported)', res['rays'] > 0, f"{res['high']} of {res['rays']} rays")
    ck.errors(errs)
    ck.done()
