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

const cache={};
const T=(f,srgb=true)=>{ if(!cache[f]) cache[f]=loadTexture(BASE+f,srgb); return cache[f]; };
const textures = {
  bark: new Proxy({}, { get:(o,t)=>({ get ao(){return T(t+'_ao_1k.jpg',false);}, get color(){return T(t+'_color_1k.jpg');}, get normal(){return T(t+'_normal_1k.jpg',false);}, get roughness(){return T(t+'_roughness_1k.jpg',false);} }) }),
  leaves: new Proxy({}, { get:(o,t)=>T(t+'_color.png') })
};
