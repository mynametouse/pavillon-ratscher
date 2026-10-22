// ===================== Planungsmodus: Gegenstände greifen, verschieben, drehen, stapeln, hinzufügen, löschen; Layout im Browser gespeichert =====================
const ITEMS = [];
let ITEM_N = 0;
const PLAN = { on: false, sel: null, drag: null, dirtyLayout: false };
const PROC = {
  // procedural items built in a local frame (origin at the base centre, +y = front)
  bank: {
    label: 'Gartenbank',
    size: [1.6, 0.86, 0.55],
    build: g => {
      gB(g, -0.78, 0.78, -0.25, 0.22, 0.42, 0.46, MAT.larch);
      gB(g, -0.78, 0.78, -0.27, -0.2, 0.46, 0.86, MAT.larch);
      for (const x of [-0.72, 0.72]) {
        gB(g, x - 0.03, x + 0.03, -0.25, 0.22, 0, 0.42, MAT.larch, { grain: 'z' });
        gB(g, x - 0.03, x + 0.03, -0.27, -0.2, 0.42, 0.86, MAT.larch, { grain: 'z' });
      }
    },
  },
  tisch: {
    label: 'Gartentisch',
    size: [1.4, 0.74, 0.8],
    build: g => {
      gB(g, -0.7, 0.7, -0.4, 0.4, 0.7, 0.74, MAT.larch);
      for (const [x, y] of [
        [-0.62, -0.32],
        [0.62, -0.32],
        [-0.62, 0.32],
        [0.62, 0.32],
      ])
        gB(g, x - 0.03, x + 0.03, y - 0.03, y + 0.03, 0, 0.7, MAT.larch, { grain: 'z' });
    },
  },
  liege: {
    label: 'Liege',
    size: [0.7, 0.75, 1.95],
    build: g => {
      for (const x of [-0.3, 0.3])
        for (const y of [-0.9, 0.85]) gB(g, x - 0.03, x + 0.03, y - 0.03, y + 0.03, 0, 0.36, MAT.larch, { grain: 'z' });
      gB(g, -0.35, 0.35, -0.95, 0.5, 0.36, 0.41, MAT.larch, { grain: 'y' });
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.55), MAT.larch);
      bk.position.copy(V(0, 0.68, 0.55));
      bk.rotation.x = -0.75;
      bk.castShadow = true;
      g.add(bk);
      RB(-0.3, 0.3, -0.9, 0.45, 0.41, 0.47, 0.03, MAT.woolLight, { parent: g, cast: false });
    },
  },
  hochbeet: {
    label: 'Hochbeet',
    size: [1.2, 0.8, 0.8],
    build: g => {
      gB(g, -0.6, 0.6, -0.4, 0.4, 0, 0.8, MAT.larch, { grain: 'x' });
      gB(g, -0.56, 0.56, -0.36, 0.36, 0.7, 0.81, MAT.soil, { cast: false });
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.12 + Math.random() * 0.06, 8, 6),
          plain({ color: 0x3f7f35, roughness: 0.9 })
        );
        s.position.copy(V(-0.4 + (i % 3) * 0.4, i < 3 ? -0.18 : 0.18, 0.9));
        s.scale.set(1, 0.7, 1);
        s.castShadow = true;
        g.add(s);
      }
    },
  },
  feuer: {
    label: 'Feuerschale',
    size: [0.8, 0.45, 0.8],
    build: g => {
      cyl(0, 0, 0.3, 0.45, 0.4, NM.dark, 24, 0.25, { parent: g });
      for (const a of [0, 2.1, 4.2])
        cyl(Math.sin(a) * 0.25, Math.cos(a) * 0.25, 0, 0.32, 0.02, NM.dark, 8, undefined, { parent: g });
      for (let i = 0; i < 5; i++) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), MAT.logs);
        l.position.copy(V(0, 0, 0.5));
        l.rotation.z = Math.PI / 2;
        l.rotation.y = i * 0.6;
        l.castShadow = true;
        g.add(l);
      }
    },
  },
  kuebel: {
    label: 'Pflanzkübel',
    size: [0.5, 1.1, 0.5],
    build: g => {
      cyl(0, 0, 0, 0.45, 0.24, MAT.pot, 18, 0.19, { parent: g });
      cyl(0, 0, 0.44, 0.46, 0.21, MAT.soil, 18, undefined, { parent: g, cast: false });
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.14 + Math.random() * 0.06, 8, 6),
          plain({ color: 0x4a8a3e, roughness: 0.9 })
        );
        const a = i * 0.9;
        s.position.copy(V(Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0.65 + (i % 3) * 0.14));
        s.castShadow = true;
        g.add(s);
      }
    },
  },
  laterne: {
    label: 'Gartenlaterne',
    size: [0.25, 1.2, 0.25],
    build: g => {
      cyl(0, 0, 0, 1.0, 0.02, MAT.blacksteel, 8, undefined, { parent: g });
      gB(g, -0.1, 0.1, -0.1, 0.1, 1.0, 1.02, MAT.blacksteel);
      gB(g, -0.09, 0.09, -0.09, 0.09, 1.02, 1.18, MAT.paper, { cast: false });
      gB(g, -0.11, 0.11, -0.11, 0.11, 1.18, 1.2, MAT.blacksteel, { cast: false });
    },
  },
  platte: {
    label: 'Trittplatte',
    size: [0.5, 0.04, 0.5],
    build: g => {
      gB(g, -0.25, 0.25, -0.25, 0.25, 0, 0.04, MAT.stone, { cast: false, bevel: 0.01 });
    },
    walk: 'stone',
  },
  baum: {
    label: 'Junger Obstbaum',
    size: [1.6, 2.6, 1.6],
    build: g => {
      cyl(0, 0, 0, 1.3, 0.05, MAT.logs, 10, 0.035, { parent: g });
      for (let i = 0; i < 9; i++) {
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.35 + Math.random() * 0.15, 9, 7),
          plain({ color: 0x4c8a3c, roughness: 0.95 })
        );
        const a = i * 0.7,
          r = i ? 0.45 : 0;
        s.position.copy(V(Math.sin(a) * r, Math.cos(a) * r, 1.6 + (i % 3) * 0.35));
        s.castShadow = true;
        g.add(s);
      }
    },
  },
  zaun: {
    label: 'Zaunelement',
    size: [1.8, 0.9, 0.08],
    build: g => {
      for (const x of [-0.85, 0.85]) gB(g, x - 0.04, x + 0.04, -0.04, 0.04, 0, 0.9, MAT.plank, { grain: 'z' });
      for (const z of [0.3, 0.75]) gB(g, -0.9, 0.9, -0.015, 0.015, z, z + 0.08, MAT.plank);
    },
  },
};
const GLB_ITEMS = {
  armchair: 'Sessel',
  desk_chair: 'Stuhl',
  side_table: 'Beistelltisch',
  footstool: 'Hocker',
  plant_a: 'Pflanze (Topf)',
  succulent: 'Sukkulente',
  lantern_t: 'Laterne (Holz)',
  basket: 'Korb',
  books: 'Bücherreihe',
  bowl: 'Schale',
  vase: 'Vase',
  ukulele: 'Ukulele',
  stump: 'Baumstumpf',
};
function itemKey(type) {
  return type + '#' + ITEM_N++;
}
function itemTheta(it) {
  return ((it.kind === 'glb' ? it.rot + (MODELS[it.type]?.front || 0) : -it.rot) * Math.PI) / 180;
} // CCW plan angle of the item's local x axis
function itemFootprint(it) {
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
function itemCol(it) {
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
function itemWalk(it) {
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
function applyItem(it) {
  const r = it.root;
  if (it.kind === 'glb') {
    r.rotation.y = ((it.rot + (MODELS[it.type]?.front || 0)) * Math.PI) / 180;
    r.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(r),
      cc = box.getCenter(new THREE.Vector3());
    const t = V(it.x, it.y, it.z);
    r.position.set(r.position.x + t.x - cc.x, r.position.y + t.y - box.min.y, r.position.z + t.z - cc.z);
  } else {
    r.position.copy(V(it.x, it.y, it.z));
    r.rotation.y = (-it.rot * Math.PI) / 180;
  }
  r.visible = !it.removed && (window.PHASE ?? 99) >= (it.ph ?? 0) && varOk(it.var);
  itemCol(it);
  itemWalk(it);
  if (it.removed && it.colIdx != null) {
    COL[it.colIdx][5] = COL[it.colIdx][4];
  }
  markDirty(true);
}
// support height under a footprint: floor level plus any furniture / item top below 1.3 m (stacking: books on the table, lantern on the stool)
function supportZ(x, y, fx, fy, zRef, exclude) {
  let best = Math.max(0, floorAt(x, y, zRef + 0.6));
  const feet = best;
  for (let i = 0; i < COL.length; i++) {
    if (exclude != null && i === exclude) continue;
    const c = COL[i];
    if (!phOk(c)) continue;
    let qx = x,
      qy = y,
      gx = fx,
      gy = fy;
    if (c[9]) {
      const r = c[9],
        dx = x - r.cx,
        dy = y - r.cy;
      qx = dx * r.c + dy * r.s;
      qy = -dx * r.s + dy * r.c;
      gx = gy = Math.max(fx, fy);
    }
    if (c[0] > qx + gx || c[1] < qx - gx || c[2] > qy + gy || c[3] < qy - gy) continue;
    const top = c[5];
    if (top > best && top <= feet + 1.35 && top <= zRef + 1.0) best = top;
  }
  return best;
}
// ---- GLB placements from the interior (pavilion/interior.js) register here once their model has loaded ----
function registerItem(it) {
  if (it.registered) return it;
  it.registered = true;
  it.label = it.label || GLB_ITEMS[it.type] || (PROC[it.type] && PROC[it.type].label) || it.type;
  it.key = it.key || itemKey(it.type);
  it.root.userData.item = it;
  it.root.traverse(o => {
    o.userData.noMerge = true;
  });
  ITEMS.push(it);
  if (it.pending) {
    Object.assign(it, it.pending);
    delete it.pending;
    applyItem(it);
  }
  return it;
}
window.registerItem = registerItem;
for (const it of window.GLB_PLACED || []) if (it.root) registerItem(it);
// ---- creating new items ----
function spawnItem(type, x, y, z, rot = 0, cb) {
  if (type.startsWith('grp:')) {
    const src = (window.GLB_PLACED || []).find(o => o.key === type.slice(4));
    if (!src || !src.root) return null; // copy of a built-in piece
    const ud = src.root.userData.item;
    delete src.root.userData.item;
    const g = src.root.clone(true);
    if (ud) src.root.userData.item = ud;
    scene.add(g);
    const it = registerItem({
      kind: 'grp',
      type,
      label: src.label,
      x,
      y,
      z,
      rot,
      size: src.size.slice(),
      root: g,
      added: true,
      var: src.var,
      ph: src.ph,
    });
    applyItem(it);
    if (cb) cb(it);
    return it;
  }
  if (PROC[type]) {
    const p = PROC[type];
    const g = new THREE.Group();
    p.build(g);
    g.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(g);
    const it = registerItem({
      kind: 'proc',
      type,
      label: p.label,
      x,
      y,
      z,
      rot,
      size: p.size.slice(),
      root: g,
      walk: p.walk || null,
      noCol: !!p.walk,
      added: true,
    });
    applyItem(it);
    if (cb) cb(it);
    return it;
  }
  const mm = MODELS[type];
  if (!mm) return null;
  const bb = mm.bbox || [0.6, 0.8, 0.6];
  const h =
    {
      armchair: 1.0,
      desk_chair: 0.9,
      side_table: 0.55,
      footstool: 0.45,
      plant_a: 0.8,
      succulent: 0.27,
      lantern_t: 0.4,
      basket: 0.24,
      books: null,
      bowl: null,
      vase: 0.3,
      ukulele: 0.6,
      stump: 0.5,
    }[type] ?? null;
  const w = { books: 0.45, bowl: 0.3 }[type] ?? null;
  const s = h ? h / bb[1] : w ? w / Math.max(bb[0], bb[2]) : 1;
  loadModel(
    type,
    root => {
      if (!root) return;
      root.scale.setScalar(s);
      root.userData.glb = type;
      scene.add(root);
      const it = registerItem({
        kind: 'glb',
        type,
        label: GLB_ITEMS[type] || type,
        x,
        y,
        z,
        rot,
        size: [bb[0] * s, bb[1] * s, bb[2] * s],
        root,
        added: true,
        noCol: ['books', 'bowl', 'vase', 'succulent', 'ukulele'].includes(type),
      });
      applyItem(it);
      if (cb) cb(it);
    },
    null
  );
  return true;
}
// ---- selection, dragging, toolbar ----
const SEL = { box: null };
function select(it) {
  PLAN.sel = it;
  if (SEL.box) {
    scene.remove(SEL.box);
    SEL.box = null;
  }
  if (it) {
    SEL.box = new THREE.BoxHelper(it.root, 0xffd24a);
    SEL.box.userData.noMerge = true;
    scene.add(SEL.box);
  }
  updateBar();
  markDirty(true);
}
function refreshSel() {
  if (SEL.box && PLAN.sel) SEL.box.update();
}
function updateBar() {
  const bar = $('planbar');
  if (!bar) return;
  bar.hidden = !PLAN.on;
  const it = PLAN.sel;
  $('pb-name').textContent = it ? it.label : 'Gegenstand antippen';
  bar.querySelectorAll('[data-pa]').forEach(b => {
    b.disabled = !it && b.dataset.pa !== 'add' && b.dataset.pa !== 'reset' && b.dataset.pa !== 'done';
  });
}
const _ray2 = new THREE.Raycaster(),
  _plane = new THREE.Plane(),
  _hit = new THREE.Vector3();
function pickItem(e) {
  const r = cv.getBoundingClientRect();
  _ray2.setFromCamera(
    new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1),
    cam
  );
  const roots = ITEMS.filter(i => i.root && i.root.visible && !i.removed).map(i => i.root);
  const hits = _ray2.intersectObjects(roots, true);
  if (!hits.length || hits[0].distance > 9) return null;
  let o = hits[0].object;
  while (o && !o.userData.item) o = o.parent;
  return o ? { it: o.userData.item, dist: hits[0].distance } : null;
}
function groundPoint(e, z) {
  const r = cv.getBoundingClientRect();
  _ray2.setFromCamera(
    new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1),
    cam
  );
  _plane.set(new THREE.Vector3(0, 1, 0), -z);
  return _ray2.ray.intersectPlane(_plane, _hit) ? [_hit.x, -_hit.z] : null;
}
// items standing on another one (books on the desk, record player on the sideboard, lantern on the table) go along when it is moved or turned
function inItem(it, x, y, pad = 0.05) {
  const th = itemTheta(it),
    dx = x - it.x,
    dy = y - it.y,
    lx = dx * Math.cos(th) + dy * Math.sin(th),
    ly = -dx * Math.sin(th) + dy * Math.cos(th);
  return Math.abs(lx) <= it.size[0] / 2 + pad && Math.abs(ly) <= it.size[2] / 2 + pad;
}
function ridersOf(it) {
  if (Math.max(it.size[0], it.size[2]) < 0.35) return [];
  return ITEMS.filter(
    o => o !== it && !o.removed && o.root && o.z > it.z + 0.15 && o.z < it.z + it.size[1] + 0.25 && inItem(it, o.x, o.y)
  ).map(o => ({ o, dx: o.x - it.x, dy: o.y - it.y, dz: o.z - it.z }));
}
function moveSel(x, y) {
  const it = PLAN.sel;
  if (!it) return;
  const f = itemFootprint(it);
  const big = Math.max(it.size[0], it.size[2]) > 0.5;
  const r = Math.hypot(x - P.x, y - P.y);
  if (P.mode === 'walk' && r > 7) {
    const k = 7 / r;
    x = P.x + (x - P.x) * k;
    y = P.y + (y - P.y) * k;
  }
  it.x = x;
  it.y = y;
  it.z = big ? Math.max(0, floorAt(x, y, it.z + 0.6)) : supportZ(x, y, f.fx * 0.6, f.fy * 0.6, it.z, it.colIdx);
  applyItem(it);
  for (const r of (PLAN.drag && PLAN.drag.riders) || []) {
    r.o.x = it.x + r.dx;
    r.o.y = it.y + r.dy;
    r.o.z = it.z + r.dz;
    applyItem(r.o);
  }
  refreshSel();
  PLAN.dirtyLayout = true;
}
cv.addEventListener(
  'pointerdown',
  e => {
    if (!PLAN.on || e.button > 0) return;
    const h = pickItem(e);
    if (!h) return;
    e.stopImmediatePropagation();
    select(h.it);
    const gp = groundPoint(e, h.it.z);
    PLAN.drag = {
      id: e.pointerId,
      off: gp ? [h.it.x - gp[0], h.it.y - gp[1]] : [0, 0],
      z: h.it.z,
      moved: false,
      riders: ridersOf(h.it),
    };
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (err) {}
  },
  { capture: true }
);
cv.addEventListener(
  'pointermove',
  e => {
    if (!PLAN.drag || e.pointerId !== PLAN.drag.id) return;
    e.stopImmediatePropagation();
    const gp = groundPoint(e, PLAN.drag.z);
    if (!gp) return;
    PLAN.drag.moved = true;
    moveSel(gp[0] + PLAN.drag.off[0], gp[1] + PLAN.drag.off[1]);
  },
  { capture: true }
);
const endDrag = e => {
  if (!PLAN.drag || e.pointerId !== PLAN.drag.id) return;
  e.stopImmediatePropagation();
  PLAN.drag = null;
  rebuildGrids();
  saveLayout();
};
cv.addEventListener('pointerup', endDrag, { capture: true });
cv.addEventListener('pointercancel', endDrag, { capture: true });
// d > 0: clockwise seen from above (models: angle counter-clockwise, built pieces: clockwise)
const turnRot = (o, d) => (((o.rot + (o.kind === 'glb' ? -d : d)) % 360) + 360) % 360;
function rotateSel(d) {
  const it = PLAN.sel;
  if (!it) return;
  const riders = ridersOf(it);
  it.rot = turnRot(it, d);
  const f = itemFootprint(it);
  it.z =
    Math.max(it.size[0], it.size[2]) > 0.5
      ? Math.max(0, floorAt(it.x, it.y, it.z + 0.6))
      : supportZ(it.x, it.y, f.fx * 0.6, f.fy * 0.6, it.z, it.colIdx);
  applyItem(it);
  const a = (d * Math.PI) / 180,
    c = Math.cos(a),
    sn = Math.sin(a);
  for (const r of riders) {
    r.o.x = it.x + r.dx * c + r.dy * sn;
    r.o.y = it.y - r.dx * sn + r.dy * c;
    r.o.z = it.z + r.dz;
    r.o.rot = turnRot(r.o, d);
    applyItem(r.o);
  }
  refreshSel();
  rebuildGrids();
  saveLayout();
}
function deleteSel() {
  const it = PLAN.sel;
  if (!it) return;
  it.removed = true;
  applyItem(it);
  select(null);
  rebuildGrids();
  saveLayout();
  toast(it.label + ' entfernt');
}
function duplicateSel() {
  const it = PLAN.sel;
  if (!it) return;
  const a = (P.yaw * Math.PI) / 180;
  const x = it.x + Math.cos(a) * 0.8,
    y = it.y - Math.sin(a) * 0.8;
  const type = it.kind === 'grp' && it.type === 'grp' ? 'grp:' + it.key : it.type;
  spawnItem(type, x, y, it.z, it.rot, n => {
    select(n);
    rebuildGrids();
    saveLayout();
  });
}
function addItem(type) {
  const a = (P.yaw * Math.PI) / 180;
  const d = 1.8;
  const x = P.mode === 'walk' ? P.x + Math.sin(a) * d : 2,
    y = P.mode === 'walk' ? P.y + Math.cos(a) * d : 2;
  const z0 = P.mode === 'walk' ? P.feet : 0;
  const it = spawnItem(type, x, y, z0, (P.yaw + 180) % 360, n => {
    n.z =
      Math.max(n.size[0], n.size[2]) > 0.5
        ? Math.max(0, floorAt(x, y, z0 + 0.6))
        : supportZ(x, y, 0.2, 0.2, z0, n.colIdx);
    applyItem(n);
    select(n);
    rebuildGrids();
    saveLayout();
    toast(n.label + ' gesetzt – ziehen zum Verschieben');
  });
  if (it === null) toast('Dieses Objekt ist nicht verfügbar');
  $('palette').hidden = true;
}
// ---- persistence ----
// an item's home: where it was placed originally, carried along with its building when the building was moved in the plan view
function itemHome(it) {
  const o = it.orig;
  if (!o) return null;
  const B = it.bld && window.BUILD && BUILD[it.bld];
  if (!B || (!B.dx && !B.dy && !B.da)) return o;
  const [x, y] = B.tf(o.x, o.y);
  return { x, y, z: o.z, rot: (((o.rot + (it.kind === 'proc' ? -B.da : B.da)) % 360) + 360) % 360 };
}
const angDiff = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
function layoutState() {
  const moved = {},
    removed = [],
    added = [];
  for (const it of ITEMS)
    if (it.added && !it.removed)
      added.push({
        type: it.type,
        x: +it.x.toFixed(3),
        y: +it.y.toFixed(3),
        z: +it.z.toFixed(3),
        rot: +(+it.rot).toFixed(2),
      });
  for (const it0 of window.GLB_PLACED || []) {
    const it = !it0.registered && it0.pending ? Object.assign({}, it0, it0.pending) : it0,
      h = itemHome(it0);
    if (!h) continue;
    if (it.removed) removed.push(it0.key);
    else if (
      Math.abs(it.x - h.x) > 1e-3 ||
      Math.abs(it.y - h.y) > 1e-3 ||
      Math.abs(it.z - h.z) > 1e-3 ||
      angDiff(it.rot, h.rot) > 0.01
    )
      moved[it0.key] = { x: +it.x.toFixed(3), y: +it.y.toFixed(3), z: +it.z.toFixed(3), rot: +(+it.rot).toFixed(2) };
  }
  return { v: 1, moved, removed, added };
}
function saveLayout() {
  try {
    localStorage.setItem('pav-layout', JSON.stringify(layoutState()));
    PLAN.dirtyLayout = false;
  } catch (e) {}
  if (window.SITEPLAN) SITEPLAN.changed();
}
// stored layout → items: everything first to its home, then the stored moves, removals and additions (once at start, and when a published plan arrives)
function applyLayout(L) {
  PLAN.loaded = true;
  if (!L || L.v !== 1) L = { v: 1, moved: {}, removed: [], added: [] };
  for (const it of ITEMS.slice())
    if (it.added) {
      it.removed = true;
      applyItem(it);
      scene.remove(it.root);
      ITEMS.splice(ITEMS.indexOf(it), 1);
    }
  for (const it of window.GLB_PLACED || []) {
    const h = itemHome(it);
    if (!h) continue;
    const st = Object.assign({ removed: false }, h, L.moved[it.key] || {});
    if (L.removed.includes(it.key)) st.removed = true;
    if (it.registered && it.root) {
      Object.assign(it, st);
      delete it.pending;
      applyItem(it);
    } else it.pending = st;
  }
  for (const a of L.added) spawnItem(a.type, a.x, a.y, a.z, a.rot, () => rebuildGrids());
  select(null);
  rebuildGrids();
  setTimeout(rebuildGrids, 1500);
}
function loadLayout() {
  if (PLAN.loaded) return;
  let L = null;
  try {
    L = JSON.parse(localStorage.getItem('pav-layout') || 'null');
  } catch (e) {}
  if (!L || L.v !== 1) {
    PLAN.loaded = true;
    return;
  }
  applyLayout(L);
}
function resetLayout() {
  try {
    localStorage.removeItem('pav-layout');
  } catch (e) {}
  applyLayout(null);
  toast('Ursprüngliche Einrichtung wiederhergestellt');
  if (window.SITEPLAN) SITEPLAN.changed();
}
// ---- UI ----
function setPlan(v) {
  if (v && P.mode === 'top') go('garten');
  PLAN.on = v;
  const b = $('planbtn');
  if (b) b.setAttribute('aria-pressed', v ? 'true' : 'false');
  if (v && PHASE !== PHASES.length - 1) setPhase(PHASES.length - 1);
  if (!v) {
    select(null);
    $('palette').hidden = true;
  }
  updateBar();
  if (v)
    toast(
      'Planungsmodus: Gegenstand antippen und ziehen. Drehen, Kopie, Löschen in der Leiste; „Hinzufügen“ für neue Objekte.',
      6000
    );
}
$('planbtn')?.addEventListener('click', () => setPlan(!PLAN.on));
document.querySelectorAll('#planbar [data-pa]').forEach(b =>
  b.addEventListener('click', () => {
    const a = b.dataset.pa;
    if (a === 'rotl') rotateSel(-15);
    else if (a === 'rotr') rotateSel(15);
    else if (a === 'dup') duplicateSel();
    else if (a === 'del') deleteSel();
    else if (a === 'add') {
      const p = $('palette');
      p.hidden = !p.hidden;
    } else if (a === 'reset') resetLayout();
    else if (a === 'done') setPlan(false);
  })
);
{
  const pal = $('palette');
  if (pal) {
    const mk = (title, entries) => {
      const h = document.createElement('h4');
      h.textContent = title;
      pal.appendChild(h);
      const row = document.createElement('div');
      row.className = 'prow';
      for (const [k, label] of entries) {
        const bt = document.createElement('button');
        bt.type = 'button';
        bt.textContent = label;
        bt.addEventListener('click', () => addItem(k));
        row.appendChild(bt);
      }
      pal.appendChild(row);
    };
    mk(
      'Innen',
      Object.entries(GLB_ITEMS).filter(([k]) => k !== 'stump')
    );
    mk('Außen', [
      ['bank', 'Gartenbank'],
      ['tisch', 'Gartentisch'],
      ['liege', 'Liege'],
      ['hochbeet', 'Hochbeet'],
      ['feuer', 'Feuerschale'],
      ['kuebel', 'Pflanzkübel'],
      ['laterne', 'Gartenlaterne'],
      ['platte', 'Trittplatte'],
      ['baum', 'Junger Obstbaum'],
      ['zaun', 'Zaunelement'],
      ['stump', 'Baumstumpf'],
    ]);
  }
}
window.addEventListener('keydown', e => {
  if (!PLAN.on || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'r') rotateSel(e.shiftKey ? -15 : 15);
  else if (k === 'delete' || k === 'backspace') {
    deleteSel();
    e.preventDefault();
  } else if (k === 'escape') select(null);
});
setTimeout(loadLayout, 2500);
window.PLANNER = {
  ITEMS,
  spawnItem,
  select,
  setPlan,
  saveLayout,
  resetLayout,
  supportZ,
  PLAN,
  layoutState,
  applyLayout,
  itemHome,
};
