// ===================== feat/schleusingen-ansicht: Schleusingen's facades as read off private views from the street (SAFASS) =====================
// Falko (17.11.2026 ~17:30, after comparing the model with views from the street): „Fassaden nach Ansicht“ – the wall colours and
// materials, slate, half-timbering and roofs of the houses along Hildburghäuser, Suhler and Ilmenauer Straße and round the Markt as they
// are. The data (viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json, 107 buildings) comes when the town comes near
// (a zone a little wider than the town's); SAFASS.apply(b) is the hook for welt/schleusingen.js's build() – after b.st = styleOf(b, i) it
// sets the look of a building the data knows (SALOOK.look: style, colour, timber, frames, shutters, type; the roof's kind and colour;
// a church without house windows). The town calls it once feat/gebaeude is in src (one marked line there). ?nosafass: as before.
import { BASE } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { SALOOK } from './sa_look.js';
export const SAFASS = (() => {
  const S = { on: false, state: 'idle', n: 0, applied: 0, skipped: 0, err: '', data: null };
  S.on = !new URLSearchParams(location.search).has('nosafass');
  if (!S.on) return S;
  const MARKT = [-1084.7, 1241.9];
  let M = null,
    pending = null;
  function load() {
    if (M || pending) return pending;
    S.state = 'loading';
    pending = fetch(BASE + 'schleusingen-ansicht/fassaden.json')
      .then(r => {
        if (!r.ok) throw new Error('fassaden.json ' + r.status);
        return r.json();
      })
      .then(doc => {
        S.data = doc;
        M = SALOOK.index(doc);
        S.n = M.size;
        S.state = 'ready';
      })
      .catch(e => {
        S.state = 'error';
        S.err = String(e);
        console.warn('safass', e);
      });
    return pending;
  }
  S.load = load;
  // a little wider than the town's zone (950 m): the data is there before the town builds (it is small)
  KERN.zone({ id: 'safass', x: MARKT[0], y: MARKT[1], near: 1100, far: 1500, build: load, drop: () => {} });
  /** the hook: b – a building of welt/schleusingen.js after styleOf (b.i, b.cx, b.cy, b.st set); true if the data changed its look */
  S.apply = b => {
    if (!M || !b || !M.has(b.i)) return false;
    const r = M.get(b.i);
    if (!SALOOK.matches(r, b.cx, b.cy)) {
      S.skipped++;
      return false;
    }
    b.st = SALOOK.look(r, b.st);
    const rf = SALOOK.roof(r, !!b.fl);
    if (rf) {
      b.rk = rf.rk;
      b.rc = rf.rc;
    }
    if (r.art === 'kirche' && b.F) for (const f of b.F) f[8] |= 1; // no house windows (round-arched ones would be the town's)
    b.fass = r.i;
    S.applied++;
    return true;
  };
  S.record = i => (M ? M.get(i) || null : null);
  S.status = () => ({ on: S.on, state: S.state, n: S.n, applied: S.applied, skipped: S.skipped, err: S.err });
  return S;
})();
window.SAFASS = SAFASS;
