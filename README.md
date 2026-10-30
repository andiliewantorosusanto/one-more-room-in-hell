# One More Room In Hell

A local browser adaptation of Left 4 Dead 2's No Mercy hospital. TypeScript, Vite and Babylon.js render converted hospital geometry, props, native infected and weapon animations. Survival has five waves and trader breaks; Objective has three encounters: restore power, secure the elevator landing, then reach the upper construction floor.

## Required local assets

This repository contains the game code, conversion scripts and shared audio. Converted Valve models and maps are excluded from Git. Restore the full `public/source-private/l4d2/` folder from your previous local conversion, or regenerate it from an installed copy of Left 4 Dead 2. There is no fallback map or replacement model pack. Missing or invalid asset data produces an error identifying the required file.

The pack needs `manifest.json`, `hospital-nav.json`, `hospital.lights.json`, `hospital.glb`, five infected GLBs and nine weapon GLBs named by the manifest. The existing converter supplies nurse, patient, surgeon, police and civilian infected; P220, UZI, MAC-10, M16A2, Remington 870, Chrome Shotgun, SPAS-12, AK-47 and a knife. Bill's arms are embedded in the weapon viewmodels.

```sh
python scripts/import-l4d2-local.py --game "/path/to/Left 4 Dead 2" --blender "/path/to/blender" --sourceio "/path/to/SourceIO"
```

Conversion requires Blender 4.2 LTS and SourceIO fe24260. The script's default tool paths target the previously prepared Windows tools under `.tmp/source-port/tools`; pass explicit tool paths on other machines. The installed game is read only. Converted assets remain Git-ignored; local builds include them when present.

## Run and verify

Requires Node.js 22.12+ or 24+, a desktop browser with WebGL2 and hardware acceleration, and the converted asset pack.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Open the local URL printed by Vite. Click **Enter the room** to activate audio and capture the mouse. If an embedded preview blocks mouse capture, hold right mouse to turn and aim. Escape releases the mouse and pauses.

The build produces a static website in `dist/`. `.openai/hosting.json` retains the existing project ID; this cleanup does not publish or update hosting. Do not treat a successful code build without the native pack as proof that gameplay is ready.

## Controls and settings

Default controls: WASD move, Shift sprint, mouse look, left click fire/slash, right click aim, R reload, E use/hold an objective terminal, 1–9 select owned weapons, scroll switch weapon, Escape pause, F3 performance counters.

Settings are available from the main and pause menus. Movement, sprint, reload, Use and weapon slots can be remapped. Click a binding and press a replacement; occupied keys swap, and Escape cancels. Mouse sensitivity ranges from 0.3× to 2.5×. Changes save in this browser; reset restores default controls and sensitivity. Existing saved settings remain compatible.

## Gameplay

Start with a 12-round P220 with unlimited reserve ammunition, plus a knife. Earn 50 points per kill, 25 extra per headshot kill, and a streak bonus increasing by 10 to a cap of 50 extra. Body kills or taking damage break the streak. Headshots deal double firearm damage. Knife reach is 1.5 metres.

The trader opens between encounters, restores 25 health, and waits for **Ready for next wave**. Buy weapons, upgrades and ammunition using points. Rifle upgrades require M16A2; shotgun upgrades require Remington 870; MAC-10 requires UZI. Magazine reloads cancel on weapon switches; shotgun shells already loaded are kept. Weapon IDs are retained internally for compatibility: `leverShotgun` is the Chrome Shotgun and `plasmaRifle` is the AK-47.

Objective terminals require all infected cleared, line of sight and continuous Use within 1.65 metres. Each completion pays 150 points. Releasing Use or leaving reach resets progress. Near the elevator, Use transfers between the authored landings; Objective mode requires stage two to finish before ascending.

Navigation follows imported NAV areas, slopes and directional links; shots collide with imported hospital meshes. Native infected are walkers and runners. The flashlight and nearby authored fixture lights illuminate the hospital. Original baked lighting, Source entity scripting, interactive doors, physics/ragdolls and L4D's director are not emulated.

## Development checks

Native diagnostics are available in the development server at `/?qa`. Retained checks include hospital combat and movement, all eight sight alignments, objectives, armory, reload/shot inspection, and a ground-only 32-infected stress scenario. `/?qa=sights`, `/?qa=missions`, `/?qa=armory` and `/?qa=stress` run those scenarios. QA controls are disabled in standard production builds.

Automated tests cover run/trader rules, native weapon definitions, controls, missing/invalid pack data and navigation slopes/stacked floors. Two additional tests inspect actual native models and knife animation when the local pack exists. Their skips mean asset validation is blocked, not passed. See [VALIDATION.md](VALIDATION.md) for current results and limits.

Sources and licenses for retained assets: [asset credits](public/ASSET-CREDITS.md). Shared CC0 audio remains bundled; the old fallback models, textures and source archives have been removed.
