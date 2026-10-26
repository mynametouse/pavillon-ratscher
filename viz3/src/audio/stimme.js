// ===================== STIMME: a voice of its own for each person, for what is said live (the free conversations, npc/ki.js) =====================
// Falko (25.10.2026): „Stimmen realistischer, ohne dass sie Credits oder Geld kosten … eine realistischere Stimme jeweils, die zum NPC passt.“
// Engines: 'browser' – the device's own voices (free; the best German one of the right gender for each person: Edge has Microsoft's
// neural voices, Safari/macOS/iOS the Premium and Enhanced ones, Chrome the Google voice); 'eleven' – ElevenLabs with the player's own
// key (one library voice per person); 'microsoft' – Microsoft's speech service with the player's own (free) key: the very voices, pace and
// pitch of the recorded lines (REC); further engines register themselves (STIMME.engine: e.g. Piper in the browser, audio/piper.js);
// 'aus' – text only. A person is a profile { name, g: 'm' | 'f', age } (STIMME.person); the voice follows gender and age (pitch, pace),
// two people never share a voice while there are enough. Buffer engines (ElevenLabs, Piper) play through the voices' bus of
// audio/audio.js (positional, the player's volume „Stimmen“); the browser's speech gets the same volume. Settings: pav-stimme-v1.
//   const h = STIMME.prepare('hubert', 'Nu.', { at: [x, y] })   // starts synthesis at once (buffer engines)
//   await STIMME.play(h)                                          // in turn; resolves when said · STIMME.stop()
import { SAVE } from '../core/save.js';
import { BASE } from '../core/head.js';
import { audio } from './audio.js';

export const STIMME = (() => {
  // ElevenLabs library voices (German) per person; others by gender (25.10.2026, chosen with Falko's ElevenLabs workspace)
  const EL_DEF = {
    hubert: 'GPj7TWARaf5fPNhxhOI6', // Darius – Grumpy & Critical
    ronald: 'HvPMqVH31pBg9ThkOUPw', // Mats – Warm and Genuine
    gerhard: 'rzsHuAqCFTWoxDNMLxYf', // Adrian – Deep & Narrative
    manfred: 'vYm4B0DErmDBF04R0grX', // Konrad – Deep & Trustworthy
    wolfgang: 'GboUS6lvk5l3QlALJMRL', // Jens Hentschel (Saxon)
    uwe: '2QhwfRSog8ArO9AfgYMU', // Piet – Thoughtful & Unscripted
    jens: 'En37bfV9fWjqOHsrHXsZ', // Jan (Saxon)
    katrin: 'a9xTHeUqm2s31ct5pQck', // Silke – Relaxed & Friendly (patient care)
    ingrid: 'R24r0IV80Iw9eyByq1ps', // Mrs. Sophie – Freundlich Professionell
    heike: 'gVOibprogMfmHVVyo5r6', // Corinna – Grounding & Honest
    m: 'A2eYGaZmwykOiEVBlQ7h', // Michael – Calm and Clear
    f: 'yMouMDT5kvrfmH76gqc1', // Nadine – Naturally Nuanced
  };
  const DEF = { engine: 'browser', over: {}, elv: {}, fest: true, msreg: 'westeurope' };
  const KS = SAVE.key('pav-stimme-v1', {
    owner: 'stimme',
    def: DEF,
    check: s => !!s && typeof s === 'object',
    migrate: s => ({
      engine: typeof (s && s.engine) === 'string' ? s.engine : 'browser',
      over: s && s.over && typeof s.over === 'object' ? s.over : {},
      elv: s && s.elv && typeof s.elv === 'object' ? s.elv : {},
      fest: !(s && s.fest === false),
      msreg: typeof (s && s.msreg) === 'string' && /^[a-z0-9]{3,30}$/.test(s.msreg) ? s.msreg : 'westeurope',
    }),
  });
  const KE = SAVE.key('pav-ki-el', { owner: 'stimme', kind: 'text', def: '', secret: true }); // ElevenLabs API key (this browser only)
  const KM = SAVE.key('pav-ms-key', { owner: 'stimme', kind: 'text', def: '', secret: true }); // Azure AI Speech key (this browser only)
  const S = SAVE.get(KS);
  let elKey = SAVE.get(KE) || '',
    msKey = SAVE.get(KM) || '';
  const save = () => SAVE.set(KS, S);
  const PROF = {}; // key → { name, g, age }
  const ENG = {}; // name → { label, note, ok(), buf?(text, prof, voiceOf), speak?(text, prof, vol), warm?() }
  const synth = () => window.speechSynthesis || null;

  // ---------------- the voices of the recordings: Microsoft's neural voices with each person's pace and pitch ----------------
  // Falko (26.10.2026): „Die KI-Stimmen klingen ganz anders als die Stimmen, mit denen die NPCs sonst sprechen.“ The fixed lines were
  // recorded with these (tools/voices/record_lines.py WHO, lines3.py – keep in step); live speech takes the same where it can: in Edge the
  // browser's own copies of them (pitch is ignored there), everywhere with the engine 'microsoft' (Azure, the player's free key).
  // [voice, rate in %, pitch in Hz]; the voice the recordings really got (window.VOICEX.voices) wins.
  const REC = {
    hubert: ['de-DE-ConradNeural', -10, -8],
    ronald: ['de-DE-FlorianMultilingualNeural', 2, -2],
    gerhard: ['en-US-AndrewMultilingualNeural', -10, -6],
    manfred: ['de-DE-KillianNeural', -4, -6],
    wolfgang: ['en-US-BrianMultilingualNeural', -6, -6],
    uwe: ['de-AT-JonasNeural', 0, -2],
    jens: ['de-DE-KillianNeural', 7, 3],
    katrin: ['de-DE-KatjaNeural', 2, 0],
    ingrid: ['de-DE-AmalaNeural', -4, -6],
    heike: ['de-DE-SeraphinaMultilingualNeural', 0, -2],
  };
  // someone without recordings (strollers, drivers, the people of other towns): a Microsoft voice of the right gender, the least used first
  const MS_POOL = {
    m: [
      'de-DE-KillianNeural',
      'de-AT-JonasNeural',
      'de-DE-ConradNeural',
      'de-DE-FlorianMultilingualNeural',
      'de-CH-JanNeural',
    ],
    f: [
      'de-DE-KatjaNeural',
      'de-DE-AmalaNeural',
      'de-DE-SeraphinaMultilingualNeural',
      'de-AT-IngridNeural',
      'de-CH-LeniNeural',
    ],
  };
  function recOf(k) {
    const r = REC[k],
      v = (window.VOICEX && window.VOICEX.voices && window.VOICEX.voices[k]) || (r && r[0]);
    if (v) return { voice: v, rate: r ? r[1] : 0, pitch: r ? r[2] : 0, rec: true };
    const p = PROF[k] || { g: 'm', age: 50 },
      pool = MS_POOL[p.g === 'f' ? 'f' : 'm'],
      n = new Map(pool.map(x => [x, 0]));
    for (const q of Object.keys(PROF)) {
      if (q === k) break;
      const o = REC[q] ? REC[q][0] : null;
      if (o && n.has(o)) n.set(o, n.get(o) + 1);
    }
    const j = (hash(k) % 7) - 3;
    return {
      voice: pool.slice().sort((a, b) => n.get(a) - n.get(b) || pool.indexOf(a) - pool.indexOf(b))[hash(k) % 2],
      rate: (p.age >= 65 ? -8 : p.age < 35 ? 4 : 0) + j,
      pitch: (p.age >= 65 ? -6 : p.age < 35 ? 3 : 0) + j,
      rec: false,
    };
  }
  // 'de-DE-ConradNeural' → 'Conrad', as the name stands in Edge's list („Microsoft Conrad Online (Natural) - German (Germany)“)
  const shortOf = v => v.replace(/^[a-z]{2}-[A-Z]{2}-/, '').replace(/Neural$/, '');
  // the recordings' voices of another language (Andrew, Brian: multilingual, they speak German) belong to the browser's list too
  const OTHER_REC = new RegExp(
    '\\b(' +
      Object.values(REC)
        .filter(r => !/^de-/.test(r[0]))
        .map(r => shortOf(r[0]))
        .join('|') +
      ')\\b'
  );

  // ---------------- the browser's voices, the best first ----------------
  const FEM =
    /Katja|Amala|Seraphina|Louisa|Maja|Tanja|Elke|Gisela|Klarissa|Hedda|Anna|Petra|Helena|Marlene|Vicki|Ingrid|Sabine|Ramona|Kerstin|Eva|Google Deutsch|weiblich|female|Frau/i;
  const MAL =
    /Conrad|Killian|Florian|Bernd|Christoph|Kasper|Klaus|Ralf|Stefan|Markus|Martin|Yannick|Hans|Viktor|Jonas|Michael|Thorsten|männlich|male|Mann/i;
  // neural and premium voices sound natural; the compact ones of an operating system less so; eSpeak not at all
  function quality(v) {
    const n = v.name;
    let q = 0;
    if (/Online|Natural/i.test(n)) q += 100;
    if (/Premium/i.test(n)) q += 90;
    if (/Enhanced|Erweitert|Verbessert|Neural/i.test(n)) q += 70;
    if (/Google/i.test(n)) q += 45;
    if (/eSpeak/i.test(n)) q -= 60;
    if (/compact|Kompakt/i.test(n)) q -= 20;
    if (/^de[-_]DE/i.test(v.lang)) q += 4;
    if (v.localService === false) q += 3;
    return q;
  }
  const genderOf = v => (FEM.test(v.name) && !MAL.test(v.name) ? 'f' : MAL.test(v.name) ? 'm' : '?');
  let VO = [];
  function scan() {
    const s = synth();
    VO = s
      ? s
          .getVoices()
          .filter(v => (/^de([-_]|$)/i.test(v.lang) || OTHER_REC.test(v.name)) && !/undefined/.test(v.name)) // Edge 150 listed „Microsoft undefined Online“
          .map(v => ({ v, name: v.name, q: quality(v), g: genderOf(v) }))
          .sort((a, b) => b.q - a.q)
      : [];
    assign();
  }
  // ---------------- who gets which voice ----------------
  // each person, in the order they were registered (the neighbours first): the best voice of the right gender that nobody has yet;
  // with too few voices one is shared and the pitch tells them apart; a choice by hand (settings) wins
  const MAP = {};
  const hash = k => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function tune(k) {
    const p = PROF[k],
      j = ((hash(k) % 9) - 4) / 100;
    const old = p.age >= 65,
      young = p.age < 40;
    return {
      pitch: (p.g === 'f' ? 1.05 : 0.92) + (old ? -0.07 : young ? 0.05 : 0) + j,
      rate: (old ? 0.92 : young ? 1.06 : 1.0) + j / 2,
    };
  }
  function assign() {
    const used = new Map();
    for (const k of Object.keys(PROF)) {
      const p = PROF[k];
      let pick = VO.find(o => o.name === S.over[k]) || null,
        rec = null;
      // Edge: the very voice of the recordings, at the recordings' pace
      if (!pick) {
        const r = recOf(k);
        if (r && r.rec) {
          const re = new RegExp('\\b' + shortOf(r.voice) + '\\b');
          pick = VO.find(o => re.test(o.name) && /Online|Natural/i.test(o.name)) || null;
          if (pick) rec = r;
        }
      }
      if (!pick && VO.length) {
        const score = o => o.q - 35 * (used.get(o.name) || 0) - (o.g === p.g ? 0 : o.g === '?' ? 25 : 80);
        pick = VO.slice().sort((a, b) => score(b) - score(a))[0];
      }
      if (pick) used.set(pick.name, (used.get(pick.name) || 0) + 1);
      MAP[k] = Object.assign(
        { voice: pick ? pick.v : null, name: pick ? pick.name : '' },
        rec ? { pitch: 1 + rec.pitch / 100, rate: 1 + rec.rate / 100, rec: true } : tune(k)
      );
      // the same voice for two people: the second one a little lower or higher (as the recordings have it, when they share one)
      const n = pick ? used.get(pick.name) : 1;
      if (n > 1 && !rec) MAP[k].pitch += (n % 2 ? 1 : -1) * 0.08 * Math.ceil((n - 1) / 2);
    }
  }
  const s0 = synth();
  if (s0) {
    if (s0.addEventListener) s0.addEventListener('voiceschanged', scan);
    else s0.onvoiceschanged = scan;
  }
  function person(key, p) {
    PROF[key] = Object.assign({ name: key, g: 'm', age: 50 }, PROF[key], p);
    assign();
  }

  // ---------------- engines ----------------
  const wait = text => new Promise(res => setTimeout(res, Math.max(1300, text.length * 62)));
  engine('browser', {
    label: 'Gerät',
    note: 'kostenlos, die Stimmen deines Geräts',
    ok: () => !!synth(),
    speak(text, k, vol) {
      const s = synth();
      if (!s) return wait(text);
      return new Promise(res => {
        const m = MAP[k] || {},
          u = new SpeechSynthesisUtterance(text);
        if (m.voice) u.voice = m.voice;
        // a multilingual voice (Edge: Andrew, Brian) speaks German when asked to
        u.lang = m.voice && /^de/i.test(m.voice.lang) ? m.voice.lang : 'de-DE';
        u.pitch = Math.max(0.5, Math.min(1.6, m.pitch || 1));
        u.rate = Math.max(0.7, Math.min(1.3, m.rate || 1));
        u.volume = Math.max(0, Math.min(1, vol * audio.voiceLevel()));
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          clearTimeout(t);
          res();
        };
        u.onend = u.onerror = fin;
        const t = setTimeout(fin, 4000 + text.length * 120);
        s.speak(u);
      });
    },
  });
  // Microsoft's speech service (Azure AI Speech, REST), the player's own key: the free tier F0 is enough for the talks; the SSML as
  // edge-tts sends it (tools/voices/etts.py), so a live sentence sounds like the recorded ones
  const xmlEsc = t =>
    String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
  const signed = (n, u) => (n >= 0 ? '+' : '') + Math.round(n) + u;
  function ssml(text, k) {
    const r = recOf(k);
    return (
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${r.voice}">` +
      `<prosody pitch="${signed(r.pitch, 'Hz')}" rate="${signed(r.rate, '%')}" volume="+0%">${xmlEsc(text)}</prosody></voice></speak>`
    );
  }
  const msUrl = () => STIMME.msBase || `https://${S.msreg}.tts.speech.microsoft.com/cognitiveservices/v1`;
  engine('microsoft', {
    label: 'Wie die Aufnahmen',
    note: 'dieselben Microsoft-Stimmen wie die festen Sätze – eigener kostenloser Azure-Schlüssel',
    ok: () => !!msKey,
    buf(text, k) {
      return fetch(msUrl(), {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': msKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        },
        body: ssml(text, k),
      }).then(r => {
        if (!r.ok)
          throw new Error(
            r.status === 401 || r.status === 403
              ? 'Schlüssel oder Region passen nicht'
              : r.status === 429
                ? 'gerade zu viele Sätze (kostenloser Tarif), kurz warten'
                : 'Dienst antwortet ' + r.status
          );
        return r.arrayBuffer();
      });
    },
    row: k => `<i class="stms">${esc(shortOf(recOf(k).voice))}</i>`,
  });
  engine('eleven', {
    label: 'ElevenLabs',
    note: 'eigener Schlüssel, kostet Guthaben',
    ok: () => !!elKey,
    buf(text, k) {
      const id = S.elv[k] || EL_DEF[k] || EL_DEF[(PROF[k] && PROF[k].g) || 'm'];
      return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}?output_format=mp3_44100_64`, {
        method: 'POST',
        headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5', language_code: 'de' }),
      }).then(r => {
        if (!r.ok) throw new Error('ElevenLabs ' + r.status);
        return r.arrayBuffer();
      });
    },
  });
  engine('aus', { label: 'nur Text', note: 'Untertitel ohne Stimme', ok: () => true, speak: text => wait(text) });
  function engine(name, impl) {
    ENG[name] = impl;
  }
  const cur = () => (ENG[S.engine] && ENG[S.engine].ok() ? S.engine : 'browser');

  // ---------------- saying ----------------
  let gen = 0;
  // start what can start early (a buffer engine synthesises while the sentence before is still spoken)
  function prepare(k, text, o = {}) {
    const e = cur(),
      E = ENG[e];
    const h = { k, text, at: o.at || null, vol: o.vol || 1, e, gen };
    if (E.buf) {
      // feat/piper hook: the options go to the engine too ({ probe: true } – a probe may wait for its voice to load)
      h.data = Promise.resolve()
        .then(() => E.buf(text, k, PROF[k] || {}, o))
        .then(ab => decode(ab))
        .catch(err => {
          h.err = err;
          return null;
        });
    }
    return h;
  }
  function decode(ab) {
    const r = audio.raw();
    if (!r || !ab) return null;
    // AudioBuffer as is (an engine that synthesises samples); encoded audio (mp3, wav) decoded
    if (typeof AudioBuffer !== 'undefined' && ab instanceof AudioBuffer) return ab;
    return new Promise((res, rej) => r.ctx.decodeAudioData(ab, res, rej));
  }
  // how many are speaking right now; whenIdle(fn) runs fn when nobody is (npc/ki.js listens only then – the microphone must not hear them)
  let active = 0;
  const idleFns = [];
  async function play(h) {
    active++;
    try {
      return await play1(h);
    } finally {
      active--;
      if (!active) for (const f of idleFns.splice(0)) f();
    }
  }
  async function play1(h) {
    if (h.gen !== gen) return false;
    const E = ENG[h.e];
    if (E.buf) {
      const b = await h.data;
      if (h.gen !== gen) return false;
      if (b && audio.ready()) {
        const [x, y] = h.at || [0, 0];
        const ok = await audio.voiceBuf(b, x, y, { vol: 1.3 * h.vol, ref: h.at ? 7 : 1e6 });
        if (ok) return true;
        return wait(h.text);
      }
      if (h.err && STIMME.onError) STIMME.onError(E.label + ': ' + (h.err.message || h.err));
      // nothing to play (no sound, an error): the browser's voice says it
      return ENG.browser.speak(h.text, h.k, h.vol);
    }
    return E.speak(h.text, h.k, h.vol);
  }
  function stop() {
    gen++;
    const s = synth();
    if (s) s.cancel();
    // feat/piper hook: an engine drops what it still prepares
    for (const E of Object.values(ENG)) if (E.stop) E.stop();
  }
  // Safari and phones speak only after a gesture: a silent utterance on the first tap opens the way
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
    for (const E of Object.values(ENG)) if (E.warm) E.warm();
  }

  // a fixed line without a recording (the villagers' topics, Hubert's newer lines, the table talk): said in the person's voice when the
  // player wants it (settings „Feste Sätze vorlesen“); resolves when said (false: not said, the caller waits the reading time itself)
  const reads = () => S.fest && cur() !== 'aus';
  // recorded fixed lines (tools/voices/record_lines.py, extra viz3/extra/saetze → window.VOICEX): who + words → file, loaded when said
  const VX = {};
  for (const l of (window.VOICEX && window.VOICEX.lines) || []) VX[l.who + ':' + l.text] = l.file;
  const XB = new Map(); // file → decoded buffer (the last few)
  function recorded(k, text) {
    const f = VX[k + ':' + text];
    if (!f || !audio.ready()) return null;
    if (!XB.has(f)) {
      XB.set(
        f,
        fetch(BASE + 'snd/' + f)
          .then(r => (r.ok ? r.arrayBuffer() : null))
          .then(ab => (ab ? decode(ab) : null))
          .catch(() => null)
      );
      if (XB.size > 24) XB.delete(XB.keys().next().value);
    }
    return XB.get(f);
  }
  // a fixed line: its recording if there is one with these words, else (setting „Feste Sätze vorlesen“) the person's voice
  async function say(k, text, o = {}) {
    if (!text) return false;
    const rec = recorded(k, text);
    if (rec) {
      active++;
      try {
        const b = await rec;
        const [x, y] = o.at || [0, 0];
        if (b && (await audio.voiceBuf(b, x, y, { vol: 1.2, ref: o.at ? 7 : 1e6 }))) return true;
      } finally {
        active--;
        if (!active) for (const f of idleFns.splice(0)) f();
      }
    }
    if (!reads() || !PROF[k]) return false;
    await play(prepare(k, text, o));
    return true;
  }

  // ---------------- the settings (a section in the panel of npc/ki.js) ----------------
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // the part for 'microsoft': the key, the region, how to get both
  const MS_REG = [
    'westeurope',
    'germanywestcentral',
    'northeurope',
    'swedencentral',
    'francecentral',
    'switzerlandnorth',
    'uksouth',
    'eastus',
  ];
  function msPanel() {
    const reg = MS_REG.includes(S.msreg) ? MS_REG : [S.msreg].concat(MS_REG);
    return (
      `<label class="kf">Azure-Speech-Schlüssel<input data-st-mskey type="password" autocomplete="off" spellcheck="false" value="${esc(msKey)}"></label>` +
      `<label class="kf">Region<select data-st-msreg>${reg.map(r => `<option${r === S.msreg ? ' selected' : ''}>${r}</option>`).join('')}</select></label>` +
      '<p class="fnote">Dieselben Microsoft-Stimmen wie die festen Sätze – Tempo und Tonhöhe je Person wie in den Aufnahmen. Schlüssel (einmal): ' +
      '<a href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices" target="_blank" rel="noopener">portal.azure.com → Speech-Dienst erstellen</a>, ' +
      'Tarif <b>Free F0</b>, danach unter „Schlüssel und Endpunkt“ Schlüssel 1 und die Region. Kostenlos sind 500 000 Zeichen im Monat ' +
      '(gut 1 000 Antworten), danach hält der Dienst bis zum Monatsende an – es entstehen keine Kosten. Microsoft verlangt für das Konto ' +
      'Telefonnummer und Kreditkarte. Der Schlüssel bleibt nur in diesem Browser.</p>'
    );
  }
  function panel(el) {
    if (!el) return;
    if (!VO.length) scan();
    const seg = Object.entries(ENG)
      .map(
        ([k, E]) =>
          `<button type="button" data-st="engine:${k}" aria-pressed="${String(S.engine === k)}" title="${esc(E.note || '')}">${esc(E.label)}</button>`
      )
      .join('');
    const best = VO[0] ? VO[0].q : -1;
    const tip =
      S.engine === 'browser' && best < 60
        ? '<p class="fnote">Die Stimmen dieses Geräts klingen eher künstlich. Am natürlichsten (kostenlos): <b>Microsoft Edge</b> – dort sprechen neuronale Microsoft-Stimmen. Auf iPhone und Mac: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch → eine Stimme mit „Premium“ oder „Erweitert“ laden.</p>'
        : '';
    const opts = k =>
      '<option value="">automatisch' +
      (MAP[k] && MAP[k].name ? ' (' + esc(MAP[k].name) + ')' : '') +
      '</option>' +
      VO.map(o => `<option${S.over[k] === o.name ? ' selected' : ''}>${esc(o.name)}</option>`).join('');
    const rows = Object.entries(PROF)
      .map(
        ([k, p]) =>
          `<div class="strow"><span>${esc(p.name)}</span>` +
          (S.engine === 'browser'
            ? `<select data-st-voice="${k}" aria-label="Stimme von ${esc(p.name)}">${opts(k)}</select>`
            : S.engine === 'eleven'
              ? `<input data-st-el="${k}" spellcheck="false" placeholder="${esc(EL_DEF[k] || EL_DEF[p.g] || '')}" value="${esc(S.elv[k] || '')}" aria-label="ElevenLabs-Voice-ID von ${esc(p.name)}">`
              : ENG[S.engine] && ENG[S.engine].row // feat/piper hook: an engine's own choice per person
                ? ENG[S.engine].row(k, p)
                : '<i></i>') +
          `<button type="button" data-st="probe:${k}" aria-label="${esc(p.name)} probehören">▶</button></div>`
      )
      .join('');
    el.innerHTML =
      `<div class="mrow"><span>Stimme</span><div class="mseg">${seg}</div></div>` +
      tip +
      (S.engine === 'eleven'
        ? `<label class="kf">ElevenLabs-Schlüssel<input data-st-elkey type="password" autocomplete="off" spellcheck="false" value="${esc(elKey)}"></label>`
        : '') +
      (S.engine === 'microsoft' ? msPanel() : '') +
      (ENG[S.engine] && ENG[S.engine].panel ? ENG[S.engine].panel() : '') +
      `<div class="mrow"><span>Feste Sätze vorlesen</span><div class="mseg"><button type="button" data-st="fest:1" aria-pressed="${String(!!S.fest)}" title="Was die Leute ohne Aufnahme sagen (Dorfbewohner, Tischgespräche) in ihrer Stimme vorlesen">an</button><button type="button" data-st="fest:0" aria-pressed="${String(!S.fest)}">aus</button></div></div>` +
      `<details class="stlist"><summary>Stimmen der Personen</summary>${rows}</details>`;
    if (!el.dataset.wired) {
      el.dataset.wired = '1';
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-st]');
        if (!b) return;
        const [what, val] = b.dataset.st.split(':');
        if (what === 'engine') {
          S.engine = val;
          save();
          if (ENG[val] && ENG[val].warm) ENG[val].warm();
          panel(el);
        } else if (what === 'fest') {
          S.fest = val === '1';
          save();
          panel(el);
        } else if (what === 'probe') {
          unlock();
          const p = PROF[val];
          const h = prepare(val, `Hallo, ich bin ${p ? p.name : val}. So klinge ich.`, { probe: true });
          play(h);
        } else if (ENG[S.engine] && ENG[S.engine].click) ENG[S.engine].click(what, val, () => panel(el));
      });
      // keys kept with every letter (a phone may leave the field without a change event)
      el.addEventListener('input', e => {
        const t = e.target;
        if ('stMskey' in t.dataset) SAVE.set(KM, (msKey = t.value.trim()));
        else if ('stElkey' in t.dataset) SAVE.set(KE, (elKey = t.value.trim()));
      });
      el.addEventListener('change', e => {
        const t = e.target;
        if (t.dataset.stVoice) {
          if (t.value) S.over[t.dataset.stVoice] = t.value;
          else delete S.over[t.dataset.stVoice];
          save();
          assign();
        } else if (t.dataset.stEl) {
          if (t.value.trim()) S.elv[t.dataset.stEl] = t.value.trim();
          else delete S.elv[t.dataset.stEl];
          save();
        } else if ('stElkey' in t.dataset) {
          elKey = t.value.trim();
          SAVE.set(KE, elKey);
        } else if ('stMskey' in t.dataset) {
          msKey = t.value.trim();
          SAVE.set(KM, msKey);
        } else if ('stMsreg' in t.dataset) {
          S.msreg = t.value;
          save();
        } else if ('stEng' in t.dataset && ENG[S.engine] && ENG[S.engine].change) {
          // feat/piper hook: an engine's own fields (its row per person, its part of the panel)
          ENG[S.engine].change(t, () => panel(el));
        }
      });
    }
  }
  scan();
  // the first tap or key anywhere: a talk starts by itself and its answer comes later, without a gesture of its own (iPhone)
  for (const ev of ['touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { once: true, capture: true });
  return {
    person,
    profile: k => PROF[k] || null,
    engine,
    prepare,
    play,
    say,
    reads,
    // will say() speak this line (a recording of these words, or the person's voice)?
    speaks: (k, text) => !!VX[k + ':' + text] || (reads() && !!PROF[k]),
    stop,
    whenIdle: fn => (active ? idleFns.push(fn) : fn()),
    unlock,
    panel,
    get engineName() {
      return cur();
    },
    // feat/piper hook: the engine the player chose, also while it cannot speak yet (cur() then falls back to the browser's voice)
    get chosen() {
      return S.engine;
    },
    set engineName(v) {
      if (ENG[v]) {
        S.engine = v;
        save();
      }
    },
    voices: () => VO.map(o => ({ name: o.name, q: o.q, g: o.g })),
    // the voice of the recordings for a person ({ voice, rate %, pitch Hz, rec }); tests: another address for the Microsoft service
    recOf,
    msBase: '',
    voiceOf: k => (MAP[k] ? { ...MAP[k], voice: undefined } : null),
    onError: null,
  };
})();
window.STIMME = STIMME;
