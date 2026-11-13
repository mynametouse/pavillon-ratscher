// ===================== feat/grenzland: the flashback to November 1989 (GL89) – first version of the core: the date, the clock, the picture =====================
// The helper agent `grenzland-1989` replaces this (the village, the people, the clothes, the cars, the sound of the time). The interface stays:
//   GL89.enter({ uhr, pos: [x, y], yaw }) → Promise (fade, the world of 1989, the player as the young Gerhard)
//   GL89.leave() → Promise (fade, everything back) · GL89.on · GL89.leute → { id: figure of gl_fig.js } · tick(dt) · stop()
// Events: 'grenzland:era' { era }.
import { P } from '../game/walkable.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { KERN } from '../core/kern.js';
import { go } from '../game/player.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLHUD } from './gl_hud.js';
export const GL89 = (() => {
  const S = { on: false, leute: {}, back: null };
  const J = GLDATA.J89;
  async function enter(o = {}) {
    if (S.on) return;
    GLTON.fx('damals');
    await GLHUD.fade(true, J.datum, J.intro);
    S.back = { t: CLOCK.t, e0: DN.e0, pos: [P.x, P.y, P.feet, P.yaw] };
    // the game day becomes the 10th of November 1989, the afternoon
    const d = Math.floor(CLOCK.t / 1440);
    try {
      DN.e0 = Date.UTC(J.tag[0], J.tag[1] - 1, J.tag[2]) / 864e5 - d;
    } catch (e) {}
    CLOCK.t = d * 1440 + (o.uhr ?? J.uhr);
    if (DN && DN.active) DN.update(true);
    S.on = true;
    GL.era = '1989';
    GLHUD.era('1989', J.datum);
    if (o.pos) {
      KERN.spot('gl-1989', {
        mode: 'walk',
        pos: o.pos,
        z: KERN.ground(o.pos[0], o.pos[1]),
        yaw: o.yaw || 0,
        pitch: -3,
        label: 'Ratscher 1989',
      });
      go('gl-1989');
    }
    GL.emit('era', { era: '1989' });
    await GLHUD.fade(false);
  }
  function restore() {
    const b = S.back;
    S.on = false;
    S.back = null;
    GL.era = 'heute';
    GLHUD.era('heute');
    if (!b) return;
    try {
      DN.e0 = b.e0;
    } catch (e) {}
    CLOCK.t = b.t;
    if (DN && DN.active) DN.update(true);
    KERN.spot('gl-zurueck', {
      mode: 'walk',
      pos: [b.pos[0], b.pos[1]],
      z: b.pos[2],
      yaw: b.pos[3],
      pitch: -3,
      label: 'Ratscher',
    });
    go('gl-zurueck');
    GL.emit('era', { era: 'heute' });
  }
  async function leave() {
    if (!S.on) return;
    await GLHUD.fade(true, 'Heute', '');
    restore();
    await GLHUD.fade(false);
  }
  return Object.assign(S, { enter, leave, tick() {}, stop: () => S.on && restore() });
})();
window.GL89 = GL89;
