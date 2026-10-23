// ===================== feat/dorf village life 5: the fire on the field towards the Klinge (DFIRE) =====================
// Every other Saturday evening (dorf/dorf_cal.js) the village meets at a fire on Uwe's field, between the L 1625 and the forest edge on the
// way to the Klinge (world/roads.js routes.klinge). The fire place is there all the time (a ring of stones, charred logs, log benches);
// while it burns: logs stacked into a cone, flames (three crossed quads with a moving noise shader, additive), a glow on the ground, sparks
// rising and drifting (points, moved in the vertex shader – no work per frame), light from one borrowed pavilion light that flickers (no
// new light: that would compile every shader again), and a crackle made in the Web Audio graph (noise bursts, by distance and side).
// Built the first time one comes within 400 m; the villagers stand around it (dorf/dorf.js).
import * as THREE from 'three';
import { R, cam, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { LIGHTSTATE } from '../game/home.js';
import { audio } from '../audio/audio.js';
import { VPROPS } from '../world/village_props.js';
export const DFIRE = (() => {
  const S = { built: false, at: [-262, -439], z: 0, k: 0, want: 0, t: 0, ring: [], benches: [], err: null, cracks: 0 };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const U = { uT: { value: 0 }, uK: { value: 0 } };
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
          vec3 c = mix( vec3( 1.0, 0.22, 0.03 ), vec3( 1.0, 0.72, 0.32 ), smoothstep( 0.35, 0.95, f ) );
          c = mix( c, vec3( 1.0, 0.95, 0.75 ), smoothstep( 0.85, 1.0, f ) * ( 1.0 - v ) );
          gl_FragColor = vec4( c * f * uK * 2.2, 1.0 );
        }`,
    });
  }
  function glowMat() {
    return new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      vertexShader:
        'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
      fragmentShader: `uniform float uT, uK; varying vec2 vUv;
        void main() { float r = length( vUv - 0.5 ) * 2.0; float fl = 0.85 + 0.15 * sin( uT * 9.0 ) * sin( uT * 5.3 + 1.0 );
          float a = pow( max( 0.0, 1.0 - r ), 2.2 ) * uK * fl; gl_FragColor = vec4( vec3( 1.0, 0.45, 0.12 ) * a * 0.9, 1.0 ); }`,
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
          float h = 0.5 + ph * ( 3.0 + fract( aSeed * 3.7 ) * 4.0 ), a = aSeed * 107.0 + ph * 2.5, r = 0.12 + ph * ( 0.3 + fract( aSeed * 5.1 ) * 0.9 );
          vec3 p = vec3( cos( a ) * r + sin( uT * 0.7 + aSeed * 20.0 ) * 0.5 * ph * ph, h, sin( a ) * r );
          vA = ( 1.0 - ph ) * ( 0.6 + 0.4 * sin( uT * 13.0 + aSeed * 40.0 ) ) * uK;
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          gl_PointSize = clamp( ( 1.6 + 2.0 * fract( aSeed * 11.0 ) ) * 26.0 / max( -mv.z, 0.5 ), 1.0, 7.0 );
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; void main() { vec2 q = gl_PointCoord - 0.5; float d = 1.0 - smoothstep( 0.2, 0.5, length( q ) );
          gl_FragColor = vec4( vec3( 1.0, 0.62, 0.22 ) * d * vA * 1.6, 1.0 ); }`,
    });
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
      // the ring of stones and the ash bed
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2,
          r = 1.0 + 0.06 * Math.sin(i * 7.1);
        kit.box(
          Math.cos(a) * r,
          Math.sin(a) * r,
          -0.05,
          0.28,
          0.22,
          0.2 + 0.05 * Math.sin(i * 3.3),
          a + 0.4,
          L(0.42 + 0.06 * Math.sin(i), 0.4, 0.37)
        );
      }
      kit.lathe(
        0,
        0,
        0.0,
        [
          [0.95, 0],
          [0.0, 0.03],
        ],
        18,
        L(0.1, 0.09, 0.085)
      ); // the ash bed
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
        S.benches.push({ x: bx, y: by, a: ar + Math.PI, len });
        const g = new THREE.CylinderGeometry(0.2, 0.22, len, 10);
        g.rotateZ(Math.PI / 2);
        g.rotateY(ar + Math.PI / 2);
        g.translate(bx, 0.2, -by);
        const me = new THREE.Mesh(g, MAT.logs);
        me.castShadow = me.receiveShadow = true;
        grp.add(me);
      }
      // the cone of logs (burning) and charred stubs (always)
      const cone = new THREE.Group();
      const up = new THREE.Vector3(0, 1, 0),
        apex = new THREE.Vector3(0, 1.3, 0);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3,
          foot = new THREE.Vector3(Math.cos(a) * 0.62, 0, -Math.sin(a) * 0.62),
          dir = apex.clone().sub(foot),
          len = dir.length() + 0.12,
          g = new THREE.CylinderGeometry(0.05, 0.075, len, 7);
        g.translate(0, len / 2, 0);
        const me = new THREE.Mesh(g, i % 3 ? MAT.logs : MAT.char);
        me.position.copy(foot);
        me.quaternion.setFromUnitVectors(up, dir.normalize());
        me.castShadow = true;
        cone.add(me);
      }
      grp.add(cone);
      S.cone = cone;
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7,
          g = new THREE.CylinderGeometry(0.07, 0.08, 0.7, 7);
        g.rotateZ(Math.PI / 2);
        g.rotateY(a);
        g.translate(Math.cos(a) * 0.2, 0.08, -Math.sin(a) * 0.2);
        grp.add(new THREE.Mesh(g, MAT.char));
      }
      grp.add(
        new THREE.Mesh(
          kit.geo(),
          new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 })
        )
      );
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
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), glowMat());
      gl.position.y = 0.03;
      gl.renderOrder = 2;
      fl.add(gl);
      const N = 90,
        sg = new THREE.BufferGeometry(),
        seed = new Float32Array(N);
      for (let i = 0; i < N; i++) seed[i] = Math.random();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
      sg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
      sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), 6);
      const pts = new THREE.Points(sg, sparkMat());
      pts.renderOrder = 4;
      fl.add(pts);
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
        if (R.compileAsync) R.compileAsync(grp, cam, scene).catch(() => {});
      } catch (e) {}
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
  const _v = new THREE.Vector3();
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
      _v.copy(V(S.at[0], S.at[1], S.z + 1.1));
      lent.l.position.copy(_v);
      lent.l.distance = 18;
      lent.l.decay = 1.3;
      lent.l.color.setHex(0xff8f45);
      lent.l.intensity = 36 * S.k * fl;
    }
    crackle(S.k, dist);
    if (dist < 400 || Math.abs(S.k - k0) > 1e-3) markDirty();
  }
  // seats for the people: standing around the fire (heading to the fire) and on the benches
  function spots() {
    const [x, y] = S.at,
      out = [];
    for (const a of [20, 70, 120, 160]) {
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
  Object.assign(S, { build, tick, spots, light });
  return S;
})();
window.DFIRE = DFIRE;
