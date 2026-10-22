#!/bin/bash
# The neighbours as Rocketbox figures (22.10.2026, Falko: realistic older men like the player figures):
#   Hubert = Assets/Avatars/Adults/Male_Adult_03 (m004), Ronald = Assets/Avatars/Professions/Gardener_Male_01 (m106)
# of https://github.com/microsoft/Microsoft-Rocketbox (MIT). Mesh with the Biped rig, 1024 px WebP textures, meshopt, images embedded →
# viz3/dist/chars/<name>_rb.json (charman keys hubert_rb, ronald_rb). They move with the player's clips (chars/pclips_m.json).
#   PAV_WORK=<work dir> bash tools/player/build_npc.sh          (the Rocketbox repo needs only these two avatar folders:
#   GIT_LFS_SKIP_SMUDGE=1 git clone --filter=blob:none --no-checkout --depth 1 https://github.com/microsoft/microsoft-rocketbox, then
#   git show HEAD:<file> for Export/<Avatar>.fbx and Textures/*.tga into $PAV_WORK/src/<Avatar>/)
set -e
H=$(cd "$(dirname "$0")/../.." && pwd); W=${PAV_WORK:?set PAV_WORK}
mkdir -p "$W/out" "$W/pack" && ln -sfn "$H/tools/gltf" "$W/gt"
(cd "$H/tools/player" && [ -d node_modules ] || npm install --no-audit --no-fund --silent)
(cd "$H/tools/gltf" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
for pair in hubert:Male_Adult_03:m004 ronald:Gardener_Male_01:m106; do
  IFS=: read -r n a p <<< "$pair"
  printf '{ "name": "%s", "avatar": "%s", "unitScale": 0.01, "fps": 24, "outDir": "%s", "rocketboxClips": [], "retarget": [] }' \
    "$n" "$W/src/$a/Export/$a.fbx" "$W/out" > "$W/cfg_$n.json"
  (cd "$H/tools/player" && node build_player.mjs "$W/cfg_$n.json")                                   # mesh + Biped rig, no clips
  (cd "$H/tools/player" && PAV_WORK=$W node texattach.mjs "$W/out/${n}_mesh.glb" "$W/src/$a/Textures" "$p" "$W/out/${n}_tex.glb" 1024 0)
  (cd "$H/tools/gltf" && node chars.mjs "$W/out/${n}_tex.glb" "$W/pack" "$n" 1024 0 0 1)             # meshopt, WebP, glTF JSON
  python3 - "$W/pack" "$n" "$H/viz3/dist/chars/${n}_rb.json" <<'PY'
import json, base64, sys
d, n, out = sys.argv[1:]
g = json.load(open(f'{d}/{n}.json'))
for im in g.get('images', []):   # the images go into the JSON (data URIs), like the player figures
    u = im.get('uri', '')
    if u and not u.startswith('data:'):
        im['uri'] = 'data:image/webp;base64,' + base64.b64encode(open(f'{d}/{u}', 'rb').read()).decode(); im['mimeType'] = 'image/webp'
open(out, 'w').write(json.dumps(g, separators=(',', ':'))); print(out)
PY
done
