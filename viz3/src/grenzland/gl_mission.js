// ===================== feat/grenzland-mission: the missions' runner in the world (GLMISSION) =====================
// Missions are data (grenzland/gl_kapitel1.js registers chapter 1 with GLMISSION.def): steps with a text for the task card, a target for
// the arrow and the radar, a check that finishes the step, what to set up when it begins and to take down when it ends. The rules – one
// mission runs, a failure goes back to the step's checkpoint, a reload goes on there – are pure (GLMLOGIK.runner, gl_mission_data.js);
// the state is GL.m / GL.cur (saved with the mode). Here is what the world needs around them:
//   the stage     what a mission puts into the world, declared per step (m.szene(i, A): A.fig, A.auto, A.ding) – kept from step to step
//                 while still named, dropped when no longer, when the mission ends or fails, when the mode stops; figures load when
//                 a step needs them; a rider sits on his moped, somebody sits on a bench
//   talks         subtitles with the speaker's name (GLHUD.sub), spoken where the player has voices on (STIMME.say 'gl_<castId>'), the
//                 figure talks and faces the player; „Weiter“ (E, the action button) skips a line
//   the journal   KERN.tasks.source 'grenzland': what is done, what runs (tracked: the task card shows text, arrow, distance), the next
//   checkpoints   fehl(big, small): a fade, the wanted level calm, the step's checkpoint again; an arrest (grenzland:nochmal) does the same
//   the end       the chapter's closing screen (what was done), then free play
// A step: { id, text | () => text, ort, ziel: S => [x, y] | null, cp: 'stepId', an(S, why), tick(dt, S) → true when done, aus(S, why),
//           ab(S) what its completion gives (also when skipped), rede: key of GLMDATA.R (the step is done when the talk is, unless it has a tick),
//           ev: { 'event': (data, S) => true when done }, nochmal: [big, small] shown when it starts again }
// A mission: { id, steps, szene(i, A), gabe() what it gave (for the debug jump), lohn: text of the reward, pause: seconds until the next,
//              abbruch() when it is broken off (the mode stops, the debug jump) }
//   GLMISSION.start(id) · cur() → id | '' · list() · tick(dt) · stop() · reset() · neu() · def(mission) · weiter() (skip a line)
//   GLMISSION.debug.go(id, step) · debug.skip() · debug.info()        (tests and Falko: every mission and step can be reached alone)
// Events: 'grenzland:mission' { id, st: 'läuft' | 'nochmal' | 'erledigt', titel, lohn }, 'grenzland:schritt' { id, i, schritt }.
import { scene, stage } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLHUD } from './gl_hud.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLLAGER } from './gl_lager.js';
import { GLMDATA, GLMLOGIK } from './gl_mission_data.js';
export const GLMISSION = (() => {
  const T = GLMDATA.T,
    hyp = Math.hypot;
  const M = []; // the missions in the story's order
  const St = {
    m: null, // the mission and the step that run
    step: null,
    S: {}, // the step's own scratch (fresh at each beginning)
    gen: 0, // counts every beginning and end: what was started asynchronously checks it
    talk: null,
    nextT: -1, // seconds until the next mission starts
    busy: false, // a failure's fade runs
    act: false,
    karte: false,
    endEl: null,
    xl: false, // the panel's extra button is ours
  };
  // ---------------- the stage ----------------
  const B = { figs: {}, autos: {}, dinge: {}, used: new Set() };
  const SITZ = 0.1; // how far the seat lies under the hips of a sitting figure
  const hip = F => (F.f && F.f.hipH) || 0.95;
  function setzen(e) {
    const F = e.F,
      [x, y, hd] = e.pos;
    GLFIG.place(F, x, y, hd);
    if (e.o.sitz != null) {
      if (F.f && 'mode' in F.f) F.f.mode = 'sit';
      F.z += e.o.sitz - hip(F) + SITZ;
      F.sitzt = true;
      F.g.position.y = F.z;
    }
  }
  const A = {
    // somebody of the cast at a place: kept while a step names him (not moved again unless o.neu), loaded when first named
    // o: { sitz: seat height (m), sees, r, knows, kleid, hut, era, karte: 'clique' | 'feind', ready: F => … , neu }
    fig(key, cast, x, y, hd = 0, o = {}) {
      let e = B.figs[key];
      B.used.add('f:' + key);
      if (e) {
        if (o.neu && e.F) {
          e.pos = [x, y, hd];
          e.o = Object.assign(e.o, o);
          setzen(e);
        }
        return e;
      }
      e = B.figs[key] = { key, cast, F: null, o, pos: [x, y, hd], fail: false };
      GLFIG.make(cast, { kleid: o.kleid, hut: o.hut, era: o.era || GL.era })
        .then(F => {
          if (!F) return void (e.fail = true);
          if (B.figs[key] !== e || !GL.on) return GLFIG.drop(F);
          e.F = F;
          F.era = o.era || GL.era;
          F.sees = !!o.sees;
          if (o.r) F.r = o.r;
          if (o.knows != null) F.knows = o.knows;
          setzen(e);
          if (o.ready) o.ready(F, e);
        })
        .catch(() => (e.fail = true));
      return e;
    },
    // a vehicle of the mode, parked: o as GLAUTO.spawn
    auto(key, typ, x, y, hd = 0, o = {}) {
      let e = B.autos[key];
      B.used.add('a:' + key);
      if (e) return e;
      let c = null;
      try {
        c = GLAUTO.spawn(GLAUTO.TYP[typ] ? typ : 'kasten', o);
        if (c) GLAUTO.park(c, x, y, hd);
      } catch (err) {
        console.warn('grenzland mission auto', typ, err);
      }
      return (B.autos[key] = { key, c, rider: null });
    },
    // a thing: make() → an Object3D (its geometries are freed when it goes; materials are shared ones)
    ding(key, make) {
      let e = B.dinge[key];
      B.used.add('d:' + key);
      if (e) return e;
      let o = null;
      try {
        o = make();
        if (o) scene.add(o);
      } catch (err) {
        console.warn('grenzland mission ding', key, err);
      }
      markDirty();
      return (B.dinge[key] = { key, o });
    },
    // a rider on his moped (both named before): he sits on it and goes where it goes
    reiter(figKey, autoKey) {
      const a = B.autos[autoKey];
      if (a) a.rider = figKey;
    },
  };
  function figWeg(key) {
    const e = B.figs[key];
    if (!e) return;
    delete B.figs[key];
    if (e.F) GLFIG.drop(e.F);
  }
  function autoWeg(key) {
    const e = B.autos[key];
    if (!e) return;
    delete B.autos[key];
    if (e.c)
      try {
        GLAUTO.remove(e.c);
      } catch (err) {}
  }
  function dingWeg(key) {
    const e = B.dinge[key];
    if (!e) return;
    delete B.dinge[key];
    if (e.o) {
      scene.remove(e.o);
      e.o.traverse(q => q.geometry && !q.userData.shared && q.geometry.dispose());
      markDirty();
    }
  }
  function leer() {
    for (const k of Object.keys(B.figs)) figWeg(k);
    for (const k of Object.keys(B.autos)) autoWeg(k);
    for (const k of Object.keys(B.dinge)) dingWeg(k);
  }
  // what step i of mission m needs stands, everything else of the stage goes
  function szene(m, i) {
    B.used = new Set();
    try {
      if (m.szene) m.szene(i, A, St.S);
    } catch (e) {
      console.warn('grenzland mission szene', m.id, i, e);
    }
    for (const k of Object.keys(B.figs)) if (!B.used.has('f:' + k)) figWeg(k);
    for (const k of Object.keys(B.autos)) if (!B.used.has('a:' + k)) autoWeg(k);
    for (const k of Object.keys(B.dinge)) if (!B.used.has('d:' + k)) dingWeg(k);
  }
  const F = key => (B.figs[key] && B.figs[key].F && !B.figs[key].F.gone ? B.figs[key].F : null);
  const C = key => (B.autos[key] && B.autos[key].c && !B.autos[key].c.gone ? B.autos[key].c : null);
  const D = key => (B.dinge[key] ? B.dinge[key].o : null);
  // riders follow their mopeds (after the figures' and the vehicles' own tick: the mode calls us later)
  function reiterTick() {
    for (const k in B.autos) {
      const a = B.autos[k],
        c = a.c,
        f = a.rider && F(a.rider);
      if (!c || !f) continue;
      if (f.f && 'mode' in f.f && f.f.mode !== 'sit') f.f.mode = 'sit';
      f.reitet = true;
      f.st = 'steht';
      f.path = null;
      f.hd = c.hd;
      f.x = c.x - Math.sin(c.hd) * 0.22;
      f.y = c.y - Math.cos(c.hd) * 0.22;
      f.z = c.z + 0.84 - hip(f) + SITZ;
      f.g.position.set(f.x, f.z, -f.y);
      f.g.rotation.set(0, -f.hd, 0);
      f.g.visible = c.g.visible;
    }
  }
  // off the moped again: he stands beside it
  function absteigen(autoKey) {
    const a = B.autos[autoKey],
      f = a && a.rider && F(a.rider);
    if (!a) return;
    a.rider = null;
    if (!f || !a.c) return;
    if (f.f && 'mode' in f.f) f.f.mode = 'stand';
    f.reitet = false;
    GLFIG.place(f, a.c.x + Math.cos(a.c.hd) * 0.8, a.c.y - Math.sin(a.c.hd) * 0.8, a.c.hd);
  }
  // ---------------- talks ----------------
  const partner = () => {
    try {
      return window.GRENZLAND ? window.GRENZLAND.partnerOf() : null;
    } catch (e) {
      return null;
    }
  };
  function figOf(who) {
    if (!who) return null;
    if (who === 'falko' || who === 'sarah') {
      const p = partner();
      return p && p.id === who && p.g.visible ? p : null;
    }
    for (const k in B.figs) if (B.figs[k].cast === who && F(k)) return F(k);
    return null;
  }
  // lines: a key of GLMDATA.R or [[who, text], …]; o: { done }
  function rede(key, o = {}) {
    const lines = typeof key === 'string' ? GLMDATA.R[key] : key;
    redeAus();
    if (!lines || !lines.length) return void (o.done && o.done());
    St.talk = {
      lines,
      i: -1,
      t: 0,
      T: 0,
      done: o.done || null,
      F: null,
      spoken: true,
      key: typeof key === 'string' ? key : '',
    };
    zeile();
  }
  function zeile() {
    const k = St.talk;
    if (!k) return;
    if (k.F) GLFIG.talking(k.F, false);
    k.F = null;
    k.i++;
    if (k.i >= k.lines.length) {
      St.talk = null;
      if (k.done) k.done();
      return;
    }
    const [who, text] = k.lines[k.i],
      c = GLDATA.CAST[who],
      f = figOf(who);
    k.T = GLMLOGIK.dauer(text) / 1000;
    k.t = 0;
    k.spoken = true;
    GLHUD.sub(who ? (c ? c.name : who) : '', text, k.T * 1000 + 500);
    if (f) {
      k.F = f;
      GLFIG.talking(f, true);
      if (f.st !== 'geht' && !f.sitzt && !f.reitet && !f.partner) GLFIG.face(f, P.x, P.y);
    }
    try {
      if (who && !window.FREEZE && STIMME.speaks('gl_' + who, text)) {
        const n = k.i,
          end = () => {
            if (St.talk === k && k.i === n) k.spoken = true;
          };
        k.spoken = false;
        STIMME.say('gl_' + who, text, f ? { at: [f.x, f.y] } : {}).then(end, end);
      }
    } catch (e) {
      k.spoken = true;
    }
  }
  function redeAus() {
    const k = St.talk;
    if (!k) return;
    St.talk = null;
    if (k.F) GLFIG.talking(k.F, false);
  }
  // skip the line that is being said
  function weiter() {
    if (!St.talk) return false;
    try {
      if (!St.talk.spoken) STIMME.stop();
    } catch (e) {}
    zeile();
    return true;
  }
  // ---------------- small helpers for the missions ----------------
  const wo = () => GLFAHNDUNG.wo();
  const dist = (a, b) => hyp(a[0] - b[0], a[1] - b[1]);
  // how far the player is from a place [x, y]
  const fern = p => {
    const w = wo();
    return hyp(w.x - p[0], w.y - p[1]);
  };
  const zuFuss = () => !VEH.cur && !PLAY.seated() && P.mode === 'walk';
  function hin(x, y, yaw = 0) {
    try {
      if (VEH.cur) VEH.exit();
      if (PLAY.seated()) PLAY.stand();
    } catch (e) {}
    if (window.GRENZLAND) window.GRENZLAND.hin(x, y, yaw);
    const p = partner();
    if (p && GL.folgt && !p.rides)
      GLFIG.place(
        p,
        x - Math.sin((yaw * Math.PI) / 180) * 1.3 + 0.6,
        y - Math.cos((yaw * Math.PI) / 180) * 1.3,
        (yaw * Math.PI) / 180
      );
  }
  // the clock forward to the next h:m
  function uhr(h, m = 0) {
    CLOCK.t += GLMLOGIK.bis(CLOCK.t, h, m);
    try {
      if (DN && DN.active) DN.update(true);
    } catch (e) {}
    markDirty(true);
  }
  // the panel's extra button for the running step (taken away when the step ends)
  function extra(label, fn) {
    St.xl = !!label;
    GLHUD.extra(label || null, label ? fn : null);
  }
  const denk = (t, ms) => PLAY.think(t, ms || 3200);
  // ---------------- the runner in the world ----------------
  const io = {
    enter(m, i, why) {
      St.gen++;
      St.m = m;
      St.step = m.steps[i];
      St.S = { t: 0, why };
      St.nextT = -1;
      const s = St.step;
      if (QUESTS.track !== 'grenzland:' + m.id) QUESTS.track = 'grenzland:' + m.id;
      if (why === 'start') {
        try {
          QUESTS.banner(T.neu, GLMDATA.M[m.id].title);
        } catch (e) {}
      }
      szene(m, i);
      try {
        if (s.an) s.an(St.S, why);
      } catch (e) {
        console.warn('grenzland mission an', m.id, s.id, e);
      }
      if (s.rede) {
        const S = St.S;
        rede(s.rede, { done: () => (S.geredet = true) });
      }
      markDirty();
    },
    leave(m, i, why) {
      const s = m.steps[i],
        S = St.S;
      St.gen++;
      if (why !== 'fertig') redeAus();
      try {
        if (s.aus) s.aus(S, why);
      } catch (e) {
        console.warn('grenzland mission aus', m.id, s.id, e);
      }
      if (why === 'fertig' || why === 'skip')
        try {
          if (s.ab) s.ab(S);
        } catch (e) {
          console.warn('grenzland mission ab', m.id, s.id, e);
        }
      if (St.xl) extra(null);
      GLHUD.hint('');
      if (why === 'abbruch')
        try {
          if (m.abbruch) m.abbruch();
        } catch (e) {}
      if (why === 'abbruch' || why === 'fehl') St.step = null;
    },
    emit(name, d) {
      if (name === 'mission' && d.st === 'erledigt') {
        const m = M.find(q => q.id === d.id);
        d = Object.assign({ titel: GLMDATA.M[d.id].title, lohn: (m && m.lohn) || '' }, d);
      } else if (name === 'schritt') {
        const m = M.find(q => q.id === d.id);
        d = Object.assign({ schritt: m && m.steps[d.i] ? m.steps[d.i].id : '' }, d);
      }
      GL.emit(name, d);
    },
    save: () => GL.save(true),
    done(m) {
      St.m = St.step = null;
      // what the mission's last picture needs may stay until the next one sets its own stage (or the chapter's closing screen comes)
      St.nextT = m.pause ?? 6;
    },
    gabe(m) {
      try {
        if (m.gabe) m.gabe();
      } catch (e) {}
    },
  };
  const R = GLMLOGIK.runner(M, GL, io);
  function def(m) {
    const i = M.findIndex(q => q.id === m.id);
    if (i >= 0) M[i] = m;
    else M.push(m);
    M.sort((a, b) => GLMDATA.ORDER.indexOf(a.id) - GLMDATA.ORDER.indexOf(b.id));
    return m;
  }
  // a failure: black, the wanted level calm, the checkpoint again
  async function fehl(a, b) {
    if (St.busy || !R.cur()) return;
    St.busy = true;
    redeAus();
    try {
      await GLHUD.fade(true, a || T.nochmal, b || '');
      if (GL.on && R.cur()) {
        GLFAHNDUNG.clear();
        R.fail(a || '');
      }
      await new Promise(res => setTimeout(res, window.FREEZE ? 0 : 900));
      await GLHUD.fade(false);
    } finally {
      St.busy = false;
    }
  }
  const text = (s, S) => {
    try {
      return typeof s.text === 'function' ? s.text(S) : s.text || '';
    } catch (e) {
      return '';
    }
  };
  // ---------------- the journal ----------------
  function list() {
    if (!GL.on) return [];
    return R.list().map(e => {
      const m = R.by(e.id),
        Dm = GLMDATA.M[e.id],
        s = m.steps[e.i],
        run = e.status === 'läuft' && St.step === s;
      let tgt = null,
        z = 0,
        ort = '';
      if (run && s.ziel) {
        const S = St.S;
        tgt = () => {
          try {
            return s.ziel(S) || null;
          } catch (err) {
            return null;
          }
        };
        const p = tgt();
        if (p) {
          z = p[2] != null ? p[2] : KERN.ground(p[0], p[1]);
          if (!Number.isFinite(z)) z = 0;
        } else tgt = null;
        ort = typeof s.ort === 'function' ? s.ort(S) : s.ort || '';
      }
      return {
        id: e.id,
        title: Dm.title,
        who: Dm.who,
        status: e.status,
        text: e.status === 'erledigt' ? Dm.done : e.status === 'offen' ? Dm.teaser : text(s, St.S),
        target: tgt,
        z,
        ort,
      };
    });
  }
  KERN.tasks.source({ id: 'grenzland', order: 4, list });
  // ---------------- the mode's interface ----------------
  function an() {
    // the haulier's yard stands in the fields while the mode runs
    try {
      GLLAGER.build();
    } catch (e) {}
    if (!St.act) {
      St.act = true;
      // „Weiter“: the action button skips the line that is being said
      KERN.act({
        id: 'gl:weiter',
        label: () => (GL.on && St.talk ? T.weiter : null),
        pos: () => [P.x, P.y, P.feet],
        r: 3,
        prio: 6,
        gest3: '',
        run: weiter,
      });
    }
    if (!St.karte && window.GLKARTE && window.GLKARTE.src) {
      St.karte = true;
      try {
        window.GLKARTE.src(out => {
          if (!GL.on) return;
          for (const k in B.figs) {
            const e = B.figs[k];
            if (e.F && e.o.karte && e.F.g.visible) out.push({ x: e.F.x, y: e.F.y, k: e.o.karte, name: e.F.name });
          }
          for (const w of GLLAGER.wachen || [])
            if (w.F && !w.F.gone) out.push({ x: w.F.x, y: w.F.y, k: 'feind', name: w.F.name });
        });
      } catch (e) {}
    }
  }
  // a fresh game: the first mission
  function neu() {
    an();
    leer();
    St.nextT = -1;
    if (M.length) R.start(M[0].id);
  }
  // after a reload: the running mission goes on (GL.cur), else the next of the story; with an id: that mission from its beginning
  function start(id) {
    an();
    if (id && R.by(id) && R.st(id) === 'läuft' && GL.cur === id) return R.resume();
    if (id && R.by(id) && !R.cur()) return R.start(id);
    GL.cur = '';
    if (R.allDone()) GL.kap1 = true;
    else St.nextT = 2.5;
    return false;
  }
  function stop() {
    const m = R.cur();
    if (m) io.leave(m, GL.m[m.id].i, 'abbruch');
    St.gen++;
    St.m = St.step = null;
    St.nextT = -1;
    St.busy = false;
    redeAus();
    leer();
    endeZu();
    if (St.act) {
      KERN.unact('gl:weiter');
      St.act = false;
    }
  }
  function reset() {
    stop();
  }
  function tick(dt) {
    if (!GL.on) return;
    reiterTick();
    const k = St.talk;
    if (k) {
      k.t += dt;
      if (k.t >= k.T && (k.spoken || k.t > k.T * 2 + 3)) zeile();
    }
    if (St.busy) return;
    if (St.nextT >= 0 && (St.nextT -= dt) < 0) {
      const nx = R.nextOpen();
      if (R.cur()) return;
      if (nx) R.start(nx.id);
      else if (!GL.kap1) {
        GL.kap1 = true;
        ende();
      }
      return;
    }
    const s = St.step,
      m = R.cur();
    if (!s || !m || St.m !== m) return;
    const S = St.S;
    S.t += dt;
    let done = false;
    try {
      if (s.tick) done = !!s.tick(dt, S);
      else if (s.rede) done = !!S.geredet;
    } catch (e) {
      if (!S.err) console.warn('grenzland mission tick', m.id, s.id, e);
      S.err = String((e && e.message) || e);
    }
    if (done && St.step === s && !St.busy) R.next();
  }
  // events for the running step; an arrest starts the checkpoint again
  KERN.on('*', (d, name) => {
    if (!GL.on || !St.step || St.busy) return;
    const s = St.step;
    if (name === 'grenzland:nochmal') {
      // an arrest starts the step's checkpoint again – where a step has one; elsewhere the story simply goes on the next morning
      if (!s.nochmal && s.cp == null && !s.erwischt) return;
      if (s.erwischt && s.erwischt(St.S, d) === false) return;
      const n = s.nochmal || [];
      fehl(n[0] || T.nochmal, n[1] || '');
      return;
    }
    const h = s.ev && s.ev[name];
    if (!h) return;
    let done = false;
    try {
      done = !!h(d || {}, St.S);
    } catch (e) {
      console.warn('grenzland mission ev', name, e);
    }
    if (done && St.step === s) R.next();
  });
  // ---------------- the closing screen of the chapter ----------------
  const CSS = `
#glende{position:absolute;inset:0;z-index:18;display:flex;align-items:center;justify-content:center;background:rgba(8,10,12,.82);color:#f1ead8;pointer-events:auto}
#glende[hidden]{display:none!important}
#glende .ge{width:min(520px,90vw);max-height:92vh;overflow:auto;padding:22px 24px;text-align:center}
#glende h2{margin:0 0 6px;font:700 clamp(24px,4.2vw,40px)/1.15 var(--f-display,Georgia,serif);color:#f3c64f;letter-spacing:.01em}
#glende p{margin:0 0 16px;font:400 15px/1.45 var(--f-body,system-ui);opacity:.94}
#glende table{width:100%;border-collapse:collapse;margin:0 0 16px;font:400 14px/1.3 var(--f-body,system-ui)}
#glende td{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.14);text-align:left}
#glende td:last-child{text-align:right;font:600 14px/1.3 var(--f-mono,monospace);color:#8fe08a}
#glende em{display:block;margin:0 0 16px;font:600 13px/1.3 var(--f-mono,monospace);font-style:normal;letter-spacing:.12em;text-transform:uppercase;opacity:.8}
#glende button{font:600 15px/1 var(--f-body,system-ui);padding:12px 22px;border-radius:999px;border:0;background:#f3c64f;color:#1a1608;cursor:pointer}
`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function ende() {
    if (!St.endEl) {
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
      const d = document.createElement('div');
      d.id = 'glende';
      d.hidden = true;
      (stage || document.body).appendChild(d);
      d.addEventListener('click', e => {
        if (e.target.closest('button')) endeZu();
      });
      St.endEl = d;
    }
    const rows = GLMLOGIK.bilanz(GL.stats)
      .concat([['Kasse', GL.geld + ' €']])
      .map(r => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>')
      .join('');
    St.endEl.innerHTML =
      '<div class="ge"><h2>' +
      esc(T.endeTitel) +
      '</h2><p>' +
      esc(T.endeText) +
      '</p><table>' +
      rows +
      '</table><em>' +
      esc(T.endeFort) +
      '</em><button type="button">' +
      esc(T.endeKnopf) +
      '</button></div>';
    St.endEl.hidden = false;
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) {}
    GL.emit('kapitel', { kap: 1, st: 'ende' });
  }
  function endeZu() {
    if (St.endEl && !St.endEl.hidden) {
      St.endEl.hidden = true;
      if (GL.on) denk(T.frei, 6000);
    }
  }
  // ---------------- tests and Falko ----------------
  const debug = {
    go: (id, step = 0) => {
      an();
      St.nextT = -1;
      return R.jump(id, step);
    },
    skip: () => R.next('skip'),
    info: () => ({
      cur: GL.cur,
      i: GL.cur && GL.m[GL.cur] ? GL.m[GL.cur].i : -1,
      n: GL.cur && GL.m[GL.cur] ? GL.m[GL.cur].n : 0,
      step: St.step ? St.step.id : '',
      text: St.step ? text(St.step, St.S) : '',
      t: Math.round(St.S.t * 10) / 10,
      err: St.S.err || '',
      talk: St.talk ? St.talk.key + ':' + St.talk.i : '',
      busy: St.busy,
      nextT: Math.round(St.nextT * 10) / 10,
      st: Object.fromEntries(M.map(m => [m.id, R.st(m.id)])),
      figs: Object.keys(B.figs).map(k => k + (F(k) ? '' : B.figs[k].fail ? '!' : '…')),
      autos: Object.keys(B.autos),
      dinge: Object.keys(B.dinge),
      ende: !!(St.endEl && !St.endEl.hidden),
    }),
  };
  return {
    start,
    cur: () => (R.cur() ? GL.cur : ''),
    list,
    tick,
    stop,
    reset,
    neu,
    def,
    weiter,
    debug,
    // for the missions (grenzland/gl_kapitel1.js)
    R,
    St,
    A,
    F,
    C,
    D,
    rede,
    redet: () => !!St.talk,
    fehl,
    wo,
    dist,
    fern,
    zuFuss,
    hin,
    uhr,
    extra,
    denk,
    partner,
    absteigen,
    figWeg,
    autoWeg,
    dingWeg,
    ende,
    endeZu,
    next: () => R.next(),
  };
})();
window.GLMISSION = GLMISSION;
