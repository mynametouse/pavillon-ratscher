# Ton, Runde 1 – Auftrag `ton-stimmen`: eigene Stimmen mit Gefühl und Mundart, Leute auf der Straße (13.11.2026, ~23:30)

> **Stand 14.11.2026, 0:30 – angehalten.** Falko 23:54: „ich möchte keine Credit Labs bezahlen“ – ElevenLabs entfällt ganz (siehe `ton-gemeinsam.md`, „Costs: none“); wo dieser Auftrag ElevenLabs nennt, gilt das nicht mehr. 23:57: nur Schnelles – die Agenten wurden um 23:58 angehalten, ihre angefangene Arbeit liegt unbesehen auf dem Branch. Schon gebaut vom Lead (V18n): acht Songs in `GLRDATA.LIEDER`, Funkloch FM, `gl_nacht.js` (Grillen, Stundenschlag).

Hilfs-Agent des Grenzland-Chats (Lead: session_01L6Yrpf75YEUJPnMQdXevjQ). Read first `docs/plans/auftraege/ton-gemeinsam.md` (Falko's words,
hard rules, interfaces, ownership, ElevenLabs budgets, timetable), then `grenzland2-gemeinsam.md` („Interfaces“: voices; „How to work“), then
what exists: `docs/features/grenzland-stimmen.md` (the Edge recordings of round 2: collector, ids, workflow, sound settings, budget, ranks),
`viz3/src/grenzland/gl_stimmen.js`, `gl_reaktion*.js`, `gl_partner*.js`, `viz3/src/audio/stimme.js` (engines; ElevenLabs per person at
~l. 283: `S.elv[k] || EL_DEF[k] || EL_DEF[gender]`), `viz3/src/npc/ki.js` (the free AI talk).

## Goal

Every person in Grenzland gets a voice of its own from ElevenLabs – the same one in recorded lines and in the free AI talk –, the lines are
spoken with feeling and situation, older locals have a light colour of the region, and the streets talk.

## What to build

1. **Casting** (`tools/voices/besetzung.json` + a section „Besetzung“ in your feature doc): for each speaker key of
   `tools/voices/grenzland_linien.json` (`gl_falko`, `gl_sarah`, `gl_jule`, `gl_timo`, `gl_basti`, `gl_yuki`, `gl_gerhard`, `gl_wirt`,
   `gl_haendler`, … the radio DJs `gl_r_*`, the new Funkloch FM DJ and the callers of `ton-radio`, the police radio `gl_funk`): a German
   description (age, origin, timbre, temperament, how she/he talks), **2–3 candidate voices** from the ElevenLabs library (German native
   speakers; ids, names, why – list/search them with the chat's connector or the public library; **no generation there**) and one typical line
   from the game as the sample. Falko and Sarah are a couple from Berlin (late thirties to forties); the clique is young; Gerhard is the old
   village chronicler. With the key: render each candidate's sample on Actions (budget below) and list them as Hörprobe entries
   (`tools/ton/hoerprobe/ton-stimmen.json`; the small sample files may live in `viz3/extra/grenzland-stimmen/probe/`). Without the key: the
   sheet alone – the lead then casts with Falko in the chat.
2. **ElevenLabs in the pipeline:** `tools/voices/grenzland_record.py --engine eleven` (keep Edge as the default until the lead switches):
   voice per person from `besetzung.json` (field `gewaehlt`), model choice by test – render 3 lines with `eleven_multilingual_v2`, `eleven_v3`
   and `eleven_v4` and report which follows the direction best and stays stable; output exactly as today (paths, ids, loudness, formats), so the
   game needs no change. The id stays the hash of the **words** – direction tags are not part of it. Budget guard and the subscription check of
   `ton-gemeinsam.md`. The workflow `stimmen_grenzland.yml` also watches `feat/ton-*` (new lines of `ton-radio` and yours get recorded – with
   Edge now). **The full re-recording (~52,000 characters) waits for the lead's go** after Falko picked the voices.
3. **Feeling and situation:** a direction per line – from the context where the collector can see it (a mission step's `lage`, e.g. sneaking →
   whisper; chase / stars → out of breath; on the moped or in wind → raised voice; banter → laughing) plus a hand table
   `tools/voices/regie.json` (`id → tags`, e.g. `["whispers"]`, `["out of breath"]`, `["shouting"]`, `["laughs"]`, `["sighs"]`) for the ~200 most
   important story lines. Tags go into the ElevenLabs request in the form the chosen model understands; Edge ignores them.
4. **Dialect:** south of the Rennsteig people speak Hennebergisch (East Franconian). Propose `tools/voices/mundart.json`: 20–40 words and
   turns of phrase with meaning, use and a source (dialect dictionaries, regional studies – cite them); mark which older locals get them
   (Gerhard, the innkeeper, the trader, the villagers of 1989 …) and list the proposed line changes („alt → neu“) in your report – **Falko
   decides**, the lead edits the data modules. For the colour of the voice: search the library for candidates with a light Franconian or
   Southern German accent and add them to the casting of those persons.
5. **The same voice in the AI talk:** when the player uses the ElevenLabs engine with his own key, the AI persons (`gl_p_sarah`, `gl_p_falko`
   of `gl_partner.js`, and any other `gl_*` person) speak with the chosen voice. Look whether `STIMME.person(k, profile)` keeps a field you can
   use; if `stimme.js` needs an additive line (e.g. a default voice per person that the settings still override), write the patch into your
   report – it is a shared file.
6. **People on the street** (today's Grenzland; build on `gl_reaktion.js` / `gl_reaktion_data.js` – **you take them over from the lead** – and
   new `gl_leute.js` + `gl_leute_data.js` for what does not fit there): anonymous passers-by (find the walkers of `viz3/src/verkehr/` and the
   villagers of `viz3/src/dorf/` – read-only, public APIs or their figures) greet when the player passes close (by time of day), make short
   remarks (the moped's noise, the helmet, rain, running past, staring at them, police nearby, stars); a pool of 12–16 generic voices (`gl_l_*`,
   ages and genders mixed), positional (`GLRAUM.quelle` if there, else `STIMME.say(k, text, { at })`), rate-limited, never during a talk, a
   kino scene or an Eilmeldung. All fixed strings in `GLLEUTE.linien()` (and the collector). The walla beds of the Kirmes, the market and the
   pub are `ton-welt`'s.
7. **Phone sound:** what the other side says in a call (`GLHANDY.rufZeilen`) should sound like a phone. Choose: record those lines through
   the phone band under their own keys (needs a small change in `gl_handy.js` – a patch for the lead), or a runtime filter if `STIMME` can
   route a line to another node. Report what you chose.

## Budget

≤ 5,000 ElevenLabs credits for the casting samples and the model test (~3 lines × 3 models). Nothing else is recorded with ElevenLabs before
the lead's go.

## Files (yours)

`gl_stimmen.js`, `gl_reaktion.js`, `gl_reaktion_data.js`, new `gl_leute.js` + `gl_leute_data.js` (one line each in `viz3/src/modules.txt`
inside `# feat/grenzland`), `tools/voices/grenzland_*`, `tools/voices/besetzung.json`, `regie.json`, `mundart.json`,
`.github/workflows/stimmen_grenzland.yml`, `viz3/extra/grenzland-stimmen/**`, `tools/ton/hoerprobe/ton-stimmen.json`, tests
`viz3/test/grenzland_stimmen*.py`, `viz3/test/grenzland_leute*.py`, `viz3/test/unit/grenzland_stimmen*.test.mjs`,
`viz3/test/unit/grenzland_leute*.test.mjs`, `docs/features/grenzland-stimmen.md` (update: what changed, „Besetzung“, „Für den Lead“).

## Tests (must pass before your last push)

- Unit: the direction from context, the id without tags, the collector reads `GLLEUTE` and the new radio lines, the budget guard, the voice
  choice for an AI person with and without a voice chosen in the settings.
- Browser: passing a walker greets once (spy on `STIMME.say`), the rate limit holds, nothing during a kino scene, a remark when stars are up,
  the recordings still play; no network calls to ElevenLabs in tests.
- The workflow: a dry run without the key skips the ElevenLabs steps with the notice and still records Edge lines.

## Worktree

`/home/claude/wt-ton-stimmen`, branch **`feat/ton-stimmen`** (from `src` with these briefs), port **9033**. Push
`git -c push.negotiate=true push -u origin feat/ton-stimmen`; never to `src`, `live`, `feat/grenzland`.
**02:30:** the casting sheet, the ElevenLabs engine in the pipeline (dry run), the workflow watching `feat/ton-*`. **06:00:** the rest.
