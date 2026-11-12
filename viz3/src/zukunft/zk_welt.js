// ===================== feat/zukunft 2: the variants in the world – solar modules, the field, water, forest, ground (ZKWELT) =====================
// What the what-if mode (zukunft/zk_modus.js) shows in the one world, and takes away again when it ends: PV modules on the roofs of the 3D
// buildings (planes found in their roof meshes: orientation, slope, size; modules packed with an edge margin), a ground-mounted PV field,
// heat pump units at the houses, the Mitfahrbank (the Ortsvorsteher system's own builder) and a Rufbus sign with a minibus at the bus stop, the
// Schleuse's flood (a ribbon whose edges follow the terrain at the chosen level), the spruce stand dying, cleared and growing again
// (FOREST.tint and the trees' own height, restored exactly), a dry summer (the ground's colour through WXBODEN.setDry, the weather preset).
// Cheap: instanced meshes with one material each, built on first need; every material is compiled once in warm() when the mode starts (no
// new shader programs afterwards), no light, no shadow casting; everything is undone by clear().
// INTERFACE (zukunft/zk_modus.js calls only these; keep them stable – the mode, panel and indicators do not care how the world looks):
//   ZKWELT.warm()            once when the mode starts: compile every material / program variant (warmUp) – no new programs afterwards
//   ZKWELT.apply(world, y)   put one variant into the world, instantly, idempotent, undoing what the previous variant set. `world` is
//                            ZKDATA.calc(...).world = { pvRoof 0..1 share of suitable roofs, pvField 0|1, wp 0..1 share of houses with a heat
//                            pump unit, bank 0|1, rufbus 0|1, takt, wet 0..1, rain null|preset name, flood level in m (0 = none), dry 0..1,
//                            forest null|{ mode:'natur'|'umbau', year } }; y = the year of the slider (2026–2060)
//   ZKWELT.clear()           leaving the mode: everything back to „Heute“ (trees, meshes, weather, ground colours)
//   ZKWELT.ctx()             the world's numbers for the indicators: { roof:{kwp,area,n,src}, field:{kwp,ha,src}, bus:{werk,sa,so,min,src},
//                            nat0, forest:{ha,spruce} } – ZKDATA.calc reads them as ctx; tests also read ZKWELT.stats() (what is visible)
// Pictures: viz3/test/zukunft.py writes out/zukunft/*.jpg (top view and on foot per topic) – look at them after every change.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { warmUp } from '../render/render.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { WXBODEN } from '../wetter/wx_boden.js';
import { ZKDATA } from './zk_data.js';

export const ZKWELT = (() => {
  const G = w => window[w];
  const ANGER = [222, -108]; // the village centre (site metres)
  const S = {
    warmed: false,
    mats: null,
    roof: null,
    roofMesh: null,
    field: null,
    fieldMesh: null,
    wp: null,
    wpMesh: null,
    van: null,
    flood: null,
    floodMesh: null,
    forest: null,
    bankMine: false,
    state: {},
    weatherMine: false,
    weatherPrev: null,
    sig: {},
  };
  const hAt = (x, y) => (G('RATSCHER') && RATSCHER.hAt ? RATSCHER.hAt(x, y) : 0);
  const hash = n => {
    let h = Math.imul(n | 0, 2654435761) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const C = (r, g, b) => [lin(r), lin(g), lin(b)];
  // ---------- materials: few, made once, compiled ahead ----------
  function mats() {
    if (S.mats) return S.mats;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#f2c94c';
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#1f2a1f';
    g.lineWidth = 6;
    g.strokeRect(5, 5, 246, 118);
    g.fillStyle = '#1f2a1f';
    g.textAlign = 'center';
    g.font = 'bold 54px sans-serif';
    g.fillText('RUFBUS', 128, 62);
    g.font = '24px sans-serif';
    g.fillText('Fahrt anmelden: App', 128, 94);
    g.fillText('oder Telefon', 128, 118);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    S.mats = {
      vcol: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, envMapIntensity: 0.6 }),
      pv: new THREE.MeshStandardMaterial({ color: 0x1d2c4d, roughness: 0.35, metalness: 0.35, envMapIntensity: 0.9 }),
      wp: new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.6, envMapIntensity: 0.6 }),
      water: new THREE.MeshStandardMaterial({
        color: 0x6f6650,
        roughness: 0.08,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        envMapIntensity: 1.0,
      }),
      sign: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }),
    };
    return S.mats;
  }
  // every program the mode needs, compiled once (instanced, vertex colours, transparent, with a map)
  function warm() {
    if (S.warmed) return false;
    S.warmed = true;
    const M = mats(),
      g = new THREE.Group();
    const box = new THREE.BoxGeometry(1, 1, 1);
    const add = m => {
      m.frustumCulled = false;
      m.position.set(0, -200, 0);
      g.add(m);
    };
    const gc = box.clone();
    gc.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(new Float32Array(gc.attributes.position.count * 3).fill(0.5), 3)
    );
    add(new THREE.Mesh(gc, M.vcol));
    add(new THREE.InstancedMesh(box, M.pv, 1));
    add(new THREE.InstancedMesh(box, M.wp, 1));
    add(new THREE.Mesh(box, M.water));
    add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), M.sign));
    scene.add(g);
    warmUp(g);
    scene.remove(g);
    g.traverse(o => o.isMesh && o.geometry !== box && o.geometry.dispose());
    return true;
  }
  const site3 = (x, y, z) => new THREE.Vector3(x, z, -y);
  // ---------- the roofs: planes of the 3D buildings that suit modules ----------
  const MOD = { w: 1.15, h: 1.74, kwp: 0.43, gap: 0.05 };
  function roofMeshes() {
    const out = [];
    const R = G('RATSCHER');
    if (R && R.bld && R.bld[1]) out.push(R.bld[1]);
    scene.traverse(o => {
      if (o.isMesh && /^gebaeude roofs/.test(o.name || '')) out.push(o);
    });
    return out;
  }
  // modules inside a triangle (2D coordinates of its plane), with an edge margin; returns centres [u, v]
  function packTri(a, b, c, su, sv, margin, wU, hV) {
    const P = [a, b, c];
    const edge = (p, q, x, y) => {
      const dx = q[0] - p[0],
        dy = q[1] - p[1],
        l = Math.hypot(dx, dy) || 1;
      return (dx * (y - p[1]) - dy * (x - p[0])) / l;
    };
    const area2 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const sgn = area2 >= 0 ? 1 : -1;
    const inside = (x, y) => {
      for (let i = 0; i < 3; i++) if (sgn * edge(P[i], P[(i + 1) % 3], x, y) < margin) return false;
      return true;
    };
    const u0 = Math.min(a[0], b[0], c[0]),
      u1 = Math.max(a[0], b[0], c[0]),
      v0 = Math.min(a[1], b[1], c[1]),
      v1 = Math.max(a[1], b[1], c[1]);
    const out = [];
    for (let v = v0 + hV / 2; v <= v1; v += sv)
      for (let u = u0 + wU / 2; u <= u1; u += su) {
        const hu = wU / 2,
          hv = hV / 2;
        if (inside(u - hu, v - hv) && inside(u + hu, v - hv) && inside(u + hu, v + hv) && inside(u - hu, v + hv))
          out.push([u, v]);
      }
    return out;
  }
  function scanRoofs() {
    if (S.roof) return S.roof;
    const mods = []; // { m: Float32Array(16), q: hash of the plane, f: yield factor }
    const cells = new Set();
    let tris = 0;
    const A = new THREE.Vector3(),
      B = new THREE.Vector3(),
      Cc = new THREE.Vector3(),
      n3 = new THREE.Vector3();
    for (const me of roofMeshes()) {
      const g = me.geometry,
        pos = g.attributes.position,
        aR = g.attributes.aR,
        idx = g.index;
      me.updateMatrixWorld(true);
      const nT = idx ? idx.count / 3 : pos.count / 3;
      for (let t = 0; t < nT; t++) {
        const i0 = idx ? idx.getX(t * 3) : t * 3,
          i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1,
          i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        if (aR && aR.getX(i0) > 4.5) continue; // roof surfaces only (kinds 0–4), not soffit, fascia, ridge or chimney
        A.fromBufferAttribute(pos, i0).applyMatrix4(me.matrixWorld);
        B.fromBufferAttribute(pos, i1).applyMatrix4(me.matrixWorld);
        Cc.fromBufferAttribute(pos, i2).applyMatrix4(me.matrixWorld);
        // site coordinates: x east, y north, z up
        const a = [A.x, -A.z, A.y],
          b = [B.x, -B.z, B.y],
          c = [Cc.x, -Cc.z, Cc.y];
        const cx = (a[0] + b[0] + c[0]) / 3,
          cy = (a[1] + b[1] + c[1]) / 3;
        if (Math.hypot(cx - ANGER[0], cy - ANGER[1]) > 520) continue;
        const ux = b[0] - a[0],
          uy = b[1] - a[1],
          uz = b[2] - a[2],
          vx = c[0] - a[0],
          vy = c[1] - a[1],
          vz = c[2] - a[2];
        let nx = uy * vz - uz * vy,
          ny = uz * vx - ux * vz,
          nz = ux * vy - uy * vx;
        const L = Math.hypot(nx, ny, nz);
        if (L < 1e-6) continue;
        const area = L / 2;
        if (area < 5) continue;
        nx /= L;
        ny /= L;
        nz /= L;
        if (nz < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        const flat = nz > 0.985;
        let f = 0.95,
          nM,
          sM,
          uM;
        if (!flat) {
          const tilt = Math.acos(Math.min(1, nz)) * (180 / Math.PI);
          if (tilt < 10 || tilt > 60) continue;
          const az = ((Math.atan2(nx, ny) * 180) / Math.PI + 360) % 360, // downslope compass
            dev = Math.abs(((az - 180 + 540) % 360) - 180);
          if (dev > 70) continue;
          f = 1 - 0.15 * (dev / 90) ** 2;
          nM = [nx, ny, nz];
          const s = [-nz * nx, -nz * ny, 1 - nz * nz],
            sl = Math.hypot(...s);
          sM = [s[0] / sl, s[1] / sl, s[2] / sl];
        } else {
          const k = (12 * Math.PI) / 180;
          nM = [0, -Math.sin(k), Math.cos(k)];
          sM = [0, Math.cos(k), Math.sin(k)];
        }
        uM = [nM[1] * sM[2] - nM[2] * sM[1], nM[2] * sM[0] - nM[0] * sM[2], nM[0] * sM[1] - nM[1] * sM[0]];
        const ul = Math.hypot(...uM);
        uM = [uM[0] / ul, uM[1] / ul, uM[2] / ul];
        // 2D coordinates in the plane of the roof (the modules' frame)
        const to2 = p => {
          const d = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
          return [d[0] * uM[0] + d[1] * uM[1] + d[2] * uM[2], d[0] * sM[0] + d[1] * sM[1] + d[2] * sM[2]];
        };
        const q2 = [to2(a), to2(b), to2(c)];
        const stepV = flat ? 3.3 : MOD.h + MOD.gap;
        const hV = flat ? MOD.h * Math.cos((12 * Math.PI) / 180) : MOD.h;
        const found = packTri(q2[0], q2[1], q2[2], MOD.w + MOD.gap, stepV, flat ? 0.6 : 0.3, MOD.w, hV);
        if (!found.length) continue;
        tris++;
        const q = hash(
          Math.round(nx * 20) * 7919 +
            Math.round(ny * 20) * 104729 +
            Math.round(cx / 15) * 1299709 +
            Math.round(cy / 15) * 15485863
        );
        cells.add(Math.round(cx / 8) + ',' + Math.round(cy / 8));
        for (const [u, v] of found) {
          const p = [a[0] + uM[0] * u + sM[0] * v, a[1] + uM[1] * u + sM[1] * v, a[2] + uM[2] * u + sM[2] * v];
          const o = 0.07 + (flat ? 0.45 : 0);
          const pc = site3(p[0] + nM[0] * o, p[1] + nM[1] * o, p[2] + nM[2] * o);
          const m = new THREE.Matrix4().makeBasis(
            new THREE.Vector3(uM[0], uM[2], -uM[1]),
            new THREE.Vector3(nM[0], nM[2], -nM[1]),
            new THREE.Vector3(sM[0], sM[2], -sM[1])
          );
          m.setPosition(pc);
          mods.push({ m, q, f });
        }
        if (mods.length > 9000) break;
      }
    }
    mods.sort((x, y) => x.q - y.q);
    const kwp = mods.reduce((s, x) => s + MOD.kwp * x.f, 0);
    S.roof = { mods, kwp, area: mods.length * MOD.w * MOD.h, n: cells.size, tris };
    return S.roof;
  }
  function roofShare(share) {
    const R = scanRoofs();
    const n = Math.round(R.mods.length * Math.max(0, Math.min(1, share)));
    if (!n && !S.roofMesh) return;
    if (!S.roofMesh) {
      const M = mats();
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(MOD.w, 0.05, MOD.h), M.pv, Math.max(1, R.mods.length));
      im.castShadow = false;
      im.receiveShadow = false;
      im.frustumCulled = false;
      im.userData.noMerge = true;
      im.name = 'zukunft:pv-dach';
      R.mods.forEach((x, i) => im.setMatrixAt(i, x.m));
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
      S.roofMesh = im;
    }
    S.roofMesh.count = n;
    S.roofMesh.visible = n > 0;
    markDirty();
  }
  // ---------- the ground-mounted PV field ----------
  const FIELD = { cx: 215, cy: -405, w: 110, h: 70, tilt: 20, W: 11.4, L: 3.4, pitch: 7.0 };
  function fieldTables() {
    if (S.field) return S.field;
    const T = [],
      k = (FIELD.tilt * Math.PI) / 180;
    const nx = Math.floor(FIELD.w / (FIELD.W + 0.6)),
      ny = Math.floor(FIELD.h / FIELD.pitch);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const x = FIELD.cx - FIELD.w / 2 + (i + 0.5) * (FIELD.W + 0.6),
          y = FIELD.cy - FIELD.h / 2 + (j + 0.5) * FIELD.pitch;
        const z = hAt(x, y) + 1.1;
        const m = new THREE.Matrix4().makeBasis(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, Math.cos(k), Math.sin(k)), // normal up and to the south (site −y = three +z)
          new THREE.Vector3(0, Math.sin(k), -Math.cos(k))
        );
        m.setPosition(site3(x, y, z));
        T.push({ m, j, i });
      }
    // fill from the south edge up, in rows, so that the park grows row by row
    T.sort((a, b) => a.j - b.j || a.i - b.i);
    S.field = { T, kwp: T.length * 20 * MOD.kwp, ha: (FIELD.w * FIELD.h) / 1e4 };
    return S.field;
  }
  function fieldShare(share) {
    const F = fieldTables();
    const n = Math.round(F.T.length * Math.max(0, Math.min(1, share)));
    if (!n && !S.fieldMesh) return;
    if (!S.fieldMesh) {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(FIELD.W, 0.06, FIELD.L), mats().pv, F.T.length);
      im.castShadow = false;
      im.frustumCulled = false;
      im.userData.noMerge = true;
      im.name = 'zukunft:pv-park';
      F.T.forEach((x, i) => im.setMatrixAt(i, x.m));
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
      S.fieldMesh = im;
    }
    S.fieldMesh.count = n;
    S.fieldMesh.visible = n > 0;
    markDirty();
  }
  // ---------- heat pump units at the houses ----------
  function wpUnits() {
    if (S.wp) return S.wp;
    const V = G('VILLAGE'),
      U = [];
    const hs = (V && V.bld ? V.bld : []).filter(
      b => b.typ === 0 && Math.hypot(b.cx - ANGER[0], b.cy - ANGER[1]) < 380 && b.quads && b.quads.length
    );
    hs.sort((a, b) => hash(a.id * 31 + 7) - hash(b.id * 31 + 7));
    for (const b of hs.slice(0, 60)) {
      let q = b.quads[0];
      for (const x of b.quads) if (x.len > q.len) q = x;
      const dx = (q.bx - q.ax) / q.len,
        dy = (q.by - q.ay) / q.len;
      let nx = -dy,
        ny = dx;
      const mx = (q.ax + q.bx) / 2,
        my = (q.ay + q.by) / 2;
      if (nx * (mx - b.cx) + ny * (my - b.cy) < 0) {
        nx = -nx;
        ny = -ny;
      }
      const x = mx + nx * 0.55,
        y = my + ny * 0.55,
        z = hAt(x, y);
      const rot = Math.atan2(dy, dx);
      const m = new THREE.Matrix4().compose(
        site3(x, y, z + 0.38),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot),
        new THREE.Vector3(1, 1, 1)
      );
      U.push({ m, id: b.id });
    }
    S.wp = U;
    return U;
  }
  function wpCount(n) {
    const U = wpUnits();
    const k = Math.min(U.length, Math.max(0, Math.round(n)));
    if (!k && !S.wpMesh) return;
    if (!S.wpMesh) {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.75, 0.38), mats().wp, Math.max(1, U.length));
      im.frustumCulled = false;
      im.userData.noMerge = true;
      im.name = 'zukunft:waermepumpen';
      U.forEach((x, i) => im.setMatrixAt(i, x.m));
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
      S.wpMesh = im;
    }
    S.wpMesh.count = k;
    S.wpMesh.visible = k > 0;
    markDirty();
  }
  // ---------- the Mitfahrbank (the village office's own builder) and the Rufbus ----------
  function bank(on) {
    const A = G('AMTWORLD');
    if (!A || !A.S) return false;
    if (on) {
      if (A.S.items.mitfahrbank) return true;
      try {
        A.refresh({ built: { mitfahrbank: 0 } }, 1e9);
      } catch (e) {
        console.warn('zukunft bank', e);
      }
      S.bankMine = !!A.S.items.mitfahrbank;
      return S.bankMine;
    }
    if (S.bankMine && A.S.items.mitfahrbank) {
      scene.remove(A.S.items.mitfahrbank.g);
      delete A.S.items.mitfahrbank;
    }
    S.bankMine = false;
    return true;
  }
  function busStop() {
    const B = G('BUS'),
      bp = B && B.plan;
    const st = bp && bp.ready ? bp.S.stations.find(s => /Schulbushaltestelle/.test(s.n)) : null;
    const p = st && st.pl[0];
    return p
      ? { x: p.x, y: p.y, az: p.az, gx: p.gx, gy: p.gy }
      : { x: 247.7, y: -103.9, az: 289, gx: 248.8, gy: -100.8 };
  }
  function rufbus(on) {
    if (!on) {
      if (S.van) S.van.visible = false;
      return;
    }
    if (!S.van) {
      const V = G('VPROPS');
      const M = mats(),
        g = new THREE.Group();
      g.name = 'zukunft:rufbus';
      const s = busStop();
      const ang = ((90 - s.az) * Math.PI) / 180; // compass to maths angle
      const z0 = KERN.terrain ? KERN.terrain(s.x, s.y) : hAt(s.x, s.y);
      if (V && V.kit) {
        const k = V.kit();
        const c = Math.cos(ang),
          sn = Math.sin(ang);
        // minibus: white body, dark windows, four wheels – 5,6 × 2,0 × 2,4 m, standing at the stop (in front of the sign)
        const bx = s.x - c * 6,
          by = s.y - sn * 6;
        const zb = (KERN.terrain ? KERN.terrain(bx, by) : z0) + 0.35;
        k.box(bx, by, zb, 5.6, 2.0, 1.55, ang, C(0.93, 0.94, 0.95), true);
        k.box(bx + c * 0.2, by + sn * 0.2, zb + 1.55, 4.8, 1.9, 0.5, ang, C(0.9, 0.92, 0.93), true);
        k.box(bx, by, zb + 1.0, 4.6, 2.03, 0.55, ang, C(0.08, 0.1, 0.12), true);
        k.box(bx + c * 2.9, by + sn * 2.9, zb + 0.3, 0.2, 1.9, 0.5, ang, C(0.2, 0.2, 0.22), true);
        for (const [u, v] of [
          [1.8, 0.95],
          [1.8, -0.95],
          [-1.8, 0.95],
          [-1.8, -0.95],
        ])
          k.box(bx + c * u - sn * v, by + sn * u + c * v, zb - 0.35, 0.8, 0.28, 0.7, ang, C(0.05, 0.05, 0.06), true);
        // the sign's post at the kerb
        const px = s.gx + (s.gx - s.x) * 0.5,
          py = s.gy + (s.gy - s.y) * 0.5,
          pz = KERN.terrain ? KERN.terrain(px, py) : z0;
        k.box(px, py, pz, 0.08, 0.08, 2.3, 0, C(0.4, 0.4, 0.42), true);
        const me = new THREE.Mesh(k.geo(), M.vcol);
        me.userData.noMerge = true;
        me.frustumCulled = false;
        g.add(me);
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), M.sign);
        const nxv = s.x - s.gx,
          nyv = s.y - s.gy,
          nl = Math.hypot(nxv, nyv) || 1;
        plate.position.set(px + (nxv / nl) * 0.06, pz + 2.1, -(py + (nyv / nl) * 0.06));
        plate.rotation.y = Math.atan2(nxv / nl, nyv / nl); // faces the road (three: +z is south)
        plate.rotation.y = Math.atan2(nxv / nl, -(nyv / nl));
        g.add(plate);
      }
      scene.add(g);
      S.van = g;
    }
    S.van.visible = true;
    markDirty();
  }
  // ---------- the Schleuse's flood: a ribbon along the valley floor whose edges follow the terrain ----------
  // a rough line of the valley (site metres, read from the aerial photo), refined to the lowest ground across it
  const RIVER = [
    [-251, 343],
    [-109, 276],
    [0, 201],
    [100, 117],
    [192, 59],
    [240, 14],
    [300, 4],
    [360, 0],
    [451, -46],
    [510, -100],
  ];
  function riverLine() {
    if (S.river) return S.river;
    // resample every 10 m
    let P = [];
    for (let i = 0; i + 1 < RIVER.length; i++) {
      const a = RIVER[i],
        b = RIVER[i + 1],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.max(1, Math.round(L / 10));
      for (let k = 0; k < n; k++) P.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    P.push(RIVER[RIVER.length - 1].slice());
    for (let pass = 0; pass < 2; pass++) {
      const Q = P.map((p, i) => {
        const a = P[Math.max(0, i - 1)],
          b = P[Math.min(P.length - 1, i + 1)],
          dx = b[0] - a[0],
          dy = b[1] - a[1],
          l = Math.hypot(dx, dy) || 1,
          nx = -dy / l,
          ny = dx / l;
        let best = 0,
          bh = 1e9;
        for (let s = -30; s <= 30; s += 3) {
          const h = hAt(p[0] + nx * s, p[1] + ny * s);
          if (h < bh - 1e-6) {
            bh = h;
            best = s;
          }
        }
        return [p[0] + nx * best, p[1] + ny * best];
      });
      // smooth
      P = Q.map((p, i) => {
        const a = Q[Math.max(0, i - 2)],
          b = Q[Math.min(Q.length - 1, i + 2)];
        return [(a[0] + p[0] * 2 + b[0]) / 4, (a[1] + p[1] * 2 + b[1]) / 4];
      });
    }
    S.river = P;
    return P;
  }
  function floodBuild(level) {
    const P = riverLine(),
      pos = [],
      idx = [];
    // the surface follows the valley floor's fall (a smoothed bed) plus the level
    const bed = P.map(p => hAt(p[0], p[1]));
    const sm = bed.map((h, i) => {
      let s = 0,
        n = 0;
      for (let k = -4; k <= 4; k++) {
        const j = Math.max(0, Math.min(bed.length - 1, i + k));
        s += bed[j];
        n++;
      }
      return Math.min(h, s / n) + 0;
    });
    // cross-sections: how far the level reaches to each side (at most 28 m: a 10 m height model spreads water too wide)
    const MAXW = 28,
      nrm0 = P.map((p, i) => {
        const a = P[Math.max(0, i - 1)],
          b = P[Math.min(P.length - 1, i + 1)],
          dx = b[0] - a[0],
          dy = b[1] - a[1],
          l = Math.hypot(dx, dy) || 1;
        return [-dy / l, dx / l];
      }),
      reach = (i, sgn) => {
        const p = P[i],
          z = sm[i] + level;
        let w = 0;
        for (let q = 2; q <= MAXW; q += 2) {
          if (hAt(p[0] + sgn * nrm0[i][0] * q, p[1] + sgn * nrm0[i][1] * q) > z) break;
          w = q;
        }
        return Math.max(3, w);
      };
    let WL = P.map((_, i) => reach(i, 1)),
      WR = P.map((_, i) => reach(i, -1));
    // smooth the widths along the river (no fans, no sawtooth)
    for (let pass = 0; pass < 3; pass++) {
      const sm1 = W => W.map((w, i) => (W[Math.max(0, i - 1)] + 2 * w + W[Math.min(W.length - 1, i + 1)]) / 4);
      WL = sm1(WL);
      WR = sm1(WR);
    }
    let prev = -1;
    P.forEach((p, i) => {
      const [nx, ny] = nrm0[i],
        zz = sm[i] + level + 0.02;
      pos.push(p[0] + nx * WL[i], zz, -(p[1] + ny * WL[i]), p[0] - nx * WR[i], zz, -(p[1] - ny * WR[i]));
      if (prev >= 0) {
        const k = i * 2;
        idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
      }
      prev = i;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // normals up (the strip may be wound either way)
    const nrm = g.attributes.normal;
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
    return g;
  }
  function flood(level) {
    if (!(level > 0)) {
      if (S.floodMesh) S.floodMesh.visible = false;
      S.floodLevel = 0;
      return;
    }
    if (Math.abs((S.floodLevel || 0) - level) < 0.01 && S.floodMesh) {
      S.floodMesh.visible = true;
      return;
    }
    const g = floodBuild(level);
    if (!S.floodMesh) {
      S.floodMesh = new THREE.Mesh(g, mats().water);
      S.floodMesh.frustumCulled = false;
      S.floodMesh.userData.noMerge = true;
      S.floodMesh.renderOrder = 3;
      S.floodMesh.name = 'zukunft:hochwasser';
      scene.add(S.floodMesh);
    } else {
      S.floodMesh.geometry.dispose();
      S.floodMesh.geometry = g;
    }
    S.floodMesh.visible = true;
    S.floodLevel = level;
    markDirty();
  }
  // ---------- the spruce stand: struck, cleared, growing again ----------
  const TINT = { red: [1.55, 0.74, 0.4], grey: [0.82, 0.78, 0.72] };
  function forestInit() {
    if (S.forest) return S.forest;
    const F = G('FOREST');
    const L = F && F.list ? F.list.filter(t => t.sp === 'spruce' && !t.gone) : [];
    // rank of every spruce on a mix of chance and place (neighbours die together), as a share 0–1
    const sc = L.map((t, i) => ({ i, s: 0.5 * hash(t.id * 13 + 5) + 0.5 * noise(t.x / 55, t.y / 55) }));
    sc.sort((a, b) => a.s - b.s);
    const rank = new Float32Array(L.length);
    sc.forEach((o, r) => (rank[o.i] = (r + 0.5) / L.length));
    S.forest = {
      L,
      rank,
      orig: L.map(t => ({ h: t.h, w: t.w, tint: t.tint || null })),
      code: new Int16Array(L.length).fill(-1),
      hh: new Float32Array(L.length),
    };
    return S.forest;
  }
  function noise(x, y) {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      fx = x - xi,
      fy = y - yi;
    const s = t => t * t * (3 - 2 * t);
    const v = (a, b) => hash(a * 73856093 + b * 19349663 + 11);
    const a = v(xi, yi),
      b = v(xi + 1, yi),
      c = v(xi, yi + 1),
      d = v(xi + 1, yi + 1);
    return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
  }
  // what a tree shows in year y: { code, h, w, tint }
  function treeState(Fo, i, mode, y, dry) {
    const t = Fo.L[i],
      o = Fo.orig[i];
    if (mode) {
      const a = y - ZKDATA.strikeYear(Fo.rank[i]);
      if (a >= 0 && a < 1) return { code: 1, h: o.h, w: o.w, tint: TINT.red };
      if (a >= 1 && a < ZKDATA.LAG) return { code: 2, h: o.h, w: o.w, tint: TINT.grey };
      if (a >= ZKDATA.LAG) {
        const occ = hash(t.id * 29 + 3) < ZKDATA.OCC[mode];
        const age = a - ZKDATA.LAG;
        if (!occ) return { code: 3, h: o.h * 0.004, w: o.w, tint: null };
        const h = Math.max(0.2, ZKDATA.regrow[mode](age));
        const broad = mode === 'natur' ? true : hash(t.id * 37 + 1) < 0.55;
        const tint = mode === 'natur' ? [0.95, 1.3, 0.55] : broad ? [0.85, 1.2, 0.5] : [0.8, 1.0, 0.8];
        return { code: 4 + Math.min(40, Math.round(h * 2)) + (broad ? 100 : 0), h, w: o.w * 0.55, tint };
      }
    }
    if (dry > 0 && hash(t.id * 41 + 9) < dry * 0.5) return { code: 900, h: o.h, w: o.w, tint: [1.2, 1.05, 0.62] };
    return { code: 0, h: o.h, w: o.w, tint: o.tint };
  }
  function forest(mode, y, dry) {
    const F = G('FOREST');
    if (!F || !F.tint || !F.retilt) return 0;
    if (!mode && !dry && !S.forest) return 0;
    const Fo = forestInit();
    let n = 0;
    for (let i = 0; i < Fo.L.length; i++) {
      const st = treeState(Fo, i, mode, y, dry);
      if (st.code === Fo.code[i]) continue;
      const t = Fo.L[i];
      Fo.code[i] = st.code;
      n++;
      F.tint(t, st.tint);
      if (st.h !== t.h || st.w !== t.w) {
        t.h = st.h;
        t.w = st.w;
        F.retilt(t);
      }
    }
    if (n) markDirty(true);
    return n;
  }
  // ---------- the dry ground, the weather ----------
  function dry(v) {
    WXBODEN.setDry(v);
  }
  function weather(name) {
    const W = G('WETTER');
    if (!W || !W.preset) return;
    if (name) {
      if (!S.weatherMine) {
        S.weatherMine = true;
        S.weatherPrev = (W.S && W.S.preset) || null;
      }
      W.preset(name);
    } else if (S.weatherMine) {
      W.preset(S.weatherPrev);
      S.weatherMine = false;
    }
  }
  // ---------- the whole description of the world (from ZKDATA.calc(...).world) ----------
  function apply(w, year) {
    warm();
    w = w || {};
    const sig = JSON.stringify([
      w.pvRoof,
      w.pvField,
      w.wp,
      w.bank,
      w.rufbus,
      w.flood,
      w.dry,
      w.rain,
      w.forest && w.forest.mode,
      year,
    ]);
    if (sig === S.sig.all) return false;
    S.sig.all = sig;
    roofShare(w.pvRoof || 0);
    fieldShare(w.pvField || 0);
    wpCount(w.wp || 0);
    bank(!!w.bank);
    rufbus(!!w.rufbus);
    flood(w.flood || 0);
    dry(w.dry || 0);
    weather(w.rain || null);
    forest(w.forest ? w.forest.mode : null, year, w.dry || 0);
    S.state = w;
    return true;
  }
  function clear() {
    S.sig.all = null;
    if (S.roofMesh) S.roofMesh.visible = false;
    if (S.fieldMesh) S.fieldMesh.visible = false;
    if (S.wpMesh) S.wpMesh.visible = false;
    if (S.van) S.van.visible = false;
    if (S.floodMesh) S.floodMesh.visible = false;
    S.floodLevel = 0;
    bank(false);
    dry(0);
    weather(null);
    forest(null, 2026, 0);
    // trees back to what they were
    if (S.forest) {
      const Fo = S.forest,
        F = G('FOREST');
      for (let i = 0; i < Fo.L.length; i++) {
        const t = Fo.L[i],
          o = Fo.orig[i];
        if (t.h !== o.h || t.w !== o.w) {
          t.h = o.h;
          t.w = o.w;
          F.retilt(t);
        }
      }
    }
    S.state = {};
    markDirty(true);
  }
  // ---------- what the world tells the numbers ----------
  function busStats() {
    const B = G('BUS'),
      bp = B && B.plan;
    if (!bp || !bp.S) return null;
    if (!bp.S.stations.length || !bp.S.trips.length) {
      // the timetable loads lazily: ask for it, the mode refreshes on 'bus:bereit'
      try {
        if (B && B.load) B.load();
      } catch (e) {}
      return null;
    }
    const rat = new Set(bp.S.stations.filter(x => /^Ratscher\b/.test(x.n) && !/Stausee/.test(x.n)).map(x => x.i)),
      sch = new Set(bp.S.stations.filter(x => /^Schleusingen\b/.test(x.n)).map(x => x.i));
    const e0 = (DN && Number.isFinite(DN.e0) ? DN.e0 : 20393) + Math.floor(((CLOCK && CLOCK.t) || 0) / 1440);
    const out = { werk: 0, sa: 0, so: 0, min: 0, src: 'fahrplan' };
    const want = { werk: 3, sa: 6, so: 0 };
    for (const k of Object.keys(want)) {
      for (let d = 0; d < 14; d++) {
        const e = e0 + d;
        if (new Date(e * 864e5).getUTCDay() !== want[k]) continue;
        let n = 0,
          tot = 0;
        for (const t of bp.tripsOn(e)) {
          const P = bp.S.pats[t.pat];
          if (!P) continue;
          // from the first Ratscher stop to the last Schleusingen stop of the trip (the centre, where the way leads)
          let k1 = -1,
            k2 = -1;
          for (let j = 0; j < P.st.length; j++) {
            if (k1 < 0 && rat.has(P.st[j].s)) k1 = j;
            else if (k1 >= 0 && sch.has(P.st[j].s)) k2 = j;
          }
          if (k2 > k1 && k1 >= 0) {
            n++;
            tot += (t.a[k2] - t.d[k1]) | 0;
          }
        }
        out[k] = n;
        if (k === 'werk' && n) out.min = Math.round(tot / n);
        break;
      }
    }
    return out;
  }
  function ctx() {
    const R = scanRoofs(),
      F = fieldTables(),
      Fo = G('FOREST');
    const c = {
      roof: { kwp: R.kwp, area: R.area, n: R.n, src: 'welt' },
      field: { kwp: F.kwp, ha: F.ha, src: 'welt' },
    };
    const b = busStats();
    if (b) c.bus = b;
    try {
      if (G('TEINFLUSS') && TEINFLUSS.naturwert) c.nat0 = TEINFLUSS.naturwert();
    } catch (e) {}
    if (Fo && Fo.list) {
      const sp = Fo.list.filter(t => t.sp === 'spruce').length;
      c.forest = { ha: 16.8, spruce: sp / Math.max(1, Fo.list.length) };
    }
    return c;
  }
  function stats() {
    const cnt = m => (m && m.visible ? m.count : 0);
    const Fo = S.forest;
    const codes = {};
    if (Fo)
      for (const c of Fo.code)
        codes[
          c < 0
            ? 'x'
            : c === 0
              ? 'ok'
              : c === 1
                ? 'rot'
                : c === 2
                  ? 'grau'
                  : c === 3
                    ? 'kahl'
                    : c === 900
                      ? 'stress'
                      : 'jung'
        ] =
          (codes[
            c < 0
              ? 'x'
              : c === 0
                ? 'ok'
                : c === 1
                  ? 'rot'
                  : c === 2
                    ? 'grau'
                    : c === 3
                      ? 'kahl'
                      : c === 900
                        ? 'stress'
                        : 'jung'
          ] || 0) + 1;
    return {
      roofModules: cnt(S.roofMesh),
      roofTotal: S.roof ? S.roof.mods.length : 0,
      fieldTables: cnt(S.fieldMesh),
      fieldTotal: S.field ? S.field.T.length : 0,
      wp: cnt(S.wpMesh),
      van: !!(S.van && S.van.visible),
      bank: !!(G('AMTWORLD') && AMTWORLD.S.items.mitfahrbank),
      flood: S.floodMesh && S.floodMesh.visible ? S.floodLevel : 0,
      forest: codes,
      warmed: S.warmed,
      dry: WXBODEN.S.dry,
    };
  }
  return {
    warm,
    apply,
    clear,
    ctx,
    stats,
    scanRoofs,
    fieldTables,
    busStats,
    FIELD,
    MOD,
    S,
    treeCodes: () => (S.forest ? S.forest.code : null),
  };
})();
window.ZKWELT = ZKWELT;
