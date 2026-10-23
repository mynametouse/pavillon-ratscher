// Unit tests of TASKS (core/tasks.js) without a browser: tasks as data – started by an event or by code, steps done by events (with a
// condition on the data) or by polled checks, saved and restored, listed in the one journal. Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';

let n = 0;
// a fresh KERN (core/kern.js) and a SAVE stand-in over one Map (shared between two runners = a reload)
async function fresh(store = new Map()) {
  globalThis.window = {};
  const { KERN } = await import(`../../src/core/kern.js?tasks=${n++}`);
  const S = {
    get: k => (store.has(k) ? JSON.parse(store.get(k)) : null),
    set: (k, v) => (store.set(k, JSON.stringify(v)), true),
  };
  globalThis.window.SAVE = S;
  const { makeTasks } = await import('../../src/core/tasks.js');
  return { K: KERN, T: makeTasks(KERN, S), store };
}
const DEF = () => ({
  id: 'kaufen',
  title: 'Pflanzen bei Kammbach kaufen',
  who: 'Baumschule Kammbach',
  start: { on: 'gplan:liste' },
  steps: [
    { text: 'Fahr nach Kloster Veßra.', target: () => [-8900, -850], on: 'place', when: d => /Kammbach/.test(d.name) },
    { text: 'Such die Pflanzen aus.', on: 'gplan:gekauft' },
    { text: 'Lad sie ins Auto.', check: () => globalThis.__geladen },
  ],
  done: 'Die Pflanzen sind daheim.',
});

test('an event starts the task; steps follow their events and conditions; the journal shows the current step', async () => {
  const { K, T } = await fresh();
  T.define(DEF());
  const seen = [];
  K.on('task:start', d => seen.push('start ' + d.id));
  K.on('task:step', d => seen.push('step ' + d.step));
  K.on('task:done', d => seen.push('done ' + d.title));
  assert.equal(T.state('kaufen'), null);
  assert.equal(K.tasks.list().length, 0);
  K.emit('gplan:liste', {});
  assert.deepEqual(T.state('kaufen'), { st: 'läuft', i: 0 });
  let e = K.tasks.list()[0];
  assert.equal(e.key, 'aufgaben:kaufen');
  assert.equal(e.status, 'läuft');
  assert.equal(e.text, 'Fahr nach Kloster Veßra.');
  assert.deepEqual(e.target(), [-8900, -850]);
  K.emit('place', { name: 'Schleusingen' }); // the wrong place: nothing
  assert.equal(T.state('kaufen').i, 0);
  K.emit('place', { name: 'Baumschule Kammbach' });
  K.emit('gplan:gekauft', {});
  assert.equal(T.state('kaufen').i, 2);
  globalThis.__geladen = true;
  K.update(0.6); // the polled check
  assert.deepEqual(T.state('kaufen'), { st: 'erledigt', i: 2 });
  e = K.tasks.list()[0];
  assert.equal(e.status, 'erledigt');
  assert.equal(e.text, 'Die Pflanzen sind daheim.');
  assert.equal(e.target, null);
  assert.deepEqual(seen, [
    'start kaufen',
    'step Such die Pflanzen aus.',
    'step Lad sie ins Auto.',
    'done Pflanzen bei Kammbach kaufen',
  ]);
  globalThis.__geladen = false;
});

test('the state is saved and comes back after a reload; broken saved states are dropped', async () => {
  const store = new Map();
  const a = await fresh(store);
  a.T.define(DEF());
  a.T.start('kaufen');
  a.T.advance('kaufen');
  const b = await fresh(store);
  b.T.define(DEF());
  assert.deepEqual(b.T.state('kaufen'), { st: 'läuft', i: 1 });
  assert.equal(b.K.tasks.list()[0].text, 'Such die Pflanzen aus.');
  store.set(
    'pav-tasks-v1',
    JSON.stringify({ v: 1, t: { kaufen: { st: 'kaputt', i: 1 }, x: { st: 'läuft', i: -3 }, y: null } })
  );
  const c = await fresh(store);
  c.T.define(DEF());
  assert.equal(c.T.state('kaufen'), null);
  assert.equal(c.T.state('x'), null);
});

test('start by code once; reset; a broken condition counts as not met', async () => {
  const { K, T } = await fresh();
  T.define({
    id: 'probe',
    title: 'Probe',
    steps: [
      {
        text: 'a',
        on: 'talk',
        when: () => {
          throw new Error('x');
        },
      },
    ],
  });
  assert.equal(T.start('probe'), true);
  assert.equal(T.start('probe'), false);
  K.emit('talk', { who: 'hubert' });
  assert.equal(T.state('probe').i, 0);
  T.reset('probe');
  assert.equal(T.state('probe'), null);
});
