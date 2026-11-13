// ===================== feat/zeitreise-welt: the futures' ambience (ZKTON) – dead forest, harvester, water, sirens, pumps, the blackout =====================
// Made in the browser (no recordings yet – free recordings with licence notes can replace a layer later, as wetter/wx_ton.js does): wind
// whistling in dead crowns (brown noise through a narrow band that wanders), a harvester far off (engine drone, the saw's bursts), water
// running in the street (noise through a gurgling band), the fire engine's two-tone horn (the German „tatü-tata“ a¹–d², ~440/585 Hz, in
// bursts), pumps the morning after (a motor's hum with a slosh), the village battery's inverter and fan in the blackout. Birds: the app's
// own birds fall silent in a dead forest (their weather factor is scaled while the Zeitreise sounds). Everything goes into the
// surroundings bus (audio.raw().amb): the player's volume applies and the regie's ducking under a voice. Built on the first sound() that
// is not silent; nothing exists while the Zeitreise is off.
import { audio } from '../audio/audio.js';

export const ZKTON = (() => {
  const S = { N: null, mix: null, birdK: 1, wxOrig: null, t: 0, err: null };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const raw = () => {
    const r = audio.raw && audio.raw();
    return r && r.ctx && r.ctx.state === 'running' && r.amb ? r : null;
  };
  function noise(ctx, sec, brown) {
    const n = Math.floor(ctx.sampleRate * sec),
      b = ctx.createBuffer(1, n, ctx.sampleRate),
      d = b.getChannelData(0);
    let last = 0,
      mx = 1e-6;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      last = brown ? (last + 0.02 * w) / 1.02 : w;
      d[i] = last;
      mx = Math.max(mx, Math.abs(last));
    }
    for (let i = 0; i < n; i++) d[i] /= mx;
    // a seamless loop: the last 60 ms cross-faded into the start
    const F = Math.floor(ctx.sampleRate * 0.06);
    for (let i = 0; i < F; i++) {
      const k = i / F;
      d[i] = d[i] * k + d[n - F + i] * (1 - k);
    }
    return b;
  }
  function build(r) {
    const ctx = r.ctx,
      out = ctx.createGain();
    out.gain.value = 1;
    out.connect(r.amb);
    const wn = noise(ctx, 4, false),
      bn = noise(ctx, 6, true);
    const src = buf => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start(ctx.currentTime + Math.random() * 0.1);
      return s;
    };
    const filt = (type, f, q = 0.7) => {
      const x = ctx.createBiquadFilter();
      x.type = type;
      x.frequency.value = f;
      x.Q.value = q;
      return x;
    };
    const gain = v => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    const lfo = (f, depth, param, type = 'sine') => {
      const o = ctx.createOscillator(),
        g = gain(depth);
      o.type = type;
      o.frequency.value = f;
      o.connect(g);
      g.connect(param);
      o.start();
      return o;
    };
    const chain = (...nodes) => {
      for (let i = 0; i + 1 < nodes.length; i++) nodes[i].connect(nodes[i + 1]);
      return nodes[nodes.length - 1];
    };
    const L = {};
    // wind in dead crowns: a whistle that wanders
    {
      const g = gain(0),
        bp = filt('bandpass', 850, 3.5);
      lfo(0.11, 260, bp.frequency);
      chain(src(bn), filt('highpass', 200), bp, g, out);
      L.deadWind = { g, k: 0.55 };
    }
    // a harvester far off: engine drone and the saw's bursts (the burst gain is driven in tick)
    {
      const g = gain(0),
        eng = ctx.createOscillator();
      eng.type = 'sawtooth';
      eng.frequency.value = 92;
      lfo(0.4, 6, eng.frequency);
      chain(eng, filt('lowpass', 520), gain(0.35), g);
      eng.start();
      const saw = ctx.createOscillator(),
        burst = gain(0);
      saw.type = 'sawtooth';
      saw.frequency.value = 215;
      lfo(7, 9, saw.frequency);
      chain(saw, filt('bandpass', 1500, 1.2), burst, g);
      saw.start();
      g.connect(out);
      L.harvester = { g, k: 0.16, burst };
    }
    // water running in the street
    {
      const g = gain(0),
        bp = filt('bandpass', 700, 0.8),
        hp = filt('highpass', 1800);
      lfo(0.37, 240, bp.frequency);
      chain(src(wn), bp, g);
      chain(src(wn), hp, gain(0.25), g);
      g.connect(out);
      L.water = { g, k: 0.5 };
    }
    // the fire engine's horn: a square LFO switches the tone between ~440 and ~585 Hz every 0.65 s; bursts driven in tick
    {
      const g = gain(0),
        o = ctx.createOscillator(),
        burst = gain(0);
      o.type = 'sawtooth';
      o.frequency.value = 512;
      lfo(0.77, 72, o.frequency, 'square');
      chain(o, filt('lowpass', 2200), filt('highpass', 300), burst, g, out);
      o.start();
      L.sirens = { g, k: 0.11, burst };
    }
    // pumps: a motor's hum and the slosh of the outflow
    {
      const g = gain(0),
        m = ctx.createOscillator();
      m.type = 'sawtooth';
      m.frequency.value = 48;
      chain(m, filt('lowpass', 260), gain(0.4), g);
      m.start();
      const sl = filt('bandpass', 420, 1.1),
        slg = gain(0.6);
      lfo(1.6, 0.5, slg.gain);
      chain(src(wn), sl, slg, g);
      g.connect(out);
      L.pumps = { g, k: 0.18 };
    }
    // the battery's inverter and fan by the school
    {
      const g = gain(0),
        h = ctx.createOscillator();
      h.type = 'triangle';
      h.frequency.value = 100;
      chain(h, gain(0.25), g);
      h.start();
      chain(src(bn), filt('lowpass', 900), gain(0.5), g);
      g.connect(out);
      L.generator = { g, k: 0.09 };
    }
    return { ctx, out, L };
  }
  // the app's birds: scaled by the dead forest while the Zeitreise sounds (the weather keeps its own say)
  function birds(k) {
    S.birdK = k;
    if (!audio.weather) return;
    if (!S.wxOrig) {
      const orig = audio.weather;
      S.wxOrig = orig;
      S.wxLast = { birds: 1, wind: 1 };
      audio.weather = o => {
        if (o && Number.isFinite(o.birds)) S.wxLast.birds = o.birds;
        if (o && Number.isFinite(o.wind)) S.wxLast.wind = o.wind;
        return orig.call(audio, o && Number.isFinite(o.birds) ? Object.assign({}, o, { birds: o.birds * S.birdK }) : o);
      };
    }
    S.wxOrig.call(audio, { birds: S.wxLast.birds * k });
  }
  function set(mix) {
    S.mix = mix || null;
    try {
      const silent = !mix || Object.entries(mix).every(([k, v]) => k === 'birds' || !v);
      if (mix) birds(clamp(mix.birds, 0, 1));
      if (silent && !S.N) return;
      const r = raw();
      if (!r) return;
      if (!S.N) S.N = build(r);
      const now = S.N.ctx.currentTime;
      for (const [k, Lr] of Object.entries(S.N.L)) {
        const v = mix ? clamp(+mix[k] || 0, 0, 1) : 0;
        Lr.g.gain.setTargetAtTime(v * Lr.k, now, 0.6);
      }
    } catch (e) {
      S.err = String(e);
    }
  }
  // bursts: the saw every ~7 s for 2.5 s, the horn 14 s on, 18 s off
  function tick(dt) {
    if (!S.N || !S.mix) return;
    S.t += dt;
    const now = S.N.ctx.currentTime,
      L = S.N.L;
    const saw = S.mix.harvester > 0 && S.t % 7 < 2.5 ? 1 : 0,
      horn = S.mix.sirens > 0 && S.t % 32 < 14 ? 1 : 0;
    L.harvester.burst.gain.setTargetAtTime(saw * 0.8, now, 0.15);
    L.sirens.burst.gain.setTargetAtTime(horn, now, 0.25);
  }
  function clear() {
    set(null);
    if (S.wxOrig) {
      audio.weather = S.wxOrig;
      S.wxOrig.call(audio, { birds: S.wxLast ? S.wxLast.birds : 1 });
      S.wxOrig = null;
    }
    S.birdK = 1;
  }
  function stats() {
    return { built: !!S.N, mix: S.mix, birdK: S.birdK, err: S.err };
  }
  return { set, tick, clear, stats, S };
})();
