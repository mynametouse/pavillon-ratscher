// ===================== feat/zombie: the sounds of the zombie night – the siren on the old school, groans, blows, shots (ZTON) =====================
// The siren: real recordings from Wikimedia Commons (dist/zombie/: the civil-defence howl of an E57 motor siren – „-stk“, CC BY-SA 4.0 – for
// the evening, a village siren with church bells – „Nicor“, CC0 – for the morning), loaded only when the zombie night starts, played from the
// siren mast on the school's ridge (world/village_props.js) with distance and a long echo over the valley; without the files a synthesised
// motor siren (rotor spinning up, two tones a minor third apart, falling when switched off). The fight (Falko 5.11.2026: „Die Geräusche
// beim Kämpfen … sollten realistischer sein“): recordings with free licences in dist/zombie/kampf/ (kampf.json: kind → files, volume;
// viz3/extra/zombie/quellen/CREDITS_TON.md), a variant at random, a little faster or slower each time, never the same twice in a row;
// whatever has no recording is synthesised: the groans and snarls of the zombies (a rough vocal source through two formant filters),
// whooshes (light and heavy, timed to the strike), punches, kicks, blows, cuts, splashes, the shotgun's report with the valley's echo, its
// lever, shells and snap, a body falling, a heartbeat at low health. All through the game's audio graph (audio/audio.js: the effects bus,
// the reverb send, the player's volumes).
import { BASE } from '../core/head.js';
import { audio } from '../audio/audio.js';
import { VPROPS } from '../world/village_props.js';
import { VILLAGE } from '../world/village.js';
export const ZTON = (() => {
  const S = { buf: {}, loading: null, sir: null, heartT: 0 };
  const raw = () => {
    const r = audio.raw && audio.raw();
    return r && r.ctx && r.ctx.state === 'running' ? r : null;
  };
  const FILES = { heulton: 'zombie/sirene_heulton.mp3', morgen: 'zombie/sirene_morgen.mp3' };
  // the recordings, once (decoded when the audio context exists – after the first tap)
  function load() {
    if (S.loading) return S.loading;
    const r = audio.raw && audio.raw();
    if (!r || !r.ctx) return Promise.resolve(false);
    loadKampf(r);
    S.loading = Promise.all(
      Object.entries(FILES).map(([k, f]) =>
        fetch(BASE + f)
          .then(x => (x.ok ? x.arrayBuffer() : Promise.reject(new Error(x.status))))
          .then(ab => new Promise((res, rej) => r.ctx.decodeAudioData(ab, res, rej)))
          .then(b => (S.buf[k] = b))
          .catch(e => console.warn('zombie sound', f, e))
      )
    ).then(() => true);
    return S.loading;
  }
  // ---- the fight's recordings: kampf.json { kind: { files: [...], vol } }, decoded once ----
  const KAMPF = { map: null, buf: {}, last: {} };
  function loadKampf(r) {
    if (KAMPF.loading) return KAMPF.loading;
    KAMPF.loading = fetch(BASE + 'zombie/kampf.json')
      .then(x => (x.ok ? x.json() : null))
      .then(j => {
        if (!j) return false;
        KAMPF.map = j;
        const files = [...new Set(Object.values(j).flatMap(v => v.files || []))];
        return Promise.all(
          files.map(f =>
            fetch(BASE + 'zombie/' + f)
              .then(x => (x.ok ? x.arrayBuffer() : Promise.reject(new Error(x.status))))
              .then(ab => new Promise((res, rej) => r.ctx.decodeAudioData(ab, res, rej)))
              .then(b => (KAMPF.buf[f] = b))
              .catch(e => console.warn('zombie sound', f, e))
          )
        ).then(() => true);
      })
      .catch(() => false);
    return KAMPF.loading;
  }
  // one of the recordings of a kind at (x, y): false when there is none (then the caller synthesises)
  function sample(kind, x, y, o = {}) {
    const m = KAMPF.map && KAMPF.map[kind];
    if (!m || !m.files) return false;
    const fs = m.files.filter(f => KAMPF.buf[f]);
    if (!fs.length) return false;
    const r = raw();
    if (!r) return true;
    let i = Math.floor(Math.random() * fs.length);
    if (fs.length > 1 && fs[i] === KAMPF.last[kind]) i = (i + 1) % fs.length;
    KAMPF.last[kind] = fs[i];
    const c = chain(r, x, y, (m.vol ?? 0.8) * (o.vol ?? 1), o.ref || 10, o.wet ?? 0.2);
    if (c.sp.vol * (m.vol ?? 0.8) < 0.005) return true;
    const src = r.ctx.createBufferSource();
    src.buffer = KAMPF.buf[fs[i]];
    src.playbackRate.value = o.rate || 0.93 + Math.random() * 0.14;
    src.connect(c.in);
    src.start(r.ctx.currentTime + (o.delay || 0));
    return true;
  }
  const hasSample = k => !!(KAMPF.map && KAMPF.map[k] && KAMPF.map[k].files.some(f => KAMPF.buf[f]));
  // where the siren stands: the mast on the old school (building 215), else the Anger
  function sirenAt() {
    const sc = VPROPS && VPROPS.school;
    if (sc && Number.isFinite(sc.cx))
      return [sc.cx + 5.5 * Math.cos(sc.rot || 0), sc.cy + 5.5 * Math.sin(sc.rot || 0), (sc.zr || 6) + 1.2];
    const b = VILLAGE && VILLAGE.byId && VILLAGE.byId.get(215);
    return b ? [b.cx, b.cy, (b.foot || 0) + 9] : [222, -108, 12];
  }
  // a gain and a panner for a source at (x, y), routed to the effects bus and (k) to the reverb
  function chain(r, x, y, vol, ref, wet = 0.25) {
    const sp = audio.spatial(x, y, ref),
      g = r.ctx.createGain(),
      lp = r.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = sp.lp;
    g.gain.value = vol * sp.vol;
    lp.connect(g);
    let out = g;
    if (r.ctx.createStereoPanner) {
      const p = r.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, sp.pan));
      g.connect(p);
      out = p;
    }
    out.connect(r.sfx);
    if (wet > 0) {
      const w = r.ctx.createGain();
      w.gain.value = wet * vol * Math.max(sp.vol, 0.05);
      g.connect(w);
      w.connect(r.wet);
    }
    return { in: lp, g, lp, sp };
  }
  // ---- the siren ----
  // a long echo over the valley: two delays with a darkening feedback
  function echo(r, src, k = 0.35) {
    const d1 = r.ctx.createDelay(3),
      d2 = r.ctx.createDelay(3),
      fb = r.ctx.createGain(),
      lp = r.ctx.createBiquadFilter(),
      out = r.ctx.createGain();
    d1.delayTime.value = 0.62;
    d2.delayTime.value = 1.43;
    fb.gain.value = 0.32;
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    out.gain.value = k;
    src.connect(d1);
    src.connect(d2);
    d1.connect(lp);
    d2.connect(lp);
    lp.connect(fb);
    fb.connect(d1);
    lp.connect(out);
    return out;
  }
  function siren(kind = 'heulton') {
    const r = raw();
    stopSiren(0.5);
    if (!r) return null;
    const [x, y] = sirenAt(),
      t = r.ctx.currentTime + 0.05,
      g = r.ctx.createGain(),
      lp = r.ctx.createBiquadFilter(),
      pan = r.ctx.createStereoPanner ? r.ctx.createStereoPanner() : null;
    lp.type = 'lowpass';
    lp.frequency.value = 9000;
    g.gain.value = 0;
    lp.connect(g);
    if (pan) {
      g.connect(pan);
      pan.connect(r.sfx);
    } else g.connect(r.sfx);
    const e = echo(r, g);
    e.connect(r.sfx);
    const w = r.ctx.createGain();
    w.gain.value = 0.5;
    g.connect(w);
    w.connect(r.wet);
    let src = null,
      dur = 0;
    const b = S.buf[kind];
    if (b) {
      src = r.ctx.createBufferSource();
      src.buffer = b;
      src.connect(lp);
      src.start(t);
      dur = b.duration;
    } else dur = synthSiren(r, lp, t, kind);
    S.sir = { src, g, lp, pan, x, y, t0: t, dur, vol: kind === 'morgen' ? 1.1 : 1.35, nodes: [e, w] };
    update(0);
    return dur;
  }
  // without the recordings: a motor siren – the rotor spins up (≈ 7 s), howls, and runs down when switched off
  function synthSiren(r, dest, t, kind) {
    const f1 = kind === 'morgen' ? 433 : 423,
      o1 = r.ctx.createOscillator(),
      o2 = r.ctx.createOscillator(),
      ga = r.ctx.createGain(),
      gb = r.ctx.createGain(),
      bp = r.ctx.createBiquadFilter();
    o1.type = 'sawtooth';
    o2.type = 'square';
    ga.gain.value = 0.18;
    gb.gain.value = 0.07;
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 0.6;
    o1.connect(ga);
    o2.connect(gb);
    ga.connect(bp);
    gb.connect(bp);
    bp.connect(dest);
    const F = [o1.frequency, o2.frequency],
      set = (k, v, at, tau) => F.forEach((p, i) => p.setTargetAtTime(v * (i ? 1.19 : 1), at, tau));
    F.forEach((p, i) => p.setValueAtTime(30 * (i ? 1.19 : 1), t));
    let T = t,
      dur;
    if (kind === 'morgen') {
      set(0, f1, T, 2.2); // one long tone, then it runs down
      T += 45;
      set(0, 60, T, 6);
      dur = 70;
    } else {
      set(0, f1, T, 2.4);
      T += 9;
      for (let i = 0; i < 9; i++) {
        set(0, f1 * 0.75, T, 1.1); // switched off: it falls …
        T += 2.2;
        set(0, f1, T, 0.9); // … on again
        T += 2.6;
      }
      set(0, 55, T, 7);
      dur = T - t + 28;
    }
    ga.gain.setTargetAtTime(0, t + dur - 6, 2);
    gb.gain.setTargetAtTime(0, t + dur - 6, 2);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur);
    o2.stop(t + dur);
    return dur;
  }
  function stopSiren(fade = 1.5) {
    const s = S.sir;
    if (!s) return;
    S.sir = null;
    try {
      const r = audio.raw();
      if (r) s.g.gain.setTargetAtTime(0, r.ctx.currentTime, fade * 0.35);
      setTimeout(
        () => {
          try {
            if (s.src) s.src.stop();
          } catch (e) {}
          s.g.disconnect();
        },
        fade * 1000 + 200
      );
    } catch (e) {}
  }
  // per frame: the siren follows the listener (distance, direction, the valley muffles it with distance)
  function update(dt) {
    const s = S.sir;
    if (s) {
      const r = audio.raw();
      if (!r) return;
      if (r.ctx.currentTime > s.t0 + s.dur + 2) {
        S.sir = null;
        return;
      }
      const sp = audio.spatial(s.x, s.y, 260),
        tt = r.ctx.currentTime;
      s.g.gain.setTargetAtTime(s.vol * Math.max(0.18, sp.vol), tt, 0.25);
      s.lp.frequency.setTargetAtTime(Math.max(1400, 9000 - sp.dist * 9), tt, 0.3);
      if (s.pan) s.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, sp.pan)), tt, 0.25);
    }
    if (S.heart > 0) {
      S.heartT -= dt;
      if (S.heartT <= 0) {
        S.heartT = 0.62 + (1 - S.heart) * 0.5;
        heartbeat(S.heart);
      }
    }
  }
  const sirenOn = () => !!S.sir;
  // ---- voices of the dead: a rough source (sawtooth with jitter) through two formants (vowels between „oh“ and „ah“), breath on top ----
  const _noise = {};
  function noiseBuf(r) {
    if (_noise.b && _noise.c === r.ctx) return _noise.b;
    const n = r.ctx.sampleRate * 1.5,
      b = r.ctx.createBuffer(1, n, r.ctx.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    _noise.b = b;
    _noise.c = r.ctx;
    return b;
  }
  let shaperCurve = null;
  function shaper(r) {
    const ws = r.ctx.createWaveShaper();
    if (!shaperCurve) {
      shaperCurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 1023) * 2 - 1;
        shaperCurve[i] = Math.tanh(x * 3.2);
      }
    }
    ws.curve = shaperCurve;
    return ws;
  }
  function voice(x, y, o) {
    const r = raw();
    if (!r) return;
    const c = chain(r, x, y, o.vol, o.ref || 9, 0.3);
    if (c.sp.vol * o.vol < 0.01) return;
    const t = r.ctx.currentTime + 0.01,
      d = o.dur,
      src = r.ctx.createOscillator(),
      jit = r.ctx.createOscillator(),
      jg = r.ctx.createGain(),
      f1 = r.ctx.createBiquadFilter(),
      f2 = r.ctx.createBiquadFilter(),
      env = r.ctx.createGain(),
      ws = shaper(r);
    src.type = 'sawtooth';
    src.frequency.setValueAtTime(o.f0, t);
    src.frequency.linearRampToValueAtTime(o.f1, t + d);
    jit.type = 'sine';
    jit.frequency.value = o.jit || 7;
    jg.gain.value = o.f0 * 0.06;
    jit.connect(jg);
    jg.connect(src.frequency);
    f1.type = f2.type = 'bandpass';
    f1.frequency.setValueAtTime(o.F1, t);
    f1.frequency.linearRampToValueAtTime(o.F1 * (o.slide || 0.8), t + d);
    f2.frequency.value = o.F2;
    f1.Q.value = 5;
    f2.Q.value = 7;
    src.connect(ws);
    ws.connect(f1);
    ws.connect(f2);
    f1.connect(env);
    f2.connect(env);
    // breath and rattle
    const nz = r.ctx.createBufferSource(),
      nf = r.ctx.createBiquadFilter(),
      ng = r.ctx.createGain();
    nz.buffer = noiseBuf(r);
    nf.type = 'bandpass';
    nf.frequency.value = o.breathF || 1400;
    nf.Q.value = 0.8;
    ng.gain.value = o.breath || 0.25;
    nz.connect(nf);
    nf.connect(ng);
    ng.connect(env);
    env.connect(c.in);
    // the envelope: rises, wavers, breaks off
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + o.att);
    const n = Math.max(1, Math.floor(d / 0.17));
    for (let i = 1; i < n; i++)
      env.gain.linearRampToValueAtTime(0.55 + Math.random() * 0.45, t + o.att + ((d - o.att) * i) / n);
    env.gain.linearRampToValueAtTime(0, t + d);
    for (const s of [src, jit, nz]) {
      s.start(t);
      s.stop(t + d + 0.05);
    }
  }
  const R = (a, b) => a + Math.random() * (b - a);
  // a low moan (wandering), a snarl (having seen you), the blow of an attack, the gurgle of dying
  const groan = (x, y, k = 1) =>
    voice(x, y, {
      vol: 0.5 * k,
      f0: R(78, 118),
      f1: R(60, 95),
      F1: R(420, 620),
      F2: R(900, 1250),
      dur: R(1.1, 2.2),
      att: 0.25,
      ref: 8,
    });
  const snarl = (x, y) =>
    voice(x, y, {
      vol: 0.75,
      f0: R(170, 240),
      f1: R(120, 170),
      F1: R(650, 820),
      F2: R(1300, 1700),
      dur: R(0.5, 0.9),
      att: 0.05,
      breath: 0.55,
      breathF: 2200,
      jit: 11,
      ref: 10,
    });
  const attack = (x, y) =>
    voice(x, y, {
      vol: 0.85,
      f0: R(200, 260),
      f1: R(150, 190),
      F1: 780,
      F2: 1500,
      dur: 0.38,
      att: 0.03,
      breath: 0.7,
      breathF: 2600,
      jit: 13,
      ref: 9,
    });
  const die = (x, y) =>
    voice(x, y, {
      vol: 0.7,
      f0: R(130, 150),
      f1: 48,
      F1: 560,
      F2: 1000,
      slide: 0.55,
      dur: R(1.3, 1.9),
      att: 0.04,
      breath: 0.6,
      breathF: 900,
      jit: 17,
      ref: 9,
    });
  // ---- blows and gore: filtered noise bursts and a low thump ----
  function burst(
    x,
    y,
    { f = 800, q = 1, type = 'bandpass', vol = 0.6, d = 0.15, a = 0.003, f1 = null, ref = 10, thump = 0, wet = 0.2 }
  ) {
    const r = raw();
    if (!r) return;
    const c = chain(r, x, y, vol, ref, wet);
    if (c.sp.vol * vol < 0.008) return;
    const t = r.ctx.currentTime + 0.005,
      nz = r.ctx.createBufferSource(),
      fl = r.ctx.createBiquadFilter(),
      g = r.ctx.createGain();
    nz.buffer = noiseBuf(r);
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    fl.Q.value = q;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + a);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    nz.connect(fl);
    fl.connect(g);
    g.connect(c.in);
    nz.start(t, Math.random());
    nz.stop(t + d + 0.05);
    if (thump) {
      const o = r.ctx.createOscillator(),
        og = r.ctx.createGain();
      o.frequency.setValueAtTime(thump, t);
      o.frequency.exponentialRampToValueAtTime(thump * 0.45, t + 0.18);
      og.gain.setValueAtTime(0.9, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(og);
      og.connect(c.in);
      o.start(t);
      o.stop(t + 0.25);
    }
  }
  // a blow lands: by the weapon (w) a recording – the fist, the boot, blunt, blade, the fork's stab; else by the kind of harm, synthesised
  const HITK = {
    faust: 'punch',
    tritt: 'kick',
    spaten: 'hit_blunt',
    brechstange: 'hit_blunt',
    axt: 'hit_blade',
    beil: 'hit_blade',
    sense: 'hit_blade',
    mistgabel: 'stab',
    flinte: 'splat',
  };
  const hit = (x, y, kind, w) => {
    const k =
      HITK[w] || (kind === 'blade' ? 'hit_blade' : kind === 'pierce' ? 'stab' : kind === 'saw' ? null : 'hit_blunt');
    if (k && sample(k, x, y, { ref: 9 })) {
      if ((w === 'spaten' || w === 'brechstange' || w === 'tritt') && Math.random() < 0.35)
        sample('bone_crack', x, y, { ref: 8 });
      return;
    }
    if (w === 'faust') {
      // a smack: a short bright slap on a low thump
      burst(x, y, { f: 1900, q: 1.2, vol: 0.45, d: 0.035, a: 0.001, ref: 8, wet: 0.1 });
      burst(x, y, { f: 180, q: 0.8, type: 'lowpass', vol: 0.7, d: 0.11, thump: 95, ref: 8 });
    } else if (w === 'tritt') {
      burst(x, y, { f: 140, q: 0.7, type: 'lowpass', vol: 0.95, d: 0.18, thump: 68, ref: 9 });
      burst(x, y, { f: 900, q: 0.9, vol: 0.25, d: 0.08, a: 0.004, ref: 8 });
    } else if (kind === 'blade') {
      burst(x, y, { f: 3200, f1: 900, q: 0.8, type: 'bandpass', vol: 0.55, d: 0.14 });
      burst(x, y, { f: 520, q: 1.4, vol: 0.6, d: 0.2, a: 0.01, thump: 110 });
    } else if (kind === 'pierce') burst(x, y, { f: 700, f1: 300, q: 1.6, vol: 0.6, d: 0.18, thump: 90 });
    else burst(x, y, { f: 260, q: 0.9, type: 'lowpass', vol: 0.85, d: 0.16, thump: 75 });
  };
  const splat = (x, y, k = 1) => {
    if (sample('splat', x, y, { vol: Math.min(1.2, 0.6 + 0.4 * k), ref: 8 })) return;
    burst(x, y, { f: 600, f1: 220, q: 0.9, vol: 0.5 * k, d: 0.28, a: 0.006 });
    burst(x, y, { f: 1800, q: 2.5, vol: 0.18 * k, d: 0.09 });
  };
  const crack = (x, y) => {
    if (sample('bone_crack', x, y, { ref: 9 })) return;
    burst(x, y, { f: 2400, f1: 1200, q: 3, vol: 0.55, d: 0.07, thump: 160 });
  };
  // the whoosh of a swing: heavy tools low and long, the fist and the hatchet short and high; it starts this much before the blow lands
  const HEAVY = { spaten: 1, axt: 1, sense: 1, mistgabel: 0.7, brechstange: 0.8, tritt: 0.6 };
  const whooshLead = id => (HEAVY[id] ? 0.17 : 0.1);
  function swing(x, y, id) {
    const h = HEAVY[id] || 0;
    if (sample(h >= 0.7 ? 'swing_heavy' : 'swing_light', x, y, { ref: 4, wet: 0.05, vol: id === 'faust' ? 0.6 : 1 }))
      return;
    const r = raw();
    if (!r) return;
    // a band of noise sweeping up and down again (the air past the blade), louder in the middle
    const c = chain(r, x, y, (0.16 + 0.14 * h) * (id === 'faust' ? 0.7 : 1), 4, 0),
      t = r.ctx.currentTime + 0.005,
      d = 0.13 + 0.17 * h,
      nz = r.ctx.createBufferSource(),
      bp = r.ctx.createBiquadFilter(),
      g = r.ctx.createGain();
    nz.buffer = noiseBuf(r);
    bp.type = 'bandpass';
    bp.Q.value = 1.6;
    const f0 = 380 + (1 - h) * 500,
      f1 = 1500 + (1 - h) * 1700;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + d * 0.55);
    bp.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + d * 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    nz.connect(bp);
    bp.connect(g);
    g.connect(c.in);
    nz.start(t, Math.random());
    nz.stop(t + d + 0.05);
  }
  // the Doppelflinte's lever and hinge, the shells, the snap shut
  const gunOpen = (x, y) => {
    if (sample('shotgun_open', x, y, { ref: 5, wet: 0.05 })) return;
    burst(x, y, { f: 3800, q: 6, vol: 0.4, d: 0.03, ref: 5, wet: 0 });
    setTimeout(() => burst(x, y, { f: 1300, q: 3, vol: 0.45, d: 0.07, thump: 240, ref: 5, wet: 0 }), 90);
  };
  const shellIn = (x, y) => {
    if (sample('shotgun_shell', x, y, { ref: 5, wet: 0.05 })) return;
    burst(x, y, { f: 2200, f1: 900, q: 2, vol: 0.25, d: 0.08, a: 0.01, ref: 5, wet: 0 });
    setTimeout(() => burst(x, y, { f: 3000, q: 5, vol: 0.3, d: 0.025, ref: 5, wet: 0 }), 70);
  };
  const gunClose = (x, y) => {
    if (sample('shotgun_close', x, y, { ref: 6, wet: 0.08 })) return;
    burst(x, y, { f: 2600, q: 4, vol: 0.6, d: 0.045, thump: 300, ref: 6, wet: 0.05 });
  };
  const shellDrop = (x, y) => {
    for (const [dt, f] of [
      [0, 2900],
      [110, 3600],
      [190, 2500],
    ])
      setTimeout(() => burst(x, y, { f, q: 9, vol: 0.18, d: 0.05, ref: 4, wet: 0 }), dt);
  };
  const dry = (x, y) => {
    if (sample('shotgun_dry', x, y, { ref: 5, wet: 0 })) return;
    burst(x, y, { f: 3500, q: 5, vol: 0.35, d: 0.03, ref: 5, wet: 0 });
  };
  // a body hits the ground
  const fall = (x, y) => {
    if (sample('body_fall', x, y, { ref: 9 })) return;
    burst(x, y, { f: 120, q: 0.7, type: 'lowpass', vol: 0.8, d: 0.28, thump: 55, ref: 9 });
    setTimeout(() => burst(x, y, { f: 700, q: 0.8, vol: 0.18, d: 0.15, a: 0.01, ref: 8 }), 60);
  };
  const bang = (x, y) => {
    burst(x, y, { f: 180, q: 0.8, type: 'lowpass', vol: 1.0, d: 0.3, thump: 62, ref: 18, wet: 0.45 });
    burst(x, y, { f: 1100, q: 2, vol: 0.35, d: 0.12, ref: 14 });
  };
  const splinter = (x, y) => {
    for (let i = 0; i < 4; i++)
      setTimeout(() => burst(x, y, { f: R(1500, 3200), q: 4, vol: 0.4, d: 0.06, ref: 14 }), i * R(25, 60));
    burst(x, y, { f: 300, q: 0.7, type: 'lowpass', vol: 0.9, d: 0.35, thump: 70, ref: 16 });
  };
  const hammer = (x, y) => burst(x, y, { f: 2600, q: 6, vol: 0.5, d: 0.06, thump: 220, ref: 14 });
  function shot(x, y) {
    if (sample('shotgun_shot', x, y, { ref: 60, wet: 0.6, rate: 0.97 + Math.random() * 0.06 })) {
      const r = raw();
      if (r)
        setTimeout(
          () => burst(x, y, { f: 900, f1: 200, q: 0.6, type: 'lowpass', vol: 0.28, d: 1.1, a: 0.05, ref: 120, wet: 1 }),
          420
        );
      return;
    }
    // the crack (a very short bright burst) on the boom
    burst(x, y, { f: 5000, q: 0.4, type: 'highpass', vol: 0.9, d: 0.018, a: 0.0005, ref: 60, wet: 0.3 });
    burst(x, y, {
      f: 4000,
      f1: 300,
      q: 0.5,
      type: 'lowpass',
      vol: 1.3,
      d: 0.55,
      a: 0.001,
      thump: 55,
      ref: 60,
      wet: 0.9,
    });
    const r = raw();
    if (r)
      setTimeout(
        () => burst(x, y, { f: 900, f1: 200, q: 0.6, type: 'lowpass', vol: 0.35, d: 1.1, a: 0.05, ref: 120, wet: 1 }),
        380
      ); // the valley answers
  }
  const click = (x, y) => burst(x, y, { f: 3500, q: 5, vol: 0.35, d: 0.03, ref: 5, wet: 0 });
  // the zombies' voices from recordings when there are some (zombie_groan, zombie_attack, zombie_die), else synthesised
  const voiced = (k, f) => (x, y, a) => {
    if (sample(k, x, y, { ref: 9, wet: 0.3, vol: k === 'zombie_groan' ? Math.min(1, 0.7 * (a || 1)) : 1 })) return;
    f(x, y, a);
  };
  // the heartbeat at low health (k 0…1: how bad), as a short double thump
  function heartbeat(k) {
    const r = raw();
    if (!r) return;
    for (const [dt, v] of [
      [0, 1],
      [0.16, 0.7],
    ]) {
      const t = r.ctx.currentTime + 0.01 + dt,
        o = r.ctx.createOscillator(),
        g = r.ctx.createGain();
      o.frequency.setValueAtTime(58, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5 * k * v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g);
      g.connect(r.sfx);
      o.start(t);
      o.stop(t + 0.2);
    }
  }
  // a low swell when something is close behind you (the night has begun, a zombie appears)
  function sting(k = 1) {
    const r = raw();
    if (!r) return;
    const t = r.ctx.currentTime + 0.01,
      o1 = r.ctx.createOscillator(),
      o2 = r.ctx.createOscillator(),
      g = r.ctx.createGain(),
      lp = r.ctx.createBiquadFilter();
    o1.type = o2.type = 'sawtooth';
    o1.frequency.value = 55;
    o2.frequency.value = 58.3; // a beating semitone
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(200, t);
    lp.frequency.exponentialRampToValueAtTime(1600, t + 1.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22 * k, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(r.sfx);
    const w = r.ctx.createGain();
    w.gain.value = 0.4;
    g.connect(w);
    w.connect(r.wet);
    for (const o of [o1, o2]) {
      o.start(t);
      o.stop(t + 3.6);
    }
  }
  Object.assign(S, {
    load,
    siren,
    stopSiren,
    sirenOn,
    sirenAt,
    update,
    groan: voiced('zombie_groan', groan), // the voices: recordings first
    snarl,
    attack: voiced('zombie_attack', attack),
    die: voiced('zombie_die', die),
    hit,
    splat,
    crack,
    swing,
    bang,
    splinter,
    hammer,
    shot,
    click,
    heartbeat,
    sting,
    whooshLead,
    gunOpen,
    shellIn,
    gunClose,
    shellDrop,
    dry,
    fall,
    sample,
    hasSample,
    kampf: KAMPF,
    heart: 0,
  });

  return S;
})();
window.ZTON = ZTON;
