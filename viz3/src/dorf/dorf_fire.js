// ===================== feat/dorf village life 5: the fire on the field towards the Klinge (DFIRE) =====================
// Every other Saturday evening (dorf/dorf_cal.js) the village meets at a fire on Uwe's field, between the L 1625 and the forest edge on the
// way to the Klinge (world/roads.js routes.klinge). The fire place is there all the time (a ring of stones, charred logs, log benches);
// while it burns: logs stacked into a cone, flames (three crossed quads with a moving noise shader, additive), a glow on the ground, sparks
// rising and drifting (points, moved in the vertex shader – no work per frame), light from one borrowed pavilion light that flickers (no
// new light: that would compile every shader again), and a crackle made in the Web Audio graph (noise bursts, by distance and side).
// Built the first time one comes within 400 m; the villagers stand around it (dorf/dorf.js).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R, cam, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, pbrMat } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { LIGHTSTATE } from '../game/home.js';
import { audio } from '../audio/audio.js';
import { VPROPS } from '../world/village_props.js';
export const DFIRE = (() => {
  const S = { built: false, at: [-262, -439], z: 0, k: 0, want: 0, t: 0, ring: [], benches: [], err: null, cracks: 0 };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const U = { uT: { value: 0 }, uK: { value: 0 } };
  const hh = n => {
    const v = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return v - Math.floor(v);
  };
  // the charred ends of the logs: charcoal whose cracks glow while it burns (an emissive map: the seams between the char blocks bright,
  // the blocks dark – no flat colour over the whole log)
  function emberMap() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#050100';
    x.fillRect(0, 0, 128, 128);
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    x.lineCap = 'round';
    for (let row = 0; row < 7; row++) {
      const y0 = row * 18.3 + rnd() * 5;
      x.strokeStyle = `rgba(255, ${110 + Math.floor(rnd() * 90)}, 36, ${(0.35 + rnd() * 0.55).toFixed(2)})`;
      x.lineWidth = 0.6 + rnd() * 1.2;
      x.beginPath();
      x.moveTo(0, y0);
      for (let px = 8; px <= 128; px += 8) x.lineTo(px, y0 + (rnd() - 0.5) * 3);
      x.stroke();
      for (let k = 0; k < 3; k++) {
        const px = rnd() * 128;
        x.beginPath();
        x.moveTo(px, y0);
        x.lineTo(px + (rnd() - 0.5) * 5, y0 + 18.3);
        x.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1.5);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const EMBER = pbrMat('char', { fallback: 0x1f1c1a, nrm: 1.0, env: 0.5 });
  EMBER.emissive.setHex(0xff6a22);
  EMBER.emissiveMap = emberMap();
  EMBER.emissiveIntensity = 0;
  const NOISE = `float fh( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
    float fn( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
      return mix( mix( fh( i ), fh( i + vec2( 1.0, 0.0 ) ), f.x ), mix( fh( i + vec2( 0.0, 1.0 ) ), fh( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
    float fbm( vec2 p ) { return 0.55 * fn( p ) + 0.3 * fn( p * 2.1 + 3.7 ) + 0.15 * fn( p * 4.3 + 1.3 ); }`;
  function flameMat(seed) {
    return new THREE.ShaderMaterial({
      uniforms: Object.assign({ uS: { value: seed } }, U),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader:
        'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
      fragmentShader: `uniform float uT, uK, uS; varying vec2 vUv; ${NOISE}
        void main() {
          float u = vUv.x, v = vUv.y, t = uT * 1.7 + uS * 9.0;
          float n = fbm( vec2( u * 3.2 + uS * 5.0, v * 2.4 - t ) ), n2 = fn( vec2( u * 7.0 - uS, v * 5.0 - t * 1.6 ) );
          float w = ( 1.0 - v ) * ( 0.95 - abs( u - 0.5 ) * 2.0 * ( 0.55 + 0.9 * v ) );   // wide at the root, a tip at the top
          float f = smoothstep( 0.08, 0.5, w + ( n - 0.5 ) * 0.62 + ( n2 - 0.5 ) * 0.18 );
          f *= ( 1.0 - smoothstep( 0.78, 1.0, v ) ) * smoothstep( 0.0, 0.12, u ) * ( 1.0 - smoothstep( 0.88, 1.0, u ) );   // never cut by the quad's edges
          vec3 c = mix( vec3( 1.0, 0.22, 0.03 ), vec3( 1.0, 0.72, 0.32 ), smoothstep( 0.35, 0.95, f ) );
          c = mix( c, vec3( 1.0, 0.9, 0.62 ), smoothstep( 0.9, 1.0, f ) * ( 1.0 - v ) * 0.7 );
          gl_FragColor = vec4( c * f * uK * 1.2, 1.0 );
        }`,
    });
  }
  // the trampled ground round the fire: bare earth and ash, a ragged edge into the field; its normals point straight up (on the coarse
  // terrain the light of the fire showed the edges of its triangles), the glow of the embers in its emissive map (no additive plane over
  // the stones)
  const PATCH = 0.025; // above the terrain
  function glowMap() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d'),
      g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.1, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.24, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.03)');
    g.addColorStop(0.6, 'rgba(255,255,255,0)');
    x.fillStyle = '#000';
    x.fillRect(0, 0, 64, 64);
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function patch(R, fx, fy) {
    const SEG = 56,
      RINGS = 7,
      pos = [],
      nrm = [],
      uv = [],
      col = [],
      idx = [],
      z0 = KERN.terrain(fx, fy);
    const vert = (x, y, r) => {
      pos.push(x, KERN.terrain(fx + x, fy + y) - z0 + PATCH, -y);
      nrm.push(0, 1, 0);
      uv.push(0.5 + x / (2 * R * 1.15), 0.5 + y / (2 * R * 1.15));
      // ash grey in the middle, trampled grey-brown earth, worn grass towards the edge, where it fades into the field (vertex alpha)
      const q = r / R,
        n = hh(Math.round(x * 3) * 7.1 + Math.round(y * 3) * 3.3) * 0.05,
        ash = Math.max(0, 1 - q / 0.3),
        rim = Math.min(1, Math.max(0, (q - 0.45) / 0.45));
      col.push(
        lin(0.21 + n - ash * 0.06 - rim * 0.03),
        lin(0.19 + n - ash * 0.05 + rim * 0.02),
        lin(0.16 + n - ash * 0.03 - rim * 0.03),
        Math.max(0, Math.min(1, (1.0 - q) / 0.35))
      );
    };
    vert(0, 0, 0);
    for (let i = 1; i <= RINGS; i++)
      for (let k = 0; k < SEG; k++) {
        const a = (k / SEG) * Math.PI * 2,
          rag = i === RINGS ? 0.82 + 0.22 * hh(k * 1.7 + 3) + 0.08 * Math.sin(a * 5 + 1) : 1,
          r = (R * i * rag) / RINGS;
        vert(Math.cos(a) * r, Math.sin(a) * r, r);
      }
    for (let k = 0; k < SEG; k++) idx.push(0, 1 + k, 1 + ((k + 1) % SEG));
    for (let i = 1; i < RINGS; i++)
      for (let k = 0; k < SEG; k++) {
        const a = 1 + (i - 1) * SEG + k,
          b = 1 + (i - 1) * SEG + ((k + 1) % SEG),
          c = a + SEG,
          d = b + SEG;
        idx.push(a, c, b, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  const PATCHMAT = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    envMapIntensity: 0.4,
    emissive: 0xff5a14,
    emissiveMap: glowMap(),
    emissiveIntensity: 0,
    transparent: true, // the edge fades into the field
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  // smoke: soft puffs rising, lit orange near the flames, grey and fading higher up (points, moved in the vertex shader)
  function smokeMat() {
    return new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      vertexShader: `attribute float aSeed; uniform float uT, uK; varying float vA, vH;
        void main() {
          float life = 6.0 + fract( aSeed * 5.3 ) * 4.0, ph = fract( uT / life + aSeed * 7.7 );
          float h = 2.3 + ph * 5.5, a = aSeed * 61.0;
          vec3 p = vec3( cos( a ) * 0.2 + sin( uT * 0.25 + aSeed * 9.0 ) * 0.9 * ph + ph * ph * 1.6, h, sin( a ) * 0.2 + ph * 0.6 );
          vA = smoothstep( 0.0, 0.12, ph ) * ( 1.0 - ph ) * uK; vH = ph;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          gl_PointSize = clamp( ( 0.4 + ph * 2.0 ) * 260.0 / max( -mv.z, 0.5 ), 2.0, 140.0 );
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA, vH; void main() { vec2 q = gl_PointCoord - 0.5; float d = 1.0 - smoothstep( 0.15, 0.5, length( q ) );
          vec3 c = mix( vec3( 0.22, 0.13, 0.07 ), vec3( 0.05, 0.05, 0.055 ), smoothstep( 0.0, 0.3, vH ) );
          gl_FragColor = vec4( c, d * vA * 0.2 ); }`,
    });
  }
  function sparkMat() {
    return new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed; uniform float uT, uK; varying float vA;
        void main() {
          float life = 1.8 + fract( aSeed * 7.13 ) * 2.2, ph = fract( uT / life + aSeed * 3.1 );
          float h = 0.5 + ph * ( 2.2 + fract( aSeed * 3.7 ) * 2.8 ), a = aSeed * 107.0 + ph * 2.5, r = 0.12 + ph * ( 0.3 + fract( aSeed * 5.1 ) * 0.9 );
          vec3 p = vec3( cos( a ) * r + sin( uT * 0.7 + aSeed * 20.0 ) * 0.5 * ph * ph, h, sin( a ) * r );
          vA = ( 1.0 - ph ) * ( 0.6 + 0.4 * sin( uT * 13.0 + aSeed * 40.0 ) ) * uK;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          gl_PointSize = clamp( ( 1.0 + 1.6 * fract( aSeed * 11.0 ) ) * 14.0 / max( -mv.z, 0.5 ), 1.0, 4.0 );
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; void main() { vec2 q = gl_PointCoord - 0.5; float d = 1.0 - smoothstep( 0.2, 0.5, length( q ) );
          gl_FragColor = vec4( vec3( 1.0, 0.62, 0.22 ) * d * vA * 1.6, 1.0 ); }`,
    });
  }
  // ---- field stones: a sphere pushed out of round (noise on the unit sphere, so the seam's twin vertices move alike), flattened and
  // turned along the ring, half in the ground; grey-brown, each a little different, sooty towards the fire and on top (vertex colours) ----
  function stones(n, R0, fx, fy) {
    const geos = [],
      hn = (x, y, z, k) => {
        const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + k * 4.581) * 43758.5453;
        return v - Math.floor(v);
      },
      rq = v => Math.round(v * 1000) / 1000,
      P = new THREE.Vector3(),
      C = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.12 * Math.sin(i * 5.3),
        r = R0 + 0.07 * Math.sin(i * 7.1),
        cx = Math.cos(a) * r,
        cy = Math.sin(a) * r,
        rl = 0.13 + 0.07 * hh(i + 1), // along the ring
        rw = 0.1 + 0.04 * hh(i + 2), // across
        h = 0.08 + 0.05 * hh(i + 3),
        dz = KERN.terrain(fx + cx, fy + cy) - KERN.terrain(fx, fy),
        g = new THREE.SphereGeometry(1, 10, 7),
        p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k),
          y = p.getY(k),
          z = p.getZ(k),
          d = 0.8 + 0.28 * hn(rq(x), rq(y), rq(z), i) + 0.1 * hn(rq(x * 3), rq(y * 3), rq(z * 3), i + 9);
        p.setXYZ(k, x * d * rw, y * d * h, z * d * rl); // three.js: y up; z along the ring before the turn
      }
      g.rotateY(a); // the long side along the ring
      g.rotateX((hh(i + 6) - 0.5) * 0.25);
      g.translate(cx, dz + h * 0.25, -cy);
      g.computeVertexNormals();
      const col = new Float32Array(p.count * 3),
        base = 0.2 + 0.1 * hh(i + 4), // grey field stones, some with a little rust of sandstone
        warm = hh(i + 5) < 0.35 ? 0.04 + hh(i + 7) * 0.05 : 0.005;
      C.set(cx, dz + h * 0.25, -cy);
      const ix = -cx / r,
        iz = cy / r; // towards the fire (three.js x, z)
      for (let k = 0; k < p.count; k++) {
        P.set(p.getX(k), p.getY(k), p.getZ(k)).sub(C).normalize();
        const t = P.x * ix + P.z * iz, // +1 towards the fire, −1 away
          tow = Math.max(0, Math.min(1, (t + 0.2) / 0.9)),
          top = Math.max(0, Math.min(1, (P.y + 0.3) / 0.9)),
          soot = Math.pow(tow, 1.5) * (0.55 + 0.45 * top), // black on the side of the fire
          away = Math.max(0, -t) * (1 - 0.5 * top), // the far side in its own shade (the fire light hangs high)
          sp = (hn(rq(P.x * 4), rq(P.y * 4), rq(P.z * 4), i + 3) - 0.5) * 0.07,
          v = (base + sp) * (1 - 0.82 * soot) * (1 - 0.45 * away);
        col[k * 3] = lin(v + warm);
        col[k * 3 + 1] = lin(v + warm * 0.45);
        col[k * 3 + 2] = lin(v + 0.01 - warm * 0.3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geos.push(g);
    }
    const m = BufferGeometryUtils.mergeGeometries(geos);
    for (const g of geos) g.dispose();
    return m;
  }
  // ---- build: stones, logs, benches; the burning parts (hidden while cold) ----
  function build() {
    if (S.built || S.err) return S.built;
    try {
      const [x, y] = S.at;
      S.z = KERN.terrain(x, y);
      const grp = new THREE.Group();
      grp.position.copy(V(x, y, S.z));
      scene.add(grp);
      S.grp = grp;
      const kit = VPROPS.kit();
      // the ring of field stones (rounded, irregular, sooty on the side towards the fire) and the ash bed
      const stoneG = stones(16, 1.02, x, y);
      kit.lathe(
        0,
        0,
        PATCH,
        [
          [0.95, 0],
          [0.0, 0.03],
        ],
        18,
        L(0.1, 0.09, 0.085)
      ); // the ash bed
      const pm = new THREE.Mesh(patch(4.4, x, y), PATCHMAT);
      pm.receiveShadow = true;
      pm.renderOrder = 1;
      grp.add(pm);
      // log benches around (three), a few spare logs, straw bales
      for (const [a, len] of [
        [200, 2.2],
        [262, 2.0],
        [330, 2.2],
      ]) {
        const r = 3.3,
          ar = (a * Math.PI) / 180,
          bx = Math.cos(ar) * r,
          by = Math.sin(ar) * r;
        const dz = KERN.terrain(x + bx, y + by) - S.z; // the field is not quite level
        S.benches.push({ x: bx, y: by, a: ar + Math.PI, len, dz });
        const g = new THREE.CylinderGeometry(0.2, 0.22, len, 10);
        g.rotateZ(Math.PI / 2);
        g.rotateY(ar + Math.PI / 2);
        g.translate(bx, 0.2 + dz, -by);
        const me = new THREE.Mesh(g, MAT.logs);
        me.castShadow = me.receiveShadow = true;
        grp.add(me);
      }
      // the cone of logs (burning): round logs with bark, their upper ends charred and glowing in the flames; charred stubs (always)
      const cone = new THREE.Group(),
        bark = [],
        burnt = [],
        up = new THREE.Vector3(0, 1, 0),
        apex = new THREE.Vector3(0, 1.3, 0),
        m4 = new THREE.Matrix4(),
        q = new THREE.Quaternion(),
        one = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.3 + 0.15 * Math.sin(i * 3.1),
          rf = 0.58 + 0.08 * hh(i + 20),
          foot = new THREE.Vector3(Math.cos(a) * rf, 0, -Math.sin(a) * rf),
          top = apex
            .clone()
            .add(new THREE.Vector3(0.06 * Math.sin(i * 2.3), 0.08 * hh(i + 21), 0.06 * Math.cos(i * 1.7))),
          dir = top.clone().sub(foot),
          len = dir.length() + 0.16,
          r = 0.045 + 0.03 * hh(i + 22),
          cut = 0.5 + 0.12 * hh(i + 23); // where the bark ends and the char begins
        q.setFromUnitVectors(up, dir.normalize());
        m4.compose(foot, q, one);
        const gb = new THREE.CylinderGeometry(r * 0.96, r * 1.04, len * cut, 8, 1);
        gb.translate(0, (len * cut) / 2, 0);
        gb.applyMatrix4(m4);
        bark.push(gb);
        const gc = new THREE.CylinderGeometry(r * 0.55, r * 0.9, len * (1.04 - cut), 8, 1);
        gc.translate(0, len * (cut - 0.04) + (len * (1.04 - cut)) / 2, 0);
        gc.applyMatrix4(m4);
        burnt.push(gc);
      }
      for (const [list, mat] of [
        [bark, MAT.logs],
        [burnt, EMBER],
      ]) {
        const me = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(list), mat);
        me.castShadow = true;
        cone.add(me);
        for (const g of list) g.dispose();
      }
      grp.add(cone);
      S.cone = cone;
      const stubs = [];
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7,
          g = new THREE.CylinderGeometry(0.07, 0.08, 0.7, 8);
        g.rotateZ(Math.PI / 2);
        g.rotateY(a);
        g.translate(Math.cos(a) * 0.2, 0.08, -Math.sin(a) * 0.2);
        stubs.push(g);
      }
      grp.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stubs), EMBER));
      const kitMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 });
      const sm = new THREE.Mesh(stoneG, kitMat);
      sm.castShadow = sm.receiveShadow = true;
      grp.add(sm);
      grp.add(new THREE.Mesh(kit.geo(), kitMat));
      // flames: three crossed quads, the glow on the ground, sparks
      const fl = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const g = new THREE.PlaneGeometry(1.25, 1.9);
        g.translate(0, 0.95 + 0.1, 0);
        const me = new THREE.Mesh(g, flameMat(i * 0.37));
        me.rotation.y = (i / 3) * Math.PI;
        me.renderOrder = 3;
        fl.add(me);
      }
      const N = 70,
        sg = new THREE.BufferGeometry(),
        seed = new Float32Array(N);
      for (let i = 0; i < N; i++) seed[i] = Math.random();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
      sg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
      sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), 6);
      const pts = new THREE.Points(sg, sparkMat());
      pts.renderOrder = 4;
      fl.add(pts);
      const NS = 22,
        mg = new THREE.BufferGeometry(),
        ms = new Float32Array(NS);
      for (let i = 0; i < NS; i++) ms[i] = (i + Math.random() * 0.5) / NS;
      mg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NS * 3), 3));
      mg.setAttribute('aSeed', new THREE.Float32BufferAttribute(ms, 1));
      mg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, 0), 8);
      const smoke = new THREE.Points(mg, smokeMat());
      smoke.renderOrder = 5;
      fl.add(smoke);
      fl.traverse(o => {
        o.userData.noMerge = true;
        o.castShadow = false;
        o.receiveShadow = false;
      });
      fl.visible = false;
      grp.add(fl);
      S.fl = fl;
      grp.traverse(o => (o.userData.noMerge = true));
      try {
        // the flame, spark and smoke programs now, while the fire is cold (compile() takes only what is visible at the call)
        fl.visible = true;
        if (R.compileAsync) R.compileAsync(grp, cam, scene).catch(() => {});
      } catch (e) {}
      fl.visible = false;
      S.built = true;
      markDirty(true);
    } catch (e) {
      S.err = String(e && e.message ? e.message : e);
      console.warn('dorf fire', e);
    }
    return S.built;
  }
  // ---- the light: the pavilion's stove light (LIGHTS[1], orange) borrowed while the fire burns and one is near ----
  let lent = null;
  function light(on) {
    const LS = window.LIGHTS;
    if (!LS) return;
    const l = LS[1];
    if (on && !lent) lent = { l, p: l.position.clone(), d: l.distance, dec: l.decay, c: l.color.getHex() };
    else if (!on && lent) {
      l.position.copy(lent.p);
      l.distance = lent.d;
      l.decay = lent.dec;
      l.color.setHex(lent.c);
      lent = null;
      if (LIGHTSTATE) LIGHTSTATE.apply();
      markDirty(true);
    }
  }
  // ---- the crackle: noise bursts through a band-pass, now and then a pop; a low roar under it ----
  let nb = null,
    nextT = 0,
    roar = null;
  function crackle(k, d) {
    const A = audio.raw && audio.raw();
    if (!A || A.ctx.state !== 'running' || k < 0.05 || d > 70) {
      if (roar) {
        try {
          roar.g.gain.setTargetAtTime(0, A ? A.ctx.currentTime : 0, 0.3);
        } catch (e) {}
      }
      return;
    }
    const ctx = A.ctx,
      sp = audio.spatial ? audio.spatial(S.at[0], S.at[1], 6) : { vol: 1 / (1 + d * d * 0.03), pan: 0 };
    if (!nb) {
      nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const a = nb.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    }
    if (!roar) {
      const s = ctx.createBufferSource(),
        f = ctx.createBiquadFilter(),
        g = ctx.createGain();
      s.buffer = nb;
      s.loop = true;
      f.type = 'lowpass';
      f.frequency.value = 380;
      g.gain.value = 0;
      s.connect(f);
      f.connect(g);
      g.connect(A.sfx);
      s.start();
      roar = { s, g };
    }
    roar.g.gain.setTargetAtTime(0.09 * k * sp.vol, ctx.currentTime, 0.4);
    const now = ctx.currentTime;
    if (nextT < now) nextT = now + 0.05;
    while (nextT < now + 0.25) {
      const pop = Math.random() < 0.12,
        s = ctx.createBufferSource(),
        f = ctx.createBiquadFilter(),
        g = ctx.createGain(),
        p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      s.buffer = nb;
      f.type = 'bandpass';
      f.frequency.value = pop ? 900 + Math.random() * 700 : 1800 + Math.random() * 3200;
      f.Q.value = pop ? 1.2 : 2.5;
      const peak = (pop ? 0.55 : 0.12 + Math.random() * 0.18) * k * sp.vol,
        dur = pop ? 0.05 : 0.006 + Math.random() * 0.018;
      g.gain.setValueAtTime(0.0001, nextT);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), nextT + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, nextT + 0.002 + dur);
      s.connect(f);
      f.connect(g);
      if (p) {
        p.pan.value = Math.max(-1, Math.min(1, sp.pan || 0));
        g.connect(p);
        p.connect(A.sfx);
      } else g.connect(A.sfx);
      s.start(nextT, Math.random() * 0.9, dur + 0.02);
      S.cracks++;
      nextT += pop ? 0.25 + Math.random() * 0.6 : 0.02 + Math.random() * Math.random() * 0.22;
    }
  }
  // ---- per frame (dorf/dorf.js): burning or not, the flicker, the light, the sound ----
  function tick(dt, burning, dist) {
    if (!S.built) return;
    S.want = burning ? 1 : 0;
    const k0 = S.k;
    S.k += (S.want - S.k) * Math.min(1, dt * 0.6);
    if (Math.abs(S.k - S.want) < 0.004) S.k = S.want;
    const on = S.k > 0.01;
    if (S.fl.visible !== on) {
      S.fl.visible = on;
      S.cone.visible = burning || on;
      markDirty(true);
    }
    if (!on) {
      EMBER.emissiveIntensity = 0;
      PATCHMAT.emissiveIntensity = 0;
      if (lent) light(false);
      crackle(0, 1e9);
      return;
    }
    S.t += dt;
    U.uT.value = S.t;
    U.uK.value = S.k;
    const near = dist < 140;
    if (near !== !!lent) light(near);
    if (lent) {
      const fl = 0.8 + 0.12 * Math.sin(S.t * 11.3) + 0.08 * Math.sin(S.t * 23.1 + 1.3) + 0.06 * Math.sin(S.t * 4.1);
      if (!S.lightAt) S.lightAt = V(S.at[0], S.at[1], S.z + 2.6);
      lent.l.position.copy(S.lightAt);
      lent.l.distance = 18;
      lent.l.decay = 1.3;
      lent.l.color.setHex(0xff8f45);
      lent.l.intensity = 31 * S.k * fl;
      EMBER.emissiveIntensity = (0.55 + 0.45 * fl) * S.k;
      PATCHMAT.emissiveIntensity = 0.7 * S.k * (0.85 + 0.15 * Math.sin(S.t * 9) * Math.sin(S.t * 5.3 + 1));
    }
    crackle(S.k, dist);
    if (dist < 400 || Math.abs(S.k - k0) > 1e-3) markDirty();
  }
  // seats for the people: standing around the fire (heading to the fire) and on the benches
  function spots() {
    const [x, y] = S.at,
      out = [];
    for (const a of [10, 45, 80, 115, 150]) {
      const ar = (a * Math.PI) / 180,
        r = 2.3;
      out.push({
        x: x + Math.cos(ar) * r,
        y: y + Math.sin(ar) * r,
        hd: (Math.atan2(-Math.cos(ar), -Math.sin(ar)) * 180) / Math.PI,
        stand: true,
      });
    }
    for (const b of S.benches)
      out.push({
        x: x + b.x,
        y: y + b.y,
        hd: (Math.atan2(-Math.cos(b.a - Math.PI), -Math.sin(b.a - Math.PI)) * 180) / Math.PI,
        sit: true,
      });
    return out;
  }
  KERN.provide(
    'place',
    (x, y) =>
      Math.hypot(x - S.at[0], y - S.at[1]) < 26
        ? S.k > 0.2
          ? 'Feuer am Acker · Richtung Klinge'
          : 'Feuerstelle am Acker · Richtung Klinge'
        : null,
    11
  );
  Object.assign(S, { build, tick, spots, light, PATCH });
  return S;
})();
window.DFIRE = DFIRE;
