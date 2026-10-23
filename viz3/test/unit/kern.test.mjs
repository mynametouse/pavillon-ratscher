// Unit tests of KERN (core/kern.js) without a browser: providers by priority, defaults without a provider; since phase 2 also areas, spots,
// the action registry, events, zones, waits and borrowed lights.
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

test('areas name places by priority; inside counts only areas marked so', async () => {
  const K = await fresh();
  K.provide('place', () => 'Feldweg', 0);
  K.area({ name: 'Garten', rect: [-10, -10, 10, 10], prio: 50 });
  K.area({ name: 'Bungalow', rect: [0, 0, 5, 5], z: [-0.5, 3], prio: 60, inside: true });
  K.area({ name: 'Teich', circle: [-5, -5, 2] });
  K.area({
    name: 'Acker',
    poly: [
      [20, 0],
      [30, 0],
      [30, 10],
    ],
  });
  assert.equal(K.place(2, 2, 0), 'Bungalow');
  assert.equal(K.place(2, 2, 5), 'Garten'); // above the roof
  assert.equal(K.place(-5, -5), 'Garten'); // the garden (50) before the pond (30)
  assert.equal(K.place(29, 5), 'Acker');
  assert.equal(K.place(25, 8), 'Feldweg');
  assert.equal(K.inside(2, 2, 1), true);
  assert.equal(K.inside(-5, -5, 0), false);
  K.provide('inside', (x, y) => x > 100);
  assert.equal(K.inside(101, 0, 0), true);
});

test('spots merge into the registry; acts replace by id', async () => {
  const K = await fresh();
  K.spot('dorf', { mode: 'walk', pos: [1, 2], yaw: 10 });
  K.spot('dorf', { yaw: 20 });
  assert.deepEqual(K.spot('dorf'), { mode: 'walk', pos: [1, 2], yaw: 20 });
  assert.equal(K.spots().dorf.yaw, 20);
  K.act({ id: 'a', label: () => 'A' });
  K.act({ id: 'b', label: () => 'B', r: 3 });
  K.act({ id: 'a', label: () => 'A2' });
  assert.deepEqual(
    K.acts().map(a => [a.id, a.label(), a.r]),
    [
      ['a', 'A2', 1.6],
      ['b', 'B', 3],
    ]
  );
  K.unact('a');
  assert.deepEqual(
    K.acts().map(a => a.id),
    ['b']
  );
});

test('events reach their listeners and "*"; a broken listener does not stop the others', async () => {
  const K = await fresh();
  const got = [];
  const off = K.on('talk', d => got.push('talk ' + d.who));
  K.on('talk', () => {
    throw new Error('kaputt');
  });
  K.on('*', (d, n) => got.push('* ' + n));
  K.emit('talk', { who: 'hubert' });
  off();
  K.emit('talk', { who: 'ronald' });
  assert.deepEqual(got, ['talk hubert', '* talk', '* talk']);
  assert.deepEqual(
    K.events().map(e => e.name),
    ['talk', 'talk']
  );
});

test('zones build near (async), drop far after keep seconds, and report errors', async () => {
  const K = await fresh();
  let at = [1000, 0];
  K.provide('observer', () => at);
  const log = [];
  K.zone({
    id: 'stadt',
    x: 0,
    y: 0,
    near: 100,
    far: 200,
    keep: 0.5,
    build: async () => {
      log.push('build');
    },
    drop: () => log.push('drop'),
    tick: () => log.push('tick'),
  });
  K.zone({
    id: 'kaputt',
    x: 0,
    y: 0,
    near: 100,
    far: 200,
    build: () => {
      throw new Error('fehlt');
    },
    drop: () => {},
  });
  K.update(0.3);
  assert.deepEqual(log, []);
  at = [50, 0];
  K.update(0.3);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(K.zones()[0].state, 'ready');
  assert.equal(K.zones()[1].state, 'error');
  assert.match(K.zones()[1].err, /fehlt/);
  K.update(0.016);
  assert.ok(log.includes('tick'));
  at = [150, 0]; // between near and far: stays
  K.update(0.3);
  assert.equal(K.zones()[0].state, 'ready');
  at = [500, 0];
  K.update(0.3); // away 0.25 s
  assert.equal(K.zones()[0].state, 'ready');
  K.update(0.3);
  K.update(0.3); // away 0.75 s > keep
  assert.equal(K.zones()[0].state, 'idle');
  assert.deepEqual(
    log.filter(s => s !== 'tick'),
    ['build', 'drop']
  );
  assert.deepEqual(
    K.events()
      .filter(e => e.name === 'zone')
      .map(e => e.data.state),
    ['ready', 'idle']
  );
});

test('until resolves when the condition holds and rejects after its time', async () => {
  const K = await fresh();
  let v = 0;
  const p = K.until(() => v > 1 && v);
  const q = K.until(() => false, 0.5);
  v = 2;
  K.update(0.3);
  assert.equal(await p, 2);
  K.update(0.3);
  await assert.rejects(q, /Zeit/);
});

test('lights are lent by need and come back with their colour, place and range', async () => {
  const K = await fresh();
  const mk = (c, x) => ({
    color: {
      c,
      getHex() {
        return this.c;
      },
      setHex(h) {
        this.c = h;
      },
    },
    position: {
      x,
      clone() {
        return { x: this.x };
      },
      copy(o) {
        this.x = o.x;
      },
    },
    distance: 5,
    decay: 2,
    intensity: 0,
  });
  const L = [mk(1, 0), mk(2, 1), mk(3, 2)];
  let home = true,
    want = true,
    restored = 0;
  K.lights.pool(L, { home: () => home, restore: () => restored++ });
  const got = [];
  K.lights.borrow({
    id: 'schule',
    n: 2,
    want: () => want,
    on: ls => got.push('on ' + ls.length),
    tick: ls => {
      for (const l of ls) {
        l.position.x = 99;
        l.color.setHex(7);
        l.intensity = 12;
      }
    },
    off: () => got.push('off'),
  });
  K.lights.borrow({ id: 'feuer', n: 2, want: () => true, on: () => got.push('feuer on') });
  K.update(0.1);
  assert.deepEqual(got, []); // the pavilion needs them
  home = false;
  K.update(0.1);
  assert.deepEqual(got, ['on 2']); // the fire wants 2, only 1 is left – it waits
  assert.equal(L[0].position.x, 99);
  assert.deepEqual(K.lights.status(), [
    { id: 'schule', n: 2, has: 2 },
    { id: 'feuer', n: 2, has: 0 },
  ]);
  want = false;
  K.update(0.1);
  assert.deepEqual(got, ['on 2', 'off', 'feuer on']);
  assert.equal(restored, 1);
});
