# WARD ZERO

A desktop browser FPS: survive five waves in the isolation wing of St. Brigid Hospital. Built with TypeScript, Vite and Babylon.js. All gameplay runs locally in the player's browser. The deployed Site is private.

## Run locally

Requires Node.js 22.12+ or 24+ and a desktop browser with WebGL2 and hardware acceleration.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Click **Enter the ward** to activate audio and capture the mouse. Escape releases the mouse and pauses. Normal desktop browsers capture the mouse for standard FPS controls. If an embedded preview blocks mouse capture, the game automatically uses drag-look: hold the right mouse button to turn and aim, and left-click to fire. A reminder appears in the HUD.

```sh
npm test
npm run build
npm run preview
```

`dist/` is a complete static website. The deployed package uses the `project_id` in `.openai/hosting.json`; preserve this ID when updating the Site.

## Controls

WASD: move. Shift: sprint. Mouse: look. Left click: fire/slash. Right click: aim. R: reload. 1/2/3 or scroll: rifle/pistol/knife. Escape: pause. F3: performance counters.

The rifle has a 30-round magazine, 120 initial reserve rounds, and a 60-round refill after waves 1–4 (reserve capped at 180). The pistol has a 12-round magazine and infinite reserve. Switching weapons cancels a reload without transferring ammunition. The knife has 1.5m reach. Player/zombie health is 100; weapon damage is 34/25/50, with double firearm headshot damage.

Waves contain 16/28/40/56/72 enemies, with active caps 8/12/16/24/32. Fifteen-second breaks restore 25 health and rifle ammunition. Clearing wave 5 wins. There is no co-op, progression service, shop, dismemberment, jump, or crouch.

## Implementation

`src/rules.ts` owns ammunition, weapon state, health and wave transitions. `src/navigation.ts` owns the map grid, bed occupancy, collision, wall raycasts and shared flow field. Rendering, character animation, sound, UI and input use these same rules.

Weapons and enemies use textured skinned meshes and authored animation clips. The imported glTF root's coordinate conversion is preserved. A 40-character pool accommodates the 32-enemy cap and up to eight expiring corpses. Static architecture is merged by material; effects and audio voices are bounded. Models, textures, audio and shader variants load before play. Balanced quality caps the internal render size at 1280×720; it does not lower enemy counts.

The free original weapon animations use different clothing textures: rifle/pistol share olive sleeves, while the knife uses blue sleeves. Their geometry and animation are real assets rather than primitive stand-ins. See [asset credits](public/ASSET-CREDITS.md) and the JSON provenance files under `public/assets/`.

## Validation tools

`?lab` opens a dedicated model/animation viewer. In development, `?qa` exposes explicit test controls for shot damage, reloads, weapon switching, wave transitions, death, restart, and a 32-zombie stress scene. These controls cannot activate in the ordinary production build.

For a stable QA bundle without development hot reloads:

```sh
npx vite build --mode qa --outDir ../../work/qa-dist
npx vite preview --outDir ../../work/qa-dist --port 5174
```

Visit `http://localhost:5174/?qa`. Run the **Stress 32** scenario for five minutes at Balanced quality and use F3 to inspect actual frame timing. Stress mode keeps the player alive but runs normal enemy animation, movement, collision, and attacks. Test modes are clearly marked and are not shipped as an enabled gameplay option.

Performance is a measured target, not a guarantee. Intel Iris Xe / 16 GB / Chrome at 1280×720 is the reference target: average ≥60 FPS, p95 ≤20ms, no recurring >50ms combat stalls after warm-up. See `VALIDATION.md` for actual observations and unverified targets.
