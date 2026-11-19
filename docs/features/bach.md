# Bach und Feldweg am Garten (feat/bach, Karten-Chat, 19.11.2026)

**Auftrag (Falko, 19.11. 11:41, 11:54):** „Check mal den Bach in Ratscher, der fließt nicht korrekt, insbesondere im unteren Dorf
Richtung Garten … der Weg parallel zum Bach weicht auch ab. Vergleiche das mit deinen Kartendaten und korrigiere.“ Dazu: der Bach
zweigt am oberen Dorfeingang von der Schleuse ab, läuft verrohrt unter dem Dorf (sichtbar an den Dorfbrunnen, u. a. vor dem Anger 15)
und kommt am Gartenweg wieder heraus, mit weiteren Verrohrungen.

## Was die Daten zeigen

- **DGM1 Thüringen (1 m)** über `tools/gelaende/pruefung.py` (Ausschnitt `tools/gelaende/ausschnitt.py`): der Graben ist auf 300 m als
  0,4–1 m tiefe Rinne zu sehen; seine tiefste Linie alle 2 m im Rahmen `STREAM` ([t, o], `viz3/test/bach.py` hat die Werte).
- **OpenStreetMap 2026:** Feldweg (Weg 1484532662) gerade vom Tor zum Ratschner Anger, Richtung 139°; Graben (1094568861) beginnt
  bei t ≈ 86 (der Rohraustritt), Durchlass (1094568860) bei t 3–12 unter Huberts Hof.
- **ATKIS Basis-DLM (INSPIRE Hydro, WFS `INSPIREhy-n_wfs`):** dieselbe Linie wie OSM und DGM1 am Weg; dazu ein verrohrter Graben von
  Süden unter dem Feld (nicht übernommen – Falko: der Bach kommt von Osten).
- **Brunnen (OSM):** zwei `man_made=water_well` (Dorfeingang, vor dem Anger 15) und ein `amenity=fountain` (Anger 25/27) –
  in einer Linie von der Schleuse zum Gartenweg.

**Befund:** Die gerade Achse des Gartens (`site.json` `path`, 117°, aus einem älteren OSM-Stand) liegt rund 22° gegen den echten Weg
und Bach gedreht; beide kreuzen sie am Tor. Östlich davon lief der Bach der App zu nah am Weg weiter bis zwischen die Häuser der
Dorfmitte, der Feldweg geradeaus übers Feld.

## Was geändert ist (V19u)

- `garden/stream_geo.js`: östlich der Brücke (Übergang `TB+1,5 … TB+7`) folgt die Mittellinie dem Lauf aus DGM1 (`EAST`); das offene
  Wasser endet am Rohraustritt `TE = 86` (`tLim[1]`, `kD`, `inDitch`, `inWater`, der Ton bleibt dort). `STREAM.pathOff(t)` und
  `STREAM.pathPt(t)`: der Feldweg – die Achse bis zum Tor, dann der echte Weg (OSM 2026), Übergang über 12 m.
  Brücke, Stufen, Platz am Bach und alles westlich davon (nach Falkos Fotos) unverändert.
- `garden/stream.js`: am Austritt eine Betonstirnwand mit Rohrmündung (Ø 60 cm, `STREAM.OUT`, Kollision); Wasser bis zur Mündung;
  keine Steine dahinter.
- `garden/env.js`: Feld, Weg und Fahrspuren des gemalten Bodens folgen `pathOff`; der Streifen „modellierter Boden“ biegt mit ab und
  endet nach dem Austritt.
- `garden/places.js`: „Feldweg“ entlang des echten Wegs, „Am Bach“ nur am offenen Bach.
- `viz3/extra/bach/dist/geo/roads.b64.json` (aus `tools/gelaende/feldweg.py`): die Dorfwege der Website mit dem Feldweg östlich des
  Tors nach OSM 2026 (statt gerade bis t = 64, „Brücke“ und Bogen).

## Offen

- **Westlich der Brücke** (Huberts Hof, Bretterstapel, Durchlass): Weg und Bach liegen in Wirklichkeit 10–25 m weiter nordöstlich als
  die Achse; dort ist der Garten nach Fotos eingestellt – erst mit Falko zusammen verschieben.
- **Dorfbrunnen** (3–4, mit Wasser) und die **Schleuse** als sichtbarer Fluss vom Staudamm bis hinter Ratscher – nächste Version
  (die Schleuse nach dem 1-m-Gelände der Weltkacheln).

Test: `python3 viz3/test/run.py bach` (10 Prüfungen, Bilder in `out/bach/`).
