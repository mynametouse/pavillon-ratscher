// Unit tests of feat/mehrspieler (viz3/src/netz/) without a browser: room codes and names, the avatar's plan (always a valid one, the
// clothes only for the people of the streets), the checks of what another browser sends (NaN, huge numbers, odd kinds → null), the
// rounds of hide and seek (counting, seeking, found, time up, the seeker gone, on the wire and back), and the modules' state objects (no
// function under the name of a field – the trap of zombie/*.js). Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { NETZLOGIK as L } from '../../src/netz/netz_logik.js';

test('room codes: six letters of the alphabet without look-alikes; clean() keeps what a code can be', () => {
  for (let i = 0; i < 200; i++) {
    const c = L.newCode();
    assert.match(c, /^[A-HJ-NP-Z2-9]{6}$/);
  }
  assert.equal(L.clean(' kl-oss 7 '), 'KLOSS7');
  assert.equal(L.clean('abcdefghijk'), 'ABCDEFGH');
  assert.equal(L.clean(null), '');
});

test('names: no angle brackets or control characters, one space, at most 20 letters', () => {
  assert.equal(L.cleanName('  <b>Sa\u0007rah</b>  '), 'bSarah/b');
  assert.equal(L.cleanName('Ein   sehr    langer Name der nicht passt'), 'Ein sehr langer Name');
  assert.equal(L.cleanName(undefined), '');
});

test('the avatar plan: anything becomes a valid plan; the moustache only for men; clothes only for the people of the streets', () => {
  const d = L.avClean(null);
  assert.equal(d.b, 'm');
  assert.deepEqual(L.avClean({ b: 'hubert', o: 99, u: -1, s: 1.5, h: 'x', c: 7 }), {
    b: 'm',
    o: 0,
    om: 0,
    u: 0,
    um: 0,
    s: 0,
    h: 0,
    br: 0,
    ba: 0,
    c: 7,
  });
  assert.equal(L.avClean({ b: 'vk_f07', ba: 1 }).ba, 0, 'no moustache on a woman');
  assert.equal(L.avClean({ b: 'vk_m02', ba: 1 }).ba, 1);
  assert.equal(L.avKleid({ b: 'f' }), null, 'Sarah stays as she is');
  const K = L.avKleid({ b: 'vk_m02', o: 0, om: 1, u: 0, um: 1, s: 1 });
  assert.deepEqual(K.ober, L.OBER[0].rgb);
  assert.equal(K.oberM, 'karo');
  assert.equal(K.unterM, 'stonewash');
  assert.deepEqual(K.schuh, L.SCHUH[1].rgb);
  assert.deepEqual(L.avHut({ b: 'c', h: 2, br: 1 }), { hut: '', brille: '', bart: '' });
  assert.deepEqual(L.avHut({ b: 'vk_m11', h: 1, br: 1, ba: 1 }), {
    hut: 'basecap',
    brille: 'gross',
    bart: 'schnauzer',
  });
  for (let i = 0; i < 300; i++) {
    const r = L.avRandom();
    assert.ok(!L.avBase(r).haupt, 'Zufall picks a person of the streets');
    assert.deepEqual(L.avClean(r), r, 'a random plan is clean already');
  }
  assert.equal(L.avSame({ b: 'm' }, { b: 'm', o: 0 }), true, 'the same plan, written shorter');
  assert.equal(L.avSame({ b: 'm', o: 1 }, { b: 'm', o: 2 }), false);
  assert.equal(L.avDefault('vk_f02').b, 'vk_f02');
  assert.equal(L.avDefault('nobody').b, 'm');
  // every base the avatar can take is a figure game/avatar.js knows (the three, or a FIGS entry with ch)
  const av = readFileSync(new URL('../../src/game/avatar.js', import.meta.url), 'utf8');
  for (const b of L.BASEN) if (!b.haupt) assert.ok(av.includes("['" + b.k + "'"), b.k + ' in game/avatar.js FIGS');
});

test('a greeting: a player id, a name, a clean plan – else null', () => {
  assert.equal(L.hiClean(null), null);
  assert.equal(L.hiClean({ name: 'x' }), null);
  assert.equal(L.hiClean({ pid: 'a b' }), null);
  const h = L.hiClean({ pid: 'nabc123', name: ' <Tom> ', av: { b: 'vk_m20' }, role: 'host', v: 1 });
  assert.equal(h.name, 'Tom');
  assert.equal(h.av.b, 'vk_m20');
  assert.equal(h.role, 'host');
  assert.equal(L.hiClean({ pid: 'nabc123', role: 'admin' }).role, 'gast');
});

test('a state: finite numbers within bounds, known stances, a seat and a vehicle only when whole – else null or left out', () => {
  assert.equal(L.stClean(null), null);
  assert.equal(L.stClean({ x: NaN, y: 0, z: 0, yaw: 0 }), null);
  assert.equal(L.stClean({ x: 1e9, y: 0, z: 0, yaw: 0 }), null);
  assert.equal(L.stClean({ x: '1', y: 0, z: 0, yaw: 0 }), null);
  const s = L.stClean({ x: 3.5, y: -2, z: 0.2, yaw: -90, sp: 1.2, stn: 'fly', inn: 214 });
  assert.equal(s.yaw, 270);
  assert.equal(s.stn, 'stand');
  assert.equal(s.inn, 214);
  assert.equal(s.sit, null);
  assert.equal(s.car, null);
  const t = L.stClean({
    x: 0,
    y: 0,
    z: 0,
    yaw: 10,
    sit: { k: 'sit', x: 1, y: 2, z: 1.2 },
    car: { id: 'tractor', x: 5, y: 6, psi: 1.2, u: 3 },
  });
  assert.deepEqual(t.sit, { k: 'sit', x: 1, y: 2, z: 1.2 });
  assert.deepEqual(t.car, { id: 'tractor', x: 5, y: 6, psi: 1.2, u: 3 });
  assert.equal(L.stClean({ x: 0, y: 0, z: 0, yaw: 0, car: { id: '<script>', x: 1, y: 1, psi: 0 } }).car, null);
  assert.equal(L.stClean({ x: 0, y: 0, z: 0, yaw: 0, sit: { k: 'fly', x: 1, y: 1, z: 1 } }).sit, null);
});

test('events: only the known kinds with their fields', () => {
  assert.equal(L.evClean({ k: 'rm -rf' }), null);
  assert.equal(L.evClean({ k: 'uhr', t: NaN }), null);
  assert.deepEqual(L.evClean({ k: 'uhr', t: 600, rate: 'min', e0: 20500 }), {
    k: 'uhr',
    t: 600,
    rate: 'min',
    e0: 20500,
  });
  assert.equal(L.evClean({ k: 'uhr', t: 600, rate: 'warp' }).rate, null);
  const p = L.evClean({ k: 'ping', x: 1, y: 2, z: 3, art: 'boom', txt: '<Hier!>' });
  assert.equal(p.art, 'hier');
  assert.equal(p.txt, 'Hier!');
  assert.equal(L.evClean({ k: 'geste', art: 'tanzen' }), null);
  assert.deepEqual(L.evClean({ k: 'geste', art: 'winken' }), { k: 'geste', art: 'winken' });
  assert.equal(L.evClean({ k: 'spiel', g: 'xx', d: {} }), null);
  assert.equal(L.evClean({ k: 'x:bus', a: 1 }).a, 1);
  assert.equal(L.evClean({ k: 'x:Bad Name' }), null);
});

test('hide and seek: counting, seeking, found one by one, all found ends it', () => {
  const t0 = 1e6;
  const st = L.vsNew(['a', 'b', 'c'], 'a', t0, { zaehlen: 30, suchen: 300 });
  assert.equal(st.phase, 'zaehlen');
  assert.deepEqual(st.hiders, ['b', 'c']);
  assert.equal(L.vsFound(st, 'b', t0 + 1000), false, 'nobody is found while counting');
  L.vsStep(st, t0 + 30000);
  assert.equal(st.phase, 'suchen');
  assert.equal(L.vsFound(st, 'a', t0 + 40000), false, 'the seeker cannot find himself');
  assert.equal(L.vsFound(st, 'b', t0 + 40000), true);
  assert.equal(L.vsFound(st, 'b', t0 + 41000), false, 'once only');
  assert.equal(st.phase, 'suchen');
  assert.equal(L.vsFound(st, 'c', t0 + 90000), true);
  assert.equal(st.phase, 'ende');
  assert.equal(st.end.alle, true);
  assert.equal(st.end.s, 60);
  assert.equal(L.vsNext(st, ['a', 'b', 'c']), 'b', 'the first found seeks next');
});

test('hide and seek: the time runs out; the seeker leaving ends it; a hider leaving only drops him', () => {
  const t0 = 5e5;
  const st = L.vsNew(['a', 'b', 'c'], 'b', t0, { zaehlen: 10, suchen: 60 });
  L.vsStep(st, t0 + 10000);
  L.vsFound(st, 'a', t0 + 20000);
  L.vsStep(st, t0 + 70001);
  assert.equal(st.phase, 'ende');
  assert.equal(st.end.alle, false);
  const s2 = L.vsNew(['a', 'b', 'c'], 'b', t0);
  L.vsLeave(s2, 'c', t0 + 1000);
  assert.deepEqual(s2.hiders, ['a']);
  assert.equal(s2.phase, 'zaehlen');
  L.vsLeave(s2, 'b', t0 + 2000);
  assert.equal(s2.phase, 'ende');
  assert.equal(s2.end.weg, true);
});

test("hide and seek on the wire: the seconds left, and back in the receiver's own clock", () => {
  const t0 = 2e6;
  const st = L.vsNew(['a', 'b'], 'a', t0, { zaehlen: 30, suchen: 300 });
  const w = L.vsWire(st, t0 + 12000);
  assert.equal(w.rest, 18);
  const other = L.vsFromWire(JSON.parse(JSON.stringify(w)), 777);
  assert.equal(other.phase, 'zaehlen');
  assert.equal(other.tZ, 777 + 18000);
  assert.equal(other.tS, 777 + 18000 + 300000);
  assert.equal(L.vsLeft(other, 777 + 8000), 10);
  L.vsStep(st, t0 + 30000);
  const w2 = L.vsWire(st, t0 + 100000);
  const o2 = L.vsFromWire(w2, 0);
  assert.equal(o2.phase, 'suchen');
  assert.equal(L.vsLeft(o2, 0), 230);
  assert.equal(L.vsFromWire({ v: 1, phase: 'boom', seeker: 'a', hiders: [], found: [] }, 0), null);
  assert.equal(L.vsFromWire({ v: 1, phase: 'suchen', seeker: 'a b', hiders: [], found: [] }, 0), null);
});

test('who can be found: near, about the same height, both outside or in the same house, not in a vehicle', () => {
  const a = { x: 0, y: 0, z: 0, inn: null, car: null };
  assert.equal(L.vsCanFind(a, { x: 2, y: 1, z: 0.5, inn: null }), true);
  assert.equal(L.vsCanFind(a, { x: 2, y: 3, z: 0, inn: null }), false, 'too far');
  assert.equal(L.vsCanFind(a, { x: 1, y: 0, z: 4, inn: null }), false, 'upstairs');
  assert.equal(L.vsCanFind(a, { x: 1, y: 0, z: 0, inn: 214 }), false, 'in a house, the seeker outside');
  assert.equal(L.vsCanFind({ ...a, inn: 214 }, { x: 1, y: 0, z: 0, inn: 214 }), true);
  assert.equal(L.vsCanFind(a, { x: 1, y: 0, z: 0, inn: null, car: { id: 'car' } }), false);
});

// the state objects of netz/*.js: a function assigned under a field's name would silently replace that field
test('no module of netz/ gives its state object S a function under the name of one of its fields', () => {
  const dir = new URL('../../src/netz/', import.meta.url);
  for (const f of readdirSync(dir).filter(n => n.endsWith('.js'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    const m = src.match(/const S = \{([\s\S]*?)\n  \};/) || src.match(/const S = \{([^\n]*)\};/);
    if (!m) continue;
    const fields = new Set([...m[1].matchAll(/(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:/g)].map(q => q[1]));
    const a = src.lastIndexOf('Object.assign(S, {');
    if (a < 0) continue;
    const body = src.slice(a, src.indexOf('})', a));
    const names = [...body.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*[,:]/gm)].map(q => q[1]);
    for (const n of names) assert.ok(!fields.has(n), f + ': S.' + n + ' is a field and a function');
  }
});
