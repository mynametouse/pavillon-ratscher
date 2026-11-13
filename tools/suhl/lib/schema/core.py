"""Report and small checkers shared by the schema modules."""
import math, os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import suhllib as S   # noqa: E402

REV = '1.1'            # revision of schema 1: raised with every compatible change; see docs/features/suhl-daten.md, section 12
MAX_NOTES = 40         # at most this many errors and warnings are kept per kind of problem


class Report:
    """collects errors (the reader cannot use the file) and warnings (suspicious, or a rule of the contract that is not vital)"""

    def __init__(self):
        self.errors, self.warnings, self.count, self.stats = [], [], {}, {}
        self.ids = {}                  # building id -> first tile seen (uniqueness over a product)

    def _add(self, lst, where, msg, kind):
        k = (lst is self.errors, kind or msg.split(':')[0][:60])
        self.count[k] = self.count.get(k, 0) + 1
        if self.count[k] <= MAX_NOTES:
            lst.append(f'{where}: {msg}')
        elif self.count[k] == MAX_NOTES + 1:
            lst.append(f'{where}: ... more of the same kind ({k[1]}) are counted but not listed')

    def err(self, where, msg, kind=None):
        self._add(self.errors, where, msg, kind)

    def warn(self, where, msg, kind=None):
        self._add(self.warnings, where, msg, kind)

    def n_errors(self):
        return sum(v for (e, _), v in self.count.items() if e)

    def n_warnings(self):
        return sum(v for (e, _), v in self.count.items() if not e)

    def ok(self, strict=False):
        return self.n_errors() == 0 and (not strict or self.n_warnings() == 0)

    def stat(self, key, n=1):
        self.stats[key] = self.stats.get(key, 0) + n


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def num_list(v, n=None, mult=None, minlen=0):
    """a flat list of finite numbers (of length n / a multiple of mult / at least minlen)?"""
    if not isinstance(v, list) or len(v) < minlen:
        return False
    if n is not None and len(v) != n:
        return False
    if mult and len(v) % mult:
        return False
    return all(is_num(q) for q in v)


def ring_area(f):
    """signed area of a flat ring [x0, y0, x1, y1, ...] (positive = counter-clockwise)"""
    s, n = 0.0, len(f) // 2
    for k in range(n):
        j = (k + 1) % n
        s += f[2 * k] * f[2 * j + 1] - f[2 * j] * f[2 * k + 1]
    return s / 2


def check_envelope(doc, product, key, rep, where, need_o=True):
    """the head every JSON tile carries: schema, product, key, o (the tile centre in model metres, for products whose positions are
    tile-local). Other head fields (version, made, utm, frame, tables ...) are the product's own. Returns the TileFrame or None."""
    if not isinstance(doc, dict):
        rep.err(where, 'the file is not a JSON object')
        return None
    if doc.get('schema') != S.SCHEMA:
        rep.err(where, f'"schema" must be the schema number {S.SCHEMA}, found {doc.get("schema")!r}', 'schema')
    if doc.get('product') != product:
        rep.err(where, f'"product" must be {product!r}, found {doc.get("product")!r}', 'product')
    try:
        L, x, y = S.parse_key(doc.get('key'))
    except S.SuhlError:
        rep.err(where, f'"key" must be "<L>/<x>/<y>", found {doc.get("key")!r}', 'key')
        return None
    if key is not None and (L, x, y) != tuple(key):
        rep.err(where, f'"key" {doc.get("key")!r} does not match the file path ({S.tile_key(*key)})', 'key')
    fr = S.tile_frame(L, x, y)
    o = doc.get('o')
    if o is None and not need_o:
        pass
    elif not num_list(o, n=2):
        rep.err(where, '"o" must be [x, y]: the tile centre in model metres (suhllib.tile_frame(L, x, y).o_json())', 'o')
    elif abs(o[0] - fr.o[0]) > 0.01 or abs(o[1] - fr.o[1]) > 0.01:
        rep.err(where, f'"o" {o} is not the tile centre in model metres {fr.o_json()} - wrong frame?', 'o')
    if not S.area('stadt').bbox[0] - 30000 < fr.centre_utm[0] < S.area('stadt').bbox[2] + 30000 or \
            not S.area('stadt').bbox[1] - 30000 < fr.centre_utm[1] < S.area('stadt').bbox[3] + 30000:
        rep.err(where, f'the tile {fr.key} lies more than 30 km from Suhl', 'far')
    return fr


def unknown_keys(obj, known, rep, where, what):
    for k in obj:
        if k not in known and not k.startswith('_') and not k.startswith('x_'):
            rep.warn(where, f'{what}: unknown field {k!r} (private fields start with "x_"; new fields: tell suhl-daten)', 'unknown ' + what + ' ' + k)
