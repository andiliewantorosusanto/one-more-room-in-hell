# One More Room In Hell

A desktop browser zombie FPS with selectable maps and Survival or Objective mode. Built with TypeScript, Vite and Babylon.js. All gameplay runs locally in the player's browser. This revision is local-only; it has not updated the previously deployed private Site.

## Run locally

Requires Node.js 22.12+ or 24+ and a desktop browser with WebGL2 and hardware acceleration.

```sh
npm run dev
```

Open the local URL printed by Vite. Click **Enter the room** to activate audio and capture the mouse. Escape releases the mouse and pauses. Normal desktop browsers capture the mouse for standard FPS controls. If an embedded preview blocks mouse capture, the game automatically uses drag-look: hold the right mouse button to turn and aim, and left-click to fire. A reminder appears in the HUD.

```sh
npm test
npm run build
npm run preview
```

`dist/` is a complete static website. The deployed package uses the `project_id` in `.openai/hosting.json`; preserve this ID when updating the Site.

## Maps and modes

Choose **Hospital Isolation** or **Freight Depot** from the main menu. Each has its own floor plan, obstacle footprints, entrances, spawn and objective positions. The depot uses industrial cargo props, concrete/metal surfaces and amber work lights. The hospital keeps its grimy medical wards.

**Survival** retains five waves and four trader breaks. **Objective** has three encounters: restore power, transmit rescue coordinates, then open the extraction route. Clear an encounter, follow its numbered beacon, and hold **E** within 1.65 metres with an unobstructed path. Releasing E or leaving reach resets the hold. Objective completions add 150 points and open the trader between stages; the final terminal wins the mission. Starting a new run resets equipment and points.

**Flying Shriekers** join from encounter two. They hover, flap torn wings, approach through connected corridors, and descend for close attacks. They have 60 health, move faster than runners, and deal 8 damage. Their hitboxes follow their altitude; walls block their shots and attacks. A maximum of four flyers share the existing active-enemy cap. Wings are original local geometry on the existing credited zombie rig.

## Controls

WASD: move. Shift: sprint. Mouse: look. Left click: fire/slash. Right click: aim. R: reload. 1–9 or scroll: select owned weapons in the order shown in the HUD. E: hold to use an objective terminal. Escape: pause; the pause menu can return to map/mode selection. F3: performance counters.

Start with a 12-round pistol (unlimited reserve) and a knife with 1.5m reach. Player and zombie health is 100. Firearm headshots deal double damage. Switch weapons to cancel a magazine reload; shotgun shells already inserted are retained. A loaded tube shotgun can interrupt its reload by firing.

Kills award 50 points. Headshot kills add 25, plus 10 more for each successive headshot kill, capped at another 50: 75, 85, 95, 105, 115, 125 points. A body-shot kill or taking damage resets the streak; misses do not. Purchases spend points without reducing the run's earned-points statistic.

Waves contain 16/28/40/56/72 enemies with active caps 8/12/16/24/32. Clearing waves 1–4 restores up to 25 health and opens a safe, untimed trader. Buy equipment, choose an owned gun, and refill ammunition, then press **Ready for next wave**. Ammunition is purchased rather than granted automatically. Clearing wave 5 wins.

| Weapon | Price | Damage | Magazine | Upgrade requires |
|---|---:|---:|---:|---|
| XD Compact pistol | Starting | 25 | 12 | — |
| Combat knife | Starting | 50 | — | — |
| Warden Pump | 350 | 8 × 10 pellets | 6 | — |
| Kite-9 SMG | 450 | 18 | 32 | — |
| AK-74M rifle | 650 | 34 | 30 | — |
| Kite-45 heavy SMG | 800 | 27 | 25 | Kite-9 |
| Warden 1887 lever shotgun | 800 | 8 × 18 pellets | 5 | Warden Pump |
| Warden AX automatic shotgun | 1,400 | 10 × 15 pellets | 10 | Warden Pump |
| Helix plasma rifle | 1,600 | 60 | 24 | AK-74M |

Upgrade prices are additional purchases; the base gun remains in your inventory. Shotguns lose damage at range. Pump and lever shotguns reload one shell at a time; the lever shotgun performs a full flip between shots. Paid refills restore both magazine and reserve. There is no co-op, account service, dismemberment, jumping, or crouching.

## Implementation

The source is grouped by feature. `src/main.ts` only configures local decoding/shaders and starts the app.

```text
src/
  main.ts                 Browser entry point
  game/
    Game.ts               Game loop, input and system coordination
    run-rules.ts          Survival/objective encounters, health and rewards
    objective-rules.ts    Continuous terminal interaction
  weapons/
    weapon-rules.ts       Arsenal balance, inventory, ammo and purchases
    weapon-view.ts        First-person rigs, poses and animation
    weapon-art.ts         Local weapon geometry and moving mechanisms
  player/player.ts        Movement, collision and camera
  enemies/
    enemies.ts            Zombie pool, navigation, attacks and hitboxes
    enemy-rules.ts        Enemy types, balance and bounded spawn selection
    flyer-art.ts          Local animated wing geometry
  maps/maps.ts            Map catalogue: layouts, entrances and objectives
  world/
    navigation.ts         Hospital grid, flow field and obstruction
    world.ts              Hospital scenery, materials and lighting
  presentation/
    audio.ts              Preloaded sound and positional audio
    effects.ts            Bounded blood and plasma effects
    objective-view.ts     Active terminal and numbered beacon
  ui/
    ui.ts                 Menu, HUD, pause, settings and results
    trader.ts             Between-wave shop
    style.css             Interface styling
  dev/
    qa.ts                 Development-only gameplay checks and fixtures
    asset-lab.ts          Dedicated model/animation viewer
```

Tune damage, prices, magazines and upgrade requirements in `weapons/weapon-rules.ts`. Tune waves and point rewards in `game/run-rules.ts`. Add or tune map definitions in `maps/maps.ts`; `world/navigation.ts` derives collision and pathfinding from the selected layout. Appearance belongs in `world/world.ts`. Each new map currently chooses the hospital or industrial prop theme; add a visual theme there when its art requires one. Weapon framing lives in `weapons/weapon-view.ts`; added gun shapes live in `weapons/weapon-art.ts`. Rules remain independent of rendering and the interface. `Game.ts` coordinates those owners. No new framework or dependencies were added for this structure.

Weapons and enemies use textured skinned meshes and authored animation clips. The imported glTF root's coordinate conversion is preserved. A 40-character pool accommodates the 32-enemy cap and up to eight expiring corpses. Static architecture is merged by material; effects and audio voices are bounded. Models, textures, audio and shader variants load before play. Balanced quality caps the internal render size at 1280×720; it does not lower enemy counts.

The six added weapon variants are locally authored geometry with moving bolts, magazines, pump/lever parts and plasma cooling vanes. They reuse the existing rifle arm rig and animation clips; dedicated hand animation and realistic texture work remain polish limitations. The free original weapon animations use different clothing textures: rifle/pistol share olive sleeves, while the knife uses blue sleeves. The original rifle, pistol and knife retain their downloaded textured meshes and authored clips. The Meshopt decoder is bundled locally, so loading does not fetch a decoder from a CDN. See [asset credits](public/ASSET-CREDITS.md) and the JSON provenance files under `public/assets/`.

## Validation tools

`?lab` opens a dedicated model/animation viewer. In development, `?qa` exposes explicit test controls for combat, the trader, owned inventory, upgrades, reloads, death, restart, and a 32-zombie stress scene. `?qa=checks` runs the integration suite; `?qa=missions` checks map changes, both objective missions and flyers; `?qa=shop` previews the trader; `?qa=armory` equips a test inventory. These controls cannot activate in the ordinary production build.

For a stable QA bundle without development hot reloads:

```sh
npx vite build --mode qa --outDir ../../work/qa-dist
npx vite preview --outDir ../../work/qa-dist --port 5174
```

Visit `http://localhost:5174/?qa`. Run the **Stress 32** scenario for five minutes at Balanced quality and use F3 to inspect actual frame timing. Stress mode keeps the player alive and runs 32 infected, including four flyers, with normal animation, movement, collision and attacks. Test modes are clearly marked and are not shipped as an enabled gameplay option.

The current mixed-horde smoke result is 60 FPS, p95 18.1 ms and zero sampled >50ms frames over approximately 115 seconds on an Apple M4 / 16 GB. See `public/benchmark-maps.json`; the older five-minute result is a historical baseline. Performance is a measured target, not a guarantee. Intel Iris Xe / 16 GB / Chrome at 1280×720 is the reference target: average ≥60 FPS, p95 ≤20ms, no recurring >50ms combat stalls after warm-up. See `VALIDATION.md` for actual observations and unverified targets.
