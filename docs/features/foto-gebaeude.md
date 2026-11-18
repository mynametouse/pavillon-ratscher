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

Gezählt wie `viz3/test/fotoref.py` (Stufe „hoch“, 1280 × 720, 15:30 Uhr, Wetter „klar“; Software-Grafik im Chat-Rechner – Zeiten sagen
dort nichts): **Zeichenaufrufe und Dreiecke sind mit und ohne exakt gleich**, im Bild wie in der Schattenkarte (keine Geometrie, kein
Mesh, kein Pass).

| Blickpunkt | Zeichenaufrufe / Dreiecke (mit = ohne) | Schattenkarte des Kastens |
|---|---|---|
| Anger (242, −101) | 690 / 1,35 M | 75 / 90 Tsd. |
| Fassaden am Anger (250, −118) | 249 / 0,86 M | 72 / 88 Tsd. |
| Scheune (300, −160) | 263 / 0,75 M | 64 / 74 Tsd. |
| Wand in 2 m | 253 / 0,85 M | 73 / 95 Tsd. |
| Halle (120, −60) | 320 / 0,94 M | 65 / 47 Tsd. |
| Welt: Rappelsdorf (−3206, −54) | 211 / 0,21 M | 63 / 19 Tsd. |
| Markt Schleusingen (−1100, 1215) | 350 / 1,02 M | 76 / 45 Tsd. |

- **Programme:** kein neues – die zwei vorhandenen (`v16e-wall`, `v16e-roof`) sind geändert; 177 Programme nach allen Blickpunkten wie vorher.
- **Texturen je Programm:** Wand 7 statt 5 (dazu das Rauschen und die Normalenkarte des Putzes), Dach 8 statt 7 (das Rauschen); das
  größte Programm bleibt bei 16 (die Bodenshader). `lib.check_gl`: keins über 16, keins kaputt.
- **Speicher:** eine Textur mehr – das Rauschen, 256² RGBA mit Mip-Stufen, 0,35 MB, beim Start gerechnet (20–50 ms einmalig, in node
  gemessen). Die Normalenkarte des Putzes (`tex/plaster_ext_nrm`) laden die Gartenwände ohnehin; keine neue Datei, kein neues Asset.
- **Arbeit je Bild auf der CPU:** keine (kein Tick, keine Uniform, die sich je Bild ändert).
- **Arbeit je Bildpunkt:** das ist der Preis. Je Wandpixel vier Textur-Abrufe und einige Hashes mehr, je Dachpixel zwei Abrufe. Gemessen
  mit denselben Shadern auf einem Software-Rasterer (Mesa llvmpipe, nicht im Browser): eine Wand, die das Bild füllt, braucht das
  1,56-fache der Shader-Zeit, ein Dach das 1,08-fache. Auf einer Grafikkarte sind Textur-Abrufe verhältnismäßig billiger – **gemessen ist
  das dort nicht** (kein Gerät im Chat-Rechner); auf Falkos Laptop (Intel UHD 620) und am iPhone bitte ansehen. Wenn es dort zu viel ist:
  die grobe Körnung und die Wellen der Wand lassen sich je Stufe abschalten (zwei Abrufe weniger) – noch nicht eingebaut.

## Tests

- `viz3/test/foto_gebaeude.py` (neu): das eine Wandmaterial zeichnet auch die Gebäude des Quadrats; Wand- und Dach-Programm halten die
  neuen Uniforms und höchstens 16 Texturen; eine Putzwand aus 2 m ist nicht mehr einfarbig (Streuung der Helligkeit), ihr Sockel ist
  höher als der alte und dunkler als die Wand, der Fuß noch dunkler; an einer Fassade in der Sonne liegt der obere Fensterstreifen im
  Schatten des Sturzes; Häuser einer Straße weichen im Ton voneinander ab; der Himmel bleibt bildpunktgleich, Zeichenaufrufe und Dreiecke
  gleich; `GEBFOTO.set(0)` gibt das alte Bild. Hinweise ohne Urteil: die Ziegelreihen (Streuung der Bildzeilen über der Traufe), der Fuß.
- `viz3/extra/foto-gebaeude/tests.txt`: dazu `dorfkern`, `welt_gebaeude`, `schleusingen`, `leistung`, `memphone` – laufen im Feature-Lauf
  bei GitHub auf jedem Push nach `feat/foto-gebaeude` (seit 18.11. 21:00 testen die Hilfs-Agenten dort, der Browser im Chat-Rechner ist
  für Bilder).
- Ohne Browser: `bash tools/check.sh`; die beiden Shader (so, wie three sie zusammensetzt) übersetzt und mit einer Probe-Fassade
  gezeichnet mit Mesa (EGL, llvmpipe) – daher die Probe-Bilder unter `/home/claude/scratch/foto/gebaeude/glsl/` (nicht das Licht der App).
- Bilder vorher/nachher aus der App: `/home/claude/scratch/foto/gebaeude/c/` (`<blick>_vorher.jpg`, `<blick>_nachher.jpg`; ein Laden,
  `GEBFOTO.set(0)` und `set(1)` von derselben Stelle).

## Offen

1. **Am echten Gerät ansehen** (Laptop, iPhone): Bildrate vor einer Wand, die das Bild füllt; Stärke von Körnung, Flecken und Sockel.
2. **Fenster, zweiter Teil:** nicht jedes Fenster gleich (Rollladen halb unten, Gardinen in mehr Arten, offene Flügel), Scheiben, die
   aus der Ferne den Himmel verschieden hell spiegeln; Rahmen mit Profil. Der Schatten der Laibung ist gerechnet, nicht in der
   Schattenkarte: ein Fenster im Schatten eines Nachbarhauses bekommt ihn nicht doppelt, aber die Laibung wirft keinen Schatten auf
   Dinge davor.
3. **Sockel und Gelände:** der Sockel misst von der Fußhöhe des Hauses; wo der Boden am Hang höher liegt, verschwindet er teilweise im
   Boden, wo er tiefer liegt, läuft das Sockelmaterial als Fundament weiter. Türen stehen wie bisher auf der alten Sockelhöhe.
4. **Dächer:** Moos und Dunkelwerden *zur Traufe hin* brauchen den Abstand zur Traufe je Dachpunkt – den geben die Dach-Bauer nicht mit
   (ein Attribut mehr in `village.js`, `gebaeude.js`, `schleusingen.js`, `vessra.js`); jetzt sitzt das Moos in Flecken auf der ganzen
   Nordseite. Schiefer- und Wellplattendächer haben Flecken und Nordseite, aber keine neuen Reihen. Schornsteine, wo ein Wohnhaus keinen
   hat: offen (Schritt 3 des Auftrags).
5. **Wo es herkommt, ist allgemein:** Sockelmaterial, Alter und Schmutz sind nicht aus Daten des einzelnen Hauses. Sagt eine Quelle
   mehr (Baujahr aus dem LoD2, Falkos Video), kann `age` daraus kommen statt aus der Hausnummer.
6. Das Dorf von 1989 (`grenzland/gl_1989_welt.js`) könnte mit `GEBFOTO.set(1.8)` unrenovierte Wände zeigen – nicht angefasst (nicht meine
   Dateien).
7. Suhl (`lazy/suhl/**`) zeichnet mit demselben Wandmaterial und bekommt alles mit – dort nicht angesehen.
