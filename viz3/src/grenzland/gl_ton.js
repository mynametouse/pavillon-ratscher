// ===================== feat/grenzland: the sounds of the mode, all synthesised (GLTON) =====================
// No recordings (nothing to license, nothing to load): the two-tone horn of a patrol car (a fourth, as the German Martinshorn), louder the
// nearer it is; the two-stroke rattle of the clique's mopeds; a banger; the skittle ball, the pins; a splash and the reel; the radio's
// jingle and a little dance tune for the station; the camera's click; the crackle that opens the memory of 1989. Everything goes to the
// game's own buses (audio/audio.js audio.raw(): effects, music), so the volume sliders and „Ton aus“ hold.
import { audio } from '../audio/audio.js';
import { KERN } from '../core/kern.js';
export const GLTON = (() => {
  const S = { siren: null, moped: null, radio: null };
  const raw = () => {
    try {
      return audio.raw ? audio.raw() : null;
    } catch (e) {
      return null;
    }
  };
  const fin = v => (Number.isFinite(v) ? v : 0);
  // a tone: frequency (may glide), wave, peak, attack, decay; to a bus
  function tone(R, t, o, bus) {
    const c = R.ctx,
      os = c.createOscillator(),
      g = c.createGain();
    os.type = o.type || 'sine';
    os.frequency.setValueAtTime(fin(o.f0), t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(Math.max(1, fin(o.f1)), t + (o.d || 0.2));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, fin(o.peak) || 0.2), t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.a || 0.005) + (o.d || 0.2));
    os.connect(g);
    g.connect(bus || R.sfx);
    os.start(t);
    os.stop(t + (o.a || 0.005) + (o.d || 0.2) + 0.05);
  }
  let NB = null;
  function noiseBuf(R) {
    if (NB && NB.sampleRate === R.ctx.sampleRate) return NB;
    NB = R.ctx.createBuffer(1, R.ctx.sampleRate, R.ctx.sampleRate);
    const d = NB.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < d.length; i++) {
      s = (s * 1664525 + 1013904223) | 0;
      d[i] = (s >>> 8) / 8388608 - 1;
    }
    return NB;
  }
  function noise(R, t, o, bus) {
    const c = R.ctx,
      src = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    src.buffer = noiseBuf(R);
    src.loop = true;
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(fin(o.f) || 800, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, fin(o.f1)), t + (o.d || 0.2));
    f.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, fin(o.peak) || 0.2), t + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.a || 0.004) + (o.d || 0.2));
    src.connect(f);
    f.connect(g);
    g.connect(bus || R.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + (o.a || 0.004) + (o.d || 0.2) + 0.05);
  }
  // how loud something d metres away is (1 close by, fading to nothing at far)
  const vol = (d, far = 260) => Math.max(0, Math.min(1, 1 - d / far)) ** 2;
  // ---- the patrol car's horn: two tones a fourth apart, alternating; one voice for the nearest car ----
  function siren(on, dist = 0, alt = false) {
    const R = raw();
    if (!R) return;
    if (!on) {
      if (S.siren) {
        const s = S.siren;
        S.siren = null;
        try {
          s.g.gain.setTargetAtTime(0, R.ctx.currentTime, 0.2);
          setTimeout(() => {
            try {
              s.os.stop();
              s.lfo.stop();
            } catch (e) {}
          }, 900);
        } catch (e) {}
      }
      return;
    }
    if (!S.siren) {
      const c = R.ctx,
        os = c.createOscillator(),
        lfo = c.createOscillator(),
        lg = c.createGain(),
        f = c.createBiquadFilter(),
        g = c.createGain();
      os.type = 'square';
      // 435 Hz and 580 Hz: a square LFO moves the pitch between them
      os.frequency.value = alt ? 480 : 507.5;
      lfo.type = 'square';
      lfo.frequency.value = alt ? 0.55 : 0.68;
      lg.gain.value = alt ? 60 : 72.5;
      lfo.connect(lg);
      lg.connect(os.frequency);
      f.type = 'lowpass';
      f.frequency.value = 1900;
      g.gain.value = 0;
      os.connect(f);
      f.connect(g);
      g.connect(R.sfx);
      os.start();
      lfo.start();
      S.siren = { os, lfo, g };
    }
    S.siren.g.gain.setTargetAtTime(0.16 * vol(dist, 420), R.ctx.currentTime, 0.15);
  }
  // ---- a two-stroke moped somewhere near: rattle by speed ----
  function moped(on, dist = 0, v = 0) {
    const R = raw();
    if (!R) return;
    if (!on) {
      if (S.moped) {
        const s = S.moped;
        S.moped = null;
        try {
          s.g.gain.setTargetAtTime(0, R.ctx.currentTime, 0.15);
          setTimeout(() => {
            try {
              s.os.stop();
            } catch (e) {}
          }, 700);
        } catch (e) {}
      }
      return;
    }
    if (!S.moped) {
      const c = R.ctx,
        os = c.createOscillator(),
        f = c.createBiquadFilter(),
        g = c.createGain();
      os.type = 'sawtooth';
      f.type = 'bandpass';
      f.Q.value = 2.5;
      g.gain.value = 0;
      os.connect(f);
      f.connect(g);
      g.connect(R.sfx);
      os.start();
      S.moped = { os, f, g };
    }
    const hz = 34 + Math.min(18, Math.max(0, v)) * 6.5;
    S.moped.os.frequency.setTargetAtTime(hz, R.ctx.currentTime, 0.08);
    S.moped.f.frequency.setTargetAtTime(hz * 6, R.ctx.currentTime, 0.08);
    S.moped.g.gain.setTargetAtTime(0.11 * vol(dist, 90), R.ctx.currentTime, 0.1);
  }
  const FX = {
    // a banger: a sharp crack, a thump, an echo over the valley
    boeller(R, t, k) {
      noise(R, t, { type: 'highpass', f: 1800, peak: 0.9 * k, d: 0.07 });
      tone(R, t, { f0: 150, f1: 38, peak: 0.9 * k, d: 0.28 });
      noise(R, t + 0.02, { type: 'lowpass', f: 700, f1: 120, peak: 0.6 * k, d: 0.5 });
      noise(R, t + 0.42, { type: 'lowpass', f: 420, f1: 110, peak: 0.16 * k, d: 0.9 });
    },
    lunte(R, t, k) {
      noise(R, t, { type: 'highpass', f: 5200, peak: 0.07 * k, a: 0.05, d: 1.6 });
    },
    // skittles: the ball let go, rolling, the pins
    wurf(R, t, k) {
      tone(R, t, { f0: 95, f1: 60, peak: 0.4 * k, d: 0.12 });
      noise(R, t, { type: 'lowpass', f: 300, peak: 0.3 * k, d: 0.1 });
    },
    rollen(R, t, k, sec = 2.2) {
      noise(R, t, { type: 'lowpass', f: 190, f1: 150, peak: 0.34 * k, a: 0.15, d: sec });
    },
    kegel(R, t, k, n = 5) {
      for (let i = 0; i < Math.max(1, n) * 2; i++) {
        const tt = t + Math.random() * 0.45;
        tone(R, tt, { f0: 620 + Math.random() * 500, f1: 380, type: 'triangle', peak: 0.2 * k, d: 0.08 });
        noise(R, tt, { f: 1700 + Math.random() * 900, q: 2, peak: 0.16 * k, d: 0.05 });
      }
    },
    rinne(R, t, k) {
      noise(R, t, { type: 'lowpass', f: 240, peak: 0.3 * k, d: 0.5 });
      tone(R, t + 0.45, { f0: 110, f1: 70, peak: 0.3 * k, d: 0.2 });
    },
    // fishing
    platsch(R, t, k) {
      noise(R, t, { type: 'bandpass', f: 900, f1: 300, q: 0.7, peak: 0.4 * k, d: 0.35 });
      for (let i = 0; i < 4; i++)
        tone(R, t + 0.08 + i * 0.07, { f0: 420 + Math.random() * 300, f1: 260, peak: 0.07 * k, d: 0.07 });
    },
    biss(R, t, k) {
      for (let i = 0; i < 3; i++)
        tone(R, t + i * 0.12, { f0: 1500, f1: 1300, type: 'triangle', peak: 0.14 * k, d: 0.05 });
    },
    rolle(R, t, k) {
      for (let i = 0; i < 9; i++) noise(R, t + i * 0.035, { f: 3200, q: 4, peak: 0.07 * k, d: 0.015 });
    },
    // the phone
    sms(R, t, k) {
      tone(R, t, { f0: 1175, peak: 0.13 * k, d: 0.11 });
      tone(R, t + 0.13, { f0: 1568, peak: 0.13 * k, d: 0.16 });
    },
    foto(R, t, k) {
      noise(R, t, { f: 3800, q: 1.5, peak: 0.22 * k, d: 0.03 });
      noise(R, t + 0.07, { f: 2400, q: 1.5, peak: 0.18 * k, d: 0.04 });
    },
    tick(R, t, k) {
      tone(R, t, { f0: 1900, peak: 0.06 * k, d: 0.03 });
    },
    geld(R, t, k) {
      tone(R, t, { f0: 1320, type: 'triangle', peak: 0.12 * k, d: 0.08 });
      tone(R, t + 0.07, { f0: 1760, type: 'triangle', peak: 0.12 * k, d: 0.14 });
    },
    // the wanted level
    stern(R, t, k) {
      tone(R, t, { f0: 392, f1: 370, type: 'sawtooth', peak: 0.1 * k, d: 0.3 });
      tone(R, t + 0.02, { f0: 196, type: 'triangle', peak: 0.16 * k, d: 0.4 });
    },
    frei(R, t, k) {
      for (const [i, f] of [392, 494, 587].entries())
        tone(R, t + i * 0.11, { f0: f, type: 'triangle', peak: 0.1 * k, d: 0.22 });
    },
    schlag(R, t, k) {
      noise(R, t, { type: 'lowpass', f: 520, peak: 0.5 * k, d: 0.07 });
      tone(R, t, { f0: 140, f1: 70, peak: 0.4 * k, d: 0.1 });
    },
    // a hand-held radio of the police
    funk(R, t, k) {
      noise(R, t, { f: 2400, q: 0.8, peak: 0.07 * k, a: 0.01, d: 0.22 });
      tone(R, t + 0.24, { f0: 1050, peak: 0.05 * k, d: 0.06 });
    },
    // the memory opens: a record's crackle and a falling tone
    damals(R, t, k) {
      for (let i = 0; i < 26; i++)
        noise(R, t + Math.random() * 1.6, { type: 'highpass', f: 4200, peak: 0.1 * k * Math.random(), d: 0.012 });
      tone(R, t, { f0: 660, f1: 220, peak: 0.1 * k, a: 0.3, d: 1.4 });
    },
    // the door of the office container giving way
    bruch(R, t, k) {
      noise(R, t, { type: 'lowpass', f: 900, f1: 200, peak: 0.5 * k, d: 0.25 });
      tone(R, t + 0.05, { f0: 300, f1: 90, type: 'square', peak: 0.12 * k, d: 0.2 });
    },
    // the flare (agent licht, grenzland:flare): a whoosh up, then ~40 s of a burning hiss and crackle, dying away
    flare(R, t, k) {
      noise(R, t, { type: 'bandpass', f: 900, f1: 2600, peak: 0.5 * k, a: 0.04, d: 1.4 });
      noise(R, t + 3.2, { type: 'highpass', f: 3200, peak: 0.07 * k, a: 1.2, d: 40 });
      for (let i = 0; i < 34; i++)
        noise(R, t + 3.4 + i * 1.15 + Math.random() * 0.8, {
          type: 'highpass',
          f: 2400,
          peak: 0.05 * k,
          a: 0.004,
          d: 0.05,
        });
    },
    kanister(R, t, k) {
      for (let i = 0; i < 16; i++) {
        const f = 190 + Math.random() * 170;
        tone(R, t + i * 0.16 + Math.random() * 0.05, { f0: f * 1.3, f1: f, peak: 0.13 * k, a: 0.004, d: 0.06 });
      }
    },
  };
  // play an effect by name; d: distance to the listener (m), far: where it is no longer heard
  function fx(name, d = 0, far = 200, ...a) {
    const R = raw(),
      f = FX[name];
    if (!R || !f) return false;
    const k = vol(d, far);
    if (k <= 0.002) return false;
    try {
      f(R, R.ctx.currentTime + 0.01, k, ...a);
    } catch (e) {
      return false;
    }
    return true;
  }
  // ---- the radio: a jingle, and between the words a little dance tune (a polka-like vamp in two keys), all on the music bus ----
  const NOTE = n => 220 * Math.pow(2, n / 12);
  function jingle() {
    const R = raw();
    if (!R) return 0;
    const t = R.ctx.currentTime + 0.02;
    [0, 4, 7, 12, 7, 12].forEach((n, i) =>
      tone(R, t + i * 0.12, { f0: NOTE(n + 3), type: 'triangle', peak: 0.11, d: 0.2 }, R.mus)
    );
    tone(R, t + 0.74, { f0: NOTE(3) / 2, type: 'sawtooth', peak: 0.07, d: 0.5 }, R.mus);
    return 1.3;
  }
  // bars of music for `sec` seconds; kind: 'polka' | 'schlager' | 'marsch89'. Returns its length.
  function musik(kind = 'polka', sec = 9) {
    const R = raw();
    if (!R) return 0;
    const t0 = R.ctx.currentTime + 0.05,
      bpm = kind === 'schlager' ? 104 : kind === 'marsch89' ? 112 : 126,
      b = 60 / bpm,
      prog =
        kind === 'schlager'
          ? [0, 0, 5, 5, 7, 7, 0, 0]
          : kind === 'marsch89'
            ? [0, 5, 0, 7, 0, 5, 7, 0]
            : [0, 0, 7, 7, 0, 0, 7, 0],
      mel = kind === 'schlager' ? [4, 7, 9, 7, 5, 4, 2, 0] : [0, 4, 7, 4, 2, 5, 7, 11, 12, 7, 4, 7, 5, 2, -1, 0];
    const bars = Math.max(1, Math.round(sec / (b * 2)));
    for (let i = 0; i < bars; i++) {
      const root = prog[i % prog.length],
        t = t0 + i * b * 2;
      // oom-pah: bass on one, the chord on two
      tone(R, t, { f0: NOTE(root - 12 + 3) / 2, type: 'triangle', peak: 0.13, d: b * 0.7 }, R.mus);
      for (const n of [0, 4, 7])
        tone(R, t + b, { f0: NOTE(root + n + 3), type: 'square', peak: 0.022, d: b * 0.35 }, R.mus);
      // the tune: two notes per beat, like an accordion's reed
      for (let j = 0; j < 4; j++) {
        const n = mel[(i * 4 + j) % mel.length] + (root === 7 ? 7 : root === 5 ? 5 : 0);
        tone(R, t + (j * b) / 2, { f0: NOTE(n + 15), type: 'sawtooth', peak: 0.03, a: 0.02, d: b * 0.42 }, R.mus);
      }
    }
    return bars * b * 2;
  }
  const stop = () => {
    siren(false);
    moped(false);
  };
  // other modules bring their own sounds: add('name', (R, t, k, ...a) => …) with R = audio.raw() (ctx, sfx, mus …), then fx('name', dist, far)
  const add = (name, fn) => {
    FX[name] = fn;
  };
  // the flare of the Klinge night (agent licht draws it on the same event): heard far over the fields
  KERN.on('grenzland:flare', d => {
    try {
      const w = KERN.where();
      fx('flare', d && w ? Math.hypot(d.x - w[0], d.y - w[1]) : 0, 700);
    } catch (e) {}
  });
  return { fx, add, tone, noise, raw, siren, moped, jingle, musik, stop, vol, ready: () => !!raw() };
})();
window.GLTON = GLTON;
