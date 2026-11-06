// ===================== feat/strategie: „Ratscher von oben“ – the data of the strategy mode (STDATA) =====================
// Falko, 5.11.2026 23:11: a strategy game seen from above like Die Siedler 3, Age of Empires 3, Warcraft 3 – the same world, another lens.
// His choices (23:14, 23:24, 23:28): who is there when, power from PV and the generator, real rules and safety, events; Euro with real
// prices; heroes with levels and abilities, ages, the real chains with carriers and stocks, your style shapes the world (Black & White),
// and above all: one learns something real – every rule says why, with its source. Pure data (no imports): docs/features/strategie.md.
// Prices: researched 6.11.2026 (sources in PRICES[k].src); where no source fits, a stated assumption (src begins with „Annahme“).
export const STDATA = (() => {
  // ---- the people: your own (the player figures, game/avatar.js) and the neighbours (npc/*, with their own days) ----
  // skills 1–5: holz (wood: felling, sawing, the workshop), maschinen (machines: engines, repairs, the tractor), garten (garden, animals),
  // bauen (building, carpentry), reden (talking: the village, trade, organising). certs: courses that unlock work (KNOW below).
  const PEOPLE = {
    falko: {
      name: 'Falko',
      short: 'F',
      own: true,
      fig: 'm',
      col: '#d9822b',
      role: 'Holz und Werkstatt (Klingenholz), Forst, Planen',
      skills: { holz: 3, maschinen: 3, garten: 2, bauen: 3, reden: 3 },
      certs: [],
      gear: ['werkstatt'],
    },
    sarah: {
      name: 'Sarah',
      short: 'S',
      own: true,
      fig: 'f',
      col: '#c2457a',
      role: 'Dorf und Kontakte, Atelier, Organisation und Handel',
      skills: { holz: 1, maschinen: 2, garten: 4, bauen: 2, reden: 5 },
      certs: [],
      gear: ['werkstatt'],
    },
    christoph: {
      name: 'Christoph',
      short: 'C',
      own: true,
      fig: 'c',
      col: '#3f7fc4',
      role: 'Technik und Maschinen, Bauen und Handwerk',
      skills: { holz: 2, maschinen: 5, garten: 1, bauen: 4, reden: 2 },
      certs: [],
      gear: ['werkstatt'],
    },
    hubert: {
      name: 'Hubert',
      short: 'H',
      own: false,
      npc: 'hubert',
      col: '#6f8f3a',
      role: 'Traktor, Holz, sein Hof – hilft mit eigenem Willen',
      skills: { holz: 5, maschinen: 4, garten: 3, bauen: 3, reden: 2 },
      certs: ['motorsaege'],
      gear: ['forst', 'werkstatt'],
    },
    ronald: {
      name: 'Ronald',
      short: 'R',
      own: false,
      npc: 'ronald',
      col: '#8a6bb8',
      role: 'Ziegen und Tiere, Mähen',
      skills: { holz: 2, maschinen: 3, garten: 4, bauen: 3, reden: 4 },
      certs: [],
      gear: ['werkstatt'],
    },
  };
  const SKILL = { holz: 'Holz', maschinen: 'Maschinen', garten: 'Garten', bauen: 'Bauen', reden: 'Reden' };

  // ---- heroes (Warcraft 3, Falko 23:20/23:24): experience, levels, abilities with a cooldown (game days), effects on the surroundings ----
  // Abilities are real things a person can do well – no magic: a master piece is more care and time, a village meeting is talking.
  const HEROES = {
    falko: {
      title: 'Holzmacher',
      passive: 'Klingenholz-Ruf: Bestellungen für Schneidebretter zahlen je Stufe 2 % mehr (höchstens 20 %).',
      abilities: [
        {
          id: 'meisterstueck',
          label: 'Meisterstück',
          cd: 7,
          text: 'Das nächste Schneidebrett, das Falko baut, wird einen Stern besser (mehr Zeit für Auswahl, Fugenbild und Schliff: +30 % Arbeitszeit).',
        },
        {
          id: 'planen',
          label: 'Wochenplan',
          cd: 5,
          text: 'Falko plant die Woche: alle Aufträge dieses Wochenendes laufen 10 % schneller (weniger Wege, Werkzeug liegt bereit).',
        },
      ],
    },
    sarah: {
      title: 'Netzwerkerin',
      passive:
        'Freundlich im Dorf: ein Gefallen der Nachbarn kostet weniger; die Stimmung aller steigt, wenn sie da ist.',
      abilities: [
        {
          id: 'dorfversammlung',
          label: 'Dorfversammlung',
          cd: 14,
          text: 'Sarah lädt in die alte Schule ein und gewinnt Helfer: Hubert und Ronald helfen eine Woche lang ohne neuen Gefallen.',
        },
        {
          id: 'handel',
          label: 'Gut verhandelt',
          cd: 7,
          text: 'Beim nächsten Verkauf oder Einkauf 10 % besser (Sarah kennt die Leute und vergleicht Angebote).',
        },
      ],
    },
    christoph: {
      title: 'Techniker',
      passive: 'Maschinen laufen länger: weniger Ausfälle, solange Christoph sie wartet; Bauaufträge 15 % schneller.',
      abilities: [
        {
          id: 'notreparatur',
          label: 'Notreparatur',
          cd: 5,
          text: 'Eine kaputte Maschine läuft sofort wieder (Christoph findet den Fehler: Riemen, Zündkerze, Vergaser).',
        },
      ],
    },
    hubert: {
      title: 'Nachbar mit Traktor',
      passive: 'Kennt den Wald: wo er fällt, liegt der Baum, wo er soll (bessere Stämme, weniger Bruch).',
      abilities: [],
    },
    ronald: {
      title: 'Ziegenhalter',
      passive: 'Seine Ziegen halten die Böschung kurz – die Wiese am Bach braucht keinen Mäher.',
      abilities: [],
    },
  };
  // experience: one point per minute of work, more for hard work; level n needs 300·(n−1)² points (level 2 after 5 h, 3 after 20 h, …)
  const XP_LEVEL = n => 300 * (n - 1) * (n - 1);

  // ---- places of the playing field (positions are taken from the world at runtime, these are the fallbacks; site metres) ----
  const PLACES = {
    werkstatt: { name: 'Werkstatt Klingenholz', icon: '⚒', pos: [0.8, -35.2], r: 7 },
    holzlager: { name: 'Holzlager', icon: '▤', pos: [-1.5, -24.6], r: 4 },
    garage: { name: 'Alte Garage', icon: '⌂', pos: [2, 2], r: 4 },
    garten: { name: 'Garten (Rasen)', icon: '✿', pos: [4.5, 9], r: 9 },
    klinge: { name: 'Die Klinge (Familienwald)', icon: '♣', pos: [-579, -590], r: 40 },
    hubert: { name: 'Huberts Hof', icon: '⌂', pos: [-15, 26], r: 8 },
    ronald: { name: 'Ronalds Hof und Ziegen', icon: '⌂', pos: [17, -1.4], r: 8 },
    bungalow: { name: 'Bungalow', icon: '⌂', pos: [9.8, 14.7], r: 3 },
  };

  // ---- prices (Euro, incl. VAT), with their source or the assumption ----
  const PRICES = {
    benzin: { eur: 2.11, unit: 'l', label: 'Benzin (Super E10)', src: 'ADAC, Monatsmittel Oktober 2026: 2,114 €/l' },
    diesel: { eur: 2.26, unit: 'l', label: 'Diesel', src: 'ADAC, Monatsmittel Oktober 2026: 2,261 €/l' },
    alkylat: {
      eur: 5.2,
      unit: 'l',
      label: 'Sonderkraftstoff (Alkylat, 2-Takt) für die Motorsäge',
      src: 'Annahme: Fachhandel 2026, 5-l-Kanister um 26 €',
    },
    kettenoel: { eur: 4.6, unit: 'l', label: 'Bio-Kettenöl', src: 'Annahme: Fachhandel 2026, 5 l um 23 €' },
    leimholz: {
      eur: 64,
      unit: 'Platte',
      label: 'Leimholzplatte Eiche 40 × 400 × 1000 mm, durchgehende Lamelle',
      src: 'Annahme: Holzhandel 2026, etwa 160 €/m²',
    },
    lieferung: { eur: 25, unit: 'Fahrt', label: 'Lieferung Holzhandel', src: 'Annahme: Pauschale im Umkreis' },
    brett: {
      eur: 159,
      unit: 'Stück',
      label: 'Schneidebrett Eiche, Stirnholz, ca. 40 × 30 × 4 cm, handgemacht',
      src: 'Annahme: übliche Preise handgemachter Stirnholzbretter 2026 (120–250 €)',
    },
    brennholz_fi: {
      eur: 110,
      unit: 'rm',
      label: 'Brennholz Fichte, 33 cm, ofenfertig',
      src: 'TFZ Bayern, Erhebung Juli 2026: 109,83 €/rm (Buche 144,66 €/rm), frei Haus',
    },
    brennholz_frisch: {
      eur: 80,
      unit: 'rm',
      label: 'Brennholz Fichte, 33 cm gespalten, frisch (zum Selbsttrocknen)',
      src: 'Annahme: zwischen frischem Meterholz ab Hof (~75 €/rm) und ofenfertigem (TFZ Bayern Juli 2026: 109,83 €/rm)',
    },
    brennholz_m: {
      eur: 75,
      unit: 'rm',
      label: 'Brennholz Fichte, 1-m-Scheite, frisch (ab Hof)',
      src: 'Annahme: deutlich unter ofenfertig (nicht gesägt, nicht getrocknet)',
    },
    rundholz_fi: {
      eur: 95,
      unit: 'fm',
      label: 'Fichte Stammholz B/C ab Waldweg (zum Vergleich)',
      src: 'Annahme: Rundholzpreise 2026 für Fichte B/C um 90–100 €/fm',
    },
    psa_forst: {
      eur: 390,
      unit: 'Satz',
      label:
        'Forst-Schutzausrüstung: Helm mit Visier und Gehörschutz, Schnittschutzhose Klasse 1, Schnittschutzstiefel, Handschuhe',
      src: 'Annahme nach Fachhandelspreisen 2026: Helmkombination ~70 €, Schnittschutzhose ~150 €, Stiefel ~150 €, Handschuhe ~20 €',
    },
    kurs_ms: {
      eur: 290,
      unit: 'Person',
      label: 'Motorsägen-Lehrgang (Modul A und B, 2 Tage)',
      src: 'Annahme: Lehrgänge für Selbstwerber 2026 um 250–350 €',
    },
    kurs_eh: {
      eur: 60,
      unit: 'Person',
      label: 'Erste-Hilfe-Kurs (1 Tag)',
      src: 'Annahme: Hilfsorganisationen 2026 um 50–70 €',
    },
    pv_modul: { eur: 110, unit: 'Stück', label: 'PV-Modul 430 Wp', src: 'Annahme: Modulpreise 2026 um 0,25 €/Wp' },
    speicher: {
      eur: 1290,
      unit: 'Stück',
      label: 'Zweite Powerstation 2 kWh (LiFePO4)',
      src: 'Annahme: Powerstations 2 kWh 2026 um 1100–1500 €',
    },
  };
  // the start: savings set aside for garden and workshop (assumption, adjustable later)
  const START_EUR = 2500;

  // ---- power: two PV modules on the garage roof, a power station, the petrol generator (garden/garage_play.js GEN, 2,8 kW, 12 l) ----
  // Yield: kWh per kWp and day by month in South Thuringia (PVGIS, ~50,5° N, 30° south: about 980 kWh/kWp a year), scaled by the
  // cloud cover (clear: ×1,45, overcast: ×0,25 of the monthly mean).
  const POWER = {
    kwp: 0.86, // 2 × 430 Wp
    kwh: 2.0, // power station, usable
    inverter: 2200, // W continuous
    pvDay: [0.85, 1.55, 2.6, 3.6, 4.0, 4.15, 4.05, 3.6, 2.85, 1.85, 0.95, 0.65],
    genW: 2800,
    genL: 1.1, // litres per hour at load (garden/garage_play.js GEN_BURN)
    src: 'PVGIS (EU JRC) für Südthüringen; Aggregat wie in der Garage (2,8 kW, gut 1 l/h)',
  };
  // machines: what they draw and burn, whether they are loud (the rules below) – real kinds of the machines in the workshop
  const MACHINES = {
    kettensaege: { name: 'Motorsäge', fuel: 'alkylat', lph: 0.6, oil: 0.25, loud: true, db: 105 },
    blockband: { name: 'Blockbandsäge (Benzinmotor 6,5 PS)', fuel: 'benzin', lph: 1.4, loud: true, db: 98 },
    tischkreis: { name: 'Tischkreissäge', w: 2000, loud: true, db: 100 },
    trommel: { name: 'Trommelschleifer (Holzmann)', w: 1500, loud: true, db: 90 },
    maeher: { name: 'Benzin-Rasenmäher', fuel: 'benzin', lph: 1.0, loud: true, db: 94 },
    traktor: { name: 'Traktor mit Seilwinde', fuel: 'diesel', lph: 4.5, loud: true, db: 92 },
    akku: { name: 'Akku-Werkzeug (Laden)', w: 250, loud: false },
  };

  // ---- the rules: every refusal says why, with its source (Falko 23:28: one should learn something real) ----
  const RULES = {
    ruhe_sonntag: {
      text: 'Sonn- und Feiertagsruhe: laute Arbeiten, die man im Dorf hört, sind heute nicht erlaubt.',
      why: 'Sonn- und Feiertage sind als Tage der Arbeitsruhe geschützt; öffentlich bemerkbare, laute Arbeiten sind untersagt – Motorsäge, Rasenmäher, Kreissäge und Aggregat stehen in der Maschinenlärmverordnung.',
      src: 'Thüringer Feiertagsgesetz; 32. BImSchV (Geräte- und Maschinenlärmschutzverordnung) § 7 und Anhang',
    },
    ruhe_nacht: {
      text: 'Ruhezeit: werktags von 20 bis 7 Uhr keine lauten Maschinen nahe am Dorf.',
      why: 'In Wohngebieten dürfen Geräte wie Rasenmäher, Motorsägen und Kreissägen werktags nur von 7 bis 20 Uhr laufen; im Dorf hält man es genauso.',
      src: '32. BImSchV § 7 Abs. 1',
    },
    tageslicht: {
      text: 'Im Wald nur bei Tageslicht.',
      why: 'Bei Dämmerung sieht man weder die Krone noch die Rückweiche; Forstarbeit mit der Motorsäge nur bei ausreichender Sicht.',
      src: 'DGUV Information 214-046 „Sichere Waldarbeiten“',
    },
    lehrgang: {
      text: 'Fällen nur mit Motorsägen-Lehrgang.',
      why: 'Wer mit der Motorsäge im Wald arbeitet, braucht die Sachkunde aus einem Lehrgang (Modul A und B); Forstbetriebe verlangen den Nachweis auch von Selbstwerbern.',
      src: 'DGUV Regel 114-018 „Waldarbeiten“; SVLFG; KWF-Lehrgänge',
    },
    allein: {
      text: 'Nie allein mit der Motorsäge im Wald.',
      why: 'Bei Fällarbeiten muss eine zweite Person in Ruf- und Sichtweite sein, die im Notfall hilft und den Rettungsdienst holt.',
      src: 'DGUV Regel 114-018, Alleinarbeitsverbot bei Fällarbeiten',
    },
    psa_forst: {
      text: 'Es fehlt eine Forst-Schutzausrüstung – in der Forstkiste am Traktor liegt nur eine.',
      why: 'Wer mit der Motorsäge arbeitet oder beim Fällen im Gefahrenbereich steht, trägt Helm mit Visier und Gehörschutz, Schnittschutzhose, Schnittschutzstiefel und Handschuhe – die Fasern der Schnittschutzeinlage blockieren die Kette in Sekundenbruchteilen. Eine zweite Ausrüstung gibt es im Fachhandel (Auftrag in Schleusingen).',
      src: 'DGUV Information 214-046; SVLFG',
    },
    psa_werk: {
      text: 'Gehörschutz und Schutzbrille an Säge und Schleifer, beim Eichenstaub eine FFP2-Maske.',
      why: 'Ab 85 dB(A) ist Gehörschutz Pflicht; Eichen- und Buchenholzstaub gilt als krebserzeugend.',
      src: 'Lärm- und Vibrations-Arbeitsschutzverordnung; TRGS 553 „Holzstaub“',
    },
    sturm: {
      text: 'Bei Sturm nicht in den Wald.',
      why: 'Ab Windstärke 6–7 brechen Äste und kippen angeschobene Bäume; Waldarbeit ruht, bis der Wind nachlässt.',
      src: 'DGUV Information 214-046; Forstbetriebe: Arbeitsverbot bei Sturm',
    },
    nass_maehen: {
      text: 'Nasses Gras mäht man nicht.',
      why: 'Nasses Gras verklebt das Mähwerk, reißt statt zu schneiden, und auf nassem Hang rutscht man unter den Mäher.',
      src: 'Bedienungsanleitungen der Hersteller; SVLFG Merkblatt Rasenmäher',
    },
    regen_saege: {
      text: 'Bei Regen läuft die Bandsäge nicht im Freien.',
      why: 'Nasse Rollen lassen das Band rutschen, das Sägemehl verklebt, und der Benzinmotor steht im Regen.',
      src: 'Annahme nach Herstellerhinweisen kleiner Blockbandsägen',
    },
    saftruhe: {
      text: 'Gefällt wird am besten im Winter, in der Saftruhe.',
      why: 'Von Oktober bis Februar führt der Baum wenig Saft: das Holz reißt weniger, wird seltener blau und trocknet gleichmäßiger.',
      src: 'Forstliche Praxis; Holzforschung zu Fällzeitpunkt und Bläue',
    },
    nachts_daheim: {
      text: 'Nachts sind Hubert und Ronald daheim.',
      why: 'Von 22 bis 6 Uhr schlafen sie – auch Nachbarn haben Feierabend.',
      src: 'Ihre Tage im Spiel (npc/hours.js)',
    },
    verletzt: {
      text: 'Verletzt – ein paar Tage Pause.',
      why: 'Nach einem Arbeitsunfall heilt erst die Verletzung; wer zu früh wieder an die Säge geht, verletzt sich erneut.',
      src: 'DGUV; SVLFG',
    },
    weg: {
      text: 'Nicht vor Ort.',
      why: 'Ihr seid nur am Wochenende, an Feiertagen und im Urlaub im Garten.',
      src: 'Falkos Wahl (5.11.2026): wer wann da ist, ist ein Kern des Spiels',
    },
  };

  // ---- knowledge and upgrades (the tech tree: courses, machines, stages – Falko 23:28) ----
  const KNOW = {
    motorsaege: {
      kind: 'kurs',
      title: 'Motorsägen-Lehrgang (Modul A und B)',
      days: 2,
      price: 'kurs_ms',
      text: 'Zwei Tage: Technik und Wartung der Säge, Schnitttechniken, Fällen schwacher Bäume unter Anleitung, Erste Hilfe bei Schnittverletzungen.',
      src: 'KWF / DGUV Information 214-059',
      unlocks: 'Bäume fällen',
    },
    ersthilfe: {
      kind: 'kurs',
      title: 'Erste-Hilfe-Kurs',
      days: 1,
      price: 'kurs_eh',
      text: 'Neun Unterrichtseinheiten: Wunden versorgen, Notruf, stabile Seitenlage, Wiederbelebung.',
      src: 'DGUV Vorschrift 1, Ersthelfer',
      unlocks: 'weniger Ausfalltage nach einem Unfall',
    },
    pv2: {
      kind: 'maschine',
      title: 'Zwei weitere PV-Module',
      price: 'pv_modul',
      n: 2,
      text: 'Doppelte Solarleistung auf dem Garagendach – mehr Sägen ohne Aggregat.',
      src: 'Balkonkraftwerk-Regeln (bis 800 W Einspeisung); hier Inselbetrieb an der Powerstation',
      unlocks: '1,7 kWp',
    },
    speicher2: {
      kind: 'maschine',
      title: 'Zweite Powerstation',
      price: 'speicher',
      text: 'Doppelte Speicherkapazität: der Sonnentag reicht bis in den Abend.',
      src: 'Herstellerangaben LiFePO4-Powerstations',
      unlocks: '4 kWh Speicher',
    },
    halle: {
      kind: 'stufe',
      title: 'Werkstatthalle mit Trockenschrank (Bauphase 1)',
      text: 'Die Halle statt des Pultdachs: Trockenschrank, Leimtisch, Räucherzelt, Dickenhobel.',
      src: 'Bauphasen des Gartens (pavilion/phases.js)',
      unlocks: 'Bretter auf 9 % trocknen, mehr Maschinen',
    },
  };

  // ---- ages (Age of Empires, Falko 23:24): the construction phases of garden and workshop as ages that unlock possibilities ----
  const AGES = [
    { from: 0, name: 'Der Garten von heute', text: 'Alte Garage, Werkstatt unter dem Pultdach, Wiese.' },
    {
      from: 1,
      name: 'Werkstatt und Bauplatz',
      text: 'Die Halle mit Trockenschrank, die Garage am Südende, der Platz für den Pavillon.',
    },
    { from: 2, name: 'Der Pavillon entsteht', text: 'Abdichtung, Schwellen, Ständerwerk – Bauphase für Bauphase.' },
  ];

  // ---- your style (Black & White, Falko 23:24): caring or reckless – a measure of the whole world, no magic ----
  const STYLE = {
    min: -100,
    max: 100,
    levels: [
      [-60, 'rücksichtslos'],
      [-20, 'eilig'],
      [20, 'ordentlich'],
      [60, 'fürsorglich'],
      [101, 'vorbildlich'],
    ],
    text: 'Wie du arbeitest, prägt das Dorf, die Natur und dein Ansehen: Ruhezeiten, faire Preise, schonend fällen, helfen.',
  };

  // ---- the first chapter (plan section 6: Der Garten, Bauphase 0) and the first order (brief: 5 Schneidebretter Eiche) ----
  const CHAPTERS = [
    {
      id: 'k1',
      title: 'Kapitel 1 · Der Garten',
      text: 'Aufräumen, mähen, die Werkstatt ans Laufen bringen – und die ersten Schneidebretter aus gekauftem Eichenholz.',
    },
    {
      id: 'k2',
      title: 'Kapitel 2 · Das eigene Holz',
      text: 'Lehrgang, der Förster markiert, Fällen im Winter, rücken, sägen, Trockenstapel – im nächsten Jahr die ersten Bretter aus der Klinge.',
    },
  ];
  const ORDER0 = {
    id: 'bretter5',
    title: '5 Schneidebretter Eiche',
    who: 'eine Kundin aus Suhl',
    n: 5,
    sp: 'Eiche',
    minStars: 3,
    days: 21,
    text: 'Fünf Stirnholzbretter aus Eiche, mindestens drei Sterne, in drei Wochen – Weihnachtsgeschenke.',
  };

  // ---- presence: when your people are in the garden (Falko's choice: weekends and holidays, Friday evening to Sunday) ----
  const PRESENCE = {
    arrive: 19 * 60 + 30, // Friday (or the day before a holiday) – after work and the drive
    leave: 16 * 60, // Sunday (or the last day off) – home in time for the week
    work: [8 * 60, 19 * 60], // working hours of the people on site
    npc: [7 * 60 + 30, 18 * 60], // the neighbours help by day; Saturday too, Sunday not
  };
  return {
    PEOPLE,
    SKILL,
    HEROES,
    XP_LEVEL,
    PLACES,
    PRICES,
    START_EUR,
    POWER,
    MACHINES,
    RULES,
    KNOW,
    AGES,
    STYLE,
    CHAPTERS,
    ORDER0,
    PRESENCE,
  };
})();
