# Zeitreise – die Medien (`ZKMEDIEN`, `viz3/src/zukunft/zk_medien.js`, `zk_medien_data.js`)

Hilfs-Agent `zeitreise-medien`, 13.11.2026. Handy-Übergänge, Radio als Tonbrücke und echte Videos von heute für die Zeitreise (Auftrag
`docs/plans/auftraege/zeitreise-medien.md`). Alles groß für einen Raum gedacht (Beamer): ein Handy mit ~72 vh Höhe, im geteilten Bild je ein
Handy vor jeder Welt-Hälfte; alles, was aus der Zukunft kommt, ist als „mögliche Zukunft“ / „Szenario“ markiert.

## Erfundene Namen (am 13.11.2026 kurz gegengeprüft: keine echten Medien oder Apps)
- Nachrichtenportal **„Hennebergbote“**, Radiosender **„Radio Kiefernhain 93,7“**, Dorfgruppe **„Nachbarn im Tal“**, Absender **„Warnsystem (Szenario)“**.
- Vermieden, weil vergeben: „DorfFunk“ (echte App), „Freies Wort“, „inSüdthüringen“, „Südthüringer Zeitung“, MDR-Programme, „Ratscher aktuell“ (Satire-Chat des Grenzland-Modus).
- Nur die erfundenen Dorfbewohner sprechen (Gerhard, Manfred, Wolfgang, Uwe, Katrin, Ingrid, Jens, Heike).

## Was wann kommt (Schlüssel = Ereignis-Ids der Chronik)
| Ereignis | Handy |
|---|---|
| `wald-kaefer` | Eilmeldung + Artikel, Dorfgruppe mit Foto vom Waldrand → „Foto wird lebendig“ |
| `wald-ernte` | Dorfgruppe, Foto der Kahlfläche |
| `energie-heizhaus` | je Welt: Heizhaus läuft (Gewappnet) / Heizöl wird teurer (Allein im Sturm) |
| `starkregen` | Warnung (Szenario), Dorfgruppe mit Fotos, Anruf von Manfred – je Welt anders |
| `starkregen-morgen` | Artikel am Morgen: Schlamm / glimpflich |
| `hochwasser` | Warnung, Dorfgruppe mit Foto der Brücke |
| `energie-wind*` | Windrad-Frage: Investor (Allein) / Abstimmung der Genossenschaft (Gewappnet) |
| `blackout` | Warnung, Gruppe („Alte Schule hat Strom und Wärme – kommt rüber“ / „Hat jemand noch Strom?“), „Kein Netz“ nach ~3 h, Batterieradio |

## Schnittstelle
`ZKMEDIEN.attach()` hängt sich an `ZKREGIE.before/between/on` und `WORKSHOP.layers.define` (Ebenen „Handy-Meldungen“, „Radio“, „Videos“);
ein kleiner Zeitgeber probiert das, bis beide da sind. `before({ ev, w, worlds, place })` spielt das Skript (≤ 29 s, Klick aufs Handy überspringt),
`between({ chapter, prev, worlds })` das Radio. `lines()` listet alle Sprechzeilen für die Aufnahme. `videoCard(el, kapitel)` füllt die Kapitelkarte
(`WORKSHOP.slot('card-extra')` bei `card`-Ereignis). Außerdem `play(tag|id, worlds, ev)`, `skip()`, `stop()`, `layer(id, an)`, `state()`.
Das Ereignis `zkmedien:cut { place, w }` (window) meldet bei einem Anruf, dass das Bild an den Ort schneiden darf.

## Ton
Alles synthetisiert (WebAudio, eigener Kontext, keine Dateien): Push-Doppelton, Brummen, Klingelmuster, Sender-Jingle, Rauschen des
Batterieradios; der **Warnton** ist ein eigenes Muster aus zweimal drei aufsteigenden Piepsern über einem tiefen Puls – bewusst weder der Heulton der
Sirenen noch ein echter Handy-Warnton. Sprecherin und Dorfbewohner über `STIMME` (Aufnahme, sonst die Stimme des Geräts, sonst Sprachausgabe des
Browsers). Die Umgebung duckt über `ZKREGIE.duck(level)`; der eigene Ton hängt nicht an dieser Absenkung.

## Echte Videos von heute
Erst nach Klick geladen (gezeichnete Platte mit Titel, Quelle, „Video laden – Daten gehen an YouTube“; nicht einmal das Vorschaubild wird vorher
geholt), eingebettet nur von `www.youtube-nocookie.com`, daneben ein einfacher Link. Eine Seite mit strenger Richtlinie (kein `frame-src`, wie
das Test-CSP) zeigt nur den Link. Geprüft am 13.11.2026 mit YouTubes oEmbed (Video existiert, einbettbar, Kanalname) und der Kanalliste; der
Inhalt wurde nach Titel und Kanal beurteilt, **vor dem Workshop kurz ansehen**. Liste: `ZKMEDIENDATA.VIDEOS`.

## Test
`python3 viz3/test/zeitreise_medien.py PORT` (1920×1080, mit Attrappen für Regie und Workshop, falls sie fehlen), `viz3/extra/zeitreise-medien/tests.txt`.
