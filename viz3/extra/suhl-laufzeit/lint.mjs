// Lint of the Suhl package (viz3/src/lazy/suhl.js, suhl-worker.js, lazy/suhl/**): tools/check/lint.mjs only sees the modules of
// modules.txt, so code loaded on demand would go unchecked. Same kind of rules: real mistakes fail, unused names are listed.
//   node viz3/extra/suhl-laufzeit/lint.mjs      (uses the eslint of tools/check/node_modules)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const req = createRequire(path.join(ROOT, 'tools', 'check', 'package.json'));
const { ESLint } = await import(pathToFileURL(req.resolve('eslint')).href);
const globals = (await import(pathToFileURL(req.resolve('globals')).href)).default;
const LAZY = path.join(ROOT, 'viz3', 'src', 'lazy');
const files = ['suhl.js', 'suhl-worker.js'].map(f => path.join(LAZY, f));
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
};
walk(path.join(LAZY, 'suhl'));
const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: [
    {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.worker } },
      rules: {
        'no-undef': 'error',
        'no-dupe-keys': 'error',
        'no-dupe-args': 'error',
        'no-dupe-else-if': 'error',
        'no-duplicate-case': 'error',
        'no-const-assign': 'error',
        'no-func-assign': 'error',
        'no-import-assign': 'error',
        'no-redeclare': 'error',
        'no-self-assign': 'error',
        'no-unreachable': 'error',
        'no-unsafe-negation': 'error',
        'no-compare-neg-zero': 'error',
        'no-loss-of-precision': 'error',
        'use-isnan': 'error',
        'valid-typeof': 'error',
        'for-direction': 'error',
        'no-unused-vars': ['warn', { vars: 'all', args: 'none', caughtErrors: 'none' }],
      },
    },
  ],
});
const res = await eslint.lintFiles(files);
let err = 0,
  warn = 0;
for (const r of res)
  for (const m of r.messages) {
    if (m.severity === 2) err++;
    else warn++;
    console.log(`${path.relative(ROOT, r.filePath)}:${m.line}  ${m.severity === 2 ? 'error' : 'warn '}  ${m.message}`);
  }
console.log(`suhl lint: ${err} errors, ${warn} unused names in ${files.length} files`);
process.exit(err ? 1 : 0);
