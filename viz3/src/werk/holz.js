// ===================== V16d wood, part 1: the logs from the Klinge (HOLZ) – lying, on the fork, on the trailer, at the log yard =====================
// The measured logs of world/fell.js (FELL.logs: species, length, diameters, volume, quality, where they lie) become objects of their own:
// drawn as tapered stems with bark and fresh end grain – instanced, two draw calls per species for all logs – and moved with the tractor's
// pallet fork: tines low (G), drive under the log (across the tines), lift (R) – it lies on the tines; lower it over the ground, another log,
// the trailer's bed (between the stakes it rolls into the lowest gap) or the band sawmill's bunks, and it stays there. Tilt the fork back (T)
// before driving: a log on level tines rolls off when braking hard. A log on the fork is as wide as it is long – it bumps into trunks and
// walls like the vehicles (VEH.boxHits). Weights from the green density (spruce ~780, larch ~820 kg/m³); the trailer pulls them (TRAILER.cargo).
// State in 'pav-holz-v1'. Part 2 (werk/holz_saw.js): the band sawmill and the boards; part 3 (werk/holz_dry.js): stacking and drying.
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { LOAD, markDirty } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { BUILD, COL } from '../core/geo.js';
import { P, rebuildGrids } from '../game/walkable.js';
import { news } from '../audio/audio.js';
import { PLAY, SFX } from '../game/play.js';
import { FOREST } from '../world/forest.js';
import { VSND } from '../vehicles/vsound.js';
import { VEH } from '../vehicles/vehicle.js';
import { TRACTOR2 } from '../vehicles/tractor.js';
import { TRAILER } from '../vehicles/trailer.js';
import { FELL } from '../world/fell.js';
export const HOLZ = (() => {
  const LSK = 'pav-holz-v1',
    D2R = Math.PI / 180;
  const S = { logs: [], by: {}, ready: false, ver: 0, fork: null, RHO: { spruce: 780, larch: 820, pine: 800 } };
  const SPN = { spruce: 'Fichte', larch: 'Lärche', pine: 'Kiefer' };
  const think = (t, ms) => PLAY.think(t, ms);
  const de = (v, d = 1) => Number(v).toFixed(d).replace('.', ',');
  const mw = v => [v.x, -v.z, v.y]; // three.js → model frame (x, y, z up)
  S.mass = l => Math.round((Math.PI / 4) * (l.dm / 100) ** 2 * l.L * (S.RHO[l.sp] || 800));
  const rOf = l => [l.d0 / 200, l.d1 / 200];
  // ---------------- drawing: per species an instanced bark mesh and an instanced end-grain mesh (unit stem along +y, shaped in the shader) ----------------
  const NS = 18,
    CAP = 200;
  const sideGeo = (() => {
    const p = [],
      n = [],
      uv = [],
      idx = [];
    for (const t of [0, 1])
      for (let j = 0; j <= NS; j++) {
        const a = (j / NS) * Math.PI * 2;
        p.push(Math.cos(a), t, Math.sin(a));
        n.push(Math.cos(a), 0, Math.sin(a));
        uv.push(j / NS, t);
      }
    for (let j = 0; j < NS; j++) {
      const a = j,
        b = j + NS + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  })();
  const capGeo = (() => {
    const p = [],
      n = [],
      uv = [],
      idx = [];
    for (const [t, ny] of [
      [0, -1],
      [1, 1],
    ]) {
      const c = p.length / 3;
      p.push(0, t, 0);
      n.push(0, ny, 0);
      uv.push(0.5, 0.5);
      for (let j = 0; j <= NS; j++) {
        const a = (j / NS) * Math.PI * 2;
        p.push(Math.cos(a), t, Math.sin(a));
        n.push(0, ny, 0);
        uv.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
      }
      for (let j = 0; j < NS; j++) ny < 0 ? idx.push(c, c + 1 + j, c + 2 + j) : idx.push(c, c + 2 + j, c + 1 + j);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  })();
  // the stem's shape from the instance: radius at the butt and the top, length, a phase for the bark
  const VSHAPE = `float rr = mix( iLog.x, iLog.y, position.y ); vec3 transformed = vec3( position.x * rr, position.y * iLog.z, position.z * rr );`;
  function patchShape(sh, bark, tile) {
    sh.vertexShader = 'attribute vec4 iLog;\n' + sh.vertexShader.replace('#include <begin_vertex>', VSHAPE);
    if (bark) {
      sh.vertexShader = sh.vertexShader
        .replace(
          '#include <beginnormal_vertex>',
          'vec3 objectNormal = normalize( vec3( normal.x, ( iLog.x - iLog.y ) / max( iLog.z, 0.1 ), normal.z ) );\n#ifdef USE_TANGENT\n vec3 objectTangent = vec3( tangent.xyz );\n#endif'
        )
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
        vec2 bUv = vec2( uv.x * 6.2832 * ( iLog.x + iLog.y ) * 0.5 / ${tile.toFixed(3)} + iLog.w, uv.y * iLog.z / ${tile.toFixed(3)} );
        #ifdef USE_MAP
          vMapUv = bUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = bUv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = bUv;
        #endif`
        );
    }
  }
  const SP = {};
  function species(sp) {
    if (SP[sp]) return SP[sp];
    const B = window.FOREST && FOREST.barkMap ? FOREST.barkMap(sp) : null,
      tile = 0.62;
    const bark = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: B && B.map,
      normalMap: B && B.nrm,
      roughnessMap: B && B.orm,
      roughness: 1,
      envMapIntensity: 0.55,
    });
    bark.onBeforeCompile = sh => patchShape(sh, true, tile);
    bark.customProgramCacheKey = () => 'holzBark';
    const EG = window.FELL && FELL.endGrain ? FELL.endGrain(sp) : null;
    const end = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: EG && EG.map ? EG.map : null,
      roughness: 0.82,
      envMapIntensity: 0.5,
    });
    if (EG && !EG.map && EG.isMaterial) {
      end.map = EG.map || null;
      end.color.copy(EG.color || new THREE.Color(0xffffff));
    }
    end.onBeforeCompile = sh => patchShape(sh, false);
    end.customProgramCacheKey = () => 'holzEnd';
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = sh => patchShape(sh, false);
    depth.customProgramCacheKey = () => 'holzDepth';
    const iLog = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4);
    iLog.setUsage(THREE.DynamicDrawUsage);
    const sg = sideGeo.clone(),
      cg = capGeo.clone();
    sg.setAttribute('iLog', iLog);
    cg.setAttribute('iLog', iLog);
    const mS = new THREE.InstancedMesh(sg, bark, CAP),
      mC = new THREE.InstancedMesh(cg, end, CAP);
    mC.instanceMatrix = mS.instanceMatrix;
    mS.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (const m of [mS, mC]) {
      m.count = 0;
      m.frustumCulled = false;
      m.castShadow = true;
      m.receiveShadow = true;
      m.customDepthMaterial = depth;
      m.userData.noMerge = true;
      scene.add(m);
    }
    mS.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3).fill(1), 3);
    return (SP[sp] = { mS, mC, iLog, list: [] });
  }
  // the end grain from world/fell.js is a material (canvas map); wrap it once
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _q2 = new THREE.Quaternion(),
    _v = new THREE.Vector3(),
    _v2 = new THREE.Vector3(),
    _y = new THREE.Vector3(0, 1, 0),
    _one = new THREE.Vector3(1, 1, 1);
  // world matrix of a log: butt at p0, top at p1 (model frame) – or from its carrier (fork, trailer) and its local pose there
  function logMatrix(l, out) {
    const P0 = l.wp0,
      P1 = l.wp1;
    _v.copy(V(P0[0], P0[1], P0[2]));
    _v2
      .copy(V(P1[0], P1[1], P1[2]))
      .sub(_v)
      .normalize();
    _q.setFromUnitVectors(_y, _v2);
    _q2.setFromAxisAngle(_y, (l.seed || 0) * 6.28);
    _q.multiply(_q2);
    return out.compose(_v, _q, _one);
  }
  function redraw() {
    for (const k of Object.keys(SP)) SP[k].list.length = 0;
    for (const l of S.logs) {
      if (l.st === 'sawn' || l.hide) continue;
      species(l.sp).list.push(l);
    }
    for (const [sp, G] of Object.entries(SP)) {
      const n = Math.min(CAP, G.list.length);
      G.mS.count = G.mC.count = n;
      G.list.forEach((l, i) => {
        if (i >= CAP) return;
        l.ii = i;
        l.isp = sp;
        place(l);
        const [r0, r1] = rOf(l);
        G.iLog.setXYZW(i, r0, r1, l.L, l.seed || 0);
        const tint = l.tint || 1;
        G.mS.instanceColor.setXYZ(i, tint, tint * 0.97, tint * 0.94);
      });
      G.iLog.needsUpdate = true;
      G.mS.instanceMatrix.needsUpdate = true;
      G.mS.instanceColor.needsUpdate = true;
    }
    markDirty(true);
  }
  // world ends of a log from where it is
  function place(l) {
    const G = SP[l.isp];
    if (!G) return;
    if (l.st === 'ground' || l.st === 'saw' || l.st === 'winch' || l.st === 'crane') {
      l.wp0 = l.p0;
      l.wp1 = l.p1;
    } else if (l.st === 'fork' && S.forkObj()) {
      const F = S.forkObj(),
        M = F.tool.matrixWorld;
      const a = new THREE.Vector3(...l.f0).applyMatrix4(M),
        b = new THREE.Vector3(...l.f1).applyMatrix4(M);
      l.wp0 = mw(a);
      l.wp1 = mw(b);
    } else if (l.st === 'trailer' && window.TRAILER) {
      TRAILER.g.updateWorldMatrix(true, false); // V16h: placed or moved since the last frame (tests, the crane) – not last frame's matrix
      const M = TRAILER.g.matrixWorld,
        z = TRAILER.bed.z + l.tz,
        a = V(l.tx, l.ta + l.L / 2, z).applyMatrix4(M),
        b = V(l.tx, l.ta - l.L / 2, z).applyMatrix4(M);
      l.wp0 = mw(a);
      l.wp1 = mw(b);
    }
    if (!l.wp0) {
      l.wp0 = l.p0;
      l.wp1 = l.p1;
    }
    logMatrix(l, _m);
    G.mS.setMatrixAt(l.ii, _m);
  }
  function moveTick() {
    let moved = false;
    for (const l of S.logs) {
      if (l.st !== 'fork' && l.st !== 'trailer') continue;
      place(l);
      moved = true;
    }
    if (moved) {
      for (const G of Object.values(SP)) G.mS.instanceMatrix.needsUpdate = true;
    }
  }
  // ---------------- from the felling: adopt the measured logs ----------------
  function adopt() {
    if (!window.FELL || !FELL.logs) return false;
    let n = 0;
    for (const f of FELL.logs) {
      if (S.by[f.id] || !f.at) continue;
      const r = (f.d0 + f.d1) / 400;
      const l = {
        id: f.id,
        tid: f.tid,
        sp: f.sp,
        L: f.L,
        d0: f.d0,
        d1: f.d1,
        dm: f.dm,
        vol: f.vol,
        q: f.q,
        i: f.i,
        st: 'ground',
        seed: ((f.tid * 7 + f.i * 13) % 97) / 97,
        tint: 0.92 + ((f.tid * 3 + f.i) % 7) * 0.02,
        p0: [f.at.x0, f.at.y0, f.at.z0],
        p1: [f.at.x1, f.at.y1, f.at.z1],
      };
      S.logs.push(l);
      S.by[l.id] = l;
      n++;
      if (FELL.hideLogs) FELL.hideLogs(f.tid);
    }
    if (n) {
      redraw();
      save();
    }
    return n > 0;
  }
  // ---------------- the tractor's fork ----------------
  S.forkObj = () => window.TRACTOR2 && TRACTOR2.model && TRACTOR2.model.fork;
  const LDof = () => TRACTOR2.model.LD;
  // a log's axis in the fork's frame (three.js local: x across, y up, −z along the tines)
  const _inv = new THREE.Matrix4(),
    _a = new THREE.Vector3(),
    _b = new THREE.Vector3();
  function inFork(l, F) {
    _inv.copy(F.tool.matrixWorld).invert();
    _a.copy(V(...l.wp0)).applyMatrix4(_inv);
    _b.copy(V(...l.wp1)).applyMatrix4(_inv);
    const c = _a.clone().add(_b).multiplyScalar(0.5),
      d = _b.clone().sub(_a);
    const len = d.length();
    d.divideScalar(len || 1);
    return { c, d, len };
  }
  // is a log free to take (nothing lies on it)?
  const coveredBy = l =>
    S.logs.find(o => o !== l && o.st === l.st && o.st !== 'fork' && o.st !== 'sawn' && restsOn(o, l));
  function restsOn(o, l) {
    if (l.st === 'trailer') return o.tz > l.tz + 0.05 && Math.abs(o.tx - l.tx) < (rOf(o)[0] + rOf(l)[0]) * 0.98;
    if (l.st !== 'ground') return false;
    const mo = mid(o),
      ml = mid(l);
    return mo[2] > ml[2] + 0.08 && Math.hypot(mo[0] - ml[0], mo[1] - ml[1]) < (o.d0 + l.d0) / 200 + 0.05;
  }
  const mid = l => [(l.wp0[0] + l.wp1[0]) / 2, (l.wp0[1] + l.wp1[1]) / 2, (l.wp0[2] + l.wp1[2]) / 2];
  let prevLift = null,
    hintT = 0,
    liftFrom = null;
  function forkTick(dt) {
    const F = S.forkObj();
    if (!F) return;
    const LD = LDof();
    F.tool.updateWorldMatrix(true, false);
    const dl = prevLift == null ? 0 : LD.lift - prevLift;
    prevLift = LD.lift;
    const carry = S.logs.find(l => l.st === 'fork');
    if (dl <= 1e-4) liftFrom = null;
    else if (liftFrom == null) liftFrom = LD.lift - dl;
    if (!carry && dl > 1e-4) {
      // lifting: does a log lie on the tines now?
      let best = null,
        bs = 1e9;
      for (const l of S.logs) {
        if (!(l.st === 'ground' || l.st === 'trailer' || l.st === 'saw') || !l.wp0) continue;
        const m = mid(l),
          tp = TRACTOR2.st;
        if (Math.hypot(m[0] - tp.x, m[1] - tp.y) > 9) continue;
        const q = inFork(l, F),
          r = (l.d0 + l.d1) / 400,
          along = -q.c.z;
        if (Math.abs(q.d.x) < 0.8) continue;
        if (Math.abs(q.c.x) > (q.len / 2) * Math.abs(q.d.x) - 0.45) continue;
        if (along < 0.12 || along > F.y1 - 0.04) continue;
        if (q.c.y - r > F.top + 0.04 || q.c.y < F.top - r * 0.75) continue;
        if (coveredBy(l)) continue;
        const sc = Math.abs(q.c.x) + Math.abs(along - 0.6);
        if (sc < bs) {
          bs = sc;
          best = { l, q, r };
        }
      }
      if (best) pick(best.l, best.q, F);
      else if (liftFrom != null && LD.lift - liftFrom > 0.12 && LD.lift - liftFrom - dl <= 0.12) whyNot(F);
    }
    if (carry) {
      if (dl < -1e-4) dropCheck(carry, F);
      else carryCheck(carry, dt);
    }
  }
  // V16h: the fork lifted and nothing came up – say why (Falko 23.10. 2:24: the log stayed where it was, without a word)
  function whyNot(F) {
    const c = new THREE.Vector3(0, F.top, -(F.y0 + F.y1) / 2).applyMatrix4(F.tool.matrixWorld),
      cx = c.x,
      cy = -c.z;
    let best = null,
      bd = 3.5;
    for (const l of S.logs) {
      if (!['ground', 'trailer', 'saw', 'winch'].includes(l.st) || !l.wp0) continue;
      const a = l.wp0,
        b = l.wp1,
        ux = b[0] - a[0],
        uy = b[1] - a[1],
        L2 = ux * ux + uy * uy || 1,
        t = THREE.MathUtils.clamp(((cx - a[0]) * ux + (cy - a[1]) * uy) / L2, 0, 1),
        d = Math.hypot(a[0] + ux * t - cx, a[1] + uy * t - cy);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    let msg = null;
    if (!best) {
      const o = FELL.openStem ? FELL.openStem(cx, cy, 4) : null;
      if (o)
        msg = `Der Stamm ist noch nicht aufgearbeitet (${o.todo}). Erst wenn er vermessen ist (Waldbuch B), liegen die Abschnitte für die Gabel bereit.`;
    } else {
      const l = best,
        q = inFork(l, F),
        r = (l.d0 + l.d1) / 400,
        along = -q.c.z;
      if (l.st === 'winch') msg = 'Am Stamm hängt noch das Windenseil – erst den Choker lösen.';
      else if (coveredBy(l)) msg = 'Darauf liegt noch ein Stamm – erst den oberen nehmen.';
      else if (S.mass(l) > 1500) msg = `Zu schwer für die Gabel: etwa ${S.mass(l)} kg, sie trägt höchstens 1500 kg.`;
      else if (Math.abs(q.d.x) < 0.8)
        msg = 'Der Stamm liegt längs zur Gabel – die Zinken müssen quer unter ihn. Von der Seite heranfahren.';
      else if (q.c.y < F.top - r * 0.75)
        msg = 'Die Zinken sind nicht unter dem Stamm: Gabel ganz absenken (G), quer darunterfahren, dann heben (R).';
      else if (along > F.y1 - 0.04) msg = 'Noch weiter vorfahren, bis die Zinken ganz unter dem Stamm sind.';
      else if (Math.abs(q.c.x) > (q.len / 2) * Math.abs(q.d.x) - 0.45) msg = 'Den Stamm weiter in der Mitte aufnehmen.';
    }
    if (msg) warnOnce('why', msg);
  }
  function pick(l, q, F) {
    if (S.mass(l) > 1500) {
      think(`Zu schwer für die Gabel (${S.mass(l)} kg).`, 2600);
      return;
    }
    const r = (l.d0 + l.d1) / 400,
      sx = Math.sign(q.d.x) || 1,
      cx = THREE.MathUtils.clamp(q.c.x, -0.3, 0.3),
      cz = q.c.z,
      y = F.top + r;
    const from = l.st;
    if (from === 'trailer') {
      l.st = 'fork';
      trailerMass();
    }
    l.st = 'fork';
    l.f0 = [cx - (sx * l.L) / 2, y, cz];
    l.f1 = [cx + (sx * l.L) / 2, y, cz];
    l.from = from;
    place(l);
    for (const G of Object.values(SP)) G.mS.instanceMatrix.needsUpdate = true;
    SFX.drop && SFX.drop();
    if (performance.now() - hintT > 20000) {
      hintT = performance.now();
      think(
        `${SPN[l.sp] || 'Stamm'} ${de(l.L, 2)} m, Ø ${l.dm} cm – etwa ${S.mass(l)} kg auf der Gabel. Vor dem Fahren zurückkippen (T).`,
        4200
      );
    }
    S.ver++;
    save();
    markDirty(true);
  }
  // the log on the fork bumps into things: the tractor is held back; on level tines a hard stop rolls it off
  let lastSpd = 0;
  function carryCheck(l, dt) {
    const v = TRACTOR2,
      s = v.st,
      spd = s.u;
    const acc = dt > 0 ? (spd - lastSpd) / dt : 0;
    lastSpd = spd;
    if (LDof().tilt < 0.12 && (Math.abs(acc) > 3.2 || Math.abs(spd) > 4.2)) {
      rollOff(l);
      return;
    }
    const a = l.wp0,
      b = l.wp1,
      c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      ax = [b[0] - a[0], b[1] - a[1]],
      L = Math.hypot(ax[0], ax[1]) || 1,
      u = [ax[0] / L, ax[1] / L],
      r = (l.d0 + l.d1) / 400;
    const B = { c, ax: [-u[1], u[0]], ay: u, ex: r, ey: L / 2 },
      z = (a[2] + b[2]) / 2,
      hits = VEH.boxHits(B, z - r, z + r, v);
    let push = [0, 0],
      big = 0;
    for (const [h] of hits) {
      if (h.d < 0.004) continue;
      push[0] += h.n[0] * h.d;
      push[1] += h.n[1] * h.d;
      big = Math.max(big, h.d);
    }
    if (big > 0.004) {
      s.x += push[0];
      s.y += push[1];
      const f = VEH.fwd(s.psi),
        rg = VEH.rgt(s.psi),
        w = [s.u * f[0] + s.v * rg[0], s.u * f[1] + s.v * rg[1]],
        pn = Math.hypot(push[0], push[1]),
        nx = push[0] / pn,
        ny = push[1] / pn,
        into = w[0] * nx + w[1] * ny;
      if (into < 0) {
        w[0] -= into * nx;
        w[1] -= into * ny;
        s.u = w[0] * f[0] + w[1] * f[1];
        s.v = w[0] * rg[0] + w[1] * rg[1];
        if (-into > 1 && window.VSND) VSND.thud(v, Math.min(1, -into / 5));
      }
    }
  }
  function rollOff(l) {
    const a = l.wp0,
      b = l.wp1,
      s = TRACTOR2.st,
      f = VEH.fwd(s.psi),
      d = Math.sign(s.u || 1) * 0.9; // it rolls off the front of the tines
    l.st = 'ground';
    const r0 = l.d0 / 200,
      r1 = l.d1 / 200;
    l.p0 = [a[0] + f[0] * d, a[1] + f[1] * d, 0];
    l.p1 = [b[0] + f[0] * d, b[1] + f[1] * d, 0];
    l.p0[2] = support(l.p0[0], l.p0[1], l) + r0;
    l.p1[2] = support(l.p1[0], l.p1[1], l) + r1;
    redraw();
    save();
    SFX.drop && SFX.drop();
    think('Der Stamm ist von der Gabel gerollt! Mit Last die Gabel zurückkippen (T) und langsam fahren.', 4200);
  }
  // ---------------- where a lowered log comes to rest ----------------
  // the ground (or a log lying there, or the log yard's squared timbers) under a point
  function support(x, y, self) {
    let z = KERN.ground(x, y);
    for (const u of YARD.under || []) {
      const dx = x - u.x,
        dy = y - u.y,
        a = dx * u.ux + dy * u.uy,
        b = -dx * u.uy + dy * u.ux;
      if (Math.abs(a) < u.l / 2 && Math.abs(b) < 0.07) z = Math.max(z, u.z + 0.14);
    }
    for (const o of S.logs) {
      if (o === self || o.st !== 'ground' || !o.wp0) continue;
      const P = o.wp0,
        Q = o.wp1,
        ux = Q[0] - P[0],
        uy = Q[1] - P[1],
        L2 = ux * ux + uy * uy || 1;
      const t = THREE.MathUtils.clamp(((x - P[0]) * ux + (y - P[1]) * uy) / L2, 0, 1),
        px = P[0] + ux * t,
        py = P[1] + uy * t,
        rr = (o.d0 + (o.d1 - o.d0) * t) / 200,
        d = Math.hypot(x - px, y - py);
      if (d < rr * 0.98) z = Math.max(z, P[2] + (Q[2] - P[2]) * t + Math.sqrt(rr * rr - d * d));
    }
    return z;
  }
  // lowering: within this height above its rest the log comes off the tines (tilted back, they hold it higher than their heel – the heel
  // would reach the trailer's floor or the mill's bed first)
  const SETTLE = 0.3;
  S.SETTLE = SETTLE;
  function dropCheck(l, F) {
    const a = l.wp0,
      b = l.wp1,
      r0 = l.d0 / 200,
      r1 = l.d1 / 200,
      m = mid(l),
      r = (r0 + r1) / 2;
    // onto the trailer: between the stakes, along its axis
    if (window.TRAILER) {
      const T = TRAILER,
        loc = T.local ? T.local(m) : null;
      if (loc && Math.abs(loc[0]) < T.bed.hw + 0.3 && loc[1] > T.bed.y0 - 0.3 && loc[1] < T.bed.y1 + 0.3) {
        const ax = [b[0] - a[0], b[1] - a[1]],
          La = Math.hypot(ax[0], ax[1]) || 1,
          f = VEH.fwd(T.st.psi),
          cosA = Math.abs((ax[0] * f[0] + ax[1] * f[1]) / La);
        if (cosA < 0.87) {
          warnOnce('ang', 'Den Stamm längs auf den Anhänger legen (seitlich ranfahren).');
          return;
        }
        const slot = T.slot ? T.slot(loc[0], r) : null;
        if (!slot) {
          warnOnce('full', 'Der Anhänger ist voll – höher als die Rungen geht nicht.');
          return;
        }
        const zb = T.st.z + T.bed.z + slot.z - r;
        if (m[2] - r > zb + SETTLE) return; // still above the gap it would roll into
        l.st = 'trailer';
        l.tx = slot.x;
        l.tz = slot.z;
        l.ta = THREE.MathUtils.clamp(loc[1], T.bed.y0 + l.L / 2 - 0.25, T.bed.y1 - l.L / 2 + 0.2);
        trailerMass();
        done(l, 'Auf dem Anhänger.');
        return;
      }
    }
    // onto the band sawmill's bunks (part 2 knows them)
    if (window.HOLZSAW && LATE.HOLZSAW.dropOn) {
      const res = LATE.HOLZSAW.dropOn(l, a, b, m, r);
      if (res === 'wait') return;
      if (res === 'done') {
        done(l, null);
        return;
      }
    }
    // onto the ground, a log there or the yard's timbers
    const s0 = support(a[0], a[1], l),
      s1 = support(b[0], b[1], l);
    if (a[2] - r0 > s0 + SETTLE || b[2] - r1 > s1 + SETTLE) return;
    l.st = 'ground';
    l.p0 = [a[0], a[1], s0 + r0];
    l.p1 = [b[0], b[1], s1 + r1];
    restOn(l);
    done(l, YARD.inside(m) ? 'Im Holzlager.' : null);
  }
  const warned = {};
  function warnOnce(k, t) {
    if (performance.now() - (warned[k] || 0) > 6000) {
      warned[k] = performance.now();
      think(t, 3200);
    }
  }
  // a straight log rests on the highest of what is under it (the yard's timbers, another log): sampled along it, lifted as a whole
  function restOn(l) {
    const a = l.p0,
      b = l.p1,
      r0 = l.d0 / 200,
      r1 = l.d1 / 200,
      n = Math.max(10, Math.ceil(l.L / 0.05));
    let up = 0; // every 5 cm: the timbers are 14 cm wide
    for (let k = 1; k < n; k++) {
      const t = k / n,
        x = a[0] + (b[0] - a[0]) * t,
        y = a[1] + (b[1] - a[1]) * t,
        need = support(x, y, l) + r0 + (r1 - r0) * t - (a[2] + (b[2] - a[2]) * t);
      if (need > up) up = need;
    }
    if (up > 0.002) {
      a[2] += up;
      b[2] += up;
    }
  }
  function done(l, msg) {
    delete l.f0;
    delete l.f1;
    redraw();
    SFX.drop && SFX.drop();
    if (msg) think(msg, 1800);
    S.ver++;
    save();
  }
  function trailerMass() {
    if (!window.TRAILER) return;
    let kg = 0,
      h = 0;
    for (const l of S.logs)
      if (l.st === 'trailer') {
        kg += S.mass(l);
        h = Math.max(h, l.tz + (l.d0 + l.d1) / 400);
      }
    TRAILER.cargo = kg;
    TRAILER.cargoH = h;
    TRAILER.loadList = S.logs.filter(l => l.st === 'trailer');
  }
  // ---------------- the log yard (Holzlager) beside the band sawmill: two squared timbers across, logs on them ----------------
  const YARD = { under: [], inside: () => false };
  // the log yard north of the band sawmill, logs lying north–south like on the mill (workshop coordinates as built → where it stands now)
  const WT = (x, y) => (window.BUILD && BUILD.werkstatt ? BUILD.werkstatt.tf(x, y) : [x, y]);
  S.YARD0 = (() => {
    const c = WT(-1.5, -24.6),
      n = WT(-1.5, -20),
      az = Math.atan2(n[0] - c[0], n[1] - c[1]);
    return { x: c[0], y: c[1], az, len: 5.4, w: 4.2, gap: 3.2 };
  })();
  function buildYard() {
    const Y = S.YARD0;
    if (!Y) return;
    const g = new THREE.Group(),
      mat = MAT.kvh || new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 });
    const ux = Math.sin(Y.az),
      uy = Math.cos(Y.az); // the logs' direction; the timbers lie across
    for (const k of [-1, 1]) {
      const x = Y.x + (ux * k * Y.gap) / 2,
        y = Y.y + (uy * k * Y.gap) / 2,
        z = KERN.ground(x, y),
        me = new THREE.Mesh(new THREE.BoxGeometry(Y.w, 0.14, 0.14), mat);
      me.position.copy(V(x, y, z + 0.07));
      me.rotation.y = -Y.az;
      me.castShadow = me.receiveShadow = true;
      g.add(me);
      YARD.under.push({ x, y, z, ux: uy, uy: -ux, l: Y.w });
    }
    g.traverse(o => {
      if (o.isMesh) o.userData.noMerge = true;
    });
    scene.add(g);
    YARD.inside = p => {
      const dx = p[0] - Y.x,
        dy = p[1] - Y.y,
        a = dx * ux + dy * uy,
        b = -dx * uy + dy * ux;
      return Math.abs(a) < Y.len / 2 && Math.abs(b) < Y.w / 2;
    };
  }
  // ---------------- the garden bridge (2.5 m wide, no railing) for the tractor (2.28 m over the tyres) ----------------
  // world/roads.js lets vehicles stand on its deck; invisible guides along both edges keep the wheels on it where the ditch is below
  // (±2.1 m of the 6.2 m deck; beyond, the slab lies on the banks), flared at both ends so the driver is led on. They hold only the
  // wheels (vehicles/vehicle.js guideHits): the loader, a log on the fork or the trailer's bed may reach out over the edge. Walkers pass.
  const GUIDE_HALF = 2.1;
  function bridgeGuides() {
    const ST = window.STREAM;
    if (!ST || !ST.BR || !ST.wpt) return;
    const U = ST.U,
      N = ST.N,
      w = ST.BR.w,
      l = GUIDE_HALF;
    const wall = (p1, p2) => {
      const dx = p2[0] - p1[0],
        dy = p2[1] - p1[1],
        L = Math.hypot(dx, dy),
        ay = [dx / L, dy / L],
        B = {
          c: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
          ax: [ay[1], -ay[0]],
          ay,
          ex: 0.05,
          ey: L / 2,
          z0: -2,
          z1: 0.7,
        };
      VEH.extra.push({ box: () => B, noWalk: true, guide: true });
    };
    for (const sd of [-1, 1]) {
      const t = ST.TB + sd * (w + 0.05);
      wall(ST.wpt(t, ST.OFF - l), ST.wpt(t, ST.OFF + l));
      for (const e of [-1, 1]) {
        const c0 = ST.wpt(t, ST.OFF + e * l),
          a = 0.55,
          len = 2.0;
        wall(c0, [
          c0[0] + (N[0] * e * Math.cos(a) + U[0] * sd * Math.sin(a)) * len,
          c0[1] + (N[1] * e * Math.cos(a) + U[1] * sd * Math.sin(a)) * len,
        ]);
      }
    }
  }
  S.bridgeGuides = bridgeGuides;
  S.inYard = p => YARD.inside(p);
  // ---------------- unloading the trailer: the stakes on one side open, the logs roll off ----------------
  // As on a real stake trailer: standing at the front or the back, pull the pins of the far side's stakes – the load rolls off that side
  // (never stand where it rolls). The logs come to rest side by side on the ground beside the bed, or on the log yard's timbers when the
  // trailer stands alongside them. The fork then takes them one by one.
  function unload() {
    const T = window.TRAILER;
    if (!T || !T.st) return;
    const list = S.logs.filter(l => l.st === 'trailer');
    if (!list.length) return;
    if (T.tow && Math.hypot(T.tow.st.u, T.tow.st.v) > 0.3) {
      think('Erst anhalten.', 1500);
      return;
    }
    const side = rollSide();
    list.sort((a, b) => side * (b.tx - a.tx) || a.tz - b.tz); // the outermost first
    let off = T.bed.hw + 0.25;
    for (const l of list) {
      const r0 = l.d0 / 200,
        r1 = l.d1 / 200,
        rm = Math.max(r0, r1),
        x = side * (off + rm);
      off += 2 * rm + 0.04;
      const a = T.toW(x, l.ta + l.L / 2),
        b = T.toW(x, l.ta - l.L / 2);
      l.st = 'ground';
      l.p0 = [a[0], a[1], 0];
      l.p1 = [b[0], b[1], 0];
      delete l.tx;
      delete l.tz;
      delete l.ta;
      l.p0[2] = support(a[0], a[1], l) + r0;
      l.p1[2] = support(b[0], b[1], l) + r1;
      restOn(l);
      l.wp0 = l.p0;
      l.wp1 = l.p1;
    }
    trailerMass();
    redraw();
    save();
    S.ver++;
    SFX.drop && SFX.drop();
    markDirty(true);
    const yard = list.some(l => YARD.inside(mid(l)));
    think(
      `Rungen auf: ${list.length === 1 ? 'der Stamm rollt' : list.length + ' Stämme rollen'} ${side > 0 ? 'rechts' : 'links'} ab${yard ? ' – ins Holzlager' : ''}. Nie auf der Abrollseite stehen! Rungen wieder schließen.`,
      4200
    );
  }
  // which way: away from the one who opens them; standing in the middle of an end: towards the log yard if it is beside the bed, else right
  function rollSide() {
    const T = window.TRAILER,
      me = T.local([P.x, P.y, 0]);
    if (Math.abs(me[0]) >= 0.25) return me[0] > 0 ? -1 : 1;
    for (const sd of [1, -1]) {
      const p = T.toW(sd * (T.bed.hw + 1.0), (T.bed.y0 + T.bed.y1) / 2);
      if (YARD.inside([p[0], p[1]])) return sd;
    }
    return 1;
  }
  S.unload = unload;
  function unloadAct() {
    const T = window.TRAILER;
    if (!T || !T.g) return;
    PLAY.act({
      id: 'holz:unload',
      r: 2.0,
      prio: 0.65,
      obj: () => T.g,
      pos: () => {
        const e = T.toW(0, T.bed.y0 - 0.5);
        return [e[0], e[1], T.st.z + 1.0];
      },
      label: () =>
        VEH.cur || !S.logs.some(l => l.st === 'trailer')
          ? null
          : `Rungen ${rollSide() > 0 ? 'rechts' : 'links'} öffnen – Stämme abrollen lassen`,
      run: unload,
    });
    PLAY.act({
      id: 'holz:unload2',
      r: 2.0,
      prio: 0.65,
      obj: () => T.g,
      pos: () => {
        const e = T.toW(0, T.bed.y1 + 0.3);
        return [e[0], e[1], T.st.z + 1.0];
      },
      label: () =>
        VEH.cur || !S.logs.some(l => l.st === 'trailer')
          ? null
          : `Rungen ${rollSide() > 0 ? 'rechts' : 'links'} öffnen – Stämme abrollen lassen`,
      run: unload,
    });
  }
  // ---------------- saving ----------------
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        SAVE.setRaw(
          LSK,
          JSON.stringify({
            v: 1,
            logs: S.logs.map(l => {
              // V16h: a log on the winch's cable is kept as lying where it is (older builds read it so); werk/winde.js keeps the cable.
              // One in the crane's grapple (werk/kran.js) as lying where the crane took it.
              const o = { id: l.id, st: l.st === 'winch' || l.st === 'crane' ? 'ground' : l.st };
              if (l.st === 'ground' || l.st === 'saw' || l.st === 'winch' || l.st === 'crane') {
                const a = l.st === 'crane' && l.cp0 ? l.cp0 : l.p0,
                  b = l.st === 'crane' && l.cp1 ? l.cp1 : l.p1;
                o.p0 = a.map(v => +v.toFixed(3));
                o.p1 = b.map(v => +v.toFixed(3));
              }
              if (l.st === 'fork') {
                o.f0 = l.f0;
                o.f1 = l.f1;
                o.p0 = l.wp0;
                o.p1 = l.wp1;
              }
              if (l.st === 'trailer') {
                o.tx = +l.tx.toFixed(3);
                o.tz = +l.tz.toFixed(3);
                o.ta = +l.ta.toFixed(3);
              }
              if (l.extra) o.extra = l.extra;
              return o;
            }),
            part2: S.part2 ? S.part2() : null,
          })
        );
      } catch (e) {}
    }, 400);
  }
  function load() {
    let s = null;
    try {
      s = JSON.parse(SAVE.raw(LSK) || 'null');
    } catch (e) {}
    if (!s || s.v !== 1) return null;
    for (const o of s.logs || []) {
      const l = S.by[o.id];
      if (!l) continue;
      l.st = o.st;
      if (o.p0) {
        l.p0 = o.p0;
        l.p1 = o.p1;
      }
      if (o.f0) {
        l.f0 = o.f0;
        l.f1 = o.f1;
      }
      if (o.st === 'trailer') {
        l.tx = o.tx;
        l.tz = o.tz;
        l.ta = o.ta;
      }
      if (o.extra) l.extra = o.extra;
      if (o.st === 'fork' && !o.f0) l.st = 'ground';
    }
    return s;
  }
  // ---------------- per frame ----------------
  function tick(dt) {
    if (!S.ready) {
      if (LOAD.finished && (!window.FELL || !FELL.on || FELL.ready)) start();
      return;
    }
    if (window.FELL && FELL.logs && FELL.logs.length !== S.nF) {
      S.nF = FELL.logs.length;
      adopt();
    }
    if (window.TRACTOR2 && (VEH.cur === TRACTOR2 || S.logs.some(l => l.st === 'fork'))) forkTick(dt);
    if (S.logs.some(l => l.st === 'fork' || l.st === 'trailer')) moveTick();
  }
  function start() {
    S.ready = true;
    const FL = (window.FELL && FELL.logs) || [];
    S.nF = FL.length;
    for (const f of FL) {
      if (!f.at) continue;
      const l = {
        id: f.id,
        tid: f.tid,
        sp: f.sp,
        L: f.L,
        d0: f.d0,
        d1: f.d1,
        dm: f.dm,
        vol: f.vol,
        q: f.q,
        i: f.i,
        st: 'ground',
        seed: ((f.tid * 7 + f.i * 13) % 97) / 97,
        tint: 0.92 + ((f.tid * 3 + f.i) % 7) * 0.02,
        p0: [f.at.x0, f.at.y0, f.at.z0],
        p1: [f.at.x1, f.at.y1, f.at.z1],
      };
      S.logs.push(l);
      S.by[l.id] = l;
      if (window.FELL && FELL.hideLogs) FELL.hideLogs(f.tid);
    }
    const s = load();
    buildYard();
    bridgeGuides();
    unloadAct();
    redraw();
    trailerMass();
    if (S.onStart) S.onStart(s ? s.part2 : null);
    markDirty(true);
  }
  window.TICKS.push(dt => {
    try {
      tick(dt);
    } catch (e) {
      if (!S._err) {
        S._err = 1;
        console.warn('holz', e);
      }
    }
  });
  // first visit of V16d: a word about the way of the wood
  let intro = false;
  window.TICKS.push(() => {
    if (intro || !S.ready || P.mode !== 'walk' || !LOAD.ready) return;
    intro = true;
    const seen = !SAVE.once('pav-v16d'); // one-time hint
    if (!seen)
      setTimeout(
        () =>
          news(
            'Neu: vom Stamm zum Brett. Die gefällten Stämme lädt der Traktor mit der Gabel (G ganz runter, darunterfahren, R heben, T kippen) von der Seite auf den Anhänger (K kuppelt an und ab) und fährt sie über die Gartenbrücke zum Holzlager vor der Werkstatt – dort zu Fuß hinten die Rungen öffnen, die Stämme rollen ab. Dann mit der Gabel auf die Blockbandsäge, Brett für Brett schneiden, mit Stapelleisten stapeln, mit dem Feuchtemesser prüfen und im Zeitraffer trocknen – trocken kommen sie in die Werkstatt.',
            14000
          ),
        44000
      );
  });
  // colliders of the wood places (blocks, stack, drying cabinet) in the garden's list (COL; the grids are rebuilt). By tag: the old entries
  // are switched off (other code may hold COL indices), the new ones appended. Boxes in workshop coordinates as built → world AABB.
  S.setCol = (tag, boxes) => {
    for (const c of COL)
      if (c && c[6] === tag) {
        c[4] = -99;
        c[5] = -99;
      }
    for (const b of boxes) {
      const P = [WT(b[0], b[2]), WT(b[1], b[2]), WT(b[0], b[3]), WT(b[1], b[3])];
      COL.push([
        Math.min(...P.map(q => q[0])),
        Math.max(...P.map(q => q[0])),
        Math.min(...P.map(q => q[1])),
        Math.max(...P.map(q => q[1])),
        b[4],
        b[5],
        tag,
        null,
        null,
      ]);
    }
    if (typeof rebuildGrids === 'function') rebuildGrids();
  };
  S.WT = WT;
  // tests and tools: a log of given size lying at (x, y) along az (radians, 0 = north), its butt at the start
  S.testLog = (o = {}) => {
    const sp = o.sp || 'spruce',
      L = o.L || 4.1,
      d0 = o.d0 || 34,
      d1 = o.d1 || 28,
      az = o.az || 0,
      x = o.x,
      y = o.y,
      f = [Math.sin(az), Math.cos(az)];
    const id = 'T' + (++S.nT || (S.nT = 1)),
      l = {
        id,
        tid: -1,
        sp,
        L,
        d0,
        d1,
        dm: Math.round((d0 + d1) / 2),
        vol: +((Math.PI / 4) * ((d0 + d1) / 200) ** 2 * L).toFixed(3),
        q: 'B',
        i: 0,
        st: 'ground',
        seed: 0.3,
        tint: 1,
      };
    l.p0 = [x - (f[0] * L) / 2, y - (f[1] * L) / 2, 0];
    l.p1 = [x + (f[0] * L) / 2, y + (f[1] * L) / 2, 0];
    l.p0[2] = support(l.p0[0], l.p0[1], l) + d0 / 200;
    l.p1[2] = support(l.p1[0], l.p1[1], l) + d1 / 200;
    S.logs.push(l);
    S.by[id] = l;
    redraw();
    save();
    return id;
  };
  // V16h: a log moved by someone else (werk/winde.js drags it on the cable): its instance follows
  function moved(l) {
    place(l);
    const G = SP[l.isp];
    if (G) G.mS.instanceMatrix.needsUpdate = true;
    markDirty();
  }
  Object.assign(S, {
    redraw,
    save,
    support,
    place,
    moved,
    restOn,
    warnOnce,
    adopt,
    yard: YARD,
    mid,
    SPN,
    de,
    rOf,
    species,
    forkTick,
    trailerMass,
  });
  return S;
})();
window.HOLZ = HOLZ;
