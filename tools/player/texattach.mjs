// Attach Rocketbox TGA textures (converted to WebP) to the PoC GLB, drop non-root translation tracks, resample keys.
// Usage: node texattach.mjs <in.glb> <texDir> <prefix e.g. m106> <out.glb> [maxTex=1024] [meshopt=0]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire((process.env.PAV_WORK || new URL('../..', import.meta.url).pathname) + '/gt/node_modules/');
const { NodeIO } = req('@gltf-transform/core');
const { ALL_EXTENSIONS } = req('@gltf-transform/extensions');
const { resample, prune, dedup, meshopt } = req('@gltf-transform/functions');
const { MeshoptEncoder } = req('meshoptimizer');
const sharp = req('sharp');
const [IN, TEXDIR, PFX, OUT, MAXT = '1024', MOPT = '0'] = process.argv.slice(2);

function readTGA(file) { // uncompressed type-2 TGA, bottom-left origin: file row order == glTF image row order for unchanged FBX UVs
  const b = fs.readFileSync(file);
  const idlen = b[0], type = b[2], w = b.readUInt16LE(12), h = b.readUInt16LE(14), bpp = b[16], desc = b[17];
  if (type !== 2) throw new Error('only uncompressed TGA supported: ' + file);
  const ch = bpp / 8, off = 18 + idlen; const out = Buffer.alloc(w * h * ch);
  const topLeft = !!(desc & 0x20);
  for (let y = 0; y < h; y++) {
    const srcRow = topLeft ? (h - 1 - y) : y; // keep file order for bottom-left (see note above)
    for (let x = 0; x < w; x++) {
      const s = off + (srcRow * w + x) * ch, d = (y * w + x) * ch;
      out[d] = b[s + 2]; out[d + 1] = b[s + 1]; out[d + 2] = b[s]; if (ch === 4) out[d + 3] = b[s + 3];
    }
  }
  return { w, h, ch, data: out };
}
async function webp(file, max, alpha) {
  const t = readTGA(file);
  let img = sharp(t.data, { raw: { width: t.w, height: t.h, channels: t.ch } }).resize(+max, +max);
  if (!alpha && t.ch === 4) img = img.removeAlpha();
  return await img.webp({ quality: 85, alphaQuality: 90 }).toBuffer();
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(IN);
const root = doc.getRoot();
doc.createExtension(ALL_EXTENSIONS.find((e) => e.EXTENSION_NAME === 'EXT_texture_webp')).setRequired(true);
const T = async (name, alpha = false) => {
  const f = path.join(TEXDIR, `${PFX}_${name}.tga`);
  if (!fs.existsSync(f)) return null;
  return doc.createTexture(name).setMimeType('image/webp').setImage(await webp(f, MAXT, alpha)).setURI(`${PFX}_${name}.webp`);
};
for (const m of root.listMaterials()) {
  const n = m.getName();
  m.setMetallicFactor(0).setRoughnessFactor(0.8);
  if (/body/i.test(n)) { m.setBaseColorTexture(await T('body_color')); m.setNormalTexture(await T('body_normal')); }
  else if (/head/i.test(n)) { m.setBaseColorTexture(await T('head_color')); m.setNormalTexture(await T('head_normal')); }
  else if (/opacity/i.test(n)) { m.setBaseColorTexture(await T('opacity_color', true)); m.setAlphaMode('MASK').setAlphaCutoff(0.4).setDoubleSided(true); }
}
// drop translation channels of non-root bones (keeps the avatar's own bone lengths), then resample
let dropped = 0;
for (const a of root.listAnimations()) for (const ch of a.listChannels()) {
  const node = ch.getTargetNode(); const p = ch.getTargetPath();
  if ((p === 'translation' && node && !/^Bip01$/.test(node.getName())) || p === 'scale') { const s = ch.getSampler(); ch.dispose(); if (s && !s.listParents().some((x) => x.propertyType === 'AnimationChannel')) s.dispose(); dropped++; }
}
await doc.transform(dedup(), resample({ tolerance: 1e-4 }), prune());
if (MOPT === '1') await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(OUT, doc);
console.log('dropped channels', dropped, '->', OUT, (fs.statSync(OUT).size / 1e6).toFixed(2), 'MB');
