# V16c sounds for felling at the Klinge – all synthesized (own work, CC0):
#   chainsaw (two-stroke single cylinder ~50 cm³): idle, full throttle without load, cutting – seamless 4 s loops; starting (pull cord) one-shot
#   the hinge cracking as the tree goes, the fall and crash of the crown, the hammer on the felling wedge
# Loops are built from a periodic pulse train (one firing per turn) convolved circularly with the exhaust/muffler response,
# so every loop closes seamlessly; the engine's speed wobble is a periodic warp of the firing times.
import numpy as np, subprocess, os, json
SR = 48000
SP = (os.environ.get('PAV_WORK') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')))
OUT = SP + '/assets/snd'; TMP = SP + '/sndtest/v16c'; os.makedirs(TMP, exist_ok=True)
rng = np.random.default_rng(1609)
LN = 4 * SR; t = np.arange(LN) / SR
def save_mp3(x, name, kbps=112, peak_db=-1.0):
    x = np.asarray(x, np.float64); x = x - x.mean(); pk = np.max(np.abs(x)); x = x / max(pk, 1e-9) * 10 ** (peak_db / 20)
    wav = TMP + '/' + name + '.f32'; x.astype(np.float32).tofile(wav)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', OUT + '/' + name + '.mp3'], check=True)
    return len(x)
def spec(x, fn): X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * fn(f), len(x))
def bp(f, fc, q): return 1.0 / (1.0 + (q * (f / fc - fc / np.maximum(f, 1e-3))) ** 2)
def bandnoise(n, lo, hi, tilt=0.0):
    X = rng.standard_normal(n // 2 + 1) + 1j * rng.standard_normal(n // 2 + 1); f = np.fft.rfftfreq(n, 1 / SR)
    g = ((f >= lo) & (f <= hi)).astype(float); g = np.convolve(g, np.ones(41) / 41, 'same'); g *= (np.maximum(f, 1.0) / 1000.0) ** tilt * (f > 1)
    x = np.fft.irfft(X * g, n); return x / (np.std(x) + 1e-12)
def cconv(x, h): n = len(x); H = np.fft.rfft(np.pad(h, (0, n - len(h))) if len(h) < n else h[:n]); return np.fft.irfft(np.fft.rfft(x) * H, n)   # circular: loops stay seamless
def damped(fr, tau, n=None, ph=0.0):
    n = n or int(SR * tau * 7); tt = np.arange(n) / SR; return np.exp(-tt / tau) * np.sin(2 * np.pi * fr * tt + ph)
# exhaust and muffler response of one firing: a few damped resonances and a short burst of turbulence
def exhaust_ir(bright=1.0):
    n = int(SR * 0.03); h = np.zeros(n)
    for fr, tau, a in [(190, 0.009, 1.0), (520, 0.0045, 0.7), (1450, 0.0022, 0.45 * bright), (3300, 0.0011, 0.28 * bright)]:
        d = damped(fr, tau, n); h += a * d
    nb = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * 0.0016)) * 0.5 * bright; return h + nb
# periodic firing train: n_fire pulses in the loop, speed wobble (whole cycles per loop), amplitude scatter, misfires
def firing(f0, wob=0.0, wob_cyc=1, scat=0.12, misfire=0.0, ln=LN):
    n = int(round(f0 * ln / SR)); k = np.arange(n); pos = (k + wob * f0 * ln / SR / (2 * np.pi * wob_cyc) * np.sin(2 * np.pi * wob_cyc * k / n)) / n * ln
    x = np.zeros(ln); amp = 1 + scat * rng.standard_normal(n); amp[rng.random(n) < misfire] *= 0.15
    i = np.floor(pos).astype(int) % ln; fr = pos - np.floor(pos); np.add.at(x, i, amp * (1 - fr)); np.add.at(x, (i + 1) % ln, amp * fr); return x
def periodic_tone(f0, amp, ln=LN): f0 = round(f0 * ln / SR) / (ln / SR); return amp * np.sin(2 * np.pi * f0 * np.arange(ln) / SR)
def slowmod(depth, cyc, ln=LN): return 1 + depth * np.sin(2 * np.pi * cyc * np.arange(ln) / ln + rng.uniform(0, 6.28))
info = {}
# ---- idle: ~2800/min (46.7 Hz), uneven (some weak firings), clutch open: no chain; a little intake and mechanical rattle ----
ex = cconv(firing(46.75, wob=0.03, wob_cyc=3, scat=0.22, misfire=0.07), exhaust_ir(0.8))
mech = bandnoise(LN, 1200, 6500, -0.2) * (0.6 + 0.4 * np.abs(np.sin(np.pi * 46.75 * t))) * 0.06
idle = ex + mech + periodic_tone(93.5, 0.04 * np.std(ex) / 0.7)
info['csaw_idle_01.mp3'] = ('csaw_idle', idle, 'Motorsäge im Leerlauf (~2800/min, unrund), Zweitakt-Einzylinder, Auspuff und Mechanik; nahtlos. Synthetisch.')
# ---- full throttle, no load: ~12 500/min (208 Hz), chain running (7-tooth sprocket: drive links pass ~1460 Hz), harsh and buzzy ----
ex = cconv(firing(208.25, wob=0.015, wob_cyc=5, scat=0.06), exhaust_ir(1.25))
chain = (periodic_tone(1458, 1.0) + periodic_tone(2916, 0.45) + periodic_tone(4374, 0.2)) * slowmod(0.1, 6) * 0.11 * np.std(ex)
air = bandnoise(LN, 2000, 11000, -0.1) * 0.22 * np.std(ex)
high = ex + chain + air
info['csaw_high_01.mp3'] = ('csaw_high', high, 'Motorsäge Vollgas ohne Last (~12 500/min), Kette läuft (Treibglieder ~1,5 kHz); nahtlos. Synthetisch.')
# ---- cutting: ~10 000/min under load (167 Hz), the cutters bite (rasp at the cutter pass ~580 Hz), chips, the operator rocks the saw ----
ex = cconv(firing(166.75, wob=0.035, wob_cyc=3, scat=0.1), exhaust_ir(1.1))
rasp = bandnoise(LN, 300, 6500, -0.2) * (0.7 + 0.3 * np.sin(2 * np.pi * (round(583 * 4) / 4) * t)) * slowmod(0.22, 3)
chips = np.zeros(LN); idx = rng.integers(0, LN, 3200); chips[idx] = rng.standard_normal(3200); chips = spec(chips, lambda f: bp(f, 2600, 0.7)); chips /= np.std(chips) + 1e-9
cut = ex + (rasp * 0.55 + chips * 0.16 + periodic_tone(1167, 0.08)) * np.std(ex) * 1.6
info['csaw_cut_01.mp3'] = ('csaw_cut', cut, 'Motorsäge im Schnitt (Fichte, ~10 000/min unter Last): Zähne, Späne, leichtes Wiegen; nahtlos. Synthetisch.')
# ---- start: two pulls on the cord (ratchet and flywheel), it fires, revs up on the fast idle and settles to idle ----
def one_shot_engine(rpm_curve, dur):
    n = int(SR * dur); ph = np.cumsum(np.interp(np.arange(n) / SR, *rpm_curve) / 60.0 / SR); k = np.floor(ph); fire = np.diff(k, prepend=k[0]) > 0
    x = np.zeros(n); x[fire] = 1 + 0.15 * rng.standard_normal(fire.sum()); return np.convolve(x, exhaust_ir(1.0))[:n]
def pull(n0, dur):   # pawls ratcheting while the flywheel spins up and down
    n = int(SR * dur); tt = np.arange(n) / SR; sp_ = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 0.7; ph = np.cumsum(18 + 34 * sp_) / SR
    clicks = (np.diff(np.floor(ph * 4), prepend=0) > 0).astype(float) * (0.4 + 0.6 * sp_); clicks = np.convolve(clicks, damped(3100, 0.0009, 300) + 0.6 * damped(1700, 0.0015, 300))[:n]
    whirr = bandnoise(n, 90, 900, -0.6) * sp_ * 0.35; return clicks + whirr
start = np.zeros(int(SR * 3.4))
p1 = pull(0, 0.55); start[:len(p1)] += p1
p2 = pull(0, 0.6); o = int(SR * 0.85); start[o:o + len(p2)] += p2
eng = one_shot_engine(([0, 1.45, 1.5, 1.75, 2.1, 2.7, 3.4], [0, 0, 1500, 6200, 5200, 2900, 2800]), 3.4); start += eng * np.clip((np.arange(len(start)) / SR - 1.4) * 8, 0, 1) * 0.9
info['csaw_start_01.mp3'] = ('csaw_start', start, 'Motorsäge anwerfen: zweimal am Seilzug, springt an, Leerlauf. Synthetisch.')
# ---- the hinge goes: creaking and cracking getting denser, a last loud crack ----
def crack(n, f1=900, f2=2400, dec=0.004):
    h = damped(f1 * rng.uniform(0.7, 1.3), dec * 1.6, n) + 0.7 * damped(f2 * rng.uniform(0.7, 1.3), dec, n) + 0.5 * damped(rng.uniform(180, 380), dec * 3, n)
    return h + rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * dec * 0.5)) * 0.9
D = 2.4; cr = np.zeros(int(SR * D))
for k in range(60):
    u = rng.random() ** 0.55; tt0 = u * 1.7; a = 0.15 + 0.6 * u * rng.random(); i0 = int(SR * tt0); c = crack(1800) * a; cr[i0:i0 + len(c)] += c[:len(cr) - i0]
creak = bandnoise(len(cr), 70, 420, -0.8) * np.clip(np.arange(len(cr)) / SR / 1.7, 0, 1) ** 2 * (np.arange(len(cr)) / SR < 1.9) * 0.25
big = np.zeros(len(cr)); i0 = int(SR * 1.78); b2 = crack(6000, 600, 1800, 0.012) * 2.2; big[i0:i0 + len(b2)] = b2[:len(cr) - i0]
info['tree_crack_01.mp3'] = ('tree_crack', cr + creak + big, 'Die Bruchleiste gibt nach: Knarren, Knacken, ein lauter Krach. Synthetisch.')
# ---- the fall: the crown rushes through the air, hits the ground (thump, branches breaking), settles ----
D = 5.0; n = int(SR * D); tt = np.arange(n) / SR; fall = np.zeros(n); T_HIT = 2.35
swoosh = bandnoise(n, 180, 3200, -0.5) * np.clip(tt / T_HIT, 0, 1) ** 2.2 * (tt < T_HIT + 0.05) * 0.8
for k in range(40):   # branches of the neighbours brushed on the way down
    tt0 = rng.uniform(1.0, T_HIT); i0 = int(SR * tt0); c = crack(1500, 1300, 3200, 0.003) * 0.25 * (tt0 / T_HIT); fall[i0:i0 + len(c)] += c[:n - i0]
thump = np.zeros(n); i0 = int(SR * T_HIT); m = n - i0; tm = np.arange(m) / SR
thump[i0:] = (np.sin(2 * np.pi * 42 * tm) * np.exp(-tm / 0.18) * 3.0 + spec(rng.standard_normal(m), lambda f: 1 / (1 + (f / 260) ** 2)) * np.exp(-tm / 0.09) * 1.2)
crash = np.zeros(n); crash[i0:] = bandnoise(m, 200, 9000, -0.25) * np.exp(-tm / 0.55) * 1.1
for k in range(140):   # branches breaking in the crown on impact
    tt0 = T_HIT + rng.exponential(0.35); i1 = int(SR * tt0)
    if i1 < n - 2000: c = crack(1800, 700, 2600, 0.005) * rng.uniform(0.3, 1.4) * np.exp(-(tt0 - T_HIT) / 0.6); crash[i1:i1 + len(c)] += c[:n - i1]
i2 = int(SR * (T_HIT + 0.42)); m2 = n - i2; tm2 = np.arange(m2) / SR; thump[i2:] += np.sin(2 * np.pi * 50 * tm2) * np.exp(-tm2 / 0.12) * 0.9   # the stem bounces once
info['tree_fall_01.mp3'] = ('tree_fall', swoosh + fall + thump + crash, 'Der Baum fällt: Rauschen der Krone, Aufschlag, brechende Äste. Synthetisch.')
# ---- hammer on the plastic felling wedge (three takes) ----
for v in range(3):
    n = int(SR * 0.6); h = (damped(rng.uniform(640, 760), 0.03, n) * 1.0 + damped(rng.uniform(1800, 2050), 0.012, n) * 0.6 + damped(rng.uniform(3900, 4500), 0.004, n) * 0.35
                          + damped(rng.uniform(140, 170), 0.05, n) * 0.8 + rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * 0.0015)) * 0.8)
    info[f'wedge_hit_0{v + 1}.mp3'] = ('wedge_hit', h, 'Spalthammer auf Fällkeil (Kunststoff). Synthetisch.')
man = json.load(open(OUT + '/manifest.json')); names = set(info); man = [m for m in man if m['file'] not in names]
for f, (kind, x, notes) in info.items():
    loop = f.startswith('csaw_') and kind != 'csaw_start'
    n = save_mp3(x, f[:-4], peak_db=-1.0 if loop else -0.5)
    e = {'file': f, 'kind': kind, 'duration_s': round(n / SR, 3), 'peak_dbfs': -1.0, 'license': 'CC0', 'author': 'synthetisch (eigene Arbeit)', 'source_url': '', 'notes': notes}
    if loop: e['loop_samples'] = n
    man.append(e); print(f, os.path.getsize(OUT + '/' + f) // 1024, 'KB')
json.dump(man, open(OUT + '/manifest.json', 'w'), indent=1, ensure_ascii=False)
