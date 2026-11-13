// ===================== feat/cockpit: the inside of the cars – what the driver sees and touches (COCKPIT) =====================
// Falko 13.11.2026 15:54: „… auch die Innenansicht sollte realistisch sein mit Tacho, bewegtem Lenkrad, Händen am Lenkrad, Schalten und so
// weiter …“; decided 16:05: the bodies come from the roads chat, the inside from here (docs/plans/auftraege/cockpit.md,
// docs/features/cockpit.md). So far: the settings (vehicles/cockpit_set.js – graphics while moving, the frame-rate counter).
//   COCKPIT.set (CPSET) · COCKPIT.info()
import { CPSET } from './cockpit_set.js';
export const COCKPIT = (() => {
  const info = () => ({ set: CPSET.info() });
  return { set: CPSET, info };
})();
window.COCKPIT = COCKPIT;
