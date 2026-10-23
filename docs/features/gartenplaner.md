# Gartenplaner (Branch `feat/gartenplaner`)

Falko, 22.10.2026 (Projektdokument `claude/pavillon-gartenplaner.md`): im echten Garten Bäume, Gilden und einen Waldgarten planen, in der
Draufsicht und vor Ort setzen, sehen, wie sie heute und in 5, 10, 20 Jahren wirken und Schatten werfen, mit einem Berater, der sagt, was
zusammenpasst, wie schnell es wächst und ob es zum Boden passt; Pflanzplan und Einkaufsliste für die Baumschule Kammbach. Hier: Meilenstein 1
und die günstigen Teile von Meilenstein 4 (Berater, Gilden-Vorlagen, Listen). Kaufen, Laden und Pflanzen mit dem Spaten folgen.

## Bedienen

- **Menü → Gestalten → „Garten planen“** öffnet die Draufsicht mit dem Planer (rechts; am Telefon hochkant unten als Blatt, „▾“ klappt ein).
- **Pflanzen**: Liste nach Schicht mit Suche und Filtern (Schicht, Licht, essbar, Stickstoff, Insekten, Mulch). Pflanze antippen, dann in
  den Plan tippen (mehrmals möglich, noch einmal antippen beendet). Gesetzte Pflanze ziehen = verschieben, antippen = Größe heute und
  ausgewachsen, Pflanzjahr (−/+), „Berater“ (Wuchs, Boden, Licht, Partner, Befruchtung, Blüte, Ernte, Pflege, Pflanzzeit, Kammbach),
  „Löschen“ (oder Entf). Im Plan: Kronen als Scheiben im gewählten Alter, Farbe nach Schicht, Stammpunkt; die ausgewählte Pflanze mit
  ausgewachsener Krone (gestrichelt) und ihrem Grenzabstand (Ring); rot umrandet = Warnung, gelb = Hinweis.
- **Alter**: „heute | 5 | 10 | 20 Jahre“ (Plan und 3D-Garten). **„im Garten: an/aus“** = die Einstellung „Geplante Pflanzen zeigen“: die
  geplanten Pflanzen stehen im 3D-Garten im gewählten Alter und zur Jahreszeit (mit offenem Planer dessen Monat, sonst das Datum der
  Spieluhr) – auch nach dem Schließen, so lässt sich durch den künftigen Garten gehen. Bäume ab 5 Jahren halten den Gehenden auf.
- **Hinweise**: Warnungen und Hinweise mit Begründung; antippen wählt die Pflanze und holt sie ins Bild.
- **Gilden**: Vorlage antippen, in den Plan tippen = Mitte; die Partner kommen auf ihre Ringe (`radius_rel` × Kronenradius ausgewachsen,
  ringsum oder auf einer Seite ±60°).
- **Schatten**: „Schatten zeigen“, Monat und Uhrzeit (15. des Monats, MEZ/MESZ): Schatten der geplanten Pflanzen im gewählten Alter, der
  Gebäude und der Bäume im Garten. In den Plan tippen: wie viel des Tages die Stelle im Schatten liegt.
- **Listen**: Pflanzliste (je Pflanze Lage in m, Richtung und Abstand zum nächsten Gebäude, Abstand zur Grenze, Pflanzjahr) und
  Einkaufsliste für Kammbach (Anzahl je Art/Sorte, Form, Unterlage, „bei Kammbach: … (Stand …)“, Pflanzzeit, Zubehör aus „Schutz“:
  Wühlmauskorb, Pfahl, Verbissschutz …) – „Kopieren“, „Herunterladen“ (.txt), „Drucken“.
- **Vor Ort**: im Garten gehen (die Figur steht vor der ausgewählten Pflanze); „Hier setzen“ setzt die gewählte Pflanze 2,2 m vor die
  Figur (Höhe aus `KERN.ground`), „Ausgewählte hierher“ holt die ausgewählte dorthin; „Draufsicht“ zurück. Dasselbe über den
  Aktionsknopf (E / großer Knopf): „… hier setzen“, „… hierher“ (`KERN.act`, ids `gplan:here`, `gplan:move`).
- **Startsituation** `?szenario=gartenplaner` (`KERN.scenario`): öffnet den Planer über dem Garten.

## Was der Berater prüft (`gplan/gplan_rules.js`, Texte deutsch mit Grund)

Grenzabstand nach Thüringer Nachbarrecht (Kategorie `nachbarrecht` → `regeln.json`, gemessen von der Stammmitte zur Grundstücksgrenze);
Stamm in/an Gebäuden, ausgewachsene Krone über Pavillon, Bungalow, Holzhaus, Gewächshaus, Carport, Waschhaus, Werkstatt, Garage (wo sie
nach der Draufsicht gerade stehen); auf dem Weg, auf der Brücke, Krone hängt in den Weg; Bachgraben, Staunässe und feuchter Boden bis 6 m
vom Bach; Spätfrost (frühe Blüte, `spaetfrost` hoch = Warnung, mittel = Hinweis); Unverträglichkeit (`unvertraeglich`: Art, Schicht oder
alles im Radius bzw. der Krone); fehlender Befruchter (selbstunfruchtbar, keine andere Sorte derselben Art in 30 m, nennt `befruchter`);
Kronen, die ineinander wachsen (Baum mit Baum, Strauch mit Strauch); Licht (braucht Sonne, liegt am 21. Juni mehr als den halben Tag im
Schatten der geplanten Pflanzen, Gebäude und Bäume – Gehölz: Warnung, Kraut: Hinweis); Schutz beim Pflanzen (`schutz`); Boden (geschätzt:
Auenlehm, pH ~6, frisch bis feucht). Mehrere gleiche Pflanzen in derselben Lage ergeben eine Meldung („Knoblauch (12×) …“). Eine Art ohne
Sortennamen (Sämlinge) oder eine, die sich selbst als Befruchter nennt, wird von einer zweiten Pflanze ihrer Art befruchtet.
Gründe aus `regeln.json` `fakten`, wenn ihre id passt (`spaetfrost|frost|kaltluft`; `auenlehm|grundwasser`, bei Steinobst zuerst
`staunaess`; `wuehlmaus`; `ziege|verbiss`; `befruchtung-<art>` passend zur Pflanzen-id, z. B. `befruchtung-apfel` für `apfel-…`;
`waldgarten-abstand` bei Kronen).

## Aufbau

| Modul | Aufgabe |
|---|---|
| `gplan/gplan_model.js` (GPMODEL, rein) | Wachstum (Pflanzhöhe → Endgröße, `1 − (1 − t)²` über `jahre_bis_endgroesse`, Mitte der Spannen, Seed variiert), Krone als Ellipsoid über dem Stamm, Jahreszeit (Laub, Blüte, Frucht nach Monat), gespeicherter Plan (`sanitize`), Gilden, Pflanz- und Einkaufsliste |
| `gplan/gplan_sun.js` (GPSUN, rein) | Sonnenstand über dem Garten (50,4991° N, 10,7692° O, MEZ/MESZ, NOAA-Formeln wie `time/daynight.js`), Schatten einer Krone (Ellipse), eines Stamms, eines Gebäudes (Hülle), Schattenanteil eines Tages |
| `gplan/gplan_rules.js` (GPRULES, rein) | Warnungen und Hinweise, Ratschläge je Pflanze |
| `gplan/gplan_3d.js` (GP3D) | die Pflanzen im 3D-Garten, erst bei Gebrauch gebaut: Laub- und Nadelbäume als die ez-tree-Arten des Gartens (`garden/trees.js` `TREES`), dazu eigene ez-tree-Arten aus den schon geladenen Rinden- und Blattbildern – Obstbaum (Oak Small, breit, viele kleine Espenblätter), zwei Sträucher (Presets Bush 1/2), ein niedriger Horst für Stauden, Bodendecker, Zwiebeln; alle instanziert und auf Alter und Breite skaliert. Laubfarbe der Pflanze (`darstellung.laub`, Austrieb heller, Herbstfarbe) über die Instanzfarbe, gemessen am Blattbild; kahl im Winter; Blüte und Früchte als kleine Punkte auf den Blattkarten (Material der Bücher im Bungalow) – keine neuen Shader (Test). Stämme ab 5 Jahren in `COL` (Tag `gplan`, Einträge werden wiederverwendet, nie gelöscht) |
| `gplan/gplan.js` (GPLAN) | Daten laden und prüfen, Fenster `#gplan`, Zeichnen und Antippen in der Draufsicht, vor Ort, Speichern |

Daten: `dist/gartenplaner/pflanzen.json`, `regeln.json`, `gilden.json` (Vertrag `gplan/gplan_schema.js`, Datenbank `feat/pflanzen`); fehlen
sie, nimmt der Planer `testdaten.json` (Kopie von `viz3/test/unit/fixtures/gplan_mini.json`, aus `viz3/extra/gartenplaner/dist/`) und
zeigt „Testdaten“. Geladen wird erst beim Öffnen; geprüft mit `GPSCHEMA.validateAll`, Fehler in die Konsole und ins Ladeprotokoll
(`LOADLOG.err`), fehlerhafte Einträge bleiben weg. Gespeichert: `pav-gplan-v1` `{ v: 1, items: [{ id, x, y, jahr }], show, age, month, hour }`.

## Testen

- `node --test "viz3/test/unit/gplan_*.test.mjs"` (in `tools/check.sh`): Wachstum, Jahreszeiten, Plan, Gilden, Listen; Sonnenstand, Schatten;
  jede Warnung des Beraters an einem kleinen Beispielgrundstück.
- `python3 viz3/test/run.py --port 8979 --serve gartenplaner` (`viz3/extra/gartenplaner/tests.txt`, bei GitHub mit jedem Push):
  nichts beim Start (keine Anfrage, kein Fenster, kein 3D), Öffnen, Pflanzen und eine Gilde setzen, Warnungen (Baum 0,5 m an der Grenze,
  Apfel ohne Befruchter), Alter mit Bildern von Draufsicht und 3D-Garten (heute/5/10/20), Jahreszeiten, Schatten um 9 und 17 Uhr,
  Listen, vor Ort, Shader je Programm, Neuladen, „im Garten: aus“. Abschnitte: `gartenplaner:only=start+open+plants`; `phone` = Telefon.
  Bilder in `out/gartenplaner/`.

## Für den Kern-Chat

- **Grüne Stände zum Zusammenführen** (neueste oben):
  - `23f5d50` (mit `src` fa6e086 zusammengeführt – Veßra, V16l): GitHub-Lauf 39929746233 grün – smoke und `gartenplaner:phone` 37/37
    (dazu Telefon quer). Berater mit den echten Daten (Kletterpflanzen an Wänden, eine Meldung je Pflanze, Fakten je Obstart), dichtere
    Stauden, schmale Kletterpflanzen.
  - `e44ae43` (mit `src` 7cbb8c2 zusammengeführt, echte Pflanzendaten, Dienste aus Baustein 1): GitHub-Lauf 39927210493 grün – smoke und
    `gartenplaner:phone` 36/36.

- **Haken in `world/siteplan.js`** (klein, kommentiert): `SITEPLAN.hooks` – Erweiterungen der Draufsicht zeichnen ins SVG
  (`draw(pr, W, H)`, über der Grenze, unter Umrissen und Beschriftungen) und bekommen Antippen/Ziehen vor den Gebäuden
  (`down` → `'take'`/`'keep'`, `move`, `up`, `tap`). Kandidat für die verallgemeinerte Draufsicht (Phase 2).
- **Ein Menüeintrag**: `shell/menu.html` → Gestalten → „Garten planen“ (`#gplanbtn`); **eine Zeile** in `core/save.js` (`pav-gplan-v1`);
  `shell/css/gartenplaner.css` in `parts.txt` nach `css/amt.css`; Module unter `# feat/gartenplaner` in `modules.txt`.
- Wer einen gespeicherten Plan mit „im Garten: an“ hat, lädt die Pflanzendaten nach dem Start (1,5 s nach `whenLoaded`), sonst nie.
- Seit dem Merge von `src` (bf31955) nimmt der Planer die echten Daten (`viz3/extra/pflanzen/dist/gartenplaner/`: 44 Pflanzen,
  19 Grenzabstands-Kategorien, 30 Fakten, 5 Gilden – ohne Fehler gegen den Vertrag); `testdaten.json` bleibt als Rückfall (Abzeichen
  „Testdaten“ nur dann).
- Dienste aus Baustein 1 genutzt: `KERN.scenario('gartenplaner')`, `KERN.act` (`gplan:here`, `gplan:move`). Kein Eintrag im Tagebuch
  (`KERN.tasks.source`) – Aufgaben kommen mit Kaufen und Pflanzen (nächste Runde).
- Bauphase 0 (alte Garage beim Start): der Berater misst immer zum geplanten Pavillon (Rechteck wie `world/siteplan.js`), unabhängig von
  der gezeigten Phase.
- Ein Feld im Vertrag fehlt nicht zwingend; nützlich wären später: Höhe des Stammes je Form (heute fest im Modell: Hochstamm 1,8 m,
  Halbstamm 1,2 m, Busch 0,6 m …) und eine Wurzeltiefe/-art für Abstände zu Leitungen.
- `docs/ARCHITECTURE.md`: Abschnitt 6 `GPLAN`, Abschnitt 8 `pav-gplan-v1` ergänzen; Fenster `#gplan` steht nicht in `HUD.PANELS`
  (Esc schließt es nicht): vor Ort darf die Maus den Blick fangen, gesetzt wird dann mit E (Aktionsknopf); wer lieber klickt, lässt die
  Maus mit Esc los (dabei öffnet das HUD das Menü – wäre `#gplan` in `PANELS`, gäbe es vor Ort keinen Mausfang).
- Kletterpflanzen dürfen direkt an einer Wand stehen (nicht im Gebäude); Ein Gilden-Platz an der Südwand des Pavillons liegt deshalb am
  besten knapp südlich von y = −1,05 (Südkante des Pavillons mit Auskragung).
