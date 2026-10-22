#!/bin/bash
# Website update: the site work tree (branch gh-pages, with the owner's published plan.json) gets the build from dist_pub → commit → push
# gh-pages (served).   bash deploy_push.sh "Commit message"
#   PAV_SITE       site work tree (default: $HOME/pavillon-ratscher, made by tools/bootstrap.sh)
#   COMMIT_TRAILER lines appended to the commit message (the attribution lines of the current session)
#   VORSCHAU=1     preview channel: the build goes to <site>/vorschau/ (…/pavillon-ratscher/vorschau/), the site itself stays
set -e
H=$(cd "$(dirname "$0")" && pwd); R=${PAV_SITE:-$HOME/pavillon-ratscher}
T=${COMMIT_TRAILER:-"Co-Authored-By: Claude <noreply@anthropic.com>"}
git -C "$R" fetch -q --depth 1 origin +refs/heads/gh-pages:refs/remotes/origin/gh-pages
git -C "$R" checkout -q -B main origin/gh-pages
python3 "$H/deploy_site.py" dist_pub "$R" ${VORSCHAU:+vorschau}
git -C "$R" add -A
git -C "$R" commit -q -m "$1

$T"
# only gh-pages is served; the old mirror branch main is no longer pushed (the shallow work tree cannot prove its fast-forward)
git -C "$R" push -q origin main:gh-pages 2>&1 | grep -v "expected 'acknowledgments'\|push negotiation failed" || true
git -C "$R" log --oneline -3
