// ===================== feat/ortsvorsteher 1: the data of the election and the office (AMTDATA) =====================
// Falko, 23.10.2026 2:52/2:57: a new Ortsvorsteher is sought in Ratscher; one may stand, win the people over with tasks, be elected, and
// as Ortsvorsteher take the village's concerns to the town hall in Schleusingen. Realistic, so one learns how local self-government works:
// Thüringer Kommunalordnung (ThürKO) § 45 – Ortsteilverfassung: Ortsteilbürgermeister (colloquially „Ortsvorsteher“) and Ortsteilrat;
// Thüringer Kommunalwahlgesetz (ThürKWG) § 24 – more than half of the valid votes, else a run-off. Plain data, no imports: the villagers
// (households, circles, how they lean), the issues with the options one can promise, the campaign tasks, the concerns of the office with
// who decides them, and the texts (German UI). The logic is amt/amt_model.js, the game amt/amt.js; docs/features/ortsvorsteher.md.
export const AMTDATA = (() => {
  // ---- the voters: the named people with their household (votes, signatures) and the circle that follows them a little ----
  // Ratscher has about 120 inhabitants, about 100 of them may vote (16 and older). rep0: how they see a newcomer at first (0–100);
  // rival: how close they are to the other candidate (Uwe) – the standing he has with them; ask: the issues they ask about.
  const P = {
    ingrid: {
      name: 'Ingrid',
      full: 'Ingrid Hartung',
      role: 'Ortsteilbürgermeisterin, hört auf',
      hh: 2,
      circle: 12,
      rep0: 55,
      rival: 45,
      ask: ['laterne'],
    },
    gerhard: {
      name: 'Gerhard',
      full: 'Gerhard Möller',
      role: 'Lehrer im Ruhestand, Dorfchronik',
      hh: 2,
      circle: 10,
      rep0: 50,
      rival: 50,
      ask: ['laterne', 'kirmes'],
    },
    manfred: {
      name: 'Manfred',
      full: 'Manfred Ehrhardt',
      role: 'Wehrführer der Feuerwehr',
      hh: 3,
      circle: 12,
      rep0: 45,
      rival: 55,
      ask: ['kirmes'],
    },
    wolfgang: {
      name: 'Wolfgang',
      full: 'Wolfgang Kühn',
      role: 'Waldarbeiter',
      hh: 2,
      circle: 6,
      rep0: 45,
      rival: 55,
      ask: ['feldweg', 'laterne'],
    },
    katrin: {
      name: 'Katrin',
      full: 'Katrin Seifert',
      role: 'Pflegerin, zwei Kinder',
      hh: 2,
      circle: 10,
      rep0: 50,
      rival: 45,
      ask: ['tempo30', 'laterne'],
    },
    heike: {
      name: 'Heike',
      full: 'Heike Ritter',
      role: 'Gemüsegarten und Hühner',
      hh: 2,
      circle: 6,
      rep0: 45,
      rival: 50,
      ask: ['ziegen', 'tempo30'],
    },
    jens: {
      name: 'Jens',
      full: 'Jens Wagner',
      role: 'Kfz-Mechaniker, Feuerwehr',
      hh: 1,
      circle: 6,
      rep0: 45,
      rival: 55,
      ask: ['tempo30', 'kirmes'],
    },
    hubert: {
      name: 'Hubert',
      full: 'Hubert',
      role: 'Nachbar im Westen',
      hh: 1,
      circle: 2,
      rep0: 35,
      rival: 50,
      npc: true,
      away: 'briefwahl', // on election day at his sister's in Suhl: votes only by post
      ask: ['feldweg'],
    },
    ronald: {
      name: 'Ronald',
      full: 'Ronald',
      role: 'Nachbar im Osten, Ziegen',
      hh: 1,
      circle: 2,
      rep0: 45,
      rival: 45,
      npc: true,
      ask: ['ziegen'],
    },
    uwe: {
      name: 'Uwe',
      full: 'Uwe Bachmann',
      role: 'Landwirt, kandidiert auch',
      hh: 3,
      circle: 12,
      rep0: 50,
      rival: 95,
      opp: true,
      ask: ['kirmes', 'feldweg'],
    },
  };
  const KEYS = Object.keys(P);
  const REST = 6; // voters in no circle: they go by the general mood
  const RIVAL = 'uwe';
  const SIGS = 20; // support signatures: five times the members of the Ortsteilrat (4 below 500 inhabitants)
  const ORTSRAT = ['manfred', 'katrin', 'gerhard', 'uwe']; // the Ortsteilrat (4 members) – the chair is the Ortsvorsteher
  const BUDGET = 600; // the Ortsteil's own money a year: 5 euros per inhabitant (§ 45 (6) ThürKO), about 120 inhabitants
  // ---- the issues: what people ask the candidate, the options one can promise, who is pleased or annoyed (rep deltas) ----
  const ISSUES = {
    laterne: {
      title: 'Laterne am Gartenweg',
      q: 'Und die Laterne am Weg zu den Gärten? Abends ist es da stockdunkel.',
      opts: {
        ja: {
          say: 'Ja, da kommt eine Laterne hin.',
          eff: { katrin: 6, heike: 5, ingrid: 2, gerhard: -6, wolfgang: -5 },
        },
        nein: {
          say: 'Nein – der dunkle Himmel über Ratscher ist etwas Besonderes.',
          eff: { katrin: -6, heike: -4, gerhard: 5, wolfgang: 4 },
        },
        mitte: {
          say: 'Eine Laterne, aber abgeschirmt, warmweiß, mit Bewegungsmelder.',
          eff: { katrin: 3, heike: 3, gerhard: 3, wolfgang: 2, ingrid: 2 },
          learn:
            'Abgeschirmte, warmweiße Leuchten mit Bewegungsmelder blenden nicht, locken weniger Insekten an und lassen den Sternenhimmel dunkel.',
        },
      },
      care: ['katrin', 'heike', 'gerhard', 'wolfgang', 'ingrid'],
    },
    tempo30: {
      title: 'Tempo 30 im Ort',
      q: 'Die Autos rasen durchs Dorf, und morgens stehen die Kinder an der Haltestelle. Bist du für Tempo 30?',
      opts: {
        ja: { say: 'Ja, ich sorge für Tempo 30.', eff: { katrin: 6, heike: 4, gerhard: 2, jens: -4, uwe: -2 } },
        nein: { say: 'Nein, Tempo 50 reicht.', eff: { katrin: -5, heike: -3, jens: 3, uwe: 2 } },
        mitte: {
          say: 'Erst messen – mit einer Geschwindigkeitsanzeige. Dann beantragt die Stadt Tempo 30 beim Landratsamt.',
          eff: { katrin: 3, heike: 2, gerhard: 2, ingrid: 2, jens: 1 },
          learn:
            'Tempo 30 auf einer Durchgangsstraße ordnet nicht die Stadt an, sondern die Straßenverkehrsbehörde im Landratsamt. Versprich nur, was du halten kannst.',
        },
      },
      care: ['katrin', 'heike', 'jens', 'gerhard'],
    },
    kirmes: {
      title: 'Die Kirmes',
      q: 'Seit Jahren gab es keine Kirmes mehr in Ratscher. Holen wir sie zurück?',
      opts: {
        ja: {
          say: 'Ja – im September, die Feuerwehr richtet sie aus.',
          eff: { manfred: 7, jens: 5, gerhard: 3, wolfgang: 1, uwe: -3 },
        },
        nein: { say: 'Dafür fehlt das Geld.', eff: { manfred: -6, jens: -4, gerhard: -2, uwe: 1 } },
        mitte: {
          say: 'Ja – im Oktober nach der Ernte, Feuerwehr und Landwirte gemeinsam.',
          eff: { manfred: 4, jens: 3, uwe: 4, gerhard: 3, katrin: 2 },
        },
      },
      care: ['manfred', 'jens', 'gerhard', 'uwe'],
    },
    feldweg: {
      title: 'Feldweg zur Klinge',
      q: 'Der Feldweg zur Klinge besteht nur noch aus Löchern. Machst du da was?',
      opts: {
        ja: {
          say: 'Ich bringe den Feldweg in den Stadtrat.',
          eff: { hubert: 6, wolfgang: 4, uwe: 3, ronald: 2 },
        },
        nein: { say: 'Feldwege sind nicht das Wichtigste.', eff: { hubert: -5, wolfgang: -3, uwe: -2 } },
      },
      care: ['hubert', 'wolfgang', 'uwe', 'ronald'],
    },
    ziegen: {
      title: 'Ziegen im Gemüse',
      q: null, // a conflict, not a question: the task „Ziegen im Gemüse“
      opts: {
        heike: {
          say: 'Ronald muss für die Bohnen zahlen und den Zaun richten.',
          eff: { heike: 6, ronald: -10, hubert: -2 },
        },
        ronald: {
          say: 'Ziegen gehören aufs Dorf – ein paar Bohnen sind nicht schlimm.',
          eff: { ronald: 6, heike: -10 },
        },
        mitte: {
          say: 'Wir richten den Zaun gemeinsam, und Ronald bringt Heike Mist für die Beete.',
          eff: { heike: 6, ronald: 6, hubert: 2 },
        },
      },
      care: ['heike', 'ronald'],
    },
  };
  // changing one's word later costs trust with everyone who heard the first one
  const FLIP = -5;
  // ---- the campaign: tasks of the residents (each one person; the steps are run by amt/amt.js) ----
  const TASKS = {
    unterschriften: {
      title: '20 Unterschriften',
      who: null,
      text: 'Sammle 20 Unterstützungsunterschriften von Wahlberechtigten aus Ratscher.',
    },
    einreichen: {
      title: 'Wahlvorschlag einreichen',
      who: null,
      text: 'Reiche den Wahlvorschlag mit den Unterschriften beim Wahlleiter im Rathaus Schleusingen ein.',
    },
    hydrant: {
      title: 'Der Hydrant am Anger',
      who: 'manfred',
      text: 'Finde den Unterflurhydranten am Anger nach dem Hinweisschild und mach den Deckel frei.',
      gain: { manfred: 12, jens: 5 },
    },
    chronik: { title: 'Für die Chronik', who: 'gerhard', text: 'Erzähl Gerhard, warum du kandidierst.' },
    bus: {
      title: 'Der Schulbus',
      who: 'katrin',
      text: 'Sei an einem Schultag zwischen 6:45 und 7:30 Uhr an der Bushaltestelle.',
      gain: { katrin: 10, heike: 3 },
    },
    zaun: {
      title: 'Ziegen im Gemüse',
      who: 'heike',
      text: 'Ronalds Ziegen waren in Heikes Bohnen. Rede mit beiden – oder richte mit Ronald den Zaun.',
    },
    briefwahl: {
      title: 'Hubert und die Briefwahl',
      who: 'hubert',
      text: 'Hubert ist am Wahlsonntag bei seiner Schwester. Hol mit seiner Vollmacht die Briefwahlunterlagen im Rathaus.',
      gain: { hubert: 10, ronald: 2 },
    },
    amt: { title: 'Was kann das Amt?', who: 'ingrid', text: 'Ingrid erklärt dir das Amt – hör gut zu.' },
    vorstellen: {
      title: 'Vorstellen beim Skatabend',
      who: null,
      text: 'Stell dich freitagabends in der alten Schule allen vor.',
    },
  };
  // Ingrid's questions about the office (the task „Was kann das Amt?“): [question, [answers], index of the right one, explanation]
  const QUIZ = [
    [
      'Darf der Ortsvorsteher im Stadtrat in Schleusingen mit abstimmen?',
      [
        'Ja, er hat eine Stimme wie alle Stadträte.',
        'Nein, aber er darf mitreden und Anträge stellen.',
        'Nein, er darf nur zuhören.',
      ],
      1,
      'Er nimmt beratend an allen Sitzungen teil, die Ratscher betreffen, und darf Anträge stellen – abstimmen dürfen nur die gewählten Stadträte.',
    ],
    [
      'Worüber entscheidet der Ortsteilrat ganz allein?',
      [
        'Über Tempo 30 auf der Durchgangsstraße.',
        'Über ein kleines Budget für Kultur, Soziales, Brauchtum und die Feuerwehr.',
        'Über neue Baugebiete.',
      ],
      1,
      'Rund 5 Euro je Einwohner im Jahr – für Ratscher etwa 600 Euro. Für die Kirmes, eine Bank, die Feuerwehr. Alles andere schlägt er der Stadt vor.',
    ],
    [
      'Der Ortsteilrat schlägt der Stadt etwas vor. Was muss die Stadt tun?',
      [
        'Nichts, ein Vorschlag ist nur ein Vorschlag.',
        'Es sofort umsetzen.',
        'Ihn innerhalb von drei Monaten behandeln und Bescheid geben.',
      ],
      2,
      'So steht es in § 45 der Thüringer Kommunalordnung. Und vor wichtigen Entscheidungen – etwa zum Haushalt – muss die Stadt den Ortsteilrat anhören.',
    ],
  ];
  // Gerhard's question for the chronicle: why do you stand? [answer, effects, his reply]
  const WHY = [
    [
      'Weil mir das Dorf am Herzen liegt und ich zuhören will.',
      { gerhard: 8, ingrid: 4, katrin: 2 },
      'Zuhören. Das schreibe ich so auf. Wer zuhört, erfährt im Dorf mehr als jeder andere.',
    ],
    [
      'Damit endlich etwas passiert – der Feldweg, die Laterne.',
      { gerhard: 3, hubert: 2, wolfgang: 2 },
      'Tatkraft. Gut. Aber pass auf, dass du nicht mehr versprichst, als die Stadt bezahlen kann.',
    ],
    [
      'Ehrlich gesagt: Ingrid hat mich gefragt, und keiner wollte.',
      { gerhard: 5, ingrid: 3 },
      'So sind viele zu ihrem Amt gekommen. Ehrlich ist es jedenfalls – das kommt in die Chronik.',
    ],
  ];
  // what one says when introducing oneself on a Friday evening: [label, effects (everyone present gets +2 besides)]
  const SPEECH = [
    ['Zuhören und die Anliegen nach Schleusingen tragen', { ingrid: 4, gerhard: 4, katrin: 3, manfred: 2, heike: 2 }],
    ['Die Kirmes zurückholen', { manfred: 5, jens: 4, gerhard: 2, uwe: -1 }],
    ['Den Feldweg und die Laterne angehen', { hubert: 3, wolfgang: 2, katrin: 3, heike: 2, gerhard: -2 }],
  ];
  // ---- the office: concerns (Anliegen) the people bring, who decides, what it costs, what changes in the village ----
  // by: 'ortsteil' (the Ortsteilrat decides with its own money), 'stadt' (the town council in Schleusingen), 'kreis' (the district
  // office: traffic authority, school buses), 'privat' (not a matter for any council). cost in euros. fans/foes: rep when it comes.
  const ANLIEGEN = {
    laterne: {
      title: 'Laterne am Gartenweg',
      from: 'katrin',
      ask: 'Am Weg zu den Gärten ist es abends so dunkel – kannst du dich um eine Laterne kümmern?',
      by: 'stadt',
      cost: 4200,
      need: 55,
      fans: { katrin: 6, heike: 4, ingrid: 2 },
      foes: { gerhard: -2, wolfgang: -2 },
      issue: 'laterne',
      build: 'laterne',
      days: 6,
    },
    mitfahrbank: {
      title: 'Mitfahrbank nach Schleusingen',
      from: 'ingrid',
      ask: 'Wer kein Auto hat, kommt am Wochenende kaum in die Stadt. In anderen Dörfern gibt es Mitfahrbänke – wer sich setzt, will mitgenommen werden.',
      by: 'ortsteil',
      cost: 380,
      need: 40,
      fans: { ingrid: 6, gerhard: 5, katrin: 2, heike: 2 },
      foes: {},
      build: 'mitfahrbank',
      days: 3,
    },
    tempo30: {
      title: 'Tempo 30 im Ort',
      from: 'katrin',
      ask: 'Morgens rasen die Pendler durchs Dorf, und die Kinder stehen an der Straße. Bring Tempo 30 in den Stadtrat!',
      by: 'kreis',
      cost: 2900,
      need: 50,
      fans: { katrin: 5, heike: 4, gerhard: 2 },
      foes: { jens: -2 },
      issue: 'tempo30',
      build: 'anzeige',
      days: 5,
    },
    kirmes: {
      title: 'Kirmes in Ratscher',
      from: 'manfred',
      ask: 'Die Feuerwehr würde die Kirmes ausrichten. Aber für Zelt, Musik und Kinderprogramm braucht es einen Zuschuss.',
      by: 'ortsteil',
      cost: 450,
      need: 45,
      fans: { manfred: 7, jens: 5, gerhard: 3, katrin: 2, uwe: 2 },
      foes: {},
      issue: 'kirmes',
      build: 'kirmes',
      days: 2,
    },
    feldweg: {
      title: 'Feldweg zur Klinge',
      from: 'hubert',
      ask: 'Der Weg zur Klinge besteht nur noch aus Löchern. Da muss Schotter rein. Das ist doch Sache der Stadt, oder?',
      by: 'stadt',
      cost: 18000,
      need: 70,
      fans: { hubert: 6, wolfgang: 4, uwe: 4, ronald: 2 },
      foes: {},
      issue: 'feldweg',
      build: null,
      days: 0,
    },
    tafel: {
      title: 'Infotafel an der alten Schule',
      from: 'gerhard',
      ask: 'Jeder, der vorbeiradelt, fragt, was das für ein Haus ist. Eine Tafel mit der Geschichte – 1828, Schule, Kindergarten, Gemeindeamt, Feuerwehr –, die Texte schreibe ich.',
      by: 'ortsteil',
      cost: 260,
      need: 40,
      fans: { gerhard: 8, ingrid: 3, manfred: 2 },
      foes: {},
      build: 'tafel',
      days: 3,
    },
    bushaus: {
      title: 'Bushäuschen: Dach und Fahrplan',
      from: 'wolfgang',
      ask: 'Am Bushäuschen ist das Dach undicht, und der Fahrplan ist seit dem Winter weg. Morgens stehen die Kinder im Regen und wissen nicht, ob der Bus schon durch ist.',
      by: 'stadt',
      cost: 1600,
      need: 50,
      fans: { wolfgang: 5, katrin: 4, ingrid: 2, heike: 2 },
      foes: {},
      build: 'bushaus',
      days: 5,
    },
    ziegenzaun: {
      title: 'Ziegen und Zaun',
      from: 'heike',
      ask: 'Ronalds Ziegen waren schon wieder an meinen Beeten. Kann die Stadt da nichts machen?',
      by: 'privat',
      cost: 0,
      need: 0,
      fans: {},
      foes: {},
      build: null,
      days: 0,
    },
  };
  // who in the Ortsteilrat (and the town council) leans how on a concern: + for, − against (added to the member's mood)
  const LEAN = {
    laterne: { manfred: 0, katrin: 3, gerhard: -2, uwe: -1 },
    mitfahrbank: { manfred: 1, katrin: 2, gerhard: 3, uwe: 0 },
    tempo30: { manfred: -1, katrin: 3, gerhard: 1, uwe: -2 },
    kirmes: { manfred: 3, katrin: 1, gerhard: 2, uwe: 1 },
    feldweg: { manfred: 0, katrin: -1, gerhard: 0, uwe: 3 },
    tafel: { manfred: 1, katrin: 0, gerhard: 3, uwe: -1 },
    bushaus: { manfred: 1, katrin: 2, gerhard: 1, uwe: 0 },
  };
  // ---- texts ----
  const T = {
    letter:
      'Liebe Nachbarin, lieber Nachbar im Garten,\n\nnach elf Jahren lege ich mein Amt als Ortsteilbürgermeisterin von Ratscher nieder – meine Tochter in Suhl bekommt ihr zweites Kind, und ich will Oma sein, nicht nur am Wochenende. Die Stadt setzt eine Nachwahl an.\n\nViele im Dorf sagen „Ortsvorsteher“ dazu. Es ist ein Ehrenamt: zuhören, die Anliegen aus Ratscher nach Schleusingen tragen, den Ortsteilrat leiten.\n\nUwe Bachmann will kandidieren. Ich fände es gut, wenn die Leute eine Wahl hätten. Hättest du nicht Lust? Sprich mich an – freitags in der alten Schule oder klingel einfach.\n\nIngrid Hartung',
    notice: (date, deadline) =>
      'BEKANNTMACHUNG der Stadt Schleusingen\n\nNachwahl des Ortsteilbürgermeisters für den Ortsteil Ratscher am ' +
      date +
      ', 8 bis 18 Uhr. Wahlraum: alte Schule Ratscher.\n\nWahlvorschläge mit 20 Unterstützungsunterschriften Wahlberechtigter aus Ratscher bis ' +
      deadline +
      ', 18 Uhr, beim Wahlleiter im Rathaus Schleusingen.\n\nGewählt ist, wer mehr als die Hälfte der gültigen Stimmen erhält. Die Auszählung ist öffentlich.',
    ask: {
      ingrid:
        'Du hast meinen Brief gelesen? Ich meine es ernst. Uwe ist ein guter Mann, aber ein Dorf sollte eine Wahl haben. Stellst du dich zur Wahl?',
      gerhard:
        'Hast du gehört? Ingrid hört auf, bald ist Nachwahl. In der Chronik stehen alle Bürgermeister von Ratscher – und seit 1994, als wir zu Schleusingen kamen, die Ortsteilbürgermeister. Ein neuer Name wäre schön. Wie wär’s mit dir?',
      manfred:
        'Ingrid hört auf, Uwe will’s machen. Der Uwe ist in Ordnung – aber wenn noch einer antritt, muss er sich wenigstens anstrengen. Was ist mit dir?',
      katrin:
        'Ingrid macht Schluss, hast du schon gehört? Wir bräuchten jemanden, der auch an die Familien denkt. Du wärst doch was!',
      heike: 'Ingrid hört auf. Willst du nicht? Du kommst doch rum, mit deinem Holz und dem Pavillon.',
      jens: 'Na, Ortsvorsteher? Im Dorf wird erzählt, Ingrid hätte dich gefragt. Mach doch!',
      wolfgang: 'Ingrid hört auf. Wenn du kandidierst, red mit den Leuten, nicht über sie. Dann wird das was.',
      hubert: 'Ortsvorsteher werden? Sie? Hm. Schlechter als die anderen können Sie’s auch nicht machen.',
      ronald:
        'Die Ingrid hört auf, hab ich gehört. Wär das nichts für dich? Ich würd dich wählen – wenn die Ziegen mitwählen dürften, sowieso.',
      uwe: 'Ich trete an, das weißt du ja. Wenn du auch willst – nur zu. Dann haben die Leute eine Wahl. So gehört sich das.',
    },
    yes: 'Ja, ich stelle mich zur Wahl.',
    no: 'Ich überleg’s mir noch.',
    rival:
      'Uwe Bachmann, 46, Landwirt, kandidiert auch: „Ordnung, Feldwege, kein Geld für Firlefanz.“ Viele kennen ihn seit der Schule.',
    sign: {
      yes: 'Gib her. Name, Geburtsdatum, Anschrift, Unterschrift – so. Meine Familie unterschreibt auch.',
      more: 'Ich frag noch bei den Nachbarn rum. Die unterschreiben, wenn ich’s sage.',
      no: 'Unterschreiben? Ich kenn dich ja kaum. Komm erst mal öfter vorbei.',
      done: 'Hab ich doch schon unterschrieben.',
    },
    greetOffice: [
      'Tag, Herr Ortsvorsteher!',
      'Na, Chef? Was macht die Stadt?',
      'Gut, dass ich dich sehe – als Ortsvorsteher, meine ich.',
      'Unser Ortsvorsteher! Hast du einen Moment?',
    ],
    greetOfficeGrumpy: ['Na, Herr Ortsvorsteher. Viel versprochen, wenig gehalten.', 'Ach, der Ortsvorsteher. Hm.'],
  };
  // ---- learning: how it really works (journal „So funktioniert’s“) and what the game simplifies ----
  const LEARN = [
    [
      'Ortsteil und Ortsteilverfassung',
      'Ratscher gehört seit 1994 zur Stadt Schleusingen. Die Stadt kann in ihrer Hauptsatzung für Ortsteile eine Ortsteilverfassung einführen (§ 45 Thüringer Kommunalordnung). Dann wählen die Bürger des Ortsteils einen Ortsteilbürgermeister – im Dorf sagen viele „Ortsvorsteher“ – und einen Ortsteilrat. In Thüringen heißt das Amt offiziell Ortsteilbürgermeister.',
    ],
    [
      'Die Wahl',
      'Wählen darf, wer 16 ist, Deutscher oder EU-Bürger und seit drei Monaten hier wohnt; gewählt werden kann man ab 18. Wer allein antritt, braucht Unterstützungsunterschriften: fünfmal so viele, wie der Ortsteilrat Mitglieder hat – in Ratscher 20. Gewählt ist, wer mehr als die Hälfte der gültigen Stimmen hat; sonst gibt es zwei Wochen später eine Stichwahl. Die Auszählung ist öffentlich, das Ergebnis wird bekannt gemacht; binnen zwei Wochen kann jeder Wahlberechtigte die Wahl beim Landratsamt anfechten. Die Amtszeit läuft mit der des Stadtrats (fünf Jahre), nach einer Nachwahl für den Rest.',
    ],
    [
      'Das Amt',
      'Ein Ehrenamt: Der Ortsteilbürgermeister ist Ehrenbeamter der Stadt und bekommt eine Aufwandsentschädigung. Er leitet den Ortsteilrat und darf an allen Sitzungen des Stadtrats und seiner Ausschüsse, die den Ortsteil betreffen, beratend teilnehmen und Anträge stellen – abstimmen darf er dort nicht.',
    ],
    [
      'Der Ortsteilrat',
      'Bis 500 Einwohner hat er vier Mitglieder, dazu der Ortsteilbürgermeister als Vorsitzender. Er berät alles, was Ratscher betrifft, und macht der Stadt Vorschläge – die muss sie innerhalb von drei Monaten behandeln und Bescheid geben. Vor wichtigen Entscheidungen, etwa zum Haushalt oder zu Bebauungsplänen, wird er angehört; weicht die Stadt ab, muss sie es begründen. Bei Stimmengleichheit ist ein Antrag abgelehnt.',
    ],
    [
      'Das eigene Geld',
      'Über Geld für Kultur, Sport und Soziales, für Brauchtum wie die Kirmes und für die Unterstützung der Ortsfeuerwehr entscheidet der Ortsteilrat selbst. Wenn die Stadt nichts anderes festlegt, sind es 5 Euro je Einwohner im Jahr – für Ratscher rund 600 Euro. Das reicht für eine Bank oder einen Zuschuss zur Kirmes, nicht für beides und nie für einen Weg.',
    ],
    [
      'Wer entscheidet was?',
      'Straßenlaternen, Gemeindestraßen, Feldwege und der Bauhof: die Stadt – der Stadtrat beschließt, der Bürgermeister setzt um. Tempo 30 auf einer Durchgangsstraße: die Straßenverkehrsbehörde im Landratsamt Hildburghausen; die Stadt kann es nur beantragen. Schulbus und Fahrplan: der Landkreis. Streit unter Nachbarn ist keine Sache des Rats – erst miteinander reden; in Thüringen gibt es dafür auch Schiedsstellen.',
    ],
    [
      'Was das Spiel vereinfacht',
      'Fristen sind auf Tage verkürzt (wirklich: Bekanntmachung spätestens 58 Tage vor der Wahl, Wahlvorschläge bis zum 44. Tag). Der Stadtrat tagt im Spiel jeden Donnerstag (wirklich etwa einmal im Monat), und der Ortsteilrat jederzeit, wenn du ihn einberufst. Die Stimmen sind nach Haushalten und Freundeskreisen gerechnet, nicht für jeden der rund 100 Wahlberechtigten einzeln. Das Spiel nimmt an, dass du mit Hauptwohnsitz in Ratscher gemeldet bist.',
    ],
  ];
  return {
    P,
    KEYS,
    REST,
    RIVAL,
    SIGS,
    ORTSRAT,
    BUDGET,
    ISSUES,
    FLIP,
    TASKS,
    QUIZ,
    WHY,
    SPEECH,
    ANLIEGEN,
    LEAN,
    T,
    LEARN,
  };
})();
