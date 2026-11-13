// ===================== feat/zeitreise-medien: the media script of the futures as data (ZKMEDIENDATA) =====================
// What the phone, the radio and the video cards of the Zeitreise show – pure data, no DOM. zk_medien.js plays it.
// Everything shown from the future is fictional and marked „mögliche Zukunft“: the news portal „Hennebergbote“, the radio station
// „Radio Kiefernhain 93,7“, the village group „Nachbarn im Tal“, the sender „Warnsystem (Szenario)“ (checked 13.11.2026: none is a real
// outlet or app; „DorfFunk“, „Freies Wort“, „Ratscher aktuell“ are taken – not used). Only the invented villagers speak (Gerhard, Manfred,
// Wolfgang, Uwe, Katrin, Ingrid, Jens, Heike). Numbers are examples of a possible future, no forecast.
//
// SCRIPT entries are found by tag from a chronicle event (ZKCHRONIK.events(w) → { id, title, kind, … }): the first entry whose `match`
// fits `id + ' ' + title` (order matters, most specific first), or whose `ids` contains ev.id. Each entry has the steps for `all`
// (both worlds, used when a world has no version of its own) and/or per world (`allein`, `gewappnet`, later `rueckenwind`, `glueck`).
// Steps: { t:'push'|'article'|'chat'|'call'|'alert'|'nonet'|'radio', … } – see zk_medien.js. Photos: { ph:'waldrand' } = a real still of the
// 3D world at that place (ZKREGIE.snapshot). Lines with `v` are spoken (voice note / call); `s` = seconds a voice note lasts (waveform).
export const ZKMEDIENDATA = (() => {
  const NAMES = {
    portal: 'Hennebergbote',
    radio: 'Radio Kiefernhain',
    freq: '93,7',
    group: 'Nachbarn im Tal',
    warn: 'Warnsystem (Szenario)',
    mark: 'mögliche Zukunft',
  };
  // the villagers on the phone: initials colour + role (for the call screen)
  const WHO = {
    gerhard: { name: 'Gerhard', role: 'Chronist', c: '#7a6a4f' },
    manfred: { name: 'Manfred', role: 'Feuerwehr', c: '#b5432f' },
    wolfgang: { name: 'Wolfgang', role: 'Wald', c: '#4f7a4a' },
    uwe: { name: 'Uwe', role: 'Landwirt', c: '#8a6d2c' },
    katrin: { name: 'Katrin', role: 'Pflege', c: '#3d7f8a' },
    ingrid: { name: 'Ingrid', role: 'Ortsteilrat', c: '#7d4f86' },
    jens: { name: 'Jens', role: 'Feuerwehr-Funk', c: '#4a6a9a' },
    heike: { name: 'Heike', role: 'Nachbarin', c: '#a14f73' },
  };
  const SCRIPT = [
    // ---------------------------------------------------------------- blackout night (before the others: „Strom“ may be in other titles)
    {
      tag: 'blackout',
      ids: ['blackout'],
      all: [
        {
          t: 'alert',
          title: 'Großflächiger Stromausfall',
          text: 'In weiten Teilen der Region ist der Strom ausgefallen. Dauer unbekannt. Handy sparen, Kühlschränke geschlossen halten.',
          lvl: 'strom',
        },
      ],
      allein: [
        {
          t: 'chat',
          msgs: [
            { who: 'uwe', text: 'Strom weg. Bei euch auch?' },
            { who: 'jens', text: 'Hat jemand noch Strom? Bei mir ist alles dunkel.' },
            { who: 'heike', text: 'Nur ein paar Kerzen. Wer hat Batterien?' },
            { who: 'jens', v: 'Meine Batterie im Keller hält die Kühltruhe. Für mehr reicht es nicht.', s: 6 },
          ],
        },
        { t: 'nonet', hours: 3 },
        {
          t: 'radio',
          battery: true,
          lines: [
            'Batterieradio. Der Landkreis meldet einen großflächigen Stromausfall. Die Ursache ist noch unklar.',
            'Einsatzkräfte sind unterwegs, aber nicht überall zugleich. Bleiben Sie, wo Sie sind, und sparen Sie Ihre Batterien.',
          ],
        },
      ],
      gewappnet: [
        {
          t: 'chat',
          msgs: [
            { who: 'ingrid', text: 'Alte Schule hat Strom und Wärme – kommt rüber!' },
            { who: 'katrin', text: 'Ich bringe Frau Lehmann mit. Rollstuhl geht?' },
            { who: 'manfred', v: 'Rampe ist frei, Licht brennt. Der Generator läuft, Tee und Decken sind da.', s: 6 },
          ],
        },
        { t: 'nonet', hours: 3 },
        {
          t: 'radio',
          battery: true,
          lines: [
            'Batterieradio. Der Landkreis meldet einen großflächigen Stromausfall. Die Ursache ist noch unklar.',
            'Aus den Orten: Die Notfalltreffpunkte sind besetzt, in Ratscha die Alte Schule. Dort gibt es Licht, Wärme und Informationen.',
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- heavy-rain night
    {
      tag: 'regen',
      ids: ['starkregen'],
      all: [
        {
          t: 'alert',
          title: 'Unwetterwarnung Starkregen',
          text: 'Ratscha-Tal: 80 Liter je Quadratmeter in wenigen Stunden möglich. Keller räumen, Bachnähe meiden.',
          lvl: 'regen',
        },
      ],
      allein: [
        {
          t: 'chat',
          msgs: [
            { who: 'uwe', text: 'Wasser steht schon im Hof!' },
            { who: 'heike', text: 'Die Straße ist ein Bach. Wer hat Sandsäcke?', ph: 'strasse', cap: 'Straße, eben' },
            { who: 'jens', text: 'Keine da. Ich schaufele Sand mit dem Eimer.' },
          ],
          live: true,
        },
        {
          t: 'call',
          who: 'manfred',
          place: 'bruecke',
          lines: [
            {
              v: 'Manfred hier, Feuerwehr. Die Straße am Bach ist dicht, wir kommen nicht überall hin. Bleibt oben und passt auf euch auf.',
            },
          ],
        },
      ],
      gewappnet: [
        {
          t: 'chat',
          msgs: [
            {
              who: 'manfred',
              text: 'Sandsäcke liegen an der Brücke. Rückhalt läuft.',
              ph: 'bruecke',
              cap: 'Brücke, 23:10',
            },
            { who: 'ingrid', text: 'Kellerliste ist durch: sieben Häuser warten auf uns.' },
            { who: 'uwe', text: 'Hof ist trocken. Der Graben hält.' },
          ],
          live: true,
        },
        {
          t: 'call',
          who: 'manfred',
          place: 'bruecke',
          lines: [
            {
              v: 'Manfred hier. Die Sandsäcke sitzen, der Bach geht bei uns in die Wiese. Bleibt ruhig, wir melden uns.',
            },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- the morning after the heavy-rain night
    {
      tag: 'regen-morgen',
      ids: ['starkregen-morgen'],
      allein: [
        {
          t: 'push',
          head: 'Nach der Nacht: Schlamm in den Straßen',
          teaser: 'Keller voll, Sperrmüll vor den Türen. Viele Familien räumen allein auf.',
          open: true,
          kicker: 'Region',
          lead: 'Auf dem kahlen Hang riss das Wasser Erde mit. Wer keine Elementarversicherung hat, bleibt auf den Kosten sitzen.',
          ph: 'strasse',
        },
      ],
      gewappnet: [
        {
          t: 'push',
          head: 'Ratscha kommt glimpflich davon',
          teaser: 'Mulden, Schwellen und Sandsäcke hielten das Wasser draußen. Nachbarn helfen beim Aufräumen.',
          open: true,
          kicker: 'Region',
          lead: 'Ein Keller lief voll, sonst blieb das Dorf trocken. Der Rückhalt am Hang hat sich bezahlt gemacht.',
          ph: 'strasse',
        },
      ],
    },
    // ---------------------------------------------------------------- the river flood
    {
      tag: 'hochwasser',
      ids: ['hochwasser'],
      all: [
        {
          t: 'alert',
          title: 'Hochwasserwarnung',
          text: 'Nach Tauwetter und Dauerregen steigt die Schleuse. Wasserstände wie bei einem Hundertjährlichen möglich.',
          lvl: 'regen',
        },
      ],
      allein: [
        {
          t: 'chat',
          msgs: [
            { who: 'jens', text: 'Der Öltank in der Zwölf ist aufgeschwommen!', ph: 'bruecke', cap: 'Brücke, 9:05' },
            { who: 'uwe', text: 'So hoch hab ich die Schleuse noch nie gesehen.' },
          ],
          live: true,
        },
      ],
      gewappnet: [
        {
          t: 'chat',
          msgs: [
            { who: 'jens', text: 'Die Wände stehen seit gestern Abend.', ph: 'bruecke', cap: 'Brücke, 9:05' },
            { who: 'ingrid', text: 'Gut, dass kaum noch Öltanks in den Kellern stehen.' },
          ],
          live: true,
        },
      ],
    },
    // ---------------------------------------------------------------- the wind turbine question on the beetle clearing
    {
      tag: 'windrad',
      ids: ['energie-wind', 'energie-wind-dreht', 'energie-wind-investor'],
      allein: [
        {
          t: 'push',
          head: 'Windrad auf der Kahlfläche: Streit im Ort',
          teaser: 'Ein Betreiber von außerhalb will bauen. Im Dorf redet jeder für sich.',
          open: true,
          kicker: 'Ratscha',
          lead: 'Der Betreiber sitzt weit weg und bietet eine Pacht. Ob das Dorf etwas vom Strom hat, ist offen.',
          ph: 'kahlflaeche',
        },
        {
          t: 'chat',
          msgs: [
            { who: 'wolfgang', text: 'Die Fläche liegt seit dem Käfer leer. Besser ein Windrad als Brennnesseln.' },
            { who: 'gerhard', text: 'Und wer verdient? Nicht wir.' },
          ],
        },
      ],
      gewappnet: [
        {
          t: 'push',
          head: 'Dorf stimmt über Windrad ab',
          teaser: 'Die Energiegenossenschaft will auf der Käferfläche bauen. Alle im Ort dürfen mitreden.',
          open: true,
          kicker: 'Ratscha',
          lead: 'Die Genossenschaft rechnet mit Strom und Wärme für das ganze Dorf. Wer beteiligt ist, bekommt den Gewinn.',
          ph: 'kahlflaeche',
        },
        {
          t: 'chat',
          msgs: [
            { who: 'ingrid', text: 'Ortsteilrat sagt ja. Abstimmung am Samstag.' },
            { who: 'wolfgang', text: 'Die Fläche ist eh kahl. Ich bin dafür.' },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- the heating house with wood chips from beetle wood (or the oil bill)
    {
      tag: 'heizhaus',
      ids: ['energie-heizhaus', 'energie-graben'],
      allein: [
        {
          t: 'push',
          head: 'Heizöl wieder teurer',
          teaser: 'Wer ohne Nahwärme heizt, zahlt drauf. Im Dorf stehen die Tankwagen Schlange.',
          open: true,
          kicker: 'Wirtschaft',
          lead: 'Ein Tankwagen pro Haus, jeder zum eigenen Preis. Ein Wärmenetz gibt es hier nicht.',
          ph: 'strasse',
        },
        {
          t: 'chat',
          msgs: [
            { who: 'uwe', text: 'Die Ölrechnung ist da. Das wird ein teurer Winter.' },
            { who: 'katrin', text: 'Und das Käferholz verfault im Wald …' },
          ],
        },
      ],
      gewappnet: [
        {
          t: 'push',
          head: 'Heizhaus liefert die erste Wärme',
          teaser: 'Hackschnitzel vom Käferholz heizen jetzt Schule, Feuerwehr und 30 Häuser.',
          open: true,
          kicker: 'Ratscha',
          lead: 'Das Holz kommt aus dem eigenen Wald, das Geld bleibt im Dorf. Die Leitung liegt entlang der Straße.',
          ph: 'heizhaus',
        },
        {
          t: 'chat',
          msgs: [
            { who: 'ingrid', text: 'Heizhaus läuft! Die Schule ist warm.' },
            { who: 'wolfgang', text: 'Das Käferholz wird endlich zu etwas.' },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- the beetle summer
    {
      tag: 'kaefer',
      ids: ['wald-kaefer'],
      all: [
        {
          t: 'push',
          head: 'Käfersommer: Fichtenhänge werden rot',
          teaser: 'Hitze und Trockenheit setzen dem Wald zu. Förster rechnen auf den Südhängen mit hohen Ausfällen.',
          open: true,
          kicker: 'Region',
          lead: 'Rund um Ratscha sterben die Fichten zu Hunderten. Waldbesitzer sollen Befall sofort melden.',
          ph: 'hang',
        },
        {
          t: 'chat',
          msgs: [
            {
              who: 'wolfgang',
              text: 'Seit gestern ist der ganze Südhang rot. Käfer.',
              ph: 'waldrand',
              cap: 'Waldrand, heute früh',
            },
            { who: 'katrin', text: 'Sieht aus wie Herbst, mitten im Sommer.' },
            { who: 'gerhard', text: 'So etwas habe ich in 60 Jahren nicht erlebt.' },
          ],
          live: true,
        },
      ],
    },
    // ---------------------------------------------------------------- logging
    {
      tag: 'holz',
      ids: ['wald-ernte'],
      all: [
        {
          t: 'chat',
          msgs: [
            {
              who: 'wolfgang',
              text: 'Der Harvester ist da. Das Käferholz muss raus, bevor es blau wird.',
              ph: 'kahlflaeche',
              cap: 'Einschlag am Hang',
            },
            { who: 'manfred', text: 'Pass auf die Straße auf, die Holztransporter kommen.' },
          ],
        },
      ],
    },
  ];

  // radio between the chapters: the newsreader (spoken by the browser's voice or a recording), „all“ = in both worlds; `to` = the chapter
  // that begins, `from` = the one that ended. The year is said from the regie's year. {y} is replaced.
  const RADIO = {
    jingle: 'Radio Kiefernhain, 93,7 – Ihr Sender zwischen Wald und Werra.',
    start: {
      all: ['Die Nachrichten. Trockenheit im Forst: Die Waldbrandgefahr bleibt hoch.'],
      wetter: 'Das Wetter: heiß und trocken, später vereinzelt Gewitter.',
    },
    wasser: {
      all: ['Die Nachrichten aus der Region. Der Borkenkäfer hat die Fichtenhänge des Landkreises weitgehend erfasst.'],
      allein: ['Viele Waldbesitzer arbeiten allein, die Holzpreise sind im Keller.'],
      gewappnet: ['Mehrere Dörfer verwerten das Käferholz gemeinsam in einem Heizhaus.'],
      wetter: 'Das Wetter: wechselhaft, am Abend kräftige Schauer, örtlich Starkregen.',
    },
    energie: {
      all: ['Die Nachrichten aus der Region. Nach den Unwettern räumen viele Orte noch auf.'],
      allein: ['Wer nicht vorgesorgt hatte, steht vor hohen Schäden und leeren Kassen.'],
      gewappnet: ['Orte mit Rückhaltebecken und Notfallplan kamen deutlich glimpflicher davon.'],
      wetter: 'Das Wetter: kalt, klar, in der Nacht Frost.',
    },
    ende: {
      all: ['Die Nachrichten. Der Landkreis zieht Bilanz: Die Orte, die gemeinsam handeln, stehen besser da.'],
      wetter: 'Das Wetter: unbeständig, in den Hochlagen Schnee.',
    },
  };

  // real videos of today – verified 13.11.2026 with YouTube's oEmbed (exists, embeddable, the channel's name) and the channel listing;
  // titles and channels as YouTube gives them. Dates are the years from the listing (≈). Embedded only from youtube-nocookie.com after a click.
  const VIDEOS = {
    wald: [
      {
        id: '2EIkwLfQxi4',
        title: 'Was tun, wenn die Fichten sterben? – Der Streit um den Waldwandel',
        src: 'MDR Investigativ (Mitteldeutscher Rundfunk)',
        year: 2022,
        min: 30,
        why: 'Mitteldeutsche Doku über das Fichtensterben und die Frage, was nachwächst.',
      },
      {
        id: 'v36PDH-55wk',
        title: 'Ist es ein aussichtsloser Kampf? Maßnahmen gegen den Borkenkäfer',
        src: 'Unser Land (BR Fernsehen)',
        year: 2023,
        min: 6,
        why: 'Wie Förster und Waldbesitzer den Käfer bekämpfen – kurz und anschaulich.',
      },
    ],
    wasser: [
      {
        id: '_nQmyovhBIM',
        title: 'Die Sturzflut ist da! Was tun?',
        src: 'Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK)',
        year: 2025,
        min: 2.5,
        why: 'Was Menschen bei einer Sturzflut sofort tun können.',
      },
      {
        id: 'k15IkViFXy4',
        title: 'Für alle Fälle kurz erklärt: Starkregen',
        src: 'Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK)',
        year: 2023,
        min: 3,
        why: 'Vorsorge vor Starkregen: Gebäude, Keller, Verhalten.',
      },
    ],
    energie: [
      {
        id: 'Zu1kRxtAJP8',
        title: 'Schlöben: Strom aus Kuhmist | tagesthemen mittendrin',
        src: 'tagesschau (ARD)',
        year: 2021,
        min: 4,
        why: 'Ein Thüringer Bioenergiedorf: das Dorf erzeugt Wärme und Strom selbst.',
      },
      {
        id: 'ANh051lCmKg',
        title: 'Feldheim: Weltbekannt für seine Energiewende | tagesthemen mittendrin',
        src: 'tagesschau (ARD)',
        year: 2025,
        min: 4,
        why: 'Das Dorf, das sich mit Wind, Sonne und Biogas selbst versorgt – „das passiert heute schon“.',
      },
    ],
    blackout: [
      {
        id: 'XE0qguc1sU0',
        title: 'Mobile SOS-Punkte: Neues Katastrophenschutz-Konzept ohne Strom | Abendschau',
        src: 'BR24 (Bayerischer Rundfunk)',
        year: 2025,
        min: 4.5,
        why: 'Notfallpunkte, die auch ohne Strom arbeiten – wie die Alte Schule in „Gewappnet“.',
      },
      {
        id: 'z3p2gCPBCnE',
        title: 'Für alle Fälle kurz erklärt: Was tun bei Stromausfall?',
        src: 'Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK)',
        year: 2022,
        min: 3,
        why: 'Die wichtigsten Schritte für zu Hause.',
      },
    ],
  };
  // which video groups a chapter's end card offers
  const CARD_VIDEOS = { wald: ['wald'], wasser: ['wasser'], energie: ['energie'] };

  // every spoken line for the recording pipeline (tools/voices/linien.mjs): voice notes, calls and the newsreader (person 'zk_sprecherin')
  const WORLDKEYS = ['allein', 'gewappnet', 'rueckenwind', 'glueck'];
  function lines() {
    const out = [];
    let n = 0;
    const add = (who, text, tag) => out.push({ id: 'zkm-' + tag + '-' + ++n, who, text });
    for (const e of SCRIPT)
      for (const k of ['all', ...WORLDKEYS])
        for (const s of e[k] || []) {
          for (const m of s.msgs || []) if (m.v) add(m.who, m.v, e.tag);
          for (const l of s.lines || []) {
            if (s.t === 'call') add(s.who, l.v, e.tag);
            else add('zk_sprecherin', l, e.tag);
          }
        }
    for (const [k, r] of Object.entries(RADIO))
      if (r && typeof r === 'object') {
        for (const kk of ['all', ...WORLDKEYS]) for (const t of r[kk] || []) add('zk_sprecherin', t, 'radio-' + k);
        if (r.wetter) add('zk_sprecherin', r.wetter, 'radio-' + k);
      }
    return out;
  }
  return { NAMES, WHO, SCRIPT, RADIO, VIDEOS, CARD_VIDEOS, lines };
})();
