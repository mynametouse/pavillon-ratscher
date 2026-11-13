# Farbe: Suhl wie geflogen und an die übrige Welt angeglichen

`naht_vorher_nachher.jpg`: die Nordkante von Testblock B (N 5 600 400) an vier Stellen des Straßenkorridors. In jeder Hälfte oben die
Suhl-Kachel (Stufe 10), unten die Kachel von Block B, wie sie heute auf der Website liegt. Links: Suhl in den Farben des Bildflugs
(15.05.2024). Rechts: Suhl angeglichen an die Farben der übrigen Welt (Bezug: Bildflug am Garten, 07.04.2024).

Gemessen an 7 Kacheln, je 24 Bildzeilen (19 m) beiderseits der Linie, Suhl minus Block B, Mittel der Grauwerte Rot / Grün / Blau
(`naht.json`):

| | Rot | Grün | Blau | größter Wert einer Kachel |
|---|---|---|---|---|
| wie geflogen | −27,6 | −34,2 | −39,0 | 41,7 |
| angeglichen | −0,5 | −0,6 | +0,1 | 4,0 |

Entschieden am 13.11.2026 (Suhl-Chat): angeglichen (`garten-2024-04-07`). Der Schalter `--farbe wie-geflogen` baut die andere Fassung
jederzeit aus dem Cache. Werkzeug: `tools/suhl/boden/farbe.py`. Luftbild © GDI-Th, CC BY 4.0.
