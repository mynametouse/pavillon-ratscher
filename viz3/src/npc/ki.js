// ===================== KI: talking freely with the people of Ratscher – by voice, answered by a fast model, spoken aloud (Falko, 25.10.2026) =====================
// Falko: "mit Ronald und Hubert reden können wie mit einer KI – sie sollen auf meine Stimme hören und antworten, am besten mit Sprachausgabe;
// je nach Gespräch neue Aufgaben, Aktionen oder Meinungen über mich entwickeln und es den anderen erzählen, wenn sie miteinander sprechen."
// Later the same evening: "… auch mit den anderen Dorfbewohnern und NPCs mit Stimme sprechen können."
// - People: Hubert and Ronald (npc/npc.js talk panel, NPCUI.extend), the eight villagers (dorf/dorf.js panel, DORF.extend, characters from
//   dorf/dorf_text.js) and whoever registers with KI.person (strollers and drivers, feat/verkehr). Each one is an adapter: where he stands,
//   his mouth, the panel the microphone goes into, what closes the talk.
// - Ear: the browser's speech recognition (de-DE; Chrome, Edge, Safari – elsewhere the text field), a microphone button, hands-free: after
//   each answer it listens again.
// - Head: Claude Haiku 5.5 through the Anthropic SDK (loaded on demand, src/lazy/anthropic.js), streamed; the key is the player's own and
//   stays in this browser (SAVE, secret), or a server address that adds it – nothing secret is in the public page. Prompts, tools,
//   memory: npc/ki_core.js, characters: ki_text.js.
// - Mouth: one sentence at a time while the answer still streams, in the person's own voice (audio/stimme.js: the device's best voices for
//   free, ElevenLabs with an own key, more engines later); the mouth moves.
// - Memory (pav-ki-v1): opinion 0–100 per person, notes, summaries of earlier talks; a good opinion counts as friends (QUESTS.befriend).
// - Doings: tasks as data (TASKS, in the journal), the old tasks of game/quests.js (spielaufgabe), an activity after the talk (LIFE.force).
// - Gossip: after a talk one small request writes the summary and, for Hubert and Ronald, a short exchange in which one tells the other –
//   played the next time the two sit at the table (LIFE.talkSource); what a villager hears goes round the village (a few others note it).
// Without a key everything stays as before (recorded lines and topics). Settings: menu → Einstellungen → „KI-Gespräche“ (#kipanel).
import { $ } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { TASKS } from '../core/tasks.js';
import { markDirty } from '../core/assets.js';
import { P, PHASE } from '../game/walkable.js';
import { PHASES } from '../pavilion/phases.js';
import { toast } from '../audio/audio.js';
import { STIMME } from '../audio/stimme.js';
import { PLAY } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { HUD } from '../game/hud.js';
import { AVATAR } from '../game/avatar.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { NPCS, NPCUI } from './npc.js';
import { LIFE } from './life.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { DORF } from '../dorf/dorf.js';
import { AMTDATA } from '../amt/amt_data.js';
import * as K from './ki_core.js';
import { KI_CHARS } from './ki_text.js';

export const KI = (() => {
  // ---------------- saved settings, key, memory, usage ----------------
  const SET_DEF = { on: true, hands: true, base: '' };
  const KS = SAVE.key('pav-ki-set-v1', {
    owner: 'ki',
    def: SET_DEF,
    check: s => !!s && typeof s === 'object',
    migrate: s => Object.assign({}, SET_DEF, s),
  });
  const KK = SAVE.key('pav-ki-key', { owner: 'ki', kind: 'text', def: '', secret: true }); // Anthropic API key (this browser only)
  const KM = SAVE.key(K.MEM_KEY, { owner: 'ki', def: null, check: m => m === null || !!K.memCheck(m) });
  const KU = SAVE.key('pav-ki-use-v1', { owner: 'ki', def: null });
  const S = { set: SAVE.get(KS), key: SAVE.get(KK) || '', mem: null };
  // V16s kept the voice here ('voice': browser / eleven / aus): it moved to audio/stimme.js
  if (S.set.voice === 'eleven' || S.set.voice === 'aus') STIMME.engineName = S.set.voice;
  delete S.set.voice;
  delete S.set.elv;
  const saveMem = () => SAVE.set(KM, S.mem);
  const saveSet = () => SAVE.set(KS, S.set);
  const ready = () => !!(S.set.on && (S.key || S.set.base));
  const day = () => CLOCK.day();
  const today = () => new Date().toISOString().slice(0, 10);
  function tally(u) {
    let x = SAVE.get(KU);
    if (!x || x.day !== today()) x = { day: today(), req: 0, inp: 0, out: 0, cr: 0, cw: 0 };
    x.req++;
    if (u) {
      x.inp += u.input_tokens || 0;
      x.out += u.output_tokens || 0;
      x.cr += u.cache_read_input_tokens || 0;
      x.cw += u.cache_creation_input_tokens || 0;
    }
    SAVE.set(KU, x);
    UI.sync();
  }
  // ---------------- the model ----------------
  // the SDK is a package of its own (src/lazy/anthropic.js → dist/lazy/anthropic.js), loaded with the first request – the page stays small
  let SDK = null,
    client = null,
    clientFor = '';
  async function api() {
    if (!SDK) SDK = (await import(new URL('lazy/anthropic.js', document.baseURI).href)).Anthropic;
    const id = S.key + '|' + S.set.base;
    if (!client || clientFor !== id) {
      client = new SDK({
        apiKey: S.key || 'via-server',
        baseURL: S.set.base || undefined,
        dangerouslyAllowBrowser: true, // the player's own key in the player's own browser (or a server that adds it)
        maxRetries: 1,
        timeout: 30000,
      });
      clientFor = id;
    }
    return client;
  }
  function why(e) {
    const A = SDK;
    if (!A) return 'Die KI konnte nicht geladen werden (' + String((e && e.message) || e).slice(0, 100) + ').';
    if (e instanceof A.AuthenticationError)
      return 'Der Schlüssel wird nicht angenommen – bitte in den Einstellungen prüfen.';
    if (e instanceof A.PermissionDeniedError) return 'Der Schlüssel darf dieses Modell nicht benutzen.';
    if (e instanceof A.RateLimitError) return 'Gerade zu viele Anfragen – gleich noch einmal.';
    if (e instanceof A.BadRequestError) return 'Die Anfrage wurde abgelehnt: ' + String(e.message || '').slice(0, 140);
    if (e instanceof A.APIConnectionError) return 'Keine Verbindung zum KI-Dienst.';
    if (e instanceof A.APIError) return 'Der KI-Dienst antwortet nicht (' + (e.status || '?') + ').';
    return 'Fehler: ' + String((e && e.message) || e).slice(0, 140);
  }
  // ---------------- the people (adapters) ----------------
  // { key, name, pos() → [x, y], mouth(on), sub(text) (a subtitle), show(text) (the panel's text), host() (the panel for the
  //   microphone), close() (ends the talk in its own UI), line() (what he said last), themen() / quest(k) (old tasks), npcAt() }
  const PERS = {};
  function register(key, a, prof) {
    if (!K.person(key, prof)) return null;
    STIMME.person(key, { name: prof.name, g: prof.g, age: prof.age });
    PERS[key] = Object.assign({ key, name: prof.name, themen: () => [], quest: () => null, line: () => '' }, a);
    return PERS[key];
  }
  // Hubert and Ronald: the talk panel of npc/npc.js
  for (const k of ['hubert', 'ronald']) {
    const w = () => NPCS[k];
    register(
      k,
      {
        w: w(),
        pos: () => [w().x, w().y],
        mouth: v => (w().fig.speak = !!v),
        sub: t => NPCUI.sub(w(), t),
        show: t => {
          const el = $('np-text');
          if (el) el.textContent = t || '…';
        },
        host: () => $('npcpanel'),
        close: () => NPCUI.end(false),
        line: () => w().lastLine || '',
        themen: () => QUESTS.topics(k).map(q => ({ k: q.k, label: q.label })),
        quest: q => questNPC(k, q),
      },
      { name: KI_CHARS[k].name, sheet: KI_CHARS[k].sheet, g: 'm', age: k === 'hubert' ? 75 : 55 }
    );
  }
  // the villagers: the panel of dorf/dorf.js; their character from what they say in dorf/dorf_text.js
  const AMTP = (AMTDATA && AMTDATA.P) || {};
  for (const [k, p] of Object.entries(DTEXT.P)) {
    const fig = () => DPEOPLE.figs[k];
    register(
      k,
      {
        pos: () => {
          const h = DPEOPLE.head(k);
          return h ? [h[0], h[1]] : [P.x, P.y];
        },
        mouth: v => {
          const f = fig();
          if (f) f.walker.talking = !!v && f.mode !== 'sit';
        },
        sub: t => DORF.UI.subtitle(k, t),
        show: t => DORF.UI.say(k, t || '…'),
        host: () => DORF.UI.el,
        close: () => DORF.UI.close(),
        line: () => DORF.UI.line(),
      },
      {
        name: p.name,
        sheet: K.villagerSheet(p),
        g: p.clips === 'f' ? 'f' : 'm',
        age: p.age,
        start: AMTP[k] && Number.isFinite(AMTP[k].rep0) ? AMTP[k].rep0 : 50,
        intro: 'Jemand aus dem Garten bei Hubert und Ronald spricht dich an.',
      }
    );
  }
  S.mem = K.memCheck(SAVE.get(KM)) || K.memDefault();
  // ---------------- mouth: one sentence after the other, in the person's voice ----------------
  const VOICE = (() => {
    const Q = [];
    let busy = false,
      gen = 0;
    const idleFns = [];
    function say(pa, text) {
      if (!text || !pa) return;
      Q.push({ pa, text, gen, h: STIMME.prepare(pa.key, text, { at: pa.pos() }) });
      pump();
    }
    async function pump() {
      if (busy) return;
      const it = Q.shift();
      if (!it) {
        for (const f of idleFns.splice(0)) f();
        return;
      }
      busy = true;
      it.pa.mouth(true);
      // in the talk the panel shows the whole answer; elsewhere (at the table) the line is a subtitle
      if (!(C && C.pa === it.pa)) it.pa.sub(it.text);
      markDirty();
      try {
        if (it.gen === gen) await STIMME.play(it.h);
      } catch (e) {
        console.warn('KI voice', e);
      }
      it.pa.mouth(false);
      busy = false;
      pump();
    }
    function stop() {
      gen++;
      for (const it of Q.splice(0)) it.pa.mouth(false);
      STIMME.stop();
    }
    return {
      say,
      stop,
      unlock: () => STIMME.unlock(),
      idle: () => !busy && !Q.length,
      onIdle: f => (!busy && !Q.length ? f() : idleFns.push(f)),
    };
  })();
  STIMME.onError = t => UI.note('Sprachausgabe ' + t + ' – die Gerätestimme spricht.');
  // ---------------- ear: the browser's speech recognition ----------------
  const EAR = (() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    let rec = null,
      on = false,
      misses = 0;
    function start(cb) {
      if (!SR || on) return false;
      try {
        rec = new SR();
      } catch (e) {
        return false;
      }
      rec.lang = 'de-DE';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      let fin = '',
        part = '';
      rec.onresult = e => {
        part = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) fin += r[0].transcript;
          else part += r[0].transcript;
        }
        cb.partial && cb.partial((fin + ' ' + part).trim());
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') cb.denied && cb.denied();
        else if (e.error !== 'no-speech' && e.error !== 'aborted') UI.note('Spracherkennung: ' + e.error);
      };
      rec.onend = () => {
        on = false;
        rec = null;
        const t = (fin || part).trim();
        if (t) misses = 0;
        else misses++;
        cb.end && cb.end(t, misses);
      };
      try {
        rec.start();
        on = true;
      } catch (e) {
        rec = null;
        cb.denied && cb.denied();
        return false;
      }
      return true;
    }
    function stop(abort = false) {
      if (!rec) return;
      try {
        if (abort) rec.abort();
        else rec.stop();
      } catch (e) {}
    }
    return {
      start,
      stop,
      ok: !!SR,
      get on() {
        return on;
      },
      reset: () => (misses = 0),
    };
  })();
  // ---------------- one conversation ----------------
  let C = null; // { pa, who, system, tools, messages, pending, transcript, turns, fx, greet, stream, ended, busy }
  const player = () => (AVATAR && AVATAR.figName ? AVATAR.figName() : 'Falko');
  function sit(c, first) {
    const w = K.whoOf(S.mem, c.who);
    const zeit = (DN && DN.dateShort ? DN.dateShort() + ', ' : 'Tag ' + day() + ', ') + CLOCK.hm() + ' Uhr';
    const ph = PHASES[PHASE];
    const s = {
      zeit,
      ort: KERN.place(P.x, P.y, P.feet),
      haelt: PLAY.carry ? PLAY.carry.name : '',
      phase: ph ? ph.name + (PHASE === 0 ? ' (erst die alte Garage, gebaut ist noch nichts)' : '') : '',
      aufgaben: KERN.tasks
        .list()
        .filter(e => e.status !== 'erledigt')
        .slice(0, 6)
        .map(e => `${e.title}${e.who ? ' (von ' + e.who + ')' : ''}: ${e.text}`),
      themen: c.pa.themen(),
      meinung: w.meinung,
    };
    if (first) {
      s.begruessung = c.greet || '';
      s.neu = w.neu.slice();
      w.neu = [];
    }
    return s;
  }
  function begin(pa) {
    if (!ready() || C || !pa) return;
    const who = pa.key;
    K.whoOf(S.mem, who).n++;
    saveMem();
    C = {
      pa,
      who,
      system: K.systemBlocks(S.mem, who, player()),
      tools: K.tools(who),
      messages: [],
      pending: [],
      transcript: [],
      turns: 0,
      fx: [],
      greet: pa.line() || '',
      stream: null,
      ended: false,
      busy: false,
    };
    if (C.greet) C.transcript.push(['n', C.greet]);
    UI.open(pa); // the greeting stays in the panel until he answers
    if (S.set.hands && EAR.ok) setTimeout(() => C && C.pa === pa && listen(), 350);
  }
  // the player's words → one turn (a few requests when he uses tools), spoken while it streams
  async function turn(text) {
    const c = C;
    text = String(text || '').trim();
    if (!c || c.busy || c.ended || !text) return;
    if (++c.turns > 30) {
      VOICE.say(c.pa, 'So. Genug geredet für heute.');
      finish();
      return;
    }
    c.busy = true;
    EAR.stop(true);
    UI.me(text);
    UI.busy(true);
    c.transcript.push(['p', text]);
    const first = c.messages.length === 0;
    c.messages.push({
      role: 'user',
      content: [...c.pending, { type: 'text', text: K.situation(sit(c, first)) + '\n\n' + text }],
    });
    c.pending = [];
    let said = '';
    try {
      for (let hop = 0; hop < 3 && !c.ended; hop++) {
        const msg = await ask(c, t => {
          said += t;
          c.pa.show(K.spoken(said));
        });
        if (c.ended) return;
        c.messages.push({ role: 'assistant', content: msg.content });
        if (msg.stop_reason === 'refusal') {
          UI.note('Darauf antwortet die KI nicht.');
          break;
        }
        const uses = msg.content.filter(b => b.type === 'tool_use');
        if (!uses.length) break;
        if (msg.stop_reason === 'max_tokens') {
          // a cut-off tool input is never run: the model hears that it failed
          c.pending = uses.map(u => ({
            type: 'tool_result',
            tool_use_id: u.id,
            content: 'abgeschnitten, nicht ausgeführt',
            is_error: true,
          }));
          break;
        }
        const themen = c.pa.themen();
        const results = uses.map(u => {
          const r = K.runTool(S.mem, c.who, u.name, u.input, { day: day(), themen, quest: k => c.pa.quest(k) });
          c.fx.push(...r.fx);
          now(r.fx);
          return { type: 'tool_result', tool_use_id: u.id, content: r.text, ...(r.error ? { is_error: true } : {}) };
        });
        saveMem();
        if (c.fx.some(f => f.k === 'ende' || (f.k === 'spielaufgabe' && f.end))) {
          c.pending = results;
          break;
        }
        c.messages.push({ role: 'user', content: results }); // he may say more after his tools (the task he just gave, …)
        said += ' ';
      }
      // three rounds of tools without an answer: the last results go with the next words (no two user turns in a row)
      const last = c.messages[c.messages.length - 1];
      if (last && last.role === 'user') c.pending = c.messages.pop().content;
    } catch (e) {
      if (c.ended) return;
      console.warn('KI', e);
      UI.note(why(e));
      // the failed turn leaves the history as it was before it (pending tool results go with the next words)
      while (c.messages.length && c.messages[c.messages.length - 1].role === 'user') {
        const m = c.messages.pop();
        c.pending = m.content.filter(b => b.type === 'tool_result').concat(c.pending);
        if (m.content.some(b => b.type === 'text')) break;
      }
      c.transcript.pop();
      VOICE.say(c.pa, 'Hm? Was hast du gesagt?');
    } finally {
      c.busy = false;
      UI.busy(false);
    }
    if (K.spoken(said)) c.transcript.push(['n', K.spoken(said)]);
    if (c.fx.some(f => f.k === 'ende' || (f.k === 'spielaufgabe' && f.end))) VOICE.onIdle(() => C === c && finish());
    else if (S.set.hands && EAR.ok)
      VOICE.onIdle(() => C === c && !c.busy && setTimeout(() => C === c && !c.busy && listen(), 250));
  }
  async function ask(c, onText) {
    const stream = (await api()).messages.stream({
      model: K.KI_MODEL,
      max_tokens: 600,
      system: c.system,
      tools: c.tools,
      messages: c.messages,
      // the answer is spoken as it streams: no thinking before the first word, little effort for small talk
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      cache_control: { type: 'ephemeral' },
    });
    c.stream = stream;
    const sp = K.sentencer(s => {
      const t = K.spoken(s);
      if (t && !c.ended) VOICE.say(c.pa, t);
    });
    stream.on('text', t => {
      if (c.ended) return;
      sp.push(t);
      onText(t);
    });
    const msg = await stream.finalMessage();
    c.stream = null;
    sp.flush();
    tally(msg.usage);
    return msg;
  }
  // an old task of game/quests.js through the free talk: what its button does (before/after), the line it would say → the model
  function questNPC(who, k) {
    const qa = QUESTS.ask(who, k) || null;
    if (qa && qa.before) qa.before();
    let text = qa && qa.text ? [].concat(qa.text).join(' ') : '';
    if (!text && window.VOICEMAN) {
      const l = window.VOICEMAN.lines.find(x => x.id === who + '_t_' + k);
      text = l ? l.text : '';
    }
    if (qa && qa.after) qa.after();
    NPCUI.renderTopics();
    return { text, end: !!(qa && qa.end) };
  }
  // effects at once: a task into the journal, a toast for the opinion; the activity waits for the end of the talk
  function now(fx) {
    for (const f of fx) {
      if (f.k === 'aufgabe') {
        defineTask(f.rec);
        TASKS.start(f.rec.id);
      } else if (f.k === 'meinung' && Math.abs(f.to - f.from) >= 5)
        toast(`${K.people()[f.who].name} ${f.to > f.from ? 'mag dich mehr' : 'ist verstimmt'} (${f.to}/100)`, 2600);
    }
    UI.sync();
  }
  function finish() {
    if (C && !C.ended) C.pa.close();
  }
  function end(pa) {
    const c = C;
    if (!c || c.pa !== pa) return;
    c.ended = true;
    C = null;
    EAR.stop(true);
    if (c.stream) c.stream.abort();
    // the last sentence may still be spoken; a new talk stops it
    UI.open(null);
    for (const f of c.fx) if (f.k === 'taetigkeit') doActivity(f);
    if (c.transcript.some(t => t[0] === 'p')) summarize(c);
    saveMem();
  }
  // after the talk: summary and gossip (structured output, no tools)
  async function summarize(c) {
    try {
      const r = await (
        await api()
      ).messages.create({
        model: K.KI_MODEL,
        max_tokens: 900,
        system: K.summarySystem(c.who),
        messages: [{ role: 'user', content: K.summaryInput(S.mem, c.who, c.transcript, player()) }],
        thinking: { type: 'disabled' },
        output_config: { effort: 'low', format: { type: 'json_schema', schema: K.SUMMARY_SCHEMA } },
      });
      tally(r.usage);
      const txt = r.content.find(b => b.type === 'text');
      if (r.stop_reason !== 'end_turn' || !txt) return;
      const g = K.applySummary(S.mem, c.who, JSON.parse(txt.text), day());
      // the village talks: two or three others hear it (Hubert and Ronald tell each other at the table instead)
      if (g && g.spread) {
        const others = Object.keys(PERS)
          .filter(k => k !== c.who)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        K.spread(S.mem, c.who, g.spread, others, g.meinung, day());
      }
      saveMem();
      UI.sync();
    } catch (e) {
      console.warn('KI summary', e);
    }
  }
  // ---------------- what they do after the talk (npc/life.js) ----------------
  const FORCED = []; // { who, was, until, started }
  function doActivity(f) {
    const set = [[f.who, f.was]].concat(f.with ? [f.with] : []);
    for (const [who, was] of set) {
      LIFE.force(who, was);
      FORCED.push({ who, was, until: performance.now() / 1000 + 150, started: false });
    }
  }
  KERN.tick(() => {
    if (!FORCED.length) return;
    const t = performance.now() / 1000;
    for (let i = FORCED.length - 1; i >= 0; i--) {
      const F = FORCED[i];
      if (LIFE.cur(F.who) === F.was) F.started = true;
      // the trip and the mowing finish by themselves once begun; the rest lasts a while, then the plan takes over again
      const once = F.was === 'trip' || F.was === 'mow';
      if (t > F.until || (once && F.started)) {
        if (LIFE.AG[F.who] && LIFE.AG[F.who].forced === F.was) LIFE.force(F.who, null);
        FORCED.splice(i, 1);
      }
    }
  }, 'ki');
  // ---------------- tasks given in a talk (TASKS, journal) ----------------
  const env = {
    near: (spot, r) => {
      const s = KERN.spot(spot);
      return !!(s && s.pos && Math.hypot(P.x - s.pos[0], P.y - s.pos[1]) < r);
    },
    spotAt: spot => {
      const s = KERN.spot(spot);
      return s && s.pos ? [s.pos[0], s.pos[1]] : null;
    },
    npcAt: who => (PERS[who] ? PERS[who].pos() : null),
  };
  const defineTask = rec => TASKS.define(K.taskDef(rec, env));
  for (const rec of S.mem.tasks) defineTask(rec);
  KERN.on('task:done', d => {
    if (!d || !String(d.id).startsWith('ki-')) return;
    const t = K.taskDone(S.mem, d.id);
    if (t) {
      saveMem();
      UI.sync();
    }
  });
  KERN.on('reset', () => forget());
  function forget() {
    for (const t of S.mem.tasks) TASKS.reset(t.id);
    S.mem = K.memDefault();
    saveMem();
    UI.sync();
  }
  // ---------------- friends, gossip at the table ----------------
  QUESTS.befriend(who => !!S.mem.who[who] && K.likes(S.mem, who));
  LIFE.talkSource(() => {
    const g = K.nextGossip(S.mem);
    if (!g) return null;
    return {
      lines: g.k.zeilen,
      line(sp, text, hearing) {
        if (!hearing) return;
        if (PERS[sp.name]) VOICE.say(PERS[sp.name], text);
        else NPCUI.sub(sp, text);
      },
      done() {
        K.gossipHeard(S.mem, g.who, day());
        saveMem();
        UI.sync();
      },
    };
  });
  // ---------------- listening ----------------
  function listen() {
    const c = C;
    if (!c || c.busy || EAR.on) return;
    VOICE.stop();
    UI.mic(true);
    const ok = EAR.start({
      partial: t => UI.me(t + ' …'),
      denied: () => {
        UI.mic(false);
        UI.note('Kein Zugriff aufs Mikrofon – tippe auf das Mikrofon oder schreib.');
      },
      end: (t, misses) => {
        UI.mic(false);
        if (C !== c) return;
        if (t) turn(t);
        else if (S.set.hands && misses < 3 && !c.busy) setTimeout(() => C === c && !c.busy && listen(), 300);
        else UI.me('');
      },
    });
    if (!ok) UI.mic(false);
  }
  // ---------------- the panel parts ----------------
  const UI = (() => {
    const U = { box: null, setup: null, set: null, noteT: null };
    const esc = t =>
      String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
    const MIC =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>';
    // what you said, microphone, text field, a note line – one box that moves into the panel of whoever one talks to
    function build() {
      if (U.box) return;
      const box = document.createElement('div');
      box.className = 'np-ki';
      box.id = 'np-ki';
      box.hidden = true;
      box.innerHTML =
        '<div class="np-me" id="np-me" aria-live="polite"></div>' +
        `<form class="np-in" id="np-form"><button type="button" class="mic" id="np-mic" aria-pressed="false" title="Sprechen" aria-label="Sprechen">${MIC}</button>` +
        '<input id="np-say" type="text" autocomplete="off" enterkeyhint="send" placeholder="Sag etwas …" aria-label="Was du sagst">' +
        '<button type="submit" class="send">Sagen</button></form><small class="np-note" id="np-note"></small>';
      const setup = document.createElement('button');
      setup.type = 'button';
      setup.className = 'np-setup';
      setup.id = 'np-setup';
      setup.textContent = 'Frei reden – KI-Gespräche einrichten …';
      setup.hidden = true;
      setup.addEventListener('click', () => settings(true));
      const pan = $('npcpanel') || document.body;
      pan.appendChild(box);
      pan.appendChild(setup);
      box.querySelector('#np-mic').addEventListener('click', () => {
        VOICE.unlock();
        EAR.reset();
        if (EAR.on) EAR.stop();
        else if (EAR.ok) listen();
        else
          note('Dieser Browser hat keine Spracherkennung – bitte schreiben (Chrome, Edge und Safari können zuhören).');
      });
      box.querySelector('#np-form').addEventListener('submit', e => {
        e.preventDefault();
        VOICE.unlock();
        const i = box.querySelector('#np-say');
        const t = i.value;
        i.value = '';
        turn(t);
      });
      U.box = box;
      U.setup = setup;
    }
    // the box (and the hint) into a person's panel; null: hidden
    function open(pa) {
      build();
      if (pa && pa.host && pa.host()) pa.host().appendChild(U.box);
      U.box.hidden = !pa;
      if (pa) {
        U.box.querySelector('#np-me').textContent = '';
        note('');
        if (!EAR.ok) U.box.querySelector('#np-mic').hidden = true;
      }
    }
    // without a key: the hint under the panel of whoever one just talks to
    function hint(pa) {
      build();
      if (pa && pa.host && pa.host()) pa.host().appendChild(U.setup);
      U.setup.hidden = !pa || ready() || !S.set.on;
    }
    const me = t =>
      U.box && (U.box.querySelector('#np-me').textContent = t ? (t.endsWith('…') ? t : '„' + t + '“') : '');
    const mic = v => {
      const b = U.box && U.box.querySelector('#np-mic');
      if (b) {
        b.setAttribute('aria-pressed', v ? 'true' : 'false');
        b.classList.toggle('on', !!v);
      }
    };
    const busy = v => U.box && U.box.classList.toggle('busy', !!v);
    function note(t) {
      const el = U.box && U.box.querySelector('#np-note');
      if (!el) return;
      el.textContent = t || '';
      clearTimeout(U.noteT);
      if (t) U.noteT = setTimeout(() => (el.textContent = ''), 9000);
    }
    // the settings panel (#kipanel): on/off, key, the voices (audio/stimme.js), hands-free, what it cost today, what they think of you
    function settings(v) {
      if (!U.set) {
        const el = document.createElement('aside');
        el.id = 'kipanel';
        el.hidden = true;
        el.setAttribute('aria-label', 'KI-Gespräche');
        (document.getElementById('p-3d') || document.body).appendChild(el);
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-ki]');
          if (b) act(b.dataset.ki, b);
        });
        el.addEventListener('change', e => {
          const t = e.target;
          if (t.id === 'ki-key') S.key = t.value.trim();
          else if (t.id === 'ki-base') S.set.base = t.value.trim().replace(/\/+$/, '');
          else return;
          SAVE.set(KK, S.key);
          saveSet();
          sync();
        });
        U.set = el;
      }
      if (v) {
        if (HUD && HUD.setMenu) HUD.setMenu(false);
        try {
          if (document.pointerLockElement) document.exitPointerLock();
        } catch (e) {}
        render();
      }
      U.set.hidden = !v;
      const mb = $('kibtn');
      if (mb) mb.setAttribute('aria-pressed', v ? 'true' : 'false');
    }
    function render() {
      const el = U.set;
      if (!el) return;
      const s = S.set,
        u = SAVE.get(KU);
      const seg = (k, val, label) =>
        `<button type="button" data-ki="${k}:${val}" aria-pressed="${String(s[k] === val)}">${label}</button>`;
      const cost = u && u.day === today() ? ((u.inp + u.cw * 1.25 + u.cr * 0.1) * 0.1 + u.out * 0.5) / 1e4 : 0; // cents (Haiku 5.5: $0.10 / $0.50 per MTok)
      const ops = Object.entries(K.people())
        .map(([k, p]) => `${esc(p.name)} ${K.whoOf(S.mem, k).meinung}`)
        .join(' · ');
      el.innerHTML =
        '<h3>Gespräche mit KI<button type="button" class="x" data-ki="close" aria-label="Schließen">×</button></h3>' +
        '<p class="fnote">Hubert, Ronald und die Leute im Dorf hören zu, antworten frei und merken sich, was du sagst und tust – und erzählen es weiter. Dafür fragt das Spiel ein schnelles KI-Modell (Claude Haiku 5.5). Ohne Schlüssel bleibt alles wie bisher.</p>' +
        `<div class="mrow"><span>KI-Gespräche</span><div class="mseg">${seg('on', true, 'an')}${seg('on', false, 'aus')}</div></div>` +
        `<label class="kf">Claude-API-Schlüssel<input id="ki-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(S.key)}"></label>` +
        '<p class="fnote">Der Schlüssel bleibt nur in diesem Browser und geht direkt an Anthropic. Anlegen: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com → API Keys</a> (die API braucht dort etwas Guthaben). Ein Gespräch kostet meist unter einem Cent.</p>' +
        `<div class="kbtns"><button type="button" data-ki="test">Schlüssel prüfen</button><span id="ki-test"></span></div>` +
        '<div id="ki-stimme"></div>' +
        `<div class="mrow"><span>Zuhören</span><div class="mseg">${seg('hands', true, 'nach jeder Antwort')}${seg('hands', false, 'nur per Knopf')}</div></div>` +
        (EAR.ok
          ? '<p class="fnote">Zuhören macht die Spracherkennung des Browsers (Chrome und Edge schicken die Sprache dafür an ihren Dienst, Safari an Apple). Lautstärke der Stimmen: Menü → Einstellungen → Lautstärke.</p>'
          : '<p class="fnote">Dieser Browser hat keine Spracherkennung – du kannst schreiben. Chrome, Edge und Safari können zuhören.</p>') +
        `<details><summary>Server statt Schlüssel</summary><label class="kf">Adresse (leitet an die Claude-API weiter und fügt den Schlüssel hinzu)<input id="ki-base" type="url" spellcheck="false" placeholder="https://…" value="${esc(s.base)}"></label></details>` +
        `<h4>Was sie von dir halten (von 100)</h4><p class="kmeinung">${ops}</p>` +
        `<p class="fnote">Heute: ${u && u.day === today() ? u.req : 0} Anfragen, ${u && u.day === today() ? (u.inp + u.cr + u.cw + u.out).toLocaleString('de-DE') : 0} Token (≈ ${cost.toFixed(2).replace('.', ',')} Cent)</p>` +
        '<div class="kbtns"><button type="button" data-ki="forget">Gedächtnis löschen</button></div>';
      STIMME.panel(el.querySelector('#ki-stimme'));
    }
    async function act(k, b) {
      const [what, val] = k.split(':');
      if (what === 'close') return settings(false);
      if (what === 'on' || what === 'hands') S.set[what] = val === 'true';
      if (what === 'forget') {
        if (!b.dataset.sure) {
          b.dataset.sure = '1';
          b.textContent = 'Wirklich alles vergessen lassen?';
          return;
        }
        forget();
      }
      if (what === 'test') {
        const out = $('ki-test');
        out.textContent = 'Frage …';
        try {
          const r = await (
            await api()
          ).messages.create({
            model: K.KI_MODEL,
            max_tokens: 64,
            thinking: { type: 'disabled' },
            output_config: { effort: 'low' },
            messages: [{ role: 'user', content: 'Antworte nur mit dem Wort: Nu.' }],
          });
          tally(r.usage);
          out.textContent = 'Klappt.';
        } catch (e) {
          out.textContent = why(e);
        }
        return;
      }
      saveSet();
      sync();
    }
    // the menu button, the hint in the talk panel, the settings when open
    function sync() {
      const mb = $('kibtn');
      if (mb) {
        const sp = mb.querySelector('span');
        if (sp) sp.textContent = ready() ? 'an' : S.set.on ? 'einrichten' : 'aus';
      }
      if (U.setup && ready()) U.setup.hidden = true;
      if (U.set && !U.set.hidden) render();
    }
    return { open, hint, me, mic, busy, note, settings, sync, build };
  })();
  // ---------------- hooks: the neighbours' panel, the villagers' panel ----------------
  NPCUI.extend({
    free: () => ready(),
    start: w => {
      const pa = PERS[w.name];
      UI.hint(pa);
      begin(pa);
    },
    // a task button pressed during the free talk: the model hears what was asked and answered
    asked: (w, label, said) => {
      if (!C || C.pa !== PERS[w.name]) return;
      C.transcript.push(['p', label]);
      if (said.length) C.transcript.push(['n', said.join(' ')]);
      C.pending.push({ type: 'text', text: `(Er hat gefragt: „${label}“ – du hast geantwortet: „${said.join(' ')}“)` });
    },
    end: w => end(PERS[w.name]),
  });
  DORF.extend({
    free: () => ready(),
    start: k => {
      UI.hint(PERS[k]);
      begin(PERS[k]);
    },
    end: k => {
      end(PERS[k]);
      UI.hint(null);
    },
  });
  const mb = $('kibtn');
  if (mb)
    mb.addEventListener('click', () => UI.settings(!(document.getElementById('kipanel') && !$('kipanel').hidden)));
  window.addEventListener(
    'keydown',
    e => {
      const p = document.getElementById('kipanel');
      if (e.key === 'Escape' && p && !p.hidden) {
        UI.settings(false);
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  UI.build();
  UI.sync();
  return {
    get ready() {
      return ready();
    },
    get mem() {
      return S.mem;
    },
    get conv() {
      return C;
    },
    turn,
    settings: v => UI.settings(v),
    VOICE,
    EAR,
    // another person to talk to (feat/verkehr: strollers, drivers): { key, name, g, age, role, sheet, start, pos(), mouth(on), sub(text),
    // show(text), host() (the panel for the microphone), close(), line() } – then KI.talk(key) when its panel opens, KI.ended(key) when it closes
    person(p) {
      if (!p || !p.key || PERS[p.key]) return PERS[p && p.key] || null;
      return register(
        p.key,
        {
          pos: p.pos || (() => [P.x, P.y]),
          mouth: p.mouth || (() => {}),
          sub: p.sub || (() => {}),
          show: p.show || (() => {}),
          host: p.host || (() => null),
          close: p.close || (() => end(PERS[p.key])),
          line: p.line || (() => ''),
        },
        {
          name: p.name,
          sheet:
            p.sheet ||
            `Du bist ${p.name}${p.age ? ', ' + p.age + ' Jahre' : ''}${p.role ? ', ' + p.role : ''}, unterwegs in der Gegend.`,
          g: p.g === 'f' ? 'f' : 'm',
          age: p.age || 45,
          start: Number.isFinite(p.start) ? p.start : 50,
          intro: p.intro || 'Jemand spricht dich an – jemand aus dem Garten bei Hubert und Ronald in Ratscher.',
        }
      );
    },
    talk: key => {
      UI.hint(PERS[key]);
      begin(PERS[key]);
    },
    ended: key => {
      end(PERS[key]);
      UI.hint(null);
    },
    people: () => Object.keys(PERS),
    // tests: settings without the panel ({ key, base, hands, on, voice: 'browser' | 'eleven' | 'aus' | … })
    configure(o = {}) {
      if ('key' in o) SAVE.set(KK, (S.key = o.key || ''));
      for (const k of ['on', 'hands', 'base']) if (k in o) S.set[k] = o[k];
      if ('voice' in o) STIMME.engineName = o.voice;
      saveSet();
      client = null;
      UI.sync();
    },
  };
})();
window.KI = KI;
