// Standalone viewer of the world test tiles (tools/welt): terrain + orthophoto quadtree in UTM 32N, road ribbons and buildings as GLB.
// Coordinates: scene x = E - E0, y = H - H0, z = -(N - N0) with (E0, N0, H0) = the app's model origin (meta.json origin).
// Query: ?base=<url of welt-test/> (default: ../ when served from welt-test/viewer/, else the GitHub Pages copy), ?lod=2.2 (refine while
// the camera is closer than lod x tile size), ?test=1 (no animation loop extras, for the headless check).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const Q = new URLSearchParams(location.search);
const PAGES = 'https://mynametouse.github.io/pavillon-ratscher/welt-test/';
const BASE = Q.get('base')
  ? new URL(Q.get('base'), location.href).href
  : location.pathname.includes('/welt-test/viewer') ? new URL('../', location.href).href : PAGES;
const MOBILE = /iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
const LOD = +(Q.get('lod') || (MOBILE ? 1.7 : 2.2));
// texture budget: 512 px tiles with mipmaps ~1.4 MB each -> phone <= ~250 MB (brief: <= 300 MB textures on the phone)
const MAX_TILES = +(Q.get('maxtiles') || (MOBILE ? 170 : 700));
const MAX_REQ = 6;
const CURV = 0.87 / (2 * 6371000); // earth curvature with standard refraction
const $ = id => document.getElementById(id);

const ST = { bytes: 0, requests: 0, tilesReady: 0, failed: 0, texBytes: 0, contentBytes: 0, errors: [], t0: performance.now(), firstFrameMs: 0 };
window.WELT = { ST, ready: false };
const fail = (where, e) => {
  const m = `${where}: ${(e && e.message) || e}`;
  ST.errors.push(m);
  console.warn(m);
};

async function get(url, kind = 'arrayBuffer') {
  ST.requests++;
  // GitHub Pages answers bursts right after a deploy now and then with 503: retry transient failures with a short backoff
  let r;
  for (let k = 0; ; k++) {
    try {
      r = await fetch(url);
      if (r.ok || k >= 3 || !(r.status >= 500 || r.status === 429)) break;
    } catch (e) {
      if (k >= 3) throw e;
    }
    ST.retries = (ST.retries || 0) + 1;
    await new Promise(res => setTimeout(res, 400 * 3 ** k));
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  if (kind === 'json') {
    const t = await r.arrayBuffer();
    ST.bytes += t.byteLength;
    return JSON.parse(new TextDecoder().decode(t));
  }
  const b = await r[kind]();
  ST.bytes += kind === 'blob' ? b.size : b.byteLength;
  return b;
}

// ---------------- renderer, scene ----------------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const SKY = new THREE.Color(0xc9dcea);
scene.background = SKY;
scene.fog = new THREE.FogExp2(SKY, 0.000045);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 80000);
const sunDir = new THREE.Vector3(-0.45, 0.75, 0.48).normalize();
// physically based light units (three r155+): Lambert divides by pi, so ~pi x the old intensities
scene.add(new THREE.HemisphereLight(0xdfe9f3, 0x5b5546, 1.4));
const sun = new THREE.DirectionalLight(0xfff3e0, 2.0);
sun.position.copy(sunDir);
scene.add(sun);
const U = { uCam: { value: new THREE.Vector3() }, uCurv: { value: CURV } };

// terrain material: orthophoto as is (it carries the real light), mild relief shading, fog, earth curvature, quadrant mask
const TERR_VS = `
uniform vec3 uCam; uniform float uCurv;
varying vec2 vUv; varying vec3 vN; varying float vDist;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 d = wp.xz - uCam.xz;
  wp.y -= dot(d, d) * uCurv;
  vUv = uv; vN = normal;
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const TERR_FS = `
uniform sampler2D map; uniform vec3 uSun; uniform int uMask; uniform vec3 uFog; uniform float uFogD;
varying vec2 vUv; varying vec3 vN; varying float vDist;
void main() {
  int q = (vUv.x >= 0.5 ? 1 : 0) + (vUv.y >= 0.5 ? 2 : 0);
  if (((uMask >> q) & 1) != 0) discard;
  vec3 c = texture2D(map, vUv).rgb;
  // relief shading relative to flat ground (the photo already has its own light): 1.0 on the flat, brighter towards the sun
  float l = 1.0 + 0.6 * (dot(normalize(vN), uSun) - uSun.y);
  c *= clamp(l, 0.55, 1.2);
  float f = 1.0 - exp(-pow(vDist * uFogD, 2.0));
  gl_FragColor = vec4(mix(c, uFog, f), 1.0);
}`;
function terrainMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      uSun: { value: sunDir },
      uMask: { value: 0 },
      uFog: { value: new THREE.Color(0xc9dcea) },
      uFogD: { value: 0.000045 },
      uCam: U.uCam,
      uCurv: U.uCurv,
    },
    vertexShader: TERR_VS,
    fragmentShader: TERR_FS,
  });
}
// GLB content: Lambert with vertex colours, same curvature as the terrain
function contentMaterial(kind) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  if (kind === 'roads') {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -4;
  }
  m.onBeforeCompile = sh => {
    sh.uniforms.uCam = U.uCam;
    sh.uniforms.uCurv = U.uCurv;
    sh.vertexShader = 'uniform vec3 uCam; uniform float uCurv;\n' + sh.vertexShader.replace(
      '#include <project_vertex>',
      `vec4 mvPosition = vec4(transformed, 1.0);
       #ifdef USE_INSTANCING
         mvPosition = instanceMatrix * mvPosition;
       #endif
       mvPosition = modelMatrix * mvPosition;
       vec2 dd = mvPosition.xz - uCam.xz; mvPosition.y -= dot(dd, dd) * uCurv;
       mvPosition = viewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`,
    );
  };
  return m;
}
const MAT = { roads: contentMaterial('roads'), buildings: contentMaterial('buildings'), marks: contentMaterial('roads') };
MAT.marks.polygonOffsetFactor = -4;
MAT.marks.polygonOffsetUnits = -8;
MAT.bridge = contentMaterial('buildings');
MAT.bridge.side = THREE.DoubleSide;
// trees: unit shapes scaled per instance (cone for conifers, rounded crown for broadleaves), colour per instance
const TREE_GEO = [new THREE.ConeGeometry(1, 1, 6, 1, true).translate(0, 0.5, 0), new THREE.IcosahedronGeometry(1, 0).translate(0, 1, 0)];
MAT.trees = (() => {
  const m = contentMaterial('trees');
  m.vertexColors = false;
  return m;
})();
const TREE_RANGE = MOBILE ? 500 : 1000;

// ---------------- meta, frame ----------------
let META, O, LV, LMIN, LMAX;
const nodes = new Map();
const key = (L, x, y) => `${L}/${x}/${y}`;
function tileBounds(L, x, y) {
  const s = META.tiling.root[2] / 2 ** L;
  return [META.tiling.root[0] + x * s, META.tiling.root[1] + y * s, s];
}
const exists = (L, x, y) => {
  const r = LV[L] && LV[L].rect;
  return !!r && x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
};
const toScene = (E, N, H) => new THREE.Vector3(E - O.E, H, -(N - O.N));

class Node {
  constructor(L, x, y, parent) {
    Object.assign(this, { L, x, y, parent, state: 0, mesh: null, used: 0, kids: null });
    const [e0, n0, s] = tileBounds(L, x, y);
    this.size = s;
    this.e0 = e0;
    this.n0 = n0;
    const p0 = toScene(e0, n0, META.tiling.hmin - 60);
    const p1 = toScene(e0 + s, n0 + s, META.tiling.hmax + 5);
    this.box = new THREE.Box3(p0.clone().min(p1), p0.clone().max(p1));
  }
  children() {
    if (this.kids) return this.kids;
    this.kids = [];
    if (this.L >= LMAX) return this.kids;
    for (let dj = 0; dj < 2; dj++)
      for (let di = 0; di < 2; di++) {
        const L = this.L + 1, x = 2 * this.x + di, y = 2 * this.y + dj;
        if (!exists(L, x, y)) continue;
        const k = key(L, x, y);
        if (!nodes.has(k)) nodes.set(k, new Node(L, x, y, this));
        const n = nodes.get(k);
        n.bit = di + 2 * dj;
        this.kids.push(n);
      }
    return this.kids;
  }
}

// ---------------- terrain tile decoding ----------------
async function inflate(buf) {
  const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function decodeTerrain(buf) {
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'WTH1') throw new Error('kein WTH1');
  const n = dv.getUint16(4, true), flags = dv.getUint16(6, true), base = dv.getInt32(8, true);
  const hmin = dv.getFloat32(12, true), hmax = dv.getFloat32(16, true);
  const raw = await inflate(buf.slice(20));
  const r = new Int32Array(n * n);
  if (flags & 1) r.set(new Int32Array(raw.buffer, raw.byteOffset, n * n));
  else
    for (let k = 0; k < n * n; k++) {
      const zz = raw[k] | (raw[n * n + k] << 8);
      r[k] = (zz >>> 1) ^ -(zz & 1);
    }
  const q = new Float32Array(n * n);
  q[0] = base;
  for (let i = 1; i < n; i++) q[i] = q[i - 1] + r[i];
  for (let j = 1; j < n; j++) {
    const o = j * n;
    q[o] = q[o - n] + r[o];
    for (let i = 1; i < n; i++) q[o + i] = r[o + i] + q[o - n + i] + q[o + i - 1] - q[o - n + i - 1];
  }
  for (let k = 0; k < n * n; k++) q[k] *= 0.01;
  return { n, h: q, hmin, hmax };
}
// grid mesh with skirts; stride 2 on the coarser levels (51 x 51)
function terrainGeometry(t, s, L) {
  const st = L >= LMAX ? 1 : 2;
  const n = Math.floor((t.n - 1) / st) + 1;
  const d = s / (n - 1);
  const H = (i, j) => t.h[j * st * t.n + i * st];
  const skirt = 1.5 + s / 50;
  const nv = n * n + 4 * n;
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const h = H(i, j);
      pos.set([i * d, h, -j * d], k * 3);
      const hx = (H(Math.min(i + 1, n - 1), j) - H(Math.max(i - 1, 0), j)) / ((Math.min(i + 1, n - 1) - Math.max(i - 1, 0)) * d);
      const hy = (H(i, Math.min(j + 1, n - 1)) - H(i, Math.max(j - 1, 0))) / ((Math.min(j + 1, n - 1) - Math.max(j - 1, 0)) * d);
      // scene normal: x east, y up, z south -> (-dh/dx, 1, +dh/dN)
      const l = Math.hypot(hx, 1, hy);
      nrm.set([-hx / l, 1 / l, hy / l], k * 3);
      uv.set([i / (n - 1), j / (n - 1)], k * 2);
    }
  const idx = [];
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n + 1, e = a + n;
      // seen from above (+y) counter-clockwise: x east, z = -north
      idx.push(a, b, c, a, c, e);
    }
  // skirts: the edge ring copied down; edges south (j=0), east (i=n-1), north (j=n-1), west (i=0)
  let v = n * n;
  const edges = [
    [...Array(n).keys()].map(i => [i, 0]),
    [...Array(n).keys()].map(j => [n - 1, j]),
    [...Array(n).keys()].map(i => [n - 1 - i, n - 1]),
    [...Array(n).keys()].map(j => [0, n - 1 - j]),
  ];
  for (const e of edges) {
    const start = v;
    for (const [i, j] of e) {
      const k = j * n + i;
      pos.set([pos[k * 3], pos[k * 3 + 1] - skirt, pos[k * 3 + 2]], v * 3);
      nrm.set(nrm.subarray(k * 3, k * 3 + 3), v * 3);
      uv.set(uv.subarray(k * 2, k * 2 + 2), v * 2);
      v++;
    }
    for (let m = 0; m < n - 1; m++) {
      const [i0, j0] = e[m], [i1, j1] = e[m + 1];
      const a = j0 * n + i0, b = j1 * n + i1, c = start + m + 1, d2 = start + m;
      idx.push(a, d2, c, a, c, b); // walk counter-clockwise around the tile: the skirt faces outwards
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  return g;
}
async function loadImage(url) {
  const blob = await get(url, 'blob');
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  try {
    await img.decode();
  } finally {
    setTimeout(() => URL.revokeObjectURL(img.src), 1000);
  }
  return img;
}
const GREY = new THREE.DataTexture(new Uint8Array([140, 140, 130, 255]), 1, 1);
GREY.needsUpdate = true;
let maxAniso = 1;

async function loadNode(node) {
  const T = META.tiling;
  const tu = BASE + T.terrain.replace('{z}', node.L).replace('{x}', node.x).replace('{y}', node.y);
  const iu = BASE + T.image.replace('{z}', node.L).replace('{x}', node.x).replace('{y}', node.y);
  const [tb, img] = await Promise.all([get(tu), loadImage(iu).catch(e => (fail('Luftbild', e), null))]);
  const t = await decodeTerrain(tb);
  const geo = terrainGeometry(t, node.size, node.L);
  let tex = GREY;
  if (img) {
    tex = new THREE.Texture(img);
    tex.anisotropy = maxAniso;
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    node.texBytes = Math.round(img.naturalWidth * img.naturalHeight * 4 * 1.333);
    ST.texBytes += node.texBytes;
  }
  const mesh = new THREE.Mesh(geo, terrainMaterial(tex));
  mesh.position.copy(toScene(node.e0, node.n0, 0));
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.frustumCulled = false;
  mesh.visible = false;
  node.mesh = mesh;
  node.tris = geo.index.count / 3;
  const p0 = toScene(node.e0, node.n0, t.hmin - 1.5 - node.size / 50 - 40);
  const p1 = toScene(node.e0 + node.size, node.n0 + node.size, t.hmax + 2);
  node.box.set(p0.clone().min(p1), p0.clone().max(p1));
  scene.add(mesh);
}
function unloadNode(node) {
  if (!node.mesh) return;
  scene.remove(node.mesh);
  node.mesh.geometry.dispose();
  const tex = node.mesh.material.uniforms.map.value;
  if (tex !== GREY) tex.dispose();
  node.mesh.material.dispose();
  ST.texBytes -= node.texBytes || 0;
  node.texBytes = 0;
  node.mesh = null;
  node.state = 0;
  ST.tilesReady--;
}

// ---------------- request queue ----------------
const want = new Map(); // node -> priority (distance)
let active = 0;
function request(node, prio) {
  if (node.state === 0) want.set(node, Math.min(prio, want.has(node) ? want.get(node) : Infinity));
}
function pump() {
  if (active >= MAX_REQ || !want.size) return;
  const list = [...want.entries()].sort((a, b) => a[1] - b[1]);
  for (const [node] of list) {
    if (active >= MAX_REQ) break;
    want.delete(node);
    if (node.state !== 0) continue;
    node.state = 1;
    active++;
    loadNode(node)
      .then(() => {
        node.state = 2;
        ST.tilesReady++;
      })
      .catch(e => {
        node.state = 3;
        ST.failed++;
        fail(`Kachel ${key(node.L, node.x, node.y)}`, e);
      })
      .finally(() => {
        active--;
        pump();
      });
  }
}

// ---------------- selection ----------------
const frustum = new THREE.Frustum();
const pm = new THREE.Matrix4();
let frameNo = 0;
let drawn = [];
function select() {
  frameNo++;
  pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(pm);
  const cam = camera.position;
  const out = [];
  want.clear();
  const visit = node => {
    if (!frustum.intersectsBox(node.box)) return;
    node.used = frameNo;
    const d = node.box.distanceToPoint(cam);
    if (node.state !== 2) {
      request(node, d / node.size);
      return;
    }
    if (d < LOD * node.size && node.L < LMAX) {
      const kids = node.children().filter(k => k.state !== 3);
      if (kids.length) {
        const vis = kids.filter(k => frustum.intersectsBox(k.box));
        let ready = true;
        for (const k of vis) if (k.state !== 2) (ready = false), request(k, k.box.distanceToPoint(cam) / k.size);
        if (ready) {
          let mask = 0;
          for (const k of kids) mask |= 1 << k.bit;
          for (const k of vis) visit(k);
          if (mask !== 15) out.push([node, mask]);
          return;
        }
      }
    }
    out.push([node, 0]);
  };
  for (const r of roots) visit(r);
  for (const [n] of drawn) if (n.mesh) n.mesh.visible = false;
  for (const [n, mask] of out) {
    n.mesh.visible = true;
    n.mesh.material.uniforms.uMask.value = mask;
  }
  drawn = out;
  pump();
  // evict least recently used tiles beyond the budget
  if (ST.tilesReady > MAX_TILES) {
    const ready = [...nodes.values()].filter(n => n.state === 2 && n.used < frameNo).sort((a, b) => a.used - b.used);
    for (const n of ready.slice(0, ST.tilesReady - MAX_TILES)) unloadNode(n);
  }
}

// ---------------- trees: int16 x, z, ground, height, radius, type (dm) per tree ----------------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function treeGroup(a) {
  const n = a.length / 6;
  const g = new THREE.Group();
  for (const type of [0, 1]) {
    let cnt = 0;
    for (let i = 0; i < n; i++) if (a[i * 6 + 5] === type) cnt++;
    if (!cnt) continue;
    const im = new THREE.InstancedMesh(TREE_GEO[type], MAT.trees, cnt);
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (a[i * 6 + 5] !== type) continue;
      const x = a[i * 6] / 10, z = a[i * 6 + 1] / 10, y = a[i * 6 + 2] / 10, h = a[i * 6 + 3] / 10, r = a[i * 6 + 4] / 10;
      if (type === 0) {
        _p.set(x, y + 0.12 * h, z);
        _s.set(r, 0.88 * h, r);
      } else {
        _p.set(x, y + 0.3 * h, z);
        _s.set(r, 0.36 * h, r);
      }
      _m.compose(_p, _q, _s);
      im.setMatrixAt(k, _m);
      const v = ((i * 2654435761) >>> 0) / 4294967296;
      // sRGB picks: dark spruce green, lighter broadleaf green
      if (type === 0) _c.setRGB(0.16 + 0.06 * v, 0.27 + 0.08 * v, 0.17, THREE.SRGBColorSpace);
      else _c.setRGB(0.3 + 0.1 * v, 0.4 + 0.1 * v, 0.18, THREE.SRGBColorSpace);
      im.setColorAt(k, _c);
      k++;
    }
    im.frustumCulled = false;
    g.add(im);
  }
  return g;
}

// ---------------- roads and buildings (level-9 tiles) ----------------
const loader = new GLTFLoader();
const content = new Map(); // 'roads/x_y' -> {state, group, centre}
function updateContent() {
  const C = META.content;
  for (const [kind, list, range] of [
    ['roads', C.roads_tiles, 1500],
    ['buildings', C.buildings_tiles, 2500],
    ['trees', C.trees_tiles || [], TREE_RANGE],
  ]) {
    for (const k of list) {
      const id = kind + '/' + k;
      let c = content.get(id);
      if (!c) {
        const [x, y] = k.split('_').map(Number);
        const [e0, n0, s] = tileBounds(C.level, x, y);
        c = { state: 0, centre: toScene(e0 + s / 2, n0 + s / 2, 0), s };
        content.set(id, c);
      }
      const dx = Math.max(Math.abs(camera.position.x - c.centre.x) - c.s / 2, 0);
      const dz = Math.max(Math.abs(camera.position.z - c.centre.z) - c.s / 2, 0);
      const near = Math.hypot(dx, dz, Math.max(camera.position.y - 200, 0)) < range;
      if (near && c.state === 0) {
        c.state = 1;
        const url = BASE + C[kind].replace('{z}', C.level).replace('{x}', k.split('_')[0]).replace('{y}', k.split('_')[1]);
        get(url)
          .then(buf => {
            ST.contentBytes += buf.byteLength;
            if (kind === 'trees') {
              c.group = treeGroup(new Int16Array(buf));
              c.group.position.copy(c.centre);
              c.group.position.y = 0;
              scene.add(c.group);
              c.state = 2;
              return;
            }
            loader.parse(
              buf,
              '',
              g => {
                g.scene.traverse(o => {
                  if (o.isMesh) {
                    o.material = kind === 'roads' && /mark/.test(o.name) ? MAT.marks : kind === 'roads' && /bruecke/.test(o.name) ? MAT.bridge : MAT[kind];
                    o.frustumCulled = false;
                  }
                });
                g.scene.position.copy(c.centre);
                g.scene.position.y = 0;
                c.group = g.scene;
                scene.add(g.scene);
                c.state = 2;
              },
              e => ((c.state = 3), fail(id, e)),
            );
          })
          .catch(e => ((c.state = 3), fail(id, e)));
      }
      if (c.group) c.group.visible = near;
    }
  }
}

// ---------------- controls: orbit, fly, drive ----------------
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.maxDistance = 40000;
orbit.minDistance = 5;
orbit.maxPolarAngle = Math.PI * 0.495;
let mode = 'orbit';
const keys = new Set();
addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'Space' && mode === 'drive') drive.paused = !drive.paused;
});
addEventListener('keyup', e => keys.delete(e.code));
const fly = { yaw: 0, pitch: -0.3, drag: null };
canvas.addEventListener('pointerdown', e => mode === 'fly' && (fly.drag = [e.clientX, e.clientY]));
addEventListener('pointerup', () => (fly.drag = null));
addEventListener('pointermove', e => {
  if (mode !== 'fly' || !fly.drag) return;
  fly.yaw -= (e.clientX - fly.drag[0]) * 0.004;
  fly.pitch = Math.max(-1.5, Math.min(1.5, fly.pitch - (e.clientY - fly.drag[1]) * 0.004));
  fly.drag = [e.clientX, e.clientY];
});
const drive = { route: null, s: 0, speed: 50 / 3.6, paused: false, cum: null };
function setMode(m) {
  mode = m;
  for (const b of ['orbit', 'fly', 'drive']) $('m-' + b).classList.toggle('on', b === m);
  orbit.enabled = m === 'orbit';
  $('drive').style.display = m === 'drive' ? 'flex' : 'none';
  if (m === 'fly') {
    const d = new THREE.Vector3();
    camera.getWorldDirection(d);
    fly.yaw = Math.atan2(-d.x, -d.z);
    fly.pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
  }
  if (m === 'orbit') {
    const d = new THREE.Vector3();
    camera.getWorldDirection(d);
    orbit.target.copy(camera.position).addScaledVector(d, Math.max(50, camera.position.y - groundAt(camera.position)));
  }
  if (m === 'drive') startRoute($('route').value);
}
function routePoint(r, s) {
  const c = r.cum;
  s = Math.max(0, Math.min(c[c.length - 1], s));
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (c[m] <= s) lo = m;
    else hi = m;
  }
  const f = (s - c[lo]) / Math.max(c[hi] - c[lo], 1e-6);
  return r.v[lo].clone().lerp(r.v[hi], f);
}
let ROUTES = [];
function startRoute(i) {
  const r = ROUTES[+i || 0];
  if (!r) return;
  drive.route = r;
  drive.s = 0;
  drive.paused = false;
}
function groundAt(p) {
  // height of the drawn terrain below p (ray), fallback: last known
  const rc = new THREE.Raycaster(new THREE.Vector3(p.x, 5000, p.z), new THREE.Vector3(0, -1, 0));
  const hits = rc.intersectObjects(drawn.map(d => d[0].mesh), false);
  return hits.length ? hits[0].point.y : 0;
}
const tmp = new THREE.Vector3();
function updateControls(dt) {
  if (mode === 'orbit') orbit.update();
  else if (mode === 'fly') {
    const h = Math.max(5, camera.position.y - groundAt(camera.position));
    const v = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4 : 1) * Math.max(15, h * 0.8) * dt;
    const f = new THREE.Vector3(-Math.sin(fly.yaw), 0, -Math.cos(fly.yaw));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    if (keys.has('KeyW') || keys.has('ArrowUp')) camera.position.addScaledVector(f, v);
    if (keys.has('KeyS') || keys.has('ArrowDown')) camera.position.addScaledVector(f, -v);
    if (keys.has('KeyD') || keys.has('ArrowRight')) camera.position.addScaledVector(r, v);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) camera.position.addScaledVector(r, -v);
    if (keys.has('KeyE')) camera.position.y += v;
    if (keys.has('KeyQ')) camera.position.y -= v;
    camera.rotation.set(fly.pitch, fly.yaw, 0, 'YXZ');
  } else if (mode === 'drive' && drive.route) {
    const r = drive.route;
    if (!drive.paused) drive.s += drive.speed * dt;
    const L = r.cum[r.cum.length - 1];
    if (drive.s > L) drive.s = 0;
    const p = routePoint(r, drive.s), a = routePoint(r, drive.s + 2), b = routePoint(r, drive.s + 30);
    const dir = a.clone().sub(p).setY(0).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    // right-hand traffic: eye 1.7 m right of the axis, 1.25 m above the road
    camera.position.copy(p).addScaledVector(right, 1.7);
    camera.position.y += 1.25;
    tmp.copy(b).addScaledVector(right, 1.7);
    tmp.y += 1.0;
    camera.lookAt(tmp);
    const g = ((routePoint(r, drive.s + 10).y - routePoint(r, drive.s - 10).y) / 20) * 100;
    const mk = META.roads && META.roads.metric && META.roads.metric[r.kind];
    $('grade').textContent =
      `Steigung ${g.toFixed(1)} % · ${(drive.s / 1000).toFixed(2)} / ${(L / 1000).toFixed(2)} km` +
      (mk ? ` · Wellen/km ${mk.wellen_je_km} (vorher ${mk.wellen_je_km_vorher})` : '');
  }
}

// ---------------- places ----------------
function place(name) {
  const A = META.tiling.areas;
  const at = (E, N, h, dx, dz, H) => {
    setMode('orbit');
    const t = toScene(E, N, 0);
    t.y = h === null ? groundAt(t) : h;
    orbit.target.copy(t);
    camera.position.set(t.x + dx, t.y + H, t.z + dz);
  };
  if (name === 'garten') at(O.E, O.N, null, 120, 160, 90);
  if (name === 'dorf') at(625790, 5595400, null, 260, 320, 180);
  if (name === 'talsperre') at(627070, 5594370, null, 600, 700, 420);
  if (name === 'schleusingen') at(624270, 5596780, null, 700, 900, 520);
  if (name === 'ueberblick') {
    const c = [(A.block[0] + A.block[2]) / 2, (A.block[1] + A.block[3]) / 2];
    at(c[0], c[1], 0, 2600, 3600, 2900);
  }
}

// ---------------- HUD ----------------
let fpsN = 0, fpsT = performance.now(), fps = 0;
const mb = b => (b / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
function hud() {
  let tris = 0;
  for (const [n] of drawn) tris += n.tris || 0;
  ST.trisTerrain = tris;
  ST.drawn = drawn.length;
  $('stats').textContent =
    `Kacheln ${ST.tilesReady} (sichtbar ${drawn.length}) · geladen ${mb(ST.bytes)} MB · Texturen ${mb(ST.texBytes)} MB · ` +
    `Gelände ${(tris / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio. Dreiecke · ${fps} fps`;
}

// ---------------- place names (names.json) as HTML labels ----------------
let NAMES = [];
const labRoot = document.createElement('div');
labRoot.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
document.body.appendChild(labRoot);
const RANGE = { town: 15000, village: 7000, suburb: 5000, hamlet: 3500, isolated_dwelling: 1500, locality: 2000, peak: 6000 };
const v3 = new THREE.Vector3();
function updateLabels() {
  for (const n of NAMES) {
    v3.copy(n.p);
    const d = v3.distanceTo(camera.position);
    let show = d < (RANGE[n.kind] || 3000) && d > 30;
    if (show) {
      v3.y -= (Math.pow(v3.x - camera.position.x, 2) + Math.pow(v3.z - camera.position.z, 2)) * CURV;
      v3.project(camera);
      show = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
    }
    n.el.style.display = show ? 'block' : 'none';
    if (show) n.el.style.transform = `translate(${((v3.x + 1) / 2) * innerWidth}px, ${((1 - v3.y) / 2) * innerHeight}px) translate(-50%, -100%)`;
  }
}

// ---------------- start ----------------
let roots = [];
async function start() {
  META = await get(BASE + 'meta.json', 'json');
  O = META.origin;
  LV = META.tiling.levels;
  const ls = Object.keys(LV).map(Number).sort((a, b) => a - b);
  LMIN = ls[0];
  LMAX = ls[ls.length - 1];
  const r = LV[LMIN].rect;
  for (let y = r[1]; y <= r[3]; y++)
    for (let x = r[0]; x <= r[2]; x++) {
      const n = new Node(LMIN, x, y, null);
      nodes.set(key(LMIN, x, y), n);
      roots.push(n);
    }
  maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  $('attr').innerHTML = META.attribution.replace(/&/g, '&amp;') + ' · <a href="' + BASE + 'ATTRIBUTION.md" target="_blank" rel="noopener">Quellen</a>';
  $('src').textContent = 'Gelände: ' + META.sources.terrain;
  try {
    const rj = await get(BASE + META.content.routes, 'json').catch(() => null);
    ROUTES = (rj ? rj.routes : []).map(r => {
      const v = r.pts.map(p => toScene(p[0], p[1], p[2] - META.H0));
      const cum = [0];
      for (let i = 1; i < v.length; i++) cum.push(cum[i - 1] + Math.hypot(v[i].x - v[i - 1].x, v[i].z - v[i - 1].z));
      return { ...r, v, cum };
    });
  } catch (e) {
    fail('Strecken', e);
  }
  if (META.content.names) {
    const nj = await get(BASE + META.content.names, 'json').catch(() => null);
    NAMES = (nj ? nj.names : []).map(n => {
      const el = document.createElement('div');
      el.textContent = n.name;
      const big = n.kind === 'town' || n.kind === 'village';
      el.style.cssText = `position:absolute;left:0;top:0;white-space:nowrap;color:#fff;font:${big ? 650 : 500} ${big ? 14 : 12}px system-ui,sans-serif;` +
        'text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 2px #000;display:none';
      labRoot.appendChild(el);
      return { ...n, el, p: toScene(n.E, n.N, n.H - META.H0 + (n.kind === 'peak' ? 8 : 25)) };
    });
  }
  $('route').innerHTML = ROUTES.map((r, i) => `<option value="${i}">${r.name} (${(r.length_m / 1000).toFixed(1)} km)</option>`).join('');
  for (const m of ['orbit', 'fly', 'drive']) $('m-' + m).onclick = () => setMode(m);
  $('goto').onchange = e => e.target.value && (place(e.target.value), (e.target.value = ''));
  $('route').onchange = e => startRoute(e.target.value);
  $('speed').oninput = e => ((drive.speed = e.target.value / 3.6), ($('kmh').textContent = e.target.value + ' km/h'));
  $('pause').onclick = () => (drive.paused = !drive.paused);
  // first view: over the garden towards Ratscher and the reservoir
  const g0 = toScene(O.E, O.N, 0);
  orbit.target.set(g0.x + 500, 0, g0.z + 350);
  camera.position.set(g0.x - 900, 900, g0.z + 1700);
  orbit.update();
  if (Q.get('mode') === 'drive') setMode('drive');
  // ?ort=garten|dorf|talsperre|schleusingen|ueberblick: jump there once the first tiles stand (the ground height comes from them)
  if (Q.get('ort')) setTimeout(() => place(Q.get('ort')), 2500);
  requestAnimationFrame(loop);
}
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  updateControls(dt);
  // adaptive near plane: precision for the roads near the ground
  const hg = mode === 'drive' ? 1.25 : Math.max(1, camera.position.y - (drawn.length ? groundAtCached() : 0));
  camera.near = Math.min(50, Math.max(0.3, hg * 0.08));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  U.uCam.value.copy(camera.position);
  select();
  updateContent();
  if (frameNo % 2 === 0) updateLabels();
  renderer.render(scene, camera);
  if (!ST.firstFrameMs && drawn.length) ST.firstFrameMs = Math.round(performance.now() - ST.t0);
  fpsN++;
  if (now - fpsT > 1000) {
    fps = Math.round((fpsN * 1000) / (now - fpsT));
    fpsN = 0;
    fpsT = now;
    hud();
  }
}
let gCache = { t: 0, v: 0 };
function groundAtCached() {
  const t = performance.now();
  if (t - gCache.t > 400) gCache = { t, v: groundAt(camera.position) };
  return gCache.v;
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener('error', e => fail('Fehler', e.message));
addEventListener('unhandledrejection', e => fail('Promise', e.reason));

// test hooks (headless check in GitHub Actions)
window.WELT.stats = () => ({
  ...ST,
  errors: ST.errors.slice(),
  queue: want.size,
  active,
  drawn: drawn.length,
  contentLoaded: [...content.values()].filter(c => c.state === 2).length,
  renderer: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries },
  gl: (() => {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  })(),
});
window.WELT.idle = () => active === 0 && want.size === 0 && ST.tilesReady > 0 && ![...content.values()].some(c => c.state === 1);
window.WELT.setMode = setMode;
window.WELT.place = place;
window.WELT.routes = () => ROUTES.map(r => ({ name: r.name, kind: r.kind, length_m: r.length_m }));
window.WELT.drive = drive;
start()
  .then(() => (window.WELT.ready = true))
  .catch(e => {
    fail('Start', e);
    $('msg').style.display = 'block';
    $('msg').textContent = 'Die Welt-Kacheln konnten nicht geladen werden: ' + ((e && e.message) || e);
  });
