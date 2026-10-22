#!/bin/bash
# Fast checks before every push (target: under a minute, no browser): build, lint with file/line, test scripts compile, format, architecture,
# unit tests without a browser (viz3/test/unit), types of the interfaces (modules with // @ts-check).
#   bash tools/check.sh            exit 0 = everything that must pass passed
# Format: report only until the one-time formatting commit sets FORMAT_STRICT=1 below (plan: Projekt-Dokument claude/pavillon-umbau.md).
set -o pipefail
FORMAT_STRICT=1
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT" || exit 2
T0=$(date +%s); FAIL=0
step() { printf '%-8s ' "$1"; }
[ -d tools/check/node_modules ] || npm ci --prefix tools/check --no-audit --no-fund --silent || exit 2
[ -d viz3/node_modules ] || npm ci --prefix viz3 --no-audit --no-fund --silent || exit 2

step build;  if out=$(python3 viz3/build.py --fast 2>&1); then echo "$out" | tail -1; else echo "FAIL"; echo "$out" | tail -20; FAIL=1; fi
step lint;   node tools/check/lint.mjs || FAIL=1
step tests;  if python3 -m py_compile viz3/test/*.py tools/csp/*.py tools/fotos/*.py tools/geo/smooth_roads.py 2>/tmp/pycheck.$$; then echo "test scripts compile"; else echo "FAIL"; cat /tmp/pycheck.$$; FAIL=1; fi; rm -f /tmp/pycheck.$$
step format
n=$(cd viz3 && ../tools/check/node_modules/.bin/prettier --list-different "src/**/*.js" 2>/dev/null | wc -l)
if [ "$n" = 0 ]; then echo "all modules formatted"
elif [ "$FORMAT_STRICT" = 1 ]; then echo "FAIL $n modules not formatted – run: (cd viz3 && ../tools/check/node_modules/.bin/prettier --write 'src/**/*.js')"; FAIL=1
else echo "$n modules not yet formatted (report only until the formatting commit)"; fi
step deps;   node tools/check/deps.mjs || FAIL=1
step unit;   if out=$(node --test "viz3/test/unit/*.test.mjs" 2>&1); then echo "$(echo "$out" | grep -c '^ok ') unit tests passed (viz3/test/unit, no browser)"; else echo "FAIL"; echo "$out" | grep -B2 -A12 '^not ok' | head -40; FAIL=1; fi
step types;  if out=$(tools/check/node_modules/.bin/tsc -p tools/check/tsconfig.json 2>&1); then echo "types checked in $(grep -l '^// @ts-check' viz3/src/*/*.js | wc -l) modules with // @ts-check (tools/check/tsconfig.json)"; else echo "FAIL"; echo "$out" | head -20; FAIL=1; fi

echo "check: $([ $FAIL = 0 ] && echo ok || echo FAILED) in $(( $(date +%s) - T0 )) s"
exit $FAIL
