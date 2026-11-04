// Unit test of feat/zombie (viz3/src/zombie/*.js) without a browser: no module may give its state object S a function under the name of
// one of its own fields. The modules end with Object.assign(S, { fn, … }) – a function named like a field (S.kick, S.prevPick …) silently
// replaces that field: twice it broke the whole horde (every zombie went for a function and stood at NaN). Reads the sources only.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'zombie');
// names that are meant to be both (data handed out as they are)
const ALLOWED = new Set(['MODELS', 'CUTS', 'WHO', 'byKey', 'onRevive', 'heart']);

// the top-level keys of `const S = { … }` and every `S.name =` assignment of a module
function fields(src) {
  const out = new Set();
  const i = src.search(/const S = (Object\.assign\(fresh\(\), )?\{/);
  if (i >= 0) {
    const j = src.indexOf('{', i);
    let d = 0,
      k = j;
    for (; k < src.length; k++) {
      if (src[k] === '{') d++;
      else if (src[k] === '}' && !--d) break;
    }
    let depth = 0,
      cur = '';
    const take = () => {
      const m = cur.trim().match(/^([A-Za-z_$][\w$]*)\s*:/);
      if (m) out.add(m[1]);
      cur = '';
    };
    for (const ch of src.slice(j + 1, k)) {
      if ('{[('.includes(ch)) depth++;
      if ('}])'.includes(ch)) depth--;
      if (ch === ',' && depth === 0) take();
      else cur += ch;
    }
    take();
  }
  for (const m of src.matchAll(/\bS\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) out.add(m[1]);
  return out;
}
// the names given out at the end: Object.assign(S, { a, b: c, … })
function given(src) {
  const out = new Set();
  for (const m of src.matchAll(/Object\.assign\(S, \{([\s\S]*?)\}\)/g))
    for (const p of m[1].split(',')) {
      const n = p.trim().split(':')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) out.add(n);
    }
  return out;
}

test('no zombie module hands out a function under the name of one of its state fields', () => {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 10, 'the zombie modules are there');
  const bad = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    const F = fields(src);
    for (const n of given(src)) if (F.has(n) && !ALLOWED.has(n)) bad.push(f + ': ' + n);
  }
  assert.deepEqual(bad, []);
});

test('the checker finds such a clash', () => {
  const src =
    'const S = { kick: 0, t: 1 };\nfunction kick() {}\nS.prevPick = null;\nconst prevPick = 1;\nObject.assign(S, { kick, prevPick, go });';
  const F = fields(src),
    clash = [...given(src)].filter(n => F.has(n));
  assert.deepEqual(clash.sort(), ['kick', 'prevPick']);
});
