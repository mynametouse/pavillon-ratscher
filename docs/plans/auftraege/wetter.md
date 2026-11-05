# Auftrag `wetter` – Wetter wie draußen in Ratscher

Gestartet am 5.11.2026 ~23:20 vom Chat session_01Mmpsvp11QsXpPSQRRbZ4Jv als Hilfs-Agent, Branch `feat/wetter` (von `src` 2d2d35cc),
Worktree `/home/claude/wt-wetter`, Port 9001. Gemeinsame Regeln: `docs/plans/auftraege/nacht-6-11-gemeinsam.md`. Wörtlich (englisch):

---

Read `docs/plans/auftraege/nacht-6-11-gemeinsam.md` first – it is part of this brief (context, Falko's words and decisions, data reachability,
where you work, testing, delivering). Your thema: `wetter`, port 9001.

## Your topic: the weather of the real place
Falko chose: **live as the default** – the world shows the weather it has in Ratscher right now; switchable to the calendar's (as until now).

1. **The data:** Open-Meteo (free, no key; credit „Wetterdaten: Open-Meteo.com“, CC BY 4.0): current values and hourly ones (temperature,
   precipitation, rain, showers, snowfall, cloud cover, visibility, wind speed, gusts and direction, weather code) for Ratscher (take the
   garden's latitude/longitude from the repo), fetched by the browser, refreshed every 15 minutes, kept for the session; on failure or offline
   the calendar's weather. When the game's clock is not „now“ (a scene, the time-lapse, the zombie night on 31 October, sleeping): use the real
   weather of the game's date and hour where Open-Meteo has it (forecast ~16 days ahead, the archive API for the past), else the calendar's –
   decide sensibly and show which („Wetter wie draußen“ / „Wetter vom 31.10.“). The page's Content-Security-Policy must allow the API in the
   published site – find where it is set (the test server `tools/csp/cspserve.py` uses `connect-src 'self'`; tests mock the data through a hook
   of your module; no requests from tests).
2. **Show it** (read `time/daynight.js` DN – sky, sun, fog, light; `time/skydata.js`; how the zombie night sets its fog in `zombie/z_modus.js`
   fogHook – combine, the larger wins): rain (streaks around the camera, cheap: one instanced mesh or points that follow the camera, density by
   intensity), drizzle, showers, snow (flakes, slow, drifting with the wind; a light white on the ground only if it is cheap), fog and haze from the
   visibility, clouds (cover dims the sun and its shadows, the sky toward grey – the sky is a blend of photo skies; an overcast look by tint/blend,
   without new shaders if possible), wind (sound; trees/grass swaying only if cheap), thunder optional. Wet ground optional (roughness of the ground
   materials). No rain inside buildings (the pavilion, the garden buildings, the zombie houses – `window.inHouseNow`, the KERN service 'inside',
   `zombie/z_haus.js` H) – there rain is heard on the roof. Sounds: free recordings (CC0 etc.) with credits.
3. **Choose it:** Menü → Einstellungen (or the clock window) „Wetter: wie draußen | nach Kalender“, saved through SAVE (key + check), and a short line
   in the clock window („Leichter Regen · 6 °C · Wind 20 km/h – Open-Meteo“). The zombie night keeps its night fog; its rain may fall.
4. **Cheap:** particles compiled ahead (no new program at the first drop – count programs), fewer on phones, nothing when the weather is dry,
   no new light, nothing while the page is hidden.
5. **Test** `viz3/test/wetter.py`: mocked data → rain, snow, fog, overcast, wind (numbers and pictures you look at), no particles inside a building,
   the switch to the calendar and back, saved, the clock line, a failing API → calendar, no new shader programs while the weather changes, no page
   errors, the normal start and the zombie night unharmed.
