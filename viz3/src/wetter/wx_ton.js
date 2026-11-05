// ===================== feat/wetter: the sound of the weather (WXTON) – rain outside, rain on the roof inside, wind, thunder =====================
// Recordings when there are any (dist/wetter/ton.json: kind → file, volume; free licences, credits in viz3/extra/wetter/manifest.json),
// otherwise made in the browser: rain as a hiss and a patter of thousands of drops (a buffer of short decaying clicks, made once), on a roof
// lower and wooden (heard only indoors – outdoors the engine's surroundings bus is muffled indoors by itself), wind as brown noise through a
// low-pass that opens with the gusts, thunder as a crack and a long rolling rumble after the flash (distance by the delay). Built on the
// first rain or wind, through the game's audio graph (audio/audio.js: surroundings and effects buses, the player's volumes); the engine
// suspends everything while the page is hidden.
import { BASE } from '../core/head.js';
import { audio } from '../audio/audio.js';
export const WXTON = (() => {
  const S = { built: false, N: null, rec: {}, man: null, loading: null, lv: { rain: 0, roof: 0, wind: 0 }, gust: 0 };
  const raw = () => {
    const r = audio.raw && audio.raw();
    return r && r.ctx && r.ctx.state === 'running' ? r : null;
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // ---- buffers made once ----
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
    // a seamless loop: cross-fade the last 50 ms into the start
    const F = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < F; i++) {
      const k = i / F;
      d[i] = d[i] * k + d[n - F + i] * (1 - k);
    }
    for (let i = 0; i < n; i++) d[i] /= mx;
    return b;
  }
  // drops: short decaying clicks at random times (rate per second), each with its own loudness and a little ring (f Hz)
  function drops(ctx, sec, rate, f, decay) {
    const sr = ctx.sampleRate,
      n = Math.floor(sr * sec),
      b = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch),
        m = Math.floor(rate * sec);
      for (let j = 0; j < m; j++) {
        const t0 = Math.floor(Math.random() * n),
          amp = Math.pow(Math.random(), 2.5) * 0.9 + 0.02,
          len = Math.floor(sr * decay * (3 + Math.random() * 3)),
          ff = f * (0.6 + Math.random() * 0.9),
          ph = Math.random() * 6.28;
        for (let i = 0; i < len; i++) {
          const k = (t0 + i) % n,
            e = Math.exp(-i / (sr * decay));
          d[k] += amp * e * (Math.sin(ph + (6.2832 * ff * i) / sr) * 0.6 + (Math.random() * 2 - 1) * 0.4 * e);
        }
      }
      let mx = 1e-6;
      for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(d[i]));
      for (let i = 0; i < n; i++) d[i] = (d[i] / mx) * 0.9;
    }
    return b;
  }
  // ---- the graph ----
  function loop(ctx, buf, dest, chain) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    // inside the buffer by a hair: an MP3 may carry the encoder's silence at both ends (the loops are cross-faded noise – no seam)
    if (buf.duration > 1) {
      s.loopStart = 0.03;
      s.loopEnd = buf.duration - 0.03;
    }
    let node = s;
    for (const f of chain) {
      node.connect(f);
      node = f;
    }
    const g = ctx.createGain();
    g.gain.value = 0;
    node.connect(g);
    g.connect(dest);
    s.start(ctx.currentTime + 0.05, 0.03 + Math.random() * buf.duration * 0.85);
    return { s, g };
  }
  const filt = (ctx, type, f, q = 0.7) => {
    const x = ctx.createBiquadFilter();
    x.type = type;
    x.frequency.value = f;
    x.Q.value = q;
    return x;
  };
  function build(r) {
    const ctx = r.ctx;
    const nb = noise(ctx, 5, false),
      bb = noise(ctx, 6, true);
    const windF = filt(ctx, 'lowpass', 500, 0.6);
    S.N = {
      ctx,
      hiss: loop(ctx, nb, r.amb, [filt(ctx, 'highpass', 450), filt(ctx, 'lowpass', 6500, 0.5)]),
      patter: loop(ctx, drops(ctx, 4, 650, 2600, 0.0011), r.amb, [filt(ctx, 'highpass', 700)]),
      roof: loop(ctx, drops(ctx, 4, 260, 900, 0.004), r.sfx, [filt(ctx, 'bandpass', 1100, 0.6)]),
      wind: loop(ctx, bb, r.amb, [windF]),
      windF,
      whistle: loop(ctx, nb, r.amb, [filt(ctx, 'bandpass', 880, 9)]),
    };
    S.built = true;
    load(r);
  }
  // ---- recordings (optional): ton.json { regen: { file, vol }, dach: …, wind: …, donner: { files: [...], vol } } ----
  function load(r) {
    if (S.loading) return S.loading;
    S.loading = fetch(BASE + 'wetter/ton.json')
      .then(x => (x.ok ? x.json() : null))
      .then(j => {
        if (!j) return false;
        S.man = j;
        const jobs = [];
        for (const [k, v] of Object.entries(j)) {
          for (const f of v.files || (v.file ? [v.file] : [])) {
            jobs.push(
              fetch(BASE + 'wetter/' + f)
                .then(x => (x.ok ? x.arrayBuffer() : Promise.reject(new Error(x.status))))
                .then(ab => new Promise((res, rej) => r.ctx.decodeAudioData(ab, res, rej)))
                .then(b => (S.rec[k] || (S.rec[k] = [])).push(b))
                .catch(e => console.warn('wetter sound', f, e))
            );
          }
        }
        return Promise.all(jobs).then(() => useRecordings(r));
      })
      .catch(() => false);
    return S.loading;
  }
  // a recorded loop replaces the made one of its kind (hiss and patter: rain; roof; wind)
  function useRecordings(r) {
    const N = S.N;
    if (!N) return;
    const swap = (name, kind, dest) => {
      const b = S.rec[kind] && S.rec[kind][0];
      if (!b) return;
      const old = N[name];
      try {
        old.s.stop();
      } catch (e) {}
      old.g.disconnect();
      N[name] = loop(N.ctx, b, dest, []);
      N[name].rec = true;
    };
    if (S.rec.regen) {
      swap('hiss', 'regen', r.amb);
      try {
        N.patter.s.stop();
      } catch (e) {}
      N.patter.g.disconnect();
      N.patter = null;
    }
    swap('roof', 'dach', r.sfx);
    swap('wind', 'wind', r.amb);
    return true;
  }
  const vol = k => (S.man && S.man[k] && S.man[k].vol) || 1;
  // ---- per frame: the levels follow the weather (p: rain mm/h, snow cm/h, drizzle, wind and gust m/s, inside, on) ----
  function update(p, dt) {
    const rain = p.on ? p.rain : 0,
      wind = p.on ? p.wind : 0;
    // the levels first (also without sound: tests read them) – rain louder with the amount (a drizzle is a whisper), indoors the
    // drumming on the roof and the open rain muffled; wind from a fresh breeze up, the gusts open the filter and raise it
    const lr = rain > 0.03 ? clamp(0.22 + 0.24 * Math.log2(1 + rain), 0, 1) * (p.drizzle ? 0.45 : 1) : 0;
    S.lv.rain = lr;
    S.lv.roof = p.inside ? lr : 0;
    S.gust += ((p.gustK || 0) - S.gust) * Math.min(1, dt * 1.5);
    const w = wind + (Math.max(p.gust || 0, wind) - wind) * S.gust,
      lw = clamp((w - 4) / 14, 0, 1.4);
    S.lv.wind = lw;
    const r = raw();
    if (!r) return;
    if (!S.built) {
      if (lr <= 0 && lw <= 0.05) return;
      build(r);
    }
    const N = S.N,
      t = N.ctx.currentTime,
      out = p.inside ? 0.5 : 1;
    if (N.hiss) N.hiss.g.gain.setTargetAtTime(lr * out * (N.hiss.rec ? 0.9 * vol('regen') : 0.16), t, 0.6);
    if (N.patter) N.patter.g.gain.setTargetAtTime(lr * out * 0.42, t, 0.6);
    if (N.roof) N.roof.g.gain.setTargetAtTime(S.lv.roof * (N.roof.rec ? 0.8 * vol('dach') : 0.5), t, 0.5);
    if (N.wind)
      N.wind.g.gain.setTargetAtTime(
        Math.pow(lw, 1.3) * (N.wind.rec ? 0.7 * vol('wind') : 0.55) * (p.inside ? 0.6 : 1),
        t,
        0.8
      );
    if (N.windF) N.windF.frequency.setTargetAtTime(320 + 900 * clamp(lw, 0, 1), t, 0.6);
    if (N.whistle) N.whistle.g.gain.setTargetAtTime(clamp(lw - 0.75, 0, 1) * 0.05, t, 1.2);
  }
  // ---- thunder after a flash: crack and rumble, later and duller the farther (d m) ----
  function thunder(d = 3000) {
    const r = raw();
    if (!r) return false;
    const ctx = r.ctx,
      delay = d / 340,
      t0 = ctx.currentTime + delay;
    const rec = S.rec.donner;
    if (rec && rec.length) {
      const s = ctx.createBufferSource(),
        g = ctx.createGain(),
        f = filt(ctx, 'lowpass', clamp(9000 - d * 1.6, 500, 9000), 0.5);
      s.buffer = rec[Math.floor(Math.random() * rec.length)];
      g.gain.value = clamp(1.4 - d / 6000, 0.25, 1.2) * vol('donner');
      s.connect(f);
      f.connect(g);
      g.connect(r.amb);
      s.start(t0);
      return true;
    }
    const nb = S.brown || (S.brown = noise(ctx, 6, true)),
      s = ctx.createBufferSource(),
      lp = filt(ctx, 'lowpass', clamp(900 - d * 0.12, 140, 900), 0.4),
      g = ctx.createGain();
    s.buffer = nb;
    s.connect(lp);
    lp.connect(g);
    g.connect(r.amb);
    const L = clamp(1.3 - d / 7000, 0.3, 1.1),
      gg = g.gain;
    gg.setValueAtTime(0.0001, t0);
    gg.exponentialRampToValueAtTime(L * (d < 1500 ? 1.6 : 0.9), t0 + (d < 1500 ? 0.03 : 0.25));
    let tt = t0 + 0.4;
    for (let i = 0; i < 6; i++) {
      gg.exponentialRampToValueAtTime(Math.max(0.0002, L * (0.3 + Math.random() * 0.6) * Math.exp(-i * 0.35)), tt);
      tt += 0.5 + Math.random() * 0.9;
    }
    gg.exponentialRampToValueAtTime(0.0001, tt + 1.5);
    s.start(t0, Math.random() * 2);
    s.stop(tt + 2);
    return true;
  }
  return { update, thunder, S, levels: () => ({ ...S.lv }), recorded: () => Object.keys(S.rec) };
})();
