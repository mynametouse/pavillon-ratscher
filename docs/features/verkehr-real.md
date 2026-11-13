# Verkehr realistisch, Stufe 1: Fahrzeuge von heute, Dichte nach Wochentag und Uhrzeit, Draufsicht (`verkehr-real`)

Straßen-Chat session_01WqScFDtq8GSy4n7wU7foJx mit Falko, 13.11.2026, Branch `feat/verkehr`. Plan: `docs/plans/plan_verkehr.md`.

Falko (13.11. 12:14): „Aktuell fahren noch sehr wenig und sehr wenige Autos auf den Straßen und die Autos sehen noch sehr künstlich bzw.
eckig und schemenartig aus. Bitte möglichst realistische Modelle … die Verkehrsdichte typisch gestalten … realistisch nach Wochentag und
Uhrzeit … Und natürlich muss man den Verkehr auch von oben sehen können.“ Entschieden (12:45, angeklickt): Modelle nach echten Maßen
ohne Logos, Unfallfolgen harmlos, Dichte wie echt gezählt. 13:03: „Ja, bitte anfangen …“, „Bitte achte auf hohe Qualität“.

## Was es gibt

- **20 Fahrzeugtypen von heute nach echten Maßen** (`verkehr/vk_typen.js`, rein, Unit-Tests): Länge, Breite, Höhe, Radstand, Überhänge,
  Spur und Reifen je eines echten Modells (im Code-Kommentar genannt, nie im Spiel), ohne Marken, Embleme und Schriftzüge, Kennzeichen ohne
  Nummern. Geformt mit dem Karosseriebauer des Grenzland-Modus (`grenzland/gl_karosse.js`, nur gelesen – mit dem Okay des Grenzland-Chats
  vom 13.11. 12:40): Querschnitte, Glas, Säulen, Radhäuser, Spiegel, Griffe, Scheibenwischer, Innenraum.
  - Pkw: Kompaktwagen (zwei), Kleinwagen (zwei), Kleinstwagen, Kombi (zwei), Limousine, SUV (zwei), Elektroauto, Hochdachkombi.
  - Transporter, großer Kastenwagen (Hochdach, Flügeltüren), Lkw mit Koffer, Sattelzug mit Auflieger, Müllwagen (drei Achsen),
    Traktor von 240 PS mit Kipper (Tandem).
  - Lampen, Kühlergrill, Lufteinlässe, Stoßfänger, Nebelscheinwerfer, Kennzeichen liegen **bündig auf der Karosserie** (`endMap`/`patch`:
    die Front- und Heckfläche als Höhenkarte, die Teile darauf entlang der Flächennormale versetzt) – Rückleuchten greifen um die Ecke.
  - Farben nach der Statistik der Neuzulassungen (grau, schwarz, weiß zwei Drittel; Metallic oder uni), Transporter meist weiß,
    Lkw-Kästen weiß oder silber, Traktoren grün, rot, blau; der Pkw-Mix nach dem Bestand.
- **Gebaut im Hintergrund, ohne Ruckeln** (`lazy/verkehr-bau.js` → `dist/lazy/verkehr-bau.js`, ein Modul-Worker, 82 KB): ein Typ braucht
  50–250 ms – im Worker, nie im Bild. Erst die fernen Stufen aller Typen (2,5 s für alle, das Hauptprogramm blieb im Test unter 17 ms je
  Schritt), die nahe Stufe erst, wenn ein Fahrzeug des Typs näher kommt (im Test 0,9 s). Startet erst mit dem ersten Bild des Spiels (nichts
  während des Ladens). Ohne Worker baut das Hauptprogramm, ein Typ je Leerlauf.
- **Ein Shader für alle Fahrzeuge** (`verkehr/vk_modelle.js`, `VKMOD`): MeshPhysicalMaterial mit Klarlack wie das eigene Auto; jede Ecke
  sagt, was sie ist (Lack, Kunststoff, Chrom, Glas, Scheinwerfer, Rücklicht, Blinker, Felge, Reifen); jedes Fahrzeug eine Kopie mit
  seinem Lack, seinen Lampen (Abblendlicht, Rücklicht, Bremslicht, Blinker, Rückfahrlicht, Tagfahrlicht) und seinen Rädern – **die Räder
  dreht und lenkt der Shader**, sie gehören zum einen Netz: **ein Zeichenaufruf je Fahrzeug**, nah zwei (die Scheiben durchsichtig, der
  Innenraum dahinter). Programm beim Laden übersetzt, im Spiel kein neues (Test).
- **Drei Detailstufen:** nah (bis 24 m, Telefon 13 m) der volle Bau (Pkw 17–21 Tsd. Dreiecke), mittel (bis 95 m / 55 m) der leichtere
  Bau mit dunklen, festen Scheiben (10–12 Tsd.), fern geclustert (unter 2 600). Weicher Schatten unter jedem Fahrzeug und die Lichtkegel
  der Scheinwerfer nachts als je ein Instanz-Netz (zwei Zeichenaufrufe für alle).
- **Anhänger:** der Sattelzug zieht seinen Auflieger, der Traktor seinen Kipper – auf einer Schleppkurve (der Anhänger schneidet die
  Kurven wie ein echter), nie mehr als 80° geknickt; beide sind fest für das Spielerauto.
- **Die Fahrer der Orte** (Ratscher, Schleusingen) fahren jetzt ihr eigenes Auto von heute (je Name immer derselbe Typ, die Farbe bleibt
  ihre). „Selbst fahren“ übernimmt das Netz des Autos (Räder und Lampen folgen der Fahrphysik).
- **Wie viel Verkehr** (`verkehr/vk_dichte.js`, rein, Unit-Tests): Tagesverkehr je Straße nach Klasse oder Nummer – A 73 etwa 16 000,
  B 89/B 4 6 000, Landesstraße 2 000–3 000 (L 1625 2 500), Kreisstraße 1 000, Stadtstraße 1 200, Dorfstraße 250, Wege 100, Zufahrten 30
  (Zählwerte der Straßenverkehrszählung für Straßen dieser Art in Südthüringen; ohne Zählstelle nach Klasse geschätzt); Tagesganglinien
  Mo–Do, Fr, Sa, So/Feiertag (Spitzen 7–8 und 16–17 Uhr, freitags früher und höher, samstags am Vormittag, sonntags am Nachmittag),
  Wochentags- und Monatsfaktor, die **Feiertage Thüringens** (Ostern nach dem Kalender, Weltkindertag, Reformationstag …) wie Sonntage.
  Lkw-Anteil nach Klasse (A 14 %, B 9 %, L 6 %, K 4 %) mit eigener Tageslinie, **sonntags und feiertags kein Lkw** (StVO § 30),
  Transporter 8–10 %, Traktoren tagsüber auf Land- und Dorfstraßen (in der Ernte mehr), der Müllwagen werktags vormittags im Ort.
- **Verkehr auf allen Straßen um den Beobachter** (`verkehr/vk_strom.js`, `VKSTROM`): die Straßen in 520 m (Telefon 380 m) – im Quadrat
  die Dorfstraßen, außerhalb die Fahrtdaten, an der Kante des Quadrats geschnitten – werden ein Netz; je Straße und Richtung so viele
  Fahrzeuge, wie gezählt (Fahrzeuge je Stunde × Länge ÷ Geschwindigkeit), zusammen höchstens 36 (Telefon 14), die Autos der Orte
  zählen mit. Ein Fahrzeug kommt dort, wo es fehlt, **außer Sicht**, mit dem Typ, den Straße und Stunde wahrscheinlich machen, und fährt
  seine eigene Route (an Kreuzungen eher geradeaus und auf die größere Straße, aus dem Ring hinaus – oder in eine Sackgasse, wo es parkt).
  Es geht, wenn es den Ring verlässt, angekommen ist oder zu viele für die Stunde da sind (das fernste ungesehene zuerst). Tempo nach
  Ortslage und Klasse (innerorts 50, außen 80–100, Autobahn 120), Lkw höchstens 80, Traktoren 40.
  - Abstand: jeder hält Abstand zum Vorausfahrenden und zu dessen Anhänger; ein Fahrzeug, das an einer Kreuzung den Weg kreuzt, hält
    einen auf (Vorfahrt nach Regeln und Ampeln kommen mit Stufe 2).
  - Aus, wo der Modus es will: in der Rückblende 1989 und in der Zombie-Nacht (`VERKEHR.autoOn(false)`).
- **Draufsicht** (Ebene „Verkehr“, `strategie/st_ebenen.js`): jedes Fahrzeug in seiner echten Größe und seinem Lack, der Anhänger dahinter,
  die Front erkennbar (beim Lkw das Fahrerhaus); von weit oben etwas größer als echt, damit man es noch sieht; Tooltip mit der Art.

## Stufe 2a: Vorfahrt, Haltlinien, Tempolimits nach Schild, Blinker (`verkehr/vk_regeln.js`, `VKREGELN`)

Falko (13.11. 12:14): „Sie sollen sich natürlich an Ampeln und Verkehrsregeln halten.“

- **Die Regel jeder Kreuzung** (rein, Unit-Tests): jede Zufahrt bekommt ihre Rolle – **Vorfahrt**, **Vorfahrt gewähren** (Zeichen 205 von
  `strassen/`; ohne Zeichen gibt die kleinere Straße Vorfahrt: Wege und Zufahrten den Straßen, Straßen den Land- und Kreisstraßen –
  StVO § 8, § 10), **Halt** (Zeichen 206: erst an der Linie halten), **Kreisverkehr** (205 + 215: der Ring hat Vorfahrt), **rechts vor
  links** (gleichrangige Straßen ohne Zeichen). Gehalten wird an der gemalten Warte- oder Haltlinie, sonst vor der breitesten anderen Straße.
- **Wen ein Fahrzeug abwartet:** wer schon in der Kreuzung ist; wer die höhere Rolle hat; von gleichem Rang der von rechts (nicht auf der
  Vorfahrtstraße); beim Linksabbiegen der Gegenverkehr, der geradeaus fährt oder rechts abbiegt (§ 9 (3)). Nur wer in den nächsten ~4 s
  ankommt (rechts vor links 3,5 s). Vier an einer Kreuzung, alle wartend: der am längsten wartet, fährt.
- **Wer mitzählt:** die Fahrzeuge des Flusses und der Orte (ihre Route kennt ihre Kreuzungen), dazu aus Lage und Richtung das Spielerauto,
  der Traktor, die Busse und Autos ohne Route – ihre Rolle nach der Zufahrt, aus der sie kommen.
- **Tempolimits nach Schild** (274, 274.1 Zone, 278 Ende) entlang der Route: ab dem Schild bis zum Ende-Schild, einem neuen Limit oder dem
  Abbiegen; die Kurven- und Bremsgeschwindigkeiten danach neu.
- **Blinker** vor jeder Abbiegung von mehr als ~25°: 45 m vor der Kreuzung bis 6 m danach (am Anhänger mit).
- Test `verkehr_real:regeln`: an der Einmündung östlich von Ratscher (Zeichen 205, Wartelinie) wartet das Auto der Straße an seiner Linie,
  bis das auf der Kreisstraße durch ist, nie beide zugleich in der Kreuzung, dann fährt es, links blinkend; an einer Kreuzung gleicher
  Straßen fährt der von rechts zuerst.

## Stufe 2b: Ampeln (`verkehr/vk_ampel.js`, `VKAMPEL`)

- **Die Ampeln von OpenStreetMap** in Schleusingen (Stand 13.11.2026; © OpenStreetMap-Mitwirkende, ODbL): die Kreuzungsampel (Knoten
  10789356, mit der Fußgängerampel 19 m daneben) und die Fußgängerampel (393862429, auf Anforderung). Dazu die eines Satzes von
  `strassen/`: `STRDAT.add(name, { …, ampeln: [['k' | 'f', x dm, y dm]] })` – so bekommt z. B. Suhl Masten, Phasen und haltende Autos.
- **Masten mit Köpfen** an jeder Zufahrt (rechts vor der Kreuzung, der Kopf zum Verkehr; Rot, Gelb, Grün mit Schute), an einer
  Fußgängerampel je Richtung einer und die Fußgängerköpfe quer zur Straße; gebaut, wenn der Beobachter auf 400 m herankommt, ein Netz für
  Masten und Gehäuse und eines je Gruppe und Farbe für die Lampen (eine Kreuzung 7 Zeichenaufrufe), Programme beim Laden übersetzt.
- **Phasen wie in Deutschland:** an der Kreuzung zwei Gruppen (die Hauptstraße und der Rest) in 50 s – Rot-Gelb 1 s vor Grün, Gelb
  3 s, alles Rot 2 s zwischen den Gruppen; jede Kreuzung ihr eigener Versatz. Die Fußgängerampel ist grün für die Autos, bis jemand
  drückt (im Mittel alle 70 s, oder der Spieler steht an der Furt), dann nach mindestens 20 s Grün: Gelb 3 s, Rot 12 s (Fußgänger
  grün dazwischen 8 s), Rot-Gelb 1 s.
- **Die Autos:** Rot und Rot-Gelb halten an der Linie, Gelb hält, wer es ohne starkes Bremsen schafft (3 m/s²); an einer Ampelkreuzung
  sind alle Zufahrten gleich, Linksabbieger warten auf den Gegenverkehr. Draufsicht: jede Ampel als Punkt in der Farbe der Hauptstraße,
  der Ring in der der Nebenstraße.
- Test `verkehr_real:ampel`: die Kreuzungsampel gebaut, die Gruppen wechseln sich ab, ein Auto auf Rot wartet an der Linie und fährt bei
  Grün; die Fußgängerampel schaltet auf Anforderung; die Draufsicht zeigt die Ampeln.

## Messungen (13.11.2026, SwiftShader im Chat-Rechner)

| | Wert |
|---|---|
| Worker: ferne Stufen aller 20 Typen | 2,4–2,7 s, Hauptprogramm ≤ 17 ms je Schritt |
| Speicher aller Typen, alle Stufen | 12,6 MB (die nahe Stufe nur für Typen in der Nähe) |
| Dreiecke je Stufe (Pkw) | nah 17–21 Tsd., mittel 10–12,6 Tsd., fern 1,9–2,3 Tsd. |
| Zeichenaufrufe | 1 je Fahrzeug (nah 2) + 2 für alle Schatten und Lichtkegel |
| Fr 16:30 am Rand von Ratscher | 6 Fahrzeuge von 5,9 gezählt; um 3 Uhr 1 von 0,9; So 11 Uhr 4, kein Lkw |

**Die Test-Rechner von GitHub** (Chrome 158 mit SwiftShader/Subzero, reine Software-Grafik) brauchen für das **erste Bild nach dem
Laden** mehrere Minuten: beim ersten Zeichnen werden dort alle Shader-Pipelines übersetzt, und V18b bringt zwei große neue mit (der Lack
mit Klarlack und das Glas der Fahrzeuge). Im Chat-Rechner mit demselben Chrome gemessen: erstes Bild `src` ohne Verkehr 142 s, mit V18b
387 s; alle weiteren Bilder gleich teuer (v16b auf `src` mit V18b: erstes Bild nach 300 s, danach 7–12 s je Bild wie vorher). Mit dem
älteren Chrome 141 kein Unterschied. Auf echten Grafikkarten kostet das Übersetzen Sekundenbruchteile und geschieht beim Laden. `v16b`
schreibt die blockierenden WebGL-Aufrufe des ersten Bilds ins Protokoll.

## Tests

- `viz3/test/unit/verkehr_real.test.mjs`: Maße aller Typen, Achsen, Lampenarten, Stufen, Tagesganglinien, Ostern und Feiertage,
  Raten, kein Lkw am Sonntag; Stufe 2: Rollen an Kreuzungen (größere Straße, Zeichen, rechts vor links, Kreisverkehr, Haltlinie), wen man
  abwartet (Zeitfenster, von rechts, Linksabbieger, besetzte Kreuzung, vier Wartende), Kreuzungen einer Route, Blinker, Tempolimits.
- `viz3/test/verkehr_real.py` (Abschnitte `bau,bild,nacht,lod,zug,strom,regeln,dichte,oben,perf`): Worker, Bilder in `out/verkehr_real/`,
  Lampen nachts, die drei Stufen, Sattelzug in der Kurve, die Zahl je Stunde, Draufsicht, Zeichenaufrufe, keine neuen Shader-Programme.
- Bilder ohne Browser: `node viz3/extra/verkehr-real/werkzeug/bild.mjs <typ> out/verkehr_real/<typ>.png --col '#…' [--col2 '#…'] [--zug]`.

## Was als Nächstes kommt (Plan, Stufen 3–4)

Überholen außerorts, Zusammenstöße mit harmlosen Folgen (alle Verkehrsteilnehmer fest, auch Busse, Räder, Fußgänger), Räder und
Fußgänger im Verkehr, Ampelphasen in der Draufsicht.
