import { MAPS, getMap, type MapId, type GameMode } from '../maps/maps.ts';
import { RunRules, headshotStreakBonus } from '../game/run-rules.ts';
import { WEAPONS, WeaponRules } from '../weapons/weapon-rules.ts';
import { TraderUI } from './trader.ts';
import type { Quality } from '../world/world.ts';
export type Settings = {
    quality: Quality;
    volume: number;
    sensitivity: number;
    reducedMotion: boolean;
};
const cross = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9z" fill="currentColor"/></svg>';
export class UI {
    selectedMap: MapId = 'hospital';
    selectedMode: GameMode = 'survival';
    onMenu = () => {
    };
    onMapChange = (_map: MapId) => {
    };
    settings: Settings = {
        quality: 'medium', volume: .65, sensitivity: 1, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    onStart = () => {
    };
    onResume = () => {
    };
    onSettings = (_s: Settings) => {
    };
    onRestart = () => {
    };
    private app: HTMLElement;
    private menu: HTMLElement;
    private hud: HTMLElement;
    private pause: HTMLElement;
    private end: HTMLElement;
    private announcement = 0;
    trader: TraderUI;
    private rewardSerial = -1;
    private rewardTime = 0;
    private inventorySignature = '';
    private els: Record<string, HTMLElement> = {};
    private failed = false;
    constructor() {
        try {
            const s = JSON.parse(localStorage.getItem('ward-zero-settings') || 'null');
            if (s) {
                if (['low', 'medium', 'high'].includes(s.quality))
                    this.settings.quality = s.quality;
                for (const k of ['volume', 'sensitivity'] as const)
                    if (typeof s[k] === 'number')
                        this.settings[k] = Math.max(k === 'volume' ? 0 : .3, Math.min(k === 'volume' ? 1 : 2.5, s[k]));
                if (typeof s.reducedMotion === 'boolean')
                    this.settings.reducedMotion = s.reducedMotion;
            }
        }
        catch {
        }
        this.app = document.getElementById('app')!;
        this.app.innerHTML = `
      <div class="vignette"></div><div id="damage" class="damage"></div><div class="grain"></div>
      <section id="menu" class="menu">
        <header class="menu-header"><div class="hospital-brand">${cross}<span>SURVIVOR NETWORK<br><small>NO SAFE ROOMS LEFT</small></span></div><span class="restricted"><i></i> QUARANTINE IN EFFECT</span></header>
        <div class="menu-copy"><div class="eyebrow"><span class="line"></span> A SOLO SURVIVAL EXPERIENCE</div><h1 class="game-title"><small>ONE MORE</small>ROOM<br><span>IN HELL</span></h1><p class="tagline">Every door is a gamble.<br>Open one more.</p><p class="menu-description">Choose a location. Survive the horde or finish the mission.<br>Earn points. Gear up. Find a way out.</p>
          <button id="start" class="primary" disabled><span id="start-label">PREPARING THE ROOM</span><span class="arrow">→</span></button>
          <div class="load-track"><span id="load-fill"></span></div><p id="load-label" class="load-label" role="status">Loading equipment…</p>
          <nav class="menu-actions"><button data-dialog="controls">HOW TO PLAY</button><span>/</span><button data-dialog="settings">SETTINGS</button><span>/</span><button data-dialog="credits">CREDITS</button></nav>
        </div>
        <aside class="location-card deployment-card"><span class="overline">PLAN YOUR NEXT RUN</span><h2>CHOOSE YOUR HELL</h2><div id="map-options" role="group" aria-label="Choose map"></div><div class="mode-options" role="group" aria-label="Choose game mode"><button data-mode="survival" aria-pressed="true"><b>SURVIVAL</b><small>Five waves · Trader breaks</small></button><button data-mode="objective" aria-pressed="false"><b>OBJECTIVE</b><small>Power · Signal · Extract</small></button></div><p id="deployment-description"></p><p class="deployment-warning">GROUND INFECTED + FLYING SHRIEKERS</p></aside>
        <footer class="menu-footer"><span>LOCAL TRANSMISSION <b>●</b> &nbsp; SOLO</span><span>DESKTOP &nbsp; / &nbsp; KEYBOARD + MOUSE</span><span>ONE MORE ROOM. ONE MORE CHANCE.</span></footer>
      </section>
      <div id="hud" class="hud hidden" aria-live="off">
        <div class="hud-top"><div class="hud-location">${cross}<div><b id="hud-map">HOSPITAL ISOLATION</b><span id="hud-location">ST. BRIGID HOSPITAL</span></div></div><div class="wave-counter"><span id="phase-label">SURVIVE THE WAVE</span><strong><span id="wave-number">01</span><em id="stage-total">/ 05</em></strong><div class="wave-pips"><i></i><i></i><i></i><i></i><i></i></div></div><div class="kill-counter"><span>INFECTED REMAINING</span><strong id="remaining">16</strong><small><b id="kills">0</b> ELIMINATED</small></div></div>
        <div class="credits-hud"><span>POINTS</span><strong id="points">0</strong><small id="headshot-streak"></small></div><div id="reward-toast" class="reward-toast"><b id="reward-amount"></b><span id="reward-detail"></span></div>
        <div id="wave-notice" class="wave-notice"><div id="notice-overline">THEY HEARD YOU</div><strong id="notice-title">WAVE 01</strong><span id="notice-detail">16 INFECTED INBOUND</span></div>
        <section id="objective-hud" class="objective-hud hidden"><span>MISSION OBJECTIVE</span><b id="objective-title"></b><small id="objective-direction"></small><p id="objective-hint"></p><div><i id="objective-progress"></i></div></section><div id="crosshair" class="crosshair"><i></i><i></i><i></i><i></i><b></b></div><div id="hitmarker" class="hitmarker"></div>
        <div id="reload-prompt" class="reload-prompt hidden"><span id="reload-message">RELOADING</span><div><i id="reload-progress"></i></div></div>
        <div class="hud-bottom"><div class="health-panel"><div class="health-heading">${cross}<span>VITAL SIGNS</span></div><strong id="health">100</strong><span class="health-unit">HP</span><div class="health-track"><i id="health-fill"></i></div></div>
        <div class="weapon-slots" id="weapon-slots"></div>
        <div class="ammo-panel"><span id="weapon-category">ASSAULT RIFLE</span><h3 id="weapon-name">AK-74M</h3><strong id="ammo">30</strong><em>/ <span id="reserve">120</span></em><small id="ammo-detail">5.45 × 39 mm</small></div></div>
        <div class="hud-help">R &nbsp; RELOAD <span>·</span> SHIFT &nbsp; SPRINT <span>·</span> ESC &nbsp; PAUSE</div>
      </div>
      <section id="pause" class="screen-overlay hidden"><div class="overlay-card"><span class="eyebrow">CATCH YOUR BREATH</span><h2>PAUSED</h2><p>Hell can wait.</p><button id="resume" class="primary">RESUME <span>→</span></button><button data-dialog="settings" class="secondary">SETTINGS</button><button id="restart-pause" class="text-button">RESTART RUN</button><button data-menu class="text-button">MAP & MODE SELECT</button></div></section>
      <section id="end" class="screen-overlay hidden"><div class="overlay-card"><span id="end-eyebrow" class="eyebrow">END OF TRANSMISSION</span><h2 id="end-title">OVERRUN</h2><p id="end-copy">Another room claimed another survivor.</p><div id="end-stats" class="end-stats"></div><button id="restart" class="primary">TRY AGAIN <span>→</span></button><button data-menu class="text-button">MAP & MODE SELECT</button><button data-dialog="credits" class="text-button">ASSET CREDITS</button></div></section>
      <dialog id="controls" class="dialog"><button class="close" aria-label="Close controls">×</button><span class="eyebrow">SURVIVAL MANUAL</span><h2>KEEP MOVING.</h2><p>Survival: clear five waves. Objective: clear each encounter, then find the marked terminal and hold E to restore power, signal rescue, and extract. Each completed objective pays 150 points. Start with a pistol and knife. Earn 50 points per kill, 25 extra for a headshot kill, and up to 50 extra for a headshot-kill streak. Between waves, recover 25 health and buy weapons, upgrades, or ammunition from the trader. Your pistol always has unlimited reserve ammunition.</p><dl class="controls-grid"><dt><kbd>W A S D</kbd></dt><dd>Move</dd><dt><kbd>MOUSE</kbd></dt><dd>Look around</dd><dt><kbd>LEFT CLICK</kbd></dt><dd>Fire / knife attack</dd><dt><kbd>RIGHT CLICK</kbd></dt><dd>Aim down sights</dd><dt><kbd>SHIFT</kbd></dt><dd>Sprint</dd><dt><kbd>R</kbd></dt><dd>Reload</dd><dt><kbd>E</kbd></dt><dd>Hold to use an objective terminal</dd><dt><kbd>1 — 9</kbd></dt><dd>Select an owned weapon</dd><dt><kbd>SCROLL</kbd></dt><dd>Switch weapon</dd><dt><kbd>ESC</kbd></dt><dd>Pause / release mouse</dd></dl><p class="fine">Headshots deal double firearm damage. A body-shot kill or taking damage breaks your headshot-kill streak. Switching cancels a magazine reload; already loaded shotgun shells are kept. The trader waits until you are ready.</p></dialog>
      <dialog id="settings" class="dialog"><button class="close" aria-label="Close settings">×</button><span class="eyebrow">FIELD ADJUSTMENTS</span><h2>SETTINGS</h2><label class="setting">Graphics quality<select id="quality"><option value="low">Low</option><option value="medium">Balanced</option><option value="high">High</option></select></label><label class="setting">Sound volume<input id="volume" type="range" min="0" max="1" step=".05"></label><label class="setting">Mouse sensitivity<input id="sensitivity" type="range" min=".3" max="2.5" step=".1"></label><label class="setting">Reduced camera motion<input id="motion" type="checkbox"></label><p class="fine">Balanced is recommended for laptops. Graphics quality changes rendering resolution and surface detail; the horde stays the same size.</p></dialog>
      <dialog id="credits" class="dialog"><button class="close" aria-label="Close credits">×</button><span class="eyebrow">BUILT WITH FREE ASSETS</span><h2>CREDITS</h2><div class="credits-copy"><p><a href="https://sketchfab.com/3d-models/fps-ak-74m-animations-94be8385c402474cacd39bc096c6ca14" target="_blank" rel="noopener noreferrer">AK-74M animations</a> and <a href="https://sketchfab.com/3d-models/fps-pistol-animations-0d7a343dcb6f401197a73c91aee93f6d" target="_blank" rel="noopener noreferrer">pistol animations</a> — Cransh. Rifle: creationwasteland. Pistol: raimeiyonke. Arms: DJMaesen. CC BY 4.0.</p><p>Animated knife &amp; arms — <a href="https://sketchfab.com/3d-models/knife-animated-f3140db917cc43389c14b5b2536c1dc8" target="_blank" rel="noopener noreferrer">DJMaesen</a>, CC BY 4.0. Converted, textures resized, hand attachment repaired.</p><p><a href="https://opengameart.org/content/thin-zombie-awake-zombie-asset" target="_blank" rel="noopener noreferrer">Thin Zombie / Awake Zombie</a> — Rosswet Mobile, CC BY 3.0. GLB conversion from Walking Dead by Morgan Nriu; scale and material adjusted.</p><p>Environment surface textures — <a href="https://ambientcg.com" target="_blank" rel="noopener noreferrer">ambientCG / Lennart Demes</a>, CC0. Selected maps resized and re-encoded.</p><p>Real firearm recordings — Ben Jaszczak et al., <a href="https://opengameart.org/content/the-free-firearm-sound-library" target="_blank" rel="noopener noreferrer">The Free Firearm Sound Library</a>, CC0. Additional sounds: BMacZero, Fantozzi, artisticdude and yd, CC0. Trimmed and mixed for this game.</p><p>Added SMGs, shotguns and plasma rifle — original local geometry, reusing the credited rifle arm rig and clips. Plasma audio is synthesized locally.</p><p>Rendering — Babylon.js, Apache 2.0. Original maps, flying-infected wings, props, gameplay, and interface created for One More Room In Hell. Flying infected reuse the credited zombie body and clips.</p><a href="/ASSET-CREDITS.md" target="_blank" rel="noopener noreferrer">Full sources, modifications and license details ↗</a></div></dialog>
      <output id="performance" class="performance hidden"></output>`;
        this.trader = new TraderUI(this.app);
        this.app.querySelector('#map-options')!.innerHTML = MAPS.map(map => `<button class="map-option" data-map="${map.id}" disabled aria-pressed="${map.id === this.selectedMap}"><svg viewBox="0 0 27 23" aria-hidden="true">${map.passages.map(([x, z, xx, zz]) => `<rect x="${x}" y="${z}" width="${xx - x + 1}" height="${zz - z + 1}"/>`).join('')}</svg><span><b>${map.name}</b><small>${map.location}</small></span><em>→</em></button>`).join('');
        this.app.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(b => b.onclick = () => {
            this.selectedMap = b.dataset.map as MapId;
            this.updateDeployment();
            this.onMapChange(this.selectedMap);
        });
        this.app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.onclick = () => {
            this.selectedMode = b.dataset.mode as GameMode;
            this.updateDeployment();
        });
        this.app.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach(b => b.onclick = () => this.onMenu());
        this.updateDeployment();
        this.menu = document.getElementById('menu')!;
        this.hud = document.getElementById('hud')!;
        this.pause = document.getElementById('pause')!;
        this.end = document.getElementById('end')!;
        for (const id of ['phase-label', 'wave-number', 'stage-total', 'remaining', 'kills', 'health', 'health-fill', 'ammo', 'reserve', 'weapon-name', 'weapon-category', 'ammo-detail', 'reload-prompt', 'reload-progress', 'reload-message', 'wave-notice', 'notice-overline', 'notice-title', 'notice-detail', 'hitmarker', 'damage', 'crosshair', 'points', 'headshot-streak', 'reward-toast', 'reward-amount', 'reward-detail'])
            this.els[id] = document.getElementById(id)!;
        document.getElementById('start')!.onclick = () => this.onStart();
        document.getElementById('resume')!.onclick = () => this.onResume();
        document.getElementById('restart')!.onclick = () => this.onRestart();
        document.getElementById('restart-pause')!.onclick = () => this.onRestart();
        this.app.querySelectorAll<HTMLElement>('[data-dialog]').forEach(b => b.onclick = () => {
            (document.getElementById(b.dataset.dialog!) as HTMLDialogElement).showModal();
        });
        this.app.querySelectorAll<HTMLElement>('.dialog .close').forEach(b => b.onclick = () => b.closest('dialog')!.close());
        const quality = document.getElementById('quality') as HTMLSelectElement, volume = document.getElementById('volume') as HTMLInputElement, sensitivity = document.getElementById('sensitivity') as HTMLInputElement, motion = document.getElementById('motion') as HTMLInputElement;
        quality.value = this.settings.quality;
        volume.value = String(this.settings.volume);
        sensitivity.value = String(this.settings.sensitivity);
        motion.checked = this.settings.reducedMotion;
        const change = () => {
            this.settings = {
                quality: quality.value as Quality, volume: +volume.value, sensitivity: +sensitivity.value, reducedMotion: motion.checked
            };
            try {
                localStorage.setItem('ward-zero-settings', JSON.stringify(this.settings));
            }
            catch {
            }
            this.onSettings(this.settings);
        };
        quality.onchange = change;
        volume.oninput = change;
        sensitivity.oninput = change;
        motion.onchange = change;
    }
    updateDeployment() {
        this.app.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.map === this.selectedMap)));
        this.app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === this.selectedMode)));
        document.getElementById('deployment-description')!.textContent = getMap(this.selectedMap).description;
    }
    setRunLocation() {
        const map = getMap(this.selectedMap);
        document.getElementById('hud-map')!.textContent = map.name.toUpperCase();
        document.getElementById('hud-location')!.textContent = map.location;
    }
    showMenu() {
        this.closeShop();
        this.hud.classList.add('hidden');
        this.pause.classList.add('hidden');
        this.end.classList.add('hidden');
        this.menu.classList.remove('hidden');
        this.ready();
    }
    setMapBusy(busy: boolean) {
        this.app.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(b => b.disabled = busy);
        if (busy)
            this.preparing();
        else
            this.ready();
    }
    preparing() {
        const b = document.getElementById('start') as HTMLButtonElement;
        b.disabled = true;
        document.getElementById('start-label')!.textContent = 'PREPARING LOCATION';
        document.getElementById('load-label')!.textContent = 'Preparing selected map…';
    }
    objective(title: string, distance: number, bearing: string, hint: string, progress: number) {
        document.getElementById('objective-hud')!.classList.toggle('hidden', this.selectedMode !== 'objective');
        document.getElementById('objective-title')!.textContent = title;
        document.getElementById('objective-direction')!.textContent = `${Math.ceil(distance)} M · ${bearing}`;
        document.getElementById('objective-hint')!.textContent = hint;
        document.getElementById('objective-progress')!.style.width = `${progress * 100}%`;
    }
    loading(done: number, total: number, label = 'Preparing equipment…') {
        if (this.failed)
            return;
        document.getElementById('load-fill')!.style.width = `${done / total * 100}%`;
        document.getElementById('load-label')!.textContent = `${label} ${Math.round(done / total * 100)}%`;
    }
    mouseMode(fallback: boolean) {
        this.app.querySelector('.hud-help')!.textContent = fallback ? 'HOLD RIGHT MOUSE TO LOOK · E USE · R RELOAD · ESC PAUSE' : 'E USE · R RELOAD · SHIFT SPRINT · ESC PAUSE';
    }
    ready() {
        this.app.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(b => b.disabled = false);
        const b = document.getElementById('start') as HTMLButtonElement;
        b.disabled = false;
        document.getElementById('start-label')!.textContent = 'ENTER THE ROOM';
        document.getElementById('load-label')!.textContent = 'EQUIPMENT CHECK COMPLETE';
        document.getElementById('load-fill')!.style.width = '100%';
    }
    fail(error: unknown) {
        this.failed = true;
        document.getElementById('start-label')!.textContent = 'RETRY LOADING';
        const b = document.getElementById('start') as HTMLButtonElement;
        b.disabled = false;
        b.onclick = () => location.reload();
        document.getElementById('load-label')!.textContent = 'The room could not load. Retry to reload local equipment.';
        console.error(error);
    }
    showGame() {
        this.trader.close();
        this.setRunLocation();
        document.getElementById('objective-hud')!.classList.toggle('hidden', this.selectedMode !== 'objective');
        this.rewardSerial = -1;
        this.rewardTime = 0;
        this.inventorySignature = '';
        this.menu.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.end.classList.add('hidden');
        this.setPaused(false);
    }
    get shopOpen() {
        return this.trader.visible;
    }
    openShop(run: RunRules, w: WeaponRules) {
        this.announcement = 0;
        this.hud.classList.add('dimmed');
        this.trader.open(run, w);
    }
    closeShop() {
        this.trader.close();
        this.hud.classList.remove('dimmed');
    }
    setPaused(value: boolean) {
        this.pause.classList.toggle('hidden', !value);
        this.hud.classList.toggle('dimmed', value);
    }
    closeDialog() {
        const d = this.app.querySelector<HTMLDialogElement>('dialog[open]');
        if (d) {
            d.close();
            return true;
        }
        return false;
    }
    announce(wave: number, count: number, objective = false) {
        this.announcement = 4;
        this.els['notice-overline'].textContent = wave === 1 ? 'THEY HEARD YOU' : 'KEEP YOUR DISTANCE';
        this.els['notice-title'].textContent = (objective ? 'OBJECTIVE ' : 'WAVE ') + String(wave).padStart(2, '0');
        this.els['notice-detail'].textContent = count + ' INFECTED INBOUND';
    }
    hit(killed: boolean, head: boolean) {
        const el = this.els.hitmarker;
        el.className = 'hitmarker visible' + (killed ? ' kill' : '') + (head ? ' head' : '');
        setTimeout(() => el.className = 'hitmarker', 140);
    }
    damage() {
        const el = this.els.damage;
        el.classList.remove('active');
        void el.offsetWidth;
        el.classList.add('active');
    }
    render(run: RunRules, w: WeaponRules, dt: number, aiming: boolean) {
        const text = (id: string, value: string) => {
            if (this.els[id].textContent !== value)
                this.els[id].textContent = value;
        };
        text('wave-number', String(run.wave).padStart(2, '0'));
        text('remaining', String(run.remaining));
        text('kills', String(run.kills));
        text('health', String(run.health));
        this.els['health-fill'].style.width = run.health + '%';
        this.els.health.style.color = run.health < 30 ? '#d77c65' : '';
        text('phase-label', run.phase === 'break' ? 'TRADER OPEN' : run.mode === 'objective' ? 'COMPLETE THE MISSION' : 'SURVIVE THE WAVE');
        text('stage-total', '/ ' + String(run.stageCount).padStart(2, '0'));
        text('weapon-name', WEAPONS[w.current].name);
        text('weapon-category', WEAPONS[w.current].label);
        text('ammo', w.current === 'knife' ? '—' : String(w.ammo).padStart(2, '0'));
        text('reserve', w.current === 'knife' ? '—' : Number.isFinite(w.reserve) ? String(w.reserve) : '∞');
        text('ammo-detail', WEAPONS[w.current].ammoLabel);
        const signature = w.inventory.join(',');
        if (signature !== this.inventorySignature) {
            this.inventorySignature = signature;
            document.getElementById('weapon-slots')!.innerHTML = w.inventory.map((id, i) => `<span id="slot-${id}"><kbd>${i + 1}</kbd> ${WEAPONS[id].name}</span>`).join('');
        }
        for (const id of w.inventory)
            document.getElementById('slot-' + id)!.classList.toggle('selected', id === w.current);
        text('points', run.points.toLocaleString('en-US'));
        text('headshot-streak', run.headshotStreak >= 2 ? `${run.headshotStreak} HEADSHOT STREAK · +${headshotStreakBonus(run.headshotStreak)} BONUS` : '');
        if (this.rewardSerial !== run.rewardSerial) {
            this.rewardSerial = run.rewardSerial;
            this.rewardTime = run.rewardSerial > 0 ? 1.5 : 0;
            text('reward-amount', '+' + run.lastReward + ' PTS');
            text('reward-detail', run.lastRewardHeadshot ? 'HEADSHOT' + (run.headshotStreak > 1 ? ' · STREAK ' + run.headshotStreak : '') : 'ELIMINATION');
        }
        this.rewardTime = Math.max(0, this.rewardTime - dt);
        this.els['reward-toast'].classList.toggle('visible', this.rewardTime > 0);
        this.app.querySelectorAll<HTMLElement>('.wave-pips i').forEach((el, i) => {
            el.classList.toggle('lit', i < run.wave);
            el.style.display = i < run.stageCount ? '' : 'none';
        });
        const reload = w.reloading || w.current !== 'knife' && w.ammo === 0;
        this.els['reload-prompt'].classList.toggle('hidden', !reload);
        text('reload-message', w.reloading ? (WEAPONS[w.current].reloadStyle === 'shell' ? 'LOADING SHELL' : 'RELOADING') : w.reserve === 0 ? 'EMPTY · SWITCH WEAPON' : 'PRESS R TO RELOAD');
        this.els['reload-progress'].style.width = (w.reloadProgress * 100) + '%';
        this.els.crosshair.classList.toggle('aiming', aiming);
        this.els.crosshair.classList.toggle('melee', w.current === 'knife');
        this.announcement = Math.max(0, this.announcement - dt);
        this.els['wave-notice'].classList.toggle('visible', !this.shopOpen && (this.announcement > 0 || run.phase === 'break'));
        if (run.phase === 'break') {
            text('notice-overline', 'A MOMENT TO BREATHE');
            text('notice-title', 'AREA CLEARED');
            text('notice-detail', '+25 HEALTH · TRADER OPEN');
        }
    }
    finish(run: RunRules) {
        this.closeShop();
        this.pause.classList.add('hidden');
        this.hud.classList.add('hidden');
        this.end.classList.remove('hidden');
        const won = run.phase === 'won';
        document.getElementById('end-title')!.textContent = won ? 'YOU SURVIVED' : 'OVERRUN';
        document.getElementById('end-eyebrow')!.textContent = won ? 'QUARANTINE CONTAINED' : 'END OF TRANSMISSION';
        document.getElementById('end-copy')!.textContent = won ? (run.mode === 'objective' ? 'Signal sent. Exit open. You made it out.' : 'Five waves. This room falls silent.') : 'Another room claimed another survivor.';
        const time = Math.floor(run.elapsed);
        document.getElementById('end-stats')!.innerHTML = `<div><strong>${run.wave}<span>/${run.stageCount}</span></strong><small>${run.mode === 'objective' ? 'OBJECTIVE REACHED' : 'WAVE REACHED'}</small></div><div><strong>${run.kills}</strong><small>ELIMINATED</small></div><div><strong>${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}</strong><small>SURVIVAL TIME</small></div><div><strong>${run.headshots}</strong><small>HEADSHOT KILLS</small></div><div><strong>${run.totalEarned.toLocaleString('en-US')}</strong><small>POINTS EARNED</small></div><div><strong>${run.bestStreak}</strong><small>BEST HEADSHOT STREAK</small></div>`;
    }
}
