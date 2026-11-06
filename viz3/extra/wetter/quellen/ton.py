#!/usr/bin/env python3
"""feat/wetter: the recordings of the weather's sounds – downloaded from Wikimedia Commons (free licences only, credits in
viz3/extra/wetter/manifest.json), cut into seamless loops or one-shots, levelled, encoded as MP3 (Safari plays it everywhere) into
viz3/extra/wetter/dist/wetter/ with ton.json (kind → files, volume) for wetter/wx_ton.js. The raw downloads stay outside the repo.

  python3 viz3/extra/wetter/quellen/ton.py DOWNLOAD_DIR             build the picks (downloads what is missing – slowly, Commons
                                                                    limits requests from shared addresses)
  python3 viz3/extra/wetter/quellen/ton.py survey DOWNLOAD_DIR OUT  every candidate: licence lines of its Commons page, length, level,
                                                                    a spectrogram (OUT/<name>.png, OUT/survey.json) – GitHub Actions
                                                                    (.github/workflows/wetter-ton.yml) when Commons blocks the chat machine

Picks (looked at as spectrograms – nobody can listen in the chat): steady rain without the gusts on the microphone, rain drumming on a
veranda roof for indoors, a roll of thunder with rain under it.
"""
import hashlib, json, os, subprocess, sys, time, urllib.parse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'dist', 'wetter')
SR = 44100
UA = 'pavillon-ratscher-wetter/1.0 (https://github.com/mynametouse/pavillon-ratscher; feat/wetter)'
# kind: (Commons file, start s, end s, loop crossfade s or None for a one-shot, high-pass Hz, target RMS dBFS, volume in ton.json)
PICKS = {
    'regen': [('Rain_(1).ogg', 14.0, 35.5, 1.5, 180, -21, 1.0)],
    # heavy rain: a German summer downpour (the drops on a hard surface ring at 0.7–1.5 kHz), the gusts on the microphone filtered out
    'starkregen': [('Heavy_Rain_in_Summer.ogg', 0.5, 22.2, 1.5, 220, -20, 1.0)],
    'dach': [('Rain_on_a_veranda_and_t.ogg', 0.3, 13.0, 1.0, 60, -21, 1.0)],
    # wind: a storm of 25 m/s in a Swedish pine forest – the roar with its own gusts (quieter winds: the same through a low-pass)
    'wind': [('Wind_in_Swedish_pine_forest_at_25_mps.ogg', 4.5, 60.0, 2.5, 60, -21, 1.0)],
    'donner': [
        ('Thunder_and_rain_on_a_v.ogg', 3.9, 27.0, None, 25, -19, 1.0),
        ('Booming_Thunder_2023-10-09_2-07-34_am.ogg', 10.2, 35.0, None, 25, -18, 1.0),
        ('Rhumphries_-_rbh-thunder-storm.ogg', 3.8, 16.5, None, 25, -18, 1.0),
    ],
}


# candidates to look at (Commons file names; licences checked on their pages, PD and CC BY first)
CANDIDATES = [
    'Rain_(1).ogg', 'Rain_on_a_veranda_and_t.ogg', 'Thunder_and_rain_on_a_v.ogg', 'Rain_against_the_window.ogg',
    'Heavy_Rain_in_Summer.ogg', 'Heavy_rain_in_Glenshaw,_PA.ogg', 'Falling_Rain_SFX_1_2016-11-19.oga', 'Calm_rain.wav',
    'Sound_of_light_rainfall.ogg', 'Uetersen_Regen_und_Gewitter_01.ogg',
    'Wind_in_Swedish_pine_forest_at_25_mps.ogg', 'Strong_winds_before_the_Rain.ogg', 'Wind_sounds_2020-05-10_1625.mp3',
    '20221229_-_Abisko_Turiststation_at_night_-_Wind_and_snow.wav', 'Rain_and_wind_in_London_2026_08_28.wav',
    'Rhumphries_-_rbh-thunder-storm.ogg', 'Thunder_crack_2B.ogg', 'Very_close_thunder_cracks.flac',
    'Booming_Thunder_2023-10-09_2-07-34_am.ogg', 'Thunder_01.ogg',
]


def survey(dl, out):
    import re
    os.makedirs(out, exist_ok=True)
    res = {}
    for name in CANDIDATES:
        try:
            path = fetch(name, dl)
        except SystemExit as e:
            res[name] = {'error': str(e)}
            continue
        wt = subprocess.run(['curl', '-s', '-m', '30', '-A', UA, 'https://commons.wikimedia.org/w/index.php?title=File:' +
                             urllib.parse.quote(name) + '&action=raw'], capture_output=True, text=True).stdout
        lic = [ln.strip()[:160] for ln in wt.splitlines() if re.search(r'(?i)self\||cc-|pd-|licen|author|description|\{\{(en|de)\|', ln)][:8]
        x = decode(path, 20)
        rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
        # level per second (dB) – where it is steady, where something stands out
        sec = [round(20 * np.log10(np.sqrt(np.mean(x[i:i + SR] ** 2)) + 1e-12), 1) for i in range(0, len(x) - SR, SR)]
        png = os.path.join(out, re.sub(r'[^A-Za-z0-9_.-]', '_', name) + '.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-lavfi', 'showspectrumpic=s=1200x300:legend=1:scale=log:fscale=log', png])
        res[name] = {'s': round(len(x) / SR, 1), 'rms_db': round(rms, 1), 'per_s': sec[:240], 'licence': lic}
        print(name, res[name]['s'], 's', res[name]['rms_db'], 'dB', lic[:3], flush=True)
        time.sleep(2)
    json.dump(res, open(os.path.join(out, 'survey.json'), 'w'), indent=1, ensure_ascii=False)


def fetch(name, dl):
    os.makedirs(dl, exist_ok=True)
    path = os.path.join(dl, name.replace(',', '').replace('(', '').replace(')', ''))
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return path
    h = hashlib.md5(name.encode()).hexdigest()
    url = f'https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{urllib.parse.quote(name)}'
    for i in range(4):
        r = subprocess.run(['curl', '-s', '-m', '90', '-A', UA, '-o', path, '-w', '%{http_code}', url], capture_output=True, text=True)
        if r.stdout == '200' and os.path.exists(path) and os.path.getsize(path) > 20000:
            return path
        time.sleep(20 * (i + 1))
    raise SystemExit(f'cannot download {name} ({r.stdout})')


def decode(path, hp):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-af', f'highpass=f={hp}', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def loop(x, fade):
    # the last `fade` seconds are blended (equal power) into the start: the end runs on into the beginning without a seam
    f = int(fade * SR)
    body, tail = x[:-f].copy(), x[-f:]
    t = np.linspace(0, 1, f)
    body[:f] = body[:f] * np.sin(t * np.pi / 2) + tail * np.cos(t * np.pi / 2)
    return body


def shot(x):
    f_in, f_out = int(0.02 * SR), int(min(4.0, len(x) / SR * 0.3) * SR)
    x = x.copy()
    x[:f_in] *= np.linspace(0, 1, f_in)
    x[-f_out:] *= np.linspace(1, 0, f_out) ** 1.5
    return x


def level(x, rms_db):
    rms = np.sqrt(np.mean(x ** 2)) + 1e-12
    y = x * (10 ** (rms_db / 20) / rms)
    peak = np.max(np.abs(y))
    return y * (0.97 / peak) if peak > 0.97 else y


def encode(x, path):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '80k', path],
                   input=x.astype(np.float32).tobytes(), check=True)


def main(dl):
    os.makedirs(OUT, exist_ok=True)
    man = {}
    for kind, picks in PICKS.items():
        files = []
        for i, (name, a, b, fade, hp, rms, vol) in enumerate(picks):
            x = decode(fetch(name, dl), hp)[int(a * SR):int(b * SR)]
            y = level(loop(x, fade) if fade else shot(x), rms)
            fn = f'{kind}_{i + 1}.mp3'
            encode(y, os.path.join(OUT, fn))
            files.append(fn)
            print(f'{fn}: {len(y) / SR:.1f} s from {name} {a}–{b} s, {os.path.getsize(os.path.join(OUT, fn)) // 1024} KB', flush=True)
        man[kind] = {'files': files, 'vol': picks[0][6]}
    json.dump(man, open(os.path.join(OUT, 'ton.json'), 'w'), indent=1)
    print('ton.json', man)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'survey':
        survey(sys.argv[2], sys.argv[3])
    else:
        main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/wetter_dl')
