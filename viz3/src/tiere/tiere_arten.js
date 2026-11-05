// ===================== feat/tiere 1: the animals around Ratscher – who lives here, how, and what one learns about them (TARTEN) =====================
// Data only. Each species: German name and the Latin one, its group (wild, domestic, pest, rare), a short German profile for the
// discovery book (where it lives here, when it is active, what it eats, the signs one finds, its role and its conflicts with garden and
// forest, its protection) with real sources, and the numbers its behaviour runs on: flight distances (walker, car, noise – m), group
// sizes, the hours it is about, its habitat. The signs (Spuren) one can find in the world are listed at the end (SPUREN).
// Sources for the region: hunting and nature reports of Thuringia (Landtag documents), BUND Thüringen (wildcat), the lynx project in the
// Thuringian Forest (2024–), the black stork nest protection of the Rhineland-Palatinate state office (LfU RLP 2018). Names and facts
// otherwise after the German Wikipedia articles named with each species.
export const TARTEN = (() => {
  const W = t => 'https://de.wikipedia.org/wiki/' + t;
  const Q = {
    thlRotwild: [
      'Thüringer Landtag: Einfluss von Thüringer Rotwildeinstandsgebieten auf die Verinselung des Rotwilds (Kleine Anfrage, Teil III)',
      'https://parldok.thueringer-landtag.de/ParlDok/dokument/92077/einfluss_von_thueringer_rotwildeinstandsgebieten_auf_die_verinselung_des_rotwilds_teil_iii.pdf',
    ],
    thlHase: [
      'Thüringer Landtag: Entwicklung des Feldhasen- und Rebhuhnbestands in Thüringen seit 2020',
      'https://parldok.thueringer-landtag.de/ParlDok/dokument/88106/entwicklung_des_feldhasen_und_rebhuhnbestands_in_thueringen_seit_2020_nachgefragt.pdf',
    ],
    bundKatze: [
      'BUND Thüringen: Wildkatzen-Magazin',
      'https://www.bund-thueringen.de/fileadmin/thueringen/Tiere_und_Pflanzen/Wildkatze/Wildkatzen-Magazin_Ausgabe1_Web.pdf',
    ],
    luchs: [
      'Berliner Zeitung, 7.5.2026: Thüringer Wald – verschollen geglaubte Luchsin Vreni taucht mit Nachwuchs wieder auf',
      'https://www.berliner-zeitung.de/article/thueringer-wald-verschollen-geglaubte-luchsin-vreni-taucht-wieder-auf-mit-nachwuchs-10034978',
    ],
    luchsTh: [
      'Thüringer Landtag: Projektbündnis Luchs Thüringen – Europas Luchse vernetzen',
      'https://parldok.thueringer-landtag.de/ParlDok/dokument/96405/projektbuendnis_luchs_thueringen_europas_luchse_vernetzen.pdf',
    ],
    horst: [
      'Landesamt für Umwelt Rheinland-Pfalz: Fachempfehlungen Horstschutz Schwarzstorch (2018)',
      'https://lfu.rlp.de/fileadmin/lfu/Naturschutz/01_Artenschutz/04_Artenschutzprojekte/01_Artenschutzprojekte/02_Voegel/02_Schwarzstorch/Fachempfehlungen_Horstschutz_Schwarzstorch_2018.pdf',
    ],
    kaefer: [
      'waldwissen.net: Befallssuche beim Borkenkäfer',
      'https://www.waldwissen.net/de/waldwirtschaft/schadensmanagement/insekten/befallssuche-beim-borkenkaefer',
    ],
    huete: [
      'zooplus Magazin: Gelbbacke (Altdeutscher Hütehund)',
      'https://www.zooplus.de/magazin/hund/hunderassen/gelbbacke',
    ],
  };
  const wiki = (title, page) => [title + ' (Wikipedia)', W(page)];
  // group: 'wild' | 'nutz' | 'schaedling' | 'selten'; flee: flight distances in m for a walker, a car, noise (chainsaw, mower, tractor)
  const A = {
    reh: {
      name: 'Reh',
      latin: 'Capreolus capreolus',
      group: 'wild',
      model: 'reh',
      size: 'Schulterhöhe 60–75 cm, 15–30 kg',
      flee: { walker: 110, car: 25, noise: 160, dog: 140 },
      groupSize: { summer: [1, 3], winter: [3, 8] },
      when: 'Dämmerung und Nacht; im Winter auch tags auf den Feldern',
      profile: {
        wo: 'Überall im Wechsel von Wald und Feld um Ratscher – am Waldrand der Klinge, auf Wiesen und Äckern, nachts auch in Gärten.',
        wann: 'Morgens und abends in der Dämmerung, im Sommer meist einzeln oder als Ricke mit Kitz, im Winter in Sprüngen auf den Feldern. Die Kitze kommen im Mai und Juni und liegen tagelang allein im hohen Gras; die Brunft ist von Mitte Juli bis Mitte August.',
        nahrung:
          'Ein Feinschmecker: Knospen, junge Triebe, Kräuter, Blätter, Eicheln und Bucheckern – es nascht viel und von allem ein wenig.',
        spuren:
          'Paarige, schmale Trittsiegel (4–5 cm), kleine längliche Losung, im Frühjahr Fegestellen: junge Bäumchen mit abgeschabter Rinde, an denen der Bock sein Gehörn vom Bast befreit; verbissene Triebspitzen.',
        rolle:
          'Verbiss an jungen Bäumen ist das größte Hindernis für den Waldumbau nach dem Borkenkäfer – ohne Schutzhülle oder Zaun wachsen Tanne, Eiche und Buche kaum hoch. Im Garten frisst es Rosenknospen und Obstbaumtriebe. Vor dem Mähen im Mai/Juni Wiesen absuchen (Kitzrettung mit Drohne oder Hund).',
        schutz: 'Jagdbares Wild mit Jagd- und Schonzeiten (Thüringer Jagdgesetz).',
      },
      sources: [wiki('Reh', 'Reh')],
    },
    wildschwein: {
      name: 'Wildschwein',
      latin: 'Sus scrofa',
      group: 'wild',
      model: 'sau',
      size: 'Bache bis 0,9 m Schulterhöhe, 60–80 kg; Keiler über 100 kg',
      flee: { walker: 70, car: 20, noise: 120, dog: 90 },
      groupSize: { summer: [4, 10], winter: [4, 12] },
      when: 'nachts; tags im Dickicht (Kessel)',
      profile: {
        wo: 'In den dichten Jungbeständen und Brombeeren der Wälder um die Klinge, nachts auf Wiesen, Äckern und manchmal mitten im Dorf.',
        wann: 'Fast nur nachts. Die Rotte – Bachen mit ihren Frischlingen – führt die älteste Bache; Keiler leben allein. Frischlinge kommen meist von März bis Mai und tragen bis zum Spätsommer helle Längsstreifen.',
        nahrung: 'Allesfresser: Eicheln, Bucheckern, Mais und Weizen, Wurzeln, Engerlinge und Regenwürmer, Mäuse, Aas.',
        spuren:
          'Umgebrochene Grasnarbe (Wühlstellen), Suhlen – schlammige Mulden, in denen sie sich gegen Parasiten wälzen –, Malbäume mit Schlamm und Borsten an der Rinde, breite Trittsiegel mit Abdrücken der Afterklauen.',
        rolle:
          'Ein Rasen kann in einer Nacht umgepflügt sein, Maisfelder leiden; ein Elektrozaun hält sie zuverlässig ab. Im Wald lockern sie den Boden und fressen Mäuse und Insektenlarven.',
        schutz: 'Jagdbares Wild; wegen der Afrikanischen Schweinepest wird stark bejagt.',
      },
      sources: [wiki('Wildschwein', 'Wildschwein')],
    },
    rothirsch: {
      name: 'Rothirsch',
      latin: 'Cervus elaphus',
      group: 'wild',
      model: 'hirsch',
      size: 'Schulterhöhe 1,2–1,5 m, Hirsche bis 200 kg',
      flee: { walker: 200, car: 40, noise: 250, dog: 220 },
      groupSize: { summer: [1, 5], winter: [3, 9] },
      when: 'Dämmerung und Nacht',
      profile: {
        wo: 'In Thüringen nur in ausgewiesenen Rotwildgebieten; um Ratscher selten, als Wechselwild aus den großen Wäldern des Thüringer Walds.',
        wann: 'Nacht und Dämmerung. Im September und Oktober ist Brunft: die Hirsche röhren weit hörbar.',
        nahrung: 'Gräser, Kräuter, Knospen, im Winter auch Rinde.',
        spuren: 'Große Trittsiegel (8–9 cm), geschälte Rinde an Fichten, im Spätwinter abgeworfene Geweihstangen.',
        rolle:
          'Schälschäden an Fichten machen das Holz anfällig für Fäule; wo zu viel Rotwild steht, wächst der junge Wald nicht.',
        schutz: 'Jagdbares Wild, in Thüringen auf Rotwildgebiete beschränkt.',
      },
      sources: [wiki('Rothirsch', 'Rothirsch'), Q.thlRotwild],
    },
    fuchs: {
      name: 'Rotfuchs',
      latin: 'Vulpes vulpes',
      group: 'wild',
      model: 'fuchs',
      size: 'Schulterhöhe 35–40 cm, 5–8 kg, Lunte (Schwanz) 40 cm',
      flee: { walker: 60, car: 15, noise: 80, dog: 90 },
      groupSize: { summer: [1, 1], winter: [1, 1] },
      when: 'Dämmerung und Nacht, oft auch am Tag',
      profile: {
        wo: 'Überall – am Waldrand, auf den Wiesen beim Mausen und nachts im Dorf an den Hühnerställen.',
        wann: 'Abends und nachts, im Winter auch am Tag. Ranzzeit im Januar und Februar (heisere Schreie in der Nacht), im Frühling die Welpen im Bau.',
        nahrung:
          'Vor allem Mäuse – mit dem typischen Sprung von oben –, dazu Regenwürmer, Käfer, Früchte, Aas, Hühner.',
        spuren:
          'Schnurgerade Spur (Trittsiegel 5 cm, oval), Losung mit Haaren und Knochen auf Steinen und Erhöhungen, der Bau mit großer Röhre am Waldrand.',
        rolle:
          'Hält die Mäuse kurz – hilft also dem Garten. Ein offener Hühnerstall ist in einer Nacht leer: Hühner abends einsperren, Zaun eingraben.',
        schutz: 'Jagdbares Wild (Thüringer Jagdgesetz).',
      },
      sources: [wiki('Rotfuchs', 'Rotfuchs')],
    },
    dachs: {
      name: 'Dachs',
      latin: 'Meles meles',
      group: 'wild',
      model: 'dachs',
      size: '70–90 cm lang, 10–15 kg',
      flee: { walker: 30, car: 10, noise: 50, dog: 50 },
      groupSize: { summer: [1, 2], winter: [1, 1] },
      when: 'nachts',
      profile: {
        wo: 'In großen Bauen an Hängen im Wald – gern an der Klinge –, nachts auf den Wiesen.',
        wann: 'Nur nachts; im Winter verschläft er kalte Wochen im Bau (Winterruhe).',
        nahrung: 'Regenwürmer vor allem, dazu Insektenlarven, Wurzeln, Fallobst, Wespennester.',
        spuren:
          'Trichterförmige kleine Löcher in der Wiese (Stecher), Latrinen – kleine Gruben mit Kot –, ausgetretene Wechsel zum Bau.',
        rolle: 'Gräbt im Rasen nach Engerlingen und Würmern – kleine Löcher, keine großen Flächen wie das Wildschwein.',
        schutz: 'Jagdbares Wild mit Schonzeit.',
      },
      sources: [wiki('Europäischer Dachs', 'Europäischer_Dachs')],
    },
    hase: {
      name: 'Feldhase',
      latin: 'Lepus europaeus',
      group: 'wild',
      model: 'hase',
      size: '50–70 cm lang, 3–5 kg, Ohren mit schwarzen Spitzen',
      flee: { walker: 35, car: 12, noise: 60, dog: 70 },
      groupSize: { summer: [1, 2], winter: [1, 3] },
      when: 'Dämmerung und Nacht; tags in der Sasse',
      profile: {
        wo: 'Auf den offenen Feldern und Wiesen zwischen Ratscher und dem Wald – tags flach gedrückt in seiner Sasse, einer Mulde im Acker.',
        wann: 'Abends und nachts. Im März die „Hasenhochzeit“: Häsinnen boxen aufdringliche Rammler weg.',
        nahrung: 'Kräuter, Gräser, Feldfrüchte, im Winter Rinde und Knospen.',
        spuren: 'Typische Sprungspur: die langen Hinterläufe setzen vor den Vorderläufen auf; runde, faserige Losung.',
        rolle:
          'In Thüringen selten geworden – der Wandel der Felder, Füchse und Verkehr setzen ihm zu. Er knabbert im Winter an jungen Obstbäumen.',
        schutz: 'Jagdbares Wild; auf der Roten Liste Deutschlands als gefährdet.',
      },
      sources: [wiki('Feldhase', 'Feldhase'), Q.thlHase],
    },
    waschbaer: {
      name: 'Waschbär',
      latin: 'Procyon lotor',
      group: 'wild',
      model: 'waschbaer',
      size: '45–70 cm lang, 5–9 kg, schwarze Maske, geringelter Schwanz',
      flee: { walker: 18, car: 8, noise: 30, dog: 40 },
      groupSize: { summer: [1, 3], winter: [1, 2] },
      when: 'nachts',
      profile: {
        wo: 'Aus Nordamerika – seit den 1930er-Jahren in Deutschland ausgesetzt, heute auch in Thüringen weit verbreitet: an Bächen, im Wald und mitten im Dorf.',
        wann: 'Nachts; im Winter faul in Dachböden und Baumhöhlen.',
        nahrung: 'Alles: Obst, Mülltonnen, Vogeleier, Frösche, Insekten, Katzenfutter.',
        spuren: 'Handähnliche Abdrücke mit fünf langen Fingern, umgeworfene Tonnen, Kot auf Dachböden.',
        rolle:
          'Plündert Tonnen, Obst und Vogelnester, nistet sich in Dachböden ein. Deckel mit Spannriemen sichern die Tonne.',
        schutz: 'Invasive Art auf der EU-Liste; jagdbar.',
      },
      sources: [wiki('Waschbär', 'Waschbär')],
    },
    marder: {
      name: 'Steinmarder',
      latin: 'Martes foina',
      group: 'wild',
      model: 'marder',
      size: '40–55 cm lang, 1,5–2,5 kg, gegabelter weißer Kehlfleck',
      flee: { walker: 15, car: 6, noise: 25, dog: 35 },
      groupSize: { summer: [1, 1], winter: [1, 1] },
      when: 'nachts',
      profile: {
        wo: 'Ein Dorfbewohner: Scheunen, Dachböden, Holzstapel und Motorräume in Ratscher.',
        wann: 'Nachts, unermüdlich auf Streifzug.',
        nahrung: 'Mäuse, Ratten, Vögel und Eier, Obst.',
        spuren:
          'Zerbissene Kabel und Schläuche im Auto (vor allem im Frühjahr, wenn er Rivalen riecht), Kot mit Obstkernen, Poltern auf dem Dachboden.',
        rolle: 'Fängt Mäuse und Ratten, aber im Motorraum teuer: ein Marderschutz hilft.',
        schutz: 'Jagdbares Wild mit Schonzeit.',
      },
      sources: [wiki('Steinmarder', 'Steinmarder')],
    },
    rotmilan: {
      name: 'Rotmilan',
      latin: 'Milvus milvus',
      group: 'selten',
      model: 'milan',
      size: '61–72 cm lang, Spannweite 1,75 m, tief gegabelter Schwanz',
      flee: { walker: 0, car: 0, noise: 0, dog: 0 },
      groupSize: { summer: [1, 2], winter: [0, 1] },
      when: 'tags, von März bis Oktober',
      profile: {
        wo: 'Kreist tags über den Wiesen und Feldern um Ratscher, brütet am Waldrand in hohen Bäumen.',
        wann: 'Von März bis Oktober, zunehmend auch im Winter. Frisch gemähte Wiesen ziehen ihn sofort an.',
        nahrung: 'Mäuse, Aas, Regenwürmer, junge Vögel – oft im tiefen Suchflug gegriffen.',
        spuren: 'Ein Horst mit Plastik- und Stofffetzen im Nest.',
        rolle:
          'Mehr als die Hälfte aller Rotmilane der Welt brütet in Deutschland – Thüringen trägt große Verantwortung. Kein Fällen am Horst während der Brutzeit.',
        schutz: 'Streng geschützt (EU-Vogelschutzrichtlinie, Anhang I).',
      },
      sources: [wiki('Rotmilan', 'Rotmilan')],
    },
    bussard: {
      name: 'Mäusebussard',
      latin: 'Buteo buteo',
      group: 'wild',
      model: 'bussard',
      size: '50–57 cm lang, Spannweite 1,2 m, runder Schwanz',
      flee: { walker: 60, car: 0, noise: 80, dog: 70 },
      groupSize: { summer: [1, 2], winter: [1, 2] },
      when: 'tags, das ganze Jahr',
      profile: {
        wo: 'Sitzt auf Zaunpfählen und Bäumen am Feldrand und kreist über den Wiesen.',
        wann: 'Das ganze Jahr, tags. Im Frühling ruft er sein klagendes „hiääh“ über der Klinge.',
        nahrung: 'Vor allem Wühl- und Feldmäuse – ein Bussard fängt Tausende im Jahr.',
        spuren: 'Gewölle (ausgewürgte Haare und Knochen) unter Sitzwarten.',
        rolle: 'Ein Freund des Gartens: Sitzstangen am Rand der Wiese helfen ihm gegen Wühlmäuse.',
        schutz: 'Streng geschützt; als Greifvogel ganzjährig geschont.',
      },
      sources: [wiki('Mäusebussard', 'Mäusebussard')],
    },
    uhu: {
      name: 'Uhu',
      latin: 'Bubo bubo',
      group: 'selten',
      model: 'uhu',
      size: 'bis 75 cm, Spannweite 1,7 m, orange Augen, Federohren',
      flee: { walker: 50, car: 0, noise: 120, dog: 60 },
      groupSize: { summer: [1, 1], winter: [1, 1] },
      when: 'Dämmerung und Nacht',
      profile: {
        wo: 'Die größte Eule – brütet an Felsen und in Steinbrüchen, auch an steilen Hängen wie in der Klinge.',
        wann: 'Abends und nachts; im Spätwinter (Januar bis März) ruft das Männchen sein tiefes „buho“.',
        nahrung: 'Ratten, Igel, Krähen, Tauben, Kaninchen – bis zur Größe eines Hasen.',
        spuren: 'Große Gewölle und Rupfungen am Brutplatz.',
        rolle:
          'Nach fast völligem Verschwinden wieder in Thüringen heimisch. Störungen am Brutplatz im Spätwinter vermeiden.',
        schutz: 'Streng geschützt (EU-Vogelschutzrichtlinie, Anhang I).',
      },
      sources: [wiki('Uhu', 'Uhu')],
    },
    schwarzstorch: {
      name: 'Schwarzstorch',
      latin: 'Ciconia nigra',
      group: 'selten',
      model: 'storch',
      size: '95 cm, Spannweite 1,9 m, schwarz mit weißem Bauch, roter Schnabel',
      flee: { walker: 250, car: 0, noise: 400, dog: 300 },
      groupSize: { summer: [1, 2], winter: [0, 0] },
      when: 'tags, von März bis September',
      profile: {
        wo: 'Ein scheuer Waldvogel: brütet in alten, ruhigen Wäldern, sucht Nahrung an Waldbächen.',
        wann: 'Von März bis September; ab August zieht er nach Afrika.',
        nahrung: 'Fische, Frösche, Molche und Insekten aus Bächen und Tümpeln.',
        spuren: 'Ein großer Horst auf einem starken Seitenast einer alten Buche oder Kiefer.',
        rolle:
          'Zeigt an, dass ein Wald ruhig und naturnah ist. Ruhezone am Horst: im Umkreis von 100 m nie fällen, bis 300 m vom 1. März bis 15. September kein Holzeinschlag und kein Rücken (Fachempfehlung).',
        schutz: 'Streng geschützt (EU-Vogelschutzrichtlinie, Anhang I).',
      },
      sources: [wiki('Schwarzstorch', 'Schwarzstorch'), Q.horst],
    },
    kolkrabe: {
      name: 'Kolkrabe',
      latin: 'Corvus corax',
      group: 'wild',
      model: 'rabe',
      size: '60–65 cm, Spannweite 1,2 m, ganz schwarz, keilförmiger Schwanz',
      flee: { walker: 80, car: 0, noise: 100, dog: 80 },
      groupSize: { summer: [2, 2], winter: [2, 3] },
      when: 'tags',
      profile: {
        wo: 'Über dem Wald an der Klinge und den Feldern, als Paar das ganze Jahr im Revier.',
        wann: 'Tags; im Spätwinter Flugspiele mit Rollen auf dem Rücken.',
        nahrung: 'Aas, Mäuse, Eier, Abfälle.',
        spuren: 'Das tiefe „krrok“ von weit oben.',
        rolle: 'Gesundheitspolizei des Waldes: räumt Aas weg.',
        schutz: 'Besonders geschützt (Bundesnaturschutzgesetz).',
      },
      sources: [wiki('Kolkrabe', 'Kolkrabe')],
    },
    schwarzspecht: {
      name: 'Schwarzspecht',
      latin: 'Dryocopus martius',
      group: 'selten',
      model: null,
      size: '45 cm, schwarz mit roter Kappe',
      flee: { walker: 40, car: 0, noise: 80, dog: 50 },
      groupSize: { summer: [1, 2], winter: [1, 1] },
      when: 'tags',
      profile: {
        wo: 'In alten Wäldern mit dicken Buchen und Kiefern – sein Trommeln hört man in der Klinge.',
        wann: 'Tags; im Frühjahr trommelt er laut und ruft „krü-krü-krü“.',
        nahrung: 'Rossameisen und Waldameisen, Käferlarven – auch die des Borkenkäfers.',
        spuren: 'Große ovale Höhlen in alten Bäumen, aufgehackte Stubben.',
        rolle: 'Seine Höhlen bewohnen später Hohltaube, Fledermäuse und Käuze. Alte Höhlenbäume stehen lassen!',
        schutz: 'Streng geschützt (EU-Vogelschutzrichtlinie, Anhang I).',
      },
      sources: [wiki('Schwarzspecht', 'Schwarzspecht')],
    },
    wildkatze: {
      name: 'Wildkatze',
      latin: 'Felis silvestris',
      group: 'selten',
      model: 'katze',
      size: 'wie eine kräftige Hauskatze, buschiger Schwanz mit stumpfer schwarzer Spitze',
      flee: { walker: 60, car: 15, noise: 90, dog: 90 },
      groupSize: { summer: [1, 1], winter: [1, 1] },
      when: 'Dämmerung und Nacht',
      profile: {
        wo: 'In den großen Wäldern des Thüringer Walds; jagt am Waldrand und auf Wiesen nach Mäusen.',
        wann: 'Abends und nachts, sehr scheu – kaum jemand bekommt sie zu sehen.',
        nahrung: 'Fast nur Mäuse.',
        spuren: 'Haare an Lockstöcken (mit Baldrian), mit denen Naturschützer ihr Vorkommen nachweisen.',
        rolle: 'Braucht unzerschnittene Wälder mit Totholz und grünen Korridoren zwischen ihnen.',
        schutz: 'Streng geschützt (FFH-Richtlinie, Anhang IV).',
      },
      sources: [wiki('Europäische Wildkatze', 'Europäische_Wildkatze'), Q.bundKatze],
    },
    luchs: {
      name: 'Luchs',
      latin: 'Lynx lynx',
      group: 'selten',
      model: null,
      size: 'Schulterhöhe 55–75 cm, Pinselohren, kurzer Schwanz mit schwarzer Spitze',
      flee: { walker: 150, car: 30, noise: 200, dog: 150 },
      groupSize: { summer: [0, 1], winter: [0, 1] },
      when: 'Dämmerung und Nacht',
      profile: {
        wo: 'Seit 2024 werden im Thüringer Wald Luchse ausgewildert; die Luchsin Vreni wurde bei Ilmenau mit Nachwuchs fotografiert. Um Ratscher ein Glücksfall.',
        wann: 'Dämmerung und Nacht; ein Luchs streift durch ein riesiges Revier.',
        nahrung: 'Vor allem Rehe.',
        spuren: 'Runde Trittsiegel ohne Krallen (wie eine große Katze), gerissene Rehe, mit Laub bedeckt.',
        rolle: 'Hält Rehe in Bewegung – wo der Luchs jagt, verbeißen sie den jungen Wald weniger.',
        schutz: 'Streng geschützt (FFH-Richtlinie, Anhänge II und IV); in Deutschland vom Aussterben bedroht.',
      },
      sources: [wiki('Eurasischer Luchs', 'Eurasischer_Luchs'), Q.luchs, Q.luchsTh],
    },
    borkenkaefer: {
      name: 'Buchdrucker (Borkenkäfer)',
      latin: 'Ips typographus',
      group: 'schaedling',
      model: null,
      size: '4–5 mm, dunkelbraun',
      when: 'Schwärmflug ab etwa 16,5 °C, April bis August, zwei bis drei Generationen im Jahr',
      profile: {
        wo: 'In den Fichten der Klinge – seit den Dürresommern ab 2018 sind im Thüringer Wald riesige Fichtenflächen abgestorben.',
        wann: 'Ab April/Mai, wenn es warm ist; eine Generation braucht sechs bis zehn Wochen.',
        nahrung:
          'Bast unter der Rinde geschwächter Fichten; die Larven fressen das Brutbild, das dem Käfer seinen Namen gab.',
        spuren:
          'Braunes Bohrmehl in Rindenschuppen und am Stammfuß, Harztropfen, später rotbraune Kronen und abfallende Rinde.',
        rolle:
          'Befallene Fichten müssen innerhalb weniger Wochen aus dem Wald, bevor die nächste Generation ausfliegt. Danach Mischwald pflanzen: Tanne, Buche, Eiche, Lärche – Waldumbau.',
        schutz: 'Kein Schutz – Waldschutz ist Pflicht der Waldbesitzer.',
      },
      sources: [wiki('Buchdrucker', 'Buchdrucker_(Käfer)'), Q.kaefer],
    },
    wuehlmaus: {
      name: 'Schermaus (Große Wühlmaus)',
      latin: 'Arvicola amphibius',
      group: 'schaedling',
      model: null,
      size: '12–22 cm',
      when: 'das ganze Jahr, unter der Erde',
      profile: {
        wo: 'Unter Rasen und Beeten im Garten, besonders in lockerem Boden am Bach.',
        wann: 'Das ganze Jahr; im Herbst und Frühjahr wühlt sie am meisten.',
        nahrung: 'Wurzeln von Obstbäumen, Tulpenzwiebeln, Möhren, Sellerie.',
        spuren:
          'Flache, unregelmäßige Erdhügel mit Wurzelresten (anders als die hohen Haufen des Maulwurfs), plötzlich welkende junge Bäume, die sich leicht aus der Erde ziehen lassen.',
        rolle:
          'Ein Wühlmauskorb aus Draht um die Wurzeln schützt junge Obstbäume; Bussard, Fuchs und Katze sind ihre Feinde.',
        schutz: 'Nicht geschützt.',
      },
      sources: [wiki('Schermaus', 'Schermaus')],
    },
    ziege: {
      name: 'Hausziege',
      latin: 'Capra hircus',
      group: 'nutz',
      model: null,
      when: 'tags auf der Weide, nachts im Stall',
      profile: {
        wo: 'Ronalds Ziegen Lotte, Frieda und Bock Egon auf der Weide östlich des Gartens.',
        wann: 'Tags draußen, nachts im Unterstand.',
        nahrung: 'Heu, Gras, Laub, Rinde – Ziegen sind Feinschmecker und knabbern an allem, was über den Zaun reicht.',
        spuren: 'Abgefressene Hecken am Zaun.',
        rolle: 'Halten Wiesen und Hänge offen (Landschaftspflege), geben Milch; ein Hütehund hält sie zusammen.',
        schutz: 'Haustier.',
      },
      sources: [wiki('Hausziege', 'Hausziege')],
    },
    hund: {
      name: 'Altdeutscher Hütehund (Gelbbacke)',
      latin: 'Canis lupus familiaris',
      group: 'nutz',
      model: 'hund',
      size: 'Schulterhöhe 55–60 cm, schwarz mit gelben Abzeichen an Backen, Fang und Läufen',
      when: 'immer bei dir',
      profile: {
        wo: 'Dein Hund. Altdeutsche Hütehunde arbeiten seit Jahrhunderten bei Schäfern in Mitteldeutschland; die Gelbbacke ist der verbreitetste Schlag in den neuen Bundesländern.',
        wann: 'Immer dabei – er will arbeiten.',
        nahrung: 'Fleisch, Futter, zwischendurch Gras.',
        spuren: 'Pfotenabdrücke mit Krallen.',
        rolle:
          'Hütet die Ziegen, vertreibt Wild aus dem Garten, findet Dinge – und lernt, was du lobst und was du tadelst.',
        schutz: 'Haustier; im Wald an die Leine, wenn er Wild jagt (Brut- und Setzzeit).',
      },
      sources: [wiki('Altdeutsche Hütehunde', 'Altdeutsche_Hütehunde'), Q.huete],
    },
  };
  // the signs one can find (kind 'spur'): which animal, the German title, what one learns
  const SPUREN = {
    suhle: {
      art: 'wildschwein',
      title: 'Suhle',
      text: 'Eine schlammige Mulde – hier wälzen sich Wildschweine gegen Zecken und zum Abkühlen. Daneben ein Malbaum mit Schlamm an der Rinde.',
    },
    wuehlstelle: {
      art: 'wildschwein',
      title: 'Wühlstelle',
      text: 'Umgebrochene Grasnarbe: Wildschweine haben nach Engerlingen und Würmern gesucht.',
    },
    verbiss: {
      art: 'reh',
      title: 'Verbissener Trieb',
      text: 'Die Spitze des Bäumchens ist abgebissen – sauber an einer Seite, ausgefranst an der anderen: ein Reh, denn Rehe haben oben keine Schneidezähne.',
    },
    fegestelle: {
      art: 'reh',
      title: 'Fegestelle',
      text: 'Abgeschabte Rinde an einem jungen Bäumchen: ein Rehbock hat im Frühjahr den Bast von seinem Gehörn gefegt und sein Revier markiert.',
    },
    bohrmehl: {
      art: 'borkenkaefer',
      title: 'Bohrmehl',
      text: 'Braunes Mehl in den Rindenschuppen und am Stammfuß: der Buchdrucker bohrt sich in die Fichte. Sie muss bald aus dem Wald.',
    },
    kaeferbaum: {
      art: 'borkenkaefer',
      title: 'Käferfichte',
      text: 'Rotbraune Krone, die Rinde löst sich: diese Fichte ist abgestorben, die Käfer sind schon ausgeflogen.',
    },
    wuehlmaushuegel: {
      art: 'wuehlmaus',
      title: 'Wühlmaushügel',
      text: 'Flache Erdhügel mit Wurzelresten – eine Schermaus frisst unter dem Rasen an den Wurzeln.',
    },
    trittsiegel_reh: {
      art: 'reh',
      title: 'Trittsiegel eines Rehs',
      text: 'Zwei schmale, spitze Schalen, 4–5 cm lang – ein Reh ist hier gezogen.',
    },
    trittsiegel_sau: {
      art: 'wildschwein',
      title: 'Trittsiegel einer Sau',
      text: 'Breite Schalen mit den Abdrücken der Afterklauen dahinter – ein Wildschwein.',
    },
    horst: {
      art: 'schwarzstorch',
      title: 'Schwarzstorch-Horst',
      text: 'Ein großer Horst auf einem starken Ast: hier brütet der Schwarzstorch. Ruhe halten – kein Fällen in der Nähe von März bis September.',
    },
    gewoelle: {
      art: 'bussard',
      title: 'Gewölle',
      text: 'Ausgewürgte Haare und Knochen unter einer Sitzwarte – die Reste der Mäuse eines Greifvogels.',
    },
  };
  const all = () => Object.keys(A);
  // the German source line of a species (for the discovery event)
  const sourceOf = id => (A[id] && A[id].sources ? A[id].sources.map(s => s[0] + ' – ' + s[1]).join('; ') : '');
  return { A, SPUREN, all, sourceOf, Q };
})();
window.TARTEN = TARTEN;
