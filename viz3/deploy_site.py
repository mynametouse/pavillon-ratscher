# Public website for people without Claude (GitHub Pages, https://mynametouse.github.io/pavillon-ratscher/):
# the published page fragment wrapped in a full HTML document + every asset folder, written into the site repo's work tree.
#   python3 deploy_site.py [dist dir, default dist_pub = last published] [site work tree]
# then: git -C <site> add -A && git commit && git push
import os, sys, shutil, glob, json, time
H = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(H, sys.argv[1] if len(sys.argv) > 1 else 'dist_pub')
OUT = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(H, '..', 'site'))
URL = 'https://mynametouse.github.io/pavillon-ratscher/'
frag = open(os.path.join(SRC, 'pavillon-ratscher.html')).read()
cut = frag.index('<header class="top">')
head_part, body_part = frag[:cut], frag[cut:]
head_part = head_part.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
# the artifact host wraps the fragment in a skeleton with a small reset – reproduce it so the page looks identical outside claude.ai
HEAD = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="robots" content="noindex,nofollow">\n'
        '<meta name="description" content="Begehbares 3D-Modell des geplanten Gartenpavillons bei Ratscher: Entwurf, Bauphasen, Kosten, 360°-Rundblicke.">\n'
        '<meta property="og:title" content="Pavillon Ratscher">\n<meta property="og:description" content="Begehbares 3D-Modell des geplanten Gartenpavillons – im Browser, ohne Anmeldung.">\n'
        f'<meta property="og:image" content="{URL}img/b01.jpg">\n<meta property="og:url" content="{URL}">\n<meta property="og:type" content="website">\n'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n')
SKIP = {'index.html', 'pavillon-ratscher.html', 'app.js', '_files.json', '_pub.json'}
os.makedirs(OUT, exist_ok=True)
# replace the site's content (keep .git and the published plan of the owner, plan.json, which the page itself writes)
KEEP = {'.git', 'plan.json'}
for name in os.listdir(OUT):
    if name in KEEP: continue
    p = os.path.join(OUT, name); shutil.rmtree(p) if os.path.isdir(p) and not os.path.islink(p) else os.remove(p)
n = 0; tot = 0
for f in sorted(glob.glob(os.path.join(SRC, '**', '*'), recursive=True)):
    if not os.path.isfile(f): continue
    rel = os.path.relpath(f, SRC).replace(os.sep, '/')
    if rel in SKIP or (rel == 'plan.json' and os.path.exists(os.path.join(OUT, 'plan.json'))): continue   # the owner's published plan in the repo wins
    dst = os.path.join(OUT, rel); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(f, dst); n += 1; tot += os.path.getsize(f)
page = HEAD + head_part + '</head>\n<body>\n' + body_part + '\n</body>\n</html>\n'
open(os.path.join(OUT, 'index.html'), 'w').write(page)
open(os.path.join(OUT, '.nojekyll'), 'w').write('')
open(os.path.join(OUT, 'README.md'), 'w').write(
    '# Pavillon Ratscher\n\nBegehbares 3D-Modell des geplanten Gartenpavillons im Garten bei Ratscher (Thüringen): Entwurf in zwei Varianten, '
    'Bauphasen mit Kosten, 360°-Rundblicke, Bilder.\n\n**Ansehen:** ' + URL + ' (läuft im Browser, ohne Anmeldung).\n\n'
    'Die Seite wird mit jeder neuen Modellversion aktualisiert. `plan.json` ist der veröffentlichte Planstand (Gebäude, Zäune, Möbel, Fassade).\n\n'
    'Quellen und Lizenzen der verwendeten Modelle, Texturen und Geräusche stehen auf der Seite unter „Bilder“ → „Quellen und Lizenzen“.\n')
print('site', OUT, '|', n, 'files,', round(tot / 1e6, 1), 'MB | index.html', round(len(page) / 1e6, 2), 'MB |', time.strftime('%H:%M:%S'))
