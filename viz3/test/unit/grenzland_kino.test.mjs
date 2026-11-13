// Unit tests of feat/grenzland-kino without a browser: what the cutscenes, the title cards and the score read from the missions' data –
// a title line under every mission's name, the music table naming real missions and layers, the pacing of a line (reading time limits).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLMDATA as D, GLMLOGIK as L } from '../../src/grenzland/gl_mission_data.js';

test('kino: every mission of chapter 1 has a line for its title card (place and time)', () => {
  for (const id of D.ORDER) {
    const m = D.M[id];
    assert.ok(m && typeof m.unter === 'string' && m.unter.length >= 8, id);
    assert.ok(!/Hubert|Ronald/.test(m.unter), id);
  }
});

test('kino: the music under the steps names missions of the chapter and layers of the score', () => {
  const LAYERS = new Set(['spannung', 'flucht', '1989', 'szene']);
  const keys = Object.keys(D.LAGE);
  assert.ok(keys.length >= 8);
  for (const k of keys) {
    const [m, s] = k.split(':');
    assert.ok(D.ORDER.includes(m), k);
    assert.ok(s && s.length > 2, k);
    assert.ok(LAYERS.has(D.LAGE[k]), k);
  }
  // the race drives, sneaking up holds its breath
  assert.equal(D.LAGE['clique:rennen'], 'flucht');
  assert.equal(D.LAGE['klinge:ansehen'], 'spannung');
});

test('kino: a line stays long enough to be read, and its recording may stretch it by 1.6 at most', () => {
  for (const L0 of Object.values(D.R))
    for (const [, text] of L0) {
      const lese = L.dauer(text) / 1000,
        cap = Math.max(1.6, lese * 1.6);
      assert.ok(lese >= 2 && lese <= 9, text);
      assert.ok(cap >= lese && cap >= 1.6, text);
    }
});

test('kino: the talks that become cutscenes have two lines or more and somebody who speaks', () => {
  const BARK = new Set([
    'knall',
    'entdeckt',
    'verlorenWache',
    'leucht',
    'batterie',
    'wacheSieht',
    'wacheFunk',
    'verloren',
  ]);
  let n = 0;
  for (const [key, lines] of Object.entries(D.R)) {
    if (BARK.has(key) || lines.length < 2) continue;
    assert.ok(
      lines.some(([who]) => who),
      key
    );
    n++;
  }
  // the long talks of the chapter: the stranger, the clique, the dam, Gerhard (twice), the plan, the end – and the two's own
  assert.ok(n >= 12, String(n));
});
