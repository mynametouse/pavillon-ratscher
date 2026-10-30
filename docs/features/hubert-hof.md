# Huberts Hof wie heute (feat/hubert-hof, 30.10.2026)

Auftrag: `docs/plans/auftraege/hubert-hof.md`. Falko (30.10. 0:12): „Huberts Gelände bzw. die Überdächer sind völlig übertrieben, schau hier
nochmal auf die Fotos und Satellitenbilder …“. Bauphase 0 zeigt den Hof so, wie er heute ist; er hat keinen Plan für später, also gilt derselbe
Stand in allen Bauphasen. Vorher (feat/nachbarn, V17a): vier bzw. zwei offene Werkstätten mit Satteldach, sechs Hütchen mitten auf der Wiese.

## Was es gibt

| Was | Wo |
|---|---|
| **Hof am Feldweg**: Kiesfläche vom Weg bis zum Tor und als Fahrspur hinter den Hütchen nach Süden; der Bach läuft unter der Hofeinfahrt in einem **Rohr** (Betonblock im Graben – Lage aus `STREAM.cOff`/`WT`, folgt also dem Bach –, Rohrmündungen an beiden Enden, man geht und fährt eben darüber: `KERN.provide('ground')`); die Büsche vom Bachrand (`garden/trees.js` `bankBushes`), die dort auf dem Hof stünden, blendet das Modul nach dem Aufbau aus (Instanz auf Größe 0, Stamm-Kollision abgesenkt – trees.js und seine Zufallsfolge bleiben unverändert, `HOF.bushesHidden`) | `garden/hof_hubert.js` `LAYOUT.gravel`, `LAYOUT.culvert`, `HOF.culvert` |
| **Langer, niedriger, offener Schuppen** hinten am Hof (14 m, Pultdach aus Wellblech, nach Osten offen): alter Anhänger, etwas Großes unter blauer Plane, Bretter, Werkbank | `SHEDS[0]` (`site.json` `neigh[0]`) |
| Vor dem Schuppen: zwei Bretterstapel mit Stapelleisten und Wellblech obendrauf, ein weißes Brett, die **Sitzgarnitur** (Tisch mit Bänken), ein verzinktes Geländer, ein **aufrecht stehender Stammabschnitt**, das **weiße Lattentor**; unter den Bäumen am Tor der **Bretterstapel im roten Stahlrahmen** | `LAYOUT.north` |
| **Schwarzes Hoftor**: zwei Flügel aus fünf Querbrettern mit Strebe, schwarze Pfosten, Zaunstücke zu Falkos Grenze und zur ersten Hütte. Zu wie auf den Fotos; mit E auf und zu („Tor“); öffnet sich, wenn Huberts Traktor kommt, und schließt sich wieder hinter ihm | `LAYOUT.gate`, `HOF.gate`; Traktor: `npc/life.js` `tickGate` |
| **Grasgasse** vom Tor nach Süden entlang Falkos Westgrenze | (frei, nur Gras) |
| **Trockenhütchen**: sechs in zwei Gruppen an der Westseite der Gasse (Linie wie im Luftbild, 200°), Paletten- und Bretterwände, kleines Satteldach aus alten roten Ziegeln, vorn offen zur Gasse mit dem gestapelten Holz; die fünfte füllt sich (`HOF.fillHut`) | `LAYOUT.huts`, `HOF.huts` (`x, y, fill, front, look`) |
| **Ziegelstapel** auf Paletten zwischen und vor den Hütchen, **Palettenstapel** dahinter | `LAYOUT.tiles`, `LAYOUT.pallets` |
| Zwei **niedrige Palettenhütten** mit Pultdach aus alten Ziegeln auf der anderen Seite der Gasse an Falkos Grenze (7195, 7204, 7208) | `LAYOUT.lowHuts` |
| **Werkhof** im Süden: Huberts **Werkstatt** (nach Osten offen, rostrotes Profilblech, Werkbank mit Werkzeugwand, Regal, Brennholz, Amboss, Schubkarre), der **Schuppen mit Tür und Fenster** nördlich daneben, der weiße **Kofferaufbau** „Zeit zum Entspannen“, Holzplatz (Hackklotz, Rugel, Scheithaufen, Sägebock), Tisch mit zwei Stühlen, der Kombi auf der Rampe und die **kleine Werkstatt hinter dem Auto** (zum Auto offen; dort liegt der 13er-Ringschlüssel – „In der Werkstatt hinter dem Auto …“, Huberts aufgenommener Satz) | `SHEDS[1]`, `SHEDS[2]`, `SHEDS[3]`, `HOF`, `garden/hof_auto.js` |
| **Lange Gebäude am Westrand** wie im Luftbild: dunkles Pultdach (nördlich), langes rotbraunes Satteldach, helles Dach hinter der Werkstatt, Scheune mit rotem Dach in der Südwestecke – geschlossen, schlicht | `LAYOUT.long` |
| Ortsnamen: „Huberts Hof“ (Hof, über dem Rohr, Gasse, Werkhof), „Huberts Schuppen“ (`SHEDS[0]`, `[1]`), „Huberts Werkstatt“ (`SHEDS[2]`, `[3]`) | `HOF.placeAt`, `npc/life.js` |

Alle Lagen stehen als Daten in `LAYOUT` (Modul `garden/hof_hubert.js`) und in `site.json`/`site.js` `neigh` (die vier Schuppen-Grundrisse
`[hinten N, vorn N, vorn S, hinten S]`; `garden/trees.js` lässt dort keine Bäume wachsen). Die Zahl der `neigh`-Einträge bleibt vier:
`garden/env.js` zieht je Eintrag eine Zufallszahl, sonst rückte alles danach Gebaute (Bäume, Büsche) woandershin. Die neuen Grundrisse
liegen so, dass kein Baum, keine Hecke und kein Busch am Bach anders ausfällt als vorher.

Material: nur vorhandene (`MAT.weather`, `corr`, `fibre`, `boxRed`, `roofRed`, `kvh`, `plank`, `bsh`, `black`, `galv`, `conc`, `logs`, `barnDoor`)
und `plain()`-Farben, dazu eine Kies-Textur (Canvas) wie die Hackschnitzel – keine neuen Shader-Arten. Alles Statische wird von
`render/zmerge.js` zusammengefasst; eigene Meshes bleiben nur der Holzstapel der fünften Hütte und die Torflügel.

## Huberts Tag und Aufgaben auf dem neuen Hof

- `npc/life.js`: Stapeln geht vom Haufen um den Hackklotz herum zur Hütte in der Gasse (`HOF.toHuts`, `hut.front`, `hut.look`); am Auto geht
  er östlich am Auto vorbei zur Werkstatt dahinter und zurück; Ronalds Weg um den Garten führt östlich an der kleinen Werkstatt und am Auto
  vorbei; morgens kommt Hubert durch sein Tor in die Gasse; das Tor öffnet sich für den Traktor (Runde, Fahrt ins Dorf, Diesel-Aufgabe) und
  schließt sich 6 s nachdem er weg ist (nur wenn der Traktor es geöffnet hat); Ortsnamen über `HOF.placeAt`.
- `game/quests.js`: „Holz für die Trockenhütte“ zeigt und füllt die fünfte Hütte von ihrer offenen Seite (`hutPut`); der Ringschlüssel liegt
  auf der Werkbank der Werkstatt hinter dem Auto (`SHEDS[3]`, wie Huberts Satz).
- Der Traktor parkt wie bisher in der Gasse hinter dem Tor (`npc/npc.js` `TRACTOR_HOME` −15,1 / 27,2); der Kombi auf der Rampe wie bisher.

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8995 --serve hubert_hof      # ~6 min
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8995 --serve nachbarn        # Huberts und Ronalds Tag, Gespräche, Aufgaben
```

`viz3/test/hubert_hof.py` (Liste `viz3/extra/hubert-hof/tests.txt` mit `nachbarn`): Bauphase 0, vier Schuppen, langer Schuppen offen zum
Hof, Tor zu und von Hand auf/zu, sechs Hütchen zur Gasse offen, die fünfte füllt sich, Gasse außerhalb von Falkos Garten und ohne Kollision
(Tor bis Werkhof), Traktor-Platz und Weg durchs Tor frei, Plätze am Auto frei, Auto steht in keinem Schuppen, über dem Rohr eben und daneben
der Graben, Ortsnamen, Hubert geht von seiner Werkbank zur Hütte und stapelt, das Tor öffnet sich für den Traktor und schließt hinter ihm,
er kommt zurück. Bilder in `out/hubert_hof/` (Hof vom Feldweg, Tor und Gasse mit den Hütchen, Gasse, Werkhof vom Garten, Draufsicht).

## Quellen

- Falkos Fotos vom 26.10.2026 (privat, nie ins Repo): 7186–7196 (Hof vom Feldweg, Tor, Gasse), 7204, 7208 (Gasse aus dem Garten),
  7233, 7234, 7247–7253 (Werkhof vom Garten aus). Standorte: iPhone-GPS (±5 m, unter Bäumen mehr) und Kompass.
- Luftbild TH DOP 20 cm vom 07.04.2024 (WMS GDI-Th, © GDI-Th, Daten frei; nicht im Repo): Lage der langen Gebäude, Dachfarben, die
  Hütchenreihe (Schattenlinie), der Werkhof. Das ältere `dist/geo/ortho_near.jpg` zeigt dasselbe unschärfer.

## Was Fotos und Luftbild nicht klären

1. **Feldweg**: Westlich von Falkos Garten liegt der Feldweg des Modells (OSM) 4–5 m südwestlich des echten; im Luftbild steht dort ein
   Gebäude mit rotem Dach (≈ −25…−14 / 41…52), das im Modell auf dem Weg stünde – nicht gebaut. Der Hof hält seine Lage zum Weg; der lange
   Schuppen steht deshalb etwa 3 m westlich der Dachkante im Luftbild.
2. **Bach**: Im Modell läuft der Bach entlang des Wegs durch Huberts Grundstück (`garden/stream_geo.js`); die Fotos zeigen den Kies direkt
   vom Weg in den Hof, keinen Graben. Hier: Rohr unter der Hofeinfahrt (t −13…11 entlang des Wegs). Ob der Bach dort wirklich verrohrt ist,
   nördlich des Wegs liegt oder schon vorher endet, wissen wir nicht (Sache von `stream*.js`). Die Büsche am Bachrand, die auf dem Hof
   stünden, blendet `hof_hubert.js` zur Laufzeit aus; sauberer wäre, `bankBushes` in `garden/trees.js` ließe den Hof aus (verschiebt aber die
   Zufallsfolge – Entscheidung des Kern-Chats).
3. **Bäume** (`garden/trees.js`, nicht hier): der große Baum an der Südseite der Hofeinfahrt und die buschige Weide an der Nordseite fehlen
   bzw. stehen nach dem Kronenmodell anders (Bäume 0–4 um das Tor); Baum 2 und 3 stehen auf dem Weg, den Huberts Traktor aus der Gasse auf
   den Feldweg nimmt (`npc/npc.js` `DRIVE_ROUTE`) – das war schon vorher so.
4. **Traktor**: Auf 7233, 7234, 7247 steht Huberts grüner Traktor vor der Werkstatt im Werkhof; das Modell parkt ihn in der Gasse hinter dem
   Tor (`npc/npc.js`, unverändert).
5. **Tor**: Die GPS-Standorte der Fotos am Tor (7193–7196) liegen 5–8 m östlich der Stelle, an der das Tor im Modell steht; gesetzt nach
   Luftbild (Beginn der Hütchenreihe) und Falkos Westgrenze. Aufschlagrichtung (in den Hof) und Scharnierseiten angenommen.
6. **Hütchen**: Zahl (sechs in zwei Gruppen), Maße (1,2 m, 2 m Traufe) und Abstände geschätzt; die Fotos zeigen weitere weiter südlich;
   zwischen Gasse und Garten stehen zwei niedrige Palettenhütten (Lage geschätzt), weiße IBC-Tanks und Paletten dort (7195, 7196) fehlen.
7. **Lange Gebäude**: Höhen, Wände und Dachformen geschätzt (nur die Dachfarben aus dem Luftbild); die grüne Dachfläche im Werkhof
   (≈ −34…−27 / 6…11) ist als helles Dach gebaut; die Scheune in der Südwestecke gehört vielleicht schon zum nächsten Grundstück.
8. **Werkhof**: Palettentisch und weiße Stühle vor dem Kofferaufbau (7233) nicht gebaut – Huberts Tisch mit den zwei Stühlen bleibt (Gespräche).
9. `npc/ki_text.js` (Huberts KI-Beschreibung) sagt „fünf Schuppen“ – jetzt vier Schuppen und vier lange Gebäude (Text des Kern-Chats).
