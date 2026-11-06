// ===================== feat/strategie: what there is to do from above – places, stocks, layers, the first jobs (STJOBS) =====================
// Content on the API of strategie/st_modus.js (docs/features/strategie.md „API für Erweiterungen“): the places of the playing field with
// their panels, the stocks of the resource bar (read from the world – the same logs, boards and litres as on foot), the layers one can
// switch, the heroes' abilities, chapter 1, and the jobs: here mowing the lawn (the first simple job, increment 1); the wood chain follows
// in strategie/st_holz.js.
import { GPLAY } from '../garden/garage_play.js';
import { HOLZ } from '../werk/holz.js';
import { HOLZSAW } from '../werk/holz_saw.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
import { STRAT } from './st_modus.js';
export const STJOBS = (() => {
  const D = STDATA,
    C = STCORE,
    W = STRAT.W,
    S = STRAT.S;
  const de = (v, n = 1) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  // ---------------- places ----------------
  for (const [id, p] of Object.entries(D.PLACES))
    STRAT.place.define({ id, name: p.name, icon: p.icon, r: p.r, order: Object.keys(D.PLACES).indexOf(id) * 10 });
  // ---------------- stocks for the bar (read from the world) ----------------
  const logs = () => (HOLZ.logs || []).filter(l => l.st !== 'sawn');
  const boardVol = b => (b.t * (b.wS + b.wW) * b.L) / 2;
  const boards = () => (HOLZSAW.boards || []).filter(b => b.st === 'pile' || b.st === 'stack' || b.st === 'kiln');
  S.brennholz = S.brennholz || 0;
  S.diesel = S.diesel ?? 20;
  STRAT.res.define({ id: 'eur', label: 'Euro', icon: '€', order: 0, get: () => S.eur, fmt: v => C.eur(v) });
  STRAT.res.define({
    id: 'stamm',
    label: 'Stämme',
    icon: '🪵',
    unit: 'fm',
    order: 10,
    get: () => logs().reduce((s, l) => s + (l.vol || 0), 0),
    fmt: v => de(v, 2) + ' fm',
    tip: 'Festmeter: ein Kubikmeter feste Holzmasse ohne Lücken (Volumen nach Huber: π/4 · d² · L)',
  });
  STRAT.res.define({
    id: 'bretter',
    label: 'Bretter',
    icon: '▭',
    unit: 'm³',
    order: 20,
    get: () => boards().reduce((s, b) => s + boardVol(b), 0),
    fmt: v => de(v, 2) + ' m³',
    tip: 'Gesägte Bretter und Bohlen im Block, im Trockenstapel und unter Dach',
  });
  STRAT.res.define({
    id: 'brennholz',
    label: 'Brennholz',
    icon: '🔥',
    unit: 'rm',
    order: 30,
    // the slabs of the band sawmill (two per log, about 0,04 rm each as split pieces) and what was split and stacked
    get: () =>
      S.brennholz + Math.max(0, (HOLZSAW.fire || 0) - (+(S.ext.brennholz && S.ext.brennholz.used) || 0)) * 0.04,
    fmt: v => de(v, 1) + ' rm',
    tip: 'Raummeter: ein Kubikmeter geschichtetes Holz mit Luft dazwischen – 1 rm ≈ 0,7 fm. Aufgesetzt und Schwarten, die noch auf das Aufarbeiten warten',
  });
  STRAT.res.define({
    id: 'strom',
    label: 'Strom',
    icon: '⚡',
    unit: '%',
    order: 40,
    get: () => (100 * S.power.soc) / (S.power.cap || D.POWER.kwh),
    fmt: v => Math.round(v) + ' %',
    tip: () =>
      `Powerstation ${de(S.power.soc, 2)} von ${de(S.power.cap || D.POWER.kwh, 1)} kWh · PV jetzt ${S.power.pv || 0} W · Last ${S.power.load || 0} W${S.power.gen ? ' · Aggregat läuft' : ''}`,
  });
  STRAT.res.define({
    id: 'benzin',
    label: 'Benzin',
    icon: '⛽',
    unit: 'l',
    order: 50,
    get: () => W.fuel().can,
    fmt: v => de(v, 1) + ' l',
    tip: () => {
      const f = W.fuel();
      return `Kanister ${de(f.can, 1)} von ${f.canMax} l · Aggregat ${de(f.gen, 1)} von ${f.genMax} l · Rasenmäher ${de(f.mower, 2)} l`;
    },
  });
  STRAT.res.define({
    id: 'diesel',
    label: 'Diesel',
    icon: '🛢',
    unit: 'l',
    order: 60,
    get: () => S.diesel,
    fmt: v => de(v, 0) + ' l',
    tip: 'Für den Traktor (Huberts Dieselkanister in der Garage)',
  });
  // ---------------- layers (Falko 23:30: switchable lenses on the one world) ----------------
  const L = [
    ['leute', 'Leute', 'Personen, ihre Wege und was sie tun', 0],
    ['orte', 'Orte', 'Werkstatt, Holzlager, Klinge, Höfe', 1],
    ['wege', 'Wege und Träger', 'Wer wohin unterwegs ist, auf echten Wegen', 2],
    ['beduerfnisse', 'Bedürfnisse', 'Kraft, Hunger und Stimmung über den Köpfen', 3],
    ['wirtschaft', 'Wirtschaft', 'Vorräte und Engpässe an den Orten', 4],
    ['natur', 'Natur', 'Der Wald, was man über ihn weiß', 5],
    ['krisen', 'Krisen', 'Sturm, Käfer, Schäden', 6],
    ['verkehr', 'Verkehr', 'Autos und Busse der Welt', 7],
    ['wetter', 'Wetter', 'Wolken, Regen, Wind – wie es gerade ist', 8],
  ];
  for (const [id, label, text, order] of L) STRAT.layer.define({ id, label, text, order, on: id !== 'verkehr' });
  // ---------------- heroes' abilities (data in STDATA.HEROES; here what they do) ----------------
  STRAT.ability.define({
    id: 'meisterstueck',
    lasts: 30,
    run: () => ({ ok: true, text: 'Das nächste Brett wird ein Meisterstück.' }),
  });
  STRAT.ability.define({ id: 'planen', lasts: 3, run: () => ({ ok: true }) });
  STRAT.ability.define({
    id: 'dorfversammlung',
    lasts: 7,
    run: ({ S: st }) => {
      for (const k of Object.keys(st.favours)) st.favours[k] = Math.max(st.favours[k], 3);
      STRAT.style(3, 'Dorfversammlung in der alten Schule');
      return { ok: true, text: 'Hubert und Ronald helfen diese Woche gern.' };
    },
  });
  STRAT.ability.define({ id: 'handel', lasts: 14, run: () => ({ ok: true }) });
  STRAT.ability.define({
    id: 'notreparatur',
    lasts: 0.1,
    run: ({ S: st }) => {
      const b = (st.broken || []).shift();
      if (!b) return { no: true, text: 'Gerade ist nichts kaputt.' };
      return { ok: true, text: `${b} läuft wieder.` };
    },
  });
  // ---------------- chapter 1 ----------------
  STRAT.chapter.define(Object.assign({ order: 1 }, D.CHAPTERS[0]));
  STRAT.chapter.define(Object.assign({ order: 2 }, D.CHAPTERS[1]));
  // ---------------- the old garage: fuel, the mower, the power (two PV modules on its roof, the power station) ----------------
  STRAT.place.define({
    id: 'garage',
    stock: () => {
      const f = W.fuel(),
        kwp = D.POWER.kwp * (S.known['ausbau:pv2'] ? 2 : 1);
      return [
        ['Benzinkanister', de(f.can, 1) + ' von ' + f.canMax + ' l'],
        ['Rasenmäher (Tank)', de(f.mower, 2) + ' von ' + f.mowerMax + ' l'],
        ['Aggregat (Tank)', de(f.gen, 1) + ' von ' + f.genMax + ' l'],
        ['PV-Module auf dem Dach', de(kwp, 2) + ' kWp · jetzt ' + (S.power.pv || 0) + ' W'],
        ['Powerstation', de(S.power.soc, 2) + ' von ' + de(S.power.cap || D.POWER.kwh, 1) + ' kWh'],
        ['Diesel (Kanister)', de(S.diesel, 0) + ' l'],
      ];
    },
    badge: () => (S.power.gen ? 'Aggregat läuft' : (S.power.pv || 0) > 20 ? 'PV ' + S.power.pv + ' W' : ''),
    missing: () => {
      const f = W.fuel(),
        m = [];
      if (f.can < 1) m.push('Benzin (Einkaufen in Schleusingen)');
      if (S.diesel < 5) m.push('Diesel für den Traktor');
      return m;
    },
  });
  // ---------------- the first job: mowing the lawn with the petrol mower from the garage ----------------
  // ~0,46 m cut, walking pace with turns and the grass box: 300–500 m² an hour by skill; 1 l petrol an hour (garden/garage_play.js BURN);
  // loud: a lawn mower is in the annex of the 32. BImSchV – not on Sundays and holidays, on workdays only 7–20 h
  const MOW_AREA = 400;
  STRAT.job.define({
    id: 'maehen',
    pose: 'carry',
    label: 'Rasen mähen',
    place: 'garten',
    people: [1, 1],
    skill: 'garten',
    min: 1,
    loud: true,
    where: 'dorf',
    heavy: 0.4,
    xp: 1,
    text: 'Den Rasen um die Gartengebäude mit dem Benzinmäher aus der Garage mähen (gut 400 m²).',
    learn:
      'Ein Benzinmäher mit 46 cm Schnittbreite schafft im Garten 300–500 m² in der Stunde; er braucht etwa einen Liter Benzin je Stunde. Rasen wächst im Sommer 1–2 cm in der Woche – öfter und höher mähen hält ihn dichter.',
    dur: (j, cx) => {
      const area = Math.min(MOW_AREA, W.lawn().area || MOW_AREA);
      j.d.area = area;
      return (area / (300 + 40 * cx.skill)) * 60;
    },
    can: cx => {
      if (cx.wx.rain > 0.2) return 'nass_maehen';
      const f = W.fuel();
      if (f.mower < 0.03 && f.can < 0.03)
        return {
          no: true,
          text: 'Kein Benzin: Mäher und Kanister sind leer.',
          why: 'Der rote Kanister wird morgens ab 7 Uhr an der Tankstelle wieder gefüllt.',
          src: 'Garage (garden/garage_play.js)',
        };
      return null;
    },
    init: j => {
      const Ln = W.lawn();
      const per = 0.25 * 0.46;
      j.d.i0 = (S.mowI || 0) % Math.max(1, Ln.pts.length);
      j.d.n = Math.min(Ln.pts.length, Math.round(MOW_AREA / per));
      j.d.i = j.d.i0;
      j.d.m2 = 0;
    },
    step: (j, cx, dw, k) => {
      const Ln = W.lawn(),
        to = j.d.i0 + Math.floor(k * j.d.n);
      if (to > j.d.i) {
        const a = j.d.i,
          b = Math.min(to, Ln.pts.length);
        j.d.m2 += W.mow(a, b, cx.t);
        // past the last stripe: on from the first
        if (to > Ln.pts.length) j.d.m2 += W.mow(0, to - Ln.pts.length, cx.t);
        j.d.i = to;
      }
      // petrol: from the mower's tank, refilled from the can when it runs dry
      const need = (dw / 60) * 1.0;
      let got = W.fuelUse('mower', need);
      if (got < need - 1e-6 && W.fuelFill('mower') > 0) got += W.fuelUse('mower', need - got);
    },
    finish: (j, cx) => {
      S.mowI = j.d.i % Math.max(1, W.lawn().pts.length);
      try {
        GPLAY.save();
      } catch (e) {}
      return { text: `${Math.round(j.d.m2 || 0)} m² gemäht, ${Math.round(W.mownArea(cx.t))} m² sind jetzt kurz` };
    },
  });
  // ---------------- walking somewhere (right click on the ground): not a job, a way ----------------
  return { MOW_AREA, logs, boards, boardVol };
})();
