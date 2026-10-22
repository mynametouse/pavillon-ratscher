// Unit tests of KERN (core/kern.js) without a browser: providers by priority, defaults without a provider.
// Run: node --test viz3/test/unit/   (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';

let n = 0;
async function fresh() {
  globalThis.window = {};
  const { KERN } = await import(`../../src/core/kern.js?fresh=${n++}`);
  return KERN;
}

test('without providers: flat ground, no road, no place', async () => {
  const K = await fresh();
  assert.equal(K.ground(10, 20), 0);
  assert.equal(K.terrain(10, 20), 0);
  assert.equal(K.surface(10, 20), null);
  assert.equal(K.place(10, 20), null);
  assert.deepEqual(K.providers(), {});
});

test('the provider with the highest priority answers; place falls through to the next one', async () => {
  const K = await fresh();
  K.provide('ground', (x, y) => x + y);
  K.provide('ground', () => 99, 5);
  assert.equal(K.ground(1, 2), 99);
  K.provide('place', (x, y) => (x > 0 ? 'Ost' : null), 10); // village before the roads (world/village_props.js)
  K.provide('place', () => 'Feldweg', 0);
  assert.equal(K.place(5, 0), 'Ost');
  assert.equal(K.place(-5, 0), 'Feldweg');
  assert.deepEqual(K.providers(), { ground: 2, place: 2 });
});

test('pushOut moves the point in place and says so', async () => {
  const K = await fresh();
  K.provide('pushOut', (p, r) => {
    if (p[0] < r) {
      p[0] = r;
      return true;
    }
    return false;
  });
  const p = [0.2, 3];
  assert.equal(K.pushOut(p, 0.5), true);
  assert.deepEqual(p, [0.5, 3]);
});
