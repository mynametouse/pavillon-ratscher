// ===================== input (split from game/game.js): keys, mouse and touch (look, pinch, joystick), click to pick, fullscreen,
// collision switch, quality label =====================
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { $, cam, R, stage } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { nextTier, RENDER, TIERS } from '../render/render.js';
import { setMode } from '../render/modes.js';
import { DKEYS, DOOR, nearDoor, P, toggleDoor } from './walkable.js';
import { CAM3, go, jump, opt, setView3, toggleStance } from './player.js';
import { ORBMAX, resize } from './camera.js';
export const keys = new Set();
export const joy = { x: 0, y: 0, active: false };
window.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
    keys.add(k);
    e.preventDefault();
  }
  if ((k === 'e' || k === 'enter') && !e.repeat) {
    if (window.PLAY) {
      if (P.mode === 'walk' && LATE.PLAY.primary()) e.preventDefault();
    } else {
      const d = nearDoor();
      if (d && P.mode === 'walk') {
        toggleDoor(d);
        e.preventDefault();
      }
    }
  }
  if (P.mode !== 'walk' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === ' ') {
    e.preventDefault();
    if (!e.repeat) jump();
  } else if (e.repeat) return;
  else if (k === 'c') toggleStance('crouch');
  else if (k === 'x') toggleStance('crawl');
  else if (k === 'z') toggleStance('prone');
  else if (k === 'v') setView3(!CAM3.want);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
// Caps Lock on: walk slowly instead of the usual brisk pace (the figure then strolls)
export let slowWalk = false;
for (const t of ['keydown', 'keyup'])
  window.addEventListener(t, e => {
    if (e.getModifierState) slowWalk = e.getModifierState('CapsLock');
  });
export const cv = R.domElement;
cv.style.touchAction = 'none';
const pts = new Map();
let pinch0 = null,
  downAt = null;
cv.addEventListener('pointerdown', e => {
  if (e.target !== cv) return;
  try {
    cv.setPointerCapture(e.pointerId);
  } catch (err) {}
  pts.set(e.pointerId, [e.clientX, e.clientY]);
  downAt = [e.clientX, e.clientY, performance.now()];
  if (pts.size === 2) {
    const [a, b] = [...pts.values()];
    pinch0 = [Math.hypot(a[0] - b[0], a[1] - b[1]), P.r, CAM3.d];
  }
});
cv.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId)) return;
  const pr = pts.get(e.pointerId);
  const dx = e.clientX - pr[0],
    dy = e.clientY - pr[1];
  pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pts.size === 2 && pinch0 && P.mode === 'orbit') {
    const [a, b] = [...pts.values()];
    P.r = THREE.MathUtils.clamp((pinch0[1] * pinch0[0]) / Math.hypot(a[0] - b[0], a[1] - b[1]), 7, ORBMAX());
    markDirty();
    return;
  }
  if (pts.size === 2 && pinch0 && P.mode === 'walk') {
    const [a, b] = [...pts.values()],
      r = pinch0[0] / Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1]));
    if (CAM3.on) {
      const nd = pinch0[2] * r;
      if (nd < CAM3.MIN - 0.3) {
        setView3(false);
        pinch0 = null;
      } else {
        CAM3.d = THREE.MathUtils.clamp(nd, CAM3.MIN, CAM3.MAX);
        markDirty();
      }
    } else if (r > 1.35 && window.AVATAR && LATE.AVATAR.ready) {
      CAM3.d = 1.8;
      setView3(true);
      pinch0 = null;
    }
    return;
  }
  if (pts.size > 1) return;
  const k = 180 / Math.max(stage.clientHeight, 300);
  if (P.mode === 'orbit') {
    P.az -= dx * k * 0.9;
    P.el = THREE.MathUtils.clamp(P.el + dy * k * 0.6, 2, 80);
  } else look(-dx * k * 0.55, dy * k * 0.45);
  markDirty();
});
// turning the view in the walk mode (mouse, touch, captured mouse in game/hud.js); with the figure the camera may look further up and down
export function look(dyaw, dpitch) {
  P.yaw += dyaw;
  const lim = CAM3.on ? [-65, 72] : [-75, 75];
  P.pitch = THREE.MathUtils.clamp(P.pitch + dpitch, lim[0], lim[1]);
  markDirty();
}
window.look = look;
// camera distance behind the figure (wheel, pinch); closer than the minimum switches to the eyes, back out to the figure again
let zoomAcc = 1;
function zoom3(k) {
  if (P.mode !== 'walk') return;
  if (!CAM3.on) {
    zoomAcc = Math.min(2, zoomAcc * k);
    if (zoomAcc > 1.18 && !CAM3.want && window.AVATAR && LATE.AVATAR.ready) {
      zoomAcc = 1;
      CAM3.d = 1.7;
      setView3(true);
    }
    return;
  }
  zoomAcc = 1;
  if (CAM3.d <= CAM3.MIN + 1e-3 && k < 0.97) {
    setView3(false);
    return;
  }
  CAM3.d = THREE.MathUtils.clamp(CAM3.d * k, CAM3.MIN, CAM3.MAX);
  markDirty();
}
window.zoom3 = zoom3;
const up = e => {
  pts.delete(e.pointerId);
  if (pts.size < 2) pinch0 = null;
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6 && performance.now() - downAt[2] < 400)
    clickPick(e);
  downAt = null;
};
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', e => {
  pts.delete(e.pointerId);
  pinch0 = null;
});
cv.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    if (P.mode === 'orbit') P.r = THREE.MathUtils.clamp(P.r * Math.exp(e.deltaY * 0.0012), 7, ORBMAX());
    else if (P.mode === 'walk') zoom3(Math.exp(e.deltaY * 0.0012));
    markDirty();
  },
  { passive: false }
);
export const ray = new THREE.Raycaster();
function clickPick(e) {
  if (P.mode !== 'walk') return;
  const r = cv.getBoundingClientRect();
  ray.setFromCamera(
    new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1),
    cam
  );
  if (window.PLAY && LATE.PLAY.tap(e, ray)) return;
  const hits = ray.intersectObjects(
    DKEYS()
      .map(k => DOOR[k].group)
      .filter(Boolean),
    true
  );
  if (hits.length && hits[0].distance < 4) {
    let o = hits[0].object;
    toggleDoor(o.userData.door);
  }
}
const pad = $('joy'),
  knob = $('knob');
if (pad) {
  let id = null,
    c0 = null;
  const mv = e => {
    if (e.pointerId !== id) return;
    const R0 = pad.clientWidth / 2;
    let dx = e.clientX - c0[0],
      dy = e.clientY - c0[1];
    const L = Math.hypot(dx, dy);
    if (L > R0) {
      dx *= R0 / L;
      dy *= R0 / L;
    }
    joy.x = dx / R0;
    joy.y = -dy / R0;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  pad.addEventListener('pointerdown', e => {
    id = e.pointerId;
    try {
      pad.setPointerCapture(id);
    } catch (err) {}
    const r = pad.getBoundingClientRect();
    c0 = [r.left + r.width / 2, r.top + r.height / 2];
    joy.active = true;
    mv(e);
  });
  pad.addEventListener('pointermove', mv);
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    joy.x = joy.y = 0;
    joy.active = false;
    knob.style.transform = '';
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}
document.querySelectorAll('[data-key]').forEach(btn => {
  const k = btn.dataset.key;
  const on = e => {
      e.preventDefault();
      keys.add(k);
    },
    off = () => keys.delete(k);
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('pointercancel', off);
});
// (the action button #doorbtn is driven by game/play.js: doors, machines, people and things)
document.querySelectorAll('[data-spot]').forEach(b => b.addEventListener('click', () => go(b.dataset.spot)));
document.querySelectorAll('[data-light]').forEach(b =>
  b.addEventListener('click', () => {
    const v = b.dataset.light;
    setMode(v);
    document.querySelectorAll('[data-light]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    if (v !== 'auto' && v !== 'night') LATE.audio.setTime(v);
    try {
      SAVE.setRaw('pav-light2', v);
    } catch (e) {}
  })
);
export function setCollide(v) {
  opt.collide = v;
  const b = $('collbtn');
  if (b) {
    b.setAttribute('aria-pressed', v ? 'true' : 'false');
    b.querySelector('span').textContent = v ? 'an' : 'aus';
  }
}
$('collbtn')?.addEventListener('click', () => setCollide(!opt.collide));
export function qualLabel() {
  const b = $('qualbtn');
  if (!b) return;
  b.setAttribute('aria-pressed', RENDER.tier === 'hoch' ? 'true' : 'false');
  b.querySelector('span').textContent = TIERS[RENDER.tier].label;
}
$('qualbtn')?.addEventListener('click', () => {
  nextTier();
  qualLabel();
});
// fullscreen / immersive: real fullscreen where the browser allows it (not inside every app frame, not on iPhone), always the compact layout
function setFull(v) {
  document.body.dataset.full = v ? '1' : '';
  const b = $('fullbtn');
  if (b) {
    b.setAttribute('aria-pressed', v ? 'true' : 'false');
    b.textContent = v ? 'Vollbild aus' : 'Vollbild';
  }
  try {
    if (v && !document.fullscreenElement) {
      const el = document.documentElement;
      const r = (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el, {
        navigationUI: 'hide',
      });
      if (r && r.catch) r.catch(() => {});
    } else if (!v && document.fullscreenElement) {
      const r = (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      if (r && r.catch) r.catch(() => {});
    }
  } catch (e) {}
  setTimeout(resize, 50);
  setTimeout(resize, 400);
}
$('fullbtn')?.addEventListener('click', () => setFull(document.body.dataset.full !== '1'));
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.dataset.full === '1') {
    /* left real fullscreen (Esc): keep compact layout until the button is pressed */
  }
  setTimeout(resize, 50);
});
window.addEventListener('keydown', e => {
  if (e.key === 'f' || e.key === 'F') {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    setFull(document.body.dataset.full !== '1');
  }
});
