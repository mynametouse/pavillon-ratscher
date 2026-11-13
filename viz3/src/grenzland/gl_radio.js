// ===================== feat/grenzland: the radio (GLRADIO) – first version of the core: one station on and off =====================
// The helper agent `grenzland-radio` replaces this by several stations to switch between as in GTA. The interface stays:
//   GLRADIO.stations() → [{ id, name, freq }] · cur() → id | null · tune(id | null) · next() · prev() · off() · era(e) · tick(dt) · stop()
// Events: 'grenzland:radio' { id, name }.
import { PLAY } from '../game/play.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLHUD } from './gl_hud.js';
export const GLRADIO = (() => {
  const S = { id: null, t: 0, i: 0 };
  const R = GLDATA.RADIO;
  const stations = () => [{ id: 'grenzland', name: R.name, freq: R.freq }];
  function tune(id) {
    S.id = id || null;
    S.t = 0;
    GL.radio = S.id ? 1 : 0;
    GL.save();
    if (S.id) {
      GLTON.jingle();
      PLAY.think(R.name + ' · ' + R.freq, 2200);
    } else PLAY.think('Radio aus.', 1200);
    GL.emit('radio', { id: S.id, name: S.id ? R.name : '' });
  }
  const next = () => tune(S.id ? null : 'grenzland');
  function tick(dt) {
    if (!S.id || !GL.on) return;
    S.t -= dt;
    if (S.t > 0) return;
    // a little music, then a line of the news
    const k = S.i++ % 3;
    if (k < 2) S.t = GLTON.musik(k ? 'schlager' : 'polka', 9) + 1;
    else {
      const all = R.news.concat(R.claims),
        line = all[Math.floor(Math.random() * all.length)];
      S.t = GLHUD.sub(R.name, line) + 1.5;
    }
  }
  return {
    stations,
    cur: () => S.id,
    tune,
    next,
    prev: next,
    off: () => S.id && tune(null),
    era() {},
    tick,
    stop: () => (S.id = null),
  };
})();
window.GLRADIO = GLRADIO;
