// ===================== the walkable model (split from game/game.js in refactor phase 1): player state P, building phases, walk surfaces
// and colliders in a spatial hash, floor height, doors, collision of the walker; P comes first – everything below reads it =====================
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { scene, VARIANT, varOk } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, SV } from '../core/assets.js';
import { COL, PHN, WALK } from '../core/geo.js';
import { STREAM } from '../garden/stream_geo.js';
import { gravelMask } from '../garden/grass.js';
import { giApply } from '../render/render.js';
Object.assign(LATE, { poseDoor, rebuildGrids }); // functions for modules that load earlier: core/geo.js, pavilion/interior.js
export const P = {
  x: 2,
  y: -6,
  feet: 0,
  vz: 0,
  yaw: 0,
  pitch: 0,
  mode: 'orbit',
  az: 225,
  el: 16,
  r: 19,
  tgt: [2, 2, 3.2],
  stride: 0,
  tx: 2.0,
  ty: -6.5,
  th: 110, // tx, ty, th: plan view centre and height of the picture (m)
  stance: 'stand',
  eyeH: 1.62,
  body: 0,
  air: false,
  speed: 0,
  mvx: 0,
  mvy: 0,
  landT: 0,
}; // V15: posture, smoothed eye height, the figure's heading (deg), airborne, ground speed (m/s), last move direction
LATE.P = P;
export const G = window.GEO;
export const EYE = 1.62,
  RAD = 0.21,
  STEP = 0.42,
  WALK_SPEED = 2.5; // m/s (Shift ×1.9); on ladder treads a fifth of it
// spatial hash for walk surfaces and colliders (0.5 m cells)
// entries may carry a rotation descriptor at [9] = {cx, cy, c, s}: the box is given in a local frame rotated by the angle (c = cos, s = sin) about (cx, cy)
function aabbOf(b) {
  const r = b[9];
  if (!r) return b;
  const pts = [
    [b[0], b[2]],
    [b[1], b[2]],
    [b[1], b[3]],
    [b[0], b[3]],
  ].map(([x, y]) => [r.cx + x * r.c - y * r.s, r.cy + x * r.s + y * r.c]);
  return [
    Math.min(...pts.map(p => p[0])),
    Math.max(...pts.map(p => p[0])),
    Math.min(...pts.map(p => p[1])),
    Math.max(...pts.map(p => p[1])),
  ];
}
export function toLocal(b, x, y) {
  const r = b[9];
  if (!r) return [x, y];
  const dx = x - r.cx,
    dy = y - r.cy;
  return [dx * r.c + dy * r.s, -dx * r.s + dy * r.c];
}
export function toWorld(b, x, y) {
  const r = b[9];
  if (!r) return [x, y];
  return [r.cx + x * r.c - y * r.s, r.cy + x * r.s + y * r.c];
}
function mkGrid(list, cs = 0.5) {
  const m = new Map();
  list.forEach((b, i) => {
    const a = aabbOf(b);
    for (let gx = Math.floor(a[0] / cs); gx <= Math.floor(a[1] / cs); gx++)
      for (let gy = Math.floor(a[2] / cs); gy <= Math.floor(a[3] / cs); gy++) {
        const k = gx + ',' + gy;
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(i);
      }
  });
  return { m, cs, list };
}
export let WG = null,
  CG = null;
export function rebuildGrids() {
  WG = mkGrid(WALK);
  CG = mkGrid(COL);
}
rebuildGrids();
export function cellItems(Gd, x, y) {
  return Gd.m.get(Math.floor(x / Gd.cs) + ',' + Math.floor(y / Gd.cs)) || [];
}
export let PHASE = 11;
Object.defineProperty(LATE, 'PHASE', { get: () => PHASE, enumerable: true });
window.PHASE = PHASE;
// colliders: [7] phase from, [8] phase until, [10] variant; walk surfaces: [6]/[7] phase, [8] key of a hatch lid (surface only while closed), [10] variant
export const phOk = e =>
  (e[7] == null || e[7] <= PHASE) && (e[8] == null || PHASE < e[8]) && (e[10] == null || e[10] === VARIANT);
export function surfaces(x, y) {
  const out = [[groundZ(x, y), 'ground']];
  for (const i of cellItems(WG, x, y)) {
    const b = WALK[i];
    if (b[6] != null && !(b[6] <= PHASE && (b[7] == null || PHASE < b[7]))) continue;
    if (b[10] != null && b[10] !== VARIANT) continue;
    if (b[8] && DOOR[b[8]] && DOOR[b[8]].t > 0.5) continue;
    const [lx, ly] = b[9] ? toLocal(b, x, y) : [x, y];
    if (lx >= b[0] - 0.02 && lx <= b[1] + 0.02 && ly >= b[2] - 0.02 && ly <= b[3] + 0.02) out.push([b[4], b[5]]);
  }
  return out;
}
export const doorOn = d => (d.ph == null || d.ph <= PHASE) && varOk(d.var);
function applyVisibility() {
  scene.traverse(o => {
    const ph = o.userData.ph,
      v = o.userData.var;
    if (ph === undefined && !v) return;
    o.visible =
      (ph === undefined || (ph <= PHASE && (o.userData.phEnd === undefined || PHASE < o.userData.phEnd))) &&
      varOk(v) &&
      !(o.userData.item && o.userData.item.removed);
  });
}
export function setPhase(n) {
  PHASE = Math.max(0, Math.min(LATE.PHASES.length - 1, n | 0));
  window.PHASE = PHASE;
  applyVisibility();
  SV.on.value = PHASE >= PHN.egOSB ? 1 : 0;
  SV.floor.value = PHASE >= PHN.windows ? (window.SVMAN?.floor ?? 0.15) : 0.55;
  if (window.giApply) giApply();
  const L = window.LIGHTS || [];
  for (const l of L) l.visible = PHASE >= PHN.builtins;
  if (P.mode === 'walk') {
    const fl = floorAt(P.x, P.y, P.feet + 3);
    if (P.feet > fl + 0.01) {
      P.feet = fl;
      P.vz = 0;
    }
  }
  for (const k of DKEYS()) {
    const d = DOOR[k];
    if (d.ph != null && PHASE < d.ph) {
      d.t = 0;
      d.target = 0;
    }
  }
  document
    .querySelectorAll('[data-phase-ui]')
    .forEach(el => el.dispatchEvent(new CustomEvent('phase', { detail: PHASE })));
  LATE.phaseLabel();
  markDirty(true);
}
// ---- V15 stances: standing, crouched, on all fours, lying flat; eye height, body height (for collisions) and pace ----
// crawl: flat on the belly, pulling forward with the arms; prone: lying on the back (moving turns it into crawling)
export const STANCES = {
  stand: { eye: 1.62, h: 1.78, sp: 1, name: 'Stehen' },
  crouch: { eye: 1.1, h: 1.28, sp: 0.3, name: 'Geduckt' },
  crawl: { eye: 0.36, h: 0.52, sp: 0.17, name: 'Kriechen' },
  prone: { eye: 0.26, h: 0.42, sp: 0, name: 'Liegen' },
};
export const bodyH = () => STANCES[(typeof P !== 'undefined' && P.stance) || 'stand'].h;
export function blocked(x, y, feet) {
  const top = feet + bodyH() - 0.03;
  for (const [s] of surfaces(x, y)) if (s > feet + STEP && s < top) return true;
  return false;
}
const groundZ = (x, y) => (window.ROADS ? KERN.ground(x, y) : STREAM.zAt(x, y)); // the meadow is flat (0) except at the stream; beyond the site the terrain and bridge decks (V16b, world/roads.js; the tiled world, welt/welt.js)
export function floorInfo(x, y, feet) {
  let best = -1e9,
    typ = 'ground';
  for (const [z, t] of surfaces(x, y))
    if (z <= feet + STEP && z > best) {
      best = z;
      typ = t;
    }
  return best === -1e9 ? [groundZ(x, y), 'ground'] : [best, typ];
}
export function floorAt(x, y, feet) {
  return floorInfo(x, y, feet)[0];
}
export function surfType(x, y, z) {
  const [fz, t] = floorInfo(x, y, z + 0.01);
  if (t !== 'ground') return t;
  if (gravelAtPt(x, y)) return 'stone';
  return 'grass';
}
function gravelAtPt(x, y) {
  return gravelMask(x, y) > 100 / 255;
}
// ---------------- doors (hinged / sliding), registered in 02_geo ----------------
export const DOOR = window.DOORS;
export const DKEYS = () => Object.keys(DOOR);
export function doorCols() {
  const C = [];
  for (const k of DKEYS()) {
    const d = DOOR[k];
    if (!doorOn(d)) continue;
    if (d.kind === 'machine') continue;
    if (d.kind === 'slide') {
      if (d.t < 0.5) C.push([...d.box, 'door']);
      continue;
    }
    if (d.kind === 'flap') {
      if (d.t > 0.5 && d.openBox) C.push([...d.openBox, 'door']);
      continue;
    } // hatch lid standing open = guard; closed it is floor (walk surface)
    const e = d.t * d.t * (3 - 2 * d.t),
      ang = d.theta + ((d.sign * Math.PI) / 2) * 0.92 * e,
      h = d.thick / 2;
    C.push([0, d.w, -h, h, d.z, d.z1, 'door', null, null, { cx: d.hx, cy: d.hy, c: Math.cos(ang), s: Math.sin(ang) }]);
  }
  return C;
}
export function poseDoor(d) {
  if (d.kind === 'machine') return;
  const e = d.t * d.t * (3 - 2 * d.t);
  if (d.kind === 'slide') d.group.position.x = d.x0 + (d.x1 - d.x0) * e;
  else if (d.kind === 'flap') d.group.rotation[d.rot] = d.open * e;
  else d.group.rotation.y = d.theta + ((d.sign * Math.PI) / 2) * 0.92 * e;
}
export const doorWord = d => d.label || (d.kind === 'flap' ? 'Luke' : 'Tür');
export function toggleDoor(k) {
  const d = DOOR[k];
  if (!d || !doorOn(d)) return;
  d.target = d.target > 0.5 ? 0 : 1;
  if (d.kind === 'machine') {
    markDirty();
    return;
  }
  LATE.audio.door(d.kind === 'slide' ? 'og' : 'eg', d.target > 0.5);
}
export function setDoorNow(k, v) {
  const d = DOOR[k];
  if (!d || d.kind === 'machine') return;
  d.t = d.target = v ? 1 : 0;
  poseDoor(d);
  markDirty(true);
}
export function updateDoors(dt) {
  let moving = false;
  for (const k of DKEYS()) {
    const d = DOOR[k];
    if (Math.abs(d.t - d.target) > 1e-3) {
      d.t += Math.sign(d.target - d.t) * Math.min(Math.abs(d.target - d.t), dt * (d.kind === 'flap' ? 1.1 : 1.5));
      moving = true;
      poseDoor(d);
      if (Math.abs(d.t - d.target) <= 1e-3) markDirty(true);
    }
  }
  return moving;
}
export function nearDoor() {
  let best = null,
    bd = 1e9;
  for (const k of DKEYS()) {
    const d = DOOR[k];
    if (!doorOn(d)) continue;
    if (P.feet < d.z - 0.7 || P.feet > d.z + 0.9) continue;
    const dd = Math.hypot(P.x - d.pos[0], P.y - d.pos[1]);
    if (dd < (d.r || 1.6) && dd < bd) {
      bd = dd;
      best = k;
    }
  }
  return best;
}
export function collide(p, feet, on) {
  if (!on) return;
  const b0 = feet + 0.25,
    b1 = feet + bodyH() - 0.03;
  const near = [];
  for (const [ox, oy] of [
    [0, 0],
    [RAD, 0],
    [-RAD, 0],
    [0, RAD],
    [0, -RAD],
  ])
    for (const i of cellItems(CG, p[0] + ox, p[1] + oy)) {
      const c = COL[i];
      if (phOk(c)) near.push(c);
    }
  for (const c of doorCols()) near.push(c);
  for (let it = 0; it < 3; it++)
    for (const c of near) {
      if (b1 < c[4] || b0 > c[5]) continue;
      const lp = c[9] ? toLocal(c, p[0], p[1]) : p;
      const qx = THREE.MathUtils.clamp(lp[0], c[0], c[1]),
        qy = THREE.MathUtils.clamp(lp[1], c[2], c[3]);
      const dx = lp[0] - qx,
        dy = lp[1] - qy;
      const d2 = dx * dx + dy * dy;
      if (d2 < RAD * RAD) {
        let nx = lp[0],
          ny = lp[1];
        if (d2 < 1e-9) {
          const ox = [c[0] - RAD - lp[0], c[1] + RAD - lp[0]],
            oy = [c[2] - RAD - lp[1], c[3] + RAD - lp[1]];
          const mx = Math.abs(ox[0]) < Math.abs(ox[1]) ? ox[0] : ox[1],
            my = Math.abs(oy[0]) < Math.abs(oy[1]) ? oy[0] : oy[1];
          if (Math.abs(mx) < Math.abs(my)) nx += mx;
          else ny += my;
        } else {
          const d = Math.sqrt(d2);
          nx = qx + (dx / d) * RAD;
          ny = qy + (dy / d) * RAD;
        }
        if (c[9]) {
          const w = toWorld(c, nx, ny);
          p[0] = w[0];
          p[1] = w[1];
        } else {
          p[0] = nx;
          p[1] = ny;
        }
      }
    }
  // V16b: beyond the modelled site the walls of every building and the trunks (world/worldcol.js); parked vehicles everywhere
  if (Math.abs(p[0]) > 50 || Math.abs(p[1]) > 55) KERN.pushOut(p, RAD);
  if (window.VEH) LATE.VEH.pushWalker(p, RAD, feet);
}
// how far one may walk: the garden's 75 m, with the real surroundings the whole square of the 10 m terrain (V16b)
export function walkBounds() {
  if (KERN.free(P.x, P.y)) return; // the tiled world beyond the square (welt/welt.js, e.g. Schleusingen)
  const B = window.RATSCHER && LATE.RATSCHER.ready && LATE.RATSCHER.box;
  if (B) {
    P.x = THREE.MathUtils.clamp(P.x, B[0] + 8, B[2] - 8);
    P.y = THREE.MathUtils.clamp(P.y, B[1] + 8, B[3] - 8);
    return;
  }
  const r = Math.hypot(P.x - 2, P.y - 2);
  if (r > 75) {
    P.x = 2 + ((P.x - 2) * 75) / r;
    P.y = 2 + ((P.y - 2) * 75) / r;
  }
}
