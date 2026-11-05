#!/usr/bin/env python3
"""Real recordings for the zombie night's combat sounds (feat/zombie-ton) – runs in GitHub Actions (.github/workflows/zombie-ton.yml);
the chat machine reaches neither OpenGameArt nor Kenney nor Commons. Only open licences: CC0 first, else CC BY / CC BY-SA / OGA-BY
(never NC/ND, never "royalty free" licences that forbid passing the files on).

  python ton.py survey OUT   download every source (DL cache: $TON_DL or OUT/../dl), unpack, keep the candidates as mono 44.1 kHz FLAC
                             (OUT/raw/<source>/…), measure them (OUT/inventory.json, OUT/listing.txt), draw contact sheets of spectrograms
                             (OUT/sheets/<source>_NN.png) and list Commons audio (OUT/commons.json)
  python ton.py build OUT    cut, trim, level and encode the picks (PICKS below) from OUT/raw into OUT/final/kampf/<kind>_<n>.mp3,
                             OUT/final/kampf.json, OUT/final/CREDITS_TON.md, OUT/final/credits_add.txt and spectrograms OUT/spec/*.png

You cannot listen in the chat: choose by names, descriptions, duration, level and the spectrogram (shot: steep onset, long tail;
swish: noise band 0.2–0.6 s; blow: short low impulse). Everything here goes to the scratch branch ref/zombie-ton (never merged); the chosen
finals are copied into viz3/extra/zombie/dist/zombie/ by hand.
"""
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont

UA = 'pavillon-ratscher-research/1.0 (https://github.com/mynametouse/pavillon-ratscher; feat/zombie-ton)'
SR = 44100
AUDIO = re.compile(r'\.(wav|ogg|oga|mp3|flac|aif|aiff)$', re.I)

LIC_URL = {
    'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'OGA-BY 3.0': 'https://static.opengameart.org/OGA-BY-3.0.txt',
}

OGA = 'https://opengameart.org/sites/default/files/'
# source key: page, title, author (as to be credited), licence, files (direct URLs, or 'scrape:' + page to find the zip), keep (regex on the
# path inside the archive – only those become raw candidates; the full listing goes to listing.txt anyway)
SOURCES = {
    # ---- the shotgun
    'tabasco': dict(page='https://opengameart.org/content/gunshot-sounds', title='Gunshot Sounds', author='Tabasco', lic='CC0',
                    files=[OGA + 'sounds.zip']),
    'ffsl': dict(page='https://opengameart.org/content/the-free-firearm-sound-library', title='The Free Firearm Sound Library (prepared)',
                 author='Free Firearm Sound Library team (freefirearmsfx.com)', lic='CC0', files=[OGA + 'Prepared%20SFX%20Library.7z'],
                 keep=r'/(Mossberg|Nova|Model 12|CD)/'),
    'koenig': dict(page='https://opengameart.org/content/shotgun-shoot-reload', title='Shotgun Shoot + Reload', author='Mike Koenig (SoundBible)',
                   lic='CC BY 3.0', files=[OGA + 'mike_koenig-shotgun.7z']),
    'baradari_shots': dict(page='https://opengameart.org/content/chaingun-pistol-rifle-shotgun-shots', title='Chaingun, pistol, rifle, shotgun shots',
                           author='Michel Baradari', lic='CC BY 3.0', files=[OGA + 'shots.7z'], keep=r'shot ?gun|reload'),
    'gary': dict(page='https://opengameart.org/content/handling-guns', title='Handling Guns', author='Gary', lic='CC BY-SA 3.0',
                 files=[OGA + 'Gary%20Guns.zip'], keep=r'shot ?gun|12|browning|dry'),
    'zer0sol': dict(page='https://opengameart.org/content/shotgun-reload-sound-effects', title='Shotgun Reload Sound effects', author='zer0_sol',
                    lic='CC0', files=[OGA + 'shotgunsounds.zip']),
    'bmaczero': dict(page='https://opengameart.org/content/gun-reload-sound-effects', title='Gun Reload Sound Effects', author='Brian MacIntosh (BMacZero)',
                     lic='CC0', files=[OGA + 'clipload1.wav', OGA + 'clipload2.wav', OGA + 'singlebullet1.wav']),
    'springy': dict(page='https://opengameart.org/content/gun-reload-sounds', title='Gun reload sounds', author='SpringySpringo', lic='CC0',
                    files=[OGA + 'shotguncock_0.wav', OGA + 'gunreload1.wav']),
    'baradari_clicks': dict(page='https://opengameart.org/content/2-metal-weapon-clicks', title='2 metal weapon clicks', author='Michel Baradari',
                            lic='CC BY 3.0', files=[OGA + 'clicks.7z']),
    'lfa_clicks': dict(page='https://opengameart.org/content/equipment-clicks-ii', title='Equipment Clicks II', author='LFA', lic='CC0',
                       files=[OGA + 'equipmentclicks.wav']),
    'toydb': dict(page='https://opengameart.org/content/toy-double-barrel-shotgun-sounds', title='Toy Double Barrel Shotgun Sounds',
                  author='JumboSizedFish', lic='CC0', files=[OGA + 'toy-double-barrel-shotgun-' + k + '.wav' for k in
                                                              ('cocked', 'uncocked', 'reloading', 'equip', 'left-trigger')]),
    # ---- swings
    'swishes': dict(page='https://opengameart.org/content/swishes-sound-pack', title='Swishes Sound Pack', author='artisticdude', lic='CC0',
                    files=[OGA + 'swishes.zip']),
    'rpgpack': dict(page='https://opengameart.org/content/rpg-sound-pack', title='RPG Sound Pack', author='artisticdude', lic='CC0',
                    files=[OGA + 'rpg_sound_pack.zip'], keep=r'battle|npc|swing|hit|slash|blade|sword|squish|ogre|giant|gutt|beast|shade'),
    'melee3': dict(page='https://opengameart.org/content/3-melee-sounds', title='3 Melee sounds', author='remaxim', lic='CC0',
                   files=[OGA + 'melee%20sounds.zip']),
    'snm_swing': dict(page='https://opengameart.org/content/medieval-sound-effects-weapon-textures', title='Medieval sound effects - Weapon Textures',
                      author='Ben Jaszczak & Brian Nelson (Still North Media)', lic='CC0',
                      files=[OGA + 'medieval_sfx_textures_1_of_2.7z', OGA + 'medieval_sfx_textures_2_of_2.7z'], keep=r'swing|crossbow (lever|set|place)'),
    'kenney_impact': dict(page='https://kenney.nl/assets/impact-sounds', title='Impact Sounds', author='Kenney (kenney.nl)', lic='CC0',
                          files=['scrape:https://kenney.nl/assets/impact-sounds'], keep=r'punch|soft|generic|plank|wood_heavy|plate_heavy'),
    'kenney_rpg': dict(page='https://opengameart.org/content/50-rpg-sound-effects', title='50 RPG sound effects (RPG Audio)', author='Kenney (kenney.nl)',
                       lic='CC0', files=[OGA + 'RPGsounds_Kenney.zip']),
    'thwack': dict(page='https://opengameart.org/content/thwack-sounds', title='Thwack Sounds', author='Jordan Irwin (AntumDeluge)', lic='CC0',
                   files=[OGA + 'thwack-1.0.zip']),
    'dklon_foley': dict(page='https://opengameart.org/content/super-foley-pack', title='Super Foley Pack', author='dklon', lic='CC BY 3.0',
                        files=[OGA + 'foley_pack.zip'], keep=r'squish|chest|slap|hit|punch|body|leather|spit|wet|splat'),
    'remaxim_fall': dict(page='https://opengameart.org/content/falling-body', title='Falling body', author='remaxim', lic='CC BY-SA 3.0',
                         files=[OGA + 'fall.wav']),
    'towel_body': dict(page='https://opengameart.org/content/40-wet-towel-clubpoundhitattack-sounds', title='40 wet towel club/pound/hit/attack sounds',
                       author='qubodup', lic='CC0', files=[OGA + 'wet_towel_on_body.7z']),
    'towel_floor': dict(page='https://opengameart.org/content/12-wet-towel-hittingfallingpunching-floor-sounds',
                        title='12 wet towel hitting/falling/punching floor sounds', author='qubodup', lic='CC0', files=[OGA + 'wet_towel_on_floor.7z']),
    'inu_hits': dict(page='https://opengameart.org/content/37-hitspunches', title='37 hits/punches', author='Independent.nu', lic='CC0',
                     files=[OGA + 'independent_nu_ljudbank-hits_and_punches.7z']),
    'inu_wet': dict(page='https://opengameart.org/content/8-wet-squish-slurp-impacts', title='8 wet squish, slurp impacts', author='Independent.nu',
                    lic='CC0', files=[OGA + 'independent_nu_ljudbank-wet_squish_slurp_impacts.7z']),
    'inu_splatter': dict(page='https://opengameart.org/content/2-wooden-squish-splatter-sequences', title='2 wooden squish splatter sequences',
                         author='Independent.nu', lic='CC0', files=[OGA + 'independent_nu_ljudbank-extreme_splatter.7z']),
    'qubo_impact': dict(page='https://opengameart.org/content/impact', title='Impact', author='qubodup', lic='CC0', files=[OGA + 'qubodupImpact.7z']),
    'qubo_punch': dict(page='https://opengameart.org/content/punch', title='Punch', author='qubodup', lic='CC0', files=[OGA + 'qubodupPunch.7z']),
    'rd_hits': dict(page='https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx', title='75 CC0 breaking / falling / hit sfx',
                    author='rubberduck', lic='CC0', files=[OGA + 'sfx_breaking_and_falling.zip']),
    'squish': dict(page='https://opengameart.org/content/squish-sounds-effects', title='Squish Sounds Effects', author='EZduzziteh', lic='CC0',
                   files=[OGA + f for f in ('squish_01_0.mp3', 'squish_02.mp3', 'squish_03.mp3', 'squish_04.mp3', 'squish_05.mp3', 'squish_06.mp3',
                                            'squishpop.mp3', 'squishsplat_impact.mp3')]),
    'meat': dict(page='https://opengameart.org/content/ripping-into-meat', title='Ripping Into Meat', author='Eldritch Grim', lic='CC0',
                 files=[OGA + 'rippingintomeat_0.mp3']),
    'bones_deep': dict(page='https://opengameart.org/content/deep-bone-crackbreak-sfx', title='Deep Bone Crack/Break SFX', author='Zane Little Music',
                       lic='CC0', files=[OGA + 'deep_breaks.zip']),
    'bones_wet': dict(page='https://opengameart.org/content/fleshy-bone-breaksnap-sfx', title='Fleshy Bone Break/Snap SFX', author='Zane Little Music',
                      lic='CC0', files=[OGA + 'wet_breaks.zip']),
    'fleshy': dict(page='https://opengameart.org/content/fleshy-fight-sounds', title='Fleshy Fight Sounds', author='Will Leamon', lic='OGA-BY 3.0',
                   files=[OGA + 'fleshy_fight_sounds.zip']),
    'cgeffex': dict(page='https://opengameart.org/content/punch-slap-n-kick', title="Punch, slap, n' kick", author='CGEffex', lic='CC BY 3.0',
                    files=[OGA + 'hits.zip']),
    'dklon': dict(page='https://opengameart.org/content/body-hitting-ground', title='Body Hitting Ground', author='dklon', lic='CC BY 3.0',
                  files=[OGA + 'body_hits.wav']),
    'lrsf_horror': dict(page='https://opengameart.org/content/horror-sound-effects-library', title='Horror Sound Effects Library',
                        author='Little Robot Sound Factory (www.littlerobotsoundfactory.com)', lic='CC BY 3.0', files=[OGA + 'Horror%20Sound%20Library.zip'],
                        keep=r'bone|crack|stab|knife|monster|zombie|blood|splat|gore'),
    # ---- the zombies
    'zombies': dict(page='https://opengameart.org/content/zombies-sound-pack', title='Zombies Sound Pack', author='artisticdude', lic='CC0',
                    files=[OGA + 'zombies.zip']),
    'scorcher': dict(page='https://opengameart.org/content/scorchers-foley-sounds', title='Scorchers Foley Sounds', author='scorcher24', lic='CC0',
                     files=[OGA + 'zombie_moaning.wav']),
    'darsycho': dict(page='https://opengameart.org/content/zombie-moans', title='Zombie moans', author='Darsycho', lic='CC0',
                     files=[OGA + 'darsycho__zombie-moans_0.ogg']),
    'emopreben': dict(page='https://opengameart.org/content/zombie-moans-01-by-emopreben', title='Zombie Moans 01', author='EmoPreben', lic='CC0',
                      files=[OGA + 'zombiemoans_-_wav.zip']),
    'undead': dict(page='https://opengameart.org/content/undead-moans', title='Undead Moans', author='Jordan Irwin (AntumDeluge)', lic='CC0',
                   files=[OGA + 'undead-moans.zip']),
    'ianzazz': dict(page='https://opengameart.org/content/zombie-noises-and-moans', title='Zombie noises and moans', author='ianzazz', lic='CC0',
                    files=[OGA + 'zombienoises.zip']),
    'arcade_voice': dict(page='https://opengameart.org/content/zombie-skeleton-monster-voice-effects', title='Zombie / Skeleton / Monster Voice Effects',
                         author='ArcadeParty', lic='CC0', files=[OGA + 'Voice%20Effects%20Zombie-Skeleton-Monster%20Human%20Male.zip']),
    'rd_creature2': dict(page='https://opengameart.org/content/80-cc0-creture-sfx-2', title='80 CC0 creture SFX #2', author='rubberduck', lic='CC0',
                         files=[OGA + '80-CC0-creature-sfx-2.zip'], keep=r'attack|die|grunt|human|monster|roar|breath'),
}

# Commons: listed (commons.json); short files whose title fits and whose licence is open are fetched as source 'commons'
COMMONS_Q = ['shotgun', 'Schrotflinte', 'Flinte Schuss', 'double-barrelled shotgun', 'gunshot', 'Schuss Gewehr', 'punch sound', 'zombie']
COMMONS_TAKE = re.compile(r'shot ?gun|flinte|schrot|doppell|gravity sound|punch (raw )?kick|gunshots', re.I)
COMMONS_NOT = re.compile(r'^File:([A-Z][a-z](-[a-z]{2})?-|LL-|.*(article|pronunciation))', re.I)  # pronunciations and spoken articles
OK_LIC = re.compile(r'^(cc0|cc[- ]by[- ](sa[- ])?\d(\.\d)?|public domain|pd)', re.I)
BAD_LIC = re.compile(r'(\bnc\b|\bnd\b|non[- ]?commercial|no[- ]?deriv|fair use|copyrighted)', re.I)


def log(*a):
    print(*a, flush=True)


def http_get(url, timeout=300):
    import requests
    for k in range(4):
        try:
            r = requests.get(url, headers={'User-Agent': UA}, timeout=timeout)
            if r.status_code == 429:
                time.sleep(int(r.headers.get('Retry-After') or 10) + 1)
                continue
            r.raise_for_status()
            return r
        except Exception as e:
            log('   get failed', url, e)
            time.sleep(3 + 4 * k)
    return None


def slug(s):
    return re.sub(r'[^A-Za-z0-9._-]+', '_', s).strip('_')[:90]


def ff_decode(path, sr=SR, af=None):
    """Decode any audio file to mono float32 at sr."""
    cmd = ['ffmpeg', '-v', 'error', '-i', path]
    if af:
        cmd += ['-af', af]
    cmd += ['-ac', '1', '-ar', str(sr), '-f', 'f32le', '-']
    out = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-9))


# ------------------------------------------------------------------------------------------------------------------- survey: fetch
def fetch_source(key, src, dl, work):
    """Download the files of one source into dl/<key>/ (kept in the Actions cache) and unpack them into work/<key>/. Returns work/<key>."""
    d = os.path.join(dl, key)
    x = os.path.join(work, key)
    os.makedirs(d, exist_ok=True)
    os.makedirs(x, exist_ok=True)
    for url in src['files']:
        if url.startswith('scrape:'):
            page = url[7:]
            r = http_get(page, 60)
            hrefs = re.findall(r'''(?:href|data-href|data-url)=["']([^"']+\.zip)["']''', r.text) if r is not None else []
            if not hrefs:
                log('   no zip found on', page, 'status', None if r is None else r.status_code, 'zip mentions',
                    re.findall(r'[^"\'\s<>]*\.zip[^"\'\s<>]*', r.text)[:5] if r is not None else None)
                continue
            url = urllib.parse.urljoin(page, hrefs[0])
        fn = os.path.join(d, slug(urllib.parse.unquote(url.split('?')[0].rsplit('/', 1)[-1])))
        if not os.path.exists(fn):
            r = http_get(url)
            if r is None:
                continue
            open(fn, 'wb').write(r.content)
            log(f'   got {url} ({len(r.content) // 1024} KB)')
        low = fn.lower()
        if low.endswith('.zip'):
            with zipfile.ZipFile(fn) as z:
                z.extractall(os.path.join(x, os.path.basename(fn)[:-4]))
        elif low.endswith(('.7z', '.rar', '.tar.gz')):
            subprocess.run(['7z', 'x', '-y', '-bso0', '-bsp0', '-o' + os.path.join(x, os.path.basename(fn).rsplit('.', 1)[0]), fn], check=True)
        else:
            shutil.copy(fn, os.path.join(x, os.path.basename(fn)))
    return x


def commons_list(out):
    import requests
    api = 'https://commons.wikimedia.org/w/api.php'

    def q(**p):
        p['format'] = 'json'
        for k in range(4):
            try:
                r = requests.get(api, params=p, headers={'User-Agent': UA}, timeout=60)
                if r.status_code == 429:
                    time.sleep(int(r.headers.get('Retry-After') or 10) + 1)
                    continue
                return r.json()
            except Exception as e:
                log('   commons', e)
                time.sleep(3)
        return {}

    titles = []
    for s in COMMONS_Q:
        r = q(action='query', list='search', srsearch=s + ' filetype:audio', srnamespace=6, srlimit=40)
        titles += [m['title'] for m in r.get('query', {}).get('search', [])]
    titles = list(dict.fromkeys(titles))
    strip = lambda s: re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', s or '')).strip()
    recs = []
    for k in range(0, len(titles), 40):
        r = q(action='query', titles='|'.join(titles[k:k + 40]), prop='imageinfo', iiprop='url|extmetadata|size|mime')
        for pg in r.get('query', {}).get('pages', {}).values():
            ii = (pg.get('imageinfo') or [{}])[0]
            em = ii.get('extmetadata', {})
            recs.append({'title': pg['title'], 'url': ii.get('url'), 'page': ii.get('descriptionurl'), 'mime': ii.get('mime'),
                         'dur': ii.get('duration'), 'size': ii.get('size'),
                         'lic': strip(em.get('LicenseShortName', {}).get('value', '')),
                         'author': strip(em.get('Artist', {}).get('value', ''))[:100],
                         'desc': strip(em.get('ImageDescription', {}).get('value', ''))[:300]})
    json.dump(recs, open(os.path.join(out, 'commons.json'), 'w'), ensure_ascii=False, indent=1)
    for r in recs:
        log(f"   {r['title'][5:80]:<80} {r['lic']:<16} {r['dur']} s")
    return [r for r in recs if r['url'] and OK_LIC.search(r['lic']) and not BAD_LIC.search(r['lic']) and COMMONS_TAKE.search(r['title'])
            and not COMMONS_NOT.search(r['title']) and (r['dur'] or 0) < 60]


# ------------------------------------------------------------------------------------------------------------------- survey: measure
def segments(y, sr=SR, rel=30.0, gap=0.12, tail=45.0):
    """Events separated by silence: frames of 5 ms above (peak - rel dB), merged across gaps < gap s, each extended until its envelope
    falls (tail dB) below its own peak. Returns [[start, end, peak_db], …] in seconds."""
    hop = int(sr * 0.005)
    n = len(y) // hop
    if n < 2:
        return [[0.0, len(y) / sr, float(db(np.max(np.abs(y)) if len(y) else 0))]]
    env = np.abs(y[:n * hop]).reshape(n, hop).max(axis=1)
    e = db(env)
    pk = e.max()
    on = e > max(pk - rel, -60)
    segs, i = [], 0
    while i < n:
        if not on[i]:
            i += 1
            continue
        j = i
        while j < n and on[j]:
            j += 1
        if segs and (i - segs[-1][1]) * hop / sr < gap:
            segs[-1][1] = j
        else:
            segs.append([i, j])
        i = j
    out = []
    for k, (a, b) in enumerate(segs):
        lim = segs[k + 1][0] if k + 1 < len(segs) else n
        p = e[a:b].max()
        while b < lim and e[b] > p - tail:
            b += 1
        out.append([round(a * hop / sr, 3), round(b * hop / sr, 3), round(float(p), 1)])
    return out[:40]


def measure(y, sr=SR):
    a = np.abs(y)
    pk = float(a.max()) if len(a) else 0.0
    w = max(1, int(sr * 0.05))
    if len(y) >= w:
        c = np.cumsum(np.concatenate([[0.0], y.astype(np.float64) ** 2]))
        rms = float(np.sqrt(np.max(c[w:] - c[:-w]) / w))
    else:
        rms = float(np.sqrt(np.mean(y ** 2))) if len(y) else 0.0
    sp = np.abs(np.fft.rfft(y[:sr * 4] * np.hanning(min(len(y), sr * 4)))) if len(y) > 64 else np.zeros(2)
    fr = np.fft.rfftfreq(min(len(y), sr * 4), 1 / sr) if len(y) > 64 else np.zeros(2)
    cen = float((sp * fr).sum() / max(sp.sum(), 1e-9))
    clip = int(np.sum(a >= 0.999))
    return {'dur': round(len(y) / sr, 3), 'peak': round(float(db(pk)), 1), 'rms50': round(float(db(rms)), 1), 'centroid': int(cen),
            'clip': clip, 'segs': segments(y, sr)}


# ------------------------------------------------------------------------------------------------------------------- survey: sheets
def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf']:
        if os.path.exists(f):
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


_ANCH = np.array([[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]], float)
LUT = np.stack([np.interp(np.linspace(0, 1, 256), np.linspace(0, 1, len(_ANCH)), _ANCH[:, c]) for c in range(3)], 1).astype(np.uint8)


def spec_img(y, sr, w, h, dur_max=None):
    """Log-frequency spectrogram (60 Hz–11 kHz, 70 dB range) of y as an RGB array (h, w, 3); time axis = dur_max (or len(y))."""
    T = dur_max or len(y) / sr
    nfft = 512
    yy = np.zeros(max(int(T * sr), nfft) + nfft, np.float32)
    yy[:min(len(y), len(yy))] = y[:len(yy)]
    hop = max(1, int(T * sr / w))
    frames = np.lib.stride_tricks.sliding_window_view(yy, nfft)[::hop][:w]
    S = np.abs(np.fft.rfft(frames * np.hanning(nfft), axis=1)) + 1e-9
    fr = np.fft.rfftfreq(nfft, 1 / sr)
    tf = np.geomspace(60, min(11000, sr / 2 - 1), h)
    L = np.stack([np.interp(tf, fr, s) for s in S], 1)
    D = db(L)
    D = np.clip((D - (D.max() - 70)) / 70, 0, 1)
    img = LUT[(D[::-1] * 255).astype(int)]
    if img.shape[1] < w:
        img = np.concatenate([img, np.zeros((h, w - img.shape[1], 3), np.uint8)], 1)
    return img


def env_img(y, sr, w, h, dur_max=None):
    T = dur_max or len(y) / sr
    n = int(T * sr)
    yy = np.zeros(n, np.float32)
    yy[:min(len(y), n)] = np.abs(y[:n])
    per = max(1, n // w)
    e = db(yy[:per * w].reshape(w, per).max(1) if n >= w else np.resize(yy, w))
    hh = np.clip((e + 60) / 60, 0, 1) * (h - 2)
    img = np.full((h, w, 3), 20, np.uint8)
    for x in range(w):
        img[h - 1 - int(hh[x]):h, x] = (90, 200, 120) if e[x] < -1.5 else (255, 80, 80)
    return img


def panel(y, title, sr=SR, W=900, H=170, EH=60):
    """A detailed picture of one sound: log-frequency spectrogram (60 Hz–16 kHz, 80 dB), dB envelope (-60..0), time grid."""
    T = max(len(y) / sr, 0.05)
    nfft = 1024
    hop = max(1, int(T * sr / W))
    yy = np.concatenate([y, np.zeros(nfft + W * hop, np.float32)])
    fr = np.lib.stride_tricks.sliding_window_view(yy, nfft)[::hop][:W]
    S = np.abs(np.fft.rfft(fr * np.hanning(nfft), axis=1)) + 1e-9
    f = np.fft.rfftfreq(nfft, 1 / sr)
    tf = np.geomspace(60, 16000, H)
    L = 20 * np.log10(np.stack([np.interp(tf, f, s) for s in S], 1))
    D = np.clip((L - (L.max() - 80)) / 80, 0, 1)
    img = Image.new('RGB', (W + 50, H + EH + 36), (10, 10, 10))
    d = ImageDraw.Draw(img)
    img.paste(Image.fromarray(LUT[(D[::-1] * 255).astype(int)]), (44, 18))
    f1 = font(11)
    for fq in (100, 300, 1000, 3000, 10000):
        yp = 18 + H - int(np.log(fq / 60) / np.log(16000 / 60) * H)
        d.text((2, yp - 6), str(fq) if fq < 1000 else f'{fq // 1000}k', fill=(200, 200, 200), font=f1)
    per = max(1, len(y) // W)
    n = min(W, len(y) // per)
    e = db(np.abs(y[:n * per]).reshape(n, per).max(1))
    for x in range(n):
        h = int(np.clip((e[x] + 60) / 60, 0, 1) * (EH - 4))
        d.line([(44 + x, 18 + H + EH - h), (44 + x, 18 + H + EH)], fill=(90, 200, 120) if e[x] < -1.5 else (255, 80, 80))
    step = 0.05 if T <= 0.8 else 0.1 if T <= 2.5 else 0.5
    for i in range(1, int(T / step) + 1):
        x = 44 + int(i * step / T * W)
        d.line([(x, 18 + H), (x, 18 + H + 6)], fill=(255, 255, 255))
        if i % 2 == 0:
            d.text((x - 12, 18 + H + EH + 2), f'{i * step:.2f}', fill=(220, 220, 220), font=f1)
    d.text((44, 2), title, fill=(255, 255, 255), font=font(13))
    return img


def sheet(out, key, recs, cols=3, rows=6):
    f1, f2 = font(13), font(11)
    CW, SH, EH, TH = 330, 110, 26, 34
    CH = SH + EH + TH
    n = 0
    for k in range(0, len(recs), cols * rows):
        part = recs[k:k + cols * rows]
        R = (len(part) + cols - 1) // cols
        im = Image.new('RGB', (cols * CW, R * CH), (12, 12, 12))
        dr = ImageDraw.Draw(im)
        for i, r in enumerate(part):
            x, y0 = (i % cols) * CW, (i // cols) * CH
            try:
                yv = ff_decode(os.path.join(out, r['raw']), 22050)
                T = min(max(len(yv) / 22050, 0.05), 6.0)
                im.paste(Image.fromarray(spec_img(yv, 22050, CW - 6, SH, T)), (x + 3, y0 + 2))
                im.paste(Image.fromarray(env_img(yv, 22050, CW - 6, EH - 4, T)), (x + 3, y0 + SH + 4))
                step = 0.1 if T <= 1.2 else 0.5 if T <= 4 else 1.0
                for t in np.arange(step, T, step):
                    px = x + 3 + int(t / T * (CW - 6))
                    dr.line([(px, y0 + SH - 6), (px, y0 + SH + 1)], fill=(255, 255, 255))
            except Exception as e:
                dr.text((x + 8, y0 + 8), 'Fehler ' + str(e)[:50], fill=(255, 80, 80), font=f2)
            dr.text((x + 4, y0 + SH + EH + 1), f"{r['id']}  {os.path.basename(r['path'])[:38]}", fill=(255, 255, 255), font=f1)
            dr.text((x + 4, y0 + SH + EH + 17), f"{r['dur']:.2f}s  pk {r['peak']}  rms {r['rms50']}  ev {len(r['segs'])}  clip {r['clip']}",
                    fill=(190, 190, 190), font=f2)
        n += 1
        im.save(os.path.join(out, 'sheets', f'{key}_{n:02d}.png'), optimize=True)
    return n


def survey(out):
    dl = os.environ.get('TON_DL') or os.path.join(os.path.dirname(os.path.abspath(out)), 'dl')
    work = os.path.join(os.path.dirname(os.path.abspath(out)), 'work')
    shutil.rmtree(work, ignore_errors=True)
    for sub in ('raw', 'sheets', 'texts'):
        shutil.rmtree(os.path.join(out, sub), ignore_errors=True)
        os.makedirs(os.path.join(out, sub), exist_ok=True)
    inv, listing = [], []
    only = [s for s in os.environ.get('QUELLEN', '').split(',') if s]
    srcs = dict(SOURCES)
    log('--- Commons')
    try:
        for r in commons_list(out):
            k = 'commons_' + slug(r['title'][5:])[:40]
            srcs[k] = dict(page=r['page'], title=r['title'][5:], author=r['author'], lic=r['lic'], files=[r['url']])
    except Exception as e:
        log('   commons failed', e)
    for key, src in srcs.items():
        if only and key not in only:
            continue
        log('---', key, src['page'])
        try:
            x = fetch_source(key, src, dl, work)
        except Exception as e:
            log('   fetch failed', e)
            continue
        keep = re.compile(src['keep'], re.I) if src.get('keep') else None
        files = sorted(os.path.relpath(os.path.join(a, f), x) for a, _, fs in os.walk(x) for f in fs)
        listing += [f'{key}\t{f}' for f in files]
        for f in files:
            if re.search(r'\.(txt|csv|md|rtf)$', f, re.I) and os.path.getsize(os.path.join(x, f)) < 300000:
                os.makedirs(os.path.join(out, 'texts', key), exist_ok=True)
                shutil.copy(os.path.join(x, f), os.path.join(out, 'texts', key, slug(f)))
        recs = []
        for f in files:
            if not AUDIO.search(f) or '__MACOSX' in f or os.path.basename(f).startswith('._'):
                continue
            if keep and not keep.search(f):
                continue
            idx = len(recs) + 1
            raw = f'raw/{key}/{idx:03d}_{slug(os.path.basename(f))[:60]}.flac'
            try:
                os.makedirs(os.path.join(out, 'raw', key), exist_ok=True)
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(x, f), '-t', '30', '-ac', '1', '-ar', str(SR), '-sample_fmt', 's16',
                                os.path.join(out, raw)], check=True)
                y = ff_decode(os.path.join(out, raw))
            except Exception as e:
                log('   bad audio', f, e)
                continue
            r = {'id': f'{key}#{idx}', 'src': key, 'path': f, 'raw': raw}
            r.update(measure(y))
            recs.append(r)
        log(f'   {len(files)} files, {len(recs)} candidates, {sheet(out, key, recs) if recs else 0} sheets')
        inv += recs
    json.dump({'sources': {k: {kk: v for kk, v in s.items() if kk != 'keep'} for k, s in srcs.items()}, 'files': inv},
              open(os.path.join(out, 'inventory.json'), 'w'), ensure_ascii=False, indent=0)
    open(os.path.join(out, 'listing.txt'), 'w').write('\n'.join(listing) + '\n')
    open(os.path.join(out, 'sources.sha'), 'w').write(sources_key() + '\n')
    log(f'survey: {len(inv)} candidates')


# ------------------------------------------------------------------------------------------------------------------- build
# kind: (loudness in dB relative to the shot – gives 'vol' in kampf.json, [(source, regex on the path inside the archive, options), …]);
# options:
#   seg   index of the event in the file (inventory 'segs'), or t0/t1 (seconds) for an explicit window
#   tail  dB below the event's peak where the end is cut (default 40; the shot keeps its tail: 62), max  longest length in s
#   fo    fade-out in ms (default: 25 % of the length, at most 60 ms), hp/lp  high/low pass in Hz, gain  extra dB, pitch  playback-rate factor
SWL = dict(hp=250, fi=60, fo=100, head=60, tail=60, lim=6)   # light swish: no wind rumble, explicit window
SWH = dict(hp=120, fi=60, fo=120, head=60, tail=60, lim=6)   # heavy swing: keep some body
GUN = dict(tail=62, max=2.4, fo=650)                          # the shot keeps its tail
CRUNCH = dict(fo=60)                                          # bone crunch layered under a blunt hit
PICKS = {
    'swing_light': (-16, [('snm_swing', r'Dagger Swing', dict(SWL, t0=0.95, t1=1.27)),
                           ('snm_swing', r'Dagger Swing', dict(SWL, t0=2.06, t1=2.40)),
                           ('snm_swing', r'Seax Swing', dict(SWL, t0=3.93, t1=4.25))]),
    'swing_heavy': (-13, [('snm_swing', r'Axe Swing', dict(SWH, t0=1.47, t1=1.85)),
                           ('snm_swing', r'Axe Swing', dict(SWH, t0=3.34, t1=3.72)),
                           ('snm_swing', r'Spear Swing', dict(SWH, hp=150, t0=1.40, t1=1.78))]),
    'hit_blunt': (-6, [('thwack', r'PCM/thwack-07', dict(tail=40, lim=4, layers=[('bones_wet', r'Wet Break 9', dict(CRUNCH, t0=0.08, t1=0.32, gain=-10, at=0.004))])),
                        ('thwack', r'PCM/thwack-08', dict(t1=0.46, tail=40, lim=4, layers=[('bones_deep', r'Deep Break 9', dict(CRUNCH, t0=0.07, t1=0.35, gain=-9, at=0.004))])),
                        ('towel_body', r'wet_towel_on_body-39', dict(tail=40, lim=4, layers=[('bones_wet', r'Wet Break 2', dict(CRUNCH, t0=0.17, t1=0.42, gain=-10, at=0.004))]))]),
    'hit_blade': (-6, [('qubo_impact', r'ImpactMeat02\.flac', dict(fo=120, lim=3)),
                        ('qubo_impact', r'ImpactMeat01\.flac', dict(head=20, fo=120, lim=3)),
                        ('inu_wet', r'impactsplat03', dict(max=0.45, fo=120, lim=3))]),
    'stab': (-7, [('lrsf_horror', r'Wav/Stab_Knife_00\.wav', dict(fo=100, lim=4)),
                   ('lrsf_horror', r'Wav/Stab_Knife_02\.wav', dict(fo=100, lim=4))]),
    'punch': (-9, [('dklon_foley', r'leather_hits', dict(t0=0.80, t1=1.15, head=25, tail=40, fo=80, lim=6)),
                     ('dklon_foley', r'leather_hits', dict(t0=3.48, t1=3.85, head=25, tail=40, fo=80, lim=6)),
                     ('dklon_foley', r'leather_hits', dict(t0=5.23, t1=5.60, head=25, tail=40, fo=80, lim=6))]),
    'kick': (-7, [('dklon_foley', r'chest_hit', dict(t0=4.55, t1=5.00, head=25, tail=42, fo=120, lim=9)),
                    ('dklon_foley', r'chest_hit', dict(t0=0.47, t1=0.95, head=25, tail=42, fo=120, lim=9))]),
    'bone_crack': (-9, [('lrsf_horror', r'Wav/Bonecrack_02\.wav', dict(t0=0.135, fo=80, lim=4)),
                         ('bones_wet', r'Wet Break 9', dict(t0=0.0, t1=0.42, fo=80, lim=4))]),
    'splat': (-10, [('dklon_foley', r'squishy_sounds', dict(t0=20.15, t1=20.60, head=25, tail=32, fo=80, lim=3)),
                     ('dklon_foley', r'squishy_sounds', dict(t0=9.50, t1=9.95, head=25, tail=32, fo=80, lim=3)),
                     ('inu_wet', r'impactsplat07', dict(fo=100, lim=3))]),
    'body_fall': (-8, [('remaxim_fall', r'fall\.wav', dict(tail=50, fo=120, lim=4)),
                        ('dklon_foley', r'body_hit_on_ground', dict(t0=12.85, t1=13.45, tail=50, fo=120, lim=4))]),
    # near take (the crack) + mid-distance take of the same 12-gauge (boom, echo from buildings, tail), then limited hard as game shots are
    'shotgun_shot': (0, [('ffsl', r'/H_21P\.wav', dict(GUN, t0=0.42, t1=3.0, target=-10, lim=12,
                                                         layers=[('ffsl', r'/H_16P\.wav', dict(GUN, t0=0.56, t1=4.0, gain=-2))])),
                           ('ffsl', r'/O_21P\.wav', dict(GUN, t0=0.38, t1=3.3, target=-10, lim=12,
                                                         layers=[('ffsl', r'/O_17P\.wav', dict(GUN, t0=0.65, t1=3.6, gain=-2))]))]),
    'shotgun_dry': (-16, [('gary', r'12ga_dry', dict(t0=4.08, t1=4.75, tail=45, lim=4))]),
    'shotgun_open': (-13, [('gary', r'12ga_dry', dict(t0=0.44, t1=1.25, tail=45, fo=80, lim=4,
                                                        layers=[('gary', r'12ga_load_chamber', dict(t0=3.55, t1=4.25, tail=45, at=0.30, gain=-4))]))]),
    'shotgun_shell': (-15, [('gary', r'12ga_load_chamber', dict(t0=0.57, t1=0.80, tail=45, fo=40, lim=4)),
                             ('zer0sol', r'Shell in Chamber', dict(t0=0.47, t1=0.67, tail=45, fo=40, lim=4))]),
    'shotgun_close': (-12, [('gary', r'12ga_dry', dict(t0=2.30, t1=3.00, tail=45, lim=4))]),
    'zombie_groan': (-9, [('emopreben', r'ZombieMoan1', dict(tail=45, fo=150, lim=3)),
                           ('emopreben', r'ZombieMoan3', dict(tail=45, fo=150, lim=3)),
                           ('undead', r'undead-1', dict(tail=45, fo=150, lim=3)),
                           ('darsycho', r'zombie-moans', dict(t0=0.2, t1=3.25, tail=45, fo=150, lim=3))]),
    'zombie_attack': (-6, [('arcade_voice', r'zombieYell1\.wav', dict(tail=45, fo=60, lim=3)),
                             ('arcade_voice', r'zombieYell10\.wav', dict(tail=45, fo=60, lim=3))]),
    'zombie_die': (-7, [('arcade_voice', r'zombieDeath3\.wav', dict(tail=45, fo=100, lim=3)),
                         ('arcade_voice', r'zombieDeath2\.wav', dict(tail=45, fo=100, lim=3))]),
}

TARGET_L = -14.0   # short-term loudness (K-weighted, loudest 100 ms, LUFS) every file is brought to – unless its peak stops it; 'lim' dB
                   # may be pushed into a lookahead limiter for that (short impacts and the shot have a high crest factor)
CEIL = -1.5        # sample-peak ceiling before encoding; after decoding the mp3 every file is checked for <= -1 dBFS
KBPS = {'zombie_groan': '112k', 'zombie_attack': '112k', 'zombie_die': '112k'}  # all others 128 kbit/s


def momentary_max(y, sr=SR):
    """Max momentary loudness (EBU R128, 400 ms window) via ffmpeg's ebur128; short clips are padded with silence."""
    pad = np.concatenate([y, np.zeros(int(0.5 * sr), np.float32)])
    p = subprocess.run(['ffmpeg', '-v', 'info', '-nostats', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'],
                       input=pad.tobytes(), capture_output=True)
    ms = [float(m) for m in re.findall(r'M:\s*(-?[\d.]+)', p.stderr.decode('utf-8', 'replace'))]
    return max(ms) if ms else -70.0


def short_max(y, sr=SR, win=0.1):
    """Loudness of the loudest 100 ms (K-weighting as in EBU R128 via ffmpeg biquads, mean square, LUFS) – for short sounds the
    400 ms momentary loudness says too little; variants of one kind are matched by this."""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-af',
                        'highshelf=f=1500:g=4:t=q:w=0.7071,highpass=f=38:t=q:w=0.5', '-f', 'f32le', '-'], input=y.astype(np.float32).tobytes(),
                       capture_output=True, check=True)
    k = np.frombuffer(p.stdout, np.float32).astype(np.float64)
    w = max(1, int(win * sr))
    if len(k) < w:
        k = np.concatenate([k, np.zeros(w - len(k))])
    c = np.cumsum(np.concatenate([[0.0], k ** 2]))
    return float(10 * np.log10(max(np.max(c[w:] - c[:-w]) / w, 1e-12)) - 0.691)


def limit(y, gain_db, ceil_db=None, sr=SR):
    """Gain, then (if the peak would pass the ceiling) ffmpeg's lookahead limiter: attack 1 ms, release 60 ms, delay compensated."""
    ceil_db = CEIL if ceil_db is None else ceil_db
    z = y * 10 ** (gain_db / 20)
    if float(db(np.max(np.abs(z)))) <= ceil_db:
        return z.astype(np.float32)
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-af',
                        f'apad=pad_dur=0.05,alimiter=limit={10 ** (ceil_db / 20):.4f}:attack=1:release=60:level=0:latency=1',
                        '-f', 'f32le', '-'], input=z.astype(np.float32).tobytes(), capture_output=True, check=True)
    w = np.frombuffer(p.stdout, np.float32)[:len(z)].copy()
    return np.clip(w, -10 ** (ceil_db / 20), 10 ** (ceil_db / 20))


def cut(y, o, segs):
    if 't0' in o:
        a, b = int(o['t0'] * SR), int(o.get('t1', len(y) / SR) * SR)
    elif 'seg' in o:
        s = segs[o['seg']]
        a = max(0, int((s[0] - 0.01) * SR))
        nxt = segs[o['seg'] + 1][0] if o['seg'] + 1 < len(segs) else len(y) / SR
        b = int(min(nxt, s[1] + 0.6) * SR) if o.get('tail', 40) < 50 else int(nxt * SR)
    else:
        a, b = 0, len(y)
    z = y[a:b].copy()
    if len(z) == 0:
        return z, 0.0, 0.0
    hop = int(SR * 0.002)
    n = max(1, len(z) // hop)
    e = db(np.abs(z[:n * hop]).reshape(n, hop).max(1))
    pk = e.max()
    on = np.nonzero(e > pk - o.get('head', 40))[0]
    s0 = max(0, on[0] * hop - int(0.003 * SR))
    tl = np.nonzero(e > pk - o.get('tail', 40))[0]
    s1 = min(len(z), (tl[-1] + 1) * hop + int(0.01 * SR))
    if 'max' in o:
        s1 = min(s1, s0 + int(o['max'] * SR))
    z = z[s0:s1]
    fi = int(o['fi'] * SR / 1000) if 'fi' in o else (int(0.002 * SR) if s0 > 0 or a > 0 else 0)
    fi = min(fi, len(z) // 2)
    if fi:
        z[:fi] *= np.linspace(0, 1, fi)
    fo = int(o['fo'] * SR / 1000) if 'fo' in o else min(int(0.06 * SR), len(z) // 4)
    fo = min(fo, len(z))
    if fo:
        z[-fo:] *= np.linspace(1, 0, fo) ** 2
    return z, (a + s0) / SR, (a + s1) / SR


def render(out, files, src, pat, o):
    """One source cut out of its raw file: filters, playback rate, window, trim, fades. Returns (inventory record, samples, t0, t1)."""
    cand = [r for r in files if r['src'] == src and re.search(pat, r['path'], re.I)]
    if not cand:
        raise LookupError(f'nothing matches {src} {pat}')
    r = cand[0]
    af = ','.join(f for f in [f"highpass=f={o['hp']},highpass=f={o['hp']}" if 'hp' in o else '', f"lowpass=f={o['lp']}" if 'lp' in o else ''] if f) or None
    y = ff_decode(os.path.join(out, r['raw']), SR, af)
    if 'pitch' in o:
        # playback-rate change (pitch and speed together), as a tape would
        idx = np.arange(0, len(y) - 1, o['pitch'])
        y = np.interp(idx, np.arange(len(y)), y).astype(np.float32)
    z, t0, t1 = cut(y, o, r['segs'] if 'pitch' not in o else segments(y))
    return r, z, t0, t1


def build(out):
    inv = json.load(open(os.path.join(out, 'inventory.json')))
    sources, files = inv['sources'], inv['files']
    fin = os.path.join(out, 'final')
    shutil.rmtree(fin, ignore_errors=True)
    shutil.rmtree(os.path.join(out, 'spec'), ignore_errors=True)
    os.makedirs(os.path.join(fin, 'kampf'))
    os.makedirs(os.path.join(out, 'spec'))
    tmp = os.path.join(out, 'tmp')
    os.makedirs(tmp, exist_ok=True)
    manifest, credits, report = {}, [], []
    de = lambda v, f='.2f': format(v, f).replace('.', ',')
    level = {}
    for kind, (rel, picks) in PICKS.items():
        made = []
        for n, (src, pat, o) in enumerate(picks, 1):
            try:
                r, z, t0, t1 = render(out, files, src, pat, o)
                parts = [(r, o, t0, t1, 0.0)]
                # layers: other recordings mixed in (offset 'at' s, level 'gain' dB relative to the raw recording)
                for lsrc, lpat, lo in o.get('layers', []):
                    lr, lz, lt0, lt1 = render(out, files, lsrc, lpat, lo)
                    at = int(lo.get('at', 0) * SR)
                    if at + len(lz) > len(z):
                        z = np.concatenate([z, np.zeros(at + len(lz) - len(z), np.float32)])
                    z[at:at + len(lz)] += lz * 10 ** (lo.get('gain', 0) / 20)
                    parts.append((lr, lo, lt0, lt1, lo.get('gain', 0)))
            except LookupError as e:
                log(f'!! {kind}_{n}: {e}')
                continue
            made.append({'kind': kind, 'n': n, 'parts': parts, 'z': z, 'l': short_max(z), 'pk': float(db(np.max(np.abs(z)))), 'o': o})
        if not made:
            continue
        # each file to TARGET_L unless its peak stops it (or up to 'lim' dB of limiting), the variants of one kind matched to the quietest,
        # then the per-file tweak 'gain'
        for d in made:
            g1 = min(d['o'].get('target', TARGET_L) - d['l'], CEIL - d['pk'] + d['o'].get('lim', 0))
            d['z1'] = limit(d['z'], g1)
            d['g1'], d['l1'] = g1, short_max(d['z1'])
            d['gr'] = max(0.0, g1 - (CEIL - d['pk']))
        lvl = min(d['l1'] for d in made)
        names = []
        for d in made:
            g = lvl - d['l1'] + d['o'].get('gain', 0)
            name = f"kampf/{kind}_{d['n']}.mp3"
            wav = os.path.join(tmp, f"{kind}_{d['n']}.wav")
            for attempt in range(4):
                z = limit(d['z1'], g)
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', wav],
                               input=z.tobytes(), check=True)
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', KBPS.get(kind, '128k'),
                                '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', os.path.join(fin, name)], check=True)
                yd = ff_decode(os.path.join(fin, name))
                over = float(db(np.max(np.abs(yd)))) + 1.0
                if over <= 0:
                    break
                g -= over + 0.1  # the mp3 overshoots the ceiling: a little less and once more
            g = d['g1'] + g
            d.update(gain=round(g, 1), out_peak=round(float(db(np.max(np.abs(yd)))), 2), out_m=round(momentary_max(yd), 1), out_l=round(short_max(yd), 1),
                     size=os.path.getsize(os.path.join(fin, name)), dur=round(len(yd) / SR, 3), name=name)
            names.append(name)
            src_cells, au_cells, lic_cells, ch = [], [], [], []
            for k, (r, o, t0, t1, lg) in enumerate(d['parts']):
                s = sources[r['src']]
                src_cells.append(f"[{s['title']}]({s['page']}) – `{r['path'].rsplit('/', 1)[-1]}`")
                if s['author'] not in au_cells:
                    au_cells.append(s['author'])
                lic = f"[{s['lic']}]({LIC_URL.get(s['lic'], s['page'])})"
                if lic not in lic_cells:
                    lic_cells.append(lic)
                c = f"Ausschnitt {de(t0)}–{de(t1)} s"
                if 'hp' in o or 'lp' in o:
                    c += ', gefiltert (' + ', '.join(f"{k2.upper()} {v} Hz" for k2, v in o.items() if k2 in ('hp', 'lp')) + ')'
                if 'pitch' in o:
                    c += f", Tonhöhe/Tempo ×{de(o['pitch'], 'g')}"
                if k:
                    c = f"dazugemischt ({de(lg, '+.0f')} dB, ab {de(o.get('at', 0), '.2f')} s): " + c
                ch.append(c)
            ch += ['mono, 44,1 kHz', 'Stille vorn/hinten entfernt, ein- und ausgeblendet',
                   f"Pegel {de(d['gain'], '+.1f')} dB" + (f", Spitzen um bis zu {de(d['gr'], '.0f')} dB begrenzt" if d['gr'] >= 0.5 else '')
                   + f" (Spitze {de(d['out_peak'], '.1f')} dBFS)", f"MP3 {KBPS.get(kind, '128k').replace('k', ' kbit/s')}"]
            sa = [sources[p[0]['src']]['lic'] for p in d['parts'] if sources[p[0]['src']]['lic'].startswith('CC BY-SA')]
            if sa:
                ch.append(f"die Datei steht ebenfalls unter {sa[0]}")
            credits.append(f"| `{name}` | {' + '.join(src_cells)} | {', '.join(au_cells)} | {', '.join(lic_cells)} | {'; '.join(ch)} |")
            report.append(f"{name:<32} {d['dur']:6.2f}s  peak {d['out_peak']:6.2f}  L100 {d['out_l']:6.1f}  M {d['out_m']:6.1f}  {d['size'] // 1024:4d} KB  <- "
                          + ' + '.join(f"{p[0]['id']} {p[0]['path'].rsplit('/', 1)[-1][:40]} {p[2]:.2f}-{p[3]:.2f}" for p in d['parts']))
        manifest[kind] = {'files': names, 'vol': 1.0}
        level[kind] = float(np.median([d['out_l'] for d in made]))
        # pictures of the finals of this kind, one under the other (decoded from the mp3; own renderer – ffmpeg 6.1's showspectrumpic
        # with a log frequency axis draws a false line near 4–5 kHz)
        pics = [panel(ff_decode(os.path.join(fin, d['name'])), f"{d['name']}  {d['dur']:.2f} s  Spitze {d['out_peak']:.1f} dBFS  "
                      f"L100 {d['out_l']:.1f}  M {d['out_m']:.1f}") for d in made]
        im = Image.new('RGB', (max(p.width for p in pics), sum(p.height for p in pics)), (0, 0, 0))
        yy = 0
        for p in pics:
            im.paste(p, (0, yy))
            yy += p.height
        im.save(os.path.join(out, 'spec', f'{kind}.png'), optimize=True)
    shutil.rmtree(tmp, ignore_errors=True)
    # vol: the mix inside the zombie fight – each kind 'rel' dB below the shot (measured: loudest 100 ms), the shot at 1
    ref = level.get('shotgun_shot', max(level.values()))
    for kind, (rel, picks) in PICKS.items():
        if kind in manifest:
            manifest[kind]['vol'] = round(min(1.0, 10 ** ((ref + rel - level[kind]) / 20)), 2)
            log(f'vol {kind:<14} {manifest[kind]["vol"]:.2f}  (level {level[kind]:.1f}, {rel:+d} dB from the shot)')
    json.dump(manifest, open(os.path.join(fin, 'kampf.json'), 'w'), ensure_ascii=False, indent=1)
    total = sum(os.path.getsize(os.path.join(fin, 'kampf', f)) for f in os.listdir(os.path.join(fin, 'kampf')))
    open(os.path.join(fin, 'CREDITS_TON.md'), 'w').write(
        '# Kampfgeräusche der Zombie-Nacht – Nachweise\n\n'
        'Echte Aufnahmen mit freier Lizenz (CC0 bevorzugt, sonst CC BY / CC BY-SA / OGA-BY mit Nennung), aufbereitet von '
        '`viz3/extra/zombie/quellen/ton.py` (GitHub Actions, `.github/workflows/zombie-ton.yml`). Liegen in `viz3/extra/zombie/dist/zombie/kampf/`, '
        'die Zuordnung in `kampf.json` (`vol`: Lautstärke im Kampf, bezogen auf den Schuss = 1, gemessen am lautesten 100-ms-Stück jeder Art). '
        'Die Schüsse stammen von Vorderschaftrepetierflinten Kaliber 12 (Charles Daly, Benelli Nova; je eine Aufnahme aus der Nähe und eine aus '
        'mittlerem Abstand derselben Waffe gemischt) – eine doppelläufige Flinte gleichen Kalibers klingt beim Schuss praktisch gleich; Öffnen, '
        'Schließen und Abschlagen ohne Patrone von einer Selbstladeflinte Kaliber 12 (Browning).\n\n'
        '| Datei | Quelle (Seite – Datei im Paket) | Urheber | Lizenz | Änderungen |\n|---|---|---|---|---|\n' + '\n'.join(credits) + '\n')
    # one sentence for the credits (manifest credits_add): the CC BY / CC BY-SA works with links, the CC0 ones by name
    used = {}
    for kind, (rel, picks) in PICKS.items():
        for src, pat, o in picks:
            for k in [src] + [l[0] for l in o.get('layers', [])]:
                used[k] = sources[k]
    link = lambda s: f"<a href=\"{s['page']}\" target=\"_blank\" rel=\"noopener\">{s['title']}</a>"
    groups = []
    for lic in ('CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0', 'OGA-BY 3.0'):
        ss = [s for s in used.values() if s['lic'] == lic]
        if ss:
            groups.append(f"unter {lic}: " + ', '.join(f"„{link(s)}“ von {s['author']}" for s in ss)
                          + (f" (die bearbeiteten Dateien ebenfalls unter {lic})" if 'SA' in lic else ''))
    cc0 = sorted({s['author'] for s in used.values() if s['lic'] == 'CC0'})
    if cc0:
        groups.append('gemeinfrei (CC0): ' + ', '.join(cc0))
    open(os.path.join(fin, 'credits_add.txt'), 'w').write(
        ' Kampfgeräusche (zombie/kampf/): echte Aufnahmen von OpenGameArt – ' + '; '.join(groups)
        + ' – geschnitten, gefiltert und im Pegel angeglichen, Einzelnachweise in viz3/extra/zombie/quellen/CREDITS_TON.md.\n')
    rep = '\n'.join(report) + f'\n\ntotal {total / 1024:.0f} KB in {len(report)} files ({len(manifest)} kinds)\n'
    open(os.path.join(out, 'build.txt'), 'w').write(rep)
    log(rep)
    if total > 1.6 * 1024 * 1024:
        log('!! more than 1.5 MB')


def sources_key():
    """Hash of everything the survey depends on (sources, Commons queries, the survey code itself)."""
    code = open(__file__).read()
    code = code[code.index('# ---- the shotgun'):code.index('# ------------------------------------------------------------------------------------------------------------------- build')]
    return hashlib.sha1(code.encode()).hexdigest()[:16]


if __name__ == '__main__':
    if sys.argv[1] == 'key':
        print(sources_key())
        sys.exit(0)
    mode, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    if mode in ('survey', 'all'):
        survey(out)
    if mode in ('build', 'all') and PICKS:
        build(out)
