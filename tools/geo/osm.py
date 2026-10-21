# parse an OSM XML file into UTM32 (EPSG:25832) geometries
import xml.etree.ElementTree as ET
from pyproj import Transformer
TR = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
def load(fn):
    root = ET.parse(fn).getroot(); nodes, ways, rels = {}, {}, {}
    for n in root.iter('node'):
        x, y = TR.transform(float(n.get('lon')), float(n.get('lat'))); tags = {t.get('k'): t.get('v') for t in n.findall('tag')}
        nodes[n.get('id')] = (x, y, tags)
    for w in root.iter('way'):
        ways[w.get('id')] = ([nd.get('ref') for nd in w.findall('nd')], {t.get('k'): t.get('v') for t in w.findall('tag')})
    for r in root.iter('relation'):
        rels[r.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in r.findall('member')], {t.get('k'): t.get('v') for t in r.findall('tag')})
    return nodes, ways, rels
def coords(nodes, refs): return [(nodes[r][0], nodes[r][1]) for r in refs if r in nodes]
