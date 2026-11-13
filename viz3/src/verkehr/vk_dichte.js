// ===================== feat/verkehr-real 4: how much traffic – by road, weekday, holiday, month and hour (VKDICHTE) =====================
// Falko, 13.11.2026: „die Verkehrsdichte soll realistisch nach Wochentag und Uhrzeit sein“; 12:45 chosen „wie echt gezählt“: no more than
// is counted on such roads, so a village street at night is empty. Pure: no scene (unit tests viz3/test/unit/verkehr_real.test.mjs).
// - The daily traffic (DTV, vehicles in 24 h, both directions) by the road's class and where it runs: the counts of the Straßenverkehrs-
//   zählung (BASt, Thüringen) for roads of this kind in Südthüringen – the A 73 by Schleusingen about 16 000, the B 89/B 4 about 6 000,
//   a Landesstraße 2 000–3 000 (the L 1625 by Ratscher 2 500), a Kreisstraße 1 000; streets in a town 1 200, in a village 250, lanes 100,
//   service roads 30 (no counting point there: estimated, as the Richtlinien do for streets of their kind).
// - Its course through the day: the standard day lines of the counts (Mo–Do, Fr, Sa, So/Feiertag; morning peak 7–8, the afternoon one
//   16–17 and on Fridays earlier and higher, Saturday late morning, Sunday afternoon), the weekday's and the month's factor.
// - What drives: the share of heavy vehicles by class (A 14 %, B 9 %, L 6 %, K 4 %, streets 3 %) – none above 7.5 t on Sundays and
//   holidays (the ban on lorries, StVO § 30 (3)); vans 8–10 %; tractors on country roads and village streets by day, more in harvest.
// - Holidays of Thüringen: Neujahr, Karfreitag, Ostermontag, 1. Mai, Christi Himmelfahrt, Pfingstmontag, Weltkindertag (20.9.), Tag der
//   Deutschen Einheit, Reformationstag, 1. und 2. Weihnachtstag – they run as Sundays.
//   VKDICHTE.dtv(kind, style)              vehicles a day; kind as ROADS/FAHRT (0 motorway … 5 service), style 2 town, 3 village (Paket 1)
//   VKDICHTE.when(eday, min)               { y, mo, d, wd, day ('mo'…'so'), fei (holiday or null), f (weekday × month), hs (hour share) }
//   VKDICHTE.rate(kind, style, W)          vehicles per hour at that moment (both directions); W from when()
//   VKDICHTE.typ(kind, style, W, r, r2)    which type (r, r2 ∈ [0, 1))
export const VKDICHTE = (() => {
  // ---- vehicles a day, both directions ----
  const DTV = [16000, 6000, 2000, 450, 100, 30, 0, 0, 0];
  function dtv(kind, style) {
    if (kind === 3) return style === 2 ? 1200 : style === 3 ? 250 : 450;
    if (kind === 2 && (style === 2 || style === 3)) return 1600; // a country road through a place
    return DTV[kind] ?? 0;
  }
  // ---- the day lines: share of the day's traffic per hour (%, normalized below) ----
  const LINE = {
    // Monday to Thursday: commuters
    mo: [
      0.6, 0.35, 0.25, 0.25, 0.45, 1.4, 4.4, 7.6, 6.4, 5.3, 5.2, 5.4, 5.7, 5.8, 6.4, 7.3, 8.1, 7.9, 6.2, 4.4, 3.2, 2.4,
      1.7, 1.0,
    ],
    // Friday: the afternoon earlier and higher, the evening busier
    fr: [
      0.7, 0.4, 0.3, 0.25, 0.45, 1.3, 4.0, 6.9, 5.9, 5.0, 5.0, 5.5, 6.1, 6.6, 7.4, 8.1, 8.2, 7.4, 6.0, 4.5, 3.4, 2.6,
      1.9, 1.3,
    ],
    // Saturday: shopping in the late morning
    sa: [
      1.0, 0.6, 0.4, 0.3, 0.3, 0.6, 1.3, 2.6, 4.6, 6.5, 7.8, 8.2, 7.6, 6.9, 6.5, 6.6, 6.7, 6.5, 5.6, 4.3, 3.2, 2.6, 2.0,
      1.4,
    ],
    // Sunday and holidays: a quiet morning, outings in the afternoon
    so: [
      1.4, 0.9, 0.6, 0.4, 0.3, 0.4, 0.8, 1.4, 2.6, 4.4, 6.4, 7.4, 6.9, 6.8, 7.6, 8.4, 8.6, 8.1, 7.0, 5.4, 3.9, 2.8, 2.0,
      1.2,
    ],
  };
  for (const k of Object.keys(LINE)) {
    const s = LINE[k].reduce((a, b) => a + b, 0);
    LINE[k] = LINE[k].map(v => v / s);
  }
  // the lorries' own line on weekdays (deliveries from early morning, little at night on these roads)
  const LKW = (() => {
    const L = [
        0.8, 0.6, 0.6, 0.8, 1.6, 3.6, 6.2, 7.6, 8.0, 8.2, 8.2, 7.8, 7.0, 7.2, 7.4, 7.0, 6.0, 4.6, 3.2, 2.0, 1.4, 1.1,
        0.9, 0.8,
      ],
      s = L.reduce((a, b) => a + b, 0);
    return L.map(v => v / s);
  })();
  const WDF = { mo: 1.0, fr: 1.08, sa: 0.82, so: 0.66 }; // the weekday's factor against the year's mean (Mo–Do ≈ 1)
  const MOF = [0.9, 0.93, 0.98, 1.0, 1.04, 1.06, 1.04, 1.0, 1.04, 1.03, 0.98, 0.92]; // the month's
  // ---- the calendar: weekday, holidays of Thüringen ----
  function easter(y) {
    // the Gregorian computus (Meeus/Jones/Butcher): month 1-based, day
    const a = y % 19,
      b = Math.floor(y / 100),
      c = y % 100,
      d = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31),
      dd = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, mo - 1, dd) / 864e5;
  }
  const FEST = new Map();
  function holiday(eday) {
    const dt = new Date(eday * 864e5),
      y = dt.getUTCFullYear();
    let L = FEST.get(y);
    if (!L) {
      const E = easter(y),
        fix = (m, d) => Date.UTC(y, m - 1, d) / 864e5;
      L = new Map([
        [fix(1, 1), 'Neujahr'],
        [E - 2, 'Karfreitag'],
        [E + 1, 'Ostermontag'],
        [fix(5, 1), 'Tag der Arbeit'],
        [E + 39, 'Christi Himmelfahrt'],
        [E + 50, 'Pfingstmontag'],
        [fix(9, 20), 'Weltkindertag'],
        [fix(10, 3), 'Tag der Deutschen Einheit'],
        [fix(10, 31), 'Reformationstag'],
        [fix(12, 25), '1. Weihnachtstag'],
        [fix(12, 26), '2. Weihnachtstag'],
      ]);
      FEST.set(y, L);
    }
    return L.get(Math.floor(eday)) || null;
  }
  // the moment: eday (days since 1970-01-01, the local date), min (minute of the day)
  function when(eday, min) {
    const dt = new Date(Math.floor(eday) * 864e5),
      wd = dt.getUTCDay(),
      fei = holiday(eday),
      day = fei || wd === 0 ? 'so' : wd === 6 ? 'sa' : wd === 5 ? 'fr' : 'mo',
      mo = dt.getUTCMonth(),
      h = Math.max(0, Math.min(1439.999, min)) / 60,
      i = Math.floor(h),
      t = h - i,
      L = LINE[day],
      // the share at this minute: between the hours' middles (a smooth line, no step at the full hour)
      at = (A, x) => {
        const u = x - 0.5,
          a = Math.floor(u),
          v = u - a;
        return A[(a + 24) % 24] * (1 - v) + A[(a + 25) % 24] * v;
      };
    return {
      y: dt.getUTCFullYear(),
      mo,
      d: dt.getUTCDate(),
      wd,
      day,
      fei,
      f: WDF[day] * MOF[mo],
      h,
      hs: at(L, h),
      hl: at(LKW, h),
      // harvest: more tractors from July to October
      ernte: mo >= 6 && mo <= 9,
      i,
      t,
    };
  }
  // vehicles per hour, both directions
  const rate = (kind, style, W) => dtv(kind, style) * W.f * W.hs;
  // ---- what drives: heavy share by class, the rest cars and vans ----
  const HEAVY = [0.14, 0.09, 0.06, 0.03, 0.02, 0.02];
  function typ(kind, style, W, r, r2 = Math.random()) {
    const sun = W.day === 'so',
      day = W.h >= 6 && W.h < 20,
      town = style === 2 || style === 3;
    // the heavy share at this hour: the lorries' line against the day's
    let heavy = (HEAVY[kind] ?? 0.02) * Math.min(2.2, W.hl / Math.max(0.004, W.hs));
    if (sun) heavy = 0;
    if (kind === 2 && !town) heavy *= 0.66; // a Kreisstraße carries fewer than the Landesstraße
    const trak =
        kind >= 2 && kind <= 4 && day && !sun && W.day !== 'sa' ? (W.ernte ? 0.025 : 0.01) * (kind === 2 ? 0.6 : 1) : 0,
      muell = kind >= 3 && kind <= 4 && town && W.day === 'mo' && W.h >= 6.5 && W.h < 13 ? 0.006 : 0;
    if (r < trak) return 'traktor';
    r -= trak;
    if (r < muell) return 'muell';
    r -= muell;
    if (r < heavy) {
      // on the motorway and the B roads mostly tractor units, else rigid lorries
      const semi = kind === 0 ? 0.72 : kind === 1 ? 0.55 : 0.25;
      return r2 < semi ? 'sattel' : 'lkw';
    }
    r -= heavy;
    const vans = kind >= 4 ? 0.1 : 0.08;
    if (r < vans) return r2 < 0.55 ? 'transporter' : 'sprinter';
    return null; // a car: the stock's mix (VKTYPEN.PKW)
  }
  return { dtv, when, rate, typ, holiday, easter, LINE, LKW, WDF, MOF };
})();
