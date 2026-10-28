#!/bin/bash
# The strangers on the streets of Ratscher and Schleusingen (feat/verkehr, Falko 25.10.2026: „ab und zu auch Leute einfach durchs Dorf
# schlendern“): ten more Microsoft Rocketbox avatars (https://github.com/microsoft/Microsoft-Rocketbox, MIT) with the Biped rig of the
# player, the neighbours and the villagers, moved in the app by the player's clip sets (chars/pclips_m.json, pclips_f.json). None of them is
# used by anybody else in the model (players, Hubert, Ronald, the eight villagers):
#   vk_f02 = Adults/Female_Adult_02  white blouse, denim skirt        vk_m02 = Adults/Male_Adult_02  beige pullover, dark trousers
#   vk_f14 = Adults/Female_Adult_14  grey cardigan, jeans, boots      vk_m07 = Adults/Male_Adult_07  grey jacket, jeans
#   vk_f07 = Adults/Female_Adult_07  brown jacket, jeans, boots       vk_m20 = Adults/Male_Adult_20  brown hoodie, jeans
#   vk_f15 = Adults/Female_Adult_15  blue blouse, dark skirt          vk_m11 = Adults/Male_Adult_11  dark shirt, jeans
#   vk_f12 = Adults/Female_Adult_12  hoodie, shorts (young)           vk_m16 = Adults/Male_Adult_16  blue T-shirt, jeans (young)
# Mesh with the rig, WebP textures (face 1024 px; clothes, normals, hair 512 – tools/player/vtex.mjs), meshopt, images embedded
# → viz3/extra/verkehr/dist/chars/vk_<key>.json (charman keys vk_<key>, viz3/extra/verkehr/manifest.json). Same steps as
# tools/player/build_villagers.sh.
#   PAV_WORK=<work dir> bash viz3/extra/verkehr/build_figures.sh [keys…]
# Sources in $PAV_WORK/src/<Avatar>/Export/<Avatar>.fbx and $PAV_WORK/src/<Avatar>/Textures/*.tga; from a partial clone of the Rocketbox repo
# (git clone --depth 1 --filter=blob:none --no-checkout https://github.com/microsoft/microsoft-rocketbox rb):
#   git -C rb show HEAD:Assets/Avatars/Adults/<Avatar>/<Export|Textures>/<file> > $PAV_WORK/src/<Avatar>/<Export|Textures>/<file>
set -e
H=$(cd "$(dirname "$0")/../../.." && pwd); W=${PAV_WORK:?set PAV_WORK}
O="$H/viz3/extra/verkehr/dist/chars"
mkdir -p "$W/out" "$W/pack" "$O" && ln -sfn "$H/tools/gltf" "$W/gt"
(cd "$H/tools/player" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
(cd "$H/tools/gltf" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
build() {   # key avatar texture-prefix [parts to drop or -]
  local n=$1 a=$2 p=$3 drop=$4
  [ "$drop" = - ] && drop=
  printf '{ "name": "%s", "avatar": "%s", "unitScale": 0.01, "fps": 24, "outDir": "%s", "rocketboxClips": [], "retarget": [] }' \
    "$n" "$W/src/$a/Export/$a.fbx" "$W/out" > "$W/cfg_$n.json"
  (cd "$H/tools/player" && node build_player.mjs "$W/cfg_$n.json")                                   # mesh + Biped rig, no clips
  (cd "$H/tools/player" && DROP=$drop PAV_WORK=$W node vtex.mjs "$W/out/${n}_mesh.glb" "$W/src/$a/Textures" "$p" "$W/out/${n}_tex.glb")
  (cd "$H/tools/gltf" && SMALL=512 node chars.mjs "$W/out/${n}_tex.glb" "$W/pack" "vk_$n" 1024 0 0 1)   # meshopt, WebP, glTF JSON
  python3 - "$W/pack" "vk_$n" "$O/vk_$n.json" <<'PY'
import json, base64, sys, os
d, n, out = sys.argv[1:]
g = json.load(open(f'{d}/{n}.json'))
for im in g.get('images', []):   # the images go into the JSON (data URIs), like the player figures and the villagers
    u = im.get('uri', '')
    if u and not u.startswith('data:'):
        im['uri'] = 'data:image/webp;base64,' + base64.b64encode(open(f'{d}/{u}', 'rb').read()).decode(); im['mimeType'] = 'image/webp'
open(out, 'w').write(json.dumps(g, separators=(',', ':'))); print(out, round(os.path.getsize(out) / 1e6, 2), 'MB')
PY
}
ARGS="$*"
for spec in 'f02 Female_Adult_02 f002' 'f14 Female_Adult_14 f017' 'f07 Female_Adult_07 f007' 'f15 Female_Adult_15 f018' 'f12 Female_Adult_12 f012' \
            'm02 Male_Adult_02 m003' 'm07 Male_Adult_07 m013' 'm20 Male_Adult_20 m027' 'm11 Male_Adult_11 m001' 'm16 Male_Adult_16 m019'; do
  set -- $spec
  if [ -z "$ARGS" ] || [[ " $ARGS " == *" $1 "* ]]; then build "$1" "$2" "$3" "$4"; fi
done
