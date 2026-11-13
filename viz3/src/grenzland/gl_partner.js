// ===================== feat/grenzland-partner: talking with the other of the two, anywhere in today's Grenzland (GLPARTNER) =====================
// Falko, 13.11.2026 20:37: „Ich möchte aber die Möglichkeit haben, ständig mit der Partnerin bzw. mit dem Partner zu sprechen. Also wenn ich
// vor Sarah stehe, dann möchte ich mit Sarah sprechen können, möglichst mit KI. Oder relevante Themen rund um die Quests und umgekehrt
// genauso.“ („umgekehrt“: playing Sarah, Falko is the one to talk to.)
// Near the partner (≤ 3 m, roughly facing; on foot, today – not in 1989, not during a scene or a mission's talk) the game's action button
// offers „Mit Sarah reden“ / „Mit Falko reden“ (E, a tap). The talk opens a small panel in the mode's look: the partner stops, turns to
// the player and looks at him, the mouth moves while she or he speaks; after the talk the following goes on as before (GL.folgt).
//   Without AI (no key, or AI off): topics like GTA's dialogue choices – „Was machen wir jetzt?“ (the current step in the partner's words),
//   „Was wissen wir bisher?“ (the story so far), „Alles gut bei dir?“ (banter by stars, a chase, the time of day), „Komm mit“ / „Warte
//   hier“ – fixed, recorded lines from grenzland/gl_partner_data.js (keys 1–4 or a tap).
//   With AI (menu → Einstellungen → „KI-Gespräche“, npc/ki.js): the partner is a person of the game's free talks (gl_p_sarah, gl_p_falko)
//   with her or his own sheet, memory and voice; each turn the AI hears the mission, the step's objective, what is done, the stars and what
//   the police know, place, money (the adapter's lage()); the microphone and the text field sit in the panel; the topics ask the AI, „Komm
//   mit“ / „Warte hier“ act at once; the AI itself can make the partner come along, wait or mark the next target (tool spielaufgabe).
// E or Esc ends the talk, so does walking away, a scene, a mission's talk, Tab, the trip to 1989.
// Riding together (car, moped; the partner rides along out of sight): key B – or the small „Mit Sarah reden“ button that shows for a few
// seconds after getting on together (on a phone while riding) – opens the same talk without „Komm mit“ / „Warte hier“ (GTA's banter).
//   GLPARTNER.auf() · zu() · thema(k) · offen() · frei() · linien() · debug { zustand(), lageSt(), log, chips() } · tempo (tests)
import { COARSE, stage } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { KI } from '../npc/ki.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLFIG } from './gl_fig.js';
import { GLHUD } from './gl_hud.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLMDATA } from './gl_mission_data.js';
import { GLMISSION } from './gl_mission.js';
import { GLPDATA } from './gl_partner_data.js';
export const GLPARTNER = (() => {
  const T = {
    reden: n => 'Mit ' + n + ' reden',
    ende: COARSE ? 'Ende' : 'Ende · E',
    kiTipp: 'Frei reden: Mikrofon oder Text – oder ein Thema wählen.',
    zielNein: 'Gerade gibt es kein Ziel auf der Karte.',
    zielJa: o => 'Das Ziel ist jetzt auf der Karte markiert' + (o ? ': ' + o : '') + '.',
  };
  const S = {
    open: false,
    who: '', // the partner's cast id while a talk runs ('sarah' | 'falko')
    gen: 0, // counts openings, closings and topics: a line sequence of an older one stops
    n: 0, // counts the topics (the variants of a line go round)
    folgtNach: true, // what GL.folgt becomes after the talk (the partner stands still while it runs)
    jagdT: -1e9, // when the police were last shaken off (performance.now())
    ki: false, // the talk is a free one (npc/ki.js)
    auto: false, // the talk runs while riding together
    pillT: 0, // seconds the button for the talk while riding stays
    fuhr: false, // the partner rode along at the last frame
    gruss: '',
    el: null,
    log: [], // what was said: [who, text] (tests)
    err: '',
    tempo: 1, // how long a line without a voice stays, as a factor (tests: small)
  };
  const fig = () => (window.GRENZLAND && GRENZLAND.partnerOf ? GRENZLAND.partnerOf() : null);
  const partnerId = () => (GL.other() === 'm' ? 'falko' : 'sarah');
  const key = id => 'gl_p_' + (id || partnerId());
  const kino = () => document.body.dataset.glKino === '1';
  const redet = () => !!(GLMISSION.redet && GLMISSION.redet());
  const kiOn = () => !!(KI && KI.ready);
  // can a talk start now (or go on)? on foot, today, the partner beside one and visible, no scene, no talk of a mission, no choice open
  function frei(r = 3.2) {
    const F = fig();
    if (!GL.on || GL.era !== 'heute' || !F || !F.g || !F.g.visible || F.rides || F.reitet) return false;
    if (P.mode !== 'walk' || VEH.cur || PLAY.seated() || kino() || redet() || GLHUD.ask) return false;
    return Math.hypot(F.x - P.x, F.y - P.y) <= r;
  }
  // riding together: the player drives, the partner rides along (out of sight), no scene, no talk of a mission
  function imAuto() {
    const F = fig();
    return !!(GL.on && GL.era === 'heute' && VEH.cur && F && F.rides && GL.folgt && !kino() && !redet() && !GLHUD.ask);
  }
  // ---------------- the state the lines and the AI go by ----------------
  function info() {
    try {
      return (GLMISSION.debug && GLMISSION.debug.info && GLMISSION.debug.info()) || {};
    } catch (e) {
      return {};
    }
  }
  function zustand() {
    const i = info(),
      st = GLFAHNDUNG.stand(),
      m = ((Math.floor(CLOCK.t) % 1440) + 1440) % 1440;
    return {
      partner: partnerId(),
      mission: GLMISSION.cur ? GLMISSION.cur() : '',
      step: i.step || '',
      erledigt: GLPDATA.ORDER.filter(id => GL.m[id] && GL.m[id].st === 'erledigt'),
      sterne: st.sterne | 0,
      jagd: performance.now() - S.jagdT < 180000,
      stunde: Math.floor(m / 60),
    };
  }
  // the situation for the AI's <lage> (grenzland/gl_partner_data.js lage())
  function lageSt() {
    const z = zustand(),
      M = GLMDATA.M,
      O = GLPDATA.ORDER,
      i = info(),
      w = GLFAHNDUNG.wo(),
      st = GLFAHNDUNG.stand(),
      F = fig();
    const naechste = !z.mission ? O.find(k => !z.erledigt.includes(k)) : null;
    let ort = '';
    try {
      ort = String(KERN.place(w.x, w.y, KERN.ground(w.x, w.y)) || '');
    } catch (e) {}
    return {
      spieler: GL.name(),
      ort,
      fahrzeug: VEH.cur && F && F.rides ? VEH.cur.name || 'Moped' : '',
      mission:
        z.mission && M[z.mission]
          ? { id: z.mission, titel: M[z.mission].title, nr: O.indexOf(z.mission) + 1, n: O.length }
          : null,
      schritt: i.text || '',
      naechste: naechste && M[naechste] ? { titel: M[naechste].title, teaser: M[naechste].teaser } : null,
      erledigt: z.erledigt.map(k => ({ titel: M[k].title, done: M[k].done })),
      sterne: z.sterne,
      polizei: st.state,
      wissen: st.wissen || {},
      versteckt: !!st.hidden,
      geld: GL.geld,
      waehrung: GL.waehrung ? GL.waehrung() : '€',
      folgt: S.open ? S.folgtNach : GL.folgt,
      dinge: Object.assign({}, GL.inv),
    };
  }
  // ---------------- speaking: one line after the other, the partner's mouth moves, the subtitle shows it ----------------
  const nameOf = w => (GLDATA.CAST[w] && GLDATA.CAST[w].name) || w;
  function sag(w, text, g) {
    S.log.push([w, text]);
    if (S.log.length > 40) S.log.shift();
    const F = fig(),
      ms = Math.max(1400, 800 + String(text).length * 58) * S.tempo,
      er = w === S.who && F;
    if (er) GLFIG.talking(F, true);
    if (w === S.who) zeig(text);
    try {
      GLHUD.sub(nameOf(w), text, ms + 300);
    } catch (e) {}
    const done = () => {
      if (er && g === S.gen) GLFIG.talking(F, false);
      markDirty();
    };
    try {
      if (!window.FREEZE && STIMME.speaks('gl_' + w, text))
        return STIMME.say('gl_' + w, text, F && er ? { at: [F.x, F.y] } : {}).then(
          r => (done(), r),
          () => (done(), false)
        );
    } catch (e) {}
    return new Promise(res => setTimeout(() => (done(), res(true)), ms));
  }
  async function sprich(zeilen) {
    const g = ++S.gen;
    for (const [w, text] of zeilen) {
      if (g !== S.gen || !S.open) return;
      await sag(w, text, g);
      if (g !== S.gen) return;
      await new Promise(res => setTimeout(res, 220 * S.tempo));
    }
  }
  // ---------------- the panel ----------------
  const CSS = `
#glpartner{position:absolute;right:max(16px,2.2vw);top:calc(122px + env(safe-area-inset-top,0px));z-index:11;width:min(330px,36vw);box-sizing:border-box;
  background:rgba(14,18,22,.88);color:#eef1f2;border-radius:12px;padding:10px 12px 12px;font:400 14px/1.4 var(--f-body,system-ui);
  pointer-events:auto;max-height:calc(100% - 330px - env(safe-area-inset-bottom,0px));overflow:auto;-webkit-overflow-scrolling:touch;
  box-shadow:0 8px 30px rgba(0,0,0,.35)}
#glpartner[hidden]{display:none!important}
#glpartner header{display:flex;align-items:center;gap:8px;margin:0 0 6px}
#glpartner header b{flex:1;font:600 16px/1.2 var(--f-body,system-ui);color:#f3c64f}
#glpartner header small{font:500 11px/1 var(--f-mono,monospace);opacity:.55;letter-spacing:.04em}
#glpartner .gpx{flex:none;font:500 12px/1 var(--f-body,system-ui);color:#eef1f2;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);
  border-radius:999px;padding:6px 11px;cursor:pointer}
#glpartner .gpx:hover{background:rgba(255,255,255,.18)}
#glpartner .gpt{margin:0 0 6px;font:italic 400 14px/1.4 var(--f-body,system-ui);opacity:.92}
#glpartner .gpt:empty{display:none}
#glpartner .gpc button{display:flex;gap:9px;align-items:center;width:100%;box-sizing:border-box;text-align:left;margin-top:6px;
  font:500 14px/1.3 var(--f-body,system-ui);color:#eef1f2;background:rgba(255,255,255,.12);border:0;border-radius:8px;padding:9px 11px;cursor:pointer}
#glpartner .gpc button:hover{background:rgba(255,255,255,.22)}
#glpartner .gpc button kbd{flex:none;display:grid;place-items:center;width:20px;height:20px;border-radius:5px;background:rgba(243,198,79,.18);color:#f3c64f;
  font:600 11px/1 var(--f-mono,monospace)}
#glpartner .gpc button.akt{background:rgba(243,198,79,.16)}
#glpartner.ki-host .np-ki{padding:8px 0 0;border-top:1px solid rgba(255,255,255,.12);margin-top:10px}
#glpartner.ki-host .np-me{color:rgba(238,241,242,.7)} #glpartner.ki-host .np-me:empty{display:none}
#glpartner.ki-host .np-in input,#glpartner.ki-host .np-in button{background:rgba(255,255,255,.1);color:#eef1f2;border-color:rgba(255,255,255,.2)}
#glpartner.ki-host .np-note{color:rgba(238,241,242,.65)} #glpartner.ki-host .np-note:empty{display:none}
#glpartner.ki-host .np-setup{display:block;width:100%;box-sizing:border-box;margin-top:10px;font:500 12px/1.3 var(--f-body,system-ui);color:#f3c64f;
  background:none;border:1px dashed rgba(243,198,79,.45);border-radius:8px;padding:7px 10px;cursor:pointer;text-align:left}
#glpartner.ki-host .np-setup[hidden]{display:none}
body[data-gl-kino="1"] #glpartner,body[data-gl-kino="1"] #glpreden{display:none!important}
#glpreden{position:absolute;right:max(16px,2.2vw);top:calc(122px + env(safe-area-inset-top,0px));z-index:11;border:0;border-radius:999px;
  background:rgba(14,18,22,.72);color:#f3c64f;font:600 13px/1 var(--f-body,system-ui);padding:9px 14px;cursor:pointer;backdrop-filter:blur(4px)}
#glpreden[hidden]{display:none!important}
@media (max-height:620px){#glpartner{max-height:calc(100% - 290px)}}
@media (max-width:600px){#glpartner{left:50%;right:auto;top:auto;bottom:calc(214px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:94vw;
  max-height:calc(100% - 360px);padding:8px 10px 10px} #glpartner .gpt{display:none}
  #glpartner .gpc{display:grid;grid-template-columns:1fr 1fr;gap:0 6px} #glpartner .gpc button{font-size:13px;padding:8px 9px}}
@media (orientation:landscape) and (max-height:500px){#glpartner{top:calc(52px + env(safe-area-inset-top,0px));width:min(300px,42vw);
  max-height:calc(100% - 130px)} #glpartner .gpt{display:none}}
`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function build() {
    if (S.el) return S.el;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const el = document.createElement('aside');
    el.id = 'glpartner';
    el.hidden = true;
    el.setAttribute('aria-label', 'Gespräch');
    el.innerHTML =
      '<header><b id="glp-name"></b><small id="glp-keys"></small><button type="button" class="gpx" id="glp-zu"></button></header>' +
      '<p class="gpt" id="glp-text" aria-live="polite"></p><div class="gpc" id="glp-chips"></div>';
    (stage || document.body).appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.id === 'glp-zu') zu('knopf');
      else if (b.dataset.k) thema(b.dataset.k);
    });
    S.el = el;
    return el;
  }
  const chips = () =>
    [
      { k: 'jetzt', t: GLPDATA.FRAGE.jetzt },
      { k: 'bisher', t: GLPDATA.FRAGE.bisher },
      { k: 'geht', t: GLPDATA.FRAGE.geht },
    ].concat(
      S.auto
        ? []
        : [
            S.folgtNach
              ? { k: 'warte', t: GLPDATA.FRAGE.warte, akt: true }
              : { k: 'komm', t: GLPDATA.FRAGE.komm, akt: true },
          ]
    );
  function render() {
    const el = build();
    el.querySelector('#glp-name').textContent = nameOf(S.who);
    el.querySelector('#glp-keys').textContent = COARSE ? '' : '1–4';
    el.querySelector('#glp-zu').textContent = T.ende;
    el.querySelector('#glp-chips').innerHTML = chips()
      .map(
        (c, i) =>
          `<button type="button" data-k="${c.k}"${c.akt ? ' class="akt"' : ''}>${COARSE ? '' : '<kbd>' + (i + 1) + '</kbd>'}<span>„${esc(
            c.t.replace(/\.$/, '')
          )}“</span></button>`
      )
      .join('');
  }
  function zeig(text) {
    const el = S.el && S.el.querySelector('#glp-text');
    if (el) el.textContent = text ? '„' + text + '“' : '';
  }
  // ---------------- open, topics, close ----------------
  function auf() {
    if (S.open) return false;
    const auto = imAuto();
    if (!auto && !frei(3.6)) return false;
    const F = fig();
    S.open = true;
    S.auto = auto;
    S.gen++;
    S.who = partnerId();
    S.folgtNach = GL.folgt;
    pill(false);
    if (!auto) {
      GL.folgt = false; // she or he stands while the talk runs (as grenzland/gl_kegeln.js does at the lane)
      GLFIG.stop(F);
      GLFIG.face(F, P.x, P.y);
      GLFIG.blick(F, 'spieler');
    }
    render();
    zeig('');
    S.el.hidden = false;
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) {}
    const W = GLPDATA.waehle(zustand());
    const h = W.hallo(Math.floor(Math.random() * 3));
    S.gruss = h[0][1];
    S.ki = kiOn() && personen();
    sprich(h);
    // the free talk (with a key) or, without one, the hint to set it up – both go into this panel
    try {
      if (KI && KI.talk && personen()) KI.talk(key(S.who));
    } catch (e) {
      S.err = String((e && e.message) || e);
    }
    GL.emit('partner', { auf: true, wer: S.who, ki: S.ki });
    markDirty(true);
    return true;
  }
  // the following: at once for the HUD and the radar, held still while the talk runs
  function folge(v) {
    S.folgtNach = !!v;
    if (window.GRENZLAND && GRENZLAND.folgen) GRENZLAND.folgen(!!v);
    else GL.folgt = !!v;
    if (S.open && !S.auto) GL.folgt = false;
  }
  function thema(k) {
    if (!S.open) return false;
    S.n++;
    const W = GLPDATA.waehle(zustand());
    let zeilen = null;
    if (k === 'komm' || k === 'warte') {
      if (S.auto) return false;
      folge(k === 'komm');
      zeilen = W[k](S.n);
      // the AI hears it (its talk goes on with it)
      try {
        const c = KI && KI.conv;
        if (S.ki && c && c.pa && c.pa.key === key(S.who))
          c.pending.push({
            type: 'text',
            text: `(${GL.name()} hat gesagt: „${GLPDATA.FRAGE[k]}“ – du ${k === 'komm' ? 'kommst jetzt mit' : 'wartest jetzt hier'}.)`,
          });
      } catch (e) {}
      render();
    } else if (k === 'jetzt' || k === 'bisher' || k === 'geht') {
      // with the AI the question goes to it – it knows the mission and the step from <lage>
      if (S.ki && KI.conv && KI.turn) {
        S.gen++;
        S.log.push([GL.wer === 'f' ? 'sarah' : 'falko', GLPDATA.FRAGE[k]]);
        KI.turn(GLPDATA.FRAGE[k]);
        return true;
      }
      zeilen = k === 'geht' ? W.geht(S.n) : W[k];
    } else return false;
    sprich(zeilen);
    GL.emit('partner', { thema: k, wer: S.who });
    return true;
  }
  function zu(why) {
    if (!S.open) return false;
    S.open = false;
    S.gen++;
    try {
      if (KI && KI.ended && personen()) KI.ended(key(S.who));
    } catch (e) {}
    if (!S.auto) GL.folgt = S.folgtNach;
    S.auto = false;
    const F = fig();
    if (F) {
      GLFIG.blick(F, null);
      GLFIG.talking(F, false);
    }
    if (S.el) S.el.hidden = true;
    S.ki = false;
    GL.emit('partner', { auf: false, why: why || '' });
    markDirty(true);
    return true;
  }
  // ---------------- the AI: the two as people of npc/ki.js ----------------
  let made = false;
  function personen() {
    if (made) return true;
    if (!KI || !KI.person) return false;
    for (const id of ['sarah', 'falko']) {
      const C = GLDATA.CAST[id] || { name: id, voice: { g: id === 'sarah' ? 'f' : 'm', age: 40 } };
      KI.person({
        key: key(id),
        name: C.name,
        g: (C.voice && C.voice.g) || 'm',
        age: (C.voice && C.voice.age) || 40,
        role: id === 'sarah' ? 'Falkos Freundin' : 'Sarahs Freund',
        sheet: GLPDATA.SHEET[id],
        start: 85,
        intro: 'Dein Gegenüber ist dein Partner – ihr seid zusammen unterwegs und redet kurz miteinander.',
        pos: () => {
          const F = fig();
          return F ? [F.x, F.y] : [P.x, P.y];
        },
        mouth: on => {
          const F = fig();
          if (F) GLFIG.talking(F, on);
        },
        sub: t => GLHUD.sub(C.name, t),
        show: t => zeig(t),
        host: () => build(),
        close: () => zu('ki'),
        line: () => S.gruss || '',
        // the partner's doings through the tool spielaufgabe; the situation instead of the garden's building phase and the base tasks
        themen: () => GLPDATA.THEMEN.map(t => ({ k: t.k, label: t.label })),
        quest: k => aktion(k),
        lage: () => GLPDATA.lage(lageSt()),
        aufgaben: () => [],
        ohne: ['aufgabe_geben'],
        vertraut: true,
        klatsch: false,
      });
      // the same voice as the fixed lines (gl_<id>)
      try {
        if (C.voice) STIMME.person(key(id), Object.assign({ name: C.name }, C.voice));
      } catch (e) {}
    }
    made = true;
    return true;
  }
  function aktion(k) {
    if (k === 'mitkommen' || k === 'warten') {
      if (S.auto) return { text: 'Geht gerade nicht – ihr fahrt zusammen.' };
      folge(k === 'mitkommen');
      if (S.open) render();
      return { text: k === 'mitkommen' ? 'Du kommst jetzt mit.' : 'Du wartest jetzt hier.' };
    }
    if (k === 'ziel') {
      let e = null;
      try {
        e = KERN.tasks.list().find(t => String(t.src).startsWith('grenzland') && t.status === 'läuft' && t.target);
      } catch (er) {}
      const p = e ? (typeof e.target === 'function' ? e.target() : e.target) : null;
      if (!p || !Number.isFinite(p[0])) return { text: T.zielNein };
      KERN.emit('grenzland:ziel', { pos: [p[0], p[1]], name: e.ort || e.title || '' });
      return { text: T.zielJa(e.ort || '') };
    }
    return null;
  }
  // ---------------- the action button, the keys, per frame ----------------
  KERN.act({
    id: 'gl:partner',
    r: 3,
    prio: 0.15,
    gest3: 'greet',
    pos: () => {
      const F = fig();
      return F && GL.on && F.g && F.g.visible ? [F.x, F.y, F.z + 0.9] : [1e6, 1e6, 0];
    },
    label: () => (!S.open && frei() ? T.reden(GL.name(GL.other())) : null),
    run: () => auf(),
  });
  window.addEventListener(
    'keydown',
    e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const a = document.activeElement;
      if (!S.open) {
        if (
          e.key.toLowerCase() === 'b' &&
          !e.repeat &&
          !(a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)) &&
          imAuto()
        ) {
          auf();
          e.preventDefault();
        }
        return;
      }
      if (a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)) {
        if (e.key === 'Escape') a.blur();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'escape' || (k === 'e' && !e.repeat)) {
        zu('taste');
        e.preventDefault();
        e.stopImmediatePropagation();
      } else if (/^[1-4]$/.test(k) && !e.repeat) {
        const c = chips()[+k - 1];
        if (c) {
          thema(c.k);
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }
    },
    true
  );
  // the small button while riding together: a few seconds after getting on (a phone: as long as one rides – no key there)
  function pill(on) {
    if (!S.pillEl) {
      if (!on) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'glpreden';
      b.hidden = true;
      b.addEventListener('click', () => auf());
      (stage || document.body).appendChild(b);
      build();
      S.pillEl = b;
    }
    if (on) S.pillEl.textContent = (COARSE ? '' : 'B · ') + T.reden(GL.name(GL.other()));
    S.pillEl.hidden = !on;
  }
  function tick(dt) {
    const F = fig(),
      faehrt = !!(F && F.rides && VEH.cur && GL.on);
    if (faehrt && !S.fuhr) S.pillT = 6;
    S.fuhr = faehrt;
    if (!S.open) {
      const sicht = imAuto() && (COARSE || S.pillT > 0);
      if (S.pillT > 0) S.pillT -= Math.min(dt || 0, 0.25);
      if (sicht !== !!(S.pillEl && !S.pillEl.hidden)) pill(sicht);
      return;
    }
    if (S.auto) {
      if (!imAuto()) zu('weg');
      return;
    }
    if (!F || F.id !== S.who || !frei(4.6)) return void zu('weg');
    // the panel's or the HUD's „Komm mit“ / „Warte hier“ while the talk runs: kept for afterwards, she or he still stands
    if (GL.folgt) {
      S.folgtNach = true;
      GL.folgt = false;
      render();
    }
    if (F.st === 'geht') GLFIG.stop(F);
    const want = Math.atan2(P.x - F.x, P.y - F.y);
    let d = want - F.hd;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) > 0.35) GLFIG.face(F, P.x, P.y);
  }
  KERN.tick(tick, 'grenzland/partner');
  KERN.on('grenzland:entkommen', () => (S.jagdT = performance.now()));
  for (const ev of ['grenzland:wer', 'grenzland:stop', 'grenzland:era', 'grenzland:erwischt'])
    KERN.on(ev, () => S.open && zu(ev.slice(10)));
  KERN.on('grenzland:start', () => personen());
  return Object.assign(S, {
    auf,
    zu,
    thema,
    frei,
    offen: () => S.open,
    personen,
    linien: () => GLPDATA.linien(),
    debug: { zustand, lageSt, chips, aktion, imAuto },
  });
})();
window.GLPARTNER = GLPARTNER;
window.GLPDATA = GLPDATA;
