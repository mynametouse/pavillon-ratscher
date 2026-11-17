// ===================== feat/grenzland-alltag: festivals by the calendar – when, where, what there is (GLFDATA) =====================
// Falko, 17.11.2026 12:26 (clicked „Feste im Kalender“): „Kirmes in Ratscher, Weihnachtsmarkt in Schleusingen, Feuerwehrfest – Musik,
// Menge, Deckung für Missionen.“ Pure data and pure functions (no scene – unit tests in viz3/test/unit/grenzland_feste.test.mjs):
//   FESTE        the three festivals: place, opening hours per day, who of the village people (grenzland/gl_alltag_data.js) works at a
//                stall, the stalls with what they sell, the music, the strings of lights
//   tage(id, y)  the days of a festival in a year: [{ eday, von, bis }] (minutes of the day; 24:00 = 1440)
//   offen(eday, min)   the festival open at that moment: { id, name, ort, von, bis, eday } or null
//   kalender(eday, min, n)   the next n openings from that moment (one per festival day), with a date to show
//   naechster(id, eday, min)   the next opening of one festival (GLFESTE.debug.zu jumps there)
//   los(r)       a ticket of the tombola (r: 0 … 1) → { k, text, geld }
// The dates: the Kirmes of Ratscher is not documented in the sources we read (17.11.2026: two web searches, the region dossier lists it as
// „vor Ort fragen“) – the game puts it on the second weekend of October, as many Kirmes days in Thuringia fall in autumn. The Christmas
// market of Schleusingen is on the Markt on the four Advent weekends (as the brief says; the town's own dates were not checked). The
// Feuerwehrfest is invented for the game (the second weekend of July, at the old school, the fire brigade's club house in the game) – no
// real club's festival is described; nobody's real deeds are told.
export const GLFDATA = (() => {
  const hm = s => {
    const [a, b] = String(s).split(':');
    return +a * 60 + (+b || 0);
  };
  const ymd = e => {
    const d = new Date(e * 864e5);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() };
  };
  const edayOf = (y, m, d) => Date.UTC(y, m, d) / 864e5;
  const WD = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
  const MON = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ];
  // the n-th Saturday of a month (n from 1)
  function samstag(y, m, n) {
    const e1 = edayOf(y, m, 1),
      wd = ymd(e1).wd;
    return e1 + ((6 - wd + 7) % 7) + (n - 1) * 7;
  }
  // the first Sunday of Advent: the Sunday from 27 November to 3 December
  function advent1(y) {
    const e = edayOf(y, 10, 27),
      wd = ymd(e).wd;
    return e + ((7 - wd) % 7);
  }
  // ---- the festivals ----
  // pos: where it stands (the runtime moves it to free ground near), hd: the way its stalls face (radians, 0 north, clockwise), r: how far
  // the festival reaches (the crowd, the music at full strength), dienst: who of the village people works where (stall id → person)
  const FESTE = {
    kirmes: {
      name: 'Kirmes in Ratscher',
      kurz: 'Kirmes',
      ort: 'ratscher',
      platz: 'Anger',
      pos: [229.5, -111.5],
      hd: 2.9,
      r: 32,
      // the days: the second Saturday of October and the Sunday after it
      tage: y => {
        const s = samstag(y, 9, 2);
        return [
          { eday: s, von: hm('14:00'), bis: hm('24:00') },
          { eday: s + 1, von: hm('10:00'), bis: hm('20:00') },
        ];
      },
      musik: { lieder: ['km_ultra.mp3', 'km_fourbeers.mp3', 'km_glee.mp3', 'km_dvorak.mp3'] },
      baum: true,
      tanz: true,
      dienst: { grill: 'uwe', tombola: 'ingrid', ausschank: 'kalle', kuchen: 'heike' },
      staende: [
        // id, kind, [right, forward] from the centre in the festival's frame, how it is turned (radians), its sign
        { id: 'grill', art: 'bude', at: [-7, 4], dreh: 0, schild: 'ROSTBRATWURST', farbe: 'rot' },
        { id: 'ausschank', art: 'bude', at: [7, 4], dreh: 0, schild: 'AUSSCHANK', farbe: 'blau' },
        { id: 'kuchen', art: 'tisch', at: [-4, -6], dreh: Math.PI, schild: 'KIRMESKUCHEN', farbe: 'gelb' },
        { id: 'tombola', art: 'bude', at: [5, -6], dreh: Math.PI, schild: 'TOMBOLA', farbe: 'gruen' },
      ],
      baenke: [
        [0, 9, 0],
        [-3.2, 9, 0],
        [3.2, 9, 0],
      ],
      verkauf: [
        {
          stand: 'grill',
          k: 'wurst',
          label: 'Rostbratwurst kaufen (3 €)',
          eur: 3,
          sagt: 'Mit Senf. Natürlich mit Senf.',
        },
        {
          stand: 'ausschank',
          k: 'bier',
          label: 'Ein Bier vom Fass (3 €)',
          eur: 3,
          sagt: 'Prost! Und nicht mehr fahren heute.',
        },
        {
          stand: 'kuchen',
          k: 'kuchen',
          label: 'Kirmeskuchen kaufen (2 €)',
          eur: 2,
          sagt: 'Streusel, Mohn oder Quark? Egal, alles selbst gebacken.',
        },
        { stand: 'tombola', k: 'los', label: 'Ein Los ziehen (1 €)', eur: 1, sagt: 'Jedes Los gewinnt. Fast jedes.' },
      ],
    },
    weihnachtsmarkt: {
      name: 'Weihnachtsmarkt in Schleusingen',
      kurz: 'Weihnachtsmarkt',
      ort: 'schleusingen',
      platz: 'Markt',
      pos: [-1086, 1229],
      hd: 0.35,
      r: 34,
      // the four Advent weekends: Friday evening, Saturday, Sunday
      tage: y => {
        const a = advent1(y),
          out = [];
        for (let w = 0; w < 4; w++) {
          const so = a + w * 7;
          out.push({ eday: so - 2, von: hm('16:00'), bis: hm('21:00') });
          out.push({ eday: so - 1, von: hm('12:00'), bis: hm('21:00') });
          out.push({ eday: so, von: hm('12:00'), bis: hm('19:00') });
        }
        return out;
      },
      // five carols by Kevin MacLeod (CC BY 4.0) from the sound repository (pavillon-ton/radio/wm_*); where it cannot be had (another host,
      // offline) the music box played by the synthesiser
      musik: {
        lieder: [
          'wm_stillenacht.mp3',
          'wm_tannenbaum.mp3',
          'wm_adeste.mp3',
          'wm_merrychristmas.mp3',
          'wm_jinglebells.mp3',
        ],
        spieluhr: true,
      },
      baum: 'tanne',
      dienst: { gluehwein: 'tobias', wurst: 'rainer', tombola: 'baerbel', stollen: 'sabine' },
      staende: [
        { id: 'gluehwein', art: 'huette', at: [-8, 5], dreh: 0, schild: 'GLÜHWEIN', farbe: 'rot' },
        { id: 'wurst', art: 'huette', at: [8, 5], dreh: 0, schild: 'ROSTBRATWURST', farbe: 'gruen' },
        { id: 'tombola', art: 'huette', at: [-8, -6], dreh: Math.PI, schild: 'TOMBOLA', farbe: 'gruen' },
        { id: 'stollen', art: 'huette', at: [8, -6], dreh: Math.PI, schild: 'STOLLEN', farbe: 'rot' },
      ],
      baenke: [],
      verkauf: [
        {
          stand: 'gluehwein',
          k: 'gluehwein',
          label: 'Glühwein (3 €)',
          eur: 3,
          sagt: 'Vorsicht, heiß. Die Tasse bringst du wieder, die hat Pfand.',
        },
        {
          stand: 'gluehwein',
          k: 'punsch',
          label: 'Kinderpunsch (2 €)',
          eur: 2,
          sagt: 'Kinderpunsch für den Fahrer. Vernünftig.',
          alt: true,
        },
        { stand: 'wurst', k: 'wurst', label: 'Rostbratwurst kaufen (3 €)', eur: 3, sagt: 'Mit Senf? Mit Senf.' },
        {
          stand: 'tombola',
          k: 'los',
          label: 'Ein Los ziehen (1 €)',
          eur: 1,
          sagt: 'Der Erlös geht an den Kindergarten.',
        },
        {
          stand: 'stollen',
          k: 'stollen',
          label: 'Ein Stück Stollen (2 €)',
          eur: 2,
          sagt: 'Mit Butter gebacken. Wie es sich gehört.',
        },
      ],
    },
    feuerwehrfest: {
      name: 'Feuerwehrfest in Ratscher',
      kurz: 'Feuerwehrfest',
      ort: 'ratscher',
      platz: 'an der alten Schule',
      pos: [229.5, -111.5],
      hd: 0.2,
      r: 30,
      // the second Saturday of July and the Sunday after it (invented for the game)
      tage: y => {
        const s = samstag(y, 6, 2);
        return [
          { eday: s, von: hm('14:00'), bis: hm('24:00') },
          { eday: s + 1, von: hm('10:00'), bis: hm('16:00') },
        ];
      },
      musik: { lieder: ['km_waunobe.mp3', 'km_bavaria.mp3', 'km_fourbeers.mp3'] },
      baum: false,
      dienst: { grill: 'manfred', ausschank: 'jens', tombola: 'heike' },
      staende: [
        { id: 'grill', art: 'bude', at: [-7, 4], dreh: 0, schild: 'ROSTBRATWURST', farbe: 'rot' },
        { id: 'ausschank', art: 'bude', at: [7, 4], dreh: 0, schild: 'GETRÄNKE', farbe: 'rot' },
        { id: 'tombola', art: 'bude', at: [0, -7], dreh: Math.PI, schild: 'TOMBOLA', farbe: 'rot' },
      ],
      baenke: [
        [0, 9, 0],
        [-3.2, 9, 0],
        [3.2, 9, 0],
        [0, 12, 0],
      ],
      verkauf: [
        {
          stand: 'grill',
          k: 'wurst',
          label: 'Rostbratwurst kaufen (3 €)',
          eur: 3,
          sagt: 'Vom Grill der Wehr. Mit Senf.',
        },
        {
          stand: 'ausschank',
          k: 'fassbrause',
          label: 'Fassbrause (2 €)',
          eur: 2,
          sagt: 'Fassbrause. Schmeckt nach Sommer.',
        },
        {
          stand: 'tombola',
          k: 'los',
          label: 'Ein Los ziehen (1 €)',
          eur: 1,
          sagt: 'Hauptpreis ist ein Präsentkorb. Ingrid hat ihn gefunden.',
        },
      ],
    },
  };
  const IDS = Object.keys(FESTE);
  // the days of a festival in a year (cached)
  const C = {};
  function tage(id, y) {
    const F = FESTE[id];
    if (!F) return [];
    const k = id + ':' + y;
    return C[k] || (C[k] = F.tage(y));
  }
  // the festival open at a moment (eday: days since 1970, min: minute of the day)
  function offen(eday, min) {
    const y = ymd(eday).y;
    for (const id of IDS)
      for (const d of tage(id, y))
        if (d.eday === eday && min >= d.von && min < d.bis) {
          const F = FESTE[id];
          return { id, name: F.name, ort: F.ort, von: d.von, bis: d.bis, eday };
        }
    return null;
  }
  const datum = e => {
    const q = ymd(e);
    return WD[q.wd] + ' ' + q.d + '. ' + MON[q.m];
  };
  const uhr = m => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  // the next n festival days from a moment on (one that is open now first)
  function kalender(eday, min, n = 3) {
    const y = ymd(eday).y,
      out = [];
    for (const yy of [y, y + 1])
      for (const id of IDS)
        for (const d of tage(id, yy))
          if (d.eday > eday || (d.eday === eday && d.bis > min)) {
            const F = FESTE[id];
            out.push({
              id,
              name: F.name,
              ort: F.ort,
              eday: d.eday,
              von: d.von,
              bis: d.bis,
              jetzt: d.eday === eday && min >= d.von,
              text: datum(d.eday) + ', ' + uhr(d.von) + '–' + uhr(d.bis) + ' Uhr',
            });
          }
    out.sort((a, b) => a.eday - b.eday || a.von - b.von);
    return out.slice(0, n);
  }
  function naechster(id, eday, min) {
    const y = ymd(eday).y;
    for (const yy of [y, y + 1])
      for (const d of tage(id, yy))
        if (d.eday > eday || (d.eday === eday && d.bis > min)) return Object.assign({ id }, d);
    return null;
  }
  // ---- the tombola: mostly blanks, sometimes something small, rarely the main prize ----
  const LOSE = [
    { k: 'niete', p: 0.55, text: 'Niete. „Nächstes Jahr“, sagt man hier.' },
    { k: 'kuerbis', p: 0.12, text: 'Gewonnen: ein Kürbis. Von Heike. Natürlich.' },
    { k: 'honig', p: 0.1, text: 'Gewonnen: ein Glas Honig aus dem Dorf.' },
    { k: 'gutschein', p: 0.1, text: 'Gewonnen: fünf Euro Gutschein für den Verkaufswagen.', geld: 5 },
    { k: 'wasser', p: 0.08, text: 'Gewonnen: ein Kasten Wasser. Den trägst du jetzt.' },
    { k: 'korb', p: 0.05, text: 'Der Hauptpreis! Ein Präsentkorb mit Rostbratwurst, Senf und Kirmeskuchen.', geld: 0 },
  ];
  function los(r) {
    let a = 0;
    for (const l of LOSE) {
      a += l.p;
      if (r < a) return l;
    }
    return LOSE[0];
  }
  // every fixed line spoken here (stall keepers say them; the voices are recorded from these): [who, text]
  function linien() {
    const out = [];
    for (const F of Object.values(FESTE))
      for (const v of F.verkauf) {
        const who = F.dienst[v.stand];
        out.push([who ? 'al_' + who : 'al_stand', v.sagt]);
      }
    return out;
  }
  return { FESTE, IDS, LOSE, hm, ymd, samstag, advent1, tage, offen, kalender, naechster, datum, los, linien };
})();
if (typeof window !== 'undefined') window.GLFDATA = GLFDATA;
