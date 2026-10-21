// ===================== Pavillon Ratscher · Modell v3 (fotorealistisch, begehbar) =====================
// local site coords: x = east, y = north, z = up  ->  three: X = x, Y = z, Z = -y
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone as skelClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { N8AOPass } from 'n8ao';
import { Tree } from './eztree/tree.js';
window.THREE = THREE; THREE.Cache.enabled = true;
const OFFLINE = !!window.OFFLINE;
const COARSE = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
// content density is fixed at load (phones and tablets get fewer grass clumps and a smaller shadow map); the render tier (resolution, AO) is chosen by a short GPU test, see 09_render
let QUALITY = window.QUALITY || (COARSE ? 'low' : 'high');
const HQ0 = QUALITY === 'high';
const DPR = window.devicePixelRatio || 1;
// design variant: 'B' = no tower, ladder stairs through a trapdoor and a roof hatch, OG cantilevered on all four sides (default);
// 'A' = slim spiral stair tower on the east. Both are built into the scene, only the active one is shown (switch: chips "Leiter"/"Turm").
let VARIANT = (() => { const h = (location.hash || '').slice(1).toLowerCase(); if (h === 'turm') return 'A'; if (h === 'leiter') return 'B';
  try { const v = localStorage.getItem('pav-variant'); if (v === 'A' || v === 'B') return v; } catch (e) {} return 'B'; })();
window.VARIANT = VARIANT;
const varOk = v => !v || v === VARIANT;
// point lights: skip the lighting maths for lamps that do not reach a fragment (switched off or out of range) – most of the picture is outside every lamp's radius
THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace('RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
  'if ( directLight.visible ) RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );');
const BASE = window.ASSET_BASE || '';
const V = (x, y, z) => new THREE.Vector3(x, z, -y);
let _s = 12345; const rnd = () => { _s = (_s * 16807) % 2147483647; return (_s - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
const $ = id => document.getElementById(id);
const stage = $('stage') || document.body;
const scene = new THREE.Scene();
const R = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: OFFLINE, powerPreference: 'high-performance' });
R.setPixelRatio(OFFLINE ? 1 : Math.min(DPR, 1.0));
R.shadowMap.enabled = true; R.shadowMap.type = (HQ0 || OFFLINE) ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; R.shadowMap.autoUpdate = false;
const QS = new URLSearchParams(location.search);
R.toneMapping = ({ agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping })[QS.get('tm') || window.TONEMAP || 'agx'] || THREE.AgXToneMapping;   // AgX: photographic highlight roll-off, no cartoon saturation
R.toneMappingExposure = 1.0; R.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(R.domElement);
const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 12000);   // near plane ≥ 0.1 m: enough depth precision that nothing z-fights while turning
