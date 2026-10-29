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
