# Gartenplaner und Waldgarten (Feature-Konzept)

Kopie des Projektdokuments `claude/pavillon-gartenplaner.md` (Stand 23.10.2026, 9:45) für Hilfs-Agenten – sie können das Claude-Projekt nicht
lesen. Bei Änderungen beide nachziehen.

Beschlossen von Falko am 22.10.2026: **erstes Feature nach Phase 2** des Umbaus (`claude/pavillon-umbau.md`), **Planer und Spiel zusammen**,
**Kloster Veßra mit Baumschule Kammbach und Klosteranlage als Detailzone** der Welt (`claude/pavillon-welt.md`), Bodenwerte **vorerst geschätzt**.

## Stand (23.10.2026, 9:45)
- **Begonnen am 23.10. früh, parallel zu Phase 2** (Falko fragte um 9:05 nach Gartenplanung und Kloster Veßra). Vier Hilfs-Agenten des Kern-Chats:
  `gartenplaner` (Planer: Meilenstein 1 und Teile von 4), `pflanzen` (Datenbank mit Quellen, Grenzabstände nach ThürNRG, Gilden), `vessra`
  (Kloster Veßra begehbar: Klosteranlage, Ort, Baumschule) und `fahrt` (aus dem Gebiet um Ratscher hinaus nach Schleusingen und bis Kloster Veßra
  fahren). Aufträge wörtlich im Repo unter `docs/plans/auftraege/`, Stand je Thema in `docs/features/<thema>.md`, Belegung in `docs/PARALLEL.md`.
- **Datenvertrag** der drei Dateien (`pflanzen.json`, `regeln.json`, `gilden.json`): `viz3/src/gplan/gplan_schema.js` im Repo, mit Prüfung und
  Unit-Tests – Planer und Datenbank halten sich daran.
- **Entschieden (Falko, 23.10. 9:27):** die Baumschule heißt im Modell **„Baumschule Kammbach“** (Schild und Ortsname, ohne Logo); **Hinfahren**
  soll gehen – die Fahrzeuge dürfen aus dem 2,4-km-Quadrat heraus, das Gelände der Strecke kommt aus den Welt-Kacheln.
- **Nächste Runde:** kaufen, einladen und einpflanzen (Meilensteine 2 und 3), sobald Ort und Fahrt stehen.

## Ziel
Im echten Garten (Bauplatz des Pavillons, Bach im Norden, Nachbarn West/Ost) Bäume, Gilden und einen Waldgarten planen und im Spiel umsetzen:
in der Draufsicht und in der Ich- bzw. Schulterperspektive Pflanzen setzen, sehen, wie sie heute und in 5, 10, 20 Jahren wirken und Schatten werfen,
zur Baumschule nach Kloster Veßra fahren, aussuchen, ins Auto laden, einpflanzen, pflegen, wachsen sehen, ernten – mit einem Berater, der sagt,
was sich verträgt, wie schnell es wächst und ob es zum Boden passt. Ergebnis soll auch für den echten Garten taugen (Pflanzplan, Einkaufsliste).

## Recherche (Stand 22.10.2026)
- **Baumschule Kammbach**, Schulstraße 52, 98660 Kloster Veßra, Tel. 036873 21923, info@baumschule-kammbach.de, www.baumschule-kammbach.de.
  Gegründet 1946 (damals 0,5 ha, vor allem Beerenobst), Inhaber Ralf Kammbach; Mitglied im Bund deutscher Baumschulen und im Landesverband Thüringer
  Baumschulen. Sortiment: viele Obstbäume (Apfel, Birne, Pflaume, Zwetsche, Süß- und Sauerkirsche, Quitte, Pfirsich, Nektarine, Aprikose), winterharte
  Beerensträucher aus eigener Anzucht, Ziergehölze, Kletterpflanzen, Bodendecker – meist Containerware; dazu Gartengestaltung und Obstbaumschnitt.
  Öffnungszeiten 1.3.–31.10. Mo–Fr 8–18, Sa 8–13 Uhr; 1.11.–28./29.2. Mo–Fr 8–16, Sa 9–12 Uhr. Quellen: baumschule-kammbach.de (Start, „Über uns“),
  thueringer-baumschulen.de (Mitgliedsprofil).
- **Kloster Veßra:** Klosteranlage 50,4915° N, 10,6430° O (~340 m) – Kloster der Henneberger, heute Freilichtmuseum (Hennebergisches Museum);
  die **Baumschule Kammbach** liegt gut 200 m nördlich davon (50,4932/10,6417, in OpenStreetMap als Baumschule eingetragen).
  Gut 9 km Luftlinie westlich vom Garten (Ursprung des Modells 50,4991/10,7692).
- **Fotos:** 135 Straßenfotos der Durchfahrt (Panoramax 2025, auch an der Baumschule vorbei), 291 Commons- und 92 Flickr-Fotos von Kloster Veßra
  im Katalog `tools/fotos/` (Übersicht `claude/pavillon-fotos.md`); das Gelände der Baumschule selbst nur mit Erlaubnis fotografieren.
- **Boden (Schätzung, später durch Bodenprobe ersetzen):** Umgebung im südthüringisch-fränkischen Triasvorland mit Buntsandsteinhöhen (dort meist
  sandig-lehmig und eher sauer). Der Garten liegt im Tal am Bach (~375 m, praktisch eben, Grundwasser nah – Pumpe): erwartet wird **Auenlehm**, frisch bis
  feucht, nährstoffreich, leicht sauer bis neutral (Startwert pH ~6), an tiefen Stellen Staunässe möglich. Falkos Beobachtung: „ein bisschen lehmig“.
- **Lage/Klima:** Tallage – Kaltluft sammelt sich, **Spätfröste wahrscheinlich**; spät blühende, robuste Arten und Sorten bevorzugen, frühblühende
  Steinobstarten (Aprikose, Pfirsich) nur an geschützten, warmen Stellen. Wühlmäuse auf Wiesen mit Lehm verbreitet; Ziegen beim Nachbarn Ost (Ronald).

## Startliste für den Waldgarten auf frischem Lehm (in der Datenbank mit Quellen belegen)
- **Oberste Schicht:** Apfel, Zwetsche/Pflaume, Birne (warme Stellen), Speierling, Elsbeere; Walnuss nur abseits (hemmt Nachbarpflanzen);
  Süßkirsche nur auf gut durchlässigem Boden.
- **Stickstoffsammler:** Erle (nasse Stellen am Bach), Erbsenstrauch, Goumi, Sanddorn (nur sonnig und durchlässig).
- **Sträucher:** Haselnuss, Johannisbeere, Stachelbeere, Jostabeere, Aronia, Kornelkirsche, Felsenbirne, Holunder (feuchter Lehm), Maibeere (sehr frosthart).
- **Krautschicht:** Beinwell (Mulch), Schnittlauch/Knoblauch am Stamm, Walderdbeere, Bärlauch (Halbschatten), Kapuzinerkresse, Schafgarbe, Rhabarber.
- **Kletterpflanzen:** Wein an warmer Wand (z. B. Pavillon Süd), Kiwibeere nur spätfrostfrei.
- **Beispiel Apfel-Gilde:** Apfel in der Mitte; Lauch am Stamm; Beinwell-Ring an der Kronentraufe; Johannisbeeren am sonnigen Rand; ein Goumi als
  Stickstoffsammler; Narzissen gegen Wühlmäuse; Drahtkorb gegen Wühlmäuse und Schutz vor Ziegen.

## Funktionen
1. **Pflanzen-Datenbank (Daten, JSON mit Schema):** Art und Sorte, Schicht (Baum, Kleinbaum, Strauch, Kraut, Boden, Wurzel, Kletter), Endhöhe und -breite,
   Wuchsgeschwindigkeit, Lebensdauer, Licht, Boden (Art, pH, Feuchte, Staunässe), Frosthärte und Blühzeit (Spätfrost), Funktionen (Stickstoff, Mulch,
   Insekten, Abwehr), Befruchtersorten, Unverträglichkeiten, Ernte (Zeit, Menge), Pflege, Bezug („bei Kammbach erhältlich, Stand …“), Quellen.
   Start mit 30–50 Arten/Sorten.
2. **Planer:** in der Draufsicht und vor Ort; Pflanzen setzen und verschieben; Kronen heute/5/10/20 Jahre; Schatten zu jeder Uhrzeit und Jahreszeit
   (echter Sonnenstand aus `DN`); Gilden-Vorlagen; Warnungen (Grenzabstand nach Thüringer Nachbarrecht, Abstand zu Pavillon und Gebäuden, Staunässe,
   Frostlage, Unverträglichkeit, fehlender Befruchter); Pflanzplan und **Einkaufsliste für Kammbach** zum Mitnehmen.
3. **Spiel:** Fahrt nach Kloster Veßra (Detailzone), Baumschule begehbar, Pflanzen ansehen und aussuchen (Container, Halb-/Hochstamm), bezahlen, laden
   (Kombi-Laderaum `model.cargo`, Hochstämme auf den Anhänger aus V16d), heimfahren, pflanzen (Spaten, Pflanzloch, Wühlmauskorb, Pfahl, Anbinden,
   Angießen, Mulchen), pflegen (Gießen bei Trockenheit, Schnitt), ernten.
4. **Wachsen:** im Simulationskern (ohne Grafik): Jahre im Zeitraffer, Jahreszeiten, Blüte, Laub, Früchte, Ertrag, Spätfrost; deterministisch, im Spielstand.
5. **Darstellung:** Laubbäume prozedural nach Alter (ez-tree o. ä.), Sträucher/Stauden instanziert, Jahreszeiten wie bei den Lärchen; Budgets fürs Handy.
6. **Berater:** Tipps aus den Regeln der Datenbank (Gilden, Verträglichkeit, Standort, Wachstum), auf Deutsch, mit Begründung.

## Abhängigkeiten
- Kern (Phase 0–2): Spielstand-Dienst `SAVE`, Simulationskern (Zeitraffer über Jahre), Szenario „Garten planen“, Draufsicht-Planer verallgemeinert
  (heute `world/siteplan.js`, `pavilion/plan.js`).
- Welt: Detailzone Kloster Veßra (Baumschule, Klosteranlage) und die Straße dorthin.
- Fahrzeuge: Laderaum und Anhänger (V16d).

## Meilensteine (Vorschlag, Planer und Spiel zusammen)
1. Datenbank (30–50 Arten), Pflanzen setzen in Draufsicht und vor Ort, Wachstum im Zeitraffer, Schatten, Warnungen.
2. Pflanzen im Spiel: graben, pflanzen, pflegen; Jahreszeiten; Ernte.
3. Baumschule Kammbach als Ort (sobald die Welt dort steht): aussuchen, kaufen, laden, transportieren.
4. Berater, Gilden-Vorlagen, Pflanzplan und Einkaufsliste.

## Offen
- Echte Bodenwerte: später Bodenprobe (Labor oder Selbsttest); bis dahin die Schätzung oben.
- Sortiment ändert sich: in der Datenbank mit Stand-Datum führen; aktuelle Liste ggf. bei Kammbach anfragen (nicht automatisch abgreifen).
- Gelände der Baumschule: nur nach OpenStreetMap und Straßenfotos nachgebaut; Fotos auf dem Gelände nur mit Erlaubnis (der Name darf ins Modell,
  Falko 23.10.).
- Quellen der Pflanzeneigenschaften: Lizenzen beachten; eigene Zusammenstellung mit Belegen.
