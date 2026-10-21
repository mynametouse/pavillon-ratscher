// Asset optimiser for Pavillon Ratscher (open source tools only: glTF-Transform, meshoptimizer, sharp).
//  models/*.glb  → <name>.glb.json (glTF JSON, meshopt-compressed geometry inlined) + <name>__<n>.webp (images as separate files, no base64)
//  grass/*.glb   → same
//  tex/*.jpg, tree/*.jpg|png → .webp
// Usage: node optimize_assets.mjs <assets dir> <viz3 dir>   (writes <viz3>/opt/...; skips files that are up to date)
import fs from 'node:fs'; import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, reorder, simplify, weld, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const [ASSETS, VIZ] = process.argv.slice(2);
const OPT = path.join(VIZ, 'opt'); for (const d of ['models', 'grass', 'tex', 'tree']) fs.mkdirSync(path.join(OPT, d), { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const fresh = (src, dst) => fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs;
// small ground plants are dense cards: halve their triangles (they are seen from a few metres at most)
const SIMPLIFY = { 'rubber_boots.glb': [0.12, 0.004], 'metal_jerrycan.glb': [0.3, 0.003], 'ladder_sectioned_01.glb': [0.35, 0.003], 'rusted_spade_01.glb': [0.4, 0.003], 'garden_hose_wall_mounted_01.glb': [0.4, 0.004], 'compost_bags.glb': [0.4, 0.004], 'plastic_crate_02.glb': [0.6, 0.003], 'grass_medium_01.glb': [0.32, 0.02], 'grass_medium_02.glb': [0.32, 0.02], 'dandelion_01.glb': [0.28, 0.02], 'fern_02.glb': [0.6, 0.006], 'flower_white.glb': [0.3, 0.02], 'flower_yellow.glb': [0.35, 0.02], 'flower_blue.glb': [0.35, 0.02] };
const PROPS = new Set(['Barrel_02.glb', 'rusted_spade_01.glb', 'plastic_crate_02.glb', 'old_tyre.glb', 'metal_jerrycan.glb', 'painted_wooden_bench.glb', 'rubber_boots.glb', 'garden_hose_wall_mounted_01.glb', 'compost_bags.glb', 'ladder_sectioned_01.glb', 'outdoor_table_chair_set_01.glb']);
let before = 0, after = 0;
async function model(src, outDir) {
  const base = path.basename(src), stem = base.replace(/\.glb$/, ''), dst = path.join(outDir, base + '.json');
  before += fs.statSync(src).size;
  if (fresh(src, dst)) { after += fs.statSync(dst).size; for (const f of fs.readdirSync(outDir)) if (f.startsWith(stem + '__')) after += fs.statSync(path.join(outDir, f)).size; return; }
  const doc = await io.read(src);
  await doc.transform(dedup(), prune());
  const tris = () => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ? p.getIndices().getCount() / 3 : 0), 0), 0); const t0 = tris();
  if (SIMPLIFY[base]) await doc.transform(weld({ tolerance: 0.0001 }), simplify({ simplifier: MeshoptSimplifier, ratio: SIMPLIFY[base][0], error: SIMPLIFY[base][1], lockBorder: false }));
  if (SIMPLIFY[base]) console.log('  simplify', base, t0, '→', tris());
  if (PROPS.has(base)) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82 }));   // small garden props: 512 px WebP is plenty
  await doc.transform(reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  // images become separate files next to the JSON
  doc.getRoot().listTextures().forEach((t, i) => { const ext = (t.getMimeType() || 'image/webp').split('/')[1].replace('jpeg', 'jpg'); t.setURI(`${stem}__${i}.${ext}`); });
  const { json, resources } = await io.writeJSON(doc, { format: 0 });
  for (const b of json.buffers || []) { const key = b.uri, r = resources[key]; if (r) { b.uri = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); delete resources[key]; } }
  for (const [k, v] of Object.entries(resources)) { if (k.startsWith('data:')) continue; if (/\.(webp|png|jpg)$/.test(k)) { fs.writeFileSync(path.join(outDir, k), v); after += v.byteLength; } }
  const txt = JSON.stringify(json); fs.writeFileSync(dst, txt); after += txt.length;
}
async function image(src, dst, q, alpha) {
  before += fs.statSync(src).size; if (fresh(src, dst)) { after += fs.statSync(dst).size; return; }
  await sharp(src).webp({ quality: q, alphaQuality: alpha ? 90 : 100, effort: 6, smartSubsample: true }).toFile(dst); after += fs.statSync(dst).size;
}
const used = new Set(JSON.parse(fs.readFileSync(path.join(VIZ, 'used_models.json'), 'utf8')));
for (const f of used) await model(path.join(ASSETS, 'models', f), path.join(OPT, 'models'));
for (const f of fs.readdirSync(path.join(VIZ, 'public', 'grass'))) if (f.endsWith('.glb')) await model(path.join(VIZ, 'public', 'grass', f), path.join(OPT, 'grass'));
const m0 = [before, after]; before = after = 0;
for (const f of fs.readdirSync(path.join(ASSETS, 'tex'))) { const m = f.match(/^(.*)_(col|nrm|orm)\.jpg$/); if (!m) continue; await image(path.join(ASSETS, 'tex', f), path.join(OPT, 'tex', f.replace('.jpg', '.webp')), m[2] === 'nrm' ? 90 : m[2] === 'orm' ? 85 : 84, false); }
for (const f of fs.readdirSync(path.join(VIZ, 'public', 'tree'))) { if (!/\.(jpg|png)$/.test(f)) continue; const png = f.endsWith('.png'); await image(path.join(VIZ, 'public', 'tree', f), path.join(OPT, 'tree', f.replace(/\.(jpg|png)$/, '.webp')), /normal/.test(f) ? 90 : 84, png); }
console.log('models', (m0[0] / 1e6).toFixed(2), '→', (m0[1] / 1e6).toFixed(2), 'MB;', 'textures', (before / 1e6).toFixed(2), '→', (after / 1e6).toFixed(2), 'MB');
