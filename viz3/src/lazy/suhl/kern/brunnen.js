// Suhl runtime: fountains and their sculptures. The basins come with the street tiles (product s, list `wareas` of kind 'fountain':
// the outline from OpenStreetMap with its id) – a rim of sandstone round the outline, the water inside. Three in the centre carry what
// the photos of Wikimedia Commons show (contact sheets of suhl-fotos, docs/plans/suhl/wahrzeichen.md): the Waffenschmied on the
// Marktplatz (1903, sandstone figure of a gunsmith on a column over an octagonal basin; Georg Ringel, Rudolf Ludloff), „Diana auf
// Jagd“ before the Einkaufszentrum Am Steinweg (bronze, Waldo Dörsch: Diana on a leaping stag, hounds beside it, jets of water) and
// the Vogelbrunnen before the Kreuzkirche (birds of bronze on a stone); any other fountain gets a small bowl on a column. The figures
// are plain forms of their size and pose, not portraits of the works. Built within R as merged meshes – stone, bronze, water and the
// jets – again when a street tile comes or goes or the ground under them changed.
import { buf, box, geometry, addGeometry } from './teile.js';
const R = 420,
  MOVE = 80;
const SPECIAL = { w247095898: 'waffenschmied', w366851054: 'diana', w366852280: 'vogel' };
export function brunnen(ctx, ST) {
  const { THREE, scene, markDirty, KERN } = ctx,
    S = { on: true, rev: -1, at: [1e9, 1e9], tz: 0, ref: [], retry: 0, n: { basins: 0, figures: 0 }, near: null };
  let K = null;
  function kit() {
    if (K) return K;
    const mats = {
      stone: new THREE.MeshStandardMaterial({ color: 0xb9b2a5, roughness: 0.88, metalness: 0 }),
      bronze: new THREE.MeshStandardMaterial({ color: 0x4b3d2c, roughness: 0.42, metalness: 0.7 }),
      water: new THREE.MeshStandardMaterial({ color: 0x35525b, roughness: 0.04, metalness: 0.3 }),
      jet: new THREE.MeshBasicMaterial({ color: 0xeef4f6, transparent: true, opacity: 0.5, depthWrite: false }),
      beet: new THREE.MeshStandardMaterial({ color: 0x3b5a2b, roughness: 0.95, metalness: 0 }),
      bluete: new THREE.MeshStandardMaterial({ color: 0xb8262c, roughness: 0.75, metalness: 0 }),
    };
    const mk = (m, name) => {
      const me = new THREE.Mesh(new THREE.BufferGeometry(), m);
      me.name = name;
      me.visible = false;
      me.frustumCulled = false;
      me.userData.noMerge = true;
      scene.add(me);
      return me;
    };
    K = {
      mats,
      stone: mk(mats.stone, 'suhl brunnen stein'),
      bronze: mk(mats.bronze, 'suhl brunnen bronze'),
      water: mk(mats.water, 'suhl brunnen wasser'),
      jet: mk(mats.jet, 'suhl brunnen strahlen'),
      beet: mk(mats.beet, 'suhl brunnen beet'),
      bluete: mk(mats.bluete, 'suhl brunnen blueten'),
    };
    K.jet.renderOrder = 2;
    return K;
  }
  const gz = (x, y) => {
    const z = KERN.ground(x, y);
    return z === undefined || z === null || !Number.isFinite(z) ? null : z;
  };
  // ---- small solids in three.js space (x, up, −y), each into a buffer with a matrix ----
  const M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    V = new THREE.Vector3(),
    SC = new THREE.Vector3(),
    E = new THREE.Euler(),
    G = {
      sph: new THREE.SphereGeometry(1, 12, 8),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
      cone: new THREE.CylinderGeometry(0.15, 1, 1, 10, 1, true),
      oct: new THREE.CylinderGeometry(1, 1, 1, 8),
      box: new THREE.BoxGeometry(1, 1, 1),
    };
  // a part at model (x, y, z) with sizes (sx, sz up, sy) and turns (rx, ry about up, rz) in a local frame turned by the heading h
  function part(B, g, base, h, lx, ly, lz, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const c = Math.cos(h),
      s = Math.sin(h),
      x = base[0] + lx * c + ly * s,
      y = base[1] - lx * s + ly * c;
    E.set(rx, ry - h, rz, 'YXZ');
    Q.setFromEuler(E);
    M.compose(V.set(x, base[2] + lz, -y), Q, SC.set(sx, sz, sy));
    addGeometry(B, G[g], M);
  }
  // a standing figure of height H (feet at lz): legs, body, arms (aL, aR: raised angles), head – the Waffenschmied, Diana
  function figure(B, base, h, lx, ly, lz, H, aL = 0.2, aR = -0.2, lean = 0) {
    const k = H / 1.8;
    part(B, 'cyl', base, h, lx - 0.1 * k, ly, lz + 0.42 * k, 0.09 * k, 0.09 * k, 0.84 * k, lean);
    part(B, 'cyl', base, h, lx + 0.1 * k, ly, lz + 0.42 * k, 0.09 * k, 0.09 * k, 0.84 * k, lean);
    part(B, 'cyl', base, h, lx, ly, lz + 1.12 * k, 0.2 * k, 0.13 * k, 0.6 * k, lean);
    part(B, 'cyl', base, h, lx - 0.27 * k, ly, lz + 1.12 * k, 0.06 * k, 0.06 * k, 0.6 * k, 0, 0, aL);
    part(B, 'cyl', base, h, lx + 0.27 * k, ly, lz + 1.12 * k, 0.06 * k, 0.06 * k, 0.6 * k, 0, 0, aR);
    part(B, 'sph', base, h, lx, ly + lean * 0.2, lz + 1.58 * k, 0.11 * k, 0.12 * k, 0.13 * k);
  }
  // a four-legged animal: a stag (antlers) or a hound, body length Lb, leaping (legs stretched) or standing, turned by `turn` in the
  // frame h (positions turned here, the parts' own turn given to part() as ry)
  function animal(B, base, h, lx, ly, lz, Lb, stag, leap, turn = 0) {
    const k = Lb / 1.6,
      c = Math.cos(turn),
      s = Math.sin(turn),
      P = (a, b) => [lx + a * c + b * s, ly - a * s + b * c],
      bz = lz + (stag ? 1.05 : 0.6) * k,
      pt = (g, a, b, z, sx, sy, sz, rx = 0, rz = 0) => {
        const [x, y] = P(a, b);
        part(B, g, base, h, x, y, z, sx, sy, sz, rx, -turn, rz);
      };
    pt('sph', 0, 0, bz, 0.32 * k, 0.8 * k, 0.36 * k, leap ? -0.35 : 0);
    pt('cyl', 0, 0.7 * k, bz + 0.38 * k, 0.11 * k, 0.11 * k, 0.6 * k, 0.6);
    pt('sph', 0, 0.95 * k, bz + 0.62 * k, 0.12 * k, 0.24 * k, 0.12 * k, 0.4);
    for (const [a, b] of [
      [-0.16, 0.45],
      [0.16, 0.45],
      [-0.16, -0.45],
      [0.16, -0.45],
    ])
      pt('cyl', a * k, b * k, bz - 0.45 * k, 0.05 * k, 0.05 * k, 0.9 * k, leap ? (b > 0 ? 0.9 : -0.9) : 0);
    if (stag)
      for (const sg of [-1, 1]) {
        pt('cyl', sg * 0.12 * k, 1.0 * k, bz + 0.95 * k, 0.025 * k, 0.025 * k, 0.6 * k, -0.3, sg * 0.5);
        pt('cyl', sg * 0.24 * k, 1.0 * k, bz + 1.12 * k, 0.02 * k, 0.02 * k, 0.35 * k, -0.6, sg * 0.9);
      }
  }
  // the flower beds before the Waffenschmied (the photos of the Markt in summer: two curved beds of red flowers in a stone kerb on the
  // side towards the Gothaer Straße, a path between them): arcs from 12° to 70° either side of north-east, 5.2 to 7.6 m out
  function beds(Bs, Bg, Br, base) {
    const r0 = 5.2,
      r1 = 7.6,
      rm = (r0 + r1) / 2,
      step = (6 * Math.PI) / 180;
    for (const sg of [-1, 1])
      for (let d = 12; d < 70; d += 6) {
        const az = ((45 + sg * (d + 3)) * Math.PI) / 180,
          at = r => [Math.sin(az) * r, Math.cos(az) * r],
          [mx, my] = at(rm),
          [ix, iy] = at(r0),
          [ox, oy] = at(r1),
          // a box along the arc: its local x the tangent (turned by −az about up)
          seg = (B, x, y, z, len, wid, hgt) => part(B, 'box', base, 0, x, y, z, len, wid, hgt, 0, -az);
        seg(Bg, mx, my, 0.14, rm * step + 0.06, r1 - r0 - 0.2, 0.28);
        seg(Bs, ix, iy, 0.16, r0 * step + 0.06, 0.16, 0.32);
        seg(Bs, ox, oy, 0.16, r1 * step + 0.06, 0.16, 0.32);
        for (let k = 0; k < 14; k++) {
          const h1 = Math.sin(d * 12.9898 + k * 78.233 + sg * 3.1) * 43758.5453,
            q = h1 - Math.floor(h1),
            h2 = Math.sin(d * 39.346 + k * 11.135 + sg * 7.7) * 43758.5453,
            w = h2 - Math.floor(h2),
            az2 = az + (w - 0.5) * step,
            r = r0 + 0.35 + q * (r1 - r0 - 0.7);
          part(Br, 'sph', base, 0, Math.sin(az2) * r, Math.cos(az2) * r, 0.36, 0.085, 0.085, 0.06);
        }
      }
  }
  // ---- one round ----
  function build(o) {
    kit();
    const Bs = buf(),
      Bb = buf(),
      Bw = buf(),
      Bj = buf(),
      Bg = buf(),
      Br = buf(),
      n = { basins: 0, figures: 0 },
      ref = [];
    let missed = 0,
      near = null;
    for (const t of ST.tiles.values()) {
      if (!t.d || !t.o || !Array.isArray(t.d.wareas)) continue;
      for (const w of t.d.wareas) {
        if (w[0] !== 'fountain' || !Array.isArray(w[5]) || w[5].length < 6) continue;
        const xy = w[5],
          P = [];
        for (let k = 0; k + 1 < xy.length; k += 2) P.push([t.o[0] + xy[k] / 10, t.o[1] + xy[k + 1] / 10]);
        let cx = 0,
          cy = 0;
        for (const p of P) {
          cx += p[0] / P.length;
          cy += p[1] / P.length;
        }
        if (Math.hypot(cx - o[0], cy - o[1]) > R) continue;
        const zg = gz(cx, cy);
        if (zg === null) {
          missed++;
          continue;
        }
        if (ref.length < 16) ref.push([cx, cy, zg]);
        const kind = SPECIAL[w[2]] || 'klein';
        // the rim along the outline (a little higher where the ground falls away), the water inside
        let area = 0;
        for (let k = 0; k < P.length; k++) {
          const a = P[k],
            b = P[(k + 1) % P.length];
          area += a[0] * b[1] - b[0] * a[1];
        }
        const ccw = area > 0,
          rimH = kind === 'diana' ? 0.55 : 0.48,
          rimT = 0.32;
        for (let k = 0; k < P.length; k++) {
          const a = P[k],
            b = P[(k + 1) % P.length],
            L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (L < 0.05) continue;
          const e1 = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
            inw = ccw ? [-e1[1], e1[0]] : [e1[1], -e1[0]], // towards the inside
            za = gz(a[0], a[1]) ?? zg,
            zb = gz(b[0], b[1]) ?? zg,
            zlo = Math.min(za, zb, zg) - 0.2,
            ztop = zg + rimH;
          box(
            Bs,
            [(a[0] + b[0]) / 2 + inw[0] * rimT * 0.5, (a[1] + b[1]) / 2 + inw[1] * rimT * 0.5, (zlo + ztop) / 2],
            e1,
            L / 2 + rimT * 0.5,
            rimT / 2,
            (ztop - zlo) / 2,
            [0, 0],
            [0, 0],
            [0, 0]
          );
        }
        const contour = P.map(p => new THREE.Vector2(p[0], p[1])),
          tris = THREE.ShapeUtils.triangulateShape(contour, []),
          zw = zg + rimH - 0.14;
        for (const [i, j, k] of tris) {
          const A = P[i],
            Bp = P[j],
            C = P[k],
            cr = (Bp[0] - A[0]) * (C[1] - A[1]) - (Bp[1] - A[1]) * (C[0] - A[0]),
            ord = cr > 0 ? [A, Bp, C] : [A, C, Bp];
          for (const q of ord) {
            Bw.p.push(q[0], zw, -q[1]);
            Bw.n.push(0, 1, 0);
            Bw.uv.push(0, 0);
          }
        }
        n.basins++;
        // the figures
        const base = [cx, cy, zg],
          hd = 0;
        if (kind === 'waffenschmied') {
          part(Bs, 'oct', base, hd, 0, 0, 0.55, 0.95, 0.95, 1.1);
          part(Bs, 'box', base, hd, 0, 0, 1.95, 0.95, 0.95, 1.7);
          part(Bs, 'box', base, hd, 0, 0, 2.9, 1.15, 1.15, 0.22);
          part(Bs, 'cyl', base, hd, 0, 0, 4.6, 0.3, 0.3, 3.2);
          part(Bs, 'box', base, hd, 0, 0, 6.32, 0.85, 0.85, 0.3);
          figure(Bs, base, hd + 2.2, 0, 0, 6.47, 2.1, 0.5, -1.1);
          for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
            part(Bb, 'cyl', base, a, 0, 0.62, 1.25, 0.05, 0.05, 0.22, Math.PI / 2);
            part(Bj, 'cone', base, a, 0, 1.25, 0.4, 0.05, 0.05, 0.9, -0.9);
          }
          beds(Bs, Bg, Br, base);
          n.figures++;
        } else if (kind === 'diana') {
          // the group on a rough rock, the stag leaping towards the Steinweg, Diana on it, two hounds beside
          // (the group is large: the stag's back at about 2.5 m, Diana's head near 4 m)
          part(Bs, 'sph', base, hd, 0, 0, 0.4, 2.6, 2.1, 1.0);
          animal(Bb, base, hd + 2.2, 0, 0, 1.0, 3.2, true, true);
          figure(Bb, base, hd + 2.2, 0, -0.3, 3.0, 2.4, 1.3, -1.4, 0.25);
          part(Bb, 'cyl', base, hd + 2.2, -0.8, 0.2, 4.5, 0.03, 0.03, 1.8, 0.2, 0, 1.2);
          animal(Bb, base, hd + 2.2, 2.3, 0.9, 0.35, 1.6, false, true, 0.5);
          animal(Bb, base, hd + 2.2, -2.2, 1.2, 0.35, 1.5, false, true, -0.4);
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            part(Bj, 'cone', base, a, 0, 3.4, 0.55 + 0.8, 0.07, 0.07, 1.6, -0.3);
          }
          n.figures++;
        } else if (kind === 'vogel') {
          part(Bs, 'sph', base, hd, 0, 0, 0.45, 0.8, 0.7, 0.5);
          for (const [lx, ly, s] of [
            [0, 0, 1],
            [0.45, 0.2, 0.7],
            [-0.4, -0.25, 0.6],
          ]) {
            part(Bb, 'sph', base, hd + lx, lx, ly, 1.0 + 0.2 * s, 0.14 * s, 0.25 * s, 0.13 * s);
            part(Bb, 'box', base, hd + lx, lx, ly, 1.05 + 0.2 * s, 0.5 * s, 0.1 * s, 0.02 * s, 0, 0, 0.3);
          }
          n.figures++;
        } else {
          part(Bs, 'cyl', base, hd, 0, 0, 0.45, 0.18, 0.18, 0.9);
          part(Bs, 'cyl', base, hd, 0, 0, 0.98, 0.55, 0.55, 0.16);
          part(Bj, 'cone', base, hd, 0, 0, 1.25, 0.04, 0.04, 0.4);
        }
        const d = Math.hypot(cx - o[0], cy - o[1]);
        if (kind !== 'klein' && (!near || d < near.d)) near = { d, at: [cx, cy, zg], kind, osm: w[2] };
      }
    }
    const put = (me, B) => {
      me.geometry.dispose();
      me.geometry = geometry(THREE, B);
      me.visible = B.p.length > 0;
    };
    put(K.stone, Bs);
    put(K.bronze, Bb);
    put(K.water, Bw);
    put(K.jet, Bj);
    put(K.beet, Bg);
    put(K.bluete, Br);
    S.n = n;
    S.near = near;
    S.ref = ref;
    S.retry = missed ? 2 : 0;
    markDirty(true);
  }
  const late = () =>
    S.ref.some(r => {
      const z = gz(r[0], r[1]);
      return z !== null && Math.abs(z - r[2]) > 0.1;
    });
  S.tick = (dt, o) => {
    const rev = ST.n.ok + '/' + ST.tiles.size;
    S.tz += dt;
    let again = rev !== S.rev || Math.hypot(o[0] - S.at[0], o[1] - S.at[1]) > MOVE;
    if (!again && S.retry > 0 && (S.retry -= dt) <= 0) again = true;
    if (!again && S.tz > 3) {
      S.tz = 0;
      again = late();
    }
    if (!again) return;
    S.rev = rev;
    S.at = [o[0], o[1]];
    S.tz = 0;
    build(o);
  };
  S.away = () => {
    if (!K || ![K.stone, K.bronze, K.water, K.jet, K.beet, K.bluete].some(me => me.visible)) return;
    for (const me of [K.stone, K.bronze, K.water, K.jet, K.beet, K.bluete]) me.visible = false;
    S.rev = -1;
    S.at = [1e9, 1e9];
    markDirty(true);
  };
  S.leave = () => {
    if (!K) return;
    for (const me of [K.stone, K.bronze, K.water, K.jet, K.beet, K.bluete]) {
      scene.remove(me);
      me.geometry.dispose();
    }
    for (const m of Object.values(K.mats)) m.dispose();
    for (const g of Object.values(G)) g.dispose();
    K = null;
    S.rev = -1;
    S.at = [1e9, 1e9];
    S.ref = [];
  };
  S.state = () => Object.assign({ near: S.near }, S.n);
  return S;
}
