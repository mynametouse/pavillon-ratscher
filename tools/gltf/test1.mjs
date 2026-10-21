import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, reorder, quantize, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const src = process.argv[2];
for (const mode of ['plain', 'meshopt-quant']) {
  const doc = await io.read(src);
  await doc.transform(dedup(), prune());
  const attrs = new Set(); for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) for (const s of p.listSemantics()) attrs.add(s);
  if (mode === 'meshopt-noquant') await doc.transform(reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 0, quantizeNormal: 0, quantizeTexcoord: 0 }));
  if (mode === 'meshopt-quant') await doc.transform(reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const { json, resources } = await io.writeJSON(doc, { format: 0 });
  let bin = 0, img = 0; for (const [k, v] of Object.entries(resources)) { if (/\.(png|jpe?g|webp)$/i.test(k)) img += v.byteLength; else bin += v.byteLength; }
  console.log(mode, 'attrs', [...attrs].join(','), 'bin', (bin / 1e6).toFixed(2), 'MB img', (img / 1e6).toFixed(2), 'MB', 'exts', (json.extensionsUsed || []).join(','));
}
