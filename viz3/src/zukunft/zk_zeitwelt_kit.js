// ===================== feat/zeitreise-welt: the kit of the futures' things – materials, a geometry builder, things per world (ZKKIT) =====================
// Everything the Zeitreise builds (heating house, trench, wind turbine, logging, the rain night, the blackout) is made here from boxes,
// frusta and tubes with vertex colours into one geometry per part, drawn as InstancedMesh (CULL never touches their layers, one program
// per material). Materials: kit (vertex colours, instance colour), glow (unlit, instance colour: windows, blue lights), sign (canvas atlas),
// decal (vertex RGBA, polygon offset: mud, fresh asphalt), water (the street flood, animated), band (additive: the towns' glow) – all
// compiled in warm(); nothing casts or receives shadows, no lights.
// A thing has want(state) → a description (null: absent). With one world it is drawn once on layer 0; in the split, when both worlds want
// the same it stays on layer 0, otherwise copy A (left world) goes on layer 21 and copy B (right) on 22 – each rebuilt only when its own
// description changes; animation (rotor, blue lights, water) runs in tick() on what is visible.
// Coordinates: site metres (x east, y north, z up); three's are (x, z, −y).
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { warmUp } from '../render/render.js';

export const ZKKIT = (() => {
  const G = w => window[w];
  const LAYER_L = 21,
    LAYER_R = 22;
  const gnd = (x, y) => (KERN.ground ? KERN.ground(x, y) : KERN.terrain ? KERN.terrain(x, y) : 0) || 0;
  const ter = (x, y) => (KERN.terrain ? KERN.terrain(x, y) : 0) || 0;
  const col = hex => {
    const c = new THREE.Color(hex);
    return [c.r, c.g, c.b];
  };
  const hash = n => {
    let h = Math.imul(n | 0, 2654435761) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  };
  // ---------- materials (one each; programs compiled in warm) ----------
  const U = {
    uZkTime: { value: 0 },
    uZkFlow: { value: 1 },
    uZkBlue: { value: 0 },
    uZkNight: { value: 0 },
    uZkBlueP: { value: new THREE.Vector2(0, 0) },
  };
  let M = null;
  function mats() {
    if (M) return M;
    M = {
      kit: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, envMapIntensity: 0.6 }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true, fog: true }),
      sign: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, envMapIntensity: 0.5 }),
      decal: new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        roughness: 0.9,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -6,
      }),
      water: new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x4a3d30),
        roughness: 0.22,
        metalness: 0,
        transparent: true,
        opacity: 0.95,
        envMapIntensity: 0.4,
      }),
      band: new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    };
    M.decal.name = 'zeitreise decal';
    // the street flood: brown water that flows (streaks of foam drift along aFlow, the metres along the street) and trembles in the rain
    M.water.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader =
        'attribute float aFlow; varying float vFlow; varying vec2 vWp;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n vFlow = aFlow; vWp = vec2( position.x, position.z );'
        );
      sh.fragmentShader =
        'uniform float uZkTime, uZkFlow, uZkBlue, uZkNight; uniform vec2 uZkBlueP; varying float vFlow; varying vec2 vWp; float zkFoam = 0.0;\n' +
        'float zkWh( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }\n' +
        'float zkWn( vec2 p ) { vec2 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f ); return mix( mix( zkWh( i ), zkWh( i + vec2( 1.0, 0.0 ) ), u.x ), mix( zkWh( i + vec2( 0.0, 1.0 ) ), zkWh( i + vec2( 1.0, 1.0 ) ), u.x ), u.y ); }\n' +
        sh.fragmentShader
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            { float t = uZkTime * uZkFlow; vec2 q = vec2( vFlow - t * 1.6, vWp.x * 0.37 + vWp.y * 0.53 );
              float foam = smoothstep( 0.62, 0.9, zkWn( q * vec2( 0.45, 1.3 ) ) * 0.7 + zkWn( q * vec2( 1.7, 3.1 ) ) * 0.3 );
              diffuseColor.rgb = mix( diffuseColor.rgb * ( 0.85 + 0.3 * zkWn( q * 0.21 ) ), vec3( 0.55, 0.5, 0.42 ), foam * 0.55 ); zkFoam = foam; }`
          )
          .replace(
            '#include <emissivemap_fragment>',
            // at night the moving foam catches what light there is, and the blue lights flash on the water
            `#include <emissivemap_fragment>
            totalEmissiveRadiance += ( vec3( 0.012, 0.0115, 0.0105 ) * zkFoam + vec3( 0.0012, 0.0012, 0.0015 ) ) * uZkNight
              + vec3( 0.002, 0.005, 0.03 ) * uZkBlue * ( 0.4 + 0.6 * zkFoam ) * exp( - distance( vWp, uZkBlueP ) / 14.0 );`
          )
          .replace(
            '#include <normal_fragment_maps>',
            `#include <normal_fragment_maps>
            { float t = uZkTime; vec2 p = vWp * 1.7 + vec2( vFlow * 0.0, 0.0 );
              float a = zkWn( p + vec2( t * 1.9, - t * 0.7 ) ), b = zkWn( p * 2.3 - vec2( t * 2.6, t * 1.1 ) );
              normal = normalize( normal + vec3( ( a - 0.5 ) * 0.22, ( b - 0.5 ) * 0.22, 0.0 ) ); }`
          );
    };
    M.water.customProgramCacheKey = () => 'zk-water';
    return M;
  }
  // ---------- geometry builder ----------
  function GB(rgba) {
    const P = [],
      N = [],
      C = [],
      UV = [],
      F = [];
    const k = rgba ? 4 : 3;
    const push = (p, n, c, uv, f) => {
      P.push(p[0], p[2], -p[1]);
      N.push(n[0], n[2], -n[1]);
      C.push(c[0], c[1], c[2]);
      if (k === 4) C.push(c.length > 3 ? c[3] : 1);
      UV.push(uv ? uv[0] : 0, uv ? uv[1] : 0);
      F.push(f || 0);
    };
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const nrm = v => {
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    };
    const B = {
      n: () => P.length / 3,
      tri(a, b, c, cl, uvs, fl) {
        const n = nrm(cross(sub(b, a), sub(c, a)));
        push(a, n, cl, uvs && uvs[0], fl && fl[0]);
        push(b, n, cl, uvs && uvs[1], fl && fl[1]);
        push(c, n, cl, uvs && uvs[2], fl && fl[2]);
        return B;
      },
      // a quad with a colour per corner (gradients: the towns' glow)
      quadC(a, b, c, d, cs) {
        const n = nrm(cross(sub(b, a), sub(c, a)));
        for (const [p, cl] of [
          [a, cs[0]],
          [b, cs[1]],
          [c, cs[2]],
          [a, cs[0]],
          [c, cs[2]],
          [d, cs[3]],
        ])
          push(p, n, cl);
        return B;
      },
      // a quad a b c d, counter-clockwise seen from its front
      quad(a, b, c, d, cl, uvs, fl) {
        B.tri(a, b, c, cl, uvs && [uvs[0], uvs[1], uvs[2]], fl && [fl[0], fl[1], fl[2]]);
        B.tri(a, c, d, cl, uvs && [uvs[0], uvs[2], uvs[3]], fl && [fl[0], fl[2], fl[3]]);
        return B;
      },
      // an oriented box: centre (x, y), from z0 up h; w along the heading a (radians from east, counter-clockwise), d across
      box(x, y, z0, w, d, h, a, cl, top) {
        const c = Math.cos(a),
          s = Math.sin(a),
          p = (u, v, z) => [x + u * c - v * s, y + u * s + v * c, z];
        const u = w / 2,
          v = d / 2,
          z1 = z0 + h;
        const q = [p(-u, -v, z0), p(u, -v, z0), p(u, v, z0), p(-u, v, z0)],
          r = [p(-u, -v, z1), p(u, -v, z1), p(u, v, z1), p(-u, v, z1)];
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          B.quad(q[i], q[j], r[j], r[i], cl);
        }
        B.quad(r[0], r[1], r[2], r[3], top || cl);
        return B;
      },
      // a vertical frustum (a tower, a post, a pile with r1 small), n sides
      cyl(x, y, z0, r0, r1, h, n, cl, top) {
        const z1 = z0 + h;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2,
            a1 = ((i + 1) / n) * Math.PI * 2;
          const A = [x + r0 * Math.cos(a0), y + r0 * Math.sin(a0), z0],
            Bq = [x + r0 * Math.cos(a1), y + r0 * Math.sin(a1), z0],
            Cq = [x + r1 * Math.cos(a1), y + r1 * Math.sin(a1), z1],
            D = [x + r1 * Math.cos(a0), y + r1 * Math.sin(a0), z1];
          if (r1 > 0.001) B.quad(A, Bq, Cq, D, cl);
          else B.tri(A, Bq, [x, y, z1], cl);
          if (r1 > 0.001 && top !== false) B.tri([x, y, z1], D, Cq, top || cl);
        }
        return B;
      },
      // a tube from p0 to p1 (radius r0 at p0, r1 at p1), n sides, capped
      tube(p0, p1, r0, n, cl, r1, capCl) {
        r1 = r1 === undefined ? r0 : r1;
        const ax = nrm(sub(p1, p0)),
          ref = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0],
          e1 = nrm(cross(ax, ref)),
          e2 = cross(ax, e1);
        const at = (p, r, t) => [
          p[0] + r * (Math.cos(t) * e1[0] + Math.sin(t) * e2[0]),
          p[1] + r * (Math.cos(t) * e1[1] + Math.sin(t) * e2[1]),
          p[2] + r * (Math.cos(t) * e1[2] + Math.sin(t) * e2[2]),
        ];
        for (let i = 0; i < n; i++) {
          const t0 = (i / n) * Math.PI * 2,
            t1 = ((i + 1) / n) * Math.PI * 2;
          B.quad(at(p0, r0, t0), at(p0, r0, t1), at(p1, r1, t1), at(p1, r1, t0), cl);
          B.tri(p1, at(p1, r1, t0), at(p1, r1, t1), capCl || cl);
          B.tri(p0, at(p0, r0, t1), at(p0, r0, t0), capCl || cl);
        }
        return B;
      },
      // a gable house: footprint w × d (heading a), eaves at he, ridge at hr along w; walls, roof with overhang o
      gable(x, y, z0, w, d, he, hr, a, wall, roof, o = 0.4) {
        const c = Math.cos(a),
          s = Math.sin(a),
          p = (u, v, z) => [x + u * c - v * s, y + u * s + v * c, z0 + z];
        const u = w / 2,
          v = d / 2;
        B.quad(p(-u, -v, 0), p(u, -v, 0), p(u, -v, he), p(-u, -v, he), wall);
        B.quad(p(u, v, 0), p(-u, v, 0), p(-u, v, he), p(u, v, he), wall);
        B.quad(p(u, -v, 0), p(u, v, 0), p(u, v, he), p(u, -v, he), wall);
        B.quad(p(-u, v, 0), p(-u, -v, 0), p(-u, -v, he), p(-u, v, he), wall);
        B.tri(p(u, -v, he), p(u, v, he), p(u, 0, hr), wall);
        B.tri(p(-u, v, he), p(-u, -v, he), p(-u, 0, hr), wall);
        const dz = ((hr - he) / v) * o;
        B.quad(p(-u - o, -v - o, he - dz), p(u + o, -v - o, he - dz), p(u + o, 0, hr), p(-u - o, 0, hr), roof);
        B.quad(p(u + o, v + o, he - dz), p(-u - o, v + o, he - dz), p(-u - o, 0, hr), p(u + o, 0, hr), roof);
        return B;
      },
      // a flat panel, centre (x, y, z), w wide along the heading a, h high; its front faces a − 90° (to face φ pass a = φ + π/2)
      panel(x, y, z, w, h, a, cl, uv) {
        const c = Math.cos(a),
          s = Math.sin(a),
          p = (u, zz) => [x + u * c, y + u * s, z + zz];
        const uvs = uv
          ? [
              [uv[0], uv[1]],
              [uv[2], uv[1]],
              [uv[2], uv[3]],
              [uv[0], uv[3]],
            ]
          : null;
        B.quad(p(-w / 2, -h / 2), p(w / 2, -h / 2), p(w / 2, h / 2), p(-w / 2, h / 2), cl, uvs);
        return B;
      },
      geo() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(C, k));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
        g.setAttribute('aFlow', new THREE.Float32BufferAttribute(F, 1));
        g.computeBoundingSphere();
        return g;
      },
    };
    return B;
  }
  // an instanced mesh of a geometry (count copies; one by default) – every kit mesh carries an instance colour (one program for all)
  function inst(geo, mat, n = 1, name = 'zeitreise') {
    const im = new THREE.InstancedMesh(geo, mat, n);
    const one = new THREE.Matrix4(),
      w = new THREE.Color(1, 1, 1);
    for (let i = 0; i < n; i++) {
      im.setMatrixAt(i, one);
      im.setColorAt(i, w);
    }
    im.name = name;
    im.castShadow = false;
    im.receiveShadow = false;
    im.userData.noMerge = true;
    im.frustumCulled = true;
    im.computeBoundingSphere();
    return im;
  }
  const mesh = (B, mat, name) => inst(B.geo(), mat, 1, name);
  function dispose(o) {
    if (!o) return;
    o.traverse(m => {
      if (m.isMesh && m.geometry) m.geometry.dispose();
      if (m.isInstancedMesh && m.dispose) m.dispose();
    });
    if (o.parent) o.parent.remove(o);
  }
  const setMask = (o, m) => o.traverse(c => (c.layers.mask = m));
  // ---------- things per world ----------
  const T = [];
  // def: { id, want(st) → desc | null, build(desc, side) → Object3D, update?(obj, desc, side) → true if handled in place, anim?(obj, desc, t, dt) }
  function thing(def) {
    T.push({ def, A: null, B: null, dA: undefined, dB: undefined });
    return def;
  }
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function place(t, slot, desc, mask) {
    const key = slot === 'A' ? 'dA' : 'dB';
    let o = t[slot];
    if (!desc) {
      if (o) o.visible = false;
      t[key] = null;
      return;
    }
    if (!o || !eq(t[key], desc)) {
      const done = o && t.def.update ? t.def.update(o, desc, slot) : false;
      if (!done) {
        dispose(o);
        o = t.def.build(desc, slot);
        o.name = 'zeitreise:' + t.def.id + ':' + slot;
        scene.add(o);
        t[slot] = o;
      }
      t[key] = JSON.parse(JSON.stringify(desc));
    }
    setMask(o, mask);
    o.visible = true;
  }
  function setAll(L, R) {
    for (const t of T) {
      try {
        const dL = L ? t.def.want(L, 'L') : null,
          dR = R ? t.def.want(R, 'R') : null;
        if (!R || eq(dL, dR)) {
          place(t, 'A', dL, 1);
          place(t, 'B', null, 0);
        } else {
          place(t, 'A', dL, 1 << LAYER_L);
          place(t, 'B', dR, 1 << LAYER_R);
        }
      } catch (e) {
        S.err = t.def.id + ': ' + String(e && e.message ? e.message : e);
        console.warn('zeitreise thing ' + t.def.id, e);
      }
    }
    markDirty(true);
  }
  function clearAll() {
    for (const t of T) {
      if (t.A) t.A.visible = false;
      if (t.B) t.B.visible = false;
      t.dA = t.dB = undefined;
      if (t.def.clear) t.def.clear();
    }
    markDirty(true);
  }
  const S = { err: null, t: 0, animN: 0 };
  function tick(dt) {
    S.t += dt;
    U.uZkTime.value = S.t;
    let any = false;
    for (const t of T) {
      if (!t.def.anim) continue;
      for (const [o, d] of [
        [t.A, t.dA],
        [t.B, t.dB],
      ])
        if (o && o.visible && d) {
          try {
            if (t.def.anim(o, d, S.t, dt) !== false) any = true;
          } catch (e) {
            S.err = t.def.id + ' anim: ' + e;
          }
        }
    }
    if (any) {
      S.animN++;
      markDirty();
    }
    return any;
  }
  // compile every material once with the shapes it will be drawn with (instanced, the colour attributes they carry)
  function warm() {
    const m = mats(),
      g = new THREE.Group();
    const tiny = rgba => {
      const B = GB(rgba);
      B.tri([0, 0, -500], [0.01, 0, -500], [0, 0.01, -500], rgba ? [1, 1, 1, 1] : [1, 1, 1]);
      return B.geo();
    };
    for (const [mat, rgba] of [
      [m.kit, false],
      [m.glow, false],
      [m.sign, false],
      [m.decal, true],
      [m.water, false],
      [m.band, true],
    ])
      g.add(inst(tiny(rgba), mat, 1, 'zeitreise warm'));
    g.traverse(o => (o.frustumCulled = false));
    scene.add(g);
    warmUp(g);
    scene.remove(g);
    g.traverse(o => o.isMesh && o.geometry.dispose());
  }
  // ---------- the village as data: buildings with facades (world/village.js), ways (world/roads.js) ----------
  function houses() {
    const V = G('VILLAGE');
    return V && V.bld ? V.bld.filter(b => b.fac && b.fac.length && isFinite(b.cx)) : [];
  }
  // the facades of a building with their outward normal (away from its centre)
  function facadesOf(b) {
    return b.fac.map(f => {
      const mx = (f.ax + f.bx) / 2,
        my = (f.ay + f.by) / 2;
      let nx = -f.dy,
        ny = f.dx;
      if (nx * (mx - b.cx) + ny * (my - b.cy) < 0) {
        nx = -nx;
        ny = -ny;
      }
      // a: the facade's direction; face: the direction its outside faces (a panel on it: heading face + π/2)
      return { f, mx, my, nx, ny, L: f.L, a: Math.atan2(f.dy, f.dx), face: Math.atan2(ny, nx) };
    });
  }
  function nearHouse(x, y, r) {
    for (const b of houses()) {
      if (Math.abs(b.cx - x) > r + 30 || Math.abs(b.cy - y) > r + 30) continue;
      for (const f of b.fac) {
        const dx = f.bx - f.ax,
          dy = f.by - f.ay,
          L2 = dx * dx + dy * dy || 1,
          t = Math.max(0, Math.min(1, ((x - f.ax) * dx + (y - f.ay) * dy) / L2));
        if (Math.hypot(f.ax + t * dx - x, f.ay + t * dy - y) < r) return b;
      }
    }
    return null;
  }
  // a free spot near (x, y): no building within r, searched on rings out to R
  function freeSpot(x, y, r, R = 60) {
    if (!nearHouse(x, y, r)) return [x, y];
    for (let d = 4; d <= R; d += 4)
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2,
          px = x + d * Math.cos(a),
          py = y + d * Math.sin(a);
        if (!nearHouse(px, py, r) && (!G('ROADS') || !ROADS.edge || ROADS.edge(px, py) < -r * 0.6)) return [px, py];
      }
    return [x, y];
  }
  const KIND = { street: 3, lane: 4, service: 5, track: 6 };
  function ways(kinds) {
    const R = G('ROADS');
    if (!R || !R.ways) return [];
    const ks = kinds.map(k => KIND[k]);
    return R.ways.filter(w => ks.includes(w.kind));
  }
  // the nearest point on the given ways: { w, i (segment), t, x, y, d }
  function nearestOn(list, x, y) {
    let best = null;
    for (const w of list) {
      const p = w.p;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i],
          ay = p[i + 1],
          dx = p[i + 2] - ax,
          dy = p[i + 3] - ay,
          L2 = dx * dx + dy * dy || 1,
          t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)),
          qx = ax + t * dx,
          qy = ay + t * dy,
          d = Math.hypot(qx - x, qy - y);
        if (!best || d < best.d) best = { w, i: i / 2, t, x: qx, y: qy, d };
      }
    }
    return best;
  }
  // a polyline resampled every step metres: [[x, y, s]…] (s = metres along)
  function resample(pts, step) {
    const out = [];
    let s = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i],
        [bx, by] = pts[i + 1],
        L = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.ceil(L / step));
      for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, s + (L * k) / n]);
      s += L;
    }
    const last = pts[pts.length - 1];
    out.push([last[0], last[1], s]);
    return out;
  }
  // the points of a way from the point nearest (x0, y0) to the one nearest (x1, y1)
  function wayPath(w, x0, y0, x1, y1) {
    const a = nearestOn([w], x0, y0),
      b = nearestOn([w], x1, y1),
      p = w.p,
      pt = i => [p[i * 2], p[i * 2 + 1]];
    const out = [[a.x, a.y]];
    if (a.i + a.t <= b.i + b.t) for (let i = a.i + 1; i <= b.i; i++) out.push(pt(i));
    else for (let i = a.i; i > b.i; i--) out.push(pt(i));
    out.push([b.x, b.y]);
    return out;
  }
  // a strip along a resampled path: half widths wl (left) and wr (right), height z(x, y, s) + dz, colour per vertex cl(x, y, s, side)
  function strip(B, path, wl, wr, z, cl, flow) {
    for (let i = 0; i + 1 < path.length; i++) {
      const [ax, ay, sa] = path[i],
        [bx, by, sb] = path[i + 1],
        L = Math.hypot(bx - ax, by - ay) || 1,
        nx = -(by - ay) / L,
        ny = (bx - ax) / L;
      const A0 = [ax - nx * wr, ay - ny * wr],
        A1 = [ax + nx * wl, ay + ny * wl],
        B0 = [bx - nx * wr, by - ny * wr],
        B1 = [bx + nx * wl, by + ny * wl];
      const v = (q, s, side) => [q[0], q[1], z(q[0], q[1], s, side)];
      B.quad(
        v(A0, sa, -1),
        v(B0, sb, -1),
        v(B1, sb, 1),
        v(A1, sa, 1),
        cl(ax, ay, sa, 0),
        null,
        flow ? [sa, sb, sb, sa] : null
      );
    }
    return B;
  }
  return {
    LAYER_L,
    LAYER_R,
    U,
    S,
    mats,
    GB,
    inst,
    mesh,
    dispose,
    setMask,
    thing,
    setAll,
    clearAll,
    tick,
    warm,
    houses,
    facadesOf,
    nearHouse,
    freeSpot,
    ways,
    nearestOn,
    resample,
    wayPath,
    strip,
    gnd,
    ter,
    col,
    hash,
    T,
  };
})();
