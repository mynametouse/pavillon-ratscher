# Realismus Stufe 1 – Auftrag `laeden-leben`: Läden und öffentliche Gebäude belebt, echt einkaufen, Öffnungszeiten (17.11.2026, ~14:15)

First read `docs/plans/auftraege/realismus1-gemeinsam.md` (Falko's words, the yardstick, ownership, interfaces, how to work). Branch
`feat/laeden-leben`, worktree `/home/claude/wt-laeden-leben`, port **9045**. Your files: `viz3/src/laeden/**`, `viz3/src/schleusingen/si_laden.js`,
`viz3/src/amt/**` (the town hall), new `viz3/src/einkauf/**`, your tests, `viz3/extra/laeden-leben/`, `docs/features/laeden-leben.md`. Read
first what exists: `docs/features/laeden.md`, `laeden-innen.md`, `schleusingen-innen.md`, `amt*.md` (the town hall since V16).

Falko (13:27): „Die Geschäfte sollen zum Beispiel auch belebt sein. Man soll dort wirklich einkaufen können. Es muss realistischer aussehen,
nicht bloß so schemenhaft. … natürlich braucht es auch der Menschen, die im Supermarkt rumlaufen, Kassierer und all das. Also öffentliche
Gebäude sollten, so gut es geht, zugänglich sein und dann eben auch entsprechende auch Öffnungszeiten haben, aber eben auch entsprechende
Optionen, vielleicht die sogar sinnvoll sind, entweder für die Quest oder für Sidequests oder einfach Inventarisierung von Dingen oder lustige
Nebenschauplätze.“

## 1 People in the shops (start with the supermarket, the bakery, OBI; then the others of `laeden/`)

- During opening hours: staff at the tills (a cashier who scans, bags, says the sum), at the counters (bakery, butcher, the DIY store's wood
  cutting), stocking shelves; customers walking between the shelves with a basket or a trolley, taking things, queueing, paying, leaving –
  how many by the hour and weekday (Saturday morning full, Tuesday afternoon quiet). Real-looking figures (the base game's Rocketbox people,
  the way `haeuser_gast.js` or `dorf/` dress them), real-looking motion (walk, stand, reach) – no ghosts, no T-poses, no sliding. Only in the
  shop the player is in or about to enter (built on approach, gone on leaving); counts and frame time in your test.
- Outside opening hours: closed – the sliding door does not open, lights off or a night light, nobody inside (maybe one person stocking at
  6:30). Signs with the hours at the door.

## 2 Really shopping

- Goods that look like goods: shelves filled with product packs (a few generic packaging textures per kind – milk, bread, cans, cereal, drinks
  crates, tools, timber – instanced; no real brand logos), prices on the shelf edges; pick an item (look at it, E), it goes into the basket;
  at the till the cashier scans it, you pay, it goes into the **inventory** (`einkauf/inventar.js`, `INVENTAR`: saved, a small panel to look
  into, things with a name, an icon, a weight). Money: a wallet for free play (`GELD`, saved – decide a sensible start and how one earns,
  e.g. the garden's harvest or the workshop's boards; ask the lead only if unsure) and the Grenzland mode's money (`GL.pay`) in the mode –
  one path for both, documented.
- Useful things first: things the game can use (timber, screws, paint and tools at OBI for the garden and the workshop; food and drinks;
  flowers; in the mode a crowbar or a torch for later quests) – where the base game already has such things (the workshop, the garden), let
  bought things show up there if it is easy, else just in the inventory.

## 3 Public buildings with opening hours and options

- A shared opening-hours registry `OEFFNUNG` (`einkauf/oeffnung.js`) for shops and public buildings (real hours where they can be found –
  say so – else plausible ones). Public buildings: the town hall of Schleusingen (exists, `amt/`), and as far as time allows: the Bertholdsburg
  with its museum (the real Naturhistorisches Museum – an entrance hall, a ticket desk, one exhibition room with a few exhibits and a text
  each), the church St. Johannis (open by day, quiet, the bells are the lead's sound), a library or a post office counter, in Ratscher the
  fire station's door and the Alte Schule (the base game's skat evening, `dorf/dorf_school.js`, read-only – meet it there). Each with staff at
  its hours and one or two meaningful options (ask at the town hall's counter, buy a ticket and look, borrow a book, post a letter) – things
  side quests can use (`ruf` will send the player to them).

## 4 Tests and delivery

- `viz3/test/laeden_leben.py` with sections `:markt`, `:obi`, `:kaufen`, `:oeffentlich` (and `viz3/extra/laeden-leben/tests.txt`); unit tests
  for opening hours, prices, inventory and wallet; frame time and draw calls inside the supermarket before and after; pictures (the
  supermarket on Saturday morning, the till while paying, the bakery counter, OBI's timber, the closed shop at night, the inventory panel,
  the museum's room). Existing tests (`laeden.py`, `laeden_innen.py`, `amt.py`, `schleusingen_innen.py`) must stay green.
- Report as in the common part.
