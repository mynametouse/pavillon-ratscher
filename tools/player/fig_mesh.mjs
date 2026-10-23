// A player figure from Rocketbox avatars with the same 3ds Max Biped skeleton (all adult women share one, all adult men another): the
// clothed body of one ('body' material) and the head of another ('head' = face, neck, modelled hair; 'opacity' = alpha-tested hair cards,
// lashes) – or the own head with the hair of a third ("hair" below). Optional: limbs and chest a little thicker (radial scaling around the
// bones, by skin weight) for a sturdier build. Output like build_player.mjs: mesh GLB with the Biped rig, no animations (the clip sets
// pclips_m / pclips_f fit, same skeleton). Materials <name>_body, _head, _opacity, _hair, _hairop (textures: fig_texattach.mjs).
//   node fig_mesh.mjs <name> <body.fbx> <head.fbx|-> <out dir> [build.json]
// build.json: { "thick": { "<Biped bone>": factor | [factor at the joint, at the child joint], … },
//   "torso": factor or { "<spine bone>": factor } (away from the spine's vertical axis), "torsoTop": cm below the neck joint where it ends,
//   "hair": { "fbx": donor avatar, "tex": its head colour TGA, "gap": cm outside the own head, "out": corners outside (2), "cardsAbove": cm,
//             "ownDrop": { "tex": own head colour TGA, "uv": [u0, u1, v0, v1], "above": cm } (own hair pieces that would stick out) } }
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

function readTGA(file) { // uncompressed type-2 TGA in file row order (bottom-left origin == the UV rows of the FBX), as texattach.mjs reads it
  const b = fs.readFileSync(file), idlen = b[0], type = b[2], w = b.readUInt16LE(12), h = b.readUInt16LE(14), ch = b[16] / 8, topLeft = !!(b[17] & 0x20);
  if (type !== 2) throw new Error('only uncompressed TGA: ' + file);
  const data = Buffer.alloc(w * h * ch), off = 18 + idlen;
  for (let y = 0; y < h; y++) { const sr = topLeft ? h - 1 - y : y; for (let x = 0; x < w; x++) { const s = off + (sr * w + x) * ch, d = (y * w + x) * ch; data[d] = b[s + 2]; data[d + 1] = b[s + 1]; data[d + 2] = b[s]; if (ch === 4) data[d + 3] = b[s + 3]; } }
  return { w, h, ch, data };
}
// painted hair or not? the texel at a UV: yellower than skin (blonde) or dark brown – not pink skin, eyes, mouth or jewellery
function hairTexel(T, u, w) {
  const x = Math.min(T.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * T.w))), y = Math.min(T.h - 1, Math.max(0, Math.floor((w - Math.floor(w)) * T.h)));
  const o = (y * T.w + x) * T.ch, r = T.data[o] / 255, g = T.data[o + 1] / 255, b = T.data[o + 2] / 255, l = 0.3 * r + 0.59 * g + 0.11 * b;
  if (l < 0.06 || !(r >= g * 0.98 && g >= b)) return false;
  return (g / r - 0.765) / 0.04 + (0.745 - b / Math.max(g, 1e-3)) / 0.04 > 0.6 || l < 0.22;
}

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

// ---- collect the triangles: body from the body avatar, head and opacity from the head avatar ----
// With a hair donor (build.json "hair": { "fbx", "tex": its head colour TGA, "gap": cm, "cardsAbove": cm }): the own face, skin and head stay;
// the own hair cards go (opacity parts reaching above cardsAbove – lashes and earrings stay), and the donor's hair comes in: its head-material
// triangles textured as hair that lie more than gap outside the own head ('hair', the modelled volume) and its hair cards ('hairop').
const ATTR = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];
const parts = { body: [], head: [], opacity: [], hair: [], hairop: [] }; // per role: list of { g, mesh, tris: first vertex of each triangle }
const groupsOf = (mesh, g) => { const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return (g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }]).map((gr) => ({ ...gr, role: role(mats[gr.materialIndex].name) })); };
const take = (mesh, g, roles, keep) => { for (const gr of groupsOf(mesh, g)) { const to = roles[gr.role]; if (!to) continue;
  const tris = []; for (let t = gr.start; t < gr.start + gr.count; t += 3) if (!keep || keep(gr.role, t)) tris.push(t); parts[to].push({ g, mesh, tris }); } };
const bindY = (mesh, g, i) => new THREE.Vector3().fromBufferAttribute(g.attributes.position, i).applyMatrix4(mesh.bindMatrix).y;
// connected parts of some triangles (welded by position): part id per triangle and the highest point (bind space) of each part
function partsOf(mesh, g, role0) {
  const P = g.attributes.position, key = (i) => [P.getX(i), P.getY(i), P.getZ(i)].map((x) => Math.round(x * 100)).join(',');
  const par = new Map(), find = (x) => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  const tris = []; for (const gr of groupsOf(mesh, g)) if (gr.role === role0) for (let t = gr.start; t < gr.start + gr.count; t += 3) tris.push(t);
  for (const t of tris) for (let k = 0; k < 3; k++) if (!par.has(key(t + k))) par.set(key(t + k), key(t + k));
  for (const t of tris) for (const k of [1, 2]) { const x = find(key(t)), y = find(key(t + k)); if (x !== y) par.set(x, y); }
  const top = new Map(), of = new Map();
  for (const t of tris) { const r = find(key(t)); of.set(t, r); for (let k = 0; k < 3; k++) top.set(r, Math.max(top.get(r) ?? -1e9, bindY(mesh, g, t + k))); }
  return { of, top };
}
const HC = cfg.hair || null;
if (HC) {
  const own = partsOf(mb, gb, 'opacity'), above = HC.cardsAbove ?? 163;
  // own hair pieces that would stick out of the new hair (a bun): head triangles painted as hair inside the UV box ownDrop.uv
  const OD = HC.ownDrop, OT = OD ? readTGA(OD.tex) : null, OUV = gb.attributes.uv;
  // (above the height OD.above, cm, all of the box goes: the last bits of a bun are not painted as hair everywhere)
  const ownHair = (t) => { let k = 0; for (let i = t; i < t + 3; i++) { const u = OUV.getX(i), w = OUV.getY(i);
    if (u >= OD.uv[0] && u <= OD.uv[1] && w >= OD.uv[2] && w <= OD.uv[3] && (hairTexel(OT, u, w) || bindY(mb, gb, i) > (OD.above ?? 1e9))) k++; } return k >= 2; };
  let dropped = 0;
  take(mb, gb, { body: 'body', head: 'head', opacity: 'opacity' }, (r, t) =>
    r === 'opacity' ? own.top.get(own.of.get(t)) < above : r === 'head' && OD && ownHair(t) ? (dropped++, false) : true);
  if (OD) console.log('own hair pieces dropped:', dropped, 'triangles');
  const donor = load(HC.fbx), md = skinned(donor), gd = md.geometry.index ? md.geometry.toNonIndexed() : md.geometry;
  // the own head's surface (bind space) in a 1 cm grid, for "how far outside it" of the donor's hair
  const grid = new Map(), cell = (x, y, z) => Math.floor(x) + ',' + Math.floor(y) + ',' + Math.floor(z), hp = [], hn = [];
  for (const gr of groupsOf(mb, gb)) if (gr.role === 'head') for (let i = gr.start; i < gr.start + gr.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(gb.attributes.position, i).applyMatrix4(mb.bindMatrix), nn = new THREE.Vector3().fromBufferAttribute(gb.attributes.normal, i).transformDirection(mb.bindMatrix);
    const j = hp.push(p) - 1; hn.push(nn); const c = cell(p.x, p.y, p.z); if (!grid.has(c)) grid.set(c, []); grid.get(c).push(j); }
  const outside = (p) => { let best = 1e9, bj = -1; const cx = Math.floor(p.x), cy = Math.floor(p.y), cz = Math.floor(p.z);
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) for (const j of grid.get((cx + dx) + ',' + (cy + dy) + ',' + (cz + dz)) || []) { const d = hp[j].distanceToSquared(p); if (d < best) { best = d; bj = j; } }
    return bj < 0 ? 99 : p.clone().sub(hp[bj]).dot(hn[bj]); };
  // hair or skin? the donor's head texture at the corners (warm and pale yellow to brown = hair; pink = skin; dark = eyes, mouth; other = jewellery)
  const T = readTGA(HC.tex), UV = gd.attributes.uv, isHair = (i) => hairTexel(T, UV.getX(i), UV.getY(i));
  const dop = partsOf(md, gd, 'opacity'), gap = HC.gap ?? 0.3, P0 = new THREE.Vector3();
  let nh = 0;
  take(md, gd, { head: 'hair', opacity: 'hairop' }, (r, t) => {
    if (r === 'opacity') return dop.top.get(dop.of.get(t)) >= above; // the cards of the hair, not the lashes
    let hair = 0, out = 0;
    for (let k = 0; k < 3; k++) { if (isHair(t + k)) hair++; if (outside(P0.fromBufferAttribute(gd.attributes.position, t + k).applyMatrix4(md.bindMatrix)) > gap) out++; }
    return hair >= 2 && out >= (HC.out ?? 2) && ++nh;
  });
  // islands of a few chosen triangles float as flecks above the head: only pieces of at least minPiece triangles stay
  { const P = gd.attributes.position, key = (i) => [P.getX(i), P.getY(i), P.getZ(i)].map((x) => Math.round(x * 100)).join(',');
    const par = new Map(), find = (x) => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
    const sel = parts.hair.flatMap((p) => p.tris);
    for (const t of sel) for (let k = 0; k < 3; k++) if (!par.has(key(t + k))) par.set(key(t + k), key(t + k));
    for (const t of sel) for (const k of [1, 2]) { const a = find(key(t)), b = find(key(t + k)); if (a !== b) par.set(a, b); }
    const size = new Map(); for (const t of sel) { const r = find(key(t)); size.set(r, (size.get(r) || 0) + 1); }
    const min = HC.minPiece ?? 10; let gone = 0;
    for (const p of parts.hair) p.tris = p.tris.filter((t) => size.get(find(key(t))) >= min || (gone++, false));
    console.log('hair islands dropped:', gone, 'triangles'); }
  console.log('hair donor', HC.fbx.split('/').pop() + ':', nh, 'hair triangles of its head,', parts.hairop.reduce((n, p) => n + p.tris.length, 0), 'of its cards');
} else {
  take(mb, gb, head ? { body: 'body' } : { body: 'body', head: 'head', opacity: 'opacity' });
  if (head) take(mh, gh, { head: 'head', opacity: 'opacity' });
}
const order = ['body', 'head', 'opacity', 'hair', 'hairop'].filter((r) => parts[r].some((p) => p.tris.length));
const total = order.reduce((n, r) => n + parts[r].reduce((k, p) => k + p.tris.length * 3, 0), 0);
const out = {}; for (const a of ATTR) { const src = gb.attributes[a]; out[a] = new (src.array.constructor)(total * src.itemSize); }
const groups = []; let at = 0;
const v = new THREE.Vector3(), n = new THREE.Vector3();
for (const [mi, r] of order.entries()) {
  const g0 = at;
  for (const p of parts[r]) {
    const fromOther = p.mesh !== mb, remap = p.mesh.skeleton.bones.map((b) => idxB[b.name] ?? idxB.Bip01_Head);
    const toM = mb.bindMatrixInverse.clone().multiply(p.mesh.bindMatrix), toN = new THREE.Matrix3().getNormalMatrix(toM), same = toM.equals(new THREE.Matrix4());
    for (const t of p.tris) for (let i = t; i < t + 3; i++, at++) {
      for (const a of ATTR) { const s = p.g.attributes[a]; if (!s) continue; for (let k = 0; k < s.itemSize; k++) out[a][at * s.itemSize + k] = s.array[i * s.itemSize + k]; }
      if (fromOther) {
        for (let k = 0; k < 4; k++) out.skinIndex[at * 4 + k] = remap[out.skinIndex[at * 4 + k]] ?? 0;
        if (!same) { v.fromArray(out.position, at * 3).applyMatrix4(toM).toArray(out.position, at * 3); n.fromArray(out.normal, at * 3).applyMatrix3(toN).normalize().toArray(out.normal, at * 3); }
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
  // factor on the distance from the bone's segment: a number, or [at the joint, at the child joint] (muscles bulk near the shoulder and the elbow)
  const seg = {}; for (const [b, f] of Object.entries(cfg.thick || {})) { const a = joint(b), c = joint(child[b]); if (a && c) seg[idxB[b]] = { a, c, f: Array.isArray(f) ? f : [f, f] }; else console.warn('no segment for', b); }
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
        q.copy(s.a).addScaledVector(ax, t); d.addScaledVector(rel.copy(P).sub(q), (s.f[0] + (s.f[1] - s.f[0]) * t - 1) * w); }
      if (cfg.torso && spine.includes(bi)) wt += w * ((typeof cfg.torso === 'number' ? cfg.torso : cfg.torso[bonesB[bi].name] ?? 1) - 1);
    }
    if (wt) { const fall = THREE.MathUtils.smoothstep(yTop - P.y, 0, 5); d.x += (P.x - spX) * wt * fall; d.z += (P.z - spZ) * wt * fall; }
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
