// ===================== feat/zombie: the shared state of the zombie night (Z) – mode, player, supplies, entities, saving =====================
// Every zombie module reads and writes this one object: whether the night mode is on and in which part of the day it is, the player's
// health, stamina and hunger, the supplies in the backpack, the zombies and allies (entities, written by zombie/z_horde.js and
// zombie/z_bund.js), the houses (barricades, searched containers – zombie/z_haus.js), the statistics. Saved as 'pav-zombie-v1' (core/save.js)
// a few seconds after a change. Events go through KERN with the prefix 'zombie:' (start, stop, phase, siren, turn, kill, hurt, dead,
// night, loot, barricade …).
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { ZDATA } from './z_data.js';
export const Z = (() => {
  const KEY = 'pav-zombie-v1';
  const fresh = () => ({
    v: 1,
    on: false,
    night: 0, // nights begun
    survived: 0,
    deaths: 0,
    kills: 0,
    cuts: 0,
    runover: 0,
    hp: 100,
    stam: 100,
    food: 80, // 0 … 100, falls slowly; at 0 health falls
    sup: { konserve: 1, wasser: 1 },
    weap: {}, // id → { cond 0…100, fuel (l), ammo (loaded shells) }
    houses: {}, // building id → { bar: { opening id: hp }, looted: [container ids], lurk: n }
    clan: { name: '', members: [] },
    t0: 0, // the game minute the night mode began
    diff: 'normal', // how hard: leicht, normal, schwer (ZDATA.DIFF)
    pos: [], // where the player last stood outdoors: x, y, feet, yaw (a reload goes on there – zombie/z_modus.js)
  });
  const S = Object.assign(fresh(), { phase: 'aus', ents: [], dirty: false, saveT: 0, noises: [] });
  // what is saved (the entities are not: the night begins anew from the siren)
  const SAVED = [
    'v',
    'on',
    'night',
    'survived',
    'deaths',
    'kills',
    'cuts',
    'runover',
    'hp',
    'stam',
    'food',
    'sup',
    'weap',
    'houses',
    'clan',
    't0',
    'diff',
    'pos',
  ];
  function load() {
    const v = SAVE.get(KEY);
    if (!v || v.v !== 1) return false;
    const f = fresh();
    for (const k of SAVED) S[k] = v[k] !== undefined && typeof v[k] === typeof f[k] ? v[k] : f[k];
    for (const k of ['hp', 'stam', 'food']) if (!Number.isFinite(S[k])) S[k] = f[k];
    if (!ZDATA.DIFF[S.diff]) S.diff = f.diff;
    if (!Array.isArray(S.pos) || S.pos.length !== 4 || !S.pos.every(q => Number.isFinite(q) && Math.abs(q) < 1e5))
      S.pos = [];
    if (!S.sup || typeof S.sup !== 'object') S.sup = {};
    for (const k of Object.keys(S.sup)) if (!ZDATA.ITEMS[k] || !(S.sup[k] > 0)) delete S.sup[k];
    return true;
  }
  function save(now) {
    S.dirty = true;
    if (!now) return;
    S.dirty = false;
    const o = {};
    for (const k of SAVED) o[k] = S[k];
    SAVE.set(KEY, o);
  }
  function reset() {
    // (how hard one plays stays: it is a choice, not a state of the night)
    const diff = S.diff;
    Object.assign(S, fresh(), { phase: 'aus', ents: [], noises: [], diff: ZDATA.DIFF[diff] ? diff : 'normal' });
    SAVE.set(KEY, null);
  }
  const emit = (n, d) => KERN.emit('zombie:' + n, d);
  // ---- supplies ----
  const has = (k, n = 1) => (S.sup[k] || 0) >= n;
  function add(k, n = 1) {
    if (!ZDATA.ITEMS[k] || !(n > 0)) return 0;
    S.sup[k] = (S.sup[k] || 0) + n;
    save();
    emit('loot', { k, n });
    return n;
  }
  function use(k, n = 1) {
    if (!has(k, n)) return false;
    S.sup[k] -= n;
    if (S.sup[k] <= 0) delete S.sup[k];
    save();
    return true;
  }
  // ---- the player's body ----
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hurt(dmg, from) {
    if (!S.on || S.hp <= 0 || !(dmg > 0)) return 0;
    S.hp = clamp(S.hp - dmg, 0, 100);
    save();
    emit('hurt', { dmg, from: from || null, hp: S.hp });
    if (S.hp <= 0) emit('dead', { from: from || null });
    return dmg;
  }
  function heal(n) {
    S.hp = clamp(S.hp + n, 0, 100);
    save();
  }
  function eat(k) {
    const it = ZDATA.ITEMS[k];
    if (!it || !(it.food || it.drink || it.heal) || !use(k)) return false;
    if (it.food) S.food = clamp(S.food + it.food, 0, 100);
    if (it.drink) S.food = clamp(S.food + it.drink * 0.4, 0, 100);
    if (it.heal) S.hp = clamp(S.hp + it.heal, 0, 100);
    if (it.drink) S.stam = clamp(S.stam + 30, 0, 100);
    save();
    emit('eat', { k });
    return true;
  }
  // stamina: spent by swings and sprinting, comes back when calm (less when hungry)
  function tire(n) {
    if (S.stam < n) return false;
    S.stam -= n;
    return true;
  }
  function body(dt, run) {
    const hungry = S.food < 15;
    S.stam = clamp(S.stam + (run ? -9 : hungry ? 6 : 14) * dt, 0, 100);
    S.food = clamp(S.food - dt * 0.03, 0, 100); // ~55 real minutes from full to empty
    if (S.food <= 0) S.hp = clamp(S.hp - dt * 0.25, 0, 100);
  }
  // ---- noise: what the zombies hear (x, y, loudness in metres of reach, seconds it lasts) ----
  function noise(x, y, r, s = 1.5, what = '') {
    S.noises.push({ x, y, r, t: s, what });
    if (S.noises.length > 24) S.noises.shift();
  }
  function noiseTick(dt) {
    for (let i = S.noises.length - 1; i >= 0; i--) if ((S.noises[i].t -= dt) <= 0) S.noises.splice(i, 1);
  }
  // ---- houses ----
  const house = id => S.houses[id] || (S.houses[id] = { bar: {}, looted: [], lurk: 0 });
  // a few seconds after a change, saved (not every frame)
  function tick(dt) {
    S.saveT += dt;
    if (S.dirty && S.saveT > 3) {
      S.saveT = 0;
      save(true);
    }
  }
  Object.assign(S, {
    KEY,
    load,
    save,
    reset,
    emit,
    has,
    add,
    use,
    hurt,
    heal,
    eat,
    tire,
    body,
    noise,
    noiseTick,
    house,
    tick,
  });
  return S;
})();
window.ZSTATE = Z;
