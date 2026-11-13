// Unit tests of feat/grenzland-auto's pure geometry (grenzland/gl_karosse.js, gl_typen.js, gl_zweirad.js) without a browser: the kit's
// faces look outward, the bodies have the real types' measures, normals are unit vectors, the speedometer's needle.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLKAROSSE as K } from '../../src/grenzland/gl_karosse.js';
import { GLTYPEN } from '../../src/grenzland/gl_typen.js';
import { GLZWEIRAD } from '../../src/grenzland/gl_zweirad.js';

// a part's corners back in the vehicle's frame (x right, y forward, z up)
const corners = q => {
  const out = [];
  for (let i = 0; i < q.n * 3; i++)
    out.push({ p: [q.pos[i * 3], -q.pos[i * 3 + 2], q.pos[i * 3 + 1]], n: [q.nor[i * 3], -q.nor[i * 3 + 2], q.nor[i * 3 + 1]] });
  return out;
};
const bbox = pieces => {
  const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 };
  for (const pc of pieces)
    for (const q of Object.values(pc.parts))
      for (const c of corners(q)) {
        const p = [c.p[0] + pc.at[0], c.p[1] + pc.at[1], c.p[2] + pc.at[2]];
        b.x0 = Math.min(b.x0, p[0]);
        b.x1 = Math.max(b.x1, p[0]);
        b.y0 = Math.min(b.y0, p[1]);
        b.y1 = Math.max(b.y1, p[1]);
        b.z0 = Math.min(b.z0, p[2]);
        b.z1 = Math.max(b.z1, p[2]);
      }
  return b;
};

test('the kit: boxes, tubes, lathes, pads, blobs and sweeps face outward; collapsed faces are dropped', () => {
  const out = (q, ref) => corners(q).every(c => c.n[0] * ref(c.p)[0] + c.n[1] * ref(c.p)[1] + c.n[2] * ref(c.p)[2] > -1e-6);
  let k = K.kit();
  k.box('a', [0, 0, 0], [1, 2, 3], [1, 1, 1]);
  assert.equal(k.count(), 12);
  assert.ok(out(k.done().a, p => p));
  k = K.kit();
  k.lathe('a', [0, 0, 0], [0, 1, 0], [[0.1, -0.1], [0.1, 0.1]], 12, [1, 1, 1]);
  assert.ok(out(k.done().a, p => [p[0], 0, p[2]]));
  k = K.kit();
  k.tube('a', [[0, 0, 0], [0, 1, 0]], 0.05, 8, [1, 1, 1], { caps: 1 });
  assert.ok(out(k.done().a, p => [p[0], p[1] < 0.01 ? -1 : p[1] > 0.99 ? 1 : 0, p[2]]));
  k = K.kit();
  k.pad('a', [0, 0, 0], [1, 1, 0.4], 0.1, [1, 1, 1]);
  assert.ok(out(k.done().a, p => p));
  k = K.kit();
  k.blob('a', [{ y: -1, w: 0.2, z0: -0.2, z1: 0.2 }, { y: 0, w: 0.3, z0: -0.3, z1: 0.3 }, { y: 1, w: 0.2, z0: -0.2, z1: 0.2 }], [1, 1, 1]);
  assert.ok(out(k.done().a, p => [p[0], Math.abs(p[1]) > 0.999 ? p[1] : 0, p[2]]));
  for (const left of [false, true]) {
    k = K.kit();
    k.sweep('a', [[-1, 0, 0], [0, 0, 0], [1, 0, 0]], [[-0.03, -0.05], [0.03, -0.05], [0.03, 0.05], [-0.03, 0.05]], [1, 1, 1], { left });
    assert.ok(out(k.done().a, p => [Math.abs(p[0]) > 0.999 ? p[0] : 0, p[1], p[2]]), 'sweep left=' + left);
  }
  k = K.kit();
  k.tri('a', [0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 1]);
  k.tri('a', [0, 0, 0], [NaN, 0, 0], [0, 1, 0], [1, 1, 1]);
  assert.equal(k.count(), 0);
});

test('a function from keys, a filleted corner', () => {
  const f = K.F([[0, 1], [2, 3]]);
  assert.equal(f(-1), 1);
  assert.equal(f(1), 2);
  assert.equal(f(5), 3);
  assert.equal(K.F(0.5)(7), 0.5);
  const p = K.fillet([[0, 0], [1, 0], [1, 1]], 0.2, 4);
  assert.equal(p.length, 7);
  assert.ok(p.every(q => !(q[0] > 0.95 && q[1] < 0.05)), 'the corner is cut');
});

test('the Trabant 601 has its real measures (3555 × 1505 × 1437 mm, wheelbase 2020), unit normals, glass, chrome, lamps', () => {
  const M = GLTYPEN.bau('trabant', {}),
    T = M.T,
    b = bbox(M.pieces);
  assert.ok(Math.abs(b.y1 - b.y0 - 3.555) < 0.04, 'length ' + (b.y1 - b.y0));
  assert.ok(Math.abs(b.x1 - b.x0 - 1.505) < 0.16, 'width (with the mirror) ' + (b.x1 - b.x0));
  assert.ok(Math.abs(b.z1 - 1.44) < 0.03, 'height ' + b.z1);
  assert.ok(Math.abs(b.z0) < 0.01, 'the tyres stand on the ground ' + b.z0);
  assert.ok(Math.abs(T.wb - 2.02) < 1e-9);
  const body = M.pieces.find(p => p.name === 'body').parts;
  for (const n of ['lack0', 'matt', 'glas', 'chrom', 'head', 'tail', 'blink']) assert.ok(body[n] && body[n].n > 0, n);
  for (const q of Object.values(body))
    for (let i = 0; i < q.n * 9; i += 3) {
      const l = Math.hypot(q.nor[i], q.nor[i + 1], q.nor[i + 2]);
      assert.ok(Math.abs(l - 1) < 1e-3 && Number.isFinite(q.pos[i] + q.pos[i + 1] + q.pos[i + 2]));
    }
  // the painted skin looks outward: away from the car's long axis at the sides, up on the roof
  let ok = 0,
    bad = 0;
  for (const c of corners(body.lack0)) {
    if (Math.abs(c.p[0]) > 0.5 && c.p[2] > 0.4 && c.p[2] < 0.85 && Math.abs(c.p[1]) < 1.4) (c.n[0] * c.p[0] > 0 ? ok++ : bad++);
    if (c.p[2] > 1.4) (c.n[2] > 0 ? ok++ : bad++);
  }
  assert.ok(ok > 200 && bad === 0, `outward ${ok}, inward ${bad}`);
  assert.equal(GLTYPEN.bau('klein89', {}), GLTYPEN.bau('trabant', {}), 'the first version\'s name gives the same model');
  const U = GLTYPEN.bau('trabant_kombi', {});
  assert.ok(Math.abs(bbox(U.pieces).z1 - 1.467) < 0.03);
});

test('the Simson S 51: 1.89 m long, wheelbase 1.21 m, wheels of 2.75-16; the pieces that steer and roll are apart', () => {
  const M = GLZWEIRAD.bau('s51', {}),
    T = M.T,
    b = bbox(M.pieces.filter(p => !p.dial));
  assert.ok(Math.abs(b.y1 - b.y0 - 1.89) < 0.04, 'length ' + (b.y1 - b.y0));
  assert.ok(Math.abs(T.wb - 1.21) < 1e-9 && Math.abs(T.rw - 0.277) < 1e-9);
  assert.ok(b.x1 - b.x0 > 0.6 && b.x1 - b.x0 < 0.72, 'width over the handlebar ' + (b.x1 - b.x0));
  assert.ok(Math.abs(b.z0) < 0.005 && b.z1 > 1.05 && b.z1 < 1.25, 'height ' + b.z1);
  assert.deepEqual(M.pieces.map(p => p.name), ['rahmen', 'lenkung', 'rad', 'rad', 'nadel']);
  const L = M.pieces[1].parts;
  assert.ok(L.tacho && L.tacho.uv && L.tacho.n === 2, 'the speedometer\'s face has texture coordinates');
  // the axle lies on the steering axis
  const d = [0 - T.pivot[0], T.a - T.pivot[1], T.rw - T.pivot[2]],
    t = d[1] * T.axis[1] + d[2] * T.axis[2],
    off = Math.hypot(d[1] - t * T.axis[1], d[2] - t * T.axis[2]);
  assert.ok(off < 0.01, 'offset ' + off);
});

test('the needle: 0 km/h at the lower left, 100 at the lower right, over the top, never past the stop', () => {
  const w = GLZWEIRAD.nadelWinkel,
    deg = r => (r * 180) / Math.PI;
  assert.ok(Math.abs(deg(w(0)) - 225) < 1e-9);
  assert.ok(Math.abs(deg(w(50)) - 90) < 1e-9);
  assert.ok(Math.abs(deg(w(100)) + 45) < 1e-9);
  assert.equal(w(-5), w(0));
  assert.equal(w(500), w(104));
  for (let v = 0; v < 100; v += 5) assert.ok(w(v + 5) < w(v));
});
