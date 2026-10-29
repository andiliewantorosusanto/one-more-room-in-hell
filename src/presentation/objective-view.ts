import { Color3, DynamicTexture, MeshBuilder, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';
import type { RunRules } from '../game/run-rules.ts';
import type { WorldGrid } from '../world/navigation.ts';
export class ObjectiveView {
    private root: TransformNode;
    private glow: StandardMaterial;
    private label: DynamicTexture;
    private stage = '';
    constructor(scene: Scene) {
        this.root = new TransformNode('objective terminal', scene);
        const metal = new StandardMaterial('objective terminal case', scene);
        metal.diffuseColor = new Color3(.11, .15, .13);
        metal.specularColor = new Color3(.2, .2, .16);
        this.glow = new StandardMaterial('objective terminal indicator', scene);
        this.glow.disableLighting = true;
        const cabinet = MeshBuilder.CreateBox('emergency control pedestal', {
            width: .45, height: 1, depth: .3
        }, scene);
        cabinet.parent = this.root;
        cabinet.position.set(.55, .5, 0);
        cabinet.material = metal;
        cabinet.isPickable = false;
        const screen = MeshBuilder.CreateBox('control status', {
            width: .36, height: .25, depth: .015
        }, scene);
        screen.parent = this.root;
        screen.position.set(.55, .84, -.16);
        screen.material = this.glow;
        screen.isPickable = false;
        const ring = MeshBuilder.CreateTorus('objective reach marker', {
            diameter: 1.3, thickness: .025, tessellation: 32
        }, scene);
        ring.parent = this.root;
        ring.position.y = .025;
        ring.material = this.glow;
        ring.isPickable = false;
        this.label = new DynamicTexture('objective beacon label', {
            width: 512, height: 128
        }, scene, false);
        this.label.update();
        const labelMat = new StandardMaterial('objective label', scene);
        labelMat.diffuseTexture = this.label;
        labelMat.emissiveColor = Color3.White();
        labelMat.disableLighting = true;
        labelMat.backFaceCulling = false;
        const sign = MeshBuilder.CreatePlane('objective beacon', {
            width: 1.3, height: .325
        }, scene);
        sign.parent = this.root;
        sign.position.set(0, 2.25, 0);
        sign.billboardMode = 7;
        sign.material = labelMat;
        sign.isPickable = false;
        this.root.setEnabled(false);
    }
    update(run: RunRules, grid: WorldGrid) {
        const goal = grid.map.objectives[run.wave - 1];
        this.root.setEnabled(run.mode === 'objective' && run.phase === 'wave' && !!goal);
        if (!goal)
            return;
        const key = grid.map.id + run.wave;
        if (key !== this.stage) {
            this.stage = key;
            const p = grid.center(...goal.cell);
            this.root.position.set(p.x, 0, p.z);
            const c = this.label.getContext();
            c.fillStyle = '#101814';
            c.fillRect(0, 0, 512, 128);
            c.fillStyle = '#d4db9c';
            c.font = 'bold 42px Arial';
            c.fillText(`0${run.wave} · ${['POWER', 'SIGNAL', 'EXTRACT'][run.wave - 1]}`, 24, 80);
            this.label.update();
        }
        this.glow.emissiveColor = run.remaining === 0 ? new Color3(.25, .8, .45) : new Color3(.7, .23, .055);
    }
}
