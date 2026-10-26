# Natürliche Stimmen im Browser, kostenlos: Piper (feat/piper, 25./26.10.2026)

Grundlage: Falkos Nachricht vom 25.10.2026 (Auftrag `docs/plans/auftraege/piper.md`): „Wenn möglich, möchte ich, dass die Stimmen
realistischer klingen, ohne dass sie Credits oder Geld kosten. Vielleicht findest du eine realistischere Stimme jeweils, die auch zum
passenden NPC passt.“

## Was es gibt

| Was | Wo |
|---|---|
| Vierte Stimmen-Wahl **„Natürlich“** neben „Gerät“, „ElevenLabs“ und „nur Text“ (Menü → Einstellungen → KI-Gespräche → Stimme): Piper-Stimmen (rhasspy/piper, VITS-Modelle) laufen im Browser, kostenlos, ohne Konto, auf jedem Gerät gleich. Sie sprechen die freien Gespräche und – mit „Feste Sätze vorlesen“ – die festen Sätze ohne Aufnahme | `viz3/src/audio/piper.js` (Engine `piper` von `STIMME`) |
| Sprechen in einem eigenen **Worker** (die Bildrate stockt nicht): onnxruntime-web 1.22.0 (WebAssembly, ein Thread), Text → Lautschrift mit eSpeak NG (nur Deutsch), je Modell dessen eigene Lautliste | `viz3/src/lazy/piper.js` → `dist/lazy/piper.js` (54 KB), `dist/piper/` |
| **Laden einmal**: die Modelle kommen beim ersten Mal von Hugging Face (`rhasspy/piper-voices`) und bleiben im Cache Storage des Browsers (`pav-piper-v1`), beim nächsten Besuch kein neuer Download; bis sie da sind, spricht die Gerätestimme | `audio/piper.js` (`load`), Worker (`modelBytes`) |
| **Speicher**: ein Telefon hält ein Modell im Speicher, ein Computer zwei (das am längsten unbenutzte geht zuerst); nach 90 s (Telefon) bzw. 5 min ohne Sprache endet der Worker und gibt den ganzen Speicher zurück | `CFG.keep`, `CFG.idle` |
| **Eine Stimme je Person** (Tabelle `VOICES`): Hubert die klarste deutsche Stimme (Thorsten), tiefer und langsamer; alle anderen je eine eigene Sprecherin bzw. ein eigener Sprecher aus dem Hörbuch-Modell (Multilingual LibriSpeech, 236 Stimmen – nach Messung die klarsten ausgesucht: gleichmäßige Stimme, wenig Rauschen, Tonhöhe passend zu Alter und Rolle). Ältere tiefer und langsamer; später angemeldete Personen (Spaziergänger, Fahrer) nach Geschlecht und Alter aus `POOL` | `audio/piper.js` |
| Die Besetzung (gemessene Tonhöhe): Hubert Thorsten ~105 Hz, Ronald Hörbuch 122 (warm, ~120 Hz), Gerhard 152 (tief, klar), Manfred 141 (ruhig), Wolfgang 156 (tief, ~95 Hz), Uwe 171 (sehr warm), Jens 13 (klar, jung), Katrin 36 (klar, ~210 Hz), Ingrid 46 (warm, ~180 Hz), Heike 73 (freundlich, ~195 Hz) – je Person eine Zeile in `VOICES`, zum Anhören `out/piper/cast_<name>.wav` im Artefakt | `audio/piper.js` |
| **Tonhöhe** über die Abspielrate (der Puffer bekommt eine etwas andere Abtastrate, `length_scale` gleicht das Tempo aus); **Lautstärke** angeglichen (die Hörbuch-Stimmen unterscheiden sich sonst um bis zu 10 dB) | `toBuffer`, Worker `level` |
| **Einstellungen**: Stand des Ladens (Prozent, MB), „Stimmen laden“, „Stimmen löschen“, zuletzt gebrauchte Zeit; unter „Stimmen der Personen“ je Person eine Piper-Stimme zur Wahl (gespeichert in `pav-piper-v1`), ▶ hört probe (wartet auf die Stimme) | `audio/piper.js` (`panel`, `row`, `change`), Haken in `audio/stimme.js` |
| **Ohne Netz** (Hugging Face nicht erreichbar, kein Speicher): die Gerätestimme spricht, ein Hinweis im Gespräch („Sprachausgabe Natürlich: keine Verbindung zu Hugging Face – die Gerätestimme spricht.“) und in den Einstellungen; nach 2 Minuten neuer Versuch | `load`, `ok()` |

## Größen und Zeiten (gemessen bei GitHub Actions, Chromium, ein Thread, `viz3/test/piper.py`)

| | |
|---|---|
| Mit der Seite (eigene Dateien, erst bei Wahl von „Natürlich“ geladen) | `dist/piper/ort-wasm-simd-threaded.wasm` 11,2 MB (+ `.mjs` 21 KB), Phonemizer 1,8 MB (`phonemize.wasm` 0,6 MB, `phonemize_de.data` 1,05 MB statt 18 MB mit allen Sprachen, `phonemize.mjs` 112 KB), Worker 54 KB – zusammen ≈ 13 MB |
| Modelle (einmal, von Hugging Face) | Thorsten (medium) 63 MB + Hörbuch-Modell (mls, medium) 77 MB = **140 MB**; zur Wahl weitere je 21–77 MB |
| Laden der 140 MB | 2–3 s bei GitHub (zu Hause bei 50 MBit/s ≈ 25 s) |
| Modell in den Speicher (Sitzung) | Thorsten 1,1–2,0 s, Hörbuch-Modell 0,5–1,2 s |
| Sprechen (Rechenzeit ÷ Sprechdauer) | medium (22 kHz) 0,2–0,4 (je nach Rechner der Runde), low (16 kHz) ≈ 0,18, high (Thorsten hoch) 1,5–2,4 – zu langsam, nicht angeboten |
| Erster Satz, Stimme im Speicher | 0,7–1,2 s für 3,3 s Sprache (Lautschrift 10 ms) |
| Erster Satz nach dem Neuladen der Seite (Modell aus dem Cache) | 2,3–3,2 s für 3,3 s Sprache (Worker, Sitzung, Satz) |
| Speicher (WebAssembly im Worker) | 196 MB mit Thorsten allein, 290–344 MB mit zwei Modellen; Renderer-Prozess +350 MB |

Auf einem Laptop dürfte der erste Satz in gut einer halben Sekunde kommen (ein Kern dort ist schneller als bei GitHub). Auf dem iPhone ist
es nicht gemessen (kein Gerät hier) – ein Modell (~200 MB) zusätzlich zur 3D-Szene sollte gehen, zwei wären knapp; deshalb dort eins.

## Lizenzen

- Piper (Programm) und die Modelle auf Hugging Face: MIT. Die Stimmen selbst nach ihren Datensätzen: Thorsten und Thorsten emotional
  (Thorsten-Voice) CC0, Kerstin CC0, Hörbuch-Modell (Multilingual LibriSpeech, OpenSLR 94) **CC BY 4.0** (Namensnennung in den Quellen der
  Seite), Ramona, Eva K., Karlsson: M-AILABS Speech Dataset. **Pavoque** ist CC BY-NC-SA 4.0 (nicht kommerziell) – deshalb nicht zur Wahl.
- onnxruntime-web (Microsoft): MIT, auf der eigenen Seite mitgeliefert (`dist/piper/`, von `build.py` aus `node_modules` kopiert) – kein CDN,
  läuft auch unter einer strengen Content-Policy (`'self'`), immer dieselbe Version.
- **eSpeak NG ist GPL-3.0-or-later** (und damit auch die WebAssembly-Fassung von piper-phonemize, npm `@diffusionstudio/piper-wasm` – dort
  steht fälschlich MIT). Wer es verbreitet, muss die Lizenz mitgeben und die Quellen zugänglich machen; ein Programm, das damit *verbunden*
  wird, müsste selbst unter die GPL. Deshalb bleibt es ein eigenes Programm: eigene Dateien in `dist/piper/` (nicht im Bündel), aufgerufen
  wie eine Kommandozeile (Argumente hinein, eine JSON-Zeile mit der Lautschrift heraus – `callMain`), Lizenztext und Quellen daneben
  (`dist/piper/LICENSE-espeak-ng.txt`, Quellen: rhasspy/espeak-ng, wide-video/piper-phonemize; die eigene Änderung – nur deutsche Daten, ES-
  Modul – ist `viz3/extra/piper/make_phonemize.mjs` im öffentlichen Repo). Der Rest der Seite bleibt ohne GPL. Wer gar keine GPL auf der
  Seite will, bräuchte eine eigene deutsche Lautschrift (Wörterbuch + Regeln) – großer Aufwand, schlechtere Aussprache.

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8987 --serve piper    # ~3 min; ohne Internet mit einem Ersatzmodell (fake)
node --test viz3/test/unit/piper.test.mjs                                          # Lautliste je Modell
```

`viz3/test/piper.py`: Engine da, nichts geladen, bevor sie gewählt ist; jede Person eine eigene Stimme (Männer/Frauen, Alter); Laden in den
Cache; Hubert und Katrin (verschiedene Stimmen, Tonhöhe gemessen), die ganze Besetzung als WAV (`out/piper/cast_<name>.wav`), Zeiten,
Speicher; 200 Sätze hintereinander durch die Lautschrift; Abspielen über den Stimmen-Bus (kein `speechSynthesis`); Einstellungen;
nach dem Neuladen kein zweiter Download; ohne Netz die Gerätestimme mit Hinweis. Bei GitHub Actions mit den echten Stimmen (die Zeilen
stehen auch im Job-Log), ohne Internet mit `viz3/extra/piper/fake.onnx` (`make_fake.py`). `piper:survey=1`: alle deutschen Stimmen und
alle 236 Hörbuch-Sprecher einmal, mit Tonhöhe, Klangfarbe, Rauschen, Gleichmäßigkeit (`out/piper/survey.json`, WAVs der Einzelstimmen).

## Für den Kern-Chat

- Neue Datei in `modules.txt`: `audio/piper.js` direkt unter `audio/stimme.js`; neuer `window`-Name `PIPER`; neuer Speicher-Schlüssel
  `pav-piper-v1` (meldet sich selbst bei `SAVE` an, `{ over: { person: 'modell[:sprecher]' } }`); Cache Storage `pav-piper-v1` (die Modelle).
- `viz3/package.json`: `onnxruntime-web` 1.22.0 (genau). `build.py`: drei Zeilen kopieren `ort-wasm-simd-threaded.{wasm,mjs}` nach `dist/piper/`.
  `viz3/extra/piper/`: Phonemizer (`dist/piper/`), Quellen-Eintrag (`manifest.json`, `credits_add`), Ersatzmodell, `tests.txt`.
- Haken in `audio/stimme.js` (alle mit „feat/piper hook“ markiert): `prepare` gibt die Optionen an `buf` weiter (4. Argument, `{ probe: true }`
  beim ▶), `stop()` ruft `stop()` der Engines, je Person eine eigene Zelle der Engine (`row(k, p)`), Änderungen an Feldern mit `data-st-eng`
  gehen an `change(t, rerender)`, `STIMME.chosen` (gewählte Engine, auch solange sie noch nicht sprechen kann).
- Die Hugging-Face-Abrufe gehen an `huggingface.co` (und dessen CDN) – auf der Website ohne Content-Policy kein Thema; der Testserver
  (`connect-src 'self'`) braucht im Test `bypass_csp` und für den Worker dessen Skript ohne Policy (so in `piper.py`).
- **Vorschlag Standard-Engine:** vorerst „Gerät“ lassen. „Natürlich“ als Standard auf Computern, sobald die Stimmen einmal geladen sind
  (oder nach einer einmaligen Frage „Natürliche Stimmen laden? 140 MB“, wenn das Gerät nur künstliche Stimmen hat – `STIMME.voices()[0].q < 60`).
  Auf dem iPhone erst nach einem Versuch am echten Gerät (Speicher, erster Satz).
- Offen: echte Probe auf iPhone und Laptop; anhören der WAVs (Artefakt `out` des Laufs, `out/piper/cast_*.wav`) und ggf. andere Sprecher in
  `VOICES` (je Person eine Zeile).
