// ===================== feat/grenzland: the radio (GLRADIO) – stations to switch between as in GTA =====================
// Falko, 13.11.2026 1:14: „… und auch verschiedene Radiosender eingestellt werden können. Ähnlich wie bei GTA.“ Six invented stations
// today, three in the flashback to 10 November 1989 (grenzland/gl_radio_data.js): each with its own music – composed and synthesised by
// grenzland/gl_radio_musik.js, the classical station also plays the public-domain recordings of the record player (window.MUSICMAN) –,
// its presenter, idents, adverts of invented firms, the news with the weather of the game, traffic, the true story „Sukiyaki in Suhl“
// in parts, and the police report of the player's own deeds: a deed somebody saw is told at the next break (a piece that would run much
// longer is faded out for it), three stars and more interrupt the music with a special report.
//   R            the next station (after the last: off) · Shift + R the one before · R held: the list stays open to pick from
//   the display  top centre for a few seconds: frequency, name, the dial with its needle, what is on; a tap opens the list
// The radio plays in a car through its speakers, on foot and on the moped from the phone (thin, quieter), in 1989 from the car's set or
// a portable one; a station from across the border comes in clearly only in the south of the map, the Western station of 1989 always
// with noise. Words are subtitles (GLHUD.sub) and, where the player has the voices on, spoken (audio/stimme.js) – not through a paid
// engine unless asked (GLRADIO.stimme). Everything hangs on its own gain under the game's music bus; nothing is built before a station
// is tuned, „Beenden“ takes all of it away.
// Interface (the core's, kept): GLRADIO.stations() → [{ id, name, freq, art }] · cur() → id | null · tune(id | null) · next() · prev() ·
//   off() · era(e) · tick(dt) · stop(). More: now() → what is on · list(on) · stimme(on) · signal() · stand() (tests).
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
import { GLRDATA } from './gl_radio_data.js';
import { GLRMUSIK } from './gl_radio_musik.js';
export const GLRADIO = (() => {
  const D = GLRDATA,
    M = GLRMUSIK;
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
    count: { musik: 0, wort: 0 },
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
  };
  const era = () => (GL.era === '1989' ? '1989' : 'heute');
  const list = () => D.SENDER[era()];
  const stations = () => list().map(s => ({ id: s.id, name: s.name, freq: s.freq, art: s.art }));
  const cur = () => S.id;
  const sender = () => (S.id ? D.byId[S.id] : null);
  const raw = () => GLTON.raw();
  const pos = () => (VEH.cur && VEH.cur.st ? [VEH.cur.st.x, VEH.cur.st.y] : [P.x, P.y]);

  // ---------------- sound: the chain under the music bus ----------------
  // source(s) → duck → tone (high-pass, low-pass: car, phone, the sets of 1989) → sig (reception) → out → music bus; noise → out
  function chain() {
    const R = raw();
    if (!R) return null;
    if (S.A && S.A.ctx === R.ctx) return S.A;
    const c = R.ctx,
      A = { ctx: c };
    A.duck = c.createGain();
    A.hp = c.createBiquadFilter();
    A.hp.type = 'highpass';
    A.lp = c.createBiquadFilter();
    A.lp.type = 'lowpass';
    A.sig = c.createGain();
    A.out = c.createGain();
    A.out.gain.value = 0;
    A.duck.connect(A.hp);
    A.hp.connect(A.lp);
    A.lp.connect(A.sig);
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
  // where the radio plays: a car's speakers, the phone (on foot, on the moped), in 1989 the car's set or a portable one
  const MODES = {
    auto: { hp: 70, lp: 9000, g: 0.62 },
    handy: { hp: 520, lp: 3600, g: 0.3 },
    auto89: { hp: 140, lp: 4800, g: 0.55 },
    koffer: { hp: 320, lp: 3300, g: 0.36 },
  };
  const mode = () => {
    const car = VEH.cur && VEH.cur.id !== 'gl-moped';
    return era() === '1989' ? (car ? 'auto89' : 'koffer') : car ? 'auto' : 'handy';
  };
  // reception 0 … 1: the station from across the border comes in only in the south; the Western station of 1989 wavers
  function signal() {
    const s = sender();
    if (!s || !s.fern) return 1;
    if (s.fern === 'sued') return Math.max(0.12, Math.min(1, (-pos()[1] - 150) / 600));
    return 0.62 + 0.2 * Math.sin(S.fadeT * 0.7) + 0.1 * Math.sin(S.fadeT * 2.3);
  }
  function mixTick(dt) {
    const A = S.A;
    if (!A) return;
    const t = A.ctx.currentTime,
      m = mode(),
      Mo = MODES[m];
    if (m !== S.ctxMode) {
      S.ctxMode = m;
      A.hp.frequency.setTargetAtTime(Mo.hp, t, 0.08);
      A.lp.frequency.setTargetAtTime(Mo.lp, t, 0.08);
    }
    S.fadeT += dt;
    const sg = signal();
    S.sig = sg;
    const lade = !S.item || S.item.k === 'lade';
    A.out.gain.setTargetAtTime(S.id ? Mo.g : 0, t, 0.12);
    A.sig.gain.setTargetAtTime(0.1 + 0.9 * sg * sg, t, 0.2);
    A.nzG.gain.setTargetAtTime(S.id ? (1 - sg) * 0.22 + (lade ? 0.05 : 0) + (S.tuneT > 0 ? 0.16 : 0) : 0, t, 0.04);
    A.duck.gain.setTargetAtTime(S.over ? 0.18 : 1, t, 0.18);
    if (S.tuneT > 0) S.tuneT -= dt;
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
  const songs = id => (M.REP[id] ? M.REP[id].length : 1) + (id === 'klassik' ? recs().length : 0);
  function ctxOf() {
    const now = CLOCK.t;
    for (let i = S.pend.length - 1; i >= 0; i--) if (now - S.pend[i].t > 45) S.pend.splice(i, 1);
    return {
      taten: S.pend,
      sterne: GL.W ? starsNow() : 0,
      bekannt: !!(GL.W && GL.W.known),
      eil: S.eil,
      busse: S.busse,
      w: WETTER && WETTER.S ? WETTER.S.w : null,
      min: CLOCK.t,
      songs: songs(S.id),
      last: S.last[S.id] || null,
    };
  }
  const starsNow = () => GLLOGIK.stars(GL.W);
  const note = (k, art, text) => {
    S.log.push({ id: S.id, k, art, text });
    if (S.log.length > 24) S.log.shift();
  };
  // which piece a music item is: on the classical station the recordings take turns with the house's own piano pieces
  function pieceOf(id, i) {
    if (id === 'klassik') {
      const rc = recs();
      if (rc.length && i % 2 === 0) {
        const rec = rc[(i / 2) % rc.length];
        return { rec, titel: rec.title || rec.file, von: rec.by || '', dauer: 76 };
      }
      i = Math.floor(i / 2);
    }
    const s = M.song(id, i);
    return { song: s, key: id + ':' + s.i, titel: s.titel, von: s.von, dauer: s.dauer - 1.2 };
  }
  function startMusik(it, mid) {
    const p = pieceOf(S.id, it.i),
      off = mid && !p.rec ? p.dauer * (0.25 + 0.4 * prog(S.id).rnd()) : 0;
    S.last[S.id] = { titel: p.titel, von: p.von };
    S.count.musik++;
    note('musik', '', p.titel);
    GL.emit('radio:sendung', { id: S.id, k: 'musik', art: '', titel: p.titel });
    if (p.rec) {
      playRec(p.rec);
      S.item = { k: 'musik', rec: p.rec, titel: p.titel, von: p.von, left: p.dauer, dauer: p.dauer };
    } else if (!raw())
      S.item = { k: 'musik', titel: p.titel, von: p.von, left: p.dauer - off, dauer: p.dauer, key: p.key };
    else {
      // not rendered yet: noise until it is (a second or two after tuning in)
      S.item = { k: 'lade', titel: p.titel, von: p.von, key: p.key, dauer: p.dauer, off, t: 0 };
      const id = S.id;
      want(p.key, p.song, buf => {
        if (S.id !== id || !S.item || S.item.key !== p.key || S.item.k !== 'lade') return;
        playBuf(buf, off);
        S.item = { k: 'musik', titel: p.titel, von: p.von, left: p.dauer - off, dauer: p.dauer, key: p.key };
        show();
      });
    }
    show();
    ahead();
  }
  // the next item is decided when this one begins, so that its music can be rendered meanwhile
  function ahead() {
    const st = prog(S.id);
    if (st.vor) return;
    const c = ctxOf();
    c.taten = null;
    c.eil = '';
    st.vor = D.PROG.next(st, c);
    if (st.vor.k === 'musik' && raw()) {
      const p = pieceOf(S.id, st.vor.i);
      if (p.song) want(p.key, p.song);
    }
    if (raw() && !S.bufs['kenn:' + S.id]) want('kenn:' + S.id, M.kennung(S.id));
  }
  const speakOk = text =>
    S.speak && (S.paid || STIMME.engineName !== 'eleven') && STIMME.speaks('gl_r_' + S.id, text) && !window.FREEZE;
  function sayLine(W) {
    // (somebody in the world is speaking: the radio waits its turn for a few seconds)
    const other = GLHUD.subT > 0.3 && GLHUD.subEl && !(S.subMine && GLHUD.subEl.textContent.endsWith(S.subMine));
    if (other && (W.defer = (W.defer || 0) + 1) < 8) {
      W.left = 1;
      W.li--;
      return;
    }
    const text = W.it.zeilen[W.li],
      s = sender();
    W.left = D.dauer(text) + 0.35;
    W.max = W.left * 1.7 + 4;
    W.busy = false;
    GLHUD.sub(s.name, text, W.left * 1000);
    S.subMine = text;
    note('wort', W.it.art, text);
    if (speakOk(text)) {
      W.busy = true;
      const tag = ++S.said;
      Promise.resolve(STIMME.say('gl_r_' + S.id, text))
        .catch(() => false)
        .then(() => {
          if (S.said === tag) W.busy = false;
        });
    }
  }
  function startWort(it, over) {
    const W = { k: 'wort', it, li: 0, left: 0, max: 0, busy: false, hold: 0, art: it.art };
    S.count.wort++;
    GL.emit('radio:sendung', { id: S.id, k: 'wort', art: it.art, titel: '' });
    if (over) S.over = W;
    else {
      stopSrc(0.5);
      S.item = W;
      // an ident before the claim, if it is rendered
      if (it.kenn && S.bufs['kenn:' + S.id]) {
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
      return true;
    }
    sayLine(W);
    return false;
  }
  function advance() {
    const st = prog(S.id),
      c = ctxOf();
    let it = null;
    if (c.eil || (c.taten && c.taten.length)) it = D.PROG.next(st, c);
    else {
      it = st.vor || D.PROG.next(st, c);
      st.vor = null;
    }
    if (it.taten) S.pend.length = 0;
    if (it.eil) S.eil = '';
    if (it.k === 'musik') startMusik(it);
    else startWort(it);
  }

  // ---------------- tuning ----------------
  function voices() {
    if (S.voices) return;
    S.voices = true;
    try {
      for (const e of Object.keys(D.SENDER))
        for (const s of D.SENDER[e]) STIMME.person('gl_r_' + s.id, Object.assign({}, s.wer));
    } catch (e) {}
  }
  function tune(id, o = {}) {
    const lst = list(),
      s = id ? lst.find(q => q.id === id) : null;
    if (id && !s) return false;
    S.touched = true;
    const was = S.id;
    stopSrc(0.1);
    if (S.said && was) {
      S.said++;
      if (S.item && S.item.busy) STIMME.stop();
    }
    S.item = null;
    S.over = null;
    S.jobs.length = 0;
    S.id = s ? s.id : null;
    S.sel[era()] = S.id;
    if (era() === 'heute') {
      GL.radio = s ? lst.indexOf(s) + 1 : 0;
      GL.save();
    }
    if (GLHUD.subT > 0 && S.subMine && GLHUD.subEl && GLHUD.subEl.textContent.endsWith(S.subMine)) {
      GLHUD.subT = 0.01;
      S.subMine = '';
    }
    if (s) {
      voices();
      chain();
      S.tuneT = 0.22;
      // one lands in the middle of the programme: a piece that is already running
      const st = prog(S.id);
      st.vor = null;
      st.song = (st.song + 1) % songs(S.id);
      startMusik({ k: 'musik', i: st.song }, true);
    } else {
      S.bufs = {};
      S.job = null;
      if (S.A) mixTick(0);
    }
    if (!o.quiet) show(true);
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
#glradio{position:absolute;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:6;width:min(340px,78vw);
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
#glradio .rl{margin-top:7px;border-top:1px solid rgba(255,255,255,.14);padding-top:5px;display:none}
#glradio.liste .rl{display:block}
#glradio .rl button{display:flex;width:100%;gap:9px;align-items:baseline;text-align:left;border:0;background:none;color:inherit;padding:6px 5px;border-radius:7px;
  font:500 13px/1.2 var(--f-body,system-ui);cursor:pointer}
#glradio .rl button:hover{background:rgba(255,255,255,.1)} #glradio .rl button[aria-current="true"]{background:rgba(255,182,72,.2)}
#glradio .rl button span{font:600 12px/1 var(--f-mono,monospace);color:#ffb648;min-width:42px}
#glradio .rl button small{opacity:.65;font-size:11px;margin-left:auto;white-space:nowrap}
#glradio .rh{margin-top:4px;font:500 10px/1.3 var(--f-body,system-ui);opacity:.6}
/* 1989: a set of the time – a cream dial behind glass, bakelite brown */
body[data-gl-era="1989"] #glradio{background:linear-gradient(#4a3a2c,#33271d);color:#f3e7c9;border:1px solid #6d5843;border-radius:6px}
body[data-gl-era="1989"] #glradio .rf{color:#f3e7c9;text-shadow:none;font-family:Georgia,serif}
body[data-gl-era="1989"] #glradio .rn{font-family:Georgia,serif}
body[data-gl-era="1989"] #glradio .rd{background:linear-gradient(#efe2bd,#d8c796);height:20px}
body[data-gl-era="1989"] #glradio .rd i{background:rgba(60,40,20,.5)} body[data-gl-era="1989"] #glradio .rd i.s{background:#7a2a1c}
body[data-gl-era="1989"] #glradio .rd i.on{box-shadow:none} body[data-gl-era="1989"] #glradio .rd u{background:#b3261a;box-shadow:none}
body[data-gl-era="1989"] #glradio .rw b,body[data-gl-era="1989"] #glradio .rl button span{color:#f0c56a}
@media (max-width:720px){#glradio{top:calc(104px + env(safe-area-inset-top,0px));width:min(320px,92vw)}}
@media (orientation:landscape) and (max-height:500px){#glradio{top:6px;width:min(300px,44vw);padding:6px 10px}}
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
        S.listT = 5;
        listFill();
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
    if (!s) return { id: null, name: 'Radio aus', freq: '', art: '', k: '', titel: '', von: '', text: '' };
    const o = { id: s.id, name: s.name, freq: s.freq, art: s.art, k: it ? it.k : '', titel: '', von: '', text: '' };
    if (it && (it.k === 'musik' || it.k === 'lade')) {
      o.titel = it.titel;
      o.von = it.von;
      o.text = it.titel + (it.von ? ' – ' + it.von : '');
    } else if (it) o.text = D.ART[it.art] || s.wer.name;
    return o;
  }
  function paint() {
    const U = build(),
      s = sender(),
      n = now();
    if (U.era !== era() + ':' + (S.id || '')) dial();
    U.f.innerHTML = s ? esc(s.freq) + '<small>MHz</small>' : '– –';
    U.n.textContent = n.name;
    U.s.textContent = s ? (S.sig < 0.5 ? 'SCHWACH' : era() === '1989' ? 'UKW' : 'FM') : '';
    U.w.innerHTML = !s
      ? 'R: einschalten'
      : n.k === 'musik' || n.k === 'lade'
        ? '<b>♪</b>' + esc(n.text)
        : '<b>' + esc(s.wer.name) + '</b>' + esc(n.text);
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
  function listFill() {
    const U = build();
    U.l.innerHTML =
      list()
        .map(
          s =>
            `<button type="button" data-s="${s.id}" aria-current="${s.id === S.id}"><span>${esc(s.freq)}</span>${esc(s.name)}<small>${esc(s.art)}</small></button>`
        )
        .join('') +
      `<button type="button" data-s="" aria-current="${!S.id}"><span>–</span>Radio aus</button>` +
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

  // ---------------- what happens in the world ----------------
  KERN.on('grenzland:tat', d => {
    if (!GL.on || !d) return;
    S.pend.push({ id: d.id, wit: d.zeugen | 0, t: CLOCK.t });
    if (S.pend.length > 6) S.pend.shift();
    // a piece that would run much longer makes room for the report
    if (S.id && S.item && S.item.k === 'musik' && S.item.left > 14 && d.zeugen > 0) S.item.left = 7;
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
  function tick(dt) {
    if (!GL.on) return;
    if (!S.init) {
      // a reload goes on with the station that was on
      S.init = true;
      const l = D.SENDER.heute;
      if (era() === 'heute' && GL.radio > 0 && GL.radio <= l.length && !S.id) tune(l[GL.radio - 1].id, { quiet: true });
    }
    // the first time one sits in a vehicle the radio comes on by itself (as it does in GTA); switched off, it stays off
    if (!S.touched && !S.id && VEH.cur && VEH.cur.id !== 'tractor') {
      tune(list()[0].id);
      PLAY.think('Radio: R wechselt den Sender, R halten zeigt die Liste.', 4200);
    }
    uiTick(dt);
    if (!S.id) return;
    jobTick();
    mixTick(dt);
    // a special report over the music
    if (S.over) {
      if (wortTick(S.over, dt)) {
        S.over = null;
        show();
      }
      return;
    }
    const it = S.item;
    if (!it) return advance();
    if (it.k === 'lade') {
      it.t += dt;
      // (no sound after all, or the render never came: go on without)
      if (it.t > 20 || !raw())
        S.item = { k: 'musik', titel: it.titel, von: it.von, left: it.dauer - it.off, dauer: it.dauer, key: it.key };
      return;
    }
    if (it.k === 'musik') {
      it.left -= dt;
      if (S.eil && (S.eil === 'eil' || S.eil === 'heli') && it.left > 6) {
        const c = ctxOf(),
          o = D.PROG.next(prog(S.id), c);
        S.eil = '';
        return startWort(o, true);
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
    if (S.item && S.item.busy) STIMME.stop();
    S.said++;
    S.id = null;
    S.item = S.over = null;
    S.jobs.length = 0;
    S.job = null;
    S.bufs = {};
    S.pend.length = 0;
    S.eil = '';
    S.maxS = 0;
    S.init = false;
    S.touched = false;
    S.sel.heute = S.sel[1989] = null;
    S.prog = {};
    S.last = {};
    unchain();
    if (S.el) {
      try {
        S.el.a.pause();
        S.el.a.removeAttribute('src');
        S.el.node.disconnect();
      } catch (e) {}
      S.el = null;
    }
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
    src: !!S.src,
    jobs: S.jobs.length + (S.job ? 1 : 0),
    bufs: Object.keys(S.bufs),
    bar: !!(S.ui && !S.ui.el.hidden && !S.ui.el.classList.contains('aus')),
    liste: S.listOn,
    count: { ...S.count },
    log: S.log.slice(-12),
    radio: GL.radio,
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
    // spoken by the player's voices? (paid: also through an engine that costs credit)
    stimme(on, paid) {
      S.speak = !!on;
      if (paid !== undefined) S.paid = !!paid;
      return S.speak;
    },
    spricht: () => S.speak,
    S,
  };
})();
window.GLRADIO = GLRADIO;
