# Profile: draw calls and memory for typical views, cost of every per-frame callback (TICKS) while walking, load phases.
#   python3 viz3/test/prof.py 8951
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]; errs = []
with lib.browser() as b:
    pg = lib.page(b, 1000, 600, errs); lib.boot(pg, port); E = pg.evaluate
    print('load', E("JSON.stringify({ prepMs: GAME.RENDER.prepMs, bench: GAME.RENDER.bench, tier: GAME.RENDER.tier, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null })"))
    # name the ticks by their source text (first 60 characters) and time them
    E("""(() => { window.__tp = []; TICKS.forEach((f, i) => { const name = (f.name || '') + ' ' + String(f).slice(0, 70).replace(/\\s+/g, ' ');
      const rec = { i, name, t: 0, n: 0 }; __tp.push(rec); TICKS[i] = function (dt) { const a = performance.now(); try { return f.apply(this, arguments); } finally { rec.t += performance.now() - a; rec.n++; } }; }); })()""")
    SPOTS = [('house', "GAME.view(-6.4, -3.8, 1.65, 55, 8, 64)"), ('werkstatt', "GAME.go('werkstatt')"), ('garden', "GAME.view(2.0, -9.0, 1.65, 0, 6, 70)")]
    if E("!!(window.FOREST && FOREST.ready)"): SPOTS.append(('wald', "GAME.view(-478, -602, ROADS.groundAt(-478, -602) + 1.65, 100, 3, 64)"))   # V16c the forest at the Klinge
    for spot, view in SPOTS:
        E(view); E("GAME.setView3(true, true)"); E("GAME.step(0.5)")
        E("__tp.forEach(r => { r.t = 0; r.n = 0; })")
        t0 = time.time(); E("GAME.step(10, 1, 0.15, 0)"); dt = time.time() - t0     # 10 s of walking forward while turning
        info = E("(() => { GAME.shot(); const i = GAME.R.info; return JSON.stringify({ calls: i.render.calls, tris: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, prog: i.programs ? i.programs.length : null }); })()")
        top = E("JSON.stringify(__tp.slice().sort((a, b) => b.t - a.t).slice(0, 8).map(r => [Math.round(r.t), r.n, r.name.slice(0, 90)]))")
        print(f'== {spot}: 10 s game time stepped in {dt:.1f} s real · render {info}')
        for t, n, name in json.loads(top): print(f'   {t:6d} ms /{n:4d}  {name}')
    print('objects', E("(() => { let m = 0, g = 0, l = 0, v = 0; GAME.scene.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) { m++; if (o.visible) v++; } if (o.isGroup) g++; if (o.isLight) l++; }); return JSON.stringify({ meshes: m, visibleFlag: v, groups: g, lights: l, ticks: TICKS.length }); })()"))
    print('\n'.join(errs[:10]) or 'no errors')
