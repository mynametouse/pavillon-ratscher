"""suhl-gruen: land-use and surface classes from OpenStreetMap tags (shared by the green areas, the forest stands and the statistics),
and a small class raster of a box. The numbers are part of the products gr and w – do not renumber."""
import numpy as np

KLASSEN = {
    0: 'sonst / nicht kartiert', 1: 'Wald', 2: 'Gebüsch', 3: 'Wiese', 4: 'Rasen', 5: 'Park', 6: 'Garten', 7: 'Kleingarten',
    8: 'Friedhof', 9: 'Sportplatz', 10: 'Spielplatz', 11: 'Acker', 12: 'Obstwiese', 13: 'Wohngebiet', 14: 'Gewerbe, Industrie, Handel',
    15: 'Bahngelände', 16: 'Wasser', 17: 'Heide', 18: 'Feuchtgebiet', 19: 'Parkplatz', 20: 'Schule, Kindergarten',
}
GREEN = (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18)      # the classes of the product gr (green areas)
# drawing order: background first, the small and specific last
ORDER = (13, 14, 15, 20, 11, 1, 17, 3, 12, 2, 18, 4, 5, 8, 7, 6, 19, 10, 9, 16)
# surface for the ground shader per class (a proposal; sport pitches take their OSM surface tag where there is one)
BELAG = {1: 'waldboden', 2: 'gebuesch', 3: 'wiese', 4: 'rasen', 5: 'rasen', 6: 'garten', 7: 'garten', 8: 'rasen', 9: 'sportrasen',
         10: 'sand', 11: 'acker', 12: 'wiese', 17: 'heide', 18: 'feuchtwiese'}


def klasse(t):
    """OSM tags -> class number (0 when none applies)"""
    lu, le, na, am = t.get('landuse'), t.get('leisure'), t.get('natural'), t.get('amenity')
    if na == 'water':
        return 16
    if le == 'pitch' or le == 'track':
        return 9
    if le == 'playground':
        return 10
    if am == 'parking':
        return 19
    if lu == 'allotments':
        return 7
    if le == 'garden':
        return 6
    if lu == 'cemetery' or am == 'grave_yard':
        return 8
    if le in ('park', 'dog_park'):
        return 5
    if lu in ('grass', 'village_green', 'recreation_ground', 'flowerbed', 'greenfield'):
        return 4
    if na == 'wetland':
        return 18
    if na == 'scrub':
        return 2
    if lu == 'orchard':
        return 12
    if lu == 'meadow' or na == 'grassland':
        return 3
    if na == 'heath':
        return 17
    if lu == 'forest' or na == 'wood':
        return 1
    if lu in ('farmland', 'vineyard'):
        return 11
    if am in ('school', 'kindergarten') or lu == 'education':
        return 20
    if lu == 'railway':
        return 15
    if lu in ('industrial', 'commercial', 'retail', 'garages', 'construction', 'brownfield', 'quarry', 'farmyard', 'military'):
        return 14
    if lu in ('residential', 'religious'):
        return 13
    return 0


class Flaechen:
    """the mapped areas of the context with their class; raster(bb, px) -> uint8 class image (rows from the north)"""

    def __init__(self, K):
        self.items = []          # (class, rings of one polygon, id, tags)
        for i, t, rr, area in K['green']:
            k = klasse(t)
            if k:
                for r in rr:
                    self.items.append((k, r, i, t))
        self.box = np.array([[min(p[0] for p in r[0]), min(p[1] for p in r[0]), max(p[0] for p in r[0]), max(p[1] for p in r[0])]
                             for _, r, _, _ in self.items]) if self.items else np.zeros((0, 4))
        self.rank = {k: n for n, k in enumerate(ORDER)}

    def hit(self, bb):
        bx = self.box
        if not len(bx):
            return []
        return np.flatnonzero((bx[:, 0] <= bb[2]) & (bx[:, 2] >= bb[0]) & (bx[:, 1] <= bb[3]) & (bx[:, 3] >= bb[1]))

    def raster(self, bb, px):
        from PIL import Image, ImageDraw
        e0, n0, e1, n1 = bb
        w, h = int(round((e1 - e0) / px)), int(round((n1 - n0) / px))
        im = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(im)
        idx = sorted(self.hit(bb), key=lambda i: self.rank.get(self.items[i][0], 0))
        for i in idx:
            k, r, _, _ = self.items[i]
            # a polygon with holes is drawn into its own layer, so that a hole does not erase what lies under it
            if len(r) > 1:
                lay = Image.new('L', (w, h), 0)
                dl = ImageDraw.Draw(lay)
                dl.polygon([((x - e0) / px, (n1 - y) / px) for x, y in r[0]], fill=255)
                for hole in r[1:]:
                    if len(hole) >= 3:
                        dl.polygon([((x - e0) / px, (n1 - y) / px) for x, y in hole], fill=0)
                im.paste(k, (0, 0), lay)
            else:
                d.polygon([((x - e0) / px, (n1 - y) / px) for x, y in r[0]], fill=k)
        return np.asarray(im)
