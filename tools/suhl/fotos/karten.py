"""Coverage maps for the scratch branch: the streets of the Kernstadt and of the Zentrum coloured by what the street photos
show (no photo / photo within 25 m / a photo looks across at one side / at both sides), the photo positions with their
viewing direction (Zentrum map), the landmarks. Drawn with Pillow from the files of coverage.py; no map tiles are loaded.
    python3 tools/suhl/fotos/karten.py <refdir> [gebiete.geojson]     ->  <refdir>/karten/abdeckung_kernstadt.png, abdeckung_zentrum.png"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
import slib, sheetlib

REF = os.path.abspath(sys.argv[1]); OUTDIR = os.path.join(REF, 'karten')
areas = slib.Areas(sys.argv[2] if len(sys.argv) > 2 else None)
COL = {'none': (214, 60, 50), 'photo': (240, 170, 40), 'one': (120, 190, 80), 'both': (20, 120, 60), 'unnamed': (200, 200, 196), 'unnamed_photo': (150, 170, 200)}
P = slib.load('abdeckung_punkte.json.gz'); cov = slib.load('abdeckung.json'); osm = slib.load('strassen.json.gz')
photos = slib.load('panoramax.json.gz')['photos']


def draw(name, area, size, with_photos, title):
    b = areas.bbox(area)
    x0, y0 = slib.xy(b[1], b[0]); x1, y1 = slib.xy(b[3], b[2])
    pad = 0.04 * max(x1 - x0, y1 - y0); x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
    top = 44
    sc = min(size / (x1 - x0), (size - top - 58) / (y1 - y0))
    W, H = size, min(size, int((y1 - y0) * sc) + top + 58)
    px = lambda x, y: ((x - x0) * sc + (W - (x1 - x0) * sc) / 2, top + (y1 - y) * sc)
    im = Image.new('RGB', (W, H), (250, 250, 247)); d = ImageDraw.Draw(im)
    polys = areas.geom[area]['coordinates'] if areas.geom[area]['type'] == 'MultiPolygon' else [areas.geom[area]['coordinates']]
    for poly in polys: d.line([px(*slib.xy(la, lo)) for lo, la in poly[0]], fill=(120, 120, 130), width=1)
    r = max(1, int(round(2.6 * sc)))   # half of the 5 m step, so that the dots join to lines
    order = sorted(range(len(P['x'])), key=lambda i: (bool(P['f'][i] & 16), P['f'][i] & 7))   # unnamed first, best coverage on top
    for i in order:
        f = P['f'][i]
        if area == 'zentrum' and not f & 8: continue
        x, y = px(P['x'][i], P['y'][i])
        if not f & 16: c, rr = COL['unnamed_photo' if f & 1 else 'unnamed'], max(1, r - 1)
        else:
            c = COL['both'] if (f & 6) == 6 else COL['one'] if f & 6 else COL['photo'] if f & 1 else COL['none']; rr = r + (1 if size / (x1 - x0) > 0.3 else 0)
            if f & 32: rr = max(1, rr - 1)
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=c)
    if with_photos:
        for p in photos:
            if not areas.has(area, p['lat'], p['lon']): continue
            x, y = px(*slib.xy(p['lat'], p['lon']))
            if p['heading'] is not None:
                a = math.radians(p['heading']); d.line((x, y, x + 9 * math.sin(a), y - 9 * math.cos(a)), fill=(30, 60, 160), width=1)
            d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(30, 60, 160))
        names = []
        for m in cov['wahrzeichen']:
            ids = [s.split(' ')[0] for s in m.get('osm', []) if not s.startswith(('street', 'area'))]
            o = next((o for o in osm['objects'] if o['id'] in ids), None)
            if not o: continue
            cx = sum(q[1] for q in o['pts']) / len(o['pts']); cy = sum(q[0] for q in o['pts']) / len(o['pts'])
            x, y = px(*slib.xy(cy, cx))
            names.append(f"{len(names) + 1}  {m['name']}: {m.get('fotos_mit_blick', 0)}")
            d.ellipse((x - 8, y - 8, x + 8, y + 8), fill=(255, 255, 255), outline=(0, 0, 0), width=2)
            t = str(len(names)); d.text((x - d.textlength(t, font=sheetlib.font(10, True)) / 2, y - 6), t, font=sheetlib.font(10, True), fill=(0, 0, 0))
        half = (len(names) + 1) // 2
        for col, part in enumerate((names[:half], names[half:])):
            wmax = max([d.textlength(t, font=sheetlib.font(10)) for t in part] + [0])
            bx0 = 8 if col == 0 else W - 12 - wmax
            d.rectangle((bx0 - 3, top + 2, bx0 + wmax + 3, top + 6 + 12 * len(part)), fill=(250, 250, 247))
            for k, t in enumerate(part): d.text((bx0, top + 4 + 12 * k), t, font=sheetlib.font(10), fill=(0, 0, 0))
    d.rectangle((0, 0, W, top - 4), fill=(250, 250, 247))
    d.text((10, 6), title, font=sheetlib.font(17, True), fill=(20, 20, 20))
    d.text((10, 27), f"Stand {cov['made'][:10]} · Gebiet: {areas.source} · Straßen © OpenStreetMap-Mitwirkende (ODbL) · Fotos: Panoramax (CC BY-SA 4.0)", font=sheetlib.font(11), fill=(90, 90, 90))
    ly = H - 54
    items = [('none', 'Straße mit Namen, kein Foto bis 25 m'), ('photo', 'Foto bis 25 m (meist Blick längs)'), ('one', 'Foto blickt quer auf eine Seite'), ('both', 'Foto blickt quer auf beide Seiten'),
             ('unnamed', 'Weg/Zufahrt ohne Namen'), ('unnamed_photo', 'ohne Namen, mit Foto')]
    x = 10
    for k, (key, text) in enumerate(items):
        if k == 3: x, ly = 10, ly + 20
        d.rectangle((x, ly + 2, x + 22, ly + 12), fill=COL[key]); d.text((x + 28, ly), text, font=sheetlib.font(11), fill=(40, 40, 40)); x += 36 + int(d.textlength(text, font=sheetlib.font(11))) + 16
    if with_photos: d.text((10, H - 12), 'Blauer Punkt mit Strich = Foto und Blickrichtung · Nummer = Wahrzeichen, dahinter die Zahl der Fotos bis 80 m mit Blick darauf', font=sheetlib.font(10), fill=(40, 40, 40))
    bar = 1000 if (x1 - x0) > 4000 else 200
    bx = W - 20 - bar * sc; d.line((bx, H - 70, bx + bar * sc, H - 70), fill=(0, 0, 0), width=3); d.text((bx, H - 86), f'{bar} m', font=sheetlib.font(11), fill=(0, 0, 0))
    os.makedirs(OUTDIR, exist_ok=True)
    fn = os.path.join(OUTDIR, name); im.save(fn, optimize=True); print(fn, im.size, os.path.getsize(fn) // 1024, 'KB')


z = cov['summen']['zentrum']['strassen']; k = cov['summen']['kernstadt']['strassen']
draw('abdeckung_kernstadt.png', 'kernstadt', 1024, False, f"Suhl Kernstadt – Straßenfotos je Straße: {k['anteil_foto'] * 100:.0f} % von {k['laenge_km']:.0f} km benannter Straßen mit Foto")
draw('abdeckung_zentrum.png', 'zentrum', 1024, True, f"Suhl Zentrum – Straßenfotos: {z['anteil_foto'] * 100:.0f} % von {z['laenge_km']:.1f} km benannter Straßen mit Foto bis 25 m")
