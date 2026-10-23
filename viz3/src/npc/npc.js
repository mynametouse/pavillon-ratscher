// ---------------- neighbours: Hubert (west, sheds, old tractor) and Ronald (east, goat paddock) ----------------
// Procedural low-poly figures, waypoint AI, positional voices (Piper TTS, free), goat bleats, tractor trips.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LATE } from '../core/late.js';
import { $, cam, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { ANISO, FIGSH, markDirty, patchSV, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, COL, hingeDoor, PH, PH_END, phase, tagPh } from '../core/geo.js';
import { placeGLB } from '../pavilion/interior.js';
import { S0, sun, sunDir } from '../garden/env.js';
import { gB, MATS } from '../garden/site_base.js';
import { RENDER } from '../render/render.js';
import { nearDoor, P, poseDoor, rebuildGrids } from '../game/walkable.js';
import { audio } from '../audio/audio.js';
import { PHASES } from '../pavilion/phases.js';
phase(null);
const VM = window.VOICEMAN || { lines: [], topics: {} };
const VL = {};
for (const l of VM.lines)
  (
    VL[l.who + ':' + l.id.replace(l.who + '_', '').replace(/_\d+$/, '')] ||
    (VL[l.who + ':' + l.id.replace(l.who + '_', '').replace(/_\d+$/, '')] = [])
  ).push(l);
const VTXT = {};
for (const l of VM.lines) VTXT[l.id] = l.text;
function plaidTex(c1, c2) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const q = c.getContext('2d');
  q.fillStyle = c1;
  q.fillRect(0, 0, 128, 128);
  q.fillStyle = c2;
  q.globalAlpha = 0.75;
  for (let i = 0; i < 128; i += 32) {
    q.fillRect(i, 0, 14, 128);
    q.fillRect(0, i, 128, 14);
  }
  q.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const NM = {
  skinH: plain({ color: 0xd8ab86, roughness: 0.85 }),
  skinR: plain({ color: 0xe0b28c, roughness: 0.85 }),
  hubJacket: plain({ color: 0x3f4a37, roughness: 0.95 }),
  hubTrousers: plain({ color: 0x5c4b3a, roughness: 0.95 }),
  hubCap: plain({ color: 0x33302c, roughness: 0.9 }),
  beard: plain({ color: 0x9d9b94, roughness: 1 }),
  ronShirt: (() => {
    const m = new THREE.MeshStandardMaterial({ map: plaidTex('#8f2f2a', '#2a2222'), roughness: 0.95 });
    return patchSV(m);
  })(),
  ronVest: plain({ color: 0x4a5f3a, roughness: 0.95 }),
  ronTrousers: plain({ color: 0x3d4f6a, roughness: 0.95 }),
  ronHat: plain({ color: 0xd9c38f, roughness: 1 }),
  boots: plain({ color: 0x2b241f, roughness: 0.7 }),
  hair: plain({ color: 0x4a3a2c, roughness: 1 }),
  goatW: plain({ color: 0xe9e3d8, roughness: 0.95 }),
  goatB: plain({ color: 0x7b5b3b, roughness: 0.95 }),
  goatK: plain({ color: 0x2a2521, roughness: 0.95 }),
  horn: plain({ color: 0x6d5d4a, roughness: 0.7 }),
  hoof: plain({ color: 0x2a2420, roughness: 0.6 }),
  eye: plain({ color: 0x1a1612, roughness: 0.3 }),
  red: plain({ color: 0xb4332a, roughness: 0.42, metalness: 0.15 }),
  dark: plain({ color: 0x3a3a3a, roughness: 0.7, metalness: 0.3 }),
  rim: plain({ color: 0xc9c2b3, roughness: 0.5, metalness: 0.4 }),
  fence: MAT.plank,
  hay: (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const q = c.getContext('2d');
    q.fillStyle = '#a88a45';
    q.fillRect(0, 0, 256, 256); // loose hay: thousands of straw strands
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * 256,
        y = Math.random() * 256,
        a = (Math.random() - 0.5) * 1.2 + (Math.random() < 0.5 ? 0 : Math.PI / 2) * 0.3,
        L = 6 + Math.random() * 22,
        l = 0.65 + Math.random() * 0.55;
      q.strokeStyle = `rgba(${(215 * l) | 0},${(180 * l) | 0},${(95 * l) | 0},${0.55 + Math.random() * 0.4})`;
      q.lineWidth = 0.6 + Math.random() * 1.2;
      q.beginPath();
      q.moveTo(x, y);
      q.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
      q.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.anisotropy = ANISO;
    return plain({ map: t, roughness: 1 });
  })(),
  trough: plain({ color: 0x5a6670, roughness: 0.6, metalness: 0.5 }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x5f8a9a, roughness: 0.05, transparent: true, opacity: 0.7 }),
};
const SIM = []; // things that animate: {update(dt), pos:[x,y], radius}
function box(g, w, d, h, m, cx, cy, cz, o = {}) {
  const geo = o.r ? new RoundedBoxGeometry(w, h, d, 2, o.r) : new THREE.BoxGeometry(w, h, d);
  if (o.oy) geo.translate(0, o.oy, 0);
  const me = new THREE.Mesh(geo, m);
  me.position.copy(V(cx, cy, cz));
  me.castShadow = true;
  me.receiveShadow = true;
  me.userData.noMerge = true;
  g.add(me);
  return me;
}
function cylL(g, r0, r1, h, m, cx, cy, cz, o = {}) {
  const geo = new THREE.CylinderGeometry(r0, r1, h, o.seg || 12);
  if (o.oy) geo.translate(0, o.oy, 0);
  const me = new THREE.Mesh(geo, m);
  me.position.copy(V(cx, cy, cz));
  if (o.rx) me.rotation.x = o.rx;
  if (o.rz) me.rotation.z = o.rz;
  me.castShadow = true;
  me.userData.noMerge = true;
  g.add(me);
  return me;
}
// ---- person: local +y = forward; parts pivot for walking ----
function makePerson(k) {
  const g = new THREE.Group();
  const H = k.h || 1.75,
    s = H / 1.75;
  const P_ = {};
  const legM = k.trousers,
    armM = k.jacket;
  P_.legL = box(g, 0.14 * s, 0.15 * s, 0.84 * s, legM, -0.1 * s, 0, 0.9 * s, { oy: -0.42 * s });
  P_.legR = box(g, 0.14 * s, 0.15 * s, 0.84 * s, legM, 0.1 * s, 0, 0.9 * s, { oy: -0.42 * s });
  for (const L of [P_.legL, P_.legR]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.09 * s, 0.26 * s), NM.boots);
    b.position.set(0, -0.86 * s, 0.05 * s);
    b.castShadow = true;
    L.add(b);
  }
  P_.torso = box(g, 0.44 * s, 0.26 * s, 0.62 * s, k.jacket, 0, 0, 1.21 * s, { r: 0.05 });
  if (k.vest) box(g, 0.46 * s, 0.28 * s, 0.4 * s, k.vest, 0, 0, 1.28 * s, { r: 0.04 });
  P_.armL = box(g, 0.11 * s, 0.11 * s, 0.64 * s, armM, -0.31 * s, 0, 1.48 * s, { oy: -0.3 * s });
  P_.armR = box(g, 0.11 * s, 0.11 * s, 0.64 * s, armM, 0.31 * s, 0, 1.48 * s, { oy: -0.3 * s });
  P_.armL.rotation.z = 0.08;
  P_.armR.rotation.z = -0.08;
  for (const A of [P_.armL, P_.armR]) {
    const hnd = new THREE.Mesh(new THREE.BoxGeometry(0.09 * s, 0.1 * s, 0.09 * s), k.skin);
    hnd.position.y = -0.65 * s;
    A.add(hnd);
  }
  cylL(g, 0.06 * s, 0.06 * s, 0.08 * s, k.skin, 0, 0, 1.56 * s);
  P_.head = new THREE.Group();
  P_.head.position.copy(V(0, 0, 1.6 * s));
  g.add(P_.head);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 14, 12), k.skin);
  hd.position.y = 0.11 * s;
  hd.scale.set(0.95, 1.1, 1);
  hd.castShadow = true;
  P_.head.add(hd);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.04 * s, 0.04 * s), k.skin);
  nose.position.set(0, 0.09 * s, -0.12 * s);
  P_.head.add(nose);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.014 * s, 6, 6), NM.eye);
    e.position.set(sx * 0.045 * s, 0.13 * s, -0.105 * s);
    P_.head.add(e);
  }
  if (k.beard) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.1 * s, 0.07 * s), NM.beard);
    b.position.set(0, 0.03 * s, -0.09 * s);
    P_.head.add(b);
  }
  if (k.hat === 'cap') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.135 * s, 0.13 * s, 0.06 * s, 14), NM.hubCap);
    c.position.y = 0.215 * s;
    P_.head.add(c);
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.014 * s, 0.12 * s), NM.hubCap);
    br.position.set(0, 0.19 * s, -0.16 * s);
    P_.head.add(br);
  } else if (k.hat === 'straw') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.13 * s, 0.1 * s, 14), NM.ronHat);
    c.position.y = 0.23 * s;
    P_.head.add(c);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.24 * s, 0.012 * s, 18), NM.ronHat);
    br.position.y = 0.185 * s;
    P_.head.add(br);
  } else {
    const hr = new THREE.Mesh(new THREE.SphereGeometry(0.125 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), NM.hair);
    hr.position.y = 0.12 * s;
    P_.head.add(hr);
  }
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.userData.noMerge = true;
    }
  });
  const self = {
    g,
    p: P_,
    t: 0,
    mode: 'stand',
    anim(dt, speed) {
      self.t += dt * (speed > 0.05 ? speed * 5.4 : 0);
      const sw = speed > 0.05 ? Math.min(1, speed / 1.1) * 0.55 : 0;
      const a = Math.sin(self.t) * sw;
      if (self.mode === 'sit') {
        P_.legL.rotation.x = P_.legR.rotation.x = -0.95;
        P_.armL.rotation.x = P_.armR.rotation.x = -0.75;
        P_.torso.position.y = 1.21 * s;
        return;
      }
      P_.legL.rotation.x = a;
      P_.legR.rotation.x = -a;
      P_.armL.rotation.x = -a * 0.8;
      P_.armR.rotation.x = a * 0.8;
      P_.torso.position.y = 1.21 * s + Math.abs(Math.sin(self.t)) * 0.02 * (sw > 0 ? 1 : 0);
    },
  };
  return self;
}
// ---- goat: local +y forward ----
function makeGoat(col, big) {
  const g = new THREE.Group();
  const m = col;
  const s = big ? 1.12 : 1;
  const body = box(g, 0.34 * s, 0.72 * s, 0.4 * s, m, 0, 0, 0.56 * s, { r: 0.1 });
  body.scale.set(1, 0.95, 1);
  const legs = [];
  for (const [x, y] of [
    [-0.11, 0.26],
    [0.11, 0.26],
    [-0.11, -0.26],
    [0.11, -0.26],
  ]) {
    const L = cylL(g, 0.032 * s, 0.04 * s, 0.4 * s, m, x * s, y * s, 0.4 * s, { oy: -0.2 * s, seg: 8 });
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.038 * s, 0.038 * s, 0.05 * s, 8), NM.hoof);
    h.position.y = -0.4 * s;
    L.add(h);
    legs.push(L);
  }
  const neck = new THREE.Group();
  neck.position.copy(V(0, 0.32 * s, 0.66 * s));
  g.add(neck);
  const nk = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.3 * s, 0.14 * s), m);
  nk.position.set(0, 0.12 * s, -0.04 * s);
  nk.rotation.x = 0.5;
  nk.castShadow = true;
  neck.add(nk);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.16 * s, 0.26 * s), m);
  head.position.set(0, 0.26 * s, -0.16 * s);
  head.castShadow = true;
  neck.add(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.05 * s, 0.14 * s), m);
    ear.position.set(sx * 0.1 * s, 0.3 * s, -0.08 * s);
    ear.rotation.z = sx * 0.9;
    neck.add(ear);
    const hn = new THREE.Mesh(new THREE.ConeGeometry(0.025 * s, (big ? 0.28 : 0.14) * s, 7), NM.horn);
    hn.position.set(sx * 0.05 * s, 0.4 * s, -0.04 * s);
    hn.rotation.x = -0.6;
    hn.rotation.z = sx * -0.25;
    neck.add(hn);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.016 * s, 6, 6), NM.eye);
    e.position.set(sx * 0.076 * s, 0.3 * s, -0.2 * s);
    neck.add(e);
  }
  const beard = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.09 * s, 0.03 * s), m);
  beard.position.set(0, 0.15 * s, -0.27 * s);
  neck.add(beard);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.14 * s, 0.05 * s), m);
  tail.position.copy(V(0, -0.38 * s, 0.72 * s));
  tail.rotation.x = -0.6;
  g.add(tail);
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.userData.noMerge = true;
    }
  });
  const self = {
    g,
    t: 0,
    graze: 0,
    anim(dt, speed) {
      self.t += dt * (speed > 0.03 ? speed * 7 : 0);
      const a = Math.sin(self.t) * Math.min(1, speed / 0.6) * 0.5;
      legs[0].rotation.x = a;
      legs[3].rotation.x = a;
      legs[1].rotation.x = -a;
      legs[2].rotation.x = -a;
      neck.rotation.x += ((self.graze ? 1.15 : 0) - neck.rotation.x) * Math.min(1, dt * 3);
      tail.rotation.z = Math.sin(self.t * 0.7 + 1) * 0.3;
    },
  };
  return self;
}
// ---- old red tractor (Deutz-like), local +y forward ----
function makeTractor() {
  const g = new THREE.Group();
  const wheel = (x, y, z, r, w) => {
    const t = cylL(g, r, r, w, MATS.tyre, x, y, z, { seg: 20 });
    t.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 16), NM.rim);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(V(x, y, z));
    rim.userData.noMerge = true;
    g.add(rim);
    return [t, rim];
  };
  const wheels = [
    ...wheel(-0.78, -0.45, 0.72, 0.72, 0.36),
    ...wheel(0.78, -0.45, 0.72, 0.72, 0.36),
    ...wheel(-0.55, 1.25, 0.4, 0.4, 0.2),
    ...wheel(0.55, 1.25, 0.4, 0.4, 0.2),
  ];
  box(g, 0.5, 1.9, 0.3, NM.dark, 0, 0.45, 0.6); // Rahmen
  box(g, 0.62, 1.35, 0.6, NM.red, 0, 0.95, 1.15, { r: 0.04 }); // Motorhaube
  box(g, 0.66, 0.08, 0.5, NM.dark, 0, 1.64, 1.1); // Kühlergrill
  box(g, 0.9, 0.5, 0.3, NM.red, 0, 0.12, 0.92, { r: 0.03 }); // Armaturen/Tank
  for (const sx of [-1, 1]) {
    box(g, 0.42, 1.2, 0.08, NM.red, sx * 0.78, -0.45, 1.5);
    box(g, 0.08, 1.2, 0.5, NM.red, sx * 0.99, -0.45, 1.26);
  } // Kotflügel
  box(g, 0.5, 0.45, 0.08, NM.dark, 0, -0.55, 1.02);
  box(g, 0.5, 0.08, 0.45, NM.dark, 0, -0.78, 1.25); // Sitz
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 20), NM.dark);
  sw.position.copy(V(0, 0.05, 1.32));
  sw.rotation.x = -0.9;
  sw.userData.noMerge = true;
  g.add(sw);
  cylL(g, 0.04, 0.04, 0.9, NM.dark, 0.22, 1.25, 1.85, { seg: 10 });
  cylL(g, 0.07, 0.05, 0.12, NM.dark, 0.22, 1.25, 2.33, { seg: 10 }); // Auspuff
  box(g, 0.9, 0.12, 0.12, NM.dark, 0, -1.1, 0.55); // Anhängerkupplung
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.userData.noMerge = true;
    }
  });
  return {
    g,
    wheels,
    roll(d) {
      for (const w of wheels) w.rotation.x += d / (w.geometry.parameters.radiusTop || 0.5);
    },
  };
}
// ---- paddock on the east neighbour's land: since 23.10.2026 further south, at the height of the garden's southern boundary (Falko:
// "Seine Ziegen sind weiter südlich: etwa auf der Höhe der Südgrenze von Falkos Grundstück, dort eingezäunt"); the gate on the west side
// (gy0 … gy1) faces the garden's south-east corner. Everything in the paddock (shelter, hay, trough, salt lick) is placed relative to it.
export const PAD = { x0: 19.5, x1: 34, y0: -52, y1: -33.5, gy0: -41.6, gy1: -39.2 };
PAD.gy = (PAD.gy0 + PAD.gy1) / 2;
PAD.hay = [PAD.x1 - 2.4, PAD.y1 - 1.25]; // the hay in the shelter (north-east corner, open to the west)
PAD.rack = [PAD.x1 - 4.6, PAD.y1 - 2.2]; // in front of the shelter: where the hay goes for the goats
PAD.trough = [PAD.x0 + 4.6, PAD.y0 + 5.9];
window.NPC_PAD = PAD;
{
  const post = (x, y) => B(x - 0.06, x + 0.06, y - 0.06, y + 0.06, 0, 1.25, MAT.plank, { col: false, grain: 'z' });
  const rail = (x0, y0, x1, y1) => {
    for (const z of [0.5, 1.0]) beam([x0, y0, z], [x1, y1, z], 0.04, 0.1, MAT.plank);
    COL.push([
      Math.min(x0, x1) - 0.08,
      Math.max(x0, x1) + 0.08,
      Math.min(y0, y1) - 0.08,
      Math.max(y0, y1) + 0.08,
      0,
      1.2,
      'fence',
      PH,
      PH_END,
    ]);
  };
  const ring = [
    [PAD.x0, PAD.y0],
    [PAD.x1, PAD.y0],
    [PAD.x1, PAD.y1],
    [PAD.x0, PAD.y1],
  ];
  for (let i = 0; i < 4; i++) {
    const a = ring[i],
      b = ring[(i + 1) % 4];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.round(L / 2.5);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      post(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
    }
    if (i === 3) {
      rail(a[0], a[1], a[0], PAD.gy1 + 0.02);
      rail(a[0], PAD.gy0 - 0.02, b[0], b[1]);
    } else rail(a[0], a[1], b[0], b[1]);
  }
  // the gate (west side): a wooden farm gate on a hinge at the north post, swings into the paddock; it stands open until Ronald shuts it (V14)
  {
    const gl = new THREE.Group(),
      gw = 2.34,
      gh = 1.12;
    for (const x of [0.04, gw - 0.05]) gB(gl, x - 0.04, x + 0.04, -0.03, 0.03, 0.04, gh, MAT.plank, { grain: 'z' });
    for (const z of [0.16, 0.58, 1.0]) gB(gl, 0.0, gw, -0.025, 0.025, z, z + 0.1, MAT.plank, { grain: 'x' });
    {
      const L = Math.hypot(gw - 0.14, 0.84),
        m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.09, 0.035), MAT.plank);
      m.position.set(gw / 2, 0.68, 0);
      m.rotation.z = Math.atan2(0.84, gw - 0.14);
      m.castShadow = m.receiveShadow = true;
      gl.add(m);
    }
    const d = hingeDoor('paddockgate', gl, {
      hx: PAD.x0,
      hy: PAD.gy1 - 0.02,
      a: [0, -1],
      w: gw,
      sign: 1,
      z0: 0,
      z1: gh,
      thick: 0.06,
    });
    d.label = 'Gatter';
    d.r = 1.9;
    d.t = d.target = 1;
    poseDoor(d);
  }
  // Unterstand (offen nach Westen), Heuraufe, Tränke – in the north-east corner of the paddock (sx, sy: its corner)
  const sx = PAD.x1,
    sy = PAD.y1;
  for (const [x, y] of [
    [sx - 3.9, sy - 3.9],
    [sx - 0.9, sy - 3.9],
    [sx - 3.9, sy - 0.5],
    [sx - 0.9, sy - 0.5],
  ])
    B(x - 0.07, x + 0.07, y - 0.07, y + 0.07, 0, y > sy - 2.5 ? 2.1 : 2.4, MAT.kvh, { col: true, grain: 'z' });
  B(sx - 0.8, sx - 0.2, sy - 4.0, sy - 0.4, 0, 2.1, MAT.plank, { grain: 'z' });
  B(sx - 4, sx - 0.7, sy - 0.55, sy - 0.4, 0, 2.1, MAT.plank, { grain: 'x' });
  B(sx - 4, sx - 0.7, sy - 4.0, sy - 3.85, 0, 2.4, MAT.plank, { grain: 'x' });
  {
    const geo = new THREE.BoxGeometry(3.7, 0.04, 4.0);
    const me = new THREE.Mesh(geo, MAT.roofGrey);
    me.position.copy(V(sx - 2.4, sy - 2.2, 2.45));
    me.rotation.x = Math.atan2(0.3, 3.4);
    me.castShadow = true;
    scene.add(me);
    tagPh(me);
    COL.push([sx - 4.2, sx - 0.1, sy - 4.2, sy - 0.2, 2.0, 2.7, 'roof', null, null]);
  }
  B(sx - 3.7, sx - 1.1, sy - 1.3, sy - 0.6, 0.0, 0.55, NM.hay, { col: true });
  B(sx - 3.7, sx - 1.1, sy - 1.5, sy - 0.55, 0.55, 0.65, NM.hay, { col: false, cast: false });
  // the hay rack in front of the shelter (Ronald fills it mornings and evenings): a slatted wooden crib on legs
  {
    const [rx, ry] = PAD.rack;
    for (const [x, y] of [
      [rx - 0.75, ry - 0.3],
      [rx + 0.75, ry - 0.3],
      [rx - 0.75, ry + 0.3],
      [rx + 0.75, ry + 0.3],
    ])
      B(x - 0.04, x + 0.04, y - 0.04, y + 0.04, 0, 1.1, MAT.kvh, { col: false, grain: 'z' });
    B(rx - 0.8, rx + 0.8, ry - 0.32, ry + 0.32, 0.38, 0.44, MAT.plank, { col: true, grain: 'x' });
    for (let k = 0; k < 8; k++) {
      const x = rx - 0.7 + k * 0.2;
      for (const s of [-1, 1]) beam([x, ry + s * 0.3, 0.45], [x, ry + s * 0.42, 1.08], 0.025, 0.025, MAT.plank);
    }
    for (const s of [-1, 1]) B(rx - 0.8, rx + 0.8, ry + s * 0.42 - 0.03, ry + s * 0.42 + 0.03, 1.04, 1.1, MAT.plank);
  }
  const [tx, ty] = PAD.trough;
  B(tx - 0.6, tx + 0.6, ty - 0.4, ty + 0.4, 0, 0.45, NM.trough, { col: true });
  B(tx - 0.55, tx + 0.55, ty - 0.35, ty + 0.35, 0.38, 0.4, NM.water, { col: false, cast: false });
  B(PAD.x0 + 1.0, PAD.x0 + 1.9, PAD.y0 + 4.0, PAD.y0 + 4.5, 0, 0.9, MAT.plank, { col: true }); // Pfahl für den Salzleckstein
}
// ---- Hubert's side: tractor parked by the northern shed, a woodpile, a bench ----
export const TRACTOR = makeTractor();
TRACTOR.g.position.copy(V(-15.1, 27.2, 0));
TRACTOR.g.rotation.y = -((20 * Math.PI) / 180);
scene.add(TRACTOR.g);
COL.push([-16.5, -13.7, 25.3, 29.1, 0, 1.8, 'tractor', null, null]);
B(-16, -13, 15.7, 16.9, 0, 1.3, MAT.logs, { col: true });
B(-15.9, -13.1, 15.8, 16.8, 1.3, 1.45, MAT.plank, { col: false });
placeGLB('tyre_old', { x: -17.35, y: 28.6, z: 0, face: 35 });
placeGLB('jerrycan', { x: -17.0, y: 29.45, z: 0, face: 70 });
B(-13.45, -13.05, -0.85, 0.65, 0.42, 0.47, MAT.plank, { col: true, grain: 'y' });
for (const y of [-0.75, 0.55]) B(-13.4, -13.1, y - 0.04, y + 0.04, 0, 0.42, MAT.plank, { col: false, grain: 'z' }); // V15: runs north–south, so who sits on it looks east into the garden
// ---- Ronald's tractor with a side mower (23.10.2026, Falko: "Er fährt oft mit einem Traktor hin und her und mäht z. B. die Wiese"):
// the same old tractor (npc/npc_real.js gives it the real model too), a cutter bar on the right between the axles; it stands north of
// the paddock. Local frame as makeTractor: x right, y forward, z up. ----
export const MOWER = makeTractor();
MOWER.home = { x: PAD.x0 + 6.5, y: PAD.y1 + 3.0, az: 0 };
MOWER.bar = (() => {
  const g = new THREE.Group(),
    parts = new THREE.Group();
  box(parts, 1.95, 0.09, 0.05, NM.dark, 1.88, 0.25, 0.07); // the bar with its knife
  for (let k = 0; k < 16; k++) box(parts, 0.045, 0.16, 0.035, NM.rim, 1.0 + k * 0.12, 0.33, 0.07); // fingers
  box(parts, 0.32, 0.4, 0.3, NM.red, 0.95, 0.2, 0.25); // drive and guard
  box(parts, 0.1, 0.5, 0.12, NM.dark, 2.84, 0.22, 0.08); // outer skid
  box(parts, 0.06, 0.06, 0.9, NM.red, 0.9, 0.05, 0.6); // lifting arm
  // one mesh per material (three draw calls instead of twenty)
  const by = new Map();
  parts.updateMatrixWorld(true);
  for (const m of parts.children) {
    const geo = m.geometry.clone().applyMatrix4(m.matrix);
    (by.get(m.material) || by.set(m.material, []).get(m.material)).push(geo);
  }
  for (const [mat, geos] of by) {
    const me = new THREE.Mesh(mergeGeometries(geos), mat);
    me.castShadow = true;
    me.userData.noMerge = true;
    g.add(me);
  }
  return g;
})();
MOWER.g.add(MOWER.bar);
MOWER.g.position.copy(V(MOWER.home.x, MOWER.home.y, 0));
MOWER.g.rotation.y = -MOWER.home.az;
scene.add(MOWER.g);
// ---- controllers ----
export const NPCS = {};
export function headingTo(x, y, tx, ty) {
  return Math.atan2(tx - x, ty - y);
}
export function lerpAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * k;
}
class Walker {
  constructor(name, fig, o) {
    this.name = name;
    this.fig = fig;
    this.x = o.x;
    this.y = o.y;
    this.az = o.az || 0;
    this.speed = o.speed || 0.9;
    this.wps = o.wps;
    this.target = null;
    this.wait = o.wait0 || 1;
    this.v = 0;
    this.idleMin = o.idleMin ?? 4;
    this.idleMax = o.idleMax ?? 12;
    this.talking = false;
    this.onArrive = o.onArrive || null;
    this.area = o.area;
    this.lastSay = -1e9;
    this.sayGap = o.sayGap || 28;
    this.hear = o.hear || 18;
    this.lines = o.lines;
    this.talks = 0;
    this.avoidUntil = 0;
    this.state = 'roam';
  }
  // z: the flat modelled square at 0, outside it the ground (Hubert in the village); zOff: sitting on a chair (npc/life.js)
  place() {
    const z = Math.abs(this.x) < 115 && Math.abs(this.y) < 115 ? 0 : KERN.ground(this.x, this.y);
    this.fig.g.position.copy(V(this.x, this.y, z + (this.zOff || 0)));
    this.fig.g.rotation.y = -this.az;
  }
  pick() {
    let w;
    do {
      w = this.wps[Math.floor(Math.random() * this.wps.length)];
    } while (this.wps.length > 1 && w === this.target);
    this.target = w;
  }
  dist() {
    return Math.hypot(P.x - this.x, P.y - this.y);
  }
  step(dt, speedMul = 1) {
    if (this.ctl && this.ctl(dt)) {
      this.place();
      return;
    }
    if (this.talking) {
      const h = headingTo(this.x, this.y, P.x, P.y);
      this.az = lerpAngle(this.az, h, Math.min(1, dt * 4));
      this.v = 0;
      this.fig.anim(dt, 0);
      this.place();
      return;
    }
    if (!this.target) {
      this.wait -= dt;
      this.v = 0;
      this.fig.anim(dt, 0);
      if (this.wait <= 0) this.pick();
      this.place();
      return;
    }
    const dx = this.target[0] - this.x,
      dy = this.target[1] - this.y,
      d = Math.hypot(dx, dy);
    const sp = this.speed * speedMul;
    if (d < 0.25) {
      this.target = null;
      this.wait = this.idleMin + Math.random() * (this.idleMax - this.idleMin);
      this.v = 0;
      if (this.onArrive) this.onArrive();
      this.fig.anim(dt, 0);
      this.place();
      return;
    }
    const h = Math.atan2(dx, dy);
    this.az = lerpAngle(this.az, h, Math.min(1, dt * 3));
    const mv = Math.min(d, sp * dt);
    this.x += Math.sin(this.az) * mv;
    this.y += Math.cos(this.az) * mv;
    this.v = sp;
    this.fig.anim(dt, sp);
    this.place();
  }
  say(cat, { force = false, vol = 1.2 } = {}) {
    if (this.away) return null;
    const L = VL[this.name + ':' + cat];
    if (!L || !L.length) return null;
    const now = performance.now() / 1000;
    if (!force && now - this.lastSay < this.sayGap) return null;
    this.lastSay = now;
    const l = L[Math.floor(Math.random() * L.length)];
    NPCUI.sub(this, l.text);
    return audio.voice(l.id, this.x, this.y, { vol });
  }
  sayId(id, vol = 1.2) {
    if (this.away) return null;
    this.lastSay = performance.now() / 1000;
    NPCUI.sub(this, VTXT[id] || '');
    return audio.voice(id, this.x, this.y, { vol });
  }
  // a line without a recording (23.10.2026: the new everyday lines are text only) – subtitle, resolves after the time to read it
  sayText(text, ms) {
    if (this.away || !text) return Promise.resolve(false);
    this.lastSay = performance.now() / 1000;
    NPCUI.sub(this, text);
    return new Promise(res => setTimeout(() => res(true), ms || Math.max(1800, text.length * 60)));
  }
}
// Hubert
const hubertFig = makePerson({
  jacket: NM.hubJacket,
  trousers: NM.hubTrousers,
  skin: NM.skinH,
  hat: 'cap',
  beard: true,
  h: 1.72,
});
scene.add(hubertFig.g);
const HUB_WPS = [
  [-13.5, 21.2],
  [-15.7, 11.7],
  [-12.7, 3.7],
  [-15, -6.8],
  [-16.8, -17.3],
  [-13.1, -25.3],
  [-14.5, 17.2],
  [-14.1, -1.3],
];
NPCS.hubert = new Walker('hubert', hubertFig, {
  x: -14.1,
  y: 7.7,
  az: 0,
  speed: 0.85,
  wps: HUB_WPS,
  idleMin: 6,
  idleMax: 18,
  sayGap: 30,
  hear: 16,
});
NPCS.hubert.tractorT = 150 + Math.random() * 120;
NPCS.hubert.drive = null;
// Ronald
const ronaldFig = makePerson({
  jacket: NM.ronShirt,
  vest: NM.ronVest,
  trousers: NM.ronTrousers,
  skin: NM.skinR,
  hat: 'straw',
  h: 1.8,
});
scene.add(ronaldFig.g);
// (fallback roaming around the paddock; his day is planned in npc/life.js)
const RON_WPS = [
  [PAD.x0 + 4.1, PAD.y0 + 7.2],
  [PAD.x0 + 7.5, PAD.y0 + 12],
  [PAD.x0 + 9.5, PAD.y1 - 2.0],
  [PAD.x0 + 2.5, PAD.y1 - 4.0],
  [PAD.x0 + 6, PAD.y0 + 2.5],
  [PAD.x0 - 1.5, PAD.gy + 1.5],
  [PAD.x1 - 2.5, PAD.y0 + 8.0],
];
NPCS.ronald = new Walker('ronald', ronaldFig, {
  x: PAD.x0 + 5.5,
  y: PAD.y0 + 10,
  az: 0,
  speed: 0.95,
  wps: RON_WPS,
  idleMin: 5,
  idleMax: 14,
  sayGap: 22,
  hear: 22,
});
NPCS.ronald.greeted = false;
// goats
export const GOATS = [];
export const GOATLURE = { x: 0, y: 0, r: 1, until: 0 }; // where the goats go for a while (until: performance.now() seconds)
for (const [name, m, big, x, y] of [
  ['Lotte', NM.goatW, false, PAD.x1 - 5, PAD.y1 - 3.2],
  ['Frieda', NM.goatB, false, PAD.x1 - 2, PAD.y0 + 11],
  ['Egon', NM.goatK, true, PAD.x1 - 1.5, PAD.y1 - 5.5],
]) {
  const f = makeGoat(m, big);
  scene.add(f.g);
  const w = new Walker('goat', f, {
    x,
    y,
    az: Math.random() * 6.28,
    speed: 0.45 + Math.random() * 0.2,
    wps: [],
    idleMin: 6,
    idleMax: 20,
  });
  w.pick = function () {
    const L = GOATLURE; // hay in the rack, the shelter at night (npc/life.js), the herding task (game/quests.js)
    if (L.until > performance.now() / 1000) {
      const a = Math.random() * Math.PI * 2,
        r = Math.random() * L.r;
      this.target = [L.x + Math.cos(a) * r, L.y + Math.sin(a) * r * 0.7];
      return;
    }
    this.target = [
      PAD.x0 + 1.5 + Math.random() * (PAD.x1 - PAD.x0 - 3),
      PAD.y0 + 1.5 + Math.random() * (PAD.y1 - PAD.y0 - 3),
    ];
  };
  w.gname = name;
  w.bleatT = 8 + Math.random() * 40;
  GOATS.push(w);
}
// ---- bleats: recordings when available, else a synthesized "mäh" ----
export function bleat(gt) {
  const sp = audio.spatial(gt.x, gt.y, 22);
  if (!audio.ready()) return;
  gt.fig.graze = 0;
  gt.headUp = 1.5;
  if (gt.fig.onBleat) gt.fig.onBleat();
  if (audio.has('goat')) {
    audio.at('goat', gt.x, gt.y, {
      vol: 0.9,
      ref: 22,
      rate: gt.gname === 'Egon' ? 0.86 : gt.gname === 'Lotte' ? 1.06 : 0.97,
    });
    return;
  }
  audio.synthBleat && audio.synthBleat(gt.x, gt.y, gt.gname === 'Egon' ? 0.8 : 1.05);
}
// ---- dialogue UI ----
export const NPCUI = (() => {
  const btn = $('talkbtn'),
    pan = $('npcpanel'),
    nm = $('np-name'),
    tx = $('np-text'),
    tp = $('np-topics'),
    cl = $('np-close'),
    sb = $('npcsub');
  let cur = null,
    busy = false,
    subT = null;
  const labels = { hubert: 'Hubert', ronald: 'Ronald' };
  function sub(w, text) {
    if (!sb) return;
    if (!text) return;
    sb.textContent = (labels[w.name] || w.gname || '') + ': ' + text;
    sb.hidden = false;
    clearTimeout(subT);
    subT = setTimeout(
      () => {
        sb.hidden = true;
      },
      Math.max(2500, text.length * 70)
    );
    if (cur === w && tx) tx.textContent = text;
  }
  const friendly = w => !!(window.QUESTS && LATE.QUESTS.friendly(w.name));
  async function start(w) {
    if (cur || !pan) return;
    cur = w;
    w.talking = true;
    w.target = null;
    busy = true;
    pan.hidden = false;
    nm.textContent = labels[w.name];
    tx.textContent = '…';
    renderTopics();
    await w.say(friendly(w) && VL[w.name + ':greetf'] ? 'greetf' : 'greet', { force: true });
    busy = false;
  }
  // topics: quest topics first (game/quests.js decides which apply right now), then the small talk
  function renderTopics() {
    if (!tp || !cur) return;
    tp.innerHTML = '';
    const topics = Object.entries((VM.topics && VM.topics[cur.name]) || {}),
      qt = window.QUESTS ? LATE.QUESTS.topics(cur.name) : [];
    for (const [k, label, quest] of [...qt.map(q => [q.k, q.label, true]), ...topics]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (quest) b.className = 'quest';
      b.addEventListener('click', () => ask(k));
      tp.appendChild(b);
    }
    const bye = document.createElement('button');
    bye.type = 'button';
    bye.className = 'bye';
    bye.textContent = 'Tschüss';
    bye.addEventListener('click', () => end(true));
    tp.appendChild(bye);
  }
  async function ask(k) {
    if (!cur || busy) return;
    busy = true;
    const w = cur,
      quest = k.startsWith('q_');
    if (!quest) w.talks++;
    tp.querySelectorAll('button').forEach(b => (b.disabled = true));
    const qa = quest && window.QUESTS ? LATE.QUESTS.ask(w.name, k) : null;
    if (qa && qa.before) qa.before();
    if (qa && qa.text) for (const t of [].concat(qa.text)) await w.sayText(t);
    else await w.sayId(w.name + '_t_' + k);
    if (qa && qa.after) qa.after();
    if (!cur) return;
    if (qa && qa.end) {
      end(false);
      return;
    }
    if (w.name === 'hubert' && w.talks >= 2 && !friendly(w)) {
      await w.say('bye', { force: true });
      w.avoidUntil = performance.now() / 1000 + 90;
      end(false);
      return;
    }
    busy = false;
    renderTopics();
  }
  async function end(sayBye) {
    const w = cur;
    if (!w) return;
    cur = null;
    if (pan) pan.hidden = true;
    w.talking = false;
    w.talks = 0;
    w.wait = 1.5;
    busy = false;
    if (sayBye) {
      w.say('bye', { force: true });
      if (w.name === 'hubert') w.avoidUntil = performance.now() / 1000 + 60;
    }
  }
  btn?.addEventListener('click', () => {
    const w = nearNPC();
    if (w) start(w);
  }); // (with the game layer the one action button starts talks; this one stays hidden)
  cl?.addEventListener('click', () => end(true));
  return { start, end, sub, cur: () => cur, busy: () => busy, btn };
})();
function nearNPC() {
  if (P.mode !== 'walk') return null;
  let best = null,
    bd = 3.2;
  for (const w of [NPCS.hubert, NPCS.ronald]) {
    if (w.drive || !w.fig.g.visible) continue;
    const d = w.dist();
    if (d < bd) {
      bd = d;
      best = w;
    }
  }
  return best;
}
window.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || window.PLAY) return;
  if (e.key.toLowerCase() === 'e' && !nearDoor()) {
    const w = nearNPC();
    if (w && !NPCUI.cur()) {
      NPCUI.start(w);
      e.preventDefault();
    }
  }
});
// ---- tractor trip: Hubert walks to the tractor, drives the field track east and back, parks ----
const TRK = (() => {
  const [P1, P2] = S0.path;
  const dx = P2[0] - P1[0],
    dy = P2[1] - P1[1],
    L = Math.hypot(dx, dy);
  return { P1, u: [dx / L, dy / L], L };
})();
export const trkPt = t => [TRK.P1[0] + TRK.u[0] * t, TRK.P1[1] + TRK.u[1] * t];
export const TRACTOR_HOME = { x: -15.1, y: 27.2, az: (20 * Math.PI) / 180 };
const DRIVE_ROUTE = [
  [-14.7, 32.2],
  [-13.5, 37.2],
  trkPt(7),
  trkPt(20),
  trkPt(34),
  trkPt(47),
  trkPt(34),
  trkPt(20),
  trkPt(7),
  [-13.9, 37.2],
  [-14.9, 31.7],
  [TRACTOR_HOME.x, TRACTOR_HOME.y],
];
// o.route: waypoints (default: the round on the field track that ends at home), o.sp: speed (m/s), o.onEnd(w): called at the last
// waypoint instead of parking at home (Hubert's trip to the village stops there and gets off: npc/life.js)
export function startDrive(w, o = {}) {
  const T = TRACTOR.g;
  w.drive = {
    i: 0,
    az: -T.rotation.y,
    x: T.position.x,
    y: -T.position.z,
    phase: 'start',
    t: 0,
    route: o.route || DRIVE_ROUTE,
    sp: o.sp || 2.3,
    onEnd: o.onEnd || null,
  };
  w.fig.mode = 'sit';
  w.state = 'drive';
  audio.loopAt('tractor', 'tractor', w.drive.x, w.drive.y, { vol: 0.9, ref: 14, rate: 0.95 });
}
// the tractor follows the ground outside the flat modelled square (the road to the village): height under the middle, pitch from the axles
function tractorGround(d) {
  if (Math.abs(d.x) < 115 && Math.abs(d.y) < 115) {
    d.z = 0;
    d.pitch = 0;
    return;
  }
  const fx = Math.sin(d.az),
    fy = Math.cos(d.az),
    zf = KERN.ground(d.x + fx * 1.1, d.y + fy * 1.1),
    zb = KERN.ground(d.x - fx * 1.0, d.y - fy * 1.0);
  d.z = (zf + zb) / 2;
  d.pitch = Math.atan2(zf - zb, 2.1);
}
function updateDrive(w, dt) {
  const d = w.drive;
  d.t += dt;
  if (d.phase === 'start') {
    if (d.t > 2.5) {
      d.phase = 'go';
    }
  } else if (d.phase === 'go') {
    const R = d.route,
      tg = R[d.i];
    const dx = tg[0] - d.x,
      dy = tg[1] - d.y,
      dist = Math.hypot(dx, dy);
    const h = Math.atan2(dx, dy);
    d.az = lerpAngle(d.az, h, Math.min(1, dt * 1.6));
    // V16b: waits while a vehicle stands in the way; slows down in tight turns and for the last point. (Since V16e the movement
    // statements below were stuck inside the end-of-line comment here, so Hubert's tractor never moved – Falko, 23.10.2026 2:28.)
    // (the look ahead reaches no further than its next point and a metre: the parked car beside the field path stopped him for good
    // on his way back, 0.9 m before a point; and after 12 s of waiting he goes on anyway)
    const last = d.i === R.length - 1,
      turn = Math.abs(lerpAngle(0, h - d.az, 1)),
      blocked = !(d.ignore > 0) && window.VEH && LATE.VEH.blocked(d.x, d.y, d.az, Math.min(3.2, dist + 1.0));
    d.wait = blocked ? (d.wait || 0) + dt : 0;
    if (d.wait > 12) {
      d.ignore = 6;
      d.wait = 0;
    }
    if (d.ignore > 0) d.ignore -= dt;
    const sp = blocked ? 0 : d.sp * (turn > 0.6 ? 0.45 : 1) * (last ? Math.min(1, 0.25 + dist / 6) : 1); // slows down for the last point
    const mv = Math.min(dist, sp * dt);
    d.x += Math.sin(d.az) * mv;
    d.y += Math.cos(d.az) * mv;
    TRACTOR.roll(mv);
    // the last point: close enough, or already beside/behind (no circling round it) – the parking rolls it into place
    if (dist < (last ? 0.35 : 0.6 + (d.sp > 3 ? 0.8 : 0)) || (last && dist < 2 && Math.cos(h - d.az) < 0.3)) {
      d.i++;
      if (window.QUESTS && R === DRIVE_ROUTE) LATE.QUESTS.driveWp(d.i);
      if (d.i >= R.length) {
        if (d.onEnd) {
          const f = d.onEnd;
          d.onEnd = null;
          f(w);
          if (w.drive !== d) return;
        } else {
          d.phase = 'park';
          d.t = 0;
        }
      }
    }
  } else if (d.phase === 'park') {
    d.az = lerpAngle(d.az, TRACTOR_HOME.az, Math.min(1, dt * 1.5));
    if (Math.hypot(d.x - TRACTOR_HOME.x, d.y - TRACTOR_HOME.y) < 2) {
      d.x += (TRACTOR_HOME.x - d.x) * Math.min(1, dt * 2); // rolls into its place (the tasks look for it there)
      d.y += (TRACTOR_HOME.y - d.y) * Math.min(1, dt * 2);
    }
    if (d.t > 2.5) {
      audio.stopLoop('tractor', 1.2);
      w.drive = null;
      w.fig.mode = 'stand';
      w.state = 'roam';
      w.x = d.x - Math.sin(d.az + Math.PI / 2) * 0.9;
      w.y = d.y - Math.cos(d.az + Math.PI / 2) * 0.9;
      w.az = d.az;
      w.target = null;
      w.wait = 3;
      w.tractorT = 240 + Math.random() * 240;
      if (d.passenger && window.QUESTS) LATE.QUESTS.driveEnd(w);
      return;
    }
  }
  tractorGround(d);
  TRACTOR.g.position.copy(V(d.x, d.y, d.z));
  TRACTOR.g.rotation.set(d.pitch, -d.az, 0, 'YXZ');
  audio.moveLoop('tractor', d.x, d.y);
  // Hubert on the seat
  const st = TRACTOR.seat || { back: 0.62, z: 0.14 },
    sz = st.top != null ? st.top - (w.fig.hipH || 0.9) + 0.1 : st.z;
  w.x = d.x - Math.sin(d.az) * st.back;
  w.y = d.y - Math.cos(d.az) * st.back;
  w.az = d.az;
  w.fig.g.position.copy(V(w.x, w.y, sz + d.z - Math.sin(d.pitch) * st.back));
  w.fig.g.rotation.set(d.pitch, -d.az, 0, 'YXZ');
  w.fig.anim(dt, 0);
}
// Hubert gets off where the tractor stands (the trip to the village): the tractor stays, he walks on from its left side
export function leaveTractor(w) {
  const d = w.drive;
  if (!d) return;
  audio.stopLoop('tractor', 1.2);
  w.drive = null;
  w.fig.mode = 'stand';
  w.state = 'roam';
  w.x = d.x - Math.sin(d.az + Math.PI / 2) * 0.9;
  w.y = d.y - Math.cos(d.az + Math.PI / 2) * 0.9;
  w.az = d.az;
  w.target = null;
  w.fig.g.rotation.set(0, -w.az, 0);
}
// ---- per-frame update ----
const _frus = new THREE.Frustum(),
  _pm = new THREE.Matrix4(),
  _vv = new THREE.Vector3();
export function inView(x, y, z = 1) {
  _vv.set(x, z, -y);
  return _frus.containsPoint(_vv);
}
let npcAcc = 0,
  lastRonBleat = 0,
  lastNpcDraw = 0;
function updateNPC(dt) {
  if (!PHASES || P.mode === undefined) return;
  npcAcc += dt;
  const now = performance.now() / 1000;
  _pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  _frus.setFromProjectionMatrix(_pm);
  let dirty = false;
  // Hubert
  const h = NPCS.hubert;
  if (h.drive) {
    updateDrive(h, dt);
    dirty = dirty || inView(TRACTOR.g.position.x, -TRACTOR.g.position.z) || inView(h.x, h.y);
  } else {
    const pd = h.dist();
    // without his day plan (npc/life.js) he roams and takes the tractor for a round now and then (V14)
    if (!h.life) h.tractorT -= dt;
    if (
      !h.life &&
      h.tractorT <= 0 &&
      !h.talking &&
      !h.away &&
      pd > 7 &&
      Math.hypot(h.x - TRACTOR_HOME.x, h.y - TRACTOR_HOME.y) < 2.5
    )
      startDrive(h);
    else if (!h.life && h.tractorT <= 0 && !h.talking && h.state !== 'toTractor') {
      h.state = 'toTractor';
      h.target = [TRACTOR_HOME.x + 1.0, TRACTOR_HOME.y - 1.2];
    } else {
      if (h.state === 'toTractor' && !h.target) {
        if (Math.hypot(h.x - TRACTOR_HOME.x, h.y - TRACTOR_HOME.y) < 2.5 && pd > 7 && !h.away) startDrive(h);
        else {
          h.state = 'roam';
          h.tractorT = 60;
        }
      }
      // keeps his distance: steps away when approached, says so (at work or on a chair he stays and only says so)
      if (
        !h.talking &&
        (!h.ctl || h.ctl === h.lifeCtl) &&
        pd < 2.2 &&
        now > h.avoidUntil - 85 &&
        h.state !== 'toTractor' &&
        !(window.QUESTS && LATE.QUESTS.friendly('hubert'))
      ) {
        if (h.life && h.life.busy()) {
          if (now - h.lastSay > 14) h.say('near', { force: true });
        } else {
          const ax = h.x - P.x,
            ay = h.y - P.y,
            L = Math.hypot(ax, ay) || 1;
          h.target = [h.x + (ax / L) * 3.5, h.y + (ay / L) * 3.5];
          h.shy = 3.5;
          if (now - h.lastSay > 12) h.say('near', { force: true });
        }
      } else if (!h.talking && pd < h.hear && Math.random() < dt / 30 && !(h.life && h.life.chatting())) h.say('idle');
      if (h.shy > 0) h.shy -= dt;
      if (h.talking && pd > 5.5) NPCUI.end(false);
      h.step(dt, now < h.avoidUntil ? 1.35 : 1);
    }
    // (at work – a pose, a talk – he is drawn further away too: chopping seen from the garden)
    dirty =
      dirty ||
      ((h.v > 0 || (h.fig.real && (h.dist() < 25 || ((h.fig.pose || h.fig.speak) && h.dist() < 50)))) &&
        inView(h.x, h.y));
  }
  // Ronald
  const r = NPCS.ronald;
  {
    const pd = r.dist();
    if (!r.greeted && pd < 11 && inView(r.x, r.y)) {
      r.greeted = true;
      r.sayId('ronald_idle_04');
    }
    if (!r.talking && pd < r.hear && Math.random() < dt / 26 && !(r.life && r.life.chatting())) r.say('idle');
    if (r.talking && pd > 5.5) NPCUI.end(false);
    r.step(dt);
    dirty =
      dirty || ((r.v > 0 || (r.fig.real && (pd < 25 || ((r.fig.pose || r.fig.speak) && pd < 50)))) && inView(r.x, r.y));
  }
  // goats
  for (const gt of GOATS) {
    gt.bleatT -= dt;
    if (gt.headUp > 0) {
      gt.headUp -= dt;
      gt.fig.graze = 0;
    } else gt.fig.graze = gt.target ? 0 : 1;
    if (gt.bleatT <= 0) {
      gt.bleatT = 18 + Math.random() * 45;
      bleat(gt);
      if (Math.random() < 0.55 && now - lastRonBleat > 20 && !r.talking) {
        lastRonBleat = now;
        setTimeout(
          () => {
            if (!r.talking) r.say('schnauze', { force: true, vol: 1.5 });
          },
          900 + Math.random() * 600
        );
      }
    }
    gt.step(dt);
    const gd = gt.dist();
    if (inView(gt.x, gt.y, 0.6) && (gd < 22 || (gt.v > 0 && gd < 60))) dirty = true;
  }
  // talk button
  const nw = nearNPC();
  const b = NPCUI.btn;
  if (b) {
    const show = !!nw && !NPCUI.cur() && !window.PLAY;
    if (b.hidden === show) {
      b.hidden = !show;
    }
    if (show) {
      const t = 'Mit ' + (nw.name === 'hubert' ? 'Hubert' : 'Ronald') + ' sprechen';
      if (b.textContent !== t) b.textContent = t;
    }
  }
  updateBlobs();
  if (dirty && now - lastNpcDraw > (RENDER.hq ? 1 / 40 : 1 / 20)) {
    lastNpcDraw = now;
    markDirty();
  }
}
// moving figures get soft ground shadows (decals stretched away from the sun) instead of shadow-map shadows: the sun's shadow map is only
// redrawn when something static changes, so figures in it left their shadows behind where they had stood
const BLOBU = { s: { value: 1 } };
const BLOBM = new THREE.ShaderMaterial({
  uniforms: BLOBU,
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  vertexShader:
    'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader:
    'uniform float s; varying vec2 vUv; void main() { vec2 q = (vUv - 0.5) * 2.0; float r = length(q); float a = r >= 1.0 ? 0.0 : 0.62 * s * (1.0 - r * r) * (1.0 - 0.3 * r) * (0.75 + 0.25 * smoothstep(1.0, -1.0, q.y)); gl_FragColor = vec4(0.0, 0.0, 0.0, a); }',
});
export const BLOBS = [],
  _bv = new THREE.Vector3();
// figures with real sun shadows (npc/npc_real.js) keep only a soft contact shadow underneath
const BLOBC = BLOBM.clone();
BLOBC.uniforms.s.value = 0.55;
function addBlob(fig, w, l, h) {
  fig.g.traverse(o => {
    if (o.isMesh) o.castShadow = false;
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), BLOBM);
  m.renderOrder = 1;
  m.userData.noMerge = true;
  m.frustumCulled = false;
  scene.add(m);
  BLOBS.push({ fig, w, l, h, m });
  fig.blob = m;
  return m;
}
function updateBlobs() {
  const sd = sunDir,
    el = Math.asin(THREE.MathUtils.clamp(sd.y, 0.03, 1)),
    cot = Math.min(3.2, Math.cos(el) / Math.sin(el));
  const hl = Math.hypot(sd.x, sd.z) || 1,
    ux = -sd.x / hl,
    uz = -sd.z / hl,
    th = Math.atan2(-ux, -uz);
  BLOBU.s.value = THREE.MathUtils.clamp(sun.intensity / 3.6, 0.2, 1);
  for (const b of BLOBS) {
    const g = b.fig.g;
    if (!g.visible || b.fig.mode === 'sit') {
      b.m.visible = false;
      continue;
    }
    b.m.visible = true;
    g.getWorldPosition(_bv);
    const ct = !!b.fig.fsOn && FIGSH.on.value > 0.5;
    b.m.material = ct ? BLOBC : BLOBM;
    const L = ct ? 0 : b.h * cot;
    b.m.position.set(_bv.x + ux * L * 0.45, _bv.y + 0.03, _bv.z + uz * L * 0.45);
    b.m.rotation.set(-Math.PI / 2, 0, th, 'XYZ');
    b.m.scale.set(b.w * (ct ? 0.85 : 1), (b.l + L * 0.9) * (ct ? 0.85 : 1), 1);
  }
}
addBlob(hubertFig, 0.55, 0.5, 0.9);
addBlob(ronaldFig, 0.55, 0.5, 0.9);
for (const gt of GOATS) addBlob(gt.fig, 0.55, 0.8, 0.45);
addBlob(TRACTOR, 1.9, 2.6, 1.0);
addBlob(MOWER, 1.9, 2.6, 1.0);
window.NPC = {
  NPCS,
  GOATS,
  TRACTOR,
  MOWER,
  PAD,
  update: updateNPC,
  startDrive: () => startDrive(NPCS.hubert),
  talk: n => NPCUI.start(NPCS[n]),
};
if (typeof rebuildGrids === 'function') rebuildGrids(); // fence, shelter and tractor colliders were added after the grid was built
