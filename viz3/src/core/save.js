// @ts-check
// ===================== SAVE: everything this browser keeps between visits goes through here (refactor phase 0, 22.10.2026) =====================
// One registry of the saved keys (owner, kind, default, check), reads that never throw and never hand out a broken value (lesson V16b4:
// one saved vehicle position stopped every start), writes that survive a full or blocked storage (Safari private mode, quota), small
// migrations on read, and hooks for tests and bug reports (SAVE.keys, SAVE.dump, SAVE.load, SAVE.problems). New saved values only through SAVE.
//   const K = SAVE.key('pav-x-v1', { owner: 'x', kind: 'json', def: null, check: s => s && s.v === 1 });
//   SAVE.get(K) → value or default · SAVE.set(K, v) → true if kept · SAVE.del(K) · SAVE.once('pav-v17') → true on the first visit only
// Kinds: 'json' (any JSON value), 'text' (a string), 'num' (a finite number), 'flag' ('1' = true). The stored format is the same as before
// SAVE existed (plain JSON or plain text), so saved states of earlier versions keep working.
/**
 * How a saved key is stored and checked (SAVE.key).
 * @typedef {object} SaveSpec
 * @property {string} [owner]  feature or module the value belongs to (bug reports, SAVE.keys)
 * @property {'json' | 'text' | 'num' | 'flag'} [kind]  stored format (default 'json')
 * @property {any} [def]  value when nothing – or something broken – is stored
 * @property {((v: any) => boolean) | null} [check]  shape check after reading; false: the default is used instead
 * @property {((v: any) => any) | null} [migrate]  updates an older stored shape (before the check)
 * @property {boolean} [secret]  never in SAVE.dump (keys, tokens)
 */
/** type-checked (// @ts-check above; tools/check/tsconfig.json, run by tools/check.sh) */
export const SAVE = (() => {
  /** @type {Map<string, SaveSpec>} */
  const REG = new Map();
  /** @type {{ key: string, what: string, msg: string }[]} */
  const problems = [];
  /** @type {Map<string, string>} */
  const mem = new Map(); // fallback when the browser keeps nothing: values live for this visit only
  /** @type {Storage | null} */
  let ls = null;
  try {
    ls = window.localStorage;
    ls.setItem('__pav_probe', '1');
    ls.removeItem('__pav_probe');
  } catch (e) {
    ls = null;
  }
  const note = (key, what, e) => {
    problems.push({ key, what, msg: e ? String((e && e.message) || e).slice(0, 120) : '' });
    if (problems.length > 40) problems.shift();
    try {
      console.warn('SAVE', what, key, e || '');
    } catch (_) {}
  };
  /** @param {string} key  @returns {string | null} the stored text */
  function raw(key) {
    // written in this visit: the value as written – also when the browser refused to keep it (storage full), so the page carries on with it
    if (mem.has(key)) return mem.get(key);
    try {
      if (ls) return ls.getItem(key);
    } catch (e) {
      note(key, 'read', e);
    }
    return null;
  }
  /** @param {string} key  @param {string} s  @returns {boolean} true if the browser keeps it (not only for this visit) */
  function rawSet(key, s) {
    mem.set(key, s);
    try {
      if (ls) {
        ls.setItem(key, s);
        return true;
      }
    } catch (e) {
      note(key, 'write', e);
    }
    return false;
  }
  /** @param {string} key */
  function rawDel(key) {
    mem.delete(key);
    try {
      if (ls) ls.removeItem(key);
    } catch (e) {
      note(key, 'delete', e);
    }
  }
  const clone = v => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);
  /** @type {(key: string) => SaveSpec} */
  const spec = key => REG.get(key) || { kind: 'text', def: null };
  // register a key: { owner, kind, def, check(value) → bool, migrate(value) → value, secret }
  /** @param {string} k  @param {SaveSpec} [s]  @returns {string} the key */
  function key(k, s = {}) {
    REG.set(k, Object.assign({ owner: '?', kind: 'json', def: null, check: null, migrate: null, secret: false }, s));
    return k;
  }
  /** @param {string} k  @param {SaveSpec} s  @param {string | null} txt */
  function decode(k, s, txt) {
    if (txt == null) return clone(s.def);
    let v;
    if (s.kind === 'json') v = JSON.parse(txt);
    else if (s.kind === 'num') {
      v = +txt;
      if (!Number.isFinite(v)) throw new Error('not a finite number');
    } else if (s.kind === 'flag') v = txt === '1';
    else v = String(txt);
    if (s.migrate) v = s.migrate(v);
    if (s.check && !s.check(v)) throw new Error('unexpected shape');
    return v;
  }
  /** @param {string} k  @returns {any} the stored value, or the default */
  function get(k) {
    const s = spec(k);
    const txt = raw(k);
    try {
      return decode(k, s, txt);
    } catch (e) {
      note(k, 'broken value ignored', e); // the default instead of an exception – the page starts anyway
      return clone(s.def);
    }
  }
  /** @param {SaveSpec} s  @param {any} v  @returns {string | null} */
  function encode(s, v) {
    if (s.kind === 'json') return JSON.stringify(v);
    if (s.kind === 'flag') return v ? '1' : '0';
    if (s.kind === 'num') return Number.isFinite(+v) ? String(+v) : null;
    return v == null ? null : String(v);
  }
  /** @param {string} k  @param {any} v  @returns {boolean} true if kept */
  function set(k, v) {
    const s = spec(k);
    let txt;
    try {
      txt = encode(s, v);
    } catch (e) {
      note(k, 'not storable', e);
      return false;
    }
    if (txt == null) {
      rawDel(k);
      return true;
    }
    return rawSet(k, txt);
  }
  // one-time hints: true on the first visit, then never again
  /** @param {string} k  @returns {boolean} */
  function once(k) {
    if (!REG.has(k)) key(k, { owner: 'hint', kind: 'flag', def: false });
    if (get(k)) return false;
    set(k, true);
    return true;
  }
  return {
    key,
    get,
    set,
    del: rawDel,
    once,
    raw,
    setRaw: (k, v) => rawSet(k, String(v)), // for modules that keep their own text format
    problems,
    persistent: () => !!ls,
    keys: () => [...REG.entries()].map(([k, s]) => ({ key: k, owner: s.owner, kind: s.kind, secret: !!s.secret })),
    // the saved state of this browser without secrets (tests, bug reports)
    dump: () => Object.fromEntries([...REG.entries()].filter(([, s]) => !s.secret).map(([k]) => [k, raw(k)])),
    // write raw values (tests: old or broken saved states); null removes the key
    load: obj => {
      for (const [k, v] of Object.entries(obj || {})) v == null ? rawDel(k) : rawSet(k, String(v));
    },
  };
})();
window.SAVE = SAVE;
// ---- the saved keys of the app (owner, kind, default); checks for the shape, details stay with the owner module ----
{
  const obj = v => v === null || (typeof v === 'object' && !Array.isArray(v));
  const oneOf =
    (...a) =>
    v =>
      v === null || a.includes(v);
  const K = (k, owner, kind, def, check, extra) => SAVE.key(k, Object.assign({ owner, kind, def, check }, extra || {}));
  K('pav-light2', 'Licht', 'text', null); // auto | night | a fixed time of day
  K('pav-tier', 'Grafikstufe', 'text', null, oneOf('hoch', 'mittel', 'schnell'));
  K('pav-texlevel', 'Laden: halbe Texturen nach Absturz', 'num', 1, v => v >= 1 && v <= 4);
  K('pav-loadlog', 'Ladeprotokoll', 'json', null, obj);
  K('pav-view', 'Kamera: Schulter (3) oder Augen (1)', 'text', null, oneOf('3', '1'));
  K('pav-sound', 'Ton an/aus', 'text', null, oneOf('1', '0'));
  K('pav-fig', 'Figur', 'text', null);
  K('pav-lock', 'Maus fangen', 'text', null, oneOf('1', '0'));
  K('pav-wpcard', 'Werkstück-Karte', 'text', null, oneOf('1', '0'));
  K('pav-clean', 'Freie Sicht (Anzeigen aus)', 'text', null, oneOf('1', '0'));
  K('pav-variant', 'Entwurf A/B', 'text', null, oneOf('A', 'B'));
  K('pav-style', 'Einrichtungsstil', 'json', null, obj);
  K('pav-facade', 'Fassade', 'json', null, obj);
  K('pav-layout', 'Möbel und Lage', 'json', null, obj);
  K('pav-site', 'Lageplan (eigener Stand)', 'json', null, obj);
  K('pav-plan-ts', 'Zeit des veröffentlichten Plans', 'text', null);
  K('pav-gh-token', 'GitHub-Schlüssel zum Veröffentlichen', 'text', null, null, { secret: true });
  K('pav-clock-v1', 'Spielzeit', 'json', null, obj);
  K('pav-dn-v1', 'Tag und Nacht', 'json', null, obj);
  K('pav-quests-v1', 'Aufgaben', 'json', null, obj);
  K('pav-gear-v1', 'Schutzausrüstung', 'json', null, obj);
  // the preview of 22.10.2026 (23:09–23:45) called the neighbour east Bernd: workpieces given to him there come back to Ronald
  // (werk/werk.js does the same when it loads)
  K('pav-werk-v1', 'Werkstatt', 'json', null, obj, {
    migrate: s => {
      if (s && Array.isArray(s.list)) for (const o of s.list) if (o && o.where === 'bernd') o.where = 'ronald';
      return s;
    },
  });
  K('pav-holz-v1', 'Holz: Stämme, Bretter, Trocknen', 'json', null, obj);
  K('pav-fell-v1', 'Fällen', 'json', null, obj);
  K('pav-veh-v1', 'Fahrzeuge', 'json', {}, obj);
  K('pav-trailer-v1', 'Anhänger', 'json', null, obj);
  K('pav-dorf-v1', 'Dorfleben: Aufgabe Skatabend, Besuche, Kartenspiel', 'json', null, obj); // feat/dorf (dorf/dorf.js)
  K('pav-trees-v1', 'Umgefahrene Bäume', 'json', null, obj); // world/treehit.js: { v: 1, t: [[x, y, azimuth°, angle], …] }
  for (const h of [
    'pav-v14',
    'pav-v15',
    'pav-v15b',
    'pav-v16a',
    'pav-v16b',
    'pav-v16c',
    'pav-v16c2',
    'pav-v16d',
    'pav-v16e',
  ])
    K(h, 'Hinweis „Neu“ einmal gezeigt', 'flag', false);
}
