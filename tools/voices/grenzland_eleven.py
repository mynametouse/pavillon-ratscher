# ElevenLabs for Grenzland's voices (ton-stimmen, 14.11.2026): the casting samples, the model test and – after Falko chose the voices and
# the lead gave the go – the re-recording of the fixed lines with a voice of its own per person (tools/voices/besetzung.json 'gewaehlt').
# Used by tools/voices/grenzland_record.py (--probe, --modelltest, --engine eleven, --hoerprobe, --selbsttest); the output of the lines is
# exactly what Edge gives (same paths, ids = the hash of the words, same loudness and formats), so the game needs no change.
#   the key:    ELEVENLABS_API_KEY (a secret of the repository) – missing: every step here skips with a notice („… fehlt – übersprungen“)
#   the budget: GL_EL_BUDGET credits for everything this tool spends over all runs (default 5000 – ton-gemeinsam.md); the ledger is
#               viz3/extra/grenzland-stimmen/probe/index.json '_credits'; the subscription's character_count is read before and after
#               (GET /v1/user/subscription) and the difference printed; a request that would cross the budget is not sent
#   direction:  tags per line (the collector's context + tools/voices/regie.json) go into the text as audio tags for eleven_v3 / eleven_v4
#               ('[whispers] Leise also.'); eleven_multilingual_v2 and the flash models get the words only (they would read a tag aloud)
# Never print the key: errors show the status and the service's message only.
import hashlib, json, os, re, subprocess, sys, time, urllib.error, urllib.request

H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, '..', '..'))
# (GL_EX, GL_BES, GL_REGIE, GL_HOER: other folders and files – the tests use them)
EX = os.environ.get('GL_EX') or os.path.join(ROOT, 'viz3', 'extra', 'grenzland-stimmen')
PROBE = os.path.join(EX, 'probe')
HOER = os.environ.get('GL_HOER') or os.path.join(ROOT, 'tools', 'ton', 'hoerprobe', 'ton-stimmen.json')
BES = os.environ.get('GL_BES') or os.path.join(H, 'besetzung.json')
REGIE = os.environ.get('GL_REGIE') or os.path.join(H, 'regie.json')
BASE = os.environ.get('GL_EL_BASE', 'https://api.elevenlabs.io').rstrip('/')
NOTICE = '::notice title=grenzland_eleven::'
FEHLT = 'ELEVENLABS_API_KEY fehlt – übersprungen'
TAGGED = re.compile(r'^eleven_v[34]')   # models that understand audio tags in the text


def key():
    return os.environ.get('ELEVENLABS_API_KEY', '').strip()


def budget_limit():
    try:
        return int(os.environ.get('GL_EL_BUDGET', '5000'))
    except ValueError:
        return 5000


# ---------------- the casting sheet and the direction ----------------
def besetzung():
    return json.load(open(BES))


def person_of(who, B=None):
    """the casting entry that speaks for a key: the person itself; the young Gerhard → Gerhard ('wie'); a call line (gl_tel_<x>) or an AI
    person (gl_p_<x>) → <x>; a passer-by gl_l_* → the street's pool"""
    B = B or besetzung()
    P, L = B.get('personen', {}), B.get('leute', {})
    w = re.sub(r'^gl_(tel|p)_', 'gl_', who)
    if w in P:
        p = P[w]
        return P.get(p.get('wie'), p) if p.get('wie') in P else p
    if w in L and isinstance(L[w], dict): return L[w]
    return None


def gewaehlt(who, text='', B=None):
    """the chosen ElevenLabs voice of a line, or None (the line stays with Edge): the police radio's patrol lines take the patrol"""
    B = B or besetzung()
    if who == 'gl_funk' and re.match(r'^(Schleuse \d+|Bussard \d+|Verstanden)\b', text or ''):
        p = B.get('personen', {}).get('gl_funk:streife')
    else:
        p = person_of(who, B)
    return (p or {}).get('gewaehlt') or None


def regie_table():
    f = REGIE
    if not os.path.exists(f): return {}
    d = json.load(open(f))
    return {k: v for k, v in d.get('zeilen', d).items() if isinstance(v, list)}


def tags_of(l, table=None):
    """the direction of a line: the hand table (tools/voices/regie.json: id → tags) wins over the collector's context ('regie')"""
    table = regie_table() if table is None else table
    t = table.get(l['id'], l.get('regie') or [])
    return [str(x).strip() for x in t if str(x).strip()]


def el_text(text, tags, model):
    """what the model gets: the words – with the audio tags in front for the models that understand them. The id of the line stays the
    hash of the words alone (tools/voices/grenzland_linien.mjs)"""
    t = text.replace('…', '...')
    if tags and TAGGED.match(model): return ' '.join('[' + x + ']' for x in tags) + ' ' + t
    return t


def el_settings(model, tags):
    """voice settings: v3/v4 'natural' stability (0.5; 0 'creative' follows the tags more, but drifts); v2 a little looser when a line has
    a feeling it cannot be told"""
    if TAGGED.match(model): return {'stability': 0.5, 'similarity_boost': 0.75, 'use_speaker_boost': True}
    return {'stability': 0.4 if tags else 0.5, 'similarity_boost': 0.75, 'style': 0.15 if tags else 0.0, 'use_speaker_boost': True}


def seed_of(s):
    return int(hashlib.sha1(s.encode('utf8')).hexdigest()[:7], 16)


# ---------------- the service ----------------
class ElevenError(Exception):
    pass


class Eleven:
    def __init__(self, k, base=BASE):
        self.k, self.base = k, base

    def req(self, method, path, body=None, accept='application/json', timeout=90):
        data = json.dumps(body).encode('utf8') if body is not None else None
        r = urllib.request.Request(self.base + path, data=data, method=method,
                                   headers={'xi-api-key': self.k, 'Content-Type': 'application/json', 'Accept': accept})
        try:
            with urllib.request.urlopen(r, timeout=timeout) as resp:
                return resp.read(), dict(resp.headers)
        except urllib.error.HTTPError as e:
            msg = ''
            try:
                j = json.loads(e.read().decode('utf8', 'replace'))
                d = j.get('detail', j)
                msg = d.get('message') or d.get('status') or str(d) if isinstance(d, dict) else str(d)
            except Exception:
                pass
            raise ElevenError(f'{e.code} {msg}'[:300])
        except urllib.error.URLError as e:
            raise ElevenError('keine Verbindung: ' + str(e.reason)[:120])

    def subscription(self):
        """{character_count, character_limit, ...} – None when the key may not read it (a scoped key)"""
        try:
            b, _ = self.req('GET', '/v1/user/subscription')
            return json.loads(b)
        except (ElevenError, ValueError) as e:
            print('subscription not readable:', e, flush=True)
            return None

    def tts(self, voice, text, model, settings, seed=None):
        body = {'text': text, 'model_id': model, 'voice_settings': settings}
        if seed is not None: body['seed'] = seed
        # (language enforcement only where the service accepts it – the multilingual models find German themselves)
        if re.match(r'^eleven_(flash|turbo)_v2_5', model): body['language_code'] = 'de'
        b, h = self.req('POST', f'/v1/text-to-speech/{voice}?output_format=mp3_44100_128', body, accept='audio/mpeg')
        if len(b) < 800: raise ElevenError('zu wenig Ton (%d Bytes)' % len(b))
        return b, h


class Budget:
    """credits over all runs: the ledger in probe/index.json ('_credits'); a request is sent only when it fits"""
    def __init__(self, limit, spent=0):
        self.limit, self.spent, self.run = limit, spent, 0

    def fits(self, n):
        return self.spent + n <= self.limit

    def take(self, n):
        self.spent += n
        self.run += n

    def __str__(self):
        return f'{self.spent} of {self.limit} credits ({self.run} in this run)'


def cost(text, model):
    """credits a request costs: one per character, half for the flash/turbo models (ElevenLabs pricing, 2026)"""
    return (len(text) + 1) // 2 if re.match(r'^eleven_(flash|turbo)', model) else len(text)


# ---------------- measuring ----------------
def ff_lufs(f):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', e)
    return float(m[-1]) if m else None


def ff_dur(f):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout
    try:
        return round(float(out.strip() or 0), 2)
    except ValueError:
        return 0.0


def ff_probe_encode(raw, mp3):
    """a casting sample: trimmed, −17 LUFS, mono 44.1 kHz 64 kbit/s (to judge the voice, not the game's small format)"""
    trim = ('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,'
            'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', trim + ',highpass=f=60,loudnorm=I=-17:TP=-1.5:LRA=9',
                    '-ac', '1', '-ar', '44100', '-b:a', '64k', mp3], check=True)


# ---------------- the ledger ----------------
def ledger():
    f = os.path.join(PROBE, 'index.json')
    return json.load(open(f)) if os.path.exists(f) else {'_credits': 0, 'proben': {}, 'modelltest': {}}


def save_ledger(L):
    os.makedirs(PROBE, exist_ok=True)
    json.dump(L, open(os.path.join(PROBE, 'index.json'), 'w'), ensure_ascii=False, indent=1, sort_keys=True)


def short(s):
    return re.sub(r'[^A-Za-z0-9]+', '', s)[:24] or 'x'


# ---------------- the model test: 3 lines with direction × 3 models (+ the dialect question) ----------------
TEST = [
    # (who, words, tags, what to listen for)
    ('gl_jule', 'Leise also. Dann wartet, bis es dunkel ist. Und atmet flach.', ['whispers'],
     'Flüstert sie wirklich (Schleichen im Außenlager)?'),
    ('gl_sarah', 'Raus hier! Zur Feldscheune!', ['out of breath', 'shouting'],
     'Außer Atem und laut auf der Flucht aus dem Außenlager – ohne dass ein Wort fehlt?'),
    ('gl_timo', 'Der Bunker. Da war ich als Kind. Da ist nichts drin außer Fledermäusen.', ['laughs'],
     'Lacht er dabei, natürlich und nicht aufgesetzt?'),
    ('gl_gerhard', 'Bei uns fiel keine Mauer. Bei uns stand ein Zaun, und der stand am Zehnten noch.', ['sighs', 'slight East Franconian accent'],
     'Seufzt er? Hört man eine leichte fränkische Färbung (für die Mundart-Frage)?'),
]


def voice_for_test(who, B):
    p = person_of(who, B) or {}
    if p.get('gewaehlt'): return p['gewaehlt'], 'gewählt'
    k = p.get('kandidaten') or []
    return (k[0]['id'], k[0].get('name', '')) if k else (None, '')


def run_tests(E, Bud, L, B, models, encode, dry=False):
    out = []
    for i, (who, words, tags, was) in enumerate(TEST):
        voice, vname = voice_for_test(who, B)
        if not voice: continue
        for model in models:
            text = el_text(words, tags, model)
            k = hashlib.sha1('|'.join([voice, model, text]).encode('utf8')).hexdigest()[:12]
            f = os.path.join('modell', f'{i + 1}_{short(who[3:])}_{model}.mp3')
            e = L['modelltest'].get(k)
            if e and os.path.exists(os.path.join(PROBE, e['datei'])):
                out.append(e); continue
            c = cost(text, model)
            if not Bud.fits(c):
                print(f'{NOTICE}Budget reicht nicht mehr für den Modelltest ({Bud}) – Rest übersprungen', flush=True); return out
            if dry:
                print('  would test', model, who, voice, repr(text)); Bud.take(c); continue
            try:
                b, h = E.tts(voice, text, model, el_settings(model, tags), seed=seed_of(k))
            except ElevenError as er:
                print(f'::warning title=grenzland_eleven::Modelltest {model} {who}: {er}', flush=True)
                # (a model the account cannot use – eleven_v4 on an older plan – costs nothing; the others go on)
                continue
            Bud.take(c)
            raw = os.path.join(PROBE, f + '.raw.mp3'); os.makedirs(os.path.dirname(raw), exist_ok=True)
            open(raw, 'wb').write(b)
            # the loudness as the model gave it (shouting is louder, whispering quieter) before the file is levelled
            raw_lufs = ff_lufs(raw)
            encode(raw, os.path.join(PROBE, f)); os.remove(raw)
            e = {'who': who, 'voice': voice, 'stimme': vname, 'model': model, 'text': words, 'gesendet': text, 'tags': tags, 'was': was,
                 'datei': f, 'dur': ff_dur(os.path.join(PROBE, f)), 'lufs_roh': raw_lufs, 'credits': c, 't': time.strftime('%Y-%m-%d %H:%M')}
            L['modelltest'][k] = e; out.append(e)
            print('test', model, who, e['dur'], 's', raw_lufs, 'LUFS raw', flush=True)
    return out


def run_probes(E, Bud, L, B, model, encode, dry=False, only=None):
    """each candidate of each person says the person's sample line – in the order of 'rang' (the story first), until the budget"""
    P = B.get('personen', {})
    order = sorted(P.items(), key=lambda kv: (kv[1].get('rang', 9), list(P).index(kv[0])))
    leute = [(k, v) for k, v in B.get('leute', {}).items() if k.startswith('gl_l_') and isinstance(v, dict)]
    LEUTE_SATZ = {'m': 'Morgen. Na, auch schon unterwegs?', 'f': 'Guten Morgen! Na, auch schon unterwegs?'}
    jobs = []
    for who, p in order:
        for c in p.get('kandidaten') or []:
            if p.get('probe'): jobs.append((who, p, c, p['probe']))
    for who, p in leute:
        for c in p.get('kandidaten') or []: jobs.append((who, p, c, LEUTE_SATZ.get(p.get('g'), LEUTE_SATZ['m'])))
    done, skipped = [], 0
    for who, p, c, words in jobs:
        if only and who not in only: continue
        text = el_text(words, [], model)
        k = hashlib.sha1('|'.join([c['id'], model, text]).encode('utf8')).hexdigest()[:12]
        f = os.path.join(short(who[3:]), c['id'] + '.mp3')
        e = L['proben'].get(k)
        if e and os.path.exists(os.path.join(PROBE, e['datei'])):
            done.append(e); continue
        n = cost(text, model)
        if not Bud.fits(n):
            skipped += 1; continue
        if dry:
            Bud.take(n); continue
        try:
            b, h = E.tts(c['id'], text, model, el_settings(model, []), seed=seed_of(k))
        except ElevenError as er:
            print(f'::warning title=grenzland_eleven::Probe {who} {c.get("name", c["id"])}: {er}', flush=True)
            continue
        Bud.take(n)
        raw = os.path.join(PROBE, f + '.raw.mp3'); os.makedirs(os.path.dirname(raw), exist_ok=True)
        open(raw, 'wb').write(b)
        encode(raw, os.path.join(PROBE, f)); os.remove(raw)
        e = {'who': who, 'voice': c['id'], 'stimme': c.get('name', ''), 'model': model, 'text': words, 'datei': f,
             'dur': ff_dur(os.path.join(PROBE, f)), 'credits': n, 't': time.strftime('%Y-%m-%d %H:%M')}
        L['proben'][k] = e; done.append(e)
        print('probe', who, c.get('name', c['id'])[:40], e['dur'], 's', flush=True)
    if skipped: print(f'{NOTICE}{skipped} Proben über dem Budget ({Bud}) – nicht erzeugt', flush=True)
    return done, skipped


# ---------------- the Hörprobe list (tools/ton/hoerprobe/ton-stimmen.json, ton-musik builds the page) ----------------
LIZENZ = 'KI-Stimme (ElevenLabs Text-to-Speech, Stimme aus der ElevenLabs-Bibliothek; Nutzung nach den Bedingungen des ElevenLabs-Kontos)'


def hoerprobe(B=None, L=None):
    B = B or besetzung(); L = L if L is not None else ledger()
    rendered = {}
    for e in L.get('proben', {}).values(): rendered[(e['who'], e['voice'])] = e
    out = []
    for e in sorted(L.get('modelltest', {}).values(), key=lambda e: (e['datei'])):
        out.append({'id': 'stimme:modell:' + os.path.basename(e['datei'])[:-4], 'titel': f"Modelltest {e['model']} – {e['who'][3:]}",
                    'was': e['was'] + ' Vergleiche die drei Modelle beim selben Satz.', 'datei': 'viz3/extra/grenzland-stimmen/probe/' + e['datei'],
                    'quelle': 'ElevenLabs ' + e['model'] + ', Stimme ' + (e.get('stimme') or e['voice']), 'lizenz': LIZENZ,
                    'notiz': 'gesendet: ' + e['gesendet']})
    secs = [('personen', B.get('personen', {})), ('leute', {k: v for k, v in B.get('leute', {}).items() if k.startswith('gl_l_')})]
    for sec, P in secs:
        for who, p in P.items():
            if not isinstance(p, dict): continue
            name = p.get('name') or (f"Leute auf der Straße ({'Mann' if p.get('g') == 'm' else 'Frau'}, {p.get('alter')})" if who.startswith('gl_l_') else who[3:])
            for c in p.get('kandidaten') or []:
                r = rendered.get((who, c['id']))
                base = {'id': f"stimme:{who}:{c['id']}", 'titel': f"{name} – {c.get('name', c['id'])}",
                        'was': f"Passt die Stimme zu {name}? " + (p.get('beschreibung', '').split('. ')[0].rstrip('.') + '.' if p.get('beschreibung') else '') + ' (👍 = in die engere Wahl)',
                        'quelle': 'ElevenLabs-Bibliothek: ' + c.get('name', c['id']) + ' (' + c['id'] + ')', 'lizenz': LIZENZ}
                if r:
                    base.update({'datei': 'viz3/extra/grenzland-stimmen/probe/' + r['datei'], 'notiz': 'unser Satz: „' + r['text'] + '“ (' + r['model'] + ')'})
                elif c.get('vorschau'):
                    base.update({'url': c['vorschau'], 'notiz': 'die Hörprobe des Sprechers aus der Bibliothek (ein anderer Text) – unser Satz kommt, sobald der Schlüssel da ist: „' + (p.get('probe') or '') + '“'})
                else:
                    continue
                out.append(base)
    os.makedirs(os.path.dirname(HOER), exist_ok=True)
    json.dump(out, open(HOER, 'w'), ensure_ascii=False, indent=1)
    return out


# ---------------- the steps for grenzland_record.py ----------------
def main_probe(argv):
    """--probe and/or --modelltest (and --hoerprobe alone: only the list): idempotent – what was rendered stays and costs nothing again"""
    B = besetzung(); L = ledger()
    dry = bool(os.environ.get('GL_DRY'))
    if '--hoerprobe' in argv and '--probe' not in argv and '--modelltest' not in argv:
        print(len(hoerprobe(B, L)), 'Hörprobe entries →', os.path.relpath(HOER, ROOT)); return 0
    k = key()
    if not k and not dry:
        print(NOTICE + FEHLT, flush=True)
        print(len(hoerprobe(B, L)), 'Hörprobe entries (the library previews) →', os.path.relpath(HOER, ROOT))
        return 0
    E = Eleven(k)
    Bud = Budget(budget_limit(), L.get('_credits', 0))
    sub0 = E.subscription() if not dry else None
    if sub0: print(f"subscription: {sub0.get('character_count')} of {sub0.get('character_limit')} characters used this period", flush=True)
    if sub0 and sub0.get('character_limit') is not None and sub0.get('character_count') is not None:
        left = sub0['character_limit'] - sub0['character_count']
        if left < Bud.limit - Bud.spent: Bud.limit = Bud.spent + max(0, left - 50)
    models = [m for m in (os.environ.get('GL_EL_MODELLE') or ','.join(B.get('modelle', {}).get('test', []))).split(',') if m]
    try:
        if '--modelltest' in argv: run_tests(E, Bud, L, B, models, ff_probe_encode, dry)
        if '--probe' in argv:
            only = [w for w in os.environ.get('GL_ONLY', '').split(',') if w]
            run_probes(E, Bud, L, B, B.get('modelle', {}).get('probe', 'eleven_multilingual_v2'), ff_probe_encode, dry, only)
    finally:
        if not dry:
            L['_credits'] = Bud.spent
            save_ledger(L)
            sub1 = E.subscription()
            if sub0 and sub1:
                print(f"{NOTICE}ElevenLabs: {sub1['character_count'] - sub0['character_count']} credits used by the subscription in this run, "
                      f"{Bud.run} counted; {Bud}", flush=True)
            else:
                print(f'{NOTICE}ElevenLabs: {Bud}', flush=True)
        else:
            print('dry run:', Bud)
    print(len(hoerprobe(B, L)), 'Hörprobe entries →', os.path.relpath(HOER, ROOT))
    return 0


# ---------------- a self-test without the service (viz3/test/unit/grenzland_stimmen_eleven.test.mjs runs it) ----------------
def selbsttest():
    ok = []
    def check(c, what):
        if not c: raise AssertionError(what)
        ok.append(what)
    Bd = Budget(100, 90)
    check(Bd.fits(10) and not Bd.fits(11), 'the budget lets through what fits and nothing more')
    Bd.take(10); check(not Bd.fits(1) and Bd.run == 10, 'what was taken counts')
    check(cost('abcd', 'eleven_v3') == 4 and cost('abcd', 'eleven_flash_v2_5') == 2, 'credits: one per character, half for flash')
    check(el_text('Leise also.', ['whispers'], 'eleven_v3') == '[whispers] Leise also.', 'v3 gets the tags in front')
    check(el_text('Leise also.', ['whispers'], 'eleven_v4') == '[whispers] Leise also.', 'v4 too')
    check(el_text('Leise also.', ['whispers'], 'eleven_multilingual_v2') == 'Leise also.', 'v2 gets the words only')
    check(el_text('Na… gut.', [], 'eleven_v3') == 'Na... gut.', 'the ellipsis as three dots')
    B = {'personen': {'gl_gerhard': {'gewaehlt': 'G1', 'kandidaten': []}, 'gl_gerhard89': {'wie': 'gl_gerhard', 'gewaehlt': None},
                      'gl_funk': {'gewaehlt': 'F1'}, 'gl_funk:streife': {'gewaehlt': 'S1'}, 'gl_sarah': {'gewaehlt': None}},
         'leute': {'gl_l_f81': {'gewaehlt': 'L1'}}}
    check(gewaehlt('gl_gerhard', 'x', B) == 'G1' and gewaehlt('gl_gerhard89', 'x', B) == 'G1', 'the young Gerhard speaks as Gerhard')
    check(gewaehlt('gl_p_gerhard', 'x', B) == 'G1' and gewaehlt('gl_tel_gerhard', 'x', B) == 'G1', 'AI person and phone line: the same voice')
    check(gewaehlt('gl_funk', 'Schleuse 12: Sichtkontakt!', B) == 'S1' and gewaehlt('gl_funk', 'Rennsteig an alle.', B) == 'F1',
          'the police radio: the patrol and the control room')
    check(gewaehlt('gl_sarah', 'x', B) is None and gewaehlt('gl_wer', 'x', B) is None, 'not chosen: Edge')
    check(gewaehlt('gl_l_f81', 'x', B) == 'L1', 'a passer-by from the pool')
    check(tags_of({'id': 'a', 'regie': ['laughs']}, {}) == ['laughs'] and tags_of({'id': 'a', 'regie': ['laughs']}, {'a': ['sighs']}) == ['sighs'],
          'the hand table wins over the context')
    check(TAGGED.match('eleven_v3') and not TAGGED.match('eleven_multilingual_v2'), 'which models take tags')
    # the real casting sheet: every person of the list has 2–3 candidates (or speaks as another), every candidate an id
    R = json.load(open(os.path.join(H, 'besetzung.json'))); lines = json.load(open(os.path.join(H, 'grenzland_linien.json')))['lines']
    for w in sorted({l['who'] for l in lines}):
        p = person_of(w, R)
        check(p is not None, 'in the casting sheet: ' + w)
        if not p.get('wie') and w in R['personen']: check(2 <= len(p.get('kandidaten', [])) <= 3, '2–3 candidates: ' + w)
        for c in p.get('kandidaten', []): check(re.match(r'^[A-Za-z0-9]{20}$', c['id']), 'a voice id: ' + w + ' ' + c['id'])
    print(f'selbsttest ok: {len(ok)} checks')
    return 0


if __name__ == '__main__':
    sys.exit(selbsttest() if '--selbsttest' in sys.argv else main_probe(sys.argv))
