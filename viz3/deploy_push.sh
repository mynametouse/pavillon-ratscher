#!/bin/bash
# Website update: the site work tree (branch gh-pages, with the owner's published plan.json) gets the build from dist_pub → commit → push
# gh-pages (served) and main (mirror of the site).   bash deploy_push.sh "Commit message"
#   PAV_SITE       site work tree (default: $HOME/pavillon-ratscher, made by tools/bootstrap.sh)
#   COMMIT_TRAILER lines appended to the commit message (the attribution lines of the current session)
set -e
H=$(cd "$(dirname "$0")" && pwd); R=${PAV_SITE:-$HOME/pavillon-ratscher}
T=${COMMIT_TRAILER:-"Co-Authored-By: Claude <noreply@anthropic.com>"}
git -C "$R" fetch -q --depth 1 origin +refs/heads/gh-pages:refs/remotes/origin/gh-pages
git -C "$R" checkout -q -B main origin/gh-pages
python3 "$H/deploy_site.py" dist_pub "$R"
git -C "$R" add -A
git -C "$R" commit -q -m "$1

$T"
git -C "$R" push -q origin main:gh-pages main:main 2>&1 | grep -v "expected 'acknowledgments'\|push negotiation failed" || true
git -C "$R" log --oneline -3
