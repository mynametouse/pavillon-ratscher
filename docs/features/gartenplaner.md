# Gartenplaner (Branch `feat/gartenplaner`)

Falko, 22.10.2026 (Projektdokument `claude/pavillon-gartenplaner.md`): im echten Garten Bäume, Gilden und einen Waldgarten planen, in der
Draufsicht und vor Ort setzen, sehen, wie sie heute und in 5, 10, 20 Jahren wirken und Schatten werfen, mit einem Berater, der sagt, was
zusammenpasst, wie schnell es wächst und ob es zum Boden passt; Pflanzplan und Einkaufsliste für die Baumschule Kammbach. Runde 1:
Meilenstein 1 und die günstigen Teile von Meilenstein 4 (Berater, Gilden-Vorlagen, Listen). Runde 2 (23.10. ab 12 Uhr, Auftrag
`docs/plans/auftraege/gartenplaner2.md`): Meilensteine 2 und 3 – im Spiel Schritt für Schritt pflanzen, Gießen, Schneiden, Ernten mit
Zeitraffer, in der Baumschule Kammbach kaufen und die Pflanzen heimbringen (Lieferung, Auto, Anhänger, Tragen), dazu die Aufgabe
`gplan-kaufen` im Tagebuch.

## Bedienen

- **Menü → Gestalten → „Garten planen“** öffnet die Draufsicht mit dem Planer (rechts; am Telefon hochkant unten als Blatt, „▾“ klappt ein).
- **Pflanzen**: Liste nach Schicht mit Suche und Filtern (Schicht, Licht, essbar, Stickstoff, Insekten, Mulch). Pflanze antippen, dann in
  den Plan tippen (mehrmals möglich, noch einmal antippen beendet). Gesetzte Pflanze ziehen = verschieben, antippen = Größe heute und
  ausgewachsen, Pflanzjahr (−/+), „Berater“ (Wuchs, Boden, Licht, Partner, Befruchtung, Blüte, Ernte, Pflege, Pflanzzeit, Kammbach),
  „Löschen“ (oder Entf). Im Plan: Kronen als Scheiben im gewählten Alter, Farbe nach Schicht, Stammpunkt; die ausgewählte Pflanze mit
  ausgewachsener Krone (gestrichelt) und ihrem Grenzabstand (Ring); rot umrandet = Warnung, gelb = Hinweis.
- **↶ Rückgängig** (oder Strg+Z bei offenem Planer, vor dem Rückgängig der Draufsicht): Setzen, Verschieben, Löschen, Gilde, Pflanzjahr –
  die letzten 40 Schritte.
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
  Aktionsknopf (E / großer Knopf): „… hier setzen“, „… hierher“ (`KERN.act`, ids `gplan:here`, `gplan:move`). Auf dem Boden zeigt ein
  gelber Punktring die ausgewählte Pflanze, ein weißer die Stelle, an die „hier setzen“ die gewählte setzt.
- **Startsituation** `?szenario=gartenplaner` (`KERN.scenario`): öffnet den Planer über dem Garten.

### Im Spiel pflanzen, pflegen, ernten (Runde 2, `gplan/gplan_game.js`)

- **Pflanzen**: an einer geplanten Pflanze (mit „im Garten: an“ oder vor Ort sichtbar, oder schon angefangen) bietet der Aktionsknopf die
  Schritte nacheinander an, jeder ein kurzes Halten mit Bewegung der Figur: „Pflanzloch graben“ (Loch und Erdhaufen daneben, Größe nach
  Form und Schicht), „Wühlmauskorb einsetzen“ und „Pfahl setzen“ nur, wo `schutz` es verlangt, „Einpflanzen“ (die Pflanze steht ab jetzt
  in Pflanzgröße, die Baumscheibe statt Loch und Haufen), „Anbinden“ (am Pfahl), „Angießen“ – dann ist sie **gepflanzt** (mit dem
  Pflanztag des Spielkalenders) und bleibt im Garten, egal was „im Garten“ sagt (der Schalter zeigt oder verbirgt nur noch die
  geplanten). Abbrechen und später weitermachen geht; der Stand ist gespeichert.
- **Woher die Pflanze kommt**: nur gekaufte Pflanzen lassen sich einpflanzen – in den Armen getragen oder bis 3 m neben dem Loch
  abgestellt; ohne sie sagt der Knopf „Einpflanzen – erst … herbringen“. Für Tests: `GPLAN.setFrei(true)` = alles „aus dem Vorrat“.
- **Pflege und Ernte** an gepflanzten Pflanzen (Knopf, wichtigstes zuerst): „Ernten“ in den Erntemonaten (`ernte.monate`) ab dem
  Ertragsalter (Spindel 2, Busch 3, Halbstamm 4, Hochstamm 5 Jahre; Sträucher 2), kg aus `kg_jahr` nach Alter (fehlt es – bei den
  echten Daten meist –, ein grober Wert nach Art und Form: Halbstamm 35 kg, Strauch 3 kg …); „Gießen“ in den ersten zwei Sommern
  (Mai–September), wenn eine Woche nicht gegossen wurde – ein blauer Punktring um die Pflanze zeigt es; „Schneiden“ an Obstbäumen im
  Spätwinter (Januar–März, einmal im Jahr); „Mulchen“ im ersten Jahr. Nach der Ernte keine Früchte mehr am Baum bis zum nächsten Jahr.
- **Draufsicht**: gepflanzt = volle Scheibe, angefangen = gepunktet, geplant = gestrichelt. Die ausgewählte Pflanze zeigt ihren Stand
  („Gepflanzt am 1.6.2026, 8 Monate alt · braucht Wasser …“); Gepflanzte lassen sich nicht ziehen, „Roden“ statt „Löschen“.
- **Reiter „Garten“**: Gartenjahr und Datum, **Zeitraffer „+1 Jahr“ / „+5 Jahre“** (nur die Pflanzen altern – ein gespeicherter Versatz
  des Gartenjahrs; die Uhr des Spiels bleibt), die gepflanzten Pflanzen (Alter, „durstig“, „reif“; antippen wählt), angefangene, der
  **Vorrat** (gekauft, noch nicht gepflanzt, mit Ort: an der Kasse, wird geliefert, am Gartentor, im Auto …) und die **Ernte** je Jahr
  („Ernte 2032: 7,0 kg – 7,0 kg Apfel ‚Rebella‘“).

### In der Baumschule Kammbach kaufen und heimbringen (Runde 2, `gplan/gplan_shop.js`)

- **Hinkommen**: Orte → Kloster Veßra oder `?szenario=baumschule` (`KERN.scenario('baumschule')`), mit dem Auto über die Fahrt.
- **Beete**: die Pflanzen der Einkaufsliste stehen in schwarzen Töpfen mit weißem Schild auf freien Plätzen der Beete ihrer Art
  (Obstgehölze, Beerenobst, Ziergehölze, Kletterpflanzen, Bodendecker – zwischen den Töpfen der Baumschule, die auf den `slots` stehen).
  „Aussuchen – …“ legt eine in den Korb.
- **Kasse**: „Bezahlen – n Pflanzen“ zeigt den **Kassenzettel** (Pflanzen, Form, Datum und Uhrzeit, keine Preise) mit „Liefern lassen –
  morgen früh am Gartentor“ oder „Selbst mitnehmen“ (die Pflanzen warten neben der Theke). Dort dann „Ins Auto laden“, wenn das Auto auf
  dem Parkplatz der Baumschule oder bis 15 m von der Kasse steht: kleine Pflanzen stehend, Bäume bis 2,2 m liegend (Krone zwischen den
  umgeklappten Sitzen), Hochstämme auf den Anhänger, wenn er am Auto hängt – sonst „Liefern lassen“ für den Rest.
- **Daheim**: „Ausladen“ an der Heckklappe stellt sie hinter das Auto, die Lieferung steht am nächsten Morgen ab 7 Uhr am Gartentor.
  „Tragen – …“ nimmt eine in die Arme (die Figur trägt sie, der zweite Knopf stellt sie ab), am Pflanzloch dann „Einpflanzen – …“.
- **Aufgabe im Tagebuch** (J): „Pflanzen in der Baumschule Kammbach kaufen“ beginnt, sobald man die Einkaufsliste ansieht: hinfahren,
  aussuchen, bezahlen, heimbringen, einpflanzen.

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
| `gplan/gplan.js` (GPLAN) | Daten laden und prüfen, Fenster `#gplan` (mit Reiter „Garten“), Zeichnen und Antippen in der Draufsicht, vor Ort, Speichern; der Gartenkalender (`gday` = Spieltag `DN.e0 + ⌊CLOCK.t / 1440⌋` + Zeitraffer × 365), Alter, Stand der Pflanzen, Zeitraffer |
| `gplan/gplan_game.js` (GPGAME) | Pflanzschritte, Gießen, Schneiden, Ernten, Mulchen über einen `KERN.act` (`gplan:work`, Halten mit Bewegung der Figur), blaue Ringe an durstigen Pflanzen, Ereignisse |
| `gplan/gplan_shop.js` (GPSHOP) | Baumschule (nur `VESSRA.baumschule`): Töpfe auf den Beeten, Korb, Kasse, Kassenzettel, Lieferung, Auto, Anhänger, Ausladen, Tragen; Aufgabe `gplan-kaufen` (TASKS) |

Daten: `dist/gartenplaner/pflanzen.json`, `regeln.json`, `gilden.json` (Vertrag `gplan/gplan_schema.js`, Datenbank `feat/pflanzen`); fehlen
sie, nimmt der Planer `testdaten.json` (Kopie von `viz3/test/unit/fixtures/gplan_mini.json`, aus `viz3/extra/gartenplaner/dist/`) und
zeigt „Testdaten“. Geladen wird erst beim Öffnen; geprüft mit `GPSCHEMA.validateAll`, Fehler in die Konsole und ins Ladeprotokoll
(`LOADLOG.err`), fehlerhafte Einträge bleiben weg. Gespeichert: `pav-gplan-v1` `{ v: 2, items: [{ id, x, y, jahr, st, sch, pd, w, cut, mu,
h }], show, age, month, hour, off, kuebel: [{ k, id, loc, x, y, tag }], ernte: { Jahr: { Pflanzen-id: kg } } }` – `st` geplant/gepflanzt,
`sch` erledigte Pflanzschritte, `pd` Pflanztag, `w` zuletzt gegossen, `cut` Schnittjahr, `mu` gemulcht, `h` Erntejahr (Tage des
Gartenkalenders), `off` Zeitraffer in Jahren, `kuebel` gekaufte Pflanzen mit Ort (`korb`, `kasse`, `liefer`, `tor`, `auto`, `anh`,
`boden`, `hand`). Ein Plan der Runde 1 (`v: 1`) wird übernommen, alles geplant.

**3D ohne neue Shader**: Loch, Erdhaufen, Wühlmauskorb, Baumscheibe, Mulch, Pfahl, Töpfe und Schilder sind einfache Formen im Material der
Blüten-Punkte (`plain` + Instanzfarbe); Pflanzen in Töpfen nehmen die Baumarten des Planers. Töpfe im Auto, auf dem Anhänger und in den
Armen sind Gruppen, die an der Gruppe des Autos bzw. Anhängers bzw. an einem Anker vor der Figur hängen – sie fahren mit, ohne dass etwas je
Bild neu gerechnet wird (nur der Anker beim Tragen).

## Testen

- `node --test "viz3/test/unit/gplan_*.test.mjs"` (in `tools/check.sh`): Wachstum, Jahreszeiten, Plan, Gilden, Listen; Sonnenstand, Schatten;
  jede Warnung des Beraters an einem kleinen Beispielgrundstück.
- `python3 viz3/test/run.py --port 8979 --serve gartenplaner` (`viz3/extra/gartenplaner/tests.txt`, bei GitHub mit jedem Push):
  nichts beim Start (keine Anfrage, kein Fenster, kein 3D), Öffnen, Pflanzen und eine Gilde setzen, Warnungen (Baum 0,5 m an der Grenze,
  Apfel ohne Befruchter), Alter mit Bildern von Draufsicht und 3D-Garten (heute/5/10/20), Jahreszeiten, Schatten um 9 und 17 Uhr,
  Listen, vor Ort, **Pflanzen Schritt für Schritt** (Knopf, Loch und Haufen, Pfahl, keine neuen Shader), gepflanzt/geplant in der
  Draufsicht, „im Garten: aus“ lässt die Gepflanzten stehen, **Gießen** nach einer Woche, **Zeitraffer**, **Ernte** im Erntemonat ins
  Erntebuch, **Schneiden** im Februar, Shader je Programm, Neuladen, „im Garten: aus“. Abschnitte: `gartenplaner:only=start+open+plants+plant+care`;
  `phone` = Telefon; `noshots=1` ohne Seitenbilder (lokal schneller). Bilder in `out/gartenplaner/`.
- `python3 viz3/test/run.py --port 8979 --serve gartenplaner_kammbach` (auch bei GitHub): holt die Kacheln der Zone Veßra wie
  `viz3/test/vessra.py`, ein kleiner Plan (Halbstamm-Apfel, Walnuss-Hochstamm, Strauch, Staude), Einkaufsliste → Aufgabe, Baumschule
  (`?szenario=baumschule`): Töpfe auf den Beeten ihrer Art, keine neuen Shader, Aussuchen, Bezahlen mit Kassenzettel, Auto auf dem
  Parkplatz: einladen (die Walnuss passt nicht – liefern lassen), daheim ausladen, Lieferung am Morgen am Gartentor, Tragen (Armhaltung),
  einpflanzen aus den Armen, Aufgabe erledigt. Bilder in `out/gartenplaner_kammbach/`.

## Für den Kern-Chat

- **Grüne Stände zum Zusammenführen** (neueste oben; Runde 2 unten unter „Runde 2“):
  - `5bb05a5` (dazu: Rückgängig ↶/Strg+Z, Punktringe vor Ort): GitHub-Lauf 39932095522 grün – smoke und `gartenplaner:phone` 39/39.
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
- Kletterpflanzen dürfen direkt an einer Wand stehen (nicht im Gebäude); ein Gilden-Platz an der Südwand des Pavillons liegt deshalb am
  besten knapp südlich von y = −1,05 (Südkante des Pavillons mit Auskragung).

### Runde 2 (Meilensteine 2 und 3)

- **Grüne Stände** (neueste oben): siehe unten, wird mit jedem grünen Lauf ergänzt.
- **Gemeinsame Dateien**: die eine Zeile in `core/save.js` nimmt jetzt `v: 1` und `v: 2` an (`pav-gplan-v1`); zwei neue Module unter
  `# feat/gartenplaner` in `modules.txt` (`gplan/gplan_game.js`, `gplan/gplan_shop.js`); ein Test mehr in
  `viz3/extra/gartenplaner/tests.txt` (`gartenplaner_kammbach`). Nicht angefasst: `welt/vessra.js`, `vehicles/*` (nur gelesen:
  `VEH.by.car`, `VEH.toW`, `VEH.place`, `car.model.cargo`, `TRAILER.g/bed/st/tow`).
- **ARCHITECTURE** (bitte ergänzen): Abschnitt 6 `GPGAME` (gplan/gplan_game.js) und `GPSHOP` (gplan/gplan_shop.js); neue `window`-Namen
  `GPGAME`, `GPSHOP`; `pav-gplan-v1` jetzt `v: 2`; Ereignisse `gplan:schritt { id, i, schritt }`, `gplan:gepflanzt { id, i, tag }`,
  `gplan:gegossen`, `gplan:geerntet { id, i, kg, jahr }`, `gplan:geschnitten`, `gplan:gemulcht`, `gplan:zeitraffer { off, jahr }`,
  `gplan:daten`, `gplan:einkaufsliste { n }`, `gplan:ausgesucht { id, n }`, `gplan:gekauft { n, ids }`, `gplan:liefern`,
  `gplan:geliefert`, `gplan:geladen { n, anh }`, `gplan:ausgeladen`, `gplan:getragen`, `gplan:abgestellt`; Aktionen `gplan:work`,
  `gplan:pick`, `gplan:kasse`, `gplan:ausladen`, `gplan:abladen`, `gplan:tragen`; ein PLAY-Ding `gplan-topf` (nur für die Armhaltung,
  ohne eigenes Bild – keine Shader der Hand-Szene).
- **Baumschule**: `welt/vessra.js` stellt in jeden `slot` einen eigenen Topf; „freie Plätze“ sind deshalb die Mitten zwischen zwei
  benachbarten Töpfen einer Reihe (Obst 0,9 m, Bodendecker 0,35 m Abstand). Schöner wäre eine Liste freigehaltener Plätze je Beet
  (`beete[i].frei`) vom Agenten `vessra`.
- **TASKS** (erster echter Nutzer, `gplan-kaufen`) – was fehlte: (1) eine Aufgabe lässt sich nicht wiederholen – `start` geht nur einmal,
  für den nächsten Einkauf braucht es `reset` + `start` (hier von Hand beim nächsten `gplan:einkaufsliste`); ein `repeat: true` wäre
  besser; (2) Schritttexte sind fest – Zahlen („noch 3 Pflanzen“) gehen nicht, `text` als Funktion wäre einfach; (3) keine Zweige
  (liefern lassen **oder** selbst fahren) – hier mit einem `check`, der beides abdeckt; (4) ein Schritt mit `check`, der schon wahr ist,
  rückt erst beim nächsten Halbsekundentakt weiter – mehrere auf einmal brauchen mehrere Takte; (5) `start.when` sieht nur die
  Ereignisdaten, keinen Zustand (ob es überhaupt etwas zu kaufen gibt, prüft hier der Sender).
- **Auto/Anhänger**: der Anhänger gehört zum Traktor; ob er am Auto hängen kann (`TRAILER.couple(car)`), entscheidet `trailer.js` –
  hängt er am Auto (`TRAILER.tow === VEH.by.car`), kommen Hochstämme darauf, sonst bleiben sie für die Lieferung. Gebraucht wird nur das
  Lesen; keine Zeile in `car.js`/`trailer.js` geändert.

