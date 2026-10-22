// @ts-check
// ===================== LATE: references against the load order (refactor phase 1) =====================
// The modules load in the order of modules.txt and import only from modules above them: a static import of a module further down would load
// that one first and change the load order (scene, lights, merges). Where a module still needs something of a module further down, that
// module hands it over here when it loads, and the user reads it when it runs – never while it loads:
//   world/roads.js:  LATE.ROADS = ROADS;        garden/env.js:  LATE.ROADS.surface(x, y)
// Functions are handed over at the top of their module (they exist from the start), let-variables as getters (always the current value).
// Every entry is a place where the layers still point the wrong way; the services of phase 2 replace them (tools/check/deps.mjs lists them).
/** @type {Record<string, any>} */
export const LATE = {};
