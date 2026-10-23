// One-off codemod of plan phase 2 (building block 1): window.TICKS → KERN.tick. For each given module it rewrites
//   window.TICKS.push(fn)  /  TICKS.push(fn)  /  (window.TICKS || (window.TICKS = [])).push(fn)
// into  KERN.tick(fn, '<module>:<n>')  – or, when fn is a plain name,  const off<Name> = KERN.tick(fn, ...)  is NOT done automatically:
// removal sites (indexOf/splice) are listed for a hand edit. It adds `import { KERN } from '../core/kern.js'` when missing.
// Usage: node tools/check/ticks_to_kern.mjs viz3/src/world/forest.js …   (prints what it did; review the diff, run tools/check.sh)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const acorn = require('acorn');
const walk = (node, fn) => {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(c => walk(c, fn));
    else if (v && typeof v.type === 'string') walk(v, fn);
  }
};
// is `node` the expression window.TICKS, TICKS or (window.TICKS || (window.TICKS = []))
function isTicks(n) {
  if (!n) return false;
  if (n.type === 'Identifier' && n.name === 'TICKS') return true;
  if (n.type === 'MemberExpression' && !n.computed && n.property.name === 'TICKS' && n.object.type === 'Identifier' && n.object.name === 'window')
    return true;
  if (n.type === 'LogicalExpression' && n.operator === '||' && isTicks(n.left)) return true;
  return false;
}
for (const file of process.argv.slice(2)) {
  let src = fs.readFileSync(file, 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
  const mod = file.replace(/^.*viz3\/src\//, '').replace(/\.js$/, '');
  const edits = [];
  const manual = [];
  walk(ast, n => {
    if (n.type !== 'CallExpression' || n.callee.type !== 'MemberExpression') return;
    const prop = n.callee.property.name;
    if (!isTicks(n.callee.object)) return;
    if (prop === 'push' && n.arguments.length === 1) edits.push(n);
    else manual.push(`${file}:${src.slice(0, n.start).split('\n').length} ${src.slice(n.start, n.end).slice(0, 60)}`);
  });
  edits.sort((a, b) => b.start - a.start);
  let k = edits.length;
  for (const n of edits) {
    const a = n.arguments[0];
    const label = `${mod}${edits.length > 1 ? ':' + k : ''}`;
    k--;
    src = src.slice(0, n.start) + 'KERN.tick(' + src.slice(a.start, a.end) + `, '${label}')` + src.slice(n.end);
  }
  if (edits.length && !/import \{[^}]*\bKERN\b[^}]*\} from '[./]*core\/kern\.js'/.test(src)) {
    const rel = path.relative(path.dirname(file), path.join(file.replace(/viz3\/src\/.*$/, 'viz3/src'), 'core/kern.js'));
    const imp = `import { KERN } from '${rel.startsWith('.') ? rel : './' + rel}';\n`;
    const im = [...src.matchAll(/^import [^\n]*;\n/gm)];
    const at = im.length ? im[im.length - 1].index + im[im.length - 1][0].length : 0;
    src = src.slice(0, at) + imp + src.slice(at);
  }
  fs.writeFileSync(file, src);
  console.log(`${file}: ${edits.length} push → KERN.tick${manual.length ? '; by hand: ' + manual.join(' | ') : ''}`);
}
