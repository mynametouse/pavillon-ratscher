// ---------------- garden trees: procedural ez-tree models (bark + leaf textures), instanced ----------------
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Tree } from '../eztree/tree.js';
import { BASE, QS, R, rnd, rr, scene, V } from '../core/head.js';
import {
  cellsOf,
  GI,
  instanceVariants,
  LM,
  markDirty,
  MODELS,
  patchSV,
  SV,
  VEG,
  vegReady,
  whenLoaded,
} from '../core/assets.js';
import { bldRects, BUILD, COL } from '../core/geo.js';
import { STREAM } from './stream_geo.js';
import { GEO_REAL, inLake, PATHS, S0 } from './env.js';
import { inLocal } from './site_base.js';
globalThis.EZ_TREE_BASE = BASE + 'tree/';
globalThis.EZ_TREE_MANAGER = LM;
const TREE_KINDS = [
  { key: 'oakA', preset: 'Oak Medium', seed: 1201, tint: 0xbfd09a },
  { key: 'oakB', preset: 'Oak Medium', seed: 77, tint: 0xc8d3a0 },
  { key: 'ash', preset: 'Ash Medium', seed: 4242, tint: 0xc7d6a2 },
  { key: 'aspen', preset: 'Aspen Medium', seed: 911, tint: 0xd2d9a6 },
  {
    key: 'apple',
    preset: 'Oak Small',
    seed: 3131,
    tint: 0xb9cc8f,
    mod: o => {
      o.branch.angle['1'] = 62;
      o.leaves.size = 1.9;
      o.bark.type = 'willow';
    },
  },
  { key: 'pine', preset: 'Pine Medium', seed: 555, tint: 0xffffff },
  // the hedge belts round the garden (photos 26.10.2026): hazel, field maple, elder – two bush shapes
  { key: 'bushA', preset: 'Bush 1', seed: 501, tint: 0xc9d39a },
  { key: 'bushB', preset: 'Bush 2', seed: 77, tint: 0xd3d49a },
];
const leafDepthMats = {};
export function buildTreeKind(k) {
  const t = new Tree();
  t.loadPreset(k.preset);
  t.options.seed = k.seed;
  if (k.mod) k.mod(t.options);
  t.options.leaves.tint = k.tint;
  t.generate();
  const bg = t.branchesMesh.geometry,
    lg = t.leavesMesh.geometry;
  bg.computeBoundingBox();
  lg.computeBoundingBox();
  const bb = bg.boundingBox.clone().union(lg.boundingBox);
  const H = bb.max.y - Math.max(0, bb.min.y),
    Rr = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
  // crown-shaped leaf normals (soft, volumetric shading instead of flat cards)
  {
    const p = lg.attributes.position,
      c = lg.boundingBox.getCenter(new THREE.Vector3());
    const n = new Float32Array(p.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i) - c.x, (p.getY(i) - c.y) * 0.7 + (bb.max.y - bb.min.y) * 0.25, p.getZ(i) - c.z).normalize();
      n[i * 3] = v.x;
      n[i * 3 + 1] = v.y;
      n[i * 3 + 2] = v.z;
    }
    lg.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  }
  const om = t.branchesMesh.material,
    ol = t.leavesMesh.material;
  const bark = patchSV(
    new THREE.MeshStandardMaterial({
      color: om.color,
      map: om.map || null,
      normalMap: om.normalMap || null,
      roughnessMap: om.roughnessMap || null,
      aoMap: om.aoMap || null,
      roughness: 1,
      envMapIntensity: 0.7,
    })
  );
  const leaf = patchSV(
    new THREE.MeshStandardMaterial({
      color: ol.color,
      map: ol.map,
      alphaTest: Math.max(0.35, ol.alphaTest || 0.5),
      side: THREE.DoubleSide,
      roughness: 0.8,
      envMapIntensity: 0.6,
    })
  );
  leaf.userData.leaf = true;
  if (!leafDepthMats[k.preset])
    leafDepthMats[k.preset] = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: ol.map,
      alphaTest: leaf.alphaTest,
    });
  return { bg, lg, bark, leaf, depth: leafDepthMats[k.preset], H, R: Rr, items: [] };
}
export const TREES = {};
const treeTrunks = [];
export const TREEG = new THREE.Group();
TREEG.userData.noMerge = true;
scene.add(TREEG);
window.TREEG = TREEG; // trees within 55 m: hidden in the plan view on request
const GLBT = { fir: [], smalltree: [] };
function addTreeInst(kind, x, y, h, r) {
  if (kind === 'pine' && MODELS.fir) {
    GLBT.fir.push({ x, y, s: (h / 14.08) * rr(0.95, 1.05) });
    treeTrunks.push([x, y, 0.2]);
    return;
  }
  if (kind === 'apple' && MODELS.smalltree) {
    const s = Math.min(h / 3.4, 1.9) * rr(0.9, 1.05);
    GLBT.smalltree.push({ x, y, s: [s * rr(0.9, 1.1), s, s * rr(0.9, 1.1)] });
    treeTrunks.push([x, y, 0.16]);
    return;
  }
  const K = TREES[kind];
  if (!K) return;
  K.items.push([x, y, h, r]);
  treeTrunks.push([x, y, Math.min(0.28, 0.06 + h * 0.012)]);
}
// distant trees: a third of the leaf cards, each card enlarged (same crown density from afar, a third of the triangles)
export function thinCards(geo, keep, grow) {
  const g2 = geo.clone(),
    idx = geo.index.array,
    P = g2.attributes.position,
    out = [];
  const c = new THREE.Vector3(),
    v = new THREE.Vector3();
  for (let q = 0; q < idx.length / 6; q++) {
    const h = Math.sin(q * 12.9898) * 43758.5453;
    if (h - Math.floor(h) > keep) continue;
    const i0 = idx[q * 6];
    c.set(0, 0, 0);
    for (let k = 0; k < 4; k++) c.add(v.fromBufferAttribute(P, i0 + k));
    c.multiplyScalar(0.25);
    for (let k = 0; k < 4; k++) {
      v.fromBufferAttribute(P, i0 + k)
        .sub(c)
        .multiplyScalar(grow)
        .add(c);
      P.setXYZ(i0 + k, v.x, v.y, v.z);
    }
    for (let k = 0; k < 6; k++) out.push(idx[q * 6 + k]);
  }
  g2.setIndex(out);
  return g2;
}
const sector8 = it => Math.floor((Math.atan2(it.x - 2, it.y - 2) + Math.PI) / (Math.PI / 4));
function flushTreeInst() {
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  for (const K of Object.values(TREES)) {
    if (!K.items.length) continue;
    const near = [],
      far = [];
    for (const a of K.items) (Math.hypot(a[0] - 2, a[1] - 2) < 55 ? near : far).push({ x: a[0], y: a[1], a });
    if (!K.lgFar) K.lgFar = thinCards(K.lg, 0.35, 1.55);
    // one InstancedMesh per 24 m cell in the garden (trees behind the camera are not drawn); the thinned ring outside is one mesh per kind
    for (const [grp, isFar] of [...cellsOf(near, 24).map(g => [g, false]), ...(far.length ? [[far, true]] : [])]) {
      const ib = new THREE.InstancedMesh(K.bg, K.bark, grp.length),
        il = new THREE.InstancedMesh(isFar ? K.lgFar : K.lg, K.leaf, grp.length);
      grp.forEach(({ a: [x, y, h, r] }, i) => {
        const sy = h / K.H,
          sx = THREE.MathUtils.clamp(r / K.R, sy * 0.75, sy * 1.3);
        q.setFromAxisAngle(up, rnd() * 6.283);
        m4.compose(V(x, y, 0), q, new THREE.Vector3(sx, sy, sx));
        ib.setMatrixAt(i, m4);
        il.setMatrixAt(i, m4);
        il.setColorAt(i, new THREE.Color(1, 1, 1).multiplyScalar(rr(0.82, 1.06)));
      });
      for (const im of [ib, il]) {
        im.castShadow = !isFar;
        im.receiveShadow = true;
        im.userData.noMerge = true;
        vegReady(im);
        (isFar ? scene : TREEG).add(im);
      }
      il.customDepthMaterial = K.depth;
      // near cells: full crowns within 30 m of the camera, the thinned crowns (a third of the cards) beyond – same instances
      if (!isFar) {
        const lo = new THREE.InstancedMesh(K.lgFar, K.leaf, grp.length);
        lo.instanceMatrix = il.instanceMatrix;
        lo.instanceColor = il.instanceColor;
        lo.castShadow = true;
        lo.receiveShadow = true;
        lo.userData.noMerge = true;
        lo.customDepthMaterial = K.depth;
        lo.frustumCulled = true;
        lo.computeBoundingSphere();
        lo.visible = false;
        TREEG.add(lo);
        il.computeBoundingSphere();
        VEG.lod.push({ hi: il, lo, d: 30 });
      }
    }
  }
  for (const [x, y, rad] of treeTrunks) COL.push([x - rad, x + rad, y - rad, y + rad, 0, 4, 'tree']);
  if (GLBT.fir.length) instanceVariants('fir', GLBT.fir, { env: 0.6, tint: 0xe8f0dc, cell: 24, parent: TREEG });
  if (GLBT.smalltree.length)
    instanceVariants('smalltree', GLBT.smalltree, {
      env: 0.6,
      cell: 24,
      thin: { match: /leaves/i, keep: 0.42, grow: 1.45 },
      parent: TREEG,
    });
}
const camPathPts = [];
for (const PA of PATHS) {
  for (const q of PA) camPathPts.push(q);
  for (let i = 0; i < PA.length - 1; i++)
    for (let f = 0; f < 1; f += 0.2)
      camPathPts.push([PA[i][0] + (PA[i + 1][0] - PA[i][0]) * f, PA[i][1] + (PA[i + 1][1] - PA[i][1]) * f]);
}
function nearPath(x, y, d) {
  for (const p of camPathPts) {
    if (Math.hypot(p[0] - x, p[1] - y) < d) return true;
  }
  for (const f of window.SITE_FOOT || []) if (inLocal(f.b, x, y, f.hx + 0.35, f.hy + 0.35, f.ox, f.oy)) return true;
  return false;
}
// nothing grows through a building (Falko, 29.10.2026): true when (x, y) is within m metres of a building's footprint – every registered
// building (BUILD rects: garden houses, workshop hall and lean-to, garage …), Hubert's sheds (site.json neigh) and the old garage
function inRectM(r, x, y, m) {
  const a = (r.az * Math.PI) / 180,
    dx = x - r.c[0],
    dy = y - r.c[1],
    u = dx * Math.sin(a) + dy * Math.cos(a),
    v = dx * Math.sin(a - Math.PI / 2) + dy * Math.cos(a - Math.PI / 2);
  return Math.abs(u) < r.hx + m && Math.abs(v) < r.hy + m;
}
function inPolyM(P, x, y, m) {
  let c = false,
    d = 1e9;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i],
      [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    const ex = xj - xi,
      ey = yj - yi,
      t = Math.max(0, Math.min(1, ((x - xi) * ex + (y - yi) * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(x - xi - t * ex, y - yi - t * ey));
  }
  return c || d < m;
}
function inBuilding(x, y, m) {
  for (const k in BUILD) for (const r of bldRects(BUILD[k])) if (inRectM(r, x, y, m)) return true;
  if ((S0.neigh || []).some(P => inPolyM(P, x, y, m))) return true;
  if (S0.garage && inPolyM(S0.garage, x, y, m)) return true;
  return false;
}
// inside the garden polygon (site.json) by at least m metres (m < 0: up to -m outside)
function inGarden(x, y, m = 0) {
  const P = S0.garden;
  let c = false,
    d = 1e9;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i],
      [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    const ex = xj - xi,
      ey = yj - yi,
      t = Math.max(0, Math.min(1, ((x - xi) * ex + (y - yi) * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(x - xi - t * ex, y - yi - t * ey));
  }
  return c ? d >= m : -d >= m;
}
// hedge belts along the garden's edges as on Falko's photos of 26.10.2026: dense on the north side by the field path (with the two gates
// open), along the south end and the south-west corner behind the workshop; sparse bushes on the east fence; none on the west side, which
// opens onto Hubert's yard. A bush every ~1.7 m, 1 m inside the edge; never on a path or in a building (nearPath).
const GATES = [
  [4.0, 30.6, 2.6], // the double gate from the field path (x, y, half gap)
  [17.8, 20.4, 1.6], // the small gate by the stream
  [-8.86, 39.08, 2.5], // site.json entrance
];
// the brook's banks are overgrown (photos of 26.10.2026): low bushes and tall weeds just outside both top edges of the ditch, with gaps;
// none at the bridge
function bankBushes() {
  for (let t = 1; t < STREAM.L0 - 1; t += 1.5) {
    if (Math.abs(t - STREAM.TB) < 3.5) continue;
    for (const side of [-1, 1]) {
      if (rnd() < 0.3) continue;
      const [x, y] = STREAM.wpt(t + rr(-0.5, 0.5), STREAM.OFF + side * (STREAM.WT + rr(0.35, 1.0)));
      const r = rr(0.8, 1.3);
      if (nearPath(x, y, 1.2) || inBuilding(x, y, r)) continue;
      addTreeInst(rnd() < 0.5 ? 'bushA' : 'bushB', x, y, rr(1.4, 2.3), r);
    }
  }
}
function hedges() {
  bankBushes();
  const P = S0.garden,
    dense = (x, y) => y > 18 || y < -36 || (x < -4 && y < -18),
    sparse = (x, y) => x > 10 && y > -36 && y <= 18;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i],
      [x1, y1] = P[i + 1],
      L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 0.5) continue;
    // inward normal: the side the polygon lies on
    let nx = -(y1 - y0) / L,
      ny = (x1 - x0) / L;
    const mx = (x0 + x1) / 2,
      my = (y0 + y1) / 2;
    if (!inGarden(mx + nx * 1.2, my + ny * 1.2)) {
      nx = -nx;
      ny = -ny;
    }
    for (let t = 0.85; t < L; t += 1.7) {
      const x = x0 + ((x1 - x0) * t) / L + nx * rr(0.7, 1.3),
        y = y0 + ((y1 - y0) * t) / L + ny * rr(0.7, 1.3);
      const d = dense(x, y),
        sp = !d && sparse(x, y);
      if (!d && !(sp && rnd() < 0.35)) continue;
      if (
        GATES.some(([gx, gy, r]) => Math.hypot(x - gx, y - gy) < r) ||
        nearPath(x, y, 1.4) ||
        STREAM.inDitch(x, y, 0.4)
      )
        continue;
      const r = rr(1.3, 2.0);
      if (inBuilding(x, y, r * 0.9)) continue; // the crown keeps clear of walls and roofs
      addTreeInst(rnd() < 0.5 ? 'bushA' : 'bushB', x, y, rr(2.6, 4.2), r);
    }
  }
}
// distant ring: cheap crown blobs
const farBlobs = [];
function buildTrees() {
  for (const k of TREE_KINDS) {
    try {
      TREES[k.key] = buildTreeKind(k);
    } catch (e) {
      console.warn('tree', k.key, e);
    }
  }
  S0.trees.forEach((t, i) => {
    const [x, y, r, h] = t;
    if (nearPath(x, y, 1.2)) return;
    if (inBuilding(x, y, 0.8)) return; // a trunk in a footprint: the tree would grow through the roof
    let kind = 'ash';
    if (r >= 4.5) kind = 'oakA';
    else if (h <= 8.0) kind = 'apple';
    else if (r < 2.4 && h > 10.5) kind = i % 2 ? 'pine' : 'aspen';
    else if (r >= 3.0) kind = i % 2 ? 'oakB' : 'oakA';
    else kind = i % 3 === 0 ? 'aspen' : 'ash';
    addTreeInst(kind, x, y, h, r);
  });
  hedges();
  const keep0 = Object.fromEntries(Object.entries(TREES).map(([k, K]) => [k, K.items.length])),
    trunks0 = treeTrunks.length;
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2,
      r = rr(70, 900);
    const x = Math.sin(a) * r,
      y = Math.cos(a) * r;
    if (inLake(x, y) < 1.3) continue;
    if (Math.hypot(x - 5, y + 60) < 60 && rnd() < 0.6) continue;
    const h = rr(9, 15),
      cr = rr(3, 5);
    if (STREAM.inDitch(x, y, 0.6)) continue;
    if (r < 150) addTreeInst(['oakA', 'ash', 'oakB', 'aspen'][i % 4], x, y, h, cr);
    else {
      farTrees.push([x, y, h, cr, i % 4]);
      for (let k = 0; k < 3; k++) {
        const aa = rnd() * 6.283,
          d = rr(0, 0.5) * cr;
        farBlobs.push([x + Math.cos(aa) * d, y + Math.sin(aa) * d, h * 0.64 + rr(-0.15, 0.2) * h, cr * rr(0.4, 0.6)]);
      }
    }
  }
  // with the real surroundings the made-up trees are dropped again (the loop still runs: the random sequence for everything after stays the same)
  if (GEO_REAL) {
    for (const [k, n] of Object.entries(keep0)) TREES[k].items.length = n;
    treeTrunks.length = trunks0;
    farTrees.length = 0;
    farBlobs.length = 0;
  }
  flushTreeInst();
  if (farBlobs.length) {
    const m4 = new THREE.Matrix4(),
      geo = new THREE.IcosahedronGeometry(1, 0),
      mat = new THREE.MeshStandardMaterial({ roughness: 1, envMapIntensity: 0.5 });
    const items = farBlobs.map((b, i) => ({ x: b[0], y: b[1], b, i }));
    for (const grp of cellsOf(items, 0, sector8)) {
      const im = new THREE.InstancedMesh(geo, mat, grp.length);
      grp.forEach(({ b, i }, k) => {
        m4.compose(V(b[0], b[1], b[2]), new THREE.Quaternion(), new THREE.Vector3(b[3], b[3] * 0.9, b[3]));
        im.setMatrixAt(k, m4);
        im.setColorAt(k, new THREE.Color([0x4f6a38, 0x5a7440, 0x465f33, 0x627b45][i % 4]));
      });
      im.userData.noMerge = true;
      vegReady(im);
      scene.add(im);
      farBlobMeshes.push(im);
    }
  }
}
// far trees (150–900 m): once the bark and leaf pictures have loaded, each blob cluster becomes a crossed pair of cards showing a
// picture of a real generated tree of that kind (albedo only, rendered once at load) – tree silhouettes on the horizon instead of balls
const farTrees = [],
  farBlobMeshes = [];
function treeImpostor(K, px = 256) {
  const sc = new THREE.Scene();
  sc.add(new THREE.AmbientLight(0xffffff, Math.PI));
  sc.add(new THREE.Mesh(K.bg, K.bark), new THREE.Mesh(K.lg, K.leaf));
  const bb = new THREE.Box3().setFromObject(sc),
    sz = bb.getSize(new THREE.Vector3()),
    c = bb.getCenter(new THREE.Vector3()),
    hw = (Math.max(sz.x, sz.z) / 2) * 1.02,
    hh = (sz.y / 2) * 1.02;
  const cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 0.1, 400);
  cam.position.set(c.x, c.y, c.z + 150);
  cam.lookAt(c);
  const rt = new THREE.WebGLRenderTarget(Math.round((px * hw) / hh), px, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const sv = SV.on.value,
    gi = GI.on.value,
    env = scene.environment;
  SV.on.value = 0;
  GI.on.value = 0;
  const pt = R.getRenderTarget(),
    pc = R.getClearColor(new THREE.Color()),
    pa = R.getClearAlpha(),
    tm = R.toneMapping;
  R.setRenderTarget(rt);
  R.setClearColor(0x3f4b30, 0);
  R.clear();
  R.render(sc, cam); // foliage-coloured background: the mip levels of a far tree do not darken towards black
  // put everything back (since V16e these four statements were stuck inside the comment above – found 23.10.2026)
  R.setRenderTarget(pt);
  R.setClearColor(pc, pa);
  SV.on.value = sv;
  GI.on.value = gi;
  return { tex: rt.texture, w: hw * 2, h: hh * 2, base: bb.min.y - c.y + hh };
}
function buildFarImpostors() {
  if (!farTrees.length || QS.get('blobs')) return;
  const kinds = ['oakA', 'ash', 'oakB', 'aspen'].map(k => TREES[k]);
  if (kinds.some(K => !K || !K.leaf.map || !K.leaf.map.image)) return;
  const imp = kinds.map(K => treeImpostor(K));
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  const cross = (() => {
    const a = new THREE.PlaneGeometry(1, 1),
      b = new THREE.PlaneGeometry(1, 1);
    b.rotateY(Math.PI / 2);
    const g = BufferGeometryUtils.mergeGeometries([a, b]);
    g.translate(0, 0.5, 0);
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return g;
  })();
  imp.forEach((I, ki) => {
    const list = farTrees.filter(t => t[4] === ki);
    if (!list.length) return;
    const m0 = new THREE.MeshStandardMaterial({
      map: I.tex,
      alphaTest: 0.32,
      side: THREE.DoubleSide,
      roughness: 1,
      envMapIntensity: 0.55,
    });
    // both sides keep the upward normal (a double-sided material would turn it down on the back faces: half of the trees went black)
    m0.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\n normal = normalize( vNormal ); nonPerturbedNormal = normal;'
      );
    };
    m0.customProgramCacheKey = () => 'impostor';
    const mat = patchSV(m0);
    const items = list.map(([x, y, h, cr]) => ({ x, y, h, cr }));
    for (const grp of cellsOf(items, 0, sector8)) {
      const im = new THREE.InstancedMesh(cross, mat, grp.length);
      grp.forEach(({ x, y, h, cr }, k) => {
        const sy = h * rr(0.95, 1.1),
          sx = Math.max((sy * I.w) / I.h, cr * 2.1);
        q.setFromAxisAngle(up, rnd() * 6.283);
        m4.compose(V(x, y, -0.2), q, new THREE.Vector3(sx, sy, sx));
        im.setMatrixAt(k, m4);
        im.setColorAt(k, new THREE.Color(1, 1, 1).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.06, 0.04)));
      });
      im.userData.noMerge = true;
      vegReady(im);
      scene.add(im);
    }
  });
  for (const m of farBlobMeshes) scene.remove(m);
  markDirty();
}
buildTrees();
whenLoaded(() => {
  try {
    buildFarImpostors();
  } catch (e) {
    console.warn('far trees', e);
  }
});
