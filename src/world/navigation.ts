import { createHospitalMap } from '../maps/maps.ts';
import { sourcePack, SourceNavigation, type SourcePack } from './source-map.ts';
export type Point = { x: number; z: number; y?: number };
export class WorldGrid extends SourceNavigation {
    map;
    constructor(nav: SourcePack['nav'] = sourcePack.nav) {
        super(nav);
        this.map = createHospitalMap(this);
    }
    wallDistance(origin: Point, direction: Point, max = 70) {
        if (!this.raycast) throw new Error('Hospital collision geometry is not ready.');
        return this.raycast(origin, direction, max);
    }
}
export function raySphere(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, cx: number, cy: number, cz: number, r: number) {
    const x = ox - cx, y = oy - cy, z = oz - cz, b = x * dx + y * dy + z * dz, c = x * x + y * y + z * z - r * r, disc = b * b - c;
    if (disc < 0)
        return Infinity;
    const near = -b - Math.sqrt(disc);
    return near >= 0 ? near : (c <= 0 ? 0 : Infinity);
}
