import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import *
from PIL import Image, ImageDraw
T = np.frombuffer(open(os.path.join(OUT, 'trees.bin'), 'rb').read(), '<f4').reshape(-1, 6)
dopI = Image.open(os.path.join(DATA, 'dop_inner.jpg')).convert('RGB').resize((2400, 2400), Image.BILINEAR); dop = np.asarray(dopI).astype(np.float32)
cir = np.asarray(Image.open(os.path.join(DATA, 'cir_inner.jpg')).convert('RGB')).astype(np.float32)
E, N = m2u(T[:, 0], T[:, 1]); c = np.clip((E - (CX - 1200)).astype(int), 0, 2399); r = np.clip(((CY + 1200) - N).astype(int), 0, 2399)
br = dop[r, c].mean(1); nir = cir[r, c, 0]
Hd, xe, ye = np.histogram2d(c, r, bins=[np.arange(0, 2401, 200)] * 2)
print((Hd.T).astype(int))
crops = []
for (cc, rr) in [(np.unravel_index(np.argsort(Hd.ravel())[-1], Hd.shape)), (np.unravel_index(np.argsort(Hd.ravel())[-5], Hd.shape))]:
    x0, y0 = int(xe[cc]), int(ye[rr]); im = dopI.crop((x0, y0, x0 + 200, y0 + 200)).resize((600, 600)); d = ImageDraw.Draw(im)
    sel = (c >= x0) & (c < x0 + 200) & (r >= y0) & (r < y0 + 200)
    for i in np.nonzero(sel)[0]:
        X, Y = (c[i] - x0) * 3, (r[i] - y0) * 3; col = (255, 0, 0) if (br[i] < 80 and nir[i] < 190) else (255, 255, 0)
        d.ellipse((X - 3, Y - 3, X + 3, Y + 3), outline=col)
    crops.append(im); print('crop', x0, y0, sel.sum(), 'red share', np.mean((br[sel] < 80) & (nir[sel] < 190)).round(2))
out = Image.new('RGB', (1200, 600)); out.paste(crops[0], (0, 0)); out.paste(crops[1], (600, 0)); out.save(os.path.join(OUT, 'chk_trees.jpg'), quality=85)
