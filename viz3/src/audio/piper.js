// ===================== PIPER: natural voices in the browser for free – one fitting voice per person (feat/piper, 25.10.2026) =====================
// Falko (25.10.2026): „… dass die Stimmen realistischer klingen, ohne dass sie Credits oder Geld kosten. Vielleicht findest du eine
// realistischere Stimme jeweils, die auch zum passenden NPC passt.“
// The engine 'piper' of audio/stimme.js („Natürlich“): Piper voices (rhasspy/piper, VITS models, MIT) from Hugging Face, spoken in a module
// worker (src/lazy/piper.js → dist/lazy/piper.js: onnxruntime-web, the eSpeak NG phonemizer as a program of its own, dist/piper/). The models
// are downloaded once and kept in the Cache Storage of the browser; a phone keeps one model in memory, a computer two; after a while without
// speech the worker ends and gives its memory back. What cannot be loaded (no connection, Hugging Face down, no storage) is said by the
// device's voice, with one short note. Settings: pav-piper-v1 (a voice per person chosen by hand).
// Who sounds how: VOICES (person → model, speaker, length_scale = pace, pitch); persons registered later get one by gender and age (POOL).
// Pitch is the playback rate (the AudioBuffer gets a sample rate a little off; length_scale makes up for the pace).
//   PIPER.voiceFor('hubert') → { id: 'thorsten', m, sid, ls, pitch } · PIPER.load() (all voices) · PIPER.state() · PIPER.stats()
import { SAVE } from '../core/save.js';
import { audio } from './audio.js';
import { STIMME } from './stimme.js';

export const PIPER = (() => {
  // ---------------- the German voices of rhasspy/piper-voices (MIT; mb = download size, lic = the dataset's licence) ----------------
  // measured on GitHub Actions (one thread, viz3/test/piper.py survey): medium 22 kHz ≈ 0.25 × real time, low 16 kHz ≈ 0.18 ×, high ≈ 2.4 ×
  // (too slow); one medium model takes ~200 MB of WebAssembly memory. hide: not offered by hand (too slow, a non-commercial licence)
  const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/';
  const MODELS = {
    thorsten: { p: 'de/de_DE/thorsten/medium/de_DE-thorsten-medium', mb: 63, name: 'Thorsten', g: 'm', lic: 'CC0' },
    thorsten_emotional: {
      p: 'de/de_DE/thorsten_emotional/medium/de_DE-thorsten_emotional-medium',
      mb: 77,
      name: 'Thorsten',
      g: 'm',
      lic: 'CC0',
      spk: { amused: 0, angry: 1, disgusted: 2, drunk: 3, neutral: 4, sleepy: 5, surprised: 6, whisper: 7 },
    },
    mls: { p: 'de/de_DE/mls/medium/de_DE-mls-medium', mb: 77, name: 'Hörbuch', g: '?', lic: 'CC BY 4.0', multi: true },
    kerstin: { p: 'de/de_DE/kerstin/low/de_DE-kerstin-low', mb: 63, name: 'Kerstin', g: 'f', lic: 'CC0' },
    ramona: { p: 'de/de_DE/ramona/low/de_DE-ramona-low', mb: 63, name: 'Ramona', g: 'f', lic: 'M-AILABS' },
    eva_k: { p: 'de/de_DE/eva_k/x_low/de_DE-eva_k-x_low', mb: 21, name: 'Eva K.', g: 'f', lic: 'M-AILABS' },
    karlsson: { p: 'de/de_DE/karlsson/low/de_DE-karlsson-low', mb: 63, name: 'Karlsson', g: 'm', lic: 'M-AILABS' },
    thorsten_low: {
      p: 'de/de_DE/thorsten/low/de_DE-thorsten-low',
      mb: 63,
      name: 'Thorsten (leicht)',
      g: 'm',
      hide: true,
    },
    thorsten_high: {
      p: 'de/de_DE/thorsten/high/de_DE-thorsten-high',
      mb: 114,
      name: 'Thorsten (hoch)',
      g: 'm',
      hide: true,
    },
    pavoque: {
      p: 'de/de_DE/pavoque/low/de_DE-pavoque-low',
      mb: 63,
      name: 'Pavoque',
      g: 'm',
      hide: true,
      lic: 'CC BY-NC-SA 4.0',
    },
  };
  // speakers of the multi-speaker models that may be chosen by hand: [id, gender, short description]. The audiobook model (Multilingual
  // LibriSpeech, 236 readers): the clearest readers of the survey (periodic, little noise), by pitch and colour
  const SPEAKERS = {
    thorsten_emotional: [
      ['neutral', 'm', 'ruhig'],
      ['amused', 'm', 'heiter'],
      ['surprised', 'm', 'erstaunt'],
      ['sleepy', 'm', 'müde'],
      ['angry', 'm', 'grimmig'],
    ],
    mls: [
      ['3', 'm', 'Mann, warm'],
      ['13', 'm', 'Mann, klar'],
      ['56', 'm', 'Mann, ruhig'],
      ['85', 'm', 'Mann, mittel'],
      ['6', 'm', 'Mann, tief'],
      ['44', 'm', 'Mann, gesetzt'],
      ['34', 'm', 'Mann, hell'],
      ['83', 'm', 'Mann, jung'],
      ['60', 'm', 'Mann, kräftig'],
      ['68', 'f', 'Frau, klar'],
      ['46', 'f', 'Frau, warm'],
      ['73', 'f', 'Frau, freundlich'],
      ['38', 'f', 'Frau, weich'],
      ['84', 'f', 'Frau, mittel'],
      ['15', 'f', 'Frau, hell'],
      ['57', 'f', 'Frau, ruhig'],
    ],
  };
  // ---------------- who sounds how (the cast first; ls > 1 slower, pitch < 1 lower) ----------------
  // Hubert gets the clearest German voice (Thorsten), lowered; everyone else a reader of the audiobook model of their own – one more
  // download (140 MB together) and every person sounds like somebody else
  const VOICES = {
    hubert: { v: 'thorsten', ls: 1.08, pitch: 0.9 }, // 75, gruff, older: low and slow (~100 Hz)
    ronald: { v: 'mls:3', ls: 0.95, pitch: 0.97 }, // 55, warm, talkative: a warm voice, a little quicker
    gerhard: { v: 'mls:44', ls: 1.1, pitch: 0.95 }, // 72, retired teacher: measured, lower
    manfred: { v: 'mls:56', ls: 1.0, pitch: 0.98 }, // 56, fire chief: calm, firm
    wolfgang: { v: 'mls:6', ls: 1.04, pitch: 0.97 }, // 59, forest worker: deep
    uwe: { v: 'mls:85', ls: 0.98, pitch: 1.0 }, // 46, farmer
    jens: { v: 'mls:13', ls: 0.93, pitch: 1.04 }, // 34, mechanic: clear, young, quick
    katrin: { v: 'mls:68', ls: 0.96, pitch: 1.02 }, // 39, nurse: clear
    ingrid: { v: 'mls:46', ls: 1.04, pitch: 0.97 }, // 58, Ortsteilbürgermeisterin: warm, mature
    heike: { v: 'mls:73', ls: 1.0, pitch: 1.0 }, // 47, garden and hens: friendly
  };
  // for persons registered later (strollers, drivers): readers of the same model the cast does not use
  const POOL = {
    m: ['mls:34', 'mls:83', 'mls:60', 'mls:27', 'mls:81', 'mls:49'],
    f: ['mls:38', 'mls:84', 'mls:15', 'mls:57', 'mls:12', 'mls:64'],
  };

  // ---------------- saved: a voice per person chosen by hand ----------------
  const KS = SAVE.key('pav-piper-v1', {
    owner: 'piper',
    def: { over: {} },
    check: s => !!s && typeof s === 'object' && !!s.over && typeof s.over === 'object' && !Array.isArray(s.over),
    migrate: s => (s && typeof s === 'object' ? { over: s.over && typeof s.over === 'object' ? s.over : {} } : s),
  });
  const S = SAVE.get(KS);
  for (const [k, v] of Object.entries(S.over)) if (typeof v !== 'string' || !parse(v)) delete S.over[k];
  const save = () => SAVE.set(KS, S);

  const CACHE = 'pav-piper-v1';
  const mobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const CFG = { base: HF, keep: mobile ? 1 : 2, idle: mobile ? 90 : 300 }; // sessions kept; seconds without speech until the worker ends
  const hash = k => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

  // 'model' or 'model:speaker' → { m, sid } (null when unknown)
  function parse(v) {
    const [m, s] = String(v).split(':');
    const M = MODELS[m];
    if (!M) return null;
    if (s == null) return { m, sid: 0 };
    if (M.spk && s in M.spk) return { m, sid: M.spk[s] };
    if (M.multi && /^\d+$/.test(s)) return { m, sid: +s };
    return null;
  }
  function voiceFor(k) {
    const p = STIMME.profile(k) || { g: 'm', age: 50 };
    let base = VOICES[k];
    if (!base) {
      const pool = POOL[p.g === 'f' ? 'f' : 'm'],
        h = hash(k);
      const old = p.age >= 65,
        young = p.age < 40,
        j = ((h % 7) - 3) / 100;
      base = {
        v: pool[h % pool.length],
        ls: (old ? 1.1 : young ? 0.93 : 1.0) + j,
        pitch: (old ? 0.93 : young ? 1.05 : 1.0) - j,
      };
    }
    const id = (S.over[k] && parse(S.over[k]) && S.over[k]) || base.v;
    return Object.assign({ id, auto: id === base.v }, parse(id), { ls: base.ls, pitch: base.pitch });
  }
  // a voice's gender: the speaker's for a multi-speaker model, else the model's
  function genderOf(id) {
    const p = parse(id);
    if (!p) return '?';
    const sp = String(id).split(':')[1],
      row = sp != null && (SPEAKERS[p.m] || []).find(r => r[0] === sp);
    return row ? row[1] : POOL.f.includes(id) ? 'f' : POOL.m.includes(id) ? 'm' : MODELS[p.m].g;
  }
  const spec = m => ({ id: m, url: CFG.base + MODELS[m].p + '.onnx', cfg: CFG.base + MODELS[m].p + '.onnx.json' });
  // the models the cast and the pool need, Hubert's and Ronald's first
  function needed() {
    const out = [];
    for (const k of Object.keys(VOICES).concat(['?m', '?f'])) {
      const ids = k === '?m' ? POOL.m : k === '?f' ? POOL.f : [voiceFor(k).id];
      for (const id of ids) {
        const m = parse(id).m;
        if (!out.includes(m)) out.push(m);
      }
    }
    for (const v of Object.values(S.over)) {
      const p = parse(v);
      if (p && !out.includes(p.m)) out.push(p.m);
    }
    return out;
  }

  // ---------------- state: what is in the Cache Storage, what loads, what failed ----------------
  const st = { cached: new Set(), prog: {}, loading: null, fail: null, last: null, n: 0, stats: [], requests: 0 };
  // the panel while it is open: the state line follows the download; when a load ends the whole part is drawn again
  let panelRefresh = null,
    wasLoading = false;
  function refresh() {
    const el = document.getElementById('piper-state');
    if (el) el.innerHTML = status();
    if (wasLoading && !st.loading && panelRefresh && el) panelRefresh();
    wasLoading = !!st.loading;
  }
  async function scanCache() {
    try {
      if (!window.caches) return;
      const c = await caches.open(CACHE);
      const urls = new Set((await c.keys()).map(r => r.url));
      for (const m of Object.keys(MODELS)) if (urls.has(spec(m).url) && urls.has(spec(m).cfg)) st.cached.add(m);
    } catch (e) {}
  }
  const scanned = scanCache();

  // ---------------- the worker ----------------
  let W = null,
    seq = 0,
    idleT = 0;
  const wait = new Map();
  function worker() {
    if (W) return W;
    W = new Worker(new URL('lazy/piper.js', document.baseURI).href, { type: 'module' });
    W.onmessage = e => {
      const m = e.data || {};
      if (m.op === 'progress') {
        st.prog[m.model] = { got: m.got, total: m.total };
        refresh();
        return;
      }
      const w = wait.get(m.id);
      if (!w) return;
      wait.delete(m.id);
      if (m.err) w.rej(new Error(m.err));
      else w.res(m);
    };
    W.onerror = e => {
      const err = new Error('Worker: ' + ((e && e.message) || 'konnte nicht starten'));
      for (const w of wait.values()) w.rej(err);
      wait.clear();
      end();
    };
    return W;
  }
  function call(msg, timeout = 0) {
    return new Promise((res, rej) => {
      const id = ++seq;
      wait.set(id, { res, rej });
      worker().postMessage(Object.assign({ id }, msg));
      if (timeout)
        setTimeout(() => {
          if (wait.has(id)) {
            wait.delete(id);
            rej(new Error('keine Antwort nach ' + Math.round(timeout / 1000) + ' s'));
          }
        }, timeout);
    });
  }
  // the heap of WebAssembly never shrinks: after a while without speech the worker goes, with everything it held
  function end() {
    if (W) W.terminate();
    W = null;
    for (const w of wait.values()) w.res({ cancelled: true });
    wait.clear();
  }
  function touch() {
    clearTimeout(idleT);
    idleT = setTimeout(end, CFG.idle * 1000);
  }

  // download every model that is not in the cache yet (one after the other, the cast's first)
  function load(list) {
    if (st.loading) return st.loading;
    st.fail = null;
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) {}
    st.loading = (async () => {
      await scanned;
      for (const m of list || needed()) {
        if (st.cached.has(m)) continue;
        st.prog[m] = { got: 0, total: MODELS[m].mb * 1e6 };
        refresh();
        await call({ op: 'fetch', model: spec(m) });
        st.cached.add(m);
        delete st.prog[m];
        refresh();
      }
      touch();
    })()
      .catch(e => {
        st.fail = { at: Date.now(), msg: why(e) };
        // one note where the person speaks (npc/ki.js): the device's voice goes on
        if (STIMME.onError) STIMME.onError('Natürlich: ' + st.fail.msg);
        throw e;
      })
      .finally(() => {
        st.loading = null;
        refresh();
      });
    return st.loading;
  }
  function why(e) {
    const t = String((e && e.message) || e);
    if (/fetch|network|load failed|internet/i.test(t)) return 'keine Verbindung zu Hugging Face';
    const h = t.match(/HTTP (\d+)/);
    if (h) return 'Hugging Face antwortet mit ' + h[1];
    if (/quota|storage/i.test(t)) return 'kein Platz im Speicher des Browsers';
    return t.slice(0, 160);
  }
  const failed = () => !!st.fail && Date.now() - st.fail.at < 120000;

  // samples → an AudioBuffer at the voice's pitch (a sample rate a little off plays it higher or lower)
  function toBuffer(pcm, sr) {
    if (!pcm || !pcm.length) return null;
    const r = audio.raw();
    const rate = Math.max(8000, Math.min(96000, Math.round(sr)));
    const b = r
      ? r.ctx.createBuffer(1, pcm.length, rate)
      : new AudioBuffer({ length: pcm.length, numberOfChannels: 1, sampleRate: rate });
    b.copyToChannel(pcm, 0);
    return b;
  }
  // one sentence → { pcm, sr, t } (the worker's answer), by voice spec
  async function synth(v, text) {
    touch();
    st.requests++;
    const t0 = performance.now();
    const r = await call({
      op: 'say',
      text,
      model: spec(v.m),
      sid: v.sid,
      ls: (v.ls || 1) * (v.pitch || 1),
      keep: CFG.keep,
    });
    touch();
    if (r.cancelled) return r;
    st.cached.add(v.m);
    const sec = r.pcm.length / r.sr;
    const s = Object.assign({ m: v.m, sid: v.sid, ms: Math.round(performance.now() - t0), sec: +sec.toFixed(2) }, r.t);
    s.rtf = +(s.infer / 1000 / Math.max(0.01, sec)).toFixed(3);
    st.last = s;
    st.stats.push(s);
    if (st.stats.length > 40) st.stats.shift();
    return r;
  }

  // ---------------- the engine ----------------
  STIMME.engine('piper', {
    label: 'Natürlich',
    get note() {
      return `kostenlos, lädt einmal die Stimmen (~${mb(needed())} MB)`;
    },
    ok: () => typeof Worker !== 'undefined' && !failed(),
    async buf(text, k, prof, o) {
      const v = voiceFor(k);
      await scanned;
      // not loaded yet: the device's voice says this sentence (silently), the voices load meanwhile; a probe waits for its voice
      if (!st.cached.has(v.m)) {
        const p = load();
        if (!(o && o.probe)) {
          p.catch(() => {});
          return null;
        }
        await p;
      }
      let r;
      try {
        r = await synth(v, text);
      } catch (e) {
        // a broken worker or model: the device's voice for the next two minutes, one note
        st.fail = { at: Date.now(), msg: why(e) };
        refresh();
        throw e;
      }
      if (r.cancelled) return null;
      return toBuffer(r.pcm, r.sr * (v.pitch || 1));
    },
    warm() {
      if (STIMME.chosen !== 'piper' || typeof Worker === 'undefined') return;
      scanned.then(() => {
        const list = needed();
        // all there: the runtime starts (a computer also takes Hubert's voice into memory; a phone only when someone speaks)
        if (list.every(m => st.cached.has(m)))
          call({ op: 'warm', model: mobile ? null : spec(voiceFor('hubert').m), keep: CFG.keep })
            .then(touch)
            .catch(() => {});
        else load(list).catch(() => {});
      });
    },
    stop() {
      if (W) W.postMessage({ op: 'cancel' });
    },
    panel,
    click,
    row,
    change,
  });

  // ---------------- settings: the engine's part of the panel, a voice per person ----------------
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const mb = list => list.reduce((s, m) => s + MODELS[m].mb, 0);
  const pct = (a, b) => (b ? Math.min(99, Math.floor((100 * a) / b)) : 0);
  function voiceName(id) {
    const p = parse(id);
    if (!p) return id;
    const M = MODELS[p.m],
      sp = id.split(':')[1];
    const row = sp && (SPEAKERS[p.m] || []).find(r => r[0] === sp);
    return M.name + (row ? ' – ' + row[2] : sp ? ' ' + sp : '');
  }
  function choices() {
    const out = [];
    for (const [m, M] of Object.entries(MODELS)) {
      if (M.hide) continue;
      if (M.multi || M.spk) for (const [s, g, d] of SPEAKERS[m] || []) out.push([m + ':' + s, M.name + ' – ' + d, g]);
      else out.push([m, M.name, M.g]);
    }
    return out;
  }
  function status() {
    const list = needed(),
      have = list.filter(m => st.cached.has(m));
    if (st.loading) {
      const got = list.reduce(
        (a, m) => a + (st.cached.has(m) ? MODELS[m].mb * 1e6 : (st.prog[m] && st.prog[m].got) || 0),
        0
      );
      return `Stimmen werden geladen … ${pct(got, mb(list) * 1e6)} % (${Math.round(got / 1e6)} von ${mb(list)} MB) – bis dahin spricht die Gerätestimme.`;
    }
    if (st.fail) return `Die Stimmen konnten nicht geladen werden (${esc(st.fail.msg)}) – die Gerätestimme spricht.`;
    if (have.length === list.length) return `Alle Stimmen sind geladen (${mb(list)} MB im Speicher dieses Browsers).`;
    return `Noch nicht geladen: einmal ~${mb(list.filter(m => !st.cached.has(m)))} MB von Hugging Face, danach bleiben sie in diesem Browser.`;
  }
  function panel() {
    const list = needed(),
      have = list.filter(m => st.cached.has(m));
    const l = st.last;
    const perf = l
      ? `<p class="fnote">Zuletzt: ${(l.ms / 1000).toFixed(1).replace('.', ',')} s für ${String(l.sec).replace('.', ',')} s Sprache.</p>`
      : '';
    const btn =
      st.loading || have.length === list.length
        ? ''
        : `<button type="button" data-st="pp:load">${st.fail ? 'Erneut versuchen' : 'Stimmen laden'}</button>`;
    const del = have.length && !st.loading ? '<button type="button" data-st="pp:del">Stimmen löschen</button>' : '';
    return (
      `<p class="fnote" id="piper-state">${status()}</p>` +
      (btn || del ? `<div class="kbtns">${btn}${del}</div>` : '') +
      perf +
      '<p class="fnote">Natürliche Stimmen von Piper (rhasspy, frei), im Browser gesprochen – kostenlos, ohne Konto. Auf dem Telefon braucht der erste Satz etwas länger.</p>'
    );
  }
  function click(what, val, rerender) {
    if (what !== 'pp') return;
    panelRefresh = rerender;
    if (val === 'load') load().catch(() => {});
    if (val === 'del') clear().then(rerender);
    rerender();
  }
  function row(k) {
    const v = voiceFor(k),
      auto = (VOICES[k] && VOICES[k].v) || v.id;
    const opts = choices()
      .map(([id, name]) => `<option value="${id}"${S.over[k] === id ? ' selected' : ''}>${esc(name)}</option>`)
      .join('');
    return (
      `<select data-st-eng="voice" data-k="${esc(k)}" aria-label="Stimme von ${esc((STIMME.profile(k) || {}).name || k)}">` +
      `<option value="">automatisch (${esc(voiceName(auto))})</option>${opts}</select>`
    );
  }
  function change(t) {
    if (t.dataset.stEng !== 'voice' || !t.dataset.k) return;
    if (t.value && parse(t.value)) S.over[t.dataset.k] = t.value;
    else delete S.over[t.dataset.k];
    save();
  }
  async function clear() {
    end();
    st.cached.clear();
    st.fail = null;
    try {
      if (window.caches) await caches.delete(CACHE);
    } catch (e) {}
  }

  return {
    MODELS,
    VOICES,
    POOL,
    voiceFor,
    genderOf,
    needed,
    load,
    clear,
    // tests: another address for the models (a stand-in), how many sessions, seconds until the worker ends
    configure(o = {}) {
      for (const k of ['base', 'keep', 'idle']) if (k in o) CFG[k] = o[k];
      st.cached.clear();
      return scanCache();
    },
    // tests and the settings: one sentence in a voice ('hubert' or { v: 'mls:1033', ls, pitch }) → { pcm, sr, t }
    async synth(who, text) {
      await scanned;
      const v = typeof who === 'string' ? voiceFor(who) : Object.assign({ ls: 1, pitch: 1 }, who, parse(who.v));
      return synth(v, text);
    },
    stat: () => (W ? call({ op: 'stat' }, 10000) : Promise.resolve({ mem: 0, sessions: [] })),
    phonemes: text => call({ op: 'phon', text }, 20000).then(r => r.ids),
    drop: () => (W ? call({ op: 'drop' }, 10000) : Promise.resolve({ mem: 0 })),
    end,
    state: () => ({
      cached: [...st.cached],
      loading: !!st.loading,
      prog: { ...st.prog },
      fail: st.fail,
      worker: !!W,
      requests: st.requests,
      keep: CFG.keep,
    }),
    stats: () => st.stats.slice(),
  };
})();
window.PIPER = PIPER;
