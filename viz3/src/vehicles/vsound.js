// ===================== V16b vehicle sounds: engine, tyres, wind, horn, doors, knocks (VSND) =====================
// Synthesised with Web Audio on the game's sound bus (audio/audio.js audio.raw()): the petrol engine as the firing frequency (four cylinders:
// revs / 30 Hz) of a sawtooth with a sub-octave and a filtered intake hiss, opening up with the throttle; the diesel of the tractor from the
// tractor recording (snd/, CC0) in pitch with the revs plus a knocking pulse, synthesised when the recording is missing. Tyres: rolling roar
// after the surface (asphalt hum, gravel crunch, field rumble), squeal when they slide; wind with the speed. In the driver's view
// everything a little muffled. Built when the engine starts, faded out and dropped when it stops.
const VSND = (() => {
  const E = new Map(); let nb = null;
  const R = () => { const r = audio.raw && audio.raw(); return r && audio.ready() ? r : null; };
  const noise = c => { if (nb && nb.sampleRate === c.sampleRate) return nb; const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return nb = b; };
  const filt = (c, type, f, q = 0.7) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
  const gain = (c, v = 0) => { const g = c.createGain(); g.gain.value = v; return g; };
  const set = (p, v, c, tau = 0.06) => p.setTargetAtTime(v, c.currentTime, tau);
  function build(v, r) { const c = r.ctx, diesel = v.spec.sound === 'diesel', N = { src: [], diesel };
    N.out = gain(c, 0); N.lp = filt(c, 'lowpass', 2500); N.lp.connect(N.out); N.out.connect(r.sfx);
    const shaper = c.createWaveShaper(); { const n = 512, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); } shaper.curve = cv; } shaper.connect(N.lp);
    const rec = diesel && audio.buf('tractor');
    if (rec) { const s = c.createBufferSource(); s.buffer = rec; s.loop = true; N.rec = s; N.recG = gain(c, 0.5); s.connect(N.recG); N.recG.connect(N.lp); N.src.push(s); }
    // firing pulses (sawtooth), the half order (square, rough), an upper harmonic
    N.o1 = c.createOscillator(); N.o1.type = 'sawtooth'; N.g1 = gain(c, rec ? 0.05 : 0.5); N.o1.connect(N.g1); N.g1.connect(shaper);
    N.o2 = c.createOscillator(); N.o2.type = 'square'; N.g2 = gain(c, rec ? 0.02 : 0.22); N.o2.connect(N.g2); N.g2.connect(shaper);
    N.o3 = c.createOscillator(); N.o3.type = 'triangle'; N.g3 = gain(c, 0.08); N.o3.connect(N.g3); N.g3.connect(shaper);
    // intake and exhaust hiss with the throttle
    const ns = c.createBufferSource(); ns.buffer = noise(c); ns.loop = true; N.nbp = filt(c, 'bandpass', 900, 1.2); N.ng = gain(c, 0); ns.connect(N.nbp); N.nbp.connect(N.ng); N.ng.connect(N.lp);
    // tyres and wind (their own path, not through the engine filter)
    const ts = c.createBufferSource(); ts.buffer = noise(c); ts.loop = true; N.tOut = gain(c, 1); N.tOut.connect(r.sfx);
    N.roll = filt(c, 'lowpass', 420, 0.8); N.rollG = gain(c, 0); ts.connect(N.roll); N.roll.connect(N.rollG); N.rollG.connect(N.tOut);
    N.grit = filt(c, 'bandpass', 2600, 0.9); N.gritG = gain(c, 0); ts.connect(N.grit); N.grit.connect(N.gritG); N.gritG.connect(N.tOut);
    N.sq = filt(c, 'bandpass', 880, 7); N.sqG = gain(c, 0); ts.connect(N.sq); N.sq.connect(N.sqG); N.sqG.connect(N.tOut);
    N.wind = filt(c, 'bandpass', 650, 0.6); N.windG = gain(c, 0); ts.connect(N.wind); N.wind.connect(N.windG); N.windG.connect(N.tOut);
    const t0 = c.currentTime + 0.02; for (const s of [N.o1, N.o2, N.o3, ns, ts, ...N.src]) s.start(t0, s.buffer ? Math.random() * (s.buffer.duration * 0.8) : undefined); N.all = [N.o1, N.o2, N.o3, ns, ts, ...N.src];
    N.out.gain.setValueAtTime(0, t0); N.out.gain.linearRampToValueAtTime(0.9, t0 + 0.5);   // the starter: a short swell
    return N; }
  function start(v) { const r = R(); if (!r || E.has(v)) return; try { E.set(v, build(v, r)); } catch (e) { console.warn('vsnd', e); } if (r) crank(v, r); }
  function crank(v, r) { const c = r.ctx, t = c.currentTime + 0.01; for (let i = 0; i < 7; i++) { const o = c.createOscillator(), g = gain(c, 0); o.type = 'sawtooth'; o.frequency.value = 38 + i * 4; o.connect(g); g.connect(r.sfx);
      g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(0.09, t + i * 0.09 + 0.02); g.gain.linearRampToValueAtTime(0, t + i * 0.09 + 0.08); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.1); } }
  function stop(v) { const N = E.get(v); if (!N) return; E.delete(v); const r = R(); if (!r) { for (const s of N.all) try { s.stop(); } catch (e) {} return; } const c = r.ctx;
    set(N.out.gain, 0, c, 0.25); set(N.tOut.gain, 0, c, 0.15); for (const s of N.all) try { s.stop(c.currentTime + 1.4); } catch (e) {} if (N.horn) horn(v, false); }
  function update(v, dt) { const r = R(); if (!r) return; if (!E.has(v) && v.st.engine) start(v); const N = E.get(v); if (!N) return; const c = r.ctx, s = v.st, sp = v.spec;
    const rpm = Math.max(sp.eng.idle * 0.9, s.rpm), f0 = rpm / 30, thr = s.thr, spd = Math.hypot(s.u, s.v), inside = !CAM3.want, k = rpm / sp.eng.red;
    set(N.o1.frequency, f0, c); set(N.o2.frequency, f0 / 2, c); set(N.o3.frequency, f0 * 2.02, c); set(N.nbp.frequency, 500 + f0 * 6, c, 0.1);
    if (N.rec) set(N.rec.playbackRate, 0.62 + 0.55 * (rpm - sp.eng.idle) / (sp.eng.red - sp.eng.idle), c, 0.12);
    const vol = N.diesel ? 0.32 + thr * 0.28 + k * 0.12 : 0.05 + thr * 0.13 + k * 0.07; set(N.out.gain, vol * (inside ? 0.75 : 1), c, 0.08);
    set(N.lp.frequency, Math.min(inside ? 1500 : 7000, (N.diesel ? 500 : 280) + rpm * (N.diesel ? 0.9 : 0.32) + thr * 1500), c, 0.08); set(N.ng.gain, thr * (N.diesel ? 0.03 : 0.07) * (0.5 + k), c, 0.1);
    // the surface under the wheels: hard (asphalt, concrete, paving), loose (gravel, earth), soft (grass, field)
    let hard = 0, loose = 0, soft = 0; for (const w of v.W) { if (w.surf < 0 || w.surf === 5) soft++; else if (w.surf >= 3) loose++; else hard++; } hard /= 4; loose /= 4; soft /= 4;
    const sv = Math.min(1, spd / 22), air = s.air ? 0 : 1, iK = inside ? 0.7 : 1;
    set(N.rollG.gain, air * sv * (hard * 0.16 + loose * 0.1 + soft * 0.14) * iK, c, 0.1); set(N.roll.frequency, 240 + hard * 260 + sv * 200, c, 0.2);
    set(N.gritG.gain, air * Math.min(1, spd / 8) * loose * 0.09 * (0.6 + 0.4 * Math.random()), c, 0.03);
    set(N.sqG.gain, air * Math.min(1, s.slip * 1.4) * (hard + loose * 0.3) * Math.min(1, spd / 6) * 0.22, c, 0.05); set(N.sq.frequency, 760 + Math.random() * 180, c, 0.05);
    set(N.windG.gain, (spd / 40) * (spd / 40) * (inside ? 0.1 : 0.2), c, 0.2); }
  function horn(v, on) { const r = R(); if (!r) return; const c = r.ctx; let N = E.get(v); if (!N) { N = v._hn || (v._hn = {}); }
    if (on && !N.horn) { const g = gain(c, 0), lp = filt(c, 'lowpass', 2600), fs = v.spec.sound === 'diesel' ? [330, 392] : [415, 494]; const os = fs.map(f => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(lp); o.start(); return o; });
      lp.connect(g); g.connect(r.sfx); set(g.gain, 0.09, c, 0.01); N.horn = { g, os }; }
    else if (!on && N.horn) { const H = N.horn; N.horn = null; set(H.g.gain, 0, c, 0.03); for (const o of H.os) o.stop(c.currentTime + 0.2); } }
  function door(v) { const r = R(); if (!r) return; const c = r.ctx, t = c.currentTime + 0.01, s = c.createBufferSource(); s.buffer = noise(c); const f = filt(c, 'lowpass', 320), g = gain(c, 0);
    s.connect(f); f.connect(g); g.connect(r.sfx); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); s.start(t, Math.random(), 0.3);
    const o = c.createOscillator(), og = gain(c, 0); o.type = 'triangle'; o.frequency.value = 2100; o.connect(og); og.connect(r.sfx); og.gain.setValueAtTime(0.05, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0005, t + 0.06); o.start(t); o.stop(t + 0.08); }
  function thud(v, k) { const r = R(); if (!r) return; const c = r.ctx, t = c.currentTime + 0.005, s = c.createBufferSource(); s.buffer = noise(c); const f = filt(c, 'lowpass', 160 + k * 300), g = gain(c, 0);
    s.connect(f); f.connect(g); g.connect(r.sfx); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4 + k * 1.1, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35 + k * 0.3); s.start(t, Math.random(), 0.8);
    if (k > 0.3) { const o = c.createOscillator(), og = gain(c, 0); o.type = 'triangle'; o.frequency.setValueAtTime(260 + Math.random() * 120, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.5); o.connect(og); og.connect(r.sfx);
      og.gain.setValueAtTime(0.12 * k, t); og.gain.exponentialRampToValueAtTime(0.0005, t + 0.6); o.start(t); o.stop(t + 0.65); } }
  return { start, stop, update, horn, door, thud, active: () => E.size };
})();
window.VSND = VSND;
