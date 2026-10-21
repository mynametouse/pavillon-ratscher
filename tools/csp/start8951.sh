#!/bin/bash
# local test server on port 8951 for viz3/dist, with a content-security policy like the artifact host (tests: viz3/test/*.py 8951)
cd "$(dirname "$0")/../.."
exec python3 tools/csp/cspserve.py "${1:-8951}" viz3/dist
