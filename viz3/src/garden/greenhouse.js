import * as THREE from 'three';
import { rnd, V } from '../core/head.js';
import { instanceVariants, MODELS, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { beam, bldBegin, bldEnd, flapDoor, tagPh } from '../core/geo.js';
import {
  BLD,
  FOOT,
  gB,
  INSIDE,
  lcol,
  ldoor,
  lwalk,
  MATS,
  rotDesc,
  siteGroup,
  slopeSlab,
  worldOf,
} from './site_base.js';
import { GACTS, jar, KM, leaf, paletteize, plant, pot, put, rng, seedTray, wateringCan } from './garten_kit.js';
// the panes are frosted glass (Milchglas), a few repaired ones yellowed plastic (Falko, 29.10.2026, photos of 26.10.2026) – plain transparent
// materials like MATS.tint, no new program
const PANE = plain({
  color: 0xeef0ea,
  roughness: 0.35,
  metalness: 0,
  transparent: true,
  opacity: 0.7,
  envMapIntensity: 0.8,
});
const PATCH = plain({
  color: 0xe2dcb2,
  roughness: 0.6,
  metalness: 0,
  transparent: true,
  opacity: 0.78,
  envMapIntensity: 0.5,
});
let paneN = 0;
// Falko (23.10.2026): the entrance faces north. A small greenhouse has its door in a gable end, so the gable ends now face north and south: turned
// by 90° about its centre (site data: heading 96°, the long side east–west) and moved 0.5 m north, clear of the hut's new door
{
  const b = BLD.greenhouse;
  if (b.az === 96) {
    b.az = 6;
    const a = (6 * Math.PI) / 180;
    b.c[0] += 0.5 * Math.sin(a);
    b.c[1] += 0.5 * Math.cos(a);
  }
}
bldBegin('greenhouse', 'Gewächshaus', BLD.greenhouse.c, { short: 'Gewächshaus', pad: 0.05 });
// ===== Gewächshaus (2,0 × 1,4 m) direkt nördlich vom Holzhaus: Alu-Rahmen, Glas, Satteldach mit Lüftungsfenster, Tür im Nordgiebel, Tomaten und Gurken,
// Anzuchtregal am Südgiebel =====
// local frame (az 6): +x ≈ north (door gable), +y ≈ west
{
  const b = BLD.greenhouse,
    g = siteGroup(b),
    R = rng(2026);
  const hx = b.L / 2,
    hy = b.W / 2,
    ze = 1.45,
    zr = 2.05,
    zd = 1.78, // top of the door (it reaches into the gable)
    f = 0.03,
    dy = 0.31;
  const r = rotDesc(b);
  gB(g, -hx, hx, -hy, hy, 0, 0.12, MAT.alu, { cast: false });
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      gB(g, sx * hx - f, sx * hx + f, sy * hy - f, sy * hy + f, 0.12, ze, MAT.alu, { grain: 'z' });
  for (const sy of [-1, 1]) gB(g, -hx, hx, sy * hy - f, sy * hy + f, ze - f, ze + f, MAT.alu, { grain: 'x' });
  gB(g, -hx, hx, -f, f, zr - f, zr + f, MAT.alu, { grain: 'x' });
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) beam([sx * hx, sy * hy, ze], [sx * hx, 0, zr], 0.04, 0.04, MAT.alu, { parent: g });
  for (const i of [-0.33, 0.33])
    for (const sy of [-1, 1]) {
      gB(g, i * hx * 2 - f, i * hx * 2 + f, sy * hy - f, sy * hy + f, 0.12, ze, MAT.alu, { grain: 'z' });
      beam([i * hx * 2, sy * hy, ze], [i * hx * 2, 0, zr], 0.03, 0.03, MAT.alu, { parent: g });
    }
  // door frame in the north gable
  for (const y of [-dy, dy]) gB(g, hx - f, hx + f, y - f, y + f, 0.12, zd + f, MAT.alu, { grain: 'z' });
  gB(g, hx - f, hx + f, -dy, dy, zd, zd + 2 * f, MAT.alu, { grain: 'y' });
  const glass = (x0, x1, y0, y1, z0, z1) => {
    const m = gB(g, x0, x1, y0, y1, z0, z1, paneN++ === 2 ? PATCH : PANE, { cast: false, recv: false });
    if (m) m.renderOrder = 2;
  };
  for (const sy of [-1, 1]) glass(-hx, hx, sy * hy - 0.003, sy * hy + 0.003, 0.12, ze);
  glass(-hx - 0.003, -hx + 0.003, -hy, hy, 0.12, ze);
  // gable glass: the south one a plain triangle, the north one around the door
  for (const sx of [-1, 1]) {
    const sh = new THREE.Shape();
    if (sx < 0) {
      sh.moveTo(-hy, 0);
      sh.lineTo(hy, 0);
      sh.lineTo(0, zr - ze);
    } else {
      const z0 = 0.12 - ze;
      sh.moveTo(-hy, z0);
      sh.lineTo(-dy, z0);
      sh.lineTo(-dy, zd - ze);
      sh.lineTo(dy, zd - ze);
      sh.lineTo(dy, z0);
      sh.lineTo(hy, z0);
      sh.lineTo(hy, 0);
      sh.lineTo(0, zr - ze);
      sh.lineTo(-hy, 0);
    }
    sh.closePath();
    const geo = new THREE.ShapeGeometry(sh);
    const me = new THREE.Mesh(geo, PANE);
    me.position.copy(V(sx * hx, 0, ze));
    me.rotation.y = Math.PI / 2;
    me.renderOrder = 2;
    me.userData.noMerge = true;
    g.add(me);
    tagPh(me);
  }
  // roof glass; on the west slope a vent that opens (Dachfenster)
  const vx0 = 0.05,
    vx1 = 0.6,
    vs = 0.42; // vent: along the ridge vx0..vx1, vs down the slope
  for (const sy of [-1, 1]) {
    const m = slopeSlab(
      g,
      0,
      (sy * hy) / 2,
      (ze + zr) / 2 + 0.02,
      b.L + 0.06,
      hy + 0.02,
      0.006,
      sy * -1 * (zr - ze),
      PANE,
      { cast: false }
    );
    m.renderOrder = 2;
  }
  // raised beds, path of flagstones
  gB(g, -hx + 0.12, hx - 0.12, -hy + 0.08, -0.27, 0.12, 0.42, MAT.plank, { grain: 'x' });
  gB(g, -hx + 0.12, hx - 0.12, 0.27, hy - 0.08, 0.12, 0.42, MAT.plank, { grain: 'x' });
  gB(g, -hx + 0.14, hx - 0.14, -hy + 0.1, -0.29, 0.3, 0.4, MAT.soil, { cast: false });
  gB(g, -hx + 0.14, hx - 0.14, 0.29, hy - 0.1, 0.3, 0.4, MAT.soil, { cast: false });
  gB(g, -hx + 0.12, hx - 0.02, -0.27, 0.27, 0.12, 0.14, MAT.stone, { cast: false });
  // tomatoes on stakes in the east bed (the same random draws as before 23.10.2026, so everything loaded later stays as it was)
  const fernItems = [];
  for (let i = 0; i < 4; i++) {
    const lx = -hx + 0.35 + (i * (b.L - 0.7)) / 3,
      ly = -0.45;
    gB(g, lx - 0.012, lx + 0.012, ly - 0.012, ly + 0.012, 0.4, 1.7, MATS.stake, { grain: 'z', cast: false });
    for (let k = 0; k < 4; k++) {
      const z = 0.6 + k * 0.28;
      // a whorl of leaves (was a green ball; the same random draws: its radius and position)
      const rad = 0.14 + rnd() * 0.05,
        cx = lx + (rnd() - 0.5) * 0.12,
        cy = ly + (rnd() - 0.5) * 0.1;
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * 6.28 + k * 0.8;
        leaf(g, cx + Math.cos(a) * 0.025, cy + Math.sin(a) * 0.025, z - 0.05, rad, a, 0.8 + (j % 2) * 0.35, MATS.leaf);
      }
      if (k > 0 && rnd() < 0.8) {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.03 + rnd() * 0.012, 8, 6), KM.tomato);
        t.position.copy(V(lx + (rnd() - 0.5) * 0.2, ly + 0.12 * (rnd() > 0.5 ? 1 : -1), z - 0.12));
        g.add(t);
        tagPh(t);
      }
    }
    const w = worldOf(b, lx + 0.05, 0.45);
    fernItems.push({ x: w[0], y: w[1], z: 0.4, s: 1.0 + rnd() * 0.3 });
  }
  if (MODELS.fern) instanceVariants('fern', fernItems, { cast: true, env: 0.6, tint: 0xd9f0b8 });
  // more foliage on the tomatoes (own random numbers)
  for (let i = 0; i < 4; i++) {
    const lx = -hx + 0.35 + (i * (b.L - 0.7)) / 3;
    for (let k = 0; k < 12; k++) {
      const a = R() * 6.28,
        z = 0.48 + k * 0.1;
      leaf(g, lx + Math.cos(a) * 0.05, -0.45 + Math.sin(a) * 0.05, z, 0.14 + R() * 0.06, a, 0.7 + R() * 0.5, MATS.leaf);
    }
  }
  // side shoots in the leaf axils ('Geiztriebe'): a thin stem slanting out with a tuft of young leaves; own material, so pinching them out
  // ('Tomaten ausgeizen') only has to hide it, also after the merge
  const shootM = MATS.leaf.clone();
  shootM.color.offsetHSL(0.02, 0.05, 0.06);
  {
    const RS = rng(1907);
    for (let i = 0; i < 4; i++) {
      const lx = -hx + 0.35 + (i * (b.L - 0.7)) / 3;
      for (let k = 0; k < 3; k++) {
        const a = RS() * 6.28,
          z = 0.72 + k * 0.27 + RS() * 0.06,
          ex = lx + Math.cos(a) * 0.075,
          ey = -0.45 + Math.sin(a) * 0.075;
        beam([lx + Math.cos(a) * 0.012, -0.45 + Math.sin(a) * 0.012, z], [ex, ey, z + 0.09], 0.006, 0.006, shootM, {
          parent: g,
        });
        for (let j = 0; j < 3; j++)
          leaf(g, ex, ey, z + 0.085, 0.06 + RS() * 0.03, a + (j - 1) * 0.9, 0.5 + RS() * 0.4, shootM);
      }
    }
  }
  // cucumbers climbing strings in the west bed
  for (let i = 0; i < 3; i++) {
    const lx = -hx + 0.45 + i * 0.5;
    beam([lx, 0.5, 0.4], [lx + 0.05, 0.5, ze - 0.05], 0.004, 0.004, KM.twine, { parent: g });
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 3; j++)
        leaf(g, lx + 0.02, 0.5, 0.58 + k * 0.2 + j * 0.05, 0.15 + R() * 0.06, R() * 6.28, 0.9 + R() * 0.5, MATS.leaf);
      if (k % 2)
        put(g, new THREE.CylinderGeometry(0.018, 0.016, 0.13, 7), MATS.leaf, lx + 0.04, 0.47, 0.6 + k * 0.2, {
          rz: 0.15,
          cast: false,
        });
    }
  }
  // seedling shelf across the south gable, a watering can by the door, a thermometer
  gB(g, -hx + 0.04, -hx + 0.3, -hy + 0.06, hy - 0.06, 0.72, 0.745, MAT.larch, { cast: false });
  for (const y of [-hy + 0.08, hy - 0.08])
    gB(g, -hx + 0.05, -hx + 0.08, y - 0.015, y + 0.015, 0.42, 0.72, MAT.larch, { cast: false });
  for (let i = 0; i < 5; i++) {
    const y = -0.5 + i * 0.25,
      zs = pot(g, -hx + 0.17, y, 0.745, 0.05, 0.08);
    plant(g, -hx + 0.17, y, zs, 0.1, i % 2 ? 'seedling' : 'herb', R);
  }
  jar(g, -hx + 0.17, 0.62, 0.745, 0.03, 0.09, KM.straw);
  // feat/einrichtung: the seed trays moved here from the wooden house (now an atelier) – on a lower board of the shelf
  gB(g, -hx + 0.04, -hx + 0.3, -hy + 0.08, hy - 0.08, 0.4, 0.42, MAT.larch, { cast: false });
  seedTray(g, -hx + 0.06, -hx + 0.28, -0.6, -0.26, 0.42, R, 3, 4);
  seedTray(g, -hx + 0.06, -hx + 0.28, -0.2, 0.14, 0.42, R, 3, 4);
  seedTray(g, -hx + 0.06, -hx + 0.28, 0.2, 0.54, 0.42, R, 3, 4);
  wateringCan(g, hx - 0.3, 0.12, 0.14, 150, MAT.zinc, 0.85);
  gB(g, -0.2, -0.17, hy - 0.04, hy - 0.035, 1.0, 1.25, KM.porcelain, { cast: false });
  gB(g, -0.19, -0.18, hy - 0.045, hy - 0.04, 1.03, 1.15, KM.red, { cast: false });
  // the door: aluminium frame, one pane; hinged at the west post, opens outwards (north)
  {
    const w = 2 * dy - 0.02,
      h = zd - 0.13,
      lg = new THREE.Group(),
      add = (bw, bh, bd, x, y, z, m) => {
        const me = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
        me.position.set(x, y, z);
        me.castShadow = m !== PANE;
        if (m === PANE) me.renderOrder = 2;
        lg.add(me);
      };
    add(0.035, h, 0.03, 0.0175, h / 2, 0, MAT.alu);
    add(0.035, h, 0.03, w - 0.0175, h / 2, 0, MAT.alu);
    add(w, 0.035, 0.03, w / 2, 0.0175, 0, MAT.alu);
    add(w, 0.035, 0.03, w / 2, h - 0.0175, 0, MAT.alu);
    add(w, 0.025, 0.03, w / 2, h * 0.45, 0, MAT.alu);
    add(w - 0.07, h - 0.07, 0.006, w / 2, h / 2, 0, PANE);
    add(0.02, 0.14, 0.03, w - 0.06, h * 0.52, 0.025, MAT.blacksteel);
    ldoor('greenhouse', b, lg, { lx: hx + 0.01, ly: dy - 0.01, dir: [0, -1], w, sign: 1, z0: 0.13, z1: zd - 0.01 });
  }
  // the roof vent: a pane hinged at the ridge, opened by hand (a hatch for the game: 'Dachfenster öffnen')
  {
    // group origin on the ridge at the hinge, its X along the ridge (local x); the pane runs down the west slope (three −Z) in a sub-group
    const ang = Math.atan2(zr - ze, hy),
      vg = new THREE.Group(),
      sub = new THREE.Group(),
      a = (b.az * Math.PI) / 180,
      wv = vx1 - vx0,
      add = (bw, bh, bd, x, y, z, m) => {
        const me = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
        me.position.set(x, y, z);
        if (m === PANE) me.renderOrder = 2;
        sub.add(me);
      };
    sub.rotation.x = -ang;
    vg.add(sub);
    add(wv, 0.006, vs, wv / 2, 0.016, -vs / 2, PANE);
    add(wv, 0.02, 0.025, wv / 2, 0.016, -vs + 0.0125, MAT.alu);
    add(0.025, 0.02, vs, 0.0125, 0.016, -vs / 2, MAT.alu);
    add(0.025, 0.02, vs, wv - 0.0125, 0.016, -vs / 2, MAT.alu);
    add(0.02, 0.012, 0.12, wv / 2, 0.03, -vs + 0.07, MAT.blacksteel);
    vg.rotation.order = 'YXZ';
    vg.rotation.y = Math.PI / 2 - a;
    const h0 = worldOf(b, vx0, 0),
      inside = worldOf(b, (vx0 + vx1) / 2, 0.15);
    const d = flapDoor('ghvent', vg, {
      hx: h0[0],
      hy: h0[1],
      z: zr + 0.03,
      rot: 'x',
      open: 0.65,
      pos: inside,
      openBox: null,
      label: 'Dachfenster',
    });
    d.z = 0.14; // the action is offered to someone standing in the greenhouse
    d.r = 1.3;
  }
  lwalk(r, -hx + 0.12, hx + 0.05, -0.27, 0.27, 0.14, 'stone');
  lcol(r, -hx - 0.03, hx + 0.03, hy - 0.02, hy + 0.05, 0, 1.4, 'glass');
  lcol(r, -hx - 0.03, hx + 0.03, -hy - 0.05, -hy + 0.02, 0, 1.4, 'glass');
  lcol(r, -hx - 0.05, -hx + 0.02, -hy, hy, 0, 1.4, 'glass');
  lcol(r, hx - 0.02, hx + 0.05, -hy, -dy, 0, 1.4, 'glass');
  lcol(r, hx - 0.02, hx + 0.05, dy, hy, 0, 1.4, 'glass');
  lcol(r, -hx + 0.1, hx - 0.1, -hy + 0.06, -0.27, 0.12, 0.8, 'bed');
  lcol(r, -hx + 0.1, hx - 0.1, 0.27, hy - 0.06, 0.12, 0.8, 'bed');
  lcol(r, -hx, -hx + 0.32, -0.27, 0.27, 0.42, 0.76, 'shelf');
  // pick the ripe tomatoes (the green ones stay)
  const ghIn = (x, y, z) => {
    const a = (b.az * Math.PI) / 180,
      dx = x - b.c[0],
      dy = y - b.c[1];
    return (
      z < 2.5 &&
      Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) < hx + 0.6 &&
      Math.abs(-dx * Math.cos(a) + dy * Math.sin(a)) < hy
    );
  };
  GACTS.push({
    key: 'tomaten',
    b,
    lx: 0.1,
    ly: -0.2,
    z: 0.9,
    r: 1.3,
    room: ghIn,
    label: st => (st.done ? null : 'Tomaten ernten'),
    run: st => {
      st.done = 1;
      KM.tomato.color.set(0x8aa646);
      st.think(
        'Reife Tomaten am Knick über dem Kelch abbrechen – mit Kelch halten sie länger. Die grünen reifen an der Pflanze nach. Eine Schüssel voll!'
      );
      st.dirty();
    },
  });
  // pinch out the side shoots, so the plant puts its strength into the fruit
  GACTS.push({
    key: 'geizen',
    b,
    lx: 0.55,
    ly: -0.35,
    z: 1.1,
    r: 1.3,
    room: ghIn,
    label: st => (st.done ? null : 'Tomaten ausgeizen'),
    run: st => {
      st.done = 1;
      shootM.visible = false;
      st.think(
        'Die Geiztriebe in den Blattachseln mit zwei Fingern ausbrechen, solange sie klein sind – dann geht die Kraft in die Früchte statt in neue Triebe.'
      );
      st.dirty();
    },
  });
  // water the seedlings (the soil in the trays darkens) – feat/einrichtung: moved here from the wooden house
  GACTS.push({
    key: 'giessen',
    b,
    lx: -hx + 0.5,
    ly: 0.0,
    z: 0.6,
    r: 1.0,
    room: ghIn,
    label: st => (st.wet ? null : 'Setzlinge gießen'),
    run: st => {
      st.wet = 1;
      st.think(
        'Mit der feinen Brause gießen, nur auf die Erde, nicht auf die Blättchen – feucht, nicht nass. Sarah wird sich freuen.'
      );
      KM.traySoil.color.copy(MAT.soil.color).multiplyScalar(0.5);
      st.dirty();
    },
  });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: 0, z1: 2.1, name: 'Gewächshaus' });
  FOOT.push({ b, hx: hx + 0.05, hy: hy + 0.05, ox: 0, oy: 0 });
  paletteize(g, [shootM]);
}

const GHB = bldEnd(BLD.greenhouse);
// the roof vent moves with the greenhouse in the plan view (hatches are not moved by bldSet, only their action point)
if (GHB && window.DOORS.ghvent) GHB.root.attach(window.DOORS.ghvent.group);
