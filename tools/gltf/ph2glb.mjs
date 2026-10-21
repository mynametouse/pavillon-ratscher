// Poly Haven glTF → GLB in assets/models + bounds (for the models manifest). Usage: node ph2glb.mjs <in.gltf> <out.glb>
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { dedup, prune, getBounds } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]); await doc.transform(dedup(), prune());
const sc = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0]; const b = getBounds(sc);
await io.write(process.argv[3], doc);
const tris = doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ? p.getIndices().getCount() / 3 : 0), 0), 0);
console.log(JSON.stringify({ size: b.max.map((v, i) => +(v - b.min[i]).toFixed(3)), min: b.min.map(v => +v.toFixed(3)), tris, kb: Math.round(fs.statSync(process.argv[3]).size / 1024) }));
