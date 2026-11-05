# Zombie-Nacht (feat/zombie, ab 4.11.2026)

Plan und Falkos Wunsch wörtlich: `docs/plans/plan_zombie.md`. Häuser von innen: Hilfs-Agent `zombie-innen` (`docs/features/zombie-innen.md`,
Auftrag `docs/plans/auftraege/zombie-innen.md`).

## Was es gibt

- **Start:** Menü → Erleben → Szenen → „Zombie-Nacht“ (zweimal tippen: stellt Kalender und Spieluhr auf den frühen Nachmittag des 31. Oktober, vier Stunden vor der Sirene – beim
  üblichen Tempo vier Minuten) oder
  `?szenario=zombie`. Man steht im Garten, die Waffen liegen herum. Ein neu geladener Stand macht weiter (`pav-zombie-v1`).
- **Tag und Nacht nach der Sonne** (`ZOMBIE.times()`): 30 min vor der Sirene ein Hinweis, die Sirene 50 min nach Sonnenuntergang (Ende Oktober
  ~17:40), Entwarnung 25 min vor Sonnenaufgang. Ohne Tageslauf feste Zeiten (`ZDATA.TIME`: 20:30, 21:00, 5:30).
- **Nebel bei Nacht** (Silent Hill): abends leicht, nachts dicht – das Dorf versinkt jenseits von 40–80 m im Dunkel. Es ist der Nebel der
  Szene (kein neuer Shader), nur seine Dichte; weil der Tageslauf sie bei jeder Himmelsänderung neu setzt, liest sie sich im Modus als das
  Größere von Tageslauf und Nacht (`z_modus.js` fogHook), beim Beenden wieder wie vorher.
- **Die Sirene** vom Mast der alten Schule (Gebäude 215): E57-Heulton (Aufnahme, CC BY-SA) mit Echo übers Tal, morgens Dorfsirene mit
  Kirchenglocken (CC0); ohne Dateien synthetisch. Dorfbewohner draußen verwandeln sich an Ort und Stelle (knien, krampfen, stehen auf); ist
  keiner draußen, verwandeln sich zwei in Sichtweite. Mehr kommen aus Haustüren 35–110 m entfernt, lieber hinter dem Spieler.
- **Zombies** (`z_fig.js`, `z_horde.js`): die Rocketbox-Figuren der Dorfbewohner (`dorf_*`) und Fremden (`vk_*`); das Aussehen ist in ihre
  eigenen Texturen gemalt (einmal je Person, höchstens 1024 px, am Handy 512): Haut grau-grün und fleckig, Kleider stumpf und schmutzig, Blut
  am Kinn, als Läufe über die Brust, an Händen und Knien – wo das ist, sagen die Eckpunkte in der Grundhaltung (Kinn, Brust, Finger) und ihre
  Texturkoordinaten. Arme vor, Kopf schief, Hinken, Zucken. Sehen ~14 m (hell/Taschenlampe 24 m), hören Motorsäge (70 m), Schuss (220 m), Motor,
  Hämmern; jagen über ein Flussfeld (1,5-m-Raster: Grundrisse, Wände, Gartenhindernisse; Breitensuche vom Spieler ±75 m, 2×/s); Schlag nach
  0,45 s Ausholen (12 Schaden, +2 je Nacht). Ohne Beine kriechen sie, ohne Kopf fallen sie. Autos schleudern sie weg (Schaden ~5·v^1,65).
- **Waffen** (`z_waffe.js`, Modelle `z_waffe_mod.js`): Spaten (alte Garage), Beil (Holzhaus), Huberts Axt (Hackklotz), Mistgabel
  (Ziegenweide), Brechstange und Motorsäge (Werkstatt), Sense, **Doppelflinte** (seit 5.11. auf Huberts Tisch vor seiner Werkstatt, geladen,
  daneben eine Schachtel mit 12 Schrotpatronen; sonst im Waffenschrank eines Jägers). Zuschlagen: linke Maustaste (Maus gefangen) bzw. Klick,
  Taste Y, roter Knopf am Handy; gedrückt halten wiederholt; G tritt. Motorsäge: drücken startet (1,6 s, Seilzug), halten sägt, Benzin 0,5 l,
  R tankt aus dem Rucksack nach. Flinte: zwei Schuss, R lädt nach (Kipplauf auf, Hülsen fliegen, zwei Patronen rein, zu). Was welche Taste
  tut, steht im Panel unter der Waffe. Zustand sinkt mit jedem Treffer, bei 0 bricht die Waffe. Die Modelle in wahrer Größe: die Flinte mit
  Englischschaft, Basküle, Abzugsbügel, zwei Läufen mit Schiene und Vorderschaft (die Läufe kippen um den Scharnierstift), die Säge mit
  Haube, Starter, Bügelgriff, Kettenbremse, Schwert und Kette, Axt und Beil mit keilförmigem Kopf, Spaten mit gewölbtem Blatt und D-Griff.
- **Ich-Sicht** (`z_fp.js`, Falko 5.11. 9:06/10:47/11:48): man sieht die eigenen Arme – eine Kopie der gewählten Spielfigur (dieselbe
  fotorealistische Rocketbox-Figur wie in der Schulterkamera: Falkos kariertes Hemd, Sarahs Lederjacke, Christophs nackte Unterarme; Form
  und Bilder geteilt) mit ausgeblendetem Kopf, die Augen in der Kamera. Arme per Zwei-Knochen-Löser an die Griffe (Ellbogen-Scharnier wie
  bei der Figur), das Handgelenk folgt dem Unterarm; die Finger aus den Bewegungsaufnahmen der Figur (Werkzeug halten, Lenkrad greifen),
  Zeigefinger der Flinte am Abzug, eine geballte Faust nur zum Zuschlagen, sonst locker. Eigenes, engeres Bildfeld für Hände und Waffe
  (0,8 des Weltbildes, `HELD.fov` in `game/play.js`) – nichts wird am Rand gestreckt. Je Waffe eine Haltung, ein wenig gesenkt, wenn nichts droht (`ZFP.lowK`, sie bleibt im Bild – V17l);
  Schläge mit Ausholen, Treffer zur Zeit des Datensatzes (`ZDATA.WEAPONS[…].wind`), Durchziehen und Zurück (Axt, Beil, Brechstange
  schräg: über die rechte Schulter, von rechts oben herunter, die Klinge trifft in der Bildmitte, weiter nach links unten); beim Treffer bremst der Schlag
  kurz (Hit-Stop) und die Sicht wackelt; Rückstoß mit Mündungsfeuer und Licht auf Händen und Waffe; Gehen als liegende Acht, Drehen zieht
  nach, Rennen senkt, abruptes Stehenbleiben und Landen schwingen nach, Atmen stärker bei wenig Kraft. Tritt mit dem eigenen Bein (die
  Sohle kommt von unten ins Bild). Die Motorsäge angehoben: beide Hände an den Griffen, Schwert und Kette im Bild. Nachladen: die Flinte nach links gekippt, Kammern im unteren Drittel, die Läufe fallen, die Hülsen
  fliegen, die linke Hand holt zwei Patronen aus der Tasche und drückt sie von links in die Kammern (`ZFP.BRE`), die rechte hält den
  Schaft mit allen Fingern. In der Schulterkamera, im Auto, im Sitzen nichts davon. Ohne Figur (`?nofig`) einfache Arme als Ersatz.
  Feinstellen am Bild zur Laufzeit: `ZFP.POSE` (Waffenhaltungen), `ZFP.FIST`, `ZFP.HPOSE` (Finger), `ZFP.BRE`, `ZFP.KICK`, dann
  `GAME.shot()`.
- **Geräusche** (`z_ton.js`): Kampf aus 41 echten Aufnahmen (`dist/zombie/kampf/`, `kampf.json`; Hilfs-Agent `zombie-ton`, Nachweise
  `viz3/extra/zombie/quellen/CREDITS_TON.md` – OpenGameArt, CC0/CC BY 3.0/CC BY-SA 3.0): Schwung leicht/schwer (kommt mit dem Zuschlagen,
  nicht beim Ausholen), Faust, Tritt, stumpfer Treffer, Klinge, Stich, Knochen, Blut, Körper fällt, Schuss (12er, draußen mit Nachhall),
  Klicken leer, Kipplauf auf/zu, Patrone rein; Stöhnen, Angriff, Sterben der Zombies. Jede Variante zufällig, etwas schneller oder langsamer,
  nie zweimal dieselbe. Ohne Dateien synthetisch wie vorher.
- **Körper** (`z_state.js`): Leben, Kraft (Schläge, Rennen), Hunger (sinkt langsam; leer kostet Leben). Panel: Essen, Trinken, Verbinden,
  Warten (bis zum Abend), Zu zweit, Beenden (zweimal); am Handy startet es eingeklappt (Titel antippen), rechts Knöpfe für Schlag, R, Tritt
  und Taschenlampe. T: Taschenlampe (ein geliehenes Punktlicht). Tod: der Morgen danach im Garten, ein Drittel der
  Vorräte weg.
- **Häuser** (`z_haus.js` auf ZINNEN, `docs/features/zombie-innen.md`; in Wolfgangs Flur liegen Motorsäge und Axt): „Ins Haus gehen“ an der Haustür (Abblende), Durchsuchen (Beute je Behälter einmal, `ZDATA.LOOT`),
  Türen und Fenster verbarrikadieren (2 Bretter, Nägel, 2,6 s hämmern – hörbar), Bett (Zeit vergeht, wenn keiner nah ist), Radio, Ofen.
  Nachts riechen sie den Spieler im Haus (70 m), kommen an Türen und Fenster, hämmern auf die Bretter und steigen ein; drinnen finden sie
  den Weg von Raum zu Raum (`H.route` der Einrichtung) und drücken geschlossene Innentüren auf. Beim Start des Modus wärmt `ZINNEN.warm()`
  den einen Shader der Häuser vor – das erste Haus ruckelt nicht. Tagsüber lauern einige
  in den Häusern, in die sie morgens gegangen sind; manchmal versteckt sich dort ein Überlebender.
- **Zu zweit** (`z_netz.js`, Paket `dist/lazy/raum.js` = Trystero 0.26, MIT): im Panel „Zu zweit“ → „Raum erstellen“ gibt einen Code
  (z. B. `KLOSS7`) und einen Link (`?szenario=zombie&raum=KLOSS7`); der andere öffnet den Link oder tippt den Code bei „Beitreten“. Die Browser
  sprechen direkt miteinander (WebRTC), bekannt gemacht über öffentliche Nostr-Relais – kein eigener Server, nichts zu bezahlen. Der
  Gastgeber ist die Welt: seine Uhr, seine Zombies, die Sirene; beim Gast sind es Puppen (8 Bilder/s: Ort, Richtung, Gang, Leben, Glieder,
  tot). Seine Schläge gehen als Treffer zum Gastgeber, die Zombies jagen den Näheren und schlagen den Gast per Nachricht; neue kommen aus den
  Häusern bei beiden. Laut (Säge, Schuss, Motor, Hämmern) hören die Zombies des Gastgebers auch vom Gast, sein Auto schleudert sie weg, ein
  Treffer zählt für den, der schlug. Jeder sieht den anderen als seine Figur mit Namen, im Auto das Auto; Barrikaden sind gemeinsam; Vorräte,
  Waffen, Leben hat jeder für sich; die Waffe des anderen ist in seiner Hand zu sehen, seine Motorsäge zu hören. `?lokal=1`: zwei Fenster eines Browsers über einen BroadcastChannel (Test `zombie_netz`).
  Grenze: hinter manchen Mobilfunknetzen finden sich zwei Browser ohne Vermittlungsserver (TURN) nicht – dann im WLAN probieren.
- **Verbündete** (`z_bund.js`): Hubert und Ronald (will erst etwas zu essen) kommen mit, kämpfen, warten auf Zuruf – alles im Gespräch
  („Mit Hubert sprechen“ bleibt der Knopf, auch wenn er folgt; Themen „Hilfst du mir gegen die Zombies?“, „Komm mit“, „Warte hier“, „Wie
  sieht's aus?“);
  niedergeschlagen sind sie nur verletzt (Verbandskasten hilft auf, morgens wieder auf den Beinen). Überlebende aus Häusern gegen Essen; sterben
  sie, stehen sie als Zombies wieder auf. Der erste Verbündete gründet den Clan (Name im Panel).

## Testen

- `python3 viz3/test/run.py --port 8996 --serve zombie` (Logik, ~5 min), `zombie_kampf` (Gespräch mit Hubert als Verbündetem, Flinte auf
  seinem Tisch, Ich-Sicht jeder Waffe mit den Armen der Figur, Schwünge, Tritt, Schuss und Nachladen; Bilder), `zombie_look` (Bilder aus der Nähe, Gore, Nacht mit Lampe) und
  `zombie_netz` (zu zweit: zwei Seiten eines Browsers, `?lokal=1`; mit `zombie_netz:netz` über das Internet – nicht im Chat-Rechner, und der
  Testserver erlaubt mit `connect-src 'self'` keine Relais).
- Spielzustand ansehen: `ZSTATE` (Stand), `ZHORDE`, `ZWAFFE.info()`, `ZOMBIE.times()`; Zombies anhalten: `e.hold = 'idle' | 'walk' | …`.
- Beim Testen ohne Ton: die Sirene braucht einen Klick (Audio-Kontext).

## Für den Kern-Chat

- Haken außerhalb des Ordners: `dorf/dorf.js` (`DORF.S.hold` – abends und nachts keine Dorfbewohner), `npc/hours.js` (`w.keep` – Verbündete
  bleiben nachts draußen), `core/save.js` (`pav-zombie-v1`).
- Neue `window`-Namen: `ZDATA`, `ZSTATE`, `ZTON`, `ZFX`, `ZFIG`, `ZINNEN`, `ZHORDE`, `ZHAUS`, `ZWMOD`, `ZWAFFE`, `ZFP`, `ZBUND`, `ZHUD`,
  `ZNETZ`, `ZOMBIE`.
- Haken in `game/play.js` (HELD, markiert „feat/zombie“): `H.fp` (die Ebene zeichnet auch ohne Ding in der Hand), `H.post` (nach dem
  Platzieren: die Arme legen das Ding selbst und setzen die Hände daran), `H.fov` (eigenes Bildfeld der Ebene), `H.lamp`/`H.lampAt` (Licht
  des Mündungsfeuers auf Hand und Waffe).
- Neues Fremdpaket: `trystero` (npm, MIT) nur im eigenen Lazy-Paket `src/lazy/raum.js`; geladen erst, wenn jemand einen Raum öffnet.
- Ereignisse: `zombie:start|stop|phase|siren|night|survived|hurt|dead|kill|hit|loot|eat|weapon|enter|leave|barricade|ally|swing|treffer|schuss|reload|sawpull`.
- Ferne Zombies werden seltener animiert (über 22 m jedes zweite, über 45 m jedes dritte Bild; die Zeit summiert sich auf).
- Nichts läuft und nichts wird gebaut, bevor die Szene startet (Takte prüfen `Z.on`); Materialien von `plain` (keine eigenen Shader).
