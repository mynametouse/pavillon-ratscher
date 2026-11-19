// ===================== Meiningen and the Werra valley on the way: tiles, houses, street names (MEININGEN) =====================
// Falko 19.11. 18:52: „Meiningen … und den Weg nach Meiningen, sodass dort keine flache Karte erscheint, sondern echte Gebäude“ (Karten-Chat).
// Two zones of core/kern.js (KERN.zone) like Trusetal, each with its own tile set (tools/welt/build.py --plan MG / MR: ground DGM1 Thüringen
// 1 m, the 2024 aerial image of GDI-Th, the OSM roads cut in):
//   - Meiningen (welt-test/zonen/meiningen/): the town from Obermaßfeld to the Dampflokwerk, the finest level round the Markt, the
//     Stadtkirche, the Schloss Elisabethenburg, the theatre and the station;
//   - the Werra valley (welt-test/zonen/werratal/): the B 89 from Kloster Veßra's block by Henfstädt, Leutersdorf, Vachdorf, Belrieth and
//     Einhausen to Meiningen.
// The houses are the ETHOS.BUILDA buildings of the state's LoD2 in the cells of gebaeude/gebaeude.js (tools/welt-gebaeude/orte.py), the
// trees those of weltwald/; the named streets and places from OSM (tools/welt/zone_trusetal.py --zone MG / MR → <name>/ort.json) give
// the street on the HUD and in the map's place display. Reach it through the map (search „Meiningen“ → Hinfliegen), the jetpack's list
// or ?szenario=meiningen.
import * as THREE from 'three';
import { BASE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { go } from '../game/player.js';
import { WELT } from './welt.js';
import { kit, ccw, pairs, mats } from './bau.js';
export const MEININGEN = (() => {
  const S = { on: false, state: 'idle', ways: [], rev: 0, zones: {} };
  if (!WELT.on) return S;
  S.on = true;
  // model metres: the Markt by the Stadtkirche (UTM 600240/5602800) and the middle of the Werra valley's block (608700/5598000)
  const Z = [
    { id: 'meiningen', name: 'meiningen', sub: 'zonen/meiningen/', c: [-24230, 8931], near: 3000, far: 3800 },
    { id: 'werratal', name: 'werratal', sub: 'zonen/werratal/', c: [-16284, 3586], near: 6500, far: 7500 },
  ];
  const START = [-24240, 8787];
  const yawTo = (x, y, tx, ty) => (Math.atan2(tx - x, ty - y) * 180) / Math.PI;
  KERN.spot('meiningen', {
    mode: 'walk',
    pos: START,
    z: 0,
    yaw: yawTo(...START, -24242, 8809),
    pitch: 12,
    label: 'Meiningen, Markt',
  });
  KERN.scenario('meiningen', { label: 'Meiningen, Markt', order: 35, run: () => go('meiningen') });
  // the streets of the zones whose data is loaded, for karte/karte.js ({ name, ref, kind, n, p: [x, y, z, …] })
  function setWays() {
    S.ways = [];
    for (const z of Z)
      if (z.data)
        for (const s of z.data.streets) {
          const n = s.p.length / 2,
            p = new Array(n * 3).fill(0);
          for (let i = 0; i < n; i++) [p[i * 3], p[i * 3 + 1]] = [s.p[i * 2], s.p[i * 2 + 1]];
          S.ways.push({ name: s.name, ref: s.ref, kind: s.kind, n, p });
        }
    S.rev++;
  }
  for (const z of Z) {
    WELT.addSet(z.sub);
    S.zones[z.id] = z;
    KERN.zone({
      id: z.id,
      x: z.c[0],
      y: z.c[1],
      near: z.near,
      far: z.far,
      build: async () => {
        WELT.need(z.id, true, z.sub);
        if (!z.data) {
          try {
            const r = await fetch(BASE + z.name + '/ort.json');
            if (r.ok) {
              z.data = await r.json();
              setWays();
            }
          } catch (e) {
            z.err = String(e);
          }
        }
        if (z.id === 'meiningen') {
          await KERN.until(() => WELT.heightAt(START[0], START[1]) !== undefined, 900);
          const h = WELT.heightAt(START[0], START[1]);
          if (h !== undefined) KERN.spot('meiningen', { z: h });
          if (z.data && z.data.church && !S.group)
            try {
              await landmarks(z.data);
            } catch (e) {
              z.err = String(e);
              console.warn('MEININGEN', e);
            }
        }
        z.state = 'ready';
        S.state = Z.some(q => q.state === 'ready') ? 'ready' : 'idle';
      },
      drop: () => {
        WELT.need(z.id, false);
        if (z.id === 'meiningen' && S.group) {
          scene.remove(S.group);
          S.group.traverse(o => o.geometry && o.geometry.dispose());
          S.group = null;
          S.segs = [];
          markDirty(true);
        }
        z.state = 'idle';
        S.state = Z.some(q => q.state === 'ready') ? 'ready' : 'idle';
      },
    });
  }
  // the HUD: the nearest named street within 20 m (or the B 89 by its number)
  let pc = [1e9, 0, null];
  KERN.provide(
    'place',
    (x, y) => {
      if (!S.ways.length || !Z.some(z => z.data && Math.hypot(x - z.c[0], y - z.c[1]) < z.far)) return undefined;
      if (Math.abs(x - pc[0]) < 1 && Math.abs(y - pc[1]) < 1) return pc[2] || undefined;
      let best = 20,
        nm = null;
      for (const w of S.ways) {
        const label = w.name || w.ref;
        if (!label) continue;
        for (let i = 0; i + 1 < w.n; i++) {
          const ax = w.p[i * 3],
            ay = w.p[i * 3 + 1];
          if (Math.abs(x - ax) > 300 || Math.abs(y - ay) > 300) continue;
          const ex = w.p[i * 3 + 3] - ax,
            ey = w.p[i * 3 + 4] - ay,
            t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1))),
            d = Math.hypot(x - ax - ex * t, y - ay - ey * t);
          if (d < best) [best, nm] = [d, label];
        }
      }
      pc = [x, y, nm];
      return nm || undefined;
    },
    14
  );
  // ---------------- the known places of Meiningen (welt/bau.js; ground from the finest tiles, WELT.sampler) ----------------
  async function landmarks(D) {
    const K = kit(),
      { face, box, lathe, walls } = K,
      segs = [],
      ext = (pts, m) => {
        const q = pairs(pts);
        return [
          Math.min(...q.map(p => p[0])) - m,
          Math.min(...q.map(p => p[1])) - m,
          Math.max(...q.map(p => p[0])) + m,
          Math.max(...q.map(p => p[1])) + m,
        ];
      },
      ground = async r => {
        const f = await WELT.sampler(...r);
        return (x, y) => {
          const v = f(x, y);
          return v === undefined ? WELT.heightAt(x, y) || 0 : v;
        };
      },
      edgesOf = f => f.map((a, i) => [a, f[(i + 1) % f.length]]);
    S.landmarks = {};
    // ---- the Stadtkirche ----
    {
      const c = D.church,
        Z = await ground(ext(c.f, 10)),
        f = ccw(pairs(c.f)),
        zs = f.map(p => Z(p[0], p[1])),
        z0 = Math.min(...zs) - 0.6,
        zg = Math.max(...zs),
        E = zg + 17,
        ax = c.ax,
        ang = Math.atan2(ax[1], ax[0]),
        cx = f.reduce((s, p) => s + p[0], 0) / f.length,
        cy = f.reduce((s, p) => s + p[1], 0) / f.length,
        U = p => (p[0] - cx) * ax[0] + (p[1] - cy) * ax[1],
        Vv = p => -(p[0] - cx) * ax[1] + (p[1] - cy) * ax[0],
        W = (u, v, z) => [cx + ax[0] * u - ax[1] * v, cy + ax[1] * u + ax[0] * v, z],
        u0 = Math.min(...f.map(U)),
        roof = ccw(pairs(c.roof)),
        ru = roof.map(U),
        rv = roof.map(Vv),
        uT = Math.min(...ru),
        u1 = Math.max(...ru),
        half = (Math.max(...rv) - Math.min(...rv)) / 2,
        vm = (Math.max(...rv) + Math.min(...rv)) / 2,
        RH = half * 1.3;
      walls('sandstone', f, z0, E);
      segs.push(...edgesOf(f).map(([a, b]) => [a[0], a[1], b[0], b[1]]));
      // tall pointed windows on the hall and the choir (not on the tower block)
      for (const [a, b] of edgesOf(f)) {
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]),
          mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (l < 4 || U(mid) < u0 + 9.5) continue;
        const d = [(b[0] - a[0]) / l, (b[1] - a[1]) / l],
          n = [d[1], -d[0]],
          cnt = Math.max(1, Math.floor(l / 5.2)),
          P = (t, z) => [a[0] + d[0] * t + n[0] * 0.04, a[1] + d[1] * t + n[1] * 0.04, z];
        for (let q = 0; q < cnt; q++) {
          const s0 = (l * (q + 0.5)) / cnt,
            hw = l < 8 ? 0.9 : 1.15,
            zb = zg + 3.5,
            zr = zg + 11.5;
          face('glass', [P(s0 - hw, zb), P(s0 + hw, zb), P(s0 + hw, zr), P(s0, zr + hw * 1.6), P(s0 - hw, zr)]);
        }
      }
      // the steep roof: a gable against the towers, a hip over the choir
      const rf = roof,
        onR = p => W(Math.max(uT, Math.min(u1 - half, U(p))), vm, E + RH);
      for (let i = 0; i < rf.length; i++) {
        const a = [rf[i][0], rf[i][1], E],
          b = [rf[(i + 1) % rf.length][0], rf[(i + 1) % rf.length][1], E],
          pa = onR(a),
          pb = onR(b),
          k = Math.abs(U(a) - uT) < 0.3 && Math.abs(U(b) - uT) < 0.3 ? 'sandstone' : 'slate';
        face(k, Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 0.05 ? [a, b, pb] : [a, b, pb, pa]);
      }
      // the twin towers: square to 30 m with belfry openings, an octagon with its gallery, the copper spires with the cross
      const tw = c.tw;
      for (const [tx, ty] of c.towers) {
        box('sandstone', tx, ty, z0, tw, tw, zg + 30 - z0, ang);
        box('sandstone', tx, ty, zg + 30, tw + 0.6, tw + 0.6, 0.6, ang);
        for (let q = 0; q < 4; q++) {
          const t = ang + (q * Math.PI) / 2,
            n = [Math.cos(t), Math.sin(t)],
            d = [-n[1], n[0]],
            r = tw / 2 + 0.03,
            P = (s0, z) => [tx + n[0] * r + d[0] * s0, ty + n[1] * r + d[1] * s0, z];
          face('dark', [P(-0.8, zg + 23), P(0.8, zg + 23), P(0.8, zg + 27.2), P(0, zg + 28.4), P(-0.8, zg + 27.2)]);
        }
        const ro = tw * 0.42;
        lathe(
          'sandstone',
          tx,
          ty,
          [
            [ro, zg + 30.6],
            [ro, zg + 38.5],
          ],
          8,
          ang + Math.PI / 8,
          false
        );
        for (let q = 0; q < 8; q++) {
          const t = ang + (q * Math.PI) / 4 + Math.PI / 4,
            n = [Math.cos(t), Math.sin(t)],
            d = [-n[1], n[0]],
            r = ro * Math.cos(Math.PI / 8) + 0.03,
            P = (s0, z) => [tx + n[0] * r + d[0] * s0, ty + n[1] * r + d[1] * s0, z];
          face('dark', [P(-0.45, zg + 33), P(0.45, zg + 33), P(0.45, zg + 36.2), P(0, zg + 37), P(-0.45, zg + 36.2)]);
        }
        lathe(
          'copper',
          tx,
          ty,
          [
            [ro + 0.15, zg + 38.5],
            [ro * 0.82, zg + 40],
            [0, zg + 56],
          ],
          8,
          ang + Math.PI / 8,
          false
        );
        lathe(
          'gold',
          tx,
          ty,
          [
            [0.04, zg + 55.5],
            [0.04, zg + 58],
          ],
          6
        );
        box('gold', tx, ty, zg + 57, 0.8, 0.07, 0.07, ang + Math.PI / 2);
      }
      // the bay between the towers: the west gable with the rose window and the portal
      const [bx, by] = c.bay,
        bw = 4.8,
        bd = 8.6,
        bc = [bx + ax[0] * (bd / 2), by + ax[1] * (bd / 2)];
      box('sandstone', bc[0], bc[1], z0, bd, bw, zg + 22 - z0, ang);
      {
        const n = [-ax[0], -ax[1]],
          d = [-n[1], n[0]],
          P = (s0, z, o = 0.05) => [bx + n[0] * o + d[0] * s0, by + n[1] * o + d[1] * s0, z],
          rose = [],
          ring = [];
        face('sandstone', [P(-bw / 2, zg + 22, 0), P(bw / 2, zg + 22, 0), P(0, zg + 27, 0)]);
        for (let k = 0; k < 18; k++) {
          const t = (k / 18) * Math.PI * 2;
          rose.push(P(Math.cos(t) * 1.75, zg + 15 + Math.sin(t) * 1.75));
        }
        face('glass', rose);
        for (let k = 0; k < 18; k++) {
          const t0 = (k / 18) * Math.PI * 2,
            t1 = ((k + 1) / 18) * Math.PI * 2,
            A = (t, r) => P(Math.cos(t) * r, zg + 15 + Math.sin(t) * r, 0.1);
          ring.push([A(t0, 1.75), A(t0, 2.1), A(t1, 2.1), A(t1, 1.75)]); // facing out of the wall
        }
        ring.forEach(q => face('sandstone', q));
        face('dark', [P(-1.1, zg), P(1.1, zg), P(1.1, zg + 3.6), P(0, zg + 5.2), P(-1.1, zg + 3.6)]);
      }
      S.landmarks.church = { x: c.towers[0][0], y: c.towers[0][1], ground: zg, top: zg + 58, towers: c.towers.length };
    }
    // ---- the theatre: the body, the portico with six columns, the pediment, the steps ----
    {
      const t = D.theatre,
        Z = await ground(ext(t.body, 14)),
        body = ccw(pairs(t.body)),
        zs = body.map(p => Z(p[0], p[1])),
        z0 = Math.min(...zs) - 0.6,
        zg = Math.max(...zs),
        H = zg + 15.5;
      walls('lightstone', body, z0, H);
      segs.push(...edgesOf(body).map(([a, b]) => [a[0], a[1], b[0], b[1]]));
      const sh = new THREE.Shape(body.map(p => new THREE.Vector2(p[0], p[1]))),
        rg = new THREE.ShapeGeometry(sh);
      rg.rotateX(-Math.PI / 2);
      rg.translate(0, H, 0);
      const roofMesh = new THREE.Mesh(rg, mats().slate);
      roofMesh.castShadow = roofMesh.receiveShadow = true;
      S.extra.push(roofMesh);
      const [F0, F1] = t.front,
        L = Math.hypot(F1[0] - F0[0], F1[1] - F0[1]),
        d = [(F1[0] - F0[0]) / L, (F1[1] - F0[1]) / L],
        // outward: away from the body's middle
        bm = body.reduce((s, p) => [s[0] + p[0] / body.length, s[1] + p[1] / body.length], [0, 0]),
        n0 = [d[1], -d[0]],
        n = (bm[0] - F0[0]) * n0[0] + (bm[1] - F0[1]) * n0[1] > 0 ? [-n0[0], -n0[1]] : n0,
        dep = t.depth,
        P = (s0, o, z) => [F0[0] + d[0] * s0 + n[0] * o, F0[1] + d[1] * s0 + n[1] * o, z],
        zp = zg + 1.2,
        aw = Math.atan2(d[1], d[0]),
        mid = P(L / 2, -dep / 2, 0);
      box('lightstone', mid[0], mid[1], z0, L, dep, zp - z0, aw);
      for (let k = 1; k <= 6; k++) {
        const st = P(L / 2, k * 0.42, 0);
        box('lightstone', st[0], st[1], zp - k * 0.2 - 0.6, L - 2, 0.42, 0.6, aw);
      }
      for (let k = 0; k < 6; k++) {
        const s0 = 2.2 + ((L - 4.4) * k) / 5,
          p = P(s0, -1.3, 0);
        lathe(
          'lightstone',
          p[0],
          p[1],
          [
            [0.85, zp],
            [0.8, zp + 0.25],
            [0.66, zp + 0.55],
            [0.56, zp + 10.4],
            [0.62, zp + 10.6],
            [0.86, zp + 11.5],
          ],
          16
        );
        box('lightstone', p[0], p[1], zp + 11.5, 1.9, 1.9, 0.35, aw);
        segs.push(
          ...Array.from({ length: 6 }, (_, i) => {
            const a0 = (i / 6) * Math.PI * 2,
              a1 = ((i + 1) / 6) * Math.PI * 2;
            return [
              p[0] + 0.7 * Math.cos(a0),
              p[1] + 0.7 * Math.sin(a0),
              p[0] + 0.7 * Math.cos(a1),
              p[1] + 0.7 * Math.sin(a1),
            ];
          })
        );
      }
      const em = P(L / 2, -dep / 2, 0),
        zE = zp + 11.85,
        zT = zE + 1.9;
      box('lightstone', em[0], em[1], zE, L + 0.6, dep + 0.6, zT - zE, aw);
      // the pediment: front and back triangles, the two slopes
      const A = P(-0.3, 0.3, zT),
        B = P(L + 0.3, 0.3, zT),
        C = P(L / 2, 0.3, zT + 4.2),
        A2 = P(-0.3, -dep - 0.3, zT),
        B2 = P(L + 0.3, -dep - 0.3, zT),
        C2 = P(L / 2, -dep - 0.3, zT + 4.2);
      const tri = [A, B, C];
      // order the front triangle to face outward (n)
      const fr = (q => {
        const e1 = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]],
          e2 = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]],
          cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2]];
        return cr[0] * n[0] + cr[1] * n[1] > 0 ? q : q.slice().reverse();
      })(tri);
      face('lightstone', fr);
      face('lightstone', fr === tri ? [A2, C2, B2] : [A2, B2, C2]);
      for (const q of [
        [A, C, C2, A2],
        [C, B, B2, C2],
      ]) {
        const e1 = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]],
          e2 = [q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]],
          up = e1[0] * e2[1] - e1[1] * e2[0];
        face('slate', up > 0 ? q : q.slice().reverse());
      }
      // the doors behind the columns
      for (let k = 0; k < 3; k++) {
        const s0 = L / 2 + (k - 1) * 4.2,
          a = P(s0 - 0.9, -dep + 0.05, zp),
          b = P(s0 + 0.9, -dep + 0.05, zp),
          q = [a, b, [b[0], b[1], zp + 4.2], [a[0], a[1], zp + 4.2]];
        const e1 = [b[0] - a[0], b[1] - a[1]],
          cz = e1[0] * n[1] - e1[1] * n[0];
        face('dark', cz < 0 ? q : q.slice().reverse());
      }
      S.landmarks.theatre = { x: mid[0], y: mid[1], ground: zg, columns: 6, front: L };
    }
    const grp = new THREE.Group();
    grp.name = 'meiningen';
    for (const m of K.meshes(mats(), 'meiningen_')) grp.add(m);
    for (const m of S.extra) grp.add(m);
    scene.add(grp);
    S.group = grp;
    S.segs = segs;
    markDirty(true);
  }
  S.extra = [];
  S.segs = [];
  KERN.provide(
    'pushOut',
    (p, r) => {
      if (!S.group || !S.segs.length || Math.hypot(p[0] - Z[0].c[0], p[1] - Z[0].c[1]) > 1500) return undefined;
      let moved = false;
      for (const s of S.segs) {
        if (Math.abs(p[0] - s[0]) > 60 || Math.abs(p[1] - s[1]) > 60) continue;
        const ex = s[2] - s[0],
          ey = s[3] - s[1],
          t = Math.max(0, Math.min(1, ((p[0] - s[0]) * ex + (p[1] - s[1]) * ey) / (ex * ex + ey * ey || 1))),
          qx = s[0] + ex * t,
          qy = s[1] + ey * t,
          dd = Math.hypot(p[0] - qx, p[1] - qy);
        if (dd < r && dd > 1e-6) {
          p[0] = qx + ((p[0] - qx) / dd) * r;
          p[1] = qy + ((p[1] - qy) / dd) * r;
          moved = true;
        }
      }
      return moved;
    },
    10
  );
  S.status = () => ({
    state: S.state,
    ways: S.ways.length,
    zones: Z.map(z => ({ id: z.id, state: z.state || 'idle', err: z.err || '' })),
  });
  return S;
})();
window.MEININGEN = MEININGEN;
