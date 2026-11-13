"""The schemas of the Suhl data products (plan 2.3, 2.4) as plain Python validators - standard library only.

Schema number 1 (suhllib.SCHEMA), revision core.REV. The contract for people is docs/features/suhl-daten.md; the field list of the
building record is printed from the table in g.py (python3 -I tools/suhl/lib/validate.py --doc).

    import schema                       # with tools/suhl/lib on sys.path
    rep = schema.Report()
    schema.check_tile_file(path, rep)   # one tile file of any product
    schema.check_product(folder, rep)   # a folder suhl/<product>/v<N>/ with its index
    rep.ok(), rep.errors, rep.warnings
    schema.make_index(folder, 'g', 1, 'stadt', ['ethos', 'alkis', 'osm', 'dop'], extra={...})     # write index.json

Modules: core (report, the head of a tile), g (building record and g tiles), tiles (s, m, b, gr, w), d (scenario numbers, viertel.json),
index (index.json, aktuell.json, the ground's meta.json, whole folders, sets).
"""
from .core import Report, REV            # noqa: F401
from .g import (check_building, check_g_tile, check_fas, check_d, BUILDING_FIELDS, KINDS, USES, ERAS, ROOF_FORMS, ROOF_CLASSES, QUALITY, FLAGS,  # noqa: F401
                SOURCES, MATS, BALK, SIDE_EG, ADDONS)
from .tiles import (check_s_tile, check_m_tile, check_b_tile, check_gr_tile, check_w_tile, tree_pack, tree_unpack, tree_model,  # noqa: F401
                    m_count, TREE_KINDS, TREE_FLAGS, FURNITURE, GR_CLASSES, W_KINDS, W_LAYERS)
from .index import (check_index, check_aktuell, check_meta, check_product, check_tile_file, check_root, make_index, normalise_index,  # noqa: F401
                    make_aktuell, index_doc_of, index_has, version_of, source, CATALOGUE, INDEX_CORE, VIA_EASYGEODATA)
from .d import check_d_tile, check_d_record, check_viertel, D_FIELDS, HEAT_KINDS, R_COLS, QUARTER_SUMS   # noqa: F401
from . import core, g, tiles, d, index   # noqa: F401
