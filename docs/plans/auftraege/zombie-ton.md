# Auftrag Hilfs-Agent `zombie-ton` (5.11.2026, vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv)

Falko, 5.11. 9:06 (wörtlich): „Die Geräusche beim Kämpfen, zum Beispiel beim Waffe schwingen, schießen oder benutzen, sollten realistischer
sein. Auch das Schlagen und Treten realistischer sein und auch realistischer klingen nach Möglichkeit.“

## Ziel
Echte Aufnahmen mit freier Lizenz für die Kampfgeräusche der Zombie-Nacht (bisher im Browser synthetisiert, `viz3/src/zombie/z_ton.js`).
Du lieferst nur Dateien, eine Zuordnung und die Nachweise; den Code (z_ton.js) bindet der Chat selbst ein.

## Welche Geräusche (Anzahl Varianten)
- `swing_light` ×3 (Beil, Faust: kurzes Zischen), `swing_heavy` ×3 (Spaten, Brechstange, Axt, Sense: tiefes Wusch)
- `hit_blunt` ×3 (Spaten/Brechstange in einen Körper: dumpf mit Knirschen), `hit_blade` ×3 (Axt/Beil in Fleisch), `stab` ×2 (Mistgabel)
- `punch` ×3 (Faust auf Körper/Gesicht), `kick` ×2 (Stiefel in Körper)
- `bone_crack` ×2, `splat` ×3 (Blut/Fleisch), `body_fall` ×2 (Körper fällt auf Boden)
- `shotgun_shot` ×2 (doppelläufige Flinte Kaliber 12, draußen, mit Nachhall), `shotgun_dry` ×1 (Klick ohne Patrone),
  `shotgun_open` ×1 (Kipplauf öffnen, Hülsen fliegen), `shotgun_shell` ×2 (Patrone einschieben), `shotgun_close` ×1 (zuschnappen)
- wenn gut zu finden: `zombie_groan` ×4, `zombie_attack` ×2, `zombie_die` ×2 (Stöhnen/Fauchen – bisher synthetisch)

## Lizenzen
CC0 bevorzugt (z. B. Kenney.nl „Impact Sounds“ und „RPG Audio“, OpenGameArt-Pakete mit CC0), sonst CC BY oder CC BY-SA (Wikimedia
Commons, OpenGameArt) mit Nennung. **Nicht:** NC, ND, „royalty free“ mit Weitergabeverbot (Pixabay, Sonniss u. ä.), Freesound nur, wenn ohne
Anmeldung/Schlüssel herunterladbar. Keine Schlüssel ins Repo, keine privaten Daten.

## Wie
- Der Chat-Rechner erreicht diese Seiten mit der Shell nicht: Seiten mit WebFetch ansehen, URLs sammeln; Herunterladen, Umwandeln und
  Prüfen in GitHub Actions (Vorbild `.github/workflows/zombie-quellen.yml` + `viz3/extra/zombie/quellen/quellen.py`; eigene Datei
  `.github/workflows/zombie-ton.yml` + `viz3/extra/zombie/quellen/ton.py`). Rohmaterial auf einen Kratz-Branch `ref/zombie-ton` (nie mergen).
- Hören kannst du nicht: wähle nach Paket- und Dateinamen, Beschreibung, Dauer, Pegel; lass Spektrogramme rechnen (ffmpeg `showspectrumpic`)
  und schau sie dir an (Schuss: steiler Anfang, langer Nachhall; Wusch: Rauschband 0,2–0,6 s; Schlag: kurzer tiefer Impuls).
- Aufbereitung: mono, 44,1 kHz, mp3 ~96–128 kbit/s, Stille vorn/hinten weg (Schuss: Nachhall behalten), Pegel angeglichen (Spitzen
  −1 dBFS, Lautheit untereinander passend). Gesamt höchstens ~1,5 MB.

## Liefern (Branch `feat/zombie-ton` von `feat/zombie`)
- `viz3/extra/zombie/dist/zombie/kampf/<art>_<n>.mp3`
- `viz3/extra/zombie/dist/zombie/kampf.json`: `{ "<art>": { "files": ["kampf/<art>_1.mp3", …], "vol": 0.0–1.0 } }`
- Nachweise: `viz3/extra/zombie/quellen/CREDITS_TON.md` (je Datei Quelle-URL, Urheber, Lizenz, was geändert) und im `credits_add` von
  `viz3/extra/zombie/manifest.json` ein Satz mit den Urhebern/Lizenzen (wie bei den Sirenen).
- Nur diese Dateien und deine Workflow-/Skriptdateien; nichts in `viz3/src/`. `bash tools/check.sh` grün, pushen, dem Chat Hash und
  Liste schicken. Kein Browser nötig (falls doch: `bash tools/browser_lock.sh …`, Port 8997).
