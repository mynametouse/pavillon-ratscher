// ---------- existing buildings on the plot (the owner's photos + aerial): B carport + caravan, C wooden house, D green bungalow, greenhouse, wash house ----------
// Walls are built with real openings (outside cladding and inside lining), every door opens outwards and every room is walkable.
import * as THREE from 'three';
import { rnd, rr, scene, V } from '../core/head.js';
import { ANISO, dimIndoor, grime, patchSV, pbrMat, plain, TEXMAN } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, COL, hingeDoor, PH, PH_END, phase, siteUV, tagPh, WALK } from '../core/geo.js';
import { cutOps } from '../pavilion/house_base.js';
import { S0 } from './env.js';
phase(null);
export const BLD = S0.bld;
// local frame: x along the long side (compass heading az), y to the left of it (az - 90), z up
export function siteGroup(b) {
  const g = new THREE.Group();
  g.position.copy(V(b.c[0], b.c[1], 0));
  g.rotation.y = (-(b.az - 90) * Math.PI) / 180;
  scene.add(g);
  return g;
}
export function gB(g, x0, x1, y0, y1, z0, z1, m, o = {}) {
  return B(x0, x1, y0, y1, z0, z1, m, Object.assign({ parent: g, col: false }, o));
}
export function worldOf(b, lx, ly) {
  const a = (b.az * Math.PI) / 180;
  const ux = [Math.sin(a), Math.cos(a)],
    vy = [Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)];
  return [b.c[0] + lx * ux[0] + ly * vy[0], b.c[1] + lx * ux[1] + ly * vy[1]];
}
// tilted slab in the local frame: box w (x) × d (along the slope, y) × t, raised by dz over its length (slope along local y, +y end higher)
export function slopeSlab(g, cx, cy, zc, w, d, t, dz, m, o = {}) {
  const L = Math.hypot(d, dz);
  const geo = new THREE.BoxGeometry(w, t, L);
  siteUV(geo, cx, cy, zc, 'x', [w, L]);
  const me = new THREE.Mesh(geo, m);
  me.position.copy(V(cx, cy, zc));
  me.rotation.x = Math.atan2(dz, d);
  me.castShadow = o.cast ?? true;
  me.receiveShadow = true;
  g.add(me);
  return tagPh(me);
}
// same, sloping along local x (+x end higher by dz)
export function slopeSlabX(g, cx, cy, zc, w, d, t, dz, m, o = {}) {
  const L = Math.hypot(w, dz);
  const geo = new THREE.BoxGeometry(L, t, d);
  siteUV(geo, cx, cy, zc, 'y', [L, d]);
  const me = new THREE.Mesh(geo, m);
  me.position.copy(V(cx, cy, zc));
  me.rotation.z = Math.atan2(dz, w);
  me.castShadow = o.cast ?? true;
  me.receiveShadow = true;
  g.add(me);
  return tagPh(me);
}
// painted board cladding: canvas texture with board shadows (horizontal or vertical boards)
export function boardTex(hex, boardW, vertical, wear = 0.08) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const q = c.getContext('2d');
  const col = new THREE.Color(hex);
  q.fillStyle = '#' + col.getHexString();
  q.fillRect(0, 0, 512, 512);
  const n = Math.round(1 / boardW),
    bw = 512 / n;
  for (let i = 0; i < n; i++) {
    const k = 1 + (rnd() - 0.5) * wear;
    q.fillStyle = '#' + col.clone().multiplyScalar(k).getHexString();
    if (vertical) q.fillRect(i * bw, 0, bw, 512);
    else q.fillRect(0, i * bw, 512, bw);
    q.fillStyle = 'rgba(0,0,0,0.35)';
    if (vertical) q.fillRect(i * bw, 0, 2, 512);
    else q.fillRect(0, i * bw, 512, 3);
    q.fillStyle = 'rgba(255,255,255,0.12)';
    if (vertical) q.fillRect(i * bw + 2, 0, 2, 512);
    else q.fillRect(0, i * bw + 3, 512, 2);
  }
  for (let i = 0; i < 1500; i++) {
    q.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`;
    q.fillRect(rnd() * 512, rnd() * 512, rr(1, 3), rr(1, 14));
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}
// painted boards: photo texture of white painted planks (grain, seams, worn paint, relief) tinted to the paint colour – the canvas boards stay as fallback
export function boardMat(hex, boardW, vertical, o = {}) {
  const PHOTO = { paintwood: [0.457, 0.381, 0.339, 0.52], weatherwood: [0.061, 0.058, 0.05, 0.84] },
    ph = o.photo || 'paintwood',
    A = PHOTO[ph];
  if (TEXMAN[ph]) {
    const c = new THREE.Color(hex);
    c.r /= A[0];
    c.g /= A[1];
    c.b /= A[2]; // divide out the photo's own albedo, so the boards get the paint colour on average
    const m = pbrMat(ph, {
      color: c,
      rot: vertical ? 0 : Math.PI / 2,
      nrm: 0.9,
      rough: (o.rough ?? 0.82) / A[3],
      env: 0.7,
      fallback: hex,
    });
    m.name = 'boards';
    return m;
  }
  const t = boardTex(hex, boardW, vertical, o.wear);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: o.rough ?? 0.82, metalness: 0, envMapIntensity: 0.7 });
  m.name = 'boards';
  return patchSV(m);
}
// green bitumen scallop shingles (Biberschwanz) as on the wooden house
function shingleTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const q = c.getContext('2d');
  const px = 512; // 1 m
  q.fillStyle = '#2a2d2a';
  q.fillRect(0, 0, px, px);
  const rowH = 0.145 * px,
    sw = 0.167 * px;
  let row = 0;
  for (let y = -rowH; y < px + rowH; y += rowH, row++) {
    const off = ((row % 2) * sw) / 2;
    for (let x = -sw; x < px + sw; x += sw) {
      const g = 0.86 + rnd() * 0.28;
      q.fillStyle = `rgb(${Math.round(78 * g)},${Math.round(96 * g)},${Math.round(84 * g)})`;
      q.beginPath();
      q.moveTo(x + off, y);
      q.lineTo(x + off + sw, y);
      q.lineTo(x + off + sw, y + rowH * 0.95);
      q.arc(x + off + sw / 2, y + rowH * 0.95, sw / 2, 0, Math.PI);
      q.closePath();
      q.fill();
      q.strokeStyle = 'rgba(0,0,0,0.45)';
      q.lineWidth = 1.5;
      q.stroke();
    }
  }
  for (let i = 0; i < 14000; i++) {
    q.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},255,255,${rnd() * 0.12})`;
    q.fillRect(rnd() * px, rnd() * px, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}
export const MATS = {
  ochre: boardMat(0xc8903c, 0.095, true, { wear: 0.12 }), // Holzhaus C, Endzustand ocker
  pale: dimIndoor(boardMat(0xe9d6ad, 0.095, true, { wear: 0.05 }), 0.65, 0.5), // Innenschalung Holzhaus
  greenBoards: boardMat(0x8aa37c, 0.11, false, { wear: 0.07 }), // Bungalow D
  white: plain({ color: 0xf1efe8, roughness: 0.75 }),
  whiteRoof: plain({ color: 0xd4d3cd, roughness: 0.95 }),
  cream: plain({ color: 0xece8da, roughness: 0.42, metalness: 0.08, envMapIntensity: 0.9, side: THREE.DoubleSide }),
  creamBox: plain({ color: 0xece8da, roughness: 0.42, metalness: 0.08, envMapIntensity: 0.9 }),
  liner: dimIndoor(plain({ color: 0xf4f1e8, roughness: 0.8, side: THREE.DoubleSide }), 0.6, 0.6),
  tint: plain({
    color: 0x1b2024,
    roughness: 0.06,
    metalness: 0.2,
    transparent: true,
    opacity: 0.62,
    envMapIntensity: 1.2,
  }),
  caravanDark: plain({ color: 0x23272b, roughness: 0.18, metalness: 0.25 }),
  gold: plain({ color: 0xb9a160, roughness: 0.4, metalness: 0.6 }),
  felt: plain({ color: 0x2b2927, roughness: 0.97 }),
  oldFrame: plain({ color: 0x6a3f2b, roughness: 0.7 }),
  shingle: (() => {
    const m = new THREE.MeshStandardMaterial({
      map: shingleTex(),
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0.6,
    });
    m.name = 'shingle';
    return patchSV(m);
  })(),
  tyre: plain({ color: 0x1c1c1c, roughness: 0.9 }),
  tomato: plain({ color: 0xc2352a, roughness: 0.4 }),
  leaf: plain({ color: 0x3f7f35, roughness: 0.9, side: THREE.DoubleSide }),
  stake: plain({ color: 0x8d7a5a, roughness: 0.9 }),
  blue: plain({ color: 0x2a5aa8, roughness: 0.5 }),
};
MATS.tint.depthWrite = false;
// hammered ('stucco') aluminium skin of the old caravan: a fine dented relief as a normal map
{
  const N = 256,
    h = new Float32Array(N * N);
  for (let k = 0; k < 1500; k++) {
    const cx = rnd() * N,
      cy = rnd() * N,
      r = 3 + rnd() * 5,
      a = (rnd() - 0.5) * 0.7;
    for (let y = -Math.ceil(r); y <= r; y++)
      for (let x = -Math.ceil(r); x <= r; x++) {
        const d = (x * x + y * y) / (r * r);
        if (d < 1) h[(((((cy + y) | 0) % N) + N) % N) * N + (((((cx + x) | 0) % N) + N) % N)] += a * (1 - d) * (1 - d);
      }
  }
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const q = c.getContext('2d'),
    img = q.createImageData(N, N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)],
        dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
      const nx = -dx * 1.6,
        ny = dy * 1.6,
        L = Math.hypot(nx, ny, 1),
        i = (y * N + x) * 4;
      img.data[i] = ((nx / L) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / L) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / L) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  q.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3.5, 3.5);
  t.anisotropy = ANISO;
  for (const m of [MATS.cream, MATS.creamBox]) {
    m.normalMap = t;
    m.normalScale.set(0.45, 0.45);
    m.roughness = 0.5;
    m.needsUpdate = true;
  }
}
grime(MATS.ochre, 0.45, 0.5, 0.08, 0.12);
grime(MATS.greenBoards, 0.45, 0.5, 0.08, 0.1);
grime(MATS.white, 0.5, 0.5, 0.06);
grime(MATS.creamBox, 0.4, 0.55, 0.05, 0.16);
grime(MATS.cream, 0.4, 0.55, 0.05, 0.2);
grime(MATS.stake, 0.3, 0.3, 0.1);
export function wheel(g, x, y, z, r, w, rimR) {
  const geo = new THREE.CylinderGeometry(r, r, w, 24);
  const me = new THREE.Mesh(geo, MATS.tyre);
  me.position.copy(V(x, y, z));
  me.rotation.x = Math.PI / 2;
  me.castShadow = true;
  g.add(me);
  tagPh(me);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, w + 0.01, 20), MAT.steel);
  rim.position.copy(V(x, y, z));
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  tagPh(rim);
}
// ---- local-frame colliders, floors and doors (rotation descriptor at index 9, see 12_game) ----
export function rotDesc(b, ox = 0, oy = 0) {
  const a = (b.az * Math.PI) / 180;
  const c = Math.sin(a),
    s = Math.cos(a);
  const w = worldOf(b, ox, oy);
  return { cx: w[0], cy: w[1], c, s };
}
export function lcol(r, x0, x1, y0, y1, z0, z1, tag = 'wall') {
  COL.push([x0, x1, y0, y1, z0, z1, tag, PH, PH_END, r]);
}
export function lwalk(r, x0, x1, y0, y1, zt, type = 'wood') {
  WALK.push([x0, x1, y0, y1, zt, type, PH, PH_END, undefined, r]);
}
export function ldoor(key, b, leaf, { lx, ly, dir, w, sign, z0, z1, ox = 0, oy = 0 }) {
  const a = (b.az * Math.PI) / 180;
  const ux = [Math.sin(a), Math.cos(a)],
    vy = [-Math.cos(a), Math.sin(a)];
  const h = worldOf(b, lx + ox, ly + oy);
  const d = [dir[0] * ux[0] + dir[1] * vy[0], dir[0] * ux[1] + dir[1] * vy[1]];
  return hingeDoor(key, leaf, { hx: h[0], hy: h[1], a: d, w, sign, z0, z1 });
}
export function inLocal(b, x, y, hx, hy, ox = 0, oy = 0) {
  const a = (b.az * Math.PI) / 180;
  const c = Math.sin(a),
    s = Math.cos(a);
  const w = worldOf(b, ox, oy);
  const dx = x - w[0],
    dy = y - w[1];
  const lx = dx * c + dy * s,
    ly = -dx * s + dy * c;
  return Math.abs(lx) < hx && Math.abs(ly) < hy;
}
export const INSIDE = [];
export const FOOT = [];
window.SITE_FOOT = FOOT;
export const IW = dimIndoor(plain({ color: 0xf3f1ea, roughness: 0.85 }), 0.6, 0.6);
export const ICEIL = dimIndoor(plain({ color: 0xf1ede6, roughness: 0.9 }), 0.62, 0.9);
export const SINK = plain({ color: 0x8a949c, roughness: 0.35, metalness: 0.6 });
export function faceOf(b, localDeg) {
  return b.az + localDeg;
} // placeGLB face angle: compass degrees; local 0 = facing +y of the building (az)
// ---- walls with openings in a local frame: run 'x' = wall along local x (thickness t0..t1 in y), run 'y' = along local y (thickness in x); ops [{a0,a1,s,h}] ----
export function lw(g, run, a0, a1, t0, t1, z0, z1, ops, m, o = {}) {
  for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, ops)) {
    if (run === 'x') gB(g, p0, p1, t0, t1, q0, q1, m, o);
    else gB(g, t0, t1, p0, p1, q0, q1, m, o);
  }
}
export function lwc(r, run, a0, a1, t0, t1, z0, z1, doors = [], tag = 'wall') {
  for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, doors)) {
    if (run === 'x') lcol(r, p0, p1, t0, t1, q0, q1, tag);
    else lcol(r, t0, t1, p0, p1, q0, q1, tag);
  }
}
export function lbox(g, run, a0, a1, t0, t1, z0, z1, m, o = {}) {
  return run === 'x' ? gB(g, a0, a1, t0, t1, z0, z1, m, o) : gB(g, t0, t1, a0, a1, z0, z1, m, o);
}
// window: frame + pane centred at tc in the wall thickness
export function lwin(
  g,
  run,
  a0,
  a1,
  tc,
  z0,
  z1,
  { frame = MATS.white, fw = 0.05, depth = 0.07, mull = [], glassM = MAT.glass } = {}
) {
  const fb = (p0, p1, q0, q1) => lbox(g, run, p0, p1, tc - depth / 2, tc + depth / 2, q0, q1, frame, { cast: false });
  fb(a0, a1, z0, z0 + fw);
  fb(a0, a1, z1 - fw, z1);
  fb(a0, a0 + fw, z0 + fw, z1 - fw);
  fb(a1 - fw, a1, z0 + fw, z1 - fw);
  for (const m of mull) fb(m - fw / 2, m + fw / 2, z0 + fw, z1 - fw);
  const gl = lbox(g, run, a0 + fw, a1 - fw, tc - 0.004, tc + 0.004, z0 + fw, z1 - fw, glassM, {
    cast: false,
    recv: false,
  });
  if (gl) gl.renderOrder = 2;
}
// door lining (jambs + head) on the outer face, outward direction k (+1/-1 along the thickness axis)
export function ljamb(g, run, a0, a1, t0, t1, z0, z1, m, w = 0.05) {
  lbox(g, run, a0 - w, a0, t0, t1, z0, z1 + w, m, { cast: false });
  lbox(g, run, a1, a1 + w, t0, t1, z0, z1 + w, m, { cast: false });
  lbox(g, run, a0, a1, t0, t1, z1, z1 + w, m, { cast: false });
}
// louvred shutters left and right of a window, on the outer face (tOut, outward sign k)
export function lshut(g, run, a0, a1, tOut, k, z0, z1, m) {
  const w = (a1 - a0) / 2,
    f = tOut + 0.035 * k,
    t0 = Math.min(tOut, f),
    t1 = Math.max(tOut, f),
    s0 = Math.min(f, f + 0.006 * k),
    s1 = Math.max(f, f + 0.006 * k);
  for (const [p0, p1] of [
    [a0 - w - 0.05, a0 - 0.05],
    [a1 + 0.05, a1 + w + 0.05],
  ]) {
    lbox(g, run, p0, p1, t0, t1, z0 - 0.02, z1 + 0.02, m);
    for (let z = z0 + 0.12; z < z1 - 0.06; z += 0.11)
      lbox(g, run, p0 + 0.04, p1 - 0.04, s0, s1, z, z + 0.018, MAT.fascia, { cast: false });
  }
}
// trapezoid infill (gable of a mono-pitch roof): along the run from a0 (top zA) to a1 (top zB), base z0, thickness t0..t1
export function ltrap(g, run, a0, a1, t0, t1, z0, zA, zB, m) {
  const sh = new THREE.Shape();
  sh.moveTo(a0, z0);
  sh.lineTo(a1, z0);
  sh.lineTo(a1, zB);
  sh.lineTo(a0, zA);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: t1 - t0, bevelEnabled: false });
  const me = new THREE.Mesh(geo, m);
  if (run === 'x') me.position.set(0, 0, -t1);
  else {
    me.rotation.y = Math.PI / 2;
    me.position.set(t0, 0, 0);
  }
  me.castShadow = true;
  me.receiveShadow = true;
  g.add(me);
  return tagPh(me);
}
