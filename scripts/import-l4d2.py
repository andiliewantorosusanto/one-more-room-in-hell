"""Run with portable Blender + SourceIO; read a local L4D2 installation, export GLB.

blender -b --factory-startup --python-exit-code 1 --python scripts/import-l4d2.py --
  --game "F:/SteamLibrary/steamapps/common/Left 4 Dead 2" --sourceio PATH
  --asset models/infected/common_female_nurse01.mdl --role infected --output PATH

Valve assets remain proprietary. This script does not modify the installation.
"""
import argparse
import importlib.util
import json
import os
import pathlib
import sys

import bpy

parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True)
parser.add_argument('--sourceio', required=True)
parser.add_argument('--asset', required=True)
parser.add_argument('--role', choices=['infected', 'weapon', 'survivor', 'map'], required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
os.environ['NO_BPY'] = '1'
addon = pathlib.Path(args.sourceio).resolve()
spec = importlib.util.spec_from_file_location('SourceIO', addon / '__init__.py', submodule_search_locations=[str(addon)])
module = importlib.util.module_from_spec(spec)
sys.modules['SourceIO'] = module
spec.loader.exec_module(module)
from SourceIO.blender_bindings.attributes import register_props, SourceIO_PG_FlexController, SOURCEIO_UL_MountedResource
bpy.utils.register_class(SourceIO_PG_FlexController)
bpy.utils.register_class(SOURCEIO_UL_MountedResource)
register_props()
cache = pathlib.Path('.tmp/source-port/texture-cache').resolve()
cache.mkdir(parents=True, exist_ok=True)
bpy.context.scene.sourceio_props.TextureCachePath = str(cache)

from SourceIO.library.shared.content_manager import ContentManager
content_key = ContentManager._key
ContentManager._key = lambda self, path: content_key(self, TinyPath(str(path).lower()) if not TinyPath(path).is_absolute() else TinyPath(path))
from SourceIO.library.shared.app_id import SteamAppId
from SourceIO.library.utils import TinyPath, FileBuffer
# Upstream TinyPath mistakes a dotted parent directory for a filename suffix.
TinyPath.with_suffix = lambda self, suffix: TinyPath(pathlib.PurePosixPath(str(self)).with_suffix(suffix).as_posix())
from SourceIO.library.models.mdl.v49.mdl_file import MdlV49
from SourceIO.library.models.mdl.structs.local_animation import StudioAnimDesc
from SourceIO.library.models.mdl.load_animations import load_animations_from_mdl
from SourceIO.blender_bindings.models import import_model
from SourceIO.blender_bindings.models.common import put_into_collections
from SourceIO.blender_bindings.models.import_animations import import_animations_to_armature
from SourceIO.blender_bindings.operators.import_settings_base import ModelOptions

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
cm = ContentManager()
cm.scan_for_content(TinyPath(str(pathlib.Path(args.game) / 'left4dead2/gameinfo.txt')))
options = ModelOptions.default()
options.scale = .0254
options.create_flex_drivers = False
options.bodygroup_vis_switches = False
options.generate_wrinkle_map_node_group = False
options.import_animations = False
options.import_include_animations = False
# SourceIO eagerly decodes every descriptor while parsing. Decode selected clips below.
decode_animation = StudioAnimDesc.read_animations
StudioAnimDesc.read_animations = lambda *a, **k: None

# L4D2 frame animations mix constant and changing channels in the same block.
# SourceIO currently treats these as mutually exclusive.
def read_frame_animation(self, buffer, bones, count):
    import numpy as np
    from SourceIO.library.models.mdl.structs.local_animation import ANIM_DTYPE, AniBoneFlags as F, AnimDescFlags
    from SourceIO.library.models.mdl.structs.frame_anim import StudioFrameAnim
    from SourceIO.library.models.mdl.structs.compressed_vectors import Quat48, Quat48S
    start = buffer.tell()
    header = StudioFrameAnim.from_buffer(buffer)
    flags = [F(buffer.read_uint8()) for _ in bones]
    frames = {}
    for bone in bones:
        data = np.zeros(count, ANIM_DTYPE)
        data['rot'][:, 3] = 1
        if not self.flags & AnimDescFlags.DELTA:
            data['pos'] = bone.position
            data['rot'] = bone.quat
        frames[bone.name] = data
    if header.constant_offset:
        buffer.seek(start + header.constant_offset)
        for bone, flag in zip(bones, flags):
            data = frames[bone.name]
            if flag & F.CONST_ROT2: data['rot'] = Quat48S.read(buffer)
            if flag & F.RAW_ROT: data['rot'] = Quat48.read(buffer)
            if flag & F.RAW_POS: data['pos'] = buffer.read_fmt('3e')
            if flag & F.CONST_POS2: data['pos'] = buffer.read_fmt('3f')
    if header.frame_offset and header.frame_length:
        for i in range(count):
            buffer.seek(start + header.frame_offset + i * header.frame_length)
            for bone, flag in zip(bones, flags):
                data = frames[bone.name][i]
                if flag & F.ANIM_ROT2: data['rot'] = Quat48S.read(buffer)
                if flag & F.ANIM_ROT: data['rot'] = Quat48.read(buffer)
                if flag & F.ANIM_POS: data['pos'] = buffer.read_fmt('3e')
                if flag & F.FULL_ANIM_POS: data['pos'] = buffer.read_fmt('3f')
    return frames

StudioAnimDesc._read_frame_animations = read_frame_animation
export_meshes = set()


def load_model(path):
    buffer = cm.find_file(TinyPath(path))
    if not buffer:
        raise FileNotFoundError(path)
    container = import_model(TinyPath(path), buffer, cm, options, SteamAppId.LEFT_4_DEAD_2)
    put_into_collections(container, pathlib.PurePosixPath(path).stem)
    # Export the default intact body, not every mutually exclusive gore/bodygroup mesh.
    selected = {id(group[0]) for group in container.bodygroups.values() if group and group[0] is not None}
    retained = []
    for obj in list(container.objects):
        if selected and id(obj) not in selected:
            bpy.data.objects.remove(obj, do_unlink=True)
        else:
            export_meshes.add(obj)
            retained.append(obj)
    container.objects = retained
    live = {id(obj) for obj in retained}
    container.bodygroups = {name: [obj for obj in group if obj is None or id(obj) in live] for name, group in container.bodygroups.items()}
    return container


def add_animations(container, asset):
    buffer = cm.find_file(TinyPath(asset))
    mdl = MdlV49.from_buffer(buffer)
    sources = [(asset, mdl, buffer)]
    for inc in mdl.include_models:
        b = cm.find_file(TinyPath(inc))
        if b:
            sources.append((inc, MdlV49.from_buffer(b), b))
    if args.role == 'infected':
        requested = {'idle': ['@Idle_Neutral_01', '@Idle'], 'walk': ['@Walk_Neutral_01', 'a_WalkN'],
                     'run': ['a_Run_01'], 'attack1_r': ['@Melee_Moving01', '@AttackIncap_03'],
                     'attack2': ['@Melee_Moving02', '@AttackIncap_01'], 'hurt': ['@Shoved_Backward_01'],
                     'dead1': ['@Death_01'], 'dead2': ['@Death_03']}
    elif args.role == 'weapon':
        requested = {'idle': ['a_idle_1', 'a_idle', '@idle', 'idle'], 'walk': ['a_idle_1', 'a_idle'],
                     'run': ['a_run', 'a_idle_1'], 'fire': ['@fire', '@fire1', '@attack', 'a_fire', '@midslash1'],
                     'reload': ['@reload', '@reload_empty'], 'draw': ['@deploy', 'deploy']}
    else:
        requested = {'idle': ['@Idle_Standing_Pistol', '@Idle_Standing_Align', '@Idle_Standing_Rifle']}
    available = {a.name: (path, model, buf, a) for path, model, buf in sources for a in model.anim_descs}
    print('ANIMATION_NAMES', json.dumps(list(available)), flush=True)
    mapping = {}
    for role, candidates in requested.items():
        name = next((n for n in candidates if n in available), None)
        if name is None:
            print('MISSING_ROLE', role, flush=True)
            continue
        path, model, buf, descriptor = available[name]
        model.anim_descs = [descriptor]
        StudioAnimDesc.read_animations = decode_animation
        from SourceIO.library.models.mdl.load_animations import _resolve_ani_file, _get_block_table
        ani = _resolve_ani_file(model, cm, TinyPath(path))
        descriptor.read_animations(buf, model.bones, ani.buffer if ani else None, _get_block_table(model, buf))
        animations = load_animations_from_mdl(model, buf, cm, TinyPath(path))
        StudioAnimDesc.read_animations = lambda *a, **k: None
        if not animations:
            raise RuntimeError('Could not decode ' + name)
        animation = animations[0]
        print('CLIP_FLAGS', role, animation.is_delta, flush=True)
        if args.role == 'weapon' and animation.is_delta:
            # Source additive clips need their idle base; exporting the delta as a
            # complete pose sends the hands/knife back into the skeleton's bind pose.
            import numpy as np
            from mathutils import Quaternion
            from SourceIO.library.models.mdl.structs.local_animation import ANIM_DTYPE
            base_name = next((n for n in ['a_idle_1', 'a_idle', '@idle', 'idle'] if n in available), None)
            bp, bm, bb, ba = available[base_name]
            bm.anim_descs = [ba]
            StudioAnimDesc.read_animations = decode_animation
            base_clip = load_animations_from_mdl(bm, bb, cm, TinyPath(bp))[0]
            StudioAnimDesc.read_animations = lambda *a, **k: None
            frames = {}
            for bone, base_values in base_clip.frames.items():
                values = np.repeat(base_values[:1], animation.frame_count, axis=0)
                delta = animation.frames.get(bone)
                if delta is not None:
                    values['pos'] += delta['pos']
                    for i, value in enumerate(delta):
                        x, y, z, w = base_values[0]['rot']; q = Quaternion((w, x, y, z))
                        x, y, z, w = value['rot']; q = q @ Quaternion((w, x, y, z))
                        values[i]['rot'] = (q.x, q.y, q.z, q.w)
                frames[bone] = values
            animation.frames = frames
            animation.is_delta = False
        animation.name = role
        if args.role == 'infected':
            # Source root motion is XY; Blender bone-local XY includes the vertical axis.
            pelvis = animation.frames.get('ValveBiped.Bip01')
            if pelvis is not None:
                pelvis['pos'][:, :2] = pelvis['pos'][0, :2]
        # Include models sometimes contain facial bones absent on a particular body.
        animation.frames = {n: v for n, v in animation.frames.items() if n in container.armature.data.bones}
        import_animations_to_armature(container.armature, TinyPath(asset), {asset: [animation]}, .0254, False)
        action = bpy.data.actions.get(role)
        if not action:
            raise RuntimeError('Missing imported action ' + role)
        for curve in action.fcurves:
            for key in curve.keyframe_points:
                key.co.x *= 30 / animation.fps
                key.interpolation = 'LINEAR'
        mapping[role] = name
    armature = container.armature
    armature.animation_data_create()
    armature.animation_data.action = None
    for action in bpy.data.actions:
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, 0, action)
        strip.action_frame_start, strip.action_frame_end = action.frame_range
    print('MAPPED_CLIPS', json.dumps(mapping), flush=True)
    return mapping


if args.role == 'map':
    from SourceIO.blender_bindings.source1.bsp.import_bsp import import_bsp
    from SourceIO.blender_bindings.operators.import_settings_base import Source1BSPSettings
    settings = Source1BSPSettings()
    for base in reversed(Source1BSPSettings.__mro__):
        for key, prop in getattr(base, '__annotations__', {}).items():
            setattr(settings, key, prop.keywords['default'])
    settings.scale = .0254
    settings.load_lights = False
    settings.import_cubemaps = False
    settings.load_info = False
    map_path = TinyPath(str(pathlib.Path(args.game) / args.asset))
    import_bsp(map_path, FileBuffer(map_path), cm, settings, SteamAppId.LEFT_4_DEAD_2)
    from SourceIO.library.source1.bsp.bsp_file import open_bsp
    bsp = open_bsp(map_path, FileBuffer(map_path), cm, SteamAppId.LEFT_4_DEAD_2)
    entities = bsp.get_lump('LUMP_ENTITIES').entities
    lights = [e for e in entities if e.get('classname') in ['light', 'light_spot'] and e.get('origin')]
    pathlib.Path(args.output).with_suffix('.lights.json').write_text(json.dumps(lights))
    bpy.context.view_layer.update()
    # Real meshes for BSP prop placeholders; share their geometry across instances.
    from mathutils import Matrix
    props = {}
    for placeholder in list(bpy.context.scene.objects):
        entity = placeholder.get('entity_data', {})
        # Physics-spawned ragdolls have no valid static placement without Source physics.
        if entity.get('entity', {}).get('classname') == 'prop_ragdoll':
            continue
        path = entity.get('prop_path')
        if not path or not str(path).endswith('.mdl'):
            continue
        pose = entity.get('entity', {}).get('defaultanim', '')
        key = (path, pose, entity.get('skin', '0'))
        if key not in props:
            before = set(bpy.context.scene.objects)
            options.scale = 1
            try:
                prop = load_model(path)
                from SourceIO.blender_bindings.shared.skins import set_model_skin
                set_model_skin(prop, str(entity.get('skin', '0')))
                if prop.armature:
                    from SourceIO.blender_bindings.models.prop_animations import pose_armature_from_animation
                    buf = cm.find_file(TinyPath(path))
                    model = MdlV49.from_buffer(buf)
                    sequence = next((s for s in model.sequences if s.name == pose), next(iter(model.sequences), None))
                    if sequence and sequence.anim_desc_indices:
                        model.anim_descs = [model.anim_descs[sequence.anim_desc_indices[0]]]
                        StudioAnimDesc.read_animations = decode_animation
                        clips = load_animations_from_mdl(model, buf, cm, TinyPath(path))
                        StudioAnimDesc.read_animations = lambda *a, **k: None
                        if clips:
                            pose_armature_from_animation(prop.armature, clips[0], 1)
                            from mathutils import Euler
                            from math import pi
                            rotation = Euler((0, 0, -pi / 2)).to_matrix().to_4x4()
                            for bone in prop.armature.pose.bones:
                                if bone.parent is None:
                                    rest = bone.bone.matrix_local
                                    bone.matrix_basis = rest.inverted() @ rotation @ rest @ bone.matrix_basis
                bpy.context.view_layer.update()
            except Exception as error:
                import traceback
                traceback.print_exc()
                print('PROP_FAILED', path, str(error), flush=True)
                props[key] = []
                continue
            # Bake each prop's bind pose once, removing its rig and attachments.
            imported = set(bpy.context.scene.objects) - before
            meshes = []
            for obj in imported:
                if obj.type != 'MESH' or obj not in prop.objects: continue
                mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
                mesh.transform(obj.matrix_world)
                meshes.append(mesh)
            for obj in imported:
                bpy.data.objects.remove(obj, do_unlink=True)
            props[key] = meshes
        for mesh in props[key]:
            obj = bpy.data.objects.new(str(path), mesh)
            bpy.context.scene.collection.objects.link(obj)
            obj.matrix_world = placeholder.matrix_world
    print('PROP_MODELS', len(props), flush=True)
    mapping = {}
else:
    container = load_model(args.asset)
    if args.role == 'weapon':
        arms = load_model('models/weapons/arms/v_arms_bill.mdl')
        for obj in arms.objects:
            if obj.name not in bpy.data.objects:
                continue
            # Upper-arm sleeves extend behind the FPS camera when the gun is
            # raised. Keep the forearms/hands; crop the off-camera shoulder caps.
            import bmesh
            upper = set()
            for vertex in obj.data.vertices:
                if vertex.groups:
                    group = max(vertex.groups, key=lambda g: g.weight)
                    if any(part in obj.vertex_groups[group.group].name for part in ['UpperArm', 'Clavicle', 'Spine']):
                        upper.add(vertex.index)
            mesh_data = bpy.data.meshes[obj.data.name]
            mesh_data.__class__ = bpy.types.Mesh
            bm = bmesh.new(); bm.from_mesh(mesh_data)
            bmesh.ops.delete(bm, geom=[face for face in bm.faces if all(v.index in upper for v in face.verts)], context='FACES')
            bm.to_mesh(mesh_data); bm.free()
            obj.parent = container.armature
            for modifier in obj.modifiers:
                if modifier.type == 'ARMATURE':
                    modifier.object = container.armature
        bpy.data.objects.remove(arms.armature, do_unlink=True)
    mapping = add_animations(container, args.asset)
    if args.role == 'weapon':
        # Crop the rear of the first-person arms in their evaluated idle pose.
        # Those shoulder/sleeve surfaces otherwise move through the eye during ADS.
        animation_data = container.armature.animation_data
        for track in animation_data.nla_tracks: track.mute = True
        animation_data.action = bpy.data.actions.get('idle')
        bpy.context.scene.frame_set(0); bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        for obj in arms.objects:
            evaluated = obj.evaluated_get(graph)
            rear = {v.index for v in evaluated.data.vertices if -(evaluated.matrix_world @ v.co).y < .22}
            mesh = bpy.data.meshes[obj.data.name]; mesh.__class__ = bpy.types.Mesh
            bm = bmesh.new(); bm.from_mesh(mesh)
            bmesh.ops.delete(bm, geom=[face for face in bm.faces if all(v.index in rear for v in face.verts)], context='FACES')
            # Close the cropped sleeves, so ADS cannot expose the hollow arm mesh.
            boundary = [edge for edge in bm.edges if edge.is_boundary]
            if boundary:
                bmesh.ops.holes_fill(bm, edges=boundary, sides=128)
            bm.to_mesh(mesh); bm.free()
        animation_data.action = None
        for track in animation_data.nla_tracks: track.mute = False
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and obj not in export_meshes:
            bpy.data.objects.remove(obj, do_unlink=True)

# Keep original diffuse/normal images; flatten Source's non-glTF shader wrappers.
if args.role == 'map':
    import bmesh
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH': continue
        invisible = {i for i, m in enumerate(obj.data.materials) if m and 'tools/' in m.get('full_path', '').lower()}
        if invisible:
            bm = bmesh.new(); bm.from_mesh(obj.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in invisible], context='FACES')
            bm.to_mesh(obj.data); bm.free()
            if not obj.data.polygons: bpy.data.objects.remove(obj, do_unlink=True)
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH': continue
    for slot in obj.material_slots:
        material = slot.material
        if not material or material.use_nodes and any(n.type == 'TEX_IMAGE' for n in material.node_tree.nodes): continue
        name = pathlib.PurePosixPath(material.get('full_path', material.name)).name.lower()
        replacement = next((m for m in bpy.data.materials if m.use_nodes and m.name.lower() == name + '_wounded' and any(n.type == 'TEX_IMAGE' for n in m.node_tree.nodes)), None)
        if replacement: slot.material = replacement
for material in list(bpy.data.materials):
    if not material.use_nodes:
        material.use_nodes = True
    nodes = material.node_tree.nodes
    alpha_test = translucent = False
    opacity = 1.0
    if material.get('full_path'):
        from SourceIO.library.source1.vmt import VMT
        path = TinyPath('materials/' + material['full_path'] + '.vmt')
        source = cm.find_file(path)
        if source:
            vmt = VMT(source, path, cm)
            alpha_test = bool(vmt.get_int('$alphatest', 0))
            translucent = bool(vmt.get_int('$translucent', 0))
            opacity = vmt.get_float('$alpha', 1.0)
            if vmt.shader.lower() in ['refract', 'lightmappedreflective']:
                translucent = True
                opacity = min(opacity, .22)
    images = {n.name.lower(): n.image for n in nodes if n.type == 'TEX_IMAGE' and n.image}
    base = next((im for n, im in images.items() if '$basetexture' == n or n == 'basetexture'), None)
    normal = next((im for n, im in images.items() if '$bumpmap' == n), None)
    print('MATERIAL', material.name, [(n, im.name) for n, im in images.items()], flush=True)
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Roughness'].default_value = .8
    material.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    if base:
        base.colorspace_settings.name = 'sRGB'
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = base
        material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
        if alpha_test or translucent:
            material.node_tree.links.new(texture.outputs['Alpha'], shader.inputs['Alpha'])
            material.blend_method = 'CLIP' if alpha_test else 'BLEND'
            material.alpha_threshold = .5
    if opacity < 1:
        shader.inputs['Alpha'].default_value = opacity
        material.blend_method = 'BLEND'
    if normal:
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = normal
        normal.colorspace_settings.name = 'Non-Color'
        convert = nodes.new('ShaderNodeNormalMap')
        material.node_tree.links.new(texture.outputs['Color'], convert.inputs['Color'])
        material.node_tree.links.new(convert.outputs['Normal'], shader.inputs['Normal'])

used_images = {n.image for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image}
for image in used_images:
    if image.size[0] > 1024 or image.size[1] > 1024:
        ratio = 1024 / max(image.size)
        image.scale(max(1, int(image.size[0] * ratio)), max(1, int(image.size[1] * ratio)))
    if image.source != 'GENERATED':
        image.pack()

bpy.context.scene.render.fps = 30
bpy.context.scene.frame_set(0)
output = pathlib.Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_animations=args.role != 'map',
                          export_animation_mode='NLA_TRACKS', export_nla_strips=True,
                          export_morph=False, export_extras=False, export_yup=True)
output.with_suffix('.json').write_text(json.dumps({'source': args.asset, 'animations': mapping}, indent=2))
print('EXPORTED', output, flush=True)
