# Fotorealismus: Gebäude – gebaut und bewohnt statt gestrichene Kisten (`feat/foto-gebaeude`)

Auftrag von Falko (18.11.2026): „Fassaden mit Putzstruktur, Gebrauchsspuren und natürlichen Farbabweichungen“, „Sockel und Fundamente“,
„Fenster und Türen“, „Dächer mit einzelnen Ziegeln“ – nichts steril, nichts gleichförmig, flüssig im Browser. Hilfs-Agent `foto-gebaeude`
des Fotorealismus-Chats (Auftrag `docs/plans/auftraege/foto-gebaeude.md`, gemeinsame Regeln `foto-gemeinsam.md`).

## Was ich vorgefunden habe

- **Eine Wand-Zeichnung für die ganze Welt.** Jede Hauswand – die 337 Häuser von Ratscher (`world/village.js`), die Gebäude aus ETHOS im
  Quadrat und in den 400-m-Zellen der Welt (`gebaeude/gebaeude.js`), Schleusingen (`welt/schleusingen.js`), Kloster Veßra, Suhl, die
  Läden, die Ergänzungen von `fassade/` – wird mit **einem** Material gezeichnet: dem Fassaden-Shader `wallMat` von `world/village.js`
  (Programm `v16e-wall`). Alle anderen bauen nur Geometrie in dessen Attribut-Aufbau (`aW`: Meter um den Grundriss, Höhe über dem Fuß,
  Oberkante, Gebäudenummer; `aV`, `aG`, `aD`, `aC`, `aTan`) und hängen sie an `RATSCHER.bld[0].material`. Ebenso die Dächer: ein Material
  (`roofMat`, `v16e-roof`). **Eine Änderung in diesen beiden Shadern erreicht jedes Haus** – dort setzt dieser Schritt an.
- Ein Zeichenaufruf hält: alle Wände des Dorfs (einer), je Unterzelle der Welt-Zellen einer für Wände und einer für Dächer, ganz
  Schleusingen je einer.
- Der Fassaden-Shader malt Stile (Putz, Schiefer, Fachwerk, Bretter, Ziegel, Blech), Fenster mit Laibung entlang des Sehstrahls, Türen und
  Tore – aber: Wände in einer Farbe (nur ±5 % Putzfoto), ein Sockel nur an Putzhäusern (0,35 m, überall dasselbe Dunkelgrau; Schiefer und
  Fachwerk liefen bis in den Boden), die Laibung wurde von der Sonne nicht verschattet, keine Spuren, die Dächer ab ~30 m ohne Ziegelreihen.
- `grime()` aus `core/assets.js` (Schmutz am Fuß, Flecken, Laufspuren) nutzen nur die Materialien des Gartens (Pavillon, Bungalow,
  Werkstatt, Zäune). Für die Häuser passt es nicht: es rechnet mit der Welthöhe über dem ebenen Gartenboden; die Häuser stehen im Gelände
  und haben mit `aW.y` die Höhe über ihrem eigenen Fuß. `grime` bleibt unverändert.

## Was neu ist

Alles sitzt im neuen Modul `viz3/src/gebaeude/geb_foto.js` (`GEBFOTO`): GLSL-Stücke, die `world/village.js` an markierten Stellen in
seinen Wand- und Dach-Shader einsetzt. Keine Geometrie, kein Zeichenaufruf, keine neue Datei.

**1 Sockel, der von der anderen Straßenseite als Sockel zu lesen ist.** Jedes Wohnhaus hat ein Band von 0,45–0,9 m (Höhe und Material
je Haus aus seiner Nummer): dunkler Putz, heller Putz oder Sandsteinquader mit Fugen – auch unter Schiefer und Fachwerk. Oben eine
Kante, die das Licht fängt (ihre Fläche schaut etwas nach oben), darunter eine feine Schattenlinie; der Fuß am Boden dunkel und feucht;
direkt über dem Sockel Spritzschmutz mit ausgefranstem Rand. Das Mauerwerk der Scheunen (2,2 m) hat Steinlagen.

**2 Fenster und Türen mit Tiefe für das Licht.** Die Laibung war schon da (Sehstrahl), jetzt verschattet sie: aus dem Fensterrechteck
und dem Sonnenstand rechnet der Shader, welcher Teil von Rahmen, Glas und Türblatt im Schatten der Wand liegt – ein dunkles Band unter
dem Sturz und an der Seite zur Sonne, das mit der Sonne wandert. Unter dem Sturz und in den Ecken kommt weniger Himmelslicht an. Die
Fensterbank schaut etwas nach oben (fängt Licht) und wirft einen Schatten, so lang, wie die Sonne steil zur Wand steht. Dazu Schmutzfahnen
unter den Enden der Fensterbank.

**3 Putz, den man sieht.** Die Körnung als geneigte Normale (die Sonne streift darüber) und – so, wie das Himmelslicht von oben sie
beleuchtet – auch in der Farbe, damit sie im Schatten nicht verschwindet; in zwei Größen (fein wie das Putzfoto, und dreieinhalbmal
gröber: Rauputz, von der Straße aus zu sehen). Je Haus ein eigener Ton (heller, dunkler, grauer, wärmer – im Rahmen seiner Farbe), je
Wand große weiche Flecken, im Fachwerk jedes Gefach für sich; alte Wände sind nicht eben (weiche Wellen in der Normale, im Streiflicht
zu sehen), Bretter stehen jedes etwas anders. Wenige Regenläufer, mehr an der Wetterseite; Grün an der feuchten Nordseite; unter Traufe
und Ortgang etwas dunkler. Am stärksten an Scheunen und Schuppen, am wenigsten an neuen Häusern; jedes vierte Haus frisch gemacht.
Raue Wände spiegeln den Himmel bei flachem Blick nicht mehr (der blasse Schleier entlang einer Straße), Glas schon.

**4 Dächer.** Tonziegel in Reihen, die man von der Straße liest: die Stirn jeder Ziegelreihe zeigt zu dem, der hinaufschaut – umso
breiter, je flacher der Blick; jede Reihe ein wenig anders im Ton; Verwitterung in großen weichen Flecken; die Nordseite dunkler und in
Flecken bemoost. First und Ortgang gab es schon als Geometrie.

**Allgemein, nicht vermessen:** wo Schmutz sitzt, folgt aus Höhe, Himmelsrichtung und Zufall; Höhe und Material des Sockels aus der
Hausnummer – nicht aus Fotos des einzelnen Hauses. Die Häuser am Anger behalten Stil und Farben aus Falkos Video
(`world/dorfkern_data.js`); der Ton weicht um höchstens ±12 % in der Helligkeit ab.

## Dateien

| Datei | was |
|---|---|
| `viz3/src/gebaeude/geb_foto.js` (neu, `GEBFOTO`) | das GLSL (`pars`, `wall`, `open`, `normal`, `light`, `roof`, `roofPars`), das Rauschen (256², vier Felder, beim Start gerechnet), `GEBFOTO.set(k)`, `state()` |
| `viz3/src/world/village.js` | markierte Zeilen `// feat/fotorealismus (foto-gebaeude)`: ein Import, im Wand-Shader fünf Einsetzstellen (nach der Wandfarbe, in der Öffnung, an der Normale, nach dem Licht, die Deklarationen), im Dach-Shader zwei, eine Zeile für die Uniforms |
| `viz3/src/modules.txt` | eine Zeile (`gebaeude/geb_foto.js` nach `gebaeude/geb_dach.js`) |
| `viz3/test/foto_gebaeude.py`, `viz3/extra/foto-gebaeude/tests.txt` | der Test und was die CI auf `feat/**` dazu laufen lässt |

Schnittstelle: `GEBFOTO.set(0)` zeigt Wände und Dächer wie vorher, `set(1)` den neuen Stand (mehr geht: eine heruntergekommene Straße –
z. B. für das Dorf von 1989); `?nofotogeb` startet mit 0; `GEBFOTO.state()`.

## Kosten

KOSTEN_PLATZHALTER

## Tests

TESTS_PLATZHALTER

## Offen

OFFEN_PLATZHALTER
