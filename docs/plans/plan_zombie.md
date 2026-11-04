# Zombie-Nacht – Plan (4.11.2026)

Falko, 4.11.2026 22:59 (wörtlich): „Okay, also wir starten zuerst mit dem Zombie-Szenario. Wie du gesagt hast, die Häuser sollen begehbar
sein. Es gibt ähm, Personen, die sich bei Ertönen der Silent Hill-Sirene in Zombies verwandeln und nachts herumstreifen und mich angreifen.
Ich muss aber auch die Möglichkeit haben, sie mit einer Motorsäge oder anderen Waffen, die ich finden kann, zu töten. Es kann Resident
Evil-artig auch brutal sein. Wir sind alle über 18 und es werden keine Kinder dieses Spiel jemals in ihre Hände bekommen. Ähm, Ansonsten im
Zombie-Modus entsprechende Features integrieren, die benötigt werden, um die Zombies in die Ferne zu schlagen und zu töten, auch umzufahren
mit Autos ähm, und sich entsprechend tagsüber vorzubereiten, Vorräte zu sammeln und Häuser zu verbarrikadieren und gegebenenfalls auch mit
anderen Überlebenden verbündete Clans bilden, mit denen man dann zusammen die Zombies fertig machen kann. Ähm, In der nächsten Iteration oder
gerne auch gleich eine Variante finden, wie man im Multiplayer-Modus gemeinsam gegen Zombies angehen kann, sodass 2 Spieler in 2 Browsern
übers Internet das Spiel gemeinsam spielen können. Und die Inneneinrichtung soll, wie du gesagt hast, typisch Thüringer Wald, Dorf-Style sein,
wobei jede Einrichtung durchaus auch interaktiv nutzbar sein soll und individuell gestaltet sein soll. Orientiere dich an echten Fotos, die
du finden kannst.“

## Entscheidungen

- Ein eigener Modus (Szene „Zombie-Nacht“, `?szenario=zombie`); das normale Spiel bleibt unberührt – nichts lädt oder läuft, bevor die Szene
  startet (Module unter `# feat/zombie` in `viz3/src/modules.txt`, Ordner `viz3/src/zombie/`).
- Zombies sind die **erfundenen** Dorfbewohner (`dorf/dorf_text.js`) und Fremden (`verkehr/verkehr_leute.js`). Hubert und Ronald sind
  echte Nachbarn: sie bleiben Menschen und können Verbündete werden.
- Die Sirene: echte Aufnahmen von Wikimedia Commons (E57-Motorsirene, Heulton, Neu-Ulm 2026 – „-stk“, CC BY-SA 4.0; Dorfsirene mit
  Kirchenglocken, Eschelbronn 2018 – „Nicor“, CC0), gekürzt und normalisiert in `viz3/extra/zombie/dist/zombie/`; ohne Dateien eine
  synthetische Motorsirene. Die Originalaufnahme aus Silent Hill wird nicht verwendet (Urheberrecht).
- Brutal (Falko: alle Spieler über 18): Blut, Lachen, abgetrennte Gliedmaßen (Knochen auf null skaliert, Stumpf, fliegendes Teil).
- Einrichtung nach echten Fotos (Freilichtmuseen Hohenfelden, Kloster Veßra, Fladungen; DDR-Wohnungen; Kontaktbögen auf `ref/zombie-innen-fotos`,
  nie gemergt) – Hilfs-Agent `zombie-innen`, Auftrag `docs/plans/auftraege/zombie-innen.md`, Stilnotizen `docs/plans/zombie_einrichtung.md`.

## Ablauf

Tag (5:30–20:30): vorbereiten – Waffen liegen im Garten (Spaten an der alten Garage, Beil am Holzhaus, Huberts Axt, Mistgabel an der
Ziegenweide, Brechstange und Motorsäge in der Werkstatt, Bockflinte im Haus des Jägers), Vorräte in Häusern und Autos, Häuser verbarrikadieren.
20:30 Sonnenuntergang (Hinweis), 21:00 Sirene: Dorfbewohner draußen verwandeln sich (knien, krampfen, stehen auf), mehr kommen aus den Häusern,
die Straßen leeren sich. Nacht: sie streifen umher, sehen dich (~14 m, hell ~24 m), hören Lautes (Motorsäge, Schuss, Motor, Hämmern), jagen
dich über ein Wegenetz um die Häuser, schlagen zu, hämmern auf Barrikaden. 5:30 Entwarnung: sie gehen in die Häuser zurück (einige lauern dort
tagsüber). Tod: der nächste Morgen im Garten, ein Drittel der Vorräte weg.

## Bausteine (`viz3/src/zombie/`)

| Modul | Aufgabe |
|---|---|
| `z_data.js` (ZDATA) | Waffen, Vorräte, Beute je Behälter, Zombies je Nacht, Zeiten, Texte |
| `z_state.js` (Z, `window.ZSTATE`) | gemeinsamer Stand: Modus, Lebensenergie, Kraft, Hunger, Vorräte, Entitäten, Häuser, Clan; `pav-zombie-v1`; Ereignisse `zombie:*` |
| `z_ton.js` (ZTON) | Sirene (Aufnahmen/Synthese) vom Mast der alten Schule mit Echo; Stöhnen, Fauchen, Treffer, Schuss, Herzschlag |
| `z_fx.js` (ZFX) | Blutstropfen, Lachen, fliegende Teile, Mündungsfeuer |
| `z_fig.js` (ZFIG) | Zombie-Figuren aus den Rocketbox-Figuren der Leute, Haltung, Gliedmaßen ab |
| `z_innen.js` (ZINNEN) | Häuser von innen (Hilfs-Agent) |
| `z_horde.js` (ZHORDE) | Verwandeln, Umherstreifen, Sehen, Hören, Jagen (Flussfeld 1,5 m), Zuschlagen, Sterben, Überfahren |
| `z_waffe.js` (ZWAFFE) | Waffen als Dinge in der Hand, Schlagen, Sägen, Schießen, Zustand, Benzin, Patronen |
| `z_haus.js` (ZHAUS, Runde 2) | Betreten (Tür-Übergang), Durchsuchen, Barrikaden, Schlafen, Radio; Zombies brechen ein |
| `z_bund.js` (ZBUND, Runde 3) | Überlebende, Hubert und Ronald als Verbündete, Clan |
| `z_hud.js` (ZHUD) | Anzeige, Treffer-Blitz, Todesbildschirm, Knöpfe am Handy |
| `z_modus.js` (ZOMBIE) | Szene, Tag/Nacht nach der Spieluhr, Sirene, Tod, Beenden, Aufgabe im Tagebuch |
| `z_netz.js` (Runde 4) | zu zweit über das Internet |

Kleine markierte Haken außerhalb: `dorf/dorf.js` (`DORF.S.hold`: abends und nachts keine Dorfbewohner), `core/save.js` (`pav-zombie-v1`).

## Runden

1. Modus, Sirene, Verwandlung, Zombies, Kampf (Spaten, Mistgabel, Brechstange, Beil, Sense, Huberts Axt, Motorsäge, Bockflinte), Überfahren,
   Lebensenergie/Kraft/Hunger, Anzeige, Tod. Test `viz3/test/zombie.py`.
2. Häuser begehbar mit Thüringer Einrichtung (ZINNEN), Durchsuchen, Barrikaden, Schlafen, Radio, Lauernde; Zombies brechen ein.
3. Verbündete und Clan.
4. Zu zweit: ein Browser ist Gastgeber (rechnet die Zombies), der andere tritt mit einem Raumcode bei; WebRTC-Datenkanal (Position, Blick,
   Waffe, Treffer, Zombie-Zustände 10×/s). Vermittlung: öffentliche Signal-Server (z. B. MQTT/Nostr über Trystero, kein eigener Server) oder
   ein kostenloser Cloudflare Worker – Falko entscheidet. Hinweis: manche Mobilfunknetze brauchen einen TURN-Server.

## Steuerung

Linke Maustaste (Maus gefangen) bzw. Klick, Taste Y oder der rote Knopf (Handy): zuschlagen; gedrückt halten: Motorsäge sägt. R: Flinte
nachladen, Motorsäge nachtanken. Panel: Essen, Trinken, Verbinden, Warten (bis zum Abend), Beenden (zweimal tippen).
