import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc = await io.read(process.argv[2]);
for (const m of doc.getRoot().listMaterials()) { const slots = []; for (const [k, t] of [['base', m.getBaseColorTexture()], ['nrm', m.getNormalTexture()], ['mr', m.getMetallicRoughnessTexture()], ['occ', m.getOcclusionTexture()], ['em', m.getEmissiveTexture()]]) if (t) { const md = await sharp(Buffer.from(t.getImage())).metadata(); slots.push(`${k}:${md.width}x${md.height}:${(t.getImage().byteLength / 1024) | 0}KB`); }
  const ext = [...m.listExtensions()].map(e => e.extensionName); console.log(m.getName(), '| alpha', m.getAlphaMode(), '| rough', m.getRoughnessFactor().toFixed(2), 'metal', m.getMetallicFactor().toFixed(2), '|', slots.join(' '), ext.join(','));
}
for (const me of doc.getRoot().listMeshes()) console.log('mesh', me.getName(), me.listPrimitives().map(p => (p.getIndices()?.getCount() / 3 | 0) + 't ' + p.getMaterial()?.getName()).join(', '));
