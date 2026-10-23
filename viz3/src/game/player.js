// ===================== the player (split from game/game.js): third-person view state, viewpoints (SPOTS), place name, going to a place,
// jumping and the four postures =====================
// ---- V15 third-person view: camera over the right shoulder of the figure (game/avatar.js); V or the mouse wheel switch to the eyes ----
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { cam, VARIANT } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { BUILD, COL, PHN } from '../core/geo.js';
import { GEO_A, GEO_B } from '../pavilion/house_ladder.js';
import {
  bodyH,
  cellItems,
  CG,
  floorInfo,
  G,
  P,
  PHASE,
  phOk,
  RAD,
  STANCES,
  STEP,
  surfaces,
  toLocal,
} from './walkable.js';
export const CAM3 = {
  want: (() => {
    try {
      const v = SAVE.raw('pav-view');
      return v ? v === '3' : true;
    } catch (e) {
      return true;
    }
  })(),
  d: 3.3,
  cur: 3.3,
  side: 0.4,
  sideCur: 0.4,
  MIN: 1.15,
  MAX: 7,
  get on() {
    return (
      this.want &&
      P.mode === 'walk' &&
      !!(window.AVATAR && LATE.AVATAR.ready) &&
      !(window.PLAY && LATE.PLAY.seat && LATE.PLAY.seat.fp) &&
      !(window.PIANO && LATE.PIANO.on)
    );
  },
};
window.CAM3 = CAM3;
export function setView3(v, quiet) {
  CAM3.want = !!v;
  try {
    SAVE.setRaw('pav-view', v ? '3' : '1');
  } catch (e) {}
  if (v) {
    CAM3.cur = Math.min(CAM3.cur, 1.2);
    if (CAM3.d < CAM3.MIN + 0.1) CAM3.d = 2.2;
  }
  document.body.dataset.view = CAM3.on ? '3' : '1';
  if (window.HUD) LATE.HUD.viewChanged(quiet);
  markDirty(true);
}
window.setView3 = setView3;
function dirYaw(x, y, tx, ty) {
  return (Math.atan2(tx - x, ty - y) * 180) / Math.PI;
}
// the places to jump to (menu Orte, data-spot) live in KERN's registry (core/kern.js): other modules add theirs with KERN.spot(name, def)
for (const [k, v] of Object.entries({
  modell: { mode: 'orbit', az: 225, el: 16, r: 21, label: 'Modellansicht' },
  draufsicht: { mode: 'top', label: 'Draufsicht' },
  garten: { mode: 'walk', pos: [3.6, 15.2], z: 0, yaw: dirYaw(3.6, 15.2, 3.0, 2.0), pitch: 3, label: 'Garten' },
  carport: {
    mode: 'walk',
    pos: [3.3, 19.6],
    z: 0,
    yaw: dirYaw(3.3, 19.6, -1.0, 15.0),
    pitch: 1,
    bld: 'carport',
    label: 'Carport',
  },
  eingang: { mode: 'walk', pos: [9.2, 3.7], z: 0, yaw: dirYaw(9.2, 3.7, 5.3, 2.7), pitch: 2, label: 'Vor der Tür' },
  bibliothek: {
    mode: 'walk',
    pos: [3.3, 3.08],
    z: G.zF,
    yaw: dirYaw(3.3, 3.0, 1.0, 1.4),
    pitch: -8,
    label: 'Bibliothek',
  },
  treppe: { mode: 'walk', pos: [6.15, 3.12], z: G.zT0, yaw: -96, pitch: 6, label: 'Treppenturm' },
  arbeitsraum: {
    mode: 'walk',
    pos: [3.3, 3.1],
    z: G.zO,
    yaw: dirYaw(3.3, 3.05, 0.6, 0.9),
    pitch: -6,
    label: 'Arbeitsraum',
  },
  lounge: { mode: 'walk', pos: [1.9, 2.0], z: G.zO, yaw: -92, pitch: -5, label: 'Lounge' },
  dach: { mode: 'walk', pos: [2.6, 2.0], z: G.zD, yaw: -95, pitch: -6, label: 'Dachterrasse' },
  wohnwagen: { mode: 'walk', pos: [-0.9, 16.5], z: 0, yaw: 182, pitch: -2, bld: 'carport', label: 'Wohnwagen' },
  holzhaus: { mode: 'walk', pos: [9.5, 1.4], z: 0, yaw: 154, pitch: -2, bld: 'holzhaus', label: 'Holzhaus' }, // door to the north (23.10.2026)
  bungalow: { mode: 'walk', pos: [8.6, 21.4], z: 0, yaw: 180, pitch: -2, bld: 'bungalow', label: 'Bungalow' },
  ziegen: { mode: 'walk', pos: [17.0, -1.4], z: 0, yaw: 82, pitch: -1, label: 'Ziegenweide' },
  hubert: {
    mode: 'walk',
    pos: [-10.6, 22.6],
    z: 0,
    yaw: dirYaw(-10.6, 22.6, -15.1, 27.2),
    pitch: 1,
    label: 'Bei Hubert',
  },
  werkstatt: { mode: 'walk', pos: [0.8, -35.2], z: 0, yaw: 205, pitch: -6, bld: 'werkstatt', label: 'Werkstatt' },
}))
  KERN.spot(k, v);
export const SPOTS = KERN.spots();
KERN.scenario('garten', { label: 'Garten', order: 10, run: () => go('garten') });
KERN.scenario('werkstatt', { label: 'Werkstatt Klingenholz', order: 12, run: () => go('werkstatt') });
// viewpoints that differ per variant (B: front door in the EG east wall under the cantilever, ladder stair instead of the tower, terrace 4 cm higher)
const SPOTS_VAR = {
  A: {
    eingang: { pos: [9.2, 3.7], yaw: dirYaw(9.2, 3.7, 5.3, 2.7), pitch: 2 },
    treppe: { pos: [6.15, 3.12], z: () => GEO_A.zT0, yaw: -96, pitch: 6, label: 'Treppenturm' },
    dach: { z: () => GEO_A.zD },
  },
  B: {
    eingang: { pos: [7.4, 3.6], yaw: dirYaw(7.4, 3.6, 4.0, 3.0), pitch: 3 },
    treppe: { pos: [3.32, 2.55], z: () => GEO_B.zF, yaw: 180, pitch: 30, label: 'Leitertreppe' },
    dach: { z: () => GEO_B.zD },
  },
};
export function applySpots(v) {
  for (const [k, o] of Object.entries(SPOTS_VAR[v])) {
    const s = SPOTS[k];
    for (const [f, val] of Object.entries(o)) s[f] = typeof val === 'function' ? val() : val;
  }
}
applySpots(VARIANT);
let s0 = true;
try {
  const sv = SAVE.raw('pav-sound');
  if (sv !== null) s0 = sv === '1';
} catch (e) {}
export const opt = { collide: true, sound: s0 };
export let stepZ = 0; // feet height of the last step sound (game/game.js physics)
export function setStepZ(z) {
  stepZ = z;
}
// the place shown in the header (#where): the frame loop sets it when the place changes, the variant switch resets it so it is shown anew
export let lastPlace = '';
export function setLastPlace(pl) {
  lastPlace = pl;
}
export function resetLastPlace() {
  lastPlace = '';
}
// the place shown in the header: KERN.place asks the providers by priority (core/kern.js) – the pavilion (100), the neighbours' yards
// (npc/life.js, 60), the garden (garden/places.js, 50: everything within 50 m), named areas (30), Schleusingen (20), the village (10),
// the roads and fields (0)
export function placeName() {
  if (P.mode === 'orbit') return 'Modellansicht';
  return KERN.place(P.x, P.y, P.feet) || 'Garten';
}
export const NEAR = (x, y) => Math.abs(x) <= 50 && Math.abs(y) <= 55; // the garden's own names; beyond: the village, the roads, the fields
// the pavilion and its tower, ladders and roof (only near the garden)
KERN.provide(
  'place',
  (x, y, f) => {
    if (!NEAR(x, y) || f === undefined) return undefined;
    const inT = x > G.TW.x0 && x < G.TW.x1 && y > G.TW.y0 && y < G.TW.y1,
      inEG = x > 0 && x < 4 && y > 0 && y < 4,
      inOG = x > G.OG.x0 && x < G.OG.x1 && y > G.OG.y0 && y < G.OG.y1;
    const rough = PHASE < PHN.floors ? ' (Rohbau)' : '';
    if (inT) {
      if (f > G.zD - 0.1) return 'Turmkopf, Ausgang Dachterrasse';
      if (Math.abs(f - G.zO) < 0.06 && y > G.PASS.y0 - 0.25) return 'Turm, Podest Arbeitsraum';
      if (f > G.zT0 + 0.1) return f > G.zO ? 'Wendeltreppe zum Dach' : 'Wendeltreppe';
      return 'Turm, Eingang';
    }
    if (G.LAD1) {
      const on = L => x > L.x0 && x < L.x1 && y > L.y0 - 0.05 && y < L.y1 + 0.05 && f > L.z0 + 0.1 && f < L.z1 - 0.1;
      if (on(G.LAD1)) return 'Leitertreppe zum Arbeitsraum';
      if (on(G.LAD2)) return 'Leitertreppe zur Dachterrasse';
    }
    if (f > G.zD - 0.25) return 'Dachterrasse';
    if (f > G.zC) return 'Dach';
    if (f > G.zE) return inOG ? 'Arbeitsraum' + rough : 'Obergeschoss';
    if (inEG) return 'Bibliothek' + rough;
    return undefined;
  },
  100
);
// where zones and borrowed lights measure from (KERN.where): the walker, else the camera
KERN.provide('observer', () => (P.mode === 'walk' ? [P.x, P.y] : [cam.position.x, -cam.position.z]));
// inside the pavilion (EG or OG, below the roof): fewer far plants are drawn (see VEG)
window.inHouseNow = () =>
  P.mode === 'walk' &&
  P.feet < G.zC &&
  P.x > G.OG.x0 &&
  P.x < G.OG.x1 &&
  P.y > G.OG.y0 &&
  P.y < G.OG.y1 &&
  (P.feet >= G.zE - 0.3 || (P.x > 0 && P.x < 4 && P.y > 0 && P.y < 4));
export function go(name) {
  const s = SPOTS[name];
  if (window.PLAY && LATE.PLAY.seated()) LATE.PLAY.stand(true);
  P.mode = s.mode;
  if (s.mode === 'orbit') {
    P.az = s.az;
    P.el = s.el;
    P.r = s.r;
  } else if (s.mode === 'top') {
    /* plan view: keeps its last centre and zoom */
  } else {
    const B = s.bld && window.BUILD && BUILD[s.bld],
      p = B ? B.tf(s.pos[0], s.pos[1]) : s.pos;
    P.x = p[0];
    P.y = p[1];
    P.feet = s.z;
    stepZ = s.z;
    P.vz = 0;
    P.yaw = s.yaw - (B ? B.da : 0);
    P.pitch = s.pitch;
    P.body = P.yaw;
    P.air = false;
    P.stance = 'stand';
    P.eyeH = STANCES.stand.eye;
    CAM3.cur = Math.min(CAM3.cur, 1.4);
  }
  if (window.SITEPLAN) LATE.SITEPLAN.onMode(s.mode);
  document
    .querySelectorAll('[data-spot]')
    .forEach(b => b.setAttribute('aria-pressed', b.dataset.spot === name ? 'true' : 'false'));
  document.body.dataset.mode = s.mode;
  document.body.dataset.view = CAM3.on ? '3' : '1';
  if (window.HUD) LATE.HUD.modeChanged();
  markDirty();
  KERN.emit('spot', { name });
}
// ---- jumping and the four postures (keys Space, C, X, Z; buttons on touch screens) ----
function headroom(h) {
  const z0 = P.feet + bodyH(),
    z1 = P.feet + h;
  if (z1 <= z0 + 1e-3) return true;
  for (const [s] of surfaces(P.x, P.y)) if (s > P.feet + STEP && s - 0.2 < z1) return false;
  if (!opt.collide) return true;
  for (const [ox, oy] of [
    [0, 0],
    [RAD, 0],
    [-RAD, 0],
    [0, RAD],
    [0, -RAD],
  ])
    for (const i of cellItems(CG, P.x + ox, P.y + oy)) {
      const c = COL[i];
      if (!phOk(c) || c[5] <= z0 + 0.01 || c[4] >= z1) continue;
      const lp = c[9] ? toLocal(c, P.x, P.y) : [P.x, P.y],
        qx = THREE.MathUtils.clamp(lp[0], c[0], c[1]),
        qy = THREE.MathUtils.clamp(lp[1], c[2], c[3]);
      if ((lp[0] - qx) ** 2 + (lp[1] - qy) ** 2 < RAD * RAD * 0.8) return false;
    }
  return true;
}
export function headHit(x, y, z0, z1) {
  for (const [s] of surfaces(x, y)) {
    const u = s - 0.2;
    if (u > z0 - 0.02 && u <= z1) return true;
  }
  for (const i of cellItems(CG, x, y)) {
    const c = COL[i];
    if (!phOk(c) || c[4] <= z0 - 0.02 || c[4] > z1) continue;
    const lp = c[9] ? toLocal(c, x, y) : [x, y];
    if (lp[0] > c[0] - 0.1 && lp[0] < c[1] + 0.1 && lp[1] > c[2] - 0.1 && lp[1] < c[3] + 0.1) return true;
  }
  return false;
}
export function setStance(st, quiet) {
  if (!STANCES[st] || st === P.stance) return true;
  if (P.mode !== 'walk' || (window.PLAY && LATE.PLAY.seated())) return false;
  const say = t => {
    if (!quiet && window.PLAY) LATE.PLAY.think(t, 2200);
  };
  if (st !== 'stand' && floorInfo(P.x, P.y, P.feet)[1] === 'ladder') {
    say('Nicht auf der Leiter.');
    return false;
  }
  if (P.air && st !== 'stand') return false;
  if (STANCES[st].h > bodyH() && !headroom(STANCES[st].h)) {
    say('Hier ist zu wenig Platz zum Aufrichten.');
    return false;
  }
  P.stance = st;
  if (typeof LATE.SFX !== 'undefined' && LATE.SFX.cloth) LATE.SFX.cloth();
  if (window.HUD) LATE.HUD.stanceChanged();
  markDirty();
  return true;
}
export function toggleStance(st) {
  if (P.stance !== st) return setStance(st);
  if (setStance('stand', true)) return true;
  return st === 'crouch' ? setStance('stand') : setStance('crouch', true) || setStance('stand');
}
export function jump() {
  if (P.mode !== 'walk' || (window.PLAY && LATE.PLAY.seated()) || P.air || P.vz !== 0) return false;
  if (P.stance === 'crawl' || P.stance === 'prone') return setStance('stand', true) || setStance('crouch');
  if (P.stance === 'crouch' && !setStance('stand')) return false;
  if (floorInfo(P.x, P.y, P.feet)[1] === 'ladder' || !headroom(STANCES.stand.h + 0.3)) return false;
  P.vz = 3.5;
  P.air = true;
  P.airT = 0;
  if (typeof LATE.SFX !== 'undefined' && LATE.SFX.hop) LATE.SFX.hop();
  markDirty();
  return true;
}
window.MOVE = { jump, setStance, toggleStance, STANCES };
