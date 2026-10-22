// ===================== the camera (split from game/game.js): every view mode (eyes, third person, orbit, plan), the third-person camera
// kept out of walls and ceilings, canvas size (resize) =====================
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { cam, R, stage, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { COL } from '../core/geo.js';
import { RENDER, sizeMotion } from '../render/render.js';
import { cellItems, CG, doorCols, P, phOk, surfaces, toLocal } from './walkable.js';
import { CAM3 } from './player.js';
Object.assign(LATE, { applyCam, resize }); // functions for modules that load earlier: render/render.js
let bob = 0; // head bob while walking (set by the physics in game/game.js)
export function setBob(b) {
  bob = b;
}
const TOP_FOV = 30;
function topH() {
  return P.th / (2 * Math.tan((TOP_FOV * Math.PI) / 360));
} // camera height for a picture P.th metres tall
export const TOPMAX = () => (window.RATSCHER && LATE.RATSCHER.ready ? 9000 : 170); // the plan view zooms out to the whole valley once the real surroundings are there
export const FAR0 = () => (window.RATSCHER && LATE.RATSCHER.ready ? 30000 : 12000);
export const ORBMAX = () => (window.RATSCHER && LATE.RATSCHER.ready ? 420 : 70); // the model view may step back far enough to see the village
export function applyCam() {
  if (P.mode === 'top') {
    P.th = Math.min(P.th, TOPMAX());
    const lim = TOPMAX() > 1000 ? 11000 : 400;
    P.tx = THREE.MathUtils.clamp(P.tx, -lim, lim);
    P.ty = THREE.MathUtils.clamp(P.ty, -lim, lim);
    const h = topH();
    cam.fov = TOP_FOV;
    cam.near = Math.max(0.5, h * 0.04);
    cam.far = Math.max(FAR0(), h * 1.6);
    cam.updateProjectionMatrix();
    cam.up.set(0, 0, -1);
    cam.position.copy(V(P.tx, P.ty, h));
    cam.lookAt(V(P.tx, P.ty, 0));
    if (window.SITEPLAN) LATE.SITEPLAN.onCam();
    return;
  }
  cam.up.set(0, 1, 0);
  if (P.mode === 'orbit') {
    const a = (P.az * Math.PI) / 180,
      e = (P.el * Math.PI) / 180,
      t = P.tgt;
    const ox = t[0] + Math.sin(a) * Math.cos(e) * P.r,
      oy = t[1] + Math.cos(a) * Math.cos(e) * P.r,
      gz = window.RATSCHER && LATE.RATSCHER.ready ? KERN.terrain(ox, oy) + 3 : 0.6; // never inside a hill
    cam.fov = 45;
    cam.near = Math.max(0.1, P.r * 0.02);
    cam.far = FAR0();
    cam.updateProjectionMatrix();
    cam.position.copy(V(ox, oy, Math.max(gz, t[2] + Math.sin(e) * P.r)));
    cam.lookAt(V(...t));
  } else {
    if (window.VEH && LATE.VEH.applyCam()) return; // V16b: driving – chase camera or the driver's eyes
    const y = (P.yaw * Math.PI) / 180,
      p = (P.pitch * Math.PI) / 180,
      c = P.cam; // P.cam: seat, ride or a short move there (23_play)
    cam.near = 0.1;
    cam.far = FAR0();
    if (CAM3.on) {
      const pv = cam3Pivot(),
        fx = Math.sin(y) * Math.cos(p),
        fy = Math.cos(y) * Math.cos(p),
        fz = Math.sin(p),
        d = CAM3.cur; // behind the figure, looking past its shoulder
      cam.fov = window.innerWidth < 760 ? 68 : 60;
      cam.updateProjectionMatrix();
      cam.position.copy(V(pv[0] - fx * d, pv[1] - fy * d, pv[2] - fz * d));
      cam.lookAt(V(pv[0] + fx, pv[1] + fy, pv[2] + fz));
      return;
    }
    const cx = c ? c.x : P.x,
      cy = c ? c.y : P.y,
      z = c ? c.z : P.feet + P.eyeH + bob;
    cam.fov = window.FOVX || (window.innerWidth < 760 ? 76 : 70);
    cam.updateProjectionMatrix();
    cam.position.copy(V(cx, cy, z));
    cam.lookAt(V(cx + Math.sin(y) * Math.cos(p), cy + Math.cos(y) * Math.cos(p), z + Math.sin(p)));
  }
}
// ---- third person: the pivot sits at eye height over the right shoulder; the camera keeps out of walls, floors and ceilings ----
function cam3Base() {
  const c = P.cam;
  return c ? [c.x, c.y, c.z - 0.1] : [P.x, P.y, P.feet + P.eyeH - 0.14];
} // a little below the eyes: the shoulder
function cam3Pivot() {
  const b = cam3Base(),
    y = (P.yaw * Math.PI) / 180;
  return [b[0] + Math.cos(y) * CAM3.sideCur, b[1] - Math.sin(y) * CAM3.sideCur, b[2]];
}
// free part (0..1) of the segment a → b: colliders (boxes, also turned ones), doors, walk surfaces as slabs, the ground
function segBox(a, b, c, pad) {
  const p0 = c[9] ? toLocal(c, a[0], a[1]) : [a[0], a[1]],
    p1 = c[9] ? toLocal(c, b[0], b[1]) : [b[0], b[1]];
  const o = [p0[0], p0[1], a[2]],
    d = [p1[0] - p0[0], p1[1] - p0[1], b[2] - a[2]],
    lo = [c[0] - pad, c[2] - pad, c[4] - pad],
    hi = [c[1] + pad, c[3] + pad, c[5] + pad];
  if (o[0] > lo[0] && o[0] < hi[0] && o[1] > lo[1] && o[1] < hi[1] && o[2] > lo[2] && o[2] < hi[2]) return 1; // starts inside: ignore that one
  let t0 = 0,
    t1 = 1;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-9) {
      if (o[k] < lo[k] || o[k] > hi[k]) return 1;
      continue;
    }
    let ta = (lo[k] - o[k]) / d[k],
      tb = (hi[k] - o[k]) / d[k];
    if (ta > tb) {
      const s = ta;
      ta = tb;
      tb = s;
    }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return 1;
  }
  return t0;
}
function camRay(a, b, pad = 0.14) {
  let t = 1;
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    L = Math.hypot(dx, dy, dz);
  if (L < 1e-4) return 1;
  const n = Math.max(2, Math.ceil(L / 0.15)),
    seen = new Set();
  for (let i = 0; i <= n; i++) {
    const k = i / n,
      x = a[0] + dx * k,
      y = a[1] + dy * k;
    for (const j of cellItems(CG, x, y)) seen.add(j);
    for (const j of cellItems(CG, x + 0.3, y)) seen.add(j);
    for (const j of cellItems(CG, x - 0.3, y)) seen.add(j);
    for (const j of cellItems(CG, x, y + 0.3)) seen.add(j);
    for (const j of cellItems(CG, x, y - 0.3)) seen.add(j);
  }
  for (const j of seen) {
    const c = COL[j];
    if (!phOk(c)) continue;
    const h = segBox(a, b, c, pad);
    if (h < t) t = h;
  }
  for (const c of doorCols()) {
    const h = segBox(a, b, c, pad);
    if (h < t) t = h;
  }
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    if (k > t) break;
    const x = a[0] + dx * k,
      y = a[1] + dy * k,
      z = a[2] + dz * k;
    for (const [s] of surfaces(x, y))
      if (z > s - 0.24 && z < s + 0.18) {
        const kk = Math.max(0, (i - 1) / n);
        if (kk < t) t = kk;
        break;
      }
  }
  return t;
}
export function cam3Update(dt) {
  if (!CAM3.on) return;
  const b = cam3Base(),
    y = (P.yaw * Math.PI) / 180,
    p = (P.pitch * Math.PI) / 180,
    sx = Math.cos(y),
    sy = -Math.sin(y),
    c0 = CAM3.cur,
    s0 = CAM3.sideCur;
  // the shoulder offset shrinks next to a wall on the right
  const reach = CAM3.side + 0.16,
    fs = camRay(b, [b[0] + sx * reach, b[1] + sy * reach, b[2]], 0.04),
    side = Math.max(0, Math.min(CAM3.side, fs * reach - 0.16));
  CAM3.sideCur = side < CAM3.sideCur ? side : CAM3.sideCur + (side - CAM3.sideCur) * Math.min(1, dt * 4);
  const pv = [b[0] + sx * CAM3.sideCur, b[1] + sy * CAM3.sideCur, b[2]],
    fx = Math.sin(y) * Math.cos(p),
    fy = Math.cos(y) * Math.cos(p),
    fz = Math.sin(p),
    D = CAM3.d + 0.2;
  const free = camRay(pv, [pv[0] - fx * D, pv[1] - fy * D, pv[2] - fz * D]) * D - 0.2,
    tgt = Math.max(0.2, Math.min(CAM3.d, free));
  CAM3.cur = tgt < CAM3.cur ? tgt : CAM3.cur + (tgt - CAM3.cur) * Math.min(1, dt * 2.2);
  if (Math.abs(CAM3.cur - c0) > 1e-3 || Math.abs(CAM3.sideCur - s0) > 1e-3) markDirty();
}
export function resize() {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  if (!w || !h) return;
  R.setSize(w, h, false);
  if (RENDER.composer) RENDER.composer.setSize(w, h);
  sizeMotion();
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
  markDirty();
}
