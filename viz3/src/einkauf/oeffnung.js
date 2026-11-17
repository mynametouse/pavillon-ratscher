// ===================== feat/laeden-leben 1: opening hours of the shops and the public buildings (OEFFNUNG) – pure =====================
// Falko (17.11.2026 13:27): „öffentliche Gebäude sollten, so gut es geht, zugänglich sein und dann eben auch entsprechende auch
// Öffnungszeiten haben“. One registry for every shop (laeden/innen.js registers its units: the hours of OSM, else what such a shop
// usually has – marked „angenommen“) and every public building (below: the real hours where they could be found, with the source).
// No imports (node tests: viz3/test/unit/laeden_leben.test.mjs); the game's calendar comes in through OEFFNUNG.uhr(cal, now) – the
// weekday (0 Sunday … 6 Saturday) and the minute of the day of a game time t (dorf/dorf_cal.js DCAL), set by einkauf/inventar.js.
//   OEFFNUNG.add(id, { name, oh, art, ort, quelle, x, y }) · offen(id, t?) → true | false | null (unknown) · zeiten(id) → 'Mo–Fr 8–18, Sa 8–12'
//   naechste(id, t?) → { offen, min (until the change), um: 'Mo 7 Uhr' } · text(id, t?) → 'geöffnet bis 20 Uhr' | 'geschlossen – öffnet …'
//   info(id) · liste(art?) · parse(oh) → week (7 lists of [from, to) minutes, 0 = Sunday) · am(week, wd, min)
export const OEFFNUNG = (() => {
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    DEL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  // ---- parsing the forms of OSM's opening_hours used here: "Mo-Fr 08:30-19:00; Sa 08:30-18:00", "Mo,Tu 09:00-11:30,14:00-16:00",
  // "Su,PH off", "Mo-Su 09:00-24:00", "24/7"; a span past midnight ("22:00-02:00") goes on into the next day ----
  function parse(s) {
    const week = [[], [], [], [], [], [], []];
    if (!s || typeof s !== 'string') return week;
    if (s.trim() === '24/7') return week.map(() => [[0, 1440]]);
    for (const rule of s.split(';')) {
      const r = rule.trim();
      const m = r.match(/^([A-Za-z,\- ]+?)\s+(off|closed|[0-9:\-, ]+)$/);
      if (!m) continue;
      const days = new Set();
      for (const part of m[1].split(',')) {
        const p = part.trim();
        if (p === 'PH') continue;
        const [a, b] = p.split('-').map(q => DAYS.indexOf(q.trim()));
        if (a < 0) continue;
        if (b === undefined || b < 0) days.add(a);
        else
          for (let d = a; ; d = (d + 1) % 7) {
            days.add(d);
            if (d === b) break;
          }
      }
      const spans = [];
      if (m[2] !== 'off' && m[2] !== 'closed')
        for (const t of m[2].split(',')) {
          const q = t.trim().match(/^(\d\d?):(\d\d)-(\d\d?):(\d\d)$/);
          if (q) spans.push([+q[1] * 60 + +q[2], +q[3] * 60 + +q[4]]);
        }
      for (const d of days) week[d] = spans.map(x => x.slice());
    }
    // past midnight: the rest belongs to the next day
    const over = [[], [], [], [], [], [], []];
    week.forEach((sp, d) => {
      for (const x of sp)
        if (x[1] <= x[0] && x[1] > 0) {
          over[(d + 1) % 7].push([0, x[1]]);
          x[1] = 1440;
        }
    });
    over.forEach((sp, d) => week[d].push(...sp));
    for (const sp of week) sp.sort((a, b) => a[0] - b[0]);
    return week;
  }
  const am = (week, wd, min) => !!week && (week[wd] || []).some(([a, b]) => min >= a && min < b);
  // ---- the game's calendar (set at run time; the default: day 1 = Monday 1 June 2026, as dorf/dorf_cal.js without a calendar) ----
  const E0 = Date.UTC(2026, 5, 1) / 864e5;
  let cal = {
      wd: t => (((E0 + Math.floor(t / 1440) + 4) % 7) + 7) % 7,
      min: t => ((Math.floor(t) % 1440) + 1440) % 1440,
    },
    now = () => 7 * 60 + 30;
  function uhr(c, n) {
    if (c && typeof c.wd === 'function' && typeof c.min === 'function') cal = c;
    if (typeof n === 'function') now = n;
  }
  // ---- the registry ----
  const REG = new Map();
  function add(id, o) {
    if (!id || !o) return null;
    const e = Object.assign({ id, name: id, oh: '', art: 'laden', ort: '', quelle: '' }, REG.get(id) || {}, o);
    e.week = parse(e.oh);
    REG.set(id, e);
    return e;
  }
  const hm = m => {
    const h = Math.floor(m / 60),
      mi = m % 60;
    return (h === 24 ? '24' : String(h % 24)) + (mi ? ':' + String(mi).padStart(2, '0') : '');
  };
  // "Mo–Fr 8–18, Sa 8–12" – the days with the same hours together, closed days left out
  function short(week) {
    const key = sp => sp.map(x => x.join('-')).join(',');
    const out = [];
    // start the week on Monday as people say it
    const order = [1, 2, 3, 4, 5, 6, 0];
    let i = 0;
    while (i < 7) {
      const d = order[i],
        k = key(week[d]);
      let j = i;
      while (j + 1 < 7 && key(week[order[j + 1]]) === k) j++;
      if (k)
        out.push(
          (j > i ? DE[d] + (j > i + 1 ? '–' : ', ') + DE[order[j]] : DE[d]) +
            ' ' +
            week[d].map(([a, b]) => hm(a) + '–' + hm(b)).join(' und ')
        );
      i = j + 1;
    }
    return out.join(', ');
  }
  const zeiten = id => {
    const e = REG.get(id);
    return e ? (e.week.some(sp => sp.length) ? short(e.week) : 'keine festen Zeiten') : '';
  };
  function offen(id, t) {
    const e = REG.get(id);
    if (!e) return null;
    if (e.immer) return true;
    const tt = t === undefined ? now() : t;
    return am(e.week, cal.wd(tt), cal.min(tt));
  }
  // the next change from t on: within the coming 8 days
  function naechste(id, t) {
    const e = REG.get(id);
    if (!e) return null;
    const tt = t === undefined ? now() : t,
      o = offen(id, tt);
    for (let k = 1; k <= 8 * 96; k++) {
      const t2 = Math.floor(tt / 15) * 15 + k * 15;
      if (am(e.week, cal.wd(t2), cal.min(t2)) !== o) {
        const d = cal.wd(t2),
          sameDay = Math.floor(t2 / 1440) === Math.floor(tt / 1440),
          next = Math.floor(t2 / 1440) === Math.floor(tt / 1440) + 1;
        return {
          offen: o,
          min: t2 - tt,
          um: (sameDay ? '' : next ? 'morgen ' : DEL[d] + ' ') + hm(cal.min(t2)) + ' Uhr',
        };
      }
    }
    return { offen: o, min: Infinity, um: '' };
  }
  function text(id, t) {
    const e = REG.get(id);
    if (!e) return '';
    if (e.immer) return 'immer geöffnet';
    const n = naechste(id, t);
    if (!n) return '';
    if (n.offen) return n.min === Infinity ? 'geöffnet' : 'geöffnet bis ' + n.um;
    return n.min === Infinity ? 'geschlossen' : 'geschlossen – öffnet ' + n.um;
  }
  const info = id => {
    const e = REG.get(id);
    return e
      ? { id: e.id, name: e.name, oh: e.oh, art: e.art, ort: e.ort, quelle: e.quelle, zeiten: zeiten(id) }
      : null;
  };
  const liste = art => [...REG.values()].filter(e => !art || e.art === art).map(e => e.id);
  // ---- the public buildings (real hours where they could be found – the source in quelle; else plausible ones, „angenommen“) ----
  add('rathaus', {
    name: 'Rathaus Schleusingen',
    art: 'amt',
    ort: 'Schleusingen',
    oh: 'Mo,Tu 09:00-11:30,14:00-16:00; Th 09:00-11:30,14:00-17:30; Fr 09:00-11:45',
    quelle: 'Stadtverwaltung nach buergerservice.info (11/2026, ohne Gewähr)',
  });
  add('museum', {
    name: 'Naturhistorisches Museum Schloss Bertholdsburg',
    art: 'museum',
    ort: 'Schleusingen',
    oh: 'Tu-Fr 09:00-17:00; Sa,Su 10:00-18:00',
    quelle: 'museum-schleusingen.de (11/2026)',
  });
  add('johannis', {
    name: 'Stadtkirche St. Johannis',
    art: 'kirche',
    ort: 'Schleusingen',
    oh: 'Mo-Sa 10:00-17:00; Su 11:30-17:00',
    quelle: 'angenommen (offene Kirche am Tag, sonntags nach dem Gottesdienst)',
  });
  add('bibliothek', {
    name: 'Stadtbibliothek Schleusingen',
    art: 'bibliothek',
    ort: 'Schleusingen',
    oh: 'Tu 10:00-12:00,13:00-18:00; Th 13:00-18:00; Fr 10:00-12:00',
    quelle: 'angenommen',
  });
  add('post', {
    name: 'Postfiliale Schleusingen',
    art: 'post',
    ort: 'Schleusingen',
    oh: 'Mo-Fr 09:00-12:30,14:00-18:00; Sa 09:00-12:00',
    quelle: 'angenommen',
  });
  add('feuerwehr', {
    name: 'Feuerwehr Ratscher',
    art: 'feuerwehr',
    ort: 'Ratscher',
    oh: 'Th 19:00-21:00; Sa 09:00-12:00',
    quelle: 'angenommen (Dienstabend und Samstagsdienst der Freiwilligen)',
  });
  add('alteschule', {
    name: 'Alte Schule Ratscher',
    art: 'verein',
    ort: 'Ratscher',
    oh: 'Fr 19:00-23:00',
    quelle: 'der Skat- und Rommé-Abend (dorf/dorf_cal.js)',
  });
  // ---- the shops from the start (laeden/innen.js registers the same again when their data has loaded – the side quests may ask
  // before): OSM's hours, else the usual ones of their kind (as DEFAULT_OH there) ----
  const OSM = 'OpenStreetMap',
    ANG = 'angenommen (übliche Zeiten)';
  for (const [id, name, oh, q] of [
    ['edeka', 'EDEKA', 'Mo-Sa 07:00-20:00', OSM],
    ['rewe', 'REWE', 'Mo-Fr 06:00-22:00; Sa 06:00-20:00', OSM],
    ['lidl', 'Lidl', 'Mo-Sa 07:00-20:00; Su,PH off', OSM],
    ['lidlbaecker', 'Café & Backshop Drei Ähren', 'Mo-Fr 08:00-18:00; Sa 08:00-12:00; Su,PH off', OSM],
    ['aldi', 'Aldi', 'Mo-Sa 07:00-20:00; Su off', OSM],
    ['obi', 'OBI', 'Mo-Fr 08:30-19:00; Sa 08:30-18:00', OSM],
    ['apotheke', 'Spangenberg-Apotheke', 'Mo-Fr 08:00-19:00; Sa 08:00-16:00', OSM],
    ['waesche', 'Wäscheservice', 'Mo-Fr 09:00-18:00', OSM],
    ['mcd', "McDonald's", 'Mo-Su 09:00-24:00', OSM],
    ['mega', 'Mega Center', 'Mo-Sa 08:00-20:00', ANG],
    ['megarest', 'Mega-Restaurant', 'Mo-Su 11:00-22:00', ANG],
    ['megamoebel', 'Mega-Möbel', 'Mo-Fr 10:00-19:00; Sa 10:00-18:00', ANG],
    ['getraenke', 'Getränkequelle', 'Mo-Fr 09:00-19:00; Sa 08:00-16:00', ANG],
    ['turan', 'Turan Kebap Haus', 'Mo-Su 10:00-22:00', ANG],
    ['shell', 'Shell', 'Mo-Sa 06:00-22:00; Su 07:00-22:00', ANG],
    // the shops behind the old town's signs (schleusingen/si_innen.js: assumed there too)
    ['adlerapotheke', 'Adler Apotheke', 'Mo-Fr 08:00-18:30; Sa 08:00-12:00', ANG],
    ['stadtcafe', 'Stadtcafé', 'Mo-Su 09:00-18:00', ANG],
    ['ratsstube', 'Ratsstube', 'Mo-Su 11:00-22:00', ANG],
    ['goldenerloewe', 'Zum Goldenen Löwen', 'Mo-Su 11:00-22:00', ANG],
  ])
    add(id, { name, oh, art: 'laden', ort: 'Schleusingen', quelle: q });
  return { add, offen, zeiten, naechste, text, info, liste, parse, am, short, uhr, hm, DE, DEL, REG };
})();
if (typeof window !== 'undefined') window.OEFFNUNG = OEFFNUNG;
