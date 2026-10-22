// ---------- design variant switch: A = spiral stair tower, B = ladder stairs with trapdoor and roof hatch (both are in the scene) ----------
// Switching swaps: visible meshes, walk surfaces and colliders (tagged per variant), doors and hatches, the light volume, the two variant lamps,
// building phases with costs, viewpoints and labels. The player stays where he is if that place exists in the other variant.
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { setVariantId, VARIANT } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { GEO_A, GEO_B } from './house_ladder.js';
import { T1, T2, TLAMP } from './interior.js';
import { giApply, svApply } from '../render/render.js';
import { floorAt, P, PHASE, setPhase } from '../game/walkable.js';
import { applySpots, go, resetLastPlace, SPOTS } from '../game/player.js';
import { toast } from '../audio/audio.js';
import { PHASES, PHASES_A, PHASES_B } from './phases.js';
export function setVariant(v, { save = true } = {}) {
  if (v !== 'A' && v !== 'B') return;
  const changed = v !== VARIANT;
  setVariantId(v);
  window.VARIANT = v;
  document.body.dataset.variant = v;
  for (const k of Object.keys(GEO)) delete GEO[k];
  Object.assign(GEO, v === 'A' ? GEO_A : GEO_B);
  PHASES.splice(0, PHASES.length, ...(v === 'A' ? PHASES_A : PHASES_B));
  applySpots(v);
  T1.position.copy(TLAMP[v][0]);
  T2.position.copy(TLAMP[v][1]);
  svApply(v);
  if (window.giApply) giApply();
  if (save) {
    try {
      SAVE.setRaw('pav-variant', v);
    } catch (e) {}
  }
  document
    .querySelectorAll('[data-var-set]')
    .forEach(b => b.setAttribute('aria-pressed', b.dataset.varSet === v ? 'true' : 'false'));
  const tc = document.querySelector('[data-spot="treppe"]');
  if (tc) tc.textContent = SPOTS.treppe.label;
  const dl = document.querySelector('[data-spot="dach"] .lv');
  if (dl) dl.textContent = '+' + GEO.zD.toFixed(2).replace('.', ',');
  if (changed) {
    if (window.PLANNER) PLANNER.select(null);
    setPhase(PHASE);
    if (P.mode === 'walk') {
      const fl = floorAt(P.x, P.y, P.feet + 0.3);
      if (Math.abs(fl - P.feet) < 0.35) P.feet = fl;
      else
        go(
          P.feet > GEO.zC
            ? 'dach'
            : P.feet > GEO.zE - 0.3
              ? 'arbeitsraum'
              : P.x > -1 && P.x < 7 && P.y > -1 && P.y < 5
                ? 'bibliothek'
                : 'eingang'
        );
    }
    resetLastPlace();
    markDirty(true);
    if (window.PANO && LATE.PANO.on) LATE.panoShow(true);
    toast(
      v === 'A'
        ? 'Variante Turm: Wendeltreppe im Turm an der Ostseite'
        : 'Variante Leiter: ohne Turm, Leitertreppen mit Bodenluke und Dachluke',
      3200
    );
  }
}
document
  .querySelectorAll('[data-var-set]')
  .forEach(b => b.addEventListener('click', () => setVariant(b.dataset.varSet)));
// (V15: the V key switches between the eyes and the figure; the variant is chosen in the menu)
