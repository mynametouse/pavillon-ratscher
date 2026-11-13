// ===================== feat/grenzland: the shared state of the mode „Grenzland“ (GL) – who plays, money, missions, the wanted level, saving =====================
// Falko, 13.11.2026: a variant with „GTA 6 Vibes“ fitting the region and the map – the story „Grenzland“ (smuggling towards Bavaria, flashbacks
// to 1989), Falko and Sarah as the two one switches between, the tone of GTA, adults only (docs/plans/plan_grenzland.md).
// Every Grenzland module reads and writes this one object. A world of its own like the zombie night: its own save 'pav-grenzland-v1'
// (core/save.js), nothing runs before the scene starts, „Beenden“ puts everything back. Events go through KERN with the prefix
// 'grenzland:' (start, stop, wer, geld, tat, sterne, erwischt, mission, schritt, era, sms, radio …).
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { GLLOGIK } from './gl_logik.js';
export const GL = (() => {
  const KEY = 'pav-grenzland-v1';
  const fresh = () => ({
    v: 1,
    on: false,
    wer: 'm', // who the player is right now: 'm' Falko, 'f' Sarah (the codes of game/avatar.js)
    geld: 120, // euros
    m: {}, // missions: id → { st: 'offen' | 'läuft' | 'erledigt', i: step, n: tries }
    cur: '', // the mission that runs
    kap: 1,
    tage: 0,
    stats: { taten: 0, erwischt: 0, entkommen: 0, km: 0, kegel: 0, fische: 0, best: 0 },
    inv: {}, // small things: paket, karte1, karte2, fotos, boeller, karpfen, milchreis, worcester, koeder_mais …
    sms: [], // the phone: [{ von, text, t, neu }]
    feed: [], // the regional feed: [{ wer, text, t }]
    radio: 0, // the station (0: off)
    tank: 0.4, // the moped's tank (litres)
    pos: [], // where the player last stood outdoors: x, y, feet, yaw (a reload goes on there)
    fig0: '', // the figure chosen before the mode began (put back at the end)
    t0: 0,
    e0alt: 0, // the game's calendar before the mode began (time/daynight.js DN.e0; put back at the end)
    e0neu: 0, // the story's calendar: its first day is Friday, 4 September 2026 (0: not set yet)
  });
  const S = Object.assign(fresh(), {
    era: 'heute', // 'heute' | '1989' (the flashback: grenzland/gl_1989.js)
    W: GLLOGIK.fresh(), // the wanted level (not saved: a reload starts calm)
    dirty: false,
    saveT: 0,
  });
  const SAVED = [
    'v',
    'on',
    'wer',
    'geld',
    'm',
    'cur',
    'kap',
    'tage',
    'stats',
    'inv',
    'sms',
    'feed',
    'radio',
    'tank',
    'pos',
    'fig0',
    't0',
    'e0alt',
    'e0neu',
  ];
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  function load() {
    const v = SAVE.get(KEY);
    if (!obj(v) || v.v !== 1) return false;
    const f = fresh();
    for (const k of SAVED) {
      const a = v[k],
        b = f[k];
      S[k] =
        a !== undefined && typeof a === typeof b && Array.isArray(a) === Array.isArray(b) && (a !== null || b === null)
          ? a
          : b;
    }
    if (S.wer !== 'm' && S.wer !== 'f') S.wer = f.wer;
    for (const k of ['geld', 'kap', 'tage', 'radio', 'tank', 't0', 'e0alt', 'e0neu'])
      if (!Number.isFinite(S[k])) S[k] = f[k];
    S.geld = Math.max(0, Math.round(S.geld));
    if (!obj(S.stats)) S.stats = f.stats;
    for (const k of Object.keys(f.stats)) if (!Number.isFinite(S.stats[k])) S.stats[k] = 0;
    if (!obj(S.m)) S.m = {};
    for (const [id, e] of Object.entries(S.m))
      if (!obj(e) || !['offen', 'läuft', 'erledigt'].includes(e.st) || !Number.isInteger(e.i) || e.i < 0)
        delete S.m[id];
    if (!obj(S.inv)) S.inv = {};
    for (const k of Object.keys(S.inv)) if (!(S.inv[k] > 0)) delete S.inv[k];
    S.sms = S.sms.filter(q => obj(q) && typeof q.text === 'string' && typeof q.von === 'string').slice(-40);
    S.feed = S.feed.filter(q => obj(q) && typeof q.text === 'string' && typeof q.wer === 'string').slice(-40);
    if (S.pos.length !== 4 || !S.pos.every(q => Number.isFinite(q) && Math.abs(q) < 1e5)) S.pos = [];
    if (typeof S.cur !== 'string') S.cur = '';
    return true;
  }
  function save(now) {
    S.dirty = true;
    if (!now) return;
    S.dirty = false;
    S.saveT = 0;
    const o = {};
    for (const k of SAVED) o[k] = S[k];
    SAVE.set(KEY, o);
  }
  function reset() {
    Object.assign(S, fresh(), { era: 'heute', W: GLLOGIK.fresh(), dirty: false });
    SAVE.set(KEY, null);
  }
  // saved a few seconds after a change (grenzland/gl_modus.js calls this every frame)
  function tick(dt) {
    if (!S.dirty) return;
    S.saveT += dt;
    if (S.saveT > 3) save(true);
  }
  const emit = (n, d) => KERN.emit('grenzland:' + n, d);
  // ---- money ----
  function pay(n, why) {
    n = Math.round(n);
    if (!(n > 0) || S.geld < n) return false;
    S.geld -= n;
    save();
    emit('geld', { d: -n, geld: S.geld, why: why || '' });
    return true;
  }
  function earn(n, why) {
    n = Math.round(n);
    if (!(n > 0)) return 0;
    S.geld += n;
    save();
    emit('geld', { d: n, geld: S.geld, why: why || '' });
    return n;
  }
  // ---- small things ----
  const has = (k, n = 1) => (S.inv[k] || 0) >= n;
  function add(k, n = 1) {
    S.inv[k] = (S.inv[k] || 0) + n;
    save();
    emit('ding', { k, n: S.inv[k] });
    return S.inv[k];
  }
  function use(k, n = 1) {
    if (!has(k, n)) return false;
    S.inv[k] -= n;
    if (S.inv[k] <= 0) delete S.inv[k];
    save();
    emit('ding', { k, n: S.inv[k] || 0 });
    return true;
  }
  // the name of the one who plays and of the other
  const NAMES = { m: 'Falko', f: 'Sarah' };
  const name = k => NAMES[k || S.wer];
  const other = () => (S.wer === 'm' ? 'f' : 'm');
  // the money's name: euros today, marks of the GDR in 1989
  const waehrung = () => (S.era === '1989' ? 'Mark' : '€');
  return Object.assign(S, {
    KEY,
    load,
    save,
    reset,
    tick,
    emit,
    pay,
    earn,
    has,
    add,
    use,
    name,
    other,
    NAMES,
    waehrung,
  });
})();
window.GLSTATE = GL;
