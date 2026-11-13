// The worker's generator without a browser: every tile of the sample set through lazy/suhl/bau/kachel.js (levels 1 and 2) and the
// trees – counts, time, no NaN in any buffer, every record placed. Run: node viz3/extra/suhl-laufzeit/bau_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)),
  ROOT = path.resolve(HERE, '..', '..', '..'),
  D = path.join(HERE, 'dist', 'suhl'),
  { frame, wth1, tsize, ROOT_E0, ROOT_N0 } = await import(path.join(ROOT, 'viz3/src/lazy/suhl/kern/geo.js')),
  { kachel, baeume, ears, bridge } = await import(path.join(ROOT, 'viz3/src/lazy/suhl/bau/kachel.js')),
  { loadIndex, tileSet } = await import(path.join(ROOT, 'viz3/src/lazy/suhl/kern/index.js'));
const xf = JSON.parse(fs.readFileSync(path.join(ROOT, 'viz3/manifests.json'))).geoman.xf,
  F = frame(xf);
let fail = 0;
const ck = (what, ok, info = '') => {
  console.log((ok ? 'OK   ' : 'FAIL ') + what, info);
  if (!ok) fail++;
};
const gi = JSON.parse(fs.readFileSync(path.join(D, 'g/v0/index.json'))),
  set = tileSet((gi.has && gi.has['10']) || gi.kacheln || gi.tiles),
  tiles = [];
set.each((x, y) => tiles.push([x, y]));
ck('index: the tile list of the buildings', tiles.length > 0, tiles.length + ' tiles');
const tot = { n: 0, bad: 0, off: 0, wallV: 0, roofV: 0, farV: 0, segs: 0, ms1: 0, ms2: 0, recs: 0, trees: 0 };
const finite = o => Object.values(o).every(a => !(a instanceof Float32Array) || a.every(Number.isFinite));
for (const [x, y] of tiles) {
  const T = F.tile(10, x, y),
    j = JSON.parse(fs.readFileSync(path.join(D, `g/v0/10/${x}/${y}.json`))),
    tb = fs.readFileSync(path.join(D, `boden/v0/t/10/${x}/${y}.bin`)),
    ter = await wth1(tb.buffer.slice(tb.byteOffset, tb.byteOffset + tb.byteLength)),
    recs = Array.isArray(j) ? j : j.b,
    m = { recs, terrain: ter, frame: Array.isArray(j.o) ? 'modell' : 'abs', tile: { e0: T.e0, n0: T.n0, s: T.s, cx: T.cx, cy: T.cy }, old: [-4639.4, 12476.5, 520] };
  if (Array.isArray(j.o)) ck(`tile ${x}/${y}: its centre o is the tile centre of the runtime`, Math.hypot(j.o[0] - T.cx, j.o[1] - T.cy) < 0.01, `${j.o} / ${T.cx.toFixed(3)}, ${T.cy.toFixed(3)}`);
  let t0 = performance.now();
  const [o1] = kachel({ ...m, level: 1 }, F);
  tot.ms1 += performance.now() - t0;
  t0 = performance.now();
  const [o2] = kachel({ ...m, level: 2 }, F);
  tot.ms2 += performance.now() - t0;
  const drawn = recs.filter(b => b.k !== 8).length;
  if (o1.n !== drawn || o1.bad !== recs.length - drawn || !finite(o1.walls) || !finite(o1.roofs) || !finite(o2.far) || o2.n !== o1.n)
    ck(`tile ${x}/${y}: every record built, no NaN`, false, JSON.stringify({ n: o1.n, bad: o1.bad, recs: recs.length, drawn, w: finite(o1.walls), r: finite(o1.roofs), f: finite(o2.far) }));
  // heights sane: every vertex between 20 m below the terrain's lowest point and 150 m above its highest
  const hmin = Math.min(...ter.h) - 20,
    hmax = Math.max(...ter.h) + 150;
  let zb = 0;
  for (const a of [o1.walls.position, o1.roofs.position, o2.far.position]) for (let i = 1; i < a.length; i += 3) if (a[i] < hmin || a[i] > hmax) zb++;
  if (zb) ck(`tile ${x}/${y}: heights within the terrain's range`, false, zb + ' vertices');
  tot.n += o1.n;
  tot.bad += o1.bad;
  tot.off += o1.off;
  tot.recs += recs.length;
  tot.wallV += o1.walls.position.length / 3;
  tot.roofV += o1.roofs.position.length / 3;
  tot.farV += o2.far.position.length / 3;
  tot.segs += o1.segs.length / 4;
  const bp = path.join(D, `b/v0/10/${x}/${y}.bin`);
  if (fs.existsSync(bp)) {
    const bb = fs.readFileSync(bp),
      [tr] = baeume({ buf: bb.buffer.slice(bb.byteOffset, bb.byteOffset + bb.byteLength), terrain: ter, tile: m.tile }, F);
    tot.trees += tr.n;
    let out = 0;
    for (let i = 0; i < tr.n; i++) if (Math.abs(tr.trees[i * 7]) > 300 || Math.abs(tr.trees[i * 7 + 1]) > 300 || !Number.isFinite(tr.trees[i * 7 + 2])) out++;
    if (out) ck(`tile ${x}/${y}: trees inside their tile`, false, out + ' of ' + tr.n);
  }
}
ck('every record of the sample is built (underground ones left out)', tot.bad === tot.recs - tot.n && tot.n > 0, JSON.stringify(tot));
console.log(`note: the foot z0 of ${tot.off} of ${tot.n} records lies more than 2.5 m off the terrain tiles – those stand on the tiles (for suhl-gebaeude: fuss.py against the tiles of suhl-boden)`);
console.log(`level 1: ${Math.round(tot.ms1)} ms for ${tot.n} buildings (${(tot.ms1 / tot.n).toFixed(2)} ms each), ${tot.wallV} wall + ${tot.roofV} roof vertices; level 2: ${Math.round(tot.ms2)} ms, ${tot.farV} vertices; ${tot.segs} wall feet; ${tot.trees} trees`);
// ear clipping with a courtyard
const P = bridge([0, 0, 10, 0, 10, 10, 0, 10], [[3, 3, 3, 7, 7, 7, 7, 3]]),
  idx = ears(P);
let area = 0;
for (let k = 0; k < idx.length; k += 3) {
  const [a, b, c] = [P[idx[k]], P[idx[k + 1]], P[idx[k + 2]]];
  area += ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
}
ck('a flat roof with a courtyard: the area without the hole', Math.abs(area - 84) < 1e-6, 'area ' + area);
// the index of the sample through the runtime's reader (fetch from files)
globalThis.fetch = async url => {
  const p = url.replace('file://', '');
  return fs.existsSync(p) ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p)) } : { ok: false, status: 404 };
};
const IX = await loadIndex('file://' + D + '/');
ck('index: aktuell.json and the products boden, g, b', ['boden', 'g', 'b'].every(k => IX.prod[k] && IX.prod[k].index && !IX.prod[k].err), JSON.stringify(Object.fromEntries(Object.values(IX.prod).map(p => [p.name, p.err || 'v' + p.v]))));
ck('index: tile lists of g and b', IX.prod.g.sets[10] && IX.prod.g.sets[10].has(497, 542) && !IX.prod.g.sets[10].has(495, 543) && IX.prod.b.sets[10] && IX.prod.b.sets[10].has(497, 542));
console.log(fail ? `FAILED: ${fail}` : 'bau_test: ok', tsize(10), ROOT_E0, ROOT_N0);
process.exit(fail ? 1 : 0);
