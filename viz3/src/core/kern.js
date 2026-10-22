// @ts-check
// ===================== KERN: services every feature uses – ground, terrain, road surface, collision, place names (refactor phase 1) =====================
// Features ask KERN instead of reaching into the world modules (ROADS, RATSCHER, WCOL, VPROPS, FOREST). The world modules register themselves
// as providers when they load (world/ratscher.js, world/roads.js, world/worldcol.js, world/village_props.js); the tiled world
// (claude/pavillon-welt.md) will register its own providers and replace the 2.4 km square without touching the features.
//   KERN.ground(x, y, z?)  height (m) of the ground one stands or drives on: terrain, modelled site, bridge decks (z: the current height –
//                          a deck counts only when coming from its level)
//   KERN.terrain(x, y)     height of the terrain itself (no decks)          KERN.surface(x, y) → { e, kind, surf, lat } of a road, or null
//   KERN.pushOut(p, r)     moves the point p = [x, y] out of walls and trunks (radius r, outside the modelled square)
//   KERN.place(x, y)       name of the place or road, or null – asks the providers from the highest priority down
//   KERN.provide(name, fn, prio = 0)   for the world modules;  KERN.providers() lists what is registered (tests)
/**
 * A road under a point (KERN.surface).
 * @typedef {object} RoadAt
 * @property {number} e     distance to the road edge (m, larger = further inside)
 * @property {number} kind  road class, index into GEOMAN.roads.kinds (motorway, main, county, street, lane, service, track, path, foot)
 * @property {number} surf  surface, index into GEOMAN.roads.surf (asphalt, concrete, paving, gravel, ground, grass)
 * @property {number} lat   lateral offset from the centre line (m)
 */
/**
 * @typedef {'ground' | 'terrain' | 'surface' | 'pushOut' | 'place'} KernService
 * @typedef {object} Kern
 * @property {(name: KernService, fn: (...a: any[]) => any, prio?: number) => void} provide  for the world modules (highest prio answers)
 * @property {() => Record<string, number>} providers  how many providers each service has (tests)
 * @property {(x: number, y: number, z?: number) => number} ground  height (m) one stands or drives on; z: current height (bridge decks)
 * @property {(x: number, y: number) => number} terrain  height of the terrain itself
 * @property {(x: number, y: number) => RoadAt | null} surface  the road at a point, or null
 * @property {(p: number[], r: number) => boolean} pushOut  moves p = [x, y] (in place) out of walls and trunks; true if it moved
 * @property {(x: number, y: number) => string | null} place  name of the place or road, highest priority first
 */
/** @type {Kern} – type-checked (// @ts-check above; tools/check/tsconfig.json, run by tools/check.sh) */
export const KERN = (() => {
  const P = {};
  function provide(name, fn, prio = 0) {
    (P[name] = P[name] || []).push({ fn, prio });
    P[name].sort((a, b) => b.prio - a.prio);
  }
  const first =
    (name, fallback) =>
    (...a) =>
      P[name] ? P[name][0].fn(...a) : fallback;
  return {
    provide,
    providers: () => Object.fromEntries(Object.entries(P).map(([k, l]) => [k, l.length])),
    ground: first('ground', 0),
    terrain: first('terrain', 0),
    surface: first('surface', null),
    pushOut: first('pushOut', undefined),
    place(x, y) {
      for (const p of P.place || []) {
        const n = p.fn(x, y);
        if (n) return n;
      }
      return null;
    },
  };
})();
window.KERN = KERN;
