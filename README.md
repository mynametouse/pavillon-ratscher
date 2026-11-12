# ref/suhl-fotos – Kontaktabzüge und Karten zur Fotoabdeckung von Suhl (Arbeitszweig, wird nie gemergt)

Gemacht vom Hilfs-Agenten `suhl-fotos` (Zweig `suhl/fotos`, Dokument `docs/features/suhl-fotos.md`). Ein einzelner Commit ohne Vorgeschichte; er wird bei jedem neuen Stand ersetzt.

- `zentrum/` – Kontaktabzüge der Panoramax-Straßenfotos je Straße und Ort des Zentrums (je Blatt sechs Bilder, höchstens 1024 px; unter jedem Bild: Kennung, Ort, Blickrichtung, Datum, Urheber, Lizenz, Position, Bildwinkel). `index.json` nennt die Fotos je Blatt.
- `karten/` – Abdeckungskarten der Kernstadt und des Zentrums.
- `commons/` – Kontaktabzüge von Wikimedia-Commons-Fotos (nur wenn der Lauf in GitHub Actions fertig wurde), mit eigener `CREDITS.md`.
- `CREDITS.md` – Urheber, Lizenz und Quelle jedes Fotos.

Straßenfotos können Menschen und Kennzeichen zeigen (bei Panoramax verpixelt). Die Bilder bleiben auf diesem Zweig und gehen nicht in die App.
