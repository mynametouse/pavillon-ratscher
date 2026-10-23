// A player figure from two Rocketbox avatars with the same 3ds Max Biped skeleton (all adult women share one, all adult men another):
// the clothed body of one ('body' material) and the head of the other ('head' = face, neck, modelled hair; 'opacity' = alpha-tested hair
// cards and lashes). Optional: limbs and chest a little thicker (radial scaling around the bones, by skin weight) for a sturdier build.
// Output like build_player.mjs: mesh GLB with the Biped rig, no animations (the clip sets pclips_m / pclips_f fit, same skeleton).
//   node fig_mesh.mjs <name> <body.fbx> <head.fbx|-> <out dir> [build.json]
// build.json: { "thick": { "<Biped bone>": factor, … }, "torso": factor, "torsoTop": cm below the neck joint where the torso widening ends }
import fs from 'node:fs';
import path from 'node:path';
import { THREE } from './node_shims.mjs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const [NAME, BODY, HEAD, OUTDIR, BUILD] = process.argv.slice(2);
if (!OUTDIR) throw new Error('usage: node fig_mesh.mjs <name> <body.fbx> <head.fbx|-> <out dir> [build.json]');
const cfg = BUILD ? JSON.parse(fs.readFileSync(BUILD, 'utf8')) : {};
const US = 0.01; // FBX centimetres → metres
const ab = (p) => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const load = (p) => { const o = new FBXLoader().parse(ab(p), ''); for (const c of [...o.children]) if (c.isLight || c.isCamera) o.remove(c); o.updateMatrixWorld(true); return o; };
const skinned = (o) => { const a = []; o.traverse((x) => x.isSkinnedMesh && a.push(x)); if (a.length !== 1) console.warn('skinned meshes', a.length); return a[0]; };
const role = (n) => (/opacity/i.test(n) ? 'opacity' : /head/i.test(n) ? 'head' : /body/i.test(n) ? 'body' : null);

const body = load(BODY), mb = skinned(body);
const head = HEAD && HEAD !== '-' ? load(HEAD) : null, mh = head ? skinned(head) : mb;
const gb = mb.geometry.index ? mb.geometry.toNonIndexed() : mb.geometry, gh = mh.geometry.index ? mh.geometry.toNonIndexed() : mh.geometry;
const bonesB = mb.skeleton.bones, idxB = Object.fromEntries(bonesB.map((b, i) => [b.name, i]));
// the same skeleton? (bind matrices of same-named bones)
{ let worst = 0, miss = 0;
  mh.skeleton.bones.forEach((b, i) => { const j = idxB[b.name]; if (j == null) { miss++; return; }
    const e1 = mh.skeleton.boneInverses[i].elements, e2 = mb.skeleton.boneInverses[j].elements; for (let k = 0; k < 16; k++) worst = Math.max(worst, Math.abs(e1[k] - e2[k])); });
  console.log('skeleton check: largest bind difference', worst.toExponential(2), 'bones missing in the body rig', miss);
  if (worst > 0.05) throw new Error('the two avatars do not share the skeleton'); }
const toB = mb.bindMatrixInverse.clone().multiply(mh.bindMatrix), toBn = new THREE.Matrix3().getNormalMatrix(toB), headSame = toB.equals(new THREE.Matrix4());

// ---- collect the triangles: body from the body avatar, head and opacity from the head avatar ----
const ATTR = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];
const parts = { body: [], head: [], opacity: [] }; // per role: list of { g, mesh, start, count }
const take = (mesh, g, roles) => { const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const gr of g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }]) {
    const r = role(mats[gr.materialIndex].name); if (r && roles.includes(r)) parts[r].push({ g, mesh, start: gr.start, count: gr.count }); } };
take(mb, gb, head ? ['body'] : ['body', 'head', 'opacity']);
if (head) take(mh, gh, ['head', 'opacity']);
const order = ['body', 'head', 'opacity'].filter((r) => parts[r].length);
const total = order.reduce((n, r) => n + parts[r].reduce((k, p) => k + p.count, 0), 0);
const out = {}; for (const a of ATTR) { const src = gb.attributes[a]; out[a] = new (src.array.constructor)(total * src.itemSize); }
const groups = []; let at = 0;
const v = new THREE.Vector3(), n = new THREE.Vector3();
for (const [mi, r] of order.entries()) {
  const g0 = at;
  for (const p of parts[r]) {
    const fromHead = p.mesh !== mb, bonesS = p.mesh.skeleton.bones, remap = bonesS.map((b) => idxB[b.name] ?? idxB.Bip01_Head);
    for (let i = p.start; i < p.start + p.count; i++, at++) {
      for (const a of ATTR) { const s = p.g.attributes[a]; if (!s) continue; for (let k = 0; k < s.itemSize; k++) out[a][at * s.itemSize + k] = s.array[i * s.itemSize + k]; }
      if (fromHead) {
        for (let k = 0; k < 4; k++) out.skinIndex[at * 4 + k] = remap[out.skinIndex[at * 4 + k]] ?? 0;
        if (!headSame) { v.fromArray(out.position, at * 3).applyMatrix4(toB).toArray(out.position, at * 3); n.fromArray(out.normal, at * 3).applyMatrix3(toBn).normalize().toArray(out.normal, at * 3); }
      }
    }
  }
  groups.push({ start: g0, count: at - g0, materialIndex: mi });
}
console.log('parts', order.map((r, i) => r + ' ' + groups[i].count / 3 + ' tris').join(', '));

// ---- a sturdier build: vertices pushed away from their bones' axes (limbs) and from the spine (torso), weighted by skinning ----
if (cfg.thick || cfg.torso) {
  const bind = mb.bindMatrix, bindInv = mb.bindMatrixInverse;
  const joint = (name) => { const i = idxB[name]; return i == null ? null : new THREE.Vector3().setFromMatrixPosition(mb.skeleton.boneInverses[i].clone().invert()); };
  const child = { Bip01_L_UpperArm: 'Bip01_L_Forearm', Bip01_R_UpperArm: 'Bip01_R_Forearm', Bip01_L_Forearm: 'Bip01_L_Hand', Bip01_R_Forearm: 'Bip01_R_Hand',
    Bip01_L_Thigh: 'Bip01_L_Calf', Bip01_R_Thigh: 'Bip01_R_Calf', Bip01_L_Calf: 'Bip01_L_Foot', Bip01_R_Calf: 'Bip01_R_Foot', Bip01_L_Clavicle: 'Bip01_L_UpperArm', Bip01_R_Clavicle: 'Bip01_R_UpperArm' };
  const seg = {}; for (const [b, f] of Object.entries(cfg.thick || {})) { const a = joint(b), c = joint(child[b]); if (a && c) seg[idxB[b]] = { a, c, f }; else console.warn('no segment for', b); }
  const spine = ['Bip01_Spine', 'Bip01_Spine1', 'Bip01_Spine2'].map((b) => idxB[b]).filter((i) => i != null), neck = joint('Bip01_Neck');
  const yTop = neck ? neck.y - (cfg.torsoTop ?? 6) : 1e9, spX = neck ? neck.x : 0, spZ = joint('Bip01_Spine2')?.z ?? 0;
  const P = new THREE.Vector3(), d = new THREE.Vector3(), ax = new THREE.Vector3(), rel = new THREE.Vector3(), q = new THREE.Vector3();
  const nb = groups[0].count; // the body part only (the head keeps its shape)
  for (let i = 0; i < nb; i++) {
    P.fromArray(out.position, i * 3).applyMatrix4(bind);
    d.set(0, 0, 0);
    let wt = 0;
    for (let k = 0; k < 4; k++) {
      const bi = out.skinIndex[i * 4 + k], w = out.skinWeight[i * 4 + k]; if (!w) continue;
      const s = seg[bi];
      if (s) { // away from the closest point on the bone's segment
        ax.copy(s.c).sub(s.a); rel.copy(P).sub(s.a);
        const t = THREE.MathUtils.clamp(rel.dot(ax) / ax.lengthSq(), 0, 1);
        q.copy(s.a).addScaledVector(ax, t); d.addScaledVector(rel.copy(P).sub(q), (s.f - 1) * w); }
      if (cfg.torso && spine.includes(bi)) wt += w;
    }
    if (wt > 0) { const fall = THREE.MathUtils.smoothstep(yTop - P.y, 0, 5); d.x += (P.x - spX) * (cfg.torso - 1) * wt * fall; d.z += (P.z - spZ) * (cfg.torso - 1) * wt * fall; }
    if (d.lengthSq() > 0) P.add(d).applyMatrix4(bindInv).toArray(out.position, i * 3);
  }
}

// ---- the donor's neck and chest stay under the body's clothes: a head vertex below the neck whose inward ray crosses the body surface
// within 3 cm lies outside the clothes (a broader chest than the body avatar's) and moves just inside ----
if (head) {
  const bind = mb.bindMatrix, bindInv = mb.bindMatrixInverse;
  const ni = idxB.Bip01_Neck, neckY = ni == null ? 1e9 : new THREE.Vector3().setFromMatrixPosition(mb.skeleton.boneInverses[ni].clone().invert()).y;
  const nb = groups[0].count, bp = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), P = new THREE.Vector3(), N = new THREE.Vector3(), hit = new THREE.Vector3();
  for (let i = 0; i < nb; i += 3) { // body triangles near the neck and chest, in bind space
    const t = [0, 1, 2].map((k) => new THREE.Vector3().fromArray(out.position, (i + k) * 3).applyMatrix4(bind));
    if (Math.max(t[0].y, t[1].y, t[2].y) > neckY - 40) bp.push(t);
  }
  const ray = new THREE.Ray();
  let moved = 0;
  for (const g of groups.slice(1))
    for (let i = g.start; i < g.start + g.count; i++) {
      P.fromArray(out.position, i * 3).applyMatrix4(bind);
      if (P.y > neckY + 2) continue;
      N.fromArray(out.normal, i * 3).transformDirection(bind);
      ray.set(P, N.clone().negate());
      let best = Infinity;
      for (const t of bp) {
        if (t[0].distanceToSquared(P) > 100) continue;
        if (ray.intersectTriangle(t[0], t[1], t[2], false, hit)) best = Math.min(best, hit.distanceTo(P));
      }
      if (best < 3) { P.addScaledVector(N, -(best + 0.3)).applyMatrix4(bindInv).toArray(out.position, i * 3); moved++; }
    }
  console.log('head vertices moved under the clothes', moved, '(neck joint at', neckY.toFixed(1) + ')');
}

// ---- the new mesh on the body avatar's skeleton, then export like build_player.mjs ----
const geo = new THREE.BufferGeometry();
for (const a of ATTR) { const s = gb.attributes[a]; geo.setAttribute(a, new THREE.BufferAttribute(out[a], s.itemSize, s.normalized)); }
for (const g of groups) geo.addGroup(g.start, g.count, g.materialIndex); // normals stay: the widening is small and smooth
mb.geometry = geo;
mb.material = order.map((r) => new THREE.MeshStandardMaterial({ name: NAME + '_' + r, color: 0xffffff, roughness: 0.8, metalness: 0 }));
mb.name = NAME;
body.name = NAME;
body.animations = [];
body.scale.multiplyScalar(US);
body.updateMatrixWorld(true);
const bb = new THREE.Box3().setFromObject(body);
console.log('height (m)', (bb.max.y - bb.min.y).toFixed(3));
const glb = await new Promise((res, rej) => new GLTFExporter().parse(body, res, rej, { binary: true, animations: [], onlyVisible: false }));
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(path.join(OUTDIR, NAME + '_mesh.glb'), Buffer.from(glb));
console.log('wrote', path.join(OUTDIR, NAME + '_mesh.glb'), (glb.byteLength / 1e6).toFixed(2), 'MB');
