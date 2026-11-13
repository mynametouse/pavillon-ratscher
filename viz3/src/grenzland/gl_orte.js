// ===================== feat/grenzland: the mode's own places in the world (GLORTE) – placeholder of the core =====================
// The helper agent `grenzland-neben` builds this: the clique's place by the field track – a field barn, an open-air skittle alley, a
// grill –, the shop on wheels at the Anger, the angling spot at the dam. The interface stays:
//   GLORTE.P → { scheune: [x, y], kegel: [x, y], grill: [x, y], wagen: [x, y], angel: [x, y] } · build() · drop() · inScheune(x, y) · tick(dt)
import { GLDATA } from './gl_data.js';
export const GLORTE = (() => {
  const O = GLDATA.ORTE;
  const P = {
    scheune: O.treff.pos,
    kegel: [O.treff.pos[0] + 8, O.treff.pos[1]],
    grill: [O.treff.pos[0] - 5, O.treff.pos[1] + 3],
    wagen: O.wagen.pos,
    angel: O.damm.pos,
  };
  return {
    P,
    build() {},
    drop() {},
    inScheune: (x, y) => Math.hypot(x - P.scheune[0], y - P.scheune[1]) < 5,
    tick() {},
  };
})();
window.GLORTE = GLORTE;
