// One-time conversion (refactor phase 1, plan: project document claude/pavillon-umbau.md): the modules of viz3/src/modules.txt stop
// sharing one scope and become real ES modules.
//   node tools/check/esm_convert.mjs        converts viz3/src in place (clean tree first; afterwards prettier --write and git diff)
// Rules
// - a top-level name another module uses gets `export`; a module further down imports it (relative path). three.js, its addons, n8ao and
//   ez-tree are imported straight from their source, the same way core/head.js does.
// - a name of a module further DOWN the list (it loads later) is not imported: a static import would load that module first and change
//   the load order (scene, lights, merges). Its module hands it to LATE (core/late.js) when it loads – functions at the top (they exist
//   from the start), constants right after their declaration, let-variables as a getter – and the user reads LATE.<name> when it runs.
// - no module may assign another module's variable (imports are read-only); esm_plan.mjs lists such writes – they must be gone first.
// Kept for branches that still have the shared scope: run it there, then compare with src.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import * as escope from "eslint-scope";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const SRC = path.join(ROOT, "viz3", "src");
const LIST = path.join(SRC, "modules.txt");
const LATE_REL = "core/late.js";
const listText = fs.readFileSync(LIST, "utf8");
const order = listText
  .split("\n")
  .map((l) => l.split("#")[0].trim())
  .filter(Boolean);
if (order.includes(LATE_REL)) {
  console.error(
    "esm_convert: already converted (modules.txt lists " + LATE_REL + ")",
  );
  process.exit(1);
}
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
function walk(node, fn) {
  if (!node || typeof node.type !== "string") return;
  fn(node);
  for (const k in node) {
    const v = node[k];
    if (Array.isArray(v))
      for (const c of v) c && typeof c.type === "string" && walk(c, fn);
    else if (v && typeof v.type === "string") walk(v, fn);
  }
}
const rel2 = (from, to) => {
  let r = path.posix.relative(path.posix.dirname(from), to);
  return r.startsWith(".") ? r : "./" + r;
};

// ---- pass 1: who declares what ----
const M = {};
const owner = new Map(); // name -> module
const kind = new Map(); // name -> function | class | const | let | var | import
const stmtOf = new Map(); // name -> top-level statement node
const lib = new Map(); // name -> { source, imported } for the library imports (core/head.js)
for (const rel of order) {
  const code = fs.readFileSync(path.join(SRC, rel), "utf8");
  const ast = parse(code);
  M[rel] = { code, ast };
  const decl = (nm, k, stmt) => {
    if (owner.has(nm))
      throw new Error(`${nm} declared in ${owner.get(nm)} and ${rel}`);
    owner.set(nm, rel);
    kind.set(nm, k);
    stmtOf.set(nm, stmt);
  };
  for (const n of ast.body) {
    if (n.type === "FunctionDeclaration") decl(n.id.name, "function", n);
    else if (n.type === "ClassDeclaration") decl(n.id.name, "class", n);
    else if (n.type === "VariableDeclaration")
      for (const d of n.declarations) {
        const a = [];
        names(d.id, a);
        for (const x of a) decl(x, n.kind, n);
      }
    else if (n.type === "ImportDeclaration") {
      // in the shared scope a relative import is relative to src/ (the bundle entry _main.js lives there), not to the module
      let src = n.source.value;
      if (src.startsWith(".")) {
        src = path.posix.normalize(src);
        const fixed = rel2(rel, src);
        if (fixed !== n.source.value)
          (M[rel].fix = M[rel].fix || []).push([
            n.source.start,
            n.source.end,
            `'${fixed}'`,
          ]);
      }
      for (const s of n.specifiers) {
        decl(s.local.name, "import", n);
        lib.set(s.local.name, {
          source: src,
          relative: n.source.value.startsWith("."),
          imported:
            s.type === "ImportNamespaceSpecifier"
              ? "*"
              : s.type === "ImportDefaultSpecifier"
                ? "default"
                : s.imported.name,
        });
      }
    } else if (n.type.startsWith("Export"))
      throw new Error(`${rel}: already has exports`);
  }
}

// ---- pass 2: what every module needs ----
const need = {}; // rel -> { imports: Map(module -> Set), libs: Map(source -> [{imported, local}]), late: Set, edits: [] }
const exported = new Map(order.map((r) => [r, new Set()]));
const provide = new Map(order.map((r) => [r, new Map()])); // owner -> name -> Set(users)
for (const [i, rel] of order.entries()) {
  const { ast } = M[rel];
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: "module" });
  const ms = sm.scopes.find((s) => s.type === "module");
  const shorthand = new Set();
  walk(ast, (n) => {
    if (n.type === "ObjectExpression")
      for (const p of n.properties)
        if (
          p.type === "Property" &&
          p.shorthand &&
          p.value.type === "Identifier"
        )
          shorthand.add(p.value.start);
  });
  const N = (need[rel] = {
    imports: new Map(),
    libs: new Map(),
    late: new Set(),
    edits: [],
  });
  for (const ref of ms.through) {
    const nm = ref.identifier.name,
      id = ref.identifier;
    const o = owner.get(nm);
    if (!o) continue; // browser global or a window name injected by the page (TEXMAN, GEOMAN, …)
    if (ref.isWrite())
      throw new Error(
        `${rel}:${id.loc.start.line} assigns ${nm} of ${o} – replace it by a setter first`,
      );
    if (lib.has(nm)) {
      const L = lib.get(nm);
      const list = N.libs.get(L.source) || [];
      if (!list.some((x) => x.local === nm))
        list.push({ imported: L.imported, local: nm, relative: L.relative });
      N.libs.set(L.source, list);
      continue;
    }
    const oi = order.indexOf(o);
    if (oi < i) {
      (N.imports.get(o) || N.imports.set(o, new Set()).get(o)).add(nm);
      exported.get(o).add(nm);
    } else {
      N.late.add(nm);
      const p = provide.get(o);
      (p.get(nm) || p.set(nm, new Set()).get(nm)).add(rel);
      N.edits.push([
        id.start,
        id.end,
        shorthand.has(id.start) ? `${nm}: LATE.${nm}` : `LATE.${nm}`,
      ]);
    }
  }
}

// ---- pass 3: write the modules ----
const lineEnd = (code, pos) => {
  const k = code.indexOf("\n", pos);
  return k < 0 ? code.length : k + 1;
};
let nImports = 0,
  nExports = 0;
const lateRows = [];
for (const [, rel] of order.entries()) {
  const { code, ast } = M[rel];
  const N = need[rel];
  const edits = N.edits.concat(M[rel].fix || []);
  // export keyword, once per statement
  const exportStmts = new Set(
    [...exported.get(rel)].map((nm) => stmtOf.get(nm)),
  );
  for (const s of exportStmts) {
    edits.push([s.start, s.start, "export "]);
    nExports++;
  }
  // hand-overs to LATE
  const prov = provide.get(rel);
  const fnProv = [],
    byStmt = new Map();
  for (const [nm, users] of prov) {
    lateRows.push({
      name: nm,
      owner: rel,
      kind: kind.get(nm),
      users: [...users],
    });
    if (kind.get(nm) === "function") fnProv.push(nm);
    else
      (
        byStmt.get(stmtOf.get(nm)) ||
        byStmt.set(stmtOf.get(nm), []).get(stmtOf.get(nm))
      ).push(nm);
  }
  for (const [s, nms] of byStmt) {
    const vars = nms.filter(
      (nm) => kind.get(nm) === "let" || kind.get(nm) === "var",
    );
    const consts = nms.filter((nm) => !vars.includes(nm));
    const lines = [];
    if (consts.length)
      lines.push(
        consts.length === 1
          ? `LATE.${consts[0]} = ${consts[0]};`
          : `Object.assign(LATE, { ${consts.join(", ")} });`,
      );
    for (const v of vars)
      lines.push(
        `Object.defineProperty(LATE, '${v}', { get: () => ${v}, enumerable: true });`,
      );
    edits.push([
      lineEnd(code, s.end),
      lineEnd(code, s.end),
      lines.join("\n") + "\n",
    ]);
  }
  // header: imports (+ functions handed to LATE – hoisted, so they can go first)
  const head = [];
  for (const [src, list] of [...N.libs].sort(
    (a, b) => libRank(a[0]) - libRank(b[0]),
  )) {
    const spec = list[0].relative ? rel2(rel, src) : src;
    const ns = list.find((x) => x.imported === "*");
    if (ns) head.push(`import * as ${ns.local} from '${spec}';`);
    const def = list.find((x) => x.imported === "default");
    const named = list
      .filter((x) => x.imported !== "*" && x.imported !== "default")
      .map((x) =>
        x.imported === x.local ? x.local : `${x.imported} as ${x.local}`,
      );
    if (def || named.length)
      head.push(
        `import ${[def ? def.local : null, named.length ? `{ ${named.join(", ")} }` : null].filter(Boolean).join(", ")} from '${spec}';`,
      );
    nImports++;
  }
  if (N.late.size || prov.size) {
    head.push(`import { LATE } from '${rel2(rel, LATE_REL)}';`);
    nImports++;
  }
  for (const o of order)
    if (N.imports.has(o)) {
      const nms = [...N.imports.get(o)].sort(
        (a, b) =>
          a.localeCompare(b, "en", { sensitivity: "base" }) || (a < b ? -1 : 1),
      );
      head.push(`import { ${nms.join(", ")} } from '${rel2(rel, o)}';`);
      nImports++;
    }
  if (fnProv.length) {
    const users = [...new Set(fnProv.flatMap((nm) => [...prov.get(nm)]))];
    head.push(
      `Object.assign(LATE, { ${fnProv.join(", ")} }); // functions for modules that load earlier: ${users.join(", ")}`,
    );
  }
  // insert after the comment block the file starts with
  let at = 0;
  if (head.length) {
    const lines = code.split("\n");
    let k = 0,
      pos = 0;
    while (k < lines.length && /^\s*\/\//.test(lines[k]))
      pos += lines[k++].length + 1;
    at = k > 0 && ast.body.length && ast.body[0].start >= pos ? pos : 0;
    edits.push([at, at, head.join("\n") + "\n"]);
  }
  // apply (back to front; insertions at the same place keep their order)
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let out = code;
  let last = Infinity;
  for (const [s, e, t] of edits) {
    if (e > last) throw new Error(`${rel}: overlapping edits at ${s}`);
    out = out.slice(0, s) + t + out.slice(e);
    last = s;
  }
  parse(out); // still valid
  fs.writeFileSync(path.join(SRC, rel), out);
}
function libRank(src) {
  const i = [...lib.values()].findIndex((L) => L.source === src);
  return i < 0 ? 999 : i;
}

// ---- core/late.js and modules.txt ----
fs.writeFileSync(
  path.join(SRC, LATE_REL),
  `// ===================== LATE: references against the load order (refactor phase 1) =====================
// The modules load in the order of modules.txt and import only from modules above them: a static import of a module further down would load
// that one first and change the load order (scene, lights, merges). Where a module still needs something of a module further down, that
// module hands it over here when it loads, and the user reads it when it runs – never while it loads:
//   world/roads.js:  LATE.ROADS = ROADS;        garden/env.js:  LATE.ROADS.surface(x, y)
// Functions are handed over at the top of their module (they exist from the start), let-variables as getters (always the current value).
// Every entry is a place where the layers still point the wrong way; the services of phase 2 replace them (tools/check/deps.mjs lists them).
export const LATE = {};
`,
);
const newList = listText.replace(
  /^(core\/save\.js)/m,
  `${LATE_REL.padEnd(27)} # LATE: what a module needs from a module further down (handed over when that one loads)\n$1`,
);
if (newList === listText)
  throw new Error("modules.txt: core/save.js not found");
fs.writeFileSync(LIST, newList);
lateRows.sort(
  (a, b) =>
    order.indexOf(a.owner) - order.indexOf(b.owner) ||
    a.name.localeCompare(b.name),
);
console.log(
  `esm_convert: ${order.length} modules, ${nImports} import lines, ${nExports} exported statements, ${lateRows.length} names through LATE`,
);
for (const r of lateRows)
  console.log(
    `  LATE.${r.name.padEnd(16)} ${r.kind.padEnd(9)} ${r.owner.padEnd(26)} <- ${r.users.join(", ")}`,
  );
