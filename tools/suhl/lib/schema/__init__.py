"""The schemas of the Suhl data products (plan 2.3, 2.4) as plain Python validators - standard library only.

Schema number 1 (suhllib.SCHEMA). The field list for people is docs/features/suhl-daten.md; its tables are printed from the
tables in this package (python3 -I tools/suhl/lib/validate.py --doc), so document and validator cannot drift apart.

    import schema                       # with tools/suhl/lib on sys.path
    rep = schema.Report()
    schema.check_tile_file(path, rep)   # one tile file of any product
    schema.check_product(folder, rep)   # a folder suhl/<product>/v<N>/ with its index
    rep.ok(), rep.errors, rep.warnings

Modules: core (report, small checkers), g (building record and g tiles), tiles (s, m, b, d tiles), index (index.json, aktuell.json,
the ground's meta.json).
"""
from .core import Report, REV            # noqa: F401
from .g import check_building, check_g_tile, BUILDING_FIELDS, KINDS, ROOF_FORMS, ROOF_CLASSES, USES, ERAS, FLAGS, QUALITY, SOURCES  # noqa: F401
from .tiles import check_s_tile, check_m_tile, check_b_tile, check_d_tile, tree_pack, tree_unpack, tree_model, TREE_KINDS, TREE_FLAGS, FURNITURE  # noqa: F401
from .index import check_index, check_aktuell, check_meta, check_product, check_tile_file, check_root, make_index, make_aktuell, source, CATALOGUE  # noqa: F401
from . import core, g, tiles, index   # noqa: F401
