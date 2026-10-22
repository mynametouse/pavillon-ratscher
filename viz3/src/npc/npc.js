// ---------------- neighbours: Günter (west, sheds, old tractor) and Bernd (east, goat paddock) ----------------
// Procedural low-poly figures, waypoint AI, positional voices (Piper TTS, free), goat bleats, tractor trips.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LATE } from '../core/late.js';
import { $, cam, scene, V } from '../core/head.js';
import { ANISO, FIGSH, markDirty, patchSV, plain } from '../core/assets.js';
import { B, beam, COL, hingeDoor, PH, PH_END, phase, tagPh } from '../core/geo.js';
import { MAT } from '../core/mats.js';
import { placeGLB } from '../pavilion/interior.js';
import { S0, sun, sunDir } from '../garden/env.js';
import { gB, MATS } from '../garden/site_base.js';
import { RENDER } from '../render/render.js';
import { nearDoor, P, poseDoor, rebuildGrids } from '../game/game.js';
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
// ---- paddock on the east neighbour's land ----
export const PAD = { x0: 19, x1: 33, y0: -10.3, y1: 8.2 };
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
      rail(a[0], a[1], a[0], -0.3);
      rail(a[0], -2.7, b[0], b[1]);
    } else rail(a[0], a[1], b[0], b[1]);
  }
  // the gate (west side): a wooden farm gate on a hinge at the north post, swings into the paddock; it stands open until Bernd shuts it (V14)
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
      hy: -0.32,
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
  // Unterstand (offen nach Westen), Heuraufe, Tränke
  for (const [x, y] of [
    [29.1, 4.3],
    [32.1, 4.3],
    [29.1, 7.7],
    [32.1, 7.7],
  ])
    B(x - 0.07, x + 0.07, y - 0.07, y + 0.07, 0, y > 5.7 ? 2.1 : 2.4, MAT.kvh, { col: true, grain: 'z' });
  B(32.2, 32.8, 4.2, 7.8, 0, 2.1, MAT.plank, { grain: 'z' });
  B(29, 32.3, 7.65, 7.8, 0, 2.1, MAT.plank, { grain: 'x' });
  B(29, 32.3, 4.2, 4.35, 0, 2.4, MAT.plank, { grain: 'x' });
  {
    const geo = new THREE.BoxGeometry(3.7, 0.04, 4.0);
    const me = new THREE.Mesh(geo, MAT.roofGrey);
    me.position.copy(V(30.6, 6, 2.45));
    me.rotation.x = Math.atan2(0.3, 3.4);
    me.castShadow = true;
    scene.add(me);
    tagPh(me);
    COL.push([28.8, 32.9, 4, 8, 2.0, 2.7, 'roof', null, null]);
  }
  B(29.3, 31.9, 6.9, 7.6, 0.0, 0.55, NM.hay, { col: true });
  B(29.3, 31.9, 6.7, 7.65, 0.55, 0.65, NM.hay, { col: false, cast: false });
  B(22.5, 23.7, -4.8, -4, 0, 0.45, NM.trough, { col: true });
  B(22.55, 23.65, -4.75, -4.05, 0.38, 0.4, NM.water, { col: false, cast: false });
  B(19.5, 20.4, 3.2, 3.7, 0, 0.9, MAT.plank, { col: true }); // Pfahl für den Salzleckstein
}
// ---- Günter's side: tractor parked by the northern shed, a woodpile, a bench ----
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
  place() {
    this.fig.g.position.copy(V(this.x, this.y, 0));
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
}
// Günter
const guenterFig = makePerson({
  jacket: NM.hubJacket,
  trousers: NM.hubTrousers,
  skin: NM.skinH,
  hat: 'cap',
  beard: true,
  h: 1.72,
});
scene.add(guenterFig.g);
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
NPCS.guenter = new Walker('guenter', guenterFig, {
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
NPCS.guenter.tractorT = 150 + Math.random() * 120;
NPCS.guenter.drive = null;
// Bernd
const berndFig = makePerson({
  jacket: NM.ronShirt,
  vest: NM.ronVest,
  trousers: NM.ronTrousers,
  skin: NM.skinR,
  hat: 'straw',
  h: 1.8,
});
scene.add(berndFig.g);
const RON_WPS = [
  [23.1, -3.1],
  [26.5, 1.7],
  [28.5, 6.2],
  [21.5, 4.2],
  [25, -7.8],
  [20.3, -0.3],
  [30.5, -2.3],
];
NPCS.bernd = new Walker('bernd', berndFig, {
  x: 24.5,
  y: -0.3,
  az: 0,
  speed: 0.95,
  wps: RON_WPS,
  idleMin: 5,
  idleMax: 14,
  sayGap: 22,
  hear: 22,
});
NPCS.bernd.greeted = false;
// goats
export const GOATS = [];
for (const [name, m, big, x, y] of [
  ['Lotte', NM.goatW, false, 28, 5],
  ['Frieda', NM.goatB, false, 31, 1],
  ['Egon', NM.goatK, true, 33.5, 6.5],
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
  const labels = { guenter: 'Günter', bernd: 'Bernd' };
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
    await w.sayId(w.name + '_t_' + k);
    if (qa && qa.after) qa.after();
    if (!cur) return;
    if (qa && qa.end) {
      end(false);
      return;
    }
    if (w.name === 'guenter' && w.talks >= 2 && !friendly(w)) {
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
      if (w.name === 'guenter') w.avoidUntil = performance.now() / 1000 + 60;
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
  for (const w of [NPCS.guenter, NPCS.bernd]) {
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
// ---- tractor trip: Günter walks to the tractor, drives the field track east and back, parks ----
const TRK = (() => {
  const [P1, P2] = S0.path;
  const dx = P2[0] - P1[0],
    dy = P2[1] - P1[1],
    L = Math.hypot(dx, dy);
  return { P1, u: [dx / L, dy / L], L };
})();
const trkPt = t => [TRK.P1[0] + TRK.u[0] * t, TRK.P1[1] + TRK.u[1] * t];
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
export function startDrive(w) {
  w.drive = { i: 0, az: TRACTOR_HOME.az, x: TRACTOR_HOME.x, y: TRACTOR_HOME.y, phase: 'start', t: 0 };
  w.fig.mode = 'sit';
  w.state = 'drive';
  audio.loopAt('tractor', 'tractor', w.drive.x, w.drive.y, { vol: 0.9, ref: 14, rate: 0.95 });
}
function updateDrive(w, dt) {
  const d = w.drive;
  d.t += dt;
  if (d.phase === 'start') {
    if (d.t > 2.5) {
      d.phase = 'go';
    }
  } else if (d.phase === 'go') {
    const tg = DRIVE_ROUTE[d.i];
    const dx = tg[0] - d.x,
      dy = tg[1] - d.y,
      dist = Math.hypot(dx, dy);
    const h = Math.atan2(dx, dy);
    d.az = lerpAngle(d.az, h, Math.min(1, dt * 1.6));
    const sp = window.VEH && LATE.VEH.blocked(d.x, d.y, d.az, 3.2) ? 0 : 2.3; // V16b: waits while a vehicle stands in the way const mv = Math.min(dist, sp * dt); d.x += Math.sin(d.az) * mv; d.y += Math.cos(d.az) * mv; TRACTOR.roll(mv);
    if (dist < 0.6) {
      d.i++;
      if (window.QUESTS) LATE.QUESTS.driveWp(d.i);
      if (d.i >= DRIVE_ROUTE.length) {
        d.phase = 'park';
        d.t = 0;
      }
    }
  } else if (d.phase === 'park') {
    d.az = lerpAngle(d.az, TRACTOR_HOME.az, Math.min(1, dt * 1.5));
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
  TRACTOR.g.position.copy(V(d.x, d.y, 0));
  TRACTOR.g.rotation.y = -d.az;
  audio.moveLoop('tractor', d.x, d.y);
  // Günter on the seat
  const st = TRACTOR.seat || { back: 0.62, z: 0.14 },
    sz = st.top != null ? st.top - (w.fig.hipH || 0.9) + 0.1 : st.z;
  w.x = d.x - Math.sin(d.az) * st.back;
  w.y = d.y - Math.cos(d.az) * st.back;
  w.az = d.az;
  w.fig.g.position.copy(V(w.x, w.y, sz));
  w.fig.g.rotation.y = -d.az;
  w.fig.anim(dt, 0);
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
  // Günter
  const h = NPCS.guenter;
  if (h.drive) {
    updateDrive(h, dt);
    dirty = dirty || inView(TRACTOR.g.position.x, -TRACTOR.g.position.z) || inView(h.x, h.y);
  } else {
    h.tractorT -= dt;
    const pd = h.dist();
    if (
      h.tractorT <= 0 &&
      !h.talking &&
      !h.away &&
      pd > 7 &&
      Math.hypot(h.x - TRACTOR_HOME.x, h.y - TRACTOR_HOME.y) < 2.5
    )
      startDrive(h);
    else if (h.tractorT <= 0 && !h.talking && h.state !== 'toTractor') {
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
      // keeps his distance: steps away when approached, says so
      if (
        !h.talking &&
        !h.ctl &&
        pd < 2.2 &&
        now > h.avoidUntil - 85 &&
        h.state !== 'toTractor' &&
        !(window.QUESTS && LATE.QUESTS.friendly('guenter'))
      ) {
        const ax = h.x - P.x,
          ay = h.y - P.y,
          L = Math.hypot(ax, ay) || 1;
        h.target = [h.x + (ax / L) * 3.5, h.y + (ay / L) * 3.5];
        if (now - h.lastSay > 12) h.say('near', { force: true });
      } else if (!h.talking && pd < h.hear && Math.random() < dt / 30) h.say('idle');
      if (h.talking && pd > 5.5) NPCUI.end(false);
      h.step(dt, now < h.avoidUntil ? 1.35 : 1);
    }
    dirty = dirty || ((h.v > 0 || (h.fig.real && h.dist() < 25)) && inView(h.x, h.y));
  }
  // Bernd
  const r = NPCS.bernd;
  {
    const pd = r.dist();
    if (!r.greeted && pd < 11 && inView(r.x, r.y)) {
      r.greeted = true;
      r.sayId('bernd_idle_04');
    }
    if (!r.talking && pd < r.hear && Math.random() < dt / 26) r.say('idle');
    if (r.talking && pd > 5.5) NPCUI.end(false);
    r.step(dt);
    dirty = dirty || ((r.v > 0 || (r.fig.real && pd < 25)) && inView(r.x, r.y));
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
      const t = 'Mit ' + (nw.name === 'guenter' ? 'Günter' : 'Bernd') + ' sprechen';
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
addBlob(guenterFig, 0.55, 0.5, 0.9);
addBlob(berndFig, 0.55, 0.5, 0.9);
for (const gt of GOATS) addBlob(gt.fig, 0.55, 0.8, 0.45);
addBlob(TRACTOR, 1.9, 2.6, 1.0);
window.NPC = {
  NPCS,
  GOATS,
  TRACTOR,
  update: updateNPC,
  startDrive: () => startDrive(NPCS.guenter),
  talk: n => NPCUI.start(NPCS[n]),
};
if (typeof rebuildGrids === 'function') rebuildGrids(); // fence, shelter and tractor colliders were added after the grid was built
