# Grenzland: echte Stimmen (Hilfs-Agent `stimmen`, Runde 2, 13.11.2026)

Auftrag: `docs/plans/auftraege/grenzland2-stimmen.md` (gemeinsamer Teil `grenzland2-gemeinsam.md`). Branch `feat/grenzland-stimmen`.

## Was es tut

Jede feste Zeile, die im Modus „Grenzland“ gesprochen wird, hat jetzt eine natürliche Stimme – eine Microsoft-Edge-Stimme je Person, wie die
Dorfbewohner seit dem 25.10.2026. Aufgenommen wird auf GitHub Actions (der Chat-Rechner erreicht den Sprachdienst nicht). Im Spiel spielt
`STIMME.say('gl_<wer>', text)` die Aufnahme ab, wenn eine mit genau diesen Worten da ist (`viz3/src/audio/stimme.js`, `recorded()`), sonst
spricht die Gerätestimme wie bisher. Der Missionsablauf, der Polizeifunk (welt) und das Radio rufen `STIMME.say` schon selbst auf – mit den
Aufnahmen sprechen sie ab sofort mit echten Stimmen, ohne dass jemand etwas ändern muss.

- **Sammeln:** `node tools/voices/grenzland_linien.mjs` → `tools/voices/grenzland_linien.json` (`{ cast, lines: [{ who, id, text, prio, src }] }`).
  Die Regeln stehen einmal, in `GLSTIMMEN.sammeln()` (`viz3/src/grenzland/gl_stimmen.js`); der Sammler in Node und das Spiel benutzen
  dieselbe Funktion. Quellen: die Gespräche der Missionen (`GLMDATA.R`), **jedes Modul mit `linien()`** (heute schon `GLMISSION` von kino
  und `GLFAHNDUNG` von welt), die Leute von 1989 (`GL89DATA.SAGT`), die Sprecher des Radios (`GLRDATA`). Damit der Sammler auch Module
  erreicht, die die Szene brauchen, lädt er alle Module des Ordners in einem Kindprozess mit Platzhaltern für alles außerhalb des Ordners
  (Zeitlimit 90 s); geht das schief, liest er nur die reinen Datenmodule. `GL_SRC=<anderes viz3/src> … --out <datei>` sammelt aus einem
  anderen Stand – so habe ich die Zeilen von welt und kino schon vor dem Zusammenführen aufgenommen.
- **Id:** `gl_<wer>_<FNV-1a der Worte>` wie im Dorf (`x_gerhard_1gxnwae`) – gleiche Worte, gleiche Id, gleiche Datei.
- **Aufnehmen:** `tools/voices/grenzland_record.py` (edge-tts + ffmpeg) über `.github/workflows/stimmen_grenzland.yml` bei jedem Push auf
  `feat/grenzland-stimmen` oder `feat/grenzland`, der die Liste, das Skript oder den Workflow ändert. Nur Neues oder Geändertes wird
  aufgenommen; was nicht mehr in der Liste steht, fliegt raus. Der Bot schreibt `viz3/extra/grenzland-stimmen/` zurück in denselben Branch
  (`[skip ci]`), dazu eine Tabelle (Satz, Stimme, Sekunden, Lautheit) in die Zusammenfassung des Laufs und eine Notiz als Annotation.
- **Einbauen:** `viz3/build.py` hängt die Liste `vx_add` eines Extras an `VOICEX.lines` an (die Listen der Extras ersetzen sich sonst
  gegenseitig – die Dorf-Sätze wären weg). Ich sammle `vx_add` schon in der Schleife über die Extras ein (wie `credits_add`), damit zwei
  Extras mit `vx_add` sich nicht überschreiben; angehängt wird direkt nach der `vm_replace`-Schleife. `VOICEX.voices` bekommt die Stimmen der
  Grenzland-Leute – in Edge spricht die Gerätestimme dann für nicht aufgenommene Sätze mit derselben Microsoft-Stimme.
- **Im Spiel (`GLSTIMMEN`, läuft nur im Modus, nach „Beenden“ ist alles aus):**
  - beginnt ein Missionsschritt, holt es die Aufnahmen seiner Gespräche und der zwei nächsten Schritte vorab in den HTTP-Cache (drei
    gleichzeitig; welche Gespräche ein Schritt hat, liest es aus `rede` und den Wörtern seiner Funktionen, z. B. `sag(S, 'fremder')`); beim
    ersten Stern die Funkzeilen (die Beschreibung kommt in Bruchstücken, jedes muss sofort da sein); beim Radio die Worte des laufenden
    Beitrags; beim Sprung nach 1989 die Straße;
  - **die Straße von 1989 spricht:** `gl_1989.js` zeigt, was die Leute sagen, nur als Untertitel, meldet aber `grenzland:sagt` – darauf
    spricht `GLSTIMMEN` die Aufnahme an der Figur (nur Sätze aus der Liste, nur mit Aufnahme; ohne Aufnahme bleibt es beim Untertitel);
  - solange eine Stimme spricht: `grenzland:stimme { an }`, `GLSCORE.duck(an)` (kino, gibt es) und `GLRADIO.duck(an)` (gibt es noch nicht,
    siehe „Für den Lead“); die eigenen Worte des Radiosprechers senken das Radio nicht;
  - `GLSTIMMEN.fehlend()` – was keine Aufnahme hat; `GLSTIMMEN.linien()` – alles; `GLSTIMMEN.stand()` für Tests.

## Entscheidungen (Falko schlief, alle Freigaben)

- **Rangfolge und Budget:** zuerst ≤ 6 MB; welts Reaktionen geben aber jedem von zehn Kommentatoren jeden Satz (370 Zeilen), alles zusammen
  sind gut 11 MB. **Der Lead hat um 14:00 12 MB erlaubt** (`GL_BUDGET`, MP3 11,6 MB, mit den beiden Listen < 12 MB; jede Datei < 5 MB; die
  Dateien laden erst, wenn ein Satz gesagt wird – die Seite wird nicht schwerer). Damit ist **alles** aufgenommen. Die Rangfolge bleibt für
  den Fall, dass es wieder enger wird:
  1 = Geschichte (Gespräche der Missionen) – immer;
  2 = Welt (Polizeifunk und Rufe, die Zufallsereignisse, die Straße 1989, die eigenen Sätze des Spielers) – immer;
  2.5 = die Reaktionen der Leute, die auch in der Geschichte sprechen (Gerhard, Jule, Timo, Basti) – ihre Stimme darf nicht zwischen
  Aufnahme und Gerätestimme wechseln;
  3 = Radio Grenzland (Matze) und Radio Republik (1989), Satz für Satz in dieser Reihenfolge: Ansagen, Moderation, der Polizeibericht über
  die eigenen Taten, Nachrichten, Verkehr, Werbung, zuletzt die Sushi-Geschichte – bis zum ersten Satz, der nicht mehr passt;
  3.5 = die Reaktionen aller anderen (Verkäuferin, Yuki, Böller-Mann, Bratwurst-Uwe, Kirmesbursche, Kirmesmädchen);
  4 = die anderen Sender.
  2.5, 3.5 und 4 gehen **nur als ganze Person** (ein Sender oder ein Nachbar mit einem echten Satz zwischen lauter Gerätestimmen klingt
  falsch); was über dem Budget liegt, spricht mit der Gerätestimme. Die Reaktionen klingen etwas dumpfer (16 kHz, 24 kbit/s) – man hört
  sie auf der Straße, meist aus ein paar Metern.
- **Klang:** Personen 24 kHz mono, MP3 40 kbit/s, −17 LUFS, Stille an den Enden weg. Radiosprecher: Sendeklang (Hochpass 120 Hz, Tiefpass
  7 kHz, Kompressor, etwas Präsenz), 16 kHz, 24 kbit/s, −18 LUFS. Polizeifunk: Telefonband 300–3400 Hz, stark komprimiert, leicht
  übersteuert, 16 kHz, 24 kbit/s, −19 LUFS, ein Rauschstoß („Squelch“) dort, wo eine Durchsage beginnt und endet – die Beschreibung des
  Spielers in Bruchstücken (welt: „Zentrale an alle Streifen.“ · „Gesucht wird Falko,“ · „rotes Karohemd,“ · … · „Kommen.“) klickt nur am
  Anfang und am Ende.
- **Polizeifunk mit zwei Stimmen unter einem Schlüssel:** `gl_funk` ist die Leitstelle (eine Frau, wie die Disponentin in GTA); Zeilen, die
  mit „Schleuse 12 …“, „Bussard 1 …“ oder „Verstanden …“ beginnen, spricht der Streifenwagen (ein Mann). Die Aufnahme hängt nur an Worten und
  Schlüssel – welt muss nichts unterscheiden.
- **Eine Stimme, die nicht liefert, wird für die ganze Person ersetzt:** Am 13.11. lieferte Florian (Multilingual) für die meisten Sätze
  keinen Ton („No audio was received“). Das Skript versucht Fehlgeschlagenes einzeln noch einmal; gibt eine Stimme zweimal hintereinander
  nichts, bekommt die Person die nächste Stimme ihrer Liste – für **alle** ihre Sätze (eine Stimme je Person). So spricht **Falko jetzt mit
  Conrad** (die Wahl merkt sich `aufnahmen.json` unter `_bad`; Eintrag löschen, um Florian später noch einmal zu versuchen). Deshalb ist der
  Fremde nicht mehr Conrad, sondern Killian, tief und langsam. Gerhard behält seine Dorfstimme (Andrew) ohne Ersatz und bekommt dafür mehr
  Versuche. Eine Aufnahme, die stumm oder abgeschnitten ankommt, gilt als fehlgeschlagen.
- **Erzähler (`''` in `GLMDATA.R`) bleibt stumm:** GTA hat keinen Erzähler; die Zeilen sind Regieanweisungen („Gerhard sieht die Karte lange
  an.“). kino kann sie als Texttafeln zeigen.
- **Junger Gerhard (1989):** eigener Schlüssel `gl_gerhard89` – dieselbe Stimme wie der alte Gerhard, schneller und etwas höher. Bisher
  spricht er nirgends (Gerhard wird 1989 gespielt).
- **Dorfbewohner in Grenzland:** spricht ein Modul sie als `gl_<name>` an (z. B. `gl_ingrid` für eine Reaktion), bekommen sie ihre Stimme
  aus dem Dorf (`record_lines.py`).
- **Unbekannte Sprecher** (neue Schlüssel eines Moduls): eine Stimme nach Geschlecht und Alter aus `GLDATA.CAST` (sonst nach dem Namen),
  Tempo und Höhe nach dem Alter – sie werden ohne Zutun aufgenommen.

## Besetzung (so aufgenommen)

Edge bietet drei deutsche Männer (Conrad, Killian, Florian), Jonas (AT), Jan (CH), die Frauen Katja, Amala, Seraphina, Ingrid (AT), Leni
(CH); die mehrsprachigen US-Stimmen sprechen Deutsch mit leichtem Akzent (im Dorf schon Andrew für Gerhard, Brian für Wolfgang). Wer sich in
einer Szene begegnet, klingt verschieden; eine Stimme für zwei nur, wo sie sich nie treffen, dann mit anderem Tempo und anderer Höhe.

| Person | Stimme | Tempo | Höhe | Sätze |
|---|---|---|---|---|
| Falko (40, echt) | de-DE Conrad (Florian lieferte keinen Ton) | ±0 % | −1 Hz | 19 + 4 Antworten |
| Sarah (36, echt) | de-DE Seraphina (Multilingual) | ±0 % | ±0 Hz | 21 + 4 Antworten |
| Der Fremde (55) | de-DE Killian | −8 % | −12 Hz | 4 |
| Jule (26) | de-DE Katja | +5 % | +1 Hz | 17 + 37 Reaktionen |
| Timo (24) | de-DE Killian | +6 % | +2 Hz | 6 + 37 |
| Basti (22) | de-AT Jonas | −8 % | −6 Hz | 4 + 37 |
| Gerhard (72) | en-US Andrew (Multilingual) – wie im Dorf | −10 % | −6 Hz | 8 + 37 |
| Gerhard 1989 (35) | en-US Andrew (Multilingual) | −2 % | −1 Hz | – |
| Wachmann 1 | de-CH Jan | −4 % | −8 Hz | 5 |
| Wachmann 2 | en-US Brian (Multilingual) | −2 % | −6 Hz | 4 |
| Fahrer (Wache 3) | de-AT Jonas | −4 % | −9 Hz | 1 |
| Polizist / Polizistin | de-CH Jan / de-AT Ingrid | ±0 / +2 % | −3 / ±0 Hz | 2 / 1 |
| Polizeifunk: Leitstelle / Streife | de-DE Katja / de-DE Killian, Funkklang | −2 / +2 % | −2 / −5 Hz | 40 / 9 |
| Dieter Krähwinkel (58) | en-US Brian (Multilingual) | −6 % | −8 Hz | – |
| Yuki (29) · Verkäuferin (52) | de-CH Leni · de-DE Amala | +2 / −4 % | +2 / −4 Hz | je 37 Reaktionen |
| Böller-Mann (47) · Bratwurst-Uwe (56) | de-CH Jan · de-DE Killian | +1 / −5 % | +1 / −7 Hz | Ereignis-Sätze + je 37 Reaktionen |
| Kirmesbursche (21) · Kirmesmädchen (20) | de-AT Jonas · de-DE Amala | +3 / +6 % | ±0 / +3 Hz | Ereignis-Sätze + je 37 Reaktionen |
| 1989: Lutz (30) | de-DE Killian | −2 % | −3 Hz | 3 |
| 1989: der ABV (50) · Volkspolizist (28) | de-DE Conrad · de-AT Jonas | −4 / +2 % | −6 / ±0 Hz | 3 · 1 |
| 1989: Horst (58) · Werner (61) · Kurt (74) | de-CH Jan · de-DE Killian · en-US Brian | −6 / −6 / −14 % | −5 / −8 / −10 Hz | 4 · 3 · 3 |
| 1989: Maik (19) | de-DE Killian | +10 % | +5 Hz | 3 |
| 1989: Erna (66) · Renate (38) · Brigitte (57) | de-DE Amala · de-DE Katja · de-AT Ingrid | −8 / ±0 / −4 % | −8 / −2 / −4 Hz | 4 · 3 · 3 |
| 1989: Gisela (46) · Ines (20) | de-DE Seraphina · de-CH Leni | −2 / +6 % | −3 / +4 Hz | 3 · 3 |
| Radio Grenzland: Matze (45) | en-US Brian (Multilingual), Sendeklang | +8 % | +3 Hz | 69 |
| 1989 Radio Republik: der Sprecher | de-DE Conrad, Sendeklang | −4 % | −4 Hz | 25 (mit dem Konsum) |
| 1989 Impuls: Kati (24) | de-DE Amala, Sendeklang | +8 % | +4 Hz | 12 |
| Kirmeswelle: Gundula · Klassik am Kamm: Frau Dr. Sommerlatte · Zweitakt: Ecki | de-AT Ingrid · de-DE Katja · de-DE Killian, Sendeklang | −3 / −10 / +10 % | −3 / −6 / +1 Hz | 18 · 9 · 13 |
| Blasius: Schorsch · Neon: Synthia · 1989 Frankenwelle 3: Wolfi | de-AT Jonas · en-US Emma · en-US Andrew, Sendeklang | −6 / +4 / +6 % | −4 / +2 / +3 Hz | 13 · 13 · 14 |

Die Tabelle steht als `CAST` in `tools/voices/grenzland_record.py`; eine Änderung dort nimmt die betroffenen Sätze beim nächsten Lauf neu auf.

## Stand (13.11.2026, 14:30)

- **Gesammelt:** 749 Zeilen von 40 Sprechern auf dem zusammengeführten Stand (Merge 1, 250a60b3: kino, welt, licht, figuren, Paket A).
- **Aufgenommen: alle 749** – MP3 11,13 MB, der Ordner 11,40 MB, gut 50 Minuten: 92 Gesprächszeilen der Missionen, 101 Zeilen der Welt
  (Polizeifunk mit der Beschreibung in Bruchstücken, Rufe, Zufallsereignisse, Straße 1989, die Antworten des Spielers), 370 Reaktionen
  (alle zehn Kommentatoren), alle neun Radiosender (Matze mit dem Polizeibericht über die eigenen Taten und der Sushi-Geschichte, Radio
  Republik mit dem Radio im Konsum, Kirmeswelle, Klassik am Kamm, Zweitakt, Blasius, Neon, Impuls, Frankenwelle 3). Kein Satz fehlt, keine
  Aufnahme ist stumm oder abgeschnitten (geprüft: Dauer gegen Textlänge, Lautheit −23 … −14 LUFS).
- **Getestet:** Unit-Test `viz3/test/unit/grenzland_stimmen.test.mjs` (Id wie im Dorf, Regeln des Sammlers, Liste passt zu den Gesprächen;
  in `tools/check.sh`); Browser-Test `viz3/test/grenzland_stimmen.py` auf GitHub Actions (`viz3/extra/grenzland-stimmen/tests.txt`): die
  Aufnahmen neben den Dorf-Sätzen in `VOICEX`, Anteil gesprochen/aufgenommen, ein Satz spielt und sein Promise endet mit der Aufnahme, das
  Vorabholen, das Ducking-Ereignis, die Straße von 1989, nach „Beenden“ ist alles aus, keine Seitenfehler – **grün auf Actions**
  (f7554284 Lauf 43421774864 und c014d9b0 Lauf 43422908772: je 14/14). Der Chat-Rechner hatte keinen freien Browser (vier Agenten in der Schlange).
- **Nicht aufnehmbar, weil veränderlich** (bleibt Gerätestimme): im Radio die Uhrzeit („Radio Grenzland, die Nachrichten. Es ist …“), das
  Wetter, „Das war „Titel“ – Interpret“, die Geldbuße in „Die Suche … ist beendet … Geldbuße: n Euro“.
- **Nicht gesprochen, weil kein Modul sie spricht** (die Dateien gehören diese Runde niemandem): Yuki und die Sushi-Geschichte
  (`gl_neben.js`), die Verkäuferin am Wagen (`gl_wagen.js`), das Kegeln (`gl_kegeln.js`), das Radio im Konsum 1989 (`gl_1989.js`
  `sounds()`), die Sätze des Spielers und der Zeugen bei der Polizei (`gl_fahndung.js` `TX.redeIch`/`redeEr`, welt).

## Für den Lead

- **Zusammenführen (Merge 2):** `feat/grenzland-stimmen` enthält Merge 1 (250a60b3) und darauf die Liste vom zusammengeführten Stand (749
  Zeilen) mit dem Budget von 12 MB; der Bot-Commit 8913ba81 „[skip ci] Stimmen Grenzland: Aufnahmen“ bringt die Dateien (11,4 MB im Ordner).
- **Der Workflow auf `feat/grenzland`: ja, lass ihn laufen.** Er startet bei jedem Push dorthin, der `tools/voices/grenzland_linien.json`,
  das Skript oder den Workflow ändert. Der Merge-Push selbst ändert die Liste gegenüber dem alten `feat/grenzland` – der Lauf findet dann
  nichts Neues (die Aufnahmen kommen mit dem Merge) und committet nichts. Ändern kino/welt danach noch Sätze: auf `feat/grenzland`
  `node tools/voices/grenzland_linien.mjs`, die geänderte Liste committen und pushen – der Lauf nimmt nur das Neue auf (~5 Minuten, wenn die
  Warteschlange der Actions frei ist) und committet es zurück; danach `git pull` (pushst du dazwischen, setzt der Bot seinen Commit oben
  drauf). Der Unit-Test `grenzland_stimmen` schlägt fehl, solange ein Gespräch aus `GLMDATA.R` nicht in der Liste steht (mit Befehl in der
  Meldung); der Browser-Test, solange das Spiel eine Zeile sammelt, die nicht in der Liste steht.
- **Danke für `GLRADIO.duck(on)` und das Radio im Konsum** (`STIMME.say('gl_r_republik', …)`): `GLSTIMMEN` ruft `GLRADIO.duck` auf, sobald
  es da ist – außer der Radiosprecher spricht gerade selbst; die Konsum-Sätze sind als `gl_r_republik` aufgenommen. **Bitte in
  `gl_1989.js` `talk()` kein `STIMME.say` ergänzen:** die Sätze der Leute von 1989 spricht schon `GLSTIMMEN` auf das Ereignis
  `grenzland:sagt` hin – zweimal wäre doppelt.
- **Polizeifunk:** welt meldet für die Gerätestimme `STIMME.person('gl_funk', { g: 'm', age: 46 })` an; die Aufnahmen sprechen die Leitstelle
  mit einer Frau. Für Sätze ohne Aufnahme passender wäre `g: 'f'` (ein Wort in `gl_fahndung.js`, welt). Beobachtung: welt ruft die Stimme
  des Funks sofort, der Untertitel „Funk“ wartet aber in deiner Schlange, solange jemand spricht – Stimme und Untertitel können
  auseinanderlaufen.
- Falko kann Stimmen tauschen: Zeile in `CAST` (`tools/voices/grenzland_record.py`) ändern, pushen – die Sätze dieser Person werden neu
  aufgenommen. Florian für Falko noch einmal versuchen: in `viz3/extra/grenzland-stimmen/aufnahmen.json` den Eintrag `_bad` löschen.
