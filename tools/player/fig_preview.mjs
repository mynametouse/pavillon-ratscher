// Offline preview of a player figure – no browser (the chat machine runs one at a time): load the figure JSON (glTF with meshopt and WebP
// data URIs), pose it with a clip of its clip set, skin on the CPU, rasterize with a z-buffer, texture and simple light → JPEG per view and
// a contact sheet. --headwear adds Christoph's cap and earbuds with the code of game/avatar.js (figHeadwear).
//   node fig_preview.mjs <figure.json> <pclips.json> <out prefix> <views.json> [--headwear]
// views.json: { "sheet": true, "cols": 4, "h": height (else the clip set's), "views": [{ "name", "pose": clip key, "t": 0..1 of the clip,
//   "eye": [x,y,z], "target": [x,y,z], "head": true (eye/target relative to the head bone), "fov", "w", "h" }] } – the figure faces +z
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { THREE } from './node_shims.mjs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
if (typeof globalThis.ProgressEvent === 'undefined') globalThis.ProgressEvent = class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } };
const HERE = path.dirname(new URL(import.meta.url).pathname);
const sharp = createRequire(path.join(HERE, '../gltf/node_modules/'))('sharp');
const [FIG, CLIPS, OUTP, SPEC] = process.argv.slice(2), HEADWEAR = process.argv.includes('--headwear');
const spec = SPEC ? JSON.parse(fs.readFileSync(SPEC, 'utf8')) : {};
const txt = fs.readFileSync(FIG, 'utf8'), json = JSON.parse(txt);
await MeshoptDecoder.ready;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise((res, rej) => loader.parse(txt, '', res, rej));
// textures: decode the images ourselves
const imgs = await Promise.all((json.images || []).map(async (im) => { const b = Buffer.from(im.uri.split(',')[1], 'base64'); const { data, info } = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }));
const texOf = (ti) => { if (ti == null) return null; const t = json.textures[ti]; const s = t.source ?? t.extensions?.EXT_texture_webp?.source; return imgs[s]; };
const matTex = {}; for (const m of json.materials || []) matTex[m.name] = { img: texOf(m.pbrMetallicRoughness?.baseColorTexture?.index), alpha: m.alphaMode === 'MASK' ? (m.alphaCutoff ?? 0.5) : 0 };
// clips
function decodeClip(c) {
  const b64 = (s, T) => { const u8 = Buffer.from(s, 'base64'); return new T(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)); };
  const q = b64(c.q, Int16Array), p = c.p ? b64(c.p, Float32Array) : null, n = c.n, nb = c.b.length, times = new Float32Array(n), tracks = [];
  for (let i = 0; i < n; i++) times[i] = Math.min(c.d, i / c.fps);
  for (let j = 0; j < nb; j++) { const v = new Float32Array(n * 4); for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) v[i * 4 + k] = q[(i * nb + j) * 4 + k] / 32767; tracks.push(new THREE.QuaternionKeyframeTrack(c.b[j] + '.quaternion', times, v)); }
  if (p && c.hb) tracks.push(new THREE.VectorKeyframeTrack(c.hb + '.position', times, p));
  return new THREE.AnimationClip(c.name, c.d, tracks);
}
const set = JSON.parse(fs.readFileSync(CLIPS, 'utf8'));
const model = gl.scene;
// scale like prepModel: height h (spec.h or the clip set's), feet on the ground
model.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
const H = spec.h || set.h || size.y, s = H / size.y; model.scale.multiplyScalar(s); model.position.y -= box.min.y * s; model.updateMatrixWorld(true);
console.log('bbox height', size.y.toFixed(3), 'scaled to', H.toFixed(3));
const root = new THREE.Group(); root.add(model);
const B = {}; model.traverse((x) => { if (x.isBone) B[x.name] = x; });
const mixer = new THREE.AnimationMixer(model);
const acts = {}; for (const [k, c] of Object.entries(set.clips)) { const a = mixer.clipAction(decodeClip(c)); acts[k] = a; }
function pose(k, t) { for (const a of Object.values(acts)) { a.stop(); } if (k && acts[k]) { const a = acts[k]; a.play(); a.setEffectiveWeight(1); a.time = t * a.getClip().duration; } mixer.update(0); root.updateMatrixWorld(true); }
// Christoph's headwear: the function from game/avatar.js (between its markers), on the canonical bones it needs
let hw = null;
if (HEADWEAR) {
  pose('idle', 0.5);
  const s = fs.readFileSync(path.join(HERE, '../../viz3/src/game/avatar.js'), 'utf8');
  const figHeadwear = new Function('return ' + s.slice(s.indexOf('function figHeadwear('), s.indexOf('// ---- headwear: end ----')))();
  hw = figHeadwear(THREE, { model, B: { Head: B.Bip01_Head, Hips: B.Bip01_Pelvis, Neck: B.Bip01_Neck, LeftArm: B.Bip01_L_UpperArm, RightArm: B.Bip01_R_UpperArm } }, spec.hw || {});
  console.log('headwear', hw ? 'eyes ' + hw.eye.map((x) => x.toFixed(3)).join(' ') : 'none');
}
// ---- rasterizer ----
function render(view, file) {
  const W = view.w || 520, Hh = view.h || 640;
  const col = new Float32Array(W * Hh * 3), zb = new Float32Array(W * Hh).fill(Infinity);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 3, g = 0.86 - 0.18 * y / Hh; col[k] = g; col[k + 1] = g; col[k + 2] = g + 0.03; }
  const eye = new THREE.Vector3(...view.eye), tgt = new THREE.Vector3(...view.target);
  const cam = new THREE.PerspectiveCamera(view.fov || 30, W / Hh, 0.05, 50); cam.position.copy(eye); cam.lookAt(tgt); cam.updateMatrixWorld(true);
  const VP = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const L1 = new THREE.Vector3(-0.5, 0.8, 0.6).normalize().applyQuaternion(cam.quaternion), L2 = new THREE.Vector3(0.6, 0.3, -0.7).normalize().applyQuaternion(cam.quaternion);
  const tris = []; // { p:[3 world], n:[3], uv:[3], tex, alpha, color }
  const v = new THREE.Vector3(), nn = new THREE.Vector3(), m4 = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (process.env.HIDE && new RegExp(process.env.HIDE).test((o.material && o.material.name) || '')) return; // HIDE=<regex of material names>
    let vis = true; for (let a = o; a; a = a.parent) if (!a.visible) vis = false; if (!vis) return;
    const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, idx = g.index;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const nv = P.count, wp = new Float32Array(nv * 3), wn = new Float32Array(nv * 3);
    if (o.isSkinnedMesh) {
      o.skeleton.update(); const bm = o.skeleton.boneMatrices, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
      for (let i = 0; i < nv; i++) {
        m4.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); const e = m4.elements;
        for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (!w) continue; const bi = SI.getComponent(i, k); for (let q = 0; q < 16; q++) e[q] += bm[bi * 16 + q] * w; }
        tmp.multiplyMatrices(m4, o.bindMatrix);
        v.fromBufferAttribute(P, i).applyMatrix4(tmp); wp[i * 3] = v.x; wp[i * 3 + 1] = v.y; wp[i * 3 + 2] = v.z;
        if (N) { nn.fromBufferAttribute(N, i).transformDirection(tmp); wn[i * 3] = nn.x; wn[i * 3 + 1] = nn.y; wn[i * 3 + 2] = nn.z; }
      }
    } else {
      o.updateMatrixWorld(true);
      for (let i = 0; i < nv; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); wp.set([v.x, v.y, v.z], i * 3); if (N) { nn.fromBufferAttribute(N, i).transformDirection(o.matrixWorld); wn.set([nn.x, nn.y, nn.z], i * 3); } }
    }
    const groups = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : nv, materialIndex: 0 }];
    for (const gr of groups) {
      const mt = mats[gr.materialIndex] || mats[0], info = matTex[mt.name] || {}, tex = info.img || null;
      const alpha = info.alpha || (mt.alphaTest || 0), color = mt.color ? [mt.color.r, mt.color.g, mt.color.b] : [0.8, 0.8, 0.8];
      for (let t = gr.start; t < gr.start + gr.count; t += 3) {
        const ia = idx ? idx.getX(t) : t, ib = idx ? idx.getX(t + 1) : t + 1, ic = idx ? idx.getX(t + 2) : t + 2;
        tris.push({ i: [ia, ib, ic], wp, wn, UV, tex: mt.map === null && !tex ? null : tex, alpha, color, ds: mt.side === THREE.DoubleSide || alpha > 0 });
      }
    }
  });
  const pr = new THREE.Vector4(), L1a = L1.toArray(), L2a = L2.toArray();
  for (const T of tris) {
    const sx = [], sy = [], sz = [], iw = [];
    let bad = false;
    for (const i of T.i) { pr.set(T.wp[i * 3], T.wp[i * 3 + 1], T.wp[i * 3 + 2], 1).applyMatrix4(VP); if (pr.w <= 0.01) { bad = true; break; } sx.push((pr.x / pr.w * 0.5 + 0.5) * W); sy.push((1 - (pr.y / pr.w * 0.5 + 0.5)) * Hh); sz.push(pr.z / pr.w); iw.push(1 / pr.w); }
    if (bad) continue;
    const area = (sx[1] - sx[0]) * (sy[2] - sy[0]) - (sx[2] - sx[0]) * (sy[1] - sy[0]); if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(...sx))), x1 = Math.min(W - 1, Math.ceil(Math.max(...sx))), y0 = Math.max(0, Math.floor(Math.min(...sy))), y1 = Math.min(Hh - 1, Math.ceil(Math.max(...sy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((sx[1] - px) * (sy[2] - py) - (sx[2] - px) * (sy[1] - py)) / area, w1 = ((sx[2] - px) * (sy[0] - py) - (sx[0] - px) * (sy[2] - py)) / area, w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * sz[0] + w1 * sz[1] + w2 * sz[2], k = y * W + x; if (z >= zb[k]) continue;
      const q0 = w0 * iw[0], q1 = w1 * iw[1], q2 = w2 * iw[2], qs = q0 + q1 + q2;
      let r = T.color[0], g = T.color[1], b = T.color[2];
      if (T.tex && T.UV) {
        const [a, bb, c] = T.i, u = (T.UV.getX(a) * q0 + T.UV.getX(bb) * q1 + T.UV.getX(c) * q2) / qs, vv = (T.UV.getY(a) * q0 + T.UV.getY(bb) * q1 + T.UV.getY(c) * q2) / qs;
        const tx = Math.min(T.tex.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * T.tex.w))), ty = Math.min(T.tex.h - 1, Math.max(0, Math.floor((vv - Math.floor(vv)) * T.tex.h)));
        const o = (ty * T.tex.w + tx) * 4, d = T.tex.data;
        if (T.alpha && d[o + 3] / 255 < T.alpha) continue;
        r *= d[o] / 255; g *= d[o + 1] / 255; b *= d[o + 2] / 255;
      }
      let nx = 0, ny = 0, nz = 0; for (let j = 0; j < 3; j++) { const wj = [q0, q1, q2][j] / qs, i = T.i[j]; nx += T.wn[i * 3] * wj; ny += T.wn[i * 3 + 1] * wj; nz += T.wn[i * 3 + 2] * wj; }
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      // facing the camera?
      const vx = eye.x - (T.wp[T.i[0] * 3]), vy = eye.y - T.wp[T.i[0] * 3 + 1], vz = eye.z - T.wp[T.i[0] * 3 + 2];
      if (nx * vx + ny * vy + nz * vz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const d1 = Math.max(0, nx * L1a[0] + ny * L1a[1] + nz * L1a[2]), d2 = Math.max(0, nx * L2a[0] + ny * L2a[1] + nz * L2a[2]);
      const li = 0.42 + 0.72 * d1 + 0.18 * d2;
      zb[k] = z; col[k * 3] = Math.pow(r, 1) * li; col[k * 3 + 1] = g * li; col[k * 3 + 2] = b * li;
    }
  }
  const out = Buffer.alloc(W * Hh * 3); for (let i = 0; i < W * Hh * 3; i++) out[i] = Math.max(0, Math.min(255, Math.round(Math.pow(Math.max(0, col[i]), 1 / 1.15) * 255)));
  return sharp(out, { raw: { width: W, height: Hh, channels: 3 } }).jpeg({ quality: 88 }).toFile(file);
}
// views: [{ name, pose, t, eye:[x,y,z], target:[x,y,z], fov, w, h, head:true (relative to the head bone) }]
const head = () => (B.Bip01_Head ? B.Bip01_Head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.6, 0));
const views = spec.views || [];
const files = [];
for (const vw of views) {
  pose(vw.pose || null, vw.t ?? 0.3);
  root.updateMatrixWorld(true);
  const v2 = { ...vw };
  if (vw.head) { const h = head(); v2.eye = [h.x + vw.eye[0], h.y + vw.eye[1], h.z + vw.eye[2]]; v2.target = [h.x + vw.target[0], h.y + vw.target[1], h.z + vw.target[2]]; }
  const f = `${OUTP}_${vw.name}.jpg`; await render(v2, f); files.push(f);
}
// contact sheet
if (spec.sheet && files.length) {
  const W = views[0].w || 520, Hh = views[0].h || 640, cols = spec.cols || files.length, rows = Math.ceil(files.length / cols);
  const comp = files.map((f, i) => ({ input: f, left: (i % cols) * W, top: Math.floor(i / cols) * Hh }));
  await sharp({ create: { width: cols * W, height: rows * Hh, channels: 3, background: '#ffffff' } }).composite(comp).jpeg({ quality: 85 }).toFile(`${OUTP}_sheet.jpg`);
  console.log('sheet', `${OUTP}_sheet.jpg`);
}
