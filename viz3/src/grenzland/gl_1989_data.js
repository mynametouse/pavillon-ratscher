// ===================== feat/grenzland: the data of the flashback to 1989 (GL89DATA) – clothes, people, what they say, what stands in the street =====================
// Ratscher on the afternoon of Friday, 10 November 1989 (Falko, 13.11.2026 0:32: „achte bei den Rückblenden auf 1989 auch auf entsprechende
// Anpassungen von Umfeld, Kleidung, Stil, Fashion und sonstigen, sodass es wirklich gut ankommt und realistisch wirkt“). Pure data, no
// scene; the sources of what is said and worn are in docs/features/grenzland-1989.md. What is true to the day:
// - Thursday, 9 November, 18:53: the new travel rule is read out at a press conference in Berlin; in South Thuringia one saw it in the
//   West's television. That night people who drove to the crossing Eisfeld–Rottenbach (open since 1973, the road to Coburg) were still
//   sent back. Friday, 10 November, from early morning: the visa is stamped into the identity card at the Volkspolizeikreisamt; a queue
//   of cars at Eisfeld; in Coburg 100 DM „Begrüßungsgeld“ (once a year, since 1988), Bavaria adds 40 DM. Saturday is a school day, half
//   the classes are missing. The crossing Sonneberg–Neustadt opens only on Sunday, the 12th – nobody speaks of it yet.
// - The weather: a high after a clear night with frost in the Thuringian Forest – dry, hazy, cold; dusk before five.
// - The Japanese restaurant „Waffenschmied“ in Suhl: up to two years' wait for a table, the bath together before the meal, kimonos
//   (GLDATA.SUSHI.quellen); in 1989 it is still open (until 1993).
// The people are invented (as the villagers of today); nobody real is meant. The clothes and the cast are added to GLDATA.KLEID and
// GLDATA.CAST when this module loads (grenzland/gl_fig.js reads them when somebody is made).
import { GLDATA } from './gl_data.js';
export const GL89DATA = (() => {
  // ---- clothes of 1989 (how grenzland/gl_fig.js paints them: ober/unter/schuh colours sRGB; oberM/unterM/armM the weave; rock: the
  //      torso's cloth reaches down to this share of the height; saum: the hem below the hip joint (m); arm: sleeves over bare arms;
  //      armC: the sleeves' colour (a jumper under an apron); knopf: a button row; reissv: a zip; hemd/schlips/vtief/vweit: shirt and tie
  //      in the opening; kragenC: the collar; kragen: collar patches; schulter: shoulder boards; koppel: a belt; band: a cuff band on
  //      the left sleeve; abz: a badge on the left upper arm; passe: a yoke in another colour; bund: knitted hem and cuffs; taschen:
  //      patch pockets; falte: a trouser crease; naht: the seams of jeans; galon: a stripe down the leg; schaft: boots up the calf (m) ----
  const KLEID = {
    // a Dederon apron dress with small flowers over a brown cardigan, thick stockings
    kittel: {
      ober: [66, 88, 146],
      oberM: 'blumen',
      armC: [124, 98, 80],
      armM: 'strick',
      arm: true,
      hemd: [124, 98, 80],
      vtief: 0.1,
      vweit: 0.55,
      knopf: [226, 222, 208],
      unter: [150, 128, 104],
      schuh: [66, 48, 38],
      rock: 0.3,
    },
    // another one, wine red with dots, over a grey jumper
    kittelrot: {
      ober: [122, 44, 58],
      oberM: 'tupfen',
      armC: [128, 130, 124],
      armM: 'strick',
      arm: true,
      hemd: [128, 130, 124],
      vtief: 0.1,
      vweit: 0.55,
      knopf: [232, 226, 214],
      unter: [140, 118, 96],
      schuh: [52, 40, 34],
      rock: 0.3,
    },
    // the white coat of the shop
    kittelweiss: {
      ober: [226, 230, 232],
      armC: [226, 230, 232],
      arm: true,
      hemd: [150, 60, 70],
      vtief: 0.12,
      vweit: 0.5,
      knopf: [170, 180, 190],
      taschen: true,
      unter: [150, 128, 104],
      schuh: [214, 210, 200],
      rock: 0.32,
    },
    // the wadded work jacket, corduroy trousers, boots
    watte: {
      ober: [84, 96, 92],
      oberM: 'stepplaengs',
      kragenC: [66, 56, 46],
      knopf: [36, 36, 36],
      unter: [78, 62, 46],
      unterM: 'cord',
      schuh: [34, 30, 28],
      schaft: 0.1,
      arm: true,
      saum: 0.1,
    },
    // an anorak of the time: quilted, a light yoke, knitted hem and cuffs; stone-washed jeans, white trainers
    anorak: {
      ober: [126, 50, 70],
      oberM: 'steppquer',
      passe: [206, 194, 166],
      kragenC: [206, 194, 166],
      reissv: [196, 196, 190],
      bund: [100, 40, 56],
      unter: [88, 100, 130],
      unterM: 'stonewash',
      naht: true,
      schuh: [226, 222, 214],
      sohle: [240, 240, 234],
      arm: true,
      saum: 0.08,
    },
    // a denim jacket and jeans, bleached in marbles („moon-washed“), a white shirt in the opening
    stonewash: {
      ober: [112, 138, 174],
      oberM: 'moonwash',
      hemd: [228, 224, 214],
      vtief: 0.13,
      vweit: 0.36,
      knopf: [186, 160, 104],
      taschen: true,
      unter: [108, 132, 168],
      unterM: 'moonwash',
      naht: true,
      schuh: [232, 228, 220],
      sohle: [240, 240, 234],
      arm: true,
    },
    // a wide jumper with knitted zigzag bands, jeans, red trainers
    jeans89: {
      ober: [50, 92, 108],
      oberM: 'zacken',
      kragenC: [232, 226, 208],
      bund: [40, 76, 90],
      unter: [112, 132, 168],
      unterM: 'stonewash',
      naht: true,
      schuh: [200, 56, 66],
      sohle: [238, 238, 232],
      arm: true,
      saum: 0.1,
    },
    // the young teacher: a parka over a checked shirt, corduroy trousers, brown shoes
    parka: {
      ober: [94, 100, 72],
      kragenC: [124, 108, 80],
      hemd: [86, 100, 124],
      vtief: 0.1,
      vweit: 0.4,
      reissv: [58, 60, 48],
      taschen: true,
      unter: [116, 90, 60],
      unterM: 'cord',
      schuh: [66, 46, 32],
      rock: 0.44,
      arm: true,
    },
    // an overcoat in herringbone, a scarf, pressed trousers of „Präsent 20“
    mantel89: {
      ober: [104, 96, 86],
      oberM: 'fischgrat',
      kragenC: [128, 44, 48],
      knopf: [50, 44, 40],
      unter: [70, 66, 64],
      unterM: 'nadel',
      falte: true,
      schuh: [30, 26, 24],
      rock: 0.36,
      arm: true,
    },
    // a dark loden coat, corduroy trousers
    loden: {
      ober: [62, 74, 62],
      kragenC: [50, 58, 50],
      knopf: [150, 130, 90],
      unter: [84, 70, 56],
      unterM: 'cord',
      schuh: [40, 32, 28],
      rock: 0.38,
      arm: true,
    },
    // a winter coat with a fur collar
    wintermantel: {
      ober: [86, 66, 96],
      kragenC: [70, 50, 36],
      knopf: [40, 30, 44],
      unter: [140, 118, 96],
      schuh: [46, 36, 32],
      schaft: 0.2,
      rock: 0.34,
      arm: true,
    },
    // the Volkspolizei: grey-green jacket with four pockets, collar patches and shoulder boards in dark green, shirt and tie, a brown
    // belt, the emblem on the left sleeve; pressed trousers, black shoes
    vopo: {
      ober: [98, 112, 96],
      unter: [98, 112, 96],
      falte: true,
      schuh: [14, 14, 14],
      arm: true,
      saum: 0.1,
      hemd: [156, 166, 152],
      schlips: [44, 62, 48],
      vtief: 0.15,
      vweit: 0.4,
      kragen: [50, 98, 62],
      schulter: [50, 98, 62],
      abz: [50, 98, 62],
      knopf: [196, 190, 160],
      taschen: true,
      koppel: [74, 46, 28],
    },
    // the ABV in the uniform coat of the cold season
    vopomantel: {
      ober: [98, 112, 96],
      unter: [98, 112, 96],
      falte: true,
      schuh: [14, 14, 14],
      arm: true,
      rock: 0.37,
      hemd: [156, 166, 152],
      schlips: [44, 62, 48],
      vtief: 0.1,
      vweit: 0.4,
      kragen: [50, 98, 62],
      schulter: [50, 98, 62],
      abz: [50, 98, 62],
      knopf: [196, 190, 160],
      koppel: [74, 46, 28],
    },
    // the border troops: stone grey, green piping, the green cuff band on the left sleeve, boots
    grenzer: {
      ober: [118, 118, 108],
      unter: [118, 118, 108],
      schuh: [14, 14, 14],
      schaft: 0.3,
      arm: true,
      saum: 0.1,
      hemd: [150, 152, 140],
      schlips: [58, 60, 56],
      vtief: 0.13,
      vweit: 0.4,
      kragen: [70, 130, 80],
      schulter: [62, 118, 72],
      band: [40, 120, 60],
      knopf: [176, 174, 160],
      taschen: true,
      koppel: [36, 34, 30],
    },
  };
  // ---- the people of the afternoon (added to the core's cast; figures: the Rocketbox files of the village and the streets) ----
  const CAST = {
    erna: {
      name: 'Erna',
      fig: 'vk_f15',
      clips: 'f',
      h: 1.6,
      stoop: 0.12,
      kleid: 'kittel',
      hut: 'kopftuch',
      brille: 'gross',
      ding: 'besen',
      voice: { g: 'f', age: 66 },
    },
    horst: {
      name: 'Horst',
      fig: 'vk_m11',
      clips: 'm',
      h: 1.74,
      stoop: 0.06,
      kleid: 'watte',
      hut: 'schieber',
      bart: 'schnauzer',
      ding: 'schaufel',
      voice: { g: 'm', age: 58 },
    },
    renate: {
      name: 'Renate',
      fig: 'vk_f12',
      clips: 'f',
      h: 1.66,
      kleid: 'anorak',
      hut: null,
      haar: 'dauerwelle',
      ding: 'netz',
      voice: { g: 'f', age: 38 },
    },
    maik: {
      name: 'Maik',
      fig: 'vk_m20',
      clips: 'm',
      h: 1.78,
      kleid: 'stonewash',
      haar: 'vokuhila',
      bart: 'schnauzer',
      voice: { g: 'm', age: 19 },
    },
    ines: {
      name: 'Ines',
      fig: 'vk_f07',
      clips: 'f',
      h: 1.68,
      kleid: 'jeans89',
      haar: 'dauerwellelang',
      voice: { g: 'f', age: 20 },
    },
    gisela: {
      name: 'Gisela',
      fig: 'dorf_katrin',
      clips: 'f',
      h: 1.65,
      kleid: 'kittelweiss',
      haar: 'dauerwelle',
      brille: 'gross',
      voice: { g: 'f', age: 46 },
    },
    brigitte: {
      name: 'Brigitte',
      fig: 'dorf_ingrid',
      clips: 'f',
      h: 1.62,
      kleid: 'wintermantel',
      hut: 'kopftuchbunt',
      ding: 'beutel',
      voice: { g: 'f', age: 57 },
    },
    werner: {
      name: 'Werner',
      fig: 'dorf_wolfgang',
      clips: 'm',
      h: 1.76,
      kleid: 'mantel89',
      hut: 'hut',
      brille: 'gross',
      ding: 'tasche',
      voice: { g: 'm', age: 61 },
    },
    kurt: {
      name: 'Kurt',
      fig: 'dorf_manfred',
      clips: 'm',
      h: 1.7,
      stoop: 0.14,
      kleid: 'loden',
      hut: 'schiebergrau',
      bart: 'schnauzer',
      voice: { g: 'm', age: 74 },
    },
    abv: {
      name: 'Der ABV',
      fig: 'vk_m16',
      clips: 'm',
      h: 1.78,
      kleid: 'vopomantel',
      hut: 'vopo',
      bart: 'schnauzer',
      voice: { g: 'm', age: 50 },
    },
  };
  // ---- the young Gerhard (the player's own figure, repainted): parka, corduroy, the glasses and the moustache of the time ----
  const GERHARD = { kleid: 'parka', brille: 'gross', gestell: 'gold', bart: 'schnauzer' };
  // ---- where they are and what they do (site metres; hd compass degrees). tun: 'kehren' sweeping, 'kohlen' shovelling briquettes into
  //      buckets, 'schlange' queueing, 'laden' in the shop's door, 'moped' bent over the moped, 'stehen', 'lesen' before the notice
  //      board, 'gehen' walking a round (weg) with pauses; zu: whom they talk to while nobody else is near ----
  const LEUTE = {
    //      r: how far this one sees what the teacher carries (m; busy people look at their work, the queue at the shop's door)
    gisela: { pos: [235.9, -63.3], hd: 204, tun: 'laden', r: 13 },
    brigitte: { pos: [235.2, -65.0], hd: 22, tun: 'schlange', zu: 'gisela', r: 11 },
    renate: { pos: [234.4, -66.3], hd: 30, tun: 'schlange', zu: 'brigitte', r: 11 },
    erna: { pos: [228.6, -92.2], hd: 250, tun: 'kehren', r: 15 },
    kurt: { pos: [220.4, -86.2], hd: 27, tun: 'lesen', r: 10 },
    maik: { pos: [221.6, -103.4], hd: 115, tun: 'moped', r: 11 },
    ines: { pos: [223.4, -104.6], hd: 300, tun: 'stehen', zu: 'maik', r: 22 },
    horst: { pos: [199.3, -103.6], hd: 200, tun: 'kohlen', r: 15 },
    werner: {
      pos: [262.0, -110.6],
      hd: 290,
      r: 26,
      tun: 'gehen',
      weg: [
        [262.0, -110.6],
        [241.0, -103.6],
        [217.0, -96.9],
        [207.5, -107.5],
        [217.0, -96.9],
        [241.0, -103.6],
      ],
    },
  };
  // ---- what they say when the teacher comes near (one after the other) ----
  const SAGT = {
    erna: [
      'Gerhard! Morgen nach Suhl in den Waffenschmied, ja? Zwei Jahre habt ihr auf den Tisch gewartet!',
      'Erst wird gebadet, alle zusammen, dann gibt’s Kimonos. Hat die Brigitte erzählt.',
      'Die halbe Straße ist seit heute früh in Suhl auf dem Volkspolizeikreisamt, das Visum holen. Und wer kehrt hier? Ich.',
      'Was schleppst du denn da? Na, geht mich ja nichts an.',
    ],
    horst: [
      'Morgen früh fahren wir rüber. Über Eisfeld nach Coburg. Hundert Mark Begrüßungsgeld soll es geben.',
      'Und die Bayern legen noch vierzig drauf, sagt der Schwager. Der war heute schon drüben.',
      'Der Trabi packt das. Ist ja nur einmal übern Berg.',
      'Zwanzig Zentner Briketts, und keiner da, der mit anfasst. Alle im Westen.',
    ],
    renate: [
      'In der Kaufhalle in Schleusingen gibt’s Apfelsinen. Kuba. Aber Apfelsinen.',
      'Der ABV war vorhin bei der Schule. Sucht der dich?',
      'Morgen ist doch Unterricht? Meine zwei wollen nicht hin – die halbe Klasse ist in Coburg.',
    ],
    brigitte: [
      'In Eisfeld stehen sie Schlange bis in die Stadt rein, heißt es. Trabi an Trabi.',
      'Gestern Abend haben wir es im Westfernsehen gesehen. Geglaubt hab ich es erst heute früh.',
      'Im Waffenschmied war ich einmal, zweiundachtzig. Erst ins Becken, dann der Kimono. Geschmeckt hat es auch.',
    ],
    gisela: [
      'Brot ist alle, Milch kommt um vier. Wie immer.',
      'Bananen? Gerhard. Wir haben November.',
      'Um sechs schließ ich zu. Wenn dann noch einer da ist, der was kaufen will.',
    ],
    maik: [
      'Stonewashed, original. Hat mein Onkel im Westpaket geschickt.',
      'Den Stempel hab ich schon. Um fünf früh angestanden, in Suhl.',
      'Ich fahr mit der Simme rüber. Wenn sie anspringt.',
    ],
    ines: [
      'Glaubst du das, was die im Radio sagen?',
      'Meine Schwester ist im September über Ungarn weg. Jetzt hätte sie einfach den Bus nehmen können.',
      'Morgen ist Disko im Kulturhaus. Wenn dann noch einer hier ist.',
    ],
    werner: [
      'Achtundzwanzig Jahre zu. Und dann liest einer einen Zettel vor, und sie ist auf.',
      'Im Betrieb war heute die halbe Brigade nicht da. Krank, sagen sie. Krank in Coburg.',
      'Ich fahr erst, wenn ich weiß, dass ich auch wieder reinkomme.',
    ],
    kurt: [
      'Zweiundfünfzig haben sie an der Grenze die Leute ausgesiedelt, einundsechzig alles dichtgemacht. Dass einer aufmacht, hab ich noch nicht erlebt.',
      'Die Wandzeitung ist noch vom Oktober. Vierzig Jahre DDR. Die hängt keiner mehr ab.',
      'Pass auf dich auf, Junge. Wenn sich alles dreht, will mancher noch schnell was wegschaffen.',
    ],
    abv: GLDATA.J89.leute.abv,
    lutz: GLDATA.J89.leute.lutz,
  };
  // ---- the radio through an open window (until the stations of 1989 of grenzland/gl_radio.js are there) ----
  const RADIO = [
    'Berlin. Seit gestern Abend können Bürger der DDR ohne Vorliegen besonderer Voraussetzungen über alle Grenzübergangsstellen ausreisen.',
    'Die Visa erteilen die Volkspolizeikreisämter unverzüglich. An den Übergängen nach Bayern bilden sich zur Stunde lange Schlangen.',
    'Sofia. Todor Shiwkow ist als Generalsekretär der Bulgarischen Kommunistischen Partei zurückgetreten.',
    'Das Wetter: nach frostiger Nacht heiter und trocken, dunstig. Am Abend rasche Abkühlung, in den Tälern Nebel.',
  ];
  // ---- the street of the time: what is written where (no logos; the lettering is our own) ----
  const SCHRIFT = {
    losung: '40 JAHRE DDR',
    losung2: 'ALLES ZUM WOHLE DES VOLKES',
    konsum: 'KONSUM',
    konsum2: 'Lebensmittel',
    zeiten: ['Mo–Fr  7–12  14–18', 'Sa  7–11'],
    post: 'DEUTSCHE POST',
    fernsprecher: 'Fernsprecher',
    wandzeitung: 'WANDZEITUNG',
    halt: 'Ratscher',
    plakate: ['KIRMES-TANZ', 'KULTURHAUS', 'ALTSTOFFE SAMMELN', 'FILM'],
  };
  // ---- the picture (the lead's grade in gl_hud.js is judged against these wishes), the light, the air ----
  const BILD = {
    uhr: 15 * 60 + 35,
    // game minutes per real second while the flashback runs (the afternoon turns to dusk in about ten minutes of play)
    tempo: 0.085,
    wetter: 'heiter',
    dunst: 0.0021, // the haze of a November afternoon over a valley heated with brown coal (exponential-squared fog)
    wand: [0.8, 0.76, 0.7], // the plaster and the timber of 1989: unrenovated, greyed (a tint on the facades)
    dach: [0.8, 0.74, 0.72],
    laub: [1.25, 0.82, 0.5], // the last leaves of November on the trees' crowns (a tint on the far crowns)
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  Object.assign(GLDATA.KLEID, KLEID);
  Object.assign(GLDATA.CAST, CAST);
  return { KLEID, CAST, GERHARD, LEUTE, SAGT, RADIO, SCHRIFT, BILD, dist, MITTE: [228, -90], RADIUS: 150 };
})();
if (typeof window !== 'undefined') window.GL89DATA = GL89DATA;
