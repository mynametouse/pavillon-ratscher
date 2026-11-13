// Suhl runtime, the worker (dist/lazy/suhl-worker.js, a module worker started by lazy/suhl.js): fetches tiles, unpacks them and makes
// the geometry of the buildings off the main thread; answers with typed arrays that are transferred, never copied. Not in modules.txt.
// A worker cannot be handed objects of the app, only data: the transform xf, addresses, the tile, patches of a scenario.
// Messages: { id, op, … } → { id, ok: true, … } or { id, ok: false, err }.
//   init   { xf }                          the transform model <-> UTM (once)
//   bau    { url, turl, frame, tile, level, old, patch, extra, recs? }   a tile of building records → walls and roofs (level 1) or the
//                                          lean far mesh (level 2), wall feet, the foot of every building; recs: true → the records too
//   baum   { url, turl, tile }             the trees of a tile (8 bytes each) → [x, y, z, height, radius, kind, chance] each
//   hoehen { url }                         a height tile (WTH1) → n, h
//   ping   { a: Float32Array, url? }       the check of the first day: the array back doubled, a fetch from here, where the worker runs
import { frame, wth1 } from './suhl/kern/geo.js';
import { baeume, kachel } from './suhl/bau/kachel.js';
let F = null;
// what was fetched lately stays (a tile changes its level when one walks on: no second download, no second parse)
const KEEP = 24,
  cache = new Map();
async function cached(url, read) {
  if (cache.has(url)) {
    const p = cache.get(url);
    cache.delete(url);
    cache.set(url, p);
    return p;
  }
  const p = fetch(url).then(r => {
    if (r.status === 404) return null; // no such tile: nothing there
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
    return read(r);
  });
  cache.set(url, p);
  p.catch(() => cache.delete(url));
  while (cache.size > KEEP) cache.delete(cache.keys().next().value);
  return p;
}
const terrain = url => (url ? cached(url, r => r.arrayBuffer().then(wth1)).catch(() => null) : Promise.resolve(null));
// the records of a tile file: { b: […] } as gebaeude/z/*.json, or the list itself
const recsOf = j => (!j ? [] : Array.isArray(j) ? j : j.b || j.gebaeude || j.g || j.records || []);
const OPS = {
  async init(m) {
    F = frame(m.xf);
    return [{}];
  },
  async bau(m) {
    const [j, ter] = await Promise.all([cached(m.url, r => r.json()), terrain(m.turl)]),
      recs = recsOf(j),
      // the frame of the positions: a tile that names its centre `o` is tile-local (model metres from o), else as the caller says
      fr =
        j && Array.isArray(j.o) ? 'modell' : j && (j.frame === 'utm' || j.frame === 'abs') ? j.frame : m.frame || 'abs',
      [out, tr] = kachel(Object.assign({}, m, { recs, terrain: ter, frame: fr }), F);
    if (m.recs) {
      out.recs = recs.concat(m.extra || []);
      out.head =
        j && !Array.isArray(j) ? { str: j.str || null, fn: j.fn || null, o: j.o || null, z: j.z || null } : null;
    }
    out.frame = fr;
    return [out, tr];
  },
  async baum(m) {
    const [buf, ter] = await Promise.all([cached(m.url, r => r.arrayBuffer()), terrain(m.turl)]);
    return baeume(Object.assign({}, m, { buf: buf || new ArrayBuffer(0), terrain: ter }), F);
  },
  async hoehen(m) {
    const r = await fetch(m.url);
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + m.url);
    const t = await wth1(await r.arrayBuffer());
    return [{ n: t.n, h: t.h }, [t.h.buffer]];
  },
  async ping(m) {
    const a = m.a;
    for (let i = 0; i < a.length; i++) a[i] *= 2;
    let status = 0;
    if (m.url)
      try {
        status = (await fetch(m.url)).status;
      } catch (e) {
        status = -1;
      }
    return [{ a, status, href: self.location.href, module: typeof frame === 'function' }, [a.buffer]];
  },
};
self.onmessage = async ev => {
  const m = ev.data;
  try {
    const fn = OPS[m.op];
    if (!fn) throw new Error('unknown op ' + m.op);
    const [res, transfer] = await fn(m);
    self.postMessage(Object.assign({ id: m.id, ok: true }, res), transfer || []);
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, err: String((e && e.message) || e) });
  }
};
