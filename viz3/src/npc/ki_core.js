// ===================== KI core: memory, prompts, tools and their effects for free conversations with Hubert and Ronald (Falko, 25.10.2026) =====================
// Pure logic without the page (unit tests: viz3/test/unit/ki.test.mjs): what a neighbour remembers about the player (opinion 0–100, notes,
// short summaries of earlier talks, news to pass on to the other one), the prompt of one conversation (a fixed character part that the API
// caches, the memory, then each turn a <lage> block with the situation before the player's words), the tools the model may call and what
// they do (opinion, notes, a task as data for TASKS, one of the old tasks of game/quests.js, an activity of npc/life.js, the end of the
// talk), the summary after a talk (with the gossip for the next time the two sit at the table) and the sentence splitter that hands
// streamed text to the voice one sentence at a time. The conversation is append-only (thinking blocks and the prompt cache need the history
// unchanged): the situation goes into each new user turn, never into the system prompt of a running talk. npc/ki.js does the rest.
import { KI_CHARS, KI_ORTE, KI_PLAYERS, KI_TAETIGKEIT, KI_TUN, KI_WORLD } from './ki_text.js';

export const KI_MODEL = 'claude-haiku-5-5'; // Falko: a very fast, very token-efficient model (Haiku)
export const MEM_KEY = 'pav-ki-v1';
export const WHO = ['hubert', 'ronald'];
const START = { hubert: 35, ronald: 45 }; // as in the campaign (amt/amt_data.js rep0)
const MAX = { notizen: 30, gespraeche: 8, klatsch: 3, erledigt: 6, tasks: 12 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const str = (s, n) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '');

// ---------------- memory (one saved value, SAVE key pav-ki-v1) ----------------
function whoDefault(k) {
  return { meinung: START[k], notizen: [], gespraeche: [], klatsch: [], erledigt: [], tell: [], neu: [], n: 0 };
}
export function memDefault() {
  return { v: 1, who: { hubert: whoDefault('hubert'), ronald: whoDefault('ronald') }, tasks: [], seq: 0 };
}
const arr = (a, n, f) => (Array.isArray(a) ? a.map(f).filter(Boolean).slice(-n) : []);
// a stored memory, repaired: unknown or broken parts fall back to the defaults (SAVE gives the default when this returns null)
export function memCheck(m) {
  if (!m || typeof m !== 'object' || m.v !== 1 || !m.who) return null;
  const out = memDefault();
  for (const k of WHO) {
    const w = m.who[k];
    if (!w || typeof w !== 'object') continue;
    const o = out.who[k];
    if (Number.isFinite(w.meinung)) o.meinung = clamp(Math.round(w.meinung), 0, 100);
    o.n = Number.isInteger(w.n) && w.n >= 0 ? w.n : 0;
    o.notizen = arr(w.notizen, MAX.notizen, x =>
      x && str(x.text, 240) ? { t: x.t | 0, text: str(x.text, 240), von: WHO.includes(x.von) ? x.von : 'selbst' } : null
    );
    o.gespraeche = arr(w.gespraeche, MAX.gespraeche, x =>
      x && str(x.text, 400) ? { t: x.t | 0, text: str(x.text, 400) } : null
    );
    o.klatsch = arr(w.klatsch, MAX.klatsch, x => klatschCheck(x));
    o.erledigt = arr(w.erledigt, MAX.erledigt, x => str(x, 120) || null);
    o.tell = arr(w.tell, 4, x => str(x, 240) || null); // to pass on after the talk (merken with weitererzaehlen)
    o.neu = arr(w.neu, MAX.erledigt, x => str(x, 120) || null); // finished since the last talk (said in the next one)
  }
  out.tasks = arr(m.tasks, MAX.tasks, t => taskCheck(t));
  out.seq = Number.isInteger(m.seq) && m.seq >= 0 ? m.seq : out.tasks.length;
  return out;
}
function klatschCheck(x) {
  if (!x || !Array.isArray(x.zeilen)) return null;
  const zeilen = x.zeilen
    .filter(z => Array.isArray(z) && (z[0] === 'h' || z[0] === 'r') && str(z[1], 300))
    .map(z => [z[0], str(z[1], 300)])
    .slice(0, 8);
  if (!zeilen.length) return null;
  return { zeilen, notiz: str(x.notiz, 240), meinung: clamp(Math.round(+x.meinung || 0), -10, 10) };
}
function taskCheck(t) {
  if (!t || typeof t.id !== 'string' || !WHO.includes(t.who) || !str(t.titel, 80) || !Array.isArray(t.schritte))
    return null;
  const schritte = t.schritte.map(s => stepCheck(s)).filter(Boolean);
  if (!schritte.length) return null;
  return {
    id: t.id,
    who: t.who,
    titel: str(t.titel, 80),
    schritte,
    belohnung: clamp(Math.round(+t.belohnung || 0), 0, 20),
  };
}
function stepCheck(s) {
  if (!s || !str(s.text, 160)) return null;
  if (s.art === 'ort' && KI_ORTE[s.ziel]) return { art: 'ort', ziel: s.ziel, text: str(s.text, 160) };
  if (s.art === 'tun' && KI_TUN[s.ziel]) return { art: 'tun', ziel: s.ziel, text: str(s.text, 160) };
  return null;
}
// a note (deduplicated, the newest last); von: 'selbst' or the neighbour who told it
export function addNote(mem, who, text, von = 'selbst', day = 0) {
  const t = str(text, 240);
  if (!t) return false;
  const L = mem.who[who].notizen;
  const i = L.findIndex(n => n.text.toLowerCase() === t.toLowerCase());
  if (i >= 0) L.splice(i, 1);
  L.push({ t: day, text: t, von });
  if (L.length > MAX.notizen) L.splice(0, L.length - MAX.notizen);
  return true;
}
// the opinion moves at most 15 points per call (a finished task: its reward, up to 20) and stays within 0–100; returns the new value
export function opinion(mem, who, delta, lim = 15) {
  const w = mem.who[who];
  const d = clamp(Math.round(+delta || 0), -lim, lim);
  w.meinung = clamp(w.meinung + d, 0, 100);
  return w.meinung;
}
export function likes(mem, who) {
  return mem.who[who].meinung >= 65;
}
// words for the opinion, as the neighbour would put it (prompt; journal)
export function meinungWort(v) {
  if (v >= 85) return 'du magst ihn sehr und vertraust ihm';
  if (v >= 65) return 'du magst ihn';
  if (v >= 45) return 'du findest ihn ganz in Ordnung, kennst ihn aber noch nicht richtig';
  if (v >= 25) return 'du bist skeptisch und hältst Abstand';
  return 'du kannst ihn nicht leiden';
}

// ---------------- prompts ----------------
// the fixed part (character, world, rules) – the same for every talk with this neighbour, so the API caches it (cache_control)
export function systemFixed(who) {
  const C = KI_CHARS[who],
    O = KI_CHARS[C.other].name;
  return `${C.sheet}

Was du über die Gegend weißt:
${KI_WORLD}

So läuft das Gespräch:
- Jemand aus dem Nachbargarten spricht dich an. Was er sagt, kommt aus einer Spracherkennung und kann Hörfehler enthalten – versteh es wohlwollend, so wie man im echten Leben nachfragt oder es richtig deutet.
- Vor seinen Worten steht in <lage>…</lage>, was du gerade siehst und weißt (Uhrzeit, Ort, laufende Aufgaben, was er in der Hand hat). Das sagt er nicht, das weißt du einfach. Erwähne es nur, wenn es passt.
- Du antwortest nur mit dem, was ${C.name} laut sagt: gesprochenes Deutsch, keine Regieanweisungen, keine Sternchen, keine Aufzählungen, kein Markdown, keine Emojis. Halte dich kurz wie im echten Gespräch – meist ein bis drei Sätze, eine Frage zurück ist erlaubt.
- Du bist ${C.name} und bleibst es. Du bist kein Assistent und kein Computerprogramm; fragt dich jemand danach, reagierst du verwundert wie ${C.name}. Du weißt nur, was ein Nachbar wissen kann; kleine Alltagsdinge darfst du erfinden, aber nichts, was den Tatsachen oben widerspricht.
- Duzen: Im Dorf duzen sich alle, du duzt dein Gegenüber.
- Du hast Werkzeuge. Sag erst, was du sagen willst, und benutze dann die Werkzeuge; schreib nie über die Werkzeuge selbst. Wenn kein Werkzeug passt, versprich nichts, was das Spiel nicht kann.
  • meinung_aendern, wenn dich etwas wirklich freut oder ärgert (Hilfe, Lob, Frechheit, Lügen) – nicht bei jedem Satz.
  • merken für Dinge, die du dir über dein Gegenüber merken willst (Pläne, Vorlieben, Versprechen, was er erzählt hat). Mit weitererzaehlen = true erzählst du es ${O}, wenn ihr das nächste Mal am Tisch sitzt.
  • aufgabe_geben, wenn du um Hilfe bittest oder dein Gegenüber etwas für dich tun will. Nur aus den Orten und Tätigkeiten, die das Werkzeug kennt; danach soll er zu dir zurückkommen. Höchstens eine neue Aufgabe pro Gespräch, und nur, wenn es passt.
  • spielaufgabe, wenn das Gespräch zu einem der Themen in <lage> unter „Spielaufgaben“ führt – dann startet oder erledigt das die Aufgabe im Spiel; sag sinngemäß, was im Ergebnis steht.
  • taetigkeit, wenn du nach dem Gespräch etwas anderes tun willst (zum Beispiel ${who === 'hubert' ? 'mit dem Traktor ins Dorf fahren' : 'zu Hubert rübergehen'}).
  • gespraech_beenden, wenn du keine Lust mehr hast oder alles gesagt ist – nach deinem letzten Satz.`;
}
// what this neighbour remembers about the player – part of the system prompt of the next talk (not changed while one runs)
export function systemMemory(mem, who, player = 'Falko') {
  const w = mem.who[who],
    P = KI_PLAYERS[player] || player,
    O = KI_CHARS[KI_CHARS[who].other].name;
  const own = w.notizen.filter(n => n.von === 'selbst').map(n => '- ' + n.text);
  const heard = w.notizen.filter(n => n.von !== 'selbst').map(n => '- ' + n.text);
  const talks = w.gespraeche.map(g => '- ' + g.text);
  return [
    `Dein Gegenüber ist ${P}. Deine Meinung über ihn: ${w.meinung} von 100 – ${meinungWort(w.meinung)}. Danach richtet sich, wie freundlich und geduldig du bist.`,
    w.n ? `Ihr habt schon ${w.n}-mal miteinander geredet.` : 'Ihr redet heute zum ersten Mal richtig miteinander.',
    talks.length ? 'Frühere Gespräche:\n' + talks.join('\n') : '',
    own.length ? 'Was du dir gemerkt hast:\n' + own.join('\n') : '',
    heard.length ? `Was dir ${O} erzählt hat:\n` + heard.join('\n') : '',
    w.erledigt.length ? 'Was er für dich erledigt hat: ' + w.erledigt.join('; ') + '.' : '',
  ]
    .filter(Boolean)
    .join('\n');
}
export function systemBlocks(mem, who, player) {
  return [
    { type: 'text', text: systemFixed(who), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: systemMemory(mem, who, player) },
  ];
}
// the situation before the player's words in each turn: { zeit, ort, haelt, phase, aufgaben: [text], themen: [{ k, label }],
// begruessung, meinung, neu: [text] (just finished tasks of this neighbour) }
export function situation(s) {
  const L = [];
  if (s.zeit) L.push('Zeit: ' + s.zeit);
  if (s.ort) L.push('Ort: ' + s.ort);
  if (s.haelt) L.push('Er hat in der Hand: ' + s.haelt);
  if (s.phase) L.push('Baustand drüben: ' + s.phase);
  if (s.aufgaben && s.aufgaben.length) L.push('Seine laufenden Aufgaben: ' + s.aufgaben.join('; '));
  if (s.neu && s.neu.length) L.push('Gerade für dich erledigt: ' + s.neu.join('; '));
  if (s.themen && s.themen.length)
    L.push(
      'Spielaufgaben (Werkzeug spielaufgabe, thema = Schlüssel): ' + s.themen.map(t => `${t.k} „${t.label}“`).join(', ')
    );
  if (Number.isFinite(s.meinung)) L.push('Deine Meinung über ihn gerade: ' + s.meinung + '/100');
  if (s.begruessung) L.push('Du hast ihn eben begrüßt mit: „' + s.begruessung + '“');
  return '<lage>\n' + L.join('\n') + '\n</lage>';
}

// ---------------- tools ----------------
const obj = (props, req = Object.keys(props)) => ({
  type: 'object',
  properties: props,
  required: req,
  additionalProperties: false,
});
export function tools(who) {
  const act = KI_TAETIGKEIT[who];
  const label = v => (typeof v === 'string' ? v : v.label);
  const T = [
    {
      name: 'meinung_aendern',
      description:
        'Deine Meinung über dein Gegenüber ändert sich wegen dem, was gerade gesagt oder getan wurde. delta: ganze Zahl von -15 (sehr verärgert) bis +15 (sehr erfreut), meist -5 bis +5. Nur bei echtem Anlass.',
      input_schema: obj({
        delta: { type: 'integer' },
        grund: { type: 'string', description: 'kurz, aus deiner Sicht' },
      }),
    },
    {
      name: 'merken',
      description:
        'Merk dir etwas über dein Gegenüber oder das Gespräch für später (ein kurzer Satz aus deiner Sicht, z. B. „Falko will im Frühjahr einen Teich graben.“). weitererzaehlen: true, wenn du es dem anderen Nachbarn erzählen willst.',
      input_schema: obj({ notiz: { type: 'string' }, weitererzaehlen: { type: 'boolean' } }),
    },
    {
      name: 'aufgabe_geben',
      description:
        'Gib deinem Gegenüber eine Aufgabe, die er im Spiel erledigen kann. Ein bis drei Schritte; danach kommt er von selbst zu dir zurück. art "ort": hingehen, ziel einer von: ' +
        Object.entries(KI_ORTE)
          .map(([k, o]) => `${k} (${o.label})`)
          .join(', ') +
        '. art "tun": etwas tun, ziel einer von: ' +
        Object.entries(KI_TUN)
          .map(([k, o]) => `${k} (${o.label})`)
          .join(', ') +
        '. text: was er tun soll, in deinen Worten (kurz, du-Form). belohnung: 0 bis 20, wie sehr es deine Meinung über ihn hebt, wenn er es erledigt.',
      input_schema: obj({
        titel: { type: 'string', description: 'kurzer Titel fürs Tagebuch' },
        schritte: {
          type: 'array',
          items: obj({
            art: { type: 'string', enum: ['ort', 'tun'] },
            ziel: { type: 'string' },
            text: { type: 'string' },
          }),
        },
        belohnung: { type: 'integer' },
      }),
    },
    {
      name: 'spielaufgabe',
      description:
        'Startet oder erledigt eine der Spielaufgaben, die in <lage> unter „Spielaufgaben“ stehen (thema = ihr Schlüssel, z. B. q_hilfe). Das Ergebnis sagt dir, was dabei wichtig ist – sag das sinngemäß in deinen Worten.',
      input_schema: obj({ thema: { type: 'string' } }),
    },
    {
      name: 'taetigkeit',
      description:
        'Was du nach dem Gespräch tust (für eine Weile, dann wieder dein normaler Tag). was einer von: ' +
        Object.entries(act)
          .map(([k, v]) => `${k} (${label(v)})`)
          .join(', ') +
        '.',
      input_schema: obj({ was: { type: 'string', enum: Object.keys(act) } }),
    },
    {
      name: 'gespraech_beenden',
      description:
        'Beendet das Gespräch nach deinem letzten Satz (du hast keine Lust mehr, musst weiter, oder alles ist gesagt).',
      input_schema: obj({}, []),
    },
  ];
  // the tool inputs are small, but streamed requests with client tools get eager input streaming (the inputs are checked here anyway)
  return T.map(t => ({ ...t, eager_input_streaming: true }));
}
// a task of a neighbour from the model's input → a stored record (null + why when nothing usable came)
export function buildTask(mem, who, input) {
  const titel = str(input && input.titel, 80);
  if (!titel) return { err: 'titel fehlt' };
  const raw = Array.isArray(input.schritte) ? input.schritte.slice(0, 3) : [];
  const schritte = raw.map(s => stepCheck(s));
  const bad = raw.filter((s, i) => !schritte[i]).map(s => (s && s.ziel) || '?');
  if (!schritte.length || bad.length)
    return {
      err:
        (bad.length ? 'unbekanntes ziel: ' + bad.join(', ') + '. ' : 'keine Schritte. ') +
        'Erlaubt sind bei art "ort": ' +
        Object.keys(KI_ORTE).join(', ') +
        '; bei art "tun": ' +
        Object.keys(KI_TUN).join(', ') +
        '.',
    };
  if (mem.tasks.some(t => t.who === who && t.titel === titel)) return { err: 'diese Aufgabe hat er schon' };
  mem.seq++;
  const rec = {
    id: `ki-${who}-${mem.seq}`,
    who,
    titel,
    schritte,
    belohnung: clamp(Math.round(+input.belohnung || 0), 0, 20),
  };
  mem.tasks.push(rec);
  if (mem.tasks.length > MAX.tasks) mem.tasks.splice(0, mem.tasks.length - MAX.tasks);
  return { rec };
}
// the task as data for TASKS (core/tasks.js): its steps, then back to the neighbour. env: { near(spot, r) → bool, npcAt(who) → [x, y] | null,
// spotAt(spot) → [x, y] | null }
export function taskDef(rec, env) {
  const Name = KI_CHARS[rec.who].name;
  const steps = rec.schritte.map(s => {
    if (s.art === 'tun') {
      const d = KI_TUN[s.ziel];
      return { text: s.text, on: d.on, when: d.when };
    }
    const o = KI_ORTE[s.ziel];
    const st = { text: s.text, target: o.spot ? () => env.spotAt(o.spot) : null };
    if (o.re) Object.assign(st, { on: 'place', when: d => !!d && o.re.test(String(d.name || '')) });
    if (o.spot) st.check = () => env.near(o.spot, o.r || 6);
    return st;
  });
  steps.push({
    text: `Geh zurück zu ${Name} und sag Bescheid.`,
    on: 'talk',
    when: d => !!d && d.who === rec.who,
    target: () => env.npcAt(rec.who),
  });
  return { id: rec.id, title: rec.titel, who: Name, steps, done: `${Name} weiß Bescheid.` };
}
// one tool call → { text (the tool result for the model), error, fx: [effects for npc/ki.js] }; env: { day, quest(k) → { ok, text } ,
// themen: [{ k, label }] }
export function runTool(mem, who, name, input, env = {}) {
  const day = env.day || 0;
  const fx = [];
  const ok = (text, ...f) => ({ text, error: false, fx: fx.concat(f) });
  const bad = text => ({ text, error: true, fx });
  const I = input && typeof input === 'object' ? input : {};
  switch (name) {
    case 'meinung_aendern': {
      if (!Number.isFinite(+I.delta)) return bad('delta muss eine Zahl sein');
      const before = mem.who[who].meinung,
        now = opinion(mem, who, I.delta);
      return ok(`Meinung jetzt ${now}/100.`, { k: 'meinung', who, from: before, to: now, grund: str(I.grund, 120) });
    }
    case 'merken': {
      if (!addNote(mem, who, I.notiz, 'selbst', day)) return bad('notiz fehlt');
      if (I.weitererzaehlen === true) mem.who[who].tell = mem.who[who].tell.concat(str(I.notiz, 240)).slice(-4);
      return ok('Gemerkt.', { k: 'merken', who, text: str(I.notiz, 240), tell: I.weitererzaehlen === true });
    }
    case 'aufgabe_geben': {
      const r = buildTask(mem, who, I);
      if (r.err) return bad(r.err);
      return ok(`Aufgabe „${r.rec.titel}“ steht jetzt in seinem Tagebuch.`, { k: 'aufgabe', rec: r.rec });
    }
    case 'spielaufgabe': {
      const k = str(I.thema, 40);
      if (!(env.themen || []).some(t => t.k === k)) return bad('dieses Thema gibt es gerade nicht');
      const q = env.quest ? env.quest(k) : null;
      if (!q) return bad('geht gerade nicht');
      return ok(q.text ? 'Erledigt. Wichtig für ihn: ' + q.text : 'Erledigt.', {
        k: 'spielaufgabe',
        thema: k,
        end: !!q.end,
      });
    }
    case 'taetigkeit': {
      const a = KI_TAETIGKEIT[who][I.was];
      if (!a) return bad('unbekannte Tätigkeit');
      return ok('Nach dem Gespräch machst du das.', {
        k: 'taetigkeit',
        who,
        was: I.was,
        with: typeof a === 'object' ? a.with : null,
      });
    }
    case 'gespraech_beenden':
      return ok('Das Gespräch endet nach deinem letzten Satz.', { k: 'ende' });
  }
  return bad('unbekanntes Werkzeug');
}

// ---------------- after the talk: summary and gossip (one small request with structured output) ----------------
export function summarySystem(who) {
  const C = KI_CHARS[who],
    O = KI_CHARS[C.other];
  return `Du schreibst für ein Spiel das Gedächtnis von ${C.name}, einem Nachbarn im Dorf Ratscher in Thüringen. Im Dorf duzen sich alle.
${C.name}: ${C.sheet.split('\n')[1] || ''}
${O.name}: ${O.sheet.split('\n')[1] || ''}
Du bekommst das Gespräch, das ${C.name} eben mit seinem Gegenüber geführt hat, und die Dinge, die ${C.name} weitererzählen will.
- zusammenfassung: ein, höchstens zwei Sätze aus Sicht von ${C.name}, was besprochen oder versprochen wurde (in der dritten Person über das Gegenüber, mit Namen).
- zeilen: wenn es etwas weiterzuerzählen gibt, ein kurzer Dialog (2 bis 6 Zeilen) zwischen ${C.name} (wer "${C.name[0].toLowerCase()}") und ${O.name} (wer "${O.name[0].toLowerCase()}") beim nächsten Treffen am Tisch: ${C.name} erzählt es, ${O.name} reagiert, wie es zu ihm passt. Gesprochenes Deutsch, jede Zeile ein, zwei Sätze, keine Regieanweisungen. Sonst eine leere Liste.
- notiz_fuer_anderen: was ${O.name} sich danach über das Gegenüber merkt (ein Satz aus seiner Sicht), sonst leer.
- meinung_anderer: wie sich ${O.name}s Meinung über das Gegenüber dadurch ändert, ganze Zahl von -10 bis 10.`;
}
export const SUMMARY_SCHEMA = obj({
  zusammenfassung: { type: 'string' },
  zeilen: { type: 'array', items: obj({ wer: { type: 'string', enum: ['h', 'r'] }, text: { type: 'string' } }) },
  notiz_fuer_anderen: { type: 'string' },
  meinung_anderer: { type: 'integer' },
});
export function summaryInput(mem, who, transcript, player = 'Falko') {
  const tell = mem.who[who].tell;
  return (
    `Gegenüber: ${KI_PLAYERS[player] || player}.\nGespräch:\n` +
    transcript.map(([s, t]) => (s === 'p' ? player : KI_CHARS[who].name) + ': ' + t).join('\n') +
    '\n\nWeitererzählen will er: ' +
    (tell.length ? tell.join('; ') : 'nichts')
  );
}
// the result of the summary request → memory (summary, gossip for the table); returns the gossip entry or null
export function applySummary(mem, who, res, day = 0) {
  const w = mem.who[who];
  w.tell = [];
  if (!res || typeof res !== 'object') return null;
  const s = str(res.zusammenfassung, 400);
  if (s) {
    w.gespraeche.push({ t: day, text: s });
    if (w.gespraeche.length > MAX.gespraeche) w.gespraeche.splice(0, w.gespraeche.length - MAX.gespraeche);
  }
  const k = klatschCheck({
    zeilen: Array.isArray(res.zeilen) ? res.zeilen.map(z => [z && z.wer, z && z.text]) : [],
    notiz: res.notiz_fuer_anderen,
    meinung: res.meinung_anderer,
  });
  if (!k) return null;
  w.klatsch.push(k);
  if (w.klatsch.length > MAX.klatsch) w.klatsch.shift();
  return k;
}
// the two at the table: the next piece of gossip (either one may tell), and what the listener keeps of it
export function nextGossip(mem) {
  for (const who of WHO) if (mem.who[who].klatsch.length) return { who, k: mem.who[who].klatsch[0] };
  return null;
}
export function gossipHeard(mem, who, day = 0) {
  const k = mem.who[who].klatsch.shift();
  if (!k) return null;
  const other = KI_CHARS[who].other;
  if (k.notiz) addNote(mem, other, k.notiz, who, day);
  if (k.meinung) opinion(mem, other, k.meinung);
  return k;
}
// a finished task of a neighbour: its reward, a line for his memory
export function taskDone(mem, id) {
  const t = mem.tasks.find(x => x.id === id);
  if (!t) return null;
  const w = mem.who[t.who];
  opinion(mem, t.who, t.belohnung, 20);
  w.erledigt.push(t.titel);
  if (w.erledigt.length > MAX.erledigt) w.erledigt.shift();
  w.neu.push(t.titel);
  return t;
}

// ---------------- streamed text → sentences for the voice ----------------
// push(delta) as the text arrives; each complete sentence goes to say(s) at once (a short one waits for the next), flush() at the end
export function sentencer(say, min = 14) {
  let buf = '';
  const cut = () => {
    for (;;) {
      const m = /[.!?…]+["“”»«)]*\s+(?=\S)|\n+/.exec(buf.slice(min - 1));
      if (!m) return;
      const end = min - 1 + m.index + m[0].length;
      const s = buf.slice(0, end).trim();
      buf = buf.slice(end);
      if (s) say(s);
    }
  };
  return {
    push(t) {
      buf += t;
      cut();
    },
    flush() {
      const s = buf.trim();
      buf = '';
      if (s) say(s);
    },
  };
}
// what the model says aloud (stray markup removed: asterisks, stage directions in brackets)
export function spoken(t) {
  return String(t || '')
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/<\/?[a-z_]+>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
