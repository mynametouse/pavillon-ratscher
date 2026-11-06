# Wetter wie draußen (feat/wetter)

Falko, 5.11.2026 23:02: **Wetter live als Standard** – die Welt zeigt das Wetter, das in Ratscher gerade ist, umschaltbar auf „nach Kalender“
(wie bisher). 23:17: „Wichtig ist natürlich trotzdem immer der Realismus.“ Auftrag: `docs/plans/auftraege/wetter.md`.

## Was es gibt

- **Daten:** Open-Meteo (frei, ohne Schlüssel, CC BY 4.0, „Wetterdaten: Open-Meteo.com“) für den Garten (50,4705° N, 10,7801° O),
  vom Browser abgerufen: aktuelle Werte (15-Minuten-Daten) und Stunden um jetzt, alle 15 Minuten neu, solange die Seite sichtbar ist; für
  einen anderen Spieltag dessen Stunden (Vorhersage bis 16 Tage voraus, rund 3 Monate zurück über die Vorhersage-API, älter das Archiv ERA5),
  einmal je Tag und Besuch. Werte: Temperatur, Niederschlag, Regen, Schauer, Schnee, Bewölkung, Sicht, Wind, Böen, Windrichtung, Wettercode,
  Feuchte, Schneehöhe. Fehlt etwas (das Archiv hat keine Sicht), wird es vernünftig geschätzt. Code: `viz3/src/wetter/wx_data.js` (rein,
  Einheitentest `viz3/test/unit/wetter.test.mjs`).
- **Welche Stunde:** Steht die Spieluhr auf jetzt (±45 min), gelten die aktuellen Werte – „Wetter wie draußen“. Sonst (eigenes Tempo,
  Zeitraffer, Schlafen, Szene, Zombie-Nacht am 31.10.) das echte Wetter der Spielstunde – „Wetter vom 31.10.“ bzw. „Vorhersage für 7.11.“ –,
  zwischen den Stunden gleitend. Ohne Daten (offline, Fehler, mehr als 16 Tage voraus): der Himmel nach dem Kalender, und das Fenster sagt warum.
- **Zu sehen** (`wetter/wx_sky.js`, `wetter/wx_fall.js`): Wolkendecke im Himmelsprogramm des Tageslaufs (kein neues Shader-Programm) –
  aufgelockert nach Bewölkungsgrad, ziehend mit dem Wind, bedeckt als geschlossene graue Decke (zum Zenit heller), dunkler bei Regen, im Nebel
  verschwindet der Himmel; bei tiefer Sonne (Abend, Morgen) leuchten die Wolken von unten warm, zur Sonne hin am stärksten. Nachts
  leuchten die Sterne zwischen aufgelockerten Wolken und gehen hinter ihnen aus (je Stern dieselbe Wolkendecke im Sternen-Shader, beim
  Laden übersetzt); Mond und Milchstraße verdeckt die Decke ohnehin. Das Licht folgt: Sonne gedämpft (zieht eine Wolke vor die Sonne, wird es in dem Moment dunkler), mehr diffuses
  Himmelslicht, das Auge passt sich an, grauer Dunst nach der Sicht (der größere Wert gewinnt; der Nebel der Zombie-Nacht bleibt darüber),
  keine Sterne und kein Mondlicht unter geschlossener Decke, Wolkenschatten auf dem fernen Land nur bei aufgelockerter Bewölkung. Regen als
  Schlieren um die Kamera (Nieselregen fein und langsam, Starkregen dicht und schnell), Schnee als sinkende, pendelnde Flocken, Schneeregen
  gemischt, alles vom Wind und den Böen getragen; ein Netz, beim Laden übersetzt, Dichte über den Zeichenbereich; Flocken höchstens ein
  paar Pixel groß und vor der Linse ausgeblendet; drinnen (Pavillon, Gartengebäude, Häuser der Zombie-Nacht) keine Tropfen, im Fahrzeug
  keine in der Kabine; im Pavillon fällt der Regen jenseits seiner Wände weiter (durch die großen Fenster zu sehen), in anderen Gebäuden
  keiner; Spritzer am Boden rund um die Spielfigur (kurze weiße Flecken, wo Tropfen aufschlagen). Gewitter: Blitze flackern (erster
  Schlag, Nachschläge, ~0,4 s) am Himmel und auf dem Land, nahe Einschläge (bis ~3,5 km) mit sichtbarem, zackigem Blitzkanal in ihrer
  Richtung, Donner nach der Entfernung; Hagel
  (Codes 96/99) als kleine, schnelle Körner im Regen. Nachts unter geschlossener Decke ein mattes Orange-Grau der Städte ringsum
  (Schleusingen, Suhl, Hildburghausen) an der Wolkenunterseite – eine bedeckte Nacht ist nie ganz schwarz. Neben der Uhr oben rechts ein
  kleines Wetterzeichen (Wolken, Regen, Schnee, Nebel, Gewitter), sein Tooltip nennt die Zeile.
- **Nasser Boden, Schnee liegt** (`wetter/wx_boden.js`): Regen macht Gelände, Felder, Kacheln, Brücken, den Gartenboden und (etwas) die Dächer
  dunkler und glänzender – und das bleibt Stunden nach dem Regen (aus dem Niederschlag der letzten Stunden der Daten). Liegt Schnee
  (Schneehöhe der Daten, ab ~4 cm ganz), werden dieselben Flächen weiß, mit einem Weiß, das dem Licht folgt; Wände, Bäume, Gras bleiben.
  Nur Farbe/Rauheit/Leuchten der Materialien (Uniforms), die Originale kommen genau zurück. Die neuen 3D-Gebäude (`gebaeude/`) nutzen das
  Dachmaterial des Dorfs und werden mit nass und weiß; die Grasbüschel des Rasens werden nass etwas dunkler und unter Schnee weiß.
  **Reif:** nach einer klaren, windstillen, kalten, feuchten Stunde der letzten acht (Luft bis ~+2 °C – der Boden ist kälter): die
  Grasbüschel am stärksten bereift, Dächer deutlich, Boden und Land wenig, Straßen kaum, ein Hauch Blau im Weiß; er taut, wenn die Sonne
  steigt (ab ~8°, bis ~22° weg) oder wenn es mild wird.
- **Zu hören** (`wetter/wx_ton.js`): echte Aufnahmen über Wikimedia Commons (`viz3/extra/wetter/dist/wetter/`, `ton.json`, ~1,7 MB,
  geschnitten mit `viz3/extra/wetter/quellen/ton.py` auf GitHub Actions, `.github/workflows/wetter-ton.yml` – Commons begrenzt Abrufe vom
  Chat-Rechner): Regen (gemeinfrei), ab 2 mm/h ein deutscher Sommer-Platzregen darüber (CC BY-SA 3.0), drinnen und im Auto Regen aufs
  Vordach (gemeinfrei), Wind aus einem Sturm von 25 m/s im Kiefernwald (CC BY-SA 4.0) hinter einem Tiefpass, der mit dem Wind aufgeht
  (Brise: fernes Rauschen, Sturm: volles Tosen), drei Donner (gemeinfrei, CC BY-SA 4.0, CC BY 3.0) nach Entfernung verzögert und gedämpft.
  Jede Art wird erst geladen, wenn ihr Wetter kommt (kein Speicher für Sturm und Donner an einem ruhigen Tag). Nieselregen und
  Sturmpfeifen im Browser erzeugt. Die Atmosphäre des Spiels hört mit: Vögel verstummen bei Regen, Gewitter, Nebel und Sturm, der leise
  Wind der Atmosphäre folgt dem echten Wind (eine windstille Nacht ist still).
- **Die nächsten Stunden:** im Uhrfenster unter der Zeile alle zwei Stunden ab der Spielzeit („16 Uhr Regen · 7 °C“), so weit die Daten reichen.
- **Mitfahren und fahren:** im Auto (fahren, mitfahren) und im Bus keine Tropfen in der Kabine (Bus: 7 m, er ist lang), der Regen trommelt
  aufs Dach, keine Spritzer.
- **Wählen:** Menü → Einstellungen → Spiel → „Wetter: wie draußen | nach Kalender“ (gespeichert in `pav-wetter-v1` `{ v: 1, m }`), dieselbe
  Wahl im Uhrfenster mit der Zeile „Regen · 7 °C · Wind 20 km/h, Böen 38 – Open-Meteo“, dazu „Uhr und Datum auf jetzt“ (Spielzeit wie
  draußen, in Echtzeit) und „Wetter ausprobieren“ (Sonne, Wolken, Regen, Starkregen, Gewitter, Schnee, Nebel, Sturm … – nur für den Besuch).
  `?wetter=kalender | live | regen | schnee | nebel | gewitter …` in der Adresse.
- Nur mit dem Tageslauf (Menü → Erleben → Tageslauf), nicht in der Draufsicht und nicht bei fester Stimmung.

## Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9001 --serve wetter` (Abschnitte: `python3 viz3/test/wetter.py 9001
  start,jetzt,wetter,innen,kalender,fehler,zombie,neu`), Bilder in `out/wetter/`. Auf GitHub über `viz3/extra/wetter/tests.txt`.
- Ein Testbrowser fragt Open-Meteo nie (`navigator.webdriver`); `WETTER.mock(fn | json | 'fail')` antwortet statt dessen in der Form von
  Open-Meteo. `WETTER.state()` zeigt Quelle, Werte, Tropfen, Spritzer, Himmel, Tonpegel, geladene Aufnahmen.
- Echte Antworten von Open-Meteo (der Chat-Rechner bekommt HTTP 429; geprüft 6.11. ~2:00: alle vier Arten gelesen, jede Antwort mit
  `access-control-allow-origin: *` – der Browser auf der veröffentlichten Seite darf sie lesen) liest der Job „Echte Wetterdaten lesen“ in
  `.github/workflows/wetter-ton.yml` mit dem Parser des Moduls (`viz3/extra/wetter/quellen/echt.mjs`): jetzt, ein Tag vor 5 Tagen, eine
  Vorhersage in 10 Tagen, das Archiv für den 1.6.2026; Artefakt `wetter-echt` mit den Rohantworten.

## Offen

- **Spielzeit und „wie draußen“:** Steht die Spieluhr nicht auf jetzt (Standard für Neue: Tag 1 = 1.6.2026, 7:30), zeigt „wie draußen“ das
  echte Wetter dieser Spielstunde (Archiv), z. B. „Wetter vom 1.6.“. Wie gerade draußen erst mit „Uhr und Datum auf jetzt“ (Uhrfenster;
  der erste Hinweis sagt es, ebenso ein Hinweis, wenn man „wie draußen“ von Hand wählt, während die Uhr woanders steht). Bei der
  üblichen Spielzeit „1 Std = 1 Min“ läuft das Spiel dem echten Wetter davon – nach einer Minute ist es die Vorhersage der nächsten
  Stunde; „Uhr und Datum auf jetzt“ stellt deshalb auch auf Echtzeit. Vorschlag für Falko: die Spielzeit beim Start auf jetzt stellen, wenn „wie draußen“ gewählt ist (oder eine
  Einstellung „Spielzeit: wie draußen“) – das betrifft das ganze Spiel, deshalb nicht hier entschieden.
- Bäume und Gras wiegen nicht im Wind: die Gartenbäume tauschen ez-trees Blattmaterial gegen ein eigenes (`garden/trees.js`, `patchSV`)
  ohne Wiegen; das ginge nur über die Blatt-Shader dort (gemeinsame Datei).
- Pfützen, Spritzer am Boden; Regen am Fenster und an der Windschutzscheibe.
- Lichtglocke der Städte unter der Wolkendecke nachts.

## Für den Lead

- Gemeinsame Dateien (je Stelle `// feat/wetter`):
  - `viz3/src/time/daynight.js`: `HOOK = { look, v }` – am Ende von `compute()` darf das Wetter LOOK und den Himmelsstand ändern
    (nur im Tageslauf, nicht in der Draufsicht; Fehler schalten den Haken ab), `A.hookV !== HOOK.v` in `fade`, `hookV` in `S.ap`;
    im Rückgabeobjekt `skyMat: dnSkyMat` und `hook: HOOK`.
  - `viz3/src/time/clock.js`: `CLOCK.section({ html, bind })` – weitere Abschnitte im Uhrfenster nach dem Datum; `CLOCK.redraw()`.
  - `viz3/src/core/save.js`: ein Schlüssel `pav-wetter-v1`.
  - `viz3/src/audio/audio.js`: `wxBirds`, `wxWind` (Standard 1) und `audio.weather({ birds, wind })` – Vögel (Schleife und Einzelrufe) und
    der leise Wind (Aufnahme und erzeugter) werden damit multipliziert; fünf markierte Stellen.
  - `viz3/src/modules.txt`: Block `# feat/wetter` vor `game/tutorial.js`.
- Die Menüzeile „Wetter“ setzt `wetter/wetter.js` selbst unter „Spielzeit“ ein (keine Änderung an `shell/menu.html`); das Wetterzeichen
  hängt es als `span.wxi` an `#clockbtn` (die Uhr und DN schreiben nur `.hbt` und das erste `.hbi`).
- Für ARCHITECTURE.md: neuer `window`-Name `WETTER` (`wetter/wetter.js`; Test-API `mock`, `snap`, `state`, `preset`, `setMode`,
  `clockToNow`, `fall`), Schlüssel `pav-wetter-v1` `{ v: 1, m: 'live' | 'kalender' }`, Hinweis `pav-wetter-neu` (SAVE.once); Module
  `wetter/wx_data.js` (WXDATA, rein), `wx_sky.js` (WXSKY), `wx_fall.js` (WXFALL), `wx_ton.js` (WXTON), `wx_boden.js` (WXBODEN), `wetter.js`.
- CSP: Die veröffentlichte Seite (GitHub Pages) setzt keine Content-Security-Policy (kein Meta-Tag in `shell/head.html`, Pages sendet keinen
  Header) – `api.open-meteo.com` und `archive-api.open-meteo.com` sind erreichbar. Nur der Testserver (`tools/csp/cspserve.py`) erlaubt
  `connect-src 'self'`; so soll es bleiben (Tests fragen nie). Käme je eine CSP dazu: `connect-src 'self' https://api.open-meteo.com
  https://archive-api.open-meteo.com`.
- Quellen: `credits_add` in `viz3/extra/wetter/manifest.json` (Open-Meteo, CC BY 4.0; ERA5/Copernicus; die Aufnahmen).
- Neuer Workflow `.github/workflows/wetter-ton.yml` (nur bei Änderungen an `viz3/extra/wetter/quellen/**` auf `feat/wetter`, lädt nur ein
  Artefakt hoch, schiebt nichts). Ein „Neu“-Hinweis `SAVE.once('pav-wetter-neu')` beim ersten echten Wetter.
- Lehre für alle: das Scratch-Verzeichnis teilen sich Lead und Hilfs-Agenten (gleiche Sitzung) – eigene Unterordner mit Präfix nehmen.
