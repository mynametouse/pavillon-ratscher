// ===================== feat/dorf village life 7: the villagers' cars (DCARS) =====================
// Falko, 23.10.2026 2:52: now and then people get into their cars, drive away and come back later. Katrin, Jens, Ingrid and Manfred have
// a car (dorf/dorf_life.js: who, and when they are away). It is parked at the kerb of the street nearest the house (world/roads.js ways),
// along the street. When one is near: the owner comes out, walks to the car, it drives slowly along the street away from the Anger and is
// gone after ~200 m (or where the street ends); later it comes back the same way and the owner walks into the house. Far away the cars
// only follow the timetable (parked or away). A plain car without a brand: body, cabin with dark windows, wheels, lamps – one mesh of
// vertex colours each (the program of world/village_props.js), built when one first comes near.
import * as THREE from 'three';
import { cam, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { ROADS } from '../world/roads.js';
import { VPROPS } from '../world/village_props.js';
import { DLIFE } from './dorf_life.js';
export const DCARS = (() => {
  const S = { cars: {}, ready: false };
  const ANGER = [222, -108];
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const MAT = () =>
    (S.mat = S.mat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, envMapIntensity: 0.9 }));
  // the car in its own frame: x across (right), y along (forward), z up; origin on the ground under its middle
  function model(hex) {
    const k = VPROPS.kit(),
      c = new THREE.Color(hex),
      body = L(c.r, c.g, c.b),
      dark = L(0.08, 0.09, 0.1),
      glass = L(0.1, 0.13, 0.16),
      tyre = L(0.05, 0.05, 0.05),
      rim = L(0.55, 0.56, 0.57);
    k.box(0, 0, 0.3, 1.74, 4.25, 0.5, 0, body); // lower body
    k.box(0, 0.05, 0.8, 1.7, 3.9, 0.1, 0, body); // shoulder
    k.box(0, -0.25, 0.9, 1.56, 2.3, 0.52, 0, glass); // cabin with its windows
    k.box(0, -0.25, 1.42, 1.5, 2.1, 0.06, 0, body); // roof
    k.box(0, 1.35, 0.9, 1.5, 0.05, 0.42, 0, body); // the base of the windscreen
    k.box(0, 0, 0.18, 1.6, 4.32, 0.14, 0, dark); // sills and bumpers
    for (const sx of [-0.62, 0.62]) {
      k.box(sx, 2.12, 0.62, 0.32, 0.03, 0.12, 0, L(0.95, 0.95, 0.9)); // head lamps
      k.box(sx, -2.12, 0.62, 0.3, 0.03, 0.1, 0, L(0.6, 0.05, 0.04)); // tail lamps
    }
    for (const [sx, sy] of [
      [-0.88, 1.35],
      [0.88, 1.35],
      [-0.88, -1.35],
      [0.88, -1.35],
    ]) {
      k.disc(sx, sy, 0.32, Math.sign(sx), 0, 0.32, tyre, 14, true);
      k.disc(sx + Math.sign(sx) * 0.005, sy, 0.32, Math.sign(sx), 0, 0.19, rim, 10, false);
    }
    const me = new THREE.Mesh(k.geo(), MAT());
    me.userData.noMerge = true;
    me.castShadow = false;
    return me;
  }
  // the street next to the house: nearest point on a street, lane or service way; parked at the kerb on the house's side
  function parking(h) {
    const W = ROADS && ROADS.ways ? ROADS.ways : [];
    let best = null;
    for (const w of W) {
      if (w.kind < 2 || w.kind > 5) continue;
      const p = w.p;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i],
          ay = p[i + 1],
          dx = p[i + 2] - ax,
          dy = p[i + 3] - ay,
          L2 = dx * dx + dy * dy || 1,
          t = Math.max(0, Math.min(1, ((h.door[0] - ax) * dx + (h.door[1] - ay) * dy) / L2)),
          qx = ax + dx * t,
          qy = ay + dy * t,
          d = Math.hypot(h.door[0] - qx, h.door[1] - qy);
        if (!best || d < best.d) best = { d, w, i, t, qx, qy, dx, dy };
      }
    }
    if (!best || best.d > 45) return null;
    const len = Math.hypot(best.dx, best.dy) || 1,
      ux = best.dx / len,
      uy = best.dy / len,
      side = Math.sign((h.door[0] - best.qx) * -uy + (h.door[1] - best.qy) * ux) || 1,
      off = Math.max(0.9, best.w.w / 2 - 1.0) * side;
    // the drive: along the way from here, towards its end that lies further from the Anger, up to 200 m
    const p = best.w.p,
      n = p.length / 2,
      endA = [p[0], p[1]],
      endB = [p[(n - 1) * 2], p[(n - 1) * 2 + 1]],
      fwd = Math.hypot(endB[0] - ANGER[0], endB[1] - ANGER[1]) >= Math.hypot(endA[0] - ANGER[0], endA[1] - ANGER[1]);
    const pts = [[best.qx - uy * off, best.qy + ux * off]];
    let acc = 0;
    if (fwd) for (let j = best.i / 2 + 1; j < n && acc < 200; j++) push(p[j * 2], p[j * 2 + 1]);
    else for (let j = best.i / 2; j >= 0 && acc < 200; j--) push(p[j * 2], p[j * 2 + 1]);
    function push(x, y) {
      const l = pts[pts.length - 1],
        dx = x - l[0],
        dy = y - l[1],
        d = Math.hypot(dx, dy);
      if (d < 0.5) return;
      // keep to the right half of the road while driving out (lane offset across the segment)
      const o = 1.2;
      pts.push([x - (dy / d) * o * (fwd ? 1 : 1), y + (dx / d) * o * (fwd ? 1 : 1)]);
      acc += d;
    }
    if (pts.length < 2) return null;
    const s = [0];
    for (let j = 1; j < pts.length; j++)
      s.push(s[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    const dir0 = fwd ? [ux, uy] : [-ux, -uy];
    return { pts, s, L: s[s.length - 1], hd: (Math.atan2(dir0[0], dir0[1]) * 180) / Math.PI };
  }
  // position and heading at arc length a along the drive
  function along(c, a) {
    const { pts, s } = c.path;
    let j = 1;
    while (j < s.length - 1 && s[j] < a) j++;
    const k = (a - s[j - 1]) / Math.max(1e-3, s[j] - s[j - 1]),
      x = pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * k,
      y = pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * k;
    return { x, y, hd: (Math.atan2(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]) * 180) / Math.PI };
  }
  function put(c, x, y, hd) {
    c.g.position.copy(V(x, y, KERN.ground(x, y) + 0.02));
    c.g.rotation.y = (-hd * Math.PI) / 180;
    c.at = [x, y];
  }
  function build() {
    const H = DLIFE.homes();
    if (!H || !ROADS || !ROADS.ways || !ROADS.ways.length) return false;
    for (const [k, hex] of Object.entries(DLIFE.CARS)) {
      const h = H[k];
      if (!h) continue;
      const path = parking(h);
      if (!path) continue;
      const g = new THREE.Group();
      g.add(model(hex));
      g.visible = false;
      scene.add(g);
      const c = { key: k, g, path, st: 'parked', a: 0, v: 0 };
      put(c, path.pts[0][0], path.pts[0][1], path.hd);
      S.cars[k] = c;
    }
    S.ready = true;
    return true;
  }
  // per frame (dorf/dorf.js): the timetable; driving only while one is near (else it jumps to parked or away)
  function tick(dt, t, mx, my, hooks) {
    if (!S.ready) return;
    for (const c of Object.values(S.cars)) {
      const aw = DLIFE.away(c.key, t),
        p0 = c.path.pts[0],
        near = Math.hypot(mx - p0[0], my - p0[1]) < 260;
      if (!near) {
        c.st = aw ? 'away' : 'parked';
        c.a = aw ? c.path.L : 0;
        c.g.visible = false;
        continue;
      }
      if (c.st === 'parked' && aw) {
        c.st = 'boarding';
        c.wait = 2.5; // the owner comes out and gets in (dorf/dorf.js shows the walk)
        if (hooks && hooks.board) hooks.board(c.key, p0);
      } else if (c.st === 'away' && !aw) {
        c.st = 'arriving';
        c.a = c.path.L;
      }
      if (c.st === 'boarding') {
        c.wait -= dt;
        if (c.wait <= 0) c.st = 'leaving';
      }
      if (c.st === 'leaving' || c.st === 'arriving') {
        // slow through the village; it waits while the visitor stands right in front of it
        const pos = along(c, c.a),
          ahead = c.st === 'leaving' ? 1 : -1,
          fx = Math.sin((pos.hd * Math.PI) / 180) * ahead,
          fy = Math.cos((pos.hd * Math.PI) / 180) * ahead,
          px = P.x - pos.x,
          py = P.y - pos.y,
          blocked =
            P.mode === 'walk' && px * fx + py * fy > 0 && px * fx + py * fy < 7 && Math.abs(px * fy - py * fx) < 1.6;
        c.v += ((blocked ? 0 : 6.5) - c.v) * Math.min(1, dt * (blocked ? 3 : 0.8));
        c.a += c.v * dt * ahead;
        if (c.st === 'leaving' && c.a >= c.path.L) {
          c.st = 'away';
          c.v = 0;
        } else if (c.st === 'arriving' && c.a <= 0) {
          c.a = 0;
          c.v = 0;
          c.st = 'parked';
          if (hooks && hooks.alight) hooks.alight(c.key, p0);
        }
        const q = along(c, Math.max(0, Math.min(c.path.L, c.a)));
        put(c, q.x, q.y, c.st === 'parked' ? c.path.hd : q.hd + (ahead < 0 ? 180 : 0));
        markDirty();
      }
      const vis = c.st !== 'away';
      if (c.g.visible !== vis) {
        c.g.visible = vis;
        markDirty();
      }
      if (vis && c.st === 'parked') {
        // parked: where it belongs
        if (Math.hypot(c.at[0] - p0[0], c.at[1] - p0[1]) > 0.01) put(c, p0[0], p0[1], c.path.hd);
      }
    }
    void cam;
  }
  const state = () =>
    Object.fromEntries(
      Object.entries(S.cars).map(([k, c]) => [k, { st: c.st, a: +c.a.toFixed(1), L: +c.path.L.toFixed(0) }])
    );
  Object.assign(S, { build, tick, state });
  return S;
})();
window.DCARS = DCARS;
