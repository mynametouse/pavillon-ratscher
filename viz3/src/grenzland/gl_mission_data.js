// ===================== feat/grenzland-mission: chapter 1 of „Grenzland“ – the talks, the texts, the yard's plan (GLMDATA) and the rules (GLMLOGIK) =====================
// Pure data and pure functions, no scene (unit tests: viz3/test/unit/grenzland_mission.test.mjs).
// GLMDATA: what is said and shown in the five missions of chapter 1 – „Ein Gefallen“, „Die Clique“, „Gerhards Geschichte“ (1989),
//   „Nachts an der Klinge“, „Der Coup“ –, a third guard for the cast, and the plan of the haulier's invented yard in the fields
//   (GLMDATA.lager(pos, az, side): fence, gate, containers, office, lamp, camera, the gap at the back, the guards' rounds – in site metres).
//   Everybody in it is invented (the stranger, the clique, the haulier Krähwinkel and his men); Gerhard is the village's invented chronicler.
// GLMLOGIK: the missions' rules without a world –
//   runner(M, G, io)   the step machine: missions in order, one runs, steps advance, a failure goes back to the step's checkpoint, a reload
//                      goes on there too; state in G.m[id] = { st, i, n } and G.cur (grenzland/gl_state.js saves them)
//   gummi(gap)         the fair rubber band of the race: how fast a rival may go, by how far he is ahead (m)
//   platz(s, others)   the player's place in the race
//   nacht(t) / bis(t, h, m)   is it night at game minute t; minutes until the next h:m
//   wachsam(W, dt, o)  a guard's attention: seen for a while → alarm, lost for a while → gives up
//   dauer(text)        how long a spoken line stays (ms)
//   bilanz(stats)      the rows of the chapter's closing screen
import { GLDATA } from './gl_data.js';
// a third man for the night at the Klinge (the cast of the core has two guards)
if (!GLDATA.CAST.wache3)
  GLDATA.CAST.wache3 = {
    name: 'Fahrer',
    fig: 'vk_m11',
    clips: 'm',
    h: 1.77,
    kleid: 'wache',
    hut: 'strick',
    voice: { g: 'm', age: 47 },
  };
export const GLMDATA = (() => {
  // ---- the missions: titles for the journal ----
  const M = {
    gefallen: {
      title: 'Ein Gefallen',
      who: 'Ein Fremder in Schleusingen',
      teaser: 'Freitagabend an der Zentralhaltestelle in Schleusingen.',
      done: 'Das Paket ist nie angekommen: Sarah hat es geöffnet. Darin lag die Hälfte einer Grenzkarte von 1989 – mit einem Kreuz.',
    },
    clique: {
      title: 'Die Clique',
      who: 'Jule',
      teaser: 'Jemand weiß von der Karte. Abwarten, wer sich meldet.',
      done: 'Jule, Timo und Basti trauen euch. Die Karte zeigt den alten Kolonnenweg – Gerhard war damals dabei.',
    },
    gerhard: {
      title: 'Gerhards Geschichte',
      who: 'Gerhard, der Dorfchronist',
      teaser: 'Gerhard sitzt meistens unter der Dorflinde.',
      done: 'Am 10. November 1989 hat Gerhard eine Kiste für Lutz versteckt. Die zweite Hälfte der Karte hatte Lutz – jetzt wohl Krähwinkel.',
    },
    klinge: {
      title: 'Nachts an der Klinge',
      who: 'Jule',
      teaser: 'Jule hört sich um, was Krähwinkels Leute nachts im Wald treiben.',
      done: 'Drei Fotos vom Umladen an der Unteren Klinge – und der Polizei über die Feldwege entwischt.',
    },
    coup: {
      title: 'Der Coup',
      who: 'Die Clique',
      teaser: 'Mit den Fotos zu Jule.',
      done: 'Die Karte ist ganz. Das Kreuz liegt an einem Bunker am alten Kolonnenweg, kurz vor Bayern.',
    },
  };
  const ORDER = ['gefallen', 'clique', 'gerhard', 'klinge', 'coup'];
  // ---- the steps' texts (the task card and the journal show them) ----
  const S = {
    gefallen: {
      ankunft: 'Schleusingen, Zentralhaltestelle. Der Bus nach Ratscher lässt sich Zeit.',
      fremder: 'Da kommt jemand auf euch zu.',
      heim: 'Bringt das Paket nach Ratscher, zur alten Schule: mit dem Bus (Fahrplan am Haltestellenschild), per Anhalter oder zu Fuß. Wenn nichts fährt: „Mitfahrgelegenheit“ im Grenzland-Feld.',
      schule: 'Zur Tür der alten Schule. Dort soll jemand warten.',
      wechsel: n => 'Niemand da. Wechsle zu ' + n + ' (Tab, am Handy ⇄).',
      handy: 'Das Handy summt. Sieh nach (T).',
      radio: 'Schalte das Radio ein (R) – mal hören, was die Gegend sonst bewegt.',
      nacht: 'Genug für heute. Geht in den Garten.',
    },
    clique: {
      tanken: 'Das Moped im Garten ist fast trocken: Fülle Gemisch aus dem Kanister daneben nach (E halten).',
      fahrt: 'Fahr mit dem Moped zur Feldscheune (E am Moped: aufsteigen).',
      treff: 'Rede mit Jule an der Feldscheune.',
      start: 'Aufs Moped und an die Startlinie am Feldweg.',
      rennen: 'Rennen zur Staumauer – sei vor Jule da.',
      damm: 'An der Staumauer: Zeigt der Clique die Karte.',
    },
    gerhard: {
      linde: 'Gerhard sitzt auf der Bank unter der Dorflinde. Zeig ihm die Karte.',
      damals: 'Gerhard erzählt.',
      kiste: 'Nimm die Kiste an der Hoftür der Schule (E halten).',
      weg: 'Bring die Kiste ungesehen zur Feldscheune: hinten durch die Gärten, geduckt (C) hinter den Zäunen. Mit der Kiste rennt keiner.',
      stroh: 'Versteck die Kiste in der Feldscheune unter dem Stroh (E halten).',
      warten: 'Bleib bei der Scheune, bis die Luft rein ist.',
      heute: 'Zurück unter der Linde.',
    },
    klinge: {
      abend: 'Warte bis zum Abend („Bis zum Abend warten“ im Grenzland-Feld) und fahr zur Unteren Klinge.',
      ansehen: 'Schleich dich näher heran – geduckt (C), ohne Licht.',
      ablenken: n =>
        'Trennt euch: Sag ' +
        n +
        ' „Warte hier“, geh auf die andere Seite und wirf einen Böller. Dann wechsle (Tab) und fotografiere.',
      fotos: n => 'Fotografiere das Umladen aus der Deckung, höchstens 40 m entfernt (E: Foto). ' + n + ' von 3.',
      flucht:
        'Drei Sterne: Die Landstraße ist gesperrt. Zurück in den Garten – über die Feldwege, ohne erkannt zu werden.',
      heim: 'Die Suche ist vorbei. Zurück in den Garten.',
    },
    coup: {
      jule: 'Zeig Jule die Fotos – an der Feldscheune.',
      plan: 'Der Plan: leise oder laut?',
      hinLeise:
        'Warte bis zur Nacht („Bis zur Nacht warten“) und fahr zum Außenlager in der Feldflur. Die Lücke ist hinten im Zaun.',
      hinLaut:
        'Fahr zum Außenlager in der Feldflur und geh hinten an den Zaun. Die Clique wartet vorn am Tor auf dein Zeichen.',
      reinLeise: 'Durch die Lücke im Zaun, wenn der Wachmann vorn ist. Geduckt (C) sieht er dich später.',
      reinLaut: 'Gib Jule das Zeichen (E) – und dann durch die Lücke im Zaun.',
      tuer: 'Brich die Tür des Bürocontainers auf (E halten). Leise wird das nicht.',
      karte: 'Nimm die gerahmte Karte von der Wand.',
      flucht: 'Raus hier! Bring die Karte zur Feldscheune.',
      ende: 'Legt die beiden Hälften zusammen.',
    },
  };
  // ---- the talks: [who (cast id; '' tells), line] ----
  const R = {
    ankunft: [
      ['sarah', 'Vierzig Minuten bis zum Bus. In Berlin wäre das ein Skandal.'],
      ['falko', 'Hier ist das ein Fahrplan.'],
      ['sarah', 'Und der Mann da drüben? Der guckt, als hätte er uns bestellt.'],
    ],
    fremder: [
      ['fremder', 'Ihr fahrt nach Ratscher. Die zwei aus Berlin, mit dem Garten. Spricht sich rum.'],
      ['falko', 'Kennen wir uns?'],
      ['fremder', 'Nein. Das ist ja das Schöne. Das hier muss nach Ratscher, zur alten Schule. Heute noch.'],
      ['sarah', 'Und warum bringen Sie es nicht selbst hin?'],
      ['fremder', 'Weil man mich dort kennt. Fünfzig Euro. Nicht aufmachen, nicht schütteln, nicht fragen.'],
      ['falko', 'Das waren jetzt drei Dinge, die ich bis eben gar nicht vorhatte.'],
      ['fremder', 'An der Schule wartet jemand. Sagt einfach, es kommt von einem Freund.'],
    ],
    fremderWeg: [
      ['sarah', 'Der hat uns fünfzig Euro für eine Busfahrt gegeben, die wir sowieso machen.'],
      ['falko', 'Deshalb heißt es Gefallen.'],
    ],
    bus: [['sarah', 'Wenn einer fragt: Im Paket ist Blumenerde.']],
    anhalter: [['falko', 'Per Anhalter mit dem Paket eines Fremden. Meine Mutter wäre stolz.']],
    schule: [
      ['falko', 'Alte Schule. Licht aus, Tür zu, keiner da.'],
      ['sarah', 'Vielleicht ist „heute noch“ hier ein dehnbarer Begriff.'],
      ['falko', 'Und jetzt? Stellen wir es vor die Tür?'],
      ['sarah', 'Ein Paket von einem Fremden, abends, vor eine Schule. Falko.'],
      ['falko', 'War ja nur eine Frage.'],
    ],
    karte: [
      ['sarah', 'Ich sag es gleich: Ich hab es unterwegs aufgemacht.'],
      ['falko', 'Nicht aufmachen, nicht schütteln, nicht fragen.'],
      ['sarah', 'Geschüttelt hab ich nicht. Guck: eine Karte. Eine halbe – sauber an der Faltkante durchgerissen.'],
      ['falko', '„Grenzgebiet. Betreten verboten.“ Die ist von neunundachtzig. Und da ist ein Kreuz.'],
      ['sarah', 'Ein Kreuz auf einer halben Karte. Entweder ein Schatz oder eine Klärgrube.'],
    ],
    sms: [
      ['falko', '„Wir vergessen, wie ihr ausseht.“ Großzügig.'],
      ['sarah', 'Und die Dorfgruppe weiß es auch schon. Wir sind seit zehn Minuten hier.'],
    ],
    radio: [['sarah', 'Lass an. Wenn wir schon Ärger haben, dann mit Musik.']],
    clique: [
      [
        'jule',
        'Ihr seid die mit der Karte. Ich bin Jule. Das sind Timo und Basti. Basti sagt nicht viel – das ist sein bester Zug.',
      ],
      ['basti', 'Stimmt.'],
      ['falko', 'Woher wisst ihr von der Karte?'],
      [
        'jule',
        'Der Mann an der Haltestelle sollte sie uns bringen. Er hat kalte Füße gekriegt und sie den Erstbesten in die Hand gedrückt.',
      ],
      ['sarah', 'Den Erstbesten. Danke.'],
      ['timo', 'Krähwinkel sucht die auch. Der Spediteur. Der zahlt besser als wir, aber er fragt nicht so nett.'],
      [
        'jule',
        'Bevor ich euch mehr erzähle, will ich wissen, ob ihr was taugt. Rennen bis zur Staumauer. Wer vor mir da ist, dem trau ich.',
      ],
      ['falko', 'Auf dem Ding? Das ist älter als ich.'],
      ['timo', 'Dann habt ihr ja was gemeinsam.'],
    ],
    verloren: [['jule', 'Knapp daneben ist auch verloren. Noch mal von der Scheune?']],
    damm: [
      ['jule', 'Na gut. Ihr fahrt wie Leute, die nichts zu verlieren haben.'],
      ['sarah', 'Wir haben einen Garten zu verlieren.'],
      ['timo', 'Zeigt mal her. – Das ist der alte Kolonnenweg. Da sind die Grenzer langgefahren, immer am Zaun.'],
      ['jule', 'Und das Kreuz liegt daneben. Nur: daneben wovon? Die andere Hälfte fehlt.'],
      ['basti', 'Frag den Gerhard.'],
      [
        'jule',
        'Vier Wörter am Stück, Basti. Aber er hat recht: Gerhard, der Chronist. Der war neunundachtzig dabei. Sitzt meistens unter der Linde.',
      ],
      ['timo', 'Hier, fürs Benzin. Und was zum Krachmachen, falls ihr mal jemanden ablenken müsst.'],
      [
        'jule',
        'Und wenn ihr Feierabend braucht: Kegelbahn an der Scheune. Hier an der Mauer beißen abends die Karpfen.',
      ],
    ],
    gerhard1: [
      ['gerhard', 'Ihr seid die vom Garten. Setzt euch. Oder bleibt stehen, die Bank ist sowieso kalt.'],
      ['sarah', 'Wir haben da eine Karte. Eine halbe.'],
      ['', 'Gerhard sieht die Karte lange an. Sehr lange.'],
      ['gerhard', 'Die hab ich schon einmal gesehen. Ganz. Am zehnten November neunundachtzig.'],
      ['falko', 'Einen Tag nach dem Mauerfall.'],
      ['gerhard', 'Bei uns fiel keine Mauer. Bei uns stand ein Zaun, und der stand am Zehnten noch.'],
      ['gerhard', 'Ich war fünfunddreißig und Lehrer. Und im Schulflur stand eine Kiste, die mir nicht gehörte.'],
    ],
    damals: [
      ['', 'Die Nacht davor. Lutz – Schulfreund, Grenztruppen – stand mit einer Kiste vor der Tür.'],
      ['lutz', 'Heb die auf, Gerhard. Bis sich alles beruhigt hat.'],
      ['lutz', 'Frag nicht, was drin ist. Ich weiß es selber nur halb.'],
      ['lutz', 'Die halbe Karte nehm ich mit. Sicher ist sicher.'],
      ['', 'Jetzt ist Freitagnachmittag, und der ABV ist auf dem Weg zur Schule. Irgendwer hat geredet.'],
    ],
    kisteDa: [['', 'Schwerer als gedacht. Und sie klappert nicht. Das ist fast das Schlimmste.']],
    stroh: [['', 'Stroh drüber. Von außen sieht es aus wie immer – wie alles in diesem Land.']],
    gerhard2: [
      ['gerhard', 'Am nächsten Morgen war die Kiste weg. Und Lutz auch.'],
      ['sarah', 'Weg wohin?'],
      ['gerhard', 'Rüber, nehme ich an. Durften ja auf einmal alle. Geschrieben hat er nie.'],
      ['falko', 'Und die andere Hälfte der Karte?'],
      [
        'gerhard',
        'Hatte Lutz. Wenn dieser Krähwinkel nach der Kiste sucht, dann hat er Lutz’ Hälfte. Oder Lutz. Mir gefällt beides nicht.',
      ],
      ['gerhard', 'In die Chronik hab ich das nie geschrieben. Manches schreibt man erst auf, wenn es zu Ende ist.'],
    ],
    klinge: [
      ['sarah', 'Ein Transporter, Licht an, drei Mann. Die fühlen sich hier sehr zu Hause.'],
      ['falko', 'Plan: Einer macht auf der anderen Seite Krach, der andere fotografiert.'],
      ['sarah', 'Du machst Krach. Das kannst du.'],
    ],
    knall: [
      ['wache1', 'Was war das?'],
      ['wache2', 'Jäger sind das nicht. Komm, nachsehen.'],
    ],
    entdeckt: [['wache1', 'He! Da ist einer! Stehenbleiben!']],
    verlorenWache: [
      ['wache2', 'Weg. War wohl ein Reh.'],
      ['wache1', 'Ein Reh mit Handy?'],
    ],
    leucht: [['wache3', 'Die haben Fotos! Leuchtkugel, Abbruch – alles in den Wagen!']],
    heim4: [
      ['sarah', 'Drei Fotos. Ein Transporter, zwei Gesichter und Kisten mit Stempel.'],
      ['falko', 'Und ich habe Tannennadeln an Stellen, von denen ich nichts wusste.'],
    ],
    plan: [
      [
        'jule',
        'Das ist Krähwinkels Transporter. Die Kisten gehen ins Außenlager – die Container in der Feldflur, Richtung Autobahn.',
      ],
      [
        'timo',
        'Da hab ich mal Paletten abgeladen. Im Bürocontainer hängt was an der Wand, gerahmt. Eine halbe Karte. Ich dachte, das ist Deko.',
      ],
      ['sarah', 'Die hängt er sich an die Wand?'],
      ['jule', 'Krähwinkel hängt sich alles an die Wand, was er für seins hält.'],
      ['falko', 'Dann holen wir sie.'],
      [
        'jule',
        'Zwei Wege. Leise: nachts hinten durch den Zaun, da ist eine Lücke – während der Wachmann seine Runde dreht.',
      ],
      ['jule', 'Oder laut: Wir zünden vorn am Tor eine Batterie, die Wachen rennen hin, und ihr geht hinten rein.'],
      ['basti', 'Laut.'],
      ['jule', 'Basti ist für laut. Basti ist immer für laut.'],
    ],
    planLeise: [['jule', 'Leise also. Dann wartet, bis es dunkel ist. Und atmet flach.']],
    planLaut: [['jule', 'Laut. Basti, hol die Batterie. Ihr gebt das Zeichen, wenn ihr hinten am Zaun steht.']],
    batterie: [
      ['wache1', 'Am Tor! Die verdammten Mopedfahrer!'],
      ['wache2', 'Ich ruf die Polizei. Diesmal wirklich!'],
    ],
    wacheSieht: [['wache1', 'He! Du da! Stehenbleiben!']],
    wacheFunk: [['wache2', 'Zentrale? Einbruch im Außenlager. Ja, jetzt gerade!']],
    tuerAuf: [
      ['', 'Die Tür gibt nach. Im Büro: ein Schreibtisch, ein Kalender von 2019 – und an der Wand ein Rahmen.'],
    ],
    karteDa: [
      ['', 'Die zweite Hälfte. Hinter Glas, mit Passepartout. Krähwinkel hat Stil – oder zumindest einen Rahmen.'],
    ],
    ende: [
      ['jule', 'Legt sie zusammen.'],
      [
        '',
        'Die Hälften passen. Der Kolonnenweg läuft über die Faltkante, und das Kreuz sitzt an einem Bunker – kurz vor Bayern.',
      ],
      ['timo', 'Der Bunker. Da war ich als Kind. Da ist nichts drin außer Fledermäusen.'],
      ['sarah', 'Jetzt ist da was drin. Oder es war was drin.'],
      ['jule', 'Morgen früh weiß Krähwinkel, dass seine Karte weg ist. Mittags weiß er, wer sie hat.'],
      ['falko', 'Wir wollten eigentlich nur ein Wochenende im Garten.'],
      ['basti', 'Passiert.'],
    ],
  };
  // ---- the phone ----
  const SMS = {
    unbekannt: [
      'Unbekannt',
      'Das Paket war nicht für euch. Legt es zurück, wo ihr es herhabt, und wir vergessen, wie ihr ausseht.',
    ],
    jule1: ['Jule', 'Wer so eine Karte hat, sollte mit uns reden, bevor es andere tun. Feldscheune am Feldweg. – Jule'],
    jule2: [
      'Jule',
      'Krähwinkels Leute laden heute Nacht um. Untere Klinge, 23 Uhr. Wir brauchen Fotos, sonst glaubt uns das keiner. Lasst euch nicht sehen. – J.',
    ],
    jule3: ['Jule', 'Lebt ihr noch? Dann kommt mit den Fotos zur Scheune. – J.'],
    nebenbei: ['Jule', 'Kegeln an der Scheune, Angeln an der Staumauer. Sag nicht, wir hätten euch nichts geboten.'],
  };
  const CHAT = {
    paket: [
      ['Wolfgang', 'Zwei mit Paket an der alten Schule. Hat einer was bestellt?'],
      ['Ingrid', 'Das sind die Berliner vom Garten. Die grüßen wenigstens.'],
      ['Uwe', 'War ich nicht.'],
    ],
    rennen: [
      ['Manfred', 'Mopeds auf der Straße zur Talsperre. Drei Stück, eins davon kenne ich nicht.'],
      ['Ingrid', 'Ohne Helm mit Visier!!'],
    ],
    klinge: [
      ['Manfred', 'Schüsse an der Klinge?!'],
      ['Ingrid', 'Ich habe die Polizei angerufen. Zweimal.'],
      ['Uwe', 'War ich nicht.'],
      ['Wolfgang', 'Hab ich doch gesagt. Jäger sind das nicht.'],
    ],
    coup: [
      ['Heike', 'Blaulicht in der Feldflur Richtung Autobahn. Brennt da was?'],
      ['Wolfgang', 'Bei den Containern. Die keiner hingestellt haben will.'],
    ],
  };
  // ---- small lines: thoughts, notices, the failures ----
  const T = {
    neu: 'Neue Mission',
    fertig: 'Mission geschafft',
    nochmal: 'Noch einmal',
    weiter: 'Weiter',
    paket: '+50 €. Ein Paket, schwerer als es aussieht.',
    mitfahr: 'Mitfahrgelegenheit',
    mitfahrA: 'Eine halbe Stunde später',
    mitfahrB: 'Ein Rentner im Kombi hat euch mitgenommen. Er hat die ganze Fahrt vom Winter 1987 erzählt.',
    morgenA: 'Am nächsten Morgen',
    morgenB: 'Die halbe Karte lag die ganze Nacht auf dem Tisch. Geschlafen hat keiner richtig.',
    kanister: 'Gemisch einfüllen',
    kanisterVoll: 'Der Tank ist voll.',
    start3: ['3', '2', '1', 'Los!'],
    startSub: 'Bis zur Staumauer. Wer bremst, verliert.',
    fehlstart: 'Fehlstart! Zurück an die Linie.',
    platz: (p, n, m) =>
      'Platz ' +
      p +
      ' von ' +
      n +
      ' · noch ' +
      (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m / 10) * 10 + ' m'),
    verloren: 'Jule war vor dir an der Staumauer.',
    gewonnen: 'Erster an der Staumauer!',
    lohn2: '+80 € und vier Böller.',
    era89: 'Gerhards Erinnerung',
    kisteNimm: 'Kiste nehmen',
    kisteStroh: 'Kiste unter das Stroh',
    kisteSicht: 'Nicht, solange jemand zusieht.',
    kisteLaeuft: 'Mit der Kiste rennt keiner.',
    luftRein: 'Die Luft ist rein.',
    abend: 'Bis zum Abend warten',
    nachtW: 'Bis zur Nacht warten',
    nochHell: 'Hier ist noch niemand. Die kommen erst, wenn es dunkel ist.',
    boellerDa: 'Jule hat euch zwei Böller dagelassen.',
    foto: 'Foto machen',
    fotoFern: 'Zu weit weg – höchstens 40 m.',
    fotoSicht: 'Von hier sieht man nichts.',
    fotoN: n => 'Foto ' + n + ' von 3.',
    gesehen: 'Sie haben dich gesehen!',
    gesehenSub: 'Weg hier – außer Sicht bleiben, dann noch einmal.',
    geschnappt: 'Sie haben dich. Das Handy auch.',
    geschnapptSub: 'Die Fotos sind weg. Noch einmal vom Waldrand.',
    leucht: 'Eine Leuchtkugel steht über dem Wald.',
    nochmalKlinge: 'Zurück an die Klinge, kurz nach elf.',
    planTitel: 'Der Plan',
    planText: 'Wie holt ihr die Karte aus Krähwinkels Außenlager?',
    planLeise: [
      'Leise',
      'Nachts durch die Lücke im Zaun, während der Wachmann seine Runde dreht. Keine Polizei – solange euch keiner sieht.',
    ],
    planLaut: [
      'Laut',
      'Die Clique zündet am Tor eine Batterie, die Wachen rennen hin. Schnell – aber die Polizei ist dann schon unterwegs.',
    ],
    zeichen: 'Jule das Zeichen geben',
    zeichenFern: 'Erst hinten an den Zaun.',
    tuer: 'Tür aufbrechen',
    karteNimm: 'Karte von der Wand nehmen',
    wacheHat: 'Der Wachmann hat dich am Kragen.',
    wacheHatSub: 'Noch einmal – von draußen vor dem Zaun.',
    lohn5: '+250 € aus der Kasse der Clique.',
    kamera: 'Die Kamera am Tor',
    wachmann: 'Der Wachmann',
    anwohner: 'Anwohner',
    endeTitel: 'Kapitel 1 · Grenzland',
    endeText: 'Die Karte ist ganz. Das Kreuz liegt an einem Bunker am alten Kolonnenweg – kurz vor Bayern.',
    endeFort: 'Fortsetzung in Kapitel 2',
    endeKnopf: 'Weiter im freien Spiel',
    frei: 'Freies Spiel: Ratscher gehört euch. Kegeln, angeln, Moped fahren – Kapitel 2 folgt.',
  };
  // ---- the haulier's yard: a plan in the yard's own frame, turned and moved into the site ----
  // a: metres along the track (compass az), b: metres across it, towards the gate (side: +1 the gate looks to the right of az, −1 to the left)
  const HOF = {
    a0: -17,
    a1: 17,
    b0: -12,
    b1: 12,
    h: 2.2, // the fence
    tor: [-3, 3], // the gate in the front fence (b1), from a … to a
    luecke: [9, 10.5], // the gap in the back fence (b0)
    // sea containers: centre a, b; length along a (l) or along b (q: true); colour (sRGB)
    container: [
      { a: -8, b: -7.6, l: 12.2, col: [118, 50, 38] },
      { a: -8, b: -4.9, l: 12.2, col: [38, 66, 104] },
      { a: 7.4, b: 4.6, l: 12.2, col: [50, 88, 66] },
      { a: 11.2, b: -8.2, l: 6.06, col: [128, 124, 116] },
    ],
    buero: { a: -10.4, b: 6.6, l: 6.0, w: 2.44, h: 2.6, tuer: -8.8, tw: 0.95, fenster: -11.8 }, // the door in the wall towards the yard (b − w/2)
    lkw: { a: 4.5, b: -1.5, hd: 180 }, // heading relative to az
    mast: { a: 15.6, b: 10.6, h: 7 },
    licht: { a: 8, b: 3, h: 6.4 },
    kamera: { a: 3.7, b: 12, h: 3.1 },
    runde: [
      [-15, 9.8],
      [15, 9.8],
      [15, -10.4],
      [-15, -10.4],
    ],
    posten: [
      [-2.5, 9.6],
      [4.5, 9.6],
    ],
    vorTor: [0, 16.5], // where the clique sets off its battery
    hinten: [9.75, -15.5], // outside the gap
    drin: [9.75, -10.6], // just inside it
  };
  function lager(pos, az = 0, side = 1) {
    const r = (az * Math.PI) / 180,
      ux = Math.sin(r),
      uy = Math.cos(r),
      nx = Math.cos(r) * side,
      ny = -Math.sin(r) * side;
    const w = (a, b) => [pos[0] + ux * a + nx * b, pos[1] + uy * a + ny * b];
    // the yard's frame back from the site: [a, b]
    const l = (x, y) => {
      const dx = x - pos[0],
        dy = y - pos[1];
      return [dx * ux + dy * uy, dx * nx + dy * ny];
    };
    const H = HOF,
      B = H.buero;
    // a compass heading (rad) of a direction given in the yard's frame
    const hd = (da, db) => Math.atan2(ux * da + nx * db, uy * da + ny * db);
    // fence runs: [[a, b], [a, b]] each – the back one in two parts around the gap, the front one around the gate
    const zaun = [
      [
        [H.a0, H.b0],
        [H.luecke[0], H.b0],
      ],
      [
        [H.luecke[1], H.b0],
        [H.a1, H.b0],
      ],
      [
        [H.a1, H.b0],
        [H.a1, H.b1],
      ],
      [
        [H.a1, H.b1],
        [H.tor[1], H.b1],
      ],
      [
        [H.tor[0], H.b1],
        [H.a0, H.b1],
      ],
      [
        [H.a0, H.b1],
        [H.a0, H.b0],
      ],
    ];
    // solid boxes in the yard's frame: { a, b, la (half length along a), lb (half length along b), h }
    const boxen = [];
    for (const c of H.container)
      boxen.push({ a: c.a, b: c.b, la: c.q ? 1.22 : c.l / 2, lb: c.q ? c.l / 2 : 1.22, h: 2.59, k: 'container' });
    // the office: four walls, the one towards the yard in two parts beside the door
    const t = 0.08,
      bb = B.b - B.w / 2,
      bf = B.b + B.w / 2,
      aL = B.a - B.l / 2,
      aR = B.a + B.l / 2,
      d0 = B.tuer - B.tw / 2,
      d1 = B.tuer + B.tw / 2;
    boxen.push({ a: B.a, b: bf, la: B.l / 2, lb: t, h: B.h, k: 'buero' });
    boxen.push({ a: aL, b: B.b, la: t, lb: B.w / 2, h: B.h, k: 'buero' });
    boxen.push({ a: aR, b: B.b, la: t, lb: B.w / 2, h: B.h, k: 'buero' });
    boxen.push({ a: (aL + d0) / 2, b: bb, la: (d0 - aL) / 2, lb: t, h: B.h, k: 'buero' });
    boxen.push({ a: (d1 + aR) / 2, b: bb, la: (aR - d1) / 2, lb: t, h: B.h, k: 'buero' });
    const tuer = { a: B.tuer, b: bb, la: B.tw / 2, lb: t, h: 2.05, k: 'tuer' };
    const innen = (x, y, m = 0) => {
      const [a, b] = l(x, y);
      return a > H.a0 + m && a < H.a1 - m && b > H.b0 + m && b < H.b1 - m;
    };
    // does a box of the plan stand between two points (site metres)? zu: the office door is still closed
    const cut = (B, a0, b0, a1, b1) => {
      let t0 = 0,
        t1 = 1;
      for (const [p, d, c, e] of [
        [a0, a1 - a0, B.a, B.la],
        [b0, b1 - b0, B.b, B.lb],
      ]) {
        if (Math.abs(d) < 1e-9) {
          if (p < c - e || p > c + e) return false;
        } else {
          let u = (c - e - p) / d,
            v = (c + e - p) / d;
          if (u > v) [u, v] = [v, u];
          t0 = Math.max(t0, u);
          t1 = Math.min(t1, v);
          if (t0 > t1) return false;
        }
      }
      return true;
    };
    const sicht = (x0, y0, x1, y1, zu = true) => {
      const [a0, b0] = l(x0, y0),
        [a1, b1] = l(x1, y1);
      for (const B of boxen) if (cut(B, a0, b0, a1, b1)) return false;
      return !(zu && cut(tuer, a0, b0, a1, b1));
    };
    // a point pushed out of the plan's boxes (the guards walk around the containers): [x, y] in site metres
    const raus = (x, y, r = 0.35, zu = true) => {
      let [a, b] = l(x, y);
      const all = zu ? boxen.concat([tuer]) : boxen,
        hit = (p, q, m) => all.find(B => Math.abs(p - B.a) < B.la + m && Math.abs(q - B.b) < B.lb + m);
      for (let n = 0; n < 3; n++) {
        const B = hit(a, b, r);
        if (!B) break;
        // the four ways out of this box, the nearest one that does not end in another box
        const outs = [
          [B.a - B.la - r, b],
          [B.a + B.la + r, b],
          [a, B.b - B.lb - r],
          [a, B.b + B.lb + r],
        ].sort((p, q) => Math.hypot(p[0] - a, p[1] - b) - Math.hypot(q[0] - a, q[1] - b));
        const o = outs.find(p => !hit(p[0], p[1], r - 0.01)) || outs[0];
        a = o[0];
        b = o[1];
      }
      return w(a, b);
    };
    // the nearest point inside the fence (m metres off it)
    const hinein = (x, y, m = 0.7) => {
      const [a, b] = l(x, y);
      return w(Math.max(H.a0 + m, Math.min(H.a1 - m, a)), Math.max(H.b0 + m, Math.min(H.b1 - m, b)));
    };
    return {
      pos,
      az,
      side,
      H,
      w,
      l,
      hd,
      zaun,
      boxen,
      tuer,
      innen,
      sicht,
      raus,
      hinein,
      // places in site metres
      tor: w((H.tor[0] + H.tor[1]) / 2, H.b1),
      vorTor: w(H.vorTor[0], H.vorTor[1]),
      hinten: w(H.hinten[0], H.hinten[1]),
      drin: w(H.drin[0], H.drin[1]),
      vorTuer: w(B.tuer, bb - 0.9),
      imBuero: w(B.tuer, B.b),
      karte: w(B.tuer + 0.2, bf - 0.25),
      runde: H.runde.map(p => w(p[0], p[1])),
      posten: H.posten.map(p => w(p[0], p[1])),
      kamera: Object.assign(w(H.kamera.a, H.kamera.b), { hd: hd(0, 1) }),
      lkw: { pos: w(H.lkw.a, H.lkw.b), hd: r + (H.lkw.hd * Math.PI) / 180 },
      licht: w(H.licht.a, H.licht.b),
      mast: w(H.mast.a, H.mast.b),
    };
  }
  return { M, ORDER, S, R, SMS, CHAT, T, HOF, lager };
})();
export const GLMLOGIK = (() => {
  // ---- the step machine ----
  // M: [{ id, steps: [{ id, cp }] }] in the story's order · G: { m: {}, cur: '' } · io: { enter(m, i, why), leave(m, i, why), emit(name, data),
  // save(), done(m), gabe(m) } – why: 'start' | 'weiter' | 'nochmal' | 'reload' | 'debug' for enter, 'fertig' | 'fehl' | 'abbruch' | 'skip' for leave
  function runner(M, G, io) {
    const by = id => M.find(m => m.id === id) || null;
    const st = id => (G.m[id] && G.m[id].st) || 'offen';
    const idx = (m, s) =>
      typeof s === 'number'
        ? s
        : Math.max(
            0,
            m.steps.findIndex(q => q.id === s)
          );
    // the step a failure or a reload goes back to
    const cpOf = (m, i) => {
      const s = m.steps[i];
      if (!s || s.cp == null) return i;
      const j = m.steps.findIndex(q => q.id === s.cp);
      return j >= 0 && j <= i ? j : i;
    };
    const cur = () => (G.cur && st(G.cur) === 'läuft' ? by(G.cur) : null);
    const step = () => {
      const m = cur();
      return m ? m.steps[G.m[m.id].i] || null : null;
    };
    // the next mission of the story that is not done (null: the chapter is through)
    const nextOpen = () => M.find(m => st(m.id) !== 'erledigt') || null;
    function start(id, s = 0, why = 'start') {
      const m = by(id);
      if (!m) return false;
      const c = cur();
      if (c) {
        io.leave(c, G.m[c.id].i, 'abbruch');
        if (c.id !== id) G.m[c.id] = { st: 'offen', i: 0, n: G.m[c.id].n || 0 };
      }
      const i = Math.min(m.steps.length - 1, idx(m, s));
      G.m[id] = { st: 'läuft', i, n: (G.m[id] && G.m[id].n) || 0 };
      G.cur = id;
      io.save();
      io.emit('mission', { id, st: 'läuft' });
      io.emit('schritt', { id, i });
      io.enter(m, i, why);
      return true;
    }
    // after a reload: the running mission goes on at its step's checkpoint; none running: the next of the story
    function resume() {
      const m = cur();
      if (!m) {
        G.cur = '';
        return false;
      }
      const e = G.m[m.id];
      e.i = cpOf(m, Math.min(m.steps.length - 1, Math.max(0, e.i | 0)));
      io.save();
      io.emit('schritt', { id: m.id, i: e.i });
      io.enter(m, e.i, 'reload');
      return true;
    }
    function finish(why) {
      const m = cur();
      if (!m) return false;
      const e = G.m[m.id];
      e.st = 'erledigt';
      e.i = m.steps.length - 1;
      G.cur = '';
      io.save();
      io.emit('mission', { id: m.id, st: 'erledigt' });
      if (io.done) io.done(m, why);
      return true;
    }
    // the running step is done
    function next(why = 'fertig') {
      const m = cur();
      if (!m) return false;
      const e = G.m[m.id];
      io.leave(m, e.i, why);
      if (e.i + 1 >= m.steps.length) return finish(why);
      e.i++;
      io.save();
      io.emit('schritt', { id: m.id, i: e.i });
      io.enter(m, e.i, 'weiter');
      return true;
    }
    // failed: back to the checkpoint (never the whole chapter)
    function fail(why = '') {
      const m = cur();
      if (!m) return false;
      const e = G.m[m.id];
      io.leave(m, e.i, 'fehl');
      e.n = (e.n || 0) + 1;
      e.i = cpOf(m, e.i);
      io.save();
      io.emit('mission', { id: m.id, st: 'nochmal', why });
      io.emit('schritt', { id: m.id, i: e.i });
      io.enter(m, e.i, 'nochmal');
      return true;
    }
    // tests and Falko: to a mission's step – everything before counts as done (with what it gave), everything after as open
    function jump(id, s = 0) {
      const k = M.findIndex(m => m.id === id);
      if (k < 0) return false;
      const c = cur();
      if (c) {
        io.leave(c, G.m[c.id].i, 'abbruch');
        G.cur = '';
      }
      M.forEach((m, j) => {
        if (j < k) {
          if (st(m.id) !== 'erledigt' && io.gabe) io.gabe(m);
          G.m[m.id] = { st: 'erledigt', i: m.steps.length - 1, n: (G.m[m.id] && G.m[m.id].n) || 0 };
        } else delete G.m[m.id];
      });
      return start(id, s, 'debug');
    }
    // the journal: what is done, what runs, and the next one as a hint (what comes later stays a secret)
    function list() {
      const out = [],
        nx = nextOpen();
      for (const m of M) {
        const s = st(m.id);
        if (s === 'erledigt') out.push({ id: m.id, status: 'erledigt', i: m.steps.length - 1 });
        else if (s === 'läuft' && G.cur === m.id) out.push({ id: m.id, status: 'läuft', i: G.m[m.id].i });
        else if (nx && nx.id === m.id) out.push({ id: m.id, status: 'offen', i: 0 });
      }
      return out;
    }
    const allDone = () => M.every(m => st(m.id) === 'erledigt');
    return { by, st, cur, step, cpOf, nextOpen, start, resume, next, fail, finish, jump, list, allDone };
  }
  // ---- the race: a rival's top speed (m/s) by his lead over the player (m; negative: he is behind) ----
  // Far ahead he eases off, far behind he gives all the moped has – never more than a ridden moped does, so a clean ride wins.
  function gummi(gap, base = 12.8) {
    if (!Number.isFinite(gap)) return base;
    if (gap > 30) return Math.max(base - 3.6, base - ((gap - 30) / 90) * 3.6);
    if (gap < -25) return Math.min(base + 2.2, base + ((-gap - 25) / 100) * 2.2);
    return base;
  }
  // the place among the riders: s metres along the course for the player, others: theirs
  const platz = (s, others) => 1 + others.filter(o => o > s).length;
  // ---- the hour: night for what happens in the dark (21:30 … 4:30); minutes until the next h:m ----
  const tag = t => ((t % 1440) + 1440) % 1440;
  const nacht = t => {
    const m = tag(t);
    return m >= 21 * 60 + 30 || m < 4 * 60 + 30;
  };
  const bis = (t, h, m = 0) => {
    const d = (h * 60 + m - tag(t) + 1440) % 1440;
    return d || 1440;
  };
  // ---- a guard's attention. W: { see: 0 … 1, st: 'ruhig' | 'alarm', lost } · o: { sees, d } → 'alarm' | 'weg' | null ----
  const wache = () => ({ see: 0, st: 'ruhig', lost: 0 });
  function wachsam(W, dt, o = {}) {
    if (!(dt > 0)) return null;
    if (W.st === 'alarm') {
      if (o.sees) W.lost = 0;
      else W.lost += dt;
      if (W.lost > 9) {
        W.st = 'ruhig';
        W.see = 0;
        W.lost = 0;
        return 'weg';
      }
      return null;
    }
    // close by they are sure at once, far away it takes a look or two
    const k = o.d < 6 ? 4 : o.d < 14 ? 1.5 : 0.75;
    W.see = Math.max(0, Math.min(1, W.see + (o.sees ? k : -0.4) * dt));
    if (W.see >= 1) {
      W.st = 'alarm';
      W.lost = 0;
      return 'alarm';
    }
    return null;
  }
  // ---- how long a line stays on the screen (ms): reading time, at least two seconds ----
  const dauer = text => Math.round(Math.max(2000, Math.min(9000, 1100 + String(text).length * 58)));
  // ---- the closing screen's rows ----
  function bilanz(s = {}) {
    const n = v => (Number.isFinite(v) ? v : 0),
      km = n(s.km);
    return [
      ['Taten', String(Math.round(n(s.taten)))],
      ['Der Polizei entkommen', String(Math.round(n(s.entkommen)))],
      ['Erwischt', String(Math.round(n(s.erwischt)))],
      ['Mit dem Moped gefahren', km.toFixed(1).replace('.', ',') + ' km'],
      ['Beste Kegelrunde', n(s.kegel) > 0 ? Math.round(n(s.kegel)) + ' Kegel' : '–'],
      [
        'Fische',
        n(s.fische) > 0
          ? Math.round(n(s.fische)) +
            (n(s.best) > 0 ? ' (der schwerste ' + n(s.best).toFixed(1).replace('.', ',') + ' kg)' : '')
          : '–',
      ],
    ];
  }
  return { runner, gummi, platz, nacht, bis, tag, wache, wachsam, dauer, bilanz };
})();
if (typeof window !== 'undefined') {
  window.GLMDATA = GLMDATA;
  window.GLMLOGIK = GLMLOGIK;
}
