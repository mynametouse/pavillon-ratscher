// Collects every fixed spoken line of the mode „Grenzland“ into tools/voices/grenzland_linien.json for tools/voices/grenzland_record.py,
// which records them with a natural Edge voice per person on GitHub Actions (.github/workflows/stimmen_grenzland.yml). The rules are the
// game's own (GLSTIMMEN.sammeln in viz3/src/grenzland/gl_stimmen.js): the mission talks, every module's own linien(), the street of 1989,
// the radio's presenters. To reach the linien() of modules that need the scene (gl_fahndung.js, gl_reaktion.js, …), the modules of
// viz3/src/grenzland are copied into a temporary folder with every import from outside the folder replaced by a stub that answers
// anything, and loaded one by one in a child process with a time limit; if that fails, only the pure data modules are read.
// (feat/grenzland-partner: GLPARTNER.linien() and GLPDATA.linien() of gl_partner.js / gl_partner_data.js – the talk with the other of
// the two, both voices – are found like every other module's; the data module also in the fallback of the pure data modules.)
// Run again after a merge (new linien() of the other agents) and push the changed JSON – the workflow records what is new:
//   node tools/voices/grenzland_linien.mjs           writes the JSON, prints what it found
//   node tools/voices/grenzland_linien.mjs --check   exit 1 when the JSON is not up to date
//   GL_SRC=<a viz3/src elsewhere> … --out <file>      the lines of another checkout (e.g. the branches of a round put together)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.GL_SRC ? path.resolve(process.env.GL_SRC) : path.join(here, '..', '..', 'viz3', 'src');
const GLD = path.join(SRC, 'grenzland');
const OUT = process.argv.includes('--out') ? path.resolve(process.argv[process.argv.indexOf('--out') + 1]) : path.join(here, 'grenzland_linien.json');

// ---------------- a stub that answers anything (the scene's modules, the page) ----------------
function deep(name) {
  const cache = Object.create(null);
  const f = function () {};
  return new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return hint => (hint === 'number' ? 0 : '');
      if (k === Symbol.iterator) return function* () {};
      if (k === 'then' || typeof k === 'symbol') return undefined;
      if (k === 'toString' || k === 'valueOf' || k === 'toJSON') return () => '';
      if (k === 'length') return 0;
      if (k === 'prototype') return t.prototype;
      if (!(k in cache)) cache[k] = deep(name + '.' + k);
      return cache[k];
    },
    set(t, k, v) {
      cache[k] = v;
      return true;
    },
    has: () => false,
    apply: () => deep(name + '()'),
    construct: () => deep('new ' + name),
  });
}
// the imports from outside the folder become stubs; the folder's own stay
function rewrite(src) {
  return src
    .replace(
      /^import\s+(?:([\w$]+)\s*,?\s*)?(?:\*\s+as\s+([\w$]+)|\{([\s\S]*?)\})?\s*from\s*(['"])([^'"]+)\4\s*;?/gm,
      (all, def, ns, names, q, spec) => {
        if (spec.startsWith('./')) return all;
        const S = `globalThis.__GLSTUB(${JSON.stringify(spec)})`;
        const out = [];
        if (def) out.push(`const ${def} = ${S};`);
        if (ns) out.push(`const ${ns} = ${S};`);
        if (names) out.push(`const { ${names.replace(/\s+as\s+/g, ': ')} } = ${S};`);
        return out.join(' ');
      }
    )
    .replace(/^import\s+(['"])([^'"]+)\1\s*;?/gm, (all, q, spec) => (spec.startsWith('./') ? all : ''));
}
// a literal object of a module's source: const NAME = { … }; (strings only – read, never run as code of the game)
function literal(src, name) {
  const i = src.indexOf('const ' + name + ' = {');
  if (i < 0) return null;
  let j = src.indexOf('{', i),
    d = 0,
    q = '';
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (q) {
      if (c === '\\') k++;
      else if (c === q) q = '';
    } else if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '{') d++;
    else if (c === '}' && --d === 0) {
      try {
        return Function('"use strict"; return (' + src.slice(j, k + 1) + ');')();
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}
// the police radio of gl_fahndung.js (FUNK), until GLFAHNDUNG.linien() offers it
function funk() {
  const F = literal(fs.readFileSync(path.join(GLD, 'gl_fahndung.js'), 'utf8'), 'FUNK') || {};
  const out = [];
  for (const [k, L] of Object.entries(F))
    if (Array.isArray(L)) for (const t of L) if (typeof t === 'string') out.push(['funk', t, 2, 'FUNK.' + k]);
  return out;
}
// what is known of a speaker: name, gender, age (the cast, the radio's presenters, what a module's line says itself)
function castOf(lines, GLDATA, GLRDATA) {
  const C = {};
  const R = {};
  for (const era of Object.keys((GLRDATA && GLRDATA.SENDER) || {})) for (const s of GLRDATA.SENDER[era]) R[s.id] = s.wer;
  for (const l of lines) {
    if (C[l.who]) continue;
    const k = l.who.slice(3),
      c = (GLDATA.CAST || {})[k],
      r = k.startsWith('r_') ? R[k.slice(2)] : null,
      v = (c && c.voice) || r || {};
    C[l.who] = { name: (c && c.name) || (r && r.name) || k, g: v.g || '?', age: v.age || 0 };
  }
  return C;
}
function collect(G, mods, how, failed) {
  const extra = mods.some(([n, X]) => n === 'GLFAHNDUNG' && X && typeof X.linien === 'function') ? [] : funk();
  const lines = G.GLSTIMMEN.sammeln({
    GLDATA: G.GLDATA,
    GLMDATA: G.GLMDATA,
    GL89DATA: G.GL89DATA,
    GLRDATA: G.GLRDATA,
    mods,
    extra,
  });
  const linien = mods.filter(([n, X]) => n !== 'GLSTIMMEN' && X && typeof X.linien === 'function').map(([n]) => n);
  return { how, linien, failed, cast: castOf(lines, G.GLDATA, G.GLRDATA), lines };
}

// ---------------- the child: every module of the folder, stubbed ----------------
async function child(dir, res) {
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', () => {});
  const g = globalThis;
  g.window = g;
  g.document = deep('document');
  for (const k of ['addEventListener', 'removeEventListener', 'dispatchEvent']) g[k] = () => {};
  g.location = { href: 'https://example.invalid/', search: '', pathname: '/', hash: '', origin: 'https://example.invalid' };
  g.history = deep('history');
  g.localStorage = g.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
  g.requestAnimationFrame = () => 0;
  g.cancelAnimationFrame = () => {};
  g.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  g.getComputedStyle = () => deep('style');
  g.innerWidth = 1280;
  g.innerHeight = 720;
  g.devicePixelRatio = 1;
  for (const k of ['Image', 'HTMLElement', 'HTMLCanvasElement', 'AudioContext', 'Worker']) g[k] = class {};
  g.__GLSTUB = spec => deep(spec);
  const order = fs
    .readFileSync(path.join(SRC, 'modules.txt'), 'utf8')
    .split('\n')
    .map(l => l.split('#')[0].trim())
    .filter(r => r.startsWith('grenzland/'))
    .map(r => r.slice(10));
  for (const f of fs.readdirSync(dir).sort()) if (/^gl_.*\.js$/.test(f) && !order.includes(f)) order.push(f);
  const G = {},
    mods = [],
    failed = [];
  for (const f of order) {
    if (!fs.existsSync(path.join(dir, f))) continue;
    try {
      const m = await import(pathToFileURL(path.join(dir, f)).href);
      for (const [k, v] of Object.entries(m)) {
        G[k] = v;
        mods.push([k, v]);
      }
    } catch (e) {
      failed.push(f + ': ' + String((e && e.message) || e).slice(0, 120));
    }
  }
  if (!G.GLSTIMMEN || !G.GLMDATA) throw new Error('core modules failed: ' + failed.join('; '));
  fs.writeFileSync(res, JSON.stringify(collect(G, mods, 'all modules (stubbed)', failed)));
}
if (process.argv[2] === '--child') {
  await child(process.argv[3], process.argv[4]);
  process.exit(0);
}

// ---------------- the pure data modules only (the fallback) ----------------
async function pure() {
  const G = {},
    mods = [];
  const files = ['gl_data.js', 'gl_mission_data.js', 'gl_1989_data.js', 'gl_radio_data.js', 'gl_stimmen.js'].concat(
    fs.readdirSync(GLD).filter(f => /^gl_.*_data\.js$/.test(f))
  );
  const failed = [];
  for (const f of [...new Set(files)])
    try {
      const m = await import(pathToFileURL(path.join(GLD, f)).href);
      for (const [k, v] of Object.entries(m)) {
        G[k] = v;
        mods.push([k, v]);
      }
    } catch (e) {
      failed.push(f + ': ' + String((e && e.message) || e).slice(0, 120));
    }
  return collect(G, mods, 'pure data modules only', failed);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-linien-'));
let got = null;
try {
  for (const f of fs.readdirSync(GLD))
    if (f.endsWith('.js')) fs.writeFileSync(path.join(tmp, f), rewrite(fs.readFileSync(path.join(GLD, f), 'utf8')));
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}\n');
  const res = path.join(tmp, 'out.json');
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--child', tmp, res], {
    timeout: 90000,
    encoding: 'utf8',
  });
  if (r.status === 0 && fs.existsSync(res)) got = JSON.parse(fs.readFileSync(res, 'utf8'));
  else console.warn('the stubbed load failed – pure data modules only:', (r.stderr || r.error || '').toString().slice(0, 400));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (!got) got = await pure();

const doc = {
  note: 'tools/voices/grenzland_linien.mjs – every fixed spoken line of Grenzland; recorded by tools/voices/grenzland_record.py',
  cast: got.cast,
  lines: got.lines,
};
const text = JSON.stringify(doc, null, 1) + '\n';
const prio = got.lines.reduce((o, l) => ((o[l.prio] = (o[l.prio] || 0) + 1), o), {});
const chars = got.lines.reduce((s, l) => s + l.text.length, 0);
console.log(
  `${got.lines.length} lines (prio ${JSON.stringify(prio)}), ${Object.keys(got.cast).length} speakers, ${Math.round(chars / 1000)}k chars ≈ ${Math.round(chars / 14 / 60)} min · ${got.how}`
);
console.log('linien() of:', got.linien.join(', ') || '–');
if (got.failed.length) console.log('not loaded:', got.failed.join(' | '));
if (process.argv.includes('--check')) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old !== text) {
    console.log('grenzland_linien.json is not up to date – run: node tools/voices/grenzland_linien.mjs');
    process.exit(1);
  }
  console.log('grenzland_linien.json is up to date');
} else fs.writeFileSync(OUT, text);
