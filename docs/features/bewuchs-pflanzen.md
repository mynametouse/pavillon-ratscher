# Bewuchs: Pflanzen – Gräser, Wildblumen, Sträucher, Beete, ihr Jahr, die Pflege je Flächenart, zwei Bildatlanten (Branch `feat/bewuchs-pflanzen`)

Das **Was** der Vorlage für den Bewuchs (Plan `docs/plans/plan_bewuchs.md`, Auftrag `docs/plans/auftraege/bewuchs-pflanzen.md`): jede Grasart,
Wildblume, Strauch- und Beetpflanze der Region als Daten, die die Vorlage des Straßen-Chats zeichnet (`viz3/src/bewuchs/`), dazu zwei Bildatlanten
(Blumen, Beetpflanzen) in eigener Zeichnung. Das **Wo** (Karten der Flächenart, Klassen 0–17) macht `bewuchs-daten`. Teil 1 (Gräser, Wildblumen, Flächen, Blumenatlas)
17.11.2026, beim Straßen-Chat eingebaut; **Teil 2** (Sträucher mit Beeren, Beet- und Zierpflanzen, Beetvorlagen, zweiter Atlas) 18.11.2026 –
die Felder von Teil 1 sind unverändert, Teil 2 kommt dazu (`straeucher`, `beet`, `beetvorlagen`, `boden`, `lagen`, `atlas_beete`, und je
Flächenart `straeucher` und `beete`).

## Was es gibt

| Datei | Inhalt |
|---|---|
| `viz3/src/bewuchs/bw_arten.js` | `BWARTEN = { v: 1, gras, blumen, flaechen, straeucher, beet, beetvorlagen, boden, lagen, atlas, atlas_beete, farbjahr, quellen }` – rein (kein three.js, kein DOM; `window.BWARTEN` nur zur Übergabe an die Seite), Modulzeile unter `# feat/bewuchs-pflanzen` gleich nach `core/detail.js`, damit jedes Bewuchs-Modul es importieren kann |
| `viz3/extra/bewuchs-pflanzen/dist/bewuchs/blumen.png` | der Atlas: 1024 × 1024 RGBA, 8 × 8 Zellen zu 128 px, Zelle (Spalte, Zeile) von oben links (~1 MB) |
| `viz3/extra/bewuchs-pflanzen/dist/bewuchs/blumen.json` | je Zelle: `id`, `bild` (Bild der Art), `arten` (wer die Zelle benutzt), `breite`, `oben`, `deckung`, `farbe`, `toenen` |
| `tools/bewuchs/pflanzen/atlas.py` | der Zeichner des Atlas (Python, Pillow, numpy, scipy) |
| `viz3/extra/bewuchs-pflanzen/dist/bewuchs/beete.png`, `beete.json` | der zweite Atlas: die Beetpflanzen, gleiches Format (1024 × 1024 RGBA, 8 × 8 Zellen zu 128 px, ~1,25 MB); in `beete.json` zusätzlich `auch` (weitere Bilder derselben Art, die eine Zelle zeigt) |
| `tools/bewuchs/pflanzen/beete.py` | der Zeichner des zweiten Atlas (benutzt den Maler von `atlas.py`) |
| `viz3/extra/bewuchs-pflanzen/manifest.json`, `tests.txt` | eine Zeile in „Quellen und Lizenzen“; kein Browsertest in der CI (die Daten prüft der Unit-Test) |
| `viz3/test/unit/bewuchs_arten.test.mjs` | Prüfung ohne Browser (in `tools/check.sh`): Felder und Bereiche, Kalender als geordnete Tagesfenster 1–366, jede Zelle da und von der richtigen Art, jede Klasse 0–17, Grasanteile = 1, Quellen, PNG 1024² RGBA < 3 MB, ein plausibles Jahr; für Teil 2: EZ-Tree-Vorlagen und Optionspfade, Laub, Blüte und Frucht in Reihenfolge, „hängt im Winter“ passend zu den Fenstern, Mischungen je Fläche (Summe 1, nur Arten, die dort wachsen), jede Beetpflanze mit Zellen im zweiten Atlas, Vorlagen mit geordneten Phasen lebender Pflanzen |
| `viz3/test/bewuchs_pflanzen.py` | nur zum Ansehen (von Hand, nicht in der CI): die Pflanzen als gekreuzte Bildkarten auf vier Flecken zu 4 × 4 m – Zierrasen, Mähwiese, Bankett, Saum – auf dem freiesten 8 × 8 m des Gartenrasens, das der Test selbst aus den Rasenbüscheln (`GRASS.meshes`) sucht (17.11.: x −4…4, y −10…−2, südlich des Pavillons), an Tagen im April, Juni, August, Oktober; Bilder nach `out/bewuchs_pflanzen/` |

**Umfang:** Teil 1 – 23 Gräser und Grasartige, 34 Wildblumen, Kräuter und Bodenpflanzen, 18 Flächenarten, 64 Atlaszellen (56 Blumenbilder,
davon 6 von mehreren Arten geteilte Blatt- und Trockenbilder, und 8 Grasähren). Teil 2 – 34 Sträucher (14 wild, 20 im Garten, auf
Friedhof und Grünanlage), Strauchmischungen für 10 Flächenarten, 44 Beet- und Zierpflanzen (Wechselflor für Frühjahr, Sommer und Herbst,
Stauden, Ziergräser, Rosen, Bodendecker, Grabpflanzen, Gemüse), 10 Beetvorlagen, 64 Zellen im zweiten Atlas. 105 Quellen (14
Werke, Datensätze und Stellen, 91 Artikel).

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

### Teil 2: Sträucher (`straeucher`) – Vorschlag, die Regeln stehen auch über der Tabelle in `bw_arten.js`

- **Modell:** EZ-Tree wie die Bäume des Gartens (`garden/trees.js` `buildTreeKind`): `eztree.preset` und `seed`, dann jede Zeile von
  `eztree.mod` als Pfad in die Optionen (`'branch.angle.1': 28` → `o.branch.angle[1] = 28`; Blattbilder `ash`, `aspen`, `oak`, `pine`,
  Rinde `oak`, `birch`, `pine`, `willow` – alle in `dist/tree/`). `leaves.tint` setzt `buildTreeKind` selbst; die Farbe kommt aus `laub`
  über die Instanzfarbe wie bei `gplan_3d.js` (gewünschte Farbe / mittlere Farbe des Blattbilds). Das Modell auf `hoehe_m` × `breite_m`
  skalieren, je Busch zufällig im Bereich. Es sind wenige Vorlagen (`Bush 1` drei Ebenen, `Bush 2` zwei, `Bush 3` immergrün mit Nadeln) –
  ein Modell je Art mit eigenem `seed`, wiederverwendet mit Maßstab und Drehung.
- **Laub am Tag d** (jede Pflanze ± `streuung_tage` aus dem Hash ihres Orts, für Laub, Blüte und Frucht gleich): `sommergruen` – vor `austrieb[0]` und nach `fall[1]` kahl; von
  `austrieb[0]` bis `[1]` wachsen die Blätter (Menge 0 → 1) in `austrieb_farbe`, dann `farbe`; von `herbst[0]` bis `[1]` nach `herbst_farbe`;
  von `fall[0]` bis `[1]` fallen sie (Menge 1 → 0). `halbimmergruen` (Brombeere, Liguster) – wie sommergrün, aber nur bis auf etwa die Hälfte,
  den Winter über `winter_farbe`. `immergruen` – immer da, `farbe`, im Winter (Dezember bis Februar) Richtung `winter_farbe`, beim Austrieb
  kurz heller (`austrieb_farbe`). `trockenlaub` (geschnittene Hainbuchen- und Buchenhecken) – nach `herbst` bleiben die Blätter trocken braun
  (`winter_farbe`) am Busch, bis die neuen kommen (`fall` liegt im April).
- **Blüte und Frucht** als Punkte auf den Blattkarten (wie `gplan_3d.js` `dotsOn`): zwischen `bluete.von` und `bis` tragen `menge` der
  Blattkarten einen Punkt der Größe `groesse_m` in `farbe` (gibt es `farben`, wählt jeder Busch eine; `farben[0]` = `farbe`). `vor_laub`
  – die Blüten sitzen an kahlen Zweigen (Hasel, Salweide, Schlehe, Forsythie, Kornelkirsche): Punkte an den Zweigen, nicht an den
  Blattkarten. Frucht: in `gruen` mit `farbe_gruen`, in `reif` mit `farbe`, `form` und `groesse_m` wie bei der Blüte; über Neujahr zwei
  Fenster `[a, 366]` und `[1, b]`. `winter: true` – hängt am 1. Januar noch (am kahlen Busch gut zu sehen: Hagebutten, Schlehen, Weißdorn,
  Schneeball, Schneebeere, Feuerdorn, Liguster, die trockenen Blütenbälle der Hortensie). `essbar` (`ja`, `gekocht`, `nein`) für später
  (Beeren pflücken, `INVENTAR`).
- **Geschnitten:** `geschnitten: true` – die Gärtner schneiden die Form (`form` `kugel`, `saeule` oder `hecke`; `schnitt.art` `kugel` oder
  `hecke` an den Tagen `schnitt.doy`): die Hülle glatt zeichnen, die Blätter an der Hülle. `false` – natürlicher Umriss; ein `schnitt` mit
  `auslichten` oder `rueckschnitt` ändert ihn kaum (Ausnahme: `rueckschnitt` im März beim Sommerflieder und der Hortensie – danach klein,
  bis zum Sommer wieder voll; die trockenen Blüten sind dann weg). `schnitt: null` – nie geschnitten.
- **Fest:** ab `fest_ab_m` über dem Boden fest für Spieler und Fahrzeuge (Plan: ~1 m; Dickichte und Hecken tiefer), darunter durchgehbar.
- **Wo:** `flaechen[k].straeucher` – `je_100m2` Büsche je 100 m² der Klasse, `verteilung` `flaeche` (geschlossen, die ganze Fläche),
  `gruppen` (2–5 zusammen), `einzeln`, `rand` (entlang der Ränder der Fläche: Zaun, Grundstücksgrenze, Weg), `arten` die Anteile. `wo` (Klassen)
  und `lage` (`BWARTEN.lagen`: Feldhecke, Waldrand, Wegrand, Böschung, Ufer, Lichtung, Weide, Hausgarten, Vorgarten, Zaun, Hauswand, Hecke,
  Grünanlage, Friedhof, Grab, Beet) sagen, wo eine Art überhaupt steht – für Regeln (Hecken aus OSM, Büsche nach dem Höhenmodell) und die Prüfung
  (jede Art einer Mischung nennt die Klasse in `wo`). Keine Büsche auf 0, 3, 4, 9, 10, 15, 17; auf 13 nur die Buchs-Einfassung der
  Beetvorlagen.

### Teil 2: Beete (`beet`, `beetvorlagen`)

- **Beetpflanzen** lesen sich wie die Wildblumen (`hoehe_m`, `bilder`, `jahr`, `streuung_tage`, `wuchs`, `farbe`): das Fenster im `jahr`
  nennt das Bild, Tage außerhalb aller Fenster: nichts über der Erde. Die Bilder sind im zweiten Atlas (`atlas_beete`, `beete.png`); eine Zelle
  mit `auch` zeigt mehrere Bilder derselben Art (die junge Kartoffel ist die große, kleiner – über `bilder[bild].hoehe`). `bilder_varianten`:
  weitere Zellen desselben Bilds in anderer Farbe (Tulpe rot und gelb) – jede Pflanze wählt eine nach ihrem Hash. Beete werden nicht gemäht:
  kein `nach_schnitt_tage`. `gruppe` `wechselflor` (mit `saison` `fruehjahr`, `sommer`, `herbst`), `staude`, `ziergras`, `rose`,
  `bodendecker`, `grab`, `gemuese`; `abstand_m` Pflanzabstand.
- **Ein Beet:** die Vorlage aus `flaechen[k].beete` (Anteile, je Beet aus dem Hash), zuerst aber nach der Lage, wenn sie bekannt ist (Markt,
  Rathaus, Kirche → `wechselflor` oder `kuebel`; Kreisel → `kreisel`; Insel, Mittelstreifen → `verkehrsinsel`; Grab → `grab`; Vorgarten eines
  neueren Hauses → `kiesbeet`; Dorf → `bauerngarten`). `rand` als Kante, `boden` als Bodenfarbe (`BWARTEN.boden`: Erde, dunkle Gartenerde,
  Rindenmulch, Kies, Splitt), `dichte_m2` Pflanzen je m² im `raster` (`gitter` gleichmäßig, `reihen` im Abstand `reihe_m`, `frei` Gruppen von
  3–7 gleichen). Die Phase, in der der Tag liegt, nennt die Pflanzen mit Anteilen; jede zeigt darin ihr eigenes `jahr`. Zwischen zwei Phasen
  leere Erde (das Umpflanzen). `decke: 'tannengruen'` – Tannenreisig über dem Beet (die Pflanze `tannengruen` dicht), die übrigen Anteile
  (Efeu, Immergrün, eine Zwergkonifere, Heide) schauen heraus.
- **Wechselflor** dreimal im Jahr: Frühjahr 16.3.–18.5. (Tulpen, Stiefmütterchen, Vergissmeinnicht, Narzissen), Sommer nach den Eisheiligen
  22.5.–7.10. (Geranien, Begonien, Tagetes), Herbst 11.10.–21.11. (Heide, Chrysanthemen), im Winter Tannengrün; Gräber ebenso, mit Efeu und
  Immergrün das ganze Jahr.

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
| Herbstzeitlose | 0,15–0,35 | 2.9.–19.10. (ohne Blätter) | Blätter mit Kapsel 5.4.–21.6. | – | blatt 1/5, bluete 0/5 |
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
| Wiesen-Fuchsschwanzgras | 0,1–0,4 | 3–8 | 15.5.–19.6. | 2.8. | Ährenrispe 2/7 |
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
| 12 gebuesch | Quecke 40 %, Knaulgras 30 %, Glatthafer 30 % | Brennnessel 2, Labkraut 0,3, Distel 0,2 | 0,2–0,6 | – (die Sträucher: Teil 2, unten) |
| 13 beet, 14 gemuese | – | – | – | Beetvorlagen (Teil 2, unten) |
| 15 verkehrsgruen | Rot-Schwingel 35 %, Weidelgras 30 %, Wiesen-Rispe 20 % | Gänseblümchen 3, Weißklee 3, Löwenzahn 1, Schafgarbe 1 | 0,06–0,3 | 25.5., 14.7., 12.9. (80 %), je ± 8 |
| 16 friedhof | Weidelgras 35 %, Wiesen-Rispe 25 %, Rot-Schwingel 25 % | Gänseblümchen 8, Weißklee 4, Löwenzahn 1, Spitzwegerich 0,5 | 0,05–0,25 | Rasen 15.4.–17.10., alle 14 Tage |
| 17 sportrasen | Weidelgras 60 %, Wiesen-Rispe 40 % | Gänseblümchen 2, Weißklee 1, Löwenzahn 0,3 | 0,035–0,15 | Rasen 5.4.–27.10., alle 4–7 Tage, Streifen |

### Sträucher (Fenster einer mittleren Pflanze bei ~450 m; jede Pflanze ± `streuung_tage` = 5)

| Strauch | Höhe (m) | Laub | Blüte | Frucht reif | im Winter | wo (Flächenarten) | geschnitten |
|---|---|---|---|---|---|---|---|
| Schwarzer Holunder | 2,5–6 | 29.3.–11.11. | 3.6.–25.6. | 31.8.–12.10. (gekocht) | – | gebuesch, saum, ufer, waldboden, streuobst, zierrasen | nein |
| Roter Holunder (Traubenholunder) | 1,5–4 | 5.4.–1.11. | 20.4.–15.5. | 29.6.–13.8. (gekocht) | – | waldboden, saum, gebuesch | nein |
| Eingriffeliger Weißdorn | 2–6 | 10.4.–8.11. | 20.5.–7.6. | 7.9.–30.1. (ja) | hängt | gebuesch, saum, weide, streuobst | nein |
| Schlehe | 1–3 | 30.4.–6.11. | 22.4.–10.5. (vor dem Laub) | 12.9.–14.2. (ja) | hängt | gebuesch, saum, weide | nein |
| Hundsrose | 1,5–3 | 10.4.–8.11. | 4.6.–26.6. | 8.9.–1.3. (gekocht) | hängt | gebuesch, saum, weide, streuobst | nein |
| Gemeine Hasel | 3–6 | 15.4.–14.11. | 27.2.–25.3. (vor dem Laub) | 2.9.–2.10. (ja) | – | gebuesch, saum, ufer, zierrasen | nein |
| Brombeere | 0,5–2 | halb immergrün, 10.4.–31.12. | 14.6.–24.7. | 3.8.–17.9. (ja) | – | gebuesch, saum, waldboden, ufer | nein |
| Himbeere | 1–2 | 12.4.–8.11. | 30.5.–19.6. | 2.7.–31.7. (ja) | – | waldboden, saum, gemuese, zierrasen | nein (auslichten) |
| Roter Hartriegel | 2–4 | 15.4.–8.11. | 30.5.–19.6. | 7.9.–22.10. (nein) | – | gebuesch, saum, ufer, oeffentlich | nein |
| Pfaffenhütchen | 2–4 | 15.4.–8.11. | 20.5.–9.6. | 12.9.–26.11. (nein) | – | gebuesch, saum | nein |
| Sal-Weide | 3–8 | 15.4.–14.11. | 28.3.–18.4. (vor dem Laub) | – | – | ufer, saum, gebuesch, waldboden | nein |
| Gewöhnlicher Schneeball | 2–4 | 12.4.–8.11. | 25.5.–14.6. | 2.9.–19.2. (nein) | hängt | ufer, gebuesch, saum | nein |
| Besenginster | 0,8–2 | immergrün | 15.5.–14.6. | 20.7.–28.8. (nein) | – | saum, gebuesch, waldboden | nein |
| Kornelkirsche | 3–6 | 15.4.–8.11. | 25.3.–16.4. (vor dem Laub) | 31.8.–2.10. (ja) | – | gebuesch, saum, zierrasen, oeffentlich | nein |
| Rote Johannisbeere | 1–1,5 | 5.4.–4.11. | 24.4.–10.5. | 7.7.–10.8. (ja) | – | zierrasen, gemuese | nein (auslichten) |
| Schwarze Johannisbeere | 1,2–1,8 | 5.4.–4.11. | 22.4.–8.5. | 9.7.–2.8. (ja) | – | zierrasen, gemuese | nein (auslichten) |
| Stachelbeere | 0,8–1,2 | 31.3.–1.11. | 20.4.–4.5. | 12.7.–3.8. (ja) | – | zierrasen, gemuese | nein (auslichten) |
| Gemeiner Flieder | 2,5–5 | 10.4.–21.11. | 13.5.–30.5. | – | – | zierrasen, friedhof, oeffentlich | nein (rueckschnitt) |
| Forsythie | 1,5–3 | 20.4.–16.11. | 5.4.–27.4. (vor dem Laub) | – | – | zierrasen, oeffentlich, friedhof | nein (auslichten) |
| Garten-Hortensie | 0,8–1,5 | 20.4.–11.11. | 4.7.–17.9. | 18.9.–21.3. (nein) | hängt | zierrasen, friedhof | nein (rueckschnitt) |
| Schmetterlingsflieder (Sommerflieder) | 2–3 | 15.4.–26.11. | 9.7.–22.9. | 23.9.–16.3. (nein) | hängt | zierrasen, saum | nein (rueckschnitt) |
| Kupfer-Felsenbirne | 3–6 | 10.4.–4.11. | 15.4.–5.5. | 18.6.–19.7. (ja) | – | zierrasen, oeffentlich | nein |
| Gewöhnliche Schneebeere | 1–2 | 2.4.–16.11. | 9.6.–18.8. | 14.8.–1.3. (nein) | hängt | oeffentlich, zierrasen, friedhof, saum | nein |
| Bauernjasmin (Falscher Jasmin) | 2–3 | 15.4.–14.11. | 7.6.–29.6. | – | – | zierrasen, oeffentlich, friedhof | nein (auslichten) |
| Weigelie | 1,5–2,5 | 15.4.–14.11. | 20.5.–19.6. | – | – | zierrasen, oeffentlich | nein (auslichten) |
| Pracht-Spiere | 1,5–2,5 | 10.4.–11.11. | 8.5.–28.5. | – | – | oeffentlich, zierrasen, friedhof | nein (auslichten) |
| Rhododendron | 1–2,5 | immergrün | 20.5.–11.6. | – | – | zierrasen, friedhof, oeffentlich | nein |
| Feuerdorn | 1,5–3 | immergrün | 25.5.–14.6. | 3.9.–1.3. (nein) | hängt | zierrasen, oeffentlich, friedhof | nein (rueckschnitt) |
| Buchsbaum (Kugel, Einfassung) | 0,3–1,2 | immergrün | – | – | – | zierrasen, friedhof, beet | ja (kugel) |
| Lebensbaum (Thuja, Hecke und Säule) | 1,5–5 | immergrün | – | – | – | zierrasen, friedhof | ja (hecke) |
| Eibe (Hecke, Kegel) | 1–4 | immergrün | – | 14.8.–27.10. (nein) | – | friedhof, zierrasen, oeffentlich | ja (hecke) |
| Gewöhnlicher Liguster (Hecke) | 1–3 | halb immergrün, 15.4.–31.12. | 14.6.–4.7. | 12.9.–1.3. (nein) | hängt | zierrasen, oeffentlich, friedhof, saum, gebuesch | ja (hecke) |
| Kirschlorbeer (Hecke) | 1,2–3 | immergrün | 5.5.–25.5. | 4.8.–17.9. (nein) | – | zierrasen, friedhof, oeffentlich | ja (hecke) |
| Hainbuchenhecke (auch Rotbuche) | 1,2–2,5 | trockenes Laub über Winter, Austrieb 15.4. | – | – | – | zierrasen, friedhof, oeffentlich | ja (hecke) |

Dazu je Art: Breite, Wuchsform, Dichte, Dornen, fest ab, Laubfarben (Austrieb, Sommer, Herbst, Winter), Blüten- und Fruchtfarbe, -form,
-größe und -menge, EZ-Tree-Vorlage mit Änderungen – siehe `bw_arten.js`.

### Sträucher je Flächenart (`flaechen[k].straeucher`)

| Klasse | Sträucher je 100 m² | Verteilung | Arten (Hauptanteile) |
|---|---|---|---|
| 1 zierrasen | 1,2 | rand | Rote Johannisbeere 10 %, Gemeiner Flieder 8 %, Forsythie 8 %, Lebensbaum 8 %, Stachelbeere 7 % |
| 2 oeffentlich | 0,6 | gruppen | Forsythie 14 %, Gewöhnliche Schneebeere 12 %, Gemeiner Flieder 10 %, Gewöhnlicher Liguster 10 %, Pracht-Spiere 10 % |
| 5 weide | 0,05 | einzeln | Eingriffeliger Weißdorn 45 %, Hundsrose 30 %, Schlehe 25 % |
| 6 streuobst | 0,08 | einzeln | Hundsrose 40 %, Eingriffeliger Weißdorn 35 %, Schwarzer Holunder 25 % |
| 7 saum | 0,5 | gruppen | Schwarzer Holunder 16 %, Schlehe 14 %, Eingriffeliger Weißdorn 12 %, Hundsrose 12 %, Brombeere 12 % |
| 8 ufer | 0,7 | gruppen | Sal-Weide 30 %, Brombeere 18 %, Schwarzer Holunder 15 %, Gewöhnlicher Schneeball 15 %, Roter Hartriegel 12 % |
| 11 waldboden | 0,3 | gruppen | Himbeere 35 %, Brombeere 30 %, Roter Holunder 20 %, Schwarzer Holunder 8 %, Sal-Weide 4 % |
| 12 gebuesch | 10 | flaeche | Schlehe 20 %, Eingriffeliger Weißdorn 18 %, Hundsrose 12 %, Schwarzer Holunder 12 %, Gemeine Hasel 10 % |
| 14 gemuese | 0,6 | rand | Rote Johannisbeere 35 %, Stachelbeere 25 %, Himbeere 25 %, Schwarze Johannisbeere 15 % |
| 16 friedhof | 0,8 | rand | Lebensbaum 28 %, Eibe 15 %, Buchsbaum 15 %, Gewöhnlicher Liguster 8 %, Rhododendron 8 % |

### Beet- und Zierpflanzen (`beet`, Bilder im zweiten Atlas)

- wechselflor (9): Tulpe, Narzisse, Stiefmütterchen, Vergissmeinnicht, Geranie, Eis-Begonie, Studentenblume, Besenheide, Garten-Chrysantheme
- staude (9): Lavendel, Katzenminze, Gelber Sonnenhut, Roter Sonnenhut, Hohe Fetthenne, Herbst-Aster, Pfingstrose, Weicher Frauenmantel, Stockrose
- ziergras (4): Chinaschilf, Garten-Reitgras, Lampenputzergras, Blau-Schwingel
- rose (2): Beetrose, Bodendeckerrose
- bodendecker (2): Teppich-Zwergmispel, Fingerstrauch
- grab (5): Efeu, Kleines Immergrün, Zwergkonifere, Buchskugel, Tannengrün
- gemuese (13): Kopfsalat, Weißkohl und Wirsing, Zwiebel, Möhre, Lauch, Kartoffel, Stangenbohne, Tomate, Kürbis und Zucchini, Rhabarber, Garten-Erdbeere, Dahlie, Sonnenblume

### Beetvorlagen (`beetvorlagen`; je Flächenart `flaechen[k].beete`: 13 Staudenbeet 30 %, Bauerngarten 25 %, Rosenbeet 15 %, Kiesbeet 15 %,
Wechselflor 10 %, Kübel 5 %; 14 Gemüsegarten 85 %, Bauerngarten 15 %; 15 Verkehrsinsel 70 %, Kreisel 30 %; 16 Grab 90 %, Rosenbeet 10 %)

| Vorlage | wo | Rand | Boden | Pflanzen je m² | Phasen |
|---|---|---|---|---|---|
| wechselflor | beet, oeffentlich | bordstein | erde | 14 | 1.1.–15.3.: Tannengrün; 16.3.–18.5.: Stiefmütterchen, Tulpe, Vergissmeinnicht, Narzisse; 22.5.–7.10.: Geranie, Eis-Begonie, Studentenblume; 11.10.–21.11.: Besenheide, Garten-Chrysantheme; 22.11.–31.12.: Tannengrün |
| kuebel | oeffentlich, beet | pflaster | erde | 12 | 1.1.–20.3.: Zwergkonifere, Tannengrün; 21.3.–18.5.: Stiefmütterchen, Narzisse; 22.5.–7.10.: Geranie, Eis-Begonie; 11.10.–26.11.: Besenheide, Garten-Chrysantheme; 27.11.–31.12.: Zwergkonifere, Tannengrün |
| staudenbeet | beet, oeffentlich | rasenkante | rindenmulch | 6 | 1.1.–31.12.: Lavendel, Katzenminze, Gelber Sonnenhut, Hohe Fetthenne … |
| rosenbeet | beet, oeffentlich, friedhof | buchs | erde | 6 | 1.1.–31.12.: Beetrose, Lavendel |
| bauerngarten | beet, gemuese | buchs | erde | 5 | 1.1.–31.12.: Pfingstrose, Dahlie, Tulpe, Beetrose … |
| kiesbeet | beet | pflaster | kies | 3 | 1.1.–31.12.: Blau-Schwingel, Lavendel, Hohe Fetthenne, Zwergkonifere … |
| grab | friedhof | grabstein | erde | 10 | 1.1.–16.3.: Efeu, Besenheide, Kleines Immergrün, Zwergkonifere, Tannengrün; 17.3.–20.5.: Stiefmütterchen, Efeu, Kleines Immergrün, Zwergkonifere; 21.5.–2.10.: Efeu, Eis-Begonie, Geranie, Kleines Immergrün …; 3.10.–18.11.: Besenheide, Efeu, Kleines Immergrün, Zwergkonifere; 19.11.–31.12.: Efeu, Besenheide, Kleines Immergrün, Zwergkonifere, Tannengrün |
| verkehrsinsel | verkehrsgruen | bordstein | rindenmulch | 2,5 | 1.1.–31.12.: Teppich-Zwergmispel, Bodendeckerrose, Fingerstrauch, Garten-Reitgras … |
| kreisel | verkehrsgruen, oeffentlich | bordstein | splitt | 7 | 1.1.–31.12.: Garten-Reitgras, Blau-Schwingel, Gelber Sonnenhut, Hohe Fetthenne … |
| gemuesegarten | gemuese | brett | erde_dunkel | 6 | 1.1.–31.12.: Kartoffel, Weißkohl und Wirsing, Kopfsalat, Zwiebel … |

## Die Atlanten

### Der Blumenatlas (Teil 1)

Jede Zelle ist eine Pflanze von der Seite und leicht von oben (Blütenköpfe zur Kamera geneigt), der Stängelfuß unten in der Mitte; die
Zeichnung wird nach dem ersten Zeichnen um den Fuß skaliert, bis ihre Spitze die Zelle füllt (oder ihre Seiten an den Rand stoßen –
`oben` in `blumen.json`). Gezeichnet mit 4-facher Auflösung (512 px) im Malerverfahren: Stängel als verjüngte Striche mit Lichtkante,
Blätter mit Mittelrippe und zwei Tönen (die Hälfte zum Licht heller), gesägte, gelappte, gefiederte und schrotsägeförmige Blätter, Blüten
als Kränze aus Blütenblättern im Raum (hinten dunkler, gewölbt, nach vorn zur Kamera), Dolden aus Strahlen und Döldchen, Köpfchen aus
Röhrenblüten auf einer Kugel, Glocken, Trauben, Pusteblumen und Samenwolle durchscheinend; dann zum Fuß hin etwas dunkler (sie steht im Gras; mild, weil die Vorlage die Wurzel selbst abdunkelt),
ein feines Rauschen gegen den glatten Rechnerlook, und im linearen Licht auf 128 px verkleinert (16 Abtastungen je Bildpunkt). Durchsichtige
Bildpunkte tragen die Farbe des nächsten Pflanzenteils, weiter weg die mittlere Farbe der Pflanze – so mischen Mipmaps nur Pflanzenfarben
(kein dunkler oder weißer Rand). Blüten sind etwa 1,3–1,5-mal größer als in echt, damit sie bei 5–60 px auf dem Bildschirm noch als
Farbtupfen lesbar bleiben; Stängel sind mindestens ~1,5 px breit.

**Neu bauen:** `nice -n 10 python3 tools/bewuchs/pflanzen/atlas.py` (≈ 20–40 s, fester Zufall je Zelle, gleiches Ergebnis) schreibt
`viz3/extra/bewuchs-pflanzen/dist/bewuchs/blumen.png` und `blumen.json`; mit `--sheets ORDNER` dazu Bögen zum Beurteilen
(`atlas_1zu1.png` mit Namen, `atlas_1zu4.png` wie bei 32 px, `atlas_rgb.png` nur die Farben, `wiese_bildschirm.png` eine Wiese in
Bildschirmgröße), mit `--only id,id` nur einzelne Zellen. Eine Zelle ändern: ihre Funktion `f_…` in `atlas.py`; eine neue Zelle: Zeile
in `LAYOUT` und in `bw_arten.js` (die Unit-Tests prüfen, dass beide zusammenpassen). Danach `cd viz3 && python3 build.py --fast`.

### Der Beetatlas (Teil 2)

Gleiches Format und gleicher Maler (`beete.py` importiert `atlas.py`): Zwiebelblumen, Stiefmütterchen, Vergissmeinnicht, Geranien mit dem
dunklen Ring im Blatt, Begonien, Tagetes, Heide, Chrysanthemenpolster, Lavendel, Katzenminze, Sonnenhut mit Kegel, Fetthenne in drei Stufen,
Astern, Pfingstrosen, Frauenmantel, Chinaschilf als Fontäne und mit Federn, Blau-Schwingel, Stockrosen, Rosen, Zwergmispel mit Beeren,
Fingerstrauch, Efeu, Immergrün, Zwergkonifere, Buchskugel, Tannenreisig und das Gemüse in seinen Stufen (Salat, Kohl, Zwiebeln, Möhren,
Lauch, Kartoffeln mit Blüte und welkem Kraut, Stangenbohnen, Tomaten am Stab, Kürbis, Rhabarber, Erdbeeren, Dahlien, Sonnenblumen). Reitgras
und Lampenputzergras teilen sich die Zellen des Chinaschilfs (bei 5–60 px gleich), der Fingerstrauch ohne Blüte das Blattbild der Stauden.
**Neu bauen:** `nice -n 10 python3 tools/bewuchs/pflanzen/beete.py [--sheets ORDNER]` (≈ 15 s, fester Zufall, gleiches Ergebnis) schreibt
`beete.png` und `beete.json`; Bögen `beete_1zu1.png`, `beete_1zu4.png`, `beete_rgb.png`, `beete_bildschirm.png`. Eine Zelle: Funktion in
`beete.py`, Zeile in `LAYOUT2` und in `bw_arten.js` (`beet[id].bilder`).

Für die Sträucher gibt es keinen Atlas: Blüten und Beeren sind Punkte auf den Blattkarten (Plan 4.3). Falls sie aus der Nähe als Dolden,
Trauben und Kätzchen zu sehen sein sollen, kann ich einen dritten Atlas mit Blüten- und Fruchtständen zeichnen (`straeucher.png`, ~40 Zellen).

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
- **Teil 2, Phänologie der Sträucher** (belegt): DWD, Climate Data Center, phänologische Jahresmelder (Wildpflanzen und Obst, „historical“,
  1995–2024), alle Stationen im Umkreis von 75 km um Schleusingen in 250–750 m Höhe (62–129 Stationen je Art und Phase); der Wert bei 450 m aus einer
  Geraden durch die Stationsmittel über der Höhe (+4 bis +7 Tage je 100 m). Daraus: Blühbeginn von Hasel, Sal-Weide, Kornelkirsche,
  Forsythie, Schlehe, Flieder, Weißdorn (zweigriffelig, gilt für beide), Holunder, Hundsrose, Johannis- und Stachelbeere; reife Früchte von
  Holunder und Hundsrose; Pflückreife von Johannis- und Stachelbeere; Austrieb und Blattentfaltung der Stachelbeere. Ende der Blüte, Laubfärbung und -fall der
  Sträucher sind nicht gemeldet: aus den Floren, geeicht an Rotbuche und Eberesche derselben Stationen (unten) – die Laubfenster der Sträucher
  liegen um deren Tage (Holunder, Hasel und Flieder behalten ihr Laub länger, Hartriegel und Pfaffenhütchen färben früher). Die Werte (Tag
  des Jahres):

  | Art | Phase | bei 450 m | alle Meldungen: Median (mittlere Hälfte) | Stationen | in der Tabelle |
  |---|---|---|---|---|---|
  | Hasel | Blühbeginn | 58 | 55 (39–70) | 118 | Blüte 58–84 |
  | Sal-Weide | Blühbeginn | 87 | 83 (75–93) | 121 | 87–108 |
  | Kornelkirsche | Blühbeginn, reife Früchte | 84, 243 | 80 (70–92), 239 (230–249) | 74, 62 | 84–106, ab 243 |
  | Forsythie | Blühbeginn | 95 | 92 (84–101) | 129 | 95–117 |
  | Schlehe | Blühbeginn | 112 | 109 (101–116) | 119 | 112–130 (vorher 100–118) |
  | Rote Johannisbeere | Blühbeginn, Pflückreife | 114, 188 | 112 (105–118), 185 (177–193) | 124, 127 | 114–130, ab 188 |
  | Stachelbeere | Austrieb, Blattentfaltung, Blühbeginn, Pflückreife | 83, 96, 110, 193 | 81, 93, 108 (101–115), 190 (182–198) | 123–126 | Laub ab 90, Blüte 110–124, ab 193 |
  | Flieder | Blühbeginn | 133 | 129 (123–135) | 129 | 133–150 |
  | Zweigriffliger Weißdorn | Blühbeginn, reife Früchte | 136, 250 | 133 (127–139), 248 (240–257) | 120, 110 | eingriffelig 140–158, ab 250 |
  | Schwarzer Holunder | Blühbeginn, reife Früchte | 154, 243 | 152 (145–160), 240 (231–248) | 126, 124 | 154–176, ab 243 (vorher 150, 238) |
  | Hundsrose | Blühbeginn, reife Früchte | 155, 251 | 153 (146–160), 250 (240–259) | 124, 121 | 155–177, ab 251 (vorher 158) |
  | Löwenzahn (Teil 1) | Blühbeginn | 110 | 108 (101–114) | 129 | ab 111 – stimmt |
  | Wiesen-Fuchsschwanz (Teil 1) | Blühbeginn, Vollblüte | 135, 141 | 133 (126–140), 139 (131–147) | 115 | Ähre ab 135 (vorher 128) |
  | Wiesen-Knäuelgras (Teil 1) | Vollblüte | 155 | 154 (146–161) | 120 | Rispe ab 150 – stimmt |
  | Herbstzeitlose (Teil 1) | Blühbeginn | 246 | 245 (236–253) | 29 | ab 245 (vorher 238) |
  | Heidekraut | Blühbeginn | 222 | 222 (216–228) | 86 | die Knospenheide der Beete ist eine Gartenform (ab 245) |
  | Rotbuche (zum Eichen des Laubs) | Blattentfaltung, Verfärbung, Blattfall (je die Hälfte) | 118, 281, 299 | 117 (112–121), 283 (276–290), 300 (294–307) | 110–120 | Hainbuchenhecke: Austrieb 105–125, Herbst 280–305 |
  | Eberesche (zum Eichen des Laubs) | Austrieb, Blattentfaltung, Blattfall | 99, 112, 286 | 98, 110 (104–116), 289 (280–296) | 116–122 | Sträucher: Laub fällt meist 290–318 |

  Teil 1 ist damit an zwei Stellen verschoben (Wiesen-Fuchsschwanz +7 Tage, Herbstzeitlose +7, die Felder bleiben); Hasel, Kornelkirsche und
  Salweide streuen von Jahr zu Jahr um Wochen (milde Winter), die Tabelle hat das mittlere Jahr.
- **Teil 2, aus der Pflanzen-Datenbank des Gartenplaners übernommen:** Höhen, Breiten, Laub-, Blüten-, Frucht- und Herbstfarben von Holunder,
  Hasel, Hundsrose, Johannis- und Stachelbeere, Kornelkirsche, Felsenbirne (und die Blütemonate, wo der DWD nichts hat).
- **Teil 2, aus den Floren** (Rothmaler, Flora von Thüringen; Artikel der Wikipedia zu jeder Art verlinkt, aber nicht abgerufen – die
  Wikipedia sperrt diese Maschine): Höhen, Wuchsformen, Dornen, Fruchtfarben, wo die Arten wachsen (Besenginster auf dem sauren Buntsandstein
  um Schleusingen, Kornelkirsche eher auf Kalk), Giftigkeit.
- **Teil 2, geschätzt** (`eigen`): Sträucher je 100 m² und die Anteile je Flächenart, Pflanzen je m² und Zusammensetzung der Beetvorlagen,
  Pflanz- und Wechseltage (Eisheilige, Totensonntag), Schnitttage der Gärten, Blühfenster der Beet- und Gartenpflanzen ohne DWD-Meldung
  (Hortensie, Sommerflieder, Weigelie, Bauernjasmin, Rhododendron, Feuerdorn, Stauden, Wechselflor, Gemüse), alle Farben, die EZ-Tree-Änderungen
  (nicht im Spiel angesehen – keine Browserläufe).

## Offen (Fragen an den Straßen-Chat)

- **`oben` und `breite`:** die Karten sind quadratisch gezeichnet; die Höhe einer Karte ist Höhe der Pflanze / `oben`, schmaler machen
  geht mit `breite`. Passt das zur Blumen-Vorlage, oder lieber eine feste Form (z. B. jede Zeichnung genau bis 1,0)?
- **Tönen der Grasähren:** neutral gezeichnet, Farbe je Art × Texel / Zellfarbe. Falls die Vorlage nicht tönen will, kann ich die
  Ähren-Zellen in fester Farbe zeichnen.
- **Mipmaps und Alpha-Test:** feine Stängel und Rispen werden in kleinen Mipmap-Stufen durchsichtiger und verschwinden beim Alpha-Test;
  helfen würden Alpha-to-Coverage oder eine Alpha-Skalierung je Stufe (die Mipmaps beim Laden selbst rechnen).
- **Im Spiel gesehen (Test, 17.11.):** mit `side: DoubleSide` dreht three die Normale der Rückseite nach unten – die halbe Wiese wird
  dunkel (gelb → braun); der Test zeichnet jede Karte deshalb zweimal mit Vorderseite und Normale nach oben. Aus der Nähe (< ~2 m) sind
  die 128-px-Zellen vergrößert und wirken grob; eine Fassung mit 256-px-Zellen (2048², ~3,5 MB) kann der Zeichner ohne Änderung der Daten
  rechnen, falls die Vorlage Blumen so nah zeigt. Die Blattbilder wirken im Test etwas dunkler als der helle Gartenrasen – tönt die
  Vorlage sie nicht mit dem Boden, hebe ich die Grüntöne um ~20 % an.
- **Herbstzeitlose:** giftig; auf Weiden gemieden, in Heuwiesen problematisch – nur geringe Dichte eingetragen.
- **Tageszeit:** `offen_h` (Löwenzahn, Gänseblümchen, Pippau, Wegwarte schließen sich abends bzw. Wegwarte mittags) – nur wenn die
  Vorlage es mag.
- **Teil 2, Name:** die Sträucher heißen `straeucher` (wie im Auftrag vom 17.11.), nicht `buesche`.
- **Teil 2, EZ-Tree:** die Änderungen (`eztree.mod`) sind nur aus den Vorlagen und der Art geschätzt, nicht angesehen; bitte im Spiel
  prüfen. Für Buchskugeln, Thuja und geschnittene Hecken ist eine eigene Hülle (Kugel, Säule, Quader mit Blattkarten) wohl besser als ein
  EZ-Tree.
- **Teil 2, Punkte vor dem Laub:** Hasel, Salweide, Schlehe, Forsythie und Kornelkirsche blühen an kahlen Zweigen – die Punkte brauchen dann
  Stellen an den Zweigen (z. B. Enden der Äste aus der Zweig-Geometrie), nicht die Blattkarten.
- **Teil 2, Beete:** die Vorlage je Beet wählt ihr nach Lage oder nach `flaechen[k].beete`; braucht ihr eine feste Regel im Datensatz (z. B.
  „Beet am Markt“ aus den Karten von `bewuchs-daten`), sagt Bescheid.
