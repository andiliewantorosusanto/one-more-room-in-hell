import { MeshoptCompression } from '@babylonjs/core';
import localMeshoptDecoder from '@babylonjs/core/assets/meshopt/meshopt_decoder.js?url';
MeshoptCompression.Configuration.decoder.url = localMeshoptDecoder;
import './ui/style.css';
import '@babylonjs/core/Shaders/default.vertex';
import '@babylonjs/core/Shaders/default.fragment';
import '@babylonjs/core/Shaders/pbr.vertex';
import '@babylonjs/core/Shaders/pbr.fragment';
import { UI } from './ui/ui.ts';
import { Game } from './game/Game.ts';
import { loadSourcePack, sourcePack, SourceNavigation } from './world/source-map.ts';
import { getMap } from './maps/maps.ts';
import { WEAPONS, type WeaponId } from './weapons/weapon-rules.ts';
await loadSourcePack();
if (sourcePack) {
    const names: Partial<Record<WeaponId, [string, string]>> = {
        pistol: ['P220', '9 mm SIDEARM'], rifle: ['M16A2', '5.56 × 45 mm'], smg: ['UZI', '9 × 19 mm'], heavySmg: ['MAC-10', '.45 ACP · SUPPRESSED'],
        shotgun: ['REMINGTON 870', '12 GA · PUMP ACTION'], leverShotgun: ['CHROME SHOTGUN', '12 GA · PUMP ACTION'], autoShotgun: ['SPAS-12', '12 GA · SEMI-AUTO'], plasmaRifle: ['AK-47', '7.62 × 39 mm'],
    };
    for (const [id, [name, ammoLabel]] of Object.entries(names)) Object.assign(WEAPONS[id as WeaponId], { name, ammoLabel, description: `Mercy Hospital equipment · ${name}.` });
    Object.assign(WEAPONS.leverShotgun, { label: 'CHROME SHOTGUN' });
    Object.assign(WEAPONS.autoShotgun, { label: 'COMBAT SHOTGUN', reloadStyle: 'shell', reload: .65 });
    Object.assign(WEAPONS.plasmaRifle, { label: 'HEAVY RIFLE', reloadStyle: 'magazine', capacity: 30, reload: 2.5 });
    const nav = new SourceNavigation(sourcePack.nav), map = getMap('hospital');
    Object.assign(map, { name: 'No Mercy · Hospital', location: 'MERCY HOSPITAL · L4D2', description: 'The original hospital interior, stairwells and construction floor.',
        spawn: [nav.closest({ x: 0, z: 0 }), -1], yaw: 0,
        entrances: nav.areas.map((_, i) => [i, -1]),
        objectives: [
            { title: 'Restore hospital power', action: 'RESTORE POWER', cell: [nav.closest({ x: 12, z: 25, y: 10.4 }), -1], hold: 3 },
            { title: 'Secure the elevator landing', action: 'CALL RESCUE', cell: [nav.closest({ x: 25.7, z: 65.8, y: 10.4 }), -1], hold: 4 },
            { title: 'Reach the upper construction floor', action: 'OPEN EXTRACTION', cell: [nav.closest({ x: -22, z: 62, y: 140.2 }), -1], hold: 5 },
        ] });
}
if (new URLSearchParams(location.search).has('lab')) {
    await import('./dev/asset-lab.ts');
}
else {
    const ui = new UI();
    try {
        const game = new Game(ui);
        await game.load();
    }
    catch (e) {
        ui.fail(e);
    }
}
