// Unit tests of the shops from inside (laeden/innen_plan.js, innen_markt.js, innen_bau.js, innen_haus.js) without a browser: the units of
// the shops' data, every plan's fixtures inside its unit, the way from the door into the room free (walker radius 0.21 m), the doors in
// the walls. Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIPLAN } from '../../src/laeden/innen_plan.js';
import { LIMARKT } from '../../src/laeden/innen_markt.js';
import { LIBAU } from '../../src/laeden/innen_bau.js';
import { LIHAUS } from '../../src/laeden/innen_haus.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(
  fs.readFileSync(path.join(HERE, '..', '..', 'extra', 'laeden', 'dist', 'laeden', 'laeden.json'), 'utf8')
);
const LAY = { supermarkt: LIMARKT.markt, discounter: LIMARKT.markt, baumarkt: LIBAU.baumarkt, ...LIHAUS.LAY };
const UNITS = LIPLAN.units(DATA);
const plans = new Map(UNITS.map(u => [u.id, LAY[u.type](LIPLAN.newPlan(u), u)]));

test('every shop of the data has its units: one type each, a door, outlines inside the shop', () => {
  const ids = UNITS.map(u => u.id).sort();
  assert.deepEqual(ids, [
    'aldi',
    'apotheke',
    'edeka',
    'getraenke',
    'lidl',
    'lidlbaecker',
    'mcd',
    'mega',
    'megamoebel',
    'megarest',
    'obi',
    'rewe',
    'shell',
    'turan',
    'waesche',
  ]);
  for (const u of UNITS) {
    assert.ok(LAY[u.type], u.id + ': a layout for ' + u.type);
    assert.ok(u.doors.length >= 1 && u.doors.every(d => d.k !== 'liefer'), u.id + ': its doors');
    const sh = DATA.shops.find(s => s.id === u.shop),
      outl = sh.parts.concat(sh.annex).map(p => p.f);
    for (const v of u.vols)
      for (let i = 0; i < v.f.length; i += 2) {
        const x = v.f[i],
          y = v.f[i + 1],
          ok = outl.some(f => LIPLAN.inPoly(f, x, y) || LIPLAN.edgeDist(f, x, y) < 0.05);
        assert.ok(ok, `${u.id}: a corner of its outline (${x.toFixed(1)}, ${y.toFixed(1)}) lies in the shop`);
      }
  }
  // the Mega Center's units do not overlap
  const mega = UNITS.filter(u => u.shop === 'mega');
  for (const a of mega)
    for (const b of mega) {
      if (a === b) continue;
      for (const va of a.vols) {
        const c = va.f.reduce((s, v, i) => ((s[i % 2] += v / (va.f.length / 2)), s), [0, 0]);
        assert.ok(!b.vols.some(vb => LIPLAN.inPoly(vb.f, c[0], c[1])), `${a.id} and ${b.id} overlap`);
      }
    }
});

test('what stands inside each unit stands in its outline (the mall: its shops behind the glass excepted)', () => {
  for (const u of UNITS) {
    const P = plans.get(u.id);
    const inside = (x, y) => u.vols.some(v => LIPLAN.inPoly(v.f, x, y) || LIPLAN.edgeDist(v.f, x, y) < 0.35);
    let bad = 0,
      first = null;
    const things = P.boxes.filter(b => !(u.type === 'mall')).concat(P.goods.filter(() => u.type !== 'mall'));
    for (const b of things)
      if (!inside(b.x, b.y)) {
        bad++;
        first = first || [b.x.toFixed(1), b.y.toFixed(1)];
      }
    assert.ok(bad === 0, `${u.id}: ${bad} things outside, the first at ${first}`);
    assert.ok(P.secs.length >= 1 && P.secs.every(s => s.h > 2.2 && s.h < 9.5), u.id + ': sections with ceilings');
  }
});

test('from the main door one walks into the room (the fixtures leave the way free)', () => {
  for (const u of UNITS) {
    const P = plans.get(u.id),
      sh = DATA.shops.find(s => s.id === u.shop);
    // the walls: the unit's runs less their open pieces and the door's gap; the fixtures' segments
    const fronts = u.doors.map(d => ({
      id: 'd',
      x: d.x,
      y: d.y,
      nx: d.nx,
      ny: d.ny,
      w: d.w,
      front: d.w + 2,
      hG: 2.6,
      z0: 0,
      hD: 2.35,
    }));
    const runs = LIPLAN.walls(u, fronts.concat(P.holes || []));
    const segs = [];
    for (const r of runs) {
      const gaps = r.open.slice();
      for (const h of r.holes) if (h.door) gaps.push([h.door.u0, h.door.u1]);
      for (const [t0, t1] of LIPLAN.rest(r.L, gaps))
        segs.push([r.a[0] + r.ux * t0, r.a[1] + r.uy * t0, r.a[0] + r.ux * t1, r.a[1] + r.uy * t1]);
    }
    segs.push(...P.segs);
    const RAD = 0.21,
      C = 0.3;
    const hit = (x, y) => {
      for (const s of segs) {
        const ex = s[2] - s[0],
          ey = s[3] - s[1],
          l2 = ex * ex + ey * ey || 1,
          t = Math.max(0, Math.min(1, ((x - s[0]) * ex + (y - s[1]) * ey) / l2));
        if (Math.hypot(x - s[0] - ex * t, y - s[1] - ey * t) < RAD) return true;
      }
      return false;
    };
    const d = u.doors[0];
    let bb = [1e9, 1e9, -1e9, -1e9];
    for (const v of u.vols) {
      const b = LIPLAN.bbOf(v.f);
      bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])];
    }
    const nx = Math.ceil((bb[2] - bb[0]) / C) + 1,
      ny = Math.ceil((bb[3] - bb[1]) / C) + 1,
      seen = new Uint8Array(nx * ny),
      inU = (x, y) => u.vols.some(v => LIPLAN.inPoly(v.f, x, y));
    // start just inside the door
    const sx = d.x - d.nx * 0.9,
      sy = d.y - d.ny * 0.9;
    const q = [[Math.round((sx - bb[0]) / C), Math.round((sy - bb[1]) / C)]];
    let n = 0,
      free = 0;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        const x = bb[0] + i * C,
          y = bb[1] + j * C;
        if (inU(x, y)) free++;
      }
    assert.ok(inU(sx, sy), u.id + ': inside the door is the room');
    while (q.length) {
      const [i, j] = q.pop();
      if (i < 0 || j < 0 || i >= nx || j >= ny || seen[j * nx + i]) continue;
      seen[j * nx + i] = 1;
      const x = bb[0] + i * C,
        y = bb[1] + j * C;
      if (!inU(x, y) || hit(x, y)) continue;
      n++;
      q.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
    }
    // a good part of the floor is reachable (the rest is under shelves, counters, behind the counter)
    const share = n / free;
    assert.ok(
      share > (u.type === 'baumarkt' || u.type === 'supermarkt' || u.type === 'discounter' ? 0.35 : 0.25),
      `${u.id}: ${(share * 100).toFixed(0)} % of the floor reachable from the door`
    );
    void sh;
  }
});

test('the doors lie in the walls: each door of a unit on a run with an opening for it', () => {
  for (const u of UNITS) {
    const fronts = u.doors.map(d => ({
      id: 'd',
      x: d.x,
      y: d.y,
      nx: d.nx,
      ny: d.ny,
      w: d.w,
      front: d.w + 2,
      hG: 2.6,
      z0: 0,
      hD: 2.35,
    }));
    const runs = LIPLAN.walls(u, fronts);
    assert.ok(
      runs.some(r => r.holes.some(h => h.door)),
      u.id + ': its main door is in a wall'
    );
  }
});

test('plans are deterministic and of bounded size', () => {
  for (const u of UNITS) {
    const a = LAY[u.type](LIPLAN.newPlan(u), u),
      b = plans.get(u.id);
    assert.equal(a.boxes.length, b.boxes.length, u.id);
    assert.equal(a.goods.length, b.goods.length, u.id);
    const products = a.goods.reduce((s, g) => s + g.n, 0);
    assert.ok(products < 45000, u.id + ': ' + products + ' products');
  }
});

test('every product fits its compartment: on a board or another product, not past its edge, under the next board, of a real size', () => {
  // the width of one product (m) by kind: a bottle 6–9.5 cm across, a can 6–11 cm …
  const SIZE = {
    box: [0.05, 0.31],
    bottle: [0.06, 0.095],
    can: [0.06, 0.11],
    jar: [0.05, 0.1],
    pack: [0.15, 0.5],
    bag: [0.1, 0.35],
    crate: [0.28, 0.45],
    loaf: [0.15, 0.4],
    eimer: [0.16, 0.4],
  };
  const rect = (x, y, rot, sx, sy, z0, z1) => ({ x, y, c: Math.cos(rot), s: Math.sin(rot), sx, sy, z0, z1 });
  const has = (r, x, y, tol) => {
    const dx = x - r.x,
      dy = y - r.y;
    return Math.abs(dx * r.c + dy * r.s) <= r.sx / 2 + tol && Math.abs(-dx * r.s + dy * r.c) <= r.sy / 2 + tol;
  };
  const report = [];
  for (const u of UNITS) {
    const P = plans.get(u.id);
    const boxes = P.boxes.map(b => rect(b.x, b.y, b.rot, b.sx, b.sy, b.z, b.z + b.sz)),
      blocks = P.goods.map(g => rect(g.x, g.y, Math.atan2(g.ay, g.ax), g.len, g.dep, g.z, g.z + g.h));
    const bad = [];
    P.goods.forEach((g, gi) => {
      const fr = g.dep / 2 - 0.005,
        al = g.len / 2 - 0.005,
        corners = [
          [-al, -fr],
          [al, -fr],
          [al, fr],
          [-al, fr],
        ].map(([a, f]) => [g.x + g.ax * a + g.fx * f, g.y + g.ay * a + g.fy * f]),
        pts = [[g.x, g.y], ...corners],
        top = g.z + g.h;
      // nothing (a board, a fixture) reaches into the product
      if (boxes.some(r => r.z0 > g.z + 0.01 && r.z0 < top - 0.005 && pts.some(([x, y]) => has(r, x, y, -0.002))))
        bad.push(
          `${g.k} at ${g.x.toFixed(2)}, ${g.y.toFixed(2)}, ${g.z.toFixed(2)}: a board or fixture inside its height`
        );
      if (g.k === 'heap') return; // fruit in crates and plants in pots may overhang
      if (g.z > 0.02) {
        // it stands on something (a board, a deck, a pallet, a product below), not past that one's edge
        const sup = boxes
          .filter(r => Math.abs(r.z1 - g.z) < 0.065)
          .concat(blocks.filter((r, ri) => ri !== gi && Math.abs(r.z1 - g.z) < 0.02));
        if (!sup.some(r => has(r, g.x, g.y, 0.01)))
          bad.push(`${g.k} at ${g.x.toFixed(2)}, ${g.y.toFixed(2)}, ${g.z.toFixed(2)}: floats`);
        else if (!corners.every(([x, y]) => sup.some(r => has(r, x, y, 0.035))))
          bad.push(`${g.k} at ${g.x.toFixed(2)}, ${g.y.toFixed(2)}, ${g.z.toFixed(2)}: past the board's edge`);
      }
      const w = g.len / Math.max(1, g.n),
        lim = SIZE[g.k];
      if (lim && (w < lim[0] - 1e-6 || w > lim[1] + 1e-6)) bad.push(`${g.k} ${(w * 100).toFixed(1)} cm wide`);
      if (g.k === 'bottle' && g.h > 0.36) bad.push(`bottle ${(g.h * 100).toFixed(0)} cm high`);
    });
    if (bad.length) report.push(`${u.id}: ${bad.length} products do not fit, e.g. ${bad.slice(0, 3).join('; ')}`);
  }
  assert.ok(report.length === 0, report.join('\n'));
});
