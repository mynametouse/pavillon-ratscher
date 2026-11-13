#!/usr/bin/env bash
# suhl-boden: put the picture sheets of a folder on the scratch branch ref/suhl-boden (never merged; the only branch this agent may
# force-push). The branch always holds ONE orphan commit: what is there under other sub folders is kept, the sub folder given here is
# replaced. The work tree and the index of the checkout stay untouched (temporary index, git plumbing).
#   bash tools/suhl/boden/bilder.sh <folder with the pictures> <sub folder on the branch, e.g. probe or stadt>
set -euo pipefail
DIR="${1:?folder with the pictures}"
SUB="${2:?sub folder on the branch}"
cd "$(git rev-parse --show-toplevel)"
export GIT_INDEX_FILE="$(mktemp -u)"
trap 'rm -f "$GIT_INDEX_FILE"' EXIT
if git fetch -q --depth 1 origin ref/suhl-boden 2>/dev/null; then
  git read-tree FETCH_HEAD
  git ls-files -z -- "$SUB/" CREDITS.md | xargs -0 -r git update-index --force-remove --
fi
( cd "$DIR" && find . -type f | sed 's|^\./||' | sort ) | while read -r f; do
  h=$(git hash-object -w "$DIR/$f")
  git update-index --add --cacheinfo "100644,$h,$SUB/$f"
done
CRED=$(mktemp)
cat > "$CRED" <<'TXT'
# Bildbögen des Suhl-Bodens (Wegwerf-Zweig ref/suhl-boden, wird nie zusammengeführt)

Verkleinerte Bögen zum Ansehen, erzeugt mit `tools/suhl/boden/bogen.py` aus den Boden-Kacheln von Suhl.

| Inhalt | Quelle | Lizenz | Namensnennung |
|---|---|---|---|
| Luftbilder | Thüringer Landesamt für Bodenmanagement und Geoinformation, Dienst WMS TH DOP (`th_dop`), Bildflug 15.05.2024 – https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP | CC BY 4.0 | © GDI-Th |
| Gelände (Schummerung) | Copernicus DEM GLO-30 (ESA); wo vorhanden DGM1 Thüringen | Copernicus-Lizenz; CC BY 4.0 | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; © GDI-Th |
| Gebietsgrenzen, Routen, Gebäudeumrisse in den Karten | OpenStreetMap; ALKIS Thüringen (WFS, wo genannt) | ODbL 1.0; CC BY 4.0 | © OpenStreetMap-Mitwirkende; © GDI-Th |
TXT
h=$(git hash-object -w "$CRED"); rm -f "$CRED"
git update-index --add --cacheinfo "100644,$h,CREDITS.md"
TREE=$(git write-tree)
MSG="suhl-boden: picture sheets of the Suhl ground tiles ($SUB) – scratch branch, one orphan commit, never merged

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01L6YrpcuzUozgpZNSC5CdVL"
C=$(git commit-tree "$TREE" -m "$MSG")
echo "tree $TREE commit $C"
for i in 1 2 3 4 5; do
  if git push -q --force origin "$C:refs/heads/ref/suhl-boden"; then echo "pushed $C to ref/suhl-boden"; exit 0; fi
  echo "push failed (try $i)"; sleep $((15 + 5 * i))
done
exit 1
