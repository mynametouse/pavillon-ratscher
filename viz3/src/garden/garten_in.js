// ===================== feat/garten (Falko, 23.10.2026): the garden buildings to use – lamps with switches, sofa, bed, small jobs =====================
// The buildings (garden/bungalow.js, holzhaus.js, greenhouse.js) register their lamps, seats and jobs in garden/garten_kit.js; this module
// makes them work. One point light serves all of them: it goes to the lit lamp in the building the walker is in (or the nearest lit one), so
// the shaders count one light more, not one per lamp. Actions go through the game layer (PLAY, read at run time via LATE – it loads later).
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { scene, V } from '../core/head.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { worldOf } from './site_base.js';
import { GACTS, GLAMPS, GSEATS } from './garten_kit.js';
const GARTEN = (() => {
  const light = new THREE.PointLight(0xffd6a0, 0, 4.6, 2);
  light.name = 'garten-lamp';
  light.position.set(0, -50, 0);
  scene.add(light);
  const S = { on: {}, cur: null, acc: 1, wired: false };
  const W = (b, lx, ly) => worldOf(b, lx, ly);
  const pos = l => {
    const w = W(l.b, l.lx, l.ly);
    return [w[0], w[1], l.z];
  };
  function setGlow(l) {
    l.mat.emissiveIntensity = S.on[l.key] ? l.glow : 0;
    l.mat.color.set(S.on[l.key] ? 0xfff6e6 : 0xf3ead6);
  }
  // which lamp the one light belongs to: a lit lamp in the room the walker is in, else the nearest lit one within 30 m
  function pick() {
    const P = LATE.P;
    if (!P) return null;
    let best = null,
      bd = 1e9;
    for (const l of GLAMPS) {
      if (!S.on[l.key]) continue;
      const p = pos(l),
        d = Math.hypot(p[0] - P.x, p[1] - P.y) - (l.room(P.x, P.y, P.feet + 1) ? 100 + l.inten : 0);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best && bd < 30 ? best : null;
  }
  function place(force) {
    const l = pick();
    if (l === S.cur && !force) return;
    S.cur = l;
    if (l) {
      const p = pos(l);
      light.position.copy(V(p[0], p[1], p[2] - 0.06));
      light.distance = l.dist;
      light.color.set(l.color);
      light.intensity = l.inten;
    } else light.intensity = 0;
    markDirty();
  }
  function set(key, v) {
    const l = GLAMPS.find(q => q.key === key);
    if (!l) return false;
    S.on[key] = v === undefined ? !S.on[key] : !!v;
    setGlow(l);
    place(true);
    if (LATE.SFX && LATE.SFX.click) LATE.SFX.click();
    return S.on[key];
  }
  // ---- actions: switches, seats, small jobs (registered once the game layer is there) ----
  function wire() {
    const PLAY = LATE.PLAY;
    if (S.wired || !PLAY) return;
    S.wired = true;
    const P = () => LATE.P;
    for (const l of GLAMPS)
      PLAY.act({
        id: 'garten:licht:' + l.key,
        r: l.r || 1.3,
        prio: -0.2,
        label: () => {
          const p = P();
          return p && l.room(p.x, p.y, p.feet + 1) ? l.label + (S.on[l.key] ? ' aus' : ' an') : null;
        },
        pos: () => {
          const w = W(l.b, l.sw[0], l.sw[1]);
          return [w[0], w[1], l.sw[2]];
        },
        run: () => set(l.key),
      });
    for (const s of GSEATS) {
      const pose = () => {
        const w = W(s.b, s.lx, s.ly);
        return { x: w[0], y: w[1], eye: s.eye, yaw: s.b.az + s.yaw, pitch: s.pitch, kind: s.kind };
      };
      PLAY.act({
        id: 'seat:garten:' + s.key,
        r: s.r || 1.3,
        prio: -0.15,
        label: () => (PLAY.seat ? null : s.label),
        pos: () => {
          const w = W(s.b, s.at[0], s.at[1]);
          return [w[0], w[1], s.eye - 0.6];
        },
        run: () => {
          const o = Object.assign(pose(), {
            onSit: () => LATE.SFX && LATE.SFX.drop && LATE.SFX.drop(),
            leaveLabel: 'Aufstehen',
          });
          if (s.kind === 'lie') {
            o.primary = () => {
              if (LATE.DN && LATE.DN.canSleep()) LATE.DN.sleep();
            };
            o.primaryLabel = () => (LATE.DN && LATE.DN.canSleep() ? 'Schlafen bis 7 Uhr' : '');
          }
          PLAY.sit(o);
        },
      });
    }
    for (const a of GACTS) {
      const st = {
        think: t => PLAY.think(t, 3200),
        dirty: () => markDirty(true),
      };
      PLAY.act({
        id: 'garten:' + a.key,
        r: a.r || 1.2,
        prio: -0.1,
        label: () => {
          const p = P();
          return p && (!a.room || a.room(p.x, p.y, p.feet + 1)) && !PLAY.seat ? a.label(st) : null;
        },
        pos: () => {
          const w = W(a.b, a.lx, a.ly);
          return [w[0], w[1], a.z];
        },
        run: () => a.run(st),
      });
    }
  }
  whenLoaded(wire);
  // per frame (throttled): the light follows the walker from building to building
  (window.TICKS = window.TICKS || []).push(dt => {
    if (!S.wired) wire();
    S.acc += dt;
    if (S.acc < 0.3) return;
    S.acc = 0;
    place(false);
  });
  for (const l of GLAMPS) setGlow(l);
  return {
    light,
    lamps: GLAMPS,
    seats: GSEATS,
    acts: GACTS,
    set,
    isOn: k => !!S.on[k],
    cur: () => (S.cur ? S.cur.key : null),
    place,
  };
})();
window.GARTEN = GARTEN;
export { GARTEN };
