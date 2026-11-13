# Grenzland: Radiosender und Handy (feat/grenzland-radio, 13.11.2026)

Falko, 13.11.2026 1:14: „… und auch verschiedene Radiosender eingestellt werden können. Ähnlich wie bei GTA.“ Musik: selbst synthetisiert
plus die gemeinfreien Aufnahmen, die schon im Spiel sind – keine lizenzierten Hits. Auftrag: `docs/plans/auftraege/grenzland-radio.md`,
gemeinsame Regeln `grenzland-gemeinsam.md`. Hilfs-Agent `grenzland-radio` des Grenzland-Chats, Port 9013.

Module (`viz3/src/grenzland/`): `gl_radio_data.js` (`GLRDATA`: Sender, Texte, Programmregeln, Daten des Handys – rein, ohne Szene),
`gl_radio_musik.js` (`GLRMUSIK`: Komponist und Synthesizer – rein, ohne WebAudio), `gl_radio.js` (`GLRADIO`: Senderwahl, Anzeige, Ton,
Programm), `gl_handy.js` (`GLHANDY`: das Handy). Tests: `viz3/test/unit/grenzland_radio.test.mjs` (9 Tests, node),
`viz3/test/grenzland_radio.py` (Browser, in `viz3/extra/grenzland-radio/tests.txt`).

## Was es gibt

### Das Radio

- **Sechs erfundene Sender heute** (in der Reihenfolge der Skala): **Radio Grenzland 89,1** (Lokalfunk mit Matze: Nachrichten, Satire,
  Verkehr, Werbung, die Reihe „Grenzgeschichten: Sukiyaki in Suhl“ in vier Teilen), **Kirmeswelle 92,4** (Schlager und Volksmusik mit
  Gundula: Polka, Walzer, Schlager-Fox, Hörergrüße), **Klassik am Kamm 95,7** (Frau Dr. Sommerlatte: die gemeinfreien Aufnahmen des
  Plattenspielers – Satie, Joplin – im Wechsel mit eigenen Klavierstücken), **Radio Zweitakt 97,6** (Rock ohne Gesang mit Ecki),
  **Radio Blasius 99,9** (Blasmusik aus Oberfranken mit Schorsch – kommt nur im Süden der Karte klar herein, sonst rauscht es),
  **Neonfunk 104,2** (Elektronik der Achtziger mit Synthia).
- **Drei Sender in der Rückblende** (`GL.era === '1989'`): **Radio Republik I 90,2** (Nachrichten, Marsch- und Tanzmusik), **Jugendwelle
  Impuls 93,8** (Rock und Elektronik, Kati moderiert ohne Manuskript), **Frankenwelle 3 96,4** (Westsender, immer verrauscht). Die Namen
  sind erfunden, **die Meldungen nicht**: was am Freitag, 10. November 1989 wirklich gemeldet wurde – neue Reiseregelung, Visum bei den
  Volkspolizeikreisämtern, starker Verkehr an den Grenzübergangsstellen Eisfeld und Meiningen, der Aufruf des Ministerrats („keine
  übereilten Entschlüsse“), Ende der ZK-Tagung mit Aktionsprogramm und Kundgebung im Lustgarten, Ablösung Shiwkows in Sofia; im Westen
  Trabant und Wartburg über Rottenbach nach Coburg, 100 Mark Begrüßungsgeld, die Kundgebung am Rathaus Schöneberg. Quellen stehen in
  `GLRDATA.QUELLEN89` und im Handy unter Notizen.
- **Umschalten wie in GTA:** `R` nächster Sender (nach dem letzten: aus), `Umschalt + R` der davor, **`R` halten** öffnet die Senderliste
  zum Anklicken (auch: die Anzeige antippen; im Handy der Reiter „Radio“). Beim Einschalten landet man mitten in einem laufenden Stück.
  Die Wahl bleibt (`GL.radio`), nach einem Neuladen läuft der Sender weiter. Wer zum ersten Mal in einem Fahrzeug sitzt, hört das Radio
  von selbst (wie in GTA); einmal ausgeschaltet, bleibt es aus.
- **Die Anzeige** oben in der Mitte (nicht in der Ecke oben links, dort ist das Radar): Frequenz, Name, eine Skala mit Zeiger, der zum
  Sender fährt, darunter Titel und Interpret bzw. was gerade läuft. Sie blendet nach ein paar Sekunden aus und kommt bei jedem neuen
  Beitrag kurz wieder. 1989 sieht sie aus wie ein Gerät der Zeit (cremefarbene Skala, braunes Gehäuse).
- **Wo es klingt:** im Auto über die Lautsprecher, zu Fuß und auf dem Moped aus dem Handy (dünn, leiser), 1989 aus dem Autoradio oder
  einem Kofferradio. Alles hängt am Musik-Regler des Spiels („Ton aus“ und die Lautstärken gelten).
- **Das Programm** (`GLRDATA.PROG`, je Sender eine Sendeuhr): Musik, Moderation („Das war … von …“), Kennung mit Spruch, Werbung
  erfundener Firmen (Satire), Nachrichten mit Uhrzeit und dem **Wetter des Spiels** (`WETTER`), Verkehr, Grüße. Kein Satz kommt zweimal,
  bevor alle dran waren.
- **Der Polizeibericht über die eigenen Taten** – der GTA-Moment: eine Tat, die jemand gesehen hat (`grenzland:tat`), kommt beim nächsten
  Wortbeitrag; ein Stück, das noch lange liefe, wird dafür nach wenigen Sekunden ausgeblendet. Solange gefahndet wird: „Die Polizei sucht
  Zeugen …“ (hohle Sterne: „eine genaue Beschreibung liegt nicht vor“; gefüllte: „die Beamten wissen inzwischen, wen sie suchen“). Hat es
  niemand gesehen: „Keine besonderen Vorkommnisse. Jedenfalls keine, die jemand gesehen hätte.“ Ab **drei Sternen** oder bei einer Sperre
  unterbricht eine **Eilmeldung** die Musik (die Musik läuft leise darunter weiter); Festnahme und Entkommen werden gemeldet. Jeder Sender
  gibt es in seinem Ton weiter, 1989 bittet die Volkspolizei „die Bevölkerung um Mithilfe“.
- **Gesprochen** wird als eigene Zeile über den Untertiteln (`GLHUD.funk`: „♪ Sender …“) und – wo die Stimmen an sind – mit einer
  eigenen Stimme je Moderator (`STIMME`, Schlüssel `gl_r_<sender>`). Die Moderation spricht in den Anfang des nächsten Stücks hinein,
  die Musik duckt sich darunter.

### Die Musik (`gl_radio_musik.js`)

- **Komponiert, nicht geloopt:** jeder Sender hat ein festes Repertoire (`GLRMUSIK.REP`, 51 Stücke mit erfundenen Titeln und Interpreten);
  ein Stück entsteht aus dem Samen seines Titels – der Sender spielt also immer dieselben Stücke. Elf Stile (Polka, Marsch, Walzer,
  Schlager-Fox, Rock, Ballade, Synth, Pop, Swing, Klavierstück, Kennung) mit Form (Vorspiel, Strophe, Refrain, Trio in der Quarte,
  Rückung um einen Halbton, Schluss), Akkordfolgen in Stufen, Bass, Begleitung und Schlagzeug je Stil, Melodien als Perioden (Motiv,
  Sequenz, zweites Motiv, Halbschluss – Ganzschluss) und einer zweiten Stimme in Terzen und Sexten. 45–80 Sekunden je Stück.
- **Synthese** bei 24 kHz, mono: Sinus, bandbegrenzte Säge- und Pulswellen, FM für Blech, Klarinette und E-Piano, Orgel, gezupfte Saiten
  (Karplus-Strong), Klavier aus abklingenden Teiltönen, Schlagzeug aus Sinus-Sweeps und gefiltertem Rauschen, kleiner Hall, Master.
- **Pegel:** jedes Stück wird auf denselben Effektivwert gebracht (RMS 0,1 ≈ −20 dBFS); Spitzen werden ab 0,5 weich gebogen und bleiben
  unter 0,85 – nichts übersteuert. Gemessen (Unit-Tests, alle Stile): Spitze 0,45–0,80, weniger als 0,4 % der Samples über 0,5, kein
  Gleichanteil, Stille an beiden Enden, alle Töne in der Tonart, Bässe unter 60 % der Energie.
- **Gerechnet wird in Scheiben** (3 ms je Bild, 9 ms solange man auf das erste Stück wartet), das nächste Stück im Voraus; ein Stück
  kostet hier 4–16 ms Rechenzeit je Sekunde Musik. Höchstens drei Stücke (je ~7 MB) bleiben im Speicher.
- **Ich kann es nicht hören.** Was gemessen werden kann, ist gemessen (Pegel, Spektrum, Tonart, Form); wie es klingt – ob eine Melodie
  gefällt, ob das Blech nach Blech klingt –, muss Falko hören. Die Pegel sind bewusst vorsichtig.

### Das Handy (`T`, Knopf „Handy“; schließt mit `T`, `Esc`, dem Kreuz oder einem Klick ins Bild)

Ein Gehäuse in Handyform mit sieben Reitern (Ziffern 1–7 wechseln):

- **Nachrichten** – die SMS der Geschichte (`GLHANDY.sms(von, text)`): neueste oben, Ungelesenes markiert, Zähler am Reiter, Ton.
- **Dorf-Chat „Ratscher aktuell“** – Satire, nur die erfundenen Dorfbewohner. Etwa jede Minute eine neue Zeile; er reagiert auf
  Streifenwagen im Dorf, Böller, eine gesehene Tat, die Sperre, Festnahme und Entkommen.
- **Feed** – Posts und „Livestreams“ aus der Gegend; „Auf der Karte zeigen“ meldet `grenzland:ziel { pos, name }` und sagt Richtung und
  Entfernung.
- **Bank** (erfunden: Kreditgenossenschaft Schleusetal eG) – Kontostand und die letzten Bewegungen (`grenzland:geld`, Geldbußen).
- **Notizen** – `GLHANDY.note(titel, zeilen, quellen)`; von selbst: „Sushi in Suhl – die wahre Geschichte“, sobald das Radio alle vier
  Teile gesendet hat, und „Was am 10. November 1989 im Radio kam“ nach der Rückblende – beide mit ihren Quellen als Links.
- **Kamera** – ein Sucher über dem Bild; eine Mission verlangt Fotos mit `GLHANDY.kamera({ ziel: [x, y], r, n, sicht, done, name })`
  und kann den Sucher mit `GLHANDY.open('kamera')` gleich öffnen. Auslösen: Knopf „Foto“ oder `E`/Enter. Ohne Auftrag: Schnappschuss.
- **Radio** – die Sender zum Antippen, was läuft, und ob die Moderatoren vorgelesen werden.

Oben die Spielzeit und die Netzbalken (im Wald an der Klinge: „Funkloch“). 1989 hat niemand ein Handy. Auf dem Telefon füllt es den
Bildschirm hochkant fast ganz, quer steht es rechts. Gespeichert über `GL`: `GL.sms`, `GL.feed` (Einträge nach `k`: chat, feed, bank, note).

## Ausprobieren

`?szenario=grenzland`, dann `R` (mehrmals; `R` halten für die Liste), `T` für das Handy. In der Konsole: `GLFAHNDUNG.tat('autoklau',
{ force: [{ name: 'Zeuge' }] })` – nach ein paar Sekunden kommt der Polizeibericht; `GL89.enter({})` für die Sender von 1989;
`GLHANDY.sms('Jule', '…')`; `GLHANDY.kamera({ ziel: [P.x + 10, P.y], r: 30, n: 2 }); GLHANDY.open('kamera')`.

## Entscheidungen (Falko schlief)

- **Namen:** alle Sender, Moderatoren, Interpreten, Titel und Firmen sind erfunden; keine echten Sender (auch keine von 1989), keine
  Jingles, keine Marken. Hubert und Ronald kommen nirgends vor (ein Unit-Test sucht danach). Spedition Krähwinkel wirbt im Radio.
- **Stimmen:** vorgelesen wird nur über kostenlose Wege (Gerät, Piper, Microsoft-Freikontingent). Ist ElevenLabs gewählt, bleibt das
  Radio bei Untertiteln, bis man im Handy „Sprecher vorlesen“ anhakt – das Radio redet viel und würde Guthaben kosten.
- **1989 zu Fuß:** Gerhard hat ein Kofferradio (sonst hörte man die Nachrichten des 10. November nur im Auto). Auf dem Moped und zu Fuß
  heute spielt das Handy.
- **Radio Blasius** hat im Garten nur Rauschen mit etwas Musik, ab etwa 750 m südlich klaren Empfang; die Frankenwelle 1989 schwankt immer.
- **Der Bericht wartet nicht auf das Liedende:** ein laufendes Stück wird nach 7 Sekunden ausgeblendet, wenn eine gesehene Tat ansteht.
  Taten, die älter als 45 Spielminuten sind, werden nicht mehr gemeldet.
- **Kamera:** `GLHANDY.foto()` zählt wie in der ersten Fassung (Ziel in Reichweite und in Sicht); der Knopf im Sucher verlangt zusätzlich,
  dass das Motiv im Bild ist (±42°), und sagt sonst, wohin man sich drehen muss.
- **Stücke sind kurz** (45–80 s) – Radio-Fassungen: mehr Abwechslung, weniger Speicher.
- **Kalender:** die Meldungen von heute sind auf Spätsommer geschrieben (die Geschichte beginnt am Freitag, 4. September 2026).
- Ein fünftes Modul habe ich nicht gebraucht; `modules.txt` ist unverändert.

## Offen

- Hören: Falkos Ohren (Laptop, iPhone, im Auto leise) – was nicht gefällt, lässt sich je Stil und Instrument in `GLRMUSIK.STIL`/`INS` drehen.
- Das Autoradio im Cockpit (`gl_cockpit.js`, Agent `grenzland-auto`) kann `GLRADIO.now()` (Name, Frequenz, Titel) und
  `grenzland:radio` / `grenzland:radio:sendung` anzeigen; verbunden ist es noch nicht.
- Zwiefacher (Taktwechsel) für Radio Blasius, mehr Stücke je Sender, Zeitansagen zur vollen Stunde.

## Für den Lead

Erledigt mit dem Stand 6f5ef354 von `feat/grenzland` (13.11. ~3:05, hier gemergt): Zähler am Knopf „Handy“ (`GLHUD.neu`), der Knopf
„Radio“ bleibt 1989, `grenzland:ziel` setzt einen Wegpunkt im Radar, der Böller-Bericht sagt September, und das Radio hat seine eigene
Zeile `GLHUD.funk` über den Untertiteln (das Radio nutzt sie; ohne sie fällt es auf `GLHUD.sub` zurück und wartet auf fremde Untertitel).

Offen:
- Das Radio schaltet sich beim ersten Einsteigen in ein Fahrzeug von selbst ein (`GLRADIO.tick`). Wenn eine Mission das nicht will
  (z. B. eine stille Szene), kann sie vorher `GLRADIO.S.touched = true` setzen oder danach `GLRADIO.off()` rufen.
- Missionen können eigene Meldungen ins Programm geben, indem sie eine Tat melden (`GLFAHNDUNG.tat`) – eine freie Durchsage
  („Sondermeldung“) gibt es noch nicht; bei Bedarf baue ich `GLRADIO.melde(text)`.

## Für Falko

- Hör bitte in jeden Sender hinein – ich konnte nur messen, nicht hören.
- Sollen die Moderatoren auch mit ElevenLabs sprechen dürfen (kostet Guthaben)? Bisher nur auf ausdrücklichen Haken im Handy.
