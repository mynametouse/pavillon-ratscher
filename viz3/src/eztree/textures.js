import * as THREE from 'three';

// Textures are served as separate files next to the page (tree/...), loaded on first use.
const BASE=(globalThis.EZ_TREE_BASE||'tree/');
let textureLoader = null;   // created on first use, with the page's loading manager (so the loading screen waits for the tree textures)
const TL = () => textureLoader || (textureLoader = new THREE.TextureLoader(globalThis.EZ_TREE_MANAGER));

/**
 * Gets a bark texture for the specified bark type
 * @param {string} barkType 
 * @param {'ao' | 'color' | 'normal' | 'roughness'} fileType 
 * @param {THREE.Vector2} scale 
 * @returns 
 */
export function getBarkTexture(barkType, fileType, scale = { x: 1, y: 1 }) {
  const texture = textures.bark[barkType][fileType];
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.x = scale.x;
  texture.repeat.y = 1 / scale.y;
  return texture;
}

/**
 * Gets the leaf texture for the specified leaf type
 * @param {string} leafType 
 * @returns 
 */
export function getLeafTexture(leafType) {
  return textures.leaves[leafType];
}

/**
 * 
 * @param {string} url Path to texture
 * @param {THREE.Vector2} scale Scale of the texture repeat
 * @param {boolean} srgb Set to true to set texture color space to SRGB
 * @returns {THREE.Texture}
 */
const loadTexture = (url, srgb = true) => {
  const texture = TL().load(url);
  texture.premultiplyAlpha = true;
  if (srgb) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  return texture;
};

// feat/fotorealismus (foto-baeume): the aspen's leaf picture shows the gold of October – whatever is drawn with it (aspen, birch, the
// hedge's bushes) stood orange-yellow among the green in June. getSummerLeafTexture() gives the same leaves in summer: the picture
// turned once, when it has loaded, by a matrix on its linear colours (rows for red, green, blue) – a matt, slightly grey green as an
// aspen's leaf has it (mean 0.58 / 0.33 / 0.05 → 0.12 / 0.22 / 0.06, about the oak picture's), its light and dark and its veins kept.
// Leaf types without a matrix are summer pictures already: their own texture comes back.
const SUMMER = { aspen: [0.1, 0.2, 0.0, 0.16, 0.4, 0.0, 0.04, 0.09, 0.2] };
const summer = {};
export function summerColour(M, r, g, b) {
  return [M[0] * r + M[1] * g + M[2] * b, M[3] * r + M[4] * g + M[5] * b, M[6] * r + M[7] * g + M[8] * b];
}
function toSummer(tex, M) {
  const img = tex.image;
  if (!img || !img.width || typeof document === 'undefined') return;
  try {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height),
      p = d.data,
      lin = new Float32Array(256),
      enc = new Uint8Array(4097);
    for (let i = 0; i < 256; i++) lin[i] = i <= 10 ? i / 255 / 12.92 : Math.pow((i / 255 + 0.055) / 1.055, 2.4);
    for (let i = 0; i <= 4096; i++) {
      const v = i / 4096;
      enc[i] = Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
    }
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = lin[p[i]],
        gg = lin[p[i + 1]],
        b = lin[p[i + 2]];
      p[i] = enc[Math.min(4096, Math.round(4096 * (M[0] * r + M[1] * gg + M[2] * b)))];
      p[i + 1] = enc[Math.min(4096, Math.round(4096 * (M[3] * r + M[4] * gg + M[5] * b)))];
      p[i + 2] = enc[Math.min(4096, Math.round(4096 * (M[6] * r + M[7] * gg + M[8] * b)))];
    }
    g.putImageData(d, 0, 0);
    tex.image = c;
    tex.needsUpdate = true;
  } catch (e) {
    console.warn('summer leaves', e);
  }
}
export function getSummerLeafTexture(leafType) {
  const M = SUMMER[leafType];
  if (!M) return getLeafTexture(leafType);
  if (!summer[leafType]) {
    const tex = TL().load(BASE + leafType + '_color.png', t => toSummer(t, M));
    tex.premultiplyAlpha = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.name = leafType + ' summer';
    summer[leafType] = tex;
  }
  return summer[leafType];
}

const cache={};
const T=(f,srgb=true)=>{ if(!cache[f]) cache[f]=loadTexture(BASE+f,srgb); return cache[f]; };
const textures = {
  bark: new Proxy({}, { get:(o,t)=>({ get ao(){return T(t+'_ao_1k.jpg',false);}, get color(){return T(t+'_color_1k.jpg');}, get normal(){return T(t+'_normal_1k.jpg',false);}, get roughness(){return T(t+'_roughness_1k.jpg',false);} }) }),
  leaves: new Proxy({}, { get:(o,t)=>T(t+'_color.png') })
};
