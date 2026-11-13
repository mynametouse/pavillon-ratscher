// ===================== feat/grenzland: skittles (GLKEGELN) – first version of the core: a throw decided by the rules =====================
// The helper agent `grenzland-neben` replaces this by the game on the open-air alley. Interface: GLKEGELN.spielen() → Promise<{ punkte, wuerfe }>.
import { PLAY } from '../game/play.js';
import { GLNLOGIK } from './gl_neben_logik.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
export const GLKEGELN = (() => {
  async function spielen() {
    const r = GLNLOGIK.wurf(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.02,
      0,
      0.8,
      null,
      (Math.random() * 1e9) | 0
    );
    GLTON.fx('wurf');
    GLTON.fx(r.rinne ? 'rinne' : 'kegel', 0, 200, r.fallen.length);
    GL.stats.kegel = Math.max(GL.stats.kegel, r.fallen.length);
    GL.save();
    PLAY.think(r.rinne ? 'Rinne.' : r.fallen.length === 9 ? 'Alle Neune!' : r.fallen.length + ' Kegel.', 2500);
    GL.emit('kegeln', { punkte: r.fallen.length });
    return { punkte: r.fallen.length, wuerfe: 1 };
  }
  return { spielen, on: false };
})();
window.GLKEGELN = GLKEGELN;
