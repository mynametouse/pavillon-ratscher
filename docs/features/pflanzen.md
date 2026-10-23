# Pflanzen-Datenbank des Gartenplaners (Branch `feat/pflanzen`)

Daten für den Gartenplaner (Konzept: Projektdokument `claude/pavillon-gartenplaner.md`), passend zum echten Garten bei Ratscher: Tallage am
Bach (~375 m), Auenlehm (pH geschätzt ~6), Spätfrostlage, Wühlmäuse, Ziegen beim Nachbarn im Osten. Felder und Prüfung: Vertrag
`viz3/src/gplan/gplan_schema.js`. Stand 23.10.2026.

## Was drin ist

| Datei (`viz3/extra/pflanzen/dist/gartenplaner/`) | Inhalt |
|---|---|
| `pflanzen.json` | 44 Arten und Sorten in allen Schichten: Baum 12, Kleinbaum 5, Strauch 13, Kraut 4, Boden 5, Wurzel 2, Kletter 3 – mit Größe, Wuchs, Licht, Boden, Frosthärte, Blüte und Spätfrostrisiko, Funktionen, Befruchtern, Nachbarn, Ernte, Pflege, Schutz beim Pflanzen, Grenzabstand-Kategorie, Bezug Kammbach, Farben für die Zeichnung und 1–4 Quellen je Pflanze (71 Quellen; in allen drei Dateien zusammen 85) |
| `regeln.json` | 19 Grenzabstand-Kategorien nach dem Thüringer Nachbarrechtsgesetz (§ 44 Nr. 1–7, § 45 Abs. 1 Nr. 1–4, § 50; Kräuter und Stauden ohne Abstand), Messregel (§ 47) und 29 Fakten mit Beleg: Ausnahmen und Fristen (§§ 46, 48, 49, 51–53 ThürNRG, § 39 BNatSchG, § 910 BGB) sowie Ratschläge zu Spätfrost, Staunässe, Wühlmäusen, Juglon, Befruchtung, Unterlagen, Ziegen, Bodenprobe und Waldgarten-Abständen |
| `gilden.json` | 5 Gilden: Apfel (Rebella), Zwetsche, Wildobst-Hecke an der Ostgrenze, nasse Stelle am Bach (Schwarzerle), warme Südwand am Pavillon (Quitte, Wein, Kiwibeere) |

Auswahl für die Lage: spät oder frostfest blühende Sorten (Apfel ‘Rebella’, ‘Rewena’, ‘Remo’ – schorfresistent, Befruchtung untereinander
belegt; Wangenheims Frühzwetsche; Süßkirschen ‘Regina’ + ‘Namare’ als geprüftes Befruchterpaar; Birnen ‘Conférence’ + ‘Clapps Liebling’;
Sauerkirsche ‘Jade’; Quitte, Mispel, Herbsthimbeere blühen spät), Walnuss ‘Nr. 26’ (spät austreibend), Stickstoffsammler (Schwarzerle,
Goumi, Sanddorn weiblich/männlich, Erbsenstrauch, Weißklee). Zweihäusige Arten (Sanddorn, Kiwibeere) haben männlich und weiblich als
eigene Einträge, damit der Planer fehlende Befruchter erkennt; die Maibeere nennt sich selbst als Befruchter (zweite Sorte nötig).
Frostgefährdete Triebe oder Blüten (Kiwibeere, Wein, Schwarze Johannisbeere) tragen `schutz: frostschutz`.

Fakten-Ids nach Thema (der Planer sucht per Muster die erste passende Id): Spätfrost `spaetfrost-tallage`, `spaetfrost-sortenwahl`,
`aprikose-pfirsich`; Nässe `auenlehm-grundwasser`, `staunaesse-steinobst`; Befruchtung `befruchtung-apfel`, `befruchtung-birne`,
`befruchtung-suesskirsche`; Wühlmäuse `wuehlmaus-drahtkorb`, `wuehlmaus-abwehrpflanzen`, `wuehlmaus-pflanzzeit`; Ziegen `ziegen-verbiss`;
Walnuss `juglon-walnuss`; Boden `bodenprobe`; Waldgarten `waldgarten-abstand`, `waldgarten-naehrstoffe`, `gilde-funktionen`, `unterlage-halbstamm`;
Recht `grenzabstand-landwirtschaft`, `grenzabstand-ausnahmen`, `grenzabstand-gewaesser`, `beseitigung-fuenf-jahre`, `hecke-rueckschnitt-nachbar`,
`gehoelzschnitt-schonzeit`, `grenzaenderung`, `verjaehrung`, `ueberhang`, `rebanlage`, `wald-abstand`.

## Wichtigste Quellen

- **Gesetz**: ThürNRG vom 22.12.1992, zuletzt geändert 8.3.2016 – Gesetzestext im Abdruck der Stadt Nordhausen (März 2017) und
  Landtags-Drucksache 6/1173 (Änderung 2016). Die amtliche Seite landesrecht.thueringen.de ließ sich nicht automatisch abrufen.
- **Sorten**: Julius Kühn-Institut (Rebella), Bundessortenamt (Beschreibende Sortenliste Steinobst 1997), LfULG Sachsen (Süß- und
  Sauerkirschen im Garten, Baumobst), LWG Bayerische Gartenakademie (Apfel- und Birnensorten, Unterlagen, Steinobst, Beerenobst, Quitte,
  Walnuss, Kiwibeere, Tafeltrauben, Rhabarber, Bodenprobe), KOB Bavendorf (spätfrostrobuste Sorten), BUND Lemgo (Befruchtertabelle Apfel).
- **Wildobst und Gehölze**: NW-FVA und FVA (Speierling, Elsbeere), LWF Wissen 67 (Sorbus in Thüringen), SDW (Schwarzerle), LLG Sachsen-Anhalt
  (Haskap), ALE Unterfranken (Aronia, Felsenbirne), Gartenakademie Rheinland-Pfalz und ProSpecieRara (Wildobst).
- **Grundwerte je Art** (Größe, Winterhärte, Boden, Licht): Plants For A Future (PFAF), dazu RHS und Garden Organic (Beinwell).
- **Rat**: LWF Merkblatt 31 (Spätfrost, Kaltluftseen), LTZ Augustenberg und Stadt Münster/LWK NRW (Wühlmäuse), Penn State Extension
  (Juglon), BfR (Bärlauch-Doppelgänger), AELF/LfL (Ziegen unter Obstbäumen), Hochschule Weihenstephan-Triesdorf und ein Schweizer Leitfaden
  (Waldgarten), WETCC Extension (Gilden).

Alle Texte sind in eigenen Worten geschrieben; übernommen sind nur Fakten. Abrufdatum aller Quellen: 23.10.2026.

## Was unsicher ist

- **Geschätzt** (aus Spannen, Standraum oder Wuchsbeschreibung abgeleitet, nicht wörtlich belegt): Höhe/Breite der Halbstämme,
  `pflanzhoehe_m`, `jahre_bis_endgroesse`, `lebensdauer_j` der meisten Arten; pH-Spannen dort, wo die Quelle nur „schwach sauer bis
  schwach alkalisch“ sagt; die Frosthärte aus USDA-Zonen (PFAF) umgerechnet; die Farben unter `darstellung`.
- **Spätfrostrisiko** (`bluete.spaetfrost`) ist eine Einordnung aus Blühzeit und Angaben der Quellen, kein Messwert. Für Ratscher fehlen
  noch belegte Klimawerte (letzter Frost, Winterminimum, Winterhärtezone) – nächster Schritt: DWD-Stationsdaten (z. B. Meiningen) auswerten.
- **Quitte**: Frosthärte widersprüchlich (PFAF −15 °C bzw. Zone 5; LWG „Holz frostempfindlich“) – eingetragen −20 °C.
- **Befruchtung**: bei Apfel nach JKI und der Befruchtertabelle (Rebella ← Rewena, Rewena ↔ Remo); bei Birne Conférence ↔ Clapps Liebling
  aus Arche-Noah-Sortenblatt und LWG (Conférence als guter Befruchter). Kornelkirsche: keine Angabe gefunden (`befruchtung: null`).
- **Grenzabstände**: Arten, die das Gesetz nicht nennt (Schwarzerle, Speierling, Elsbeere, Holunder, Kornelkirsche, Felsenbirne, Sanddorn,
  Erbsenstrauch, Kiwibeere, Mispel), sind nach ihrem Wuchs eingeordnet. Mittelstarke Apfelunterlagen kennt das Gesetz nicht – im Zweifel
  wie stark wachsend (2 m). Grenzt der Nachbar landwirtschaftlich an (Ziegenweide?), verdoppeln sich die Abstände (§ 46 Abs. 1). Keine
  Rechtsberatung.
- **Narzissen gegen Wühlmäuse**: kein Beleg; ähnliche Abwehrpflanzen wirkten in Versuchen nicht. Verlass ist nur auf den Drahtkorb.
- **Jostabeere** fehlt bewusst: die LWG nennt sie im Anbau problematisch und empfiehlt großfrüchtige schwarze Johannisbeeren (z. B. ‘Big Ben’).

## Was Falko prüfen sollte

1. **Bodenprobe** (LWG-Merkblatt 1201): je Fläche 10–15 Einstiche, 25–30 cm tief, gemischt ins Labor – pH, Phosphat, Kalium, Magnesium;
   dazu mit dem Spaten prüfen, wo der Boden nach Regen nass bleibt (Staunässe) und wie tief das Grundwasser steht.
2. **Bei Kammbach erfragen**: welche der Sorten (oder gleichwertige spätblühende, schorfresistente) es gibt, auf welcher Unterlage
   (Halbstamm auf Sämling bzw. Brompton/Vogelkirsche für schweren Boden), ob Wildobst (Speierling, Mispel, Maibeere, Goumi) und die
   Kiwibeere zu bekommen sind. Die Datenbank kennt nur die Kategorien der Website (Stand 22.10.2026).
3. **Grenzen und Nachbarn**: Nutzung der Nachbarflächen (Ziegenweide, Acker → doppelte Abstände) und ob der Bach ein eigenes Flurstück ist
   (dann kein Abstand zum Bach).

## Prüfung

`viz3/test/unit/pflanzen.test.mjs` (läuft in `bash tools/check.sh`): die drei Dateien bestehen den Vertrag ohne Fehler, Warnungen und
Entwürfe; 30–50 Pflanzen in allen Schichten; jede Quelle wird benutzt; jede Grenzabstand-Kategorie existiert; jeder Apfel, der einen
Befruchter braucht, hat einen unter den Äpfeln der Datenbank; Befruchter-Ids existieren; die Walnuss hält Abstand (Juglon); Gilden nutzen
nur bekannte Pflanzen. Kein Browsertest (`viz3/extra/pflanzen/tests.txt`).
