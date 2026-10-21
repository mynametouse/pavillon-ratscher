#!/bin/bash
# Website update: served branch gh-pages (with the owner's published plan.json) + new build from dist_pub → commit → push gh-pages and main
#   bash deploy_push.sh "Commit message"
set -e
H=$(cd "$(dirname "$0")" && pwd); R=/home/claude/pavillon-ratscher
git -C "$R" fetch -q origin +refs/heads/gh-pages:refs/remotes/origin/gh-pages
git -C "$R" checkout -q -B main origin/gh-pages
python3 "$H/deploy_site.py" dist_pub "$R"
git -C "$R" add -A
git -C "$R" commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WqScFDtq8GSy4n7wU7foJx"
git -C "$R" push -q origin main:gh-pages main:main 2>&1 | grep -v "expected 'acknowledgments'\|push negotiation failed" || true
git -C "$R" log --oneline -3
