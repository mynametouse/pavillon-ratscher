// ---------------- garden trees: procedural ez-tree models (bark + leaf textures), instanced ----------------
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Tree } from '../eztree/tree.js';
import { getSummerLeafTexture } from '../eztree/textures.js'; // feat/fotorealismus (foto-baeume)
import { BASE, QS, R, rnd, rr, scene, V } from '../core/head.js';
import {
  cellsOf,
  GI,
  instanceVariants,
  LM,
  markDirty,
  MODELS,
  patchSV,
  SV,
  VEG,
  vegReady,
  whenLoaded,
} from '../core/assets.js';
import { bldRects, BUILD, COL } from '../core/geo.js';
import { STREAM } from './stream_geo.js';
import { GEO_REAL, inLake, PATHS, S0 } from './env.js';
import { inLocal } from './site_base.js';
globalThis.EZ_TREE_BASE = BASE + 'tree/';
globalThis.EZ_TREE_MANAGER = LM;
const TREE_KINDS = [
  { key: 'oakA', preset: 'Oak Medium', seed: 1201, tint: 0xbfd09a },
  { key: 'oakB', preset: 'Oak Medium', seed: 77, tint: 0xc8d3a0 },
  { key: 'ash', preset: 'Ash Medium', seed: 4242, tint: 0xc7d6a2 },
  // (sommer: the leaf picture of this kind in its summer green – eztree/textures.js; without it the aspen's is October's gold)
  { key: 'aspen', preset: 'Aspen Medium', seed: 911, tint: 0xd2d9a6, sommer: true },
  {
    key: 'apple',
    preset: 'Oak Small',
    seed: 3131,
    tint: 0xb9cc8f,
    mod: o => {
      o.branch.angle['1'] = 62;
      o.leaves.size = 1.9;
      o.bark.type = 'willow';
    },
  },
  { key: 'pine', preset: 'Pine Medium', seed: 555, tint: 0xffffff },
  // the one tall, wide alder behind the washhouse (photos 7210, 7224, 7236 of 26.10.2026): a dense oval crown on a straight stem – built
  // like the Dorflinde (world/village_props.js) from the large oak, more upright
  {
    key: 'alder',
    preset: 'Oak Large',
    seed: 2026,
    tint: 0x98b682,
    mod: o => {
      Object.assign(o.branch.angle, { 1: 50, 2: 40, 3: 32 });
      Object.assign(o.branch.children, { 0: 12, 1: 6, 2: 4 });
      o.branch.start['1'] = 0.24;
      o.branch.gnarliness['1'] = 0.05;
      o.leaves.count = 16;
      o.leaves.size = 4.8;
      o.leaves.sizeVariance = 0.5;
      o.leaves.start = 0.0;
    },
  },
  // the hedge belts round the garden (photos 26.10.2026): hazel, field maple, elder – two bush shapes
  { key: 'bushA', preset: 'Bush 1', seed: 501, tint: 0xc9d39a },
  { key: 'bushB', preset: 'Bush 2', seed: 77, tint: 0xd3d49a, sommer: true },
];
const leafDepthMats = {};
// feat/wetter: each leaf material built here is handed to TREEHOOK.leaf right after it is made, before anything draws it (the weather's
// sway and snow – wetter/wx_wind.js; the garden planner's own kinds then share the garden's programs)
export const TREEHOOK = { leaf: null };
// ---------------- feat/fotorealismus (foto-baeume): the leaves' light and colour (LAUB) ----------------
// What a walker saw until 18.11.2026 (the lime at the Anger: pale grey-green in the afternoon, cream-white in the evening sun, light and
// dark cards side by side like cut-outs; every fourth far tree orange in June):
//   – a leaf card is lit as a piece of its crown (its normal points out of the crown), and three's standard light gives such a surface
//     a mirror lobe: seen at a grazing angle it reflects the sky (indirectSpecular) and the sun (directSpecular) many times stronger
//     than its own green – a pale veil by day, cream in a low warm sun. Leaves only shimmer: of both lobes a sheen stays (lfK.x);
//   – the material is double-sided, and three turns the normal round on the back of a card: half the cards of a crown were lit as if
//     they hung on its other side – light and dark at random, no round crown. Both faces keep the crown's normal now, with a share
//     of the card's own face in it (lfT.y) so that twigs still differ;
//   – light through the leaf (lfK.y): a card seen from its unlit face glows yellow-green where the sun reaches it – the sunny side
//     from below, the rim of the crown against the light; and the sun gets a little round the crown, which is no solid ball (lfT.x);
//   – darker inside (lfK.z): every corner of every card knows how deep in the crown it sits (aLfIn, crownDepth below) – less of the
//     sky and of the sun gets there. Baked into the far trees' pictures as well (they are drawn with this material);
//   – no two trees alike (lfK.w): a hue and a brightness from the tree's place (its instance matrix – nothing to store, and whoever
//     draws these crowns gets it: garden, world, town, garden planner);
//   – the month: the aspen's leaf picture shows the gold of October; kinds built with `sommer: true` get the same leaves in summer
//     green (eztree/textures.js getSummerLeafTexture).
// No program more: all leaf materials get the same patch and the same cache key. No texture, no draw call, no triangle; one byte per
// card corner (aLfIn).
export const LAUB = (() => {
  const ON = [0.16, 1, 1, 1, 0.3, 0.3, 0.9, 0.03, 0.12, 1];
  const U = {
    lfK: { value: new THREE.Vector4(ON[0], ON[1], ON[2], ON[3]) },
    // z: 1 while a far tree's picture is drawn (world/ratscher.js treeAtlas: the picture without a tree's own colour), w: the sky's
    // light on the leaves as a share of the image light – whatever a material's envMapIntensity says: that was turned down to 0.35–0.6
    // against the mirror, and took the sky's light on the leaves' own green with it (a crown against the light stood black)
    lfT: { value: new THREE.Vector4(ON[4], ON[5], 0, ON[6]) },
    // x: the white in a leaf's colour – what its surface reflects of any light, whatever its green (as a share of the light; the leaf
    // pictures hold the pigment only: hardly any blue, a third of the red a leaf in a photo has – emerald under a blue sky), y: light
    // bounced between the leaves of a sunlit crown (a share of the sun, in the leaves' colour), z: the leaves' light altogether
    lfC: { value: new THREE.Vector4(ON[7], ON[8], ON[9], 0) },
  };
  // a tree's own colour from two random numbers of its place (h.x: hue, yellow-green … blue-green; h.y: brightness), k its strength
  const GLSL_VARY = `vec3 lfVary( vec2 h, float k ) { float a = ( h.x * 2.0 - 1.0 ) * k, b = ( h.y * 2.0 - 1.0 ) * k;
  return vec3( 1.0 + 0.22 * a, 1.0 + 0.04 * a, 1.0 - 0.2 * a ) * ( 1.0 + 0.18 * b ); }\n`;
  const GLSL_HASH = `vec2 lfHash( vec2 p ) { p = floor( p * 4.0 ); return fract( sin( vec2( dot( p, vec2( 12.9898, 78.233 ) ), dot( p, vec2( 39.3468, 11.1351 ) ) ) ) * 43758.5453 ); }\n`;
  const S = { n: 0, ms: 0, crowns: 0 };
  // a leaf material (MeshStandardMaterial with a leaf picture, after patchSV, before the wind's hook). o.thru: how much light its
  // leaves let through (1 a broad leaf, less for needles); o.crown === false: the cards' normals are their own (a model that was not
  // built here) – no crown's normal, no depth
  function patch(m, o = {}) {
    if (!m || m.userData.laub) return m;
    m.userData.laub = true;
    const crown = o.crown !== false,
      u = { value: new THREE.Vector4(o.thru ?? 1, 0, 0, 0) },
      prev = m.onBeforeCompile,
      key = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(m, sh, r);
      const F = sh.fragmentShader;
      if (!F.includes('#include <lights_fragment_end>') || !F.includes('#include <normal_fragment_begin>')) return;
      sh.uniforms.lfK = U.lfK;
      sh.uniforms.lfT = U.lfT;
      sh.uniforms.lfC = U.lfC;
      sh.uniforms.lfM = u;
      sh.vertexShader =
        (crown ? 'attribute float aLfIn;\n' : '') +
        'varying vec3 vLf;\n' +
        GLSL_HASH +
        sh.vertexShader.replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
  { vec2 lfH = vec2( 0.5 );
#ifdef USE_INSTANCING
    lfH = lfHash( instanceMatrix[ 3 ].xz );
#endif
    vLf = vec3( ${crown ? 'aLfIn' : '0.0'}, lfH ); }`
        );
      sh.fragmentShader =
        'uniform vec4 lfK, lfT, lfC, lfM; varying vec3 vLf; vec3 lfNc, lfNf;\n' +
        GLSL_VARY +
        F.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  diffuseColor.rgb = diffuseColor.rgb * lfVary( vLf.yz, lfK.w * ( 1.0 - lfT.z ) ) + lfC.x;`
        )
          .replace(
            '#include <normal_fragment_begin>',
            `#include <normal_fragment_begin>
  lfNf = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) );   // the card's own face, towards the eye
  ${
    crown
      ? `lfNc = normalize( vNormal );   // the crown's normal, the same on both faces of a card
  normal = normalize( lfNc + lfNf * ( lfT.y * sign( dot( lfNf, lfNc ) ) ) ); nonPerturbedNormal = normal;`
      : 'lfNc = normal;'
  }`
          )
          .replace(
            '#include <lights_fragment_end>',
            `#include <lights_fragment_end>
  { float lfIn = vLf.x * lfK.z;
    reflectedLight.indirectSpecular *= lfK.x * ( 1.0 - 0.7 * lfIn );
    reflectedLight.directSpecular *= lfK.x * ( 1.0 - 0.7 * lfIn );
    reflectedLight.indirectDiffuse *= 1.0 - 0.45 * lfIn;
    reflectedLight.directDiffuse *= 1.0 - 0.5 * lfIn;
#ifdef USE_ENVMAP
    if ( lfT.w > 0.0 ) reflectedLight.indirectDiffuse *= lfT.w / max( envMapIntensity, 0.2 );
#endif
#if NUM_DIR_LIGHTS > 0
    // the sun is the only directional light; directLight still holds it, shadows and all (three's light loop ends with it)
    vec3 lfL = directionalLights[ 0 ].direction, lfA = RECIPROCAL_PI * material.diffuseColor;
    float lfSun = dot( lfNc, lfL ),
      lfWrap = max( 0.0, ( lfSun + lfT.x ) / ( 1.0 + lfT.x ) ) - max( lfSun, 0.0 ),
      // (how much sun gets to a card on the crown's far side: through the crown, the longer the way the less – only its rim glows)
      lfThru = max( 0.0, - dot( lfL, lfNf ) ) * ${crown ? 'exp( 3.5 * min( lfSun - 0.1, 0.0 ) )' : '1.0'};
    reflectedLight.directDiffuse += directLight.color * lfA * ( 1.0 - 0.75 * lfIn ) *
      ( lfWrap * 0.7 + lfThru * lfK.y * lfM.x * vec3( 1.0, 1.15, 0.5 ) );
    // light bounced between the leaves: a crown in the sun is light on its shaded side and inside too (a third of it also where
    // the crown's own leaves shade a card – the shadow map cannot tell them from a house)
    reflectedLight.directDiffuse += ( 0.35 * directionalLights[ 0 ].color + 0.65 * directLight.color ) * lfA *
      ( lfC.y * material.diffuseColor / max( material.diffuseColor.g, 0.02 ) );
#endif
    reflectedLight.directDiffuse *= lfC.z; reflectedLight.indirectDiffuse *= lfC.z;
  }`
          );
    };
    m.customProgramCacheKey = () => (key ? key.call(m) : '') + (crown ? '|laub' : '|laubk');
    S.n++;
    return m;
  }
  // how deep in its crown each corner of each leaf card sits (0 at the hull … 1 in the core): the corners counted in a coarse grid
  // (softened), then from every corner the way out through it – along the crown's normal and straight up, where the sky is – with
  // the leaves on the way summed up. One byte per corner; thinCards() and clones carry it along. ~10 ms for a crown of 5000 cards.
  function crownDepth(lg, G = 14, K = 0.35) {
    const t0 = performance.now(),
      P = lg.attributes.position.array,
      N = lg.attributes.normal.array,
      n = P.length / 3,
      b = lg.boundingBox,
      x0 = b.min.x,
      y0 = b.min.y,
      z0 = b.min.z,
      ix = G / (b.max.x - x0 || 1),
      iy = G / (b.max.y - y0 || 1),
      iz = G / (b.max.z - z0 || 1),
      D = new Float32Array(G * G * G),
      T = new Float32Array(G * G * G),
      G1 = G - 1;
    for (let v = 0; v < n; v++)
      D[
        Math.min(G1, Math.floor((P[v * 3] - x0) * ix)) +
          G *
            (Math.min(G1, Math.floor((P[v * 3 + 1] - y0) * iy)) +
              G * Math.min(G1, Math.floor((P[v * 3 + 2] - z0) * iz)))
      ]++;
    for (let ax = 0; ax < 3; ax++) {
      const st = ax === 0 ? 1 : ax === 1 ? G : G * G;
      for (let i = 0; i < D.length; i++) {
        const q = Math.floor(i / st) % G;
        T[i] = 0.5 * D[i] + 0.25 * (q > 0 ? D[i - st] : 0) + 0.25 * (q < G1 ? D[i + st] : 0);
      }
      D.set(T);
    }
    // the unit: how dense the leaves stand where a leaf stands (the count's mean weighted by itself)
    let s = 0,
      w = 0;
    for (let i = 0; i < D.length; i++) {
      s += D[i] * D[i];
      w += D[i];
    }
    const k = (-K * 0.5 * w) / (s || 1),
      out = new Uint8Array(n);
    for (let v = 0; v < n; v++) {
      const x = (P[v * 3] - x0) * ix,
        y = (P[v * 3 + 1] - y0) * iy,
        z = (P[v * 3 + 2] - z0) * iz;
      let sum = 0;
      for (let d = 0; d < 2; d++) {
        const dx = d ? 0 : N[v * 3],
          dy = d ? 1 : N[v * 3 + 1],
          dz = d ? 0 : N[v * 3 + 2];
        for (let t = 1; t <= 2 * G; t++) {
          const i = Math.floor(x + dx * t),
            j = Math.floor(y + dy * t),
            l = Math.floor(z + dz * t);
          if (i < 0 || j < 0 || l < 0 || i > G1 || j > G1 || l > G1) break;
          sum += D[i + G * (j + G * l)];
        }
      }
      out[v] = Math.round(255 * (1 - Math.exp(k * sum)));
    }
    lg.setAttribute('aLfIn', new THREE.BufferAttribute(out, 1, true));
    S.ms += performance.now() - t0;
    S.crowns++;
    return out;
  }
  return {
    U,
    S,
    patch,
    crownDepth,
    GLSL_VARY,
    GLSL_HASH,
    // tests and tuning: LAUB.set({ sheen, thru, inside, vary, wrap, card, sky, white, bounce, gain }); LAUB.set({ on: false }) lights the leaves
    // as three does without this (the mirror lobes whole, no light through, no depth, no colour of its own; the crown's normal stays)
    set(o = {}) {
      const k = U.lfK.value,
        t = U.lfT.value;
      if (o.on === false) {
        k.set(1, 0, 0, 0);
        t.x = 0;
        t.w = 0;
        U.lfC.value.set(0, 0, 1, 0);
      }
      if (o.on === true) {
        k.set(ON[0], ON[1], ON[2], ON[3]);
        t.x = ON[4];
        t.y = ON[5];
        t.w = ON[6];
        U.lfC.value.set(ON[7], ON[8], ON[9], 0);
      }
      if (o.sheen != null) k.x = o.sheen;
      if (o.thru != null) k.y = o.thru;
      if (o.inside != null) k.z = o.inside;
      if (o.vary != null) k.w = o.vary;
      if (o.wrap != null) t.x = o.wrap;
      if (o.card != null) t.y = o.card;
      if (o.sky != null) t.w = o.sky;
      if (o.white != null) U.lfC.value.x = o.white;
      if (o.bounce != null) U.lfC.value.y = o.bounce;
      if (o.gain != null) U.lfC.value.z = o.gain;
      markDirty();
      return LAUB.state();
    },
    state: () => ({
      n: S.n,
      crowns: S.crowns,
      ms: Math.round(S.ms),
      k: U.lfK.value.toArray().map(v => +v.toFixed(3)),
      t: U.lfT.value.toArray().map(v => +v.toFixed(3)),
      c: U.lfC.value.toArray().map(v => +v.toFixed(3)),
    }),
  };
})();
window.LAUB = LAUB;
export function buildTreeKind(k) {
  const t = new Tree();
  t.loadPreset(k.preset);
  t.options.seed = k.seed;
  if (k.mod) k.mod(t.options);
  t.options.leaves.tint = k.tint;
  t.generate();
  const bg = t.branchesMesh.geometry,
    lg = t.leavesMesh.geometry;
  bg.computeBoundingBox();
  lg.computeBoundingBox();
  const bb = bg.boundingBox.clone().union(lg.boundingBox);
  const H = bb.max.y - Math.max(0, bb.min.y),
    Rr = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
  // crown-shaped leaf normals (soft, volumetric shading instead of flat cards)
  {
    const p = lg.attributes.position,
      c = lg.boundingBox.getCenter(new THREE.Vector3());
    const n = new Float32Array(p.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i) - c.x, (p.getY(i) - c.y) * 0.7 + (bb.max.y - bb.min.y) * 0.25, p.getZ(i) - c.z).normalize();
      n[i * 3] = v.x;
      n[i * 3 + 1] = v.y;
      n[i * 3 + 2] = v.z;
    }
    lg.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  }
  LAUB.crownDepth(lg); // feat/fotorealismus (foto-baeume): how deep in the crown each card corner sits
  const om = t.branchesMesh.material,
    ol = t.leavesMesh.material;
  const bark = patchSV(
    new THREE.MeshStandardMaterial({
      color: om.color,
      map: om.map || null,
      normalMap: om.normalMap || null,
      roughnessMap: om.roughnessMap || null,
      aoMap: om.aoMap || null,
      roughness: 1,
      envMapIntensity: 0.7,
    })
  );
  const leaf = patchSV(
    new THREE.MeshStandardMaterial({
      color: ol.color,
      map: k.sommer ? getSummerLeafTexture(t.options.leaves.type) : ol.map, // feat/fotorealismus (foto-baeume)
      alphaTest: Math.max(0.35, ol.alphaTest || 0.5),
      side: THREE.DoubleSide,
      roughness: 0.8,
      envMapIntensity: 0.6,
    })
  );
  leaf.userData.leaf = true;
  // feat/fotorealismus (foto-baeume): the leaves' light (needles let little through)
  LAUB.patch(leaf, { thru: /pine/i.test(t.options.leaves.type) ? 0.35 : 1 });
  if (TREEHOOK.leaf) TREEHOOK.leaf(leaf); // feat/wetter
  if (!leafDepthMats[k.preset])
    leafDepthMats[k.preset] = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: leaf.map,
      alphaTest: leaf.alphaTest,
    });
  // V17g: the bark's levels of detail (barkLOD): without the twigs from 30 m, only the stem and the main boughs from 110 m
  const L = t.options.branch.levels,
    meta = t.branchMeta || [],
    bgMid = meta.length ? barkLOD(bg, meta, L >= 2 ? L - 1 : L, 0.5, 0.5) : bg,
    bgFar = meta.length ? barkLOD(bg, meta, Math.min(1, Math.max(0, L - 1)), 0.34, 0.4) : bg;
  return { bg, bgMid, bgFar, lg, bark, leaf, depth: leafDepthMats[k.preset], H, R: Rr, items: [] };
}
// V17g: a coarser bark from the rings of the full model, so nothing moves when the level changes: branches up to maxLevel, of each about
// kSec of its rings and kSeg of its sides (at least 3). The bark was the largest cost of a frame (the alder alone 10 000 triangles, drawn
// even 250 m away) and of every shadow map.
export function barkLOD(bg, meta, maxLevel, kSec, kSeg) {
  const P = bg.attributes.position.array,
    N = bg.attributes.normal.array,
    pos = [],
    nor = [],
    uv = [],
    idx = [];
  for (const [off, sec, seg, lv] of meta) {
    if (lv > maxLevel) continue;
    const ns = Math.max(1, Math.round(sec * kSec)),
      ng = Math.max(3, Math.round(seg * kSeg)),
      base = pos.length / 3;
    for (let m = 0; m <= ns; m++) {
      const i = Math.round((m * sec) / ns);
      for (let k = 0; k <= ng; k++) {
        const v = off + i * (seg + 1) + Math.round((k * seg) / ng);
        pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
        nor.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
        uv.push(k / ng, m % 2);
      }
    }
    for (let m = 0; m < ns; m++)
      for (let k = 0; k < ng; k++) {
        const a = base + m * (ng + 1) + k,
          c = a + ng + 1;
        idx.push(a, c, a + 1, a + 1, c, c + 1);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
// the leaf cards' levels: all near, a third (enlarged) from 30 m, a sixth (more enlarged) from 110 m – the same cards, a subset each
export function treeLeafLevels(K) {
  if (!K.lgFar) K.lgFar = thinCards(K.lg, 0.35, 1.55);
  if (!K.lgFar2) K.lgFar2 = thinCards(K.lg, 0.17, 2.1);
  return [K.lg, K.lgFar, K.lgFar2];
}
export const TREES = {};
const treeTrunks = [];
export const TREEG = new THREE.Group();
TREEG.userData.noMerge = true;
scene.add(TREEG);
window.TREEG = TREEG; // trees within 55 m: hidden in the plan view on request
const GLBT = { fir: [], smalltree: [] };
// phEnd: the tree is there until that construction phase only (a tree of today where the plan builds) – own group, collider until then
function addTreeInst(kind, x, y, h, r, phEnd) {
  if (phEnd != null && TREES[kind]) {
    TREES[kind].items.push([x, y, h, r, phEnd]);
    treeTrunks.push([x, y, Math.min(0.28, 0.06 + h * 0.012), phEnd]);
    return;
  }
  if (kind === 'pine' && MODELS.fir) {
    GLBT.fir.push({ x, y, s: (h / 14.08) * rr(0.95, 1.05) });
    treeTrunks.push([x, y, 0.2]);
    return;
  }
  if (kind === 'apple' && MODELS.smalltree) {
    const s = Math.min(h / 3.4, 1.9) * rr(0.9, 1.05);
    GLBT.smalltree.push({ x, y, s: [s * rr(0.9, 1.1), s, s * rr(0.9, 1.1)] });
    treeTrunks.push([x, y, 0.16]);
    return;
  }
  const K = TREES[kind];
  if (!K) return;
  K.items.push([x, y, h, r]);
  treeTrunks.push([x, y, Math.min(0.28, 0.06 + h * 0.012)]);
}
// distant trees: a third of the leaf cards, each card enlarged (same crown density from afar, a third of the triangles)
export function thinCards(geo, keep, grow) {
  const g2 = geo.clone(),
    idx = geo.index.array,
    P = g2.attributes.position,
    out = [];
  const c = new THREE.Vector3(),
    v = new THREE.Vector3();
  for (let q = 0; q < idx.length / 6; q++) {
    const h = Math.sin(q * 12.9898) * 43758.5453;
    if (h - Math.floor(h) > keep) continue;
    const i0 = idx[q * 6];
    c.set(0, 0, 0);
    for (let k = 0; k < 4; k++) c.add(v.fromBufferAttribute(P, i0 + k));
    c.multiplyScalar(0.25);
    for (let k = 0; k < 4; k++) {
      v.fromBufferAttribute(P, i0 + k)
        .sub(c)
        .multiplyScalar(grow)
        .add(c);
      P.setXYZ(i0 + k, v.x, v.y, v.z);
    }
    for (let k = 0; k < 6; k++) out.push(idx[q * 6 + k]);
  }
  g2.setIndex(out);
  return g2;
}
const sector8 = it => Math.floor((Math.atan2(it.x - 2, it.y - 2) + Math.PI) / (Math.PI / 4));
// the trees of today that stand where the plan builds (the hall, the log store): one group per last phase, hidden by the phase switch
// (game/walkable.js applyVisibility reads userData.ph / phEnd); the near/far switch of the crowns inside stays as it is
const PHG = new Map();
function phaseGroup(phEnd) {
  let g = PHG.get(phEnd);
  if (!g) {
    g = new THREE.Group();
    g.userData.ph = 0;
    g.userData.phEnd = phEnd;
    g.userData.noMerge = true;
    g.visible = (window.PHASE ?? 0) < phEnd;
    TREEG.add(g);
    PHG.set(phEnd, g);
  }
  return g;
}
function flushTreeInst() {
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  for (const K of Object.values(TREES)) {
    if (!K.items.length) continue;
    const near = [],
      far = [];
    for (const a of K.items) (Math.hypot(a[0] - 2, a[1] - 2) < 55 ? near : far).push({ x: a[0], y: a[1], a });
    const LG = treeLeafLevels(K);
    // one InstancedMesh per 24 m cell in the garden (trees behind the camera are not drawn); the thinned ring outside is one mesh per kind
    const cellKey = it => (it.a[4] ?? '') + ':' + Math.floor(it.x / 24) + ':' + Math.floor(it.y / 24);
    for (const [grp, isFar] of [
      ...cellsOf(near, 24, cellKey).map(g => [g, false]),
      ...(far.length ? [[far, true]] : []),
    ]) {
      const parent = grp[0].a[4] != null ? phaseGroup(grp[0].a[4]) : isFar ? scene : TREEG;
      const ib = new THREE.InstancedMesh(isFar ? K.bgMid : K.bg, K.bark, grp.length),
        il = new THREE.InstancedMesh(isFar ? K.lgFar : K.lg, K.leaf, grp.length);
      grp.forEach(({ a: [x, y, h, r] }, i) => {
        const sy = h / K.H,
          sx = THREE.MathUtils.clamp(r / K.R, sy * 0.75, sy * 1.3);
        q.setFromAxisAngle(up, rnd() * 6.283);
        m4.compose(V(x, y, 0), q, new THREE.Vector3(sx, sy, sx));
        ib.setMatrixAt(i, m4);
        il.setColorAt(i, new THREE.Color(1, 1, 1).multiplyScalar(rr(0.82, 1.06)));
      });
      il.instanceMatrix = ib.instanceMatrix; // bark and crown of every level: one set of instance matrices
      const ms = [ib, il];
      // V17g near cells: three levels each for bark and crown (full within 30 m of the camera, mid to 110 m, far beyond); the shadow map is
      // drawn with the mid level
      const lv = isFar
        ? []
        : [1, 2].map(j => [
            new THREE.InstancedMesh(j === 1 ? K.bgMid : K.bgFar, K.bark, grp.length),
            new THREE.InstancedMesh(LG[j], K.leaf, grp.length),
          ]);
      for (const [b, l] of lv) {
        b.instanceMatrix = l.instanceMatrix = ib.instanceMatrix;
        l.instanceColor = il.instanceColor;
        ms.push(b, l);
      }
      for (const im of ms) {
        im.castShadow = !isFar;
        im.receiveShadow = true;
        im.userData.noMerge = true;
        if (im.material === K.leaf) im.customDepthMaterial = K.depth;
        vegReady(im);
        parent.add(im);
      }
      if (!isFar) {
        VEG.add({ ms: [ib, lv[0][0], lv[1][0]], d: [30, 110], sh: 1 });
        VEG.add({ ms: [il, lv[0][1], lv[1][1]], d: [30, 110], sh: 1 });
      }
    }
  }
  for (const [x, y, rad, ph] of treeTrunks)
    COL.push([x - rad, x + rad, y - rad, y + rad, 0, 4, 'tree', ph != null ? 0 : undefined, ph]);
  // V17g: the glTF fir and apple trees thin their twigs and leaves beyond 30 / 40 m, the apples draw no boughs beyond 45 m (inside the crown)
  if (GLBT.fir.length)
    instanceVariants('fir', GLBT.fir, {
      env: 0.6,
      tint: 0xe8f0dc,
      cell: 24,
      parent: TREEG,
      lod: { match: /twig/i, keep: 0.38, grow: 1.5, d: 30 },
    });
  if (GLBT.smalltree.length)
    instanceVariants('smalltree', GLBT.smalltree, {
      env: 0.6,
      cell: 24,
      thin: { match: /leaves/i, keep: 0.42, grow: 1.45 },
      lod: { match: /leaves/i, keep: 0.45, grow: 1.4, d: 40 },
      partD: [/branches/i, 45],
      parent: TREEG,
    });
}
const camPathPts = [];
for (const PA of PATHS) {
  for (const q of PA) camPathPts.push(q);
  for (let i = 0; i < PA.length - 1; i++)
    for (let f = 0; f < 1; f += 0.2)
      camPathPts.push([PA[i][0] + (PA[i + 1][0] - PA[i][0]) * f, PA[i][1] + (PA[i + 1][1] - PA[i][1]) * f]);
}
function nearPath(x, y, d) {
  for (const p of camPathPts) {
    if (Math.hypot(p[0] - x, p[1] - y) < d) return true;
  }
  for (const f of window.SITE_FOOT || []) if (inLocal(f.b, x, y, f.hx + 0.35, f.hy + 0.35, f.ox, f.oy)) return true;
  return false;
}
// nothing grows through a building (Falko, 29.10.2026): true when (x, y) is within m metres of a building's footprint – every registered
// building (BUILD rects: garden houses, workshop hall and lean-to, garage …), Hubert's sheds (site.json neigh) and the old garage
function inRectM(r, x, y, m) {
  const a = (r.az * Math.PI) / 180,
    dx = x - r.c[0],
    dy = y - r.c[1],
    u = dx * Math.sin(a) + dy * Math.cos(a),
    v = dx * Math.sin(a - Math.PI / 2) + dy * Math.cos(a - Math.PI / 2);
  return Math.abs(u) < r.hx + m && Math.abs(v) < r.hy + m;
}
function inPolyM(P, x, y, m) {
  let c = false,
    d = 1e9;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i],
      [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    const ex = xj - xi,
      ey = yj - yi,
      t = Math.max(0, Math.min(1, ((x - xi) * ex + (y - yi) * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(x - xi - t * ex, y - yi - t * ey));
  }
  return c || d < m;
}
function inBuilding(x, y, m) {
  for (const k in BUILD) for (const r of bldRects(BUILD[k])) if (inRectM(r, x, y, m)) return true;
  if ((S0.neigh || []).some(P => inPolyM(P, x, y, m))) return true;
  if (S0.garage && inPolyM(S0.garage, x, y, m)) return true;
  return false;
}
// inside the garden polygon (site.json) by at least m metres (m < 0: up to -m outside)
function inGarden(x, y, m = 0) {
  const P = S0.garden;
  let c = false,
    d = 1e9;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i],
      [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    const ex = xj - xi,
      ey = yj - yi,
      t = Math.max(0, Math.min(1, ((x - xi) * ex + (y - yi) * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(x - xi - t * ex, y - yi - t * ey));
  }
  return c ? d >= m : -d >= m;
}
// hedge belts along the garden's edges as on Falko's photos of 26.10.2026: dense on the north side by the field path (with the two gates
// open), along the south end and the south-west corner behind the workshop; sparse bushes on the east fence; none on the west side, which
// opens onto Hubert's yard. A bush every ~1.7 m, 1 m inside the edge; never on a path or in a building (nearPath).
const GATES = [
  [4.0, 30.6, 2.6], // the double gate from the field path (x, y, half gap)
  [17.8, 20.4, 1.6], // the small gate by the stream
  [-8.86, 39.08, 2.5], // site.json entrance
  [-4.6, 34.0, 2.3], // not a gate: the board stack under the white tarpaulin beside the field path (garden/garten_heute.js)
];
// the brook's banks are overgrown (photos of 26.10.2026): low bushes and tall weeds just outside both top edges of the ditch, with gaps;
// none at the bridge
function bankBushes() {
  const T = STREAM.TERR;
  for (let t = 1; t < STREAM.L0 - 1; t += 1.5) {
    if (Math.abs(t - STREAM.TB) < 3.5) continue;
    for (const side of [-1, 1]) {
      if (rnd() < 0.3) continue;
      if (side > 0 && Math.abs(t - T.t) < T.ht + 1.6) continue; // the slab terrace, its bench and the steps (garden/garten_heute.js)
      const [x, y] = STREAM.wpt(t + rr(-0.5, 0.5), STREAM.cOff(t) + side * (STREAM.WT + rr(0.35, 1.0)));
      const r = rr(0.8, 1.3);
      if (nearPath(x, y, 1.2) || inBuilding(x, y, r)) continue;
      addTreeInst(rnd() < 0.5 ? 'bushA' : 'bushB', x, y, rr(1.4, 2.3), r);
    }
  }
}
function hedges() {
  bankBushes();
  const P = S0.garden,
    dense = (x, y) => y > 18 || y < -36 || (x < -4 && y < -18),
    sparse = (x, y) => x > 10 && y > -36 && y <= 18;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i],
      [x1, y1] = P[i + 1],
      L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 0.5) continue;
    // inward normal: the side the polygon lies on
    let nx = -(y1 - y0) / L,
      ny = (x1 - x0) / L;
    const mx = (x0 + x1) / 2,
      my = (y0 + y1) / 2;
    if (!inGarden(mx + nx * 1.2, my + ny * 1.2)) {
      nx = -nx;
      ny = -ny;
    }
    for (let t = 0.85; t < L; t += 1.7) {
      const x = x0 + ((x1 - x0) * t) / L + nx * rr(0.7, 1.3),
        y = y0 + ((y1 - y0) * t) / L + ny * rr(0.7, 1.3);
      const d = dense(x, y),
        sp = !d && sparse(x, y);
      if (!d && !(sp && rnd() < 0.35)) continue;
      if (
        GATES.some(([gx, gy, r]) => Math.hypot(x - gx, y - gy) < r) ||
        nearPath(x, y, 1.4) ||
        STREAM.inDitch(x, y, 0.4)
      )
        continue;
      const r = rr(1.3, 2.0);
      if (inBuilding(x, y, r * 0.9)) continue; // the crown keeps clear of walls and roofs
      addTreeInst(rnd() < 0.5 ? 'bushA' : 'bushB', x, y, rr(2.6, 4.2), r);
    }
  }
}
// distant ring: cheap crown blobs
const farBlobs = [];
function buildTrees() {
  for (const k of TREE_KINDS) {
    try {
      TREES[k.key] = buildTreeKind(k);
    } catch (e) {
      console.warn('tree', k.key, e);
    }
  }
  // the garden's trees as Falko's photos of 26.10.2026 show them carry their kind (site.js: [x, y, crown radius, height, kind]); the
  // others (the measured crowns round the garden) get one from their size
  const KIND_OF = { alder: 'alder', cherry: 'oakA', apple: 'apple', tree: 'ash', willow: 'bushB' };
  S0.trees.forEach((t, i) => {
    const [x, y, r, h] = t;
    if (nearPath(x, y, 1.2)) return;
    // a trunk in a footprint: the tree would grow through the roof – not tested for a tree of today that stands where the plan builds
    // (t[5]: its last phase; it goes with that phase, and the buildings it stands beside today are not in the way)
    if (t[5] == null && inBuilding(x, y, 0.8)) return;
    if (KIND_OF[t[4]]) return addTreeInst(KIND_OF[t[4]], x, y, h, r, t[5]);
    let kind = 'ash';
    if (r >= 4.5) kind = 'oakA';
    else if (h <= 8.0) kind = 'apple';
    else if (r < 2.4 && h > 10.5) kind = i % 2 ? 'pine' : 'aspen';
    else if (r >= 3.0) kind = i % 2 ? 'oakB' : 'oakA';
    else kind = i % 3 === 0 ? 'aspen' : 'ash';
    addTreeInst(kind, x, y, h, r);
  });
  hedges();
  const keep0 = Object.fromEntries(Object.entries(TREES).map(([k, K]) => [k, K.items.length])),
    trunks0 = treeTrunks.length;
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2,
      r = rr(70, 900);
    const x = Math.sin(a) * r,
      y = Math.cos(a) * r;
    if (inLake(x, y) < 1.3) continue;
    if (Math.hypot(x - 5, y + 60) < 60 && rnd() < 0.6) continue;
    const h = rr(9, 15),
      cr = rr(3, 5);
    if (STREAM.inDitch(x, y, 0.6)) continue;
    if (r < 150) addTreeInst(['oakA', 'ash', 'oakB', 'aspen'][i % 4], x, y, h, cr);
    else {
      farTrees.push([x, y, h, cr, i % 4]);
      for (let k = 0; k < 3; k++) {
        const aa = rnd() * 6.283,
          d = rr(0, 0.5) * cr;
        farBlobs.push([x + Math.cos(aa) * d, y + Math.sin(aa) * d, h * 0.64 + rr(-0.15, 0.2) * h, cr * rr(0.4, 0.6)]);
      }
    }
  }
  // with the real surroundings the made-up trees are dropped again (the loop still runs: the random sequence for everything after stays the same)
  if (GEO_REAL) {
    for (const [k, n] of Object.entries(keep0)) TREES[k].items.length = n;
    treeTrunks.length = trunks0;
    farTrees.length = 0;
    farBlobs.length = 0;
  }
  flushTreeInst();
  if (farBlobs.length) {
    const m4 = new THREE.Matrix4(),
      geo = new THREE.IcosahedronGeometry(1, 0),
      mat = new THREE.MeshStandardMaterial({ roughness: 1, envMapIntensity: 0.5 });
    const items = farBlobs.map((b, i) => ({ x: b[0], y: b[1], b, i }));
    for (const grp of cellsOf(items, 0, sector8)) {
      const im = new THREE.InstancedMesh(geo, mat, grp.length);
      grp.forEach(({ b, i }, k) => {
        m4.compose(V(b[0], b[1], b[2]), new THREE.Quaternion(), new THREE.Vector3(b[3], b[3] * 0.9, b[3]));
        im.setMatrixAt(k, m4);
        im.setColorAt(k, new THREE.Color([0x4f6a38, 0x5a7440, 0x465f33, 0x627b45][i % 4]));
      });
      im.userData.noMerge = true;
      vegReady(im);
      scene.add(im);
      farBlobMeshes.push(im);
    }
  }
}
// far trees (150–900 m): once the bark and leaf pictures have loaded, each blob cluster becomes a crossed pair of cards showing a
// picture of a real generated tree of that kind (albedo only, rendered once at load) – tree silhouettes on the horizon instead of balls
const farTrees = [],
  farBlobMeshes = [];
function treeImpostor(K, px = 256) {
  const sc = new THREE.Scene();
  sc.add(new THREE.AmbientLight(0xffffff, Math.PI));
  sc.add(new THREE.Mesh(K.bg, K.bark), new THREE.Mesh(K.lg, K.leaf));
  const bb = new THREE.Box3().setFromObject(sc),
    sz = bb.getSize(new THREE.Vector3()),
    c = bb.getCenter(new THREE.Vector3()),
    hw = (Math.max(sz.x, sz.z) / 2) * 1.02,
    hh = (sz.y / 2) * 1.02;
  const cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 0.1, 400);
  cam.position.set(c.x, c.y, c.z + 150);
  cam.lookAt(c);
  const rt = new THREE.WebGLRenderTarget(Math.round((px * hw) / hh), px, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const sv = SV.on.value,
    gi = GI.on.value,
    env = scene.environment;
  SV.on.value = 0;
  GI.on.value = 0;
  const pt = R.getRenderTarget(),
    pc = R.getClearColor(new THREE.Color()),
    pa = R.getClearAlpha(),
    tm = R.toneMapping;
  R.setRenderTarget(rt);
  R.setClearColor(0x3f4b30, 0);
  R.clear();
  R.render(sc, cam); // foliage-coloured background: the mip levels of a far tree do not darken towards black
  // put everything back (since V16e these four statements were stuck inside the comment above – found 23.10.2026)
  R.setRenderTarget(pt);
  R.setClearColor(pc, pa);
  SV.on.value = sv;
  GI.on.value = gi;
  return { tex: rt.texture, w: hw * 2, h: hh * 2, base: bb.min.y - c.y + hh };
}
function buildFarImpostors() {
  if (!farTrees.length || QS.get('blobs')) return;
  const kinds = ['oakA', 'ash', 'oakB', 'aspen'].map(k => TREES[k]);
  if (kinds.some(K => !K || !K.leaf.map || !K.leaf.map.image)) return;
  const imp = kinds.map(K => treeImpostor(K));
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  const cross = (() => {
    const a = new THREE.PlaneGeometry(1, 1),
      b = new THREE.PlaneGeometry(1, 1);
    b.rotateY(Math.PI / 2);
    const g = BufferGeometryUtils.mergeGeometries([a, b]);
    g.translate(0, 0.5, 0);
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return g;
  })();
  imp.forEach((I, ki) => {
    const list = farTrees.filter(t => t[4] === ki);
    if (!list.length) return;
    const m0 = new THREE.MeshStandardMaterial({
      map: I.tex,
      alphaTest: 0.32,
      side: THREE.DoubleSide,
      roughness: 1,
      envMapIntensity: 0.55,
    });
    // both sides keep the upward normal (a double-sided material would turn it down on the back faces: half of the trees went black)
    m0.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\n normal = normalize( vNormal ); nonPerturbedNormal = normal;'
      );
    };
    m0.customProgramCacheKey = () => 'impostor';
    const mat = patchSV(m0);
    const items = list.map(([x, y, h, cr]) => ({ x, y, h, cr }));
    for (const grp of cellsOf(items, 0, sector8)) {
      const im = new THREE.InstancedMesh(cross, mat, grp.length);
      grp.forEach(({ x, y, h, cr }, k) => {
        const sy = h * rr(0.95, 1.1),
          sx = Math.max((sy * I.w) / I.h, cr * 2.1);
        q.setFromAxisAngle(up, rnd() * 6.283);
        m4.compose(V(x, y, -0.2), q, new THREE.Vector3(sx, sy, sx));
        im.setMatrixAt(k, m4);
        im.setColorAt(k, new THREE.Color(1, 1, 1).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.06, 0.04)));
      });
      im.userData.noMerge = true;
      vegReady(im);
      scene.add(im);
    }
  });
  for (const m of farBlobMeshes) scene.remove(m);
  markDirty();
}
buildTrees();
whenLoaded(() => {
  try {
    buildFarImpostors();
  } catch (e) {
    console.warn('far trees', e);
  }
});
