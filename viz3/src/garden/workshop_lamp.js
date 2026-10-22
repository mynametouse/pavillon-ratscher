// ---------------- workshop: LED battens with a motion sensor (on after dark while someone is in the shed) ----------------
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { BUILD } from '../core/geo.js';
import { P } from '../game/game.js';
import { SFX } from '../game/play.js';
import { DN } from '../time/daynight.js';
const WLAMP = (() => {
  const Bw = window.BUILD && BUILD.werkstatt,
    g = new THREE.Group();
  g.name = 'wlamp';
  if (Bw) {
    Bw.root.add(g);
    g.position.copy(V(-Bw.pivot[0], -Bw.pivot[1], 0));
  } else scene.add(g);
  const light = new THREE.PointLight(0xfff0dc, 0, 12, 1.5);
  light.position.copy(V(-1.5, -38.72, 2.3));
  g.add(light);
  const tube = new THREE.MeshStandardMaterial({
      color: 0xf2f2ee,
      emissive: 0xfff4e6,
      emissiveIntensity: 0,
      roughness: 0.35,
    }),
    housing = new THREE.MeshStandardMaterial({ color: 0xb9bdc0, metalness: 0.4, roughness: 0.45 });
  for (const x of [-4.44, -0.52, 1.44]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 1.25), housing);
    h.position.copy(V(x, -38.72, 2.42));
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 1.18), tube);
    t.position.copy(V(x, -38.72, 2.388));
    g.add(t);
  }
  const sensor = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e4, roughness: 0.3 })
  );
  sensor.position.copy(V(-0.52, -36.95, 2.35));
  g.add(sensor);
  const S = { on: false, k: 0, away: 0 },
    wp = new THREE.Vector3();
  window.TICKS.push(dt => {
    const dark =
      window.DN && DN.active
        ? DN.state && DN.state.sunEl < 4
        : window.MODE_NOW === 'dusk' || window.MODE_NOW === 'night';
    light.getWorldPosition(wp);
    const near =
      typeof P !== 'undefined' && P.mode === 'walk' && Math.hypot(P.x - wp.x, P.y + wp.z) < 6.6 && P.feet < 3;
    if (near) S.away = 0;
    else S.away += dt;
    const want = dark && (near || (S.on && S.away < 20));
    if (want !== S.on) {
      S.on = want;
      if (want && window.SFX && SFX.click) SFX.click();
    }
    const k = S.on ? 1 : 0;
    if (Math.abs(S.k - k) > 0.001) {
      S.k += Math.sign(k - S.k) * Math.min(Math.abs(k - S.k), dt * 5);
      light.intensity = 7.5 * S.k;
      tube.emissiveIntensity = 2.2 * S.k;
      markDirty();
    }
  });
  return { light, S };
})();
window.WLAMP = WLAMP;
