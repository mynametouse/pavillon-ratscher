// ===================== Hubert's yard (feat/nachbarn, 23.10.2026, plan: docs/plans/plan_leben.md section 1) =====================
// Falko: "Die Gebäude auf seiner Seite sind nach Osten offene, überdachte Werkstätten, in denen er Werkzeug hat. Er hackt viel Holz, sägt
// Holz klein und stapelt es in kleinen, hohen Trockenhütchen, die er selbst gebaut hat: etwa 1 × 1 m, 2 m hoch, mit kleinen Ziegeldächern."
// Built here (static, before render/zmerge.js, so it is merged): the four buildings of SITE.neigh as workshops open to the east (back wall,
// gable walls, posts and header on the open side, gable roof; inside a workbench, a tool wall, shelves, firewood, tools), the drying huts,
// the wood yard (long logs on sleepers, sawhorse, chopping block, rounds, split wood), table and chairs in front of the workshop and the
// ramp for the car (the car itself: garden/hof_auto.js). HOF holds the places the neighbours' day uses (npc/life.js) and the tasks
// (game/quests.js). Site coordinates: x east, y north, z up (metres).
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { ANISO, patchSV, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, COL, cyl, siteUV } from '../core/geo.js';
import { S0 } from './env.js';
import { placeGLB } from '../pavilion/interior.js';
// own seeded random numbers (core/head.js rnd() is one sequence for the whole scene – using it here would move other modules' trees)
const rand = (
  s => () =>
    ((s = (s * 16807) % 2147483647) - 1) / 2147483646
)(4711);
const rr = (a, b) => a + (b - a) * rand();
// ---- canvas textures: end grain of stacked split wood, the tool wall ----
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
// one metre of stacked split logs seen from the end: quarter and half rounds, light wood, dark gaps, bark rims
const LOGEND = patchSV(
  new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (q, w, h) => {
      q.fillStyle = '#2a1f17';
      q.fillRect(0, 0, w, h);
      const r0 = (
        s => () =>
          ((s = (s * 16807) % 2147483647) - 1) / 2147483646
      )(99);
      for (let row = 0; row < 9; row++)
        for (let col = 0; col < 9; col++) {
          const cx = (col + 0.5 + (row % 2) * 0.5) * (w / 8.6) + (r0() - 0.5) * 6,
            cy = (row + 0.5) * (h / 8.6) + (r0() - 0.5) * 5,
            r = 11 + r0() * 6,
            a0 = r0() * Math.PI * 2,
            kind = r0();
          const l = 0.75 + r0() * 0.3;
          q.fillStyle = `rgb(${(205 * l) | 0},${(160 * l) | 0},${(112 * l) | 0})`;
          q.beginPath();
          if (kind < 0.45) {
            q.moveTo(cx, cy);
            q.arc(cx, cy, r * 1.25, a0, a0 + Math.PI / 2 + r0() * 0.6);
          } else if (kind < 0.85) {
            q.moveTo(cx, cy);
            q.arc(cx, cy, r, a0, a0 + Math.PI);
          } else q.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
          q.closePath();
          q.fill();
          q.strokeStyle = 'rgba(70,45,25,0.55)';
          q.lineWidth = 2;
          q.stroke();
          q.strokeStyle = 'rgba(120,80,45,0.25)';
          q.lineWidth = 1;
          for (let k = 1; k < 4; k++) {
            q.beginPath();
            q.arc(cx, cy, (r * k) / 4, a0, a0 + Math.PI);
            q.stroke();
          }
        }
    }),
    roughness: 0.95,
  })
);
// the tool wall: a board with outlines and tools hanging on nails (saws, hammers, spanners, an axe, pliers, a level)
const TOOLWALL = patchSV(
  new THREE.MeshStandardMaterial({
    map: canvasTex(512, 256, (q, w, h) => {
      q.fillStyle = '#8a7356';
      q.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) {
        q.fillStyle = `rgba(60,40,25,${0.15 + ((x * 7) % 5) * 0.03})`;
        q.fillRect(x, 0, 2, h);
      }
      const tool = (x, y, f) => {
        q.save();
        q.translate(x, y);
        f();
        q.restore();
      };
      const steel = '#9aa1a6',
        dark = '#3b3b3b',
        wood = '#b07a45',
        red = '#a8322a';
      // hand saw
      tool(40, 40, () => {
        q.fillStyle = steel;
        q.beginPath();
        q.moveTo(0, 0);
        q.lineTo(90, 10);
        q.lineTo(90, 40);
        q.lineTo(0, 22);
        q.fill();
        q.fillStyle = wood;
        q.fillRect(-26, -4, 30, 30);
      });
      // bow saw
      tool(170, 30, () => {
        q.strokeStyle = red;
        q.lineWidth = 6;
        q.beginPath();
        q.moveTo(0, 60);
        q.quadraticCurveTo(60, -30, 120, 60);
        q.stroke();
        q.strokeStyle = steel;
        q.lineWidth = 3;
        q.beginPath();
        q.moveTo(0, 60);
        q.lineTo(120, 60);
        q.stroke();
      });
      // hammers and an axe
      for (const [x, s] of [
        [320, 1],
        [350, 0.8],
      ])
        tool(x, 30, () => {
          q.fillStyle = wood;
          q.fillRect(-4 * s, 0, 8 * s, 90 * s);
          q.fillStyle = dark;
          q.fillRect(-16 * s, -6 * s, 32 * s, 14 * s);
        });
      tool(400, 24, () => {
        q.fillStyle = wood;
        q.fillRect(-5, 0, 10, 120);
        q.fillStyle = dark;
        q.beginPath();
        q.moveTo(-6, 0);
        q.lineTo(-34, -8);
        q.lineTo(-38, 26);
        q.lineTo(-6, 18);
        q.fill();
      });
      // spanners in a row
      for (let i = 0; i < 9; i++)
        tool(40 + i * 16, 150, () => {
          q.fillStyle = steel;
          q.fillRect(-3, 0, 6, 50 + i * 4);
          q.beginPath();
          q.arc(0, 0, 7, 0, Math.PI * 2);
          q.arc(0, 50 + i * 4, 6, 0, Math.PI * 2);
          q.fill();
        });
      // pliers, screwdrivers, a level, a coil of wire
      for (let i = 0; i < 5; i++)
        tool(220 + i * 14, 150, () => {
          q.fillStyle = [red, '#2d5fa8', '#e0b020', red, dark][i];
          q.fillRect(-4, 0, 8, 26);
          q.fillStyle = steel;
          q.fillRect(-1.5, 26, 3, 34);
        });
      tool(310, 150, () => {
        q.fillStyle = '#d9b31f';
        q.fillRect(0, 0, 130, 16);
        q.fillStyle = '#4fae5a';
        q.fillRect(58, 4, 14, 8);
      });
      tool(360, 200, () => {
        q.strokeStyle = '#7a6a52';
        q.lineWidth = 4;
        for (let k = 0; k < 4; k++) {
          q.beginPath();
          q.arc(0, 0, 18 + k * 3, 0, Math.PI * 2);
          q.stroke();
        }
      });
      // soft dirt
      for (let i = 0; i < 300; i++) {
        q.fillStyle = `rgba(40,30,20,${Math.random() * 0.08})`;
        q.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 8, 2 + Math.random() * 6);
      }
    }),
    roughness: 0.9,
  })
);
const OILCAN = plain({ color: 0x2f5d3a, roughness: 0.45, metalness: 0.4 });
const TYRE = plain({ color: 0x1c1c1c, roughness: 0.9 });
const SACK = plain({ color: 0xc9b48a, roughness: 1 });
const DRUM = plain({ color: 0x2f4f86, roughness: 0.5, metalness: 0.3 });
const BARROW = plain({ color: 0x4f7a45, roughness: 0.55, metalness: 0.3 });
const CRATE = plain({ color: 0x9a6b3d, roughness: 0.9 });
const SPLIT = plain({ color: 0xd8b98e, roughness: 0.85 });
// ---- local-frame boxes for the turned buildings: lx along the building's across axis (east), ly along its length (north), z up ----
function lbox(g, sx, sy, sz, m, x, y, z, o = {}) {
  const geo = new THREE.BoxGeometry(sx, sz, sy);
  siteUV(geo, x, y, z, o.grain || (sz >= sx && sz >= sy ? 'z' : sx >= sy ? 'x' : 'y'), [sx, sy]);
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, z, -y);
  if (o.rz) me.rotation.z = o.rz;
  me.castShadow = o.cast ?? true;
  me.receiveShadow = true;
  g.add(me);
  return me;
}
// colliders of a wall from a to b (site), split into pieces so the axis-aligned boxes stay close to a slanted wall
function colWall(a, b, t, z0, z1, tag = 'wall') {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    n = Math.max(1, Math.ceil(L / 1.0));
  for (let i = 0; i < n; i++) {
    const p = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n],
      q = [a[0] + ((b[0] - a[0]) * (i + 1)) / n, a[1] + ((b[1] - a[1]) * (i + 1)) / n];
    COL.push([
      Math.min(p[0], q[0]) - t / 2,
      Math.max(p[0], q[0]) + t / 2,
      Math.min(p[1], q[1]) - t / 2,
      Math.max(p[1], q[1]) + t / 2,
      z0,
      z1,
      tag,
      null,
      null,
    ]);
  }
}
// ---------------- the workshops: the four buildings on Hubert's side, open to the east ----------------
const ROOFS = [MAT.fibre, MAT.roofRed, MAT.corr, MAT.roofRed];
export const SHEDS = [];
function workshop(r, i) {
  const p0 = r[0],
    p1 = r[1],
    p3 = r[3];
  let ux = p1[0] - p0[0],
    uy = p1[1] - p0[1];
  const Wf = Math.hypot(ux, uy);
  ux /= Wf;
  uy /= Wf;
  const vx = -uy,
    vy = ux,
    L = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]),
    c = [(r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2],
    D = Wf * 0.8,
    he = 2.9,
    hr = 1.45,
    t = 0.12;
  const at = (lu, lv) => [c[0] + lu * ux + lv * vx, c[1] + lu * uy + lv * vy];
  const g = new THREE.Group();
  g.position.copy(V(c[0], c[1], 0));
  g.rotation.y = Math.atan2(uy, ux);
  scene.add(g);
  const wallM = MAT.weather;
  // floor, back wall, gable walls with their triangles
  lbox(g, D, L, 0.06, MAT.conc, 0, 0, 0.03, { cast: false });
  lbox(g, t, L + t, he, wallM, -D / 2 + t / 2, 0, he / 2);
  for (const s of [-1, 1]) {
    lbox(g, D, t, he, wallM, 0, s * (L / 2 - t / 2), he / 2);
    const sh = new THREE.Shape();
    sh.moveTo(-D / 2, 0);
    sh.lineTo(0, hr);
    sh.lineTo(D / 2, 0);
    sh.closePath();
    const eg = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
    const m = new THREE.Mesh(eg, wallM);
    m.position.set(0, he, s > 0 ? -L / 2 : L / 2 - t); // spans the gable wall's thickness (three z = −ly)
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  // the open side: posts, header, a brace at each post
  const np = Math.max(2, Math.round(L / 3.2));
  for (let k = 0; k <= np; k++) {
    const lv = -L / 2 + 0.1 + ((L - 0.2) * k) / np;
    lbox(g, 0.14, 0.14, he, MAT.kvh, D / 2 - 0.07, lv, he / 2, { grain: 'z' });
    const [px, py] = at(D / 2 - 0.07, lv);
    COL.push([px - 0.1, px + 0.1, py - 0.1, py + 0.1, 0, he, 'post', null, null]);
  }
  lbox(g, 0.16, L, 0.22, MAT.kvh, D / 2 - 0.07, 0, he - 0.11, { grain: 'y' });
  // roof: two slopes with an overhang, ridge board
  const ov = 0.45,
    run = D / 2 + ov,
    ang = Math.atan2(hr, D / 2),
    sl = run / Math.cos(ang);
  for (const s of [-1, 1]) {
    const geo = new THREE.BoxGeometry(sl, 0.06, L + 0.6);
    const p = geo.attributes.position,
      uv = geo.attributes.uv,
      nn = geo.attributes.normal;
    for (let k = 0; k < p.count; k++) {
      const ay = Math.abs(nn.getY(k));
      uv.setXY(k, ay > 0.5 ? p.getZ(k) : p.getX(k), ay > 0.5 ? p.getX(k) * s : p.getY(k));
    }
    const m = new THREE.Mesh(geo, ROOFS[i % 4]);
    // centre of the slope between the ridge and the eave edge (overhang ov beyond the wall line), just above the walls
    m.position.set(s * (D / 4 + ov / 2), he + (D / 4 - ov / 2) * Math.tan(ang) + 0.04, 0);
    m.rotation.z = -s * ang;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  lbox(g, 0.22, L + 0.6, 0.08, MAT.zinc, 0, 0, he + hr + 0.06, { grain: 'y' });
  colWall(at(-D / 2 + t / 2, -L / 2), at(-D / 2 + t / 2, L / 2), t + 0.1, 0, he);
  for (const s of [-1, 1]) colWall(at(-D / 2, s * (L / 2 - t / 2)), at(D / 2, s * (L / 2 - t / 2)), t + 0.1, 0, he);
  COL.push([
    ...bboxOf([at(-D / 2, -L / 2), at(D / 2, -L / 2), at(D / 2, L / 2), at(-D / 2, L / 2)]),
    he - 0.2,
    he + hr + 0.3,
    'roof',
    null,
    null,
  ]);
  // inside: workbench with the tool wall over it along the back wall, shelves on a gable wall, firewood on the other
  const benchL = Math.min(3.2, L * 0.38),
    bv = i % 2 ? -L / 2 + 0.6 + benchL / 2 : L / 2 - 0.6 - benchL / 2,
    bu = -D / 2 + t + 0.36;
  lbox(g, 0.7, benchL, 0.07, MAT.oak, bu, bv, 0.86);
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      lbox(g, 0.07, 0.07, 0.83, MAT.kvh, bu + a * 0.28, bv + b * (benchL / 2 - 0.08), 0.415, { grain: 'z' });
  lbox(g, 0.6, benchL - 0.2, 0.03, MAT.plank, bu, bv, 0.22, { cast: false });
  {
    const tw = new THREE.Mesh(new THREE.PlaneGeometry(benchL, 1.0), TOOLWALL);
    tw.position.set(-D / 2 + t + 0.012, 1.55, -bv);
    tw.rotation.y = Math.PI / 2;
    tw.receiveShadow = true;
    g.add(tw);
  }
  const [bx, by] = at(bu, bv);
  COL.push([...bboxOf([at(bu - 0.35, bv - benchL / 2), at(bu + 0.35, bv + benchL / 2)]), 0, 0.9, 'furn', null, null]);
  // shelves: three boards with crates and oil cans
  const sv = i % 2 ? L / 2 - t - 0.25 : -L / 2 + t + 0.25,
    sL = Math.min(2.6, D * 0.45);
  for (const z of [0.45, 1.05, 1.65]) {
    lbox(g, sL, 0.42, 0.03, MAT.plank, -D / 2 + t + 0.1 + sL / 2, sv, z, { grain: 'x' });
    for (let k = 0; k < 4; k++) {
      const w = rr(0.25, 0.42),
        h = rr(0.18, 0.34),
        lu = -D / 2 + t + 0.25 + k * (sL / 4);
      if (rand() < 0.25) continue;
      lbox(g, w, 0.32, h, rand() < 0.5 ? CRATE : OILCAN, lu, sv, z + 0.015 + h / 2);
    }
  }
  for (const a of [0, 1]) lbox(g, 0.05, 0.42, 1.75, MAT.kvh, -D / 2 + t + 0.1 + a * sL, sv, 0.875, { grain: 'z' });
  colWall(at(-D / 2 + t + 0.1, sv), at(-D / 2 + t + 0.1 + sL, sv), 0.5, 0, 1.8, 'furn');
  // firewood along the other gable wall (end grain to the open side)
  const fv = -sv * 0.97,
    fL = D * 0.55,
    fh = i === 0 ? 1.8 : 1.35;
  const fw = lbox(g, fL, 0.5, fh, MAT.logs, -D / 2 + t + 0.05 + fL / 2, fv, fh / 2);
  fw.material = [MAT.logs, MAT.logs, MAT.logs, MAT.logs, LOGEND, LOGEND]; // logs lie across: end grain towards the room
  colWall(at(-D / 2 + t, fv), at(-D / 2 + t + fL, fv), 0.6, 0, fh, 'wood');
  // more of a working man's shed: boards on bearers along the back wall, and in each building something of its own
  const mid = (i % 2 ? 1 : -1) * 0.6,
    bL = Math.min(3.8, L * 0.3);
  for (const k of [-1, 0, 1]) lbox(g, 0.75, 0.1, 0.32, MAT.kvh, -D / 2 + t + 0.45, mid + k * (bL / 2 - 0.15), 0.16);
  lbox(g, 0.7, bL, 0.36, MAT.plank, -D / 2 + t + 0.45, mid, 0.5, { grain: 'y' });
  colWall(at(-D / 2 + t + 0.45, mid - bL / 2), at(-D / 2 + t + 0.45, mid + bL / 2), 0.8, 0, 0.7, 'furn');
  const lcyl = (r, h, m, x, y, z, o = {}) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, o.r2 ?? r, h, o.seg || 14), m);
    me.position.set(x, z, -y);
    if (o.rx) me.rotation.x = o.rx;
    if (o.rz) me.rotation.z = o.rz;
    me.castShadow = me.receiveShadow = true;
    g.add(me);
    return me;
  };
  if (i === 0) {
    // an old single-axle trailer, drawbar to the open side
    const tl = 0.4,
      tv = -0.8;
    lbox(g, 1.6, 2.7, 0.06, MAT.weather, tl, tv, 0.6, { grain: 'y' });
    for (const s of [-1, 1]) {
      lbox(g, 0.05, 2.7, 0.42, MAT.weather, tl + s * 0.78, tv, 0.84, { grain: 'y' });
      lbox(g, 1.6, 0.05, 0.42, MAT.weather, tl, tv + s * 1.33, 0.84, { grain: 'x' });
      lcyl(0.33, 0.18, TYRE, tl + s * 0.95, tv, 0.33, { rz: Math.PI / 2, seg: 16 });
    }
    lbox(g, 1.4, 0.08, 0.08, MAT.black, tl + 1.45, tv, 0.45, { grain: 'x' });
    COL.push([...bboxOf([at(tl - 1.1, tv - 1.4), at(tl + 2.2, tv + 1.4)]), 0, 1.1, 'furn', null, null]);
  } else if (i === 1) {
    // sacks and a wheelbarrow
    for (let k = 0; k < 3; k++)
      lbox(g, 0.42, 0.62, 0.3, SACK, -D / 2 + t + 1.4, mid + bL / 2 + 0.6 + k * 0.5, 0.15 + (k === 1 ? 0.28 : 0), {
        r: 0,
      });
    barrow(0.9, mid - 0.4);
  } else if (i === 2) {
    // an anvil on an oak stump, a wheelbarrow
    lcyl(0.24, 0.62, MAT.logs, 0.2, mid + 1.6, 0.31, { r2: 0.27 });
    lbox(g, 0.18, 0.5, 0.2, MAT.black, 0.2, mid + 1.6, 0.72);
    barrow(1.3, mid - 1.4);
  } else {
    // oil drums and a stack of tyres in the car workshop
    for (const k of [0, 1]) lcyl(0.29, 0.88, DRUM, D / 2 - 1.0 - k * 0.62, L / 2 - 0.9, 0.44, { seg: 16 });
    for (let k = 0; k < 4; k++) lcyl(0.32, 0.2, TYRE, -0.6, L / 2 - 1.3, 0.1 + k * 0.205, { seg: 16 });
  }
  function barrow(lu, lv) {
    lbox(g, 0.62, 0.85, 0.28, BARROW, lu, lv, 0.52);
    lcyl(0.18, 0.08, TYRE, lu, lv + 0.62, 0.18, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) lbox(g, 0.04, 1.3, 0.04, MAT.black, lu + s * 0.26, lv - 0.15, 0.5);
  }
  SHEDS.push({ c, u: [ux, uy], v: [vx, vy], D, L, he, at, bench: [bx, by] });
}
function bboxOf(pts) {
  const xs = pts.map(p => p[0]),
    ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}
S0.neigh.forEach(workshop);
// tools and things in the workshops (glTF, shared with the rest of the scene)
{
  const s3 = SHEDS[2],
    s4 = SHEDS[3],
    s2 = SHEDS[1],
    s1 = SHEDS[0];
  const az = s => (Math.atan2(s.u[1], s.u[0]) * 180) / Math.PI; // the building's across axis as a turn about the vertical
  const put = (id, s, lu, lv, z, face, o = {}) => {
    const [x, y] = s.at(lu, lv);
    placeGLB(id, Object.assign({ x, y, z, face: face + az(s) }, o));
  };
  if (s3) {
    put('vice', s3, -s3.D / 2 + 0.5, s3.L / 2 - 1.6, 0.9, 90, { col: false });
    put('toolchest', s3, -s3.D / 2 + 0.55, -s3.L / 2 + 2.4, 0.06, 90);
    put('ladder', s3, -s3.D / 2 + 0.25, 2.2, 0.06, 90, { col: false });
  }
  if (s4) {
    put('tyre_old', s4, -1.0, -s4.L / 2 + 1.3, 0.06, 0, { col: false });
    put('tyre_old', s4, -0.4, -s4.L / 2 + 1.0, 0.06, 30, { col: false });
    put('toolchest', s4, -s4.D / 2 + 0.55, s4.L / 2 - 2.6, 0.06, 90);
    put('jerrycan', s4, s4.D / 2 - 0.8, -s4.L / 2 + 0.6, 0.06, 70);
  }
  if (s2) put('rain_barrel', s2, s2.D / 2 + 0.5, -s2.L / 2 + 0.6, 0, 0);
  if (s1) put('crate', s1, 0.2, s1.L / 2 - 1.2, 0.06, 15, { col: false });
}
// ---------------- the yard: places used by the neighbours' day (npc/life.js) and the tasks (game/quests.js) ----------------
export const HOF = {
  block: [-17.3, 10.3], // chopping block (top 0.5 m)
  rounds: [-18.7, 11.5], // sawn rounds waiting to be split
  heap: [-16.1, 9.2], // split wood
  horse: [-19.6, 14.2], // sawhorse with a log, long logs behind it
  huts: [], // drying huts: { x, y, fill } (front to the east)
  table: [-19.4, -5.8],
  chairs: [], // { x, y, az } (az: the way the sitter looks, compass degrees)
  car: { x: -17.4, y: -16.2, az: 0 }, // Hubert's estate on its ramp (garden/hof_auto.js), heading north
  bench: [-13.25, -0.1],
  shed: SHEDS[2] ? SHEDS[2].bench : [-26, 1],
  carShed: SHEDS[3] ? SHEDS[3].bench : [-24, -14],
};
window.HOF = HOF;
// ---- drying huts ("Trockenhütchen"): 1 × 1 m, 2 m high, slatted back and sides, a little tiled gable roof; open front shows the wood ----
const HUT_N = 6;
for (let k = 0; k < HUT_N; k++) {
  const x = -20.3,
    y = 0.4 + k * 1.45,
    fill = [1, 1, 0.92, 1, 0.45, 0.1][k];
  HOF.huts.push({ x, y, fill, front: [x + 0.85, y] });
  const x0 = x - 0.5,
    x1 = x + 0.5,
    y0 = y - 0.5,
    y1 = y + 0.5;
  B(x0 + 0.02, x1 - 0.02, y0 + 0.02, y1 - 0.02, 0, 0.12, MAT.plank, { col: false, grain: 'y' }); // pallet floor
  for (const [px, py] of [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ])
    B(px - 0.035, px + 0.035, py - 0.035, py + 0.035, 0, 1.86, MAT.kvh, { col: false, grain: 'z' });
  // slats outside the posts: back (west) and both sides, gaps for the air
  for (let z = 0.2; z < 1.8; z += 0.13) {
    B(x0 - 0.06, x0 - 0.035, y0 - 0.06, y1 + 0.06, z, z + 0.085, MAT.weather, { col: false, grain: 'y' });
    B(x0 - 0.035, x1 + 0.035, y0 - 0.06, y0 - 0.035, z, z + 0.085, MAT.weather, { col: false, grain: 'x' });
    B(x0 - 0.035, x1 + 0.035, y1 + 0.035, y1 + 0.06, z, z + 0.085, MAT.weather, { col: false, grain: 'x' });
  }
  // the little tiled roof: ridge from front to back, 38°
  const half = 0.62,
    ang = (38 * Math.PI) / 180,
    sl = half / Math.cos(ang);
  for (const s of [-1, 1]) {
    const geo = new THREE.BoxGeometry(1.32, 0.04, sl);
    const p = geo.attributes.position,
      uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + x, p.getZ(i) * s + k * 0.37);
    const m = new THREE.Mesh(geo, MAT.roofRed);
    m.position.copy(V(x, y + (s * half) / 2, 1.86 + (half * Math.tan(ang)) / 2 + 0.02));
    m.rotation.x = -s * ang; // the north slope (s = 1) falls to the north (three −z)
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  beam(
    [x - 0.68, y, 1.86 + half * Math.tan(ang) + 0.03],
    [x + 0.68, y, 1.86 + half * Math.tan(ang) + 0.03],
    0.09,
    0.07,
    MAT.roofRed
  );
  for (const s of [-1, 1])
    B(x - 0.04 + s * 0.52, x + 0.04 + s * 0.52, y - 0.5, y + 0.5, 1.8, 1.88, MAT.kvh, { col: false });
  COL.push([x0 - 0.06, x1 + 0.02, y0 - 0.05, y1 + 0.05, 0, 2.3, 'hut', null, null]);
  // the stacked wood (the hut being filled: its stack is its own mesh, npc/life.js and the task change its height)
  const h = 1.62 * fill;
  if (h > 0.02) {
    const geo = new THREE.BoxGeometry(0.9, 1, 0.9);
    geo.translate(0, 0.5, 0);
    stackUV(geo, h, k);
    const st = new THREE.Mesh(geo, [LOGEND, LOGEND, SPLIT, MAT.logs, MAT.logs, MAT.logs]);
    st.position.copy(V(x + 0.02, y, 0.12));
    st.scale.y = h;
    st.castShadow = st.receiveShadow = true;
    if (k === 4) {
      st.userData.noMerge = true;
      HOF.stack = st; // the hut Hubert (and the task) fills
      HOF.stackHut = k;
    }
    scene.add(st);
  }
}
// uv of a stack of height h (the geometry is one metre high and scaled): end grain in metres, so a lower stack shows fewer rows, not squashed ones
function stackUV(geo, h, k) {
  const p = geo.attributes.position,
    uv = geo.attributes.uv,
    nn = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nn.getX(i)) > 0.5;
    uv.setXY(i, ax ? p.getZ(i) + k * 0.31 : p.getX(i), p.getY(i) * h);
  }
  uv.needsUpdate = true;
}
HOF.fillHut = f => {
  const hut = HOF.huts[HOF.stackHut];
  if (!hut || !HOF.stack) return;
  hut.fill = Math.max(0.05, Math.min(1, f));
  HOF.stack.scale.y = 1.62 * hut.fill;
  stackUV(HOF.stack.geometry, HOF.stack.scale.y, HOF.stackHut);
};
// ---- the wood yard: long logs on sleepers, a sawhorse with a log, the chopping block, rounds and split wood ----
{
  const [hx, hy] = HOF.horse;
  for (const y of [hy + 3.2, hy + 4.8])
    B(hx - 2.6, hx + 2.4, y - 0.09, y + 0.09, 0, 0.14, MAT.kvh, { col: false, grain: 'x' });
  [
    [hy + 3.55, 0.2],
    [hy + 4.05, 0.17],
    [hy + 4.45, 0.22],
    [hy + 3.85, 0.16],
  ].forEach(([y, r], k) => {
    const z = 0.14 + r + (k === 3 ? 0.3 : 0),
      m = cyl(hx - 0.1, y, -2.1, 2.1, r, MAT.logs, 14, r * 0.92, { col: false });
    m.rotation.set(0, 0, Math.PI / 2);
    m.position.copy(V(hx - 0.1, y, z));
  });
  COL.push([hx - 2.3, hx + 2.1, hy + 3.1, hy + 4.9, 0, 0.8, 'wood', null, null]);
  // sawhorse: two crossed pairs of legs, a log lying in the crosses
  for (const dx of [-0.45, 0.45])
    for (const s of [-1, 1]) beam([hx + dx, hy - s * 0.42, 0], [hx + dx, hy + s * 0.18, 0.95], 0.07, 0.07, MAT.kvh);
  beam([hx - 0.5, hy - 0.12, 0.35], [hx + 0.5, hy - 0.12, 0.35], 0.05, 0.08, MAT.kvh);
  {
    const m = cyl(hx, hy, 0, 2.4, 0.15, MAT.logs, 14, 0.14, { col: false });
    m.rotation.set(0, 0, Math.PI / 2);
    m.position.copy(V(hx + 0.3, hy, 0.94)); // lies in the crosses of the legs
  }
  COL.push([hx - 0.6, hx + 0.6, hy - 0.5, hy + 0.3, 0, 1.0, 'furn', null, null]);
  // chopping block (an old oak round), sawn rounds, split wood
  const [kx, ky] = HOF.block;
  cyl(kx, ky, 0, 0.5, 0.29, MAT.logs, 16, 0.31, { col: false });
  {
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.285, 16), MAT.logEnd);
    top.rotation.x = -Math.PI / 2;
    top.position.copy(V(kx, ky, 0.502));
    top.receiveShadow = true;
    scene.add(top);
  }
  COL.push([kx - 0.3, kx + 0.3, ky - 0.3, ky + 0.3, 0, 0.5, 'block', null, null]);
  const [rx, ry] = HOF.rounds;
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4,
      d = k < 6 ? 0.42 : 0.2,
      x = rx + Math.cos(a) * d,
      y = ry + Math.sin(a) * d,
      z = k < 6 ? 0 : 0.33,
      r = rr(0.13, 0.19);
    cyl(x, y, z, z + 0.33, r, MAT.logs, 12, r, { col: false });
    const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.97, 12), MAT.logEnd);
    top.rotation.x = -Math.PI / 2;
    top.position.copy(V(x, y, z + 0.333));
    scene.add(top);
  }
  COL.push([rx - 0.65, rx + 0.65, ry - 0.65, ry + 0.65, 0, 0.66, 'wood', null, null]);
  // the heap of split wood: wedge-shaped pieces in a loose mound
  const [sx, sy] = HOF.heap;
  const piece = new THREE.CylinderGeometry(0.1, 0.1, 0.34, 3); // a split piece: a three-sided billet
  const SPLIT2 = plain({ color: 0xb8956a, roughness: 0.9 });
  for (let k = 0; k < 40; k++) {
    const a = rand() * Math.PI * 2,
      d = Math.sqrt(rand()) * 0.6,
      x = sx + Math.cos(a) * d,
      y = sy + Math.sin(a) * d * 0.8,
      z = 0.06 + (0.6 - d) * 0.55 * rand();
    const m = new THREE.Mesh(piece, [k % 3 === 0 ? MAT.logs : k % 3 === 1 ? SPLIT2 : SPLIT, MAT.logEnd, MAT.logEnd]);
    m.position.copy(V(x, y, z));
    m.rotation.set(Math.PI / 2 + rr(-0.4, 0.4), rr(0, 6.3), rr(-0.3, 0.3));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  COL.push([sx - 0.5, sx + 0.5, sy - 0.45, sy + 0.45, 0, 0.4, 'wood', null, null]);
}
// ---- table and two chairs in front of the workshop (Hubert and Ronald sit here and talk about the village) ----
{
  const [tx, ty] = HOF.table;
  B(tx - 0.55, tx + 0.55, ty - 0.4, ty + 0.4, 0.72, 0.76, MAT.weather, { col: false, grain: 'x' });
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      B(tx + a * 0.48 - 0.03, tx + a * 0.48 + 0.03, ty + b * 0.32 - 0.03, ty + b * 0.32 + 0.03, 0, 0.72, MAT.kvh, {
        col: false,
        grain: 'z',
      });
  COL.push([tx - 0.56, tx + 0.56, ty - 0.41, ty + 0.41, 0, 0.76, 'furn', null, null]);
  // chairs north and south of the table, facing each other (seen from the garden both are in profile)
  for (const s of [-1, 1]) {
    const cx = tx + s * 0.12,
      cy = ty + s * 0.78,
      az = s > 0 ? 180 : 0;
    B(cx - 0.22, cx + 0.22, cy - 0.21, cy + 0.21, 0.42, 0.46, MAT.weather, { col: false, grain: 'x' });
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        B(
          cx + a * 0.19 - 0.022,
          cx + a * 0.19 + 0.022,
          cy + b * 0.18 - 0.022,
          cy + b * 0.18 + 0.022,
          0,
          0.42,
          MAT.kvh,
          { col: false, grain: 'z' }
        );
    const by = cy + s * 0.2;
    for (const a of [-1, 1])
      B(cx + a * 0.19 - 0.022, cx + a * 0.19 + 0.022, by - 0.022, by + 0.022, 0.46, 0.92, MAT.kvh, {
        col: false,
        grain: 'z',
      });
    for (const z of [0.62, 0.8])
      B(cx - 0.21, cx + 0.21, by - 0.015, by + 0.015, z, z + 0.08, MAT.weather, { col: false, grain: 'x' });
    HOF.chairs.push({ x: cx, y: cy - s * 0.04, az, seat: 0.46 });
  }
  // a beer crate as a side table, two bottles
  B(tx + 0.75, tx + 1.15, ty - 0.2, ty + 0.1, 0, 0.3, plain({ color: 0x2f5a2c, roughness: 0.6 }), { col: true });
}
// ---- the car's ramp: two self-built ramps of stacked squared timber under the front wheels ----
// the car (garden/hof_auto.js): wheelbase 2.75 m, front axle 1.47 m ahead of its centre; the flat tops are centred under the front axle
export const RAMP = { h: 0.32, ax: HOF.car.y + 1.47 };
RAMP.y0 = RAMP.ax - 0.55;
RAMP.y1 = RAMP.ax + 0.55;
{
  const { x } = HOF.car,
    track = 1.52;
  for (const s of [-1, 1]) {
    const cx = x + (s * track) / 2;
    for (let k = 0; k < 4; k++) {
      const z0 = k * 0.08;
      B(cx - 0.19, cx + 0.19, RAMP.y0 - 0.1 + k * 0.02, RAMP.y1 + 0.15, z0, z0 + 0.08, MAT.kvh, {
        col: false,
        grain: 'y',
      });
    }
    // the wedge: a slanted plank on two blocks
    const L = 1.1,
      ang = Math.atan2(RAMP.h, L);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, Math.hypot(L, RAMP.h)), MAT.weather);
    m.position.copy(V(cx, RAMP.y0 - L / 2, RAMP.h / 2));
    m.rotation.x = ang; // rises towards the north (the plank's long axis is three z = south)
    m.castShadow = m.receiveShadow = true;
    siteUV(m.geometry, cx, RAMP.y0 - L / 2, RAMP.h / 2, 'y');
    scene.add(m);
    B(cx - 0.15, cx + 0.15, RAMP.y0 - 0.5, RAMP.y0 - 0.2, 0, 0.14, MAT.conc, { col: false });
  }
}
// ---- worn ground: wood chips round the chopping block and under the sawhorse, bare earth under the car ----
{
  const flat = { roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  const CHIPS = patchSV(
    new THREE.MeshStandardMaterial(
      Object.assign(
        {
          map: canvasTex(256, 256, (q, w, h) => {
            const r0 = (
              s => () =>
                ((s = (s * 16807) % 2147483647) - 1) / 2147483646
            )(7);
            q.fillStyle = '#6b583f';
            q.fillRect(0, 0, w, h);
            for (let i = 0; i < 1600; i++) {
              const l = 0.6 + r0() * 0.7;
              q.fillStyle = `rgba(${(205 * l) | 0},${(165 * l) | 0},${(115 * l) | 0},${0.35 + r0() * 0.5})`;
              q.save();
              q.translate(r0() * w, r0() * h);
              q.rotate(r0() * 3.14);
              q.fillRect(-3, -1, 4 + r0() * 8, 1.5 + r0() * 2.5);
              q.restore();
            }
          }),
        },
        flat
      )
    )
  );
  const EARTH = plain(Object.assign({ color: 0x5c4b3a }, flat));
  const patch = (cx, cy, r, m, seed, sx = 1) => {
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2,
        k = r * (0.8 + 0.14 * Math.sin(i * 2.7 + seed) + 0.08 * Math.sin(i * 5.3 + seed * 2));
      pts.push(new THREE.Vector2(Math.cos(a) * k * sx, Math.sin(a) * k));
    }
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
    geo.rotateX(-Math.PI / 2);
    const me = new THREE.Mesh(geo, m);
    me.position.copy(V(cx, cy, 0.006));
    me.receiveShadow = true;
    scene.add(me);
  };
  patch(HOF.block[0] - 0.3, HOF.block[1] + 0.3, 2.0, CHIPS, 1);
  patch(HOF.horse[0], HOF.horse[1] + 0.2, 1.4, CHIPS, 2);
  patch(HOF.car.x, HOF.car.y + 0.4, 3.1, EARTH, 3, 0.55);
}
