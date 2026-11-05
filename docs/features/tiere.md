# Tiere der Gegend und der Hund, der lernt (feat/tiere)

Falko, 5.11.2026 23:20/23:24: die Tiere, die es um Ratscher wirklich gibt, in der Welt (auch in der Ich-Sicht) und mit Einfluss; ein
Begleiter-Tier, das von dir lernt (Black & White). 23:28: viel über die Natur lernen und entdecken. Auftrag: `docs/plans/auftraege/tiere.md`.

## Was es gibt

- **Körper ohne fremde Modelle** (`tiere/tiere_koerper.js`, `TKOERPER`): frei lizenzierte Tiermodelle sind entweder nicht animiert, nur
  nach Anmeldung zu haben (Sketchfab u. a.) oder Spielzeug-Klötzchen. Deshalb werden die Körper aus Maßen gebaut – Rumpf (Rücken- und
  Bauchlinie, Breite), Hals mit Kopf, Beine mit den echten Gelenken (Hüfte, Knie, Sprunggelenk; Schulter, Ellbogen, Vorderfußwurzel), Ohren,
  Schwanz, Geweih – als Ringe entlang einer Linie, in wahrer Größe, mit Knochen (ein SkinnedMesh, **ein Draw-Call je Tier**, ~1800 Dreiecke).
  Das Fell steckt in den Vertexfarben: heller Bauch, beim Reh der weiße Spiegel und die schwarze Nase, Sommer- und Winterfell, gestreifte
  Frischlinge, beim Rotmilan der rostrote Gabelschwanz und die weißen Felder unter den Flügeln, beim Hund die gelben Backen. **Ein Material
  für alle Tiere**, beim Laden mit einem unsichtbaren Träger übersetzt – kein neues Shader-Programm, wenn Tiere erscheinen.
  Bewegung: Schritt (Viertakt), Trab (diagonal), Galopp, Sprünge (das flüchtende Reh), Äsen, Sichern (Kopf hoch, Ohren nach vorn),
  Liegen, Sitzen, Wühlen; Vögel schlagen und gleiten, der Milan dreht den Schwanz.
- **Wo** (`tiere/tiere.js`, `TIERE`): eine Lebensraum-Karte in 20-m-Zellen über das 2,4-km-Quadrat aus den echten Baumkronen
  (`RATSCHER.treeXY`, Bestand an der Klinge) und den Gebäuden: Wald, Waldrand, offenes Land, Siedlung. Darauf Gruppen mit Einstand
  (Deckung) und Äsungsplatz, fest aus einem Startwert (jeder Besuch dieselbe Welt): Rehe an den Waldrändern (28 Gruppen, mindestens 170 m
  auseinander), Wildschwein-Rotten tief in den großen Wäldern mit Feld oder Wiese in Reichweite (mit einem einzelnen Keiler), zwei
  Rotmilan-Paare über dem offenen Land.
- **Wann:** nach Sonnenstand und Kalender. Rehe treten in der Dämmerung aus und bleiben nachts auf den Feldern, im Winter in Sprüngen
  (3–8) und dann auch tags draußen, ab Ende Mai Ricken mit Kitzen; Böcke mit Gehörn von März bis Oktober. Wildschweine nur nachts, von März
  bis August mit gestreiften Frischlingen. Der Rotmilan tags von März bis Oktober (selten im Winter). Eine aufgeschreckte Gruppe bleibt
  anderthalb Spielstunden in der Deckung.
- **Wie:** nur wenige Tiere nahe beim Betrachter sind echte Modelle (Telefon 14, sonst 26); ferne Gruppen sind nur Zahlen. Sie äsen,
  ziehen ein paar Schritte, sichern, fliehen vor dem Spaziergänger, einem fahrenden Auto, Lärm und dem Hund in ihrer echten Fluchtdistanz
  (Reh ~110 m, nachts weniger, ein Rennender fällt früher auf; Wildschwein ~70 m) – die ganze Gruppe, zur Deckung hin, das Reh in Sprüngen
  mit gespreiztem Spiegel. Wer tags in den Wald geht, scheucht ruhende Rehe aus dem Bett. Der Milan kreist in 40–90 m Höhe, schlägt ab
  und zu mit den Flügeln, legt sich in die Kurve.
- **Entdecken:** wer eine Art zum ersten Mal sieht (im Bild, nah genug), bekommt einen Gedanken („Ein Reh! Es äst am Waldrand.“) und das
  Ereignis `tiere:entdeckt` für das Entdeckerbuch; gespeichert in `pav-tiere-v1`. Steckbriefe mit Quellen für 20 Arten in
  `tiere/tiere_arten.js` (`TARTEN`).
- **Der Hund** (`tiere/tiere_hund.js`, `HUND`): Hasso, ein Altdeutscher Hütehund vom Schlag Gelbbacke (mitteldeutscher Typ, 55–60 cm,
  schwarz mit gelben Abzeichen an Backen, Fang und Läufen, Stehohren) – passt zu einem Garten mit Ziegen und Wald. Er folgt dir links
  hinter dir, geht, trabt oder galoppiert, um mitzuhalten, schaut zu dir, setzt sich nach ein paar Sekunden, legt sich nach einer halben
  Minute, wedelt; fährt im Auto mit und springt mit dir heraus; kommt mit, wenn du an einen anderen Ort springst. Das Wild hält Abstand.

## Die Arten (Steckbrief mit Quelle je Art in `TARTEN.A`)

| Gruppe | Arten (Modell im Spiel) | Quellen |
|---|---|---|
| Wild | Reh (ja), Wildschwein (ja), Rothirsch, Rotfuchs, Dachs, Feldhase, Waschbär, Steinmarder, Mäusebussard, Kolkrabe | Wikipedia-Artikel je Art; Thüringer Landtag zu Rotwildgebieten und zum Feldhasen |
| Selten | Rotmilan (ja), Uhu, Schwarzstorch, Schwarzspecht, Wildkatze, Luchs | Wikipedia; BUND Thüringen (Wildkatze); Berliner Zeitung 7.5.2026 und Landtag (Luchs im Thüringer Wald); LfU Rheinland-Pfalz, Fachempfehlungen Horstschutz Schwarzstorch 2018 |
| Schädlinge | Buchdrucker (Borkenkäfer), Schermaus | Wikipedia; waldwissen.net (Befallssuche) |
| Nutz- und Haustiere | Ronalds Ziegen (`npc/npc.js`, unverändert), der Hund (ja) | Wikipedia; zooplus (Gelbbacke) |

## Ausprobieren

- Abends (Dämmerung) an den Waldrand der Klinge gehen, z. B. vom Feld an der L 1625 (`GAME.view(-150, -400, …)`): Rehe auf den Wiesen vor
  dem Wald; langsam hingehen – sie sichern, dann springen sie ab. Nachts Wildschweine auf den Feldern am Wald. Mittags im September über
  den Wiesen nach oben schauen: Rotmilane.
- Konsole: `TIERE.state()`, `TIERE.list()`, `TIERE.groupList()`, `TIERE.plan(gruppe)`, `HUND.state()`.

## Testen

`python3 viz3/test/run.py --port 9003 --serve tiere` (über `tools/browser_lock.sh`), Abschnitte `bau,welt,flucht,hund`; Bilder in
`out/tiere/`. Prüft: Modelle in wahrer Größe ohne neue Shader-Programme, Lebensraum-Karte, Rehe in der Dämmerung, Wildschweine nachts,
Milan mittags, Flucht in Fluchtdistanz (erst sichern, dann die ganze Gruppe), Ereignisse `tiere:entdeckt`/`tiere:flucht`, der Hund folgt
und setzt sich. Auf GitHub über `viz3/extra/tiere/tests.txt`.

## API für Erweiterungen (Strategie-Modus „Ratscher von oben“)

Stand Inkrement 1 (wird erweitert):

- Ereignisse über `KERN.on`: `tiere:entdeckt` `{ kind: 'art' | 'spur', id, title, source }` (einmal je Art/Spur), `tiere:gesehen`
  `{ art, x, y, d }`, `tiere:flucht` `{ art, gruppe, x, y, vor: 'walker' | 'car' | 'noise' | 'dog' }`.
- `TIERE.groupList()` – alle Gruppen mit Einstand, Äsungsplatz, Plan (`where: 'cover' | 'out' | 'sky' | null`, Anzahl, Kitze/Frischlinge).
- `TIERE.plan(gruppe)` – wo eine Gruppe jetzt ist (nach Sonne, Kalender, Störung). `TIERE.nearest(art, x, y)`.
- `TIERE.addNoise(x, y, r, s)` – Lärm (Motorsäge, Mäher, Traktor) für s Sekunden: Tiere im Umkreis r fliehen.
- `TARTEN.A[id]` – Steckbrief, Fluchtdistanzen, Gruppengrößen; `TARTEN.SPUREN` – Spuren mit Text; `TARTEN.sourceOf(id)`.
- `TKOERPER.make(kind, variant)` – ein Tier als Modell (`reh`, `sau`, `hund`, `milan`; Varianten `winter`, `antler`, `young`), `A.anim(dt, v, pose)`.

## Offen

- Weitere Arten als Modelle (Fuchs, Dachs, Hase, Waschbär, Marder, Rothirsch, Bussard, Rabe, Schwarzstorch, Uhu, Wildkatze), Hühner bei Ronald.
- Töne (Rehbock schreckt, Rotte grunzt, Milan, Bussard, Uhu, Hirschbrunft) mit freien Aufnahmen (Wikimedia Commons).
- Einfluss: Verbiss, Wühlschäden, Borkenkäfer in den Fichten der Klinge, Wühlmäuse, Schutz (Wuchshülle, Zaun, Elektrozaun, Wühlmauskorb),
  Ruhezonen am Horst; Spuren in der Welt.
- Der Hund lernt (loben/tadeln, Aufträge), Knöpfe am Telefon.

## Für den Lead

- `viz3/src/modules.txt`: Block `# feat/tiere` nach dem Zombie-Block, vor `game/tutorial.js` (vier Module).
- `viz3/src/core/save.js`: zwei Zeilen `pav-tiere-v1`, `pav-hund-v1` (markiert `// feat/tiere`); bitte in ARCHITECTURE.md §8 eintragen.
- Neue `window`-Namen: `TARTEN`, `TKOERPER`, `TIERE`, `HUND`.
