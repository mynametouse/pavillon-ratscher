// ===================== feat/verkehr-real stage 3b: a bus in the knock – 12.5 t, it stands with its hazard lights, the driver has his say (VKBUS) =====================
// Falko, 13.11.2026 12:14: „… dass die Busse beim Lenken und Fahren genauso wie die anderen Fahrzeuge auch … nicht durchfahrbar sind, sondern
// tatsächlich auch Unfälle bauen, wenn man gegen sie fährt“. The buses of the timetable (bus/bus.js) are boxes of VEH.extra; with a marked
// hook there each is a body of its mass in the knock (vehicles/vehicle.js resolve, as the traffic cars of verkehr/vk_unfall.js): the
// player's car bounces off, the bus hardly moves – but its driver felt it. After a bump it stands 6 s with its hazard lights (its minutes
// stop: I.knockT, read by the hook in bus.js), after a real knock 15 s, and the driver complains from his seat (verkehr/verkehr.js passes
// VKBUS.flush its subtitle). Nothing here moves the bus: the timetable stays the truth (it is late afterwards and catches up unseen).
//   VKBUS.body(I)         the bus I (an instance of bus.js: x, y, hd, v, r) as a body for VEH.resolve, with knock(v, h)
//   VKBUS.flush(say)      the knocks of this frame by the player: say(I, label, text) for each
//   VKBUS.LINES, VKBUS.M  what the drivers say, the mass
import { VEH } from '../vehicles/vehicle.js';
import { VKUNFALL } from './vk_unfall.js';
export const VKBUS = (() => {
  const S = { knocks: 0, ev: [], err: null };
  // a regional bus (12 m, two axles) with some people in it
  const M = 12500,
    IZ = 1.6e5;
  const LINES = {
    knock: ['He! Siehst du den Bus nicht?', 'Mensch, Abstand halten – das ist ein Bus!', 'Na, na, na! Ich hab Fahrgäste drin!'],
    crash: [
      'Na prima. Jetzt kommen wir alle zu spät.',
      'Ich hab Fahrgäste an Bord! Pass doch auf!',
      'Das gibt einen Bericht für die Zentrale, mein Lieber.',
    ],
  };
  function body(I) {
    if (!I || !Number.isFinite(I.x) || !Number.isFinite(I.y) || !Number.isFinite(I.hd)) return null;
    // its speed now: the timetable's along the way times the rate it is let to go (held up: slower)
    const u0 = I.st === 'fahrt' ? Math.max(0, (I.v || 0) * (I.r ?? 1)) : 0,
      b = { spec: { mass: M, Iz: IZ }, st: { x: I.x, y: I.y, psi: I.hd, u: u0, v: 0, r: 0, sleep: 0 }, u0 };
    b.knock = (v, h) => {
      try {
        knocked(I, b, v, h);
      } catch (e) {
        if (!S.err) console.warn('verkehr bus knock', e);
        S.err = String((e && e.message) || e);
      }
    };
    return b;
  }
  function knocked(I, b, v, h) {
    const s = b.st,
      sp = Math.sin(s.psi),
      cp = Math.cos(s.psi),
      W = [s.u * sp + s.v * cp, s.u * cp - s.v * sp],
      W0 = [b.u0 * sp, b.u0 * cp],
      dv = Math.hypot(W[0] - W0[0], W[1] - W0[1]);
    // how fast the two came together: the other one before the knock (its momentum changed by as much as the bus's, the other way)
    let closing = 0;
    if (v && v.st && v.spec && h && h.n) {
      const f = VEH.fwd(v.st.psi),
        r = VEH.rgt(v.st.psi),
        k = M / v.spec.mass,
        Wp = [
          v.st.u * f[0] + v.st.v * r[0] + k * (W[0] - W0[0]),
          v.st.u * f[1] + v.st.v * r[1] + k * (W[1] - W0[1]),
        ];
      closing = (W0[0] - Wp[0]) * h.n[0] + (W0[1] - Wp[1]) * h.n[1];
    }
    if (!Number.isFinite(dv) || !Number.isFinite(closing)) return;
    const g = VKUNFALL.grade(dv, closing);
    if (g === 'touch') return;
    const was = I.knockT > 0,
      crash = g === 'crash' || (was && I.knockG === 'crash');
    I.knockT = Math.max(I.knockT || 0, crash ? 15 : 6);
    I.knockG = crash ? 'crash' : 'knock';
    if (was) return;
    S.knocks++;
    if (v && v === VEH.cur) S.ev.push(I);
  }
  // the driver: a man or a woman (one in five), the same for the bus's whole trip
  function flush(say) {
    if (!S.ev.length) return;
    for (const I of S.ev.splice(0)) {
      if (I.drvG === undefined) I.drvG = Math.random() < 0.2 ? 'f' : 'm';
      const label = I.drvG === 'f' ? 'Die Busfahrerin' : 'Der Busfahrer',
        L = LINES[I.knockG] || LINES.knock;
      if (say) say(I, label, L[Math.floor(Math.random() * L.length)]);
    }
  }
  Object.assign(S, { body, flush, LINES, M });
  return S;
})();
if (typeof window !== 'undefined') window.VKBUS = VKBUS;
