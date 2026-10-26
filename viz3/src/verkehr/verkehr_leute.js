// ===================== feat/verkehr 1: the people on the streets – who they are and what they say (VLEUTE) =====================
// Falko, 25.10.2026: „Außerdem sollen ab und zu auch Leute einfach durchs Dorf schlendern oder auch mal mit dem Auto fahren. Auch in
// Schleusingen.“ – and everyone here says du to the player. Ten people from Ratscher and Schleusingen (none of them one of the eight
// villagers of dorf/dorf_text.js): name, gender, age, a one-line role, a two-sentence character sheet (for the free conversation of
// npc/ki.js), the figure (chars/vk_*.json, viz3/extra/verkehr/build_figures.sh), where they walk (dorf, stadt), a dog or a bag, a car
// (colour) for those who drive, a greeting, a word in passing, two or three small-talk topics, and what they say as a driver.
// Plain data, no imports: the Kern-Chat registers them with KI.person (verkehr/verkehr.js does it when KI is there).
export const VLEUTE = (() => {
  const P = {
    bettina: {
      name: 'Bettina',
      full: 'Bettina Kühn',
      g: 'f',
      age: 63,
      role: 'Rentnerin mit Dackel Lotte',
      sheet:
        'Bettina war über dreißig Jahre Kassiererin bei der Sparkasse in Schleusingen und ist seit dem Frühjahr in Rente. Sie geht zweimal am Tag mit ihrer Dackeldame Lotte durchs Dorf, bleibt an jedem Gartenzaun stehen und weiß deshalb immer zuerst, was es Neues gibt.',
      fig: 'vk_f14',
      clips: 'f',
      h: 1.64,
      stoop: 0.06,
      walk: 0.85,
      where: ['dorf'],
      dog: { kind: 'dackel', name: 'Lotte' },
      greet: [
        'Na, auch unterwegs? Lotte, sitz! – Die tut nichts, die will nur schnuppern.',
        'Hallo! Du bist doch aus dem Garten bei Hubert, oder? Wie weit ist denn dein Pavillon?',
      ],
      pass: ['Hallo!', 'Na, schönen Tag noch!', 'Komm, Lotte, weiter.'],
      topics: {
        lotte: [
          'Lotte',
          'Lotte ist neun und hält sich für einen Jagdhund. Letzte Woche hat sie bei Heike ein Huhn bis in den Stall gejagt – seitdem gehen wir da an der Leine vorbei.',
          'Zweimal am Tag die große Runde, sonst wird sie zu dick. Und ich auch.',
        ],
        dorf: [
          'Was gibt es Neues?',
          'Die Linde am Anger soll im Winter geschnitten werden. Gerhard sagt, er schreibt es in die Chronik, wenn sie danach schief steht.',
          'Freitags ist wieder Skat in der alten Schule. Ich spiel ja nur Rommé – aber da sitzt man wenigstens nicht allein.',
        ],
        sparkasse: [
          'Die Sparkasse',
          'Dreißig Jahre am Schalter in Schleusingen. Da kennst du jeden – und jeder weiß, dass du seinen Kontostand kennst.',
        ],
      },
    },
    sabine: {
      name: 'Sabine',
      full: 'Sabine Wolf',
      g: 'f',
      age: 44,
      role: 'Grundschullehrerin in Schleusingen',
      sheet:
        'Sabine unterrichtet seit zwanzig Jahren an der Grundschule in Schleusingen und wohnt mit ihrer Familie am Ortsrand von Ratscher. Sie ist freundlich, aber immer ein bisschen in Eile, und erzählt gern von ihren Schulkindern.',
      fig: 'vk_f02',
      clips: 'f',
      h: 1.68,
      walk: 1.3,
      where: ['dorf', 'stadt'],
      bag: true,
      car: '#7c1b17',
      greet: [
        'Hallo! Entschuldige, ich bin ein bisschen in Eile – die Hefte korrigieren sich nicht von allein.',
        'Hallo du! Na, hast du dich schon eingelebt hier?',
      ],
      pass: ['Hallo!', 'Tag!', 'Schönen Tag noch!'],
      topics: {
        schule: [
          'Die Schule',
          'Dritte Klasse, vierundzwanzig Kinder. Heute haben wir Kartoffeldruck gemacht – meine Hose sieht aus wie ein Feld nach dem Regen.',
          'Die Kinder aus Ratscher fahren mit dem Bus nach Schleusingen. Der kommt pünktlich – fast immer.',
        ],
        wetter: ['Das Wetter', 'Morgens ist es schon richtig frisch. Ich hab die Handschuhe wieder ins Auto gelegt.'],
      },
      drive: {
        halt: 'Hallo! Soll ich dich ein Stück mitnehmen? Ich fahr {ziel}.',
        mit: 'Steig ein – und schnall dich an, ich bin Lehrerin.',
        selbst: 'Mein Auto? Na gut … aber nur eine kleine Runde, und bring es heil zurück!',
        back: 'Danke! Und – keine Kratzer? Sehr schön.',
      },
    },
    anja: {
      name: 'Anja',
      full: 'Anja Hoffmann',
      g: 'f',
      age: 35,
      role: 'Tiermedizinische Fachangestellte, mit Hund Bruno',
      sheet:
        'Anja arbeitet in einer Tierarztpraxis in Hildburghausen und ist in Ratscher aufgewachsen. Sie ist sportlich, direkt und geht mit ihrem Hund Bruno am liebsten Richtung Klinge in den Wald.',
      fig: 'vk_f07',
      clips: 'f',
      h: 1.7,
      walk: 1.25,
      where: ['dorf'],
      dog: { kind: 'hund', name: 'Bruno' },
      greet: [
        'Hi! Bruno, aus! – Sorry, der freut sich über jeden.',
        'Hallo! Willst du auch Richtung Wald? Da oben riecht es grad herrlich nach Pilzen.',
      ],
      pass: ['Hi!', 'Hallo!', 'Bruno, bei Fuß!'],
      topics: {
        bruno: ['Bruno', 'Bruno ist aus dem Tierheim in Suhl. Halb Spaniel, halb Staubsauger.'],
        wald: [
          'Der Wald',
          'An der Klinge sind die Fichten ganz schön mitgenommen vom Käfer. Wolfgang sagt, da wird bald viel gefällt.',
        ],
        arbeit: [
          'Die Arbeit',
          'Gestern hatten wir eine Ziege in der Praxis, die hatte einen Handschuh gefressen. Ganz. Es geht ihr gut.',
        ],
      },
    },
    claudia: {
      name: 'Claudia',
      full: 'Claudia Brandt',
      g: 'f',
      age: 41,
      role: 'Verkäuferin in der Bäckerei am Markt in Schleusingen',
      sheet:
        'Claudia steht seit sechs Uhr früh hinter der Theke der Bäckerei am Markt in Schleusingen und kennt die halbe Stadt beim Vornamen. Sie ist herzlich, redet schnell und empfiehlt jedem den Mohnkuchen.',
      fig: 'vk_f15',
      clips: 'f',
      h: 1.67,
      walk: 1.15,
      where: ['stadt'],
      bag: true,
      car: '#c8b78a',
      greet: [
        'Hallo! Na, hast du schon Mittag gegessen? Bei uns gibt es heute noch Mohnkuchen – der letzte geht immer zuerst.',
        'Grüß dich! Ach, du baust doch den Pavillon in Ratscher – Hubert hat erzählt.',
      ],
      pass: ['Hallo!', 'Grüß dich!', 'Tschüss!'],
      topics: {
        baeckerei: [
          'Die Bäckerei',
          'Um drei backt der Chef, um sechs mach ich auf. Und um halb sieben steht der Bürgermeister da und will zwei Brötchen, immer dieselben.',
        ],
        markt: [
          'Der Markt',
          'Am Samstag ist hier Wochenmarkt: Käse aus der Rhön, Honig aus Hinternah und der Mann mit den Thüringer Klößen.',
        ],
      },
      drive: {
        halt: 'Hallo! Musst du auch irgendwohin? Ich fahr {ziel}.',
        mit: 'Steig ein, ich nehm dich mit.',
        selbst: 'Du willst fahren? Na gut, aber ich will ihn wiederhaben – ich muss noch Kuchen ausfahren!',
        back: 'Da ist er ja wieder. Danke dir!',
      },
    },
    lea: {
      name: 'Lea',
      full: 'Lea Schmidt',
      g: 'f',
      age: 19,
      role: 'Auszubildende zur Kfz-Mechatronikerin',
      sheet:
        'Lea macht in Schleusingen eine Ausbildung zur Kfz-Mechatronikerin und wohnt noch bei ihren Eltern in Ratscher. Sie ist locker, sagt, was sie denkt, und spart auf ein eigenes Auto.',
      fig: 'vk_f12',
      clips: 'f',
      h: 1.65,
      walk: 1.3,
      where: ['dorf', 'stadt'],
      bag: true,
      greet: ['Hey! Alles klar bei dir?', 'Hi! Du bist neu im Garten hinter dem Dorf, oder? Jens hat von dir erzählt.'],
      pass: ['Hey!', 'Hi!', 'Bis dann!'],
      topics: {
        lehre: [
          'Die Ausbildung',
          'Zweites Lehrjahr. Gestern hab ich zum ersten Mal allein einen Zahnriemen gewechselt. Der Meister hat nur genickt – das ist bei ihm ein großes Lob.',
        ],
        auto: ['Ein eigenes Auto', 'Ich spar auf einen alten Golf. Den mach ich mir dann selbst – Bremsen, Öl, alles.'],
      },
    },
    thomas: {
      name: 'Thomas',
      full: 'Thomas Reinhardt',
      g: 'm',
      age: 54,
      role: 'Bauingenieur, baut sein Elternhaus in Ratscher um',
      sheet:
        'Thomas ist Bauingenieur beim Straßenbauamt in Suhl und baut gerade das Haus seiner Eltern in Ratscher um. Er ist ruhig, gründlich und fragt jeden nach seinem Dach.',
      fig: 'vk_m02',
      clips: 'm',
      h: 1.8,
      stoop: 0.03,
      walk: 1.15,
      where: ['dorf'],
      car: '#9ea3a7',
      greet: [
        'Tag! Na, wie kommt der Pavillon voran? Wenn du mal einen Rat zum Dach brauchst – da bin ich eigen.',
        'Hallo! Schönes Wetter zum Bauen, was?',
      ],
      pass: ['Tag!', 'Hallo!', 'Schönen Tag!'],
      topics: {
        haus: [
          'Das Elternhaus',
          'Das Haus ist von 1911. Unter dem Putz war Fachwerk – Eiche, noch gut. Jetzt bleibt es sichtbar, auch wenn meine Frau sagt, das zieht.',
        ],
        strasse: [
          'Die Straßen',
          'Die Kreisstraße nach Schleusingen ist eigentlich dran. Eigentlich. Seit acht Jahren.',
        ],
      },
      drive: {
        halt: 'Tag! Was gibt es? Ich fahr {ziel} – soll ich dich mitnehmen?',
        mit: 'Steig ein, ich fahr eh in die Richtung.',
        selbst: 'Du willst selbst fahren? … Na schön. Der zweite Gang hakt ein bisschen, nicht erschrecken.',
        back: 'Alles gut? Dann fahr ich mal weiter.',
      },
    },
    frank: {
      name: 'Frank',
      full: 'Frank Heinze',
      g: 'm',
      age: 48,
      role: 'Busfahrer bei der Regionalbus-Gesellschaft',
      sheet:
        'Frank fährt seit fünfzehn Jahren Linienbus zwischen Schleusingen, Hildburghausen und den Dörfern dazwischen. Er ist gesellig, kennt jede Kurve und jeden Fahrgast und erzählt gern Geschichten von unterwegs.',
      fig: 'vk_m07',
      clips: 'm',
      h: 1.78,
      walk: 1.2,
      where: ['dorf', 'stadt'],
      car: '#26496f',
      greet: [
        'Na, grüß dich! Heute hab ich frei – da fahr ich mal nicht, da geh ich.',
        'Hallo! Wenn du mal mit dem Bus nach Schleusingen willst: der erste geht um sechs Uhr zwölf.',
      ],
      pass: ['Grüß dich!', 'Na?', 'Mach’s gut!'],
      topics: {
        bus: [
          'Der Bus',
          'Morgens die Schulkinder, mittags die Rentner zum Arzt, abends die Pendler. Und jeden Donnerstag eine Frau mit einem Korb voller Eier.',
        ],
        strecke: ['Die Strecke', 'Die Kurve vor Rappelsdorf im Winter – da fährst du mit dem Bus wie auf rohen Eiern.'],
      },
      drive: {
        halt: 'Na, grüß dich! Die Haltestelle ist zwar woanders – aber ich fahr {ziel}, steig ruhig ein.',
        mit: 'Nächster Halt kommt gleich. Bitte nicht mit dem Fahrer reden – kleiner Scherz.',
        selbst: 'Selber fahren? Ich fahr den ganzen Tag Bus, da lass ich auch mal gern fahren. Bitte schön!',
        back: 'Danke fürs Zurückbringen. Ordentlich geparkt hast du ihn auch.',
      },
    },
    marco: {
      name: 'Marco',
      full: 'Marco Schreiber',
      g: 'm',
      age: 31,
      role: 'Zimmermann, war drei Jahre auf der Walz',
      sheet:
        'Marco ist Zimmermann und war drei Jahre und einen Tag auf der Walz, bis hinauf nach Norwegen. Jetzt arbeitet er in einem Holzbaubetrieb bei Schleusingen; er ist gutmütig, interessiert sich für jeden Balken und hat zum Pavillon sofort eine Meinung.',
      fig: 'vk_m20',
      clips: 'm',
      h: 1.82,
      walk: 1.3,
      where: ['dorf', 'stadt'],
      car: '#e6e4de',
      greet: [
        'Servus! Du baust doch den Pavillon draußen beim Garten? Lärche oder Fichte?',
        'Hallo! Wenn du mal einen Zimmermann brauchst – ich kenn da einen.',
      ],
      pass: ['Servus!', 'Hallo!', 'Bis dann!'],
      topics: {
        walz: [
          'Die Walz',
          'Drei Jahre und ein Tag, nie näher als fünfzig Kilometer an zu Hause. Am schönsten war ein Dachstuhl in Südtirol.',
        ],
        holz: [
          'Holz',
          'Wenn du Holz aus der Klinge nimmst: im Winter schlagen, gut stapeln, Leisten dazwischen. Dann wird das was.',
        ],
      },
      drive: {
        halt: 'Servus! Wohin soll es gehen? Ich fahr {ziel}.',
        mit: 'Klar, steig ein.',
        selbst: 'Na hör mal – mein Auto? … Ach, was soll’s. Aber pass auf die Säge im Kofferraum auf.',
        back: 'Danke! Säge ist auch noch da. Bis dann!',
      },
    },
    stefan: {
      name: 'Stefan',
      full: 'Stefan Lorenz',
      g: 'm',
      age: 38,
      role: 'Krankenpfleger in Hildburghausen',
      sheet:
        'Stefan ist Krankenpfleger in Hildburghausen und arbeitet oft Nachtschicht. Er ist ruhig, hilfsbereit und erholt sich am liebsten mit langen Spaziergängen zwischen den Dörfern.',
      fig: 'vk_m11',
      clips: 'm',
      h: 1.79,
      walk: 1.1,
      where: ['dorf', 'stadt'],
      car: '#2e4a37',
      greet: [
        'Hallo. Nach der Nachtschicht muss ich erst mal laufen, sonst schlaf ich nicht.',
        'Na, du? Schöne Ecke hier, oder?',
      ],
      pass: ['Hallo.', 'Tag.', 'Schönen Tag noch.'],
      topics: {
        schicht: ['Die Arbeit', 'Zwölf Nächte im Monat. Man gewöhnt sich dran – sagt man. Ich warte noch drauf.'],
        gegend: [
          'Die Gegend',
          'Von Ratscher über den Berg nach Schleusingen ist es zu Fuß knapp eine Stunde. Mit dem Blick runter auf die Talsperre lohnt sich jeder Schritt.',
        ],
      },
      drive: {
        halt: 'Hallo. Alles in Ordnung bei dir? Ich fahr {ziel}.',
        mit: 'Steig ein, ich nehm dich mit.',
        selbst: 'Hm, ich bin eigentlich müde von der Schicht … na gut, fahr du. Aber langsam.',
        back: 'Danke. Dann leg ich mich jetzt endlich hin.',
      },
    },
    jonas: {
      name: 'Jonas',
      full: 'Jonas Becker',
      g: 'm',
      age: 22,
      role: 'Student in Ilmenau, am Wochenende zu Hause in Schleusingen',
      sheet:
        'Jonas studiert Elektrotechnik in Ilmenau und kommt am Wochenende zu seinen Eltern nach Schleusingen. Er ist neugierig, etwas zerstreut und hat immer Kopfhörer um den Hals.',
      fig: 'vk_m16',
      clips: 'm',
      h: 1.8,
      walk: 1.35,
      where: ['stadt', 'dorf'],
      bag: true,
      greet: [
        'Hi! Sorry, hab dich fast nicht gesehen – Kopfhörer.',
        'Hey! Weißt du, ob heute noch ein Bus nach Ilmenau fährt?',
      ],
      pass: ['Hi!', 'Hey!', 'Ciao!'],
      topics: {
        studium: [
          'Das Studium',
          'Elektrotechnik, viertes Semester. Gerade bauen wir einen Roboter, der Unkraut erkennt. Erkennt bisher vor allem Socken.',
        ],
        stadt: [
          'Schleusingen',
          'Die Bertholdsburg oben ist eigentlich das Beste hier. Da drin ist ein Naturkundemuseum – mit einem Riesenalligator.',
        ],
      },
    },
  };
  // what every driver may say (when the person has no line of its own)
  const DRIVE = {
    halt: 'Na? Brauchst du was? Ich fahr {ziel}.',
    mit: 'Steig ein.',
    selbst: 'Na gut, fahr du – aber bring ihn heil zurück!',
    back: 'Danke fürs Zurückbringen!',
    hupe: ['Hallo? Lass mich mal bitte vorbei!', 'Darf ich mal durch?', 'Du stehst im Weg!'],
    ab: 'So, da wären wir. Mach’s gut!',
    wieder: 'Dann fahr ich mal weiter. Tschüss!',
    holt: 'Der Fahrer holt sein Auto später ab.',
    fern: 'Das hast du ja weit weg gestellt … Ich hol’s mir nachher.',
  };
  const KEYS = Object.keys(P);
  // a line of a person, with the place filled in ({ziel}: „zum Anger“ …)
  function line(k, what, ziel) {
    const p = P[k],
      d = (p && p.drive) || {};
    const t = d[what] || DRIVE[what] || '';
    const s = Array.isArray(t) ? t[Math.floor(Math.random() * t.length)] : t;
    return s.replace('{ziel}', ziel || 'ein Stück weiter');
  }
  return { P, KEYS, DRIVE, line };
})();
