// ===================== feat/bewuchs: the vegetation template – lawn, grass and (stage 2) wildflowers in 3D everywhere (BEWUCHS) =====================
// Falko, 17.11.2026 20:19 (plan: docs/plans/plan_bewuchs.md): „… das Gras ist noch 2D, komplett flach … Rasen, Gras, Wildblumen, aber auch
// gestaltete … Flächen … wobei es trotzdem im Browser weiterhin flüssig laufen können soll“; 21:30: lawn and meadows at once. This module
// ties the parts together and keeps them in budget:
//   bw_karte.js  what grows where (the helper bewuchs-daten's maps; until then rules), the textures around the camera
//   bw_phaeno.js the year: heights, cuts, colours per kind of area (the helper bewuchs-pflanzen's table replaces the estimates)
//   bw_halm.js   the blades in three rings around the camera
//   bw_blume.js  the wildflowers on the same tiles (stage 2)
//   bw_ferne.js  their colour in the ground far away (stage 2b, through a marked hook in world/roads.js)
// Each frame (KERN.tick): the maps near the observer, the tiles in view, the day of the year (when it changed), the garden's mowing
// (GRASS.MOW of garden/grass.js – the mower and the strategy view cut there – as a texture the blades read). The tier of the device
// (render/render.js: hoch, mittel, schnell; phones and tablets the lightest) sets how far and how dense; a change rebuilds the rings
// (their programs stay the same). With ?nobewuchs nothing of this runs and the garden has its old lawn clumps (garden/grass.js).
//   BEWUCHS.state()   { on, tier, spec, doy, karte, halm }  (tests)
//   BEWUCHS.set(o)    { mode } 'voll' | 'einfach' | 'aus' (the menu's switch, saved as pav-bewuchs-v1), { dens } density scale 0–1,
//                     { tier } force a tier, { doy } force a day (tests)
import * as THREE from 'three';
import { $, cam, COARSE, QS, BASE } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { GRASS } from '../garden/grass.js';
import { RATSCHER } from '../world/ratscher.js';
import { RENDER } from '../render/render.js';
import { WETTER } from '../wetter/wetter.js';
import { BWKARTE } from './bw_karte.js';
import { BWPHAENO } from './bw_phaeno.js';
import { BWHALM } from './bw_halm.js';
import { BWBLUME } from './bw_blume.js';
import { BWFERNE } from './bw_ferne.js';
import { BWSTRAUCH } from './bw_strauch.js';
import { BWARTEN } from './bw_arten.js';
import { ROADS } from '../world/roads.js';
export const BEWUCHS = (() => {
  const S = {
    on: false,
    tier: '',
    spec: null,
    doy: NaN,
    forceDoy: null,
    forceTier: null,
    mowN: 0,
    err: '',
    mode: 'voll',
    dens: 1,
  };
  if (QS.has('nobewuchs') || !window.RATSCHER || !RATSCHER.on) return S;
  S.on = true;
  // how far and how dense per tier: dense and near – blades of three triangles per 1 m tile (together the most at one's feet), mid – of one
  // triangle per 2 m tile, only where the grass stands tall enough (docs/plans/plan_bewuchs.md 4.6)
  const SPEC = {
    hoch: { dense: { r: 6, k: 480 }, near: { r: 14, k: 160 }, mid: { r: 40, k: 64, s: 2 } },
    mittel: { dense: { r: 5, k: 320 }, near: { r: 10, k: 120 }, mid: { r: 28, k: 48, s: 2 } },
    schnell: { dense: { r: 4, k: 224 }, near: { r: 7, k: 88 }, mid: { r: 18, k: 32, s: 2 } },
  };
  // the menu's switch (Grafik → „Gras und Blumen“): voll, einfach (a tier lighter and thinner), aus
  const MODES = ['voll', 'einfach', 'aus'],
    KEY = SAVE.key('pav-bewuchs-v1', { owner: 'bewuchs', kind: 'text', def: 'voll', check: v => MODES.includes(v) });
  S.mode = SAVE.get(KEY);
  const LIGHTER = { hoch: 'mittel', mittel: 'schnell', schnell: 'schnell' };
  const tierNow = () => {
    const t = S.forceTier || (COARSE ? 'schnell' : RENDER.tier || 'mittel');
    return S.mode === 'einfach' ? LIGHTER[t] || 'schnell' : t;
  };
  function show() {
    const on = S.mode !== 'aus';
    for (const R of BWHALM.rings) R.mesh.visible = on;
    for (const M of BWBLUME.meshes) M.mesh.visible = on;
    if (BWSTRAUCH.G) BWSTRAUCH.G.visible = on;
    BWHALM.U.uBwP.value.y = S.mode === 'einfach' ? 0.6 : S.dens;
    const b = $('bwbtn');
    if (b) {
      b.setAttribute('aria-pressed', S.mode === 'voll' ? 'true' : 'false');
      const sp = b.querySelector('span');
      if (sp) sp.textContent = S.mode;
    }
    markDirty();
  }
  function setMode(m) {
    if (!MODES.includes(m)) return;
    S.mode = m;
    SAVE.set(KEY, m);
    retier();
    show();
  }
  $('bwbtn')?.addEventListener('click', () => setMode(MODES[(MODES.indexOf(S.mode) + 1) % MODES.length]));
  // the shrubs: how far (m) and how many by tier
  const SHRUBS = {
    hoch: { r: 150, cap: 1600, near: 34 },
    mittel: { r: 110, cap: 1000, near: 26 },
    schnell: { r: 70, cap: 450, near: 18 },
  };
  function retier() {
    const t = tierNow();
    if (t === S.tier && S.spec) return;
    S.tier = t;
    S.spec = SPEC[t] || SPEC.mittel;
    BWHALM.build(S.spec);
    BWSTRAUCH.set(SHRUBS[t] || SHRUBS.mittel);
    show();
  }
  // the day of the year of the game's clock (as world/forest.js), with its hour
  function doyNow() {
    if (S.forceDoy != null) return S.forceDoy;
    if (!window.DN || !window.CLOCK) return 150;
    const d = new Date((DN.jdOf(CLOCK.t) - 2440587.5) * 864e5);
    return (d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1;
  }
  // ---------- the orthophoto at the blades' foot (Ratscher's near picture, the one its ground uses) ----------
  function photo() {
    const M = window.GEOMAN,
      t = RATSCHER.tex && RATSCHER.tex.near;
    if (!M || !M.tex || !M.tex.near || !t) return;
    const n = M.tex.near;
    BWHALM.U.tBwF.value = t;
    BWHALM.U.uBwF.value.set(M.xf.ex - n.e0, M.xf.ey - n.n0, 1 / n.w, 1);
    BWHALM.U.uBwAB.value.set(M.xf.a, M.xf.b);
  }
  // ---------- the garden's mowing as a texture: R grown (0 just cut … 1 grown again), G the stripe (0 darker, 0.5 none, 1 lighter) ----------
  const MW = GRASS.MOW;
  let mowTex = null,
    mowData = null,
    mowDirty = true,
    mowT = -1e9;
  if (MW && MW.grid) {
    mowData = new Uint8Array(MW.nx * MW.ny * 4);
    mowTex = new THREE.DataTexture(mowData, MW.nx, MW.ny, THREE.RGBAFormat, THREE.UnsignedByteType);
    mowTex.magFilter = THREE.NearestFilter;
    mowTex.minFilter = THREE.NearestFilter;
    mowTex.generateMipmaps = false;
    BWHALM.U.tBwM.value = mowTex;
    BWHALM.U.uBwM.value.set(MW.x0, MW.y0, 1 / (MW.nx * MW.c), 1 / (MW.ny * MW.c));
    // the mower, the strategy view and a loaded game change the grid through these: the texture follows
    for (const f of ['cut', 'grow', 'cutLoad']) {
      const f0 = GRASS[f];
      if (typeof f0 !== 'function') continue;
      GRASS[f] = (...a) => {
        const r = f0(...a);
        mowDirty = true;
        return r;
      };
    }
  }
  function mowUpload(t) {
    if (!mowTex) return;
    const g = MW.grid,
      sh = MW.sh,
      D = mowData;
    let any = 0;
    for (let j = 0; j < g.length; j++) {
      const tc = g[j],
        o = j * 4;
      if (tc >= 0 && t - tc < MW.grow) {
        D[o] = Math.max(0, Math.min(255, Math.round(((t - tc) / MW.grow) * 255)));
        D[o + 1] = sh[j] > 0 ? 255 : sh[j] < 0 ? 0 : 128;
        any++;
      } else {
        D[o] = 255;
        D[o + 1] = 128;
      }
      D[o + 2] = 0;
      D[o + 3] = 255;
    }
    S.mowN = any;
    mowTex.needsUpdate = true;
    mowDirty = false;
    mowT = t;
    markDirty();
  }
  // ---------- each frame ----------
  let tierT = 0;
  function tick(dt) {
    if (!RATSCHER.ready || S.mode === 'aus') return;
    try {
      if ((tierT -= dt) <= 0) {
        tierT = 1;
        retier();
        if (BWHALM.U.uBwF.value.w < 0.5) photo();
      }
      // the maps around the camera (the rings follow it)
      BWKARTE.want(cam.position.x, -cam.position.z);
      // new map data (cells, the garden's site): the far bloom again
      const kn = BWKARTE.loaded * 1000 + BWKARTE.site.n;
      if (kn !== S.kn) {
        S.kn = kn;
        BWFERNE.refill();
      }
      BWFERNE.want(cam.position.x, -cam.position.z);
      BWKARTE.tick();
      const d = doyNow();
      // a new day – or the helper's species and atlas just arrived (bw_blume.js fromArten)
      if (!(Math.abs(d - S.doy) < 0.05) || BWBLUME.ver !== S.blVer) {
        S.doy = d;
        S.blVer = BWBLUME.ver;
        BWHALM.day(d);
        BWBLUME.day(d);
        BWFERNE.day(d);
      }
      // snow lying and hoarfrost of the weather (eased there)
      const W = WETTER && WETTER.S,
        sn = (W && W.snowC) || 0,
        fr = (W && W.frostC) || 0,
        P4 = BWHALM.U.uBwP.value;
      if (Math.abs(sn - P4.z) > 0.01 || Math.abs(fr - P4.w) > 0.01) {
        P4.z = sn;
        P4.w = fr;
        markDirty();
      }
      const t = window.CLOCK ? CLOCK.t : 0;
      if (mowDirty || (S.mowN && Math.abs(t - mowT) > 20)) mowUpload(t);
      BWHALM.update(false, dt);
      // stage 3: the shrubs round the camera (not seen from high above: 160 m over the ground under it – a hill counts as ground)
      const gz = BWHALM.zAt(Math.floor(cam.position.x), Math.floor(-cam.position.z), 1);
      BWSTRAUCH.set({ on: cam.position.y - gz < 160 });
      BWSTRAUCH.tick(cam.position.x, -cam.position.z, S.doy);
    } catch (e) {
      if (!S.err) console.warn('bewuchs', e);
      S.err = String((e && e.message) || e);
    }
  }
  KERN.tick(tick, 'bewuchs');
  // flowering meadows far away: the ground shaders call bwFar (marked hook in world/roads.js) – its body from bw_ferne.js
  if (ROADS) ROADS.bwFar = BWFERNE.shader;
  // the garden's buildings moved or a worn patch changed (garden/grass.js footHideApply): the site texture again
  if (GRASS) GRASS.onFoot = () => BWKARTE.siteDirty();
  // the helper's species table (bewuchs/bw_arten.js): the kinds of area (heights, care, grasses, vigour, bare spots) and the wildflowers
  // with their atlas (loaded: dist/bewuchs/blumen.png, blumen.json – until then the stand-ins of bw_blume.js)
  try {
    S.arten = BWPHAENO.fromArten(BWARTEN);
    BWBLUME.fromArten(BWARTEN, BASE);
    BWSTRAUCH.fromArten(BWARTEN);
    // stage 5a: the field crops as rows of the class table, the choices of the maps' crop classes for the shaders
    if (BWPHAENO.fromCrops(BWARTEN)) BWHALM.crops(BWPHAENO.cropChoice(BWARTEN));
  } catch (e) {
    S.err = 'arten: ' + String((e && e.message) || e);
  }
  // built at load: the programs compile with the others before the first picture
  retier();
  BWKARTE.siteDirty();
  function set(o = {}) {
    if (o.dens != null) {
      S.dens = Math.max(0, Math.min(1, +o.dens));
      show();
    }
    if (o.mode !== undefined) setMode(o.mode);
    if (o.tier !== undefined) {
      S.forceTier = o.tier;
      retier();
    }
    if (o.doy !== undefined) {
      S.forceDoy = o.doy;
      S.doy = NaN;
    }
    markDirty();
  }
  const state = () => ({
    on: S.on,
    mode: S.mode,
    tier: S.tier,
    spec: S.spec,
    doy: +(+S.doy).toFixed(2),
    mown: S.mowN,
    err: S.err,
    arten: S.arten || 0,
    strauch: BWSTRAUCH.state(),
    karte: BWKARTE.state(),
    halm: BWHALM.stats(),
    blumen: BWBLUME.stats(),
    ferne: BWFERNE.state(),
  });
  Object.assign(S, { state, set, SPEC });
  return S;
})();
if (typeof window !== 'undefined') window.BEWUCHS = BEWUCHS;
