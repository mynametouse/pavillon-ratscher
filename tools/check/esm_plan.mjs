// Phase 1 helper: what the conversion of the shared-scope modules into ES modules (esm_convert.mjs) needs, per module – for a branch
// that still has the shared scope; on converted modules it stops.
//   node tools/check/esm_plan.mjs            summary;  --early  load-time forward calls;  --json out.json  everything
// For every reference to a top-level name of another module: backward (the other module comes earlier – a static import keeps the load
// order) or forward (comes later – must stay a late lookup, e.g. through window); "immediate" = runs while the module itself loads (not
// inside a function) – a forward immediate reference only works today through function hoisting across the shared scope; "write" =
// assigns to another module's variable (imports are read-only in ES modules).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import * as escope from "eslint-scope";
import globals from "globals";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const SRC = path.join(ROOT, "viz3", "src");
const order = fs
  .readFileSync(path.join(SRC, "modules.txt"), "utf8")
  .split("\n")
  .map((l) => l.split("#")[0].trim())
  .filter(Boolean);
if (order.includes("core/late.js")) {
  console.log(
    "esm plan: the modules are ES modules already (modules.txt lists core/late.js) – see tools/check/deps.mjs",
  );
  process.exit(0);
}
const BROWSER = new Set([
  ...Object.keys(globals.browser),
  ...Object.keys(globals.builtin),
  "undefined",
  "arguments",
]);
const parse = (code) =>
  acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    ranges: true,
    locations: true,
  });
function names(p, out) {
  if (!p) return;
  if (p.type === "Identifier") out.push(p.name);
  else if (p.type === "ObjectPattern")
    for (const q of p.properties) names(q.value || q.argument, out);
  else if (p.type === "ArrayPattern") for (const q of p.elements) names(q, out);
  else if (p.type === "RestElement") names(p.argument, out);
  else if (p.type === "AssignmentPattern") names(p.left, out);
}
function walk(node, fn, parent) {
  if (!node || typeof node.type !== "string") return;
  fn(node, parent);
  for (const k in node) {
    const v = node[k];
    if (Array.isArray(v))
      for (const c of v) c && typeof c.type === "string" && walk(c, fn, node);
    else if (v && typeof v.type === "string") walk(v, fn, node);
  }
}
const isWin = (n) =>
  n &&
  n.type === "MemberExpression" &&
  !n.computed &&
  n.object.type === "Identifier" &&
  n.object.name === "window";
const mods = {},
  owner = new Map(),
  kindOf = new Map(),
  winOwner = new Map();
for (const rel of order) {
  const code = fs.readFileSync(path.join(SRC, rel), "utf8");
  const ast = parse(code);
  const top = [];
  for (const n of ast.body) {
    if (
      (n.type === "FunctionDeclaration" || n.type === "ClassDeclaration") &&
      n.id
    ) {
      top.push(n.id.name);
      kindOf.set(
        n.id.name,
        n.type === "FunctionDeclaration" ? "function" : "class",
      );
    } else if (n.type === "VariableDeclaration")
      for (const d of n.declarations) {
        const a = [];
        names(d.id, a);
        for (const x of a) {
          top.push(x);
          if (!kindOf.has(x)) kindOf.set(x, n.kind);
        }
      }
    else if (n.type === "ImportDeclaration")
      for (const s of n.specifiers) {
        top.push(s.local.name);
        kindOf.set(s.local.name, "import");
      }
  }
  const winSet = new Set();
  walk(ast, (n) => {
    if (n.type === "AssignmentExpression" && isWin(n.left))
      winSet.add(n.left.property.name);
  });
  mods[rel] = { ast, code, top, winSet };
  for (const t of top) if (!owner.has(t)) owner.set(t, rel);
  for (const w of winSet) if (!winOwner.has(w)) winOwner.set(w, rel);
}
const result = {};
let totals = {
  imports: 0,
  forward: 0,
  forwardImmediate: 0,
  writes: 0,
  forwardNotOnWindow: 0,
};
for (const rel of order) {
  const m = mods[rel];
  const sm = escope.analyze(m.ast, { ecmaVersion: 2022, sourceType: "module" });
  const modScope = sm.scopes.find((s) => s.type === "module");
  const idx = order.indexOf(rel);
  const r = { imports: {}, forward: {}, writes: [], unknown: [] };
  for (const ref of modScope.through) {
    const nm = ref.identifier.name;
    const o = owner.get(nm);
    if (o === rel) continue;
    if (!o) {
      if (!winOwner.has(nm) && !BROWSER.has(nm)) r.unknown.push(nm);
      continue;
    }
    // is the reference evaluated while the module loads? walk up the scopes: any function scope → deferred
    let s = ref.from,
      immediate = true;
    while (s && s !== modScope) {
      if (s.type === "function" || s.type === "class-field-initializer")
        immediate = false;
      s = s.upper;
    }
    const oi = order.indexOf(o);
    if (ref.isWrite())
      r.writes.push({
        name: nm,
        owner: o,
        line: ref.identifier.loc.start.line,
      });
    if (oi < idx) (r.imports[o] = r.imports[o] || new Set()).add(nm);
    else {
      const f = (r.forward[nm] = r.forward[nm] || {
        owner: o,
        kind: kindOf.get(nm),
        onWindow: winOwner.has(nm),
        immediate: false,
        lines: [],
      });
      if (immediate) f.immediate = true;
      if (f.lines.length < 4) f.lines.push(ref.identifier.loc.start.line);
    }
  }
  for (const k in r.imports) r.imports[k] = [...r.imports[k]].sort();
  r.unknown = [...new Set(r.unknown)];
  result[rel] = r;
  totals.imports += Object.values(r.imports).reduce((a, b) => a + b.length, 0);
  totals.forward += Object.keys(r.forward).length;
  totals.forwardImmediate += Object.values(r.forward).filter(
    (f) => f.immediate,
  ).length;
  totals.forwardNotOnWindow += Object.values(r.forward).filter(
    (f) => !f.onWindow,
  ).length;
  totals.writes += r.writes.length;
}
// ---- load-time reach: which functions of LATER modules can run while an earlier module loads? ----
// Today function declarations are hoisted across the shared scope, so module A may call a function of a later module B while A loads
// (e.g. pavilion/interior.js builds furniture at load and calls itemCol of pavilion/plan.js). With ES modules that call cannot go through
// a late lookup (B has not run yet) – such functions must move before A. Over-approximation: everything outside function declarations and
// const-arrow functions counts as load code (callbacks, object methods included); a name reached pulls in its whole declaration.
const decl = new Map(); // name -> { owner, fn, refs:Set }
const loadRefs = {};
for (const rel of order) {
  const m = mods[rel];
  const sm = escope.analyze(m.ast, { ecmaVersion: 2022, sourceType: "module" });
  const ranges = []; // [start, end, name, isFn]
  for (const n of m.ast.body) {
    if (n.type === "FunctionDeclaration" && n.id)
      ranges.push([n.range[0], n.range[1], n.id.name, true]);
    else if (n.type === "ClassDeclaration" && n.id)
      ranges.push([n.range[0], n.range[1], n.id.name, false]);
    else if (n.type === "VariableDeclaration")
      for (const d of n.declarations) {
        const a = [];
        names(d.id, a);
        const isFn =
          d.init &&
          (d.init.type === "ArrowFunctionExpression" ||
            d.init.type === "FunctionExpression");
        for (const x of a) ranges.push([d.range[0], d.range[1], x, isFn]);
      }
  }
  for (const [, , nm, isFn] of ranges)
    if (!decl.has(nm)) decl.set(nm, { owner: rel, fn: isFn, refs: new Set() });
  const lr = new Set();
  for (const sc of sm.scopes)
    for (const ref of sc.references) {
      const resolvedTop = ref.resolved
        ? ref.resolved.scope.type === "module"
        : true;
      if (!resolvedTop) continue;
      const nm = ref.identifier.name;
      if (!owner.has(nm)) continue;
      const pos = ref.identifier.range[0];
      const inside = ranges.filter((r) => pos >= r[0] && pos < r[1]);
      const fnHome = inside.find((r) => r[3]);
      for (const r of inside)
        if (r[2] !== nm && decl.get(r[2]).owner === rel)
          decl.get(r[2]).refs.add(nm);
      if (!fnHome) lr.add(nm); // not inside a function declaration / const-arrow: may run at load
    }
  loadRefs[rel] = lr;
}
const early = [];
for (const [i, rel] of order.entries()) {
  const seen = new Map(); // name -> path
  const work = [...loadRefs[rel]].map((n) => [n, [n]]);
  while (work.length) {
    const [nm, pth] = work.pop();
    if (seen.has(nm)) continue;
    seen.set(nm, pth);
    const d = decl.get(nm);
    if (!d) continue;
    const oi = order.indexOf(d.owner);
    if (oi > i && !d.fn) continue; // a later const/let/class cannot be touched at load today (TDZ) – guarded or never reached
    if (oi > i && kindOf.get(nm) === "function")
      early.push({
        module: rel,
        fn: nm,
        owner: d.owner,
        path: pth.join(" > "),
      });
    for (const r of d.refs) if (!seen.has(r)) work.push([r, pth.concat(r)]);
  }
}
const out = process.argv.indexOf("--json");
if (out > 0)
  fs.writeFileSync(
    process.argv[out + 1],
    JSON.stringify({ order, result, early }, null, 1),
  );
if (process.argv.includes("--early"))
  for (const e of early)
    console.log(
      `  load-time forward call? ${e.module}: ${e.fn} (${e.owner}) via ${e.path}`,
    );
console.log("load-time forward call candidates:", early.length);
console.log("esm plan:", JSON.stringify(totals));
for (const rel of order) {
  const r = result[rel];
  const imm = Object.entries(r.forward).filter(([, f]) => f.immediate);
  if (imm.length)
    console.log(
      `  forward immediate in ${rel}: ` +
        imm
          .map(([n, f]) => `${n} (${f.kind}, ${f.owner}:${f.lines.join(",")})`)
          .join("; "),
    );
  if (r.writes.length)
    console.log(
      `  writes in ${rel}: ` +
        r.writes.map((w) => `${w.name}@${w.line} (${w.owner})`).join(", "),
    );
}
