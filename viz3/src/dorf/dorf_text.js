// ===================== feat/dorf village life 2: the people of Ratscher and what they say (DTEXT) =====================
// Six villagers (Microsoft Rocketbox figures, tools/player/build_villagers.sh → chars/dorf_<key>.json): name, age, a line of character,
// the figure (charman key, clip set, height), topics with what each says (German, warm, without dialect – village matters: the old
// school of 1828, now the fire brigade's club house; the Dorflinde planted in 1888; the dam; the forest; the weather; Hubert and Ronald).
// Text only, no voices. Table talk in the school and at the fire, the story of the evening, the card game, the task.
export const DTEXT = (() => {
  const P = {
    gerhard: {
      name: 'Gerhard',
      full: 'Gerhard Möller',
      age: 72,
      role: 'Lehrer im Ruhestand, schreibt die Dorfchronik',
      fig: 'dorf_gerhard',
      clips: 'm',
      h: 1.76,
      stoop: 0.07,
      greet: [
        'Guten Abend! Setz dich ruhig dazu – zum Zuhören braucht man keine Karten.',
        'Na, wieder da? Die Chronik freut sich über jeden neuen Namen.',
      ],
      // outside the evenings: in the garden, at the door ({gruss}: good morning / hello / good evening by the clock)
      day: [
        '{gruss}! Ich zupfe nur ein bisschen Unkraut – an der Chronik schreibt es sich besser, wenn die Hände vorher etwas getan haben.',
        '{gruss}! Schön, dass man dich auch mal im Dorf sieht. Wie weit ist der Pavillon?',
      ],
      topics: {
        schule: [
          'Die alte Schule',
          '1828 haben die Ratscher dieses Haus gebaut: Fachwerk, Schiefer an den Giebeln, oben der Dachreiter mit der Uhr. Dafür hat das Dorf jeden Taler zusammengelegt.',
          'Lange haben hier alle Kinder des Dorfes in einem Raum gelernt – die Kleinen vorn, die Großen hinten, und der Lehrer wohnte gleich mit im Haus.',
          'Heute gehört das Haus der Feuerwehr. Dass hier freitags wieder Leben drin ist, hätte den alten Schulmeistern gefallen.',
        ],
        linde: [
          'Die Dorflinde',
          'Die Linde am Anger ist 1888 gepflanzt worden – im Dreikaiserjahr. Das merkt man sich leicht.',
          'Unter der Linde wurde früher getanzt, gefeiert und verhandelt. Heute sitzen da die Alten auf der Bank und wissen alles zuerst.',
        ],
        chronik: [
          'Die Dorfchronik',
          'Ich schreibe auf, was im Dorf passiert: wer geheiratet hat, wer ein Dach neu gedeckt hat, wann der erste Frost kam. In hundert Jahren will das jemand wissen.',
          'Du stehst übrigens auch schon drin: „Neue Leute im Garten bei Hubert und Ronald, bauen einen Pavillon.“',
        ],
        uhr: [
          'Die Uhr im Turm',
          'Die Uhr oben im Dachreiter geht nach dem Dorf, nicht nach dem Radio. Manfred stellt sie zweimal im Jahr – und meistens stimmt sie dann auch.',
        ],
      },
    },
    manfred: {
      name: 'Manfred',
      full: 'Manfred Ehrhardt',
      age: 56,
      role: 'Wehrführer der Freiwilligen Feuerwehr',
      fig: 'dorf_manfred',
      clips: 'm',
      h: 1.78,
      stoop: 0.03,
      greet: [
        'Willkommen im Feuerwehrhaus! Die Garderobe ist der Haken neben der Tür.',
        'Grüß dich! Schon gehört? Die Sirene läuft wieder wie neu.',
      ],
      // outside the evenings: in the garden, at the door ({gruss}: good morning / hello / good evening by the clock)
      day: [
        '{gruss}! Nur kurz Luft schnappen – nachher bringe ich noch die Atemschutzgeräte zur Prüfung nach Schleusingen.',
        '{gruss}! Dienstabend ist jeden zweiten Mittwoch im Gerätehaus. Wir können jeden gebrauchen, der mit anpackt.',
      ],
      topics: {
        wehr: [
          'Die Feuerwehr',
          'Die alte Schule ist jetzt unser Vereinshaus. Hier unten trifft sich die Kameradschaft, und oben auf dem First sitzt die Sirene.',
          'Wir sind nicht viele, aber wenn die Sirene geht, lässt hier jeder alles stehen und liegen. So ist das auf dem Dorf.',
        ],
        feuer: [
          'Das Feuer am Acker',
          'Wenn wir draußen ein Feuer machen, steht die Feuerwehr daneben. Ohne Wasserfass und Schaufel brennt bei uns nichts.',
          'Das Holz bringt Wolfgang aus dem Wald, Uwe stellt den Acker, und wer kommt, bringt etwas zu essen mit.',
        ],
        skat: [
          'Skat',
          'Achtzehn, zwanzig, zwo, null … Skat ist kein Glücksspiel. Na gut – ein bisschen.',
          'Gerhard zählt im Kopf mit, welche Karten schon gefallen sind. Gegen den zu spielen ist wie Kopfrechnen in der Schule.',
        ],
        nachbarn: [
          'Hubert und Ronald',
          'Hubert schraubt an seinem Mondeo, seit er ihn hat. Der Wagen läuft – Hubert sagt, wegen ihm, ich sage, trotz ihm.',
          'Ronald war früher öfter hier. Seit er die Ziegen hat, geht er mit den Hühnern ins Bett.',
        ],
      },
    },
    wolfgang: {
      name: 'Wolfgang',
      full: 'Wolfgang Kühn',
      age: 59,
      role: 'Waldarbeiter, kennt jeden Baum an der Klinge',
      fig: 'dorf_wolfgang',
      clips: 'm',
      h: 1.79,
      stoop: 0.05,
      greet: [
        'N’Abend. Schön, dass du dich mal blicken lässt.',
        'Da ist ja der Pavillonbauer. Holz genug für den Winter?',
      ],
      // outside the evenings: in the garden, at the door ({gruss}: good morning / hello / good evening by the clock)
      day: [
        '{gruss}! Heute mal kein Wald – die Kette ist beim Schärfen, und der Rücken freut sich.',
        '{gruss}! Trocken ist es. Das sieht man an den Fichten zuerst, die werfen dann Nadeln.',
      ],
      topics: {
        wald: [
          'Der Wald',
          'Unten an der Klinge stehen Fichten, Lärchen und ein paar Kiefern. Die trockenen Jahre haben den Fichten zugesetzt.',
          'Wo der Käfer drin war, pflanzen wir jetzt Buchen und Eichen nach. Die sehe ich nicht mehr groß – aber die Enkel.',
        ],
        klinge: [
          'Die Klinge',
          'Die Klinge ist ein steiles Tälchen, im Frühjahr läuft da das Wasser runter. Wer dort Wald hat, braucht Geduld und gute Stiefel.',
          'Wenn du an der Klinge fällst: Fallkerb sauber, Bruchleiste stehen lassen, und immer erst nach oben schauen.',
        ],
        wetter: [
          'Das Wetter',
          'Liegt abends Nebel über dem Wald, wird der nächste Tag schön. Hat mein Vater gesagt, und der hat sich selten geirrt.',
          'Fliegen die Schwalben tief, gibt es Regen. Fliegen sie hoch, gibt es auch manchmal Regen. Das Wetter hier macht, was es will.',
        ],
        holz: [
          'Holz für das Feuer',
          'Fürs Feuer nehmen wir nur trockenes Restholz aus dem Wald. Nasses Holz qualmt bloß und ärgert die Nachbarn.',
        ],
      },
    },
    uwe: {
      name: 'Uwe',
      full: 'Uwe Bachmann',
      age: 46,
      role: 'Landwirt, freitags hinter der Theke',
      fig: 'dorf_uwe',
      clips: 'm',
      h: 1.8,
      stoop: 0,
      greet: [
        'Na, was darf’s sein? Fassbrause, Apfelschorle, ein Bier?',
        'Hallo! Die Gläser sind frisch gespült, die Brezeln von heute.',
      ],
      // outside the evenings: in the garden, at the door ({gruss}: good morning / hello / good evening by the clock)
      day: [
        '{gruss}! Ich bin nur kurz vom Hof rüber, die Kühe warten nicht.',
        '{gruss}! Wenn das Wetter hält, mähe ich morgen die Wiese an der Klinge.',
      ],
      topics: {
        trinken: [
          'Etwas zu trinken',
          'Eine Apfelschorle, kommt sofort. Geht aufs Haus – beim ersten Mal zahlt bei uns keiner.',
          'Die Skatrunde trinkt Bier, die Rommé-Runde Kräutertee – mit Schuss, sagen sie. Fragen tu ich nicht.',
        ],
        acker: [
          'Der Acker',
          'Der Acker Richtung Klinge gehört zu meinem Betrieb. Nach der Ernte machen wir dort ab und zu ein Feuer – dann kommt das ganze Dorf.',
        ],
        wetter: [
          'Das Wetter',
          'Im Sommer zu trocken, zur Ernte zu nass. Bauer sein heißt, sich über das Wetter zu beschweren – jedes Jahr aufs Neue.',
        ],
        talsperre: [
          'Die Talsperre',
          'Im Herbst, wenn morgens Nebel über der Talsperre liegt, bin ich mit dem Boot draußen zum Angeln. So still ist es da, dass man die Uhr vom Schulturm hört.',
          'Im Sommer gehen die Kinder an der Talsperre baden. Wir früher auch – mit dem Fahrrad, über den Feldweg.',
        ],
      },
    },
    katrin: {
      name: 'Katrin',
      full: 'Katrin Seifert',
      age: 39,
      role: 'Pflegerin in der Stadt, freitags am Rommé-Tisch',
      fig: 'dorf_katrin',
      clips: 'f',
      h: 1.68,
      stoop: 0,
      greet: [
        'Hallo! Spielst du mit? Ich erklär’s dir, ist ganz einfach.',
        'Da bist du ja wieder! Ingrid hat schon zweimal gewonnen.',
      ],
      // outside the evenings: in the garden, at the door ({gruss}: good morning / hello / good evening by the clock)
      day: [
        '{gruss}! Frühdienst gehabt – jetzt noch schnell die Beete, dann Füße hoch.',
        '{gruss}! Kommst du Freitag zum Rommé? Ich brauche jemanden, der noch schlechter spielt als Ingrid.',
      ],
      topics: {
        romme: [
          'Rommé',
          'Rommé ist einfach: Sätze und Folgen ablegen, und wer zuerst alle Karten los ist, gewinnt. Ingrid gewinnt trotzdem immer.',
        ],
        nachbarn: [
          'Hubert und Ronald',
          'Ihr wohnt neben Hubert und Ronald? Die zwei streiten sich wie ein altes Ehepaar – und helfen sich doch jedes Mal.',
          'Letzten Sommer ist Ronalds Ziege Lotte ausgebüxt und stand plötzlich in Huberts Werkstatt. Hubert behauptet bis heute, sie hätte ihm beim Schrauben geholfen.',
        ],
        dorf: [
          'Das Dorf',
          'Ich arbeite in der Stadt, aber freitags will ich hier sein. Wo sonst erfährt man in zwei Stunden alles, was die Woche über passiert ist?',
        ],
        linde: [
          'Die Dorflinde',
          'Unter der Dorflinde hat mein Mann mir den Antrag gemacht. Die Bank steht zum Glück noch.',
        ],
      },
    },
    ingrid: {
      name: 'Ingrid',
      full: 'Ingrid Hartung',
      age: 58,
      role: 'Ortsteilbürgermeisterin von Ratscher',
      fig: 'dorf_ingrid',
      clips: 'f',
      h: 1.67,
      stoop: 0.02,
      greet: [
        'Guten Abend! Schön, dass du da bist. Komm rein, hier duzen sich alle.',
        'Hallo! Freitags ist bei uns immer ein Stuhl frei.',
      ],
      // outside the evenings: in the garden, at the door ({gruss}: good morning / hello / good evening by the clock)
      day: [
        '{gruss}! Im Rathaus bin ich die Ortsteilbürgermeisterin, im Garten bin ich nur Ingrid.',
        '{gruss}! Die Rosen danken es einem, wenn man sie abends gießt und nicht in der Mittagssonne.',
      ],
      // the same after she has handed over the office (amt/amt.js)
      dayRetired: [
        '{gruss}! Seit ich das Amt abgegeben habe, haben meine Rosen endlich wieder eine Gärtnerin.',
        '{gruss}! Elf Jahre Sitzungen – jetzt gieße ich, wann ich will. Das hat auch etwas.',
      ],
      topics: {
        dorf: [
          'Das Dorf',
          'Ratscher ist klein, aber wir halten zusammen. Wenn einer ein Dach deckt, stehen samstags fünf Leute auf dem Gerüst.',
          'Was im Dorf passiert, erfährt man freitags hier. Was nicht hier erzählt wird, ist auch nicht passiert.',
        ],
        talsperre: [
          'Die Talsperre',
          'Die Talsperre gehört zu uns wie die Linde. Bevor das Wasser kam, war da unten ein Wiesental – die Älteren erzählen noch davon.',
        ],
        schule: [
          'Die alte Schule',
          'Als hier kein Unterricht mehr war, wollte erst keiner das Haus. Die Feuerwehr hat es übernommen und mit vielen Wochenenden wieder hergerichtet.',
        ],
        feuer: [
          'Das Feuer',
          'Jeden zweiten Samstag machen wir Feuer auf Uwes Acker, Richtung Klinge. Komm doch vorbei – ab sieben brennt es.',
        ],
      },
    },
    jens: {
      name: 'Jens',
      full: 'Jens Wagner',
      age: 34,
      role: 'Kfz-Mechaniker in Schleusingen, Gruppenführer bei der Feuerwehr',
      fig: 'dorf_jens',
      clips: 'm',
      h: 1.82,
      stoop: 0,
      greet: ['Na? Läuft alles, auch das Auto?', 'Servus! Wenn’s irgendwo klappert – ich schau’s mir an.'],
      // outside the evenings: in the garden, at the door ({gruss}: good morning / hello / good evening by the clock)
      day: [
        '{gruss}! Läuft Huberts Traktor noch? Wenn nicht – du weißt, wo ich wohne.',
        '{gruss}! Feierabend. Jetzt noch der Rasenmäher von meiner Mutter, der springt seit Ostern nicht an.',
      ],
      topics: {
        mondeo: [
          'Huberts Mondeo',
          'Hubert macht an seinem Mondeo alles selbst: Auto auf die Rampe, Teile besorgen, tauschen. Letztens war es die Zündspule – das Teil hab ich ihm mitgebracht.',
          'So ein Kombi von 2005 hält ewig, wenn man ihn pflegt: Öl rechtzeitig wechseln, Rost früh behandeln, und im Winter Salz abwaschen.',
        ],
        wehr: [
          'Die Feuerwehr',
          'In der Grundausbildung lernt man Knoten, Leitern, Schläuche kuppeln. Einmal im Monat ist Übung – an der Talsperre zum Beispiel, da saugen wir Wasser aus offenem Gewässer an.',
          'Bei einem Einsatz zählt jede Minute. Deshalb hängt bei mir die Jacke immer griffbereit an der Tür.',
        ],
        auto: [
          'Auto auf dem Dorf',
          'Auf dem Dorf geht ohne Auto wenig. Der Bus fährt morgens zur Schule und mittags zurück, am Wochenende kaum.',
        ],
        brett: [
          'Klingenholz',
          'Ihr macht die Bretter aus Eiche, mit dem Stirnholz nach oben? Auf so einem Brett bleiben die Messer länger scharf – die Klinge gleitet zwischen die Fasern.',
        ],
      },
    },
    heike: {
      name: 'Heike',
      full: 'Heike Ritter',
      age: 47,
      role: 'großer Gemüsegarten, Hühner, Eier am Gartentor',
      fig: 'dorf_heike',
      clips: 'f',
      h: 1.7,
      stoop: 0,
      greet: [
        'Hallo! Pass auf die Beete auf, da sind gerade die Bohnen gekommen.',
        'Na, schon mal Eier von meinen Hühnern probiert?',
      ],
      // outside the evenings: in the garden, at the door ({gruss}: good morning / hello / good evening by the clock)
      day: [
        '{gruss}! Brauchst du Eier? Heute waren es zwölf, die Hühner sind fleißig.',
        '{gruss}! Pass auf, wo du hintrittst – da kommen gerade die Bohnen.',
      ],
      topics: {
        garten: [
          'Der Garten',
          'Kartoffeln, Bohnen, Zwiebeln, Kohl – und Tomaten, wenn der Sommer mitspielt. Gegossen wird abends oder ganz früh, dann verdunstet weniger.',
          'Mulchen spart Gießen: Rasenschnitt dünn zwischen die Reihen, dann bleibt der Boden feucht und das Unkraut kleiner.',
        ],
        schnecken: [
          'Schnecken',
          'Gegen Schnecken hilft kein Wundermittel. Bretter auslegen, morgens drunter nachschauen und einsammeln. Wer kann, hält Laufenten.',
        ],
        huehner: [
          'Die Hühner',
          'Acht Hühner, ein Hahn. Im Winter legen sie weniger – die brauchen Licht. Das ist ganz normal.',
          'Am Gartentor steht eine Kasse des Vertrauens: sechs Eier, zwei Euro. Bisher hat noch keiner geschummelt.',
        ],
        ziegen: [
          'Ronalds Ziegen',
          'Ronald bringt mir ab und zu Ziegenmist für die Beete. Gut verrottet ist der Gold wert.',
        ],
      },
    },
  };
  // table talk in the school: [who, line] – shown now and then as a subtitle while one is inside
  const TALK = [
    [
      ['manfred', 'Achtzehn?'],
      ['gerhard', 'Ja.'],
      ['manfred', 'Zwanzig?'],
      ['gerhard', 'Ja.'],
      ['manfred', 'Zwo?'],
      ['gerhard', 'Passe.'],
    ],
    [
      ['wolfgang', 'Grand Hand! Ihr dürft schon mal mitschreiben.'],
      ['gerhard', 'Mit einem Buben? Mutig.'],
    ],
    [
      ['manfred', 'Kontra!'],
      ['wolfgang', 'Re!'],
      ['gerhard', 'Jetzt wird’s teuer, meine Herren.'],
    ],
    [
      ['ingrid', 'Ich lege raus: drei Damen und eine Folge in Herz.'],
      ['katrin', 'Schon wieder? Das gibt’s doch nicht.'],
    ],
    [
      ['ingrid', 'Rommé!'],
      ['katrin', 'Ich hatte noch neunzig Punkte auf der Hand …'],
    ],
    [
      ['uwe', 'Die nächste Runde geht auf die Feuerwehr!'],
      ['manfred', 'Seit wann das denn?'],
    ],
    [['uwe', 'Wer noch was will, ruft – ich hab nur zwei Hände.']],
    [
      ['gerhard', 'Wer gibt?'],
      ['wolfgang', 'Der, der fragt.'],
    ],
    [
      ['katrin', 'Hat jemand Hubert diese Woche gesehen? Der Mondeo stand wieder auf der Rampe.'],
      ['manfred', 'Der steht da öfter als auf der Straße.'],
    ],
    [
      ['wolfgang', 'Morgen gibt’s Nebel über dem Wald. Dann wird’s schön.'],
      ['uwe', 'Das sagst du jede Woche.'],
    ],
  ];
  TALK.push(
    [
      ['gerhard', 'In der Chronik steht, dass beim Pflanzen der Linde das halbe Dorf dabei war.'],
      ['ingrid', 'Und die andere Hälfte hat hinterher erzählt, sie wäre auch dabei gewesen.'],
    ],
    [
      ['uwe', 'Will noch jemand Brezeln? Sonst ess ich sie.'],
      ['wolfgang', 'Her damit.'],
    ],
    [
      ['manfred', 'Nächsten Monat ist Übung an der Talsperre. Wer fährt mit?'],
      ['uwe', 'Wenn’s nicht regnet.'],
    ],
    [
      ['katrin', 'Ingrid, wie machst du das bloß mit den Jokern?'],
      ['ingrid', 'Erfahrung, meine Liebe. Und ein gutes Gedächtnis.'],
    ]
  );
  // the story of the evening: told once one sits down at the table (the task) – and later now and then
  const STORY = [
    ['gerhard', 'Soll ich erzählen, wie das Haus zu seiner Uhr kam?'],
    ['katrin', 'Erzähl, Gerhard – die kenn ich auch noch nicht ganz.'],
    ['gerhard', '1828 haben die Ratscher die Schule gebaut. Für eine Uhr im Turm war kein Geld mehr da.'],
    [
      'gerhard',
      'So erzählt man es sich: Jede Familie hat einen Winter lang Holz geschlagen und verkauft, bis es für das Uhrwerk reichte.',
    ],
    ['gerhard', 'Seitdem heißt es: Die Uhr gehört dem ganzen Dorf.'],
    ['manfred', 'Und deshalb muss die Feuerwehr sie heute aufziehen.'],
    ['ingrid', 'Und deshalb geht sie nach dem Dorf und nicht nach dem Radio.'],
  ];
  const STORIES = [
    [
      [
        'manfred',
        'Der strengste Winter, den ich erlebt habe: Wir haben den Hydranten am Anger mit der Lötlampe aufgetaut.',
      ],
      ['ingrid', 'Und meine Mutter hat euch Glühwein gebracht. Den Rest der Geschichte erzählen wir besser nicht.'],
    ],
    [
      ['wolfgang', 'Einmal stand im Nebel an der Klinge ein Hirsch vor mir, keine zehn Meter weit.'],
      ['wolfgang', 'Wir haben uns angeschaut, bis er sich umgedreht hat – als wollte er sagen: Das ist mein Wald.'],
    ],
    [
      [
        'ingrid',
        'Als die Linde hundert wurde, 1988, haben wir am Anger gefeiert – mit Blasmusik und Kuchen von jedem Hof.',
      ],
      ['gerhard', 'Und ich habe die Rede gehalten. Zwanzig Minuten. Die Linde hat’s ausgehalten.'],
    ],
    [
      ['katrin', 'Letzten Sommer ist Ronalds Ziege Lotte ausgebüxt und stand in Huberts Werkstatt.'],
      ['uwe', 'Und Hubert hat ihr den Schraubenschlüssel erklärt, ich hab’s gesehen.'],
    ],
  ];
  STORIES.push([
    [
      'gerhard',
      'Als Junge habe ich hier auf dem Dachboden eine alte Schiefertafel gefunden. Darauf stand: Wer das liest, ist mit Fegen dran.',
    ],
    ['manfred', 'Und? Hast du gefegt?'],
    ['gerhard', 'Bis heute nicht.'],
  ]);
  // at the fire
  const FIRE = [
    [
      ['uwe', 'Wer hat die Kartoffeln mitgebracht? Ab in die Glut damit.'],
      ['katrin', 'In Alufolie, Uwe. Nicht wie letztes Mal.'],
    ],
    [['manfred', 'Den Funkenflug im Auge behalten, Leute. Der Wind dreht.']],
    [
      ['katrin', 'Schaut mal, die Sterne! In der Stadt sieht man die nie so.'],
      ['gerhard', 'Da oben, das W – die Kassiopeia. Hab ich früher jeder Klasse gezeigt.'],
    ],
    [['gerhard', 'Früher gab es Feuer zu Walpurgis und zur Sonnenwende. Heute brauchen wir keinen Anlass mehr.']],
    [
      ['ingrid', 'Freitag wieder in der Schule?'],
      ['wolfgang', 'Na klar. Wo sonst.'],
    ],
    [['wolfgang', 'Das Holz ist aus der Klinge – trockenes Restholz vom letzten Winter. Riecht ihr das Harz?']],
    [['wolfgang', 'Hört ihr den Kauz drüben an der Klinge? Der ruft jeden Abend um diese Zeit.']],
    [
      ['uwe', 'Nächstes Jahr säe ich hier Dinkel. Dann gibt’s beim Feuer Stockbrot vom eigenen Acker.'],
      ['katrin', 'Das sagst du jedes Jahr, Uwe.'],
    ],
  ];
  // the task: steps with the line in the task card
  const TASK = {
    title: 'Freitagabend in der alten Schule',
    steps: {
      invite: 'Freitags ab 19 Uhr ist Skat- und Rommé-Abend in der alten Schule. Geh hin!',
      greet: 'Begrüße Ingrid, die Ortsteilbürgermeisterin.',
      sit: 'Setz dich an den Rommé-Tisch – ein Stuhl ist frei.',
      story: 'Hör zu, was Gerhard erzählt.',
      play: 'Spiel eine Runde „Höher oder tiefer“ mit Katrin.',
      fire: 'Komm zum Feuer am Acker Richtung Klinge (jeden zweiten Samstag ab 19 Uhr) und sprich mit Wolfgang.',
      done: 'Du gehörst jetzt dazu. Freitags in der Schule, manchmal samstags am Feuer.',
    },
  };
  // errands: who gives it, the offer (topic label, line), the steps (go somewhere / bring something / come back), the thanks.
  // goto: a place of the village (dorf/dorf.js knows where), or a person (Hubert, Ronald); have: a test of the game state
  const ERRANDS = {
    chronik: {
      who: 'gerhard',
      title: 'Für die Chronik',
      offer: [
        'Kann ich helfen?',
        'Für die Chronik will ich festhalten, wie die Mitte des Dorfes heute aussieht. Meine Knie mögen keine Wege mehr. Schau dir die Dorflinde an, den Brunnen und die Uhr an der Schule – und erzähl mir, was du gesehen hast.',
      ],
      steps: [
        {
          goto: 'linde',
          r: 9,
          text: 'Geh zur Dorflinde am Anger.',
          at: 'Die Dorflinde: gepflanzt 1888. Ringsum Bänke, der Stamm schon mächtig.',
        },
        {
          goto: 'brunnen',
          r: 7,
          text: 'Schau dir den Dorfbrunnen an.',
          at: 'Der Brunnen aus Sandstein, ein Stück tiefer gelegt, mit Blumen und einer Bank.',
        },
        {
          goto: 'schule',
          r: 14,
          text: 'Schau zur Uhr im Dachreiter der alten Schule.',
          at: 'Die Uhr im Dachreiter – sie zeigt {uhr}.',
        },
        {
          talk: 'gerhard',
          text: 'Erzähl Gerhard, was du gesehen hast.',
          label: 'Linde, Brunnen, Schuluhr – ich war da',
        },
      ],
      thanks:
        'Sehr gut. Die Linde, der Brunnen, die Uhr – das kommt alles hinein. Und dein Name als Mitarbeiter der Chronik. So entsteht Geschichte: einer schaut hin und schreibt es auf.',
    },
    brett: {
      who: 'ingrid',
      title: 'Ein Brett für die Tombola',
      offer: [
        'Klingenholz',
        'Du machst doch die Stirnholzbretter in der Werkstatt im Garten? Für die Tombola beim Dorffest hätte ich gern eins als Hauptpreis. Bringst du mir eins, wenn es fertig ist – geölt und gebrannt?',
      ],
      steps: [
        { have: 'board', text: 'Mach in der Werkstatt ein Stirnholzbrett fertig und nimm es in die Hand.' },
        {
          talk: 'ingrid',
          text: 'Bring Ingrid das fertige Brett.',
          label: 'Hier ist das Brett für die Tombola',
          give: 'board',
        },
      ],
      thanks:
        'Das ist ja wunderschön! Eiche, das sieht man an den Markstrahlen. Damit gewinnt jemand den Hauptpreis, und alle fragen, wo es herkommt – Klingenholz aus Ratscher.',
    },
    lehrstueck: {
      who: 'wolfgang',
      title: 'Wolfgangs Lehrstück',
      offer: [
        'Bring mir das Fällen bei',
        'Fällen lernt man nur im Wald. An der Klinge sind Bäume markiert. Mach einen Fallkerb, lass die Bruchleiste stehen, fäll ihn, entaste ihn und vermiss die Abschnitte. Dann komm wieder und erzähl.',
      ],
      steps: [
        { have: 'log', text: 'Fäll an der Klinge einen markierten Baum und vermiss die Abschnitte.' },
        { talk: 'wolfgang', text: 'Erzähl Wolfgang vom Fällen.', label: 'Ich habe einen Baum gefällt und vermessen' },
      ],
      thanks:
        'Und die Bruchleiste hat gehalten? Dann hast du es verstanden. Merk dir: Rückweiche frei machen, Warnruf, und nie unter einem hängenden Baum arbeiten.',
    },
    zuendkerzen: {
      who: 'jens',
      title: 'Ein Päckchen für Hubert',
      offer: [
        'Brauchst du Hilfe?',
        'Ich hab Zündkerzen für Huberts Mondeo besorgt, komme aber erst spät heim. Bringst du sie ihm? Er wohnt doch neben euch.',
      ],
      steps: [
        {
          goto: 'hubert',
          r: 3.5,
          text: 'Bring Hubert die Zündkerzen.',
          at: 'Du gibst Hubert das Päckchen. Er nickt: „Vom Jens? Na endlich.“',
        },
        { talk: 'jens', text: 'Sag Jens Bescheid.', label: 'Hubert hat die Zündkerzen' },
      ],
      thanks: 'Danke! Dann läuft der Mondeo bald wieder rund. Wenn bei euch mal was klemmt – du weißt, wo ich wohne.',
    },
    mist: {
      who: 'heike',
      title: 'Ziegenmist für die Beete',
      offer: [
        'Kann ich etwas tun?',
        'Ronald hat mir einen Eimer Ziegenmist versprochen, gut verrottet. Holst du ihn mir? Ronald ist bei seinen Ziegen, südlich von eurem Garten.',
      ],
      steps: [
        {
          goto: 'ronald',
          r: 3.5,
          text: 'Hol bei Ronald den Eimer Ziegenmist.',
          at: 'Ronald drückt dir den Eimer in die Hand: „Für Heike? Gut abgelagert, sag ihr das.“',
        },
        { talk: 'heike', text: 'Bring Heike den Ziegenmist.', label: 'Hier ist der Mist von Ronald' },
      ],
      thanks:
        'Wunderbar! Der kommt im Herbst unter die Beete, dann ruht er über den Winter. Nimm dir sechs Eier mit – geschenkt.',
    },
  };
  const NOTICE =
    'AUSHANG – Freiwillige Feuerwehr Ratscher\n\nSkat- und Rommé-Abend\njeden Freitag ab 19 Uhr in der alten Schule.\nGäste sind herzlich willkommen!\n\nJeden zweiten Samstag Feuer am Acker Richtung Klinge.\n\nWer hilft? Gerhard sucht Mithilfe für die Dorfchronik, Ingrid einen Hauptpreis für die Tombola, Heike verkauft Eier. Man trifft sie morgens und am frühen Abend in ihren Vorgärten – oder freitags hier.';
  return { P, TALK, STORY, STORIES, FIRE, TASK, NOTICE, ERRANDS };
})();
