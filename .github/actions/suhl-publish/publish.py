#!/usr/bin/env python3
"""suhl-publish: the ONE door to the data repo mynametouse/pavillon-daten (branch main, GitHub Pages from the root).

Called by the composite action next to this file (action.yml). Reads its inputs from the environment:
    PUB_MODE      'hallo' -> writes suhl/_probe/hallo.json (time, run id, commit): the proof that the path works
                  'set'   -> publishes a SET of products as one commit (PUB_SET = the set file, tools/suhl/daten/satz.json):
                             fetch every product (a workflow artifact of this repository: gh run download, or a folder of the
                             checkout), validate it (tools/suhl/lib/validate.py), check that the products of the set were computed
                             on each other's generations (based_on), put them under suhl/<product>/v<N>/, switch suhl/aktuell.json,
                             remove the version folders the set names, write ATTRIBUTION.md, report - and push, unless it is a dry run.
    PUB_DRY       'true' = dry run: everything except the push (needs no secret)
    DATEN_TOKEN   the write token (secrets.DATEN_TOKEN). May be empty: then nothing is published and the action says so.
    GH_TOKEN      the workflow token (github.token) with actions: read - to download artifacts of other runs
    DATEN_REPO    default mynametouse/pavillon-daten

Why one door: GitHub Pages builds about ten times an hour and serves at most 1 GB per site; a set must be consistent (the ground cut
to the roads, the building feet read on that ground); clients cache aktuell.json for ten minutes. So: one commit per set, published
versions are never changed, superseded ones are removed by a later set, and every publication reports files added / changed /
removed, new megabytes in the repository and the size of the site (warning above 700 MB, refusal above 900 MB).

The token never reaches the command line, a file or the log: git gets it through GIT_CONFIG_* variables of the child process only,
and every line of git output is scrubbed before it is printed. A missing secret or repo is not an error of the run: the action
writes the reason into the log, the job summary and its outputs (published=false, reason=...).
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
    dry = reason.startswith('DRY RUN')
    refused = 'was refused' in reason
    say(('PUBLISHED: ' if published else 'NOT PUBLISHED: ') + reason)
    lines = [f'### Suhl-Daten veröffentlichen ({os.environ.get("PUB_MODE", "?")})', '',
             ('✅ **veröffentlicht** – ' if published else '🧪 **Trockenlauf, nichts veröffentlicht** – ' if dry else
              '⛔ **abgelehnt, nichts veröffentlicht** – ' if refused else '⚠️ **nicht veröffentlicht** – ') + scrub(reason), '']
    for k, v in extra.items():
        lines.append(f'- {k}: {scrub(str(v))}')
    if not published and not dry and not refused:
        lines += ['', 'Der Lauf ist deshalb nicht fehlgeschlagen. Veröffentlicht wird, sobald der Grund behoben ist.']
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
    return 1 if refused else 0          # a refused set is an error of the set; a missing secret or repo is not an error of the run


def open_repo(work, read_only=False):
    """clone main of the data repo (shallow) with the token. Returns (path, None) or (None, reason).
    read_only (a dry run): the public repo is cloned without the token when there is none."""
    if not TOKEN and read_only:
        dest = os.path.join(work, 'pavillon-daten')
        shutil.rmtree(dest, ignore_errors=True)
        rc, out = git(['clone', '--quiet', '--depth', '1', '--branch', BRANCH, URL, dest], cwd=work)
        if rc != 0:
            return None, classify(out)
        say(f'data repo {REPO}: cloned without the token (dry run)')
        return dest, None
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


# ------------------------------------------------------------------------------------------------ a set of products
WARN_MB, REFUSE_MB = 700.0, 900.0


def _lib():
    """tools/suhl/lib of the caller's checkout (suhllib, schema, validate)"""
    root = os.environ.get('PUB_REPO_ROOT') or os.environ.get('GITHUB_WORKSPACE') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    lib = os.path.join(root, 'tools', 'suhl', 'lib')
    if lib not in sys.path:
        sys.path.insert(0, lib)
    import suhllib, schema, validate
    return root, suhllib, schema, validate


def locate(dl, product, version, index_name):
    """the product version folder inside a downloaded artifact: .../suhl/<product>/v<N>, or the folder that holds the index file"""
    for base, dirs, files in os.walk(dl):
        if base.replace('\\', '/').endswith(f'/suhl/{product}/v{version}'):
            return base
    if os.path.exists(os.path.join(dl, index_name)):
        return dl
    hits = sorted((base for base, dirs, files in os.walk(dl) if index_name in files), key=len)
    if hits:
        return hits[0]
    return None


def fetch_product(product, entry, version, root, work, S):
    """the files of one product of the set -> a folder. Returns (folder or None, note)."""
    if entry.get('folder'):
        src = os.path.join(root, entry['folder'])
        return (src, f'folder {entry["folder"]}') if os.path.isdir(src) else (None, f'the folder {entry["folder"]} does not exist in the checkout')
    run, art = entry.get('run'), entry.get('artifact')
    if not run or not art:
        return None, 'the set names neither a folder nor run + artifact'
    dl = os.path.join(work, 'satz-dl', product)
    shutil.rmtree(dl, ignore_errors=True)
    os.makedirs(dl)
    env = dict(os.environ)
    env.pop('DATEN_TOKEN', None)
    p = subprocess.run(['gh', 'run', 'download', str(run), '-n', art, '-D', dl, '-R', os.environ.get('GITHUB_REPOSITORY') or 'mynametouse/pavillon-ratscher'],
                       env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors='replace')
    if p.returncode != 0:
        return None, f'artifact {art!r} of run {run} could not be downloaded: {scrub(p.stdout.strip())[-300:]} (expired, wrong name, or the job lacks "permissions: actions: read"?)'
    src = locate(dl, product, version, S.PRODUCTS[product]['index'])
    if src is None:
        return None, f'artifact {art!r} of run {run} holds no {S.PRODUCTS[product]["index"]} - not a product version folder'
    return src, f'artifact {art} of run {run}'


def tree_files(top, skip_git=True):
    out = {}
    for base, dirs, files in os.walk(top):
        if skip_git and '.git' in dirs:
            dirs.remove('.git')
        for fn in files:
            p = os.path.join(base, fn)
            out[os.path.relpath(p, top).replace(os.sep, '/')] = os.path.getsize(p)
    return out


def attribution_md(dest, akt, schema, S):
    """ATTRIBUTION.md at the root of the data repo: for every valid product its attribution line and its sources"""
    lines = ['# Quellen und Namensnennung der Daten in diesem Repository', '',
             'Datensätze der Spiegelwelt „Pavillon Ratscher“ (https://github.com/mynametouse/pavillon-ratscher). Erzeugt und veröffentlicht von',
             'GitHub Actions; diese Datei schreibt die Aktion `suhl-publish` bei jeder Veröffentlichung neu. Lizenz und Namensnennung reisen mit',
             'den Daten: jedes Produkt nennt sie in seiner `index.json` (der Boden in `meta.json`).', '', '## Suhl (`suhl/`)', '']
    for p, e in sorted((akt.get('products') or {}).items()):
        if p == '_probe':
            continue
        ip = os.path.join(dest, 'suhl', e['index'])
        try:
            d = S.read_json(ip)
        except Exception:
            continue
        lines.append(f'### {S.PRODUCTS[p]["title"]} – `suhl/{e["path"]}` (Stand {str(e.get("made", ""))[:10]}, Gebiet {e.get("area")})')
        lines.append('')
        lines.append(str(d.get('attribution', '')).strip())
        src = d.get('sources')
        if isinstance(src, list):
            for q in src:
                if isinstance(q, dict):
                    t = q.get('title') or q.get('name') or q.get('id')
                    lic = q.get('licence') or q.get('lizenz') or ''
                    lines.append(f'- {t}' + (f' – {lic}' if lic else '') + (f' – {q["via"]}' if q.get('via') else '') + (f' – {q["url"]}' if q.get('url') else ''))
        elif isinstance(src, dict):
            for k, q in src.items():
                if isinstance(q, str):
                    lines.append(f'- {k}: {q}')
        lines.append('')
    with open(os.path.join(dest, 'ATTRIBUTION.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines).rstrip() + '\n')


def mode_set(work):
    root, S, schema, validate = _lib()
    dry = (os.environ.get('PUB_DRY') or '').lower() in ('1', 'true', 'yes', 'ja')
    sp = os.environ.get('PUB_SET') or 'tools/suhl/daten/satz.json'
    sp = sp if os.path.isabs(sp) else os.path.join(root, sp)
    try:
        st = S.read_json(sp)
        prods = st['products']
        assert isinstance(prods, dict) and prods
    except Exception as ex:
        return finish(False, f'the set file {os.path.relpath(sp, root)} cannot be read or names no products: {ex}')
    dry = dry or bool(st.get('dry_run'))
    name = str(st.get('name') or 'satz')
    say(f'SET {name!r}: ' + ', '.join(f'{p} v{e.get("version")}' for p, e in prods.items()) + (' - DRY RUN (no push)' if dry else ''))
    report = {'set': name, 'dry_run': dry, 'made': S.now(), 'products': {}, 'problems': [], 'run': run_ctx()}
    problems = report['problems']
    stage = os.path.join(work, 'satz-stage')
    shutil.rmtree(stage, ignore_errors=True)
    facts = {}
    # ---- 1. fetch and validate every product
    for p, e in prods.items():
        v = schema.version_of(e.get('version'))
        if p not in S.PRODUCTS or v is None:
            problems.append(f'{p}: unknown product or no version in the set file')
            continue
        src, note = fetch_product(p, e, v, root, work, S)
        if src is None:
            problems.append(f'{p} v{v}: {note}')
            continue
        dst = os.path.join(stage, 'suhl', p, f'v{v}')
        shutil.copytree(src, dst)
        rep = validate.validate(dst)
        try:
            facts[p] = schema.index_doc_of(dst)
        except Exception as ex:
            problems.append(f'{p} v{v}: its index cannot be read ({ex})')
            continue
        fl = tree_files(dst)
        report['products'][p] = {'version': v, 'from': note, 'files': len(fl), 'bytes': sum(fl.values()), 'valid': rep.ok(), 'errors': rep.n_errors(),
                                 'warnings': rep.n_warnings(), 'area': facts[p].get('area'), 'based_on': facts[p].get('based_on') or {}}
        say(f'  {p} v{v}: {note}; {len(fl)} files, {sum(fl.values()) / 1e6:.1f} MB; validator: {rep.n_errors()} errors, {rep.n_warnings()} warnings; '
            f'based_on {json.dumps(facts[p].get("based_on") or {})}')
        if not rep.ok():
            problems.append(f'{p} v{v}: not valid ({rep.n_errors()} errors), e.g. {rep.errors[0][:260]}')
        if schema.version_of(facts[p].get('version')) != v:
            problems.append(f'{p}: its index says version {facts[p].get("version")!r}, the set file says v{v}')
    # ---- 2. the data repo as it is
    dest, why = open_repo(work, read_only=dry)
    if dest is None:
        report['problems'].append(why)
        _write_report(report, work)
        return finish(False, why)
    before = tree_files(dest)
    rc, ls = git(['ls-tree', '-r', 'HEAD'], cwd=dest, quiet=True)
    known = {ln.split()[2] for ln in ls.splitlines() if len(ln.split()) >= 4}          # the blob ids the repository already holds
    try:
        akt = S.read_json(os.path.join(dest, 'suhl', 'aktuell.json'))
    except Exception:
        akt = None
    # ---- 3. a set must be consistent: every product stands on the generation of the others that will be valid after this set
    after = {p: (e.get('version') if isinstance(e, dict) else None) for p, e in ((akt or {}).get('products') or {}).items()}
    after.update({p: schema.version_of(e.get('version')) for p, e in prods.items()})
    for p, f in facts.items():
        for q, n in (f.get('based_on') or {}).items():
            n = schema.version_of(n)
            if after.get(q) != n:
                have = f'v{after[q]}' if after.get(q) is not None else 'no version'
                problems.append(f'{p} v{after[p]} was computed on {q} v{n}, but after this set {q} is {have} - the set is not consistent')
    # ---- 4. put the set into the tree
    removed_dirs = []
    for p, f in facts.items():
        v = after[p]
        tgt = os.path.join(dest, 'suhl', p, f'v{v}')
        src = os.path.join(stage, 'suhl', p, f'v{v}')
        if os.path.isdir(tgt):
            a, b = tree_files(tgt), tree_files(src)
            same = a == b and all(open(os.path.join(tgt, k), 'rb').read() == open(os.path.join(src, k), 'rb').read() for k in a)
            if same:
                say(f'  {p} v{v}: already published with exactly this content')
                continue
            if not prods[p].get('replace'):
                problems.append(f'{p} v{v} is already published with other content - a published version is never changed: take the next '
                                f'version number (or "replace": true in the set file for a sample version)')
                continue
            shutil.rmtree(tgt)
        os.makedirs(os.path.dirname(tgt), exist_ok=True)
        shutil.copytree(src, tgt)
    new_akt = akt
    for p, f in facts.items():
        if prods[p].get('aktuell', True):
            new_akt = schema.make_aktuell(new_akt, f)
    if akt is not None and new_akt is not None and new_akt.get('products') == akt.get('products'):
        new_akt = akt                    # nothing switched: aktuell.json keeps its date
    for r in st.get('remove') or []:
        m = re.fullmatch(r'([a-z_]+)/v([0-9]+)', str(r))
        if not m:
            problems.append(f'remove: {r!r} is not "<product>/v<N>"')
            continue
        if ((new_akt or {}).get('products') or {}).get(m.group(1), {}).get('version') == int(m.group(2)):
            problems.append(f'remove: {r} is the valid version of {m.group(1)} after this set - not removed')
            continue
        d = os.path.join(dest, 'suhl', m.group(1), f'v{m.group(2)}')
        if os.path.isdir(d):
            shutil.rmtree(d)
            removed_dirs.append(r)
    if new_akt is not None:
        with open(os.path.join(dest, 'suhl', 'aktuell.json'), 'w', encoding='utf-8') as f:
            json.dump(new_akt, f, ensure_ascii=False, indent=1)
            f.write('\n')
        attribution_md(dest, new_akt, schema, S)
        arep = schema.Report()
        schema.check_aktuell(new_akt, arep, 'suhl/aktuell.json', root=dest)
        problems.extend(arep.errors[:5])
    had_nojekyll = os.path.exists(os.path.join(dest, '.nojekyll'))
    base_files(dest)
    # ---- 5. the report: what changes, what it costs
    now = tree_files(dest)
    added = sorted(k for k in now if k not in before)
    gone = sorted(k for k in before if k not in now)
    git(['add', '-A'], cwd=dest, quiet=True)
    rc, stt = git(['status', '--porcelain'], cwd=dest, quiet=True)
    changed = sorted(ln[3:] for ln in stt.splitlines() if ln[:2].strip() == 'M')
    new_bytes = 0
    cand = added + changed
    if cand:
        pr = subprocess.run(['git', 'hash-object', '--stdin-paths'], cwd=dest, input='\n'.join(cand) + '\n', stdout=subprocess.PIPE, text=True)
        seen = set()
        for k, h in zip(cand, pr.stdout.split()):
            if h not in known and h not in seen:
                new_bytes += now[k]
                seen.add(h)
    site = sum(now.values())
    report.update({'files_added': len(added), 'files_changed': len(changed), 'files_removed': len(gone), 'removed_versions': removed_dirs,
                   'new_mb_in_repository': round(new_bytes / 1e6, 2), 'site_mb_before': round(sum(before.values()) / 1e6, 2),
                   'site_mb_after': round(site / 1e6, 2), 'site_files_after': len(now), 'nojekyll': 'was there' if had_nojekyll else 'added',
                   'aktuell': (new_akt or {}).get('products')})
    say(f'REPORT: files added {len(added)}, changed {len(changed)}, removed {len(gone)}; new content in the repository {new_bytes / 1e6:.2f} MB; '
        f'site {sum(before.values()) / 1e6:.1f} MB -> {site / 1e6:.1f} MB in {len(now)} files (GitHub Pages: 1 GB); .nojekyll {report["nojekyll"]}')
    if site / 1e6 > REFUSE_MB:
        problems.append(f'the site would have {site / 1e6:.0f} MB - above {REFUSE_MB:.0f} MB nothing is published (GitHub Pages serves at most 1 GB): '
                        f'remove superseded versions first ("remove" in the set file)')
    elif site / 1e6 > WARN_MB:
        say(f'::warning::the data site has {site / 1e6:.0f} MB after this set - GitHub Pages serves at most 1 GB; plan the removal of old versions')
        report['warning'] = f'site above {WARN_MB:.0f} MB'
    extra = {'Satz': name, 'Produkte': ', '.join(f'{p} v{after[p]}' for p in facts), 'Dateien neu / geändert / entfernt': f'{len(added)} / {len(changed)} / {len(gone)}',
             'neu im Repository': f'{new_bytes / 1e6:.2f} MB', 'Größe der Seite danach': f'{site / 1e6:.1f} MB in {len(now)} Dateien (Grenze von GitHub Pages: 1 GB)',
             '.nojekyll': 'vorhanden' if had_nojekyll else 'ergänzt'}
    if problems:
        for q in problems:
            say('  PROBLEM:', q)
        _write_report(report, work)
        return finish(False, f'the set {name!r} was refused: ' + ' | '.join(problems)[:700], extra)
    if dry:
        _write_report(report, work)
        return finish(False, f'DRY RUN of the set {name!r}: everything is ready, nothing was pushed', extra)
    ctx = run_ctx()
    msg = (f"suhl-daten: Satz {name} – " + ', '.join(f'{p} v{after[p]}' for p in facts) + f"\n\n{len(added)} Dateien neu, {len(changed)} geändert, "
           f"{len(gone)} entfernt; {new_bytes / 1e6:.2f} MB neu; Seite {site / 1e6:.1f} MB.\n{ctx['run_url']}")
    ok, note, head = commit_push(dest, msg)
    report.update({'published': ok, 'commit': head, 'note': note})
    _write_report(report, work)
    if not ok:
        return finish(False, note, extra)
    extra.update({'commit': head, 'url': PAGES + 'suhl/aktuell.json', 'path': 'suhl/aktuell.json'})
    return finish(True, note, extra)


def _write_report(report, work):
    out = os.environ.get('PUB_REPORT') or os.path.join(work, 'satz-bericht.json')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(scrub(json.dumps(report, ensure_ascii=False, indent=1)) + '\n')
    say('report written:', out)


def main():
    mode = os.environ.get('PUB_MODE') or 'set'
    work = os.environ.get('RUNNER_TEMP') or '/tmp'
    os.makedirs(work, exist_ok=True)
    os.chdir(work)                      # never run git inside the caller's checkout: its stored credentials must not mix with ours
    if mode == 'hallo':
        return mode_hallo(work)
    if mode == 'set':
        return mode_set(work)
    return finish(False, f'unknown mode {mode!r} (hallo, set)')


if __name__ == '__main__':
    sys.exit(main())
