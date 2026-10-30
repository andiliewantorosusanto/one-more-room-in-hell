"""Pack local Mixamo characters/motions from .tmp/zombie-source for this game.

Sources and usage terms: public/assets/infected-provenance.json.
Run after converting the source FBXs with Godot FBX2glTF 0.13.1.
"""
import copy
import json
import pathlib
import struct

SOURCE = pathlib.Path('.tmp/zombie-source')
OUTPUT = pathlib.Path('public/assets/infected')
OUTPUT.mkdir(parents=True, exist_ok=True)


def read(name):
    data = (SOURCE / (name + '.glb')).read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20 + length]), data[28 + length:]


def values(g, data, index):
    a = g['accessors'][index]
    view = g['bufferViews'][a['bufferView']]
    width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
    assert a['componentType'] == 5126 and 'byteStride' not in view
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [list(struct.unpack_from('<' + 'f' * width, data, start + i * width * 4)) for i in range(a['count'])]


def mul(a, b):
    x, y, z, w = a
    X, Y, Z, W = b
    return [w*X+x*W+y*Z-z*Y, w*Y-x*Z+y*W+z*X, w*Z+x*Y-y*X+z*W, w*W-x*X-y*Y-z*Z]


def inverse(q):
    return [-q[0], -q[1], -q[2], q[3]]


def parents(g):
    return {c: i for i, n in enumerate(g['nodes']) for c in n.get('children', [])}


def world_rotations(g, rotations):
    result = {}
    parent = parents(g)
    def world(i):
        if i not in result:
            result[i] = mul(world(parent[i]), rotations[i]) if i in parent else rotations[i]
        return result[i]
    for i in range(len(rotations)):
        world(i)
    return result


motions = {name: read(file) for name, file in {
    'walk': 'mixamo-Zombie Walk', 'run': 'mixamo-running',
    'attack1_r': 'mixamo-Zombie Attack', 'dead1': 'mixamo-Zombie Death',
}.items()}

for source, name in [('zombie', 'romero'), ('crawler', 'yaku'), ('ghoul', 'parasite')]:
    g, original = read(source)
    for material in g['materials']:
        if material.get('alphaMode') == 'BLEND':
            # Torn clothing uses texture cutouts; a zero FBX opacity hid entire shirts.
            material['alphaMode'] = 'MASK'
            material['alphaCutoff'] = .4
            material['pbrMetallicRoughness'].setdefault('baseColorFactor', [1, 1, 1, 1])[3] = 1
    data = bytearray(original)
    g['animations'] = []
    lookup = {n.get('name'): i for i, n in enumerate(g['nodes'])}
    target_rest = world_rotations(g, [n.get('rotation', [0, 0, 0, 1]) for n in g['nodes']])
    target_parents = parents(g)

    def append(rows, kind):
        while len(data) % 4:
            data.append(0)
        offset = len(data)
        for row in rows:
            data.extend(struct.pack('<' + 'f' * len(row), *row))
        g['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(data) - offset})
        a = {'bufferView': len(g['bufferViews']) - 1, 'componentType': 5126, 'count': len(rows), 'type': kind}
        if kind == 'SCALAR':
            a.update(min=[min(r[0] for r in rows)], max=[max(r[0] for r in rows)])
        g['accessors'].append(a)
        return len(g['accessors']) - 1

    for role, (motion, binary) in motions.items():
        animation = motion['animations'][0]
        channels = animation['channels']
        samplers = animation['samplers']
        tracks = {(c['target']['node'], c['target']['path']): values(motion, binary, samplers[c['sampler']]['output']) for c in channels}
        times = values(motion, binary, samplers[channels[0]['sampler']]['input'])
        assert all(len(v) == len(times) for v in tracks.values())
        if role == 'attack1_r':
            times = [[r[0] * 1.67 / times[-1][0]] for r in times]
        source_rest = world_rotations(motion, [n.get('rotation', [0, 0, 0, 1]) for n in motion['nodes']])
        matched = {i: lookup[n['name']] for i, n in enumerate(motion['nodes']) if n.get('name') in lookup}
        outputs = {i: [] for i in matched if (i, 'rotation') in tracks}
        for frame in range(len(times)):
            posed = world_rotations(motion, [tracks.get((i, 'rotation'), [n.get('rotation', [0, 0, 0, 1])] * len(times))[frame] for i, n in enumerate(motion['nodes'])])
            target_pose = {j: mul(mul(posed[i], inverse(source_rest[i])), target_rest[j]) for i, j in matched.items()}
            for i in outputs:
                j = matched[i]
                parent = target_parents.get(j)
                outputs[i].append(mul(inverse(target_pose.get(parent, target_rest.get(parent, [0, 0, 0, 1]))), target_pose[j]))
        clip = {'name': role, 'channels': [], 'samplers': []}
        time_index = append(times, 'SCALAR')
        for i, rows in outputs.items():
            clip['channels'].append({'sampler': len(clip['samplers']), 'target': {'node': matched[i], 'path': 'rotation'}})
            clip['samplers'].append({'input': time_index, 'output': append(rows, 'VEC4'), 'interpolation': 'LINEAR'})
        hip = next(i for i in matched if motion['nodes'][i]['name'] == 'mixamorig:Hips')
        rest = motion['nodes'][hip]['translation']
        target = g['nodes'][matched[hip]]['translation']
        ratio = target[1] / rest[1]
        translations = tracks[(hip, 'translation')]
        rows = [[target[k] + (r[k] - rest[k]) * ratio if k == 1 or role == 'dead1' else target[k] for k in range(3)] for r in translations]
        clip['channels'].append({'sampler': len(clip['samplers']), 'target': {'node': matched[hip], 'path': 'translation'}})
        clip['samplers'].append({'input': time_index, 'output': append(rows, 'VEC3'), 'interpolation': 'LINEAR'})
        g['animations'].append(clip)

    # Hold the walk's opening pose at rest; retain the same mapped rig.
    idle = copy.deepcopy(g['animations'][0])
    idle['name'] = 'idle'
    for s in idle['samplers']:
        row = values(g, data, s['output'])[0]
        s['input'] = append([[0], [2]], 'SCALAR')
        s['output'] = append([row, row], g['accessors'][s['output']]['type'])
    g['animations'].append(idle)
    hurt = copy.deepcopy(idle)
    hurt['name'] = 'hurt'
    for channel in hurt['channels']:
        sampler = hurt['samplers'][channel['sampler']]
        row = values(g, data, sampler['output'])[0]
        middle = mul([-.1097783, 0, 0, .9939561], row) if channel['target']['node'] == lookup['mixamorig:Hips'] and channel['target']['path'] == 'rotation' else row
        sampler['input'] = append([[0], [.1], [.25]], 'SCALAR')
        sampler['output'] = append([row, middle, row], g['accessors'][sampler['output']]['type'])
    g['animations'].append(hurt)
    for role, original_role in [('attack2', 'attack1_r'), ('dead2', 'dead1')]:
        clip = copy.deepcopy(next(a for a in g['animations'] if a['name'] == original_role))
        clip['name'] = role
        g['animations'].append(clip)
    g['buffers'] = [{'byteLength': len(data)}]
    encoded = json.dumps(g, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    data += b'\0' * (-len(data) % 4)
    result = struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(data)) + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + struct.pack('<II', len(data), 0x004e4942) + data
    (OUTPUT / (name + '.glb')).write_bytes(result)
    print(name, len(result), 'bytes')
