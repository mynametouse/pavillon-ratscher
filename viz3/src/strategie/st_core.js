// ===================== feat/strategie: the pure logic of „Ratscher von oben“ (STCORE) – calendar, who is there, rules, power, people =====================
// No world, no window: only numbers and dates in, decisions out – so the unit tests (viz3/test/unit/strategie.test.mjs) check it in node.
//   calendar: holidays of Thuringia (Easter-based ones computed), weekends, a holiday plan (vacation days)
//   presence: your people are in the garden from the evening before free days until the afternoon of the last one; the neighbours by day
//   rules: quiet hours (32. BImSchV, Thüringer Feiertagsgesetz), daylight in the forest – each answer names its rule (STDATA.RULES)
//   power: PV yield by month, the hour and the cloud cover; the power station's charge; the generator's petrol
//   people: experience and levels, needs (energy, food, mood) and how they change speed and quality; stars of a delegated board
import { STDATA } from './st_data.js';
export const STCORE = (() => {
  const D = STDATA;
  const pad = n => String(n).padStart(2, '0');
  const iso = dt => dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  const addDays = (dt, n) => new Date(dt.getTime() + n * 864e5);
  // ---- calendar ----
  // Easter Sunday (Gregorian, anonymous algorithm) as a UTC date
  function easter(y) {
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
      da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, mo - 1, da));
  }
  const HCACHE = {};
  // the public holidays of Thuringia (Weltkindertag since 2019; Fronleichnam only in parts of the Eichsfeld – not here)
  function holidays(y) {
    if (HCACHE[y]) return HCACHE[y];
    const E = easter(y),
      H = {};
    const put = (dt, n) => (H[iso(dt)] = n);
    put(new Date(Date.UTC(y, 0, 1)), 'Neujahr');
    put(addDays(E, -2), 'Karfreitag');
    put(addDays(E, 1), 'Ostermontag');
    put(new Date(Date.UTC(y, 4, 1)), 'Tag der Arbeit');
    put(addDays(E, 39), 'Christi Himmelfahrt');
    put(addDays(E, 50), 'Pfingstmontag');
    if (y >= 2019) put(new Date(Date.UTC(y, 8, 20)), 'Weltkindertag');
    put(new Date(Date.UTC(y, 9, 3)), 'Tag der Deutschen Einheit');
    put(new Date(Date.UTC(y, 9, 31)), 'Reformationstag');
    put(new Date(Date.UTC(y, 11, 25)), '1. Weihnachtstag');
    put(new Date(Date.UTC(y, 11, 26)), '2. Weihnachtstag');
    return (HCACHE[y] = H);
  }
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  // a day (UTC date of the calendar day): weekday, holiday, free for your people (plan: vacation ranges [{ from, to }] as ISO dates)
  function day(dt, plan) {
    const s = iso(dt),
      wd = dt.getUTCDay(),
      hol = holidays(dt.getUTCFullYear())[s] || null,
      vac = !!(plan && plan.urlaub && plan.urlaub.some(r => r && s >= r.from && s <= r.to));
    return {
      iso: s,
      wd,
      wdName: WDL[wd],
      label: WD[wd] + ' ' + dt.getUTCDate() + '. ' + MON[dt.getUTCMonth()],
      month: dt.getUTCMonth(),
      hol,
      vac,
      sunday: wd === 0,
      rest: wd === 0 || !!hol, // Sunday or holiday: the day of rest for loud work
      free: wd === 0 || wd === 6 || !!hol || vac, // a day off for your people
    };
  }
  // ---- presence ----
  // your people: from the evening before the first free day (arrive) to the afternoon of the last one (leave)
  function ownPresent(dt, m, plan) {
    const P = D.PRESENCE,
      d0 = day(dt, plan),
      d1 = day(addDays(dt, 1), plan);
    if (d0.free) return !(m >= P.leave && !d1.free);
    return d1.free && m >= P.arrive;
  }
  // when they come next (game minutes from now), searched up to 120 days ahead in half-hour steps of the day boundaries
  function nextArrival(dt, m, plan) {
    if (ownPresent(dt, m, plan)) return 0;
    const P = D.PRESENCE;
    for (let k = 0; k < 120; k++) {
      const a = addDays(dt, k),
        dd = day(a, plan),
        nx = day(addDays(a, 1), plan);
      // arriving the evening before a free day (when this day is a workday), or in the morning of a free day after a free one
      if (!dd.free && nx.free) {
        const at = k * 1440 + P.arrive - m;
        if (at > 0) return at;
      }
    }
    return -1;
  }
  // the neighbours help by day, Monday to Saturday (Sunday and holidays they rest; at night they are at home)
  function npcPresent(dt, m) {
    const d0 = day(dt),
      P = D.PRESENCE;
    if (d0.rest) return { ok: false, why: 'ruhe_sonntag' };
    if (m < 6 * 60 || m >= 22 * 60) return { ok: false, why: 'nachts_daheim' };
    if (m < P.npc[0] || m >= P.npc[1]) return { ok: false, why: 'feierabend' };
    return { ok: true };
  }
  // ---- rules: loud work near the village, the forest ----
  // where: 'dorf' (the garden, the yards: in earshot of the houses) or 'wald' (the Klinge). sun: { up, down } minutes of sunrise/sunset.
  function rule(dt, m, o) {
    const d0 = day(dt);
    if (o.loud && d0.rest) return 'ruhe_sonntag';
    if (o.loud && o.where !== 'wald' && (m < 7 * 60 || m >= 20 * 60)) return 'ruhe_nacht';
    if (o.where === 'wald' && o.sun && (m < o.sun.up + 15 || m > o.sun.down - 15)) return 'tageslicht';
    if (o.where === 'wald' && d0.rest && o.saw) return 'ruhe_sonntag';
    return null;
  }
  const why = id => D.RULES[id] || { text: id, why: '', src: '' };
  // ---- power ----
  // PV power (W) at minute m of a day of month mo with cloud cover c (0 clear … 1 overcast), sun = { up, down }
  function pvW(mo, m, sun, c, kwp = D.POWER.kwp) {
    if (!sun || !(sun.down > sun.up)) return 0;
    const L = sun.down - sun.up;
    if (m <= sun.up || m >= sun.down) return 0;
    const f = 1.45 - 1.2 * Math.max(0, Math.min(1, c)),
      eDay = kwp * D.POWER.pvDay[mo] * f * 1000; // Wh
    const pmax = (eDay * Math.PI * 60) / (2 * L);
    return Math.max(0, pmax * Math.sin((Math.PI * (m - sun.up)) / L));
  }
  // the day's yield (kWh) – for the HUD and the tests
  const pvDayKWh = (mo, c, kwp = D.POWER.kwp) => kwp * D.POWER.pvDay[mo] * (1.45 - 1.2 * Math.max(0, Math.min(1, c)));
  // one step of the power station: charge from PV, draw for the load; returns { soc (kWh), short (W not covered) }
  function battery(soc, cap, pv, load, dtMin) {
    const h = dtMin / 60,
      net = (pv - load) / 1000;
    let s = soc + net * h * (net > 0 ? 0.92 : 1 / 0.92);
    let short = 0;
    if (s < 0) {
      short = (-s / h) * 1000;
      s = 0;
    }
    if (s > cap) s = cap;
    return { soc: s, short };
  }
  // ---- people ----
  function level(xp) {
    let n = 1;
    while (n < 10 && xp >= D.XP_LEVEL(n + 1)) n++;
    return n;
  }
  // needs (The Sims, Falko 23:30): energy and food 0–100, mood 0–100 → how fast and how well one works
  function eff(nd) {
    const e = Math.max(0, Math.min(100, nd.energy)),
      f = Math.max(0, Math.min(100, nd.food)),
      mo = Math.max(0, Math.min(100, nd.mood));
    const base = 0.45 + 0.55 * Math.min(1, Math.min(e, f) / 60);
    return Math.max(0.3, Math.min(1.15, base * (0.85 + 0.3 * (mo / 100))));
  }
  // needs over dtMin minutes: st 'arbeit' (heavy 0..1), 'schlaf' or anything else (awake, resting)
  function needs(nd, dtMin, st, heavy = 0) {
    const h = dtMin / 60;
    if (st === 'schlaf') nd.energy = Math.min(100, nd.energy + 12 * h);
    else if (st === 'arbeit') nd.energy = Math.max(0, nd.energy - (5 + 5 * heavy) * h);
    else nd.energy = Math.max(0, nd.energy - 1.5 * h);
    if (st !== 'schlaf') nd.food = Math.max(0, nd.food - 5.5 * h);
    // mood drifts to what energy and food allow
    const want = Math.min(85, 30 + (nd.energy + nd.food) * 0.35);
    nd.mood += (want - nd.mood) * Math.min(1, 0.08 * h);
    return nd;
  }
  // stars of a delegated workpiece: skill (1–5), efficiency, a random draw in [0, 1), a bonus (the master piece)
  function stars(skill, e, r, bonus = 0) {
    const s = 1.2 + skill * 0.62 + (e - 0.8) * 2.2 + (r - 0.5) * 1.1 + bonus;
    return Math.max(1, Math.min(5, Math.round(s)));
  }
  // ---- style (Black & White): a level name ----
  function styleName(v) {
    for (const [lim, n] of D.STYLE.levels) if (v < lim) return n;
    return D.STYLE.levels[D.STYLE.levels.length - 1][1];
  }
  // ---- deterministic randomness per day (events: storm, beetle, breakdown) ----
  function rng(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // ---- money ----
  const eur = v =>
    (Math.round(v * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  // ---- a path's length and the point at a distance along it ----
  function pathLen(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }
  function pathAt(pts, d) {
    if (!pts || !pts.length) return null;
    if (d <= 0) return pts[0].slice();
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= L) {
        const k = L > 0 ? d / L : 0;
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[0] - a[0], b[1] - a[1])];
      }
      d -= L;
    }
    const n = pts.length;
    return [
      pts[n - 1][0],
      pts[n - 1][1],
      n > 1 ? Math.atan2(pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]) : 0,
    ];
  }
  return {
    easter,
    holidays,
    day,
    iso,
    addDays,
    ownPresent,
    nextArrival,
    npcPresent,
    rule,
    why,
    pvW,
    pvDayKWh,
    battery,
    level,
    eff,
    needs,
    stars,
    styleName,
    rng,
    eur,
    pathLen,
    pathAt,
    WD,
    WDL,
    MON,
  };
})();
