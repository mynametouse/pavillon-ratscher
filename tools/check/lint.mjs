// Lint the app module by module – real ES modules since refactor phase 1 (imports, exports; see docs/ARCHITECTURE.md) – with file and line.
//   node tools/check/lint.mjs            errors fail (exit 1); unused names are counted, listed with --verbose
//   node tools/check/lint.mjs --verbose  also list the warnings
// Names the page defines on window (window.X = …, and what build.py/site.js inject) count as declared globals: the manifests (TEXMAN, GEOMAN…)
// and the test interface. Everything else that is used but neither declared, imported nor global is reported (typos, a missing import).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import globals from "globals";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const APP = path.join(ROOT, "viz3");
const SRC = path.join(APP, "src");
const verbose = process.argv.includes("--verbose");

// the module list of viz3/build.py (modules.txt, in load order)
export function moduleFiles() {
  return fs
    .readFileSync(path.join(SRC, "modules.txt"), "utf8")
    .split("\n")
    .map((l) => l.split("#")[0].trim())
    .filter(Boolean);
}
const files = moduleFiles();
const parts = files.map((rel) => ({
  rel,
  text: fs.readFileSync(path.join(SRC, rel), "utf8"),
}));

// window.X assignments in the app, in build.py (manifests) and in site.js
const winNames = new Set();
const grab = (text, re) => {
  for (const m of text.matchAll(re)) winNames.add(m[1]);
};
for (const p of parts) grab(p.text, /window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g);
grab(
  fs.readFileSync(path.join(APP, "build.py"), "utf8"),
  /window\.([A-Za-z_$][\w$]*)\s*=/g,
);
grab(
  fs.readFileSync(path.join(APP, "site.js"), "utf8"),
  /window\.([A-Za-z_$][\w$]*)\s*=/g,
);

const RULES = {
  // real mistakes – fail the check
  "no-undef": "error",
  "no-dupe-keys": "error",
  "no-dupe-args": "error",
  "no-dupe-class-members": "error",
  "no-dupe-else-if": "error",
  "no-duplicate-case": "error",
  "no-const-assign": "error",
  "no-func-assign": "error",
  "no-import-assign": "error",
  "no-class-assign": "error",
  "no-redeclare": "error",
  "no-self-assign": "error",
  "no-unreachable": "error",
  "no-unsafe-negation": "error",
  "no-unsafe-finally": "error",
  "no-compare-neg-zero": "error",
  "no-loss-of-precision": "error",
  "use-isnan": "error",
  "valid-typeof": "error",
  "getter-return": "error",
  "no-setter-return": "error",
  "for-direction": "error",
  "no-obj-calls": "error",
  "no-new-native-nonconstructor": "error",
  // clean-up hints – counted, never fail
  "no-unused-vars": [
    "warn",
    { vars: "all", args: "none", caughtErrors: "none" },
  ],
};

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: {
          ...globals.browser,
          ...Object.fromEntries([...winNames].map((n) => [n, "writable"])),
        },
      },
      rules: RULES,
    },
  ],
});
const errs = [],
  warns = [];
for (const p of parts) {
  const [res] = await eslint.lintText(p.text, {
    filePath: path.join(SRC, p.rel),
  });
  for (const m of res.messages)
    (m.severity === 2 || m.fatal ? errs : warns).push({ ...m, file: p.rel });
}
// code trapped in an end-of-line comment ("x = 1; // note y = 2; z();" – the rest never runs). On 23.10.2026 two such lines were found that
// had silently switched off Hubert's tractor trip and the light restore after the far trees since the module split of V16e.
const espree = await import("espree").catch(() => null);
const TRAPPED =
  /;\s*(const|let|var|if|for|while|return)\b|;\s*[A-Za-z_$][\w$.[\]]*\s*(\(|[+\-*/]?=(?!=))/;
if (espree)
  for (const p of parts) {
    let ast;
    try {
      ast = espree.parse(p.text, {
        ecmaVersion: "latest",
        sourceType: "module",
        comment: true,
        loc: true,
      });
    } catch (e) {
      continue; // parse errors are reported by ESLint above
    }
    const lines = p.text.split("\n");
    for (const c of ast.comments) {
      if (c.type !== "Line") continue;
      const line = lines[c.loc.start.line - 1];
      if (!line.slice(0, c.loc.start.column).trim()) continue; // a comment of its own line
      if (TRAPPED.test(c.value))
        errs.push({
          file: p.rel,
          line: c.loc.start.line,
          column: c.loc.start.column + 1,
          ruleId: "trapped-code",
          message: "code after a // comment on the same line never runs – put it on its own line",
        });
    }
  }
const show = (m) =>
  `${m.file}:${m.line}:${m.column}  ${m.ruleId || "parse"}  ${m.message}`;
for (const m of errs) console.log("ERROR " + show(m));
if (verbose) for (const m of warns) console.log("warn  " + show(m));
const byFile = {};
for (const m of warns) byFile[m.file] = (byFile[m.file] || 0) + 1;
const top = Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([f, n]) => `${f} ${n}`)
  .join(", ");
console.log(
  `lint: ${errs.length} errors, ${warns.length} unused names in ${files.length} modules` +
    (warns.length ? ` (most: ${top}; list with --verbose)` : ""),
);
process.exit(errs.length ? 1 : 0);
