import { RunRules } from '../game/run-rules.ts';
import { WEAPONS, SHOP_WEAPONS, WeaponRules, type WeaponId } from '../weapons/weapon-rules.ts';
export class TraderUI {
    root: HTMLElement;
    visible = false;
    filter = 'All';
    onBuy = (_id: WeaponId) => {
    };
    onRefill = (_id: WeaponId) => {
    };
    onEquip = (_id: WeaponId) => {
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
        this.root.innerHTML = `<div class="trader-sheet"><header class="trader-header"><div><span class="eyebrow">Between encounters</span><h2 id="trader-title">Resupply</h2><p id="trader-wave"></p></div><div class="trader-wallet"><span>Available points</span><strong id="trader-points">0</strong><small>Weapons &amp; ammunition</small></div></header><div class="trader-body"><section class="trader-catalogue"><nav id="trader-filters" aria-label="Weapon categories"></nav><div id="trader-cards" class="trader-cards"></div></section><aside class="trader-loadout"><h3>Your equipment</h3><div id="trader-inventory"></div><div class="trader-rewards"><b>Rewards</b><p>Kill <strong>+50</strong><br>Headshot kill <strong>+25 extra</strong><br>Headshot streak <strong>+10…50 extra</strong></p><small>A body-shot kill or taking damage breaks the streak. Misses do not.</small></div></aside></div><footer class="trader-footer"><p id="trader-message" role="status">Spend your points, then return to the fight. There is no time limit.</p><button id="trader-ready" class="primary">Next wave <span>→</span></button></footer></div>`;
        parent.append(this.root);
        for (const filter of ['All', 'SMG', 'Shotgun', 'Rifle']) {
            const button = document.createElement('button');
            button.textContent = filter === 'All' ? 'All weapons' : filter;
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
        this.root.querySelector('#trader-ready')!.innerHTML = (run.mode === 'objective' ? 'Continue mission' : 'Next wave') + ' <span>→</span>';
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
            return `<article class="trader-card ${owned ? 'owned' : ''}" data-item="${id}"><div class="trader-card-top"><span>${spec.requires ? 'Upgrade · ' : ''}${spec.label}</span><b>${owned ? 'Owned' : spec.price.toLocaleString('en-US') + ' PTS'}</b></div><h3>${spec.name}</h3><p>${spec.description}</p><dl class="weapon-stats"><div><dt>Damage</dt><dd>${spec.pellets > 1 ? spec.pellets + ' × ' : ''}${spec.damage}</dd></div><div><dt>Capacity</dt><dd>${spec.capacity}</dd></div><div><dt>Fire</dt><dd>${spec.automatic ? 'AUTO' : 'SEMI'}</dd></div></dl><button data-weapon="${id}" data-action="${owned ? 'equip' : 'buy'}" ${owned ? equipped ? 'disabled' : '' : reason ? 'disabled' : ''}>${owned ? equipped ? 'Equipped' : 'Equip' : reason ? reason : 'Buy &amp; equip · ' + spec.price + ' PTS'}</button></article>`;
        }).join('');
        this.root.querySelector('#trader-inventory')!.innerHTML = w.inventory.map((id, i) => {
            const spec = WEAPONS[id], reason = w.refillReason(id, run);
            return `<div class="trader-inventory-item"><div><kbd>${i + 1}</kbd><b>${spec.name}</b>${w.current === id ? '<span class="equipped-dot" title="Equipped">●</span>' : ''}</div><small>${id === 'knife' ? 'Ready' : id === 'pistol' ? w.magazines[id] + ' / 12 · Unlimited reserve' : w.magazines[id] + ' / ' + spec.capacity + ' · ' + w.reserves[id] + ' reserve'}</small>${spec.ammoPrice ? `<button data-weapon="${id}" data-action="refill" ${reason ? 'disabled' : ''}>${w.reserves[id] === spec.reserveMax && w.magazines[id] === spec.capacity ? 'Ammunition full' : 'Refill · ' + spec.ammoPrice + ' PTS'}</button>` : ''}</div>`;
        }).join('');
    }
}
