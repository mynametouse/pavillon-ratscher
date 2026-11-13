// ===================== feat/zeitreise-regie: the director of the time journey – time-lapse, camera, halts, voices, two worlds side by side (ZKREGIE) =====================
// Falko, 13.11.2026: „Autoplay … dass man im Zeitraffer sieht, wie sich etwas verändert … ein immersives Zeitsprunggefühl“. The director
// plays ZKCHRONIK (zukunft/zk_chronik.js: worlds, chapters, events, the state of each world in every float year) in the one world that
// ZKZEITWELT (zukunft/zk_zeitwelt.js) draws, through the app's own clock, calendar, weather and camera:
// - Chapters one after another (Wald, Wasser, Energie), each through its own years. Between the events a time-lapse (2 s per year at speed
//   1) at a fixed hour of the chapter – the days advance, seasons and the sun's height change, no day–night flicker; the camera changes
//   place every ~10 s with a ~1 s cross-fade and moves slowly (a dolly of a few metres, a slow pan).
// - An event with a halt: the time-lapse eases out at its moment, the clock goes on to the event's hour and its weather comes (prelude);
//   the before() hooks run (zeitreise-medien's phone, max. 30 s); a cross-fade to the event's place on foot at eye height, its date, hour
//   and weather; its phase runs (ZKCHRONIK.at(ev, phase) → state(): water rising, lights going out) while the villagers speak (recorded
//   line, else the browser's voice, else text only – the ambience ducks under the voice); then the time-lapse goes on. Halts never move the
//   camera (a VR headset stands there later). Events without a halt pass as a short note.
// - A chapter's end: `card` (kpi() of both worlds and the questions) and wait for next(); the between() hooks (the radio); the next chapter.
// - The split: both worlds of the pair at once, the identical camera, the scene drawn twice (zukunft/zk_regie_bild.js, layers 0+21 | 0+22).
// - stop() puts clock, calendar, light mode, weather, view and world back exactly as before; a crash in the middle is undone at the next
//   start of the page (pav-zeitreise-v1 keeps the clock and calendar of before while the journey runs).
// Everything is driven by state() and the events, so a phone or a headset can follow later. Places and poses: zukunft/zk_regie_orte.js.
//   ZKREGIE.start({ pair:['allein','gewappnet'], split:true, chapter:null, speed:1, play:true })   play() pause() toggle() next() prev()
//   seek(y) speed(s) stop() · state() → { on, pair, split, side, chapter, y, ev, phase, playing, place, card, mode, line, note, … }
//   on(fn) → off: { type:'tick'|'chapter'|'event'|'line'|'card'|'end'|'place'|'play', … } · before(fn) / between(fn) → off
//   snapshot(placeId, side) → Promise<dataURL> · duck(level) · split(v) · bars(k) · view(placeId) · info() (tests)
import * as THREE from 'three';
import { cam } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { DIRTY, markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { CAM3, go } from '../game/player.js';
import { CAMSET, FAR0 } from '../game/camera.js';
import { MODE, setMode } from '../render/modes.js';
import { audio } from '../audio/audio.js';
import { STIMME } from '../audio/stimme.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { WETTER } from '../wetter/wetter.js';
import { ZKCHRONIK } from './zk_chronik.js';
import { ZKZEITWELT } from './zk_zeitwelt.js';
import { ZKORTE } from './zk_regie_orte.js';
import { ZKBILD } from './zk_regie_bild.js';

export const ZKREGIE = (() => {
  const C = ZKCHRONIK,
    W = ZKZEITWELT;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = k => k * k * (3 - 2 * k);
  const SPY = 2, // seconds per year at speed 1
    EASE_S = 0.5, // the time-lapse slows into a halt over ~4 × this
    PLACE_S = 10, // seconds at one place in the time-lapse
    HOOK_MAX = 30000; // before()/between() wait at most this long
  // the hour of the time-lapse per chapter (the sun from the south-east to the south: the slopes in light), and its weather
  const HOUR = { wald: 11.5, wasser: 12, energie: 12.5 },
    WX = { wald: 'heiter', wasser: 'heiter', energie: 'heiter' };
  const FEM = new Set(['katrin', 'ingrid', 'heike']);
  // ---- the journey's own saved key: the clock and calendar of before, while it runs (a crash is undone at the next start) ----
  const KS = SAVE.key('pav-zeitreise-v1', {
    owner: 'zeitreise',
    kind: 'json',
    def: null,
    check: v => v === null || (!!v && typeof v === 'object' && v.v === 1),
  });
  {
    const b = SAVE.get(KS);
    if (b && Number.isFinite(b.t) && Number.isFinite(b.e0)) {
      try {
        DN.e0 = b.e0;
        CLOCK.t = b.t;
      } catch (e) {}
      SAVE.set(KS, null);
    }
  }
  const S = {
    on: false,
    gen: 0,
    pair: ['allein', 'gewappnet'],
    split: true,
    side: 'both', // 'both' (the split) | 'L' | 'R' (one world: the first or the second of the pair)
    playing: false,
    spd: 1,
    mode: 'off', // lapse | prelude | before | halt | card | between | end
    chapters: [],
    ci: -1,
    ch: null,
    y: 2026,
    tl: [],
    evs: [],
    ni: 0,
    pend: null, // the event the prelude / before lead to
    ev: null, // the event of the halt
    ht: 0,
    hdur: 0,
    phase: 0,
    pre: null,
    lines: [],
    li: -1,
    line: null,
    lineLeft: 0,
    nextLineT: 0,
    voiceOn: false,
    lineGen: 0,
    wait: null,
    waitId: 0,
    shot: null,
    place: null,
    pi: 0,
    card: null,
    note: null,
    rt: 0,
    segT: 0,
    lapseHour: 12,
    lapseWx: 'heiter',
    wx: undefined,
    back: null,
    d0: 0,
    E0: 0,
    dnT: 0,
    dnDue: false,
    shadowT: 0,
    shadowOwed: false,
    sndT: 0,
    voiceDuck: 1,
    mediaDuck: 1,
    voxSet: 1,
    snapFor: null,
    stL: null,
    stR: null,
  };
  const subs = new Set(),
    befores = new Set(),
    betweens = new Set();
  function emit(e) {
    for (const f of [...subs])
      try {
        f(e);
      } catch (err) {
        console.warn('ZKREGIE.on', err);
      }
  }
  const TICK = { type: 'tick', y: 2026, phase: 0, mode: 'off', playing: false };
  // ---------------- the timeline of the pair: one entry per moment (an id in both worlds is one moment) ----------------
  const chIdx = id => S.chapters.findIndex(c => c.id === id);
  function build() {
    const [wl, wr] = S.pair,
      sides =
        S.side === 'both'
          ? [
              ['L', wl],
              ['R', wr],
            ]
          : [[S.side, S.side === 'R' ? wr : wl]],
      map = new Map();
    for (const [s, w] of sides) {
      if (!w) continue;
      for (const e of C.events(w) || []) {
        let m = map.get(e.id);
        if (!m) {
          m = {
            id: e.id,
            t: Number.isFinite(e.t) ? e.t : C.yf(e.y, e.doy, e.hour),
            y: e.y,
            doy: e.doy,
            hour: e.hour,
            chapter: e.chapter,
            kind: e.kind,
            place: e.place,
            halt: e.halt || 0,
            dur: e.dur || 0,
            weather: e.weather || null,
            same: !!e.same,
            title: e.title,
            text: e.text,
            fork: e.fork || null,
            L: null,
            R: null,
            n: map.size,
            info: null,
          };
          map.set(e.id, m);
        }
        m[s] = e;
      }
    }
    S.tl = [...map.values()].sort((a, b) => chIdx(a.chapter) - chIdx(b.chapter) || a.t - b.t || a.n - b.n);
  }
  const evOf = m => m.L || m.R;
  function linesOf(m) {
    const out = [],
      add = (e, s) => {
        if (e && Array.isArray(e.lines))
          for (const l of e.lines) out.push({ id: l.id, who: l.who, text: l.text, side: s, w: e.w });
      };
    if (m.L && m.R && m.same) add(m.L, 'both');
    else {
      add(m.L, m.R ? 'L' : S.side === 'R' ? 'R' : 'L');
      add(m.R, 'R');
    }
    return out;
  }
  function info(m) {
    if (!m) return null;
    if (m.info) return m.info;
    const one = e => (e ? { title: e.title, text: e.text, fork: e.fork || null, w: e.w } : null);
    m.info = {
      id: m.id,
      title: m.title,
      text: m.text,
      kind: m.kind,
      chapter: m.chapter,
      y: m.y,
      doy: m.doy,
      hour: m.hour,
      t: m.t,
      place: m.place,
      placeLabel: (C.PLACES && C.PLACES[m.place]) || m.place,
      halt: m.halt,
      dur: m.dur,
      weather: m.weather,
      same: m.same,
      fork: m.fork,
      side: m.L && m.R ? 'both' : m.L ? (S.side === 'R' ? 'R' : 'L') : 'R',
      L: one(m.L),
      R: one(m.R),
    };
    return m.info;
  }
  const shown = () => (S.side === 'both' ? S.pair.slice(0, 2) : [S.side === 'R' ? S.pair[1] : S.pair[0]]);
  // ---------------- clock, calendar, weather ----------------
  // game day d0 (the day the journey started on) is 1 January of the span's first year; the date moves through CLOCK.t
  function clockAt(yf, hour) {
    const d = C.date(yf),
      h = hour == null ? d.hour : hour,
      e = Date.UTC(d.y, 0, 1) / 864e5 + (d.doy - 1),
      t = (S.d0 + (e - S.E0)) * 1440 + Math.round(h * 600) / 10;
    return t;
  }
  function setClock(t) {
    if (Math.abs(CLOCK.t - t) < 0.5) return;
    CLOCK.t = t;
    S.dnDue = true;
  }
  function weather(name) {
    if (name === S.wx) return;
    S.wx = name;
    try {
      WETTER.preset(name || null);
    } catch (e) {}
  }
  function dnNow() {
    S.dnDue = false;
    S.dnT = S.rt;
    try {
      if (DN.active) DN.update(true);
    } catch (e) {}
  }
  // ---------------- camera ----------------
  const _p = new THREE.Vector3(),
    _l = new THREE.Vector3();
  function shotOf(id, still) {
    const a = ZKORTE.pose(id, W);
    return { id, a, b: still ? null : ZKORTE.moved(a), t: 0, T: PLACE_S, hold: !!still };
  }
  function setShot(sh) {
    S.shot = sh;
    S.place = sh.id;
    // the sun's shadow box follows the orbit target (game/game.js): a point 8 m ahead on foot, the look point from above
    const a = sh.a,
      dx = a.look[0] - a.pos[0],
      dy = a.look[1] - a.pos[1],
      L = Math.hypot(dx, dy) || 1;
    P.tgt = a.foot ? [a.pos[0] + (dx / L) * 8, a.pos[1] + (dy / L) * 8, a.pos[2] - ZKORTE.EYE] : a.look.slice();
    markDirty(true);
    emit({ type: 'place', place: sh.id, label: (C.PLACES && C.PLACES[sh.id]) || a.label });
  }
  // cut to a place: a cross-fade from the frame now on screen (o.hard: none); o.swap runs when the new view is set (clock, weather)
  function cutTo(id, o = {}) {
    const sh = shotOf(id, o.still),
      gen = S.gen;
    ZKBILD.cut(
      () => {
        if (gen !== S.gen || !S.on) return;
        setShot(sh);
        if (o.swap) o.swap();
      },
      { hard: !!o.hard }
    );
  }
  function poseNow() {
    const s = S.shot;
    if (!s) return null;
    const a = s.a,
      b = s.b,
      k = b ? ease(clamp(s.t / s.T)) : 0,
      m = (u, v) => [u[0] + (v[0] - u[0]) * k, u[1] + (v[1] - u[1]) * k, u[2] + (v[2] - u[2]) * k];
    return b ? { pos: m(a.pos, b.pos), look: m(a.look, b.look), fov: a.fov, near: a.near } : a;
  }
  function applyPose(q) {
    const fov = q.fov * (S.side === 'both' ? ZKORTE.FOV_SPLIT : 1);
    cam.near = q.near || 0.1;
    cam.far = FAR0();
    cam.fov = fov;
    cam.updateProjectionMatrix();
    cam.position.copy(_p.set(q.pos[0], q.pos[2], -q.pos[1]));
    cam.up.set(0, 1, 0);
    cam.lookAt(_l.set(q.look[0], q.look[2], -q.look[1]));
  }
  // the hook in game/camera.js applyCam: while the journey runs, the camera is ours
  function camSet() {
    if (!S.on || !S.shot) return false;
    applyPose(poseNow());
    return true;
  }
  // ---------------- voices ----------------
  const cap = s => String(s || '').replace(/^./, c => c.toUpperCase());
  function person(key) {
    if (!key || STIMME.profile(key)) return;
    const w = (C.WHO || {})[key];
    STIMME.person(key, {
      name: w ? w.name : cap(key),
      g: FEM.has(key) ? 'f' : 'm',
      age: w && w.born ? clamp(Math.floor(S.y) - w.born, 18, 90) : 50,
    });
  }
  function sayLine(l) {
    const key = String(l.who || '')
        .toLowerCase()
        .replace(/[^a-zäöüß]/g, ''),
      w = (C.WHO || {})[key],
      name = w ? w.name : cap(l.who);
    S.lineLeft = Math.max(2.4, 1.0 + String(l.text || '').length * 0.068);
    S.line = { id: l.id, who: name, key, role: w ? w.role : '', text: l.text, side: l.side, w: l.w, dur: S.lineLeft };
    S.voiceOn = false;
    emit({
      type: 'line',
      id: l.id,
      who: name,
      text: l.text,
      key,
      role: S.line.role,
      side: l.side,
      w: l.w,
      dur: S.lineLeft,
    });
    try {
      person(key);
      if (STIMME.speaks(key, l.text)) {
        S.voiceOn = true;
        const g = ++S.lineGen,
          gen = S.gen,
          off = () => {
            if (g === S.lineGen && gen === S.gen) S.voiceOn = false;
          };
        Promise.race([STIMME.say(key, l.text), new Promise(r => setTimeout(r, (S.lineLeft + 15) * 1000))]).then(
          off,
          off
        );
      }
    } catch (e) {
      S.voiceOn = false;
    }
  }
  function hush() {
    S.lineGen++;
    if (S.voiceOn || S.line)
      try {
        STIMME.stop();
      } catch (e) {}
    S.voiceOn = false;
    S.line = null;
  }
  // ambience under a voice, ambience and voices under the media's sound (zeitreise-medien: duck(level))
  function ducking() {
    let r = null;
    try {
      r = audio.raw();
    } catch (e) {}
    if (!r) return;
    const t = r.ctx.currentTime,
      amb = Math.min(S.line || S.voiceOn ? 0.35 : 1, S.mediaDuck);
    // audio.js sets the ambience gain every frame (inside/outside); this tick runs after it, so the lower target wins while it applies
    if (amb < 0.999) r.amb.gain.setTargetAtTime(amb, t, 0.2);
    if (Math.abs(S.voxSet - S.mediaDuck) > 1e-3) {
      S.voxSet = S.mediaDuck;
      r.vox.gain.setTargetAtTime(S.mediaDuck, t, 0.2);
    }
  }
  // ---------------- hooks of the media (phone before a halt, radio between chapters) ----------------
  function hooks(set, arg, then) {
    const fns = [...set];
    if (!fns.length) return then();
    const id = ++S.waitId,
      gen = S.gen,
      rs = [];
    S.wait = { id, done: false, then, t: 0 };
    for (const f of fns)
      try {
        rs.push(Promise.resolve(f(arg)).catch(() => null));
      } catch (e) {
        console.warn('ZKREGIE hook', e);
      }
    Promise.race([Promise.all(rs), new Promise(r => setTimeout(r, HOOK_MAX))]).then(() => {
      if (gen === S.gen && S.wait && S.wait.id === id) S.wait.done = true;
    });
  }
  function waitTick(dt) {
    const w = S.wait;
    if (!w) return;
    w.t += dt;
    if (w.t * 1000 > HOOK_MAX + 1000) w.done = true; // tick time as a second clock (a test steps the world by hand)
    if (w.done && S.playing) {
      S.wait = null;
      w.then();
    }
  }
  // ---------------- the flow ----------------
  function enterChapter(i, y, o = {}) {
    hush();
    S.wait = null;
    S.pre = null;
    S.pend = null;
    S.ev = null;
    S.card = null;
    S.note = null;
    S.ci = clamp(i, 0, S.chapters.length - 1);
    S.ch = S.chapters[S.ci];
    const ch = S.ch;
    S.y = y == null ? ch.from : clamp(+y, ch.from, ch.to);
    S.evs = S.tl.filter(m => m.chapter === ch.id);
    S.ni = S.evs.findIndex(m => (y == null ? m.t >= S.y - 1e-9 : m.t > S.y));
    if (S.ni < 0) S.ni = S.evs.length;
    S.mode = 'lapse';
    S.segT = 0;
    S.lapseHour = ch.hour ?? HOUR[ch.id] ?? 12;
    S.lapseWx = ch.weather ?? WX[ch.id] ?? 'heiter';
    const places = ch.places && ch.places.length ? ch.places : ['anger'];
    S.pi = 0;
    cutTo(places[0], {
      hard: o.hard,
      swap: () => {
        weather(S.lapseWx);
        setClock(clockAt(S.y, S.lapseHour));
        dnNow();
      },
    });
    emit({
      type: 'chapter',
      chapter: ch.id,
      title: ch.title,
      sub: ch.sub || '',
      index: S.ci,
      from: ch.from,
      to: ch.to,
    });
  }
  function pass(m, quiet) {
    if (!quiet) S.note = { id: m.id, title: m.title, text: m.text, kind: m.kind, until: S.rt + 5 };
    emit({ type: 'event', ev: info(m), state: 'pass', skipped: !!quiet });
  }
  function lapse(dt) {
    const ch = S.ch,
      yps = S.spd / SPY;
    let k = S.ni;
    while (k < S.evs.length && !(S.evs[k].halt > 0)) k++;
    const nx = S.evs[k];
    let v = yps;
    if (nx) {
      const d = nx.t - S.y,
        D = yps * EASE_S;
      if (d < D) v = yps * Math.max(0.06, d / D);
    }
    const y1 = S.y + v * dt;
    while (S.ni < S.evs.length && S.evs[S.ni].t <= y1) {
      const m = S.evs[S.ni];
      if (m.halt > 0) {
        S.y = m.t;
        enterEvent(m);
        return;
      }
      pass(m);
      S.ni++;
    }
    if (y1 >= ch.to) {
      S.y = ch.to;
      enterCard();
      return;
    }
    S.y = y1;
    // the time of day stays, the days advance
    setClock(clockAt(S.y, S.lapseHour));
    // the next place after a while
    const s = S.shot;
    if (s && s.t >= s.T && !ZKBILD.S.cut) {
      const places = ch.places && ch.places.length ? ch.places : ['anger'];
      if (places.length > 1) {
        S.pi = (S.pi + 1) % places.length;
        cutTo(places[S.pi]);
      } else s.t = s.T;
    }
  }
  // an event with a halt: the clock goes on to its hour and its weather comes, then the media's before() hooks, then the halt
  function enterEvent(m) {
    hush();
    S.mode = 'prelude';
    S.pend = m;
    S.segT = 0;
    S.note = null;
    const t1 = clockAt(C.at(evOf(m), 0)),
      cur = CLOCK.t,
      // forward to the event's hour: from the clock as it is when the event follows soon (the morning after a night), else from the
      // time-lapse's hour of that day (the evening falls, the night comes)
      from = t1 - cur > 0 && t1 - cur < 1.5 * 1440 ? cur : t1 - ((((m.hour - S.lapseHour) % 24) + 24) % 24) * 60,
      h = (t1 - from) / 60;
    S.pre = { t: 0, T: h > 1 ? clamp(1.2 + h * 0.08, 1.2, 2.8) : 0.9, from, to: t1 };
    weather(m.weather || S.lapseWx);
    emit({ type: 'event', ev: info(m), state: 'prelude' });
  }
  function prelude(dt) {
    const p = S.pre;
    p.t += dt;
    const k = ease(clamp(p.t / p.T));
    setClock(p.from + (p.to - p.from) * k);
    if (p.t >= p.T) {
      S.pre = null;
      enterBefore(S.pend);
    }
  }
  function enterBefore(m) {
    S.mode = 'before';
    S.ev = m;
    setClock(clockAt(C.at(evOf(m), 0)));
    emit({ type: 'event', ev: info(m), state: 'before' });
    const w = S.side === 'both' ? 'both' : shown()[0];
    hooks(befores, { ev: info(m), w, worlds: shown(), side: S.side, place: m.place }, () => enterHalt(m));
  }
  function enterHalt(m) {
    S.mode = 'halt';
    S.ev = m;
    S.pend = null;
    S.ht = 0;
    S.phase = 0;
    S.segT = 0;
    S.hdur = Math.max(m.halt || 0, 4);
    S.lines = linesOf(m);
    S.li = -1;
    S.nextLineT = 1.2;
    S.wkey = '';
    try {
      const e = evOf(m),
        st = C.state(e.w, C.at(e, 0));
      S.rainEv = !!(st && st.water && st.water.rain);
    } catch (err) {
      S.rainEv = false;
    }
    hush();
    // a phone photo of this place was taken for the media: they dissolve it into the live view themselves – a hard cut under it
    const hard = S.snapFor === m.place;
    S.snapFor = null;
    cutTo(m.place, {
      still: true,
      hard,
      swap: () => {
        weather(m.weather || S.lapseWx);
        setClock(clockAt(C.at(evOf(m), 0)));
        dnNow();
      },
    });
    emit({ type: 'event', ev: info(m), state: 'start' });
  }
  function halt(dt) {
    S.ht += dt;
    S.phase = clamp(S.ht / S.hdur);
    const m = S.ev;
    if (m.dur > 0) setClock(clockAt(C.at(evOf(m), S.phase)));
    if (S.line) {
      S.lineLeft -= dt;
      if (S.lineLeft <= 0 && !S.voiceOn) {
        S.line = null;
        S.nextLineT = S.ht + 0.7;
      }
    } else if (S.li + 1 < S.lines.length && S.ht >= S.nextLineT) sayLine(S.lines[++S.li]);
    if (S.ht >= S.hdur && !S.line && S.li + 1 >= S.lines.length) endHalt();
  }
  function endHalt() {
    const m = S.ev;
    hush();
    S.ev = null;
    S.phase = 0;
    S.mode = 'lapse';
    S.segT = 0;
    if (m) {
      const k = S.evs.indexOf(m);
      if (k >= 0) S.ni = Math.max(S.ni, k + 1);
      emit({ type: 'event', ev: info(m), state: 'end' });
      // the next halt follows within a day and a half of story time (the morning after the night): straight on, from here
      const k2 = haltIdx(S.ni, S.evs.length),
        n = S.evs[k2];
      if (n && n.t - C.at(evOf(m), 1) < 1.5 / 365) {
        for (let j = S.ni; j < k2; j++) pass(S.evs[j], true);
        S.ni = k2;
        S.y = n.t;
        return enterEvent(n);
      }
    }
    const ch = S.ch,
      places = ch.places && ch.places.length ? ch.places : ['anger'];
    S.pi = (S.pi + 1) % places.length;
    cutTo(places[S.pi], {
      swap: () => {
        weather(S.lapseWx);
        setClock(clockAt(S.y, S.lapseHour));
        dnNow();
      },
    });
  }
  function enterCard() {
    hush();
    const ch = S.ch,
      ws = shown();
    S.mode = 'card';
    S.segT = 0;
    if (S.shot) S.shot.hold = true;
    setPlaying(false);
    const kpi = {};
    for (const w of ws)
      try {
        kpi[w] = C.kpi(w, ch.id) || [];
      } catch (e) {
        kpi[w] = [];
      }
    S.card = {
      chapter: ch.id,
      title: ch.title,
      sub: ch.sub || '',
      index: S.ci,
      last: S.ci >= S.chapters.length - 1,
      worlds: ws,
      kpi,
      questions: (ch.questions || []).slice(),
    };
    emit({ type: 'card', chapter: ch.id, card: S.card });
  }
  function leaveCard() {
    if (S.ci >= S.chapters.length - 1) return end();
    const nx = S.chapters[S.ci + 1];
    S.card = null;
    S.mode = 'between';
    S.segT = 0;
    hooks(
      betweens,
      {
        ev: null,
        w: S.side === 'both' ? 'both' : shown()[0],
        worlds: shown(),
        side: S.side,
        place: (nx.places || [])[0] || 'anger',
        chapter: nx.id,
        prev: S.ch.id,
      },
      () => enterChapter(S.ci + 1)
    );
  }
  function end() {
    hush();
    S.card = null;
    S.mode = 'end';
    S.playing = false;
    emit({ type: 'end' });
  }
  // ---------------- per frame (after everything else: the clock, the sky, the sound have run) ----------------
  function tick(dt) {
    if (!S.on) return;
    dt = Math.min(dt, 0.1);
    S.rt += dt;
    if (S.playing) {
      S.segT += dt;
      if (S.mode === 'lapse') lapse(dt);
      else if (S.mode === 'prelude') prelude(dt);
      else if (S.mode === 'halt') halt(dt);
      const s = S.shot;
      if (s && !s.hold && (S.mode === 'lapse' || S.mode === 'prelude' || S.mode === 'before')) s.t += dt;
    }
    waitTick(dt);
    if (S.note && S.rt > S.note.until) S.note = null;
    world();
    ZKBILD.tick(dt);
    // the sky follows the date at once in the time-lapse (its own tick looks every 0.2 s: the sun jumped)
    if (S.dnDue && S.rt - S.dnT > 0.04) {
      S.dnDue = false;
      S.dnT = S.rt;
      try {
        if (DN.active) DN.update(false);
      } catch (e) {}
    }
    shadows();
    ducking();
    TICK.y = S.y;
    TICK.phase = S.mode === 'halt' ? S.phase : 0;
    TICK.mode = S.mode;
    TICK.playing = S.playing;
    emit(TICK);
    markDirty();
  }
  function world() {
    const [wl, wr] = S.pair,
      m = S.mode === 'halt' || S.mode === 'before' ? S.ev : null,
      yf = m ? C.at(evOf(m), S.mode === 'halt' ? S.phase : 0) : S.y;
    try {
      // the states only when the time or the shown worlds changed (state() is ~0.07 ms per world)
      const key = S.side + ':' + yf;
      if (key !== S.wkey) {
        S.wkey = key;
        S.stL = S.side !== 'R' && wl ? C.state(wl, yf) : null;
        S.stR = S.side !== 'L' && wr ? C.state(wr, yf) : null;
        if (S.side === 'both') W.set(S.stL, S.stR);
        else W.set(S.side === 'R' ? S.stR : S.stL, null);
        // a storm cell that has passed in the chronicle (water.rain null again): the rain stops, the sky stays grey
        if (m && S.mode === 'halt' && S.rainEv) {
          const wet = (S.stL && S.stL.water && S.stL.water.rain) || (S.stR && S.stR.water && S.stR.water.rain);
          weather(wet ? m.weather : 'bedeckt');
        }
      }
      if (S.rt - S.sndT > 0.25) {
        S.sndT = S.rt;
        W.sound(S.stL, S.side === 'both' ? S.stR : null, S.side);
      }
    } catch (e) {
      if (!S.werr) {
        S.werr = 1;
        console.warn('ZKREGIE world', e);
      }
    }
  }
  // the sun's shadow map: in the time-lapse at most twice a second (the sun's height changes with the days – every frame a new map)
  function shadows() {
    const lapse = S.playing && (S.mode === 'lapse' || S.mode === 'prelude');
    if (DIRTY.shadow && lapse && S.rt - S.shadowT < 0.5) {
      DIRTY.shadow = false;
      S.shadowOwed = true;
    } else if (DIRTY.shadow) S.shadowT = S.rt;
    if (S.shadowOwed && (!lapse || S.rt - S.shadowT >= 0.5)) {
      S.shadowOwed = false;
      S.shadowT = S.rt;
      DIRTY.shadow = true;
    }
  }
  KERN.tick(tick, 'zukunft/zk_regie', { late: true });
  // ---------------- start and stop ----------------
  function start(o = {}) {
    if (S.on) stop();
    const pair =
      Array.isArray(o.pair) && o.pair.length ? o.pair.slice(0, 2) : (C.PAIRS && C.PAIRS[0]) || ['allein', 'gewappnet'];
    S.pair = pair.slice();
    S.split = S.pair.length > 1 && o.split !== false;
    S.side = S.split ? 'both' : o.side === 'R' && S.pair.length > 1 ? 'R' : 'L';
    S.gen++;
    S.on = true;
    S.playing = o.play !== false;
    S.spd = clamp(+o.speed || 1, 0.1, 20);
    S.rt = 0;
    S.wx = undefined;
    S.mediaDuck = 1;
    S.voxSet = 1;
    S.werr = 0;
    S.wkey = '';
    S.rainEv = false;
    // everything that is put back at the end
    let wx = null;
    try {
      wx = WETTER.state().preset || null;
    } catch (e) {}
    S.back = {
      t: CLOCK.t,
      e0: DN.e0,
      light: MODE,
      wx,
      mode: P.mode,
      x: P.x,
      y: P.y,
      feet: P.feet,
      yaw: P.yaw,
      pitch: P.pitch,
      az: P.az,
      el: P.el,
      r: P.r,
      tgt: Array.isArray(P.tgt) ? P.tgt.slice() : [0, 0, 0],
      tx: P.tx,
      ty: P.ty,
      th: P.th,
      eyeH: P.eyeH,
      stance: P.stance,
      c3: CAM3.cur,
      c3s: CAM3.sideCur,
      mask: cam.layers.mask,
    };
    SAVE.set(KS, { v: 1, t: S.back.t, e0: S.back.e0 });
    // the calendar: game day d0 (today's day count) becomes 1 January of the span's first year
    S.d0 = Math.floor(CLOCK.t / 1440);
    S.E0 = Date.UTC((C.SPAN || [2026])[0], 0, 1) / 864e5;
    DN.e0 = S.E0 - S.d0;
    if (MODE !== 'auto') setMode('auto');
    // the view: the model view's mode (no walking, the clock runs only when told), our camera over it
    KERN.spot('_zeitreise', { mode: 'orbit', az: P.az, el: P.el, r: P.r, label: 'Zeitreise' });
    go('_zeitreise');
    CAMSET.fn = camSet;
    ZKBILD.on(true, { bars: o.bars, instant: o.instant });
    ZKBILD.set({ split: S.split, side: S.side === 'R' ? 'R' : 'L' });
    try {
      W.warm();
    } catch (e) {
      console.warn('ZKZEITWELT.warm', e);
    }
    S.chapters = (C.CHAPTERS || []).slice();
    build();
    const ci = Math.max(
      0,
      S.chapters.findIndex(c => c.id === o.chapter)
    );
    enterChapter(ci, null, { hard: true });
    emit({ type: 'play', playing: S.playing });
  }
  function stop() {
    if (!S.on) return;
    hush();
    S.gen++;
    S.on = false;
    S.playing = false;
    S.mode = 'off';
    S.wait = null;
    S.pre = null;
    CAMSET.fn = null;
    ZKBILD.on(false);
    try {
      W.clear();
    } catch (e) {
      console.warn('ZKZEITWELT.clear', e);
    }
    try {
      const r = audio.raw();
      if (r) {
        r.vox.gain.setTargetAtTime(1, r.ctx.currentTime, 0.1);
        r.amb.gain.setTargetAtTime(1, r.ctx.currentTime, 0.2);
      }
    } catch (e) {}
    const b = S.back;
    if (b) {
      try {
        DN.e0 = b.e0;
        CLOCK.t = b.t;
        WETTER.preset(b.wx);
        if (b.light !== MODE) setMode(b.light);
      } catch (e) {
        console.warn('ZKREGIE restore', e);
      }
      if (b.mode === 'walk')
        KERN.spot('_zeitreise_zurueck', {
          mode: 'walk',
          pos: [b.x, b.y],
          z: b.feet,
          yaw: b.yaw,
          pitch: b.pitch,
          label: 'Zurück',
        });
      else KERN.spot('_zeitreise_zurueck', { mode: b.mode, az: b.az, el: b.el, r: b.r, label: 'Zurück' });
      go('_zeitreise_zurueck');
      P.tgt = b.tgt;
      if (b.mode === 'walk') {
        P.eyeH = b.eyeH;
        P.stance = b.stance;
      }
      CAM3.cur = b.c3;
      CAM3.sideCur = b.c3s;
      if (b.mode === 'top') {
        P.tx = b.tx;
        P.ty = b.ty;
        P.th = b.th;
      }
      cam.layers.mask = b.mask;
      try {
        if (DN.active) DN.update(true);
      } catch (e) {}
    }
    SAVE.set(KS, null);
    S.back = null;
    S.ev = S.pend = S.card = S.note = S.shot = null;
    S.place = null;
    S.ch = null;
    S.ci = -1;
    markDirty(true);
    emit({ type: 'end', stopped: true });
  }
  KERN.on('reset', () => stop());
  // ---------------- the presenter's controls ----------------
  function play() {
    if (!S.on || S.mode === 'end') return;
    if (S.mode === 'card') leaveCard();
    if (S.mode !== 'end') setPlaying(true);
  }
  function setPlaying(v) {
    if (S.playing === v) return;
    S.playing = v;
    emit({ type: 'play', playing: v });
    markDirty();
  }
  function pause() {
    if (S.on) setPlaying(false);
  }
  function toggle() {
    if (S.playing) pause();
    else play();
  }
  const haltIdx = (from, to) => {
    for (let k = from; k < to; k++) if (S.evs[k].halt > 0) return k;
    return -1;
  };
  const lastHalt = before => {
    for (let k = Math.min(before, S.evs.length) - 1; k >= 0; k--) if (S.evs[k].halt > 0) return k;
    return -1;
  };
  function replay(k) {
    const m = S.evs[k];
    if (!m) return enterChapter(S.ci);
    hush();
    S.wait = null;
    S.pre = null;
    S.ev = null;
    S.card = null;
    S.mode = 'lapse';
    S.ni = k;
    S.y = m.t;
    enterEvent(m);
  }
  function next() {
    if (!S.on) return;
    const md = S.mode;
    if (md === 'lapse') {
      const k = haltIdx(S.ni, S.evs.length);
      if (k >= 0) {
        for (let j = S.ni; j < k; j++) pass(S.evs[j], true);
        S.ni = k;
        S.y = S.evs[k].t;
        enterEvent(S.evs[k]);
      } else {
        S.y = S.ch.to;
        enterCard();
      }
    } else if (md === 'prelude') {
      S.pre = null;
      enterBefore(S.pend);
      if (S.wait) S.wait.done = true;
    } else if (md === 'before' || md === 'between') {
      if (S.wait) S.wait.done = true;
    } else if (md === 'halt') endHalt();
    else if (md === 'card') leaveCard();
    if (S.mode !== 'end') setPlaying(true);
    markDirty();
  }
  function prev() {
    if (!S.on) return;
    const recent = S.segT < 3,
      md = S.mode;
    if (md === 'prelude' || md === 'before' || md === 'halt') {
      const k = S.evs.indexOf(S.ev || S.pend);
      if (!recent && k >= 0) return replay(k);
      const k2 = lastHalt(k < 0 ? S.ni : k);
      return k2 >= 0 ? replay(k2) : enterChapter(S.ci);
    }
    if (md === 'card' || md === 'between' || md === 'end') {
      if (md === 'between') {
        S.wait = null;
        return enterCard();
      }
      if (md === 'end') return enterCard();
      const k = lastHalt(S.evs.length);
      return k >= 0 ? replay(k) : enterChapter(S.ci);
    }
    // the time-lapse: back to the last stop behind it (or the one before when it just ended), else the chapter's start or the one before
    const k = lastHalt(S.ni);
    if (k >= 0) {
      if (!recent) return replay(k);
      const k2 = lastHalt(k);
      return k2 >= 0 ? replay(k2) : enterChapter(S.ci);
    }
    if (recent && S.ci > 0) return enterChapter(S.ci - 1);
    enterChapter(S.ci);
  }
  function seek(y) {
    if (!S.on || !S.chapters.length) return;
    const span = C.SPAN || [2026, 2060];
    y = clamp(+y || span[0], span[0], span[1]);
    let i = S.ch && y >= S.ch.from && y <= S.ch.to ? S.ci : S.chapters.findIndex(c => y >= c.from && y < c.to);
    if (i < 0) i = S.chapters.length - 1;
    enterChapter(i, y);
  }
  function speed(s) {
    if (s !== undefined) S.spd = clamp(+s || 1, 0.1, 20);
    return S.spd;
  }
  // one world or both (keeps the year and the chapter)
  function split(v) {
    if (!S.on) return S.split;
    v = !!v && S.pair.length > 1;
    if (v === S.split) return v;
    S.split = v;
    S.side = v ? 'both' : 'L';
    ZKBILD.set({ split: v, side: 'L' });
    build();
    const y = S.y;
    enterChapter(S.ci, y);
    return v;
  }
  function side(s) {
    if (!S.on || S.split) return S.side;
    S.side = s === 'R' && S.pair.length > 1 ? 'R' : 'L';
    ZKBILD.set({ side: S.side });
    build();
    enterChapter(S.ci, S.y);
    return S.side;
  }
  // ---------------- for the media helper ----------------
  function snapshot(placeId, sd) {
    if (!S.on) return Promise.reject(new Error('Zeitreise läuft nicht'));
    const id = placeId || S.place || 'anger',
      q = ZKORTE.pose(id, W),
      s = sd === 'R' || sd === 'L' ? sd : S.side === 'R' ? 'R' : 'L';
    if ((S.mode === 'before' || S.mode === 'prelude') && (S.ev || S.pend) && (S.ev || S.pend).place === id)
      S.snapFor = id;
    return ZKBILD.stillOf(q, s, applyPose);
  }
  function duck(level) {
    S.mediaDuck = clamp(level == null ? 1 : +level);
    return S.mediaDuck;
  }
  const off = set => fn => {
    if (typeof fn !== 'function') return () => {};
    set.add(fn);
    return () => set.delete(fn);
  };
  // tests and the workshop's preview: stand at a place (the time-lapse pauses there)
  function view(id, o = {}) {
    if (!S.on) return null;
    const sh = shotOf(id, o.still !== false);
    setShot(sh);
    return sh.a;
  }
  function state() {
    const m = S.mode === 'halt' || S.mode === 'before' ? S.ev : null,
      d = C.date(m ? C.at(evOf(m), S.mode === 'halt' ? S.phase : 0) : S.y);
    return {
      on: S.on,
      pair: S.pair.slice(),
      split: S.split,
      side: S.side,
      worlds: shown(),
      chapter: S.ch ? S.ch.id : null,
      chapterIndex: S.ci,
      y: S.y,
      date: { y: d.y, doy: d.doy, hour: m ? d.hour : S.lapseHour },
      ev: m ? info(m) : null,
      next: S.mode === 'prelude' && S.pend ? info(S.pend) : null,
      phase: S.mode === 'halt' ? S.phase : 0,
      playing: S.playing,
      place: S.place,
      placeLabel: S.place ? (C.PLACES && C.PLACES[S.place]) || S.place : null,
      card: S.card,
      mode: S.mode,
      speed: S.spd,
      line: S.line ? { ...S.line } : null,
      note: S.note ? { ...S.note } : null,
      waiting: !!S.wait,
      bars: ZKBILD.S.want,
      span: (C.SPAN || [2026, 2060]).slice(),
    };
  }
  const API = {
    start,
    play,
    pause,
    toggle,
    next,
    prev,
    seek,
    speed,
    stop,
    state,
    on: off(subs),
    before: off(befores),
    between: off(betweens),
    snapshot,
    duck,
    split,
    side,
    bars: k => (ZKBILD.set({ bars: k }), ZKBILD.S.want),
    view,
    places: () => ZKORTE.ids(),
    pose: id => ZKORTE.pose(id, W),
    info: () => ({
      bild: ZKBILD.info,
      mode: S.mode,
      shot: S.shot
        ? { id: S.shot.id, t: +S.shot.t.toFixed(2), T: S.shot.T, hold: S.shot.hold, moving: !!S.shot.b }
        : null,
      clock: CLOCK.t,
      e0: DN.e0,
      wx: S.wx,
      lines: S.lines.length,
      li: S.li,
      voice: S.voiceOn,
      tl: S.tl.length,
      evs: S.evs.length,
      ni: S.ni,
      back: S.back ? { t: S.back.t, e0: S.back.e0, mode: S.back.mode, light: S.back.light, wx: S.back.wx } : null,
    }),
    S,
  };
  return API;
})();
window.ZKREGIE = ZKREGIE;
