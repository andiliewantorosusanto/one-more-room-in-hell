import type { Point } from './navigation.ts';

export const SOURCE_ROOT = '/source-private/l4d2/';
type Area = { id: number; flags: number; bounds: number[]; links: number[] };
export type SourcePack = { infected: string[]; weapons: Record<string, string>; lights: Record<string, string>[]; nav: { origin: number[]; areas: Area[] } };
export let sourcePack: SourcePack | undefined;
export async function loadSourcePack() {
    const response = await fetch(SOURCE_ROOT + 'manifest.json');
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return;
    const manifest = await response.json();
    const nav = await fetch(SOURCE_ROOT + 'hospital-nav.json');
    if (!nav.ok) throw new Error('The local hospital navigation file is missing.');
    const lights = await fetch(SOURCE_ROOT + 'hospital.lights.json');
    sourcePack = { ...manifest, nav: await nav.json(), lights: lights.ok && lights.headers.get('content-type')?.includes('json') ? await lights.json() : [] };
}

export class SourceNavigation {
    areas: { id: number; x: number; z: number; xx: number; zz: number; heights: number[]; links: number[] }[];
    private buckets = new Map<string, number[]>();
    private byId = new Map<number, number>();
    private distances: number[] = [];
    raycast?: (origin: Point, direction: Point, max: number) => number;
    constructor(data: SourcePack['nav']) {
        const [ox, oz, oy] = data.origin;
        this.areas = data.areas.map(a => {
            const [x, z, y, xx, zz, yy, ne, sw] = a.bounds;
            return { id: a.id, x: (x - ox) * .0254, z: (z - oz) * .0254, xx: (xx - ox) * .0254, zz: (zz - oz) * .0254,
                heights: [y, ne, sw, yy].map(n => (n - oy) * .0254), links: a.links };
        });
        this.areas.forEach((a, i) => {
            this.byId.set(a.id, i);
            for (let x = Math.floor(a.x / 4); x <= Math.floor(a.xx / 4); x++)
                for (let z = Math.floor(a.z / 4); z <= Math.floor(a.zz / 4); z++) {
                    const key = x + ',' + z;
                    if (!this.buckets.has(key)) this.buckets.set(key, []);
                    this.buckets.get(key)!.push(i);
                }
        });
    }
    height(i: number, x: number, z: number) {
        const a = this.areas[i], u = Math.max(0, Math.min(1, (x - a.x) / (a.xx - a.x))), v = Math.max(0, Math.min(1, (z - a.z) / (a.zz - a.z)));
        return (a.heights[0] * (1 - u) + a.heights[1] * u) * (1 - v) + (a.heights[2] * (1 - u) + a.heights[3] * u) * v;
    }
    locate(x: number, z: number, y = 0, tolerance = .6) {
        let found = -1, best = tolerance;
        for (const i of this.buckets.get(Math.floor(x / 4) + ',' + Math.floor(z / 4)) ?? []) {
            const a = this.areas[i];
            if (x < a.x - .015 || x > a.xx + .015 || z < a.z - .015 || z > a.zz + .015) continue;
            const d = Math.abs(this.height(i, x, z) - y);
            if (d < best) { best = d; found = i; }
        }
        return found;
    }
    center(i: number): Point {
        const a = this.areas[i], x = (a.x + a.xx) / 2, z = (a.z + a.zz) / 2;
        return { x, z, y: this.height(i, x, z) };
    }
    closest(p: Point) {
        let best = 0, distance = Infinity;
        this.areas.forEach((_, i) => {
            const c = this.center(i), d = Math.hypot(c.x - p.x, c.z - p.z, (c.y! - (p.y ?? 0)) * 2);
            if (d < distance) { distance = d; best = i; }
        });
        return best;
    }
    clear(x: number, z: number, r: number, y = 0) {
        for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]])
            if (this.locate(x + dx, z + dz, y) < 0) return false;
        return true;
    }
    move(p: Point, dx: number, dz: number, r: number) {
        for (const axis of ['x', 'z'] as const) {
            const x = p.x + (axis === 'x' ? dx : 0), z = p.z + (axis === 'z' ? dz : 0);
            if (!this.clear(x, z, r, p.y)) continue;
            const i = this.locate(x, z, p.y);
            p.x = x; p.z = z; p.y = this.height(i, x, z);
        }
    }
    lineClear(a: Point, b: Point) {
        const count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .15);
        let y = a.y ?? 0;
        for (let i = 0; i <= count; i++) {
            const t = count ? i / count : 0, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, area = this.locate(x, z, y, .4);
            if (area < 0) return false;
            y = this.height(area, x, z);
        }
        return Math.abs(y - (b.y ?? 0)) < .6;
    }
    rebuild(target: Point) {
        this.distances = this.areas.map(() => -1);
        const start = this.locate(target.x, target.z, target.y);
        if (start < 0) return;
        const queue = [start]; this.distances[start] = 0;
        // Reverse links respect the NAV's one-way drops and climbing connections.
        const reverse = this.areas.map(() => [] as number[]);
        this.areas.forEach((a, i) => a.links.forEach(id => { const j = this.byId.get(id); if (j !== undefined) reverse[j].push(i); }));
        for (let head = 0; head < queue.length; head++)
            for (const next of reverse[queue[head]])
                if (this.distances[next] < 0) { this.distances[next] = this.distances[queue[head]] + 1; queue.push(next); }
    }
    next(from: Point, target: Point): Point {
        if (this.lineClear(from, target)) return target;
        const i = this.locate(from.x, from.z, from.y);
        if (i < 0) return from;
        const a = this.areas[i];
        const next = a.links.map(id => this.byId.get(id)!).filter(j => this.distances[j] >= 0 && this.distances[j] < this.distances[i]).sort((a, b) => this.distances[a] - this.distances[b])[0];
        if (next === undefined) return from;
        const b = this.areas[next], x = (Math.max(a.x, b.x) + Math.min(a.xx, b.xx)) / 2, z = (Math.max(a.z, b.z) + Math.min(a.zz, b.zz)) / 2;
        const c = this.center(next), length = Math.hypot(c.x - x, c.z - z) || 1;
        return { x: x + (c.x - x) / length * .25, z: z + (c.z - z) / length * .25, y: this.height(next, x, z) };
    }
}
