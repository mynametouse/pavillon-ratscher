// ===================== KI: talking freely with Hubert and Ronald – by voice, answered by a fast model, spoken aloud (Falko, 25.10.2026) =====================
// Falko: "mit Ronald und Hubert reden können wie mit einer KI – sie sollen auf meine Stimme hören und antworten, am besten mit Sprachausgabe;
// je nach Gespräch neue Aufgaben, Aktionen oder Meinungen über mich entwickeln und es den anderen erzählen, wenn sie miteinander sprechen."
// - Ear: the browser's speech recognition (de-DE; Chrome, Edge, Safari – elsewhere the text field), a microphone button, hands-free: after
//   each answer it listens again.
// - Head: Claude Haiku 5.5 through the Anthropic SDK, streamed; the key is the player's own and stays in this browser (SAVE, secret), or a
//   server address that adds it (a proxy) – nothing secret is in the public page. Prompts, tools, memory: npc/ki_core.js, characters: ki_text.js.
// - Mouth: one sentence at a time while the answer still streams – the browser's voices (no key) or ElevenLabs (own key); mouth moves.
// - Memory (pav-ki-v1): opinion 0–100 per neighbour, notes, summaries of earlier talks; a good opinion counts as friends (QUESTS.befriend).
// - Doings: tasks as data (TASKS, in the journal), the old tasks of game/quests.js (spielaufgabe), an activity after the talk (LIFE.force).
// - Gossip: after a talk one small request writes the summary and a short exchange in which he tells the other one; it is played the next
//   time the two sit at the table (LIFE.talkSource), heard (and spoken) when the visitor is near, and the listener remembers it.
// Without a key everything stays as before (recorded lines and topics). Settings: menu → Einstellungen → „KI-Gespräche“ (#kipanel).
import { $ } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { TASKS } from '../core/tasks.js';
import { markDirty } from '../core/assets.js';
import { P, PHASE } from '../game/walkable.js';
import { PHASES } from '../pavilion/phases.js';
import { toast } from '../audio/audio.js';
import { PLAY } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { HUD } from '../game/hud.js';
import { AVATAR } from '../game/avatar.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { NPCS, NPCUI } from './npc.js';
import { LIFE } from './life.js';
import * as K from './ki_core.js';
import { KI_CHARS, KI_TAETIGKEIT } from './ki_text.js';

export const KI = (() => {
  // ---------------- saved settings, key, memory, usage ----------------
  const SET_DEF = {
    on: true,
    voice: 'browser',
    hands: true,
    base: '',
    elv: { hubert: 'GPj7TWARaf5fPNhxhOI6', ronald: 'HvPMqVH31pBg9ThkOUPw' },
  };
  const KS = SAVE.key('pav-ki-set-v1', {
    owner: 'ki',
    def: SET_DEF,
    check: s => !!s && typeof s === 'object',
    migrate: s => Object.assign({}, SET_DEF, s, { elv: Object.assign({}, SET_DEF.elv, s && s.elv) }),
  });
  const KK = SAVE.key('pav-ki-key', { owner: 'ki', kind: 'text', def: '', secret: true }); // Anthropic API key (this browser only)
  const KE = SAVE.key('pav-ki-el', { owner: 'ki', kind: 'text', def: '', secret: true }); // ElevenLabs API key
  const KM = SAVE.key(K.MEM_KEY, { owner: 'ki', def: null, check: m => m === null || !!K.memCheck(m) });
  const KU = SAVE.key('pav-ki-use-v1', { owner: 'ki', def: null });
  const S = {
    set: SAVE.get(KS),
    key: SAVE.get(KK) || '',
    el: SAVE.get(KE) || '',
    mem: K.memCheck(SAVE.get(KM)) || K.memDefault(),
  };
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
  // ---------------- mouth: one sentence after the other ----------------
  const VOICE = (() => {
    const Q = [];
    let busy = false,
      cur = null,
      gen = 0;
    const idleFns = [];
    const synth = () => window.speechSynthesis || null;
    // a German voice per neighbour: Hubert lower and slower; a male name preferred (Edge: the same neural voices as the recordings)
    const PREF = {
      hubert: /Conrad|Killian|Bernd|Ralf|Stefan|Markus|Martin|Yannick|Viktor|Hans|männ|male/i,
      ronald: /Florian|Killian|Jonas|Stefan|Markus|Martin|Yannick|Viktor|Hans|männ|male/i,
    };
    const TUNE = { hubert: { pitch: 0.78, rate: 0.93 }, ronald: { pitch: 1.0, rate: 1.06 } };
    function pick(who) {
      const s = synth();
      if (!s) return null;
      const de = s.getVoices().filter(v => /^de(-|_|$)/i.test(v.lang));
      if (!de.length) return null;
      const other = who === 'hubert' ? 'ronald' : 'hubert';
      const m = de.filter(v => PREF[who].test(v.name));
      const mine = m.find(v => !PREF[other].test(v.name) || m.length === 1) || m[0];
      return mine || de[0];
    }
    const vol = w => Math.max(0.25, Math.min(1, 1.15 - Math.hypot(P.x - w.x, P.y - w.y) / 22));
    function browserSay(it) {
      const s = synth();
      if (!s) return wait(it.text);
      return new Promise(res => {
        const u = new SpeechSynthesisUtterance(it.text);
        const v = pick(it.who);
        if (v) u.voice = v;
        u.lang = (v && v.lang) || 'de-DE';
        Object.assign(u, TUNE[it.who] || {});
        u.volume = vol(it.w);
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          clearTimeout(t);
          res();
        };
        u.onend = u.onerror = fin;
        const t = setTimeout(fin, 4000 + it.text.length * 120);
        s.speak(u);
      });
    }
    // ElevenLabs: fetched as soon as the sentence is queued, played in turn (Flash v2.5, German)
    function elFetch(it) {
      const id = (S.set.elv && S.set.elv[it.who]) || SET_DEF.elv[it.who];
      return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}?output_format=mp3_44100_64`, {
        method: 'POST',
        headers: { 'xi-api-key': S.el, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: it.text, model_id: 'eleven_flash_v2_5', language_code: 'de' }),
      }).then(r => {
        if (!r.ok) throw new Error('ElevenLabs ' + r.status);
        return r.blob();
      });
    }
    async function elSay(it) {
      let blob;
      try {
        blob = await it.audio;
      } catch (e) {
        UI.note('Sprachausgabe ElevenLabs: ' + e.message + ' – Browserstimme.');
        return browserSay(it);
      }
      const url = URL.createObjectURL(blob),
        a = new Audio(url);
      a.volume = vol(it.w);
      cur = a;
      await new Promise(res => {
        a.onended = a.onerror = res;
        a.play().catch(res);
      });
      cur = null;
      URL.revokeObjectURL(url);
    }
    const wait = text => new Promise(res => setTimeout(res, Math.max(1400, text.length * 62)));
    function say(w, text, mode = S.set.voice) {
      if (!text) return;
      const it = { w, who: w.name, text, mode, gen };
      if (mode === 'eleven' && S.el) it.audio = elFetch(it);
      Q.push(it);
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
      it.w.fig.speak = true;
      // in the talk the panel shows the whole answer; elsewhere (at the table) the line is a subtitle
      if (!(C && C.w === it.w)) NPCUI.sub(it.w, it.text);
      markDirty();
      try {
        if (it.mode === 'eleven' && it.audio) await elSay(it);
        else if (it.mode === 'browser') await browserSay(it);
        else await wait(it.text);
      } catch (e) {
        console.warn('KI voice', e);
      }
      it.w.fig.speak = false;
      busy = false;
      pump();
    }
    function stop() {
      gen++;
      for (const it of Q.splice(0)) it.w.fig.speak = false;
      const s = synth();
      if (s) s.cancel();
      if (cur) cur.pause();
      // the browser voice ends its promise through onend/onerror after cancel; the audio element through the pause → resolve here
      if (cur && cur.onended) cur.onended();
    }
    // Safari and Chrome on phones speak only after a gesture: a silent utterance on the first tap opens the way
    let unlocked = false;
    function unlock() {
      const s = synth();
      if (unlocked || !s) return;
      unlocked = true;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        s.speak(u);
      } catch (e) {}
    }
    if (synth()) synth().onvoiceschanged = () => {};
    return {
      say,
      stop,
      unlock,
      idle: () => !busy && !Q.length,
      onIdle: f => (!busy && !Q.length ? f() : idleFns.push(f)),
    };
  })();
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
  let C = null; // { w, who, system, tools, messages, pending, transcript, turns, fx, greet, stream, ended }
  const player = () => (AVATAR && AVATAR.figName ? AVATAR.figName() : 'Falko');
  function sit(c, first) {
    const w = S.mem.who[c.who];
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
      themen: QUESTS.topics(c.who).map(q => ({ k: q.k, label: q.label })),
      meinung: w.meinung,
    };
    if (first) {
      s.begruessung = c.greet || '';
      s.neu = w.neu.slice();
      w.neu = [];
    }
    return s;
  }
  function begin(w) {
    if (!ready() || C) return;
    const who = w.name;
    if (!KI_CHARS[who]) return;
    S.mem.who[who].n++;
    saveMem();
    C = {
      w,
      who,
      system: K.systemBlocks(S.mem, who, player()),
      tools: K.tools(who),
      messages: [],
      pending: [],
      transcript: [],
      turns: 0,
      fx: [],
      greet: w.lastLine || '',
      stream: null,
      ended: false,
      busy: false,
    };
    if (C.greet) C.transcript.push(['n', C.greet]);
    UI.open(true); // the greeting stays in the panel until he answers
    if (S.set.hands && EAR.ok) setTimeout(() => C && C.w === w && listen(), 350);
  }
  // the player's words → one turn (a few requests when he uses tools), spoken while it streams
  async function turn(text) {
    const c = C;
    text = String(text || '').trim();
    if (!c || c.busy || c.ended || !text) return;
    if (++c.turns > 30) {
      VOICE.say(
        c.w,
        c.who === 'hubert' ? 'So. Genug geredet für heute.' : 'Du, ich muss jetzt echt weitermachen. Bis später!'
      );
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
          UI.npc(K.spoken(said));
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
        const results = uses.map(u => {
          const r = K.runTool(S.mem, c.who, u.name, u.input, {
            day: day(),
            themen: sit(c).themen,
            quest: k => quest(c, k),
          });
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
      VOICE.say(c.w, c.who === 'hubert' ? 'Hm?' : 'Was hast du gesagt?');
    } finally {
      c.busy = false;
      UI.busy(false);
    }
    if (K.spoken(said)) c.transcript.push(['n', K.spoken(said)]);
    if (c.fx.some(f => f.k === 'ende' || (f.k === 'spielaufgabe' && f.end)))
      VOICE.onIdle(() => C === c && NPCUI.end(false));
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
      if (t && !c.ended) VOICE.say(c.w, t);
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
  function quest(c, k) {
    const qa = QUESTS.ask(c.who, k) || null;
    if (qa && qa.before) qa.before();
    let text = qa && qa.text ? [].concat(qa.text).join(' ') : '';
    if (!text && window.VOICEMAN) {
      const l = window.VOICEMAN.lines.find(x => x.id === c.who + '_t_' + k);
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
        toast(`${KI_CHARS[f.who].name} ${f.to > f.from ? 'mag dich mehr' : 'ist verstimmt'} (${f.to}/100)`, 2600);
    }
    UI.sync();
  }
  function finish() {
    if (C && !C.ended) NPCUI.end(false);
  }
  function end(w) {
    const c = C;
    if (!c || c.w !== w) return;
    c.ended = true;
    C = null;
    EAR.stop(true);
    if (c.stream) c.stream.abort();
    // the last sentence may still be spoken; a new talk stops it
    UI.open(false);
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
      K.applySummary(S.mem, c.who, JSON.parse(txt.text), day());
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
    npcAt: who => (NPCS[who] ? [NPCS[who].x, NPCS[who].y] : null),
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
  KERN.on('reset', () => {
    for (const t of S.mem.tasks) TASKS.reset(t.id);
    S.mem = K.memDefault();
    saveMem();
    UI.sync();
  });
  // ---------------- friends, gossip at the table ----------------
  QUESTS.befriend(who => !!S.mem.who[who] && K.likes(S.mem, who));
  LIFE.talkSource(() => {
    const g = K.nextGossip(S.mem);
    if (!g) return null;
    return {
      lines: g.k.zeilen,
      line(sp, text, hearing) {
        if (!hearing) return;
        if (S.set.on && S.set.voice !== 'aus') VOICE.say(sp, text);
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
    const U = { box: null, set: null, noteT: null };
    const esc = t =>
      String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
    const MIC =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>';
    // in the talk panel (#npcpanel): what you said, microphone, text field, a note line
    function build() {
      if (U.box) return;
      const pan = $('npcpanel');
      if (!pan) return;
      const box = document.createElement('div');
      box.className = 'np-ki';
      box.id = 'np-ki';
      box.hidden = true;
      box.innerHTML =
        '<div class="np-me" id="np-me" aria-live="polite"></div>' +
        `<form class="np-in" id="np-form"><button type="button" class="mic" id="np-mic" aria-pressed="false" title="Sprechen" aria-label="Sprechen">${MIC}</button>` +
        '<input id="np-say" type="text" autocomplete="off" enterkeyhint="send" placeholder="Sag etwas …" aria-label="Was du sagst">' +
        '<button type="submit" class="send">Sagen</button></form><small class="np-note" id="np-note"></small>';
      pan.appendChild(box);
      const setup = document.createElement('button');
      setup.type = 'button';
      setup.className = 'np-setup';
      setup.id = 'np-setup';
      setup.textContent = 'Frei reden – KI-Gespräche einrichten …';
      setup.hidden = true;
      setup.addEventListener('click', () => settings(true));
      pan.appendChild(setup);
      $('np-mic').addEventListener('click', () => {
        VOICE.unlock();
        EAR.reset();
        if (EAR.on) EAR.stop();
        else if (EAR.ok) listen();
        else
          UI.note(
            'Dieser Browser hat keine Spracherkennung – bitte schreiben (Chrome, Edge und Safari können zuhören).'
          );
      });
      $('np-form').addEventListener('submit', e => {
        e.preventDefault();
        VOICE.unlock();
        const i = $('np-say');
        const t = i.value;
        i.value = '';
        turn(t);
      });
      U.box = box;
      U.setup = setup;
    }
    function open(v) {
      build();
      if (!U.box) return;
      U.box.hidden = !v;
      if (v) {
        U.box.querySelector('#np-me').textContent = '';
        note('');
        if (!EAR.ok) $('np-mic').hidden = true;
      }
    }
    const me = t =>
      U.box && (U.box.querySelector('#np-me').textContent = t ? (t.endsWith('…') ? t : '„' + t + '“') : '');
    const npc = t => {
      const el = $('np-text');
      if (el) el.textContent = t || '…';
    };
    const mic = v => {
      const b = $('np-mic');
      if (b) {
        b.setAttribute('aria-pressed', v ? 'true' : 'false');
        b.classList.toggle('on', !!v);
      }
    };
    const busy = v => U.box && U.box.classList.toggle('busy', !!v);
    function note(t) {
      const el = $('np-note');
      if (!el) return;
      el.textContent = t || '';
      clearTimeout(U.noteT);
      if (t) U.noteT = setTimeout(() => (el.textContent = ''), 9000);
    }
    // the settings panel (#kipanel): on/off, key, voice, hands-free, what it cost today, what the neighbours think
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
          if (t.id === 'ki-base') S.set.base = t.value.trim().replace(/\/+$/, '');
          if (t.id === 'ki-el') S.el = t.value.trim();
          if (t.id === 'ki-elh') S.set.elv.hubert = t.value.trim() || SET_DEF.elv.hubert;
          if (t.id === 'ki-elr') S.set.elv.ronald = t.value.trim() || SET_DEF.elv.ronald;
          SAVE.set(KK, S.key);
          SAVE.set(KE, S.el);
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
        u = SAVE.get(KU),
        m = S.mem.who;
      const seg = (k, val, label) =>
        `<button type="button" data-ki="${k}:${val}" aria-pressed="${String(s[k] === val)}">${label}</button>`;
      const cost = u && u.day === today() ? ((u.inp + u.cw * 1.25 + u.cr * 0.1) * 0.1 + u.out * 0.5) / 1e4 : 0; // cents (Haiku 5.5: $0.10 / $0.50 per MTok)
      el.innerHTML =
        '<h3>Gespräche mit KI<button type="button" class="x" data-ki="close" aria-label="Schließen">×</button></h3>' +
        '<p class="fnote">Hubert und Ronald hören zu, antworten frei und merken sich, was du sagst und tust – und erzählen es sich weiter. Dafür fragt das Spiel ein schnelles KI-Modell (Claude Haiku 5.5). Ohne Schlüssel bleibt alles wie bisher.</p>' +
        `<div class="mrow"><span>KI-Gespräche</span><div class="mseg">${seg('on', true, 'an')}${seg('on', false, 'aus')}</div></div>` +
        `<label class="kf">Claude-API-Schlüssel<input id="ki-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(S.key)}"></label>` +
        '<p class="fnote">Der Schlüssel bleibt nur in diesem Browser und geht direkt an Anthropic. Anlegen: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com → API Keys</a>. Ein Gespräch kostet meist unter einem Cent.</p>' +
        `<div class="kbtns"><button type="button" data-ki="test">Schlüssel prüfen</button><span id="ki-test"></span></div>` +
        `<div class="mrow"><span>Stimme</span><div class="mseg">${seg('voice', 'browser', 'Browser')}${seg('voice', 'eleven', 'ElevenLabs')}${seg('voice', 'aus', 'nur Text')}</div></div>` +
        (s.voice === 'eleven'
          ? `<label class="kf">ElevenLabs-Schlüssel<input id="ki-el" type="password" autocomplete="off" spellcheck="false" value="${esc(S.el)}"></label>` +
            `<label class="kf">Stimme Hubert (Voice-ID)<input id="ki-elh" type="text" spellcheck="false" value="${esc(s.elv.hubert)}"></label>` +
            `<label class="kf">Stimme Ronald (Voice-ID)<input id="ki-elr" type="text" spellcheck="false" value="${esc(s.elv.ronald)}"></label>`
          : '') +
        `<div class="mrow"><span>Zuhören</span><div class="mseg">${seg('hands', true, 'nach jeder Antwort')}${seg('hands', false, 'nur per Knopf')}</div></div>` +
        (EAR.ok
          ? '<p class="fnote">Zuhören macht die Spracherkennung des Browsers (Chrome und Edge schicken die Sprache dafür an ihren Dienst, Safari an Apple); die Antwort spricht die gewählte Stimme.</p>'
          : '<p class="fnote">Dieser Browser hat keine Spracherkennung – du kannst schreiben. Chrome, Edge und Safari können zuhören.</p>') +
        `<details><summary>Server statt Schlüssel</summary><label class="kf">Adresse (leitet an die Claude-API weiter und fügt den Schlüssel hinzu)<input id="ki-base" type="url" spellcheck="false" placeholder="https://…" value="${esc(s.base)}"></label></details>` +
        `<h4>Was sie von dir halten</h4><p class="kmeinung">Hubert ${m.hubert.meinung}/100 · Ronald ${m.ronald.meinung}/100</p>` +
        `<p class="fnote">Heute: ${u && u.day === today() ? u.req : 0} Anfragen, ${u && u.day === today() ? (u.inp + u.cr + u.cw + u.out).toLocaleString('de-DE') : 0} Token (≈ ${cost.toFixed(2).replace('.', ',')} Cent)</p>` +
        '<div class="kbtns"><button type="button" data-ki="forget">Gedächtnis löschen</button></div>';
    }
    async function act(k, b) {
      const [what, val] = k.split(':');
      if (what === 'close') return settings(false);
      if (what === 'on' || what === 'hands') S.set[what] = val === 'true';
      if (what === 'voice') S.set.voice = val;
      if (what === 'forget') {
        if (!b.dataset.sure) {
          b.dataset.sure = '1';
          b.textContent = 'Wirklich alles vergessen lassen?';
          return;
        }
        for (const t of S.mem.tasks) TASKS.reset(t.id);
        S.mem = K.memDefault();
        saveMem();
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
      if (U.setup) U.setup.hidden = ready() || !S.set.on;
      if (U.set && !U.set.hidden) render();
    }
    return { open, me, npc, mic, busy, note, settings, sync, build };
  })();
  // ---------------- hooks ----------------
  NPCUI.extend({
    free: () => ready(),
    start: w => {
      UI.build();
      UI.sync();
      begin(w);
    },
    // a task button pressed during the free talk: the model hears what was asked and answered
    asked: (w, label, said) => {
      if (!C || C.w !== w) return;
      C.transcript.push(['p', label]);
      if (said.length) C.transcript.push(['n', said.join(' ')]);
      C.pending.push({ type: 'text', text: `(Er hat gefragt: „${label}“ – du hast geantwortet: „${said.join(' ')}“)` });
    },
    end: w => end(w),
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
    // tests: settings without the panel ({ key, base, voice, hands, on })
    configure(o = {}) {
      if ('key' in o) SAVE.set(KK, (S.key = o.key || ''));
      for (const k of ['on', 'voice', 'hands', 'base']) if (k in o) S.set[k] = o[k];
      saveSet();
      client = null;
      UI.sync();
    },
  };
})();
window.KI = KI;
