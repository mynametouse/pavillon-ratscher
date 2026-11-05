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
    'vehicle_weapons': dict(page='https://opengameart.org/content/fantasy-weapons-and-apparel-sfx-library', title='Fantasy Weapons and Apparel SFX Library',
                            author='Vehicle (Jan Schupke)', lic='CC0', files=[OGA + 'weapons-apparel.zip'],
                            keep=r'sword|knife|seax|swing|swish|swoosh|whoosh|hit|stab|cut|slash'),
    # ---- blows, cuts, splashes, falls
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
    'undead': dict(page='https://opengameart.org/content/undead-moans', title='Undead Moans', author='AntumDeluge', lic='CC0',
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
# kind: (vol for kampf.json, [(source, regex on the path inside the archive, options), …]); options:
#   seg   index of the event in the file (inventory 'segs'), or t0/t1 (seconds) for an explicit window
#   tail  dB below the event's peak where the end is cut (default 40; the shot keeps its tail: 62), max  longest length in s
#   fo    fade-out in ms (default: 25 % of the length, at most 60 ms), hp/lp  high/low pass in Hz, gain  extra dB, pitch  playback-rate factor
PICKS = {}

TARGET_M = -14.0   # momentary loudness (LUFS, 400 ms) every file is brought to (unless its peak stops it)
CEIL = -1.3        # sample-peak ceiling before encoding (decoded mp3 then stays at about -1 dBFS)
KBPS = {'shotgun_shot': '128k', 'zombie_groan': '96k', 'zombie_attack': '96k', 'zombie_die': '96k'}


def momentary_max(y, sr=SR):
    """Max momentary loudness (EBU R128, 400 ms window) via ffmpeg's ebur128; short clips are padded with silence."""
    pad = np.concatenate([y, np.zeros(int(0.5 * sr), np.float32)])
    p = subprocess.run(['ffmpeg', '-v', 'info', '-nostats', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'],
                       input=pad.tobytes(), capture_output=True)
    ms = [float(m) for m in re.findall(r'M:\s*(-?[\d.]+)', p.stderr.decode('utf-8', 'replace'))]
    return max(ms) if ms else -70.0


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
    on = np.nonzero(e > pk - 40)[0]
    s0 = max(0, on[0] * hop - int(0.003 * SR))
    tl = np.nonzero(e > pk - o.get('tail', 40))[0]
    s1 = min(len(z), (tl[-1] + 1) * hop + int(0.01 * SR))
    if 'max' in o:
        s1 = min(s1, s0 + int(o['max'] * SR))
    z = z[s0:s1]
    fi = min(int(0.002 * SR), len(z) // 4) if s0 > 0 or a > 0 else 0
    if fi:
        z[:fi] *= np.linspace(0, 1, fi)
    fo = int(o['fo'] * SR / 1000) if 'fo' in o else min(int(0.06 * SR), len(z) // 4)
    fo = min(fo, len(z))
    if fo:
        z[-fo:] *= np.linspace(1, 0, fo) ** 2
    return z, (a + s0) / SR, (a + s1) / SR


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
    for kind, (vol, picks) in PICKS.items():
        made = []
        for n, (src, pat, o) in enumerate(picks, 1):
            cand = [r for r in files if r['src'] == src and re.search(pat, r['path'], re.I)]
            if not cand:
                log(f'!! {kind}_{n}: nothing matches {src} {pat}')
                continue
            r = cand[0]
            af = ','.join(f for f in [f"highpass=f={o['hp']}" if 'hp' in o else '', f"lowpass=f={o['lp']}" if 'lp' in o else ''] if f) or None
            y = ff_decode(os.path.join(out, r['raw']), SR, af)
            if 'pitch' in o:
                # playback-rate change (pitch and speed together), as a tape would
                idx = np.arange(0, len(y) - 1, o['pitch'])
                y = np.interp(idx, np.arange(len(y)), y).astype(np.float32)
            z, t0, t1 = cut(y, o, r['segs'] if 'pitch' not in o else segments(y))
            m = momentary_max(z)
            pk = float(db(np.max(np.abs(z))))
            made.append({'kind': kind, 'n': n, 'rec': r, 'z': z, 'm': m, 'pk': pk, 't0': t0, 't1': t1, 'o': o})
        if not made:
            continue
        # each file to TARGET_M unless its peak stops it; then the variants of one kind matched to the quietest
        for d in made:
            d['g'] = min(TARGET_M - d['m'], CEIL - d['pk']) + d['o'].get('gain', 0)
        lvl = min(d['m'] + d['g'] for d in made)
        names = []
        for d in made:
            g = min(d['g'], lvl - d['m'] + d['o'].get('gain', 0))
            g = min(g, CEIL - d['pk'])
            z = (d['z'] * 10 ** (g / 20)).astype(np.float32)
            name = f"kampf/{kind}_{d['n']}.mp3"
            wav = os.path.join(tmp, f"{kind}_{d['n']}.wav")
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', wav],
                           input=z.tobytes(), check=True)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', KBPS.get(kind, '112k'),
                            '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', os.path.join(fin, name)], check=True)
            yd = ff_decode(os.path.join(fin, name))
            d.update(gain=round(g, 1), out_peak=round(float(db(np.max(np.abs(yd)))), 2), out_m=round(momentary_max(yd), 1),
                     size=os.path.getsize(os.path.join(fin, name)), dur=round(len(yd) / SR, 3), name=name)
            names.append(name)
            r, s = d['rec'], sources[d['rec']['src']]
            de = lambda v, f='.2f': format(v, f).replace('.', ',')
            ch = [f"Ausschnitt {de(d['t0'])}–{de(d['t1'])} s", 'mono, 44,1 kHz', 'Stille vorn/hinten entfernt, ein- und ausgeblendet']
            if 'hp' in d['o'] or 'lp' in d['o']:
                ch.append('gefiltert (' + ', '.join(f"{k.upper()} {v} Hz" for k, v in d['o'].items() if k in ('hp', 'lp')) + ')')
            if 'pitch' in d['o']:
                ch.append(f"Tonhöhe/Tempo ×{de(d['o']['pitch'], 'g')}")
            ch.append(f"Pegel {de(d['gain'], '+.1f')} dB (Spitze {de(d['out_peak'], '.1f')} dBFS)")
            ch.append(f"MP3 {KBPS.get(kind, '112k').replace('k', ' kbit/s')}")
            if s['lic'].startswith('CC BY-SA'):
                ch.append(f"die Datei steht ebenfalls unter {s['lic']}")
            credits.append(f"| `{name}` | [{s['title']}]({s['page']}) – `{r['path']}` | {s['author']} | [{s['lic']}]({LIC_URL.get(s['lic'], s['page'])}) "
                           f"| {'; '.join(ch)} |")
            report.append(f"{name:<32} {d['dur']:6.2f}s  peak {d['out_peak']:6.2f}  M {d['out_m']:6.1f}  {d['size'] // 1024:4d} KB  <- {r['id']} {r['path'][:60]}")
        manifest[kind] = {'files': names, 'vol': vol}
        # spectrograms of the finals of this kind (ffmpeg showspectrumpic), one under the other
        pics = []
        for d in made:
            p = os.path.join(tmp, f"{kind}_{d['n']}.png")
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(fin, d['name']), '-lavfi',
                            'showspectrumpic=s=720x180:legend=1:fscale=log:start=40:stop=16000:drange=90:color=intensity', '-frames:v', '1', p], check=True)
            pics.append((d['name'], Image.open(p).convert('RGB')))
        W = max(p.width for _, p in pics)
        im = Image.new('RGB', (W, sum(p.height + 20 for _, p in pics)), (0, 0, 0))
        dr, yy = ImageDraw.Draw(im), 0
        for nm, p in pics:
            dr.text((6, yy + 3), nm, fill=(255, 255, 255), font=font(13))
            im.paste(p, (0, yy + 20))
            yy += p.height + 20
        im.save(os.path.join(out, 'spec', f'{kind}.png'), optimize=True)
    shutil.rmtree(tmp, ignore_errors=True)
    json.dump(manifest, open(os.path.join(fin, 'kampf.json'), 'w'), ensure_ascii=False, indent=1)
    total = sum(os.path.getsize(os.path.join(fin, 'kampf', f)) for f in os.listdir(os.path.join(fin, 'kampf')))
    open(os.path.join(fin, 'CREDITS_TON.md'), 'w').write(
        '# Kampfgeräusche der Zombie-Nacht – Nachweise\n\n'
        'Echte Aufnahmen mit freier Lizenz (CC0 bevorzugt, sonst CC BY / CC BY-SA / OGA-BY mit Nennung), aufbereitet von '
        '`viz3/extra/zombie/quellen/ton.py` (GitHub Actions, `.github/workflows/zombie-ton.yml`). Liegen in `viz3/extra/zombie/dist/zombie/kampf/`, '
        'die Zuordnung in `kampf.json`.\n\n'
        '| Datei | Quelle (Seite – Datei im Paket) | Urheber | Lizenz | Änderungen |\n|---|---|---|---|---|\n' + '\n'.join(credits) + '\n')
    by = {}
    for kind, (vol, picks) in PICKS.items():
        for src, pat, o in picks:
            s = sources[src]
            by.setdefault((s['author'], s['lic']), []).append(s)
    parts = []
    for (au, lic), ss in by.items():
        t = sorted({s['title'] for s in ss})
        link = ss[0]['page']
        parts.append(f"„{'“, „'.join(t)}“ von {au} (<a href=\"{link}\" target=\"_blank\" rel=\"noopener\">OpenGameArt</a>, {lic})"
                     if 'opengameart' in link else f"„{'“, „'.join(t)}“ von {au} ({lic})")
    open(os.path.join(fin, 'credits_add.txt'), 'w').write(
        ' Kampfgeräusche (zombie/kampf/): ' + '; '.join(parts) + ' – geschnitten, gefiltert und im Pegel angeglichen; '
        'Einzelnachweise in viz3/extra/zombie/quellen/CREDITS_TON.md.\n')
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
