// ===================== garden planner 7: buying at the Baumschule Kammbach, bringing the plants home (GPSHOP) =====================
// At the nursery in Kloster Veßra (welt/vessra.js: VESSRA.baumschule once VESSRA.state is 'ready') the plants of the shopping list stand in
// black containers with a white tag in the slots of the beds of their kind (fruit, berries, ornamentals, climbers, ground cover), the
// nursery's own plant taken out there (VESSRA.baumschule.take; putBack when it is not wanted any more). „Aussuchen“ puts one into the
// basket; „Bezahlen“ at the counter shows the receipt (the plants and the date, no prices) with „Liefern lassen“ (next game morning by
// the garden gate) or „Selbst mitnehmen“ (the plants wait at the counter). There „Ins Auto laden“ when the estate car stands within 15 m
// or on the nursery's parking place: small plants upright in the load space, trees up to 2.2 m lying with the crown between the folded
// seats; tall standards go on the trailer when it is coupled to the car, else they wait for the delivery („Liefern lassen“ at the
// counter). „Ausladen“ at the tailgate sets them down behind the car; „Tragen“ takes one into the arms (the arms pose of PLAY, the second
// button puts it down) – with it the planting step „Einpflanzen“ at its hole (gplan/gplan_game.js).
// Planting needs a bought plant unless GPLAN.frei (a switch for tests) or there is no nursery (the world around Ratscher off). The
// containers are the plan's kuebel (saved with it): { k, id, loc: korb | kasse | liefer | tor | auto | anh | boden | hand, x, y, tag (game
// day of buying), s (the nursery slot it came from, 'art:slot') }.
// Task gplan-kaufen (core/tasks.js): from the shopping list to the last bought plant in the ground. Events: gplan:ausgesucht,
// gplan:gekauft { n, ids }, gplan:liefern, gplan:geliefert, gplan:geladen, gplan:ausgeladen, gplan:getragen, gplan:abgestellt.
import * as THREE from 'three';
import { scene, stage, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { TASKS } from '../core/tasks.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CAM3 } from '../game/player.js';
import { toast } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { S0 } from '../garden/env.js';
import { VEH } from '../vehicles/vehicle.js';
import { TRAILER } from '../vehicles/trailer.js';
import { VESSRA } from '../welt/vessra.js';
import { GPMODEL as M } from './gplan_model.js';
import { GP3D } from './gplan_3d.js';
import { GPLAN } from './gplan.js';
export const GPSHOP = (() => {
  const S = { shelf: [], near: false, acc: 0, seq: 0, key: '', bon: null, anchor: null, carKey: '' };
  const ST = () => GPLAN.state;
  const db = () => GPLAN.data.db;
  const nameOf = id => (db().byId.get(id) ? M.fullName(db().byId.get(id)) : id);
  const hourNow = () => ((((CLOCK.t % 1440) + 1440) % 1440) / 60) | 0;
  const newKey = () => 'k' + Date.now().toString(36) + (S.seq++).toString(36);
  const nursery = () => (VESSRA && VESSRA.state === 'ready' && VESSRA.baumschule) || null;
  const car = () => VEH.by && VEH.by.car;
  const nOf = loc => ST().kuebel.filter(c => c.loc === loc).length;
  const plural = n => n + (n === 1 ? ' Pflanze' : ' Pflanzen');
  // ---------------- the nursery's beds: which bed a plant stands on (GPMODEL.bedArt), which slot ----------------
  const artOf = M.bedArt;
  // the plan items still to buy and not in the basket yet
  function wanted() {
    const inBasket = new Map();
    for (const c of ST().kuebel) if (c.loc === 'korb') inBasket.set(c.id, (inBasket.get(c.id) || 0) + 1);
    return GPLAN.toBuy().filter(it => {
      const n = inBasket.get(it.id) || 0;
      if (!n) return true;
      inBasket.set(it.id, n - 1);
      return false;
    });
  }
  // the containers on the beds: each plant still to buy in a slot of a bed of its kind, the nursery's own plant taken out there
  // (VESSRA.baumschule.take; all of them are back after the zone is built anew). A container in the basket or at the counter keeps its
  // slot empty, so the others stay where they stand; a bought one's slot stays empty while the zone stands (taken out of the bed).
  const MINE = new Set();
  let bsRef = null;
  function shelf() {
    const B = nursery();
    if (!B || !GPLAN.ready) return [];
    if (B !== bsRef) {
      bsRef = B;
      MINE.clear();
    }
    const K = ST().kuebel,
      held = new Set(K.filter(c => c.s).map(c => c.s)),
      busy = new Set(K.filter(c => c.s && (c.loc === 'korb' || c.loc === 'kasse')).map(c => c.s)),
      inBasket = new Map();
    for (const c of K) if (c.loc === 'korb') inBasket.set(c.id, (inBasket.get(c.id) || 0) + 1);
    const list = GPLAN.toBuy().filter(it => {
      const n = inBasket.get(it.id) || 0;
      if (!n) return true;
      inBasket.set(it.id, n - 1);
      return false;
    });
    const next = {},
      out = [],
      want = new Set();
    for (const it of list.slice(0, 48)) {
      const p = db().byId.get(it.id);
      if (!p) continue;
      const art = artOf(p),
        bed = B.beete.find(b => b.art === art) || B.beete[0];
      let i = next[bed.art] || 0;
      while (i < bed.slots.length && busy.has(bed.art + ':' + i)) i++;
      if (i >= bed.slots.length) continue;
      next[bed.art] = i + 1;
      const key = bed.art + ':' + i,
        [x, y] = bed.slots[i];
      want.add(key);
      out.push({ it, p, x, y, z: VESSRA.gz(x, y) + 0.03, seed: 'kb:' + M.seedOf(it), tag: true, s: key });
    }
    if (B.take)
      for (const key of [...want, ...busy])
        if (!MINE.has(key)) {
          const [a, n] = key.split(':');
          if (B.take(a, +n)) MINE.add(key);
        }
    if (B.putBack)
      for (const key of [...MINE])
        if (!want.has(key) && !held.has(key)) {
          const [a, n] = key.split(':');
          B.putBack(a, +n);
          MINE.delete(key);
        }
    return out;
  }
  // ---------------- where the containers stand ----------------
  // waiting at the counter: in a row to the right of the customer, two deep
  function kassePos(j) {
    const K = nursery().kasse,
      a = (K.yaw * Math.PI) / 180,
      f = [Math.sin(a), Math.cos(a)],
      r = [Math.cos(a), -Math.sin(a)],
      u = 1.1 + (j % 6) * 0.5,
      w = -0.2 - Math.floor(j / 6) * 0.55,
      x = K.x + r[0] * u + f[0] * w,
      y = K.y + r[1] * u + f[1] * w;
    return [x, y, VESSRA.gz(x, y)];
  }
  // delivered: by the garden gate, a little into the garden (towards the pavilion) in rows of five, the first row where all five stand
  // in the garden, clear of the brook's ditch and of the trees' trunks
  let torW = null;
  function torPos(j) {
    const E = S0.entrance || [-8.86, 39.08],
      dx = 2.95 - E[0],
      dy = 2 - E[1],
      L = Math.hypot(dx, dy) || 1,
      f = [dx / L, dy / L],
      r = [f[1], -f[0]],
      at = (u, w) => [E[0] + f[0] * w + r[0] * u, E[1] + f[1] * w + r[1] * u];
    if (torW === null) {
      const S1 = GPLAN.site(),
        dry = ([x, y]) =>
          S1.brook(x, y) > S1.ditch / 2 + 1 &&
          GPLAN.RULES.inPoly(x, y, S1.boundary) &&
          S1.trees.every(t => Math.hypot(x - t[0], y - t[1]) > 0.8);
      torW = 2.2;
      for (let w = 2.2; w < 20; w += 0.5)
        if ([-2, -1, 0, 1, 2].every(k => dry(at(k * 0.6, w)) && dry(at(k * 0.6, w + 0.6)))) {
          torW = w;
          break;
        }
    }
    return at(((j % 5) - 2) * 0.6, torW + Math.floor(j / 5) * 0.6);
  }
  // the car's load space (car.js model.cargo, the car's frame: x right, y ahead, z up): small plants upright in rows, plants up to 2.2 m
  // lying (the pot at the tailgate, the crown ahead between the folded seats); null for one that does not fit
  const LIE_MAX = 2.2;
  const tallStandard = p => p.form === 'hochstamm' || p.form === 'solitaer';
  function cargoPlan(list) {
    const v = car();
    if (!v) return list.map(() => null);
    const C = v.model.cargo,
      W = C.hw * 2;
    let x = -C.hw,
      colW = 0,
      y = C.y0,
      lieDone = false;
    const out = [];
    // lying ones first (a column each), then the upright ones in columns from the tailgate forward
    const lies = p => !!p && M.sizeAt(p, 0, '').h > C.h - 0.05;
    const order = list.map((c, i) => ({ c, i, p: db().byId.get(c.id) })).sort((a, b) => +lies(b.p) - +lies(a.p));
    for (const { i, p } of order) {
      if (!p) continue;
      const pot = GP3D.potSize(p),
        h = M.sizeAt(p, 0, '').h,
        d = pot.d + 0.04;
      if (tallStandard(p) || h > LIE_MAX) continue;
      if (h > C.h - 0.05) {
        if (x + colW + d > -C.hw + W) continue;
        x += colW;
        colW = d;
        out[i] = { x: x + d / 2, y: C.y0 + 0.02, z: C.z, tilt: 1.35 };
        y = C.y1;
        lieDone = true;
        continue;
      }
      if (y + d > C.y1 || lieDone) {
        x += colW;
        colW = 0;
        y = C.y0;
        lieDone = false;
      }
      if (x + d > -C.hw + W) continue;
      out[i] = { x: x + d / 2, y: y + d / 2, z: C.z, tilt: 0 };
      colW = Math.max(colW, d);
      y += d;
    }
    return list.map((c, i) => out[i] || null);
  }
  // the trailer's bed (trailer.js bed, the trailer's frame): tall standards lying along it
  function trailerPos(j) {
    const B = TRAILER.bed;
    return { x: -B.hw + 0.3 + (j % 4) * 0.42, y: B.y0 + 0.3, z: B.z + 0.02, tilt: 1.45 };
  }
  // ---------------- the 3D sets: the world, the car, the trailer, the hands ----------------
  function refresh() {
    if (!GPLAN.ready) return;
    const month = GPLAN.seasonMonth(),
      K = ST().kuebel,
      W = [],
      at = c => db().byId.get(c.id);
    S.shelf = S.near ? shelf() : [];
    for (const s of S.shelf) W.push(s);
    let jk = 0,
      jt = 0;
    for (const c of K) {
      const p = at(c);
      if (!p) continue;
      const seed = 'kb:' + c.k;
      if (c.loc === 'kasse' && S.near) {
        const [x, y, z] = kassePos(jk++);
        W.push({ p, x, y, z, seed, tag: true, c });
      } else if (c.loc === 'tor' || c.loc === 'boden') {
        // a delivered one gets its place by the gate once (saved with it)
        if (c.loc === 'tor' && !Number.isFinite(c.x)) [c.x, c.y] = torPos(jt);
        if (c.loc === 'tor') jt++;
        W.push({ p, x: c.x, y: c.y, z: KERN.ground(c.x, c.y), seed, tag: true, c });
      }
    }
    S.world = W;
    GP3D.potSet('welt', scene, W, month);
    // the car's load and the trailer's (sets hung on them: they drive along)
    const v = car(),
      inCar = K.filter(c => c.loc === 'auto'),
      plan = cargoPlan(inCar);
    GP3D.potSet(
      'auto',
      v && v.g,
      inCar.map((c, i) =>
        Object.assign({ p: at(c), seed: 'kb:' + c.k, tag: true }, plan[i] || { x: 0, y: -1.9, z: 0.63 })
      ),
      month
    );
    const onTr = K.filter(c => c.loc === 'anh');
    GP3D.potSet(
      'anh',
      TRAILER.g,
      onTr.map((c, j) => Object.assign({ p: at(c), seed: 'kb:' + c.k, tag: true }, trailerPos(j))),
      month
    );
    // the hands
    const h = K.find(c => c.loc === 'hand');
    if (h && !S.anchor) {
      S.anchor = new THREE.Object3D();
      S.anchor.name = 'gplan-hand';
      scene.add(S.anchor);
    }
    GP3D.potSet('hand', S.anchor, h ? [{ p: at(h), x: 0, y: 0, z: 0, seed: 'kb:' + h.k }] : [], month);
    markDirty(true);
  }
  // ---------------- the actions ----------------
  const changed = () => {
    GPLAN.changed({ game: true, no3d: true });
    refresh();
  };
  // the nearest container on a bed of the nursery, or one by the gate or set down (for „Tragen“)
  function nearest(list, r) {
    let best = null,
      bd = r;
    for (const s of list) {
      const d = Math.hypot(s.x - P.x, s.y - P.y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }
  const atNursery = () => S.near && P.mode === 'walk';
  KERN.act({
    id: 'gplan:pick',
    r: 1.7,
    prio: 0.4,
    pos: () => {
      const s = atNursery() && nearest(S.shelf, 1.7);
      return s ? [s.x, s.y, s.z + 0.4] : null;
    },
    label: () => {
      const s = atNursery() && nearest(S.shelf, 1.7);
      return s ? 'Aussuchen – ' + M.fullName(s.p) : null;
    },
    gest3: 'pickupLow',
    run: () => {
      const s = nearest(S.shelf, 1.7);
      if (!s) return;
      ST().kuebel.push({ k: newKey(), id: s.it.id, loc: 'korb', s: s.s });
      const n = nOf('korb');
      KERN.emit('gplan:ausgesucht', { id: s.it.id, n });
      toast(M.fullName(s.p) + ' ausgesucht – ' + plural(n) + ' im Korb.', 2200);
      changed();
    },
  });
  // the counter: pay; with paid plants waiting: into the car or delivered. The car counts within 15 m of the counter, on the nursery's
  // parking place, or at its gate (where a car stands that did not drive into the yard)
  const carNear = () => {
    const v = car(),
      B = nursery();
    if (!v || !B) return false;
    const near = (p, r) => Math.hypot(v.st.x - p.x, v.st.y - p.y) < r;
    return near(B.kasse, 15) || near(B.parkplatz, 8) || near(B.eingang, 12);
  };
  function counterLabel() {
    if (!atNursery()) return null;
    const nk = nOf('korb'),
      nw = nOf('kasse');
    if (nk) return 'Bezahlen – ' + plural(nk);
    if (!nw) return null;
    return carNear() && loadable().length
      ? 'Ins Auto laden – ' + plural(loadable().length)
      : 'Liefern lassen – ' + plural(nw);
  }
  // the paid plants waiting at the counter that go into the car (or onto the coupled trailer)
  function loadable() {
    const W = ST().kuebel.filter(c => c.loc === 'kasse'),
      inCar = ST().kuebel.filter(c => c.loc === 'auto'),
      plan = cargoPlan([...inCar, ...W]).slice(inCar.length),
      tr = TRAILER.tow && TRAILER.tow === car();
    return W.filter((c, i) => plan[i] || (tr && tallStandard(db().byId.get(c.id) || {})));
  }
  KERN.act({
    id: 'gplan:kasse',
    r: 2.6,
    prio: 0.5,
    pos: () => {
      const K = nursery() && nursery().kasse;
      return K && counterLabel() ? [K.x, K.y, K.z + 0.9] : null;
    },
    label: counterLabel,
    hold: () => (nOf('korb') ? 0 : 1.6),
    anim3: 'interactLoop',
    run: () => {
      if (nOf('korb')) return pay();
      if (carNear() && loadable().length) return load();
      deliver(ST().kuebel.filter(c => c.loc === 'kasse'));
    },
  });
  function pay() {
    const B = ST().kuebel.filter(c => c.loc === 'korb'),
      day = GPLAN.gameDay();
    if (!B.length) return 0;
    for (const c of B) {
      c.loc = 'kasse';
      c.tag = day;
    }
    KERN.emit('gplan:gekauft', { n: B.length, ids: B.map(c => c.id) });
    receipt(B, day);
    changed();
    return B.length;
  }
  function deliver(list) {
    if (!list.length) return 0;
    const day = GPLAN.gameDay();
    for (const c of list) {
      c.loc = 'liefer';
      c.tag = day;
      delete c.x;
      delete c.y;
    }
    KERN.emit('gplan:liefern', { n: list.length });
    toast(plural(list.length) + ' kommen morgen früh ans Gartentor.', 3000);
    changed();
    return list.length;
  }
  function load() {
    const L = loadable(),
      tr = TRAILER.tow && TRAILER.tow === car();
    let nt = 0;
    for (const c of L)
      if (tr && tallStandard(db().byId.get(c.id) || {})) {
        c.loc = 'anh';
        nt++;
      } else c.loc = 'auto';
    const rest = nOf('kasse');
    KERN.emit('gplan:geladen', { n: L.length, anh: nt });
    toast(
      plural(L.length) +
        ' eingeladen' +
        (nt ? ' (' + nt + ' auf dem Anhänger)' : '') +
        '.' +
        (rest ? ' ' + plural(rest) + ' passen nicht hinein – „Liefern lassen“ an der Kasse.' : ''),
      3600
    );
    changed();
    return L.length;
  }
  // the tailgate: unload behind the car (rows of three), the trailer beside its bed
  const standing = v => v && Math.abs(v.st.u) < 0.4 && !VEH.cur;
  function tailgate() {
    const v = car();
    if (!v) return null;
    const C = v.model.cargo,
      p = VEH.toW(v, 0, C.y0 - 0.5);
    return [p[0], p[1], v.st.z + 0.8];
  }
  KERN.act({
    id: 'gplan:ausladen',
    r: 2.2,
    prio: 0.45,
    pos: () => (nOf('auto') && standing(car()) && P.mode === 'walk' ? tailgate() : null),
    label: () => (nOf('auto') && standing(car()) ? 'Ausladen – ' + plural(nOf('auto')) : null),
    hold: 1.6,
    anim3: 'interactLoop',
    run: () => unload('auto'),
  });
  KERN.act({
    id: 'gplan:abladen',
    r: 2.6,
    prio: 0.45,
    pos: () => {
      if (!nOf('anh') || P.mode !== 'walk' || !TRAILER.st) return null;
      const s = TRAILER.st;
      return [s.x, s.y, KERN.ground(s.x, s.y) + 0.8];
    },
    label: () => (nOf('anh') ? 'Abladen – ' + plural(nOf('anh')) : null),
    hold: 1.6,
    anim3: 'interactLoop',
    run: () => unload('anh'),
  });
  function unload(loc) {
    const L = ST().kuebel.filter(c => c.loc === loc),
      v = car();
    L.forEach((c, j) => {
      let q;
      if (loc === 'auto') q = VEH.toW(v, -0.6 + (j % 3) * 0.6, v.model.cargo.y0 - 0.9 - Math.floor(j / 3) * 0.6);
      else {
        // beside the trailer's bed, on its right
        q = TRAILER.toW(TRAILER.bed.hw + 0.9, TRAILER.bed.y0 + 0.4 + j * 0.6);
      }
      c.loc = 'boden';
      c.x = Math.round(q[0] * 100) / 100;
      c.y = Math.round(q[1] * 100) / 100;
    });
    KERN.emit('gplan:ausgeladen', { n: L.length });
    changed();
    return L.length;
  }
  // carrying one: the figure holds it in both arms (a thing of PLAY without a picture of its own – the plant is drawn here)
  const THING = PLAY.thing({
    id: 'gplan-topf',
    name: 'Pflanze im Topf',
    state: 'gone',
    carry3: 'arms',
    desc: () => {
      const h = ST().kuebel.find(c => c.loc === 'hand');
      return h ? nameOf(h.id) + ' – zum Pflanzloch tragen und einpflanzen.' : '';
    },
    onPlace: () => {
      const h = ST().kuebel.find(c => c.loc === 'hand');
      THING.state = 'gone';
      if (h) {
        h.loc = 'boden';
        h.x = Math.round(THING.pos[0] * 100) / 100;
        h.y = Math.round(THING.pos[1] * 100) / 100;
        KERN.emit('gplan:abgestellt', { id: h.id });
      }
      changed();
    },
  });
  const ground = () => (S.world || []).filter(s => s.c && (s.c.loc === 'tor' || s.c.loc === 'boden'));
  KERN.act({
    id: 'gplan:tragen',
    r: 1.5,
    prio: 0.35,
    pos: () => {
      if (P.mode !== 'walk' || nOf('hand')) return null;
      const s = nearest(ground(), 1.5);
      return s ? [s.x, s.y, s.z + 0.3] : null;
    },
    label: () => {
      if (nOf('hand')) return null;
      const s = nearest(ground(), 1.5);
      return s ? 'Tragen – ' + M.fullName(s.p) : null;
    },
    gest3: 'pickupLow',
    run: () => {
      const s = nearest(ground(), 1.5);
      if (!s) return;
      s.c.loc = 'hand';
      PLAY.give(THING);
      KERN.emit('gplan:getragen', { id: s.c.id });
      changed();
    },
  });
  // planted from the hands: the hands free again
  KERN.on('gplan:schritt', d => {
    if (d && d.schritt === 'pflanzen') {
      if (!nOf('hand') && PLAY.has(THING)) PLAY.take(THING);
      refresh();
    }
  });
  // ---------------- the receipt ----------------
  function receipt(list, day) {
    const by = new Map();
    for (const c of list) by.set(c.id, (by.get(c.id) || 0) + 1);
    let el = S.bon;
    if (!el) {
      el = S.bon = document.createElement('aside');
      el.id = 'gpbon';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Kassenzettel');
      el.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.b === 'liefer') deliver(ST().kuebel.filter(c => c.loc === 'kasse'));
        el.hidden = true;
      });
      el.addEventListener('keydown', e => e.stopPropagation());
      stage.appendChild(el);
    }
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    el.innerHTML =
      '<div class="gb-paper"><h3>Baumschule Kammbach</h3><p>Kloster Veßra</p>' +
      `<p class="gb-d">Kassenzettel · ${esc(M.dayDe(day))} · ${esc(CLOCK.hm())} Uhr</p><ul>` +
      [...by]
        .map(([id, n]) => {
          const p = db().byId.get(id);
          return `<li><b>${n} ×</b> ${esc(nameOf(id))}${p && p.form ? ' – ' + esc(M.FORM[p.form] || p.form) : ''}</li>`;
        })
        .join('') +
      `</ul><p class="gb-n">${esc(plural(list.length))}</p><p class="gb-t">Vielen Dank für Ihren Einkauf! Gut angießen.</p></div>` +
      '<div class="gb-row"><button type="button" class="acc" data-b="liefer">Liefern lassen – morgen früh am Gartentor</button>' +
      '<button type="button" data-b="mit">Selbst mitnehmen</button></div>';
    el.hidden = false;
    const b = el.querySelector('button');
    if (b) b.focus();
  }
  // ---------------- the frame tick: near the nursery, deliveries, the plant in the hands ----------------
  KERN.tick(dt => {
    const h = S.anchor && S.anchor.parent && ST().kuebel.some(c => c.loc === 'hand');
    if (h) {
      // in the figure's arms (third person); seen from the eyes: a little to the right and low, so the crown does not fill the view
      const third = CAM3.on,
        yaw = ((third ? P.body : P.yaw) * Math.PI) / 180,
        d = third ? 0.36 : 0.5,
        side = third ? 0 : 0.32,
        f = [Math.sin(yaw), Math.cos(yaw)],
        r = [Math.cos(yaw), -Math.sin(yaw)];
      S.anchor.position.copy(
        V(P.x + f[0] * d + r[0] * side, P.y + f[1] * d + r[1] * side, P.feet + (third ? 0.62 : 0.45))
      );
      S.anchor.rotation.set(0, -yaw, 0);
    }
    S.acc += dt;
    if (S.acc < 0.5) return;
    S.acc = 0;
    const B = nursery(),
      K = B && B.kasse,
      near = !!(K && Math.hypot(P.x - K.x, P.y - K.y) < 220);
    let dirty = false;
    if (near !== S.near) {
      S.near = near;
      // at the nursery with plants to buy: the task starts here too, if the shopping list was not looked at
      if (near)
        GPLAN.loadData().then(() => {
          refresh();
          if (S.shelf.length) KERN.emit('gplan:einkaufsliste', { n: S.shelf.length, at: 'baumschule' });
        });
      dirty = true;
    }
    // the delivery comes the next morning at seven
    const day = GPLAN.gameDay(),
      L = ST().kuebel.filter(c => c.loc === 'liefer' && (day > c.tag + 1 || (day > c.tag && hourNow() >= 7)));
    if (L.length) {
      for (const c of L) c.loc = 'tor';
      KERN.emit('gplan:geliefert', { n: L.length });
      toast('Die Baumschule Kammbach hat geliefert: ' + plural(L.length) + ' am Gartentor.', 4200);
      GPLAN.changed({ game: true, no3d: true });
      dirty = true;
    }
    // the load space follows a car that was set down elsewhere (a new set when the car itself is new)
    const v = car(),
      ck = v ? v.g.uuid : '';
    if (ck !== S.carKey) {
      S.carKey = ck;
      dirty = true;
    }
    if (dirty && GPLAN.ready) refresh();
  }, 'gplan/gplan_shop');
  // a saved plant in the hands comes back set down where it was taken (the hands are empty after a reload)
  for (const c of GPLAN.state.kuebel) if (c.loc === 'hand') c.loc = Number.isFinite(c.x) ? 'boden' : 'tor';
  // the containers shown once the plan's data are there
  KERN.on('gplan:daten', () => refresh());
  // ---------------- the task: from the shopping list to the last bought plant in the ground ----------------
  const home = c =>
    c.loc === 'tor' ||
    ((c.loc === 'boden' || c.loc === 'hand') && Math.hypot(c.x - 2.95, c.y - 2) < 60) ||
    (c.loc === 'hand' && Math.hypot(P.x - 2.95, P.y - 2) < 60);
  TASKS.define({
    id: 'gplan-kaufen',
    title: 'Pflanzen in der Baumschule Kammbach kaufen',
    who: 'Gartenplaner',
    start: { on: 'gplan:einkaufsliste' },
    steps: [
      {
        text: 'Fahr zur Baumschule Kammbach nach Kloster Veßra (Orte → Kloster Veßra).',
        // the gate of the nursery (before the zone is built: its jump spot)
        target: () => {
          const B = nursery(),
            sp = !B && KERN.spots && KERN.spots().baumschule;
          return B ? [B.eingang.x, B.eingang.y] : sp && sp.pos ? [sp.pos[0], sp.pos[1]] : null;
        },
        check: () => atNursery(),
      },
      {
        text: 'Such die Pflanzen der Einkaufsliste in den Beeten aus – sie haben ein weißes Schild.',
        target: () => (S.shelf[0] ? [S.shelf[0].x, S.shelf[0].y] : null),
        check: () => nOf('korb') > 0 && !S.shelf.length,
      },
      {
        text: 'Bezahl an der Kasse.',
        target: () => (nursery() ? [nursery().kasse.x, nursery().kasse.y] : null),
        on: 'gplan:gekauft',
      },
      {
        text: 'Bring die Pflanzen in den Garten – liefern lassen oder mit dem Auto.',
        check: () => {
          const K = ST().kuebel.filter(c => c.loc !== 'korb');
          return K.length > 0 && K.every(home);
        },
      },
      {
        text: 'Pflanz die gekauften Pflanzen ein: zum Pflanzloch tragen, dann „Einpflanzen“.',
        check: () => !ST().kuebel.some(c => c.loc !== 'korb'),
      },
    ],
    done: 'Die gekauften Pflanzen stehen im Garten.',
  });
  // a new shopping trip after the last one: the task starts afresh (TASKS starts a task only once)
  KERN.on('gplan:einkaufsliste', () => {
    const t = TASKS.state('gplan-kaufen');
    if (t && t.st === 'erledigt') {
      TASKS.reset('gplan-kaufen');
      TASKS.start('gplan-kaufen');
    }
  });
  // buying needs the nursery (Kloster Veßra exists only with the world around Ratscher: welt/welt.js on)
  GPLAN.shop = !!KERN.scenario('baumschule');
  const api = {
    refresh,
    shelf: () => S.shelf,
    wanted,
    artOf,
    cargoPlan,
    pay,
    deliver,
    load,
    unload,
    THING,
    get near() {
      return S.near;
    },
    get world() {
      return S.world || [];
    },
  };
  return api;
})();
window.GPSHOP = GPSHOP;
