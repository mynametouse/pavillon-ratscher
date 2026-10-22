#!/bin/bash
# The neighbours as Rocketbox figures (https://github.com/microsoft/Microsoft-Rocketbox, MIT), moved by the player's clips (chars/pclips_m.json):
#   Hubert (Falko, 23.10.2026: about 70–75, dark hair, moustache, a light checked work shirt, work trousers, work shoes) =
#     Professions/Construction_Male_01 (m111) without helmet, visor and tool belt; hubert_tex.py takes off the grey full beard and gives him the
#     moustache of Professions/Medical_Male_03 (m153), and turns the jeans into grey-olive work trousers
#   Ronald (about 60) = Professions/Gardener_Male_01 (m106), without a hat (Falko: at most a flat cap, and only if it sits right)
# Mesh with the Biped rig, 1024 px WebP textures, meshopt, images embedded → viz3/dist/chars/<name>_rb.json (charman keys hubert_rb, ronald_rb).
#   PAV_WORK=<work dir> bash tools/player/build_npc.sh
# Sources in $PAV_WORK/src/<Avatar>/Export/<Avatar>.fbx and $PAV_WORK/src/<Avatar>/Textures/*.tga (for Medical_Male_03 only
# m153_head_color.tga); the Rocketbox repo needs only these folders: GIT_LFS_SKIP_SMUDGE=1 git clone --filter=blob:none --no-checkout
# --depth 1 https://github.com/microsoft/microsoft-rocketbox, then git show HEAD:Assets/Avatars/<…>/<file> > $PAV_WORK/src/<Avatar>/<…>.
set -e
H=$(cd "$(dirname "$0")/../.." && pwd); W=${PAV_WORK:?set PAV_WORK}
mkdir -p "$W/out" "$W/pack" && ln -sfn "$H/tools/gltf" "$W/gt"
(cd "$H/tools/player" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
(cd "$H/tools/gltf" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
build() {   # name avatar texture-prefix texture-dir [parts to drop]
  local n=$1 a=$2 p=$3 t=$4 drop=$5
  printf '{ "name": "%s", "avatar": "%s", "unitScale": 0.01, "fps": 24, "outDir": "%s", "rocketboxClips": [], "retarget": [] }' \
    "$n" "$W/src/$a/Export/$a.fbx" "$W/out" > "$W/cfg_$n.json"
  (cd "$H/tools/player" && node build_player.mjs "$W/cfg_$n.json")                                   # mesh + Biped rig, no clips
  (cd "$H/tools/player" && DROP=$drop PAV_WORK=$W node texattach.mjs "$W/out/${n}_mesh.glb" "$t" "$p" "$W/out/${n}_tex.glb" 1024 0)
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
}
T="$W/tex_hubert"; mkdir -p "$T"; cp "$W/src/Construction_Male_01/Textures/"m111_*.tga "$T/"
python3 -I "$H/tools/player/hubert_tex.py" "$W/src/Construction_Male_01/Textures/m111_head_color.tga" \
  "$W/src/Medical_Male_03/Textures/m153_head_color.tga" "$W/src/Construction_Male_01/Textures/m111_body_color.tga" "$T"
build hubert Construction_Male_01 m111 "$T" 'helmet|tools|opacity'   # opacity: the mesh visor of the helmet
build ronald Gardener_Male_01 m106 "$W/src/Gardener_Male_01/Textures"
