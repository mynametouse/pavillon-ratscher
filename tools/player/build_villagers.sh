#!/bin/bash
# The people of Ratscher for the village life (feat/dorf, Falko 23.10.2026: Skat and Rummy evening in the old school, bonfire at the field):
# six Microsoft Rocketbox avatars (https://github.com/microsoft/Microsoft-Rocketbox, MIT) with the Biped rig of the player and the neighbours,
# moved in the app by the player's clip sets (chars/pclips_m.json, pclips_f.json):
#   gerhard  = Adults/Male_Adult_03        (grey hair, tweed jacket – retired teacher, keeps the village chronicle); without the faint
#              hair cards (alpha-tested they showed as dark blotches on the grey hair of the head texture)
#   manfred  = Adults/Male_Adult_14        (grey shirt, chinos – head of the volunteer fire brigade)
#   wolfgang = Adults/Male_Adult_05        (grey stubble, quilted vest – forest worker)
#   uwe      = Adults/Male_Adult_13        (argyle pullover – farmer, behind the bar on Fridays)
#   katrin   = Adults/Female_Adult_09      (cardigan – Rummy)
#   ingrid   = Professions/Business_Female_02 (glasses, blazer – mayor of the village)
# Mesh with the rig, WebP textures (face 1024 px; clothes, normals, hair 512; glasses 256 – vtex.mjs), meshopt, images embedded
# → viz3/extra/dorf/dist/chars/dorf_<name>.json (charman keys dorf_<name>, viz3/extra/dorf/manifest.json).
#   PAV_WORK=<work dir> bash tools/player/build_villagers.sh [names…]
# Sources in $PAV_WORK/src/<Avatar>/Export/<Avatar>.fbx and $PAV_WORK/src/<Avatar>/Textures/*.tga; from a partial clone of the Rocketbox repo:
#   git show HEAD:Assets/Avatars/<Group>/<Avatar>/<Export|Textures>/<file> > $PAV_WORK/src/<Avatar>/<Export|Textures>/<file>
set -e
H=$(cd "$(dirname "$0")/../.." && pwd); W=${PAV_WORK:?set PAV_WORK}
O="$H/viz3/extra/dorf/dist/chars"
mkdir -p "$W/out" "$W/pack" "$O" && ln -sfn "$H/tools/gltf" "$W/gt"
(cd "$H/tools/player" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
(cd "$H/tools/gltf" && [ -d node_modules ] || npm ci --no-audit --no-fund --silent)
build() {   # name avatar texture-prefix [parts to drop]
  local n=$1 a=$2 p=$3 drop=$4
  printf '{ "name": "%s", "avatar": "%s", "unitScale": 0.01, "fps": 24, "outDir": "%s", "rocketboxClips": [], "retarget": [] }' \
    "$n" "$W/src/$a/Export/$a.fbx" "$W/out" > "$W/cfg_$n.json"
  (cd "$H/tools/player" && node build_player.mjs "$W/cfg_$n.json")                                   # mesh + Biped rig, no clips
  (cd "$H/tools/player" && DROP=$drop PAV_WORK=$W node vtex.mjs "$W/out/${n}_mesh.glb" "$W/src/$a/Textures" "$p" "$W/out/${n}_tex.glb")
  (cd "$H/tools/gltf" && SMALL=512 node chars.mjs "$W/out/${n}_tex.glb" "$W/pack" "dorf_$n" 1024 0 0 1)   # meshopt, WebP, glTF JSON
  python3 - "$W/pack" "dorf_$n" "$O/dorf_$n.json" <<'PY'
import json, base64, sys, os
d, n, out = sys.argv[1:]
g = json.load(open(f'{d}/{n}.json'))
for im in g.get('images', []):   # the images go into the JSON (data URIs), like the player figures and the neighbours
    u = im.get('uri', '')
    if u and not u.startswith('data:'):
        im['uri'] = 'data:image/webp;base64,' + base64.b64encode(open(f'{d}/{u}', 'rb').read()).decode(); im['mimeType'] = 'image/webp'
open(out, 'w').write(json.dumps(g, separators=(',', ':'))); print(out, round(os.path.getsize(out) / 1e6, 2), 'MB')
PY
}
ARGS="$*"
for spec in 'gerhard Male_Adult_03 m004 opacity' 'manfred Male_Adult_14 m012' 'wolfgang Male_Adult_05 m009' 'uwe Male_Adult_13 m010' \
            'katrin Female_Adult_09 f009' 'ingrid Business_Female_02 f015'; do
  set -- $spec
  if [ -z "$ARGS" ] || [[ " $ARGS " == *" $1 "* ]]; then build "$1" "$2" "$3" "$4"; fi
done
