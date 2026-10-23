// ===================== feat/dorf village life 7: the villagers' cars (DCARS) =====================
// Falko, 23.10.2026 2:52: now and then people get into their cars, drive away and come back later. Katrin, Jens, Ingrid and Manfred have
// a car (dorf/dorf_life.js: who, and when they are away). It is parked at the kerb of the street nearest the house (world/roads.js ways),
// on the right-hand side for the way out. When one is near: the owner comes out, walks to the car, it drives slowly in the right-hand lane
// away from the Anger and is gone after ~200 m (or where the street ends); later it comes back in the other lane, parks at the kerb across
// the street (facing in) and the owner walks into the house; while nobody looks it is turned for the next morning. Far away the cars only
// follow the timetable (parked or away). A plain car without a brand: body, cabin with dark windows, wheels, lamps – one mesh of
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
  // the street next to the house: nearest point on a street, lane or service way; the spot at the kerb and the drive out
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
      dA = (x, y) => Math.hypot(x - ANGER[0], y - ANGER[1]);
    // both ways along the street (and on along the ways that continue from its ends): the one that leads further out of the village
    let pick = null;
    for (const fwd of [true, false]) {
      const d = drive(best, fwd, ux, uy, dA);
      if (!d) continue;
      const e = d.pts[d.pts.length - 1],
        score = dA(e[0], e[1]) + Math.min(d.L, 230) * 0.6;
      if (!pick || score > pick.score) pick = Object.assign(d, { score });
    }
    return pick;
  }
  // a drive out from the parking spot in one direction of the way: parked at the kerb on the right-hand side (as one parks here; maybe
  // across the street from the house), the right-hand lane, this way to its end, then on along the way that continues from there
  // (street, lane, county or main road) and leads further out, up to 230 m (OSM ways end at every junction)
  function drive(best, fwd, ux, uy, dA) {
    const W = ROADS.ways,
      p = best.w.p,
      side = fwd ? -1 : 1, // the left normal of (ux, uy) times side points to the right of the way out
      off = Math.max(0.9, best.w.w / 2 - 1.0) * side,
      lane = Math.min(1.2, best.w.w / 4);
    const pts = [[best.qx - uy * off, best.qy + ux * off]];
    let acc = 0;
    function push(x, y) {
      const l = pts[pts.length - 1],
        dx = x - l[0],
        dy = y - l[1],
        d = Math.hypot(dx, dy);
      if (d < 0.5) return;
      pts.push([x + (dy / d) * lane, y - (dx / d) * lane]); // to the right of the direction of travel
      acc += d;
    }
    const used = new Set([best.w]);
    let cur = { p, j: fwd ? best.i / 2 + 1 : best.i / 2, dir: fwd ? 1 : -1 };
    for (let hop = 0; hop < 8 && cur && acc < 230; hop++) {
      const Q = cur.p,
        m = Q.length / 2;
      for (let j = cur.j; j >= 0 && j < m && acc < 230; j += cur.dir) push(Q[j * 2], Q[j * 2 + 1]);
      if (acc >= 230) break;
      const e = cur.dir > 0 ? m - 1 : 0,
        ex = Q[e * 2],
        ey = Q[e * 2 + 1];
      let next = null;
      for (const w of W) {
        if (used.has(w) || w.kind < 1 || w.kind > 5 || w.fl & 1) continue;
        const q = w.p,
          k = q.length / 2;
        for (let i = 0; i < k; i++) {
          if (Math.hypot(q[i * 2] - ex, q[i * 2 + 1] - ey) > 3.5) continue;
          for (const dir of [1, -1]) {
            const f = dir > 0 ? k - 1 : 0;
            if (f === i) continue;
            const far = dA(q[f * 2], q[f * 2 + 1]);
            if (far > dA(ex, ey) + 5 && (!next || far > next.far)) next = { p: q, j: i + dir, dir, far, w };
          }
        }
      }
      if (next) used.add(next.w);
      cur = next;
    }
    if (pts.length < 2) return null;
    const s = [0];
    for (let j = 1; j < pts.length; j++)
      s.push(s[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    const dir0 = fwd ? [ux, uy] : [-ux, -uy];
    return {
      pts,
      s,
      L: s[s.length - 1],
      hd: (Math.atan2(dir0[0], dir0[1]) * 180) / Math.PI,
      lane,
      in0: [2 * best.qx - pts[0][0], 2 * best.qy - pts[0][1]], // the kerb across the street (coming home)
    };
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
  // the way home: the other lane (mirrored across the middle of the street), the last 8 m to the kerb across from the spot
  function alongIn(c, a) {
    const q = along(c, a),
      r = (q.hd * Math.PI) / 180,
      R = [Math.cos(r), -Math.sin(r)], // right of the way out
      k = Math.max(0, Math.min(1, 1 - a / 8)),
      e = k * k * (3 - 2 * k);
    let x = q.x - 2 * c.path.lane * R[0],
      y = q.y - 2 * c.path.lane * R[1];
    x += (c.path.in0[0] - x) * e;
    y += (c.path.in0[1] - y) * e;
    return { x, y, hd: q.hd + 180 };
  }
  // the driver's door (left, a little ahead of the middle) of a car standing at p with heading hd
  function door(c, p, hd) {
    const r = (hd * Math.PI) / 180,
      fx = Math.sin(r),
      fy = Math.cos(r);
    return [p[0] - fy * 1.15 + fx * 0.3, p[1] + fx * 1.15 + fy * 0.3];
  }
  const _v = new THREE.Vector3(),
    _f = new THREE.Vector3();
  // does the visitor see the car (near and in front of the camera)?
  function seen(c) {
    _v.copy(c.g.position).sub(cam.position);
    const d = _v.length();
    if (d > 140) return false;
    cam.getWorldDirection(_f);
    return d < 6 || _v.dot(_f) / d > 0.45;
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
      const c = { key: k, g, path, st: 'parked', a: 0, v: 0, pose: 'out' };
      put(c, path.pts[0][0], path.pts[0][1], path.hd);
      S.cars[k] = c;
    }
    S.ready = true;
    return true;
  }
  // per frame (dorf/dorf.js): the timetable; driving only while one is near (else it jumps to parked or away)
  function tick(dt, t, mx, my, hooks) {
    if (!S.ready) return;
    const jump = S.lastT !== undefined && Math.abs(t - S.lastT) > 10; // the clock jumped (slept, set): the timetable, no drive
    S.lastT = t;
    for (const c of Object.values(S.cars)) {
      const aw = DLIFE.away(c.key, t),
        p0 = c.path.pts[0],
        near = Math.hypot(mx - p0[0], my - p0[1]) < 260;
      if (!near || !c.near || jump) {
        // far away (or just come near): only the timetable, nothing drives
        c.st = aw ? 'away' : 'parked';
        c.a = aw ? c.path.L : 0;
        c.pose = 'out';
        c.near = near;
        if (c.g.visible !== (near && !aw)) {
          c.g.visible = near && !aw;
          markDirty();
        }
        if (near) put(c, p0[0], p0[1], c.path.hd);
        continue;
      }
      // home from the last drive and time to go again while somebody watches: turned after a while all the same
      if (c.st === 'parked' && aw && c.pose === 'in' && (c.inWait = (c.inWait || 0) + dt) > 30) c.pose = 'out';
      if (c.st === 'parked' && aw && c.pose === 'out') {
        c.inWait = 0;
        // the owner comes out and gets in (dorf/dorf.js loads the figure and shows the walk; a few seconds at most for the loading)
        const there = !hooks || !hooks.want || hooks.want(c.key);
        c.figWait = there ? 0 : (c.figWait || 0) + dt;
        if (there || c.figWait > 6) {
          c.st = 'boarding';
          c.wait = Math.max(2.5, (hooks && hooks.board && hooks.board(c.key, door(c, c.path.pts[0], c.path.hd))) || 0);
        }
      } else if (c.st === 'away' && !aw) {
        c.st = 'arriving';
        c.a = c.path.L;
      }
      if (c.st === 'arriving' && hooks && hooks.want) hooks.want(c.key);
      if (c.st === 'boarding') {
        c.wait -= dt;
        if (c.wait <= 0) c.st = 'leaving';
      }
      if (c.st === 'leaving' || c.st === 'arriving') {
        // slow through the village; it waits while the visitor stands right in front of it
        const out = c.st === 'leaving',
          pos = out ? along(c, c.a) : alongIn(c, c.a),
          fx = Math.sin((pos.hd * Math.PI) / 180),
          fy = Math.cos((pos.hd * Math.PI) / 180),
          px = P.x - pos.x,
          py = P.y - pos.y,
          blocked =
            P.mode === 'walk' && px * fx + py * fy > 0 && px * fx + py * fy < 7 && Math.abs(px * fy - py * fx) < 1.6,
          vmax = out ? 6.5 : Math.min(6.5, 1.2 + c.a * 0.5); // slowing down before the kerb
        c.v += ((blocked ? 0 : vmax) - c.v) * Math.min(1, dt * (blocked ? 3 : 0.8));
        c.a += c.v * dt * (out ? 1 : -1);
        if (out && c.a >= c.path.L) {
          c.st = 'away';
          c.v = 0;
        } else if (!out && c.a <= 0) {
          c.a = 0;
          c.v = 0;
          c.st = 'parked';
          c.pose = 'in'; // across the street, facing in
          if (hooks && hooks.alight) hooks.alight(c.key, door(c, c.path.in0, c.path.hd + 180));
        }
        const a = Math.max(0, Math.min(c.path.L, c.a)),
          q = out ? along(c, a) : alongIn(c, a);
        put(c, q.x, q.y, q.hd);
        markDirty();
      }
      const vis = c.st !== 'away';
      if (c.g.visible !== vis) {
        c.g.visible = vis;
        markDirty();
      }
      if (vis && c.st === 'parked') {
        // parked where it belongs; home from a drive it stands across the street until nobody looks, then it is turned for the next one
        if (c.pose === 'in' && !seen(c)) c.pose = 'out';
        const sp = c.pose === 'in' ? c.path.in0 : p0;
        if (Math.hypot(c.at[0] - sp[0], c.at[1] - sp[1]) > 0.01) {
          put(c, sp[0], sp[1], c.path.hd + (c.pose === 'in' ? 180 : 0));
          markDirty();
        }
      }
    }
  }
  const state = () =>
    Object.fromEntries(
      Object.entries(S.cars).map(([k, c]) => [
        k,
        { st: c.st, a: +c.a.toFixed(1), L: +c.path.L.toFixed(0), pose: c.pose },
      ])
    );
  Object.assign(S, { build, tick, state });
  return S;
})();
window.DCARS = DCARS;
