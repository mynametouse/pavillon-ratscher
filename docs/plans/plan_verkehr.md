# Plan: Verkehr realistisch (Fahrzeuge, Dichte, Regeln, Unfälle, Draufsicht)

Stand: 13.11.2026, 12:40 · Straßen-Chat (session_01WqScFDtq8GSy4n7wU7foJx). Falkos Wunsch vom 13.11., 12:14:

> „Aktuell fahren noch sehr wenig und sehr wenige Autos auf den Straßen und die Autos sehen noch sehr künstlich bzw. eckig und schemenartig
> aus. Bitte möglichst realistische Modelle wählen und den Verkehr, die Verkehrsdichte typisch gestalten. Achte auch darauf, dass die Busse
> beim Lenken und Fahren genauso wie die anderen Fahrzeuge auch, die verschiedenen Fahrzeugmodelle, genauso wie auch Fahrräder, Fußgänger und
> so weiter, nicht durchfahrbar sind, sondern tatsächlich auch Unfälle bauen, wenn man gegen sie fährt. Sie sollen sich natürlich an Ampeln
> und Verkehrsregeln halten. … Die Verkehrsdichte soll realistisch nach Wochentag und Uhrzeit sein. Bitte macht dafür erstmal einen Plan.
> Und natürlich muss man den Verkehr auch von oben sehen können. Also in der Draufsicht.“

## 1. Was es heute gibt (nachgesehen im Code, V17y)

| Bereich | Heute | Wo |
|---|---|---|
| Wo Verkehr ist | nur in **zwei Orten** (Ratscher um den Anger, Schleusingen um den Markt), je ein paar Autos; auf Landstraßen **ein** entgegenkommendes Auto alle 30–75 s, nur während man selbst fährt | `verkehr/verkehr.js` (Tabelle `day`: 0,1–1,5 Autos je Ort und Stunde) |
| Fahrzeuge | **ein** Modell für alle: ein Kombi in Logan-Größe aus Kästen mit Vertexfarben, ohne Marke | `verkehr/verkehr_auto.js` |
| Busse | nach echtem Fahrplan (gtfs.de) auf ihren Wegen, eigenes Modell | `bus/` |
| Fahrräder, Lkw, Traktoren, Transporter, Motorräder | gibt es im Verkehr nicht (Traktor nur Huberts) | – |
| Verhalten | fährt eine Linie mit Tempo nach Kurve und Weg, hält Abstand, hält für die Figur, hupt | `verkehr_auto.js`, `verkehr_netz.js` |
| Ampeln, Vorfahrt, Tempolimits nach Schild | keine; die Schilder von Paket 1 stehen, werden aber nicht befolgt | `strassen/` (Daten: 350 Schilder) |
| Zusammenstöße | Autos und Busse sind ein **fester Kasten** für das Auto des Spielers (`VEH.extra`) – das Spielerauto prallt ab, das andere Fahrzeug reagiert nicht; Fußgänger werden nur weggeschoben | `verkehr_auto.js`, `bus/bus.js` |
| Draufsicht | Ebene „Verkehr“: Autos und Busse als graue Rechtecke bis 2,5 km Höhe | `strategie/st_ebenen.js` |
| Erkennbare echte Typen | gibt es schon im **Grenzland-Modus** (1989: Trabant, Wartburg, Barkas, W 50 …) – ein Karosseriebauer, der Typen in echten Maßen aus Querschnitten formt, ohne Embleme | `grenzland/gl_karosse.js`, `gl_typen.js` |

## 2. Ziel

Auf jeder Straße um den Beobachter so viel Verkehr, wie dort zu dieser Stunde an diesem Wochentag typisch ist; die Fahrzeuge sehen aus wie
die, die heute in Südthüringen fahren (Typen erkennbar, ohne Logos); alle halten sich an Schilder, Vorfahrt und Ampeln; jeder
Verkehrsteilnehmer ist fest, Zusammenstöße haben Folgen; in der Draufsicht sieht man alles.

## 3. Bausteine

### A Fahrzeuge, die wie echte aussehen (größter sichtbarer Gewinn)
- **Weg:** den Karosseriebauer des Grenzland-Modus (`GLKAROSSE`) für **heutige Typen** nutzen – echte Maße (Länge, Breite, Höhe, Radstand,
  Spur), Form aus Querschnitten, Glas, Lampen, Felgen, Spiegel; **ohne Embleme und Schriftzüge**, Kennzeichen ohne echte Nummern. Vorteil:
  freie Lizenz, ein Shader, drei Detailstufen (nah voll, mittel vereinfacht, fern ein Kasten mit Farbe), klein im Download.
- **Flotte nach dem Bestand** (Kraftfahrt-Bundesamt, Zulassungen im Landkreis Hildburghausen und in Suhl – beim Bau nachgeschlagen):
  etwa 12 Pkw-Typen (die häufigsten Kompakt-, Klein- und Kombimodelle, ein SUV, ein Elektroauto), 3 Transporter, Paketwagen, 2 Lkw
  (Sattelzug, Verteiler), Traktor mit Anhänger, Müllwagen, Linienbus und Überlandbus, Motorrad, Fahrrad und E-Bike; Farben nach Statistik
  (grau, schwarz, weiß, silber vorn).
- **Alternative B** (auf Wunsch, nur für einzelne Fahrzeuge): fertige 3D-Modelle mit freier Lizenz (CC BY/CC0) – realistischer im
  Einzelfall, aber Lizenz und Markenrechte je Modell prüfen, größer, weniger einheitlich. Empfehlung: A.

### B Dichte nach Wochentag und Uhrzeit
- **Menge je Straße:** Verkehrszählungen des Landes (Verkehrsmengenkarte Thüringen, Zählstellen der Bundesanstalt für Straßenwesen an
  A 73 und Bundesstraßen) → Fahrzeuge pro Tag je Straßenabschnitt; wo keine Zählung ist, nach Straßenklasse geschätzt (Gemeindestraße im
  Dorf wenig, Kreisstraße mittel, L 1625 mehr).
- **Verlauf:** Standard-Tagesganglinien (Spitze 7–8 und 16–17 Uhr, nachts fast leer), Wochentagsfaktoren (Freitag Nachmittag am meisten,
  Samstag weniger, Sonntag am wenigsten, Ferien etwas weniger), Anteil Schwerverkehr je Straße; die Spieluhr und der Kalender steuern.
- **Erzeugt wird** auf allen Straßen um den Beobachter (nicht nur in zwei Orten), außer Sicht an den Rändern, bis zu einem Budget
  (Rechner etwa 40 Fahrzeuge in Bewegung, Telefon 15; dahinter nur in der Draufsicht als Fluss).

### C Regeln
- Tempolimits nach Schild (Daten aus Paket 1) und Ortslage (50 innerorts, 100 außerorts), langsamer in Kurven und bei Nässe.
- Vorfahrt: rechts vor links in Wohnstraßen, Vorfahrtstraßen und „Vorfahrt gewähren“/Stopp nach den Schildern, Kreisverkehr, Halt an
  Haltlinien; Abbiegen mit Blinker; Überholen außerorts nur, wo die Linie unterbrochen und frei ist.
- **Ampeln:** nach OpenStreetMap (in der Region drei Fußgängerampeln, in Suhl viele) mit echten Phasen; Fußgänger warten und queren an
  Zebrastreifen und Ampeln.
- Busse halten an Haltestellen und fahren nach Fahrplan, Traktoren und Räder langsam (Überholen mit Abstand).
- Technik: ein Folgemodell (Abstand und Bremsen wie ein Mensch), Lückenwahl an Kreuzungen; alles auf dem vorhandenen Straßennetz.

### D Fest und mit Unfällen
- **Jeder Verkehrsteilnehmer ist fest:** Autos, Busse, Lkw, Traktoren, Räder, Fußgänger – für das Spielerauto und für die Figur.
- **Zusammenstoß mit Folgen:** beide Fahrzeuge bekommen einen Stoß nach Masse und Geschwindigkeit (der Bus schiebt den Kleinwagen, nicht
  umgekehrt), bleiben stehen, Warnblinker, der Fahrer steigt aus und schimpft; Räder und Fußgänger stürzen (ohne Blut) und stehen wieder
  auf. Ab einer Geschwindigkeit eine Delle und ein Riss in der Scheibe (Textur, kein neues Modell). Im Dorf spricht sich das herum
  (Meinung über den Spieler) – im Grenzland-Modus gelten dessen eigene Folgen.
- Die Verkehrsteilnehmer weichen einander aus und bauen untereinander keine Unfälle (nur der Spieler kann Unfälle verursachen).

### E Draufsicht
- Ebene „Verkehr“: jedes Fahrzeug als kleine Form nach Typ (Pkw, Transporter, Lkw, Bus, Traktor, Rad, Fußgänger) in seiner Farbe,
  Ampeln mit ihrer Phase, Unfälle markiert; weiter oben die Dichte als farbiges Band auf den Straßen (wie ein Verkehrslagebild).

### F Flüssig bleiben
- Ein Shader für alle Fahrzeuge, gebündelte Modelle je Typ und Detailstufe, kein neues Shader-Programm während des Spiels; Budget
  nach Gerät; Messung je Stufe (Zeichenaufrufe, ms je Bild) wie in Paket 1.

## 4. Reihenfolge (Vorschlag)

1. **Fahrzeuge (A) und Dichte (B)** – sofort sichtbar: mehr und echt aussehender Verkehr auf allen Straßen, Draufsicht dazu (E, Teil 1).
2. **Regeln (C)** – Schilder, Vorfahrt, Kreisverkehr, Ampeln, Busse.
3. **Unfälle (D)** – fest für alle, Folgen.
4. **Räder und Fußgänger im Verkehr**, Draufsicht vollständig (E).

Jede Stufe einzeln getestet (eigene Tests: Anzahl je Stunde und Wochentag, Regeln an Kreuzungen, Zusammenstöße, keine neuen Shader,
Bildzeit) und live.

## 5. Wer (Abstimmung in `docs/PARALLEL.md`)

- Straßen-Chat: Gesamtplan, Dichte, Regeln, Ampeln, Unfälle, Draufsicht (`verkehr/`, Daten der Straßen aus Paket 1).
- Grenzland-Chat: der Karosseriebauer (`gl_karosse.js`) – heutige Typen bauen wir mit ihm, ohne seinen Modus zu berühren.
- Suhl-Chat und Was-wäre-wenn-Chat: Busse (`bus/`), Verkehr in Suhl über dieselben Schnittstellen.

## 6. Entscheidungen (Falko, 13.11.2026 ~12:45, angeklickt)

- **Modelle:** nach echten Maßen bauen, ohne Logos (A).
- **Unfallfolgen:** harmlos.
- **Dichte:** wie echt gezählt.

Die Fragen dazu waren:

1. Fahrzeugmodelle: **A** gebaut nach echten Maßen ohne Logos (empfohlen) oder **B** fertige Modelle mit freier Lizenz.
2. Folgen eines Unfalls im normalen Spiel: harmlos (Stoß, Stillstand, Fahrer schimpft, Ruf im Dorf) – oder mehr (Polizei, Kosten)?
3. Wie voll: echte Zählwerte (auf Dorfstraßen nachts fast niemand) – oder etwas belebter als echt?
