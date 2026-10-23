// ===================== feat/dorf village life 1: the calendar of the village (DCAL) =====================
// Falko, 23.10.2026: every Friday evening Skat and Rummy in the old school; now and then a bonfire on the field towards the Klinge. The game
// clock (time/clock.js, minutes since day 1, 0:00) and the calendar of time/daynight.js (DN.e0 = epoch day of game day 1, by default
// Monday 1 June 2026) give the weekday. Friday 19–23 h: the evening in the school; every other Saturday 19–23:30 h: the fire.
// Test hooks: DCAL.jump('skat' | 'fire', hour) sets the clock to the next such evening; ?dorf=freitag / ?dorf=feuer does it at the start.
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
export const DCAL = (() => {
  const E0 = Date.UTC(2026, 5, 1) / 864e5; // game day 1 when DN has no calendar (Monday 1 June 2026)
  const e0 = () => (DN && Number.isFinite(DN.e0) ? DN.e0 : E0);
  const eday = (t = CLOCK.t) => e0() + Math.floor(t / 1440);
  const wd = (t = CLOCK.t) => (((eday(t) + 4) % 7) + 7) % 7; // 0 Sunday … 5 Friday, 6 Saturday (1 Jan 1970 was a Thursday)
  const min = (t = CLOCK.t) => ((Math.floor(t) % 1440) + 1440) % 1440;
  const EV = {
    skat: { day: 5, from: 19 * 60, to: 23 * 60, name: 'Skat- und Rommé-Abend' },
    fire: { day: 6, from: 19 * 60, to: 23 * 60 + 30, name: 'Feuer am Acker' },
  };
  // the fire: every other Saturday (the weeks counted from the epoch, so the rhythm keeps when the calendar is moved)
  const fireWeek = e => Math.floor((e + 3) / 7) % 2 === 0;
  function on(kind, t = CLOCK.t) {
    const v = EV[kind],
      m = min(t);
    if (!v || wd(t) !== v.day || m < v.from || m >= v.to) return false;
    return kind !== 'fire' || fireWeek(eday(t));
  }
  // minutes until the evening starts (0 while it runs), within the next 3 weeks; Infinity if none
  function until(kind, t = CLOCK.t) {
    if (on(kind, t)) return 0;
    const v = EV[kind],
      d0 = Math.floor(t / 1440);
    for (let d = d0; d < d0 + 22; d++) {
      const s = d * 1440 + v.from;
      if (s < t) continue;
      if (on(kind, s)) return s - t;
    }
    return Infinity;
  }
  const next = (kind, t = CLOCK.t) => {
    const u = until(kind, t);
    return Number.isFinite(u) ? t + u : null;
  };
  const dateOf = t => (DN && DN.dateStr ? DN.dateStr(t, true) : 'Tag ' + CLOCK.day(t));
  // test hook: the clock to the next such evening (or this one) at the given hour; the light follows at once
  function jump(kind, hour) {
    const v = EV[kind];
    if (!v) return null;
    const h = hour ?? (kind === 'fire' ? 21 : 20),
      d0 = Math.floor(CLOCK.t / 1440);
    for (let d = d0; d < d0 + 22; d++) {
      const t = d * 1440 + h * 60;
      if (on(kind, t)) {
        CLOCK.t = t;
        if (DN && DN.active) DN.update(true);
        return dateOf(t);
      }
    }
    return null;
  }
  return { EV, wd, min, eday, on, until, next, dateOf, jump, fireWeek };
})();
window.DCAL = DCAL;
