// ===================== feat/welt-gebaeude: Ratscher's ground without the printed roofs – the switch, and the roof colours (GEBDACH) =====================
// The ground images of Ratscher are retouched (tools/welt-gebaeude/retusche.py: where a building stands in 3D, its roof printed in the photo
// is gone, filled with the ground around). The manifest of viz3/extra/welt-gebaeude names them (geoman.tex.near/inner: file, lq) and the
// originals (orig, origLq); ?bodenalt draws the originals again (to compare) – this module runs before world/ratscher.js reads the names.
// world/village.js took each roof's colour from the ground image: now from 1024² copies of the originals (dach – the size it samples at).
import * as THREE from 'three';
import { BASE } from '../core/head.js';
import { LM } from '../core/assets.js';
export const GEBDACH = (() => {
  const S = { near: null, inner: null, retouched: false, loaded: 0 };
  const M = window.GEOMAN;
  if (!M || !M.tex) return S;
  const alt = new URLSearchParams(location.search).has('bodenalt');
  for (const k of ['near', 'inner']) {
    const t = M.tex[k];
    if (!t || !t.orig) continue;
    if (alt) {
      // the published originals (the retouched ones stay unused)
      t.file = t.orig;
      if (t.origLq) t.lq = t.origLq;
      continue;
    }
    S.retouched = true;
    if (t.dach)
      new THREE.ImageLoader(LM).load(
        BASE + 'geo/' + t.dach,
        img => {
          S[k] = { image: img };
          S.loaded++;
        },
        undefined,
        () => {}
      );
  }
  return S;
})();
window.GEBDACH = GEBDACH;
