# Garten: Bungalow mit Anbau, Sarahs Hütte, Gewächshaus (feat/garten, 23.10.2026)

Grundlage: Falkos Wünsche in `docs/plans/plan_leben.md`, Abschnitt 4.

## Was sich geändert hat

| Gebäude | Änderung | Datei |
|---|---|---|
| Grüner Bungalow | Eingang Nord wie bisher, **Hintertür geradeaus gegenüber** (Südgiebel, Mitte). **Anbau im Osten**: 1 m hinter der Haustür buchtet die linke Wand 1,5 m aus (ehemalige kleine Garage, grün verschalt, Flachdach mit Dachpappe, Rinne, Fallrohr in die Regentonne; Sturz, wo die alte Wand war). Innen: **Küche gleich rechts in der Ecke** (L-Zeile, Holzarbeitsplatte, Spüle unter dem Fenster, Emaille-Herd mit Flötenkessel, Fliesen, offene Regale mit Tellern, Tassen, Gläsern, Café-Gardinen, Kräuter auf der Fensterbank, Stirnholzbrett), **Sofa** dahinter auf derselben Seite (Decke, Kissen, Couchtisch mit Tee), links der Hintertür der **taubenblaue, fast weiße Kleiderschrank** (Türen öffnen, Kleider drin), links daneben das **Doppelbett im Anbau** (Nachttisch mit Lampe), **nackte Glühbirne** in der Mitte, kleiner gusseiserner Ofen (Kanonenofen) zwischen Sofa und Küche mit Rohr durchs Westdach, Leseecke mit grünem Polstersessel, Stehlampe und Bücherregal im Anbau, Tisch für zwei, Flickenteppich-Läufer, Bilder, Gardinen, Garderobe mit Jacken und Strohhut; Kiefernholzdecke, Holzboden; außen Geranien in Blumenkästen, Brennholzstapel am Anbau, Fußmatten, alte Außenlaterne neben der Haustür | `viz3/src/garden/bungalow.js` |
| Ockerfarbene Holzhütte (Sarahs Hütte) | **Tür nach Norden** (Westteil der Nordwand, neben dem Gewächshaus), **Pultdach fällt nach Westen** ab (Rinne, Fallrohr und Regentonne an der Westseite), Fenster wie bisher. Eingerichtet als Pflanzhütte: Pflanztisch unter dem Fensterband mit Anzuchtschalen, Erde, Töpfen, Schnur, Handschuhen, Säcken darunter; Regal an der Nordwand mit Saatgut-Gläsern, Töpfen, Laterne, Gartenbüchern; Werkzeug an der Ostwand (Rechen, Hacke, Spaten, Grabegabel, Schere, Schlauch, Strohhut, Schürze), Gießkannen und Eimer; gemütliche Ecke mit Stuhl, Beistelltisch, Teekanne; Kräuterbündel unter dem Dach; Emaille-Lampe über dem Pflanztisch mit Schalter an der Tür; außen Kranz aus Trockenkräutern und Hagebutten an der Tür, Geranien am Tritt, Schlauchtrommel und Schubkarre an der Südseite, Blumenkasten unter dem Fensterband; das PV-Modul steht jetzt **südlich der Hütte** schräg (30° nach Süden) auf einem Alu-Gestell mit Kabel zur Südwand (vorher eine flache schwarze Platte über dem Rasen westlich der Hütte; auf dem Gestell stand es dort dem Traktor auf dem Weg zum Holzplatz im Weg – Test `v16d:bridge`, jetzt über 3 m Abstand) | `viz3/src/garden/holzhaus.js` |
| Gewächshaus | **Tür nach Norden**: die Giebel zeigen jetzt nach Norden und Süden (um 90° gedreht, 0,5 m nach Norden gerückt, Traufe etwas höher, damit die Tür in den Giebel passt), Alu-Tür, **Lüftungsfenster im Dach** zum Öffnen, Tomaten und Gurken mit Blättern, Anzuchtregal am Südgiebel, Gießkanne, Thermometer; der Kiesweg führt jetzt an die Nordtür (ebenso zur Hütte) | `viz3/src/garden/greenhouse.js` |

Neue Module: `garden/garten_kit.js` (Bausatz: Kleinteile, Stoffe, Fliesen, Bilder, Lampen-/Sitz-Verzeichnis) und `garden/garten_in.js`
(`GARTEN`: Lampen, Sitzen/Liegen, kleine Handgriffe).

## Zum Ausprobieren (Aktionsknopf E / Antippen)

- Bungalow: **Licht an/aus** am Drehschalter neben der Haustür (Glühbirne), daneben **Außenlicht** (Laterne an der Haustür), **Leselampe**,
  **Nachttischlampe**; **Aufs Sofa setzen**,
  **Aufs Sofa legen**, **Ins Bett legen** (nachts: Schlafen bis 7 Uhr), **In den Sessel setzen**, Stühle am Tisch; **Schranktür öffnen**;
  **Wasser aufsetzen** (die Herdplatte glüht, nach ein paar Sekunden pfeift der Kessel und dampft; dann „Kessel vom Herd nehmen“);
  **Feuer im Ofen anzünden** (das Feuer glüht hinter der Ofentür, das Licht flackert); **Vorhänge zuziehen/aufziehen** an vier Fenstern
  (Sofa, Hintertür, Nordost, Anbau – die Vorhänge gleiten zur Fenstermitte).
- Hütte: **Lampe an/aus** (Schalter an der Tür), **Setzlinge gießen** (die Erde in den Schalen wird dunkel), Stuhl in der Ecke.
- Gewächshaus: **Dachfenster öffnen**, **Tomaten ernten** (die reifen sind dann gepflückt), **Tomaten ausgeizen** (die Geiztriebe in den
  Blattachseln verschwinden), Tür.
- Zum Lernen (Falko, Nachtrag 6: Methoden realistisch): die Handgriffe sagen kurz, wie man es richtig macht – Ofen von oben anzünden
  (Scheite unten, Anzündholz und Anzünder oben, Luftklappe auf), Teewasser (schwarzer Tee sprudelnd, grüner abgekühlt), Setzlinge mit feiner
  Brause nur auf die Erde gießen, Tomaten am Knick über dem Kelch abbrechen, Geiztriebe klein ausbrechen.
- Ein einziges Punktlicht bedient alle Lampen (und das Ofenfeuer): es geht zur eingeschalteten Lampe in dem Gebäude, in dem man steht
  (sonst zur nächsten, dann mit kürzerer Reichweite, damit es nachts nicht durch Wände und Dach auf Rasen und Bäume scheint).
- Leistung: einfarbige Teile eines Gebäudes teilen sich ein Material (Farbe, Rauheit, Metall aus zwei 64-px-Bildern, `paletteize` in
  `garten_kit.js`) – `render/zmerge.js` fasst sie zu wenigen Draw-Calls zusammen statt einem je Farbe.

## Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 8971 --serve garten:nogeo=1` (≈ 5 min) – Türen nach Norden, Hineingehen durch
  die Nordtüren, geschlossene Tür und Wände halten auf, Lampen und Sitze im Spiel, Bilder nach `out/garten/` (außen, innen, vom Bett,
  vom Sofa, Schrank offen, Hütte, Gewächshaus, nachts mit Licht und mit zugezogenen Vorhängen), Handgriffe (Kessel, Vorhänge, Gießen,
  Ernten, Ausgeizen, Ofen).
- Bei GitHub läuft `garten` bei jedem Push auf `feat/garten` mit (`viz3/extra/garten/tests.txt`), Bilder im Artefakt `out`.
- `v16d:bridge` (Traktor mit Anhänger durch den Garten zum Holzplatz, zwischen Pavillon und Hütte durch) lief nach dem Umsetzen des
  PV-Moduls einmal auf `feat/garten` mit (Lauf 39891480342, grün: 1,1 m vor dem Holzplatz, nichts gestreift); auf `src` steht er in
  `viz3/extra/winde/tests.txt`. `garten` prüft selbst, dass das PV-Modul ≥ 2,5 m von der Fahrlinie entfernt bleibt (jetzt 3,56 m).

## Außerhalb der eigenen Dateien (mit dem Kern-Chat abgesprochen, 23.10. 3:40)

- `garden/env.js` Kieswege (`PATHS` 4 und 5): vom Abzweig `[10.3, 1.4]` führt der Weg zum Gewächshaus jetzt an dessen Nordtür, der zur
  Hütte an deren Nordtür; die alten Enden an der West- bzw. Südtür sind weg (die Trittplatten sind damit überflüssig).
- `game/player.js` Ort „Holzhaus“ im Menü: nordwestlich der Hütte mit Blick auf die neue Tür (`pos: [9.5, 1.4], yaw: 154`).

## Für den Kern-Chat (gemeinsame Dateien, noch zu tun)

- `docs/ARCHITECTURE.md` (Zeile `GARTEN` und Modulkarte sind seit cdd2176 drin): in Abschnitt 1 „Punktlichter entstehen in …“ noch
  `garden/garten_in.js` (1, `garten-lamp`, von allen Gartenlampen und dem Ofenfeuer geteilt).
- `docs/CHANGELOG.md` (V16i nennt Vorhänge, Ausgeizen und das PV-Modul südlich der Hütte schon), wahlweise noch: die Handgriffe sagen
  kurz, wie man es richtig macht (Ofen von oben anzünden, Tee, Gießen, Ernten, Ausgeizen); Geranien mit runden Blättern und Dolden;
  Tomatenpflanzen mit Blattquirlen statt grüner Kugeln.
- `docs/PARALLEL.md`: Stand.
- Wahlweise `viz3/site.js`: Gewächshaus `az: 6` und Mitte 0,5 m nach Norden (`[12.49, -0.09]`) – dann den Block am Anfang von
  `garden/greenhouse.js` streichen.
- Sonst nichts: `garden/env.js` (Wege) und `game/player.js` (Ort „Holzhaus“) sind auf `feat/garten` schon geändert (siehe oben).

## Hinweise

- Das Gewächshaus ist in `garden/greenhouse.js` um 90° gedreht (Lagedaten `site.js`: Kurs 96°, lange Seite Ost–West) und 0,5 m nach Norden
  gerückt; wer die Lagedaten anpasst, kann diese Zeilen streichen.
- Die Schlüssel der platzierten Modelle (Möbelplaner, `typ#n`) der drei Gebäude zählen in einem eigenen Bereich (`garten_kit.js`
  `keysBegin/keysEnd`), damit die Modelle weiter unten (Werkstatt) ihre gespeicherten Schlüssel behalten.
- Ein Punktlicht mehr in allen Shadern (`garden/garten_in.js`, Name `garten-lamp`); neues `window.GARTEN` (Test- und Spiel-API).
- Möbel unter Dach werfen keinen Sonnenschatten (`interiorNoShadow`), einfarbige Teile teilen sich ein Material (`paletteize`).
- Die acht Vorhänge im Bungalow, die man zuziehen kann, werden nicht zusammengefasst (`userData.noMerge`, 8 Draw-Calls, nur innen sichtbar);
  die Geiztriebe haben ein eigenes Material, das beim Ausgeizen unsichtbar wird (geht auch nach dem Zusammenfassen).
