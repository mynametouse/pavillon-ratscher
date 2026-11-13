# Grenzland, Runde 2: Figuren – Menschen, die sich wie Menschen bewegen

Hilfs-Agent `figuren` des Grenzland-Chats (13.11.2026, Paket B „Kino-Gefühl“). Auftrag: `docs/plans/auftraege/grenzland2-figuren.md`.
Dateien: `viz3/src/grenzland/gl_fig.js` (die Schnittstelle `GLFIG`), neu `viz3/src/grenzland/gl_pose.js` (die Haltungen `GLPOSE`),
`viz3/test/grenzland_figuren.py`, `viz3/extra/grenzland-figuren/tests.txt`, eine Zeile in `viz3/src/modules.txt` (vor `gl_fig.js`).

## Was es gibt

- **Auf dem Moped sitzen wie ein Fahrer** – der Spieler (die Figur des Grundspiels auf der Simson, Ansicht von außen) und jede Figur,
  die reitet (`F.reitet` aus `gl_mission.js`, oder `GLFIG.reite(F, moped)`): Hüfte auf der Sitzbank, Oberschenkel nach vorn und unten,
  Knie gebeugt, Fußballen auf den Rasten (Schwalbe: auf den Trittbrettern), Arme nach vorn, Hände um die Griffe (sie drehen mit dem
  Lenker), so weit nach vorn gebeugt, dass die Ellbogen leicht gebeugt bleiben, Kopf oben zur Straße. Die Figur neigt sich mit dem Moped
  in die Kurve. Steht das Moped (unter 0,7 m/s), kommt der linke Fuß auf den Boden – angehoben auf dem Weg dorthin.
- **Am Steuer des Trabant** (1989, Ansicht von außen): auf dem Fahrersitz des Wagens dieses Bildes, die Hände auf zehn vor zwei am
  Lenkrad; sie gehen ein Stück mit dem Lenkrad mit wie die Hände der Fahreransicht.
- **Rennen**: `GLFIG.go(F, x, y, { renn: true })` – nach einem kurzen Antritt (5,5 m/s²) 4,6 m/s, dazu der Sprint aus dem
  Bewegungssatz der Spielerfiguren über den Gehschritt gelegt (die Schrittlänge passt zur Beinlänge). Ein Tempo über 2,6 m/s läuft auch
  mit der alten Form `go(F, pts, v)` als Rennen – so rennen die Polizisten zu Fuß aus `gl_fahndung.js` schon jetzt.
- **Gesten** (`GLFIG.geste(F, art, o)`), weich ein- und ausgeblendet (¼ s): `zeigen` (auf `o.ziel`, der Blick geht mit, Zeigefinger
  gestreckt), `nicken`, `kopf` (Kopfschütteln), `achsel` (Schultern hoch, Handflächen nach oben), `arme` (verschränkt, gehalten),
  `winken`, `telefon` (Handy am Ohr, gehalten), `filmen` (Handy mit beiden Händen vor der Brust, gehalten), `haende` (Hände hoch,
  gehalten), `abwinken`. Das Handy ist ein kleines dunkles Kästchen mit leuchtendem Bildschirm in der rechten Hand (Bildschirm zur
  Handfläche – beim Telefonieren zum Ohr, beim Filmen zum Filmenden).
- **Blick** (`GLFIG.blick(F, …)`): Brust, Hals und Kopf drehen zum Ziel – höchstens 1,35 rad zur Seite, etwas nach oben und unten –,
  weich nachgeführt; ein Ziel kann ein Punkt, eine andere Figur (ihr Kopf, mitverfolgt) oder `'spieler'` sein.
- **Sitzen** (`GLFIG.sitz(F, x, y, hd, z)`, `GLFIG.steh(F)`): Hüftgelenk 10 cm über die Sitzhöhe `z` über dem Boden, Fußballen auf den
  Boden vor dem Sitz (über 0,62 m: auf die Stange eines Barhockers), Hände auf die Oberschenkel. Wer sitzt und redet, gestikuliert
  rechts mit der Sitzhaltung des Grundspiels. `GLFIG.platz(x, y, r)` findet den nächsten freien Sitz auf den Bänken des Dorfes (der
  Ring um die Dorflinde, die Bänke am Anger).
- **Taschenlampe hochhalten**: wer eine Lampe trägt (`F.lampe = true`, gesetzt von kino; oder was `GLLICHT.hatLampe(F)` sagt, falls
  `gl_licht.js` das anbietet), hält sie vor der Brust, Faust geschlossen – `gl_licht.js` setzt den Lichtkegel an die Hand, er kommt so
  aus Brusthöhe statt von der herabhängenden Hand. Hält die rechte Hand ein Ding (`F.ding`), nimmt die linke die Lampe.
- **Reden mit Händen**: wer redet (`GLFIG.talking(F, true)`) und steht, hebt ab und zu eine freie Hand und dreht sie, der Kopf nickt
  leicht mit – über dem Rede-Clip des Grundspiels.

## Wie es gemacht ist (Entscheidungen)

- **Keine Grunddatei angefasst.** Alles wird nach den Clips des Bildes Knochen für Knochen aufgesetzt: ein Zwei-Knochen-IK für Arme
  und Beine (Lage des Mittelgelenks über eine Pol-Richtung), Drehungen im eigenen Rahmen der Figur, Hand-Ausrichtung über zwei Achsen
  (Fingerrichtung, Handrücken), Finger gekrümmt um die Griffe. Jede Drehung merkt sich den Zustand davor (wie `boneTurn` in
  `npc/npc_real.js`) und wird vor dem nächsten Clip-Schritt zurückgesetzt – der Mixer schreibt einen Knochen nur, wenn sich sein Wert
  ändert, sonst summierten sich die Drehungen.
- **Reihenfolge**: Die Spielerfigur (`game/avatar.js`) stellt sich als später KERN-Takt auf – vor den Fahrzeugen, die noch in
  `window.TICKS` fahren. Sie säße also ein Bild hinter dem Moped (bei 60 km/h fast 30 cm). Deshalb sitzt das Reiten in `VEH.after`
  (gleich nach der Physik der Fahrzeuge, vor Kamera und Bild) und setzt die Figur auf das Moped dieses Bildes. Für die Figuren von
  `GLFIG` wird vor `rbPerson.anim` zurückgesetzt (`GLPOSE.back`) und danach aufgesetzt (`GLPOSE.nach`).
- **Knochen**: beide Skelette (die Spielerfiguren und die Figuren des Modus) sind Rocketbox/3ds-Max-Biped; `core/rig.js` gibt
  ihnen kanonische Namen (`Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`, `LeftShoulder`, `LeftArm`, `LeftForeArm`, `LeftHand`,
  `LeftHandIndex1…3`, `LeftHandMiddle1…`, `LeftHandThumb1…`, `LeftUpLeg`, `LeftLeg`, `LeftFoot`, `LeftToeBase` und rechts). Gemessen
  wird einmal je Figur im Bindungs-Pose: wohin das Gesicht im eigenen Rahmen des Kopfknochens zeigt, wie der Fuß vom Knöchel zum Ballen
  liegt (Winkel und Länge).
- **Moped-Maße** aus `gl_zweirad.js`: Hüftgelenk S 51 bei [0, −0,38, 0,885] (Sitzbank oben 0,79–0,80), Fußballen auf der Raste
  [±0,205, −0,07, 0,335], Handgelenk hinter dem Griff relativ zum Lenkkopf [±0,262, −0,116, 0,132] (dort sitzen auch die Hände der
  Fahreransicht); Schwalbe: Hüfte [0, −0,36, 0,905], Füße auf den Trittbrettern, Griffe [±0,25, −0,12, 0,19].
- **Kein neues Shader-Programm**: das Handy nimmt das Material der Straßenleute (`VFIG.mat()`), der Bildschirm eine Kopie davon mit
  eigenem Leuchten. Geprüft im Test (169 → 169 Programme).
- **Fern ab**: weiter als 70 m von der Kamera stellt `rbPerson` keine Pose mehr – die Aufsätze auch nicht.
- **`place()` heißt jetzt stehen**: wer gesetzt wird, steht (vorher blieb eine sitzende Figur nach einem neuen `place` im Sitzen).
  `gl_mission.js` setzt nach `place` selbst wieder `F.sitzt` – das funktioniert weiter.

## Getestet

Stand 13:36: lokal 42/42 (`grenzland_figuren`, alle Teile), auf GitHub Actions grün (Lauf 43424172075 auf 2c18ef10: smoke, beide
Teile des Tests – 17 und 26 Prüfungen).


`viz3/test/grenzland_figuren.py` (eine Seite, freies Spiel in Ratscher; Teile `moped,reiter,rennen,sitzen,gesten,blick`), Bilder in
`out/grenzland_figuren/`: Spieler auf der Simson von links/vorn im Stand (linker Fuß unten), in Fahrt von links und rechts, in der
Kurve von hinten und vorn; Reiter auf S 51 (`GLFIG.reite`) und Schwalbe (`F.reitet` wie `gl_mission.js`); Rennen von der Seite und von
vorn; Gerhard auf einer Bank der Dorflinde (auch redend), ein Barhocker; ein Kontaktbogen aller Gesten (`7_gesten.jpg`); der Blick.
Dazu Sarah auf der Simson (kleiner: sie rutscht 3 cm nach vorn), der Trabant von außen (Hände am Lenkrad, auch beim Lenken), eine
redende Figur, eine Figur mit Taschenlampe. Geprüft: Hüfthöhe auf der Sitzbank, Fußballen an den Rasten (unter 6–8 cm), Handgelenke an den Griffen (unter 6 cm), Lehnen mit dem
Moped, Rennen ≥ 3,5 m/s, Sitzhöhe und Füße am Boden, jede Geste läuft, das Handy kommt und geht, der Kopf dreht zum Ziel (von 1,25 auf
0,03 rad), keine Seitenfehler, keine neuen Shader-Programme.

## Für den Lead

Die Schnittstelle (alle Aufrufe sind sicher, wenn die Figur fehlt; Koordinaten wie überall im Modus: x Ost, y Nord, z Höhe in Metern):

```js
GLFIG.go(F, x, y, { renn: true, done: F => … })   // rennen (welt: Polizisten zu Fuß; kino: Szenen)
GLFIG.go(F, [[x, y], [x2, y2]], { renn: true })     // eine Strecke rennen; go(F, pts, 4.2) rennt auch
GLFIG.geste(F, 'zeigen', { ziel: [x, y, z] })        // → Dauer in s; ziel auch eine Figur oder 'spieler'
GLFIG.geste(F, 'telefon')                            // gehalten bis GLFIG.geste(F, null)
GLFIG.geste(F, 'nicken', { sec: 2 })                 // o.sec: Dauer (0 = gehalten), o.halten: gehalten
GLFIG.blick(F, x, y, z)                              // z: Höhe in der Welt; ohne: Augenhöhe über dem Boden dort
GLFIG.blick(F, andereFigur) · GLFIG.blick(F, 'spieler') · GLFIG.blick(F, [x, y, z]) · GLFIG.blick(F, null)
GLFIG.sitz(F, x, y, hd, 0.455)                       // z: Sitzhöhe über dem Boden (wie o.sitz in gl_mission.js)
GLFIG.platz(x, y, r) → { x, y, hd, z } | null        // der nächste freie Sitz auf einer Bank des Dorfes
GLFIG.steh(F)
GLFIG.reite(F, moped) · GLFIG.reite(F, null)         // moped: ein Fahrzeug von GLAUTO mit form 'moped'
```

Felder: `F.gest` (die laufende Geste), `F.look`, `F.sitzt`, `F.reitet`, `F.renn`, `F.handyG` (das Handy, solange es da ist).

Hinweise an die Besitzer anderer Dateien (ich habe sie nicht angefasst):

- **`gl_kapitel1.js` (kino), Mission 3, Gerhard unter der Linde:** `bank()` rechnet von `GLDATA.ORTE.linde` [213,5, −112,5] aus – der
  Stamm steht aber bei `VPROPS.LINDE` [217,0, −109,0] mit seinem Ring aus sechs Bänken (Radius 2,25 m). Gerhard sitzt deshalb in der
  Luft neben den Bänken. Besser: `const s = GLFIG.platz(VPROPS.LINDE[0], VPROPS.LINDE[1], 6)` und
  `A.fig('gerhard', 'gerhard', s.x, s.y, s.hd, { sitz: s.z, … })` (Sitzhöhe 0,455 m).
- **Mission 1, Zentralhaltestelle Schleusingen:** wer dort warten soll, sitzt mit `{ sitz: 0.47 }` (gl_mission.js) oder
  `GLFIG.sitz(F, x, y, hd, 0.47)` auf der Bank eines Wartehäuschens (`bus/bus_modell.js`: Bank 0,42–0,47 m hoch, 0,28 m vor der
  Rückwand, zwei Meter lang). Die Haltestelle selbst kennt das Modell nicht als Sitzplatz – der Ort muss im Kapitel stehen.
- **Kegelbahn (`gl_kegeln.js`):** `GLDATA.ORTE` hat keine Sitzplätze an Theke und Bänken; wer Zuschauer sitzen lassen will: `GLFIG.sitz`
  mit der Sitzhöhe des Möbels (Bank 0,45, Barhocker 0,75 – die Füße gehen dann auf die Stange).
- **Reiter in `gl_mission.js`** (`reiterTick`) hängen weiter 0,22 m hinter dem Moped und aufrecht – das überschreibe ich nach den
  Fahrzeugen (`VEH.after`) mit der Fahrerhaltung. Wer mag, kann statt `F.reitet = true` künftig `GLFIG.reite(F, c)` nehmen.
- **`licht`**: der Lichtkegel sitzt an der Hand (`gl_licht.js`, `fackeln`) – passt zur hochgehaltenen Lampe. Schön wäre
  `GLLICHT.hatLampe = hatLampe` (die eigene Entscheidung, wer nachts eine Lampe trägt): dann halten auch Wachen und Volkspolizisten ohne
  `F.lampe` ihre Lampe hoch. Ohne das gilt nur `F.lampe === true`.
- **`welt`**: Polizisten zu Fuß rennen ab 2,6 m/s von selbst; für Zeugen `GLFIG.geste(F, 'filmen')`, zum Gaffen
  `GLFIG.blick(F, 'spieler')`, Kopfschütteln `GLFIG.geste(F, 'kopf')`.

Noch offen: siehe unten.

## Offen

- Kopfdrehen und Nicken sieht man auf Standbildern kaum; im Spiel sichtbar.
- Die Figuren im Trabant von 1989 (Volkspolizei, Grenzer) sitzen nicht im Wagen – es gibt sie dort nicht als Mitfahrer.
- Füße beim Rennen gleiten nicht, solange Tempo und Sprint-Schritt passen; sehr kleine Figuren gleiten etwas.
