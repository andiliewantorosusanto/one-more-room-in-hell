import { Scene, MeshBuilder, Mesh, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
type Particle = {
    mesh: Mesh;
    life: number;
    velocity: Vector3;
};
export class Effects {
    particles: Particle[] = [];
    index = 0;
    constructor(scene: Scene) {
        const blood = new StandardMaterial('blood droplets', scene);
        blood.diffuseColor = new Color3(.28, .025, .012);
        blood.specularColor = Color3.Black();
        blood.emissiveColor = new Color3(.08, .003, 0);
        for (let i = 0; i < 48; i++) {
            const m = MeshBuilder.CreateIcoSphere('impact', {
                radius: .03, subdivisions: 1
            }, scene);
            m.material = blood;
            m.isPickable = false;
            m.setEnabled(false);
            this.particles.push({
                mesh: m, life: 0, velocity: Vector3.Zero()
            });
        }
    }
    blood(position: Vector3, direction: Vector3) {
        for (let i = 0; i < 5; i++) {
            const p = this.particles[this.index++ % this.particles.length];
            p.mesh.position.copyFrom(position);
            p.mesh.setEnabled(true);
            p.life = .25 + Math.random() * .2;
            p.velocity.set((Math.random() - .5) * 1.8 - direction.x * .5, Math.random() * 1.6, (Math.random() - .5) * 1.8 - direction.z * .5);
        }
    }
    update(dt: number) {
        for (const p of this.particles) {
            if (p.life <= 0)
                continue;
            p.life -= dt;
            if (p.life <= 0) {
                p.mesh.setEnabled(false);
                continue;
            }
            p.velocity.y -= 5 * dt;
            p.mesh.position.addInPlace(p.velocity.scale(dt));
        }
    }
    reset() {
        for (const p of this.particles) {
            p.life = 0;
            p.mesh.setEnabled(false);
        }
    }
}
