// Suhl runtime, the package (dist/lazy/suhl.js): loaded by welt/suhl.js when its zone builds. It imports nothing of the app – three.js,
// KERN, WELT and the rest are handed in (ctx); its own parts live in lazy/suhl/** and are bundled in. Not in modules.txt.
import { probe } from './suhl/kern/probe.js';
// the worker behind promises: ask({ op, … }, [transfer]) → the answer
function workerOf(url) {
  let w = null,
    seq = 0;
  const open = new Map();
  const up = () => {
    if (w) return w;
    w = new Worker(url, { type: 'module' });
    w.onmessage = ev => {
      const m = ev.data,
        p = open.get(m.id);
      if (!p) return;
      open.delete(m.id);
      if (m.ok) p[0](m);
      else p[1](new Error(m.err));
    };
    w.onerror = ev => {
      for (const p of open.values()) p[1](new Error('worker: ' + (ev.message || 'error')));
      open.clear();
    };
    return w;
  };
  return {
    ask(msg, transfer) {
      return new Promise((res, rej) => {
        const id = ++seq;
        open.set(id, [res, rej]);
        up().postMessage(Object.assign({ id }, msg), transfer || []);
      });
    },
    busy: () => open.size,
    stop() {
      if (w) w.terminate();
      w = null;
      for (const p of open.values()) p[1](new Error('worker stopped'));
      open.clear();
    },
  };
}
export async function start(ctx) {
  const worker = workerOf(ctx.worker);
  return {
    version: null,
    areas: {},
    probe: probe(ctx, worker),
    enter: async () => {},
    leave() {
      worker.stop();
    },
    tick() {},
    covers: () => false,
    pushOut: () => undefined,
    place: () => undefined,
    ground: () => undefined,
    status: () => ({ worker: worker.busy() }),
  };
}
