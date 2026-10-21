#!/usr/bin/env python3
"""Build Pavillon Ratscher v3: bundle src/*.js (three r169 + addons + ez-tree + n8ao) with esbuild, inject manifests, assemble HTML + asset folders in dist/."""
import json, os, re, shutil, subprocess, sys, glob, math
H = os.path.dirname(os.path.abspath(__file__)); SP = os.path.dirname(H); A = os.path.join(SP, 'assets'); D = os.path.join(H, os.environ.get('DIST', 'dist'))
minify = '--min' in sys.argv
os.makedirs(D, exist_ok=True)
def sync(src, dst, pats):
    if not os.path.isdir(src): return 0
    os.makedirs(dst, exist_ok=True); n = 0
    for p in pats:
        for f in glob.glob(os.path.join(src, p)):
            t = os.path.join(dst, os.path.basename(f))
            if not os.path.exists(t) or os.path.getmtime(t) < os.path.getmtime(f) or os.path.getsize(t) != os.path.getsize(f): shutil.copy2(f, t)
            n += 1
    return n
OPT = os.path.join(H, 'opt')   # output of optimize_assets.mjs (meshopt models with separate WebP images, WebP textures)
sync(os.path.join(A, 'tex'), os.path.join(D, 'tex'), ['*_col.jpg', '*_nrm.jpg', '*_orm.jpg'])   # (jpgs replaced by WebP are removed again below)
# textures: use the WebP version only where it is clearly smaller (noisy normal/roughness maps compress better as JPEG)
TEXEXT = {}
for f in glob.glob(os.path.join(D, 'tex', '*.jpg')):
    b = os.path.basename(f)[:-4]; w = os.path.join(OPT, 'tex', b + '.webp'); dw = os.path.join(D, 'tex', b + '.webp')
    if os.path.exists(w) and os.path.getsize(w) < 0.85 * os.path.getsize(f): shutil.copy2(w, dw); TEXEXT[b] = 'webp'
    elif os.path.exists(dw): os.remove(dw)
for b, e in TEXEXT.items():
    if e == 'webp' and os.path.exists(os.path.join(D, 'tex', b + '.jpg')): os.remove(os.path.join(D, 'tex', b + '.jpg'))
import base64, struct
def hdr_to_json(src, dst):
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): return
    open(dst, 'w').write(json.dumps({'b64': base64.b64encode(open(src, 'rb').read()).decode()}))
def glb_to_json(src, dst):
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): return
    b = open(src, 'rb').read(); assert b[:4] == b'glTF'
    L = struct.unpack('<I', b[12:16])[0]; js = json.loads(b[20:20 + L]); off = 20 + L
    binL = struct.unpack('<I', b[off:off + 4])[0]; assert b[off + 4:off + 8] == b'BIN\0'; bin0 = b[off + 8:off + 8 + binL]
    js['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(bin0).decode()
    open(dst, 'w').write(json.dumps(js, separators=(',', ':')))
os.makedirs(os.path.join(D, 'hdri'), exist_ok=True)
for f in glob.glob(os.path.join(A, 'hdri', '*_1k.hdr')): hdr_to_json(f, os.path.join(D, 'hdri', os.path.basename(f) + '.json'))
sync(os.path.join(H, 'public', 'tree'), os.path.join(D, 'tree'), ['*.jpg', '*.png'])
os.makedirs(os.path.join(D, 'grass'), exist_ok=True)
def opt_or_json(src, dstdir):
    b = os.path.basename(src); stem = b[:-4]
    for sub in ('models', 'grass'):
        oj = os.path.join(OPT, sub, b + '.json')
        if os.path.exists(oj) and os.path.getmtime(oj) >= os.path.getmtime(src) - 1:
            shutil.copy2(oj, os.path.join(dstdir, b + '.json'))
            for im in glob.glob(os.path.join(OPT, sub, stem + '__*')): shutil.copy2(im, os.path.join(dstdir, os.path.basename(im)))
            return 'opt'
    glb_to_json(src, os.path.join(dstdir, b + '.json')); return 'raw'
for f in glob.glob(os.path.join(H, 'public', 'grass', '*.glb')): opt_or_json(f, os.path.join(D, 'grass'))
sync(os.path.join(A, 'snd'), os.path.join(D, 'snd'), ['*.mp3', '*.m4a', '*.ogg'])
sync(os.path.join(A, 'sky'), os.path.join(D, 'sky'), ['*.jpg'])   # photographic skies (tools/mksky.py)
# rigged people and goats (gt/chars.mjs, chars/rt.html): glTF JSON with meshopt geometry + WebP images, animation clips
sync(os.path.join(A, 'chars'), os.path.join(D, 'chars'), ['*.json', '*.webp'])
charman = {k: k + '.json' for k in ('hubert', 'ronald', 'goat', 'clips')} if all(os.path.exists(os.path.join(D, 'chars', k + '.json')) for k in ('hubert', 'ronald', 'goat', 'clips')) else None
if charman and os.path.exists(os.path.join(D, 'chars', 'tractor.json')): charman['tractor'] = 'tractor.json'
# V15 player figures (man, woman) and their animation clips (chars/player.py): only the files that exist
for _old in ('pclips.json',):
    if os.path.exists(os.path.join(D, 'chars', _old)): os.remove(os.path.join(D, 'chars', _old))
playerman = {k: k + '.json' for k in ('player_m', 'player_f', 'pclips_m', 'pclips_f') if os.path.exists(os.path.join(D, 'chars', k + '.json'))} or None
if playerman and not any(k.startswith('pclips_') for k in playerman): playerman = None
try: skyman = json.load(open(os.path.join(A, 'sky', 'manifest.json')))
except Exception: skyman = {}
sync(os.path.join(A, 'snd', 'voice'), os.path.join(D, 'snd', 'voice'), ['*.mp3'])
# published plan of the owner (website repo, written by the page's "Für alle veröffentlichen"); a placeholder when none exists yet, so the page finds a file
_plan_src = os.environ.get('PLAN_JSON', '/home/claude/pavillon-ratscher/plan.json')
if os.path.exists(_plan_src): shutil.copy2(_plan_src, os.path.join(D, 'plan.json'))
else: open(os.path.join(D, 'plan.json'), 'w').write('{"v": 0}\n')
for _sv in ('sv.png', 'sv_b.png'):
    if os.path.exists(os.path.join(H, 'public', _sv)): shutil.copy2(os.path.join(H, 'public', _sv), os.path.join(D, _sv))
# baked global illumination (test/gi.py): atlases per variant and light mode
sync(os.path.join(H, 'public', 'gi'), os.path.join(D, 'gi'), ['*.png'])
def _giman(v):
    f = os.path.join(H, 'public', 'gi', 'gi_' + v + '.json')
    if not os.path.exists(f): return None
    m = json.load(open(f)); m['modes'] = {k: e for k, e in m.get('modes', {}).items() if os.path.exists(os.path.join(D, e['a'])) and os.path.exists(os.path.join(D, e['b']))}
    return m if m['modes'] else None
giman_a, giman_b = _giman('a'), _giman('b')
# 360° panoramas (rendered by test/pano.py): only the ones whose image exists
PANOD = os.path.join(H, 'public', 'pano'); panoman = {}
if os.path.exists(os.path.join(PANOD, 'pano.json')):
    for _v, _l in json.load(open(os.path.join(PANOD, 'pano.json'))).items():
        panoman[_v] = [e for e in _l if os.path.exists(os.path.join(H, 'public', e['file']))]
    sync(PANOD, os.path.join(D, 'pano'), ['*.jpg'])
# ---- manifests ----
ROT = {'larch': math.pi / 2}
tm = {}
try:
    for k, v in json.load(open(os.path.join(A, 'tex', 'manifest.json'))).items():
        if isinstance(v, dict) and (os.path.exists(os.path.join(D, 'tex', k + '_col.jpg')) or os.path.exists(os.path.join(D, 'tex', k + '_col.webp'))):
            tm[k] = {'tile': v.get('tile_m', [1, 1]), 'rot': ROT.get(k, 0), 'ext': {c: TEXEXT.get(k + '_' + c, 'jpg') for c in ('col', 'nrm', 'orm')}}
except Exception as e: print('tex manifest', e)
hm = {}
try:
    for k, v in json.load(open(os.path.join(A, 'hdri', 'manifest.json'))).items():
        if isinstance(v, dict) and 'sun_u' in v: hm[k] = {'file': v['files']['1k'] + '.json', 'sun_u': v['sun_u']}
except Exception as e: print('hdri manifest', e)
mm = {}
try:
    man = json.load(open(os.path.join(A, 'models', 'manifest.json')))
    items = man.get('assets', []) if isinstance(man, dict) else man
    alias = json.load(open(os.path.join(H, 'model_alias.json'))) if os.path.exists(os.path.join(H, 'model_alias.json')) else {}
    byid = {it.get('id'): it for it in items if isinstance(it, dict)}
    for slot, a in alias.items():
        it = byid.get(a['id']);
        if it and os.path.exists(os.path.join(A, 'models', it['file'])): mm[slot] = {'file': it['file'], 'bbox': it.get('bbox_size'), 'bmin': it.get('bbox_min'), 'front': a.get('front', 0), 'nodes': [{'name': n['name'], 'origin': n.get('origin', [0, 0, 0]), 'bmin': n.get('bbox_min'), 'bmax': n.get('bbox_max')} for n in (it.get('nodes') or [])]}
except Exception as e: print('model manifest', e)
sm = []
try:
    for it in json.load(open(os.path.join(A, 'snd', 'manifest.json'))):
        f = it['file']; kind = re.sub(r'_\d+$', '', os.path.splitext(f)[0])
        if os.path.exists(os.path.join(D, 'snd', f)): sm.append({'file': f, 'kind': kind, 'loop': int(it.get('loop_samples') or 0), 'lic': it.get('license', ''), 'by': it.get('author', ''), 'src': it.get('source_url', '')})
except Exception as e: print('snd manifest', e)
vm = {'lines': [], 'topics': {}}
try:
    vj = json.load(open(os.path.join(A, 'snd', 'voice', 'voices.json')))
    vm = {'lines': [{'file': l['file'], 'who': l['who'], 'id': l['id'], 'text': l['text'], 'dur': l['dur']} for l in vj['lines'] if os.path.exists(os.path.join(D, 'snd', l['file']))], 'topics': vj['topics']}
except Exception as e: print('voice manifest', e)
# records for the record player (public-domain recordings from Wikimedia Commons, see scripts/commons_dl.py and music/make.py): snd/music/*.mp3
musicman = []
try:
    _md = os.path.join(A, 'snd', 'music')
    if os.path.exists(os.path.join(_md, 'music.json')):
        musicman = [m for m in json.load(open(os.path.join(_md, 'music.json'))) if os.path.exists(os.path.join(_md, m['file']))]
        sync(_md, os.path.join(D, 'snd', 'music'), ['*.mp3'])
except Exception as e: print('music manifest', e)
# real surroundings of Ratscher (scratchpad geo/: terrain, orthophotos, OSM map, buildings, trees) → dist/geo, manifest inline
geoman = None
try:
    _gp = os.path.join(SP, 'geo', 'out', 'pub')
    if os.path.exists(os.path.join(_gp, 'geo.json')) and os.environ.get('NOGEO') != '1':
        geoman = json.load(open(os.path.join(_gp, 'geo.json')))
        sync(_gp, os.path.join(D, 'geo'), ['*.jpg', '*.b64.json'])
        for _f in glob.glob(os.path.join(D, 'geo', '*.bin')): os.remove(_f)
except Exception as e: print('geo', e)
os.makedirs(os.path.join(D, 'models'), exist_ok=True)
used = {v['file'] for v in mm.values()}
json.dump(sorted(used), open(os.path.join(H, 'used_models.json'), 'w'))
for f in glob.glob(os.path.join(D, 'models', '*')):
    bn = os.path.basename(f)
    if bn.replace('.json', '') not in used and not any(bn.startswith(u[:-4] + '__') for u in used): os.remove(f)
nopt = sum(opt_or_json(os.path.join(A, 'models', f), os.path.join(D, 'models')) == 'opt' for f in used)
print('models optimised', nopt, 'of', len(used))
for v in mm.values(): v['file'] = v['file'] + '.json'
svm = json.load(open(os.path.join(H, 'public', 'sv.json'))) if os.path.exists(os.path.join(H, 'public', 'sv.json')) and os.path.exists(os.path.join(D, 'sv.png')) else None
svmb = json.load(open(os.path.join(H, 'public', 'sv_b.json'))) if os.path.exists(os.path.join(H, 'public', 'sv_b.json')) and os.path.exists(os.path.join(D, 'sv_b.png')) else None
site = open(os.path.join(H, 'site.js')).read().strip()
inject = site + '\nwindow.TEXMAN=' + json.dumps(tm) + ';\nwindow.HDRIMAN=' + json.dumps(hm) + ';\nwindow.MODELMAN=' + json.dumps(mm) + ';\nwindow.SNDMAN=' + json.dumps(sm) + ';\nwindow.SVMAN=' + json.dumps(svm) + ';\nwindow.SVMAN_B=' + json.dumps(svmb) + ';\nwindow.VOICEMAN=' + json.dumps(vm, ensure_ascii=False) + ';\nwindow.PANOMAN=' + json.dumps(panoman, ensure_ascii=False) + ';\nwindow.SKYMAN=' + json.dumps(skyman) + ';\nwindow.CHARMAN=' + json.dumps(charman) + ';\nwindow.PLAYERMAN=' + json.dumps(playerman) + ';\nwindow.GIMAN_A=' + json.dumps(giman_a) + ';\nwindow.GIMAN_B=' + json.dumps(giman_b) + ';\nwindow.MUSICMAN=' + json.dumps(musicman, ensure_ascii=False) + ';\nwindow.GEOMAN=' + json.dumps(geoman, ensure_ascii=False, separators=(',', ':')) + ';\n'
# ---- bundle ----
srcs = sorted(glob.glob(os.path.join(H, 'src', '[0-9][0-9]_*.js')))
main = '\n'.join(open(f).read() for f in srcs)
open(os.path.join(H, 'src', '_main.js'), 'w').write(main)
cmd = ['npx', '--yes', 'esbuild@0.24.0', os.path.join(H, 'src', '_main.js'), '--bundle', '--format=esm', '--target=es2020', '--outfile=' + os.path.join(D, 'app.js'), '--log-level=warning']
if minify: cmd.append('--minify')
r = subprocess.run(cmd, cwd=H, capture_output=True, text=True)
if r.returncode: print(r.stdout, r.stderr); sys.exit(1)
if r.stderr.strip(): print(r.stderr[:2000])
app = open(os.path.join(D, 'app.js')).read()
# ---- HTML ----
shell = open(os.path.join(H, 'shell.html')).read()
import html as _h
ROCKETBOX_MIT = """MIT License

Copyright (c) 2020 Microsoft

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE."""
D3CEL_BSD = """Copyright (c) 2015, Olaf Frohn
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE."""
def credits_html():
    items = ['Fotomaterialien (Holz, Lehmputz, Schiefer, Kies, Rasen …) und Umgebungslicht: Poly Haven und ambientCG, CC0',
             '3D-Möbel, Gartenmöbel und Gerät (Regentonne, Stiefel, Kisten, Leiter, Kompost, Spaten, Reifen, Kanister), Pflanzen, Tanne, Gras und Farne: Poly Haven, CC0',
             'Himmel je Tageszeit (Fotos) und Holz-, Wellplatten- und Blechtexturen: Poly Haven, CC0',
             'Laubbäume und Wiesengras: ez-tree von Daniel Greenheck, MIT-Lizenz',
             'Geräusche ohne Namensnennungspflicht: Kenney (CC0), radio aporee / archive.org (Public Domain)',
             'Hubert: „Old Man Idle“ von jamie.piggott, https://sketchfab.com/models/8ec8f8a2022d491fa0d74279c4f07304 (CC BY 4.0)',
             'Ronald: „Fat man rigged“ von Mohammed.Dael.Alshogaa, https://sketchfab.com/models/0b32d738ebf84e27a1137b3748ef6ab6 (CC BY 4.0), Strohhut selbst modelliert',
             'Ziegen: „goat animation“ von dinomaster, https://sketchfab.com/models/6efcfd71eb54471da0ddeccc79336d80 (CC BY 4.0), eingefärbt; Laufen und Grasen nachträglich animiert',
             'Gehbewegung der Nachbarn: „_mixamo_Walking“ von tkomair, https://sketchfab.com/models/b5d14a14ac6b48f9afa23f4e63c6647a (CC BY 4.0), auf beide Figuren übertragen',
             'Huberts Traktor: „Weathered Tractor“ von ArtDmitriyK, https://sketchfab.com/models/d891c103cddd44b69d1357c832d9ad56 (CC BY 4.0), vereinfacht',
             'Stimmen von Hubert und Ronald: Microsoft-Edge-Vorlesestimmen („Conrad“ und „Florian“, neuronal), erzeugt mit edge-tts – für dieses private, nicht kommerzielle Modell',
             'Klavier, E-Piano, Ukulele und die Arbeitsgeräusche der Aufgaben: im Browser synthetisiert',
             'Nachthimmel: Sterne bis zur 6. Größe aus dem Hipparcos-Katalog (ESA) und Umrisse der Milchstraße, aufbereitet von Olaf Frohn für d3-celestial, BSD-3-Clause-Lizenz, Copyright (c) 2015 Olaf Frohn, https://github.com/ofrohn/d3-celestial (Lizenztext unten); Sonne und Mond selbst berechnet (NOAA-Formeln, Kurzreihen des Astronomical Almanac)']
    if playerman: items += ['Spielfiguren (Mann: „Delivery_Male_01“, Frau: „Female_Adult_04“) und ihre Bewegungen Stehen, Gehen, Laufen, Rennen, Hocken, Sitzen, Winken, Arbeiten: Microsoft Rocketbox Avatar Library, MIT-Lizenz, Copyright (c) 2020 Microsoft, https://github.com/microsoft/Microsoft-Rocketbox (Lizenztext unten)',
                            'Weitere Bewegungen der Spielfiguren (Springen, Kriechen, Liegen, Tragen, Hacken, Aufheben, Knien, Gießen): Mesh2Motion-Animationsbibliothek von Scott Petrovic, CC0, https://github.com/scottpetrovic/mesh2motion-app – auf die Figuren übertragen']
    if geoman: items += ['Umgebung von Ratscher – Luftbilder (DOP 20 cm, Farbinfrarot), Geländemodell DGM1 und Oberflächenmodell DOM1: © GDI-Th, Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0), https://www.geoportal-th.de',
                         'Karte, Gebäudegrundrisse, Gewässer und Namen: © OpenStreetMap-Mitwirkende, Open Database License (ODbL), https://www.openstreetmap.org/copyright',
                         'Fernes Gelände: Copernicus DEM GLO-30 © DLR e.V. 2010–2014 und © Airbus Defence and Space GmbH 2014–2018, bereitgestellt im Rahmen von COPERNICUS durch die Europäische Union und die ESA',
                         'Gebäude (Dachformen aus dem Oberflächenmodell), Bäume (aus dem Kronenhöhenmodell) und Kartenbild: daraus selbst berechnet']
    for m in musicman: items.append('Schallplatte: ' + m['title'] + (' – ' + m['by'] if m.get('by') else '') + ', ' + m.get('lic', 'gemeinfrei') + ', Wikimedia Commons: ' + m.get('src', ''))
    try:
        for line in open(os.path.join(A, 'snd', 'CREDITS.md')):
            line = line.strip()
            if line.startswith('- '):
                t = re.sub(r'`([^`]*)`', r'\1', line[2:]); t = re.sub(r'\s*\(https?://creativecommons[^)]*\)', '', t)
                items.append(t)
    except Exception as e: print('credits', e)
    lis = ''.join('<li>' + re.sub(r'(https?://\S+)', lambda m: '<a href="' + m.group(1) + '" target="_blank" rel="noopener">' + _h.escape(m.group(1)) + '</a>', _h.escape(t).replace('&amp;', '&')) + '</li>' for t in items)
    mit = ''
    if playerman: mit = '<details class="lic"><summary>MIT-Lizenz der Microsoft-Rocketbox-Figuren</summary><pre>' + _h.escape(ROCKETBOX_MIT) + '</pre></details>'
    mit += '<details class="lic"><summary>BSD-Lizenz der Sterndaten (d3-celestial)</summary><pre>' + _h.escape(D3CEL_BSD) + '</pre></details>'
    return '<details class="credits"><summary>Quellen und Lizenzen</summary><ul>' + lis + '</ul>' + mit + '</details>'
shell = shell.replace('<!--CREDITS-->', credits_html())
def page(extra_head=''):
    js = app.replace('</script', '<\\/script')
    return shell.replace('<!--SCRIPTS-->', '<script>' + extra_head + 'window.addEventListener("error",e=>{const l=document.getElementById("loading");if(l){l.hidden=false;l.textContent="Das 3D-Modell konnte nicht geladen werden ("+(e.message||"Fehler")+").";}});\n' + inject + '</script>\n<script type="module">\n' + js + '\n</script>')
open(os.path.join(D, 'pavillon-ratscher.html'), 'w').write(page())
open(os.path.join(D, 'index.html'), 'w').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + page('window.OFFLINE=!!new URLSearchParams(location.search).get("offline");') + '</body></html>')
# fewer files: the images of the glTF models (props, grass, figures) go into their JSON as data URIs – one published version of the
# Claude artifact holds at most 511 files (PACK=0 keeps them separate)
def pack_gltf(dirs):
    import base64
    MT = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ktx2': 'image/ktx2'}
    drop, n = set(), 0
    for dirp in dirs:
        for jf in glob.glob(os.path.join(dirp, '*.json')):
            try: js = json.load(open(jf))
            except Exception: continue
            if not isinstance(js, dict) or 'asset' not in js or not js.get('images'): continue
            ch = False
            for im in js['images']:
                u = im.get('uri')
                if not u or u.startswith('data:'): continue
                p = os.path.join(dirp, u)
                if not os.path.exists(p): continue
                mt = im.get('mimeType') or MT.get(os.path.splitext(p)[1].lower(), 'application/octet-stream')
                im['uri'] = 'data:' + mt + ';base64,' + base64.b64encode(open(p, 'rb').read()).decode(); drop.add(p); ch = True
            if ch: open(jf, 'w').write(json.dumps(js, separators=(',', ':'))); n += 1
    for p in drop: os.remove(p)
    return n, len(drop)
if os.environ.get('PACK', '1') == '1': print('packed glTF', pack_gltf([os.path.join(D, s) for s in ('models', 'grass', 'chars')]))
tot = sum(os.path.getsize(f) for f in glob.glob(os.path.join(D, '**', '*'), recursive=True) if os.path.isfile(f) and not f.endswith('index.html'))
print('built', len(app) // 1024, 'KB app;', 'tex', len(tm), 'hdri', len(hm), 'models', len(mm), 'snd', len(sm), 'sv', bool(svm), '; dist total', round(tot / 1e6, 1), 'MB')
