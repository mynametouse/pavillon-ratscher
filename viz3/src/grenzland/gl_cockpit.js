// ===================== feat/grenzland: the view from the driver's seat (GLCOCKPIT) =====================
// What one sees from the driver's eyes belongs to the models of the vehicles the player rides and drives (grenzland/gl_modelle.js:
// model.cockpit). On the Simson S 51: the handlebar that turns with the steering, grips and levers, the speedometer on the fork's
// head, the lamp's bowl, the mirror, the tank with its cap. In the Trabant 601: the painted dash with its padded roll, the round
// speedometer behind the thin two-spoke wheel that turns, pull knobs and switches, the gear lever out of the dash, the open shelf,
// the heater's slider, the radio with its dial, the bonnet ahead, wipers, the mirror.
// Here the instruments read the truth, every frame while one sits on such a vehicle: the needle shows the speed of
// vehicles/vehicle.js (VEH.cur.st.u; it lags a little and trembles like the real one), the odometer counts the way, the control
// lamps light when they are used (charge after the start, high beam, the indicator while turning off), the moped's fuel tap turns
// to the reserve under 0.8 l (neither the S 51 nor the Trabant 601 has a fuel gauge – the tank is told in the small line under the
// vehicle's name), the radio's pointer stands at the station that plays (window.GLRADIO of grenzland/gl_radio.js, the event
// 'grenzland:radio'), and the faces are as bright as the day or, at night, lit by their bulbs while the lamp is on – no light is
// added, the faces' materials are unlit and take their brightness from here. From the saddle one sees the rider's gloved hands.
//   GLCOCKPIT.on · tick(dt) · stop() · stand() → { kmh, winkel, tank, hell, radio, km, lampen, haende } · winkel(kmh, max)
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { CAM3 } from '../game/player.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GL } from './gl_state.js';
import { GLZWEIRAD } from './gl_zweirad.js';
export const GLCOCKPIT = (() => {
  const S = { on: false, kmh: 0, tank: -1, hell: -1, t: 0, veh: null, radio: undefined, km: {}, zaehler: -1, seit: 0 };
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
      // off the vehicle: the hands go with the rider
      const H = S.veh && S.veh.model.cockpit && S.veh.model.cockpit.hands;
      if (H && H.visible) H.visible = false;
      S.veh = null;
      return;
    }
    if (S.veh !== v) {
      S.veh = v;
      S.kmh = Math.abs(v.st.u) * 3.6;
      S.tank = -1;
      S.hell = -1;
      S.radio = undefined;
      S.zaehler = -1;
      S.seit = 0;
    }
    S.t += dt;
    // the needle: eased towards the speed, a slight tremble with the engine running
    const kmh = Math.abs(v.st.u) * 3.6;
    S.kmh += (kmh - S.kmh) * Math.min(1, dt * 5);
    const tremble = v.st.engine && S.kmh > 3 ? Math.sin(S.t * 31) * 0.35 + Math.sin(S.t * 17.3) * 0.25 : 0,
      a = GLZWEIRAD.nadelWinkel(S.kmh + tremble, C.max || 100);
    if (C.needle && Math.abs(C.needle.rotation.y - a) > 2e-3) {
      C.needle.rotation.y = a;
      markDirty();
    }
    // the odometer: counts on with the way, the face is drawn again every 100 m
    if (C.face) {
      const d = (S.km[v.id] = (S.km[v.id] || 0) + (Math.abs(v.st.u) * dt) / 1000),
        z = Math.floor(((C.km0 || 0) + d) * 10);
      if (z !== S.zaehler) {
        S.zaehler = z;
        C.face.draw((C.km0 || 0) + d);
        markDirty();
      }
    }
    const lampOn = v.st.engine && (VEH.lights === 'on' || (VEH.lights === 'auto' && VAUTO.dark && VAUTO.dark()));
    // control lamps: the charge lamp glows for a moment after the start, the blue one while the lamp is switched on by hand
    // (the driver's own choice: the high beam), the green one flashes while one turns off at walking pace
    if (C.lampen) {
      S.seit += dt;
      const L = C.lampen,
        turn = Math.abs(v.st.steer) > 0.2 && kmh < 32,
        set = (m, on) => {
          const e = on ? 2.6 : 0;
          if (m && m.emissiveIntensity !== e) {
            m.emissiveIntensity = e;
            markDirty();
          }
        };
      set(L.k_rot, v.st.engine && S.seit < 1.6);
      set(L.k_blau, v.st.engine && VEH.lights === 'on');
      set(L.k_gruen, turn && Math.floor(S.t * 2.6) % 2 === 0);
    }
    // the moped's fuel tap: down is open, forward is the reserve (under 0.8 l); the tank itself is told in the small line
    if (C.tap && C.tank) {
      const t = Math.max(0, Math.min(1, GL.tank / C.tank)),
        res = GL.tank < 0.8 ? -1.5 : 0;
      S.tank = t;
      if (C.tap.rotation.x !== res) {
        C.tap.rotation.x = res;
        markDirty();
      }
    }
    // the rider's hands on the grips: from the saddle only
    if (C.hands) {
      const show = !CAM3.want;
      if (C.hands.visible !== show) {
        C.hands.visible = show;
        markDirty();
      }
    }
    // the radio's dial: the stations of the day (or of 1989), the pointer at the one that plays
    if (C.radio) {
      const R = window.GLRADIO,
        cur = R && R.cur ? R.cur() : null;
      if (cur !== S.radio) {
        S.radio = cur;
        let list = [];
        try {
          list = (R && R.stations && R.stations()) || [];
        } catch (e) {}
        C.radio.draw(list, cur);
        S.hell = -1;
        markDirty();
      }
    }
    // the face's light: the day's, or the bulb behind the face while the lamp is on
    if (C.dial) {
      const day = tag(),
        hell = Math.max(day * 0.85, lampOn ? 0.42 : 0);
      if (Math.abs(hell - S.hell) > 0.01) {
        S.hell = hell;
        // the bulb is warm, the day neutral
        const w = lampOn && day < 0.4 ? 1 : 0;
        C.dial.color.setRGB(hell, hell * (1 - 0.12 * w), hell * (1 - 0.4 * w));
        // the radio's scale glows while the radio plays
        if (C.radio) {
          const r = Math.max(day * 0.85, S.radio ? 0.5 : 0);
          C.radio.mat.color.setRGB(r, r * 0.95, r * 0.8);
        }
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
    radio: S.radio || null,
    km: S.veh ? (S.veh.model.cockpit.km0 || 0) + (S.km[S.veh.id] || 0) : 0,
    lampen:
      S.veh && S.veh.model.cockpit.lampen
        ? Object.values(S.veh.model.cockpit.lampen).map(m => m.emissiveIntensity)
        : [],
    haende: !!(S.veh && S.veh.model.cockpit.hands && S.veh.model.cockpit.hands.visible),
  });
  // a new station: the dial is drawn again at the next frame
  KERN.on('grenzland:radio', () => {
    S.radio = undefined;
  });
  // the needle's angle for a speed (tests compare it with the needle)
  const winkel = (kmh, max) => GLZWEIRAD.nadelWinkel(kmh, max);
  return Object.assign(S, { tick, stop, stand, winkel });
})();
window.GLCOCKPIT = GLCOCKPIT;
