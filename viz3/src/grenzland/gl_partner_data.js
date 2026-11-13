// ===================== feat/grenzland-partner: talking with the other of the two – the fixed lines, the AI's sheets, the <lage> lines (GLPDATA) =====================
// Falko, 13.11.2026 20:37: „Ich möchte aber die Möglichkeit haben, ständig mit der Partnerin bzw. mit dem Partner zu sprechen. Also wenn ich
// vor Sarah stehe, dann möchte ich mit Sarah sprechen können, möglichst mit KI. Oder relevante Themen rund um die Quests und umgekehrt
// genauso.“ Pure data and pure functions (no page, no scene; unit tests: viz3/test/unit/grenzland_partner.test.mjs) – the talk itself is
// grenzland/gl_partner.js. Every spoken line is a fixed string (recorded by tools/voices/grenzland_linien.mjs → the workflow
// stimmen_grenzland.yml); who speaks is the cast id 'sarah' or 'falko' – the partner answers, the player asks (FRAGE).
//   JETZT[mission][step]  „Was machen wir jetzt?“ – the step's objective in the partner's words, one per step of chapter 1, both voices
//   PAUSE[next]           between two missions: what comes next · FREI after chapter 1 · NICHTS before the story begins
//   BISHER[mission]       „Was wissen wir bisher?“ – one line per mission done (the last two are said) · BISHER.leer before the first
//   GEHT[lage]            „Alles gut bei dir?“ – by the wanted level, after a chase, by the time of day · KOMM / WARTE · HALLO
//   waehle(st) → { jetzt: [[who, text]], bisher, geht(n), komm, warte, hallo(n) } · lage(st) → lines for the AI's <lage> · linien()
export const GLPDATA = (() => {
  // ---- the player's questions (the chips; the player says them in his or her own voice) ----
  const FRAGE = {
    jetzt: 'Was machen wir jetzt?',
    bisher: 'Was wissen wir bisher?',
    geht: 'Alles gut bei dir?',
    komm: 'Komm mit.',
    warte: 'Warte hier.',
  };
  // ---- „Was machen wir jetzt?“: [Sarah's line, Falko's line] per step ----
  const JETZT = {
    gefallen: {
      ankunft: [
        'Auf den Bus warten. Vierzig Minuten, Schleusinger Zeit.',
        'Wir warten auf den Bus nach Ratscher. Das kann dauern.',
      ],
      fremder: ['Da kommt einer auf uns zu. Hören wir uns das an.', 'Der Mann da will was von uns. Lass ihn reden.'],
      heim: [
        'Das Paket muss zur alten Schule nach Ratscher. Bus, Daumen raus oder zu Fuß.',
        'Wir bringen das Paket zur alten Schule. Bus, Anhalter oder die eigenen Füße.',
      ],
      schule: ['Zur Tür der alten Schule. Da soll jemand warten.', 'Rüber zur Schultür. Angeblich wartet da einer.'],
      wechsel: ['Keiner da. Lass mich mal ran – wir tauschen.', 'Hier ist niemand. Übernimm du mal, wir tauschen.'],
      handy: ['Dein Handy summt. Guck mal drauf.', 'Dein Handy brummt. Schau nach.'],
      radio: [
        'Mach mal das Radio an. Mal hören, was hier sonst los ist.',
        'Schalt das Radio ein. Vielleicht erfahren wir was.',
      ],
      nacht: [
        'Genug Abenteuer für einen Freitag. Ab in den Garten.',
        'Für heute reicht es. Lass uns in den Garten gehen.',
      ],
    },
    clique: {
      tanken: [
        'Das Moped ist fast leer. Der Kanister steht daneben – Gemisch rein.',
        'Erst tanken. Der Kanister steht neben dem Moped.',
      ],
      fahrt: ['Rauf aufs Moped und zur Feldscheune.', 'Mit dem Moped zur Feldscheune. Ich halt mich fest.'],
      treff: ['Da ist Jule. Rede mit ihr.', 'Jule wartet an der Scheune. Sprich sie an.'],
      start: [
        'An die Startlinie am Feldweg. Zeig der Jugend, wie man fährt.',
        'An die Startlinie. Mal sehen, ob wir noch schnell sind.',
      ],
      rennen: ['Zum Staudamm, schneller als Jule! Gib Gas!', 'Zum Staudamm, und zwar vor Jule. Nicht bremsen.'],
      damm: [
        'Zeig ihnen die Karte. Die wissen mehr, als sie sagen.',
        'Jetzt die Karte zeigen. Mal sehen, was die Clique weiß.',
      ],
    },
    gerhard: {
      linde: [
        'Gerhard sitzt unter der Linde. Zeig ihm die Karte.',
        'Zu Gerhard an die Linde. Der soll sich die Karte ansehen.',
      ],
      damals: ['Gerhard erzählt. Hör einfach zu.', 'Lass Gerhard erzählen.'],
      kiste: ['Die Kiste an der Hoftür der Schule. Nimm sie.', 'Die Kiste steht an der Hoftür. Nimm sie mit.'],
      weg: [
        'Die Kiste ungesehen zur Feldscheune. Hinten durch die Gärten, geduckt.',
        'Durch die Gärten zur Scheune, geduckt hinter den Zäunen.',
      ],
      stroh: ['Die Kiste unters Stroh in der Scheune.', 'Stroh drüber, dann sieht sie keiner.'],
      warten: ['Bleib bei der Scheune, bis die Luft rein ist.', 'Warten, bis die Luft rein ist.'],
      heute: ['Zurück zu Gerhard unter die Linde.', 'Zurück zur Linde. Gerhard ist noch nicht fertig.'],
    },
    klinge: {
      abend: [
        'Wir warten bis zum Abend und fahren dann zur Unteren Klinge.',
        'Bis zum Abend warten, dann runter zur Unteren Klinge.',
      ],
      ansehen: ['Näher ran. Geduckt und ohne Licht.', 'Wir schleichen uns näher ran. Kein Licht.'],
      ablenken: [
        'Lass mich hier warten. Du machst drüben Krach mit einem Böller, dann tauschen wir.',
        'Ich bleib hier. Du wirfst drüben einen Böller, dann tauschen wir.',
      ],
      fotos: [
        'Drei Fotos vom Umladen. Aus der Deckung, nicht näher als nötig.',
        'Wir brauchen drei Fotos. Aus der Deckung, höchstens vierzig Meter.',
      ],
      flucht: [
        'Die Landstraße ist dicht. Über die Feldwege zurück in den Garten.',
        'Straße gesperrt. Über die Feldwege, und dann heim in den Garten.',
      ],
      heim: ['Die suchen nicht mehr. Ab in den Garten.', 'Die Luft ist rein. Zurück in den Garten.'],
    },
    coup: {
      jule: ['Wir zeigen Jule die Fotos. An der Feldscheune.', 'Mit den Fotos zu Jule an die Scheune.'],
      plan: [
        'Leise oder laut – du entscheidest. Ich sag nur: Leise hat Stil.',
        'Leise oder laut? Ich bin für leise. Meistens.',
      ],
      hin: [
        'Zum Außenlager in der Feldflur. Die Lücke ist hinten im Zaun.',
        'Raus zum Außenlager. Hinten im Zaun ist eine Lücke.',
      ],
      rein: [
        'Durch die Lücke im Zaun, wenn der Wachmann vorn ist.',
        'Rein durch den Zaun, wenn der Wachmann wegschaut.',
      ],
      tuer: ['Die Tür vom Bürocontainer. Leise wird das nicht.', 'Die Containertür aufbrechen. Das wird laut.'],
      karte: ['Da hängt sie. Nimm die Karte von der Wand.', 'Die gerahmte Karte. Runter von der Wand damit.'],
      raus: ['Raus hier! Zur Feldscheune!', 'Weg hier! Die Karte zur Scheune!'],
      flucht: ['Nicht stehen bleiben. Zur Feldscheune!', 'Lauf! Zur Scheune!'],
      ende: ['Jetzt legen wir die zwei Hälften zusammen.', 'Die beiden Hälften zusammenlegen. Endlich.'],
    },
  };
  // between two missions: the next one's teaser in the partner's words
  const PAUSE = {
    gefallen: ['Wir warten auf den Bus. Was sonst.', 'Wir warten auf den Bus. Mehr ist hier gerade nicht.'],
    clique: [
      'Jemand weiß von der Karte. Warten wir ab, wer sich meldet.',
      'Irgendwer weiß von der Karte. Wir warten, bis sich einer meldet.',
    ],
    gerhard: [
      'Wir sollten zu Gerhard. Der sitzt meistens unter der Linde.',
      'Gerhard. Der sitzt meistens unter der Dorflinde.',
    ],
    klinge: [
      'Jule hört sich um, was Krähwinkels Leute nachts treiben. Wir warten auf sie.',
      'Jule meldet sich, wenn sie was über Krähwinkels Leute weiß.',
    ],
    coup: ['Mit den Fotos zu Jule.', 'Wir bringen Jule die Fotos.'],
  };
  const FREI = [
    'Die Karte ist ganz. Jetzt haben wir Zeit – Kegeln, Angeln, oder einfach mal gar nichts.',
    'Die Karte ist ganz. Jetzt erst mal durchatmen – kegeln, angeln, was du willst.',
  ];
  // ---- „Was wissen wir bisher?“ ----
  const BISHER = {
    leer: [
      'Bisher wissen wir gar nichts. Außer, dass der Bus spät kommt.',
      'Noch wissen wir nichts. Nur, dass der Bus dauert.',
    ],
    gefallen: [
      'Ein Fremder gibt uns ein Paket, ich mach es auf, und drin ist eine halbe Grenzkarte von neunundachtzig. Mit Kreuz.',
      'Ein Fremder, ein Paket, und darin eine halbe Grenzkarte von neunundachtzig. Mit einem Kreuz.',
    ],
    clique: [
      'Jule, Timo und Basti trauen uns. Die Karte zeigt den alten Kolonnenweg, und Gerhard war damals dabei.',
      'Die Clique ist auf unserer Seite. Der alte Kolonnenweg, und Gerhard weiß mehr.',
    ],
    gerhard: [
      'Gerhard hat neunundachtzig eine Kiste für Lutz versteckt. Die andere Hälfte der Karte hat jetzt wohl Krähwinkel.',
      'Lutz hatte die andere Hälfte der Karte. Und die hängt jetzt wohl bei Krähwinkel.',
    ],
    klinge: [
      'Wir haben drei Fotos vom Umladen an der Klinge. Und die Polizei hat uns nicht gekriegt.',
      'Drei Fotos von Krähwinkels Leuten. Und keiner hat uns erwischt.',
    ],
    coup: [
      'Die Karte ist ganz. Das Kreuz liegt an einem Bunker am alten Kolonnenweg, kurz vor Bayern.',
      'Die Karte ist komplett. Ein Bunker am Kolonnenweg, kurz vor Bayern.',
    ],
  };
  // ---- „Alles gut bei dir?“ – [Sarah's variants, Falko's variants] ----
  const GEHT = {
    sterne: [
      [
        'Mir geht es gut. Die Polizei sieht das vielleicht anders.',
        'Alles gut, solange da hinten kein Blaulicht auftaucht.',
        'Frag mich das, wenn die Sterne weg sind.',
      ],
      [
        'Mir geht es gut. Die Polizei hätte da allerdings Fragen.',
        'Alles bestens. Wir sollten nur nicht hier rumstehen.',
        'Gut. Aber lass uns erst mal untertauchen.',
      ],
    ],
    jagd: [
      ['Mein Puls ist irgendwo bei Suhl. Aber gut.', 'Das war knapp. Mach das bitte nicht zur Gewohnheit.'],
      ['Ich zittere nicht. Das ist nur die Kälte.', 'Knapp. Aber wir sind ja noch da.'],
    ],
    nacht: [
      [
        'Müde. Und du willst bestimmt noch irgendwohin.',
        'Gut. Nachts ist es hier so still, dass man sich selber denken hört.',
      ],
      ['Müde. Aber für dich bleib ich wach.', 'Gut. Nur dunkel ist es hier. Richtig dunkel.'],
    ],
    morgen: [
      ['Kaffee wäre gut. Sonst alles gut.', 'Gut. Ich bin wach, aber nur offiziell.'],
      ['Ohne Kaffee bin ich nur zur Hälfte da.', 'Gut. Der Morgen hier ist schöner als jeder in Berlin.'],
    ],
    tag: [
      [
        'Mir geht es gut. Ich frag mich nur, wie wir da reingeraten sind.',
        'Alles gut. Ein Paket hat unser Leben verändert. Ganz normal.',
        'Gut. Und dir? Du guckst so ernst.',
      ],
      [
        'Alles gut. Ich hab nur gerade überlegt, wie normal unser Leben mal war.',
        'Gut. Solange du dabei bist.',
        'Bestens. Garten, Moped, Grenzkarte. Wie im Urlaub.',
      ],
    ],
  };
  const KOMM = [
    ['Bin dabei.', 'Na los, ich komm ja schon.'],
    ['Ich komme.', 'Bin direkt hinter dir.'],
  ];
  const WARTE = [
    ['Gut, ich warte hier. Lass dir nicht ewig Zeit.', 'Ich bleib hier. Ruf an, wenn was ist.'],
    ['Ich warte hier.', 'Ich rühr mich nicht. Versprochen.'],
  ];
  const HALLO = [
    ['Was gibt es?', 'Ja?', 'Hm? Was ist?'],
    ['Was ist?', 'Ja?', 'Was gibt es?'],
  ];
  const ORDER = ['gefallen', 'clique', 'gerhard', 'klinge', 'coup'];
  // the partner's index: 0 Sarah, 1 Falko
  const ix = who => (who === 'falko' ? 1 : 0);
  const pick = (L, n) => L[(((n | 0) % L.length) + L.length) % L.length];
  // the fixed lines for a state: st = { partner: 'sarah' | 'falko', mission, step, erledigt: [ids], sterne, jagd, stunde }
  // → [[who, text], …] per topic (the player's question first, then the answer)
  function waehle(st) {
    const p = st.partner === 'falko' ? 'falko' : 'sarah',
      ich = p === 'falko' ? 'sarah' : 'falko',
      i = ix(p),
      done = ORDER.filter(id => (st.erledigt || []).includes(id));
    let jetzt;
    if (st.mission && JETZT[st.mission] && JETZT[st.mission][st.step]) jetzt = JETZT[st.mission][st.step][i];
    else if (done.length === ORDER.length) jetzt = FREI[i];
    else {
      const next = ORDER.find(id => !done.includes(id) && id !== st.mission) || 'gefallen';
      jetzt = (PAUSE[next] || PAUSE.gefallen)[i];
    }
    const bisher = done.length ? done.slice(-2).map(id => [p, BISHER[id][i]]) : [[p, BISHER.leer[i]]];
    const h = Number.isFinite(st.stunde) ? st.stunde : 12;
    const lageG = st.sterne > 0 ? 'sterne' : st.jagd ? 'jagd' : h >= 22 || h < 5 ? 'nacht' : h < 10 ? 'morgen' : 'tag';
    return {
      jetzt: [
        [ich, FRAGE.jetzt],
        [p, jetzt],
      ],
      bisher: [[ich, FRAGE.bisher], ...bisher],
      geht: n => [
        [ich, FRAGE.geht],
        [p, pick(GEHT[lageG][i], n)],
      ],
      gehtLage: lageG,
      komm: n => [
        [ich, FRAGE.komm],
        [p, pick(KOMM[i], n)],
      ],
      warte: n => [
        [ich, FRAGE.warte],
        [p, pick(WARTE[i], n)],
      ],
      hallo: n => [[p, pick(HALLO[i], n)]],
    };
  }
  // ---- the AI: who the partner is (German, second person) ----
  const WELT = `Seit einem Freitagabend im September steckt ihr in einer Geschichte, die größer ist als ein Gartenwochenende: An der Zentralhaltestelle in Schleusingen hat euch ein Fremder ein Paket mitgegeben, „für die alte Schule in Ratscher“. Sarah hat es unterwegs aufgemacht – darin lag die Hälfte einer Grenzkarte von 1989 mit einem Kreuz.
Wer dazugehört: Jule, Timo und Basti, eine Moped-Clique aus der Gegend (Jule hat das Sagen, Timo kennt jeden Feldweg, Basti sagt wenig); Gerhard, der Dorfchronist, Lehrer im Ruhestand, der am 10. November 1989 eine Kiste für seinen Schulfreund Lutz versteckt hat; Krähwinkel, ein Spediteur mit einem Außenlager in der Feldflur, dessen Leute nachts an der Unteren Klinge umladen – er hatte die andere Hälfte der Karte. Die Polizei hat euch inzwischen auch auf dem Zettel, wenn ihr es übertreibt.
Ihr fahrt ein altes Simson-Moped aus dem Garten, Bus oder per Anhalter; ihr habt ein Handy (Nachrichten, die Dorfgruppe, Fotos) und hört Radio.
Krähwinkel, seine Spedition, der Fremde und die Clique sind erfunden. Die echten Nachbarn Hubert und Ronald und echte Firmen haben mit der Sache nichts zu tun – sie sind nie die Bösen und nie ein Ziel, und du sprichst nie so, als wären sie beteiligt.`;
  const SO = `So redest du: wie ein Paar, das sich lange kennt – kurze Sätze, gesprochenes Deutsch, „du“, Kosenamen nur selten. Ton wie in einem GTA-Spiel für Erwachsene: trockener Humor, Frotzeleien, Abenteuerlust, aber ihr haltet zusammen. Nichts Explizites, keine ausgemalte Gewalt.
Im Gespräch steht ihr nebeneinander (oder sitzt zusammen im Fahrzeug). In <lage> steht, wo ihr seid, was gerade ansteht (Mission und Schritt, so wie es im Tagebuch steht), was ihr bisher geschafft habt, ob die Polizei euch sucht (Sterne von 0 bis 5) und was sie weiß, die Uhrzeit, euer Geld und ob du mitkommst oder wartest. Fragt dein Gegenüber, was jetzt zu tun ist, sag das nächste Ziel in deinen Worten – konkret, mit dem Ort und, wenn sie dasteht, der Taste. Erfinde keine Missionen, Orte oder Ereignisse, die weder in <lage> noch hier stehen; was noch nicht passiert ist, weißt du nicht.
Werkzeug spielaufgabe: Bittet dein Gegenüber dich mitzukommen oder zu warten, oder sollst du das nächste Ziel auf der Karte zeigen, dann benutz es mit dem passenden Schlüssel aus <lage> (mitkommen, warten, ziel) – und sag kurz, dass du es tust.`;
  const SHEET = {
    sarah: `Du bist Sarah aus Berlin, Falkos Freundin; ihr habt zusammen einen Garten in Ratscher bei Schleusingen in Thüringen.
${WELT}
Wie du bist: trocken, schlagfertig und neugierig – du machst Dinge lieber auf, als lange zu fragen, und behältst den Überblick, wenn es brenzlig wird. Du ziehst Falko gern auf, aber du hältst zu ihm, immer.
${SO}`,
    falko: `Du bist Falko aus Berlin, Sarahs Freund; ihr habt zusammen einen Garten in Ratscher bei Schleusingen in Thüringen, in dem du einen Pavillon baust.
${WELT}
Wie du bist: ruhig, lakonisch, eher der Planer; nach außen gibst du den Gelassenen, auch wenn dir die Sache mit der Karte nicht ganz geheuer ist. Du lässt dich von Sarah aufziehen und gibst es trocken zurück; ihr haltet zusammen.
${SO}`,
  };
  // what the AI may do for the player (the tool spielaufgabe): key → label for <lage>
  const THEMEN = [
    { k: 'mitkommen', label: 'Mitkommen – du gehst wieder mit' },
    { k: 'warten', label: 'Hier warten – du bleibst, bis man dich holt' },
    { k: 'ziel', label: 'Ziel zeigen – das nächste Ziel auf der Karte markieren' },
  ];
  const WISSEN = { gesicht: 'Gesicht', kleidung: 'Kleidung', fahrzeug: 'Fahrzeug' };
  const DINGE = {
    paket: 'das Paket',
    karte1: 'die halbe Karte',
    karte2: 'die andere Hälfte der Karte',
    karte: 'die Karte',
    fotos: 'die Fotos von der Klinge',
    boeller: 'Böller',
    kanister: 'einen Kanister Gemisch',
    helm: 'den Helm',
  };
  // the situation for the AI's <lage> (pure): st = { spieler, ort, fahrzeug, mission: { id, titel, nr, n } | null, schritt, naechste:
  // { titel, teaser } | null, erledigt: [{ titel, done }], sterne, polizei: 'ruhe' | 'gesucht' | 'verfolgt', wissen: {…}, versteckt,
  // geld, waehrung, folgt, dinge: { id: n } }
  function lage(st) {
    const L = [],
      wer = st.spieler || 'Falko';
    L.push(
      'Wo ihr seid: ' +
        (st.ort || 'unterwegs') +
        (st.fahrzeug ? ` – ihr sitzt zusammen auf dem ${st.fahrzeug}` : ' – ihr steht beieinander')
    );
    if (st.mission && st.mission.titel)
      L.push(
        `Gerade läuft: Kapitel 1, Mission ${st.mission.nr} von ${st.mission.n}, „${st.mission.titel}“ – jetzt: ${st.schritt || '(ein Gespräch läuft)'}`
      );
    else if (st.naechste && st.naechste.titel)
      L.push(
        `Gerade läuft keine Mission. Als Nächstes kommt „${st.naechste.titel}“: ${st.naechste.teaser || ''}`.trim()
      );
    else
      L.push(
        'Kapitel 1 ist geschafft – jetzt ist freie Zeit: Kegeln auf der Bahn, Angeln an der Talsperre, der Verkaufswagen am Anger, die Nebenaufgabe „Karpfen für Suhl“.'
      );
    const done = st.erledigt || [];
    L.push('Bisher geschafft: ' + (done.length ? done.map(d => `„${d.titel}“ – ${d.done}`).join(' ') : 'noch nichts.'));
    const n = st.sterne | 0;
    if (n > 0) {
      const kennt = Object.keys(WISSEN).filter(k => st.wissen && st.wissen[k]);
      L.push(
        `Polizei: ${n} ${n === 1 ? 'Stern' : 'Sterne'} – ${st.polizei === 'verfolgt' ? 'sie sind direkt hinter euch' : 'sie suchen euch'}` +
          (kennt.length
            ? '; sie kennen: ' + kennt.map(k => WISSEN[k]).join(', ')
            : '; sie haben nur eine vage Beschreibung') +
          (st.versteckt ? '; gerade seid ihr in Deckung.' : '.')
      );
    } else L.push('Polizei: keine Fahndung.');
    L.push(`Geld: ${st.geld | 0} ${st.waehrung || '€'}`);
    const dinge = Object.entries(st.dinge || {})
      .filter(([k, v]) => v > 0 && DINGE[k])
      .map(([k, v]) => (v > 1 ? v + ' × ' : '') + DINGE[k]);
    if (dinge.length) L.push(`${wer} hat dabei: ${dinge.join(', ')}`);
    L.push(st.folgt ? `Du gehst mit ${wer} mit.` : `Du wartest hier, bis ${wer} dich holt.`);
    // (what she or he can do – THEMEN – npc/ki_core.js situation() lists under „Spielaufgaben“)
    return L;
  }
  // every fixed spoken line, for the recordings
  function linien() {
    const out = [];
    const two = pair => {
      out.push(['sarah', pair[0]]);
      out.push(['falko', pair[1]]);
    };
    for (const t of Object.values(FRAGE)) {
      out.push(['sarah', t]);
      out.push(['falko', t]);
    }
    for (const m of Object.values(JETZT)) for (const p of Object.values(m)) two(p);
    for (const p of Object.values(PAUSE)) two(p);
    two(FREI);
    for (const p of Object.values(BISHER)) two(p);
    for (const g of [...Object.values(GEHT), KOMM, WARTE, HALLO]) {
      for (const t of g[0]) out.push(['sarah', t]);
      for (const t of g[1]) out.push(['falko', t]);
    }
    return out;
  }
  return { FRAGE, JETZT, PAUSE, FREI, BISHER, GEHT, KOMM, WARTE, HALLO, ORDER, SHEET, THEMEN, waehle, lage, linien };
})();
