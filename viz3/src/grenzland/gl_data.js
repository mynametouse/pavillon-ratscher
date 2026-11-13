// ===================== feat/grenzland: places, people, clothes, texts – the data of the mode „Grenzland“ (GLDATA) =====================
// Pure data, no scene. The map is real (Ratscher, Schleusingen, the dam of the Talsperre, the Untere Klinge), the culprits are invented:
// the haulier „Spedition Krähwinkel“ (Krähwinkel is the proverbial small town of German comedy – nobody of that name lives here), the
// moped clique, the stranger. Hubert, Ronald and real firms are never culprits or targets. Gerhard, the village chronicler, is one of the
// invented villagers (dorf/dorf_text.js). What is told of the Japanese restaurant „Waffenschmied“ in Suhl and of Rolf Anschütz is true
// (sources in SUSHI.quellen); the homage dinner and its cook are invented.
export const GLDATA = (() => {
  // ---- places (site metres: x east, y north; the garden's slab is the origin) ----
  const ORTE = {
    zh: { pos: [-1340, 1243], name: 'Schleusingen, Zentralhaltestelle', yaw: 110 },
    schule: { pos: [236, -93], name: 'Alte Schule' },
    schulhof: { pos: [214, -72], name: 'Hinter der alten Schule' },
    linde: { pos: [213.5, -112.5], name: 'Dorflinde' },
    anger: { pos: [222, -108], name: 'Anger' },
    wagen: { pos: [239, -121], name: 'Verkaufswagen', az: 20 },
    garten: { pos: [4, 15], name: 'Garten' },
    moped: { pos: [5.6, 10.2], name: 'Moped', az: 10 },
    treff: { pos: [117, -304], name: 'Feldscheune', az: -154 }, // the clique's place by the field track: barn, skittle alley, grill
    damm: { pos: [853, -817], name: 'Staumauer der Talsperre' },
    klinge: { pos: [-548, -566], name: 'Untere Klinge' },
    lager: { pos: [523, 549], name: 'Außenlager Krähwinkel', az: 81 },
  };
  // ---- the cast: who, which Rocketbox figure (CHARMAN / PLAYERMAN key), size, clothes (KLEID below), headwear ----
  const CAST = {
    // the two one plays – the one not played walks along as a figure (their own clothes)
    falko: { name: 'Falko', fig: 'player_m', clips: 'm', h: 1.8, voice: { g: 'm', age: 40 } },
    sarah: { name: 'Sarah', fig: 'player_f', clips: 'f', h: 1.68, voice: { g: 'f', age: 36 } },
    // today
    fremder: { name: 'Der Fremde', fig: 'vk_m11', clips: 'm', h: 1.79, kleid: 'mantel', voice: { g: 'm', age: 55 } },
    jule: { name: 'Jule', fig: 'vk_f07', clips: 'f', h: 1.7, kleid: 'jule', hut: 'helm', voice: { g: 'f', age: 26 } },
    timo: { name: 'Timo', fig: 'vk_m02', clips: 'm', h: 1.82, kleid: 'timo', hut: 'helm', voice: { g: 'm', age: 24 } },
    basti: {
      name: 'Basti',
      fig: 'vk_m20',
      clips: 'm',
      h: 1.76,
      kleid: 'basti',
      hut: 'basecap',
      voice: { g: 'm', age: 22 },
    },
    gerhard: { name: 'Gerhard', fig: 'dorf_gerhard', clips: 'm', h: 1.74, stoop: 0.1, voice: { g: 'm', age: 72 } },
    kraeh: { name: 'Dieter Krähwinkel', fig: 'vk_m16', clips: 'm', h: 1.8, kleid: 'chef', voice: { g: 'm', age: 58 } },
    wache1: {
      name: 'Wachmann',
      fig: 'vk_m07',
      clips: 'm',
      h: 1.86,
      kleid: 'wache',
      hut: 'basecap',
      voice: { g: 'm', age: 40 },
    },
    wache2: { name: 'Wachmann', fig: 'vk_m20', clips: 'm', h: 1.8, kleid: 'wache', voice: { g: 'm', age: 35 } },
    polizei1: {
      name: 'Polizist',
      fig: 'vk_m02',
      clips: 'm',
      h: 1.84,
      kleid: 'polizei',
      hut: 'polizei',
      voice: { g: 'm', age: 38 },
    },
    polizei2: {
      name: 'Polizistin',
      fig: 'vk_f14',
      clips: 'f',
      h: 1.71,
      kleid: 'polizei',
      hut: 'polizei',
      voice: { g: 'f', age: 33 },
    },
    yuki: { name: 'Yuki', fig: 'vk_f02', clips: 'f', h: 1.64, kleid: 'koechin', voice: { g: 'f', age: 29 } },
    haendler: {
      name: 'Verkäuferin',
      fig: 'vk_f15',
      clips: 'f',
      h: 1.66,
      kleid: 'kittelheute',
      voice: { g: 'f', age: 52 },
    },
    // 1989
    lutz: {
      name: 'Lutz',
      fig: 'vk_m07',
      clips: 'm',
      h: 1.84,
      kleid: 'grenzer',
      hut: 'grenzer',
      voice: { g: 'm', age: 30 },
    },
    abv: {
      name: 'Der ABV',
      fig: 'vk_m16',
      clips: 'm',
      h: 1.78,
      kleid: 'vopo',
      hut: 'vopo',
      voice: { g: 'm', age: 50 },
    },
    vopo: {
      name: 'Volkspolizist',
      fig: 'vk_m02',
      clips: 'm',
      h: 1.83,
      kleid: 'vopo',
      hut: 'vopo',
      voice: { g: 'm', age: 28 },
    },
    erna: {
      name: 'Erna',
      fig: 'vk_f15',
      clips: 'f',
      h: 1.6,
      stoop: 0.12,
      kleid: 'kittel',
      hut: 'kopftuch',
      voice: { g: 'f', age: 66 },
    },
    renate: {
      name: 'Renate',
      fig: 'vk_f12',
      clips: 'f',
      h: 1.66,
      kleid: 'anorak',
      hut: 'strick',
      voice: { g: 'f', age: 38 },
    },
    horst: {
      name: 'Horst',
      fig: 'vk_m11',
      clips: 'm',
      h: 1.74,
      stoop: 0.06,
      kleid: 'watte',
      hut: 'schieber',
      voice: { g: 'm', age: 58 },
    },
    maik: { name: 'Maik', fig: 'vk_m20', clips: 'm', h: 1.78, kleid: 'stonewash', voice: { g: 'm', age: 19 } },
    ines: { name: 'Ines', fig: 'vk_f07', clips: 'f', h: 1.68, kleid: 'jeans89', voice: { g: 'f', age: 20 } },
  };
  // ---- clothes: how a figure's own textures are repainted by body zone (grenzland/gl_fig.js). Colours as sRGB 0 … 255.
  //      ober: torso and arms, unter: legs, rock: the torso's cloth reaches down over the thighs (apron dress, coat), schuh: shoes;
  //      muster: blumen | karo | steppung | cord | strick | stonewash | streifen | nadel; arm: long sleeves over bare arms ----
  const KLEID = {
    // today
    mantel: { ober: [58, 60, 66], unter: [38, 40, 46], schuh: [30, 26, 24], rock: 0.36, arm: true },
    jule: {
      ober: [28, 30, 34],
      oberM: 'leder',
      unter: [52, 66, 92],
      unterM: 'stonewash',
      schuh: [24, 24, 26],
      arm: true,
    },
    timo: { ober: [172, 40, 34], oberM: 'streifen', unter: [40, 44, 52], schuh: [230, 230, 226], arm: true },
    basti: { ober: [70, 96, 72], unter: [96, 104, 122], unterM: 'stonewash', schuh: [40, 40, 44], arm: true },
    chef: { ober: [196, 178, 140], unter: [70, 62, 54], schuh: [52, 34, 22], rock: 0.4, arm: true },
    wache: { ober: [26, 28, 32], unter: [26, 28, 32], schuh: [18, 18, 18], arm: true },
    polizei: { ober: [22, 34, 66], unter: [22, 34, 66], schuh: [16, 16, 16], arm: true, streifen: [205, 225, 60] },
    koechin: { ober: [236, 234, 228], unter: [44, 44, 48], schuh: [30, 30, 30], arm: true },
    kittelheute: {
      ober: [86, 120, 150],
      oberM: 'karo',
      unter: [70, 66, 62],
      schuh: [60, 40, 30],
      rock: 0.34,
      arm: false,
    },
    // 1989: muted dyes, synthetic fibres, quilted cotton, corduroy, stone-washed denim
    kittel: {
      ober: [92, 106, 150],
      oberM: 'blumen',
      unter: [150, 128, 104],
      unterM: 'strick',
      schuh: [70, 52, 40],
      rock: 0.3,
      arm: true,
      armC: [128, 104, 86],
    },
    anorak: {
      ober: [150, 72, 132],
      oberM: 'steppung',
      unter: [86, 94, 124],
      unterM: 'stonewash',
      schuh: [226, 222, 214],
      arm: true,
    },
    watte: {
      ober: [84, 92, 78],
      oberM: 'steppung',
      unter: [78, 62, 46],
      unterM: 'cord',
      schuh: [36, 30, 26],
      arm: true,
    },
    stonewash: {
      ober: [124, 146, 178],
      oberM: 'stonewash',
      unter: [120, 140, 172],
      unterM: 'stonewash',
      schuh: [232, 228, 220],
      arm: true,
    },
    jeans89: {
      ober: [226, 220, 206],
      oberM: 'strick',
      unter: [112, 132, 168],
      unterM: 'stonewash',
      schuh: [206, 60, 70],
      arm: true,
    },
    parka: { ober: [98, 104, 74], unter: [112, 84, 54], unterM: 'cord', schuh: [62, 44, 30], rock: 0.4, arm: true }, // the young Gerhard
    vopo: {
      ober: [98, 112, 96],
      unter: [98, 112, 96],
      schuh: [14, 14, 14],
      arm: true,
      kragen: [60, 110, 70],
      knopf: [200, 200, 196],
    },
    grenzer: {
      ober: [118, 118, 108],
      unter: [118, 118, 108],
      schuh: [14, 14, 14],
      arm: true,
      kragen: [70, 130, 80],
      band: [40, 120, 60],
    },
  };
  // ---- what one may do wrong (shown when the level rises) – the heat is in gl_logik.js ----
  const TATEN = {
    rempeln: 'Rempelei',
    schlag: 'Körperverletzung',
    autoklau: 'Fahrzeugdiebstahl',
    raserei: 'Raserei im Ort',
    boeller: 'Böller im Ort',
    hausfrieden: 'Hausfriedensbruch',
    einbruch: 'Einbruch',
    flucht: 'Flucht vor der Kontrolle',
    sperre: 'Sperre durchbrochen',
    widerstand: 'Widerstand',
    kiste: 'Verdächtige Kiste',
    ausweis: 'Der Kontrolle entzogen',
  };
  // ---- texts ----
  const T = {
    titel: 'Grenzland',
    intro: 'Freitagabend. Der Bus aus Erfurt ist weg, der nach Ratscher noch nicht da.',
    introSub: 'Kapitel 1 · Wechseln mit Tab · Handy mit T · Radio mit R',
    adult: 'Nur für Erwachsene. Die Karte ist echt, die Geschichte, die Firmen und die Gauner sind erfunden.',
    ende: 'Grenzland ist beendet – Ratscher ist wieder, wie es war.',
    endAsk: 'Noch einmal „Beenden“ tippen, um Grenzland zu verlassen.',
    weiter: 'Weiter geht’s – Grenzland läuft noch.',
    zombie: 'Erst die Zombie-Nacht beenden.',
    wechsel: n => 'Du bist jetzt ' + n + '.',
    wechselNein: 'Gerade nicht – erst aussteigen bzw. aufstehen.',
    wechsel89: 'Das hier ist Gerhards Erinnerung.',
    folgt: n => n + ' kommt mit.',
    wartet: n => n + ' wartet hier.',
    getrennt: 'Getrennt unterwegs: ein Stern weniger.',
    gesehen: 'Sie haben dich gesehen!',
    erkannt: 'Jetzt wissen sie, wer du bist.',
    verloren: 'Außer Sicht. Bleib weg von der Straße.',
    stern: 'Die Suche lässt nach.',
    entkommen: 'Entkommen. Die Streife fährt wieder nach Hause.',
    erwischt: 'Erwischt.',
    erwischtSub: (n, w) =>
      'Personalien, Anzeige, ' + n + ' ' + w + ' Geldbuße. Am nächsten Morgen stehst du wieder im Garten.',
    erwischt89: 'Die Volkspolizei hat dich. Die Erinnerung beginnt noch einmal.',
    zeuge: (wer, was) => wer + ' hat es gesehen: ' + was + '.',
    keinZeuge: 'Niemand hat es gesehen.',
    streife: 'Eine Streife ist unterwegs. Auf dem Land dauert das.',
    sperre: 'Sperre auf der Landstraße!',
    heli: 'Ein Hubschrauber kreist über dem Tal.',
    versteck: 'Hier sieht dich so schnell keiner.',
    tank: 'Der Tank ist leer. Im Garten steht ein Kanister – oder du hast einen dabei.',
    tankHeim: 'Moped betanken (Gemisch 1:50 aus dem Kanister)',
    tankKan: 'Moped betanken (dein Kanister)',
    getankt: 'Vollgetankt: fünf Liter Gemisch, eins zu fünfzig.',
    tankVoll: 'Gemisch 1 : 50 eingefüllt. Der Zweitakter dankt es.',
    geldFehlt: 'Dafür reicht das Geld nicht.',
    schlagLuft: 'Daneben.',
    boeller: 'Böller',
    keinBoeller: 'Kein Böller mehr.',
  };
  // ---- the phone: who writes (the village chat „Ratscher aktuell“ is satire; nobody real) ----
  const CHAT = [
    ['Ingrid', 'Wer hat am Anger schon wieder die Mülltonne falsch herum hingestellt? Der Deckel muss zur Straße!!'],
    ['Uwe', 'War ich nicht.'],
    ['Manfred', 'Übung der Feuerwehr Samstag 9 Uhr. Wer nicht kommt, bringt Kuchen.'],
    ['Heike', 'Biete: 3 Kürbisse. Suche: jemanden, der Kürbis mag.'],
    ['Wolfgang', 'An der Klinge fahren nachts Transporter. Jäger sind das nicht.'],
    ['Katrin', 'Der Verkaufswagen hat heute Rostbratwurst im Angebot. Nur damit ihr es wisst.'],
    ['Jens', 'Hat jemand einen 13er Ringschlüssel? Frage für einen Freund.'],
    ['Ingrid', 'Bitte KEINE Böller vor Silvester. Der Hund von Anja ist seit gestern unterm Sofa.'],
    ['Uwe', 'War ich auch nicht.'],
    ['Gerhard', 'Für die Chronik: Wer hat noch Fotos vom November 1989? Bitte bei mir melden.'],
    ['Heike', 'Immer noch 3 Kürbisse.'],
    ['Manfred', 'Blaulicht an der Landstraße. Weiß einer was?'],
  ];
  const FEED = [
    ['suedthueringen.live', 'LIVE: Simson-Treffen an der Staumauer. 14 Mopeds, 1 Grill, 0 Helme mit Visier.', 'damm'],
    [
      'Feldflur_Fuchs',
      'Wer stellt eigentlich Container mitten in die Feldflur Richtung Autobahn? Kein Schild, kein Name. #Ratscher',
      'lager',
    ],
    ['Kegelfreunde Ratscher', 'Freiluftbahn an der Feldscheune ist wieder aufgebaut. Alle Neune!', 'treff'],
    ['Angel_Andi', 'Karpfen beißen an der Talsperre gerade auf Mais. Abends. Ihr habt das nicht von mir.', 'damm'],
    ['suedthueringen.live', 'Polizei bittet um Hinweise: Nächtliche Transporte im Wald bei Geisenhöhn.', 'klinge'],
    [
      'Rennsteig_Rita',
      'Verkaufswagen steht am Anger. Bratwurst 2,50. Senf inklusive, Ketchup auf eigene Gefahr.',
      'wagen',
    ],
  ];
  // ---- the radio: one invented station, „Radio Grenzland“ – jingles, satire news, the police report of the player's own deeds ----
  const RADIO = {
    name: 'Radio Grenzland',
    freq: '89,1',
    claims: [
      'Radio Grenzland – wir senden, bis einer kommt.',
      'Radio Grenzland. Zwischen Rennsteig und Rodach.',
      'Sie hören Radio Grenzland. Freiwillig, hoffen wir.',
      '89,1 – die Frequenz zum Jahr.',
    ],
    news: [
      'Der Verkaufswagen meldet: Rostbratwurst wieder lieferbar. Die Lage in Ratscher hat sich entspannt.',
      'Die Stadt Schleusingen prüft einen Förderantrag für eine Machbarkeitsstudie über Förderanträge.',
      'Blitzer auf der Landstraße bei Ratscher. Er steht da seit drei Wochen und hat inzwischen Stammkunden.',
      'Im Thüringer Wald wurde ein Funkloch entdeckt, das größer ist als das Netz drumherum.',
      'Wetter: Es wird, wie es wird. Näheres, wenn es da ist.',
      'Verkehr: Auf dem Feldweg bei der Klinge kommt Ihnen ein Traktor entgegen. Er hat Vorfahrt. Immer.',
      'Die Kegelfreunde Ratscher suchen Nachwuchs. Mitzubringen sind ein ruhiger Arm und Durst.',
      'An der Talsperre beißen die Karpfen. Die Angler schweigen dazu – wie zu allem.',
      'Ein Leser fragt, ob man in Bayern anders grüßt. Antwort der Redaktion: lauter.',
      'Die Bahn teilt mit: Der Zug nach Themar fährt heute pünktlich. Wir bitten, die Störung zu entschuldigen.',
    ],
    // the police report: a deed of the player's, told in the station's tone (id → text; n: witnesses)
    polizei: {
      autoklau:
        'Polizeibericht: In Ratscher ist ein Fahrzeug weggekommen. Der Besitzer sagt, er habe es „nur kurz“ offen gelassen.',
      schlag:
        'Polizeibericht: Handgreiflichkeiten im Raum Ratscher. Die Beteiligten kannten sich danach besser als vorher.',
      rempeln: 'Polizeibericht: Ein Passant wurde angerempelt. Die Kriminalität erreicht damit ein Zehnjahreshoch.',
      raserei: 'Polizeibericht: Ein Moped wurde in der Ortslage gemessen. Das Messgerät wird überprüft.',
      boeller: 'Polizeibericht: Knallkörper im November. Die Polizei erinnert daran, dass Silvester ein Datum ist.',
      einbruch:
        'Polizeibericht: Einbruch in ein Containerlager bei Ratscher. Der Eigentümer möchte „keine große Sache daraus machen“.',
      hausfrieden: 'Polizeibericht: Unbekannte im Wald bei Geisenhöhn. Anwohner hörten Knall und Motoren.',
      flucht: 'Polizeibericht: Ein Fahrzeug entzog sich der Kontrolle. Es wird ermittelt, wohin.',
      sperre: 'Polizeibericht: Eine Straßensperre wurde umfahren. Über den Acker. Der Bauer stellt Strafantrag.',
      widerstand: 'Polizeibericht: Widerstand bei einer Kontrolle. Den Beamten geht es gut, der Laune weniger.',
    },
    keinZeuge: 'Polizeibericht: Keine besonderen Vorkommnisse. Jedenfalls keine, die jemand gesehen hätte.',
    gesucht: n =>
      'Die Polizei sucht Zeugen. Hinweise bitte an jede Dienststelle – oder an die Dorf-Chatgruppe, die weiß es eh zuerst.' +
      (n > 2 ? ' Achtung, Kontrollen auf der Landstraße.' : ''),
    // a feature told in parts: the true story of the Japanese restaurant in Suhl
    sushi: [
      'Grenzgeschichten. Heute: Sukiyaki in Suhl. 1966 kocht der Gastwirt Rolf Anschütz in der HO-Gaststätte Waffenschmied für einen Stammtisch zum ersten Mal japanisch – nach einem Buch.',
      'Aus dem Nebenzimmer wird das einzige Japan-Restaurant der DDR. Vor dem Essen wird gemeinsam gebadet, dann gibt es Kimonos. Auf einen Tisch wartet man bis zu zwei Jahre.',
      'Was fehlt, wird ersetzt: Berichte nennen Milchreis für den Sushi-Reis, Karpfen statt Lachs und Worcestersauce statt Sojasauce. Den Gästen aus Japan schmeckt es trotzdem.',
      '1979 darf Anschütz für vier Wochen nach Japan. 1986 verlässt er den Waffenschmied, 1993 schließt das Lokal. Seit 2012 erinnert in der Gothaer Straße in Suhl eine Tafel daran – und ein Film.',
    ],
  };
  // ---- the true story for the phone's notes (side mission „Karpfen für Suhl“) ----
  const SUSHI = {
    titel: 'Sushi in Suhl – die wahre Geschichte',
    text: [
      'Rolf Anschütz (1932–2008) leitete ab 1964 die HO-Gaststätte „Waffenschmied“ in Suhl. 1966 kochte er für einen Stammtisch zum ersten Mal Sukiyaki.',
      'Daraus wurde das einzige Japan-Restaurant der DDR, mit 40 Plätzen. Vor dem Essen badeten die Gäste gemeinsam; 1977 kam ein kleines Sentō-Bad dazu. Auf einen Tisch wartete man bis zu zwei Jahre.',
      'Zutaten wurden ersetzt: Berichte zum Film nennen Milchreis für den Sushi-Reis, Karpfen statt Lachs, Worcestersauce statt Sojasauce.',
      '1979 reiste Anschütz vier Wochen nach Japan. Im Sommer 1986 verließ er den „Waffenschmied“; das Lokal schloss 1993. 1991 eröffnete er in Oberhof das Japanhotel „Sakura“.',
      '2012 kam der Film „Sushi in Suhl“ ins Kino; seit dem 14. Oktober 2012 hängt in der Gothaer Straße 8 in Suhl eine Gedenktafel.',
    ],
    quellen: [
      ['Wikipedia: Rolf Anschütz', 'https://de.wikipedia.org/wiki/Rolf_Ansch%C3%BCtz'],
      [
        'Tagesspiegel (2012): „Sushi in Suhl“ – eine japanische Traumwelt in der DDR-Provinz',
        'https://www.tagesspiegel.de/gesellschaft/panorama/sushi-in-suhl-eine-japanische-traumwelt-in-der-ddr-provinz-2219191.html',
      ],
      [
        'Berliner Kurier: Fine Dining im Osten (Wartezeit zwei Jahre)',
        'https://www.berliner-kurier.de/ddr/history-ddr-restaurant-waffenschmied-fioretto-li.10171358',
      ],
      [
        'Berliner Zeitung: Die Bezirkshauptstädte der DDR – Suhl (1993 geschlossen)',
        'https://www.berliner-zeitung.de/article/327754',
      ],
      [
        'yokosonews: Sushi in Suhl (Ersatz-Zutaten)',
        'https://yokosonews.com/entertainment/sushi-suhl-movie-about-japanese-dream-germany',
      ],
    ],
  };
  // ---- the shop on wheels at the Anger (prices in euros) ----
  const WAGEN = [
    { k: 'bratwurst', name: 'Rostbratwurst im Brötchen', eur: 2.5, sofort: true },
    { k: 'milchreis', name: 'Milchreis (500 g)', eur: 1.29 },
    { k: 'worcester', name: 'Worcestersauce', eur: 2.49 },
    { k: 'mais', name: 'Dosenmais (Angelköder)', eur: 0.99, n: 5 },
    { k: 'wurm', name: 'Tauwürmer (Angelköder)', eur: 2.9, n: 5 },
    { k: 'blinker', name: 'Blinker', eur: 4.5, n: 3 },
    { k: 'kanister', name: 'Kanister Gemisch 1:50 (5 Liter)', eur: 9.8 },
    { k: 'boeller', name: 'Böller „aus dem Kofferraum“', eur: 6, n: 4, unter: true },
  ];
  // ---- 1989: the afternoon of Friday, 10 November – what people say, what the radio says, what is in the street ----
  const J89 = {
    datum: 'Ratscher, Freitag, 10. November 1989',
    uhr: 15 * 60 + 35,
    tag: [1989, 11, 10],
    intro: 'Gerhard ist fünfunddreißig und Lehrer. Seit gestern Abend ist die Grenze offen – sagen sie im Radio.',
    radio: [
      'Hier ist der Sender. Seit gestern Abend können Bürger der DDR über alle Grenzübergangsstellen ausreisen.',
      'An den Übergängen nach Bayern bilden sich lange Schlangen. Die Volkspolizei bittet um Besonnenheit.',
      'Und nun zum Wetter: neblig-trüb, um fünf Grad.',
    ],
    leute: {
      erna: [
        'Gerhard! Morgen nach Suhl in den Waffenschmied, ja? Zwei Jahre habt ihr auf den Tisch gewartet!',
        'Erst wird gebadet, alle zusammen, dann gibt’s Kimonos. Hat die Brigitte erzählt.',
        'Was schleppst du denn da? Na, geht mich ja nichts an.',
      ],
      horst: [
        'Morgen früh fahren wir rüber. Coburg. Hundert Mark Begrüßungsgeld soll es geben.',
        'Der Trabi packt das. Ist ja nur einmal übern Berg.',
        'Hast du Kohlen gekriegt? Bei uns war der Händler noch nicht.',
      ],
      renate: [
        'In der Kaufhalle gibt’s Apfelsinen. Kuba. Aber Apfelsinen.',
        'Der ABV war vorhin bei der Schule. Sucht der dich?',
      ],
      maik: [
        'Stonewashed, original. Hat mein Onkel im Westpaket geschickt.',
        'Ich fahr mit der Simme rüber. Wenn sie mich lassen.',
      ],
      ines: [
        'Glaubst du das, was die im Radio sagen?',
        'Morgen ist Disko im Kulturhaus. Wenn dann noch einer hier ist.',
      ],
      abv: ['Genosse Lehrer! Einen Moment.', 'Was ist in der Kiste?', 'Stehenbleiben!'],
      lutz: [
        'Heb die auf, Gerhard. Bis sich alles beruhigt hat.',
        'Frag nicht, was drin ist. Ich weiß es selber nur halb.',
        'Die halbe Karte nehm ich mit. Sicher ist sicher.',
      ],
    },
    losung: ['40 JAHRE DDR', 'MEIN ARBEITSPLATZ – MEIN KAMPFPLATZ FÜR DEN FRIEDEN'],
    schild: { konsum: 'KONSUM', post: 'DEUTSCHE POST', bus: 'H' },
    ende: 'Am nächsten Morgen war die Kiste weg. Und Lutz auch.',
  };
  // voices for the fixed lines (audio/stimme.js profiles, registered when the mode starts)
  return { ORTE, CAST, KLEID, TATEN, T, CHAT, FEED, RADIO, SUSHI, WAGEN, J89 };
})();
if (typeof window !== 'undefined') window.GLDATA = GLDATA;
