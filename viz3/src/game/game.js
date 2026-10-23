// ===================== the frame loop: frame (one bad frame does not end the loop), physics of walking and the place label, safety net for
// the frame rate; walking itself lives in game/walkable.js, player.js, camera.js and input.js (split in refactor phase 1) =====================
import * as THREE from 'three';
import { $, cam, OFFLINE, R, stage } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { DIRTY, LOAD, LOADLOG, markDirty, VEG } from '../core/assets.js';
import { STREAM } from '../garden/stream_geo.js';
import { sunFollow } from '../garden/env.js';
import { WORKS } from '../garden/workshop.js';
import {
  applyTier,
  camMoved,
  MOTION,
  motionTrack,
  RENDER,
  renderFrame,
  TIER_ORDER,
  TIER_USER,
  TIERS,
} from '../render/render.js';
import { adaptExposure } from '../render/modes.js';
import {
  blocked,
  bodyH,
  collide,
  DOOR,
  doorWord,
  floorInfo,
  nearDoor,
  P,
  STANCES,
  surfType,
  updateDoors,
  WALK_SPEED,
  walkBounds,
} from './walkable.js';
import { CAM3, headHit, lastPlace, opt, placeName, setLastPlace, setStance, setStepZ, stepZ } from './player.js';
import { applyCam, cam3Update, ORBMAX, resize, setBob } from './camera.js';
import { joy, keys, qualLabel, slowWalk } from './input.js';
import { audio, toast } from '../audio/audio.js';
import { PERF } from '../render/perf.js';
import { PLAY } from './play.js';
import { VEH } from '../vehicles/vehicle.js';
const lbl = $('where'),
  dbtn = $('doorbtn');
let last = performance.now(),
  lastDoor = null;
const P3D = $('p-3d');
// V16b5: a frame that throws (one bad value somewhere) no longer ends the frame loop for good: the next frame comes, the error goes to the
// page's error handlers (log, a short notice – boot.js), the same error at most every 5 s
let frameErrT = -1e9;
export function frame(now) {
  try {
    frame0(now);
  } catch (e) {
    requestAnimationFrame(frame);
    if (now - frameErrT > 5000) {
      frameErrT = now;
      if (window.reportError) reportError(e);
      else
        setTimeout(() => {
          throw e;
        });
    }
  }
}
function frame0(now) {
  const dt = Math.min(0.12, (now - last) / 1000);
  last = now; // slow frames are split into substeps below, so walking keeps its real speed
  if (P3D.hidden || window.FREEZE) {
    P3D.away = !window.FREEZE;
    requestAnimationFrame(frame);
    return;
  } // FREEZE: tests step the world by hand (GAME.step)   // another tab is open: no physics, no drawing
  if (P3D.away) {
    P3D.away = false;
    resize();
    markDirty(true);
    MOTION.lastStill = -1e9;
  } // back in the 3D tab: fresh size and a sharp frame at once
  let f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  const turn = (keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0);
  let side = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
  if (joy.active) {
    f += joy.y;
    side += joy.x * 0.8;
  }
  {
    const n = Math.max(1, Math.ceil(dt / 0.034));
    for (let i = 0; i < n; i++) physics(dt / n, f, turn, side, keys.has('shift') ? 1.9 : slowWalk ? 0.56 : 1);
  }
  if (P.mode === 'walk' && !(window.VEH && VEH.cur)) cam3Update(dt);
  adaptExposure(dt);
  KERN.update(dt); // phase 2: per-frame callbacks (KERN.tick), zones built near and dropped far, borrowed lights, waits (core/kern.js)
  // the old list window.TICKS – only modules not moved to KERN.tick yet (phase 2)
  if (window.TICKS)
    for (let i = 0; i < TICKS.length; i++) {
      try {
        TICKS[i](dt);
      } catch (e) {
        if (!TICKS[i]._err) {
          // once per callback: the feature stays broken but the rest runs on; the error report (boot/report.js) names it
          TICKS[i]._err = 1;
          console.warn('tick', e);
          LOADLOG.err('Takt ' + (TICKS[i].name || '#' + i) + ': ' + ((e && (e.stack || e.message)) || e));
        }
      }
    }
  // V16b3: nothing is drawn while the loading screen is up – prepareGPU draws its own frames; a frame here could wait for shaders still
  // compiling in the background (seconds each on Windows without a graphics card) and froze the page
  if (!LOAD.ready) {
    requestAnimationFrame(frame);
    return;
  }
  if (DIRTY.shadow) {
    R.shadowMap.needsUpdate = true;
    DIRTY.shadow = false;
    DIRTY.frame = true;
  }
  // moving view → cheap frame every time; standing still → one full-quality frame (other changes while still, e.g. walking figures, at most every few frames)
  if (DIRTY.frame) {
    const t0 = performance.now();
    applyCam();
    const moved = camMoved();
    if (moved || now - MOTION.lastMove < 160) {
      if (moved) {
        MOTION.lastMove = now;
        motionTrack(now);
      }
      if (window.VEG) VEG.update(cam.position);
      renderFrame('motion');
      DIRTY.frame = false;
      MOTION.stillDue = true;
      PERF.js += performance.now() - t0;
      PERF.n++;
    } else if (now - MOTION.lastStill > Math.max(90, MOTION.stillMs * 2.5)) {
      if (window.VEG) VEG.update(cam.position);
      renderFrame('still');
      DIRTY.frame = false;
      MOTION.stillDue = false;
      MOTION.lastStill = now;
    }
  } else if (MOTION.stillDue && now - MOTION.lastMove >= 160) {
    const t0 = performance.now();
    renderFrame('still');
    MOTION.stillDue = false;
    MOTION.lastStill = now;
    MOTION.stillMs = MOTION.stillMs * 0.7 + (performance.now() - t0) * 0.3;
  }
  requestAnimationFrame(frame);
}
// safety net: if continuous motion stays far below 20 fps during the first minute, step down one tier once and say so (no silent resolution changes)
const FPS = {
  last: 0,
  buf: [],
  done: false,
  t0: performance.now(),
  track(now) {
    if (this.done || OFFLINE || TIER_USER) {
      this.last = now;
      return;
    }
    const dt = now - this.last;
    this.last = now;
    if (dt > 0 && dt < 400) this.buf.push(dt);
    if (now - this.t0 > 60000) {
      this.done = true;
      return;
    }
    if (this.buf.length >= 60) {
      const b = this.buf.slice().sort((a, c) => a - c),
        med = b[b.length >> 1];
      this.buf.length = 0;
      if (med > 55 && RENDER.tier !== 'schnell') {
        const nt = TIER_ORDER[TIER_ORDER.indexOf(RENDER.tier) + 1];
        applyTier(nt, false);
        qualLabel();
        this.done = true;
        toast('Grafik auf „' + TIERS[nt].label + '“ gestellt, damit es flüssig läuft. Über „Grafik“ änderbar.', 6000);
      }
    }
  },
};
export function physics(dt, f, turn, side, run) {
  if (P.mode === 'orbit') {
    if (f || turn || side) {
      P.az -= (turn + side) * 50 * dt;
      P.r = THREE.MathUtils.clamp(P.r - f * 8 * Math.max(1, P.r / 70) * dt, 7, ORBMAX());
      markDirty();
    }
  } else if (P.mode === 'top') {
    if (f || turn || side) {
      const k = P.th * 0.55 * run * dt;
      P.tx += (turn + side) * k;
      P.ty += f * k;
      markDirty();
    }
  } else if (window.PLAY && PLAY.seated()) {
    // sitting, lying or riding along: look around; the walk keys stand up again
    if (turn && !PLAY.seat.drive) {
      P.yaw += turn * 95 * dt;
      markDirty();
    } // driving: the arrow keys steer (vehicles/vehicle.js)
    if ((f || side) && !PLAY.seat.lock && !PLAY.seat.keepKeys) PLAY.stand();
    P.speed = 0;
    P.air = false;
    P.vz = 0;
    PLAY.update(dt);
    const pl = placeName();
    if (pl !== lastPlace) {
      lbl.textContent = pl;
      KERN.emit('place', { name: pl, prev: lastPlace });
      setLastPlace(pl);
    }
  } else {
    if (turn) {
      P.yaw += turn * 95 * dt;
      markDirty();
    }
    const third = CAM3.on;
    let moved = 0;
    {
      const st = STANCES[P.stance];
      if (Math.abs(P.eyeH - st.eye) > 1e-3) {
        P.eyeH += (st.eye - P.eyeH) * Math.min(1, dt * 7);
        markDirty();
      }
    }
    if ((f || side) && P.stance === 'prone') setStance('crawl', true);
    if (f || side) {
      const y = (P.yaw * Math.PI) / 180,
        onLadder = floorInfo(P.x, P.y, P.feet)[1] === 'ladder';
      if (onLadder && P.stance !== 'stand') P.stance = 'stand';
      const st = STANCES[P.stance],
        sp = WALK_SPEED * (P.stance === 'stand' ? run : 1) * st.sp * (onLadder ? 0.2 : 1);
      const n = Math.max(1, Math.hypot(f, side)),
        nf = f / n,
        ns = side / n;
      const p = [
        P.x + (Math.sin(y) * nf + Math.cos(y) * ns) * sp * dt,
        P.y + (Math.cos(y) * nf - Math.sin(y) * ns) * sp * dt,
      ];
      collide(p, P.feet, opt.collide);
      if (opt.collide && blocked(p[0], p[1], P.feet)) {
        if (!blocked(p[0], P.y, P.feet)) p[1] = P.y;
        else if (!blocked(P.x, p[1], P.feet)) p[0] = P.x;
        else {
          p[0] = P.x;
          p[1] = P.y;
        }
      }
      const mx = p[0] - P.x,
        my = p[1] - P.y,
        d = Math.hypot(mx, my);
      P.x = p[0];
      P.y = p[1];
      walkBounds();
      moved = d;
      if (d > 1e-5) {
        P.mvx = mx / d;
        P.mvy = my / d;
      }
      // the figure turns towards where it goes (crawling and lying it turns more slowly); seen through its eyes it always faces the view
      if (third && d > 1e-5) {
        const want =
          (Math.atan2(nf * Math.sin(y) + ns * Math.cos(y), nf * Math.cos(y) - ns * Math.sin(y)) * 180) / Math.PI;
        let dd = want - P.body;
        while (dd > 180) dd -= 360;
        while (dd < -180) dd += 360;
        P.body += dd * Math.min(1, dt * (P.stance === 'prone' || P.stance === 'crawl' ? 4 : 10));
      }
      const sl = onLadder
        ? 0.3
        : P.stance === 'stand'
          ? 0.72 + (sp - 1.45) * 0.25
          : P.stance === 'crouch'
            ? 0.55
            : 0.42;
      P.stride += d;
      setBob(third || P.stance !== 'stand' ? 0 : Math.sin((P.stride * Math.PI) / sl) * 0.022);
      if (P.stride > sl && !P.air) {
        P.stride = 0;
        audio.step(
          surfType(P.x, P.y, P.feet),
          P.stance === 'stand' ? (run > 1 ? 1.25 : 1) : P.stance === 'crouch' ? 0.6 : 0.35
        );
      }
      markDirty();
    }
    if (!third) P.body = P.yaw;
    P.speed += (moved / Math.max(dt, 1e-3) - P.speed) * Math.min(1, dt * 12);
    if (P.landT > 0) P.landT = Math.max(0, P.landT - dt);
    const fi = floorInfo(P.x, P.y, P.feet),
      fl = fi[0];
    if (P.vz > 0) {
      // a jump on its way up: nothing is stepped onto until it comes down again; the head stops at ceilings
      P.vz -= 9.81 * dt;
      let nf = P.feet + P.vz * dt;
      if (opt.collide && headHit(P.x, P.y, P.feet + bodyH(), nf + bodyH())) {
        nf = P.feet;
        P.vz = -0.01;
      }
      P.feet = nf;
      P.air = true;
      P.airT = (P.airT || 0) + dt;
      markDirty();
    } else {
      if (fi[1] === 'ground' && P.vz === 0 && P.feet > fl && P.feet - fl < 0.3) {
        P.feet = fl;
        setStepZ(fl);
        markDirty();
      }
      if (P.feet > fl + 0.001) {
        if (!P.air) {
          P.air = true;
          P.airT = 0;
        }
        P.airT += dt;
        P.vz -= 9.81 * dt;
        P.feet = Math.max(fl, P.feet + P.vz * dt);
        markDirty();
        if (P.feet === fl) {
          if (P.vz < -2.4) {
            audio.step(surfType(P.x, P.y, P.feet), P.vz < -4 ? 1.6 : 1.15);
            setStepZ(P.feet);
            P.landT = P.vz < -4.5 ? 0.45 : 0.22;
          }
          P.vz = 0;
          P.air = false;
          P.airT = 0;
        }
      } else {
        P.feet = fl;
        P.vz = 0;
        P.air = false;
        P.airT = 0;
      }
    }
    if (fi[1] === 'ground' && P.vz === 0) setStepZ(P.feet); // slopes of the ground make no step clicks
    if (P.vz === 0 && Math.abs(P.feet - stepZ) > 0.12) {
      setStepZ(P.feet);
      P.stride = 0;
      audio.step(surfType(P.x, P.y, P.feet), 1.0, true);
    }
    const pl = placeName();
    if (pl !== lastPlace) {
      lbl.textContent = pl;
      KERN.emit('place', { name: pl, prev: lastPlace });
      setLastPlace(pl);
    }
    if (window.PLAY) PLAY.update(dt);
    else {
      const nd = nearDoor(),
        dtxt = k =>
          DOOR[k].kind === 'machine'
            ? DOOR[k].label + (DOOR[k].target > 0.5 ? ' ausschalten' : ' einschalten')
            : doorWord(DOOR[k]) + (DOOR[k].target > 0.5 ? ' schließen' : ' öffnen');
      if (nd !== lastDoor) {
        lastDoor = nd;
        if (dbtn) {
          dbtn.hidden = !nd;
          dbtn.textContent = nd ? dtxt(nd) : '';
        }
      } else if (nd && dbtn) {
        const txt = dtxt(nd);
        if (dbtn.textContent !== txt) dbtn.textContent = txt;
      }
    }
  }
  {
    const nm = P.mode === 'orbit' ? 'Modellansicht' : P.mode === 'top' ? 'Draufsicht' : null;
    if (nm && lastPlace !== nm) {
      lbl.textContent = nm;
      setLastPlace(nm);
      if (dbtn) dbtn.hidden = true;
      lastDoor = null;
      if (window.PLAY) PLAY.update(0);
    }
  }
  if (updateDoors(dt)) markDirty();
  if (P.mode === 'top')
    sunFollow(
      P.tx,
      P.ty,
      THREE.MathUtils.clamp(P.th * 0.75 * Math.max(1, stage.clientWidth / Math.max(1, stage.clientHeight)), 16, 90)
    );
  else if (!(window.VEH && VEH.sun()))
    sunFollow(P.mode === 'walk' ? P.x : P.tgt[0], P.mode === 'walk' ? P.y : P.tgt[1]);
  if (window.WORKS && WORKS.update && WORKS.update(dt)) markDirty();
  if (P.mode === 'walk') STREAM.listen(P.x, P.y);
  else if (P.mode === 'top') STREAM.listen(P.tx, P.ty);
  else
    STREAM.listen(2 + Math.sin((P.az * Math.PI) / 180) * P.r * 0.5, 2 + Math.cos((P.az * Math.PI) / 180) * P.r * 0.5);
  if (window.NPC) {
    try {
      NPC.update(dt);
    } catch (e) {
      if (!window._npcErr) {
        window._npcErr = 1;
        console.warn('npc', e);
      }
    }
  }
  audio.update(dt);
}
window._resize = resize;
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
