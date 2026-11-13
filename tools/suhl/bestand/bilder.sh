#!/usr/bin/env bash
# suhl-bestand: put the pictures of a folder as ONE orphan commit on the scratch branch ref/suhl-bestand (never merged; the only
# branch this agent may force-push). The work tree and the index of the checkout stay untouched (temporary index, git plumbing).
#   bash tools/suhl/bestand/bilder.sh /tmp/suhl-bestand/bilder     # the folder's content becomes the root of the branch
set -euo pipefail
DIR="${1:?folder with the pictures}"
cd "$(git rev-parse --show-toplevel)"
export GIT_INDEX_FILE="$(mktemp -u)"
trap 'rm -f "$GIT_INDEX_FILE"' EXIT
( cd "$DIR" && find . -type f | sed 's|^\./||' | sort ) | while read -r f; do
  h=$(git hash-object -w "$DIR/$f")
  git update-index --add --cacheinfo "100644,$h,$f"
done
TREE=$(git write-tree)
MSG="suhl-bestand: map pictures of the Suhl inventory (tile lists, areas) – scratch branch, one orphan commit, never merged

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L6YrpcuzUozgpZNSC5CdVL"
C=$(git commit-tree "$TREE" -m "$MSG")
echo "tree $TREE commit $C"
for i in 1 2 3 4 5; do
  if git push -q --force origin "$C:refs/heads/ref/suhl-bestand"; then echo "pushed $C to ref/suhl-bestand"; exit 0; fi
  echo "push failed (try $i)"; sleep $((15 + 5 * i))
done
exit 1
