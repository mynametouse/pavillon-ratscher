// ===================== feat/grenzland-kapitel2: chapter 2 „Kolonnenweg“ – texts, talks, places (GLK2DATA), the chapter's rules (GLK2LOGIK), cracking cars (GLKNLOGIK) =====================
// Pure data and pure functions, no scene (unit tests: viz3/test/unit/grenzland_kapitel2.test.mjs). Plan: docs/plans/plan_kapitel2.md (stage 2:
// the chapter's opening, mission 1 „Grünes Band“, mission 2 „Ein Auto für die Nacht“, Paket D: cracking, repainting, plates).
// At import the chapter registers itself in the runner's data (grenzland/gl_mission_data.js – the runner reads everything from there):
//   GLMDATA.M      the missions' titles for the journal and the title cards (with ueber: the small line over the title, kap: the chapter)
//   GLMDATA.ORDER  their place in the story (after chapter 1) · GLMDATA.R the talks (GLMISSION.rede and GLMISSION.linien read them there)
//   GLMDATA.LAGE   the music under a step (grenzland/gl_score.js)
//   GLDATA.CAST    the Wartburg's owner (invented) · GLDATA.KLEID his winter jacket
// Everybody in it is invented (the clique, Krähwinkel and his men, the stranger, the owner Rudi Fiedler); what is told of history is true
// and has its source here (QUELLEN): the crossing point Eisfeld/Rottenbach (Bundesarchiv), the Grünes Band (BUND Naturschutz), Gerhard's
// file (the files of the Stasi records archive name the staff, black out third parties). Hubert and Ronald are never in it (unit test).
// GLK2LOGIK: when the chapter may begin in free play, the story's December, the weather by step, the bunker's watchers.
// GLKNLOGIK: getting into an old car (wire or window), a new one refuses (its alarm), what the police know of a stolen car (the owner's
//   report: colour and plate), what makes it a stranger again (paint, plates), the saved state's check.
import { GLDATA } from './gl_data.js';
import { GLMDATA } from './gl_mission_data.js';
export const GLK2DATA = (() => {
  // ---- the chapter's card (the opening of mission 1) ----
  const KAP = {
    nr: 2,
    titel: 'Kolonnenweg',
    ueber: 'Kapitel 2',
    unter: 'Ratscher · Feldscheune · Dezember',
    blendeA: 'Drei Monate später',
    blendeB: 'Dezember. Krähwinkel hat sich nicht gerührt – kein Anruf, kein Besuch. Das war das Unheimlichste daran.',
    // free play after chapter 1: how it is offered (the panel's extra button, a thought)
    knopf: 'Kapitel 2 beginnen',
    angebot: 'Kapitel 2 wartet: „Kapitel 2 beginnen“ im Grenzland-Feld – oder erst noch ein bisschen Ratscher.',
    weiter: 'Fortsetzung folgt',
    weiterUeber: 'Kapitel 2',
    weiterUnter: 'Als Nächstes: „Die Nacht am Tor“ – Suhl, Dezember 1989',
  };
  // ---- the missions: titles for the journal and the cards ----
  const M = {
    k2m1: {
      kap: 2,
      ueber: 'Kapitel 2 · Mission 1',
      unter: 'Görsdorfer Heide · Samstagvormittag',
      title: 'Grünes Band',
      who: 'Jule',
      teaser: 'Jule hat Neuigkeiten über die Kiste.',
      done: 'Der Bunker liegt abseits des Kolonnenwegs in der Görsdorfer Heide. Krähwinkels Leute waren schon da – und der Fremde auch. Er will die Akte, nicht das Geld.',
    },
    k2m2: {
      kap: 2,
      ueber: 'Kapitel 2 · Mission 2',
      unter: 'Schleusingen · Weihnachtsmarkt · Samstagabend',
      title: 'Ein Auto für die Nacht',
      who: 'Jule',
      teaser: 'In den Bunker geht man nachts – und nicht mit drei Mopeds, die Krähwinkel alle kennt.',
      done: 'Fiedlers Wartburg steht in der Feldscheune: neue Farbe, fremde Schilder. Dazu eine Arbeitsjacke der Spedition Krähwinkel.',
    },
  };
  const ORDER = ['k2m1', 'k2m2'];
  // the music under a step (grenzland/gl_score.js; wanted decides by itself)
  const LAGE = {
    'k2m1:bunker': 'spannung',
    'k2m1:fotos': 'spannung',
    'k2m1:rueckzug': 'spannung',
    'k2m2:knacken': 'spannung',
    'k2m2:weg': 'spannung',
  };
  // ---- the steps' texts (the task card and the journal) ----
  const S = {
    k2m1: {
      scheune: 'Die Clique wartet in der Feldscheune.',
      spur: 'Draußen auf dem Feldweg steht ein Lkw. Sieh nach (T: die Nachricht).',
      nacht: 'Morgen geht es zum Grünen Band. Jetzt: in den Garten und schlafen.',
      aufbruch:
        'Fahr mit der Simson zum Grünen Band bei Eisfeld, zum Parkplatz am Grenzturm-Museum. Auf die Autobahn darf sie nicht: über die Landstraße – oder „Hinfahren“ im Grenzland-Feld.',
      museum: 'Am Parkplatz vor dem Grenzturm. Da vorn beginnt der Kolonnenweg.',
      kolonnenweg: 'Fahr den Kolonnenweg entlang in die Görsdorfer Heide. Das Kreuz liegt abseits des Wegs.',
      bunker: 'Da vorn: ein altes Fundament. Lass die Simson stehen und schleich dich näher (C: ducken).',
      fotos: n =>
        'Fotografiere den Bunker und Krähwinkels Leute – aus der Deckung, höchstens 40 m (E: Foto). ' + n + ' von 2.',
      rueckzug:
        'Weg hier: zurück zur Simson und raus aus der Heide. Bleib vom Kolonnenweg weg – Krähwinkels Transporter fährt ihn ab.',
      heim: 'Zurück nach Ratscher in den Garten – über die Landstraße oder „Heimfahren“ im Grenzland-Feld.',
    },
    k2m2: {
      scheune: 'Jule will euch in der Feldscheune sehen.',
      abend:
        'Warte bis zum Abend („Bis zum Abend warten“) und fahr nach Schleusingen. Fiedlers Wartburg steht am Rand der Altstadt.',
      knacken: n =>
        n === 'markt'
          ? 'Fiedler steht am Glühweinstand. Knack den Wartburg: leise mit dem Draht (E halten) oder schnell mit der Scheibe.'
          : 'Fiedler sitzt in der Gaststätte am Markt. Knack den Wartburg: leise mit dem Draht (E halten) oder schnell mit der Scheibe.',
      weg: 'Weg mit dem Wartburg – in die Feldscheune nach Ratscher. Wer ihn kennt, sucht einen weißen Wartburg.',
      lackieren:
        'Stell den Wartburg unter das Dach der Feldscheune, steig aus – und lackier ihn um (E). Nicht, solange gesucht wird.',
      schilder: 'Tausch die Kennzeichen: Basti hat noch die Schilder seines alten Golfs (E halten).',
      jacke: 'Zieh die Arbeitsjacke der Spedition an (E) – und zeig dich Jule.',
      ende: 'Ein Auto für die Nacht. Rede mit Jule.',
    },
  };
  // ---- the talks: [who (cast id; '' tells), line] ----
  const R = {
    // the chapter's opening: the barn, a December evening, snow
    k2auftakt: [
      [
        'jule',
        'Drei Monate. Kein Anruf, kein Besuch, kein Wort von Krähwinkel. So ruhig ist der nur, wenn er was vorhat.',
      ],
      ['timo', 'Vielleicht wartet er auf Schnee. Im Schnee sieht man jede Spur.'],
      [
        'gerhard',
        'Ich war in Suhl, im Stasi-Unterlagen-Archiv. Den Antrag auf meine Akte hab ich vor Jahren gestellt – gestern durfte ich lesen.',
      ],
      ['sarah', 'Und was steht drin?'],
      [
        'gerhard',
        '„Am zehnten November nahm der Lehrer G. eine Kiste in Verwahrung. Inhalt: Unterlagen der Bezirksverwaltung und Devisen.“',
      ],
      ['timo', 'Devisen. Westgeld?'],
      [
        'gerhard',
        'Westgeld. Lutz hatte die Kiste aus einem Wagen der Bezirksverwaltung geholt. Gefahren hat den ein junger Mann. Krähwinkel.',
      ],
      ['falko', 'Der Spediteur. Mit zwanzig Fahrer bei der Stasi.'],
      ['gerhard', 'Die Namen von Leuten wie mir schwärzen sie in den Akten. Die von den Mitarbeitern nicht.'],
      ['jule', 'Dann ist da kein Schatz drin. Da ist drin, was ihn heute noch alles kosten kann.'],
      ['basti', 'Und Geld.'],
      ['jule', 'Und Geld, Basti. Danke.'],
      [
        'gerhard',
        'Noch was. Vor einer Woche hat im Laden ein Mann nach mir gefragt. Mitte fünfzig, dunkler Mantel. Ob ich einen Lutz kenne.',
      ],
      ['sarah', 'Der von der Haltestelle. Der sucht die Kiste also selbst.'],
      [
        'jule',
        'Dann sind wir vor beiden da. Morgen fahrt ihr zum Kolonnenweg und sucht den Bunker. Nur gucken. Fotos.',
      ],
      ['falko', 'Nur gucken. Das hat an der Klinge auch prima geklappt.'],
    ],
    // the traitor's first trace: a lorry of the haulier on the field track, a message
    k2spur: [
      ['sarah', 'Der Lkw da draußen stand vorhin schon da. Mit laufendem Motor.'],
      [
        'jule',
        '„Schöne Grüße in die Feldscheune.“ Das kann nur einer schreiben, der wusste, dass wir heute hier sind.',
      ],
      ['timo', 'Oder einer, der von der Straße aus guckt. Die Scheune ist nicht gerade ein Versteck.'],
      ['basti', 'Hm.'],
      ['gerhard', 'Ich geh nach Hause. Und ich schließ ab. Das hab ich seit neunundachtzig nicht mehr gemacht.'],
    ],
    k2morgen: [['sarah', 'Zehn Zentimeter Neuschnee, und wir fahren Moped. Zum Grünen Band. Freiwillig.']],
    // at the car park by the border tower (true: Bundesarchiv; BUND Naturschutz)
    k2museum: [
      [
        'sarah',
        'Da drüben war die Grenzübergangsstelle Eisfeld–Rottenbach. Aufgemacht am 21. Juni 1973. Heute steht im Turm eine Ausstellung.',
      ],
      ['falko', 'Und der Streifen, wo der Zaun war, ist jetzt Naturschutz.'],
      [
        'sarah',
        'Das Grüne Band. Am 9. Dezember 1989 haben sich in Hof Naturschützer aus Ost und West getroffen und gesagt: Das bleibt.',
      ],
      ['falko', 'Und Krähwinkel hat da einen Bunker. Das ist weniger schön.'],
    ],
    k2platten: [
      ['sarah', 'Der Kolonnenweg. Lochplatten, damit die Grenzer auch im Matsch fahren konnten.'],
      ['falko', 'Und damit man jede Platte im Kreuz spürt.'],
    ],
    // at the bunker (shouts in the action: never a cutscene, grenzland/gl_kamera.js BARK)
    k2bunkerDa: [
      ['sarah', '(leise) Die sind schon da. Ein Transporter, drei Mann. Die buddeln an einer Luke.'],
      ['falko', '(leise) Zwei Fotos. Und dann weg, bevor die uns sehen.'],
    ],
    k2fremderDa: [['sarah', '(leise) Da drüben am Waldrand. Der Mann von der Haltestelle.']],
    k2entdeckt: [['wache1', 'He! Da hinten ist einer!']],
    k2verloren: [
      ['wache2', 'Nichts. Ein Reh, wahrscheinlich.'],
      ['wache1', 'Rehe tragen keine Mütze.'],
    ],
    k2abzug: [['wache3', 'Die Luke kriegen wir so nicht auf. Einpacken, wir kommen nachts wieder.']],
    // the stranger's message, once there is a signal again
    k2fremderSms: [
      ['falko', '„Mein Vater stand 1989 in Krähwinkels Berichten.“ Er will die Akte. Nicht das Geld.'],
      ['sarah', 'Und woher hat er unsere Nummer?'],
      ['falko', 'Woher hat Krähwinkel sie?'],
    ],
    k2heim1: [
      [
        'sarah',
        'Zwei Fotos, ein Bunker, drei Männer mit Schaufeln und ein Fremder mit Mantel. Für einen Samstag reicht das.',
      ],
      ['falko', 'Die kommen nachts wieder. Hat einer gesagt.'],
      ['sarah', 'Dann müssen wir vorher da sein.'],
    ],
    // ---- mission 2: a car for the night ----
    k2auto: [
      ['jule', 'In den Bunker gehen wir nachts. Und nicht mit drei Mopeds, die Krähwinkel alle kennt.'],
      [
        'timo',
        'Wir brauchen ein Auto. Ein altes. Alles ab Ende der Neunziger hat eine Wegfahrsperre – da drahtest du, bis du schwarz wirst.',
      ],
      ['basti', 'Fiedlers Wartburg.'],
      ['sarah', 'Wer ist Fiedler?'],
      [
        'basti',
        'Rentner. Fährt jeden Samstag nach Schleusingen auf den Weihnachtsmarkt. Parkt immer an derselben Ecke. Um sechs steht er beim Glühwein.',
      ],
      ['falko', 'Woher weißt du so was?'],
      ['basti', 'Man guckt halt.'],
      [
        'jule',
        'Wir leihen ihn aus. Neue Farbe, andere Schilder – und nach der Nacht kriegt er ihn zurück. Gewaschen und vollgetankt.',
      ],
      ['sarah', 'Das sagen sie alle.'],
      [
        'timo',
        'Hier, ein Draht. Und eine Arbeitsjacke von Krähwinkel, noch vom Paletten-Abladen im Sommer. Damit fragt dich auf seinem Hof keiner was.',
      ],
      ['jule', 'Lackiert wird hier in der Scheune. Timo kann das.'],
    ],
    k2markt: [
      ['sarah', 'Glühwein, Bratwurst, ein Wartburg. Schleusingen hat alles, was man für einen Samstag braucht.'],
    ],
    k2gaststaette: [
      ['sarah', 'Kein Markt heute. Fiedler sitzt drüben beim Schnitzel. Hoffentlich bestellt er noch einen Nachtisch.'],
    ],
    k2alarm: [['', 'Der hier ist zu neu: Die Wegfahrsperre piept, die Alarmanlage heult.']],
    k2besitzer: [['fiedler', 'Mein Wartburg! He! Das ist meiner!']],
    k2drin: [['falko', 'Choke raus, zwei Drähte zusammen – er läuft. Fiedler pflegt ihn wirklich.']],
    k2scheune2: [
      ['timo', 'Rein damit, unters Dach. Licht aus.'],
      ['jule', 'Wenn die Polizei noch sucht, bleibt der Wagen, wo er ist. Lackiert wird, wenn Ruhe ist.'],
    ],
    k2lack: [
      ['timo', 'Abkleben, anschleifen, zwei Schichten. Morgen früh riecht die ganze Scheune nach Verdünnung.'],
      ['jule', 'Jetzt noch die Schilder. Die Nummer steht in der Anzeige.'],
    ],
    k2schild: [
      ['basti', 'Von meinem alten Golf. Der war rot.'],
      ['sarah', 'Und sind die noch angemeldet?'],
      ['basti', 'Nein. Solange keiner nachguckt, ist das ein Kennzeichen.'],
    ],
    k2jacke: [
      [
        'jule',
        'Orange, Reflexstreifen, „Spedition Krähwinkel“ auf dem Rücken. Du siehst aus wie einer, der dort Paletten schiebt.',
      ],
      ['timo', 'Auf seinem Hof guckt keiner zweimal hin, wenn du so rumläufst.'],
    ],
    k2ende: [
      [
        'jule',
        'Ein weißer Wartburg ist weg. Ein anderer steht da, mit Schildern von einem Golf, den es nicht mehr gibt.',
      ],
      ['sarah', 'Und Fiedler sucht seinen. Der hat ihn bestimmt gewaschen jeden Sonntag.'],
      ['jule', 'Er kriegt ihn zurück. Nach der Nacht.'],
      ['timo', 'Und wenn die Nacht schiefgeht?'],
      ['basti', 'Dann kriegt er ihn trotzdem zurück. Nur in Blau.'],
    ],
  };
  // ---- the phone ----
  const SMS = {
    unbekannt: ['Unbekannt', 'Schöne Grüße in die Feldscheune. Bei Schnee sieht man jede Spur.'],
    jule1: [
      'Jule',
      'Wir bleiben weg – drei Mopeds am Kolonnenweg fallen auf. Fotos vom Bunker, dann nichts wie weg. – J.',
    ],
    fremder: [
      'Unbekannt',
      'Ihr wart am Bunker. Ich auch. Mein Vater stand 1989 in Krähwinkels Berichten. Ich will die Akte, nicht das Geld. Wir sollten reden. – Der Mann von der Haltestelle',
    ],
    jule2: ['Jule', 'Kommt zur Scheune. Für die Nacht am Bunker brauchen wir was mit vier Rädern. – J.'],
  };
  const CHAT = {
    schnee: [
      ['Ingrid', 'Erster Schnee! Wer schippt am Anger? Ich frage für die Gemeinde.'],
      ['Uwe', 'War ich nicht.'],
      ['Heike', 'Biete: Schneeschieber. Suche: jemanden, der schiebt.'],
    ],
    lkw: [['Wolfgang', 'Schon wieder ein Lkw von Krähwinkel am Feldweg. Was liefern die eigentlich in die Feldflur?']],
    wartburg: [
      ['Katrin', 'In Schleusingen haben sie vom Weihnachtsmarkt einen Wartburg geklaut. Einen Wartburg!'],
      ['Manfred', 'Wer klaut denn einen Wartburg?'],
      ['Uwe', 'War ich nicht.'],
    ],
  };
  const FEED = {
    wartburg: [
      'suedthueringen.live',
      'Weihnachtsmarkt Schleusingen: Wartburg 353 vom Parkplatz verschwunden, weiß, HBN-RF 53. Der Besitzer: „Der ist älter als die halbe Polizei.“',
    ],
  };
  // ---- small lines: notices, the panel's buttons, the failures ----
  const T = {
    morgenA: 'Samstagmorgen',
    morgenB: 'Über Nacht sind zehn Zentimeter Schnee gefallen. Die Simson springt trotzdem an.',
    hinfahren: 'Hinfahren',
    hinA: 'Eine halbe Stunde später',
    hinB: 'Über die Landstraße bis Eisfeld – die Simson darf nicht auf die Autobahn, und das ist auch gut so.',
    heimfahren: 'Heimfahren',
    heimA: 'Eine halbe Stunde später',
    heimB: 'Zurück über die Landstraße. Im Schneetreiben fährt keiner schneller als die Simson.',
    zoneLaedt: 'Das Grüne Band lädt …',
    tank: 'Jule hat das Moped vollgetankt. Fünf Liter Gemisch.',
    foto: 'Foto machen',
    fotoFern: 'Zu weit weg – höchstens 40 m.',
    fotoSicht: 'Von hier sieht man nichts.',
    fotoN: n => 'Foto ' + n + ' von 2.',
    gesehen: 'Sie haben dich gesehen!',
    gesehenSub: 'Weg hier – außer Sicht bleiben, dann noch einmal.',
    geschnappt: 'Sie haben dich.',
    geschnapptSub: 'Die Fotos sind weg. Noch einmal – vom Rand der Heide.',
    gesehenWeg: 'Der Transporter hat dich gesehen.',
    gesehenWegSub: 'Noch einmal vom Bunker – weg vom Kolonnenweg.',
    funkloch: 'Kein Netz. Das Grüne Band ist ein Funkloch.',
    netz: 'Wieder Netz – und eine Nachricht.',
    abend: 'Bis zum Abend warten',
    nochHell: 'Noch zu hell – und Fiedler ist noch nicht in der Stadt.',
    zuSpaet: 'Zu spät. Fiedler ist nach Hause gefahren.',
    zuSpaetSub: 'Noch einmal – eine Stunde früher.',
    fiedlerKommt: 'Fiedler kommt zurück zu seinem Auto.',
    lack: 'Umlackieren',
    lackTitel: 'Neue Farbe',
    lackText: 'Timo hat Lack für eine Farbe. Welche?',
    lackA: 'Drei Stunden später',
    lackB: 'Abkleben, anschleifen, zwei Schichten aus der Lackierpistole. Timo kann das erstaunlich gut.',
    lackSterne: 'Nicht, solange die Polizei sucht – erst Ruhe.',
    lackDrin: 'Erst aussteigen.',
    lackDach: 'Erst unter das Dach der Scheune damit.',
    schild: 'Kennzeichen tauschen',
    schildOk: 'Bastis alte Golf-Schilder sind dran.',
    jacke: 'Arbeitsjacke der Spedition anziehen',
    jackeAn: 'Die Arbeitsjacke der Spedition ist an: orange, Reflexstreifen, „Spedition Krähwinkel“ auf dem Rücken.',
    lohn2: 'Ein Wartburg ohne Vergangenheit',
    lohn1: 'Zwei Fotos vom Bunker',
  };
  // ---- the car of mission 2: Fiedler's Wartburg 353 (invented owner, invented plates; HBN: the district of Hildburghausen) ----
  const AUTO = {
    id: 'fiedler',
    typ: 'wartburg',
    farbe: 'pastellweiss',
    kz: 'HBN-RF 53',
    kzNeu: 'HBN-BM 47',
    besitzer: 'Rudi Fiedler',
    // the car of today parked behind it (it refuses: immobiliser and alarm)
    neu: { id: 'nachbar', typ: 'kombi', farbe: 'anthrazit', kz: 'HBN-KL 812' },
  };
  // ---- where things are – asked from agent zone's GLZONE; the stand-in below is used only while GLZONE is missing ----
  // (site metres: x east, y north, the garden's slab is the origin) – a gravel track west of Ratscher stands in for the Kolonnenweg in tests
  // (measured from the game's own ways, viz3/dist/geo/roads.b64.json: 731 m, nearly straight, 87 m from the main road at its east end)
  const ERSATZ = {
    weg: [
      [-281.2, 583.6],
      [-292.5, 585.4],
      [-386.3, 586.7],
      [-420.5, 585.0],
      [-476.0, 580.0],
      [-665.2, 557.3],
      [-687.2, 555.6],
      [-804.7, 557.5],
      [-863.9, 557.7],
      [-1008.1, 580.9],
    ],
    orte: {
      parkplatz: [-262, 590],
      museum: [-236, 600],
      kolonnenweg_a: [-281.2, 583.6],
      kolonnenweg_b: [-1008.1, 580.9],
      heide: [-700, 590],
      bunker: [-742, 612],
    },
    anfahrt: null,
  };
  // ---- history told in the chapter, with its sources ----
  const QUELLEN = [
    [
      'Bundesarchiv (Stasi-Unterlagen-Archiv): Grenzübergangsstellen für den Bezirk Suhl – Eisfeld/Rottenbach öffnete am 21. Juni 1973; der Grenzturm bei Eisfeld ist heute Gedenkstätte mit Ausstellung',
      'https://www.bundesarchiv.de/themen-entdecken/online-entdecken/themenbeitraege/grenzuebergangsstellen-fuer-den-bezirk-suhl/',
    ],
    [
      'BUND Naturschutz in Bayern, Pressemitteilung 117/14: Das Grüne Band wurde am 9. Dezember 1989 in Hof gegründet (mehr als 400 Naturschützer aus Ost und West; Braunkehlchen, Neuntöter)',
      'https://www.bund-naturschutz.de/fileadmin/_migrated/news_uploads/PM-117-14-Geburtstag_Gruenes_Band.pdf',
    ],
    [
      'Wikivoyage: Grünes Band (Deutschland) – der Kolonnenweg aus Lochbetonplatten, der Streifen zwischen Weg und früherer Grenze',
      'https://de.wikivoyage.org/wiki/Gr%C3%BCnes_Band_(Deutschland)',
    ],
  ];
  // every spoken line (for the recordings): [['gl_<cast>', text], …] – the narrator's lines are not spoken
  function linien() {
    const out = [],
      seen = new Set();
    for (const L of Object.values(R))
      for (const [who, text] of L) {
        const k = who + ':' + text;
        if (!who || seen.has(k)) continue;
        seen.add(k);
        out.push(['gl_' + who, text]);
      }
    return out;
  }
  return { KAP, M, ORDER, LAGE, S, R, SMS, CHAT, FEED, T, AUTO, ERSATZ, QUELLEN, linien };
})();
// ---------------- the cast and clothes chapter 2 adds (invented) ----------------
if (!GLDATA.KLEID.k2rentner)
  GLDATA.KLEID.k2rentner = {
    ober: [92, 88, 80],
    oberM: 'steppung',
    unter: [52, 54, 60],
    schuh: [40, 32, 26],
    arm: true,
  };
if (!GLDATA.CAST.fiedler)
  GLDATA.CAST.fiedler = {
    name: 'Rudi Fiedler',
    fig: 'vk_m16',
    clips: 'm',
    h: 1.72,
    stoop: 0.08,
    kleid: 'k2rentner',
    hut: 'schiebergrau',
    voice: { g: 'm', age: 71 },
  };
// ---------------- into the runner's data (the runner reads titles, order, talks and music from GLMDATA) ----------------
Object.assign(GLMDATA.M, GLK2DATA.M);
for (const id of GLK2DATA.ORDER) if (!GLMDATA.ORDER.includes(id)) GLMDATA.ORDER.push(id);
for (const [k, v] of Object.entries(GLK2DATA.R)) if (!GLMDATA.R[k]) GLMDATA.R[k] = v;
Object.assign(GLMDATA.LAGE, GLK2DATA.LAGE);
// ===================================================================================================================================
export const GLK2LOGIK = (() => {
  const tag = t => ((t % 1440) + 1440) % 1440;
  // the story's December: chapter 2 opens on Friday, 4 December 2026 (days since 1970) – the first Advent weekend but one is on: the
  // Christmas market of Schleusingen (grenzland/gl_feste_data.js: Fr 16–21, Sa 12–21, So 12–19)
  const DEZ = Date.UTC(2026, 11, 4) / 864e5;
  // the calendar's e0 (time/daynight.js: the date is e0 + the game's day index) so that game day d is the chapter's first day
  const e0 = d => DEZ - d;
  // when the chapter begins in free play after chapter 1: the player asked for it (the panel's button), came to the barn, or played on
  // for a while (s of calm free play) – never in the middle of something (a mission, wanted, a side job, on the phone, a card on the screen)
  const FREI_T = 180;
  function beginnt(o = {}) {
    if (!o.on || o.era !== 'heute' || !o.kap1 || o.k2 || o.mission) return '';
    if (o.ende || o.sterne > 0 || o.job || o.handy || o.blende) return '';
    if (o.knopf) return 'knopf';
    if (o.scheune && !o.fahrt) return 'scheune';
    if (o.frei >= FREI_T && !o.fahrt) return 'zeit';
    return '';
  }
  // the weather of the chapter: December, snow lying and falling (time/wetter WETTER.preset – this visit only, put back at the end)
  const WETTER = 'schnee';
  // the stranger at the edge of the heath: seen from within this many metres
  const FREMDER_R = 75;
  // the watchers at the bunker: a man sees within r (the dark and ducking shorten it), close by he is sure at once
  const BUNKER = { r: 34, fang: 1.6, aufgeben: 9 };
  // where the van on the Kolonnenweg sees one (its headlights in the snow): ahead, within r
  const WAGEN = { r: 26, v: 5.5 };
  // a point along a polyline [[x, y], …] at s metres (clamped), with its heading (compass rad) and the line's length
  function entlang(pts, s) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i],
        d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s <= L + d || i === pts.length - 1) {
        const k = d > 0 ? Math.max(0, Math.min(1, (s - L) / d)) : 0;
        return {
          x: a[0] + (b[0] - a[0]) * k,
          y: a[1] + (b[1] - a[1]) * k,
          hd: Math.atan2(b[0] - a[0], b[1] - a[1]),
          s: L + d * k,
        };
      }
      L += d;
    }
    const p = pts[0] || [0, 0];
    return { x: p[0], y: p[1], hd: 0, s: 0 };
  }
  const laenge = pts => {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
  };
  // the nearest distance from a point to a polyline, and where on it (s)
  function abstand(pts, x, y) {
    let best = { d: Infinity, s: 0 },
      L = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        len2 = dx * dx + dy * dy,
        k = len2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2)) : 0,
        d = Math.hypot(a[0] + dx * k - x, a[1] + dy * k - y);
      if (d < best.d) best = { d, s: L + Math.sqrt(len2) * k };
      L += Math.sqrt(len2);
    }
    return best;
  }
  // a line of points from whatever GLZONE.weg() gives: [[x, y], …], [{ x, y }, …], { pts | p | points } – or null
  function punkte(w) {
    if (!w) return null;
    const arr = Array.isArray(w) ? w : w.pts || w.p || w.points || null;
    if (!Array.isArray(arr) || arr.length < 2) return null;
    const out = [];
    for (const q of arr) {
      const x = Array.isArray(q) ? q[0] : q && q.x,
        y = Array.isArray(q) ? q[1] : q && q.y;
      if (Number.isFinite(x) && Number.isFinite(y)) out.push([x, y]);
    }
    return out.length >= 2 ? out : null;
  }
  return { tag, DEZ, e0, FREI_T, beginnt, WETTER, FREMDER_R, BUNKER, WAGEN, entlang, laenge, abstand, punkte };
})();
// ===================================================================================================================================
export const GLKNLOGIK = (() => {
  // How one gets into an old car, and what it costs. The wire: a bent coat hanger between the window and its seal onto the lock's rod,
  // then two wires of the ignition lock together – quiet and slow. The window: a wrapped elbow, glass on the seat, then the same wires –
  // quick and loud. Old cars only: a car of today has an immobiliser (required for new cars since the late nineties) – it does not start
  // that way, its alarm goes off instead. t: seconds of holding the action, laut: metres the noise carries (who is nearer hears it).
  const WEGE = {
    draht: { t: 8, laut: 6, name: 'Mit Draht öffnen' },
    scheibe: { t: 1.1, laut: 32, name: 'Scheibe einschlagen' },
  };
  const KURZ = { t: 3.2, name: 'Kurzschließen' }; // after the window: the wires (the wire's way includes them)
  const ALARM = { laut: 60, sek: 9, name: 'Auto aufbrechen' };
  // the paints Timo can spray (sRGB hex) – and the cars' own
  const FARBEN = {
    pastellweiss: { name: 'Weiß', hex: '#e9e6da' },
    dunkelblau: { name: 'Dunkelblau', hex: '#24324c' },
    tannengruen: { name: 'Tannengrün', hex: '#2f4a3b' },
    weinrot: { name: 'Weinrot', hex: '#5c2026' },
    grau: { name: 'Grau', hex: '#6c6f72' },
    anthrazit: { name: 'Anthrazit', hex: '#3b3f44' },
  };
  const LACK = ['dunkelblau', 'tannengruen', 'weinrot', 'grau'];
  // a car's state: { id, typ, alt, farbe, kz, offen, scheibe, gestohlen, bekannt: { farbe, kz } | null, lackiert, pos: [x, y, psi] | null }
  function neu(o = {}) {
    return {
      id: String(o.id || 'auto'),
      typ: String(o.typ || 'wartburg'),
      alt: o.alt !== false,
      farbe: FARBEN[o.farbe] ? o.farbe : 'pastellweiss',
      kz: String(o.kz || ''),
      offen: false,
      scheibe: false,
      gestohlen: false,
      bekannt: null,
      lackiert: 0,
      pos: null,
    };
  }
  // trying a way in: { ok, alarm, t: seconds to hold, laut: metres heard, kurz: seconds of the wires after it, bruch: glass breaks }
  function versuch(car, weg) {
    if (!car) return { ok: false, alarm: false, t: 0, laut: 0, kurz: 0, bruch: false, grund: 'kein' };
    if (car.offen) return { ok: true, alarm: false, t: 0, laut: 0, kurz: 0, bruch: false, grund: 'offen' };
    if (!car.alt)
      return { ok: false, alarm: true, t: 1.2, laut: ALARM.laut, kurz: 0, bruch: false, grund: 'wegfahrsperre' };
    const W = WEGE[weg];
    if (!W) return { ok: false, alarm: false, t: 0, laut: 0, kurz: 0, bruch: false, grund: 'weg' };
    return weg === 'scheibe'
      ? { ok: true, alarm: false, t: W.t, laut: W.laut, kurz: KURZ.t, bruch: true, grund: '' }
      : { ok: true, alarm: false, t: W.t, laut: W.laut, kurz: 0, bruch: false, grund: '' };
  }
  // the way worked: the car is open (and stolen once somebody drives it away)
  function oeffnen(car, weg) {
    const v = versuch(car, weg);
    if (!v.ok) return v;
    car.offen = true;
    if (v.bruch) car.scheibe = true;
    return v;
  }
  // the owner reports it: the police know its colour and plate as they are now
  function anzeige(car) {
    if (!car) return null;
    car.gestohlen = true;
    car.bekannt = { farbe: car.farbe, kz: car.kz };
    return car.bekannt;
  }
  // what of the report still fits the car
  const passt = car => {
    const b = car && car.bekannt;
    return { farbe: !!b && b.farbe === car.farbe, kz: !!b && !!car.kz && b.kz === car.kz };
  };
  // a patrol that sees the car d metres away knows it again: by its colour from afar (by day; at night closer), by its plate close by
  function erkennt(car, d, dark = false) {
    const p = passt(car);
    if (!(d >= 0)) return false;
    return (p.farbe && d <= (dark ? 30 : 70)) || (p.kz && d <= (dark ? 6 : 12));
  }
  // nothing of the report fits any more
  const sauber = car => {
    const p = passt(car);
    return !p.farbe && !p.kz;
  };
  // a new paint: true when it changed
  function lackieren(car, farbe) {
    if (!car || !FARBEN[farbe] || car.farbe === farbe) return false;
    car.farbe = farbe;
    car.lackiert = (car.lackiert || 0) + 1;
    return true;
  }
  // other plates: true when they changed
  function schildern(car, kz) {
    kz = String(kz || '').trim();
    if (!car || !kz || car.kz === kz) return false;
    car.kz = kz;
    return true;
  }
  // a plate as it is written (district – letters – digits): checked loosely, upper case
  const kzOk = kz => /^[A-ZÄÖÜ]{1,3}-[A-Z]{1,2} [1-9][0-9]{0,3}$/.test(String(kz || ''));
  // the saved state of the cars: strict (it must never break the start)
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  function carOk(c) {
    if (!obj(c) || typeof c.id !== 'string' || typeof c.typ !== 'string' || !FARBEN[c.farbe]) return false;
    if (typeof c.kz !== 'string' || typeof c.alt !== 'boolean' || typeof c.offen !== 'boolean') return false;
    if (typeof c.scheibe !== 'boolean' || typeof c.gestohlen !== 'boolean' || !Number.isFinite(c.lackiert))
      return false;
    if (
      c.bekannt !== null &&
      !(obj(c.bekannt) && typeof c.bekannt.farbe === 'string' && typeof c.bekannt.kz === 'string')
    )
      return false;
    if (
      c.pos !== null &&
      !(Array.isArray(c.pos) && c.pos.length === 3 && c.pos.every(q => Number.isFinite(q) && Math.abs(q) < 1e5))
    )
      return false;
    return true;
  }
  const check = v => v === null || (obj(v) && v.v === 1 && obj(v.autos) && Object.values(v.autos).every(carOk));
  return {
    WEGE,
    KURZ,
    ALARM,
    FARBEN,
    LACK,
    neu,
    versuch,
    oeffnen,
    anzeige,
    passt,
    erkennt,
    sauber,
    lackieren,
    schildern,
    kzOk,
    carOk,
    check,
  };
})();
if (typeof window !== 'undefined') {
  window.GLK2DATA = GLK2DATA;
  window.GLK2LOGIK = GLK2LOGIK;
  window.GLKNLOGIK = GLKNLOGIK;
}
