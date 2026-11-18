// ===================== feat/fotorealismus: the sun's shadow in cascades – the shader side (SCHATTEN, foto/schatten.js) =====================
// Until now the sun cast shadows only inside its own box (±16 m around the walker, garden/env.js): a tree 30 m away, every house of the
// village and the whole land beyond stood without a shadow – the largest single reason why wide views looked like a model on a table
// (Falko's brief of 18.11.2026, reference views in viz3/test/fotoref.py). Now the sun's shadow map is an atlas: its own box as before on
// the left, on the right two tiles that are drawn rarely – a far one (about ±100 m) and a wide one (±640 m). No new texture (the ground's
// program is at the 16 a GPU must allow, core/detail.js GLCHECK), no new light, no new shader program: every lit material of three reads
// the sun's shadow through sunShadow() below instead of getShadow().
//
// This module only prepares the shader text and must run before core/assets.js (its patchSV copies three's lights chunk when it loads):
//   – shadowmap_pars_fragment gets sunShadow() and the tile lookup;
//   – lights_fragment_begin calls sunShadow() for the directional light (the sun is the only one that casts, garden/env.js);
//   – the uniforms csmM, csmN, csmP, csmQ are added to three's lit shaders. Their values are typed arrays: three copies a material's
//     uniforms from the library when it builds the program (UniformsUtils.clone) and keeps anything that is not one of its own math
//     types by reference – so every material shares these four arrays, and foto/schatten.js writes into them (WebGLUniforms accepts a
//     Float32Array for a mat4 or vec4 and compares it with what the program has). viz3/test/fotorealismus.py checks that this still
//     holds.
// Without a graphics card (SwiftShader, Windows' „Microsoft Basic Render Driver“ – the same test as render/render.js GLINFO, which loads
// later) the chunks stay as they were: there every line of a shader is paid for at every pixel and again when it is compiled (the first
// picture took a fifth longer with them, viz3/test/softgl.py), and such a machine could never afford the tiles. ?kaskade=an patches
// them all the same (the tests' browser has no graphics card either), ?nokaskade leaves them alone everywhere.
import * as THREE from 'three';
import { QS, R } from '../core/head.js';
export const CSMU = {
  // near shadow coordinate (x, y 0–1 across the sun's own box, z its depth) → the far tile's and the wide tile's
  M: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  N: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  // x: tiles in use (0 none, 1 far, 2 far and wide), y: the own box's share of the atlas' width (1 without tiles, 2/3 with),
  // z, w: depth bias of the far and of the wide tile (in their depth range)
  P: new Float32Array([0, 1, 0, 0]),
  // x: 4 – a tile read with four taps (bilinear; a small map), z: 9 – with nine (a soft box; maps from 2048²), both 0 with the tiles
  // off; y: 1 shows which cascade answers (red own box, green far, blue wide – tests)
  Q: new Float32Array([0, 0, 0, 0]),
};
// three's own shadow pass, before core/assets.js wraps it (its wrapper counts the sun's maps and sets the trees' levels): the tiles are
// drawn with this one
export const SM_RENDER0 = R.shadowMap.render.bind(R.shadowMap);
const GLSL = /* glsl */ `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	// feat/fotorealismus (foto/schatten_glsl.js): the sun's shadow map is an atlas – its own box on the left, a far and a wide tile on the right
	uniform mat4 csmM;
	uniform mat4 csmN;
	uniform vec4 csmP;
	uniform vec4 csmQ;
	vec3 csmDbg = vec3( 1.0 );
	// (textureLod: the map has one level, and a lookup without screen derivatives may stay inside a branch – Direct3D runs both sides
	// of a branch that holds a derivative, so every pixel would pay for both tiles)
	float csmCmp( sampler2D map, vec2 uv, float z ) { return step( z, unpackRGBAToDepth( textureLod( map, uv, 0.0 ) ) ); }
	// one tile (rect: its place in the atlas, uv) at the tile coordinate c (xy 0–1, z depth): soft over one texel
	// one tile of the atlas, filtered as a bilinear lookup (2 × 2 texels) or a soft box (3 × 3) – as loops whose rounds are uniforms
	// (csmQ.x: 4 or 0, csmQ.z: 9 or 0): with the tiles off nothing is read, also where a branch costs both its sides (software graphics
	// run every branch for every pixel; a loop of no rounds costs nothing)
	float csmTile( sampler2D map, vec2 size, vec4 rect, vec3 c, float bias ) {
		vec2 tpx = rect.zw * size;
		vec2 q = clamp( c.xy, 2.0 / tpx, 1.0 - 2.0 / tpx ) * tpx + rect.xy * size;
		vec2 ct = floor( q ), f = q - ct, t = 1.0 / size, b = ( ct + 0.5 ) * t;
		float z = c.z - bias, s = 0.0;
		vec2 o = step( 0.5, f ) * 2.0 - 1.0, w = abs( f - 0.5 );
		int n2 = int( csmQ.x ), n3 = int( csmQ.z );
		for ( int i = 0; i < n2; i ++ ) {
			vec2 d = vec2( float( i - ( i / 2 ) * 2 ), float( i / 2 ) );
			s += mix( 1.0 - w.x, w.x, d.x ) * mix( 1.0 - w.y, w.y, d.y ) * csmCmp( map, b + d * o * t, z );
		}
		vec3 wx = vec3( 1.0 - f.x, 1.0, f.x ), wy = vec3( 1.0 - f.y, 1.0, f.y );
		for ( int i = 0; i < n3; i ++ ) {
			int ix = i - ( i / 3 ) * 3, iy = i / 3;
			s += 0.25 * wx[ ix ] * wy[ iy ] * csmCmp( map, b + vec2( float( ix - 1 ), float( iy - 1 ) ) * t, z );
		}
		return s;
	}
	float sunShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		vec3 p = shadowCoord.xyz / shadowCoord.w;
		vec2 size = vec2( textureSize( shadowMap, 0 ) );
		vec2 e = min( p.xy, 1.0 - p.xy );
		// the own box: all of it inside, fading out over its last 6 % (about a metre – it ended with a hard edge), nothing behind its far plane
		float wN = smoothstep( 0.0, 0.06, min( e.x, e.y ) ) * step( p.z, 1.0 );
		float sh = 1.0;
		if ( wN < 1.0 && csmP.x > 0.5 ) {
			vec3 c = ( csmM * vec4( p, 1.0 ) ).xyz;
			vec2 g = min( c.xy, 1.0 - c.xy );
			float wF = smoothstep( 0.0, 0.08, min( g.x, g.y ) ) * step( c.z, 1.0 ) * step( 0.0, c.z );
			if ( wF < 1.0 && csmP.x > 1.5 ) {
				vec3 d = ( csmN * vec4( p, 1.0 ) ).xyz;
				vec2 h = min( d.xy, 1.0 - d.xy );
				float wW = smoothstep( 0.0, 0.1, min( h.x, h.y ) ) * step( d.z, 1.0 ) * step( 0.0, d.z );
				if ( wW > 0.0 ) { sh = mix( 1.0, csmTile( shadowMap, size, vec4( csmP.y, 0.5, 1.0 - csmP.y, 0.5 ), d, csmP.w ), wW ); csmDbg = mix( vec3( 1.0 ), vec3( 0.3, 0.3, 1.0 ), wW ); }
			}
			if ( wF > 0.0 ) { sh = mix( sh, csmTile( shadowMap, size, vec4( csmP.y, 0.0, 1.0 - csmP.y, 0.5 ), c, csmP.z ), wF ); csmDbg = mix( csmDbg, vec3( 0.3, 1.0, 0.3 ), wF ); }
			sh = mix( 1.0, sh, shadowIntensity );
		}
		if ( wN > 0.0 ) { sh = mix( sh, getShadow( shadowMap, size, shadowIntensity, shadowBias, shadowRadius, vec4( p.x * csmP.y, p.y, p.z, 1.0 ) ), wN ); csmDbg = mix( csmDbg, vec3( 1.0, 0.3, 0.3 ), wN ); }
		if ( csmQ.y < 0.5 ) csmDbg = vec3( 1.0 );
		return sh;
	}
#endif
`;
// the call for the directional light (one line in three's chunk; core/assets.js matches it for the figures' shadows)
const CALL = 'getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize,',
  TAIL = 'vDirectionalShadowCoord[ i ] ) : 1.0;',
  OK =
    THREE.ShaderChunk.lights_fragment_begin.includes(CALL) &&
    THREE.ShaderChunk.lights_fragment_begin.includes(TAIL) &&
    THREE.ShaderChunk.shadowmap_pars_fragment.includes('float getShadow( sampler2D shadowMap, vec2 shadowMapSize,');
const SOFT = (() => {
  try {
    const gl = R.getContext(),
      d = gl.getExtension('WEBGL_debug_renderer_info');
    return /swiftshader|basic render|llvmpipe|softpipe|software/i.test(
      String((d && gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '')
    );
  } catch (e) {
    return false;
  }
})();
const WANT = QS.get('kaskade') === 'an' || (!SOFT && !QS.has('nokaskade'));
// false: three's shader text is not what this was written for (r169), or no graphics card – then nothing changes and the sun keeps its
// one box
CSMU.ok = OK && WANT;
CSMU.soft = SOFT;
if (OK && WANT) {
  THREE.ShaderChunk.shadowmap_pars_fragment += GLSL;
  THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin
    .replace(CALL, 'sunShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize,')
    .replace(TAIL, TAIL + ' directLight.color *= csmDbg;');
  for (const k of ['lambert', 'phong', 'standard', 'physical', 'toon']) {
    const L = THREE.ShaderLib[k];
    if (!L || !L.uniforms) continue;
    L.uniforms.csmM = { value: CSMU.M };
    L.uniforms.csmN = { value: CSMU.N };
    L.uniforms.csmP = { value: CSMU.P };
    L.uniforms.csmQ = { value: CSMU.Q };
  }
} else if (!OK) console.warn('Schatten in der Ferne: three-Shader geändert, aus');
