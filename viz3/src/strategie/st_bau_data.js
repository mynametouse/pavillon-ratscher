// ===================== feat/strategie-bau: the pavilion as a real project and the garden from above – data (STBAUDATA) =====================
// Falko, 5.11.2026 (plan_strategie.md sections 4, 6, 12, 13): the construction phases of the pavilion are the ages (Age of Empires); each phase
// is a real project – the old garage's slab uncovered and checked, building law (Gebäudeklasse 1 in the outer area), the structural design,
// the materials (bought, or own timber from the Klinge: dried and graded), helpers, weather windows, Euro and durations. And the garden from
// above: buying at the Baumschule Kammbach, planting, watering, protecting, pruning, harvesting. Pure data and pure helpers (no imports): the
// unit tests (viz3/test/unit/strategie_bau.test.mjs) check them in node. Every sentence one learns from names its source; where no source
// fits, the text says „Annahme“ (an assumption of the game). The phase list itself (materials, prices, how and checks) is pavilion/phases.js.
export const STBAUDATA = (() => {
  const VAT = 0.19; // the prices of pavilion/phases.js are net – a private builder pays the German VAT on top
  // ---- the laws as cited (checked 6.11.2026): the new Thüringer Bauordnung of 2 July 2024 renumbered the old one of 2014 – the necessary
  // staircase is § 37 now (was § 34), procedure-free projects § 63 (was § 60), the simplified procedure § 65 (was § 62) ----
  const LAW = {
    thuerbo:
      'Thüringer Bauordnung (ThürBO) vom 2. Juli 2024, GVBl. S. 298, geändert 2026 (GVBl. S. 150) – landesrecht.thueringen.de',
    baugb: 'Baugesetzbuch (BauGB) – gesetze-im-internet.de/bbaug/__35.html',
    mbo: 'Musterbauordnung (MBO) der Bauministerkonferenz – is-argebau.de',
  };
  // ---- the steps before the first phase: the slab, building law, the structural design, the permit ----
  const PREP = {
    platte: {
      label: 'Garagenplatte freilegen und prüfen',
      text: 'An zwei Ecken bis unter die Platte graben, Dicke und Frostschürze messen, Bewehrung suchen, mit dem Rotationslaser die Ebenheit prüfen, alles fotografieren.',
      learn:
        'Die Platte trägt später etwa 20 kN je Meter Wand. In Ordnung ist eine bewehrte Platte ab 15 cm mit Frostschürze; frostfrei gegründet ist in Deutschland ab 0,8 m Tiefe, in rauen Lagen wie dem Thüringer Wald eher ab 1,0 m.',
      src: 'Planung des Pavillons (Bauphase 0, Statik überschlägig); DIN 1054 (frostfreie Gründungstiefe)',
      hours: 5,
      people: [2, 3],
      cost: [
        ['Rotationslaser (Tagesmiete), Maßband, Fotos', 60, 'Planung Bauphase 0 (netto)'],
        ['Bewehrungssuchgerät (Tagesmiete)', 45, 'Annahme: Mietpreis 2026'],
      ],
    },
    voranfrage: {
      label: 'Bauvoranfrage beim Bauamt (Vorbescheid)',
      text: 'Mit Lageplan, Skizzen und Fotos zur unteren Bauaufsicht im Landratsamt Hildburghausen: Ist der Pavillon im Außenbereich genehmigungsfähig?',
      learn:
        'Im Außenbereich gilt § 35 BauGB: Ein Gartenpavillon ist kein privilegiertes Vorhaben (Abs. 1), sondern ein „sonstiges“ (Abs. 2) und nur zulässig, wenn er öffentliche Belange nicht beeinträchtigt (Abs. 3: Flächennutzungsplan, Natur und Landschaft, keine Splittersiedlung). Verfahrensfrei wären in Thüringen etwa ein eingeschossiges Gebäude bis 10 m² Grundfläche oder eine Garage bis 50 m² – beides aber „außer im Außenbereich“. Ein Vorbescheid klärt die Frage vor den teuren Plänen.',
      src: '§ 35 Abs. 1–3 BauGB; § 63 Abs. 1 Nr. 1 Buchst. a und b ThürBO; ' + LAW.thuerbo + '; ' + LAW.baugb,
      hours: 3,
      people: [1, 2],
      fee: 150,
      feeSrc: 'Annahme: Gebühr für einen Vorbescheid',
      wait: 42,
      waitSrc: 'Annahme: vier bis acht Wochen',
    },
    statik: {
      label: 'Tragwerksplaner beauftragen (Statik)',
      text: 'Die Pläne, die Maße und die Befunde der Platte an einen Tragwerksplaner geben: Standsicherheitsnachweis für Kragarme, Ringbalken und Platte.',
      learn:
        'In Gebäudeklasse 1 (freistehend, oberster Aufenthaltsraum höchstens 7 m über dem Gelände) prüft in der Regel kein Prüfingenieur die Statik – der Tragwerksplaner steht selbst dafür ein. Er rechnet die 0,9 m Kragarme mit Kopfbändern, den Ringbalken über dem Westglas und die Linienlast auf der Platte.',
      src:
        '§ 2 Abs. 3 Satz 1 Nr. 1 ThürBO (Gebäudeklasse 1); § 72 ThürBO (bautechnische Nachweise; geprüft wird bei Gebäudeklasse 1 nur nach Kriterienkatalog, wie § 66 Abs. 3 MBO); ' +
        LAW.thuerbo +
        '; Planung des Pavillons',
      hours: 2,
      people: [1, 1],
      fee: 1900,
      feeSrc: 'Annahme: Tragwerksplanung für ein kleines Holzhaus 1.500–3.000 € brutto',
      wait: 28,
      waitSrc: 'Annahme: drei bis fünf Wochen',
    },
    antrag: {
      label: 'Bauantrag einreichen',
      text: 'Bauvorlagen (Lageplan, Bauzeichnungen 1 : 100, Baubeschreibung, Statik), unterschrieben von einer bauvorlageberechtigten Person, ans Bauamt.',
      learn:
        'Außerhalb eines Bebauungsplans läuft das vereinfachte Baugenehmigungsverfahren: Das Bauamt prüft vor allem das Planungsrecht (BauGB). Die übrigen Regeln der Bauordnung – Treppen, Brandschutz, Abstände – muss der Bauherr selbst einhalten. Vor Baubeginn muss man ihn eine Woche vorher anzeigen.',
      src:
        '§ 65 ThürBO (vereinfachtes Baugenehmigungsverfahren: geprüft werden §§ 29–38 BauGB und beantragte Abweichungen nach § 73); § 67 ThürBO (Bauvorlageberechtigung); § 78 ThürBO (Baubeginn; die Anzeige eine Woche vorher wie § 72 Abs. 8 MBO); ' +
        LAW.thuerbo,
      hours: 2,
      people: [1, 2],
      fee: 1400,
      feeSrc: 'Annahme: Bauvorlagen eines Architekten oder Bauingenieurs',
      feeRate: 0.005,
      feeRateSrc: 'Annahme: Genehmigungsgebühr rund 0,5 % der Baukosten',
      wait: 56,
      waitSrc: 'Annahme: im vereinfachten Verfahren meist ein bis drei Monate',
      start: 7,
    },
    streifen: {
      label: 'Streifenfundament 30 × 80 cm am Plattenrand ergänzen',
      text: 'Rund um die Platte einen Graben bis in frostfreie Tiefe ausheben, Bewehrungskorb, Beton C25/30 aus dem Fahrmischer, an die Platte angeschlossen.',
      learn:
        'Beton braucht beim Einbau und in den ersten Tagen Schutz vor Frost; unter +5 °C sind besondere Maßnahmen nötig. Rund 17 m Streifen × 0,3 × 0,8 m sind gut 4 m³ Beton.',
      src: 'DIN EN 206 / DIN 1045-3 (Betonieren bei kühler Witterung); Planung des Pavillons (Bauphase 0)',
      hours: 2 * 8 * 3,
      people: [3, 4],
      cost: [
        ['Transportbeton C25/30, 4,1 m³, mit Pumpe', 980, 'Annahme: Transportbeton 2026 um 190 €/m³ plus Pumpe'],
        ['Bewehrung, Schalung, Anschlussbewehrung', 420, 'Annahme'],
      ],
    },
    sortieren: {
      label: 'Bauholz sortieren (DIN 4074-1)',
      text: 'Ein Holzsortierer prüft die trockenen Bohlen und Kanthölzer Stück für Stück: Äste, Faserneigung, Risse, Krümmung – tragfähig ist S10.',
      learn:
        'Tragendes Nadelholz muss nach DIN 4074-1 sortiert sein; S10 entspricht der Festigkeitsklasse C24. Sortiert wird trocken (unter 20 % Holzfeuchte). Bläue mindert die Festigkeit nicht – Risse, Verdrehung und große Äste schon. Aus einem Festmeter Rundholz werden etwa 0,6 m³ Schnittholz.',
      src: 'DIN 4074-1 (Sortierung nach der Tragfähigkeit); DIN EN 1912 (S10 ≙ C24); Sägewerkspraxis (Schnittholzausbeute 55–65 %)',
      hours: 6,
      people: [1, 2],
      fee: 240,
      feeSrc: 'Annahme: ein Sortierer mit Sachkundenachweis für einen Tag',
    },
    geruest: {
      label: 'Gerüst stellen (Miete)',
      text: 'Ein Fassadengerüst rund um das Haus für Obergeschoss, Dach und Fassade – gemietet mit Auf- und Abbau.',
      learn:
        'Auf Baustellen gilt ab 2 m Absturzhöhe eine Absturzsicherung als nötig – für Obergeschoss, Dach und Fassade ist ein Gerüst die sicherste. Die Miete läuft weiter, auch an Wochen, in denen niemand baut.',
      src: 'DGUV Information 201-011 (Gerüste); Annahme: Gerüstmiete 2026',
      hours: 4,
      people: [1, 2],
      fee: 1150,
      feeSrc: 'Annahme: rund 120 m² Fassadengerüst mit Auf- und Abbau, die ersten acht Wochen',
      week: 65,
      weekSrc: 'Annahme: jede weitere Woche',
      from: 11,
      to: 25,
    },
  };

  // ---- the phases as projects (index = pavilion/phases.js and PHN in core/geo.js) ----
  // crew [min, max] people, min skill bauen, heavy (0–1), loud (power tools: quiet hours), wx – the weather window: dry (no rain at all),
  // rain (mm/h at most), tMin (°C at least), wind (km/h at most), soil (the ground not frozen); inside: under a sealed roof and closed walls
  // (any weather); lead: delivery days for bought material (eigen: for the own-timber/self-built variant); hubert: his tractor needed or
  // helpful; learn + src: the sentence one learns.
  const WX_SRC = {
    dry: 'nasse Bauteile quellen, Kleber und Bahnen haften nicht',
    tMin: 'Kleber, Mörtel, Bitumen und Lehm brauchen Wärme zum Abbinden',
    wind: 'große Teile werden bei Wind zu Segeln – auf Gerüst und Dach Absturzgefahr',
    soil: 'im gefrorenen Boden kann man weder graben noch eindrehen',
  };
  const PH = {
    0: { crew: [2, 3], min: 1, heavy: 0.4, wx: { soil: true, rain: 2 } },
    1: {
      crew: [4, 5],
      min: 2,
      heavy: 0.7,
      wx: { wind: 30, rain: 2 },
      hubert: 'need',
      learn:
        'Eine Blechgarage ist verschraubt: Teile nummerieren, zu viert tragen – Huberts Frontlader nimmt die Dachteile –, am Südende auf Punktfundamenten aus Betonplatten neu aufbauen. Bei Wind werden Blechtafeln zu Segeln.',
      src: 'Planung des Pavillons (Bauphase 1); Annahme: Wind über 30 km/h',
    },
    2: {
      crew: [2, 2],
      min: 2,
      heavy: 0.4,
      wx: { dry: true, tMin: 5 },
      learn:
        'Die Schweißbahn ist die einzige Feuchtesperre unter dem Haus: nur auf trockenem Beton und ab etwa +5 °C aufschweißen. Wer mit dem Brenner arbeitet, hat eine zweite Person mit Feuerlöscher als Brandwache dabei.',
      src: 'Verarbeitungshinweise der Hersteller von Bitumen-Schweißbahnen; VdS 2008 (feuergefährliche Arbeiten)',
    },
    3: {
      crew: [2, 3],
      min: 2,
      heavy: 0.5,
      loud: true,
      wx: { tMin: 5, rain: 1 },
      learn:
        'Verbundanker M12 alle 80 cm halten Windschub und Abheben (je Wandseite etwa 12 kN). Der Injektionsmörtel härtet unter +5 °C sehr viel langsamer aus – die Last darf erst nach der Aushärtezeit drauf.',
      src: 'Planung des Pavillons (Statik überschlägig); Herstellerangaben zu Injektionsmörteln',
    },
    4: {
      crew: [2, 3],
      min: 2,
      heavy: 0.6,
      loud: true,
      wx: { soil: true, rain: 2 },
      learn:
        'Schraubfundamente tragen ohne Beton und Aushub; das Drehmoment beim Eindrehen zeigt, wie fest der Boden ist (15–25 kN je Pfahl im lehmigen Boden). Gefrorener Boden geht nicht.',
      src: 'Planung des Pavillons (Bauphase 4, Variante A); Herstellerangaben Schraubfundamente',
      learnB:
        'Ohne Treppenturm entfallen die Schraubfundamente: vor der Haustür eine Sandsteinstufe mit 2 % Gefälle vom Haus weg und ein Kiesstreifen als Traufkante.',
      srcB: 'Planung des Pavillons (Bauphase 4, Variante B)',
    },
    5: {
      crew: [3, 5],
      min: 2,
      heavy: 0.8,
      loud: true,
      wx: { wind: 40, rain: 1 },
      hubert: 'help',
      learn:
        'Holzrahmenbau: Wände liegend nageln, zu dritt aufrichten. Ständer 6/14 im Raster 62,5 cm, weil eine OSB-Platte 1,25 m breit ist – zwei Felder je Platte. Ein Ständer trägt etwa 10 kN, unter 30 % von dem, was C24 kann.',
      src: 'Planung des Pavillons (Bauphase 5, Statik überschlägig); Plattenraster im Holzrahmenbau',
    },
    6: {
      crew: [2, 3],
      min: 2,
      heavy: 0.5,
      loud: true,
      wx: { dry: true },
      learn:
        'OSB/3 innen macht die Wand zur steifen Scheibe und zugleich luftdicht; erst danach dürfen die Montagediagonalen weg. Nass gewordenes OSB quillt an den Kanten.',
      src: 'Planung des Pavillons (Bauphase 6); EN 300 (OSB/3 für den Feuchtbereich)',
    },
    7: {
      crew: [2, 3],
      min: 1,
      heavy: 0.4,
      wx: { dry: true },
      learn:
        'Holzfaser 140 mm im Gefach und 40 mm außen: U ≈ 0,22 W/m²K und nach außen diffusionsoffen – Dämmung wird nie nass eingebaut.',
      src: 'Planung des Pavillons (Bauphase 7, Bauphysik überschlägig)',
    },
    8: {
      crew: [3, 4],
      min: 2,
      heavy: 0.8,
      loud: true,
      wx: { wind: 40, rain: 1 },
      hubert: 'help',
      learn:
        'Deckenbalken 10/24 im Raster 62,5 cm kragen beidseitig 0,9 m aus – das größere Obergeschoss steht darauf. Spannung etwa 5 N/mm² bei 14 zulässig.',
      src: 'Planung des Pavillons (Bauphase 8, Statik überschlägig)',
    },
    9: {
      crew: [2, 3],
      min: 3,
      heavy: 0.6,
      loud: true,
      wx: { wind: 40, rain: 1 },
      learn:
        'Kopfbänder unter 45° nehmen bis 25 kN Druck und halten die Kragarme ruhig; Zuganker an den Ecken verhindern, dass der Wind das Haus anhebt.',
      src: 'Planung des Pavillons (Bauphase 9, Statik überschlägig)',
    },
    10: {
      crew: [2, 4],
      min: 2,
      heavy: 0.6,
      loud: true,
      wx: { dry: true },
      learn:
        'Erst die verschraubte OSB-Platte macht die Balkenlage zur steifen Decke – vorher keine Lasten aus dem Obergeschoss aufbringen.',
      src: 'Planung des Pavillons (Bauphase 10)',
    },
    11: {
      crew: [3, 5],
      min: 2,
      heavy: 0.8,
      loud: true,
      wx: { wind: 35, rain: 1 },
      hubert: 'help',
      learn:
        'Im Obergeschoss steifen acht geschlossene Eckpfeiler von 0,9 m das Haus gegen Wind aus – dazwischen die raumhohe Verglasung nach Westen.',
      src: 'Planung des Pavillons (Bauphase 11)',
    },
    12: {
      crew: [2, 3],
      min: 2,
      heavy: 0.5,
      loud: true,
      wx: { dry: true },
      learn:
        'Luftdichtung lückenlos an die Decke anschließen; ein Blower-Door-Test nach den Fenstern findet Lecks, solange man noch an alles herankommt.',
      src: 'Planung des Pavillons (Bauphase 12); DIN EN ISO 9972 (Luftdichtheit)',
    },
    13: {
      crew: [3, 4],
      min: 3,
      heavy: 0.8,
      loud: true,
      wx: { wind: 35, rain: 1 },
      hubert: 'help',
      learn:
        'Der Ringbalken aus Brettschichtholz trägt über den Glasfeldern; die Dachbalken spannen als Einfeldträger von West nach Ost – Durchbiegung unter Last etwa L/350.',
      src: 'Planung des Pavillons (Bauphase 13, Statik überschlägig)',
    },
    14: {
      crew: [2, 3],
      min: 2,
      heavy: 0.6,
      loud: true,
      wx: { dry: true, wind: 40 },
      learn: 'Ab der Dachschalung ist das Haus regengeschützt, aber noch nicht dicht – eine Plane liegt bereit.',
      src: 'Planung des Pavillons (Bauphase 14)',
    },
    15: {
      crew: [2, 3],
      min: 2,
      heavy: 0.5,
      wx: { dry: true, wind: 30 },
      learn:
        'Ein unbelüftetes Flachdach braucht eine lückenlose Dampfsperre (sd ≥ 100 m) – sonst schlägt sich im Winter Feuchte in der Dämmung nieder.',
      src: 'Planung des Pavillons (Bauphase 15); Flachdachrichtlinie des Dachdeckerhandwerks (ZVDH)',
    },
    16: {
      crew: [2, 3],
      min: 3,
      heavy: 0.5,
      wx: { dry: true, tMin: 5, wind: 30 },
      learn:
        'EPDM wird vollflächig verklebt, die Nähte 10 cm überlappt: Kleber brauchen eine trockene Fläche und etwa +5 °C. Danach ist das Haus dicht.',
      src: 'Herstellerangaben EPDM-Dachbahnen; Flachdachrichtlinie des Dachdeckerhandwerks (ZVDH)',
    },
    17: {
      crew: [2, 3],
      min: 3,
      heavy: 0.5,
      wx: { wind: 40, rain: 1 },
      lead: 14,
      learn:
        'Der Schornstein hält 5 cm Abstand zu Holz und mündet mindestens 1 m über der Brüstung; abnehmen muss ihn der bevollmächtigte Bezirksschornsteinfeger.',
      src: 'Planung des Pavillons (Bauphase 17); Muster-Feuerungsverordnung; Schornsteinfeger-Handwerksgesetz',
    },
    18: {
      crew: [2, 3],
      min: 3,
      heavy: 0.5,
      wx: { rain: 1 },
      lead: 56,
      leadEigen: 21,
      learn:
        'Gekaufte Holzfenster (3-fach, Ug 0,6) brauchen oft sechs bis zehn Wochen Lieferzeit – früh bestellen. Im Eigenbau: Lärchenrahmen mit gekauftem Isolierglas (Ug 1,1).',
      src: 'Planung des Pavillons (Bauphase 18); Annahme: Lieferzeiten 2026',
    },
    19: {
      crew: [2, 3],
      min: 3,
      heavy: 0.4,
      wx: { rain: 1 },
      lead: 42,
      leadEigen: 14,
      learn: 'Alle Türen öffnen nach außen: Kein Türschwenk kostet Fläche im Raum; außen halten Sturmhaken sie fest.',
      src: 'Planung des Pavillons (Bauphase 19)',
    },
    20: {
      crew: [2, 3],
      min: 2,
      heavy: 0.5,
      loud: true,
      wx: { rain: 1 },
      learn:
        'Hinterlüftung mindestens 20 mm, unten und oben offen: So trocknet die Fassade nach jedem Regen von hinten.',
      src: 'Planung des Pavillons (Bauphase 20); DIN 18516-1 (hinterlüftete Außenwandbekleidungen)',
    },
    21: {
      crew: [2, 4],
      min: 2,
      heavy: 0.6,
      wx: { dry: true, wind: 20 },
      learn:
        'Yakisugi: Lärchenbretter anflämmen, die Kohle abbürsten, mit Leinöl einlassen – etwa zwei Stunden je 10 m², danach 10–15 Jahre wartungsfrei. Geflämmt wird nur bei wenig Wind, Löschwasser steht bereit.',
      src: 'Planung des Pavillons (Bauphase 21); Annahme: Windgrenze beim Flämmen',
    },
    22: {
      crew: [2, 3],
      min: 3,
      heavy: 0.6,
      loud: true,
      inside: true,
      lead: 42,
      learn:
        'Wendeltreppe: 14 Steigungen à 19,2 cm, Auftritt in der Gehlinie 25 cm – die Schrittmaßregel 2 h + a ≈ 63 cm; nutzbare Laufbreite 0,95 m (mindestens 0,80 m).',
      src: 'Planung des Pavillons (Bauphase 22); DIN 18065 (Gebäudetreppen)',
      learnB:
        'Leitertreppe mit 63°: steiler als eine Treppe, bequemer als eine Leiter. Ins Obergeschoss mit Aufenthaltsraum verlangt die Bauordnung eine notwendige Treppe; Leitern sind nur zu Dachräumen ohne Aufenthaltsraum vorgesehen – die offene Frage mit dem Bauamt.',
      srcB:
        '§ 37 Abs. 1 und Abs. 2 Satz 2 ThürBO (Treppen; bis 2024 § 34): Leitern nur als Zugang zu einem Dachraum ohne Aufenthaltsraum; ' +
        LAW.thuerbo +
        '; Planung des Pavillons (Bauphase 22, Variante B)',
      leadB: 10,
    },
    23: {
      crew: [2, 3],
      min: 3,
      heavy: 0.5,
      loud: true,
      inside: true,
      learn:
        'Die zweite Windung bis zum Turmkopf: 15 Steigungen à 19,75 cm, Geländer am Treppenauge 1,0 m, Stäbe höchstens 12 cm auseinander, damit kein Kind durchpasst.',
      src: 'Planung des Pavillons (Bauphase 23); DIN 18065',
      learnB:
        'Die Leiter zur Dachluke: beim Ausstieg zuerst den Haltegriff fassen, dann über den Kranz auf die Terrasse treten.',
      srcB: 'Planung des Pavillons (Bauphase 23, Variante B)',
    },
    24: {
      crew: [2, 3],
      min: 2,
      heavy: 0.5,
      loud: true,
      wx: { rain: 1 },
      learn:
        'Stelzlager mit großen Tellern auf Schutzvlies: Der Terrassenbelag drückt nur punktuell auf die EPDM-Bahn.',
      src: 'Planung des Pavillons (Bauphase 24)',
    },
    25: {
      crew: [2, 3],
      min: 2,
      heavy: 0.5,
      loud: true,
      wx: { wind: 35, rain: 1 },
      lead: 21,
      learn:
        'Absturzsicherung: Bis 12 m Absturzhöhe verlangt die Bauordnung mindestens 0,90 m Umwehrung (darüber 1,10 m) – geplant sind 1,10 m mit Seilen alle 11 cm.',
      src: '§ 41 ThürBO (Umwehrungen); Mindesthöhen nach § 38 MBO; Planung des Pavillons (Bauphase 25)',
    },
    26: {
      crew: [2, 3],
      min: 2,
      heavy: 0.5,
      loud: true,
      inside: true,
      learn: 'Holz arbeitet: Eichendielen bekommen 10 mm Randfuge rundum.',
      src: 'Planung des Pavillons (Bauphase 26)',
    },
    27: {
      crew: [2, 3],
      min: 2,
      heavy: 0.6,
      inside: true,
      wx: { tMin: 5 },
      dry: 14,
      learn:
        'Lehmputz speichert Wärme und Feuchte; er trocknet zwei bis drei Wochen bei offenen Fenstern und darf dabei nicht gefrieren.',
      src: 'Planung des Pavillons (Bauphase 27); Lehmbau Regeln (Dachverband Lehm)',
    },
    28: {
      crew: [2, 3],
      min: 3,
      heavy: 0.4,
      inside: true,
      lead: 14,
      fee: [['Abnahme der Feuerstätte durch den Bezirksschornsteinfeger', 120, 'Annahme: Gebühr der Abnahme']],
      learn:
        'Vor dem ersten Feuer nimmt der bevollmächtigte Bezirksschornsteinfeger Ofen und Schornstein ab. 4 PV-Module geben im Winter etwa 1,3 kWh am Tag: Licht, Laptop, Musik ja – heizen nein.',
      src: 'Schornsteinfeger-Handwerksgesetz; Planung des Pavillons (Bauphase 28)',
    },
    29: {
      crew: [1, 3],
      min: 2,
      heavy: 0.3,
      inside: true,
      learn: 'Regale an den Ständern verschrauben – Lehmputz trägt keine Last.',
      src: 'Planung des Pavillons (Bauphase 29)',
    },
    30: {
      crew: [1, 3],
      min: 1,
      heavy: 0.2,
      inside: true,
      learn: 'Laufwege mindestens 0,9 m frei, vor der Ofentür 0,8 m; alle Türen schlagen nach außen auf.',
      src: 'Planung des Pavillons (Bauphase 30)',
    },
  };
  // the age names of the pavilion's phases (Age of Empires: STDATA.AGES gets these – from phase n on)
  const AGES = [
    { from: 5, name: 'Das Ständerwerk steht', text: 'Erdgeschoss als Holzrahmenbau, dann Decke und Kragarme.' },
    { from: 11, name: 'Das Obergeschoss', text: 'Ständerwerk OG, Beplankung, Ringbalken.' },
    { from: 16, name: 'Unter Dach', text: 'Das Flachdach ist dicht – jetzt Fenster, Türen, Fassade.' },
    { from: 21, name: 'Die schwarze Hülle', text: 'Yakisugi-Fassade, Treppen, Terrasse.' },
    { from: 26, name: 'Innenausbau', text: 'Böden, Lehmputz, Ofen, Einbauten.' },
    { from: 30, name: 'Der Pavillon steht', text: 'Bibliothek, Arbeits- und Musikraum, Dachterrasse.' },
  ];
  // ---- delivery: days from the order to the building site (Annahme: Baustoffhandel, Lieferung frei Baustelle mit Kran) ----
  const LEAD = 4;
  const LEAD_SRC = 'Annahme: Baustoffhandel, Lieferung frei Baustelle in drei bis fünf Werktagen';
  // ---- money: savings for the building and a monthly rate (assumptions to set to the real numbers in the panel) ----
  const KONTO = {
    start: 15000,
    rate: 500,
    rates: [0, 250, 500, 1000, 1500],
    starts: [0, 5000, 15000, 30000, 60000],
    src: 'Annahme des Spiels – im Feld „Bauplatz“ auf eure echten Zahlen stellen',
  };
  // ---- the slab as it may be (found only by digging – each game draws it once; a test can set it) ----
  const SLAB = {
    thick: [
      [10, 0.15],
      [12, 0.25],
      [15, 0.4],
      [18, 0.2],
    ],
    apron: [
      [0, 0.15],
      [50, 0.2],
      [80, 0.45],
      [100, 0.2],
    ],
    rebar: 0.7, // chance of a mesh in a slab from 12 cm on (thinner: 0.3)
    size: [4.3, 4.3], // the slab as modelled (pavilion/house_common.js)
  };
  const slabOk = f => !!f && f.thick >= 15 && !!f.rebar && f.apron >= 80;

  // ---- pure helpers ----
  // the working days of a phase („2 Tage“ zu zweit) → person-hours
  function personHours(days) {
    const s = String(days || '').trim();
    if (!s || s === '–') return 6;
    if (/^½/.test(s)) return 8;
    const m = /([\d,.]+)/.exec(s);
    const d = m ? parseFloat(m[1].replace(',', '.')) : 1;
    return d * 8 * 2;
  }
  // working minutes of a crew of n (person-hours shared; a larger crew loses a little to coordination)
  const crewMinutes = (ph, n) => (ph * 60) / Math.pow(Math.max(1, n), 0.9);
  const net = (it, eigen) => it[2] * (eigen ? (it[5] ?? it[4]) : it[4]);
  // the timber of an item that the Klinge can give (spruce, larch, pine – no oak): m³ and whether it is structural (≥ 50 mm, graded)
  function woodOf(it) {
    const name = String(it[0]) + ' ' + String(it[1] || ''),
      unit = String(it[3] || ''),
      q = +it[2] || 0;
    if (/eiche/i.test(name) || /glas|stahl|alu|osb|dämm|xps|epdm|schraub|nagel|winkel/i.test(name)) return null;
    if (!(it[5] != null && it[5] > 0 && it[5] < it[4])) return null;
    let v = 0,
      t = 0;
    const sec = /(\d+(?:,\d+)?)\s*\/\s*(\d+(?:,\d+)?)/.exec(name),
      mm2 = /(\d+)\s*×\s*(\d+)/.exec(name),
      mm1 = /(\d+)\s*mm/.exec(name);
    if ((unit === 'm' || unit === 'lfm') && sec) {
      // sections in cm (6/14, 10/24) – battens are written in mm (30/50): no timber of this house is 25 cm thick
      let a = parseFloat(sec[1].replace(',', '.')),
        b = parseFloat(sec[2].replace(',', '.'));
      if (Math.min(a, b) >= 25) {
        a /= 10;
        b /= 10;
      }
      v = ((a * b) / 1e4) * q;
      t = Math.min(a, b) * 10;
    } else if ((unit === 'm' || unit === 'lfm') && mm2) {
      v = ((+mm2[1] * +mm2[2]) / 1e6) * q;
      t = Math.min(+mm2[1], +mm2[2]);
    } else if (unit === 'm²' && (mm2 || mm1)) {
      t = mm2 ? Math.min(+mm2[1], +mm2[2]) : +mm1[1];
      v = (t / 1000) * q;
    } else return null;
    if (!(v > 0)) return null;
    return { m3: v * 1.12, kant: t >= 45, t };
  }
  // which own variant a phase has: 'holz' (timber from the Klinge), 'bau' (self-built windows, doors), or null (all bought)
  function eigenKind(p) {
    const L = p.items || [];
    if (L.some(it => /Eigenbau|^Kaufvariante/.test(String(it[0])))) return 'bau';
    if (L.some(it => woodOf(it))) return 'holz';
    return null;
  }
  // what a phase costs (gross, Euro) bought or with own timber, the timber it needs (m³), the person-hours
  function phaseCost(p, eigen) {
    if (eigen && !eigenKind(p)) eigen = false;
    let n = 0,
      kant = 0,
      brett = 0;
    for (const it of p.items || []) {
      const w = eigen ? woodOf(it) : null;
      // oak and everything the forest cannot give is bought even in the own-timber variant
      const e = eigen && !(/eiche/i.test(it[0]) && it[5] != null && it[5] > 0 && it[5] < it[4]);
      n += net(it, e);
      if (w) {
        if (w.kant) kant += w.m3;
        else brett += w.m3;
      }
    }
    return { eur: Math.round(n * (1 + VAT)), net: Math.round(n), kant: +kant.toFixed(2), brett: +brett.toFixed(2) };
  }
  // the weather window: null (fits) or the first reason it does not – w: { rain mm/h, wind km/h, temp °C, storm }
  function wxFail(need, w, inside) {
    if (!need || inside) return null;
    if (w.storm) return { k: 'wind', text: 'Sturm' };
    if (need.dry && w.rain > 0.05) return { k: 'dry', text: 'es regnet – dafür muss es trocken sein' };
    if (need.rain != null && w.rain > need.rain) return { k: 'dry', text: 'zu starker Regen' };
    if (need.tMin != null && w.temp < need.tMin)
      return { k: 'tMin', text: `zu kalt (${Math.round(w.temp)} °C, nötig ab ${need.tMin} °C)` };
    if (need.wind != null && w.wind > need.wind)
      return { k: 'wind', text: `zu windig (${Math.round(w.wind)} km/h, höchstens ${need.wind})` };
    if (need.soil && w.temp < -1) return { k: 'soil', text: 'der Boden ist gefroren' };
    return null;
  }
  const wxText = need => {
    if (!need) return 'bei jedem Wetter (innen)';
    const p = [];
    if (need.dry) p.push('trocken');
    else if (need.rain != null) p.push('höchstens leichter Regen');
    if (need.tMin != null) p.push('ab ' + need.tMin + ' °C');
    if (need.wind != null) p.push('Wind bis ' + need.wind + ' km/h');
    if (need.soil) p.push('Boden nicht gefroren');
    return p.join(', ') || 'kein Sturm';
  };
  // mean air temperature by month near Ratscher (about 450 m; DWD station Meiningen 1991–2020, rounded) and the daily swing
  const TEMP = [-0.4, 0.5, 3.8, 8.2, 12.4, 15.6, 17.5, 17.1, 12.9, 8.4, 3.8, 0.7];
  const SWING = [3, 3.5, 4.5, 5.5, 6, 6, 6, 6, 5.5, 4.5, 3, 2.5];
  const TEMP_SRC = 'Klima Meiningen (DWD, Mittel 1991–2020), Tag für Tag gewürfelt';
  // the temperature at a minute of a day of month mo (0–11), dev: the day's deviation (−1 … 1)
  const tempAt = (mo, min, dev) => TEMP[mo] + dev * 4.5 + SWING[mo] * Math.cos(((min / 60 - 15) / 24) * 2 * Math.PI);

  // ---- the garden from above ----
  const GARDEN = {
    // prices of the nursery and the protection (no prices in the nursery's receipt of the world – assumptions)
    tree: { eur: 65, src: 'Annahme: Obstbaum Halbstamm im Container 2026 um 45–90 €' },
    bush: { eur: 18, src: 'Annahme: Beerenstrauch oder Staude im Container um 8–25 €' },
    korb: { eur: 12, src: 'Annahme: Wühlmauskorb aus verzinktem Draht' },
    pfahl: { eur: 9, src: 'Annahme: Baumpfahl und Kokosstrick' },
    schutz: { eur: 16, src: 'Annahme: Drahthose 1,5 m oder Wuchshülle, dazu Weißanstrich' },
    kg: { eur: 2.8, src: 'Annahme: Tafelobst aus eigenem Anbau am Marktstand um 2,50–3,50 €/kg' },
    stand: { eur: 10, src: 'Annahme: Standgebühr Wochenmarkt Schleusingen' },
    // how long a harvest keeps (days): apples and quinces in a cool cellar, nuts dried; cherries and plums only days
    keep: { apfel: 120, birne: 50, quitte: 70, walnuss: 300, mispel: 30, speierling: 20, elsbeere: 20 },
    keepDef: 6,
    learn: {
      pflanzen:
        'Obstbäume pflanzt man in der Vegetationsruhe, von Oktober bis April, solange der Boden offen ist: Pflanzloch so weit wie der Wurzelballen plus eine Handbreit, Wühlmauskorb hinein, Pfahl auf der Westseite (Hauptwind), die Veredelungsstelle eine Handbreit über dem Boden, kräftig angießen.',
      pflanzenSrc: 'Pflanzen-Datenbank des Gartenplaners (Pflanzzeit, Schutz); Obstbau-Praxis',
      giessen:
        'Junge Bäume brauchen in den ersten zwei Sommern bei Trockenheit Wasser: lieber einmal in der Woche 20–30 Liter durchdringend als täglich ein wenig – so wachsen die Wurzeln in die Tiefe.',
      giessenSrc: 'Gartenplaner (Gießen in den ersten zwei Sommern); Obstbau-Praxis',
      schutz:
        'Rehe verbeißen Knospen und Triebe bis in etwa 1,2 m Höhe, besonders im Winter und Frühjahr; im April und Mai fegen die Böcke den Bast vom Gehörn an jungen Stämmen. Eine Drahthose oder Wuchshülle hält sie ab, ein Weißanstrich schützt die Rinde vor Frostrissen in der Wintersonne.',
      schutzSrc: 'Forstliche Praxis zu Wildschäden; Pflanzen-Datenbank (Schutz: Verbiss, Stamm)',
      schneiden:
        'Erziehungsschnitt im Spätwinter: eine Mitte und drei bis vier Leitäste in gleicher Höhe (Saftwaage); Winterschnitt regt das Wachstum an, Sommerschnitt bremst es.',
      schneidenSrc: 'Pflanzen-Datenbank des Gartenplaners (Pflege); Obstbau-Praxis',
      ernten:
        'Ein Halbstamm trägt ab dem vierten, fünften Jahr; Äpfel wie ‚Rebella‘ sind Mitte September pflückreif und im kühlen Keller bis Dezember genussreif – Kirschen und Zwetschen halten nur Tage.',
      erntenSrc: 'Pflanzen-Datenbank des Gartenplaners (Ernte, Ertragsbeginn)',
      paar: 'Äpfel sind selbststeril: ‚Rebella‘ trägt nur mit einem Befruchter in der Nähe, der zur selben Zeit blüht – etwa ‚Rewena‘ aus derselben Pillnitzer Züchtung. Bienen tragen den Pollen.',
      paarSrc: 'Pflanzen-Datenbank des Gartenplaners (Befruchtung); JKI Pillnitz',
      abstand:
        'Kernobstbäume auf starker Unterlage (Halbstämme) müssen nach dem Thüringer Nachbarrecht mindestens 2 m von der Grenze stehen; damit die Krone (6–9 m) nicht überhängt, plant man eher 4 m.',
      abstandSrc: '§ 44 Nr. 2 Buchst. b ThürNRG; Pflanzen-Datenbank des Gartenplaners',
      einkochen:
        'Einkochen hält, was sonst verdirbt: Apfelmus heiß in sterile Gläser, bei etwa 90 °C eine halbe Stunde – im kühlen Keller ein Jahr haltbar.',
      einkochenSrc: 'Haushaltspraxis (Einkochen); Annahme: 1 kg Obst gibt etwa zwei Mahlzeiten als Beilage',
      ronald:
        'Ronald kennt die alten Obstsorten des Dorfs und schneidet seit Jahrzehnten: mit ihm geht der Schnitt schneller und sitzt besser.',
      schenken:
        'Ein Korb Äpfel für die Nachbarn: Auf dem Dorf ist das Geben und Nehmen die Währung der Nachbarschaftshilfe.',
      verkaufen:
        'Direktvermarktung: Kleine Mengen Obst aus dem eigenen Garten darf man auf dem Wochenmarkt anbieten; gewogen wird mit einer geeichten Waage.',
      verkaufenSrc: 'Eichrecht (Mess- und Eichgesetz: geeichte Waage beim Verkauf nach Gewicht); Annahme: Marktpreis',
    },
    // the suggestion from above when nothing is planned: an apple and its pollinator, side by side (gplan ids)
    pair: ['apfel-rebella', 'apfel-rewena'],
    // free places for the suggestion (site metres): the meadow west of the path, south of the atelier, 7,5 m apart (Halbstämme, crowns
    // 6–9 m) – east of the path stands the garage from phase 1 on
    spots: [
      [-5, -14],
      [-5, -21.5],
      [-4.5, -6.5],
      [-3.5, 10],
      [10.5, 5],
      [10.5, -2.5],
    ],
    // browsing without the animals' module (feat/tiere): chance a day for an unprotected young tree (winter/spring, summer/autumn)
    browse: [0.012, 0.003],
    browseSrc: 'Annahme des Spiels ohne das Tier-Modul (feat/tiere): Rehe ziehen vom Waldrand bis in die Gärten',
  };
  return {
    VAT,
    LAW,
    PREP,
    PH,
    AGES,
    LEAD,
    LEAD_SRC,
    KONTO,
    SLAB,
    slabOk,
    WX_SRC,
    personHours,
    crewMinutes,
    woodOf,
    phaseCost,
    eigenKind,
    wxFail,
    wxText,
    TEMP,
    TEMP_SRC,
    tempAt,
    GARDEN,
  };
})();
