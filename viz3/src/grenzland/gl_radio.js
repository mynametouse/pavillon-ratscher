// ===================== feat/grenzland: the radio (GLRADIO) – stations to switch between as in GTA =====================
// Falko, 13.11.2026 1:14: „… und auch verschiedene Radiosender eingestellt werden können. Ähnlich wie bei GTA.“ Seven invented stations
// today, three in the flashback to 10 November 1989 (grenzland/gl_radio_data.js): each with its own music, its presenter, idents, adverts
// of invented firms, the news with the weather of the game, traffic, listeners on the phone, the true story „Sukiyaki in Suhl“ in parts,
// and the police report of the player's own deeds: a deed somebody saw is told at the next break (a piece that would run much longer is
// faded out for it), three stars and more interrupt the music with a special report.
// ton-radio (Falko 13.11. 23:02: „Das Radio klingt wirklich wie ein Kinderradio. Das müssen echte coole Songs sein.“ – free songs of real
// bands, no AI music): Radio Zweitakt, Funkloch FM, Neonfunk and the Kirmeswelle play the songs of the sound repository (GLMEDIEN,
// index.json of agent ton-musik) – shuffled, none again before all were played, tuned in mid-song; the presenter talks over a song's
// intro (ending ≥ 1 s before the first sung second) or its outro (after the last), a talk too long for that goes between the songs over a
// short bed cut from the station's own songs, as do the spoken idents; callers come through the phone's band; the reception hisses, drops
// out and turns mono in the forest and the ravine of the Klinge and far from a station's transmitter; tuning gives a burst of noise and the
// whistle of the dial; the speakers sound like a car's (stereo, a little warm and compressed), a phone's (mono, thin) or in 1989 like
// a portable set. The display shows „Titel – Interpret · Lizenz“, the station list (R held) the station's songs with their licences,
// the credits get „Musik im Radio“. No repository, no file, no connection: the station plays its synthesised pieces as before, quietly.
// The classical station plays the public-domain recordings of the record player (window.MUSICMAN) and its own piano pieces.
//   R            the next station (after the last: off) · Shift + R the one before · R held: the list stays open to pick from
//   the display  top centre for a few seconds: frequency, name, the dial with its needle, what is on; a tap opens the list
// Words are a line of their own above the subtitles (GLHUD.funk) and, where the player has the voices on, spoken: a recording of the words
// (window.VOICEX, agent ton-stimmen) through the radio's own speakers, else audio/stimme.js – not through a paid engine unless asked
// (GLRADIO.stimme). Everything hangs on its own gain under the game's music bus; nothing is built before a station is tuned, „Beenden“
// takes all of it away.
// Interface (the core's, kept): GLRADIO.stations() → [{ id, name, freq, art }] · cur() → id | null · tune(id | null) · next() · prev() ·
//   off() · era(e) · tick(dt) · stop(). More: now() → what is on · list(on) · stimme(on) · signal() · stand() (tests) · songs(id) → the
//   station's songs from the repository [{ id, titel, von, lizenz, lizenz_url, quelle }] · linien() (the fixed lines for the recordings) ·
//   melde(text | [texts], sofort) – a mission's own announcement, told at the next break (sofort: over the music, at once) · duck(on).
// Events: 'grenzland:radio' { id, name, freq }, 'grenzland:radio:sendung' { id, k, art, titel } (an item begins).
import { BASE, stage } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { HUD } from '../game/hud.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { WETTER } from '../wetter/wetter.js';
import { GLLOGIK } from './gl_logik.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLHUD } from './gl_hud.js';
import { GLMEDIEN } from './gl_medien.js';
import { GLRDATA } from './gl_radio_data.js';
import { GLRMUSIK } from './gl_radio_musik.js';
export const GLRADIO = (() => {
  const D = GLRDATA,
    M = GLRMUSIK,
    DS = D.DATEI_SENDER;
  const S = {
    id: null,
    sel: { heute: null, 1989: null },
    prog: {},
    item: null,
    over: null,
    pend: [],
    eil: '',
    busse: 0,
    maxS: 0,
    jobs: [],
    job: null,
    bufs: {},
    A: null,
    src: null,
    el: null,
    barT: 0,
    listOn: false,
    listT: 0,
    unlocked: false,
    speak: true,
    paid: false,
    said: 0,
    subMine: '',
    log: [],
    count: { musik: 0, wort: 0, datei: 0, fehler: 0, bett: 0, anruf: 0, outro: 0, intro: 0 },
    init: false,
    touched: false,
    rDown: 0,
    rHeld: false,
    rShift: false,
    pendNext: false,
    rTimer: 0,
    ctxMode: '',
    sig: 1,
    fadeT: 0,
    last: {},
    ui: null,
    voices: false,
    tuneT: 0,
    uhr: 0,
    sonder: [],
    weak: false,
    // ton-radio
    deck: null, // the song that plays from a file: { h, g, e, ct, ctT }
    bed: null, // a bed under words: { h, g, e, sek, t0, leise }
    vox: null, // a recorded line playing through the radio: { n, g }
    voxN: 0,
    bad: {}, // files that failed this session (id → true)
    rx: null, // what the reception was measured from
    rxT: 0,
    drop: 0, // a dropout: how long it still lasts
    dropT: 0,
    breite: 1, // stereo width 1 … 0 (mono when the reception is poor)
    pfiffe: 0, // whistles of the dial (tests)
    credits: '',
    medT: 0,
  };
  const era = () => (GL.era === '1989' ? '1989' : 'heute');
  const list = () => D.SENDER[era()];
  const stations = () => list().map(s => ({ id: s.id, name: s.name, freq: s.freq, art: s.art }));
  const cur = () => S.id;
  const sender = () => (S.id ? D.byId[S.id] : null);
  const raw = () => GLTON.raw();
  const posY = () => (VEH.cur && VEH.cur.st ? VEH.cur.st.y : P.y);
  const posX = () => (VEH.cur && VEH.cur.st ? VEH.cur.st.x : P.x);

  // ---------------- the songs of the sound repository ----------------
  const medOk = () => GLMEDIEN.stand() === 'ok';
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  function dateien(id) {
    if (!id || !DS.includes(id) || !medOk()) return [];
    return GLMEDIEN.liste(e => e.kind === 'musik' && e.sender === id && !S.bad[e.id]).sort(byId);
  }
  // a recorded line (ton-stimmen: window.VOICEX.lines { who, text, file, dur }) – who + words → its file and length
  const VXM = new Map();
  let VXN = -1;
  function aufnahme(who, text) {
    const L = (window.VOICEX && window.VOICEX.lines) || [];
    if (L.length !== VXN) {
      VXM.clear();
      for (const l of L) if (l && l.who && l.text && l.file) VXM.set(l.who + ':' + l.text, l);
      VXN = L.length;
    }
    const l = VXM.get(who + ':' + text);
    return l ? { url: BASE + 'snd/' + l.file, dur: +l.dur || 0 } : null;
  }
  // how long the words of an item take (the recordings' lengths where there are some)
  function dauerZ(it) {
    let t = 0;
    (it.zeilen || []).forEach((z, i) => {
      const wk = it.wer && it.wer[i],
        r = aufnahme(wk ? 'gl_r_anruf_' + wk : 'gl_r_' + S.id, z);
      t += (r && r.dur > 0.3 ? r.dur : D.dauer(z)) + 0.35;
    });
    return t;
  }

  // ---------------- sound: the chain under the music bus ----------------
  // music (synth pieces, files) → duck ─┐
  // words (recordings) → vox ───────────┼→ mix → speakers (car | phone | car of 1989 | portable, crossfaded) → width (mono when the
  // callers → tel → the phone's band ───┘   reception is poor) → sig (reception, dropouts) → out → music bus;  noise, the dial's whistle → out
  const MODES = {
    auto: { g: 0.62, hp: 55, warm: 2.5, lp: 12000, comp: true },
    handy: { g: 0.3, hp: 520, lp: 3600, mid: [1900, 3], mono: true },
    auto89: { g: 0.55, hp: 140, lp: 4800, warm: 1.5, mono: true },
    koffer: { g: 0.36, hp: 320, lp: 3300, mid: [1200, 2.5], mono: true },
  };
  const ROOM = () => (window.GLRAUM && typeof window.GLRAUM === 'object' ? window.GLRAUM : null);
  function kette(A, inp, M0) {
    const c = A.ctx;
    let n = inp;
    const nach = x => {
      n.connect(x);
      n = x;
      return x;
    };
    if (M0.mono) {
      const m = c.createGain();
      m.channelCount = 1;
      m.channelCountMode = 'explicit';
      m.channelInterpretation = 'speakers';
      nach(m);
    }
    const hp = nach(c.createBiquadFilter());
    hp.type = 'highpass';
    hp.frequency.value = M0.hp;
    hp.Q.value = 0.7;
    if (M0.warm) {
      const w = nach(c.createBiquadFilter());
      w.type = 'peaking';
      w.frequency.value = 240;
      w.Q.value = 0.8;
      w.gain.value = M0.warm;
    }
    if (M0.mid) {
      const p = nach(c.createBiquadFilter());
      p.type = 'peaking';
      p.frequency.value = M0.mid[0];
      p.Q.value = 1;
      p.gain.value = M0.mid[1];
    }
    const lp = nach(c.createBiquadFilter());
    lp.type = 'lowpass';
    lp.frequency.value = M0.lp;
    lp.Q.value = 0.6;
    if (M0.comp) {
      const k = nach(c.createDynamicsCompressor());
      k.threshold.value = -20;
      k.knee.value = 12;
      k.ratio.value = 2.5;
      k.attack.value = 0.012;
      k.release.value = 0.25;
    }
    return { out: n, lp };
  }
  // a speaker: GLRAUM.lautsprecher (agent ton-welt) where it is there and gives back its chain's end, else our own small chain
  function lautsprecher(A, inp, art) {
    const R = ROOM(),
      M0 = MODES[art],
      g = A.ctx.createGain();
    g.gain.value = M0.g;
    let out = null,
      lp = null;
    if (R && typeof R.lautsprecher === 'function' && art !== 'auto89')
      try {
        const o = R.lautsprecher(inp, art);
        if (o && typeof o.connect === 'function') out = o;
      } catch (e) {
        out = null;
      }
    if (!out) ({ out, lp } = kette(A, inp, M0));
    out.connect(g);
    return { g, lp, raum: !lp };
  }
  // the phone's band for the callers: GLRAUM.telefon where it is there, else 300–3400 Hz, a little grit and compression
  function telefon(A) {
    const R = ROOM();
    if (R && typeof R.telefon === 'function')
      try {
        const o = R.telefon(A.tel);
        if (o && typeof o.connect === 'function') return o;
      } catch (e) {}
    const c = A.ctx,
      k = kette(A, A.tel, { hp: 300, lp: 3400, mid: [1500, 4], mono: true }),
      ws = c.createWaveShaper(),
      cv = new Float32Array(1024);
    for (let i = 0; i < cv.length; i++) {
      const x = (i / (cv.length - 1)) * 2 - 1;
      cv[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
    }
    ws.curve = cv;
    const cp = c.createDynamicsCompressor();
    cp.threshold.value = -26;
    cp.ratio.value = 4;
    const g = c.createGain();
    g.gain.value = 0.9;
    k.out.connect(ws);
    ws.connect(cp);
    cp.connect(g);
    return g;
  }
  function chain() {
    const R = raw();
    if (!R) return null;
    if (S.A && S.A.ctx === R.ctx) return S.A;
    const c = R.ctx,
      A = { ctx: c, last: {} };
    A.duck = c.createGain();
    A.vox = c.createGain();
    A.tel = c.createGain();
    A.mix = c.createGain();
    A.duck.connect(A.mix);
    A.vox.connect(A.mix);
    telefon(A).connect(A.mix);
    A.lsp = c.createGain();
    A.lsp.channelCount = 2;
    A.lsp.channelCountMode = 'explicit';
    A.lsp.channelInterpretation = 'speakers';
    A.spk = {};
    for (const art of Object.keys(MODES)) {
      const inp = c.createGain(),
        l = lautsprecher(A, inp, art),
        sw = c.createGain();
      sw.gain.value = 0;
      A.mix.connect(inp);
      l.g.connect(sw);
      sw.connect(A.lsp);
      A.spk[art] = { inp, sw, lp: l.lp, raum: l.raum };
    }
    // the width: L' = a·L + b·R, R' = a·R + b·L (a = (1 + w) / 2, b = (1 − w) / 2) – w 0 is mono
    const sp = c.createChannelSplitter(2),
      mg = c.createChannelMerger(2);
    A.w = { ll: c.createGain(), lr: c.createGain(), rl: c.createGain(), rr: c.createGain() };
    A.lsp.connect(sp);
    sp.connect(A.w.ll, 0);
    A.w.ll.connect(mg, 0, 0);
    sp.connect(A.w.rl, 1);
    A.w.rl.connect(mg, 0, 0);
    sp.connect(A.w.rr, 1);
    A.w.rr.connect(mg, 0, 1);
    sp.connect(A.w.lr, 0);
    A.w.lr.connect(mg, 0, 1);
    A.w.lr.gain.value = A.w.rl.gain.value = 0;
    A.sig = c.createGain();
    mg.connect(A.sig);
    A.out = c.createGain();
    A.out.gain.value = 0;
    A.sig.connect(A.out);
    A.out.connect(R.mus || R.sfx);
    // the noise between and under the stations: a second of white noise, looped, band-passed
    const nb = c.createBuffer(1, Math.round(c.sampleRate), c.sampleRate),
      d = nb.getChannelData(0);
    let s = 4711;
    for (let i = 0; i < d.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      d[i] = (s >>> 8) / 8388608 - 1;
    }
    A.nz = c.createBufferSource();
    A.nz.buffer = nb;
    A.nz.loop = true;
    A.nzF = c.createBiquadFilter();
    A.nzF.type = 'bandpass';
    A.nzF.frequency.value = 2400;
    A.nzF.Q.value = 0.4;
    A.nzG = c.createGain();
    A.nzG.gain.value = 0;
    A.nz.connect(A.nzF);
    A.nzF.connect(A.nzG);
    A.nzG.connect(A.out);
    A.nz.start();
    S.A = A;
    S.ctxMode = '';
    S.breite = 1;
    return A;
  }
  function unchain() {
    const A = S.A;
    S.A = null;
    if (!A) return;
    try {
      A.out.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05);
      setTimeout(() => {
        try {
          A.nz.stop();
          A.out.disconnect();
        } catch (e) {}
      }, 400);
    } catch (e) {}
  }
  // an automation target only when it changes (an event every frame would pile up)
  function ziel(A, k, p, v, tau) {
    if (A.last[k] !== undefined && Math.abs(A.last[k] - v) < 1e-4) return;
    A.last[k] = v;
    p.setTargetAtTime(v, A.ctx.currentTime, tau);
  }
  // where the radio plays: a car's speakers, the phone (on foot, on the moped), in 1989 the car's set or a portable one
  const mode = () => {
    const car = VEH.cur && VEH.cur.id !== 'gl-moped';
    return era() === '1989' ? (car ? 'auto89' : 'koffer') : car ? 'auto' : 'handy';
  };
  // reception 0 … 1 (grenzland/gl_radio_data.js empfang): the transmitter's distance, the forest and the Klinge by the place's name, a
  // hollow by the ground against its surroundings (130 m around) – measured twice a second
  function messen() {
    let x = posX(),
      y = posY();
    try {
      const w = KERN.where ? KERN.where() : null;
      if (!VEH.cur && w && Number.isFinite(w[0])) [x, y] = w;
    } catch (e) {}
    const o = { x, y, ort: '', h: NaN, um: NaN };
    try {
      o.ort = KERN.place(x, y) || '';
    } catch (e) {}
    try {
      if (KERN.terrain) {
        o.h = KERN.terrain(x, y);
        let su = 0;
        for (let i = 0; i < 8; i++)
          su += KERN.terrain(x + 130 * Math.cos((i * Math.PI) / 4), y + 130 * Math.sin((i * Math.PI) / 4));
        o.um = su / 8;
      }
    } catch (e) {
      o.h = o.um = NaN;
    }
    S.rx = o;
  }
  function signal() {
    const s = sender();
    if (!s) return 1;
    if (!S.rx || S.rxT <= 0) {
      messen();
      S.rxT = 0.5;
    }
    return D.empfang(s, Object.assign({}, S.rx, { t: S.fadeT }));
  }
  function breite(A, w) {
    const a = (1 + w) / 2,
      b = (1 - w) / 2;
    ziel(A, 'll', A.w.ll.gain, a, 0.25);
    ziel(A, 'rr', A.w.rr.gain, a, 0.25);
    ziel(A, 'lr', A.w.lr.gain, b, 0.25);
    ziel(A, 'rl', A.w.rl.gain, b, 0.25);
  }
  function mixTick(dt) {
    const A = S.A;
    if (!A) return;
    const m = mode();
    if (m !== S.ctxMode) {
      S.ctxMode = m;
      for (const [k, q] of Object.entries(A.spk)) ziel(A, 'spk' + k, q.sw.gain, k === m ? 1 : 0, 0.08);
    }
    const sg = S.sig;
    const lade = !S.item || S.item.k === 'lade';
    // (somebody in the world is speaking – a talk's subtitle is up: the radio steps back, as it does in GTA)
    const talk = (GLHUD.funk && GLHUD.subT > 0.1) || S.duckOn; // (or a recorded voice speaks: GLSTIMMEN calls duck)
    // short dropouts where the reception is poor – the poorer, the more often
    if (S.drop > 0) S.drop -= dt;
    else if (S.id && sg < 0.5) {
      S.dropT -= dt;
      if (S.dropT <= 0) {
        S.dropT = 0.5 + Math.random() * 2.6 * ((sg + 0.15) / 0.65);
        if (Math.random() < (0.5 - sg) * 2.2) S.drop = 0.07 + Math.random() * 0.3;
      }
    }
    const dr = S.drop > 0;
    ziel(A, 'out', A.out.gain, S.id ? (talk ? 0.4 : 1) : 0, 0.12);
    ziel(A, 'sig', A.sig.gain, (0.1 + 0.9 * sg * sg) * (dr ? 0.05 : 1), dr ? 0.012 : 0.12);
    ziel(
      A,
      'nz',
      A.nzG.gain,
      S.id ? (1 - sg) * 0.12 + (lade ? 0.035 : 0) + (S.tuneT > 0 ? 0.12 : 0) + (dr ? 0.07 : 0) : 0,
      0.03
    );
    ziel(A, 'duck', A.duck.gain, S.over ? 0.18 : 1, 0.18);
    // the stereo collapses to mono when the reception is poor
    const w = Math.max(0, Math.min(1, (sg - 0.3) / 0.45));
    if (Math.abs(w - S.breite) > 0.02 || A.last.ll === undefined) {
      S.breite = w;
      breite(A, w);
    }
    if (S.tuneT > 0) S.tuneT -= dt;
  }
  // the dial between the stations: a short burst of noise and the whistle of a carrier sweeping past
  function pfeif() {
    const A = S.A;
    if (!A || A.ctx.state !== 'running') return;
    try {
      const c = A.ctx,
        t = c.currentTime + 0.01,
        o = c.createOscillator(),
        g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(3400 + Math.random() * 1100, t);
      o.frequency.exponentialRampToValueAtTime(380 + Math.random() * 260, t + 0.34);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g);
      g.connect(A.out);
      o.start(t);
      o.stop(t + 0.45);
      o.onended = () => {
        try {
          g.disconnect();
        } catch (e) {}
      };
      S.pfiffe++;
    } catch (e) {}
  }
  function stopDeck(D0, fade = 0.12) {
    if (!D0) return;
    const A = S.A;
    try {
      if (A) {
        D0.g.gain.cancelScheduledValues(A.ctx.currentTime);
        D0.g.gain.setTargetAtTime(0, A.ctx.currentTime, Math.max(0.01, fade / 3));
      }
    } catch (e) {}
    setTimeout(
      () => {
        try {
          D0.h.stop();
          D0.g.disconnect();
        } catch (e) {}
      },
      fade * 1000 + 250
    );
  }
  function stopSrc(fade = 0.12) {
    const A = S.A,
      src = S.src;
    S.src = null;
    if (src && A) {
      try {
        src.g.gain.setTargetAtTime(0, A.ctx.currentTime, fade / 3);
        setTimeout(
          () => {
            try {
              src.n.stop();
              src.g.disconnect();
            } catch (e) {}
          },
          fade * 1000 + 250
        );
      } catch (e) {}
    }
    if (S.el) {
      try {
        S.el.a.pause();
      } catch (e) {}
    }
    if (S.deck) {
      stopDeck(S.deck, fade);
      S.deck = null;
    }
  }
  function stopVox() {
    S.voxN++;
    if (!S.vox) return;
    try {
      S.vox.n.onended = null;
      S.vox.n.stop();
      S.vox.g.disconnect();
    } catch (e) {}
    S.vox = null;
  }
  // play a rendered piece (a Float32Array at GLRMUSIK.SR) from `off` seconds
  function playBuf(buf, off = 0) {
    const A = chain();
    if (!A || !buf) return;
    stopSrc();
    const n = A.ctx.createBufferSource(),
      g = A.ctx.createGain();
    n.buffer = buf;
    n.connect(g);
    g.connect(A.duck);
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(1, A.ctx.currentTime, off > 0 ? 0.12 : 0.01);
    n.start(A.ctx.currentTime + 0.02, Math.max(0, off));
    S.src = { n, g };
  }
  const toBuf = out => {
    const A = chain();
    if (!A) return null;
    const b = A.ctx.createBuffer(1, out.length, M.SR);
    b.getChannelData(0).set(out);
    return b;
  };
  // a song of the sound repository from `off` seconds: streamed through a media element of GLMEDIEN's pool, the one before fades out
  function playDatei(e, off) {
    const A = chain();
    if (!A) return false;
    stopSrc(0.7);
    const g = A.ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(A.duck);
    const h = GLMEDIEN.stream(e.id, g, { ab: off });
    if (!h) {
      try {
        g.disconnect();
      } catch (x) {}
      return false;
    }
    g.gain.setTargetAtTime(1, A.ctx.currentTime + 0.02, off > 0 ? 0.25 : 0.03);
    const D0 = { h, g, e, ct: -1, ctT: performance.now() };
    S.deck = D0;
    S.count.datei++;
    h.ende.then(ok => {
      if (S.deck !== D0 || h.aus) return;
      if (!ok) dateiFehler(D0);
      else if (S.item && S.item.datei === e) S.item.left = Math.min(S.item.left, 0.3);
    });
    return true;
  }
  // a file that does not play (missing, no connection, stalled): the station's own synthesised piece instead, quietly
  function dateiFehler(D0) {
    S.bad[D0.e.id] = true;
    S.count.fehler++;
    if (S.deck === D0) {
      stopDeck(D0, 0.05);
      S.deck = null;
    }
    if (S.item && S.item.datei === D0.e) {
      const i = S.item.i;
      S.item = null;
      startMusik({ k: 'musik', i }, true, { synth: true });
    }
  }
  // a bed under words: a few seconds of one of the station's own songs, a loud moment without singing (gl_radio_data.js bett)
  function bettAn(dz) {
    const A = chain(),
      f = dateien(S.id);
    if (!A || !f.length) return false;
    const now = S.deck ? S.deck.e.id : '',
      last = S.item && S.item.datei ? S.item.datei.id : '',
      cand = f.filter(e => e.id !== now && e.id !== last),
      e = (cand.length ? cand : f)[Math.floor(prog(S.id).rnd() * (cand.length || f.length))],
      b = D.bett(e, dz);
    bettAus(0.2);
    const g = A.ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(A.mix);
    const h = GLMEDIEN.stream(e.id, g, { ab: b.ab });
    if (!h) {
      try {
        g.disconnect();
      } catch (x) {}
      return false;
    }
    g.gain.setTargetAtTime(0.8, A.ctx.currentTime + 0.02, 0.06);
    S.bed = { h, g, e, sek: b.sek, ab: b.ab, t0: performance.now(), leise: false };
    S.count.bett++;
    h.ende.then(ok => {
      if (!ok && S.bed && S.bed.h === h) bettAus(0.1);
    });
    return true;
  }
  function bettLeise() {
    const A = S.A,
      B = S.bed;
    if (!A || !B || B.leise) return;
    B.leise = true;
    B.g.gain.setTargetAtTime(0.3, A.ctx.currentTime, 0.12);
  }
  function bettAus(fade = 0.7) {
    const B = S.bed;
    S.bed = null;
    if (B) stopDeck(B, fade);
  }
  // a public-domain recording of the record player's shelf, as the classical station's programme: the first minute and a quarter
  function playRec(rec) {
    const A = chain();
    if (!A) return false;
    stopSrc();
    try {
      if (!S.el) {
        const a = new Audio();
        a.preload = 'auto';
        a.crossOrigin = 'anonymous';
        const node = A.ctx.createMediaElementSource(a);
        node.connect(A.duck);
        S.el = { a, node, ctx: A.ctx };
        a.addEventListener('error', () => {
          if (S.item && S.item.rec) S.item.left = Math.min(S.item.left, 0.5);
        });
      } else if (S.el.ctx !== A.ctx) return false;
      S.el.a.src = BASE + 'snd/music/' + rec.file;
      S.el.a.currentTime = 0;
      S.el.a.volume = 1;
      const p = S.el.a.play();
      if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }
  // a recorded line through the radio's own speakers (callers through the phone's band); resolves when it is over (false: none)
  function spiele(rec, tel) {
    const A = chain();
    if (!A) return Promise.resolve(false);
    const tag = ++S.voxN;
    return GLMEDIEN.buffer({ url: rec.url }).then(b => {
      if (!b || S.A !== A || tag !== S.voxN || !S.id) return false;
      const n = A.ctx.createBufferSource(),
        g = A.ctx.createGain();
      n.buffer = b;
      n.connect(g);
      g.connect(tel ? A.tel : A.vox);
      n.start(A.ctx.currentTime + 0.02);
      S.vox = { n, g };
      return new Promise(res => {
        n.onended = () => {
          try {
            g.disconnect();
          } catch (e) {}
          if (S.vox && S.vox.n === n) S.vox = null;
          res(true);
        };
      });
    });
  }

  // ---------------- rendering pieces in slices ----------------
  // jobs: { key, song, then } – one at a time (the synthesiser has one pair of work buffers)
  function want(key, song, then) {
    if (S.bufs[key]) return then && then(S.bufs[key]);
    const j = S.jobs.find(q => q.key === key) || (S.job && S.job.key === key ? S.job : null);
    if (j) {
      if (then) j.then = then;
      return;
    }
    S.jobs.push({ key, song, then });
  }
  function jobTick() {
    if (!raw()) return;
    if (!S.job && S.jobs.length) {
      S.job = S.jobs.shift();
      S.job.J = M.job(S.job.song);
    }
    const j = S.job;
    if (!j) return;
    // (generous while the listener waits for the first piece, small otherwise)
    if (!M.step(j.J, S.item && S.item.k === 'lade' ? 9 : 3)) return;
    S.job = null;
    const b = toBuf(j.J.out);
    if (!b) return;
    // keep few: a piece is ~7 MB
    for (const k of Object.keys(S.bufs))
      if (Object.keys(S.bufs).length >= 3 && k !== j.key && !(S.item && S.item.key === k)) delete S.bufs[k];
    S.bufs[j.key] = b;
    if (j.then) j.then(b);
  }

  // ---------------- the programme ----------------
  const prog = id => S.prog[id] || (S.prog[id] = D.PROG.neu(id, M.hash(id)));
  const recs = () =>
    S.id === 'klassik' && Array.isArray(window.MUSICMAN) ? window.MUSICMAN.filter(r => r && r.file) : [];
  const synthN = id => (M.REP[id] ? M.REP[id].length : 1) + (id === 'klassik' ? recs().length : 0);
  const songs = id => dateien(id).length || synthN(id);
  function ctxOf() {
    // (what happened more than ten minutes ago is no news)
    for (let i = S.pend.length - 1; i >= 0; i--) if (S.uhr - S.pend[i].t > 600) S.pend.splice(i, 1);
    return {
      taten: S.pend,
      sterne: GL.W ? starsNow() : 0,
      bekannt: !!(GL.W && GL.W.known),
      eil: S.eil,
      busse: S.busse,
      w: WETTER && WETTER.S ? WETTER.S.w : null,
      min: CLOCK.t,
      songs: songs(S.id),
      misch: dateien(S.id).length > 0,
      last: S.last[S.id] || null,
    };
  }
  const starsNow = () => GLLOGIK.stars(GL.W);
  const note = (k, art, text) => {
    S.log.push({ id: S.id, k, art, text });
    if (S.log.length > 24) S.log.shift();
  };
  // which piece a music item is: a song of the repository where the station has some; on the classical station the recordings take
  // turns with the house's own piano pieces; else the station's own synthesised piece
  function pieceOf(id, i, synth) {
    const f = synth ? [] : dateien(id);
    if (f.length) {
      const e = f[((i % f.length) + f.length) % f.length];
      return {
        datei: e,
        titel: e.title || e.id,
        von: e.author || '',
        lic: e.licence || '',
        dauer: e.sec > 5 ? e.sec : 180,
        key: 'datei:' + e.id,
      };
    }
    if (id === 'klassik') {
      const rc = recs();
      if (rc.length && i % 2 === 0) {
        const rec = rc[(i / 2) % rc.length];
        return { rec, titel: rec.title || rec.file, von: rec.by || '', dauer: 76 };
      }
      i = Math.floor(i / 2);
    }
    const s = M.song(id, ((i % M.REP[id].length) + M.REP[id].length) % M.REP[id].length);
    return { song: s, key: id + ':' + s.i, titel: s.titel, von: s.von, dauer: s.dauer - 1.2 };
  }
  function startMusik(it, mid, o = {}) {
    // the repository is still being asked (the first station of a session): noise for a moment, then its song or the station's own piece
    const ms = GLMEDIEN.stand();
    if (!o.synth && DS.includes(S.id) && (ms === 'laedt' || ms === '')) {
      GLMEDIEN.index();
      S.item = {
        k: 'lade',
        warte: 'index',
        i: it.i,
        mid: !!mid,
        titel: '',
        von: '',
        t0: performance.now(),
        dauer: 0,
        off: 0,
      };
      show();
      return;
    }
    const p = pieceOf(S.id, it.i, o.synth);
    S.last[S.id] = { titel: p.titel, von: p.von };
    S.count.musik++;
    note('musik', '', p.titel);
    GL.emit('radio:sendung', { id: S.id, k: 'musik', art: '', titel: p.titel });
    if (p.datei) {
      const off = mid ? D.mitte(p.dauer, CLOCK.t * 60, M.hash(S.id)) : 0;
      const base = {
        k: 'musik',
        datei: p.datei,
        titel: p.titel,
        von: p.von,
        lic: p.lic,
        left: p.dauer - off,
        dauer: p.dauer,
        key: p.key,
        i: it.i,
        ab: off,
      };
      if (!raw()) S.item = Object.assign(base, { stumm: true });
      else if (playDatei(p.datei, off)) S.item = base;
      else {
        S.count.musik--;
        return startMusik(it, mid, { synth: true });
      }
    } else if (p.rec) {
      playRec(p.rec);
      S.item = {
        k: 'musik',
        rec: p.rec,
        titel: p.titel,
        von: p.von,
        left: p.dauer,
        dauer: p.dauer,
        i: it.i,
        stumm: !raw(),
      };
    } else {
      const off = mid ? p.dauer * (0.25 + 0.4 * prog(S.id).rnd()) : 0;
      if (!raw())
        S.item = {
          k: 'musik',
          titel: p.titel,
          von: p.von,
          left: p.dauer - off,
          dauer: p.dauer,
          key: p.key,
          i: it.i,
          stumm: true,
          synth: !!o.synth,
        };
      else {
        // not rendered yet: noise until it is (a second or two after tuning in)
        S.item = {
          k: 'lade',
          titel: p.titel,
          von: p.von,
          key: p.key,
          dauer: p.dauer,
          off,
          t0: performance.now(),
          synth: !!o.synth,
          i: it.i,
        };
        const id = S.id;
        want(p.key, p.song, buf => {
          if (S.id !== id || !S.item || S.item.key !== p.key || S.item.k !== 'lade') return;
          playBuf(buf, off);
          S.item = {
            k: 'musik',
            titel: p.titel,
            von: p.von,
            left: p.dauer - off,
            dauer: p.dauer,
            key: p.key,
            i: it.i,
            synth: !!o.synth,
          };
          show();
        });
      }
    }
    show();
    ahead();
  }
  // the next item is decided when this one begins, so that its music can be rendered (or its file preloaded) meanwhile
  function ahead() {
    const st = prog(S.id);
    if (st.vor) return;
    const c = ctxOf();
    c.taten = null;
    c.eil = '';
    st.vor = D.PROG.next(st, c);
    if (st.vor.k === 'musik' && raw()) {
      const p = pieceOf(S.id, st.vor.i);
      if (p.datei) GLMEDIEN.vorlade(p.datei.id);
      else if (p.song) want(p.key, p.song);
    }
    if (raw() && !dateien(S.id).length && !S.bufs['kenn:' + S.id]) want('kenn:' + S.id, M.kennung(S.id));
  }
  // what the radio says: the panel's own line for it (above the subtitles), else a subtitle
  const zeile = (name, text, ms) => (GLHUD.funk ? GLHUD.funk(name, text, ms) : GLHUD.sub(name, text, ms));
  function still() {
    if (GLHUD.funk) GLHUD.funk('', '');
    else if (GLHUD.subT > 0 && S.subMine && GLHUD.subEl && GLHUD.subEl.textContent.endsWith(S.subMine))
      GLHUD.subT = 0.01;
    S.subMine = '';
  }
  // read aloud? Not through an engine that costs credit unless asked, not while a mission runs or somebody in the world is
  // speaking (the story's voices come first – the radio then shows its words only), not in a test
  const speakOk = (text, who) =>
    S.speak &&
    (S.paid || STIMME.engineName !== 'eleven') &&
    !GL.cur &&
    !(GLHUD.subT > 0.2) &&
    STIMME.speaks(who, text) &&
    !window.FREEZE;
  function sayLine(W) {
    // (without the panel's own line for the radio: wait a few seconds while somebody in the world is speaking)
    const other =
      !GLHUD.funk && GLHUD.subT > 0.3 && GLHUD.subEl && !(S.subMine && GLHUD.subEl.textContent.endsWith(S.subMine));
    if (other && (W.defer = (W.defer || 0) + 1) < 8) {
      W.left = 1;
      W.li--;
      return;
    }
    const text = W.it.zeilen[W.li],
      s = sender(),
      wk = (W.it.wer && W.it.wer[W.li]) || '',
      who = wk ? 'gl_r_anruf_' + wk : 'gl_r_' + S.id,
      an = wk ? D.ANRUFER[wk] : null,
      rec = aufnahme(who, text);
    W.left = (rec && rec.dur > 0.3 ? rec.dur : D.dauer(text)) + 0.35;
    W.max = W.left * 1.7 + 4;
    W.busy = false;
    zeile(an ? s.name + ' · ' + an.name + ' am Telefon' : s.name, text, W.left * 1000);
    S.subMine = text;
    note('wort', W.it.art, text);
    if (W.bett) bettLeise();
    const tag = ++S.said;
    const geraet = () => {
      if (!speakOk(text, who)) return false;
      W.busy = true;
      Promise.resolve(STIMME.say(who, text))
        .catch(() => false)
        .then(() => {
          if (S.said === tag) W.busy = false;
        });
      return true;
    };
    // a recording of these words plays through the radio's speakers (also in a mission: it is ducked with the radio)
    if (rec && S.speak && raw() && !(GLHUD.subT > 0.2)) {
      W.busy = true;
      spiele(rec, !!wk).then(ok => {
        if (S.said !== tag) return;
        if (ok) W.busy = false;
        else if (!geraet()) W.busy = false;
      });
    } else geraet();
  }
  function startWort(it, over, o = {}) {
    const W = { k: 'wort', it, li: 0, left: 0, max: 0, busy: false, hold: 0, art: it.art };
    S.count.wort++;
    if (it.art === 'anruf') S.count.anruf++;
    GL.emit('radio:sendung', { id: S.id, k: 'wort', art: it.art, titel: '' });
    if (over) S.over = W;
    else {
      stopSrc(0.5);
      S.item = W;
      // an ident: the presenter over a few seconds of the station's own songs – or, without them, the synthesised ident before the claim
      const f = dateien(S.id);
      if ((it.kenn || o.bett) && f.length && raw() && bettAn(dauerZ(it))) {
        W.hold = it.kenn ? 1.1 : 0.7;
        W.bett = true;
      } else if (it.kenn && S.bufs['kenn:' + S.id]) {
        playBuf(S.bufs['kenn:' + S.id]);
        W.hold = 2.6;
      }
      ahead();
    }
    if (!W.hold) sayLine(W);
    show();
  }
  // a spoken item's clock; true when it is over
  function wortTick(W, dt) {
    if (W.hold > 0) {
      W.hold -= dt;
      if (W.hold <= 0) sayLine(W);
      return false;
    }
    W.left -= dt;
    W.max -= dt;
    if (W.left > 0 || (W.busy && W.max > 0)) return false;
    W.li++;
    if (W.li >= W.it.zeilen.length) {
      if (W.it.ende) GL.emit('radio:feature', { id: 'sushi' });
      if (W.bett) bettAus(0.8);
      return true;
    }
    sayLine(W);
    return false;
  }
  function advance() {
    const st = prog(S.id),
      c = ctxOf();
    let it = null;
    if (S.sonder.length) it = { k: 'wort', art: 'eil', zeilen: [].concat(S.sonder.shift()) };
    else if (c.eil || (c.taten && c.taten.length)) it = D.PROG.next(st, c);
    else {
      it = st.vor || D.PROG.next(st, c);
      st.vor = null;
    }
    if (it.taten) S.pend.length = 0;
    if (it.eil) S.eil = '';
    if (it.k === 'musik') return startMusik(it);
    // the presenter talks into the beginning of the next piece, the music ducks under the words – over a song of the repository only
    // where the talk ends a second before the singing begins; longer talks go between the songs over a short bed
    if (it.art === 'mod' || it.art === 'gruss') {
      c.taten = null;
      c.eil = '';
      const nx = D.PROG.next(st, c);
      if (nx.k === 'musik') {
        const p = pieceOf(S.id, nx.i);
        if (p.datei && D.fenster(p.datei, dauerZ(it)).passt !== 'intro') {
          st.vor = nx;
          GLMEDIEN.vorlade(p.datei.id);
          return startWort(it, false, { bett: true });
        }
        startMusik(nx);
        if (p.datei) S.count.intro++;
        return startWort(it, true);
      }
      st.vor = nx;
    }
    startWort(it);
  }

  // ---------------- tuning ----------------
  function voices() {
    if (S.voices) return;
    S.voices = true;
    try {
      for (const e of Object.keys(D.SENDER))
        for (const s of D.SENDER[e]) STIMME.person('gl_r_' + s.id, Object.assign({}, s.wer));
      for (const [k, v] of Object.entries(D.ANRUFER)) STIMME.person('gl_r_anruf_' + k, Object.assign({}, v));
    } catch (e) {}
  }
  function tune(id, o = {}) {
    const lst = list(),
      s = id ? lst.find(q => q.id === id) : null;
    if (id && (!s || !GL.on)) return false;
    S.touched = true;
    const was = S.id;
    stopSrc(0.1);
    bettAus(0.1);
    stopVox();
    if (S.said && was) {
      S.said++;
      if (S.item && S.item.busy) STIMME.stop();
    }
    S.item = null;
    S.over = null;
    S.jobs.length = 0;
    S.job = null;
    S.id = s ? s.id : null;
    S.sel[era()] = S.id;
    if (era() === 'heute') {
      GL.radio = s ? lst.indexOf(s) + 1 : 0;
      GL.save();
    }
    still();
    if (s) {
      voices();
      if (DS.includes(s.id)) {
        GLMEDIEN.index();
        // (inside the key press or the tap that tuned: the media elements may play on a phone from now on)
        GLMEDIEN.wecken();
      }
      chain();
      S.rx = null;
      S.sig = signal();
      S.tuneT = 0.4;
      if (was !== S.id && !o.quiet) pfeif();
      // one lands in the middle of the programme: a piece that is already running
      const st = prog(S.id);
      st.vor = null;
      const n = songs(S.id);
      st.song = dateien(S.id).length ? D.PROG.mische(st, n) : (st.song + 1) % n;
      startMusik({ k: 'musik', i: st.song }, true);
    } else {
      S.bufs = {};
      S.job = null;
      if (S.A) mixTick(0);
    }
    if (!o.quiet) show(true);
    if (S.listOn) {
      listFill();
      S.listT = 7;
    }
    GL.emit('radio', { id: S.id, name: s ? s.name : '', freq: s ? s.freq : '' });
    return true;
  }
  function stepBy(d) {
    const lst = list(),
      i = S.id ? lst.findIndex(q => q.id === S.id) : -1,
      n = lst.length + 1,
      j = ((((i < 0 ? (d > 0 ? -1 : lst.length) : i) + d) % n) + n) % n;
    tune(j < lst.length ? lst[j].id : null);
  }
  // R: the mode module calls next() on the key's way down; a key held opens the list instead, so the step waits for the key's way up
  function next() {
    if (S.rDown && performance.now() - S.rDown < 80) {
      S.pendNext = true;
      return;
    }
    stepBy(1);
  }
  const prev = () => stepBy(-1);
  window.addEventListener(
    'keydown',
    e => {
      if (!GL.on) return;
      const k = e.key.toLowerCase();
      if (k === 'escape' && S.listOn) {
        listShow(false);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (k !== 'r' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      S.rDown = performance.now();
      S.rHeld = false;
      S.rShift = e.shiftKey;
      S.pendNext = false;
      clearTimeout(S.rTimer);
      S.rTimer = setTimeout(() => {
        if (!S.rDown || !S.pendNext) return;
        S.rHeld = true;
        S.pendNext = false;
        listShow(true);
      }, 420);
    },
    true
  );
  window.addEventListener('keyup', e => {
    if (e.key.toLowerCase() !== 'r' || !S.rDown) return;
    S.rDown = 0;
    clearTimeout(S.rTimer);
    if (S.pendNext && !S.rHeld && GL.on) stepBy(S.rShift ? -1 : 1);
    S.pendNext = false;
  });

  // ---------------- the display ----------------
  const CSS = `
#glradio{position:absolute;left:calc(50% - 64px);top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:6;width:min(330px,78vw);
  background:rgba(12,15,19,.82);color:#f2f0e6;border-radius:12px;padding:8px 12px 9px;font:400 12px/1.3 var(--f-body,system-ui);
  backdrop-filter:blur(5px);pointer-events:auto;user-select:none;cursor:pointer;transition:opacity .35s;box-shadow:0 4px 18px rgba(0,0,0,.35)}
#glradio[hidden]{display:none!important} #glradio.aus{opacity:0;pointer-events:none}
#glradio .rt{display:flex;align-items:baseline;gap:8px}
#glradio .rf{font:700 20px/1 var(--f-mono,monospace);color:#ffb648;letter-spacing:.02em;text-shadow:0 0 9px rgba(255,160,40,.5)}
#glradio .rf small{font:500 10px/1 var(--f-mono,monospace);opacity:.75;margin-left:3px}
#glradio .rn{font:700 15px/1.15 var(--f-body,system-ui);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#glradio .rs{font:600 9px/1 var(--f-mono,monospace);letter-spacing:.12em;opacity:.7}
#glradio .rd{position:relative;height:17px;margin:7px 0 4px;border-radius:3px;background:linear-gradient(#20262d,#161a1f);overflow:hidden}
#glradio .rd i{position:absolute;top:9px;bottom:0;width:1px;background:rgba(255,255,255,.28)}
#glradio .rd i.s{top:2px;width:2px;background:#ffb648;opacity:.55} #glradio .rd i.on{opacity:1;box-shadow:0 0 6px #ffb648}
#glradio .rd u{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#ff4f3a;box-shadow:0 0 6px #ff4f3a;transition:left .45s cubic-bezier(.3,1.4,.5,1)}
#glradio .rw{min-height:15px;font:500 12px/1.3 var(--f-body,system-ui);opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#glradio .rw b{color:#ffb648;font-weight:600;margin-right:5px}
#glradio .rw em{font-style:normal;font:600 9.5px/1 var(--f-mono,monospace);letter-spacing:.04em;color:#cfe3c0;background:rgba(160,220,140,.14);border-radius:3px;padding:1px 4px;margin-left:6px;vertical-align:1px}
#glradio .rl{margin-top:7px;border-top:1px solid rgba(255,255,255,.14);padding-top:5px;display:none}
#glradio.liste .rl{display:block}
#glradio .rl button{display:flex;width:100%;gap:9px;align-items:baseline;text-align:left;border:0;background:none;color:inherit;padding:6px 5px;border-radius:7px;
  font:500 13px/1.2 var(--f-body,system-ui);cursor:pointer}
#glradio .rl button:hover{background:rgba(255,255,255,.1)} #glradio .rl button[aria-current="true"]{background:rgba(255,182,72,.2)}
#glradio .rl button span{font:600 12px/1 var(--f-mono,monospace);color:#ffb648;min-width:42px}
#glradio .rl button small{opacity:.65;font-size:11px;margin-left:auto;white-space:nowrap}
#glradio .rh{margin-top:4px;font:500 10px/1.3 var(--f-body,system-ui);opacity:.6}
#glradio .rq{margin:4px 0 2px;padding:5px 6px;border-radius:7px;background:rgba(255,255,255,.05);max-height:min(30vh,190px);overflow:auto;cursor:default}
#glradio .rq p{margin:0 0 3px;font:600 10px/1.2 var(--f-body,system-ui);letter-spacing:.06em;text-transform:uppercase;opacity:.65}
#glradio .rq ol{margin:0;padding:0 0 0 18px} #glradio .rq li{font:500 11px/1.35 var(--f-body,system-ui);margin:0 0 1px}
#glradio .rq li small{opacity:.6;margin-left:5px;white-space:nowrap} #glradio .rq li.on{color:#ffb648}
/* 1989: a set of the time – a cream dial behind glass, bakelite brown */
body[data-gl-era="1989"] #glradio{background:linear-gradient(#4a3a2c,#33271d);color:#f3e7c9;border:1px solid #6d5843;border-radius:6px}
body[data-gl-era="1989"] #glradio .rf{color:#f3e7c9;text-shadow:none;font-family:Georgia,serif}
body[data-gl-era="1989"] #glradio .rn{font-family:Georgia,serif}
body[data-gl-era="1989"] #glradio .rd{background:linear-gradient(#efe2bd,#d8c796);height:20px}
body[data-gl-era="1989"] #glradio .rd i{background:rgba(60,40,20,.5)} body[data-gl-era="1989"] #glradio .rd i.s{background:#7a2a1c}
body[data-gl-era="1989"] #glradio .rd i.on{box-shadow:none} body[data-gl-era="1989"] #glradio .rd u{background:#b3261a;box-shadow:none}
body[data-gl-era="1989"] #glradio .rw b,body[data-gl-era="1989"] #glradio .rl button span{color:#f0c56a}
@media (max-width:1000px){#glradio{left:50%;top:calc(58px + env(safe-area-inset-top,0px))}}
@media (max-width:720px){#glradio{top:calc(104px + env(safe-area-inset-top,0px));width:min(320px,92vw)}}
@media (orientation:landscape) and (max-height:500px){#glradio{left:50%;top:6px;width:min(300px,44vw);padding:6px 10px} #glradio .rq{max-height:24vh}}
`;
  function build() {
    if (S.ui) return S.ui;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const el = document.createElement('div');
    el.id = 'glradio';
    el.hidden = true;
    el.className = 'aus';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="rt"><span class="rf"></span><b class="rn"></b><span class="rs"></span></div><div class="rd"></div><div class="rw"></div>' +
      '<div class="rl"></div>';
    (stage || document.body).appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('button[data-s]');
      if (b) {
        tune(b.dataset.s || null);
        S.listT = 4;
        return;
      }
      // (scrolling the list of songs keeps the list open)
      if (e.target.closest('.rq')) {
        S.listT = 7;
        return;
      }
      listShow(!S.listOn);
    });
    S.ui = {
      el,
      f: el.querySelector('.rf'),
      n: el.querySelector('.rn'),
      s: el.querySelector('.rs'),
      d: el.querySelector('.rd'),
      w: el.querySelector('.rw'),
      l: el.querySelector('.rl'),
      era: '',
    };
    return S.ui;
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const href = u => (typeof u === 'string' && /^https?:\/\//i.test(u) ? esc(u) : '');
  // the dial: 87.5 … 108 MHz today, … 100 in 1989
  const span = () => (era() === '1989' ? [87.5, 100] : [87.5, 108]);
  const xOf = mhz => {
    const [a, b] = span();
    return (3 + (94 * (mhz - a)) / (b - a)).toFixed(1) + '%';
  };
  function dial() {
    const U = S.ui,
      [a, b] = span();
    let h = '';
    for (let f = Math.ceil(a); f <= b; f++) h += `<i style="left:${xOf(f)}"></i>`;
    for (const s of list()) h += `<i class="s${s.id === S.id ? ' on' : ''}" style="left:${xOf(s.mhz)}"></i>`;
    U.d.innerHTML = h + `<u style="left:${xOf(sender() ? sender().mhz : a)}"></u>`;
    U.era = era() + ':' + (S.id || '');
  }
  function now() {
    const s = sender(),
      it = S.over || S.item;
    if (!s) return { id: null, name: 'Radio aus', freq: '', art: '', k: '', titel: '', von: '', lizenz: '', text: '' };
    const o = {
      id: s.id,
      name: s.name,
      freq: s.freq,
      art: s.art,
      k: it ? it.k : '',
      titel: '',
      von: '',
      lizenz: '',
      text: '',
    };
    // (over a song, the song stays on the display while the presenter talks; a report over the music shows itself)
    const mu =
      S.item && (S.item.k === 'musik' || S.item.k === 'lade') && !(S.over && /^(eil|polizei)$/.test(S.over.art))
        ? S.item
        : it;
    if (mu && (mu.k === 'musik' || mu.k === 'lade')) {
      o.titel = mu.titel || '';
      o.von = mu.von || '';
      o.lizenz = mu.lic || '';
      o.datei = mu.datei ? mu.datei.id : '';
      o.text = mu.datei ? D.anzeige(mu.datei) : mu.titel ? mu.titel + (mu.von ? ' – ' + mu.von : '') : '…';
      if (S.over) o.k = 'musik';
    } else if (it) {
      o.text = D.ART[it.art] || s.wer.name;
      o.k = it.k;
    }
    return o;
  }
  function paint() {
    const U = build(),
      s = sender(),
      n = now();
    if (U.era !== era() + ':' + (S.id || '')) dial();
    U.f.innerHTML = s ? esc(s.freq) + '<small>MHz</small>' : '– –';
    U.n.textContent = n.name;
    U.s.textContent = s
      ? S.sig < 0.5
        ? 'SCHWACH'
        : era() === '1989'
          ? 'UKW'
          : S.breite > 0.5 && mode() === 'auto'
            ? 'STEREO'
            : 'FM'
      : '';
    if (!s) U.w.innerHTML = 'R: einschalten';
    else if (n.k === 'musik' || n.k === 'lade') {
      const t = n.titel ? n.titel + (n.von ? ' – ' + n.von : '') : '…';
      U.w.innerHTML = '<b>♪</b>' + esc(t) + (n.lizenz ? '<em>' + esc(n.lizenz) + '</em>' : '');
    } else U.w.innerHTML = '<b>' + esc(s.wer.name) + '</b>' + esc(n.text);
  }
  function show(long) {
    if (!GL.on) return;
    const U = build();
    paint();
    U.el.hidden = false;
    // (shown next frame so that the fade runs)
    U.el.classList.remove('aus');
    S.barT = Math.max(S.barT, long ? 4.5 : 3.5);
  }
  // the songs of a station from the repository – for the list, the phone's radio app and the credits
  function songsOf(id) {
    return dateien(id || S.id).map(e => ({
      id: e.id,
      titel: e.title || e.id,
      von: e.author || '',
      lizenz: e.licence || '',
      lizenz_url: e.licence_url || '',
      quelle: e.source || '',
    }));
  }
  function listFill() {
    const U = build(),
      s = sender(),
      L = s ? songsOf(s.id) : [],
      jetzt = S.item && S.item.datei ? S.item.datei.id : '';
    U.l.innerHTML =
      list()
        .map(
          q =>
            `<button type="button" data-s="${q.id}" aria-current="${q.id === S.id}"><span>${esc(q.freq)}</span>${esc(q.name)}<small>${esc(q.art)}</small></button>`
        )
        .join('') +
      `<button type="button" data-s="" aria-current="${!S.id}"><span>–</span>Radio aus</button>` +
      (L.length
        ? `<div class="rq"><p>Songs auf ${esc(s.name)}</p><ol>` +
          L.map(
            q =>
              `<li${q.id === jetzt ? ' class="on"' : ''}>„${esc(q.titel)}“${q.von ? ' – ' + esc(q.von) : ''}<small>${esc(q.lizenz)}</small></li>`
          ).join('') +
          '</ol></div>'
        : '') +
      '<div class="rh">R: weiter · Umschalt + R: zurück · Esc: schließen</div>';
  }
  function listShow(on) {
    if (!GL.on) on = false;
    const U = build();
    S.listOn = !!on;
    U.el.classList.toggle('liste', S.listOn);
    if (on) {
      listFill();
      paint();
      U.el.hidden = false;
      U.el.classList.remove('aus');
      S.listT = 7;
      S.barT = Math.max(S.barT, 7);
      // the mouse free for the list
      if (document.pointerLockElement) {
        S.unlocked = true;
        try {
          HUD.unlock();
        } catch (e) {}
      }
    } else if (S.unlocked) {
      S.unlocked = false;
      try {
        HUD.lockNow();
      } catch (e) {}
    }
  }
  function uiTick(dt) {
    const U = S.ui;
    if (!U || U.el.hidden) return;
    if (S.listOn) {
      S.listT -= dt;
      if (S.listT <= 0) listShow(false);
      return;
    }
    if (S.barT > 0) {
      S.barT -= dt;
      if (S.barT <= 0) U.el.classList.add('aus');
    }
  }
  // the game's credits (Quellen und Lizenzen) get „Musik im Radio“: every song of the repository with its licence and source
  function creditsMalen() {
    if (!medOk() || typeof document === 'undefined') return;
    const L = GLMEDIEN.liste(e => e.kind === 'musik'),
      key = GLMEDIEN.BASE + ':' + L.length;
    if (S.credits === key) return;
    const box = document.querySelector('details.credits');
    if (!box) return;
    S.credits = key;
    let el = document.getElementById('glmusik-credits');
    if (!el) {
      el = document.createElement('div');
      el.id = 'glmusik-credits';
      const ul = box.querySelector('ul');
      if (ul) ul.insertAdjacentElement('afterend', el);
      else box.appendChild(el);
    }
    const G = D.credits(L);
    el.innerHTML = G.length
      ? '<p><b>Musik im Radio</b> (Grenzland) – freie Songs von Bands:</p>' +
        G.map(
          g =>
            `<p>${esc(g.sender)}</p><ul>` +
            g.zeilen
              .map(
                z =>
                  `<li>${esc(z.text)}${href(z.lizenz) ? ` (<a href="${href(z.lizenz)}" target="_blank" rel="noopener">Lizenz</a>)` : ''}${href(z.quelle) ? ` – <a href="${href(z.quelle)}" target="_blank" rel="noopener">Quelle</a>` : ''}</li>`
              )
              .join('') +
            '</ul>'
        ).join('')
      : '';
  }

  // ---------------- what happens in the world ----------------
  KERN.on('grenzland:tat', d => {
    if (!GL.on || !d) return;
    S.pend.push({ id: d.id, wit: d.zeugen | 0, t: S.uhr });
    if (S.pend.length > 6) S.pend.shift();
  });
  KERN.on('grenzland:sterne', d => {
    if (!GL.on || !d) return;
    if (d.n >= 3 && d.n > S.maxS) S.eil = d.n >= 4 ? 'heli' : 'eil';
    S.maxS = d.n;
  });
  KERN.on('grenzland:erwischt', d => {
    if (!GL.on) return;
    S.eil = 'erwischt';
    S.busse = d && d.busse ? d.busse : 0;
    S.pend.length = 0;
    S.maxS = 0;
  });
  KERN.on('grenzland:entkommen', () => {
    if (!GL.on) return;
    if (S.maxS >= 2 || S.pend.length) S.eil = 'frei';
    S.maxS = 0;
  });
  KERN.on('grenzland:sperre', () => {
    if (GL.on && S.maxS < 3) S.eil = 'eil';
  });
  KERN.on('grenzland:era', () => eraSet());
  // the dial of the time: the stations of 1989 in the flashback, one's own again afterwards
  function eraSet() {
    if (!GL.on) return;
    const on = !!S.id,
      want = era() === 'heute' ? S.sel.heute : S.sel[1989] || (on ? list()[0].id : null);
    S.id = null;
    stopSrc(0.1);
    bettAus(0.1);
    stopVox();
    S.item = S.over = null;
    S.jobs.length = 0;
    S.bufs = {};
    if (S.ui) S.ui.era = '';
    if (want) tune(want, { quiet: !on });
    else {
      if (S.A) mixTick(0);
      if (S.ui && !S.ui.el.hidden) paint();
    }
  }

  // ---------------- per frame ----------------
  // a song from a file: its clock follows the element (a stalled element holds it; ten real seconds without progress: the synth instead);
  // the presenter's back-announcement starts after the last sung second when it fits before the end
  function dateiTick(it, dt) {
    const D0 = S.deck;
    if (!D0 || D0.e !== it.datei) {
      it.left -= dt;
      return;
    }
    const el = D0.h.el,
      t = el.currentTime || 0,
      pn = performance.now();
    if (t !== D0.ct) {
      D0.ct = t;
      D0.ctT = pn;
    } else if (pn - D0.ctT > 10000 && !el.ended) return dateiFehler(D0);
    if (!(el.paused && !el.ended) && el.readyState >= 2) it.left -= dt;
    if (t > 0.05) it.left = Math.min(it.left, it.dauer - t);
    if (S.over || it.outro) return;
    const st = prog(S.id),
      v = st.vor;
    if (v && v.k === 'wort' && (v.art === 'mod' || v.art === 'gruss')) {
      const dz = dauerZ(v),
        f = D.fenster(it.datei, dz, 'outro'),
        pos = it.dauer - it.left;
      if (f.passt === 'outro' && pos >= f.outro[0] && pos <= f.outro[1] - dz) {
        it.outro = true;
        st.vor = null;
        S.count.outro++;
        startWort(v, true);
        ahead();
      }
    }
  }
  function tick(dt) {
    if (!GL.on) return;
    if (!S.init) {
      // a reload goes on with the station that was on
      S.init = true;
      const l = D.SENDER.heute;
      if (era() === 'heute' && GL.radio > 0 && GL.radio <= l.length && !S.id) tune(l[GL.radio - 1].id, { quiet: true });
    }
    // the first time one sits in a vehicle the radio comes on by itself (as it does in GTA); switched off, it stays off.
    // Not while a mission runs: the first one teaches the key, and a scene may want silence.
    if (!S.touched && !S.id && !GL.cur && VEH.cur && VEH.cur.id !== 'tractor') {
      tune(list()[0].id);
      PLAY.think('Radio: R wechselt den Sender, R halten zeigt die Liste.', 4200);
    }
    S.uhr += dt;
    uiTick(dt);
    if ((S.medT -= dt) <= 0) {
      S.medT = 1;
      creditsMalen();
    }
    if (!S.id) return;
    // the sound came on only now (a reload starts silent until the first click): the piece that is „running“ is heard from here
    if (S.item && S.item.stumm && raw()) {
      const i = S.item.i,
        sy = !!S.item.synth;
      S.count.musik--;
      S.item = null;
      startMusik({ k: 'musik', i }, true, { synth: sy });
    }
    S.fadeT += dt;
    S.rxT -= dt;
    S.sig = signal();
    // (the display says when the reception turns weak or good)
    if (S.sig < 0.5 !== S.weak) {
      S.weak = S.sig < 0.5;
      if (S.ui && !S.ui.el.hidden) paint();
    }
    jobTick();
    mixTick(dt);
    // a special report over the music
    if (S.over) {
      if (S.item && S.item.k === 'musik') {
        if (S.item.datei) dateiTick(S.item, dt);
        else S.item.left -= dt;
      }
      if (wortTick(S.over, dt)) {
        S.over = null;
        show();
      }
      return;
    }
    const it = S.item;
    if (!it) return advance();
    if (it.k === 'lade') {
      // waiting for the repository's list: its song as soon as it is there (or the station's own piece without it)
      if (it.warte === 'index') {
        const ms = GLMEDIEN.stand();
        if (ms === 'ok' || ms === 'aus' || performance.now() - it.t0 > 4000) {
          S.item = null;
          startMusik({ k: 'musik', i: it.i }, it.mid, { synth: ms !== 'ok' });
        }
        return;
      }
      // a report that cannot wait comes before the piece
      if (S.sonder.length || S.pend.some(q => q.wit > 0)) return advance();
      // (no sound after all, or the render never came – twenty real seconds: go on without)
      if (performance.now() - it.t0 > 20000 || !raw())
        S.item = {
          k: 'musik',
          titel: it.titel,
          von: it.von,
          left: it.dauer - it.off,
          dauer: it.dauer,
          key: it.key,
          i: it.i,
        };
      return;
    }
    if (it.k === 'musik') {
      if (it.datei) {
        dateiTick(it, dt);
        if (S.item !== it || S.over) return;
      } else it.left -= dt;
      // a deed somebody saw: a piece that would run much longer makes room for the report
      if (it.left > 7 && S.pend.length && S.pend.some(q => q.wit > 0)) it.left = 7;
      if (S.sonder.length && S.sonder[0].sofort && it.left > 6) {
        const z = S.sonder.shift();
        return startWort({ k: 'wort', art: 'eil', zeilen: [].concat(z) }, true);
      }
      if (S.eil && (S.eil === 'eil' || S.eil === 'heli') && it.left > 6) {
        const c = ctxOf(),
          o = D.PROG.next(prog(S.id), c);
        S.eil = '';
        return startWort(o, true);
      }
      // a song from a file ends tight: the next item comes while it fades (its own ending is in the file);
      // a synthesised piece fades over its last seconds
      if (it.datei) {
        if (it.left <= 0.9) advance();
        return;
      }
      if (it.left < 2.2 && !it.fade) {
        // the last seconds fade
        it.fade = true;
        if (S.src && S.A) S.src.g.gain.setTargetAtTime(0, S.A.ctx.currentTime, 0.6);
        if (it.rec && S.el) fadeEl();
      }
      if (it.left <= 0) advance();
      return;
    }
    if (wortTick(it, dt)) advance();
  }
  function fadeEl() {
    const a = S.el && S.el.a;
    if (!a) return;
    let v = 1;
    const f = () => {
      v -= 0.08;
      if (v <= 0 || a.paused) {
        try {
          a.pause();
        } catch (e) {}
        return;
      }
      a.volume = Math.max(0, v);
      setTimeout(f, 150);
    };
    f();
  }
  function stop() {
    stopSrc(0.1);
    bettAus(0.1);
    stopVox();
    if (S.item && S.item.busy) STIMME.stop();
    if (S.id) still();
    S.said++;
    S.id = null;
    S.item = S.over = null;
    S.jobs.length = 0;
    S.job = null;
    S.bufs = {};
    S.pend.length = 0;
    S.sonder.length = 0;
    S.eil = '';
    S.maxS = 0;
    S.init = false;
    S.touched = false;
    S.sel.heute = S.sel[1989] = null;
    S.prog = {};
    S.last = {};
    S.bad = {};
    S.rx = null;
    S.drop = 0;
    unchain();
    if (S.el) {
      try {
        S.el.a.pause();
        S.el.a.removeAttribute('src');
        S.el.node.disconnect();
      } catch (e) {}
      S.el = null;
    }
    // (the mode ends: the sound repository's elements fall silent, its decoded buffers go)
    GLMEDIEN.stille();
    M.frei();
    if (S.ui) {
      listShow(false);
      S.ui.el.hidden = true;
      S.ui.el.classList.add('aus');
    }
  }
  // tests: the state as plain values
  const stand = () => ({
    id: S.id,
    era: era(),
    k: S.item ? S.item.k : '',
    art: S.item && S.item.art ? S.item.art : '',
    titel: S.item ? S.item.titel || '' : '',
    left: S.item && Number.isFinite(S.item.left) ? S.item.left : 0,
    over: S.over ? S.over.art : '',
    pend: S.pend.length,
    eil: S.eil,
    mode: mode(),
    sig: S.sig,
    ton: !!S.A,
    src: !!(S.src || S.deck),
    jobs: S.jobs.length + (S.job ? 1 : 0),
    bufs: Object.keys(S.bufs),
    bar: !!(S.ui && !S.ui.el.hidden && !S.ui.el.classList.contains('aus')),
    liste: S.listOn,
    count: { ...S.count },
    log: S.log.slice(-12),
    radio: GL.radio,
    // ton-radio
    datei: S.item && S.item.datei ? S.item.datei.id : '',
    lizenz: S.item && S.item.lic ? S.item.lic : '',
    med: GLMEDIEN.stand(),
    deck: S.deck
      ? {
          id: S.deck.e.id,
          t: S.deck.h.el.currentTime,
          paused: S.deck.h.el.paused,
          url: S.deck.h.url,
          ab: S.item && S.item.ab,
        }
      : null,
    bett: S.bed ? { id: S.bed.e.id, ab: S.bed.ab, t: S.bed.h.el.currentTime, leise: S.bed.leise } : null,
    duck: S.A && S.A.last.duck !== undefined ? S.A.last.duck : 1,
    breite: S.breite,
    drop: S.drop > 0,
    pfiffe: S.pfiffe,
    vox: !!S.vox,
    rx: S.rx ? { ort: S.rx.ort, h: S.rx.h, um: S.rx.um } : null,
    spk: S.A
      ? Object.fromEntries(Object.entries(S.A.spk).map(([k, q]) => [k, { an: S.A.last['spk' + k] || 0, raum: q.raum }]))
      : null,
  });
  return {
    stations,
    cur,
    tune,
    next,
    prev,
    off: () => S.id && tune(null),
    era: eraSet,
    tick,
    stop,
    now,
    list: listShow,
    show,
    signal,
    stand,
    songs: songsOf,
    // the fixed lines of the calls and of the songs' back-announcements (GLSTIMMEN collects them for the recordings)
    linien: () => D.linien(GLMEDIEN.liste(e => e.kind === 'musik')),
    // a mission's own announcement: a line or lines, told at the next break on whatever station is on (sofort: over the music, now)
    melde(text, sofort) {
      const z = [].concat(text).filter(t => typeof t === 'string' && t);
      if (!z.length || !GL.on) return false;
      z.sofort = !!sofort;
      S.sonder.push(z);
      if (S.sonder.length > 4) S.sonder.shift();
      return true;
    },
    // spoken by the player's voices? (paid: also through an engine that costs credit)
    stimme(on, paid) {
      S.speak = !!on;
      if (paid !== undefined) S.paid = !!paid;
      return S.speak;
    },
    spricht: () => S.speak,
    // a voice of the story speaks (grenzland/gl_stimmen.js): the radio steps back like under a subtitle
    duck: on => void (S.duckOn = !!on),
    S,
  };
})();
window.GLRADIO = GLRADIO;
