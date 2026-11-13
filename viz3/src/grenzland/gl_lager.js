// ===================== feat/grenzland-mission: the haulier's yard in the fields (GLLAGER) =====================
// „Außenlager Krähwinkel“ – invented, built by the mode beside a field track towards the motorway (GLDATA.ORTE.lager; which side of the
// track and how far off it is measured on the ground when it is built), gone when the mode ends, hidden in 1989: a rod-mesh fence with a
// gate towards the track and a gap at the back, four sea containers, an office container one can enter (a door to break open, a window
// lit at night, the framed half of the map on its wall), the haulier's van, pallets, a floodlight on a mast (one borrowed light, KERN.lights),
// a camera at the gate – a witness that knows nobody (GLFAHNDUNG.hooks.zeuge) –, and two guards who come when one is near: one walks the
// round along the fence, one stands at the gate. They see with GLLOGIK.sieht (their back is blind, the dark and ducking help, under the
// floodlight the dark does not), containers hide (GLMDATA.lager().sicht). Who is seen inside is shouted at and chased as far as the fence;
// caught: the mission decides (GLLAGER.hooks.gefasst), else one is put out at the gate. Noise (GLLAGER.laerm) makes them look.
// The plan is pure data (grenzland/gl_mission_data.js GLMDATA.lager). Everything solid is a box of vehicles/vehicle.js VEH.extra
// (walker and vehicles); the meshes are vertex colours in the traffic's material (no new shader program).
//   GLLAGER.build() · drop() · tick(dt) · on · Y (the plan in site metres) · wachen → [{ F, W, job }] · reset() (door shut, map back, guards calm)
//   GLLAGER.tuerAuf() · karteWeg() · lenke(x, y, sec) (both guards run there and stay) · laerm(x, y, r) · status()
// Events: 'grenzland:lager' { was: 'alarm' | 'weg' | 'gefasst' | 'drin' | 'raus' }.
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { VEH } from '../vehicles/vehicle.js';
import { VPROPS } from '../world/village_props.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { GLLOGIK } from './gl_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLHUD } from './gl_hud.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLMDATA, GLMLOGIK } from './gl_mission_data.js';
export const GLLAGER = (() => {
  const S = {
    on: false,
    Y: null, // the plan (GLMDATA.lager)
    grp: null,
    boxes: [], // VEH.extra entries
    tuerBox: null,
    offen: false, // the office door is broken open
    karte: true, // the framed map hangs on the wall
    wachen: [], // { F, W, job: 'runde' | 'posten' | 'jagt' | 'schaut' | 'gelenkt', t, i }
    loading: false,
    near: false,
    drin: false,
    lkw: null,
    hooks: { gefasst: null },
    prevZeuge: undefined,
    dark: null,
    err: '',
  };
  const T = GLMDATA.T,
    hyp = Math.hypot;
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  const dark = () => !!(VAUTO.dark && VAUTO.dark());
  const sneak = () => (GLFAHNDUNG.sneak ? !!GLFAHNDUNG.sneak() : !VEH.cur && P.stance !== 'stand');
  const gz = (x, y) => {
    const z = KERN.ground(x, y);
    return Number.isFinite(z) ? z : 0;
  };
  // ---- where the track is: which side of the place, and how far the yard must stay off it ----
  function messen(O) {
    const r = ((O.az || 0) * Math.PI) / 180,
      ux = Math.sin(r),
      uy = Math.cos(r),
      nx = Math.cos(r),
      ny = -Math.sin(r);
    const first = (side, a) => {
      for (let b = 2; b <= 45; b += 1) {
        const x = O.pos[0] + ux * a + nx * b * side,
          y = O.pos[1] + uy * a + ny * b * side;
        let s = null;
        try {
          s = KERN.surface(x, y);
        } catch (e) {}
        if (s) return b;
      }
      return 99;
    };
    const H = GLMDATA.HOF,
      at = [H.a0, 0, H.a1],
      d = [1, -1].map(side => Math.min(...at.map(a => first(side, a))));
    const side = d[1] < d[0] ? -1 : 1,
      near = Math.min(d[0], d[1]),
      // the front fence stays five metres off the track
      shift = near < 90 ? Math.max(0, H.b1 + 5 - near) : 0;
    return { side, shift, pos: [O.pos[0] - nx * side * shift, O.pos[1] - ny * side * shift] };
  }
  // ---- the meshes ----
  const own = m => {
    m.userData.noMerge = true;
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  };
  function bauen(Y) {
    const H = Y.H,
      k = VPROPS.kit(),
      kl = VPROPS.kit(), // what glows at night
      rot = -(Y.az * Math.PI) / 180,
      Z = (a, b) => {
        const p = Y.w(a, b);
        return gz(p[0], p[1]);
      },
      W3 = (a, b, z) => {
        const p = Y.w(a, b);
        return [p[0], p[1], z];
      };
    const ROD = L(58, 66, 62),
      POST = L(70, 78, 74),
      GATE = L(126, 130, 132);
    // a thin ribbon seen from both sides
    const band = (K, p0, p1, p2, p3, col) => {
      K.quad(p0, p1, p2, p3, col);
      K.quad(p1, p0, p3, p2, col);
    };
    // a box of the plan: half lengths la (along a) and lb (along b), from z0 up
    const box = (K, a, b, la, lb, z0, h, col, bottom) => {
      const p = Y.w(a, b);
      K.box(p[0], p[1], z0, 2 * lb, 2 * la, h, rot, col, bottom);
    };
    // the fence: posts, rods, rails – following the ground
    function zaun(a0, b0, a1, b1, col, h = H.h) {
      const len = hyp(a1 - a0, b1 - b0),
        n = Math.max(1, Math.round(len / 2.5)),
        da = (a1 - a0) / len,
        db = (b1 - b0) / len;
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n,
          b = b0 + ((b1 - b0) * i) / n;
        box(k, a, b, 0.035, 0.035, Z(a, b) - 0.1, h + 0.16, POST);
      }
      const m = Math.max(1, Math.round(len / 0.24));
      for (let i = 0; i < m; i++) {
        const t = (i + 0.5) / m,
          a = a0 + (a1 - a0) * t,
          b = b0 + (b1 - b0) * t,
          z = Z(a, b),
          w = 0.011;
        band(
          k,
          W3(a - da * w, b - db * w, z + 0.04),
          W3(a + da * w, b + db * w, z + 0.04),
          W3(a + da * w, b + db * w, z + h),
          W3(a - da * w, b - db * w, z + h),
          col
        );
      }
      for (let i = 0; i < n; i++) {
        const A = [a0 + ((a1 - a0) * i) / n, b0 + ((b1 - b0) * i) / n],
          B = [a0 + ((a1 - a0) * (i + 1)) / n, b0 + ((b1 - b0) * (i + 1)) / n],
          zA = Z(A[0], A[1]),
          zB = Z(B[0], B[1]);
        for (const q of [0.06, 0.62, 1.2, 1.78, h - 0.03])
          if (q < h)
            band(
              k,
              W3(A[0], A[1], zA + q),
              W3(B[0], B[1], zB + q),
              W3(B[0], B[1], zB + q + 0.03),
              W3(A[0], A[1], zA + q + 0.03),
              col
            );
      }
    }
    for (const [s, e] of Y.zaun) zaun(s[0], s[1], e[0], e[1], ROD);
    // the gate: two leaves, shut, with a frame and a yellow plate (no words)
    {
      const [g0, g1] = H.tor,
        mid = (g0 + g1) / 2;
      zaun(g0 + 0.05, H.b1, mid - 0.03, H.b1, GATE, H.h - 0.1);
      zaun(mid + 0.03, H.b1, g1 - 0.05, H.b1, GATE, H.h - 0.1);
      const z = Z(g0 - 1.2, H.b1);
      const p0 = W3(g0 - 1.5, H.b1 + 0.05, z + 1.25),
        p1 = W3(g0 - 0.9, H.b1 + 0.05, z + 1.25),
        p2 = W3(g0 - 0.9, H.b1 + 0.05, z + 1.65),
        p3 = W3(g0 - 1.5, H.b1 + 0.05, z + 1.65);
      band(k, p0, p1, p2, p3, L(214, 176, 40));
    }
    // the gap at the back: the missing mat lies trampled in the grass
    {
      const [l0, l1] = H.luecke,
        z0 = Z(l0, H.b0 + 0.9) + 0.05,
        z1 = Z(l1, H.b0 + 2.6) + 0.05;
      band(
        k,
        W3(l0, H.b0 + 0.5, z0),
        W3(l1, H.b0 + 0.7, z0),
        W3(l1 + 0.2, H.b0 + 2.6, z1),
        W3(l0 + 0.2, H.b0 + 2.4, z1),
        L(48, 54, 50)
      );
    }
    // the sea containers: corrugated sides, door bars at one end, corner castings
    for (const c of H.container) {
      const la = c.l / 2,
        lb = 1.22,
        zs = [Z(c.a - la, c.b - lb), Z(c.a + la, c.b - lb), Z(c.a - la, c.b + lb), Z(c.a + la, c.b + lb)],
        z0 = Math.min(...zs) - 0.04,
        h = 2.59 + Math.max(...zs) - z0 - 0.04,
        col = L(...c.col),
        rib = col.map(v => v * 0.72),
        edge = col.map(v => v * 0.5);
      box(k, c.a, c.b, la, lb, z0, h, col);
      for (let a = c.a - la + 0.35; a < c.a + la - 0.2; a += 0.55)
        for (const s of [-1, 1]) box(k, a, c.b + s * (lb + 0.012), 0.09, 0.014, z0 + 0.18, h - 0.36, rib);
      for (const sa of [-1, 1])
        for (const sb of [-1, 1])
          box(k, c.a + sa * (la - 0.06), c.b + sb * (lb - 0.06), 0.075, 0.075, z0, h + 0.012, edge);
      for (const q of [-0.75, -0.3, 0.3, 0.75])
        box(k, c.a + la + 0.02, c.b + q, 0.02, 0.022, z0 + 0.12, h - 0.24, L(150, 152, 150));
      box(k, c.a + la + 0.015, c.b, 0.012, 0.02, z0 + 0.1, h - 0.2, edge);
    }
    // the office container: walls around a room, a roof, a floor on the ground, the door's frame, the window, a desk, a calendar
    const B = H.buero,
      bb = B.b - B.w / 2,
      bf = B.b + B.w / 2,
      aL = B.a - B.l / 2,
      aR = B.a + B.l / 2,
      zc = [Z(aL, bb), Z(aR, bb), Z(aL, bf), Z(aR, bf)],
      zB0 = Math.min(...zc) - 0.06,
      zF = Math.max(...zc),
      WALL = L(206, 208, 202),
      TRIM = L(64, 86, 112),
      top = zF + B.h;
    for (const q of Y.boxen.filter(b => b.k === 'buero')) box(k, q.a, q.b, q.la, q.lb, zB0, top - zB0, WALL);
    box(k, B.a, B.b, B.l / 2 + 0.06, B.w / 2 + 0.06, top, 0.1, TRIM, true); // roof
    box(k, B.a, B.b, B.l / 2 + 0.07, B.w / 2 + 0.07, zB0, zF - zB0 + 0.02, TRIM); // base under the floor
    box(k, Y.tuer.a, bb, Y.tuer.la, 0.085, zF + 2.05, B.h - 2.05, WALL); // over the door
    k.quad(
      W3(aL + 0.1, bb + 0.1, zF + 0.03),
      W3(aR - 0.1, bb + 0.1, zF + 0.03),
      W3(aR - 0.1, bf - 0.1, zF + 0.03),
      W3(aL + 0.1, bf - 0.1, zF + 0.03),
      L(120, 96, 70)
    );
    k.quad(
      W3(aL + 0.1, bf - 0.1, zF + 0.03),
      W3(aR - 0.1, bf - 0.1, zF + 0.03),
      W3(aR - 0.1, bb + 0.1, zF + 0.03),
      W3(aL + 0.1, bb + 0.1, zF + 0.03),
      L(120, 96, 70)
    );
    // the window in the wall towards the yard: a frame outside, the pane glows at night (both sides)
    {
      const a0 = B.fenster - 0.55,
        a1 = B.fenster + 0.55,
        z0 = zF + 1.0,
        z1 = zF + 1.9;
      box(k, B.fenster, bb - 0.09, 0.62, 0.02, z0 - 0.07, 0.07, TRIM);
      box(k, B.fenster, bb - 0.09, 0.62, 0.02, z1, 0.07, TRIM);
      band(
        kl,
        W3(a0, bb - 0.095, z0),
        W3(a1, bb - 0.095, z0),
        W3(a1, bb - 0.095, z1),
        W3(a0, bb - 0.095, z1),
        [1, 1, 1]
      );
      band(
        kl,
        W3(a0, bb + 0.095, z0),
        W3(a1, bb + 0.095, z0),
        W3(a1, bb + 0.095, z1),
        W3(a0, bb + 0.095, z1),
        [1, 1, 1]
      );
    }
    box(k, aL + 0.95, B.b + 0.35, 0.7, 0.36, zF + 0.03, 0.74, L(96, 74, 52), true); // desk
    box(k, aL + 0.95, B.b - 0.45, 0.22, 0.22, zF + 0.03, 0.46, L(40, 42, 46), true); // stool
    band(
      k,
      W3(aR - 0.1, B.b - 0.25, zF + 1.2),
      W3(aR - 0.1, B.b + 0.25, zF + 1.2),
      W3(aR - 0.1, B.b + 0.25, zF + 1.75),
      W3(aR - 0.1, B.b - 0.25, zF + 1.75),
      L(226, 224, 214)
    ); // the calendar of 2019
    // (feat/grenzland-kino) the room reads as a room: panelled walls inside, a dark ceiling, a lamp that glows at night – so that,
    // seen through the open door, the framed map hangs on the back wall inside and not on the outside of the container
    {
      const PAN = L(126, 96, 64),
        CEIL = L(52, 48, 44),
        d0 = Y.tuer.a - Y.tuer.la,
        d1 = Y.tuer.a + Y.tuer.la,
        i0 = aL + 0.086,
        i1 = aR - 0.086,
        ih = top - zF - 0.05;
      box(k, B.a, bf - 0.084, (i1 - i0) / 2, 0.002, zF + 0.02, ih, PAN);
      box(k, i0 + 0.002, B.b, 0.002, B.w / 2 - 0.086, zF + 0.02, ih, PAN);
      box(k, i1 - 0.002, B.b, 0.002, B.w / 2 - 0.086, zF + 0.02, ih, PAN);
      box(k, (i0 + d0) / 2, bb + 0.084, (d0 - i0) / 2, 0.002, zF + 0.02, ih, PAN);
      box(k, (d1 + i1) / 2, bb + 0.084, (i1 - d1) / 2, 0.002, zF + 0.02, ih, PAN);
      box(k, Y.tuer.a, bb + 0.084, Y.tuer.la, 0.002, zF + 2.05, top - zF - 2.1, PAN);
      box(k, B.a, B.b, (i1 - i0) / 2, B.w / 2 - 0.086, top - 0.035, 0.01, CEIL);
      const q = Y.w(B.a - 0.4, B.b);
      kl.box(q[0], q[1], top - 0.08, 0.16, 0.9, 0.04, rot, [1, 1, 1], true);
    }
    // pallets and crates beside the lorry
    for (const [a, b, n] of [
      [H.lkw.a + 0.5, H.lkw.b + 3.4, 3],
      [H.lkw.a - 1.2, H.lkw.b + 3.3, 2],
      [H.lkw.a + 2.0, H.lkw.b + 3.6, 1],
    ]) {
      const z = Z(a, b);
      box(k, a, b, 0.6, 0.4, z, 0.14, L(150, 122, 84));
      for (let i = 0; i < n; i++)
        box(k, a, b, 0.45, 0.32, z + 0.14 + i * 0.46, 0.44, i % 2 ? L(104, 84, 56) : L(122, 98, 64), true);
    }
    // the floodlight's mast and the camera's pole
    {
      const m = H.mast,
        p = Y.w(m.a, m.b),
        z = gz(p[0], p[1]);
      k.cyl(p[0], p[1], z, z + m.h, 0.09, 0.06, 8, L(96, 100, 102), true);
      box(k, m.a - 0.25, m.b - 0.2, 0.32, 0.2, z + m.h - 0.1, 0.16, L(60, 62, 64), true);
      const q = Y.w(m.a - 0.25, m.b - 0.2);
      kl.box(q[0], q[1], z + m.h - 0.13, 0.34, 0.56, 0.03, rot, [1, 1, 1], true);
      const c = H.kamera,
        cp = Y.w(c.a, c.b),
        cz = gz(cp[0], cp[1]);
      k.cyl(cp[0], cp[1], cz, cz + c.h, 0.045, 0.04, 6, L(96, 100, 102), true);
      box(k, c.a, c.b + 0.16, 0.06, 0.16, cz + c.h - 0.06, 0.12, L(228, 228, 224), true);
      box(k, c.a, c.b + 0.33, 0.035, 0.012, cz + c.h - 0.035, 0.07, L(20, 20, 24), true);
    }
    const grp = new THREE.Group();
    grp.name = 'grenzland lager';
    const mesh = own(new THREE.Mesh(k.geo(), VFIG.mat()));
    S.lamp = VAUTO.LM.head.clone();
    S.lamp.emissive.setHex(0xffe2b0);
    S.lamp.emissiveIntensity = 0;
    const glow = own(new THREE.Mesh(kl.geo(), S.lamp));
    grp.add(mesh, glow);
    // the door leaf: hinged at its left jamb (seen from the yard), opens into the room
    {
      const kd = VPROPS.kit(),
        w = 2 * Y.tuer.la - 0.04;
      kd.box(w / 2, 0, 0, w, 0.05, 2.03, 0, L(88, 106, 128), true);
      kd.box(w - 0.12, -0.05, 0.98, 0.1, 0.05, 0.03, 0, L(170, 172, 170), true);
      const leaf = own(new THREE.Mesh(kd.geo(), VFIG.mat())),
        piv = new THREE.Group(),
        h = Y.w(Y.tuer.a - Y.tuer.la + 0.02, bb);
      piv.position.copy(V(h[0], h[1], zF + 0.02));
      // the leaf's own x runs along the yard's a axis
      piv.rotation.y = Math.PI / 2 - (Y.az * Math.PI) / 180;
      piv.add(leaf);
      grp.add(piv);
      S.leaf = piv;
      S.leaf0 = piv.rotation.y;
    }
    // the framed half of the map on the wall opposite the door
    {
      const kf = VPROPS.kit(),
        a = B.tuer + 0.2,
        z = zF + 1.25;
      box(kf, a, bf - 0.1, 0.36, 0.015, z, 0.56, L(70, 48, 30), true);
      band(
        kf,
        W3(a - 0.29, bf - 0.118, z + 0.06),
        W3(a + 0.29, bf - 0.118, z + 0.06),
        W3(a + 0.29, bf - 0.118, z + 0.5),
        W3(a - 0.29, bf - 0.118, z + 0.5),
        L(206, 190, 150)
      );
      band(
        kf,
        W3(a - 0.2, bf - 0.12, z + 0.2),
        W3(a + 0.12, bf - 0.12, z + 0.3),
        W3(a + 0.12, bf - 0.12, z + 0.32),
        W3(a - 0.2, bf - 0.12, z + 0.22),
        L(120, 60, 40)
      );
      S.rahmen = own(new THREE.Mesh(kf.geo(), VFIG.mat()));
      grp.add(S.rahmen);
    }
    scene.add(grp);
    S.grp = grp;
    S.zF = zF;
  }
  // ---- solid boxes for the walker and the vehicles ----
  function boxenAn(Y) {
    const r = (Y.az * Math.PI) / 180,
      ax = [Math.sin(r), Math.cos(r)],
      ay = [Math.cos(r) * Y.side, -Math.sin(r) * Y.side];
    const add = (a, b, la, lb, h, flag) => {
      const c = Y.w(a, b),
        z = gz(c[0], c[1]),
        B = { c, ax, ay, ex: la, ey: lb, z0: z - 1, z1: z + h },
        e = { box: () => (S.on && !S.weg && (!flag || !S.offen) ? B : null), grenzland: 'lager' };
      VEH.extra.push(e);
      S.boxes.push(e);
      return e;
    };
    for (const q of Y.boxen) add(q.a, q.b, q.la, q.lb, q.h);
    S.tuerBox = add(Y.tuer.a, Y.tuer.b, Y.tuer.la, Y.tuer.lb, Y.tuer.h, true);
    for (const [s, e] of Y.zaun) {
      const la = Math.abs(e[0] - s[0]) / 2,
        lb = Math.abs(e[1] - s[1]) / 2;
      add((s[0] + e[0]) / 2, (s[1] + e[1]) / 2, Math.max(0.06, la), Math.max(0.06, lb), Y.H.h);
    }
    add((Y.H.tor[0] + Y.H.tor[1]) / 2, Y.H.b1, (Y.H.tor[1] - Y.H.tor[0]) / 2, 0.06, Y.H.h);
  }
  // ---- on ----
  function build() {
    if (S.on) return true;
    try {
      const O = GLDATA.ORTE.lager,
        m = messen(O);
      S.Y = GLMDATA.lager(m.pos, O.az || 0, m.side);
      bauen(S.Y);
      boxenAn(S.Y);
      // the haulier's van (the one of the night at the Klinge; a tree without the van type takes the flatbed)
      try {
        const typ = GLAUTO.TYP.kasten ? 'kasten' : 'lkw89';
        S.lkw = GLAUTO.spawn(typ, { col: '#d9d9d2', plane: '#4a5046' });
        if (S.lkw) GLAUTO.park(S.lkw, S.Y.lkw.pos[0], S.Y.lkw.pos[1], S.Y.lkw.hd);
      } catch (e) {
        S.lkw = null;
      }
      S.on = true;
      S.weg = false;
      S.offen = false;
      S.karte = true;
      S.dark = null;
      // the camera at the gate sees what happens in front of it (a witness that knows nobody)
      S.prevZeuge = GLFAHNDUNG.hooks.zeuge;
      GLFAHNDUNG.hooks.zeuge = zeuge;
      markDirty(true);
    } catch (e) {
      S.err = String((e && e.message) || e);
      console.warn('grenzland lager', e);
      drop();
      return false;
    }
    return true;
  }
  function zeuge() {
    const out = [];
    try {
      const p = S.prevZeuge ? S.prevZeuge() : null;
      if (p) out.push(...p);
    } catch (e) {}
    if (S.on && !S.weg && S.Y) {
      const k = S.Y.kamera;
      out.push({ x: k[0], y: k[1], hd: k.hd, r: 26, name: T.kamera, knows: false });
    }
    return out;
  }
  const free = o => {
    o.traverse(m => {
      if (m.geometry) m.geometry.dispose();
    });
  };
  function wachenWeg() {
    for (const w of S.wachen) if (w.F) GLFIG.drop(w.F);
    S.wachen.length = 0;
  }
  function drop() {
    wachenWeg();
    if (S.grp) {
      scene.remove(S.grp);
      free(S.grp);
      S.grp = null;
    }
    if (S.lamp) {
      S.lamp.dispose();
      S.lamp = null;
    }
    for (const e of S.boxes) {
      const i = VEH.extra.indexOf(e);
      if (i >= 0) VEH.extra.splice(i, 1);
    }
    S.boxes.length = 0;
    if (S.lkw) {
      try {
        GLAUTO.remove(S.lkw);
      } catch (e) {}
      S.lkw = null;
    }
    if (GLFAHNDUNG.hooks.zeuge === zeuge) GLFAHNDUNG.hooks.zeuge = S.prevZeuge || null;
    S.prevZeuge = undefined;
    S.on = false;
    S.near = S.drin = false;
    S.leaf = S.rahmen = null;
    markDirty(true);
  }
  // ---- the door, the map ----
  function tuerAuf() {
    if (!S.on || S.offen) return;
    S.offen = true;
    if (S.leaf) S.leaf.rotation.y = S.leaf0 - 1.75 * S.Y.side;
    markDirty(true);
  }
  function karteWeg() {
    S.karte = false;
    if (S.rahmen) S.rahmen.visible = false;
    markDirty(true);
  }
  // door shut, map back, the guards calm on their rounds (a mission's checkpoint)
  function reset() {
    if (!S.on) return;
    S.offen = false;
    S.karte = true;
    if (S.leaf) S.leaf.rotation.y = S.leaf0;
    if (S.rahmen) S.rahmen.visible = true;
    for (const w of S.wachen) {
      w.W = GLMLOGIK.wache();
      heim(w, true);
    }
    markDirty(true);
  }
  // ---- the guards ----
  async function wachenHer() {
    if (S.loading || S.wachen.length || !S.on) return;
    S.loading = true;
    const Y = S.Y;
    for (const [i, id] of ['wache1', 'wache2'].entries()) {
      let F = null;
      try {
        F = await GLFIG.make(id, {});
      } catch (e) {}
      if (!F) continue;
      if (!S.on || !GL.on || !S.near) {
        GLFIG.drop(F);
        continue;
      }
      F.sees = false; // (no witnesses for the police: they call it in themselves)
      F.lager = true;
      const w = { F, W: GLMLOGIK.wache(), job: i ? 'posten' : 'runde', t: 0, i: 0, n: i };
      const p = i ? Y.posten[0] : Y.runde[0];
      GLFIG.place(F, p[0], p[1], Y.kamera.hd);
      S.wachen.push(w);
      heim(w, true);
    }
    S.loading = false;
  }
  // back to the job: the round along the fence, or the post at the gate
  function heim(w, now) {
    const Y = S.Y,
      F = w.F;
    if (!F || F.gone) return;
    w.t = 0;
    if (w.n === 0) {
      w.job = 'runde';
      if (now) GLFIG.place(F, Y.runde[0][0], Y.runde[0][1], 0);
      // from the corner nearest to where he stands, round and round
      let k = 0,
        bd = 1e9;
      Y.runde.forEach((p, j) => {
        const d = hyp(p[0] - F.x, p[1] - F.y);
        if (d < bd) {
          bd = d;
          k = j;
        }
      });
      w.i = k;
      runde(w);
    } else {
      w.job = 'posten';
      if (now) GLFIG.place(F, Y.posten[0][0], Y.posten[0][1], Y.kamera.hd);
      else GLFIG.go(F, Y.posten[0], 1.3, f => (f.hd = Y.kamera.hd));
      w.i = 0;
      w.t = 6;
    }
  }
  function runde(w) {
    const Y = S.Y;
    w.i = (w.i + 1) % Y.runde.length;
    GLFIG.go(w.F, Y.runde[w.i], 1.15, () => {
      if (w.job === 'runde' && S.on) runde(w);
    });
  }
  // both run to a place and stay there (the battery at the gate)
  function lenke(x, y, sec = 40) {
    for (const [i, w] of S.wachen.entries()) {
      if (w.job === 'jagt') continue;
      const p = S.Y.hinein(x + (i ? 1.4 : -1.4), y, 1.2);
      w.job = 'gelenkt';
      w.t = sec;
      w.W = GLMLOGIK.wache();
      GLFIG.go(w.F, p, 2.3, f => GLFIG.face(f, x, y));
    }
  }
  // a noise: whoever hears it and is on his job goes to look
  function laerm(x, y, r = 28) {
    let n = 0;
    for (const w of S.wachen) {
      if ((w.job !== 'runde' && w.job !== 'posten') || hyp(w.F.x - x, w.F.y - y) > r) continue;
      w.job = 'schaut';
      w.t = 14;
      const p = S.Y.hinein(x, y, 1);
      GLFIG.go(w.F, S.Y.raus(p[0], p[1], 0.6, !S.offen), 1.7);
      n++;
    }
    return n;
  }
  function seen(w, p) {
    const F = w.F,
      Y = S.Y,
      lit = hyp(p.x - Y.licht[0], p.y - Y.licht[1]) < 13;
    return (
      GLLOGIK.sieht({ x: F.x, y: F.y, hd: F.hd, r: 30 }, p.x, p.y, {
        dark: dark() && !lit,
        sneak: sneak(),
      }) && Y.sicht(F.x, F.y, p.x, p.y, !S.offen)
    );
  }
  function wachenTick(dt) {
    const Y = S.Y,
      p = GLFAHNDUNG.wo(),
      inYard = Y.innen(p.x, p.y, 0.15);
    for (const w of S.wachen) {
      const F = w.F;
      if (!F || F.gone) continue;
      // nobody walks through a container
      const q = Y.raus(F.x, F.y, 0.34, !S.offen);
      if (hyp(q[0] - F.x, q[1] - F.y) > 0.01) {
        F.x = q[0];
        F.y = q[1];
      }
      if (F.downT > 0) continue;
      const d = hyp(F.x - p.x, F.y - p.y),
        sees = inYard && !p.veh && seen(w, p),
        ev = GLMLOGIK.wachsam(w.W, dt, { sees, d });
      if (ev === 'alarm') {
        w.job = 'jagt';
        w.aimT = 9;
        GLHUD.sub(F.name, GLMDATA.R.wacheSieht[0][1], 2400);
        GLTON.fx('funk', d, 60);
        GL.emit('lager', { was: 'alarm', wer: F.id });
      } else if (ev === 'weg') {
        heim(w, false);
        GL.emit('lager', { was: 'weg', wer: F.id });
      }
      if (w.job === 'jagt') {
        if ((w.aimT += dt) > 0.5) {
          w.aimT = 0;
          const t = Y.hinein(p.x, p.y, 0.6);
          GLFIG.go(F, Y.raus(t[0], t[1], 0.36, !S.offen), 2.25);
        }
        if (inYard && d < 1.35 && !p.veh) {
          gefasst(w);
          return;
        }
      } else if (w.job === 'posten') {
        // at the gate: looks out, walks to the other end of his post now and then
        if (F.st !== 'geht' && (w.t -= dt) <= 0) {
          w.i = 1 - w.i;
          w.t = 7 + ((w.i * 5 + F.x) % 4);
          GLFIG.go(F, Y.posten[w.i], 1.0, f => (f.hd = Y.kamera.hd));
        }
      } else if (w.job === 'gelenkt' || w.job === 'schaut') {
        if ((w.t -= dt) <= 0) heim(w, false);
      } else if (w.job === 'runde' && F.st !== 'geht') runde(w);
    }
  }
  function gefasst(w) {
    GL.emit('lager', { was: 'gefasst', wer: w.F.id });
    let done = false;
    try {
      done = !!(S.hooks.gefasst && S.hooks.gefasst(w));
    } catch (e) {}
    for (const q of S.wachen) q.W = GLMLOGIK.wache();
    if (done) return;
    // nobody's mission: he puts one out at the gate, and reports it
    const o = S.Y.vorTor;
    try {
      if (window.GRENZLAND) window.GRENZLAND.hin(o[0], o[1], (S.Y.kamera.hd * 180) / Math.PI);
    } catch (e) {}
    GLHUD.say(T.wacheHat, 'Er setzt dich vor das Tor. Die Anzeige kommt mit der Post.', 5);
    GLFAHNDUNG.tat('hausfrieden', { force: [{ name: T.wachmann, knows: false }], quiet: true });
    for (const q of S.wachen) heim(q, false);
  }
  // ---- per frame ----
  let acc = 0;
  function tick(dt) {
    if (!S.on) return;
    // 1989: the field is a field
    const weg = GL.era !== 'heute';
    if (weg !== S.weg) {
      S.weg = weg;
      S.grp.visible = !weg;
      if (S.lkw) S.lkw.g.visible = !weg;
      if (weg) wachenWeg();
      markDirty(true);
    }
    if (weg) return;
    const dk = dark();
    if (dk !== S.dark) {
      S.dark = dk;
      S.lamp.emissiveIntensity = dk ? 2.6 : 0;
      markDirty();
    }
    if ((acc += dt) > 0.5) {
      acc = 0;
      const p = GLFAHNDUNG.wo(),
        d = hyp(p.x - S.Y.pos[0], p.y - S.Y.pos[1]);
      S.near = d < (S.near ? 340 : 260);
      if (S.near && !S.wachen.length) wachenHer();
      else if (!S.near && S.wachen.length) wachenWeg();
      const drin = S.Y.innen(p.x, p.y);
      if (drin !== S.drin) {
        S.drin = drin;
        GL.emit('lager', { was: drin ? 'drin' : 'raus' });
      }
    }
    if (S.wachen.length) wachenTick(dt);
    // (feat/grenzland-kino) at night the guards carry torches (agent licht draws them for every figure with F.lampe)
    for (const w of S.wachen) if (w.F && w.F.lampe !== S.dark) w.F.lampe = !!S.dark;
  }
  // the floodlight: one borrowed light over the yard while it is dark and one is near
  KERN.lights.borrow({
    id: 'grenzland:lager',
    n: 1,
    prio: 2,
    want: () => S.on && !S.weg && S.dark === true && hyp(P.x - S.Y.pos[0], P.y - S.Y.pos[1]) < 130,
    on: ls => {
      const l = ls[0],
        p = S.Y.licht;
      l.color.setHex(0xfff0d0);
      l.distance = 34;
      l.decay = 1.3;
      l.position.copy(V(p[0], p[1], gz(p[0], p[1]) + S.Y.H.licht.h));
      l.intensity = 70;
    },
  });
  const status = () => ({
    on: S.on,
    err: S.err,
    side: S.Y ? S.Y.side : 0,
    pos: S.Y ? S.Y.pos.map(v => Math.round(v * 10) / 10) : null,
    offen: S.offen,
    karte: S.karte,
    drin: S.drin,
    near: S.near,
    boxes: S.boxes.length,
    wachen: S.wachen.map(w => ({
      id: w.F.id,
      job: w.job,
      x: Math.round(w.F.x * 10) / 10,
      y: Math.round(w.F.y * 10) / 10,
      see: Math.round(w.W.see * 100) / 100,
      st: w.W.st,
    })),
  });
  return Object.assign(S, { build, drop, tick, reset, tuerAuf, karteWeg, lenke, laerm, status, heim });
})();
window.GLLAGER = GLLAGER;
