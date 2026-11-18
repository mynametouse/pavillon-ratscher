"""Hand-made data the open sources lack (model metres, x east, y north): the public greens of Ratscher's centre (read off the orthophoto
of 07.04.2024 and the open space of world/dorfkern_data.js – OSM maps no green there) and the parts of the modelled site the app keeps
in modules that cannot be loaded without a browser (the paddock: npc/npc.js PAD – test_daten.py checks that the numbers still agree)."""

# public greens: the Anger between its two streets (the Dorflinde, the playground roundabout, the trimmed hedges), the lawn before the
# old school (the signpost and the planter stand on it), the green round the fountain west of the Anger. The streets cut them (roads).
OEFFENTLICH = {
    'Anger': [(203, -112), (207, -103), (215, -98), (230, -98), (245, -101), (257, -104), (262, -110), (257, -118), (240, -119), (220, -119),
              (206, -117)],
    'Schulwiese': [(220, -86), (241, -86), (242, -97), (220, -97)],
    'Brunnen': [(181, -104), (199, -103), (200, -110), (198, -117), (181, -117)],
}
# the meadow behind the bus stop (its picket fence in dorfkern_data.js open.fences): a meadow, not a lawn
WIESE = {
    'Haltestelle': [(246, -84), (268, -88), (268, -104.5), (246, -98.5)],
}
# Ronald's goat paddock (npc/npc.js: export const PAD = { x0: 19.5, x1: 34, y0: -52, y1: -33.5, … })
PAD = {'x0': 19.5, 'x1': 34.0, 'y0': -52.0, 'y1': -33.5}
# the young trees in dug patches and the two empty patches (garden/garten_heute.js, photos 7248–7259): bare soil, nothing grows there
PFLANZFLECKEN = [(-0.3, -10.9, 0.45), (-4.0, -7.2, 0.45), (-4.4, -9.6, 0.45), (9.1, 19.9, 0.45), (-5.4, -9.3, 0.42), (-5.0, -10.5, 0.4)]
