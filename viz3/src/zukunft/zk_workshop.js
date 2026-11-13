// ===================== feat/workshop: the Workshop mode – everything the facilitator and the room see and touch (WORKSHOP) =====================
// Falko, 13.11.2026: a half-day workshop in a village; a facilitator presents the Zeitreise (2026 → 2060, two worlds side by side) on a
// projector. This module is the mode switch (?workshop, menu tile, Menu → Erleben → Szenen), the game HUD taken away (one body class +
// CSS), the labelled „Ebenen“ panel (each toggle really switches a system), the start screen with the Szenario-Kreuz, the overlays while the
// Zeitreise plays (year, world titles, chapter, subtitles, timeline, chapter-end card, pause, black) and the presenter's clicker keys.
// It reads only ZKREGIE.state() and its events (a second screen can follow later) and ZKCHRONIK for data; until those exist the mocks of
// zk_workshop_mock.js stand in. Nothing loads or runs while the mode is off (the styles and the DOM are made at the first entry).
// Sizes are in vh/vmin (1920×1080 and 4K alike); text ≥ 2.6 vh, subtitles 3.8 vh, the year 12 vh, 5 % safe margin.
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { audio } from '../audio/audio.js';
import { WSMOCK } from './zk_workshop_mock.js';

export const WORKSHOP = (() => {
  const R = () => window.ZKREGIE || WSMOCK.regie;
  const C = () => window.ZKCHRONIK || WSMOCK.chronik;
  const KS = SAVE.key('pav-workshop-v1', {
    owner: 'workshop',
    kind: 'json',
    def: {},
    check: v => !!v && typeof v === 'object' && !Array.isArray(v),
  });
  // screen: 'menu' (start screen) | 'play' (the Zeitreise runs or is paused) | 'werk' (the first version's panel, the Werkbank)
  const S = { on: false, screen: 'menu', sel: 'pair', chapter: null, black: false, wasPlaying: false, layersOpen: false, snap: null, sub: null, ended: false, ctlT: 0 };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let root = null,
    syncT = 0,
    offReg = null,
    subT = 0,
    offTick = null;
  const $ = id => document.getElementById(id);
  // ---------------- layers (Ebenen) ----------------
  // Each layer: what it is, what it does in the workshop, the default and why, and the real switch. A system without its own switch is
  // stopped with KERN.mute (its per-frame callback) and its figures are kept hidden while the layer is off (hold()).
  const HIDE = {}; // layer id → () => list of THREE objects to keep invisible while it is off
  const MUTES = { leute: ['dorf/dorf', 'npc/life'], bus: ['bus'], tiere: ['tiere', 'tiere-huehner', 'tiere-einfluss', 'hund'] };
  const grp = f => () => {
    try {
      return f() || [];
    } catch (e) {
      return [];
    }
  };
  HIDE.leute = grp(() => [...Object.values(window.DPEOPLE?.figs || {}).map(f => f.g), ...Object.values(window.LIFE?.AG || {}).map(a => a.w?.fig?.g)]);
  HIDE.bus = grp(() => (window.BUS?.S?.inst || []).map(i => i.B?.g));
  HIDE.tiere = grp(() => (window.TIERE?.live || []).map(a => a.g));
  const vols = {};
  const setVol = (k, on) => {
    try {
      if (!(k in vols)) vols[k] = audio.vols()[k];
      audio.vol(k, on ? vols[k] : 0);
    } catch (e) {}
  };
  const cls = (name, on) => document.body.classList.toggle(name, !on);
  const LAYERS = [
    { id: 'leute', icon: '🧑', label: 'Leute', text: 'Dorfbewohner und Nachbarn im Alltag', def: false, why: 'Im Zeitraffer vergehen Jahre; ein Alltag mit Spaziergängern passt nicht dazu.', apply: on => mutes('leute', on) },
    { id: 'verkehr', icon: '🚗', label: 'Verkehr', text: 'Autos und Spaziergänger auf den Straßen', def: false, why: 'Ruhiges Bild, spart Rechenzeit für die geteilte Ansicht.', apply: on => traffic(on) },
    { id: 'bus', icon: '🚌', label: 'Busse', text: 'Der Linienbus nach Fahrplan', def: false, why: 'Wie Verkehr: ruhiges Bild.', apply: on => mutes('bus', on) },
    { id: 'tiere', icon: '🦌', label: 'Tiere', text: 'Wild, Vögel, Hühner und Hunde', def: false, why: 'Rechenzeit; im Zeitraffer wirken einzelne Tiere zufällig.', apply: on => mutes('tiere', on) },
    { id: 'ortsnamen', icon: '📍', label: 'Ortsnamen', text: 'Der Name des Ortes oben im Bild', def: true, why: 'Orientierung für den Raum.', apply: on => cls('ws-no-where', on) },
    { id: 'untertitel', icon: '💬', label: 'Untertitel', text: 'Was die Dorfbewohner sagen, als Text mit Namen', def: true, why: 'Im Saal oft schwer zu verstehen.', apply: on => cls('ws-no-sub', on) },
    { id: 'stimmen', icon: '🗣', label: 'Stimmen', text: 'Gesprochene Sätze der Dorfbewohner', def: true, why: 'Gehört zum Erlebnis.', apply: on => setVol('stimmen', on) },
    { id: 'umgebungston', icon: '🌲', label: 'Umgebungston', text: 'Wind, Regen, Wald, Dorf', def: true, why: 'Trägt die Stimmung der Zeitsprünge.', apply: on => setVol('umgebung', on) },
    { id: 'jahr', icon: '📅', label: 'Jahreszahl und Zeitleiste', text: 'Das Jahr groß, unten die Kapitel und Ereignisse', def: true, why: 'Der Raum soll immer wissen, wann er ist.', apply: on => cls('ws-no-year', on) },
    { id: 'kennzahlen', icon: '📊', label: 'Kennzahlen am Kapitelende', text: 'Karte mit Zahlen beider Welten und Fragen', def: true, why: 'Grundlage für das Gespräch.', apply: on => cls('ws-no-card', on) },
    { id: 'daten', icon: '🗺', label: 'Daten-Ansichten', text: 'Lärm, Verkehr, Sonne, Naturwert, Stimmung auf der Karte (Draufsicht)', def: false, why: 'Gehört zur Werkbank und zur Draufsicht, nicht zum Film.', apply: on => daten(on) },
  ];
  const lay = {}; // id → bool
  const savedLayers = () => {
    try {
      return SAVE.get(KS).layers || {};
    } catch (e) {
      return {};
    }
  };
  function mutes(id, on) {
    for (const n of MUTES[id]) KERN.mute(n, !on);
    if (!on) hold();
  }
  function traffic(on) {
    try {
      window.VERKEHR?.autoOn(on);
      if (!on) window.VERKEHR?.clear();
    } catch (e) {}
  }
  function daten(on) {
    try {
      for (const L of window.WDATEN?.LAYERS || []) if (window.WDATEN.isOn(L.id)) WDATEN.set(L.id, false);
      if (on) WDATEN.set('w_laerm', true);
    } catch (e) {}
  }
  // while a figure layer is off its objects stay invisible (the muted callback no longer sets them)
  function hold() {
    for (const id of Object.keys(HIDE)) if (lay[id] === false) for (const g of HIDE[id]()) if (g) g.visible = false;
  }
  // feat/workshop round 2: places for other helpers (zeitreise-medien): the phone on the right third (above the scene, below the cards) and an
  // area inside the chapter-end card for video tiles. The elements persist; the card's text is rebuilt around the extra area.
  const cardExtra = document.createElement('div');
  cardExtra.id = 'ws-card-extra';
  function slot(name) {
    build();
    if (name === 'phone') return $('ws-slot-phone');
    if (name === 'card-extra') return cardExtra;
    return null;
  }
  const layers = {
    // another module adds its layer to the panel: { id, icon, label, text, on (default), set(bool) }
    define(d) {
      if (!d || !d.id || typeof d.set !== 'function') return false;
      const L = { id: d.id, icon: d.icon || '•', label: d.label || d.id, text: d.text || '', def: d.on !== false, why: d.why || '', apply: d.set };
      const i = LAYERS.findIndex(x => x.id === d.id);
      i >= 0 ? (LAYERS[i] = L) : LAYERS.push(L);
      if (S.on) {
        const sv = savedLayers();
        layers.set(L.id, L.id in sv ? !!sv[L.id] : L.def, true);
        renderLayers();
      }
      return true;
    },
    list: () => LAYERS.map(L => ({ id: L.id, label: L.label, text: L.text, on: lay[L.id] !== false, def: L.def })),
    on: id => lay[id] !== false,
    set(id, v, quiet) {
      const L = LAYERS.find(x => x.id === id);
      if (!L) return false;
      lay[id] = !!v;
      try {
        L.apply(!!v);
      } catch (e) {
        console.warn('workshop layer', id, e);
      }
      if (!quiet) {
        try {
          const o = savedLayers();
          o[id] = !!v;
          SAVE.set(KS, { ...SAVE.get(KS), layers: o });
        } catch (e) {}
        renderLayers();
      }
      return true;
    },
    reset() {
      for (const L of LAYERS) layers.set(L.id, L.def);
    },
  };
  function applyLayers() {
    const sv = savedLayers();
    for (const L of LAYERS) layers.set(L.id, L.id in sv ? !!sv[L.id] : L.def, true);
  }
  // ---------------- the game taken away / given back ----------------
  const POSE = ['x', 'y', 'z', 'yaw', 'pitch', 'mode', 'tx', 'ty', 'th'];
  function snapshot() {
    const s = { pose: {}, clock: null, strat: false };
    try {
      for (const k of POSE) if (window.GAME?.P && k in GAME.P) s.pose[k] = GAME.P[k];
    } catch (e) {}
    try {
      s.clock = { t: CLOCK.t, rate: CLOCK.rate };
    } catch (e) {}
    try {
      s.vols = audio.vols();
    } catch (e) {}
    return s;
  }
  function restore(s) {
    if (!s) return;
    try {
      Object.assign(GAME.P, s.pose);
      window.markDirty && window.markDirty(true);
    } catch (e) {}
    try {
      if (s.clock) {
        CLOCK.t = s.clock.t;
        CLOCK.setRate(s.clock.rate);
      }
    } catch (e) {}
    try {
      for (const k of Object.keys(s.vols || {})) audio.vol(k, s.vols[k]);
    } catch (e) {}
  }
  function leaveOtherModes() {
    try {
      if (window.STRAT?.on) (STRAT.exit ? STRAT.exit() : document.querySelector('.stb[data-a="exit"]')?.click());
    } catch (e) {}
    try {
      if (window.ZOMBIE?.on) (ZOMBIE.stop || ZOMBIE.exit || (() => {}))();
    } catch (e) {}
    try {
      if (window.GLSTATE?.on) GRENZLAND.stop?.(true);
    } catch (e) {}
    try {
      if (window.ZUKUNFT?.S.on) ZUKUNFT.exit();
    } catch (e) {}
  }
  // ---------------- styles and DOM (made once, at the first entry) ----------------
  const HUDIDS = '#hotbar,#moves,#act2,#actrow,#joy,#hudtr,#hint,#hbname,#geoattr,#camtog,#orbithud,#menubtn,#talkbtn,#npcsub,#npcpanel,#toast,#vhud,#vmap,#xhair,#stancetag,#qtrack,#planbar,#clockbtn,#gearbtn,#cleanbtn,#doorbtn,#perfbox,#palette,#sitebar,#ppanel,#sharebox,#topscale,#invwin,#machwin,#clockwin,#gearwin,#werkbuch,#wpcard,#gearfx,#sthud,#stppl,#stpan,#stnotes,#sttime,#stcard,#stlayers,#glhud,#zhud,.ov.where';
  const CSS = `
body.ws-on ${HUDIDS.split(',').join(',body.ws-on ')}{display:none!important}
body.ws-on.ws-werk #zk{display:flex!important}
body.ws-on header.top{visibility:hidden}
body.ws-on .ov.where small,body.ws-where-none .ov.where{display:none!important}
body.ws-card-on #ws-year,body.ws-card-on #ws-chap{visibility:hidden}
#ws-slot-phone{position:absolute;right:5vw;top:15vh;width:30vw;height:70vh;pointer-events:none}
#ws-slot-phone>*{pointer-events:auto}
#ws-card-extra:empty{display:none}
#ws-card-extra{display:flex;gap:2vh;margin-top:1.4vh}
body.ws-on:not(.ws-no-where) .ov.where{display:block!important;top:19vh!important;left:auto!important;right:5vw!important;font-size:3vh!important;text-align:right;z-index:66}
#ws{position:fixed;inset:0;z-index:70;pointer-events:none;color:#f6f1e6;font:600 2.8vh/1.3 var(--f-body,system-ui,sans-serif);text-shadow:0 .2vh .8vh rgba(0,0,0,.85)}
#ws[hidden]{display:none}
#ws button{font:inherit;color:inherit;cursor:pointer;pointer-events:auto}
#ws .wsb{background:rgba(20,22,20,.82);border:.25vh solid rgba(255,255,255,.35);border-radius:1.2vh;padding:.9vh 1.8vh;text-shadow:none}
#ws .wsb:hover,#ws .wsb:focus-visible{background:rgba(60,64,58,.95);border-color:#fff}
#ws .wsb[aria-pressed=true]{background:#f3efe6;color:#1d1f1b}
#ws-top,#ws-bot{position:absolute;left:0;right:0;height:0;background:#000;transition:height .8s ease}
#ws-top{top:0}#ws-bot{bottom:0}
body.ws-playing #ws-top,body.ws-playing #ws-bot{height:9vh}
#ws-badge{position:absolute;left:5vw;top:2.4vh;display:flex;gap:1.2vh;align-items:center;opacity:.8;z-index:3}
#ws-badge:hover{opacity:1}
#ws-badge b{font-size:2.8vh;letter-spacing:.05em;text-transform:uppercase;background:#b85f2e;border-radius:1vh;padding:.5vh 1.4vh;text-shadow:none}
#ws-ctl{position:absolute;right:5vw;top:2vh;display:flex;gap:1vh;opacity:0;transition:opacity .4s;z-index:3}
body.ws-ctl #ws-ctl,#ws-ctl:focus-within{opacity:1}
body:not(.ws-ctl).ws-playing{cursor:none}
body.ws-start #ws-ctl,body.ws-werk #ws-ctl{display:none}
#ws-year{position:absolute;left:5vw;top:19vh;font:800 12vh/1 var(--f-head,var(--f-body,system-ui));letter-spacing:.02em;display:none}
body.ws-playing:not(.ws-no-year) #ws-year{display:block}
#ws-chap{position:absolute;left:5vw;top:32vh;font-size:3.6vh;font-weight:700;display:none}
body.ws-playing:not(.ws-no-year) #ws-chap{display:block}
#ws-titles{position:absolute;left:0;right:0;top:11vh;display:none}
body.ws-playing #ws-titles{display:block}
#ws-titles span{position:absolute;top:0;transform:translateX(-50%);font-size:3.8vh;font-weight:800;padding:.5vh 2vh;border-radius:1vh;background:rgba(18,20,18,.72);border:.3vh solid var(--c,#fff);text-shadow:none;white-space:nowrap}
#ws-split{position:absolute;left:50%;top:9vh;bottom:9vh;width:.3vh;background:rgba(255,255,255,.7);display:none}
body.ws-playing.ws-two #ws-split{display:block}
#ws-evt{position:absolute;left:50%;transform:translateX(-50%);top:19vh;z-index:1;max-width:70vw;text-align:center;font-size:3.4vh;background:rgba(18,20,18,.78);padding:.8vh 2.2vh;border-radius:1vh;text-shadow:none;display:none}
#ws-evt.on{display:block}
#ws-sub{position:absolute;left:50%;transform:translateX(-50%);bottom:12vh;width:min(84vw,150vh);text-align:center;font-size:3.8vh;line-height:1.25;background:rgba(14,15,13,.82);border-radius:1.2vh;padding:1.2vh 2.4vh;text-shadow:none;display:none}
#ws-sub.on{display:block}
body.ws-no-sub #ws-sub{display:none!important}
#ws-sub b{display:block;font-size:2.8vh;color:#f0b060;margin-bottom:.3vh}
#ws-tl{position:absolute;left:5vw;right:5vw;bottom:1.4vh;height:6.2vh;display:none;pointer-events:auto;cursor:pointer}
body.ws-playing:not(.ws-no-year) #ws-tl{display:block}
#ws-tl .seg{position:absolute;top:2.6vh;height:2vh;border-radius:.6vh;background:rgba(255,255,255,.28);border-right:.3vh solid #000}
#ws-tl .seg i{position:absolute;left:.6vh;top:-2.8vh;font-style:normal;font-size:2.6vh;white-space:nowrap}
#ws-tl .mk{position:absolute;top:1.6vh;width:1vh;height:1vh;margin-left:-.5vh;border-radius:50%;background:#f0b060}
#ws-tl .mk.st{top:1vh;width:1.6vh;height:1.6vh;margin-left:-.8vh;background:#e2574c}
#ws-tl .ph{position:absolute;top:1.4vh;width:.7vh;height:4.4vh;margin-left:-.35vh;background:#fff;border-radius:.3vh}
.wsplate{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(14,16,14,.93);border:.3vh solid rgba(255,255,255,.3);border-radius:2vh;padding:3vh 4vh;text-shadow:none;display:none}
.wsplate.on{display:block}
#ws-pause{text-align:center;max-width:70vw;pointer-events:none}
#ws-pause h2,#ws-end h2{margin:0 0 1.2vh;font-size:6vh}
#ws-pause p{margin:.6vh 0;font-size:3.4vh}
#ws-card{width:min(86vw,190vh);max-height:66vh;overflow:auto;top:57%}
#ws-card h2{margin:0 0 1.6vh;font-size:5vh}
#ws-card table{width:100%;border-collapse:collapse;font-size:3vh}
#ws-card th,#ws-card td{padding:1vh 1.2vh;border-bottom:.2vh solid rgba(255,255,255,.2);text-align:left}
#ws-card th{font-size:3vh}
#ws-card td.v{font-size:3.6vh;font-weight:800}
#ws-card td small,#ws-card .src{display:block;font-size:2.6vh;font-weight:500;opacity:.85}
#ws-card .q{margin-top:1.6vh;font-size:3.4vh;color:#f0b060}
#ws-card .q p{margin:.5vh 0}
#ws-card .hint{margin-top:1.2vh;font-size:2.6vh;opacity:.8}
body.ws-no-card #ws-card{display:none!important}
#ws-black{position:absolute;inset:0;background:#000;display:none;z-index:5}
#ws-black.on{display:block}
#ws-start{position:absolute;inset:0;background:rgba(10,12,10,.9);display:none;overflow:auto;pointer-events:auto;z-index:2;padding:11vh 5vw 5vh}
body.ws-start #ws-start{display:block}
#ws-start .grid{display:grid;grid-template-columns:1fr 1fr;gap:4vh 5vw;align-items:start}
@media (max-aspect-ratio:13/10){#ws-start .grid{grid-template-columns:1fr}}
#ws-start h1{margin:0 0 1.4vh;font-size:8vh;line-height:1.05;font-weight:800}
#ws-start .lead{font-size:3.2vh;margin:0 0 2.4vh;font-weight:500;max-width:60vh}
#ws-start .row{display:flex;gap:1.2vh;flex-wrap:wrap;margin:1vh 0}
#ws-start .lab{font-size:2.6vh;opacity:.85;margin-top:2vh;text-transform:uppercase;letter-spacing:.08em}
#ws-go{font-size:4vh;font-weight:800;padding:1.4vh 4vh;background:#b85f2e;border-color:#f0b060}
#ws-legend{font-size:2.6vh;font-weight:500;opacity:.9;line-height:1.7;margin-top:2.4vh}
#ws-legend kbd{display:inline-block;border:.2vh solid rgba(255,255,255,.6);border-radius:.6vh;padding:0 .8vh;margin-right:.4vh;background:rgba(255,255,255,.1);font:inherit;font-weight:700}
#ws-cross{display:grid;grid-template-columns:auto 1fr 1fr;grid-template-rows:auto 1fr 1fr;gap:1.2vh;max-width:90vh}
#ws-cross .ax{font-size:2.6vh;opacity:.85;display:flex;align-items:center;justify-content:center;text-align:center}
#ws-cross .cell{min-height:13vh;padding:1.4vh;border-radius:1.4vh;border:.3vh solid rgba(255,255,255,.3);background:rgba(255,255,255,.06);text-align:left;display:flex;flex-direction:column;justify-content:center;gap:.4vh;text-shadow:none}
#ws-cross .cell b{font-size:3.4vh}
#ws-cross .cell span{font-size:2.6vh;font-weight:500}
#ws-cross .cell.stub{opacity:.5;cursor:default}
#ws-cross .cell.sel{background:var(--c);color:#14150f;border-color:#fff}
#ws-lay{position:absolute;inset:0;background:rgba(10,12,10,.92);display:none;overflow:auto;pointer-events:auto;z-index:4;padding:11vh 5vw 5vh}
#ws-lay.on{display:block}
#ws-lay h2{margin:0 0 1vh;font-size:5.4vh}
#ws-lay .cols{display:grid;grid-template-columns:1fr 1fr;gap:0 4vw;margin:1vh 0 2vh}
@media (max-aspect-ratio:13/10){#ws-lay .cols{grid-template-columns:1fr}}
#ws-lay label{display:grid;grid-template-columns:5vh 1fr 6vh;gap:0 1.4vh;align-items:center;padding:1.1vh 0;border-bottom:.2vh solid rgba(255,255,255,.18);cursor:pointer;text-shadow:none}
#ws-lay label i{font-style:normal;font-size:3.8vh;grid-row:1/3;text-align:center}
#ws-lay label b{font-size:3vh}
#ws-lay label small{font-size:2.6vh;font-weight:500;opacity:.85;grid-column:2}
#ws-lay label input{grid-row:1/3;grid-column:3;width:4.4vh;height:4.4vh;accent-color:#f0b060}
#ws-lay .rowb{display:flex;gap:1.2vh}
@media (max-width:700px){#ws-badge b{font-size:2.6vh}#ws-ctl{flex-wrap:wrap}}
`;
  function build() {
    if (root) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.id = 'ws';
    root.hidden = true;
    root.innerHTML = `
<div id="ws-top"></div><div id="ws-bot"></div><div id="ws-split"></div>
<div id="ws-year"></div><div id="ws-chap"></div><div id="ws-titles"></div><div id="ws-evt"></div>
<div id="ws-slot-phone"></div><div id="ws-sub"></div><div id="ws-tl" aria-label="Zeitleiste"></div>
<div id="ws-pause" class="wsplate"></div><div id="ws-end" class="wsplate"></div><div id="ws-card" class="wsplate"></div>
<div id="ws-badge"><b>Workshop</b><button type="button" class="wsb" data-a="leave">Zurück ins Spiel</button></div>
<div id="ws-ctl">
<button type="button" class="wsb" data-a="prev" title="Zurück (Bild auf)" aria-label="Zurück">⏮</button>
<button type="button" class="wsb" data-a="toggle" title="Abspielen oder anhalten (Leertaste)" aria-label="Abspielen oder anhalten">⏯</button>
<button type="button" class="wsb" data-a="next" title="Weiter (Bild ab)" aria-label="Weiter">⏭</button>
<button type="button" class="wsb" data-a="speed" title="Tempo">×1</button>
<button type="button" class="wsb" data-a="layers" title="Ebenen (L)">Ebenen</button>
<button type="button" class="wsb" data-a="menu" title="Workshop-Menü (Esc)">Menü</button>
<button type="button" class="wsb" data-a="black" title="Schwarzbild (B)" aria-label="Schwarzbild">⬛</button>
<button type="button" class="wsb" data-a="full" title="Vollbild (F)" aria-label="Vollbild">⛶</button>
</div>
<div id="ws-start"></div><div id="ws-lay"></div><div id="ws-black"></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', e => {
      const t = e.target;
      if (t instanceof HTMLInputElement && t.dataset.lay) layers.set(t.dataset.lay, t.checked);
    });
    root.querySelector('#ws-tl').addEventListener('click', e => {
      const r = e.currentTarget.getBoundingClientRect(),
        [a, b] = C().SPAN;
      R().seek(Math.round(a + ((e.clientX - r.left) / r.width) * (b - a)));
    });
    window.addEventListener('mousemove', moved, { passive: true });
  }
  // ---------------- the start screen and the Szenario-Kreuz ----------------
  function renderStart() {
    const W = C().WORLDS,
      Wd = id => W[id] || { title: id, color: '#888', stub: true },
      cell = (id, pos) => {
        const w = Wd(id),
          sel = !w.stub && (S.sel === 'pair' ? id === 'allein' || id === 'gewappnet' : S.sel === id);
        return `<button type="button" class="cell wsb ${w.stub ? 'stub' : ''} ${sel ? 'sel' : ''}" style="--c:${w.color}" ${w.stub ? 'disabled' : `data-world="${id}"`} aria-pressed="${sel}"><b>${esc(w.title)}</b><span>${w.stub ? 'kommt in Stufe 2' : esc(w.claim || '')}</span></button>`;
      };
    const chips = (items, cur, attr) => items.map(([v, l]) => `<button type="button" class="wsb" ${attr}="${v}" aria-pressed="${cur === v}">${l}</button>`).join('');
    $('ws-start').innerHTML = `<div class="grid"><div>
<h1>Ratscher 2026 → 2060</h1>
<p class="lead">Wie könnte sich unser Dorf verändern? Die Zeitreise zeigt zwei mögliche Zukünfte nebeneinander – Wald, Wasser, Energie – und hält bei Ereignissen an, damit wir darüber reden können.</p>
<button type="button" class="wsb" id="ws-go" data-a="go">Zeitreise starten</button>
<div class="row" style="margin-top:2vh"><button type="button" class="wsb" data-a="layers">Ebenen</button><button type="button" class="wsb" data-a="werk">Werkbank (Einzelthemen)</button><button type="button" class="wsb" data-a="leave">Zurück ins Spiel</button></div>
<div id="ws-legend"><kbd>Bild ab</kbd> <kbd>→</kbd> weiter · <kbd>Bild auf</kbd> <kbd>←</kbd> zurück · <kbd>Leertaste</kbd> Pause<br><kbd>B</kbd> <kbd>.</kbd> Schwarzbild · <kbd>F</kbd> Vollbild · <kbd>L</kbd> Ebenen · <kbd>Esc</kbd> Menü</div>
</div><div>
<div class="lab">Szenario-Kreuz</div>
<div id="ws-cross"><span></span><span class="ax">jeder für sich</span><span class="ax">gemeinsam</span>
<span class="ax">Klima mild</span>${cell('glueck')}${cell('rueckenwind')}
<span class="ax">Klima heftig</span>${cell('allein')}${cell('gewappnet')}</div>
<div class="lab">Ansicht</div><div class="row">${chips([['pair', 'Zwei Wege nebeneinander'], ['allein', 'Nur Allein im Sturm'], ['gewappnet', 'Nur Gewappnet']], S.sel, 'data-sel')}</div>
<div class="lab">Kapitel</div><div class="row">${chips([['', 'Alles'], ...C().CHAPTERS.map(c => [c.id, c.title])], S.chapter || '', 'data-chap')}</div>
</div></div>`;
  }
  function renderLayers() {
    const el = $('ws-lay');
    if (!el) return;
    const items = LAYERS.map(L => `<label><i>${L.icon}</i><b>${esc(L.label)}</b><input type="checkbox" data-lay="${L.id}" ${lay[L.id] !== false ? 'checked' : ''} aria-label="${esc(L.label)}"><small>${esc(L.text)}</small></label>`);
    el.innerHTML = `<h2>Ebenen</h2><div>Was im Workshop zu sehen und zu hören ist. Alles lässt sich jederzeit ein- und ausschalten; der Browser merkt sich die Auswahl.</div>
<div class="cols"><div>${items.slice(0, Math.ceil(items.length / 2)).join('')}</div><div>${items.slice(Math.ceil(items.length / 2)).join('')}</div></div>
<div class="rowb"><button type="button" class="wsb" data-a="layers-close">Fertig</button><button type="button" class="wsb" data-a="layers-reset">Voreinstellung</button></div>`;
    el.classList.toggle('on', S.layersOpen);
  }
  // ---------------- clicks, keys ----------------
  function onClick(e) {
    const b = e.target instanceof Element ? e.target.closest('button') : null;
    if (!b) return;
    const d = b.dataset;
    if (d.world) {
      S.sel = d.world;
      renderStart();
    } else if (d.sel) {
      S.sel = d.sel;
      renderStart();
    } else if ('chap' in d) {
      S.chapter = d.chap || null;
      renderStart();
    } else if (d.a) act(d.a);
  }
  let speeds = [1, 2, 4],
    si = 0;
  function act(a) {
    const r = R();
    if (a === 'go') begin();
    else if (a === 'leave') leave();
    else if (a === 'menu') toMenu();
    else if (a === 'layers') {
      S.layersOpen = !S.layersOpen;
      renderLayers();
    } else if (a === 'layers-close') {
      S.layersOpen = false;
      renderLayers();
    } else if (a === 'layers-reset') {
      layers.reset();
      renderLayers();
    } else if (a === 'werk') werk();
    else if (a === 'next') next();
    else if (a === 'prev') r.prev();
    else if (a === 'toggle') (r.toggle(), setTimeout(sync, 30));
    else if (a === 'speed') {
      si = (si + 1) % speeds.length;
      r.speed(speeds[si]);
      document.querySelector('#ws-ctl [data-a=speed]').textContent = '×' + speeds[si];
    } else if (a === 'black') black();
    else if (a === 'full') full();
  }
  function next() {
    const r = R(),
      s = r.state();
    if (S.screen === 'menu') return begin();
    if (!s.playing && !s.card && !s.ev && !S.ended) r.play();
    else r.next();
  }
  function black(v) {
    S.black = v === undefined ? !S.black : v;
    $('ws-black').classList.toggle('on', S.black);
    const r = R();
    if (S.black) {
      S.wasPlaying = !!r.state().playing;
      if (S.wasPlaying) r.pause();
    } else if (S.wasPlaying) r.play();
  }
  function full() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) {}
  }
  function key(e) {
    if (!S.on || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && e.key !== 'Escape') return;
    const k = e.key,
      stop = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
    if (k === 'Escape') {
      stop();
      if (S.black) black(false);
      else if (S.layersOpen) act('layers-close');
      else if (S.screen === 'menu') leave();
      else toMenu();
      return;
    }
    if (S.screen === 'werk') return; // the Werkbank keeps its own keys (Y …); Esc above leads back
    stop();
    if (e.repeat) return;
    if (k === 'PageDown' || k === 'ArrowRight' || k === 'ArrowDown' || (k === 'Enter' && S.screen === 'menu')) next();
    else if (k === 'PageUp' || k === 'ArrowLeft' || k === 'ArrowUp') S.screen === 'play' && R().prev();
    else if (k === ' ' || k === 'k' || k === 'K') S.screen === 'play' ? (R().toggle(), setTimeout(sync, 30)) : begin();
    else if (k === 'b' || k === 'B' || k === '.') black();
    else if (k === 'f' || k === 'F' || k === 'F5') full();
    else if (k === 'l' || k === 'L') act('layers');
  }
  const moved = () => {
    if (!S.on) return;
    document.body.classList.add('ws-ctl');
    clearTimeout(S.ctlT);
    S.ctlT = setTimeout(() => document.body.classList.remove('ws-ctl'), 2000);
  };
  // ---------------- start, menu, leave ----------------
  function setScreen(s) {
    S.screen = s;
    const b = document.body.classList;
    b.toggle('ws-start', s === 'menu');
    b.toggle('ws-werk', s === 'werk');
    b.toggle('ws-playing', s === 'play');
    if (s === 'menu') renderStart();
    sync();
  }
  function enter(o = {}) {
    if (S.on && !o.again) {
      if (S.screen !== 'menu') toMenu();
      return;
    }
    build();
    S.snap = snapshot();
    leaveOtherModes();
    S.on = true;
    S.ended = false;
    document.body.classList.add('ws-on');
    root.hidden = false;
    applyLayers();
    renderLayers();
    if (o.sel) S.sel = o.sel;
    setScreen('menu');
    window.addEventListener('keydown', key, true);
    clearInterval(syncT);
    syncT = setInterval(sync, 200);
    if (!offTick) offTick = KERN.tick(hold, 'workshop');
    try {
      offReg = R().on(onEvent);
    } catch (e) {}
    KERN.emit('workshop:modus', { on: true });
    if (o.autoplay) begin();
  }
  function toMenu() {
    try {
      R().stop();
    } catch (e) {}
    try {
      window.ZUKUNFT?.S.on && ZUKUNFT.exit();
    } catch (e) {}
    S.ended = false;
    black(false);
    clearTimeout(subT);
    S.sub = null;
    setScreen('menu');
  }
  function begin() {
    const pair = S.sel === 'pair' ? C().PAIRS[0] : [S.sel];
    S.ended = false;
    S.sub = null;
    setScreen('play');
    buildTimeline(pair[0]);
    R().start({ pair, split: pair.length > 1, chapter: S.chapter });
    document.body.classList.toggle('ws-two', pair.length > 1);
    moved();
  }
  function werk() {
    try {
      R().stop();
    } catch (e) {}
    setScreen('werk');
    try {
      if (ZUKUNFT) {
        ZUKUNFT.S.pres = true;
        ZUKUNFT.enter();
      }
    } catch (e) {}
  }
  function leave() {
    if (!S.on) return;
    try {
      R().stop();
    } catch (e) {}
    for (const L of LAYERS) layers.set(L.id, true, true); // every system back to the game's own state
    for (const n of Object.values(MUTES).flat()) KERN.mute(n, false);
    traffic(true);
    try {
      window.ZUKUNFT?.S.on && ZUKUNFT.exit();
    } catch (e) {}
    S.on = false;
    window.removeEventListener('keydown', key, true);
    clearInterval(syncT);
    offReg && offReg();
    offReg = null;
    offTick && offTick();
    offTick = null;
    clearTimeout(subT);
    black(false);
    S.layersOpen = false;
    S.sub = null;
    root.hidden = true;
    const b = document.body.classList;
    for (const c of ['ws-on', 'ws-start', 'ws-werk', 'ws-playing', 'ws-two', 'ws-ctl', 'ws-no-where', 'ws-no-sub', 'ws-no-year', 'ws-no-card', 'ws-card-on', 'ws-where-none']) b.remove(c);
    restore(S.snap);
    S.snap = null;
    KERN.emit('workshop:modus', { on: false });
  }
  // ---------------- playback overlays (only from ZKREGIE.state() and its events) ----------------
  function onEvent(e) {
    if (!S.on || !e) return;
    if (e.type === 'line') showLine(e);
    else if (e.type === 'event') showEvt(e.ev || e);
    else if (e.type === 'end') {
      S.ended = true;
      sync();
    } else if (e.type === 'chapter') sync();
    else if (e.type === 'card') sync();
  }
  function showLine(l) {
    S.sub = { who: l.who || '', text: l.text || '' };
    clearTimeout(subT);
    subT = setTimeout(() => {
      S.sub = null;
      sync();
    }, Math.max(3500, S.sub.text.length * 70));
    sync();
  }
  function showEvt() {
    sync();
  }
  function buildTimeline(w) {
    const [a, b] = C().SPAN,
      p = y => (((y - a) / (b - a)) * 100).toFixed(2),
      el = $('ws-tl');
    el.innerHTML =
      C().CHAPTERS.map(c => `<div class="seg" style="left:${p(c.from)}%;width:${(p(c.to) - p(c.from)).toFixed(2)}%"><i>${esc(c.title)}</i></div>`).join('') +
      (C().events(w) || []).map(ev => `<div class="mk ${ev.kind === 'stresstest' ? 'st' : ''}" style="left:${p(ev.y)}%" title="${esc(ev.title)}"></div>`).join('') +
      '<div class="ph"></div>';
  }
  const memo = {};
  const put = (id, html, cls) => {
    if (memo[id] === html + (cls || '')) return;
    memo[id] = html + (cls || '');
    const el = $(id);
    if (el) el.innerHTML = html;
  };
  const show = (id, on) => $(id) && $(id).classList.toggle('on', !!on);
  function sync() {
    if (!S.on || !root) return;
    let s = {};
    try {
      s = R().state() || {};
    } catch (e) {}
    const playing = S.screen === 'play' && s.on,
      C0 = C(),
      [a, b] = C0.SPAN,
      W = C0.WORLDS;
    const chap = C0.CHAPTERS.find(c => c.id === s.chapter);
    put('ws-year', playing ? String(Math.floor(s.y || a)) : '');
    put('ws-chap', playing && chap ? esc(chap.title) : '');
    if (playing) {
      const pair = s.pair || ['allein', 'gewappnet'],
        two = s.split && pair.length > 1;
      put('ws-titles', pair.map((id, i) => `<span style="left:${two ? (i ? 75 : 25) : 50}%;--c:${(W[id] || {}).color || '#fff'}">${esc((W[id] || { title: id }).title)}</span>`).join(''));
      document.body.classList.toggle('ws-two', !!two);
      const ph = document.querySelector('#ws-tl .ph');
      if (ph) ph.style.left = (((s.y - a) / (b - a)) * 100).toFixed(2) + '%';
    }
    // an event's title while the time stands still
    put('ws-evt', playing && s.ev ? esc(s.ev.title || '') : '');
    show('ws-evt', playing && s.ev);
    put('ws-sub', S.sub ? `<b>${esc(S.sub.who)}</b>${esc(S.sub.text)}` : '');
    show('ws-sub', playing && S.sub);
    // chapter-end card
    const cardCh = s.card && (s.card.chapter || (typeof s.card === 'string' ? s.card : s.chapter));
    if (playing && cardCh) {
      put('ws-card', cardHtml(cardCh, s.pair || ['allein', 'gewappnet']));
      const cd = $('ws-card');
      if (cardExtra.parentNode !== cd) cd.querySelector('.src').before(cardExtra);
      show('ws-card', true);
    } else show('ws-card', false);
    document.body.classList.toggle('ws-card-on', !!(playing && cardCh));
    document.body.classList.toggle('ws-where-none', /^Modellansicht/.test(($('where') || {}).textContent || ''));
    // pause (for discussion) and the end
    const pause = playing && !s.playing && !s.card && !s.ev && !S.ended;
    put('ws-pause', pause ? `<h2>Pause</h2><p>Zeit zum Reden.</p>${chap ? chap.questions.map(q => `<p>${esc(q)}</p>`).join('') : ''}<p style="font-size:2.6vh;opacity:.8">Leertaste oder Bild ab: weiter</p>` : '');
    show('ws-pause', pause);
    put('ws-end', S.ended && playing ? '<h2>2060</h2><p>Das war die Reise. Bild ab: zurück ins Workshop-Menü.</p>' : '');
    show('ws-end', S.ended && playing);
  }
  function cardHtml(ch, pair) {
    const c = C(),
      W = c.WORLDS,
      chap = c.CHAPTERS.find(x => x.id === ch) || { title: ch, questions: [] },
      cols = pair.map(w => c.kpi(w, ch) || []),
      rows = cols[0] || [],
      src = [...new Set(rows.flatMap(r => (r.src || []).map(x => x[0])))];
    const fmt = (r, i) => {
      const q = cols[i].find(x => x.id === r.id) || r;
      return `<td class="v">${esc(q.value)} ${esc(q.unit)}<small>${q.range ? 'Spanne ' + q.range[0] + '–' + q.range[1] : ''}</small></td>`;
    };
    return `<h2>${esc(chap.title)}: die Zahlen</h2><table><tr><th></th>${pair.map(w => `<th style="color:${(W[w] || {}).color}">${esc((W[w] || { title: w }).title)}</th>`).join('')}</tr>${rows.map(r => `<tr><td>${esc(r.label)}</td>${pair.map((w, i) => fmt(r, i)).join('')}</tr>`).join('')}</table>
<div class="src">Quellen: ${esc(src.join('; ') || 'Annahmen, siehe Werkbank')} · Beispielwerte einer möglichen Zukunft</div>
<div class="q">${chap.questions.slice(0, 2).map(q => `<p>${esc(q)}</p>`).join('')}</div><div class="hint">Bild ab: weiter</div>`;
  }
  // ---------------- entry points ----------------
  KERN.scenario('workshop', { label: 'Workshop: Zukünfte erproben', order: 4, run: () => enter() });
  function tile() {
    const page = document.querySelector('#menu .mpage[data-page="start"]');
    if (!page || page.querySelector('#workshopbtn')) return !!page;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mtut';
    b.id = 'workshopbtn';
    b.innerHTML = '<b>Workshop: Zukünfte erproben</b><span>Zeitreise 2026 → 2060 für den großen Bildschirm</span>';
    b.addEventListener('click', () => {
      document.querySelector('#menu .mresume')?.click();
      enter();
    });
    page.querySelector('.mnav')?.before(b);
    return true;
  }
  if (!tile()) document.addEventListener('DOMContentLoaded', tile, { once: true });
  // ?workshop · ?workshop=allein-gewappnet&autoplay=1 (also ?workshop=allein / gewappnet)
  {
    const q = new URLSearchParams(location.search);
    if (q.has('workshop'))
      KERN.until(() => window.GAME && GAME.loaded && GAME.loaded(), 3600).then(
        () => {
          const v = q.get('workshop') || '';
          const sel = /allein-gewappnet|gewappnet-allein/.test(v) ? 'pair' : v === 'allein' || v === 'gewappnet' ? v : undefined;
          enter({ sel, autoplay: q.get('autoplay') === '1' });
        },
        () => {}
      );
  }
  return {
    S,
    layers,
    enter,
    leave,
    begin,
    toMenu,
    werk,
    next,
    black,
    key,
    regie: R,
    chronik: C,
    slot,
    vols: () => audio.vols(),
    state: () => ({ on: S.on, screen: S.screen, sel: S.sel, chapter: S.chapter, black: S.black, layers: S.layersOpen }),
  };
})();
window.WORKSHOP = WORKSHOP;
