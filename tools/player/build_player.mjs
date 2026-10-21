// Player figure for V15 (third person): Rocketbox avatar (FBX, 3ds Max Biped rig, MIT) → mesh GLB without animations
// + a compact clip set (int16 quaternions, base64) built from
//   – Rocketbox motion-capture clips (same rig; locomotion made in-place, speed measured from the root drift) and
//   – Mesh2Motion clips (CC0, UE-style rig) retargeted onto the Biped (world-rotation transfer from direction-aligned rest poses).
// Based on the proof of concept in charsrc/_tools/rbpipe.mjs. Usage: node build_player.mjs <config.json>
import fs from 'node:fs';
import path from 'node:path';
import { THREE } from './node_shims.mjs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replaceAll('${PAV_WORK}', process.env.PAV_WORK || '.'));   // paths of the originals: PAV_WORK = working area with charsrc/
const ab = (p) => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const loadFBX = (p) => new FBXLoader().parse(ab(p), '');
const loadGLB = (p) => new Promise((res, rej) => new GLTFLoader().parse(ab(p), '', res, rej));
const US = cfg.unitScale || 0.01;   // FBX centimetres → metres
const FPS = cfg.fps || 24;

// ---------- target avatar ----------
const avatar = loadFBX(cfg.avatar); avatar.name = cfg.name || 'Player';
for (const c of [...avatar.children]) if (c.isLight || c.isCamera) avatar.remove(c);
// keep the highest level of detail only (Rocketbox FBX may carry several meshes: hipoly/midpoly/lowpoly…)
const skinnedAll = []; avatar.traverse((o) => { if (o.isSkinnedMesh) skinnedAll.push(o); });
console.log('meshes', skinnedAll.map((m) => m.name + ':' + (m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3)).join(', '));
const keepRx = cfg.keepMesh ? new RegExp(cfg.keepMesh, 'i') : null;
for (const m of skinnedAll) if (keepRx && !keepRx.test(m.name)) m.parent.remove(m);
const tBones = {}; avatar.traverse((o) => { if (o.isBone) tBones[o.name] = o; });
avatar.scale.multiplyScalar(US); avatar.updateMatrixWorld(true);
const tRestLocal = {}; for (const [n, b] of Object.entries(tBones)) tRestLocal[n] = { p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() };
const restoreTarget = () => { for (const [n, b] of Object.entries(tBones)) { b.position.copy(tRestLocal[n].p); b.quaternion.copy(tRestLocal[n].q); b.scale.copy(tRestLocal[n].s); } avatar.updateMatrixWorld(true); };
const tOrder = []; (function walk(o) { if (o.isBone) tOrder.push(o.name); o.children.forEach(walk); })(avatar);
const ROOT = 'Bip01';
const bbox = new THREE.Box3().setFromObject(avatar); console.log('height (m)', (bbox.max.y - bbox.min.y).toFixed(3), 'bones', tOrder.length);

// ---------- compact clip encoding; speeds; helpers ----------
const out = { name: cfg.name, h: +(bbox.max.y - bbox.min.y).toFixed(3), clips: {}, meta: {} }, CL = {};
function sampleTracks(clip, names, fps = FPS) {   // evaluate a clip on the target rig at FPS → per bone quaternions (bones in 'names'), root positions
  restoreTarget(); const mixer = new THREE.AnimationMixer(avatar); const act = mixer.clipAction(clip); act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.play();
  const n = Math.max(2, Math.round(clip.duration * fps) + 1), q = [], p = [];
  for (let i = 0; i < n; i++) { const t = Math.min(clip.duration - 1e-4, i / fps); act.reset(); act.play(); mixer.setTime(t); avatar.updateMatrixWorld(true);
    for (const nm of names) { const b = tBones[nm]; q.push(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); }
    const r = tBones[ROOT]; p.push(r.position.x, r.position.y, r.position.z); }
  mixer.stopAllAction(); mixer.uncacheRoot(avatar); restoreTarget(); return { n, q, p }; }
function footSpeed(clip) {   // in-place cycle: the planted foot slides backwards at the walking speed (m/s)
  restoreTarget(); const mixer = new THREE.AnimationMixer(avatar); const act = mixer.clipAction(clip); act.play(); const n = Math.max(8, Math.round(clip.duration * 60)), dt = clip.duration / n;
  const L = tBones.Bip01_L_Foot, R = tBones.Bip01_R_Foot, pl = new THREE.Vector3(), pr = new THREE.Vector3(); let prev = null; const v = [];
  for (let i = 0; i <= n; i++) { mixer.setTime(i * dt); avatar.updateMatrixWorld(true); L.getWorldPosition(pl); R.getWorldPosition(pr); const low = pl.y < pr.y ? pl.clone() : pr.clone(), which = pl.y < pr.y ? 'L' : 'R';
    if (prev && prev.which === which) v.push(Math.hypot(low.x - prev.p.x, low.z - prev.p.z) / dt); prev = { p: low, which }; }
  mixer.stopAllAction(); mixer.uncacheRoot(avatar); restoreTarget(); v.sort((a, b) => a - b); return v.length ? v[Math.floor(v.length * 0.6)] : 0; }
function encode(key, clip, o = {}) {
  const fps = o.fps || FPS; let names = tOrder.filter((nm) => !/Footsteps|Nub$|^Bip01$/.test(nm) && clip.tracks.some((t) => t.name === nm + '.quaternion'));
  let s = sampleTracks(clip, names, fps);
  // bones that stay (almost) at rest are left out: the mixer keeps them in their rest pose
  { const keep = names.filter((nm, j) => { const r = tRestLocal[nm].q; let mx = 0; for (let i = 0; i < s.n; i++) { const k = (i * names.length + j) * 4; const d = Math.abs(s.q[k] * r.x + s.q[k + 1] * r.y + s.q[k + 2] * r.z + s.q[k + 3] * r.w); mx = Math.max(mx, 2 * Math.acos(Math.min(1, d))); } return mx > 0.012; });
    if (keep.length < names.length) { names = keep; s = sampleTracks(clip, names, fps); } }
  const nb = names.length, q16 = new Int16Array(s.n * nb * 4);
  for (let i = 0; i < s.n; i++) for (let j = 0; j < nb; j++) { let x = s.q[(i * nb + j) * 4], y = s.q[(i * nb + j) * 4 + 1], z = s.q[(i * nb + j) * 4 + 2], w = s.q[(i * nb + j) * 4 + 3];
    if (i > 0) { const pq = (i - 1) * nb + j; if (x * q16[pq * 4] + y * q16[pq * 4 + 1] + z * q16[pq * 4 + 2] + w * q16[pq * 4 + 3] < 0) { x = -x; y = -y; z = -z; w = -w; } }   // continuous hemisphere
    q16.set([Math.round(x * 32767), Math.round(y * 32767), Math.round(z * 32767), Math.round(w * 32767)], (i * nb + j) * 4); }
  const p32 = new Float32Array(s.p); const hasRoot = clip.tracks.some((t) => t.name === ROOT + '.position');
  const c = { name: key, d: +clip.duration.toFixed(4), fps, n: s.n, b: names, q: Buffer.from(q16.buffer).toString('base64'), loop: o.loop !== false };
  if (hasRoot) { c.hb = ROOT; c.p = Buffer.from(p32.buffer).toString('base64'); }
  if (o.speed != null) c.speed = +o.speed.toFixed(3); else if (o.measure) c.speed = +footSpeed(clip).toFixed(3);
  out.clips[key] = c; CL[key] = clip; console.log('clip', key.padEnd(13), (clip.duration.toFixed(2) + 's').padStart(7), 'bones', nb, c.speed != null ? 'speed ' + c.speed + ' m/s' : '', c.loop ? '' : '(once)');
  return c; }

// ---------- Rocketbox clips (same rig) ----------
for (const rc of cfg.rocketboxClips || []) {
  if (!fs.existsSync(rc.file)) { console.warn('missing', rc.file); continue; }
  const r = loadFBX(rc.file); const c = r.animations[0]; c.name = rc.key;
  c.tracks = c.tracks.filter((t) => { const nm = t.name.split('.')[0]; return tBones[nm] && !t.name.endsWith('.scale') && (t.name.endsWith('.quaternion') || nm === ROOT); });
  let speed = null;
  const tp = c.tracks.find((t) => t.name === ROOT + '.position');
  if (tp && rc.inPlace) { const v = tp.values, n = v.length / 3; const x0 = v[0], z0 = v[2], x1 = v[(n - 1) * 3], z1 = v[(n - 1) * 3 + 2];
    speed = Math.hypot(x1 - x0, z1 - z0) * US / Math.max(1e-3, tp.times[n - 1] - tp.times[0]);
    for (let i = 0; i < n; i++) { const f = n > 1 ? i / (n - 1) : 0; v[i * 3] -= x0 + (x1 - x0) * f; v[i * 3 + 2] -= z0 + (z1 - z0) * f; } }
  if (tp && rc.stillRoot) { const v = tp.values, n = v.length / 3; for (let i = 0; i < n; i++) { v[i * 3] = v[0]; v[i * 3 + 2] = v[2]; } }
  if (rc.trimStart || rc.trimEnd) { c.tracks.forEach((t) => t.trim(rc.trimStart || 0, rc.trimEnd || c.duration)); c.tracks.forEach((t) => t.shift(-(rc.trimStart || 0))); }
  c.resetDuration(); encode(rc.key, c, { loop: rc.loop, speed: rc.inPlace ? speed : (rc.measure ? null : undefined), measure: rc.measure, fps: rc.fps });
}

// ---------- retarget UE-style sources (Mesh2Motion) → Biped ----------
const MAP = { pelvis: 'Bip01_Pelvis', spine_01: 'Bip01_Spine', spine_02: 'Bip01_Spine1', spine_03: 'Bip01_Spine2', neck_01: 'Bip01_Neck', head: 'Bip01_Head', Head: 'Bip01_Head',
  clavicle_l: 'Bip01_L_Clavicle', upperarm_l: 'Bip01_L_UpperArm', lowerarm_l: 'Bip01_L_Forearm', hand_l: 'Bip01_L_Hand', clavicle_r: 'Bip01_R_Clavicle', upperarm_r: 'Bip01_R_UpperArm', lowerarm_r: 'Bip01_R_Forearm', hand_r: 'Bip01_R_Hand',
  thigh_l: 'Bip01_L_Thigh', calf_l: 'Bip01_L_Calf', foot_l: 'Bip01_L_Foot', ball_l: 'Bip01_L_Toe0', thigh_r: 'Bip01_R_Thigh', calf_r: 'Bip01_R_Calf', foot_r: 'Bip01_R_Foot', ball_r: 'Bip01_R_Toe0' };
const FING = { thumb: '0', index: '1', middle: '2', ring: '3', pinky: '4' };
for (const side of ['l', 'r']) for (const [f, k] of Object.entries(FING)) { const S = side.toUpperCase(); MAP[`${f}_01_${side}`] = `Bip01_${S}_Finger${k}`; MAP[`${f}_02_${side}`] = `Bip01_${S}_Finger${k}1`; MAP[`${f}_03_${side}`] = `Bip01_${S}_Finger${k}2`; }
const DIRCHILD = { clavicle_l: 'upperarm_l', upperarm_l: 'lowerarm_l', lowerarm_l: 'hand_l', hand_l: 'middle_01_l', clavicle_r: 'upperarm_r', upperarm_r: 'lowerarm_r', lowerarm_r: 'hand_r', hand_r: 'middle_01_r',
  thigh_l: 'calf_l', calf_l: 'foot_l', thigh_r: 'calf_r', calf_r: 'foot_r', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'head' };
for (const side of ['l', 'r']) for (const f of Object.keys(FING)) { DIRCHILD[`${f}_01_${side}`] = `${f}_02_${side}`; DIRCHILD[`${f}_02_${side}`] = `${f}_03_${side}`; }
async function retargetFrom(src) {
  const gltf = await loadGLB(src.file); const sScene = gltf.scene; sScene.updateMatrixWorld(true);
  const sBones = {}; sScene.traverse((o) => { if (o.isBone) sBones[o.name] = o; });
  const sRest = {}; for (const [n, b] of Object.entries(sBones)) sRest[n] = { p: b.position.clone(), q: b.quaternion.clone() };
  const sWorldQ = (n) => sBones[n].getWorldQuaternion(new THREE.Quaternion()), sWorldP = (n) => sBones[n].getWorldPosition(new THREE.Vector3());
  for (const [n, b] of Object.entries(sBones)) { b.position.copy(sRest[n].p); b.quaternion.copy(sRest[n].q); } sScene.updateMatrixWorld(true);
  const pairs = Object.entries(MAP).filter(([s, t]) => sBones[s] && tBones[t]);
  const sRefQ = {}, sRefP = {}; for (const [s] of pairs) { sRefQ[s] = sWorldQ(s); sRefP[s] = sWorldP(s); }
  // target reference = its bind pose with the limbs re-aimed (top-down) along the source's rest directions
  restoreTarget(); const t2s = Object.fromEntries(pairs.map(([s, t]) => [t, s]));
  for (const tn of tOrder) { const sn = t2s[tn]; if (!sn || !DIRCHILD[sn]) continue; const sc = DIRCHILD[sn], tc = MAP[sc]; if (!sBones[sc] || !tBones[tc]) continue;
    avatar.updateMatrixWorld(true); const tb = tBones[tn];
    const dt = tBones[tc].getWorldPosition(new THREE.Vector3()).sub(tb.getWorldPosition(new THREE.Vector3())).normalize(), ds = sRefP[sc].clone().sub(sRefP[sn]).normalize();
    const Rq = new THREE.Quaternion().setFromUnitVectors(dt, ds), wq = tb.getWorldQuaternion(new THREE.Quaternion()), pw = tb.parent.getWorldQuaternion(new THREE.Quaternion()); tb.quaternion.copy(pw.invert().multiply(Rq.multiply(wq))); }
  avatar.updateMatrixWorld(true);
  const tRefQ = {}; for (const [, t] of pairs) tRefQ[t] = tBones[t].getWorldQuaternion(new THREE.Quaternion());
  const tPelvisRefP = tBones.Bip01_Pelvis.getWorldPosition(new THREE.Vector3()), k = tPelvisRefP.y / sRefP.pelvis.y;   // source → target units (both world)
  const rootRest = tRestLocal[ROOT].p.clone(), rootParentInvS = 1 / US;   // root local units are centimetres under the scaled avatar
  restoreTarget();
  for (const want of src.clips) {
    const sc = gltf.animations.find((a) => a.name === want.from); if (!sc) { console.warn('missing clip', want.from); continue; }
    const mixer = new THREE.AnimationMixer(sScene); const act = mixer.clipAction(sc); act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.play();
    const t0 = want.trimStart || 0, t1 = Math.min(sc.duration, want.trimEnd || sc.duration), dur = t1 - t0, n = Math.max(2, Math.round(dur * 30) + 1);
    const times = new Float32Array(n), qv = {}; for (const [, t] of pairs) qv[t] = new Float32Array(n * 4); const pv = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const t = Math.min(t1 - 1e-4, t0 + i / 30); times[i] = t - t0; act.reset(); act.play(); mixer.setTime(t); sScene.updateMatrixWorld(true);
      const world = {};
      for (const tn of tOrder) { const b = tBones[tn]; const pW = b.parent && b.parent.isBone ? world[b.parent.name] : b.parent.getWorldQuaternion(new THREE.Quaternion()); const sn = t2s[tn];
        if (sn) { const D = sWorldQ(sn).multiply(sRefQ[sn].clone().invert()); world[tn] = D.multiply(tRefQ[tn]); pW.clone().invert().multiply(world[tn]).toArray(qv[tn], i * 4); }
        else world[tn] = pW.clone().multiply(tRestLocal[tn].q); }
      const dp = sWorldP('pelvis').sub(sRefP.pelvis).multiplyScalar(k * rootParentInvS); if (want.inPlace !== false) { dp.x = 0; dp.z = 0; }
      // Biped root axes: the Bip01 node sits under the FBX root (Y up in world); offsets go into world-aligned local space here
      pv.set([rootRest.x + dp.x, rootRest.y + dp.y, rootRest.z + dp.z], i * 3); }
    const tracks = [new THREE.VectorKeyframeTrack(ROOT + '.position', times, pv)]; for (const [, t] of pairs) tracks.push(new THREE.QuaternionKeyframeTrack(`${t}.quaternion`, times, qv[t]));
    const clip = new THREE.AnimationClip(want.key, -1, tracks);
    encode(want.key, clip, { loop: want.loop, measure: want.measure, speed: want.speed, fps: want.fps }); mixer.stopAllAction(); mixer.uncacheRoot(sScene); }
}
for (const src of cfg.retarget || []) await retargetFrom(src);

// ---------- poses measured for placing the figure (hips over a seat, lying height) ----------
function boneY(key, bone, frac = 0.5) { const clip = CL[key]; if (!clip) return null; restoreTarget(); const mixer = new THREE.AnimationMixer(avatar); const a = mixer.clipAction(clip); a.play(); mixer.setTime(clip.duration * frac); avatar.updateMatrixWorld(true);
  const y = tBones[bone].getWorldPosition(new THREE.Vector3()).y; let mn = 1e9; for (const f of ['Bip01_L_Foot', 'Bip01_R_Foot', 'Bip01_L_Toe0', 'Bip01_R_Toe0']) if (tBones[f]) mn = Math.min(mn, tBones[f].getWorldPosition(new THREE.Vector3()).y);
  mixer.stopAllAction(); mixer.uncacheRoot(avatar); restoreTarget(); return { y: +y.toFixed(3), feet: +mn.toFixed(3) }; }
out.meta.restHip = +tBones.Bip01_Pelvis.getWorldPosition(new THREE.Vector3()).y.toFixed(3);
for (const [k, b] of [['sit', 'Bip01_Pelvis'], ['lie', 'Bip01_Pelvis'], ['crawl', 'Bip01_Pelvis'], ['crouchIdle', 'Bip01_Pelvis']]) { const r = boneY(k, b); if (r) out.meta[k + 'Hip'] = r; }
console.log('meta', JSON.stringify(out.meta));

// ---------- the mesh without animations ----------
restoreTarget();
avatar.animations = [];
avatar.traverse((o) => { if (!o.isMesh) return; const conv = (m) => { const n = new THREE.MeshStandardMaterial({ name: m.name, color: 0xffffff, roughness: 0.8, metalness: 0 }); return n; };
  o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material); });
console.log('materials', [...new Set((() => { const a = []; avatar.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => a.push(m.name)); }); return a; })())].join(', '));
const exp = new GLTFExporter();
const glb = await new Promise((res, rej) => exp.parse(avatar, res, rej, { binary: true, animations: [], onlyVisible: false }));
fs.mkdirSync(cfg.outDir, { recursive: true });
fs.writeFileSync(path.join(cfg.outDir, cfg.name + '_mesh.glb'), Buffer.from(glb));
fs.writeFileSync(path.join(cfg.outDir, cfg.name + '_clips.json'), JSON.stringify(out));
console.log('wrote', cfg.name + '_mesh.glb', (glb.byteLength / 1e6).toFixed(2), 'MB,', cfg.name + '_clips.json', (JSON.stringify(out).length / 1e6).toFixed(2), 'MB');
