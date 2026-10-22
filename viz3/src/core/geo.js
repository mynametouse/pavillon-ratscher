// ---------------- geometry helpers with automatic walk/collision registry ----------------
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LATE } from './late.js';
import { scene, V } from './head.js';
import { markDirty, MODELS } from './assets.js';
import { MAT } from './mats.js';
export const COL = []; // [x0,x1,y0,y1,z0,z1,tag,phase]  (site coords)
export const WALK = []; // [x0,x1,y0,y1,ztop,type,phase]
export const PHN = {
  bestand: 0,
  garage: 1,
  abdicht: 2,
  schwellen: 3,
  piles: 4,
  egFrame: 5,
  egOSB: 6,
  egIns: 7,
  joists: 8,
  braces: 9,
  deck: 10,
  ogFrame: 11,
  ogSheath: 12,
  ring: 13,
  roofBoard: 14,
  roofIns: 15,
  roofSeal: 16,
  chimney: 17,
  windows: 18,
  doors: 19,
  battens: 20,
  cladding: 21,
  stairA: 22,
  stairB: 23,
  terrace: 24,
  railings: 25,
  floors: 26,
  plaster: 27,
  stove: 28,
  builtins: 29,
  furniture: 30,
};
window.PHN = PHN;
export let PH = null,
  PH_END = null; // construction phase of everything created from now on (null = site, always visible)
export function phase(n, end = null) {
  PH = n;
  PH_END = end;
}
// design variant of everything created between varOn(v) and varOff(): 'A' = stair tower, 'B' = ladder stairs; untagged = both.
// Meshes get userData.var, colliders and walk surfaces get the tag at index 10, doors a .var field; only the active variant is shown and walkable.
export let VAR = null,
  VMARK = null;
export function varOn(v) {
  VAR = v;
  VMARK = [COL.length, WALK.length, v];
}
export function varOff() {
  if (!VMARK) return;
  const [c0, w0, v] = VMARK;
  for (let i = c0; i < COL.length; i++) if (COL[i][10] == null) COL[i][10] = v;
  for (let i = w0; i < WALK.length; i++) if (WALK[i][10] == null) WALK[i][10] = v;
  VAR = null;
  VMARK = null;
}
export function tagPh(o) {
  if (PH !== null) {
    o.userData.ph = PH;
    if (PH_END !== null) o.userData.phEnd = PH_END;
  }
  if (VAR) o.userData.var = VAR;
  return o;
}
// world-metre UVs from vertex position + normal; 'grain' = site axis the texture's V direction follows
export function siteUV(geo, cx, cy, cz, grain, dims) {
  const p = geo.attributes.position,
    n = geo.attributes.normal,
    uv = geo.attributes.uv;
  const longH = dims ? (dims[0] >= dims[1] ? 'x' : 'y') : 'y';
  for (let i = 0; i < p.count; i++) {
    const x = cx + p.getX(i),
      z = cz + p.getY(i),
      y = cy - p.getZ(i);
    const nx = Math.abs(n.getX(i)),
      nz = Math.abs(n.getY(i)),
      ny = Math.abs(n.getZ(i));
    let u, v;
    if (nz >= nx && nz >= ny) {
      const g = grain === 'x' || grain === 'y' ? grain : longH;
      if (g === 'x') {
        u = y;
        v = x;
      } else {
        u = x;
        v = y;
      }
    } else if (nx >= ny) {
      if (grain === 'y') {
        u = z;
        v = y;
      } else {
        u = y;
        v = z;
      }
    } else {
      if (grain === 'x') {
        u = z;
        v = x;
      } else {
        u = x;
        v = z;
      }
    }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}
function matArr(m) {
  if (!m || m.isMaterial) return m;
  const f = k => m[k] || m.def;
  return [f('e'), f('w'), f('t'), f('b'), f('s'), f('n')];
}
function longestAxis(w, d, h) {
  return h >= w && h >= d ? 'z' : w >= d ? 'x' : 'y';
}
// axis-aligned box in site coords
export function B(x0, x1, y0, y1, z0, z1, m, o = {}) {
  const w = x1 - x0,
    d = y1 - y0,
    h = z1 - z0;
  if (w <= 0 || d <= 0 || h <= 0) return null;
  const mn = Math.min(w, d, h);
  const bev = o.bevel ?? 0;
  const g =
    bev > 0 && mn > 0.02 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(bev, mn * 0.3)) : new THREE.BoxGeometry(w, h, d);
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    cz = (z0 + z1) / 2;
  siteUV(g, cx, cy, cz, o.grain || longestAxis(w, d, h), [w, d]);
  const me = new THREE.Mesh(g, matArr(m));
  me.position.copy(V(cx, cy, cz));
  me.castShadow = o.cast ?? true;
  me.receiveShadow = o.recv ?? true;
  (o.parent || scene).add(me);
  if (o.walk) WALK.push([x0, x1, y0, y1, z1, o.walk === true ? 'wood' : o.walk, PH, PH_END]);
  const col = o.col ?? (!o.walk && h > 0.12);
  if (col) COL.push([x0, x1, y0, y1, z0, z1, o.tag || '', PH, PH_END]);
  if (o.noMerge) me.userData.noMerge = true;
  return tagPh(me);
}
// rounded soft box (cushions, upholstery)
export function RB(x0, x1, y0, y1, z0, z1, r, m, o = {}) {
  const w = x1 - x0,
    d = y1 - y0,
    h = z1 - z0;
  r = Math.min(r, w / 2 - 1e-3, d / 2 - 1e-3, h / 2 - 1e-3);
  const g = new RoundedBoxGeometry(w, h, d, 3, Math.max(r, 0.002));
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    cz = (z0 + z1) / 2;
  // gentle pillow sag on the top surface
  if (o.puff) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i) / (w / 2),
        lz = p.getZ(i) / (d / 2);
      if (p.getY(i) > 0) p.setY(i, p.getY(i) + o.puff * (1 - lx * lx) * (1 - lz * lz));
    }
    g.computeVertexNormals();
  }
  siteUV(g, cx, cy, cz, o.grain || 'x', [w, d]);
  const me = new THREE.Mesh(g, m);
  me.position.copy(V(cx, cy, cz));
  me.castShadow = true;
  me.receiveShadow = true;
  (o.parent || scene).add(me);
  if (o.col ?? !o.parent) COL.push([x0, x1, y0, y1, z0, z1, '', PH, PH_END]); // boxes in a parent group are in local coords: no world collider by default
  return tagPh(me);
}
// member between two site points (rotated box)
export function beam(p, q, sw, sh, m, o = {}) {
  const a = V(...p),
    b = V(...q);
  const L = a.distanceTo(b);
  const bev = o.bevel ?? 0;
  const mn = Math.min(sw, sh);
  const g =
    bev > 0 && mn > 0.02
      ? new RoundedBoxGeometry(sw, sh, L, 1, Math.min(bev, mn * 0.3))
      : new THREE.BoxGeometry(sw, sh, L);
  // UVs along the member: v = length, u = across
  const pp = g.attributes.position,
    nn = g.attributes.normal,
    uv = g.attributes.uv;
  for (let i = 0; i < pp.count; i++) {
    const ax = Math.abs(nn.getX(i)),
      ay = Math.abs(nn.getY(i));
    uv.setXY(i, (ax > ay ? pp.getY(i) : pp.getX(i)) + (o.u0 || 0), pp.getZ(i) + L / 2 + (o.v0 || 0));
  }
  const me = new THREE.Mesh(g, m);
  me.position.copy(a.clone().add(b).multiplyScalar(0.5));
  me.lookAt(b);
  me.castShadow = o.cast ?? true;
  me.receiveShadow = true;
  (o.parent || scene).add(me);
  if (o.col) {
    const h = Math.max(sw, sh) / 2;
    COL.push([
      Math.min(p[0], q[0]) - h,
      Math.max(p[0], q[0]) + h,
      Math.min(p[1], q[1]) - h,
      Math.max(p[1], q[1]) + h,
      Math.min(p[2], q[2]) - h,
      Math.max(p[2], q[2]) + h,
      '',
      PH,
      PH_END,
    ]);
  }
  return tagPh(me);
}
export function cyl(x, y, z0, z1, r, m, seg = 20, r2, o = {}) {
  const g = new THREE.CylinderGeometry(r, r2 ?? r, z1 - z0, seg);
  const uv = g.attributes.uv,
    pp = g.attributes.position;
  for (let i = 0; i < pp.count; i++) uv.setXY(i, Math.atan2(pp.getZ(i), pp.getX(i)) * r, pp.getY(i) + (z0 + z1) / 2);
  const me = new THREE.Mesh(g, m);
  me.position.copy(V(x, y, (z0 + z1) / 2));
  me.castShadow = o.cast ?? true;
  me.receiveShadow = true;
  (o.parent || scene).add(me);
  if (o.col ?? (!o.parent && z1 - z0 > 0.12)) {
    const rm = Math.max(r, r2 ?? r);
    COL.push([x - rm, x + rm, y - rm, y + rm, z0, z1, '', PH, PH_END]);
  }
  return tagPh(me);
}
// ---------------- doors (hinged or sliding), registered for the walk controller ----------------
export const DOORS = {};
window.DOORS = DOORS;
// hinged: hinge at site (hx,hy), leaf along unit vector a (closed), width w, swing sign (+1 = counter-clockwise seen from above), height z0..z1
export function hingeDoor(key, group, { hx, hy, a, w, sign, z0, z1, thick = 0.08 }) {
  const theta = Math.atan2(a[1], a[0]);
  group.position.copy(V(hx, hy, z0));
  group.rotation.y = theta;
  tagPh(group);
  scene.add(group);
  group.traverse(o => {
    o.userData.door = key;
  });
  DOORS[key] = {
    key,
    kind: 'hinge',
    group,
    t: 0,
    target: 0,
    theta,
    sign,
    hx,
    hy,
    a,
    w,
    z: z0,
    z1,
    thick,
    pos: [hx + (a[0] * w) / 2, hy + (a[1] * w) / 2],
    ph: PH,
    var: VAR,
  };
  return DOORS[key];
}
function slideDoor(key, group, { x0, x1, pos, z0, z1, box }) {
  tagPh(group);
  scene.add(group);
  group.traverse(o => {
    o.userData.door = key;
  });
  DOORS[key] = { key, kind: 'slide', group, t: 0, target: 0, x0, x1, pos, z: z0, z1, box, ph: PH, var: VAR };
  return DOORS[key];
}
// hatch lid (trapdoor, roof hatch): the group's origin is on the hinge line; closed it lies flat, open it is turned by `open` radians about the
// three.js axis `rot` ('x' = hinge along site x, 'z' = hinge along site y). Closed, `walk` is a walk surface (added by the caller with this key at
// index 8); open, `openBox` is a collider (the standing lid). `pos` is where the player has to be to work it.
export function flapDoor(key, group, { hx, hy, z, rot, open, pos, openBox, label = 'Luke' }) {
  group.position.copy(V(hx, hy, z));
  tagPh(group);
  scene.add(group);
  group.traverse(o => {
    o.userData.door = key;
  });
  DOORS[key] = {
    key,
    kind: 'flap',
    group,
    t: 0,
    target: 0,
    rot,
    open,
    hx,
    hy,
    z,
    z1: z + 0.2,
    pos,
    openBox,
    label,
    ph: PH,
    var: VAR,
  };
  return DOORS[key];
}
// larch board door leaf built along local +X from the hinge (x = 0 .. w), with optional vision strip and handle
export function boardLeaf(w, h, { glass = null, boards = true, mat = MAT.larch } = {}) {
  const g = new THREE.Group();
  const leaf = new THREE.Mesh(new RoundedBoxGeometry(w - 0.02, h - 0.02, 0.06, 1, 0.006), mat);
  siteUV(leaf.geometry, 0, 0, 0, 'z');
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  leaf.position.set(w / 2, h / 2, 0);
  g.add(leaf);
  if (boards)
    for (let x = 0.15; x < w - 0.08; x += 0.145) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.004, h - 0.06, 0.062), MAT.black);
      s.position.set(x, h / 2, 0);
      g.add(s);
    }
  if (glass) {
    const [gx, gw, gz0, gz1] = glass;
    const win = new THREE.Mesh(new THREE.BoxGeometry(gw, gz1 - gz0, 0.064), MAT.glass);
    win.position.set(gx, (gz0 + gz1) / 2, 0);
    win.renderOrder = 2;
    g.add(win);
  }
  for (const zz of [0.045, -0.045]) {
    const hh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.36, 0.025), MAT.blacksteel);
    hh.position.set(w - 0.09, 1.05, zz);
    g.add(hh);
  }
  return g;
}
// framed glass door leaf (larch frame, single pane)
export function glassLeaf(w, h) {
  const g = new THREE.Group();
  const fw = 0.08;
  for (const [x0, x1, y0, y1] of [
    [0, fw, 0, h],
    [w - fw, w, 0, h],
    [fw, w - fw, 0, 0.12],
    [fw, w - fw, h - fw, h],
  ]) {
    const f = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0, 0.07, 1, 0.004), MAT.frame);
    f.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    f.castShadow = true;
    g.add(f);
  }
  const gl = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * fw, h - 0.12 - fw, 0.02), MAT.glass);
  gl.position.set(w / 2, (0.12 + h - fw) / 2, 0);
  gl.renderOrder = 2;
  g.add(gl);
  for (const zz of [0.05, -0.05]) {
    const hh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.3, 0.025), MAT.blacksteel);
    hh.position.set(w - 0.1, 1.05, zz);
    g.add(hh);
  }
  return g;
}
// ---------------- movable buildings (plan view): everything a block builds between bldBegin and bldEnd becomes one group ----------------
// Meshes are re-parented into a root group at the pivot; axis-aligned colliders and floors get a rotation descriptor relative to the pivot,
// existing descriptors are remembered with their original values; hinged doors, machines and placed models are moved by recomputing them.
export const BUILD = {};
window.BUILD = BUILD;
let BCUR = null;
export function bldBegin(key, label, c, opt = {}) {
  BCUR = {
    key,
    label,
    c: c.slice(),
    n0: scene.children.length,
    c0: COL.length,
    w0: WALK.length,
    d0: new Set(Object.keys(DOORS)),
    i0: (window.GLB_PLACED || []).length,
    opt,
  };
}
export function bldEnd(desc) {
  const C = BCUR;
  BCUR = null;
  if (!C) return null;
  let B = BUILD[C.key];
  if (!B) {
    const r = new THREE.Group();
    r.position.copy(V(C.c[0], C.c[1], 0));
    r.userData.bldRoot = C.key;
    scene.add(r);
    B = BUILD[C.key] = {
      key: C.key,
      label: C.label,
      short: C.opt.short || C.label,
      pivot: C.c,
      dx: 0,
      dy: 0,
      da: 0,
      root: r,
      rots: [],
      rotSet: new Set(),
      doors: [],
      items: [],
      descs: [],
      rects: [],
      tf: (x, y) => [x, y],
    };
  }
  const R = B.root;
  scene.updateMatrixWorld(true);
  for (const o of scene.children.slice(C.n0))
    if (o !== R && !(o.userData && (o.userData.door || o.userData.bldRoot)) && !o.isLight) R.attach(o);
  const P0 = { cx: C.c[0], cy: C.c[1], c: 1, s: 0 };
  const reg = r => {
    if (B.rotSet.has(r)) return;
    B.rotSet.add(r);
    B.rots.push({ o: r, cx0: r.cx, cy0: r.cy, a0: Math.atan2(r.s, r.c) });
  };
  const conv = e => {
    if (e[9]) {
      reg(e[9]);
      return;
    }
    e[0] -= C.c[0];
    e[1] -= C.c[0];
    e[2] -= C.c[1];
    e[3] -= C.c[1];
    e[9] = P0;
    reg(P0);
  };
  for (let i = C.c0; i < COL.length; i++) conv(COL[i]);
  for (let i = C.w0; i < WALK.length; i++) conv(WALK[i]);
  for (const k of Object.keys(DOORS))
    if (!C.d0.has(k)) {
      const d = DOORS[k];
      B.doors.push({ key: k, hx0: d.hx, hy0: d.hy, theta0: d.theta, pos0: d.pos ? d.pos.slice() : null });
    }
  for (const it of (window.GLB_PLACED || []).slice(C.i0)) {
    it.bld = C.key;
    B.items.push(it);
  }
  if (desc) B.descs.push({ b: desc, c0: desc.c.slice(), az0: desc.az });
  // footprint rectangles for the plan view (outline, overlap and boundary checks, grass): from the descriptor (L along az, W across) or given
  for (const q of C.opt.rects ||
    (desc && desc.L
      ? [{ c: desc.c, az: desc.az, hx: desc.L / 2 + (C.opt.pad || 0), hy: desc.W / 2 + (C.opt.pad || 0) }]
      : []))
    B.rects.push({ c0: q.c.slice(), az0: q.az, hx: q.hx, hy: q.hy });
  return B;
}
// footprint rectangles where the building stands now: centre, compass heading of the local x axis, half sizes
export function bldRects(B) {
  return B.rects.map(q => ({ c: B.tf(q.c0[0], q.c0[1]), az: q.az0 - B.da, hx: q.hx, hy: q.hy }));
}
export function rectCorners(r) {
  const a = (r.az * Math.PI) / 180,
    ux = [Math.sin(a), Math.cos(a)],
    vy = [-Math.cos(a), Math.sin(a)];
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([i, j]) => [r.c[0] + ux[0] * r.hx * i + vy[0] * r.hy * j, r.c[1] + ux[1] * r.hx * i + vy[1] * r.hy * j]);
}
export function inRect(r, x, y, pad = 0) {
  const a = (r.az * Math.PI) / 180,
    dx = x - r.c[0],
    dy = y - r.c[1],
    lx = dx * Math.sin(a) + dy * Math.cos(a),
    ly = -dx * Math.cos(a) + dy * Math.sin(a);
  return Math.abs(lx) <= r.hx + pad && Math.abs(ly) <= r.hy + pad;
}
// place a building: offsets (m) and turn (degrees, counter-clockwise) relative to its original position
function bldXf(px, py, dx, dy, da) {
  const th = (da * Math.PI) / 180,
    c = Math.cos(th),
    s = Math.sin(th);
  return {
    f: (x, y) => [px + (x - px) * c - (y - py) * s + dx, py + (x - px) * s + (y - py) * c + dy],
    inv: (x, y) => {
      const qx = x - px - dx,
        qy = y - py - dy;
      return [px + qx * c + qy * s, py - qx * s + qy * c];
    },
  };
}
export function bldSet(key, dx, dy, da) {
  const B = BUILD[key];
  if (!B) return;
  const [px, py] = B.pivot,
    old = bldXf(px, py, B.dx, B.dy, B.da),
    dRot = da - B.da;
  B.dx = dx;
  B.dy = dy;
  B.da = da;
  const th = (da * Math.PI) / 180,
    X = bldXf(px, py, dx, dy, da);
  B.tf = X.f;
  B.root.position.copy(V(px + dx, py + dy, 0));
  B.root.rotation.y = th;
  B.root.updateMatrixWorld(true);
  for (const r of B.rots) {
    const [x, y] = X.f(r.cx0, r.cy0);
    r.o.cx = x;
    r.o.cy = y;
    r.o.c = Math.cos(r.a0 + th);
    r.o.s = Math.sin(r.a0 + th);
  }
  for (const q of B.doors) {
    const D = DOORS[q.key];
    if (!D) continue;
    if (D.kind === 'hinge') {
      [D.hx, D.hy] = X.f(q.hx0, q.hy0);
      D.theta = q.theta0 + th;
      D.a = [Math.cos(D.theta), Math.sin(D.theta)];
      D.pos = [D.hx + (D.a[0] * D.w) / 2, D.hy + (D.a[1] * D.w) / 2];
      D.group.position.copy(V(D.hx, D.hy, D.z));
      LATE.poseDoor(D);
    } else if (q.pos0) D.pos = X.f(q.pos0[0], q.pos0[1]);
  }
  for (const q of B.descs) {
    const [x, y] = X.f(q.c0[0], q.c0[1]);
    q.b.c[0] = x;
    q.b.c[1] = y;
    q.b.az = q.az0 - da;
  }
  // placed models move along from where they are now (one may have been moved by hand before)
  for (const it of B.items.concat(B.extra || [])) {
    if (it.removed) continue;
    const pd = it.pending && it.pending.x != null ? it.pending : null,
      cx = pd ? pd.x : it.x,
      cy = pd ? pd.y : it.y,
      cr = pd && pd.rot != null ? pd.rot : it.rot || 0;
    const o = old.inv(cx, cy),
      [x, y] = X.f(o[0], o[1]),
      rot = (((cr + (it.kind === 'proc' ? -dRot : dRot)) % 360) + 360) % 360;
    if (it.registered && it.root) {
      it.x = x;
      it.y = y;
      it.rot = rot;
      LATE.applyItem(it);
    } else it.pending = Object.assign(it.pending || {}, { x, y, rot });
  }
  markDirty(true);
}
// ---------- collision and walk entries of a planner item (built-in furniture registers them while its module loads, the planner
// (pavilion/plan.js) when items move): footprint of the rotated box, COL entry (rotated box for angled items), WALK entry for walkable tops ----------
export function itemTheta(it) {
  return ((it.kind === 'glb' ? it.rot + (MODELS[it.type]?.front || 0) : -it.rot) * Math.PI) / 180;
} // CCW plan angle of the item's local x axis
export function itemFootprint(it) {
  const th = itemTheta(it),
    c = Math.abs(Math.cos(th)),
    s = Math.abs(Math.sin(th));
  const [w, h, d] = it.size;
  return { fx: (w * c + d * s) / 2, fy: (w * s + d * c) / 2, h };
}
// angled items get a rotated box (index 9 descriptor, same convention as the site buildings) instead of a fat AABB
function itemRot(it) {
  const th = itemTheta(it),
    d = ((((th * 180) / Math.PI) % 90) + 90) % 90;
  if (d < 0.5 || d > 89.5) return undefined;
  return { cx: it.x, cy: it.y, c: Math.cos(th), s: Math.sin(th) };
}
export function itemCol(it) {
  if (it.noCol) return;
  const f = itemFootprint(it),
    rot = itemRot(it);
  const [w, , d] = it.size;
  const e = rot
    ? [-w / 2, w / 2, -d / 2, d / 2, it.z, it.z + f.h, 'item', it.ph ?? null, null, rot, it.var ?? null]
    : [
        it.x - f.fx,
        it.x + f.fx,
        it.y - f.fy,
        it.y + f.fy,
        it.z,
        it.z + f.h,
        'item',
        it.ph ?? null,
        null,
        undefined,
        it.var ?? null,
      ];
  if (it.colIdx == null) {
    it.colIdx = COL.length;
    COL.push(e);
  } else {
    const c = COL[it.colIdx];
    for (let i = 0; i < 11; i++) c[i] = e[i];
  }
}
export function itemWalk(it) {
  if (!it.walk) return;
  const f = itemFootprint(it);
  const e = [
    it.x - f.fx,
    it.x + f.fx,
    it.y - f.fy,
    it.y + f.fy,
    it.z + f.h,
    it.walk,
    it.ph ?? null,
    null,
    undefined,
    undefined,
    it.var ?? null,
  ];
  if (it.walkIdx == null) {
    it.walkIdx = WALK.length;
    WALK.push(e);
  } else {
    const w = WALK[it.walkIdx];
    for (let i = 0; i < 11; i++) w[i] = e[i];
  }
}
