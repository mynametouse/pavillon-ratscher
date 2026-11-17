# Bewuchs: Pflanzen – Gräser, Wildblumen, ihr Jahr, die Pflege je Flächenart, der Blumenatlas (Branch `feat/bewuchs-pflanzen`)

Das **Was** der Vorlage für den Bewuchs (Plan `docs/plans/plan_bewuchs.md`, Auftrag `docs/plans/auftraege/bewuchs-pflanzen.md`): jede Grasart
und Wildblume der Region als Daten, die die Vorlage des Straßen-Chats zeichnet (`viz3/src/bewuchs/`), dazu ein Bildatlas der Blumen in eigener
Zeichnung. Das **Wo** (Karten der Flächenart, Klassen 0–17) macht `bewuchs-daten`. Stand 17.11.2026, Teil 1 (Gräser, Wildblumen, Flächen);
Teil 2 (Büsche und Beetpflanzen) folgt auf Zuruf.

## Was es gibt

| Datei | Inhalt |
|---|---|
| `viz3/src/bewuchs/bw_arten.js` | `BWARTEN = { v: 1, gras, blumen, flaechen, atlas, farbjahr, quellen }` – rein (kein three.js, kein DOM; `window.BWARTEN` nur zur Übergabe an die Seite), Modulzeile unter `# feat/bewuchs-pflanzen` gleich nach `core/detail.js`, damit jedes Bewuchs-Modul es importieren kann |
| `viz3/extra/bewuchs-pflanzen/dist/bewuchs/blumen.png` | der Atlas: 1024 × 1024 RGBA, 8 × 8 Zellen zu 128 px, Zelle (Spalte, Zeile) von oben links (~1 MB) |
| `viz3/extra/bewuchs-pflanzen/dist/bewuchs/blumen.json` | je Zelle: `id`, `bild` (Bild der Art), `arten` (wer die Zelle benutzt), `breite`, `oben`, `deckung`, `farbe`, `toenen` |
| `tools/bewuchs/pflanzen/atlas.py` | der Zeichner des Atlas (Python, Pillow, numpy, scipy) |
| `viz3/extra/bewuchs-pflanzen/manifest.json`, `tests.txt` | eine Zeile in „Quellen und Lizenzen“; kein Browsertest in der CI (die Daten prüft der Unit-Test) |
| `viz3/test/unit/bewuchs_arten.test.mjs` | Prüfung ohne Browser (in `tools/check.sh`): Felder und Bereiche, Kalender als geordnete Tagesfenster 1–366, jede Zelle da und von der richtigen Art, jede Klasse 0–17, Grasanteile = 1, Quellen, PNG 1024² RGBA < 3 MB, ein plausibles Jahr |
| `viz3/test/bewuchs_pflanzen.py` | nur zum Ansehen (von Hand, nicht in der CI): die Pflanzen als gekreuzte Bildkarten auf vier Flecken im Garten bei (12, 11) – Zierrasen, Mähwiese, Bankett, Saum – an Tagen im April, Juni, August, Oktober; Bilder nach `out/bewuchs_pflanzen/` |

**Umfang:** 23 Gräser und Grasartige, 34 Wildblumen, Kräuter und Bodenpflanzen, 18 Flächenarten, 64 Atlaszellen (56 Blumenbilder, davon
6 von mehreren Arten geteilte Blatt- und Trockenbilder, und 8 Grasähren), 70 Quellen (13 Werke und Stellen, 57 Artikel).

## Wie die Vorlage die Daten liest (Vorschlag; die Regeln stehen auch im Kopf von `bw_arten.js`)

- **Tag des Jahres** (1–366) aus dem Spieldatum, wie `world/forest.js` `doyNow()`. Die Fenster gelten für ~450 m in Südthüringen (Ratscher,
  Schleusingen).
- **Blume, Bild am Tag d:** jede Pflanze verschiebt den Kalender um ihren eigenen Wert in ± `streuung_tage` (aus dem Hash ihres Orts);
  das Fenster von `jahr`, in dem der verschobene Tag liegt, nennt das Bild. Hat das Fenster einen Anteil (4. Wert), zeigen nur so viele
  Pflanzen dieses Bild, die anderen ihre Blätter (`blatt`, falls die Art ein Blattbild hat) – ist das Fenster selbst `blatt`, zeigen die
  anderen nichts. Tage außerhalb aller Fenster: nichts über dem Gras.
- **Höhe:** zufällig in `hoehe_m` × `bilder[bild].hoehe` × `wuchs[Monat]` (nur für die lebenden Bilder `blatt`, `knospe`, `bluete`;
  `samen` und `frucht` sind die alten Stängel und stehen in voller Höhe). Die Bildkarte ist **Höhe / `oben`** hoch (aus `blumen.json`: wie
  weit die Zeichnung in der Zelle reicht – fast immer ~0,97; nur sechs breite Blattrosetten enden bei 0,82–0,90).
- **Breite der Karte:** quadratisch gezeichnet (keine Verzerrung). Wer Überzeichnen sparen will, macht die Karte nur `breite` × Höhe breit
  und nimmt aus der Zelle nur die Mitte (u von 0,5 − breite/2 bis 0,5 + breite/2) – so macht es der Test.
- **Schnitt:** ein Schnitt nimmt, was steht. Danach: nichts bis `blatt_tage`, dann Blätter; nach `nach_schnitt_tage` blüht sie wieder,
  wenn der Tag nicht nach `nachbluete_bis` liegt (`null`: nicht mehr in diesem Jahr), etwa 60 % so lange wie ihre normale Blüte, dann
  Blätter. Fenster, die erst nach dem Schnitt beginnen (Herbstzeitlose im September), gelten wie im Kalender.
- **Gras:** Halmlänge `halm_m` (ungemäht) begrenzt durch die Höhe der Fläche; Breite `breite_mm`, Biegung `biegung`, Glanz `glanz`,
  Wuchs `horst` (Bulten: Knaulgras, Rasen-Schmiele, Binse) / `locker` / `rasen` (gleichmäßig: Rot-Schwingel, Quecke, Wiesen-Rispe).
  **Farbe** nach Jahreszeit: `farbjahr` gibt Ankertage (frisch, sommer, herbst, winter) zum Überblenden; `trocken` kommt aus dem Wetter
  (Trockenheit), nicht aus dem Kalender. **Ähre/Rispe:** von `aehre.von` bis `bis` grün blühend (Zelle `zelle`, Farbe `farbe`), bis
  `reif_bis` reif und strohfarben (`reif_zelle`, `reif_farbe`), danach weg (oder gemäht); `ueber_m` über den Blättern, `anteil` der Büschel
  trägt eine. Die Grasähren-Zellen sind hell und fast neutral gezeichnet: Farbe = Texel × `farbe` / `farbe` der Zelle (aus `blumen.json`).
- **Fläche:** `gras` (Anteile, Summe 1) und `blumen` (Pflanzen je m² auf dem Höhepunkt der Art), `dichte` (Anteil der Halme der Kachel),
  `hoehe` (`gemaeht_m`, `max_m` = die Masse der Halme, Ähren und Blumen stehen darüber; `wachstum_cm_tag` je Monat; `winter` = was im Winter
  stehen bleibt), `pflege` – `rasen` (alle `alle_tage[Monat]` Tage von `von` bis `bis`, je Grundstück ± `streuung_tage` versetzt),
  `schnitt` (Schnitttage `doy` ± `streuung_tage` **je Feld**, `anteil` der Felder; Bankett mit `rand`: der Streifen an der Fahrbahn
  zusätzlich; `heu_tage`: so lange liegt das Heu), `weide` (Zeitraum, verbissene Höhe, Geilstellen, Trittstellen), `keine`.
  `farbe.duerre` / `farbe.schatten`: Zielfarbe und Stärke zum Mischen; `kahl`: Anteil, Fleckgröße, Bodenfarbe, Moos im Schatten
  (Bankett: `rand_m` kiesig am Fahrbahnrand; Sportrasen: `tritt` vor den Toren). `kraft`: Faktoren für Dichte, Höhe, Blumen bei Wuchskraft
  0 und 7 (Bits 5–7 der Karte) – eine fette Wiese hat weniger Blumen als eine magere.
- Klassen ohne eigenen Bewuchs in Teil 1: 0 (nichts), 9 (Acker – Feldfrüchte mit Stufe 5), 13 (Beet), 14 (Gemüse – beides Teil 2); sie haben
  `dichte: 0` und einen `hinweis`.

## Die Arten

### Wildblumen und Kräuter (Fenster einer mittleren Pflanze; die Wiese als Ganzes ± `streuung_tage` breiter)

| Art | Höhe (m) | Blüte | Samen/Frucht | blüht wieder nach Schnitt | Zellen (Spalte/Zeile) |
|---|---|---|---|---|---|
| Löwenzahn | 0,06–0,35 | 21.4.–14.5., 24.8.–17.10. (25 %) | Pusteblume 15.5.–28.5. | 5 Tage | blatt 0/0, knospe 1/0, bluete 2/0, samen 3/0 |
| Gänseblümchen | 0,03–0,12 | März (40 %), April–19.6., Sommer (55 %), Herbst (40 %) | – | 3 Tage | bluete 4/0 |
| Weißklee | 0,05–0,2 | 27.5.–23.9. | – | 10 Tage | blatt 6/0, bluete 5/0 |
| Rotklee (Wiesenklee) | 0,15–0,5 | 25.5.–22.9. | – | 35 Tage | blatt 6/0, bluete 7/0 |
| Scharfer Hahnenfuß | 0,3–0,9 | 8.5.–21.6., bis 2.9. (30 %) | – | 30 Tage | blatt 1/1, bluete 0/1 |
| Wiesen-Schaumkraut | 0,15–0,45 | 19.4.–20.5. | – | – | bluete 2/1 |
| Spitzwegerich | 0,1–0,45 | 6.5.–7.9. | – | 14 Tage | blatt 4/1, bluete 3/1 |
| Breitwegerich | 0,05–0,25 | Rosette mit Ähren 10.4.–1.11. | – | 14 Tage | bluete 5/1 |
| Wiesen-Margerite | 0,3–0,7 | 28.5.–9.7. | 10.7.–31.7. | 45 Tage | blatt 0/2, bluete 6/1, samen 7/1 |
| Wiesen-Glockenblume | 0,2–0,6 | 23.5.–14.7. | – | 40 Tage | blatt 0/2, bluete 1/2 |
| Wiesen-Storchschnabel | 0,3–0,8 | 13.6.–29.7. | – | 40 Tage | blatt 1/1, bluete 2/2 |
| Wiesen-Flockenblume | 0,3–0,8 | 18.6.–12.9., bis 12.10. (25 %) | – | 35 Tage | blatt 0/2, bluete 3/2 |
| Wiesen-Pippau | 0,3–1,1 | 24.5.–9.7. | – | 30 Tage | blatt 0/0, bluete 4/2 |
| Vogel-Wicke | 0,3–1 | 18.6.–20.8. | – | 40 Tage | bluete 5/2 |
| Wiesen-Labkraut | 0,3–0,9 | 22.5.–31.7. | – | 30 Tage | bluete 6/2 |
| Echtes Johanniskraut | 0,3–0,8 | 21.6.–16.8. | – | 40 Tage | bluete 7/2 |
| Gemeine Schafgarbe | 0,15–0,6 | 14.6.–27.9. | trocken 28.9.–1.12. | 30 Tage | blatt 2/3, bluete 0/3, samen 1/3 |
| Wilde Möhre | 0,3–1 | 24.6.–23.8. | Vogelnest 24.8.–11.11. | 40 Tage | blatt 2/3, bluete 3/3, samen 4/3 |
| Wiesen-Bärenklau | 0,5–1,5 | 7.6.–17.7. | 18.7.–20.8. | 35 Tage | blatt 7/3, bluete 5/3, samen 6/3 |
| Wiesen-Kerbel | 0,5–1,4 | 2.5.–3.6. (weiß an jedem Straßenrand) | 4.6.–1.7. | – | blatt 2/3, bluete 0/4, samen 1/4 |
| Rainfarn | 0,5–1,3 | 1.7.–19.9. | trocken bis in den Winter | 50 Tage | blatt 2/3, bluete 2/4, samen 1/3 |
| Gemeine Wegwarte | 0,3–1,2 | 4.7.–25.9. (offen 6–13 Uhr) | – | 30 Tage | blatt 0/0, bluete 3/4 |
| Klatschmohn | 0,25–0,8 | 29.5.–9.7. | Kapseln 10.7.–6.8. | – | blatt 2/3, bluete 4/4, frucht 5/4 |
| Kornblume | 0,3–0,8 | 7.6.–29.7. | – | – | blatt 0/2, bluete 6/4 |
| Echte Kamille | 0,15–0,5 | 24.5.–3.8., bis 7.9. (40 %) | – | – | blatt 2/3, bluete 7/4 |
| Herbstzeitlose | 0,15–0,35 | 26.8.–19.10. (ohne Blätter) | Blätter mit Kapsel 5.4.–21.6. | – | blatt 1/5, bluete 0/5 |
| Acker-Kratzdistel | 0,5–1,4 | 28.6.–14.8. | Wolle 15.8.–25.9. | 40 Tage | blatt 4/5, bluete 2/5, samen 3/5 |
| Große Brennnessel | 0,5–1,6 | (grün) 26.3.–6.11. | – | – | blatt 5/5 |
| Drüsiges Springkraut | 0,8–2 | 8.7.–12.10. (bis zum Frost) | – | 30 Tage | blatt 7/5, bluete 6/5 |
| Roter Fingerhut | 0,5–1,5 | 14.6.–31.7. | – | – | blatt 1/6, bluete 0/6 |
| Echtes Mädesüß | 0,6–1,5 | 18.6.–6.8. | – | 50 Tage | blatt 3/6, bluete 2/6 |
| Schmalblättriges Weidenröschen | 0,6–1,5 | 4.7.–16.8. | Samenwolle 17.8.–22.9. | – | blatt 0/2, bluete 4/6, samen 5/6 |
| Wurmfarn | 0,4–1 | Wedel 30.4.–16.11., braun ab 12.10. | – | – | blatt 6/6 |
| Heidelbeere | 0,15–0,45 | Laub 20.4.–16.11., rot ab 2.10.; Beeren 4.7.–18.8. (als Punkte) | – | – | blatt 7/6 |

Geteilte Blattbilder (sehen bei 5–60 px gleich aus): Löwenzahn-Rosette 0/0 (Löwenzahn, Wegwarte, Pippau), Klee 6/0, gelappt 1/1 (Hahnenfuß,
Storchschnabel), lanzettlich 0/2 (Margerite, Glockenblume, Flockenblume, Kornblume, Weidenröschen), gefiedert 2/3 (Schafgarbe, Wilde Möhre,
Wiesenkerbel, Rainfarn, Klatschmohn, Kamille), trockene Dolden 1/3 (Schafgarbe, Rainfarn im Herbst und Winter).

### Gräser und Grasartige

| Gras | Halm (m) | Breite (mm) | Ähre/Rispe blüht | reif bis | Kopf (Zelle) |
|---|---|---|---|---|---|
| Deutsches Weidelgras | 0,1–0,3 | 2–5 | 1.6.–14.7. | 23.8. | Ähre 3/7 |
| Wiesen-Rispengras | 0,08–0,3 | 2–4 | 20.5.–4.7. | 13.8. | Rispe 0/7, reif 1/7 |
| Einjähriges Rispengras | 0,03–0,1 | 2–3 | 1.3.–16.11. | 26.11. | Rispe |
| Gewöhnliches Rispengras | 0,05–0,2 | 2–5 | 30.5.–14.7. | 18.8. | Rispe |
| Rot-Schwingel | 0,1–0,4 | 0,5–1,5 | 9.6.–19.7. | 28.8. | Rispe |
| Rotes Straußgras | 0,05–0,15 | 1–4 | 24.6.–13.8. | 17.9. | luftig 5/7 |
| Glatthafer | 0,15–0,4 | 4–8 | 7.6.–24.7. | 2.9. | Rispe |
| Wiesen-Goldhafer | 0,1–0,25 | 2–5 | 4.6.–14.7. | 23.8. | Rispe |
| Wiesen-Knäuelgras | 0,15–0,45 | 4–10 | 30.5.–14.7. | 28.8. | Knäuel 4/7 |
| Wiesen-Fuchsschwanzgras | 0,1–0,4 | 3–8 | 8.5.–14.6. | 29.7. | Ährenrispe 2/7 |
| Wiesen-Lieschgras | 0,1–0,4 | 3–9 | 14.6.–3.8. | 7.9. | Ährenrispe |
| Wiesen-Schwingel | 0,1–0,35 | 3–6 | 30.5.–9.7. | 23.8. | Rispe |
| Wolliges Honiggras | 0,05–0,2 | 3–10 | 14.6.–13.8. | 17.9. | luftig |
| Gewöhnliches Ruchgras | 0,03–0,15 | 2–5 | 30.4.–14.6. | 19.7. | Ährenrispe |
| Wiesen-Kammgras | 0,03–0,15 | 1–4 | 19.6.–3.8. | 27.10. | Ähre |
| Rasen-Schmiele | 0,15–0,6 | 2–5 | 19.6.–18.8. | 27.10. | luftig |
| Draht-Schmiele | 0,1–0,3 | 0,3–0,8 | 19.6.–8.8. | 17.9. | luftig |
| Kriech-Quecke | 0,1–0,3 | 3–10 | 19.6.–13.8. | 17.9. | Ähre |
| Gemeiner Windhalm | 0,05–0,25 | 2–6 | 14.6.–3.8. | 28.8. | luftig |
| Rohr-Glanzgras | 0,5–1,4 | 8–18 | 19.6.–3.8. | 7.10. | Rispe |
| Sumpf-Segge | 0,4–1 | 5–12 | 10.5.–24.6. | 17.9. | Ährchen 7/7 |
| Flatter-Binse | 0,3–1 | 1,5–3 | 9.6.–18.8. | 16.11. | Ährchen |
| Schilfrohr | 1–2,5 | 10–30 | 3.8.–17.9. | über den Winter | Wedel 6/7 |

### Flächenarten (Klassen von `bewuchs-daten`)

| Klasse | Gräser (Hauptanteile) | Blumen je m² (Auswahl) | Höhe gemäht–max (m) | Pflege |
|---|---|---|---|---|
| 0 nichts | – | – | – | – |
| 1 zierrasen | Weidelgras 40 %, Wiesen-Rispe 25 %, Rot-Schwingel 20 % | Gänseblümchen 8, Weißklee 4, Löwenzahn 1,5, Spitzwegerich 0,5 | 0,04–0,25 | Rasen 10.4.–22.10., im Mai/Juni wöchentlich, im Sommer alle 10 Tage |
| 2 oeffentlich | Weidelgras 35 %, Wiesen-Rispe 20 %, Rot-Schwingel 20 % | Gänseblümchen 6, Weißklee 4, Löwenzahn 2, Spitzwegerich 1 | 0,05–0,35 | sieben Schnitte Ende April bis Mitte Oktober (Bauhof, alle 3–4 Wochen) |
| 3 bankett | Glatthafer 25 %, Knaulgras 20 %, Quecke 15 % | Schafgarbe 1,5, Wiesenkerbel 1,2, Labkraut 1, Löwenzahn 1 | 0,08–0,6 | 9.6. ± 15, 7.9. ± 15; der Streifen 1 m an der Fahrbahn zusätzlich ~19.7. |
| 4 maehwiese | Glatthafer 22 %, Knaulgras 14 %, Goldhafer 12 % | Hahnenfuß 3, Margerite 2, Rotklee 2, Löwenzahn 1,5 | 0,07–0,7 | Heu 11.6. ± 12, 16.8. ± 12, auf 30 % der Wiesen 2.10. ± 10 |
| 5 weide | Weidelgras 30 %, Wiesen-Rispe 15 %, Kammgras 12 % | Weißklee 4, Gänseblümchen 3, Löwenzahn 1,5, Hahnenfuß 1,5 | 0,06–0,4 | beweidet 1.5.–31.10., Geilstellen 15 %, Tritt 4 % |
| 6 streuobst | Glatthafer 25 %, Knaulgras 16 %, Goldhafer 10 % | Hahnenfuß 2, Löwenzahn 2, Margerite 1,2, Rotklee 1,2 | 0,08–0,65 | 29.6. ± 12, 12.9. ± 15 (60 %) |
| 7 saum | Glatthafer 30 %, Knaulgras 20 %, Quecke 20 % | Brennnessel 2,5, Labkraut 1, Rainfarn 1, Distel 0,8 | 0,1–0,9 | spät, jedes zweite Jahr: 2.10. ± 20 (50 %) |
| 8 ufer | Rohr-Glanzgras 30 %, Sumpf-Segge 20 %, Rasen-Schmiele 15 % | Mädesüß 2, Brennnessel 2, Springkraut 1,5, Schaumkraut 1 | 0,1–1 | 27.9. ± 20 (30 %) |
| 9 acker | – | – | – | Stufe 5 |
| 10 ackerrand | Quecke 45 %, Windhalm 30 %, Weidelgras 10 % | Klatschmohn 2,5, Kamille 2, Kornblume 1,2, Distel 0,6 | 0,1–0,6 | folgt dem Acker |
| 11 waldboden | Draht-Schmiele 70 %, Straußgras 15 %, Honiggras 15 % | Heidelbeere 2, Farn 1,5, Fingerhut 0,2, Brennnessel 0,2 | 0,3–0,35 | – |
| 12 gebuesch | Quecke 40 %, Knaulgras 30 %, Glatthafer 30 % | Brennnessel 2, Labkraut 0,3, Distel 0,2 | 0,2–0,6 | – (Sträucher: Teil 2) |
| 13 beet, 14 gemuese | – | – | – | Teil 2 |
| 15 verkehrsgruen | Rot-Schwingel 35 %, Weidelgras 30 %, Wiesen-Rispe 20 % | Gänseblümchen 3, Weißklee 3, Löwenzahn 1, Schafgarbe 1 | 0,06–0,3 | 25.5., 14.7., 12.9. (80 %), je ± 8 |
| 16 friedhof | Weidelgras 35 %, Wiesen-Rispe 25 %, Rot-Schwingel 25 % | Gänseblümchen 8, Weißklee 4, Löwenzahn 1, Spitzwegerich 0,5 | 0,05–0,25 | Rasen 15.4.–17.10., alle 14 Tage |
| 17 sportrasen | Weidelgras 60 %, Wiesen-Rispe 40 % | Gänseblümchen 2, Weißklee 1, Löwenzahn 0,3 | 0,035–0,15 | Rasen 5.4.–27.10., alle 4–7 Tage, Streifen |

## Der Atlas

Jede Zelle ist eine Pflanze von der Seite und leicht von oben (Blütenköpfe zur Kamera geneigt), der Stängelfuß unten in der Mitte; die
Zeichnung wird nach dem ersten Zeichnen um den Fuß skaliert, bis ihre Spitze die Zelle füllt (oder ihre Seiten an den Rand stoßen –
`oben` in `blumen.json`). Gezeichnet mit 4-facher Auflösung (512 px) im Malerverfahren: Stängel als verjüngte Striche mit Lichtkante,
Blätter mit Mittelrippe und zwei Tönen (die Hälfte zum Licht heller), gesägte, gelappte, gefiederte und schrotsägeförmige Blätter, Blüten
als Kränze aus Blütenblättern im Raum (hinten dunkler, gewölbt, nach vorn zur Kamera), Dolden aus Strahlen und Döldchen, Köpfchen aus
Röhrenblüten auf einer Kugel, Glocken, Trauben, Pusteblumen und Samenwolle durchscheinend; dann zum Fuß hin dunkler (sie steht im Gras),
ein feines Rauschen gegen den glatten Rechnerlook, und im linearen Licht auf 128 px verkleinert (16 Abtastungen je Bildpunkt). Durchsichtige
Bildpunkte tragen die Farbe des nächsten Pflanzenteils, weiter weg die mittlere Farbe der Pflanze – so mischen Mipmaps nur Pflanzenfarben
(kein dunkler oder weißer Rand). Blüten sind etwa 1,3–1,5-mal größer als in echt, damit sie bei 5–60 px auf dem Bildschirm noch als
Farbtupfen lesbar bleiben; Stängel sind mindestens ~1,5 px breit.

**Neu bauen:** `nice -n 10 python3 tools/bewuchs/pflanzen/atlas.py` (≈ 20–40 s, fester Zufall je Zelle, gleiches Ergebnis) schreibt
`viz3/extra/bewuchs-pflanzen/dist/bewuchs/blumen.png` und `blumen.json`; mit `--sheets ORDNER` dazu Bögen zum Beurteilen
(`atlas_1zu1.png` mit Namen, `atlas_1zu4.png` wie bei 32 px, `atlas_rgb.png` nur die Farben, `wiese_bildschirm.png` eine Wiese in
Bildschirmgröße), mit `--only id,id` nur einzelne Zellen. Eine Zelle ändern: ihre Funktion `f_…` in `atlas.py`; eine neue Zelle: Zeile
in `LAYOUT` und in `bw_arten.js` (die Unit-Tests prüfen, dass beide zusammenpassen). Danach `cd viz3 && python3 build.py --fast`.

## Quellen und wie sicher

- **Pflege der Flächen** (belegt, abgerufen 17.11.2026): Rasen nach LWG Bayern „Basiswissen Rasenbau“ (Schnitthöhen: Zierrasen 2 cm,
  Gebrauchsrasen 3,5–4,5, Sportplatz 3–4, Landschaftsrasen 6–10 cm; Schnitte im Jahr: Zierrasen 30–60, Gebrauchsrasen 8–20, Sport 12–40;
  Gräser je Rasentyp). Mähwiesen nach dem HLNUG-Praxisblatt LRT 6510/6520 (1. Schnitt ab 15.6., 2. Schnitt 8–12 Wochen später; Berg-Mähwiesen
  ab 450 m – Ratscher liegt genau an der Grenze), dem TLLLR-Bergwiesenversuch Mordfleck (820 m: 1. Schnitt um den 20.6.) und der
  LfULG-Praxisempfehlung (Staffelmahd, ≥ 8 Wochen Ruhe, Altgrasstreifen). Bankette nach Hessen Mobil (Intensivbereich bis 2 m, 1. Schnitt
  April–Juni, 2. ab Juli, Schnitthöhe ~8 cm; Extensivbereich meist alle zwei Jahre im Spätsommer/Herbst; Arten am Rand) und LSBB
  Sachsen-Anhalt (mindestens 1 m neben der Fahrbahn; es verweist auf das bundesweite „Merkblatt für den Unterhaltungs- und Betriebsdienst
  an Straßen, Teil Grünpflege“). Zahlen der Thüringer Straßenmeistereien selbst habe ich nicht gefunden.
- **Phänologie** (belegt): HLNUG/INKLIM-Mittel für Hessen (Wiesen-Fuchsschwanz Vollblüte Tag 133 für 1991–2009, Knaulgras Blüte 153,
  Holunder 145, Heidekraut 225) und Kolodziej/Frühauf 2008 für Sachsen-Anhalt (Löwenzahn Blüte Tag 111) – für ~450 m um ~+5 Tage
  verschoben. Die übrigen Blütezeiten nach den Floren (Rothmaler, Flora von Thüringen, Oberdorfer für die Pflanzengesellschaften) und den
  Wikipedia-Artikeln der Arten, von denen 16 abgerufen und geprüft sind (Höhen und Blütemonate stimmen; danach Korrekturen bei Klatschmohn,
  Rainfarn, Rotklee, Sumpf-Segge, Labkraut, Pippau, Flatter-Binse, Weißklee); die anderen Artikel blockte die Wikipedia wegen zu vieler
  Abrufe – ihre Zahlen sind aus meinem Wissen der Floren und noch einmal zu prüfen.
- **Aus der Pflanzen-Datenbank des Gartenplaners übernommen:** Blütemonate und Farbe von Schafgarbe (Juni–Oktober, `#f4f0ea`) und Weißklee
  (Juni–September, `#f4f4ec`).
- **Geschätzt** (`eigen`): Pflanzen je m², Anteile der Gräser je Fläche, Dichte, die Wachstumsraten je Monat (aus dem Verlauf: Heuwiese
  von ~5 cm Anfang April auf 80–100 cm Anfang Juni ≈ 1,5–2 cm/Tag im Mai; Rasen 0,5–1 cm/Tag), Farben der Gräser und Blüten (sRGB,
  „wie es im Feld aussieht“), die Verschiebung der Tage für 450 m, die Faktoren für die Wuchskraft. Im Spiel zu prüfen und nachzustellen.

## Offen (Fragen an den Straßen-Chat)

- **`oben` und `breite`:** die Karten sind quadratisch gezeichnet; die Höhe einer Karte ist Höhe der Pflanze / `oben`, schmaler machen
  geht mit `breite`. Passt das zur Blumen-Vorlage, oder lieber eine feste Form (z. B. jede Zeichnung genau bis 1,0)?
- **Tönen der Grasähren:** neutral gezeichnet, Farbe je Art × Texel / Zellfarbe. Falls die Vorlage nicht tönen will, kann ich die
  Ähren-Zellen in fester Farbe zeichnen.
- **Mipmaps und Alpha-Test:** feine Stängel und Rispen werden in kleinen Mipmap-Stufen durchsichtiger und verschwinden beim Alpha-Test;
  helfen würden Alpha-to-Coverage oder eine Alpha-Skalierung je Stufe (die Mipmaps beim Laden selbst rechnen).
- **Herbstzeitlose:** giftig; auf Weiden gemieden, in Heuwiesen problematisch – nur geringe Dichte eingetragen.
- **Tageszeit:** `offen_h` (Löwenzahn, Gänseblümchen, Pippau, Wegwarte schließen sich abends bzw. Wegwarte mittags) – nur wenn die
  Vorlage es mag.
