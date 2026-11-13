# Grenzland, Runde 2: Figuren – Menschen, die sich wie Menschen bewegen

Hilfs-Agent `figuren` des Grenzland-Chats (13.11.2026, Paket B „Kino-Gefühl“). Auftrag: `docs/plans/auftraege/grenzland2-figuren.md`.
Dateien: `viz3/src/grenzland/gl_fig.js` (die Schnittstelle `GLFIG`), neu `viz3/src/grenzland/gl_pose.js` (die Haltungen `GLPOSE`),
`viz3/test/grenzland_figuren.py`, `viz3/extra/grenzland-figuren/tests.txt`, eine Zeile in `viz3/src/modules.txt` (vor `gl_fig.js`).

## Was es gibt

- **Auf dem Moped sitzen wie ein Fahrer** – der Spieler (die Figur des Grundspiels auf der Simson, Ansicht von außen) und jede Figur,
  die reitet (`F.reitet` aus `gl_mission.js`, oder `GLFIG.reite(F, moped)`): Hüfte auf der Sitzbank, Oberschenkel nach vorn und unten,
  Knie gebeugt, Fußballen auf den Rasten (Schwalbe: auf den Trittbrettern), Arme nach vorn, Hände um die Griffe (sie drehen mit dem
  Lenker), so weit nach vorn gebeugt, dass die Ellbogen leicht gebeugt bleiben, Kopf oben zur Straße. Die Figur neigt sich mit dem Moped
  in die Kurve. Steht das Moped (unter 0,7 m/s), kommt der linke Fuß auf den Boden – angehoben auf dem Weg dorthin. Wer kurze Arme hat
  (Sarah, Jule), rutscht bis 12 cm auf der Sitzbank nach vorn, statt sich auf den Tank zu legen. Beim Aufsteigen geht die Haltung in
  einer Drittelsekunde aus dem Sitz des Grundspiels in die Fahrerhaltung über.
- **Zu zweit unterwegs** (meine Entscheidung, abschaltbar): `gl_modus.js` versteckt den anderen der beiden, solange man fährt
  („fährt mit“). Wie Jason und Lucia in GTA 6 sieht man ihn jetzt: auf der Simson hinten auf der langen Sitzbank (Hüfte auf der hinteren
  Hälfte, Füße auf den Soziusrasten, Hände an der Taille des Fahrers, ab und zu ein Blick an dessen Schulter vorbei), im Trabant auf dem
  Beifahrersitz. Nur von außen gesehen (in der Fahreransicht bleibt er wie bisher unsichtbar); `GLPOSE.sozius = false` stellt das alte
  Verhalten wieder her.
- **Am Steuer des Trabant** (1989, Ansicht von außen): auf dem Fahrersitz des Wagens dieses Bildes, die Hände auf zehn vor zwei am
  Lenkrad; sie gehen ein Stück mit dem Lenkrad mit wie die Hände der Fahreransicht.
- **Rennen**: `GLFIG.go(F, x, y, { renn: true })` – nach einem kurzen Antritt (5,5 m/s²) 4,6 m/s. Über 2 m/s kommt der Trab
  (`jog`) aus dem Bewegungssatz der Spielerfiguren über den Gehschritt, über 3,6 m/s der Sprint – jeweils im Takt der eigenen
  Schrittlänge (passend zur Beinlänge). So trabt ein Polizist, den `welt` mit 3,2 m/s hinterherschickt, statt in Zeitlupe zu sprinten.
  Ein Tempo über 2,6 m/s läuft auch mit der alten Form `go(F, pts, v)` als Rennen.
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
  eigenem Leuchten. Geprüft im Test (169 → 169 Programme). Das Handy hängt in der Gruppe der Figur: wird sie versteckt oder
  freigegeben, ist es mit weg.
- **Fern ab**: weiter als 70 m von der Kamera stellt `rbPerson` keine Pose mehr – die Aufsätze auch nicht.
- **`place()` heißt jetzt stehen**: wer gesetzt wird, steht (vorher blieb eine sitzende Figur nach einem neuen `place` im Sitzen).
  `gl_mission.js` setzt nach `place` selbst wieder `F.sitzt` – das funktioniert weiter.

## Getestet

Stand 14:45: lokal 48/48 (`grenzland_figuren`, alle Teile, auf dem Stand mit Merge 1 von `feat/grenzland`, Lauf 6); auf GitHub
Actions grün auf 2c18ef10 (Lauf 43424172075: smoke, beide Teile – 17 und 26 Prüfungen). Langsamste Haltungsarbeit eines Bildes im
Testbrowser: Reiten 0,1 ms, Gesten und Rennen bis 1,3 ms (einmal beim ersten Dekodieren des Sprint-Clips).


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
- **`gl_modus.js` (Lead), der Mitfahrer:** `partnerTick` setzt den Partner beim Fahren unsichtbar; ich setze ihn nach den Fahrzeugen
  (`VEH.after`) wieder sichtbar und auf den Soziussitz bzw. Beifahrersitz (nur Ansicht von außen, nur „heute“). Wer das nicht will:
  `GLPOSE.sozius = false`. Der Radar zeigt den Partner beim Mitfahren weiterhin nicht (`F.rides`) – das passt.
- **`handy` (feat/handy, Haltung des Spieler-Handys):** die Spielerfigur teilt sich eine Merkliste der Drehungen (`AVATAR.fig.sv`).
  Solange der Spieler auf der Simson oder im Trabant sitzt (Ansicht von außen), setze ich sie vor der Fahrerhaltung zurück – eine
  Handy-Haltung gilt dann nicht (wie verabredet: nur im Gehen und Stehen).
- **`welt`**: Polizisten zu Fuß rennen ab 2,6 m/s von selbst; für Zeugen `GLFIG.geste(F, 'filmen')`, zum Gaffen
  `GLFIG.blick(F, 'spieler')`, Kopfschütteln `GLFIG.geste(F, 'kopf')`.

Noch offen: siehe unten.

## Offen

- Kopfdrehen und Nicken sieht man auf Standbildern kaum; im Spiel sichtbar.
- Auf- und Absteigen: aufs Moped geht es in einer Drittelsekunde aus der Sitzhaltung des Grundspiels in die Fahrerhaltung; beim
  Absteigen steht die Figur sofort (das Grundspiel setzt sie neben das Fahrzeug) – eine echte Absteige-Bewegung fehlt.
- Die Spielerfigur hängt im Grundspiel ein Bild hinter den Fahrzeugen (`game/avatar.js` ist ein später KERN-Takt, die Fahrzeuge
  fahren danach in `window.TICKS`). Auf Simson und Trabant setze ich sie neu; in Auto, Traktor und Bus des Grundspiels bleibt der
  Versatz (bei Tempo 50 etwa 20 cm) – eine Sache für `game/avatar.js`.
- Ein Barhocker oder Sitzplätze an der Kegelbahn stehen nicht in den Daten (`GLDATA.ORTE`); `GLFIG.platz` kennt nur die Bänke des
  Dorfkerns und den Ring der Dorflinde.
- Füße gleiten beim Rennen kaum; sehr kleine oder sehr große Figuren etwas (die Schrittlänge folgt der Hüfthöhe).

---

# Grenzland, Runde 3: Helme, wie sie sind (Hilfs-Agent `helm`, 13.11.2026)

Auftrag: `docs/plans/auftraege/grenzland3-helm.md` (Falko 20:44: „Die Helme sehen leider völlig unrealistisch aus“, zwei Fotos).
Dateien: neu `viz3/src/grenzland/gl_helm.js` (`GLHELM`, eine Zeile in `viz3/src/modules.txt` vor `gl_fig.js`), in
`viz3/src/grenzland/gl_fig.js` nur `HUTC` (die Helm-Schlüssel) und `hatOn` (Helme gehen an `GLHELM`), der alte `HUT.helm` ist weg;
Test `viz3/test/grenzland_helm.py`, `viz3/extra/grenzland-helm/tests.txt`.

## Was falsch war (Falkos Fotos)

- Die Schale war eine grobe Halbkugel (16 × 8 Facetten, jede sichtbar – das Bau-Kit der Hüte rechnet je Dreieck eine eigene Normale),
  blassgrau bei allen, matt, ohne Dicke und Kantenschutz, und saß zu tief: der Rand lag rundum auf Augenhöhe.
- Der schwarze Balken über Stirn/Augen war ein Kasten als „Schirm“ – auf Timo eine Augenbinde, auf Jule ein Strich über die Stirn.
- Kein Kinnriemen, kein Ohrteil, kein Visier. Die Frau mit Helm auf beiden Fotos ist übrigens Jule (`hut: 'helm'` in den Darstellerdaten),
  nicht Sarah – Sarah und Falko tragen als Figuren keinen Helm, nur die Spielfigur auf dem Moped (`gl_fahndung.js`, `'helmrot'`).
- Falkos Kopf auf dem ersten Foto (dunkles Gesicht, graues Band): das ist die **Sturmhaube** aus `gl_fahndung.js` (`sturmhaube()`): ein
  dunkles Ei aus dem Hut-Kit über dem ganzen Kopf bis zum Hals mit Augenschlitz, die Oberseite spiegelt den Himmel grau. Kein Helm-Fehler
  – siehe „Für den Lead“.

## Was es jetzt gibt

- **Jethelm** (offenes Gesicht, der Helm der Clique auf der Simson): eine ovale Schale, länger als breit, glatt (die Normalen der Fläche,
  nicht der Facetten), unterhalb der breitesten Stelle fast senkrecht über die Ohren hinab; die Schnittkante vorn knapp über den
  Augenbrauen (an den Augen-Knochen des Rigs ausgerichtet: Rand ≈ 3,6 cm über der Augenmitte), an den Schläfen schräg hinab vor das Ohr,
  unter den Ohrläppchen entlang und im Nacken etwas höher; ein weicher dunkler Gummi-Kantenschutz rundum, man sieht die Dicke von Schale
  und Polster, innen das dunkle Futter; ein Kinnriemen (zwei Riemen aus den Ohrteilen unter das Kinn, eine Steckschnalle); entweder ein
  kurzer **Druckknopf-Schirm** (gebogen, leicht hoch, drei Knöpfe) oder ein **getöntes Visier**, hochgeklappt über der Stirnpartie, mit
  Scharnierknöpfen an den Schläfen.
- Lack in glaubhaften Farben, je Person einer (Schlüssel in `HUTC`): `helm` (creme, Schirm – der bisherige Standard der Darstellerdaten),
  `helmcreme` (creme, Visier), `helmweiss` (weiß, schwarzer Schirm), `helmrot` (rot, Schirm – die Spielfigur), `helmrotvisier`,
  `helmoliv` (oliv, schwarzer Schirm), `helmblau` (hellblau, Visier), `helmjetschwarz` (schwarz glänzend, Visier).
- **Taktischer Helm** der Spezialkräfte (`helmschwarz`, `gl_fahndung.js`): hoch geschnitten (die Ohren frei), vorn über den Brauen,
  hinten bis zum Nacken, Schienen an den Seiten, eine Halterung vorn, Vierpunkt-Riemen, matt schwarz.

## Wie es gemacht ist (Entscheidungen)

- **Eigene Geometrie statt Hut-Kit:** `gl_helm.js` baut die Schale als Fläche über (Winkel um den Kopf, Winkel von oben) mit Normalen aus
  den Ableitungen – deshalb glatt bei ≈ 1 400 Dreiecken. Die Kante folgt einer Höhenlinie je Winkel; wo sie steil fällt (vor dem Ohr),
  liegen die Stützstellen dichter.
- **Passform je Kopf:** `GLFIG.headOf` liefert Breite/Tiefe der Schädelkrone und die Nasenspitze; die Augenhöhe kommt von den
  Augen-Knochen des Rocketbox-Rigs (alle Darsteller haben sie; sonst 4,5 cm über der Nasenspitze – an den Darstellern gemessen
  4,2–5,2 cm). Breite und Tiefe sind begrenzt (die Krone von `headOf` schließt Ohren und Haar ein – ein Helm sitzt auf dem Schädel; Haar
  darf unten heraushängen, wie bei echten Helmen). Gebaut wird einmal je Art, Farbe und Kopf; alle teilen die Geometrie.
- **Kein neues Shader-Programm:** der Lack ist der Lack der Fahrzeuge des Modus (`GLMOD.paint(Farbe, 0)` – der klarlackierte Lack des
  Spielerautos, ein Material je Farbe, dasselbe Programm), Kante, Futter, Riemen, Schnalle, schwarze Schirme, das Visier und der
  taktische Helm das Material des Verkehrs (`VFIG.mat()`). Ohne `GLMOD` fällt der Lack auf `VFIG.mat()` zurück. Zwei Draw-Calls
  (der taktische Helm einer), ≈ 2,4–2,5 k Dreiecke je Helm.
- **Visier ohne Durchsicht:** ein hochgeklapptes Visier liegt auf der Schale; man sieht von ihm vor allem die Tönung über dem Lack und
  die Kante. Ein erster Versuch mit dem Glas der Fahrzeuge (`GLMOD.glass()`, durchsichtig) zeigte durch die Schale hindurch die Stirn
  (`out/grenzland_helm_v2/4_jule_nah.jpg`) – deshalb ist das Visier jetzt getönter Kunststoff im Material des Verkehrs.
- **Haare:** bei den Figuren des Modus bleiben die Haare des Modells; die Schale ist so groß, dass nichts durchsticht; was unten
  herausschaut (Zopf, Nacken, Stirnfransen), ist wie bei echten Helmen. Bei der Spielfigur drückt `gl_fahndung.js` das Haar wie unter dem
  Forsthelm des Grundspiels (`helmU`) – unverändert.
- **1989:** in der Rückblende trägt niemand einen Helm (die Darstellerdaten von 1989 haben keinen) – nichts gebaut.

## Getestet (Helme)

- `viz3/test/grenzland_helm.py` (lokal Port 9015, auf Actions `viz3/extra/grenzland-helm/tests.txt`): sechs Köpfe – Jule, Timo, Basti,
  Falko und Sarah als Figuren, ein Polizist mit dem Helm der Spezialkräfte – je von vorn, von der Seite, dreiviertel, ganz nah und von
  hinten, zwei im Gespräch auf Gesprächsabstand, vier bei Nacht, Jule auf einer S 51, die Spielfigur mit ihrem Helm auf dem Moped (stehend,
  von vorn, von hinten, in Fahrt), dazu die Sturmhaube zum Vergleich. Bilder in `out/grenzland_helm/`, frühere Stände in
  `out/grenzland_helm_v1/` (erste Form, zu breit) und `out/grenzland_helm_v2/` (Visier aus Fahrzeugglas – verworfen).
- Prüfungen: der tiefste Punkt der Kante vorn (im Bereich der Augen) liegt bei jedem Kopf ≥ 1,5 cm über den Augen-Knochen (im Stand in
  der Welt und im Kopf-Rahmen, beim Fahren im Kopf-Rahmen – der Kopf neigt sich); kein Punkt des Helms (ohne Riemen) in einem Kasten vor
  Augen und Brauen; ≤ 3 000 Dreiecke in ≤ 3 Meshes je Helm; **keine neuen Shader-Programme** (gezählt nach Figuren und Fahrzeugen des Modus
  im Bild, vor und nach den Helmen); der Helm der Spielfigur nach dem Absteigen weg; nach „Beenden“ kein Helm mehr in der Szene; keine
  Seitenfehler.
- **Ergebnis:** lokal `grenzland_helm` **25/25** (21:41, 423 s; Programme 176 → 176, je Helm 2 436–2 480 Dreiecke in 1–2 Meshes, Kante
  vorn im Kopf-Rahmen 3,2–3,6 cm über der Augenmitte, beim Fahren 3,2 cm). Auf Actions (Stand `e1ac32afb`): `grenzland_figuren`
  beide Teile grün, `smoke` grün; `grenzland_helm` dort rot an einer Stelle – Falko stand mit leicht geneigtem Kopf (Leerlauf-Clip), die
  Kante lag in der Welt nur 1,4 cm über dem Auge. Seitdem misst der Test die 1,5 cm im Kopf-Rahmen und in der Welt nur „über dem Auge“.
- Der alte Figuren-Test lokal (21:52, Stand `d23a2b1cb`): `grenzland_figuren:moped,trabi,reiter` **21/21** – Timo auf der Schwalbe
  mit dem Standard-`helm` in `out/grenzland_figuren/4_reiter_schwalbe_stand.jpg`.
- Bilder: `out/grenzland_helm/uebersicht.jpg` (alle sechs aus fünf Richtungen), `6_gespraech_timo_jule.jpg`, `7_nacht_*.jpg`,
  `8_jule_reitet_*.jpg`, `9_spieler_moped_*.jpg`, `9_spieler_sturmhaube.jpg`. Vorher: Falkos Fotos (13.11. 20:44).

## Für den Lead (Helme)

- **Vorschlag für `gl_data.js` (`hut`)**: Jule `'helmblau'` (hellblau, getöntes Visier), Timo `'helmweiss'` (weiß, schwarzer Schirm –
  der klassische Simson-Helm), Basti, falls er fährt, `'helmjetschwarz'` (schwarz glänzend, Visier). Der bisherige Wert `'helm'` bleibt
  gültig (creme mit Schirm). `'helmoliv'` gibt es, wirkt aber auf den Bildern militärisch – nicht für die Clique.
- **Spielfigur auf dem Moped** (`gl_fahndung.js`, `aussehen()`, Zeile mit `GLFIG.hatOn(model, null, 'helmrot')`): je Person
  `GL.wer === 'f' ? 'helmcreme' : 'helmrot'` (Sarah creme mit Visier, Falko rot mit Schirm).
- **Sozius ohne Helm:** wer hinten mitfährt (`GLPOSE.sozius`, die Partnerfigur), trägt keinen Helm – in Deutschland Pflicht und auf
  `9_spieler_moped_seite.jpg` gut zu sehen. Vorschlag für `gl_modus.js` (`partnerTick`), solange `F.rides` und sichtbar:
  `F.helmG = F.helmG || GLFIG.hatOn(F.f.model, null, F.id === 'sarah' ? 'helmcreme' : 'helmrot')`, beim Absteigen
  `F.helmG.parent && F.helmG.parent.remove(F.helmG); F.helmG = null`.
- **Sturmhaube** (`gl_fahndung.js`, `sturmhaube()`, Falkos erstes Foto): ein Ei aus dem Hut-Kit (facettiert, Abstand zum Gesicht) im Material
  des Verkehrs (Rauheit 0,55 – die Oberseite spiegelt den Himmel als graues Band). Besser: eine raue Kopie des Materials
  (`VFIG.mat().clone()`, `roughness = 1`, dasselbe Programm), enger am Kopf (Breite/Tiefe wie `GLHELM.fit`, + 6–8 mm) und glatte Normalen
  – die Schalen-Funktion `shell()` in `gl_helm.js` kann das (ein Rand rundum am Hals, der Augenschlitz als Lücke über der Augen-Höhe aus
  den Augen-Knochen). Nicht gebaut – die Datei ist deine.
- Neue Schlüssel in `HUTC` (`gl_fig.js`): `helmcreme`, `helmweiss`, `helmrotvisier`, `helmoliv`, `helmblau`, `helmjetschwarz`;
  `helm`, `helmrot`, `helmschwarz` bleiben (jetzt Jethelm bzw. taktischer Helm).

## Offen (Helme)

- Ein Integralhelm (mit Kinnbügel) ist nicht gebaut (war „optional“); die Schalen-Funktion trägt ihn (die Kante vorn um Augen und Mund).
- Die Riemen laufen über geschätzte Punkte unter Kiefer und Kinn (aus der Nasenspitze); bei sehr breiten Kiefern verschwinden sie stellenweise
  in der Haut – bei Gesprächsabstand nicht zu sehen.
- Das Visier ist hochgeklappt und nicht durchsichtig; ein heruntergeklapptes, klares Visier bräuchte ein durchsichtiges Material, das nicht
  wie das Fahrzeugglas durch die Schale schaut.
- Langes Haar fällt unter dem Helm heraus (Zopf, Nacken) – gewollt; bei sehr voluminösem Haar oben kann es an der Stirn unter der Kante
  hervorschauen.
