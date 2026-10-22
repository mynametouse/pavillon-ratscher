// Architecture report of the shared-scope bundle: which module uses the top-level names of which other module, names used before their
// module is loaded ("forward", only works because they are called late), and the window.* names each module sets.
//   node tools/check/deps.mjs              summary: totals + the most connected modules
//   node tools/check/deps.mjs --module game/game.js   details for one module
//   node tools/check/deps.mjs --json out.json          everything as JSON (input for the ES-module conversion in phase 1)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';
import globals from 'globals';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'viz3', 'src');
const arg = k => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : null;
};
const order = fs
  .readFileSync(path.join(SRC, 'modules.txt'), 'utf8')
  .split('\n')
  .map(l => l.split('#')[0].trim())
  .filter(Boolean);
const BROWSER = new Set([...Object.keys(globals.browser), ...Object.keys(globals.builtin), 'undefined', 'arguments']);

const parse = code =>
  acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    ranges: true, // eslint-scope needs node.range
  });
function names(p, out) {
  if (!p) return;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') for (const q of p.properties) names(q.value || q.argument, out);
  else if (p.type === 'ArrayPattern') for (const q of p.elements) names(q, out);
  else if (p.type === 'RestElement') names(p.argument, out);
  else if (p.type === 'AssignmentPattern') names(p.left, out);
}
function walk(node, fn, parent) {
  if (!node || typeof node.type !== 'string') return;
  fn(node, parent);
  for (const k in node) {
    const v = node[k];
    if (Array.isArray(v)) for (const c of v) c && typeof c.type === 'string' && walk(c, fn, node);
    else if (v && typeof v.type === 'string') walk(v, fn, node);
  }
}
const isWin = n => n && n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'window';

const mods = {};
const owner = new Map(); // top-level name -> module (first declaration wins, like the shared scope)
const winOwner = new Map(); // window.X -> module that assigns it first
for (const rel of order) {
  const code = fs.readFileSync(path.join(SRC, rel), 'utf8');
  const ast = parse(code);
  const top = [];
  for (const n of ast.body) {
    if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) top.push(n.id.name);
    else if (n.type === 'VariableDeclaration') for (const d of n.declarations) names(d.id, top);
    else if (n.type === 'ImportDeclaration') for (const s of n.specifiers) top.push(s.local.name);
  }
  const winSet = new Set();
  walk(ast, n => {
    if (n.type === 'AssignmentExpression' && isWin(n.left)) winSet.add(n.left.property.name);
  });
  mods[rel] = { ast, top, winSet, lines: code.split('\n').length, bytes: code.length };
  for (const t of top) if (!owner.has(t)) owner.set(t, rel);
  for (const w of winSet) if (!winOwner.has(w)) winOwner.set(w, rel);
}
for (const rel of order) {
  const m = mods[rel];
  const sm = escope.analyze(m.ast, { ecmaVersion: 2022, sourceType: 'module' });
  const scope = sm.scopes.find(s => s.type === 'module');
  m.deps = {}; // module -> {name: refs}
  m.unknown = new Set();
  for (const ref of scope.through) {
    const nm = ref.identifier.name;
    let o = owner.get(nm) || winOwner.get(nm);
    if (o === rel) continue;
    if (!o) {
      if (!BROWSER.has(nm)) m.unknown.add(nm);
      continue;
    }
    (m.deps[o] = m.deps[o] || {})[nm] = ((m.deps[o] || {})[nm] || 0) + 1;
  }
  const idx = order.indexOf(rel);
  m.forward = Object.keys(m.deps).filter(o => order.indexOf(o) > idx);
}
for (const rel of order) mods[rel].usedBy = order.filter(o => mods[o].deps[rel]);

const rows = order.map(rel => {
  const m = mods[rel];
  return {
    module: rel,
    lines: m.lines,
    topLevel: m.top.length,
    dependsOn: Object.keys(m.deps).length,
    usedBy: m.usedBy.length,
    forward: m.forward,
    window: [...m.winSet],
    deps: Object.fromEntries(Object.entries(m.deps).map(([k, v]) => [k, Object.keys(v)])),
    unknown: [...m.unknown],
  };
});
const one = arg('--module');
if (one) {
  const r = rows.find(x => x.module === one);
  if (!r) {
    console.error('unknown module ' + one);
    process.exit(2);
  }
  console.log(JSON.stringify({ ...r, usedBy: mods[one].usedBy }, null, 1));
  process.exit(0);
}
const out = arg('--json');
if (out) fs.writeFileSync(out, JSON.stringify({ order, owner: Object.fromEntries(owner), window: Object.fromEntries(winOwner), modules: rows }, null, 1));
const fwd = rows.reduce((s, r) => s + r.forward.length, 0);
console.log(
  `deps: ${order.length} modules, ${owner.size} shared top-level names, ${winOwner.size} window names, ${fwd} forward uses ` +
    `(module needs one loaded later)`
);
const hubs = [...rows].sort((a, b) => b.dependsOn + b.usedBy - (a.dependsOn + a.usedBy)).slice(0, 5);
console.log('  most connected: ' + hubs.map(r => `${r.module} (uses ${r.dependsOn}, used by ${r.usedBy}, forward ${r.forward.length})`).join('; '));
