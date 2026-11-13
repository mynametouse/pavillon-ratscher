# feat/grenzland: what a browser test found, told to GitHub as annotations. The log of a job on GitHub Actions is not public, its
# annotations are (…/check-runs/<id>/annotations) – so the chats, which have no login there, can read why a test failed. (The idea and the
# pipe trick are the police agent's, viz3/test/grenzland_polizei.py: a test's own output goes to a file, so the lines are written to the
# output of the parent process, which the runner reads.)
#   ck = grenzland_ci.wrap(lib.Checks('grenzland'), 'grenzland')     then use ck(...), ck.errors(errs), ck.done() as before
import os, sys, atexit

def wrap(_ck, name):
    fails = []
    def ck(what, cond, info=''):
        if not cond: fails.append((what, str(info)))
        return _ck(what, cond, info)
    def errors(errs):
        bad = [e for e in errs if e.startswith('PAGEERR')]
        if bad: fails.append(('page errors', ' | '.join(e[:160] for e in bad)[:500]))
        return _ck.errors(errs)
    ck.errors = errors
    ck.done = _ck.done
    ck.fails = fails
    def annotate():
        if not os.environ.get('GITHUB_ACTIONS'): return
        esc = lambda t: t.replace('%', '%25').replace('\r', ' ').replace('\n', '%0A')
        title = name + (' ' + sys.argv[2] if len(sys.argv) > 2 else '')
        try:
            with open(f'/proc/{os.getppid()}/fd/1', 'w') as f:
                if fails:
                    for i in range(0, len(fails), 3):
                        f.write('::error title=' + title + '::' + esc('\n'.join(f'FAIL {w}: {inf[:700]}' for w, inf in fails[i:i + 3])) + '\n')
                else:
                    f.write('::notice title=' + title + f'::{len(_ck.ok)} checks ok\n')
        except Exception as e:
            print('annotate failed', e)
    atexit.register(annotate)
    old = sys.excepthook
    def hook(t, v, tb):
        fails.append(('the test itself stopped', f'{t.__name__}: {str(v)[:300]}'))
        old(t, v, tb)
    sys.excepthook = hook
    return ck
