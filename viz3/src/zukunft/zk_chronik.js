// ===================== feat/zeitreise 1: the chronicle of the worlds – events, states, numbers and voices of the Zeitreise (ZKCHRONIK) =====================
// Falko, 13.11.2026: „wie wirklich ein immersives Zeitsprunggefühl entstehen kann, sodass man tatsächlich aus verschiedenen Perspektiven
// mitbekommt, wie sich etwas verändert“. The single source of content for the Zeitreise (Stufe 1: „Allein im Sturm“ against „Gewappnet“,
// both with the heavy climate; chapters Wald, Wasser, Energie, 2026–2060). Pure data and pure functions – no DOM, no three.js (unit test
// viz3/test/unit/zeitreise.test.mjs). The regie (zk_regie*.js) plays events(w) and passes the time to state(w, yf); the world
// (zk_zeitwelt*.js) draws the state; the workshop (zk_workshop*.js) shows titles, lines, the kpi() cards and the questions.
// Contract v1: docs/plans/auftraege/zeitreise-gemeinsam.md; decisions, sources and refinements: docs/features/zeitreise-chronik.md.
// - Time is a float year yf = y + (doy − 1 + hour / 24) / days(y) (yf(), date()). An event's phase 0..1 covers `dur` hours from its start
//   (at(ev, p), phase(ev, yf)); during a halt the regie passes at(ev, p) to state() – the water rises, the lights go out.
// - Chapters play one after another, each through its own years [from, to] (each starts „heute“, 2026); events(w) is in playback order
//   (chapter, then time). Events with the same id in both worlds of the pair happen at the same moment (y, doy, hour, place, halt, weather,
//   dur identical) – the split halts once; `same: true` means title, text and lines are identical as well (show them once).
// - Honest rules as in zk_data.js (whose sources and money format are reused): ranges, sources, „Annahme“ where nothing better exists;
//   event years are examples („ein mögliches Jahr“); only the invented villagers speak. Curves for shares, steps only for built things.
import { ZKDATA } from './zk_data.js';

export const ZKCHRONIK = (() => {
  const SPAN = [2026, 2060];
  // ---------- small helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ss = (t, a, b) => {
    const x = clamp((t - a) / (b - a));
    return x * x * (3 - 2 * x);
  };
  // 0 before a, up to 1 at b, 1 until c, down to 0 at d
  const pulse = (t, a, b, c, d) => ss(t, a, b) * (1 - ss(t, c, d));
  const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = y => (leap(y) ? 366 : 365);
  const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const doyOf = (y, m, d) => CUM[m - 1] + d + (m > 2 && leap(y) ? 1 : 0);
  // float year ⇄ calendar
  const yf = (y, doy = 1, hour = 0) => y + (doy - 1 + hour / 24) / days(y);
  function date(t) {
    const y = Math.floor(t),
      d = (t - y) * days(y),
      doy = Math.floor(d) + 1;
    return { y, doy, hour: (d - (doy - 1)) * 24 };
  }
  // hours from the float year a to b (b may lie in the next year)
  const hours = (a, b) => (b - a) * days(Math.floor(a)) * 24;
  const dec = (v, n = 0) => v.toFixed(n).replace('.', ',');
  const round = (v, n = 0) => Math.round(v * 10 ** n) / 10 ** n;

  // ---------- the worlds: the scenario cross (climate mild ↔ heftig × the village acts together ↔ each for themselves) ----------
  const WORLDS = {
    allein: {
      id: 'allein',
      title: 'Allein im Sturm',
      klima: 'heftig',
      handeln: 'jeder',
      claim: 'Heftiges Klima – und jeder hilft sich selbst.',
      color: '#e8833a',
    },
    gewappnet: {
      id: 'gewappnet',
      title: 'Gewappnet',
      klima: 'heftig',
      handeln: 'gemeinsam',
      claim: 'Heftiges Klima – und das Dorf handelt gemeinsam.',
      color: '#3fa7d6',
    },
    rueckenwind: {
      id: 'rueckenwind',
      title: 'Rückenwind',
      klima: 'mild',
      handeln: 'gemeinsam',
      claim: 'Mildes Klima – und das Dorf handelt gemeinsam.',
      color: '#7cc36e',
      stub: true,
    },
    glueck: {
      id: 'glueck',
      title: 'Glück gehabt',
      klima: 'mild',
      handeln: 'jeder',
      claim: 'Mildes Klima – und jeder hilft sich selbst.',
      color: '#e3c94b',
      stub: true,
    },
  };
  const PAIRS = [['allein', 'gewappnet']];
  // the places (the regie owns the camera poses; heizhaus, windrad, kahlflaeche and strasse come from ZKZEITWELT.place)
  const PLACES = {
    anger: 'Am Anger bei der Dorflinde',
    hang: 'Am Hang über dem Dorf',
    waldrand: 'Am Waldrand an der Klinge',
    kahlflaeche: 'Auf der Käferfläche',
    strasse: 'In der Straße am Bach',
    bruecke: 'An der Schleusebrücke',
    heizhaus: 'Am Heizhaus',
    windrad: 'Auf der Käferfläche am Kamm',
    schule: 'An der alten Schule',
  };
  // the speakers (the game's invented villagers, viz3/src/dorf/dorf_text.js; ages of 2026 – they grow older in the futures)
  const WHO = {
    gerhard: { name: 'Gerhard', born: 1954, role: 'Dorfchronist' },
    manfred: { name: 'Manfred', born: 1970, role: 'Wehrführer' },
    wolfgang: { name: 'Wolfgang', born: 1967, role: 'Waldarbeiter' },
    uwe: { name: 'Uwe', born: 1980, role: 'Landwirt' },
    katrin: { name: 'Katrin', born: 1987, role: 'Pflegerin' },
    ingrid: { name: 'Ingrid', born: 1968, role: 'Ortsteilbürgermeisterin' },
    jens: { name: 'Jens', born: 1992, role: 'Feuerwehr, später Wehrführer' },
    heike: { name: 'Heike', born: 1979, role: 'Gemüsegarten und Hühner' },
  };

  // ---------- sources (title, link) – the first version's where they fit ----------
  const Z = ZKDATA.SRC;
  const SRC = {
    rekis: Z.rekis,
    klimaatlas: Z.klimaatlas,
    waldbericht: Z.waldbericht,
    forst: Z.forst,
    bwi: Z.bwi,
    waldwissen: Z.waldwissen,
    kostra: Z.kostra,
    dez23: Z.dez23,
    uesg: Z.uesg,
    hnz: Z.hnz,
    wpg: Z.wpg,
    eeg6: Z.eeg6,
    laenderbet: Z.laenderbet,
    behg: Z.behg,
    mastr: Z.mastr,
    thueringen: [
      'top agrar (29.04.2025) nach der Landesforstverwaltung: 127 000 von 550 000 ha Wald in Thüringen (23 %) müssen neu bewaldet werden',
      'https://www.topagrar.com/jagd-und-wald/news/23-der-walder-in-thuringen-kaputt-warum-anpflanzungen-nicht-reichen-werden-20013899.html',
    ],
    birke: [
      'LWF Bayern, Wissen 28: Vom Pionier zum Furnier – die Birke wächst früh schnell und lässt nach 10–12 Jahren im Höhenwuchs nach',
      'https://www.lwf.bayern.de/mam/cms04/waldbau-bergwald/dateien/w28_vom_pionier_zum_furnier-waldbauliche_behandlung_der_birke.pdf',
    ],
    kostra2: [
      'DWD KOSTRA-DWD-2020, Rasterfeld bei Ratscher: 60 Minuten – 47,5 mm einmal in 100 Jahren (±26 %), 29,9 mm in 10 Jahren, 15,9 mm jährlich',
      'https://opendata.dwd.de/climate_environment/CDC/grids_germany/return_periods/precipitation/KOSTRA/KOSTRA_DWD_2020/',
    ],
    elementar: [
      'Versicherungsbote: In Thüringen kann über die Hälfte der Hausbesitzer bei Hochwasser und Starkregen nicht mit einer Versicherung rechnen',
      'https://www.versicherungsbote.de/id/4824152/Elementarschaden-Wohngebaeude-Versicherungsschutz-GDV/',
    ],
    schloeben: [
      'Agentur für Erneuerbare Energien: Bioenergiedorf Schlöben eG (gegründet 2009; 6 km Wärmenetz, 550-kW-Hackschnitzelkessel, 6,6 ct/kWh für Mitglieder, Holz aus höchstens 15 km)',
      'https://www.unendlich-viel-energie.de/media/file/4161.210301_ReWA_Steckbrief_Schloeben.pdf',
    ],
    feldheim: [
      'Land Brandenburg: Neue Energien Forum Feldheim – das energieautarke Dorf',
      'https://mil.brandenburg.de/sixcms/media.php/9/NEF_Feldheim.pdf',
    ],
    hormus: [
      'ZDFheute (03.03.2026): Iran-Krieg treibt Öl- und Spritpreise – Heizöl binnen Tagen rund 25 % teurer, die Straße von Hormus eingeschränkt',
      'https://www.zdfheute.de/wirtschaft/iran-krieg-wirtschaft-oelpreise-spritpreise-benzin-diesel-100.html',
    ],
    hackschnitzel: [
      'waldwissen.net: Energiegehalt von Hackschnitzeln (Nadelholz trocken 5,4 kWh/kg; Fichte rund 380 kg je Festmeter, also etwa 2 MWh)',
      'https://www.waldwissen.net/de/waldwirtschaft/holz-und-markt/holzenergie/energiegehalt-von-hackschnitzeln',
    ],
    enwg42c: [
      '§ 42c EnWG: Gemeinsame Nutzung von Strom aus Erneuerbaren (Energy Sharing, seit 1.6.2026)',
      'https://www.gesetze-im-internet.de/enwg_2005/__42c.html',
    ],
    bverfg: [
      'Bundesverfassungsgericht, Beschluss vom 27.09.2022, 1 BvR 2661/21: Thüringens ausnahmsloses Verbot von Windrädern im Wald ist nichtig',
      'https://www.bundesverfassungsgericht.de/SharedDocs/Entscheidungen/DE/2022/09/rs20220927_1bvr266121.html',
    ],
    windbeteilg: [
      'Thüringer Gesetz über die Beteiligung von Gemeinden an Windparks (2.7.2024): Beteiligung der Gemeinden wie § 6 EEG, sonst Ausgleichsabgabe 0,5 ct/kWh',
      'https://umwelt-online.de/recht/allgemei/laender/th/windbeteilg.htm',
    ],
    regionalplan: [
      'Regionalplan Südwestthüringen, 2. Entwurf (Beschluss vom 25.03.2026): 40 Vorranggebiete Windenergie (Bericht vom 18.05.2026)',
      'https://www.berliner-zeitung.de/article/suedthueringen-landratsamt-hildburghausen-informiert-zu-windkraft-vorranggebieten-10036812',
    ],
    koepenick: [
      'Tagesspiegel: Blackout in Köpenick 2019 – rund 31 Stunden ohne Strom nach einem Kabelschaden',
      'https://www.tagesspiegel.de/berlin/blackout-koepenick-der-groesste-und-laengste-stromausfall-in-berlin-seit-jahrzehnten/24019418.html',
    ],
    muensterland: [
      'wetter.com: Münsterländer Schneechaos 25.11.2005 – 250 000 Menschen ohne Strom, viele tagelang, in Ochtrup teils zwei Wochen',
      'https://www.wetter.com/magazin/bis-zu-zwei-wochen-ohne-strom-so-verheerend-war-das-muensterlaender-schneechaos_aid_5fbe4ebeb95fd92aa362dd12.html',
    ],
    berlin26: [
      'ingenieur.de (08.01.2026): Berlin, 3.–7. Januar 2026 – Brandanschlag, rund 45 000 Haushalte und 2 200 Betriebe vier Tage ohne Strom',
      'https://www.ingenieur.de/technik/fachbereiche/energie/vier-tage-ohne-strom-was-der-berliner-blackout-ueber-unsere-netze-verraet/',
    ],
    dorf: ['Ratscher: rund 120 Einwohner, 55 Haushalte (Annahme des Spiels, wie in der ersten Fassung)', null],
    annahme: ['Annahme der Chronik (Überschlag, siehe „Warum?“)', null],
  };

  // ---------- the chapters ----------
  const CHAPTERS = [
    {
      id: 'wald',
      title: 'Wald',
      sub: 'Der Käfer und die Hänge',
      from: 2026,
      to: 2050,
      hour: 14, // the time of day of the time-lapse (stable light; events bring their own)
      places: ['anger', 'hang', 'waldrand', 'kahlflaeche', 'schule'],
      questions: [
        'Wem gehört der Wald um Ratscher – und wer entscheidet, was nach dem Käfer kommt?',
        'Was würden Sie mit Ihrem Stück Wald tun, wenn die Fichten sterben – allein oder mit anderen?',
      ],
    },
    {
      id: 'wasser',
      title: 'Wasser',
      sub: 'Starkregen und Hochwasser',
      from: 2026,
      to: 2050,
      hour: 12,
      places: ['bruecke', 'hang', 'strasse'],
      questions: [
        'Wo im Dorf steht bei Starkregen zuerst Wasser – und wer weiß das heute schon?',
        'Was darf Vorsorge kosten, die man im besten Fall nie braucht?',
      ],
    },
    {
      id: 'energie',
      title: 'Energie',
      sub: 'Wärme, Strom und die Nacht ohne Strom',
      from: 2026,
      to: 2060,
      hour: 15,
      places: ['anger', 'schule', 'strasse', 'heizhaus', 'windrad'],
      questions: [
        'Was müsste passieren, damit Sie Wärme oder Strom gemeinsam mit den Nachbarn machen?',
        'Wohin würden Sie in einer Winternacht ohne Strom gehen – und wer bräuchte dann Hilfe?',
      ],
    },
  ];
  const CH = Object.fromEntries(CHAPTERS.map((c, i) => [c.id, i]));

  // ---------- the beats of the chronicle (heavy climate: both worlds) ----------
  // One beat = one moment. Without per-world parts it is the same in both worlds (same: true); with `allein`/`gewappnet` parts the moment
  // is shared but title, text and lines differ; `only` restricts a beat to one world. Lines: [who, text]. Decisions carry a fork for the
  // voting later (Stufe 5): the question, the options and the option this world takes.
  const BEATS = [
    // ===== Wald =====
    {
      id: 'wald-heute',
      ch: 'wald',
      at: [2026, 10, 24, 15],
      kind: 'wandel',
      place: 'anger',
      halt: 10,
      weather: 'heiter',
      title: 'Heute: grüne Hänge',
      text: 'An den Hängen um Ratscher stehen vor allem Fichten. Seit 2018 hat der Borkenkäfer im Harz und im Thüringer Wald ganze Berge kahl gemacht; in Thüringen muss fast ein Viertel des Waldes neu wachsen. Beide Welten haben dasselbe heftige Klima.',
      lines: [
        [
          'gerhard',
          'Seit 2018 sind im Thüringer Wald ganze Berge braun geworden. Bei uns stehen die Fichten noch. Die Frage ist, wie lange.',
        ],
      ],
    },
    {
      id: 'wald-duerre',
      ch: 'wald',
      at: [2027, 8, 6, 15],
      kind: 'wandel',
      place: 'hang',
      halt: 9,
      weather: 'klar',
      title: 'Ein Dürresommer',
      text: 'Ein mögliches Jahr: Wochen ohne Regen, Hitze über 35 Grad. Früher gab es hier etwa einen heißen Tag im Jahr, im heftigen Klima um 2040 schon sieben. Gestresste Fichten bilden kaum Harz, ihre Abwehr gegen den Käfer.',
      lines: [['uwe', 'Seit Mai kein richtiger Regen. Die Gerste war im Juli schon reif, und die Körner sind klein.']],
    },
    {
      id: 'wald-kaefer',
      ch: 'wald',
      at: [2028, 7, 20, 11],
      kind: 'ereignis',
      place: 'waldrand',
      halt: 26,
      weather: 'klar',
      title: 'Der Käfersommer',
      text: 'Am Waldrand: braunes Bohrmehl am Stammfuß, Harztropfen an der Rinde. In einem heißen Sommer wird aus wenigen Käfern ein Heer. Was im Mai befallen wurde, ist im August tot.',
      lines: [
        [
          'wolfgang',
          'Siehst du das braune Mehl am Stamm? Da sitzt der Käfer drin. Die Fichte ist schon tot, sie weiß es nur noch nicht.',
        ],
        ['wolfgang', 'Letztes Jahr waren es drei Bäume. Jetzt ist es der halbe Hang.'],
      ],
    },
    {
      id: 'wald-rot',
      ch: 'wald',
      at: [2028, 9, 12, 15],
      kind: 'wandel',
      place: 'anger',
      halt: 0,
      weather: 'heiter',
      title: 'Rotbraune Hänge',
      text: 'Binnen Wochen färben sich die Kronen an den Hängen rotbraun.',
      lines: [],
    },
    {
      id: 'wald-rat',
      ch: 'wald',
      at: [2028, 10, 20, 19.5],
      kind: 'entscheidung',
      place: 'schule',
      halt: 20,
      weather: 'bedeckt',
      fork: {
        q: 'Räumen und pflanzen die Waldbesitzer gemeinsam?',
        options: ['Gemeinsam: eine Waldgemeinschaft', 'Jeder für sich'],
      },
      allein: {
        pick: 1,
        title: 'Was wird aus dem Wald? Jeder für sich',
        text: 'Im Gemeinderaum der alten Schule treffen sich die Waldbesitzer: viele kleine Parzellen, Erben weit weg, keiner will für den anderen zahlen. Am Ende kümmert sich jeder selbst, wenn er einen Unternehmer findet.',
        lines: [
          ['ingrid', 'Zwanzig Besitzer, zwanzig Meinungen. Ich kann keinen zwingen.'],
          ['wolfgang', 'Dann arbeite ich eben für den, der zuerst anruft. Wer zuletzt dran ist, hat Pech gehabt.'],
        ],
      },
      gewappnet: {
        pick: 0,
        title: 'Was wird aus dem Wald? Gemeinsam',
        text: 'Im Gemeinderaum der alten Schule gründen die Waldbesitzer eine Waldgemeinschaft, ähnlich einer Forstbetriebsgemeinschaft: ein Unternehmer für alle Parzellen, ein Holzplatz, gemeinsame Förderanträge und Pflanzungen.',
        lines: [
          ['ingrid', 'Zwanzig Besitzer, ein Plan. Und das Forstamt hilft beim Antrag.'],
          ['wolfgang', 'Allein kriegt keiner einen Harvester. Zusammen sind wir für die Unternehmer interessant.'],
        ],
      },
    },
    {
      id: 'wald-grau',
      ch: 'wald',
      at: [2029, 4, 25, 14],
      kind: 'wandel',
      place: 'hang',
      halt: 0,
      weather: 'wolkig',
      allein: {
        title: 'Graue Hänge',
        text: 'Über den Winter sind die Nadeln gefallen: graue Stämme, wo im Herbst noch Rot war. Nur wenige Flächen sind geräumt – die Unternehmer haben Wartelisten.',
        lines: [],
      },
      gewappnet: {
        title: 'Kahle Hänge',
        text: 'Den Winter über hat der Harvester einen großen Teil der toten Fichten geholt, bevor die neuen Käfer ausfliegen. Wo geräumt ist, sind die Hänge kahl.',
        lines: [],
      },
    },
    {
      id: 'wald-ernte',
      ch: 'wald',
      at: [2029, 6, 10, 10],
      kind: 'ereignis',
      place: 'waldrand',
      halt: 20,
      weather: 'heiter',
      allein: {
        title: 'Holz für fast nichts',
        text: 'Der Holzmarkt ist voll, Käferholz bringt kaum mehr, als die Ernte kostet. Wer einen Unternehmer bekommt, lässt räumen. Auf vielen kleinen Parzellen bleibt das tote Holz stehen.',
        lines: [
          ['wolfgang', 'Drei Anrufe heute, alle wollen sofort. Der Harvester ist bis zum Herbst ausgebucht.'],
          ['uwe', 'Mein Stück lass ich stehen. Für das, was das Holz bringt, fass ich keine Säge an.'],
        ],
      },
      gewappnet: {
        title: 'Ein Harvester für alle',
        text: 'Die Waldgemeinschaft hat einen Unternehmer für alle Parzellen. Das Stammholz geht gebündelt ans Sägewerk, das schlechte Holz wird gehackt: Hackschnitzel für ein Heizhaus im Dorf.',
        lines: [
          ['wolfgang', 'Zwanzig Parzellen in einem Rutsch. Das gute Holz ins Sägewerk, den Rest hacken wir fürs Dorf.'],
          ['jens', 'Samstags sperren wir die Wege ab, wenn der Harvester arbeitet. Da darf keiner durch.'],
        ],
      },
    },
    {
      id: 'wald-neu',
      ch: 'wald',
      at: [2031, 4, 12, 10],
      kind: 'ereignis',
      place: 'kahlflaeche',
      halt: 20,
      weather: 'heiter',
      allein: {
        title: 'Was von selbst kommt',
        text: 'Auf den geräumten Flächen keimen Birke, Vogelbeere und Salweide – und Brombeere, Gras und Fingerhut. Daneben stehen graue Stämme, die keiner holt.',
        lines: [
          [
            'gerhard',
            'Der Wald kommt wieder, sagen die Förster. Nur anders. Und Holz machen wird hier so bald keiner mehr.',
          ],
        ],
      },
      gewappnet: {
        title: 'Pflanztag',
        text: 'Die Waldgemeinschaft pflanzt mit Nachbarn und Schulklassen: Buche, Traubeneiche, Weißtanne, Bergahorn, in Wuchshüllen gegen das Rehwild. Birke und Vogelbeere, die von selbst kommen, dürfen bleiben.',
        lines: [
          ['ingrid', 'Zweitausend Bäume an einem Samstag. Und hinterher Bratwurst am Holzplatz.'],
          ['wolfgang', 'Was wir heute pflanzen, ernten die Enkel. Aber es wird ein Wald, der mehr aushält.'],
        ],
      },
    },
    {
      id: 'wald-flicken',
      ch: 'wald',
      at: [2038, 6, 20, 16],
      kind: 'wandel',
      place: 'hang',
      halt: 12,
      weather: 'heiter',
      allein: {
        title: 'Ein Flickenteppich',
        text: 'Birkeninseln, Brombeerfelder, dazwischen liegen umgestürzte Stämme kreuz und quer. Die Wege sind kaum begehbar.',
        lines: [
          ['wolfgang', 'Hier haben wir früher Holz gerückt. Jetzt komme ich mit dem Traktor nicht mal mehr rein.'],
        ],
      },
      gewappnet: {
        title: 'Mannshoch und dicht',
        text: 'Die gepflanzten Bäume sind aus den Wuchshüllen gewachsen, Buche und Ahorn mannshoch und höher, Birken dazwischen. Die Hüllen werden eingesammelt.',
        lines: [['jens', 'Die Hüllen kommen jetzt weg. Die Bäume brauchen sie nicht mehr.']],
      },
    },
    {
      id: 'wald-gruen',
      ch: 'wald',
      at: [2048, 9, 10, 15],
      kind: 'wandel',
      place: 'anger',
      halt: 12,
      weather: 'heiter',
      allein: {
        title: 'Ein anderer Wald',
        text: 'Von weitem sind die Hänge grün: Birken, Weiden, Ebereschen, dazwischen Lücken mit Brombeere und Farn. Holz fürs Sägewerk wächst hier die nächsten Jahrzehnte kaum.',
        lines: [['heike', 'Grün ist es wieder. Aber von dem Wald lebt hier keiner mehr.']],
      },
      gewappnet: {
        title: 'Der junge Mischwald',
        text: 'Von weitem sind die Hänge wieder grün, dicht und gemischt: Buche, Eiche, Tanne, Ahorn, dazu Birke. In einigen Jahrzehnten wachsen hier wieder starke Stämme.',
        lines: [['heike', 'Grün ist es wieder. Und diesmal nicht alles eine Sorte.']],
      },
    },
    // ===== Wasser =====
    {
      id: 'wasser-heute',
      ch: 'wasser',
      at: [2026, 11, 5, 11],
      kind: 'wandel',
      place: 'bruecke',
      halt: 12,
      weather: 'bedeckt',
      title: 'Heute: die Schleuse',
      text: 'Im Dezember 2023 stieg die Schleuse nach Tauwetter und Dauerregen stark an. Die Talsperren Schönbrunn und Ratscher hielten um Weihnachten rund 900 000 Kubikmeter zurück.',
      lines: [['manfred', 'Weihnachten 2023 haben wir Sandsäcke gefüllt. Da hat uns die Talsperre gerettet.']],
    },
    {
      id: 'wasser-hang',
      ch: 'wasser',
      at: [2030, 6, 1, 14],
      kind: 'wandel',
      place: 'hang',
      halt: 0,
      weather: 'wolkig',
      allein: {
        title: 'Rinnen im Hang',
        text: 'Auf den kahlen Hängen läuft Regen schneller ab. In den Fahrspuren der Rückemaschinen graben sich Rinnen.',
        lines: [],
      },
      gewappnet: {
        title: 'Bremsen am Hang',
        text: 'Quer gelegte Stämme, Reisig und kleine Mulden an den Waldwegen halten das Wasser am Hang.',
        lines: [],
      },
    },
    {
      id: 'wasser-vorsorge',
      ch: 'wasser',
      at: [2032, 3, 20, 18.5],
      kind: 'ereignis',
      place: 'strasse',
      halt: 18,
      weather: 'wolkig',
      allein: {
        title: 'Ein Merkblatt im Briefkasten',
        text: 'Die Stadt verteilt ein Merkblatt zur Starkregenvorsorge. Ein paar Hausbesitzer bauen eine Rückstauklappe ein, die meisten legen es weg.',
        lines: [
          [
            'katrin',
            'Rückstauklappe, Sandsäcke, Versicherung … Ich bin den ganzen Tag im Dienst. Wann soll ich mich darum kümmern?',
          ],
        ],
      },
      gewappnet: {
        title: 'Das Dorf bereitet sich vor',
        text: 'Mit der Starkregen-Gefahrenkarte geht das Dorf die Straße ab: Mulden und Querrinnen am Hang, Rückstauklappen und Schwellen an den Häusern, mobile Wände und Sandsäcke im Gerätehaus. Die Feuerwehr übt den Ernstfall.',
        lines: [
          [
            'manfred',
            'Wir sind die Straße Haus für Haus abgegangen: Wo läuft das Wasser rein, wer wohnt allein, wer braucht Hilfe?',
          ],
        ],
      },
    },
    {
      id: 'starkregen',
      ch: 'wasser',
      at: [2034, 7, 15, 23 + 40 / 60],
      kind: 'stresstest',
      place: 'strasse',
      halt: 45,
      dur: 4,
      weather: 'starkregen',
      allein: {
        title: 'Die Starkregennacht',
        text: 'Über dem Hang bleibt ein Gewitter hängen: rund 55 Liter Regen je Quadratmeter in einer Stunde, mehr als ein Jahrhundertregen nach heutiger Statistik. Die Warnung kam aufs Handy, aber kaum einer wusste, was tun. Das Wasser schießt vom kahlen Hang in die Straße, Keller laufen voll.',
        cues: [
          [0, 'regen'],
          [0.1, 'donner'],
          [0.45, 'sirene'],
          [0.5, 'blaulicht'],
          [1.2, 'pumpe'],
        ],
        lines: [
          ['manfred', 'Die Sirene! Und das Wasser steht schon in der Straße.'],
          ['katrin', 'Bei uns läuft es durchs Kellerfenster. Wo gibt es Sandsäcke?'],
          ['manfred', 'Keiner geht mehr in den Keller! Strom aus, und raus da.'],
        ],
      },
      gewappnet: {
        title: 'Die Starkregennacht',
        text: 'Über dem Hang bleibt ein Gewitter hängen: rund 55 Liter Regen je Quadratmeter in einer Stunde, mehr als ein Jahrhundertregen nach heutiger Statistik. Die Mulden am Hang bremsen das Wasser, Schwellen und Sandsäcke halten es aus den Häusern.',
        cues: [
          [0, 'regen'],
          [0.02, 'sirene'],
          [0.05, 'blaulicht'],
          [0.1, 'donner'],
          [0.3, 'pumpe'],
        ],
        lines: [
          ['manfred', 'Die Sirene, genau wie geübt. Sandsäcke an die Kellerfenster, die Pumpe an die Senke!'],
          ['katrin', 'Die Warnung kam schon um elf aufs Handy. Bei uns ist die Schwelle drin, es bleibt draußen.'],
        ],
      },
    },
    {
      id: 'starkregen-morgen',
      ch: 'wasser',
      at: [2034, 7, 16, 7.5],
      kind: 'ereignis',
      place: 'strasse',
      halt: 24,
      weather: 'heiter',
      allein: {
        title: 'Der Morgen danach',
        text: 'Schlamm auf der Straße, vor den Häusern Sperrmüll: Sofas, Teppiche, eine Waschmaschine, nasse Kartons. Zwölf Keller standen unter Wasser, zwei Heizungen sind hin.',
        lines: [
          ['uwe', 'Der Schlamm kommt vom kahlen Hang. Ich hab den Traktor geholt und schieb die Straße frei.'],
          ['katrin', 'Die Truhe mit den Fotos, alles nass. Und die Versicherung zahlt nur, wer Elementar hat.'],
        ],
      },
      gewappnet: {
        title: 'Der Morgen danach',
        text: 'Die Straße ist nass, in den Mulden am Hang liegt Schlamm, ein paar Sandsäcke an den Türen. In einem Keller stand Wasser, sonst blieb alles trocken.',
        lines: [
          ['manfred', 'Ein nasser Keller, sonst nichts. Für so eine Nacht haben wir zwei Jahre geübt.'],
          ['uwe', 'Die Mulden am Hang sind voll Schlamm. Den fahre ich heute wieder aufs Feld.'],
        ],
      },
    },
    {
      id: 'wasser-marke',
      ch: 'wasser',
      at: [2034, 8, 12, 11],
      kind: 'wandel',
      place: 'strasse',
      halt: 0,
      weather: 'heiter',
      allein: {
        title: 'Eine neue Marke',
        text: 'An der Hauswand hängt eine neue Marke: 15. Juli 2034.',
        lines: [],
      },
      gewappnet: {
        title: 'Keine neue Marke',
        text: 'An der Hauswand kommt keine neue Marke dazu.',
        lines: [],
      },
    },
    {
      id: 'hochwasser',
      ch: 'wasser',
      at: [2046, 2, 4, 9],
      kind: 'stresstest',
      place: 'bruecke',
      halt: 34,
      dur: 6,
      weather: 'regen',
      allein: {
        title: 'Das große Hochwasser',
        text: 'Tauwetter auf viel Schnee und drei Tage Regen: Die Schleuse steigt höher als im Dezember 2023, fast wie ein hundertjährliches Hochwasser. Im Überschwemmungsgebiet steht Wasser in Kellern und Erdgeschossen, Öltanks schwimmen auf.',
        cues: [
          [0, 'blaulicht'],
          [0.3, 'pumpe'],
          [2, 'oel'],
        ],
        lines: [
          ['jens', 'Der Öltank in der Nummer zwölf ist aufgeschwommen. Jetzt haben wir auch noch Öl im Wasser.'],
          ['uwe', 'So hoch hab ich die Schleuse noch nie gesehen. Mein Vater auch nicht.'],
        ],
      },
      gewappnet: {
        title: 'Das große Hochwasser',
        text: 'Tauwetter auf viel Schnee und drei Tage Regen: Die Schleuse steigt höher als im Dezember 2023, fast wie ein hundertjährliches Hochwasser. Mobile Wände stehen, Öltanks gibt es kaum noch: Wasser in Höfen und Gärten, in wenigen Kellern.',
        cues: [
          [0, 'blaulicht'],
          [0.3, 'pumpe'],
        ],
        lines: [
          ['jens', 'Die Wände stehen seit gestern Abend. Wir haben das Wasser kommen sehen.'],
          ['ingrid', 'Gut, dass kaum noch Öltanks in den Kellern stehen.'],
        ],
      },
    },
    // ===== Energie =====
    {
      id: 'energie-heute',
      ch: 'energie',
      at: [2026, 11, 12, 17.5],
      kind: 'wandel',
      place: 'anger',
      halt: 14,
      weather: 'bedeckt',
      title: 'Heute: Öl und Holz',
      text: 'Die meisten Häuser heizen mit Heizöl oder Holz. 2022 und wieder im März 2026, im Krieg um Iran und die Straße von Hormus, stieg der Ölpreis sprunghaft. Für Heizöl fließen jedes Jahr rund 100 000 Euro aus dem Dorf (Überschlag).',
      lines: [
        [
          'katrin',
          'Für den Tank hab ich dieses Jahr viel mehr bezahlt. Und ich fahre jeden Tag in die Stadt zur Arbeit.',
        ],
      ],
    },
    {
      id: 'energie-eg',
      ch: 'energie',
      at: [2028, 3, 9, 19.5],
      kind: 'entscheidung',
      place: 'schule',
      halt: 22,
      weather: 'bedeckt',
      fork: {
        q: 'Gründen wir eine Energiegenossenschaft?',
        options: ['Ja – Wärme und Strom gemeinsam', 'Nein – jeder sorgt selbst'],
      },
      allein: {
        pick: 1,
        title: 'Eine Genossenschaft? Lieber nicht',
        text: 'Im Gemeinderaum wird über eine Energiegenossenschaft geredet, wie in Schlöben. Viele finden es gut, aber kaum einer will als Erster unterschreiben. Der Abend endet ohne Beschluss.',
        lines: [
          ['ingrid', 'Alle finden es gut, aber keiner will in den Vorstand.'],
          ['uwe', 'Ich bau mir selbst was aufs Scheunendach. Da redet mir keiner rein.'],
        ],
      },
      gewappnet: {
        pick: 0,
        title: 'Die Energiegenossenschaft',
        text: 'Im Gemeinderaum gründen 38 Haushalte eine Energiegenossenschaft (mögliche Zukunft). Vorbild ist Schlöben, wo seit 2009 ein Hackschnitzelkessel das Dorf heizt.',
        lines: [
          ['ingrid', 'Achtunddreißig Unterschriften an einem Abend. Ich hatte mit zehn gerechnet.'],
          ['uwe', 'Ich bringe den Platz für die Hackschnitzel ein. Dafür will ich mitreden.'],
        ],
      },
    },
    {
      id: 'energie-waermeplan',
      ch: 'energie',
      at: [2028, 6, 20, 18],
      kind: 'entscheidung',
      place: 'anger',
      halt: 16,
      weather: 'heiter',
      fork: {
        q: 'Nahwärme für Ratscher?',
        options: ['Ja – ein Heizhaus mit Hackschnitzeln aus dem Käferholz', 'Nein – jedes Haus für sich'],
      },
      allein: {
        pick: 1,
        title: 'Der Wärmeplan: jedes Haus für sich',
        text: 'Der Wärmeplan der Stadt ist fertig, Pflicht bis Mitte 2028. Für Ratscher steht darin: Einzelversorgung. Jedes Haus sucht sich selbst eine neue Heizung.',
        lines: [['katrin', 'Wärmepumpe? In unserem alten Haus? Erst mal läuft der Ölkessel weiter.']],
      },
      gewappnet: {
        pick: 0,
        title: 'Der Wärmeplan: ein Netz',
        text: 'Der Wärmeplan der Stadt ist fertig, Pflicht bis Mitte 2028. Weil sich die Genossenschaft gemeldet hat, ist Ratscher darin ein Gebiet für ein Wärmenetz. Das Käferholz soll das Dorf heizen.',
        lines: [
          ['wolfgang', 'Das Käferholz liegt eh da. Lieber heizen wir damit, als es für ein Butterbrot zu verkaufen.'],
        ],
      },
    },
    {
      id: 'energie-graben',
      ch: 'energie',
      at: [2029, 8, 20, 10],
      kind: 'ereignis',
      place: 'strasse',
      halt: 15,
      weather: 'heiter',
      allein: {
        title: 'Ein Sommer wie immer',
        text: 'In der Dorfstraße ist es ruhig. Hier und da wird eine Wärmepumpe aufgestellt; die meisten lassen den alten Ölkessel noch einmal reparieren.',
        lines: [['katrin', 'Der Monteur sagt, der Kessel hält noch zwei, drei Jahre. Dann sehen wir weiter.']],
      },
      gewappnet: {
        title: 'Der Graben',
        text: 'Die Dorfstraße ist offen: Bagger, Absperrungen, gedämmte Rohre. In jedes angeschlossene Haus kommt eine Übergabestation statt des Ölkessels.',
        lines: [
          ['jens', 'Den ganzen Sommer Baustelle vor der Tür. Aber im Winter haben wir Wärme wie in der Stadt.'],
          ['heike', 'Der Anschluss kostet weniger als ein neuer Ölkessel. Da musste ich nicht lange überlegen.'],
        ],
      },
    },
    {
      id: 'energie-heizhaus',
      ch: 'energie',
      at: [2030, 10, 15, 17],
      kind: 'ereignis',
      place: 'heizhaus',
      halt: 18,
      weather: 'wolkig',
      allein: {
        title: 'Heizsaison',
        text: 'Am Ortsrand ist nichts gebaut. Das Käferholz der Hänge ist für wenig Geld weggefahren. Im Oktober kommt der Öllaster wie jedes Jahr.',
        lines: [['uwe', 'Das Holz ist weg, für ein Butterbrot. Und das Öl kommt von sonst wo.']],
      },
      gewappnet: {
        title: 'Das Heizhaus läuft',
        text: 'Am Ortsrand brennt der Hackschnitzelkessel, im Bunker liegt Käferholz von den eigenen Hängen. Der Öllaster kommt in die angeschlossenen Häuser nicht mehr.',
        lines: [
          ['wolfgang', 'Das Holz vom Hang heizt jetzt das Dorf. So rum ist es richtig.'],
          ['ingrid', 'Vier von fünf Häusern sind angeschlossen. Die anderen kommen noch.'],
        ],
      },
    },
    {
      id: 'energie-wind',
      ch: 'energie',
      at: [2031, 4, 28, 18.5],
      kind: 'entscheidung',
      place: 'windrad',
      halt: 22,
      weather: 'heiter',
      fork: {
        q: 'Ein Windrad auf der Käferfläche?',
        options: ['Ja – als Bürgerwindrad mit dem Dorf', 'Das entscheidet ein Investor'],
      },
      allein: {
        pick: 1,
        title: 'Das Windrad des Investors',
        text: 'Seit 2022 darf Thüringen Windräder im Wald nicht mehr pauschal verbieten. Ein Projektierer pachtet die Käferfläche am Kamm von einem Besitzer. Das Dorf wird nicht gefragt, eine Bürgerinitiative sammelt Unterschriften.',
        lines: [
          ['heike', 'Ich bin nicht gegen Wind. Ich bin dagegen, dass wir nichts davon haben.'],
          ['wolfgang', 'Die Pacht kriegt einer, das Rauschen hören alle.'],
        ],
      },
      gewappnet: {
        pick: 0,
        title: 'Ein Bürgerwindrad',
        text: 'Seit 2022 darf Thüringen Windräder im Wald nicht mehr pauschal verbieten. Genossenschaft und Waldgemeinschaft planen ein Bürgerwindrad auf der Käferfläche: Das Dorf hält Anteile, die Pacht geht an alle Waldbesitzer.',
        lines: [
          ['ingrid', 'Wenn schon ein Windrad, dann eins, das uns mitgehört.'],
          ['wolfgang', 'Die Pacht geht in die Waldgemeinschaft. Davon pflanzen wir die nächsten Hektar.'],
        ],
      },
    },
    {
      id: 'energie-speicher',
      ch: 'energie',
      at: [2032, 10, 21, 19.5],
      kind: 'entscheidung',
      place: 'schule',
      halt: 18,
      weather: 'bedeckt',
      fork: {
        q: 'Ein Dorfspeicher mit Notstrom an der alten Schule?',
        options: ['Ja – die Schule wird der Notfall-Treffpunkt', 'Nein – wer will, kauft sich selbst einen Speicher'],
      },
      allein: {
        pick: 1,
        title: 'Jeder seinen Speicher',
        text: 'Wer es sich leisten kann, kauft einen Heimspeicher für die eigene Solaranlage. Die alte Schule bleibt, wie sie ist.',
        lines: [
          ['heike', 'Wir haben jetzt einen Speicher im Keller. Wenn der Strom ausfällt, haben wenigstens wir Licht.'],
        ],
      },
      gewappnet: {
        pick: 0,
        title: 'Der Dorfspeicher',
        text: 'Neben die alte Schule kommen ein Batteriespeicher und ein Notstromaggregat, aufs Dach Solarmodule, in jedes angeschlossene Haus eine Akkustation für die Heizungspumpe. Fällt der Strom aus, wird die Schule der Notfall-Treffpunkt.',
        lines: [
          ['manfred', 'Wenn alles dunkel ist, wissen die Leute, wo sie hingehen: in die Schule.'],
          ['katrin', 'Und meine Patienten mit Sauerstoffgerät kriegen dort Strom.'],
        ],
      },
    },
    {
      id: 'energie-kran',
      ch: 'energie',
      at: [2033, 7, 10, 14],
      kind: 'wandel',
      place: 'windrad',
      halt: 0,
      weather: 'heiter',
      allein: {
        title: 'Die Fläche wartet',
        text: 'Gegen das Windrad des Investors laufen Klagen. Auf der Käferfläche wachsen Brombeeren.',
        lines: [],
      },
      gewappnet: {
        title: 'Der Kran am Kamm',
        text: 'Zufahrt, Fundament, ein Kran so hoch wie der Turm: Das Bürgerwindrad entsteht.',
        lines: [],
      },
    },
    {
      id: 'energie-wind-dreht',
      only: 'gewappnet',
      ch: 'energie',
      at: [2034, 3, 2, 12],
      kind: 'wandel',
      place: 'windrad',
      halt: 0,
      weather: 'wolkig',
      title: 'Das Bürgerwindrad dreht sich',
      text: 'Das Windrad liefert im Jahr etwa fünfzigmal so viel Strom, wie das Dorf braucht (Überschlag). Ein Teil kommt über Energy Sharing günstiger in die Häuser.',
      lines: [],
    },
    {
      id: 'blackout',
      ch: 'energie',
      at: [2037, 1, 12, 17.25],
      kind: 'stresstest',
      place: 'schule',
      halt: 50,
      dur: 2,
      weather: 'klar',
      allein: {
        title: 'Die Nacht ohne Strom',
        text: 'Eisregen und Sturm haben Leitungen und Masten zerstört, Südthüringen ist ohne Strom, in dieser möglichen Zukunft 30 Stunden. Ohne Strom laufen weder Ölbrenner noch Wärmepumpe. Nur wenige Häuser mit eigenem Speicher haben Licht.',
        cues: [
          [0, 'licht-aus'],
          [0.03, 'stille'],
          [0.5, 'aggregat-feuerwehr'],
        ],
        lines: [
          ['katrin', 'Bei meiner Patientin läuft das Sauerstoffgerät mit Strom. Der Akku hält noch drei Stunden.'],
          [
            'jens',
            'Die Leute kommen zum Gerätehaus, weil sie nicht wissen, wohin. Unser Aggregat reicht für die Pumpen, nicht fürs Dorf.',
          ],
          ['gerhard', 'Wie früher. Nur dass früher jeder einen Ofen hatte.'],
        ],
      },
      gewappnet: {
        title: 'Die Nacht ohne Strom',
        text: 'Eisregen und Sturm haben Leitungen und Masten zerstört, Südthüringen ist ohne Strom, in dieser möglichen Zukunft 30 Stunden. Nach wenigen Minuten brennt Licht in der alten Schule. Das Heizhaus läuft mit Notstrom, Akkustationen treiben die Heizungspumpen.',
        cues: [
          [0, 'licht-aus'],
          [0.03, 'stille'],
          [0.12, 'aggregat'],
          [0.2, 'schule-licht'],
        ],
        lines: [
          ['katrin', 'Wir bringen sie in die Schule. Da läuft ihr Gerät die ganze Nacht.'],
          ['jens', 'Funk steht, die Liste ist durch: Wer allein wohnt, haben wir besucht.'],
          [
            'ingrid',
            'Wie geübt. Das Heizhaus hat Notstrom, und für die Heizungspumpen haben wir Akkustationen verteilt.',
          ],
        ],
      },
    },
    {
      id: 'energie-wind-investor',
      only: 'allein',
      ch: 'energie',
      at: [2039, 3, 2, 12],
      kind: 'wandel',
      place: 'windrad',
      halt: 0,
      weather: 'wolkig',
      title: 'Das Windrad des Investors dreht sich',
      text: 'Nach Jahren vor Gericht dreht sich das Windrad. Die Pacht bekommt ein Besitzer, die Stadt nach dem Landesgesetz 0,2 Cent je Kilowattstunde. Im Dorf kommt wenig an.',
      lines: [],
    },
    {
      id: 'energie-2045',
      ch: 'energie',
      at: [2045, 11, 10, 17],
      kind: 'wandel',
      place: 'anger',
      halt: 12,
      weather: 'bedeckt',
      allein: {
        title: 'Jeder für sich',
        text: 'Ein Teil der Häuser hat Wärmepumpen, andere heizen noch mit Öl, das mit dem CO₂-Preis Jahr für Jahr teurer wird. Das Geld für Energie geht aus dem Dorf.',
        lines: [['katrin', 'Die Heizung ist inzwischen mein größter Posten nach dem Auto.']],
      },
      gewappnet: {
        title: 'Ein Energiedorf',
        text: 'Vier von fünf Häusern hängen an der Nahwärme, auf den meisten Dächern liegen Module, Strom vom Bürgerwindrad kommt über Energy Sharing ins Dorf. Ein guter Teil des Geldes für Energie bleibt im Ort.',
        lines: [['heike', 'Die Genossenschaft hat wieder ausgeschüttet. Davon ist der Spielplatz neu gemacht.']],
      },
    },
    {
      id: 'epilog',
      ch: 'energie',
      at: [2060, 5, 20, 18.5],
      kind: 'ereignis',
      place: 'anger',
      halt: 36,
      weather: 'heiter',
      allein: {
        title: 'Ratscher 2060: Allein im Sturm',
        text: 'Die Dorflinde von 1888 steht noch. Die Hänge sind grün, aber es ist ein anderer Wald, mit Lücken und wenig Holz. An der Hauswand hängen zwei neue Marken. Jeder hat für sich gesorgt, manche gut, manche gar nicht.',
        lines: [
          ['jens', 'Gerhards Chronik schreibe ich jetzt weiter. Die Linde hat alles gesehen.'],
          ['katrin', 'Wir haben jeder für uns durchgehalten. Manche gut, manche gar nicht.'],
        ],
      },
      gewappnet: {
        title: 'Ratscher 2060: Gewappnet',
        text: 'Die Dorflinde von 1888 steht noch. An den Hängen wächst ein junger Mischwald. Die Straße blieb bei den großen Wassern meist trocken. Wärme kommt aus dem Heizhaus, Strom vom Dach und vom Bürgerwindrad.',
        lines: [
          ['jens', 'Gerhards Chronik schreibe ich jetzt weiter. Die Linde hat alles gesehen.'],
          ['katrin', 'Das Klima war nicht gnädiger als anderswo. Aber wir haben es zusammen getragen.'],
        ],
      },
    },
  ];

  // the id of a line's recording: who + FNV-1a of the UTF-8 words in base 36, as tools/voices/linien.mjs makes it – the file is
  // snd/voice/x/<rec>.mp3 of the extra viz3/extra/saetze (window.VOICEX); STIMME.say(who, text) finds it by the words as well
  function fnv(s) {
    let h = 0x811c9dc5;
    for (const c of new TextEncoder().encode(s)) h = Math.imul(h ^ c, 0x01000193) >>> 0;
    return h.toString(36);
  }
  // speech time of a line in seconds (about 2.3 words per second with the recording settings, plus a breath)
  const speak = text => text.split(/\s+/).filter(Boolean).length / 2.3 + 0.8;

  // ---------- events(w): the beats of a world as events in playback order ----------
  const CACHE = {};
  function build(w) {
    const W = WORLDS[w];
    if (!W || W.stub || W.klima !== 'heftig') return [];
    const letter = { allein: 'a', gewappnet: 'g' }[w];
    const out = [];
    for (const b of BEATS) {
      if (b.only && b.only !== w) continue;
      const part = b[w] || null;
      const same = !b.allein && !b.gewappnet && !b.only;
      const src = part || b;
      const [y, m, d, hour] = b.at;
      const doy = doyOf(y, m, d);
      const lines = (src.lines || []).map(([who, text], i) => ({
        id: 'zk-' + b.id + '-' + (same ? 'x' : letter) + (i + 1),
        who,
        text,
        rec: 'x_' + who + '_' + fnv(text),
      }));
      // the halt fits the longer talk of the two worlds (a shared moment halts equally long in both)
      const talk = Math.max(
        ...[b, b.allein, b.gewappnet].map(x => (x && x.lines ? x.lines.reduce((s, l) => s + speak(l[1]), 0) : 0))
      );
      const ev = {
        id: b.id,
        w,
        y,
        doy,
        hour,
        t: yf(y, doy, hour),
        chapter: b.ch,
        kind: b.kind,
        place: b.place,
        title: src.title,
        text: src.text,
        lines,
        halt: b.halt > 0 ? Math.max(b.halt, Math.ceil(talk + 4)) : 0,
        dur: b.dur || 0,
        weather: b.weather || null,
        same,
      };
      ev.cues = ((part && part.cues) || b.cues || []).map(([h, id]) => ({ h, id, p: ev.dur ? clamp(h / ev.dur) : 0 }));
      if (b.fork) ev.fork = { q: b.fork.q, options: b.fork.options.slice(), pick: part ? part.pick : 0 };
      out.push(ev);
    }
    out.sort((a, b) => CH[a.chapter] - CH[b.chapter] || a.t - b.t);
    return out;
  }
  const copy = e => ({
    ...e,
    lines: e.lines.map(l => ({ ...l })),
    cues: e.cues.map(c => ({ ...c })),
    ...(e.fork ? { fork: { ...e.fork, options: e.fork.options.slice() } } : {}),
  });
  const list = w => (CACHE[w] = CACHE[w] || build(w));
  const events = w => list(w).map(copy);
  const find = (w, id) => {
    const e = list(w).find(x => x.id === id);
    return e ? copy(e) : null;
  };
  // the float year of an event's phase p (0..1) and back
  const at = (ev, p) => ev.t + (clamp(p) * (ev.dur || 0)) / (days(ev.y) * 24);
  const phase = (ev, t) => (ev.dur ? clamp(hours(ev.t, t) / ev.dur) : t >= ev.t ? 1 : 0);
  // the moments the states hang on (the same in both heavy-climate worlds)
  const T = {
    rain: yf(2034, doyOf(2034, 7, 15), 23 + 40 / 60),
    flood: yf(2046, doyOf(2046, 2, 4), 9),
    dark: yf(2037, doyOf(2037, 1, 12), 17.25),
  };
  const DARK_H = 30; // hours without power in the blackout (Annahme; Berlin-Köpenick 2019: about 31 h)

  // ---------- the forest: shares of today's spruce area (all visible slopes and the family forest), summing to 1 ----------
  // Beetle attacks per year (share of the spruce area struck in that summer, May–September). Heavy climate: the mass attack in the second hot
  // summer, as in the Harz and the Thuringian Forest since 2018; acting together (quick removal of struck trees before the beetles fly out)
  // saves a little more of the last waves (Annahme). Mild climate (stub): a slower, smaller loss.
  const INC = {
    heftig: {
      jeder: { 2027: 0.08, 2028: 0.55, 2029: 0.27, 2030: 0.05, 2031: 0.02 },
      gemeinsam: { 2027: 0.08, 2028: 0.55, 2029: 0.22, 2030: 0.04, 2031: 0.01 },
    },
    mild: {
      jeder: { 2028: 0.03, 2030: 0.06, 2032: 0.08, 2034: 0.08, 2036: 0.06, 2039: 0.05, 2043: 0.04 },
      gemeinsam: { 2028: 0.03, 2030: 0.05, 2032: 0.06, 2034: 0.05, 2036: 0.04, 2039: 0.03, 2043: 0.02 },
    },
  };
  // how the struck trees are removed: delay after the attack (years), how long it takes, the share that is removed at all
  const CLEAR = {
    gemeinsam: { lag: 0.25, spread: 1.0, k: 0.92 },
    jeder: { lag: 0.9, spread: 2.0, k: 0.62 },
  };
  const MAIN = { heftig: 2028, mild: 2032 }; // the year of the main wave (for the mean age of the young trees)
  function attacked(inc, t) {
    let a = 0;
    for (const y in inc) a += inc[y] * ss(t, +y + 0.36, +y + 0.7);
    return a;
  }
  function removed(inc, c, t) {
    let a = 0;
    for (const y in inc) a += inc[y] * ss(t, +y + 0.36 + c.lag, +y + 0.7 + c.lag + c.spread);
    return c.k * a;
  }
  // height of the young trees (m) by age: planted mixed forest (beech, oak, fir, maple; about 3,5 m after 10 years, 9 m after 20) and
  // pioneers (birch, rowan, willow – fast at first: about 7 m after 10 years) – Annahme after waldwissen.net and ThüringenForst
  const HEIGHT = {
    mischwald: age => 0.4 * ss(age, -0.5, 0.2) + (age <= 0 ? 0 : 0.19 * age + 0.012 * age * age), // planted at about 0,4 m
    pionier: age => (age <= 0 ? 0 : 20 * (1 - Math.exp(-age / 22))),
  };
  function forest(W, t) {
    const gem = W.handeln === 'gemeinsam',
      inc = INC[W.klima][W.handeln],
      c = CLEAR[W.handeln];
    const A = x => attacked(inc, x),
      R = x => removed(inc, c, x);
    const a = A(t - 0.1), // visible: about five weeks from the attack to the first red crowns
      ar = A(t - 0.7), // after about seven months the needles have fallen
      r = R(t);
    const dead = Math.max(0, a - r),
      red = Math.min(Math.max(0, a - ar), dead),
      greyS = dead - red;
    const main = MAIN[W.klima];
    const down = greyS * 0.9 * ss(t, main + 2.5, main + 13); // dead spruces break and fall within about 5–12 years
    const young0 = gem ? 0.85 * R(t - 0.7) + 0.08 * R(t - 3) : 0.7 * R(t - 2.5);
    // slow succession: birch, rowan and spruce seedlings come up between the lying dead wood and, later, through the bramble
    const yDown = down * 0.75 * ss(t, main + 7, main + 24),
      yOpen = (r - young0) * 0.6 * ss(t, main + 10, main + 28);
    const fallen = down - yDown,
      young = young0 + yDown + yOpen;
    const est = gem ? main + 1.98 : main + 4.93; // mean year the young trees took root (planting the spring after removal; pioneers later)
    const regrow = gem ? 'mischwald' : 'pionier';
    const rate = (R(t + 0.05) - R(t - 0.05)) / 0.1;
    return {
      green: 1 - a,
      red,
      grey: greyS - down,
      cleared: r - young0 - yOpen,
      fallen,
      young,
      regrow,
      regrowH: round(HEIGHT[regrow](t - est), 2),
      harvest: clamp(rate / 0.5),
      planted: gem ? 0.85 * R(t - 0.7) : 0.05 * R(t - 3),
    };
  }

  // ---------- the water: the heavy-rain night (strasse) and the big flood (bruecke, strasse) ----------
  const WATER = {
    // peak level in the street (m), mud and bulky waste the morning after, how long until it is cleaned up (hours)
    jeder: { rain: 0.42, flood: 0.6, mud: 0.85, debris: 0.9, clean: [30, 260], fmud: 0.75, fdebris: 0.8 },
    gemeinsam: { rain: 0.1, flood: 0.5, mud: 0.2, debris: 0.05, clean: [10, 60], fmud: 0.45, fdebris: 0.12 },
  };
  function water(W, t) {
    const P = WATER[W.handeln],
      gem = W.handeln === 'gemeinsam',
      heavy = W.klima === 'heftig';
    const prepared = gem ? ss(t, 2032.22, 2033.5) : 0.1 * ss(t, 2032.22, 2036);
    let level = 0,
      mud = 0,
      debris = 0,
      rain = null;
    const marks = [{ y: 2023, h: 0.1 }];
    if (heavy) {
      const h = hours(T.rain, t);
      if (h >= 0 && h < 1.5) rain = 'starkregen';
      level = Math.max(level, P.rain * pulse(h, 0.15, 0.9, 1.6, 4));
      const clean = 1 - ss(h, P.clean[0], P.clean[1]);
      mud = Math.max(mud, P.mud * ss(h, 0.9, 2.5) * clean);
      debris = Math.max(debris, P.debris * ss(h, 5.5, 8.5) * clean);
      if (h > 4 && P.rain >= 0.2) marks.push({ y: 2034, h: P.rain });
      const f = hours(T.flood, t);
      level = Math.max(level, P.flood * pulse(f, -12, 3, 8, 30));
      const fclean = 1 - ss(f, 60, gem ? 200 : 500);
      mud = Math.max(mud, P.fmud * ss(f, 10, 30) * fclean);
      debris = Math.max(debris, P.fdebris * ss(f, 26, 40) * fclean);
      if (f > 30) marks.push({ y: 2046, h: P.flood });
    }
    return { rain, level: round(level, 3), mud, debris, prepared, marks };
  }

  // ---------- the energy: heating house and network, oil truck, chips, the wind turbine, roofs, the village battery, the blackout ----------
  const NET = { trench: yf(2029, doyOf(2029, 8, 1), 7), run: yf(2030, doyOf(2030, 10, 15), 6) };
  const WIND = {
    gemeinsam: [yf(2033, doyOf(2033, 5, 15)), yf(2034, doyOf(2034, 3, 1))],
    jeder: [yf(2038, doyOf(2038, 5, 15)), yf(2039, doyOf(2039, 3, 1))],
  };
  function energy(W, t) {
    const gem = W.handeln === 'gemeinsam',
      heavy = W.klima === 'heftig';
    const fr = t - Math.floor(t);
    const winter = fr > 0.75 || fr < 0.16; // October to February: oil deliveries
    const heatNet = gem ? (t >= NET.run ? 2 : t >= NET.trench ? 1 : 0) : 0;
    const wy = WIND[W.handeln];
    const windrad = t >= wy[1] ? 2 : t >= wy[0] ? 1 : 0;
    // the chip pile: filled from the beetle wood, drawn down over the heating season, smaller once the beetle wood is used up
    const season = 0.5 + 0.5 * Math.cos(2 * Math.PI * (fr - 0.7));
    const chips = gem ? ss(t, 2029.5, 2030.6) * (0.35 + 0.65 * season) * (1 - 0.3 * ss(t, 2033, 2035)) : 0;
    const pvRoof = 0.12 + (gem ? 0.58 * ss(t, 2028, 2040) : 0.23 * ss(t, 2027, 2046));
    const battery = gem ? ss(t, 2033.0, 2033.45) : 0;
    let blackout = null;
    if (heavy) {
      const h = hours(T.dark, t);
      if (h >= 0 && h < DARK_H)
        blackout = { school: gem && h >= 0.2, islands: (gem ? 0.25 : 0.12) * ss(h, 0.01, 0.06) };
    }
    return { heatNet, oilTruck: winter && heatNet < 2, chips, windrad, pvRoof, battery, blackout };
  }

  // ---------- signs from the future (recognisably fictional; the world puts them up) ----------
  const SIGNS = {
    pflanzung: {
      place: 'kahlflaeche',
      text: 'Hier wächst der Wald von morgen · gepflanzt 2031 von der Waldgemeinschaft Ratscher',
    },
    heizhaus: { place: 'heizhaus', text: 'Heizhaus der Energiegenossenschaft Ratscher · Wärme aus Käferholz' },
    windbau: {
      place: 'windrad',
      text: 'Hier entsteht eine Windenergieanlage · Bauherr: Windprojekt Kammlage GmbH & Co. KG',
    },
    buergerwind: { place: 'windrad', text: 'Bürgerwindrad Ratscher · Das Dorf ist beteiligt' },
    notpunkt: { place: 'schule', text: 'Notfall-Treffpunkt Alte Schule · Licht, Wärme, Hilfe bei Stromausfall' },
  };
  const SIGN_NOTE = 'Mögliche Zukunft';
  // cues of the stress tests (ev.cues: [{ h hours after the start, p phase 0..1, id }]) – sound and light for the regie and the world
  const CUES = {
    regen: 'Starkregen setzt ein',
    donner: 'Donner',
    sirene: 'Sirene der Feuerwehr',
    blaulicht: 'Blaulicht der Feuerwehr',
    pumpe: 'Pumpe läuft',
    oel: 'Ölfilm auf dem Wasser',
    'licht-aus': 'Licht geht aus: Straßenlampen, Fenster, der Schein der Städte',
    stille: 'Stille: kein Brummen, kein Kühlschrank',
    aggregat: 'Notstromaggregat an der Schule springt an',
    'schule-licht': 'Licht in der alten Schule',
    'aggregat-feuerwehr': 'Aggregat am Gerätehaus',
  };
  // short notes for the screen (the workshop shows them where they fit)
  const NOTES = {
    jahre: 'Die Jahre der Ereignisse sind Beispiele – ein mögliches Jahr, keine Vorhersage.',
    zukunft: 'Mögliche Zukunft',
    klima: 'Beide Welten: heftiges Klima (hohe Emissionen) – dieselben Wetterereignisse in denselben Jahren.',
    zahlen: 'Zahlen mit Spannen; „Annahme“ heißt Überschlag der Chronik.',
  };
  function signs(W, t) {
    if (W.klima !== 'heftig') return [];
    const gem = W.handeln === 'gemeinsam',
      out = [];
    if (gem && t >= yf(2031, doyOf(2031, 4, 12))) out.push('pflanzung');
    if (gem && t >= NET.run) out.push('heizhaus');
    const wy = WIND[W.handeln];
    if (t >= wy[0] - 0.3 && t < wy[1]) out.push('windbau');
    if (gem && t >= wy[1]) out.push('buergerwind');
    if (gem && t >= yf(2033, doyOf(2033, 6, 1))) out.push('notpunkt');
    return out;
  }

  // ---------- state(w, yf): STATE v1 ----------
  function state(w, t) {
    const W = WORLDS[w];
    if (!W) return null;
    t = clamp(+t || SPAN[0], SPAN[0], SPAN[1] + 0.999);
    return { y: t, forest: forest(W, t), water: water(W, t), energy: energy(W, t), signs: signs(W, t) };
  }

  // ---------- kpi(w, chapter): the numbers of the chapter-end card, the same ids in both worlds ----------
  const pct = v => Math.round(v * 100);
  const S = (...k) => k.map(x => SRC[x]);
  function K(id, label, unit, value, range, src, why, annahme = false) {
    const f = v => (unit === 'Mio. €' ? dec(v, v < 1 ? 2 : 1) : unit === 'm' ? dec(v, 1) : String(Math.round(v)));
    const sep = unit === '%' ? ' %' : ' ' + unit;
    return {
      id,
      label,
      value,
      unit,
      text: f(value) + sep,
      range,
      rangeText: f(range[0]) + '–' + f(range[1]) + sep,
      src,
      why,
      annahme,
    };
  }
  // the two worlds side by side: [Allein im Sturm, Gewappnet]
  const two = (gem, a, g) => (gem ? g : a);
  function kpiWald(W) {
    const gem = W.handeln === 'gemeinsam',
      inc = INC[W.klima][W.handeln],
      c = CLEAR[W.handeln];
    const f32 = forest(W, 2032.9),
      f40 = forest(W, 2040.5),
      f60 = forest(W, 2060.5);
    const used = removed(inc, c, 2040) / attacked(inc, 2040);
    const h = round(f40.regrowH, 1);
    return [
      K(
        'tot',
        'Fichten abgestorben bis 2032',
        '%',
        pct(1 - f32.green),
        [70, 100],
        S('thueringen', 'waldbericht', 'rekis'),
        'Gleiches heftiges Klima, gleicher Käfer: In beiden Welten sterben fast alle Fichten an den Hängen, wie seit 2018 in weiten Teilen des Harzes und des Thüringer Waldes. Schnelles Räumen vor dem Ausflug der Käfer rettet nur wenig.',
        true
      ),
      K(
        'jung',
        'Wieder junger Wald 2040',
        '%',
        pct(f40.young),
        two(gem, [30, 60], [65, 90]),
        S('waldwissen', 'forst'),
        two(
          gem,
          'Auf geräumten Flächen kommen Birke, Vogelbeere und Weide von selbst, lückig und mit Brombeere. Wo das tote Holz liegt, dauert es länger.',
          'Gemeinsam geräumt und im Frühjahr danach gepflanzt, dazu was von selbst kommt. Anteil der früheren Fichtenfläche.'
        ),
        true
      ),
      K(
        'hoehe',
        'Höhe der jungen Bäume 2040',
        'm',
        h,
        [round(h * 0.7, 1), round(h * 1.3, 1)],
        S('birke', 'waldwissen'),
        two(
          gem,
          'Birken wachsen anfangs schneller als gepflanzte Buchen, lassen aber nach 10–12 Jahren nach. Holz fürs Sägewerk liefern sie kaum.',
          'Gepflanzte Buchen, Eichen und Tannen wachsen in den ersten Jahren langsam, dafür wird es ein gemischter Wald, der auch Holz liefert.'
        ),
        true
      ),
      K(
        'misch',
        'Gemischter, klimafester Wald 2060',
        '%',
        pct(f60.planted),
        two(gem, [0, 15], [55, 85]),
        S('forst', 'thueringen'),
        two(
          gem,
          'Kaum jemand pflanzt; es wächst, was von selbst kommt: vor allem Birke und Weide, dazwischen wieder junge Fichten.',
          'Buche, Traubeneiche, Weißtanne, Bergahorn auf dem größten Teil der Käferflächen. Gemischte Wälder überstehen Dürre, Sturm und Käfer besser als reine Fichte.'
        ),
        true
      ),
      K(
        'holz',
        'Käferholz geräumt und genutzt',
        '%',
        pct(used),
        two(gem, [45, 75], [85, 100]),
        S('hackschnitzel', 'annahme'),
        two(
          gem,
          'Viele kleine Parzellen, die Unternehmer sind ausgebucht, das Holz bringt kaum etwas: Ein Teil bleibt stehen und fällt um.',
          'Ein Unternehmer für alle Parzellen; das schlechte Holz wird Hackschnitzel für das Heizhaus, rund 2 MWh Wärme je Festmeter Fichte.'
        ),
        true
      ),
    ];
  }
  function kpiWasser(W) {
    const gem = W.handeln === 'gemeinsam';
    return [
      K(
        'regen',
        'Regen in der Starkregennacht',
        'mm',
        55,
        [45, 70],
        S('kostra2', 'rekis'),
        'Liter je Quadratmeter in einer Stunde, in beiden Welten gleich. Nach KOSTRA fallen hier heute 47,5 mm in einer Stunde etwa einmal in hundert Jahren (±26 %). Wärmere Luft hält mehr Wasser, Gewitterregen werden eher heftiger (Annahme für das heftige Klima).',
        true
      ),
      K(
        'keller',
        'Keller unter Wasser in der Starkregennacht',
        'Keller',
        two(gem, 12, 1),
        two(gem, [6, 20], [0, 3]),
        S('dorf', 'annahme'),
        two(
          gem,
          'Das Wasser kommt vom kahlen Hang durch Kellerfenster, Lichtschächte und den Kanal.',
          'Mulden am Hang, Rückstauklappen und Schwellen, Sandsäcke und eine geübte Feuerwehr halten das meiste Wasser draußen.'
        ),
        true
      ),
      K(
        'schaden',
        'Schaden der Starkregennacht',
        'Mio. €',
        two(gem, 0.3, 0.03),
        two(gem, [0.15, 0.6], [0.01, 0.08]),
        S('elementar', 'annahme'),
        'Überschlag: je vollgelaufenem Keller mit Heizung und Hausrat 15 000–40 000 €, dazu Straße und Kanal. In Thüringen ist nicht einmal jedes zweite Haus gegen Elementarschäden versichert.',
        true
      ),
      K(
        'vorsorge',
        'Kosten der Vorsorge 2032–2033',
        'Mio. €',
        two(gem, 0.02, 0.25),
        two(gem, [0.01, 0.05], [0.15, 0.4]),
        S('hnz', 'annahme'),
        two(
          gem,
          'Einzelne Rückstauklappen und Sandsäcke, wer will.',
          'Mulden und Querrinnen am Hang, Rückstauklappen und Schwellen an den Häusern, mobile Wände, Pumpen und Sandsäcke; vor Förderung.'
        ),
        true
      ),
      K(
        'hochwasser',
        'Häuser mit Wasser drin beim großen Hochwasser',
        'Häuser',
        two(gem, 25, 9),
        two(gem, [18, 37], [4, 15]),
        S('uesg', 'dez23', 'rekis', 'annahme'),
        'Im amtlichen Überschwemmungsgebiet (HQ100) liegen rund 37 Gebäude; im heftigen Klima regnet es im Winter mehr (ReKIS: bis Ende des Jahrhunderts +15 %). ' +
          two(
            gem,
            'Ohne Vorsorge steht das Wasser in vielen Kellern und Erdgeschossen.',
            'Mobile Wände, Rückstauklappen und leere Keller halten das Wasser meist draußen.'
          ),
        true
      ),
    ];
  }
  function kpiEnergie(W) {
    const gem = W.handeln === 'gemeinsam';
    return [
      K(
        'waerme',
        'Häuser ohne Ölheizung 2040',
        '%',
        two(gem, 40, 90),
        two(gem, [30, 55], [80, 95]),
        S('schloeben', 'wpg', 'dorf', 'annahme'),
        two(
          gem,
          'Wer einen neuen Kessel braucht, nimmt oft eine Wärmepumpe; viele ältere Häuser heizen weiter mit Öl.',
          'Vier von fünf Häusern an der Nahwärme mit Hackschnitzeln aus der Gegend, dazu Holzöfen und einige Wärmepumpen.'
        ),
        true
      ),
      K(
        'preis',
        'Wärmepreis 2035',
        'ct/kWh',
        two(gem, 17, 12),
        two(gem, [13, 24], [10, 15]),
        S('schloeben', 'behg', 'hormus', 'annahme'),
        two(
          gem,
          'Heizöl mit steigendem CO₂-Preis und schwankendem Weltmarkt (2022, Hormus 2026), dazu Wartung und Schornsteinfeger.',
          'Nahwärme mit Grund- und Arbeitspreis (Annahme nach neueren Bioenergiedörfern); Schlöben nennt 6,6 ct/kWh für Mitglieder. Holz trägt kaum CO₂-Preis.'
        ),
        true
      ),
      K(
        'geld',
        'Geld für Energie, das im Dorf bleibt (je Jahr, 2040)',
        'Mio. €',
        two(gem, 0.02, 0.2),
        two(gem, [0.01, 0.05], [0.12, 0.3]),
        S('windbeteilg', 'eeg6', 'dorf', 'annahme'),
        two(
          gem,
          'Einspeisevergütung einzelner Dächer; die Pacht des Windrads bekommt ein Besitzer, die Stadt 0,2 ct je Kilowattstunde.',
          'Wärmeverkauf statt Ölrechnung, Hackschnitzel aus der Gegend, Pacht und Anteile am Bürgerwindrad.'
        ),
        true
      ),
      K(
        'warm',
        'Häuser mit Wärme in der Nacht ohne Strom',
        '%',
        two(gem, 25, 70),
        two(gem, [15, 35], [50, 85]),
        S('koepenick', 'berlin26', 'annahme'),
        two(
          gem,
          'Ölbrenner, Heizungspumpen und Wärmepumpen brauchen Strom. Warm bleibt es nur mit Holzofen.',
          'Das Heizhaus läuft mit Notstrom, eine Akkustation hält in jedem angeschlossenen Haus die Heizungspumpe am Laufen; dazu Holzöfen.'
        ),
        true
      ),
      K(
        'notpunkt',
        'Stunden mit Licht und Wärme am Notfall-Treffpunkt',
        'h',
        two(gem, 0, DARK_H),
        two(gem, [0, 2], [24, 72]),
        S('muensterland', 'berlin26', 'annahme'),
        two(
          gem,
          'Es gibt keinen Treffpunkt mit Strom; die Feuerwehr hat ein Aggregat für ihre Pumpen.',
          'Dorfspeicher und Aggregat an der alten Schule reichen für die Nacht und den Tag danach. Lange Ausfälle gab es: Köpenick 2019 rund 31 Stunden, Berlin im Januar 2026 vier Tage.'
        ),
        true
      ),
    ];
  }
  const KPI = { wald: kpiWald, wasser: kpiWasser, energie: kpiEnergie };
  function kpi(w, chapter) {
    const W = WORLDS[w];
    if (!W || W.stub || !KPI[chapter]) return [];
    return KPI[chapter](W);
  }

  // ---------- lines(): every voice line once, for the recording pipeline ----------
  function lines() {
    const seen = new Map();
    for (const w of Object.keys(WORLDS))
      for (const e of events(w)) for (const l of e.lines) if (!seen.has(l.id)) seen.set(l.id, { ...l });
    return [...seen.values()];
  }

  return {
    SPAN,
    WORLDS,
    PAIRS,
    CHAPTERS,
    PLACES,
    WHO,
    SRC,
    SIGNS,
    SIGN_NOTE,
    NOTES,
    CUES,
    events,
    find,
    state,
    kpi,
    lines,
    yf,
    date,
    at,
    phase,
    doyOf,
  };
})();
if (typeof window !== 'undefined') window.ZKCHRONIK = ZKCHRONIK;
