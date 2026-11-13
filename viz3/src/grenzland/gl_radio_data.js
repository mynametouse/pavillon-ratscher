// ===================== feat/grenzland: the radio's and the phone's data and the programme's rules (GLRDATA) =====================
// Falko, 13.11.2026: „… und auch verschiedene Radiosender eingestellt werden können. Ähnlich wie bei GTA.“ Pure data and pure functions
// (no scene, no sound – unit tests in viz3/test/unit/grenzland_radio.test.mjs):
//   SENDER.heute / SENDER['1989']   the dial: six invented stations today, three in the flashback to 10 November 1989 – each with a
//                                    name, a frequency, a presenter (a voice for audio/stimme.js), a claim, its texts and a format clock
//   PROG.neu(id, seed) / PROG.next(st, ctx)   the programme: what a station sends next – music, the presenter, an ident, adverts of
//                                    invented firms, the news with the weather of the game, traffic, a feature in parts, and before
//                                    anything else the police report of the player's own deeds (ctx.taten) and the search (ctx.sterne)
//   wetter(w, era) · uhr(min) · polizei(…)    the sentences made from the game's state
//   CHAT, CHATEV, FEED, FEEDEV, BANK, NOTIZ   the phone: the village chat „Ratscher aktuell“ and what it says when something happens,
//                                    the regional feed, the bank's name, notes with their sources
// Everything spoken is our own text; no real station, firm or living person appears (Hubert and Ronald never). What the stations of
// 1989 report is what was really reported on Friday, 10 November 1989 (sources: QUELLEN89) – in our words; the music is our own.
import { GLDATA } from './gl_data.js';
export const GLRDATA = (() => {
  const R0 = GLDATA.RADIO;
  // ---- sources for the news of 10 November 1989 (read 13.11.2026) ----
  const QUELLEN89 = [
    [
      'Bundesregierung: Tag eins nach dem Mauerfall (Aufruf des Ministerrats, Begrüßungsgeld)',
      'https://www.bundesregierung.de/breg-de/schwerpunkte/deutsche-einheit/tag-eins-nach-dem-mauerfall-403854',
    ],
    [
      'bpb, Deutschland-Chronik: 10. November 1989 (Kundgebung am Rathaus Schöneberg)',
      'https://www.bpb.de/themen/zeit-kulturgeschichte/deutschland-chronik/132366/10-november-1989/',
    ],
    [
      'bpb, Deutschland Archiv: Grenzübertritt am 10. November (Visum im Ausweis, Schlangen bei der Volkspolizei)',
      'https://www.bpb.de/themen/deutschlandarchiv/302085/3-grenzuebertritt-am-10-november/',
    ],
    [
      'taz: Der Mauerfall und die DDR-Provinz (am 10.11. über Eisfeld–Rottenbach nach Coburg)',
      'https://taz.de/Der-Mauerfall-und-die-DDR-Provinz/!5153067/',
    ],
    ['taz: 11. November 1989 – Viel Verkehr (Kundgebung im Lustgarten)', 'https://taz.de/Viel-Verkehr/!1534259/'],
    [
      'Bundesarchiv: Grenzübergangsstellen für den Bezirk Suhl (Eisfeld/Rottenbach, Meiningen/Eußenhausen)',
      'https://www.bundesarchiv.de/themen-entdecken/online-entdecken/themenbeitraege/grenzuebergangsstellen-fuer-den-bezirk-suhl/',
    ],
  ];
  // ---- the stations ----
  // uhr: the format clock – what follows what (musik, mod: the presenter, kenn: ident and claim, werb: advert, news, verkehr, feat: the
  // feature in parts, gruss: greetings, anruf: a listener on the phone); fern: reception ('sued': comes in only in the south of the map,
  // 'west': always with noise); mast: the invented transmitter [x, y, reach in m] (ton-radio: reception falls off far from it);
  // anrufe: the listeners' calls – [who, text] each, who '' the presenter, else a caller of ANRUFER (fixed strings, recorded by ton-stimmen)
  const SENDER = {
    heute: [
      {
        id: 'grenzland',
        name: R0.name,
        freq: R0.freq,
        mhz: 89.1,
        art: 'Lokalfunk, Nachrichten, Satire',
        wer: { name: 'Matze', g: 'm', age: 45 },
        mast: [-1250, 1500, 9000],
        uhr: [
          'kenn',
          'news',
          'musik',
          'mod',
          'werb',
          'musik',
          'feat',
          'musik',
          'verkehr',
          'werb',
          'musik',
          'anruf',
          'musik',
          'mod',
        ],
        anrufe: [
          [
            ['', 'Wir haben einen Anrufer in der Leitung. Hallo, Sie sind auf Sendung.'],
            ['horst', 'Ja, hallo Matze. Ich wollte nur sagen: Der Mähdrescher auf der Landstraße, das war ich.'],
            ['', 'Hinter Ihnen standen zwanzig Autos.'],
            ['horst', 'Einundzwanzig. Ich habe gezählt. Schönen Gruß an alle.'],
            ['', 'Danke, Horst. Das war Verkehrsfunk aus erster Hand.'],
          ],
          [
            ['', 'Nächster Anruf. Guten Tag, was gibt es?'],
            ['brigitte', 'Ich habe heute Steinpilze gefunden. Ich sage aber nicht, wo.'],
            ['', 'Dann sagen Sie uns wenigstens, wie viele.'],
            ['brigitte', 'Genug, dass ich anrufe. Zu wenig, dass ich teile.'],
            ['', 'Ehrlich ist sie. Das schätzen wir hier.'],
          ],
          [
            ['', 'Wir haben noch eine Hörerin. Hallo?'],
            ['sabine', 'Hallo Matze, kannst du mal was spielen, wo kein Akkordeon drin ist?'],
            ['', 'Wir prüfen das. Ich höre gerade: Die Technik lacht.'],
            ['sabine', 'Dann eben mit Akkordeon. Aber leise.'],
            ['', 'Akkordeon und leise – wir versuchen es.'],
          ],
        ],
        claims: R0.claims,
        mod: [
          'Hier ist Matze am Mikrofon. Die Kollegin ist beim Zahnarzt, der Praktikant beim Bäcker – ich bin also die Redaktion.',
          'Schreiben Sie uns, was Sie bewegt. Wir lesen alles vor. Auch die Rechtschreibfehler.',
          'Gleich mehr Musik. Vorher atmen wir einmal gemeinsam durch. So. Das war die Sendung „Gesundheit“.',
          'Der Hörer der Woche hat angerufen und gefragt, ob wir auch was anderes spielen können. Nein.',
          'Unser Sendegebiet reicht vom Rennsteig bis zur Landesgrenze. Dahinter rauscht es. Wir nennen das Bayern.',
          'Wenn Sie uns im Auto hören: Augen auf die Straße. Wenn Sie uns am Handy hören: Respekt, hier ist ja kaum Netz.',
        ],
        news: R0.news.concat([
          'Der Landkreis teilt mit, dass das Formular zur Beantragung von Formularen ab sofort auch digital ausgedruckt werden kann.',
          'In Schleusingen wurde ein Parkplatz eröffnet. Er ersetzt den Parkplatz, der für die Eröffnungsfeier gesperrt werden musste.',
          'Die Pilzsaison beginnt. Die Fundstellen bleiben wie jedes Jahr Familiengeheimnis – bis ins dritte Glied.',
          'Ein Wanderer hat am Rennsteig ein Mobilfunknetz gesichtet. Es soll scheu gewesen sein und ist sofort wieder verschwunden.',
          'Die Feuerwehr Ratscher meldet zwei Einsätze: eine Katze auf dem Baum und einen Feuerwehrmann, der sie holen wollte.',
          'Der Stausee hat Badewetter gemeldet. Der Stausee selbst hält sich mit Kommentaren zurück.',
        ]),
        verkehr: [
          'Verkehr: Auf der Landstraße zwischen Ratscher und Schleusingen fährt ein Mähdrescher. Planen Sie großzügig. Oder Urlaub.',
          'Verkehr: Der Bus nach Schleusingen ist pünktlich abgefahren. Wer ihn verpasst hat: Der nächste fährt. Irgendwann.',
          'Verkehr: Blitzer am Ortseingang. Er wurde gegrüßt, er hat nicht zurückgegrüßt.',
          'Verkehr: Auf der Autobahn bei Schleusingen freie Fahrt. Auf dem Feldweg an der Klinge Gegenverkehr mit Anhänger.',
          'Verkehr: Am Staudamm parken Mopeds in zweiter Reihe. In erster Reihe steht der Grill.',
        ],
        werb: [
          'Werbung: Spedition Krähwinkel. Wir fahren, was Sie uns geben. Wir fragen nicht, was drin ist. Krähwinkel – diskret seit gestern.',
          'Werbung: Fahrschule Schleichgang in Schleusingen. Bei uns lernen Sie Anfahren am Berg. Und zwar nur das. Den ganzen Kurs.',
          'Werbung: Heimwerkermarkt Dübelglück. Diese Woche im Angebot: der Dübel. Nächste Woche: das Loch dazu.',
          'Werbung: Bratwurstbude „Zur heißen Zange“ am Anger. Senf gibt es dazu. Diskussionen über Ketchup nicht.',
          'Werbung: Kaffeefahrt ins Fränkische mit Sparfuchs-Reisen. Heizdecke inklusive, Rückfahrt auf Anfrage.',
          'Werbung: Zweirad-Schrauber Kolbe. Zweitakter aller Art. Wir kriegen ihn wieder an. Aus kriegen Sie ihn dann selber.',
        ],
      },
      {
        id: 'kirmes',
        name: 'Kirmeswelle',
        freq: '92,4',
        mhz: 92.4,
        art: 'Schlager und Volksmusik',
        wer: { name: 'Gundula', g: 'f', age: 58 },
        mast: [2600, 5200, 11000],
        uhr: ['kenn', 'musik', 'mod', 'musik', 'werb', 'musik', 'gruss', 'musik', 'anruf', 'musik', 'news'],
        anrufe: [
          [
            ['', 'Wir haben einen lieben Anruf. Hallo, wer ist dran?'],
            [
              'erwin',
              'Hier ist der Erwin aus dem Nachbardorf. Ich wollte meine Frau grüßen. Wir sind heute fünfzig Jahre verheiratet.',
            ],
            ['', 'Herzlichen Glückwunsch! Was ist das Geheimnis?'],
            ['erwin', 'Sie redet, ich nicke. Und beim Walzer führe ich. Ab und zu.'],
            ['', 'Für euch beide spielen wir jetzt was zum Schunkeln.'],
          ],
          [
            ['', 'Am Telefon ist die Renate. Hallo Renate!'],
            [
              'renate',
              'Hallo Gundula! Ich backe gerade Kuchen für die Kirmes und brauche Musik, sonst geht der Teig nicht.',
            ],
            ['', 'Was für ein Kuchen wird das denn?'],
            ['renate', 'Streuselkuchen. Drei Bleche. Der Teig hört gern Polka.'],
            ['', 'Dann bekommt der Teig jetzt seine Polka.'],
          ],
        ],
        claims: [
          'Kirmeswelle – Schlager und Volksmusik, bis das Zelt wackelt.',
          'Die Kirmeswelle. Wo jeder Tag ein Sonntag ist und jeder Sonntag Frühschoppen.',
          '92,4 – die Kirmeswelle. Schunkeln auf eigene Gefahr.',
        ],
        mod: [
          'Hier ist eure Gundula. Das war wieder ein Lied zum Mitsingen. Wer den Text nicht kann, summt. Das zählt auch.',
          'Jetzt haken wir uns alle unter. Wer allein im Auto sitzt, hakt sich bitte beim Lenkrad ein.',
          'Die nächste Kirmes ist immer die schönste. Die letzte war auch die schönste. Das ist das Schöne an Kirmes.',
          'Ein Hörer schreibt: „Gundula, spiel mal was Flottes.“ Mach ich. Ist aber wieder eine Polka.',
          'Bei uns ist die Welt noch in Ordnung. Zumindest zwischen zwei Werbeblöcken.',
        ],
        gruss: [
          'Grüße: Die Heike grüßt alle, die Kürbis mögen. Sie hätte da noch drei.',
          'Grüße: Der Kegelverein grüßt seinen Kassenwart. Er soll sich bitte melden. Mit der Kasse.',
          'Grüße: Der Manfred grüßt die Feuerwehr. Übung ist Samstag um neun. Wer nicht kommt, bringt Kuchen.',
          'Grüße: Die Ingrid grüßt den, der die Mülltonne falsch herum hingestellt hat. Sie weiß, wer es war.',
        ],
        news: [
          'Kurz gemeldet: Die Kirmesgesellschaft sucht noch einen Baum. Der letzte war zu kurz, der davor stand schief.',
          'Kurz gemeldet: Beim Preiskegeln in Ratscher fielen alle Neune. Zweimal. Der Sieger wird noch auf Hilfsmittel untersucht.',
          'Kurz gemeldet: Der Gesangverein probt wieder. Die Nachbarn haben das bestätigt.',
        ],
        werb: [
          'Werbung: Festzelt-Verleih Wackelkontakt. Unsere Zelte stehen. Meistens bis Sonntag.',
          'Werbung: Trachtenmoden Zwirn und Söhne. Die Lederhose, die mitwächst. In eine Richtung.',
          'Werbung: Das Kloßmehl „Sonntagsruh“. Der Kloß gelingt immer. Sagt die Packung.',
        ],
      },
      {
        id: 'klassik',
        name: 'Klassik am Kamm',
        freq: '95,7',
        mhz: 95.7,
        art: 'Klassik, gemeinfreie Aufnahmen',
        wer: { name: 'Frau Dr. Sommerlatte', g: 'f', age: 61 },
        mast: [-3800, 2600, 12000],
        uhr: ['kenn', 'musik', 'mod', 'musik', 'mod', 'musik', 'news'],
        claims: [
          'Klassik am Kamm. Musik, die schon alt war, als der Rennsteig noch jung war.',
          'Sie hören Klassik am Kamm. Bitte nicht klatschen, wir sind im Radio.',
        ],
        mod: [
          'Sie hörten ein Werk, dessen Urheberrecht erloschen ist. Der Zauber nicht.',
          'Erik Satie schrieb über seine Stücke Anweisungen wie „wie eine Nachtigall mit Zahnschmerzen“. Wir spielen es trotzdem gern.',
          'Scott Joplin nannte sich selbst den König des Ragtime. Er hatte recht, was selten vorkommt bei Königen.',
          'Bleiben Sie ruhig sitzen. Wer gerade fährt: bitte ebenfalls. Aber lenken Sie.',
          'Zwischen den Sätzen wird nicht gehustet. Im Radio dürfen Sie. Wir hören es ja nicht.',
        ],
        news: [
          'Aus der Kultur: Das Museum in Kloster Veßra zeigt weiterhin Häuser. Von innen und von außen.',
          'Aus der Kultur: Das Schloss in Schleusingen lädt zum Konzert. Die Akustik ist historisch, die Stühle auch.',
        ],
        werb: [],
      },
      {
        id: 'zweitakt',
        name: 'Radio Zweitakt',
        freq: '97,6',
        mhz: 97.6,
        art: 'Rock und Punk',
        wer: { name: 'Ecki', g: 'm', age: 52 },
        mast: [3200, -1800, 10000],
        uhr: ['kenn', 'musik', 'musik', 'mod', 'musik', 'werb', 'musik', 'news'],
        claims: [
          'Radio Zweitakt. Rock mit Gemisch eins zu fünfzig.',
          'Radio Zweitakt – laut, ehrlich, leicht bläulicher Rauch.',
          '97,6. Wer leiser dreht, ist selber schuld.',
        ],
        mod: [
          'Ecki hier. Das eben war handgemacht. Drei Akkorde, ein Verstärker, keine Ausreden.',
          'Früher haben wir die Gitarren selbst gebaut. Aus dem, was da war. Geklungen hat es wie das, was da war.',
          'Mitsingen ist erlaubt. Den Text kennt ihr sowieso. Jeder einen anderen.',
          'Wer bei dem Solo nicht Luftgitarre spielt, hat beide Hände am Lenker. Sehr vernünftig.',
          'Nächstes Stück. Aufdrehen, Fenster runter, Dorf beschallen. Aber nach zweiundzwanzig Uhr nur noch Balladen.',
        ],
        news: [
          'Meldung für Schrauber: Der Teilemarkt an der Feldscheune findet statt. Gesucht wird wie immer derselbe Vergaser.',
          'Meldung für Schrauber: Die Moped-Clique trifft sich am Staudamm. Wer nicht anspringt, wird geschoben.',
        ],
        werb: [
          'Werbung: Zweirad-Schrauber Kolbe. Kolbenfresser? Kolbe frisst mit. Termine nach Gehör.',
          'Werbung: Tankstelle am Ortsrand. Gemisch gibt es noch aus der Kanne. Der Chef mischt nach Gefühl. Er hat viel Gefühl.',
          'Werbung: Lederjacken von Speckschwarte. Hält dreißig Jahre. Passt die ersten fünf.',
        ],
      },
      {
        id: 'blasius',
        name: 'Radio Blasius',
        freq: '99,9',
        mhz: 99.9,
        art: 'Blasmusik aus Oberfranken',
        fern: 'sued',
        wer: { name: 'Schorsch', g: 'm', age: 63 },
        uhr: ['kenn', 'musik', 'werb', 'musik', 'mod', 'musik', 'news', 'werb'],
        claims: [
          'Radio Blasius. Blasmusik von drüben – wo drüben jetzt hüben ist.',
          'Radio Blasius aus Oberfranken. Bayern ist das Bundesland. Franken sind wir.',
          '99,9 – Radio Blasius. Mehr Blech geht nur am Stau.',
        ],
        mod: [
          'Grüß Gott nach Thüringen. Wir wissen, dass ihr zuhört. Man sieht es an den Kennzeichen vor unserem Getränkemarkt.',
          'Das war ein Marsch. Der nächste ist auch ein Marsch. Dazwischen wird kurz Luft geholt – die Tuba braucht das.',
          'Bei uns sagt man „Bratwurst“. Bei euch sagt man auch „Bratwurst“. Gemeint ist etwas völlig anderes. Darüber reden wir nicht.',
          'Der Schorsch am Mikrofon. Seit dreißig Jahren. Abgelöst werde ich, sobald einer den Sender findet.',
        ],
        news: [
          'Aus Franken: Die Kirchweih findet statt. Welche, ist egal – es ist immer irgendwo eine.',
          'Aus Franken: Der Grenzverkehr nach Thüringen läuft flüssig. Flüssiger als früher. Deutlich.',
        ],
        werb: [
          'Werbung: Brauerei Erfundenbräu. Diese Brauerei gibt es nicht. Das Bier leider auch nicht. Prost trotzdem.',
          'Werbung: Metzgerei Wurstkessel. Der Leberkäs der Woche ist derselbe wie letzte Woche. Er ist noch warm.',
          'Werbung: Möbelhaus Eckbank. Wir haben auch andere Möbel. Hinten. Fragen Sie nach.',
          'Werbung: Blasinstrumente Ventil und Zug. Tuba auf Raten – Sie zahlen ab, die Nachbarn ziehen aus.',
        ],
      },
      {
        // ton-radio, 13.11.2026: the new station of Rap & Elektro. Nele, 27, from Schleusingen, studies media technology in Ilmenau
        // and does the night show from a broom cupboard over a drinks market – dry, fond of the region, laughs about the dead spots,
        // never about the people
        id: 'funkloch',
        name: 'Funkloch FM',
        freq: '101,3',
        mhz: 101.3,
        art: 'Rap und Elektro',
        wer: { name: 'Nele', g: 'f', age: 27 },
        mast: [-2400, 3900, 7000],
        uhr: [
          'kenn',
          'musik',
          'mod',
          'musik',
          'werb',
          'musik',
          'anruf',
          'musik',
          'news',
          'musik',
          'mod',
          'musik',
          'gruss',
          'musik',
          'verkehr',
        ],
        claims: [
          'Funkloch FM. Empfang ist Glückssache, der Beat nicht.',
          'Funkloch FM auf hunderteins drei. Wenn wir weg sind, seid ihr im Wald.',
          '101,3 – Funkloch FM. Rap und Elektro zwischen Rennsteig und Schleuse.',
          'Funkloch FM. Kein Netz, aber Bass.',
        ],
        mod: [
          'Nele hier. Wer uns gerade klar hört, steht vermutlich auf einem Hügel. Bleibt da.',
          'Ich sitze im Studio über dem Getränkemarkt. Das Studio ist eine Abstellkammer. Aber eine sehr professionelle.',
          'Kurzer Hinweis an alle mit Moped im Tal: Wenn ich gleich weg bin, liegt das nicht an euch. Doch, ein bisschen schon.',
          'Die Bässe in diesem Track sind so tief, die findet man nur mit Metalldetektor.',
          'Mein Opa sagt, früher gab es hier drei Sender. Heute gibt es mehr Sender und weniger Empfang. Fortschritt.',
          'Wer bei dem Beat nicht nickt, hat einen steifen Nacken. Oder den Fahrlehrer daneben.',
          'Funkloch FM ist der einzige Sender, der sein Sendegebiet nach Gefühl festlegt.',
        ],
        news: [
          'Funkloch-News: Am Kamm wurde ein neuer Funkmast genehmigt. Gebaut wird, sobald jemand das Formular empfängt.',
          'Funkloch-News: Der Jugendclub sucht einen neuen Namen. Vorschläge bitte nicht per Mail. Die kommt hier nicht an.',
          'Funkloch-News: Beim Open Air am Stausee war es laut. Die Enten haben sich beschwert, die Nachbarn haben mitgetanzt.',
        ],
        verkehr: [
          'Verkehr: Auf der Landstraße Richtung Suhl ein Traktor. Er fährt achtzehn und hat Vorfahrt im Herzen.',
          'Verkehr: Im Wald an der Klinge kein Empfang. Wenn ihr das hier hört, seid ihr schon draußen. Glückwunsch.',
        ],
        werb: [
          'Werbung: Handyladen Vollbalken in Schleusingen. Unsere Handys zeigen fünf Balken. Die Balken sind aufgeklebt, das Handy ist echt.',
          'Werbung: Fahrradwerkstatt Kettenblatt. Wir reparieren alles. Außer bergauf.',
          'Werbung: Tanzschule Schrittfolge. Jetzt neu: Breakdance ab sechzig. Der Boden ist gepolstert.',
        ],
        gruss: [
          'Shoutout an die Clique am Staudamm. Ihr seid zu laut, aber im Takt.',
          'Shoutout an den, der in Ratscher jeden Abend in der Garage Bass übt. Wir hören dich. Alle hören dich.',
        ],
        anrufe: [
          [
            ['', 'Wir haben einen Anrufer. Du bist live auf Funkloch FM, wer ist da?'],
            ['jonas', 'Hier ist Jonas aus Hinternah. Ich wollte nur wissen, ob man mich hört.'],
            ['', 'Wir hören dich. Zur Hälfte. Wo stehst du?'],
            ['jonas', 'Auf dem Hochsitz am Waldrand. Unten war kein Netz.'],
            ['', 'Bitte vorsichtig wieder runter. Der nächste Track ist für dich.'],
          ],
          [
            ['', 'Nächster Anruf. Hallo, du bist auf Sendung.'],
            ['aylin', 'Hi Nele! Ich will mir was wünschen. Irgendwas, wozu man Holz hacken kann.'],
            ['', 'Holz hacken zu Elektro. Ein Trend, den ich unterstütze.'],
            ['aylin', 'Der Ofen geht nur mit Bass an.'],
            ['', 'Kommt sofort. Achtet auf die Finger.'],
          ],
          [
            ['', 'Noch jemand in der Leitung. Hallo?'],
            ['klaus', 'Ja, hier ist Klaus. Ich bin aus Versehen bei Ihnen gelandet.'],
            ['', 'Und? Bleiben Sie?'],
            ['klaus', 'Das Wummern ist gar nicht so schlecht. Mein Hund tanzt.'],
            ['', 'Grüße an den Hund. Der hat Geschmack.'],
          ],
        ],
      },
      {
        id: 'neon',
        name: 'Neonfunk',
        freq: '104,2',
        mhz: 104.2,
        art: 'Synthpop und New Wave',
        wer: { name: 'Synthia', g: 'f', age: 31 },
        mast: [800, 6500, 12000],
        uhr: ['kenn', 'musik', 'mod', 'musik', 'musik', 'werb', 'musik', 'news'],
        claims: [
          'Neonfunk. Die Achtziger hören nicht auf.',
          'Neonfunk – Musik aus Strom. Hundert Prozent Synthese, null Prozent Gitarrenkoffer.',
          '104,2. Bitte Kassette einlegen und Aufnahme drücken.',
        ],
        mod: [
          'Synthia hier. Das Stück eben wurde komplett von einer Maschine gespielt. Die Maschine lässt grüßen.',
          'Wer jetzt Schulterpolster trägt: Bitte beim Einsteigen auf den Türrahmen achten.',
          'Diese Sendung wird auf Magnetband aufgezeichnet. Wer zurückspulen will, nimmt bitte einen Bleistift.',
          'Als nächstes ein Titel, der nach Zukunft klingt. Nach der Zukunft von damals. Die war schöner.',
          'Mein Rechner hat vierundsechzig Kilobyte. Mehr braucht kein Mensch. Dieses Stück brauchte zweiundsechzig.',
        ],
        news: [
          'Technikmeldung: Im Tal wurde schnelles Internet verlegt. Es liegt jetzt dort. Angeschlossen wird später.',
          'Technikmeldung: Ein Leser fragt, ob künstliche Intelligenz den Dorfchat ersetzen kann. Antwort: Sie weiß weniger.',
        ],
        werb: [
          'Werbung: Elektro-Eck Kurzschluss. Wir reparieren Kassettenrekorder. Bandsalat nehmen wir in Zahlung.',
          'Werbung: Videothek Rückspultaste. Wir haben wieder geöffnet. Keiner weiß, warum.',
          'Werbung: Computerkurs für Einsteiger an der alten Schule. Lektion eins: Wo ist der Schalter.',
        ],
      },
    ],
    1989: [
      {
        id: 'republik',
        name: 'Radio Republik I',
        freq: '90,2',
        mhz: 90.2,
        art: 'Nachrichten, Marsch- und Tanzmusik',
        wer: { name: 'Der Sprecher', g: 'm', age: 52 },
        uhr: ['kenn', 'news', 'musik', 'mod', 'musik', 'news', 'musik'],
        claims: ['Hier ist Radio Republik, erstes Programm.', 'Sie hören Radio Republik I auf Ultrakurzwelle.'],
        mod: [
          'Sie hörten Tanzmusik. Es folgt Marschmusik. Danach die Nachrichten.',
          'Die Wasserstände und Tauchtiefen hören Sie im Anschluss. Heute hört allerdings kaum jemand hin.',
          'Wegen der aktuellen Ereignisse ändert sich unser Programm. Wie, das erfahren wir selbst erst aus den Nachrichten.',
          'Unser Musikredakteur ist kurz nach draußen gegangen. Er wollte sich etwas ansehen. Wir spielen so lange weiter.',
        ],
        // what was really reported on Friday, 10 November 1989 (QUELLEN89), in our words
        news: [
          'Berlin. Seit gestern Abend gilt die neue Reiseregelung des Ministerrates: Privatreisen nach dem Ausland können ohne Vorliegen von Voraussetzungen beantragt werden. Die Genehmigungen werden kurzfristig erteilt.',
          'Zuständig sind die Abteilungen Pass- und Meldewesen der Volkspolizeikreisämter. Ständige Ausreisen können über alle Grenzübergangsstellen der DDR zur BRD und nach Berlin West erfolgen.',
          'Vor den Dienststellen der Volkspolizei warten seit dem frühen Morgen viele Bürger auf ihr Visum. An den Grenzübergangsstellen herrscht starker Reiseverkehr. Im Bezirk Suhl sind das die Übergänge Eisfeld und Meiningen.',
          'Der Minister des Innern hat einen Aufruf des Ministerrates verlesen: Die Bürger können sich darauf verlassen, dass die neuen Reisemöglichkeiten von Dauer sind. Er bittet, keine übereilten Entschlüsse zu treffen.',
          'Berlin. Die zehnte Tagung des Zentralkomitees der SED ist beendet. Sie hat ein Aktionsprogramm beschlossen. Am Abend findet im Berliner Lustgarten eine Kundgebung statt.',
          'Sofia. Das Zentralkomitee der Bulgarischen Kommunistischen Partei hat Todor Shiwkow als Generalsekretär abgelöst. Nachfolger ist Petar Mladenow.',
        ],
        werb: [],
      },
      {
        id: 'impuls',
        name: 'Jugendwelle Impuls',
        freq: '93,8',
        mhz: 93.8,
        art: 'Jugendradio, Rock und Elektronik',
        wer: { name: 'Kati', g: 'f', age: 24 },
        uhr: ['kenn', 'musik', 'mod', 'musik', 'news', 'musik', 'mod'],
        claims: ['Jugendwelle Impuls. Wir senden weiter.', 'Impuls – das Jugendradio. Heute ohne Manuskript.'],
        mod: [
          'Hier ist Kati. Die halbe Redaktion steht in der Schlange vor der Meldestelle. Die andere Hälfte bin ich.',
          'Wer rüberfährt: Schaut es euch an. Und dann kommt wieder. Wir senden sonst nur noch für die Wachhabenden.',
          'Ihr ruft an und fragt, ob das alles stimmt. Ich lese hier dieselben Meldungen wie ihr. Ich glaube: ja.',
          'Seit gestern Abend ist kein Zettel auf meinem Tisch älter als eine Stunde. So macht Radio Spaß.',
          'Musikwünsche heute bitte nicht per Post. Die Post hat gerade anderes zu tun.',
        ],
        news: [
          'Die Grenzübergänge sind offen. Wer ein Visum will, bekommt es bei der Volkspolizei in den Ausweis gestempelt. Bringt Geduld mit und was Warmes zu trinken.',
          'Aus dem Bezirk Suhl hören wir: Vor dem Übergang Eisfeld stehen die Autos in langer Reihe Richtung Coburg. Zweitakter an Zweitakter.',
          'In Berlin tanzen Leute auf der Mauer am Brandenburger Tor. Das ist keine Ente. Wir haben nachgefragt.',
          'Heute Abend Kundgebung im Lustgarten in Berlin. Und morgen ist Sonnabend. Was ihr damit anfangt, wissen wir auch nicht.',
        ],
        werb: [],
      },
      {
        id: 'west',
        name: 'Frankenwelle 3',
        freq: '96,4',
        mhz: 96.4,
        art: 'Westsender, Pop – verrauscht',
        fern: 'west',
        wer: { name: 'Wolfi', g: 'm', age: 34 },
        uhr: ['kenn', 'musik', 'news', 'musik', 'werb', 'musik', 'mod'],
        claims: [
          'Frankenwelle 3 – Pop für Oberfranken. Und seit gestern für die Nachbarn.',
          'Die Frankenwelle. Jetzt mit Gästen.',
        ],
        mod: [
          'Servus aus Coburg. In der Innenstadt hört man heute mehr Zweitakter als Kirchenglocken.',
          'Einen herzlichen Gruß an alle, die uns bisher heimlich gehört haben. Ab heute dürft ihr laut drehen.',
          'Wer aus Thüringen kommt und den Marktplatz sucht: immer dem Stau nach.',
          'Ich mache diesen Beruf seit zehn Jahren. So einen Freitag hatte ich noch nicht.',
        ],
        news: [
          'Seit der vergangenen Nacht sind die Grenzen der DDR offen. Am Übergang Rottenbach bei Coburg rollen seit dem Morgen Trabant und Wartburg aus Richtung Eisfeld herüber.',
          'Besucher aus der DDR erhalten ein Begrüßungsgeld von hundert Mark. Vor Banken und Sparkassen bilden sich Schlangen.',
          'Berlin. Am Abend sprechen vor dem Rathaus Schöneberg Bundeskanzler Kohl, der dafür seinen Besuch in Polen unterbrochen hat, Außenminister Genscher, Willy Brandt und der Regierende Bürgermeister Momper.',
          'In Berlin sind die Geschäftsstraßen überfüllt, der Kurfürstendamm ist von parkenden Autos blockiert. Die Stimmung: ausgelassen.',
        ],
        werb: [
          'Werbung: Das neue Farbfernsehgerät von Technotron. Mit Fernbedienung. Sie müssen nie wieder aufstehen. Wollen Sie das?',
          'Werbung: Kaufhaus am Markt. Heute länger geöffnet. Der Parkplatz ist voll – kommen Sie trotzdem, wir rücken zusammen.',
          'Werbung: Reisebüro Fernblick. Jetzt neu im Programm: Thüringen. Ja, wirklich.',
        ],
      },
    ],
  };
  const byId = {};
  for (const era of Object.keys(SENDER)) for (const s of SENDER[era]) byId[s.id] = Object.assign(s, { era });
  // ---- the police report: a deed of the player's in the station's tone. The core's sentences (GLDATA.RADIO.polizei) and more ----
  const POLIZEI = {
    autoklau: [
      R0.polizei.autoklau,
      'Polizeibericht: Ein Fahrzeug wechselte in Ratscher den Fahrer. Der bisherige war dagegen.',
    ],
    schlag: [
      R0.polizei.schlag,
      'Polizeibericht: In Ratscher gab es eine Meinungsverschiedenheit. Sie wurde mit der Faust vorgetragen.',
    ],
    rempeln: [
      R0.polizei.rempeln,
      'Polizeibericht: Rempelei im Ort. Der Geschädigte beschreibt den Täter als „unhöflich“.',
    ],
    raserei: [
      R0.polizei.raserei,
      'Polizeibericht: Zu schnell durch den Ort. Die Hühner an der Dorfstraße haben Anzeige erstattet.',
    ],
    boeller: [
      R0.polizei.boeller,
      'Polizeibericht: Es hat geknallt. Der Hund von nebenan liegt unterm Sofa und möchte nicht aussagen.',
    ],
    einbruch: [
      R0.polizei.einbruch,
      'Polizeibericht: Ein Lager in der Feldflur wurde geöffnet. Von außen. Ohne Schlüssel.',
    ],
    hausfrieden: [
      R0.polizei.hausfrieden,
      'Polizeibericht: Unbefugte auf fremdem Gelände. Das Schild „Betreten verboten“ wurde gelesen und anders bewertet.',
    ],
    flucht: [
      R0.polizei.flucht,
      'Polizeibericht: Auf das Haltezeichen der Streife folgte Vollgas. Die Streife nimmt das persönlich.',
    ],
    sperre: [R0.polizei.sperre, 'Polizeibericht: Die Sperre auf der Landstraße hat gehalten. Der Acker daneben nicht.'],
    widerstand: [
      R0.polizei.widerstand,
      'Polizeibericht: Ein Beamter wurde bei einer Kontrolle geschubst. Er schreibt jetzt. Viel.',
    ],
    // 1989
    kiste: [
      'Die Volkspolizei bittet die Bevölkerung um Mithilfe: Gesucht wird ein Bürger, der am Nachmittag in Ratscher mit einer Kiste gesehen wurde.',
      'Eine Durchsage der Volkspolizei: In Ratscher wurde eine Kiste davongetragen. Wem sie gehört, wird noch geklärt. Wem sie fehlt, auch.',
    ],
    ausweis: [
      'Eine Durchsage der Volkspolizei: In Ratscher hat sich ein Bürger der Kontrolle entzogen. Der Abschnittsbevollmächtigte bittet um Hinweise.',
    ],
  };
  // how a station that is not the talk station passes the report on
  const VOR = {
    kirmes: 'Und jetzt kurz etwas Ernstes, bevor der nächste Walzer kommt.',
    klassik: 'Eine Durchsage der Polizei. Wir bitten um Nachsicht; danach wieder Musik.',
    zweitakt: 'Durchsage von den Kollegen in Blau.',
    blasius: 'Aus dem Thüringischen hört man:',
    neon: 'Systemmeldung der Polizei.',
    funkloch: 'Kurz was von der Polizei. Ich lese es nur vor, ich habe es nicht geschrieben.',
    impuls: 'Das hier sollen wir vorlesen:',
    west: 'Und aus dem Sendegebiet drüben erreicht uns das:',
  };
  const T89 = {
    keinZeuge: 'Besondere Vorkommnisse im Kreis: keine. So steht es jedenfalls im Rapport.',
    gesucht: 'Hinweise nimmt jede Dienststelle der Deutschen Volkspolizei entgegen – sofern heute jemand da ist.',
    eil: 'Wir unterbrechen das Programm. In Ratscher sind mehrere Funkstreifenwagen im Einsatz. Die Bürger werden gebeten, Ruhe zu bewahren.',
    erwischt: 'Die Volkspolizei teilt mit: Die Suche in Ratscher ist beendet. Eine Person wurde zugeführt.',
    frei: 'Die Suche in Ratscher wurde eingestellt. Die Genossen werden an anderer Stelle gebraucht. Heute überall.',
  };
  const TH = {
    keinZeuge: R0.keinZeuge,
    gesucht: R0.gesucht,
    beschr: 'Eine genaue Beschreibung liegt nicht vor. Die Zeugen sind sich einig, dass es „jemand“ war.',
    bekannt: 'Die Beamten wissen inzwischen, wen sie suchen. Im Dorf wusste man es schon vorher.',
    eil: 'Wir unterbrechen das Programm für eine Eilmeldung: Großeinsatz der Polizei im Raum Ratscher, Sperre auf der Landstraße. Bitte umfahren Sie das Gebiet – oder bleiben Sie gleich zu Hause, da ist es auch schön.',
    heli: 'Eilmeldung: Über dem Tal kreist ein Hubschrauber. Die Kühe sind unruhig, die Dorf-Chatgruppe ist es auch.',
    erwischt: n =>
      'Polizeibericht: Die Suche im Raum Ratscher ist beendet. Eine Person wurde gestellt. Geldbuße: ' +
      n +
      ' Euro. Der Landkreis sagt Danke.',
    frei: 'Polizeibericht: Die Fahndung im Raum Ratscher wurde eingestellt. Die Streife ist wieder in Schleusingen. Der Kaffee war noch warm.',
  };
  // ---- the clock and the weather as sentences ----
  const uhr = min => {
    const m = ((Math.floor(min) % 1440) + 1440) % 1440,
      h = Math.floor(m / 60),
      mm = m % 60;
    return 'Es ist ' + h + ' Uhr' + (mm ? ' ' + mm : '') + '.';
  };
  // w: the game's weather (wetter/wx_data.js norm(): text, temp, rain, snow, fog, wind m/s, gust, thunder) or null
  function wetter(w, era) {
    const k = era === '1989';
    if (!w || !w.text)
      return k
        ? 'Das Wetter: Die Angaben des Meteorologischen Dienstes liegen uns noch nicht vor. Sehen Sie bitte aus dem Fenster.'
        : 'Das Wetter: findet draußen statt. Genaueres, sobald jemand nachgesehen hat.';
    const t = Number.isFinite(w.temp) ? Math.round(w.temp) : null,
      kmh = Math.round((w.wind || 0) * 3.6);
    let s =
      'Das Wetter für Ratscher: ' +
      w.text.toLowerCase() +
      (t === null ? '' : ', ' + (t < 0 ? 'minus ' + -t : t) + ' Grad') +
      '.';
    if (kmh >= 45) s += ' Stürmischer Wind' + (k ? '.' : ' – die Mülltonnen bitte anleinen.');
    else if (kmh >= 20) s += ' Dazu frischer Wind.';
    if (k) return s;
    if (w.thunder) s += ' Bei Gewitter gilt: Buchen sollst du suchen – und zwar von weitem.';
    else if (w.snow > 0.05) s += ' Der Winterdienst ist informiert. Ausgerückt wird nach dem Frühstück.';
    else if (w.fog) s += ' Sicht unter hundert Metern. Der Blitzer sieht Sie trotzdem.';
    else if (w.rain > 2) s += ' Es schüttet. Gegrillt wird trotzdem – unterm Carport.';
    else if (w.rain > 0.05) s += ' Der Regen ist gut für die Pilze und schlecht für die Kirmes.';
    else if (t !== null && t >= 27) s += ' Der Stausee ruft. Das Eis am Kiosk ist allerdings aus.';
    else if (t !== null && t <= 0) s += ' Bitte kratzen. Auch die Seitenscheiben. Ja, Sie.';
    return s;
  }
  // the report for a list of deeds [{ id, wit }] and the search (stars, known): sentences
  function polizei(sender, taten, sterne, bekannt, era, salt = 0) {
    const k = era === '1989',
      out = [];
    const seen = taten.filter(t => t.wit > 0 && POLIZEI[t.id]),
      ids = [];
    for (const t of seen) if (!ids.includes(t.id)) ids.push(t.id);
    for (const [i, id] of ids.slice(-2).entries()) {
      const v = POLIZEI[id];
      out.push(v[(salt + i) % v.length]);
    }
    if (!out.length && taten.length) out.push(k ? T89.keinZeuge : TH.keinZeuge);
    if (sterne > 0) {
      if (k) out.push(T89.gesucht);
      else {
        out.push(TH.gesucht(sterne));
        out.push(bekannt ? TH.bekannt : TH.beschr);
      }
    }
    if (out.length && VOR[sender]) out.unshift(VOR[sender]);
    return out;
  }
  // ---- the programme (pure): a station's state and what it sends next ----
  const PROG = {
    neu(id, seed = 1) {
      let s = (seed ^ 0x51ed) >>> 0 || 7;
      return {
        id,
        i: 0,
        bag: {},
        song: -1,
        feat: 0,
        featPause: 0,
        n: 0,
        salt: seed % 7,
        rnd: () => {
          s ^= s << 13;
          s ^= s >>> 17;
          s ^= s << 5;
          s >>>= 0;
          return s / 4294967296;
        },
      };
    },
    // the next of n songs, shuffled: none again before all n were played, not the same twice over the refill
    mische(st, n) {
      n = Math.max(1, n | 0);
      const L = (st.misch && st.misch.length === n && st.misch) || (st.misch = Array.from({ length: n }, (_, i) => i));
      return PROG.zieh(st, 'song:' + n, L);
    },
    // a line from a list without repeating one before all were used
    zieh(st, key, list) {
      if (!list || !list.length) return '';
      let b = st.bag[key];
      if (!b || !b.length) {
        b = st.bag[key] = list.map((_, i) => i);
        for (let i = b.length - 1; i > 0; i--) {
          const j = Math.floor(st.rnd() * (i + 1));
          [b[i], b[j]] = [b[j], b[i]];
        }
        // not the same line twice in a row over the refill
        if (b.length > 1 && b[b.length - 1] === st.bag[key + '!']) [b[0], b[b.length - 1]] = [b[b.length - 1], b[0]];
      }
      const i = b.pop();
      st.bag[key + '!'] = i;
      return list[i];
    },
    // ctx: { taten: [{ id, wit }] not yet reported, sterne, bekannt, eil: '' | 'eil' | 'heli' | 'erwischt' | 'frei', busse, w: weather,
    //        min: minute of the day, songs: pieces in the repertoire, last: { titel, von } of the piece just heard }
    // → { k: 'musik', i } | { k: 'wort', art, zeilen: [text …], kenn: play the ident first, taten: deeds told }
    next(st, ctx = {}) {
      const S = byId[st.id],
        era = S.era,
        k89 = era === '1989';
      st.n++;
      // first: what cannot wait
      if (ctx.eil) {
        const T = k89 ? T89 : TH,
          t = ctx.eil === 'erwischt' ? (k89 ? T.erwischt : T.erwischt(ctx.busse | 0)) : T[ctx.eil] || T.eil;
        return { k: 'wort', art: 'eil', zeilen: [t], eil: ctx.eil };
      }
      if (ctx.taten && ctx.taten.length) {
        const z = polizei(st.id, ctx.taten, ctx.sterne | 0, !!ctx.bekannt, era, st.salt + st.n);
        if (z.length) return { k: 'wort', art: 'polizei', zeilen: z, taten: ctx.taten.length };
      }
      const art = S.uhr[st.i % S.uhr.length];
      st.i++;
      const wort = (a, zeilen, more) => Object.assign({ k: 'wort', art: a, zeilen: zeilen.filter(Boolean) }, more);
      switch (art) {
        case 'musik': {
          const n = Math.max(1, ctx.songs | 0);
          // (the songs of the sound repository: shuffled, none again before all were played; the synthesised pieces in turn)
          if (ctx.misch) return { k: 'musik', i: (st.song = PROG.mische(st, n)) };
          st.song = (st.song + 1) % n;
          return { k: 'musik', i: st.song };
        }
        case 'anruf': {
          // a listener on the phone: the presenter's and the caller's lines in turn (who: '' the presenter, else a key of ANRUFER)
          const a = PROG.zieh(st, 'anruf', S.anrufe || []);
          if (!a || !a.length) return PROG.next(st, ctx);
          const ok = a.filter(l => l && l[1]);
          return {
            k: 'wort',
            art: 'anruf',
            zeilen: ok.map(l => l[1]),
            wer: ok.map(l => l[0] || ''),
          };
        }
        case 'kenn':
          return wort('kenn', [PROG.zieh(st, 'claim', S.claims)], { kenn: true });
        case 'mod': {
          const z = [];
          if (ctx.last && ctx.last.titel) z.push(ansage(ctx.last.titel, ctx.last.von));
          z.push(PROG.zieh(st, 'mod', S.mod));
          return wort('mod', z);
        }
        case 'werb': {
          const t = PROG.zieh(st, 'werb', S.werb);
          return t ? wort('werb', [t]) : PROG.next(st, ctx);
        }
        case 'verkehr':
          return wort('verkehr', [PROG.zieh(st, 'verkehr', S.verkehr || [])]);
        case 'gruss':
          return wort('gruss', [PROG.zieh(st, 'gruss', S.gruss || [])]);
        case 'feat': {
          // the true story of the Japanese restaurant in Suhl, in four parts; then a pause of a few rounds
          if (st.featPause > 0) {
            st.featPause--;
            return wort('mod', [PROG.zieh(st, 'mod', S.mod)]);
          }
          const t = R0.sushi[st.feat];
          st.feat++;
          const ende = st.feat >= R0.sushi.length;
          if (ende) {
            st.feat = 0;
            st.featPause = 3;
          }
          return wort('feat', [t], { teil: ende ? R0.sushi.length : st.feat, ende });
        }
        case 'news': {
          const z = [];
          if (k89) {
            z.push(
              S.id === 'republik'
                ? 'Radio Republik. Die Nachrichten.'
                : S.id === 'west'
                  ? 'Frankenwelle 3, die Nachrichten.'
                  : 'Impuls, die Meldungen.'
            );
            z.push(PROG.zieh(st, 'news', S.news), PROG.zieh(st, 'news', S.news));
            if (S.id === 'republik') z.push(wetter(ctx.w, era));
          } else {
            z.push(S.id === 'grenzland' ? S.name + ', die Nachrichten. ' + uhr(ctx.min || 0) : '');
            z.push(PROG.zieh(st, 'news', S.news));
            if (S.id === 'grenzland') {
              z.push(PROG.zieh(st, 'news', S.news));
              if ((ctx.sterne | 0) > 0) z.push(...polizei(st.id, [], ctx.sterne | 0, !!ctx.bekannt, era));
            }
            z.push(wetter(ctx.w, era));
          }
          return wort('news', z);
        }
      }
      return wort('mod', [PROG.zieh(st, 'mod', S.mod)]);
    },
  };
  // how long a spoken line takes (seconds) – the subtitle stays as long
  const dauer = text => Math.max(2.4, 1 + text.length * 0.062);
  // what a kind of item is called on the display
  const ART = {
    kenn: '',
    mod: 'Moderation',
    werb: 'Werbung',
    news: 'Nachrichten',
    verkehr: 'Verkehr',
    feat: 'Grenzgeschichten',
    gruss: 'Grüße',
    polizei: 'Polizeibericht',
    eil: 'Eilmeldung',
    anruf: 'Hörer am Telefon',
  };

  // ---- ton-radio: the songs of the sound repository (GLMEDIEN, index.json) – pure rules, tested in node ----
  // the listeners who call (invented; their voices are recorded by ton-stimmen as gl_r_anruf_<key>)
  const ANRUFER = {
    horst: { name: 'Horst', g: 'm', age: 67 },
    brigitte: { name: 'Brigitte', g: 'f', age: 59 },
    sabine: { name: 'Sabine', g: 'f', age: 44 },
    erwin: { name: 'Erwin', g: 'm', age: 74 },
    renate: { name: 'Renate', g: 'f', age: 63 },
    jonas: { name: 'Jonas', g: 'm', age: 19 },
    aylin: { name: 'Aylin', g: 'f', age: 22 },
    klaus: { name: 'Klaus', g: 'm', age: 70 },
  };
  // which stations play the repository's songs (index.json: kind 'musik', sender one of these); the others keep their own music
  const DATEI_SENDER = ['zweitakt', 'funkloch', 'neon', 'kirmes'];
  const fin = v => typeof v === 'number' && Number.isFinite(v);
  // where a talk of `dauer` seconds may go in a song e (sec, gesang_ab, gesang_bis): over the intro – from the start, ending at least
  // 1 s before the first sung second (an instrumental: the first 40 %, at most 30 s) –, over the outro – after the last sung second, ending
  // before the song's last 1.5 s. → { intro: [a, b] | null, outro: [a, b] | null, passt: 'intro' | 'outro' | '' for this talk }
  function fenster(e, dauer = 0, wo = 'intro') {
    const sec = e && fin(e.sec) ? e.sec : 0;
    if (!sec) return { intro: null, outro: null, passt: '' };
    const ab = fin(e.gesang_ab) ? e.gesang_ab : null,
      bis = fin(e.gesang_bis) ? e.gesang_bis : null,
      a0 = 0.4;
    const ib = ab !== null ? ab - 1 : Math.min(sec * 0.4, 30);
    const intro = ib - a0 >= 2 ? [a0, ib] : null;
    const oa = bis !== null ? bis + 0.5 : Math.max(sec * 0.6, sec - 30),
      ob = sec - 1.5;
    const outro = ob - oa >= 2 ? [oa, ob] : null;
    const fits = w => w && w[1] - w[0] >= dauer;
    const passt = wo === 'outro' ? (fits(outro) ? 'outro' : '') : fits(intro) ? 'intro' : '';
    return { intro, outro, passt };
  }
  // a bed under a spoken ident or a talk between songs, cut from one of the station's own songs: a loud moment without singing –
  // index.json's 'bett' if the pipeline found one, else the last seconds of the intro (the band is complete just before the voice comes
  // in), else after the singing, else (sung throughout) a third into the song. → { ab, sek }
  function bett(e, dauer = 5) {
    const sec = e && fin(e.sec) ? e.sec : 0,
      sek = Math.max(4, Math.min(6, dauer + 1.5));
    if (!sec) return { ab: 0, sek };
    const lang = Math.max(sek, dauer + 1);
    const ok = a => Math.max(0, Math.min(a, sec - lang - 0.5));
    if (fin(e.bett)) return { ab: ok(e.bett), sek };
    const ab = fin(e.gesang_ab) ? e.gesang_ab : null,
      bis = fin(e.gesang_bis) ? e.gesang_bis : null;
    if (ab === null) return { ab: ok(sec * 0.33), sek };
    if (ab >= lang + 1.5) return { ab: ok(ab - lang - 1), sek };
    if (bis !== null && sec - bis >= lang + 2.5) return { ab: ok(bis + 1), sek };
    return { ab: ok(sec * 0.33), sek };
  }
  // tuning in: one lands in the middle of a song, as if the station had been running – where, follows the game's clock (seconds of the
  // day) and the station, between 15 % and 70 % of the song, at least 25 s before its end
  function mitte(sec, uhrSek = 0, salz = 0) {
    if (!fin(sec) || sec <= 0) return 0;
    let f = (uhrSek / Math.max(30, sec) + (salz % 997) * 0.618034) % 1;
    if (f < 0) f += 1;
    const a = sec * 0.15,
      b = Math.max(a, Math.min(sec * 0.7, sec - 25));
    return Math.round((a + f * (b - a)) * 10) / 10;
  }
  // reception 0 … 1 (o: { x, y, ort: the place's name, h: the ground here, um: the mean ground around, t: seconds for the wavering }):
  // the distance to the station's transmitter, the forest and the ravine of the Klinge (place names), a hollow lower than its
  // surroundings (terrain); the station from across the border only in the south, the Western station of 1989 always wavering
  function empfang(s, o = {}) {
    if (!s) return 1;
    let q = 1;
    const x = fin(o.x) ? o.x : 0,
      y = fin(o.y) ? o.y : 0;
    if (s.mast) {
      const d = Math.hypot(x - s.mast[0], y - s.mast[1]) / (s.mast[2] || 8000);
      q *= Math.max(0.25, Math.min(1, 1.15 - 0.55 * d * d));
    }
    const ort = typeof o.ort === 'string' ? o.ort : '';
    if (/Klinge|Wald|Forst|Hohlweg/i.test(ort)) q *= 0.42;
    else if (/Grund\b|Schlucht|Graben/i.test(ort)) q *= 0.7;
    if (fin(o.h) && fin(o.um)) {
      const tief = o.um - o.h;
      if (tief > 6) q *= Math.max(0.35, 1 - (tief - 6) / 40);
    }
    if (s.fern === 'sued') q = Math.min(q, Math.max(0.12, Math.min(1, (-y - 150) / 600)));
    else if (s.fern === 'west') {
      const t = fin(o.t) ? o.t : 0;
      q *= 0.62 + 0.2 * Math.sin(t * 0.7) + 0.1 * Math.sin(t * 2.3);
    }
    return Math.max(0.05, Math.min(1, q));
  }
  // what the display says under the station's name while a song plays: „Titel – Interpret · CC BY 4.0“
  const anzeige = e =>
    e ? (e.title || '?') + (e.author ? ' – ' + e.author : '') + (e.licence ? ' · ' + e.licence : '') : '';
  // the presenter's back-announcement of a song – a fixed sentence per song, so that ton-stimmen can record it from index.json
  const ansage = (titel, von) => 'Das war „' + titel + '“' + (von ? ' von ' + von : '') + '.';
  // the credits „Musik im Radio“: one line per song – title, artist, licence (with its link), source; grouped by station
  function credits(list) {
    const out = [];
    for (const id of DATEI_SENDER) {
      const s = byId[id],
        L = (list || []).filter(e => e && e.kind === 'musik' && e.sender === id && !e.aus);
      if (!L.length) continue;
      out.push({
        sender: s ? s.name + ' ' + s.freq : id,
        zeilen: L.map(e => ({
          text:
            '„' + (e.title || e.id) + '“' + (e.author ? ' – ' + e.author : '') + (e.licence ? ' · ' + e.licence : ''),
          lizenz: e.licence_url || '',
          quelle: e.source || '',
        })),
      });
    }
    return out;
  }
  // the fixed lines that are not in the stations' usual lists (GLSTIMMEN collects these): the calls, the presenter's back-announcement
  // of every song of the repository (from the list, when it is known)
  function linien(list) {
    const out = [];
    for (const era of Object.keys(SENDER))
      for (const s of SENDER[era]) {
        for (const a of s.anrufe || []) for (const [w, t] of a) out.push([w ? 'r_anruf_' + w : 'r_' + s.id, t]);
        if (VOR[s.id]) out.push(['r_' + s.id, VOR[s.id]]);
      }
    for (const e of list || [])
      if (e && e.kind === 'musik' && e.title && DATEI_SENDER.includes(e.sender))
        out.push(['r_' + e.sender, ansage(e.title, e.author)]);
    return out;
  }

  // ---- the phone ----
  // the village chat „Ratscher aktuell“ (satire; the invented villagers only): the core's lines and more
  const CHAT = GLDATA.CHAT.concat([
    [
      'Katrin',
      'Wer von euch hat „Radio Grenzland“ angerufen und sich ein Lied OHNE Akkordeon gewünscht? So jemand wohnt hier nicht.',
    ],
    [
      'Jens',
      'Der 13er Ringschlüssel ist wieder da. Lag im Briefkasten. Danke an Unbekannt. Frage für einen Freund hat sich erledigt.',
    ],
    ['Wolfgang', 'Pilze stehen. Wo, sage ich nicht.'],
    ['Ingrid', 'Die gelbe Tonne kommt MORGEN. Nicht heute. MORGEN.'],
    ['Uwe', 'Hab sie schon rausgestellt.'],
    ['Heike', 'Kürbissuppe bei mir. Jeder ist eingeladen. Bitte kommt.'],
    ['Manfred', 'Wem gehört der Anhänger am Löschteich? Der steht da seit Dienstag.'],
    [
      'Gerhard',
      'Hinweis des Chronisten: Am 10. November 1989 war die Schlange vor der Meldestelle länger als die vorm Konsum.',
    ],
  ]);
  // what the chat says when something happens (the event's name → lines; one is taken, the next time the next)
  const CHATEV = {
    streife: [
      ['Manfred', 'Streifenwagen im Dorf!! Zweimal am Anger vorbei. Was ist da los?'],
      ['Ingrid', 'Polizei fährt Schritt. Ich stehe am Fenster. Ich berichte.'],
      ['Wolfgang', 'Blaulicht. Bei uns. Das letzte Mal war das wegen der Kuh.'],
    ],
    boeller: [
      ['Ingrid', 'WER BÖLLERT DA?? Es ist nicht Silvester!!'],
      ['Uwe', 'War ich nicht.'],
      ['Heike', 'Der Hund ist wieder unterm Sofa. Vielen Dank auch.'],
    ],
    tat: [
      ['Katrin', 'Habt ihr das eben mitgekriegt?? Mitten im Ort!'],
      ['Jens', 'Hier ist ja mehr los als im Fernsehen.'],
      ['Manfred', 'Ich sag nichts. Aber ich hab was gesehen.'],
    ],
    sperre: [['Wolfgang', 'Landstraße ist dicht. Sperre. Ich fahr über den Acker, wie früher.']],
    erwischt: [
      ['Ingrid', 'Sie haben einen. Am Streifenwagen, Hände aufs Dach. Ich habe ALLES gesehen.'],
      ['Uwe', 'War ich diesmal wirklich nicht.'],
    ],
    entkommen: [
      ['Manfred', 'Polizei ist wieder weg. Gefunden haben sie keinen.'],
      ['Katrin', 'Die Streife hat am Wagen noch eine Bratwurst gekauft. Dann sind sie los.'],
    ],
    radio: [['Jens', 'Wer dreht da so laut auf? Man hört den Sender bis zur alten Schule.']],
  };
  // the regional feed: the core's posts and more; ort: a place of GLDATA.ORTE (a post can set a marker)
  const FEED = GLDATA.FEED.concat([
    ['Radio Grenzland', 'Jetzt im Programm: „Grenzgeschichten – Sukiyaki in Suhl“. Einschalten auf 89,1.', ''],
    [
      'Schleusingen_blickt',
      'Zentralhaltestelle am Freitagabend: ein Bus, vier Tauben, ein Mann mit Paket. Großstadtfeeling.',
      'zh',
    ],
    ['Kirmes_Kalle', 'Kirmesbaum steht. Schief, aber er steht. Fotos folgen, sobald er gerade ist.', 'anger'],
    ['suedthueringen.live', 'LIVE: Sonnenuntergang über der Talsperre. 3 Zuschauer, davon 2 Enten.', 'damm'],
  ]);
  const FEEDEV = {
    streife: [
      ['suedthueringen.live', 'LIVE: Polizeieinsatz in Ratscher. Wir wissen nichts, streamen aber schon mal.', 'anger'],
    ],
    sperre: [
      [
        'suedthueringen.live',
        'LIVE: Sperre auf der Landstraße bei Ratscher. Die Umleitung ist ausgeschildert – auf dem Schild steht „Viel Glück“.',
        '',
      ],
    ],
    erwischt: [
      [
        'suedthueringen.live',
        'Polizei meldet Festnahme in Ratscher. Kommentare bitte sachlich. (Wird nichts.)',
        'anger',
      ],
    ],
    boeller: [['Feldflur_Fuchs', 'Knall in Ratscher. Entweder Böller oder der Auspuff vom Wolfgang.', '']],
  };
  const BANK = { name: 'Kreditgenossenschaft Schleusetal eG', claim: 'Wir kennen Ihren Kontostand. Und Ihre Mutter.' };
  // notes the phone knows by itself (others come through GLHANDY.note)
  const NOTIZ = {
    sushi: { titel: GLDATA.SUSHI.titel, zeilen: GLDATA.SUSHI.text, quellen: GLDATA.SUSHI.quellen },
    nov89: {
      titel: 'Was am 10. November 1989 im Radio kam',
      zeilen: [
        'Die Sender der Rückblende sind erfunden, ihre Meldungen nicht: Am Abend des 9. November 1989 wurde die neue Reiseregelung der DDR bekannt gegeben, in der Nacht gingen die Übergänge auf.',
        'Am Freitag, dem 10. November, standen Menschen seit dem frühen Morgen bei der Volkspolizei für den Visumstempel an. Im Bezirk Suhl gab es zwei Grenzübergangsstellen: Eisfeld (nach Coburg) und Meiningen.',
        'Am Nachmittag verlas der Innenminister im Fernsehen einen Aufruf des Ministerrats: Die Reisemöglichkeiten seien von Dauer, niemand solle übereilte Entschlüsse treffen.',
        'Im Westen gab es 100 D-Mark Begrüßungsgeld. Am Abend sprachen vor dem Rathaus Schöneberg Kohl, Genscher, Brandt und Momper; im Lustgarten in Ost-Berlin fand eine Kundgebung der SED statt.',
      ],
      quellen: QUELLEN89,
    },
  };
  return {
    SENDER,
    byId,
    POLIZEI,
    VOR,
    TH,
    T89,
    PROG,
    wetter,
    uhr,
    polizei,
    dauer,
    ART,
    ANRUFER,
    DATEI_SENDER,
    fenster,
    bett,
    mitte,
    empfang,
    anzeige,
    ansage,
    credits,
    linien,
    CHAT,
    CHATEV,
    FEED,
    FEEDEV,
    BANK,
    NOTIZ,
    QUELLEN89,
  };
})();
if (typeof window !== 'undefined') window.GLRDATA = GLRDATA;
