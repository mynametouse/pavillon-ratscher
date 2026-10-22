# Versionen

Nächste freie Nummer beim Veröffentlichen vergeben (siehe docs/WORKFLOW.md, Abschnitt 5). Website-Commits auf `gh-pages`, Quellcode auf `src`.

| Version | Datum | Inhalt |
|---|---|---|
| V16b1 | 22.10.2026 | Korrektur: Auf Grafikkarten, die einem Shader nur 16 Texturen erlauben (viele Laptops, Macs, Telefone), fehlte seit V16b der Boden um den Garten (21 Texturen; der Himmel schien durch). Alle Kachel-Detailtexturen der Böden liegen jetzt in einem Textur-Array (`core/detail.js`, höchstens 15 je Shader), `GLCHECK` vereinfacht zur Laufzeit den Boden, statt ihn zu verlieren, neuer Test `gpu.py` (16er-Grenze, Boden an 7 Orten tags/nachts). Das Auto ist jetzt ein Kombi in Logan-MCV-Größe (4,47 m, größere Ladefläche, geteilte Hecktüren, Dachreling, Nebelscheinwerfer). |
| V16b | 22.10.2026 | Fahrzeuge: das eigene Auto (Stufenheck in Logan-Größe, Beige Sable) und ein Allradtraktor mit Frontlader und Palettengabel – Einsteigen (E), Fahren mit Automatik, Rückwärts, Handbremse, Licht, Hupe, Kamera hinterher oder Fahrersicht, Tacho, Kleinkarte mit Weg zur Klinge, am Telefon Kreis links und Knöpfe am Tacho, Menü „Fahrzeuge zurückstellen“. Straßen und Wege aus OpenStreetMap im Boden (Asphalt, Schotter, Feldwege, Markierungen), Brücken, Kollision mit allen Häusern und Bäumen; Gehen im ganzen Umkreis von 2,4 km. Luftbild-Boden farbtreuer (helle Äcker und Schotter nicht mehr wie Reif) und mit Gras-/Erdkorn in der Nähe; Hauswände im Dorf flimmern nicht mehr. Galeriebilder 22 und 23. |
| Umbau | 21.10.2026 | Quellcode im Repo (Branch `src`), Module in Fachordnern mit `modules.txt`, Schnell-Build mit `manifests.json`, `bootstrap.sh`, Test-Hilfen (`lib.py`, Grafikstufe voreingestellt: Laden 2 statt 6 min), Doku. Ausgabe byte-gleich zu V16a. |
| V16a | 21.10.2026 | Tag und Nacht nach der Spieluhr: echter Sonnen- und Mondstand über Ratscher, Sterne und Milchstraße, fließendes Licht (Himmelsfotos, HDRI und GI gemischt), Lampen automatisch, Werkstatt-LED mit Bewegungsmelder, Grillen, Nachbarn nachts daheim, Schlafen, Datum im Uhr-Fenster, Galeriebild „Vollmondnacht“. Weiche GI-Kanten, kein Lampenlicht mehr durch Wände auf Kies/Rasen. |
| V15b | 21.10.2026 | Werkstatt-Spiel: Stirnholz-Schneidebrett selbst bauen (Säge, Leimen, Zwingen, Hobel, Räuchern, Schleifen, Ölen, Brennen), Schutzausrüstung, Spielzeit, Blockbandsäge draußen. |
| V15a | 20.10.2026 | Menü und HUD statt Knopfleisten, Inventar, Spielfigur Mann/Frau mit Schulterkamera, Springen, Ducken, Kriechen, Hinlegen. |
| V14 | 19.10.2026 | Echte Umgebung von Ratscher aus offenen Geodaten, Spiel mit vier Aufgaben, Stimmen, Schallplatten; 360°-Bilder neu. |
| V13 | Okt. 2026 | Realismus: echte Figuren mit Sonnenschatten, gebackenes Licht, Foto-Materialien, Augenanpassung, Wolkenschatten. |
| V12 | Okt. 2026 | Draufsicht: Gebäude verschieben/drehen, Zäune ziehen, Planstand für alle veröffentlichen. |
| V11 | Okt. 2026 | Bach, Brücke, Werkstatt, 360°-Rundblicke. |

Geplant (Stufe 3, docs/plans/plan_stufe3.md): V16c Klinge, Fällen · V16d Stämme → Bretter → Trocknen · V16e Dorf nach Fotos.
