// ===================== Trusetal (Brotterode-Trusetal): the town on the original data (TRUSETAL) =====================
// ~40 km north-west of the garden, beyond the region's detail. A zone of core/kern.js (KERN.zone) like Kloster Veßra, but without
// models of its own: its own tile set welt-test/zonen/trusetal/ (tools/welt/build.py --plan TS: ground DGM1 Thüringen 1 m, the 2024
// aerial image of GDI-Th, the OSM roads cut in) is loaded when the walker or the camera comes within 2.5 km of the town and freed beyond
// 3.2 km; the houses are the ETHOS.BUILDA buildings of the state's LoD2 in the cells of gebaeude/gebaeude.js (tools/welt-gebaeude/orte.py,
// the zone's tiles added to stage welt). Reach it through the map (search „Trusetal“ → Hinfliegen) or the jetpack's list.
import { KERN } from '../core/kern.js';
import { go } from '../game/player.js';
import { WELT } from './welt.js';
export const TRUSETAL = (() => {
  const S = { on: false, state: 'idle' };
  if (!WELT.on) return S;
  S.on = true;
  // the core of the town (the densest houses, ~500 m west of the Wikidata point 599867/5626688 on the valley's eastern slope) and the
  // place one lands: on a street between the houses there, looking along it to the north-east
  const ORT = [-23310, 32709],
    START = [-23271, 32661],
    SUB = 'zonen/trusetal/';
  S.ORT = ORT;
  S.SUB = SUB;
  WELT.addSet(SUB);
  KERN.spot('trusetal', { mode: 'walk', pos: START, z: 0, yaw: 40, pitch: 4, label: 'Trusetal' });
  KERN.scenario('trusetal', { label: 'Trusetal', order: 33, run: () => go('trusetal') });
  KERN.zone({
    id: 'trusetal',
    x: ORT[0],
    y: ORT[1],
    near: 2500,
    far: 3200,
    build: async () => {
      S.state = 'loading';
      WELT.need('trusetal', true, SUB);
      await KERN.until(() => WELT.heightAt(START[0], START[1]) !== undefined, 900);
      const z = WELT.heightAt(START[0], START[1]);
      if (z !== undefined) KERN.spot('trusetal', { z });
      S.state = 'ready';
    },
    drop: () => {
      WELT.need('trusetal', false);
      S.state = 'idle';
    },
  });
  return S;
})();
