// ===================== feat/verkehr-real stage 4a: the walkers of the places are solid for vehicles – a knock, a fall, up again (VKFUSS) =====================
// Falko, 13.11.2026 12:14: „… genauso wie auch Fahrräder, Fußgänger und so weiter, nicht durchfahrbar sind, sondern tatsächlich auch
// Unfälle bauen, wenn man gegen sie fährt“; 12:45 chosen: the consequences harmless. Each walker of verkehr/verkehr.js is a box of
// VEH.extra (shoulders by chest, feet to head) and in the knock a body of 75 kg (vehicles/vehicle.js resolve, as the traffic cars of
// verkehr/vk_unfall.js): a slow touch shoves him a little, a bump makes him stumble and say so, a real knock throws him (harmless: no
// faster than 3.5 m/s) – he slides on the ground, lies a moment (the clip 'lie' over his walking: npc/npc_real.js self.over), gets up over
// his knees, complains, and walks on along his way. Lying, he is a low obstacle (nobody drives over him). No blood, nothing broken.
//   VKFUSS.add(d, said)   d: a walker of verkehr.js ({ key, x, y, z, hd, sp, f, line, s, dodge, st }); said(d, kind) when he has a word
//   VKFUSS.drop(d)        his box out of VEH.extra
//   VKFUSS.tick(d, dt)    while he is down (d.fall): true – verkehr.js leaves him to this; when he is up again, back on his way
//   VKFUSS.grade(dv)      'touch' | 'stumble' | 'fall' by his change of speed (m/s)
import { VEH } from '../vehicles/vehicle.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { VNETZ } from './verkehr_netz.js';
export const VKFUSS = (() => {
  const S = { knocks: 0, falls: 0, stumbles: 0, err: null };
  const M = 75,
    IZ = 6,
    THROW = 3.5;
  const grade = dv => (dv < 0.35 ? 'touch' : dv < 1.6 ? 'stumble' : 'fall');
  // the phases of a fall: down at once, a while on the ground, onto the knees, up (seconds)
  const T = { faellt: 0.35, liegt: 2.2, kniet: 0.55, knie: 0.6, auf: 0.7 };
  function add(d, said) {
    if (d.vbox || !VEH || !VEH.extra) return;
    d.vbox = {
      ped: d.key,
      noWalk: true, // the player on foot goes on as before (the walkers wait for him, verkehr.js)
      box: () => {
        if (!d.f || !d.f.g.visible) return null;
        const F = d.fall,
          down = F && F.ph !== 'auf',
          hd = Number.isFinite(d.hd) ? d.hd : 0,
          f = [Math.sin(hd), Math.cos(hd)],
          r = [Math.cos(hd), -Math.sin(hd)];
        if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) return null;
        // lying: a low, long box where he lies (along his heading – the clip lays him along it)
        return down
          ? { c: [d.x, d.y], ax: r, ay: f, ex: 0.3, ey: 0.85, z0: d.z, z1: d.z + 0.32 }
          : { c: [d.x, d.y], ax: r, ay: f, ex: 0.26, ey: 0.16, z0: d.z, z1: d.z + 1.7 };
      },
      dyn: () => {
        const u0 = d.fall ? 0 : d.sp || 0,
          b = {
            spec: { mass: M, Iz: IZ },
            st: { x: d.x, y: d.y, psi: Number.isFinite(d.hd) ? d.hd : 0, u: u0, v: 0, r: 0, sleep: 0 },
            x0: d.x,
            y0: d.y,
            u0,
          };
        b.knock = (v, h) => {
          try {
            knocked(d, b, v, said);
          } catch (e) {
            if (!S.err) console.warn('verkehr walker knock', e);
            S.err = String((e && e.message) || e);
          }
        };
        return b;
      },
    };
    VEH.extra.push(d.vbox);
  }
  function drop(d) {
    if (!d.vbox || !VEH || !VEH.extra) return;
    const i = VEH.extra.indexOf(d.vbox);
    if (i >= 0) VEH.extra.splice(i, 1);
    d.vbox = null;
    if (d.f) d.f.over = null;
  }
  // the knock (inside the vehicle's physics): his share of it
  function knocked(d, b, v, said) {
    const s = b.st,
      sp = Math.sin(s.psi),
      cp = Math.cos(s.psi),
      W = [s.u * sp + s.v * cp, s.u * cp - s.v * sp],
      dv = Math.hypot(W[0] - b.u0 * sp, W[1] - b.u0 * cp),
      dx = s.x - b.x0,
      dy = s.y - b.y0;
    if (!Number.isFinite(dv) || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const mine = !!v && v === VEH.cur,
      g = grade(dv);
    if (d.fall) {
      // down already: pushed on along the ground (or thrown again by a real knock)
      d.fall.x += dx;
      d.fall.y += dy;
      d.x = d.fall.x;
      d.y = d.fall.y;
      if (g === 'fall' && d.fall.ph !== 'faellt') start(d, W, dv, mine, said);
      return;
    }
    // shoved: the walker's place follows from his way (s along it, dodge to the right of it)
    shove(d, dx, dy);
    if (g === 'touch') return;
    S.knocks++;
    if (g === 'stumble') {
      S.stumbles++;
      if (mine && !(d.stumbleT > S.now)) {
        d.stumbleT = S.now + 4;
        said(d, 'stolpert');
      }
      return;
    }
    start(d, W, dv, mine, said);
  }
  function shove(d, dx, dy) {
    if (!d.line) {
      d.x += dx;
      d.y += dy;
      return;
    }
    const pr = VNETZ.project(d.line, d.x + dx, d.y + dy, d.s - 3, d.s + 3);
    if (pr) {
      d.s = Math.max(0, Math.min(d.line.L, pr.s));
      d.dodge = Math.max(-3, Math.min(3, pr.lat));
    }
    d.x += dx;
    d.y += dy;
  }
  function start(d, W, dv, mine, said) {
    const k = Math.min(1, THROW / Math.max(dv, 1e-6));
    d.fall = { ph: 'faellt', t: 0, x: d.x, y: d.y, vx: W[0] * k, vy: W[1] * k, mine, said, st: d.st };
    d.st = 'liegt';
    S.falls++;
    if (d.f) d.f.walker.talking = false;
    if (mine)
      KERN.emit('verkehr:unfall', {
        who: d.key,
        ped: true,
        x: +d.x.toFixed(1),
        y: +d.y.toFixed(1),
        grade: 'crash',
        fault: 'player',
      });
    markDirty();
  }
  // while he is down: slide, lie, up over the knees; then back onto his way (true while this has him)
  function tick(d, dt) {
    const F = d.fall;
    if (!F) return false;
    F.t += dt;
    // sliding on the ground (μ ≈ 0.6), out of walls
    const sp = Math.hypot(F.vx, F.vy);
    if (sp > 0) {
      const n = Math.max(0, sp - 6 * dt) / sp;
      F.vx *= n;
      F.vy *= n;
      const p = [F.x + F.vx * dt, F.y + F.vy * dt];
      KERN.pushOut(p, 0.3);
      F.x = p[0];
      F.y = p[1];
    }
    d.x = F.x;
    d.y = F.y;
    d.z = KERN.ground(d.x, d.y, d.z + 0.5);
    d.sp = 0;
    let over;
    if (F.ph === 'faellt') {
      over = { k: 'lie', w: Math.min(1, F.t / T.faellt) };
      if (F.t > T.faellt && sp < 0.05) next(F, 'liegt');
    } else if (F.ph === 'liegt') {
      over = { k: 'lie', w: 1 };
      if (F.t > T.liegt) next(F, 'kniet');
    } else if (F.ph === 'kniet') {
      const u = Math.min(1, F.t / T.kniet);
      over = [
        { k: 'lie', w: 1 - u },
        { k: 'kneelIdle', w: u },
      ];
      if (F.t > T.kniet) next(F, 'knie');
    } else if (F.ph === 'knie') {
      over = { k: 'kneelIdle', w: 1 };
      if (F.t > T.knie) {
        next(F, 'auf');
        // up: his word (towards whoever knocked him)
        if (F.mine && F.said) F.said(d, 'gefallen');
      }
    } else {
      over = { k: 'kneelIdle', w: Math.max(0, 1 - F.t / T.auf) };
      if (F.t > T.auf) {
        end(d);
        return false;
      }
    }
    if (d.f) {
      d.f.over = over;
      d.f.g.position.set(d.x, d.z, -d.y);
      d.f.g.rotation.y = -d.hd;
      d.f.anim(dt, 0);
    }
    markDirty();
    return true;
  }
  function next(F, ph) {
    F.ph = ph;
    F.t = 0;
  }
  // back on his way: where he is now, along it and beside it; he walks on (a moment to look round first)
  function end(d) {
    const F = d.fall;
    d.fall = null;
    if (d.f) d.f.over = null;
    if (d.line) {
      const pr = VNETZ.project(d.line, d.x, d.y, d.s - 15, d.s + 15);
      if (pr) {
        d.s = Math.max(0, Math.min(d.line.L, pr.s));
        d.dodge = Math.max(-3, Math.min(3, pr.lat));
      }
    }
    d.st = F && F.st === 'ende' ? 'ende' : 'gruesst';
    d.t = 2;
    d.greeted = true;
  }
  S.now = 0;
  Object.assign(S, { add, drop, tick, grade, T, M });
  return S;
})();
if (typeof window !== 'undefined') window.VKFUSS = VKFUSS;
