// ===================== feat/grenzland: the view from the driver's seat (GLCOCKPIT) =====================
// What one sees from the driver's eyes belongs to the models of the vehicles the player rides and drives (grenzland/gl_modelle.js:
// model.cockpit – the handlebar that turns with the steering, the speedometer on the fork's head, the lamp's bowl, the mirror, the
// tank with its cap). Here the instruments read the truth, every frame while one sits on such a vehicle: the needle shows the speed
// of vehicles/vehicle.js (VEH.cur.st.u; it lags a little and trembles like the real one), the small mark under the hub shows the tank
// (GL.tank of 8.7 litres – the real S 51 has no gauge, only the reserve tap), and the face is as bright as the day or, at night, lit
// by its bulb while the lamp is on – no light is added, the face's material is unlit and takes its brightness from here.
//   GLCOCKPIT.on · tick(dt) · stop() · stand() → { kmh, winkel, tank, hell }
import { markDirty } from '../core/assets.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GL } from './gl_state.js';
import { GLZWEIRAD } from './gl_zweirad.js';
export const GLCOCKPIT = (() => {
  const S = { on: false, kmh: 0, tank: -1, hell: -1, t: 0, veh: null };
  const TANK = 8.7; // litres (the S 51's tank)
  // how bright the day is for an unlit face: 1 with the sun up, a glimmer at night
  function tag() {
    if (window.DN && DN.active && DN.state && Number.isFinite(DN.state.sunEl))
      return Math.max(0.035, Math.min(1, (DN.state.sunEl + 7) / 15));
    return VAUTO.dark && VAUTO.dark() ? 0.05 : 1;
  }
  function tick(dt) {
    const v = VEH.cur,
      C = v && v.model && v.model.cockpit;
    S.on = !!C;
    if (!C) {
      S.veh = null;
      return;
    }
    if (S.veh !== v) {
      S.veh = v;
      S.kmh = Math.abs(v.st.u) * 3.6;
      S.tank = -1;
      S.hell = -1;
    }
    S.t += dt;
    // the needle: eased towards the speed, a slight tremble with the engine running
    const kmh = Math.abs(v.st.u) * 3.6;
    S.kmh += (kmh - S.kmh) * Math.min(1, dt * 5);
    const tremble = v.st.engine && S.kmh > 3 ? Math.sin(S.t * 31) * 0.35 + Math.sin(S.t * 17.3) * 0.25 : 0,
      a = GLZWEIRAD.nadelWinkel(S.kmh + tremble);
    if (C.needle && Math.abs(C.needle.rotation.y - a) > 2e-3) {
      C.needle.rotation.y = a;
      markDirty();
    }
    // the tank's mark, drawn again when it has moved by a hundredth
    if (C.face && v.id === 'gl-moped') {
      const t = Math.max(0, Math.min(1, GL.tank / TANK));
      if (Math.abs(t - S.tank) > 0.01) {
        S.tank = t;
        C.face.draw(t);
        markDirty();
      }
    }
    // the face's light: the day's, or the bulb behind the face while the lamp is on
    if (C.dial) {
      const lampOn = v.st.engine && (VEH.lights === 'on' || (VEH.lights === 'auto' && VAUTO.dark && VAUTO.dark())),
        day = tag(),
        hell = Math.max(day * 0.85, lampOn ? 0.42 : 0);
      if (Math.abs(hell - S.hell) > 0.01) {
        S.hell = hell;
        // the bulb is warm, the day neutral
        const w = lampOn && day < 0.4 ? 1 : 0;
        C.dial.color.setRGB(hell, hell * (1 - 0.12 * w), hell * (1 - 0.4 * w));
        markDirty();
      }
    }
  }
  function stop() {
    S.on = false;
    S.veh = null;
  }
  const stand = () => ({
    on: S.on,
    kmh: Math.round(S.kmh * 10) / 10,
    winkel: S.veh && S.veh.model.cockpit.needle ? S.veh.model.cockpit.needle.rotation.y : null,
    tank: S.tank,
    hell: S.hell,
  });
  return Object.assign(S, { tick, stop, stand });
})();
window.GLCOCKPIT = GLCOCKPIT;
