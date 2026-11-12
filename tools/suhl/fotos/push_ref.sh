#!/usr/bin/env bash
# Puts a folder of contact sheets and maps on the scratch branch ref/suhl-fotos as ONE orphan commit (never merged, the
# only branch of this agent that is force-pushed). The folder commons/ that the workflow may have put there is kept if
# the local folder has none. Nothing in the working tree or the index of the work branch is touched.
#     bash tools/suhl/fotos/push_ref.sh <refdir>
set -euo pipefail
REF="$(cd "$1" && pwd)"
cd "$(git rev-parse --show-toplevel)"
BRANCH=refs/heads/ref/suhl-fotos
for try in 1 2 3 4 5; do
  old="$(git ls-remote origin "$BRANCH" | cut -f1)" || { sleep 20; continue; }
  export GIT_INDEX_FILE="$(mktemp -u)"
  git --work-tree="$REF" add -A -f .
  if [ -n "$old" ] && [ ! -d "$REF/commons" ]; then
    # the Commons sheets are kept only if they came with their CREDITS.md (a run that was cut off leaves none)
    git fetch -q --depth 1 origin "$BRANCH" && git cat-file -e FETCH_HEAD:commons/CREDITS.md 2>/dev/null && git read-tree --prefix=commons/ FETCH_HEAD:commons 2>/dev/null || true
  fi
  tree="$(git write-tree)"
  commit="$(git commit-tree "$tree" -m "suhl-fotos: contact sheets and maps of Suhl (scratch branch, never merged) - made from $(git rev-parse --short HEAD)

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L6YrpcuzUozgpZNSC5CdVL")"
  rm -f "$GIT_INDEX_FILE"; unset GIT_INDEX_FILE
  if git push -q --force-with-lease="$BRANCH:$old" origin "$commit:$BRANCH"; then
    echo "ref/suhl-fotos -> $commit ($(git ls-tree -r --name-only "$commit" | wc -l) files)"; exit 0
  fi
  sleep $((15 * try))
done
echo "push to ref/suhl-fotos failed" >&2; exit 1
