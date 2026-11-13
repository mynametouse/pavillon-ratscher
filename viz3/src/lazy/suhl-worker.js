// Suhl runtime, the worker (dist/lazy/suhl-worker.js, a module worker started by lazy/suhl.js): fetches tiles, unpacks them and makes
// the geometry of the buildings off the main thread; answers with typed arrays that are transferred, never copied. Not in modules.txt.
// Messages: { id, op, … } → { id, ok: true, … } or { id, ok: false, err }.
//   ping  { a: Float32Array, url? }   the check of the first day: the array back doubled, a fetch from here, where the worker runs
import { frame } from './suhl/kern/geo.js';
const OPS = {
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
