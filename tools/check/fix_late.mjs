// LATE after the module order changed (refactor phase 1): run before fix_imports.mjs, then prettier and tools/check.sh.
//   node tools/check/fix_late.mjs
// - a read LATE.x whose module now loads ABOVE the reader becomes the plain name x (fix_imports.mjs then imports it)
// - an import from a module that now loads BELOW the importer becomes LATE.x reads, and that module hands x over (functions at the top –
//   they exist from the start –, constants right after their declaration, let-variables as getters)
// - hand-overs nobody reads any more are removed
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'viz3', 'src');
const order = fs
  .readFileSync(path.join(SRC, 'modules.txt'), 'utf8')
  .split('\n')
  .map(l => l.split('#')[0].trim())
  .filter(Boolean);
const idx = new Map(order.map((r, i) => [r, i]));
const parse = code => acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', ranges: true, locations: true });
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
const isLate = n => n && n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'LATE';
const lineEnd = (code, pos) => {
  const k = code.indexOf('\n', pos);
  return k < 0 ? code.length : k + 1;
};
const lineStart = (code, pos) => code.lastIndexOf('\n', pos - 1) + 1;

const M = {};
const decl = new Map(); // name -> { mod, kind, stmt }
for (const rel of order) {
  const code = fs.readFileSync(path.join(SRC, rel), 'utf8');
  const ast = parse(code);
  M[rel] = { code, ast, edits: [] };
  for (const n of ast.body) {
    const d = n.type === 'ExportNamedDeclaration' && n.declaration ? n.declaration : n;
    const nm = [];
    let kind = null;
    if (d.type === 'FunctionDeclaration') (nm.push(d.id.name), (kind = 'function'));
    else if (d.type === 'ClassDeclaration') (nm.push(d.id.name), (kind = 'class'));
    else if (d.type === 'VariableDeclaration') {
      for (const v of d.declarations) names(v.id, nm);
      kind = d.kind;
    }
    for (const x of nm) if (!decl.has(x)) decl.set(x, { mod: rel, kind, stmt: n });
  }
}
// hand-overs: name -> { mod, node (statement), how }
const give = new Map();
for (const rel of order)
  for (const n of M[rel].ast.body) {
    if (n.type !== 'ExpressionStatement') continue;
    const e = n.expression;
    if (e.type === 'AssignmentExpression' && isLate(e.left)) give.set(e.left.property.name, { mod: rel, stmt: n, how: 'assign' });
    else if (
      e.type === 'CallExpression' &&
      e.callee.type === 'MemberExpression' &&
      e.callee.object.name === 'Object' &&
      e.arguments[0]?.type === 'Identifier' &&
      e.arguments[0].name === 'LATE'
    ) {
      if (e.callee.property.name === 'assign')
        for (const p of e.arguments[1].properties) give.set(p.key.name, { mod: rel, stmt: n, how: 'object', prop: p });
      else if (e.callee.property.name === 'defineProperty') give.set(e.arguments[1].value, { mod: rel, stmt: n, how: 'define' });
    }
  }

let unlated = 0,
  lated = 0;
const stillRead = new Set();
const newGive = new Map(); // owner -> Set(names)
for (const rel of order) {
  const m = M[rel];
  // (1) LATE.x reads whose module is above now -> x
  walk(m.ast, (n, parent) => {
    if (!isLate(n) || (parent && parent.type === 'AssignmentExpression' && parent.left === n)) return;
    const nm = n.property.name,
      g = give.get(nm);
    if (!g || g.mod === rel) return;
    if (idx.get(g.mod) < idx.get(rel)) {
      m.edits.push([n.start, n.end, nm]);
      unlated++;
    } else stillRead.add(nm);
  });
  // (2) imports from modules below -> LATE.x
  const sm = escope.analyze(m.ast, { ecmaVersion: 2022, sourceType: 'module' });
  const shorthand = new Set();
  walk(m.ast, n => {
    if (n.type === 'ObjectExpression')
      for (const p of n.properties) if (p.type === 'Property' && p.shorthand && p.value.type === 'Identifier') shorthand.add(p.value.start);
  });
  for (const imp of m.ast.body.filter(n => n.type === 'ImportDeclaration')) {
    const s = imp.source.value;
    if (!s.startsWith('.')) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), s));
    if (!idx.has(target) || idx.get(target) < idx.get(rel)) continue;
    for (const sp of imp.specifiers) {
      const nm = sp.local.name;
      const owner = decl.has(nm) ? decl.get(nm).mod : target; // where the name is declared now (code may have moved)
      if (idx.get(owner) < idx.get(rel)) continue; // above: fix_imports.mjs imports it from there
      const v = sm.scopes.find(x => x.type === 'module').variables.find(x => x.name === nm);
      for (const ref of v ? v.references : []) {
        if (ref.isWrite()) throw new Error(`${rel}: assigns ${nm} of ${target}`);
        const id = ref.identifier;
        m.edits.push([id.start, id.end, shorthand.has(id.start) ? `${nm}: LATE.${nm}` : `LATE.${nm}`]);
        lated++;
      }
      stillRead.add(nm);
      if (!give.has(nm)) (newGive.get(owner) || newGive.set(owner, new Set()).get(owner)).add(nm);
    }
  }
}
// (3) new hand-overs in the owners
for (const [rel, set] of newGive) {
  const m = M[rel];
  const fns = [...set].filter(nm => decl.get(nm).kind === 'function');
  if (fns.length) {
    const firstCode = m.ast.body.find(n => n.type !== 'ImportDeclaration');
    m.edits.push([lineStart(m.code, firstCode.start), lineStart(m.code, firstCode.start), `Object.assign(LATE, { ${fns.join(', ')} }); // functions for modules that load earlier\n`]);
  }
  for (const nm of set) {
    const d = decl.get(nm);
    if (d.kind === 'function') continue;
    const line =
      d.kind === 'let' || d.kind === 'var'
        ? `Object.defineProperty(LATE, '${nm}', { get: () => ${nm}, enumerable: true });\n`
        : `LATE.${nm} = ${nm};\n`;
    m.edits.push([lineEnd(m.code, d.stmt.end), lineEnd(m.code, d.stmt.end), line]);
  }
}
// (4) hand-overs nobody reads any more
let removed = 0;
const byStmt = new Map();
for (const [nm, g] of give) if (!stillRead.has(nm)) (byStmt.get(g.stmt) || byStmt.set(g.stmt, { g, drop: [] }).get(g.stmt)).drop.push(nm);
for (const [stmt, { g, drop }] of byStmt) {
  const m = M[g.mod];
  const all = g.how === 'object' ? stmt.expression.arguments[1].properties.map(p => p.key.name) : [drop[0]];
  const keep = all.filter(x => !drop.includes(x));
  removed += drop.length;
  if (!keep.length) m.edits.push([lineStart(m.code, stmt.start), lineEnd(m.code, stmt.end), '']);
  else {
    const obj = stmt.expression.arguments[1];
    m.edits.push([obj.start, obj.end, `{ ${keep.join(', ')} }`]);
  }
}
let files = 0;
for (const rel of order) {
  const m = M[rel];
  if (!m.edits.length) continue;
  m.edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let out = m.code,
    last = Infinity;
  for (const [s, e, t] of m.edits) {
    if (e > last) throw new Error(`${rel}: overlapping edits at ${s}`);
    out = out.slice(0, s) + t + out.slice(e);
    last = s;
  }
  parse(out);
  fs.writeFileSync(path.join(SRC, rel), out);
  files++;
}
console.log(
  `fix_late: ${unlated} LATE reads became plain names, ${lated} references became LATE reads, ${removed} hand-overs removed; ${files} files written`
);
