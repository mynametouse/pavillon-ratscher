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
