# Free sound for the game: fetch, check the licence, process, measure, transcribe, list – for every sound agent (ton-musik, ton-welt,
# ton-motoren, …). Runs on GitHub Actions (.github/workflows/ton-holen.yml); the audio stays a workflow artifact until the sound repository
# (mynametouse/pavillon-ton) exists, the small text results go to tools/ton/messung/ (committed back by the workflow). Format and options:
# tools/ton/README.md.
#
#   python3 tools/ton/holen.py pruefen                      check the manifests (offline, quick)
#   python3 tools/ton/holen.py gruppen                      the groups for the Actions matrix (JSON)
#   python3 tools/ton/holen.py bearbeiten GRUPPE AUS        fetch + licence + process + measure + transcribe one group into AUS/
#   python3 tools/ton/holen.py sammeln AUS TEIL...          merge the groups: AUS/ton/ (sound repository layout), tools/ton/messung/
#   python3 tools/ton/holen.py hoerprobe                    build tools/ton/hoerprobe/index.html from the lists
#   python3 tools/ton/holen.py --selbsttest                 an ffmpeg tone + noise through the whole chain (no network)
#
# Environment: TON_CACHE (downloads and finished files, default ~/.cache/pavillon-ton), TON_WHISPER=0 (no transcription),
# TON_WHISPER_MODELL (default 'small'). No AI sound here at all: Falko, 13.11.2026 23:54 – no ElevenLabs credits; entries
# "kind": "eleven_sfx" are refused (free recordings, or ton-welt / ton-motoren synthesise the gap themselves).
import datetime, hashlib, html, json, math, os, re, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request

H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(H, '..', '..'))
QUELLEN = os.path.join(H, 'quellen')
MESSUNG = os.path.join(H, 'messung')
HOERPROBE = os.path.join(H, 'hoerprobe')
CACHE = os.environ.get('TON_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'pavillon-ton')
VERSION = 'p1'  # the processing chain below: a new version processes everything again
RATE = 44100
UA = 'pavillon-ton/1.0 (free-music licence check; +https://github.com/mynametouse/pavillon-ratscher)'
GH = bool(os.environ.get('GITHUB_ACTIONS'))

# ---- kinds: where the file goes and how loud it is ----
# pegel: {'lufs': x} integrated loudness with true peak <= tp, or {'peak': x} sample peak (point sources, effects)
KINDS = {
    'musik': {'ordner': 'musik/{sender}', 'pegel': {'lufs': -16.0}, 'tp': -1.0, 'kbps': 128, 'kanaele': 2},
    'score': {'ordner': 'score', 'pegel': {'lufs': -16.0}, 'tp': -1.0, 'kbps': 128, 'kanaele': 2},
    'klang': {'ordner': 'klang/{zone}', 'pegel': {'lufs': -24.0}, 'tp': -1.0, 'kbps': 96, 'kanaele': 2},
    'motor': {'ordner': 'motor', 'pegel': {'peak': -1.0}, 'tp': -1.0, 'kbps': 96, 'kanaele': 1},
}
# the shared manifest files (one group each, music one group per station)
FILE_KIND = {'musik.json': 'musik', 'score.json': 'score', 'klang.json': 'klang', 'motor.json': 'motor'}
SENDER = {'zweitakt': 'Radio Zweitakt', 'funkloch': 'Funkloch FM', 'neonfunk': 'Neonfunk', 'kirmes': 'Kirmeswelle',
          'blasius': 'Radio Blasius', 'klassik': 'Klassik am Kamm'}
SCHICHTEN = {'spannung', 'flucht', 'flucht2', '1989', 'szene', 'stich'}
STICHE = {'start', 'bestanden', 'gescheitert'}

# ---- licences: only CC0, Public Domain Mark, CC BY 3.0 (any port) and CC BY 4.0 ----
LIZENZEN = {
    'CC BY 4.0': {'url': 'https://creativecommons.org/licenses/by/4.0/',
                  'link': r'creativecommons\.org/licenses/by/4\.0',
                  'text': r'\bCC[\s-]?BY[\s-]4\.0\b|Attribution 4\.0|Attribution \(4\.0\)|Namensnennung 4\.0'},
    'CC BY 3.0': {'url': 'https://creativecommons.org/licenses/by/3.0/',
                  'link': r'creativecommons\.org/licenses/by/3\.0(?:/[a-z]{2})?/?(?![a-z-])',
                  'text': r'\bCC[\s-]?BY[\s-]3\.0\b|Attribution 3\.0|Attribution \(3\.0\)|Namensnennung 3\.0'},
    'CC0 1.0': {'url': 'https://creativecommons.org/publicdomain/zero/1.0/',
                'link': r'creativecommons\.org/publicdomain/zero/1\.0',
                'text': r'\bCC0\b|\bCC[\s-]Zero\b|Public Domain Dedication'},
    'PDM 1.0': {'url': 'https://creativecommons.org/publicdomain/mark/1.0/',
                'link': r'creativecommons\.org/publicdomain/mark/1\.0',
                'text': r'Public Domain Mark'},
}
ANDERE = r'creativecommons\.org/licenses/(by-nc-sa|by-nc-nd|by-nc|by-nd|by-sa|nc-sampling\+|sampling\+?)/[0-9.]+'
HALLUZINATION = re.compile(r'untertitel|amara\.org|vielen dank f(ü|ue)rs zuschauen|thanks? for watching|subtitles by|copyright|'
                           r'swr \d|zdf|^\W*(musik|music|applaus|applause)\W*$|♪|www\.|\.com\b|abonnier|subscribe', re.I)
# words that make a transcript worth a closer look (a hint for the screening, not a verdict)
HEIKEL = re.compile(r'\b(nazi\w*|hitler|sieg heil|heil dir|reich\w*führer|kokain|cocaine|heroin|crack|crystal|meth\w*|ficken|fick\w*|'
                    r'fuck\w*|motherf\w*|bitch\w*|hure\w*|schlampe|fotze|nigg\w*|schwuchtel|faggot|porn\w*|sex\w*|vergewaltig\w*|'
                    r'rape\w*|suizid|suicide|kill\w*|töte\w*|mord\w*|waffe\w*|gun\w*)\b', re.I)


# ---------------------------------------------------------------------------------------------------------------- small helpers
def log(*a):
    print(*a, flush=True)


def note(level, msg, datei=None):
    # GitHub annotations (public): level 'error' | 'warning' | 'notice'
    if GH:
        f = (' file=tools/ton/quellen/%s' % datei) if datei else ''
        print('::%s%s::%s' % (level, f, msg.replace('\n', ' ')), flush=True)
    else:
        print('[%s] %s%s' % (level, msg, (' (%s)' % datei) if datei else ''), flush=True)


def heute():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')


def jetzt():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def sha1(s):
    return hashlib.sha1(s.encode('utf-8')).hexdigest()


def run(cmd, inp=None, check=True):
    p = subprocess.run(cmd, input=inp, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and p.returncode != 0:
        raise RuntimeError('%s: %s' % (cmd[0], p.stderr.decode('utf-8', 'replace')[-800:]))
    return p


def schreibe_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1, sort_keys=False)
        f.write('\n')
    os.replace(path + '.tmp', path)


def lies_json(path, default=None):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def http(url, max_bytes=None, tries=3, accept=None):
    # GET with retries; returns (status, bytes, final_url, content_type). file:// works for the self-test.
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': accept or '*/*'})
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read(max_bytes + 1) if max_bytes else r.read()
                if max_bytes and len(data) > max_bytes:
                    raise RuntimeError('größer als %d MB' % (max_bytes // 1_000_000))
                return getattr(r, 'status', 200) or 200, data, r.geturl(), r.headers.get('Content-Type', '') if r.headers else ''
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (400, 401, 403, 404, 410, 451):
                break
        except Exception as e:  # noqa: BLE001 – network trouble: try again
            last = e
        time.sleep(2 + 3 * i)
    raise RuntimeError('%s: %s' % (url, last))


def fmt_sek(s):
    if s is None:
        return '–'
    s = int(round(s))
    return '%d:%02d' % (s // 60, s % 60)


# ---------------------------------------------------------------------------------------------------------------- manifests
def lade_quellen(ordner=None):
    # every tools/ton/quellen/*.json: a list of entries, or {"eintraege": [...], …}
    ordner = ordner or QUELLEN
    out = []
    for name in sorted(os.listdir(ordner)) if os.path.isdir(ordner) else []:
        if not name.endswith('.json'):
            continue
        d = lies_json(os.path.join(ordner, name))
        if d is None:
            note('error', '%s ist kein gültiges JSON' % name, name)
            out.append({'datei': name, 'eintraege': [], 'kaputt': True})
            continue
        liste = d if isinstance(d, list) else d.get('eintraege', [])
        out.append({'datei': name, 'eintraege': [dict(e, _datei=name) for e in liste if isinstance(e, dict)]})
    return out


def art(e):
    # the kind that decides folder and levels
    return e.get('kind')


def gruppe(e):
    k = art(e)
    if k == 'musik':
        return 'musik-' + str(e.get('sender', 'x'))
    return os.path.splitext(e.get('_datei', k))[0] if e.get('_datei') not in FILE_KIND else k


def ziel_pfad(e):
    k = art(e)
    ordner = KINDS[k]['ordner'].format(sender=e.get('sender', 'x'), zone=e.get('zone', 'allgemein'))
    return '%s/%s.mp3' % (ordner, e['id'])


def optionen(e):
    # everything that changes the finished file (the cache key)
    k = art(e)
    base = KINDS[k]
    loop = bool(e.get('loop'))
    pegel = e.get('pegel') or base['pegel']
    if k == 'klang' and not loop and 'pegel' not in e and not e.get('bett'):
        pegel = {'peak': -1.0}  # a point source: peak, not loudness
    kan = e.get('kanaele') or (1 if e.get('mono') else (2 if e.get('stereo') else base['kanaele']))
    if k == 'klang' and 'kanaele' not in e and not e.get('stereo') and not loop and not e.get('bett'):
        kan = 1
    kbps = e.get('kbps') or (base['kbps'] if kan == 2 else (80 if k == 'klang' else base['kbps']))
    return {'v': VERSION, 'kind': k, 'datei': e.get('datei'), 'start': e.get('start'), 'ende': e.get('ende'),
            'loop': loop, 'naht': e.get('naht'), 'pegel': pegel, 'tp': e.get('tp', base['tp']), 'kanaele': kan, 'kbps': kbps,
            'fade_in': e.get('fade_in'), 'fade_out': e.get('fade_out'), 'stille': e.get('stille', True)}


def schluessel(e):
    return sha1(json.dumps(optionen(e), sort_keys=True))[:16]


def pruefe_eintrag(e, ids):
    # returns a list of (level, message); 'error' entries are not processed
    fx = []
    i = e.get('id', '')
    if not re.match(r'^[a-z0-9][a-z0-9-]{1,47}$', str(i)):
        fx.append(('error', 'id „%s“: nur a–z, 0–9 und -, 2–48 Zeichen' % i))
    if i in ids:
        fx.append(('error', 'id „%s“ doppelt (auch in %s)' % (i, ids[i])))
    k = e.get('kind')
    if k == 'eleven_sfx':
        fx.append(('error', '%s: ElevenLabs ist abbestellt (Falko 13.11. 23:54: keine Credits) – eine freie Aufnahme suchen oder '
                            'den Klang selbst synthetisieren' % i))
    elif k in KINDS:
        for f in ('titel', 'interpret', 'lizenz', 'quelle', 'datei'):
            if not e.get(f):
                fx.append(('error', '%s: Feld „%s“ fehlt' % (i, f)))
        if e.get('lizenz') and lizenz_norm(e['lizenz']) is None:
            fx.append(('error', '%s: Lizenz „%s“ ist nicht erlaubt (nur CC0 1.0, PDM 1.0, CC BY 3.0, CC BY 4.0)' % (i, e['lizenz'])))
        for f in ('quelle', 'datei'):
            if e.get(f) and not re.match(r'^(https?|file)://', str(e[f])):
                fx.append(('error', '%s: %s ist keine URL' % (i, f)))
    else:
        fx.append(('error', '%s: kind „%s“ unbekannt (musik, score, klang, motor)' % (i, k)))
    ka = k if k in KINDS else None
    if ka == 'musik' and e.get('sender') not in SENDER:
        fx.append(('error', '%s: sender „%s“ unbekannt (%s)' % (i, e.get('sender'), ', '.join(SENDER))))
    if ka == 'score':
        if e.get('schicht') not in SCHICHTEN:
            fx.append(('error', '%s: schicht „%s“ unbekannt (%s)' % (i, e.get('schicht'), ', '.join(sorted(SCHICHTEN)))))
        if e.get('schicht') == 'stich' and e.get('stich') not in STICHE:
            fx.append(('error', '%s: stich „%s“ unbekannt (%s)' % (i, e.get('stich'), ', '.join(sorted(STICHE)))))
    if ka == 'klang' and not e.get('zone'):
        fx.append(('warning', '%s: keine zone – Ordner klang/allgemein/' % i))
    for f in ('start', 'ende', 'naht', 'fade_in', 'fade_out'):
        if f in e and e[f] is not None and not isinstance(e[f], (int, float)):
            fx.append(('error', '%s: %s muss eine Zahl (Sekunden) sein' % (i, f)))
    if isinstance(e.get('start'), (int, float)) and isinstance(e.get('ende'), (int, float)) and e['ende'] <= e['start']:
        fx.append(('error', '%s: ende ≤ start' % i))
    return fx


def lizenz_norm(s):
    # 'CC BY 3.0 DE' → ('CC BY 3.0', 'de'); unknown → None
    s = re.sub(r'\s+', ' ', str(s or '').strip()).replace('CC-BY', 'CC BY').replace('CC Zero', 'CC0 1.0')
    if s in ('CC0', 'CC0 1.0'):
        return 'CC0 1.0', None
    if s in ('PDM', 'PDM 1.0', 'Public Domain Mark', 'Public Domain Mark 1.0'):
        return 'PDM 1.0', None
    m = re.match(r'^CC BY (3\.0|4\.0)(?: ([A-Za-z]{2}))?$', s)
    if m and not (m.group(1) == '4.0' and m.group(2)):
        return 'CC BY ' + m.group(1), (m.group(2) or '').lower() or None
    return None


def lizenz_url(s):
    n = lizenz_norm(s)
    if not n:
        return None
    u = LIZENZEN[n[0]]['url']
    return u + n[1] + '/' if n[1] else u


def alle_pruefen(quellen):
    ids, fehler, warn = {}, 0, 0
    for q in quellen:
        if q.get('kaputt'):
            fehler += 1
        for e in q['eintraege']:
            for lvl, msg in pruefe_eintrag(e, ids):
                note(lvl, msg, q['datei'])
                fehler += lvl == 'error'
                warn += lvl == 'warning'
            if e.get('id'):
                ids.setdefault(e['id'], q['datei'])
    return fehler, warn, len(ids)


# ---------------------------------------------------------------------------------------------------------------- licence evidence
def _text(htm):
    s = re.sub(r'(?is)<(script|style|svg)\b.*?</\1>', ' ', htm)
    s = re.sub(r'(?s)<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def pruefe_lizenz(e, alt=None):
    # fetch the track's own page and find the licence there; archive.org: also the item's metadata
    n = lizenz_norm(e.get('lizenz'))
    ev = {'lizenz': e.get('lizenz'), 'seite': e.get('quelle'), 'datum': jetzt(), 'ok': False, 'funde': [], 'andere': []}
    if not n:
        ev['grund'] = 'Lizenz nicht erlaubt'
        return ev
    L = LIZENZEN[n[0]]
    try:
        st, data, final, ctype = http(e['quelle'], max_bytes=8_000_000, accept='text/html,application/json')
        htm = data.decode('utf-8', 'replace')
        ev['http'] = st
        if final != e['quelle']:
            ev['weiter'] = final
    except Exception as ex:  # noqa: BLE001
        if alt and alt.get('ok'):
            alt = dict(alt, wiederverwendet=True, fehler_jetzt=str(ex)[:200])
            return alt
        ev['grund'] = 'Seite nicht erreichbar: %s' % str(ex)[:200]
        return ev
    rel = re.findall(r'<a\b[^>]*\brel="license"[^>]*>', htm, re.I) + re.findall(r'<link\b[^>]*\brel="license"[^>]*>', htm, re.I)
    rel_urls = sorted(set(re.findall(r'href="([^"]+)"', ' '.join(rel))))
    if rel_urls:
        ev['rel_license'] = rel_urls
    for m in re.finditer(L['link'], htm, re.I):
        a, b = max(0, m.start() - 160), min(len(htm), m.end() + 160)
        ev['funde'].append({'art': 'link', 'treffer': m.group(0), 'ausschnitt': _text(htm[a:b])[:300]})
        if len(ev['funde']) >= 3:
            break
    txt = _text(htm)
    for m in re.finditer(L['text'], txt, re.I):
        a, b = max(0, m.start() - 120), min(len(txt), m.end() + 120)
        ev['funde'].append({'art': 'text', 'treffer': m.group(0), 'ausschnitt': txt[a:b]})
        if len(ev['funde']) >= 5:
            break
    ev['andere'] = sorted(set(m.group(0) for m in re.finditer(ANDERE, htm, re.I)))[:6]
    # archive.org: the item's metadata is the label's own statement
    m = re.match(r'https?://archive\.org/details/([^/?#]+)', e['quelle'])
    if m:
        try:
            _, md, _, _ = http('https://archive.org/metadata/%s/metadata' % m.group(1), max_bytes=4_000_000)
            meta = json.loads(md.decode('utf-8', 'replace')).get('result', {})
            lu = meta.get('licenseurl', '')
            ev['archive_licenseurl'] = lu
            if lu and re.search(L['link'], lu, re.I):
                ev['funde'].insert(0, {'art': 'metadata', 'treffer': lu, 'ausschnitt': 'archive.org metadata licenseurl'})
            elif lu:
                ev['andere'].append('metadata: ' + lu)
        except Exception as ex:  # noqa: BLE001
            ev['archive_fehler'] = str(ex)[:200]
    # the decision: a link (or metadata) for the expected licence; on pages with a rel="license" block it must be that block
    stark = [f for f in ev['funde'] if f['art'] in ('link', 'metadata')]
    if rel_urls:
        passt = [u for u in rel_urls if re.search(L['link'], u, re.I)]
        if not passt:
            ev['grund'] = 'rel="license" der Seite zeigt %s, nicht %s' % (', '.join(rel_urls), e['lizenz'])
            return ev
    if m and ev.get('archive_licenseurl') and not re.search(L['link'], ev['archive_licenseurl'], re.I):
        ev['grund'] = 'archive.org-Metadaten zeigen %s' % ev['archive_licenseurl']
        return ev
    if stark or ev['funde']:
        ev['ok'] = True
        ev['staerke'] = 'link' if stark else 'text'
        if not stark:
            ev['hinweis'] = 'nur als Text gefunden, kein Lizenz-Link'
    else:
        ev['grund'] = '%s auf der Seite nicht gefunden' % e['lizenz']
    return ev


# ---------------------------------------------------------------------------------------------------------------- audio
def hole(url):
    # download into the cache (by URL); returns the path
    os.makedirs(os.path.join(CACHE, 'dl'), exist_ok=True)
    ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
    ext = ext if re.match(r'^\.[a-z0-9]{2,5}$', ext) else '.bin'
    p = os.path.join(CACHE, 'dl', sha1(url)[:20] + ext)
    if os.path.exists(p) and os.path.getsize(p) > 1000:
        return p, True
    _, data, final, ctype = http(url, max_bytes=150_000_000)
    if ctype.startswith('text/html'):
        raise RuntimeError('statt Audio kam eine HTML-Seite (%s)' % final)
    with open(p + '.part', 'wb') as f:
        f.write(data)
    os.replace(p + '.part', p)
    return p, False


def probe(path):
    p = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,channels,sample_rate,bit_rate',
             '-of', 'json', path])
    d = json.loads(p.stdout.decode())
    a = [s for s in d.get('streams', []) if s.get('codec_type') == 'audio']
    if not a:
        raise RuntimeError('keine Tonspur')
    return {'sek': float(d.get('format', {}).get('duration') or 0), 'codec': a[0].get('codec_name'),
            'kanaele': a[0].get('channels'), 'rate': int(a[0].get('sample_rate') or 0), 'bitrate': int(a[0].get('bit_rate') or 0)}


def dekodiere(path, kan, start=None, ende=None):
    import numpy as np
    cmd = ['ffmpeg', '-v', 'error', '-nostdin']
    if start:
        cmd += ['-ss', '%.3f' % start]
    cmd += ['-i', path]
    if ende is not None:
        cmd += ['-t', '%.3f' % (ende - (start or 0))]
    cmd += ['-vn', '-ac', str(kan), '-ar', str(RATE), '-f', 'f32le', '-']
    raw = run(cmd).stdout
    x = np.frombuffer(raw, dtype='<f4').reshape(-1, kan).copy()
    if not len(x):
        raise RuntimeError('leer nach dem Dekodieren')
    return x


def stille_weg(x, schwelle_db=-55.0, vor=0.03, nach=0.12):
    # trim silence at both ends: 10 ms RMS frames below the threshold (absolute dBFS)
    import numpy as np
    f = int(RATE * 0.01)
    n = len(x) // f
    if n < 3:
        return x, 0.0, 0.0
    e = (x[:n * f] ** 2).mean(axis=1).reshape(n, f).mean(axis=1)
    db = 10 * np.log10(e + 1e-12)
    laut = np.nonzero(db > schwelle_db)[0]
    if not len(laut):
        return x, 0.0, 0.0
    a = max(0, laut[0] * f - int(vor * RATE))
    b = min(len(x), (laut[-1] + 1) * f + int(nach * RATE))
    return x[a:b], a / RATE, (len(x) - b) / RATE


def blende(x, fin, fout):
    import numpy as np
    x = x.copy()
    n = len(x)
    a = min(n // 2, int(fin * RATE))
    b = min(n // 2, int(fout * RATE))
    if a > 0:
        x[:a] *= (np.sin(np.linspace(0, math.pi / 2, a)) ** 2)[:, None]
    if b > 0:
        x[n - b:] *= (np.cos(np.linspace(0, math.pi / 2, b)) ** 2)[:, None]
    return x


def schleife(x, naht):
    # seamless loop: the tail fades into the head (equal power), the tail goes; y loops without a seam
    import numpy as np
    n = len(x)
    L = int(min(naht * RATE, n * 0.25))
    if L < 64:
        return x
    t = np.linspace(0, math.pi / 2, L)[:, None]
    y = x[:n - L].copy()
    y[:L] = x[:L] * np.sin(t) + x[n - L:] * np.cos(t)
    return y


def schreibe_wav(path, x):
    import numpy as np
    kan = x.shape[1]
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', str(kan), '-i', '-', '-c:a', 'pcm_f32le', path],
        inp=np.ascontiguousarray(x, dtype='<f4').tobytes())


def r128(path):
    # integrated loudness (LUFS), loudness range, true peak (dBTP) and sample peak (dBFS) with ffmpeg's ebur128
    p = run(['ffmpeg', '-v', 'info', '-nostdin', '-i', path, '-af', 'ebur128=peak=true+sample', '-f', 'null', '-'])
    s = p.stderr.decode('utf-8', 'replace')
    s = s[s.rfind('Summary:'):]

    def num(pat):
        m = re.search(pat, s, re.S)
        return float(m.group(1)) if m and m.group(1) not in ('-inf', 'inf', 'nan') else None
    return {'lufs': num(r'Integrated loudness:\s*I:\s*(-?[0-9.]+|-inf)'), 'lra': num(r'Loudness range:\s*LRA:\s*(-?[0-9.]+)'),
            'tp': num(r'True peak:\s*Peak:\s*(-?[0-9.]+|-inf)'), 'peak': num(r'Sample peak:\s*Peak:\s*(-?[0-9.]+|-inf)')}


def begrenze(x, grenze_db):
    # a gentle look-ahead limiter at 4x oversampling (ffmpeg alimiter), only when the target loudness needs it
    import numpy as np
    with tempfile.TemporaryDirectory() as td:
        a, b = os.path.join(td, 'a.wav'), os.path.join(td, 'b.f32')
        schreibe_wav(a, x)
        lim = 10 ** (grenze_db / 20)
        run(['ffmpeg', '-v', 'error', '-y', '-i', a, '-af',
             'aresample=%d,alimiter=limit=%.5f:attack=2:release=80:level=false,aresample=%d' % (RATE * 4, lim, RATE),
             '-f', 'f32le', b])
        y = np.fromfile(b, dtype='<f4').reshape(-1, x.shape[1])
    if len(y) > len(x):
        y = y[:len(x)]
    return y


def pegeln(x, opt, td):
    # bring x to its target: loudness with a true-peak ceiling, or a sample peak
    import numpy as np
    w = os.path.join(td, 'm.wav')
    schreibe_wav(w, x)
    m = r128(w)
    info = {'vorher': m}
    tp_ziel = float(opt['tp'])
    if 'peak' in opt['pegel']:
        pk = float(np.abs(x).max())
        if pk <= 0:
            raise RuntimeError('stumm')
        g = opt['pegel']['peak'] - 20 * math.log10(pk)
        info.update(ziel='peak %.1f dBFS' % opt['pegel']['peak'], gain_db=round(g, 2))
        return x * (10 ** (g / 20)), info
    ziel = float(opt['pegel']['lufs'])
    if m['lufs'] is None:
        raise RuntimeError('Lautheit nicht messbar (zu kurz oder stumm)')
    g = ziel - m['lufs']
    tp = m['tp'] if m['tp'] is not None else 20 * math.log10(float(np.abs(x).max()) + 1e-9)
    luft = (tp_ziel - 0.3) - (tp + g)  # 0.3 dB room for the MP3 encoder
    info.update(ziel='%.0f LUFS, TP ≤ %.0f dBTP' % (ziel, tp_ziel), gain_db=round(g, 2))
    y = x * (10 ** (g / 20))
    if luft < 0:
        if -luft <= 6.0:
            y = begrenze(y, tp_ziel - 0.8)
            info['begrenzt_db'] = round(-luft, 2)
        else:
            g2 = g + luft + 6.0
            y = begrenze(x * (10 ** (g2 / 20)), tp_ziel - 0.8)
            info['begrenzt_db'] = 6.0
            info['leiser_db'] = round(g - g2, 2)
    return y, info


def kodiere(src_wav, out_mp3, opt, tags):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', src_wav, '-c:a', 'libmp3lame', '-b:a', '%dk' % opt['kbps'],
           '-ac', str(opt['kanaele']), '-ar', str(RATE), '-id3v2_version', '3', '-write_xing', '1']
    for k, v in tags.items():
        if v:
            cmd += ['-metadata', '%s=%s' % (k, str(v)[:250])]
    run(cmd + [out_mp3])


def naht_messen(x):
    # the loop seam: play x three times and look at the two joints – sample jump and spectral flux against the file itself
    import numpy as np
    m = x.mean(axis=1) if x.ndim == 2 else x
    d = np.abs(np.diff(m))
    typ = float(np.percentile(d, 99.5)) + 1e-9
    sprung = float(np.abs(m[0] - m[-1]))
    y = np.concatenate([m, m, m])
    N, hop = 2048, 512
    win = np.hanning(N)
    frames = (len(y) - N) // hop
    if frames < 8:
        return {'sprung': round(sprung, 5), 'sprung_rel': round(sprung / typ, 3), 'ok': sprung <= typ}
    idx = np.arange(N)[None, :] + hop * np.arange(frames)[:, None]
    S = np.abs(np.fft.rfft(y[idx] * win, axis=1))
    S = np.log1p(S * 10)
    fl = np.maximum(0, np.diff(S, axis=0)).sum(axis=1)
    med, mad = float(np.median(fl)), float(np.median(np.abs(fl - np.median(fl)))) + 1e-9
    z = []
    for j in (len(m), 2 * len(m)):
        f0 = max(0, (j - N) // hop - 1)
        f1 = min(len(fl), j // hop + 2)
        z.append(float((fl[f0:f1].max() - med) / (1.4826 * mad)))
    # flux at the joints compared with the worst moments inside one pass
    inner = fl[: max(1, len(m) // hop - N // hop)]
    p995 = float(np.percentile(inner, 99.5)) if len(inner) > 10 else float(fl.max())
    jmax = max(fl[max(0, (j - N) // hop - 1):min(len(fl), j // hop + 2)].max() for j in (len(m), 2 * len(m)))
    ok = sprung <= typ * 1.0 and jmax <= p995 * 1.05
    return {'sprung': round(sprung, 5), 'sprung_rel': round(sprung / typ, 3), 'fluss_z': round(max(z), 2),
            'fluss_rel': round(jmax / (p995 + 1e-9), 3), 'ok': bool(ok)}


# ---------------------------------------------------------------------------------------------------------------- transcription
_MODELL = None


def whisper_da():
    if os.environ.get('TON_WHISPER', '1') == '0':
        return False
    try:
        import faster_whisper  # noqa: F401
        return True
    except Exception:  # noqa: BLE001
        return False


def transkribiere(wav):
    global _MODELL
    from faster_whisper import WhisperModel
    if _MODELL is None:
        _MODELL = WhisperModel(os.environ.get('TON_WHISPER_MODELL', 'small'), device='cpu', compute_type='int8',
                               cpu_threads=int(os.environ.get('TON_WHISPER_THREADS', '0') or 0))
    t0 = time.time()
    segs, info = _MODELL.transcribe(wav, language=None, beam_size=1, temperature=0.0, condition_on_previous_text=False,
                                    vad_filter=True, vad_parameters={'threshold': 0.35, 'min_silence_duration_ms': 700})
    out = []
    for s in segs:
        t = s.text.strip()
        if not t:
            continue
        zweifel = bool(HALLUZINATION.search(t)) or s.compression_ratio > 2.4 or s.avg_logprob < -1.25 or s.no_speech_prob > 0.75
        out.append({'a': round(s.start, 2), 'b': round(s.end, 2), 't': t, 'lp': round(s.avg_logprob, 2),
                    'ns': round(s.no_speech_prob, 2), 'z': zweifel})
    sicher = [s for s in out if not s['z']]
    return {'sprache': info.language, 'sicherheit': round(info.language_probability, 2), 'segmente': out,
            'gesang_ab': sicher[0]['a'] if sicher else None, 'gesang_bis': sicher[-1]['b'] if sicher else None,
            'woerter': sum(len(s['t'].split()) for s in sicher), 'sek_rechnen': round(time.time() - t0, 1),
            'heikel': sorted(set(w.lower() for s in sicher for w in HEIKEL.findall(s['t'])))}


def transkript_text(e, tr):
    z = ['%s – %s (%s)' % (e.get('titel', e['id']), e.get('interpret', ''), e['id']),
         'Sprache erkannt: %s (%.0f %%), Wörter: %d, Gesang ab %s bis %s' % (
             tr.get('sprache'), 100 * (tr.get('sicherheit') or 0), tr.get('woerter', 0), fmt_sek(tr.get('gesang_ab')),
             fmt_sek(tr.get('gesang_bis'))), '']
    for s in tr.get('segmente', []):
        z.append('[%s–%s]%s %s' % (fmt_sek(s['a']), fmt_sek(s['b']), ' (?)' if s['z'] else '', s['t']))
    if tr.get('heikel'):
        z += ['', 'Zum genauen Hinsehen: ' + ', '.join(tr['heikel'])]
    return '\n'.join(z) + '\n'


# ---------------------------------------------------------------------------------------------------------------- one entry
def bearbeite(e, aus, alt):
    # returns the record written to messung/<kind>/<id>.json
    k = art(e)
    opt = optionen(e)
    key = schluessel(e)
    rec = {'id': e['id'], 'kind': k, 'gruppe': gruppe(e), 'schluessel': key, 'stand': jetzt(), 'ok': False, 'meldungen': [],
           'eintrag': {f: v for f, v in e.items() if not f.startswith('_')}, 'optionen': opt}
    ziel = os.path.join(aus, 'ton', ziel_pfad(e))
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    fertig = os.path.join(CACHE, 'fertig', key + '.mp3')
    # 1 · licence
    rec['lizenz'] = pruefe_lizenz(e, (alt or {}).get('lizenz'))
    if not rec['lizenz'].get('ok'):
        note('error', '%s: Lizenz nicht belegt – %s (%s)' % (e['id'], rec['lizenz'].get('grund'), e.get('quelle')), e.get('_datei'))
        rec['meldungen'].append('Lizenz nicht belegt: %s' % rec['lizenz'].get('grund'))
        return rec
    if rec['lizenz'].get('andere'):
        note('warning', '%s: auf der Seite stehen auch andere Lizenzen (%s) – bitte ansehen' % (
            e['id'], ', '.join(rec['lizenz']['andere'][:3])), e.get('_datei'))
    # 2 · reuse a finished file with the same key
    if alt and alt.get('ok') and alt.get('schluessel') == key and os.path.exists(fertig):
        shutil.copyfile(fertig, ziel)
        for f in ('quelle_info', 'verarbeitung', 'messung', 'transkript'):
            if f in alt:
                rec[f] = alt[f]
        rec.update(ok=True, datei=ziel_pfad(e), bytes=os.path.getsize(ziel), wieder=True)
        if 'transkript' in rec or not braucht_transkript(e):
            return rec
    with tempfile.TemporaryDirectory() as td:
        # 3 · source
        try:
            src, aus_cache = hole(e['datei'])
        except Exception as ex:  # noqa: BLE001
            note('error', '%s: Datei nicht zu holen – %s' % (e['id'], str(ex)[:200]), e.get('_datei'))
            rec['meldungen'].append('Datei nicht zu holen: %s' % str(ex)[:200])
            return rec
        try:
            rec['quelle_info'] = probe(src)
            rec['quelle_info']['bytes'] = os.path.getsize(src)
            if rec['quelle_info']['sek'] > 25 * 60 and e.get('ende') is None:
                raise RuntimeError('Quelle %.0f min lang – bitte start/ende angeben' % (rec['quelle_info']['sek'] / 60))
            # 4 · process
            x = dekodiere(src, opt['kanaele'], e.get('start'), e.get('ende'))
            ver = {'roh_sek': round(len(x) / RATE, 2)}
            if opt['stille']:
                x, vorn, hinten = stille_weg(x)
                ver.update(stille_vorn=round(vorn, 2), stille_hinten=round(hinten, 2))
            if opt['loop']:
                naht = float(e['naht']) if e.get('naht') else (1.0 if k in ('klang', 'musik', 'score') else 0.15)
                x = blende(x, 0, 0)
                x = schleife(x, naht)
                ver['naht_sek'] = naht
            else:
                fin = e.get('fade_in')
                fout = e.get('fade_out')
                if fin is None:
                    fin = 0.6 if e.get('start') else (0.004 if k in ('motor', 'klang') else 0.01)
                if fout is None:
                    fout = 2.5 if e.get('ende') is not None and k in ('musik', 'score') else (0.6 if e.get('ende') is not None else 0.03)
                x = blende(x, fin, fout)
                ver.update(fade_in=fin, fade_out=fout)
            y, ver['pegel'] = pegeln(x, opt, td)
            w = os.path.join(td, 'fertig.wav')
            schreibe_wav(w, y)
            tags = {'title': e.get('titel') or e['id'], 'artist': e.get('interpret') or '',
                    'album': e.get('album'), 'copyright': '%s – %s' % (e.get('lizenz'), lizenz_url(e.get('lizenz')) or ''),
                    'comment': 'Quelle: %s · %s' % (e.get('quelle'), lizenz_url(e.get('lizenz')) or ''),
                    'publisher': 'Pavillon Ratscher (bearbeitet: geschnitten, Pegel %s)' % ver['pegel'].get('ziel')}
            mp3 = os.path.join(td, 'fertig.mp3')
            kodiere(w, mp3, opt, tags)
            # 5 · measure the finished MP3 (decoded as a browser would)
            for _ in range(3):
                # the encoder shifts level and peaks a little: correct once or twice against the decoded MP3
                mm = r128(mp3)
                g = 0.0
                if 'lufs' in opt['pegel'] and mm['lufs'] is not None:
                    g = opt['pegel']['lufs'] - mm['lufs']
                    if mm['tp'] is not None:
                        g = min(g, opt['tp'] - 0.15 - mm['tp'])
                    if ver['pegel'].get('leiser_db') and g > 0:
                        g = 0.0  # already as loud as the ceiling allows
                elif 'peak' in opt['pegel'] and mm['peak'] is not None:
                    g = opt['pegel']['peak'] - mm['peak']
                if abs(g) < 0.25:
                    break
                y = y * (10 ** (g / 20))
                schreibe_wav(w, y)
                kodiere(w, mp3, opt, tags)
                ver['nachgeregelt_db'] = round(g + ver.get('nachgeregelt_db', 0), 2)
            z = dekodiere(mp3, opt['kanaele'])
            mess = {'sek': round(len(z) / RATE, 3), 'samples': int(len(z)), 'rate': RATE, 'kanaele': opt['kanaele'],
                    'kbps': opt['kbps'], 'lufs': mm['lufs'], 'lra': mm['lra'], 'tp': mm['tp'], 'peak': mm['peak'],
                    'bytes': os.path.getsize(mp3)}
            if opt['loop']:
                mess['naht'] = naht_messen(z)
                if not mess['naht']['ok']:
                    note('warning', '%s: Schleifennaht auffällig (Sprung %.2f×, Fluss %.2f×)' % (
                        e['id'], mess['naht']['sprung_rel'], mess['naht'].get('fluss_rel', 0)), e.get('_datei'))
            rec['verarbeitung'] = ver
            rec['messung'] = mess
            # 6 · transcribe
            if braucht_transkript(e):
                if alt and alt.get('transkript') and alt.get('schluessel') == key:
                    rec['transkript'] = alt['transkript']
                elif whisper_da():
                    w16 = os.path.join(td, 'w16.wav')
                    run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', w16])
                    rec['transkript'] = transkribiere(w16)
                else:
                    rec['meldungen'].append('nicht transkribiert (faster-whisper fehlt)')
            os.makedirs(os.path.dirname(fertig), exist_ok=True)
            shutil.copyfile(mp3, fertig)
            shutil.copyfile(mp3, ziel)
            rec.update(ok=True, datei=ziel_pfad(e), bytes=os.path.getsize(ziel))
        except Exception as ex:  # noqa: BLE001
            note('error', '%s: Verarbeitung fehlgeschlagen – %s' % (e['id'], str(ex)[:300]), e.get('_datei'))
            rec['meldungen'].append('Verarbeitung: %s' % str(ex)[:300])
    return rec


def braucht_transkript(e):
    if e.get('transkript') is not None:
        return bool(e['transkript'])
    return art(e) == 'musik' or bool(e.get('gesang'))


# ---------------------------------------------------------------------------------------------------------------- commands
def cmd_pruefen():
    q = lade_quellen()
    f, w, n = alle_pruefen(q)
    log('pruefen: %d Einträge in %d Listen, %d Fehler, %d Hinweise' % (n, len(q), f, w))
    return 1 if f else 0


def cmd_gruppen():
    gs = []
    for q in lade_quellen():
        for e in q['eintraege']:
            if e.get('kind') in KINDS:
                g = gruppe(e)
                if g not in gs:
                    gs.append(g)
    nur = [g.strip() for g in os.environ.get('TON_NUR', '').split(',') if g.strip()]
    if nur:
        gs = [g for g in gs if g in nur or any(g.startswith(n) for n in nur)]
    print(json.dumps({'gruppe': gs or ['keine']}))
    return 0


def alt_record(e):
    return lies_json(os.path.join(MESSUNG, art(e), e['id'] + '.json')) if art(e) in KINDS else None


def cmd_bearbeiten(g, aus):
    q = lade_quellen()
    ids = {}
    t0 = time.time()
    n_ok = n = 0
    for liste in q:
        es = [e for e in liste['eintraege'] if e.get('kind') in KINDS and gruppe(e) == g]
        for e in [e for e in liste['eintraege'] if e.get('kind') not in KINDS]:
            for l, m in pruefe_eintrag(e, {}):
                note(l, m, liste['datei'])
        for e in es:
            fx = pruefe_eintrag(e, ids)
            ids.setdefault(e.get('id'), liste['datei'])
            if any(l == 'error' for l, _ in fx):
                for l, m in fx:
                    note(l, m, liste['datei'])
                continue
            n += 1
            log('· %s (%s)' % (e['id'], e.get('titel') or e.get('prompt', '')[:40]))
            rec = bearbeite(e, aus, alt_record(e))
            schreibe_json(os.path.join(aus, 'messung', rec['kind'], e['id'] + '.json'), rec)
            if rec.get('transkript'):
                p = os.path.join(aus, 'messung', 'transkripte', e['id'] + '.txt')
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, 'w', encoding='utf-8') as f:
                    f.write(transkript_text(e, rec['transkript']))
            if rec['ok']:
                n_ok += 1
                m = rec.get('messung', {})
                tr = rec.get('transkript') or {}
                log('    ok %s · %s LUFS · TP %s · %s%s' % (fmt_sek(m.get('sek')), m.get('lufs'), m.get('tp'),
                                                       ('Gesang %s–%s' % (fmt_sek(tr.get('gesang_ab')), fmt_sek(tr.get('gesang_bis'))))
                                                       if tr else 'ohne Transkript', ' (aus dem Cache)' if rec.get('wieder') else ''))
    schreibe_json(os.path.join(aus, 'teil.json'), {'gruppe': g, 'n': n, 'ok': n_ok, 'sek': round(time.time() - t0), 'stand': jetzt()})
    log('bearbeiten %s: %d von %d fertig in %d s' % (g, n_ok, n, time.time() - t0))
    return 0


def index_eintrag(e, rec):
    m = rec.get('messung', {})
    tr = rec.get('transkript') or {}
    k = rec['kind']
    lz = e.get('lizenz')
    d = {'id': e['id'], 'kind': k, 'file': rec['datei'], 'title': e.get('titel') or e['id'], 'author': e.get('interpret') or '',
         'album': e.get('album') or None, 'licence': lz, 'licence_url': lizenz_url(e.get('lizenz')),
         'source': e.get('quelle'), 'checked': (rec.get('lizenz') or {}).get('datum', '')[:10], 'sec': m.get('sek'),
         'samples': m.get('samples'), 'rate': m.get('rate'), 'channels': m.get('kanaele'), 'kbps': m.get('kbps'),
         'lufs': m.get('lufs'), 'peak': m.get('tp'), 'loop': bool(e.get('loop')), 'bytes': rec.get('bytes')}
    if k == 'musik':
        d['sender'] = e.get('sender')
    if k == 'score':
        d['schicht'] = e.get('schicht')
        if e.get('stich'):
            d['stich'] = e['stich']
        for f in ('tempo', 'tonart', 'stufe'):
            if e.get(f) is not None:
                d[f] = e[f]
    if k == 'klang':
        d['zone'] = e.get('zone')
    if k == 'motor':
        d['fahrzeug'] = e.get('fahrzeug')
    for f in ('lage', 'tag', 'rpm', 'last'):
        if e.get(f) is not None:
            d[f] = e[f]
    if e.get('loop') and m.get('naht'):
        d['seam_ok'] = m['naht'].get('ok')
    if tr:
        d['lang'] = tr.get('sprache') if tr.get('woerter', 0) >= 8 else (e.get('sprache') or '-')
        d['vocals'] = tr.get('gesang_ab') is not None and tr.get('woerter', 0) >= 8
        d['gesang_ab'] = tr.get('gesang_ab') if d['vocals'] else None
        d['gesang_bis'] = tr.get('gesang_bis') if d['vocals'] else None
        d['intro'] = round(tr['gesang_ab'], 1) if d['vocals'] else None
        d['outro'] = round(m['sek'] - tr['gesang_bis'], 1) if d['vocals'] and m.get('sek') else None
    elif k == 'musik':
        d['vocals'] = bool(e.get('gesang'))
        d['lang'] = e.get('sprache') or '-'
    if lz and lz.startswith('CC BY'):
        d['credit'] = '%s – %s · %s' % (d['title'], d['author'], lz)
    elif lz:
        d['credit'] = '%s – %s · %s' % (d['title'], d['author'], 'gemeinfrei' if lz and lz.startswith('PDM') else 'CC0')
    return {f: v for f, v in d.items() if v is not None}


def credits_md(eintraege):
    z = ['# Credits – freie Töne für „Pavillon Ratscher“', '',
         'Alle Dateien wurden für das Spiel geschnitten, im Pegel angeglichen (Musik −16 LUFS, Atmosphäre −24 LUFS) und als MP3 kodiert.',
         'Lizenzen geprüft auf der Seite der jeweiligen Datei (Datum je Eintrag). CC BY verlangt Namensnennung – sie steht hier, im '
         'Spiel beim Abspielen und in den Credits.', '']
    titel = {'musik': 'Radio', 'score': 'Filmmusik (Missionen)', 'klang': 'Atmosphäre und Geräusche', 'motor': 'Motoren und Sirenen'}
    for k in ('musik', 'score', 'klang', 'motor'):
        es = [d for d in eintraege if d['kind'] == k]
        if not es:
            continue
        z += ['## ' + titel[k], '']
        if k == 'musik':
            for s in SENDER:
                ss = [d for d in es if d.get('sender') == s]
                if ss:
                    z += ['### ' + SENDER[s], '']
                    z += [credit_zeile(d) for d in ss] + ['']
        else:
            z += [credit_zeile(d) for d in es] + ['']
    return '\n'.join(z) + '\n'


def credit_zeile(d):
    lz = '[%s](%s)' % (d['licence'], d['licence_url']) if d.get('licence_url') else d.get('licence', '')
    return '- **%s** – %s%s · %s · Quelle: <%s> · geprüft %s · `%s`' % (
        d['title'], d['author'], (' (%s)' % d['album']) if d.get('album') else '', lz, d['source'], d.get('checked', ''), d['file'])


def uebersicht_md(quellen, recs):
    z = ['# Übersicht der Messungen (automatisch, `tools/ton/holen.py sammeln`)', '', 'Stand: %s' % jetzt(), '',
         '| id | Titel – Interpret | Lizenz | Länge | LUFS | TP | Gesang | Sprache | erste Zeile | Meldungen |', '|' + '---|' * 10]
    for q in quellen:
        for e in q['eintraege']:
            r = recs.get(e.get('id'))
            if not r:
                z.append('| %s | %s – %s | %s | – | – | – | – | – | – | noch nicht bearbeitet |' % (
                    e.get('id'), e.get('titel', ''), e.get('interpret', ''), e.get('lizenz', '')))
                continue
            m = r.get('messung', {})
            tr = r.get('transkript') or {}
            first = next((s['t'] for s in tr.get('segmente', []) if not s['z']), '')
            mel = list(r.get('meldungen', []))
            if (r.get('lizenz') or {}).get('andere'):
                mel.append('andere Lizenzen auf der Seite')
            if tr.get('heikel'):
                mel.append('heikel: ' + ', '.join(tr['heikel']))
            if m.get('naht') and not m['naht'].get('ok'):
                mel.append('Naht auffällig')
            z.append('| %s | %s – %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (
                e['id'], e.get('titel', ''), e.get('interpret', ''), e.get('lizenz', ''), fmt_sek(m.get('sek')),
                m.get('lufs', '–'), m.get('tp', '–'),
                ('%s–%s' % (fmt_sek(tr.get('gesang_ab')), fmt_sek(tr.get('gesang_bis')))) if tr.get('gesang_ab') is not None else '–',
                tr.get('sprache', '–'), first[:60].replace('|', '/'), '; '.join(mel)[:160].replace('|', '/') or ('ok' if r['ok'] else '')))
    return '\n'.join(z) + '\n'


def cmd_sammeln(aus, teile):
    quellen = lade_quellen()
    # results of this run (per group), else what tools/ton/messung/ already holds
    neu, gruppen_neu = {}, set()
    for t in teile:
        tj = lies_json(os.path.join(t, 'teil.json'))
        if tj:
            gruppen_neu.add(tj['gruppe'])
        for k in KINDS:
            d = os.path.join(t, 'messung', k)
            for name in sorted(os.listdir(d)) if os.path.isdir(d) else []:
                if name.endswith('.json'):
                    r = lies_json(os.path.join(d, name))
                    if r:
                        neu[r['id']] = (r, t)
    recs = {}
    os.makedirs(os.path.join(aus, 'ton'), exist_ok=True)
    gueltig = set()
    for q in quellen:
        for e in q['eintraege']:
            if not e.get('id') or e.get('kind') not in KINDS:
                continue
            gueltig.add(e['id'])
            if e['id'] in neu:
                r, t = neu[e['id']]
                recs[e['id']] = r
                src = os.path.join(t, 'ton', r.get('datei') or '')
                if r.get('ok') and os.path.isfile(src):
                    dst = os.path.join(aus, 'ton', r['datei'])
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    shutil.copyfile(src, dst)
                tp = os.path.join(t, 'messung', 'transkripte', e['id'] + '.txt')
                if os.path.exists(tp):
                    os.makedirs(os.path.join(MESSUNG, 'transkripte'), exist_ok=True)
                    shutil.copyfile(tp, os.path.join(MESSUNG, 'transkripte', e['id'] + '.txt'))
                schreibe_json(os.path.join(MESSUNG, r['kind'], e['id'] + '.json'), r)
            else:
                r = alt_record(e)
                if r:
                    recs[e['id']] = r
    # records of entries that left the manifests (only for groups that ran now)
    for k in KINDS:
        d = os.path.join(MESSUNG, k)
        for name in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            i = name[:-5]
            if name.endswith('.json') and i not in gueltig:
                r = lies_json(os.path.join(d, name)) or {}
                if r.get('gruppe') in gruppen_neu or not r:
                    os.remove(os.path.join(d, name))
                    tp = os.path.join(MESSUNG, 'transkripte', i + '.txt')
                    if os.path.exists(tp):
                        os.remove(tp)
    index = []
    for q in quellen:
        for e in q['eintraege']:
            r = recs.get(e.get('id'))
            if r and r.get('ok') and r.get('datei'):
                index.append(index_eintrag(e, r))
    idx = {'format': 1, 'stand': jetzt(), 'basis': 'https://mynametouse.github.io/pavillon-ton/', 'n': len(index), 'eintraege': index}
    schreibe_json(os.path.join(aus, 'ton', 'index.json'), idx)
    schreibe_json(os.path.join(MESSUNG, 'index.json'), idx)
    cr = credits_md(index)
    for p in (os.path.join(aus, 'ton', 'CREDITS.md'), os.path.join(MESSUNG, 'CREDITS.md')):
        with open(p, 'w', encoding='utf-8') as f:
            f.write(cr)
    with open(os.path.join(MESSUNG, 'uebersicht.md'), 'w', encoding='utf-8') as f:
        f.write(uebersicht_md(quellen, recs))
    lauf = {'stand': jetzt(), 'lauf': os.environ.get('GITHUB_RUN_ID'), 'commit': os.environ.get('GITHUB_SHA', '')[:9],
            'gruppen': sorted(gruppen_neu), 'eintraege': sum(len(q['eintraege']) for q in quellen), 'fertig': len(index),
            'bytes': sum(d.get('bytes', 0) for d in index)}
    schreibe_json(os.path.join(MESSUNG, 'lauf.json'), lauf)
    baue_hoerprobe(os.path.join(HOERPROBE, 'index.html'))
    shutil.copyfile(os.path.join(HOERPROBE, 'index.html'), os.path.join(aus, 'ton', 'hoerprobe.html'))
    log('sammeln: %d fertig von %d Einträgen, %.1f MB' % (len(index), lauf['eintraege'], lauf['bytes'] / 1e6))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write(uebersicht_md(quellen, recs))
    return 0


# ---------------------------------------------------------------------------------------------------------------- Hörprobe page
AGENTEN = {'ton-musik': 'Musik', 'ton-radio': 'Radio (Sender, Moderation)', 'ton-stimmen': 'Stimmen', 'ton-welt': 'Welt und Räume',
           'ton-motoren': 'Motoren und Sirenen'}


def hoerprobe_daten():
    idx = lies_json(os.path.join(MESSUNG, 'index.json'), {}) or {}
    fertig = {d['id']: d for d in idx.get('eintraege', [])}
    abschnitte = []
    quellen = lade_quellen()
    alle = [e for q in quellen for e in q['eintraege'] if e.get('kind') in ('musik', 'score')]

    def eintrag(e):
        d = fertig.get(e['id'], {})
        tp = os.path.join(MESSUNG, 'transkripte', e['id'] + '.txt')
        zeilen = []
        r = lies_json(os.path.join(MESSUNG, art(e), e['id'] + '.json'), {}) or {}
        for s in (r.get('transkript') or {}).get('segmente', []):
            if not s['z']:
                zeilen.append(s['t'])
            if len(zeilen) >= 4:
                break
        return {'id': e['id'], 'titel': e.get('titel'), 'von': e.get('interpret'), 'lizenz': e.get('lizenz'),
                'lizenz_url': lizenz_url(e.get('lizenz')), 'quelle': e.get('quelle'), 'orig': e.get('datei'),
                'datei': d.get('file'), 'sek': d.get('sec') or e.get('sek'), 'lufs': d.get('lufs'), 'sprache': d.get('lang') or e.get('sprache'),
                'gesang': d.get('vocals', e.get('gesang')), 'intro': d.get('intro'), 'text': zeilen,
                'was': e.get('warum'), 'risiko': e.get('risiko'), 'schicht': e.get('schicht'), 'stich': e.get('stich'),
                'transkript': os.path.exists(tp)}
    for s, name in SENDER.items():
        es = [eintrag(e) for e in alle if e.get('kind') == 'musik' and e.get('sender') == s]
        if es:
            abschnitte.append({'id': s, 'titel': name, 'art': 'musik', 'eintraege': es})
    sc = [eintrag(e) for e in alle if e.get('kind') == 'score']
    if sc:
        abschnitte.append({'id': 'score', 'titel': 'Filmmusik bei Missionen', 'art': 'score', 'eintraege': sc})
    # the other agents' lists: tools/ton/hoerprobe/<agent>.json = [{id, titel, was, datei | url, quelle, lizenz, notiz}]
    for name in sorted(os.listdir(HOERPROBE)) if os.path.isdir(HOERPROBE) else []:
        if not name.endswith('.json'):
            continue
        ag = name[:-5]
        liste = lies_json(os.path.join(HOERPROBE, name))
        if isinstance(liste, dict):
            liste = liste.get('eintraege', [])
        if not isinstance(liste, list):
            continue
        es = []
        for x in liste:
            if isinstance(x, dict) and x.get('id'):
                es.append({'id': str(x['id']), 'titel': x.get('titel') or x['id'], 'was': x.get('was'), 'datei': x.get('datei'),
                           'url': x.get('url'), 'quelle': x.get('quelle'), 'lizenz': x.get('lizenz'), 'notiz': x.get('notiz'),
                           'von': x.get('von') or x.get('interpret')})
        if es:
            abschnitte.append({'id': ag, 'titel': AGENTEN.get(ag, ag), 'art': 'liste', 'eintraege': es})
    return {'stand': jetzt(), 'basis': '', 'abschnitte': abschnitte}


def baue_hoerprobe(ziel):
    daten = hoerprobe_daten()
    with open(os.path.join(HOERPROBE, 'vorlage.html'), encoding='utf-8') as f:
        t = f.read()
    js = json.dumps(daten, ensure_ascii=False).replace('</', '<\\/')
    t = t.replace('/*DATEN*/null', js)
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    with open(ziel, 'w', encoding='utf-8') as f:
        f.write(t)
    log('hoerprobe: %s (%d Abschnitte, %d Einträge)' % (os.path.relpath(ziel, ROOT), len(daten['abschnitte']),
                                                       sum(len(a['eintraege']) for a in daten['abschnitte'])))


# ---------------------------------------------------------------------------------------------------------------- self-test
def selbsttest():
    import numpy as np
    global CACHE, MESSUNG, QUELLEN
    ok = True

    def ck(name, cond, info=''):
        nonlocal ok
        log('%s %s %s' % ('ok  ' if cond else 'FEHL', name, info))
        ok = ok and bool(cond)
    with tempfile.TemporaryDirectory() as td:
        CACHE = os.path.join(td, 'cache')
        QUELLEN = os.path.join(td, 'quellen')
        MESSUNG = os.path.join(td, 'messung')
        os.makedirs(QUELLEN)
        # a song-like file (two tones and noise, 40 s, a quiet start and end), a noise bed for a loop, a short click for a peak target
        src = os.path.join(td, 'src')
        os.makedirs(src)
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo:d=1.5', '-f', 'lavfi', '-i',
             'sine=f=220:r=44100:d=40', '-f', 'lavfi', '-i', 'anoisesrc=c=pink:r=44100:d=40:a=0.05', '-filter_complex',
             '[1][2]amix=inputs=2,volume=0.3,aformat=channel_layouts=stereo[m];[0][m]concat=n=2:v=0:a=1', os.path.join(src, 'lied.flac')])
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anoisesrc=c=brown:r=44100:d=12:a=0.3', '-af',
             'lowpass=f=900,aformat=channel_layouts=stereo', os.path.join(src, 'wind.wav')])
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=1200:r=44100:d=0.4', '-af', 'afade=t=out:st=0.05:d=0.35',
             os.path.join(src, 'klick.wav')])
        seite = os.path.join(src, 'seite.html')
        with open(seite, 'w') as f:
            f.write('<html><body><p>Testlied by Testband is licensed under a <a rel="license" '
                    'href="https://creativecommons.org/licenses/by/4.0/">Attribution 4.0 International License</a>.</p></body></html>')
        seite0 = os.path.join(src, 'seite0.html')
        with open(seite0, 'w') as f:
            f.write('<html><body><a rel="license" href="https://creativecommons.org/licenses/by-nc/4.0/">BY-NC</a></body></html>')
        fu = lambda p: 'file://' + p  # noqa: E731
        musik = [{'id': 'test-lied', 'kind': 'musik', 'sender': 'zweitakt', 'titel': 'Testlied', 'interpret': 'Testband',
                  'lizenz': 'CC BY 4.0', 'quelle': fu(seite), 'datei': fu(os.path.join(src, 'lied.flac')), 'gesang': False},
                 {'id': 'test-nc', 'kind': 'musik', 'sender': 'zweitakt', 'titel': 'Falsch', 'interpret': 'X', 'lizenz': 'CC BY 4.0',
                  'quelle': fu(seite0), 'datei': fu(os.path.join(src, 'lied.flac'))},
                 {'id': 'test-ki', 'kind': 'eleven_sfx', 'prompt': 'music', 'sek': 5}]  # refused: no AI sound at all
        klang = [{'id': 'test-wind', 'kind': 'klang', 'zone': 'test', 'titel': 'Wind', 'interpret': 'Test', 'lizenz': 'CC0 1.0',
                  'quelle': fu(seite.replace('seite.html', 'seite_cc0.html')), 'datei': fu(os.path.join(src, 'wind.wav')), 'loop': True},
                 {'id': 'test-klick', 'kind': 'klang', 'zone': 'test', 'titel': 'Klick', 'interpret': 'Test', 'lizenz': 'CC0 1.0',
                  'quelle': fu(seite.replace('seite.html', 'seite_cc0.html')), 'datei': fu(os.path.join(src, 'klick.wav'))},
                 {'id': 'test-sfx', 'kind': 'eleven_sfx', 'prompt': 'wind in pines', 'sek': 4, 'loop': True}]  # refused too
        with open(os.path.join(src, 'seite_cc0.html'), 'w') as f:
            f.write('<a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0 Universal</a>')
        schreibe_json(os.path.join(QUELLEN, 'musik.json'), musik)
        schreibe_json(os.path.join(QUELLEN, 'klang.json'), {'eintraege': klang})
        q = lade_quellen(QUELLEN)
        f, w, n = alle_pruefen(q)
        ck('pruefen lehnt die beiden ElevenLabs-Einträge ab', f == 2, '(%d Fehler)' % f)
        gs = sorted({gruppe(e) for x in q for e in x['eintraege']})
        ck('gruppen', {'klang', 'musik-zweitakt'} <= set(gs), str(gs))
        aus1, aus2 = os.path.join(td, 'teil1'), os.path.join(td, 'teil2')
        cmd_bearbeiten('musik-zweitakt', aus1)
        cmd_bearbeiten('klang', aus2)
        r = lies_json(os.path.join(aus1, 'messung', 'musik', 'test-lied.json'))
        ck('Lizenz belegt (rel=license)', r and r['lizenz']['ok'] and r['lizenz']['funde'], (r or {}).get('lizenz', {}).get('grund', ''))
        m = (r or {}).get('messung', {})
        ck('Musik −16 LUFS', m.get('lufs') is not None and abs(m['lufs'] + 16) <= 0.6, 'LUFS %s' % m.get('lufs'))
        ck('True Peak ≤ −1 dBTP', m.get('tp') is not None and m['tp'] <= -0.95, 'TP %s' % m.get('tp'))
        ck('Stille vorn geschnitten', (r or {}).get('verarbeitung', {}).get('stille_vorn', 0) >= 1.3,
           str((r or {}).get('verarbeitung', {}).get('stille_vorn')))
        ck('MP3 128 kbps stereo', m.get('kbps') == 128 and m.get('kanaele') == 2 and os.path.exists(os.path.join(aus1, 'ton', 'musik/zweitakt/test-lied.mp3')))
        r0 = lies_json(os.path.join(aus1, 'messung', 'musik', 'test-nc.json'))
        ck('falsche Lizenz (BY-NC) abgelehnt', r0 and not r0['ok'] and not r0['lizenz']['ok'], (r0 or {}).get('lizenz', {}).get('grund', ''))
        rw = lies_json(os.path.join(aus2, 'messung', 'klang', 'test-wind.json'))
        mw = (rw or {}).get('messung', {})
        ck('Atmosphäre −24 LUFS', mw.get('lufs') is not None and abs(mw['lufs'] + 24) <= 0.7, 'LUFS %s' % mw.get('lufs'))
        ck('Schleife ohne Naht', mw.get('naht', {}).get('ok'), str(mw.get('naht')))
        rk = lies_json(os.path.join(aus2, 'messung', 'klang', 'test-klick.json'))
        mk = (rk or {}).get('messung', {})
        ck('Punktquelle Spitze −1 dBFS, mono', mk.get('peak') is not None and abs(mk['peak'] + 1) <= 0.5 and mk.get('kanaele') == 1,
           'peak %s, %s Kanal' % (mk.get('peak'), mk.get('kanaele')))
        ck('ElevenLabs-Eintrag nicht bearbeitet', not os.path.exists(os.path.join(aus2, 'messung', 'klang', 'test-sfx.json')))
        # a seam that is NOT seamless must be found
        x = dekodiere(os.path.join(src, 'lied.flac'), 2)[RATE * 2: RATE * 6]
        x[-RATE // 2:] *= 0.05
        ck('auffällige Naht wird erkannt', not naht_messen(x)['ok'])
        # the cache: a second run takes the finished file
        global MESSUNG_SAVE
        for kk in KINDS:
            d = os.path.join(aus1, 'messung', kk)
            if os.path.isdir(d):
                shutil.copytree(d, os.path.join(MESSUNG, kk), dirs_exist_ok=True)
        aus3 = os.path.join(td, 'teil3')
        cmd_bearbeiten('musik-zweitakt', aus3)
        r3 = lies_json(os.path.join(aus3, 'messung', 'musik', 'test-lied.json'))
        ck('zweiter Lauf aus dem Cache', r3 and r3.get('wieder'))
        # merge: index.json and CREDITS.md
        global HOERPROBE
        hp = HOERPROBE
        HOERPROBE = os.path.join(td, 'hoerprobe')
        os.makedirs(HOERPROBE)
        shutil.copyfile(os.path.join(hp, 'vorlage.html'), os.path.join(HOERPROBE, 'vorlage.html'))
        schreibe_json(os.path.join(HOERPROBE, 'ton-welt.json'), [{'id': 'wind-1', 'titel': 'Wind', 'was': 'Rauschen', 'url': 'x.mp3'}])
        aus = os.path.join(td, 'aus')
        cmd_sammeln(aus, [aus1, aus2])
        idx = lies_json(os.path.join(aus, 'ton', 'index.json'))
        ids = sorted(d['id'] for d in (idx or {}).get('eintraege', []))
        ck('index.json', ids == ['test-klick', 'test-lied', 'test-wind'], str(ids))
        d = next((d for d in idx['eintraege'] if d['id'] == 'test-lied'), {})
        ck('index-Felder', all(f in d for f in ('file', 'title', 'author', 'licence', 'licence_url', 'source', 'checked', 'sec', 'lufs',
                                                'peak', 'loop', 'sender', 'credit')), str(sorted(d)))
        ck('Anzeige-Text', d.get('credit') == 'Testlied – Testband · CC BY 4.0', d.get('credit'))
        cr = open(os.path.join(aus, 'ton', 'CREDITS.md'), encoding='utf-8').read()
        ck('CREDITS.md nennt Titel, Interpret, Lizenz-Link, Quelle', 'Testlied' in cr and 'Testband' in cr and
           'creativecommons.org/licenses/by/4.0/' in cr and seite in cr)
        pg = open(os.path.join(HOERPROBE, 'index.html'), encoding='utf-8').read()
        ck('Hörprobe-Seite mit Abschnitten', '"Radio Zweitakt"' in pg and '"wind-1"' in pg and 'Auswahl kopieren' in pg)
        HOERPROBE = hp
        if whisper_da():
            tr = transkribiere(os.path.join(src, 'klick.wav'))
            ck('Transkription läuft (kein Gesang im Ton)', tr['gesang_ab'] is None, str(tr.get('segmente'))[:120])
        else:
            log('     (faster-whisper nicht installiert – Transkription nicht geprüft)')
    log('selbsttest: %s' % ('alles bestanden' if ok else 'FEHLER'))
    return 0 if ok else 1


MESSUNG_SAVE = None


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__ or open(__file__, encoding='utf-8').read().split('\nimport ')[0])
        return 0
    c = argv[0]
    if c == '--selbsttest':
        return selbsttest()
    if c == 'pruefen':
        return cmd_pruefen()
    if c == 'gruppen':
        return cmd_gruppen()
    if c == 'bearbeiten' and len(argv) >= 3:
        return cmd_bearbeiten(argv[1], argv[2])
    if c == 'sammeln' and len(argv) >= 2:
        return cmd_sammeln(argv[1], argv[2:])
    if c == 'hoerprobe':
        baue_hoerprobe(os.path.join(HOERPROBE, 'index.html'))
        return 0
    print('unbekannt: %s (pruefen | gruppen | bearbeiten G AUS | sammeln AUS TEIL… | hoerprobe | --selbsttest)' % ' '.join(argv))
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
