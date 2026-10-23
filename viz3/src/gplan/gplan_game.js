// ===================== garden planner 6: planting, care and harvest in the game (GPGAME) =====================
// At a planned plant (shown with „im Garten“ or on site, or already being planted) the action button offers the planting steps one by one,
// each a short hold with a movement of the figure: Pflanzloch graben, Wühlmauskorb einsetzen and Pfahl setzen where the plant's schutz
// asks for them, Einpflanzen, Anbinden (at the stake), Angießen. Then the plant is planted (state gepflanzt, planting day of the garden
// calendar, GPLAN.gday) and stays in the garden whatever „im Garten“ says. At a planted plant: Ernten in its harvest months from the bearing
// age (kg into the planner's harvest book), Gießen in its first two summers after a dry week (a blue ring of dots round it), Schneiden of
// fruit trees in late winter, Mulchen in the first year. The plant itself comes from the Vorrat: freely while GPLAN.frei (until buying at
// the nursery works), else a bought container of it in the hand or set down near the hole (gplan/gplan_shop.js).
// Events (KERN.emit): gplan:schritt { id, i, schritt }, gplan:gepflanzt { id, i, tag }, gplan:gegossen, gplan:geerntet { id, i, kg, jahr },
// gplan:geschnitten, gplan:gemulcht { id, i }.
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { toast } from '../audio/audio.js';
import { GPMODEL as M } from './gplan_model.js';
import { GP3D } from './gplan_3d.js';
import { GPLAN } from './gplan.js';
export const GPGAME = (() => {
  const REACH = 2; // m from the figure to the plant
  const S = { frame: 0, f: -1, cur: null, lock: null, ringKey: null, acc: 0 };
  // the containers of a plant that can go into this hole: in the hand, or set down within 3 m
  function source(it) {
    if (GPLAN.frei) return 'vorrat';
    const K = GPLAN.state.kuebel;
    const k =
      K.find(c => c.id === it.id && c.loc === 'hand') ||
      K.find(c => c.id === it.id && (c.loc === 'boden' || c.loc === 'tor') && Math.hypot(c.x - it.x, c.y - it.y) < 3);
    return k || null;
  }
  // what comes next at a plan item: a planting step or the most urgent care
  function next(it, p, gd) {
    if (it.st === 'gepflanzt') {
      const c = M.careOf(it, p, gd);
      return c.length ? { kind: 'care', k: c[0] } : null;
    }
    const k = M.plantSteps(p)[it.sch || 0];
    return k ? { kind: 'step', k } : null;
  }
  // the nearest plan item with something to do (once per frame); while a hold runs, the item it started at
  function find() {
    if (P.mode !== 'walk' || !GPLAN.ready) return null;
    const ST = GPLAN.state,
      db = GPLAN.data.db,
      gd = GPLAN.gday();
    if (S.lock) {
      const t = S.lock;
      return ST.items[t.i] === t.it ? t : null;
    }
    const shown = ST.show || GPLAN.onSite();
    let best = null,
      bd = REACH;
    ST.items.forEach((it, i) => {
      const d = Math.hypot(it.x - P.x, it.y - P.y);
      if (d > bd) return;
      if (it.st !== 'gepflanzt' && !it.sch && !shown) return;
      const p = db.byId.get(it.id);
      if (!p) return;
      const n = next(it, p, gd);
      if (!n) return;
      bd = d;
      best = { i, it, p, kind: n.kind, k: n.k };
    });
    return best;
  }
  function cur() {
    if (S.f !== S.frame) {
      S.f = S.frame;
      S.cur = find();
    }
    return S.cur;
  }
  const info = t => (t.kind === 'step' ? M.STEP[t.k] : M.CARE[t.k]);
  function label(t) {
    const name = M.fullName(t.p);
    if (t.kind === 'step') {
      if (t.k === 'pflanzen') {
        const src = source(t.it);
        if (!src) return M.STEP.pflanzen.label + ' – erst ' + name + ' herbringen';
        return M.STEP.pflanzen.label + ' – ' + name + (src === 'vorrat' ? ' (aus dem Vorrat)' : '');
      }
      return M.STEP[t.k].label + ' – ' + name;
    }
    const gd = GPLAN.gday();
    if (t.k === 'giessen') {
      const th = M.thirst(t.it, gd);
      return 'Gießen – ' + name + (th !== null && th < 300 ? ' (seit ' + th + ' Tagen trocken)' : '');
    }
    if (t.k === 'ernten') {
      const kg = M.harvestKg(t.p, (gd - t.it.pd) / M.DAY_YEAR, M.seedOf(t.it));
      return 'Ernten – ' + name + ' (etwa ' + M.de(kg) + ' kg)';
    }
    return M.CARE[t.k].label + ' – ' + name;
  }
  // a step or the care done
  function apply(t) {
    const ST = GPLAN.state,
      it = ST.items[t.i];
    if (!it || it !== t.it) return false;
    const p = t.p,
      gd = GPLAN.gday(),
      y = M.yearOfDay(gd),
      name = M.fullName(p),
      ev = { id: it.id, i: t.i };
    if (t.kind === 'step') {
      const L = M.plantSteps(p);
      if (L[it.sch || 0] !== t.k) return false;
      if (t.k === 'pflanzen') {
        const src = source(it);
        if (!src) {
          toast(
            name +
              ' fehlt noch: in der Baumschule Kammbach kaufen (Einkaufsliste im Planer) und zum Pflanzloch tragen.',
            4200
          );
          return false;
        }
        // a bought container goes into the hole
        if (src !== 'vorrat') ST.kuebel.splice(ST.kuebel.indexOf(src), 1);
      }
      it.sch = (it.sch || 0) + 1;
      KERN.emit('gplan:schritt', Object.assign({ schritt: t.k }, ev));
      if (it.sch >= L.length) {
        it.st = 'gepflanzt';
        it.pd = gd;
        it.w = gd;
        it.jahr = y;
        delete it.sch;
        KERN.emit('gplan:gepflanzt', Object.assign({ tag: gd }, ev));
        toast(name + ' gepflanzt – am ' + M.dayDe(gd) + '.', 3200);
      }
    } else if (t.k === 'giessen') {
      it.w = gd;
      KERN.emit('gplan:gegossen', ev);
      toast(name + ' gegossen.', 1800);
    } else if (t.k === 'ernten') {
      const kg = M.harvestKg(p, (gd - it.pd) / M.DAY_YEAR, M.seedOf(it));
      it.h = y;
      M.addHarvest(ST.ernte, y, it.id, kg);
      KERN.emit('gplan:geerntet', Object.assign({ kg, jahr: y }, ev));
      toast(M.de(kg) + ' kg geerntet – ' + name + '.', 2600);
    } else if (t.k === 'schneiden') {
      it.cut = y;
      KERN.emit('gplan:geschnitten', ev);
      toast(name + ' geschnitten.', 1800);
    } else if (t.k === 'mulchen') {
      it.mu = true;
      KERN.emit('gplan:gemulcht', ev);
    }
    GPLAN.changed({ game: true });
    S.f = -1;
    S.ringKey = null;
    return true;
  }
  KERN.act({
    id: 'gplan:work',
    r: REACH,
    prio: 0.45,
    pos: () => {
      const t = cur();
      return t ? [t.it.x, t.it.y, KERN.ground(t.it.x, t.it.y) + 0.3] : null;
    },
    label: () => {
      const t = cur();
      return t ? label(t) : null;
    },
    hold: () => {
      const t = cur();
      return t && !(t.k === 'pflanzen' && !source(t.it)) ? info(t).dur : 0;
    },
    anim3: () => {
      const t = S.lock || cur();
      return t ? info(t).anim : 'interactLoop';
    },
    start: () => {
      S.lock = cur();
    },
    cancel: () => {
      S.lock = null;
    },
    run: () => {
      const t = S.lock || cur();
      S.lock = null;
      if (t) apply(t);
    },
  });
  // thirsty young plants near the figure: a blue ring of dots round each (with the planner's rings on site)
  function rings() {
    if (!GPLAN.ready || P.mode !== 'walk' || GPLAN.onSite()) {
      if (S.ringKey) {
        S.ringKey = null;
        if (!GPLAN.onSite()) GP3D.marks([]);
      }
      return;
    }
    const gd = GPLAN.gday(),
      R = [];
    for (const it of GPLAN.state.items) {
      if (it.st !== 'gepflanzt' || Math.hypot(it.x - P.x, it.y - P.y) > 30) continue;
      if (M.thirst(it, gd) !== null) R.push({ x: it.x, y: it.y, r: 0.45, hex: '#4aa8ff' });
      if (R.length >= 6) break;
    }
    const key = R.map(r => r.x + ',' + r.y).join('|');
    if (key === S.ringKey) return;
    S.ringKey = key;
    GP3D.marks(R);
  }
  (window.TICKS = window.TICKS || []).push(dt => {
    S.frame++;
    S.acc += dt;
    if (S.acc < 0.5) return;
    S.acc = 0;
    rings();
  });
  const api = {
    find,
    next,
    apply,
    label,
    source,
    // the action at the nearest plant (tests): { i, kind, k, label } or null
    get target() {
      const t = cur();
      return t ? { i: t.i, kind: t.kind, k: t.k, label: label(t) } : null;
    },
  };
  return api;
})();
window.GPGAME = GPGAME;
