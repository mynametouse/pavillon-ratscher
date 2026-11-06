// ===================== feat/wetter: the trees in the wind (WXWIND) =====================
// The garden's trees and hedges (garden/trees.js: ez-tree kinds, crowns as instanced leaf cards) sway with the real wind: their leaf
// material gets a few lines in its vertex shader at load – before the GPU preparation compiles it, so no program later – that lean
// the crown away from the wind and let it sway back and forth (slower big motion, a faster flutter of the leaves), more the higher a
// card sits above the trunk's foot and with the square of the wind speed, gusts stronger; each tree in its own phase. Only the
// instanced crowns (the garden, the ring around it); the Dorflinde and the planner's trees stay still. The crowns' shadows keep their
// place (the shadow map is drawn rarely and from the still crowns). Calm air: nothing moves, nothing is drawn for it.
import { markDirty } from '../core/assets.js';
import { TREES } from '../garden/trees.js';
export const WXWIND = (() => {
  // x amplitude (m of lean at 12 m above the foot), y flutter (m), z time (s), w the share of the lean that stays (0–1)
  const U = { wxSw: { value: [0, 0, 0, 0.5] }, wxSwD: { value: [1, 0] } };
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
  const S = { n: 0, a: 0, drawT: 0 };
  for (const K of Object.values(TREES)) {
    const m = K && K.leaf;
    if (!m || m.userData.wxSway) continue;
    const prev = m.onBeforeCompile,
      key = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(m, sh, r);
      if (!sh.vertexShader.includes('#include <project_vertex>')) return;
      sh.uniforms.wxSw = U.wxSw;
      sh.uniforms.wxSwD = U.wxSwD;
      sh.vertexShader =
        'uniform vec4 wxSw; uniform vec2 wxSwD;\n' + sh.vertexShader.replace('#include <project_vertex>', GLSL);
    };
    // its own programs (another material with the same key would otherwise share a program without the sway)
    m.customProgramCacheKey = () => (key ? key.call(m) : '') + '|wxsway';
    m.userData.wxSway = true;
    S.n++;
  }
  // the wind to show: v the 10-m wind (m/s), gust (m/s), dir (° from where it blows), k the gusts' swing now (0–1); on: shown at all
  function set(on, v, gust, dir, k) {
    const w = on ? v + (Math.max(gust, v) - v) * k : 0,
      a = Math.min(0.7, 0.0016 * w * w),
      r = (dir * Math.PI) / 180;
    S.a = a;
    U.wxSw.value[0] = a < 0.015 ? 0 : a;
    U.wxSw.value[1] = a < 0.015 ? 0 : Math.min(0.08, 0.008 + 0.004 * w);
    // the crowns lean towards where the wind goes (from dir to dir + 180°): three x east, z south
    U.wxSwD.value[0] = -Math.sin(r);
    U.wxSwD.value[1] = Math.cos(r);
  }
  function tick(dt, real) {
    if (U.wxSw.value[0] <= 0) return;
    U.wxSw.value[2] = (U.wxSw.value[2] + dt) % 1000;
    // moving crowns need pictures: about twenty a second (rain draws every frame anyway)
    if (real && (S.drawT += dt) > 0.05) {
      S.drawT = 0;
      markDirty();
    }
  }
  return { U, S, set, tick, count: () => S.n };
})();
