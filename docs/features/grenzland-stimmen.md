# Grenzland: echte Stimmen (Hilfs-Agent `stimmen`, Runde 2, 13.11.2026)

Auftrag: `docs/plans/auftraege/grenzland2-stimmen.md` (gemeinsamer Teil `grenzland2-gemeinsam.md`). Branch `feat/grenzland-stimmen`.

## Was es tut

Jede feste Zeile, die im Modus „Grenzland“ gesprochen wird, bekommt eine natürliche Stimme – eine Microsoft-Edge-Stimme je Person, wie die
Dorfbewohner seit dem 25.10.2026. Aufgenommen wird auf GitHub Actions (der Chat-Rechner erreicht den Sprachdienst nicht). Im Spiel spielt
`STIMME.say('gl_<wer>', text)` die Aufnahme ab, wenn eine mit genau diesen Worten da ist (`viz3/src/audio/stimme.js`, `recorded()`), sonst
spricht die Gerätestimme wie bisher.

- **Sammeln:** `node tools/voices/grenzland_linien.mjs` → `tools/voices/grenzland_linien.json` (`{ cast, lines: [{ who, id, text, prio, src }] }`).
  Die Regeln stehen einmal, in `GLSTIMMEN.sammeln()` (`viz3/src/grenzland/gl_stimmen.js`); der Sammler in Node und das Spiel benutzen
  dieselbe Funktion. Quellen: die Gespräche der Missionen (`GLMDATA.R`), **jedes Modul mit `linien()`** (kino, welt, der Lead …), die Leute
  von 1989 (`GL89DATA.SAGT`), die Sprecher des Radios (`GLRDATA`), bis `GLFAHNDUNG.linien()` da ist auch der Polizeifunk (`FUNK` aus
  `gl_fahndung.js` gelesen). Damit der Sammler auch Module erreicht, die die Szene brauchen, lädt er alle Module des Ordners in einem
  Kindprozess mit Platzhaltern für alles außerhalb des Ordners; geht das schief, liest er nur die reinen Datenmodule.
- **Id:** `gl_<wer>_<FNV-1a der Worte>` wie im Dorf (`x_gerhard_1gxnwae`) – gleiche Worte, gleiche Id.
- **Aufnehmen:** `tools/voices/grenzland_record.py` (edge-tts + ffmpeg) über `.github/workflows/stimmen_grenzland.yml` bei jedem Push auf
  `feat/grenzland-stimmen` oder `feat/grenzland`, der die Liste, das Skript oder den Workflow ändert. Nur Neues oder Geändertes wird
  aufgenommen; was nicht mehr in der Liste steht, fliegt raus. Der Bot schreibt `viz3/extra/grenzland-stimmen/` zurück in denselben Branch.
- **Einbauen:** `viz3/build.py` hängt die Liste `vx_add` eines Extras an `VOICEX.lines` an (die Listen der Extras ersetzen sich sonst
  gegenseitig – die Dorf-Sätze wären weg). Ich sammle `vx_add` schon in der Schleife über die Extras ein (wie `credits_add`), damit zwei
  Extras mit `vx_add` sich nicht überschreiben; angehängt wird direkt nach der `vm_replace`-Schleife.
- **Im Spiel (`GLSTIMMEN`, läuft nur im Modus):** beginnt ein Missionsschritt, holt es die Aufnahmen seiner Gespräche und der zwei nächsten
  Schritte vorab in den HTTP-Cache (drei gleichzeitig); beim Radio die Worte des laufenden Beitrags. Solange eine Stimme spricht, sendet es
  `grenzland:stimme { an }` und ruft `GLSCORE.duck(an)` / `GLRADIO.duck(an)`, wo es die gibt. `GLSTIMMEN.fehlend()` listet, was keine
  Aufnahme hat; `GLSTIMMEN.linien()` alles.

## Entscheidungen (Falko schlief, alle Freigaben)

- **Rangfolge und Budget (alle Dateien ≤ 6 MB, Ziel 5,8 MB):** 1 = Geschichte (Gespräche der Missionen, kino), 2 = Welt (Polizeifunk,
  Reaktionen und Ereignisse von welt, die Straße 1989), 3 = Radio Grenzland und Radio Republik (1989), 4 = die anderen Sender. 1 und 2
  werden immer aufgenommen, 3 und 4 so weit das Budget reicht – kommen nach einem Merge neue Zeilen von welt/kino dazu, fallen die letzten
  Radio-Sätze automatisch heraus (sie sprechen dann wieder mit der Gerätestimme).
- **Klang:** Personen 24 kHz mono, MP3 40 kbit/s, Lautheit −17 LUFS, Stille an den Enden weg. Radiosprecher: Sendeklang (Hochpass 120 Hz,
  Tiefpass 7 kHz, Kompressor, etwas Präsenz), 16 kHz, 24 kbit/s, −18 LUFS. Polizeifunk: Rauschstoß (Squelch) vor und nach dem Satz,
  Telefonband 300–3400 Hz, stark komprimiert und leicht übersteuert, 16 kHz, 24 kbit/s, −19 LUFS.
- **Polizeifunk mit zwei Stimmen unter einem Schlüssel:** `gl_funk` ist die Leitstelle „Rennsteig“ (eine Frau); Zeilen, die mit „Schleuse
  12 …“, „Bussard 1 …“ oder „Verstanden …“ beginnen, spricht der Streifenwagen (ein Mann). Die Aufnahme hängt nur an Worten und Schlüssel –
  welt muss nichts unterscheiden.
- **Erzähler (`''` in `GLMDATA.R`) bleibt stumm:** GTA hat keinen Erzähler; die Zeilen sind Regieanweisungen („Gerhard sieht die Karte lange
  an.“). Kino kann sie als Texttafeln zeigen.
- **Junger Gerhard (1989):** eigener Schlüssel `gl_gerhard89` – dieselbe Stimme wie der alte Gerhard (Andrew), schneller und etwas höher.
  Bisher spricht er nirgends (Gerhard wird 1989 gespielt).
- **Dorfbewohner in Grenzland:** spricht ein Modul sie als `gl_<name>` an (z. B. `gl_ingrid`), bekommen sie ihre Stimme aus dem Dorf.
- **Unbekannte Sprecher** (neue Schlüssel eines Moduls): eine Stimme nach Geschlecht und Alter aus `GLDATA.CAST` (sonst nach dem Namen),
  Tempo und Höhe nach dem Alter.

## Besetzung

Edge bietet drei deutsche Männer (Conrad, Killian, Florian), Jonas (AT), Jan (CH), die Frauen Katja, Amala, Seraphina, Ingrid (AT), Leni
(CH); die mehrsprachigen US-Stimmen sprechen Deutsch mit leichtem Akzent (im Dorf schon Andrew für Gerhard, Brian für Wolfgang). Wer sich in
einer Szene begegnet, klingt verschieden; eine Stimme für zwei nur, wo sie sich nie treffen, dann mit anderem Tempo und anderer Höhe.

| Person | Stimme | Tempo | Höhe |
|---|---|---|---|
| Falko (40, echt) | de-DE Florian (Multilingual) | ±0 % | −1 Hz |
| Sarah (36, echt) | de-DE Seraphina (Multilingual) | ±0 % | ±0 Hz |
| Der Fremde (55) | de-DE Conrad | −6 % | −9 Hz |
| Jule (26) | de-DE Katja | +5 % | +1 Hz |
| Timo (24) | de-DE Killian | +6 % | +2 Hz |
| Basti (22) | de-AT Jonas | −8 % | −6 Hz |
| Gerhard (72) | en-US Andrew (Multilingual) – wie im Dorf | −10 % | −6 Hz |
| Gerhard 1989 (35) | en-US Andrew (Multilingual) | −2 % | −1 Hz |
| Dieter Krähwinkel (58) | en-US Brian (Multilingual) | −6 % | −8 Hz |
| Wachmann 1 | de-CH Jan | −4 % | −8 Hz |
| Wachmann 2 | de-DE Conrad | +4 % | −3 Hz |
| Fahrer (Wache 3) | de-AT Jonas | −4 % | −9 Hz |
| Polizist | de-DE Killian | −3 % | −6 Hz |
| Polizistin | de-AT Ingrid | +2 % | ±0 Hz |
| Yuki (29) | de-CH Leni | +2 % | +2 Hz |
| Verkäuferin (52) | de-DE Amala | −4 % | −4 Hz |
| Polizeifunk: Leitstelle / Streife | de-DE Katja / de-DE Killian (Funkklang) | −2 % / +2 % | −2 / −5 Hz |
| 1989: Lutz (30) | de-DE Killian | −2 % | −3 Hz |
| 1989: der ABV (50) | de-DE Conrad | −4 % | −6 Hz |
| 1989: Volkspolizist (28) | de-AT Jonas | +2 % | ±0 Hz |
| 1989: Horst (58) | de-CH Jan | −6 % | −5 Hz |
| 1989: Werner (61) | de-DE Florian | −4 % | −5 Hz |
| 1989: Kurt (74) | en-US Brian (Multilingual) | −14 % | −10 Hz |
| 1989: Maik (19) | de-DE Killian | +10 % | +5 Hz |
| 1989: Erna (66) | de-DE Amala | −8 % | −8 Hz |
| 1989: Renate (38) | de-DE Katja | ±0 % | −2 Hz |
| 1989: Brigitte (57) | de-AT Ingrid | −4 % | −4 Hz |
| 1989: Gisela (46) | de-DE Seraphina | −2 % | −3 Hz |
| 1989: Ines (20) | de-CH Leni | +6 % | +4 Hz |
| Radio Grenzland: Matze (45) | en-US Brian (Multilingual), Sendeklang | +8 % | +3 Hz |
| Kirmeswelle: Gundula (58) | de-AT Ingrid | −3 % | −3 Hz |
| Klassik am Kamm: Frau Dr. Sommerlatte (61) | de-DE Katja | −10 % | −6 Hz |
| Zweitakt: Ecki (52) | de-DE Killian | +10 % | +1 Hz |
| Blasius: Schorsch (63) | de-AT Jonas | −6 % | −4 Hz |
| Neon: Synthia (31) | en-US Emma (Multilingual) | +4 % | +2 Hz |
| 1989 Radio Republik: der Sprecher | de-DE Conrad | −4 % | −4 Hz |
| 1989 Impuls: Kati (24) | de-DE Amala | +8 % | +4 Hz |
| 1989 Frankenwelle 3: Wolfi (34) | en-US Andrew (Multilingual) | +6 % | +3 Hz |

Die Tabelle steht als `CAST` in `tools/voices/grenzland_record.py`; eine Änderung dort nimmt die betroffenen Sätze beim nächsten Lauf neu auf.

## Stand

(wird nach den Aufnahmen ergänzt)

## Für den Lead

- **Nach einem Merge neuer Zeilen** (welt: `GLREAKTION.linien()`, `GLFAHNDUNG.linien()`, `GLEREIGNIS.linien()`; kino): auf
  `feat/grenzland` `node tools/voices/grenzland_linien.mjs`, die geänderte `tools/voices/grenzland_linien.json` committen und pushen – der
  Workflow „Stimmen Grenzland“ nimmt das Neue auf und committet es zurück (`[skip ci]`), danach einmal `git pull`. Der Unit-Test
  `grenzland_stimmen` schlägt fehl, solange ein Gespräch aus `GLMDATA.R` nicht in der Liste steht (Hinweis mit dem Befehl).
- **Zeilen, die nur als Untertitel erscheinen** (aufgenommen, aber noch nicht gesprochen – die Dateien gehören diese Runde niemandem):
  folgt.
