# Grenzland – GTA-Modus passend zur Region (Plan)

Chat session_01L6Yrpf75YEUJPnMQdXevjQ, Branch `feat/grenzland`, Ordner `viz3/src/grenzland/`. Für Menschen: Projekt-Dokument
`claude/pavillon-gta.md`. Stand der Umsetzung: `docs/features/grenzland.md`.

## Falkos Wünsche (wörtlich)

- **13.11.2026, 0:21:** „Grundsätzlich frage ich mich, wie wir eine Variante reinbringen können, neben diesen verschiedenen Varianten, die wir
  schon haben, die letztendlich GTA 6 Vibes reinbekommen, um auch Spielspaß und ähnliche Stories, aber passend zur Region und zur Karte, die wir
  haben oder die gerade gebaut wird, passende Quests und überhaupt Gameplay Varianten hinbekommen, die möglichst nah an GTA 6 ranreichen.“
- **0:30, angeklickt:** Hauptgeschichte **Grenzland** (Schmuggel nach Bayern über die A73, Rückblenden auf 1989) · Hauptfiguren **Falko und
  Sarah** (umschaltbar wie Jason und Lucia; „nur, wenn Sarah das mag“) · Ton und Härte **wie GTA** (Satire, Verfolgungen, Kämpfe wie in der
  Zombie-Nacht, nur Erwachsene) · erster Schritt **alles**: Kapitel 1 mit 5 Missionen, Fahndung und Polizei, Handy und Radio, Fahrzeuge und
  Nebenbeschäftigungen.
- **0:30:** „Okay, bitte setzt das Ganze richtig gut um. Achte darauf, nicht mit den anderen Chats in die Quere zu kommen.“
- **0:32:** „Super, und achte bei den Rückblenden auf 1989 auch auf entsprechende Anpassungen von Umfeld, Kleidung, Stil, Fashion und
  sonstigen, sodass es wirklich gut ankommt und realistisch wirkt.“

## Leitlinien

- **Eigene Welt wie die Zombie-Nacht:** eigener Spielstand `pav-grenzland-v1`, Einstieg Menü → Erleben → Szenen → „Grenzland“ bzw.
  `?szenario=grenzland`; nichts läuft, bevor die Szene startet; nur für Erwachsene; nicht in Schul- und Workshop-Fassungen.
- **Echte Karte, erfundene Täter:** Ratscher, Schleusingen, Talsperre, Klinge, L 1625 wie im Modell – Gauner, Firmen und Opfer sind erfunden.
  Hubert, Ronald und echte Betriebe sind nie Täter oder Ziel (die Website ist öffentlich). Gerhard (Dorfchronist) und die anderen
  Dorfbewohner sind erfunden und dürfen Rollen spielen.
- **Nicht in die Quere kommen:** nur neue Dateien im eigenen Ordner; fremde Module werden gelesen, nicht geändert; in gemeinsamen Dateien nur
  die eigene Marke in `modules.txt` und eine Zeile in `core/save.js`; Stil und Elemente der Oberfläche baut das Modul selbst.
- **GTA-Ton:** Satire auf die Region (Grenzland-Folklore, Dorf-Chatgruppe, Lokalpresse, Radio), Freiheit, Verfolgungsjagden.

## Die Geschichte

- **Gegenwart:** eine Moped-Clique aus Schleusingen schafft Böller und Zigaretten aus Tschechien über Bayern ins Land; ein erfundener Spediteur
  steht dahinter und sucht etwas Größeres: eine Kiste, die im November 1989 an der Grenze verschwand.
- **Rückblenden 1989:** Gerhard, der Dorfchronist, war damals dabei. Gespielt wird der junge Gerhard in Ratscher im November 1989.
- **Bogen:** vom kleinen Gefallen über die Clique bis zum Bunker am alten Kolonnenweg an der Grenze zu Bayern.

## Kapitel 1 (erster spielbarer Schritt)

1. **Ein Gefallen:** Freitagabend, Ankunft mit dem echten Bus in Schleusingen. An der Zentralhaltestelle drückt ein Fremder dem Duo ein Paket in
   die Hand – „nach Ratscher, zur alten Schule“. Sarah schaut hinein: eine alte Grenzkarte von 1989 mit einem Kreuz. Handy und Radio.
2. **Die Clique:** Moped flottmachen und tanken, Rennen auf der L 1625 bis zur Talsperre um das Vertrauen der Clique.
3. **Gerhards Geschichte (1989):** Rückblende – der junge Gerhard bringt eine Kiste aus der alten Schule weg, bevor die Volkspolizei kommt.
   Erste Fahndung (Zeugen, hohle Sterne, Abtauchen in der Scheune).
4. **Nachts an der Klinge:** die Leute des Spediteurs treffen sich im Wald. Das Duo trennt sich – einer lenkt ab, einer fotografiert mit dem
   Handy –, dann Flucht: Streife über die Landstraße, Sperre auf der L 1625.
5. **Der Coup:** die zweite Hälfte der Karte liegt im Lager der erfundenen Spedition in Schleusingen. Weg wählen (leise oder laut), ausführen.
   Ende: die Karte zeigt auf einen Bunker am alten Kolonnenweg → Kapitel 2.

## Systeme

- **Fahndung nur über Zeugen:** Sterne gibt es nur, wenn jemand etwas sieht oder meldet; hohl, bis man erkannt ist. Stufen: Gerede → Streife
  (echte Anfahrt über die Landstraße) → mehrere Streifen und Sperre → Hubschrauber → Spezialkräfte. Abtauchen in Wald, Scheune, Garage; trennt
  sich das Duo, sinkt die Fahndung. 1989 mit Volkspolizei.
- **Duo:** jederzeit zwischen Falko und Sarah umschalten; später zu zweit über das Internet.
- **Fahrzeuge:** Moped (Simson-Art, ohne Marke), Streifenwagen, Tankstelle; 1989 Zweitakter und Volkspolizei ohne Marken.
- **Handy:** Nachrichten, Dorf-Chatgruppe, Regional-Feed, Karte, Bank. **Radio:** ein Satire-Sender mit Meldungen über die eigenen Taten.
- **Nebenbeschäftigungen:** Kegeln, Angeln an der Talsperre.

## 1989 – was die Rückblende glaubwürdig macht (Falko 0:32)

- **Umfeld:** Dorf ohne Bauten nach 1989, ohne Photovoltaik, Satellitenschüsseln, Wärmepumpen, moderne Autos, Mitfahrbank; graue und
  braune Putze, Kohlerauch aus den Schornsteinen, Kopfsteinpflaster und geflickter Asphalt, Freileitungen, Losungen, Konsum-Schild,
  gelbe Telefonzelle, Litfaßsäule, Briefkasten der Deutschen Post, Milchbank; Straßenlaternen mit warmem, schwachem Licht.
- **Kleidung und Frisuren:** späte 80er in der DDR – Dederon-Kittelschürzen, Wattejacken, Cordhosen, Strickjacken, Parka, Stonewashed-Jeans,
  Schnürstiefel; Dauerwelle, Vokuhila, Schnauzbart; Uniformen der Volkspolizei (graugrün) und der Grenztruppen (steingrau, grüner Ärmelstreifen).
- **Fahrzeuge:** Zweitakt-Kleinwagen mit Duroplast-Karosse, Kübel- und Kastenwagen, Mopeds, Traktor mit Hänger, Lkw mit Pritsche – ohne Marken.
- **Bild und Ton:** entsättigtes, leicht körniges Bild mit kühlen Schatten, Zweitakt-Geknatter, Kirchenglocke, Radio aus offenen Fenstern,
  Nachrichten vom 9. November.
- **Sprache:** Preise in Mark, Wörter der Zeit (Kaufhalle, Konsum, ABV, Westpaket, Grenzgebiet, Passierschein).

## Später

- Kapitel 2 mit einer neuen Detailzone an der alten Grenze (Kolonnenweg, Grünes Band) – Abstimmung mit dem Welt-Chat.
- Nebenstränge Käferholz, Simson-Sommer, Kirmes-Krimi; Coups von oben planen (Linse „Ratscher von oben“); zu zweit über das Internet;
  mehr Sender, Besitz kaufen, Jagd, Schützenfest.
