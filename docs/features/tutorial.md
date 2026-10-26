# Einfacheres Menü und Einführung für Anfänger

Falko, 26.10.2026: „Das Menü ist total überladen, bitte vereinfachen, sodass man sich auch als Anfänger leicht zurechtfindet. Überlege dir
ein Konzept für ein Tutorial und setze es um.“

## Das Konzept

**Ausgangslage:** Das Menü war eine lange Liste mit acht Abschnitten und über 60 Knöpfen. Orte, Szenen, Bauphase, Licht, Variante,
Spiel, Gestalten, Einstellungen und Steuerung standen gleichrangig untereinander, auf dem Handy mehrere Bildschirmhöhen lang. Wer neu war,
fand weder „Losgehen“ noch Hubert noch die Aufgaben. Eine Einführung gab es nicht, nur einzelne „Neu: …“-Hinweise für Wiederkehrer.

**Drei Grundsätze:**

1. **Erst das Wichtigste, der Rest eine Ebene tiefer.** Die Startseite des Menüs zeigt nur: *Weiter*, für Neue *Neu hier? Einführung*,
   *Aufgaben* und *Inventar*, dazu fünf Bereiche mit Symbol und einer Zeile Erklärung. Alles andere liegt auf der Seite seines Bereichs,
   jede mit Titel und Zurück-Knopf (‹, auch Rücktaste). Die Startseite passt auf ein Handy ohne Scrollen.
2. **Lernen durch Tun, nicht durch Lesen.** Die Einführung ist kein Text zum Durchklicken. Eine kleine Karte oben im Bild sagt, was als
   Nächstes zu tun ist, und merkt selbst, wann es getan ist. Dann kommt der nächste Schritt. Was gemeint ist, leuchtet (orange pulsierender
   Rand).
3. **Nie im Weg.** Jeder Schritt lässt sich überspringen, die Einführung jederzeit schließen (×). Sie erscheint nur einmal von selbst, für
   jemanden, der das erste Mal da ist, und danach nur auf Wunsch. Der Text passt zum Gerät (Tasten und Maus oder Finger).

### Das Menü

| Seite | Inhalt |
|---|---|
| **Start** | Weiter · Neu hier? (bis die Einführung fertig oder geschlossen ist) · Aufgaben · Inventar · die fünf Bereiche |
| **Hingehen** | Von außen (Modell, Draufsicht) · Pavillon · Garten · Nachbarn (Hubert, Ronald und die Ziegen, Werkstatt) · Weiter weg (Dorf, Schleusingen, Kloster Veßra) · Fahrzeuge |
| **Erleben** | Szenen (Skatabend, Feuer, Wahlkampf …) · Tageszeit und Licht |
| **Gestalten** | Möbel planen, Garten planen, Fassade, Einrichtung, Gartengebäude, Teilen · Bauphase · Variante |
| **Einstellungen** | Ton und Lautstärke · Spielfigur, Spielzeit, Ansicht, Maus · KI-Gespräche, Grafik, Kollision, Vollbild |
| **Hilfe** | Einführung · Steuerung · Wenn etwas klemmt (Fahrzeuge zurückstellen, Bäume aufstellen, Leistungstest, Fehlerbericht) |

Beim Öffnen steht das Menü immer auf der Startseite. `Esc`/`M` schließt es wie bisher.

### Die Einführung (etwa zwei Minuten, neun Schritte)

| # | Schritt | Was die Karte sagt | Fertig, wenn … |
|---|---|---|---|
| – | Willkommen | Was das hier ist; „Einführung starten“ oder „Selbst erkunden“ | eine Wahl getroffen ist |
| 1 | Hineingehen | unten rechts „Losgehen“ (in der Draufsicht: Menü → Hingehen → Garten) | man im Garten steht (entfällt, wenn schon) |
| 2 | Gehen | `W A S D`/Pfeile, `Shift` rennt – am Handy: Daumen auf den Kreis links unten | man 3 m gegangen ist |
| 3 | Umschauen | Klick ins Bild, dann dreht die Maus (oder ziehen) – am Handy: wischen, zwei Finger zoomen | man sich um 70° gedreht hat |
| 4 | Das Menü | ☰ oben rechts (Taste `M`): dort ist alles | das Menü offen ist |
| 5 | Schnell hingehen | „Hingehen“ → „Hubert“ (der Text folgt der Seite, auf der man gerade ist) | man über das Menü bei Hubert ist |
| 6 | Mit Hubert reden | nah heran, bis „Sprechen“ erscheint, dann tippen oder `E` – nachts: er ist zu Hause, die Uhr stellt die Zeit vor (Knopf „Weiter“) | das Gespräch offen ist |
| 7 | Im Gespräch | ein Thema wählen (mit KI-Schlüssel: einfach reden), „Tschüss“ beendet | das Gespräch zu ist |
| 8 | Aufgaben | im Menü oder `J`, oben links die aktuelle | die Aufgabenliste offen ist |
| 9 | Geschafft | wo der Rest steht (Gestalten, Erleben, Einstellungen), die Einführung unter Hilfe | „Los geht’s“ |

Bewusst **nicht** in der Einführung: Werkstatt, Fahren, Planen, Garten, Dorfabende. Das sind Dinge zum Entdecken. Die Aufgaben der
Nachbarn führen ohnehin dorthin, und die Steuerung steht unter Hilfe.

## Umsetzung

- `viz3/shell/menu.html`: Seiten `.mpage[data-page]` (`start`, `orte`, `erleben`, `gestalten`, `einstellungen`, `hilfe`), Bereichsknöpfe
  `[data-go]`, Zurück `#mback`, Titel `#m-title`. **Alle bisherigen Knöpfe behalten ihre IDs und `data-…`** (Module und Tests finden sie
  weiter). Neu: `#tutbtn` (Start), `#tutbtn2` (Hilfe).
- `viz3/src/game/hud.js`: `page(name)`, `HUD.setMenu(true, 'gestalten')` öffnet auf einer Seite, `HUD.menuPage(name)`, `HUD.page` (die
  offene Seite oder `null`), Rücktaste zurück, Ereignis `menu:page`; `body[data-menu="1"]`, solange das Menü offen ist.
- `viz3/src/game/tutorial.js` (**TUT**, in `modules.txt` vor `game/game.js`): die Schritte als Daten (`title`, `text()`, `hi()`,
  `done(c)`, `begin(c)`, `skip()`, `next()`); prüft alle 250 ms; Ereignisse `tut:step` `{ id }`, `tut:done`. Gespeichert: `pav-tut-v1`
  `{ seen, done, closed }`. Von selbst nur, wenn `seen` falsch ist, nicht unter Testautomatik (`navigator.webdriver`) und nicht mit
  `?notut`. Solange die Karte da ist, gibt es keine „Neu: …“-Hinweise (`audio/audio.js`).
- `viz3/shell/css/tutorial.css`: die Karte (oben mittig; bei offenem Menü am Rechner direkt links neben dem Menü, am Handy klein ganz oben
  über dem Menü), das Leuchten `.tut-hi` (ohne Bewegung bei `prefers-reduced-motion`).
- Test: `viz3/test/menu.py` (Thema `menu`, `viz3/extra/menu/tests.txt`): 49 Prüfungen – Startseite, jede Seite, Zurück, Rücktaste, Esc,
  alle alten IDs und Orte, die ganze Einführung am Rechner, Überspringen, Schließen, Willkommen, Handy (Startseite ohne Scrollen,
  Texte für Finger, Karte über dem Menü). Bilder in `out/menu/`.
- Angepasst: `viz3/test/figuren.py` (Spielfigur jetzt unter Einstellungen), `viz3/test/v15a.py` (Orte unter Hingehen).

## Für den Kern-Chat

- Ein neuer Knopf im Menü gehört auf die Seite seines Bereichs, nicht auf die Startseite. Neue Orte kommen nach `orte` in die passende Gruppe.
- Ein Test, der mit `pg.click` einen Menüknopf drückt, muss erst die Seite öffnen (`pg.click('#menu [data-go="…"]')` oder
  `HUD.setMenu(true, '…')`). Klicks per `element.click()` gehen ohnehin.
- Ein neuer Schritt in der Einführung ist ein Eintrag in `STEPS` (`game/tutorial.js`). Die Einführung kurz halten: lieber im passenden
  Moment einen Hinweis (z. B. beim ersten Einsteigen ins Auto) als einen weiteren Pflichtschritt.
- Ideen für später: kurze Hinweise im passenden Moment (erstes Mal im Auto, an der Werkbank, im Dorf), eine eigene Einführung für den
  Gartenplaner, Falkos Rückmeldung zu den Texten.
