// ===================== feat/grenzland-welt: what the people of the mode say when they notice the player, and what the feed posts – data (GLRXDATA) =====================
// Standard German with the words of the region (Kirmes, Kloß, Rostbratwurst, Grenzer), no dialect spelling, nothing mean; satire, nobody
// real (the handles and names are invented). Every spoken line is a fixed string: grenzland/gl_reaktion.js says it with
// STIMME.say('gl_' + who, text) – `stimmen` records each one (GLREAKTION.linien()).
//   SAGT      what a person says when the player stops by or stares (blick), about the clothes (kleid.<kind>), the vehicle (fz.<kind>),
//             what he just did (tat), when he is wanted (gesucht) – the same lines for every speaker
//   WAHL      the four answers by a named person: the player's line and the person's answer (grüßen, sprüche, beruhigen, provozieren),
//             per person a „remembers“ line for the next time
//   POST      the feed: captions by what happened ({ort}: the place, {tag}: its hashtag), who posts, the comments that come in
export const GLRXDATA = (() => {
  const SAGT = {
    blick: [
      'Ist was?',
      'Kennen wir uns?',
      'Du guckst, als hättest du noch nie einen Menschen gesehen.',
      'Wenn du was suchst: Die Kirmes ist erst nächste Woche.',
      'Na? Auch auf der Suche nach Rostbratwurst?',
    ],
    kleid: {
      karo: ['Schönes Karohemd. Holzfäller oder Tischdecke?', 'Rot kariert – wie beim Schützenfest.'],
      dunkel: ['Ganz in Dunkel? Gehst du zu einer Beerdigung oder zu einem Einbruch?', 'Schicke Jacke. Neu?'],
      warn: [
        'Ah, der Forst! Ist wieder was mit dem Borkenkäfer?',
        'In Orange sieht man dich bis Hildburghausen.',
        'Kommt jetzt endlich jemand wegen dem Baum am Friedhof?',
      ],
      helm: ['Den Helm kannst du ruhig absetzen, hier fährt keiner schnell.'],
    },
    fz: {
      moped: ['Eine Simson! Die läuft ja noch.', 'So ein Moped hatte mein Vater auch. Genauso laut.'],
      auto: ['Schönes Auto. Gehört das dir?'],
      traktor: ['Mit dem Traktor durchs Dorf, wie es sich gehört.'],
    },
    tat: [
      'Spinnst du?',
      'Das hab ich gefilmt, nur dass du es weißt.',
      'So was gab es früher nicht. Früher gab es gar nichts.',
      'Ich sag das deiner Mutter.',
    ],
    gesucht: ['Dich suchen die doch. Das kam gerade im Radio.', 'Die Polizei war schon zweimal hier. Wegen dir, oder?'],
  };
  // the four answers: [label, the player's line, the person's answer]; sprueche once remembered changes the greeting next time
  const WAHL = {
    titel: 'Was sagst du?',
    gruessen: {
      t: 'Grüßen',
      ich: { m: 'Na, alles gut?', f: 'Hallo! Alles gut bei dir?' },
      er: [
        'Muss ja. Und selbst?',
        'Geht so. Am Sonntag gibt es Klöße, dann wird es besser.',
        'Na, ihr zwei. Schönen Abend noch!',
      ],
      sauer: 'Ach, du schon wieder. Der mit den Sprüchen.',
    },
    sprueche: {
      t: 'Sprüche klopfen',
      ich: { m: 'Schicke Jacke. Hat die deine Oma gestrickt?', f: 'Schicke Frisur. War der Friseur krank?' },
      er: [
        'Besser als dein Hemd. Das sieht aus wie eine Tischdecke.',
        'Sagt die Richtige. Oder der Richtige. Egal.',
        'Ganz schön frech für einen, der hier nicht mal den Kirmesbaum aufstellt.',
      ],
    },
    beruhigen: {
      t: 'Beruhigen',
      ich: { m: 'Alles in Ordnung. Ich bin gleich wieder weg.', f: 'Alles gut, wirklich. Ich bin gleich wieder weg.' },
      er: ['Na gut. Ich hab nichts gesehen.', 'Schon gut. Aber keinen Ärger hier, ja?'],
    },
    provozieren: {
      t: 'Provozieren',
      ich: { m: 'Was glotzt du denn so?', f: 'Hast du ein Problem?' },
      er: ['Na warte. Ich ruf die Polizei.', 'So nicht, mein Freund. Ich telefoniere jetzt.'],
      ruhig: 'Mit dir rede ich nicht mehr.',
    },
  };
  // the feed: captions by kind ({ort} the place's name, {tag} a hashtag), the big ones as LIVE
  const POST = {
    tat: [
      'Was ist denn in {ort} los?? 😳 #{tag}',
      'Hab grad was gesehen in {ort}. Keine Ahnung was, aber gefilmt. #{tag}',
      'Und dann sagen sie, auf dem Land passiert nix. #{tag}',
    ],
    boeller: [
      'Knall in {ort}. Im September. Für manche ist das ganze Jahr Silvester. #{tag}',
      'Mein Hund liegt unterm Sofa. Danke, {ort}. #{tag}',
    ],
    crash: [
      'Das hat gekracht in {ort}. Allen gut? #{tag}',
      'Blech gegen Wirklichkeit in {ort}. Die Wirklichkeit hat gewonnen. #{tag}',
    ],
    jagd: [
      'Polizei mit Blaulicht durch {ort} – und vorneweg einer, der es eilig hat 🚨 #{tag}',
      'Verfolgungsjagd in {ort}?! Ich steh hier mit meinem Einkauf. #{tag}',
      'Polizei auf der L 1625 … und keiner weiß, warum 🚨 #{tag}',
    ],
    markt: ['Mit Vollgas über den Markt in {ort}. Die Tauben sind jetzt in Suhl. #{tag}'],
    raserei: ['Tempo 30 ist in {ort} eher so eine Empfehlung, oder? #{tag}'],
    sperre: ['Einer ist durch die Polizeisperre bei {ort}! Ich steh hier mit Rostbratwurst und Handy. #{tag}'],
    live: [
      'LIVE: Großeinsatz bei {ort}! Hubschrauber, Blaulicht, alles. Bleibt dran! #{tag}',
      'LIVE: Die Polizei sucht in {ort} jemanden. Wir suchen mit. Von der Couch aus. #{tag}',
    ],
  };
  const TAG = {
    Ratscher: 'Ratscher',
    Schleusingen: 'Schleusingen',
    Talsperre: 'TalsperreRatscher',
    Klinge: 'Klinge',
    '': 'Südthüringen',
  };
  const WER = [
    'ratscher_rudi',
    'Mandy.aus.Hinternah',
    'Kloßkönigin_94',
    'Schleusetal_Steffi',
    'Bratwurstbaron',
    'Grenzgänger_86',
    'feldweg_frank',
    'Kirmesbursche_Kai',
  ];
  const LIVE_WER = 'suedthueringen.live';
  // the region's blue-light page (invented): the police's description as a call for witnesses – {bild}: GLFAHNDUNG.beschreibung()
  const BLAULICHT = 'blaulicht_schleusetal';
  const FAHNDUNG = '🚨 Fahndung bei {ort}: {bild} Hinweise bitte an die Polizei. Teilen erwünscht! #{tag} #Fahndung';
  const KOMMENTAR = [
    ['Uwe_S', 'Wer war das?'],
    ['Heike_K', 'Ich hab den Knall bis Hinternah gehört.'],
    ['Manni63', 'Mein Schwager kennt den.'],
    ['Ingrid', 'Früher gab es so was nicht.'],
    ['Jens_vom_Berg', 'Erst mal Bratwurst.'],
    ['Katrin.T', 'Polizei schon da?'],
    ['Sandro', 'Hochkant filmen, Mandy!'],
    ['Wolfgang', 'Ist das nicht der vom Garten bei Ratscher?'],
    ['Petra_B', 'Fake. Bei uns passiert nie was.'],
    ['Grenzer_a.D.', 'Damals hätte es das nicht gegeben. Oder doch. Egal.'],
  ];
  return { SAGT, WAHL, POST, TAG, WER, LIVE_WER, BLAULICHT, FAHNDUNG, KOMMENTAR };
})();
