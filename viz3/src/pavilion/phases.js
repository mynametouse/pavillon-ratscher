// ===================== Bauphasen (31 Schritte): Bauweise, Material, Kosten – Variante A (Treppenturm), darunter die Abweichungen für Variante B =====================
// item: [Bezeichnung, Spezifikation, Menge, Einheit, Preis Kauf €/Einheit, Preis mit Eigenholz €/Einheit (null = gleich, 0 = entfällt)]
// Preise: Netto-Richtwerte Deutschland 2026 für Selbstbauer (Holzhandel/Baustoffhandel), ohne Arbeitszeit, ±25 %.
// "Eigenholz": Lärche/Fichte aus eigenem Wald, Bandsäge, luftgetrocknet (u ≤ 18 %); angesetzt ~25 % des Kaufpreises (Sägen, Trocknen, Hobeln, Ausschuss).
import { LATE } from '../core/late.js';
import { VARIANT } from '../core/head.js';
export const PHASES_A = [
  {
    name: 'Bestand',
    grp: 'Vorbereitung',
    short: 'Blechgarage auf der Betonplatte',
    days: '–',
    how: [
      'Ausgangslage: Blechgarage ca. 4 × 4 m (Dach laut Luftbild 4,5 × 6,3 m) auf einer Betonplatte, zwei Schiebetore nach Norden, Wohnwagen unter dem Carport, der grüne Bungalow nordöstlich davon neben dem Waschhaus unter der großen Erle, Holzhaus und Gewächshaus an der Ostgrenze, der offene Werkstatt-Unterstand am Südende, Kirschbäume und ein Apfelbaum.',
      'Vor dem Abbau: Platte vermessen (Rotationslaser), Fotos, Dicke und Frostschürze am Rand freigraben und messen. Danach entscheiden, ob die Grundfläche 4 × 4 oder größer wird.',
    ],
    check: [
      'Die Platte trägt später ca. 20 kN/m Linienlast unter den Außenwänden. Bewehrte Platte ≥ 15 cm mit Frostschürze: in Ordnung. Dünner oder unbewehrt: Streifenfundament 30 × 80 cm am Rand ergänzen (dann Genehmigungsfrage).',
      'Lage im Garten (Luftbild, ±1 m): ca. 7,4 m vom OG zur Westgrenze, ca. 7,5 m vom Turm zur Ostgrenze, 3,7 m vom Turm zum Holzhaus. Die Baumkrone östlich reicht an den Turm, Rückschnitt einplanen.',
    ],
    items: [['Rotationslaser (Tagesmiete), Maßband, Fotos', '', 1, 'psch', 60, null]],
  },
  {
    name: 'Garage versetzt',
    grp: 'Vorbereitung',
    short: 'Platte frei, Garage als Holzlager hinten',
    days: '2 Tage',
    how: [
      'Blechgarage schrauben lösen, Elemente nummerieren, mit vier Leuten tragen und am Südende des Gartens zwischen den Bäumen auf Punktfundamenten (Betonplatten) wieder aufbauen: Lager für das Klingenholz.',
      'Platte reinigen, lose Teile und Ölflecken entfernen, Risse mit Epoxid-Reparaturmörtel schließen, Eintrittsstufe aus Sandstein vor der späteren Turmtür (Ostseite) setzen.',
    ],
    check: ['Ebenheit der Platte: Abweichung ≤ 10 mm auf 4 m, sonst Ausgleich mit Fließspachtel unter den Schwellen.'],
    items: [
      ['Betonplatten 40 × 40 als Lagerfundament', 'Stück', 12, 'Stk', 4.5, null],
      ['Reparaturmörtel, Reiniger, Schrauben', '', 1, 'psch', 90, null],
      ['Sandstein-Trittstufe 100 × 40 × 15', 'Stück', 1, 'Stk', 120, 0],
    ],
  },
  {
    name: 'Abdichtung',
    grp: 'Sockel',
    short: 'Bitumen-Schweißbahn auf der Platte',
    days: '½ Tag',
    how: [
      'Bitumen-Voranstrich, dann Schweißbahn G200 S4 vollflächig mit dem Brenner aufschweißen, Stöße 8 cm überlappt. Sie sperrt aufsteigende Feuchte für Schwellen und Fußboden.',
      'Rand 5 cm vor der Plattenkante enden lassen, damit das Sockelblech später sauber ansetzt.',
    ],
    check: [
      'Die Bahn ist die einzige Feuchtesperre unter dem Haus: keine Beschädigung beim Ständerwerkbau (Baubohlen auslegen).',
    ],
    items: [
      ['Bitumen-Schweißbahn G200 S4', 'Rolle 5 m²', 4, 'Rollen', 42, null],
      ['Voranstrich bitumenhaltig 5 l', '', 1, 'Eimer', 28, null],
      ['Propan, Brennerleihe', '', 1, 'psch', 40, null],
    ],
  },
  {
    name: 'Schwellen und Anker',
    grp: 'Sockel',
    short: 'Schwellen 6/14, Verbundanker M12',
    days: '1 Tag',
    how: [
      'Schwellen KVH 6/14 (Lärche Kernholz) flach auf EPDM-Streifen, außen bündig mit der Plattenkante, mit Laser auf eine Höhe (Kunststoffkeile).',
      'Verbundanker M12 × 160 alle 80 cm (Bohrung 14 mm, Injektionsmörtel), an jeder Ecke zusätzlich ein Schwerlastwinkel. Die Anker übernehmen Windschub und Abheben.',
    ],
    check: ['Windschub je Wandseite ca. 12 kN; 6 Anker à 5 kN Scherkraft je Seite reichen mit Reserve.'],
    items: [
      ['Schwelle KVH 6/14 Lärche', 'lfm', 17, 'm', 6.2, 1.6],
      ['Verbundanker M12 × 160 inkl. Mörtel', 'Stück', 24, 'Stk', 7.5, null],
      ['Schwerlastwinkel 90 × 90 × 65 feuerverzinkt', 'Stück', 8, 'Stk', 9, null],
      ['EPDM-Schwellenstreifen 160 mm', 'lfm', 17, 'm', 2.4, null],
    ],
  },
  {
    name: 'Schraubfundamente Turm',
    grp: 'Sockel',
    short: 'Sechs Schraubpfähle + einer unter der Spindel, Schwellen, Plattenboden',
    days: '1 Tag',
    how: [
      'Treppenturm 2,6 × 3,7 m an der Ostseite: sechs Schraubfundamente Ø 76 mm, 1,2 m lang, unter Ost-, Süd- und Nordwand; die Westseite liegt auf dem Rand der Garagenplatte. Ein siebtes Fundament (Ø 89 mm, Kopfplatte 25 × 25 cm) genau unter der Treppenspindel. Kein Beton, kein Aushub.',
      'Schwellen Lärche 12/12 auf die Kopfplatten, Westschwelle mit Verbundankern auf die Platte. Boden im Turm aus Betonplatten 40 × 40 auf Splitt, Oberkante auf Höhe des Bibliotheksbodens (+0,30), davor eine Sandsteinstufe.',
    ],
    check: [
      'Last je Wandpfahl ca. 6 kN, Spindelfundament ca. 14 kN (Treppe + Personen auf beiden Windungen). Schraubfundamente tragen 15–25 kN im lehmigen Boden; die Probeeindrehung zeigt das Drehmoment.',
    ],
    items: [
      ['Schraubfundamente Ø 76 × 1200 mit Kopfplatte', 'Stück', 6, 'Stk', 95, null],
      ['Schraubfundament Ø 89 × 1600 für die Spindel', 'Stück', 1, 'Stk', 150, null],
      ['Eindrehgerät (Miete) oder Dienstleister', '', 1, 'psch', 180, null],
      ['Schwellen Lärche 12/12', 'lfm', 12, 'm', 11, 2.8],
      ['Splitt, Vlies, Betonplatten 40 × 40', 'm²', 8, 'm²', 22, null],
    ],
  },
  {
    name: 'Ständerwerk EG',
    grp: 'Erdgeschoss',
    short: 'KVH 6/14, Raster 62,5 cm, Stürze, Rähm',
    days: '3 Tage',
    how: [
      'Wände liegend auf der Platte zusammennageln und aufrichten: Ständer 6/14 im Raster 62,5 cm, oben zwei Rähmlagen 6/14, die obere über Eck verzahnt.',
      'Öffnungen: Doppelständer beidseitig, Sturz 2 × 6/20 hochkant, Brüstungsriegel 6/14. Unter den Kopfbändern (je Seite zwei) Doppelständer.',
      'Nagelung 2 × 6 × 180 durch die Schwelle, Rähm 2 × 6 × 160 je Ständer; Montage-Diagonalen aus Dachlatten bis zur Beplankung.',
    ],
    check: [
      'Knicklänge 2,35 m, Last je Ständer ca. 10 kN: 6/14 C24 unter 30 % ausgelastet. Sturz 2 × 6/20 über 1,9 m: Durchbiegung < 2 mm.',
    ],
    items: [
      ['Ständer, Riegel, Rähm KVH 6/14', 'lfm', 135, 'm', 6.2, 1.6],
      ['Sturzhölzer KVH 6/20', 'lfm', 12, 'm', 9.6, 2.4],
      ['Nägel, Schrauben, Lochplatten, Winkel', '', 1, 'psch', 180, null],
      ['Dachlatten 3/5 für Montagediagonalen', 'lfm', 40, 'm', 0.9, 0.3],
    ],
  },
  {
    name: 'OSB innen EG',
    grp: 'Erdgeschoss',
    short: 'OSB/3 15 mm als Scheibe und Luftdichtung',
    days: '1 Tag',
    how: [
      'OSB/3 15 mm raumseitig auf die Ständer: Randklammerung alle 10 cm, Feld alle 15 cm, Stöße auf Ständern. Alle Stöße und Anschlüsse an Schwelle und Rähm mit Klebeband luftdicht abkleben.',
      'Erst jetzt die Montagediagonalen entfernen: die OSB-Scheiben steifen das Haus aus.',
    ],
    check: [
      'Jede Wand hat ≥ 1,2 m geschlossene Scheibe neben den Öffnungen; Scheibentragfähigkeit > 25 kN je Wand bei 10 kN Windkraft.',
    ],
    items: [
      ['OSB/3 15 mm 2,5 × 1,25 m', 'Platte', 12, 'Stk', 32, null],
      ['Klebebänder, Primer', '', 1, 'psch', 90, null],
      ['Klammern 50 mm', '', 1, 'psch', 40, null],
    ],
  },
  {
    name: 'Dämmung EG',
    grp: 'Erdgeschoss',
    short: 'Holzfaser 140 mm + Dämmplatte 40 mm',
    days: '1 Tag',
    how: [
      'Flexible Holzfaserdämmung 140 mm mit 1 cm Übermaß zwischen die Ständer klemmen, fugenfrei.',
      'Außen Holzfaser-Dämmplatte 40 mm (Nut und Feder, hydrophobiert) als Winddichtung und zweite Dämmebene; Fensterlaibungen mit Kompriband.',
    ],
    check: [
      'U-Wert Wand ≈ 0,22 W/m²K. Innen OSB sd ≈ 2 m, außen Platte sd ≈ 0,2 m: diffusionsoffen nach außen, kein Tauwasser im Gefach.',
    ],
    items: [
      ['Holzfaserdämmung flexibel 140 mm', 'm²', 34, 'm²', 24, null],
      ['Holzfaser-Dämmplatte 40 mm N+F', 'm²', 36, 'm²', 16, null],
      ['Kompriband, Breitrückenklammern', '', 1, 'psch', 70, null],
    ],
  },
  {
    name: 'Deckenbalken',
    grp: 'Decke',
    short: 'Balken 10/24, Kragarme 0,9 m, Stichbalken West',
    days: '2 Tage',
    how: [
      'Deckenbalken KVH 10/24 im Raster 62,5 cm quer über Süd- und Nordwand, beidseitig 0,9 m Kragarm (das größere OG steht darauf). Randbalken 10/24 rundum.',
      'Westkragarm 0,9 m über Stichbalken 10/24, die 1,9 m zwischen die Deckenbalken zurückbinden (Balkenschuhe, Bolzen M12). Im Osten keine Auskragung: Die OG-Ostwand steht auf der EG-Wand, daneben der Turm.',
    ],
    check: [
      '10/24 C24, Feld 4,0 m, Kragarm 0,9 m mit Wand- und Dachlast (ca. 7 kN/m): σ ≈ 5 N/mm² (zul. 14), Durchbiegung am Kragarm ≈ 2 mm mit Kopfband.',
      'Stichbalken West: Rückverankerung 1,9 m zu Kragarm 0,9 m (2 : 1), Abhebekraft über 2 Bolzen M12 je Balken.',
    ],
    items: [
      ['Deckenbalken, Rand- und Stichbalken KVH 10/24', 'lfm', 118, 'm', 15.5, 3.9],
      ['Balkenschuhe 100/240, Winkel, Bolzen M12', '', 1, 'psch', 320, null],
    ],
  },
  {
    name: 'Kopfbänder und Turmpfosten',
    grp: 'Decke',
    short: 'Kopfbänder 12/12, Zuganker, Turmpfosten, Spindel',
    days: '2 Tage',
    how: [
      'Sechs Kopfbänder 12/12 Lärche unter den Kragarmen (45°), oben in den Randbalken gezapft, unten auf die Doppelständer, Bolzen M16. Sie halten die Außenwände des OG ruhig.',
      'Zuganker (Hold-down) an den vier Ecken: Stahlband vom EG-Ständerwerk bis in den Randbalken.',
      'Treppenturm: fünf Pfosten 12/12 Lärche (Ecken und Mitte der Ostwand) von der Schwelle bis unter den Turmkopf, zweiteilig mit Laschenstoß auf Podesthöhe. Podestbalken 10/24 in 2,7 m Höhe. Die Stahlspindel Ø 168 mm steht auf ihrem eigenen Fundament und wird oben am Kopfboden gehalten.',
    ],
    check: [
      'Kopfband nimmt bis 25 kN Druck; Zapfen 4 cm, Bolzen M16 mit Scheiben beidseitig. Turm 8,5 m hoch auf 2,6 × 3,7 m: Windlast ca. 0,8 kN/m², Kippmoment wird über die Verankerung an Platte und Schraubfundamenten (Zugpfähle) abgetragen.',
    ],
    items: [
      ['Kopfbänder 12/12 Lärche', 'lfm', 8, 'm', 9.8, 2.4],
      ['Zuganker Stahlband + Schrauben', 'Set', 6, 'Stk', 35, null],
      ['Turmpfosten 12/12 Lärche', 'lfm', 42, 'm', 11, 2.8],
      ['Podest- und Randbalken Turm 10/24', 'lfm', 14, 'm', 15.5, 3.9],
      ['Bolzen M16, Pfostenträger, Laschen', '', 1, 'psch', 260, null],
    ],
  },
  {
    name: 'Sichtschalung und OSB-Decke',
    grp: 'Decke',
    short: 'Lärche 24 mm N+F, OSB 22 mm, Podest',
    days: '2 Tage',
    how: [
      'Sichtschalung Lärche 24 mm Nut und Feder auf die Balken (fertige Decke des EG und Untersicht der Auskragung), verdeckt genagelt.',
      'Darauf OSB/3 22 mm verschraubt (Scheibe, Unterboden des OG). Im Turm Baubohlen auf die Podestbalken als Arbeitsfläche.',
    ],
    check: ['Die Decke wird erst durch die OSB-Scheibe zur steifen Platte; vorher keine Lasten aus dem OG aufbringen.'],
    items: [
      ['Sichtschalung Lärche 24 mm N+F gehobelt', 'm²', 30, 'm²', 34, 8],
      ['OSB/3 22 mm', 'm²', 30, 'm²', 14.5, null],
      ['Schrauben, verdeckte Nägel', '', 1, 'psch', 90, null],
      ['Baubohlen (Leihe)', '', 1, 'psch', 60, null],
    ],
  },
  {
    name: 'Ständerwerk OG und Turmwände',
    grp: 'Obergeschoss',
    short: 'OG 4,9 × 5,8 m, Rahmen 6/14; Turm 6/12',
    days: '3 Tage',
    how: [
      'OG-Wände als Holzrahmenwände auf der OSB-Decke: Schwelle, Ständer 6/14 im Raster 62,5 cm, Eckpfeiler 0,9 m geschlossen (Windscheiben), Stürze über den Fensterbändern.',
      'Westwand: raumhohe Festverglasung zwischen den Eckpfeilern, Pfosten 8/14 alle 1,0 m. Nord und Süd: Fensterband 1,4 m hoch mit 0,7 m Brüstung. Ostwand geschlossen mit Tür zum Turmpodest.',
      'Turmwände: Rahmen 6/12 ohne Dämmung (unbeheizt) in drei Geschossen (Plattformbauweise), Schlitzfenster neben der Wendeltreppe, Eingangstür in der Ostwand. Der Turmkopf über der Terrasse bekommt rundum ein Fensterband und die Tür zur Terrasse.',
    ],
    check: [
      'Windaussteifung OG: acht Eckscheiben à 0,9 m plus Ostwand, Zuganker an allen Ecken bis in die Decke. Turm: Wände als Scheiben (Lärchenschalung innen, Holzfaserplatte außen), Zuganker an jedem Eckpfosten.',
    ],
    items: [
      ['Ständer, Schwellen, Rähm, Riegel KVH 6/14', 'lfm', 190, 'm', 6.2, 1.6],
      ['Glaspfosten 8/14 West', 'lfm', 9, 'm', 8.4, 2.2],
      ['Turmwände KVH 6/12 (3 Geschosse)', 'lfm', 170, 'm', 5.4, 1.4],
      ['Nägel, Winkel, Zuganker', '', 1, 'psch', 260, null],
    ],
  },
  {
    name: 'Beplankung und Dämmung OG',
    grp: 'Obergeschoss',
    short: 'OSB 15 innen, Holzfaser 140 + 40; Turm Lärchenschalung + 16 mm',
    days: '2 Tage',
    how: [
      'OG wie das EG: OSB/3 15 mm innen geklammert und abgeklebt, Holzfaser 140 mm im Gefach, Dämmplatte 40 mm außen.',
      'Turm: innen gleich die sichtbare Lärchenschalung 15 mm (keine OSB nötig, unbeheizt), außen Holzfaserplatte 16 mm als Windsperre, keine Dämmung.',
    ],
    check: [
      'Luftdichtung OG an die Decke anschließen (Klebeband auf OSB-Boden); Blower-Door-Test nach den Fenstern lohnt sich.',
    ],
    items: [
      ['OSB/3 15 mm (OG)', 'm²', 40, 'm²', 10.5, null],
      ['Holzfaser 140 flexibel (OG 36 m²)', 'm²', 36, 'm²', 24, null],
      ['Holzfaser-Dämmplatte 40 mm (OG)', 'm²', 38, 'm²', 16, null],
      ['Lärchenschalung 15 mm innen (Turm)', 'm²', 66, 'm²', 16, 4],
      ['Holzfaserplatte 16 mm (Turm)', 'm²', 70, 'm²', 9, null],
      ['Klebebänder, Klammern', '', 1, 'psch', 110, null],
    ],
  },
  {
    name: 'Ringbalken und Dachbalken',
    grp: 'Dach',
    short: 'BSH 14/24 rundum, Dachbalken 12/24 e = 50 cm, Turmkopf',
    days: '2 Tage',
    how: [
      'Ringbalken Brettschichtholz GL24h 14/24 auf allen OG-Wänden, Ecken mit Stahlwinkeln. Er fängt die Dachbalken und trägt über den Glasfeldern.',
      'Dachbalken KVH 12/24 im Raster 50 cm in Ost-West-Richtung als Einfeldträger zwischen West- und Ostwand (4,9 m), 0,5 m Überstand rundum, Stichbalken Nord und Süd; am Turm enden die Balken an der Ostwand. Turm: Kopfbodenbalken 10/22 auf Terrassenhöhe, Dachbalken 8/20 für das Turmdach.',
      'Eigenholz statt BSH: Ringbalken aus 3 × 5/24 Lärche mit Stabdübeln verbunden (Statiker bestätigt den Verbund).',
    ],
    check: [
      '12/24 C24, Einfeld 4,9 m, 2,75 kN/m (Terrasse 4 kN/m² + Eigengewicht): σd ≈ 10 N/mm² (fm,d ≈ 14,8), Durchbiegung ≈ 14 mm = L/350. Schnee Zone 2 (1,1 kN/m²) nicht maßgebend.',
    ],
    items: [
      ['Ringbalken BSH GL24h 14/24', 'lfm', 22, 'm', 33, 9],
      ['Dachbalken, Rand-, Stichbalken KVH 12/24', 'lfm', 112, 'm', 18.5, 4.6],
      ['Kopfboden- und Dachbalken Turm 10/22, 8/20', 'lfm', 26, 'm', 13, 3.3],
      ['Balkenschuhe, Winkel, Schrauben', '', 1, 'psch', 280, null],
    ],
  },
  {
    name: 'Dachschalung',
    grp: 'Dach',
    short: 'Sichtschalung Lärche 24 mm',
    days: '1 Tag',
    how: [
      'Sichtschalung Lärche 24 mm N+F auf die Dachbalken: fertige Decke des Arbeitsraums, zugleich Arbeitsfläche. Am Turm endet die Schalung an der Turmwand (Anschluss mit Kehlblech).',
    ],
    check: ['Ab hier ist das Haus regengeschützt, aber noch nicht dicht: Plane bereithalten.'],
    items: [
      ['Sichtschalung Lärche 24 mm N+F', 'm²', 48, 'm²', 34, 8],
      ['Nägel', '', 1, 'psch', 40, null],
    ],
  },
  {
    name: 'Dampfsperre und Dachdämmung',
    grp: 'Dach',
    short: 'sd 100, Holzfaser 2 × 100 mm, Gefälle',
    days: '1 Tag',
    how: [
      'Dampfsperre sd ≥ 100 m auf die Schalung, Stöße verklebt, an der Attika hochgeführt.',
      'Aufdachdämmung Holzfaser-Dämmplatte 2 × 100 mm versetzt verlegt, druckfest; Gefälle 2 % mit Keilplatten zur Südwest-Ecke (Regenkette).',
    ],
    check: ['U-Wert Dach ≈ 0,18 W/m²K. Unbelüftetes Dach: die Dampfsperre muss lückenlos sein.'],
    items: [
      ['Dampfsperre sd 100', 'm²', 55, 'm²', 3.2, null],
      ['Holzfaser-Dämmplatte 2 × 100 mm druckfest', 'm²', 48, 'm²', 46, null],
      ['Gefälledämmung/Keilplatten', '', 1, 'psch', 340, null],
    ],
  },
  {
    name: 'Dachabdichtung',
    grp: 'Dach',
    short: 'OSB 22, EPDM 1,5 mm, Attikablech',
    days: '2 Tage',
    how: [
      'OSB 22 mm auf die Dämmung (Schrauben durch die Dämmung in die Balken), darauf EPDM 1,5 mm vollflächig verklebt, Ränder über die Attika auf ein Blech geführt.',
      'Attika/Blende aus pulverbeschichtetem Stahlblech mit 40 mm Tropfkante rundum, Notüberlauf und Ablauf in die Regenkette.',
    ],
    check: [
      'EPDM-Nähte 10 cm überlappt und mit Nahtband verklebt; Durchdringungen und Anschlüsse (Schornstein, Turmwand) mit Formteilen.',
    ],
    items: [
      ['OSB/3 22 mm', 'm²', 48, 'm²', 14.5, null],
      ['EPDM 1,5 mm inkl. Kleber, Nahtband, Formteile', 'm²', 55, 'm²', 23, null],
      ['Attikablech, Tropfkante, pulverbeschichtet', 'lfm', 30, 'm', 24, null],
      ['Ablauf, Notüberlauf', '', 1, 'psch', 140, null],
    ],
  },
  {
    name: 'Schornstein und Regenkette',
    grp: 'Dach',
    short: 'Edelstahl DW 150, 8,9 m; Regenkette Messing',
    days: '1 Tag',
    how: [
      'Schornstein Edelstahl doppelwandig DN 150 ab der EG-Decke (gedämmte Deckendurchführung, 5 cm Abstand zu Holz), durch das OG und das Dach (Dachflansch), Mündung 2,9 m über dem Terrassenbelag mit Regenhaube und Abspannung.',
      'Regenkette aus Messingringen vom Dachablauf an der Südwest-Ecke in ein Kiesbecken.',
    ],
    check: [
      'Mündung mindestens 1 m über der Brüstung (Aufenthaltsbereich) und 1 m von den PV-Modulen. Kehröffnung von der Terrasse aus.',
    ],
    items: [
      ['Schornstein Edelstahl DW 150, 8,9 m, Durchführungen, Kopf, Abspannung', 'Set', 1, 'Set', 1950, null],
      ['Regenkette Messing 6 m + Becken', '', 1, 'psch', 160, null],
    ],
  },
  {
    name: 'Fenster',
    grp: 'Hülle',
    short: 'Festverglasung EG, OG und Turm',
    days: '3 Tage',
    how: [
      'EG: Süd 1,8 × 1,4 m und 0,9 × 1,4 m (statt der früheren Haustür), West 1,9 × 1,4 m. OG: Westglas 4 Felder 1,0 × 2,15 m mit Oberlicht, Fensterbänder Nord und Süd 3,1 × 1,4 m in drei Feldern.',
      'Eigenbau: Rahmen Lärche 68 × 80 mm mit Glasfalz, Isolierglas 2-fach (Ug 1,1, warme Kante) auf Klötzen, Glasleisten außen, Dichtbänder, Entwässerung im Falz. Kaufvariante: Holzfenster 3-fach, Ug 0,6.',
      'Turm: Schlitzfenster neben der Spindel, Podestfenster, am Turmkopf rundum ein Fensterband 1,25 m hoch (Ausblick über den Garten). Einfachglas ESG 6 mm (unbeheizt).',
    ],
    check: [
      'Glasfläche OG ca. 17 m² bei 22 m²: West raumhoch, Bänder Nord/Süd mit 0,7 m Brüstung. Westglas ab 0 m: VSG innen oder Brüstungsstange in 0,9 m.',
    ],
    items: [
      ['Kaufvariante: Holzfenster 3-fach fertig (20 m²)', 'm²', 20, 'm²', 420, 0],
      ['Eigenbau: Isolierglas 2-fach Ug 1,1 warme Kante', 'm²', 20, 'm²', 0, 115],
      ['Eigenbau: Rahmenholz Lärche 68 × 80 gehobelt', 'lfm', 80, 'm', 0, 2.4],
      ['Eigenbau: Glasleisten, Klötze, Dichtbänder, Silikon', '', 1, 'psch', 0, 380],
      ['Turm: ESG 6 mm Fenster und Kopfband', 'm²', 17, 'm²', 85, null],
    ],
  },
  {
    name: 'Türen und Turmkopf',
    grp: 'Hülle',
    short: 'Turmtür, Bibliothekstür, OG-Tür, Terrassentür – alle nach außen',
    days: '3 Tage',
    how: [
      'Alle Türen öffnen nach außen – zum Turm, zum Garten oder zur Terrasse. In den Räumen geht keine Fläche für einen Türschwenk verloren. Turmtür (Eingang) Lärche 0,9 × 2,1 m mit Glasstreifen, Sicherheitsschloss, Dichtung, Regenschutzschiene und nicht aushebelbaren Bändern.',
      'Bibliothekstür und OG-Tür vom Turm aus, mit Glasfeld, Dichtung und Obentürschließer (sie bilden die thermische Hülle). Terrassentür am Turmkopf als Glastür, öffnet auf die Terrasse; der Glasaufbau auf dem Dach entfällt.',
    ],
    check: [
      'Ablauf: Turmtür → Flur 1,1 m → geradeaus die Bibliothekstür, links die Wendeltreppe. Der Turm ist ein unbeheizter Windfang: Türen mit Dichtung und Schließer, nach außen öffnende Türen mit Sturmhaken.',
    ],
    items: [
      ['Eigenbau Türen (4): Bänder, Schlösser, Dichtungen, Glas', 'Stk', 4, 'Stk', 0, 210],
      ['Kaufvariante: Turmtür, Bibliothekstür, OG-Tür fertig', 'Stk', 3, 'Stk', 780, 0],
      ['Terrassentür Glas am Turmkopf (Lärche, ESG)', 'Stk', 1, 'Stk', 690, 380],
      ['Türschließer, Sturmhaken', 'Stk', 4, 'Stk', 45, null],
    ],
  },
  {
    name: 'Hinterlüftung',
    grp: 'Hülle',
    short: 'Konterlattung und Traglattung 30/50',
    days: '2 Tage',
    how: [
      'Konterlattung 30/50 senkrecht auf jedem Ständer (Hinterlüftung, unten Insektengitter), Traglattung 30/50 waagerecht alle 62,5 cm. Fensterbänke und Sockelblech aus Aluminium mit 30 mm Tropfkante setzen.',
    ],
    check: ['Lüftungsquerschnitt ≥ 20 mm, unten und oben offen, damit die Verkleidung trocknet.'],
    items: [
      ['Konter- und Traglattung 30/50', 'lfm', 300, 'm', 0.95, 0.3],
      ['Insektenschutzgitter', 'lfm', 24, 'm', 4, null],
      ['Sockelblech, Fensterbänke, Bänder Alu/Stahl', 'lfm', 40, 'm', 19, null],
      ['Schrauben', '', 1, 'psch', 60, null],
    ],
  },
  {
    name: 'Yakisugi-Fassade',
    grp: 'Hülle',
    short: 'Lärche 22 × 160 geflammt, Deckleisten',
    days: '5 Tage',
    how: [
      'Lärchenbretter 22 × 160 mm senkrecht mit 20 mm Fuge, darüber Deckleisten 22 × 60 mm (Board and Batten). Edelstahl-Rillennägel, ein Nagel je Auflager mittig.',
      'Yakisugi: Bretter im Dreierbund (Kamin) oder mit dem Gasbrenner anflämmen, Kohle abbürsten, mit Leinöl einlassen; etwa 2 Stunden je 10 m². Haus, Auskragung und Turm gleich verkleidet: ein Körper. Im Modell lassen sich Material und Farbe für Haus und Turm getrennt ausprobieren (Taste „Fassade“).',
    ],
    check: [
      'Verkohlte Oberfläche ist 10–15 Jahre wartungsfrei; Brandschutzabstände zur Grenze und zum Bungalow nach ThürBO Gebäudeklasse 1 prüfen.',
    ],
    items: [
      ['Lärchenbretter 22 × 160 sägerau (EG 30 + OG 34 + Turm 66 m²)', 'm²', 130, 'm²', 36, 8],
      ['Deckleisten 22 × 60', 'lfm', 800, 'm', 1.3, 0.35],
      ['Gasbrenner, Propan, Bürsten', '', 1, 'psch', 160, null],
      ['Leinölfirnis 25 l', '', 1, 'psch', 240, null],
      ['Edelstahl-Rillennägel', '', 1, 'psch', 220, null],
    ],
  },
  {
    name: 'Wendeltreppe und Podest',
    grp: 'Treppen',
    short: 'Spindel Ø 2,16 m, Erde → OG: 14 × 19,2 cm, eine Umdrehung',
    days: '3 Tage',
    how: [
      'Spindeltreppe Ø 2,16 m im Turm: Stahlspindel Ø 168 mm auf eigenem Fundament, Stufen Eiche 45 mm an Konsolen der Spindel geschraubt, außen Stahlwange mit Rundstäben und Eichenhandlauf. Antritt im Flur an der Nordseite, die Treppe steigt gegen den Uhrzeigersinn und erreicht nach einer vollen Umdrehung das Podest vor der OG-Tür.',
      'Podest 2,4 × 1,1 m über dem Eingangsflur: Dielen auf den Podestbalken, Geländer zum Treppenauge.',
    ],
    check: [
      '14 Steigungen à 19,2 cm; Auftritt in der Gehlinie (Mitte der Laufbreite, r = 0,56 m) 25,0 cm: 2h + a = 63 cm. Nutzbare Laufbreite 0,95 m (DIN 18065, Wohngebäude ≤ 2 WE: ≥ 0,80 m, Auftritt ≥ 23 cm). Kopfhöhe unter der nächsten Windung 2,64 m, unter dem Podestbalken ≥ 2,0 m.',
    ],
    items: [
      ['Stahlspindel Ø 168 × 6,3 mm, 6,9 m, verzinkt, Kopf-/Fußplatte, Stufenkonsolen', 'Set', 1, 'Set', 1450, null],
      ['Stufen Eiche 45 mm, Kreissegment (13 + Podeststufe)', 'Stück', 14, 'Stk', 85, 25],
      ['Außenwange Stahl mit Rundstäben, Handlauf Eiche gebogen', 'Set', 1, 'Set', 1600, 1100],
      ['Podestdielen Lärche 28 mm', 'm²', 2.6, 'm²', 48, 11],
      ['Podestgeländer Stahl/Eiche', '', 1, 'psch', 240, 160],
    ],
  },
  {
    name: 'Wendeltreppe zum Dach',
    grp: 'Treppen',
    short: 'OG → Turmkopf: 15 × 19,75 cm, eine Umdrehung',
    days: '2 Tage',
    how: [
      'Zweite Windung vom Podest bis zum Turmkopf auf Terrassenhöhe (+5,95): 14 Stufen Eiche plus Austrittsstufe, gleiche Wange und Handlauf. Der Turmkopf hat einen Dielenboden über dem Flur, ein Geländer ums Treppenauge und die Glastür zur Dachterrasse.',
      'Der Turmkopf ist rundum verglast: Ausblick über Garten und Felder, auch bei Wind.',
    ],
    check: [
      '15 Steigungen à 19,75 cm; Auftritt in der Gehlinie 23,3 cm: 2h + a = 63 cm. Kopfhöhe unter dem Turmdach 2,5 m. Geländer am Treppenauge 1,0 m, Stäbe ≤ 12 cm Abstand.',
    ],
    items: [
      ['Stufen Eiche 45 mm, Kreissegment (14 + Austrittsstufe)', 'Stück', 15, 'Stk', 85, 25],
      ['Außenwange Stahl mit Rundstäben, Handlauf Eiche gebogen', 'Set', 1, 'Set', 1700, 1150],
      ['Boden Turmkopf Eiche 22 mm auf Balken', 'm²', 2.6, 'm²', 60, 15],
      ['Geländer Treppenauge Turmkopf', '', 1, 'psch', 280, 180],
    ],
  },
  {
    name: 'Terrassenbelag',
    grp: 'Terrasse',
    short: 'Stelzlager, Lärchendielen 28 mm, 32 m²',
    days: '2 Tage',
    how: [
      'Stelzlager auf Schutzvlies, Alu-Unterkonstruktion, Lärchendielen 28 × 145 mm mit 8 mm Fuge, 30 mm Abstand zur Attika und zur Turmwand. Die Terrasse liegt jetzt ohne Aufbau auf dem ganzen Dach; Zugang über die Tür am Turmkopf.',
    ],
    check: ['Belag drückt punktuell auf das EPDM: Vlies und große Stelzlagerteller (≥ 20 cm) verwenden.'],
    items: [
      ['Lärchendielen 28 × 145', 'm²', 34, 'm²', 48, 11],
      ['Stelzlager, Vlies', 'Stück', 135, 'Stk', 3.4, null],
      ['Unterkonstruktion Alu', 'lfm', 68, 'm', 4.2, null],
      ['Edelstahlschrauben', '', 1, 'psch', 110, null],
    ],
  },
  {
    name: 'Geländer, Windschutz, PV',
    grp: 'Terrasse',
    short: 'Seilgeländer 1,1 m, VSG West, 4 PV-Module Süd',
    days: '2 Tage',
    how: [
      'Pfosten 8/8 Lärche außen am Randbalken (2 × M12), Handlauf 11/4,5, Edelstahlseile 4 mm alle 11 cm, Höhe 1,1 m.',
      'West: Windschutz VSG 10 mm in Lärchenpfosten (Sonnenuntergang bleibt frei). Süd: vier PV-Module 400 Wp Glas-Glas als Brüstung mit Alu-Klemmen.',
    ],
    check: [
      'Geländerlast 0,5 kN/m horizontal; PV-Module als Absturzsicherung nur als Glas-Glas-VSG mit geprüfter Halterung, sonst hinter Seilgeländer.',
    ],
    items: [
      ['Geländerpfosten 8/8, Handläufe 11/4,5', 'lfm', 70, 'm', 6.5, 1.7],
      ['Edelstahlseil 4 mm, Terminals, Spanner', 'lfm', 380, 'm', 1.9, null],
      ['VSG 10 mm Windschutz', 'm²', 6.8, 'm²', 230, null],
      ['PV-Module 400 Wp Glas-Glas (4) + Halterung', 'Set', 1, 'Set', 880, null],
      ['Bolzen M12, Schrauben', '', 1, 'psch', 180, null],
    ],
  },
  {
    name: 'Fußböden',
    grp: 'Innenausbau',
    short: 'EG: XPS, OSB, Eiche; OG: Eiche',
    days: '3 Tage',
    how: [
      'EG: Lagerhölzer 8/12 alle 50 cm auf der Bitumenbahn, XPS 120 mm dazwischen, OSB 22 mm, Eichendielen 20 mm geölt.',
      'OG: Eichendielen 20 mm schwimmend oder verschraubt auf der OSB-Decke, Trittschallmatte 3 mm.',
    ],
    check: ['EG-Boden U ≈ 0,25 W/m²K; Randfuge 10 mm für Holzbewegung.'],
    items: [
      ['Lagerhölzer 8/12', 'lfm', 28, 'm', 4.6, 1.2],
      ['XPS 120 mm', 'm²', 12, 'm²', 21, null],
      ['OSB/3 22 mm (EG)', 'm²', 12, 'm²', 14.5, null],
      ['Eichendielen 20 mm geölt (EG 12 + OG 22 m²)', 'm²', 34, 'm²', 68, 16],
      ['Trittschallmatte, Öl, Schrauben', '', 1, 'psch', 160, null],
    ],
  },
  {
    name: 'Lehmputz',
    grp: 'Innenausbau',
    short: '15 mm zweilagig auf Schilfrohr, 70 m²',
    days: '4 Tage',
    how: [
      'Schilfrohrmatte auf die OSB tackern, Lehmunterputz 10 mm mit Gewebe, Lehmfeinputz 5 mm geglättet, unbehandelt. EG 32 m², OG 38 m².',
    ],
    check: [
      'Lehm speichert Wärme und Feuchte: gut für Ofenbetrieb und Winterpausen. Trocknung 2–3 Wochen bei offenen Fenstern.',
    ],
    items: [['Lehmputz 2-lagig inkl. Schilfrohr, Gewebe', 'm²', 70, 'm²', 29, null]],
  },
  {
    name: 'Ofen, Warmluft, Elektrik',
    grp: 'Innenausbau',
    short: 'Kaminofen 5 kW, Lüfterkanal 125 mm, 12 V/230 V',
    days: '3 Tage',
    how: [
      'Runder Kaminofen 5 kW mit Scheibe auf Schieferplatte, Hitzeschutz Schiefer an der Wand, einwandiges Rauchrohr bis zur Decke (heizt mit), Zuluft von außen. Abnahme durch den Schornsteinfeger.',
      'Warmluft nach oben: Kanal Ø 125 mm von der Deckenzone über dem Ofen in den Arbeitsraum, Rohrventilator 12 V (20 W, ca. 150 m³/h), Bodengitter als Rückluft am Südende. Bringt 300–500 W nach oben.',
      'Elektrik 12/24 V und 230 V: MPPT-Laderegler, Powerstation im Technikschrank unter der Bank im Turmflur, LED-Leuchten, USB- und Steckdosen, Kabel in Leerrohren hinter der OSB.',
    ],
    check: [
      'Wärmebedarf OG bei −10 °C ≈ 900 W: Lüfter 300–500 W plus Speicher des Lehmputzes; für Dauerbetrieb im Winter kleiner zweiter Ofen (3 kW) am eigenen Zug.',
      '4 × 400 Wp: Winter ca. 1,3 kWh/Tag, Sommer 5–6 kWh. Licht, Laptop, Musik, Lüfter: ja. Heizen: nein.',
    ],
    items: [
      ['Kaminofen 5 kW, Rauchrohr einwandig, Zuluft', 'Set', 1, 'Set', 1600, null],
      ['Schieferplatte Boden + Wand', 'm²', 2.6, 'm²', 95, null],
      ['Warmluftkanal Ø 125, Rohrventilator 12 V, Gitter, Schalter', 'Set', 1, 'Set', 190, null],
      ['Elektrik: Laderegler, Kabel, Leuchten, Schalter, Dosen', '', 1, 'psch', 820, null],
    ],
  },
  {
    name: 'Einbauten',
    grp: 'Innenausbau',
    short: 'Bücherwand EG, Sideboard OG, Garderobe im Turm, Lampen',
    days: '3 Tage',
    how: [
      'EG: eine Bücherwand an der Nordwand (1,6 m breit, raumhoch, 6 Böden) zwischen Kamin und Eingangszone, unten ein Holzfach direkt neben dem Ofen. Mehr Regale braucht der Raum nicht.',
      'OG: Sideboard Eiche 2,6 m an der Ostwand (Platten, Plattenspieler, Lautsprecher). Turmflur: Garderobenleiste und Schuhbank, darunter der Technikschrank mit der Powerstation. Papierlampen (Akari) im EG und OG, Schreibtischlampe.',
    ],
    check: ['Regale an den Ständern verschrauben (Lehmputz trägt keine Last).'],
    items: [
      ['Regalbretter Eiche 25 mm (ca. 0,25 m³)', '', 1, 'psch', 560, 150],
      ['Sideboard OG, Bank und Garderobe Turm (Eiche/Lärche)', '', 1, 'psch', 520, 150],
      ['Leuchten (Akari-Papierlampen 3, Schreibtischlampe)', '', 1, 'psch', 260, null],
      ['Beschläge, Schrauben', '', 1, 'psch', 90, null],
    ],
  },
  {
    name: 'Einrichtung',
    grp: 'Fertig',
    short: 'Möbel, Bücher, Textilien, Pflanzen, Terrasse',
    days: '2 Tage',
    how: [
      'Bibliothek (11,7 m²): Fensterbank West als Leseplatz, Daybed Süd 90 × 200 als Sofa und Gästebett, Lesesessel in der Ostecke schräg zum Ofen mit Lampentisch, Hocker, große Pflanze vor dem Südostfenster. Nur eine Bücherwand: die Mitte bleibt frei.',
      'Arbeits- und Musikraum (22 m²): Schreibtisch Eiche 1,65 × 0,7 m unter dem Südband (Tageslicht von vorn und links), zwei Loungesessel nebeneinander mit Blick durchs Westglas, leicht zueinander gedreht, Beistelltisch dazwischen; Stagepiano unter dem Nordband, Verstärker, Ukulele an der Wand; Sideboard mit Plattenspieler an der Ostwand.',
      'Dachterrasse (32 m²): zwei Liegen Lärche, Beistelltisch, Laterne, Pflanzkübel.',
    ],
    check: [
      'Laufwege (mit Kapsel 0,42 m geprüft): Bibliothekstür → Ofen und Fensterbank ≥ 0,9 m frei, vor der Ofentür 0,8 m frei; OG-Tür → Schreibtisch, Lounge und Piano je ≥ 0,9 m. Alle Türen schlagen nach außen auf, kein Möbel im Schwenkbereich.',
    ],
    items: [
      ['Matratze 90 × 200 + Bezüge', '', 1, 'psch', 420, null],
      ['Kissen, Decken, Sitzauflagen', '', 1, 'psch', 320, null],
      ['Sessel (3), Stuhl, Hocker', '', 1, 'psch', 980, null],
      ['Schreibtisch, Daybed, Liegen (Holz + Beschläge)', '', 1, 'psch', 640, 160],
      ['Teppiche 2 Stück', '', 2, 'Stk', 190, null],
      ['Pflanzen, Kübel, Laternen', '', 1, 'psch', 190, null],
    ],
  },
];
// ===================== Variante B (ohne Turm): Abweichungen je Phase; alles andere wie Variante A =====================
const PH_B = {
  0: {
    how: [
      'Ausgangslage: Blechgarage ca. 4 × 4 m (Dach laut Luftbild 4,5 × 6,3 m) auf einer Betonplatte, zwei Schiebetore nach Norden, Wohnwagen unter dem Carport, der grüne Bungalow nordöstlich davon neben dem Waschhaus unter der großen Erle, Holzhaus und Gewächshaus an der Ostgrenze, der offene Werkstatt-Unterstand am Südende, Kirschbäume und ein Apfelbaum.',
      'Vor dem Abbau: Platte vermessen (Rotationslaser), Fotos, Dicke und Frostschürze am Rand freigraben und messen. In dieser Variante steht das ganze Haus auf der Platte; nur das Obergeschoss kragt rundum 0,9 m aus.',
    ],
    check: [
      'Die Platte trägt später ca. 22 kN/m Linienlast unter den Außenwänden (das OG ist größer als in der Turmvariante). Bewehrte Platte ≥ 15 cm mit Frostschürze: in Ordnung. Dünner oder unbewehrt: Streifenfundament 30 × 80 cm am Rand ergänzen (dann Genehmigungsfrage).',
      'Lage im Garten (Luftbild, ±1 m): ca. 7,4 m vom OG zur Westgrenze und ca. 9 m zur Ostgrenze; ohne Turm bleibt im Osten mehr Abstand zum Holzhaus und zur großen Baumkrone.',
    ],
  },
  1: {
    how: [
      'Blechgarage schrauben lösen, Elemente nummerieren, mit vier Leuten tragen und am Südende des Gartens zwischen den Bäumen auf Punktfundamenten (Betonplatten) wieder aufbauen: Lager für das Klingenholz.',
      'Platte reinigen, lose Teile und Ölflecken entfernen, Risse mit Epoxid-Reparaturmörtel schließen.',
    ],
  },
  4: {
    name: 'Hauseingang',
    short: 'Sandsteinstufe vor der Haustür, Kiesstreifen',
    days: '½ Tag',
    how: [
      'Ohne Treppenturm entfallen die Schraubfundamente: Das Haus steht ganz auf der Garagenplatte, das Obergeschoss kragt auf allen vier Seiten 0,9 m aus.',
      'Vor der Haustür in der Ostwand eine Sandsteinstufe 1,2 × 0,5 m auf Splitt und Vlies, Oberkante auf Plattenhöhe; Kiesstreifen (Traufkante) rund ums Haus bis zum Gartenweg.',
    ],
    check: [
      'Die Haustür liegt unter der Ostauskragung und ist vor Schlagregen geschützt; die Stufe bekommt 2 % Gefälle vom Haus weg.',
    ],
    items: [
      ['Sandstein-Trittstufe 120 × 50 × 15', 'Stück', 1, 'Stk', 160, 0],
      ['Splitt, Vlies, Kies 16/32 für den Traufstreifen', 'm²', 8, 'm²', 14, null],
    ],
  },
  5: {
    how: [
      'Wände liegend auf der Platte zusammennageln und aufrichten: Ständer 6/14 im Raster 62,5 cm, oben zwei Rähmlagen 6/14, die obere über Eck verzahnt.',
      'Öffnungen: Doppelständer beidseitig, Sturz 2 × 6/20 hochkant, Brüstungsriegel 6/14. Ostwand mit Haustür und einem kleinen Fenster neben der Leitertreppe. Unter den Kopfbändern (je Seite zwei) Doppelständer.',
      'Nagelung 2 × 6 × 180 durch die Schwelle, Rähm 2 × 6 × 160 je Ständer; Montage-Diagonalen aus Dachlatten bis zur Beplankung.',
    ],
  },
  8: {
    short: 'Balken 10/24, Kragarme 0,9 m an allen Seiten, Bodenluke',
    how: [
      'Deckenbalken KVH 10/24 im Raster 62,5 cm quer über Süd- und Nordwand, beidseitig 0,9 m Kragarm (das größere OG steht darauf). Randbalken 10/24 rundum.',
      'West- und Ostkragarm 0,9 m über Stichbalken 10/24, die 1,9 m zwischen die Deckenbalken zurückbinden (Balkenschuhe, Bolzen M12). Zwei der östlichen Stichbalken sind zugleich die Wechsel der Bodenluke (0,83 × 1,30 m) über der Südostecke der Bibliothek: Der durchtrennte Deckenbalken hängt in Balkenschuhen an ihnen, ein Wechselbalken schließt die Luke nach Westen.',
    ],
    check: [
      '10/24 C24, Feld 4,0 m, Kragarm 0,9 m mit Wand- und Dachlast (ca. 8 kN/m, das Dach spannt jetzt 5,8 m): σ ≈ 5,5 N/mm² (zul. 14), Durchbiegung am Kragarm ≈ 2,5 mm mit Kopfband.',
      'Stichbalken West und Ost: Rückverankerung 1,9 m zu Kragarm 0,9 m (2 : 1), Abhebekraft über 2 Bolzen M12 je Balken. Lukenwechsel: Balkenschuhe 100/240 an beiden Enden.',
    ],
    items: [
      ['Deckenbalken, Rand-, Stich- und Wechselbalken KVH 10/24', 'lfm', 150, 'm', 15.5, 3.9],
      ['Balkenschuhe 100/240, Winkel, Bolzen M12', '', 1, 'psch', 400, null],
    ],
  },
  9: {
    name: 'Kopfbänder und Zuganker',
    short: 'Acht Kopfbänder 12/12, Zuganker an den Ecken',
    how: [
      'Acht Kopfbänder 12/12 Lärche unter den Kragarmen (je Seite zwei, 45°), oben in den Randbalken gezapft, unten auf die Doppelständer, Bolzen M16. Sie halten die Außenwände des OG ruhig.',
      'Zuganker (Hold-down) an den vier Ecken: Stahlband vom EG-Ständerwerk bis in den Randbalken.',
    ],
    check: [
      'Kopfband nimmt bis 25 kN Druck; Zapfen 4 cm, Bolzen M16 mit Scheiben beidseitig.',
      'Kippen, überschlägig: Wind auf das 5,8 m breite OG und die Brüstung ergibt ca. 95 kNm, das Eigengewicht (ca. 120 kN) hält mit rund 240 kNm dagegen. Die Zugkräfte an der Luvseite nehmen Zuganker und Verbundanker auf.',
    ],
    items: [
      ['Kopfbänder 12/12 Lärche', 'lfm', 11, 'm', 9.8, 2.4],
      ['Zuganker Stahlband + Schrauben', 'Set', 4, 'Stk', 35, null],
      ['Bolzen M16, Scheiben', '', 1, 'psch', 120, null],
    ],
  },
  10: {
    short: 'Lärche 24 mm N+F, OSB 22 mm, Luke ausgespart',
    how: [
      'Sichtschalung Lärche 24 mm Nut und Feder auf die Balken (fertige Decke des EG und Untersicht der Auskragung), verdeckt genagelt.',
      'Darauf OSB/3 22 mm verschraubt (Scheibe, Unterboden des OG). Die Bodenluke bleibt offen; bis die Leitertreppe steht, deckt ein verschraubter Bohlendeckel die Öffnung ab.',
    ],
    items: [
      ['Sichtschalung Lärche 24 mm N+F gehobelt', 'm²', 35, 'm²', 34, 8],
      ['OSB/3 22 mm', 'm²', 35, 'm²', 14.5, null],
      ['Schrauben, verdeckte Nägel', '', 1, 'psch', 100, null],
      ['Baubohlen (Leihe)', '', 1, 'psch', 60, null],
    ],
  },
  11: {
    name: 'Ständerwerk OG',
    short: 'OG 5,8 × 5,8 m, Rahmen 6/14',
    how: [
      'OG-Wände als Holzrahmenwände auf der OSB-Decke: Schwelle, Ständer 6/14 im Raster 62,5 cm, Eckpfeiler 0,9 m geschlossen (Windscheiben), Stürze über den Fensterbändern.',
      'Westwand: raumhohe Festverglasung zwischen den Eckpfeilern, Pfosten 8/14 alle 1,0 m. Nord und Süd: Fensterbänder 4,0 m lang, 1,4 m hoch mit 0,7 m Brüstung. Ostwand: Fensterband 2,0 m im Süden, im Norden geschlossen – dort steht die Leiter zur Dachluke.',
    ],
    check: [
      'Windaussteifung OG: acht Eckscheiben à 0,9 m plus 2 m geschlossene Ostwand, Zuganker an allen Ecken bis in die Decke.',
    ],
    items: [
      ['Ständer, Schwellen, Rähm, Riegel KVH 6/14', 'lfm', 210, 'm', 6.2, 1.6],
      ['Glaspfosten 8/14 West', 'lfm', 9, 'm', 8.4, 2.2],
      ['Nägel, Winkel, Zuganker', '', 1, 'psch', 220, null],
    ],
  },
  12: {
    short: 'OSB 15 innen, Holzfaser 140 + 40 mm',
    how: [
      'OSB/3 15 mm innen geklammert und abgeklebt, Holzfaser 140 mm im Gefach, Dämmplatte 40 mm außen – wie im EG.',
    ],
    items: [
      ['OSB/3 15 mm (OG)', 'm²', 42, 'm²', 10.5, null],
      ['Holzfaser 140 flexibel (OG)', 'm²', 38, 'm²', 24, null],
      ['Holzfaser-Dämmplatte 40 mm (OG)', 'm²', 42, 'm²', 16, null],
      ['Klebebänder, Klammern', '', 1, 'psch', 110, null],
    ],
  },
  13: {
    short: 'BSH 14/24 rundum, Dachbalken BSH 12/28 e = 50 cm, Dachluke',
    how: [
      'Ringbalken Brettschichtholz GL24h 14/24 auf allen OG-Wänden, Ecken mit Stahlwinkeln. Er fängt die Dachbalken und trägt über den Glasfeldern.',
      'Dachbalken BSH GL24h 12/28 im Raster 50 cm in Ost-West-Richtung als Einfeldträger zwischen West- und Ostwand (5,8 m), 0,5 m Überstand rundum, Stichbalken Nord und Süd. Für die Dachluke über der Leiter (0,82 × 1,38 m) sind zwei Balken ausgewechselt: Wechsel BSH 12/28 in Balkenschuhen, die kurzen Überstandsstücke dahinter mit Stahlwinkeln an den Wechsel gebunden.',
      'Eigenholz statt BSH: Ringbalken aus 3 × 5/24 Lärche mit Stabdübeln verbunden (Statiker bestätigt den Verbund); die Dachbalken bleiben BSH.',
    ],
    check: [
      '12/28 GL24h, Einfeld 5,8 m, 2,75 kN/m (Terrasse 4 kN/m² + Eigengewicht): σd ≈ 10 N/mm² (fm,d ≈ 14,8), Durchbiegung ≈ 16 mm = L/360. Mit 12/24 wäre es bei 5,8 m zu weich (L/230); deshalb liegt die Terrasse 4 cm höher als in der Turmvariante.',
    ],
    items: [
      ['Ringbalken BSH GL24h 14/24', 'lfm', 25, 'm', 33, 9],
      ['Dachbalken und Wechsel BSH GL24h 12/28', 'lfm', 82, 'm', 24, null],
      ['Rand- und Stichbalken KVH 12/24', 'lfm', 52, 'm', 18.5, 4.6],
      ['Balkenschuhe, Winkel, Schrauben', '', 1, 'psch', 340, null],
    ],
  },
  14: {
    how: [
      'Sichtschalung Lärche 24 mm N+F auf die Dachbalken: fertige Decke des Arbeitsraums, zugleich Arbeitsfläche. Die Dachluke bleibt ausgespart.',
    ],
    items: [
      ['Sichtschalung Lärche 24 mm N+F', 'm²', 52, 'm²', 34, 8],
      ['Nägel', '', 1, 'psch', 45, null],
    ],
  },
  15: {
    items: [
      ['Dampfsperre sd 100', 'm²', 60, 'm²', 3.2, null],
      ['Holzfaser-Dämmplatte 2 × 100 mm druckfest', 'm²', 52, 'm²', 46, null],
      ['Gefälledämmung/Keilplatten', '', 1, 'psch', 380, null],
    ],
  },
  16: {
    how: [
      'OSB 22 mm auf die Dämmung (Schrauben durch die Dämmung in die Balken), darauf EPDM 1,5 mm vollflächig verklebt, Ränder über die Attika auf ein Blech geführt.',
      'Dachluke: Aufsatzkranz aus Lärche, 17 cm über der Abdichtung, EPDM am Kranz hochgeführt und unter dem Abdeckblech geklemmt; innen ist der Schacht mit Lärche ausgekleidet.',
      'Attika/Blende aus pulverbeschichtetem Stahlblech mit 40 mm Tropfkante rundum, Notüberlauf und Ablauf in die Regenkette.',
    ],
    check: [
      'EPDM-Nähte 10 cm überlappt und mit Nahtband verklebt; Durchdringungen und Anschlüsse (Schornstein, Lukenkranz) mit Formteilen.',
    ],
    items: [
      ['OSB/3 22 mm', 'm²', 52, 'm²', 14.5, null],
      ['EPDM 1,5 mm inkl. Kleber, Nahtband, Formteile', 'm²', 62, 'm²', 23, null],
      ['Attikablech, Tropfkante, pulverbeschichtet', 'lfm', 28, 'm', 24, null],
      ['Aufsatzkranz Dachluke (Lärche, Blech, Formteile)', '', 1, 'psch', 180, 90],
      ['Ablauf, Notüberlauf', '', 1, 'psch', 140, null],
    ],
  },
  18: {
    short: 'Festverglasung EG und OG',
    how: [
      'EG: Süd 1,8 × 1,4 m und 0,9 × 1,4 m, West 1,9 × 1,4 m, Ost 0,6 × 1,4 m neben der Leitertreppe. OG: Westglas 4 Felder 1,0 × 2,15 m mit Oberlicht, Fensterbänder Nord und Süd 4,0 × 1,4 m in vier Feldern, Ost 2,0 × 1,4 m.',
      'Eigenbau: Rahmen Lärche 68 × 80 mm mit Glasfalz, Isolierglas 2-fach (Ug 1,1, warme Kante) auf Klötzen, Glasleisten außen, Dichtbänder, Entwässerung im Falz. Kaufvariante: Holzfenster 3-fach, Ug 0,6.',
    ],
    check: [
      'Glasfläche OG ca. 23 m² bei 27 m² Grundfläche: West raumhoch, Bänder Nord, Süd und Ost mit 0,7 m Brüstung. Westglas ab 0 m: VSG innen oder Brüstungsstange in 0,9 m.',
    ],
    items: [
      ['Kaufvariante: Holzfenster 3-fach fertig (25 m²)', 'm²', 25, 'm²', 420, 0],
      ['Eigenbau: Isolierglas 2-fach Ug 1,1 warme Kante', 'm²', 25, 'm²', 0, 115],
      ['Eigenbau: Rahmenholz Lärche 68 × 80 gehobelt', 'lfm', 100, 'm', 0, 2.4],
      ['Eigenbau: Glasleisten, Klötze, Dichtbänder, Silikon', '', 1, 'psch', 0, 460],
    ],
  },
  19: {
    name: 'Haustür und Dachluke',
    short: 'Haustür nach außen, Dachausstieg mit Glasdeckel',
    how: [
      'Haustür in der Ostwand des EG: Lärche 0,9 × 2,1 m mit Glasstreifen, Sicherheitsschloss, Dichtung, Regenschutzschiene und nicht aushebelbaren Bändern. Sie öffnet nach außen und liegt unter der 0,9 m tiefen Ostauskragung; innen geht keine Fläche für einen Türschwenk verloren.',
      'Dachausstieg über der Leiter: gedämmter Glasdeckel (Lärchenrahmen, Dreifachglas) auf dem Aufsatzkranz, an der Ostseite angeschlagen; er öffnet mit Gasdruckfedern auf etwa 100° und bleibt dort stehen. Von innen und außen zu öffnen, mit Sturmsicherung.',
    ],
    check: [
      'Der Dachausstieg ist der einzige Weg auf die Terrasse: Deckel mit Gasdruckfedern (mit einer Hand zu öffnen, die andere bleibt am Handlauf), innen ein Haltegriff. Fertige Flachdach-Ausstiege in dieser Größe kosten etwa 1.500 bis 2.500 €.',
    ],
    items: [
      ['Haustür Lärche 0,9 × 2,1 m (Eigenbau: Bänder, Schloss, Dichtung, Glas)', 'Stk', 1, 'Stk', 780, 210],
      ['Dachausstieg gedämmt mit Glasdeckel ca. 0,9 × 1,5 m, Gasdruckfedern', 'Stk', 1, 'Stk', 1650, 950],
      ['Türschließer, Sturmhaken', 'Stk', 2, 'Stk', 45, null],
    ],
  },
  20: {
    items: [
      ['Konter- und Traglattung 30/50', 'lfm', 180, 'm', 0.95, 0.3],
      ['Insektenschutzgitter', 'lfm', 20, 'm', 4, null],
      ['Sockelblech, Fensterbänke, Bänder Alu/Stahl', 'lfm', 40, 'm', 19, null],
      ['Schrauben', '', 1, 'psch', 50, null],
    ],
  },
  21: {
    how: [
      'Lärchenbretter 22 × 160 mm senkrecht mit 20 mm Fuge, darüber Deckleisten 22 × 60 mm (Board and Batten). Edelstahl-Rillennägel, ein Nagel je Auflager mittig.',
      'Yakisugi: Bretter im Dreierbund (Kamin) oder mit dem Gasbrenner anflämmen, Kohle abbürsten, mit Leinöl einlassen; etwa 2 Stunden je 10 m². Haus und Auskragung gleich verkleidet: ein Körper. Im Modell lassen sich Material und Farbe ausprobieren (Taste „Fassade“).',
    ],
    items: [
      ['Lärchenbretter 22 × 160 sägerau (EG 32 + OG 38 m²)', 'm²', 76, 'm²', 36, 8],
      ['Deckleisten 22 × 60', 'lfm', 470, 'm', 1.3, 0.35],
      ['Gasbrenner, Propan, Bürsten', '', 1, 'psch', 140, null],
      ['Leinölfirnis 15 l', '', 1, 'psch', 150, null],
      ['Edelstahl-Rillennägel', '', 1, 'psch', 140, null],
    ],
  },
  22: {
    name: 'Leitertreppe und Bodenluke',
    short: 'Bibliothek → Arbeitsraum: 13 × 20,5 cm, 63°, Luke 0,8 × 1,3 m',
    days: '2 Tage',
    how: [
      'Leitertreppe aus Eiche an der Ostwand der Bibliothek, sie steigt nach Süden: zwei Wangen 4,5 × 20 cm, zwölf Stufen 16 cm tief und 4 cm stark (offene Setzstufen, jede Stufe greift unter die nächste), lichte Breite 69 cm, Neigung 63°. Runde Handläufe aus Eiche beidseitig auf Stahlhaltern, oben 0,9 m über den Boden hinaus als Haltegriffe.',
      'Bodenluke 0,83 × 1,30 m im OG-Boden: Deckel aus Eichendielen auf Gratleisten, an der Nordkante angeschlagen, mit Gasdruckfedern. Meist steht er offen, senkrecht, und sichert die Luke nach Norden; Geländer aus Stahl und Eiche an der West- und Ostseite, Zugang von Süden.',
    ],
    check: [
      '13 Steigungen à 20,5 cm, Auftritt im Grundriss 10,5 cm, Stufen 16 cm tief: steiler als eine Treppe, bequemer als eine Leiter. Man steigt vorwärts hinauf und mit beiden Händen am Handlauf vorwärts oder rückwärts hinab. Kopfhöhe ab der zweiten Stufe ≥ 2,0 m.',
      'Baurecht: Nach der Thüringer Bauordnung (§ 34) muss ein Obergeschoss mit Aufenthaltsraum in der Regel über eine notwendige Treppe erreichbar sein; Leitern sind dort nur als Zugang zu Dachräumen ohne Aufenthaltsraum vorgesehen. Ob und wie das für dieses Gartenhaus gilt, später mit dem Bauamt klären.',
    ],
    items: [
      ['Wangen Eiche 45 × 200 mm, 3,0 m', 'Stück', 2, 'Stk', 120, 30],
      ['Stufen Eiche 40 × 160 mm, 0,69 m', 'Stück', 12, 'Stk', 22, 6],
      ['Handläufe Eiche Ø 42 mm + Stahlhalter', 'Set', 1, 'Set', 180, 90],
      ['Bodenluke: Deckel Eiche, Rahmen, Gasdruckfedern, Bänder', 'Set', 1, 'Set', 480, 260],
      ['Lukengeländer Stahl/Eiche (2 × 1,3 m)', '', 1, 'psch', 360, 220],
      ['Schrauben, Winkel, Wangenanschluss', '', 1, 'psch', 80, null],
    ],
  },
  23: {
    name: 'Leitertreppe zur Dachluke',
    short: 'Arbeitsraum → Dach: 15 × 20,7 cm, 63°',
    days: '1 Tag',
    how: [
      'Zweite Leitertreppe gleicher Bauart an der Ostwand des Arbeitsraums, sie steigt nach Norden bis auf den Aufsatzkranz der Dachluke (+6,09): vierzehn Stufen, Handläufe beidseitig, oben 1 m über den Kranz hinaus als Haltegriffe für den Ausstieg.',
      'Der Schacht durch die Dachkonstruktion ist mit Lärche ausgekleidet; bei offenem Deckel fällt Tageslicht bis auf die Leiter.',
    ],
    check: [
      '15 Steigungen à 20,7 cm, Auftritt im Grundriss 10,5 cm, Kopfhöhe ab der zweiten Stufe ≥ 2,0 m. Beim Ausstieg zuerst den Haltegriff fassen, dann über den 10 cm hohen Kranz auf die Terrasse treten.',
    ],
    items: [
      ['Wangen Eiche 45 × 200 mm, 3,4 m', 'Stück', 2, 'Stk', 135, 34],
      ['Stufen Eiche 40 × 160 mm, 0,69 m', 'Stück', 14, 'Stk', 22, 6],
      ['Handläufe Eiche Ø 42 mm + Stahlhalter', 'Set', 1, 'Set', 190, 95],
      ['Schachtverkleidung Lärche 20 mm', 'm²', 3, 'm²', 34, 8],
      ['Schrauben, Winkel', '', 1, 'psch', 60, null],
    ],
  },
  24: {
    short: 'Stelzlager, Lärchendielen 28 mm, 37 m²',
    how: [
      'Stelzlager auf Schutzvlies, Alu-Unterkonstruktion, Lärchendielen 28 × 145 mm mit 8 mm Fuge, 30 mm Abstand zur Attika und zum Lukenkranz. Die Terrasse liegt ohne Aufbau auf dem ganzen Dach (ca. 37 m²); Zugang durch die Dachluke an der Ostseite.',
    ],
    items: [
      ['Lärchendielen 28 × 145', 'm²', 40, 'm²', 48, 11],
      ['Stelzlager, Vlies', 'Stück', 160, 'Stk', 3.4, null],
      ['Unterkonstruktion Alu', 'lfm', 80, 'm', 4.2, null],
      ['Edelstahlschrauben', '', 1, 'psch', 120, null],
    ],
  },
  25: {
    short: 'Seilgeländer 1,1 m, VSG West, 4 PV-Module Süd, Lukengeländer',
    how: [
      'Pfosten 8/8 Lärche außen am Randbalken (2 × M12), Handlauf 11/4,5, Edelstahlseile 4 mm alle 11 cm, Höhe 1,1 m.',
      'West: Windschutz VSG 10 mm in Lärchenpfosten (Sonnenuntergang bleibt frei). Süd: vier PV-Module Glas-Glas als Brüstung mit Alu-Klemmen. Um die Dachluke ein Geländer an der Süd- und Westseite; nach Norden ist der Ausstieg frei, nach Osten sichert der offene Deckel.',
    ],
    items: [
      ['Geländerpfosten 8/8, Handläufe 11/4,5', 'lfm', 80, 'm', 6.5, 1.7],
      ['Edelstahlseil 4 mm, Terminals, Spanner', 'lfm', 420, 'm', 1.9, null],
      ['VSG 10 mm Windschutz', 'm²', 6.8, 'm²', 230, null],
      ['PV-Module Glas-Glas (4) + Halterung', 'Set', 1, 'Set', 880, null],
      ['Bolzen M12, Schrauben', '', 1, 'psch', 190, null],
    ],
  },
  26: {
    how: [
      'EG: Lagerhölzer 8/12 alle 50 cm auf der Bitumenbahn, XPS 120 mm dazwischen, OSB 22 mm, Eichendielen 20 mm geölt.',
      'OG: Eichendielen 20 mm schwimmend oder verschraubt auf der OSB-Decke, Trittschallmatte 3 mm; um die Bodenluke eine Eichenzarge, der Lukendeckel liegt geschlossen bündig im Boden.',
    ],
    items: [
      ['Lagerhölzer 8/12', 'lfm', 28, 'm', 4.6, 1.2],
      ['XPS 120 mm', 'm²', 12, 'm²', 21, null],
      ['OSB/3 22 mm (EG)', 'm²', 12, 'm²', 14.5, null],
      ['Eichendielen 20 mm geölt (EG 12 + OG 26 m²)', 'm²', 38, 'm²', 68, 16],
      ['Trittschallmatte, Öl, Schrauben', '', 1, 'psch', 170, null],
    ],
  },
  27: {
    short: '15 mm zweilagig auf Schilfrohr, 68 m²',
    how: [
      'Schilfrohrmatte auf die OSB tackern, Lehmunterputz 10 mm mit Gewebe, Lehmfeinputz 5 mm geglättet, unbehandelt. EG 32 m², OG 36 m².',
    ],
    items: [['Lehmputz 2-lagig inkl. Schilfrohr, Gewebe', 'm²', 68, 'm²', 29, null]],
  },
  28: {
    how: [
      'Runder Kaminofen 5 kW mit Scheibe auf Schieferplatte, Hitzeschutz Schiefer an der Wand, einwandiges Rauchrohr bis zur Decke (heizt mit), Zuluft von außen. Abnahme durch den Schornsteinfeger.',
      'Warmluft nach oben: Kanal Ø 125 mm von der Deckenzone über dem Ofen in den Arbeitsraum, Rohrventilator 12 V (20 W, ca. 150 m³/h). Bei offener Bodenluke steigt zusätzlich warme Luft direkt nach oben.',
      'Elektrik 12/24 V und 230 V: MPPT-Laderegler, Powerstation im Sideboard des Arbeitsraums, LED-Leuchten, USB- und Steckdosen, Kabel in Leerrohren hinter der OSB.',
    ],
    check: [
      'Wärmebedarf OG bei −10 °C ≈ 1.100 W (größer als mit Turm, mehr Glas): Lüfter 300–500 W plus offene Luke plus Speicher des Lehmputzes; für Dauerbetrieb im Winter kleiner zweiter Ofen (3 kW) am eigenen Zug.',
      '4 PV-Module: Winter ca. 1,3 kWh/Tag, Sommer 5–6 kWh. Licht, Laptop, Musik, Lüfter: ja. Heizen: nein.',
    ],
  },
  29: {
    short: 'Bücherwand EG, Garderobe, Sideboard OG, Lampen',
    how: [
      'EG: eine Bücherwand an der Nordwand (1,6 m breit, raumhoch, 6 Böden) zwischen Kamin und Eingang, unten ein Holzfach direkt neben dem Ofen; daneben eine Garderobenleiste neben der Haustür.',
      'OG: Sideboard Eiche 1,55 m an der Nordwand neben dem Piano (Platten, Plattenspieler, Lautsprecher, darin die Powerstation). Papierlampen (Akari) im EG und OG, eine kleine über dem Eingang, eine Wandleuchte an der Dachleiter, Schreibtischlampe.',
    ],
    items: [
      ['Regalbretter Eiche 25 mm (ca. 0,25 m³)', '', 1, 'psch', 560, 150],
      ['Sideboard OG und Garderobe (Eiche)', '', 1, 'psch', 420, 120],
      ['Leuchten (Akari-Papierlampen 4, Wandleuchte, Schreibtischlampe)', '', 1, 'psch', 330, null],
      ['Beschläge, Schrauben', '', 1, 'psch', 90, null],
    ],
  },
  30: {
    how: [
      'Bibliothek (11,7 m²): Fensterbank West als Leseplatz, Daybed Süd 90 × 200 als Sofa und Gästebett, Lesesessel in der Raummitte mit Blick auf Ofen und Westfenster, Lampentisch und Hocker. Die Leitertreppe nimmt die Südostecke, der Weg von der Haustür bleibt frei.',
      'Arbeits- und Musikraum (26 m²): Schreibtisch Eiche 1,65 × 0,7 m unter dem Südband, zwei Loungesessel mit Blick durchs Westglas, Stagepiano und Verstärker unter dem Nordband, Sideboard mit Plattenspieler daneben; Bodenluke mit Geländer im Südosten, Leiter zur Dachluke an der Ostwand.',
      'Dachterrasse (37 m²): zwei Liegen Lärche, Beistelltisch, Laterne, Pflanzkübel.',
    ],
    check: [
      'Laufwege (mit Kapsel 0,42 m geprüft): Haustür → Leitertreppe, Ofen und Fensterbank frei, vor der Ofentür 0,8 m frei; im OG von der Luke zum Schreibtisch, zur Lounge und zur Dachleiter frei. Die Haustür schlägt nach außen auf, die Lukendeckel stehen offen senkrecht.',
    ],
  },
};
export const PHASES_B = PHASES_A.map((p, i) => Object.assign({}, p, PH_B[i] || {}));
for (const L of [PHASES_A, PHASES_B])
  L.forEach((p, i) => {
    p.id = i;
    p.kauf = Math.round(p.items.reduce((s, it) => s + it[2] * it[4], 0));
    p.eigen = Math.round(p.items.reduce((s, it) => s + it[2] * (it[5] ?? it[4]), 0));
  });
// the live list (mutated in place when the variant changes)
export const PHASES = (VARIANT === 'A' ? PHASES_A : PHASES_B).slice();
LATE.PHASES = PHASES;
window.PHASES = PHASES;
window.PHASES_A = PHASES_A;
window.PHASES_B = PHASES_B;
