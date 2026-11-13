// ===================== feat/grenzland: the missions (GLMISSION) – placeholder of the core: none yet =====================
// The helper agent `grenzland-mission` builds this (chapter 1). The interface stays:
//   GLMISSION.start(id) · cur() → id | '' · list() → the journal's entries · tick(dt) · stop() · reset() · neu() (a fresh game: the first mission)
// The missions list themselves in the game's journal (KERN.tasks.source id 'grenzland') and are tracked there (QUESTS.track = 'grenzland:<id>').
import { KERN } from '../core/kern.js';
export const GLMISSION = (() => {
  KERN.tasks.source({ id: 'grenzland', order: 4, list: () => [] });
  return { start: () => false, cur: () => '', list: () => [], tick() {}, stop() {}, reset() {}, neu() {} };
})();
window.GLMISSION = GLMISSION;
