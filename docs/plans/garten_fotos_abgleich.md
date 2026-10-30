# Garten Foto für Foto – Runde 3 (30.10.2026, Hilfs-Agent `garten-fotos`)

Auftrag: `docs/plans/auftraege/garten-fotos.md`. Falko (30.10. 0:12): „vieles auf den Fotos ist nicht integriert – bitte genauer hinschauen und
realistisch und sinnvoll integrieren“, 0:19: „Achte auf weitere fehlende oder bisher falsch dargestellte Details in Garten und Dorf – finde
Strategien, die aufzuklären anhand diverser Datenquellen.“ Gilt für **Bauphase 0** (der Garten von heute); ab Bauphase 1 bleibt der Plan.
Quellen und frühere Runden: `docs/plans/garten_dorf_abgleich.md`. Private Fotos, ihre GPS-Daten und Luftbild-Ausschnitte liegen nur im
Arbeitsordner des Chats – hier stehen nur abgeleitete Lagen und Maße.

## Vorgehen

1. **Modellbilder von jedem Foto-Standpunkt** auf GitHub Actions: `viz3/test/blickpunkte.py` mit `viz3/extra/garten-fotos/views.json`
   (nur Modellkoordinaten, Blickrichtung, Bildwinkel aus der Brennweite; Hochformat 576 × 768). Auf dem Chat-Rechner Foto | Modell
   nebeneinander gelegt (nicht im Repo).
2. **Standpunkte sind unsicher** – auch die bestätigten (`st: 'ok'`): Falko hat sie auf einer Karte gesetzt, auf der Bungalow, Hütte und
   Gewächshaus noch am alten Ort standen. Beispiel: 7227 („ok“ bei 7,2 / 10,5) liegt im Bungalow, den das Luftbild von 2024 dort zeigt;
   7237 sieht die Südwand des Bungalows, steht also südlicher als bestätigt. Deshalb: **Bündelausgleich nur aus Richtungen** – für jede
   Kante (Hausecken, Tisch, Schirm, Bank, PV-Modul) die Bildspalte abgelesen, daraus Richtung relativ zur Kamera (Lochkamera,
   f = Brennweite₃₅ · Bildbreite / 34,6 mm); gesucht Kamerastandpunkte und -richtungen (Vorwissen: „ok“ ±1,5 m/±8°, „neu“ ±4 m/±25°) und die
   Lage der Gebäude als Rechtecke. Fest: der Bungalow (Dach im DOP 2024). 19 Fotos, ~130 Richtungen, Restfehler meist 1–2°.
3. **Luftbild DOP 2024** (`tools/geo/dop_th.py`): helles Dach 2,4 × 2,3 m bei (6,2…8,6 / −3,5…−5,8) – Glasdach mit Sprossen, also das
   Gewächshaus (die gelbe Hütte stand 2024 noch nicht); weißes Dach (−0,5…3,3 / −1,6…2,0) bei der alten Blechgarage.
4. Ergebnis gegen Modellbilder auf GitHub geprüft (Lauf mit den Tests `garten`, `einrichtung`, `v16d:trailer,bridge,load`).

## Ergebnis Lage

| Was | Modell vorher | Ausgleich (Varianten) | DOP 2024 | jetzt |
|---|---|---|---|---|
| Gelbe Hütte (Mitte) | (11,6 / −3,4), Kurs 96° | (6,3…7,4 / −7,8…−8,7), ~2,8 × 2,2 m, Kurs 107–113° | – (2024 noch nicht da) | **(6,8 / −8,2), Kurs 106°** (Größe 3,0 × 3,6 m bleibt: das Atelier innen ist dafür gebaut) |
| Gewächshaus (Mitte) | (12,4 / −0,1), Tür nach Norden | (8,2…8,9 / −3,3…−4,2) | (7,4 / −4,6) | **(8,2 / −4,0)**, Giebel mit Tür nach Norden (Kurs 16°) |
| Alte Blechgarage | 4 × 4 m auf (0…4 / 0…4) | (2,0…2,7 / −0,8…−1,5), **~2,5 × 2,8 m** | weißes Dach (−0,5…3,3 / −1,6…2,0) | unverändert – Frage an Falko (unten) |
| Weiße Bank | – | (9,7…10,3 / −0,7…−1,7) | – | (9,6 / −1,1), längs Nord–Süd, Blick nach Westen |
| Tisch, Schirm vor dem Waschhaus | Schirm nordwestlich vom Tisch | Schirm südwestlich vom Tisch | – | Schirm südwestlich |

## Foto für Foto

„ok“ = Standpunkt von Falko bestätigt, „neu“ = grob (GPS, ±3–6 m, ±10–40°). Ein „neu“-Foto zählt nur, wenn seine Richtung zu einem bekannten
Gegenstand im Bild passt.

| Foto | st | Was abweicht | Was getan / warum nicht |
|---|---|---|---|
| 7176 | neu | Zaun am Feldweg: Maschendraht an Betonpfosten, Tor aus zwei rostigen Rahmen (hier zu); großer Baum links (östlich) am Tor; Modell: Hecke mit Lücke, Asphaltbrücke | Zaun, Tor, Baum am Tor (Bauphase 0) |
| 7177–7180, 7182–7185 | neu | Feldweg, Auto, Acker – Richtungen passen zu nichts Sicherem im Garten | nicht verwendet |
| 7181 | ok | Acker nördlich des Wegs, Waldrand | passt |
| 7186, 7187 | neu | Bretterstapel unter Plane am Weg ✓; hohe, dünne Bäume am Bach dahinter; Huberts Hofeinfahrt mit großem Baum (östlich, = Baum 6) | zwei schlanke Bäume hinter dem Stapel; Baum 5 vom Weg an den Bach |
| 7188, 7189 | neu | Stämme am Weg ✓ | – |
| 7190–7192 | neu | Huberts Hof: großer Baum über dem Bretterstapel im roten Rahmen östlich des Tors (Baum 6 ✓), buschiger gelber Baum am Nordwestrand; der Hof frei – die alten Bäume 0–4 standen auf dem Hof und auf dem Weg von Huberts Traktor | Bäume 0–4 woandershin (s. u.), Hof und Traktorweg frei; der gelbe Baum am Nordwestrand nicht gesetzt: beide Fotos sehen ihn aus fast derselben Richtung, seine Lage bleibt offen (dort steht im Luftbild auch das rote Gebäude jenseits des Wegs) |
| 7193–7196 | ok | an Huberts Tor und Gasse – die bestätigten Standpunkte liegen 8–13 m östlich/nördlich des Modell-Tors | Sache von `hubert-hof` (dort vermerkt) |
| 7197, 7198 | neu | Torplatte (bemoost) über einem Durchlass; Betonpfosten mit Strebe, rostige Torflügel; Trittsteine im Rasen; Modell: Asphaltbrücke, Kiesweg | Durchlass, Zaun, Tor, Trittsteine, keine Kieswege (Bauphase 0) |
| 7199, 7200 | neu | Bach im schmalen Graben, unter der Platte durch ein Rohr; Stück Maschendraht quer über den Bach westlich vom Tor; mehrstämmiger Baum am Bach; großer Baum östlich am Tor | Rohr mit Stirnwänden, Maschendraht über dem Bach, beide Bäume. Grabentiefe/-breite: Falko fragen (nicht geändert) |
| 7201 | neu | vom Tor nach Süden: Trittsteine statt Kiesweg | Trittsteine (Bauphase 0) |
| 7202, 7203, 7208, 7211 | neu | Richtung unsicher | nicht verwendet |
| 7204–7207 | neu | Plattenterrasse, Bank, Laterne, Stuhl ✓ (V17c); grüner Pflanztisch mit weißem Becken am Bach östlich der Terrasse fehlte; buschige Weide über der Bank | Pflanztisch, Weide (Baum 0) |
| 7209, 7221, 7228, 7229 | ok/neu | Carport mit Wohnwagen ✓; das Dach auf den Fotos ist ein Pultdach aus Wellblech mit Kopfbändern an den Pfosten; grüner Plastikstuhl am Wohnwagen | nicht geändert (klein; Liste für die nächste Runde) |
| 7210, 7212–7220 | neu | Bungalow von Norden/Nordwesten ✓, dichte Büsche am Bach ✓; 7216–7219 sehen von Osten die Rohrmündung unter der Torplatte und den großen Baum darüber; ein frisch gepflanztes Bäumchen mit gelben Blättern nördlich vom Bungalow am Ostzaun (7212–7214) | Durchlass und Baum am Tor (s. o.); Bäumchen |
| 7222–7225 | ok/neu | Bungalow mit Schleppdach und Gerümpel ✓ (V17d); keine blaue Regentonne an der Ecke | nicht geändert (Bungalow ist Sache des Kern-Chats gewesen; Kleinigkeit) |
| 7226, 7227 | neu/ok | 7227 „ok“ liegt im Bungalow (s. o.); Blechgarage, Gewächshaus, Hütte von Nordosten: Hütte und Gewächshaus südlich davon, nicht am Ostzaun | Hütte, Gewächshaus versetzt |
| 7230, 7231 | ok | ausgebrannte Feuerstelle mit Bretterresten ~2 m vor beiden Standpunkten; Modell: Reisighaufen 3,5 m weiter südwestlich | Feuerstelle bei (−0,4 / 10,2), flach, verkohlt |
| 7231, 7235, 7236 | ok/neu | Blechgarage: ein Gerätehaus aus Blech, ~2,5 × 2,8 m, Schiebetüren nach Norden; Modell 4 × 4 m | **nicht geändert** – Garage, Platte und Pavillonplan hängen daran (Frage an Falko) |
| 7232–7234, 7247 | ok/neu | Blick nach Westen auf Huberts Werkhof ✓ | – |
| 7237 | ok | Bungalow, Erle, bemalte Front mit Tisch und Schirm, weiße Bank, Gewächshaus, Blechgarage: Gewächshaus und Bank weiter südlich; Schirm rechts vom Tisch; Kiesweg gibt es nicht | Gewächshaus, Bank, Schirm, keine Kieswege |
| 7238, 7239 | neu | Wäschestange ✓, bemalte Front, Gewächshaus und Hütte nahe beieinander südlich davon | Lage übernommen |
| 7240–7243 | neu/ok | Hütte von Norden: offene Tür, Stehleiter, OSB-Platte an der Ecke, Bretter und Wellblech auf dem Dach; Gewächshaus davor mit Milchglas; weißer Kunststoffliegestuhl, weiße Bank | Leiter, OSB-Platte, Dachreste, Liegestuhl, Bank (Tür bleibt: Atelier und Tests) |
| 7244–7246 | neu/ok | von Südwesten: Blechgarage, Bungalow, Tisch, Schirm, Bank, Gewächshaus | Lage übernommen |
| 7248–7253 | ok/neu | frisch gepflanzte Bäumchen in umgegrabenen Flecken (eins mit dunklen Beeren, ein junger Apfel), zwei leere Flecken; gemähte Spur | drei Bäumchen, zwei Flecken (ohne Kollision: der Traktorweg führt nah vorbei) |
| 7254–7259 | neu/ok | junger Baum mit roten Herbstblättern; Hütte 7–9 m östlich der Standpunkte: Südseite unten rohe Bretter, Westseite weißes Dreifachfenster, PV-Modul flach im Gras westlich davor | Hütte versetzt, Bretter, PV flach (Bauphase 0), Bäumchen |
| 7260–7263, 7265 | neu | Ostzaun (Maschendraht, Holzpfosten) ✓; großer Kirschbaum Mitte Süd | Kirschbaum (s. 7297) |
| 7264, 7266–7269 | neu | alte Obstbäume; 7268 zeigt bei (0,5 / −22,5) eher einen jungen, schmalen Baum als den breiten Apfelbaum des Modells | nicht geändert (Standpunkte zu unsicher) – Falko fragen |
| 7270–7285, 7289–7295 | neu | Werkstatt-Unterstand, Plane über Brettern, Schubkarre, Aggregat, Kompost, Ziegen bei Ronald | Werkstatt ist von `werkstatt-heute` gemacht; nichts geändert |
| 7296 | neu | Maschendraht an Ronalds Weide ✓ | – |
| 7297–7303 | neu | großer Kirschbaum; die Nahaufnahmen von vier Seiten treffen sich bei (7,4 / −32,7), nicht am Unterstand (2 / −35,8) | Kirschbaum dorthin (wie vorher nur bis Bauphase 1) |
| 7304 | neu | Hütte innen (Dachluke, Fenster) – heute leer, mit Leiter und Kübeln | nicht geändert (innen ist das Atelier) |

## Was geändert ist (Bauphase 0, sonst wie vorher)

- `viz3/site.js`/`site.json` `bld`: Hütte (6,8 / −8,2), Kurs 106°; Gewächshaus (8,2 / −4,0), Kurs 16° (die Drehung in `garden/greenhouse.js`
  greift nur noch bei alten Daten mit Kurs 96°). Ort „Holzhaus“ (`game/player.js`) vor der Tür. Die Kieswege des Plans (`garden/env.js`
  `PATHS`) führen zu den versetzten Türen.
- `trees`: 0 die buschige Weide an der Westseite der Terrasse über der grünen Bank (7205, 7207; neue Art `willow`, Buschform in
  `garden/trees.js`), 1 der große Baum am Tor (östlich der Pfosten, 7176, 7198, 7200), 2 und 4 hohe schlanke Bäume am Bach hinter dem
  Bretterstapel (7186, 7187), 3 ein mehrstämmiger Baum am Bach westlich vom Tor (7199, 7204); 5 (ein gemessener Baum, der auf dem Feldweg
  stand) an den Bach neben dem Stapel. Die alten Bäume 0–4 standen auf Huberts Hof und auf dem Weg seines Traktors aus der Gasse (`npc/npc.js`
  `DRIVE_ROUTE`) – der große Baum östlich von Huberts Tor über dem rot gerahmten Stapel ist Baum 6 (unverändert). Der große Kirschbaum
  (7,4 / −32,7). Bäume mit Art (`[4]`, nach Fotos gesetzt) rückt `garden/stream_geo.js` nicht mehr aus dem Graben.
- `garden/env.js`: in Bauphase 0 keine Kieswege (`uNoPath` im Bodenshader; die Masken für Gras und Schritte bleiben, damit die Zufallsfolge beim
  Laden gleich bleibt).
- `garden/stream.js`: in Bauphase 0 ist die Torplatte alter Beton über einem Durchlass (Stirnwände mit dem Rohr, darunter verfüllt –
  Kollision); die Asphaltbrücke ab Bauphase 1. `STREAM.BR`, Lauf- und Fahrfläche unverändert.
- `garden/garten_heute.js`: Zaun am Feldweg (Bauphase 0) mit Doppeltor (offen, an den Zaun geklappt), Maschendraht quer über den Bach,
  Trittsteine; Pflanztisch am Bach, weiße Bank (zum Sitzen, `GSEATS` „weisse-bank“), weißer Liegestuhl, runder weißer Wassertank,
  vier Bäumchen mit Pflanzflecken (drei westlich der Hütte, eins nördlich vom Bungalow),
  Feuerstelle statt Reisighaufen, Schirm südwestlich vom Tisch.
- `garden/carport.js`: Tisch mit Klappstühlen an der Südostecke ab Bauphase 1 (7228, 7229 zeigen dort keinen); `garden/bungalow.js`: Bank an
  der Haustür und Regentonne ab Bauphase 1 (7222, 7224, 7225), das Planenbündel unter dem Schleppdach grauweiß statt blau.
- `garden/holzhaus.js`: Hütte von heute (Bauphase 0) – rohe Bretter unten an der Südwand, Stehleiter, OSB-Platte, Dachreste, PV-Modul flach im
  Gras westlich; Regentonne, Schlauchtrommel, Schubkarre, Geranien und das PV-Gestell südlich der Hütte ab Bauphase 1.
- `garden/fences.js`: `FENCE_MAT` exportiert (Maschendraht ohne neues Programm).
- Tests: `viz3/test/garten.py` prüft den Kurs des Gewächshauses (±30° um Nord) und das PV-Modul gegen die Fahrt von `v16d:bridge` in Bauphase 0;
  `viz3/test/run.py` erlaubt Pfade als Testargument (Name der Logdatei).

## Was die Fotos nicht klären – Fragen an Falko

1. **Blechgarage:** Auf den Fotos ein Gerätehaus aus Blech, etwa 2,5 × 2,8 m, etwa 2 m südlicher als die Platte im Modell (4 × 4 m). Wie groß
   ist sie wirklich, und steht sie auf der Platte, auf der der Pavillon gebaut werden soll?
2. **Hütte:** Auf den Fotos etwa 2,8 × 2,3 m, im Modell 3,0 × 3,6 m (das Atelier innen ist dafür gebaut). Maße?
3. **Apfelbaum bei (0,5 / −22,5):** Foto 7268 zeigt dort eher einen jungen, schmalen Baum; der alte Obstbaum auf 7266 steht weiter westlich.
4. **Bach:** Tiefe und Breite (die Fotos zeigen ihn schmal, ~0,6–0,8 m tief) – schon gefragt, nicht geändert.
5. **Tor am Feldweg:** auf den Fotos ein Flügel offen, einer zu; im Modell beide offen (der Traktor mit Anhänger fährt hindurch).

## Bilder neu machen

`viz3/extra/garten-fotos/views.json` (Foto-Nummern als Namen, nur Modellkoordinaten) und `tests.txt` (`blickpunkte:…`): jeder Push auf
`feat/garten-fotos` rendert sie auf GitHub; `gh run download <run> -R mynametouse/pavillon-ratscher -n out -D <ordner>`, dann im Arbeitsordner
neben die Fotos legen. Den Bündelausgleich (Python, scipy) und die Ablesungen hat der Chat im Arbeitsordner (`gfotos/ba2.py`, `obs2.json`).
