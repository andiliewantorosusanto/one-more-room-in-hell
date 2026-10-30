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
import { loadSourcePack } from './world/source-map.ts';
const ui = new UI();
try {
    await loadSourcePack();
    const game = new Game(ui);
    await game.load();
} catch (error) {
    ui.fail(error);
}
