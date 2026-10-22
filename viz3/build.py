#!/usr/bin/env python3
"""Build Pavillon Ratscher (three r169 + addons + ez-tree + n8ao): bundle the modules of viz3/src with esbuild, put the asset manifests
inline, assemble the page in dist/ (pavillon-ratscher.html = Claude artifact, index.html = website).

  python3 build.py [--min] [--fast]

  full build  default when the asset originals are there (<repo>/assets or PAV_ASSETS): assets → dist/, manifests → manifests.json
  fast build  --fast, or automatically without the originals: dist/ already holds the assets (last full build, or the published site
              copied in by tools/bootstrap.sh); only app.js and the HTML are rebuilt, manifests and credits come from manifests.json
  module order: src/modules.txt (one file per line, relative to src/, # comments); without it every src/NN_*.js in name order
  page: shell/parts.txt (head, css/*.css, header, panels, menu, windows, notes, tail) joined in order
  DIST=<dir> builds into another folder; PACK=0 keeps the images of the glTF models as separate files (full build)
"""
import json, os, sys, glob, subprocess
H = os.path.dirname(os.path.abspath(__file__)); SP = os.path.dirname(H)
A = os.environ.get('PAV_ASSETS') or os.path.join(SP, 'assets'); D = os.path.join(H, os.environ.get('DIST', 'dist'))
sys.path.insert(0, H)
from buildlib import assets as BA, credits as BC
minify = '--min' in sys.argv
fast = '--fast' in sys.argv or not os.path.isdir(A)
MANF = os.path.join(H, 'manifests.json')
os.makedirs(D, exist_ok=True)
# ---- assets and manifests ----
if fast:
    if not os.path.exists(MANF): sys.exit('manifests.json fehlt: einmal mit den Originalen voll bauen oder die Datei aus dem Repo holen')
    M = json.load(open(MANF)); print('fast build: assets in', os.path.relpath(D, H) + '/', 'and manifests.json reused')
else:
    M = BA.collect(H, SP, A, D)
    M['credits'] = BC.credits_html(A, M['playerman'], M['geoman'], M['musicman'])
    json.dump(M, open(MANF, 'w'), ensure_ascii=False, separators=(',', ':')); M = json.load(open(MANF))   # same key order either way
# ---- feature extras (23.10.2026): a feature's own small assets travel with its branch, so CI and the preview have them without the
# manual path (deploy_push.sh): viz3/extra/<feature>/dist/** is copied into dist/, viz3/extra/<feature>/manifest.json is merged into the
# manifests (dicts merge key by key, other values replace; 'credits_add' is appended to the credits). Small files only (< 5 MB each).
def _merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict): _merge(a[k], v)
        else: a[k] = v
import shutil as _sh
for _fx in sorted(glob.glob(os.path.join(H, 'extra', '*'))):
    _src_d = os.path.join(_fx, 'dist')
    for _f in glob.glob(os.path.join(_src_d, '**', '*'), recursive=True):
        if os.path.isfile(_f):
            _dst = os.path.join(D, os.path.relpath(_f, _src_d)); os.makedirs(os.path.dirname(_dst), exist_ok=True); _sh.copy2(_f, _dst)
    _mf = os.path.join(_fx, 'manifest.json')
    if os.path.exists(_mf):
        _x = json.load(open(_mf)); _add = _x.pop('credits_add', '')
        _merge(M, _x)
        if _add: M['credits'] = M.get('credits', '') + _add
site = open(os.path.join(H, 'site.js')).read().strip()
try:   # build id shown in the error report (boot/report.js): source commit and build time
    _src = subprocess.run(['git', '-C', H, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
except Exception: _src = ''
import time as _time
site += '\nwindow.PAV_BUILD=' + json.dumps({'src': _src, 't': _time.strftime('%Y-%m-%d %H:%M')}) + ';'
inject = site + '\nwindow.TEXMAN=' + json.dumps(M['tm']) + ';\nwindow.HDRIMAN=' + json.dumps(M['hm']) + ';\nwindow.MODELMAN=' + json.dumps(M['mm']) + ';\nwindow.SNDMAN=' + json.dumps(M['sm']) + ';\nwindow.SVMAN=' + json.dumps(M['svm']) + ';\nwindow.SVMAN_B=' + json.dumps(M['svmb']) + ';\nwindow.VOICEMAN=' + json.dumps(M['vm'], ensure_ascii=False) + ';\nwindow.PANOMAN=' + json.dumps(M['panoman'], ensure_ascii=False) + ';\nwindow.SKYMAN=' + json.dumps(M['skyman']) + ';\nwindow.CHARMAN=' + json.dumps(M['charman']) + ';\nwindow.PLAYERMAN=' + json.dumps(M['playerman']) + ';\nwindow.GIMAN_A=' + json.dumps(M['giman_a']) + ';\nwindow.GIMAN_B=' + json.dumps(M['giman_b']) + ';\nwindow.MUSICMAN=' + json.dumps(M['musicman'], ensure_ascii=False) + ';\nwindow.GEOMAN=' + json.dumps(M['geoman'], ensure_ascii=False, separators=(',', ':')) + ';\n'
# ---- bundle: the entry _main.js imports the modules in their order – ES modules since phase 1, they load in exactly this order because a
# module imports only from modules above it (see docs/ARCHITECTURE.md) ----
def module_files():
    lst = os.path.join(H, 'src', 'modules.txt')
    if not os.path.exists(lst): return sorted(glob.glob(os.path.join(H, 'src', '[0-9][0-9]_*.js')))
    out = []
    for ln in open(lst):
        ln = ln.split('#', 1)[0].strip()
        if ln: out.append(os.path.join(H, 'src', ln))
    miss = [f for f in out if not os.path.exists(f)]
    if miss: sys.exit('modules.txt: fehlt ' + ', '.join(miss))
    return out
main = ''.join("import './%s';\n" % os.path.relpath(f, os.path.join(H, 'src')).replace(os.sep, '/') for f in module_files())
open(os.path.join(H, 'src', '_main.js'), 'w').write(main)
cmd = ['npx', '--yes', 'esbuild@0.24.0', os.path.join(H, 'src', '_main.js'), '--bundle', '--format=esm', '--target=es2020', '--outfile=' + os.path.join(D, 'app.js'), '--log-level=warning']
if minify: cmd.append('--minify')
r = subprocess.run(cmd, cwd=H, capture_output=True, text=True)
if r.returncode: print(r.stdout, r.stderr); sys.exit(1)
if r.stderr.strip(): print(r.stderr[:2000])
app = open(os.path.join(D, 'app.js')).read()
# ---- HTML ----
def shell_text():   # the page: shell/parts.txt lists its parts in order (head, CSS by area, header, 3D stage, menu, windows, tabs, notes, tail)
    lst = os.path.join(H, 'shell', 'parts.txt')
    if not os.path.exists(lst): return open(os.path.join(H, 'shell.html')).read()
    names = [ln.split('#', 1)[0].strip() for ln in open(lst)]
    return ''.join(open(os.path.join(H, 'shell', n)).read() for n in names if n)
shell = shell_text()
shell = shell.replace('<!--CREDITS-->', M['credits'])
def page(extra_head=''):   # the first script: an error while loading is shown on the loading screen (V16b5: only while loading – after that boot.js names it, the model runs on)
    js = app.replace('</script', '<\\/script')
    return shell.replace('<!--SCRIPTS-->', '<script>' + extra_head + 'window.addEventListener("error",e=>{if(window.PAV_LOADED||/ResizeObserver|^Script error/i.test(e.message||""))return;const l=document.getElementById("loading");if(l){l.hidden=false;l.textContent="Das 3D-Modell konnte nicht geladen werden ("+(e.message||"Fehler")+").";}});\n' + inject + '</script>\n<script type="module">\n' + js + '\n</script>')
open(os.path.join(D, 'pavillon-ratscher.html'), 'w').write(page())
open(os.path.join(D, 'index.html'), 'w').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + page('window.OFFLINE=!!new URLSearchParams(location.search).get("offline");') + '</body></html>')
if not fast and os.environ.get('PACK', '1') == '1': print('packed glTF', BA.pack_gltf([os.path.join(D, s) for s in ('models', 'grass', 'chars')]))
tot = sum(os.path.getsize(f) for f in glob.glob(os.path.join(D, '**', '*'), recursive=True) if os.path.isfile(f) and not f.endswith('index.html'))
print('built', len(app) // 1024, 'KB app;', 'tex', len(M['tm']), 'hdri', len(M['hm']), 'models', len(M['mm']), 'snd', len(M['sm']), 'sv', bool(M['svm']), '; dist total', round(tot / 1e6, 1), 'MB')
