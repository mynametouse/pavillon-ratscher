// Architecture check of the ES modules (refactor phase 1): who imports from whom, and the rules that keep the load order of modules.txt.
//   node tools/check/deps.mjs                       rules + summary (exit 1 when a rule is broken)
//   node tools/check/deps.mjs --module game/game.js  details for one module
//   node tools/check/deps.mjs --late                 every name that still goes through LATE, with owner and users
//   node tools/check/deps.mjs --json out.json        everything as JSON
// Rules (errors):
//   1. a module imports only from modules ABOVE it in modules.txt (or from a library) – an import from below would load that module first
//   2. what a module imports, the other module exports (esbuild says so too, later)
//   3. LATE.<name> (core/late.js): handed over by exactly one module, which is BELOW every user (otherwise: import it); every name handed
//      over is used; nobody else writes LATE.<name>
// Report: modules, import edges, LATE names (= places where the layers still point the wrong way), window names, most connected modules.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const SRC = path.join(ROOT, "viz3", "src");
const arg = (k) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : null;
};
const order = fs
  .readFileSync(path.join(SRC, "modules.txt"), "utf8")
  .split("\n")
  .map((l) => l.split("#")[0].trim())
  .filter(Boolean);
const idx = new Map(order.map((r, i) => [r, i]));
const parse = (code) =>
  acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
  });
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
const member = (n, obj) =>
  n &&
  n.type === "MemberExpression" &&
  !n.computed &&
  n.object.type === "Identifier" &&
  n.object.name === obj;

const errors = [];
const err = (rel, line, msg) => errors.push(`${rel}:${line}  ${msg}`);
const mods = {};
for (const rel of order) {
  const code = fs.readFileSync(path.join(SRC, rel), "utf8");
  const ast = parse(code);
  const m = (mods[rel] = {
    lines: code.split("\n").length,
    imports: {},
    libs: new Set(),
    exports: new Set(),
    win: new Set(),
    winWrite: new Set(),
  });
  m.lateRead = new Map(); // name -> first line
  m.lateGive = new Map();
  for (const n of ast.body) {
    if (n.type === "ImportDeclaration") {
      const s = n.source.value;
      if (!s.startsWith(".")) {
        m.libs.add(s);
        continue;
      }
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(rel), s),
      );
      if (!idx.has(target)) {
        if (!fs.existsSync(path.join(SRC, target)))
          err(rel, n.loc.start.line, `imports ${s} – no such file`);
        else m.libs.add(target); // a library kept in the source tree (eztree/)
        continue;
      }
      if (idx.get(target) >= idx.get(rel))
        err(
          rel,
          n.loc.start.line,
          `imports from ${target}, which loads later – use LATE or move code up`,
        );
      m.imports[target] = n.specifiers.map((sp) => ({
        name: sp.imported ? sp.imported.name : "*",
        line: n.loc.start.line,
      }));
    } else if (n.type === "ExportNamedDeclaration") {
      const d = n.declaration;
      if (
        d &&
        (d.type === "FunctionDeclaration" || d.type === "ClassDeclaration")
      )
        m.exports.add(d.id.name);
      else if (d && d.type === "VariableDeclaration")
        for (const v of d.declarations) {
          const out = [];
          const names = (p) => {
            if (!p) return;
            if (p.type === "Identifier") out.push(p.name);
            else if (p.type === "ObjectPattern")
              for (const q of p.properties) names(q.value || q.argument);
            else if (p.type === "ArrayPattern")
              for (const q of p.elements) names(q);
            else if (p.type === "RestElement") names(p.argument);
            else if (p.type === "AssignmentPattern") names(p.left);
          };
          names(v.id);
          for (const x of out) m.exports.add(x);
        }
      for (const sp of n.specifiers || []) m.exports.add(sp.exported.name);
    }
  }
  walk(ast, (n, parent) => {
    if (n.type === "AssignmentExpression" && member(n.left, "window")) {
      m.win.add(n.left.property.name);
      // a real write, not the shared start 'window.X = window.X || …' or 'window.X || (window.X = …)' (TICKS): who else writes this
      // name (report below)
      const nm = n.left.property.name,
        r = n.right,
        isX = (e) => e && member(e, "window") && e.property.name === nm;
      const init =
        (r.type === "LogicalExpression" && isX(r.left)) ||
        (parent &&
          parent.type === "LogicalExpression" &&
          parent.right === n &&
          isX(parent.left));
      if (!init) m.winWrite.add(nm);
    }
    // LATE hand-overs: LATE.X = …, Object.assign(LATE, { X, … }), Object.defineProperty(LATE, 'X', …)
    if (n.type === "AssignmentExpression" && member(n.left, "LATE")) {
      if (!m.lateGive.has(n.left.property.name))
        m.lateGive.set(n.left.property.name, n.loc.start.line);
    } else if (
      n.type === "CallExpression" &&
      member(n.callee, "Object") &&
      n.arguments[0]?.type === "Identifier" &&
      n.arguments[0].name === "LATE"
    ) {
      const how = n.callee.property.name;
      if (how === "assign" && n.arguments[1]?.type === "ObjectExpression")
        for (const p of n.arguments[1].properties)
          m.lateGive.set(p.key.name, n.loc.start.line);
      else if (how === "defineProperty" && n.arguments[1]?.type === "Literal")
        m.lateGive.set(n.arguments[1].value, n.loc.start.line);
      else
        err(
          rel,
          n.loc.start.line,
          `Object.${how}(LATE, …) – hand over with LATE.X = X, Object.assign(LATE, { … }) or defineProperty`,
        );
    } else if (
      member(n, "LATE") &&
      !(parent && parent.type === "AssignmentExpression" && parent.left === n)
    ) {
      if (!m.lateRead.has(n.property.name))
        m.lateRead.set(n.property.name, n.loc.start.line);
    }
  });
}
// rule 2: imported names exist
for (const rel of order)
  for (const [t, list] of Object.entries(mods[rel].imports))
    for (const { name, line } of list)
      if (name !== "*" && !mods[t].exports.has(name))
        err(rel, line, `imports ${name} from ${t}, which does not export it`);
// rule 3: LATE
const giver = new Map();
for (const rel of order)
  for (const [nm, line] of mods[rel].lateGive) {
    if (giver.has(nm))
      err(rel, line, `LATE.${nm} is already handed over by ${giver.get(nm)}`);
    else giver.set(nm, rel);
  }
const lateUsers = new Map();
for (const rel of order)
  for (const [nm, line] of mods[rel].lateRead) {
    const g = giver.get(nm);
    if (!g) err(rel, line, `reads LATE.${nm}, which no module hands over`);
    else if (g === rel)
      continue; // its own hand-over (e.g. a getter) – not a use
    else if (idx.get(g) < idx.get(rel))
      err(
        rel,
        line,
        `reads LATE.${nm}, but ${g} loads earlier – import it instead`,
      );
    (lateUsers.get(nm) || lateUsers.set(nm, []).get(nm)).push(rel);
  }
for (const [nm, g] of giver)
  if (!lateUsers.has(nm))
    err(
      g,
      mods[g].lateGive.get(nm),
      `hands over LATE.${nm}, but no module reads it`,
    );

// ---- report ----
const usedBy = (rel) => order.filter((o) => mods[o].imports[rel]);
const rows = order.map((rel) => {
  const m = mods[rel];
  return {
    module: rel,
    lines: m.lines,
    imports: Object.fromEntries(
      Object.entries(m.imports).map(([k, v]) => [k, v.map((x) => x.name)]),
    ),
    libraries: [...m.libs],
    exports: [...m.exports],
    usedBy: usedBy(rel),
    lateReads: [...m.lateRead.keys()].filter((nm) => giver.get(nm) !== rel),
    lateGives: [...m.lateGive.keys()],
    window: [...m.win],
  };
});
const one = arg("--module");
if (one) {
  const r = rows.find((x) => x.module === one);
  if (!r) {
    console.error("unknown module " + one);
    process.exit(2);
  }
  console.log(JSON.stringify(r, null, 1));
  process.exit(0);
}
const out = arg("--json");
if (out)
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        order,
        late: Object.fromEntries(
          [...giver].map(([n, g]) => [
            n,
            { owner: g, users: lateUsers.get(n) || [] },
          ]),
        ),
        modules: rows,
      },
      null,
      1,
    ),
  );
if (process.argv.includes("--late"))
  for (const [nm, g] of [...giver].sort(
    (a, b) => idx.get(a[1]) - idx.get(b[1]),
  ))
    console.log(
      `  LATE.${nm.padEnd(16)} ${g.padEnd(26)} <- ${(lateUsers.get(nm) || []).join(", ")}`,
    );
for (const e of errors) console.log("ERROR " + e);
const edges = rows.reduce((s, r) => s + Object.keys(r.imports).length, 0);
const win = new Set(rows.flatMap((r) => r.window));
console.log(
  `deps: ${order.length} modules, ${edges} import edges (all upwards${errors.length ? " – see errors" : ""}), ${giver.size} names through LATE ` +
    `(against the load order), ${win.size} window names`,
);
// window names that more than one module writes – hooks into another module at run time (plan phase 2, building block 1: services instead)
const writers = new Map();
for (const rel of order)
  for (const nm of mods[rel].winWrite)
    (writers.get(nm) || writers.set(nm, []).get(nm)).push(rel);
// since phase 2 (23.10.2026) none is left: a second writer is an error – use a KERN service (core/kern.js) or a setter of the owner
const shared = [...writers].filter(([, w]) => w.length > 1);
for (const [nm, w] of shared)
  errors.push(
    `window.${nm} is written by several modules (${w.join(", ")}) – a hook into another module; use a KERN service (core/kern.js) or a setter of the owner`,
  );
if (shared.length) for (const e of errors.slice(-shared.length)) console.log("ERROR " + e);
const hubs = [...rows]
  .sort(
    (a, b) =>
      Object.keys(b.imports).length +
      b.usedBy.length -
      (Object.keys(a.imports).length + a.usedBy.length),
  )
  .slice(0, 5);
console.log(
  "  most connected: " +
    hubs
      .map(
        (r) =>
          `${r.module} (imports ${Object.keys(r.imports).length}, used by ${r.usedBy.length}, LATE ${r.lateReads.length})`,
      )
      .join("; "),
);
process.exit(errors.length ? 1 : 0);
