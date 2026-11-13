// ===================== feat/grenzland: fishing at the reservoir (GLANGELN) – first version of the core: a bite decided by the rules =====================
// The helper agent `grenzland-neben` replaces this by the game (rod, float, bite, reel). Interface: GLANGELN.angeln(koeder) → Promise<fang | null>.
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { GLNLOGIK } from './gl_neben_logik.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
export const GLANGELN = (() => {
  async function angeln(koeder = 'mais') {
    if (!GL.use(koeder)) {
      PLAY.think('Kein Köder.', 2000);
      return null;
    }
    let mon = 7;
    try {
      const d = DN.dateOf ? DN.dateOf(CLOCK.t) : null;
      if (d && d.getUTCMonth) mon = d.getUTCMonth() + 1;
    } catch (e) {}
    const h = ((((CLOCK.t % 1440) + 1440) % 1440) / 60) | 0,
      f = GLNLOGIK.fang(mon, h, koeder, (Math.random() * 1e9) | 0);
    GLTON.fx('platsch');
    if (!f) {
      PLAY.think('Nichts beißt.', 2200);
      return null;
    }
    GL.stats.fische++;
    GL.stats.best = Math.max(GL.stats.best, f.kg);
    GL.add(f.art, 1);
    PLAY.think(f.name + ', ' + String(f.kg).replace('.', ',') + ' kg.', 3000);
    GL.emit('fang', f);
    return f;
  }
  return { angeln, on: false };
})();
window.GLANGELN = GLANGELN;
