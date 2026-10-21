// Minimal shims so three.js loaders/exporters run in Node without a DOM.
// Textures are NOT decoded here (TextureLoader returns empty textures); images are handled separately.
import * as THREE from 'three';

THREE.TextureLoader.prototype.load = function (url, onLoad) {
  const t = new THREE.Texture();
  t.userData.sourceUrl = url;
  if (onLoad) setTimeout(() => onLoad(t), 0);
  return t;
};
THREE.ImageLoader.prototype.load = function (url, onLoad) { const img = { width: 1, height: 1, src: url }; if (onLoad) setTimeout(() => onLoad(img), 0); return img; };

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onload && this.onload({ target: this }); this.onloadend && this.onloadend({ target: this }); }); }
    readAsDataURL(blob) { blob.arrayBuffer().then((b) => { this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + Buffer.from(b).toString('base64'); this.onload && this.onload({ target: this }); this.onloadend && this.onloadend({ target: this }); }); }
  };
}
if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;
if (typeof globalThis.Image === 'undefined') {
  globalThis.Image = class { set src(v) { this._src = v; this.width = 1; this.height = 1; setTimeout(() => this.onload && this.onload(), 0); } get src() { return this._src; } };
}
export { THREE };
