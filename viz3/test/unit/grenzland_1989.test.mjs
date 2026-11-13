// Unit tests of feat/grenzland-1989's data (grenzland/gl_1989_data.js) without a browser: every person of the afternoon has clothes that
// exist, a place near the old school and something true to say; the garments name only weaves the painter knows; what is said keeps to
// the day (no crossing that was not open yet, the sums of the welcome money).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLDATA } from '../../src/grenzland/gl_data.js';
import { GL89DATA as D } from '../../src/grenzland/gl_1989_data.js';

const FIG = readFileSync(new URL('../../src/grenzland/gl_fig.js', import.meta.url), 'utf8');
const has = (table, k) => new RegExp('\\n    ' + k + '(\\(|: \\[)').test(FIG.slice(FIG.indexOf('const ' + table + ' = {')));

test('the clothes and the cast of 1989 are in the core\'s tables; every garment is paintable', () => {
  for (const [k, K] of Object.entries(D.KLEID)) {
    assert.equal(GLDATA.KLEID[k], K, k + ' is the garment the figures are painted with');
    for (const c of ['ober', 'unter', 'schuh']) assert.ok(Array.isArray(K[c]) && K[c].length === 3 && K[c].every(v => v >= 0 && v <= 255), k + '.' + c);
    for (const m of ['oberM', 'unterM', 'armM']) if (K[m]) assert.ok(has('MUSTER', K[m]), k + ': the weave ' + K[m] + ' exists');
    if (K.rock) assert.ok(K.rock > 0.2 && K.rock < 0.5, k + ': a hem between knee and hip');
  }
  for (const [id, c] of Object.entries(D.CAST)) {
    assert.equal(GLDATA.CAST[id], c);
    assert.ok(GLDATA.KLEID[c.kleid], id + ' wears ' + c.kleid);
    assert.ok(c.voice.age >= 18, id + ' is an adult');
    if (c.hut) assert.ok(has('HUTC', c.hut), id + ': headwear ' + c.hut);
    if (c.haar) assert.ok(has('HAAR', c.haar), id + ': hair ' + c.haar);
    if (c.ding) assert.ok(has('DING', c.ding), id + ': carries ' + c.ding);
    assert.ok(!(c.hut && c.haar), id + ': a hat or the hair of the time, not both');
  }
  assert.ok(GLDATA.KLEID[D.GERHARD.kleid], 'the young Gerhard has his parka');
});

test('the people of the afternoon: a place round the old school, something to do, something to say', () => {
  const ids = Object.keys(D.LEUTE);
  assert.ok(ids.length >= 8, 'a village street, not three extras');
  for (const id of ids) {
    const p = D.LEUTE[id];
    assert.ok(GLDATA.CAST[id], id + ' is in the cast');
    assert.ok(D.dist(p.pos, D.MITTE) < D.RADIUS, id + ' stands near the school');
    assert.ok(['kehren', 'kohlen', 'schlange', 'laden', 'moped', 'stehen', 'lesen', 'gehen'].includes(p.tun), id + ': ' + p.tun);
    if (p.tun === 'gehen') assert.ok(p.weg.length >= 2 && p.weg.every(q => D.dist(q, D.MITTE) < D.RADIUS));
    if (p.zu) assert.ok(D.LEUTE[p.zu], id + ' talks to somebody who is there');
    assert.ok(D.SAGT[id] && D.SAGT[id].length >= 3, id + ' has three things to say');
    for (const other of ids) if (other !== id) assert.ok(D.dist(p.pos, D.LEUTE[other].pos) > 0.8, id + ' does not stand in ' + other);
  }
  // nobody under 18 appears, nobody real: the names are the invented villagers' generation of 1989
  for (const id of ids) assert.ok(!['hubert', 'ronald'].includes(id));
});

test('what is said keeps to the day', () => {
  const all = Object.values(D.SAGT).flat().concat(D.RADIO).join(' ');
  assert.ok(/Eisfeld/.test(all) && /Coburg/.test(all), 'the way over is Eisfeld–Rottenbach to Coburg (open since 1973)');
  assert.ok(!/Sonneberg|Neustadt/.test(all), 'the crossing Sonneberg–Neustadt opens only on the 12th');
  assert.ok(/Hundert Mark Begrüßungsgeld/.test(all) && /vierzig/.test(all), '100 DM, and Bavaria adds 40');
  assert.ok(/Waffenschmied/.test(all) && /Zwei Jahre/.test(all) && /Kimono/.test(all), 'the table at the Waffenschmied');
  assert.ok(/Volkspolizeikreis/.test(all), 'the visa stamp');
  assert.ok(!/Euro|Handy|Internet/.test(all));
  assert.ok(D.BILD.uhr > 14 * 60 && D.BILD.uhr < 16.5 * 60, 'an afternoon before dusk');
});
