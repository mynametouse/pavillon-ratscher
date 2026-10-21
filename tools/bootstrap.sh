#!/bin/bash
# New session: everything needed to build, test and publish – from the repo alone (branch src) plus the published site (branch gh-pages).
#   git clone https://github.com/mynametouse/pavillon-ratscher pr-src && cd pr-src && git checkout src && bash tools/bootstrap.sh
# Afterwards: viz3/dist = the site's assets + a fresh build, viz3/dist_pub = what is published now (for tools/publish/pubmap.py),
# $HOME/pavillon-ratscher = site work tree for viz3/deploy_push.sh. The originals of the assets (2.4 GB) are not needed (fast build).
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); SITE=${PAV_SITE:-$HOME/pavillon-ratscher}
URL=$(git -C "$ROOT" remote get-url origin)
if [ ! -d "$SITE/.git" ]; then echo "site → $SITE"; git clone -q --depth 1 --branch gh-pages --single-branch "$URL" "$SITE"; git -C "$SITE" checkout -q -B main; else git -C "$SITE" fetch -q --depth 1 origin gh-pages && git -C "$SITE" checkout -q -B main origin/gh-pages; fi
mkdir -p "$ROOT/viz3/dist"
( cd "$SITE" && tar --exclude=.git --exclude=README.md --exclude=.nojekyll -cf - . ) | ( cd "$ROOT/viz3/dist" && tar -xf - )
# the site's index.html is the full page; dist/pavillon-ratscher.html (artifact) and dist/index.html come from the build below
rm -rf "$ROOT/viz3/dist_pub"; cp -a "$ROOT/viz3/dist" "$ROOT/viz3/dist_pub"
( cd "$ROOT/viz3" && npm ci --no-audit --no-fund --silent )
python3 -c "import playwright" 2>/dev/null || pip install -q --break-system-packages playwright
( cd "$ROOT/viz3" && python3 build.py --fast && cp dist/pavillon-ratscher.html dist/app.js dist_pub/ )
echo "fertig. Testserver: bash tools/csp/start8951.sh (Port 8951) · Smoke-Test: python3 viz3/test/smoke.py 8951 · Doku: docs/WORKFLOW.md"
