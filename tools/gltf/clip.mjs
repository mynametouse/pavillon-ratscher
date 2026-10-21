// Animation-only glTF: keeps the node hierarchy (skeleton) and the animations, drops meshes, skins and materials.
// Usage: node clip.mjs <src.glb> <out.json>
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, resample, dedup } from '@gltf-transform/functions';
const [SRC, OUT] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(SRC); const root = doc.getRoot();
for (const n of root.listNodes()) { n.setMesh(null); n.setSkin(null); }
for (const m of root.listMeshes()) m.dispose(); for (const s of root.listSkins()) s.dispose(); for (const m of root.listMaterials()) m.dispose(); for (const t of root.listTextures()) t.dispose();
await doc.transform(resample(), dedup(), prune({ keepLeaves: true }));
const { json, resources } = await io.writeJSON(doc, { format: 0 });
for (const b of json.buffers || []) { const r = resources[b.uri]; if (r) b.uri = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); }
fs.writeFileSync(OUT, JSON.stringify(json)); console.log(OUT, (fs.statSync(OUT).size / 1024).toFixed(0), 'KB', (json.animations || []).map(a => a.name + ':' + a.channels.length));
