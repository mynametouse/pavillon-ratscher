// Recompute the imports of app modules after code moved between modules (refactor phase 1, e.g. game/game.js split up):
//   node tools/check/fix_imports.mjs [module …]    default: all modules of modules.txt; afterwards prettier --write and tools/check.sh
// For each given module the import block is written anew from what the module uses: names of modules ABOVE it (adds `export` in that
// module where it is missing), library names (three.js, its addons, n8ao, ez-tree) from the source another module imports them from.
// A bare name of a module BELOW it is an error (read it as LATE.<name>, handed over by its module – see core/late.js); nothing is written then.
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
const targets = process.argv.slice(2).length ? process.argv.slice(2) : order;
for (const t of targets) if (!idx.has(t)) throw new Error(`${t} is not in modules.txt`);
const parse = code => acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', ranges: true, locations: true });
const rel2 = (from, to) => {
  const r = path.posix.relative(path.posix.dirname(from), to);
  return r.startsWith('.') ? r : './' + r;
};
function names(p, out) {
  if (!p) return;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') for (const q of p.properties) names(q.value || q.argument, out);
  else if (p.type === 'ArrayPattern') for (const q of p.elements) names(q, out);
  else if (p.type === 'RestElement') names(p.argument, out);
  else if (p.type === 'AssignmentPattern') names(p.left, out);
}

// ---- who declares what (exported or not), which library names exist ----
const M = {};
const owners = new Map(); // name -> [modules]
const lib = new Map(); // local name -> { source (library id or path below src/), imported, relative }
for (const rel of order) {
  const code = fs.readFileSync(path.join(SRC, rel), 'utf8');
  const ast = parse(code);
  const m = (M[rel] = { code, ast, decl: new Map(), exported: new Set() }); // decl: name -> statement node (the export wrapper if any)
  for (const n of ast.body) {
    const d = n.type === 'ExportNamedDeclaration' && n.declaration ? n.declaration : n;
    const nm = [];
    if (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') nm.push(d.id.name);
    else if (d.type === 'VariableDeclaration') for (const v of d.declarations) names(v.id, nm);
    else if (d.type === 'ImportDeclaration') {
      const s = d.source.value;
      const src = s.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(rel), s)) : s;
      if (idx.has(src)) continue; // an app import – recomputed
      for (const sp of d.specifiers)
        lib.set(sp.local.name, {
          source: src,
          relative: s.startsWith('.'),
          imported:
            sp.type === 'ImportNamespaceSpecifier' ? '*' : sp.type === 'ImportDefaultSpecifier' ? 'default' : sp.imported.name,
        });
      continue;
    }
    for (const x of nm) {
      m.decl.set(x, n);
      if (n !== d) m.exported.add(x);
      (owners.get(x) || owners.set(x, []).get(x)).push(rel);
    }
  }
}

// ---- what each target needs ----
const errors = [];
const plan = {};
const addExport = new Map(); // module -> Set(names)
for (const rel of targets) {
  const m = M[rel];
  const sm = escope.analyze(m.ast, { ecmaVersion: 2022, sourceType: 'module' });
  const ms = sm.scopes.find(s => s.type === 'module');
  const own = new Set(m.decl.keys());
  const imp = new Map(),
    libs = new Map();
  // what the module takes from outside: unresolved names, and names bound by its current imports (those are rebuilt)
  const outside = [...ms.through];
  for (const sc of sm.scopes)
    for (const ref of sc.references)
      if (ref.resolved && ref.resolved.defs.some(d => d.type === 'ImportBinding')) outside.push(ref);
  for (const ref of outside) {
    const nm = ref.identifier.name;
    if (own.has(nm)) continue;
    const os = (owners.get(nm) || []).filter(o => o !== rel);
    if (!os.length) {
      if (lib.has(nm)) {
        const L = lib.get(nm);
        const list = libs.get(L.source) || [];
        if (!list.some(x => x.local === nm)) list.push({ ...L, local: nm });
        libs.set(L.source, list);
      }
      continue; // a browser or page global
    }
    const above = os.filter(o => idx.get(o) < idx.get(rel));
    if (!above.length) {
      errors.push(`${rel}:${ref.identifier.loc.start.line}  ${nm} belongs to ${os.join(', ')} (loads later) – read it as LATE.${nm}`);
      continue;
    }
    if (above.length > 1) {
      errors.push(`${rel}:${ref.identifier.loc.start.line}  ${nm} is declared in ${above.join(' and ')} – which one?`);
      continue;
    }
    if (ref.isWrite()) errors.push(`${rel}:${ref.identifier.loc.start.line}  assigns ${nm} of ${above[0]} – imports are read-only`);
    (imp.get(above[0]) || imp.set(above[0], new Set()).get(above[0])).add(nm);
    if (!M[above[0]].exported.has(nm)) (addExport.get(above[0]) || addExport.set(above[0], new Set()).get(above[0])).add(nm);
  }
  plan[rel] = { imp, libs };
}
if (errors.length) {
  for (const e of errors) console.log('ERROR ' + e);
  console.log(`fix_imports: ${errors.length} problems – nothing written`);
  process.exit(1);
}

// ---- write ----
const libRank = src => (src === 'three' ? 0 : src.startsWith('three/') ? 1 : src.startsWith('.') || src.includes('/') ? 3 : 2);
let changed = 0;
for (const rel of order) {
  const m = M[rel];
  const edits = [];
  for (const nm of addExport.get(rel) || []) {
    const s = m.decl.get(nm);
    if (!edits.some(e => e[0] === s.start)) edits.push([s.start, s.start, 'export ']);
  }
  if (plan[rel]) {
    const { imp, libs } = plan[rel];
    const lines = [];
    for (const [src, list] of [...libs].sort((a, b) => libRank(a[0]) - libRank(b[0]) || a[0].localeCompare(b[0]))) {
      const spec = list[0].relative ? rel2(rel, src) : src;
      const ns = list.find(x => x.imported === '*');
      if (ns) lines.push(`import * as ${ns.local} from '${spec}';`);
      const def = list.find(x => x.imported === 'default');
      const named = list
        .filter(x => x.imported !== '*' && x.imported !== 'default')
        .map(x => (x.imported === x.local ? x.local : `${x.imported} as ${x.local}`))
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      if (def || named.length)
        lines.push(`import ${[def ? def.local : null, named.length ? `{ ${named.join(', ')} }` : null].filter(Boolean).join(', ')} from '${spec}';`);
    }
    for (const o of order)
      if (imp.has(o)) {
        const nms = [...imp.get(o)].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }) || (a < b ? -1 : 1));
        lines.push(`import { ${nms.join(', ')} } from '${rel2(rel, o)}';`);
      }
    const old = m.ast.body.filter(n => n.type === 'ImportDeclaration');
    // the new block goes where the first import was (or after the comment block the file starts with); old imports are removed
    let at;
    if (old.length) at = old[0].start;
    else {
      const ls = m.code.split('\n');
      let k = 0,
        pos = 0;
      while (k < ls.length && /^\s*\/\//.test(ls[k])) pos += ls[k++].length + 1;
      at = k > 0 && m.ast.body.length && m.ast.body[0].start >= pos ? pos : 0;
    }
    for (const n of old) {
      let e = n.end;
      if (m.code[e] === '\n') e++;
      edits.push([n.start, e, '']);
    }
    if (lines.length) edits.push([at, at, lines.join('\n') + '\n']);
  }
  if (!edits.length) continue;
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let out = m.code;
  for (const [s, e, t] of edits) out = out.slice(0, s) + t + out.slice(e);
  parse(out);
  if (out !== m.code) {
    fs.writeFileSync(path.join(SRC, rel), out);
    changed++;
  }
}
console.log(`fix_imports: ${targets.length} modules checked, ${changed} files written`);
