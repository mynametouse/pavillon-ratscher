# V17g (Falko, 3.11.2026: „Es hat zuletzt ziemlich geruckelt auch am Rechner“): what a frame costs and how often the sun's shadow map is
# drawn anew – draw calls and triangles of the main pass and the shadow pass at three places (garden gate, Hubert's yard, the Anger), the
# new shadow maps asked for in 10 s of standing still and on a walk of about 140 m, the levels of detail and view distances at work.
# The limits leave room above V17g (the shadow map was asked for 1.5 times a second standing still before, every 1.2 s walking).
#   python3 viz3/test/leistung.py PORT [tier=hoch]
import sys, os, time, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
OUT = lib.out('leistung')
ck = lib.Checks('leistung')
errs = []
COUNT = r"""
(() => {
  const R = GAME.R, I = { M: [0, 0], S: [0, 0] }, rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const n = geometry.index ? geometry.index.count : geometry.attributes.position ? geometry.attributes.position.count : 0,
      r = I[scene ? 'M' : 'S'];
    r[0]++;
    r[1] += Math.round((group ? group.count : n) / 3) * (object.isInstancedMesh ? object.count : 1);
    return rbd.call(this, camera, scene, geometry, material, object, group);
  };
  try { R.shadowMap.needsUpdate = true; GAME.film(0, true); } finally { R.renderBufferDirect = rbd; }
  return { calls: I.M[0], tris: I.M[1], shCalls: I.S[0], shTris: I.S[1], culled: window.CULL ? CULL.n : -1,
           lod: VEG.lod.filter(L => L.ms && L.cur > 0).length, lodSets: VEG.lod.filter(L => L.ms).length };
})()
"""
SPOTS = [
    ('Gartentor', "GAME.view(2.6, 29.0, KERN.ground(2.6, 29.0) + 1.6, 180, -4, 62)", 1050, 2.6e6, 700e3),
    ('Huberts Hof', "GAME.view(-4.0, 34.5, KERN.ground(-4.0, 34.5) + 1.6, 285, -3, 62)", 500, 1.6e6, 600e3),
    ('Anger', "GAME.view(240.0, -112.0, KERN.ground(240.0, -112.0) + 1.6, 250, -2, 62)", 750, 1.5e6, 200e3),
]
ROUTE = [(3.6, 15.2), (4.0, 24.0), (4.0, 31.5), (4.5, 34.5), (40.0, 31.0), (60.0, 30.0), (60.0, 34.0), (20.0, 36.0), (0.0, 36.0)]
res = {'spots': {}}
with lib.browser() as b:
    pg = lib.page(b, 960, 540, errs, tier=opts.get('tier', 'hoch'))
    lib.boot(pg, port, '?bauphase=0', figures=True); E = pg.evaluate
    E("CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + 14 * 60; DN.update(true)"); lib.settle_light(pg)
    ck('levels of detail and view distances there', E("!!(window.VEG && VEG.add && window.CULL && window.DIRTY)"))
    for name, view, lc, lt, ls in SPOTS:
        E(view); E("for (let i = 0; i < 8; i++) GAME.step(0.25)"); time.sleep(1.0)
        r = E(COUNT); res['spots'][name] = r
        ck(f'{name}: draw calls', r['calls'] <= lc, f"{r['calls']} (≤ {lc}), {r['tris'] / 1e6:.2f} M triangles, {r['culled']} far small meshes not drawn, {r['lod']} of {r['lodSets']} tree sets coarser")
        ck(f'{name}: triangles', r['tris'] <= lt, f"{r['tris'] / 1e6:.2f} M (≤ {lt / 1e6:.1f} M)")
        ck(f'{name}: shadow map', r['shTris'] <= ls, f"{r['shCalls']} calls, {r['shTris'] / 1e3:.0f} k triangles (≤ {ls / 1e3:.0f} k)")
    an = res['spots']['Anger']
    ck('the Anger: small things far away not drawn', an['culled'] > 100, f"{an['culled']} meshes")
    ck('the Anger: the garden trees in their coarse levels', an['lod'] > 10, f"{an['lod']} sets")
    # standing still in the garden, 10 s game time: new shadow maps asked for. GAME.step draws nothing, so a request is taken as drawn
    # (as the frame loop would draw it): cleared, and the sun's direction noted as the map's (core/assets.js SHADOWN)
    E("""window.__drawn = () => { if (!DIRTY.shadow) return false; DIRTY.shadow = false;
      const L = GAME.scene.children.find(o => o.isDirectionalLight && o.castShadow);
      if (L && window.SHADOWN) { SHADOWN.dir.subVectors(L.position, L.target.position).normalize(); SHADOWN.n++; } return true; }; true""")
    E("GAME.view(3.6, 15.2, KERN.ground(3.6, 15.2) + 1.6, 200, 0, 62); GAME.step(1); __drawn()")
    n = 0
    for i in range(100):
        E("GAME.step(0.1)")
        if E("__drawn()"): n += 1
    res['idle_shadow_10s'] = n
    ck('standing still: few new shadow maps', n <= 6, f'{n} in 10 s (V17f: about 15)')
    # walking (collisions off, the walker's own steps)
    E("GAME.setCollide && GAME.setCollide(false)")
    E(f"GAME.view({ROUTE[0][0]}, {ROUTE[0][1]}, KERN.ground({ROUTE[0][0]}, {ROUTE[0][1]}) + 1.6, 0, 0, 62); GAME.step(0.1); __drawn()")
    walked, n = 0.0, 0
    for (tx, ty) in ROUTE[1:]:
        for k in range(300):
            x, y = E("[GAME.P.x, GAME.P.y]")
            if math.hypot(tx - x, ty - y) < 1.0: break
            E(f"GAME.P.yaw = {math.degrees(math.atan2(tx - x, ty - y))}; GAME.step(0.1, 1, 0, 0, 1)")
            x2, y2 = E("[GAME.P.x, GAME.P.y]"); walked += math.hypot(x2 - x, y2 - y)
            if E("__drawn()"): n += 1
    res['walk'] = {'m': round(walked), 'shadow': n}
    ck('walking: new shadow maps per 100 m', walked > 80 and n / walked * 100 <= 40, f'{n} on {walked:.0f} m (V17f: about 85 per 100 m)')
    json.dump(res, open(os.path.join(OUT, 'leistung.json'), 'w'), indent=1)
ck.errors(errs)
ck.done()
