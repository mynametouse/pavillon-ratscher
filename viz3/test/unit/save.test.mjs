// Unit tests of SAVE (core/save.js) without a browser – the module runs in node with a fake localStorage (refactor phase 1: ES modules
// can be loaded one by one). Run: node --test viz3/test/unit/   (tools/check.sh does it; a few milliseconds)
import { test } from 'node:test';
import assert from 'node:assert/strict';

// a fake browser: localStorage as a Map, optionally full (quota) or blocked (Safari private mode)
function fakeStorage(mode = 'ok') {
  const m = new Map();
  return {
    m,
    getItem: k => {
      if (mode === 'blocked') throw new Error('SecurityError');
      return m.has(k) ? m.get(k) : null;
    },
    setItem: (k, v) => {
      if (mode === 'blocked') throw new Error('SecurityError');
      if (mode === 'full' && k !== '__pav_probe') throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: k => {
      if (mode === 'blocked') throw new Error('SecurityError');
      m.delete(k);
    },
  };
}
let n = 0;
async function load(mode, preset = {}) {
  const ls = fakeStorage(mode);
  for (const [k, v] of Object.entries(preset)) ls.m.set(k, v);
  globalThis.window = { localStorage: ls };
  const quiet = console.warn;
  console.warn = () => {};
  try {
    const { SAVE } = await import(`../../src/core/save.js?fresh=${n++}`); // a fresh module (own registry) per test
    return { SAVE, ls };
  } finally {
    console.warn = quiet;
  }
}

test('json value: written as plain JSON, read back, default when missing', async () => {
  const { SAVE, ls } = await load();
  const K = SAVE.key('pav-x-v1', { owner: 'test', kind: 'json', def: { a: 0 } });
  assert.deepEqual(SAVE.get(K), { a: 0 });
  assert.equal(SAVE.set(K, { a: 2, b: [1, 2] }), true);
  assert.equal(ls.m.get('pav-x-v1'), '{"a":2,"b":[1,2]}');
  assert.deepEqual(SAVE.get(K), { a: 2, b: [1, 2] });
});

test('the default is a copy – changing it does not change the next read', async () => {
  const { SAVE } = await load();
  const K = SAVE.key('pav-y-v1', { kind: 'json', def: { list: [] } });
  SAVE.get(K).list.push(1);
  assert.deepEqual(SAVE.get(K), { list: [] });
});

test('broken or unexpected values give the default and a problem note, never an exception (lesson V16b4)', async () => {
  const { SAVE } = await load('ok', { 'pav-veh-v1': '{"car":{"x":', 'pav-tier': 'ultra', 'pav-texlevel': 'NaN' });
  assert.deepEqual(SAVE.get('pav-veh-v1'), {}); // registered in save.js with default {}
  assert.equal(SAVE.get('pav-tier'), null); // not one of hoch/mittel/schnell
  assert.equal(SAVE.get('pav-texlevel'), 1); // num: not finite
  assert.ok(SAVE.problems.length >= 3);
});

test('kinds: num, flag, text', async () => {
  const { SAVE, ls } = await load();
  const N = SAVE.key('pav-n', { kind: 'num', def: 5 });
  const F = SAVE.key('pav-f', { kind: 'flag', def: false });
  const T = SAVE.key('pav-t', { kind: 'text', def: null });
  SAVE.set(N, 2.5);
  SAVE.set(F, true);
  SAVE.set(T, 'abc');
  assert.deepEqual([ls.m.get('pav-n'), ls.m.get('pav-f'), ls.m.get('pav-t')], ['2.5', '1', 'abc']);
  assert.deepEqual([SAVE.get(N), SAVE.get(F), SAVE.get(T)], [2.5, true, 'abc']);
  SAVE.set(T, null); // null removes the key
  assert.equal(ls.m.has('pav-t'), false);
});

test('migration on read: the preview of 22.10.2026 called Ronald Bernd – workpieces given to him there come back to Ronald', async () => {
  const old = JSON.stringify({
    list: [
      { id: 1, where: 'bernd' },
      { id: 2, where: 'bench' },
    ],
  });
  const { SAVE } = await load('ok', { 'pav-werk-v1': old });
  assert.deepEqual(
    SAVE.get('pav-werk-v1').list.map(o => o.where),
    ['ronald', 'bench']
  );
});

test('once: true on the first visit only', async () => {
  const { SAVE } = await load();
  assert.equal(SAVE.once('pav-v99'), true);
  assert.equal(SAVE.once('pav-v99'), false);
});

test('secrets stay out of dump; load writes raw values for tests', async () => {
  const { SAVE } = await load('ok', { 'pav-gh-token': 'ghp_secret', 'pav-tier': 'mittel' });
  const d = SAVE.dump();
  assert.equal('pav-gh-token' in d, false);
  assert.equal(d['pav-tier'], 'mittel');
  SAVE.load({ 'pav-tier': 'hoch', 'pav-view': null });
  assert.equal(SAVE.get('pav-tier'), 'hoch');
});

test('full storage: a write reports false but the value lives on for this visit', async () => {
  const { SAVE } = await load('full');
  const K = SAVE.key('pav-z-v1', { kind: 'json', def: null });
  assert.equal(SAVE.persistent(), true);
  assert.equal(SAVE.set(K, { a: 1 }), false);
  assert.deepEqual(SAVE.get(K), { a: 1 });
});

test('blocked storage (private mode): no exceptions, values for this visit only', async () => {
  const { SAVE } = await load('blocked');
  assert.equal(SAVE.persistent(), false);
  const K = SAVE.key('pav-w-v1', { kind: 'text', def: 'x' });
  assert.equal(SAVE.get(K), 'x');
  assert.equal(SAVE.set(K, 'y'), false);
  assert.equal(SAVE.get(K), 'y');
});
