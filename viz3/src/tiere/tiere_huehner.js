// ===================== feat/tiere 6: chickens – a coop and a small flock where someone decides to keep them (THUEHNER) =====================
// Nobody in the mirror world keeps chickens today, so none stand there. TIERE.huehner({ x, y, n, zu }) – the strategy mode's „Hühner halten“,
// a future to try – puts a coop and a flock there: a small wooden coop on legs with a ramp and a pop hole, the hens scratching and pecking
// round it by day, in the coop from dusk to dawn. The pop hole shut at night, or the fox takes one now and then (tiere/tiere_einfluss.js);
// eggs to collect – a hen lays almost daily in spring and summer, little in the short days of winter. The action button at the coop
// opens and shuts the pop hole and collects the eggs (KERN event 'tiere:eier' { n }).
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { DN } from '../time/daynight.js';
import { RENDER } from '../render/render.js';
import { inView } from '../npc/npc.js';
import { TKOERPER } from './tiere_koerper.js';
import { TIERE } from './tiere.js';
import { TEINFLUSS } from './tiere_einfluss.js';
export const THUEHNER = (() => {
  const H = { coop: null, at: null, hens: [], acc: 0, drawT: 0 };
  const lin = TKOERPER.lin;
  // the coop: boxes in one geometry with vertex colours (the shared material) – posts, floor, walls, a felt roof, the ramp, the pop hole;
  // built in three's axes, so the front with the pop hole and the ramp faces south (the hens' run in the sun)
  function coopGeo() {
    const pos = [],
      col = [],
      idx = [];
    const box = (cx, cy, cz, sx, sy, sz, c, rx = 0) => {
      const b = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
      if (rx) b.rotateX(rx);
      b.translate(cx, cy, cz);
      const p = b.attributes.position,
        n0 = pos.length / 3;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        col.push(...c);
        idx.push(n0 + i);
      }
    };
    const wood = lin(0x7a6650),
      wood2 = lin(0x6a5844),
      felt = lin(0x2e2e30),
      dark = lin(0x15110d);
    for (const [x, z] of [
      [-0.55, -0.42],
      [0.55, -0.42],
      [-0.55, 0.42],
      [0.55, 0.42],
    ])
      box(x, 0.3, z, 0.06, 0.6, 0.06, wood2);
    box(0, 0.62, 0, 1.2, 0.04, 0.9, wood);
    box(0, 0.92, -0.44, 1.2, 0.6, 0.03, wood);
    box(-0.59, 0.92, 0, 0.03, 0.6, 0.9, wood);
    box(0.59, 0.92, 0, 0.03, 0.6, 0.9, wood);
    // the front with the pop hole (dark) beside the door
    box(-0.33, 0.92, 0.44, 0.54, 0.6, 0.03, wood);
    box(0.4, 0.98, 0.44, 0.4, 0.48, 0.03, wood);
    box(0.1, 0.78, 0.452, 0.22, 0.3, 0.01, dark);
    // the roof: two felt planes
    box(0, 1.33, -0.25, 1.32, 0.03, 0.62, felt, 0.45);
    box(0, 1.33, 0.25, 1.32, 0.03, 0.62, felt, -0.45);
    box(0, 1.25, -0.44, 1.2, 0.12, 0.03, wood);
    box(0, 1.25, 0.44, 1.2, 0.12, 0.03, wood);
    // the ramp from the pop hole down to the ground, with slats
    const rl = 0.85,
      ra = Math.atan2(0.62, 0.6);
    box(0.1, 0.33, 0.73, 0.22, 0.025, rl, wood2, ra);
    for (let k = 1; k < 6; k++) box(0.1, 0.62 - k * 0.1, 0.45 + k * 0.1, 0.2, 0.02, 0.02, wood);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const ground = (x, y) => KERN.ground(x, y);
  function clear() {
    if (H.coop) {
      scene.remove(H.coop);
      H.coop.geometry.dispose();
      H.coop = null;
    }
    for (const h of H.hens) h.A.dispose();
    H.hens = [];
    H.at = null;
  }
  // the coop and as many hens as there are (at most 12 drawn)
  function sync() {
    const c = TEINFLUSS.E.huehner;
    if (!c) {
      if (H.coop || H.hens.length) clear();
      return;
    }
    if (!H.at || H.at[0] !== c.x || H.at[1] !== c.y) {
      clear();
      H.at = [c.x, c.y];
      H.coop = new THREE.Mesh(coopGeo(), TKOERPER.mat);
      H.coop.position.set(c.x, ground(c.x, c.y), -c.y);
      H.coop.userData.noMerge = true;
      H.coop.castShadow = true;
      H.coop.receiveShadow = true;
      H.coop.name = 'tiere huehnerstall';
      scene.add(H.coop);
      markDirty(true);
    }
    const n = Math.max(0, Math.min(12, Math.round(c.n)));
    while (H.hens.length > n) H.hens.pop().A.dispose();
    while (H.hens.length < n) {
      const i = H.hens.length,
        A = TKOERPER.make('huhn', i % 4 === 3 ? { weiss: true } : {});
      A.g.scale.setScalar(0.9 + ((i * 37) % 10) / 50);
      scene.add(A.g);
      const a = (i / 6) * 6.283;
      H.hens.push({
        A,
        x: c.x + Math.cos(a) * 2,
        y: c.y - 1.8 + Math.sin(a) * 2,
        az: (i * 77) % 360,
        v: 0,
        tx: c.x,
        ty: c.y,
        t: i,
        mode: 'peck',
      });
    }
  }
  const sunEl = () => (DN.active && DN.state && Number.isFinite(DN.state.sunEl) ? DN.state.sunEl : 20);
  function update(dt) {
    H.acc += dt;
    if (H.acc > 1) {
      H.acc = 0;
      sync();
    }
    const c = TEINFLUSS.E.huehner;
    if (!c || !H.coop) return;
    dt = Math.min(dt, 0.1);
    const night = sunEl() < -3,
      door = [c.x + 0.1, c.y - 1.15];
    let moved = false;
    for (const h of H.hens) {
      h.t += dt;
      if (night) {
        // up the ramp and in for the night
        const d = Math.hypot(door[0] - h.x, door[1] - h.y);
        if (d < 0.3 || !h.A.g.visible) {
          h.A.g.visible = false;
          continue;
        }
        h.tx = door[0];
        h.ty = door[1];
        h.mode = 'walk';
      } else {
        if (!h.A.g.visible) {
          h.A.g.visible = true;
          h.x = door[0];
          h.y = door[1] - 0.3;
        }
        // scratch and peck round the coop, now and then a few steps to a new spot; away from the walker and the dog
        const dW = Math.hypot(P.x - h.x, P.y - h.y);
        if (dW < 2.2) {
          const a = Math.atan2(h.y - P.y, h.x - P.x);
          h.tx = h.x + Math.cos(a) * 2.5;
          h.ty = h.y + Math.sin(a) * 2.5;
          h.mode = 'walk';
        } else if (h.mode === 'peck' && h.t > 4 + (h.t % 3)) {
          h.t = 0;
          const a = Math.random() * 6.283,
            r = 1 + Math.random() * 6;
          h.tx = c.x + Math.cos(a) * r;
          h.ty = c.y - 1.6 + Math.sin(a) * r;
          h.mode = 'walk';
        }
      }
      const dx = h.tx - h.x,
        dy = h.ty - h.y,
        d = Math.hypot(dx, dy);
      if (h.mode === 'walk' && d < 0.15) {
        h.mode = 'peck';
        h.t = 0;
      }
      const want = h.mode === 'walk' ? (Math.hypot(P.x - h.x, P.y - h.y) < 2.2 ? 1.6 : 0.45) : 0;
      h.v += (want - h.v) * Math.min(1, dt * 6);
      if (d > 0.05 && want > 0) {
        const az = (Math.atan2(dx, dy) * 180) / Math.PI,
          da = ((az - h.az + 540) % 360) - 180;
        h.az += Math.max(-400 * dt, Math.min(400 * dt, da));
      }
      const r = (h.az * Math.PI) / 180;
      h.x += Math.sin(r) * h.v * dt;
      h.y += Math.cos(r) * h.v * dt;
      h.A.g.position.set(h.x, ground(h.x, h.y), -h.y);
      h.A.g.rotation.y = Math.PI - r;
      h.A.anim(dt, h.v, { graze: h.mode === 'peck' ? 1 : 0 });
      if (Math.hypot(h.x - P.x, h.y - P.y) < 40 && inView(h.x, h.y, 0.3)) moved = true;
    }
    if (moved) {
      const now = performance.now() / 1000;
      if (now - H.drawT > (RENDER.hq ? 1 / 30 : 1 / 15)) {
        H.drawT = now;
        markDirty();
      }
    }
  }
  KERN.tick(update, 'tiere-huehner');
  // the action button: the pop hole, the eggs
  const near = r => {
    const c = TEINFLUSS.E.huehner;
    return c && H.coop && Math.hypot(P.x - c.x, P.y - c.y) < r ? c : null;
  };
  KERN.act({
    id: 'tiere-klappe',
    label: () => {
      const c = near(2.2);
      return c ? (c.zu ? 'Hühnerklappe öffnen' : 'Hühnerklappe schließen') : null;
    },
    pos: () => {
      const c = TEINFLUSS.E.huehner;
      return c ? [c.x + 0.1, c.y - 0.6, ground(c.x, c.y) + 0.8] : [0, 0, -100];
    },
    r: 2.2,
    run: () => {
      const c = near(2.4);
      if (!c) return;
      c.zu = !c.zu;
      TEINFLUSS.save && TEINFLUSS.save();
      PLAY.think &&
        PLAY.think(
          c.zu ? 'Klappe zu – nachts kommt kein Fuchs an die Hühner.' : 'Klappe auf – die Hühner können hinaus.',
          3200
        );
      KERN.emit('tiere:klappe', { zu: c.zu });
    },
  });
  KERN.act({
    id: 'tiere-eier',
    label: () => {
      const c = near(2.2);
      return c && c.eier >= 1 ? 'Eier einsammeln (' + Math.floor(c.eier) + ')' : null;
    },
    pos: () => {
      const c = TEINFLUSS.E.huehner;
      return c ? [c.x - 0.4, c.y, ground(c.x, c.y) + 0.9] : [0, 0, -100];
    },
    r: 2.2,
    run: () => {
      const c = near(2.4);
      if (!c || !(c.eier >= 1)) return;
      const n = Math.floor(c.eier);
      c.eier -= n;
      TEINFLUSS.save && TEINFLUSS.save();
      PLAY.think && PLAY.think(n + (n === 1 ? ' Ei' : ' Eier') + ' aus dem Nest.', 3000);
      KERN.emit('tiere:eier', { n });
    },
  });
  H.update = update;
  H.sync = sync;
  return H;
})();
window.THUEHNER = THUEHNER;
