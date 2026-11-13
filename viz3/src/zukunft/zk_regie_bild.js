// ===================== feat/zeitreise-regie: the picture of the time journey – split screen, letterbox, cross-fades, stills (ZKBILD) =====================
// While the time journey runs this module draws every frame itself (RENDER.draw, a marked hook in render/render.js): the app's own
// pipeline (render pass or ambient occlusion → tone mapping → grade → SMAA, or the cheaper motion pipeline while the camera moves) –
//   one world:  once, camera.layers 0 + 21 (zukunft/zk_zeitwelt.js puts what belongs to the shown world on 0 or 21)
//   the split:  twice with viewport and scissor, the identical camera: left half layers 0 + 21 (world L), right half 0 + 22 (world R)
// Both composers are sized to the picture they draw (half the width in the split, the band between the letterbox bars), so the split
// fills no more pixels than one frame – it costs the draw calls twice, not the fill. Nothing new is compiled: the same programs in the
// same render-target variant; layers are no part of a program. The sun's shadow map is drawn once per frame (in the left half) and serves
// both: things on layers 21/22 should not cast sun shadows (their shadow would show in both halves). The letterbox bars are black canvas
// (the workshop's #ws-top/#ws-bot lie over them), the picture uses the band between them. A cut cross-fades: right after a frame of the old
// view is drawn it is copied into a canvas over the stage (half resolution), which then fades out over the new view (~1 s).
// stills(): a view rendered once in the same frame as the live picture (never shown), read as a JPEG – the phone photos of zeitreise-medien.
import * as THREE from 'three';
import { cam, R, stage } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { MOTION, RENDER } from '../render/render.js';

export const ZKBILD = (() => {
  const L21 = 1 << 21,
    L22 = 1 << 22;
  const S = {
    on: false,
    split: false,
    side: 'L', // the shown world when not split: 'L' (layers 0 + 21) or 'R' (0 + 22)
    bars: 0, // the letterbox bar's height as a share of the stage height (each bar), eased towards want
    want: 0,
    fade: null, // { cv, ctx, k (opacity), t }
    cut: null, // { fn, t } a cut waiting for the next drawn frame of the old view
    stills: [], // [{ pose, side, res, rej, apply }] waiting for the next draw
    info: { calls: 0, tris: 0, ms: 0, halves: 0, w: 0, h: 0, frames: 0, kind: '' },
    black: new Float32Array(0),
  };
  const sizeOf = c => [c._width || 0, c._height || 0];
  function fit(c, w, h) {
    if (!c) return;
    const [cw, ch] = sizeOf(c);
    if (cw !== w || ch !== h) c.setSize(w, h);
  }
  // ---- the frame ----
  function draw(kind) {
    if (!S.on) return false;
    const w = stage.clientWidth,
      h = stage.clientHeight;
    if (!w || !h) return false;
    const t0 = performance.now();
    const comp = kind === 'motion' && MOTION.level > 0 && MOTION.comp ? MOTION.comp : RENDER.composer;
    if (!comp) return false;
    const info = R.info,
      ar = info.autoReset;
    info.autoReset = false;
    info.reset();
    try {
      // stills first: drawn and read in this frame, then overwritten by the live picture below (never shown)
      while (S.stills.length) still(S.stills.shift(), w, h);
      live(comp, w, h);
      // a cut waits for one frame of the old view: copy it now, then the director switches the view
      if (S.cut) grabCut(w, h);
    } finally {
      S.info.calls = info.render.calls;
      S.info.tris = info.render.triangles;
      info.autoReset = ar;
    }
    S.info.ms = performance.now() - t0;
    S.info.kind = kind || 'still';
    S.info.frames++;
    return true;
  }
  function live(comp, w, h) {
    const bh = Math.round(h * S.bars),
      vh = Math.max(2, h - 2 * bh),
      n = S.split ? 2 : 1,
      hw = S.split ? Math.floor(w / 2) : w;
    fit(comp, hw, vh);
    const asp = cam.aspect,
      mask = cam.layers.mask;
    if (bh > 0) clearAll(w, h);
    cam.aspect = hw / vh;
    cam.updateProjectionMatrix();
    R.setScissorTest(true);
    try {
      for (let i = 0; i < n; i++) {
        const x = i ? w - hw : 0;
        R.setViewport(x, bh, hw, vh);
        R.setScissor(x, bh, hw, vh);
        cam.layers.mask = 1 | (S.split ? (i ? L22 : L21) : S.side === 'R' ? L22 : L21);
        comp.render();
      }
    } finally {
      R.setScissorTest(false);
      R.setViewport(0, 0, w, h);
      R.setScissor(0, 0, w, h);
      cam.layers.mask = mask;
      cam.aspect = asp;
      cam.updateProjectionMatrix();
    }
    S.info.halves = n;
    S.info.w = hw;
    S.info.h = vh;
  }
  const _col = new THREE.Color();
  function clearAll(w, h) {
    // the bars: black, through three's own state (a raw gl.clear would leave its cached clear colour wrong)
    const a = R.getClearAlpha();
    R.getClearColor(_col);
    R.setRenderTarget(null);
    R.setScissorTest(false);
    R.setViewport(0, 0, w, h);
    R.setClearColor(0x000000, 1);
    R.clear(true, false, false);
    R.setClearColor(_col, a);
  }
  // ---- cuts: copy the frame just drawn, fade it out over the next view ----
  function fadeEl() {
    if (S.fade) return S.fade;
    const cv = document.createElement('canvas');
    cv.id = 'zkregie-fade';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText =
      'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;opacity:0;z-index:1;display:none';
    const host = R.domElement.parentNode || stage;
    host.insertBefore(cv, R.domElement.nextSibling);
    S.fade = { cv, ctx: cv.getContext('2d'), k: 0, t: 0, T: 1 };
    return S.fade;
  }
  function grabCut(w, h) {
    const c = S.cut;
    S.cut = null;
    let ok = false;
    if (!c.hard)
      try {
        const F = fadeEl(),
          cw = Math.max(2, Math.round(w / 2)),
          ch = Math.max(2, Math.round(h / 2));
        if (F.cv.width !== cw || F.cv.height !== ch) {
          F.cv.width = cw;
          F.cv.height = ch;
        }
        F.ctx.drawImage(R.domElement, 0, 0, cw, ch);
        F.k = 1;
        F.t = 0;
        F.T = c.T || 1;
        F.cv.style.display = 'block';
        F.cv.style.opacity = '1';
        ok = true;
      } catch (e) {
        ok = false;
      }
    try {
      c.fn(ok);
    } catch (e) {
      console.warn('zkregie cut', e);
    }
    markDirty();
  }
  // a cut: fn(faded) switches the view once a frame of the old one is copied; without a drawn frame within `wait` s (tests, a hidden
  // tab) it switches without the cross-fade. hard: no cross-fade (a phone photo covers the screen and dissolves itself)
  function cut(fn, o = {}) {
    if (S.cut) {
      // a second cut before the first was drawn: the first one's view is skipped
      const f0 = S.cut.fn;
      S.cut.fn = ok => {
        f0(false);
        fn(ok);
      };
      return;
    }
    if (!S.on || o.hard) {
      fn(false);
      if (S.fade && o.hard) hideFade();
      markDirty();
      return;
    }
    S.cut = { fn, t: 0, wait: o.wait || 0.35, T: o.T || 1, hard: false };
    markDirty();
  }
  function hideFade() {
    const F = S.fade;
    if (!F) return;
    F.k = 0;
    F.cv.style.opacity = '0';
    F.cv.style.display = 'none';
  }
  // per tick of the director: the fade, a cut that waits too long, the bars
  function tick(dt) {
    if (S.cut) {
      S.cut.t += dt;
      if (S.cut.t > S.cut.wait) {
        const c = S.cut;
        S.cut = null;
        try {
          c.fn(false);
        } catch (e) {
          console.warn('zkregie cut', e);
        }
        markDirty();
      }
    }
    const F = S.fade;
    if (F && F.k > 0) {
      F.t += dt;
      const k = Math.max(0, 1 - F.t / F.T);
      F.k = k;
      F.cv.style.opacity = (k * k * (3 - 2 * k)).toFixed(3);
      if (k <= 0) hideFade();
    }
    if (S.bars !== S.want) {
      const d = S.want - S.bars,
        step = dt / 0.8;
      S.bars = Math.abs(d) <= step * 0.12 ? S.want : S.bars + Math.sign(d) * Math.min(Math.abs(d), step * 0.12);
      markDirty();
    }
  }
  // ---- stills: one view for one side, read as a JPEG (about 1080 px high at most) ----
  function stillOf(pose, side, apply, o = {}) {
    return new Promise((res, rej) => {
      S.stills.push({ pose, side, res, rej, apply, full: !!o.full });
      markDirty();
    });
  }
  function still(q, w, h) {
    const comp = RENDER.composer;
    try {
      const bh = Math.round(h * S.bars),
        vh = Math.max(2, h - 2 * bh),
        vw = S.split && !q.full ? Math.floor(w / 2) : w,
        aspect = vw / vh,
        pr = R.getPixelRatio(),
        H = Math.min(h, Math.max(2, Math.round(Math.min(1080 / pr, h)))),
        W = Math.min(w, Math.round(H * aspect)),
        Hh = Math.round(W / aspect);
      fit(comp, W, Hh);
      const asp = cam.aspect,
        mask = cam.layers.mask,
        p0 = cam.position.clone(),
        q0 = cam.quaternion.clone(),
        f0 = cam.fov,
        n0 = cam.near;
      try {
        if (q.apply) q.apply(q.pose);
        cam.aspect = aspect;
        cam.updateProjectionMatrix();
        cam.layers.mask = 1 | (q.side === 'R' ? L22 : L21);
        R.setScissorTest(true);
        R.setViewport(0, 0, W, Hh);
        R.setScissor(0, 0, W, Hh);
        comp.render();
      } finally {
        R.setScissorTest(false);
        R.setViewport(0, 0, w, h);
        R.setScissor(0, 0, w, h);
        cam.layers.mask = mask;
        cam.position.copy(p0);
        cam.quaternion.copy(q0);
        cam.fov = f0;
        cam.near = n0;
        cam.aspect = asp;
        cam.updateProjectionMatrix();
      }
      // the view lies in the lower left of the canvas (GL's origin): copy it into a canvas of its own and encode it after this frame
      const cv = document.createElement('canvas'),
        sw = Math.round(W * pr),
        sh = Math.round(Hh * pr),
        ow = Math.round(sw * Math.min(1, 1080 / Math.max(1, sh))),
        oh = Math.round(sh * Math.min(1, 1080 / Math.max(1, sh)));
      cv.width = ow;
      cv.height = oh;
      cv.getContext('2d').drawImage(R.domElement, 0, R.domElement.height - sh, sw, sh, 0, 0, ow, oh);
      const done = b => {
        if (!b) return q.res(cv.toDataURL('image/jpeg', 0.88));
        const fr = new FileReader();
        fr.onload = () => q.res(String(fr.result));
        fr.onerror = () => q.res(cv.toDataURL('image/jpeg', 0.88));
        fr.readAsDataURL(b);
      };
      if (cv.toBlob) cv.toBlob(done, 'image/jpeg', 0.88);
      else done(null);
    } catch (e) {
      q.rej(e);
    }
  }
  // ---- switching ----
  function on(v, o = {}) {
    v = !!v;
    if (v === S.on) return;
    S.on = v;
    RENDER.draw = v ? draw : null;
    if (v) {
      S.want = o.bars ?? 0.09;
      S.bars = o.instant ? S.want : 0;
    } else {
      S.cut = null;
      for (const q of S.stills.splice(0)) q.rej(new Error('Zeitreise beendet'));
      hideFade();
      S.bars = S.want = 0;
      S.split = false;
      // the composers back to the whole stage (camera.js resize: renderer, composer, motion composer, the camera's aspect)
      if (window._resize) window._resize();
    }
    markDirty(true);
  }
  function set(o) {
    if ('split' in o) S.split = !!o.split;
    if ('side' in o) S.side = o.side === 'R' ? 'R' : 'L';
    if ('bars' in o) S.want = Math.max(0, Math.min(0.2, +o.bars || 0));
    markDirty();
  }
  // tests: is any object of the scene on layer 21 or 22 (while the time journey is off there must be none)
  function layersUsed(scene) {
    const out = [];
    scene.traverse(o => {
      if (o.layers && o.layers.mask & (L21 | L22)) out.push(o.name || o.type);
    });
    return out;
  }
  return {
    S,
    on,
    set,
    cut,
    tick,
    stillOf,
    layersUsed,
    get info() {
      return {
        ...S.info,
        on: S.on,
        split: S.split,
        side: S.side,
        bars: +S.bars.toFixed(3),
        fading: !!(S.fade && S.fade.k > 0),
      };
    },
  };
})();
