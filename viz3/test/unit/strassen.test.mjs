// Unit tests of feat/strassen without a browser: the roads' styles and raster (strassen/strassen_stil.js) and the geometry of what stands
// beside them (strassen/strassen_modelle.js) – faces wound outwards, a rail's wave towards the road, the signs' faces towards the traffic.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRSTIL as T } from '../../src/strassen/strassen_stil.js';
import { STRMOD as M } from '../../src/strassen/strassen_modelle.js';

const line = (x0, y0, x1, y1, step = 10) => {
  const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / step),
    p = [];
  for (let i = 0; i <= n; i++) p.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return p;
};
// a straight of 200 m east, a quarter circle of radius R to the north, a straight of 200 m north
const bend = R => {
  const p = line(-200, 0, 0, 0);
  for (let a = 5; a <= 90; a += 5) p.push(R * Math.sin((a * Math.PI) / 180), R - R * Math.cos((a * Math.PI) / 180));
  return p.concat(line(R, R, R, R + 200).slice(2));
};

test('code and decode: style, kind and surface fit a byte', () => {
  for (let st = 0; st < 4; st++)
    for (let k = 0; k < 9; k++)
      for (let s = 0; s < 6; s++) {
        const c = T.code(k, s, st);
        assert.ok(c >= 0 && c < 256, 'byte ' + c);
        assert.deepEqual(T.decode(c), { style: st, kind: k, surf: s });
      }
});

test('radius: a straight has none, a circle its own', () => {
  const s = line(0, 0, 300, 0),
    n = s.length / 2,
    c = T.cum(s, 2, n);
  assert.equal(T.radius(s, 2, n, c, 150), Infinity);
  const b = bend(60),
    nb = b.length / 2,
    cb = T.cum(b, 2, nb),
    R = T.radius(b, 2, nb, cb, 200 + (60 * Math.PI) / 4);
  assert.ok(Math.abs(R - 60) < 6, 'radius in the bend ' + R.toFixed(1));
});

test('no overtaking: a tight bend gets a solid line with a lead, a wide one stays dashed', () => {
  const b = bend(60),
    n = b.length / 2,
    st = T.styles(b, 2, n, 1, null),
    cum = T.cum(b, 2, n);
  const sol = [...st].map((v, i) => (v === T.SOLID ? (cum[i] + cum[i + 1]) / 2 : -1)).filter(v => v >= 0);
  assert.ok(sol.length > 5, 'solid stretches ' + sol.length);
  assert.ok(Math.min(...sol) < 195 && Math.min(...sol) > 140, 'starts before the bend ' + Math.min(...sol));
  assert.ok(Math.max(...sol) > 200 + 94 && Math.max(...sol) < 200 + 94 + 60, 'ends after it ' + Math.max(...sol));
  assert.equal(st[0], T.RURAL, 'the straight before is dashed');
  const w = bend(400),
    nw = w.length / 2;
  assert.ok(
    T.styles(w, 2, nw, 1, null).every(v => v === T.RURAL),
    'radius 400: dashed'
  );
  // a lane never gets one
  assert.ok(T.styles(b, 2, n, 4, null).every(v => v === T.RURAL));
});

test('towns and villages: the style follows the place', () => {
  const p = line(0, 0, 300, 0),
    n = p.length / 2,
    st = T.styles(p, 2, n, 1, x => (x < 100 ? 0 : x < 200 ? 1 : 2));
  assert.equal(st[2], T.RURAL);
  assert.equal(st[15], T.VILLAGE);
  assert.equal(st[25], T.TOWN);
});

test('marks: what a road carries by kind, width and style', () => {
  // a main road of 6.5 m in open country: dashed 4/8, edge lines
  let m = T.marks(1, 3.25, T.RURAL);
  assert.deepEqual([m.centre, m.dash, m.period, m.edge, m.kerb, m.walk], ['dash', 4, 12, true, false, 0]);
  assert.equal(T.marks(1, 3.25, T.SOLID).centre, 'solid');
  // a narrow county road: edge lines only; a narrower one nothing
  m = T.marks(2, 2.6, T.RURAL);
  assert.deepEqual([m.centre, m.edge], [null, true]);
  assert.deepEqual([T.marks(2, 2.3, T.RURAL).centre, T.marks(2, 2.3, T.RURAL).edge], [null, false]);
  // in a town: 3/6, no edge lines, kerbs and pavements; a street has kerbs and a narrower pavement
  m = T.marks(1, 3.25, T.TOWN);
  assert.deepEqual([m.centre, m.dash, m.period, m.edge, m.kerb, m.walk], ['dash', 3, 9, false, true, 1.7]);
  m = T.marks(3, 2.5, T.TOWN);
  assert.deepEqual([m.centre, m.kerb, m.walk], [null, true, 1.3]);
  // in a village: kerbs along the through road only
  assert.equal(T.marks(2, 3, T.VILLAGE).kerb, true);
  assert.equal(T.marks(3, 2.5, T.VILLAGE).kerb, false);
  // nothing on gravel; the motorway 6/12
  assert.equal(T.marks(1, 3.25, T.RURAL, false).centre, null);
  assert.deepEqual([T.marks(0, 3.5, 0).dash, T.marks(0, 3.5, 0).period], [6, 18]);
});

test('raster: edge distance, lateral offset, the metres along, the widest edge wins', () => {
  const W = 200,
    H = 100,
    D = new Uint8Array(W * H * 4);
  T.clear(D);
  // a road of 6 m from (10, 50) to (190, 50) at 1 m per pixel, style town; a lane of 3 m crossing it at x = 100
  T.raster(D, W, H, 0, 0, 1, { p: [10, 50, 190, 50], stride: 2, n: 2, hw: 3, kind: 1, surf: 0, st: [T.TOWN] });
  T.raster(D, W, H, 0, 0, 1, { p: [100, 10, 100, 90], stride: 2, n: 2, hw: 1.5, kind: 4, surf: 3 });
  const a = T.read(D, W, H, 0, 0, 1, 60.5, 50.5);
  assert.ok(
    Math.abs(a.e - 2.5) < 0.1 && a.kind === 1 && a.style === T.TOWN && Math.abs(a.lat - 0.5) < 0.1,
    JSON.stringify(a)
  );
  const b = T.read(D, W, H, 0, 0, 1, 60.5, 47.5);
  assert.ok(Math.abs(b.lat + 2.5) < 0.1 && Math.abs(b.e - 0.5) < 0.1, JSON.stringify(b));
  // beside the road: negative, still the road's code
  const c = T.read(D, W, H, 0, 0, 1, 60.5, 55.5);
  assert.ok(Math.abs(c.e + 2.5) < 0.1 && c.kind === 1, JSON.stringify(c));
  // in the crossing the main road wins (its edge is further), on the lane beyond it the lane
  assert.equal(T.read(D, W, H, 0, 0, 1, 100.5, 50.5).kind, 1);
  const d = T.read(D, W, H, 0, 0, 1, 100.5, 70.5);
  assert.ok(d.kind === 4 && d.surf === 3 && d.style === 0, JSON.stringify(d));
  assert.equal(T.read(D, W, H, 0, 0, 1, 30.5, 90.5), null, 'far from every road');
  // the along-coordinate: 36 m per turn of the byte
  const ph = x => D[(50 * W + x) * 4 + 3] / 255;
  assert.ok(Math.abs(ph(28) - 18.5 / 36) < 0.02, 'half way ' + ph(28));
  assert.ok(Math.abs(ph(47) - (37.5 - 36) / 36) < 0.02, 'wrapped ' + ph(47));
});

test('round 2: a level way is kind 9, a way without its centre line keeps off the axis, a town street without one pavement', () => {
  for (let st = 0; st < 4; st++)
    for (let sf = 0; sf < 6; sf++) {
      const c = T.code(T.LEVEL, sf, st);
      assert.ok(c < 256);
      assert.deepEqual(T.decode(c), { style: st, kind: 9, surf: sf });
    }
  const m9 = T.marks(T.LEVEL, 3, T.TOWN, true);
  assert.ok(!m9.centre && !m9.edge && !m9.kerb && m9.walk === 0, 'nothing on a level surface');
  const W = 200,
    H = 100,
    D = new Uint8Array(W * H * 4);
  T.clear(D);
  // eastbound, 7 m wide, in a town, no centre line, no pavement on its left (the north)
  T.raster(D, W, H, 0, 0, 1, {
    p: [10, 50, 100, 50, 190, 50],
    stride: 2,
    n: 3,
    hw: 3.5,
    kind: 1,
    surf: 0,
    st: [T.TOWN, T.RURAL],
    nc: true,
    noL: true,
    s0: 20,
  });
  for (const y of [47.5, 49.5, 50.5, 52.5]) {
    const a = T.read(D, W, H, 0, 0, 1, 60.5, y);
    assert.ok(a.lat >= T.NC - 0.05, 'the lateral offset keeps off the axis: ' + a.lat);
    assert.ok(Math.abs(a.lat - Math.max(T.NC, Math.abs(y - 50))) < 0.1, 'and is the distance to it: ' + a.lat);
  }
  assert.equal(T.read(D, W, H, 0, 0, 1, 60.5, 52.5).style, T.VILLAGE, 'the left half as in a village');
  assert.equal(T.read(D, W, H, 0, 0, 1, 60.5, 55.5).style, T.VILLAGE, 'and beside it');
  assert.equal(T.read(D, W, H, 0, 0, 1, 60.5, 47.5).style, T.TOWN, 'the right half stays town');
  assert.equal(T.read(D, W, H, 0, 0, 1, 150.5, 52.5).style, T.RURAL, 'open country is open country on both sides');
  // the metres along start at s0
  const ph = x => D[(50 * W + x) * 4 + 3] / 255;
  assert.ok(Math.abs(ph(20) - (20 + 10.5) / 36) < 0.02, 'phase ' + ph(20));
  // a street (kind 3) without the pavement on its right: that half is written as a through road of a village (kerb and gutter, no
  // pavement), the other half stays a town street; no centre line can come of it (the offset keeps off the axis)
  T.clear(D);
  T.raster(D, W, H, 0, 0, 1, { p: [10, 50, 190, 50], stride: 2, n: 2, hw: 3, kind: 3, surf: 0, st: [T.TOWN], noR: true });
  const r = T.read(D, W, H, 0, 0, 1, 60.5, 48.5),
    l = T.read(D, W, H, 0, 0, 1, 60.5, 51.5);
  assert.ok(r.kind === 2 && r.style === T.VILLAGE && r.lat >= T.NC - 0.05, JSON.stringify(r));
  assert.ok(l.kind === 3 && l.style === T.TOWN && l.lat >= T.NC - 0.05, JSON.stringify(l));
  assert.ok(T.marks(2, 3, T.VILLAGE, true).kerb && T.marks(2, 3, T.VILLAGE, true).walk === 0, 'kerb, no pavement');
});

test('round 2: an area lies in the map as a level surface with the distance to its edge; it covers the roads that cross it', () => {
  const W = 120,
    H = 100,
    D = new Uint8Array(W * H * 4);
  T.clear(D);
  // a street from west to east through the middle, then a paved square 60 × 40 m with a hole of 10 × 10 m
  T.raster(D, W, H, 0, 0, 1, { p: [0, 50, 120, 50], stride: 2, n: 2, hw: 3, kind: 3, surf: 0, st: [T.TOWN] });
  T.rasterArea(D, W, H, 0, 0, 1, {
    r: [30, 30, 0, 90, 30, 0, 90, 70, 0, 30, 70, 0],
    stride: 3,
    holes: [[70, 34, 0, 80, 34, 0, 80, 44, 0, 70, 44, 0]],
    surf: 2,
  });
  const at = (x, y) => T.read(D, W, H, 0, 0, 1, x, y);
  const a = at(40.5, 60.5);
  assert.ok(a.kind === T.LEVEL && a.surf === 2 && a.style === 0, JSON.stringify(a));
  assert.ok(a.e > 7.5, 'deep inside: the distance is clamped at +8');
  assert.ok(Math.abs(at(32.5, 60.5).e - 2.5) < 0.1, 'near the west edge');
  // the street inside the square is the square; outside it stays the street
  const on = at(60.5, 50.5);
  assert.ok(on.kind === T.LEVEL && on.surf === 2, 'the square covers the street ' + JSON.stringify(on));
  const out = at(10.5, 50.5);
  assert.ok(out.kind === 3 && out.style === T.TOWN && out.surf === 0, JSON.stringify(out));
  // the hole: outside the area (negative towards its edge), beside the square likewise
  const h = at(72.5, 39.5);
  assert.ok(h.kind === T.LEVEL && Math.abs(h.e + 2.5) < 0.1, 'in the hole, near its edge ' + JSON.stringify(h));
  assert.equal(at(75.5, 39.5), null, 'the middle of the hole is beyond the band of every edge');
  const b = at(60.5, 27.5);
  assert.ok(b.kind === T.LEVEL && Math.abs(b.e + 2.5) < 0.1, 'beside the square ' + JSON.stringify(b));
  assert.equal(at(60.5, 10.5), null, 'far from everything');
  // a second area inside the first: the one in which the pixel lies deeper wins
  T.rasterArea(D, W, H, 0, 0, 1, { r: [34, 62, 44, 62, 44, 68, 34, 68], stride: 2, surf: 0 });
  assert.equal(at(39.5, 65.5).surf, 2, 'the big square stays (deeper inside it)');
});

test('round 2: the picture of the sign faces grows; the cells of the faces that were there stay where they are', () => {
  const made = [],
    cvs = (w, h) => {
      const g = { fillRect() {}, drawImage() {}, save() {}, restore() {}, translate() {} },
        cv = { width: w, height: h, getContext: () => g };
      made.push(cv);
      return cv;
    };
  // (drawing a face needs a real canvas: a face that fails to draw is only logged)
  const warn = console.warn;
  console.warn = () => {};
  try {
    const A = M.atlas([{ c: '274-50' }, { c: '205' }], cvs, 64);
    assert.deepEqual(A.keys, ['back', '274-50', '205']);
    assert.equal(A.H, 64);
    assert.equal(A.HV, M.ROWS * 64);
    const c0 = A.cell['274-50'].slice();
    // the centre of the second cell of the first row, counted in the picture of ROWS rows
    assert.ok(Math.abs(c0[0] - 96 / 512) < 1e-9 && Math.abs((1 - c0[1]) * A.HV - 32) < 1e-9, JSON.stringify(c0));
    assert.equal(A.add([{ c: '274-50' }, { c: '205+215' }]), 1, 'one new face');
    const more = [];
    for (let i = 0; i < 20; i++) more.push({ c: 'km', t: String(i) });
    assert.equal(A.add(more), 20);
    assert.equal(A.keys.length, 24);
    assert.equal(A.H, 256, 'three rows of 64 need 256 pixels');
    assert.equal(A.grown, 2, 'the canvas was made anew once: 64 → 256');
    assert.deepEqual(A.cell['274-50'], c0, 'a face that was there keeps its cell');
    const k = A.cell['km|19'];
    assert.ok(Math.abs((1 - k[1]) * A.HV - (2 * 64 + 32)) < 1e-9, 'row three');
    // the texture's transform maps the meshes' v onto the rows that exist
    const v = k[1] * (A.HV / A.H) + (1 - A.HV / A.H);
    assert.ok(Math.abs((1 - v) * A.H - 160) < 1e-6, 'pixel row ' + (1 - v) * A.H);
    // full: no more than ROWS × 8 faces
    const lots = [];
    for (let i = 0; i < 400; i++) lots.push({ c: 'km', t: 'x' + i });
    A.add(lots);
    assert.equal(A.keys.length, M.ROWS * 8);
    assert.equal(A.H, A.HV);
    assert.equal(A.add([{ c: 'km', t: 'one too many' }]), 0);
  } finally {
    console.warn = warn;
  }
});

// ---- geometry ----
const tris = raw => {
  const out = [];
  for (let i = 0; i < raw.idx.length; i += 3) {
    const v = [0, 1, 2].map(k => {
      const j = raw.idx[i + k] * 3;
      // back to site coordinates: three (x, y, z) = site (x, z, -y)
      return { p: [raw.pos[j], -raw.pos[j + 2], raw.pos[j + 1]], n: [raw.nrm[j], -raw.nrm[j + 2], raw.nrm[j + 1]] };
    });
    const [a, b, c] = v.map(q => q.p),
      u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
      g = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]],
      gl = Math.hypot(...g) || 1;
    out.push({ v, g: g.map(q => q / gl), m: [0, 1, 2].map(k => (a[k] + b[k] + c[k]) / 3), area: gl / 2 });
  }
  return out;
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

test('kit: boxes, beams and cylinders are wound outwards, the normals agree with the winding', () => {
  const K = M.kit();
  K.box(10, 20, 1, 2, 3, 4, 0.7, [1, 0, 0]);
  let T3 = tris(K.raw);
  assert.equal(T3.length, 12);
  for (const t of T3) {
    assert.ok(dot(t.g, t.v[0].n) > 0.99, 'stored normal = winding');
    assert.ok(dot(t.g, [t.m[0] - 10, t.m[1] - 20, t.m[2] - 3]) > 0, 'outwards');
  }
  // the box is 2 across and 3 along its heading: its corners lie 3 / 2 from the middle along (sin az, cos az)
  const f = [Math.sin(0.7), Math.cos(0.7)],
    along = Math.max(...T3.flatMap(t => t.v.map(q => (q.p[0] - 10) * f[0] + (q.p[1] - 20) * f[1])));
  assert.ok(Math.abs(along - 1.5) < 1e-6, 'along ' + along);
  for (const [A, B] of [
    [
      [0, 0, 0],
      [4, 1, 2],
    ],
    [
      [0, 0, 0],
      [0, 0, 5],
    ],
    [
      [3, 3, 1],
      [-2, 6, 1],
    ],
  ]) {
    const K2 = M.kit();
    K2.beam(A, B, 0.2, 0.3, [0, 1, 0]);
    const mid = [0, 1, 2].map(k => (A[k] + B[k]) / 2);
    T3 = tris(K2.raw);
    assert.equal(T3.length, 12);
    for (const t of T3) {
      assert.ok(dot(t.g, t.v[0].n) > 0.99, 'beam normal = winding');
      assert.ok(dot(t.g, [t.m[0] - mid[0], t.m[1] - mid[1], t.m[2] - mid[2]]) > 0, 'beam outwards');
    }
  }
  const K3 = M.kit();
  K3.cyl(5, 5, 0, 6, 0.1, 0.05, 8, [0, 0, 1]);
  for (const t of tris(K3.raw)) {
    const out = t.m[2] > 5.99 ? [0, 0, 1] : [t.m[0] - 5, t.m[1] - 5, 0];
    assert.ok(dot(t.g, out) > 0, 'cylinder outwards');
    for (const q of t.v) assert.ok(dot(q.n, t.g) > 0.7, 'smooth normal near the face');
  }
});

test('a delineator: one metre above the ground; the upright reflector faces the traffic that has it on its right', () => {
  const K = M.kit();
  // traffic heading north (az 0) – the post on its right; that traffic comes from the south and sees the south face
  M.post(K, 100, 200, 5, 0);
  const T3 = tris(K.raw),
    zs = T3.flatMap(t => t.v.map(q => q.p[2]));
  assert.ok(Math.abs(Math.max(...zs) - 5.89) < 0.02 && Math.min(...zs) < 5, 'height ' + Math.max(...zs));
  // reflector faces: light, small, beyond the post's own faces
  const refl = T3.filter((t, i) => i >= 36); // after the three boxes of the post
  const south = refl.filter(t => t.g[1] < -0.9 && t.m[1] < 200 - 0.045),
    north = refl.filter(t => t.g[1] > 0.9 && t.m[1] > 200 + 0.045);
  const area = L => L.reduce((a, t) => a + t.area, 0);
  assert.ok(Math.abs(area(south) - 0.04 * 0.18) < 1e-4, 'one upright reflector to the south ' + area(south));
  assert.ok(Math.abs(area(north) - 2 * 0.05 * 0.05) < 1e-4, 'two dots to the north ' + area(north));
});

test('a guard rail: the wave bulges towards the road, the ends sink, colliders along it', () => {
  const P = [];
  for (let i = 0; i <= 20; i++) P.push([i * 2, 0, 3]);
  for (const tw of [1, -1]) {
    const K = M.kit(),
      col = M.rail(K, P, tw);
    assert.equal(col.length, 20);
    const T3 = tris(K.raw),
      ys = T3.flatMap(t => t.v.map(q => q.p[1]));
    // run eastwards: the road to its left is north
    if (tw > 0) assert.ok(Math.max(...ys) > 0.07 && Math.min(...ys) > -0.12, 'bulge north');
    else assert.ok(Math.min(...ys) < -0.07 && Math.max(...ys) < 0.12, 'bulge south');
    // in the middle the beam's top is 0.75 above the ground, at the very end near it
    const top = x => Math.max(...T3.flatMap(t => t.v.filter(q => Math.abs(q.p[0] - x) < 0.01).map(q => q.p[2])));
    assert.ok(Math.abs(top(20) - 3.75) < 0.01, 'top ' + top(20));
    assert.ok(top(0) < 3.1 && top(40) < 3.1, 'sunk ends ' + top(0));
    // the lighter side (towards the road) looks at the road
    const steel = T3.filter(t => t.v[0].n[1] * tw > 0.3 && Math.abs(t.m[0] - 20) < 1);
    assert.ok(steel.length > 0);
  }
  // a piece of a longer run stays up at the end that goes on
  const K = M.kit();
  M.rail(K, P, 1, false, true);
  const T3 = tris(K.raw),
    top0 = Math.max(...T3.flatMap(t => t.v.filter(q => Math.abs(q.p[0]) < 0.01).map(q => q.p[2])));
  assert.ok(Math.abs(top0 - 3.75) < 0.01, 'no sink at the joint ' + top0);
});

test('signs: the atlas has a cell per face; the face looks against the traffic, its picture upright and not mirrored', () => {
  const list = [
    { c: '274-70', h: 0 },
    { c: '205+215', h: 0 },
    { c: '625', t: 'L', h: 0 },
    { c: '625', t: 'R', h: 0 },
    { c: 'km', t: '12,5', h: 0 },
    { c: '201', h: 0 },
  ];
  const A = M.atlas(list, null);
  assert.deepEqual(A.keys, ['back', '274-70', '205', '215', '625|L', '625|R', 'km|12,5', '201']);
  for (const k of A.keys) {
    const c = A.cell[k];
    assert.ok(
      c[0] - c[2] / 2 >= 0 && c[0] + c[2] / 2 <= 1 && c[1] - c[3] / 2 >= 0 && c[1] + c[3] / 2 <= 1,
      'cell inside ' + k
    );
  }
  // traffic heading east (az 90°): the sign is read from the west – the face looks west
  const K = M.kit(),
    F = { pos: [], nrm: [], uv: [], idx: [] },
    s = { c: '274-70', h: Math.PI / 2, t: '' },
    col = M.sign(K, F, A, s, 50, 60, 2);
  assert.ok(col[4] > 4 && col[3] === 2, 'post collider');
  const T3 = tris({ pos: F.pos, nrm: F.nrm, idx: F.idx }),
    front = T3.filter(t => t.g[0] < -0.9),
    back = T3.filter(t => t.g[0] > 0.9);
  assert.equal(front.length, 20);
  assert.equal(back.length, 20);
  for (const t of front) assert.ok(dot(t.g, t.v[0].n) > 0.99);
  // the picture: the traffic's right (south, when heading east) is the picture's right (larger u); up is larger v
  const c = A.cell['274-70'];
  let ok = 0;
  for (let i = 0; i < F.pos.length / 3; i++) {
    const p = [F.pos[i * 3], -F.pos[i * 3 + 2], F.pos[i * 3 + 1]],
      u = F.uv[i * 2],
      v = F.uv[i * 2 + 1];
    if (F.nrm[i * 3] > 0) continue; // the back: one grey point
    if (p[1] < 60 - 0.1) assert.ok(u > c[0], 'south of the middle: right half');
    if (p[1] > 60 + 0.1) assert.ok(u < c[0], 'north: left half');
    if (p[2] > 2 + 2.15 + 0.1) assert.ok(v > c[1], 'above: upper half');
    assert.ok(Math.abs(u - c[0]) <= c[2] / 2 + 1e-6 && Math.abs(v - c[1]) <= c[3] / 2 + 1e-6, 'inside its cell');
    ok++;
  }
  assert.equal(ok, 21);
  // the disc is 0.62 m across, its middle 2.15 m above the ground
  const zs = front.flatMap(t => t.v.map(q => q.p[2]));
  assert.ok(
    Math.abs(Math.max(...zs) - (2 + 2.15 + 0.31)) < 0.01 && Math.abs(Math.min(...zs) - (2 + 2.15 - 0.31)) < 0.01
  );
});

test('power: the conductors hang where the models say, the same with and without building', () => {
  for (const type of [0, 1]) {
    const K = M.kit(),
      a = (type ? M.tower : M.pole)(K, 10, 20, 100, 0.4),
      b = M.hang(type, 10, 20, 100, 0.4);
    assert.deepEqual(a, b);
    assert.equal(a.length, type ? 7 : 3);
    assert.ok(K.count() > (type ? 500 : 30), 'triangles ' + K.count());
    for (const p of a) assert.ok(p[2] > 100 + (type ? 20 : 8.5) && p[2] <= 100 + (type ? 31 : 10.5), 'height ' + p[2]);
  }
  // a wire sags in the middle: eight segments, end to end
  const W = [];
  M.wire(W, [0, 0, 10], [100, 0, 10], 2, 8);
  assert.equal(W.length, 8 * 6);
  const zs = W.filter((v, i) => i % 3 === 1);
  assert.ok(Math.abs(Math.min(...zs) - 8) < 1e-6, 'sag ' + Math.min(...zs));
  assert.deepEqual([W[0], W[1], W[2]], [0, 10, -0]);
  assert.deepEqual([W[45], W[46], W[47]], [100, 10, -0]);
  for (let i = 6; i < W.length; i += 6) assert.deepEqual([W[i], W[i + 1], W[i + 2]], [W[i - 3], W[i - 2], W[i - 1]]);
});

test('paint: a stop line is solid, a give-way line in blocks, a zebra in stripes; a deck carries the marks of its road', () => {
  const flat = () => 2,
    area = K => tris(K.raw).reduce((a, t) => a + t.area, 0);
  for (const [type, want] of [
    ['halt', 2 * 1.6 * 0.5],
    ['warte', 4 * 0.5 * 0.4],
    ['zebra', 3 * 0.5 * 4],
  ]) {
    const K = M.kit();
    M.paint(K, type, 10, 10, 0.3, 1.6, flat);
    assert.ok(Math.abs(area(K) - want) < 1e-6, type + ' area ' + area(K) + ' / ' + want);
    for (const t of tris(K.raw)) {
      assert.ok(t.g[2] > 0.99, 'facing up');
      assert.ok(Math.abs(t.m[2] - 2.022) < 1e-6, 'just above the ground');
    }
  }
  // a deck of 60 m, a main road of 6.5 m in open country: 5 dashes of 4 m and two edge lines, 12 cm wide
  const P = [
      [0, 0, 5],
      [30, 0, 5.3],
      [60, 0, 5],
    ],
    K = M.kit();
  M.deckMarks(K, P, 3.25, T.marks(1, 3.25, T.RURAL));
  const T3 = tris(K.raw),
    a = T3.reduce((s, t) => s + t.area, 0);
  assert.ok(Math.abs(a - (5 * 4 + 2 * 60) * 0.12) < 0.05, 'paint ' + a);
  for (const t of T3) assert.ok(t.g[2] > 0.99 && t.m[2] > 5.02 && t.m[2] < 5.34, 'on the deck, facing up');
  const ys = T3.flatMap(t => t.v.map(q => Math.abs(q.p[1])));
  assert.ok(Math.abs(Math.max(...ys) - (3.25 - 0.27 + 0.06)) < 1e-6, 'edge lines 0.27 m inside the edge');
  // a village lane: nothing
  const K2 = M.kit();
  M.deckMarks(K2, P, 1.8, T.marks(4, 1.8, T.RURAL));
  assert.equal(K2.count(), 0);
});
