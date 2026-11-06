// ===================== feat/wetter: the trees in the wind (WXWIND) =====================
// The garden's trees and hedges (garden/trees.js: ez-tree kinds, crowns as instanced leaf cards) sway with the real wind: their leaf
// material gets a few lines in its vertex shader at load – before the GPU preparation compiles it, so no program later – that lean
// the crown away from the wind and let it sway back and forth (slower big motion, a faster flutter of the leaves), more the higher a
// card sits above the trunk's foot and with the square of the wind speed, gusts stronger; each tree in its own phase. Only instanced
// crowns move (the garden, the ring around it, the garden planner's plants – their kinds are built later and handed over by
// garden/trees.js as they are made); the Dorflinde (one mesh) stays still but takes the snow. The crowns' shadows keep their
// place (the shadow map is drawn rarely and from the still crowns). The lawn and the meadow flowers (garden/grass.js hands each of their
// materials over right after making it, before anything draws it): their tips bend away from the wind in waves that run over the lawn
// with the gusts, plus a quick flicker; the bend is a share of each blade's height (a mown lawn moves less). Calm air: nothing moves,
// nothing is drawn for it. Snow and hoarfrost on the crowns: the same leaf patch whitens the leaves that face the sky (snow lying on
// top of the crowns and the hedges, rime on a frosty morning), patchy from card to card; lit as the leaves are.
import { markDirty } from '../core/assets.js';
import { GRASS } from '../garden/grass.js';
import { TREEHOOK, TREES } from '../garden/trees.js';
export const WXWIND = (() => {
  // x amplitude (m of lean at 12 m above the foot), y flutter (m), z time (s), w the share of the lean that stays (0–1); wxLW the
  // white of snow or rime on the leaves (0–1)
  const U = { wxSw: { value: [0, 0, 0, 0.5] }, wxSwD: { value: [1, 0] }, wxLW: { value: 0 } };
  // after the normal is known, before the light uses the colour: the leaves facing up turn white, patchy by place – the crown's own
  // normal (garden/trees.js gives the cards normals out from the crown), not the one turned towards the eye on a card's back
  const GLSL_WHITE = `#include <emissivemap_fragment>
  if ( wxLW > 0.002 ) {
#ifndef FLAT_SHADED
    vec3 wxN = inverseTransformDirection( normalize( vNormal ), viewMatrix );
#else
    vec3 wxN = inverseTransformDirection( normal, viewMatrix );
#endif
    float wxU = smoothstep( -0.15, 0.65, wxN.y );
    float wxR = fract( sin( dot( floor( vSVW.xz * 7.0 + vSVW.yy * 4.0 ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
    diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.82, 0.86, 0.92 ), clamp( wxLW * wxU * ( 0.65 + 0.5 * wxR ), 0.0, 0.95 ) );
  }`;
  // the lawn: x the bend (share of the height), y the flicker (share of the height); the time is wxSw.z
  const UG = { wxGr: { value: [0, 0] } };
  // three takes arrays for vec4/vec2 uniforms; kept as plain arrays so nothing allocates per frame
  const GLSL = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  if ( wxSw.x > 0.0005 ) {
    float wh = clamp( ( mvPosition.y - instanceMatrix[ 3 ][ 1 ] ) / 12.0, 0.0, 1.5 );
    float ph = instanceMatrix[ 3 ][ 0 ] * 0.21 + instanceMatrix[ 3 ][ 2 ] * 0.17;
    float sw = wxSw.w + ( 1.0 - wxSw.w ) * ( 0.6 * sin( wxSw.z * 1.3 + ph ) + 0.4 * sin( wxSw.z * 2.9 + ph * 1.7 ) );
    vec3 off = vec3( wxSwD.x, 0.0, wxSwD.y ) * ( wxSw.x * wh * wh * sw );
    off += vec3( sin( wxSw.z * 7.0 + mvPosition.x * 3.1 + mvPosition.y * 2.3 ), 0.6 * sin( wxSw.z * 6.1 + mvPosition.z * 2.7 ),
      cos( wxSw.z * 7.7 + mvPosition.y * 3.3 ) ) * ( wxSw.y * wh );
    mvPosition.xyz += off;
  }
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`;
  // the lawn's blades: the height above the clump's root (m), waves along the wind (a gust's front crosses the garden in a few seconds),
  // the tip goes down a little as it bends (the blade keeps about its length)
  const GLSL_GRASS = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  if ( wxGr.x > 0.0005 ) {
    float hw = max( mvPosition.y - instanceMatrix[ 3 ][ 1 ], 0.0 );
    vec2 at = vec2( instanceMatrix[ 3 ][ 0 ], instanceMatrix[ 3 ][ 2 ] );
    float al = dot( at, wxSwD );
    float wave = 0.62 + 0.38 * sin( wxSw.z * 1.9 - al * 0.7 ) * sin( wxSw.z * 0.73 - al * 0.23 + 1.3 );
    float b = wxGr.x * wave + wxGr.y * sin( wxSw.z * 8.3 + at.x * 3.7 + at.y * 2.9 + mvPosition.y * 40.0 );
    mvPosition.xz += wxSwD * ( hw * b );
    mvPosition.y -= 0.5 * hw * b * b;
  }
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`;
  const S = { n: 0, a: 0, g: 0, grass: 0, white: 0, drawT: 0 };
  // the materials patched (not a flag in userData: a clone copies userData, not the patch)
  const DONE = new WeakSet();
  // a leaf material of garden/trees.js, before its first compile: the sway and the white
  function leaf(m) {
    if (!m || DONE.has(m)) return;
    DONE.add(m);
    const prev = m.onBeforeCompile,
      key = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(m, sh, r);
      if (!sh.vertexShader.includes('#include <project_vertex>')) return;
      sh.uniforms.wxSw = U.wxSw;
      sh.uniforms.wxSwD = U.wxSwD;
      sh.vertexShader =
        'uniform vec4 wxSw; uniform vec2 wxSwD;\n' + sh.vertexShader.replace('#include <project_vertex>', GLSL);
      // the white needs the world position patchSV passes on (vSVW); without it the leaves only sway
      if (
        sh.fragmentShader.includes('varying vec3 vSVW;') &&
        sh.fragmentShader.includes('#include <emissivemap_fragment>')
      ) {
        sh.uniforms.wxLW = U.wxLW;
        sh.fragmentShader =
          'uniform float wxLW;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', GLSL_WHITE);
        S.white++;
      }
    };
    // its own programs (another material with the same key would otherwise share a program without the sway)
    m.customProgramCacheKey = () => (key ? key.call(m) : '') + '|wxsway';
    S.n++;
  }
  for (const K of Object.values(TREES)) leaf(K && K.leaf);
  // kinds built later – the garden planner's own (fruit tree, bushes, perennials), the Dorflinde – are handed over as they are made:
  // the same patch, so they draw with the garden's programs (none new when the planner's plants appear)
  TREEHOOK.leaf = leaf;
  // a lawn or flower material from garden/grass.js, before its first compile (its own programs, as above)
  GRASS.wxSway = m => {
    if (!m || DONE.has(m)) return;
    DONE.add(m);
    const prev = m.onBeforeCompile,
      key = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(m, sh, r);
      if (!sh.vertexShader.includes('#include <project_vertex>')) return;
      sh.uniforms.wxSw = U.wxSw;
      sh.uniforms.wxSwD = U.wxSwD;
      sh.uniforms.wxGr = UG.wxGr;
      sh.vertexShader =
        'uniform vec4 wxSw; uniform vec2 wxSwD; uniform vec2 wxGr;\n' +
        sh.vertexShader.replace('#include <project_vertex>', GLSL_GRASS);
    };
    m.customProgramCacheKey = () => (key ? key.call(m) : '') + '|wxgrass';
    S.grass++;
  };
  // the wind to show: v the 10-m wind (m/s), gust (m/s), dir (° from where it blows), k the gusts' swing now (0–1); on: shown at all
  function set(on, v, gust, dir, k) {
    const w = on ? v + (Math.max(gust, v) - v) * k : 0,
      a = Math.min(0.7, 0.0016 * w * w),
      g = Math.min(0.5, 0.004 * w * w),
      r = (dir * Math.PI) / 180;
    S.a = a;
    S.g = g;
    U.wxSw.value[0] = a < 0.015 ? 0 : a;
    U.wxSw.value[1] = a < 0.015 ? 0 : Math.min(0.08, 0.008 + 0.004 * w);
    // the lawn already moves in a light breeze (from ~1.6 m/s); its flicker grows with the wind
    UG.wxGr.value[0] = g < 0.01 ? 0 : g;
    UG.wxGr.value[1] = g < 0.01 ? 0 : Math.min(0.1, 0.01 + 0.006 * w);
    // the crowns lean towards where the wind goes (from dir to dir + 180°): three x east, z south
    U.wxSwD.value[0] = -Math.sin(r);
    U.wxSwD.value[1] = Math.cos(r);
  }
  function tick(dt, real) {
    if (U.wxSw.value[0] <= 0 && UG.wxGr.value[0] <= 0) return;
    U.wxSw.value[2] = (U.wxSw.value[2] + dt) % 1000;
    // moving crowns need pictures: about twenty a second (rain draws every frame anyway)
    if (real && (S.drawT += dt) > 0.05) {
      S.drawT = 0;
      markDirty();
    }
  }
  // snow or rime on the crowns (0–1); a visible step draws a picture
  function white(v) {
    v = v < 0.01 ? 0 : Math.min(1, v);
    if (Math.abs(v - U.wxLW.value) < 0.01 && !(v === 0 && U.wxLW.value > 0)) return;
    U.wxLW.value = v;
    markDirty();
  }
  return { U, UG, S, set, tick, white, count: () => S.n };
})();
