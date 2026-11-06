# Tiere der Gegend und der Hund, der lernt (feat/tiere)

Falko, 5.11.2026 23:20/23:24: die Tiere, die es um Ratscher wirklich gibt, in der Welt (auch in der Ich-Sicht) und mit Einfluss; ein
Begleiter-Tier, das von dir lernt (Black & White). 23:28: viel über die Natur lernen und entdecken. Auftrag: `docs/plans/auftraege/tiere.md`.
Module: `viz3/src/tiere/` – `tiere_arten.js` (TARTEN), `tiere_koerper.js` (TKOERPER), `tiere_ton.js` (TTON), `tiere.js` (TIERE),
`tiere_einfluss.js` (TEINFLUSS), `tiere_huehner.js` (THUEHNER), `tiere_hund.js` (HUND).

## Was es gibt

- **Körper ohne fremde Modelle** (`TKOERPER`): Die frei lizenzierten Tiermodelle, die ohne Anmeldung zu haben sind, sind entweder
  Spielzeug-Klötzchen oder liegen nur als Blender/FBX vor (siehe „Offen“). Deshalb werden die Körper aus Maßen gebaut – Rumpf (Rücken- und
  Bauchlinie, Breite), Hals mit Kopf, Beine mit den echten Gelenken (Hüfte, Knie, Sprunggelenk; Schulter, Ellbogen, Vorderfußwurzel), Ohren,
  Schwanz, Geweih, Mähne – als Ringe entlang einer Linie, in wahrer Größe, mit Knochen: **ein SkinnedMesh und ein Draw-Call je Tier**,
  1800–2300 Dreiecke. Das Fell steckt in den Vertexfarben: heller Bauch, dunklerer Rücken, Unterschiede entlang des Körpers, beim Reh der
  weiße Spiegel und die schwarze Nase, Sommer- und Winterfell, gefleckte Kitze, beim Wildschwein Borsten und Mähne, gestreifte Frischlinge
  nur im ersten Sommer, beim Rotmilan der rostrote Gabelschwanz, beim Hund die gelben Backen. **Ein Material für alle Tiere**, beim Laden mit
  unsichtbaren Trägern übersetzt (skinned, einfach, instanziert) – kein neues Shader-Programm, wenn Tiere erscheinen.
  Fell mit Länge (Hund, Wildschwein, Dachs, Waschbär, Wildkatze): der Umriss leicht zottig statt glatt, am Hund eine Halskrause.
  **Reh und Wildschwein nach echten Maßen** (die am häufigsten zu sehen sind): die Ricke mit tiefer Brust (ein Drittel der Schulterhöhe),
  dem Hals dick am Ansatz und schräg nach vorn getragen (45–50°), kurzem Kopf mit großen Lauschern, bemuskelter Keule und Unterarm, dünnen
  Läufen und dem nach hinten gewinkelten Sprunggelenk; beim Äsen geht der Äser bis ins Gras. Die Bache als schwerer Keil: der Rücken fällt
  von den hohen Schultern zur Kruppe, der Querschnitt läuft oben zum Borstenkamm schmal zu (von vorn schmal, nicht rund), kurzer dicker
  Hals, langer Kopf bis zur Rüsselscheibe, kurze kräftige Läufe; Frischlinge ohne den schwarzen Kamm. Bilder in 7 m Abstand mittags und
  in der Novemberdämmerung: `out/tiere/05_7m_*`.
  Bewegung: Schritt (Viertakt), Trab, Galopp, Sprünge (das flüchtende Reh), Äsen, Sichern (Kopf hoch), Liegen, Sitzen, Wühlen; Vögel
  schlagen und gleiten, legen sich in die Kurve, der Milan dreht den Schwanz; der Uhu sitzt und dreht den Kopf.
- **Der Fuchs ist ein echtes Modell:** „Fox“ aus den glTF Sample Assets der Khronos Group (Modell PixelMannen CC0, Rigging und Animation
  tomkranis CC BY 4.0, glTF @AsoboStudio/@scurest CC BY 4.0) mit seinen eigenen Bewegungen (Umschauen, Gehen, Laufen, nach Tempo
  überblendet), in wahrer Größe (Ohrspitzen 55 cm, Nase bis Schwanzspitze 1,08 m); die Textur ist in die Ecken gebacken und auf ein echtes
  Fuchsrot getönt (`viz3/extra/tiere/quellen/bake_fox.py`, ohne fremde Programme: PNG mit zlib gelesen, Farben je Fläche, weiche Normalen,
  Textur entfernt) – so zeichnet auch er mit dem einen Material, ohne neues Shader-Programm. Geladen erst, wenn ein Fuchs in die Nähe kommt
  (`tiere/fuchs.glb`, 174 KB); bis dahin oder falls es scheitert der gebaute Fuchs. Andere glTF-Tiere ohne gebackene Farben backt
  `tiere_koerper.js` beim Laden selbst (Textur über eine Canvas).
- **Arten im Spiel:** Reh (Ricke, Bock mit Gehörn – im November abgeworfen, im Winter Bast –, Kitz), Wildschwein (Bache, Keiler,
  Frischlinge), Rothirsch (Alttier, Kalb, Hirsch in der Brunft), Fuchs, Feldhase, Dachs, Waschbär, Steinmarder, Wildkatze, Rotmilan,
  Mäusebussard, Kolkrabe, Schwarzstorch, Uhu; dazu der Hund. Borkenkäfer und Schermaus über ihre Spuren und Schäden.
- **Wo** (`TIERE`): eine Lebensraum-Karte in 20-m-Zellen über das 2,4-km-Quadrat aus den echten Baumkronen (`RATSCHER.treeXY`, Bestand an
  der Klinge) und den Gebäuden: Wald, Waldrand, offenes Land, Siedlung. Darauf Gruppen mit Einstand und Äsungsplatz, fest aus einem
  Startwert (jeder Besuch dieselbe Welt – solange die Daten der Welt dieselben sind; ändern sich Kronen oder Gebäude, verschieben sich die
  Gruppen): 28 Reh-Gruppen an den Waldrändern, Rotten tief in den Wäldern (ein Keiler allein), Füchse am
  Waldrand, Hasen mitten in den Feldern, zwei Dachsbaue, Waschbären und Marder im Dorf, eine Wildkatze weit weg von den Häusern, eine
  Rotwild-Gruppe auf der Durchreise, Milane und Bussarde über dem offenen Land, Kolkraben über dem Wald, der Schwarzstorch mit seinem Horst
  tief in der Klinge, der Uhu auf einer Fichte am Waldrand unter der Unteren Klinge.
- **Wann:** nach Sonnenstand und Kalender. Rehe in der Dämmerung und nachts draußen, im Winter in Sprüngen auch tags; Winterfell von
  Oktober bis Mai. Wildschweine nur nachts. Fuchs abends (im Winter auch tags), Hase in der Sasse bis man fast auf ihn tritt, Dachs,
  Waschbär, Marder nachts (im kalten Winter oft nicht), Wildkatze selten in der Dämmerung, Rotwild in einem Viertel der Nächte (in der
  Brunft öfter). Milan von März bis Oktober, Bussard das ganze Jahr, Schwarzstorch von Ende März bis Anfang September, Uhu in der Dämmerung.
- **Wie:** nur wenige Tiere nahe beim Betrachter sind echte Modelle (Telefon 14, sonst 26 – die nächsten Gruppen zuerst); ferne Gruppen sind nur Zahlen. Sie äsen,
  wühlen, lauschen (Fuchs), ziehen weiter, sichern, fliehen in ihrer Fluchtdistanz vor dem Spaziergänger (Reh ~110 m, nachts weniger,
  ein Rennender fällt früher auf, ruhend in der Deckung später), vor einem fahrenden Auto, vor Lärm und vor dem frei laufenden Hund – die
  ganze Gruppe, zur Deckung hin; aufgeschreckt bleiben sie eine Weile in der Deckung. Stimmen: der Rehbock schreckt, die Rotte grunzt, der
  Fuchs bellt und schreit in den Winternächten, der Uhu ruft, der Bussard miaut „hiääh“, der Milan pfeift (März bis Oktober), der Kolkrabe
  ruft „krok“, der Hirsch röhrt in der Brunft (Mitte September bis Mitte Oktober), Hasso bellt.
- **Einfluss** (`TEINFLUSS`, Tag für Tag nach dem Spielkalender, auch im Zeitraffer): Rehe verbeißen junge Bäume (Winter und Frühjahr
  am meisten; Tanne, Ahorn, Eiche lieber als Buche, Lärche, Fichte; nach der Zahl der Rehe im Umkreis von 400 m) – an einer **Pflanzung von
  40 jungen Bäumen am Rand des Familienwalds**, die Hälfte in Wuchshüllen, an Falkos Bäumchen im Garten und an den gepflanzten Bäumen des
  Gartenplaners. Wildschweine brechen in Herbst- und Frühjahrsnächten die Gartenwiese um (Elektrozaun hilft). **Borkenkäfer** in den Fichten
  der Klinge: die Käferbäume vom letzten Sommer stehen da (rotbraune und graue Kronen), neue Befälle in der warmen Jahreszeit mit Bohrmehl am
  Stammfuß, nach sechs Wochen fliegt die Brut in die Nachbarn; ein gefällter Käferbaum (`fell`) stoppt sie. Wühlmäuse machen Hügel und
  fressen Wurzeln junger Obstbäume ohne Korb. Der Fuchs holt Hühner, wenn der Stall nachts offen ist (Hühner über die API).
  **Ruhezone Schwarzstorch:** im Umkreis von 100 m nie fällen, bis 300 m vom 1. März bis 15. September kein Holzeinschlag und kein Rücken
  (Fachempfehlung LfU Rheinland-Pfalz 2018); der Horst steht ~260 m vom Familienwald.
- **Entdecken:** eine Art zum ersten Mal gesehen (im Bild, nah genug) oder eine Spur gefunden (hingehen und hinschauen: Suhle, Wühlstelle,
  verbissener Trieb, Fegestelle, Bohrmehl, Käferfichte, Wühlmaushügel, Horst) → ein Gedanke mit einem Satz zum Lernen und das Ereignis
  `tiere:entdeckt` für das Entdeckerbuch, gespeichert in `pav-tiere-v1`. Steckbriefe mit Quellen für 20 Arten in `TARTEN.A`.
- **Der Hund** (`HUND`): Hasso, ein Altdeutscher Hütehund vom Schlag Gelbbacke (mitteldeutscher Typ, 55–60 cm, schwarzes Stockhaar mit gelben
  Abzeichen, Kippohren) – passt zu einem Garten mit Ziegen und Wald. Er folgt dir links hinter dir, geht, trabt oder galoppiert, schaut sich um,
  setzt sich, legt sich, wedelt; fährt im Auto mit; kommt mit, wenn du an einen anderen Ort springst. **Er lernt wie die Kreatur in Black &
  White:** von sich aus treibt er Ronalds Ziegen an die Heuraufe, vertreibt Wild aus dem Garten, jagt ihm draußen hinterher, findet Spuren für
  dich (und zeigt sie dir), bellt einen Nachbarn an oder bleibt ruhig. **Loben (+) und Tadeln (−)** gilt dem, was er zuletzt getan hat
  (eine Viertelminute): die Neigung dazu steigt oder sinkt ein Stück, Lob stärkt die Bindung. **Rufen (P)** – von einer Jagd kommt er nur, wenn
  die Bindung stark und der Jagdtrieb schwach ist; **Schicken (Umschalt+P)** dahin, wo du hinschaust – Wild: er vertreibt es, Ziegen: er hütet sie,
  sonst sucht er Spuren. Vier Knöpfe am Bildschirm (für das Telefon), wenn er näher als 30 m ist – sie weichen anderen Fenstern an ihrer
  Stelle (Entdeckerbuch, Gespräch, Menü, Telefon) und fehlen beim Mitfahren (Bus, Trampen, Traktor), in der Zombie-Nacht und in der Ansicht von oben. Gespeichert in `pav-hund-v1`.

- **Hühner, wenn jemand sie hält** (`tiere/tiere_huehner.js`, `THUEHNER`): heute hält in der Spiegelwelt niemand Hühner – deshalb stehen
  keine da. `TIERE.huehner({ x, y, n, zu })` (z. B. der Strategie-Modus: „Hühner halten“ als Zukunft zum Ausprobieren) stellt einen kleinen
  Holzstall auf Beinen mit Rampe und Klappe hin (Front nach Süden) und eine Schar Hühner (braun, jede vierte weiß), die tags scharren und picken
  und in der Dämmerung über die Rampe hineingehen. Eier: im langen Tageslicht fast täglich eines je Henne, im Winter wenig. Aktionsknopf am
  Stall: „Hühnerklappe öffnen/schließen“, „Eier einsammeln (n)“ (Ereignisse `tiere:klappe`, `tiere:eier`). Bleibt die Klappe nachts offen,
  holt der Fuchs ab und zu eine Henne (`tiere:schaden` kind `huhn`).
- **Schatten:** die nahen Tiere (bis 70 m, höchstens 12, am Telefon 6) bekommen einen weichen Kontaktschatten – das Material der Nachbarn
  (`npc/npc.js`, geklont, also kein neues Programm), von der Sonne weg gestreckt, an den Hang gelegt, in der Dämmerung schwächer.

## Die Arten und Quellen (Steckbrief je Art in `TARTEN.A`, im Spiel mit Quelle)

| Gruppe | Arten | Quellen |
|---|---|---|
| Wild | Reh, Wildschwein, Rothirsch, Rotfuchs, Dachs, Feldhase, Waschbär, Steinmarder, Mäusebussard, Kolkrabe | Wikipedia-Artikel je Art; Thüringer Landtag: Rotwildgebiete (Drucksache Teil III), Feldhase und Rebhuhn seit 2020 |
| Selten | Rotmilan, Uhu, Schwarzstorch, Schwarzspecht, Wildkatze, Luchs | Wikipedia; BUND Thüringen, Wildkatzen-Magazin; Berliner Zeitung 7.5.2026 (Luchsin Vreni bei Ilmenau, ausgewildert 2024) und Thüringer Landtag „Projektbündnis Luchs Thüringen“; LfU Rheinland-Pfalz, Fachempfehlungen Horstschutz Schwarzstorch (2018) |
| Schädlinge | Buchdrucker (Borkenkäfer), Schermaus | Wikipedia; waldwissen.net „Befallssuche beim Borkenkäfer“ |
| Nutz- und Haustiere | Ronalds Ziegen (`npc/npc.js`, unverändert), der Hund | Wikipedia (Hausziege, Altdeutsche Hütehunde); zooplus Magazin „Gelbbacke“ |

Tierstimmen: Wikimedia Commons – „Male roe deer growl“ (1bumer, CC BY-SA 4.0), „Mudchute pig 1/2“ (Secretlondon, CC BY-SA 3.0), „Bellender
Fuchs“ (Jugrü, CC BY-SA 3.0), „FuchsSchreit“ (Livlandfahrer, CC BY-SA 4.0), „Barking of a dog“ (Amada44, CC BY-SA 3.0); gekürzt, gefiltert,
normalisiert, unter derselben Lizenz (`viz3/extra/tiere/dist/tiere/`, Nachweis in `viz3/extra/tiere/manifest.json`).

## Ausprobieren

- Abends an den Waldrand der Klinge, z. B. vom Feld an der L 1625 (Konsole `GAME.view(-150, -400, …)`): Rehe vor dem Wald; langsam
  hingehen – sie sichern und schrecken, dann springen sie ab. Nachts Wildschweine auf den Feldern. Mittags im Sommer nach oben schauen: Milane.
- Mit Hasso: P rufen, Umschalt+P schicken (dahin, wo du hinschaust), + loben, − tadeln (oder die vier Knöpfe rechts). U gehört der Ansicht von oben (Strategie-Modus).
- Konsole: `TIERE.state()`, `TIERE.list()`, `TIERE.groupList()`, `TEINFLUSS.state()`, `TIERE.baeume()`, `TIERE.kaefer.list()`, `HUND.state()`.

## Testen

`bash tools/browser_lock.sh python3 viz3/test/run.py --port 9003 --serve tiere` (Abschnitte `bau,welt,flucht,hund,einfluss,lernen,andere`,
einzeln `tiere:bau,welt`); Bilder in `out/tiere/`. Auf GitHub über `viz3/extra/tiere/tests.txt` bei jedem Push auf `feat/tiere`. Prüft:
alle Arten in wahrer Größe ohne neue Shader-Programme, Lebensraum-Karte, Rehe in der Dämmerung, Wildschweine nachts, Milan mittags, Flucht
in Fluchtdistanz (erst sichern, dann die ganze Gruppe), Ereignisse, Hund folgt und setzt sich, Verbiss im Zeitraffer (geschützt nein,
ungeschützt ja), Käferfichten, Ruhezone, Elektrozaun, Spur gefunden, Lernen (Lob/Tadel ändern Neigungen, gespeichert nach Neuladen),
Schleusingen und Zombie-Nacht unbeschadet.

## API für Erweiterungen (Strategie-Modus „Ratscher von oben“, Entdeckerbuch)

Ereignisse (`KERN.on`):

| Ereignis | Daten |
|---|---|
| `tiere:entdeckt` | `{ kind: 'art' \| 'spur', id, title, source, latin, art, text, profile: { wo, wann, nahrung, spuren, rolle, schutz }, group, day }` – einmal je Art bzw. Spurenart (Entdeckerbuch: alles, was es zeigen muss) |
| `tiere:hinweis` | `{ id: 'kitzrettung', title, source }` – Wissen zur rechten Zeit (Mähen im Mai/Juni) |
| `tiere:gesehen` | `{ art, x, y, d }` – ein Tier im Bild |
| `tiere:flucht` | `{ art, gruppe, x, y, vor: 'walker' \| 'car' \| 'noise' \| 'dog' }` |
| `tiere:schaden` | `{ art, kind: 'verbiss' \| 'fegen' \| 'wuehlen' \| 'kaefer' \| 'ausflug' \| 'wurzel' \| 'huhn' \| 'tonne' \| 'raus', id, x, y, day }` |
| `tiere:schutz` | ein neuer Schutz `{ id, kind, x, y, r, t }` |
| `hund:tat` | `{ tat: 'hueten' \| 'vertreiben' \| 'jagen' \| 'suchen' \| 'bellen' \| 'ruhig' \| 'kommen', x, y }` |
| `hund:befehl` | `{ befehl: 'rufen' \| 'schicken', folgt?, x?, y? }` |
| `hund:gelernt` | `{ tat, lob, learn }` |

Abfragen und Befehle:

- `TIERE.counts({ rect | circle })` – Tiere je Art jetzt (Gruppen mit ihrer Größe nach Jahreszeit); ohne Fläche das ganze Quadrat.
- `TIERE.groupList()`, `TIERE.plan(gruppe)` (`where: 'cover' | 'out' | 'sky' | 'perch' | null`, Anzahl, Kitze/Frischlinge, Brunft …),
  `TIERE.nearest(art, x, y)`.
- `TIERE.schaden({ rect | circle, season })` → `{ n, sum: { verbiss, wuehlen, … }, events }` – Schäden je Fläche und Jahreszeit.
- `TIERE.baeume()` – junge Bäume mit Schaden (0 heil … 1 verloren) und Schutz.
- `TIERE.schutz.add({ kind: 'huelle' | 'zaun' | 'elektrozaun' | 'korb', x, y, r, id })`, `.remove(id)`, `.list()`, `.at(x, y, 'reh' | 'sau' | 'maus')`.
- `TIERE.kaefer.list()` (Stufe 1 Bohrmehl, 2 Brut ausgeflogen/rotbraun, 3 tot/grau; `ausflugIn` Tage), `.raus(id)` (aus dem Wald), `.befall(id)`.
- `TIERE.ruhe(x, y)` → `null` oder `{ art: 'schwarzstorch', zone: 'horst' | 'brutzeit', d, why, bis }` – vor dem Fällen und Rücken fragen.
- `TIERE.naturwert()` → 0–100 (seltene Arten, Käfer, Verbiss); `TIERE.sim(tage)` (Zeitraffer).
- `TIERE.huehner({ x, y, n, zu })` – Stall und Schar hinstellen (oder verschieben), `TIERE.huehner(null)` – keine Hühner; der Stand
  (`n`, `zu`, `eier`) in `TEINFLUSS.E.huehner`, gespeichert in `pav-tiere-v1`.
- `TIERE.addNoise(x, y, r, s)` – Lärm (Motorsäge, Mäher, Traktor): Tiere im Umkreis fliehen.
- `HUND.rufen()`, `HUND.schicken(x, y)`, `HUND.lob(+1 | -1)`, `HUND.state()` (Neigungen `learn`, `bindung`, `recent`), für Klicks von oben.
- Daten: `TARTEN.A[id]` (Steckbrief, Fluchtdistanzen, Gruppengrößen, Quellen), `TARTEN.SPUREN`, `TARTEN.sourceOf(id)`;
  Modelle: `TKOERPER.make(kind, variant)` (`reh`, `sau`, `hirsch`, `fuchs`, `hase`, `dachs`, `waschbaer`, `marder`, `katze`, `hund`,
  `milan`, `bussard`, `rabe`, `storch`, `uhu`; Varianten `winter`, `antler`, `young`, `stripes`, `spots`), `A.anim(dt, v, pose)`.

## Offen

- **Echtere Modelle für Reh, Rothirsch, Hase, Huhn:** auf OpenGameArt liegen von CDmir unter CC0 „Deer Female“, „Old Deer Male“, „Rabbit“
  und „Chicken (animated)“ – realistisch texturiert, mit Knochen und Bewegungen (gesehen: Vorschaubild der Ricke), aber nur als `.blend` bzw.
  FBX in 7z. Zum Umwandeln braucht es Blender oder FBX2glTF; ein fremdes Programm herunterzuladen und auszuführen war mir hier nicht erlaubt.
  Einmal in Blender als glTF/GLB exportiert (mit Bewegungen), gehen sie wie der Fuchs über `PLANS.<art>.gltf` in `tiere/tiere_koerper.js`
  (Datei, Maßstab, Namen der Bewegungen, Farbtönung) – die Textur wird beim Laden in die Ecken gebacken. Für Wildschwein und Hund fand ich
  nichts Freies ohne Anmeldung, das besser ist als die gebauten Körper; die sind nach den Hinweisen des Leads verbessert (Fell nach Datum,
  Reh und Wildschwein nach echten Maßen, voller Hund mit Halskrause). Ehrlich: aus der Nähe (unter ~10 m) bleiben die gebauten Körper
  glatte, einfache Formen ohne Fellstruktur – aus 40–150 m, wo man Wild wirklich sieht, lesen sie sich als Reh, Sau, Hirsch.
- Hase, Dachs, Waschbär, Marder, Wildkatze sind noch grobe Abwandlungen eines Hundekörpers (Dachs breiter und grau, Hase mit gewölbtem
  Rücken) – eine Runde wie bei Reh und Sau (Maße, Fotos, Bilder in 7 m) steht für sie aus.
- Äsen: der Äser geht bis etwa 12 cm über den Boden (Hals steil, Kopf fast senkrecht); ganz hinunter bräuchte es eine leichte Beugung der
  Vorderläufe – im Gras fällt es nicht auf.
- Stimmen fehlen noch für Schwarzspecht, Wildkatze, Dachs und Waschbär (frei lizenzierte Aufnahmen suchen, z. B. xeno-canto mit CC BY-SA;
  `tiere/ton.json` ergänzen) – Milan, Bussard, Kolkrabe und Rothirsch kamen in der Nacht von xeno-canto dazu.
- Wer in Ratscher wirklich Hühner hält, weiß ich nicht – deshalb stehen keine in der Welt, bis jemand (Strategie-Modus, Falko) sie hinstellt.

## Für den Lead

- `viz3/src/modules.txt`: Block `# feat/tiere` nach dem Zombie-Block, vor `game/tutorial.js` (sieben Module).
- `viz3/src/core/save.js`: zwei Zeilen `pav-tiere-v1`, `pav-hund-v1` (markiert `// feat/tiere`); bitte in ARCHITECTURE.md §8 eintragen.
- `viz3/src/world/forest.js`: markiert `// feat/tiere` – `FOREST.tint(t, rgb)` (Kronenfarbe eines Baums: Käferfichten) und die Farbe in
  `relod`/Fernkarten (Rinde bleibt).
- Quellen: `viz3/extra/tiere/manifest.json` (`credits_add`).
- Gelesen (nicht verändert): `PLAY.seat` (Mitfahren), `ZSTATE.on`, `P.mode`, `VEH.cur`, `R.domElement` (ob ein anderes Fenster auf den
  Hund-Knöpfen liegt), `GPLAN.state`/`GPLAN.M.plantSteps` (gepflanzte Bäume, Wühlmauskorb), `RATSCHER`, `FOREST`, `ROADS`, Ronalds Ziegen
  (`GOATS`, `GOATLURE`, `PAD`).
- Die Lage der Gruppen folgt den Daten der Welt (Kronen, Gebäude): ändert eine andere Arbeit diese Daten, verschieben sich Rehe und Rotten
  – Tests sollten Gruppen nach Eigenschaften wählen (draußen, mindestens zwei Tiere), nicht nach festen Koordinaten.
- Neue `window`-Namen: `TARTEN`, `TKOERPER`, `TTON`, `TIERE`, `TEINFLUSS`, `THUEHNER`, `HUND`. Tasten: P (Hund rufen), Umschalt+P (schicken; nicht mehr U – das schaltet im Strategie-Modus zwischen oben und der Welt), + / − (loben/tadeln).
