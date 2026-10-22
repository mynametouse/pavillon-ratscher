"""One-time rename of the neighbours (Falko, 22.10.2026): Hubert (west, tractor) -> Günter, Ronald (east, goats) -> Bernd.
Works on the built asset set (viz3/dist, fetched from gh-pages - no originals needed) and on viz3/manifests.json:
- voice lines: ids, files and speaker renamed (hubert_* -> guenter_*, ronald_* -> bernd_*); lines whose text names a neighbour are spoken
  anew with the same edge-tts voice, rate and pitch and the same ffmpeg chain as tools/voices/lines3.py, durations updated
- dialogue topics: keys and labels; character files chars/<name>.json, the clip sets in chars/clips.json and the character manifest
- files named after the old names are removed from the asset dir, so the next publish leaves none behind
    python3 -I tools/voices/rename_neighbours.py viz3/dist viz3/manifests.json [--dry]
The app code (ids 'hubert'/'ronald', texts, saved keys) is renamed separately; saved games migrate through SAVE."""
import sys, os, json, re, shutil, ssl, asyncio, subprocess, tempfile

DIST, MAN = sys.argv[1], sys.argv[2]; DRY = '--dry' in sys.argv
NEW = {'hubert': 'guenter', 'ronald': 'bernd'}
TEXT = [('Huberts', 'Günters'), ('Hubert', 'Günter'), ('Ronalds', 'Bernds'), ('Ronald', 'Bernd')]
VOICES = {'guenter': dict(voice='de-DE-ConradNeural', rate='-10%', pitch='-8Hz', af='highpass=f=70,lowpass=f=9000'),   # as lines3.py
          'bernd': dict(voice='de-DE-FlorianMultilingualNeural', rate='+2%', pitch='-2Hz', af='highpass=f=80')}

def retext(t):
    for a, b in TEXT: t = re.sub(r'\b' + a + r'\b', b, t)
    return t

def speak(who, text, mp3):
    import edge_tts, edge_tts.communicate as C
    ca = '/root/.ccr/ca-bundle.crt'   # TLS proxy of the cloud sandbox, if present
    if os.path.exists(ca): C._SSL_CTX = ssl.create_default_context(cafile=ca)
    v = VOICES[who]; raw = tempfile.mktemp(suffix='.mp3')
    asyncio.run(edge_tts.Communicate(text.replace('…', ','), v['voice'], rate=v['rate'], pitch=v['pitch']).save(raw))
    af = ("silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:"
          f"start_silence=0.12,areverse,{v['af']},loudnorm=I=-17:TP=-1.5:LRA=9")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '56k', mp3], check=True); os.remove(raw)
    return round(float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3],
                                      capture_output=True, text=True).stdout.strip() or 0), 2)

M = json.load(open(MAN)); vm = M['vm']; old_files = []
for ln in vm['lines']:
    who = ln.get('who')
    if who not in NEW: continue
    nw = NEW[who]; oid = ln['id']; text = retext(ln['text'])
    nid = nw + re.sub(r'(?<=_)(hubert|ronald)(?=_|$)', lambda m: NEW[m.group(1)], oid[len(who):])   # topic 'hubert' of Ronald too
    src = os.path.join(DIST, 'snd', ln['file']); dst = os.path.join(DIST, 'snd', 'voice', nid + '.mp3')
    if text != ln['text']:
        print('speak', nid, '|', text, flush=True)
        if not DRY: ln['dur'] = speak(nw, text, dst)
    else:
        print('copy ', nid, flush=True)
        if not DRY: shutil.copy2(src, dst)
    old_files.append(src); ln.update(who=nw, id=nid, file='voice/' + nid + '.mp3', text=text)
vm['topics'] = {NEW.get(w, w): {NEW.get(k, k): retext(lbl) for k, lbl in t.items()} for w, t in vm['topics'].items()}
cm = M.get('charman') or {}
for o, n in NEW.items():
    if o in cm:
        src, dst = os.path.join(DIST, 'chars', cm[o]), os.path.join(DIST, 'chars', n + '.json')
        print('char ', o, '->', n, flush=True)
        if not DRY: shutil.copy2(src, dst)
        old_files.append(src); cm[n] = n + '.json'; del cm[o]
# animation clips per character (chars/clips.json: one key per character)
cf = os.path.join(DIST, 'chars', cm.get('clips', 'clips.json'))
if os.path.exists(cf):
    clips = json.load(open(cf))
    if any(o in clips for o in NEW):
        print('clips', [o for o in NEW if o in clips], flush=True)
        if not DRY: json.dump({NEW.get(k, k): v for k, v in clips.items()}, open(cf, 'w'), separators=(',', ':'))
if isinstance(M.get('credits'), str): M['credits'] = retext(M['credits'])   # the credits list, cached for fast builds
if DRY: sys.exit(print('dry run - nothing written'))
for f in old_files:
    if os.path.exists(f): os.remove(f)
json.dump(M, open(MAN, 'w'), ensure_ascii=False, separators=(',', ':'))
left = [f for f in os.listdir(os.path.join(DIST, 'snd', 'voice')) if re.match(r'(hubert|ronald)_', f)]
print('done:', len(vm['lines']), 'lines,', len(old_files), 'old files removed; left with old names:', left)
