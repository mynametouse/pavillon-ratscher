"""A stand-in for a Piper voice (feat/piper): an ONNX model with the inputs and the output of a Piper VITS model that makes a tone instead
of speech – 256 samples per phoneme id, scaled by length_scale, its pitch by the speaker id. viz3/test/piper.py serves it in place of
Hugging Face when the machine has no internet (fake=1): download, Cache Storage, worker, sessions, playback and the fallback are tested
the same way, only the voice is not real.
    pip install onnx && python3 viz3/extra/piper/make_fake.py    → viz3/extra/piper/fake.onnx (+ fake.onnx.json)
"""
import os, json
import onnx
from onnx import helper as h, TensorProto as T

HERE = os.path.dirname(os.path.abspath(__file__))
c = lambda name, dt, vals, dims=None: h.make_node('Constant', [], [name], value=h.make_tensor(name + '_v', dt, dims if dims is not None else [len(vals)], vals))
nodes = [
    c('zero', T.INT64, [0], []), c('one', T.INT64, [1], []), c('per', T.FLOAT, [256.0], []),
    c('base', T.FLOAT, [0.07], []), c('step', T.FLOAT, [0.004], []), c('amp', T.FLOAT, [0.25], []), c('shape4', T.INT64, [1, 1, 1, -1]),
    # n = len(input) * 256 * length_scale
    h.make_node('Shape', ['input'], ['shp']), h.make_node('Gather', ['shp', 'one'], ['nid'], axis=0),
    h.make_node('Cast', ['nid'], ['nidf'], to=T.FLOAT), h.make_node('Gather', ['scales', 'one'], ['ls'], axis=0),
    h.make_node('Mul', ['nidf', 'per'], ['n0']), h.make_node('Mul', ['n0', 'ls'], ['n1']),
    h.make_node('Cast', ['n1'], ['n'], to=T.INT64),
    h.make_node('Range', ['zero', 'n', 'one'], ['t']), h.make_node('Cast', ['t'], ['tf'], to=T.FLOAT),
    # frequency by speaker: 0.07 + 0.004 * sid (radians per sample)
    h.make_node('Cast', ['sid'], ['sidf'], to=T.FLOAT), h.make_node('Mul', ['sidf', 'step'], ['df']),
    h.make_node('Add', ['df', 'base'], ['w']), h.make_node('Mul', ['tf', 'w'], ['ph']),
    h.make_node('Sin', ['ph'], ['s']), h.make_node('Mul', ['s', 'amp'], ['s2']),
    h.make_node('Reshape', ['s2', 'shape4'], ['output']),
]
g = h.make_graph(nodes, 'piper_fake',
                 [h.make_tensor_value_info('input', T.INT64, [1, 'n']), h.make_tensor_value_info('input_lengths', T.INT64, [1]),
                  h.make_tensor_value_info('scales', T.FLOAT, [3]), h.make_tensor_value_info('sid', T.INT64, [1])],
                 [h.make_tensor_value_info('output', T.FLOAT, [1, 1, 1, 'm'])])
m = h.make_model(g, opset_imports=[h.make_opsetid('', 13)], producer_name='pavillon-piper-fake')
m.ir_version = 8
onnx.checker.check_model(m)
onnx.save(m, os.path.join(HERE, 'fake.onnx'))
# the same config fields a Piper voice has (espeak voice, sample rate, inference, speakers)
cfg = {'audio': {'sample_rate': 16000, 'quality': 'fake'}, 'espeak': {'voice': 'de'}, 'inference': {'noise_scale': 0.667, 'length_scale': 1, 'noise_w': 0.8},
       'num_speakers': 4, 'speaker_id_map': {'a': 0, 'b': 1, 'c': 2, 'd': 3}, 'phoneme_type': 'espeak', 'language': {'code': 'de_DE'}}
json.dump(cfg, open(os.path.join(HERE, 'fake.onnx.json'), 'w'))
print('fake model', os.path.getsize(os.path.join(HERE, 'fake.onnx')), 'bytes')
