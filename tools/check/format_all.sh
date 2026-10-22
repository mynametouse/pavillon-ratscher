#!/bin/bash
# One-time formatting of all app modules with Prettier (refactor phase 0) – only when no other branch is open (docs/PARALLEL.md).
# Safety: the minified bundle must stay byte-identical; otherwise the modules are restored and the script fails.
# Afterwards tools/check.sh enforces the format (FORMAT_STRICT=1).        bash tools/check/format_all.sh
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd); cd "$ROOT"
[ -z "$(git status --porcelain viz3/src)" ] || { echo "viz3/src has uncommitted changes – commit or stash first"; exit 2; }
[ -d tools/check/node_modules ] || npm ci --prefix tools/check --no-audit --no-fund --silent
[ -d viz3/node_modules ] || npm ci --prefix viz3 --no-audit --no-fund --silent
TMP=$(mktemp -d)
DIST=$TMP/before python3 viz3/build.py --fast --min > /dev/null
(cd viz3 && ../tools/check/node_modules/.bin/prettier --log-level warn --write "src/**/*.js")
DIST=$TMP/after python3 viz3/build.py --fast --min > /dev/null
if cmp -s "$TMP/before/app.js" "$TMP/after/app.js"; then
  sed -i 's/^FORMAT_STRICT=0$/FORMAT_STRICT=1/' tools/check.sh
  echo "formatted: $(git diff --stat viz3/src | tail -1); minified bundle byte-identical ($(wc -c < "$TMP/after/app.js") bytes); format now enforced by tools/check.sh"
  rm -rf "$TMP"
else
  git checkout -- viz3/src; rm -rf "$TMP"
  echo "FAIL: the minified bundle changed – formatting undone, nothing committed"; exit 1
fi
