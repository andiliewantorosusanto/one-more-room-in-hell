import { RunRules } from '../game/run-rules.ts';
import { WEAPONS, SHOP_WEAPONS, WeaponRules, type WeaponId } from '../weapons/weapon-rules.ts';
function silhouette(id: WeaponId) {
    const energy = id === 'plasmaRifle', shotgun = WEAPONS[id].category === 'Shotgun', smg = WEAPONS[id].category === 'SMG';
    return `<svg viewBox="0 0 220 70" aria-hidden="true" class="gun-silhouette ${energy ? 'energy' : ''}"><path d="M11 31h34l17-12h74l12 9h${smg ? '34' : '56'}v7H142v12H89l-7 15H68l2-20H42L15 52z"/><path d="M91 43h25l${id === 'autoShotgun' ? '8 18-23 6-10-10' : id === 'leverShotgun' ? '-4 16-20 0-2-16' : '8 19-18 3-9-22'}z"/>${shotgun ? '<path d="M137 36h58v7h-58z"/>' : ''}${energy ? '<path class="coil" d="M113 21v18m10-18v18m10-18v18m10-14v12"/>' : ''}${id === 'leverShotgun' ? '<ellipse cx="65" cy="51" rx="18" ry="11" fill="none" stroke="currentColor" stroke-width="4"/>' : ''}</svg>`;
}
export class TraderUI {
    root: HTMLElement;
    visible = false;
    filter = 'All';
    onBuy = (id: WeaponId) => {
    };
    onRefill = (id: WeaponId) => {
    };
    onEquip = (id: WeaponId) => {
    };
    onReady = () => {
    };
    private run!: RunRules;
    private weapons!: WeaponRules;
    constructor(parent: HTMLElement) {
        this.root = document.createElement('section');
        this.root.id = 'trader';
        this.root.className = 'trader hidden';
        this.root.setAttribute('role', 'dialog');
        this.root.setAttribute('aria-modal', 'true');
        this.root.setAttribute('aria-labelledby', 'trader-title');
        this.root.innerHTML = `<div class="trader-sheet"><header class="trader-header"><div><span class="eyebrow">SAFE SUPPLY BREAK · FIELD SUPPLY</span><h2 id="trader-title">THE TRADER</h2><p id="trader-wave"></p></div><div class="trader-wallet"><span>AVAILABLE POINTS</span><strong id="trader-points">0</strong><small>KILLS PAY. PRECISION PAYS MORE.</small></div></header><div class="trader-body"><section class="trader-catalogue"><nav id="trader-filters" aria-label="Weapon categories"></nav><div id="trader-cards" class="trader-cards"></div></section><aside class="trader-loadout"><h3>YOUR LOADOUT</h3><div id="trader-inventory"></div><div class="trader-rewards"><b>MAKE EVERY SHOT COUNT</b><p>Kill <strong>+50</strong><br>Headshot kill <strong>+25 extra</strong><br>Headshot streak <strong>+10…50 extra</strong></p><small>A body-shot kill or taking damage breaks the streak. Misses do not.</small></div></aside></div><footer class="trader-footer"><p id="trader-message" role="status">Spend your points, then return to the fight. There is no time limit.</p><button id="trader-ready" class="primary">READY FOR NEXT WAVE <span>→</span></button></footer></div>`;
        parent.append(this.root);
        for (const filter of ['All', 'SMG', 'Shotgun', 'Rifle', 'Energy']) {
            const button = document.createElement('button');
            button.textContent = filter === 'All' ? 'ALL WEAPONS' : filter.toUpperCase();
            button.dataset.filter = filter;
            button.onclick = () => {
                this.filter = filter;
                this.render(this.run, this.weapons);
            };
            this.root.querySelector('#trader-filters')!.append(button);
        }
        this.root.querySelector<HTMLButtonElement>('#trader-ready')!.onclick = () => this.onReady();
        this.root.addEventListener('click', e => {
            const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-weapon]');
            if (!b || b.disabled)
                return;
            const id = b.dataset.weapon as WeaponId;
            if (b.dataset.action === 'buy')
                this.onBuy(id);
            else if (b.dataset.action === 'refill')
                this.onRefill(id);
            else
                this.onEquip(id);
        });
    }
    open(run: RunRules, w: WeaponRules) {
        this.visible = true;
        this.filter = 'All';
        this.root.classList.remove('hidden');
        this.render(run, w);
        this.message('Spend your points, then return to the fight. There is no time limit.');
        this.root.querySelector<HTMLButtonElement>('#trader-ready')!.focus();
    }
    close() {
        this.visible = false;
        this.root.classList.add('hidden');
    }
    message(text: string) {
        this.root.querySelector('#trader-message')!.textContent = text;
    }
    render(run: RunRules, w: WeaponRules) {
        this.root.querySelector('#trader-ready')!.innerHTML = (run.mode === 'objective' ? 'CONTINUE MISSION' : 'READY FOR NEXT WAVE') + ' <span>→</span>';
        this.run = run;
        this.weapons = w;
        this.root.querySelector('#trader-points')!.textContent = run.points.toLocaleString('en-US');
        this.root.querySelector('#trader-wave')!.textContent = `${run.mode === 'objective' ? 'Objective' : 'Wave'} ${run.wave} cleared · +25 health · Prepare for ${run.wave + 1} / ${run.stageCount}`;
        this.root.querySelectorAll<HTMLButtonElement>('#trader-filters button').forEach(b => {
            b.classList.toggle('active', b.dataset.filter === this.filter);
            b.setAttribute('aria-pressed', String(b.dataset.filter === this.filter));
        });
        this.root.querySelector('#trader-cards')!.innerHTML = SHOP_WEAPONS.filter(id => this.filter === 'All' || WEAPONS[id].category === this.filter).map(id => {
            const spec = WEAPONS[id], owned = w.owns(id), reason = w.purchaseReason(id, run), equipped = w.current === id;
            return `<article class="trader-card ${owned ? 'owned' : ''} ${id === 'plasmaRifle' ? 'plasma-card' : ''}" data-item="${id}"><div class="trader-card-top"><span>${spec.requires ? 'UPGRADE · ' : ''}${spec.label}</span><b>${owned ? 'OWNED' : spec.price.toLocaleString('en-US') + ' PTS'}</b></div>${silhouette(id)}<h3>${spec.name}</h3><p>${spec.description}</p><dl class="weapon-stats"><div><dt>DAMAGE</dt><dd>${spec.pellets > 1 ? spec.pellets + ' × ' : ''}${spec.damage}</dd></div><div><dt>MAGAZINE</dt><dd>${spec.capacity}</dd></div><div><dt>FIRE</dt><dd>${spec.automatic ? 'AUTO' : 'SEMI'}</dd></div></dl><button data-weapon="${id}" data-action="${owned ? 'equip' : 'buy'}" ${owned ? equipped ? 'disabled' : '' : reason ? 'disabled' : ''}>${owned ? equipped ? 'EQUIPPED' : 'EQUIP' : reason ? reason.toUpperCase() : 'BUY & EQUIP · ' + spec.price + ' PTS'}</button></article>`;
        }).join('');
        this.root.querySelector('#trader-inventory')!.innerHTML = w.inventory.map((id, i) => {
            const spec = WEAPONS[id], reason = w.refillReason(id, run);
            return `<div class="trader-inventory-item"><div><kbd>${i + 1}</kbd><b>${spec.name}</b>${w.current === id ? '<span class="equipped-dot" title="Equipped">●</span>' : ''}</div><small>${id === 'knife' ? 'ALWAYS READY' : id === 'pistol' ? w.magazines[id] + ' / 12 · INFINITE RESERVE' : w.magazines[id] + ' / ' + spec.capacity + ' · ' + w.reserves[id] + ' RESERVE'}</small>${spec.ammoPrice ? `<button data-weapon="${id}" data-action="refill" ${reason ? 'disabled' : ''}>${w.reserves[id] === spec.reserveMax && w.magazines[id] === spec.capacity ? 'AMMUNITION FULL' : 'FULL AMMO · ' + spec.ammoPrice + ' PTS'}</button>` : ''}</div>`;
        }).join('');
    }
}
