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
    flur: { name: 'Flur: Land pachten oder kaufen', icon: '▦', pos: [130, -5], r: 30, order: 104 },
    baumschule: { name: 'Baumschule bei Kloster Veßra', icon: '♠', pos: [-4060, 2400], r: 30, order: 105 },
  };
  // ---- the villagers as one gets to know them (exploration: known only after someone talked to them) ----
  // need: the project they bring; knows: who they know (who knows whom); help: what they can do for a project; tip: what one learns
  const PEOPLE = {
    ingrid: {
      need: 'mitfahrbank',
      need2: 'treffpunkt',
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
      need2: 'led',
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
    // ---- land instead of conquest (Falko 23:30, SimCity / Siedler): leases and purchases with the owner's consent at fair prices ----
    pacht_hangwiese: {
      title: 'Hangwiese pachten (0,35 ha)',
      from: 'uwe',
      land: 'hangwiese',
      deal: 'pacht',
      by: 'privat',
      place: 'flur',
      text: 'Uwe verpachtet die Wiese am Hang zwischen Garten und Dorf – zwölf Jahre, damit sich Bäume darauf lohnen.',
      learn:
        'Ein Landpachtvertrag über mehr als zwei Jahre gehört schriftlich gemacht (sonst gilt er als unbefristet), und der Verpächter zeigt ihn binnen eines Monats der Landwirtschaftsbehörde an. Pacht wird traditionell zu Martini (11. November) gezahlt.',
      src: '§§ 585 ff., 585a BGB; Landpachtverkehrsgesetz § 2; Neupacht Ackerland Thüringen 2023: 257 €/ha (Agrarstrukturerhebung, via top agrar), Grünland am Hang Annahme 120 €/ha',
      steps: [
        {
          k: 'deal',
          label: 'Mit Uwe über die Pacht reden',
          place: 'flur',
          people: [1, 2],
          skill: 'reden',
          min: 1,
          dur: 60,
          help: ['uwe'],
          text: 'Mit Uwe die Wiese abgehen: Grenzen, Zufahrt, wie lange, wie viel – und was die Nachbarn sagen.',
          learn:
            'Ein fairer Preis ist der ortsübliche: Wer zu wenig bietet, verärgert den Eigentümer; wer mit den Nachbarn redet, hat später keinen Streit.',
        },
        {
          k: 'job',
          label: 'Pachtvertrag unterschreiben',
          place: 'anger',
          people: [1, 1],
          skill: 'reden',
          min: 1,
          dur: 45,
          pay: 'land',
          help: ['uwe'],
          text: 'Bei Uwe am Küchentisch: Vertrag, zwei Unterschriften, die erste Jahrespacht.',
        },
      ],
    },
    kauf_hangwiese: {
      title: 'Hangwiese kaufen (0,35 ha)',
      from: 'uwe',
      land: 'hangwiese',
      deal: 'kauf',
      by: 'privat',
      place: 'flur',
      text: 'Die Wiese am Hang kaufen: ein Notarvertrag, die Genehmigung der Behörde, das Grundbuch – dann gehört sie dir.',
      learn:
        'Grundstückskaufverträge brauchen den Notar. In Thüringen kostet die Grunderwerbsteuer seit 1.1.2024 5 % des Preises (vorher 6,5 %); Notar und Grundbuch etwa 2 %. Der Kauf land- und forstwirtschaftlicher Flächen über der Freigrenze des Landes braucht eine Genehmigung nach dem Grundstückverkehrsgesetz – und ein Siedlungsunternehmen kann für Landwirte vorkaufen.',
      src: '§ 311b BGB; Grunderwerbsteuer Thüringen 5 % seit 1.1.2024 (finanz.de); Grundstückverkehrsgesetz; Kaufwerte: Thüringen Ackerland 2024 im Mittel 14.900 €/ha (Destatis via top agrar), Südthüringen deutlich darunter (Suhl 2020: 5.358 €/ha, TLS) – Grünland am Hang Annahme 0,90 €/m²',
      steps: [
        {
          k: 'deal',
          label: 'Mit Uwe über den Kauf reden',
          place: 'flur',
          people: [1, 2],
          skill: 'reden',
          min: 2,
          dur: 75,
          help: ['uwe'],
          text: 'Uwe würde verkaufen, wenn der Preis stimmt und die Wiese in guten Händen ist.',
          learn: 'Wer im Dorf Land kauft, kauft auch Vertrauen: Die Leute fragen, was du damit vorhast.',
        },
        {
          k: 'job',
          label: 'Kaufvertrag beim Notar',
          place: 'rathaus',
          people: [1, 2],
          skill: 'reden',
          min: 1,
          dur: 120,
          pay: 'land',
          help: ['uwe'],
          text: 'Beim Notar in Schleusingen: Vertrag vorlesen, unterschreiben, Kaufpreis, Grunderwerbsteuer, Notar und Grundbuch.',
          learn:
            'Der Notar liest den ganzen Vertrag vor – so will es das Beurkundungsgesetz. Bezahlt wird erst, wenn die Genehmigungen da sind und die Auflassungsvormerkung im Grundbuch steht.',
        },
        {
          k: 'warten',
          days: 28,
          text: 'Genehmigung nach dem Grundstückverkehrsgesetz, dann die Eintragung ins Grundbuch.',
        },
      ],
    },
    pacht_acker: {
      title: 'Ackerstreifen pachten (0,25 ha)',
      from: 'uwe',
      land: 'acker',
      deal: 'pacht',
      by: 'privat',
      place: 'flur',
      text: 'Einen Streifen am Feldweg pachten – für Kartoffeln, Kürbisse und einen Blühstreifen für Insekten.',
      learn:
        'Thüringen hat mit die niedrigsten Pachtpreise Deutschlands: neu gepachtetes Ackerland kostete 2023 im Mittel 257 €/ha im Jahr, der Bundesschnitt 511 €/ha.',
      src: 'Agrarstrukturerhebung 2023 (Destatis, via top agrar); §§ 585 ff. BGB; Landpachtverkehrsgesetz § 2',
      steps: [
        {
          k: 'deal',
          label: 'Mit Uwe über den Streifen reden',
          place: 'flur',
          people: [1, 2],
          skill: 'reden',
          min: 1,
          dur: 45,
          help: ['uwe'],
          text: 'Welcher Streifen, wie lange, wer pflügt im Frühjahr.',
        },
        {
          k: 'job',
          label: 'Pachtvertrag unterschreiben',
          place: 'anger',
          people: [1, 1],
          skill: 'reden',
          min: 1,
          dur: 40,
          pay: 'land',
          help: ['uwe'],
          text: 'Vertrag, Unterschrift, die erste Jahrespacht.',
        },
      ],
    },
    kauf_wald: {
      title: 'Waldstück an der Klinge kaufen (0,8 ha)',
      from: 'wolfgang',
      land: 'wald',
      deal: 'kauf',
      by: 'privat',
      place: 'flur',
      text: 'Neben der Klinge will eine Erbengemeinschaft aus Suhl ihr Waldstück verkaufen: Fichte und Kiefer, ein paar Buchen am Rand. Wolfgang kennt es.',
      learn:
        'Beim Kauf von Wald zählt der Bestand: Holzarten, Alter, Vorrat in Festmetern, Käferschäden. Vor dem Kauf geht man ihn mit dem Revierförster ab. Das Thüringer Waldgesetz kennt beim Verkauf von Wald ein Vorkaufsrecht (§ 17) – der Notar holt die Erklärungen ein.',
      src: '§ 17 Thüringer Waldgesetz (Vorkaufsrecht); § 311b BGB; Preis Annahme 1,30 €/m² mit Bestand (kleine Privatwaldflächen in Thüringen 2026)',
      steps: [
        {
          k: 'deal',
          label: 'Waldbegang mit Wolfgang und dem Förster',
          place: 'klinge',
          people: [1, 2],
          skill: 'holz',
          min: 1,
          dur: 150,
          help: ['wolfgang'],
          where: 'wald',
          text: 'Das Stück abgehen: Grenzsteine suchen, Bäume schätzen, Käferlöcher, Zufahrt für den Traktor.',
          learn:
            'Fichten mit Bohrmehl am Stammfuß sind befallen; viele davon drücken den Wert. Ein gemischter Bestand ist mehr wert als reine Fichte.',
        },
        {
          k: 'job',
          label: 'Kaufvertrag beim Notar',
          place: 'rathaus',
          people: [1, 2],
          skill: 'reden',
          min: 1,
          dur: 120,
          pay: 'land',
          text: 'Notar in Schleusingen; die Erben unterschreiben per Vollmacht.',
        },
        {
          k: 'warten',
          days: 42,
          text: 'Vorkaufsrecht nach dem Waldgesetz und die Genehmigung abwarten, dann das Grundbuch.',
        },
      ],
    },
    // ---- a meadow orchard on your land (Gerhard remembers the old one, Heike wants bees): private, with the neighbours' help ----
    streuobst: {
      title: 'Streuobstwiese pflanzen',
      from: 'heike',
      needLand: 'hangwiese',
      by: 'privat',
      place: 'flur',
      cost: 864,
      build: 'streuobst',
      text: 'Zwölf hochstämmige Obstbäume alter Sorten auf der Hangwiese: Äpfel, Birnen, Zwetschgen – mit Wühlmauskorb, Pfahl und Drahthose gegen Rehe.',
      learn:
        'Streuobstwiesen gehören zu den artenreichsten Lebensräumen Mitteleuropas: Steinkauz, Gartenrotschwanz, Wildbienen, tausende Insektenarten. Seit 2022 sind sie nach § 30 Bundesnaturschutzgesetz geschützte Biotope. Hochstämme (Stammhöhe ab 1,60 m) stehen 10–12 m auseinander, damit darunter gemäht oder beweidet werden kann; gepflanzt wird im Herbst nach dem Laubfall oder im Frühjahr.',
      src: '§ 30 Abs. 2 Nr. 7 BNatSchG (Streuobstwiesen seit 2022); Kosten Annahme: Hochstamm 45 €, Pfahl und Bindung 12 €, Wühlmauskorb 5 €, Drahthose 10 € je Baum',
      steps: [
        {
          k: 'job',
          label: 'Sorten wählen mit Gerhard und Heike',
          place: 'flur',
          people: [1, 2],
          skill: 'garten',
          min: 1,
          dur: 90,
          help: ['gerhard', 'heike'],
          text: 'Gerhard kennt die alten Sorten der Gegend, Heike den Boden: robuste Hochstämme, die spät blühen (Spätfrost am Hang).',
          learn:
            'Alte Sorten wie Kaiser Wilhelm, Schöner von Boskoop, Gellerts Butterbirne oder die Hauszwetschge sind robust und brauchen kaum Spritzmittel.',
        },
        {
          k: 'job',
          label: '12 Hochstämme in der Baumschule holen',
          place: 'baumschule',
          people: [1, 2],
          skill: 'garten',
          min: 1,
          dur: 90,
          pay: 'proj',
          text: 'Mit Auto und Anhänger in die Baumschule bei Kloster Veßra: zwölf Bäume, Pfähle, Kokosstrick, Wühlmauskörbe, Drahthosen.',
        },
        {
          k: 'job',
          label: 'Pflanzen: Loch, Korb, Pfahl, Baum, Drahthose',
          place: 'flur',
          people: [2, 3],
          skill: 'garten',
          min: 2,
          dur: 420,
          heavy: 0.7,
          season: 'pflanzen',
          help: ['gerhard', 'heike'],
          text: 'Je Baum ein Loch von 60 cm, der Wühlmauskorb hinein, der Pfahl auf der Wetterseite, den Baum so tief wie in der Baumschule, angießen, Drahthose drum.',
          learn:
            'Der Pfahl steht auf der Westseite (Hauptwind), der Baum wird locker mit einer Achterschlinge angebunden; nach dem Pflanzen ein Pflanzschnitt, damit Krone und Wurzel im Gleichgewicht sind.',
        },
      ],
    },
    // ---- a funded project: LEADER (the EU programme for rural areas) – own share, deadline, selection, approval, no start before ----
    treffpunkt: {
      title: 'Treffpunkt am Anger (LEADER)',
      from: 'ingrid',
      by: 'stadt',
      cost: 24000,
      need: 60,
      foerder: 'leader',
      build: 'treffpunkt',
      place: 'anger',
      fans: { ingrid: 5, gerhard: 4, katrin: 4, heike: 3, manfred: 2 },
      text: 'Ein überdachter Treffpunkt am Anger: Sitzgruppe unter Dach, Fahrradständer, Ladesäule für E-Bikes – für Wanderer, Radler und die Alten, die sonst niemanden treffen.',
      learn:
        'LEADER fördert, was eine Region in ihrer Entwicklungsstrategie selbst als wichtig festgelegt hat. Die Regionale Aktionsgruppe wählt die Projekte zum Stichtag nach einer Bewertungsmatrix aus (Mindestpunktzahl), bewilligt wird beim Land. Den Rest – den Eigenanteil – trägt der Antragsteller, hier die Stadt.',
      src: 'IHK Erfurt: LEADER-Projektaufrufe 2027 (15 Regionen in Thüringen, u. a. Hildburghausen-Sonneberg; Bewertungsmatrix, Mindestpunktzahl); Kosten Annahme',
      steps: [
        {
          k: 'job',
          label: 'Beratung beim LEADER-Regionalmanagement',
          place: 'schule',
          people: [1, 2],
          skill: 'reden',
          min: 2,
          dur: 120,
          help: ['ingrid'],
          text: 'Die Regionalmanagerin kommt nach Ratscher: Passt die Idee zur Entwicklungsstrategie? Wer stellt den Antrag? Welche Punkte bringt sie?',
          learn:
            'Frühe Beratung ist der wichtigste Schritt: Die Regionalmanagements sagen, ob ein Projekt förderfähig ist, und helfen bei Skizze und Unterlagen.',
        },
        {
          k: 'job',
          label: 'Drei Angebote einholen, Kosten schätzen',
          place: 'schule',
          people: [1, 1],
          skill: 'reden',
          min: 1,
          dur: 150,
          prep: true,
          text: 'Zimmerei, Pflasterer, Elektriker: drei vergleichbare Angebote für jedes Gewerk – Förderstellen verlangen den Preisvergleich.',
          learn:
            'Wer öffentliches Geld ausgibt, muss wirtschaftlich und sparsam handeln: Angebote vergleichen und dokumentieren.',
        },
        { k: 'rat' },
        { k: 'stadt' },
        { k: 'foerder' },
        {
          k: 'bauhof',
          days: 10,
          text: 'Eine Zimmerei aus der Region baut die Hütte – erst jetzt, nach dem Bewilligungsbescheid.',
        },
        {
          k: 'job',
          label: 'Arbeitseinsatz: Pflaster, Bänke, Fahrradständer',
          place: 'anger',
          people: [2, 3],
          skill: 'bauen',
          min: 2,
          dur: 300,
          heavy: 0.6,
          help: ['jens', 'manfred', 'uwe'],
          text: 'Ein Samstag mit dem Dorf: Pflaster legen, Bänke montieren, den Fahrradständer setzen. Uwe bringt den Sand mit dem Traktor.',
        },
        {
          k: 'warten',
          days: 28,
          text: 'Verwendungsnachweis an das Land: Rechnungen, Fotos, Zahlungsbelege – dann wird die Förderung ausgezahlt.',
        },
      ],
    },
  };
  // ---- more of the village's needs: the fire brigade, the track, fibre (each known after talking to the one who needs it) ----
  Object.assign(PROJ, {
    feuerwehr: {
      title: 'Feuerwehr: Ausrüstung für Waldbrände',
      from: 'manfred',
      by: 'ortsteil',
      cost: 480,
      build: 'loeschrucksack',
      place: 'schule',
      fans: { manfred: 6, jens: 4, wolfgang: 2 },
      text: 'Vier Löschrucksäcke (je 20 l) und Feuerpatschen für die Feuerwehr Ratscher – damit sie ein Bodenfeuer angreifen kann, bevor das Tanklöschfahrzeug aus Schleusingen da ist.',
      learn:
        'Den Brandschutz trägt die Gemeinde (ThürBKG); der Ortsteilrat darf seine Ortsfeuerwehr aus dem eigenen Geld unterstützen. Beim Vegetationsbrand zählen die ersten Minuten: mit Löschrucksack und Feuerpatsche hält man ein Bodenfeuer an der Kante auf.',
      src: '§ 45 Abs. 6 ThürKO (Unterstützung der Ortsfeuerwehr); ThürBKG; Kosten Annahme (Löschrucksack um 90 €, Feuerpatsche um 30 €)',
      steps: [
        {
          k: 'job',
          label: 'Mit Manfred den Bedarf aufnehmen',
          place: 'schule',
          people: [1, 2],
          skill: 'reden',
          min: 1,
          dur: 60,
          help: ['manfred'],
          text: 'Im Gerätehaus: was ist da, was fehlt, was sagt der Kreisbrandinspektor.',
          learn:
            'Die Ausrüstung einer Feuerwehr richtet sich nach der Gefährdung im Ort – an der Klinge mit viel Fichte ist es der Vegetationsbrand.',
        },
        { k: 'rat' },
        { k: 'warten', days: 7, text: 'Bestellt beim Feuerwehrausstatter, Lieferung ins Gerätehaus.' },
      ],
    },
    feldweg: {
      title: 'Feldweg: Schotter in die Löcher',
      from: 'wolfgang',
      by: 'stadt',
      cost: 650,
      need: 50,
      build: 'schotter',
      place: 'flur',
      fans: { hubert: 5, wolfgang: 4, uwe: 3, ronald: 2 },
      text: 'Den Ausbau des Feldwegs zur Klinge (18.000 €) schiebt die Stadt vor sich her. Bis dahin: der Bauhof liefert Schotter, das Dorf füllt die Löcher an einem Samstag.',
      learn:
        'Feldwege gehören meist der Gemeinde; ein Ausbau ist teuer, ein Arbeitseinsatz mit Schotter vom Bauhof hält den Weg ein paar Jahre befahrbar. Schotter 0/32 verdichtet sich gut – mit Gefälle zur Seite, damit das Wasser abläuft.',
      src: 'Kommunale Praxis; Schotter 0/32 um 25 €/t, 20 t mit Anfahrt (Annahme)',
      steps: [
        {
          k: 'job',
          label: 'Die Löcher mit Wolfgang aufnehmen',
          place: 'flur',
          people: [1, 2],
          skill: 'bauen',
          min: 1,
          dur: 60,
          help: ['wolfgang'],
          prep: true,
          text: 'Den Weg abgehen, die schlimmsten Stellen zählen, Fotos für den Bauhof.',
        },
        { k: 'rat' },
        { k: 'stadt' },
        { k: 'bauhof', days: 4, text: 'Der Bauhof kippt 20 t Schotter am Wegrand ab.' },
        {
          k: 'job',
          label: 'Arbeitseinsatz: Schotter einbauen',
          place: 'flur',
          people: [2, 3],
          skill: 'bauen',
          min: 1,
          dur: 300,
          heavy: 0.8,
          help: ['hubert', 'uwe', 'wolfgang'],
          text: 'Mit Schaufel, Schubkarre und Uwes Traktor die Löcher füllen, mit der Rüttelplatte verdichten.',
        },
      ],
    },
    glasfaser: {
      title: 'Glasfaser für Ratscher',
      from: 'jens',
      by: 'privat',
      cost: 0,
      build: 'glasfaser',
      place: 'schule',
      quota: 0.4,
      hh: 55,
      fans: { jens: 5, katrin: 4, heike: 2, ingrid: 2 },
      text: 'Ein Anbieter baut Glasfaser bis ins Haus – wenn sich genug Haushalte vorher verpflichten (Nachfragebündelung). Sonst bleibt Ratscher beim langsamen Kupferkabel.',
      learn:
        'Beim eigenwirtschaftlichen Ausbau rechnet der Anbieter: Tiefbau auf dem Land kostet viel je Meter, also baut er nur, wenn genug Haushalte vorab einen Vertrag schließen – meist 33–40 %. Wo das nie reicht, kann gefördert ausgebaut werden (Gigabit-Förderung des Bundes mit dem Land).',
      src: 'Nachfragebündelung der Glasfaseranbieter (Quote hier Annahme 40 %); Gigabit-Richtlinie des Bundes; Ratscher rund 120 Einwohner, 55 Haushalte (Annahme)',
      steps: [
        {
          k: 'job',
          label: 'Infoabend in der alten Schule',
          place: 'schule',
          people: [1, 2],
          skill: 'reden',
          min: 2,
          dur: 120,
          help: ['jens'],
          anytime: true,
          text: 'Mit Jens und dem Anbieter: was Glasfaser bringt, was es kostet, warum die Quote zählt.',
          learn: 'Wer selbst erklärt, statt Prospekte zu verteilen, überzeugt: Nachbarn fragen Nachbarn.',
        },
        {
          k: 'job',
          label: 'Von Tür zu Tür',
          place: 'anger',
          people: [1, 2],
          skill: 'reden',
          min: 2,
          dur: 240,
          heavy: 0.4,
          text: 'Klingeln, erklären, Fragen beantworten – vor allem bei den Älteren, die kein Internet zu brauchen glauben.',
          door: true,
        },
        { k: 'quote', days: 42, text: 'Vorvermarktung: Haushalte unterschreiben bis zum Stichtag.' },
        { k: 'bauhof', days: 20, text: 'Die Tiefbaufirma legt Leerrohre, der Netzverteiler kommt an den Anger.' },
      ],
    },
  });
  // ---- all street lamps of Ratscher to LED: the town's project, funded by the federal Kommunalrichtlinie (no call deadline) ----
  PROJ.led = {
    title: 'Straßenbeleuchtung auf LED umrüsten',
    from: 'katrin',
    by: 'stadt',
    cost: 9100,
    need: 55,
    foerder: 'krl',
    build: 'led',
    place: 'anger',
    fans: { katrin: 4, gerhard: 4, ingrid: 3, heike: 2 },
    text: 'Die 14 Straßenleuchten von Ratscher bekommen LED-Köpfe: warmweiß (höchstens 3000 Kelvin), nach unten abgeschirmt, nachts ab 22 Uhr halb so hell.',
    learn:
      'Alte Quecksilber- oder Natriumdampfleuchten brauchen je 70–125 W, LED-Köpfe 15–25 W. 14 Leuchten × gut 4000 Stunden im Jahr: rund 3.000 kWh weniger – bei 0,30 €/kWh etwa 900 € im Jahr. Die Kommunalrichtlinie fördert das mit 25 % (zeit- oder präsenzabhängig geschaltet) oder 40 % (adaptiv geregelt), wenn es mindestens die Hälfte CO₂ spart; warmweißes Licht lockt weniger Insekten.',
    src: 'Kommunalrichtlinie 2022–2027 (Nationale Klimaschutzinitiative), Außen- und Straßenbeleuchtung: 25 %/40 %, CO₂-Minderung ≥ 50 %, max. 3000 K; Kosten (650 € je Leuchtenkopf mit Einbau) und Strompreis Annahme',
    steps: [
      {
        k: 'job',
        label: 'Leuchten zählen, Verbrauch schätzen',
        place: 'anger',
        people: [1, 2],
        skill: 'maschinen',
        min: 2,
        dur: 90,
        help: ['katrin'],
        prep: true,
        text: 'Mit Katrin abends durchs Dorf: wie viele Leuchten, welche Lampen, wie lange sie brennen – die Zahlen für den Antrag.',
        learn:
          'Ein Förderantrag braucht eine Einsparprognose: alte und neue Leistung, Brennstunden im Jahr, daraus die eingesparten kWh und das CO₂.',
      },
      { k: 'rat' },
      { k: 'stadt' },
      { k: 'foerder' },
      { k: 'bauhof', days: 3, text: 'Die Elektrofirma tauscht die Leuchtenköpfe – erst nach dem Zuwendungsbescheid.' },
    ],
  };
  // ---- neighbourly help: small things one does for people (their opinion grows; Falko's „your style shapes the world“) ----
  const HILFE = {
    heike: {
      label: 'Heike beim Hühnerstall helfen',
      place: 'anger',
      skill: 'bauen',
      dur: 120,
      eff: { heike: 5, katrin: 1 },
      text: 'Das Dach des Hühnerstalls flicken, bevor der Winter kommt – Heike gibt Eier mit.',
      learn:
        'Hühner brauchen einen trockenen, zugfreien Stall und einen fuchssicheren Auslauf; der Fuchs gräbt unter Zäunen durch.',
    },
    gerhard: {
      label: 'Gerhard beim Schulboden helfen',
      place: 'schule',
      skill: 'reden',
      dur: 120,
      eff: { gerhard: 5, ingrid: 1 },
      text: 'Auf dem Dachboden der alten Schule alte Kisten sichten: Zeugnisse, Fotos, ein Schulbuch von 1910 – für die Dorfchronik.',
      learn:
        'Bis in die 1960er lernten in Dorfschulen oft alle Jahrgänge in einem Raum; der Lehrer wohnte im Haus. Ratscher war bis 1994 eine eigene Gemeinde im Kreis Hildburghausen; seitdem ist es ein Ortsteil der Stadt Schleusingen.',
      find: 'geschichte',
    },
    ingrid: {
      label: 'Ingrid zum Arzt fahren',
      place: 'anger',
      skill: 'reden',
      dur: 100,
      eff: { ingrid: 5, gerhard: 1 },
      text: 'Ingrids Auto ist in der Werkstatt – jemand fährt sie zur Praxis nach Schleusingen und wartet.',
      learn:
        'Auf dem Land ist ohne Auto vieles weit: die Arztpraxis, der Supermarkt, die Apotheke. Mitfahrbank, Bürgerbus und Nachbarschaftshilfe füllen die Lücken.',
    },
    wolfgang: {
      label: 'Wolfgang beim Holzspalten helfen',
      place: 'anger',
      skill: 'holz',
      dur: 150,
      eff: { wolfgang: 5, manfred: 1 },
      text: 'Wolfgangs Winterholz spalten und aufsetzen – er erzählt dabei vom Wald an der Klinge.',
      learn:
        'Brennholz trocknet am besten gespalten, luftig gestapelt, mit Dach und offener Seite zum Wind – unter 20 % Feuchte brennt es sauber.',
    },
  };
  // ---- the fire brigade's basic training for your people (they become members and help better at a mission) ----
  const KURS_FW = {
    title: 'Grundausbildung Feuerwehr (Truppmann)',
    days: 2,
    text: 'Knoten und Stiche, Schläuche kuppeln, Leitern, Atemschutz kennenlernen, Erste Hilfe, Funk – Truppmann Teil 1 bei der Kreisausbildung (wirklich rund 70 Stunden an Abenden und Wochenenden; im Spiel zwei Lehrgangstage).',
    src: 'Feuerwehr-Dienstvorschrift FwDV 2 (Ausbildung der Freiwilligen Feuerwehren); Thüringer Feuerwehrschule',
  };
  // ---- land: the plots one can lease or buy (positions on the open ground between garden and village from the orthophoto 2024 –
  // rectangles of the game, no real parcels; owners from the village) ----
  const LAND = {
    hangwiese: {
      name: 'Hangwiese',
      kind: 'Grünland',
      c: [130, -5],
      w: 60,
      h: 58,
      ha: 0.35,
      owner: 'uwe',
      pacht: 120,
      kauf: 0.9,
      neighbours: ['heike', 'ronald'],
      use: 'Streuobstwiese, Heu, Ziegen von Ronald',
    },
    acker: {
      name: 'Ackerstreifen am Feldweg',
      kind: 'Ackerland',
      c: [35, 86],
      w: 80,
      h: 31,
      ha: 0.25,
      owner: 'uwe',
      pacht: 257,
      kauf: 1.2,
      neighbours: [],
      use: 'Kartoffeln, Kürbisse, ein Blühstreifen',
    },
    wald: {
      name: 'Waldstück an der Klinge',
      kind: 'Wald',
      c: [-520, -660],
      w: 90,
      h: 90,
      ha: 0.81,
      owner: null,
      ownerName: 'eine Erbengemeinschaft aus Suhl',
      kauf: 1.3,
      neighbours: ['hubert'],
      use: 'mehr eigenes Holz; Waldumbau zum Mischwald',
    },
  };
  // purchase costs beyond the price (Thuringia): land transfer tax 5 % since 1.1.2024, notary and land register about 2 % (assumption)
  const KAUF = { grest: 0.05, notar: 0.02 };
  // ---- funding programmes ----
  // LEADER: deadlines of the project calls (assumption: two a year, as many Thuringian regions in 2026 – e.g. 30 September), the action
  // group's decision a few weeks later by points (assumption: the criteria below, minimum 22), then the approval by the state office
  const FOERDER = {
    leader: {
      title: 'LEADER – Regionale Aktionsgruppe Hildburghausen-Sonneberg',
      rate: 0.65,
      calls: [
        [3, 31],
        [9, 30],
      ],
      prep: 7,
      select: 21,
      approve: 42,
      min: 24,
      src: 'IHK Erfurt, LEADER-Projektaufrufe 2027 (Stichtage z. B. 30.9.2026, Bewertungsmatrix); Bewilligung beim Thüringer Landesamt für Landwirtschaft und Ländlichen Raum (TLLLR); Fördersatz 65 % und Punkte hier Annahme – jede Region legt sie in ihrer Entwicklungsstrategie fest',
      learn:
        'Nie vor dem Bewilligungsbescheid anfangen: Gefördert wird nur, was noch nicht begonnen hat – wer vorher einen Auftrag vergibt, verliert die Förderung. Ausgezahlt wird erst nach dem Verwendungsnachweis; die Stadt muss vorfinanzieren.',
      rule: 'Verwaltungsvorschriften zu § 44 Thüringer Landeshaushaltsordnung (Förderung nur für Vorhaben, die noch nicht begonnen haben)',
    },
    // the federal Kommunalrichtlinie: applications all year (no call deadline, no selection), a decision of the project agency, then build
    krl: {
      title: 'Kommunalrichtlinie – Projektträger Zukunft – Umwelt – Gesellschaft (ZUG)',
      rate: 0.4,
      calls: null,
      approve: 75,
      src: 'Kommunalrichtlinie 2022–2027 der Nationalen Klimaschutzinitiative (Fördersatz 40 % bei adaptiver Regelung; finanzschwache Kommunen mehr); Bearbeitungszeit hier Annahme',
      learn:
        'Bei der Kommunalrichtlinie stellt die Stadt den Antrag beim Projektträger, jederzeit im Jahr. Vor dem Zuwendungsbescheid darf kein Auftrag vergeben werden; ausgezahlt wird nach dem Verwendungsnachweis.',
      rule: 'Bundeshaushaltsordnung § 44 mit Verwaltungsvorschriften (Förderung nur für Vorhaben, die noch nicht begonnen haben)',
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
    pflanzzeit: {
      text: 'Obstbäume pflanzt man im Herbst nach dem Laubfall oder im zeitigen Frühjahr.',
      why: 'Ohne Laub verdunstet der Baum kaum Wasser und kann über den Winter neue Wurzeln bilden; im Sommer gepflanzt vertrocknet er leicht.',
      src: 'Pflanzzeit für wurzelnackte Obstbäume: Mitte Oktober bis Ende März, frostfreier Boden (Baumschulpraxis)',
    },
    land_kein: {
      text: 'Dafür brauchst du erst Land.',
      why: 'Bäume pflanzt man nur, wo man darf: auf eigenem oder gepachtetem Land, mit Zustimmung des Eigentümers.',
      src: '§§ 903, 585 BGB (Eigentum, Landpacht)',
    },
    preis_fair: {
      text: 'Unter dem ortsüblichen Preis verkauft oder verpachtet hier niemand.',
      why: 'Wer zu wenig bietet, verärgert den Eigentümer – im Dorf spricht sich das herum. Ein fairer Preis orientiert sich an den Kauf- und Pachtwerten der Gegend.',
      src: 'Kaufwerte und Pachtentgelte (Statistisches Landesamt Thüringen, Destatis)',
    },
    vorhabenbeginn: {
      text: 'Erst bauen, wenn der Bewilligungsbescheid da ist.',
      why: 'Gefördert wird nur ein Vorhaben, das noch nicht begonnen hat – schon die Vergabe eines Auftrags zählt als Beginn. Wer vorher anfängt, verliert die Förderung.',
      src: 'Verwaltungsvorschriften zu § 44 Thüringer Landeshaushaltsordnung',
    },
  };
  // ---- crisis missions (C&C / StarCraft, but real – Falko 23:30): the volunteer fire brigade of Ratscher (Manfred, the Wehrführer; Jens,
  // the group leader; Wolfgang, Uwe and others) and whoever helps, under time pressure, with real procedures ----
  // need: person-minutes of work; limit: minutes from the alarm until the damage happens; crew: members who come by day on a working day
  // (the commuters are away – „Tagesalarmsicherheit“) and otherwise; skill: what your helpers need most
  const FW = {
    alarm: 5,
    drive: 5,
    hilfsfrist: 10,
    crewDay: 3,
    crew: 7,
    src: 'Thüringer Brand- und Katastrophenschutzgesetz (ThürBKG): Brandschutz und Allgemeine Hilfe sind Aufgaben der Gemeinde; Feuerwehr-Dienstvorschrift FwDV 3 (Einheiten im Lösch- und Hilfeleistungseinsatz); Einsatzgrundzeit in Thüringen: wirksame Hilfe in der Regel binnen zehn Minuten nach der Alarmierung (§ 1 Abs. 1 Thüringer Feuerwehr-Organisationsverordnung)',
    learn:
      'Notruf 112 → die Leitstelle alarmiert über Funkmeldeempfänger und die Sirene auf der alten Schule → wer im Dorf ist, fährt zum Gerätehaus und rückt mit dem Tragkraftspritzenfahrzeug aus. Unter der Woche sind tagsüber die meisten zur Arbeit in der Stadt – dann kommen nur zwei, drei, und die Feuerwehr aus Schleusingen wird nachalarmiert.',
  };
  const KRISEN = {
    baum: {
      title: 'Sturm: Bäume auf dem Weg',
      icon: '⚠',
      need: 420,
      limit: 120,
      skill: 'holz',
      text: 'Zwei Fichten sind über den Weg zwischen Dorf und Klinge gestürzt. Morgen früh muss der Weg frei sein – für Hubert, den Förster und notfalls den Rettungswagen.',
      phases: [
        [0, 'Alarm: Sirene auf der alten Schule, Funkmeldeempfänger'],
        [0.08, 'Erkunden und Absichern: Blaulicht, Warnleitkegel, Gefahrenbereich'],
        [0.25, 'Sägen: der Motorsägenführer arbeitet die Kronen ab – verspanntes Holz!'],
        [0.7, 'Räumen: Uwe zieht die Stämme mit der Seilwinde an den Rand'],
        [0.95, 'Freigabe: Weg frei, Einsatzbericht'],
      ],
      safety:
        'Ein umgestürzter Baum steht unter Spannung: Druck- und Zugseite erkennen, erst entlasten, dann trennen – sonst schlägt der Stamm oder die Säge zurück. An die Motorsäge nur mit Lehrgang, Schnittschutz und einem Helfer in Rufweite.',
      safetySrc:
        'DGUV Information 214-046 „Sichere Waldarbeiten“; DGUV Regel 114-018; Lehrgang Motorsägenführer der Feuerwehr',
      damage: 'Der Weg war zu lange zu: Hubert kam nicht mit dem Traktor durch, und der Förster musste umkehren.',
      ok: 'Der Weg ist frei, bevor jemand durch muss. Die Stämme liegen am Rand – Hubert holt sie als Brennholz.',
      fans: { manfred: 4, jens: 3, wolfgang: 3, hubert: 3, uwe: 2 },
    },
    hochwasser: {
      title: 'Starkregen: der Bach steigt',
      icon: '≋',
      need: 360,
      limit: 100,
      skill: 'bauen',
      text: 'Nach dem Starkregen steigt der Bach am Garten. Treibgut verstopft den Durchlass unter dem Tor – das Wasser drückt auf den Feldweg und in die Gärten.',
      phases: [
        [0, 'Alarm: Pegel steigt, Treibgut am Durchlass'],
        [0.1, 'Durchlass freiräumen: Äste und Laub mit Rechen und Haken vom Ufer aus'],
        [0.35, 'Sandsäcke füllen (zu zwei Dritteln, je 12–15 kg) und als Wall legen'],
        [0.75, 'Pumpen: die Tragkraftspritze zieht das Wasser aus dem Garten'],
        [0.95, 'Nachkontrolle: Pegel fällt, Wall bleibt ein paar Tage liegen'],
      ],
      safety:
        'Nie allein ans Hochwasser, nie in strömendes Wasser treten: Schon 15 cm schnell fließendes Wasser können einen Menschen umreißen. Am Ufer nur gesichert, mit Rettungsweste.',
      safetySrc:
        'Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK), Ratgeber Hochwasser; THW-Hinweise zum Sandsackverbau (Faustwerte Annahme)',
      damage:
        'Das Wasser war schneller: Feldweg und Garten stehen unter Wasser, der Bungalow hat nasse Füße – Trocknen und Aufräumen kosten.',
      ok: 'Der Durchlass ist frei, der Wall hält – das Wasser bleibt im Bach.',
      cost: 650,
      fans: { manfred: 4, heike: 3, ronald: 3, jens: 2, katrin: 2 },
    },
    waldbrand: {
      title: 'Rauch über der Klinge',
      icon: '♨',
      need: 480,
      limit: 95,
      skill: 'holz',
      text: 'Nach Wochen ohne Regen steigt am Rand der Klinge Rauch auf: ein Bodenfeuer im trockenen Gras und Reisig, das auf den Wald übergreifen kann.',
      phases: [
        [0, 'Notruf 112: wer den Rauch sieht, meldet Ort und Größe'],
        [0.06, 'Alarm für Ratscher und Schleusingen (Tanklöschfahrzeug)'],
        [0.2, 'Erstangriff: Feuerpatschen und Löschrucksäcke an der Brandkante'],
        [0.55, 'Wasser im Pendelverkehr, angesaugt aus der Talsperre'],
        [0.9, 'Brandwache: Glutnester ablöschen, bis nichts mehr raucht'],
      ],
      safety:
        'Ein Bodenfeuer läuft mit dem Wind und bergauf schnell: immer von der verbrannten Seite oder von hinten angreifen, nie vor die Feuerfront, Fluchtweg im Blick. Waldbrandgefahr zeigt der Waldbrandgefahrenindex des Deutschen Wetterdienstes in fünf Stufen.',
      safetySrc:
        'Deutscher Wetterdienst, Waldbrandgefahrenindex (WBI); § 12 Thüringer Waldgesetz (Waldbrandschutz); Feuerwehr-Ausbildung Vegetationsbrand',
      damage: 'Das Feuer war schneller: am Rand der Klinge sind Gras, Jungwuchs und ein paar Fichten verbrannt.',
      ok: 'Das Feuer ist aus, bevor es in die Kronen kam. Brandwache bis in den Abend.',
      fans: { manfred: 4, jens: 3, wolfgang: 4, hubert: 3, uwe: 2 },
    },
  };
  // ---- the chapter (plan section 6: chapter 5 · Das Dorf) ----
  const CHAPTER = {
    id: 'k5',
    title: 'Kapitel 5 · Das Dorf',
    text: 'Mit den Leuten reden, ihre Anliegen kennen, Projekte durch Ortsteilrat und Stadtrat bringen – das Dorf verändert sich sichtbar.',
  };
  return { PLACES, PEOPLE, PROJ, HILFE, KURS_FW, LAND, KAUF, FOERDER, FW, KRISEN, CITY, RAT, STADT, RULES, CHAPTER };
})();
