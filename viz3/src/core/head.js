// ===================== Pavillon Ratscher · Modell v3 (fotorealistisch, begehbar) =====================
// local site coords: x = east, y = north, z = up  ->  three: X = x, Y = z, Z = -y
import * as THREE from 'three';
import { SAVE } from './save.js';
// three.js addons, n8ao and ez-tree: every module imports what it uses straight from the source (ES modules since refactor phase 1)
window.THREE = THREE;
THREE.Cache.enabled = true;
export const OFFLINE = !!window.OFFLINE;
export const COARSE = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
// content density is fixed at load (phones and tablets get fewer grass clumps and a smaller shadow map); the render tier (resolution, AO) is chosen by a short GPU test, see 09_render
export let QUALITY = window.QUALITY || (COARSE ? 'low' : 'high');
export const HQ0 = QUALITY === 'high';
export const DPR = window.devicePixelRatio || 1;
// design variant: 'B' = no tower, ladder stairs through a trapdoor and a roof hatch, OG cantilevered on all four sides (default);
// 'A' = slim spiral stair tower on the east. Both are built into the scene, only the active one is shown (switch: chips "Leiter"/"Turm").
export let VARIANT = (() => {
  const h = (location.hash || '').slice(1).toLowerCase();
  if (h === 'turm') return 'A';
  if (h === 'leiter') return 'B';
  try {
    const v = SAVE.raw('pav-variant');
    if (v === 'A' || v === 'B') return v;
  } catch (e) {}
  return 'B';
})();
window.VARIANT = VARIANT;
export function setVariantId(v) {
  VARIANT = v; // pavilion/variant.js switches (setVariant)
}
export const varOk = v => !v || v === VARIANT;
// point lights: skip the lighting maths for lamps that do not reach a fragment (switched off or out of range) – most of the picture is outside every lamp's radius
THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace(
  'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
  'if ( directLight.visible ) RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );'
);
export const BASE = window.ASSET_BASE || '';
export const V = (x, y, z) => new THREE.Vector3(x, z, -y);
let _s = 12345;
export const rnd = () => {
  _s = (_s * 16807) % 2147483647;
  return (_s - 1) / 2147483646;
};
export const rr = (a, b) => a + (b - a) * rnd();
export const $ = id => document.getElementById(id);
export const stage = $('stage') || document.body;
export const scene = new THREE.Scene();
export const R = new THREE.WebGLRenderer({
  antialias: false,
  preserveDrawingBuffer: OFFLINE,
  powerPreference: 'high-performance',
});
R.setPixelRatio(OFFLINE ? 1 : Math.min(DPR, 1.0));
R.shadowMap.enabled = true;
R.shadowMap.type = HQ0 || OFFLINE ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
R.shadowMap.autoUpdate = false;
export const QS = new URLSearchParams(location.search);
R.toneMapping =
  { agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping }[
    QS.get('tm') || window.TONEMAP || 'agx'
  ] || THREE.AgXToneMapping; // AgX: photographic highlight roll-off, no cartoon saturation
R.toneMappingExposure = 1.0;
R.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(R.domElement);
export const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 12000); // near plane ≥ 0.1 m: enough depth precision that nothing z-fights while turning
