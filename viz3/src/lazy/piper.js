// Piper in the browser (feat/piper, 25.10.2026): the worker that turns a German sentence into speech – a package of its own
// (dist/lazy/piper.js, started by audio/piper.js as a module worker only when the voices „Natürlich“ are chosen). Not in modules.txt.
// - Text → phoneme ids: piper-phonemize with eSpeak NG (GPL-3.0-or-later, dist/piper/phonemize.*, made by viz3/extra/piper/make_phonemize.mjs).
//   It stays a program of its own, called like a command line: arguments in, one JSON line out – nothing of it is bundled here.
// - Phoneme ids → samples: the Piper voice (a VITS model from Hugging Face rhasspy/piper-voices, MIT models) in onnxruntime-web
//   (MIT; its WebAssembly runtime dist/piper/ort-wasm-simd-threaded.{mjs,wasm}, copied by build.py), one thread (no cross-origin isolation on
//   GitHub Pages), off the main thread so the frame rate does not stutter.
// - Models are downloaded once and kept in the Cache Storage ('pav-piper-v1'); only `keep` sessions stay in memory (a phone: one) –
//   the least recently used is released first. The heap of WebAssembly never shrinks: audio/piper.js ends the whole worker after a while
//   without speech, which gives everything back.
// Messages (audio/piper.js): { id, op: 'say', text, model: { id, url, cfg }, sid, ls, ns, nw, keep } → { id, pcm, sr, t } ·
// { id, op: 'fetch', model } (download only) · { op: 'cancel' } (drop what waits) · { id, op: 'stat' } · progress: { op: 'progress', … }
import * as ort from 'onnxruntime-web/wasm';

const BASE = new URL('../piper/', import.meta.url).href;
const CACHE = 'pav-piper-v1';
// every WebAssembly memory made here (ONNX Runtime, the phonemizer) – what the voices cost in memory
const MEMS = new Set();
for (const fn of ['instantiate', 'instantiateStreaming']) {
  const orig = WebAssembly[fn];
  if (!orig) continue;
  WebAssembly[fn] = function (src, imp) {
    return orig.call(WebAssembly, src, imp).then(r => {
      const inst = r.instance || r;
      for (const m of Object.values(inst.exports || {})) if (m instanceof WebAssembly.Memory) MEMS.add(m);
      if (imp)
        for (const ns of Object.values(imp))
          for (const v of Object.values(ns || {})) if (v instanceof WebAssembly.Memory) MEMS.add(v);
      return r;
    });
  };
}
const memMB = () => Math.round([...MEMS].reduce((s, m) => s + m.buffer.byteLength, 0) / 1e6);

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = BASE; // ort-wasm-simd-threaded.mjs and .wasm (copied by build.py)
ort.env.logLevel = 'error';

// ---------------- the phonemizer: one instance, called again for every sentence ----------------
let PH = null;
const lines = [];
function phonemizer() {
  if (!PH)
    PH = import(/* @vite-ignore */ BASE + 'phonemize.mjs')
      .then(m =>
        m.default({
          print: l => lines.push(l),
          printErr: () => {},
          locateFile: f => BASE + f,
        })
      )
      .catch(e => {
        PH = null;
        throw e;
      });
  return PH;
}
// what the phonemizer should not see: markup, emoji, quotes it would spell
const clean = t =>
  String(t)
    .replace(/[*_#~^<>[\]{}|\\"„“”‚‘’»«]/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
async function phonemes(text, voice, map) {
  const m = await phonemizer();
  lines.length = 0;
  try {
    m.callMain(['-l', voice || 'de', '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
  } catch (e) {
    PH = null; // a broken instance: a fresh one next time
    throw e;
  }
  const ids = [];
  for (const l of lines) {
    try {
      ids.push(...toIds(JSON.parse(l), map));
    } catch (e) {}
  }
  return ids;
}
// the phonemes in the ids of this model (its phoneme_id_map, as Piper does): ^ _ (phoneme _)* $ per sentence. The phonemizer's own ids
// follow the newest map; older models (the „low“ ones) know fewer symbols – „ç“ there is one sign, not c + a combining cedilla
function toIds(line, map) {
  const D = line.phoneme_ids || [],
    P = line.phonemes || [];
  if (!map) return D;
  const one = k => (map[k] ? map[k] : null);
  const pad = (one('_') || [0])[0],
    bos = (one('^') || [1])[0],
    eos = (one('$') || [2])[0];
  // sentence lengths from the phonemizer's ids (1 begins a sentence, 2 ends it, 0 is the pad between)
  const lens = [];
  let n = 0;
  for (const i of D) {
    if (i === 1) n = 0;
    else if (i === 2) lens.push(n);
    else if (i !== 0) n++;
  }
  if (lens.reduce((a, b) => a + b, 0) !== P.length) {
    const known = new Set([].concat(...Object.values(map)));
    return D.filter(i => known.has(i));
  }
  const out = [];
  let pi = 0;
  for (const len of lens) {
    out.push(bos, pad);
    const end = pi + len;
    for (; pi < end; pi++) {
      let ph = P[pi];
      const next = P[pi + 1];
      if (next && /[\u0300-\u036f]/.test(next) && !one(next) && one((ph + next).normalize('NFC'))) {
        ph = (ph + next).normalize('NFC');
        pi++;
      }
      const v = one(ph) || one(ph.normalize('NFC'));
      if (!v) continue;
      out.push(...v, pad);
    }
    out.push(eos);
  }
  return out;
}

// ---------------- models: Cache Storage, download with progress ----------------
const openCache = () => (self.caches ? caches.open(CACHE).catch(() => null) : Promise.resolve(null));
async function download(url, onp) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.split('/').pop());
  const total = +(r.headers.get('content-length') || 0);
  const chunks = [];
  let got = 0;
  if (r.body && r.body.getReader) {
    const rd = r.body.getReader();
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (onp) onp(got, total);
    }
  } else {
    const b = new Uint8Array(await r.arrayBuffer());
    chunks.push(b);
    got = b.length;
  }
  if (total && got !== total) throw new Error('unvollständig: ' + got + ' von ' + total + ' Bytes');
  return new Blob(chunks);
}
// the model's bytes: from the cache, or downloaded (and kept); without a Cache Storage (private windows) for this visit only
const loading = new Map(),
  MEMO = new Map();
function modelBytes(model, onp) {
  if (loading.has(model.url)) return loading.get(model.url);
  const p = (async () => {
    const c = await openCache();
    if (!c && MEMO.has(model.url)) return Object.assign({}, MEMO.get(model.url), { fresh: false, dl: 0 });
    const hit = c && (await c.match(model.url));
    let cfg = c && (await c.match(model.cfg));
    const t0 = performance.now();
    let fresh = false;
    if (!cfg) {
      const b = await download(model.cfg);
      if (c) await c.put(model.cfg, new Response(b, { headers: { 'content-type': 'application/json' } }));
      cfg = new Response(b);
    }
    const conf = await cfg.json();
    let blob;
    if (hit) blob = await hit.blob();
    else {
      fresh = true;
      blob = await download(model.url, onp);
      if (c) {
        try {
          await c.put(model.url, new Response(blob, { headers: { 'content-type': 'application/octet-stream' } }));
        } catch (e) {
          // full storage: this visit only
        }
      }
    }
    if (!c) MEMO.set(model.url, { blob, conf });
    return { blob, conf, fresh, dl: performance.now() - t0 };
  })();
  loading.set(model.url, p);
  return p.finally(() => loading.delete(model.url));
}

// ---------------- sessions: the least recently used goes first ----------------
const SESS = new Map(); // model id → { sess, conf, used }
async function session(model, keep, onp) {
  const have = SESS.get(model.id);
  if (have) {
    have.used = performance.now();
    return { s: have, load: 0, dl: 0, fresh: false };
  }
  const { blob, conf, fresh, dl } = await modelBytes(model, onp);
  // make room before the new one: never more than `keep` models in memory
  const lim = Math.max(1, keep || 1);
  while (SESS.size >= lim) {
    const [old] = [...SESS.entries()].sort((a, b) => a[1].used - b[1].used)[0];
    await SESS.get(old).sess.release();
    SESS.delete(old);
  }
  const t0 = performance.now();
  // no memory arena and no memory pattern: every sentence has another length, and freed memory goes back to the heap at once
  const sess = await ort.InferenceSession.create(new Uint8Array(await blob.arrayBuffer()), {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    enableCpuMemArena: false,
    enableMemPattern: false,
  });
  const s = { sess, conf, used: performance.now() };
  SESS.set(model.id, s);
  return { s, load: performance.now() - t0, dl, fresh };
}

async function say(m) {
  const t = {};
  let t0 = performance.now();
  const onp = (got, total) => self.postMessage({ op: 'progress', model: m.model.id, got, total });
  const { s, load, dl, fresh } = await session(m.model, m.keep, onp);
  t.load = Math.round(load);
  t.dl = Math.round(dl);
  t.fresh = fresh;
  t0 = performance.now();
  const ids = await phonemes(clean(m.text), s.conf.espeak && s.conf.espeak.voice, s.conf.phoneme_id_map);
  t.phon = Math.round(performance.now() - t0);
  if (!ids.length) return { pcm: new Float32Array(0), sr: s.conf.audio.sample_rate, t };
  const inf = s.conf.inference || {};
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor(
      'float32',
      Float32Array.from([
        m.ns != null ? m.ns : inf.noise_scale != null ? inf.noise_scale : 0.667,
        (inf.length_scale || 1) * (m.ls || 1),
        m.nw != null ? m.nw : inf.noise_w != null ? inf.noise_w : 0.8,
      ]),
      [3]
    ),
  };
  if ((s.conf.num_speakers || 1) > 1)
    feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(m.sid || 0)]), [1]);
  t0 = performance.now();
  const out = await s.sess.run(feeds);
  t.infer = Math.round(performance.now() - t0);
  const pcm = level(new Float32Array(out.output.data));
  out.output.dispose && out.output.dispose();
  t.mem = memMB();
  return { pcm, sr: s.conf.audio.sample_rate, t };
}

// every voice about equally loud (the audiobook readers differ by 10 dB): the loud part of the sentence to a common level, peaks below 0.95
function level(pcm) {
  const blk = 512,
    e = [];
  for (let i = 0; i + blk <= pcm.length; i += blk) {
    let s = 0;
    for (let j = i; j < i + blk; j++) s += pcm[j] * pcm[j];
    e.push(s / blk);
  }
  if (!e.length) return pcm;
  e.sort((a, b) => a - b);
  const loud = Math.sqrt(e[Math.floor(e.length * 0.8)]) || 0;
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]));
  if (loud < 1e-4 || peak < 1e-4) return pcm;
  const g = Math.min(0.12 / loud, 0.95 / peak, 6);
  for (let i = 0; i < pcm.length; i++) pcm[i] *= g;
  return pcm;
}

// one request after the other (a session runs one at a time); 'cancel' drops what still waits
let chain = Promise.resolve(),
  epoch = 0;
self.onmessage = e => {
  const m = e.data || {};
  if (m.op === 'cancel') {
    epoch++;
    return;
  }
  const my = epoch;
  chain = chain.then(async () => {
    try {
      if (m.op === 'say') {
        if (my !== epoch) return self.postMessage({ id: m.id, cancelled: true });
        const r = await say(m);
        self.postMessage({ id: m.id, pcm: r.pcm, sr: r.sr, t: r.t }, [r.pcm.buffer]);
      } else if (m.op === 'fetch') {
        const onp = (got, total) => self.postMessage({ op: 'progress', model: m.model.id, got, total });
        const r = await modelBytes(m.model, onp);
        self.postMessage({ id: m.id, ok: true, fresh: r.fresh, size: r.blob.size });
      } else if (m.op === 'warm') {
        await phonemizer();
        if (m.model) await session(m.model, m.keep);
        self.postMessage({ id: m.id, ok: true, mem: memMB() });
      } else if (m.op === 'stat') {
        self.postMessage({
          id: m.id,
          mem: memMB(),
          sessions: [...SESS.keys()],
          ort: ort.env.versions && ort.env.versions.web,
        });
      } else if (m.op === 'drop') {
        for (const s of SESS.values()) await s.sess.release();
        SESS.clear();
        self.postMessage({ id: m.id, ok: true, mem: memMB() });
      }
    } catch (err) {
      self.postMessage({ id: m.id, err: String((err && err.message) || err).slice(0, 300) });
    }
  });
};
self.postMessage({ op: 'ready' });
