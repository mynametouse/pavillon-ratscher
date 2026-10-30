# Werkstatt Klingenholz: der Schuppen von heute (Bauphase 0) und die Halle des Plans (ab Bauphase 1)

Grundlage: Falkos Fotos vom 26.10.2026 (IMG_7270–7294, privat, nie ins Repo) und seine Nachricht vom 30.10.2026, 0:12: „vieles macht jetzt
in der Werkstatt keinen Sinn mehr, die Objekte sind nicht mehr nutzbar bzw. werden dort angezeigt, wo keine sind … In der Werkstatt ist
links zwar die Trommelschleifmaschine richtig und abgedeckt dargestellt (Holzmann ZS 560), aber man kann sie nicht aufdecken und nutzen. Die
Blockbandsäge steht eher zwischen den vorderen Balken der Werkstatt, wie auf den Fotos zu sehen (hier abgedeckt).“ Auftrag:
`docs/plans/auftraege/werkstatt-heute.md` (Branch `feat/werkstatt-heute`).

Regel (Falko 29.10.): **Bauphase 0 zeigt den Garten wie heute, alles Geplante kommt ab Bauphase 1.** In der Werkstatt heißt das: heute der
offene Pultschuppen der Fotos, ab Phase 1 die Halle mit Abrichte, Dickenhobel, Leimtisch, Räucherzelt, Trockenschrank und Holzlager.
`SAW_PH = 1` in `garden/workshop.js`.

## Was wo steht (Werkstatt-Koordinaten wie gebaut; aus dem Garten gesehen links = Osten)

| Was | Bauphase 0 (heute) | ab Bauphase 1 (Plan) |
|---|---|---|
| Gebäude | Pultschuppen x −5,6 … −0,6, y −40,5 … −38,0: drei Pfosten vorn und hinten, Pultdach aus dunklem Wellblech nach hinten fallend, Rückwand und Westende aus Sperrholz, Betonpflaster; **Anbau** im Osten bis x 1,2 unter lichtdurchlässigen Wellplatten | Halle x −6,6 … 3,6 mit Satteldach (unverändert) |
| **Blockbandsäge** | Kopf **zwischen den vorderen Pfosten** bei x −1,95, y −38,0 (zwischen den Pfosten x −3,1 und −0,66), **unter blauer Plane**; die Schienen laufen 7 m nach Norden auf **gestapelten Holzklötzen** (IMG_7290) | nördlich der Halle (x −1,5, y −34,85 … −27,85) auf Stahlfüßen |
| **Trommelschleifer Holzmann** (Typenschild auf dem Foto IMG_7285: **ZS 640P**; Falko schrieb „ZS 560“) | im Anbau vor der Bank mit der abgenutzten Platte, **unter blauer Plane und Klarsichtfolie mit drei Dachziegeln und einem Ziegelstein**; Vorschub von Osten (Typenschild-Seite) nach Westen | in der Halle (x 0,35 … 1,35, y −38,0) |
| **Tischkreissäge** | auf dem gelb-schwarzen Klappgestell im Westfeld vor der L-förmigen Sperrholzbank | in der Halle (x −5,05 … −3,75) |
| Dickenhobel, Abrichthobel, Leimtisch, Räucherzelt, Holzregal, PSA-Brett, Hobelbank, Auslaufwagen, Hocker, Werkzeugkiste | – | in der Halle |
| Bänke | L-förmige Sperrholzbank (Rückwand und Westende, darunter grüne Kiste und schwarze Box), weiße Bank im Ostfeld (unten Stirnholz-Rohlinge und der **Vorrat an Leimholzplatten**, darüber Zwingen und ein Brett für **fertige Bretter**), graue Schubladenschränke (D3-Leim, Wasserwaage), im Anbau die Bank mit abgenutzter Platte (schwarzer Hängeregisterschrank, kleiner Schraubstock, grüner Korb, Papierrolle, Schleifscheiben und Uhr an der Wand) | Hobelbank, Leimtisch, Regal |
| Schutzausrüstung | an Haken an der Rückwand zwischen Sperrholzbank und weißer Bank (Kapselgehörschutz, Brille, Masken, Handschuhe) | PSA-Brett |
| Licht | eine flache LED-Leuchte an einem Sparren (dasselbe Punktlicht, nur verlegt – kein neues Licht, keine neuen Shader) | drei LED-Leisten mit Bewegungsmelder |
| **Stromaggregat** (Benzin, oranger Rahmen) | westlich des Schuppens unter einer Tischplatte (IMG_7272/7273), Kabel zum Schuppen | an der Ostseite der Halle |
| Westlich | Werktisch, Reststücke auf einer Palette unter blauer Plane auf weißem Gestell, Schubkarre | Stammholz auf Kanthölzern, Hackklotz mit Axt, Kompost, Spaten |
| Holzlager (zwei Kanthölzer, `HOLZ.YARD0`) | – (Wiese; Stämme werden auf den Boden abgeladen) | nördlich der Säge |
| Trockenschrank | – (statt dessen: die 1-m-Stücke auf Leisten unter dem Pultdach, unter der Sperrholzbank) | an der Westwand der Halle |
| Trockenstapel | im Freien nordöstlich (vom Spieler angelegt, in beiden Phasen gleich) | |

Blockbandsäge und Aggregat sind **in jeder Phase da**: je eine Gruppe (`SAWG`, `GENG` in `garden/workshop.js`), die `WORKS.layout` je Phase
um einen Versatz verschiebt (`SAW.OFF`, `GEN.OFF`: Phase 0 / ab Phase 1). Derselbe Versatz verschiebt ihre Kollisionen, die Bänke, auf die
die Traktorgabel den Stamm legt (`werk/holz_saw.js` baut in der Gruppe), den Weg des Sägekopfs, die Töne, die Aktionen und die Tür-Einträge
der Maschinen (`WORKS.mpos`). Tischkreissäge und Trommelschleifer gibt es zweimal (Schuppen, Halle) – ein Tür-Eintrag je Maschine, dessen
Ort der Phase folgt. Wechselt die Phase, laufen `WORKS.onLayout`-Rückrufe: das Werkstatt-Spiel verlegt Stationen, Vorrat, Ablage, PSA,
Werkzeuge und Werkstücke (`werk/werk.js` `applyPhase`), die Säge legt ihren Stamm neu auf die Bänke, die Lampe zieht um.

## Aktionen in Phase 0

- **„Plane abnehmen (Blockbandsäge)“** vor dem Sägekopf, **„Plane abnehmen (Trommelschleifer)“** an der Nordseite des Schleifers; zurück mit
  „Plane auflegen …“, nur wenn die Maschine steht (die Säge fährt den Kopf vorher heim). Abgedeckt lassen sich beide nicht einschalten
  (`DOORS[k].can`, `game/walkable.js` `doorOn`), die Säge zeigt keine Schritte. Abgenommen liegt die Plane gefaltet daneben (beim Schleifer
  mit den Ziegeln). Gespeichert im Spielstand der Werkstatt (`pav-werk-v1`, Feld `cov`), Ereignis `werkstatt:plane` `{ k, on }`.
- **Maschinen ein/aus** wie bisher am Tür-Knopf (E): Tischkreissäge, Trommelschleifer (Strom vom Aggregat, `garden/garage_play.js` tankt es),
  Blockbandsäge (eigener Motor). Ton an ihrem Ort.
- **Blockbandsäge**: Stamm mit der Gabel längs auf die Bänke vor dem Schuppen, festklemmen, Einschnitt planen, Schnitt für Schnitt –
  wie bisher (`werk/holz_saw.js`); die Blöcke mit den Brettern liegen östlich der Schienen vor dem Anbau.
- **Werkstatt-Spiel (Stirnholzbrett)** mit dem, was der Schuppen hat:

| Schritt | Phase 0 | ab Phase 1 |
|---|---|---|
| Leimholzplatte holen | Vorrat unter der weißen Bank („… im Vorrat“) | Regal |
| Ablängen, Kanteln, Scheiben, Besäumen | Tischkreissäge auf dem Gestell | Tischkreissäge der Halle |
| Verleimen (Auslegen, Leim, Zwingen, Zulagen) | **mit Zwingen auf der Sperrholzbank** („Werkbank“) | Leimtisch |
| Leim abkratzen, Fasen, Schleifen, Wässern, Ölen, Brandzeichen | weiße Bank („Werkbank“), Exzenterschleifer, Werkzeug liegt dort | Hobelbank |
| Leimholz dicken | **am Trommelschleifer beidseitig plan schleifen** (Langholz bis 0,5 mm je Durchgang; kein Dickenhobel) | Dickenhobel |
| Stirnholzbrett plan | Trommelschleifer (Plane ab) | Trommelschleifer |
| Räuchern (wahlweise) | nicht angeboten (kein Räucherzelt; im Werkstattbuch vermerkt) | Räucherzelt |
| Eigene Bohlen zu Leimholz | lufttrocken (≤ 21 %) auf 1 m ablängen, **unter dem Pultdach nachtrocknen** (Gleichgewicht max(10,5; E − 2) %: im Sommer 11–12 %, im Winter ~19 %), unter 12 % → Leimholz in den Vorrat | Trockenschrank (9 %) → Regal |
| Fertige Bretter | aufs Brett über der weißen Bank | Regal, obere Ablage |

Texte (Karte, Werkstattbuch B, Gedanken, Tagebuch-Aufgabe „Ein Brett für Ronald“, PSA-Fenster) nennen in Phase 0 die Orte des Schuppens.
Wechselt die Phase, gehen Werkzeuge und Werkstücke, die in der Werkstatt liegen, an die Plätze der neuen Phase; ein Werkstück an einer
Station, die es dort nicht gibt (Dickenhobel, Räucherzelt), kommt in den Vorrat.

- **Hackplatz** (Hackklotz, Axt im Klotz, Scheite; Aufgabe „Feuer im Ofen“ gibt es ohnehin erst mit dem Ofen der Bibliothek) und das
  **Ammoniak** des Räucherzelts: erst ab Phase 1 (`game/quests.js` `chopPhase`, `werk/werk.js` `T.def0`).

## Testen

```bash
bash tools/browser_lock.sh python3 viz3/test/run.py --port 8993 --serve werkstatt_heute:nogeo=1   # ~3 min (mit Gelände ~5 min)
```

`viz3/test/werkstatt_heute.py` (27 Prüfungen): Start in Phase 0, beide Planen drauf; der Schuppen da, nichts von der Halle sichtbar; **kein
sichtbares Mesh im Bereich der Halle, das nicht von heute ist** (Mühle und Aggregat ausgenommen, Dinge nur auf dem Schuppen); **jede Aktion
mit Beschriftung im Werkstattbereich hat ein Objekt** (≤ 1,3 m); keine Aktion von Dickenhobel, Räucherzelt, Trockenschrank, Hackklotz;
Planen ab (gespeichert); abgedeckt lässt sich die Säge nicht einschalten; Trommelschleifer, Tischkreissäge, Blockbandsäge ein und aus (Ton,
Aggregat); je Maschine ein Arbeitsschritt (Tischkreissäge ablängen, Trommelschleifer Leimholz plan, Blockbandsäge klemmen/planen/Schwarte,
Werkbank fasen); Texte ohne Dickenhobel; eigene Bretter unter dem Pultdach statt im Trockenschrank, unter 12 % in den Vorrat; Phase 1: Säge
mit ihrem Stamm am Plan-Ort, Halle mit Hobel und Zelt, keine Plane; zurück in Phase 0. Bilder in `out/werkstatt_heute/`. Weiter grün halten:
`v15b` (ganzes Brett in der Halle), `v16d:fork,saw,stack` (Säge in Phase 1), `garage` (Aggregat tanken). Bei GitHub (`feat.yml`):
`viz3/extra/werkstatt-heute/tests.txt` (werkstatt_heute, garage, v15b); `v16d:fork,saw,stack` läuft im Prüfpaket als Feature v16d-2 (~45
min, zu lang für den Zweig-Lauf).

## Offen

- **Typ des Trommelschleifers**: das Foto zeigt „ZS 640P“, Falko schrieb „ZS 560“ – am Modell steht ZS 640P (wie auf dem Foto); Falko fragen.
- Die Lage der Kamerapunkte der Werkstattfotos (`meta.json`, Status „neu“) ist grob; die Aufteilung (Westfeld Säge, Ostfeld Sägekopf, Anbau
  Schleifer) folgt den Bildern IMG_7271, 7276, 7289, 7290. Maße des Schuppens wie vom Kern-Chat übernommen (5 m + 1,8 m Anbau, 2,5 m tief).
- Auf den Fotos gibt es noch mehr (Kreissägeblätter, Akku-Geräte, Kabeltrommeln, Gerümpel östlich des Anbaus: blaue Säcke, Alu-Gestelle) –
  nur zum Teil nachgebaut.
- Die Planen sind verformte Kästen (`drape` in `garden/workshop.js`: oben durchhängend, nach unten ausgestellt, Falten, unregelmäßiger
  Saum), keine Stoffsimulation; die abgenommene Plane ist ein gefaltetes Paket.
- Ronalds aufgenommene Sätze („… hobeln …“) bleiben allgemein.
