// ---------- fences: chain-link (Maschendraht) or wooden pickets, built from a polyline; the plan view draws, moves and deletes them ----------
const FENCES = [];
window.FENCES = FENCES;
let FENCE_N = 0;
const FENCE_KINDS = { mesh: { label: 'Maschendraht', H: 1.25 }, wood: { label: 'Holzzaun', H: 1.0 } };
const FENCE_TEX = {
  mesh: (() => {
    const n = 128,
      c = document.createElement('canvas');
    c.width = c.height = n;
    const q = c.getContext('2d');
    q.strokeStyle = '#fff';
    q.lineWidth = 3.2;
    q.lineCap = 'round';
    for (let k = -2; k <= 4; k++) {
      q.beginPath();
      q.moveTo(k * 32 - 64, 0);
      q.lineTo(k * 32 + 64, n);
      q.stroke();
      q.beginPath();
      q.moveTo(k * 32 + 64, 0);
      q.lineTo(k * 32 - 64, n);
      q.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ANISO;
    return t;
  })(),
  wood: (() => {
    const w = 64,
      h = 256,
      c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const q = c.getContext('2d');
    q.clearRect(0, 0, w, h); // one picket (9 cm) and its gap per 13 cm
    const g = q.createLinearGradient(4, 0, 48, 0);
    g.addColorStop(0, '#8a6a46');
    g.addColorStop(0.5, '#a5825a');
    g.addColorStop(1, '#7d6040');
    q.fillStyle = g;
    q.beginPath();
    q.moveTo(4, h);
    q.lineTo(4, 22);
    q.lineTo(26, 6);
    q.lineTo(48, 22);
    q.lineTo(48, h);
    q.closePath();
    q.fill();
    for (let i = 0; i < 40; i++) {
      q.strokeStyle = `rgba(60,40,20,${0.08 + rnd() * 0.12})`;
      q.beginPath();
      const x = 6 + rnd() * 40;
      q.moveTo(x, 24);
      q.lineTo(x + rr(-2, 2), h);
      q.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return t;
  })(),
};
const FENCE_MAT = {
  mesh: patchSV(
    new THREE.MeshStandardMaterial({
      color: 0x2e4a2b,
      alphaMap: FENCE_TEX.mesh,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.25,
      depthWrite: false,
    })
  ),
  meshPost: plain({ color: 0x2b4429, metalness: 0.35, roughness: 0.5 }),
  wood: patchSV(
    new THREE.MeshStandardMaterial({ map: FENCE_TEX.wood, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 })
  ),
  woodPost: pbrMat('larch', { fallback: 0x7d6040, color: 0xa88a66, nrm: 0.6, rough: 1.1 }),
  woodDepth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: FENCE_TEX.wood, alphaTest: 0.5 }),
};
grime(FENCE_MAT.wood, 0.45, 0.4, 0.1);
grime(FENCE_MAT.woodPost, 0.45, 0.4, 0.08);
// merge small boxes (wires, rails, struts) of one fence into a single mesh
function boxesMesh(list, mat) {
  const P = [],
    N = [],
    U = [],
    m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    o = new THREE.Object3D();
  for (const [p, qq, sw, sh] of list) {
    const a = V(...p),
      b = V(...qq),
      L = a.distanceTo(b);
    if (L < 1e-4) continue;
    const g = new THREE.BoxGeometry(sw, sh, L).toNonIndexed();
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.lookAt(b);
    o.updateMatrix();
    g.applyMatrix4(o.matrix);
    P.push(...g.attributes.position.array);
    N.push(...g.attributes.normal.array);
    U.push(...g.attributes.uv.array);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  const me = new THREE.Mesh(geo, mat);
  me.castShadow = true;
  me.receiveShadow = true;
  return me;
}
function mkFence(spec) {
  const kind = FENCE_KINDS[spec.kind] ? spec.kind : 'mesh',
    K = FENCE_KINDS[kind],
    H = K.H,
    pts = spec.pts.map(p => [p[0], p[1]]);
  if (pts.length < 2) return null;
  const f = {
    id: spec.id || 'f' + FENCE_N++,
    kind,
    pts,
    gate: spec.gate ?? null,
    group: new THREE.Group(),
    cols: [],
    door: null,
    builtin: !!spec.builtin,
  };
  f.doorKey = spec.doorKey || 'gate_' + f.id;
  scene.add(f.group);
  // the gate: a 1 m opening at distance gate (m) along the line
  const lines = [];
  let gate = null;
  if (f.gate != null) {
    let s = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k],
        b = pts[k + 1],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s + L >= f.gate) {
        const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
          tg = Math.min(L - 0.55, Math.max(0.55, f.gate - s));
        const g0 = [a[0] + u[0] * (tg - 0.5), a[1] + u[1] * (tg - 0.5)],
          g1 = [a[0] + u[0] * (tg + 0.5), a[1] + u[1] * (tg + 0.5)];
        lines.push([...pts.slice(0, k + 1), g0]);
        lines.push([g1, ...pts.slice(k + 1)]);
        gate = { g0, g1, u };
        break;
      }
      s += L;
    }
  }
  if (!gate) lines.push(pts);
  f.lines = lines;
  f.gateSeg = gate ? [gate.g0, gate.g1] : null;
  const posts = [],
    boxes = [],
    postMat = kind === 'mesh' ? FENCE_MAT.meshPost : FENCE_MAT.woodPost;
  for (const line of lines) {
    if (line.length < 2) continue;
    const pos = [],
      uv = [],
      idx = [];
    let s = 0,
      n = 0;
    for (let k = 0; k < line.length; k++) {
      if (k) s += Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]);
      const [x, y] = line[k];
      pos.push(x, 0.05, -y, x, H - 0.03, -y);
      if (kind === 'mesh') uv.push(s / 0.2, 0.05 / 0.2, s / 0.2, (H - 0.03) / 0.2);
      else uv.push(s / 0.13, 0, s / 0.13, 1);
      if (k) {
        const a = (k - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      n++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const me = new THREE.Mesh(geo, kind === 'mesh' ? FENCE_MAT.mesh : FENCE_MAT.wood);
    me.renderOrder = kind === 'mesh' ? 1 : 0;
    me.castShadow = kind !== 'mesh';
    me.receiveShadow = true;
    if (kind === 'wood') me.customDepthMaterial = FENCE_MAT.woodDepth;
    f.group.add(me);
    for (let k = 0; k < line.length - 1; k++) {
      const a = line[k],
        b = line[k + 1],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]),
        np = Math.max(1, Math.ceil(L / (kind === 'mesh' ? 2.5 : 2.0))),
        ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let j = 0; j < np; j++) posts.push([a[0] + ((b[0] - a[0]) * j) / np, a[1] + ((b[1] - a[1]) * j) / np]);
      f.cols.push(COL.length);
      COL.push([
        -L / 2,
        L / 2,
        -0.05,
        0.05,
        0,
        H,
        'fence',
        null,
        null,
        { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, c: Math.cos(ang), s: Math.sin(ang) },
      ]);
      if (kind === 'mesh')
        for (const z of [H - 0.02, 0.07]) boxes.push([[a[0], a[1], z], [b[0], b[1], z], 0.005, 0.005]);
      else
        for (const z of [0.25, H - 0.25]) {
          const nx = -Math.sin(ang) * 0.035,
            ny = Math.cos(ang) * 0.035;
          boxes.push([[a[0] + nx, a[1] + ny, z], [b[0] + nx, b[1] + ny, z], 0.03, 0.08]);
        }
    }
    posts.push(line[line.length - 1]);
    if (kind === 'mesh')
      for (const [e, q] of [
        [line[0], line[1]],
        [line[line.length - 1], line[line.length - 2]],
      ]) {
        const L = Math.hypot(q[0] - e[0], q[1] - e[1]),
          u = [(q[0] - e[0]) / L, (q[1] - e[1]) / L];
        boxes.push([[e[0], e[1], 1.0], [e[0] + u[0] * 0.85, e[1] + u[1] * 0.85, 0.02], 0.03, 0.03]);
      }
  }
  const pg =
      kind === 'mesh'
        ? new THREE.CylinderGeometry(0.021, 0.021, H + 0.06, 10)
        : new THREE.BoxGeometry(0.08, H + 0.08, 0.08),
    im = new THREE.InstancedMesh(pg, postMat, posts.length),
    m4 = new THREE.Matrix4();
  posts.forEach((p, i) => {
    m4.makeTranslation(...V(p[0], p[1], (H + 0.06) / 2).toArray());
    im.setMatrixAt(i, m4);
  });
  im.castShadow = true;
  im.receiveShadow = true;
  f.group.add(im);
  if (boxes.length) f.group.add(boxesMesh(boxes, postMat));
  if (gate) {
    const { g0, g1, u } = gate;
    f.group.add(
      boxesMesh(
        [
          [[g0[0], g0[1], 0], [g0[0], g0[1], H + 0.12], 0.06, 0.06],
          [[g1[0], g1[1], 0], [g1[0], g1[1], H + 0.12], 0.06, 0.06],
        ],
        postMat
      )
    );
    f.cols.push(COL.length);
    COL.push([g0[0] - 0.05, g0[0] + 0.05, g0[1] - 0.05, g0[1] + 0.05, 0, H, 'fence', null, null]);
    f.cols.push(COL.length);
    COL.push([g1[0] - 0.05, g1[0] + 0.05, g1[1] - 0.05, g1[1] + 0.05, 0, H, 'fence', null, null]);
    const leaf = new THREE.Group(),
      w = 0.92,
      h = H - 0.08;
    B(0.02, w, -0.015, 0.015, 0.06, 0.09, postMat, { parent: leaf, col: false });
    B(0.02, w, -0.015, 0.015, h, h + 0.03, postMat, { parent: leaf, col: false });
    for (const x of [0.02, w - 0.03])
      B(x, x + 0.03, -0.015, 0.015, 0.06, h + 0.03, postMat, { parent: leaf, col: false });
    const pm = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.05, h - 0.06),
      kind === 'mesh' ? FENCE_MAT.mesh.clone() : FENCE_MAT.wood.clone()
    );
    const tx = (kind === 'mesh' ? FENCE_TEX.mesh : FENCE_TEX.wood).clone();
    tx.repeat.set((w - 0.05) / (kind === 'mesh' ? 0.2 : 0.13), kind === 'mesh' ? (h - 0.06) / 0.2 : 1);
    tx.needsUpdate = true;
    if (kind === 'mesh') pm.material.alphaMap = tx;
    else pm.material.map = tx;
    pm.position.set(0.035 + (w - 0.05) / 2, (h + 0.06) / 2 + 0.03, 0);
    leaf.add(pm);
    f.door = f.doorKey;
    const d = hingeDoor(f.door, leaf, {
      hx: g0[0] + u[0] * 0.04,
      hy: g0[1] + u[1] * 0.04,
      a: u,
      w,
      sign: 1,
      z0: 0.0,
      z1: h,
      thick: 0.04,
    });
    d.label = 'Gartentür';
    d.fence = f.id;
  }
  f.group.traverse(o => {
    o.userData.noMerge = true;
    o.userData.fence = f.id;
  });
  FENCES.push(f);
  return f;
}
function rmFence(f) {
  const i = FENCES.indexOf(f);
  if (i < 0) return;
  FENCES.splice(i, 1);
  scene.remove(f.group);
  f.group.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  });
  for (const ci of f.cols) {
    const c = COL[ci];
    c[5] = c[4] - 1;
  }
  if (f.door && DOORS[f.door]) {
    scene.remove(DOORS[f.door].group);
    delete DOORS[f.door];
  }
  markDirty(true);
}
// the fence towards Ronald: along the east boundary from the top of the stream bank down to the south-east corner, garden gate between greenhouse and wash house
const FENCE_DEFAULT = (() => {
  const G = S0.garden,
    pts = [];
  const i0 = G.findIndex(p => p[0] > 13 && p[1] < -44);
  for (let k = 0; k < G.length; k++) {
    const p = G[(i0 + k) % G.length];
    if (p[0] < 11.5 || p[1] > 24) break;
    pts.push(p.slice());
  }
  const keep = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1],
      b = pts[k];
    const ok = q => STREAM.across(q[0], q[1]) > STREAM.WT + 0.45;
    if (ok(b)) {
      keep.push(b);
      continue;
    }
    let lo = 0,
      hi = 1;
    for (let it = 0; it < 30; it++) {
      const m = (lo + hi) / 2;
      ok([a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m]) ? (lo = m) : (hi = m);
    }
    keep.push([a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo]);
    break;
  }
  let s = 0,
    gate = null;
  for (let k = 0; k < keep.length - 1; k++) {
    const a = keep[k],
      b = keep[k + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if ((a[1] - 1.3) * (b[1] - 1.3) <= 0) {
      gate = s + ((1.3 - a[1]) / (b[1] - a[1])) * L;
      break;
    }
    s += L;
  }
  return {
    id: 'ronald',
    kind: 'mesh',
    pts: keep.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]),
    gate: gate != null ? +gate.toFixed(2) : null,
    doorKey: 'ronaldgate',
    builtin: true,
  };
})();
mkFence(FENCE_DEFAULT);
window.WORKS = WORKS;
