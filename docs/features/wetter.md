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
  verschwindet der Himmel. Das Licht folgt: Sonne gedämpft (zieht eine Wolke vor die Sonne, wird es in dem Moment dunkler), mehr diffuses
  Himmelslicht, das Auge passt sich an, grauer Dunst nach der Sicht (der größere Wert gewinnt; der Nebel der Zombie-Nacht bleibt darüber),
  keine Sterne und kein Mondlicht unter geschlossener Decke, Wolkenschatten auf dem fernen Land nur bei aufgelockerter Bewölkung. Regen als
  Schlieren um die Kamera (Nieselregen fein und langsam, Starkregen dicht und schnell), Schnee als sinkende, pendelnde Flocken, Schneeregen
  gemischt, alles vom Wind und den Böen getragen; ein Netz, beim Laden übersetzt, Dichte über den Zeichenbereich; drinnen (Pavillon,
  Gartengebäude, Häuser der Zombie-Nacht) keine Tropfen, im Fahrzeug keine in der Kabine. Gewitter: Blitze am Himmel und auf dem Land,
  Donner nach der Entfernung.
- **Zu hören** (`wetter/wx_ton.js`): Regen draußen (Rauschen und Prasseln), drinnen das Trommeln auf dem Dach, Wind ab frischer Brise mit Böen,
  bei Sturm ein Pfeifen, Donner. Vorerst im Browser erzeugt; echte Aufnahmen (CC0 o. ä.) kommen über `dist/wetter/ton.json`.
- **Wählen:** Menü → Einstellungen → Spiel → „Wetter: wie draußen | nach Kalender“ (gespeichert in `pav-wetter-v1` `{ v: 1, m }`), dieselbe
  Wahl im Uhrfenster mit der Zeile „Regen · 7 °C · Wind 20 km/h, Böen 38 – Open-Meteo“, dazu „Uhr und Datum auf jetzt“ (Spielzeit wie
  draußen, in Echtzeit) und „Wetter ausprobieren“ (Sonne, Wolken, Regen, Starkregen, Gewitter, Schnee, Nebel, Sturm … – nur für den Besuch).
  `?wetter=kalender | live | regen | schnee | nebel | gewitter …` in der Adresse.
- Nur mit dem Tageslauf (Menü → Erleben → Tageslauf), nicht in der Draufsicht und nicht bei fester Stimmung.

## Testen

- `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9001 --serve wetter` (Abschnitte: `python3 viz3/test/wetter.py 9001
  start,jetzt,wetter,innen,kalender,fehler,zombie,neu`), Bilder in `out/wetter/`. Auf GitHub über `viz3/extra/wetter/tests.txt`.
- Ein Testbrowser fragt Open-Meteo nie (`navigator.webdriver`); `WETTER.mock(fn | json | 'fail')` antwortet statt dessen in der Form von
  Open-Meteo. `WETTER.state()` zeigt Quelle, Werte, Tropfen, Himmel, Tonpegel.

## Offen

- Echte Aufnahmen für Regen, Dach, Wind, Donner (Wikimedia Commons / OpenGameArt, CC0/CC BY).
- Nasser Boden (dunkler, glänzender) und Schnee auf dem Boden (Schneehöhe ist in den Daten) – braucht Eingriffe in die Boden-Shader.
- Bäume und Gras im Wind wiegen.

## Für den Lead

- Gemeinsame Dateien (je Stelle `// feat/wetter`):
  - `viz3/src/time/daynight.js`: `HOOK = { look, v }` – am Ende von `compute()` darf das Wetter LOOK und den Himmelsstand ändern
    (nur im Tageslauf, nicht in der Draufsicht; Fehler schalten den Haken ab), `A.hookV !== HOOK.v` in `fade`, `hookV` in `S.ap`;
    im Rückgabeobjekt `skyMat: dnSkyMat` und `hook: HOOK`.
  - `viz3/src/time/clock.js`: `CLOCK.section({ html, bind })` – weitere Abschnitte im Uhrfenster nach dem Datum; `CLOCK.redraw()`.
  - `viz3/src/core/save.js`: ein Schlüssel `pav-wetter-v1`.
  - `viz3/src/modules.txt`: Block `# feat/wetter` vor `game/tutorial.js`.
- Die Menüzeile „Wetter“ setzt `wetter/wetter.js` selbst unter „Spielzeit“ ein (keine Änderung an `shell/menu.html`).
- CSP: Die veröffentlichte Seite (GitHub Pages) setzt keine Content-Security-Policy (kein Meta-Tag in `shell/head.html`, Pages sendet keinen
  Header) – `api.open-meteo.com` und `archive-api.open-meteo.com` sind erreichbar. Nur der Testserver (`tools/csp/cspserve.py`) erlaubt
  `connect-src 'self'`; so soll es bleiben (Tests fragen nie). Käme je eine CSP dazu: `connect-src 'self' https://api.open-meteo.com
  https://archive-api.open-meteo.com`.
- Quellen: `credits_add` in `viz3/extra/wetter/manifest.json` (Open-Meteo, CC BY 4.0; ERA5/Copernicus).
