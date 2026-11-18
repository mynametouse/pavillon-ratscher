// ===================== feat/fotorealismus: the air – haze that lies in the valleys and brightens towards the sun (LUFT) =====================
// The haze over the land (world/ratscher.js: exponential, its density per hour of the day and from the weather's visibility) had one
// colour all round and the same density at every height. The air is neither:
// - it lies in the valleys: its density falls with the height (scale height H, 450 m – the reservoir's valley is hazier than the
//   ridge of the Thuringian Forest above it). The density of the day stays what it is at the garden's height; along a view it is the
//   mean between the camera's height and the point's.
// - it scatters the sun's light forwards: towards the sun the haze is brighter, at a low sun also warmer (the sun's own colour); away
//   from it a little darker. As much as the sun shines (none under a closed deck, hardly any by the moon).
// All of it in three's fog chunks, so every material with fog takes it (and the far land's fade into the haze, world/ratscher.js, through
// the name fogColor); no texture, three uniforms shared by all materials (typed arrays in THREE.ShaderLib, as the shadow cascades',
// foto/schatten_glsl.js) and one varying – the view from the camera to the point in the world's axes. A material without the uniforms
// (a ShaderMaterial of its own with fog) gets zeros: the haze as before.
//   ?noluft            the chunks stay as they were (comparisons)
//   LUFT.state()       { ok, on, H, ref, k: [density at the camera, towards the sun, away from it], glow }
//   LUFT.set({ H, on })  the scale height (m; the weather may lower it for ground fog), off: one colour and one density again
import * as THREE from 'three';
import { QS, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { sky, sun, sunDir } from '../garden/env.js';
export const LUFT = (() => {
  const U = {
    // x: the density at the camera's height against the garden's, less 1; y: 1 / scale height (0: the same at every height)
    A: new Float32Array([0, 0, 0, 0]),
    // x, y: where the sun stands (the world's x and z, length 1); z: brighter towards it, w: darker away from it
    S: new Float32Array([1, 0, 0, 0]),
    // the sun's colour in the haze towards it (added)
    G: new Float32Array([0, 0, 0, 0]),
  };
  const S = { ok: false, on: true, H: 450, ref: NaN };
  const C = THREE.ShaderChunk,
    FRAG_OLD = [
      'float fogFactor = 1.0 - exp( - fogDensity * vFogDepth );',
      'float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
    ],
    MIX = 'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );',
    old = FRAG_OLD.find(t => C.fog_fragment.includes(t));
  if (
    !QS.has('noluft') &&
    old &&
    C.fog_fragment.includes(MIX) &&
    C.fog_vertex.includes('vFogDepth = - mvPosition.z;') &&
    C.fog_pars_vertex.includes('varying float vFogDepth;') &&
    C.fog_pars_fragment.includes('varying float vFogDepth;')
  ) {
    C.fog_pars_vertex = C.fog_pars_vertex.replace(
      'varying float vFogDepth;',
      'varying float vFogDepth;\n\tvarying vec3 vLuft;'
    );
    // from the camera to the point, in the world's axes (the view matrix turns only)
    C.fog_vertex = C.fog_vertex.replace(
      'vFogDepth = - mvPosition.z;',
      'vFogDepth = - mvPosition.z;\n\tvLuft = mvPosition.xyz * mat3( viewMatrix );'
    );
    C.fog_pars_fragment = C.fog_pars_fragment.replace(
      'varying float vFogDepth;',
      'varying float vFogDepth;\n\tvarying vec3 vLuft;\n\tuniform vec4 luftA;\n\tuniform vec4 luftS;\n\tuniform vec4 luftG;'
    );
    C.fog_fragment = C.fog_fragment
      .replace(
        old,
        // the mean density along the view: ( 1 − exp( −x ) ) / x with x = the height climbed in scale heights
        `float luD = length( vLuft ), luX = vLuft.y * luftA.y;
		float fogFactor = 1.0 - exp( - fogDensity * luD * ( 1.0 + luftA.x ) * ( abs( luX ) > 0.02 ? ( 1.0 - exp( - luX ) ) / luX : 1.0 - 0.5 * luX ) );`
      )
      .replace(
        MIX,
        `float luM = dot( vLuft.xz, luftS.xy ) / max( length( vLuft ), 0.001 ), luF = max( luM, 0.0 );
	luF *= luF; luF *= luF;
	vec3 luftC = fogColor * ( 1.0 + luftS.z * luF - luftS.w * max( - luM, 0.0 ) ) + luftG.rgb * luF;
	gl_FragColor.rgb = mix( gl_FragColor.rgb, luftC, fogFactor );
	#define fogColor luftC`
      );
    for (const k of Object.keys(THREE.ShaderLib)) {
      const L = THREE.ShaderLib[k];
      if (!L || !L.uniforms || !L.uniforms.fogColor) continue;
      L.uniforms.luftA = { value: U.A };
      L.uniforms.luftS = { value: U.S };
      L.uniforms.luftG = { value: U.G };
    }
    S.ok = true;
  } else if (!QS.has('noluft')) console.warn('Luft: three-Shader geändert, aus');
  // ---- each frame, for the camera that draws it (the sky is the first thing drawn) ----
  const sst = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  function frame(camera) {
    if (!S.ok) return;
    const F = scene.fog;
    if (!S.on || !F || !F.isFogExp2) {
      U.A[0] = U.A[1] = U.S[2] = U.S[3] = U.G[0] = U.G[1] = U.G[2] = 0;
      return;
    }
    if (!Number.isFinite(S.ref)) {
      // the height the day's density is meant for: the garden's ground (once the land is there)
      const g = KERN.ground(0, 0);
      if (Number.isFinite(g)) S.ref = g;
    }
    const yc = camera.matrixWorld.elements[13],
      ref = Number.isFinite(S.ref) ? S.ref : yc;
    U.A[1] = 1 / S.H;
    U.A[0] = Math.exp(-Math.min(6, Math.max(-1.5, (yc - ref) / S.H))) - 1;
    // the sun (or the moon – whatever lights the land): where it stands, how much of it shines, how low it is
    const d = sunDir,
      hl = Math.hypot(d.x, d.z) || 1,
      el = (Math.asin(Math.min(1, Math.max(-1, d.y / (d.length() || 1)))) * 180) / Math.PI,
      s = Math.min(1, Math.max(0, sun.intensity / 3)),
      low = sst(25, 4, el) * sst(-6, 1, el),
      fl = 0.2126 * F.color.r + 0.7152 * F.color.g + 0.0722 * F.color.b,
      c = sun.color,
      cm = Math.max(c.r, c.g, c.b, 1e-4),
      g = fl * s * low * 0.5;
    U.S[0] = d.x / hl;
    U.S[1] = d.z / hl;
    U.S[2] = s * (0.18 + 0.5 * low);
    U.S[3] = s * (0.06 + 0.12 * low);
    U.G[0] = (c.r / cm) * g;
    U.G[1] = (c.g / cm) * g;
    U.G[2] = (c.b / cm) * g;
  }
  if (S.ok) {
    const prev = sky.onBeforeRender;
    sky.onBeforeRender = function (r, s, c, ...rest) {
      prev.call(this, r, s, c, ...rest);
      frame(c);
    };
  }
  const state = () => ({
    ok: S.ok,
    on: S.on,
    H: S.H,
    ref: Number.isFinite(S.ref) ? +S.ref.toFixed(1) : null,
    k: [+(1 + U.A[0]).toFixed(3), +U.S[2].toFixed(3), +U.S[3].toFixed(3)],
    glow: [+U.G[0].toFixed(4), +U.G[1].toFixed(4), +U.G[2].toFixed(4)],
  });
  function set(o) {
    if (o && Number.isFinite(o.H) && o.H >= 20) S.H = o.H;
    if (o && 'on' in o) S.on = !!o.on;
    markDirty();
    return state();
  }
  return { state, set, frame, U, S };
})();
if (typeof window !== 'undefined') window.LUFT = LUFT;
