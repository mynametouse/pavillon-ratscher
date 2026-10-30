# Garten und Dorf mit der Wirklichkeit abgleichen – Quellen, Wege, offene Fragen

Stand 30.10.2026 (Kern-Chat). Falko (30.10. 0:19): „Achte auf weitere fehlende oder bisher falsch dargestellte Details in Garten und Dorf –
finde Strategien, die aufzuklären anhand diverser Datenquellen.“ Hier steht, welche Quellen es gibt, wofür sie taugen, wie man sie nutzt und
was noch offen ist. Private Rohdaten (Fotos, Videos, Flurstücke) kommen nie ins Repo – nur abgeleitete Maße, Lagen und Farben.

## Quellen

| Quelle | Was sie zeigt | Taugt für | Wie | Grenzen |
|---|---|---|---|---|
| Falkos Gartenfotos (125, 26.10.2026) | den Garten heute | Aussehen, Farben, Dinge, ungefähre Lage | Lagen im Artefakt „Gartenfotos verorten“ (db `lage`); Vergleich Foto / Modell nebeneinander (`scratchpad/views.py`, seit 30.10. mit dem echten Bildwinkel: 0,5× = 85,6° hoch, 1× = 50°) | Standorte ±3–6 m, Richtungen ±10–40° (von Hand gesetzt); Entfernungen nur grob |
| Artefakt „Garten zurechtrücken“ (30.10.) | – | Falko zieht Bäume und Häuser auf der Draufsicht dahin, wo sie stehen | db `garten`, je Baum/Haus ein Eintrag {x, y, r, h, kind, az, st} | so genau, wie Falko es weiß |
| Falkos Rundum-Video vom Anger (Ostern 2023) | Dorfmitte 360° | Häuser am Anger, Brunnen, Platz | Hilfs-Agent `dorfkern` (`docs/plans/auftraege/dorfkern.md`) | ein Standpunkt; GPS ±36 m |
| ~~Video vom Inneren Anger 15~~ | – | – | **nicht verwenden** (Falko 30.10. 0:27) | – |
| Luftbild `viz3/dist/geo/ortho_*.jpg` | älterer Zustand (ohne Wohnwagen und gelbe Hütte) | Kronen, Dächer, Wege, Hofflächen | `scratchpad/trees/ortho_model.py` legt es auf Modellachsen mit Gitter | älter als der Garten heute; Laub/Blüte je nach Jahreszeit |
| Luftbilder anderer Jahre (TLBG DOP, historisch) | Veränderungen | Was wann gebaut/gefällt wurde | über die Welt-Workflows auf GitHub Actions holen | Abruf über Actions, nicht aus dem Chat |
| DOM1/nDSM (GDI-Th) | Höhen von Kronen und Dächern | Baumstandorte und -höhen, Dachhöhen | Kronenmodell wie für die 21 000 Bäume um den Garten (`world/ratscher.js`) | Server zeitweise in Wartung, CAPTCHA – über Actions erneut versuchen |
| LoD2-Gebäude (Thüringen) | Grundriss, Dachform, Höhe | Dorfhäuser | Welt-Werkzeuge `tools/welt/` | keine Farben |
| OpenStreetMap | Wege, Häuser, Adressen | Wegeführung, Hausnummern | `viz3/dist/geo/roads.b64.json`, `buildings.b64.json` | Fehler möglich: die falsche Brücke am Feldweg (behoben 30.10.), Weg 5 am Eingang fraglich |
| Wikimedia Commons, Panoramax | Fotos aus dem Dorf | Fassaden, Schule, Brunnen | `tools/fotos/katalog.json` | wenige Bilder, teils alt |

## Vorgehen

1. **Ein Thema, alle Quellen:** erst Luftbild und Höhenmodell (wo steht was), dann Fotos (wie sieht es aus), dann Falko (was stimmt nicht).
2. **Messen statt schätzen:** Bildwinkel aus der Brennweite, Richtungen gegen bekannte Punkte im selben Foto prüfen (der Werkstatt-Unterstand,
   die gelbe Hütte, der Wohnwagen) – ein Foto, dessen Richtung nicht zu einem bekannten Punkt passt, zählt nicht.
3. **Was die Daten nicht klären, fragt ein Artefakt ab** (Foto-Lagen, Baum- und Hauslagen) statt einer langen Frage im Chat.
4. **Heute ≠ Plan:** was heute steht und mit dem Umbau verschwindet (Bäume am Unterstand), bekommt die letzte Bauphase (`site.js` Baum [5]).

## Gefunden und umgesetzt (30.10.2026)

- Feldweg ohne Brücke: der OSM-Abschnitt bei (37, 11,5) war fälschlich eine Brücke; der Bach folgt dem Weg auf dessen Südseite.
- Bäume: hinter dem Bungalow keine mehr, nur die große Erle an der Grenze zu Ronald hinter dem Waschhaus (15, 3,6); hinten im Garten der
  große Kirschbaum am Unterstand (2, −35,8), ein zweiter Kirschbaum am Westrand (−10, −36,4) – beide nur in Bauphase 0, weil dort später
  Halle und Holzlager stehen –, und der Apfelbaum in der Wiese (0,5, −22,5).
- Waschhaus: die Front nach Westen ist bemalt (drei Tafeln, Scherenschnitt-Art), 2,4 m breit.
- Stämme und weißer Bretterstapel liegen parallel zum Feldweg daneben (Stämme feldseitig, Stapel gartenseitig).
- Bungalow mit Überdach über dem Rückgiebel (zwei Pfosten, darunter alte Fenster, Bretter, Plane); Carport vorne nur zwei Pfosten.
- Huberts Hof: nur zwei der vier Flächen tragen Schuppen, die sind kleiner und flacher; Huberts Traktor ist grün mit roten Felgen, der
  zusätzliche geparkte Traktor ist weg.

## Offene Fragen (für „Garten zurechtrücken“ und die nächsten Runden)

- **Bungalow-Lage:** die iPhone-Standorte der Fotos 7224/7225 und das alte Luftbild (braunes Dach bei etwa (9, 8)) sprechen für eine Lage
  gut 6 m südlicher als im Modell (8,6, 15); andere Fotos passen zum Modell. Falko soll es auf der Draufsicht zeigen.
- **Gelbe Hütte:** mehrere Fotos (7256, 7258, 7267) sehen sie eher bei (5…7, −10) als bei (11,6, −3,4).
- **Weg 5** (OSM, vom Eingang nach Nordosten ins Feld): auf den Fotos 7188/7189 nicht zu sehen – gibt es ihn?
- **Huberts Hof genauer:** die Schuppen nach Luftbild und Fotos 7190–7196 (lange, niedrige, offene Schuppen hinten; die Gasse mit den
  Trockenhütchen am Gartenzaun), das Tor, die Kiesfläche.
- **Garten Nord:** die vier gemessenen Bäume mitten in der Wiese zwischen Tor und Bungalow sind weg (Foto 7201 zeigt dort offene Wiese); die Bäume am Bach bleiben – ob es genau diese sind, kann Falko im Artefakt zeigen.
