import { getMap, type MapDefinition } from '../maps/maps.ts';
import { sourcePack, SourceNavigation } from './source-map.ts';
export const CELL = 1.25;
export const COLS = 53, ROWS = 45;
// Keep the original wing's world coordinates while extending east and south.
const ORIGIN_X = 13.5, ORIGIN_Z = 11.5;
export type Point = {
    x: number;
    z: number;
    y?: number;
};
export class WorldGrid {
    source?: SourceNavigation;
    cells = new Uint8Array(COLS * ROWS);
    distances = new Int16Array(COLS * ROWS).fill(-1);
    propCells = new Set<number>();
    map: MapDefinition;
    obstacles: {
        x: number;
        z: number;
    }[] = [];
    constructor(map = getMap('hospital')) {
        this.map = map;
        this.configure(map);
    }
    configure(map: MapDefinition) {
        this.source = map.id === 'hospital' && sourcePack ? new SourceNavigation(sourcePack.nav) : undefined;
        this.map = map;
        this.cells.fill(0);
        this.distances.fill(-1);
        this.propCells.clear();
        this.obstacles = map.obstacles.map(([x, z]) => ({
            x, z
        }));
        for (const [x1, z1, x2, z2] of map.passages)
            for (let z = z1; z <= z2; z++)
                for (let x = x1; x <= x2; x++)
                    this.cells[z * COLS + x] = 1;
        for (const b of this.obstacles)
            for (const x of [b.x, b.x + 1]) {
                this.cells[b.z * COLS + x] = 0;
                this.propCells.add(b.z * COLS + x);
            }
    }
    toCell(x: number, z: number) {
        return {
            x: Math.floor(x / CELL + ORIGIN_X), z: Math.floor(z / CELL + ORIGIN_Z)
        };
    }
    center(x: number, z: number): Point {
        if (this.source && z === -1) return this.source.center(x);
        if (this.source) return this.source.center(this.source.closest({ x: 0, z: 0 }));
        return {
            x: (x + .5 - ORIGIN_X) * CELL, z: (z + .5 - ORIGIN_Z) * CELL
        };
    }
    walkable(x: number, z: number) {
        return x >= 0 && z >= 0 && x < COLS && z < ROWS && this.cells[z * COLS + x] === 1;
    }
    clear(x: number, z: number, r = .28, y = 0) {
        if (this.source) return this.source.clear(x, z, r, y);
        const a = this.toCell(x - r, z - r), b = this.toCell(x + r, z + r);
        for (let iz = a.z; iz <= b.z; iz++)
            for (let ix = a.x; ix <= b.x; ix++) {
                if (this.walkable(ix, iz))
                    continue;
                const p = this.center(ix, iz), nx = Math.max(p.x - CELL / 2, Math.min(x, p.x + CELL / 2)), nz = Math.max(p.z - CELL / 2, Math.min(z, p.z + CELL / 2));
                if ((x - nx) ** 2 + (z - nz) ** 2 < r * r)
                    return false;
            }
        return true;
    }
    move(p: Point, dx: number, dz: number, r = .28) {
        if (this.source) return this.source.move(p, dx, dz, r);
        if (this.clear(p.x + dx, p.z, r))
            p.x += dx;
        if (this.clear(p.x, p.z + dz, r))
            p.z += dz;
    }
    lineClear(a: Point, b: Point) {
        if (this.source) return this.source.lineClear(a, b);
        const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .16);
        for (let i = 0; i <= n; i++) {
            const t = n ? i / n : 0, c = this.toCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
            if (!this.walkable(c.x, c.z))
                return false;
        }
        return true;
    }
    rebuild(target: Point) {
        if (this.source) return this.source.rebuild(target);
        this.distances.fill(-1);
        const c = this.toCell(target.x, target.z);
        if (!this.walkable(c.x, c.z))
            return;
        const queue = new Int16Array(COLS * ROWS);
        let head = 0, tail = 0;
        const start = c.z * COLS + c.x;
        queue[tail++] = start;
        this.distances[start] = 0;
        while (head < tail) {
            const i = queue[head++], x = i % COLS, z = Math.floor(i / COLS);
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const xx = x + dx, zz = z + dz, j = zz * COLS + xx;
                if (!this.walkable(xx, zz) || this.distances[j] >= 0)
                    continue;
                this.distances[j] = this.distances[i] + 1;
                queue[tail++] = j;
            }
        }
    }
    next(from: Point, target: Point): Point {
        if (this.source) return this.source.next(from, target);
        if (this.lineClear(from, target))
            return target;
        const c = this.toCell(from.x, from.z);
        let best = this.distances[c.z * COLS + c.x];
        let result = this.center(c.x, c.z);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = c.x + dx, z = c.z + dz;
            if (!this.walkable(x, z))
                continue;
            const d = this.distances[z * COLS + x];
            if (d >= 0 && (best < 0 || d < best)) {
                best = d;
                result = this.center(x, z);
            }
        }
        return result;
    }
    wallDistance(origin: Point, direction: Point, max = 70) {
        if (this.source?.raycast) return this.source.raycast(origin, direction, max);
        // Grid DDA returns the first wall surface, so projectiles cannot cross corners.
        const c = this.toCell(origin.x, origin.z);
        let x = c.x, z = c.z;
        const sx = direction.x >= 0 ? 1 : -1, sz = direction.z >= 0 ? 1 : -1;
        const dx = direction.x === 0 ? Infinity : CELL / Math.abs(direction.x), dz = direction.z === 0 ? Infinity : CELL / Math.abs(direction.z);
        let tx = direction.x === 0 ? Infinity : ((x + (sx > 0 ? 1 : 0) - ORIGIN_X) * CELL - origin.x) / direction.x;
        let tz = direction.z === 0 ? Infinity : ((z + (sz > 0 ? 1 : 0) - ORIGIN_Z) * CELL - origin.z) / direction.z;
        let t = 0;
        while (t < max) {
            if (!this.walkable(x, z))
                return Math.max(0, t);
            if (tx < tz) {
                t = tx;
                tx += dx;
                x += sx;
            }
            else {
                t = tz;
                tz += dz;
                z += sz;
            }
        }
        return max;
    }
}
export function raySphere(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, cx: number, cy: number, cz: number, r: number) {
    const x = ox - cx, y = oy - cy, z = oz - cz, b = x * dx + y * dy + z * dz, c = x * x + y * y + z * z - r * r, disc = b * b - c;
    if (disc < 0)
        return Infinity;
    const near = -b - Math.sqrt(disc);
    return near >= 0 ? near : (c <= 0 ? 0 : Infinity);
}
