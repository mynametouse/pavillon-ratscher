"""Contact sheets: small pictures side by side with id, place, direction and date written under each - at most 1024 px.
Used for the Panoramax sheets of the Zentrum (sheets.py, chat machine) and the Commons sheets (nach_commons.py, GitHub Actions).
Sheets go to the scratch branch ref/suhl-fotos only, never to the work branch."""
import os, io, re, time, hashlib, unicodedata
from PIL import Image, ImageDraw, ImageFont
import slib

W, MARGIN, CELL_W, IMG_H, CAP_H, HEAD_H = 1024, 8, 500, 288, 36, 34
BG, FG, DIM = (24, 26, 28), (240, 240, 235), (170, 172, 168)
_fonts = {}


def font(size, bold=False):
    key = (size, bold)
    if key not in _fonts:
        f = None
        for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else ''), '/usr/share/fonts/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')):
            try: f = ImageFont.truetype(p, size); break
            except OSError: pass
        _fonts[key] = f or ImageFont.load_default(size)
    return _fonts[key]


def slug(s):
    s = s.replace('ß', 'ss').replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('Ä', 'Ae').replace('Ö', 'Oe').replace('Ü', 'Ue')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60] or 'x'


def fit(draw, text, f, width):
    if draw.textlength(text, font=f) <= width: return text
    while len(text) > 4 and draw.textlength(text + '…', font=f) > width: text = text[:-1]
    return text + '…'


def fetch_image(url, cache, pause=0.3):
    """A small picture through a cache folder outside the repo; None if it cannot be had."""
    os.makedirs(cache, exist_ok=True)
    fn = os.path.join(cache, hashlib.sha1(url.encode()).hexdigest() + '.img')
    if not (os.path.exists(fn) and os.path.getsize(fn) > 500):
        try:
            raw = slib.get(url, pause=pause, tries=3, timeout=60)
        except Exception as e:
            print('  picture failed', url[:100], str(e)[:80], flush=True); return None
        with open(fn, 'wb') as f: f.write(raw)
    try:
        im = Image.open(fn); im.load(); return im.convert('RGB')
    except Exception as e:
        print('  not a picture', url[:100], str(e)[:80], flush=True); return None


def sheet(title, sub, cells, path, cols=2):
    """cells: list of (PIL image, caption line 1, caption line 2); at most 6 per sheet with two columns."""
    rows = (len(cells) + cols - 1) // cols
    H = HEAD_H + rows * (IMG_H + CAP_H) + MARGIN
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    d.text((MARGIN, 7), fit(d, title, font(16, True), W - 2 * MARGIN), font=font(16, True), fill=FG)
    tw = d.textlength(title, font=font(16, True))
    d.text((MARGIN + tw + 14, 11), fit(d, sub, font(11), W - 2 * MARGIN - tw - 14), font=font(11), fill=DIM)
    for k, (pic, l1, l2) in enumerate(cells):
        cx = MARGIN + (k % cols) * (CELL_W + MARGIN); cy = HEAD_H + (k // cols) * (IMG_H + CAP_H)
        if pic is not None:
            s = min(CELL_W / pic.width, IMG_H / pic.height)
            t = pic.resize((max(1, int(pic.width * s)), max(1, int(pic.height * s))), Image.LANCZOS)
            im.paste(t, (cx + (CELL_W - t.width) // 2, cy + (IMG_H - t.height) // 2))
        else:
            d.rectangle((cx, cy, cx + CELL_W - 1, cy + IMG_H - 1), outline=DIM); d.text((cx + 10, cy + 10), 'Bild nicht abrufbar', font=font(12), fill=DIM)
        d.text((cx + 2, cy + IMG_H + 3), fit(d, l1, font(12, True), CELL_W - 4), font=font(12, True), fill=FG)
        d.text((cx + 2, cy + IMG_H + 19), fit(d, l2, font(11), CELL_W - 4), font=font(11), fill=DIM)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'JPEG', quality=78, optimize=True)
    return im.size


WIND16 = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']


def wind16(deg):
    return WIND16[int((deg % 360 + 11.25) // 22.5) % 16]


def date_de(s):
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s or '')
    return f'{int(m.group(3))}.{int(m.group(2))}.{m.group(1)}' if m else (s or 'ohne Datum')[:20]
