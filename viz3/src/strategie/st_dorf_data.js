// ===================== feat/strategie-dorf: the village in „Ratscher von oben“ – data (STDDATA) =====================
// Falko 5.11.2026 23:14/23:30: village projects and reputation, the village budget and infrastructure (SimCity), land to lease or buy
// instead of conquest, crisis missions with the volunteer fire brigade (C&C / StarCraft, but real), exploration – and above all: one
// learns how it really works (who decides, what it costs, who helps, how long), every step with its source. Pure data (no imports).
// The opinions of the villagers are not kept here: they are the Ortsvorsteher system's (amt/amt_model.js, AMT.ST.rep) – one copy only.
// Where a number has no source, it says „Annahme“ (an assumption, stated). Researched 6.11.2026.
export const STDDATA = (() => {
  // ---- the places of the village on the playing field (site metres; the school's real position comes from world/village.js at run time) ----
  const PLACES = {
    anger: { name: 'Anger mit der Dorflinde', icon: '♧', pos: [222, -108], r: 16, order: 100 },
    schule: { name: 'Alte Schule (Ortsteilrat, Feuerwehr)', icon: '⌂', pos: [236, -121], r: 10, order: 101 },
    haltestelle: { name: 'Bushaltestelle Ratscher', icon: '⊓', pos: [250.6, -99.6], r: 8, order: 102 },
    rathaus: { name: 'Rathaus Schleusingen', icon: '⚖', pos: [-1060, 1250], r: 30, order: 103 },
  };
  // ---- the villagers as one gets to know them (exploration: known only after someone talked to them) ----
  // need: the project they bring; knows: who they know (who knows whom); help: what they can do for a project; tip: what one learns
  const PEOPLE = {
    ingrid: {
      need: 'mitfahrbank',
      knows: ['gerhard', 'manfred', 'katrin'],
      help: 'kennt alle Wege im Rathaus',
      tip: 'Ingrid ist seit elf Jahren Ortsteilbürgermeisterin. Wer etwas im Dorf will, fragt erst sie – sie weiß, ob es der Ortsteilrat selbst entscheiden kann oder die Stadt.',
    },
    gerhard: {
      need: 'tafel',
      need2: 'streuobst',
      knows: ['ingrid', 'heike'],
      help: 'schreibt Texte, kennt alte Obstsorten',
      tip: 'Gerhard schreibt die Dorfchronik. Am Hang hinter dem Dorf stand bis in die 1970er eine Streuobstwiese – alte Apfel- und Birnensorten, die heute kaum noch einer kennt.',
    },
    manfred: {
      need: 'kirmes',
      need2: 'feuerwehr',
      knows: ['jens', 'uwe', 'wolfgang'],
      help: 'Wehrführer: die Feuerwehr packt an',
      tip: 'Manfred führt die Freiwillige Feuerwehr. Sein Sorge: unter der Woche sind tagsüber kaum Leute im Dorf, die ausrücken können.',
    },
    wolfgang: {
      need: 'bushaus',
      knows: ['manfred', 'hubert'],
      help: 'Waldarbeiter, mit Motorsäge und Seilwinde',
      tip: 'Wolfgang arbeitet im Wald. Er weiß, welcher Weg nach einem Sturm zuerst zu ist.',
    },
    katrin: {
      need: 'laterne',
      knows: ['heike', 'ingrid'],
      help: 'organisiert die Eltern',
      tip: 'Katrin pflegt in der Stadt und hat zwei Kinder. Morgens um 7:12 fährt der Schulbus – im Winter ist es da noch stockdunkel.',
    },
    heike: {
      need: 'streuobst',
      knows: ['katrin', 'gerhard', 'ronald'],
      help: 'Garten, Hühner, kennt Pflanzen',
      tip: 'Heike verkauft Eier am Gartentor. Eine Streuobstwiese mit Bienen und Wildblumen hätte sie gern in der Nähe.',
    },
    jens: {
      need: 'glasfaser',
      need2: 'feuerwehr',
      knows: ['manfred', 'uwe'],
      help: 'Kfz-Mechaniker, Gruppenführer der Feuerwehr',
      tip: 'Jens ist Gruppenführer bei der Feuerwehr. Wenn er in Schleusingen in der Werkstatt steht, ist er bei einem Alarm 20 Minuten weg.',
    },
    uwe: {
      need: 'pacht',
      knows: ['manfred', 'jens', 'hubert'],
      help: 'Landwirt mit Traktor und Hänger',
      tip: 'Uwe bewirtschaftet die Wiesen ums Dorf. Ein Stück am Hang bringt ihm wenig – das würde er verpachten oder verkaufen.',
    },
  };
  // ---- the village's projects: real steps (who decides, what it costs, who helps, how long), the result stands in the world ----
  // by: 'ortsteil' (the Ortsteilrat decides with its own money, § 45 (6) ThürKO), 'stadt' (the town council of Schleusingen), 'privat' (you,
  // with your money and your people, on your land). anl: the concern of the Ortsvorsteher system (amt/amt_data.js ANLIEGEN) it is – its
  // state and the thing in the world (AMT.ST.built) are the same as in the first-person game. Steps: job (your people work, optionally with
  // villagers), rat (the Ortsteilrat votes – amt/amt_model.js ortsrat), stadt (the town council – amt/amt_model.js council), bauhof (the
  // town's building yard does it: working days), foerder (a funding application), warten (a delivery, a permit).
  const PROJ = {
    mitfahrbank: {
      title: 'Mitfahrbank nach Schleusingen',
      from: 'ingrid',
      anl: 'mitfahrbank',
      by: 'ortsteil',
      cost: 380,
      build: 'mitfahrbank',
      place: 'haltestelle',
      text: 'Eine Bank an der Haltestelle mit Schild: Wer sich setzt, will mitgenommen werden – nach Schleusingen, wenn am Wochenende kein Bus fährt.',
      learn:
        'Mitfahrbänke gibt es in vielen Dörfern: Wer kein Auto hat, setzt sich und klappt das Schild mit dem Ziel aus; Autofahrer aus dem Ort halten an. Rechtlich ist es eine private Mitnahme ohne Entgelt, wie Trampen.',
      src: 'Kosten Annahme (Bank, Schild, Fundament 300–600 €); § 45 Abs. 6 ThürKO (Geld des Ortsteils)',
      steps: [
        {
          k: 'job',
          label: 'Standort und Schild klären',
          place: 'haltestelle',
          people: [1, 2],
          skill: 'reden',
          min: 2,
          dur: 90,
          help: ['ingrid'],
          text: 'Mit Ingrid und dem Bauhof den Platz an der Haltestelle festlegen: gut sichtbar für Autofahrer, mit Platz zum Halten.',
          learn:
            'Eine Mitfahrbank braucht eine Stelle, an der ein Auto gefahrlos halten kann – nicht direkt in der Kurve, nicht auf dem Gehweg.',
        },
        { k: 'rat' },
        {
          k: 'job',
          label: 'Bank aufstellen',
          place: 'haltestelle',
          people: [2, 3],
          skill: 'bauen',
          min: 2,
          dur: 210,
          heavy: 0.6,
          help: ['jens', 'manfred'],
          text: 'Mit Jens und Manfred die Bank auf zwei Punktfundamente setzen und das Schild an den Pfosten schrauben.',
          learn:
            'Punktfundamente aus Beton (frostfrei, rund 80 cm tief) tragen Bank und Pfosten; der Beton braucht zwei Tage, bevor man sich setzt.',
        },
      ],
    },
    tafel: {
      title: 'Infotafel an der alten Schule',
      from: 'gerhard',
      anl: 'tafel',
      by: 'ortsteil',
      cost: 260,
      build: 'tafel',
      place: 'schule',
      text: 'Eine Tafel mit der Geschichte des Hauses: 1828 Schule, später Kindergarten, Gemeindeamt, Feuerwehr – die Texte schreibt Gerhard.',
      learn:
        'Die alte Schule von 1828 war über ein Jahrhundert das Herz des Dorfs: Unterricht für alle Jahrgänge in einem Raum, später Gemeindeamt. Seit 1994 gehört Ratscher zur Stadt Schleusingen.',
      src: 'Dorfchronik (Gerhard); Kosten Annahme (Druck auf Alu-Verbund, Pfosten)',
      steps: [
        {
          k: 'job',
          label: 'Texte und Bilder mit Gerhard',
          place: 'schule',
          people: [1, 2],
          skill: 'reden',
          min: 1,
          dur: 150,
          help: ['gerhard'],
          text: 'Mit Gerhard die Chronik durchsehen, alte Fotos auswählen, kurze Texte schreiben.',
          learn: 'Eine gute Tafel hat wenig Text: drei Absätze, zwei Bilder, eine Jahreszahl groß.',
        },
        { k: 'rat' },
        { k: 'warten', days: 5, text: 'Die Tafel wird gedruckt (Druckerei in Hildburghausen).' },
        {
          k: 'job',
          label: 'Tafel aufstellen',
          place: 'schule',
          people: [1, 2],
          skill: 'bauen',
          min: 1,
          dur: 90,
          help: ['gerhard'],
          text: 'Zwei Pfosten in Bodenhülsen, die Tafel daran.',
        },
      ],
    },
    kirmes: {
      title: 'Kirmes in Ratscher',
      from: 'manfred',
      anl: 'kirmes',
      by: 'ortsteil',
      cost: 450,
      build: 'kirmes',
      place: 'anger',
      text: 'Die Kirmes zurückholen: Festzelt am Anger, Blasmusik, Kuchen von jedem Hof – die Feuerwehr richtet sie aus, der Ortsteil gibt einen Zuschuss.',
      learn:
        'Die Kirmes ist in Thüringen das Fest der Kirchweih – meist im Herbst nach der Ernte, mit Kirmesbaum, Tanz und Kuchen. Ein Ausschank braucht eine vorübergehende Gestattung der Stadt (Thüringer Gaststättengesetz).',
      src: 'Thüringer Brauchtum; § 45 Abs. 6 ThürKO (Brauchtum aus dem Geld des Ortsteils); Thüringer Gaststättengesetz',
      steps: [
        {
          k: 'job',
          label: 'Helfer gewinnen und planen',
          place: 'anger',
          people: [1, 3],
          skill: 'reden',
          min: 2,
          dur: 180,
          help: ['manfred', 'jens'],
          text: 'Mit Manfred und Jens klären: wer backt, wer schenkt aus, welche Kapelle spielt, wer stellt das Zelt.',
          learn:
            'Ein Dorffest lebt von vielen Händen: Kuchen, Zelt, Musik, Ausschank, Aufräumen – und jemandem, der die Liste führt.',
        },
        { k: 'rat' },
        {
          k: 'warten',
          days: 4,
          text: 'Die Stadt erteilt die Gestattung für den Ausschank; die Kapelle sagt zu.',
        },
      ],
    },
    bushaus: {
      title: 'Bushäuschen: Dach und Fahrplan',
      from: 'wolfgang',
      anl: 'bushaus',
      by: 'stadt',
      cost: 1600,
      build: 'bushaus',
      place: 'haltestelle',
      text: 'Das Dach des Wartehäuschens ist undicht, der Fahrplan fehlt seit dem Winter. Die Haltestelle gehört der Stadt – der Ortsteilrat kann es nur vorschlagen.',
      learn:
        'Den Busverkehr bestellt in Thüringen der Landkreis (Aufgabenträger nach dem ÖPNV-Gesetz); das Wartehäuschen gehört meist der Stadt. Den Fahrplanaushang bringt das Busunternehmen.',
      src: 'Thüringer Gesetz über den öffentlichen Personennahverkehr (ThürÖPNVG); Kosten Annahme',
      steps: [
        {
          k: 'job',
          label: 'Schaden aufnehmen (Fotos, Maße)',
          place: 'haltestelle',
          people: [1, 2],
          skill: 'bauen',
          min: 1,
          dur: 60,
          help: ['wolfgang'],
          text: 'Mit Wolfgang das Dach ansehen, Fotos und Maße für das Bauamt – damit es eine Kostenschätzung gibt.',
          learn:
            'Ein Antrag mit Fotos, Maßen und einer Kostenschätzung kommt im Stadtrat viel weiter als „da müsste mal was passieren“.',
          prep: true,
        },
        { k: 'rat' },
        { k: 'stadt' },
        { k: 'bauhof', days: 5, text: 'Der Bauhof deckt das Dach neu und bringt den Fahrplan.' },
      ],
    },
    laterne: {
      title: 'LED-Laterne am Gartenweg',
      from: 'katrin',
      anl: 'laterne',
      by: 'stadt',
      cost: 4200,
      build: 'laterne',
      place: 'anger',
      text: 'Eine neue Straßenlaterne am Weg zu den Gärten: LED, warmweiß, abgeschirmt, mit Bewegungsmelder – hell, wenn jemand kommt, sonst dunkel für Sterne und Insekten.',
      learn:
        'LED-Straßenleuchten brauchen ein Drittel bis ein Viertel des Stroms alter Quecksilber- oder Natriumdampflampen. Die Kommunalrichtlinie des Bundes fördert die Umrüstung (25 %, mit adaptiver Steuerung 40 %), wenn sie mindestens die Hälfte CO₂ spart und höchstens 3000 Kelvin hat – wegen der Insekten.',
      src: 'Kommunalrichtlinie (Nationale Klimaschutzinitiative) 2022–2027, Außen- und Straßenbeleuchtung; Kosten Annahme',
      steps: [
        {
          k: 'job',
          label: 'Mit den Nachbarn reden',
          place: 'anger',
          people: [1, 2],
          skill: 'reden',
          min: 2,
          dur: 90,
          help: ['katrin', 'gerhard'],
          text: 'Katrin will Licht, Gerhard den dunklen Himmel: eine abgeschirmte, warmweiße Leuchte mit Bewegungsmelder ist der Kompromiss.',
          learn: 'Ein Kompromiss, der beide Seiten ernst nimmt, trägt im Rat weiter als eine knappe Mehrheit.',
          prep: true,
          pos: 'mitte',
        },
        { k: 'rat' },
        { k: 'stadt' },
        { k: 'bauhof', days: 6, text: 'Die Stadt beauftragt die Elektrofirma: Kabel, Mast, Leuchte.' },
      ],
    },
  };
  // ---- the money: the Ortsteil's (amt: 600 € a year, § 45 (6) ThürKO), the town's for small matters (simplified as in amt/amt.js) ----
  const CITY = 12000;
  // ---- the Ortsteilrat and the town council: when they meet (simplified, said so in the game) ----
  // Ortsteilrat: called by the chair with the agenda – here on the next Friday or Saturday evening at least three days on (so that you can
  // be there: your people are in Ratscher at weekends); the town council in Schleusingen on Thursdays (amt/amt_data.js: really about monthly)
  const RAT = {
    lead: 3,
    hour: 20 * 60,
    src: '§ 45 ThürKO; Ladung mit Tagesordnung nach der Geschäftsordnung (Frist hier Annahme: drei Tage)',
  };
  const STADT = { wd: 4, hour: 18 * 60 };
  // ---- learning: what one should know (shown in the panels with „Warum?“) ----
  const RULES = {
    ortsteil_geld: {
      text: 'Das Geld des Ortsteils reicht dafür nicht.',
      why: 'Über Geld für Kultur, Brauchtum, Soziales und die Ortsfeuerwehr entscheidet der Ortsteilrat selbst – rund 5 € je Einwohner im Jahr, für Ratscher etwa 600 €. Was übrig ist, verfällt am Jahresende; ab Januar gibt es neues.',
      src: '§ 45 Abs. 6 Thüringer Kommunalordnung (ThürKO)',
    },
    stadt_entscheidet: {
      text: 'Darüber entscheidet die Stadt.',
      why: 'Straßen, Laternen, Haltestellen und der Bauhof sind Sache der Stadt Schleusingen: Der Ortsteilrat schlägt vor, der Stadtrat beschließt, die Stadt muss den Vorschlag binnen drei Monaten behandeln.',
      src: '§ 45 Abs. 5 ThürKO',
    },
    gleichstand: {
      text: 'Bei Stimmengleichheit ist ein Antrag abgelehnt.',
      why: 'So gilt es für alle kommunalen Gremien in Thüringen: Ein Beschluss braucht mehr Ja- als Nein-Stimmen.',
      src: '§ 39 Abs. 1 ThürKO',
    },
    abends: {
      text: 'Im Dorf redet man nicht nach 21 Uhr an der Haustür.',
      why: 'Wer abends spät klingelt, stört – die Leute stehen früh auf. Gespräche im Dorf tagsüber oder freitags in der alten Schule.',
      src: 'Dorfleben (dorf/*): so halten es die Leute in Ratscher',
    },
  };
  // ---- the chapter (plan section 6: chapter 5 · Das Dorf) ----
  const CHAPTER = {
    id: 'k5',
    title: 'Kapitel 5 · Das Dorf',
    text: 'Mit den Leuten reden, ihre Anliegen kennen, Projekte durch Ortsteilrat und Stadtrat bringen – das Dorf verändert sich sichtbar.',
  };
  return { PLACES, PEOPLE, PROJ, CITY, RAT, STADT, RULES, CHAPTER };
})();
