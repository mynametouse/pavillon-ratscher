// ===================== feat/zombie-innen: the village houses from inside (ZINNEN) – contract, filled in by the helper agent 'zombie-innen' =====================
// The zombie night (Falko, 4.11.2026) needs every house of Ratscher to be enterable, furnished in the style of a Thuringian Forest village
// (built after real photos: docs/plans/zombie_einrichtung.md). This module builds ONE house's interior inside the house's own footprint
// (world/village.js VILLAGE.bld – the facade quads stay; seen from inside they are back faces and not drawn) and takes it away again.
// Nothing happens at load time: every call comes from zombie/z_haus.js (ZHAUS) while the zombie night runs, or from the test scenario.
//
// API (site coordinates: x east, y north, z up, metres; yaw as compass degrees, 0 = north):
//   ZINNEN.list()        → [{ id, cx, cy, door: { x, y, z, nx, ny, w } }]   every enterable building (houses with a door; later barns),
//                          door = the middle of the front door on the facade, n = outward normal, z = the floor level outside (foot)
//   ZINNEN.info(id)      → { id, storeys, cellar, attic, style, owner, rooms: [{ id, kind, floor, name }] }   cheap, deterministic, builds nothing
//   ZINNEN.mount(id)     → Promise<H>   builds the interior (meshes, COL boxes, WALK slabs, doors, lights, actions) – H, the handle:
//     H.entry  { x, y, z, yaw }          where one stands inside after coming through the front door (facing into the house)
//     H.exit   { x, y, z, yaw }          outside in front of the front door (facing away from it)
//     H.openings [{ id, kind: 'door' | 'window', floor, a: [x, y], b: [x, y], z0, z1, n: [nx, ny], room, front }]
//                                        the openings of the outer walls a barricade can close (front/back door, the windows of the ground
//                                        floor; a → b along the inner face, n pointing out of the house)
//     H.containers [{ id, kind, room, pos: [x, y, z], label }]   searchable furniture (kinds: 'schublade', 'schrank', 'kuehlschrank', 'buefett',
//                                        'regal', 'truhe', 'kleiderschrank', 'nachttisch', 'werkbank', 'waffenschrank', 'kiste' …)
//     H.spots  [{ id, kind, room, pos: [x, y, z], yaw }]   things the game uses: 'bett', 'ofen', 'herd', 'radio', 'tv', 'spuele', 'wanne', 'tisch' …
//     H.rooms  [{ id, kind, floor, name, poly: [[x, y] …], z0, z1 }]
//     H.graph  { nodes: [{ x, y, z, room }], edges: [[i, j] …] }   waypoints through the doorways and stairs (zombies walk along them)
//     H.inside(x, y, z) → boolean          is this point inside the interior (any room, any storey)
//     H.onSearch = (container, H) => { items, text } | null   set by ZHAUS: called when the player searches a container (open it, show text)
//     H.onUse = (spot, H) => boolean        set by ZHAUS: called for 'bett', 'radio', 'ofen' … (the module offers the action, ZHAUS decides)
//     H.stats  { ms, meshes, draws, tris }
//   ZINNEN.unmount(H)    removes it all (meshes disposed, COL/WALK entries neutralised, doors and actions gone, lights given back)
//   ZINNEN.mounted()     → the handles built now (normally one)
import { KERN } from '../core/kern.js';
export const ZINNEN = (() => {
  const S = { ready: false, built: [] };
  S.list = () => [];
  S.info = () => null;
  S.mount = async () => null;
  S.unmount = () => {};
  S.mounted = () => S.built.slice();
  // a test scenario of the agent: ?szenario=zombie-innen goes into a house (menu: false)
  KERN.scenario('zombie-innen', { label: 'Haus von innen (Test)', menu: false, order: 99, run: () => null });
  return S;
})();
window.ZINNEN = ZINNEN;
