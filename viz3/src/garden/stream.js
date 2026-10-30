// ---------- stream: ditch surface, water, bridge, stairs to the water, stones (geometry in garden/stream_geo.js) ----------
import * as THREE from 'three';
import { rnd, scene, V } from '../core/head.js';
import { ANISO, pbrMat, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, COL, cyl, PH, PH_END, phase, tagPh, WALK } from '../core/geo.js';
import { STREAM } from './stream_geo.js';
import { GSZ, mkGroundMat } from './env.js';
{
  const ST = STREAM,
    { wpt, cOff, zAtTA } = ST;
  const rotOf = (cx, cy) => ({ cx, cy, c: Math.cos(ST.BR.ang), s: Math.sin(ST.BR.ang) });
  const frameAt = t => {
    const p = wpt(t, cOff(t));
    const g = new THREE.Group();
    g.position.copy(V(p[0], p[1], 0));
    g.rotation.y = ST.BR.ang;
    scene.add(g);
    return { g, rot: rotOf(p[0], p[1]) };
  };
  // --- ditch surface: same colour map, lawn and gravel detail as the flat ground (which is cut away above the ditch) ---
  const A = [
    -2.95, -2.6, -2.25, -2.05, -1.85, -1.65, -1.45, -1.25, -1.05, -0.85, -0.7, -0.55, -0.47, -0.4, -0.2, 0, 0.2, 0.4,
    0.47, 0.55, 0.7, 0.85, 1.05, 1.18, 1.31, 1.44, 1.57, 1.7, 1.83, 1.96, 2.09, 2.22, 2.25, 2.35, 2.48, 2.61, 2.66,
    2.95,
  ];
  const ts = [];
  for (let t = ST.tLim[0]; t < ST.tLim[1];) {
    ts.push(t);
    const dS = Math.min(...ST.STAIRS.map(s => Math.abs(t - s.t))),
      dB = Math.abs(t - ST.TB);
    t += dS < 1.2 ? 0.12 : dB < 7 ? 0.3 : dB < 45 ? 0.6 : 1.2;
  }
  ts.push(ST.tLim[1]);
  const ditchMat = mkGroundMat(false),
    CH = 24;
  for (let i0 = 0; i0 < ts.length - 1;) {
    let i1 = i0;
    while (i1 < ts.length - 1 && ts[i1] - ts[i0] < CH) i1++;
    const pos = [],
      uv = [],
      idx = [],
      nA = A.length;
    for (let i = i0; i <= i1; i++) {
      const t = ts[i],
        c = cOff(t);
      for (const a of A) {
        const [x, y] = wpt(t, c + a);
        const z = zAtTA(t, c + a);
        pos.push(x, z, -y);
        uv.push(x / GSZ + 0.5, y / GSZ + 0.5);
      }
    }
    for (let i = 0; i < i1 - i0; i++)
      for (let j = 0; j < nA - 1; j++) {
        const a = i * nA + j,
          b = a + nA;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    {
      const n = geo.attributes.normal;
      for (let k = 0; k < n.count; k++) if (n.getY(k) < 0) n.setXYZ(k, -n.getX(k), -n.getY(k), -n.getZ(k));
    }
    const me = new THREE.Mesh(geo, ditchMat);
    me.receiveShadow = true;
    me.castShadow = Math.abs((ts[i0] + ts[i1]) / 2 - ST.TB) < 40;
    me.userData.noMerge = true;
    scene.add(me);
    i0 = i1;
  }
  // --- water: a ribbon 1 m wide, two scrolling ripple maps (flow from east to west), clear enough to see the gravel ---
  const wnTex = (() => {
    const n = 256,
      c = document.createElement('canvas');
    c.width = c.height = n;
    const q = c.getContext('2d'),
      im = q.createImageData(n, n);
    const h = new Float32Array(n * n);
    const waves = [];
    for (let k = 0; k < 26; k++)
      waves.push([
        (1 + Math.floor(rnd() * 5)) * (rnd() < 0.5 ? -1 : 1),
        Math.floor(rnd() * 7) - 3,
        rnd() * 6.283,
        0.4 + rnd(),
      ]);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let v = 0;
        for (const [kx, ky, ph, a] of waves)
          v += (a * Math.sin((6.2832 * (kx * x + ky * y)) / n + ph)) / Math.hypot(kx, ky + 0.01);
        h[y * n + x] = v;
      }
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const dx = h[y * n + ((x + 1) % n)] - h[y * n + ((x + n - 1) % n)],
          dy = h[((y + 1) % n) * n + x] - h[((y + n - 1) % n) * n + x];
        const nx = -dx * 0.9,
          ny = -dy * 0.9,
          L = Math.hypot(nx, ny, 1);
        const o = (y * n + x) * 4;
        im.data[o] = ((nx / L) * 0.5 + 0.5) * 255;
        im.data[o + 1] = ((ny / L) * 0.5 + 0.5) * 255;
        im.data[o + 2] = ((1 / L) * 0.5 + 0.5) * 255;
        im.data[o + 3] = 255;
      }
    q.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ANISO;
    return t;
  })();
  const WT0 = { value: 0 };
  const waterMat = new THREE.MeshStandardMaterial({
    // dark, slow brook water under trees (photos 26.10.2026): almost black-brown, the sky only faintly mirrored
    color: 0x1e2419,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.86,
    envMapIntensity: 0.75,
    normalMap: wnTex,
    normalScale: new THREE.Vector2(0.32, 0.32),
    depthWrite: false,
  });
  waterMat.onBeforeCompile = sh => {
    sh.uniforms.uWT = WT0;
    sh.fragmentShader =
      'uniform float uWT;\n' +
      sh.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
      vec3 n1 = texture2D( normalMap, vNormalMapUv + vec2( uWT * 0.42, 0.0 ) ).xyz * 2.0 - 1.0;
      vec3 n2 = texture2D( normalMap, vNormalMapUv * vec2( 2.3, 1.7 ) + vec2( uWT * 0.77, 0.31 ) ).xyz * 2.0 - 1.0;
      vec3 mapN = normalize( vec3( ( n1.xy * 0.7 + n2.xy * 0.55 ) * normalScale, 1.0 ) ); normal = normalize( tbn * mapN );`
      );
  };
  waterMat.customProgramCacheKey = () => 'brook';
  {
    const tw0 = ST.tLim[0] + 14,
      tw1 = ST.tLim[1] - 14,
      WS = [-ST.WW, -ST.WW / 2, 0, ST.WW / 2, ST.WW];
    for (let t0 = tw0; t0 < tw1; t0 += 30) {
      const pos = [],
        uv = [],
        idx = [];
      let n = 0;
      for (let t = t0; ; t += 0.5) {
        const tt = Math.min(t, t0 + 30, tw1);
        const c = cOff(tt),
          wz = ST.WZ * ST.kD(tt);
        for (const a of WS) {
          const [x, y] = wpt(tt, c + a);
          pos.push(x, wz, -y);
          uv.push(tt / 1.2, a / 1.2);
        }
        n++;
        if (tt >= t0 + 30 || tt >= tw1) break;
      }
      for (let i = 0; i < n - 1; i++)
        for (let j = 0; j < WS.length - 1; j++) {
          const a = i * WS.length + j,
            b = a + WS.length;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const me = new THREE.Mesh(geo, waterMat);
      me.renderOrder = 2;
      me.userData.noMerge = true;
      me.onBeforeRender = () => {
        WT0.value = (performance.now() / 1000) % 600;
      };
      scene.add(me);
    }
  }
  // --- stones in the bed and at the water's edge ---
  {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    {
      const p = geo.attributes.position;
      const seen = new Map();
      for (let i = 0; i < p.count; i++) {
        const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
        let f = seen.get(k);
        if (f === undefined) {
          f = 0.78 + rnd() * 0.4;
          seen.set(k, f);
        }
        p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.62, p.getZ(i) * f);
      }
      geo.computeVertexNormals();
    }
    const mat = pbrMat('flagstone', { fallback: 0x7d786c, color: 0x9a968c, nrm: 1.0, rough: 0.75, tile: [0.6, 0.6] });
    const pts = [];
    for (let i = 0; i < 150; i++) {
      const t = ST.TB + (rnd() * 2 - 1) * 70;
      if (Math.abs(t - ST.TB) < 1.6) continue;
      const edge = rnd() < 0.4,
        a = edge ? (rnd() < 0.5 ? -1 : 1) * (0.42 + rnd() * 0.22) : (rnd() * 2 - 1) * 0.36;
      const s = edge ? 0.1 + rnd() * 0.16 : 0.05 + rnd() * 0.12;
      const [x, y] = wpt(t, cOff(t) + a);
      pts.push([x, y, zAtTA(t, cOff(t) + a) + s * 0.18, s]);
    }
    const im = new THREE.InstancedMesh(geo, mat, pts.length),
      m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler();
    pts.forEach(([x, y, z, s], i) => {
      e.set(rnd() * 0.4, rnd() * 6.28, rnd() * 0.4);
      q.setFromEuler(e);
      m4.compose(V(x, y, z), q, new THREE.Vector3(s * (1 + rnd() * 0.5), s, s));
      im.setMatrixAt(i, m4);
    });
    im.castShadow = true;
    im.receiveShadow = true;
    im.userData.noMerge = true;
    scene.add(im);
  }
  // --- bridge: concrete slab with asphalt, 2.5 m wide and 6.2 m long, no railing ---
  // Today (construction phase 0, Falko's photos 7197–7200 of 26.10.2026) the slab at the gate is old moss-grown concrete over a culvert: a
  // headwall on each side of the slab with the pipe the brook runs through; the asphalt bridge comes with phase 1 (plan). The deck's walking
  // and driving surface (WALK, STREAM.BR, the guides of VEH) is the same in every phase.
  {
    const { g, rot } = frameAt(ST.TB),
      w = ST.BR.w,
      l = ST.BR.l,
      PH0 = PH,
      PE0 = PH_END;
    MAT.asphalt = MAT.asphalt || pbrMat('asphalt', { fallback: 0x3e3e3c, nrm: 0.9, rough: 1.0 });
    B(-w, w, -l, l, -0.24, 0.025, MAT.conc, { parent: g, col: false, grain: 'y' });
    phase(1);
    B(-w + 0.02, w - 0.02, -l, l, 0.025, 0.06, MAT.asphalt, { parent: g, col: false, grain: 'y' });
    phase(0, 1);
    {
      const moss = plain({ color: 0x6d7058, roughness: 0.95 }),
        pipeIn = plain({ color: 0x1d1f1a, roughness: 1, side: THREE.DoubleSide }),
        zt = -0.24,
        aMax = ST.WB + (ST.WT - ST.WB) * (1 - Math.sqrt(-zt / ST.D)), // where the bank meets the slab's underside
        pr = 0.42,
        pz = -ST.D + 0.08 + pr; // the pipe: Ø 84 cm, its invert just above the bed
      B(-w + 0.02, w - 0.02, -l, l, 0.025, 0.06, moss, { parent: g, col: false, grain: 'y' }); // the old slab's top, moss in the joints
      // headwalls: the ditch's cross-section from the bed up to the slab, with the pipe's mouth
      const sh = new THREE.Shape();
      sh.moveTo(-aMax, zt);
      for (let i = 0; i <= 24; i++) {
        const a = -aMax + (2 * aMax * i) / 24;
        sh.lineTo(a, Math.min(zt, ST.prof(a) - 0.02));
      }
      sh.lineTo(aMax, zt);
      sh.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, pz, pr, 0, Math.PI * 2, true);
      sh.holes.push(hole);
      const hw = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false, curveSegments: 18 });
      for (const sx of [-1, 1]) {
        const m = new THREE.Mesh(hw, MAT.conc);
        m.rotation.y = Math.PI / 2;
        m.position.copy(V(sx * w - 0.11, 0, 0));
        m.castShadow = m.receiveShadow = true;
        g.add(tagPh(m));
        const lip = new THREE.Mesh(new THREE.TorusGeometry(pr + 0.02, 0.035, 6, 20), MAT.conc);
        lip.rotation.y = Math.PI / 2;
        lip.position.copy(V(sx * (w + 0.12), 0, pz));
        g.add(tagPh(lip));
      }
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 2 * w + 0.2, 18, 1, true), pipeIn);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.copy(V(0, 0, pz));
      g.add(tagPh(pipe));
      // the culvert is filled: nobody walks under the slab today
      COL.push([-w - 0.12, w + 0.12, -aMax, aMax, -ST.D - 0.2, zt - 0.02, 'culvert', 0, 1, rot]);
    }
    phase(PH0, PE0);
    for (const sy of [-1, 1])
      B(-w - 0.05, w + 0.05, sy > 0 ? 1.1 : -1.45, sy > 0 ? 1.45 : -1.1, -1.0, -0.24, MAT.conc, {
        parent: g,
        col: false,
      }); // abutment walls holding the banks under the slab
    WALK.push([-w, w, -l, l, 0.06, 'stone', null, null, null, rot]);
    ST.BR.walkTop = 0.06;
  }
  // --- stairs to a stone landing at the water (garden side): oak sleepers with a handrail, or (kind 'slab', the steps from the terrace on
  // Falko's photos 7205/7207) narrow concrete slabs in the grass ---
  {
    const SL = pbrMat('oak', { fallback: 0x6d5a46, color: 0xa8927a, nrm: 0.9, rough: 1.2 }),
      RAIL = MAT.kvh;
    for (const s of ST.STAIRS) {
      const { g, rot } = frameAt(s.t),
        y = a => -a; // local y = −(distance towards the garden)
      if (s.kind === 'slab') {
        const hw = 0.33;
        B(-hw - 0.08, hw + 0.08, y(ST.YL1), y(ST.YL0), ST.ZL - 0.14, ST.ZL, MAT.stone, { parent: g, col: false });
        WALK.push([-hw - 0.08, hw + 0.08, y(ST.YL1), y(ST.YL0), ST.ZL, 'stone', null, null, null, rot]);
        for (let i = 1; i < ST.SR; i++) {
          const a0 = ST.YL1 + (i - 1) * ST.TG,
            a1 = a0 + ST.TG,
            zt = ST.ZL + i * ST.RH,
            dx = Math.sin(i * 7.1) * 0.03; // not rnd(): one sequence for the whole scene
          B(-hw + dx, hw + dx, y(a1 + 0.02), y(a0 + 0.02), zt - 0.07, zt, MAT.conc, { parent: g, col: false });
          WALK.push([-hw + dx, hw + dx, y(a1 + 0.02), y(a0 + 0.02), zt, 'stone', null, null, null, rot]);
        }
        const z6 = ST.ZL + (ST.SR - 1) * ST.RH; // the top step: a block up to the lawn
        B(-hw, hw, y(ST.YT + 0.22), y(ST.YT - 0.04), z6 - 0.06, 0.015, MAT.conc, { parent: g, col: false });
        WALK.push([-hw, hw, y(ST.YT + 0.22), y(ST.YT - 0.04), 0.015, 'stone', null, null, null, rot]);
        continue;
      }
      const hw = ST.SW;
      B(-hw - 0.12, hw + 0.12, y(ST.YL1), y(ST.YL0), ST.ZL - 0.14, ST.ZL, MAT.stone, { parent: g, col: false });
      WALK.push([-hw - 0.12, hw + 0.12, y(ST.YL1), y(ST.YL0), ST.ZL, 'stone', null, null, null, rot]);
      for (let i = 1; i < ST.SR; i++) {
        const a0 = ST.YL1 + (i - 1) * ST.TG,
          a1 = a0 + ST.TG,
          zt = ST.ZL + i * ST.RH;
        B(-hw, hw, y(a1), y(a0), zt - 0.2, zt, SL, { parent: g, col: false, grain: 'x' });
        WALK.push([-hw, hw, y(a1), y(a0), zt, 'wood', null, null, null, rot]);
      }
      const z6 = ST.ZL + (ST.SR - 1) * ST.RH;
      B(-hw, hw, y(ST.YT + 0.22), y(ST.YT - 0.04), z6 - 0.06, 0.012, SL, { parent: g, col: false, grain: 'x' });
      WALK.push([-hw, hw, y(ST.YT + 0.22), y(ST.YT - 0.04), 0.012, 'wood', null, null, null, rot]);
      for (const sx of [-1, 1])
        beam(
          [sx * (hw + 0.03), y(ST.YL1 - 0.02), ST.ZL - 0.02],
          [sx * (hw + 0.03), y(ST.YT + 0.2), -0.02],
          0.06,
          0.24,
          SL,
          { parent: g }
        ); // edging boards
      // handrail on the outer side (away from the bridge): two posts and a rail
      const hx = s.side * (hw + 0.14),
        pTop = [hx, y(ST.YT + 0.12), 0],
        pBot = [hx, y(ST.YL1 - 0.05), ST.ZL];
      for (const p of [pTop, pBot]) {
        cyl(p[0], p[1], p[2] - 0.05, p[2] + 0.95, 0.045, RAIL, 10, undefined, { parent: g, col: false });
        const [wx, wy] = [rot.cx + p[0] * rot.c - p[1] * rot.s, rot.cy + p[0] * rot.s + p[1] * rot.c];
        COL.push([wx - 0.07, wx + 0.07, wy - 0.07, wy + 0.07, p[2] - 0.05, p[2] + 0.95, 'rail', null, null]);
      }
      beam([pTop[0], pTop[1], pTop[2] + 0.92], [pBot[0], pBot[1], pBot[2] + 0.92], 0.055, 0.055, RAIL, { parent: g });
    }
  }
}
