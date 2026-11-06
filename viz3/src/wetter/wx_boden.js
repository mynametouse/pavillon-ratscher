// ===================== feat/wetter: wet ground and roofs, snow lying on them (WXBODEN) =====================
// Rain darkens what it falls on and makes it glossy – asphalt most, soil and lawn less – and it stays so for a while after the rain (the
// wetness comes from the precipitation of the last hours, wetter/wetter.js). Only the materials' colour and roughness change (uniforms –
// no program is touched): the land of the 2.4 km square (world/ratscher.js 'geoterrain'), the far fields ('fields'), the tiles of the
// wider world ('welt-tile', also built later – looked for again while it is wet), bridge decks, the garden's ground (garden/env.js, its
// painted map), the lawn's grass tufts and the roofs (a little). The original values are kept and come back exactly when it dries.
// Snow lying (the snow depth of the data, a few centimetres cover it all): the same surfaces turn white – their own colour damped, a white
// that follows the light of the moment added as emission (grey under clouds, faint at night; walls, trees and grass stay as they are, as
// they do under a thin snow cover).
import { markDirty } from '../core/assets.js';
import { scene } from '../core/head.js';
import { gpaint } from '../garden/env.js';
export const WXBODEN = (() => {
  // ground material → { c: original colour, r: original roughness, k: how much it darkens, g: how glossy it gets }; materials that are
  // not ground are remembered as such (weakly: dropped zones are not held)
  const M = new Map(),
    NO = new WeakSet();
  const S = { wet: 0, shown: 0, snow: 0, snowShown: 0, frostShown: 0, lightShown: 1, scanT: 1e9 };
  function kind(m, o) {
    if (!m || !m.isMeshStandardMaterial) return null;
    // the lawn's grass tufts (garden/grass.js: instanced, thinned with distance): a little darker and glossier when wet, white under
    // snow and hoarfrost (frost whitens the blades first)
    if (o && o.isInstancedMesh && o.userData && o.userData.thin) return { k: 0.08, g: 0.15, s: 0.75, f: 1 };
    if (m.map && m.map.image === gpaint) return { k: 0.26, g: 0.25, s: 1, f: 0.45 };
    let key = '';
    try {
      key = m.customProgramCacheKey ? String(m.customProgramCacheKey()) : '';
    } catch (e) {}
    if (/^geoterrain(?!\|zinnen)/.test(key) || key.startsWith('welt-tile') || key.startsWith('fields'))
      return { k: 0.3, g: 0.45 };
    if (key.startsWith('roaddeck')) return { k: 0.35, g: 0.5 };
    if (key.startsWith('georoof') || key.startsWith('v16e-roof')) return { k: 0.16, g: 0.3, s: 0.9 };
    return null;
  }
  function scan() {
    const seen = new Set();
    scene.traverse(o => {
      if (!o.isMesh || !o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m || NO.has(m)) continue;
        if (M.has(m)) {
          seen.add(m);
          continue;
        }
        const q = kind(m, o);
        if (!q) {
          NO.add(m);
          continue;
        }
        const e = {
          c: m.color.clone(),
          r: m.roughness,
          em: m.emissive.clone(),
          k: q.k,
          g: q.g,
          s: q.s ?? 1,
          f: q.f ?? 0.4,
        };
        M.set(m, e);
        seen.add(m);
        paint(m, e);
      }
    });
    // materials of zones dropped meanwhile are let go
    for (const m of [...M.keys()]) if (!seen.has(m)) M.delete(m);
  }
  // hoarfrost (0–1) greys the grass most, roofs much, bare ground and roads little; a faint blue in its white
  function paint(m, e) {
    const w = S.shown,
      sn = S.snowShown * e.s,
      fr = 0.38 * S.frostShown * e.f,
      wh = Math.max(sn, fr);
    m.color.copy(e.c).multiplyScalar((1 - e.k * w) * (1 - 0.72 * wh));
    m.roughness = e.r - (e.r - 0.25) * e.g * w * (1 - wh);
    const L = S.lightShown;
    m.emissive.copy(e.em);
    m.emissive.r += (0.62 * sn + 0.33 * fr) * L;
    m.emissive.g += (0.62 * sn + 0.35 * fr) * L;
    m.emissive.b += (0.62 * sn + 0.4 * fr) * L;
  }
  // the wetness (0 dry – 1 soaked) and the snow lying (0–1) to show, eased by the caller, and the light of the moment (the white of the
  // snow follows it); a visible step repaints
  function set(wet, dt, snow = 0, light = 1, frost = 0) {
    S.wet = wet;
    S.snow = snow;
    const any =
      wet > 0.01 || snow > 0.01 || frost > 0.01 || S.shown > 0.01 || S.snowShown > 0.01 || S.frostShown > 0.01;
    if ((S.scanT += dt) > 6 && any) {
      S.scanT = 0;
      scan();
    }
    const lk = snow > 0.01 || frost > 0.01 ? light : S.lightShown;
    if (
      Math.abs(wet - S.shown) < 0.02 &&
      !(wet === 0 && S.shown > 0) &&
      Math.abs(snow - S.snowShown) < 0.02 &&
      !(snow === 0 && S.snowShown > 0) &&
      Math.abs(frost - S.frostShown) < 0.02 &&
      !(frost === 0 && S.frostShown > 0) &&
      Math.abs(lk - S.lightShown) < Math.max(0.01, S.lightShown * 0.04)
    )
      return;
    S.shown = wet < 0.01 ? 0 : wet;
    S.snowShown = snow < 0.01 ? 0 : snow;
    S.frostShown = frost < 0.01 ? 0 : frost;
    S.lightShown = lk;
    for (const [m, e] of M) paint(m, e);
    markDirty();
  }
  return { set, S, count: () => M.size };
})();
