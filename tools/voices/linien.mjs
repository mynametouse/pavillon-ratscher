// Collects the fixed lines that are said as text and have no recording yet – the villagers (viz3/src/dorf/dorf_text.js: greetings,
// topics, the table talk in the school and at the fire), Hubert's and Ronald's table talk and muttering (viz3/src/npc/life.js) and their
// newer task lines (viz3/src/game/quests.js) – into tools/voices/linien.json for tools/voices/record_lines.py, which records them with a
// natural Edge voice per person on GitHub Actions (.github/workflows/stimmen.yml). In the game a line plays its recording when one has
// the same words (audio/stimme.js STIMME.say, loaded only when said). Run again after changing the texts:
//   node tools/voices/linien.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "..", "..", "viz3", "src");
const { DTEXT } = await import(path.join(SRC, "dorf", "dorf_text.js"));
const out = [];
const seen = new Set();
// the id: who + a hash of the words (FNV-1a), stable as long as the words stay
const fnv = (s) => {
  let h = 0x811c9dc5;
  for (const c of Buffer.from(s, "utf8"))
    h = Math.imul(h ^ c, 0x01000193) >>> 0;
  return h.toString(36);
};
function add(who, text) {
  text = String(text || "").trim();
  if (!who || !text || text.includes("{")) return;
  const k = who + ":" + text;
  if (seen.has(k)) return;
  seen.add(k);
  out.push({ who, id: `x_${who}_${fnv(text)}`, text });
}
// the greeting of the day: „{gruss}“ is good morning / hello / good evening by the clock (dorf/dorf.js)
const GRUSS = ["Guten Morgen", "Hallo", "Guten Abend"];
const each = (who, t) =>
  t.includes("{gruss}")
    ? GRUSS.forEach((g) => add(who, t.replace("{gruss}", g)))
    : add(who, t);
for (const [k, p] of Object.entries(DTEXT.P)) {
  for (const t of [
    ...(p.greet || []),
    ...(p.day || []),
    ...(p.dayRetired || []),
  ])
    each(k, t);
  for (const t of Object.values(p.topics || {}))
    for (const line of t.slice(1)) add(k, line);
}
for (const conv of [
  ...(DTEXT.TALK || []),
  ...(DTEXT.STORIES || []),
  ...(DTEXT.FIRE || []),
  DTEXT.STORY || [],
])
  for (const l of conv) if (Array.isArray(l) && DTEXT.P[l[0]]) add(l[0], l[1]);

// Hubert and Ronald: the table talk (TALKS), the muttering at work (MUTTER) in npc/life.js
const unq = (s) => s.replace(/\\'/g, "'");
const STR = /'((?:[^'\\]|\\.)*)'/g;
const life = fs.readFileSync(path.join(SRC, "npc", "life.js"), "utf8");
const talks = life.slice(
  life.indexOf("const TALKS = ["),
  life.indexOf("const TALK = {"),
);
for (const m of talks.matchAll(/\['([hr])',\s*'((?:[^'\\]|\\.)*)'\]/g))
  add(m[1] === "h" ? "hubert" : "ronald", unq(m[2]));
const mutter = life.slice(
  life.indexOf("const MUTTER = {"),
  life.indexOf("const muttered"),
);
const OWNER = {
  chop: "hubert",
  saw: "hubert",
  stack: "hubert",
  car: "hubert",
  putter: "hubert",
};
for (const m of mutter.matchAll(/(\w+):\s*\[([\s\S]*?)\]/g))
  for (const s of m[2].matchAll(STR)) add(OWNER[m[1]] || "ronald", unq(s[1]));

// their task lines in game/quests.js: H().sayText('…') / R().sayText('…'), the text arrays of ask() (Hubert's branch, then Ronald's)
const q = fs.readFileSync(path.join(SRC, "game", "quests.js"), "utf8");
for (const m of q.matchAll(/\b([HR])\(\)\s*\.sayText\(\s*'((?:[^'\\]|\\.)*)'/g))
  add(m[1] === "H" ? "hubert" : "ronald", unq(m[2]));
const a0 = q.indexOf("function ask(who, k) {"),
  a1 = q.indexOf("\n  }\n", a0),
  ask = q.slice(a0, a1),
  split = ask.indexOf("\n    else\n");
for (const [who, part] of [
  ["hubert", ask.slice(0, split)],
  ["ronald", ask.slice(split)],
])
  for (const m of part.matchAll(/text: \[([\s\S]*?)\],\n/g)) {
    // a line made of a choice and a tail ('a' or 'b') + ' tail': both variants
    const body = m[1];
    const tern =
      /\(\s*[^?]+\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\s*\)\s*\+\s*'((?:[^'\\]|\\.)*)'/.exec(
        body,
      );
    if (tern) {
      add(who, unq(tern[1] + tern[3]));
      add(who, unq(tern[2] + tern[3]));
    }
    const rest = tern ? body.replace(tern[0], "") : body;
    for (const s of rest.matchAll(STR)) add(who, unq(s[1]));
  }

fs.writeFileSync(
  path.join(here, "linien.json"),
  JSON.stringify(out, null, 1) + "\n",
);
const by = out.reduce((o, l) => ((o[l.who] = (o[l.who] || 0) + 1), o), {});
console.log(
  out.length,
  "lines",
  JSON.stringify(by),
  Math.round(out.reduce((s, l) => s + l.text.length, 0) / 1000),
  "k chars",
);
