# Auftrag: Schleusingen von innen (Hilfs-Agent `schleusingen-innen`)

Gestartet 14.11.2026 ~5:45 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv nach V18p (Häuser in Ratscher und Läden in Schleusingen von innen).
Branch `feat/schleusingen-innen` (von `src` 4c433cde), Worktree `/home/claude/wt-schleusingen-innen`, Port 9022.
Falko, 13.11. 23:56: „Okay, wann kann denn das alles live gehen und wann kann ich alle Gebäude begehen?“; ~0:00 gewählt
„Ratscher + Läden (Empfohlen)“: zuerst die Häuser in Ratscher, dann die Läden von innen, **danach Schleusingen**. Suhl bleibt beim Suhl-Chat.

## Brief (English)

Goal: in the normal game the houses of Schleusingen can be entered the way Ratscher's can since V18p – at the street door
„Hineingehen · E“ (the same `#doorbtn` on touch screens), a short fade, then one stands inside; inside at that door „Hinausgehen · E“.

1. **Which buildings.** The houses built by `welt/schleusingen.js` (from `stadt.json`: facades, storeys, names, shops; the door on the
   facade towards the nearest street) that are dwellings or town houses with a street door. Leave out churches, the Bertholdsburg, the
   Rathaus (it has its hall already), sheds, garages, halls, and the shops of `laeden/` (they have `LINNEN`). Count what is enterable and
   list the rules in the feature doc.
2. **Reuse, do not fork.** Build on `HAEUSER` (`viz3/src/haeuser/`) and the zombie night's kit (`zombie/z_innen*.js`: `ZIPLAN`, `ZIMOB`,
   `ZIEINR`, `ZINNEN`). Add a small adapter that turns a Schleusingen building into what the plan needs (frame, rectangle, foot, eave,
   storeys, door facade, look), with its own id range so ids never clash with Ratscher's. Hooks in `zombie/`, `haeuser/`, `laeden/` and
   `welt/schleusingen.js` only small and marked `// feat/schleusingen-innen`. Ratscher's houses, the shops and the zombie night must
   stay exactly as they are (tests `haeuser`, `zombie_innen`, `laeden_innen` green). Keep the marked `LAEDEN.skipStadt` line in
   `welt/schleusingen.js`.
3. **Town houses.** 2–4 storeys from the building's height. Small houses: the whole house (flur, stube/wohnzimmer, küche, bad,
   schlafzimmer, kinderzimmer, cellar or attic where the kit has them). Bigger and taller houses: a stairwell (Treppenhaus) with
   letter boxes and bells **without names**, stairs to every floor, landing doors – one flat per floor can be entered, the others say
   „verschlossen“. Look of 2026 fixed per building id: mostly „heute“, some „heute-90“, few „heute-ddr“, rarely „alt“. A ground floor
   with a shop sign (the old town's existing signs) gets a simple shop room with `LINNEN`'s kit where a type fits (bakery, pharmacy,
   café/restaurant, generic shop shelves); otherwise a flat.
4. **Invented and generic.** No names on bells or letter boxes, no photos of people, no brands; shop names only as the existing plain
   lettering. The „Ausgedacht“ hint as in Ratscher (once).
5. **Performance as in V18p.** At most one house mounted, built on entering behind the fade, freed on leaving (geometries and textures
   back to where they were); no new shader programs (precompile behind the fade like `haeuser`); lamps and fill light only borrowed
   (`KERN.lights.borrow`), no new lights; with the phone flag at most 120 000 triangles per mounted house; `memphone` must stay green.
6. **Tests and docs.** `viz3/test/schleusingen_innen.py` (door label by day and at night, in and out, feet on the floor, walls stop,
   stairs to the upper floors, „verschlossen“, memory freed, the house's own programs, screenshots), `viz3/extra/schleusingen-innen/tests.txt`
   (smoke, schleusingen_innen, haeuser, zombie_innen – keep the feature CI under 60 minutes per job), unit tests for pure plan code,
   `docs/features/schleusingen-innen.md` (what there is, interface, performance, tests, open points).
7. **Way of working.** Work only in your worktree and on your branch. Browser runs only through `bash tools/browser_lock.sh …` on port
   9022 (one browser at a time on this machine; the lock is shared with other agents). Back up work in progress to `wip/schleusingen-innen`
   (no CI). Before pushing to `feat/schleusingen-innen`: merge `origin/src`, run `bash tools/check.sh` and your tests through the lock, then
   push one solid increment (CI costs credits – few pushes). Never merge into `src` or `live`, never force-push, no bare `git stash`.
   Report 1 with screenshots (1920×1080, to `/tmp/claude-0/-home-claude/478e2c6c-7c44-520e-a5ed-137e18f4dc0a/scratchpad/schleusingen-innen/`)
   as soon as the first houses work; final report with the CI run id, test counts, screenshots and open points.
8. Code comments English, UI German; no keys, no parcel or private raw data in the repo. Commit messages end with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Mmpsvp11QsXpPSQRRbZ4Jv`.
