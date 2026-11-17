# Grenzland, Kapitel 2 Etappe 1 – Straße: Verkehr mit Ziel, Begegnungen unterwegs (Hilfs-Agent `strasse`, 17.11.2026)

Auftrag: `docs/plans/auftraege/grenzland4-strasse.md` (gemeinsam: `grenzland4-gemeinsam.md`, seit 14:15 dazu `realismus1-gemeinsam.md`).
Branch `feat/grenzland-strasse`. Falko, 17.11. 12:26 (angeklickt): **„Verkehr mit Ziel“** – „Schulbus, Milchlaster, Holztransporter,
Streifen mit festen Runden – und Krähwinkels Lkw zum Verfolgen.“ – **„Begegnungen unterwegs“** – „Anhalter, Panne am Straßenrand,
Blitzer, Jäger am Hochsitz“ – **„Rast an der A 73“**. 13:27: Realismus vor Menge, „ob eine Darstellung … so in Wirklichkeit aussehen
kann“; der Lead dazu: Verkehr in und zwischen Ratscher und Schleusingen zuerst, dann die Begegnungen, die Rast zuletzt und nur, wenn der
Rest steht.

## Was es gibt

### Verkehr mit Ziel (`grenzland/gl_linien.js` GLLINIEN, Fahrplan `gl_linien_data.js` GLLDATA)

Wenige Fahrzeuge, jedes mit Grund und Fahrplan. Nur in der Nähe des Spielers stehen sie wirklich auf der Straße: Ein Lauf ist eine Linie
über die Straßen des Quadrats (der Straßengraph von `GLAUTO`); solange niemand hinsieht, ist er eine Zahl auf seinem Fahrplan. Kommt
der Spieler auf 300 m heran, steht das Fahrzeug dort, wo der Fahrplan es hinsetzt – nie vor den Augen (nur außer Blick oder jenseits
von 190 m im Dunst) – und fährt von da in Echtzeit: Lkw innerorts 50, außerorts 60 km/h, langsamer auf Wegen und in Kurven, sanft
anfahrend; es hält für den Spieler, für den Verkehr vor ihm (`VAUTO`, die Busse, die anderen Fahrzeuge des Modus) und an seinen
Haltestellen. Jenseits von 420 m ist es wieder eine Zahl und behält die Verspätung, die es sich eingefahren hat (die Uhr rast – eine
Stunde je Minute –, so machen es auch die Busse des Spiels).

| Fahrzeug | Typ | wann | was |
|---|---|---|---|
| Milchsammelwagen der (erfundenen) Molkerei Sonnenwiese | `milchlaster` | täglich 6:10 | kommt von Schleusingen, hält auf dem Hof von Uwe Bachmann am Anger (der Landwirt des Dorfs, „die Kühe warten nicht“; Haus 260 von `world/village.js`), fährt weiter Richtung Hinternah |
| Holztransporter | `holzlaster` | Mo–Fr 9:20 und 14:05 | fährt leer zum Holzpolter am Waldweg bei der Unteren Klinge, lädt (steht 40 s), fährt beladen weiter Richtung Süden |
| Streifenwagen in Ratscher | `streife` | täglich 10:30, 15:40, 20:10, 23:30 | Runde: durch Ratscher, kurzer Halt am Anger, Richtung Talsperre – **nur solange niemand gesucht wird** |
| Streifenwagen in Schleusingen | `streife` | täglich 11:15, 17:30, 21:45 | Runde: von Südwesten in die Stadt, kurzer Halt am Markt, zur Zentralhaltestelle, nach Norden hinaus |
| Lkw der Spedition Krähwinkel (zwei) | `koffer` | Mo–Sa 6:40, 13:25, 22:35 | laden am Außenlager (Kapitel 1) und fahren weiter – auch spät in der Nacht; `GLLINIEN.folgen(id)` gibt die Tour (Kapitel 2, Mission 4) |
| Lieferverkehr an den Laderampen in Schleusingen | `koffer` (zwei mit Kühlaggregat) | Mo–Sa: REWE 5:15 und 9:30, EDEKA 6:05 und 11:20, Mega Center 7:40 und 10:15, OBI 7:00 und 13:10 | kommt vom Stadtrand, fährt an der Hofeinfahrt vorbei und **setzt rückwärts an die Laderampe** (die Türen `k: 'liefer'` aus `laeden.json`; ein Feld `anlieferung` von `laeden-leben` hätte Vorrang), steht dort bis zum Ende der Lieferzeit, fährt vorwärts hinaus |
| Lieferwagen an Ladentüren der Altstadt | `kasten` | Mo–Sa: Bäckerei 5:35, Apotheke 9:10 und 14:30; Mo–Fr Gasthaus 10:20 (Getränke) | hält am Bordstein vor der Tür (Geschäft nach dem OSM-Namen in `welt/schleusingen.js`), **Warnblinker an**, die Fahrerin trägt die Kiste zur Tür, ist ein paar Sekunden drin, kommt zurück, fährt weiter |
| Paketwagen in Ratscher | `kasten` | Mo–Sa 11:05 | zwei Häuser (Gerhard, Katrin): am Bordstein halten, Warnblinker, die Zustellerin bringt das Paket zur Haustür und kommt zurück |
| Schüler am Schulbus | Figuren | Schultage vor 7:02 und 7:40 | warten vor dem Wartehäuschen am Anger auf die **echten** Schulbusse 268 und 214 und steigen ein, wenn der Bus mit offenen Türen hält |

- **Wege mit Rückwärtsfahrt** (`GLLWEG` in `gl_linien_data.js`, rein, mit Unit-Tests auf dem echten Straßennetz des Quadrats und der
  Stadt): Ein Lauf besteht aus Abschnitten, vorwärts oder rückwärts. Ein Halt in einer Sackgasse (eine Hofeinfahrt, die eigene Zufahrt
  einer Laderampe) wird angefahren wie im Leben – an der Einfahrt vorbei, rückwärts hinein, vorwärts hinaus; rückwärts geht es im
  Schritttempo, und wer hinter dem Lkw steht, hält ihn auf. Kein Weg verlässt einen Knoten über die Kante, auf der er kam (kein Wenden auf
  der Stelle); geprüft für jeden Lauf.
- **Nie vor den Augen:** Läge der Platz eines Fahrzeugs nach seinen Zahlen im Blick und näher als 190 m, erscheint es weiter hinten auf
  seinem Weg, wo niemand hinsieht, und kommt von dort (es ist dann etwas verspätet).
- **Fahrer in den Kabinen:** eine Figur des Modus sitzt am Steuer (die Streife hat zwei Beamte); sie sehen, was man tut, und melden es
  wie jeder Zeuge – die Beamten der Streife zählen als Polizei, also sofort. Ab dem ersten Stern weicht die Streife: sie fährt weiter und
  verschwindet außer Sicht, die Fahndung schickt ihre eigenen Wagen (`gl_fahndung.js`).
- **Der Holzpolter:** ein Stapel Fichtenstämme (5 m) auf zwei Unterlegern neben dem Waldweg, auf der Seite des Waldes, 5 m vom Weg
  (der Kran reicht 8 m); steht, solange man näher als 350 m ist.
- **Die Lkw** (`gl_typen.js`, neue Typen): Frontlenker von heute ohne Hersteller – ein Fahrerhaus aus seinen Teilen um echte Öffnungen
  (Windschutzscheibe, Türfenster) mit dunklem Innenraum, Armaturenbrett, Lenkrad und zwei Sitzen (man sieht hinein und den Fahrer),
  Sonnenblende, Grill, Scheinwerfer in der Stoßstange, Spiegel an Auslegern, Trittstufen, Rahmen, Tank, Seitenschutz, Kotflügel, Rücklichter,
  Unterfahrschutz. `koffer`: 18-t-Koffer (9,9 × 2,55 × 3,95 m, Radstand 5,2 m) mit Eckprofilen, Hecktüren mit Verschlussstangen,
  eingeklappter Ladebordwand, Schriftzug (`text`) und auf Wunsch Kühlaggregat (`kasten: 'kuehl'`). `milchlaster`: 26 t, ovaler
  Edelstahltank mit Laufsteg und zwei Domdeckeln, Pumpenschrank hinten, Leiter, Schriftzug. `holzlaster`: 26 t, Kran hinter dem
  Fahrerhaus eingeklappt, Stirnwand, drei Rungenpaare, 5-m-Stämme (`kasten: 'leer'` ohne Ladung). Milch- und Holzlaster haben eine
  Doppelachse hinten (`tandem`; `gl_linien.js` setzt zwei Achsen an die Stelle der einen und dreht sie mit). Reifen 315/80 R 22,5,
  hinten Zwillingsräder. Rund 5 500–6 500 Dreiecke, etwa zwölf Zeichenaufrufe je Lkw, keine neuen Shader.

### Begegnungen unterwegs (`grenzland/gl_ereignis.js`, Plan `GLLOGIK.EREIGNISSE`)

Neu neben Blitzer, Traktorstau, Korso, Böller und Wildunfall (alle auf dem Land; jede mit Punkt auf dem Radar, weggeräumt, wenn vorbei
oder zurückgelassen):

| Ereignis | wann | was | Folge |
|---|---|---|---|
| Anhalter | Tag oder Dämmerung, unterwegs | ein Student oder eine Wanderin (ab und zu ein Sonderling) am Straßenrand, Rucksack und Pappschild mit dem Ziel („RATSCHER“, „STAUSEE“, „SCHLEUSINGEN“); winkt, fragt, wenn man neben ihm hält | auf dem Moped mitnehmen (nicht, wenn die oder der andere schon hinten sitzt), das Ziel als Wegpunkt; unterwegs ein Satz über die Gegend (wahr: Naturhistorisches Museum in der Bertholdsburg, der Rennsteig ist nah) oder etwas Harmlos-Schräges; am Ziel 5 € und guter Ruf |
| Panne | jederzeit, unterwegs | ein Kombi mit Warnblinker am Rand, Motorhaube offen, Warndreieck 60 m dahinter, die Fahrerin telefoniert, winkt | „Helfen“: Benzin aus dem Kanister (wenn der Tank leer ist), Anschieben (wenn die Batterie leer ist), Abschleppdienst anrufen; das Passende bringt 15 € bzw. 10 € und guten Ruf, der Wagen fährt los |
| Jäger | Dämmerung (gut eine Stunde um Sonnenauf- und -untergang), am Waldrand | geschlossene Kanzel auf vier Beinen mit Leiter, der Jäger darin; ein Schuss in der Ferne; wer vorn über die Wiese läuft, wird weggewunken | steigt herunter, wenn man am Hochsitz ist (oder nach einer Weile), und möchte mit bis zum Anger |

- Guter Ruf geht über `GLRUF.add(ort, n, grund)` des Agenten `ruf`, wenn es ihn gibt (Ort nach der Lage: Schleusingen oder Ratscher).
- **Die alte Zufalls-Kirmes** wird nicht mehr geplant, sobald `window.GLFESTE` (Agent `alltag`, Feste im Kalender) da ist;
  `GLEREIGNIS.debug.start('kirmes')` geht weiter (Tests).
- Gesprochene Sätze: feste Texte in `GLEREIGNIS.SAGT`, `GLEREIGNIS.linien()` gibt sie (Sprecher `sl_*`); die neuen Leute sind nicht
  unter den Redenden von `gl_reaktion.js` (sonst bekäme jeder alle Sätze der vier Antworten).

## Entscheidungen

- **Der Schulbus ist der echte.** Das Spiel fährt die Busse nach dem echten Fahrplan (`bus/`, gtfs.de); an der Schulbushaltestelle am
  Anger fahren an Schultagen die 268 um 7:02 und die 214 um 7:40 nach Schleusingen. Ein zweiter, erfundener Bus daneben wäre unecht –
  dazu kommen hier nur die wartenden Schüler. Einen Rückweg am Nachmittag zur Schulbushaltestelle hat der Fahrplan nicht (die 214 um
  14:26 fährt Richtung Schleusingen) – also keiner.
- **Die Rast an der A 73 ist (noch) nicht gebaut.** Die Autobahn liegt zwar im Quadrat (zwischen (650, 1062) und (1366, 98)), aber fast
  überall in einem Einschnitt: Das Land daneben liegt 10–28 m höher (gemessen mit `grenzland_strasse:probe`); eine Anschlussstelle gibt
  es im Quadrat nicht. Eine Raststätte bräuchte dort Erdarbeiten, die das Gelände nicht hergibt – auf den Hang gesetzt sähe sie nicht
  echt aus. Nach dem Realismus-Auftrag (zuletzt, und nur, wenn der Rest steht) zurückgestellt; der eine flache Abschnitt (um (775, 750),
  Gelände ±2 m) wäre der Ort, wenn sie kommt. Krähwinkels Lkw parken deshalb nicht an der Rast, sondern laden am Außenlager und fahren
  zur Anschlussstelle Schleusingen (jenseits der Karte).
- **Krähwinkels Lkw** sind Koffer-Lkw (eine regionale Spedition); ein Sattelzug bräuchte einen Auflieger, der der Linie nachläuft.
- **Kein Hupen:** `c.horn` der Fahrzeuge des Modus spielt das Martinshorn (`GLTON.siren`) – die Lkw hupen deshalb nicht.
- **Panne:** ein Kombi von heute; Ursache zufällig Tank oder Batterie – Anschieben hilft nur bei der Batterie, Benzin nur beim Tank.
- **Tests anderer Teile:** In automatischen Browser-Tests (`navigator.webdriver`) ist der Verkehr dieses Moduls aus, außer ein Test
  schaltet ihn ein (`GLLINIEN.aus = false`) – so behalten die anderen Tests ihre Zählungen und Zeugen. Für Falko im Browser ist er an.

## Tests

- `node --test viz3/test/unit/grenzland_strasse.test.mjs` – Tagesarten (Schultag, Ferien, Samstag, Sonn- und Feiertag), ein Lauf als
  Zahlen (fährt, hält, fertig), wer wann unterwegs ist, die Touren, Schüler und Busse, die Streife nur ohne Sterne, nichts Echtes;
  die neuen Ereignisse im Plan. Im Unit-Test der Welt (`grenzland_welt.test.mjs`) stehen die zwei neuen Tagesereignisse in der Liste
  „beide waren eben da“.
- `viz3/test/grenzland_strasse.py <port> <teile>`: `linien` (jede Fahrt hat eine Linie ohne Kehre), `holz`, `milch`, `kraeh`, `streife`,
  `schule`, `paket`, `liefer` (Schleusingen: REWE-Rampe, Apotheke), `begegnung`; die Zeilen in `viz3/extra/grenzland-strasse/tests.txt`.
  Bilder in `out/grenzland_strasse/`.
- Formen ohne Browser: `node viz3/extra/grenzland-auto/werkzeug/bild.mjs koffer out/karosse/koffer.png --opt '{"text":"Spedition Krähwinkel","band":"#7a1f24"}'`.

## Offen

- Die Rast an der A 73 (siehe oben).
- Lidl hat in den Straßendaten keine Zufahrt zu seiner Rampe – dort kommt (noch) kein Lkw.
- Die Ankunft eines Lieferwagens an einer Ladentür der Altstadt geht über die Straßendaten der Region; ob dort ein Halteverbot wäre, weiß
  das Spiel nicht – die Wagen halten am Bordstein wie überall.
- Der Verkehr des Spiels (`VAUTO`, `VKSTROM`) weicht den Fahrzeugen des Modus nicht aus (siehe „Für den Lead“).

## Für den Lead

- **`gl_modus.js`** (schon eingetragen, je eine Zeile, markiert `// grenzland-strasse`): in `tick(dt)` nach `GLUMGEBUNG.tick(dt)`
  `for (const m of [window.GLLINIEN, window.GLRAST]) if (m && m.tick) m.tick(dt);`, in `stop()` nach `GLUMGEBUNG.stop()` dasselbe mit
  `stop()`. **`modules.txt`**: `gl_linien_data.js`, `gl_linien.js` nach `gl_ereignis.js`.
- **Wunsch an `verkehr/verkehr_auto.js` `obstacles()`** (nicht meine Datei): die Fahrzeuge des Modus als Hindernisse, wie die Busse –
  `if (window.GLAUTO) for (const c of GLAUTO.cars) if (c.g.visible) for (const t of [-1, 0, 1]) OB.push({ x: c.x + Math.sin(c.hd) * (c.T.cy + t * Math.max(0, c.T.hl - c.T.hw)), y: c.y + Math.cos(c.hd) * (c.T.cy + t * Math.max(0, c.T.hl - c.T.hw)), r: c.T.hw, kind: 'veh', moving: c.v > 0.5 });`
  Sonst fahren Autos des Verkehrs durch Lkw und Streifen hindurch (bei der Polizei schon heute so).
- **Wunsch an `gl_fahndung.js`:** eine Übergabe `GLFAHNDUNG.uebernimm(c)` – ein Wagen eines anderen Moduls (die Streife von
  `GLLINIEN`, die gerade sieht, wie etwas passiert) wird die erste Einheit der Fahndung, statt vom Straßenende zu kommen. Bis dahin
  meldet sie sofort (Beamte als Zeugen) und fährt weiter.
- **Für `alltag`:** die Schüler am Schulbus macht `GLLINIEN` (Figuren `sl_schueler1–3`); wer eigene Kinder hat, kann sie zur
  Haltestelle schicken: `GLLDATA.SCHULE.abfahrten` (7:02, 7:40), `GLLDATA.schulbus(minute, tag)`, `GLLDATA.ORT.wartehaus`.
- **Für `ruf`:** gute Taten unterwegs rufen `GLRUF.add('ratscher' | 'schleusingen', n, grund)` (Anhalter mitgenommen 2, Panne 3,
  Abschleppdienst gerufen 1).
- **Für Kapitel 2:** `GLLINIEN.fahrzeuge()`, `GLLINIEN.folgen('k1' | 'k2')` (Tour mit Zeiten, Herkunft, Ziel, Zweck und der jetzige
  Ort), `GLLINIEN.markiere(id)` (ein Wegpunkt auf dem Radar für den verfolgten Lkw), `GLLINIEN.inMission = true` (der Verkehr fährt auch
  während einer Mission; Kapitel 1 fährt ohne ihn).
- **Stimmen:** `GLEREIGNIS.linien()` hat die neuen Sätze (Sprecher `sl_student`, `sl_wanderer`, `sl_sonderling`, `sl_panne`,
  `sl_jaeger`); `GLLINIEN.linien()` ist leer (die Fahrer sprechen nicht).
