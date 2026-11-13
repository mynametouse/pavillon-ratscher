// Suhl runtime: parked cars on the car parks of the street tiles (product s, areas of type 'parken' – the outline from OpenStreetMap
// with its height in decimetres; an area comes with the tile that owns it, home = 1). Each car park is filled row by row along its
// longest side: bays 2.5 m wide and 5 m deep, a 6 m aisle after every second row; a narrow strip (under 7 m) takes the cars lengthwise,
// 6 m apart. About seven bays in ten are taken (the same ones every time: a hash of the place), the colours as they run on German roads
// (grey, black, white and silver ahead). The cars are the world's parked cars (dinge/dinge_modelle.js, window.DMOD: small car, compact,
// estate, SUV, van – true measures, glass, wheels, lamps, plates; Falko 13.11.2026 22:03: the boxes looked „wie Spielzeug Autos“): one
// instanced mesh per type on the world's material (its programs are warm from the start), each car on the ground under its wheels,
// pitched and rolled with it, and its soft shadow (one instanced mesh, the world's shadow material). Without DMOD the old low box shape.
// Near the camera the nearest of them become the traffic's detailed models (verkehr/vk_modelle.js, window.VKMOD: body, glass, the cab
// inside, lamps; three levels, built in a worker) – the instance shrinks to nothing meanwhile, its soft shadow stays.
// Built within R, again after MOVE metres or when a street tile comes or goes.
const R = 380,
  MOVE = 90,
  MAX = 2400;
// the traffic's types for each body type of the world's parked cars
const VKT = {
  klein: ['klein', 'klein2', 'mini'],
  kompakt: ['kompakt', 'kompakt2', 'elektro'],
  kombi: ['kombi', 'kombi2', 'limo'],
  suv: ['suv', 'suv2'],
  van: ['hochdach', 'transporter'],
};
// the body types of the world's parked cars and their shares (KBA stock by segment, rounded)
const TYPES = [
  ['kompakt', 0.33],
  ['klein', 0.22],
  ['suv', 0.2],
  ['kombi', 0.18],
  ['van', 0.07],
];
// the colours (sRGB) and their shares
const COLS = [
  ['#5f6266', 0.22],
  ['#1d1f22', 0.21],
  ['#e9eaea', 0.17],
  ['#a9adb1', 0.12],
  ['#2b4a78', 0.1],
  ['#8e1f1c', 0.06],
  ['#3c4a3a', 0.03],
  ['#6b5a45', 0.03],
  ['#c9b98f', 0.03],
  ['#d06a1c', 0.03],
];
export function autos(ctx, ST) {
  const { THREE, scene, markDirty, KERN, WELT, cam } = ctx,
    DM = ctx.DMOD && ctx.DMOD.on && ctx.DMOD.car && ctx.DMOD.mat && ctx.DMOD.CARS ? ctx.DMOD : null,
    S = { on: true, rev: -1, at: [1e9, 1e9], tz: 0, retry: 0, n: { parks: 0, cars: 0 }, models: !!DM, by: {} };
  let me = null;
  // with the world's models: one instanced mesh per type and one of shadows, grown when a build needs more
  const IM = new Map();
  let SH = null;
  function inst(key, geo, mat, need) {
    let m = key === 'sh' ? SH : IM.get(key);
    if (m && m.instanceMatrix.count >= need) return m;
    const cap = Math.max(64, 1 << Math.ceil(Math.log2(Math.max(1, need))));
    if (m) {
      scene.remove(m);
      m.dispose(); // the geometry and the material are the world's: not ours to free
    }
    m = new THREE.InstancedMesh(geo, mat, cap);
    m.name = key === 'sh' ? 'suhl autos schatten' : 'suhl autos ' + key;
    m.count = 0;
    m.visible = false;
    m.frustumCulled = false;
    m.userData.noMerge = true;
    if (key === 'sh') {
      m.renderOrder = -1;
      SH = m;
    } else IM.set(key, m);
    scene.add(m);
    return m;
  }
  const hsh = (x, y, k) => {
    const s = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
    return s - Math.floor(s);
  };
  // the car: x along its length (front +x), y across, z up; 4.4 × 1.8 m, 1.45 m high; vertex colours: 1 = the car's colour
  function shape() {
    const pos = [],
      nrm = [],
      col = [];
    const box = (x0, x1, y0, y1, z0, z1, cSide, cTop, glassEnds) => {
      const P = (x, y, z) => [x, z, -y];
      const quad = (a, b, c, d, n, k) => {
        // counter-clockwise seen from outside: the winding from the normal
        const A = P(...a),
          B = P(...b),
          Cc = P(...c),
          N = [n[0], n[2], -n[1]],
          ux = B[0] - A[0],
          uy = B[1] - A[1],
          uz = B[2] - A[2],
          vx = Cc[0] - A[0],
          vy = Cc[1] - A[1],
          vz = Cc[2] - A[2],
          flip = (uy * vz - uz * vy) * N[0] + (uz * vx - ux * vz) * N[1] + (ux * vy - uy * vx) * N[2] < 0;
        for (const p of flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d]) {
          pos.push(...P(...p));
          nrm.push(N[0], N[1], N[2]);
          col.push(k, k, k);
        }
      };
      const ends = glassEnds ? cSide : cTop;
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], cTop);
      quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], cSide);
      quad([x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [0, 1, 0], cSide);
      quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0], ends);
      quad([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [-1, 0, 0], ends);
    };
    box(-2.2, 2.2, -0.9, 0.9, 0.3, 0.95, 1, 1, false); // the body
    box(-1.25, 0.95, -0.8, 0.8, 0.95, 1.45, 0.12, 1, true); // the glasshouse: dark windows all round, the roof in the car's colour
    box(-1.75, -1.0, -0.92, 0.92, 0.0, 0.42, 0.05, 0.05, false); // the wheels, as two dark blocks under the body
    box(1.0, 1.75, -0.92, 0.92, 0.0, 0.42, 0.05, 0.05, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  function mesh() {
    if (me) return me;
    me = new THREE.InstancedMesh(
      shape(),
      new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.42, metalness: 0.35 }),
      MAX
    );
    me.name = 'suhl autos';
    me.count = 0;
    me.visible = false;
    me.frustumCulled = false;
    me.userData.noMerge = true;
    scene.add(me);
    return me;
  }
  // the drawn terrain, not the highest surface (KERN.ground without a height stands on bridge decks: cars hung under the viaducts)
  const gz = (x, y) => {
    const z = WELT && WELT.heightAt ? WELT.heightAt(x, y) : KERN.ground(x, y);
    return z === undefined || z === null || !Number.isFinite(z) ? null : z;
  };
  const inside = (P, x, y) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++)
      if (P[i][1] > y !== P[j][1] > y && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0])
        c = !c;
    return c;
  };
  const M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    SC = new THREE.Vector3(1, 1, 1),
    C = new THREE.Color(),
    PAL = COLS.map(([c, w]) => [new THREE.Color(c), w]);
  function colourAt(k) {
    let a = 0;
    for (let i = 0; i < PAL.length; i++) if ((a += PAL[i][1]) >= k) return i;
    return 0;
  }
  const colour = k => PAL[colourAt(k)][0];
  // the old low shape (no DMOD): turned by h about up, pitched with the ground (a kerb or a wall in reach: level)
  function boxes(list) {
    const m = mesh();
    let i = 0;
    for (const [x, y, h, zc] of list) {
      const c = Math.cos(h),
        s = Math.sin(h),
        zf = gz(x + c * 1.8, y + s * 1.8),
        zb = gz(x - c * 1.8, y - s * 1.8),
        fall = zf !== null && zb !== null && Math.abs(zf - zb) < 1.2 ? zf - zb : 0;
      E.set(0, h, Math.atan2(fall, 3.6), 'YXZ');
      Q.setFromEuler(E);
      M.compose(V.set(x, (fall ? Math.max(zc, (zf + zb) / 2) : zc) - 0.02, -y), Q, SC);
      m.setMatrixAt(i, M);
      m.setColorAt(i, C.copy(colour(hsh(x, y, 3))));
      i++;
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.visible = i > 0;
  }
  // the world's cars (as dinge/dinge.js sets them): on the ground under the middle, pitched by the ground under the axles, rolled by
  // the ground under both sides; a kerb or a wall under one end (more than 1.2 m): level. Its compass bearing az: the car's front.
  const cars = []; // the cars of the last build with the world's models: { t, j, x, y, z, h, q, col }
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function models(list) {
    releaseAll();
    cars.length = 0;
    const by = {};
    for (const q of list) (by[typeOf(q[0], q[1])] = by[typeOf(q[0], q[1])] || []).push(q);
    const sh = inst('sh', DM.shGeo, DM.shMat, list.length);
    let si = 0;
    S.by = {};
    for (const [key, m] of IM) if (!by[key]) ((m.count = 0), (m.visible = false));
    for (const t in by) {
      const L = by[t],
        T = DM.CARS[t],
        m = inst(t, DM.car(t), DM.mat, L.length),
        hb = T.wb / 2,
        ht = T.W / 2 - 0.15;
      S.by[t] = L.length;
      L.forEach(([x, y, h, zc], j) => {
        const fx = Math.cos(h),
          fy = Math.sin(h),
          rx = fy,
          ry = -fx,
          zF = gz(x + fx * hb, y + fy * hb),
          zR = gz(x - fx * hb, y - fy * hb),
          zL = gz(x - rx * ht, y - ry * ht),
          zRi = gz(x + rx * ht, y + ry * ht),
          ok = [zF, zR, zL, zRi].every(v => v !== null) && Math.abs(zF - zR) < 1.2 && Math.abs(zL - zRi) < 0.8,
          z = ok ? (zF + zR + zL + zRi) / 4 : zc,
          pitch = ok ? THREE.MathUtils.clamp(Math.atan2(zF - zR, T.wb), -0.25, 0.25) : 0,
          roll = ok ? THREE.MathUtils.clamp(Math.atan2(zRi - zL, 2 * ht), -0.2, 0.2) : 0,
          az = Math.PI / 2 - h;
        E.set(pitch, -az, -roll, 'YXZ');
        Q.setFromEuler(E);
        V.set(x, z, -y);
        M.compose(V, Q, SC);
        m.setMatrixAt(j, M);
        const ci = colourAt(hsh(x, y, 3));
        m.setColorAt(j, C.copy(PAL[ci][0]));
        cars.push({ t, j, x, y, z, h, q: Q.clone(), col: COLS[ci][0] });
        M.compose(V, Q, SCS.set(T.W, T.H, T.L));
        sh.setMatrixAt(si++, M);
      });
      m.count = L.length;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.visible = L.length > 0;
    }
    sh.count = si;
    sh.instanceMatrix.needsUpdate = true;
    sh.visible = si > 0;
  }
  function typeOf(x, y) {
    const k = hsh(x, y, 5);
    let a = 0;
    for (const [t, w] of TYPES) if ((a += w) >= k) return t;
    return 'kompakt';
  }
  // the half length and half width a bay must hold for the car standing there
  const dims = (x, y) => {
    if (!DM) return [2.35, 1.0];
    const T = DM.CARS[typeOf(x, y)];
    return [T.L / 2 + 0.05, T.W / 2 + 0.05];
  };
  const SCS = new THREE.Vector3();
  function build(o) {
    const n = { parks: 0, cars: 0 },
      list = [];
    let missed = 0;
    const put = (x, y, h) => {
      if (list.length >= MAX) return;
      const zc = gz(x, y);
      if (zc === null) {
        missed++;
        return;
      }
      list.push([x, y, h, zc]);
    };
    for (const t of ST.tiles.values()) {
      if (!t.d || !t.o || !Array.isArray(t.d.areas)) continue;
      const kP = (t.d.atypes || []).indexOf('parken');
      if (kP < 0) continue;
      for (const a of t.d.areas) {
        if (a[0] !== kP || !a[5] || !Array.isArray(a[7]) || a[7].length < 9) continue;
        const P = [];
        for (let k = 0; k + 2 < a[7].length; k += 3) P.push([t.o[0] + a[7][k] / 10, t.o[1] + a[7][k + 1] / 10]);
        let cx = 0,
          cy = 0;
        for (const p of P) {
          cx += p[0] / P.length;
          cy += p[1] / P.length;
        }
        if (Math.hypot(cx - o[0], cy - o[1]) > R) continue;
        const H = (a[8] || []).map(h => {
          const q = [];
          for (let k = 0; k + 2 < h.length; k += 3) q.push([t.o[0] + h[k] / 10, t.o[1] + h[k + 1] / 10]);
          return q;
        });
        // the axis: the longest side; u along it, v across
        let best = 0,
          ex = 1,
          ey = 0;
        for (let k = 0; k < P.length; k++) {
          const p = P[k],
            q = P[(k + 1) % P.length],
            L = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (L > best) {
            best = L;
            ex = (q[0] - p[0]) / L;
            ey = (q[1] - p[1]) / L;
          }
        }
        let u0 = 1e9,
          u1 = -1e9,
          v0 = 1e9,
          v1 = -1e9;
        for (const p of P) {
          const u = (p[0] - cx) * ex + (p[1] - cy) * ey,
            v = -(p[0] - cx) * ey + (p[1] - cy) * ex;
          u0 = Math.min(u0, u);
          u1 = Math.max(u1, u);
          v0 = Math.min(v0, v);
          v1 = Math.max(v1, v);
        }
        const W = v1 - v0,
          at = (u, v) => [cx + ex * u - ey * v, cy + ey * u + ex * v],
          ok = (x, y) => inside(P, x, y) && !H.some(h => inside(h, x, y)),
          // all four corners of a car (half length hl along the car's heading (dx, dy), half width hw) inside the area
          fits = (x, y, dx, dy, hl, hw) =>
            ok(x + dx * hl - dy * hw, y + dy * hl + dx * hw) &&
            ok(x + dx * hl + dy * hw, y + dy * hl - dx * hw) &&
            ok(x - dx * hl - dy * hw, y - dy * hl + dx * hw) &&
            ok(x - dx * hl + dy * hw, y - dy * hl - dx * hw);
        n.parks++;
        if (W < 7) {
          // a strip: lengthwise, 6 m apart
          for (let u = u0 + 3; u <= u1 - 3; u += 6) {
            const [x, y] = at(u, (v0 + v1) / 2);
            const [hl, hw] = dims(x, y);
            if (hsh(x, y, 1) < 0.72 && fits(x, y, ex, ey, Math.max(2.3, hl), Math.max(1.0, hw)))
              put(x, y, Math.atan2(ey, ex) + (hsh(x, y, 2) < 0.5 ? 0 : Math.PI));
          }
          continue;
        }
        // rows across the axis: two rows of bays back to back, then an aisle
        let row = 0;
        for (let v = v0 + 2.6; v <= v1 - 2.4; row++) {
          const facing = row % 2 === 0 ? 1 : -1; // the cars of a row face its aisle
          for (let u = u0 + 1.35; u <= u1 - 1.35; u += 2.5) {
            const [x, y] = at(u, v),
              dx = -ey * facing,
              dy = ex * facing;
            const [hl, hw] = dims(x, y);
            if (hsh(x, y, 1) < 0.7 && fits(x, y, dx, dy, Math.min(2.5, Math.max(2.35, hl)), Math.max(1.0, hw)))
              put(x, y, Math.atan2(dy, dx));
          }
          v += row % 2 === 0 ? 5.0 : 5.0 + 6.0;
        }
      }
    }
    n.cars = list.length;
    if (DM) models(list);
    else boxes(list);
    S.n = n;
    S.retry = missed ? 2 : 0;
    markDirty(true);
  }
  // ---- near the camera: the traffic's detailed models in place of the nearest instances ----
  const VK = ctx.VKMOD && ctx.VKMOD.make && ctx.VKMOD.place && ctx.VKMOD.ready && ctx.VKMOD.free ? ctx.VKMOD : null,
    NEARR = ctx.COARSE ? 22 : 40,
    NEARN = ctx.COARSE ? 6 : 16,
    near = new Map(); // index in cars → the model
  let nearT = 0;
  const camXY = () => [cam.position.x, -cam.position.z];
  function swapIn(i) {
    const c = cars[i],
      L = VKT[c.t] || VKT.kompakt,
      vt = L[Math.floor(hsh(c.x, c.y, 7) * L.length) % L.length];
    if (!VK.ready(vt)) {
      VK.need(vt, 1);
      return;
    }
    const m = VK.make(vt, { col: c.col, metal: c.col === '#e9eaea' || c.col === '#1d1f22' ? 0.05 : 0.45 });
    if (!m) return;
    m.shade = false; // the instance's soft shadow stays under it
    // the model's origin: its axles' middle over the bay's middle
    const ym = m.T && Number.isFinite(m.T.a) && Number.isFinite(m.T.b) ? (m.T.a + m.T.b) / 2 : 0,
      fx = Math.cos(c.h),
      fy = Math.sin(c.h);
    m.g.position.set(c.x - fx * ym, c.z, -(c.y - fy * ym));
    m.g.quaternion.copy(c.q);
    const im = IM.get(c.t);
    if (im) {
      im.setMatrixAt(c.j, ZERO);
      im.instanceMatrix.needsUpdate = true;
    }
    near.set(i, m);
  }
  function release(i) {
    const m = near.get(i),
      c = cars[i];
    near.delete(i);
    if (m) VK.free(m);
    const im = c && IM.get(c.t);
    if (im) {
      im.setMatrixAt(c.j, M.compose(V.set(c.x, c.z, -c.y), c.q, SC));
      im.instanceMatrix.needsUpdate = true;
    }
  }
  function releaseAll() {
    for (const i of [...near.keys()]) release(i);
  }
  function nearTick(dt) {
    if (!VK || !cars.length) return;
    const [cx, cy] = camXY();
    if ((nearT -= dt) <= 0) {
      nearT = 0.4;
      const want = [];
      for (let i = 0; i < cars.length; i++) {
        const d = Math.hypot(cars[i].x - cx, cars[i].y - cy);
        if (d < NEARR) want.push([d, i]);
      }
      want.sort((a, b) => a[0] - b[0]);
      const keep = new Set(want.slice(0, NEARN).map(w => w[1]));
      for (const i of [...near.keys()]) if (!keep.has(i)) release(i);
      for (const i of keep) if (!near.has(i)) swapIn(i);
      if (near.size) markDirty(true);
    }
    for (const [i, m] of near) VK.place(m, Math.hypot(cars[i].x - cx, cars[i].y - cy));
  }
  S.tick = (dt, o) => {
    nearTick(dt);
    const rev = ST.n.ok + '/' + ST.tiles.size;
    let again = rev !== S.rev || Math.hypot(o[0] - S.at[0], o[1] - S.at[1]) > MOVE;
    if (!again && S.retry > 0 && (S.retry -= dt) <= 0) again = true;
    if (!again) return;
    S.rev = rev;
    S.at = [o[0], o[1]];
    build(o);
  };
  S.away = () => {
    if (VK) releaseAll();
    const shown = (me && me.visible) || (SH && SH.visible) || [...IM.values()].some(m => m.visible);
    if (!shown) return;
    if (me) me.visible = false;
    if (SH) SH.visible = false;
    for (const m of IM.values()) m.visible = false;
    S.rev = -1;
    S.at = [1e9, 1e9];
    markDirty(true);
  };
  S.leave = () => {
    if (VK) releaseAll();
    cars.length = 0;
    if (me) {
      scene.remove(me);
      me.geometry.dispose();
      me.material.dispose();
      me.dispose();
      me = null;
    }
    // the world's geometries and materials stay (dinge/ uses them); only our instance buffers go
    for (const m of [...IM.values(), SH]) {
      if (!m) continue;
      scene.remove(m);
      m.dispose();
    }
    IM.clear();
    SH = null;
    S.rev = -1;
    S.at = [1e9, 1e9];
  };
  S.state = () => Object.assign({ models: S.models, by: Object.assign({}, S.by), near: near.size }, S.n);
  return S;
}
