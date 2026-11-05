// ===================== feat/zombie-werk: crafting and repair in the zombie night – the workbench, the nail board, repairing, sharpening (ZWERK) =====================
// Falko 5.11.2026 (17:57) chose „Basteln und Reparieren“: „In der Werkstatt: Nagelbrett aus Brett und Nägeln, Molotow aus Benzin, Axt
// schärfen, abgenutzte Waffen flicken.“ At a workbench – the one in the garden workshop (the white bench of today's lean-to in phase 0, the
// carpenter's bench of the hall later), the bench in the old garage and every cellar bench of the village houses (zombie/z_innen_einr.js
// 'werkbank', reached through ZHAUS.H) – the action „An der Werkbank basteln“ opens a small panel in the look of the zombie panel (#zhud):
// the recipes with what they need from the backpack and what one has, repairing the weapons one carries, sharpening the blades. Building
// takes game time (10–30 minutes as a short time-lapse) and is heard: a hand saw, a hammer, a whetstone (synthesised here; the zombies hear
// the hammer). The nail board is a new melee weapon (ZDATA.WEAPONS.nagelbrett, a model in zombie/z_waffe_mod.js style, first-person poses
// in ZFP.POSE): blunt with tearing nails, quick, worn out fast. Sharpening gives a blade +30 % for its next 25 hits (Z.weap[id].sharp, saved
// with the weapon's condition in pav-zombie-v1). The molotov's recipe is here, its throw and fire in zombie/z_werk_molotow.js.
// Nothing is built at load time: the models, materials and the panel come on first use; what is registered at load are data entries and
// the actions (whose labels stay empty while the night mode is off).
import * as THREE from 'three';
import { COARSE, stage } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { BUILD } from '../core/geo.js';
import { P, PHASE } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { HUD } from '../game/hud.js';
import { audio } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { SAW_PH } from '../garden/workshop.js';
import { GARAGE } from '../garden/garage.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZHAUS } from './z_haus.js';
import { ZWMOD } from './z_waffe_mod.js';
import { ZWAFFE } from './z_waffe.js';
import { ZFP } from './z_fp.js';
import { ZHUD } from './z_hud.js';
import { ZNETZ } from './z_netz.js';
export const ZWERK = (() => {
  const S = { open: false, el: null, sel: 0, rows: [], job: null, where: null, warned: {}, acc: 0, cssDone: false };
  const W = ZDATA.WEAPONS,
    IT = ZDATA.ITEMS;
  // ---- data: the new things (registered into the shared tables of zombie/z_data.js at load – plain data, nothing built) ----
  Object.assign(IT, {
    molotow: { name: 'Molotow-Cocktail', pl: 'Molotow-Cocktails', icon: '🔥' },
  });
  W.nagelbrett = {
    name: 'Nagelbrett',
    dmg: 31,
    reach: 1.5,
    arc: 66,
    cd: 0.64,
    knock: 1.3,
    stam: 8,
    kind: 'blunt',
    gore: 0.14, // the nails tear: now and then a limb
    wear: 2.3, // ~30 hits from new to broken
    gest: 'chop',
    wind: 0.28,
    desc: 'Zwei Bretter, mit Nägeln gespickt – schnell und gemein, aber nach ein paar Dutzend Schlägen hinüber.',
  };
  // the game minutes of the work at the bench, what it needs, what it makes
  const BLADES = ['axt', 'beil', 'sense', 'spaten'];
  const WOOD = ['spaten', 'mistgabel', 'beil', 'axt', 'sense', 'nagelbrett'];
  const SHARP = { k: 1.3, hits: 25, min: 12 };
  const RECIPES = [
    {
      id: 'nagelbrett',
      name: 'Nagelbrett',
      need: { brett: 2, nagel: 1 },
      min: 15,
      snd: ['saege', 'hammer'],
      text: 'Schnell, reißt – nutzt sich schnell ab.',
    },
    {
      id: 'molotow',
      name: 'Molotow-Cocktail',
      need: { flasche: 1, benzin: 1, lappen: 1 },
      min: 10,
      snd: ['gluck', 'lappen'],
      text: 'Werfen mit F – brennt etwa 8 s auf 3 m.',
    },
  ];
  // repairing: wood and handles with a board and nails; the crowbar is straightened, the saw's chain tensioned and filed, the gun cleaned
  const FIX = {
    nagelbrett: { need: { brett: 1, nagel: 1 }, min: 15, verb: 'Neue Latte, frische Nägel', snd: ['saege', 'hammer'] },
    spaten: { need: { brett: 1, nagel: 1 }, min: 20, verb: 'Stiel ersetzen', snd: ['saege', 'hammer'] },
    mistgabel: { need: { brett: 1, nagel: 1 }, min: 20, verb: 'Stiel ersetzen', snd: ['saege', 'hammer'] },
    beil: { need: { brett: 1, nagel: 1 }, min: 20, verb: 'Neuer Stiel, verkeilt', snd: ['saege', 'hammer'] },
    axt: { need: { brett: 1, nagel: 1 }, min: 25, verb: 'Neuer Stiel, verkeilt', snd: ['saege', 'hammer'] },
    sense: {
      need: { brett: 1, nagel: 1 },
      min: 25,
      verb: 'Sensenbaum flicken, Blatt dengeln',
      snd: ['hammer', 'stein'],
    },
    brechstange: { need: {}, min: 10, verb: 'Geraderichten', snd: ['hammer'] },
    motorsaege: { need: {}, min: 25, verb: 'Kette spannen und schärfen', snd: ['feile'] },
    flinte: { need: { lappen: 1 }, min: 10, verb: 'Reinigen und ölen', snd: ['lappen'] },
  };
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  // the state of a weapon in the backpack's table, robust against nonsense in the saved state (test savefuzz)
  function wst(id) {
    const s = Z.weap && typeof Z.weap === 'object' && Z.weap[id];
    return s && typeof s === 'object' ? s : null;
  }
  // a weapon's state to write into (made when there is none)
  function wput(id) {
    if (!Z.weap || typeof Z.weap !== 'object') Z.weap = {};
    return wst(id) || (Z.weap[id] = { cond: 100, fuel: 0, ammo: 0 });
  }
  const cond = id => {
    const s = wst(id);
    return s && isNum(s.cond) ? Math.max(0, Math.min(100, s.cond)) : 100;
  };
  const sharp = id => {
    const s = wst(id);
    return s && isNum(s.sharp) && s.sharp > 0 ? Math.min(SHARP.hits, Math.floor(s.sharp)) : 0;
  };
  // the things of a weapon (Hubert's axe is the game's own thing 'axe', Wolfgang's ours) – does the player carry one?
  function thingsOf(id) {
    const out = [];
    if (ZWAFFE.things[id]) out.push(ZWAFFE.things[id]);
    if (id === 'axt' && PLAY.things.axe) out.push(PLAY.things.axe);
    return out;
  }
  const carried = id => thingsOf(id).some(T => PLAY.has(T));
  // ---- the nail board as a model: two rough spruce boards (the second doubles the upper half), a rag round the grip, ~ten 90 mm nails
  // driven through from the back, their points 4–5 cm out of the striking face (+x), a few bent. Handle along +y from 0 (as every model
  // of zombie/z_waffe_mod.js), 0.86 m long, 3 draw calls ----
  let NM = null;
  const nmats = () =>
    NM ||
    (NM = {
      board: plain({ color: 0xa08463, roughness: 0.88 }),
      rag: plain({ color: 0x3e4049, roughness: 0.96 }),
    });
  ZWMOD.MODELS.nagelbrett = M => {
    const g = new THREE.Group(),
      K = ZWMOD.kit(),
      N = nmats(),
      rb = ZWMOD.rbox;
    K.add(N.board, rb(0.022, 0.86, 0.094, 0.003), 0, 0.43, 0);
    K.add(N.board, rb(0.02, 0.42, 0.088, 0.003), -0.021, 0.635, 0.002);
    // the end grain at the top cut a little askew, a split in the second board (a thin dark sliver)
    K.add(M.dark, new THREE.BoxGeometry(0.004, 0.16, 0.003), -0.032, 0.7, 0.018);
    K.add(N.rag, rb(0.031, 0.25, 0.102, 0.009), 0, 0.135, 0);
    K.add(N.rag, rb(0.033, 0.03, 0.105, 0.01), 0, 0.27, 0, 0, 0, 0.08);
    // the nails: [y, z, bend about y, bend about z]
    const NAILS = [
      [0.48, -0.03, 0, 0.1],
      [0.5, 0.028, 0.15, 0],
      [0.57, 0.0, 0, -0.05],
      [0.63, -0.032, -0.1, 0.12],
      [0.65, 0.03, 0, 0],
      [0.71, 0.004, 0.25, -0.2],
      [0.76, -0.028, 0, 0.05],
      [0.78, 0.026, -0.12, 0],
      [0.83, 0.0, 0.05, 0.3],
    ];
    const nail = new THREE.CylinderGeometry(0.0007, 0.0019, 0.09, 6),
      head = new THREE.CylinderGeometry(0.0045, 0.0045, 0.0016, 10);
    for (const [y, z, by, bz] of NAILS) {
      K.add(M.worn, nail, 0.012, y, z, 0, by, -Math.PI / 2 + bz);
      K.add(M.worn, head, -0.0325, y, z, 0, 0, -Math.PI / 2);
    }
    // two nails driven in from the edge (sticking out sideways)
    for (const [y, s] of [
      [0.6, 1],
      [0.74, -1],
    ])
      K.add(M.rust, nail, -0.005, y, s * 0.07, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0);
    K.build(g);
    return g;
  };
  ZWMOD.LIE.nagelbrett = { rz: Math.PI / 2, lift: 0.032 };
  ZWMOD.GRIP.nagelbrett = { at: 0.15, len: 0.86 };
  // first person: both hands round the rag like a bat (the right above the left), the nails leading in the axe's diagonal chop
  ZWMOD.HANDS.nagelbrett = { R: { p: [0, 0.2, 0], y: [0, 1, 0] }, L: { p: [0, 0.075, 0], y: [0, 1, 0] } };
  ZFP.POSE.nagelbrett = {
    // ready: the right hand low on the right, the board up and forward towards the middle, the nails to the left (the way it strikes)
    R: { p: [0.17, -0.27, -0.42], y: [-0.25, 0.75, -0.6], x: [-0.95, -0.2, 0.15] },
    low: { p: [0.2, -0.36, -0.32], y: [-0.1, 0.3, -0.95], x: [-0.99, -0.05, 0.1] },
    // the swing: the axe's diagonal (zombie/z_fp.js) – over the right shoulder, down from the upper right through the middle
    wind: { p: [0.22, 0.02, -0.2], y: [0.45, 0.601, 0.661], x: [-0.184, 0.786, -0.59] },
    mid: { p: [0.16, -0.04, -0.4], y: [0.447, 0.744, -0.496], x: [-0.677, -0.082, -0.732] },
    hit: { p: [0.1, -0.24, -0.42], y: [-0.332, 0.205, -0.921], x: [-0.51, -0.86, -0.007] },
    follow: { p: [0, -0.36, -0.4], y: [-0.601, -0.45, -0.661], x: [-0.209, -0.709, 0.674] },
  };
  ZFP.reset();
  // ---- a sharpened blade strikes harder (zombie/z_waffe.js land asks), each hit that lands uses one up ----
  ZWAFFE.dmgK = id => (BLADES.includes(id) && sharp(id) > 0 ? SHARP.k : 1);
  KERN.on('zombie:treffer', d => {
    const id = d && d.id === 'axe' ? 'axt' : d && d.id;
    if (!id || !BLADES.includes(id) || !(sharp(id) > 0)) return;
    const s = wst(id);
    s.sharp = sharp(id) - 1;
    if (s.sharp <= 0) {
      delete s.sharp;
      PLAY.think('Die Schneide ist wieder stumpf.', 1600);
    }
    Z.save();
  });
  // ---- the workbenches ----
  const T0 = { x0: -3.0, x1: -1.5, y1: -39.87, z: 0.86 }; // the white bench of today's lean-to (garden/workshop.js, phase 0)
  const T1 = { x0: -1.9, x1: 0.1, y1: -39.8, z: 0.88 }; // the carpenter's bench of the hall (phase 1 on)
  const WT = (x, y) => (BUILD && BUILD.werkstatt ? BUILD.werkstatt.tf(x, y) : [x, y]);
  // a bench: where one stands (x, y), its top (the action's place and where a thing is laid down), its name
  function gardenBench() {
    const b = PHASE < SAW_PH ? T0 : T1,
      [x, y] = WT((b.x0 + b.x1) / 2, b.y1 + 0.42),
      top = WT((b.x0 + b.x1) / 2, b.y1 - 0.3);
    return { x, y, top: [top[0], top[1], b.z], name: 'Werkstatt im Garten', kind: 'garten' };
  }
  // the old garage's bench against its south wall (garden/garage.js WB: only in phase 0, its frame GAR.alt)
  function garageBench() {
    if (!GARAGE || PHASE > 0 || !GARAGE.GAR || !GARAGE.GAR.alt) return null;
    const G = GARAGE.GAR.alt,
      [x, y] = G.toW(2.05, 0.72 + 0.4),
      top = G.toW(2.05, 0.42);
    return { x, y, top: [top[0], top[1], (GARAGE.Z0 || 0) + 0.9], name: 'alte Garage', kind: 'garage' };
  }
  // a cellar bench of the house one is in (its container 'werkbank')
  function houseBenches() {
    const H = ZHAUS.H;
    if (!H || !H.containers) return [];
    return H.containers
      .filter(c => c.kind === 'werkbank' && c.pos)
      .map(c => ({ x: c.pos[0], y: c.pos[1], top: c.pos, name: 'Werkbank im Keller', kind: 'haus', c }));
  }
  const hyp = Math.hypot;
  function benchNear(r = 1.7) {
    let best = null,
      bd = r;
    for (const b of [gardenBench(), garageBench(), ...houseBenches()]) {
      if (!b) continue;
      const d = hyp(b.x - P.x, b.y - P.y);
      if (d < bd && Math.abs(b.top[2] - (P.feet + 0.9)) < 1.4) {
        bd = d;
        best = b;
      }
    }
    return best;
  }
  const can = () => Z.on && Z.hp > 0 && P.mode === 'walk' && !PLAY.seat && !HUD.open && !(ZHAUS && ZHAUS.busy);
  // the action sits on the bench top (the player faces it), a little above it
  const actAt = b => (b ? [b.top[0], b.top[1], b.top[2] + 0.1] : null);
  const LABEL = 'An der Werkbank basteln';
  KERN.act({
    id: 'zwerk:garten',
    r: 1.6,
    prio: 0.35,
    pos: () => (Z.on ? actAt(gardenBench()) : null),
    label: () => (can() ? (S.open ? 'Werkbank schließen' : LABEL) : null),
    gest3: 'interact',
    run: () => toggle(gardenBench()),
  });
  KERN.act({
    id: 'zwerk:garage',
    r: 1.5,
    prio: 0.35,
    pos: () => (Z.on ? actAt(garageBench()) : null),
    label: () => (can() ? (S.open ? 'Werkbank schließen' : LABEL) : null),
    gest3: 'interact',
    run: () => toggle(garageBench()),
  });
  // in a house: at the cellar bench; the bench's drawer comes first while it is not searched (the nails are in it)
  KERN.act({
    id: 'zwerk:haus',
    r: 1.4,
    get prio() {
      const b = houseBenches()[0];
      return b && b.c && (b.c.searched || b.c.want > 0.5) ? 0.08 : -0.12;
    },
    pos: () => (Z.on ? actAt(houseBenches()[0]) : null),
    label: () => (can() && houseBenches().length ? (S.open ? 'Werkbank schließen' : LABEL) : null),
    gest3: 'interact',
    run: () => toggle(houseBenches()[0]),
  });
  // ---- the panel ----
  const CSS = `
#zwerk{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);z-index:8;width:min(430px,94vw);max-height:min(78vh,620px);overflow:auto;
  background:rgba(18,12,12,.9);color:#f2e9e4;border-radius:9px;padding:10px 12px 10px;font:400 12.5px/1.38 var(--f-body,system-ui);
  backdrop-filter:blur(6px);box-shadow:0 8px 30px rgba(0,0,0,.45);user-select:none;pointer-events:auto;-webkit-overflow-scrolling:touch}
#zwerk[hidden]{display:none!important}
#zwerk .zwh{display:flex;align-items:baseline;gap:8px;font:600 11px/1.3 var(--f-mono,monospace);letter-spacing:.04em;color:#ffb3a1;text-transform:uppercase}
#zwerk .zwh em{flex:1;font-style:normal;color:#f2e9e4;text-transform:none;letter-spacing:0;font-weight:500;opacity:.85}
#zwerk .zwx{border:0;background:rgba(255,255,255,.12);color:#f2e9e4;width:30px;height:30px;border-radius:50%;font:600 14px/1 system-ui;cursor:pointer;flex:none}
#zwerk .zwx:hover{background:rgba(255,255,255,.24)}
#zwerk .zws{margin:9px 0 3px;font:600 10.5px/1.2 var(--f-mono,monospace);letter-spacing:.06em;text-transform:uppercase;opacity:.65}
#zwerk .zwr{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;padding:7px 8px;margin:3px 0;border-radius:7px;background:rgba(255,255,255,.06);cursor:pointer}
#zwerk .zwr.on{background:rgba(255,179,161,.16);box-shadow:inset 0 0 0 1px rgba(255,179,161,.5)}
#zwerk .zwr b{font-weight:600} #zwerk .zwr .zt2{grid-column:1;font:500 11px/1.35 var(--f-mono,monospace);opacity:.85}
#zwerk .zwr .zt3{grid-column:1;font-size:11px;opacity:.65}
#zwerk .zwr .zm{color:#ff8f7a} #zwerk .zwr .zk{color:#bfe3b0}
#zwerk .zwr button{grid-column:2;grid-row:1/span 3;min-width:74px;min-height:34px;font:600 12px/1 var(--f-body,system-ui);border:0;border-radius:999px;padding:8px 12px;background:#ffb3a1;color:#2a0b0b;cursor:pointer}
#zwerk .zwr button:disabled{background:rgba(255,255,255,.14);color:rgba(242,233,228,.55);cursor:default}
#zwerk .zwp{margin-top:8px;display:grid;grid-template-columns:1fr;gap:4px} #zwerk .zwp[hidden]{display:none}
#zwerk .zwp b{display:block;height:7px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden}
#zwerk .zwp b i{display:block;height:100%;width:0;border-radius:4px;background:linear-gradient(90deg,#7c6a12,#e6c84a)}
#zwerk .zwp span{font:500 11px/1.3 var(--f-mono,monospace);opacity:.85}
#zwerk .zwf{margin-top:8px;font:500 10.5px/1.3 var(--f-mono,monospace);opacity:.55}
#zwerk .zwe{opacity:.7;font-size:11.5px;padding:4px 2px}
`;
  function build() {
    if (S.el) return S.el;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const d = document.createElement('div');
    d.id = 'zwerk';
    d.hidden = true;
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Werkbank');
    d.innerHTML = `<div class="zwh"><span>Werkbank</span><em class="zww"></em><button class="zwx" aria-label="Schließen">✕</button></div>
      <div class="zwl"></div>
      <div class="zwp" hidden><b><i></i></b><span></span></div>
      <div class="zwf">${COARSE ? 'Antippen: wählen · Bauen' : '↑↓ wählen · Enter: bauen · Esc: schließen'}</div>`;
    (stage || document.body).appendChild(d);
    d.addEventListener('click', e => {
      if (e.target.closest('.zwx')) return close();
      const b = e.target.closest('button[data-i]');
      const r = e.target.closest('.zwr');
      if (r) {
        S.sel = +r.dataset.i;
        mark();
      }
      if (b && !b.disabled) start(S.rows[+b.dataset.i]);
      if (b) b.blur();
    });
    // touch: a tap on a row selects it, the stage behind gets nothing
    for (const ev of ['pointerdown', 'touchstart', 'wheel']) d.addEventListener(ev, e => e.stopPropagation());
    S.el = d;
    return d;
  }
  const n2 = (k, n) => n + ' ' + (n === 1 ? IT[k].name : IT[k].pl);
  const needTxt = need =>
    Object.entries(need)
      .map(([k, n]) => {
        const have = Z.sup[k] || 0;
        return `<span class="${have >= n ? 'zk' : 'zm'}">${n2(k, n)} (${have})</span>`;
      })
      .join(' · ') || '<span class="zk">nur Zeit</span>';
  const enough = need => Object.entries(need).every(([k, n]) => (Z.sup[k] || 0) >= n);
  // the rows: recipes, then repairs and sharpening of what one carries
  function rowsNow() {
    const out = [];
    for (const r of RECIPES) {
      let why = enough(r.need) ? '' : 'Es fehlt etwas.';
      if (r.id === 'nagelbrett' && carried('nagelbrett')) why = 'Du hast schon eins – flicken geht unten.';
      out.push({ kind: 'bau', id: r.id, name: r.name, need: r.need, min: r.min, snd: r.snd, text: r.text, why });
    }
    const ids = Object.keys(FIX).filter(id => carried(id));
    for (const id of ids) {
      const c = Math.round(cond(id));
      if (c >= 100) continue;
      const f = FIX[id];
      out.push({
        kind: 'fix',
        id,
        name: W[id].name + ' reparieren',
        need: f.need,
        min: f.min,
        snd: f.snd,
        text: f.verb + ' – Zustand ' + c + ' % → 100 %',
        why: enough(f.need) ? '' : 'Es fehlt etwas.',
      });
    }
    for (const id of BLADES.filter(id => carried(id))) {
      const s = sharp(id);
      out.push({
        kind: 'sharp',
        id,
        name: W[id].name + ' schärfen',
        need: {},
        min: SHARP.min,
        snd: ['stein'],
        text: s
          ? 'Noch ' + s + ' Schläge scharf – nachschärfen'
          : 'Wetzstein: +30 % Schaden für die nächsten ' + SHARP.hits + ' Treffer',
        why: s >= SHARP.hits ? 'Ist schon scharf.' : '',
      });
    }
    return out;
  }
  function render() {
    const d = build();
    S.rows = rowsNow();
    if (S.sel >= S.rows.length) S.sel = Math.max(0, S.rows.length - 1);
    const sec = { bau: 'Bauen', fix: 'Reparieren', sharp: 'Schärfen' };
    let last = null,
      h = '';
    S.rows.forEach((r, i) => {
      if (r.kind !== last) {
        h += `<div class="zws">${sec[r.kind]}</div>`;
        last = r.kind;
      }
      const dis = !!r.why || !!S.job;
      h += `<div class="zwr${i === S.sel ? ' on' : ''}" data-i="${i}"><b>${r.name} <small style="opacity:.6;font-weight:400">· ${r.min} min</small></b>
        <div class="zt2">${needTxt(r.need)}</div><div class="zt3">${r.why || r.text}</div>
        <button data-i="${i}"${dis ? ' disabled' : ''}>${r.kind === 'bau' ? 'Bauen' : r.kind === 'fix' ? 'Flicken' : 'Schärfen'}</button></div>`;
    });
    if (!S.rows.some(r => r.kind !== 'bau'))
      h +=
        '<div class="zwe">Eine abgenutzte Waffe in der Hand oder im Rucksack lässt sich hier flicken, eine Klinge schärfen.</div>';
    d.querySelector('.zwl').innerHTML = h;
    d.querySelector('.zww').textContent = S.where ? S.where.name : '';
    S.sig = sig();
  }
  // a fingerprint of what the panel shows (re-rendered only when it changes)
  const sig = () =>
    JSON.stringify([Z.sup, Object.keys(FIX).map(id => [carried(id), Math.round(cond(id)), sharp(id)]), !!S.job]);
  function mark() {
    if (!S.el) return;
    S.el.querySelectorAll('.zwr').forEach((r, i) => r.classList.toggle('on', i === S.sel));
    const on = S.el.querySelector('.zwr.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }
  function openAt(b) {
    if (!b || !can()) return false;
    S.where = b;
    S.at = [P.x, P.y];
    S.open = true;
    S.sel = 0;
    render();
    S.el.hidden = false;
    // the mouse free for the buttons
    try {
      if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    } catch (e) {}
    KERN.emit('zombie:werkbank', { kind: b.kind });
    return true;
  }
  function close() {
    if (S.job) cancel('Abgebrochen.');
    S.open = false;
    if (S.el) S.el.hidden = true;
  }
  function toggle(b) {
    if (S.open) close();
    else openAt(b);
  }
  // keys while the panel is open: ↑ ↓ choose, Enter / Space build, Esc closes – the game gets none of them
  window.addEventListener(
    'keydown',
    e => {
      if (!S.open) return;
      const k = e.key;
      if (k === 'Escape') close();
      else if (k === 'ArrowDown' || k === 'ArrowUp') {
        if (S.rows.length) S.sel = (S.sel + (k === 'ArrowDown' ? 1 : S.rows.length - 1)) % S.rows.length;
        mark();
      } else if (k === 'Enter' || k === ' ') {
        if (!e.repeat) start(S.rows[S.sel]);
      } else if (/^[1-9]$/.test(k) && +k <= S.rows.length) {
        S.sel = +k - 1;
        mark();
      } else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true
  );
  // ---- the work: time passes (a time-lapse of the game clock), the sounds of it, then the result ----
  function start(r) {
    if (!r || S.job || r.why || !can()) return false;
    if (!enough(r.need)) {
      PLAY.think('Dafür fehlt mir noch etwas.', 1500);
      return false;
    }
    // real seconds like the clock's own waiting (time/clock.js wait): 10 min ~2.2 s, 25 min ~2.8 s
    const secs = Math.max(1.5, Math.min(8, 1.2 + Math.sqrt(r.min) * 0.32));
    S.job = { r, t: 0, secs, x: P.x, y: P.y, sndT: 0, n: 0, t0: CLOCK.t };
    // the guest's clock is the host's (zombie/z_netz.js): there only the work's own time runs
    const guest = ZNETZ && ZNETZ.on && ZNETZ.role === 'gast';
    if (!guest) CLOCK.wait(r.min, r.kind === 'bau' ? 'Basteln' : r.kind === 'fix' ? 'Reparieren' : 'Schärfen');
    render();
    progress();
    return true;
  }
  function cancel(why) {
    if (!S.job) return;
    S.job = null;
    if (CLOCK.warp) CLOCK.cancel();
    if (why) PLAY.think(why, 1400);
    if (S.el && S.open) render();
  }
  function progress() {
    if (!S.el) return;
    const p = S.el.querySelector('.zwp'),
      j = S.job;
    p.hidden = !j;
    if (!j) return;
    const k = Math.min(1, j.t / j.secs),
      s = j.r.snd[Math.min(j.r.snd.length - 1, Math.floor(k * j.r.snd.length))];
    p.querySelector('i').style.width = Math.round(k * 100) + '%';
    p.querySelector('span').textContent =
      (s === 'saege'
        ? 'Sägen'
        : s === 'hammer'
          ? 'Hämmern'
          : s === 'stein'
            ? 'Wetzen'
            : s === 'feile'
              ? 'Feilen'
              : s === 'gluck'
                ? 'Benzin einfüllen'
                : 'Lappen stopfen') +
      ' … ' +
      Math.round(j.r.min * k) +
      ' / ' +
      j.r.min +
      ' min';
  }
  function finish(r) {
    for (const [k, n] of Object.entries(r.need)) Z.use(k, n);
    let msg = '';
    if (r.kind === 'bau' && r.id === 'nagelbrett') {
      Object.assign(wput('nagelbrett'), { cond: 100 });
      const T = ZWAFFE.thing('nagelbrett');
      if (T.state === 'world') T.gone();
      PLAY.give(T);
      msg = 'Ein Nagelbrett. Hässlich, aber es wird wehtun.';
    } else if (r.kind === 'bau' && r.id === 'molotow') {
      Z.add('molotow', 1);
      msg = 'Ein Molotow-Cocktail. Werfen mit ' + (COARSE ? '🔥' : 'F') + '.';
    } else if (r.kind === 'fix') {
      wput(r.id).cond = 100;
      delete S.warned[r.id];
      msg = W[r.id].name + ' ist wieder wie neu.';
    } else if (r.kind === 'sharp') {
      wput(r.id).sharp = SHARP.hits;
      msg = W[r.id].name + ' ist scharf – die nächsten ' + SHARP.hits + ' Treffer gehen tiefer.';
    }
    Z.save();
    Z.emit('werk', { kind: r.kind, id: r.id });
    PLAY.think(msg, 2600);
    markDirty();
  }
  // ---- sounds: a hand saw, the hammer (zombie/z_ton.js, heard by the zombies like barricading), a whetstone, a file, petrol, the rag ----
  let NB = null;
  function noiseBuf(ctx) {
    if (NB && NB.sampleRate === ctx.sampleRate) return NB;
    NB = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const a = NB.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    return NB;
  }
  // a band of noise with an envelope at (x, y): f, its sweep to f1, q, the attack a and decay d, tremolo am (Hz) for a saw's teeth
  function band(
    x,
    y,
    { f = 2000, f1 = 0, q = 2, vol = 0.4, a = 0.01, d = 0.2, am = 0, ref = 8, type = 'bandpass', at = 0 } = {}
  ) {
    const R = audio.raw && audio.raw();
    if (!R || R.ctx.state !== 'running') return;
    const ctx = R.ctx,
      sp = audio.spatial(x, y, ref),
      v = vol * sp.vol;
    if (v < 0.004) return;
    const t = ctx.currentTime + 0.01 + at,
      src = ctx.createBufferSource(),
      fl = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = noiseBuf(ctx);
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    fl.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0008, t + a + d);
    src.connect(fl);
    let last = fl;
    if (am) {
      const tr = ctx.createGain(),
        lfo = ctx.createOscillator(),
        dep = ctx.createGain();
      tr.gain.value = 0.55;
      lfo.frequency.value = am;
      dep.gain.value = 0.45;
      lfo.connect(dep);
      dep.connect(tr.gain);
      fl.connect(tr);
      last = tr;
      lfo.start(t);
      lfo.stop(t + a + d + 0.05);
    }
    last.connect(g);
    let out = g;
    if (ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = Math.max(-1, Math.min(1, sp.pan));
      g.connect(pn);
      out = pn;
    }
    out.connect(R.sfx);
    src.start(t, Math.random() * 0.8);
    src.stop(t + a + d + 0.05);
  }
  // a short pitched tone (a ring of the blade, a gulp of petrol): f → f1 over d
  function tone(x, y, { f = 600, f1 = 0, vol = 0.2, d = 0.15, type = 'sine', ref = 6, at = 0 } = {}) {
    const R = audio.raw && audio.raw();
    if (!R || R.ctx.state !== 'running') return;
    const ctx = R.ctx,
      sp = audio.spatial(x, y, ref),
      v = vol * sp.vol;
    if (v < 0.004) return;
    const t = ctx.currentTime + 0.01 + at,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g);
    g.connect(R.sfx);
    o.start(t);
    o.stop(t + d + 0.05);
  }
  const SND = {
    // a push stroke and a shorter pull: the teeth through the board (a trembling band), the zombies hear it a little
    saege: (x, y) => {
      band(x, y, { f: 2600, f1: 3400, q: 1.4, vol: 0.32, a: 0.05, d: 0.3, am: 70 });
      band(x, y, { f: 3200, f1: 2500, q: 1.4, vol: 0.22, a: 0.04, d: 0.22, am: 55, at: 0.38 });
      Z.noise(x, y, 14, 0.6, 'saege');
      return 0.68;
    },
    hammer: (x, y) => {
      ZTON.hammer(x, y);
      Z.noise(x, y, 26, 0.6, 'hammer');
      return 0.43;
    },
    // the whetstone along the edge: a hiss up and down, the blade rings
    stein: (x, y) => {
      band(x, y, { f: 5200, f1: 7400, q: 3, vol: 0.2, a: 0.06, d: 0.28 });
      tone(x, y, { f: 3150, vol: 0.035, d: 0.5, at: 0.05 });
      band(x, y, { f: 7000, f1: 5000, q: 3, vol: 0.16, a: 0.05, d: 0.24, at: 0.42 });
      return 0.8;
    },
    feile: (x, y) => {
      band(x, y, { f: 4200, q: 4, vol: 0.18, a: 0.03, d: 0.16, am: 140 });
      return 0.34;
    },
    gluck: (x, y) => {
      for (let i = 0; i < 3; i++) tone(x, y, { f: 420 - i * 40, f1: 160, vol: 0.12, d: 0.09, at: i * 0.11 });
      band(x, y, { f: 900, q: 0.8, vol: 0.05, a: 0.05, d: 0.25, type: 'lowpass' });
      return 0.5;
    },
    lappen: (x, y) => {
      band(x, y, { f: 1400, f1: 900, q: 0.7, vol: 0.1, a: 0.04, d: 0.2 });
      return 0.45;
    },
  };
  // ---- the weapon in the hand nearly worn out: a short thought, once ----
  const WORN = {
    nagelbrett: 'Das Nagelbrett splittert – lange hält es nicht mehr.',
    motorsaege: 'Die Kette schlägt und ist stumpf.',
    brechstange: 'Die Brechstange ist schon ganz verbogen.',
    flinte: 'Die Flinte hakt beim Spannen.',
  };
  function wornThought(id) {
    const c = cond(id);
    if (c > 40) delete S.warned[id];
    if (c > 0 && c < 22 && !S.warned[id]) {
      S.warned[id] = true;
      PLAY.think(
        (WORN[id] ||
          'Der Stiel ' + (id === 'sense' ? 'der Sense' : 'vom ' + W[id].name) + ' wackelt – bald bricht er.') +
          ' An einer Werkbank flicken.',
        3200
      );
    }
  }
  // ---- what the zombie panel adds under the weapon (zombie/z_hud.js asks): the condition of saw and gun, a sharp edge, F ----
  ZHUD.wmore = w => {
    let info = '',
      keys = '';
    if (w && (w.id === 'motorsaege' || w.id === 'flinte')) info += ' · Zustand ' + Math.round(cond(w.id)) + ' %';
    const s = w ? sharp(w.id === 'axe' ? 'axt' : w.id) : 0;
    if (s) info += ' · scharf (' + s + ')';
    const m = Z.sup.molotow || 0;
    if (m > 0) keys = (COARSE ? ' · 🔥 Molotow (' : ' · F: Molotow (') + m + ')';
    return { info, keys };
  };
  // ---- per frame ----
  function tick(dt) {
    if (!Z.on) {
      if (S.open) close();
      return;
    }
    const j = S.job;
    if (j) {
      j.t += dt;
      // the work's sounds, one after another (the recipe's list split over the time)
      j.sndT -= dt;
      const k = Math.min(0.999, j.t / j.secs),
        s = j.r.snd[Math.floor(k * j.r.snd.length)];
      if (j.sndT <= 0 && SND[s]) j.sndT = SND[s](P.x, P.y);
      if (hyp(P.x - j.x, P.y - j.y) > 0.9 || Z.hp <= 0) cancel('Abgebrochen – dafür muss ich an der Werkbank bleiben.');
      else if (j.t >= j.secs) {
        S.job = null;
        finish(j.r);
        if (S.open) render();
      }
      progress();
    }
    S.acc += dt;
    if (S.acc < 0.25) return;
    S.acc = 0;
    // walked away (or the house was left): the panel closes
    if (S.open && (!can() || !S.where || hyp(P.x - S.where.x, P.y - S.where.y) > 2.4)) close();
    else if (S.open && sig() !== S.sig) render();
    const id = ZWAFFE.cur();
    if (id && id !== 'faust') wornThought(id);
  }
  KERN.tick(tick, 'zombie/werk');
  // ---- a reload: the crafted nail board lies on the garden bench again (the backpack's things are not saved, the weapons lie where they
  // were found – zombie/z_waffe.js placeAll) ----
  KERN.on('zombie:start', d => {
    if (d && d.fresh) return;
    const s = wst('nagelbrett');
    if (!s || !(cond('nagelbrett') > 0)) return;
    const T = ZWAFFE.thing('nagelbrett');
    if (PLAY.has(T) || T.state === 'world') return;
    const b = gardenBench();
    T.place(
      b.top[0],
      b.top[1],
      b.top[2] + 0.004,
      ((BUILD && BUILD.werkstatt ? BUILD.werkstatt.da : 0) * Math.PI) / 180
    );
  });
  KERN.on('zombie:stop', () => close());
  // tests: the state in numbers
  function info() {
    return {
      open: S.open,
      where: S.where ? S.where.kind : null,
      rows: (S.rows || []).map(r => [r.kind, r.id, !r.why]),
      job: S.job ? { id: S.job.r.id, kind: S.job.r.kind, t: +S.job.t.toFixed(2), secs: +S.job.secs.toFixed(2) } : null,
      bench: benchNear(3) ? benchNear(3).kind : null,
      sharp: Object.fromEntries(BLADES.map(id => [id, sharp(id)])),
    };
  }
  Object.assign(S, {
    RECIPES,
    FIX,
    BLADES,
    SHARP,
    gardenBench,
    garageBench,
    houseBenches,
    benchNear,
    openAt,
    close,
    toggle,
    start,
    cancel,
    render,
    info,
    cond,
    sharp,
    carried,
    band,
    tone,
    SND,
  });
  return S;
})();
window.ZWERK = ZWERK;
