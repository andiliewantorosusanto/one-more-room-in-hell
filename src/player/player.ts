import { UniversalCamera, Vector3, Scene } from '@babylonjs/core';
import { WorldGrid, type Point } from '../world/navigation.ts';
export class Player {
    position: Point;
    previous: Point;
    yaw = Math.PI;
    pitch = 0;
    sensitivity = 1;
    moving = false;
    sprinting = false;
    distance = 0;
    camera: UniversalCamera;
    constructor(public grid: WorldGrid, scene: Scene) {
        this.position = grid.center(...grid.map.spawn);
        this.previous = {
            ...this.position
        };
        this.camera = new UniversalCamera('player', new Vector3(this.position.x, 1.65, this.position.z), scene);
        this.camera.minZ = .04;
        this.camera.maxZ = 300;
        this.camera.fov = 1.24;
        this.camera.inputs.clear();
    }
    reset() {
        this.position = this.grid.center(...this.grid.map.spawn);
        this.previous = {
            ...this.position
        };
        this.yaw = this.grid.map.yaw;
        this.pitch = 0;
        this.distance = 0;
    }
    look(dx: number, dy: number) {
        this.yaw += dx * .0019 * this.sensitivity;
        this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch + dy * .0019 * this.sensitivity));
    }
    update(dt: number, keys: Set<string>, aiming: boolean, canSprint: boolean) {
        this.previous = {
            ...this.position
        };
        let forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS')), side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
        const length = Math.hypot(forward, side);
        this.moving = length > 0;
        this.sprinting = canSprint && !aiming && forward > 0 && keys.has('ShiftLeft');
        if (length) {
            forward /= length;
            side /= length;
            const speed = this.sprinting ? 5.4 : aiming ? 2.2 : 3.4;
            this.grid.move(this.position, (Math.sin(this.yaw) * forward + Math.cos(this.yaw) * side) * speed * dt, (Math.cos(this.yaw) * forward - Math.sin(this.yaw) * side) * speed * dt, .27);
        }
        this.distance += Math.hypot(this.position.x - this.previous.x, this.position.z - this.previous.z);
    }
    render(alpha: number, dt: number, aiming: boolean, recoil = 0, reducedMotion = false) {
        const p = this.previous;
        const bob = !reducedMotion && this.moving ? Math.sin(this.distance * 9) * .018 : 0;
        this.camera.position.set(p.x + (this.position.x - p.x) * alpha, (p.y ?? 0) + ((this.position.y ?? 0) - (p.y ?? 0)) * alpha + 1.65 + bob, p.z + (this.position.z - p.z) * alpha);
        this.camera.rotation.set(this.pitch - recoil, this.yaw, 0);
        this.camera.fov += ((aiming ? .88 : 1.24) - this.camera.fov) * Math.min(1, dt * 13);
    }
}
