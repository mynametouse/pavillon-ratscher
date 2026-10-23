// ===================== INTERIOR =====================
// Shared by both variants: stove, bookcase, window seat, daybed, desk, lounge, piano, lamps. Per variant: reading corner (A: east corner,
// B: in front of the stove – the ladder takes the SE corner), sideboard (A: east wall, B: north wall), terrace furniture (terrace height differs).
// Variant B items get their own keys ('B:…') so the saved layouts of variant A keep matching.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LATE } from '../core/late.js';
import { KERN } from '../core/kern.js';
import { rnd, rr, scene, V, VARIANT, varOk } from '../core/head.js';
import { loadModel, markDirty, MODELS, patchSV, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, COL, cyl, itemCol, PH, PH_END, phase, PHN, RB, tagPh, VAR, varOff, varOn } from '../core/geo.js';
import { OG, OGB, RF, STV, T, TT, TW, zC, zD, zE, zF, zG, zO } from './house_base.js';
export const NW = 4 - T,
  IX0 = OG.x0 + T,
  IX1 = OG.x1 - T,
  IY0 = OG.y0 + T,
  IY1 = OG.y1 - T; // inner faces EG (north/east) and OG box (A)
export const IX1B = OGB.x1 - T; // OG east inner face (B)
phase(PHN.builtins);
// keys of placed models for the planner ('type#n', counted in load order; variant B 'B:type#n') – garden/garten_kit.js counts the garden
// buildings in their own range (keysBegin/keysEnd), so the keys saved furniture layouts refer to stay the same
export const ITEMKEY = { n: 0, nb: 0 };
export function placeGLB(id, { x, y, z, face = 0, h = null, w = null, col = true, colPad = 0, mat = null }, fallback) {
  const mm = MODELS[id];
  if (!mm) {
    if (fallback) fallback();
    return false;
  }
  const ph = PH,
    phEnd = PH_END,
    vv = VAR;
  const bb = mm.bbox || [0.6, 0.8, 0.6];
  const s = h ? h / bb[1] : w ? w / Math.max(bb[0], bb[2]) : 1;
  const th = ((face + (mm.front || 0)) * Math.PI) / 180,
    c = Math.abs(Math.cos(th)),
    sn = Math.abs(Math.sin(th));
  const fx = ((bb[0] * c + bb[2] * sn) * s) / 2 + colPad,
    fy = ((bb[0] * sn + bb[2] * c) * s) / 2 + colPad;
  const colIdx = col ? COL.length : null;
  if (col) COL.push([x - fx, x + fx, y - fy, y + fy, z, z + bb[1] * s, 'furn', PH, PH_END]);
  const key = vv === 'B' ? 'B:' + id + '#' + ++ITEMKEY.nb : id + '#' + ++ITEMKEY.n;
  const it = {
    kind: 'glb',
    type: id,
    x,
    y,
    z,
    rot: face,
    size: [bb[0] * s, bb[1] * s, bb[2] * s],
    colIdx,
    noCol: !col,
    ph,
    var: vv,
    root: null,
    orig: { x, y, z, rot: face },
    key,
  };
  (window.GLB_PLACED || (window.GLB_PLACED = [])).push(it);
  loadModel(
    id,
    root => {
      if (!root) {
        if (fallback) {
          const p0 = PH,
            p1 = PH_END;
          phase(ph, phEnd);
          if (vv) varOn(vv);
          fallback();
          if (vv) varOff();
          phase(p0, p1);
          if (window.rebuildGrids) LATE.rebuildGrids();
        }
        markDirty(true);
        return;
      }
      root.scale.setScalar(s);
      root.rotation.y = th;
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root),
        cc = box.getCenter(new THREE.Vector3());
      const tgt = V(x, y, z);
      root.position.set(tgt.x - cc.x, tgt.y - box.min.y, tgt.z - cc.z);
      root.userData.glb = id;
      if (ph !== null) {
        root.userData.ph = ph;
        if (phEnd !== null) root.userData.phEnd = phEnd;
      }
      if (vv) root.userData.var = vv;
      root.visible = (ph === null || (window.PHASE ?? 99) >= ph) && varOk(vv);
      scene.add(root);
      markDirty(true);
      it.root = root;
      root.userData.item = it;
      root.traverse(o => {
        o.userData.noMerge = true;
      });
      if (window.registerItem) LATE.registerItem(it);
    },
    mat
  );
  return true;
}
// built-in furniture as one movable planner item: everything fn builds becomes a group at its base centre (merged per item later, see 16_zmerge);
// its own colliders give way to one box collider of the item. Keys: 'grp:<name>' ('A:'/'B:' prefix inside a variant) – stable for saved layouts.
export function grpItem(name, label, fn) {
  const n0 = scene.children.length,
    c0 = COL.length,
    ph = PH,
    phEnd = PH_END,
    vv = VAR;
  fn();
  const kids = scene.children
    .slice(n0)
    .filter(o => !o.isLight && !(o.userData && (o.userData.door || o.userData.bldRoot)));
  if (!kids.length) return null;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const k of kids) box.expandByObject(k);
  const x = (box.min.x + box.max.x) / 2,
    y = -(box.min.z + box.max.z) / 2,
    z = box.min.y;
  const g = new THREE.Group();
  g.position.set(x, z, -y);
  g.userData.mergeRoot = 'item:' + name + (vv || '');
  if (ph !== null) {
    g.userData.ph = ph;
    if (phEnd !== null) g.userData.phEnd = phEnd;
  }
  if (vv) g.userData.var = vv;
  scene.add(g);
  g.updateMatrixWorld(true);
  for (const k of kids) g.attach(k);
  for (let i = c0; i < COL.length; i++) COL[i][5] = COL[i][4] - 1; // replaced by the item's box
  const it = {
    kind: 'grp',
    type: 'grp',
    label,
    x,
    y,
    z,
    rot: 0,
    size: [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z],
    root: g,
    colIdx: null,
    noCol: false,
    ph,
    phEnd,
    var: vv,
    orig: { x, y, z, rot: 0 },
    key: (vv ? vv + ':' : '') + 'grp:' + name,
  };
  itemCol(it);
  (window.GLB_PLACED || (window.GLB_PLACED = [])).push(it);
  return it;
}
// upholstery of the model chairs: one shared material per colour role, so the interior styles can recolour it ('a' light, 'b' accent)
const CUSH = {};
window.CUSH = CUSH;
export const pillowFix =
  (col, role = 'a') =>
  mt => {
    if (!mt || !/pillow|cushion|leather/i.test(mt.name || '')) return null;
    const L = CUSH[role] || (CUSH[role] = []),
      nm = mt.normalMap || null;
    let m = L.find(q => q.normalMap === nm);
    if (!m) {
      m = patchSV(
        new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.95,
          normalMap: nm,
          normalScale: new THREE.Vector2(0.5, 0.5),
          envMapIntensity: 0.6,
        })
      );
      m.userData.col0 = col;
      if (L.length) m.color.copy(L[0].color);
      else if (window.STYLE) m.color.set(LATE.STYLE.cushCol(role, col));
      L.push(m);
    }
    return m;
  };
// --- wood stove (round), slate hearth plate, slate heat shield; single-wall black pipe in the EG, insulated above the ceiling
export const glowMat = new THREE.MeshBasicMaterial({ color: 0xff9a3c });
phase(PHN.stove);
{
  const [sx, sy] = STV;
  B(0.4, 1.5, 2.45, NW, zF, zF + 0.02, MAT.slate, { walk: 'stone', cast: false, grain: 'x' });
  B(0.4, 1.5, NW - 0.045, NW - 0.003, zF + 0.02, zF + 1.45, MAT.slate, { col: false, cast: false, grain: 'z' });
  cyl(sx, sy, zF + 0.14, zF + 1.0, 0.24, MAT.blacksteel, 40);
  cyl(sx, sy, zF + 1.0, zF + 1.05, 0.255, MAT.blacksteel, 40, undefined, { col: false });
  cyl(sx, sy, zF + 0.1, zF + 0.14, 0.2, MAT.blacksteel, 32, undefined, { col: false });
  for (const a of [0.7, 2.45, 3.85, 5.6])
    cyl(sx + Math.cos(a) * 0.15, sy + Math.sin(a) * 0.15, zF + 0.02, zF + 0.12, 0.018, MAT.blacksteel, 8, undefined, {
      col: false,
    });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.34), glowMat);
  glow.position.copy(V(sx, sy - 0.215, zF + 0.6));
  tagPh(glow);
  scene.add(glow);
  window.stoveGlow = glow;
  B(sx - 0.17, sx + 0.17, sy - 0.258, sy - 0.238, zF + 0.4, zF + 0.82, MAT.blacksteel, { col: false });
  {
    const g = B(sx - 0.14, sx + 0.14, sy - 0.262, sy - 0.254, zF + 0.43, zF + 0.79, MAT.glass, {
      col: false,
      cast: false,
    });
    g.renderOrder = 2;
  }
  B(sx + 0.15, sx + 0.17, sy - 0.29, sy - 0.26, zF + 0.55, zF + 0.7, MAT.steel, { col: false });
  B(sx - 0.15, sx + 0.15, sy - 0.27, sy - 0.24, zF + 0.3, zF + 0.34, MAT.blacksteel, { col: false });
  cyl(sx - 0.06, sy - 0.04, zF + 1.05, zF + 1.2, 0.085, MAT.steel, 24, 0.075, { col: false });
  cyl(sx, sy, zF + 1.05, zE - 0.2, 0.075, MAT.blacksteel, 24, undefined, { col: false });
  COL.push([sx - 0.27, sx + 0.27, sy - 0.31, sy + 0.27, zF, zF + 1.25, 'stove', PH, PH_END]);
}
phase(PHN.builtins);
// --- shelves & books
const shelfBooks = [];
function shelf(x0, x1, y0, y1, z0, z1, levels, face, { logs = null } = {}) {
  const lh = (z1 - z0) / levels,
    m = MAT.furnP,
    o = { col: false, bevel: 0.003 };
  if (face === 'S' || face === 'N') {
    B(x0, x0 + 0.025, y0, y1, z0, z1, m, o);
    B(x1 - 0.025, x1, y0, y1, z0, z1, m, o);
  } else {
    B(x0, x1, y0, y0 + 0.025, z0, z1, m, o);
    B(x0, x1, y1 - 0.025, y1, z0, z1, m, o);
  }
  B(x0, x1, y0, y1, z0, z0 + 0.03, m, o);
  COL.push([x0, x1, y0, y1, z0, z1, 'shelf', PH, PH_END]);
  for (let l = 0; l < levels; l++) {
    const zb = z0 + 0.03 + l * lh;
    B(x0, x1, y0, y1, zb + lh - 0.03, zb + lh, m, { col: false, cast: true });
    const along = face === 'S' || face === 'N';
    let a = along ? x0 + 0.03 : y0 + 0.03;
    const a1 = along ? x1 - 0.03 : y1 - 0.03;
    if (l === 0 && logs) {
      const [la, lb] = logs;
      for (let k = 0; k < 18; k++) {
        const xx = la + 0.06 + (k % 5) * ((lb - la - 0.1) / 4),
          zz = zb + 0.06 + Math.floor(k / 5) * 0.1;
        if (zz > zb + lh - 0.08) break;
        const lg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05 * rr(0.8, 1.1), 0.05 * rr(0.8, 1.1), y1 - y0 - 0.05, 9),
          [MAT.logs, MAT.logEnd, MAT.logEnd]
        );
        lg.rotation.x = Math.PI / 2;
        lg.position.copy(V(xx, (y0 + y1) / 2, zz));
        lg.castShadow = true;
        tagPh(lg);
        scene.add(lg);
      }
      a = lb + 0.02;
    }
    while (a < a1 - 0.03) {
      const w = rr(0.018, 0.05),
        hgt = rr(0.6, 0.92) * (lh - 0.05),
        dep = rr(0.14, 0.23);
      if (rnd() < 0.06) {
        a += rr(0.05, 0.14);
        continue;
      }
      const lean = rnd() < 0.04 ? rr(-0.25, 0.25) : 0;
      if (face === 'S') shelfBooks.push([a, a + w, y1 - dep - 0.01, y1 - 0.01, zb, zb + hgt, lean]);
      else if (face === 'N') shelfBooks.push([a, a + w, y0 + 0.01, y0 + 0.01 + dep, zb, zb + hgt, lean]);
      else if (face === 'E') shelfBooks.push([x0 + 0.01, x0 + 0.01 + dep, a, a + w, zb, zb + hgt, lean]);
      else shelfBooks.push([x1 - 0.01 - dep, x1 - 0.01, a, a + w, zb, zb + hgt, lean]);
      a += w + 0.0015;
    }
  }
}
// ===================== EG: library, living room and guest bed (3,4 × 3,4 m) =====================
// One bookcase on the north wall between hearth and entrance zone (log niche next to the stove); window seat west, daybed south (sofa + guest bed).
// A: reading chair in the east corner angled to the fire, entrance from the tower in the NE corner. B: the ladder stair takes the SE corner, the
// reading chair stands in the middle facing stove and west window, the front door (NE) opens outwards.
const BOOKCASE = grpItem('bookcase', 'Bücherregal', () =>
  shelf(1.62, 3.22, NW - 0.34, NW, zF, zE - 0.22, 6, 'S', { logs: [1.65, 2.05] })
);
phase(PHN.furniture);
// --- window seat (west) and daybed / guest bed (south, 90 × 200)
grpItem('windowseat', 'Fensterbank', () => {
  B(T, 0.75, 1.25, 2.42, zF, 0.63, MAT.furnP, { bevel: 0.004 });
  RB(T + 0.02, 0.74, 1.27, 2.4, 0.63, 0.72, 0.03, MAT.sageP, { puff: 0.008, col: false });
  RB(T + 0.03, 0.4, 1.35, 1.85, 0.72, 1.05, 0.06, MAT.linenP, { col: false });
  RB(T + 0.03, 0.4, 1.92, 2.36, 0.72, 1.0, 0.06, MAT.rustP, { col: false });
});
grpItem('daybed', 'Tagesbett', () => {
  B(0.36, 2.3, 0.33, 1.14, zF, zF + 0.07, MAT.black, { col: false });
  B(0.3, 2.36, 0.27, 1.2, zF + 0.07, 0.55, MAT.furnP, { bevel: 0.004, grain: 'x' });
  RB(0.32, 2.34, 0.29, 1.18, 0.55, 0.71, 0.045, MAT.linenP, { puff: 0.006 });
  RB(0.36, 1.3, 0.28, 0.47, 0.71, 1.08, 0.08, MAT.sageP, { col: false });
  RB(1.36, 2.28, 0.28, 0.47, 0.71, 1.08, 0.08, MAT.sageP, { col: false });
  RB(0.42, 0.92, 0.48, 0.62, 0.71, 1.0, 0.07, MAT.rustP, { col: false });
  RB(1.78, 2.3, 0.52, 1.17, 0.71, 0.76, 0.02, MAT.woolP, { col: false });
});
// --- reading chair, lamp table, pouf, rug, kindling basket, tall plant
export function armchair(x0, x1, y0, y1, z, mat = MAT.woolP) {
  const sh = z + 0.12;
  RB(x0 + 0.04, x1 - 0.12, y0 + 0.1, y1 - 0.1, sh, sh + 0.28, 0.06, mat, { puff: 0.015 });
  RB(x1 - 0.2, x1 - 0.02, y0 + 0.06, y1 - 0.06, sh + 0.1, z + 0.92, 0.07, mat, { col: false });
  RB(x0 + 0.04, x1 - 0.02, y0, y0 + 0.11, sh + 0.12, z + 0.62, 0.05, mat, { col: false });
  RB(x0 + 0.04, x1 - 0.02, y1 - 0.11, y1, sh + 0.12, z + 0.62, 0.05, mat, { col: false });
  for (const [x, y] of [
    [x0 + 0.07, y0 + 0.06],
    [x1 - 0.07, y0 + 0.06],
    [x0 + 0.07, y1 - 0.06],
    [x1 - 0.07, y1 - 0.06],
  ])
    cyl(x, y, z, sh + 0.02, 0.02, MAT.furnP, 10, 0.016, { col: false });
}
varOn('A');
grpItem('rug', 'Teppich', () =>
  B(1.0, 3.05, 1.32, 2.62, zF, zF + 0.012, MAT.rugP, { col: false, cast: false, grain: 'x' })
);
placeGLB('armchair', { x: 2.95, y: 1.62, z: zF, face: -115, h: 1.0, mat: pillowFix(0xcdbfa9) }, () =>
  armchair(2.5, 3.4, 1.2, 2.05, zF)
);
placeGLB('side_table', { x: 3.4, y: 2.24, z: zF, face: 15, h: 0.55 }, () => {
  cyl(3.4, 2.24, zF, zF + 0.49, 0.03, MAT.furnP, 12);
  cyl(3.4, 2.24, zF + 0.49, zF + 0.52, 0.21, MAT.furnP, 36);
});
placeGLB('lantern_t', { x: 3.42, y: 2.26, z: zF + 0.55, h: 0.36, col: false });
placeGLB('footstool', { x: 2.12, y: 1.72, z: zF, face: 20, h: 0.28 });
varOff();
placeGLB('basket', { x: 0.42, y: 2.6, z: zF, h: 0.24 }); // kindling basket at the west end of the hearth, outside the 0.8 m zone in front of the stove door
varOn('A');
placeGLB('plant_b', { x: 3.28, y: 0.66, z: zF, h: 1.1 });
varOff();
phase(PHN.builtins);
// --- paper lanterns (Akari type) hung between the joists
export function lantern(x, y, zc, r, sy = 1.0, pm = MAT.paper) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), pm);
  s.scale.y = sy;
  s.position.copy(V(x, y, zc));
  s.castShadow = false;
  tagPh(s);
  scene.add(s);
  for (let k = -3; k <= 3; k++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r * Math.sqrt(1 - (k / 4) ** 2) * 1.004, 0.0025, 4, 40),
      MAT.black
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(V(x, y, zc + (k / 4) * r * sy));
    tagPh(ring);
    scene.add(ring);
  }
  return s;
}
const lanEG = lantern(1.95, 2.0, zE - 0.35, 0.22, 0.9);
beam([1.95, 2.0, zE - 0.15], [1.95, 2.0, zE + 0.24], 0.004, 0.004, MAT.black, { cast: false });
// ===================== OG: work and music room (A 4,3 × 5,2 m, B 5,2 × 5,2 m) =====================
// desk along the south band (daylight from the front and from the west glazing on the left), lounge chairs facing the west glazing (sunset),
// stage piano under the north band; A: low sideboard with record player on the east wall, door to the tower landing; B: sideboard on the north wall,
// trapdoor in the SE quarter, ladder to the roof hatch along the east wall.
phase(PHN.furniture);
{
  const x0 = 0.15,
    x1 = 1.8,
    y0 = IY0 + 0.02,
    y1 = IY0 + 0.72,
    t = zO + 0.775,
    dx = 0.95;
  grpItem('desk', 'Schreibtisch', () => {
    B(x0, x1, y0, y1, zO + 0.74, t, MAT.furnP, { bevel: 0.004, grain: 'x' });
    B(x0 + 0.02, x0 + 0.06, y0 + 0.02, y1 - 0.02, zO, zO + 0.74, MAT.furnP, { bevel: 0.003 });
    B(x1 - 0.06, x1 - 0.02, y0 + 0.02, y1 - 0.02, zO, zO + 0.74, MAT.furnP, { bevel: 0.003 });
    B(x0 + 0.06, x1 - 0.06, y0 + 0.02, y0 + 0.06, zO + 0.45, zO + 0.74, MAT.furnP, { col: false });
    B(x1 - 0.55, x1 - 0.06, y0 + 0.06, y1 - 0.04, zO + 0.58, zO + 0.74, MAT.furnP, { col: false });
    B(x1 - 0.4, x1 - 0.2, y1 - 0.04, y1 - 0.025, zO + 0.64, zO + 0.66, MAT.blacksteel, { col: false });
    B(dx - 0.17, dx + 0.17, y0 + 0.2, y0 + 0.45, t, t + 0.014, MAT.alu, { col: false, bevel: 0.003 });
    const scm = new THREE.MeshStandardMaterial({
      color: 0x0b0b0c,
      emissive: 0x8aa5c4,
      emissiveIntensity: 0.25,
      roughness: 0.2,
      metalness: 0.2,
    });
    const sc = new THREE.Mesh(new RoundedBoxGeometry(0.33, 0.215, 0.008, 1, 0.003), [
      MAT.alu,
      MAT.alu,
      MAT.alu,
      MAT.alu,
      MAT.alu,
      scm,
    ]);
    sc.position.copy(V(dx, y0 + 0.19, t + 0.115));
    sc.rotation.x = 0.2;
    sc.castShadow = true;
    tagPh(sc);
    scene.add(sc);
    cyl(dx + 0.38, y0 + 0.5, t, t + 0.1, 0.04, plain({ color: 0x51606a, roughness: 0.4 }), 18, undefined, {
      col: false,
    });
  });
  placeGLB('books', { x: x0 + 0.3, y: y0 + 0.2, z: t, face: 0, w: 0.42, col: false });
  placeGLB('succulent', { x: x0 + 0.12, y: y0 + 0.5, z: t, h: 0.27, col: false });
  placeGLB('desk_lamp', { x: x1 - 0.18, y: y0 + 0.15, z: t, face: 0, h: 0.45, col: false });
}
function deskChair(cx0, cx1, cy0, cy1, z) {
  RB(cx0, cx1, cy0, cy1, z + 0.43, z + 0.465, 0.012, MAT.furnP, { col: false });
  for (const [x, y] of [
    [cx0 + 0.03, cy0 + 0.03],
    [cx1 - 0.03, cy0 + 0.03],
    [cx0 + 0.03, cy1 - 0.03],
    [cx1 - 0.03, cy1 - 0.03],
  ])
    cyl(x, y, z, z + 0.43, 0.017, MAT.furnP, 10, 0.014, { col: false });
  cyl(cx0 + 0.03, cy1 - 0.03, z + 0.465, z + 0.86, 0.016, MAT.furnP, 10, undefined, { col: false });
  cyl(cx1 - 0.03, cy1 - 0.03, z + 0.465, z + 0.86, 0.016, MAT.furnP, 10, undefined, { col: false });
  for (const zz of [0.6, 0.72, 0.83])
    B(cx0 + 0.02, cx1 - 0.02, cy1 - 0.05, cy1 - 0.015, z + zz, z + zz + 0.05, MAT.furnP, { col: false, bevel: 0.003 });
  COL.push([cx0, cx1, cy0, cy1, z, z + 0.9, 'furn', PH, PH_END]);
}
placeGLB('desk_chair', { x: 0.98, y: IY0 + 1.1, z: zO, face: 0, h: 0.86 }, () =>
  deskChair(0.76, 1.2, IY0 + 0.88, IY0 + 1.32, zO)
);
// lounge: two chairs side by side facing the west glazing, turned slightly towards each other, small table between, rug
grpItem('rugOG', 'Teppich', () =>
  B(-0.55, 1.1, 0.75, 3.25, zO, zO + 0.012, MAT.rugP, { col: false, cast: false, grain: 'y' })
);
placeGLB('lounge_chair', { x: 0.08, y: 1.38, z: zO, face: -105, h: 1.0, mat: pillowFix(0x8d9a7e, 'b') }, () =>
  armchair(-0.35, 0.5, 0.96, 1.8, zO, MAT.sageP)
);
placeGLB('lounge_chair', { x: 0.08, y: 2.62, z: zO, face: -75, h: 1.0, mat: pillowFix(0xcdbfa9) }, () =>
  armchair(-0.35, 0.5, 2.2, 3.04, zO, MAT.woolP)
);
placeGLB('side_table_small', { x: -0.2, y: 2.0, z: zO, face: 0, h: 0.5 }, () => {
  cyl(-0.2, 2.0, zO, zO + 0.47, 0.03, MAT.furnP, 12);
  cyl(-0.2, 2.0, zO + 0.47, zO + 0.5, 0.17, MAT.furnP, 32);
});
placeGLB('vase', { x: -0.2, y: 2.0, z: zO + 0.5, h: 0.3, col: false });
// music corner along the north band: stage piano on oak stand, stool, small amp; ukulele on the east wall
export function amp(x0, x1) {
  B(x0, x1, IY1 - 0.4, IY1 - 0.05, zO, zO + 0.42, MAT.black, { bevel: 0.01 });
  B(x0 + 0.04, x1 - 0.04, IY1 - 0.41, IY1 - 0.4, zO + 0.06, zO + 0.36, MAT.woolP, { col: false });
}
{
  const y1 = IY1,
    x0 = 1.6,
    x1 = 2.9;
  grpItem('piano', 'Stagepiano', () => {
    RB(x0, x1, y1 - 0.32, y1 - 0.03, zO + 0.72, zO + 0.83, 0.02, MAT.black, { col: false });
    B(x0 + 0.04, x1 - 0.04, y1 - 0.31, y1 - 0.19, zO + 0.83, zO + 0.845, plain({ color: 0xf1eee7, roughness: 0.3 }), {
      col: false,
    });
    for (let k = 0; k < 44; k++) {
      const x = x0 + 0.06 + k * 0.0278;
      if ([1, 3, 5, 6].includes(k % 7) === false) continue;
      B(x - 0.006, x + 0.006, y1 - 0.25, y1 - 0.19, zO + 0.845, zO + 0.862, MAT.black, { col: false });
    }
    for (const x of [x0 + 0.07, x1 - 0.07])
      B(x - 0.022, x + 0.022, y1 - 0.3, y1 - 0.04, zO, zO + 0.72, MAT.furnP, { col: false, bevel: 0.003 });
    B(x0 + 0.07, x1 - 0.07, y1 - 0.13, y1 - 0.09, zO + 0.12, zO + 0.18, MAT.furnP, { col: false });
    COL.push([x0, x1, y1 - 0.33, y1, zO, zO + 0.9, 'furn', PH, PH_END]);
  });
  placeGLB('stool', { x: (x0 + x1) / 2, y: y1 - 0.72, z: zO, face: 0, h: 0.48 }, () => {
    cyl((x0 + x1) / 2, y1 - 0.72, zO, zO + 0.44, 0.16, MAT.furnP, 24, 0.17);
    cyl((x0 + x1) / 2, y1 - 0.72, zO + 0.44, zO + 0.48, 0.18, MAT.woolP, 24);
  });
  varOn('A');
  grpItem('amp', 'Verstärker', () => amp(3.05, 3.45));
  placeGLB('ukulele', { x: IX1 - 0.03, y: 4.05, z: zO + 1.05, face: -90, h: 0.6, col: false });
  beam([IX1 + 0.01, 4.05, zO + 1.62], [IX1 - 0.05, 4.05, zO + 1.62], 0.012, 0.012, MAT.blacksteel, { cast: false });
  varOff();
}
// A: low sideboard on the east wall south of the door (records, record player, speakers), plants
varOn('A');
phase(PHN.builtins);
grpItem('sideboard', 'Sideboard mit Plattenspieler', () => {
  B(IX1 - 0.44, IX1, -0.42, 2.22, zO, zO + 0.62, MAT.furnP, { bevel: 0.004, grain: 'y' });
  B(IX1 - 0.44, IX1, -0.42, 2.22, zO + 0.62, zO + 0.65, MAT.furnP, { col: false, bevel: 0.003 });
  for (const y of [0.45, 1.33])
    B(IX1 - 0.445, IX1 - 0.43, y - 0.006, y + 0.006, zO + 0.02, zO + 0.62, MAT.black, { col: false });
  phase(PHN.furniture);
  {
    const x = IX1 - 0.22;
    B(x - 0.18, x + 0.18, 0.75, 1.1, zO + 0.65, zO + 0.75, MAT.furnP, { col: false, bevel: 0.004 });
    cyl(x, 0.93, zO + 0.75, zO + 0.765, 0.15, MAT.black, 32, undefined, { col: false });
    for (const y of [-0.25, 1.95])
      B(x - 0.12, x + 0.12, y - 0.1, y + 0.1, zO + 0.65, zO + 1.0, MAT.black, { col: false, bevel: 0.01 });
  }
});
placeGLB('plant_a', { x: IX1 - 0.25, y: 1.6, z: zO + 0.65, h: 0.7, col: false });
varOff();
placeGLB('plant_b', { x: IX0 + 0.4, y: IY1 - 0.4, z: zO, h: 1.1 });
varOn('A');
placeGLB('basket', { x: IX1 - 0.3, y: -0.1, z: zO + 0.65, h: 0.2, col: false });
varOff();
phase(PHN.builtins);
const lanOG = lantern(1.7, 2.1, zG - 0.42, 0.22, 1.0, MAT.paperOG);
beam([1.7, 2.1, zG - 0.2], [1.7, 2.1, zC - 0.03], 0.004, 0.004, MAT.black, { cast: false });
const lanOG2 = lantern(0.15, 2.0, zG - 0.6, 0.16, 1.0, MAT.paperOG);
beam([0.15, 2.0, zG - 0.44], [0.15, 2.0, zC - 0.03], 0.004, 0.004, MAT.black, { cast: false });
// ---------------- terrace furniture: two loungers facing west, low table, lantern, planters (per variant: the B terrace is 4 cm higher) ----------------
phase(PHN.furniture);
function lounger(xh, y, zt) {
  const x0 = xh - 1.9;
  for (const xx of [x0 + 0.1, xh - 0.15])
    for (const yy of [y - 0.28, y + 0.28])
      B(xx - 0.03, xx + 0.03, yy - 0.03, yy + 0.03, zt, zt + 0.28, MAT.larch, { col: false, bevel: 0.003 });
  B(x0, xh, y - 0.32, y + 0.32, zt + 0.28, zt + 0.32, MAT.larch, { col: false, bevel: 0.004, grain: 'x' });
  beam([xh - 0.55, y, zt + 0.34], [xh, y, zt + 0.85], 0.62, 0.04, MAT.larch, { bevel: 0.004 });
  RB(x0 + 0.03, xh - 0.55, y - 0.29, y + 0.29, zt + 0.32, zt + 0.4, 0.03, MAT.sageP, { col: false, puff: 0.006 });
  beam([xh - 0.53, y, zt + 0.41], [xh - 0.03, y, zt + 0.88], 0.56, 0.06, MAT.sageP);
  COL.push([x0, xh, y - 0.33, y + 0.33, zt, zt + 0.9, 'furn', PH, PH_END]);
}
export function terraceSet(zt, rf) {
  grpItem('lounger1', 'Liege', () => lounger(1.6, 1.0, zt));
  grpItem('lounger2', 'Liege', () => lounger(1.6, 2.05, zt));
  grpItem('ttable', 'Terrassentisch', () => {
    cyl(2.0, 1.52, zt, zt + 0.4, 0.2, MAT.larch, 32);
    cyl(2.0, 1.52, zt + 0.4, zt + 0.43, 0.22, MAT.larch, 32, undefined, { col: false });
  });
  placeGLB('lantern_t', { x: 2.0, y: 1.52, z: zt + 0.43, h: 0.36, col: false });
  placeGLB('plant_b', { x: rf.x0 + 0.65, y: rf.y1 - 0.65, z: zt, h: 1.3 });
  placeGLB('plant_a', { x: 3.5, y: rf.y1 - 0.65, z: zt, h: 1.1 });
}
varOn('A');
terraceSet(zD, RF);
varOff();
placeGLB('stump', { x: -1.75, y: 3.7, z: 0, face: 40, h: 0.5 });
// ---------------- books (instanced, varied) ----------------
{
  const n = shelfBooks.length;
  const bookMat = plain({ roughness: 0.7 });
  const im = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 1, 0.06), bookMat, n);
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler();
  const cols = [
    0x7a3b2e, 0x3f5a46, 0x2f4561, 0xb08d57, 0x8c6b4f, 0xd9cdb5, 0x5b4a6e, 0x9a5b3a, 0x46524e, 0xc2a46b, 0x2b2b2b,
    0xe6e0d2, 0x6d2f2a, 0x93876c,
  ];
  shelfBooks.forEach((b, i) => {
    const [x0, x1, y0, y1, z0, z1, lean] = b;
    e.set(0, 0, 0);
    if (lean) {
      if (Math.abs(x1 - x0) < Math.abs(y1 - y0)) e.z = lean;
      else e.x = lean;
    }
    q.setFromEuler(e);
    m4.compose(
      V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2 - (lean ? 0.01 : 0)),
      q,
      new THREE.Vector3(x1 - x0, z1 - z0, y1 - y0)
    );
    im.setMatrixAt(i, m4);
    im.setColorAt(
      i,
      new THREE.Color(cols[Math.floor(rnd() * cols.length)]).offsetHSL(0, rr(-0.05, 0.02), rr(-0.06, 0.05))
    );
  });
  im.castShadow = true;
  im.receiveShadow = true;
  tagPh(im);
  scene.add(im);
  if (BOOKCASE) BOOKCASE.root.attach(im);
}
phase(PHN.builtins);
// ---------------- interior lights (T1/T2 move with the variant: A = tower lamps, B = entrance pendant + lamp at the roof ladder) ----------------
const L1 = new THREE.PointLight(0xffc27a, 0, 5.0, 2);
L1.position.copy(V(1.95, 2.0, zE - 0.4));
scene.add(L1);
const L2 = new THREE.PointLight(0xff8a3a, 0, 3.6, 2);
L2.position.copy(V(STV[0], STV[1] - 0.45, zF + 0.6));
scene.add(L2);
const L3 = new THREE.PointLight(0xffd29a, 0, 3.5, 2);
L3.position.copy(V(1.62, IY0 + 0.2, zO + 1.05));
scene.add(L3);
const L4 = new THREE.PointLight(0xffcf90, 0, 7, 2);
L4.position.copy(V(1.7, 2.1, zG - 0.5));
scene.add(L4);
const L5 = new THREE.PointLight(0xffd09a, 0, 4.5, 2);
L5.position.copy(V(0.15, 2.0, zG - 0.65));
scene.add(L5);
// stair tower: wall lamps on the north wall of the passage (under the landing) and on the OG landing – paper shades like the house lamps
const TLX = 5.75,
  TLY = TW.y1 - TT - 0.13;
export const TLAMP = {
  A: [V(TLX, TLY - 0.04, 2.3), V(TLX, TLY - 0.04, zO + 2.25)],
  B: [V(3.3, 2.8, zE - 0.22), V(IX1B - 0.2, 2.12, zO + 1.95)],
};
export const T1 = new THREE.PointLight(0xffd6a0, 0, 3.4, 2);
T1.position.copy(TLAMP[VARIANT][0]);
scene.add(T1);
export const T2 = new THREE.PointLight(0xffd6a0, 0, 3.6, 2);
T2.position.copy(TLAMP[VARIANT][1]);
scene.add(T2);
window.TLAMP = TLAMP;
varOn('A');
for (const z of [2.3, zO + 2.25]) {
  B(TLX - 0.02, TLX + 0.02, TLY + 0.02, TW.y1 - TT, z + 0.05, z + 0.09, MAT.blacksteel, { col: false, cast: false });
  cyl(TLX, TLY, z - 0.11, z + 0.11, 0.075, z > 3 ? MAT.paperOG : MAT.paper, 20, undefined, { col: false, cast: false });
}
varOff();
window.LIGHTS = [L1, L2, L3, L4, L5, T1, T2];
for (const l of window.LIGHTS) {
  // not tagged with a phase (tagPh would hide it before the built-ins): phases before the built-ins switch a light off by its intensity
  // (game/walkable.js setPhase) – the number of lights, and so every shader program, stays the same; a light lent to another place
  // (KERN.lights) shines there in any phase
  let i0 = l.intensity;
  Object.defineProperty(l, 'intensity', {
    configurable: true,
    enumerable: true,
    get: () => (l.userData.off && !l.userData.lent ? 0 : i0),
    set: v => {
      i0 = v;
    },
  });
}
// Phase 2: the lights other places borrow while the pavilion does not need them (KERN.lights, core/kern.js) – the room of the old school on a
// Friday evening, the fire on the field; no new lamps, so no newly compiled shaders. T1/T2 stay home (they move with the variant).
KERN.lights.pool([L1, L4, L5, L3, L2], {
  home: () => {
    if ((window.PHASE ?? 99) < PHN.builtins) return false; // nothing built yet: the lights are free
    const o = KERN.where();
    return !o || Math.hypot(o[0] - 2, o[1] - 2) < 60;
  },
  restore: () => {
    if (window.LIGHTSTATE) LATE.LIGHTSTATE.apply();
    markDirty(true);
  },
});
