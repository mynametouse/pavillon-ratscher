// The villagers' textures (feat/dorf): like texattach.mjs, but with a size per texture – the face sharp (head colour 1024 px), clothes,
// normal maps, hair cards and glasses smaller – so six people stay light on a phone. Rocketbox TGA → WebP, attached by material name.
// Usage: node vtex.mjs <in.glb> <texDir> <prefix e.g. m004> <out.glb>   (sizes: env HEAD, BODY, NRM, OPA; defaults 1024 512 512 512)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire((process.env.PAV_WORK || new URL('../..', import.meta.url).pathname) + '/gt/node_modules/');
const { NodeIO } = req('@gltf-transform/core');
const { ALL_EXTENSIONS } = req('@gltf-transform/extensions');
const { prune, dedup } = req('@gltf-transform/functions');
const { MeshoptEncoder } = req('meshoptimizer');
const sharp = req('sharp');
const [IN, TEXDIR, PFX, OUT] = process.argv.slice(2);
const SZ = { head: +(process.env.HEAD || 1024), body: +(process.env.BODY || 512), nrm: +(process.env.NRM || 512), opa: +(process.env.OPA || 512) };

function readTGA(file) {
  // uncompressed type-2 TGA, bottom-left origin: file row order == glTF image row order for unchanged FBX UVs (as texattach.mjs)
  const b = fs.readFileSync(file);
  const idlen = b[0],
    type = b[2],
    w = b.readUInt16LE(12),
    h = b.readUInt16LE(14),
    bpp = b[16],
    desc = b[17];
  if (type !== 2) throw new Error('only uncompressed TGA supported: ' + file);
  const ch = bpp / 8,
    off = 18 + idlen,
    out = Buffer.alloc(w * h * ch),
    topLeft = !!(desc & 0x20);
  for (let y = 0; y < h; y++) {
    const srcRow = topLeft ? h - 1 - y : y;
    for (let x = 0; x < w; x++) {
      const s = off + (srcRow * w + x) * ch,
        d = (y * w + x) * ch;
      out[d] = b[s + 2];
      out[d + 1] = b[s + 1];
      out[d + 2] = b[s];
      if (ch === 4) out[d + 3] = b[s + 3];
    }
  }
  return { w, h, ch, data: out };
}
async function webp(file, max, alpha) {
  const t = readTGA(file);
  let img = sharp(t.data, { raw: { width: t.w, height: t.h, channels: t.ch } }).resize(Math.min(max, t.w), Math.min(max, t.h));
  if (!alpha && t.ch === 4) img = img.removeAlpha();
  return await img.webp({ quality: 84, alphaQuality: 90 }).toBuffer();
}
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(IN);
const root = doc.getRoot();
doc.createExtension(ALL_EXTENSIONS.find(e => e.EXTENSION_NAME === 'EXT_texture_webp')).setRequired(true);
const T = async (name, max, alpha = false) => {
  const f = path.join(TEXDIR, `${PFX}_${name}.tga`);
  if (!fs.existsSync(f)) return null;
  return doc.createTexture(name).setMimeType('image/webp').setImage(await webp(f, max, alpha)).setURI(`${PFX}_${name}.webp`);
};
if (process.env.DROP) {
  const rx = new RegExp(process.env.DROP, 'i');
  for (const mesh of root.listMeshes())
    for (const pr of mesh.listPrimitives()) {
      const mt = pr.getMaterial();
      if (mt && rx.test(mt.getName())) {
        mesh.removePrimitive(pr);
        pr.dispose();
        console.log('dropped part', mt.getName());
      }
    }
}
for (const m of root.listMaterials()) {
  const n = m.getName();
  m.setMetallicFactor(0).setRoughnessFactor(0.8);
  if (/glasses/i.test(n)) {
    m.setBaseColorTexture(await T('glasses_opacity_color', SZ.opa / 2, true));
    m.setAlphaMode('MASK').setAlphaCutoff(0.3).setDoubleSided(true);
  } else if (/body/i.test(n)) {
    m.setBaseColorTexture(await T('body_color', SZ.body));
    m.setNormalTexture(await T('body_normal', SZ.nrm));
  } else if (/head/i.test(n)) {
    m.setBaseColorTexture(await T('head_color', SZ.head));
    m.setNormalTexture(await T('head_normal', SZ.nrm));
  } else if (/opacity/i.test(n)) {
    m.setBaseColorTexture(await T('opacity_color', SZ.opa, true));
    m.setAlphaMode('MASK').setAlphaCutoff(0.4).setDoubleSided(true);
  }
  console.log('material', n, m.getBaseColorTexture() ? 'textured' : 'NO TEXTURE');
}
await doc.transform(dedup(), prune());
await io.write(OUT, doc);
console.log('->', OUT, (fs.statSync(OUT).size / 1e6).toFixed(2), 'MB');
