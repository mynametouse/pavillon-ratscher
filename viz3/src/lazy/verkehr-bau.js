// feat/verkehr-real: the worker that builds the vehicles of the traffic (dist/lazy/verkehr-bau.js, a module worker started by
// verkehr/vk_modelle.js). Building a type takes 50–250 ms – here, off the main thread, so no frame waits for it. Not in modules.txt.
// Messages: { id, typ, lod } → { id, ok: true, geos: [geo, …] } (lod 'fern': the levels 1 and 2 together) or { id, ok: false, err };
// the arrays are transferred, never copied (verkehr/vk_bau.js VKBAU.geo for what a geo holds).
import { VKBAU } from '../verkehr/vk_bau.js';
self.onmessage = e => {
  const { id, typ, lod } = e.data || {};
  try {
    const geos = lod === 'fern' ? VKBAU.geo12(typ) : [VKBAU.geo(typ, lod)],
      bufs = [];
    for (const g of geos) bufs.push(...VKBAU.buffers(g));
    self.postMessage({ id, ok: true, geos }, bufs);
  } catch (err) {
    self.postMessage({ id, ok: false, err: String((err && err.stack) || err) });
  }
};
