// Lint the app the way it runs: the modules of viz3/src/modules.txt joined into one shared scope (like viz3/build.py),
// then every finding is mapped back to its source file and line.
//   node tools/check/lint.mjs            errors fail (exit 1); unused names are counted, listed with --verbose
//   node tools/check/lint.mjs --verbose  also list the warnings
// Names the page defines on window (window.X = …, and what build.py/site.js inject) count as declared: in the shared-scope design they are
// the deliberate interfaces between modules. Everything else that is used but declared nowhere is reported (typos, removed functions).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import globals from 'globals';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP = path.join(ROOT, 'viz3');
const SRC = path.join(APP, 'src');
const verbose = process.argv.includes('--verbose');

// the same list and the same join as viz3/build.py (module_files, '\n'.join)
export function moduleFiles() {
  return fs
    .readFileSync(path.join(SRC, 'modules.txt'), 'utf8')
    .split('\n')
    .map(l => l.split('#')[0].trim())
    .filter(Boolean);
}
const files = moduleFiles();
const parts = files.map(rel => ({ rel, text: fs.readFileSync(path.join(SRC, rel), 'utf8') }));
let line = 1;
for (const p of parts) {
  p.start = line;
  line += p.text.split('\n').length; // '\n'.join adds one line break between files
}
const joined = parts.map(p => p.text).join('\n');
const where = l => {
  let lo = 0;
  for (let i = 0; i < parts.length; i++) if (parts[i].start <= l) lo = i;
  return { file: parts[lo].rel, line: l - parts[lo].start + 1 };
};

// window.X assignments in the app, in build.py (manifests) and in site.js
const winNames = new Set();
const grab = (text, re) => {
  for (const m of text.matchAll(re)) winNames.add(m[1]);
};
grab(joined, /window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g);
grab(fs.readFileSync(path.join(APP, 'build.py'), 'utf8'), /window\.([A-Za-z_$][\w$]*)\s*=/g);
grab(fs.readFileSync(path.join(APP, 'site.js'), 'utf8'), /window\.([A-Za-z_$][\w$]*)\s*=/g);

const RULES = {
  // real mistakes – fail the check
  'no-undef': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-dupe-class-members': 'error',
  'no-dupe-else-if': 'error',
  'no-duplicate-case': 'error',
  'no-const-assign': 'error',
  'no-func-assign': 'error',
  'no-import-assign': 'error',
  'no-class-assign': 'error',
  'no-redeclare': 'error',
  'no-self-assign': 'error',
  'no-unreachable': 'error',
  'no-unsafe-negation': 'error',
  'no-unsafe-finally': 'error',
  'no-compare-neg-zero': 'error',
  'no-loss-of-precision': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'getter-return': 'error',
  'no-setter-return': 'error',
  'for-direction': 'error',
  'no-obj-calls': 'error',
  'no-new-native-nonconstructor': 'error',
  // clean-up hints – counted, never fail
  'no-unused-vars': ['warn', { vars: 'all', args: 'none', caughtErrors: 'none' }],
};

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: { ...globals.browser, ...Object.fromEntries([...winNames].map(n => [n, 'writable'])) },
      },
      rules: RULES,
    },
  ],
});
const [res] = await eslint.lintText(joined, { filePath: path.join(SRC, '_main.js') });
const errs = res.messages.filter(m => m.severity === 2 || m.fatal);
const warns = res.messages.filter(m => m.severity === 1);
const show = m => {
  const w = where(m.line);
  return `${w.file}:${w.line}:${m.column}  ${m.ruleId || 'parse'}  ${m.message}`;
};
for (const m of errs) console.log('ERROR ' + show(m));
if (verbose) for (const m of warns) console.log('warn  ' + show(m));
const byFile = {};
for (const m of warns) {
  const f = where(m.line).file;
  byFile[f] = (byFile[f] || 0) + 1;
}
const top = Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([f, n]) => `${f} ${n}`)
  .join(', ');
console.log(
  `lint: ${errs.length} errors, ${warns.length} unused names in ${files.length} modules` +
    (warns.length ? ` (most: ${top}; list with --verbose)` : '')
);
process.exit(errs.length ? 1 : 0);
