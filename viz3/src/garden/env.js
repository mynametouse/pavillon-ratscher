// ---------- environment: sky, sun, ground, terrain, neighbours ----------
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { BASE, HQ0, OFFLINE, QS, R, rnd, rr, scene, V } from '../core/head.js';
import { ANISO, cellsOf, LM, markDirty, patchSV, pbrMat, texFileOf, TEXMAN, texUse, vegReady } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { bldBegin, bldEnd, COL, PH, PH_END, phase, PHN, tagPh } from '../core/geo.js';
import { DETAIL } from '../core/detail.js';
import { STREAM } from './stream_geo.js';
export const S0 = window.SITE;
// real surroundings (27_ratscher): with the geodata package the made-up far land, forest blobs, lake and village are only a fallback –
// they are hidden as soon as the real terrain is built (FAKEENV); the made-up far trees are not planted at all
export const GEO_REAL = !!window.GEOMAN && !QS.get('nogeo');
export const FAKEENV = [];
const fakeEnv = o => {
  if (GEO_REAL)
    o.traverse(c => {
      c.userData.noMerge = true;
    });
  FAKEENV.push(o);
  return o;
}; // kept separate (not merged), so it can be taken out again
// near ground: the orthophoto shows through outside the modelled site (zone of the garden and the neighbours, corridor of the field path and stream)
export const GEOGU = {
  uGeoTex: { value: null },
  uGeoOn: { value: 0 },
  uGeoAB: { value: new THREE.Vector2(1, 0) },
  uGeoBox: { value: new THREE.Vector3(0, 0, 1) },
  uGeoGain: { value: 1 },
  uGeoZone: { value: new THREE.Vector4(-50, 42, -52, 48) },
  uGeoPath: { value: new THREE.Vector4(0, 0, 0, 1) },
  uGeoMap: { value: 0 },
  uGeoFlat: { value: 0 },
  uGeoFlatK: { value: 1 },
  uGeoCurve: { value: 0 },
};
export function dirFromAz(az, el) {
  const a = (az * Math.PI) / 180,
    e = (el * Math.PI) / 180;
  return V(Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)).normalize();
}
export let sunDir = dirFromAz(248, 13);
// other modules replace the sun direction through setSunDir (an imported variable cannot be assigned)
export function setSunDir(d) {
  sunDir = d;
}
// sky with soft cumulus layer
export const skyU = {
  sunDir: { value: sunDir.clone() },
  zen: { value: new THREE.Color(0x6e93bf) },
  hor: { value: new THREE.Color(0xf1d6ae) },
  glow: { value: new THREE.Color(0xffc27a) },
  glowK: { value: 1.0 },
  cloudCol: { value: new THREE.Color(0xffffff) },
  cloudShade: { value: new THREE.Color(0x9aa3b2) },
  cloudK: { value: 0.55 },
};
export const skyMat = new THREE.ShaderMaterial({
  uniforms: skyU,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `uniform vec3 sunDir,zen,hor,glow,cloudCol,cloudShade; uniform float glowK,cloudK; varying vec3 vP;
   float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
   float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y); }
   float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
   void main(){ vec3 d=normalize(vP); float h=max(d.y,0.0); vec3 c=mix(hor,zen,pow(h,0.5)); float s=max(dot(d,normalize(sunDir)),0.0);
     c+=glow*glowK*(pow(s,8.0)*0.45+pow(s,300.0)*1.6);
     if(d.y>0.01){ vec2 q=d.xz/(d.y+0.08)*1.6; float n=fbm(q+vec2(3.0,1.0)); float cl=smoothstep(0.52,0.78,n)*cloudK*smoothstep(0.01,0.12,d.y);
       float lit=0.55+0.45*smoothstep(0.4,0.8,fbm(q*1.3+normalize(sunDir).xz*0.3));
       vec3 cc=mix(cloudShade,cloudCol,lit) + glow*glowK*pow(s,4.0)*0.6; c=mix(c,cc,cl); }
     if(d.y<0.0) c=hor*0.9; gl_FragColor=vec4(c,1.0);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
   }`,
});
export const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), skyMat);
sky.userData.noMerge = true;
sky.renderOrder = -10;
scene.add(sky); // drawn first: the real land reaches beyond the sky sphere
// photographic sky (Poly Haven CC0, log-encoded upper hemisphere, see tools/mksky.py): replaces the painted sky as soon as its image is loaded;
// rotated so the bright sun region of the photo lies where the modelled sun stands
const SKYMAN = window.SKYMAN || {};
const photoSkyU = {
  tSky: { value: null },
  lo: { value: -5 },
  hi: { value: 3 },
  crop: { value: 0.56 },
  off: { value: 0 },
  gain: { value: 1 },
};
const photoSkyMat = new THREE.ShaderMaterial({
  uniforms: photoSkyU,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tSky; uniform float lo, hi, crop, off, gain; varying vec3 vP;
   void main(){ vec3 d = normalize(vP); float u = fract(atan(d.z, d.x) * 0.15915494 + 0.5 - off); float th = acos(clamp(d.y, -1.0, 1.0));
     float v = 1.0 - min(th / (3.14159265 * crop), 1.0); vec3 c = texture2D(tSky, vec2(u, clamp(v, 0.003, 0.997))).rgb;
     gl_FragColor = vec4(exp2(lo + c * (hi - lo)) * gain, 1.0);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
   }`,
});
const skyTex = {};
let skyWant = null;
function skyAlign(mode) {
  const h = SKYMAN[mode];
  if (!h) return;
  const phiS = Math.atan2(sunDir.z, sunDir.x);
  photoSkyU.off.value = phiS / (2 * Math.PI) + 0.5 - h.sun_u;
}
// a sky photo: the texture when it is there, else null (and it is fetched); the day-and-night blend (time/daynight.js) asks for two at a time
export function skyLoad(mode) {
  const h = SKYMAN[mode];
  if (!h) return null;
  const e = skyTex[mode];
  if (e === 'loading') return null;
  if (e) return e;
  skyTex[mode] = 'loading';
  new THREE.TextureLoader(LM).load(
    BASE + 'sky/' + h.files[HQ0 || OFFLINE ? 'hq' : 'lq'],
    t => {
      t.colorSpace = THREE.NoColorSpace;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      skyTex[mode] = t;
      if (window.DN && LATE.DN.active) LATE.DN.update(true);
      else skyUse(mode, t);
      markDirty();
    },
    undefined,
    () => {
      delete skyTex[mode];
    }
  );
  return null;
}
function skyUse(mode, t) {
  if (skyWant !== mode || (window.DN && LATE.DN.active)) return;
  const h = SKYMAN[mode];
  photoSkyU.tSky.value = t;
  photoSkyU.lo.value = h.lo;
  photoSkyU.hi.value = h.hi;
  photoSkyU.crop.value = h.crop;
  photoSkyU.gain.value = h.gain ?? 1;
  skyAlign(mode);
  sky.material = photoSkyMat;
  const hz = h.horizon_linear;
  if (hz && scene.fog)
    scene.fog.color.setRGB(hz[0] * (h.fogK ?? 0.9), hz[1] * (h.fogK ?? 0.9), hz[2] * (h.fogK ?? 0.9));
  markDirty();
}
export function setSkyFor(mode) {
  skyWant = mode;
  const h = SKYMAN[mode];
  if (!h) {
    sky.material = skyMat;
    return;
  }
  const t = skyLoad(mode);
  if (t) skyUse(mode, t);
}
scene.fog = new THREE.Fog(0xe4dccd, 500, 7000);
export const sun = new THREE.DirectionalLight(0xffdcae, 3.2);
sun.castShadow = true;
const SHS = OFFLINE ? 4096 : HQ0 ? 4096 : 2048;
sun.shadow.mapSize.set(SHS, SHS);
{
  const sc = sun.shadow.camera;
  sc.left = -16;
  sc.right = 16;
  sc.top = 16;
  sc.bottom = -16;
  sc.near = 1;
  sc.far = 140;
}
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 3;
scene.add(sun);
scene.add(sun.target);
export let sunHalf = 16;
export function placeSun(center) {
  const c = center || V(2, 2, 3),
    dist = 70 + Math.max(0, sunHalf - 16) * 1.6;
  sun.position.copy(c.clone().add(sunDir.clone().multiplyScalar(dist)));
  sun.target.position.copy(c);
  sun.target.updateMatrixWorld();
}
placeSun();
// the sun's shadow box (±16 m) follows the walker in 4 m steps (workshop, stream); near the house and in the model view it stays on the house.
// The plan view from above widens it (half size `half`) so every building in the picture casts its shadow.
export let sunC = [2, 2];
export function sunFollow(x, y, half = 16) {
  let cx = 2,
    cy = 2;
  if (half > 16 || Math.hypot(x - 2, y - 2) > 9) {
    cx = Math.round(x / 4) * 4;
    cy = Math.round(y / 4) * 4;
  }
  half = Math.ceil(half / 4) * 4;
  if (cx === sunC[0] && cy === sunC[1] && half === sunHalf) return;
  sunC = [cx, cy];
  if (half !== sunHalf) {
    sunHalf = half;
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -half;
    sc.right = sc.top = half;
    sc.far = 140 + Math.max(0, half - 16) * 3.4;
    sc.updateProjectionMatrix();
    sun.shadow.normalBias = (0.025 * half) / 16;
  }
  placeSun(V(cx, cy, 3));
  markDirty(true);
}
export const hemi = new THREE.HemisphereLight(0xcfe0f2, 0x7c786a, 0.35);
scene.add(hemi);
// fallback environment from the sky until the HDRI arrives
export const pmrem = new THREE.PMREMGenerator(R);
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  scene.environment = pmrem.fromScene(es, 0.02).texture;
}
// ---------- near ground (240 x 240 m): painted overview + photo lawn / gravel detail ----------
export const GSZ = 240,
  GPX = OFFLINE ? 4096 : HQ0 ? 3072 : 2048;
export const toPxF = p => (x, y) => [((x + GSZ / 2) / GSZ) * p, ((GSZ / 2 - y) / GSZ) * p];
// garden paths (gravel): bridge over the stream in the north → between carport and bungalow → front door on the east side; branches to the caravan, bungalow, wash house, greenhouse, wooden house
export const PATHS = [
  [
    STREAM.bridgeGardenEnd,
    [STREAM.bridgeGardenEnd[0] + 0.35, STREAM.bridgeGardenEnd[1] - 1.4],
    [2.35, 21.9],
    [3.1, 18.6],
    [3.6, 14.5],
    [4.2, 10.5],
    [5.6, 7.2],
    [7.1, 4.8],
    [7.45, 3.1],
  ], // from the bridge (north) straight towards the pavilion
  [
    [3.2, 17.8],
    [1.4, 16.5],
    [-0.88, 15.95],
  ],
  [
    [3.3, 18.4],
    [6.0, 19.3],
    [8.6, 19.45],
  ],
  [
    [7.15, 3.9],
    [9.4, 4.1],
    [11.1, 3.45],
  ],
  [
    [9.4, 4.1],
    [10.3, 1.4],
    [11.5, 1.45],
    [12.55, 1.35],
  ], // to the greenhouse door (north gable, since 23.10.2026)
  [
    [10.3, 1.4],
    [10.45, 0.2],
    [10.85, -0.75],
  ], // to the wooden hut's door (north, since 23.10.2026)
];
const PATH = PATHS[0];
window.PATH = PATH;
window.PATHS = PATHS;
function mkCanvasG(px) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  return c;
}
export const gpaint = mkCanvasG(GPX),
  gmask = mkCanvasG(GPX);
{
  const g = gpaint.getContext('2d'),
    p = GPX,
    toPx = toPxF(p);
  g.fillStyle = '#71834d';
  g.fillRect(0, 0, p, p);
  for (let k = 0; k < (p * p) / 90; k++) {
    const c = new THREE.Color('#71834d');
    c.offsetHSL(rr(-0.025, 0.025), rr(-0.08, 0.06), rr(-0.08, 0.08));
    g.fillStyle = '#' + c.getHexString();
    g.fillRect(rnd() * p, rnd() * p, rr(1, 3), rr(1, 4));
  }
  for (let k = 0; k < 70; k++) {
    const cx = rr(-GSZ / 2, GSZ / 2),
      cy = rr(-GSZ / 2, GSZ / 2);
    if (Math.hypot(cx, cy) < 75) continue;
    const w = rr(25, 60),
      h = rr(20, 50);
    const q = toPx(cx, cy);
    g.fillStyle = ['#a99a68', '#7b8f4e', '#8c7f57', '#6f8448', '#b8a674'][k % 5];
    g.globalAlpha = 0.55;
    g.fillRect(q[0], q[1], (w / GSZ) * p, (h / GSZ) * p);
    g.globalAlpha = 1;
  }
  const [P1, P2] = S0.path;
  const dx = P2[0] - P1[0],
    dy = P2[1] - P1[1];
  const L = Math.hypot(dx, dy);
  const ux = dx / L,
    uy = dy / L;
  let nx = uy,
    ny = -ux;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const f = (t, o) => toPx(P1[0] + ux * t + nx * o, P1[1] + uy * t + ny * o);
  g.fillStyle = '#cdb98a';
  g.beginPath();
  [f(-200, 2.2), f(250, 2.2), f(250, 200), f(-200, 200)].forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q)));
  g.fill();
  g.strokeStyle = 'rgba(120,98,60,0.35)';
  g.lineWidth = 2;
  for (let o = 3; o < 200; o += 0.9) {
    g.beginPath();
    g.moveTo(...f(-200, o));
    g.lineTo(...f(250, o));
    g.stroke();
  }
  g.fillStyle = '#c9c0ad';
  g.beginPath();
  [f(-200, -1.6), f(250, -1.6), f(250, 1.6), f(-200, 1.6)].forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q)));
  g.fill();
  g.strokeStyle = 'rgba(110,100,80,0.4)';
  g.lineWidth = 5;
  for (const o of [-0.7, 0.7]) {
    g.beginPath();
    g.moveTo(...f(-200, o));
    g.lineTo(...f(250, o));
    g.stroke();
  }
  g.fillStyle = '#829a58';
  g.beginPath();
  S0.garden.forEach((q, i) => {
    const pp = toPx(q[0], q[1]);
    i ? g.lineTo(...pp) : g.moveTo(...pp);
  });
  g.closePath();
  g.fill();
  STREAM.paint(g, toPx);
  {
    const c = toPx(26.0, -1.1);
    g.fillStyle = 'rgba(150,132,84,0.45)';
    g.beginPath();
    g.ellipse(c[0], c[1], (7.2 / GSZ) * p, (9.6 / GSZ) * p, 0, 0, 7);
    g.fill();
    g.fillStyle = 'rgba(120,104,62,0.5)';
    for (let i = 0; i < 14; i++) {
      const q = toPx(20.5 + Math.random() * 12, -9.3 + Math.random() * 17);
      g.beginPath();
      g.ellipse(
        q[0],
        q[1],
        ((0.6 + Math.random()) / GSZ) * p,
        ((0.4 + Math.random() * 0.6) / GSZ) * p,
        Math.random() * 3,
        0,
        7
      );
      g.fill();
    }
  }
  for (const q of S0.trees) {
    g.fillStyle = 'rgba(52,60,30,0.28)';
    const c = toPx(q[0], q[1]);
    g.beginPath();
    g.arc(c[0], c[1], ((q[2] * 0.9) / GSZ) * p, 0, 7);
    g.fill();
  }
  g.fillStyle = '#c9c0ae';
  const a = toPx(-1.2, 5.1),
    b = toPx(7.2, -1.2);
  g.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  g.strokeStyle = '#c4baa6';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  PATHS.forEach((P, k) => {
    g.lineWidth = (p / GSZ) * (k ? 0.9 : 1.15);
    g.beginPath();
    P.forEach((q, i) => {
      const pp = toPx(q[0], q[1]);
      i ? g.lineTo(...pp) : g.moveTo(...pp);
    });
    g.stroke();
  });
}
{
  const g = gmask.getContext('2d', { willReadFrequently: true }),
    p = GPX,
    toPx = toPxF(p); // CPU canvas: it is read back once for the gravel lookups
  g.fillStyle = 'rgb(0,0,0)';
  g.fillRect(0, 0, p, p);
  // G = near-detail weight (garden + 25 m around the house), R = gravel
  const grd = g.createRadialGradient(...toPx(2, 2), (p / GSZ) * 18, ...toPx(2, 2), (p / GSZ) * 55);
  grd.addColorStop(0, 'rgb(0,255,0)');
  grd.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, p, p);
  g.fillStyle = 'rgb(0,255,0)';
  g.beginPath();
  S0.garden.forEach((q, i) => {
    const pp = toPx(q[0], q[1]);
    i ? g.lineTo(...pp) : g.moveTo(...pp);
  });
  g.closePath();
  g.fill();
  g.filter = 'blur(' + Math.max(1, (p / GSZ) * 0.12) + 'px)';
  g.fillStyle = 'rgb(255,255,0)';
  const a = toPx(-1.2, 5.1),
    b = toPx(7.2, -1.2);
  g.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  g.strokeStyle = 'rgb(255,255,0)';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  PATHS.forEach((P, k) => {
    g.lineWidth = (p / GSZ) * (k ? 0.9 : 1.15);
    g.beginPath();
    P.forEach((q, i) => {
      const pp = toPx(q[0], q[1]);
      i ? g.lineTo(...pp) : g.moveTo(...pp);
    });
    g.stroke();
  });
  g.filter = 'none';
  STREAM.paintMask(g, toPx);
}
const gpTex = new THREE.CanvasTexture(gpaint);
gpTex.colorSpace = THREE.SRGBColorSpace;
gpTex.anisotropy = ANISO;
const gmTex = new THREE.CanvasTexture(gmask);
gmTex.anisotropy = ANISO;
// leaf litter under the fruit trees: soft discs around every trunk (worn grass with fallen leaves)
const litTex = (() => {
  const n = 1024,
    c = mkCanvasG(n),
    q = c.getContext('2d'),
    toPx = toPxF(n);
  q.fillStyle = '#000';
  q.fillRect(0, 0, n, n);
  for (const t of S0.trees) {
    const p = toPx(t[0], t[1]),
      r = (((t[2] || 2.5) * 1.05) / GSZ) * n;
    const gr = q.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.55, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    q.fillStyle = gr;
    q.beginPath();
    q.arc(p[0], p[1], r, 0, 7);
    q.fill();
  }
  const t = new THREE.CanvasTexture(c);
  return t;
})();
export function mkGroundMat(cut) {
  const lt = (TEXMAN.lawn && TEXMAN.lawn.tile) || [2, 2],
    gt = (TEXMAN.gravel && TEXMAN.gravel.tile) || [1, 1];
  const m = new THREE.MeshStandardMaterial({ map: gpTex, roughness: 1, envMapIntensity: 0.8 });
  const rep = [GSZ / lt[0], GSZ / lt[1]];
  // V16b1: the colour detail (lawn, second lawn, gravel) comes from the texture array of core/detail.js – one texture unit instead of three
  // (the near ground had reached the 16 units many GPUs allow; with the road detail it went over and did not compile there)
  const lawnN = TEXMAN.lawn ? texUse(texFileOf('lawn', 'nrm'), false, rep).t : null,
    lawnO = TEXMAN.lawn ? texUse(texFileOf('lawn', 'orm'), false, rep).t : null;
  const gravN = TEXMAN.gravel ? texUse(texFileOf('gravel', 'nrm'), false, [1, 1]).t : null;
  if (lawnN) {
    m.normalMap = lawnN;
    m.normalScale.set(1, 1);
  }
  if (lawnO) {
    m.roughnessMap = lawnO;
  }
  const l2k = TEXMAN.lawn2 ? lt[0] / TEXMAN.lawn2.tile[0] : 1;
  const U = Object.assign(
    {
      uMask: { value: gmTex },
      uGravN: { value: gravN },
      uGK: { value: lt[0] / gt[0] },
      uHasL: { value: TEXMAN.lawn ? 1 : 0 },
      uCut: { value: cut ? 1 : 0 },
      uL2K: { value: l2k },
      uLit: { value: litTex },
      uHasL2: { value: TEXMAN.lawn2 ? 1 : 0 },
    },
    GEOGU
  );
  const LY = n => DETAIL.L[n].toFixed(1);
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    const RD = window.ROADS
      ? LATE.ROADS.shader(sh)
      : 'vec3 roadShade( vec2 p, vec3 c, float d ) { return c; } vec3 landDetail( vec2 p, vec3 c, float d ) { return c; } vec3 landHi( vec3 c ) { return c; }'; // V16b roads (world/roads.js)
    sh.uniforms.tDet = { value: DETAIL.tex };
    const decl = /sampler2DArray\s+tDet\b/.test(RD) ? '' : 'uniform highp sampler2DArray tDet;\n'; // shared with the road shader's declaration
    sh.fragmentShader =
      RD +
      '\n' +
      decl +
      'uniform sampler2D uMask, uGravN, uLit, uGeoTex; uniform float uGK, uHasL, uCut, uL2K, uHasL2, uGeoOn, uGeoGain, uGeoMap, uGeoFlat, uGeoFlatK, uGeoCurve; vec3 gGeoEm = vec3( 0.0 );\nvec3 geoAlbN( vec3 c, float g ) { return uGeoMap > 0.5 ? c * g : mix( c * g, 0.62 * pow( max( c, vec3( 0.0 ) ), vec3( 0.75 ) ) * g / 0.86, uGeoCurve ); } uniform vec2 uGeoAB; uniform vec3 uGeoBox; uniform vec4 uGeoZone, uGeoPath;\nfloat lnHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat lnNoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(lnHash(i), lnHash(i + vec2(1.0, 0.0)), u.x), mix(lnHash(i + vec2(0.0, 1.0)), lnHash(i + vec2(1.0, 1.0)), u.x), u.y); }\n' +
      sh.fragmentShader
        .replace(
          '#include <map_fragment>',
          `
        vec4 gPaint = texture2D( map, vMapUv ); vec4 gMsk = texture2D( uMask, vMapUv ); if ( uCut > 0.5 && gMsk.b > 0.5 ) discard;
        float gFade = smoothstep( 22.0, 75.0, length( vViewPosition ) );
        vec3 gCol = gPaint.rgb;
        vec2 gW = ( vMapUv - 0.5 ) * 240.0;   // world metres (x east, y south)
        float gM1 = lnNoise( gW * 0.115 ) * 0.62 + lnNoise( gW * 0.41 + 7.3 ) * 0.38, gM2 = lnNoise( gW * 0.032 + 3.1 );
        vec3 gTint = mix( vec3( 0.9, 0.93, 0.82 ), vec3( 1.07, 1.06, 0.97 ), gM1 ) * mix( vec3( 1.0 ), vec3( 1.1, 1.03, 0.84 ), smoothstep( 0.55, 0.9, gM2 ) * 0.55 );   // patches: lusher, drier, clover
        #ifdef USE_NORMALMAP
        if ( uHasL > 0.5 ) { vec2 wq = vNormalMapUv; vec3 lawn = texture( tDet, vec3( wq, ${LY('lawn')} ) ).rgb; vec3 grav = texture( tDet, vec3( wq * uGK, ${LY('gravel')} ) ).rgb;
          vec3 lawn2 = texture( tDet, vec3( mat2( 0.8, -0.6, 0.6, 0.8 ) * wq * 0.43 + 0.17, ${LY('lawn')} ) ).rgb;   // second, rotated sample against visible tiling
          lawn = mix( lawn, lawn2, smoothstep( 0.3, 0.7, lnNoise( gW * 0.09 + 11.0 ) ) );
          if ( uHasL2 > 0.5 ) { float lit = texture2D( uLit, vMapUv ).r * ( 0.75 + 0.25 * lnNoise( gW * 0.8 ) ); vec3 lf = texture( tDet, vec3( wq * uL2K, ${LY('lawn2')} ) ).rgb; lawn = mix( lawn, lf * vec3( 0.8, 0.82, 0.86 ), lit * 0.8 ); }
          vec3 nearC = mix( lawn * vec3( 1.45, 1.4, 1.25 ) * ( 0.8 + 0.4 * clamp( gPaint.g / 0.42, 0.5, 1.5 ) * 0.5 ), grav * 1.1, gMsk.r );
          gCol = mix( gPaint.rgb, nearC * mix( gTint, vec3( 1.0 ), gMsk.r ), gMsk.g * ( 1.0 - gFade * 0.9 ) ); }
        #endif
        gCol *= mix( vec3( 1.0 ), gTint, ( 1.0 - gMsk.g ) * 0.7 );
        if ( uGeoOn > 0.5 ) {   // the real land (orthophoto) outside the modelled site
          float gdz = max( max( uGeoZone.x - gW.x, gW.x - uGeoZone.y ), max( uGeoZone.z - gW.y, gW.y - uGeoZone.w ) );
          float go = dot( gW - uGeoPath.xy, uGeoPath.zw );
          float gKeep = max( 1.0 - smoothstep( 0.0, 18.0, gdz ), ( 1.0 - smoothstep( 8.0, 16.0, abs( go - 3.0 ) ) ) * ( 1.0 - smoothstep( 20.0, 60.0, gdz ) ) );
          vec2 gou = vec2( uGeoAB.x * gW.x - uGeoAB.y * gW.y + uGeoBox.x, uGeoAB.y * gW.x + uGeoAB.x * gW.y + uGeoBox.y ) * uGeoBox.z;
          if ( uGeoMap > 0.5 ) gKeep = gMsk.g;   // map: only the garden itself stays drawn as modelled
          else { vec3 oLow = geoAlbN( textureLod( uGeoTex, gou, 6.0 ).rgb, uGeoGain ), pLow = textureLod( map, vMapUv, 7.0 ).rgb;   // the modelled plots take over the real colours (20 m scale, mostly brightness)
            float lr = dot( oLow, vec3( 0.3, 0.59, 0.11 ) ) / max( dot( pLow, vec3( 0.3, 0.59, 0.11 ) ), 0.012 );
            vec3 tr = clamp( mix( vec3( lr ), oLow / max( pLow, vec3( 0.012 ) ), 0.75 ), 0.5, 1.8 );
            gCol = mix( gCol, gCol * tr, ( 1.0 - smoothstep( 0.0, 0.4, gMsk.g ) ) * 0.85 ); gCol = mix( gCol, landHi( gCol ), 1.0 - smoothstep( 0.0, 0.4, gMsk.g ) ); }   // V16b: the fields' bright photo colour toned like the land around
          vec3 gO = geoAlbN( texture2D( uGeoTex, gou ).rgb, uGeoGain ); if ( uGeoFlat < 0.5 && uGeoMap < 0.5 ) gO = landDetail( gW, gO, length( vViewPosition ) ); gGeoEm = gO * ( 1.0 - gKeep ) * uGeoFlat * uGeoFlatK;   // plan view: the photo / map shows its own colours (unlit)
          gCol = mix( gO * ( 1.0 - uGeoFlat ), gCol, gKeep );
          if ( uGeoMap < 0.5 && uGeoFlat < 0.5 ) gCol = roadShade( gW, gCol, length( vViewPosition ) ); }   // V16b: roads and paths, also the modelled field path and its connector
        diffuseColor.rgb *= gCol;`
        )
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n totalEmissiveRadiance += gGeoEm;'
        )
        .replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>
        reflectedLight.indirectSpecular *= 0.4;   // grass blades scatter: no mirror-like sky sheen at grazing angles`
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
        #ifdef USE_NORMALMAP_TANGENTSPACE
          vec3 nL = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0; vec3 nG = texture2D( uGravN, vNormalMapUv * uGK ).xyz * 2.0 - 1.0;
          vec3 mapN = normalize( mix( mix( vec3( 0.0, 0.0, 1.0 ), mix( nL, nG, gMsk.r ), gMsk.g ), vec3( 0.0, 0.0, 1.0 ), gFade ) );
          mapN.xy *= normalScale; normal = normalize( tbn * mapN );
        #else
          #include <normal_fragment_maps>
        #endif`
        );
  };
  if (!cut) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -1;
    m.polygonOffsetUnits = -2;
  }
  m.userData.leak = true;
  return patchSV(m);
}
const groundMat = mkGroundMat(true);
{
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(GSZ, GSZ), groundMat);
  gm.rotation.x = -Math.PI / 2;
  gm.receiveShadow = true;
  gm.userData.noMerge = true;
  scene.add(gm);
}
// ---------- far terrain (unchanged shape) ----------
function hsh(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi;
  const u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  const a = hsh(xi, yi),
    b = hsh(xi + 1, yi),
    c = hsh(xi, yi + 1),
    d = hsh(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let s = 0,
    a = 0.5,
    f = 1;
  for (let i = 0; i < 5; i++) {
    s += a * vnoise(x * f, y * f);
    f *= 2.1;
    a *= 0.5;
  }
  return s;
}
const lakeC = [1550 * Math.sin((106 * Math.PI) / 180), 1550 * Math.cos((106 * Math.PI) / 180)],
  lakeA = 520,
  lakeB = 200,
  lakeRot = (-35 * Math.PI) / 180;
export function inLake(x, y) {
  const dx = x - lakeC[0],
    dy = y - lakeC[1];
  const c = Math.cos(lakeRot),
    s = Math.sin(lakeRot);
  const u = dx * c - dy * s,
    v = dx * s + dy * c;
  return (u * u) / (lakeA * lakeA) + (v * v) / (lakeB * lakeB);
}
function terrainH(x, y) {
  const r = Math.hypot(x, y);
  const ramp = THREE.MathUtils.smoothstep(r, 140, 1400);
  let h =
    (fbm(x / 1500 + 3, y / 1500 + 9) - 0.42) * 190 * ramp +
    (fbm(x / 380, y / 380) - 0.5) * 26 * THREE.MathUtils.smoothstep(r, 120, 500);
  const az = (Math.atan2(x, y) * 180) / Math.PI;
  const ridge =
    THREE.MathUtils.smoothstep(r, 2200, 5200) *
    Math.max(0, Math.cos(((az - 15) * Math.PI) / 180)) *
    300 *
    (0.7 + 0.6 * fbm(x / 900, y / 900));
  h += ridge;
  const lk = inLake(x, y);
  if (lk < 1.8) h = Math.min(h, -6 + (lk - 1) * 45);
  return h - 0.4;
}
function forestAt(x, y, h) {
  const r = Math.hypot(x, y);
  return fbm(x / 800 + 7, y / 800 + 3) > (r < 900 ? 0.6 : 0.53) || h > 70;
}
// fields beyond the near ground: crisp borders with a grassy margin, drill rows and tramlines along each field, soft patches – all procedural,
// faded out where one pixel covers more than the pattern (forest and lake keep the vertex colour)
export const FIELDU = { uCloudK: { value: 0 }, uFT: { value: 0 } };
window.FIELDU = FIELDU;
export const FIELD_GLSL = `uniform float uFT;
float fHash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
float fNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( fHash( i ), fHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( fHash( i + vec2( 0.0, 1.0 ) ), fHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y ); }
uniform float uCloudK;
// soft shadows of the scattered clouds on the land beyond the garden (strong by day, faint in the evening; uFT could let them drift)
float cloudSh( vec2 w ) { vec2 q = w / 260.0 + vec2( 0.11, 0.07 ) * uFT; float n = fNoise( q ) * 0.55 + fNoise( q * 2.13 + 5.2 ) * 0.3 + fNoise( q * 4.7 + 1.7 ) * 0.15;
  return smoothstep( 0.56, 0.72, n ) * smoothstep( 160.0, 420.0, length( w ) ); }
vec3 fieldCol( vec2 w ) {
  const vec2 SZ = vec2( 170.0, 120.0 ); vec2 q = ( w + vec2( 37.0, 11.0 ) ) / SZ; vec2 cell = floor( q ); vec2 lc = fract( q ) * SZ;
  float k = fHash( cell ), k2 = fHash( cell + 17.3 ), aa = max( fwidth( w.x ), fwidth( w.y ) );
  vec3 c = k < 0.3 ? vec3( 0.56, 0.43, 0.18 ) : ( k < 0.58 ? vec3( 0.23, 0.35, 0.085 ) : ( k < 0.8 ? vec3( 0.33, 0.24, 0.093 ) : vec3( 0.15, 0.25, 0.065 ) ) );
  float u = k2 < 0.5 ? w.x : w.y;
  c *= 1.0 + sin( u * 0.8976 ) * 0.07 * ( 1.0 - smoothstep( 1.5, 4.0, aa ) );
  float t = abs( fract( u / 24.0 ) - 0.5 ) * 24.0, ln = 1.0 - smoothstep( 0.45, 0.45 + max( aa, 0.05 ), t ), fT = 1.0 - smoothstep( 2.0, 6.0, aa );
  c = mix( c, c * vec3( 0.78, 0.72, 0.66 ), ln * fT * 0.8 + ( 1.0 - fT ) * 0.03 );
  c *= 0.86 + 0.28 * ( fNoise( w / 55.0 + cell * 3.1 ) * 0.6 + fNoise( w / 17.0 ) * 0.4 );
  float e = min( min( lc.x, SZ.x - lc.x ), min( lc.y, SZ.y - lc.y ) );
  return mix( vec3( 0.12, 0.19, 0.055 ), c, smoothstep( 1.2, 3.5 + aa, e ) ); }
`;
{
  const N = 240,
    SZ = 14000;
  const g = new THREE.PlaneGeometry(SZ, SZ, N, N);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const col = [],
    fk = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = -pos.getZ(i);
    const r = Math.hypot(x, y);
    let h = r < 118 ? -2.4 : terrainH(x, y);
    pos.setY(i, h); // under the near ground: deep enough for the stream ditch (−1.6)
    const cx = Math.floor((x + 37) / 170),
      cy = Math.floor((y + 11) / 120);
    const k = hsh(cx, cy);
    let c;
    fk[i] = 1;
    if (forestAt(x, y, h)) {
      c = new THREE.Color(0x34492b).offsetHSL(0, 0, (k - 0.5) * 0.05);
      fk[i] = 0;
    } else if (k < 0.3) c = new THREE.Color(0xc4ad75);
    else if (k < 0.58) c = new THREE.Color(0x84a052);
    else if (k < 0.8) c = new THREE.Color(0x9b8656);
    else c = new THREE.Color(0x6c8846);
    if (inLake(x, y) < 1.15) {
      c = new THREE.Color(0x6d8a6a);
      fk[i] = 0;
    }
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('fieldK', new THREE.BufferAttribute(fk, 1));
  g.computeVertexNormals();
  const tmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.6 });
  if (!QS.get('plainfields')) {
    tmat.onBeforeCompile = sh => {
      sh.vertexShader =
        'attribute float fieldK; varying float vFK; varying vec2 vFW;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n vFK = fieldK; vFW = vec2( position.x, -position.z );'
        );
      sh.fragmentShader =
        'varying float vFK; varying vec2 vFW;\n' +
        FIELD_GLSL +
        sh.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        if ( vFK > 0.01 ) diffuseColor.rgb = mix( diffuseColor.rgb, fieldCol( vFW ), clamp( vFK * 1.5 - 0.25, 0.0, 1.0 ) );
        diffuseColor.rgb *= 1.0 - uCloudK * cloudSh( vFW );`
        );
      Object.assign(sh.uniforms, FIELDU);
    };
    tmat.customProgramCacheKey = () => 'fields';
  }
  const tm = new THREE.Mesh(g, tmat);
  tm.receiveShadow = false;
  tm.userData.noMerge = true;
  scene.add(tm);
  FAKEENV.push(tm);
  const pts = [];
  for (let i = 0; i < 14000; i++) {
    const a = rnd() * 6.283,
      rr2 = 450 + Math.pow(rnd(), 1.3) * 3800;
    const x = Math.sin(a) * rr2,
      y = Math.cos(a) * rr2;
    const h = terrainH(x, y);
    if (!forestAt(x, y, h) || inLake(x, y) < 1.3) continue;
    pts.push([x, y, h]);
  }
  // forest belts 0.45–4 km away: 20-triangle blobs in 8 sectors (frustum culled; at that distance a blob is a few pixels)
  const geo = new THREE.IcosahedronGeometry(1, 0),
    mat = new THREE.MeshStandardMaterial({ roughness: 1, envMapIntensity: 0.5 }),
    m4 = new THREE.Matrix4(),
    sc = new THREE.Vector3();
  const sector16 = it => Math.floor((Math.atan2(it.x, it.y) + Math.PI) / (Math.PI / 4));
  const all = pts.map((p, i) => ({ x: p[0], y: p[1], p, i }));
  for (const grp of cellsOf(all, 0, sector16)) {
    const im = new THREE.InstancedMesh(geo, mat, grp.length);
    grp.forEach(({ p, i }, k) => {
      const s = rr(6, 10);
      sc.set(s, s * rr(1.1, 1.6), s);
      m4.compose(V(p[0], p[1], p[2] + s * 0.9), new THREE.Quaternion(), sc);
      im.setMatrixAt(k, m4);
      im.setColorAt(
        k,
        new THREE.Color([0x2f4527, 0x3a5230, 0x2c3f25, 0x41593a][i % 4]).offsetHSL(0, 0, rr(-0.03, 0.03))
      );
    });
    im.userData.noMerge = true;
    vegReady(im);
    scene.add(im);
    FAKEENV.push(im);
  }
}
{
  const lg = new THREE.CircleGeometry(1, 64);
  const lm = new THREE.Mesh(
    lg,
    new THREE.MeshStandardMaterial({ color: 0x7d99ad, roughness: 0.08, metalness: 0.0, envMapIntensity: 1.2 })
  );
  lm.scale.set(lakeA * 1.02, lakeB * 1.02, 1);
  lm.rotation.x = -Math.PI / 2;
  lm.rotation.z = lakeRot;
  lm.position.copy(V(lakeC[0], lakeC[1], -5));
  lm.userData.noMerge = true;
  scene.add(lm);
  FAKEENV.push(lm);
}
// ---------- neighbour sheds, garage, bungalow, village ----------
// window and stable-window pictures (canvas): frame, mullions, glass with a sky gradient – one textured quad per window
const WINTEX = (() => {
  const mk = (w, h, f) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    f(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return t;
  };
  const house = mk(128, 160, (q, w, h) => {
    q.fillStyle = '#e9e6de';
    q.fillRect(0, 0, w, h);
    const gr = q.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#6d7d8a');
    gr.addColorStop(0.45, '#2b3540');
    gr.addColorStop(1, '#1a2026');
    q.fillStyle = gr;
    q.fillRect(9, 9, w - 18, h - 18);
    q.fillStyle = '#e9e6de';
    q.fillRect(w / 2 - 4, 9, 8, h - 18);
    q.fillRect(9, h * 0.38 - 4, w - 18, 8);
    q.fillStyle = 'rgba(255,255,255,0.10)';
    q.beginPath();
    q.moveTo(14, h * 0.9);
    q.lineTo(w * 0.42, 14);
    q.lineTo(w * 0.47, 14);
    q.lineTo(20, h * 0.9);
    q.fill();
    q.fillStyle = 'rgba(240,236,228,0.55)';
    q.fillRect(12, 12, w / 2 - 18, h * 0.22);
    q.fillRect(w / 2 + 6, 12, w / 2 - 18, h * 0.22);
    q.strokeStyle = 'rgba(0,0,0,0.35)';
    q.lineWidth = 3;
    q.strokeRect(1.5, 1.5, w - 3, h - 3);
  });
  const stable = mk(128, 80, (q, w, h) => {
    q.fillStyle = '#5a5650';
    q.fillRect(0, 0, w, h);
    q.fillStyle = '#3b4248';
    q.fillRect(6, 6, w - 12, h - 12);
    q.strokeStyle = '#6c665c';
    q.lineWidth = 4;
    for (let i = 1; i < 4; i++) {
      q.beginPath();
      q.moveTo(6 + ((w - 12) * i) / 4, 6);
      q.lineTo(6 + ((w - 12) * i) / 4, h - 6);
      q.stroke();
    }
    q.beginPath();
    q.moveTo(6, h / 2);
    q.lineTo(w - 6, h / 2);
    q.stroke();
    for (let i = 0; i < 400; i++) {
      q.fillStyle = `rgba(${(150 + Math.random() * 60) | 0},${(140 + Math.random() * 50) | 0},120,${Math.random() * 0.2})`;
      q.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  const m = t =>
    patchSV(
      new THREE.MeshStandardMaterial({
        map: t,
        roughness: 0.32,
        metalness: 0.05,
        envMapIntensity: 1.1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
  return { house: m(house), stable: m(stable) };
})();
// details on the simple neighbour and village houses: concrete plinth, zinc gutters and downpipes, windows, barn doors (kind 'house' | 'barn')
function houseDetails(g, L, W, hw, hr, kind) {
  const add = (geo, m, x, y, z, ry = 0) => {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z);
    me.rotation.y = ry;
    me.receiveShadow = true;
    g.add(me);
    return me;
  };
  add(
    new THREE.BoxGeometry(L + 0.08, kind === 'barn' ? 0.6 : 0.42, W + 0.08),
    MAT.conc,
    0,
    kind === 'barn' ? 0.3 : 0.21,
    0
  ).castShadow = false;
  if (hr > 0) {
    const gu = new THREE.CylinderGeometry(0.065, 0.065, L + 0.5, 8),
      dp = new THREE.CylinderGeometry(0.045, 0.045, hw, 8);
    for (const sz of [-1, 1]) {
      add(gu, MAT.zinc, 0, hw - 0.03, sz * (W / 2 + 0.24)).rotation.z = Math.PI / 2;
      for (const sx of [-1, 1]) add(dp, MAT.zinc, sx * (L / 2 - 0.18), hw / 2, sz * (W / 2 + 0.1));
    }
  }
  if (kind === 'house') {
    const floors = hw > 4.8 ? [0.95, 3.6] : [0.95];
    const n = Math.max(1, Math.floor((L - 1.2) / 2.3)),
      wq = new THREE.PlaneGeometry(1.05, 1.3);
    for (const sz of [-1, 1])
      for (const y0 of floors)
        for (let i = 0; i < n; i++) {
          if (sz < 0 && y0 < 2 && i === Math.floor(n / 2)) continue;
          add(wq, WINTEX.house, -L / 2 + ((i + 0.5) * L) / n, y0 + 0.65, sz * (W / 2 + 0.012), sz < 0 ? Math.PI : 0);
        }
    for (const sx of [-1, 1])
      for (const y0 of floors) add(wq, WINTEX.house, sx * (L / 2 + 0.012), y0 + 0.65, 0, (sx * Math.PI) / 2);
    const dq = new THREE.PlaneGeometry(1.0, 2.05);
    add(dq, MAT.barnDoor, -L / 2 + ((Math.floor(n / 2) + 0.5) * L) / n, 1.03 + 0.42, -(W / 2 + 0.014), Math.PI);
  } else if (kind === 'barn') {
    const n = Math.max(2, Math.floor(L / 3.2)),
      wq = new THREE.PlaneGeometry(0.95, 0.6);
    for (const sz of [-1, 1])
      for (let i = 0; i < n; i++)
        add(
          wq,
          WINTEX.stable,
          -L / 2 + ((i + 0.5) * L) / n,
          Math.min(hw - 0.8, 2.4),
          sz * (W / 2 + 0.012),
          sz < 0 ? Math.PI : 0
        );
    const dw = Math.min(4.2, W * 0.42),
      dh = Math.min(hw - 0.5, 3.8),
      dq = new THREE.PlaneGeometry(dw, dh);
    for (const sx of [-1, 1]) {
      add(dq, MAT.barnDoor, sx * (L / 2 + 0.014), dh / 2 + 0.02, 0, (sx * Math.PI) / 2);
      add(new THREE.BoxGeometry(0.12, 0.12, dw + 0.5), MAT.zinc, sx * (L / 2 + 0.08), dh + 0.12, 0);
    }
  }
}
function prismHouse(cx, cy, L, W, az, hw, hr, wallM, roofM, flat = false, kind = null) {
  const g = new THREE.Group();
  const bg = new THREE.BoxGeometry(L, hw, W);
  {
    const uv = bg.attributes.uv,
      p = bg.attributes.position,
      n = bg.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)) > 0.5;
      uv.setXY(i, ax ? p.getZ(i) : p.getX(i), p.getY(i));
    }
  }
  const body = new THREE.Mesh(bg, wallM);
  body.position.y = hw / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  if (flat) {
    const rf = new THREE.Mesh(new THREE.BoxGeometry(L + 0.4, 0.25, W + 0.4), roofM);
    rf.position.y = hw + 0.12;
    rf.castShadow = true;
    g.add(rf);
  } else {
    const sh = new THREE.Shape();
    sh.moveTo(-W / 2 - 0.3, 0);
    sh.lineTo(0, hr);
    sh.lineTo(W / 2 + 0.3, 0);
    sh.lineTo(-W / 2 - 0.3, 0);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: L + 0.5, bevelEnabled: false });
    eg.translate(0, 0, -(L + 0.5) / 2);
    {
      const uv = eg.attributes.uv,
        p = eg.attributes.position;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i), Math.hypot(p.getX(i), p.getY(i) - hr));
    }
    const rf = new THREE.Mesh(eg, roofM);
    rf.rotation.y = Math.PI / 2;
    rf.position.y = hw;
    rf.castShadow = true;
    g.add(rf);
  }
  if (kind) houseDetails(g, L, W, hw, hr, kind);
  g.position.copy(V(cx, cy, 0));
  g.rotation.y = (-(az - 90) * Math.PI) / 180;
  scene.add(g);
  return g;
}
function rectInfo(r) {
  const p = r.map(q => new THREE.Vector2(q[0], q[1]));
  const c = p[0].clone().add(p[2]).multiplyScalar(0.5);
  const L = p[0].distanceTo(p[3]),
    W = p[0].distanceTo(p[1]);
  const d = p[0].clone().sub(p[3]);
  const az = (Math.atan2(d.x, d.y) * 180) / Math.PI;
  return { c, L, W, az };
}
function rectCol(r, h) {
  const xs = r.map(q => q[0]),
    ys = r.map(q => q[1]);
  COL.push([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), 0, h, 'house', PH, PH_END]);
}
S0.neigh.forEach((r, i) => {
  const q = rectInfo(r);
  const roof = rnd() < 0.5 ? MAT.roofRed : MAT.roofGrey;
  prismHouse(
    q.c.x,
    q.c.y,
    q.L,
    q.W * 0.8,
    q.az,
    3.4,
    1.6,
    MAT.wall,
    [MAT.boxRed, roof, MAT.fibre, roof][i % 4],
    false,
    'barn'
  );
});
phase(PHN.garage);
{
  const q = rectInfo(S0.garage);
  bldBegin('garage', 'Blechgarage', [q.c.x, q.c.y], { short: 'Garage', pad: 0.2 });
  const g = prismHouse(q.c.x, q.c.y, q.L, q.W, q.az, 2.3, 0, MAT.corr, MAT.roofGrey, true);
  g.traverse(o => tagPh(o));
  rectCol(S0.garage, 2.5);
  for (let i = 0; i < 2; i++) {
    const pv = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 1.1), MAT.pv);
    pv.position.set(-1.0 + i * 1.9, 2.5, 0);
    g.add(pv);
  }
  bldEnd({ c: [q.c.x, q.c.y], az: q.az, L: q.L, W: q.W });
}
phase(null);
for (let i = 0; i < 42; i++) {
  const a = (rr(95, 215) * Math.PI) / 180,
    r = rr(55, 320);
  const x = Math.sin(a) * r,
    y = Math.cos(a) * r;
  if (Math.hypot(x - 2, y - 2) < 45) continue;
  const wm = pbrMat('plaster_ext', {
    fallback: [0xe9e2d3, 0xd9cfb8, 0xe8dcc0, 0xcfc7bd][i % 4],
    color: [0xffffff, 0xf2e6cf, 0xfff3dc, 0xe9e4dc][i % 4],
  });
  fakeEnv(
    prismHouse(
      x,
      y,
      rr(8, 12),
      rr(7, 9),
      rr(0, 180),
      rr(4.5, 6),
      rr(3, 4.5),
      wm,
      [MAT.roofRed, MAT.roofGrey, MAT.roofRed][i % 3],
      false,
      'house'
    )
  );
}
for (let i = 0; i < 3; i++)
  fakeEnv(
    prismHouse(
      -25 + i * 22,
      -95 - i * 6,
      40,
      16,
      175,
      6.5,
      2.0,
      MAT.wall,
      [MAT.fibre, MAT.boxRed, MAT.fibre][i],
      false,
      'barn'
    )
  );
