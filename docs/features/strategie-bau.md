# Ratscher von oben – den Pavillon bauen und den Garten von oben (feat/strategie-bau)

Falkos Wunsch (5.11.2026, `docs/plans/plan_strategie.md` Abschnitte 4, 6, 12, 13): der Pavillon als großes Ziel, Bauphase für Bauphase wie die
Zeitalter in Age of Empires – jede Phase ein echtes Projekt; dazu der Garten von oben gesteuert. Gebaut in der Nacht 5./6.11.2026 vom
Hilfs-Agenten `strategie-bau` (Auftrag `docs/plans/auftraege/strategie-bau.md`) auf dem Kern von `feat/strategie` (`docs/features/strategie.md`).

## Was es gibt

### Der Pavillon als Projekt (`strategie/st_bau.js`, Daten `strategie/st_bau_data.js`)
- **Orte:** „Bauplatz Pavillon“ (südlich der Garagenplatte) mit Feld: Baukasse, Vorbereitung, nächste Bauphase mit Kosten (gekauft oder mit
  eigenem Holz / im Eigenbau, inkl. 19 % Umsatzsteuer – die Preise in `pavilion/phases.js` sind netto), Lieferung, Wetterfenster der nächsten
  sieben Tage (✓/✗ mit Grund), „Warum?“ mit Quelle; „Bauamt (Landratsamt Hildburghausen)“, gut 8 km südlich.
- **Baukasse:** „Bauprojekt beginnen“ bucht die Ersparnisse für den Bau ein (Annahme 15.000 €, im Feld 0–60.000 €), dazu eine Sparrate am
  Monatsersten (Annahme 500 €, 0–1.500 €). Gesamtkosten nach `pavilion/phases.js`: netto 42–67 k€ (Variante B) bzw. 47–76 k€ (A), brutto
  50–91 k€, ohne Arbeitszeit.
- **Vorbereitung** (Kapitel 3 „Der Pavillon“ mit Zielen):
  1. *Garagenplatte freilegen und prüfen* (Rotationslaser, Bewehrungssuchgerät, zwei Ecken freigraben): Dicke, Bewehrung, Frostschürze,
     Ebenheit – erst wer gräbt, weiß es (Erkunden statt Nebel, `STRAT.reveal('bau', 'platte')`). Der Befund ist im Spiel einmal je Spielstand
     ausgewürfelt (die echte Platte zeigt erst das Freilegen); trägt sie nicht (unter 15 cm, unbewehrt oder ohne Frostschürze ≥ 80 cm),
     braucht es ein *Streifenfundament 30 × 80 cm* (Beton ab +5 °C).
  2. *Bauvoranfrage* beim Bauamt (nur werktags – also ein Urlaubstag): § 35 Abs. 1–3 BauGB (Außenbereich: ein „sonstiges Vorhaben“);
     verfahrensfrei wären ein eingeschossiges Gebäude bis 10 m² Grundfläche oder eine Garage bis 50 m², beides „außer im Außenbereich“
     (§ 63 Abs. 1 Nr. 1 Buchst. a und b ThürBO). Antwort nach sechs Wochen (Annahme).
  3. *Tragwerksplaner* (Statik): Gebäudeklasse 1 – in der Regel ohne Prüfingenieur; braucht den Befund der Platte. Vier Wochen (Annahme).
  4. *Bauantrag* (vereinfachtes Verfahren: das Bauamt prüft das Planungsrecht; Treppen, Brandschutz, Abstände verantwortet der Bauherr),
     Gebühr rund 0,5 % der Baukosten (Annahme), Bescheid nach acht Wochen, Baubeginn eine Woche nach der Anzeige.
  - Variante B: die **offene Frage der Leitertreppe** (§ 37 Abs. 1 und Abs. 2 Satz 2 ThürBO: notwendige Treppe ins Geschoss mit
    Aufenthaltsraum, Leitern nur zu Dachräumen ohne Aufenthaltsraum) steht im Feld.
- **Rechtsstand (geprüft 6.11.2026):** Thüringer Bauordnung (ThürBO) vom 2. Juli 2024 (GVBl. S. 298), geändert 2026 (GVBl. S. 150),
  landesrecht.thueringen.de – sie hat die alte ThürBO von 2014 neu nummeriert: Treppen **§ 37** (vorher § 34), verfahrensfreie Vorhaben
  **§ 63** (vorher § 60), vereinfachtes Verfahren **§ 65** (vorher § 62), Bauvorlageberechtigung § 67, bautechnische Nachweise § 72,
  Abweichungen § 73, Baubeginn § 78; Gebäudeklasse 1 § 2 Abs. 3 Satz 1 Nr. 1, Abstandsflächen § 6 Abs. 5 Satz 1 (0,4 H, mindestens 3 m),
  Bauschild § 11 Abs. 3, Umwehrungen § 41. Geprüft am Gesetzentwurf (Landtag, Drucksache 7/9641) und an Kommentar-/Gesetzesseiten
  (haufe.de zu § 65, gesetze.co zu § 63); nicht im Wortlaut gesehen und daher nach der Musterbauordnung zitiert: die Prüfung der Statik
  in Gebäudeklasse 1 (§ 66 Abs. 3 MBO), die Woche der Baubeginnsanzeige (§ 72 Abs. 8 MBO) und die Mindesthöhen der Umwehrung (§ 38 MBO).
  Der Text der Planung (`pavilion/phases.js`, Bauphase 22 B) nannte noch § 34 – berichtigt.
- **Die Bauphasen 1–30** (je ein Auftrag am Bauplatz, nur die nächste ist sichtbar): Leute (z. B. Phase 1 vier, mit Hubert und Traktor),
  Mindestkönnen „Bauen“, Christophs ständige Wirkung (Bauaufträge 15 % schneller), Hubert hilft bei schweren Teilen (15 % schneller),
  Dauer aus „Aufwand zu zweit“ (Personenstunden, größere Teams verlieren etwas an Abstimmung), laute Arbeiten unter den Ruhezeiten,
  **Wetterfenster** je Phase (z. B. Schweißbahn: trocken und ab +5 °C; EPDM-Kleber: trocken, ab +5 °C; Ständerwerk: Wind bis 40 km/h;
  Flämmen: Wind bis 20 km/h; innen ab der Hülle bei jedem Wetter; Lehmputz trocknet 14 Tage), Material vorher bestellt und geliefert
  (Baustoffhandel vier Tage, gekaufte Fenster acht Wochen, Türen sechs, Spindeltreppe sechs – Annahmen), Gerüst ab Phase 11 bis 25 (Miete
  läuft weiter, auch ohne Arbeit). Eine fertige Phase setzt die **Bauphase der Welt** (`setPhase`): die Ich-Sicht zeigt sie, und sie bleibt nach
  dem Neuladen (auch mit `?bauphase=0`).
- **Eigenes Holz:** Phasen mit Holz haben die Variante „Eigenes Holz“: Kantholz (≥ 45 mm, z. B. 52-mm-Bohlen der Blockbandsäge) muss trocken
  (< 20 %) und nach DIN 4074-1 sortiert sein (Auftrag „Bauholz sortieren“ im Holzlager: ein Sortierer, S10 ≙ C24, Bläue zählt nicht, Risse
  und Verdrehung schon); Bretter (Schalung, Fassade, Lattung) kommen trocken aus dem Stapel. Beim Beginn der Phase wird das Holz entnommen –
  der Trockenstapel in der Welt wird kleiner. Der ganze Pavillon (A) braucht rund 15 m³ Kantholz und 6 m³ Bretter; Eiche gibt die Klinge nicht.
- **Bauschild:** mit der Genehmigung steht am Gartentor (Nordwestecke, zum Feldweg) ein Schild „Baustelle – Gartenpavillon“ mit Bauherr,
  Entwurf und Statik, Bauleitung, Rohbau, Datum der Genehmigung und der Bauphase (§ 11 Abs. 3 ThürBO) – in beiden Linsen, bis Phase 30.
- **Was wäre, wenn:** das Feld schätzt, wann der Pavillon fertig wäre (Wochenenden zu dritt, die Sparrate, Lieferzeiten, ein Drittel der
  Wochenenden ohne Wetter für außen) und ob Geld oder Zeit bremst; dazu der **Geldplan** (was noch offen ist, wie weit die Kasse reicht, wie
  viele Monate Sparrate der Rest braucht) und die Dauer der nächsten Phase in Arbeitstagen.
- **Zeitalter:** zu den drei des Kerns kommen „Das Ständerwerk steht“ (5), „Das Obergeschoss“ (11), „Unter Dach“ (16), „Die schwarze Hülle“ (21),
  „Innenausbau“ (26), „Der Pavillon steht“ (30). Ebene „Bauen“ auf der Karte: nächste Phase und was ihr fehlt.

### Der Garten von oben (`strategie/st_garten.js`)
- **Orte:** „Obstgarten (Gartenplaner)“ (Mitte der geplanten Pflanzen) mit Liste: geplant, gekauft (unterwegs / am Gartentor), gepflanzt mit
  Alter, Höhe, Schutz, was ansteht; „Baumschule Kammbach (Kloster Veßra)“.
- **Aufträge** über denselben Zustand wie zu Fuß (`pav-gplan-v1`): *Vorschlag* – zwei Apfelbäume ‚Rebella‘ und ihr Befruchter ‚Rewena‘
  (Äpfel sind selbststeril) mit Abstand zu Grenze und Gebäuden; *Kaufen* in Kammbach (Euro mit Wühlmauskorb, Pfahl, Verbissschutz –
  Annahmen; Lieferung am nächsten Morgen ans Gartentor, `gplan/gplan_shop.js` zeigt die Töpfe dort); *Pflanzen* Schritt für Schritt
  (`GPGAME.apply`: Loch, Korb, Pfahl, Baum, Anbinden, Angießen – nur in der Pflanzzeit der Datenbank, nicht in gefrorenen Boden);
  *Gießen* in den ersten zwei Sommern; *Verbiss- und Stammschutz* (mit feat/tiere: `TIERE.schutz.add({ kind: 'huelle' })`, sonst ein
  kleines eigenes Modell: ungeschützte junge Bäume werden im Winter und Frühjahr verbissen – weniger Ernte); *Schneiden* im Spätwinter;
  *Ernten* (ins Erntebuch des Planers und in den Vorrat **Obst** der Leiste – auch was zu Fuß gepflückt wird, über `gplan:geerntet`);
  Äpfel halten im Keller Monate, Kirschen Tage; *Verschenken* an Hubert und Ronald (Gefallen, Stil) und *Verkaufen* auf dem Markt in
  Schleusingen (Annahme 2,80 €/kg, Standgebühr); *Einkochen* im Bungalow (Obst → Mahlzeiten im Vorrat „Essen“ des Kerns, ein Jahr haltbar).
  Ronald kennt die alten Sorten: mit ihm gehen Schnitt und Ernte 25 % schneller. Der Vorschlag hält 4 m zur Grenze (Gesetz: 2 m für
  Kernobst auf starker Unterlage, § 44 Nr. 2 Buchst. b ThürNRG – die Krone soll nicht überhängen). Ebene „Garten“: 🌳 gepflanzt, 💧 durstig,
  🍎 reif, ! ohne Verbissschutz, ✂ verbissen, 📦 am Gartentor. Jeder Auftrag sagt, warum, mit Quelle.

## Testen
- Ohne Browser: `node --test viz3/test/unit/strategie_bau.test.mjs` (Personenstunden, eigenes Holz je Position, Kosten mit Umsatzsteuer,
  Wetterfenster, Platte, Klima, Quellen).
- Im Browser: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9005 --serve strategie_bau` (Abschnitte `bau,garten,welt,reload`);
  auf GitHub über `viz3/extra/strategie-bau/tests.txt` (dazu der Test des Kerns `strategie`), Bilder in `out/strategie_bau/`.

## API (window.STBAU, window.STGARTEN)
- `STBAU.st()` – der Zustand (`STRAT.S.ext.bau`: `ph`, `platte`, `vb`, `statik`, `gen`, `waits`, `order`, `mat`, `kvh`, `konto`, `spent`);
  `STBAU.built()`, `next()`, `begin()`, `costOf(n, 'kauf' | 'eigen')`, `missingFor(n)`, `windowDays(n)`, `wxAt(t)` (mit Temperatur),
  `tempOf(t)` (feat/wetter nahe der Uhr, sonst das Klima von Meiningen), `forcePlatte = { thick, rebar, apron, flat }` (Tests).
- KERN-Ereignis `strategie:bau` `{ what: 'start' | 'platte' | 'vorbescheid' | 'statik' | 'genehmigung' | 'streifen' | 'phase', ph }`,
  `strategie:obst` `{ id, kg }`.
- `STGARTEN.planted()`, `planned()`, `toBuy()`, `obstKg()`, `takeObst(kg)`, `guarded(x)`.
- Für `strategie-dorf` (Ansehen): Obst verschenken ruft `STRAT.favour` und `STRAT.style`; ein Ansehen-API des Dorfs kann sich an
  `strategie:obst` und den Auftrag `g_schenken` hängen.

## Offen
- Die Wege zum Bauamt und zur Baumschule laufen in `STRAT.W.path` über die Klinge (der Kern kennt nur diese eine Route) – nur die
  gezeichnete Linie und die Fahrzeit sind davon betroffen.
- Kein eigener Säge-Auftrag für Kanthölzer 6/14 (die 52-mm-Bohlen des Kerns zählen als Kantholz); Material liegt nicht sichtbar als Stapel
  auf dem Bauplatz; der Variantenwechsel A/B wird von oben nicht angeboten (Menü der Welt).
- Die Ergebnisse von Bauamt und Statik sind im Spiel angenommen (im Text so gesagt) – die echte Frage bleibt beim Bauamt.

## Für den Lead
- Neue Module in `viz3/src/modules.txt`, Block `# feat/strategie-bau` direkt unter `strategie/st_hud.js`: `strategie/st_bau_data.js`,
  `strategie/st_bau.js`, `strategie/st_garten.js`.
- Eine gemeinsame Datei, markiert `// feat/strategie-bau`: `viz3/src/pavilion/phases.js` (Bauphase 22 B, Prüfpunkt Baurecht: „§ 37, bis 2024 § 34“
  statt „§ 34“ – die neue ThürBO vom 2. Juli 2024). Der Auftrag (`docs/plans/auftraege/strategie-bau.md`) nennt ebenfalls noch § 34.
- Sonst keine Änderung an gemeinsamen Dateien; die Bauphase der Welt über `setPhase` aus
  `game/walkable.js`, der Garten über `GPLAN`/`GPGAME` (öffentliche API), das Holz über `HOLZSAW.boards`/`HOLZDRY.rebuild`.
- Gespeichert in `pav-strat-v1` unter `ext.bau` und `ext.garten` (geprüft bei jedem Lesen) – kein neuer Schlüssel.
- Neue `window`-Namen: `STBAU`, `STGARTEN`.
- Quellen nur als Text in den Daten (BauGB, ThürBO, Musterbauordnung, DIN 1054, DIN 4074-1, DIN EN 1912, DIN 18065, DIN 18516-1, DIN EN ISO 9972,
  DIN EN 206/1045-3, EN 300, VdS 2008, DGUV Information 201-011, Flachdachrichtlinie, DWD-Klima, Merkblatt Baurecht der Stadt Erfurt,
  Pflanzen-Datenbank des Gartenplaners) – keine Zeile in `buildlib/credits.py` nötig.
