"""Build the local Valve asset pack using Blender 4.2 LTS and SourceIO fe24260.
Usage: python scripts/import-l4d2-local.py --game "F:/SteamLibrary/steamapps/common/Left 4 Dead 2"
Optional: --blender PATH --sourceio PATH (portable tools default to .tmp/source-port/tools).
"""
import argparse, json, pathlib, subprocess, sys

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--game', required=True)
    parser.add_argument('--blender', default='.tmp/source-port/tools/blender/blender-4.2.9-windows-x64/blender.exe')
    parser.add_argument('--sourceio', default='.tmp/source-port/tools/sourceio/REDxEYE-SourceIO-fe24260')
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parent.parent
    output = root / 'public/source-private/l4d2'
    output.mkdir(parents=True, exist_ok=True)
    infected = {'nurse': 'common_female_nurse01', 'patient': 'common_patient_male01', 'surgeon': 'common_surgeon_male01', 'police': 'common_police_male01', 'civilian': 'common_male01'}
    weapons = {'pistol': 'v_pistola', 'knife': 'v_knife_t', 'rifle': 'v_rifle', 'smg': 'v_smg', 'heavySmg': 'v_silenced_smg', 'shotgun': 'v_pumpshotgun', 'leverShotgun': 'v_shotgun_chrome', 'autoShotgun': 'v_shotgun_spas', 'plasmaRifle': 'v_rifle_ak47'}
    assets = [(name, f'models/infected/{model}.mdl', 'infected') for name, model in infected.items()]
    assets += [(name, f'models/v_models/{model}.mdl', 'weapon') for name, model in weapons.items()]
    assets += [('hospital', 'left4dead2_dlc2/maps/c8m4_interior.bsp', 'map')]
    for name, asset, role in assets:
        subprocess.run([str(pathlib.Path(args.blender).resolve()), '-b', '--factory-startup', '--python-exit-code', '1', '--python', str(root / 'scripts/import-l4d2.py'), '--', '--game', args.game, '--sourceio', str(pathlib.Path(args.sourceio).resolve()), '--asset', asset, '--role', role, '--output', str(output / (name + '.glb'))], cwd=root, check=True)
    subprocess.run([sys.executable, str(root / 'scripts/export-hospital-nav.py'), str(pathlib.Path(args.game) / 'update/maps/c8m4_interior.nav'), str(output / 'hospital-nav.json')], cwd=root, check=True)
    (output / 'manifest.json').write_text(json.dumps({'infected': list(infected), 'weapons': {name: name for name in weapons}}))
    print('Local L4D2 pack ready:', output)

if __name__ == '__main__': main()
