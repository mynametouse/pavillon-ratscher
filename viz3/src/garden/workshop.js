// ---------- Klingenholz wood workshop at the south boundary, chain-link fence towards Ronald ----------
// Workshop 10 × 4 m: timber frame (KVH 12/12 posts on point footings, plates, tie beams, knee braces), gable roof 25° with dark bitumen
// shingles, only the back wall to the south boarded; floor of concrete pavers. Band sawmill for logs along the open north side, drum sander and
// planer (power from a petrol generator outside the east end), two carpenter's benches and a tool wall along the south wall, a rack of glued
// panels, sawn boards with stickers, finished end-grain boards. Logs are stored to the right (west), seen from the garden.
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { rnd, rr, scene, V } from '../core/head.js';
import { ANISO, grime, markDirty, patchSV, pbrMat, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, bldBegin, bldEnd, BUILD, COL, cyl, DOORS, phase, RB, tagPh, WALK } from '../core/geo.js';
import { placeGLB } from '../pavilion/interior.js';
import { boardMat } from './site_base.js';
phase(null);
export const WORKS = {
  machines: [],
  update: null,
  px: -1.5,
  py: -38.725,
  cut: { tablesaw: 0, thick: 0, sander: 0 },
  orbit: 0,
};
bldBegin('werkstatt', 'Werkstatt Klingenholz', [-1.5, -38.725], {
  short: 'Werkstatt',
  rects: [
    { c: [-1.05, -38.725], az: 90, hx: 5.9, hy: 2.3 },
    { c: [-8.9, -38.7], az: 90, hx: 1.95, hy: 1.75 },
    { c: [-1.5, -31.35], az: 0, hx: 3.6, hy: 1.2 },
  ],
});
// Falko, 29.10.2026: construction phase 0 shows the garden as it is today – there the workshop is an open lean-to with a table saw and a
// workbench (photos of 26.10.2026); this hall with the band sawmill, the machines and the log yard comes with phase 1 (SAW_PH)
export const SAW_PH = 1;
phase(SAW_PH);
const C0 = COL.length,
  W0 = WALK.length,
  N0 = scene.children.length;
{
  const X0 = -6.6,
    X1 = 3.6,
    YB = -40.6,
    YF = -36.85,
    YR = (YB + YF) / 2,
    ZP = 2.45,
    ZT = 2.61,
    PITCH = (25 * Math.PI) / 180,
    OVE = 0.4,
    OVG = 0.35;
  const ZR = ZT + (YF - YR) * Math.tan(PITCH),
    PX = [-6.4, -4.44, -2.48, -0.52, 1.44, 3.4];
  const shingleDark = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const q = c.getContext('2d'),
      px = 512; // 1 m: rectangular three-tab bitumen shingles, anthracite with granules
    q.fillStyle = '#1b1c1d';
    q.fillRect(0, 0, px, px);
    const rowH = 0.143 * px,
      tw = 0.333 * px;
    let row = 0;
    for (let y = 0; y < px; y += rowH, row++) {
      const off = ((row % 2) * tw) / 2;
      for (let x = -tw; x < px + tw; x += tw) {
        const g = 0.82 + rnd() * 0.3;
        q.fillStyle = `rgb(${Math.round(52 * g)},${Math.round(54 * g)},${Math.round(56 * g)})`;
        q.fillRect(x + off + 2, y + 2, tw - 4, rowH - 3);
        q.fillStyle = 'rgba(0,0,0,0.55)';
        q.fillRect(x + off, y + rowH - 4, tw, 4);
        q.fillRect(x + off + tw - 2, y, 2, rowH);
      }
    }
    for (let i = 0; i < 26000; i++) {
      const v = rnd() > 0.5 ? 255 : 0;
      q.fillStyle = `rgba(${v},${v},${v},${rnd() * 0.12})`;
      q.fillRect(rnd() * px, rnd() * px, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return t;
  })();
  const M = {
    shingle: patchSV(
      new THREE.MeshStandardMaterial({ map: shingleDark, roughness: 0.92, metalness: 0, envMapIntensity: 0.55 })
    ),
    boards: boardMat(0x6e5a45, 0.14, true, { wear: 0.16, photo: 'weatherwood' }),
    gable: boardMat(0x76604a, 0.14, true, { wear: 0.12, photo: 'weatherwood' }),
    fascia: plain({ color: 0x2c2620, roughness: 0.8 }),
    pavers: pbrMat('pavers', { fallback: 0x9c968a, nrm: 0.9, rough: 1.1 }),
    foot: MAT.conc,
    beech: pbrMat('oak', { fallback: 0xd9b48a, color: 0xf2d6b0, nrm: 0.4, rough: 0.8 }),
    oil: pbrMat('oak', { fallback: 0x8a5a36, color: 0xb98458, nrm: 0.4, rough: 0.55 }),
    walnut: pbrMat('oak', { fallback: 0x5b3b26, color: 0x7a5236, nrm: 0.4, rough: 0.6 }),
    ash: pbrMat('larch', { fallback: 0xd8c3a0, color: 0xf3e6cc, nrm: 0.4, rough: 0.75 }),
    fresh: pbrMat('larch', { fallback: 0xe0c49a, color: 0xfff0d6, nrm: 0.5, rough: 0.9 }),
    steel: plain({ color: 0x8b9196, metalness: 0.75, roughness: 0.38 }),
    dark: plain({ color: 0x2a2d30, metalness: 0.4, roughness: 0.55 }),
    blade: plain({ color: 0xd9dde0, metalness: 1, roughness: 0.2 }),
    orange: plain({ color: 0xc8571d, metalness: 0.15, roughness: 0.42 }),
    red: plain({ color: 0xa3241c, metalness: 0.2, roughness: 0.45 }),
    black: plain({ color: 0x151617, roughness: 0.6 }),
    machine: plain({ color: 0x4a5f6e, metalness: 0.25, roughness: 0.48 }),
    machineL: plain({ color: 0xb7bfc4, metalness: 0.55, roughness: 0.35 }),
    rubber: plain({ color: 0x1f2022, roughness: 0.9 }),
    yellow: plain({ color: 0xd6a51d, roughness: 0.5 }),
    sawdust: plain({ color: 0xd8bf92, roughness: 1, transparent: true, opacity: 0.85, depthWrite: false }),
    tarp: plain({ color: 0x3d5786, roughness: 0.9 }), // the faded blue tarpaulins of today (photos of 26.10.2026)
  };
  const DUST = {}; // sawdust patches (material and a maker, set below)
  // a tarpaulin thrown over a machine: a box of cloth that sags a little on top, hangs out further down, with folds and an uneven hem
  const drape = (x0, x1, y0, y1, z0, z1, parent, o = {}) => {
    const w = x1 - x0,
      d = y1 - y0,
      h = z1 - z0,
      g = new THREE.BoxGeometry(w, h, d, 12, 6, 6),
      p = g.attributes.position,
      sd = (o.seed || 1) * 7.3,
      fl = o.flare ?? 0.08,
      A = o.folds ?? 0.035;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i); // three.js frame: x across, y up, z = −site y
      const t = (y + h / 2) / h,
        ex = Math.abs(x) > w / 2 - 1e-4,
        ez = Math.abs(z) > d / 2 - 1e-4;
      if (t > 0.999) y -= (o.sag ?? 0.03) * (1 - ((2 * x) / w) ** 2) * (1 - ((2 * z) / d) ** 2);
      else {
        const k = 1 - t;
        if (ex) x += Math.sign(x) * k * (fl + A * Math.sin(z * 9 + sd + x));
        if (ez) z += Math.sign(z) * k * (fl + A * Math.sin(x * 8 + sd * 1.7));
        if (t < 1e-3) y += (0.5 + 0.5 * Math.sin(x * 5.3 + z * 4.1 + sd)) * (o.hem ?? 0.12);
      }
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    const me = new THREE.Mesh(g, M.tarp);
    me.position.copy(V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
    me.castShadow = me.receiveShadow = true;
    (parent || scene).add(tagPh(me));
    return me;
  };
  grime(M.boards, 0.45, 0.5, 0.08);
  grime(M.gable, 0.3, 0.4, 0.08);
  grime(M.foot, 0.3, 0.3, 0.1);
  const cylUV = (g, r) => {
    const p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, Math.atan2(p.getZ(i), p.getX(i)) * r, p.getY(i));
    return g;
  }; // world-size UVs (bark does not stretch)
  const hcyl = (x0, x1, y, z, r, mats, seg = 20, parent) => {
    const g = cylUV(new THREE.CylinderGeometry(r, r, x1 - x0, seg), r);
    const me = new THREE.Mesh(g, mats);
    me.rotation.z = Math.PI / 2;
    me.position.copy(V((x0 + x1) / 2, y, z));
    me.castShadow = me.receiveShadow = true;
    (parent || scene).add(me);
    return tagPh(me);
  };
  const ycyl = (y0, y1, x, z, r, mats, seg = 20, parent) => {
    const g = cylUV(new THREE.CylinderGeometry(r, r, y1 - y0, seg), r);
    const me = new THREE.Mesh(g, mats);
    me.rotation.x = Math.PI / 2;
    me.position.copy(V(x, (y0 + y1) / 2, z));
    me.castShadow = me.receiveShadow = true;
    (parent || scene).add(me);
    return tagPh(me);
  };
  // --- floor, footings, frame ---
  B(X0 - 0.15, X1 + 0.15, YB - 0.15, YF + 0.3, -0.02, 0.04, M.pavers, { walk: 'stone', cast: false, grain: 'x' });
  for (const py of [YB, YF])
    for (const px of PX) {
      B(px - 0.15, px + 0.15, py - 0.15, py + 0.15, 0.04, 0.09, M.foot, { col: false });
      B(px - 0.06, px + 0.06, py - 0.06, py + 0.06, 0.09, ZP, MAT.kvh, { grain: 'z', tag: 'post' });
    }
  for (const py of [YB, YF]) B(X0, X1, py - 0.07, py + 0.07, ZP, ZT, MAT.kvh, { grain: 'x', col: false });
  for (const px of PX)
    B(px - 0.05, px + 0.05, YB + 0.07, YF - 0.07, ZP + 0.02, ZT, MAT.kvh, { grain: 'y', col: false });
  for (const py of [YB, YF])
    for (let i = 0; i < PX.length; i++)
      for (const d of [-1, 1]) {
        if ((i === 0 && d < 0) || (i === PX.length - 1 && d > 0)) continue; // knee braces along the long sides
        beam([PX[i] + d * 0.62, py, ZP - 0.04], [PX[i] + d * 0.04, py, ZP - 0.62], 0.08, 0.08, MAT.kvh);
      }
  for (const px of [PX[0], PX[PX.length - 1]])
    for (const [py, d] of [
      [YB, 1],
      [YF, -1],
    ])
      beam([px, py + d * 0.62, ZP - 0.04], [px, py + d * 0.04, ZP - 0.62], 0.08, 0.08, MAT.kvh);
  // back wall: vertical boards outside the back posts, 6 cm above the pavers
  B(X0, X1, YB - 0.095, YB - 0.065, 0.1, ZT, M.boards, { grain: 'z', tag: 'wall' });
  B(X0, X1, YB - 0.115, YB - 0.065, 0.04, 0.1, M.fascia, { col: false });
  // gable triangles (boarded above the end tie beams)
  for (const px of [X0 + 0.02, X1 - 0.02]) {
    const sh = new THREE.Shape();
    const hw = (YF - YB) / 2 + 0.07;
    sh.moveTo(-hw, 0);
    sh.lineTo(hw, 0);
    sh.lineTo(hw, 0.12);
    sh.lineTo(0, ZR - ZT + 0.14);
    sh.lineTo(-hw, 0.12);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false });
    {
      const p = g.attributes.position,
        uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i));
    }
    const me = new THREE.Mesh(g, M.gable);
    me.rotation.y = Math.PI / 2;
    me.position.copy(V(px + (px < 0 ? -0.0125 : 0.0125), YR, ZT));
    me.position.x -= 0.0125;
    me.castShadow = me.receiveShadow = true;
    scene.add(me);
  }
  // roof: rafters every ~0.8 m, boards and shingles on both faces, fascia, ridge cap
  const slab = (yE, yR, off, thick, mat, x0 = X0 - OVG, x1 = X1 + OVG) => {
    const zE = ZT - OVE * Math.tan(PITCH);
    const run = Math.abs(yR - yE),
      L = run / Math.cos(PITCH),
      zc = (zE + ZR) / 2 + off / Math.cos(PITCH),
      yc = (yE + yR) / 2;
    const g = new THREE.BoxGeometry(x1 - x0, thick, L);
    {
      const p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), Math.abs(n.getX(i)) > 0.5 ? p.getY(i) : p.getZ(i));
    }
    const me = new THREE.Mesh(g, mat);
    me.position.copy(V((x0 + x1) / 2, yc, zc));
    me.rotation.x = (yE > YR ? -1 : 1) * PITCH;
    me.castShadow = me.receiveShadow = true;
    scene.add(me);
    return me;
  };
  const yEF = YF + OVE,
    yEB = YB - OVE;
  for (let x = X0 - OVG + 0.04; x <= X1 + OVG - 0.04 + 1e-6; x += (X1 - X0 + 2 * OVG - 0.08) / 13)
    for (const yE of [yEF, yEB]) {
      const zE = ZT - OVE * Math.tan(PITCH);
      beam([x, yE, zE + 0.07], [x, YR, ZR + 0.07], 0.07, 0.14, MAT.kvh);
    }
  for (const yE of [yEF, yEB]) {
    slab(yE, YR, 0.155, 0.022, MAT.kvh);
    slab(yE, YR, 0.178, 0.012, M.shingle);
  }
  for (const yE of [yEF, yEB]) {
    const zE = ZT - OVE * Math.tan(PITCH);
    B(
      X0 - OVG,
      X1 + OVG,
      yE - (yE > YR ? -0.02 : 0.02) - 0.012,
      yE - (yE > YR ? -0.02 : 0.02) + 0.012,
      zE + 0.02,
      zE + 0.2,
      M.fascia,
      { col: false }
    );
  }
  B(X0 - OVG, X1 + OVG, YR - 0.11, YR + 0.11, ZR + 0.15, ZR + 0.23, M.shingle, { col: false });
  for (const xg of [X0 - OVG, X1 + OVG])
    for (const yE of [yEF, yEB]) {
      const zE = ZT - OVE * Math.tan(PITCH);
      beam(
        [xg + (xg < 0 ? 0.012 : -0.012), yE, zE + 0.2],
        [xg + (xg < 0 ? 0.012 : -0.012), YR, ZR + 0.2],
        0.024,
        0.16,
        M.fascia
      );
    }
  // sign on the front plate
  {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 180;
    const q = c.getContext('2d');
    q.fillStyle = '#b8895a';
    q.fillRect(0, 0, 1024, 180);
    for (let i = 0; i < 60; i++) {
      q.strokeStyle = `rgba(90,55,25,${0.08 + rnd() * 0.12})`;
      q.lineWidth = 1 + rnd() * 2;
      q.beginPath();
      const y = rnd() * 180;
      q.moveTo(0, y);
      q.bezierCurveTo(300, y + rr(-8, 8), 700, y + rr(-8, 8), 1024, y + rr(-6, 6));
      q.stroke();
    }
    q.fillStyle = '#2b1a0e';
    q.font = '700 112px Georgia, "Times New Roman", serif';
    q.textAlign = 'center';
    q.textBaseline = 'middle';
    q.fillText('KLINGENHOLZ', 512, 96);
    q.strokeStyle = 'rgba(43,26,14,0.8)';
    q.lineWidth = 6;
    q.strokeRect(14, 14, 996, 152);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    const me = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.03), [
      M.oil,
      M.oil,
      M.oil,
      M.oil,
      M.oil,
      patchSV(new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 })),
    ]); // −z face = north, towards the garden
    me.position.copy(V(-1.5, YF + 0.088, ZP - 0.2));
    me.castShadow = true;
    scene.add(me);
  }
  // --- V15b band sawmill outside, north of the workshop: track south–north, short end towards the workshop, long sides towards Hubert (W) and Ronald (E);
  //     the saw head straddles the track and cuts along the log (its blade runs across, east–west) ---
  // Falko 30.10.2026: in the garden of today (construction phase 0) the mill stands between the front posts of the lean-to, its head under a
  // blue tarpaulin, the rails running out north on wooden blocks (photo IMG_7290); from phase 1 it stands where the plan has it. The whole
  // mill is one group (SAWG, its frame = the workshop as built at the plan's place): one offset per phase moves the meshes, the colliders,
  // the bunks the fork lays a log on, the head's travel, the sounds and the actions together (WORKS.layout; werk/holz_saw.js builds in it).
  const MX = -1.5,
    YS = -34.85,
    YN = -27.85,
    GA = 0.9; // track centre line x, south and north end, gauge
  const SAWG = new THREE.Group();
  SAWG.name = 'saw';
  SAWG.userData.mergeRoot = 'werkstatt:saw'; // render/zmerge.js merges its static parts inside the group, so they move with it
  scene.add(SAWG);
  const SAW = {
    s: YS + 0.55,
    s0: YS + 0.55,
    s1: YN - 0.55,
    dir: 1,
    on: false,
    head: new THREE.Group(),
    wheels: [],
    xc: MX,
    zBlade: 0.76,
    logY0: -33.75,
    logY1: -29.55,
    logR: 0.26,
    g: SAWG,
    off: [0, 0], // the offset of this phase (as built), set by WORKS.layout
    OFF: [
      [-0.45, -3.7],
      [0, 0],
    ], // phase 0: the head between the lean-to's front posts at x −3.1 and −0.66; from SAW_PH: the plan
    cols: [],
  };
  SAW.at = (x, y) => [x + SAW.off[0], y + SAW.off[1]]; // a point of the mill (plan) → the workshop as built in this phase
  phase(null);
  {
    const xa = MX - GA / 2,
      xb = MX + GA / 2,
      PG = o => Object.assign({ parent: SAWG, col: false }, o);
    for (const x of [xa, xb]) B(x - 0.04, x + 0.04, YS, YN, 0.36, 0.44, M.steel, PG({ grain: 'y' }));
    for (let y = YS + 0.15; y < YN; y += 1.15) {
      B(xa - 0.08, xb + 0.08, y - 0.04, y + 0.04, 0.3, 0.36, M.steel, PG());
      phase(SAW_PH); // the plan: steel legs on foot plates
      for (const x of [xa, xb]) {
        B(x - 0.03, x + 0.03, y - 0.03, y + 0.03, 0.02, 0.3, M.steel, PG());
        B(x - 0.07, x + 0.07, y - 0.07, y + 0.07, 0.0, 0.03, M.dark, PG());
      }
      phase(0, SAW_PH); // today: the rails lie on stacked wooden blocks
      for (const x of [xa, xb]) {
        B(x - 0.11, x + 0.11, y - 0.09, y + 0.09, 0.0, 0.16, M.boards, PG({ grain: 'x' }));
        B(x - 0.09, x + 0.09, y - 0.11, y + 0.11, 0.16, 0.3, M.boards, PG({ grain: 'y' }));
      }
      phase(null);
    }
    for (const y of [YS, YN]) B(xa - 0.04, xb + 0.04, y - 0.03, y + 0.03, 0.36, 0.5, M.orange, PG()); // end stops
    SAW.cols.push(COL.push([xa - 0.1, xb + 0.1, YS, YN, 0, 0.5, 'saw', null, null]) - 1);
    // log bunks with stops (west) and a clamp (east)
    for (const y of [-33.35, -32.0, -30.65, -29.9]) {
      B(xa - 0.04, xb + 0.04, y - 0.05, y + 0.05, 0.44, 0.5, M.dark, PG());
      B(xa + 0.02, xa + 0.08, y - 0.04, y + 0.04, 0.5, 0.86, M.dark, PG());
    }
    for (const y of [-32.0, -30.65]) {
      B(xb - 0.16, xb - 0.08, y - 0.04, y + 0.04, 0.5, 0.74, M.yellow, PG());
      hcyl(xb - 0.3, xb - 0.08, y, 0.7, 0.018, M.steel, 8, SAWG);
    }
    SAW.logMesh = ycyl(
      SAW.logY0,
      SAW.logY1,
      MX,
      0.5 + SAW.logR,
      SAW.logR,
      [MAT.logs, MAT.logEnd, MAT.logEnd],
      24,
      SAWG
    );
    SAW.logMesh.userData.noMerge = true;
    SAW.logMesh.userData.ph = SAW_PH; // the plan's decorative log on the bunks; today the rails are empty (photo IMG_7290)
    SAW.cols.push(
      COL.push([MX - SAW.logR, MX + SAW.logR, SAW.logY0, SAW.logY1, 0.4, 0.5 + 2 * SAW.logR, 'log', SAW_PH, null]) - 1
    );
    // the saw head: a frame over the track on four rollers, the saw unit with both wheel housings across, the engine on Ronald's side, push bar to the south
    const h = SAW.head;
    h.position.copy(V(MX, SAW.s, 0));
    SAWG.add(h);
    const P = o => Object.assign({ parent: h, col: false }, o);
    for (const x of [-0.62, 0.62]) {
      B(x - 0.05, x + 0.05, -0.16, 0.16, 0.38, 0.48, M.orange, P());
      B(x - 0.04, x + 0.04, -0.04, 0.04, 0.48, 1.86, M.orange, P({ grain: 'z' }));
    }
    for (const x of [-GA / 2, GA / 2])
      for (const y of [-0.12, 0.12]) {
        const w = ycyl(y - 0.025, y + 0.025, x, 0.48, 0.045, M.dark, 14, h);
      }
    B(-0.66, 0.66, -0.06, 0.06, 1.82, 1.9, M.orange, P());
    // V16d: the saw unit (wheels, blade, guides, engine) is a group of its own – it moves up and down on the posts (SAW.unit.position.y = blade height − zBlade)
    const U = (SAW.unit = new THREE.Group());
    h.add(U);
    const PU = o => Object.assign({ parent: U, col: false }, o);
    for (const x of [-0.5, 0.5]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.2, 28), [M.orange, M.orange, M.orange]);
      wh.rotation.x = Math.PI / 2;
      wh.position.copy(V(x, 0, SAW.zBlade + 0.26));
      wh.castShadow = true;
      U.add(wh);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.23, 6), [M.dark, M.steel, M.steel]);
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(wh.position);
      U.add(hub);
      SAW.wheels.push(hub);
    }
    B(-0.5, 0.5, -0.06, 0.06, SAW.zBlade + 0.46, SAW.zBlade + 0.56, M.orange, PU());
    B(-0.48, 0.48, -0.004, 0.004, SAW.zBlade - 0.017, SAW.zBlade + 0.017, M.blade, PU({ cast: false })); // the blade, across the log
    for (const x of [-0.25, 0.25])
      B(x - 0.03, x + 0.03, -0.035, 0.035, SAW.zBlade - 0.02, SAW.zBlade + 0.28, M.dark, PU()); // blade guides
    B(0.72, 1.06, -0.2, 0.2, SAW.zBlade + 0.16, SAW.zBlade + 0.5, M.red, PU()); // engine block
    B(0.76, 1.02, -0.16, 0.12, SAW.zBlade + 0.5, SAW.zBlade + 0.64, M.black, PU()); // fuel tank
    hcyl(0.86, 1.0, 0.16, SAW.zBlade + 0.32, 0.05, M.dark, 12, U); // muffler
    B(-0.32, 0.32, -0.3, -0.27, 1.12, 1.15, M.black, P());
    for (const x of [-0.32, 0.32]) B(x - 0.015, x + 0.015, -0.3, -0.04, 1.12, 1.15, M.black, P()); // push bar (south)
    // today the head stands under a blue tarpaulin (phase 0; WORKS.setCover); taken off, it lies folded beside the rails
    phase(0, SAW_PH);
    SAW.cover = new THREE.Group();
    h.add(SAW.cover);
    {
      // draped over the frame (head frame x −0.66 … 1.06 with the engine, the push bar to the south)
      drape(-0.76, 1.12, -0.37, 0.27, 0.34, 1.97, SAW.cover, { seed: 2, flare: 0.1, folds: 0.045, hem: 0.16 });
    }
    SAW.folded = new THREE.Group();
    SAW.folded.userData.mergeRoot = 'werkstatt:saw:folded'; // merged on its own: it shows only while the head is uncovered
    SAWG.add(SAW.folded);
    B(MX - 1.12, MX - 0.62, YS + 0.05, YS + 0.45, 0, 0.12, M.tarp, { parent: SAW.folded, col: false });
    phase(null);
    // sawdust stays where the mill cuts (in its group: it moves with it)
    SAW.dust = [
      [MX, -31.4, 1.0, 0.012],
      [MX + 0.2, -34.2, 0.6, 0.012],
    ];
    WORKS.machines.push({
      key: 'saw',
      label: 'Blockbandsäge',
      pos: [MX + 0.95, YS + 0.4],
      r: 2.2,
      z: 0,
      snd: 'saw_run',
      snd2: 'saw_cut',
      state: SAW,
      ph: null, // in every phase: today in front of the lean-to, from phase 1 north of the hall
    });
  }
  phase(SAW_PH);
  // --- drum sander (feed along y, drum across) ---
  {
    const x0 = 0.35,
      x1 = 1.35,
      yc = -38.0;
    B(x0 + 0.08, x1 - 0.08, yc - 0.36, yc + 0.36, 0.04, 0.78, M.machine, { tag: 'machine' });
    B(x0, x1, yc - 0.78, yc + 0.78, 0.78, 0.83, M.dark, { col: false });
    for (const y of [yc - 0.7, yc + 0.7]) hcyl(x0 + 0.02, x1 - 0.02, y, 0.805, 0.03, M.steel, 10);
    hcyl(x0 - 0.02, x1 + 0.02, yc, 1.07, 0.17, [M.machine, M.machine, M.machine], 24);
    B(x0 - 0.02, x1 + 0.02, yc - 0.17, yc + 0.17, 0.89, 1.07, M.machine, { col: false });
    for (const x of [x0 - 0.02, x1 - 0.02]) B(x, x + 0.04, yc - 0.12, yc + 0.12, 0.83, 0.89, M.machine, { col: false });
    cyl((x0 + x1) / 2, yc, 1.22, 1.41, 0.05, M.black, 14, undefined, { col: false });
    {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 24), M.steel);
      tor.rotation.y = Math.PI / 2;
      tor.position.copy(V(x1 + 0.06, yc, 1.1));
      scene.add(tor);
    }
    B(x1 + 0.0, x1 + 0.05, yc + 0.3, yc + 0.42, 0.62, 0.74, M.yellow, { col: false });
    B(x0 + 0.25, x1 - 0.25, yc + 0.32, yc + 0.72, 0.83, 0.87, M.walnut, { col: false });
    WORKS.machines.push({
      key: 'sander',
      label: 'Trommelschleifer',
      pos: [(x0 + x1) / 2, yc + 1.25],
      r: 1.6,
      z: 0,
      snd: 'sander',
      elec: true,
    });
  }
  // --- planer / thicknesser ---
  {
    const yc = -38.0;
    B(2.2, 2.95, yc - 0.24, yc + 0.24, 0.04, 0.82, M.machine, { tag: 'machine' });
    B(1.85, 2.55, yc - 0.19, yc + 0.19, 0.82, 0.87, M.machineL, { col: false });
    B(2.61, 3.32, yc - 0.19, yc + 0.19, 0.82, 0.87, M.machineL, { col: false });
    ycyl(yc - 0.19, yc + 0.19, 2.58, 0.83, 0.035, M.dark, 12);
    B(2.45, 2.75, yc + 0.02, yc + 0.17, 0.875, 0.9, M.yellow, { col: false });
    B(2.0, 3.15, yc - 0.21, yc - 0.18, 0.87, 1.0, M.machineL, { col: false });
    B(2.96, 3.02, yc + 0.08, yc + 0.18, 0.55, 0.68, M.red, { col: false });
    WORKS.machines.push({
      key: 'planer',
      label: 'Abrichthobel',
      pos: [2.6, yc + 1.05],
      r: 1.5,
      z: 0,
      snd: 'planer',
      elec: true,
    });
  }
  // --- V15b table saw (where the sawmill stood): cabinet, cast table, blade with riving knife and guard, rip fence south of the blade, sliding table to the north;
  //     the panel is fed from the east (the operator stands there) towards the west ---
  const TS = {
    x0: -5.05,
    x1: -3.75,
    y0: -38.45,
    y1: -37.65,
    z: 0.86,
    by: -38.1,
    fence: 0.045,
    blade: null,
    fenceMesh: null,
  };
  {
    const cx = (TS.x0 + TS.x1) / 2,
      cy = (TS.y0 + TS.y1) / 2;
    B(cx - 0.3, cx + 0.3, cy - 0.3, cy + 0.3, 0.04, TS.z - 0.05, M.machine, { tag: 'machine' });
    B(TS.x0, TS.x1, TS.y0, TS.y1, TS.z - 0.05, TS.z, M.machineL, { col: false, grain: 'x' });
    B(TS.x0 - 0.1, TS.x1 + 0.2, TS.y1, TS.y1 + 0.32, TS.z - 0.06, TS.z - 0.01, M.machineL, { col: false }); // sliding table (north)
    B(TS.x0 - 0.1, TS.x1 + 0.2, TS.y1 + 0.32, TS.y1 + 0.35, TS.z - 0.01, TS.z + 0.05, M.dark, { col: false }); // its fence
    COL.push([TS.x0 - 0.1, TS.x1 + 0.2, TS.y0 - 0.05, TS.y1 + 0.35, 0, TS.z + 0.1, 'machine', null, null]);
    {
      const g = new THREE.CylinderGeometry(0.125, 0.125, 0.003, 40);
      const me = new THREE.Mesh(g, M.blade);
      me.rotation.x = Math.PI / 2;
      me.position.copy(V(cx - 0.05, TS.by, TS.z + 0.065 - 0.125));
      me.castShadow = true;
      me.userData.noMerge = true;
      scene.add(me);
      TS.blade = me;
    }
    B(cx + 0.03, cx + 0.2, TS.by - 0.002, TS.by + 0.002, TS.z, TS.z + 0.09, M.dark, { col: false }); // riving knife
    B(cx - 0.22, cx + 0.24, TS.by - 0.045, TS.by + 0.045, TS.z + 0.13, TS.z + 0.2, M.red, { col: false }); // blade guard
    B(cx + 0.21, cx + 0.24, TS.by - 0.01, TS.by + 0.01, TS.z + 0.09, TS.z + 0.13, M.dark, { col: false });
    {
      const fm = B(TS.x0 - 0.05, TS.x1 + 0.05, -0.02, 0.02, TS.z, TS.z + 0.08, M.dark, { col: false });
      fm.userData.noMerge = true;
      TS.fenceMesh = fm;
      TS.fenceY = y => {
        const loc = fm.parent && fm.parent.userData.bldRoot;
        fm.position.copy(loc ? V(cx - WORKS.px, y - WORKS.py, TS.z + 0.04) : V(cx, y, TS.z + 0.04));
        markDirty(true);
      };
      TS.fenceY(TS.by - 0.0015 - TS.fence - 0.02);
    }
    B(TS.x1 + 0.01, TS.x1 + 0.06, cy - 0.12, cy + 0.02, 0.62, 0.78, M.yellow, { col: false });
    B(TS.x1 + 0.055, TS.x1 + 0.07, cy - 0.09, cy - 0.06, 0.7, 0.74, M.red, { col: false }); // switch
    cyl(cx - 0.28, cy + 0.2, 0.2, 0.9, 0.05, M.black, 12, undefined, { col: false }); // dust hose
    WORKS.machines.push({
      key: 'tablesaw',
      label: 'Tischkreissäge',
      pos: [TS.x1 + 0.55, cy],
      r: 1.3,
      z: 0,
      snd: 'tablesaw',
      elec: true,
      state: TS,
    });
  }
  // --- V15b thickness planer (Dickenhobel) on its stand: fed from the east, out to the west; crank on top sets the thickness ---
  const TH = { x0: -1.9, x1: -1.2, y0: -38.38, y1: -37.72, z: 0.62 };
  {
    const cx = (TH.x0 + TH.x1) / 2,
      cy = (TH.y0 + TH.y1) / 2;
    for (const dx of [-0.24, 0.24])
      for (const dy of [-0.24, 0.24])
        B(cx + dx - 0.025, cx + dx + 0.025, cy + dy - 0.025, cy + dy + 0.025, 0.04, 0.42, M.dark, { col: false });
    B(cx - 0.28, cx + 0.28, cy - 0.28, cy + 0.28, 0.4, 0.44, M.dark, { col: false });
    B(TH.x0 + 0.05, TH.x1 - 0.05, TH.y0, TH.y1, 0.44, TH.z - 0.03, M.machine, { col: false }); // base with the table
    B(TH.x0 - 0.3, TH.x1 + 0.3, cy - 0.2, cy + 0.2, TH.z - 0.03, TH.z, M.machineL, { col: false }); // bed with in- and outfeed tables
    for (const y of [TH.y0 + 0.02, TH.y1 - 0.06])
      B(TH.x0 + 0.08, TH.x1 - 0.08, y, y + 0.04, TH.z, TH.z + 0.36, M.machine, { col: false }); // side columns
    B(TH.x0 + 0.05, TH.x1 - 0.05, TH.y0, TH.y1, TH.z + 0.14, TH.z + 0.36, M.machine, { col: false }); // head with the cutter block
    B(TH.x1 - 0.06, TH.x1 - 0.04, TH.y0 + 0.08, TH.y1 - 0.08, TH.z + 0.06, TH.z + 0.14, M.dark, { col: false }); // infeed slot shade
    cyl(cx, cy, TH.z + 0.36, TH.z + 0.42, 0.012, M.steel, 8, undefined, { col: false });
    {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 8, 24), M.steel);
      tor.rotation.x = Math.PI / 2;
      tor.position.copy(V(cx, cy, TH.z + 0.43));
      scene.add(tor);
    }
    B(TH.x1 - 0.02, TH.x1 + 0.03, TH.y1 - 0.14, TH.y1 - 0.04, TH.z + 0.18, TH.z + 0.3, M.yellow, { col: false });
    cyl(cx - 0.05, TH.y1 + 0.06, TH.z + 0.36, TH.z + 0.9, 0.05, M.black, 12, undefined, { col: false }); // dust hose
    COL.push([TH.x0 - 0.3, TH.x1 + 0.3, TH.y0 - 0.02, TH.y1 + 0.1, 0, TH.z + 0.45, 'machine', null, null]);
    WORKS.machines.push({
      key: 'thick',
      label: 'Dickenhobel',
      pos: [TH.x1 + 0.6, cy],
      r: 1.2,
      z: 0,
      snd: 'thick_run',
      elec: true,
      state: TH,
    });
  }
  // V15b outfeed cart west of the table saw (strips and slices land here)
  {
    const x0 = -6.0,
      x1 = -5.4,
      y0 = -38.4,
      y1 = -37.72;
    B(x0, x1, y0, y1, 0.74, 0.78, M.beech, { col: false, grain: 'x' });
    for (const x of [x0 + 0.04, x1 - 0.04])
      for (const y of [y0 + 0.04, y1 - 0.04])
        B(x - 0.02, x + 0.02, y - 0.02, y + 0.02, 0.1, 0.74, M.dark, { col: false });
    B(x0 + 0.02, x1 - 0.02, y0 + 0.02, y1 - 0.02, 0.24, 0.27, M.beech, { col: false });
    for (const x of [x0 + 0.04, x1 - 0.04])
      for (const y of [y0 + 0.04, y1 - 0.04]) cyl(x, y, 0.0, 0.1, 0.045, M.rubber, 10, undefined, { col: false });
    COL.push([x0, x1, y0, y1, 0, 0.8, 'cart', null, null]);
  }
  // --- petrol generator outside the east end, cable to the machines (feat/garage: its tank, refuelling with the red petrol can from the
  //     garage and the stop when it is empty – garden/garage_play.js) ---
  // It stands there in every phase – today west of the lean-to under a table top (photos IMG_7272/7273, orange frame), from phase 1 at the
  // hall's east end: one group (GENG), moved by an offset per phase like the band sawmill (WORKS.layout); its 'gen' entry's pos follows.
  phase(null);
  const GEN = {
    x: 4.35,
    y: -38.6,
    OFF: [
      [-11.62, -0.67],
      [0, 0],
    ],
    off: [0, 0],
    cols: [],
    g: new THREE.Group(),
  };
  const GENG = GEN.g;
  GENG.name = 'gen';
  GENG.userData.mergeRoot = 'werkstatt:gen';
  scene.add(GENG);
  {
    const { x, y } = GEN,
      PG = o => Object.assign({ parent: GENG, col: false }, o);
    for (const dx of [-0.32, 0.32])
      for (const dy of [-0.22, 0.22])
        B(x + dx - 0.015, x + dx + 0.015, y + dy - 0.015, y + dy + 0.015, 0.0, 0.5, M.orange, PG());
    for (const z of [0.02, 0.5]) {
      B(x - 0.33, x + 0.33, y - 0.235, y - 0.205, z - 0.015, z + 0.015, M.orange, PG());
      B(x - 0.33, x + 0.33, y + 0.205, y + 0.235, z - 0.015, z + 0.015, M.orange, PG());
    }
    B(x - 0.22, x + 0.12, y - 0.17, y + 0.17, 0.06, 0.36, M.black, PG());
    B(x + 0.12, x + 0.3, y - 0.16, y + 0.16, 0.08, 0.32, M.machineL, PG());
    B(x - 0.25, x + 0.2, y - 0.18, y + 0.18, 0.4, 0.52, M.black, PG());
    GEN.cols.push(COL.push([x - 0.34, x + 0.34, y - 0.24, y + 0.24, 0, 0.55, 'gen', null, null]) - 1);
    phase(SAW_PH); // the cable to the hall's machines
    beam([x - 0.3, y, 0.02], [2.9, y + 0.4, 0.02], 0.012, 0.012, M.black, { cast: false });
    beam([2.9, y + 0.4, 0.02], [1.3, -38.3, 0.02], 0.012, 0.012, M.black, { cast: false });
  }
  WORKS.machines.push({
    key: 'gen',
    label: 'Benzin-Stromaggregat',
    pos: [GEN.x, GEN.y + 0.8], // as built in this phase (WORKS.layout writes it; garden/garage_play.js reads it for the refuelling)
    r: 1.4,
    z: 0,
    snd: 'generator',
    hidden: true,
  });
  WORKS.GEN = GEN;
  // --- V15b glue table (Leimtisch) where the first bench stood: a heavy beech top with a bench-dog grid and two hold-down bars (Niederhalter),
  //     parallel clamps on the wall above; a carpenter's bench for scraping, chamfering, oiling and the brand; the tool wall along the south wall ---
  const GT = { x0: -4.4, x1: -2.25, y0: -40.45, y1: -39.6, z: 0.86 };
  {
    const { x0, x1, y0, y1, z } = GT;
    B(x0, x1, y0, y1, z - 0.07, z, M.beech, { grain: 'x', tag: 'bench' });
    for (const x of [x0 + 0.1, x1 - 0.1])
      for (const y of [y0 + 0.1, y1 - 0.1])
        B(x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0.04, z - 0.07, M.beech, { grain: 'z', col: false });
    for (const x of [x0 + 0.1, x1 - 0.1])
      B(x - 0.04, x + 0.04, y0 + 0.08, y1 - 0.08, 0.14, 0.22, M.beech, { col: false });
    B(x0 + 0.14, x1 - 0.14, y0 + 0.12, y1 - 0.12, 0.2, 0.23, M.beech, { col: false });
    for (let x = x0 + 0.12; x < x1 - 0.05; x += 0.192)
      for (let y = y0 + 0.1; y < y1 - 0.05; y += 0.192) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.011, 10), M.black);
        m.rotation.x = -Math.PI / 2;
        m.position.copy(V(x, y, z + 0.0015));
        scene.add(m);
      } // 20 mm dog holes
    // parallel clamps (Korpuszwingen) on a rail above the table
    B(x0 + 0.05, x1 - 0.05, YB + 0.08, YB + 0.12, 1.86, 1.9, M.beech, { col: false });
    for (let i = 0; i < 8; i++) {
      const x = x0 + 0.18 + i * 0.24;
      B(x - 0.012, x + 0.012, YB + 0.12, YB + 0.15, 1.02, 1.9, M.steel, { col: false });
      B(x - 0.03, x + 0.03, YB + 0.11, YB + 0.17, 1.78, 1.88, M.red, { col: false });
      B(x - 0.03, x + 0.03, YB + 0.11, YB + 0.17, 1.05, 1.13, M.red, { col: false });
      hcyl(x + 0.03, x + 0.16, YB + 0.14, 1.09, 0.016, M.dark, 8);
    }
  }
  const benches = [[-1.9, 0.1]],
    BY0 = -40.45,
    BY1 = -39.8,
    BZ = 0.88;
  for (const [x0, x1] of benches) {
    B(x0, x1, BY0, BY1, BZ - 0.09, BZ, M.beech, { grain: 'x', tag: 'bench' });
    for (const x of [x0 + 0.12, x1 - 0.12])
      for (const y of [BY0 + 0.1, BY1 - 0.1])
        B(x - 0.04, x + 0.04, y - 0.04, y + 0.04, 0.04, BZ - 0.09, M.beech, { grain: 'z', col: false });
    for (const x of [x0 + 0.12, x1 - 0.12])
      B(x - 0.04, x + 0.04, BY0 + 0.06, BY1 - 0.06, 0.12, 0.2, M.beech, { col: false });
    B(x0 + 0.16, x1 - 0.16, BY0 + 0.1, BY1 - 0.1, 0.18, 0.21, M.beech, { col: false });
    B(x0 + 0.04, x0 + 0.32, BY1 - 0.01, BY1 + 0.06, BZ - 0.2, BZ, M.beech, { col: false });
    hcyl(x0 + 0.1, x0 + 0.42, BY1 + 0.11, BZ - 0.1, 0.012, M.beech, 8); // front vice: jaw and bar
    B(x1 - 0.3, x1 + 0.06, BY0 + 0.05, BY1 - 0.05, BZ - 0.2, BZ - 0.08, M.beech, { col: false });
  }
  B(-2.1, 0.25, YB + 0.06, YB + 0.08, 1.05, 2.2, M.walnut, { col: false, cast: false }); // tool board
  for (let i = 0; i < 9; i++) {
    const x = -1.95 + i * 0.13;
    B(x - 0.012, x + 0.012, YB + 0.08, YB + 0.1, 1.3, 1.42, M.red, { col: false });
    B(x - 0.004, x + 0.004, YB + 0.08, YB + 0.1, 1.14, 1.3, M.steel, { col: false });
  } // chisels
  B(-1.6, 0.2, YB + 0.08, YB + 0.13, 1.97, 2.0, M.beech, { col: false }); // clamp rail with F-clamps
  for (let i = 0; i < 7; i++) {
    const x = -1.5 + i * 0.235;
    B(x - 0.01, x + 0.01, YB + 0.13, YB + 0.15, 1.45, 2.0, M.steel, { col: false });
    B(x - 0.012, x + 0.07, YB + 0.12, YB + 0.16, 1.92, 1.97, M.dark, { col: false });
    B(x - 0.012, x + 0.07, YB + 0.12, YB + 0.16, 1.5 + (i % 3) * 0.05, 1.55 + (i % 3) * 0.05, M.dark, { col: false });
    hcyl(x + 0.07, x + 0.2, YB + 0.14, 1.52 + (i % 3) * 0.05, 0.016, M.red, 8);
  }
  {
    const sq = new THREE.Group();
    B(-0.25, -0.24, YB + 0.08, YB + 0.095, 1.2, 1.6, M.steel, { parent: sq, col: false });
    B(-0.25, -0.05, YB + 0.08, YB + 0.095, 1.2, 1.215, M.steel, { parent: sq, col: false });
    scene.add(sq);
  }
  // --- glued panels on edge in a rack, finished end-grain boards on a shelf above ---
  {
    const woods = [M.walnut, M.ash, M.beech];
    B(1.0, 3.3, YB + 0.07, YB + 0.5, 0.04, 0.1, M.dark, { col: false });
    for (const x of [1.05, 3.25]) B(x - 0.025, x + 0.025, YB + 0.38, YB + 0.42, 0.04, 0.9, M.dark, { col: false });
    woods.forEach((m, i) => {
      const y = YB + 0.1 + i * 0.04;
      const me = B(1.15, 3.15, y, y + 0.027, 0.1, 0.7, m, { col: false, grain: 'x' });
      if (me) me.rotation.x = -0.04;
    });
    COL.push([1.0, 3.3, YB + 0.06, YB + 0.5, 0, 0.9, 'rack', null, null]);
    B(1.0, 3.3, YB + 0.06, YB + 0.34, 1.64, 1.67, M.beech, { col: false });
    for (const x of [1.1, 3.2]) B(x - 0.012, x + 0.012, YB + 0.06, YB + 0.32, 1.48, 1.64, M.dark, { col: false });
    {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 64;
      const q = c.getContext('2d');
      q.fillStyle = '#efe6cf';
      q.fillRect(0, 0, 256, 64);
      q.fillStyle = '#3a2a1a';
      q.font = '600 26px Georgia, serif';
      q.textAlign = 'center';
      q.textBaseline = 'middle';
      q.fillText('Leimholz Eiche 40 mm', 128, 33);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const me = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), plain({ map: t, roughness: 0.8 }));
      me.position.copy(V(2.15, YB + 0.505, 0.07));
      me.rotation.y = Math.PI;
      scene.add(me);
    }
    const eg = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const q = c.getContext('2d');
      const n = 8,
        s = 256 / n; // end-grain checker
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const dark = (i + j) % 2;
          q.fillStyle = dark ? '#6b4428' : '#d7b07e';
          q.fillRect(i * s, j * s, s, s);
          q.strokeStyle = dark ? 'rgba(30,18,8,0.35)' : 'rgba(120,80,40,0.3)';
          for (let r = 3; r < s * 1.2; r += 3 + rnd() * 2) {
            q.beginPath();
            q.arc(i * s + (rnd() < 0.5 ? 0 : s), j * s + s * rnd(), r, 0, 7);
            q.lineWidth = 0.8;
            q.stroke();
          }
        }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = ANISO;
      return t;
    })();
    const egM = (DUST.eg = patchSV(new THREE.MeshStandardMaterial({ map: eg, roughness: 0.55 }))); // also the blanks of today
    B(1.0, 3.3, YB + 0.06, YB + 0.34, 1.28, 1.31, M.beech, { col: false });
    for (const x of [1.1, 3.2]) B(x - 0.012, x + 0.012, YB + 0.06, YB + 0.32, 1.12, 1.28, M.dark, { col: false });
    for (let i = 0; i < 6; i++) {
      const x = 1.2 + i * 0.35,
        w = 0.28 + (i % 2) * 0.04;
      const me = new THREE.Mesh(new THREE.BoxGeometry(w, 0.38 - (i % 3) * 0.04, 0.04), [
        M.oil,
        M.oil,
        M.oil,
        M.oil,
        M.oil,
        egM,
      ]);
      me.position.copy(V(x + w / 2, YB + 0.2, 1.31 + (0.38 - (i % 3) * 0.04) / 2));
      me.rotation.x = -0.18;
      me.castShadow = true;
      scene.add(me);
    }
  }
  // (V15b: glue-ups happen on the glue table, made by the player – werk/werk.js)
  {
    const x0 = 0.34,
      x1 = 0.94,
      z0 = 1.0,
      z1 = 1.78,
      yb = YB + 0.07;
    B(x0, x1, yb, yb + 0.02, z0, z1, M.ash, { col: false, cast: false });
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 72;
    const q = c.getContext('2d');
    q.fillStyle = '#2f7d3a';
    q.fillRect(0, 0, 256, 72);
    q.fillStyle = '#fff';
    q.font = '700 30px system-ui, sans-serif';
    q.textAlign = 'center';
    q.textBaseline = 'middle';
    q.fillText('PSA', 128, 38);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.056), plain({ map: t, roughness: 0.7 }));
    sg.position.copy(V(0.64, yb + 0.021, 1.72));
    sg.rotation.y = Math.PI;
    scene.add(sg);
    for (const [x, z] of [
      [0.45, 1.58],
      [0.64, 1.58],
      [0.83, 1.58],
      [0.45, 1.3],
      [0.64, 1.3],
      [0.83, 1.3],
    ])
      B(x - 0.006, x + 0.006, yb + 0.02, yb + 0.06, z - 0.006, z + 0.006, M.steel, { col: false });
    B(
      0.39,
      0.51,
      yb + 0.05,
      yb + 0.09,
      1.5,
      1.56,
      plain({ color: 0x9fc6d8, roughness: 0.15, transparent: true, opacity: 0.6 }),
      { col: false }
    ); // goggles
    B(
      0.58,
      0.7,
      yb + 0.04,
      yb + 0.1,
      1.48,
      1.56,
      plain({ color: 0xd6e8ee, roughness: 0.1, transparent: true, opacity: 0.55 }),
      { col: false }
    ); // tight goggles
    for (const dx of [-0.045, 0.045])
      cyl(0.83 + dx, yb + 0.07, 1.42, 1.52, 0.035, plain({ color: 0xd8a21a, roughness: 0.5 }), 14, undefined, {
        col: false,
      }); // ear defenders
    B(0.39, 0.51, yb + 0.03, yb + 0.1, 1.16, 1.26, M.ash, { col: false });
    B(0.6, 0.68, yb + 0.04, yb + 0.1, 1.2, 1.27, plain({ color: 0x4a4d50, roughness: 0.6 }), { col: false });
    for (const dx of [-0.05, 0.05])
      cyl(0.64 + dx, yb + 0.08, 1.18, 1.22, 0.022, plain({ color: 0x5c8a3a, roughness: 0.5 }), 12, undefined, {
        col: false,
      }); // half mask with ABEK filters
    B(0.77, 0.89, yb + 0.03, yb + 0.1, 1.15, 1.24, plain({ color: 0x3b5fb0, roughness: 0.6 }), { col: false });
  } // box of nitrile gloves
  {
    cyl(0.32, -39.92, 0.0, 0.28, 0.14, plain({ color: 0x2c64a8, roughness: 0.45 }), 18, 0.12, { col: false });
    const w = new THREE.Mesh(
      new THREE.CircleGeometry(0.125, 18),
      plain({ color: 0x5a7a86, roughness: 0.08, metalness: 0.2 })
    );
    w.rotation.x = -Math.PI / 2;
    w.position.copy(V(0.32, -39.92, 0.24));
    scene.add(w); // water bucket
    cyl(0.3, -39.56, 0.0, 0.32, 0.13, plain({ color: 0xa3a9a8, metalness: 0.75, roughness: 0.35 }), 18, 0.12, {
      col: false,
    });
  } // galvanised bucket for oily rags (with water)
  {
    B(4.25, 4.6, -40.45, -40.15, 0, 0.4, M.beech, { col: true, grain: 'x' });
  } // crate by the fuming tent
  {
    cyl(-2.36, -40.14, 0.86, 1.04, 0.035, plain({ color: 0xf2f0e8, roughness: 0.4 }), 14, undefined, { col: false });
    cyl(-2.36, -40.14, 1.04, 1.07, 0.012, plain({ color: 0xd8601e, roughness: 0.4 }), 10, undefined, { col: false });
  } // glue bottle (D3)
  // --- V15b fuming tent for oak (Räucherzelt) outside the east end: frame with a clear foil cover, zip door to the north; ammonia fumes darken the oak ---
  const FT = { x: 5.25, y: -40.05, w: 1.1, d: 0.75, h: 1.0 };
  {
    const { x, y, w, d, h } = FT;
    for (const dx of [-w / 2, w / 2])
      for (const dy of [-d / 2, d / 2])
        B(x + dx - 0.012, x + dx + 0.012, y + dy - 0.012, y + dy + 0.012, 0, h, M.steel, { col: false });
    for (const z of [0.02, h]) {
      B(x - w / 2, x + w / 2, y - d / 2 - 0.012, y - d / 2 + 0.012, z - 0.012, z + 0.012, M.steel, { col: false });
      B(x - w / 2, x + w / 2, y + d / 2 - 0.012, y + d / 2 + 0.012, z - 0.012, z + 0.012, M.steel, { col: false });
      B(x - w / 2 - 0.012, x - w / 2 + 0.012, y - d / 2, y + d / 2, z - 0.012, z + 0.012, M.steel, { col: false });
      B(x + w / 2 - 0.012, x + w / 2 + 0.012, y - d / 2, y + d / 2, z - 0.012, z + 0.012, M.steel, { col: false });
    }
    const ft = (() => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const q = c.getContext('2d');
      q.fillStyle = '#e8edee';
      q.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * 256,
          w = 2 + rnd() * 10;
        const g = q.createLinearGradient(x - w, 0, x + w, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, `rgba(${rnd() < 0.5 ? '255,255,255' : '150,165,170'},${0.25 + rnd() * 0.35})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        q.fillStyle = g;
        q.fillRect(x - w, 0, 2 * w, 256);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    })();
    const foil = patchSV(
      new THREE.MeshStandardMaterial({
        map: ft,
        color: 0xf2f6f7,
        roughness: 0.32,
        metalness: 0,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const tent = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h + 0.01, d + 0.02), foil);
    tent.position.copy(V(x, y, h / 2 + 0.01));
    tent.renderOrder = 2;
    tent.userData.noMerge = true;
    scene.add(tent);
    FT.foil = tent;
    for (let i = 0; i < 3; i++)
      B(
        x - w / 2 + 0.1,
        x + w / 2 - 0.1,
        y - d / 2 + 0.1 + i * 0.22,
        y - d / 2 + 0.13 + i * 0.22,
        0.12,
        0.15,
        M.steel,
        { col: false }
      ); // slatted rack inside
    for (const dx of [-0.32, 0.32])
      B(x + dx - 0.006, x + dx + 0.006, y + d / 2 + 0.006, y + d / 2 + 0.014, 0.05, h - 0.06, M.black, { col: false }); // zip door to the north
    B(x - 0.32, x + 0.32, y + d / 2 + 0.006, y + d / 2 + 0.014, h - 0.066, h - 0.054, M.black, { col: false });
    {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const q = c.getContext('2d');
      q.fillStyle = '#f2c414';
      q.beginPath();
      q.moveTo(64, 8);
      q.lineTo(122, 112);
      q.lineTo(6, 112);
      q.closePath();
      q.fill();
      q.lineWidth = 8;
      q.strokeStyle = '#111';
      q.stroke();
      q.fillStyle = '#111';
      q.font = '700 64px system-ui, sans-serif';
      q.textAlign = 'center';
      q.fillText('!', 64, 100);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const me = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 0.16),
        plain({ map: t, transparent: true, alphaTest: 0.5, roughness: 0.6 })
      );
      me.position.copy(V(x + 0.42, y + d / 2 + 0.02, h - 0.18));
      me.rotation.y = Math.PI;
      scene.add(me);
    }
    COL.push([x - w / 2 - 0.03, x + w / 2 + 0.03, y - d / 2 - 0.03, y + d / 2 + 0.03, 0, h, 'tent', null, null]);
  }
  WORKS.FT = FT;
  // sawn boards with stickers in the west bay
  {
    const x0 = -6.3,
      x1 = -4.65,
      y0 = -40.42,
      y1 = -39.6;
    for (let k = 0; k < 7; k++) {
      const z = 0.1 + k * 0.065;
      for (const x of [x0 + 0.1, (x0 + x1) / 2, x1 - 0.1])
        B(x - 0.02, x + 0.02, y0, y1, z - 0.025, z, M.fresh, { col: false, cast: false });
      for (let j = 0; j < 4; j++) {
        const ya = y0 + (j * (y1 - y0)) / 4 + 0.008;
        B(x0, x1, ya, ya + (y1 - y0) / 4 - 0.016, z, z + 0.04, M.fresh, { col: false, grain: 'x' });
      }
    }
    B(x0 - 0.02, x1 + 0.02, y0 - 0.02, y1 + 0.02, 0.04, 0.075, M.dark, { col: false });
    COL.push([x0, x1, y0, y1, 0, 0.6, 'stack', null, null]);
  }
  // sawdust under the sawmill and the machines
  // (V15b: soft-edged patches – a speckled, fading texture instead of hard discs)
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const q = c.getContext('2d');
    const id = q.createImageData(256, 256),
      d = id.data;
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const dx = (x - 128) / 128,
          dy = (y - 128) / 128,
          r =
            Math.hypot(dx, dy) *
            (1 + 0.18 * Math.sin(Math.atan2(dy, dx) * 5 + 1.3) + 0.1 * Math.sin(Math.atan2(dy, dx) * 11)),
          n = rnd();
        const a = Math.max(0, Math.min(1, (1 - r) * 2.2)) * (0.55 + 0.45 * n);
        const i = (y * 256 + x) * 4,
          k = 0.85 + 0.25 * n;
        d[i] = 214 * k;
        d[i + 1] = 186 * k;
        d[i + 2] = 140 * k;
        d[i + 3] = a * 255 * (r > 0.55 ? (n > 0.45 ? 1 : 0.25) : 1);
      }
    q.putImageData(id, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const dm = plain({
      map: t,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    DUST.mat = dm;
    DUST.patch = (x, y, r, z, parent) => {
      const me = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), dm);
      me.rotation.x = -Math.PI / 2;
      me.rotation.z = rnd() * 6.28;
      me.position.copy(V(x, y, z));
      me.scale.set(1, 0.65 + rnd() * 0.35, 1);
      me.receiveShadow = true;
      me.renderOrder = 1;
      (parent || scene).add(tagPh(me));
      return me;
    };
    for (const [x, y, r, z] of SAW.dust) {
      phase(null); // under the band sawmill: in its group, in every phase
      DUST.patch(x, y, r, z, SAWG);
      phase(SAW_PH);
    }
    for (const [x, y, r, z] of [
      [-4.5, -37.7, 0.5, 0.043],
      [-1.5, -37.65, 0.42, 0.043],
      [0.85, -37.0, 0.42, 0.043],
      [2.6, -37.5, 0.45, 0.043],
      [-5.7, -38.0, 0.35, 0.043],
    ])
      DUST.patch(x, y, r, z);
  }
  // --- logs to the right (west), stacked on two sleepers; chopping block with axe ---
  {
    const xa = -10.65,
      xb = -7.15;
    for (const x of [xa + 0.45, xb - 0.45]) B(x - 0.08, x + 0.08, -40.35, -37.25, 0, 0.14, M.dark, { col: false });
    const rows = [
      [0.23, 4],
      [0.2, 3],
      [0.18, 2],
    ];
    let z = 0.14;
    const ys = [];
    rows.forEach(([r, n], k) => {
      const span = n * 2 * r * 1.02,
        yc = -38.8;
      for (let i = 0; i < n; i++) {
        const rr2 = r * (0.9 + rnd() * 0.2),
          y = yc - span / 2 + r * 1.02 + i * 2 * r * 1.02,
          x0 = xa + rnd() * 0.25,
          x1 = xb - rnd() * 0.25;
        hcyl(x0, x1, y, z + rr2, rr2, [MAT.logs, MAT.logEnd, MAT.logEnd], 18);
      }
      z += r * 1.7;
    });
    COL.push([xa, xb, -40.4, -37.2, 0, 1.0, 'logs', null, null]);
    const cx = -7.4,
      cy = -36.25;
    cyl(cx, cy, 0, 0.48, 0.27, [MAT.logs, MAT.logEnd, MAT.logEnd], 18);
    placeGLB('axe', { x: cx + 0.45, y: cy + 0.05, z: 0, face: 90, col: false });
    placeGLB('sledge', { x: PX[0] - 0.12, y: YF + 0.12, z: 0.04, face: 0, col: false });
  }
  // --- hand tools on benches and wall, tool chest, stool ---
  placeGLB('vice', { x: -0.05, y: BY1 - 0.12, z: BZ, face: 180, col: false });
  placeGLB('handplane', { x: -1.68, y: -40.15, z: BZ, face: 8, col: false });
  placeGLB('mallet', { x: -1.62, y: -40.38, z: BZ, face: 0, col: false });
  placeGLB('screwdrivers', { x: -4.22, y: -40.36, z: 0.86, face: 90, col: false });
  placeGLB('drill', { x: -1.62, y: -39.9, z: BZ, face: 200, col: false });
  placeGLB('handdrill', { x: -0.25, y: YB + 0.14, z: 1.45, face: 180, col: false });
  placeGLB('toolchest', { x: 0.55, y: -40.25, z: 0.04, face: 180, colPad: 0.02 });
  placeGLB('wstool', { x: -5.55, y: -39.2, z: 0.04, face: 20, colPad: 0.02 });
  // yard clutter: stacked crates and a ladder at the east end, compost bags with a spade by the annex
  placeGLB('crate', { x: 5.45, y: -36.95, z: 0, face: 10 });
  placeGLB('crate', { x: 5.47, y: -36.97, z: 0.255, face: 4, col: false });
  placeGLB('ladder', { x: 5.05, y: -38.2, z: 0, face: 270, col: false });
  placeGLB('compost', { x: -8.6, y: -36.3, z: 0, face: 0 });
  placeGLB('spade', { x: -7.35, y: -36.15, z: 0, face: 25, col: false });
  // meshes made without tagPh (custom roof and machine meshes), colliders and walk surfaces pushed by hand carry no phase: they belong to
  // the hall too – except the band sawmill and the generator, which are there in every phase (moved by WORKS.layout)
  {
    const keep = new Set([SAWG, GENG]),
      keepCol = new Set([...SAW.cols, ...GEN.cols]);
    for (let i = N0; i < scene.children.length; i++)
      if (!keep.has(scene.children[i]))
        scene.children[i].traverse(o => {
          if (o.userData.ph === undefined) o.userData.ph = SAW_PH;
        });
    for (let i = C0; i < COL.length; i++) if (COL[i][7] == null && !keepCol.has(i)) COL[i][7] = SAW_PH;
    for (let i = W0; i < WALK.length; i++) if (WALK[i][6] == null) WALK[i][6] = SAW_PH;
  }
  // ---- today (phase 0 only): the open lean-to of the photos of 26.10.2026 (IMG_7270–7294), seen from the garden from left (east) to right:
  //      an annex under translucent corrugated sheets with the drum sander (Holzmann ZS 640P) under a blue tarpaulin and clear foil weighed
  //      down with roof tiles, behind it the bench with the worn top, the black filing cabinet, sanding discs and a clock on the wall; the
  //      lean-to proper (timber posts, mono-pitch roof of dark corrugated sheets falling to the back, plywood back wall with tool boards):
  //      in its east bay the band sawmill's head between the front posts (above), behind it the grey drawer cabinet and the white bench
  //      with the end-grain blanks; in its west bay the table saw on its folding stand in front of the L-shaped plywood bench. West of it a
  //      worktable, the generator under a table top, the offcuts under a blue tarpaulin on a frame, the wheelbarrow ----
  phase(0, SAW_PH);
  const T0 = {
    LX0: -5.6,
    LX1: -0.6,
    EX1: 1.2,
    LYB: -40.5,
    LYF: -38.0,
    // the table saw (blade, table height), the drum sander (feed east → west, the operator on the east side)
    ts: { cx: -4.1, cy: -38.85, by: -38.88, z: 0.9, blade: null },
    sd: { x0: -0.05, x1: 0.7, y0: -39.4, y1: -38.8, z: 0.72 },
    covers: {},
  };
  WORKS.T0 = T0;
  {
    const { LX0, LX1, EX1, LYB, LYF } = T0,
      ZF = 2.35,
      ZB = 1.98,
      ZF2 = 2.2,
      ZB2 = 1.88;
    const ply = plain({ color: 0xc9a979, roughness: 0.85 }),
      grey = plain({ color: 0xb9bcbe, roughness: 0.6, metalness: 0.2 }),
      white = plain({ color: 0xe6e6e0, roughness: 0.6 }),
      worn = plain({ color: 0x70463a, roughness: 0.75 }),
      clear = plain({ color: 0xe4ecec, roughness: 0.3, transparent: true, opacity: 0.42, depthWrite: false }),
      foil = plain({ color: 0xf2f5f5, roughness: 0.25, transparent: true, opacity: 0.55, depthWrite: false }),
      green = plain({ color: 0x3b9d86, roughness: 0.7 }),
      tile = plain({ color: 0x9e5136, roughness: 0.85 }),
      alu = plain({ color: 0xc4c8ca, metalness: 0.6, roughness: 0.4 });
    const colBox = (x0, x1, y0, y1, z1, tag) => COL.push([x0, x1, y0, y1, 0, z1, tag, 0, SAW_PH]);
    const legs = (x0, x1, y0, y1, z, m, d = 0.03) => {
      for (const x of [x0 + d, x1 - d])
        for (const y of [y0 + d, y1 - d]) B(x - d, x + d, y - d, y + d, 0, z, m, { col: false });
    };
    // --- floor: concrete pavers, sawdust where the machines stand ---
    B(LX0 - 0.1, EX1 + 0.05, LYB - 0.05, LYF + 0.2, -0.02, 0.012, M.pavers, { walk: 'stone', cast: false, grain: 'x' });
    for (const [x, y, r] of [
      [-4.1, -38.6, 0.5],
      [-4.6, -38.9, 0.35],
      [0.0, -39.0, 0.45],
      [-2.0, -38.4, 0.4],
    ])
      DUST.patch(x, y, r, 0.016);
    // --- the lean-to proper: three posts in front and at the back, rafters, the dark corrugated roof ---
    for (const x of [LX0 + 0.06, (LX0 + LX1) / 2, LX1 - 0.06]) {
      B(x - 0.05, x + 0.05, LYF - 0.05, LYF + 0.05, 0, ZF, MAT.kvh, { grain: 'z' });
      B(x - 0.05, x + 0.05, LYB - 0.05, LYB + 0.05, 0, ZB, MAT.kvh, { grain: 'z' });
      beam([x, LYF + 0.35, ZF + 0.02], [x, LYB - 0.3, ZB - 0.02], 0.06, 0.12, MAT.kvh);
    }
    B(LX0, LX1, LYF - 0.06, LYF + 0.06, ZF - 0.14, ZF, MAT.kvh, { grain: 'x', col: false });
    B(LX0, LX1, LYB - 0.06, LYB + 0.06, ZB - 0.12, ZB, MAT.kvh, { grain: 'x', col: false });
    for (let x = LX0 - 0.3; x < LX1 + 0.3; x += 0.9)
      beam([x + 0.45, LYF + 0.4, ZF + 0.1], [x + 0.45, LYB - 0.35, ZB + 0.06], 0.92, 0.02, MAT.corr, { cast: true });
    // back wall and the west end of plywood (the west end open towards the front)
    B(LX0, EX1, LYB - 0.03, LYB + 0.0, 0, ZB, ply, { grain: 'x' });
    B(LX0 - 0.03, LX0, LYB, LYF - 0.75, 0, ZB, ply, { grain: 'y' });
    // --- the annex to the east: lower, under translucent corrugated sheets ---
    for (const y of [LYF, LYB])
      B(EX1 - 0.1, EX1, y - 0.05, y + 0.05, 0, y === LYF ? ZF2 : ZB2, MAT.kvh, { grain: 'z' });
    B(LX1, EX1, LYF - 0.05, LYF + 0.05, ZF2 - 0.12, ZF2, MAT.kvh, { grain: 'x', col: false });
    for (const x of [LX1 + 0.55, EX1 - 0.05])
      beam([x, LYF + 0.3, ZF2 + 0.02], [x, LYB - 0.25, ZB2 - 0.02], 0.05, 0.1, MAT.kvh, { cast: true });
    beam(
      [(LX1 + EX1) / 2, LYF + 0.32, ZF2 + 0.08],
      [(LX1 + EX1) / 2, LYB - 0.28, ZB2 + 0.04],
      EX1 - LX1 + 0.3,
      0.012,
      clear,
      {
        cast: false,
      }
    );
    // --- west bay: the L-shaped plywood bench (back wall and west end), a green crate and a black box below, the tool board ---
    {
      const z = 0.82;
      B(LX0 + 0.03, -3.75, LYB + 0.03, LYB + 0.66, z - 0.03, z, ply, { grain: 'x' });
      B(LX0 + 0.03, LX0 + 0.65, LYB + 0.66, -38.78, z - 0.03, z, ply, { grain: 'y' });
      legs(LX0 + 0.03, -3.75, LYB + 0.03, LYB + 0.66, z - 0.03, MAT.kvh, 0.03);
      legs(LX0 + 0.03, LX0 + 0.65, LYB + 0.66, -38.78, z - 0.03, MAT.kvh, 0.03);
      B(LX0 + 0.05, -3.8, LYB + 0.05, LYB + 0.62, 0.2, 0.22, ply, { col: false });
      colBox(LX0 + 0.03, -3.75, LYB + 0.03, LYB + 0.66, z, 'bench');
      colBox(LX0 + 0.03, LX0 + 0.65, LYB + 0.66, -38.78, z, 'bench');
      B(LX0 + 0.1, LX0 + 0.55, -39.6, -39.22, 0.0, 0.28, green, { col: false }); // crate
      B(-4.55, -4.05, LYB + 0.1, LYB + 0.5, 0.0, 0.34, M.black, { col: false }); // black box
      // tool board: wire baskets with the cordless drills, a hand brush, a spirit level; F-clamps on the end wall
      B(-5.45, -3.85, LYB, LYB + 0.02, 1.05, 1.8, MAT.osb, { col: false });
      for (const x of [-5.2, -4.55]) {
        B(x - 0.2, x + 0.2, LYB + 0.02, LYB + 0.2, 1.3, 1.31, alu, { col: false });
        B(x - 0.2, x + 0.2, LYB + 0.19, LYB + 0.2, 1.31, 1.4, alu, { col: false });
      }
      placeGLB('drill', { x: -5.2, y: LYB + 0.11, z: 1.31, face: 90, col: false });
      placeGLB('drill', { x: -4.55, y: LYB + 0.11, z: 1.31, face: 70, col: false });
      B(-4.15, -4.11, LYB + 0.02, LYB + 0.06, 1.05, 1.65, M.yellow, { col: false });
      for (let i = 0; i < 4; i++) {
        const y = -39.9 + i * 0.18;
        B(LX0 + 0.0, LX0 + 0.02, y - 0.01, y + 0.01, 1.2, 1.75, M.steel, { col: false });
        B(LX0 + 0.02, LX0 + 0.06, y - 0.03, y + 0.03, 1.66, 1.72, M.red, { col: false });
        B(LX0 + 0.02, LX0 + 0.06, y - 0.03, y + 0.03, 1.28 + (i % 2) * 0.08, 1.34 + (i % 2) * 0.08, M.red, {
          col: false,
        });
      }
      placeGLB('screwdrivers', { x: -4.6, y: LYB + 0.2, z: z, face: 90, col: false });
    }
    // --- the table saw on its folding stand (feed from the east, sliding table to the north) ---
    {
      const { cx, cy, by, z } = T0.ts;
      for (const x of [cx - 0.36, cx + 0.36])
        for (const [y0, y1] of [
          [cy - 0.34, cy - 0.14],
          [cy + 0.34, cy + 0.14],
        ])
          beam([x, y0, 0], [x, y1, 0.58], 0.035, 0.035, M.steel);
      for (const y of [cy - 0.16, cy + 0.16])
        B(cx - 0.42, cx + 0.42, y - 0.025, y + 0.025, 0.56, 0.62, M.yellow, { col: false });
      B(cx - 0.42, cx + 0.42, cy - 0.16, cy + 0.16, 0.6, 0.62, M.black, { col: false });
      B(cx - 0.27, cx + 0.27, cy - 0.22, cy + 0.22, 0.62, z - 0.05, M.dark, { col: false }); // the saw's body
      B(cx - 0.33, cx + 0.33, cy - 0.26, cy + 0.26, z - 0.05, z, M.machineL, { col: false, grain: 'x' }); // cast table
      B(cx - 0.4, cx + 0.4, cy + 0.26, cy + 0.42, z - 0.04, z - 0.01, M.machineL, { col: false }); // sliding table
      B(cx - 0.4, cx + 0.4, cy + 0.42, cy + 0.45, z - 0.01, z + 0.05, M.dark, { col: false });
      B(cx - 0.36, cx + 0.36, by - 0.12, by - 0.09, z, z + 0.06, M.dark, { col: false }); // rip fence south of the blade
      {
        const me = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.003, 36), M.blade);
        me.rotation.x = Math.PI / 2;
        me.position.copy(V(cx - 0.03, by, z + 0.055 - 0.105));
        me.castShadow = true;
        me.userData.noMerge = true;
        scene.add(tagPh(me));
        T0.ts.blade = me;
      }
      B(cx + 0.02, cx + 0.15, by - 0.002, by + 0.002, z, z + 0.08, M.dark, { col: false }); // riving knife
      B(cx - 0.2, cx + 0.2, by - 0.05, by + 0.05, z + 0.12, z + 0.18, M.machineL, { col: false }); // guard
      B(cx + 0.27, cx + 0.31, cy - 0.12, cy - 0.02, 0.7, 0.8, M.red, { col: false }); // switch
      cyl(cx - 0.1, cy + 0.2, 0.55, 0.75, 0.04, M.black, 10, undefined, { col: false }); // dust port
      colBox(cx - 0.43, cx + 0.43, cy - 0.36, cy + 0.46, z + 0.05, 'machine');
      B(cx - 0.2, cx + 0.2, cy - 0.13, cy + 0.13, 0.0, 0.2, M.black, { col: false }); // a tool case under the stand
      B(cx - 0.05, cx + 0.05, cy - 0.14, cy - 0.13, 0.12, 0.17, M.orange, { col: false });
    }
    // F-clamps hanging on the middle front post, beside the mill's head (IMG_7290)
    for (let i = 0; i < 3; i++) {
      const x = (LX0 + LX1) / 2 - 0.07,
        y = LYF - 0.03 + i * 0.03;
      B(x - 0.008, x + 0.008, y - 0.008, y + 0.008, 1.05 + i * 0.06, 1.62, M.steel, { col: false });
      B(x - 0.02, x + 0.02, y - 0.015, y + 0.015, 1.52, 1.58, M.red, { col: false });
      B(x - 0.02, x + 0.02, y - 0.015, y + 0.015, 1.12 + i * 0.06, 1.18 + i * 0.06, M.orange, { col: false });
    }
    // --- east bay: the white bench with the end-grain blanks (and the stock of glued panels) below, clamps and a shelf above ---
    {
      const x0 = -3.0,
        x1 = -1.5,
        y0 = LYB + 0.03,
        y1 = LYB + 0.63,
        z = 0.86;
      legs(x0, x1, y0, y1, z - 0.03, white, 0.025);
      B(x0, x1, y0, y1, z - 0.03, z, ply, { grain: 'x' });
      B(x0 + 0.03, x1 - 0.03, y0 + 0.03, y1 - 0.03, 0.18, 0.2, white, { col: false });
      colBox(x0, x1, y0, y1, z, 'bench');
      // end-grain blanks of Klingenholz stacked at the east end of the lower shelf
      for (let k = 0; k < 6; k++)
        B(
          -1.95,
          -1.6,
          y0 + 0.08,
          y0 + 0.45,
          0.2 + k * 0.042,
          0.2 + k * 0.042 + 0.04,
          k % 2 ? M.oil : DUST.eg || M.oil,
          {
            col: false,
          }
        );
      // tool board with F-clamps and a saw, the shelf for finished boards above
      B(x0 + 0.05, x1 - 0.05, LYB, LYB + 0.02, 1.0, 1.42, MAT.osb, { col: false });
      for (let i = 0; i < 6; i++) {
        const x = x0 + 0.18 + i * 0.22;
        B(x - 0.01, x + 0.01, LYB + 0.03, LYB + 0.05, 1.02, 1.4, M.steel, { col: false });
        B(x - 0.012, x + 0.07, LYB + 0.02, LYB + 0.06, 1.34, 1.39, M.red, { col: false });
        B(x - 0.012, x + 0.07, LYB + 0.02, LYB + 0.06, 1.08 + (i % 3) * 0.05, 1.13 + (i % 3) * 0.05, M.black, {
          col: false,
        });
      }
      B(x0 + 0.05, x1 - 0.05, LYB + 0.0, LYB + 0.3, 1.5, 1.53, ply, { col: false });
      for (const x of [x0 + 0.1, x1 - 0.1]) B(x - 0.015, x + 0.015, LYB, LYB + 0.28, 1.38, 1.5, M.dark, { col: false });
    }
    // --- the grey drawer cabinet (two units stacked), the glue bucket on it ---
    {
      B(-1.45, -0.9, LYB + 0.05, LYB + 0.6, 0, 1.08, grey);
      for (let i = 1; i < 6; i++)
        B(-1.43, -0.92, LYB + 0.6, LYB + 0.61, i * 0.18 - 0.005, i * 0.18 + 0.005, M.dark, { col: false });
      for (let i = 0; i < 6; i++)
        B(-1.25, -1.1, LYB + 0.61, LYB + 0.63, 0.1 + i * 0.18, 0.12 + i * 0.18, alu, { col: false });
      cyl(-1.1, LYB + 0.25, 1.08, 1.28, 0.12, white, 18, 0.11, { col: false }); // Holzleim D3
      cyl(-1.33, LYB + 0.18, 1.08, 1.27, 0.035, white, 12, undefined, { col: false });
      B(-0.93, -0.88, LYB + 0.5, LYB + 0.58, 0.05, 1.1, M.yellow, { col: false }); // spirit level leaning on it
    }
    // --- the annex: the bench with the worn top, the black filing cabinet, sanding discs, a clock, a green basket below ---
    {
      const x0 = -0.82,
        x1 = EX1 - 0.12,
        y0 = LYB + 0.03,
        y1 = LYB + 0.65,
        z = 0.86;
      legs(x0, x1, y0, y1, z - 0.04, MAT.kvh, 0.03);
      B(x0, x1, y0, y1, z - 0.04, z, worn, { grain: 'x' });
      B(x0 + 0.04, x1 - 0.04, y0 + 0.04, y1 - 0.04, 0.16, 0.18, ply, { col: false });
      colBox(x0, x1, y0, y1, z, 'bench');
      B(x1 - 0.5, x1 - 0.06, y0 + 0.02, y0 + 0.47, z, z + 0.7, M.black, { col: false }); // filing cabinet
      for (let i = 1; i < 6; i++)
        B(x1 - 0.5, x1 - 0.06, y0 + 0.47, y0 + 0.48, z + i * 0.12, z + i * 0.12 + 0.006, M.dark, { col: false });
      B(-0.75, -0.52, y0 + 0.08, y0 + 0.4, 0.18, 0.4, green, { col: false }); // basket
      cyl(-0.3, y0 + 0.3, 0.18, 0.62, 0.08, white, 14, undefined, { col: false }); // paper roll
      placeGLB('vice', { x: -0.62, y: y1 - 0.1, z, face: 180, col: false });
      const disc = new THREE.CircleGeometry(0.075, 20);
      for (let i = 0; i < 8; i++) {
        const me = new THREE.Mesh(disc, green);
        me.position.copy(V(-0.5 + (i % 4) * 0.19, LYB + 0.012, 1.18 + Math.floor(i / 4) * 0.2));
        scene.add(tagPh(me));
      }
      B(-0.05, 0.25, LYB, LYB + 0.04, 1.72, 1.84, M.black, { col: false }); // the clock
      B(0.0, 0.2, LYB + 0.04, LYB + 0.045, 1.74, 1.82, plain({ color: 0xa9b8a2, roughness: 0.3, emissive: 0x1c2a1c }), {
        col: false,
      });
    }
    // --- the drum sander Holzmann ZS 640P (Falko: „ZS 560“; the photo IMG_7285 reads ZS 640P): red base, grey drum hood, conveyor tables
    //     east and west, the plate on the east side, where one stands to feed it ---
    {
      const { x0, x1, y0, y1, z } = T0.sd;
      B(x0, x1, y0, y1, 0, z - 0.04, M.red); // base cabinet
      B(x0 - 0.3, x1 + 0.3, y0 + 0.1, y1 - 0.1, z - 0.04, z, M.dark, { col: false }); // conveyor bed
      B(x0 + 0.08, x1 - 0.08, y0 - 0.02, y1 + 0.02, z + 0.02, z + 0.36, M.machineL, { col: false }); // drum hood
      B(x0 + 0.05, x1 - 0.05, y0 - 0.04, y1 + 0.04, z + 0.36, z + 0.42, M.red, { col: false });
      hcyl(x0 + 0.1, x1 - 0.1, y1 + 0.12, z + 0.22, 0.09, M.red, 14); // the motor on the north side
      cyl((x0 + x1) / 2, y0 + 0.15, z + 0.42, z + 0.58, 0.05, M.black, 12, undefined, { col: false }); // dust port
      {
        const tor = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.01, 8, 20), M.steel);
        tor.rotation.x = Math.PI / 2;
        tor.position.copy(V(x1 - 0.18, (y0 + y1) / 2, z + 0.47));
        scene.add(tagPh(tor)); // height crank
      }
      {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 128;
        const q = c.getContext('2d');
        q.fillStyle = '#a3241c';
        q.fillRect(0, 0, 256, 128);
        q.fillStyle = '#f4f4f0';
        q.fillRect(96, 8, 64, 60);
        q.fillStyle = '#c0281f';
        q.font = '700 13px system-ui, sans-serif';
        q.textAlign = 'center';
        q.fillText('HOLZMANN', 128, 26);
        q.fillStyle = '#333';
        q.font = '600 8px system-ui, sans-serif';
        q.fillText('MASCHINEN', 128, 58);
        q.fillStyle = '#161616';
        q.font = '800 30px system-ui, sans-serif';
        q.fillText('ZS 640P', 128, 106);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = ANISO;
        const me = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), plain({ map: t, roughness: 0.6 }));
        me.position.copy(V(x1 + 0.003, (y0 + y1) / 2, 0.36));
        me.rotation.y = Math.PI / 2;
        scene.add(tagPh(me));
      }
      colBox(x0 - 0.3, x1 + 0.3, y0 - 0.05, y1 + 0.25, z + 0.45, 'machine');
      // its cover: the blue tarpaulin, clear foil on top weighed down with three roof tiles and a brick; taken off: folded on the floor
      const cv = (T0.covers.sander = new THREE.Group());
      cv.userData.mergeRoot = 'werkstatt:cover:sander';
      scene.add(cv);
      const PC = o => Object.assign({ parent: cv, col: false }, o);
      // (over the motor on the north side and the dust port on top)
      drape(x0 - 0.36, x1 + 0.36, y0 - 0.14, y1 + 0.27, 0.3, z + 0.62, cv, {
        seed: 5,
        flare: 0.06,
        folds: 0.03,
        sag: 0.015,
        hem: 0.2,
      });
      B(x0 - 0.2, x1 + 0.2, y0 - 0.02, y1 + 0.06, z + 0.6, z + 0.62, foil, PC());
      for (const [x, y, a] of [
        [x0 + 0.12, y0 + 0.2, 0.3],
        [(x0 + x1) / 2 + 0.05, y1 - 0.15, -0.2],
        [x1 - 0.05, y0 + 0.25, 0.1],
      ]) {
        const me = B(x - 0.13, x + 0.13, y - 0.19, y + 0.19, z + 0.62, z + 0.65, tile, PC());
        if (me) me.rotation.y = a;
      }
      B(x0 + 0.25, x0 + 0.49, y0 + 0.02, y0 + 0.13, z + 0.62, z + 0.7, tile, PC()); // the brick
      const fd = (T0.covers.sanderOff = new THREE.Group());
      fd.userData.mergeRoot = 'werkstatt:cover:sanderOff';
      scene.add(fd);
      B(EX1 - 0.55, EX1 - 0.15, LYF - 0.45, LYF - 0.15, 0, 0.1, M.tarp, { parent: fd, col: false });
      for (let i = 0; i < 3; i++)
        B(EX1 - 0.5, EX1 - 0.24, LYF - 0.42, LYF - 0.18, 0.1 + i * 0.03, 0.13 + i * 0.03, tile, {
          parent: fd,
          col: false,
        });
    }
    // --- in front: a white storage box, the tripod work light beside the mill's head ---
    B(-0.6, -0.2, -38.5, -38.18, 0, 0.3, white, { col: false });
    {
      const [x, y] = [-2.95, -38.45];
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 + 0.3;
        beam([x + Math.cos(a) * 0.32, y + Math.sin(a) * 0.32, 0], [x, y, 0.55], 0.015, 0.015, M.black, { cast: false });
      }
      cyl(x, y, 0.5, 1.75, 0.012, M.black, 6, undefined, { col: false });
      B(x - 0.12, x + 0.12, y - 0.04, y + 0.04, 1.62, 1.8, M.black, { col: false });
    }
    // --- protective gear on hooks at the back wall between the plywood bench and the white bench ---
    {
      const x = -3.4;
      B(x - 0.25, x + 0.25, LYB, LYB + 0.02, 1.1, 1.7, ply, { col: false });
      for (const dx of [-0.05, 0.05])
        cyl(x - 0.12 + dx, LYB + 0.06, 1.48, 1.58, 0.035, plain({ color: 0xd8a21a, roughness: 0.5 }), 14, undefined, {
          col: false,
        });
      B(
        x + 0.02,
        x + 0.14,
        LYB + 0.03,
        LYB + 0.08,
        1.5,
        1.56,
        plain({ color: 0x9fc6d8, roughness: 0.15, transparent: true, opacity: 0.6 }),
        {
          col: false,
        }
      ); // goggles
      B(x - 0.18, x - 0.06, LYB + 0.03, LYB + 0.1, 1.2, 1.28, white, { col: false }); // masks
      B(x + 0.04, x + 0.16, LYB + 0.03, LYB + 0.1, 1.18, 1.27, plain({ color: 0x3b5fb0, roughness: 0.6 }), {
        col: false,
      }); // gloves
    }
    // --- buckets by the white bench: water with the sponge, galvanised for oily rags ---
    cyl(-1.68, -39.62, 0.0, 0.28, 0.14, plain({ color: 0x2c64a8, roughness: 0.45 }), 18, 0.12, { col: false });
    {
      const w = new THREE.Mesh(
        new THREE.CircleGeometry(0.125, 18),
        plain({ color: 0x5a7a86, roughness: 0.08, metalness: 0.2 })
      );
      w.rotation.x = -Math.PI / 2;
      w.position.copy(V(-1.68, -39.62, 0.24));
      scene.add(tagPh(w));
    }
    cyl(-1.68, -39.28, 0.0, 0.32, 0.13, plain({ color: 0xa3a9a8, metalness: 0.75, roughness: 0.35 }), 18, 0.12, {
      col: false,
    });
    // --- the cable from the generator to the lean-to ---
    beam([-6.95, -39.2, 0.02], [-5.6, -38.7, 0.02], 0.012, 0.012, M.black, { cast: false });
    beam([-5.6, -38.7, 0.02], [-4.4, -38.55, 0.02], 0.012, 0.012, M.black, { cast: false });
    // --- west of the lean-to: a worktable, the table top over the generator, the offcuts under a tarpaulin on a frame, the wheelbarrow ---
    {
      const x0 = -6.75,
        x1 = -5.85,
        y0 = -39.35,
        y1 = -38.7;
      legs(x0, x1, y0, y1, 0.84, MAT.kvh, 0.035);
      B(x0 - 0.03, x1 + 0.03, y0 - 0.03, y1 + 0.03, 0.84, 0.87, ply, { grain: 'x' });
      B(x0 + 0.04, x1 - 0.04, y0 + 0.04, y1 - 0.04, 0.2, 0.22, ply, { col: false });
      colBox(x0 - 0.03, x1 + 0.03, y0 - 0.03, y1 + 0.03, 0.87, 'table');
      const g = [-7.27, -39.27];
      legs(g[0] - 0.48, g[0] + 0.48, g[1] - 0.38, g[1] + 0.38, 0.62, MAT.kvh, 0.03);
      B(g[0] - 0.5, g[0] + 0.5, g[1] - 0.4, g[1] + 0.4, 0.62, 0.64, ply, { grain: 'x' });
      colBox(g[0] - 0.5, g[0] + 0.5, g[1] - 0.4, g[1] + 0.4, 0.64, 'table');
    }
    {
      // offcuts on a pallet, the tarpaulin over a frame of white poles, falling to the west
      const x0 = -9.5,
        x1 = -7.9,
        y0 = -40.35,
        y1 = -38.75;
      B(x0 + 0.1, x1 - 0.1, y0 + 0.15, y1 - 0.15, 0, 0.14, MAT.plank);
      for (let i = 0; i < 9; i++) {
        const a = (i % 3) * 0.5 - 0.5,
          y = y0 + 0.3 + (i % 4) * 0.32,
          x = (x0 + x1) / 2 + ((i * 37) % 7) * 0.08 - 0.25,
          L = 0.6 + (i % 3) * 0.25;
        beam(
          [x - Math.cos(a) * L * 0.5, y - Math.sin(a) * L * 0.5, 0.18 + (i % 3) * 0.06],
          [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5, 0.2 + (i % 2) * 0.1],
          0.1,
          0.025,
          i % 2 ? M.fresh : MAT.plank
        );
      }
      for (const [x, y, h] of [
        [x0, y0, 0.75],
        [x0, y1, 0.75],
        [x1, y0, 1.05],
        [x1, y1, 1.05],
      ])
        cyl(x, y, 0, h, 0.02, white, 8, undefined, { col: false });
      beam([x1 + 0.08, (y0 + y1) / 2, 1.06], [x0 - 0.1, (y0 + y1) / 2, 0.74], y1 - y0 + 0.3, 0.02, M.tarp);
      beam([x0 - 0.12, y0 - 0.12, 0.74], [x0 - 0.12, y0 - 0.12, 0.25], 0.5, 0.02, M.tarp, { cast: false });
      colBox(x0 - 0.1, x1 + 0.1, y0 - 0.1, y1 + 0.1, 1.06, 'stack');
    }
    {
      // the wheelbarrow: grey tub, blue frame, one wheel to the north
      const [x, y] = [-7.25, -36.85];
      B(x - 0.3, x + 0.3, y - 0.35, y + 0.3, 0.38, 0.62, alu, { col: false });
      B(x - 0.24, x + 0.24, y - 0.28, y + 0.24, 0.28, 0.38, alu, { col: false });
      for (const dx of [-0.24, 0.24]) {
        beam(
          [x + dx, y - 0.95, 0.62],
          [x + dx * 0.5, y + 0.5, 0.25],
          0.03,
          0.03,
          plain({ color: 0x2a46b0, roughness: 0.5 }),
          { cast: true }
        );
        beam(
          [x + dx, y - 0.2, 0.3],
          [x + dx, y - 0.25, 0.0],
          0.025,
          0.025,
          plain({ color: 0x2a46b0, roughness: 0.5 }),
          { cast: true }
        );
      }
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.09, 18), M.rubber);
      wh.rotation.z = Math.PI / 2;
      wh.position.copy(V(x, y + 0.52, 0.19));
      wh.castShadow = true;
      scene.add(tagPh(wh));
      colBox(x - 0.32, x + 0.32, y - 0.4, y + 0.7, 0.62, 'barrow');
    }
    {
      // east of the annex (IMG_7294): blue sacks, an aluminium frame leaning on them, a white box, a black bag
      const blue = plain({ color: 0x2f5fb4, roughness: 0.55 });
      for (const [x, y, s] of [
        [1.75, -40.15, 0.34],
        [2.2, -40.05, 0.3],
        [1.95, -39.6, 0.28],
      ])
        RB(x - s, x + s, y - s * 0.8, y + s * 0.8, 0, s * 1.6, 0.12, blue, { col: false });
      for (const dy of [-0.3, 0.3])
        beam([2.75, -39.85 + dy, 0], [2.45, -39.85 + dy, 1.35], 0.03, 0.04, alu, { cast: true });
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        beam([2.75 - 0.3 * t, -40.15, 1.35 * t], [2.75 - 0.3 * t, -39.55, 1.35 * t], 0.025, 0.025, alu);
      }
      B(2.9, 3.35, -39.3, -38.95, 0, 0.32, white, { col: false });
      RB(2.95, 3.4, -40.3, -39.9, 0, 0.42, 0.1, M.black, { col: false });
      colBox(1.4, 3.45, -40.45, -38.9, 0.6, 'junk');
    }
  }
  phase(null);
  // ---- the machines: switch on/off at the "door" button (E), sound, the saw head runs along the log ----
  // The band sawmill, the table saw and the drum sander are there in every phase (today in and before the lean-to, from phase 1 in and
  // at the hall): their door entries keep their key, their place follows the phase (WORKS.mpos, WORKS.layout); covered (phase 0, under the
  // tarpaulin) they cannot be switched on (`can`, game/walkable.js doorOn). The planer and the thicknesser come with the hall.
  const BOTH = new Set(['saw', 'tablesaw', 'sander']);
  for (const m of WORKS.machines) {
    if (m.hidden) continue;
    DOORS[m.key] = {
      key: m.key,
      kind: 'machine',
      label: m.label,
      group: null,
      t: 0,
      target: 0,
      pos: m.pos.slice(),
      r: m.r,
      z: m.z,
      ph: BOTH.has(m.key) ? null : SAW_PH,
      var: null,
      m,
      can: BOTH.has(m.key) ? () => !WORKS.covered(m.key) : undefined,
    };
  }
  WORKS.WX = [X0, X1, YB, YF];
  WORKS.noMerge = [SAW.head, T0.ts.blade];
  // ---- the phase's layout: [phase 0, phase ≥ SAW_PH] (workshop coordinates as built) ----
  const phNow = () => ((window.PHASE | 0) < SAW_PH ? 0 : 1);
  const TSH = (TS.y0 + TS.y1) / 2;
  const MPL = {
    tablesaw: {
      op: [
        [-3.3, -38.88],
        [TS.x1 + 0.55, TSH],
      ],
      snd: [
        [T0.ts.cx, T0.ts.cy],
        [-4.4, -38.05],
      ],
    },
    sander: {
      op: [
        [1.3, -39.1],
        [0.85, -36.75],
      ],
      snd: [
        [0.33, -39.1],
        [0.85, -38.0],
      ],
    },
    orb: {
      snd: [
        [-2.25, -40.1],
        [-0.9, -40.1],
      ],
    },
  };
  WORKS.phNow = phNow;
  WORKS.cov = { saw: true, sander: true }; // today the band sawmill and the drum sander stand under tarpaulins (saved by werk/werk.js)
  WORKS.covered = k => phNow() === 0 && !!WORKS.cov[k];
  WORKS.mpos = k => (k === 'saw' ? SAW.at(MX + 0.95, YS + 0.4) : MPL[k] ? MPL[k].op[phNow()] : null);
  WORKS.onLayout = []; // (ph) => …: other modules follow the phase's layout (werk/werk.js, werk/holz_saw.js, garden/workshop_lamp.js)
  function showCovers() {
    SAW.cover.visible = !!WORKS.cov.saw;
    SAW.folded.visible = !WORKS.cov.saw;
    T0.covers.sander.visible = !!WORKS.cov.sander;
    T0.covers.sanderOff.visible = !WORKS.cov.sander;
  }
  // put a tarpaulin on (the machine stops, the saw head goes home first) or take it off
  WORKS.setCover = (k, on) => {
    if (!(k in WORKS.cov)) return;
    WORKS.cov[k] = !!on;
    if (on && DOORS[k]) DOORS[k].target = 0;
    if (on && k === 'saw') {
      SAW.s = SAW.s0;
      SAW.dir = 1;
      SAW.head.position.z = -SAW.s;
    }
    showCovers();
    markDirty(true);
  };
  showCovers();
  const LAY = { ph: -1, tf: null };
  WORKS.layout = force => {
    const ph = phNow(),
      Bw = window.BUILD && BUILD.werkstatt,
      tf = Bw ? Bw.tf : null;
    if (!force && ph === LAY.ph && tf === LAY.tf) return false;
    const newPh = force || ph !== LAY.ph;
    LAY.ph = ph;
    LAY.tf = tf;
    if (newPh) {
      for (const X of [SAW, GEN]) {
        X.off = X.OFF[ph];
        const g = X.g;
        if (!g.userData.base) g.userData.base = g.position.clone();
        g.position.copy(g.userData.base).add(V(X.off[0], X.off[1], 0));
        g.updateMatrixWorld(true);
        for (const i of X.cols) {
          const e = COL[i];
          if (!e) continue;
          if (!e.b0) e.b0 = e.slice(0, 4);
          e[0] = e.b0[0] + X.off[0];
          e[1] = e.b0[1] + X.off[0];
          e[2] = e.b0[2] + X.off[1];
          e[3] = e.b0[3] + X.off[1];
        }
      }
      const gm = WORKS.machines.find(m => m.key === 'gen');
      if (gm) {
        gm.pos[0] = GEN.x + GEN.off[0];
        gm.pos[1] = GEN.y + 0.8 + GEN.off[1];
      }
      showCovers();
      for (const k of BOTH) if (DOORS[k]) DOORS[k].target = 0; // a machine of the other phase's place stops
      if (LATE.rebuildGrids) LATE.rebuildGrids();
      for (const f of WORKS.onLayout)
        try {
          f(ph);
        } catch (e) {
          console.warn('workshop layout', e);
        }
    }
    for (const k of BOTH) {
      const d = DOORS[k],
        p = WORKS.mpos(k);
      if (!d || !p) continue;
      const w = tf ? tf(p[0], p[1]) : p;
      d.pos = [w[0], w[1]];
    }
    markDirty(true);
    return true;
  };
  // sound: positional loops that spin up when switched on and run down when switched off; the saw blends idle and cutting
  const SND = {
    saw: { snd: 'saw_run', vol: 1.0, ref: 7 },
    saw2: { snd: 'saw_cut', vol: 0, ref: 7 },
    sander: { snd: 'sander', vol: 0.75, ref: 6 },
    planer: { snd: 'planer', vol: 0.95, ref: 7 },
    gen: { snd: 'generator', vol: 0.8, ref: 6 },
    ts: { snd: 'tablesaw_run', vol: 0.9, ref: 6 },
    ts2: { snd: 'tablesaw_cut', vol: 0, ref: 6 },
    th: { snd: 'thick_run', vol: 0.95, ref: 6 },
    th2: { snd: 'thick_cut', vol: 0, ref: 6 },
    orb: { snd: 'orbit', vol: 0.55, ref: 4 },
  };
  const sndSet = (k, on, x, y, vol) => {
    const S = SND[k];
    S.want = !!on;
    if (on) {
      if (!S.playing) {
        LATE.audio.loopAt(k, S.snd, x, y, { vol: vol ?? S.vol, ref: S.ref, rate: 0.5 });
        if (LATE.audio.hasLoop(k)) {
          S.playing = true;
          LATE.audio.loopRate(k, 1.0, 0.5);
        }
      } else {
        if (vol !== undefined) LATE.audio.loopVol(k, vol);
        LATE.audio.moveLoop(k, x, y);
      }
    } else if (S.playing) {
      S.playing = false;
      LATE.audio.loopRate(k, 0.4, 0.7);
      LATE.audio.stopLoop(k, 1.8);
    }
  };
  WORKS.sndOn = k => !!(SND[k] && SND[k].playing); // tests: a loop playing (only with the sound on)
  WORKS.sndWant = k => !!(SND[k] && SND[k].want); // tests: the loop wanted (also without sound, e.g. in the test browser)
  WORKS.update = dt => {
    let moved = WORKS.layout();
    const on = k => DOORS[k] && DOORS[k].target > 0.5,
      ph = phNow();
    const need = on('sander') || on('planer') || on('tablesaw') || on('thick') || !!WORKS.orbit;
    WORKS.genOn = need;
    const blade = ph === 0 ? T0.ts.blade : TS.blade;
    if (on('tablesaw') && blade) {
      blade.rotation.y += dt * 40;
      moved = true;
    }
    if (on('saw')) {
      const S = SAW,
        cutting = S.s > S.logY0 - 0.1 && S.s < S.logY1 + 0.1;
      S.s += S.dir * dt * (S.dir > 0 ? 0.32 : 0.9) * (WORKS.sawBoost || 1);
      if (S.s > S.s1) {
        S.s = S.s1;
        S.dir = -1;
      }
      if (S.s < S.s0) {
        S.s = S.s0;
        S.dir = 1;
      }
      S.head.position.z = -S.s; // in the mill's group (its frame: the workshop as built at the plan's place)
      for (const w of S.wheels) w.rotation.y += dt * 28;
      S.cut = cutting && S.dir > 0;
      moved = true;
    }
    try {
      const T = window.BUILD && BUILD.werkstatt ? BUILD.werkstatt.tf : (x, y) => [x, y],
        ps = T(...SAW.at(SAW.xc, SAW.s)),
        pd = T(...MPL.sander.snd[ph]),
        pp = T(2.6, -38.0),
        pg = T(GEN.x + GEN.off[0], GEN.y + GEN.off[1]);
      sndSet('saw', on('saw'), ps[0], ps[1], SAW.cut ? 0.35 : 1.0);
      sndSet('saw2', on('saw'), ps[0], ps[1], SAW.cut ? 1.1 : 0.0);
      sndSet('sander', on('sander'), pd[0], pd[1], WORKS.cut.sander ? 1.0 : 0.75);
      sndSet('planer', on('planer'), pp[0], pp[1]);
      sndSet('gen', need, pg[0], pg[1]);
      const pt = T(...MPL.tablesaw.snd[ph]),
        pth = T(-1.55, -38.05),
        pb = T(...MPL.orb.snd[ph]);
      const C = WORKS.cut;
      sndSet('ts', on('tablesaw'), pt[0], pt[1], C.tablesaw ? 0.45 : 0.9);
      sndSet('ts2', on('tablesaw'), pt[0], pt[1], C.tablesaw ? 1.1 : 0.0);
      sndSet('th', on('thick'), pth[0], pth[1], C.thick ? 0.5 : 0.95);
      sndSet('th2', on('thick'), pth[0], pth[1], C.thick ? 1.1 : 0.0);
      sndSet('orb', !!WORKS.orbit, pb[0], pb[1]);
    } catch (e) {}
    return moved;
  };
}
bldEnd();
