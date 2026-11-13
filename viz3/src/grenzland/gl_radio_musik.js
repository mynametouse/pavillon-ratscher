// ===================== feat/grenzland: the radio's music, composed and synthesised per station (GLRMUSIK) =====================
// Falko, 13.11.2026: stations to switch between „ähnlich wie bei GTA“, the music „synthesised by ourselves“ – no licensed hits, no melody
// of an existing song. Pure code, no imports, no WebAudio (unit tests in viz3/test/unit/grenzland_radio.test.mjs render and measure it in
// node; grenzland/gl_radio.js plays the result through the game's music bus). Two halves:
//   1. A composer. Every station has a repertoire (REP: title, invented performers, style); a piece is composed from its title's seed, so
//      a station always plays the same pieces. A style (STIL) is a metre, a tempo range, keys, a form of sections (intro, verse, chorus,
//      trio, ending …) with chord progressions in scale degrees, a „feel“ that writes bass, chords and drums bar by bar, and rhythm cells
//      from which the tunes are made: a theme is a period of phrases – a motif, the motif again over the next chords, a second motif, a
//      cadence (half close, then full close on the tonic) –, its notes snap to the chord on the beats and walk the scale in between. A
//      second voice follows in thirds and sixths. Everything stays in the key (tonart() tells a test which pitch classes are allowed).
//   2. A synthesiser at 24 kHz, mono: voices (sine, band-limited saw and pulse, two-operator FM for brass, reeds and e-piano, an organ,
//      plucked strings after Karplus and Strong, a piano of decaying partials) with envelopes, vibrato and a filter; drums of sine sweeps
//      and filtered noise; a small reverb; a master that sets every piece to the same loudness (RMS 0.1) and bends peaks softly below
//      0.85 – nothing clips. A piece is rendered in slices (job(), step(job, ms)) so that no frame waits for it.
// Interface:
//   GLRMUSIK.song(sender, i) → { titel, von, stil, bpm, bpb, key, mode, dauer, n, ev, nev, ins, sek } (ev: Float32Array, 5 numbers per note)
//   GLRMUSIK.job(song) → J · step(J, ms) → true when done (J.out: Float32Array of song.n samples, valid until the next job) · render(song)
//   GLRMUSIK.kennung(sender) → a station's ident (a song of two bars) · tonart(song, t) → bit mask of the pitch classes in key at t
//   GLRMUSIK.pegel(buf) → { rms, peak, dc } · REP · STIL · SR · frei() (drops the work buffers)
// I cannot hear what this sounds like – levels, spectrum, keys and form are measured in the tests, the rest is the craft of the rules.
export const GLRMUSIK = (() => {
  const SR = 24000,
    TAU = Math.PI * 2,
    MAXS = 100;
  // ---- seeded random numbers (xorshift) and a string's hash (FNV-1a) ----
  const hash = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const rng = seed => {
    let s = seed >>> 0 || 0x9e3779b9;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
  };
  // ---- scales and chords ----
  const SKALA = {
    dur: [0, 2, 4, 5, 7, 9, 11],
    moll: [0, 2, 3, 5, 7, 8, 10],
    dor: [0, 2, 3, 5, 7, 9, 10],
  };
  const mod = (a, n) => ((a % n) + n) % n;
  // a scale degree (0: the tonic; negative or above 6: other octaves) → semitones from the tonic
  const semi = (sk, deg) => {
    const o = Math.floor(deg / 7);
    return sk[deg - o * 7] + 12 * o;
  };
  // a chord as written in a progression: '1' … '7' the degree of its root, '7' behind it a seventh, '!' a major third (the dominant in minor)
  const akk = s => ({ d: +s[0] - 1, m7: s.length > 1 && s.slice(1).includes('7'), dur: s.includes('!') });
  // semitones of a degree while a chord sounds (the raised third of a '!' chord)
  const ton = (sk, deg, ch) => {
    let s = semi(sk, deg);
    if (ch && ch.dur && mod(s - semi(sk, ch.d), 12) === 3) s++;
    return s;
  };
  const istAkk = (deg, ch) => {
    const m = mod(deg - ch.d, 7);
    return m === 0 || m === 2 || m === 4 || (ch.m7 && m === 6);
  };
  const snap = (p, ch, dir) => {
    if (istAkk(p, ch)) return p;
    for (const o of dir >= 0 ? [1, 2, -1, -2] : [-1, -2, 1, 2]) if (istAkk(p + o, ch)) return p + o;
    return p;
  };
  // the lowest note at or above lo with the pitch class pc
  const into = (pc, lo) => lo + mod(pc - lo, 12);

  // ---- instruments. w: wave; g: level; a d s r: envelope (seconds, sustain 0 … 1); lp: [cutoff Hz (kt: × the note's frequency),
  //      envelope Hz, its decay s, Q]; uni / det: voices in unison and their detune in cents; rat: frequency ratios (a power chord);
  //      drive: soft clipping; vib: [Hz, cents, delay s]; fm: [ratio, index, decay s (0: the index follows the envelope – brass)];
  //      trem: [Hz, depth]; hall: reverb send; reg: the middle of where its tunes sit (MIDI) ----
  const INS = {
    tuba: { w: 'fm', fm: [1, 2, 0], g: 0.31, a: 0.03, d: 0.25, s: 0.75, r: 0.08, lp: [900, 600, 0.2, 0.7], hall: 0.08 },
    ebass: { w: 'saw', g: 0.31, a: 0.005, d: 0.2, s: 0.6, r: 0.06, lp: [420, 1400, 0.14, 1.1] },
    sbass: { w: 'pulse', pw: 0.36, g: 0.2, a: 0.004, d: 0.11, s: 0.5, r: 0.05, lp: [450, 2200, 0.09, 2] },
    kbass: { w: 'saw', g: 0.36, a: 0.008, d: 0.45, s: 0.25, r: 0.1, lp: [320, 800, 0.1, 0.9] },
    akk: {
      w: 'pulse',
      pw: 0.3,
      uni: 2,
      det: 11,
      g: 0.17,
      a: 0.025,
      d: 0.2,
      s: 0.85,
      r: 0.07,
      lp: [3600, 0, 0, 0.7],
      vib: [5.6, 5, 0.2],
      hall: 0.14,
      reg: 72,
    },
    trp: {
      w: 'fm',
      fm: [1, 3.6, 0],
      g: 0.25,
      a: 0.035,
      d: 0.2,
      s: 0.82,
      r: 0.07,
      vib: [5.3, 9, 0.28],
      lp: [4500, 0, 0, 0.7],
      hall: 0.2,
      reg: 70,
    },
    dtrp: {
      w: 'fm',
      fm: [1, 3.4, 0],
      g: 0.2,
      a: 0.02,
      d: 0.15,
      s: 0.7,
      r: 0.06,
      vib: [5.6, 10, 0.2],
      lp: [1700, 0, 0, 2.6],
      hall: 0.2,
      reg: 70,
    },
    horn: {
      w: 'fm',
      fm: [1, 1.8, 0],
      g: 0.2,
      a: 0.04,
      d: 0.2,
      s: 0.8,
      r: 0.09,
      lp: [2000, 0, 0, 0.7],
      hall: 0.18,
      reg: 62,
    },
    klar: {
      w: 'fm',
      fm: [2, 1.8, 0],
      g: 0.17,
      a: 0.03,
      d: 0.15,
      s: 0.86,
      r: 0.07,
      vib: [5.1, 6, 0.3],
      lp: [3600, 0, 0, 0.7],
      hall: 0.2,
      reg: 72,
    },
    sax: {
      w: 'fm',
      fm: [1, 2.2, 0],
      g: 0.2,
      a: 0.05,
      d: 0.3,
      s: 0.8,
      r: 0.12,
      lp: [2200, 0, 0, 0.8],
      vib: [4.8, 7, 0.3],
      hall: 0.22,
    },
    git: { w: 'pluck', g: 0.66, d: 2.4, br: 0.75, r: 0.25, hall: 0.12, reg: 66 },
    egit: {
      w: 'saw',
      rat: [1, 1.4983, 2],
      drive: 2.6,
      g: 0.17,
      a: 0.004,
      d: 0.35,
      s: 0.7,
      r: 0.05,
      lp: [3000, 0, 0, 0.9],
      hall: 0.08,
    },
    lead: {
      w: 'pulse',
      pw: 0.42,
      drive: 2.2,
      g: 0.17,
      a: 0.012,
      d: 0.35,
      s: 0.8,
      r: 0.12,
      vib: [5.7, 14, 0.2],
      lp: [8, 3, 0.3, 1.1],
      kt: true,
      hall: 0.3,
      reg: 67,
    },
    orgel: { w: 'organ', g: 0.15, a: 0.008, d: 0.06, s: 1, r: 0.05, trem: [6.3, 0.14], hall: 0.2, reg: 69 },
    epiano: { w: 'fm', fm: [1, 2.2, 0.4], g: 0.23, a: 0.004, d: 1.3, s: 0.05, r: 0.22, hall: 0.2, reg: 70 },
    glocke: { w: 'fm', fm: [3.5, 1.5, 0.5], g: 0.26, a: 0.002, d: 0.8, s: 0, r: 0.35, hall: 0.4, reg: 74 },
    pad: { w: 'saw', uni: 3, det: 15, g: 0.1, a: 0.3, d: 0.6, s: 0.8, r: 0.45, lp: [1300, 1200, 1.4, 0.8], hall: 0.4 },
    streich: {
      w: 'saw',
      uni: 3,
      det: 11,
      g: 0.13,
      a: 0.16,
      d: 0.4,
      s: 0.85,
      r: 0.28,
      lp: [3400, 0, 0, 0.7],
      vib: [5.4, 6, 0.3],
      hall: 0.4,
    },
    geige: {
      w: 'saw',
      g: 0.24,
      a: 0.07,
      d: 0.3,
      s: 0.85,
      r: 0.14,
      lp: [7, 0, 0, 0.9],
      kt: true,
      vib: [5.6, 13, 0.22],
      hall: 0.34,
      reg: 72,
    },
    synlead: {
      w: 'saw',
      uni: 2,
      det: 12,
      g: 0.25,
      a: 0.012,
      d: 0.25,
      s: 0.75,
      r: 0.13,
      lp: [2200, 3000, 0.25, 1.4],
      vib: [5.5, 8, 0.25],
      hall: 0.3,
      reg: 69,
    },
    arp: { w: 'pulse', pw: 0.5, g: 0.16, a: 0.003, d: 0.12, s: 0.25, r: 0.08, lp: [1400, 3500, 0.1, 1.8], hall: 0.25 },
    pfeif: { w: 'sin', g: 0.2, a: 0.03, d: 0.2, s: 0.85, r: 0.08, vib: [5.8, 16, 0.12], hall: 0.3, reg: 76 },
    klavier: { w: 'piano', g: 0.24, r: 0.3, hall: 0.32, reg: 70 },
  };
  // ---- drums (their numbers in the events) ----
  const DR = {
    kick: 0,
    bd: 1,
    snare: 2,
    snm: 3,
    gate: 4,
    brush: 5,
    hh: 6,
    oh: 7,
    ride: 8,
    crash: 9,
    clap: 10,
    tomh: 11,
    toml: 12,
    rim: 13,
    tamb: 14,
  };

  // ---- the feels: what bass, chords and drums play in one bar. C: { ch, nx (the next bar's chord), lvl, bar (in its section), last (of
  //      its phrase), erst (first bar of the section), bpb, ct(i, lo) (chord tone i at or above lo), bs(i) (in the bass), sc(deg, lo) } ----
  const FEEL = {
    // oom-pah in two: polka and march
    oom2(E, D, C, B) {
      const m = B.kit === 'marsch';
      E('bass', 0, 0.8, C.bs(0), 0.95);
      if (C.last && C.nx.d !== C.ch.d && C.lvl >= 0.9) {
        E('bass', 1, 0.45, C.bs(0), 0.8);
        E('bass', 1.5, 0.45, C.walk, 0.8);
      } else E('bass', 1, 0.8, C.bs(2), 0.85);
      for (const b of [0.5, 1.5]) for (let i = 0; i < 3; i++) E('comp', b, 0.3, C.ct(i, 55), 0.62);
      if (C.lvl < 0.55) return;
      D(m ? DR.bd : DR.kick, 0, 0.8);
      D(m ? DR.bd : DR.kick, 1, 0.6);
      D(m ? DR.snm : DR.rim, 0.5, 0.5);
      D(m ? DR.snm : DR.rim, 1.5, 0.55);
      if (!m) for (const b of [0, 0.5, 1, 1.5]) D(DR.hh, b, b % 1 ? 0.5 : 0.3);
      if (m && C.last) for (let k = 0; k < 4; k++) D(DR.snm, 1 + k * 0.25, 0.35 + k * 0.08);
      if (C.erst && C.lvl >= 1) D(DR.crash, 0, m ? 0.5 : 0.35);
    },
    // a waltz: bass on one, chords on two and three
    oom3(E, D, C) {
      E('bass', 0, 1.6, C.bs(C.bar % 2 ? 2 : 0), 0.9);
      for (const b of [1, 2]) for (let i = 0; i < 3; i++) E('comp', b, 0.42, C.ct(i, 55), b === 1 ? 0.6 : 0.52);
      if (C.lvl < 0.55) return;
      D(DR.kick, 0, 0.45);
      D(DR.brush, 1, 0.4);
      D(DR.brush, 2, 0.34);
      if (C.last) D(DR.rim, 2.5, 0.3);
    },
    // Schlager: four on the floor, the bass in octaves, off-beat chords, strings in the chorus
    fox(E, D, C) {
      const full = C.lvl >= 1;
      for (let b = 0; b < 4; b++) {
        E('bass', b, 0.45, C.bs(0), 0.9);
        if (full) E('bass', b + 0.5, 0.4, C.bs(0) + 12, 0.7);
        for (let i = 0; i < 3; i++) E('comp', b + 0.5, 0.32, C.ct(i, 57), 0.5);
      }
      if (C.lvl >= 0.9) for (let i = 0; i < 3; i++) E('pad', 0, 3.9, C.ct(i, 60), 0.55);
      if (C.lvl < 0.55) return;
      for (let b = 0; b < 4; b++) {
        D(DR.kick, b, 0.8);
        D(DR.oh, b + 0.5, 0.3);
        if (b % 2) D(full ? DR.clap : DR.snare, b, 0.6);
        if (full) for (const q of [0, 0.25, 0.5, 0.75]) D(DR.tamb, b + q, q === 0.5 ? 0.3 : 0.16);
      }
      if (C.last) for (let k = 0; k < 4; k++) D(DR.snare, 3 + k * 0.25, 0.4 + k * 0.1);
      if (C.erst && full) D(DR.crash, 0, 0.4);
    },
    // rock: eighths on the root, a muted guitar in the verse, held power chords and the organ in the chorus
    rock(E, D, C) {
      const full = C.lvl >= 1;
      for (let k = 0; k < 8; k++)
        E('bass', k / 2, 0.42, k === 7 && C.nx.d !== C.ch.d ? C.walk : C.bs(0), k % 2 ? 0.72 : 0.95);
      if (full) {
        E('comp', 0, 1.9, C.bs(0) + 12, 0.9);
        E('comp', 2, 1.4, C.bs(0) + 12, 0.8);
        E('comp', 3.5, 0.45, C.bs(0) + 12, 0.85);
        for (let i = 0; i < 3; i++) E('pad', 0, 3.9, C.ct(i, 57), 0.6);
      } else if (C.lvl >= 0.7)
        for (let k = 0; k < 8; k++) E('comp', k / 2, k === 3 || k === 6 ? 0.42 : 0.2, C.bs(0) + 12, k % 2 ? 0.6 : 0.8);
      else for (let i = 0; i < 3; i++) E('pad', 0, 3.9, C.ct(i, 57), 0.55);
      if (C.lvl < 0.65) return;
      D(DR.kick, 0, 0.9);
      D(DR.kick, 2, 0.85);
      if (C.bar % 2) D(DR.kick, 2.5, 0.6);
      D(DR.snare, 1, 0.8);
      if (C.last && full) {
        D(DR.tomh, 3, 0.6);
        D(DR.tomh, 3.25, 0.55);
        D(DR.toml, 3.5, 0.65);
        D(DR.toml, 3.75, 0.7);
      } else D(DR.snare, 3, 0.8);
      for (let k = 0; k < 8; k++) D(full && k % 2 === 0 && k % 4 ? DR.oh : DR.hh, k / 2, k % 2 ? 0.34 : 0.5);
      if (C.erst) D(DR.crash, 0, 0.5);
    },
    // a slow rock ballad: broken chords on the piano, strings, soft drums once it has grown
    ballade(E, D, C) {
      E('bass', 0, 1.9, C.bs(0), 0.85);
      E('bass', 2, 1.4, C.bs(0), 0.7);
      E('bass', 3.5, 0.45, C.nx.d !== C.ch.d ? C.walk : C.bs(2), 0.65);
      const arp = [
        C.bs(0) + 12,
        C.ct(2, 50),
        C.ct(0, 57),
        C.ct(1, 57),
        C.ct(2, 57),
        C.ct(1, 57),
        C.ct(0, 57),
        C.ct(2, 50),
      ];
      for (let k = 0; k < 8; k++) E('comp', k / 2, 1.2, arp[k], k % 4 ? 0.5 : 0.68);
      if (C.lvl >= 0.9) for (let i = 0; i < 3; i++) E('pad', 0, 3.95, C.ct(i, 60), 0.6);
      if (C.lvl < 1) return;
      D(DR.kick, 0, 0.6);
      D(DR.kick, 2.5, 0.45);
      D(DR.rim, 1, 0.5);
      D(DR.rim, 3, 0.5);
      for (let k = 0; k < 8; k++) D(DR.hh, k / 2, 0.25);
    },
    // the eighties: a sequencer bass in sixteenths, a machine's drums, pads, arpeggios
    synth(E, D, C) {
      const full = C.lvl >= 1,
        r = C.bs(0),
        seq = [0, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 7, 12, 0, 12];
      for (let k = 0; k < 16; k++)
        if (C.lvl >= 0.7 || k % 4 === 0) E('bass', k / 4, 0.2, r + seq[k], k % 4 ? 0.7 : 0.95);
      for (let i = 0; i < 3; i++) E('pad', 0, 3.95, C.ct(i, 57), 0.6);
      if (C.lvl >= 0.85) {
        const up = [0, 1, 2, 1];
        for (let k = 0; k < 16; k++)
          E('comp', k / 4, 0.18, C.ct(up[k % 4], 60) + (k % 8 >= 4 ? 12 : 0), k % 2 ? 0.45 : 0.6);
      }
      if (C.lvl < 0.6) return;
      for (let b = 0; b < 4; b++) {
        D(DR.kick, b, 0.85);
        if (b % 2) {
          D(DR.gate, b, 0.75);
          if (full) D(DR.clap, b, 0.4);
        }
        for (const q of [0, 0.25, 0.5, 0.75]) D(q === 0.5 ? DR.oh : DR.hh, b + q, q === 0.5 ? 0.3 : q ? 0.2 : 0.32);
      }
      if (C.last) {
        D(DR.tomh, 3, 0.55);
        D(DR.tomh, 3.5, 0.55);
        D(DR.toml, 3.75, 0.6);
      }
      if (C.erst && full) D(DR.crash, 0, 0.45);
    },
    // light pop for the talk station: a picked guitar, an electric piano, a small kit
    pop(E, D, C) {
      E('bass', 0, 1.4, C.bs(0), 0.9);
      E('bass', 1.5, 0.45, C.bs(0), 0.7);
      E('bass', 2, 1.3, C.bs(2), 0.8);
      E('bass', 3.5, 0.45, C.nx.d !== C.ch.d ? C.walk : C.bs(0), 0.7);
      const pk = [
        C.ct(0, 52),
        C.ct(2, 52),
        C.ct(0, 60),
        C.ct(1, 60),
        C.ct(2, 52),
        C.ct(0, 60),
        C.ct(1, 60),
        C.ct(2, 60),
      ];
      for (let k = 0; k < 8; k++) E('comp', k / 2, 0.9, pk[k], k % 4 ? 0.55 : 0.75);
      if (C.lvl >= 0.8) for (let i = 0; i < 3; i++) for (const b of [0, 2]) E('pad', b, 1.8, C.ct(i, 60), 0.5);
      if (C.lvl < 0.7) return;
      D(DR.kick, 0, 0.75);
      D(DR.kick, 2.5, 0.55);
      D(DR.snare, 1, 0.55);
      D(DR.snare, 3, 0.6);
      for (let k = 0; k < 8; k++) D(DR.hh, k / 2, k % 2 ? 0.26 : 0.36);
      if (C.lvl >= 1) for (const b of [0.5, 1.5, 2.5, 3.5]) D(DR.tamb, b, 0.22);
      if (C.last) D(DR.snare, 3.5, 0.45);
    },
    // a dance orchestra: walking bass, the ride cymbal, chords on two and four, saxophones behind
    swing(E, D, C) {
      const w = [C.bs(0), C.bs(1), C.bs(2), C.walk];
      for (let b = 0; b < 4; b++) E('bass', b, 0.85, w[b], b ? 0.8 : 0.95);
      for (const b of [1, 3]) for (let i = 0; i < 3; i++) E('comp', b, 0.3, C.ct(i, 55), 0.6);
      if (C.lvl >= 0.9) for (let i = 0; i < 3; i++) E('pad', 0, 3.6, C.ct(i, 55), 0.6);
      if (C.lvl < 0.55) return;
      for (let b = 0; b < 4; b++) {
        D(DR.ride, b, b % 2 ? 0.75 : 0.55);
        if (b % 2) {
          D(DR.ride, b + 0.5, 0.4);
          D(DR.hh, b, 0.5);
          D(DR.brush, b, 0.65);
        }
      }
      if (C.erst) D(DR.kick, 0, 0.4);
      if (C.last) {
        D(DR.snare, 3, 0.35);
        D(DR.snare, 3.5, 0.45);
      }
    },
    // a slow piano piece in three: a low note, a chord that rings, the tune above
    klavier(E, D, C) {
      E('bass', 0, 2.9, C.bs(0), 0.7);
      for (let i = 0; i < 3; i++) E('comp', 1, 1.9, C.ct(i, 52), 0.45);
    },
  };

  // ---- the styles. form: sections in order, each a letter and its bars; sek: letter → [chords per bar (repeated if shorter), how full
  //      (0.5 thin … 1.2 full), the theme the lead plays, the key's shift in semitones, who plays the tune (a part of the line-up)] ----
  const P16 = '1 1 57 57 57 57 1 1 1 1 4 4 57 57 1 1';
  const STIL = {
    polka: {
      bpb: 2,
      bpm: [108, 120],
      keys: [5, 10, 0, 7, 3],
      mode: ['dur'],
      feel: 'oom2',
      art: 0.62,
      cells: [
        [0.5, 0.5, 0.5, 0.5],
        [1, 0.5, 0.5],
        [0.5, 0.5, 1],
        [0.75, 0.25, 0.5, 0.5],
        [0.5, 0.25, 0.25, 0.5, 0.5],
        [1, 1],
      ],
      form: 'I4 A16 B16 T16 A16 E2',
      sek: {
        I: ['1 4 57 57', 0.6],
        A: [P16, 1, 'a'],
        B: ['4 4 1 1 57 57 1 1 4 4 1 1 2 57 1 1', 1.2, 'b'],
        T: ['1 1 4 4 57 57 1 1 1 1 4 4 57 57 1 1', 0.9, 'c', 5, 'lead2'],
        E: ['57 1', 1.2],
      },
    },
    marsch: {
      bpb: 2,
      bpm: [108, 116],
      keys: [5, 10, 3, 8, 0],
      mode: ['dur'],
      feel: 'oom2',
      art: 0.7,
      cells: [
        [1, 0.5, 0.5],
        [0.75, 0.25, 1],
        [0.5, 0.5, 0.5, 0.5],
        [0.75, 0.25, 0.75, 0.25],
        [1, 1],
        [1.5, 0.5],
      ],
      form: 'I4 A16 B16 T16 A16 E2',
      sek: {
        I: ['1 1 57 57', 1],
        A: [P16, 1, 'a'],
        B: ['57 57 1 1 57 57 1 1 4 4 1 1 2 57 1 1', 1.2, 'b'],
        T: ['1 1 1 1 57 57 57 57 2 2 57 57 57 57 1 1', 0.85, 'c', 5, 'lead2'],
        E: ['57 1', 1.2],
      },
    },
    walzer: {
      bpb: 3,
      bpm: [150, 172],
      keys: [0, 5, 7, 2, 10],
      mode: ['dur'],
      feel: 'oom3',
      art: 0.9,
      cells: [[2, 1], [1, 1, 1], [1.5, 0.5, 1], [1, 2], [3], [1, 0.5, 0.5, 1]],
      form: 'I4 A16 B16 A16 E2',
      sek: {
        I: ['1 1 57 57', 0.6],
        A: [P16, 1, 'a'],
        B: ['4 4 1 1 57 57 1 1 4 4 1 1 2 57 1 1', 1.1, 'b', 0, 'lead2'],
        E: ['57 1', 1],
      },
    },
    fox: {
      bpb: 4,
      bpm: [118, 127],
      keys: [0, 2, 4, 5, 7, 9],
      mode: ['dur'],
      feel: 'fox',
      art: 0.88,
      cells: [
        [1, 1, 1, 1],
        [1.5, 0.5, 1, 1],
        [1, 0.5, 0.5, 2],
        [0.5, 0.5, 1, 2],
        [2, 1, 1],
        [1, 1, 2],
        [0.5, 0.5, 0.5, 0.5, 1, 1],
        [3, 1],
      ],
      form: 'I2 V8 C8 Z4 R8 E2',
      sek: {
        I: ['1 57', 0.7],
        V: ['1 1 6 6 4 4 57 57', 0.8, 'a'],
        C: ['1 5 6 4 1 4 57 1', 1.1, 'b'],
        Z: ['4 4 5 57', 0.7, 'c', 0, 'lead2'],
        R: ['1 5 6 4 1 4 57 1', 1.2, 'b', 1],
        E: ['4 1', 1.2, '', 1],
      },
    },
    rock: {
      bpb: 4,
      bpm: [112, 136],
      keys: [4, 9, 2, 11, 7],
      mode: ['moll'],
      feel: 'rock',
      art: 0.9,
      cells: [
        [1, 1, 1, 1],
        [1.5, 0.5, 2],
        [0.5, 0.5, 1, 2],
        [2, 2],
        [1, 0.5, 0.5, 1, 1],
        [0.5, 1, 0.5, 2],
        [3, 1],
        [1.5, 1.5, 1],
      ],
      form: 'I4 V8 C8 S8 C8 E2',
      sek: {
        I: ['1 1 6 7', 0.75],
        V: ['1 1 6 7 1 1 6 7', 0.8, 'a', 0, 'vers'],
        C: ['6 7 1 1 6 7 1 5!', 1.1, 'b'],
        S: ['1 7 6 7 1 7 6 5!', 1, 's'],
        E: ['6 1', 1.2],
      },
    },
    ballade: {
      bpb: 4,
      bpm: [66, 76],
      keys: [9, 4, 2, 7],
      mode: ['moll'],
      feel: 'ballade',
      art: 0.95,
      cells: [[2, 2], [1, 1, 2], [3, 1], [1.5, 0.5, 2], [1, 0.5, 0.5, 2], [2, 1, 1], [4]],
      form: 'I2 V8 C8 E2',
      sek: {
        I: ['1 6', 0.6],
        V: ['1 5 6 4 1 5 6 5!', 0.9, 'a'],
        C: ['6 7 3 1 6 7 5! 1', 1.1, 'b'],
        E: ['4 1', 0.9],
      },
    },
    synth: {
      bpb: 4,
      bpm: [104, 124],
      keys: [9, 2, 4, 7, 0, 11],
      mode: ['moll'],
      feel: 'synth',
      art: 0.85,
      cells: [
        [1, 1, 1, 1],
        [1.5, 1.5, 1],
        [0.5, 0.5, 1, 2],
        [2, 2],
        [1, 0.5, 0.5, 1, 1],
        [0.75, 0.75, 0.5, 2],
        [3, 1],
        [0.5, 0.5, 0.5, 0.5, 2],
      ],
      form: 'I4 V8 C8 B4 C8 E2',
      sek: {
        I: ['1 1 6 6', 0.7],
        V: ['1 1 6 6 3 3 7 7', 0.85, 'a'],
        C: ['6 7 1 1 6 7 1 5!', 1.1, 'b'],
        B: ['4 4 6 7', 0.6, 'c', 0, 'gegen'],
        E: ['6 1', 1.1],
      },
    },
    pop: {
      bpb: 4,
      bpm: [96, 112],
      keys: [0, 2, 4, 5, 7, 9],
      mode: ['dur'],
      feel: 'pop',
      art: 0.85,
      cells: [
        [1, 1, 1, 1],
        [1.5, 0.5, 2],
        [0.5, 0.5, 1, 1, 1],
        [2, 1, 1],
        [1, 1, 2],
        [1, 0.5, 0.5, 2],
        [3, 1],
      ],
      form: 'I2 V8 C8 E2',
      sek: {
        I: ['1 4', 0.7],
        V: ['1 5 6 4 1 5 4 57', 0.9, 'a'],
        C: ['4 5 1 6 4 57 1 1', 1.1, 'b'],
        E: ['4 1', 1],
      },
    },
    swing: {
      bpb: 4,
      bpm: [124, 146],
      keys: [5, 10, 3, 0, 7],
      mode: ['dur'],
      feel: 'swing',
      art: 0.8,
      swing: 0.64,
      cells: [
        [1, 0.5, 0.5, 2],
        [0.5, 0.5, 1, 2],
        [1.5, 0.5, 1, 1],
        [2, 2],
        [0.5, 0.5, 0.5, 0.5, 2],
        [1, 1, 1, 1],
        [3, 1],
      ],
      form: 'I4 A8 A8 B8 A8 E2',
      sek: {
        I: ['1 6 2 57', 0.6],
        A: ['1 6 2 57 1 6 2 57', 0.8, 'a'],
        B: ['4 4 1 1 2 2 57 57', 1, 'b', 0, 'lead2'],
        E: ['57 1', 1],
      },
    },
    klavier: {
      bpb: 3,
      bpm: [60, 70],
      keys: [2, 9, 4, 7, 0],
      mode: ['dor', 'moll', 'dur'],
      feel: 'klavier',
      art: 1,
      cells: [[3], [2, 1], [1, 2], [1, 1, 1], [1.5, 0.5, 1], [2, 1]],
      form: 'I2 A8 B8 A8 E2',
      sek: {
        I: ['1 4', 0.5],
        A: ['1 4 1 4 6 4 1 1', 0.8, 'a'],
        B: ['4 1 4 1 2 4 5 5', 0.8, 'b'],
        E: ['4 1', 0.8],
      },
    },
    // a station's ident: two bars
    kennung: {
      bpb: 4,
      bpm: [152, 152],
      keys: [0, 2, 5, 7, 9],
      mode: ['dur'],
      feel: 'pop',
      art: 0.8,
      cells: [[0.5, 0.5, 0.5, 0.5, 2]],
      form: 'K1 E1',
      sek: { K: ['1', 0.6, 'a'], E: ['1', 1] },
    },
  };
  // ---- who plays: per style, and per style at a station ----
  const BES = {
    polka: { bass: 'tuba', comp: 'akk', lead: 'akk', lead2: 'klar', kit: 'folk', zwei: true },
    'polka@blasius': { comp: 'horn', lead: 'trp', lead2: 'klar', kit: 'marsch' },
    marsch: { bass: 'tuba', comp: 'horn', lead: 'trp', lead2: 'klar', kit: 'marsch', zwei: true },
    walzer: { bass: 'kbass', comp: 'git', lead: 'akk', lead2: 'klar', zwei: true },
    'walzer@blasius': { bass: 'tuba', comp: 'horn', lead: 'klar', lead2: 'trp' },
    'walzer@republik': { lead: 'geige', lead2: 'klar' },
    fox: { bass: 'ebass', comp: 'epiano', pad: 'streich', lead: 'trp', lead2: 'akk', zwei: true },
    'fox@west': { lead: 'synlead', lead2: 'glocke', zwei: false },
    rock: { bass: 'ebass', comp: 'egit', pad: 'orgel', lead: 'lead', vers: 'orgel' },
    'rock@grenzland': { vers: 'git' },
    ballade: { bass: 'ebass', comp: 'klavier', pad: 'streich', lead: 'geige' },
    synth: { bass: 'sbass', comp: 'arp', pad: 'pad', lead: 'synlead', gegen: 'glocke' },
    pop: { bass: 'ebass', comp: 'git', pad: 'epiano', lead: 'pfeif' },
    'pop@west': { lead: 'synlead', pad: 'pad' },
    swing: { bass: 'kbass', comp: 'git', pad: 'sax', lead: 'klar', lead2: 'dtrp' },
    klavier: { bass: 'klavier', comp: 'klavier', lead: 'klavier' },
    kennung: { bass: 'ebass', comp: 'git', pad: 'epiano', lead: 'glocke' },
    'kennung@kirmes': { bass: 'tuba', comp: 'akk', lead: 'akk' },
    'kennung@zweitakt': { comp: 'egit', pad: 'orgel', lead: 'lead' },
    'kennung@neon': { bass: 'sbass', comp: 'arp', pad: 'pad', lead: 'synlead' },
    'kennung@klassik': { bass: 'klavier', comp: 'klavier', pad: '', lead: 'klavier' },
    'kennung@blasius': { bass: 'tuba', comp: 'horn', pad: '', lead: 'trp' },
    'kennung@republik': { bass: 'tuba', comp: 'horn', pad: '', lead: 'trp' },
    'kennung@impuls': { bass: 'sbass', comp: 'arp', pad: 'pad', lead: 'synlead' },
    'kennung@west': { bass: 'sbass', pad: 'pad', lead: 'glocke' },
  };
  // ---- the repertoire: a station always plays these pieces (titles and performers are invented) ----
  const T = (t, v, s) => ({ t, v, s });
  const REP = {
    grenzland: [
      T('Freitag in Schleusingen', 'Die Frühschicht', 'pop'),
      T('Kein Netz am Kamm', 'Tanja & die Tarifzone', 'pop'),
      T('Bratwurst um halb acht', 'Rostkultur', 'fox'),
      T('Umleitung über Ratscher', 'Die Frühschicht', 'pop'),
      T('Blitzer, mein Blitzer', 'Kommando Kreisverkehr', 'rock'),
      T('Sommer am Stausee', 'Tanja & die Tarifzone', 'pop'),
    ],
    kirmes: [
      T('Kirmes in Kloster Veßra', 'Die Original Schleusetaler', 'polka'),
      T('Herz aus Thüringer Glas', 'Silvia Sonnenschein', 'fox'),
      T('Walzer am Bergsee', 'Trio Tannengrün', 'walzer'),
      T('Bratwurst-Polka', 'Die Original Schleusetaler', 'polka'),
      T('Tausend Lichter über Suhl', 'Silvia Sonnenschein', 'fox'),
      T('Im Tal, wo die Schleuse rauscht', 'Trio Tannengrün', 'walzer'),
    ],
    zweitakt: [
      T('Gemisch eins zu fünfzig', 'Kolbenfresser', 'rock'),
      T('Vergaser', 'Die Kettenspanner', 'rock'),
      T('Novemberlicht', 'Stahlblau', 'ballade'),
      T('Landstraße bei Nacht', 'Kolbenfresser', 'rock'),
      T('Schichtwechsel', 'Die Kettenspanner', 'rock'),
      T('Stausee im Regen', 'Stahlblau', 'ballade'),
    ],
    neon: [
      T('Neon über dem Stausee', 'Kassette C90', 'synth'),
      T('Tastentelefon', 'Diskette 3½', 'synth'),
      T('Nachtbus nach Suhl', 'Kassette C90', 'synth'),
      T('Laserkirmes', 'Diskette 3½', 'synth'),
      T('Herzschlag in Stereo', 'Vera Vektor', 'synth'),
      T('Sendeschluss', 'Vera Vektor', 'synth'),
    ],
    klassik: [
      T('Klavierstück im Nebel Nr. 1', 'Hauskomposition des Senders', 'klavier'),
      T('Klavierstück im Nebel Nr. 2', 'Hauskomposition des Senders', 'klavier'),
      T('Klavierstück im Nebel Nr. 3', 'Hauskomposition des Senders', 'klavier'),
    ],
    blasius: [
      T('Gruß aus dem Rodachtal', 'Blaskapelle Blasius', 'marsch'),
      T('Leberkäs-Polka', 'Blaskapelle Blasius', 'polka'),
      T('Kirchweih-Walzer', 'Stubenmusik Zwetschgendatschi', 'walzer'),
      T('Mit Pauken und Bratwürsten', 'Blaskapelle Blasius', 'marsch'),
      T('Böhmische Brotzeit', 'Blaskapelle Blasius', 'polka'),
      T('Ländler vom Lautergrund', 'Stubenmusik Zwetschgendatschi', 'walzer'),
    ],
    // 1989
    republik: [
      T('Marsch der Frühschicht', 'Zentrales Blasorchester', 'marsch'),
      T('Tanz im Kulturhaus', 'Tanzorchester des Senders', 'swing'),
      T('Herbstwalzer', 'Rundfunk-Tanzstreicher', 'walzer'),
      T('Abendbummel', 'Tanzorchester des Senders', 'swing'),
      T('Aufbau-Marsch Nr. 7', 'Zentrales Blasorchester', 'marsch'),
      T('Feierabend-Foxtrott', 'Tanzorchester des Senders', 'swing'),
    ],
    impuls: [
      T('Fernweh', 'Gruppe Stellwerk', 'rock'),
      T('Kassettenmädchen', 'Elektrik', 'synth'),
      T('Wartburg im Regen', 'Gruppe Stellwerk', 'rock'),
      T('Schaltkreis', 'Elektrik', 'synth'),
      T('Bleib doch hier', 'Gruppe Stellwerk', 'ballade'),
      T('Zehnte Klasse', 'Die Nachzügler', 'rock'),
    ],
    west: [
      T('Herzklopfen auf UKW', 'Jenny & die Jetset', 'synth'),
      T('Coburg bei Nacht', 'Die Hausband', 'pop'),
      T('Sonnenbrille im November', 'Jenny & die Jetset', 'synth'),
      T('Schlagerherz', 'Peter Pfundig', 'fox'),
      T('Rollschuh-Disco', 'Jenny & die Jetset', 'pop'),
      T('Synthetik', 'Kapitän Kassette', 'synth'),
    ],
  };
  // what a tune's notes step by (scale steps; small steps are likelier than leaps)
  const STEPS = [1, 1, 1, -1, -1, -1, -1, 2, -2, 2, -2, 0, 3, -3];

  // ---- a theme: a period of phrases over a section's chords. Returns [{ b: beat from the section's start, d: beats, p: degree, st: on a beat }] ----
  function thema(r, stil, prog, bars, hoch) {
    const bpb = stil.bpb,
      cells = stil.cells,
      pick = () => cells[Math.floor(r() * cells.length)],
      unit = bars >= 16 ? 8 : bars >= 8 ? 4 : bars,
      out = [],
      LO = -2,
      HI = 8,
      grid = bpb === 4 ? 2 : bpb === 3 ? 3 : 1;
    const mot = () => {
      const c = [pick(), pick()],
        st = [];
      for (const cell of c) for (let k = 0; k < cell.length; k++) st.push(STEPS[Math.floor(r() * STEPS.length)]);
      return { c, st };
    };
    const MA = mot(),
      MB = mot(),
      KAD = pick();
    // where the tune begins: on the third, the fifth or the octave (a chorus higher); every phrase begins there again
    const p0 = (hoch ? [4, 7, 7, 4] : [2, 4, 4, 7])[Math.floor(r() * 4)];
    let p = p0;
    // a step; far from the middle it turns back more often than not
    const step = d => (Math.abs(p - 4) >= 3 && (p - 4) * d > 0 && r() < 0.7 ? -d : d);
    const fold = q => (q > HI ? HI - (q - HI) : q < LO ? LO + (LO - q) : q);
    const chAt = b => prog[b % prog.length];
    for (let ph = 0; ph * unit < bars; ph++) {
      const fin = (ph + 1) * unit >= bars;
      for (let u = 0; u + 1 < unit || u === 0; u += 2) {
        const b0 = ph * unit + u,
          cad = u + 2 >= unit && unit > 1;
        if (!cad) {
          // a motif of two bars: MA, MA again over the next chords, then MB
          const M = unit >= 8 && u === 4 ? MB : MA;
          let j = 0;
          for (let k = 0; k < 2; k++) {
            const ch = chAt(b0 + k);
            let pos = 0;
            for (const d of M.c[k]) {
              const st = (pos % grid === 0 && d >= 0.5) || d >= 2;
              if (j === 0 && u === 0) p = p0;
              else p = fold(p + step(M.st[j]));
              if (st) p = fold(snap(p, ch, M.st[j]));
              out.push({ b: (b0 + k) * bpb + pos, d, p, st });
              pos += d;
              j++;
            }
          }
        } else {
          // the cadence: a bar that leads there, then one long note – the tonic at the end, else a tone of the chord
          const ch = chAt(b0);
          let pos = 0;
          for (const d of unit > 2 ? KAD : []) {
            const st = (pos % grid === 0 && d >= 0.5) || d >= 2;
            p = fold(p + (r() < 0.5 ? -1 : 1));
            if (st) p = fold(snap(p, ch, -1));
            out.push({ b: b0 * bpb + pos, d, p, st });
            pos += d;
          }
          const lb = unit > 2 ? b0 + 1 : b0,
            lc = chAt(lb);
          p = fin ? (Math.abs(p - 7) < Math.abs(p) ? 7 : 0) : snap(p, lc, -1);
          if (fin && !istAkk(p, lc)) p = snap(p, lc, -1);
          out.push({ b: lb * bpb, d: bpb * (unit > 2 ? 0.85 : 1.7), p, st: true });
        }
        if (unit <= 2) break;
      }
    }
    return out;
  }

  // ---- compose a piece ----
  function komponiere(sender, i, meta) {
    const rep = REP[sender];
    if (!meta && !rep) return null;
    const n0 = rep ? rep.length : 1,
      idx = mod(i | 0, n0);
    meta = meta || rep[idx];
    const stil = STIL[meta.s],
      r = rng(hash(sender + '/' + meta.t)),
      bpm = Math.round(stil.bpm[0] + (stil.bpm[1] - stil.bpm[0]) * r()),
      key = stil.keys[Math.floor(r() * stil.keys.length)],
      mode = stil.mode[Math.floor(r() * stil.mode.length)],
      sk = SKALA[mode],
      bes = Object.assign({}, BES[meta.s], BES[meta.s + '@' + sender]),
      bpb = stil.bpb,
      spb = 60 / bpm,
      sw = stil.swing || 0;
    const insNames = [],
      insOf = name => {
        let k = insNames.indexOf(name);
        if (k < 0) k = insNames.push(name) - 1;
        return k;
      };
    const ev = [];
    // the sections
    const sek = [],
      seen = {};
    let bar = 0;
    for (const tok of stil.form.split(' ')) {
      const name = tok[0],
        bars = +tok.slice(1),
        def = stil.sek[name];
      seen[name] = (seen[name] || 0) + 1;
      sek.push({
        name,
        b0: bar,
        bars,
        prog: def[0].split(' ').map(akk),
        lvl: def[1],
        th: def[2] || '',
        tr: def[3] || 0,
        wer: def[4] || 'lead',
        nth: seen[name],
      });
      bar += bars;
    }
    const total = bar,
      themes = {};
    const tOf = beat => {
      const f = beat % 1;
      return (sw && Math.abs(f - 0.5) < 1e-6 ? beat - 0.5 + sw : beat) * spb;
    };
    for (let si = 0; si < sek.length; si++) {
      const s = sek[si],
        tonic = mod(key + s.tr, 12),
        bassLo = into(tonic, 31) > 40 ? 28 : 31,
        // fuller sections are played louder
        dyn = 0.64 + 0.36 * s.lvl;
      const part = (role, beat, dur, midi, vel) => {
        const name = bes[role];
        if (!name) return;
        ev.push([tOf(beat), dur * spb, midi, vel * dyn * (0.92 + 0.16 * r()), insOf(name)]);
      };
      for (let b = 0; b < s.bars; b++) {
        const ch = s.prog[b % s.prog.length],
          nxs = b + 1 < s.bars ? s : sek[si + 1] || s,
          nx = b + 1 < s.bars ? s.prog[(b + 1) % s.prog.length] : nxs.prog[0],
          beat0 = (s.b0 + b) * bpb,
          rootB = into(tonic + semi(sk, ch.d), bassLo),
          ende = si === sek.length - 1 && b === s.bars - 1;
        const C = {
          ch,
          nx,
          lvl: s.lvl,
          bar: b,
          bpb,
          erst: b === 0,
          last: b % 4 === 3 || b === s.bars - 1,
          // chord tone i (0 root, 1 third, 2 fifth, 3 seventh) at or above lo
          ct: (k, lo) => into(tonic + ton(sk, ch.d + 2 * k, ch), lo),
          bs: k => (k === 0 ? rootB : into(tonic + ton(sk, ch.d + 2 * k, ch), rootB - 5)),
          // a step of the scale between this root and the next (the bass walks there)
          walk: 0,
        };
        {
          const dd = mod(nx.d - ch.d, 7),
            zdeg = ch.d + (dd > 3 ? dd - 7 : dd),
            sg = Math.sign(zdeg - ch.d);
          C.walk = Math.abs(zdeg - ch.d) <= 1 ? C.bs(2) : rootB + semi(sk, zdeg - sg) - semi(sk, ch.d);
        }
        const E = (role, bt, d, midi, v) => part(role, beat0 + bt, d, midi, v),
          D = (kind, bt, v) => ev.push([tOf(beat0 + bt), 0, kind, v * dyn * (0.9 + 0.2 * r()), -1]);
        if (ende) {
          // the last bar: everybody holds the tonic's chord
          E('bass', 0, bpb * 1.4, rootB, 1);
          for (let k = 0; k < 3; k++) {
            E('comp', 0, bpb * 1.4, C.ct(k, 55), 0.8);
            E('pad', 0, bpb * 1.4, C.ct(k, 60), 0.7);
          }
          const reg = (INS[bes.lead] || {}).reg || 60;
          E('lead', 0, bpb * 1.4, into(tonic, reg - 12) + 12, 0.9);
          if (stil.feel !== 'klavier') {
            D(bes.kit === 'marsch' ? DR.bd : DR.kick, 0, 0.9);
            D(DR.crash, 0, 0.5);
          }
          continue;
        }
        FEEL[stil.feel](E, D, C, bes);
      }
      // the tune
      if (s.th) {
        const key2 = s.th + ':' + s.bars;
        const th = themes[key2] || (themes[key2] = thema(r, stil, s.prog, s.bars, s.th === 'b'));
        const role = bes[s.wer] ? s.wer : 'lead',
          reg = (INS[bes[role]] || {}).reg || 70,
          base = into(tonic, reg - 12),
          two = bes.zwei && bes.lead2 && role === 'lead' && (s.nth > 1 || s.lvl >= 1.1);
        for (const nt of th) {
          const ch = s.prog[Math.floor(nt.b / bpb) % s.prog.length],
            beat = s.b0 * bpb + nt.b,
            long = nt.d >= bpb * 0.8,
            d = nt.d * (long ? 0.92 : stil.art);
          part(role, beat, d, base + ton(sk, nt.p, ch), nt.st ? 1 : 0.84);
          if (two) {
            // the second voice: a third below, on the beats the chord's next tone below
            let q = nt.p - 2;
            if (nt.st && !istAkk(q, ch))
              q = istAkk(nt.p - 3, ch) ? nt.p - 3 : istAkk(nt.p - 4, ch) ? nt.p - 4 : nt.p - 5;
            part('lead2', beat, d, base + ton(sk, q, ch), nt.st ? 0.72 : 0.6);
          }
        }
      }
    }
    ev.sort((a, b) => a[0] - b[0] || a[4] - b[4] || a[2] - b[2]);
    const dauer = Math.min(MAXS, total * bpb * spb + 1.6),
      pack = new Float32Array(ev.length * 5);
    for (let k = 0; k < ev.length; k++) pack.set(ev[k], k * 5);
    return {
      sender,
      i: idx,
      titel: meta.t,
      von: meta.v,
      stil: meta.s,
      bpm,
      bpb,
      key,
      mode,
      dauer,
      n: Math.round(dauer * SR),
      ev: pack,
      nev: ev.length,
      ins: insNames,
      sek,
      takte: total,
    };
  }
  const song = (sender, i) => komponiere(sender, i);
  // a station's ident: two bars in the station's key and colours (the first piece's line-up)
  const kennung = sender => {
    const rep = REP[sender] || REP.grenzland,
      s = komponiere(sender, 0, { t: 'Kennung ' + sender, v: '', s: 'kennung' });
    s.kennung = true;
    s.von = rep[0].v;
    return s;
  };
  // the pitch classes in key at t seconds (a bit mask): the section's scale, and the raised third while a '!' chord sounds
  function tonart(S, t) {
    const spb = 60 / S.bpm,
      bar = Math.min(S.takte - 1, Math.max(0, Math.floor((t + 1e-4) / (S.bpb * spb)))),
      sk = SKALA[S.mode];
    let s = S.sek[0];
    for (const q of S.sek) if (bar >= q.b0) s = q;
    const tonic = mod(S.key + s.tr, 12);
    let m = 0;
    for (const x of sk) m |= 1 << mod(tonic + x, 12);
    for (const ch of s.prog) if (ch.dur) m |= 1 << mod(tonic + semi(sk, ch.d) + 4, 12);
    return m;
  }

  // ======================= the synthesiser =======================
  const NL = 60000;
  let NOISE = null;
  function noise() {
    if (NOISE) return NOISE;
    NOISE = new Float32Array(NL);
    let s = 22222;
    for (let i = 0; i < NL; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      NOISE[i] = (s >>> 8) / 8388608 - 1;
    }
    return NOISE;
  }
  // the corner of a band-limited step (polyBLEP)
  const blep = (t, dt) => {
    if (t < dt) {
      t /= dt;
      return t + t - t * t - 1;
    }
    if (t > 1 - dt) {
      t = (t - 1) / dt;
      return t * t + t + t + 1;
    }
    return 0;
  };
  const PH = new Float64Array(3),
    INC = new Float64Array(3),
    KS = new Float32Array(4096);
  // one note of an instrument, added to the mix M (and, by its send, to the reverb's input F)
  function stimme(M, F, t0, dur, midi, vel, P, nr) {
    const f = 440 * Math.pow(2, (midi - 69) / 12),
      i0 = Math.max(0, Math.round(t0 * SR)),
      nOn = Math.max(16, Math.round(dur * SR)),
      rel = P.r || 0.05,
      g = (P.g || 0.2) * vel,
      hall = P.hall || 0;
    if (i0 >= M.length) return;
    if (P.w === 'pluck') return zupf(M, F, i0, nOn, f, g, hall, P, nr);
    if (P.w === 'piano') return klav(M, F, i0, nOn, f, midi, g, hall, P);
    const n = Math.min(M.length - i0, nOn + Math.round(rel * 5 * SR)),
      nA = Math.max(1, Math.round((P.a || 0.005) * SR)),
      kd = Math.exp(-1 / ((P.d || 0.2) * SR)),
      sus = P.s === undefined ? 0.7 : P.s,
      kr = Math.exp(-1 / (rel * SR)),
      w = P.w,
      nv = P.rat ? P.rat.length : P.uni || 1;
    for (let v = 0; v < nv; v++) {
      const ratio = P.rat ? P.rat[v] : nv > 1 ? Math.pow(2, ((P.det || 0) * (v - (nv - 1) / 2)) / 1200) : 1;
      INC[v] = (f * ratio) / SR;
      PH[v] = w === 'saw' ? 0.5 : v * 0.31;
    }
    const lp = P.lp,
      vib = P.vib,
      fm = P.fm,
      trem = P.trem,
      drive = P.drive || 0,
      dn = drive ? 1 / Math.tanh(drive) : 1,
      pw = P.pw || 0.5,
      mix = 1 / Math.sqrt(nv);
    let lvl = 0,
      vf = 1,
      ic1 = 0,
      ic2 = 0,
      a1 = 0,
      a2 = 0,
      a3 = 0,
      fi = fm ? fm[1] : 0,
      tr = 1;
    for (let i = 0; i < n; i++) {
      if ((i & 15) === 0) {
        const t = i / SR;
        if (vib) vf = 1 + vib[1] * 0.000578 * Math.sin(TAU * vib[0] * t) * Math.min(1, t / (vib[2] + 0.05));
        if (lp) {
          const fc = Math.min(
              SR * 0.42,
              (P.kt ? lp[0] * f : lp[0]) + (P.kt ? lp[1] * f : lp[1]) * Math.exp(-t / (lp[2] || 0.2))
            ),
            gg = Math.tan((Math.PI * fc) / SR),
            k = 1 / (lp[3] || 0.7);
          a1 = 1 / (1 + gg * (gg + k));
          a2 = gg * a1;
          a3 = gg * a2;
        }
        if (fm && fm[2]) fi = fm[1] * (0.25 + 0.75 * Math.exp(-t / fm[2]));
        if (trem) tr = 1 - trem[1] * (0.5 + 0.5 * Math.sin(TAU * trem[0] * t));
      }
      if (i < nA) lvl = (i + 1) / nA;
      else if (i < nOn) lvl = sus + (lvl - sus) * kd;
      else lvl *= kr;
      let y = 0;
      for (let v = 0; v < nv; v++) {
        const inc = INC[v] * vf;
        let ph = PH[v] + inc;
        if (ph >= 1) ph -= 1;
        PH[v] = ph;
        if (w === 'saw') y += 2 * ph - 1 - blep(ph, inc);
        else if (w === 'pulse') {
          let q = ph + 1 - pw;
          if (q >= 1) q -= 1;
          y += (ph < pw ? 1 : -1) + blep(ph, inc) - blep(q, inc) - (2 * pw - 1);
        } else if (w === 'fm') y += Math.sin(TAU * ph + (fm[2] ? fi : fi * lvl) * Math.sin(TAU * ph * fm[0]));
        else if (w === 'organ') {
          const p = TAU * ph;
          y += (Math.sin(p) + 0.55 * Math.sin(2 * p) + 0.32 * Math.sin(3 * p) + 0.18 * Math.sin(4 * p)) * 0.6;
        } else y += Math.sin(TAU * ph);
      }
      y *= mix;
      if (drive) y = Math.tanh(y * drive) * dn;
      if (lp) {
        const v3 = y - ic2,
          v1 = a1 * ic1 + a2 * v3,
          v2 = ic2 + a2 * ic1 + a3 * v3;
        ic1 = 2 * v1 - ic1;
        ic2 = 2 * v2 - ic2;
        y = v2;
      }
      y *= lvl * g * tr;
      M[i0 + i] += y;
      if (hall) F[i0 + i] += y * hall;
    }
  }
  // a plucked string (Karplus, Strong): a burst of noise goes round a delay line and loses its treble
  function zupf(M, F, i0, nOn, f, g, hall, P, nr) {
    const N = noise(),
      D = SR / f - 0.5,
      Li = Math.floor(D),
      fr = D - Li,
      T60 = P.d || 2,
      damp = Math.pow(0.001, 1 / (T60 * f)),
      dampR = Math.pow(0.001, 1 / ((P.r || 0.2) * f)),
      br = P.br || 0.5,
      n = Math.min(M.length - i0, nOn + Math.round((P.r || 0.2) * 1.2 * SR), Math.round(T60 * 1.1 * SR));
    if (Li < 2 || Li > 4000) return;
    let lp = 0,
      mx = 1e-6,
      off = (nr * 7919) % (NL - 4200);
    for (let k = 0; k <= Li; k++) {
      lp += br * (N[off + k] - lp);
      KS[k] = lp;
      if (Math.abs(lp) > mx) mx = Math.abs(lp);
    }
    for (let k = 0; k <= Li; k++) KS[k] /= mx;
    let w = Li + 1,
      prev = 0;
    for (let i = 0; i < n; i++) {
      const a = KS[(w - Li) & 4095],
        b = KS[(w - Li - 1) & 4095],
        x = a * (1 - fr) + b * fr,
        y = (i < nOn ? damp : dampR) * 0.5 * (x + prev);
      prev = x;
      KS[w & 4095] = y;
      w++;
      const o = y * g * (i < 24 ? i / 24 : 1);
      M[i0 + i] += o;
      if (hall) F[i0 + i] += o * hall;
    }
  }
  // a piano tone: a few slightly inharmonic partials, each fading at its own pace (the high ones sooner)
  function klav(M, F, i0, nOn, f, midi, g, hall, P) {
    const tau1 = Math.max(0.5, Math.min(4.2, 3 * Math.pow(2, -(midi - 48) / 18))),
      relN = Math.round((P.r || 0.3) * 4 * SR),
      n = Math.min(M.length - i0, nOn + relN),
      K = Math.max(1, Math.min(8, Math.floor((0.42 * SR) / f))),
      kr = Math.exp(-1 / ((P.r || 0.3) * SR));
    for (let k = 1; k <= K; k++) {
      const fk = k * f * Math.sqrt(1 + 0.0004 * k * k),
        w = (TAU * fk) / SR,
        c = 2 * Math.cos(w),
        dk = Math.exp(-1 / ((tau1 / (1 + 0.4 * (k - 1))) * SR));
      let s1 = 0,
        s0 = Math.sin(w),
        e = (g * (k === 1 ? 1 : 0.8)) / Math.pow(k, 0.9);
      for (let i = 0; i < n; i++) {
        const y = s1 * e * (i < 60 ? i / 60 : 1);
        M[i0 + i] += y;
        if (hall) F[i0 + i] += y * hall;
        const s2 = c * s0 - s1;
        s1 = s0;
        s0 = s2;
        e *= i < nOn ? dk : dk * kr;
      }
    }
  }
  // a drum hit
  function trommel(M, F, t0, kind, vel, nr) {
    const N = noise(),
      i0 = Math.max(0, Math.round(t0 * SR)),
      off = (nr * 104729) % (NL - 30000),
      room = M.length - i0;
    if (room <= 0) return;
    // a sine that falls in pitch: kick, bass drum, toms
    const sweep = (f1, f0, tp, ta, g, n) => {
      n = Math.min(room, n);
      let ph = 0,
        ep = 1,
        ea = 1;
      const kp = Math.exp(-1 / (tp * SR)),
        ka = Math.exp(-1 / (ta * SR));
      for (let i = 0; i < n; i++) {
        ph += (f0 + (f1 - f0) * ep) / SR;
        ep *= kp;
        ea *= ka;
        M[i0 + i] += Math.sin(TAU * ph) * ea * g * (i < 20 ? i / 20 : 1);
      }
    };
    // filtered noise: hp / lp corners as one-pole coefficients, a decay, an attack, a gate, a send to the reverb
    const rausch = (cHp, cLp, ta, g, n, d0 = 0, att = 0, send = 0) => {
      n = Math.min(room - d0, n);
      let lo = 0,
        sm = 0,
        ea = 1;
      const ka = Math.exp(-1 / (ta * SR)),
        nA = Math.round(att * SR);
      for (let i = 0; i < n; i++) {
        const x = N[off + d0 + i];
        lo += cHp * (x - lo);
        sm += cLp * (x - lo - sm);
        ea *= ka;
        const y = sm * ea * g * (i < nA ? i / nA : 1);
        M[i0 + d0 + i] += y;
        if (send) F[i0 + d0 + i] += y * send;
      }
    };
    const v = vel;
    switch (kind) {
      case DR.kick:
        sweep(150, 50, 0.025, 0.11, 0.62 * v, 7200);
        rausch(0.3, 0.5, 0.002, 0.25 * v, 120);
        break;
      case DR.bd:
        sweep(100, 52, 0.04, 0.16, 0.6 * v, 9600);
        break;
      case DR.snare:
        sweep(260, 180, 0.02, 0.05, 0.32 * v, 3000);
        rausch(0.25, 0.75, 0.07, 0.5 * v, 6000, 0, 0, 0.12);
        break;
      case DR.snm:
        sweep(300, 220, 0.015, 0.03, 0.18 * v, 2000);
        rausch(0.45, 0.85, 0.04, 0.44 * v, 3600, 0, 0, 0.1);
        break;
      case DR.gate:
        sweep(240, 170, 0.02, 0.06, 0.34 * v, 3600);
        rausch(0.2, 0.7, 0.25, 0.4 * v, 4300, 0, 0, 0.45);
        break;
      case DR.brush:
        rausch(0.2, 0.45, 0.06, 0.55 * v, 5200, 0, 0.012, 0.1);
        break;
      case DR.hh:
        rausch(0.85, 1, 0.018, 0.32 * v, 1500);
        break;
      case DR.oh:
        rausch(0.85, 1, 0.09, 0.25 * v, 6500);
        break;
      case DR.ride:
        rausch(0.8, 1, 0.16, 0.32 * v, 10000, 0, 0, 0.1);
        break;
      case DR.crash:
        rausch(0.7, 1, 0.42, 0.26 * v, 26000, 0, 0, 0.3);
        break;
      case DR.clap:
        for (const d of [0, 260, 540]) rausch(0.3, 0.5, 0.006, 0.34 * v, 240, d);
        rausch(0.3, 0.5, 0.05, 0.3 * v, 4200, 780, 0, 0.3);
        break;
      case DR.tomh:
        sweep(240, 150, 0.05, 0.11, 0.5 * v, 7000);
        break;
      case DR.toml:
        sweep(170, 100, 0.06, 0.13, 0.55 * v, 8000);
        break;
      case DR.rim:
        sweep(1700, 1500, 0.01, 0.006, 0.22 * v, 500);
        sweep(430, 400, 0.01, 0.012, 0.18 * v, 900);
        break;
      case DR.tamb:
        rausch(0.9, 1, 0.022, 0.24 * v, 1800);
        break;
    }
  }
  // ---- the reverb: four combs with damped feedback, two all-passes (state kept across the slices of one piece) ----
  const CD = [601, 653, 701, 743],
    AD = [173, 59];
  let HALL = null;
  function hallNeu() {
    if (!HALL)
      HALL = {
        c: CD.map(n => new Float32Array(n)),
        a: AD.map(n => new Float32Array(n)),
        ci: [0, 0, 0, 0],
        ai: [0, 0],
        lp: [0, 0, 0, 0],
      };
    for (const b of HALL.c) b.fill(0);
    for (const b of HALL.a) b.fill(0);
    HALL.ci.fill(0);
    HALL.ai.fill(0);
    HALL.lp.fill(0);
    return HALL;
  }
  function hall(M, F, i0, i1) {
    const H = HALL,
      fb = 0.8,
      dmp = 0.3;
    for (let i = i0; i < i1; i++) {
      const x = F[i];
      let s = 0;
      for (let k = 0; k < 4; k++) {
        const b = H.c[k],
          j = H.ci[k],
          y = b[j];
        H.lp[k] = y * (1 - dmp) + H.lp[k] * dmp;
        b[j] = x + H.lp[k] * fb;
        H.ci[k] = j + 1 === b.length ? 0 : j + 1;
        s += y;
      }
      s *= 0.25;
      for (let k = 0; k < 2; k++) {
        const b = H.a[k],
          j = H.ai[k],
          d = b[j],
          y = d - 0.5 * s;
        b[j] = s + 0.5 * y;
        H.ai[k] = j + 1 === b.length ? 0 : j + 1;
        s = y;
      }
      M[i] += s;
    }
  }
  // ---- the work buffers (one piece at a time) ----
  let MIX = null,
    FXB = null;
  function buffers(n) {
    if (!MIX || MIX.length < n) {
      MIX = new Float32Array(n);
      FXB = new Float32Array(n);
    }
    MIX.fill(0, 0, n);
    FXB.fill(0, 0, n);
  }
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  // a job renders a piece in slices: the notes, the reverb, the level, the master
  function job(S) {
    buffers(S.n);
    hallNeu();
    return {
      S,
      i: 0,
      ph: 0,
      pos: 0,
      sq: 0,
      hp: 0,
      hpx: 0,
      gain: 1,
      out: null,
      M: MIX.subarray(0, S.n),
      F: FXB.subarray(0, S.n),
    };
  }
  const SLICE = 24000,
    RMS = 0.1,
    KNEE = 0.5,
    LIM = 0.85;
  function step(J, ms = 4) {
    const S = J.S,
      M = J.M,
      F = J.F,
      n = S.n,
      t1 = now() + ms;
    for (;;) {
      if (J.ph === 0) {
        // the notes, one by one
        if (J.i >= S.nev) J.ph = 1;
        else {
          const o = J.i * 5,
            ins = S.ev[o + 4];
          if (ins < 0) trommel(M, F, S.ev[o], S.ev[o + 2], S.ev[o + 3], J.i);
          else stimme(M, F, S.ev[o], S.ev[o + 1], S.ev[o + 2], S.ev[o + 3], INS[S.ins[ins]], J.i);
          J.i++;
        }
      } else if (J.ph === 1) {
        // the reverb
        const e = Math.min(n, J.pos + SLICE);
        hall(M, F, J.pos, e);
        J.pos = e;
        if (e >= n) {
          J.ph = 2;
          J.pos = 0;
        }
      } else if (J.ph === 2) {
        // rumble out (a high-pass at 30 Hz), and how loud the piece is
        const e = Math.min(n, J.pos + SLICE),
          c = 1 - Math.exp((-TAU * 30) / SR);
        let lo = J.hp,
          sq = 0;
        for (let i = J.pos; i < e; i++) {
          lo += c * (M[i] - lo);
          const y = M[i] - lo;
          M[i] = y;
          sq += y * y;
        }
        J.hp = lo;
        J.sq += sq;
        J.pos = e;
        if (e >= n) {
          // (the loudness of the sounding part: the tail's silence does not count)
          const rms = Math.sqrt(J.sq / Math.max(1, n - 1.2 * SR));
          J.gain = rms > 1e-5 ? RMS / rms : 1;
          J.ph = 3;
          J.pos = 0;
        }
      } else if (J.ph === 3) {
        // every piece equally loud; peaks bent softly under the limit; a short fade at both ends
        const e = Math.min(n, J.pos + SLICE),
          g = J.gain,
          span = LIM - KNEE;
        for (let i = J.pos; i < e; i++) {
          let y = M[i] * g;
          const a = y < 0 ? -y : y;
          if (a > KNEE) y = (y < 0 ? -1 : 1) * (KNEE + span * Math.tanh((a - KNEE) / span));
          if (i < 240) y *= i / 240;
          else if (i > n - 2400) y *= (n - i) / 2400;
          M[i] = y;
        }
        J.pos = e;
        if (e >= n) {
          J.ph = 4;
          J.out = M;
        }
      } else return true;
      if (now() >= t1) return J.ph === 4;
    }
  }
  // all at once (tests, and wherever a wait does not matter): a copy
  function render(S) {
    const J = job(S);
    while (!step(J, 1000)) {}
    return new Float32Array(J.out);
  }
  function pegel(buf) {
    let sq = 0,
      pk = 0,
      dc = 0;
    for (let i = 0; i < buf.length; i++) {
      const y = buf[i];
      sq += y * y;
      dc += y;
      const a = y < 0 ? -y : y;
      if (a > pk) pk = a;
    }
    return { rms: Math.sqrt(sq / Math.max(1, buf.length)), peak: pk, dc: dc / Math.max(1, buf.length) };
  }
  const frei = () => {
    MIX = FXB = null;
    HALL = null;
    NOISE = null;
  };
  return { SR, RMS, LIM, STIL, BES, REP, INS, DR, song, kennung, tonart, job, step, render, pegel, frei, hash, rng };
})();
if (typeof window !== 'undefined') window.GLRMUSIK = GLRMUSIK;
