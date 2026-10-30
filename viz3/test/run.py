"""Run browser tests one after another and give one verdict line each plus an exit code (plan: claude/pavillon-umbau.md, phase 0).

    python3 viz3/test/run.py smoke gpu                  # tests by name (viz3/test/<name>.py), port 8951
    python3 viz3/test/run.py gate                       # the publishing gate: smoke gpu softgl loadlog
    python3 viz3/test/run.py --serve v16b:car,drive     # starts the test server if none answers; text after ':' is passed as argument
    python3 viz3/test/run.py --port 8952 --scale 2 v16e # other port; all time limits ×2 (slow machine)

Never two browsers at once (2 cores: SwiftShader loses the WebGL context) – this runner is strictly sequential.
Verdict: tests that use lib.Checks end with 'RESULT name: k/n ok' and an exit code. Older tests only print, so a test also fails on
a non-zero exit code, a time-out, a line starting with 'FAIL', an uncaught page error ('PAGEERR') or a Python traceback.
Full output of every test: out/run/<name>.log; summary: out/run/summary.json. Exit code 0 only if every test passed.
"""
import os, sys, re, json, time, socket, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'out', 'run')
GROUPS = {'gate': ['smoke', 'gpu', 'softgl', 'loadlog']}
LIMIT = {'smoke': 600, 'gpu': 1200, 'softgl': 1200, 'loadlog': 1500}   # seconds; feature tests default below
DEFAULT_LIMIT = 3600
FAIL_RE = re.compile(r'^\s*(FAIL\b|PAGEERR)|Traceback \(most recent call last\)')
RESULT_RE = re.compile(r'^RESULT (\S+): (\d+)/(\d+) ok')


def port_open(port):
    with socket.socket() as s:
        s.settimeout(1)
        return s.connect_ex(('127.0.0.1', port)) == 0


def main(argv):
    port, scale, serve, names = 8951, 1.0, False, []
    it = iter(argv)
    for a in it:
        if a == '--port': port = int(next(it))
        elif a == '--scale': scale = float(next(it))
        elif a == '--serve': serve = True
        elif a in ('-h', '--help'): print(__doc__); return 0
        else: names += GROUPS.get(a, [a])
    if not names: print(__doc__); return 2
    os.makedirs(OUT, exist_ok=True)
    server = None
    if not port_open(port):
        if not serve:
            print(f'no test server on port {port} – start it (bash tools/csp/start8951.sh) or pass --serve', flush=True); return 2
        server = subprocess.Popen([sys.executable, os.path.join(ROOT, 'tools', 'csp', 'cspserve.py'), str(port), os.path.join(ROOT, 'viz3', 'dist')],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            if port_open(port): break
            time.sleep(0.2)
    results = []
    try:
        for spec in names:
            name, _, extra = spec.partition(':')
            script = os.path.join(HERE, name + '.py')
            if not os.path.exists(script):
                results.append({'test': spec, 'ok': False, 'why': 'no such test', 's': 0}); print(f'FAIL {spec:18s} no such test', flush=True); continue
            limit = LIMIT.get(name, DEFAULT_LIMIT) * scale
            cmd = [sys.executable, script, str(port)] + ([extra] if extra else [])
            log = os.path.join(OUT, spec.replace(':', '_').replace(',', '-').replace('/', '-') + '.log')  # an argument may be a path
            print(f'…    {spec:18s} running (limit {round(limit / 60)} min, log {os.path.relpath(log, ROOT)})', flush=True)
            t0 = time.time(); timed_out = False
            with open(log, 'w') as f:
                p = subprocess.Popen(cmd, cwd=ROOT, stdout=f, stderr=subprocess.STDOUT, text=True, env=dict(os.environ, PYTHONUNBUFFERED='1'))
                try: rc = p.wait(timeout=limit)
                except subprocess.TimeoutExpired:
                    p.kill(); rc = p.wait(); timed_out = True
            dt = round(time.time() - t0)
            text = open(log, errors='replace').read()
            fails = [ln.strip() for ln in text.splitlines() if FAIL_RE.search(ln)]
            res = [m for m in (RESULT_RE.match(ln) for ln in text.splitlines()) if m]
            oks = sum(1 for ln in text.splitlines() if ln.startswith('OK '))
            why = 'time-out' if timed_out else (f'exit code {rc}' if rc else '')
            ok = not timed_out and rc == 0 and not fails
            count = f'{res[-1].group(2)}/{res[-1].group(3)} checks' if res else (f'{oks} OK lines' if oks else 'no checks reported')
            detail = '; '.join(fails[:3])[:300] or why
            results.append({'test': spec, 'ok': ok, 's': dt, 'checks': count, 'why': detail, 'log': os.path.relpath(log, ROOT)})
            print(f"{'PASS' if ok else 'FAIL'} {spec:18s} {dt:5d} s  {count}{'' if ok else '  – ' + detail}", flush=True)
    finally:
        if server: server.terminate()
    good = all(r['ok'] for r in results)
    json.dump({'ok': good, 'tests': results, 'at': time.strftime('%Y-%m-%d %H:%M:%S')}, open(os.path.join(OUT, 'summary.json'), 'w'), indent=1)
    print(f"RUN: {sum(r['ok'] for r in results)}/{len(results)} tests passed in {sum(r['s'] for r in results)} s", flush=True)
    return 0 if good else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
