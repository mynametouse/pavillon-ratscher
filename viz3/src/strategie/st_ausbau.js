// ===================== feat/strategie: food and beds, knowledge and upgrades, ages, chapters with goals (STAUSBAU) =====================
// Falko 23:30 (C&C, StarCraft, The Sims, Age of Empires): beds and food limit how many can stay and work (like „supply“) – the bungalow,
// the caravan, the atelier's sofa bed; meals come from what was bought; a knowledge tree of courses, machines and stages (the ages are the
// construction phases of the garden: game/walkable.js PHASE); chapters with goals that notice themselves (KERN events of the mode).
import { KERN } from '../core/kern.js';
import { PHASE } from '../game/walkable.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
import { STRAT } from './st_modus.js';
import { STHOLZ } from './st_holz.js';
export const STAUSBAU = (() => {
  const D = STDATA,
    C = STCORE,
    S = STRAT.S,
    W = STRAT.W;
  const de = (v, n = 1) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  // ---------------- beds (the bungalow's double bed, the caravan, the atelier's sofa bed – garden/garten_in.js, garden/atelier.js) ----------------
  STRAT.place.define({ id: 'bungalow', beds: 2, sub: () => 'Doppelbett · ' + bedsText() });
  STRAT.place.define({
    id: 'wohnwagen',
    name: 'Wohnwagen',
    icon: '⌂',
    order: 75,
    pos: () => W.placePos('wohnwagen') || [-0.9, 16.5],
    beds: 1,
  });
  STRAT.place.define({
    id: 'atelier',
    name: 'Atelier (Holzhaus)',
    icon: '✎',
    order: 76,
    pos: () => [5.55, -2.85],
    beds: 1,
    sub: () => 'Klappsofa als Gästebett',
  });
  const overnight = () => Object.keys(S.people).filter(id => STRAT.isOwn(id) && STRAT.present(id).ok).length;
  const bedsText = () => `${overnight()} von ${STRAT.beds()} Betten belegt`;
  // ---------------- food: meals from the stores (bought in Schleusingen); three a day for each of your people on site ----------------
  S.essen = S.essen ?? 12;
  const MEAL = 4.2; // € per meal cooked on site (assumption: groceries 2026, ~12–13 € per person and day)
  STRAT.res.define({
    id: 'essen',
    label: 'Essen',
    icon: '🍞',
    unit: 'Mahlzeiten',
    order: 55,
    get: () => S.essen,
    fmt: v => Math.round(v) + ' Mahlz.',
    tip: () => `Vorräte für ${Math.round(S.essen)} Mahlzeiten – drei am Tag je Person im Garten; ${bedsText()}`,
    take: n => {
      if (S.essen < n) return false;
      S.essen -= n;
      return true;
    },
  });
  // whoever of your people arrives for the weekend brings food for it from home when the stores are low (six meals each – the household's,
  // not the garden's money); a holiday week or more people need shopping (the job below, booked)
  KERN.on('strategie:da', d => {
    if (!d || !STRAT.isOwn(d.who) || S.essen >= 6) return;
    S.essen += 6;
    STRAT.note(`${D.PEOPLE[d.who].name} bringt Essen fürs Wochenende von zu Hause mit (6 Mahlzeiten).`, {
      kind: 'leute',
    });
  });
  STRAT.job.define({
    id: 'einkaufen',
    label: 'Einkaufen in Schleusingen (Essen, Benzin, Diesel)',
    place: 'schleusingen',
    people: [1, 2],
    skill: 'reden',
    min: 1,
    heavy: 0.1,
    order: 5,
    text: 'Lebensmittel fürs Wochenende (24 Mahlzeiten), den roten Kanister an der Tankstelle füllen, 20 l Diesel für den Traktor.',
    learn:
      'Ein Liter Benzin kostet im Herbst 2026 gut 2,10 €, Diesel 2,26 € (ADAC) – ein voller Kanister (10 l) gut 21 €.',
    dur: 70,
    finish: j => {
      const deal = j.who.some(id => STRAT.ability.buff(id, 'handel')) ? 0.92 : 1,
        f = W.fuel(),
        lp = Math.max(0, f.canMax - f.can),
        ld = Math.max(0, 40 - S.diesel);
      S.essen += 24;
      W.fuelAdd('can', lp);
      S.diesel += ld;
      STRAT.book(-24 * MEAL * deal, 'Lebensmittel (24 Mahlzeiten)', 'essen');
      if (lp > 0.05) STRAT.book(-lp * D.PRICES.benzin.eur, `Benzin ${de(lp, 1)} l`, 'sprit');
      if (ld > 0.05) STRAT.book(-ld * D.PRICES.diesel.eur, `Diesel ${de(ld, 0)} l`, 'sprit');
      return { text: `24 Mahlzeiten, ${de(lp, 1)} l Benzin, ${de(ld, 0)} l Diesel` };
    },
  });
  // ---------------- knowledge and upgrades (the tech tree) ----------------
  // a course is a job (strategie/st_holz.js kurs_ms); machines are bought (Euro) and change the world's numbers (PV, storage)
  const has = k => {
    if (k === 'motorsaege')
      return Object.values(S.people).some(p => p.certs.includes('motorsaege') && p.id !== 'hubert');
    if (k === 'ersthilfe') return Object.values(S.people).some(p => p.certs.includes('ersthilfe'));
    if (k === 'halle') return PHASE >= 1;
    return !!S.known['ausbau:' + k];
  };
  function buy(k) {
    const K = D.KNOW[k];
    if (!K || K.kind !== 'maschine') return { no: true, text: 'Das kann man nicht kaufen.' };
    if (has(k)) return { no: true, text: 'Schon da.' };
    const P = D.PRICES[K.price],
      eur = P.eur * (K.n || 1);
    if (S.eur < eur) return { no: true, text: 'Nicht genug Geld in der Kasse.' };
    STRAT.book(-eur, K.title, 'ausbau');
    STRAT.reveal('ausbau', k, {}, null, { title: K.title, source: K.src, text: K.unlocks });
    return { ok: true, text: K.title + ' – ' + K.unlocks };
  }
  function tree() {
    return Object.entries(D.KNOW).map(([k, K]) => {
      const P = K.price ? D.PRICES[K.price] : null;
      return {
        id: k,
        kind: K.kind,
        title: K.title,
        text: K.text,
        src: K.src,
        unlocks: K.unlocks,
        has: has(k),
        eur: P ? P.eur * (K.n || 1) : 0,
      };
    });
  }
  // ---------------- ages (Age of Empires): the construction phase of the garden ----------------
  function age() {
    let a = D.AGES[0];
    for (const g of D.AGES) if (PHASE >= g.from) a = g;
    return a;
  }
  // ---------------- chapters with goals that notice themselves ----------------
  const GOALS = {
    k1: [
      { id: 'maehen', text: 'Den Rasen mähen', on: 'auftrag', when: d => d.state === 'fertig' && d.def === 'maehen' },
      {
        id: 'blick',
        text: 'In der Klinge nachsehen (Waldbegang)',
        on: 'auftrag',
        when: d => d.state === 'fertig' && d.def === 'waldbegang',
      },
      {
        id: 'liefern',
        text: '5 Schneidebretter Eiche liefern',
        on: 'bestellung',
        when: d => d.state === 'geliefert' && (STRAT.S.orders.find(o => o.id === d.id) || {}).key === D.ORDER0.id,
      },
    ],
    k2: [
      {
        id: 'kurs',
        text: 'Motorsägen-Lehrgang',
        on: 'auftrag',
        when: d => d.state === 'fertig' && d.def === 'kurs_ms',
      },
      {
        id: 'faellen',
        text: 'Einen markierten Baum fällen',
        on: 'auftrag',
        when: d => d.state === 'fertig' && d.def === 'faellen',
      },
      {
        id: 'heim',
        text: 'Die Stämme ins Holzlager',
        on: 'auftrag',
        when: d => d.state === 'fertig' && d.def === 'ruecken',
      },
      {
        id: 'stapel',
        text: 'Bretter sägen und zum Trocknen stapeln',
        on: 'auftrag',
        when: d => d.state === 'fertig' && d.def === 'stapeln',
      },
      {
        id: 'leimholz',
        text: 'Leimholz aus eigenem Holz (lufttrocken, nachgetrocknet, verleimt)',
        on: 'auftrag',
        when: d => d.state === 'fertig' && d.def === 'leimholz_eigen',
      },
    ],
  };
  // a goal of a chapter (the API: STRAT.chapter.goal): done when its KERN event of the mode comes and when(data) holds, or when check()
  // holds (asked twice a second); all done → the next chapter
  function goal(ch, g) {
    const list = (GOALS[ch] = GOALS[ch] || []);
    if (!list.includes(g)) list.push(g);
    const hit = () => {
      const k = ch + ':' + g.id;
      if (S.goals[k]) return;
      S.goals[k] = Math.round(STRAT.S.t || 0);
      STRAT.note('Ziel erreicht: ' + g.text, { kind: 'ziel' });
      STRAT.emit('ziel', { chapter: ch, id: g.id });
      if (ch === S.chapter && GOALS[ch].every(x => S.goals[ch + ':' + x.id])) {
        const nx = STRAT.chapter.list().find(c => c.order > (STRAT.chapter.cur() || {}).order);
        if (nx) {
          STRAT.chapter.set(nx.id);
          STRAT.note(nx.title + ' – ' + nx.text, { kind: 'ziel' });
        }
      }
    };
    if (g.on)
      KERN.on('strategie:' + g.on, d => {
        try {
          if (!g.when || g.when(d || {})) hit();
        } catch (e) {}
      });
    if (g.check) CHECKS.push([ch, g, hit]);
    return g;
  }
  const CHECKS = [];
  let acc = 0;
  KERN.tick(dt => {
    if ((acc += dt) < 0.5 || !CHECKS.length) return;
    acc = 0;
    for (const [ch, g, hit] of CHECKS)
      if (!S.goals[ch + ':' + g.id])
        try {
          if (g.check()) hit();
        } catch (e) {}
  }, 'strategie/ziele');
  for (const [ch, list] of Object.entries(GOALS)) for (const g of list.slice()) goal(ch, g);
  STRAT.chapter.goal = (ch, g) => goal(ch, g);
  const goals = (ch = S.chapter) =>
    (GOALS[ch] || []).map(g => ({ id: g.id, text: g.text, done: !!S.goals[ch + ':' + g.id] }));
  void STHOLZ;
  void C;
  return { tree, buy, has, age, goals, GOALS, MEAL, overnight };
})();
window.STAUSBAU = STAUSBAU;
