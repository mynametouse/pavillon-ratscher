# Which textures could wait until one comes near (plan phase 2, building block 4): for every texture of the scene the nearest mesh that
# uses it (distance from the garden), its size in pixels and MB; sums by distance band. Diagnostic only (prints, no checks).
#   python3 viz3/test/run.py --port 8951 --serve texprobe
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
PROBE = """(() => {
  const scene = GAME.scene, T = new Map(), s = new THREE.Sphere();
  const KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'displacementMap', 'lightMap'];
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    const g = o.geometry; if (!g) return;
    if (o.isInstancedMesh) { try { o.computeBoundingSphere(); } catch (e) {} }
    if (!g.boundingSphere) g.computeBoundingSphere();
    const bs = o.isInstancedMesh && o.boundingSphere ? o.boundingSphere : g.boundingSphere;
    if (!bs) return;
    s.copy(bs).applyMatrix4(o.matrixWorld);
    const d = Math.max(0, Math.hypot(s.center.x, s.center.z) - s.radius);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      const texs = [];
      for (const k of KEYS) if (m[k] && m[k].isTexture) texs.push(m[k]);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) texs.push(u.value);
      for (const t of texs) {
        const e = T.get(t) || { d: 1e9, n: 0, name: t.name || (t.image && t.image.src ? String(t.image.src).split('/').pop() : ''), w: 0, h: 0, arr: !!t.isDataArrayTexture };
        e.d = Math.min(e.d, d); e.n++;
        const im = t.image; if (im) { e.w = im.width || im.videoWidth || 0; e.h = im.height || im.videoHeight || 0; e.depth = im.depth || 1; }
        T.set(t, e);
      }
    }
  });
  const out = [...T.values()].map(e => ({ ...e, mb: +(e.w * e.h * (e.depth || 1) * 4 * 1.33 / 1e6).toFixed(2) }));
  out.sort((a, b) => b.mb - a.mb);
  return out;
})()"""
with lib.browser() as b:
    errs = []; pg = lib.page(b, 1000, 640, errs, tier='mittel'); lib.boot(pg, port); E = pg.evaluate
    rows = E(PROBE)
    bands = [(0, 60), (60, 150), (150, 300), (300, 800), (800, 1e9)]
    tot = sum(r['mb'] for r in rows)
    print(f'textures {len(rows)}  total ~{tot:.0f} MB (RGBA with mips, as uploaded)')
    for lo, hi in bands:
        sel = [r for r in rows if lo <= r['d'] < hi]
        print(f'  nearest user {lo:>4}–{hi if hi < 1e9 else "∞":>4} m: {len(sel):3d} textures, {sum(r["mb"] for r in sel):6.1f} MB')
    print('largest textures with their nearest user:')
    for r in rows[:45]:
        print(f'  {r["mb"]:6.1f} MB  {r["w"]}×{r["h"]}{"×"+str(r.get("depth")) if r.get("depth",1)>1 else ""}  d={r["d"]:7.1f} m  users={r["n"]:3d}  {r["name"][:60]}')
    json.dump(rows, open(os.path.join(lib.out('texprobe'), 'textures.json'), 'w'), indent=1)
