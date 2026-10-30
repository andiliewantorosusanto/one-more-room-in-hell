import type { RunRules } from '../game/run-rules.ts';
export type WeaponId = 'pistol' | 'knife' | 'smg' | 'heavySmg' | 'rifle' | 'shotgun' | 'leverShotgun' | 'autoShotgun' | 'plasmaRifle';
export function weaponSway(time: number, aimBlend: number, moving: boolean, reducedMotion: boolean) {
    const amount = reducedMotion ? 0 : (1 - .85 * aimBlend) * (moving ? 1.4 : 1);
    return { yaw: Math.sin(time * 1.35) * .004 * amount, pitch: Math.sin(time * 1.9 + .7) * .003 * amount };
}
export type WeaponSpec = {
    name: string;
    label: string;
    description: string;
    category: string;
    capacity: number;
    damage: number;
    reload: number;
    interval: number;
    automatic: boolean;
    pellets: number;
    spread: number;
    price: number;
    reserveMax: number;
    ammoPrice: number;
    requires?: WeaponId;
    reloadStyle: 'magazine' | 'shell' | 'none';
    ammoLabel: string;
};
export const WEAPONS: Record<WeaponId, WeaponSpec> = {
    pistol: {
        name: 'P220', label: 'SIDEARM', description: 'Dependable sidearm with unlimited reserve ammunition.', category: 'Sidearm', capacity: 12, damage: 25, reload: 1.5, interval: .24, automatic: false, pellets: 1, spread: .008, price: 0, reserveMax: Infinity, ammoPrice: 0, reloadStyle: 'magazine', ammoLabel: '9 mm SIDEARM'
    },
    knife: {
        name: 'COMBAT KNIFE', label: 'MELEE', description: 'Two close-range slashes stop a regular infected.', category: 'Melee', capacity: 0, damage: 50, reload: 0, interval: .65, automatic: false, pellets: 1, spread: 0, price: 0, reserveMax: 0, ammoPrice: 0, reloadStyle: 'none', ammoLabel: '1.5 m REACH'
    },
    smg: {
        name: 'UZI', label: 'COMPACT SMG', description: 'Fast automatic fire. Keep bursts short.', category: 'SMG', capacity: 32, damage: 18, reload: 2.1, interval: .075, automatic: true, pellets: 1, spread: .017, price: 450, reserveMax: 160, ammoPrice: 90, reloadStyle: 'magazine', ammoLabel: '9 × 19 mm'
    },
    heavySmg: {
        name: 'MAC-10', label: 'HEAVY SMG', description: 'Suppressed automatic upgrade with harder hits.', category: 'SMG', capacity: 25, damage: 27, reload: 2.25, interval: .09, automatic: true, pellets: 1, spread: .013, price: 800, reserveMax: 150, ammoPrice: 110, requires: 'smg', reloadStyle: 'magazine', ammoLabel: '.45 ACP · SUPPRESSED'
    },
    rifle: {
        name: 'M16A2', label: 'ASSAULT RIFLE', description: 'Reliable mid-range stopping power.', category: 'Rifle', capacity: 30, damage: 34, reload: 2.5, interval: .105, automatic: true, pellets: 1, spread: .009, price: 650, reserveMax: 180, ammoPrice: 100, reloadStyle: 'magazine', ammoLabel: '5.56 × 45 mm'
    },
    shotgun: {
        name: 'REMINGTON 870', label: 'LIGHT SHOTGUN', description: 'Pump-action shotgun; load shells one at a time.', category: 'Shotgun', capacity: 6, damage: 10, reload: .62, interval: .9, automatic: false, pellets: 8, spread: .085, price: 350, reserveMax: 36, ammoPrice: 100, reloadStyle: 'shell', ammoLabel: '12 GA · PUMP ACTION'
    },
    leverShotgun: {
        name: 'CHROME SHOTGUN', label: 'CHROME SHOTGUN', description: 'Heavy close-range damage with individual shell loading.', category: 'Shotgun', capacity: 5, damage: 18, reload: .7, interval: 1.05, automatic: false, pellets: 8, spread: .065, price: 800, reserveMax: 30, ammoPrice: 130, requires: 'shotgun', reloadStyle: 'shell', ammoLabel: '12 GA · PUMP ACTION'
    },
    autoShotgun: {
        name: 'SPAS-12', label: 'COMBAT SHOTGUN', description: 'Semi-automatic shotgun; load shells one at a time.', category: 'Shotgun', capacity: 10, damage: 15, reload: .65, interval: .38, automatic: true, pellets: 10, spread: .055, price: 1400, reserveMax: 50, ammoPrice: 180, requires: 'shotgun', reloadStyle: 'shell', ammoLabel: '12 GA · SEMI-AUTO'
    },
    plasmaRifle: {
        name: 'AK-47', label: 'HEAVY RIFLE', description: 'High-damage automatic rifle upgrade.', category: 'Rifle', capacity: 30, damage: 60, reload: 2.5, interval: .16, automatic: true, pellets: 1, spread: .006, price: 1600, reserveMax: 96, ammoPrice: 160, requires: 'rifle', reloadStyle: 'magazine', ammoLabel: '7.62 × 39 mm'
    },
};
export const SHOP_WEAPONS: WeaponId[] = ['shotgun', 'smg', 'rifle', 'heavySmg', 'leverShotgun', 'autoShotgun', 'plasmaRifle'];
export class WeaponRules {
    current: WeaponId = 'pistol';
    inventory: WeaponId[] = ['pistol', 'knife'];
    magazines = Object.fromEntries(Object.keys(WEAPONS).map(id => [id, id === 'pistol' ? 12 : 0])) as Record<WeaponId, number>;
    reserves = Object.fromEntries(Object.keys(WEAPONS).map(id => [id, id === 'pistol' ? Infinity : 0])) as Record<WeaponId, number>;
    cooldown = 0;
    reloadRemaining = 0;
    get ammo() {
        return this.magazines[this.current];
    }
    get reserve() {
        return this.reserves[this.current];
    }
    get reloading() {
        return this.reloadRemaining > 0;
    }
    get reloadProgress() {
        return this.reloading ? 1 - this.reloadRemaining / WEAPONS[this.current].reload : 0;
    }
    owns(id: WeaponId) {
        return this.inventory.includes(id);
    }
    tick(dt: number) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (!this.reloading)
            return false;
        this.reloadRemaining -= dt;
        let transferred = false;
        const spec = WEAPONS[this.current];
        while (this.reloadRemaining <= 0) {
            const needed = spec.capacity - this.ammo;
            const amount = Math.min(spec.reloadStyle === 'shell' ? 1 : needed, this.reserve, needed);
            this.magazines[this.current] += amount;
            if (Number.isFinite(this.reserve))
                this.reserves[this.current] -= amount;
            transferred = amount > 0;
            if (spec.reloadStyle === 'shell' && this.ammo < spec.capacity && this.reserve > 0) {
                this.reloadRemaining += spec.reload;
            }
            else {
                this.reloadRemaining = 0;
                break;
            }
        }
        return transferred;
    }
    switchTo(id: WeaponId) {
        if (!this.owns(id) || id === this.current)
            return false;
        this.reloadRemaining = 0;
        this.current = id;
        this.cooldown = .25;
        return true;
    }
    reload() {
        const spec = WEAPONS[this.current];
        if (this.current === 'knife' || this.reloading || this.ammo === spec.capacity || this.reserve === 0)
            return false;
        this.reloadRemaining = spec.reload;
        return true;
    }
    fire() {
        if (this.cooldown > 0)
            return false;
        if (this.reloading) {
            if (WEAPONS[this.current].reloadStyle === 'shell' && this.ammo > 0)
                this.reloadRemaining = 0;
            else
                return false;
        }
        if (this.current !== 'knife' && this.ammo === 0)
            return false;
        if (this.current !== 'knife')
            this.magazines[this.current]--;
        this.cooldown = WEAPONS[this.current].interval;
        return true;
    }
    purchaseReason(id: WeaponId, run: RunRules) {
        const spec = WEAPONS[id];
        if (run.phase !== 'break')
            return 'The trader opens between waves';
        if (this.owns(id))
            return 'Already owned';
        if (spec.requires && !this.owns(spec.requires))
            return `Requires ${WEAPONS[spec.requires].name}`;
        if (run.points < spec.price)
            return `Need ${spec.price - run.points} more points`;
        return '';
    }
    buy(id: WeaponId, run: RunRules) {
        if (this.purchaseReason(id, run))
            return false;
        const spec = WEAPONS[id];
        run.points -= spec.price;
        this.inventory.push(id);
        this.magazines[id] = spec.capacity;
        this.reserves[id] = spec.reserveMax;
        return true;
    }
    refillReason(id: WeaponId, run: RunRules) {
        const spec = WEAPONS[id];
        if (run.phase !== 'break')
            return 'The trader opens between waves';
        if (!this.owns(id))
            return 'Weapon not owned';
        if (!spec.ammoPrice)
            return 'No resupply needed';
        if (this.reserves[id] === spec.reserveMax && this.magazines[id] === spec.capacity)
            return 'Ammunition full';
        if (run.points < spec.ammoPrice)
            return `Need ${spec.ammoPrice - run.points} more points`;
        return '';
    }
    refill(id: WeaponId, run: RunRules) {
        if (this.refillReason(id, run))
            return false;
        const spec = WEAPONS[id];
        run.points -= spec.ammoPrice;
        this.magazines[id] = spec.capacity;
        this.reserves[id] = spec.reserveMax;
        if (this.current === id)
            this.reloadRemaining = 0;
        return true;
    }
}
