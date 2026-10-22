// Poly Haven glTF → simplified GLB for the asset originals (V16c forest floor: deadwood, branches, moss).
// Usage: node simplify_one.mjs <in.gltf> <out.glb> <ratio> <error> [texture px]
// ratio/error as in meshoptimizer's simplify (ratio = share of triangles to keep, error = allowed deviation relative to the model size).
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, getBounds } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer'; import sharp from 'sharp';
await MeshoptSimplifier.ready;
const [src, dst, ratio, error, px] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
const tris = () => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ? p.getIndices().getCount() / 3 : 0), 0), 0);
const t0 = tris();
await doc.transform(dedup(), prune(), weld({ tolerance: 0.0001 }), simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +error, lockBorder: false }), prune());
if (px) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [+px, +px], quality: 88 }));
const sc = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0]; const b = getBounds(sc);
await io.write(dst, doc);
console.log(JSON.stringify({ tris0: t0, tris: tris(), size: b.max.map((v, i) => +(v - b.min[i]).toFixed(3)), min: b.min.map(v => +v.toFixed(3)), max: b.max.map(v => +v.toFixed(3)), kb: Math.round(fs.statSync(dst).size / 1024) }));
