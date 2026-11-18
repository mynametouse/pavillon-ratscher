"""The sounds of Suhl 1989 (lazy/suhl/kern/jahr1989.js): speaking choirs, the murmur of the crowd, a megaphone, applause.

Made offline with Piper (rhasspy/piper-voices, de_DE-mls-medium: Multilingual LibriSpeech, CC BY 4.0, 236 speakers; and
de_DE-thorsten_emotional-medium: Thorsten Müller, CC0, the 'angry' style for a few shouting voices) and numpy; each choir is
14–18 different voices on the same words, a little apart in time and pitch, raised and pressed like shouting, with the echo of
the street. Applause is synthesised (single claps of filtered noise). Written to viz3/extra/suhl-laufzeit/dist/snd/suhl89/.

  pip install piper-tts; models from https://huggingface.co/rhasspy/piper-voices (de/de_DE/mls/medium, de/de_DE/thorsten_emotional/medium)
  python3 tools/suhl/ton1989.py /path/to/models
"""
import os, sys, random, subprocess, tempfile, wave
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

MD = sys.argv[1] if len(sys.argv) > 1 else '/tmp/pv'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'viz3', 'extra', 'suhl-laufzeit', 'dist', 'snd', 'suhl89')
os.makedirs(OUT, exist_ok=True)
SR = 22050
rnd = random.Random(1989)
np.random.seed(1989)
MLS = PiperVoice.load(os.path.join(MD, 'de_DE-mls-medium.onnx'))
EMO = PiperVoice.load(os.path.join(MD, 'de_DE-thorsten_emotional-medium.onnx'))


def say(v, text, spk, ls=1.0):
    cfg = SynthesisConfig(speaker_id=spk, length_scale=ls, noise_scale=0.6, noise_w_scale=0.7)
    a = np.concatenate([c.audio_float_array for c in v.synthesize(text, syn_config=cfg)]).astype(np.float32)
    i = np.where(np.abs(a) > 0.02)[0]
    return a[max(0, i[0] - 150): i[-1] + 300] if len(i) else a


def resample(a, f):  # pitch and pace up by f
    n = int(len(a) / f)
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)


def conv(a, ir):
    n = len(a) + len(ir) - 1
    m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, m) * np.fft.rfft(ir, m), m)[:n].astype(np.float32)


def room(st, t=0.7, mix=0.22):
    # the echo of a street between houses: decaying noise, a slap from the facades
    k = int(SR * t)
    out = np.zeros_like(st)
    for c in range(2):
        ir = np.random.randn(k).astype(np.float32) * np.exp(-np.linspace(0, 8, k)).astype(np.float32)
        ir[: int(SR * 0.012)] = 0
        ir[int(SR * (0.09 + 0.02 * c))] += 0.5
        ir /= np.sqrt((ir ** 2).sum())
        out[:, c] = st[:, c] * (1 - mix) + conv(st[:, c], ir)[: len(st)] * mix * 3
    return out


def band(a, lo, hi):
    m = 1 << (len(a) - 1).bit_length()
    F = np.fft.rfft(a, m)
    f = np.fft.rfftfreq(m, 1 / SR)
    F[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(F, m)[: len(a)].astype(np.float32)


def put(buf, a, t, g, pan):
    i = int(t * SR)
    a = a[: max(0, len(buf) - i)]
    buf[i: i + len(a), 0] += a * g * np.sqrt(1 - pan) * 1.2
    buf[i: i + len(a), 1] += a * g * np.sqrt(pan) * 1.2


def save(name, st, kbps=64, mono=False):
    st = st / (np.abs(st).max() + 1e-9) * 0.89
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        w = wave.open(f.name, 'wb')
        w.setnchannels(1 if mono else 2)
        w.setsampwidth(2)
        w.setframerate(SR)
        d = st.mean(axis=1) if mono else st
        w.writeframes((np.clip(d, -1, 1) * 32767).astype('<i2').tobytes())
        w.close()
        p = os.path.join(OUT, name + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f.name, '-ac', '1' if mono else '2', '-b:a', f'{kbps}k', p], check=True)
        os.unlink(f.name)
    print(name, round(len(st) / SR, 1), 's', os.path.getsize(p) // 1024, 'KB')


def choir(name, text, reps, period, n=9):
    # a caller says it alone (Thorsten, angry), then the crowd: few voices close together (Falko 19.11.: „kaum verständliche Stimmen“)
    L = (reps + 1) * period + 2.0
    buf = np.zeros((int(L * SR), 2), np.float32)
    lead = say(EMO, text, 1, 0.92)
    put(buf, lead, 0.15, 1.3, 0.5)
    spk = rnd.sample(range(236), n)
    for k, s in enumerate(spk):
        emo = k < 2
        a = say(EMO if emo else MLS, text, 1 if emo else s, rnd.uniform(0.9, 0.98))
        a = np.tanh(a * 1.3) * 0.8
        f0, g, pan, lag = rnd.uniform(1.02, 1.1), rnd.uniform(0.55, 1.0), rnd.uniform(0.15, 0.85), rnd.uniform(0, 0.05)
        for r in range(1, reps + 1):
            put(buf, resample(a, f0 * rnd.uniform(0.99, 1.01)), 0.15 + r * period + lag + rnd.uniform(0, 0.02), g, pan)
    # a bed of the crowd under it
    bed = band(np.random.randn(len(buf)).astype(np.float32), 150, 1800) * 0.025
    buf += bed[:, None]
    save(name, room(buf, 0.6, 0.14))


def line(name, text, spk=1):
    # one voice (the Volkspolizist at the gate): Thorsten, a little street echo
    a = say(EMO, text, spk, 0.95)
    st = np.zeros((len(a) + SR, 2), np.float32)
    put(st, a, 0.1, 1.0, 0.5)
    save(name, room(st, 0.5, 0.12), kbps=48, mono=True)


def rattle(name, secs=2.6):
    # the gate shaken: hits on steel bars – a few inharmonic partials each, decaying fast
    buf = np.zeros((int(secs * SR), 2), np.float32)
    t = np.arange(int(SR * 0.5)) / SR
    for _ in range(26):
        f = rnd.uniform(180, 420)
        hit = sum(np.sin(2 * np.pi * f * m * t) * np.exp(-t * (14 + 9 * m)) for m in (1, 2.76, 5.4, 8.9))
        hit = (hit + np.random.randn(len(t)) * np.exp(-t * 60) * 0.6).astype(np.float32)
        put(buf, hit * 0.25, rnd.uniform(0, secs - 0.5), rnd.uniform(0.4, 1.0), rnd.uniform(0.3, 0.7))
    save(name, room(buf, 0.6, 0.2), kbps=48)


def murmur(name, secs=14.0, n=26):
    lines = ['Ich bin seit acht hier, meine Füße sind Eis.', 'Hast du noch Streichhölzer?', 'Drinnen brennt überall Licht.',
             'Die verbrennen doch die Akten.', 'Mach mal Platz, hier hinten sieht man nichts.', 'Ob die wirklich aufmachen?',
             'Meine Schwester ist auch irgendwo hier.', 'Keine Gewalt, hört ihr.', 'Wie spät ist es denn?',
             'Der Kerl am Tor schaut ganz schön nervös.', 'Das hätte vor einem Jahr keiner geglaubt.', 'Gib mal die Kerze rüber.',
             'Morgen früh muss ich wieder ins Werk.', 'Die Busfahrer wollen auch kommen.', 'Ruhig bleiben, ganz ruhig.']
    buf = np.zeros((int(secs * SR), 2), np.float32)
    for k in range(n):
        a = say(MLS, rnd.choice(lines), rnd.randrange(236), rnd.uniform(0.95, 1.1))
        a = band(a, 120, 2600) * rnd.uniform(0.15, 0.45)
        t, pan = rnd.uniform(0, secs), rnd.uniform(0.05, 0.95)
        i = int(t * SR)
        for c, w in ((0, np.sqrt(1 - pan)), (1, np.sqrt(pan))):  # wrapped round: the loop has no seam
            idx = (np.arange(len(a)) + i) % len(buf)
            np.add.at(buf[:, c], idx, a * w)
    bed = band(np.random.randn(len(buf)).astype(np.float32), 100, 1200) * 0.03
    buf += bed[:, None]
    save(name, room(buf, 0.5, 0.18), kbps=48)


def megaphone(name):
    text = ('Liebe Suhlerinnen und Suhler! Bleibt ruhig, keine Gewalt! Eine Abordnung spricht mit der Leitung der Bezirksverwaltung. '
            'Wir gehen hier nicht weg, bis die Akten gesichert sind!')
    a = say(MLS, text, 112, 0.98)
    a = band(np.tanh(resample(a, 1.03) * 3.0), 420, 3200)
    st = np.zeros((len(a) + SR * 2, 2), np.float32)
    put(st, a, 0.2, 1.0, 0.5)
    save(name, room(st, 0.9, 0.3), kbps=48, mono=True)


def applause(name, secs=5.0):
    buf = np.zeros((int(secs * SR), 2), np.float32)
    env = lambda t: min(1, t / 0.8) * min(1, (secs - t) / 1.6)
    for _ in range(1500):
        t = rnd.uniform(0, secs - 0.1)
        if rnd.random() > env(t):
            continue
        k = int(SR * rnd.uniform(0.02, 0.05))
        c = band(np.random.randn(k).astype(np.float32), rnd.uniform(700, 1400), rnd.uniform(2200, 4200)) * np.exp(-np.linspace(0, 9, k))
        put(buf, c.astype(np.float32), t, rnd.uniform(0.2, 1.0), rnd.uniform(0.05, 0.95))
    save(name, room(buf, 0.5, 0.2), kbps=48)


line('vp_zurueck', 'Bleiben Sie zurück! Hier ist kein Durchgang!', 1)
line('vp_hause', 'Gehen Sie nach Hause, Bürger. Hier gibt es nichts zu sehen.', 4)
line('vp_ruhig', 'Bleiben Sie ruhig. Wir haben Anweisung, ruhig zu bleiben.', 4)
rattle('tor')
choir('chor_stasi_raus', 'Stasi raus!', 4, 1.45)
choir('chor_keine_gewalt', 'Keine Gewalt!', 3, 1.7)
choir('chor_volk', 'Wir sind das Volk!', 3, 1.9)
choir('chor_produktion', 'Stasi in die Produktion!', 2, 2.4)
murmur('menge')
megaphone('megafon')
applause('beifall')
