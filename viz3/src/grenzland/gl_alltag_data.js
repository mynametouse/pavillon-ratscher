// ===================== feat/grenzland-alltag: the day of the village people – who, where, when, what they say (GLALDATA) =====================
// Falko, 17.11.2026 12:26 (clicked „Tagesablauf der Leute“): „Morgens Bäcker und Schulbus, tagsüber Hof und Feld, abends Gasthaus und
// Feldscheune, sonntags Kirche.“ Pure data and pure functions (no scene – unit tests in viz3/test/unit/grenzland_alltag.test.mjs):
//   LEUTE    twelve people of Ratscher and five of Schleusingen, invented. In Ratscher they are the people who write in the village chat
//            „Ratscher aktuell“ (gl_data.js / gl_radio_data.js CHAT: Ingrid, Uwe, Manfred, Heike, Wolfgang, Katrin, Jens; Anja and her dog,
//            Kirmes_Kalle and Angel_Andi of the feed) – the seven of the base game's village (dorf/dorf_text.js) as the same people, in their
//            own figures. Not Hubert, not Ronald, not Gerhard, nobody of chapter 1's cast (GLDATA.CAST) twice.
//   ORTE     the places of their day: real places of Ratscher (the shop on wheels at the Anger, the Dorflinde, the school bus stop, the well,
//            the old school – today the fire brigade's club house –, the Feldscheune of the mode, the dam) and of Schleusingen (a bakery in
//            the Bertholdstraße, the Markt, St. Johannis, a Gaststätte – generic, no names of real businesses, the Rathaus)
//   jetzt(p, c)   where a person is and what they do at a moment: c = { eday, min, fest, basis } – the plan by weekday and clock, varied
//            a little from day to day (deterministic), winter (November–February) indoors earlier and fewer outside, night almost nobody;
//            a festival that is open takes most of its village (and some of the other); what the base game already shows of the seven
//            (c.basis: the Friday evening in the old school, the fire on the field, out with the car, the front garden – dorf/dorf_life.js)
//            comes first, so the base game and the mode never show one person twice
//   ansage(p, lage, stufe, tz)   the fixed line said with E (by situation; by the village's opinion of the player, GLRUF.stufe)
//   gruss(stufe, tz)   the greeting when the player passes · linien() → [[who, text], …] every fixed line (recordings)
// Everything here is invented; the chat is satire. The day plans are plausible village life, not anybody's real day.
export const GLALDATA = (() => {
  const hm = s => {
    const [a, b] = String(s).split(':');
    return +a * 60 + (+b || 0);
  };
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const ymd = e => {
    const d = new Date(e * 864e5);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() };
  };
  // ---- the places (site metres: x east, y north; the garden's slab is the origin) ----
  // art: how one is there – stehen (a group standing and talking), bank (sitting on a bench near), schlange (queueing at the van), warten
  // (in a row at the bus stop), arbeit (alone, working), runde (walking a round); innen: indoors or away – not drawn; dyn: resolved in the
  // world (gl_alltag.js): the person's home, the barn's yard, the angling spot, a free spot near pos, the festival's crowd
  const ORTE = {
    wagen: { ort: 'ratscher', name: 'Verkaufswagen am Anger', pos: [236.6, -121.7], art: 'schlange' },
    linde: { ort: 'ratscher', name: 'Dorflinde', pos: [217, -109], art: 'bank' },
    anger: { ort: 'ratscher', name: 'Anger', pos: [226.5, -104.5], art: 'stehen' },
    haltestelle: { ort: 'ratscher', name: 'Schulbushaltestelle am Anger', pos: [248.4, -102.4], art: 'warten' },
    brunnen: { ort: 'ratscher', name: 'Brunnen am Anger', pos: [261.2, -118.3], art: 'bank' },
    schule: { ort: 'ratscher', name: 'Alte Schule (Feuerwehrverein)', pos: [229.6, -97.2], art: 'stehen' },
    runde: { ort: 'ratscher', name: 'Runde um den Anger', pos: [226, -110], art: 'runde' },
    treff: { ort: 'ratscher', name: 'Feldscheune', pos: [117, -304], art: 'stehen', dyn: 'treff' },
    damm: { ort: 'ratscher', name: 'Staudamm der Talsperre', pos: [853, -817], art: 'arbeit', dyn: 'angel' },
    hof: { ort: 'ratscher', name: 'vor dem Haus', art: 'arbeit', dyn: 'daheim' },
    daheim: { ort: 'ratscher', name: 'zu Hause', innen: true, dyn: 'daheim' },
    feld: { ort: 'ratscher', name: 'auf dem Feld', pos: [380, -60], innen: true },
    wald: { ort: 'ratscher', name: 'im Wald an der Klinge', pos: [-500, -520], innen: true },
    stadt: { ort: 'schleusingen', name: 'in Schleusingen bei der Arbeit', pos: [-1100, 1300], innen: true },
    schulweg: { ort: 'schleusingen', name: 'in der Schule in Schleusingen', pos: [-1200, 1100], innen: true },
    feuer: { ort: 'ratscher', name: 'am Feuer auf dem Acker', pos: [-200, -300], innen: true },
    // Schleusingen
    // (the bakery or else the café whose door is nearest and open – schleusingen/si_innen.js has the shop rooms of the old town)
    baecker: {
      ort: 'schleusingen',
      name: 'Bäcker oder Café am Markt',
      pos: [-1040, 1245],
      art: 'stehen',
      dyn: 'laden',
    },
    markt: { ort: 'schleusingen', name: 'Markt', pos: [-1091.7, 1238.6], art: 'bank' },
    marktmitte: { ort: 'schleusingen', name: 'Markt', pos: [-1078, 1236], art: 'stehen', dyn: 'frei' },
    // the south door of St. Johannis (seen on the town's model): [x, y, normal x, normal y]
    kirche: {
      ort: 'schleusingen',
      name: 'St. Johannis',
      pos: [-1250.2, 1187.9],
      art: 'stehen',
      tuer: [-1249.8, 1191.9, 0.32, -0.95],
    },
    gaststaette: {
      ort: 'schleusingen',
      name: 'Gaststätte am Markt',
      pos: [-1112.5, 1191.5],
      art: 'stehen',
      dyn: 'laden',
    },
    rathaus: { ort: 'schleusingen', name: 'Rathaus', pos: [-1131, 1204], innen: true },
    stadtheim: { ort: 'schleusingen', name: 'zu Hause', pos: [-1150, 1270], innen: true },
    fest: { ort: '', name: 'auf dem Fest', art: 'stehen', dyn: 'fest' },
  };
  // ---- the people: figure (CHARMAN key), clips, height, voice, clothes (KLEID below, only for the street figures – the seven of the
  //      village keep their own look), a thing in the hand, the twin of the base game (dorf: its key in dorf/dorf_text.js) ----
  //      plan: [days, from, to, place, doing, options] – days: '0'…'6' (0 Sunday … 6 Saturday, as dorf/dorf_cal.js), options: p (share
  //      of days), jit (± minutes from day to day, default 8), schule (school days only), draussen (leisure outside: rarer and over by
  //      17:30 in winter), sommer (April–October only), woche ('g'/'u': even/odd weeks), ding (a thing in the hand for it), pose
  const W = '12345',
    MS = '123456',
    ALL = '0123456';
  const LEUTE = [
    // ---------------- Ratscher ----------------
    {
      id: 'ingrid',
      name: 'Ingrid',
      ort: 'ratscher',
      dorf: 'ingrid',
      fig: 'dorf_ingrid',
      clips: 'f',
      h: 1.67,
      voice: { g: 'f', age: 63 },
      wer: 'Ortsteilbürgermeisterin, wacht über Mülltonnen und Aushänge',
      plan: [
        [MS, '8:10', '8:45', 'wagen', 'einkaufen', { ding: 'netz' }],
        ['13', '10:00', '10:50', 'schule', 'aushang', { p: 0.8 }],
        [ALL, '15:40', '16:30', 'linde', 'plaudern', { p: 0.6, draussen: true }],
        ['0', '9:20', '11:50', 'kirche', 'kirche', { p: 0.7, jit: 4 }],
      ],
    },
    {
      id: 'uwe',
      name: 'Uwe',
      ort: 'ratscher',
      dorf: 'uwe',
      fig: 'dorf_uwe',
      clips: 'm',
      h: 1.8,
      voice: { g: 'm', age: 58 },
      wer: 'Landwirt, war es nie',
      plan: [
        [ALL, '6:20', '7:50', 'hof', 'stall', { ding: 'kanne', jit: 5 }],
        [MS, '8:30', '12:00', 'feld', 'feld'],
        [MS, '13:30', '17:20', 'hof', 'hof', { ding: 'eimer', p: 0.8 }],
        [W, '16:00', '16:25', 'wagen', 'einkaufen', { p: 0.4 }],
        ['36', '19:00', '21:30', 'treff', 'kegeln', { p: 0.7, draussen: true, sommer: true }],
      ],
    },
    {
      id: 'manfred',
      name: 'Manfred',
      ort: 'ratscher',
      dorf: 'manfred',
      fig: 'dorf_manfred',
      clips: 'm',
      h: 1.78,
      voice: { g: 'm', age: 56 },
      wer: 'Wehrführer, plant jede Übung mit Kuchen',
      plan: [
        [MS, '8:35', '9:05', 'wagen', 'einkaufen', { p: 0.5, ding: 'beutel' }],
        ['6', '9:00', '11:00', 'schule', 'uebung', { jit: 0 }],
        [W, '10:00', '11:40', 'schule', 'geraete', { p: 0.45 }],
        ['3', '18:30', '20:30', 'schule', 'dienstabend', { woche: 'g', jit: 0 }],
        [ALL, '17:00', '17:50', 'linde', 'plaudern', { p: 0.5, draussen: true }],
      ],
    },
    {
      id: 'heike',
      name: 'Heike',
      ort: 'ratscher',
      dorf: 'heike',
      fig: 'dorf_heike',
      clips: 'f',
      h: 1.7,
      voice: { g: 'f', age: 52 },
      wer: 'Gemüsegarten und Hühner, hat immer noch drei Kürbisse',
      plan: [
        [ALL, '7:20', '7:50', 'hof', 'huehner', { ding: 'eimer' }],
        [MS, '8:00', '8:30', 'wagen', 'einkaufen', { p: 0.6, ding: 'netz' }],
        [ALL, '16:00', '16:50', 'linde', 'plaudern', { p: 0.5, draussen: true }],
        ['0', '9:20', '11:50', 'kirche', 'kirche', { p: 0.5, jit: 4 }],
      ],
    },
    {
      id: 'wolfgang',
      name: 'Wolfgang',
      ort: 'ratscher',
      dorf: 'wolfgang',
      fig: 'dorf_wolfgang',
      clips: 'm',
      h: 1.79,
      voice: { g: 'm', age: 61 },
      wer: 'Waldarbeiter, weiß, wo die Pilze stehen, und sagt es nicht',
      plan: [
        [W, '6:45', '15:30', 'wald', 'wald'],
        ['6', '8:00', '11:30', 'wald', 'pilze', { p: 0.6, sommer: true }],
        [ALL, '16:30', '18:00', 'hof', 'holz', { p: 0.6, pose: 'carry' }],
        ['36', '19:00', '21:30', 'treff', 'kegeln', { p: 0.6, draussen: true, sommer: true }],
      ],
    },
    {
      id: 'katrin',
      name: 'Katrin',
      ort: 'ratscher',
      dorf: 'katrin',
      fig: 'dorf_katrin',
      clips: 'f',
      h: 1.68,
      voice: { g: 'f', age: 44 },
      wer: 'Pflegerin in der Stadt, weiß als Erste, was der Verkaufswagen hat',
      plan: [
        [W, '16:40', '17:15', 'wagen', 'einkaufen', { p: 0.6, ding: 'beutel' }],
        ['6', '9:30', '10:15', 'baecker', 'einkaufen', { p: 0.5, ding: 'beutel' }],
        [ALL, '18:00', '18:50', 'linde', 'plaudern', { p: 0.4, draussen: true }],
      ],
    },
    {
      id: 'jens',
      name: 'Jens',
      ort: 'ratscher',
      dorf: 'jens',
      fig: 'dorf_jens',
      clips: 'm',
      h: 1.82,
      voice: { g: 'm', age: 38 },
      wer: 'Kfz-Mechaniker in Schleusingen, sucht immer einen Schlüssel',
      plan: [
        ['6', '9:00', '11:00', 'schule', 'uebung', { jit: 0 }],
        ['6', '13:00', '16:00', 'hof', 'schrauben', { p: 0.7, pose: 'bonnet' }],
        [W, '17:15', '18:30', 'hof', 'schrauben', { p: 0.35, pose: 'bonnet', draussen: true }],
        ['36', '19:00', '21:30', 'treff', 'kegeln', { p: 0.6, draussen: true, sommer: true }],
      ],
    },
    {
      id: 'anja',
      name: 'Anja',
      ort: 'ratscher',
      fig: 'vk_f12',
      clips: 'f',
      h: 1.66,
      voice: { g: 'f', age: 41 },
      kleid: 'al_anja',
      wer: 'arbeitet von zu Hause; ihr Hund Bruno liegt seit den Böllern unterm Sofa',
      plan: [
        [MS, '8:30', '9:00', 'wagen', 'einkaufen', { p: 0.65, ding: 'netz' }],
        [W, '12:30', '13:00', 'linde', 'plaudern', { p: 0.35, draussen: true }],
        [ALL, '21:15', '21:45', 'runde', 'abendrunde', { p: 0.85, jit: 6 }],
      ],
    },
    {
      id: 'kalle',
      name: 'Kalle',
      ort: 'ratscher',
      fig: 'vk_m07',
      clips: 'm',
      h: 1.84,
      voice: { g: 'm', age: 27 },
      kleid: 'al_kalle',
      wer: 'Kirmesbursche, arbeitet in Schicht in Schleusingen',
      plan: [
        [W, '5:20', '14:20', 'stadt', 'schicht', { jit: 0 }],
        [W, '15:00', '17:00', 'treff', 'schrauben', { p: 0.5, draussen: true }],
        ['6', '9:00', '11:00', 'schule', 'uebung', { jit: 0 }],
        ['56', '19:30', '22:30', 'treff', 'grillen', { p: 0.7, draussen: true }],
      ],
    },
    {
      id: 'andi',
      name: 'Andi',
      ort: 'ratscher',
      fig: 'vk_m16',
      clips: 'm',
      h: 1.78,
      voice: { g: 'm', age: 50 },
      kleid: 'al_andi',
      hut: 'schieber',
      wer: 'Angler, verrät nie, worauf die Karpfen beißen – nur im Feed',
      plan: [
        [W, '6:00', '14:30', 'stadt', 'arbeit', { jit: 0 }],
        ['6', '8:30', '9:00', 'wagen', 'einkaufen', { p: 0.5 }],
        ['146', '17:30', '20:30', 'damm', 'angeln', { p: 0.7, draussen: true, sommer: true }],
      ],
    },
    {
      id: 'lea',
      name: 'Lea',
      ort: 'ratscher',
      fig: 'vk_f07',
      clips: 'f',
      h: 1.63,
      voice: { g: 'f', age: 15 },
      kleid: 'al_lea',
      wer: 'Schülerin in Schleusingen, fährt mit dem Schulbus',
      plan: [
        [W, '6:50', '7:08', 'haltestelle', 'warten', { schule: true, jit: 2 }],
        [W, '7:08', '13:30', 'schulweg', 'schule', { schule: true, jit: 0 }],
        [W, '13:30', '13:45', 'haltestelle', 'heim', { schule: true, jit: 0 }],
        [W, '15:30', '17:00', 'linde', 'handy', { p: 0.6, draussen: true }],
        ['6', '14:00', '16:00', 'linde', 'handy', { p: 0.5, draussen: true }],
        ['5', '19:00', '21:30', 'haltestelle', 'abhaengen', { p: 0.7 }],
        ['6', '19:00', '22:00', 'marktmitte', 'abhaengen', { p: 0.7 }],
      ],
    },
    {
      id: 'max',
      name: 'Max',
      ort: 'ratscher',
      fig: 'vk_m02',
      clips: 'm',
      h: 1.72,
      voice: { g: 'm', age: 16 },
      kleid: 'al_max',
      wer: 'Schüler, träumt von einer eigenen Simson',
      plan: [
        [W, '6:52', '7:08', 'haltestelle', 'warten', { schule: true, jit: 2 }],
        [W, '7:08', '13:30', 'schulweg', 'schule', { schule: true, jit: 0 }],
        [W, '13:30', '13:45', 'haltestelle', 'heim', { schule: true, jit: 0 }],
        [W, '15:00', '17:30', 'treff', 'moped', { p: 0.45, draussen: true }],
        [W, '15:30', '17:00', 'linde', 'handy', { p: 0.4, draussen: true }],
        ['6', '10:00', '12:00', 'treff', 'moped', { p: 0.6, draussen: true }],
        ['5', '19:00', '21:30', 'haltestelle', 'abhaengen', { p: 0.7 }],
        ['6', '19:00', '22:00', 'marktmitte', 'abhaengen', { p: 0.7 }],
      ],
    },
    // ---------------- Schleusingen ----------------
    {
      id: 'baerbel',
      name: 'Bärbel',
      ort: 'schleusingen',
      fig: 'vk_f15',
      clips: 'f',
      h: 1.63,
      stoop: 0.05,
      voice: { g: 'f', age: 67 },
      kleid: 'al_baerbel',
      wer: 'Rentnerin, kauft jeden Morgen zwei Brötchen und eine Neuigkeit',
      plan: [
        [MS, '9:05', '9:40', 'baecker', 'einkaufen', { ding: 'netz' }],
        [ALL, '10:00', '11:00', 'markt', 'bank', { p: 0.5, draussen: true }],
        ['0', '9:30', '11:45', 'kirche', 'kirche', { jit: 4 }],
      ],
    },
    {
      id: 'rainer',
      name: 'Rainer',
      ort: 'schleusingen',
      fig: 'vk_m11',
      clips: 'm',
      h: 1.76,
      stoop: 0.05,
      voice: { g: 'm', age: 69 },
      kleid: 'al_rainer',
      hut: 'hut',
      wer: 'Rentner auf der Bank am Markt, zählt Tauben und Busse',
      plan: [
        [MS, '9:00', '9:25', 'baecker', 'einkaufen', { p: 0.7 }],
        [ALL, '9:30', '11:30', 'markt', 'bank', { p: 0.8, draussen: true }],
        [ALL, '14:30', '16:30', 'markt', 'bank', { p: 0.6, draussen: true }],
        ['25', '19:00', '21:30', 'gaststaette', 'stammtisch', { p: 0.8 }],
        ['0', '9:30', '11:45', 'kirche', 'kirche', { p: 0.6, jit: 4 }],
      ],
    },
    {
      id: 'sabine',
      name: 'Sabine',
      ort: 'schleusingen',
      fig: 'vk_f14',
      clips: 'f',
      h: 1.7,
      voice: { g: 'f', age: 45 },
      kleid: 'al_sabine',
      ding: 'tasche',
      wer: 'arbeitet im Bürgerbüro im Rathaus',
      plan: [
        [W, '7:40', '7:55', 'baecker', 'einkaufen', { p: 0.7, jit: 4 }],
        [W, '8:00', '12:00', 'rathaus', 'arbeit', { jit: 0 }],
        [W, '12:00', '12:40', 'markt', 'mittag', { p: 0.7, draussen: true, jit: 4 }],
        [W, '12:40', '16:30', 'rathaus', 'arbeit', { jit: 0 }],
      ],
    },
    {
      id: 'tobias',
      name: 'Tobias',
      ort: 'schleusingen',
      fig: 'vk_m20',
      clips: 'm',
      h: 1.8,
      voice: { g: 'm', age: 29 },
      kleid: 'al_tobias',
      wer: 'kellnert abends in der Gaststätte am Markt',
      plan: [
        [ALL, '11:00', '12:00', 'marktmitte', 'kaffee', { p: 0.5, draussen: true }],
        ['234560', '20:30', '20:45', 'gaststaette', 'pause', { p: 0.7, jit: 10 }],
        ['6', '22:30', '23:45', 'marktmitte', 'abend', { p: 0.5 }],
      ],
    },
    {
      id: 'jonas',
      name: 'Jonas',
      ort: 'schleusingen',
      fig: 'vk_m02',
      clips: 'm',
      h: 1.76,
      voice: { g: 'm', age: 17 },
      kleid: 'al_jonas',
      hut: 'basecap',
      wer: 'Schüler, abends mit den anderen am Markt',
      plan: [
        [W, '13:40', '15:00', 'marktmitte', 'abhaengen', { p: 0.5, draussen: true }],
        ['56', '19:00', '22:30', 'marktmitte', 'abhaengen', { p: 0.8 }],
      ],
    },
  ];
  const BY = Object.fromEntries(LEUTE.map(p => [p.id, p]));
  LEUTE.forEach((p, i) => (p.i = i));
  // ---- clothes of the street figures (grenzland/gl_fig.js paints them by body zone; sRGB 0 … 255) ----
  const KLEID = {
    al_anja: {
      ober: [126, 46, 52],
      oberM: 'strick',
      unter: [44, 52, 70],
      unterM: 'stonewash',
      schuh: [52, 40, 34],
      arm: true,
    },
    al_kalle: { ober: [40, 62, 88], unter: [56, 60, 66], schuh: [26, 26, 28], arm: true, kragen: [200, 200, 196] },
    al_andi: {
      ober: [86, 98, 66],
      oberM: 'steppquer',
      unter: [70, 64, 52],
      unterM: 'cord',
      schuh: [40, 34, 28],
      arm: true,
    },
    al_lea: { ober: [224, 196, 70], unter: [40, 46, 60], unterM: 'stonewash', schuh: [236, 236, 232], arm: true },
    al_max: { ober: [36, 38, 42], unter: [80, 92, 116], unterM: 'stonewash', schuh: [210, 40, 40], arm: true },
    al_baerbel: {
      ober: [120, 92, 120],
      oberM: 'blumen',
      unter: [70, 66, 74],
      schuh: [50, 40, 34],
      rock: 0.36,
      arm: true,
    },
    al_rainer: { ober: [112, 100, 80], unter: [64, 62, 60], unterM: 'cord', schuh: [44, 32, 24], arm: true, rock: 0.3 },
    al_sabine: { ober: [60, 72, 96], unter: [38, 40, 46], schuh: [30, 26, 24], arm: true, rock: 0.28 },
    al_tobias: { ober: [26, 26, 28], unter: [26, 26, 28], schuh: [20, 20, 20], arm: true, kragen: [236, 236, 232] },
    al_jonas: { ober: [150, 34, 40], unter: [40, 44, 52], unterM: 'stonewash', schuh: [236, 236, 232], arm: true },
  };
  // ---- the calendar of a day: weekday, month, school day, winter ----
  const winterM = m => m >= 10 || m <= 1; // November–February
  const sommerM = m => m >= 3 && m <= 9; // April–October
  // school days: Monday to Friday, without the Christmas holidays (a simple assumption: 23 December to 2 January)
  function schultag(eday) {
    const q = ymd(eday);
    if (q.wd === 0 || q.wd === 6) return false;
    if ((q.m === 11 && q.d >= 23) || (q.m === 0 && q.d <= 2)) return false;
    return true;
  }
  const woche = eday => Math.floor((eday + 3) / 7) % 2 === 0; // even weeks, counted as dorf/dorf_cal.js counts the fire's
  // one entry of a plan on a day: [from, to] in minutes, or null when it does not happen that day
  function slot(p, k, eday) {
    const e = p.plan[k],
      o = e[5] || {},
      q = ymd(eday);
    if (!e[0].includes(String(q.wd))) return null;
    if (o.schule && !schultag(eday)) return null;
    if (o.sommer && !sommerM(q.m)) return null;
    if (o.woche && (o.woche === 'g') !== woche(eday)) return null;
    let p0 = o.p == null ? 1 : o.p;
    const win = winterM(q.m);
    if (o.draussen && win) p0 *= 0.45;
    if (p0 < 1 && hh(eday * 7.13 + p.i * 13.7 + k * 3.1) >= p0) return null;
    const jit = o.jit == null ? 8 : o.jit,
      sh = jit ? Math.round((hh(eday * 3.7 + p.i * 5.3 + k * 11.9) - 0.5) * 2 * jit) : 0;
    let a = hm(e[1]) + sh,
      b = hm(e[2]) + sh;
    // winter: leisure outside is over by half past five, and none begins after it
    if (o.draussen && win) {
      if (a >= 17 * 60 + 30) return null;
      b = Math.min(b, 17 * 60 + 30);
    }
    return b > a ? [a, b] : null;
  }
  // ---- a festival: who goes and when (most of its own village, some of the other; each for a part of the opening) ----
  function festZeit(p, eday, f) {
    if (!f) return null;
    const own = !f.ort || f.ort === p.ort,
      q = own ? 0.8 : 0.3,
      seed = eday * 2.17 + p.i * 7.77 + (f.id || '').length * 1.3;
    if (hh(seed) >= q) return null;
    const len = Math.max(60, f.bis - f.von),
      stay = Math.min(len, 100 + Math.round(hh(seed + 1) * 160)),
      a = f.von + Math.round(hh(seed + 2) * Math.max(0, len - stay));
    return [a, a + stay];
  }
  // ---- where somebody is now: { platz, tun, von, bis, basis, innen, k } ----
  // c: { eday, min, fest: { id, ort, von, bis } | null (a festival open now), basis: { skat, feuer, weg, garten } | null (the base game's
  // village shows this person now – dorf/dorf_cal.js, dorf/dorf_life.js); weg: { tun } may name what one does while away }
  function jetzt(pp, c) {
    const p = typeof pp === 'string' ? BY[pp] : pp;
    if (!p) return null;
    const eday = c.eday,
      m = c.min,
      B = c.basis || {};
    const R = (platz, tun, von, bis, more) =>
      Object.assign({ platz, tun, von, bis, basis: false, innen: !!(ORTE[platz] && ORTE[platz].innen) }, more || {});
    // the base game's village first: out with the car, the Friday evening, the fire, the front garden
    if (B.weg) return R('stadt', B.weg === true ? 'arbeit' : B.weg, m, m + 1, { basis: true, innen: true });
    // a festival open now: who works at a stall is there all the time it is open, the others come for a while
    if (c.fest) {
      const st = Object.keys(c.fest.dienst || {}).find(k => c.fest.dienst[k] === p.id);
      if (st) return R('fest', 'dienst', c.fest.von, c.fest.bis, { fest: c.fest.id, stand: st });
      const z = festZeit(p, eday, c.fest);
      if (z && m >= z[0] && m < z[1]) return R('fest', 'fest', z[0], z[1], { fest: c.fest.id });
    }
    if (B.skat) return R('schule', 'skat', m, m + 1, { basis: true, innen: true });
    if (B.feuer) return R('feuer', 'feuer', m, m + 1, { basis: true, innen: true });
    if (B.garten) return R('daheim', 'garten', m, m + 1, { basis: true, innen: true });
    // (two entries at the same time: the one of fewer weekdays wins – Sunday's church over the bench of every day)
    let best = -1,
      bz = null;
    for (let k = 0; k < p.plan.length; k++) {
      const z = slot(p, k, eday);
      if (z && m >= z[0] && m < z[1] && (best < 0 || p.plan[k][0].length < p.plan[best][0].length)) {
        best = k;
        bz = z;
      }
    }
    if (best >= 0) {
      const e = p.plan[best],
        o = e[5] || {};
      return R(e[3], e[4], bz[0], bz[1], { k: best, ding: o.ding || p.ding || null, pose: o.pose || null });
    }
    return R(p.ort === 'schleusingen' ? 'stadtheim' : 'daheim', 'daheim', m, m + 1);
  }
  // every slot of a person on a day (tests, and the phone's „who is where“ later): [{ von, bis, platz, tun }]
  function tag(pp, eday) {
    const p = typeof pp === 'string' ? BY[pp] : pp;
    const out = [];
    if (!p) return out;
    for (let k = 0; k < p.plan.length; k++) {
      const z = slot(p, k, eday);
      if (z) out.push({ von: z[0], bis: z[1], platz: p.plan[k][3], tun: p.plan[k][4] });
    }
    return out.sort((a, b) => a.von - b.von);
  }
  // ---- what they say ----
  // the time of day for a greeting: morgen (to 10:30), tag, abend (from 17:30)
  const tz = m => (m < 10 * 60 + 30 ? 'morgen' : m < 17 * 60 + 30 ? 'tag' : 'abend');
  // passing by: by the village's opinion of the two (GLRUF.stufe: beliebt | neutral | misstrauisch | verhasst); the gesture with it
  const GRUSS = {
    beliebt: {
      morgen: 'Guten Morgen, ihr zwei!',
      tag: 'Na, ihr beiden? Alles gut?',
      abend: 'Schönen Abend noch!',
      geste: 'winken',
    },
    neutral: { morgen: 'Morgen.', tag: 'Tach.', abend: 'Abend.', geste: 'nicken' },
    misstrauisch: { alle: 'Hm.', geste: 'kopf', weg: false },
    verhasst: { alle: 'Mit euch red ich nicht.', geste: 'abwinken', weg: true },
  };
  function gruss(stufe, zeit) {
    const g = GRUSS[stufe] || GRUSS.neutral;
    return { text: g.alle || g[zeit] || g.tag, geste: g.geste, weg: !!g.weg, tuschel: stufe === 'misstrauisch' };
  }
  // what one is doing → the situation of a line
  const LAGE = {
    einkaufen: 'einkauf',
    warten: 'bus',
    heim: 'bus',
    plaudern: 'pause',
    bank: 'pause',
    handy: 'pause',
    mittag: 'pause',
    kaffee: 'pause',
    stall: 'arbeit',
    hof: 'arbeit',
    huehner: 'arbeit',
    holz: 'arbeit',
    schrauben: 'arbeit',
    geraete: 'arbeit',
    aushang: 'arbeit',
    uebung: 'feuerwehr',
    dienstabend: 'feuerwehr',
    moped: 'arbeit',
    angeln: 'arbeit',
    pause: 'pause',
    kegeln: 'abend',
    grillen: 'abend',
    stammtisch: 'abend',
    abhaengen: 'abend',
    abend: 'abend',
    kirche: 'kirche',
    abendrunde: 'runde',
    fest: 'fest',
    dienst: 'fest',
  };
  // with E: one fixed line per person and situation (sonst: anything else); the dry humour of the village chat
  const SAGT = {
    ingrid: {
      einkauf: 'Ich kaufe nur Brot. Und ich schaue, wer hier wieder falsch parkt.',
      arbeit: 'Neuer Aushang: Die gelbe Tonne kommt morgen. Ich schreibe es so lange hin, bis es alle wissen.',
      pause: 'Unter der Linde erfährt man alles. Meistens zuerst von mir.',
      kirche: 'Sonntags fahre ich zur Kirche nach Schleusingen. Mit Heike, wegen des Benzins.',
      fest: 'Wer hier Müll liegen lässt, kommt in den Dorf-Chat. Mit Foto.',
      sonst: 'Der Deckel der Mülltonne gehört zur Straße. Nur damit das einmal gesagt ist.',
    },
    uwe: {
      arbeit: 'Die Kühe wollen um sechs, nicht um sieben. Die wissen nicht, dass Samstag ist.',
      einkauf: 'Rostbratwurst ist alle? Das war ich nicht.',
      abend: 'Alle Neune! Na gut, sieben. Aber die hab ich alle selbst umgeworfen.',
      fest: 'Die Kirmes ist das einzige Wochenende, an dem keiner fragt, wer es war.',
      sonst: 'Ich war’s nicht. Was auch immer es war.',
    },
    manfred: {
      feuerwehr: 'Übung ist Übung. Wer nicht kommt, bringt Kuchen. Das steht so in der Satzung. Fast.',
      arbeit: 'Ich schaue nur, ob die Schläuche noch alle da sind. Letztes Jahr hatten wir einen zu viel.',
      einkauf: 'Für die Wehr kaufe ich immer zwei Kisten Wasser. Und eine für danach.',
      pause: 'Hast du die Sirene gehört? Läuft wieder wie neu. Erschreckt die halbe Talsperre.',
      fest: 'Heute feiert das Dorf. Und morgen räumt die Wehr auf. Also: noch eine Bratwurst?',
      sonst: 'Wenn es brennt, ruft ihr die 112. Und dann mich. In der Reihenfolge.',
    },
    heike: {
      arbeit: 'Die Hühner legen wieder. Eier gibt’s am Gartentor, das Geld kommt in die Dose.',
      einkauf: 'Suche: Leute, die Kürbis mögen. Biete: Kürbis.',
      pause: 'Kürbissuppe bei mir am Sonntag. Bitte kommt. Wirklich. Bitte.',
      kirche: 'Ich bete jeden Sonntag, dass jemand meine Kürbisse nimmt.',
      sonst: 'Willst du einen Kürbis? Ich habe noch drei.',
    },
    wolfgang: {
      arbeit: 'Brennholz für den Winter. Wer im Herbst friert, hat im Sommer geschlafen.',
      abend: 'Ich sage nur: Transporter an der Klinge. Nachts. Mehr sage ich nicht.',
      fest: 'Der Kirmesbaum ist von mir. Gerade ist er trotzdem nicht.',
      sonst: 'Pilze stehen. Wo, sage ich nicht.',
    },
    katrin: {
      einkauf: 'Heute hat der Wagen Rostbratwurst. Ich sag’s nur, damit ihr es wisst.',
      pause: 'Zwölf Stunden Schicht, und dann fragt mich einer an der Linde nach seinem Blutdruck.',
      fest: 'Wenn einer umkippt, ich bin hier. Aber erst nach meiner Bratwurst.',
      sonst: 'Wer hat bei Radio Grenzland ein Lied ohne Akkordeon gewünscht? Ehrlich jetzt.',
    },
    jens: {
      arbeit: 'Hast du zufällig einen 13er Ringschlüssel? Frage für einen Freund.',
      feuerwehr: 'Übung. Manfred sagt, heute retten wir eine Katze. Wir haben keine Katze.',
      abend: 'Ich schiebe die Kugel, die Kugel schiebt zurück. So ist Kegeln.',
      fest: 'Ich hab heute frei. Außer jemand hat eine Simson, die nicht anspringt.',
      sonst: 'Der Ringschlüssel ist wieder da. Lag im Briefkasten. Ich frage nicht.',
    },
    anja: {
      einkauf: 'Leckerli für Bruno. Er frisst sie unterm Sofa.',
      runde: 'Bruno kommt nicht mit. Seit den Böllern liegt er unterm Sofa. Ich gehe trotzdem.',
      pause: 'Homeoffice heißt: Ich sitze zu Hause und der Hund sitzt unterm Sofa.',
      sonst: 'Bitte keine Böller. Mein Hund hat seit Tagen das Sofa nicht verlassen.',
    },
    kalle: {
      arbeit: 'Die Simson läuft. Fragt nicht, mit welchen Teilen.',
      feuerwehr: 'Ich bin der Jüngste in der Wehr. Ich trage immer die Leiter.',
      abend: 'Grill ist an. Wer Fleisch hat, ist dabei. Wer keins hat, auch.',
      fest: 'Den Kirmesbaum haben wir die ganze Nacht bewacht. Fast die ganze.',
      sonst: 'Bis zur Kirmes sind es nur noch ein paar Wochen. Ich zähle die Tage.',
    },
    andi: {
      einkauf: 'Mais. Für mich. Nicht für die Karpfen. Ehrlich.',
      arbeit: 'Psst. Die beißen gerade. Abends. Ihr habt das nicht von mir.',
      sonst: 'Ich angle nur zur Entspannung. Den Fang poste ich trotzdem.',
    },
    lea: {
      bus: 'Der Bus ist wieder pünktlich. Das ist verdächtig.',
      pause: 'Hier unter der Linde ist das einzige WLAN im Dorf. Also, fast.',
      sonst: 'Mathe ist abgesagt. Ich weiß nicht, ob ich mich freuen soll.',
    },
    max: {
      bus: 'Noch zwei Jahre, dann fahre ich mit der Simson. Dann kann mich der Bus mal.',
      arbeit: 'Kalle zeigt mir, wie man einen Vergaser einstellt. Ich halte die Lampe.',
      pause: 'Lea sagt, hier ist WLAN. Hier ist kein WLAN.',
      sonst: 'Wenn du mal eine Simson verkaufst, ich hab zweihundert Euro. Fast.',
    },
    baerbel: {
      einkauf: 'Zwei Brötchen und das Neueste aus der Stadt. Das Neueste gibt’s gratis.',
      pause: 'Am Markt sieht man alles. Wer mit wem, und wer zu schnell fährt.',
      kirche: 'Ich sitze immer in der dritten Reihe. Seit neunzehnhunderteinundsiebzig.',
      sonst: 'In meinem Alter geht man nicht spazieren. Man kontrolliert die Stadt.',
    },
    rainer: {
      einkauf: 'Früher kosteten die Brötchen fünf Pfennig. Und waren größer. Glaube ich.',
      pause: 'Heute vier Tauben, drei Busse und ein Mann mit Paket. Ein ruhiger Tag.',
      abend: 'Am Stammtisch lösen wir jede Woche die Probleme der Welt. Nächste Woche sind sie wieder da.',
      kirche: 'Ich gehe wegen der Orgel. Und wegen des Kaffees danach.',
      sonst: 'Ich sitze hier seit der Wende. Mit kurzen Pausen.',
    },
    sabine: {
      einkauf: 'Ohne Kaffee öffnet das Bürgerbüro nicht. Also, ich nicht.',
      pause: 'Mittagspause. Wenn Sie einen Ausweis brauchen: ab Viertel eins wieder.',
      sonst: 'Im Bürgerbüro lernt man jeden in der Stadt kennen. Spätestens beim neuen Ausweis.',
    },
    tobias: {
      pause: 'Fünf Minuten Pause. Dann wieder Schnitzel mit Klößen für den ganzen Stammtisch.',
      abend: 'Samstagabend am Markt. Mehr Großstadt geht in Schleusingen nicht.',
      fest: 'Glühwein ist heiß, die Hände sind kalt. Passt doch.',
      sonst: 'Hennebergisch oder Itzgründisch? Bei mir heißt der Kloß einfach Kloß.',
    },
    jonas: {
      abend: 'Wir stehen hier nur. Stehen ist nicht verboten. Hab ich nachgeschaut.',
      fest: 'Kinderpunsch. Weil ich fahre. Mit dem Fahrrad.',
      sonst: 'Bis zum Abi sind es noch zwei Jahre. Bis zum Wochenende drei Tage.',
    },
  };
  // the opinion of the village decides the tone: misstrauisch and verhasst say less (the same for everybody)
  const KURZ = {
    misstrauisch: 'Ich hab keine Zeit. Wirklich nicht.',
    verhasst: 'Lass mich in Ruhe. Ich weiß, was ihr gemacht habt.',
  };
  function ansage(pp, lage, stufe) {
    const p = typeof pp === 'string' ? BY[pp] : pp;
    if (!p) return null;
    if (KURZ[stufe]) return KURZ[stufe];
    const L = SAGT[p.id] || {};
    return L[lage] || L.sonst || null;
  }
  // every fixed line spoken here (the voices are recorded from these): [who, text]
  function linien() {
    const out = [];
    for (const p of LEUTE) {
      const who = 'al_' + p.id;
      for (const t of Object.values(SAGT[p.id] || {})) out.push([who, t]);
      const seen = new Set();
      for (const g of Object.values(GRUSS))
        for (const k of ['morgen', 'tag', 'abend', 'alle'])
          if (g[k] && !seen.has(g[k])) {
            seen.add(g[k]);
            out.push([who, g[k]]);
          }
      for (const t of Object.values(KURZ)) out.push([who, t]);
    }
    return out;
  }
  return {
    ORTE,
    LEUTE,
    BY,
    KLEID,
    GRUSS,
    SAGT,
    KURZ,
    LAGE,
    hm,
    hh,
    ymd,
    schultag,
    winterM,
    slot,
    jetzt,
    tag,
    tz,
    gruss,
    ansage,
    linien,
  };
})();
if (typeof window !== 'undefined') window.GLALDATA = GLALDATA;
