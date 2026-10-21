# Raumführung (film) from the rendered 360° panoramas of variant B: slow camera pans inside each panorama, soft crossfades between places.
#   python3 tourpano.py OUT.mp4  — needs public/pano/b_*.jpg (test/pano.py), OpenCV, ffmpeg. Prints the chapter times.
import sys, os, math, subprocess, json
import numpy as np, cv2
H_ = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PD = os.path.join(H_, 'public', 'pano')
OUT = sys.argv[1]; W, H, FPS, FOV, XF = 960, 540, 24, 70.0, 1.2
# (pano id, chapter title, yaw from → to (° bearing, 0 = north), pitch from → to, seconds)
SEQ = [('bruecke', 'Ankunft über die Brücke', 186, 168, -3, -4, 7.0),
       ('garten', 'Im Garten', 205, 168, -2, 0, 7.0),
       ('eingang', 'Vor der Haustür', 300, 262, -2, -4, 6.5),
       ('bibliothek', 'Bibliothek', 235, 372, -7, -9, 9.0, 86),
       ('leiter', 'Leitertreppe nach oben', 200, 178, 8, 30, 5.5, 80),
       ('arbeitsraum', 'Arbeitsraum mit Musikecke', 322, 412, -8, -5, 8.0, 86),
       ('lounge', 'Lounge mit Westglas', 222, 292, -7, -3, 6.5, 84),
       ('dachost', 'Dachterrasse', 205, 262, -6, -3, 7.0),
       ('dach', 'Fernblick nach Westen', 228, 296, -3, -1, 9.0)]
def view_maps(Wp, Hp, yaw, pitch, fov=FOV):
    y, p = math.radians(yaw), math.radians(pitch); t = math.tan(math.radians(fov) / 2)
    f = np.array([math.sin(y) * math.cos(p), math.cos(y) * math.cos(p), math.sin(p)])          # east, north, up
    r = np.array([math.cos(y), -math.sin(y), 0.0]); u = np.cross(r, f)
    xs = (np.arange(W) + 0.5) / W * 2 - 1; ys = 1 - (np.arange(H) + 0.5) / H * 2
    X, Y = np.meshgrid(xs * t, ys * t * H / W)
    d = f[None, None, :] + X[..., None] * r[None, None, :] + Y[..., None] * u[None, None, :]
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    lon = np.arctan2(d[..., 0], d[..., 1]); lat = np.arcsin(np.clip(d[..., 2], -1, 1))
    mx = ((lon + np.pi) / (2 * np.pi) * Wp - 0.5) % Wp; my = (np.pi / 2 - lat) / np.pi * Hp - 0.5
    return mx.astype(np.float32), my.astype(np.float32)
def ease(s): return s * s * (3 - 2 * s)
def shot_frames(pid, y0, y1, p0, p1, dur, fov=FOV):
    img = cv2.imread(os.path.join(PD, 'b_' + pid + '.jpg')); Hp, Wp = img.shape[:2]
    img = cv2.copyMakeBorder(img, 0, 0, 0, 2, cv2.BORDER_WRAP)   # seam
    n = int(round(dur * FPS))
    for i in range(n):
        s = ease(i / max(1, n - 1)); mx, my = view_maps(Wp, Hp, y0 + (y1 - y0) * s, p0 + (p1 - p0) * s, fov)
        yield cv2.remap(img, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
nx = int(round(XF * FPS)); tail = []; t = 0.0; chapters = []
for k, (pid, title, y0, y1, p0, p1, dur, *fv) in enumerate(SEQ):
    frames = list(shot_frames(pid, y0, y1, p0, p1, dur, fv[0] if fv else FOV))
    chapters.append((round(t - (XF if k else 0) * 0, 1), title))
    if tail:   # crossfade the last frames of the previous place into the first of this one
        for i in range(nx):
            a = (i + 1) / (nx + 1); ff.stdin.write(cv2.addWeighted(tail[i], 1 - a, frames[i], a, 0).tobytes())
        frames = frames[nx:]
    body, tail = (frames[:-nx], frames[-nx:]) if k < len(SEQ) - 1 else (frames, [])
    for fr in body: ff.stdin.write(fr.tobytes())
    t += (len(body) + (nx if k else 0)) / FPS
    print('shot', pid, len(frames), 'frames', flush=True)
ff.stdin.close(); ff.wait()
# chapter starts: the moment a place starts fading in
starts, tt = [], 0.0
for k, (pid, title, y0, y1, p0, p1, dur, *fv) in enumerate(SEQ):
    starts.append((round(tt, 1), title)); tt += dur - XF
print('chapters', json.dumps(starts, ensure_ascii=False)); print('duration', round(tt + XF, 1), 's', os.path.getsize(OUT) // 1024, 'KB')
