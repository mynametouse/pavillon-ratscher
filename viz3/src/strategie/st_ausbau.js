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
  // ---------------- heating: the bungalow's cast-iron stove (garden/bungalow.js) on cold evenings when your people stay the night ----------------
  // A night costs about 0,0012 rm per kelvin below 20 °C (assumption: the bungalow, ~25 m², thinly insulated, loses ~100 W/K; heated in the
  // evening and the morning – about 12 hours a day – that is 1,2 kWh/K; a rm of air-dry spruce holds ~1450 kWh, ~1000 kWh of it heat in a
  // simple stove); above 14 °C in the evening nobody lights it. Dry wood only (1. BImSchV: below 25 % moisture): your own stacked firewood
  // once it is dry, then the bought store under the bungalow's eaves (S.ext.heiz.ofen, rm – a rest of last winter at the start). Without:
  // a cold night (mood −12) and a notice with „Brennholz bestellen“.
  const HZ = () => {
    const h = S.ext.heiz;
    if (h && typeof h === 'object' && Number.isFinite(h.ofen) && h.ofen >= 0) return h;
    return (S.ext.heiz = { ofen: 1, season: null, kalt: null });
  };
  const HEAT_K = 0.0012,
    HEAT_MAX = 14;
  {
    const need = T => (T >= HEAT_MAX ? 0 : +(HEAT_K * (20 - T)).toFixed(3));
    HZ();
    // what the stove has: the store under the eaves, your own dry firewood, for how many nights at 2 °C in the evening
    STRAT.place.define({
      id: 'bungalow',
      stock: () => {
        const dry = STHOLZ.firewood.dry();
        return [
          ['Brennholz unter dem Vordach (gekauft, trocken)', de(HZ().ofen, 2) + ' rm'],
          ['Eigenes trockenes Brennholz (Holzlager)', de(dry, 1) + ' rm'],
          ['Reicht für kalte Nächte (2 °C)', 'etwa ' + Math.floor((HZ().ofen + dry) / need(2))],
        ];
      },
    });
    STRAT.job.define({
      id: 'brennholz_kaufen',
      label: 'Brennholz bestellen (1 rm Fichte, ofenfertig, frei Haus)',
      place: 'bungalow',
      people: [1, 1],
      skill: 'reden',
      min: 1,
      heavy: 0.3,
      order: 8,
      text: 'Beim Brennholzhändler anrufen; er kippt einen Raummeter vors Tor, ihr setzt ihn unter dem Vordach des Bungalows auf.',
      learn: `Ofenfertig (33 cm, unter 20 % Feuchte) kostet ein Raummeter Fichte frei Haus gut ${D.PRICES.brennholz_fi.eur} € (TFZ Bayern, Juli 2026), Buche rund 145 €. Eigenes Holz ist billiger, braucht aber ein Jahr unter Dach.`,
      can: () =>
        HZ().ofen > 2
          ? {
              no: true,
              text: `Unter dem Vordach liegen schon ${de(HZ().ofen, 1)} rm – mehr passt dort nicht trocken hin.`,
              why: 'Brennholz muss luftig und unter Dach lagern, sonst zieht es wieder Feuchte.',
              src: '',
            }
          : null,
      dur: 45,
      finish: () => {
        HZ().ofen = +(HZ().ofen + 1).toFixed(3);
        STRAT.book(-D.PRICES.brennholz_fi.eur, 'Brennholz gekauft: 1 rm Fichte, ofenfertig', 'heizen');
        return { text: `1 rm Brennholz unter dem Vordach aufgesetzt – jetzt ${de(HZ().ofen, 1)} rm` };
      },
    });
    KERN.on('strategie:tag', d => {
      if (!d || !Number.isFinite(d.t)) return;
      const ev = Math.floor(d.t / 1440) * 1440 - 120, // 22:00 the evening before
        who = Object.keys(S.people).filter(id => STRAT.isOwn(id) && STRAT.present(id, ev).ok);
      if (!who.length) return;
      const T = W.temp(ev),
        n = need(T);
      if (!n) return;
      const H = HZ(),
        recent = Number.isFinite(H.kalt) && ev - H.kalt >= 0 && ev - H.kalt < 3 * 1440; // a notice at most every three days
      let got = STHOLZ.firewood.take(n, { dryOnly: true });
      const fromStore = Math.min(H.ofen, n - got);
      H.ofen = +(H.ofen - fromStore).toFixed(3);
      got += fromStore;
      const dt = W.dateOf(ev),
        season = dt.getUTCMonth() >= 6 ? dt.getUTCFullYear() : dt.getUTCFullYear() - 1,
        why =
          'Ein Kanonenofen im dünnwandigen Bungalow braucht an einem Abend bei 0 °C draußen gut 10 kg Fichte (0,02 rm). Nur trockenes Holz (unter 25 % Feuchte) darf in den Ofen – nasses rußt, qualmt und bringt kaum Wärme.',
        src =
          '1. BImSchV § 3 (Brennstoffe: naturbelassenes, trockenes Holz); Heizwert Fichte lufttrocken etwa 1450 kWh/rm (TFZ)',
        act = [
          {
            label: 'Brennholz bestellen',
            fn: () => STRAT.job.add('brennholz_kaufen', [who[0]], { place: 'bungalow' }),
          },
        ];
      if (got < n * 0.6) {
        for (const id of who) S.people[id].nd.mood = Math.max(0, S.people[id].nd.mood - 12);
        if (!recent) {
          H.kalt = ev;
          STRAT.note(
            `Kalte Nacht im Bungalow (${Math.round(T)} °C draußen): kein trockenes Brennholz mehr für den Ofen – die Laune leidet.`,
            { kind: 'leute', why, src, acts: act }
          );
        }
      } else if (H.season !== season) {
        H.season = season;
        STRAT.note(
          `Der erste kalte Abend (${Math.round(T)} °C): im Bungalow brennt der Kanonenofen – ${de(got, 2)} rm Brennholz für die Nacht.`,
          { kind: 'leute', why, src }
        );
      } else if (H.ofen < n * 3 && STHOLZ.firewood.dry() < n && !recent) {
        H.kalt = ev;
        STRAT.note(
          `Das Ofenholz im Bungalow reicht nur noch für ${Math.max(0, Math.floor(H.ofen / n))} kalte Nächte.`,
          {
            kind: 'leute',
            why,
            src,
            acts: act,
          }
        );
      }
    });
  }
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
