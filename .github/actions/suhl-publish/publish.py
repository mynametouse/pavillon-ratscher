#!/usr/bin/env python3
"""suhl-publish: commit Suhl data into the data repo mynametouse/pavillon-daten (branch main, GitHub Pages from the root).

Called by the composite action next to this file (action.yml). Reads its inputs from the environment:
    PUB_MODE      'hallo'   -> writes suhl/_probe/hallo.json (time, run id, commit): the proof that the path works
                  'product' -> copies PUB_FOLDER (a folder <...>/suhl/<product>/v<N>) to suhl/<product>/v<N>/ and updates suhl/aktuell.json
    PUB_FOLDER    the product version folder (mode product)
    PUB_REPLACE   'true' = an existing version folder may be replaced (sample sets v0); otherwise an existing version is never touched
    PUB_AKTUELL   'false' = do not point suhl/aktuell.json at this version
    DATEN_TOKEN   the write token (secrets.DATEN_TOKEN). May be empty: then nothing is published and the action says so.
    DATEN_REPO    default mynametouse/pavillon-daten

The token never reaches the command line, a file or the log: git gets it through GIT_CONFIG_* variables of the child process only,
and every line of git output is scrubbed before it is printed. A missing secret or repo is not an error of the run: the action
writes the reason into the log, the job summary and its outputs (published=false, reason=...), and the caller uploads an artifact.
"""
import base64, json, os, re, shutil, subprocess, sys, time

REPO = os.environ.get('DATEN_REPO') or 'mynametouse/pavillon-daten'
BRANCH = 'main'
TOKEN = (os.environ.get('DATEN_TOKEN') or '').strip()
URL = os.environ.get('PUB_TEST_URL') or f'https://github.com/{REPO}.git'     # PUB_TEST_URL: a local bare repo, for the test of this script
PAGES = 'https://%s.github.io/%s/' % tuple(REPO.split('/', 1))
B64 = base64.b64encode(f'x-access-token:{TOKEN}'.encode()).decode() if TOKEN else ''
TRIES = 8


def scrub(s):
    """no secret text in anything we print"""
    for t in (TOKEN, B64, base64.b64encode(TOKEN.encode()).decode() if TOKEN else ''):
        if t:
            s = s.replace(t, '***')
    return re.sub(r'(gh[pousr]_|github_pat_)[A-Za-z0-9_]{8,}', '***', s)


def say(*a):
    print(scrub(' '.join(str(q) for q in a)), flush=True)


def git(args, cwd=None, auth=False, quiet=False):
    """run git; returns (exit status, scrubbed output). auth=True adds the token as an HTTP header for github.com (never on the command line)."""
    env = dict(os.environ, GIT_TERMINAL_PROMPT='0', GIT_ASKPASS='true', LC_ALL='C')
    env.pop('DATEN_TOKEN', None)
    if auth and B64:
        env.update(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
                   GIT_CONFIG_VALUE_0=f'AUTHORIZATION: basic {B64}')
    p = subprocess.run(['git'] + list(args), cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors='replace')
    out = scrub(p.stdout or '').strip()
    if not quiet and out:
        say('  git', args[0] + ':', out[-1500:])
    return p.returncode, out


def classify(out):
    """the class of a git/HTTP failure, in words Falko can act on - never the secret itself"""
    o = out.lower()
    if 'could not read username' in o or 'authentication failed' in o or ' 401' in o or 'invalid username or password' in o or 'bad credentials' in o:
        return 'token rejected (HTTP 401): DATEN_TOKEN is not a valid token for github.com (expired, revoked or copied incompletely)'
    if 'permission to' in o and 'denied' in o or ' 403' in o or 'write access to repository not granted' in o:
        return (f'no permission (HTTP 403): the token may read but not write {REPO} - a fine-grained token needs the repository {REPO} '
                f'selected and "Contents: Read and write"; a classic token needs the scope "repo" (or "public_repo")')
    if 'repository not found' in o or ' 404' in o or 'not found' in o:
        return f'repo not found (HTTP 404): {REPO} does not exist under this name or the token cannot see it'
    if 'protected branch' in o or 'gh006' in o or 'rule violations' in o or 'gh013' in o:
        return f'branch protection: {BRANCH} of {REPO} refuses direct pushes'
    if 'fetch first' in o or 'non-fast-forward' in o or 'rejected' in o:
        return 'push rejected: somebody else pushed in between (retried)'
    if 'could not resolve host' in o or 'timed out' in o or 'connection' in o:
        return 'network error talking to github.com'
    return 'git error (see the log lines above)'


def finish(published, reason, extra=None):
    """log line, job summary, outputs; the action itself never fails for a missing secret or repo"""
    extra = extra or {}
    say(('PUBLISHED: ' if published else 'NOT PUBLISHED: ') + reason)
    lines = [f'### Suhl-Daten veröffentlichen ({os.environ.get("PUB_MODE", "?")})', '',
             ('✅ **veröffentlicht** – ' if published else '⚠️ **nicht veröffentlicht** – ') + scrub(reason), '']
    for k, v in extra.items():
        lines.append(f'- {k}: {scrub(str(v))}')
    if not published:
        lines += ['', 'Der Lauf ist deshalb nicht fehlgeschlagen. Die Daten liegen als Artefakt dieses Laufs bereit (falls der Schritt danach '
                      'eines hochlädt) und werden veröffentlicht, sobald der Grund behoben ist.']
    sp = os.environ.get('GITHUB_STEP_SUMMARY')
    if sp:
        with open(sp, 'a', encoding='utf-8') as f:
            f.write('\n'.join(lines) + '\n')
    op = os.environ.get('GITHUB_OUTPUT')
    if op:
        with open(op, 'a', encoding='utf-8') as f:
            f.write(f'published={"true" if published else "false"}\n')
            f.write('reason=' + scrub(reason).replace('\n', ' ')[:900] + '\n')
            for k in ('commit', 'url', 'path'):
                if k in extra:
                    f.write(f'{k}={scrub(str(extra[k]))}\n')
    return 0


def open_repo(work):
    """clone main of the data repo (shallow) with the token. Returns (path, None) or (None, reason)."""
    if not TOKEN:
        return None, ('the secret DATEN_TOKEN is empty or not set in this repository (Settings → Secrets and variables → Actions → '
                      'Repository secrets; the name must be exactly DATEN_TOKEN; secrets are not passed to runs started from forks)')
    if B64:
        print(f'::add-mask::{B64}', flush=True)
    rc, out = git(['ls-remote', URL, f'refs/heads/{BRANCH}'], quiet=True)           # without the token: does the public repo exist?
    public = rc == 0
    rc, out = git(['ls-remote', URL, f'refs/heads/{BRANCH}'], auth=True, quiet=True)
    if rc != 0:
        why = classify(out)
        if not public and 'not found' in why:
            why = f'repo not found (HTTP 404): {REPO} does not exist, or it is private and the token cannot see it'
        return None, why
    if not out.strip():
        return None, f'{REPO} has no branch {BRANCH} yet (an empty repo: create it with a README, then Pages from the root of {BRANCH})'
    say(f'data repo {REPO}: {BRANCH} at {out.split()[0][:12]}; reachable {"without and " if public else ""}with the token')
    dest = os.path.join(work, 'pavillon-daten')
    shutil.rmtree(dest, ignore_errors=True)
    rc, out = git(['clone', '--quiet', '--depth', '1', '--branch', BRANCH, URL, dest], cwd=work, auth=True)
    if rc != 0:
        return None, classify(out)
    git(['config', 'user.name', 'suhl-publish (GitHub Actions)'], cwd=dest)
    git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], cwd=dest)
    return dest, None


def commit_push(dest, message):
    """commit everything that changed and push with retry: on a rejected push fetch, rebase our one commit, try again."""
    git(['add', '-A'], cwd=dest)
    rc, out = git(['status', '--porcelain'], cwd=dest, quiet=True)
    if not out.strip():
        rc, head = git(['rev-parse', 'HEAD'], cwd=dest, quiet=True)
        return True, 'nothing changed (the data repo already holds exactly this)', head.strip()
    rc, out = git(['commit', '--quiet', '-m', message], cwd=dest)
    if rc != 0:
        return False, 'git commit failed: ' + out[-300:], ''
    last = ''
    for k in range(1, TRIES + 1):
        rc, out = git(['push', '--quiet', 'origin', f'HEAD:{BRANCH}'], cwd=dest, auth=True)
        if rc == 0:
            rc, head = git(['rev-parse', 'HEAD'], cwd=dest, quiet=True)
            return True, f'pushed to {REPO}@{BRANCH} (try {k})', head.strip()
        last = classify(out)
        if not last.startswith('push rejected') and not last.startswith('network'):
            return False, last, ''
        wait = min(60, 4 * k + (os.getpid() + k * 7) % 9)
        say(f'  push try {k}/{TRIES} failed ({last}); again in {wait} s')
        time.sleep(wait)
        rc, out = git(['fetch', '--quiet', '--depth', '20', 'origin', BRANCH], cwd=dest, auth=True)
        if rc == 0:
            rc, out = git(['rebase', '--quiet', '--onto', 'FETCH_HEAD', 'HEAD~1'], cwd=dest)
            if rc != 0:
                git(['rebase', '--abort'], cwd=dest, quiet=True)
                return False, 'rebase onto the new state of the data repo failed (two runs wrote the same file): ' + out[-300:], ''
    return False, f'push failed {TRIES} times: {last}', ''


def run_ctx():
    e = os.environ
    return {'repo': e.get('GITHUB_REPOSITORY', ''), 'workflow': e.get('GITHUB_WORKFLOW', ''), 'run_id': e.get('GITHUB_RUN_ID', ''),
            'run_attempt': e.get('GITHUB_RUN_ATTEMPT', ''), 'sha': e.get('GITHUB_SHA', ''), 'ref': e.get('GITHUB_REF_NAME', ''),
            'run_url': f"{e.get('GITHUB_SERVER_URL', 'https://github.com')}/{e.get('GITHUB_REPOSITORY', '')}/actions/runs/{e.get('GITHUB_RUN_ID', '')}"}


def base_files(dest):
    """.nojekyll (Pages must serve folders that start with _ and must not run Jekyll over thousands of files)"""
    p = os.path.join(dest, '.nojekyll')
    if not os.path.exists(p):
        open(p, 'w').close()


def mode_hallo(work):
    dest, why = open_repo(work)
    if dest is None:
        return finish(False, why)
    base_files(dest)
    ctx = run_ctx()
    doc = {'was': 'Probe des Veröffentlichens der Suhl-Daten (Aktion suhl-publish) – diese Datei beweist nur, dass der Weg funktioniert',
           'zeit': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'lauf': ctx['run_id'], 'versuch': ctx['run_attempt'],
           'commit': ctx['sha'], 'zweig': ctx['ref'], 'quelle': ctx['repo'], 'workflow': ctx['workflow'], 'lauf_url': ctx['run_url']}
    os.makedirs(os.path.join(dest, 'suhl', '_probe'), exist_ok=True)
    with open(os.path.join(dest, 'suhl', '_probe', 'hallo.json'), 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    ok, note, head = commit_push(dest, f"suhl-daten: Probe suhl/_probe/hallo.json (Lauf {ctx['run_id']}, {ctx['sha'][:7]})\n\n{ctx['run_url']}")
    if not ok:
        return finish(False, note)
    return finish(True, note, {'commit': head, 'path': 'suhl/_probe/hallo.json', 'url': PAGES + 'suhl/_probe/hallo.json'})


def main():
    mode = os.environ.get('PUB_MODE') or 'product'
    work = os.environ.get('RUNNER_TEMP') or '/tmp'
    os.chdir(work)                      # never run git inside the caller's checkout: its stored credentials must not mix with ours
    if mode == 'hallo':
        return mode_hallo(work)
    return finish(False, f'mode {mode!r} is not implemented yet in this version of suhl-publish')


if __name__ == '__main__':
    sys.exit(main())
