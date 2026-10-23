#!/bin/bash
# The selectable player figures (Falko 23.10.2026, docs/plans/plan_leben.md 3; Falko himself stays chars/player_m.json) from Microsoft
# Rocketbox avatars (https://github.com/microsoft/Microsoft-Rocketbox, MIT). All adult women share one Biped skeleton, all adult men another,
# so a figure can take the clothed body of one avatar and the head of another, and the clip sets fit unchanged:
#   Sarah      body of Adults/Female_Adult_04 (leather jacket, cargo trousers, boots), head with brunette curls of Adults/Female_Party_02;
#              clips chars/pclips_f.json
#   Christoph  body of Adults/Male_Adult_09 (dark T-shirt, jeans; arms, shoulders and chest a little thicker), head of
#              Professions/Sports_Male_01 (short brown hair, light beard); clips chars/pclips_m.json. Cap and earbuds: game/avatar.js
# Mesh with the Biped rig, 1024 px WebP textures, meshopt, images embedded → viz3/extra/figuren/dist/chars/player_<name>.json
#   PAV_WORK=<work dir> bash tools/player/build_figures.sh [sarah] [christoph]
# Sources in $PAV_WORK/src/<Avatar>/Export/<Avatar>.fbx and $PAV_WORK/src/<Avatar>/Textures/*.tga; fetched here from a partial clone of the
# Rocketbox repo ($RB, default /home/claude/microsoft/microsoft-rocketbox: GIT_LFS_SKIP_SMUDGE=1 git clone --filter=blob:none --no-checkout
# --depth 1 https://github.com/microsoft/microsoft-rocketbox) when missing.
set -e
H=$(cd "$(dirname "$0")/../.." && pwd); W=${PAV_WORK:?set PAV_WORK}; RB=${RB:-/home/claude/microsoft/microsoft-rocketbox}
OUT="$H/viz3/extra/figuren/dist/chars"
mkdir -p "$W/out" "$W/pack" "$OUT" && ln -sfn "$H/tools/gltf" "$W/gt"
(cd "$H/tools/player" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
(cd "$H/tools/gltf" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
src() {   # group/avatar texture files…: fetch what is missing from the Rocketbox clone
  local g=$1 a=${1##*/}; shift
  mkdir -p "$W/src/$a/Export" "$W/src/$a/Textures"
  [ -s "$W/src/$a/Export/$a.fbx" ] || git -C "$RB" show "HEAD:Assets/Avatars/$g/Export/$a.fbx" > "$W/src/$a/Export/$a.fbx"
  for f in "$@"; do [ -s "$W/src/$a/Textures/$f" ] || git -C "$RB" show "HEAD:Assets/Avatars/$g/Textures/$f" > "$W/src/$a/Textures/$f"; done
}
fig() {   # name body-avatar head-avatar [build.json]
  local n=$1 b=$2 h=$3 cfg=$4
  (cd "$H/tools/player" && node fig_mesh.mjs "player_$n" "$W/src/$b/Export/$b.fbx" "$W/src/$h/Export/$h.fbx" "$W/out" $cfg 2>&1 | grep -v 'TGA loader')
  python3 -I "$H/tools/player/fig_tex.py" "$n" "$W/src" "$W/tex_$n" "$W/preview"
  (cd "$H/tools/player" && PAV_WORK=$W node texattach.mjs "$W/out/player_${n}_mesh.glb" "$W/tex_$n" "$n" "$W/out/player_${n}_tex.glb" 1024 0)
  (cd "$H/tools/gltf" && node chars.mjs "$W/out/player_${n}_tex.glb" "$W/pack" "player_$n" 1024 0 0 1)   # meshopt, WebP, glTF JSON
  python3 - "$W/pack" "player_$n" "$OUT/player_$n.json" <<'PY'
import json, base64, sys
d, n, out = sys.argv[1:]
g = json.load(open(f'{d}/{n}.json'))
for im in g.get('images', []):   # the images go into the JSON (data URIs), like the other figures
    u = im.get('uri', '')
    if u and not u.startswith('data:'):
        im['uri'] = 'data:image/webp;base64,' + base64.b64encode(open(f'{d}/{u}', 'rb').read()).decode(); im['mimeType'] = 'image/webp'
open(out, 'w').write(json.dumps(g, separators=(',', ':'))); print(out, round(len(json.dumps(g)) / 1e6, 2), 'MB')
PY
}
WHO=${*:-sarah christoph}
for w in $WHO; do case $w in
  sarah)
    src Adults/Female_Adult_04 f004_body_color.tga f004_body_normal.tga
    src Adults/Female_Party_02 f022_head_color.tga f022_head_normal.tga f022_opacity_color.tga
    fig sarah Female_Adult_04 Female_Party_02 ;;
  christoph)
    src Adults/Male_Adult_09 m017_body_color.tga m017_body_normal.tga
    src Professions/Sports_Male_01 m021_head_color.tga m021_head_normal.tga
    # a little more muscular than Falko: upper arms, forearms, shoulders and chest thicker (factor on the distance from the bone)
    cat > "$W/christoph.json" <<'JSON'
{ "thick": { "Bip01_L_UpperArm": 1.12, "Bip01_R_UpperArm": 1.12, "Bip01_L_Forearm": 1.06, "Bip01_R_Forearm": 1.06,
             "Bip01_L_Clavicle": 1.06, "Bip01_R_Clavicle": 1.06 },
  "torso": 1.05, "torsoTop": 7 }
JSON
    fig christoph Male_Adult_09 Sports_Male_01 "$W/christoph.json" ;;
  *) echo "unknown figure $w"; exit 2 ;;
esac; done
