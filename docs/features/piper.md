# Natürliche Stimmen im Browser, kostenlos: Piper (feat/piper, 25./26.10.2026)

Grundlage: Falkos Nachricht vom 25.10.2026 (Auftrag `docs/plans/auftraege/piper.md`): „Wenn möglich, möchte ich, dass die Stimmen
realistischer klingen, ohne dass sie Credits oder Geld kosten. Vielleicht findest du eine realistischere Stimme jeweils, die auch zum
passenden NPC passt.“

## Was es gibt

| Was | Wo |
|---|---|
| Dritte Stimmen-Wahl **„Natürlich“** neben „Gerät“, „ElevenLabs“ und „nur Text“ (Menü → Einstellungen → KI-Gespräche → Stimme): Piper-Stimmen (rhasspy/piper, VITS-Modelle) laufen im Browser, kostenlos, ohne Konto, auf jedem Gerät gleich | `viz3/src/audio/piper.js` (Engine `piper` von `STIMME`) |
| Sprechen in einem eigenen **Worker** (die Bildrate stockt nicht): onnxruntime-web 1.22.0 (WebAssembly, ein Thread), Text → Lautschrift mit eSpeak NG (nur Deutsch, 1 MB) | `viz3/src/lazy/piper.js` → `dist/lazy/piper.js` (53 KB), `dist/piper/` |
| **Laden einmal**: die Modelle kommen beim ersten Mal von Hugging Face (`rhasspy/piper-voices`) und bleiben im Cache Storage des Browsers (`pav-piper-v1`), beim nächsten Besuch kein neuer Download; bis sie da sind, spricht die Gerätestimme | `audio/piper.js` (`load`), Worker (`modelBytes`) |
| **Speicher**: ein Telefon hält ein Modell im Speicher, ein Computer zwei (das am längsten unbenutzte geht zuerst); nach 90 s (Telefon) bzw. 5 min ohne Sprache endet der Worker und gibt den ganzen Speicher zurück | `CFG.keep`, `CFG.idle` |
| **Eine Stimme je Person**: Tabelle `VOICES` (Person → Modell, Sprecher, Tempo `length_scale`, Tonhöhe); Ältere tiefer und langsamer, Frauen und Männer verschieden, später angemeldete Personen (Spaziergänger, Fahrer) nach Geschlecht und Alter (`POOL`) | `audio/piper.js` |
| **Tonhöhe** über die Abspielrate: der Puffer bekommt eine etwas andere Abtastrate, `length_scale` gleicht das Tempo aus | `toBuffer` |
| **Einstellungen**: Stand des Ladens (Prozent, MB), „Stimmen laden“, „Stimmen löschen“, zuletzt gebrauchte Zeit; unter „Stimmen der Personen“ je Person eine Piper-Stimme zur Wahl (gespeichert in `pav-piper-v1`), ▶ hört probe (wartet auf die Stimme) | `audio/piper.js` (`panel`, `row`, `change`), Haken in `audio/stimme.js` |
| **Ohne Netz** (Hugging Face nicht erreichbar, kein Speicher): die Gerätestimme spricht, ein Hinweis im Gespräch („Sprachausgabe Natürlich: keine Verbindung zu Hugging Face – die Gerätestimme spricht.“) und in den Einstellungen; nach 2 Minuten neuer Versuch | `load`, `ok()` |

## Für den Kern-Chat

- Neue Datei in `modules.txt`: `audio/piper.js` direkt unter `audio/stimme.js`; neuer `window`-Name `PIPER`; neuer Speicher-Schlüssel
  `pav-piper-v1` (meldet sich selbst bei `SAVE` an, `{ over: { person: 'modell[:sprecher]' } }`); Cache Storage `pav-piper-v1` (die Modelle).
- `viz3/package.json`: `onnxruntime-web` 1.22.0 (genau). `build.py`: drei Zeilen kopieren `ort-wasm-simd-threaded.{wasm,mjs}` nach `dist/piper/`.
- Haken in `audio/stimme.js` (alle mit „feat/piper hook“ markiert): `prepare` gibt die Optionen an `buf` weiter (4. Argument, `{ probe: true }`
  beim ▶), `stop()` ruft `stop()` der Engines, je Person eine eigene Zelle der Engine (`row(k, p)`), Änderungen an Feldern mit `data-st-eng`
  gehen an `change(t, rerender)`, `STIMME.chosen` (gewählte Engine, auch solange sie noch nicht sprechen kann).
