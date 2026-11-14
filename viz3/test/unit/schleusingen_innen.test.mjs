// Unit tests of the houses of Schleusingen from inside (schleusingen/si_plan.js, si_laden.js) without a browser: which buildings of the town
// data, the records for the planner, the stairwell house with its flats on plans shaped like the kit's (zombie/z_innen_plan.js: the hall
// at the door, the stacked stairs along the small side, the attic stair) over many sizes – rooms inside the house and apart, every door in
// a partition between its two rooms, every room reached, one flat per storey open –, the shop rooms of every kind inside their room and
// under its ceiling, the door kept free. Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIPLAN } from '../../src/schleusingen/si_plan.js';
import { SILADEN } from '../../src/schleusingen/si_laden.js';
import { LIPLAN } from '../../src/laeden/innen_plan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(
  fs.readFileSync(path.join(HERE, '..', '..', 'extra', 'schleusingen', 'dist', 'schleusingen', 'stadt.json'), 'utf8')
);
const PW = SIPLAN.PW;

// the door facade as welt/schleusingen.js picks it (towards the nearest street, not a party wall), the door in its middle bay
function withDoor(b) {
  let doorF = -1,
    best = 1e9;
  b.F.forEach((f, k) => {
    const L = Math.hypot(f[2] - f[0], f[3] - f[1]);
    if (f[8] & 1 || L < 3 || f[9] > 15) return;
    const sc = f[9] - L * 0.05;
    if (sc < best) {
      best = sc;
      doorF = k;
    }
  });
  const out = Object.assign({}, b, { z0: 0, st: { style: 0, raised: false, sp: 2.8, frame: 0 } });
  if (doorF >= 0) {
    const f = b.F[doorF],
      L = Math.hypot(f[2] - f[0], f[3] - f[1]);
    out.doorFac = { ax: f[0], ay: f[1], dx: (f[2] - f[0]) / L, dy: (f[3] - f[1]) / L, u: L / 2, w: b.k === 0 ? 1.05 : 2.5 };
  }
  return out;
}

test('which buildings of the town: houses with a street door; not the landmarks, sheds, halls, named buildings', () => {
  const why = {};
  let n = 0;
  for (const b0 of DATA.b) {
    const b = withDoor(b0),
      w = SIPLAN.rules(b);
    if (w) why[w] = (why[w] || 0) + 1;
    else n++;
    if (b0.lm) assert.equal(w, 'wahrzeichen', 'landmark ' + b0.lm);
    if (b0.k === 2) assert.equal(w, 'schuppen');
  }
  assert.ok(n > 400 && n < 726, 'candidates ' + n + ' ' + JSON.stringify(why));
  assert.equal(why.wahrzeichen, 4);
  assert.ok(why.schuppen >= 25 && why.halle >= 20 && why.name >= 20, JSON.stringify(why));
});

test('the record for the planner: an id of its own, the facades with their door and normals, a roof, the party walls without bays', () => {
  for (const b0 of DATA.b.slice(0, 200)) {
    const b = withDoor(b0);
    if (SIPLAN.rules(b)) continue;
    const r = SIPLAN.record(b);
    assert.ok(SIPLAN.has(r.id) && r.id === 900000 + b0.i && r.id > 100000, 'id');
    assert.equal(r.typ, 0);
    assert.equal(r.fac.length, b0.F.length);
    const d = r.fac.filter(f => f.door);
    assert.equal(d.length, 1, 'one door facade');
    assert.ok(d[0].L > 3 && !d[0].blind && Math.abs(d[0].door.u - d[0].L / 2) < 1e-6);
    // the outward normal: a point in front of the door lies outside the footprint, one behind it inside
    const f = d[0],
      mx = f.ax + f.dx * f.door.u,
      my = f.ay + f.dy * f.door.u;
    assert.ok(!SIPLAN.inPoly(b0.f, mx + f.nx * 0.5, my + f.ny * 0.5), 'outside in front of the door ' + b0.i);
    assert.ok(SIPLAN.inPoly(b0.f, mx - f.nx * 0.5, my - f.ny * 0.5), 'inside behind the door ' + b0.i);
    for (const q of r.fac) if (q.blind) assert.equal(q.L, 0.5, 'a party wall has no bays');
    assert.ok(r.roofTris.length >= 2 && r.roofTris.every(t => t.length === 3 && t.every(p => p.length === 3)));
    assert.ok(r.area > 20);
  }
});

test('the signs: the first rows of the town’s list (16 with the Bürgerbüro), in the order of its buildings', () => {
  const bld = DATA.b.map(withDoor),
    s = SIPLAN.signed(bld, true),
    all = bld.filter(b => (b.lm === 'rathaus' || (b.s && b.s[0])) && b.doorFac);
  assert.ok(s.size >= 10 && s.size <= 15, 'signed ' + s.size);
  const first = all.slice(0, 15).filter(b => b.lm !== 'rathaus');
  assert.deepEqual([...s.keys()].sort((a, b) => a - b), first.map(b => b.i).sort((a, b) => a - b));
});

test('what kind of shop a sign is: bakery, pharmacy, café, inn, shelves – or none (a doctor, a bank: a flat)', () => {
  assert.equal(SIPLAN.shopType('Bäckerei Scheidig', 'bakery'), 'baecker');
  assert.equal(SIPLAN.shopType('Adler Apotheke', 'pharmacy'), 'apotheke');
  assert.equal(SIPLAN.shopType('Stadtcafé', 'cafe'), 'cafe');
  assert.equal(SIPLAN.shopType('Ratsstube', 'restaurant'), 'gaststaette');
  assert.equal(SIPLAN.shopType('Rockenstein Buchhandlung', 'books'), 'laden');
  assert.equal(SIPLAN.shopType('Dr. Pils', 'doctors'), null);
  assert.equal(SIPLAN.shopType('vr bank', 'bank'), null);
  assert.equal(SIPLAN.shopType('Friseur', 'hairdresser'), null);
  // every sign of the data has a place with a type, or none fits
  const pois = DATA.poi;
  let typed = 0;
  for (const b of DATA.b.map(withDoor)) if (b.s && SIPLAN.shopOf(b, pois, b.s[0])) typed++;
  assert.ok(typed >= 8, 'typed shops ' + typed);
});

test('the look of 2026 fixed per id: mostly today, some after 1990, few DDR, rarely as before 1960; a shop of today', () => {
  const n = { heute: 0, 'heute-90': 0, 'heute-ddr': 0, alt: 0 };
  for (let i = 0; i < 800; i++) n[SIPLAN.lookOf(SIPLAN.idOf(i), 'haus')]++;
  assert.ok(n.heute > 450 && n['heute-90'] > 90 && n['heute-ddr'] > 40 && n.alt > 5 && n.alt < 50, JSON.stringify(n));
  assert.equal(SIPLAN.lookOf(SIPLAN.idOf(7), 'haus'), SIPLAN.lookOf(SIPLAN.idOf(7), 'haus'));
  for (let i = 0; i < 50; i++) assert.equal(SIPLAN.lookOf(SIPLAN.idOf(i), 'laden'), 'heute');
});

// ---- plans shaped like the kit's (zombie/z_innen_plan.js make: the hall at the door, its stairs on the small side's wall) ----
function kitPlan(W, D, du, nSt) {
  const ST = 2.75,
    SLAB = 0.22,
    t = 0.4,
    xi0 = t,
    xi1 = W - t,
    yi0 = t,
    yi1 = D - t,
    FW = W < 7 ? 1.6 : W < 10 ? 1.9 : 2.2;
  let fa = du - FW / 2,
    fb = du + FW / 2;
  if (fa - PW / 2 - xi0 < 1.9) fa = xi0 - PW / 2;
  if (xi1 - fb - PW / 2 < 1.9) fb = xi1 + PW / 2;
  const sides = [];
  if (fa > xi0) sides.push({ k: 'L', w: fa - PW / 2 - xi0 });
  if (fb < xi1) sides.push({ k: 'R', w: xi1 - fb - PW / 2 });
  const hx0 = Math.max(xi0, fa + PW / 2),
    hx1 = Math.min(xi1, fb - PW / 2);
  const big = sides.slice().sort((a, b) => b.w - a.w)[0] || null,
    small = sides.find(s => s !== big) || null;
  const n = Math.max(12, Math.round(ST / 0.19)),
    rise = ST / n;
  let tread = 0.25,
    y0 = yi0 + 1.7;
  const fit = () => y0 + (n - 1) * tread <= yi1 - 0.15;
  if (!fit()) {
    tread = 0.22;
    y0 = yi0 + 1.3;
  }
  if (!fit()) {
    tread = Math.max(0.19, (yi1 - 0.15 - (yi0 + 1.15)) / (n - 1));
    y0 = yi0 + 1.15;
  }
  let stair = null;
  const sw = Math.min(0.9, (hx1 - hx0) * 0.48);
  if (fit() && hx1 - hx0 >= 1.45) {
    const onR = small ? small.k === 'R' : fb >= xi1;
    stair = {
      x0: onR ? hx1 - sw : hx0,
      x1: onR ? hx1 : hx0 + sw,
      y0,
      y1: y0 + (n - 1) * tread,
      n,
      rise,
      tread,
      side: onR ? 'R' : 'L',
      holeK: Math.max(2, Math.ceil((ST - SLAB - 1.9) / rise) - 1),
    };
  }
  const zF = [],
    zC = [];
  for (let k = 0; k < nSt; k++) {
    zF.push(0.35 + k * ST);
    zC.push(0.35 + (k + 1) * ST - SLAB);
  }
  // the attic stair along the other wall of the top hall, at the back
  const astair =
    stair && nSt > 1
      ? {
          x0: stair.side === 'R' ? hx0 : hx1 - 0.8,
          x1: stair.side === 'R' ? hx0 + 0.8 : hx1,
          y0: yi1 - 0.6 - 12 * 0.21,
          y1: yi1 - 0.6,
          dir: 1,
          fl: nSt - 1,
          side: stair.side === 'R' ? 'L' : 'R',
        }
      : null;
  return {
    id: 900000 + Math.round(W * 31 + D * 7 + du),
    xi0,
    xi1,
    yi0,
    yi1,
    X0: 0,
    X1: W,
    D,
    t,
    fa,
    fb,
    hx0,
    hx1,
    stair,
    astair,
    nSt,
    zF,
    zC,
    zA: 0.35 + nSt * ST,
    rooms: [{ kind: 'boden', fl: nSt, x0: xi0 + 1, x1: xi1 - 1, y0: yi0 + 1, y1: yi1 - 1, z0: 0.35 + nSt * ST, z1: 0.35 + nSt * ST + 2 }],
    doors: [],
    windows: [],
    front: { x: du, w: 1.05, z0: 0.35, z1: 2.5 },
  };
}

test('the stairwell house over many sizes: rooms inside and apart, doors in partitions, every room reached, one flat open per storey', () => {
  let plans = 0,
    flats = 0,
    baths = 0,
    kitchens = 0,
    storeys = 0,
    locked = 0;
  for (let W = 6; W <= 20; W += 1.3)
    for (let D = 6.5; D <= 18; D += 1.15)
      for (const f of [0.22, 0.5, 0.71])
        for (const nSt of [2, 3, 4]) {
          const P = kitPlan(W, D, W * f, nSt);
          if (!P.stair) continue;
          const Q = SIPLAN.flats(P, { seed: P.id });
          if (!Q) continue;
          plans++;
          const bad = SIPLAN.check(Q);
          assert.deepEqual(bad, [], `W ${W.toFixed(1)} D ${D.toFixed(1)} door ${f} storeys ${nSt}: ${bad.join('; ')}`);
          // per storey: the stairwell, at most one flat open; every flat's rooms on its storey
          for (let k = 0; k < nSt; k++) {
            assert.equal(Q.rooms.filter(r => r.trep && r.fl === k).length, 1);
            assert.ok(Q.open.filter(d => d.fl === k).length <= 1);
          }
          flats += Q.open.length;
          locked += Q.locked.length;
          storeys += nSt;
          for (const d of Q.open) {
            const rs = Q.rooms.filter(r => r.flat && r.fl === d.fl);
            if (rs.some(r => r.kind === 'bad')) baths++;
            if (rs.some(r => r.kind === 'kueche')) kitchens++;
            assert.ok(rs.some(r => r.kind === 'diele') && rs.some(r => r.kind === 'wohnzimmer'), 'a hall and a living room');
          }
          // the plan is the same each time
          assert.deepEqual(SIPLAN.flats(kitPlan(W, D, W * f, nSt), { seed: P.id }).rooms.map(r => r.id), Q.rooms.map(r => r.id));
        }
  assert.ok(plans > 300, 'plans ' + plans);
  assert.ok(flats > storeys * 0.7, `open flats ${flats} of ${storeys} storeys`);
  assert.ok(kitchens > flats * 0.9 && baths > flats * 0.7, `kitchens ${kitchens}, baths ${baths} of ${flats}`);
  assert.ok(locked > 50, 'locked doors ' + locked);
});

test('a phone: one flat in a stairwell house, the other doors locked', () => {
  const P = kitPlan(12, 12, 6, 3),
    Q = SIPLAN.flats(P, { seed: 3, phone: true });
  assert.ok(Q);
  assert.equal(Q.open.length, 1);
  assert.equal(Q.open[0].fl, 1);
  assert.deepEqual(SIPLAN.check(Q), []);
});

test('the shop: the ground floor one room behind the house door, one storey, no stairs', () => {
  const P = kitPlan(9, 11, 4.5, 3),
    Q = SIPLAN.shop(P, 'baecker');
  assert.equal(Q.nSt, 1);
  assert.equal(Q.rooms.length, 1);
  assert.equal(Q.rooms[0].kind, 'flur');
  assert.equal(Q.rooms[0].name, 'Bäckerei');
  assert.equal(Q.stair, null);
  assert.deepEqual(SIPLAN.check(Q), []);
});

test('the shop rooms of every kind: fixtures inside the room and under its ceiling, the way from the door free', () => {
  for (const type of Object.keys(SILADEN.LAY))
    for (const [W, D] of [
      [6, 8],
      [8.2, 10.5],
      [11, 9],
    ]) {
      // a room turned 30° (the town's houses are), counter-clockwise, its door in the middle of the front
      const a = Math.PI / 6,
        c = Math.cos(a),
        s = Math.sin(a),
        T = (x, y) => [100 + x * c - y * s, 50 + x * s + y * c],
        f = LIPLAN.ccw([...T(0, 0), ...T(W, 0), ...T(W, D), ...T(0, D)]),
        dw = T(W / 2, 0),
        hc = 2.53,
        u = { id: 'si-test-' + type, type, vols: [{ f, h: hc + 1.0 }], doors: [{ x: dw[0], y: dw[1], nx: s, ny: -c }] },
        Pl = SILADEN.plan(u, hc);
      assert.ok(Pl && Pl.boxes.length > 10, type + ' fixtures');
      const inside = (x, y) => LIPLAN.inPoly(f, x, y) || LIPLAN.edgeDist(f, x, y) < 0.06;
      for (const b of Pl.boxes) {
        assert.ok(inside(b.x, b.y), `${type} ${W}×${D}: a box inside (${b.x.toFixed(2)}, ${b.y.toFixed(2)})`);
        assert.ok(b.z + b.sz <= hc + 1e-6, `${type}: under the ceiling`);
      }
      for (const g of Pl.goods) assert.ok(inside(g.x, g.y) && g.z + g.h <= hc, type + ': goods inside');
      for (const l of Pl.lights) assert.ok(l.z <= hc, type + ': lights at the ceiling');
      for (const sg of Pl.signs) assert.ok(sg.z + sg.h <= hc && sg.z > 1.5, type + ': signs under the ceiling');
      // the way in: 1 m in front of the door (inside) nothing stands
      const ix = dw[0] - s * 1.0,
        iy = dw[1] + c * 1.0;
      for (const b of Pl.boxes)
        if (b.z < 1.0) assert.ok(Math.hypot(b.x - ix, b.y - iy) > 0.45, `${type} ${W}×${D}: the door kept free`);
      // no sign with a name: only what kind of shop it is
      for (const sg of Pl.signs) for (const t of sg.t) assert.ok(t.length < 40, type + ' sign ' + t);
    }
});
