// ===================== feat/grenzland-kino: the score – music by situation under the missions, stings (GLSCORE) =====================
// Falko (13.11.2026 1:25): own compositions or public domain only – so everything here is composed in code and synthesised live in
// WebAudio, in D minor, on the game's music bus (the „Musik“ volume and „Ton aus“ hold). Layers, crossfaded over about two seconds:
//   spannung  a mission's objective, sneaking: a low pulse in eighths, a dark pad (i – VI – iv – V), a clock-like ping
//   flucht    wanted (one star and more) or a race: bass ostinato and drums – kick and hats, a snare from two stars, stabs from three,
//             sixteenths and a riser from four
//   1989      the memory: a dark drone that breathes, sparse piano notes, a slow swell of strings – no drums
//   szene     under a talk's cutscene (GLKAMERA): the pad alone, soft
// Stings: 'start' (a mission begins – with the title card), 'bestanden', 'gescheitert' (under the failure's fade).
// Silent in free play and whenever the car radio plays (GTA has no score over the radio); ducked by 8 dB while a voice speaks (our own
// talks, STIMME, and GLSCORE.duck from agent stimmen). Nothing is built before the first wish; GLSCORE.stop() ends everything.
//   GLSCORE.lage(name | '') the mission's wish · mission(id | '') · szene(on) · stich(name) · duck(on) · tick(dt) · stop() · stand() (tests)
import { audio } from '../audio/audio.js';
import { STIMME } from '../audio/stimme.js';
import { GL } from './gl_state.js';
import { GLLOGIK } from './gl_logik.js';
import { GLRADIO } from './gl_radio.js';
export const GLSCORE = (() => {
  const S = {
    lage: '', // the mission's wish (a step's lage)
    mission: '', // the mission that runs ('' free play)
    szene: false, // a cutscene runs
    duckApi: false,
    duckTalk: false,
    ziel: '', // the layer that should sound
    stufe: 1, // 1 … 5: how much the chase layer plays
    A: null, // the audio chain once built
    L: {}, // the layers: { g, on, next, step, nodes }
    stiche: 0,
    letzter: '',
    probe: false, // a STIMME.whenIdle probe is waiting
    spricht: false,
    lvl: -1, // the master's level set last
    lvlA: null,
  };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const raw = () => {
    try {
      return audio.raw ? audio.raw() : null;
    } catch (e) {
      return null;
    }
  };
  // ---------------- the chain: layers → master (duck) → the game's music bus ----------------
  function kette() {
    const R = raw();
    if (!R || !R.ctx) return null;
    if (S.A && S.A.ctx === R.ctx) return S.A;
    const c = R.ctx,
      A = { ctx: c };
    A.master = c.createGain();
    A.master.gain.value = 0.0001;
    A.comp = c.createDynamicsCompressor();
    A.comp.threshold.value = -18;
    A.comp.ratio.value = 3;
    A.comp.attack.value = 0.01;
    A.comp.release.value = 0.25;
    A.master.connect(A.comp);
    A.comp.connect(R.mus || R.sfx);
    A.stich = c.createGain();
    A.stich.gain.value = 0.9;
    A.stich.connect(A.master);
    // a second of noise for the drums and the riser
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate),
      d = nb.getChannelData(0);
    let s = 90127;
    for (let i = 0; i < d.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      d[i] = (s >>> 8) / 8388608 - 1;
    }
    A.noise = nb;
    S.A = A;
    S.L = {};
    return A;
  }
  // ---------------- instruments (one-shot nodes, freed by the browser when they end) ----------------
  function ton(A, out, t, f, o) {
    const c = A.ctx,
      g = c.createGain(),
      a = o.a || 0.005,
      d = o.d || 0.3,
      pk = Math.max(0.0002, o.g || 0.1);
    let node = g;
    if (o.lp) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.setValueAtTime(o.lp, t);
      if (o.lp1) fl.frequency.exponentialRampToValueAtTime(Math.max(40, o.lp1), t + (o.lpT || d));
      fl.Q.value = o.q || 0.7;
      fl.connect(g);
      node = fl;
    }
    g.gain.setValueAtTime(0.0001, t);
    if (o.hold) {
      g.gain.exponentialRampToValueAtTime(pk, t + a);
      g.gain.setValueAtTime(pk, t + a + o.hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.hold + d);
    } else {
      g.gain.exponentialRampToValueAtTime(pk, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
    g.connect(out);
    const end = t + a + (o.hold || 0) + d + 0.05;
    for (const det of o.det || [0]) {
      const os = c.createOscillator();
      os.type = o.w || 'sine';
      os.frequency.setValueAtTime(f, t);
      if (o.f1) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.fT || d));
      if (det) os.detune.value = det;
      os.connect(node);
      os.start(t);
      os.stop(end);
    }
  }
  function rauschen(A, out, t, o) {
    const c = A.ctx,
      src = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain(),
      d = o.d || 0.05;
    src.buffer = A.noise;
    f.type = o.typ || 'highpass';
    f.frequency.setValueAtTime(o.f || 7000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.fT || d));
    f.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g || 0.05), t + (o.a || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.a || 0.002) + d);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t, ((t * 7.31) % 0.8) + 0.01);
    src.stop(t + (o.a || 0.002) + d + 0.05);
  }
  const kick = (A, out, t, g = 0.5) => ton(A, out, t, 150, { f1: 44, fT: 0.12, d: 0.3, g });
  const snare = (A, out, t, g = 0.16) => {
    rauschen(A, out, t, { typ: 'bandpass', f: 1900, q: 0.8, d: 0.16, g });
    ton(A, out, t, 185, { f1: 140, d: 0.09, g: g * 0.7, w: 'triangle' });
  };
  const hat = (A, out, t, g = 0.035, d = 0.035) => rauschen(A, out, t, { f: 7200, d, g });
  // a piano-like note: a few partials that die away
  function klavier(A, out, t, m, g = 0.07) {
    const f = mtof(m);
    ton(A, out, t, f, { d: 2.6, g, a: 0.004 });
    ton(A, out, t, f * 2, { d: 1.4, g: g * 0.35, a: 0.004 });
    ton(A, out, t, f * 3, { d: 0.7, g: g * 0.12, a: 0.004 });
  }
  // a pad chord: detuned saws through a dark filter, slow in and out
  function flaeche(A, out, t, notes, dur, o = {}) {
    for (const m of notes)
      ton(A, out, t, mtof(m), {
        w: 'sawtooth',
        det: [-7, 6],
        a: o.a || 1.1,
        hold: Math.max(0.1, dur - (o.a || 1.1)),
        d: o.r || 1.6,
        g: o.g || 0.022,
        lp: o.lp || 720,
        q: 0.5,
      });
  }
  // ---------------- the layers: tempo (16ths per second) and what happens on each 16th ----------------
  // D minor: D2 38, A2 45, Bb1 34, Bb2 46, C2 36, C3 48, D3 50, E3 52, F3 53, G2 43, G3 55, A3 57, Bb3 58, C4 60, D4 62, E4 64, F4 65, A4 69
  const SP = [
    // spannung: i – VI – iv – V, two bars each
    { r: 38, ch: [50, 53, 57] },
    { r: 34, ch: [46, 50, 53] },
    { r: 43, ch: [46, 50, 55] },
    { r: 45, ch: [49, 52, 57] },
  ];
  const SZ = [
    // szene: the same, open and soft
    { ch: [50, 57, 64, 65] },
    { ch: [46, 53, 57, 62] },
    { ch: [43, 50, 58, 62] },
    { ch: [45, 52, 57, 62] },
  ];
  const FL = [38, 38, 34, 36]; // flucht: Dm Dm Bb C, a bar each
  const PIANO = [62, 65, 69, 72, 74, 76, 69, 65];
  const LAYER = {
    spannung: {
      bpm: 84,
      g: 1,
      step(A, out, t, n) {
        const bar = Math.floor(n / 16),
          s = n % 16,
          C = SP[Math.floor(bar / 2) % 4];
        if (s % 2 === 0) {
          const acc = s % 4 === 0 ? 1 : 0.55;
          ton(A, out, t, mtof(C.r), { w: 'triangle', d: 0.16, g: 0.16 * acc, lp: 420 });
          ton(A, out, t, mtof(C.r + 12), { w: 'sine', d: 0.09, g: 0.05 * acc });
        }
        if (s === 0 && bar % 2 === 0) flaeche(A, out, t, C.ch, 2 * 16 * (60 / 84 / 4), { g: 0.032, lp: 650 });
        if ((s === 6 || s === 14) && bar % 2 === 1) ton(A, out, t, mtof(81), { d: 0.07, g: 0.026 });
      },
    },
    flucht: {
      bpm: 128,
      g: 0.8,
      step(A, out, t, n) {
        const bar = Math.floor(n / 16),
          s = n % 16,
          r = FL[bar % 4],
          k = S.stufe;
        if (s % 2 === 0) {
          const pat = [0, 0, 12, 0, 0, 12, 0, 10][s / 2];
          ton(A, out, t, mtof(r + pat), { w: 'sawtooth', d: 0.13, g: 0.085, lp: 950, lp1: 260, lpT: 0.12, q: 2 });
        }
        if (s === 0 || s === 8 || (k >= 3 && (s === 6 || s === 10))) kick(A, out, t, s % 8 === 0 ? 0.5 : 0.32);
        if (k >= 2 && (s === 4 || s === 12)) snare(A, out, t);
        if (k >= 4 ? true : k >= 3 ? s % 2 === 0 : s % 4 === 2) hat(A, out, t, s % 4 === 2 ? 0.04 : 0.022);
        if (k >= 3 && bar % 2 === 1 && (s === 3 || s === 11))
          for (const m of [r + 12, r + 15, r + 19])
            ton(A, out, t, mtof(m), { w: 'sawtooth', d: 0.12, g: 0.03, lp: 1900, lp1: 700, lpT: 0.1 });
        if (k >= 4 && s === 0 && bar % 4 === 0)
          rauschen(A, out, t, { f: 600, f1: 9000, fT: 4 * 16 * (60 / 128 / 4), d: 4 * 16 * (60 / 128 / 4), g: 0.02 });
      },
    },
    1989: {
      bpm: 60,
      g: 0.9,
      on(A, out) {
        // the drone: two Ds that beat slowly against each other and a fifth, under a filter that breathes
        const c = A.ctx,
          f = c.createBiquadFilter(),
          lfo = c.createOscillator(),
          lg = c.createGain(),
          g = c.createGain(),
          nodes = [f, lfo, lg, g];
        f.type = 'lowpass';
        f.frequency.value = 420;
        f.Q.value = 1.2;
        lfo.frequency.value = 0.07;
        lg.gain.value = 180;
        lfo.connect(lg);
        lg.connect(f.frequency);
        g.gain.value = 0.04;
        f.connect(g);
        g.connect(out);
        for (const [m, w, det] of [
          [38, 'triangle', 0],
          [38, 'sawtooth', 9],
          [45, 'sine', -4],
          [26, 'sine', 0],
        ]) {
          const o = c.createOscillator();
          o.type = w;
          o.frequency.value = mtof(m);
          o.detune.value = det;
          o.connect(f);
          o.start();
          nodes.push(o);
        }
        lfo.start();
        return nodes;
      },
      step(A, out, t, n) {
        const bar = Math.floor(n / 16),
          s = n % 16,
          h = (Math.imul(n + 7, 2654435761) >>> 0) / 4294967296;
        // sparse piano: now and then a note, sometimes two
        if ((s === 0 || s === 6 || s === 10) && h < 0.42) {
          const m = PIANO[(bar * 3 + s) % PIANO.length];
          klavier(A, out, t, m, 0.055);
          if (h < 0.12) klavier(A, out, t + 0.5, m - 5, 0.04);
        }
        // a slow swell of strings every eight bars
        if (s === 0 && bar % 8 === 4)
          flaeche(A, out, t, bar % 16 === 4 ? [53, 57, 62] : [50, 55, 58], 8, { a: 3, r: 3, g: 0.016, lp: 1100 });
      },
    },
    szene: {
      bpm: 70,
      g: 0.7,
      step(A, out, t, n) {
        const bar = Math.floor(n / 16),
          s = n % 16;
        if (s === 0 && bar % 2 === 0)
          flaeche(A, out, t, SZ[Math.floor(bar / 2) % 4].ch, 2 * 16 * (60 / 70 / 4), {
            g: 0.016,
            lp: 560,
            a: 1.6,
            r: 2,
          });
      },
    },
  };
  // ---------------- what should sound ----------------
  const sterne = () => {
    try {
      return GLLOGIK.stars(GL.W) | 0;
    } catch (e) {
      return 0;
    }
  };
  const radioAn = () => {
    try {
      return !!(GLRADIO.cur && GLRADIO.cur());
    } catch (e) {
      return false;
    }
  };
  function wunsch() {
    if (!GL.on || radioAn() || !S.mission) return '';
    const n = sterne();
    if (n > 0) {
      S.stufe = Math.min(5, n);
      return 'flucht';
    }
    if (GL.era === '1989') return '1989';
    if (S.lage === 'flucht') {
      S.stufe = 2;
      return 'flucht';
    }
    if (S.lage) return S.lage;
    return S.szene ? 'szene' : '';
  }
  // is somebody speaking (STIMME counts its voices; whenIdle answers at once when nobody does)
  function spricht() {
    if (!STIMME.whenIdle) return false;
    if (S.probe) return true;
    let idle = false,
      sync = true;
    STIMME.whenIdle(() => {
      idle = true;
      if (!sync) S.probe = false;
    });
    sync = false;
    if (!idle) S.probe = true;
    return !idle;
  }
  // ---------------- per frame: crossfades and the 16ths a quarter of a second ahead ----------------
  function tick(dt) {
    S.ziel = wunsch();
    const want = !!S.ziel || Object.values(S.L).some(l => l.on);
    if (!want) return;
    const A = kette();
    if (!A) return;
    const c = A.ctx,
      now = c.currentTime,
      duck = S.duckApi || S.duckTalk || spricht();
    // (the master's level only when it changes: an automation event every frame would pile up)
    const lvl = GL.on ? (duck ? 0.4 : 1) : 0.0001;
    if (lvl !== S.lvl || A !== S.lvlA) {
      S.lvl = lvl;
      S.lvlA = A;
      A.master.gain.cancelScheduledValues(now);
      A.master.gain.setTargetAtTime(lvl, now, 0.12);
    }
    S.spricht = duck;
    for (const name of Object.keys(LAYER)) {
      const D = LAYER[name],
        on = S.ziel === name;
      let l = S.L[name];
      if (on && !l) {
        l = S.L[name] = { g: c.createGain(), on: true, next: now + 0.08, n: 0, nodes: null, off: 0 };
        l.g.gain.value = 0.0001;
        l.g.connect(A.master);
        if (D.on)
          try {
            l.nodes = D.on(A, l.g);
          } catch (e) {}
      }
      if (!l) continue;
      if (on !== l.want) {
        l.want = on;
        l.g.gain.cancelScheduledValues(now);
        l.g.gain.setTargetAtTime(on ? D.g : 0.0001, now, on ? 0.6 : 0.55);
        l.off = on ? 0 : now + 2.8;
      }
      // faded out: gone
      if (!on && l.off && now > l.off) {
        try {
          for (const q of l.nodes || []) {
            if (q.stop) q.stop();
            q.disconnect();
          }
          l.g.disconnect();
        } catch (e) {}
        delete S.L[name];
        continue;
      }
      l.on = on || now < l.off;
      if (c.state !== 'running') {
        l.next = now + 0.05;
        continue;
      }
      const st = 60 / D.bpm / 4;
      if (l.next < now - 0.5) l.next = now + 0.02;
      while (l.next < now + 0.25) {
        try {
          D.step(A, l.g, l.next, l.n);
        } catch (e) {}
        l.n++;
        l.next += st;
      }
    }
  }
  // ---------------- stings ----------------
  const STICH = {
    start(A, out, t) {
      ton(A, out, t, 92, { f1: 52, fT: 0.5, d: 1.1, g: 0.45 });
      rauschen(A, out, t, { typ: 'lowpass', f: 900, d: 0.6, g: 0.06 });
      for (const m of [50, 57, 62, 65, 69])
        ton(A, out, t + 0.02, mtof(m), {
          w: 'sawtooth',
          det: [-5, 5],
          a: 0.03,
          hold: 0.45,
          d: 1.1,
          g: 0.03,
          lp: 500,
          lp1: 2600,
          lpT: 0.35,
        });
      ton(A, out, t + 0.05, mtof(81), { d: 1.6, g: 0.025, a: 0.2 });
    },
    bestanden(A, out, t) {
      for (const m of [46, 53, 58, 62])
        ton(A, out, t, mtof(m), { w: 'sawtooth', det: [-6, 6], a: 0.02, hold: 0.25, d: 0.25, g: 0.03, lp: 1800 });
      for (const m of [50, 57, 62, 66, 69])
        ton(A, out, t + 0.42, mtof(m), {
          w: 'sawtooth',
          det: [-6, 6],
          a: 0.03,
          hold: 0.6,
          d: 1.6,
          g: 0.032,
          lp: 2400,
          lp1: 900,
          lpT: 2,
        });
      kick(A, out, t + 0.42, 0.4);
      rauschen(A, out, t + 0.42, { f: 5200, d: 1.6, g: 0.035 });
      klavier(A, out, t + 0.42, 74, 0.06);
    },
    gescheitert(A, out, t) {
      [50, 49, 48].forEach((m, i) =>
        ton(A, out, t + i * 0.34, mtof(m), {
          w: 'sawtooth',
          det: [-8, 8],
          a: 0.02,
          hold: 0.2,
          d: 0.3,
          g: 0.04,
          lp: 700,
        })
      );
      ton(A, out, t + 1.02, 72, { f1: 38, fT: 0.6, d: 1.4, g: 0.5 });
      for (const m of [26, 27, 38])
        ton(A, out, t + 1.02, mtof(m), { w: 'triangle', a: 0.05, d: 1.8, g: 0.06, lp: 300 });
    },
  };
  function stich(name) {
    if (!STICH[name]) return false;
    S.stiche++;
    S.letzter = name;
    // (nothing over the car radio; the sting itself counts for the tests)
    if (!GL.on || radioAn()) return true;
    const A = kette();
    if (!A || A.ctx.state !== 'running') return true;
    const t = A.ctx.currentTime + 0.04;
    // (a sting with nothing playing yet: the master comes up for it)
    if (S.lvl !== 1 && S.lvl !== 0.4) {
      S.lvl = S.duckApi || S.duckTalk ? 0.4 : 1;
      S.lvlA = A;
      A.master.gain.cancelScheduledValues(t);
      A.master.gain.setTargetAtTime(S.lvl, t, 0.05);
    }
    try {
      STICH[name](A, A.stich, t);
    } catch (e) {}
    return true;
  }
  // ---------------- off ----------------
  function stop() {
    S.lage = '';
    S.mission = '';
    S.szene = false;
    S.duckApi = S.duckTalk = false;
    S.ziel = '';
    const A = S.A;
    S.lvl = -1;
    if (!A) return;
    S.A = null;
    const L = S.L;
    S.L = {};
    try {
      A.master.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.12);
    } catch (e) {}
    setTimeout(() => {
      try {
        for (const l of Object.values(L)) {
          for (const q of l.nodes || []) {
            if (q.stop) q.stop();
            q.disconnect();
          }
          l.g.disconnect();
        }
        A.stich.disconnect();
        A.master.disconnect();
        A.comp.disconnect();
      } catch (e) {}
    }, 900);
  }
  // ---------------- tests: a layer or a sting rendered offline, its level (nobody here can listen to it) ----------------
  async function probe(name, sec = 4, stufe = 3) {
    const D = LAYER[name],
      X = STICH[name];
    if ((!D && !X) || typeof OfflineAudioContext === 'undefined') return null;
    const SR = 24000,
      c = new OfflineAudioContext(1, Math.round(SR * sec), SR),
      nb = c.createBuffer(1, SR, SR),
      d0 = nb.getChannelData(0);
    let r = 4711;
    for (let i = 0; i < d0.length; i++) {
      r = (Math.imul(r, 1664525) + 1013904223) | 0;
      d0[i] = (r >>> 8) / 8388608 - 1;
    }
    const A = { ctx: c, noise: nb },
      out = c.createGain(),
      s0 = S.stufe;
    out.gain.value = D ? D.g : 0.9;
    out.connect(c.destination);
    S.stufe = stufe;
    try {
      if (D) {
        if (D.on) D.on(A, out);
        const st = 60 / D.bpm / 4;
        for (let t = 0.02, n = 0; t < sec; t += st, n++) D.step(A, out, t, n);
      } else X(A, out, 0.02);
    } finally {
      S.stufe = s0;
    }
    const b = await c.startRendering(),
      d = b.getChannelData(0);
    let sq = 0,
      pk = 0;
    for (let i = 0; i < d.length; i++) {
      sq += d[i] * d[i];
      pk = Math.max(pk, Math.abs(d[i]));
    }
    return { rms: Math.round(Math.sqrt(sq / d.length) * 1e4) / 1e4, peak: Math.round(pk * 1e3) / 1e3 };
  }
  return {
    probe,
    lage: n => void (S.lage = LAYER[n] || n === 'flucht' ? n : ''),
    mission: id => void (S.mission = id || ''),
    szene: on => void (S.szene = !!on),
    duck: on => void (S.duckApi = !!on),
    rede: on => void (S.duckTalk = !!on),
    stich,
    tick,
    stop,
    stand: () => ({
      ziel: S.ziel,
      lage: S.lage,
      mission: S.mission,
      stufe: S.stufe,
      radio: radioAn(),
      duck: S.spricht,
      layers: Object.keys(S.L),
      stiche: S.stiche,
      letzter: S.letzter,
      ctx: S.A ? S.A.ctx.state : '',
    }),
    LAYER,
    S,
  };
})();
window.GLSCORE = GLSCORE;
