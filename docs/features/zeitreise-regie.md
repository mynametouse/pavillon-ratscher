# Zeitreise – die Regie (`ZKREGIE`, `viz3/src/zukunft/zk_regie*.js`)

Hilfs-Agent `zeitreise-regie`, 13.11.2026, Stufe 1 der „Zeitreise durch vier Welten“ (Plan `docs/plans/plan_zeitreise.md`, Aufträge
`docs/plans/auftraege/zeitreise-gemeinsam.md` und `zeitreise-regie.md`). Die Regie spielt die Chronik (`ZKCHRONIK`) in der einen Welt ab,
die `ZKZEITWELT` zeichnet: Zeit, Kamera, Halte, Stimmen und das geteilte Bild. Die Oberfläche (Jahr, Titel, Untertitel, Karten, Tasten)
baut der Workshop-Modus (`zk_workshop*.js`); er liest nur `ZKREGIE.state()` und die Ereignisse.

## Module

| Modul | Global | Aufgabe |
|---|---|---|
| `zukunft/zk_regie_orte.js` | `ZKORTE` | die neun Orte: Standpunkt, Blickpunkt, Blickwinkel, langsame Fahrt; gebaute Orte fragt es `ZKZEITWELT.place(id)` |
| `zukunft/zk_regie_bild.js` | `ZKBILD` | zeichnet jedes Bild selbst, solange die Zeitreise läuft: eine Welt oder das geteilte Bild, Kinobalken, Überblendungen, Standbilder |
| `zukunft/zk_regie.js` | `ZKREGIE` | der Ablauf: Kapitel, Zeitraffer, Halte, Stimmen, Uhr, Kalender, Wetter, Rückkehr |

**Haken in Kern-Dateien** (je eine Zeile, markiert `// feat/zeitreise-regie`):

- `game/camera.js`: `export const CAMSET = { fn: null }`, `applyCam()` fragt zuerst `CAMSET.fn()`.
- `render/render.js`: `RENDER.draw` (null), `renderFrame()` fragt zuerst `RENDER.draw(kind)`.

Solange die Zeitreise aus ist, sind beide `null`: nichts läuft, nichts wird geladen oder kompiliert.

## Ablauf

- **Kapitel nacheinander**, jedes durch seine eigenen Jahre (Wald 2026–2050, Wasser 2026–2050, Energie 2026–2060).
- **Einstellungen im Zeitraffer:** Zu Beginn jedes Kapitels einmal der weite Überblick 90 m über dem Anger (Richtung 195°, 10° nach
  unten). Danach wechseln sich `fern` und die Orte des Kapitels ab. `fern` ist ein langes Objektiv (30°) von derselben Höhe auf die Hänge
  im Süden und Südwesten, sodass der Wald das Bild füllt. Die Hänge werden gefilmt, wie Dokumentarfilme Landschaftswandel zeigen: lange
  Brennweiten (25–35°), die Kamera steht oder schwenkt sehr langsam, keine Augenhöhe über offene Felder.
- **Zeitraffer:** 2 s je Jahr bei Tempo 1 (`speed(k)`), eine feste Uhrzeit je Kapitel (Wald 11:30, Wasser 12:00, Energie 12:30). Die Tage
  laufen weiter, Jahreszeiten und Sonnenhöhe wechseln, ohne Tag-Nacht-Flackern. Wetter „heiter“. Etwa alle 10 s ein anderer Ort des
  Kapitels mit 1 s Überblendung. Die Kamera bewegt sich langsam: einige Meter Fahrt oder ein langsamer Schwenk.
- **Ein Ereignis mit Halt**, fünf Schritte:
  1. Der Zeitraffer läuft aus.
  2. Vorspiel: Die Uhr läuft weiter bis zur Stunde des Ereignisses, sein Wetter kommt. Am Abend wird es dunkel. Der Morgen nach einer
     Nacht schließt ohne Zeitraffer an.
  3. Die Haken `before()` laufen (Telefon von `zeitreise-medien`, höchstens 30 s).
  4. Überblendung zum Ort, zu Fuß in Augenhöhe 1,65 m. Datum, Stunde und Wetter des Ereignisses werden gesetzt.
  5. Die Phase läuft über `ev.halt` Sekunden. Dabei gilt `ZKCHRONIK.at(ev, phase)` → `state()`: Wasser steigt, Licht geht aus, die
     Story-Uhr läuft `ev.dur` Stunden. Die Sätze kommen nacheinander. Danach geht es im Zeitraffer weiter.

  Im Halt bewegt sich die Kamera nie (später steht dort eine VR-Brille).

  **Zwei Einstellungen nacheinander (geteiltes Bild, Familienwald an der Klinge):** Die Bäume vorn sind für beide Welten ein Satz, so
  zeigten beide Hälften dieselbe Welt. Ein Halt an `waldrand` zeigt darum erst die linke Welt auf dem ganzen Bild, dann (vor dem ersten
  Satz der rechten Welt, bei gleichen Sätzen nach der Hälfte) die rechte. `state()` meldet dann `pair` = diese eine Welt, `split: false`,
  `take: 'L'|'R'`, `fullPair` = das Paar; Ereignis `{ type:'take', take, world }`. Der Zeitraffer lässt `waldrand` im geteilten Bild aus. Ist die Gewitterzelle der Chronik vorbei (`water.rain` wieder
  `null`), hört der Starkregen auf (Wetter „bedeckt“).
- **Ereignisse ohne Halt** ziehen vorbei: Ereignis `{ type:'event', state:'pass' }` und 5 s `state().note`.
- **Kapitelende:** `card` mit `{ chapter, title, sub, kpi: { welt: [...] }, questions, last }`. Die Wiedergabe pausiert, `next()` oder
  `play()` geht weiter. Danach laufen die Haken `between()` (Radio), dann das nächste Kapitel. Nach dem letzten Kapitel kommt `end`.
- **Präsentator:**
  - `next()`: zum nächsten Halt, Halt beenden, Karte weiter.
  - `prev()`: den letzten Halt noch einmal, sonst den Kapitelanfang; gleich nach einem Halt den davor.
  - `seek(y)` springt im laufenden Kapitel zu einem Jahr; `seek(y, kapitel)` in dieses Kapitel (die Zeitleiste des Workshops).
  - `pause()` / `toggle()`.
  - `split(v)`, `side('L'|'R')`.

## Vertrag (v1, mit den Ergänzungen vom 13.11.)

```
ZKREGIE.start({ pair:['allein','gewappnet'], split:true, chapter:null, speed:1, play:true })
ZKREGIE.state() → { on, pair, split, side, worlds, chapter, chapterIndex, y, date, ev, next, phase, playing, place, placeLabel, card,
                    mode, speed, line, note, waiting, bars, span }
ZKREGIE.on(fn) → off       { type:'tick'|'chapter'|'event'|'line'|'cue'|'card'|'end'|'place'|'play', … }
ZKREGIE.before(fn) → off   fn({ ev, w, worlds, side, place }) vor einem Halt; darf ein Promise geben (höchstens 30 s)
ZKREGIE.between(fn) → off  dasselbe nach der Karte: { ev:null, w, worlds, side, place, chapter, prev }
ZKREGIE.snapshot(placeId, side) → Promise<dataURL>   JPEG des Orts für eine Seite, im selben Bild gezeichnet (nie sichtbar)
ZKREGIE.duck(level)        Umgebung und Stimmen leiser, solange Medien-Ton läuft (1 = normal)
ZKREGIE.bars(k)            Höhe eines Kinobalkens als Anteil (Vorgabe 0,09 = die 9vh des Workshops)
```

Die einzelnen Ereignisse:

- `cue`: `{ type:'cue', id, label, side, w, p, h, ev }` – die Zeichen der Stresstests (`ev.cues` der Chronik: Sirene, Blaulicht, Pumpe,
  Licht aus, Aggregat, Licht in der Schule …) bei ihrer Phase; hat `ZKZEITWELT` eine Funktion `cue(id, side, info)`, bekommt es sie auch.
- `line`: `{ type:'line', id, who, text, key, role, side, w, rec, dur }`; `dur` ist die Länge der Aufnahme (`VOICEX`), sonst eine Schätzung. `who` ist der Anzeigename aus `ZKCHRONIK.WHO`, `key` die Person
  für die Stimme.
- `state().ev`: nur in den Modi `before` und `halt`. Es enthält `{ id, title, text, kind, place, placeLabel, halt, dur, weather, same,
  fork, side, L, R }`; `L` und `R` sind die Fassungen beider Welten, wenn sie verschieden sind.
- `mode`: `lapse` (Zeitraffer), `prelude`, `before`, `halt`, `card`, `between`, `end`, `off`.
- `snapshot`: Wer vor einem Halt den Ort des Halts fotografiert, bekommt am Haltbeginn einen harten Schnitt. Der Halt steht genau in
  dieser Pose, so kann das Foto „lebendig werden“.

## Das geteilte Bild

- **Zeichnen:** Dieselbe Kamera wird zweimal mit Viewport und Scissor gezeichnet: links `camera.layers` 0+21 (Welt L), rechts 0+22 (Welt
  R). Eine Welt zeichnet 0+21 (bzw. 0+22 bei `side('R')`).
- **Kosten:** Beide Pipelines (die volle mit AO und SMAA, die billige der Bewegung) haben die Größe ihres Bildes: halbe Breite, die Höhe
  zwischen den Balken. Das geteilte Bild füllt also nicht mehr Pixel als ein Bild, nur die Draw-Calls verdoppeln sich. Neue Programme
  entstehen keine, denn Layer gehören zu keinem Programm.
- **Schatten:** Die Schattenkarte der Sonne entsteht einmal je Bild (in der linken Hälfte) und gilt für beide. Was auf 21/22 liegt, sollte
  keine Sonnenschatten werfen.
- **Lichter:** Keine Lichter auf 21/22, sonst entstehen neue Programme. Unterschiede nur über Material und Leuchten.
- **Layer 21/22** belegt sonst niemand. Nur `CULL` nutzt 29; der Test prüft, dass vor dem Start und nach dem Ende nichts auf 21/22 liegt.
- **Blickwinkel:** Im geteilten Bild ist er um 16 % weiter, weil jede Hälfte schmaler ist.

## Uhr, Kalender, Licht, Wetter, Ansicht

Diese Werte setzt die Regie beim Start; `stop()` stellt sie genau wieder her:

| Was | Beim Start | Nach `stop()` |
|---|---|---|
| Kalender | `DN.e0` so verschoben, dass der heutige Spieltag der 1.1.2026 ist | wie vorher |
| Uhr | Das Datum läuft über `CLOCK.t` | wie vorher |
| Licht | Modus „Tageslauf“ (`setMode('auto')`) | wie vorher |
| Wetter | Wetter-Vorgabe (`WETTER.preset`) | wie vorher |
| Ansicht | Modellansicht (`P.mode = 'orbit'`): niemand läuft, die Uhr läuft nicht von selbst, der Schattenkasten folgt dem Bild (`P.tgt`) | Ort, Blick, Schulterkamera wie vorher |
| Kamera-Layer | 0+21 bzw. 0+22 | wie vorher |

Schlüssel `pav-zeitreise-v1` hält Uhr und Kalender von vorher, solange die Zeitreise läuft. Wird die Seite mittendrin geschlossen, stellt
der nächste Start sie zurück.

Im Zeitraffer gibt es höchstens zwei neue Schattenkarten je Sekunde. Der Himmel folgt dem Datum in jedem Bild (`DN.update` alle 0,04 s).

## Stimmen

Ein Satz wird so gesprochen:

1. die Aufnahme dieser Worte, falls es eine gibt (`STIMME.say`: `window.VOICEX`, Aufnahmen der Chronik über `stimmen/zeitreise`);
2. sonst die Browser-Stimme der Person (`STIMME`, nur mit der Einstellung „Feste Sätze vorlesen“);
3. sonst nur Text.

Weitere Regeln:

- Personen ohne Profil bekommen eins: Name aus `ZKCHRONIK.WHO`, Alter im Jahr des Ereignisses.
- Unter einem Satz wird die Umgebung leiser (0,35). Darum soll die Welt ihren Ton über `audio.raw().amb` leiten.
- `duck(level)` senkt Umgebung und Stimmen-Bus. Die Lautstärken der Einstellungen gelten weiter.

## Test

`viz3/test/zeitreise.py` (1920×1080, Grafikstufe „mittel“) läuft in den Abschnitten `api`, `lapse`, `split`, `halt`, `nav`, `hooks`, `orte`
und `stop` und prüft:

- Zeitraffer und feste Stunde;
- das geteilte Bild mit Prüfflächen auf 21/22;
- die Starkregennacht: Halt, Phase, Stunde, Wetter, Sätze;
- next, prev, seek, Karte, `between`, Tempo;
- `before`, `snapshot`, `duck`;
- Programme: Start ≤ +60, beim Abspielen +0;
- `stop` stellt alles zurück;
- keine Seitenfehler.

Bilder liegen in `out/zeitreise/` (`orte_<kapitel>.jpg` als Kontaktbogen, `lapse_split`, `split_2045`, `halt_starkregen`, `snapshot_*`).
Themen-Tests in `viz3/extra/zeitreise-regie/tests.txt`: `smoke`, `zeitreise`, `zukunft`.

## Orte (Stand 13.11., nach drei Kontaktbögen in CI)

| Ort | Zeitraffer | Halt |
|---|---|---|
| `ueberblick` | 90 m über dem Anger, Richtung 195°, 10° nach unten, 60° – nur am Kapitelanfang | – |
| `fern` | von derselben Höhe, Richtung 205°, 30°: die Hänge im Süden, der Kamm mit dem Windrad links | – |
| `anger` | vom Spielort „Dorf (Anger)“ (241,5/−101,5) an der Dorflinde vorbei nach Südwesten | gleich |
| `hang` | vom Hang nordöstlich des Dorfs (85 m über dem Boden), 30°, über das Tal auf die Klinge und die Hänge dahinter | zu Fuß am Hang (430/90), dieselbe lange Sicht (Sichtprüfung `zeitreise-welt`) |
| `waldrand` | vor dem Nordost-Rand des Familienwalds (`world/forest.js` CORE), ~20 m vor den ersten Fichten | gleich; im geteilten Bild zwei Einstellungen |
| `schule` | vom Rasen vor der alten Schule beim Wegweiser | gleich |
| `bruecke` | an der Schleusebrücke auf der Linie des Flusses, flussaufwärts zum Dorf | gleich |
| `strasse`, `heizhaus`, `windrad`, `kahlflaeche` | von `ZKZEITWELT.place(id)` (`windrad`: die Lichtung 255 m nördlich), sonst die Tabelle in `zk_regie_orte.js` | gleich |

## Offen

- Die Orte nach dem nächsten Kontaktbogen (`out/zeitreise/orte.jpg`) weiter nachstellen: `anger`, `bruecke`, `waldrand` sind noch nicht im
  Bild geprüft.
- Bildkosten auf einer Onboard-Grafik messen; Ziel sind 30 fps bei 1080p in Stufe „mittel“. Gemessen in CI, SwiftShader:
  - geteiltes Bild: 638 Draw-Calls, 1,08 Mio. Dreiecke;
  - eine Welt: 349 Draw-Calls, 0,56 Mio. Dreiecke;
  - der Zeitraffer hat höchstens zwei neue Schattenkarten je Sekunde.
- Telefon im Hochformat: Das geteilte Bild wird dort sehr schmal (der Workshop ist für große Bildschirme).
