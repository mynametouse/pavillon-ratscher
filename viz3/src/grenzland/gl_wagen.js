// ===================== feat/grenzland: the shop on wheels at the Anger (GLWAGEN) – first version of the core: a list to buy from =====================
// The helper agent `grenzland-neben` replaces this (the van itself, the saleswoman, opening hours). Interface: GLWAGEN.open() → Promise.
import { PLAY } from '../game/play.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLHUD } from './gl_hud.js';
export const GLWAGEN = (() => {
  async function open() {
    const W = GLDATA.WAGEN.filter(w => !w.unter || GL.has('karte1'));
    const i = await GLHUD.wahl(
      'Verkaufswagen',
      'Du hast ' + GL.geld + ' €.',
      W.map(w => ({
        t: w.name,
        s: w.eur.toFixed(2).replace('.', ',') + ' €' + (w.n ? ' · ' + w.n + ' Stück' : ''),
      })).concat([{ t: 'Nichts, danke' }])
    );
    const w = W[i];
    if (!w) return null;
    if (!GL.pay(Math.ceil(w.eur), w.name)) {
      PLAY.think(GLDATA.T.geldFehlt, 2200);
      return null;
    }
    GLTON.fx('geld');
    if (!w.sofort) GL.add(w.k, w.n || 1);
    GL.emit('kauf', { k: w.k });
    return w.k;
  }
  return { open };
})();
window.GLWAGEN = GLWAGEN;
