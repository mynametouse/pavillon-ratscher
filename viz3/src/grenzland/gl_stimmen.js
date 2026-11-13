// ===================== feat/grenzland-stimmen: real voices for the mode „Grenzland“ (GLSTIMMEN) =====================
// Falko (13.11.2026): „… möglichst nah an GTA 6 ranreichen“ – the talks were spoken by the device's voice (or not at all on an iPhone).
// The fixed lines of the mode are recorded with Microsoft Edge neural voices, one voice per person, on GitHub Actions
// (tools/voices/grenzland_record.py, .github/workflows/stimmen_grenzland.yml) into the feature extra viz3/extra/grenzland-stimmen
// (snd/voice/gl/<id>.mp3; its manifest's list vx_add joins window.VOICEX.lines, viz3/build.py). STIMME.say('gl_<who>', text) plays a
// recording when one has exactly these words (audio/stimme.js recorded()), else the device's voice – so every spoken text stays a fixed
// string, and every module with spoken lines offers X.linien() → [[who, text], …] for the recordings.
//   GLSTIMMEN.sammeln(Q)   pure: every fixed spoken line of the mode → [{ who: 'gl_…', id, text, prio, src }] – the mission talks
//                          (GLMDATA.R), every module's own linien(), the street of 1989 (GL89DATA.SAGT), the radio's presenters (GLRDATA);
//                          prio 1 the story, 2 the world, 3 the radio's talk stations, 4 the other stations (the recordings' budget is
//                          spent in this order). tools/voices/grenzland_linien.mjs runs the same in Node – one source for both.
//   GLSTIMMEN.id(who, text)   the recording's stable id: who + FNV-1a of the words (as tools/voices/linien.mjs: x_gerhard_1gxnwae)
//   GLSTIMMEN.linien()     sammeln() over what is loaded now · fehlend() the lines without a recording (tests, Falko) · stand()
// While the mode runs (nothing before its scene starts, nothing after „Beenden“): when a mission step starts, the recordings of its talks
// and of the next steps' are fetched ahead into the HTTP cache (three at a time), the radio's next words too; while a voice speaks the
// score and the car radio step back (GLSCORE.duck / GLRADIO.duck, where a module offers one) and 'grenzland:stimme' { an } is emitted.
// (No imports of the scene's modules: this file loads in Node too – the collector and viz3/test/unit/grenzland_stimmen.test.mjs.)
import { GLDATA } from './gl_data.js';
import { GLMDATA } from './gl_mission_data.js';
import { GL89DATA } from './gl_1989_data.js';
import { GLRDATA } from './gl_radio_data.js';

export const GLSTIMMEN = (() => {
  // ---------------- the id of a line ----------------
  const UTF8 = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  function fnv(s) {
    let h = 0x811c9dc5;
    const b = UTF8 ? UTF8.encode(String(s)) : [];
    for (const c of b) h = Math.imul(h ^ c, 0x01000193) >>> 0;
    return h.toString(36);
  }
  // who as STIMME knows them: 'gl_' + the cast's key (a module may name its speaker with or without the prefix)
  const wer = w => (typeof w === 'string' && w ? (w.startsWith('gl_') ? w : 'gl_' + w) : '');
  const id = (who, text) => wer(who) + '_' + fnv(text);

  // ---------------- collecting ----------------
  // whose linien() belong to the story (prio 1); every other module's lines are the world (2), a radio presenter's the radio (3)
  const STORY = ['GLMISSION', 'GLKAP1', 'GLKAMERA', 'GLSCORE', 'GLLAGER', 'GLMDATA'];
  // the police reports of 1989 (gl_radio_data.js POLIZEI): said by the stations of the flashback, the others by today's
  const P89 = ['kiste', 'ausweis'];
  const str = o => Object.values(o || {}).filter(v => typeof v === 'string');
  function sammeln(Q = {}) {
    const out = [],
      seen = new Set();
    const add = (who, text, prio, src) => {
      who = wer(who);
      // (a line with a variable part – „{name}“ – cannot be recorded; its owner says it in fixed fragments)
      if (!who || typeof text !== 'string' || !text.trim() || text.includes('{')) return;
      const k = who + ':' + text;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ who, id: id(who, text), text, prio, src });
    };
    // 1 · the story: the mission talks ([who, line]; who '' is the narrator – shown, not spoken)
    const R = (Q.GLMDATA && Q.GLMDATA.R) || {};
    for (const [key, lines] of Object.entries(R))
      for (const l of lines || []) if (Array.isArray(l) && l[0]) add(l[0], l[1], 1, 'R.' + key);
    // every module's own lines (kino, welt, the lead …): X.linien() → [[who, text(, prio)], …] or [{ who, text, prio }]
    for (const [name, X] of Q.mods || []) {
      if (name === 'GLSTIMMEN') continue;
      let L = null;
      try {
        L = X && typeof X.linien === 'function' ? X.linien() : null;
      } catch (e) {
        L = null;
      }
      if (!Array.isArray(L)) continue;
      for (const l of L) {
        const [w, t, p] = Array.isArray(l) ? l : l && typeof l === 'object' ? [l.who, l.text, l.prio] : [];
        add(w, t, p || (wer(w).startsWith('gl_r_') ? 3 : STORY.includes(name) ? 1 : 2), name + '.linien');
      }
    }
    // 2 · the world: the street of 1989 (what the people say when Gerhard comes near, grenzland/gl_1989.js)
    const SAGT = (Q.GL89DATA && Q.GL89DATA.SAGT) || {};
    for (const [k, L] of Object.entries(SAGT)) for (const t of L || []) add(k, t, 2, 'SAGT.' + k);
    // what the Node collector found by reading a module's source (until the module offers linien() itself)
    for (const l of Q.extra || []) add(l[0], l[1], l[2] || 2, l[3] || 'extra');
    // 3 · the radio (grenzland/gl_radio_data.js): what each presenter says word for word – the talk station of today („Radio Grenzland“,
    //     with the police report of the player's deeds and the feature) and the GDR's station of 1989 first, the other stations after.
    //     Sentences made of the game's state (the clock, the weather, the title just played, a fine) are not recordable.
    const RD = Q.GLRDATA;
    if (RD && RD.SENDER) {
      const D = Q.GLDATA || {},
        R0 = D.RADIO || {},
        P = RD.POLIZEI || {};
      const each = (s, list, prio) => {
        for (const t of list) add('r_' + s.id, t, prio, 'radio.' + s.id);
      };
      const talk = { grenzland: 1, republik: 1 };
      for (const era of Object.keys(RD.SENDER))
        for (const s of RD.SENDER[era]) {
          const prio = talk[s.id] ? 3 : 4,
            k89 = era === '1989';
          each(s, s.claims || [], prio);
          if (k89)
            each(
              s,
              [
                s.id === 'republik'
                  ? 'Radio Republik. Die Nachrichten.'
                  : s.id === 'west'
                    ? 'Frankenwelle 3, die Nachrichten.'
                    : 'Impuls, die Meldungen.',
              ],
              prio
            );
          each(s, s.mod || [], prio);
          if (talk[s.id]) {
            // the police report and the breaking news, as the talk station says them
            const ids = Object.keys(P).filter(i => P89.includes(i) === k89);
            each(
              s,
              ids.flatMap(i => P[i] || []).filter(t => typeof t === 'string'),
              prio
            );
            const T = k89 ? RD.T89 : RD.TH;
            each(s, str(T), prio);
            if (!k89 && typeof R0.gesucht === 'function') each(s, [R0.gesucht(1), R0.gesucht(3)], prio);
            if (!k89) each(s, R0.sushi || [], prio);
          }
          each(s, s.news || [], prio);
          each(s, s.verkehr || [], prio);
          each(s, s.werb || [], prio);
          each(s, s.gruss || [], prio);
          // the radio through the shop's open window in 1989 (grenzland/gl_1989.js): the GDR's news
          if (s.id === 'republik')
            each(s, [].concat((D.J89 && D.J89.radio89) || [], (Q.GL89DATA && Q.GL89DATA.RADIO) || []), prio);
        }
    }
    return out;
  }

  // ---------------- in the game ----------------
  const W = typeof window !== 'undefined' ? window : null;
  const VX = new Map(); // who:text → file of the recordings (window.VOICEX.lines, as audio/stimme.js reads them)
  const vxf = (who, text) => {
    if (!VX.size && W && W.VOICEX && W.VOICEX.lines)
      for (const l of W.VOICEX.lines) VX.set(l.who + ':' + l.text, l.file);
    return VX.get(who + ':' + text) || '';
  };
  // the modules of the mode that are loaded (window.GL…): their linien() join the list
  const mods = () =>
    W
      ? Object.keys(W)
          .filter(k => /^GL[A-Z0-9]/.test(k) && k !== 'GLSTIMMEN' && W[k])
          .map(k => [k, W[k]])
      : [];
  const linien = () => sammeln({ GLDATA, GLMDATA, GL89DATA, GLRDATA, mods: mods() });
  const fehlend = () => linien().filter(l => !vxf(l.who, l.text));

  const St = {
    on: false,
    q: [], // files to fetch ahead
    have: new Set(), // files fetched ahead (or queued)
    busy: 0,
    n: 0, // fetched
    voc: false, // a voice speaks
    vocT: 0, // for how long
    pend: false, // a probe waits in STIMME.whenIdle
    radioT: 0,
    radioItem: null,
    ducks: 0, // how often a duck was asked of the score or the radio
    funk: false, // the police radio's lines are fetched ahead
    era: '', // the era seen last (the flashback's street is fetched ahead when 1989 begins)
    sagt: 0, // lines of the street of 1989 spoken by their recording
  };
  const base = () => (W && W.ASSET_BASE) || '';
  function pump() {
    while (St.on && St.busy < 3 && St.q.length) {
      const f = St.q.shift();
      St.busy++;
      Promise.resolve()
        .then(() => fetch(base() + 'snd/' + f, { priority: 'low' }))
        .then(r => (r && r.ok ? r.arrayBuffer() : null))
        .catch(() => null)
        .then(() => {
          St.busy--;
          St.n++;
          pump();
        });
    }
  }
  function hol(who, text) {
    const f = vxf(who, text);
    if (!f || St.have.has(f) || !St.on) return;
    St.have.add(f);
    St.q.push(f);
    pump();
  }
  // the talks a step names: its rede, and every word in its functions that is a key of GLMDATA.R (sag(S, 'fremder'), MI.rede('bus'))
  function reden(step) {
    const out = new Set();
    if (!step) return out;
    if (typeof step.rede === 'string') out.add(step.rede);
    const fs = [step.an, step.tick, step.aus, step.ab].concat(Object.values(step.ev || {}));
    for (const f of fs)
      if (typeof f === 'function')
        for (const m of String(f).matchAll(/['"`]([A-Za-z0-9_]+)['"`]/g)) if (GLMDATA.R[m[1]]) out.add(m[1]);
    return out;
  }
  // a step begins: its talks and those of the next two steps
  function voraus(m, i) {
    if (!m || !Array.isArray(m.steps)) return;
    for (let j = Math.max(0, i); j < Math.min(m.steps.length, i + 3); j++)
      for (const k of reden(m.steps[j])) for (const [who, text] of GLMDATA.R[k] || []) if (who) hol('gl_' + who, text);
  }
  function schritt(d) {
    const MI = W && W.GLMISSION;
    if (!St.on || !MI || !MI.St || !MI.St.m || (d && d.id && MI.St.m.id !== d.id)) return;
    voraus(MI.St.m, d && Number.isFinite(d.i) ? d.i : MI.St.m.steps.indexOf(MI.St.step));
  }
  // the first star: the police radio's lines (a description is told in fragments, one after another – each must be there at once)
  function funkVoraus(d) {
    if (!St.on || St.funk || !d || !(d.n > 0)) return;
    St.funk = true;
    for (const l of (W && W.VOICEX && W.VOICEX.lines) || []) if (/^gl_funk/.test(l.who)) hol(l.who, l.text);
  }
  // the street of 1989: grenzland/gl_1989.js shows what the people say as a subtitle and tells 'grenzland:sagt' { id, text } – the
  // recording speaks it at the figure (only a recording: a line without one stays a subtitle, as before)
  function sagt(d) {
    const S = W && W.STIMME,
      G = W && W.GL89,
      L = d && GL89DATA.SAGT[d.id];
    if (!St.on || !S || !L || !L.includes(d.text) || !(W.GLSTATE && W.GLSTATE.era === '1989')) return;
    const who = 'gl_' + d.id;
    if (!vxf(who, d.text)) return;
    const F = G && G.who && G.who[d.id] && G.who[d.id].F;
    try {
      S.say(who, d.text, F && Number.isFinite(F.x) ? { at: [F.x, F.y] } : {});
      St.sagt++;
    } catch (e) {}
  }
  // the flashback begins: the street's recordings ahead
  function strasse() {
    for (const [k, L] of Object.entries(GL89DATA.SAGT)) for (const t of L || []) hol('gl_' + k, t);
  }
  // is a voice speaking? (STIMME.whenIdle calls at once when nobody does, else when the last one has finished)
  function spricht() {
    const S = W && W.STIMME;
    if (!S || typeof S.whenIdle !== 'function') return false;
    if (St.pend) return true;
    St.pend = true;
    S.whenIdle(() => (St.pend = false));
    return St.pend;
  }
  // the radio's presenter is the one speaking (its own words must not lower the radio)
  const radioSpricht = () => {
    const R = W && W.GLRADIO;
    return !!(R && R.S && R.S.item && R.S.item.busy);
  };
  function duck(on) {
    const S = W && W.GLSCORE,
      R = W && W.GLRADIO;
    try {
      if (S && typeof S.duck === 'function') (S.duck(on), St.ducks++);
    } catch (e) {}
    try {
      if (R && typeof R.duck === 'function') (R.duck(on && !radioSpricht()), St.ducks++);
    } catch (e) {}
    try {
      if (W && W.KERN) W.KERN.emit('grenzland:stimme', { an: on });
    } catch (e) {}
  }
  function tick(dt) {
    if (!St.on) return;
    let v = spricht();
    // (a line that never ends – a sound that never started – must not keep the music low: after 25 s it counts as over)
    St.vocT = v ? St.vocT + dt : 0;
    if (St.vocT > 25) v = false;
    if (v !== St.voc) {
      St.voc = v;
      duck(v);
    }
    // once a second: the flashback, the radio's words of the item that runs
    if ((St.radioT -= dt) > 0) return;
    St.radioT = 1;
    const era = W.GLSTATE && W.GLSTATE.era;
    if (era !== St.era) {
      St.era = era;
      if (era === '1989') strasse();
    }
    const R = W.GLRADIO;
    try {
      const S = R && R.S,
        id = S && S.id;
      if (!id) return;
      const it = S.item;
      if (it && it !== St.radioItem && it.it && Array.isArray(it.it.zeilen)) {
        St.radioItem = it;
        for (const t of it.it.zeilen) hol('gl_r_' + id, t);
      }
    } catch (e) {}
  }
  function an() {
    St.on = true;
    St.voc = false;
    St.vocT = 0;
    St.funk = false;
    St.pend = false;
    St.era = '';
    St.radioT = 0;
    St.radioItem = null;
  }
  function aus() {
    if (St.on && St.voc) duck(false);
    St.on = false;
    St.q.length = 0;
    St.voc = false;
    St.radioItem = null;
  }
  if (W && W.KERN) {
    const K = W.KERN;
    K.on('grenzland:start', an);
    K.on('grenzland:stop', aus);
    K.on('grenzland:schritt', schritt);
    K.on('grenzland:mission', d => d && d.st === 'läuft' && schritt({ id: d.id, i: NaN }));
    K.on('grenzland:sterne', funkVoraus);
    K.on('grenzland:sagt', sagt);
    K.tick(tick, 'grenzland/stimmen');
    // (the mode may already run: a reload of the page goes on where one stood)
    if (W.GLSTATE && W.GLSTATE.on) an();
  }
  const stand = () => ({
    on: St.on,
    queued: St.q.length,
    busy: St.busy,
    fetched: St.n,
    ahead: St.have.size,
    voice: St.voc,
    ducks: St.ducks,
    sagt: St.sagt,
    recorded: (W && W.VOICEX && W.VOICEX.lines ? W.VOICEX.lines : []).filter(l => /^gl_/.test(l.who)).length,
  });
  return { id, fnv, sammeln, linien, fehlend, stand, reden, voraus };
})();
if (typeof window !== 'undefined') window.GLSTIMMEN = GLSTIMMEN;
