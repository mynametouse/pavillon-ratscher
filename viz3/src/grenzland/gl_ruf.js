// ===================== feat/grenzland-ruf: the village's opinion of the two (GLRUF) – a value per place, gossip in the chat and the feed =====================
// Falko, 17.11.2026 12:26 (chapter 2, stage 1 – „Das Dorf redet über euch“): people greet, whisper or call the police – after one's deeds;
// rumours at the inn and in the village chat. The rules and the words are grenzland/gl_ruf_data.js (GLRUFDATA, unit-tested); here:
//   the value   per place ('ratscher', 'schleusingen'), −100 … +100: a deed somebody saw ('grenzland:tat') takes from the place where it
//               happened (all of it when they know who it was, half when they only guess; a third at the other place), an arrest too;
//               a witness talked round gives half of it back; good deeds add (GLRUF.add from the side jobs of gl_jobs.js, an encounter
//               of `strasse`, a festival of `alltag`, the three decisions of chapter 2: grund 'entscheidung:<id>'); the four answers of
//               gl_reaktion.js a little. Every game day it drifts back towards 0. Saved under its own key 'pav-gl-ruf-v1'.
//   the steps   beliebt / neutral / misstrauisch / verhasst – what people do is gl_reaktion.js's (greet, whisper, turn away, film, call
//               the police); a change shows as a small line under the radar (GLHUD.ort) and goes out as 'grenzland:ruf'
//   gossip      what the village says about the two: a line in the village chat „Ratscher aktuell“ some way after the deed, now and then
//               a post in the feed (through the phone's adapter GLHANDY); what is talked about is kept (GLRUF.gerede()) for the people
//               who tell it at the shop on wheels, at the barn or at the inn (spoken in fixed fragments: gl_reaktion.js)
// Nothing runs before the mode starts, nothing in 1989 (another time, another village); „Beenden“ keeps the saved values.
//   GLRUF.wert(ort) · stufe(ort) · add(ort, n, grund) → the change · ortVon(x, y) · hier() · gerede() · erzaehlt(id, g) · platz(x, y)
//   tick(dt) · stop() · dazu({ tick, stop }) (gl_jobs.js runs in the same tick) · linien() · debug
// Event: 'grenzland:ruf' { ort, wert, stufe, alt, n, grund }.
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { P } from '../game/walkable.js';
import { CLOCK } from '../time/clock.js';
import { GL } from './gl_state.js';
import { GLDATA } from './gl_data.js';
import { GLHUD } from './gl_hud.js';
import { GLHANDY } from './gl_handy.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLORTE } from './gl_orte.js';
import { GLRUFDATA } from './gl_ruf_data.js';
export const GLRUF = (() => {
  const D = GLRUFDATA;
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const okW = w => obj(w) && D.ORTE.every(o => Number.isFinite(w[o]) && Math.abs(w[o]) <= 100);
  // the saved state: strict, so that nothing broken reaches the start
  const KEY = SAVE.key('pav-gl-ruf-v1', {
    owner: 'grenzland-ruf',
    kind: 'json',
    def: null,
    check: v =>
      v === null ||
      (obj(v) &&
        v.v === 1 &&
        okW(v.w) &&
        obj(v.st) &&
        D.ORTE.every(o => v.st[o] in D.IDX) &&
        Number.isFinite(v.tag) &&
        Array.isArray(v.log) &&
        Array.isArray(v.themen)),
  });
  const S = {
    w: { ratscher: 0, schleusingen: 0 },
    st: { ratscher: 'neutral', schleusingen: 'neutral' },
    tag: 0, // CLOCK.t when the forgetting was last applied
    log: [], // the newest changes: { ort, n, grund, t }
    themen: [], // what the village talks about: { id, g, wer, wo, ort, t, gut, name }
    erz: {}, // figure id → ids of the gossip it has told already
    gruss: {}, // figure id → the game day it was greeted (a greeting counts once a day)
    q: [], // what comes later: { t, fn }
    chatT: 0, // seconds until the next gossip line may go to the chat
    feedT: 0,
    letzte: null, // the last deed's change (a witness talked round gives half of it back)
    idx: {}, // the next line per group of GEREDE
    nId: 0,
    acc: 0,
    mit: [], // modules that run in this tick: { tick, stop }
    err: null,
    n: { add: 0, chat: 0, feed: 0, stufe: 0 },
  };
  const hyp = Math.hypot;
  const heute = () => GL.on && GL.era === 'heute';
  const tagVon = t => Math.floor(t / 1440);
  // ---------------- saving ----------------
  function save() {
    SAVE.set(KEY, {
      v: 1,
      w: Object.assign({}, S.w),
      st: Object.assign({}, S.st),
      tag: S.tag,
      log: S.log.slice(-12),
      themen: S.themen.slice(-8),
    });
  }
  function laden(fresh) {
    const v = fresh ? null : SAVE.get(KEY);
    S.w = { ratscher: 0, schleusingen: 0 };
    S.st = { ratscher: 'neutral', schleusingen: 'neutral' };
    S.tag = CLOCK.t;
    S.log = [];
    S.themen = [];
    if (v) {
      for (const o of D.ORTE) {
        S.w[o] = D.clamp(v.w[o]);
        S.st[o] = D.stufe(S.w[o], v.st[o]);
      }
      S.tag = v.tag;
      S.log = v.log.filter(q => obj(q) && q.ort in S.w && Number.isFinite(q.n)).slice(-12);
      S.themen = v.themen.filter(q => obj(q) && typeof q.g === 'string' && Number.isFinite(q.t)).slice(-8);
      S.nId = S.themen.reduce((m, q) => Math.max(m, q.id | 0), 0);
    }
    save();
  }
  // ---------------- the value ----------------
  const hier = () => {
    const p = KERN.where() || [P.x, P.y];
    return D.ortVon(p[0], p[1]);
  };
  const ortOk = o => (D.ORTE.includes(o) ? o : hier());
  const wert = ort => S.w[ortOk(ort)] || 0;
  const stufe = ort => S.st[ortOk(ort)] || 'neutral';
  // n points at the place for a reason ('tat:<id>', 'job:<id>', 'hilfe', 'fest', 'antwort:<art>', 'entscheidung:<id>', …) → the change
  function add(ort, n, grund, o = {}) {
    if (!GL.on || (GL.era !== 'heute' && !o.immer)) return 0;
    ort = ortOk(ort);
    n = +n;
    if (!Number.isFinite(n) || !n) return 0;
    const alt = S.w[ort],
      neu = D.clamp(Math.round((alt + n) * 10) / 10);
    if (neu === alt) return 0;
    S.w[ort] = neu;
    S.log.push({ ort, n: Math.round((neu - alt) * 10) / 10, grund: String(grund || ''), t: Math.round(CLOCK.t) });
    if (S.log.length > 12) S.log.shift();
    S.n.add++;
    const st0 = S.st[ort],
      st1 = D.stufe(neu, st0);
    S.st[ort] = st1;
    save();
    KERN.emit('grenzland:ruf', { ort, wert: neu, stufe: st1, alt: st0, n: neu - alt, grund: String(grund || '') });
    if (st1 !== st0) gewechselt(ort, st0, st1);
    return neu - alt;
  }
  // a step changed: a small line under the radar (when nothing else shows), the chat comments on it a while later
  function gewechselt(ort, st0, st1) {
    S.n.stufe++;
    const zeig = () => {
      if (!heute()) return;
      try {
        GLHUD.ort('Ruf in ' + D.NAME[ort] + ': ' + st1, D.HUD[st1] || '', 4.5);
      } catch (e) {}
    };
    if (document.body.dataset.glKino === '1') later(3, zeig);
    else zeig();
    const L = D.GEREDE[st1];
    if (L && L.length) later(25 + Math.random() * 20, () => chatZeile(st1, { name: '', wo: '', ort }));
  }
  // ---------------- gossip ----------------
  const later = (t, fn) => S.q.push({ t, fn });
  // the next line of a group, with its words filled in (each group goes round its lines in turn)
  function chatZeile(g, f, sofort) {
    const L = D.GEREDE[g];
    if (!L || !L.length || !heute()) return false;
    if (!sofort && S.chatT > 0) return false;
    const i = (S.idx[g] = (S.idx[g] || 0) + 1) - 1,
      a = L[i % L.length];
    try {
      GLHANDY.chat(a[0], D.fuell(a[1], { name: f.name, wo: f.wo, ort: D.NAME[f.ort] || 'Ratscher' }));
    } catch (e) {
      return false;
    }
    S.chatT = 50;
    S.n.chat++;
    return true;
  }
  function feedPost(art, f) {
    const L = D.FEED[art];
    if (!L || !L.length || !heute() || S.feedT > 0) return false;
    const a = L[Math.floor(Math.random() * L.length)];
    try {
      GLHANDY.feed(a[0], D.fuell(a[1], { name: f.name, wo: f.wo, ort: D.NAME[f.ort] || 'Ratscher' }), '');
    } catch (e) {
      return false;
    }
    S.feedT = 240;
    S.n.feed++;
    return true;
  }
  // something to talk about: kept for the people who tell it (a day long), a chat line later, a post when it is big
  function merke(g, ort, o = {}) {
    if (!g || !heute()) return null;
    const p = KERN.where() || [P.x, P.y],
      wer = o.wer != null ? o.wer : GL.wer,
      wo = o.wo || D.woVon(KERN.place(p[0], p[1], 0), ort),
      name = D.WERNAME[wer] || o.name || D.WERNAME[''],
      q = { id: ++S.nId, g, wer, wo, ort, t: Math.round(CLOCK.t), gut: D.gut(g), name };
    S.themen.push(q);
    if (S.themen.length > 8) S.themen.shift();
    save();
    const f = { name, wo, ort };
    if (D.GEREDE[g] && o.chat !== false) later(o.chatIn ?? 40 + Math.random() * 40, () => chatZeile(g, f, o.sofort));
    if (o.feed) later(70 + Math.random() * 40, () => feedPost(q.gut ? 'gut' : 'schlecht', f));
    return q;
  }
  // what is talked about now: the newest of the last game day, that this figure has not told yet
  function gerede(id) {
    const t = CLOCK.t,
      done = (id && S.erz[id]) || [];
    for (let i = S.themen.length - 1; i >= 0; i--) {
      const q = S.themen[i];
      if (t - q.t > 1440) break;
      if (!done.includes(q.id)) return q;
    }
    return null;
  }
  function erzaehlt(id, q) {
    if (!id || !q) return;
    (S.erz[id] = S.erz[id] || []).push(q.id);
    if (S.erz[id].length > 8) S.erz[id].shift();
  }
  // the places where people stand and talk: the shop on wheels, the barn – and what `alltag` brings (an inn, a festival)
  function plaetze() {
    const L = [];
    try {
      if (GLORTE.P && GLORTE.P.wagen)
        L.push({ x: GLORTE.P.wagen[0], y: GLORTE.P.wagen[1], r: 12, name: 'Verkaufswagen' });
    } catch (e) {}
    const T = GLDATA.ORTE.treff;
    if (T) L.push({ x: T.pos[0], y: T.pos[1], r: 22, name: 'Feldscheune' });
    try {
      const A = window.GLALLTAG,
        FE = window.GLFESTE;
      // (alltag's people who stand at an inn, the barn, under the lime tree, at a shop: where they stand, people talk)
      if (A && A.leute)
        for (const o of A.leute() || [])
          if (
            o &&
            Number.isFinite(o.x) &&
            /gasthaus|wirt|kneipe|scheune|linde|laden|wagen|fest/i.test(o.ort + ' ' + o.tun)
          )
            L.push({ x: o.x, y: o.y, r: 6, name: String(o.ort || '') });
      if (FE && FE.aktiv) {
        const F = FE.aktiv();
        if (F && Number.isFinite(F.x)) L.push({ x: F.x, y: F.y, r: F.r || 30, name: F.name || 'Fest' });
      }
    } catch (e) {}
    return L;
  }
  const platz = (x, y) => plaetze().find(o => hyp(x - o.x, y - o.y) < o.r) || null;
  // ---------------- what happens ----------------
  function tat(d) {
    if (!heute() || !d) return;
    const p = KERN.where() || [P.x, P.y],
      ort = D.ortVon(p[0], p[1]);
    let knows = !!d.bekannt;
    try {
      if (!knows && d.zeugen > 0 && GLFAHNDUNG.zeugen) knows = GLFAHNDUNG.zeugen().some(z => z.knows && !z.police);
    } catch (e) {}
    const r = D.tat(d.id, { zeugen: d.zeugen, bekannt: knows });
    if (!r.n) return;
    const other = D.ORTE.find(o => o !== ort);
    const n1 = add(ort, r.n, 'tat:' + d.id);
    if (r.nachbar) add(other, r.nachbar, 'gerede:' + d.id);
    S.letzte = { ort, n: n1, t: CLOCK.t };
    let name = '';
    try {
      if (!knows && GLFAHNDUNG.ist) name = D.aussehen(GLFAHNDUNG.ist());
    } catch (e) {}
    merke(r.g, ort, { wer: knows ? GL.wer : '', name, feed: r.n <= -8 });
  }
  KERN.on('grenzland:tat', d => tat(d));
  // a witness talked round: half of it back (he will not tell everybody)
  KERN.on('grenzland:zeuge', d => {
    if (!heute() || !d || !d.still || !S.letzte || CLOCK.t - S.letzte.t > 12) return;
    add(S.letzte.ort, -S.letzte.n * 0.5, 'beredet');
    S.letzte = null;
  });
  KERN.on('grenzland:erwischt', d => {
    if (!heute() || (d && d.era === '1989')) return;
    const ort = hier();
    add(ort, D.ANDERES.erwischt, 'erwischt');
    merke('erwischt', ort, { feed: true });
  });
  // the four answers (gl_reaktion.js): a greeting counts once a game day per person
  KERN.on('grenzland:antwort', d => {
    if (!heute() || !d || !d.art || d.von) return;
    const n = D.ANDERES[d.art];
    if (!n) return;
    if (d.art === 'gruessen') {
      const tg = tagVon(CLOCK.t);
      if (S.gruss[d.wer] === tg) return;
      S.gruss[d.wer] = tg;
    }
    add(hier(), n, 'antwort:' + d.art);
  });
  KERN.on('grenzland:start', d => {
    laden(!!(d && d.fresh));
    S.q.length = 0;
    S.erz = {};
    S.gruss = {};
    S.chatT = 30;
    S.feedT = 120;
    S.letzte = null;
  });
  KERN.on('grenzland:stop', () => stop());
  // ---------------- per frame (gl_modus.js: after the places' sound) ----------------
  function tick(dt) {
    if (!GL.on) return;
    try {
      lauf(dt);
    } catch (e) {
      if (!S.err) console.warn('grenzland ruf', e);
      S.err = String((e && e.stack) || e).slice(0, 300);
    }
    for (const m of S.mit)
      try {
        m.tick && m.tick(dt);
      } catch (e) {
        if (!m.err) console.warn('grenzland ruf: dazu', e);
        m.err = String((e && e.stack) || e).slice(0, 300);
      }
  }
  function lauf(dt) {
    for (let i = S.q.length - 1; i >= 0; i--)
      if ((S.q[i].t -= dt) <= 0) {
        const f = S.q[i].fn;
        S.q.splice(i, 1);
        f();
      }
    if (S.chatT > 0) S.chatT -= dt;
    if (S.feedT > 0) S.feedT -= dt;
    if ((S.acc += dt) < 1) return;
    S.acc = 0;
    // people forget: a few points a game day back towards 0 (counted in whole game hours)
    const h = (CLOCK.t - S.tag) / 60;
    if (h >= 1 || h < 0) {
      S.tag = CLOCK.t;
      if (h > 0 && GL.era === 'heute')
        for (const o of D.ORTE) {
          const w = D.vergessen(S.w[o], h / 24);
          if (w !== S.w[o]) {
            S.w[o] = Math.round(w * 10) / 10;
            const st0 = S.st[o],
              st1 = D.stufe(S.w[o], st0);
            S.st[o] = st1;
            if (st1 !== st0) {
              KERN.emit('grenzland:ruf', { ort: o, wert: S.w[o], stufe: st1, alt: st0, n: 0, grund: 'vergessen' });
              gewechselt(o, st0, st1);
            }
          }
        }
      save();
    }
  }
  function stop() {
    S.q.length = 0;
    S.erz = {};
    S.gruss = {};
    S.letzte = null;
    for (const m of S.mit)
      try {
        m.stop && m.stop();
      } catch (e) {}
  }
  // a module that runs with this one (one tick line and one stop line in gl_modus.js for both): gl_jobs.js
  function dazu(m) {
    if (m && !S.mit.includes(m)) S.mit.push(m);
  }
  // the spoken lines of the gossip and of the steps, for the people who stand about (the recordings): [[who, text], …]
  function linien() {
    const RX = window.GLREAKTION,
      wer = RX && RX.REDNER ? [...RX.REDNER] : ['haendler', 'gerhard', 'jule', 'timo', 'basti', 'yuki'];
    return D.linien(wer.filter(id => typeof id === 'string'));
  }
  Object.assign(S, {
    KEY,
    wert,
    stufe,
    add,
    hier,
    ortVon: D.ortVon,
    merke,
    gerede,
    erzaehlt,
    plaetze,
    platz,
    tick,
    stop,
    dazu,
    linien,
    debug: {
      set(ort, w) {
        ort = ortOk(ort);
        return add(ort, D.clamp(w) - S.w[ort], 'debug');
      },
      flush: () => S.q.forEach(q => (q.t = 0)),
      info: () => ({
        w: Object.assign({}, S.w),
        st: Object.assign({}, S.st),
        log: S.log.slice(-6),
        themen: S.themen.slice(-4),
        q: S.q.length,
        n: Object.assign({}, S.n),
        err: S.err,
      }),
      gespeichert: () => SAVE.get(KEY),
    },
  });
  return S;
})();
window.GLRUF = GLRUF;
