# Grenzland Runde 2 – Kino: Gespräche als Zwischensequenzen, Missionstitel, Musik nach Lage (Hilfs-Agent `kino`)

Branch `feat/grenzland-kino`, Auftrag `docs/plans/auftraege/grenzland2-kino.md` (gemeinsam: `grenzland2-gemeinsam.md`), Paket B
„Kino-Gefühl“ (Falko, 13.11.2026 ~11:25). Stand: 13.11.2026 nachmittags.

## Was es gibt

- **Gespräche als Zwischensequenz** (`viz3/src/grenzland/gl_kamera.js`, GLKAMERA). Läuft ein Gespräch einer Mission und der Spieler
  steht (zu Fuß; steht er mit dem Moped still, steigt er ab), keine Fahndung läuft, das Gespräch mindestens zwei Sätze hat und jemand aus dem
  Gespräch in der Nähe steht, übernimmt eine Filmkamera:
  - **Eröffnung mit einer Totalen** der Gruppe von der Seite, auf Augenhöhe (Spieler, Partnerin, die anderen).
  - **Je Satz ein Schnitt auf den Sprecher**: über die Schulter des Zuhörers (Gegenschuss) oder halbnah auf das Gesicht, leicht aus der
    Mitte, mit Blickraum. Wechselt der Sprecher zur anderen Seite: Schuss–Gegenschuss; spricht derselbe weiter: ein Schnitt näher heran.
  - **180°-Regel**: die Kamera bleibt auf einer Seite der Linie zwischen den Gruppen; die Seite wird beim Start gewählt (freie Sicht, nahe
    an der bisherigen Kamera).
  - **Langsames Heranfahren** bei langen Sätzen (ab 3,5 s), Kamera nie in Wänden (Sichtlinie wie bei der Fahndung, sonst näher heran oder
    eine andere Einstellung).
  - **Balken** oben und unten: `GLHUD.kino(true/false)` des Leads, solange es das nicht gibt, eigene Balken (dann blendet das Modul Tafel,
    Radar, Aufgabenkarte für die Dauer aus).
  - **Festhalten**: der Spieler kann nicht weglaufen (Lauftasten und Steuerknüppel ruhen, die Position wird nach der Laufphysik gehalten).
    **Leertaste, Enter, E oder Tippen** = nächster Satz, **Esc** = Rest überspringen (was nach dem Gespräch kommt, passiert trotzdem).
  - **Blicke**: wer spricht, dreht sich zum Zuhörer; die anderen schauen den Sprecher an (`GLFIG.blick`, Agent figuren, sobald es das
    gibt); der Spieler dreht den Kopf zum Sprecher; Gesten bei langen Sätzen (`GLFIG.geste`, falls da). Danach drehen sich die Leute zurück.
  - **Danach** gleitet die Kamera in 0,6 s zurück hinter den Spieler; folgt sofort das nächste Gespräch, bleibt es eine Zwischensequenz.
  - Rufe mitten in der Handlung (Wachen, Batterie, Leuchtkugel …) bleiben Untertitel (`GLKAMERA.BARK`), ebenso alles auf dem fahrenden
    Moped oder bei Fahndung – wie in GTA.
- **Taktung der Sätze** (`gl_mission.js`): ein Satz dauert so lange wie seine Aufnahme (Länge aus dem Manifest von Agent stimmen, sonst bis
  das Sprechen endet), höchstens 1,6 × die Lesezeit, mindestens 1,6 s; ohne Stimme die Lesezeit; 0,25 s Pause zwischen den Sätzen.
- **Missionstitel mit Stich**: beim Start jeder Mission der Titel (`GLHUD.titel(Titel, Ort, 5)` des Leads, solange es fehlt die große Zeile
  `GLHUD.say`) mit Ort darunter („Schleusingen · Freitagabend“, „Untere Klinge · nachts“ …), sobald der Bildschirm ruhig ist (nach der
  Blende, nicht über „Mission bestanden“), dazu der Stich `start`. Das alte „Neue Mission“-Banner des Grundspiels ist weg.
- **Musik nach Lage** (`viz3/src/grenzland/gl_score.js`, GLSCORE) – selbst komponiert, live in WebAudio erzeugt, d-Moll, über den
  Musik-Bus des Spiels:
  - `spannung` (Rennen-Start, Klinge, Coup): tiefer Puls in Achteln, dunkle Fläche (i – VI – iv – V), ein leises Ticken.
  - `flucht` (ab einem Stern, und das Rennen): Bass-Ostinato und Schlagzeug; ab zwei Sternen Snare, ab drei Stöße und mehr Kick, ab vier
    Sechzehntel-Hi-Hats und ein Anstieg.
  - `1989` (die Rückblende): ein atmender Bordun, vereinzelte Klaviertöne, alle acht Takte Streicher – keine Trommeln.
  - `szene` (unter einer Zwischensequenz): nur die Fläche, leise.
  - Stiche: `start` (Paukenschlag und Akkord), `bestanden` (B-Dur → D-Dur), `gescheitert` (fallende Linie, dumpfer Schlag) – letzterer
    unter der Blende eines Fehlschlags.
  - Überblendung ~2 s; **stumm im freien Spiel und solange das Autoradio spielt**; **8 dB leiser**, solange eine Stimme spricht.
- **Leuchtkugel**: Mission 4 meldet `grenzland:flare { x, y, z }` (Bild: Agent licht). Die kleine rote Kugel bleibt nur, solange es
  `window.GLLICHT` nicht gibt.
- **Taschenlampen**: `F.lampe = true` für die drei Männer an der Klinge, den ABV 1989 (Dämmerung) und – nachts – die Wachen im Außenlager
  (Bild: Agent licht).
- **Für die Aufnahmen**: `GLMISSION.linien()` → `[['gl_<Figur>', Satz], …]` – alle gesprochenen Sätze der Missionen (ohne Erzähler).

## Ausprobieren

- Szene „Grenzland“: das erste Gespräch an der Zentralhaltestelle ist schon eine Zwischensequenz. Konsole: `GLMISSION.debug.go('gerhard')`
  und zu Gerhard unter die Linde gehen. `window.GLKINO_AUS = true` schaltet die Zwischensequenzen ab (Vergleich).
- Test: `bash tools/browser_lock.sh python3 viz3/test/run.py --port 9012 --serve grenzland_kino:m1` (Abschnitte `m1`, `m3`, `score`; eine
  Mission je Seite). Bilder in `out/grenzland_kino/`. In Actions je Abschnitt ein Job (`viz3/extra/grenzland-kino/tests.txt`).

## Entscheidungen (Falko schlief)

- **Die Kamera hängt am Fahrzeug-Haken**: `applyCam` des Spiels fragt zuerst `VEH.applyCam` – den umhülle ich, solange eine
  Zwischensequenz oder die Rückblende läuft, und gebe ihn bei „Beenden“ zurück. Keine Änderung an Grunddateien.
- **Absteigen statt keine Szene**: steht man mit dem Moped still (unter 1,2 m/s), steigt man ab, dann beginnt die Zwischensequenz – sonst
  wären die Gespräche an der Staumauer, an der Scheune und im Garten ohne Bild geblieben.
- **Aufstellen**: steht man zu nah (unter 1,3 m) oder zu weit (3,2–9 m) vom Gegenüber, setzt der erste Schnitt einen auf gut zwei Meter
  (das verdeckt der Schnitt, so macht es GTA). Die Partnerin wird nur versetzt, wenn sie weiter als 3,5 m weg ist.
- **Ego-Sicht**: wer die Ich-Sicht gewählt hat, sieht in der Zwischensequenz seine Figur (die Sicht kommt danach zurück).
- **Rennen bekommt `flucht`** (Stufe 2) statt `spannung` – ein Rennen braucht Schlagzeug; der Startcountdown hat `spannung`.
- **Kein Score unter freiem Spiel**, auch nicht bei Fahndung ohne Mission (wie GTA: Verfolgungsmusik nur in Missionen).
- **Stich „bestanden“** kommt von hier (`grenzland:mission` erledigt); der Jingle `GLTON.fx('frei')` in `gl_modus.js` klingt zusätzlich.

## Für den Lead

- `GLHUD.kino(on)`, `GLHUD.titel(name, unter, sec)`, `GLHUD.ruhig()` werden genutzt, sobald es sie gibt (bis dahin eigene Balken bzw.
  `GLHUD.say`, und ein eigener Ruhe-Test: keine Blende, `#glpass`, `#glmsg`, `#glbust` verborgen).
- Zum Überspringen (Esc) wäre `GLHUD.subAus()` gut (Untertitel sofort weg); bis dahin setze ich `GLHUD.subEl.hidden`.
- Bitte in `gl_modus.js` bei „Mission bestanden“ `GLTON.fx('frei')` weglassen, wenn `GLSCORE` da ist (sonst zwei Klänge übereinander).
- `GLHUD.sub` als Warteschlange: meine Sätze kommen in ihrer Taktung (Dauer = erwartete Satzlänge); beim Überspringen (E, Leertaste) muss
  ein neuer Gesprächssatz den alten **ersetzen**, nicht warten.
- In `modules.txt` stehen `gl_kamera.js` und `gl_score.js` direkt vor `gl_mission.js`.

## Offen

- Sucher für die Fotos (Schritt 4 des Auftrags) – siehe unten, falls noch geschafft.
- Gespräche im Sitzen auf dem fahrenden Moped bleiben ohne Bild (gewollt).
