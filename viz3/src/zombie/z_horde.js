// ===================== feat/zombie: the horde – who turns at the siren, how they roam, see, hear, hunt, strike and die (ZHORDE) =====================
// Each zombie is an entity in Z.ents (zombie/z_state.js) with its figure (zombie/z_fig.js). At the siren the villagers out of doors turn
// where they stand (they kneel, convulse and rise), more come out of the houses around the player, out of sight. They shamble about
// (wander), see the player at night within ~14 m (by day ~24 m; crouched half, in the flashlight's beam ~26 m), hear what is loud (the chainsaw, a shot, running, an engine, hammering –
// Z.noise), hunt him (chase: faster, arms up) along a flow field around the houses (a 1.5 m grid of the village: footprints, walls,
// fences – breadth-first from the player twice a second), strike when close (a wind-up, then the blow), bang on doors and barricades
// (zombie/z_haus.js asks them), eat the dead. Hits come from zombie/z_waffe.js (damage: knock-back, stagger, a limb off, death); vehicles
// knock them flying. At dawn they go back into the houses. Far ones are not drawn and move coarsely.
import * as THREE from 'three';
import { cam, COARSE, V, scene } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { COL } from '../core/geo.js';
import { collide, floorAt, P, phOk, CG, cellItems, toLocal, doorCols } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { WCOL } from '../world/worldcol.js';
import { VILLAGE } from '../world/village.js';
import { RATSCHER } from '../world/ratscher.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZFX } from './z_fx.js';
import { ZFIG } from './z_fig.js';
export const ZHORDE = (() => {
  const D = ZDATA.ZOMBIE;
  const S = {
    grid: null,
    fld: null,
    house: null,
    pick: null,
    hitAlly: null,
    hitRemote: null,
    netHit: null,
    netKill: null,
    spawnAt: null,
    guest: false,
    fieldT: 0,
    queue: [],
    busy: false,
    spawnT: 0,
    budget: 0,
    made: 0,
    nid: 1,
    hooks: [],
    flying: [], // helmets knocked off
    nk: ZDATA.night(1), // the night's numbers (each frame)
    lowK: 1, // how well the player is seen: his stance and pace (each frame)
    low: false, // he keeps low, the lamp off
  };
  const rnd = Math.random;
  const hyp = Math.hypot;
  // ---- the target: the player, or the vehicle he sits in ----
  function me() {
    const v = VEH && VEH.cur;
    if (v) return { x: v.st.x, y: v.st.y, z: v.st.z, car: v };
    return { x: P.x, y: P.y, z: P.feet, car: null };
  }
  // ---- the static grid of the village: 1.5 m cells, 1 = blocked (footprints, walls, garden colliders) ----
  const CS = 1.5;
  function buildGrid() {
    if (S.grid) return S.grid;
    const t0 = performance.now(),
      X0 = -360,
      Y0 = -520,
      NX = 620,
      NY = 620,
      g = new Uint8Array(NX * NY);
    const cell = (x, y) => {
      const i = Math.floor((x - X0) / CS),
        j = Math.floor((y - Y0) / CS);
      return i < 0 || j < 0 || i >= NX || j >= NY ? -1 : j * NX + i;
    };
    // the footprints (point in polygon at each cell centre in the building's box)
    for (const b of (VILLAGE && VILLAGE.bld) || []) {
      const F = b.fac;
      if (!F || !F.length || !b.bb) continue;
      for (let y = Math.floor((b.bb[1] - Y0) / CS); y <= Math.floor((b.bb[3] - Y0) / CS); y++)
        for (let x = Math.floor((b.bb[0] - X0) / CS); x <= Math.floor((b.bb[2] - X0) / CS); x++) {
          if (x < 0 || y < 0 || x >= NX || y >= NY) continue;
          const px = X0 + (x + 0.5) * CS,
            py = Y0 + (y + 0.5) * CS;
          let c = false;
          for (const f of F)
            if (f.ay > py !== f.by > py && px < ((f.bx - f.ax) * (py - f.ay)) / (f.by - f.ay) + f.ax) c = !c;
          if (c) g[y * NX + x] = 1;
        }
    }
    // the walls of the world (fences, the school yard, bridge rails …): their cells
    if (WCOL && WCOL.ready && RATSCHER && RATSCHER.box) {
      const B = RATSCHER.box;
      WCOL.each(
        Math.max(B[0], X0),
        Math.max(B[1], Y0),
        Math.min(B[2], X0 + NX * CS),
        Math.min(B[3], Y0 + NY * CS),
        (s, A) => {
          const ax = A[s * 4],
            ay = A[s * 4 + 1],
            bx = A[s * 4 + 2],
            by = A[s * 4 + 3],
            n = Math.ceil(hyp(bx - ax, by - ay) / (CS * 0.5)) + 1;
          for (let k = 0; k <= n; k++) {
            const c = cell(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
            if (c >= 0) g[c] = 1;
          }
        }
      );
    }
    // the garden's colliders at body height (sheds, fences, the pavilion's walls)
    for (const c of COL) {
      if (!c || c[9] || !phOk(c) || c[5] < 0.3 || c[4] > 1.6 || c[1] - c[0] > 30) continue;
      for (let y = c[2]; y <= c[3]; y += CS * 0.5)
        for (let x = c[0]; x <= c[1]; x += CS * 0.5) {
          const k = cell(x, y);
          if (k >= 0) g[k] = 1;
        }
    }
    S.grid = { g, X0, Y0, NX, NY, cell, ms: Math.round(performance.now() - t0) };
    return S.grid;
  }
  const blockedAt = (x, y) => {
    const G = S.grid;
    if (!G) return false;
    const c = G.cell(x, y);
    return c >= 0 && G.g[c] === 1;
  };
  // ---- the flow field: steps to the player from every free cell within ±75 m (breadth first, 8 neighbours) ----
  const FR = 50; // half size in cells
  function field() {
    const G = buildGrid(),
      t = me(),
      N = FR * 2 + 1,
      d = S.fld && S.fld.d.length === N * N ? S.fld.d : new Uint16Array(N * N),
      ci = Math.floor((t.x - G.X0) / CS),
      cj = Math.floor((t.y - G.Y0) / CS);
    d.fill(65535);
    const q = new Int32Array(N * N);
    let h = 0,
      e = 0;
    const seed = (i, j) => {
      const li = i - ci + FR,
        lj = j - cj + FR;
      if (li < 0 || lj < 0 || li >= N || lj >= N) return;
      const k = lj * N + li;
      if (d[k] !== 65535) return;
      d[k] = 0;
      q[e++] = k;
    };
    // the player's cell; if it is blocked (he is in a house), the free cells around it – or the openings ZHAUS names
    const extra = S.hooks.map(f => f(t)).find(Boolean);
    if (extra && extra.length)
      for (const [x, y] of extra) seed(Math.floor((x - G.X0) / CS), Math.floor((y - G.Y0) / CS));
    else {
      seed(ci, cj);
      if (G.g[cj * G.NX + ci] === 1)
        for (let r = 1; r < 4; r++)
          for (let a = -r; a <= r; a++)
            for (const [di, dj] of [
              [a, -r],
              [a, r],
              [-r, a],
              [r, a],
            ])
              if (G.g[(cj + dj) * G.NX + ci + di] !== 1) seed(ci + di, cj + dj);
    }
    while (h < e) {
      const k = q[h++],
        li = k % N,
        lj = (k - li) / N,
        dk = d[k] + 1;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = li + di,
            nj = lj + dj;
          if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
          const nk = nj * N + ni;
          if (d[nk] !== 65535) continue;
          const gi = ci - FR + ni,
            gj = cj - FR + nj;
          if (gi < 0 || gj < 0 || gi >= G.NX || gj >= G.NY || G.g[gj * G.NX + gi] === 1) continue;
          // no cutting across a blocked corner
          if (di && dj && (G.g[(gj - dj) * G.NX + gi] === 1 || G.g[gj * G.NX + gi - di] === 1)) continue;
          d[nk] = dk;
          q[e++] = nk;
        }
    }
    S.fld = { d, ci, cj, N };
  }
  // the direction (unit [dx, dy]) a zombie at (x, y) should go, or null (outside the field / no way)
  function flow(x, y) {
    const F = S.fld,
      G = S.grid;
    if (!F || !G) return null;
    const i = Math.floor((x - G.X0) / CS) - F.ci + FR,
      j = Math.floor((y - G.Y0) / CS) - F.cj + FR;
    if (i < 1 || j < 1 || i >= F.N - 1 || j >= F.N - 1) return null;
    const d0 = F.d[j * F.N + i];
    let best = d0,
      bx = 0,
      by = 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const v = F.d[(j + dj) * F.N + i + di];
        if (v < best) {
          best = v;
          bx = di;
          by = dj;
        }
      }
    if (best === 65535 || (!bx && !by)) return null;
    const L = hyp(bx, by);
    return [bx / L, by / L, d0];
  }
  // ---- line of sight between two points (the walls of the world in between?) ----
  function los(ax, ay, bx, by) {
    if (!WCOL || !WCOL.ready) return true;
    let free = true;
    const sx = bx - ax,
      sy = by - ay;
    WCOL.each(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), (s, A) => {
      if (!free) return;
      const cx = A[s * 4],
        cy = A[s * 4 + 1],
        dx = A[s * 4 + 2] - cx,
        dy = A[s * 4 + 3] - cy,
        den = sx * dy - sy * dx;
      if (Math.abs(den) < 1e-9) return;
      const t = ((cx - ax) * dy - (cy - ay) * dx) / den,
        u = ((cx - ax) * sy - (cy - ay) * sx) / den;
      if (t > 0.02 && t < 0.98 && u >= 0 && u <= 1) free = false;
    });
    return free;
  }
  // ---- something solid between two points at body height (the house's inner walls and big furniture, a closed door – COL) ----
  const inBox = (c, x, y, z0, z1) => {
    if (!c || c[5] < z0 || c[4] > z1) return false;
    const lp = c[9] ? toLocal(c, x, y) : [x, y];
    return lp[0] >= c[0] && lp[0] <= c[1] && lp[1] >= c[2] && lp[1] <= c[3];
  };
  function wallBetween(ax, ay, bx, by, feet) {
    const L = hyp(bx - ax, by - ay),
      n = Math.ceil(L / 0.12),
      z0 = feet + 0.5,
      z1 = feet + 1.5,
      doors = doorCols();
    for (let k = 1; k < n; k++) {
      const u = k / n;
      // (not the bodies' own room to stand in)
      if (u * L < 0.25 || (1 - u) * L < 0.25) continue;
      const x = ax + (bx - ax) * u,
        y = ay + (by - ay) * u;
      if (CG) for (const i of cellItems(CG, x, y)) if (phOk(COL[i]) && inBox(COL[i], x, y, z0, z1)) return true;
      for (const c of doors) if (inBox(c, x, y, z0, z1)) return true;
    }
    return false;
  }
  // ---- can a blow reach the target? (Falko 5.11., 17:57: „Zombies im Haus … bisher nicht sichtbar und machen dennoch Schaden – wenn
  // sie reinkommen, müssen Türen oder Fenster zuvor von ihnen aufgebrochen werden“): only one that is drawn, on the same floor, on the same
  // side of the house's walls (somebody in the house: only one that broke in), with nothing solid between – the walls of the village,
  // the house's inner walls, a closed door ----
  function canReach(e, t) {
    if (!e.F) return false;
    if (Math.abs((t.z ?? e.z) - e.z) > 1.2) return false;
    const H = S.house,
      bid = H && H.inside() ? H.bid() : null,
      tIn = !!bid && (t.ally || t.remote ? H.within(t.x, t.y, (t.z ?? e.z) + 0.5) : true),
      eIn = !!bid && e.house === bid;
    if (tIn !== eIn || (e.house && !eIn)) return false;
    if (!eIn && !los(e.x, e.y, t.x, t.y)) return false;
    return !wallBetween(e.x, e.y, t.x, t.y, e.z);
  }
  // ---- making zombies ----
  // e: { id, key, F, x, y, z, hd, hp, hp0, st, t, tx, ty, seen, cd, wind, stag, kv, crawl, sp, groanT, stuck }
  // ---- which kind a new one is (ZDATA.KINDS): the night's mix; Manfred, the chief of the fire brigade, always in his helmet ----
  function kindFor(key) {
    if (/^Manfred/.test((ZFIG.byKey[key] || {}).name || '')) return 'feuerwehr';
    const K = ZDATA.night(Math.max(1, Z.night), Z.diff).kinds,
      M =
        S.kindsMade && S.kindsMade.n === Z.night
          ? S.kindsMade
          : (S.kindsMade = { n: Z.night, feuerwehr: 0, schreier: 0 }),
      r = rnd();
    if (M.feuerwehr < K.feuerwehr && r < 0.14) {
      M.feuerwehr++;
      return 'feuerwehr';
    }
    if (M.schreier < K.schreier && r < 0.28) {
      M.schreier++;
      return 'schreier';
    }
    return rnd() < K.laeufer ? 'laeufer' : 'normal';
  }
  function ent(key, x, y, z, hd, o = {}) {
    const n = ZDATA.night(Math.max(1, Z.night), Z.diff),
      art = ZDATA.KINDS[o.art] ? o.art : kindFor(key),
      A = ZDATA.KINDS[art];
    const e = {
      kind: 'zombie',
      id: 'z' + S.nid++,
      key,
      name: (ZFIG.byKey[key] || {}).name || 'Jemand',
      F: null,
      x,
      y,
      z,
      hd,
      hp: n.hp * A.hp,
      hp0: n.hp * A.hp,
      art,
      helm: A.helm || 0, // the firefighter's helmet: what it still takes of the blows to the head
      run: A.speed / A.walk, // chasing: this much faster than the night's pace (runners)
      st: o.st || 'wander',
      t: 0,
      tx: x,
      ty: y,
      seen: null,
      cd: 0,
      wind: 0,
      stag: 0,
      kv: [0, 0],
      fly: null,
      crawl: false,
      sp: n.speed * A.walk * (0.85 + rnd() * 0.3),
      hit: n.hit * A.hit,
      groanT: 2 + rnd() * 8,
      stuck: { t: 0, x, y, side: 0, sideT: 0 },
      dead: false,
      deadT: 0,
      house: o.house || null,
    };
    Z.ents.push(e);
    S.made++;
    ZFIG.make(key)
      .then(F => {
        if (!Z.ents.includes(e)) return F.dispose();
        e.F = F;
        F.mode = e.st === 'turn' ? 'turn' : 'idle';
        ZFIG.place(F, e.x, e.y, e.z, e.hd);
        if (e.helm > 0) helmetOn(e);
        markDirty();
      })
      .catch(err => {
        console.warn('zombie figure', key, err);
        remove(e);
      });
    return e;
  }
  // ---- the firefighter's helmet: one shared model (a shell in day-glow yellow, a silver reflective band, the visor, the neck guard; plain
  // materials – no new shader program), a copy on the head bone of each firefighter. Its place on the bone (HELM.q, p, s) by eye: the
  // Rocketbox head bones of all figures are alike ----
  const HELM = { q: [0.6323, 0.3182, -0.6896, 0.1533], p: [7.056, -6.237, -2.346], s: 100.91, geo: null, mats: null };
  function helmModel() {
    if (!HELM.geo) {
      const shell = new THREE.SphereGeometry(0.128, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
      shell.scale(1, 0.92, 1.16);
      const band = new THREE.CylinderGeometry(0.1295, 0.1335, 0.024, 24, 1, true);
      band.scale(1, 1, 1.16);
      band.translate(0, 0.022, 0);
      const comb = new THREE.BoxGeometry(0.018, 0.02, 0.2);
      comb.translate(0, 0.118, -0.005);
      // (the figures look along their -z: the visor there, the neck guard behind)
      const visor = new THREE.SphereGeometry(
        0.136,
        18,
        6,
        -Math.PI * 0.82,
        Math.PI * 0.64,
        Math.PI * 0.3,
        Math.PI * 0.16
      );
      visor.scale(1, 0.92, 1.16);
      const neck = new THREE.CylinderGeometry(0.118, 0.15, 0.12, 18, 1, true, -Math.PI * 0.38, Math.PI * 0.76);
      neck.translate(0, -0.035, 0);
      HELM.geo = { shell, band, comb, visor, neck };
      HELM.mats = {
        yel: new THREE.MeshStandardMaterial({ color: 0xc6d11e, roughness: 0.42, metalness: 0.05 }),
        sil: new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.25, metalness: 0.55 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.55, metalness: 0.1 }),
      };
      HELM.mats.neck = HELM.mats.dark;
    }
    const g = new THREE.Group(),
      G = HELM.geo,
      M = HELM.mats;
    for (const [geo, m] of [
      [G.shell, M.yel],
      [G.band, M.sil],
      [G.comb, M.yel],
      [G.visor, M.dark],
      [G.neck, M.dark],
    ]) {
      const o = new THREE.Mesh(geo, m);
      o.castShadow = true;
      g.add(o);
    }
    g.name = 'helm';
    return g;
  }
  function helmetOn(e) {
    const b = e.F && e.F.bones && (e.F.bones.Head || e.F.bones.Neck);
    if (!b || e.F.helm) return;
    const g = helmModel();
    g.quaternion.fromArray(HELM.q);
    g.position.fromArray(HELM.p);
    g.scale.setScalar(HELM.s);
    b.add(g);
    e.F.helm = g;
  }
  // a blow to the head of a firefighter: the helmet takes it until it flies off
  function helmetOff(e, ux, uy) {
    const g = e.F && e.F.helm;
    e.helm = 0;
    if (!g) return;
    e.F.helm = null;
    g.getWorldPosition(_v);
    const q = g.getWorldQuaternion(new THREE.Quaternion());
    g.parent.remove(g);
    g.position.copy(_v);
    g.quaternion.copy(q);
    g.scale.setScalar(1);
    scene.add(g);
    // it flies a little and rolls on the ground; gone after a while
    const f = { vx: ux * 2.2, vy: uy * 2.2, vz: 2.4, t: 0, z0: floorAt(_v.x, -_v.z, e.z + 0.5) };
    S.flying.push({ g, f });
    ZTON.hit(e.x, e.y, 'blunt');
  }
  function flyTick(dt) {
    for (let i = S.flying.length - 1; i >= 0; i--) {
      const { g, f } = S.flying[i];
      f.t += dt;
      if (g.position.y > f.z0 + 0.1 || f.vz > 0) {
        f.vz -= 9.81 * dt;
        g.position.x += f.vx * dt;
        g.position.z -= f.vy * dt;
        g.position.y = Math.max(f.z0 + 0.1, g.position.y + f.vz * dt);
        g.rotation.x += dt * 6;
      }
      if (f.t > 90) {
        scene.remove(g);
        S.flying.splice(i, 1);
      }
    }
  }
  function remove(e) {
    const i = Z.ents.indexOf(e);
    if (i >= 0) Z.ents.splice(i, 1);
    if (e.F) e.F.dispose();
    e.F = null;
  }
  // which people to use: the villagers who were out, then others – at most maxPeople different ones (the rest are clones)
  function pickKey() {
    const all = ZFIG.people();
    if (!all.length) return null;
    const loaded = Object.keys(ZFIG.protos).filter(k => !k.endsWith(':alive'));
    if (loaded.length >= ZFIG.maxPeople()) return loaded[Math.floor(rnd() * loaded.length)];
    const fresh = all.filter(k => !loaded.includes(k));
    return (fresh.length ? fresh : all)[Math.floor(rnd() * (fresh.length ? fresh : all).length)];
  }
  // ---- the siren: those out of doors turn where they stand ----
  function turnVillagers() {
    const out = [];
    if (S.guest) {
      for (const k of Object.keys((DPEOPLE && DPEOPLE.figs) || {})) DPEOPLE.hide(k);
      return out;
    }
    for (const [k, f] of Object.entries((DPEOPLE && DPEOPLE.figs) || {})) {
      if (!f || !f.g.visible || !f.at || !ZFIG.avail(k)) continue;
      const e = ent(k, f.at.x, f.at.y, f.at.z, f.at.hd || 0, { st: 'turn' });
      e.turnT = 4.5 + rnd() * 2;
      DPEOPLE.hide(k);
      out.push(e.name);
    }
    return out;
  }
  // where new ones come from: the doors of houses 35–110 m from the player (c: another player – zombie/z_netz.js), rather behind him
  function doorSpots(c) {
    const t = c || me(),
      yawDeg = c && c.yaw != null ? c.yaw : P.yaw,
      out = [];
    for (const b of (VILLAGE && VILLAGE.bld) || []) {
      const f = b.fac && b.fac.find(q => q.door);
      if (!f) continue;
      const x = f.ax + f.dx * f.door.u + f.nx * 1.3,
        y = f.ay + f.dy * f.door.u + f.ny * 1.3,
        d = hyp(x - t.x, y - t.y);
      if (d < 35 || d > 110) continue;
      const yaw = (yawDeg * Math.PI) / 180,
        ahead = ((x - t.x) * Math.sin(yaw) + (y - t.y) * Math.cos(yaw)) / d;
      out.push({
        x,
        y,
        hd: (Math.atan2(f.nx, f.ny) * 180) / Math.PI,
        w: (ahead < 0.3 ? 3 : 1) / (1 + d / 60),
        bid: b.id,
      });
    }
    return out;
  }
  function spawnSome(n) {
    if (S.guest) return 0;
    const spots = doorSpots(S.spawnAt ? S.spawnAt() : null);
    if (!spots.length) return 0;
    let made = 0;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (const s of spots) sum += s.w;
      let r = rnd() * sum,
        s = spots[0];
      for (const q of spots)
        if ((r -= q.w) <= 0) {
          s = q;
          break;
        }
      const key = pickKey();
      if (!key) break;
      const z = KERN.ground(s.x, s.y);
      const e = ent(key, s.x + (rnd() - 0.5), s.y + (rnd() - 0.5), z, s.hd);
      e.st = 'wander';
      made++;
    }
    return made;
  }
  // ---- damage (zombie/z_waffe.js): o = { dx, dy (from the attacker towards the zombie), knock m, kind, gore 0…1, part, by } ----
  function damage(e, dmg, o = {}) {
    if (!e || e.dead || !(dmg > 0)) return false;
    // the host's zombie: the hit goes to the host, here only what one sees and hears
    if (e.net) {
      if (S.netHit) S.netHit(e, dmg, o);
      const L0 = hyp(o.dx || 0, o.dy || 0) || 1;
      ZTON.hit(e.x, e.y, o.kind, o.w);
      ZFX.spray(e.x, e.y, e.z + 1.2, (o.dx || 0) / L0, (o.dy || 0) / L0, Math.round(6 + dmg * 0.2), 1.6, 1.2);
      return true;
    }
    // a blow it did not see coming (it had not noticed anybody): three times as hard – creeping up pays (Falko 5.11.: „Schleichen“)
    if (
      o.by === 'spieler' &&
      o.w !== 'flinte' &&
      o.kind !== 'fire' &&
      (e.st === 'wander' || e.st === 'eat' || e.st === 'search')
    ) {
      dmg *= 3;
      o.sneak = true;
    }
    e.hp -= dmg;
    const L = hyp(o.dx || 0, o.dy || 0) || 1,
      ux = (o.dx || 0) / L,
      uy = (o.dy || 0) / L;
    const k = o.knock || 0;
    e.kv = [ux * k * 4.5, uy * k * 4.5];
    e.stag = Math.min(0.9, 0.18 + k * 0.18);
    // a hard blow throws them to the ground for a moment
    if (k >= 2.2 && !e.crawl && rnd() < 0.3 + (k - 2.2) * 0.25) e.downT = 1.4 + rnd() * 0.8;
    const hz = e.z + (e.crawl ? 0.3 : 1.2);
    ZTON.hit(e.x, e.y, o.kind, o.w);
    if (o.kind !== 'blunt' || dmg > 30) ZTON.splat(e.x, e.y, Math.min(1.4, dmg / 40));
    ZFX.spray(e.x, e.y, hz, ux, uy, Math.round(6 + dmg * 0.25), 1.6 + k, 1.2);
    // a limb off: blades, the saw and the shotgun, sometimes; the head only from a hard blow
    if (e.F && o.gore && (o.part || rnd() < o.gore * Math.min(1, dmg / 50))) {
      let part = o.part;
      if (!part) {
        const r = rnd();
        part =
          r < 0.22 && dmg >= 45
            ? 'kopf'
            : r < 0.56
              ? rnd() < 0.5
                ? 'armL'
                : 'armR'
              : r < 0.82
                ? rnd() < 0.5
                  ? 'beinL'
                  : 'beinR'
                : null;
      }
      // the firefighter's helmet takes a blow to the head (most of it) until it flies off
      if (part === 'kopf' && e.helm > 0) {
        e.helm -= dmg;
        e.hp = Math.min(e.hp0, e.hp + dmg * 0.6);
        if (e.helm <= 0) helmetOff(e, ux, uy);
        else ZTON.hit(e.x, e.y, 'blunt');
        part = null;
      }
      if (part) {
        const drop = e.F.cut(part, ux, uy);
        Z.cuts++;
        if (drop === 'dead') e.hp = 0;
        else if (drop === 'crawl' && !e.crawl) {
          e.crawl = true;
          e.hp = Math.max(e.hp, 8);
        }
      }
    }
    if (e.hp <= 0) kill(e, o);
    else {
      if (e.st !== 'chase') {
        e.st = 'chase';
        ZTON.snarl(e.x, e.y);
      }
      e.seen = o.at ? { x: o.at[0], y: o.at[1], t: performance.now() } : { x: me().x, y: me().y, t: performance.now() };
    }
    return true;
  }
  function kill(e, o = {}) {
    if (e.dead) return;
    e.dead = true;
    e.st = 'dead';
    e.deadT = 0;
    e.hp = 0;
    // the other player's blow: his kill (zombie/z_netz.js tells him)
    if (o.remote && S.netKill) S.netKill(o.remote, e, o);
    else Z.kills++;
    Z.save();
    ZTON.die(e.x, e.y);
    // the body on the ground a moment later (unless it flies – the car's own sounds then)
    if (!e.fly) {
      const x = e.x,
        y = e.y;
      setTimeout(() => ZTON.fall(x, y), 600 + Math.random() * 250);
    }
    if (e.F) e.F.mode = 'dead';
    setTimeout(() => ZFX.stain(e.x, e.y, 0.75 + rnd() * 0.4, e.z), 600);
    Z.emit('kill', { id: e.id, key: e.key, by: o.by || null, how: o.kind || null });
  }
  // ---- vehicles knock them flying ----
  function vehicles(dt) {
    for (const v of (VEH && VEH.list) || []) {
      const s = v.st,
        u = v.netU !== undefined && v !== VEH.cur ? v.netU : s.u; // (the other player's car: its speed by message)
      if (!(Math.abs(u) > 1.4)) continue;
      const B = v.spec.box,
        f = VEH.fwd(s.psi),
        r = VEH.rgt(s.psi),
        cx = s.x + f[0] * B.cy,
        cy = s.y + f[1] * B.cy;
      for (const e of Z.ents) {
        if (e.kind !== 'zombie' || e.net || e.fly || (e.dead && e.deadT > 2)) continue;
        const dx = e.x - cx,
          dy = e.y - cy;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) continue;
        const lx = dx * r[0] + dy * r[1],
          ly = dx * f[0] + dy * f[1];
        if (Math.abs(lx) > B.hw + D.r || Math.abs(ly) > B.hl + D.r) continue;
        if (e.dead) {
          // over a body: a bump, more blood
          if (rnd() < 0.3) ZFX.spray(e.x, e.y, e.z + 0.2, f[0] * Math.sign(u), f[1] * Math.sign(u), 8, 2, 0.8);
          continue;
        }
        const sp = Math.abs(u),
          dmg = 5 * Math.pow(sp, 1.65),
          dir = Math.sign(u);
        const out = Math.sign(lx) || (rnd() < 0.5 ? -1 : 1);
        e.fly = {
          vx: f[0] * u * 1.05 + r[0] * out * sp * 0.25,
          vy: f[1] * u * 1.05 + r[1] * out * sp * 0.25,
          vz: 1.5 + sp * 0.28,
          spin: (rnd() - 0.5) * 9,
          t: 0,
        };
        s.u *= sp > 9 ? 0.93 : 0.82;
        ZTON.splat(e.x, e.y, 1.5);
        ZTON.hit(e.x, e.y, 'blunt');
        ZTON.crack(e.x, e.y);
        ZFX.spray(e.x, e.y, e.z + 1, f[0] * dir, f[1] * dir, 30, 2 + sp * 0.3, 1.5);
        if (sp > 8 && e.F && rnd() < 0.5) e.F.cut(rnd() < 0.5 ? 'beinL' : 'beinR', f[0] * dir, f[1] * dir);
        e.hp -= dmg;
        Z.runover++;
        Z.noise(e.x, e.y, 30, 1, 'aufprall');
        if (e.hp <= 0) kill(e, { by: 'auto', kind: 'auto' });
      }
    }
  }
  // ---- per frame ----
  const _v = new THREE.Vector3();
  // ---- how well the player is seen (Falko 5.11.: „Schleichen“): crouched or crawling much less, standing still a little less, running
  // more; at night the flashlight's beam gives him away to those it falls on (further than without it), the others see the glow; the
  // difficulty. Allies, the other player and a car: only the difficulty ----
  function sightOf(e, t, dx, dy, d) {
    const base = (Z.phase !== 'nacht' ? D.sight : D.sightDark) * S.nk.sight;
    if (t.ally || t.remote || t.car) return base;
    let r = base * S.lowK;
    if (Z.phase === 'nacht' && Z.lamp && Z.lamp()) {
      const a = (P.yaw * Math.PI) / 180,
        c = (-dx * Math.sin(a) - dy * Math.cos(a)) / (d || 1);
      r = c > 0.82 ? Math.max(r, 26 * S.nk.sight) : r * 1.15;
    }
    return r;
  }
  // the screamer, having seen him: it stops, screams – and all around know where he is
  function scream(e, t) {
    e.screamed = true;
    e.screamT = 1.9;
    ZTON.scream(e.x, e.y);
    if (e.F) e.F.play('push', 0.7);
    const R = ZDATA.KINDS.schreier.scream,
      now = performance.now();
    Z.noise(e.x, e.y, R, 3, 'schrei');
    for (const q of Z.ents)
      if (q !== e && q.kind === 'zombie' && !q.dead && !q.house && q.st !== 'hide' && hyp(q.x - e.x, q.y - e.y) < R) {
        q.st = 'chase';
        q.seen = { x: t.x, y: t.y, t: now };
      }
    if (!S.screamSaid || now - S.screamSaid > 60000) {
      S.screamSaid = now;
      PLAY.think('Dieser Schrei … jetzt wissen alle, wo ich bin.', 2600);
    }
    Z.emit('scream', { id: e.id, x: e.x, y: e.y });
  }
  function think(e, dt, t) {
    // seeing and hearing
    const dx = t.x - e.x,
      dy = t.y - e.y,
      d = hyp(dx, dy);
    e.d = d;
    const sight = sightOf(e, t, dx, dy, d);
    if (d < sight && (e.losT = (e.losT || 0) - dt) <= 0) {
      e.losT = 0.25 + rnd() * 0.15;
      e.los = Math.abs((t.z || 0) - e.z) < 2.6 && los(e.x, e.y, t.x, t.y);
    }
    const inHouse = S.house && S.house.inside();
    let see = d < sight && e.los;
    // the player in a house: those near know it (they smell him) and come to its doors and windows – from close by only if he keeps
    // low in the dark; those inside see him close by
    if (inHouse && !e.house && d < (S.low ? 22 : 70) && Z.phase === 'nacht') see = true;
    if (e.house && d < 12) see = true;
    if (e.st === 'eat' && !(d < 7 && (e.los || d < 3.5))) see = false;
    if (see) {
      if (e.st !== 'chase' && e.st !== 'attack') {
        e.st = 'chase';
        if (e.art === 'schreier' && !e.screamed && !t.car) scream(e, t);
        else ZTON.snarl(e.x, e.y);
      }
      e.seen = { x: t.x, y: t.y, t: performance.now() };
    } else if (e.st === 'wander' || e.st === 'search') {
      for (const n of Z.noises)
        if (hyp(n.x - e.x, n.y - e.y) < n.r * D.hear) {
          e.st = 'search';
          e.tx = n.x + (rnd() - 0.5) * 4;
          e.ty = n.y + (rnd() - 0.5) * 4;
          e.t = 0;
          break;
        }
    }
    if (e.st === 'chase' && !see && e.seen && performance.now() - e.seen.t > 7000) {
      e.st = 'search';
      e.tx = e.seen.x;
      e.ty = e.seen.y;
      e.t = 0;
    }
    if (e.st === 'search' && (e.t > 18 || hyp(e.tx - e.x, e.ty - e.y) < 1.2)) e.st = 'wander';
  }
  // a puppet of the host's zombie (zombie/z_netz.js moves it): only the pose here
  function puppet(e, dt, near) {
    const F = e.F;
    if (e.dead) e.deadT = (e.deadT || 0) + dt;
    if (!F) return;
    const m = e.netMode || 'walk';
    F.mode =
      e.dead || m === 'dead' || m === 'fly' || m === 'down'
        ? 'dead'
        : m === 'chase'
          ? 'chase'
          : m === 'walk'
            ? e.netSp > 0.05
              ? 'walk'
              : 'idle'
            : m;
    F.speed = e.netSp || 0;
    if (m === 'turn') F.turnK = Math.min(1, (F.turnK || 0) + dt / 5);
    F.g.position.copy(V(e.x, e.y, e.z));
    F.g.rotation.y = (-e.hd * Math.PI) / 180;
    F.anim(dt, near);
    if (e.dead && e.deadT > 75) remove(e);
  }
  // a position gone bad (NaN): back to where it was, and once a note what did it
  const badSeen = new Set();
  function bad(e, where, px, py, pz, info) {
    if (Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.z)) return false;
    if (!badSeen.has(where)) {
      badSeen.add(where);
      console.warn('zombie NaN', where, JSON.stringify(info));
      S.badAt = where + ' ' + JSON.stringify(info);
    }
    e.x = px;
    e.y = py;
    e.z = Number.isFinite(pz) ? pz : floorAt(px, py, 300);
    e.kv = [0, 0];
    return true;
  }
  function step(e, dt, t, near) {
    e.t += dt;
    if (e.net) return puppet(e, dt, near);
    const F = e.F;
    // flying from a car: a tumbling throw, then on the ground
    if (e.fly) {
      const f = e.fly;
      f.t += dt;
      f.vz -= 9.81 * dt;
      e.x += f.vx * dt;
      e.y += f.vy * dt;
      e.z += f.vz * dt;
      const p = [e.x, e.y];
      KERN.pushOut(p, 0.25);
      e.x = p[0];
      e.y = p[1];
      const gz = floorAt(e.x, e.y, e.z + 0.5);
      if (F) {
        F.g.position.copy(V(e.x, e.y, Math.max(gz, e.z)));
        F.g.rotation.x += f.spin * dt;
        F.mode = 'dead';
        F.anim(dt, near);
      }
      if (e.z <= gz && f.t > 0.15) {
        e.z = gz;
        e.fly = null;
        ZFX.stain(e.x, e.y, 0.6, gz);
        ZTON.hit(e.x, e.y, 'blunt');
        if (F) F.g.rotation.x = 0;
        if (!e.dead) {
          e.crawl = e.crawl || rnd() < 0.5;
          e.stag = 1.2;
          e.st = 'chase';
        }
      }
      return;
    }
    if (e.dead) {
      e.deadT += dt;
      if (F) {
        F.mode = 'dead';
        F.anim(dt, near);
        if (e.deadT > 40) F.g.position.y -= dt * 0.03; // sinking into the dark after a while
      }
      if (e.deadT > 75) remove(e);
      return;
    }
    if (e.st === 'turn') {
      e.turnT -= dt;
      if (F) {
        F.mode = 'turn';
        F.turnK = Math.min(1, e.t / Math.max(0.1, e.t + e.turnT));
        F.anim(dt, near);
      }
      if (e.turnT <= 0) {
        e.st = 'wander';
        ZTON.groan(e.x, e.y, 1.3);
      }
      return;
    }
    // knocked down: on the ground for a moment, sliding with the blow, then up again
    if (e.downT > 0) {
      e.downT -= dt;
      e.x += e.kv[0] * dt;
      e.y += e.kv[1] * dt;
      e.kv[0] *= Math.exp(-dt * 4);
      e.kv[1] *= Math.exp(-dt * 4);
      const p = [e.x, e.y];
      collide(p, e.z, true);
      e.x = p[0];
      e.y = p[1];
      e.z = floorAt(e.x, e.y, e.z + 0.45);
      if (F) {
        F.mode = 'dead';
        F.speed = 0;
        F.g.position.copy(V(e.x, e.y, e.z));
        F.anim(dt, near);
      }
      return;
    }
    // held in a pose (tests, a scene): no thinking, no moving
    if (e.hold) {
      if (F) {
        F.mode = e.hold === true ? 'idle' : e.hold;
        F.speed = e.holdSp || 0;
        F.g.position.copy(V(e.x, e.y, e.z));
        F.g.rotation.y = (-e.hd * Math.PI) / 180;
        F.anim(dt, near);
      }
      return;
    }
    // an ally nearer than the player is the one it goes for (zombie/z_bund.js)
    if (S.pick && e.st !== 'hide') {
      const a = S.pick(e, t);
      if (a) t = a;
    }
    e.tg = t.remote ? 'mitspieler' : t.ally ? 'verbuendet' : 'spieler'; // (whom it goes for – for the tests)
    if (e.st !== 'hide') think(e, dt, t);
    if (e.st === 'eat') {
      if (F) {
        F.mode = 'eat';
        F.speed = 0;
        F.g.position.copy(V(e.x, e.y, e.z));
        F.g.rotation.y = (-e.hd * Math.PI) / 180;
        F.anim(dt, near);
      }
      e.groanT -= dt;
      if (e.groanT <= 0) {
        e.groanT = 5 + rnd() * 6;
        if (e.d < 25) ZTON.groan(e.x, e.y, 0.6);
      }
      return;
    }
    e.cd -= dt;
    // the attack: a wind-up, then the blow lands if the player is still within reach
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0 && e.d < D.reach + 0.65 && !t.car && canReach(e, t)) {
        if (t.remote) {
          if (S.hitRemote) S.hitRemote(t.remote, e.hit * (e.crawl ? 0.6 : 1), e);
        } else if (t.ally) {
          if (S.hitAlly) S.hitAlly(t.ally, e.hit * (e.crawl ? 0.6 : 1), e);
        } else {
          Z.hurt(e.hit * (e.crawl ? 0.6 : 1), e.name);
          Z.emit('hit', { id: e.id, x: e.x, y: e.y });
        }
      }
    } else if (!e.crawl || e.d < 1) {
      if (
        e.st === 'chase' &&
        e.d < D.reach + (t.car ? 1.2 : 0.25) &&
        e.cd <= 0 &&
        !(t.car && Math.abs(t.car.st.u) > 1.5) &&
        (t.car || canReach(e, t))
      ) {
        e.wind = D.wind;
        e.cd = D.cd * (0.8 + rnd() * 0.4);
        ZTON.attack(e.x, e.y);
        if (F) F.play(rnd() < 0.5 ? 'push' : 'chop', 0.85);
      }
    }
    // where to go
    let gx = 0,
      gy = 0,
      v = D.walk * e.sp;
    const hz = e.st === 'chase' && !t.ally && !t.remote && S.house && S.house.inside() ? S.house.redirect(e) : null;
    if (hz) {
      v = (e.crawl ? 0.45 : D.chase * e.run) * e.sp;
      if (hz.d < 1.15) {
        v = 0;
        S.house.bang(e, hz.op, dt);
        gx = hz.x - e.x;
        gy = hz.y - e.y;
      } else {
        const fl = hz.d > 3 ? flow(e.x, e.y) : null;
        gx = fl ? fl[0] : hz.x - e.x;
        gy = fl ? fl[1] : hz.y - e.y;
      }
    } else if (e.st === 'chase') {
      v = (e.crawl ? 0.45 : D.chase * e.run) * e.sp;
      // inside a house: the interior's way from room to room (zombie/z_haus.js → ZINNEN H.route)
      const wp = e.house && !e.los && S.house && S.house.route ? S.house.route(e, t) : null;
      // (the flow field leads to this browser's player – for the other player straight on, sidestepping when stuck)
      const fl = !wp && !e.los && e.d > 2 && !e.house && !t.remote ? flow(e.x, e.y) : null;
      if (wp) {
        gx = wp[0] - e.x;
        gy = wp[1] - e.y;
      } else if (fl) {
        gx = fl[0];
        gy = fl[1];
      } else {
        gx = t.x - e.x;
        gy = t.y - e.y;
      }
      if (e.d < D.reach * 0.85) v = 0;
    } else if (e.st === 'search' || e.st === 'hide') {
      gx = e.tx - e.x;
      gy = e.ty - e.y;
      v = (e.st === 'hide' ? 1.0 : D.walk * 1.3) * e.sp;
      if (e.st === 'hide' && hyp(gx, gy) < 1.2) {
        remove(e);
        return;
      }
    } else {
      // wandering: now and then a new aim a few metres away, often towards the player's side of the village
      if (e.t > 6 + rnd() * 6 || hyp(e.tx - e.x, e.ty - e.y) < 1) {
        e.t = 0;
        const a = rnd() * Math.PI * 2,
          r = 4 + rnd() * 10,
          bias = e.d < 120 ? 0.35 : 0.7;
        e.tx = e.x + Math.cos(a) * r + (t.x - e.x) * bias * 0.15;
        e.ty = e.y + Math.sin(a) * r + (t.y - e.y) * bias * 0.15;
        if (blockedAt(e.tx, e.ty)) {
          e.tx = e.x;
          e.ty = e.y;
        }
      }
      gx = e.tx - e.x;
      gy = e.ty - e.y;
      if (rnd() < dt * 0.3) v = 0; // standing a moment, swaying
    }
    if (e.crawl) v = Math.min(v, 0.45);
    if (e.wind > 0 || e.stag > 0) v = 0;
    if (e.screamT > 0) {
      e.screamT -= dt;
      v = 0;
      gx = t.x - e.x;
      gy = t.y - e.y;
    }
    const L = hyp(gx, gy);
    if (L > 1e-3) {
      gx /= L;
      gy /= L;
    }
    // stuck against something: a step to the side for a while
    const S2 = e.stuck;
    S2.t += dt;
    if (S2.t > 1.2) {
      const moved = hyp(e.x - S2.x, e.y - S2.y);
      if (v > 0.3 && moved < v * S2.t * 0.25) {
        S2.side = rnd() < 0.5 ? -1 : 1;
        S2.sideT = 1 + rnd();
      }
      S2.t = 0;
      S2.x = e.x;
      S2.y = e.y;
    }
    if (S2.sideT > 0) {
      S2.sideT -= dt;
      const sx = -gy * S2.side,
        sy = gx * S2.side;
      gx = gx * 0.3 + sx * 0.95;
      gy = gy * 0.3 + sy * 0.95;
    }
    // knocked back
    if (e.stag > 0) e.stag -= dt;
    const kx = e.kv[0],
      ky = e.kv[1];
    e.kv[0] *= Math.exp(-dt * 5);
    e.kv[1] *= Math.exp(-dt * 5);
    // move, then out of walls, the garden's things and parked cars; apart from the others
    const px = e.x,
      py = e.y,
      pz = e.z;
    e.x += (gx * v + kx) * dt;
    e.y += (gy * v + ky) * dt;
    if (bad(e, 'move', px, py, pz, { gx, gy, v, kx, ky, tx: t.x, ty: t.y, side: e.stuck.side, sideT: e.stuck.sideT }))
      return;
    const p = [e.x, e.y];
    collide(p, e.z, true);
    e.x = p[0];
    e.y = p[1];
    if (bad(e, 'collide', px, py, pz, { z: e.z })) return;
    e.z = floorAt(e.x, e.y, e.z + 0.45);
    if (bad(e, 'floor', px, py, pz, { x: e.x, y: e.y })) return;
    const sp = hyp(e.x - px, e.y - py) / Math.max(dt, 1e-3);
    e.lastSp = sp;
    // facing: where it goes, or the player when close
    let hd = e.hd;
    if (e.st === 'chase' && e.d < 3) hd = (Math.atan2(t.x - e.x, t.y - e.y) * 180) / Math.PI;
    else if (sp > 0.05) hd = (Math.atan2(e.x - px, e.y - py) * 180) / Math.PI;
    let dh = hd - e.hd;
    while (dh > 180) dh -= 360;
    while (dh < -180) dh += 360;
    e.hd += dh * Math.min(1, dt * (e.st === 'chase' ? 6 : 2.5));
    // the voice
    e.groanT -= dt;
    if (e.groanT <= 0) {
      e.groanT = (e.st === 'chase' ? 2.5 : 6) + rnd() * 8;
      if (e.d < 45) ZTON.groan(e.x, e.y, e.st === 'chase' ? 1.2 : 0.8);
    }
    if (F) {
      F.mode = e.crawl ? 'crawl' : e.st === 'chase' ? 'chase' : sp > 0.05 ? 'walk' : 'idle';
      F.speed = sp;
      F.g.position.copy(V(e.x, e.y, e.z));
      F.g.rotation.y = (-e.hd * Math.PI) / 180;
      F.anim(dt, near);
    }
  }
  // the zombies push each other apart, and the player out of them (he cannot walk through)
  function separate() {
    const E = Z.ents;
    for (let i = 0; i < E.length; i++) {
      const a = E[i];
      if (a.dead || a.fly) continue;
      for (let j = i + 1; j < E.length; j++) {
        const b = E[j];
        if (b.dead || b.fly) continue;
        const dx = b.x - a.x,
          dy = b.y - a.y,
          d = hyp(dx, dy);
        if (d < 0.62 && d > 1e-4) {
          const k = (0.62 - d) * 0.5;
          a.x -= (dx / d) * k;
          a.y -= (dy / d) * k;
          b.x += (dx / d) * k;
          b.y += (dy / d) * k;
        }
      }
      if (!(VEH && VEH.cur) && P.mode === 'walk' && a.kind === 'zombie' && Math.abs(a.z - P.feet) < 1.2) {
        const dx = P.x - a.x,
          dy = P.y - a.y,
          d = hyp(dx, dy),
          rr = a.crawl ? 0.4 : 0.52;
        if (d < rr && d > 1e-4) {
          P.x = a.x + (dx / d) * rr;
          P.y = a.y + (dy / d) * rr;
        }
      }
    }
  }
  function tick(dt) {
    if (!Z.on) return;
    dt = Math.min(dt, 0.1);
    const t = me();
    // the night's numbers once per frame; how low the player keeps (stance, pace) – for seeing and hearing him
    S.nk = ZDATA.night(Math.max(1, Z.night), Z.diff);
    const st = P.stance,
      sp = P.speed || 0,
      inCar = !!(VEH && VEH.cur);
    S.lowK = inCar
      ? 1
      : (st === 'crouch' ? 0.5 : st === 'crawl' || st === 'prone' ? 0.3 : 1) * (sp > 3.2 ? 1.25 : sp < 0.2 ? 0.85 : 1);
    S.low = !inCar && st !== 'stand' && !(Z.lamp && Z.lamp());
    // running is heard (footsteps on the street, ~10 m); creeping is not
    S.stepT = (S.stepT || 0) - dt;
    if (!inCar && sp > 3.2 && S.stepT <= 0) {
      S.stepT = 0.4;
      Z.noise(P.x, P.y, 10, 0.5, 'schritte');
    }
    if (S.flying.length) flyTick(dt);
    S.fieldT -= dt;
    if (S.fieldT <= 0 && Z.ents.some(e => e.st === 'chase')) {
      S.fieldT = 0.5;
      field();
    }
    const camP = cam.position,
      maxShow = COARSE ? 9 : 18;
    // the nearest ones are drawn and animated; the rest move but are not drawn
    const order = Z.ents.filter(e => e.F).sort((a, b) => (a.d2 || 0) - (b.d2 || 0));
    let shown = 0;
    for (const e of order) {
      e.F.g.getWorldPosition(_v);
      e.d2 = _v.distanceToSquared(camP);
      const vis = e.d2 < 85 * 85 && shown < maxShow;
      if (vis) shown++;
      if (e.F.g.visible !== vis) {
        e.F.g.visible = vis;
        markDirty();
      }
    }
    // their bones: the near ones every frame, beyond 22 m every second frame, beyond 45 m every third – the skipped time adds up, the
    // next step plays it all (Falko 5.11.: „sorge auch dafür, dass es weiterhin flüssig läuft“)
    S.frame = (S.frame || 0) + 1;
    let idx = 0;
    for (const e of Z.ents.slice()) {
      if (e.kind !== 'zombie') continue;
      idx++;
      const k = e.d2 < 22 * 22 ? 1 : e.d2 < 45 * 45 ? 2 : 3,
        near = !!(e.F && e.F.g.visible && e.d2 < 70 * 70) && (k === 1 || (S.frame + idx) % k === 0);
      step(e, dt, t, near);
    }
    separate();
    vehicles(dt);
    // keep the night going: new ones from the houses while the budget lasts
    if (Z.phase === 'nacht') {
      S.spawnT -= dt;
      const alive = Z.ents.filter(e => e.kind === 'zombie' && !e.dead).length,
        want = Math.min(ZDATA.night(Z.night, Z.diff).count, COARSE ? 10 : 24);
      if (S.spawnT <= 0 && alive < want && S.budget > 0) {
        S.spawnT = 1.2 + rnd() * 2.5;
        S.budget -= spawnSome(1);
      }
    }
    if (Z.ents.length) markDirty();
  }
  // the night begins: the villagers turn, more come
  // somebody in sight turns (if nobody of the village was out): 12–22 m ahead of the player, on a free place
  function turnInSight(k) {
    if (S.guest) return [];
    const t = me(),
      out = [],
      yaw = (P.yaw * Math.PI) / 180,
      vk = ZFIG.people().filter(q => ZFIG.byKey[q].src === 'dorf');
    for (let i = 0, tries = 0; i < k && tries < 40; tries++) {
      const a = yaw + (rnd() - 0.5) * 1.1,
        r = 12 + rnd() * 10,
        x = t.x + Math.sin(a) * r,
        y = t.y + Math.cos(a) * r;
      if (blockedAt(x, y) || !los(t.x, t.y, x, y)) continue;
      const key = vk.length ? vk[(i + Math.floor(rnd() * vk.length)) % vk.length] : pickKey();
      if (!key) break;
      const e = ent(key, x, y, KERN.ground(x, y), (Math.atan2(t.x - x, t.y - y) * 180) / Math.PI, { st: 'turn' });
      e.turnT = 4 + rnd() * 2.5;
      out.push(e.name);
      i++;
    }
    return out;
  }
  function night(n) {
    S.budget = Math.round(ZDATA.night(n, Z.diff).count * 1.6);
    const turned = turnVillagers();
    if (turned.length < 2 && !(VEH && VEH.cur)) turned.push(...turnInSight(2 - turned.length));
    const first = Math.max(0, Math.min(ZDATA.night(n, Z.diff).count, COARSE ? 6 : 10) - turned.length);
    S.budget -= spawnSome(first);
    S.spawnT = 6;
    return turned;
  }
  // dawn: they go back into the houses
  function dawn() {
    for (const e of Z.ents) {
      if (e.kind !== 'zombie' || e.dead || e.net) continue;
      e.st = 'hide';
      let best = null,
        bd = 1e9;
      for (const b of (VILLAGE && VILLAGE.bld) || []) {
        const f = b.fac && b.fac.find(q => q.door);
        if (!f) continue;
        const x = f.ax + f.dx * f.door.u + f.nx * 0.5,
          y = f.ay + f.dy * f.door.u + f.ny * 0.5,
          d = hyp(x - e.x, y - e.y);
        if (d < bd) {
          bd = d;
          best = { x, y, bid: b.id };
        }
      }
      if (best && bd < 90) {
        e.tx = best.x;
        e.ty = best.y;
        Z.house(best.bid).lurk = (Z.house(best.bid).lurk || 0) + 1;
      } else {
        e.tx = e.x + (rnd() - 0.5) * 30;
        e.ty = e.y + (rnd() - 0.5) * 30;
      }
      e.t = 0;
    }
    S.budget = 0;
  }
  function clear() {
    for (const e of Z.ents.slice()) if (e.kind === 'zombie') remove(e);
    S.fld = null;
  }
  // the nearest living zombie to (x, y) within r, or null
  function nearest(x, y, r = 3) {
    let best = null,
      bd = r;
    for (const e of Z.ents) {
      if (e.kind !== 'zombie' || e.dead) continue;
      const d = hyp(e.x - x, e.y - y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }
  KERN.tick(tick, 'zombie/horde');
  Object.assign(S, {
    me,
    buildGrid,
    blockedAt,
    canReach,
    wallBetween,
    HELM,
    helmetOn,
    helmetOff,
    kindFor,
    field,
    flow,
    los,
    ent,
    remove,
    turnVillagers,
    spawnSome,
    damage,
    kill,
    night,
    dawn,
    clear,
    nearest,
  });
  return S;
})();
window.ZHORDE = ZHORDE;
