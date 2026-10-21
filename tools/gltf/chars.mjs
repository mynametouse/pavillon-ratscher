// Character/animal optimiser: spec-gloss → metal-rough, textures → WebP (resized), optional simplification, meshopt, glTF JSON + separate images.
// Usage: node chars.mjs <src.glb> <outDir> <name> [maxTex=1024] [simplifyRatio=0] [keepAnims=1] [quant=1]
import fs from 'node:fs'; import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, reorder, simplify, weld, metalRough, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const [SRC, OUT, NAME, MAXT = '1024', SIMP = '0', KEEPA = '1', QUANT = '1'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(SRC);
const tris = () => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ? p.getIndices().getCount() / 3 : p.getAttribute('POSITION').getCount() / 3), 0), 0);
const t0 = tris();
await doc.transform(metalRough());
const DROP = process.env.DROP ? new RegExp(process.env.DROP, 'i') : null;   // meshes whose material matches are removed (hidden teeth, tongue, toenails)
if (DROP) for (const me of doc.getRoot().listMeshes()) for (const pr of me.listPrimitives()) { const m = pr.getMaterial(); if (m && DROP.test(m.getName())) { me.removePrimitive(pr); pr.dispose(); } }
if (KEEPA === '0') for (const a of doc.getRoot().listAnimations()) a.dispose();
await doc.transform(dedup(), prune({ keepLeaves: true }), resample());
if (+SIMP > 0) await doc.transform(weld({ tolerance: 0.0001 }), simplify({ simplifier: MeshoptSimplifier, ratio: +SIMP, error: 0.004, lockBorder: true }));
if (process.env.SMALL) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /normal|metallicRoughness|occlusion/, resize: [+process.env.SMALL, +process.env.SMALL], quality: 86 }));
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+MAXT, +MAXT], quality: 84 }));
await doc.transform(reorder({ encoder: MeshoptEncoder }));
if (QUANT === '1') await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
doc.getRoot().listTextures().forEach((t, i) => { const ext = (t.getMimeType() || 'image/webp').split('/')[1].replace('jpeg', 'jpg'); t.setURI(`${NAME}__${i}.${ext}`); });
const { json, resources } = await io.writeJSON(doc, { format: 0 });
let imgB = 0;
for (const b of json.buffers || []) { const key = b.uri, r = resources[key]; if (r) { b.uri = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); delete resources[key]; } }
for (const [k, v] of Object.entries(resources)) { if (k.startsWith('data:')) continue; if (/\.(webp|png|jpg)$/.test(k)) { fs.writeFileSync(path.join(OUT, k), v); imgB += v.byteLength; } }
const txt = JSON.stringify(json); fs.writeFileSync(path.join(OUT, NAME + '.json'), txt);
console.log(NAME, 'tris', t0, '→', tris(), '| json', (txt.length / 1e6).toFixed(2), 'MB | images', (imgB / 1e6).toFixed(2), 'MB | anims', (json.animations || []).map(a => a.name + ':' + a.channels.length).join(','), '| mats', (json.materials || []).length, '| tex', (json.images || []).length);
