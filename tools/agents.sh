#!/bin/bash
# Helper agents of the Kern-Chat (docs/WORKFLOW.md, section 5): their branches at a glance, and a ready worktree for one of them.
#   bash tools/agents.sh                 status of every feat/* branch: head, CI of feat.yml, commits not yet in src, notes, brief
#   bash tools/agents.sh worktree NAME   /home/claude/wt-NAME on branch feat/NAME (the remote branch if it exists, else new from src),
#                                        with node_modules linked and a copy of viz3/dist – what an agent needs to build and test
# After a crash of the chat: the briefs are in docs/plans/auftraege/NAME.md, what is done in docs/features/NAME.md and the branch.
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT" || exit 2
git fetch -q --prune origin '+refs/heads/src:refs/remotes/origin/src' '+refs/heads/feat/*:refs/remotes/origin/feat/*' 2>/dev/null
cmd=${1:-status}

if [ "$cmd" = status ]; then
  printf '%-22s %-8s %-6s %-26s %s\n' branch head ahead 'CI feat.yml (last run)' 'notes / brief'
  for ref in $(git for-each-ref --format='%(refname:short)' 'refs/remotes/origin/feat/*'); do
    b=${ref#origin/}
    t=${b#feat/}
    head=$(git rev-parse --short "$ref")
    ahead=$(git rev-list --count "origin/src..$ref" 2>/dev/null)
    ci=$(gh run list --workflow feat.yml --branch "$b" --limit 1 --json headSha,status,conclusion \
      --jq '.[0] | (.headSha[0:7]) + " " + .status + " " + (.conclusion // "-")' 2>/dev/null)
    notes=""
    git cat-file -e "$ref:docs/features/$t.md" 2>/dev/null && notes="docs/features/$t.md"
    git cat-file -e "origin/src:docs/plans/auftraege/$t.md" 2>/dev/null && notes="$notes auftraege/$t.md"
    [ "$ahead" = 0 ] && notes="(in src) $notes"
    printf '%-22s %-8s %-6s %-26s %s\n' "$b" "$head" "$ahead" "${ci:--}" "$notes"
  done
  exit 0
fi

if [ "$cmd" = worktree ]; then
  t=$2
  [ -n "$t" ] || { echo "usage: bash tools/agents.sh worktree NAME"; exit 2; }
  d=/home/claude/wt-$t
  [ -d "$d" ] && { echo "exists: $d"; exit 0; }
  if git rev-parse -q --verify "origin/feat/$t" >/dev/null; then
    git worktree add -q -B "feat/$t" "$d" "origin/feat/$t" || exit 1
  else
    git worktree add -q -b "feat/$t" "$d" origin/src || exit 1
  fi
  # node_modules (built once by tools/check.sh / npm ci) and the built assets (the fast build needs them) from the first worktree that has
  # them – usually the Kern-Chat's own
  SRCWT=""
  for w in $(git worktree list --porcelain | sed -n 's/^worktree //p'); do
    [ -d "$w/viz3/node_modules" ] && [ ! -L "$w/viz3/node_modules" ] && [ -d "$w/viz3/dist" ] && { SRCWT=$w; break; }
  done
  if [ -n "$SRCWT" ]; then
    ln -sfn "$SRCWT/viz3/node_modules" "$d/viz3/node_modules"
    [ -d "$SRCWT/tools/check/node_modules" ] && ln -sfn "$SRCWT/tools/check/node_modules" "$d/tools/check/node_modules"
    cp -a "$SRCWT/viz3/dist" "$d/viz3/dist"
  else
    echo "no worktree with viz3/node_modules and viz3/dist – run bash tools/bootstrap.sh in one first"
  fi
  echo "ready: $d on feat/$t ($(git -C "$d" log --oneline -1))"
  exit 0
fi

echo "usage: bash tools/agents.sh [status | worktree NAME]"
exit 2
