#!/bin/bash
# One browser at a time on the chat machine (2 cores; SwiftShader loses the WebGL context when two run, memory is shared): every browser run
# of the Kern-Chat and of its helper agents goes through this lock, each with its own port (docs/PARALLEL.md).
#   bash tools/browser_lock.sh python3 viz3/test/run.py --port 8971 --serve smoke
exec flock -w "${PAV_LOCK_WAIT:-5400}" /tmp/pav-browser.lock "$@"
