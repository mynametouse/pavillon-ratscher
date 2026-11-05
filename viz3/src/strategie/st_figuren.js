// ===================== feat/strategie: your people as figures in the world (STFIG) =====================
// From above the people are symbols; close up (and in the first-person view, near the walker) Falko, Sarah and Christoph stand and walk
// where the strategy mode has them – as the same Microsoft Rocketbox figures as the player figure (game/avatar.js, chars/player_*.json),
// moved by the player's clip sets through rbPerson (npc/npc_real.js, like the neighbours and the people on the streets). Loaded on first
// need, only on computers (phones: the symbols – memory), never the one you are playing yourself. Hubert and Ronald are their own walkers.
import * as THREE from 'three';
import { BASE, COARSE, QS, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { AVATAR } from '../game/avatar.js';
import { CHL, rbPerson } from '../npc/npc_real.js';
import { STDATA } from './st_data.js';
import { STRAT } from './st_modus.js';
export const STFIG = (() => {
  const PM = window.PLAYERMAN || {};
  const FILES = {
    m: ['player_m', 'pclips_m', 1.8],
    f: ['player_f', 'pclips_f', 1.68],
    c: ['player_c', 'pclips_m', 1.78],
  };
  const F = { figs: {}, loading: {}, err: null, clips: {}, loads: 0 };
  const avail = () => !!(PM.pclips_m && PM.pclips_f && !QS.get('lowfig') && !QS.get('nofig') && !COARSE);
  const U = f => BASE + 'chars/' + f;
  function clipSet(k) {
    if (F.clips[k]) return F.clips[k];
    const FL = new THREE.FileLoader();
    FL.setResponseType('json');
    return (F.clips[k] = FL.loadAsync(U(PM[k])).catch(e => {
      delete F.clips[k];
      throw e;
    }));
  }
  function load(id) {
    if (F.figs[id]) return Promise.resolve(F.figs[id]);
    if (F.loading[id]) return F.loading[id];
    const fig = STDATA.PEOPLE[id] && STDATA.PEOPLE[id].fig,
      spec = FILES[fig];
    if (!spec || !avail()) return Promise.resolve(null);
    const file = PM[spec[0]] || PM.player_m;
    if (!file) return Promise.resolve(null);
    return (F.loading[id] = Promise.all([CHL.loadAsync(U(file)), clipSet(spec[1])])
      .then(([gl, set]) => {
        delete F.loading[id];
        const f = rbPerson(gl, set, { h: set.h || spec[2], idleRate: 0.85 });
        f.g.visible = false;
        f.g.name = 'strategie ' + id;
        scene.add(f.g);
        F.figs[id] = f;
        F.loads++;
        return f;
      })
      .catch(e => {
        delete F.loading[id];
        F.err = id + ': ' + String((e && e.message) || e).slice(0, 120);
        console.warn('strategie figure', id, e);
        return null;
      }));
  }
  // per frame: who is to be seen where (from above when zoomed in; on foot within 60 m of the walker)
  const last = {};
  function tick(dt) {
    if (!avail()) return;
    const top = STRAT.on && P.mode === 'top',
      near = top ? P.th < 90 : P.mode === 'walk';
    if (!near && !Object.values(F.figs).some(f => f.g.visible)) return;
    const cx = top ? P.tx : P.x,
      cy = top ? P.ty : P.y,
      R = top ? Math.max(40, P.th) : 60;
    for (const id of Object.keys(STRAT.S.people)) {
      if (!STRAT.isOwn(id)) continue;
      const fig = STDATA.PEOPLE[id].fig;
      const me = AVATAR.kind === fig && !top; // the one you are playing is the player figure
      const ok = near && !me && STRAT.present(id).ok;
      const q = ok ? STRAT.pos(id) : null,
        inR = q && Math.hypot(q[0] - cx, q[1] - cy) < R;
      const f = F.figs[id];
      if (!inR) {
        if (f && f.g.visible) {
          f.g.visible = false;
          markDirty();
        }
        continue;
      }
      if (!f) {
        load(id);
        continue;
      }
      const p = STRAT.S.people[id],
        z = KERN.ground(q[0], q[1]);
      const L = last[id] || (last[id] = { x: q[0], y: q[1], az: 0 });
      const moved = Math.hypot(q[0] - L.x, q[1] - L.y);
      if (p.path && q[2] != null) L.az = q[2];
      else if (moved > 0.01) L.az = Math.atan2(q[0] - L.x, q[1] - L.y);
      L.x = q[0];
      L.y = q[1];
      f.g.position.set(q[0], z, -q[1]);
      f.g.rotation.y = -L.az;
      // at work: the job's work pose (npc/npc_real.js POSE: saw, chop, carry, place, bench, pick …)
      const j = p.job ? STRAT.job.of(p.job) : null,
        J = j && j.st === 'work' ? STRAT.job.get(j.def) : null,
        k = J && J.pose && !p.path ? J.pose : null;
      if (k && (!f.pose || f.pose.k !== k)) f.pose = { k, t: 0 };
      else if (!k && f.pose) f.pose = null;
      const v = p.path ? Math.min(1.5, moved / Math.max(dt, 1e-3)) : 0;
      if (f.anim) f.anim(dt, v > 0.05 ? Math.max(0.9, v) : 0);
      if (!f.g.visible) f.g.visible = true;
      markDirty();
    }
  }
  KERN.tick(tick, 'strategie/figuren');
  // freed on „Neu beginnen“; otherwise kept (they come back often)
  KERN.on('reset', () => {
    for (const f of Object.values(F.figs)) {
      scene.remove(f.g);
      f.g.traverse(o => {
        if (o.geometry) o.geometry.dispose();
      });
    }
    F.figs = {};
  });
  return F;
})();
window.STFIG = STFIG;
