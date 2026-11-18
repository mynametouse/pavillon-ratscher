// Unit tests of feat/grenzland-zone without a browser: the pure parts of the border zone (GLZDATA) – lines, the nearest point, the
// slabs along the Kolonnenweg (two lanes, 0.75 × 2.5 m, joints), the drive there, the boards' texts with their sources – and the zone's
// data file (viz3/extra/grenzland-zone/dist/grenzland-zone/zone.json, made by tools/grenzland/zone_gruenes_band.py).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { GLZDATA as D } from '../../src/grenzland/gl_zone_data.js';

const ZJ = new URL('../../extra/grenzland-zone/dist/grenzland-zone/zone.json', import.meta.url);
const Z = fs.existsSync(ZJ) ? JSON.parse(fs.readFileSync(ZJ, 'utf8')) : null;
// a straight way 100 m to the east, rising 5 m (x, y in dm, z in cm)
const gerade = () =>
  D.linie(
    Array.from({ length: 51 }, (_, i) => [i * 20, 0, i * 10]).flat(),
    3
  );

test('a line: lengths, a point along it, the nearest point with its side', () => {
  const L = gerade();
  assert.equal(L.n, 51);
  assert.ok(Math.abs(L.len - 100) < 1e-9);
  const p = D.bei(L, 25);
  assert.ok(Math.abs(p.x - 25) < 1e-9 && Math.abs(p.y) < 1e-9 && Math.abs(p.z - 1.25) < 1e-9);
  assert.ok(Math.abs(p.hd - Math.PI / 2) < 1e-9, 'heading east = 90°');
  const q = D.naechst(L, 40, -3);
  assert.ok(Math.abs(q.s - 40) < 1e-9 && Math.abs(q.d - 3) < 1e-9);
  assert.ok(q.lat > 0, 'south of an eastward line lies to its right');
  assert.ok(D.naechst(L, 40, 3).lat < 0);
});

test('the slabs: two lanes of 0.75 × 2.5 m, 0.75 m of grass between them, joints of a few centimetres', () => {
  const L = gerade(),
    P = D.platten(L, { seed: 5 });
  const n = Math.floor(100 / (D.PLATTE.l + D.PLATTE.fuge));
  assert.equal(P.length, 2 * n);
  const links = P.filter(p => p.spur < 0),
    rechts = P.filter(p => p.spur > 0);
  assert.equal(links.length, rechts.length);
  // across: the lanes' middles 1.5 m apart (± the little play), symmetric about the line
  for (let i = 0; i < links.length; i++) {
    const d = Math.abs(links[i].y - rechts[i].y);
    assert.ok(Math.abs(d - (D.PLATTE.spur + D.PLATTE.b)) < 0.06, 'lane spacing ' + d);
  }
  // along: one slab every 2.5 m + joint
  for (let i = 1; i < links.length; i++) {
    const d = links[i].s - links[i - 1].s;
    assert.ok(Math.abs(d - (D.PLATTE.l + D.PLATTE.fuge)) < 1e-6);
  }
  // they follow the profile: the pitch of a 5 % rise
  assert.ok(P.every(p => Math.abs(p.kipp - Math.atan(0.05)) < 0.003));
  // a few broken, sunk or missing ones – not many, the same every time
  const kaputt = P.filter(p => p.k).length;
  assert.ok(kaputt > 0 && kaputt < P.length * 0.2);
  assert.deepEqual(
    D.platten(L, { seed: 5 }).map(p => p.k),
    P.map(p => p.k)
  );
});

test('the boards: in our words with their sources; the hours of the tower', () => {
  for (const T of [D.TAFEL, D.MUSEUM]) {
    assert.ok(T.titel && T.zeilen.length && T.lesen.length);
    assert.ok(/Quelle/.test(T.lesen.join(' ')), 'a source named');
    for (const z of T.zeilen) assert.ok(z === z.toUpperCase(), 'the dot font writes capitals');
  }
  assert.ok(/21\. Juni 1973/.test(D.MUSEUM.lesen.join(' ')));
  assert.ok(D.QUELLEN.some(q => q.includes('bundesarchiv.de')));
  for (const k of ['kolonnenweg_a', 'kolonnenweg_b', 'bunker', 'museum', 'heide', 'parkplatz']) assert.ok(D.ORTE[k]);
});

test('heading differences', () => {
  assert.equal(D.dWinkel(10, 350), 20);
  assert.equal(D.dWinkel(350, 10), -20);
  assert.equal(D.dWinkel(137.6, 137.6), 0);
});

test('zone.json: the Kolonnenweg, places, the drive there, the land cover and the trees', { skip: !Z }, () => {
  assert.equal(Z.v, 1);
  const L = D.linie(Z.kolonnenweg[0].p, 3);
  assert.ok(L.len > 2000, 'the Kolonnenweg in the zone: ' + L.len);
  // its profile has no cliffs: no step over 0.7 m between points 2 m apart (the real way climbs steeply in places, up to ~30 %)
  for (let i = 1; i < L.n; i++) assert.ok(Math.abs(L.z[i] - L.z[i - 1]) < 0.7, 'step at ' + L.s[i]);
  for (const k of ['kolonnenweg_a', 'kolonnenweg_b', 'bunker', 'museum', 'heide', 'parkplatz', 'ankunft'])
    assert.ok(Z.orte[k] && D.inRect(Z.rect, Z.orte[k][0], Z.orte[k][1]), k);
  // the bunker lies off the way, in the heath, not on it
  const nb = D.naechst(L, Z.orte.bunker[0], Z.orte.bunker[1]);
  assert.ok(nb.d > 15 && nb.d < 120, 'bunker from the way ' + nb.d);
  // the drive: Schleusingen → A 73 → K 530, ~21 km, ending at the tower's car park
  const af = D.anfahrt(Z.anfahrt);
  assert.ok(Z.anfahrt.km > 15 && Z.anfahrt.km < 30);
  assert.ok(Z.anfahrt.abschnitte.some(a => a[0] === 'A 73'));
  const e = af[af.length - 1];
  assert.ok(Math.hypot(e[0] - Z.orte.parkplatz[0], e[1] - Z.orte.parkplatz[1]) < 200, 'ends at the car park');
  assert.ok(D.anfahrt(Z.anfahrt, 200).length < af.length);
  // the land cover grid inflates to its size and knows heath at the heath
  const px = zlib.inflateSync(Buffer.from(D.bytes(Z.bewuchs.b64)));
  assert.equal(px.length, Z.bewuchs.nx * Z.bewuchs.ny);
  const B = D.bewuchs(Z.bewuchs, px);
  assert.equal(B.at(Z.utm[0] - 10, Z.utm[1]), -1);
  const kl = new Set();
  for (let i = 0; i < 400; i++) kl.add(B.at(637950 + (i % 20) * 2, 5583790 + Math.floor(i / 20) * 2));
  assert.ok(kl.has(2), 'heath at the Görsdorfer Heide');
  // trees: positions inside the zone, sensible heights
  const T = D.baeume(Z.baeume);
  assert.equal(T.length, Z.baeume.n * 5);
  for (let i = 0; i < T.length; i += 5 * 97) {
    assert.ok(D.inRect(Z.rect, T[i], T[i + 1], 5));
    assert.ok(T[i + 3] > 1 && T[i + 3] < 30);
    assert.ok(T[i + 4] === 3 || T[i + 4] === 4);
  }
});
