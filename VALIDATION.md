# Validation — One More Room In Hell

29 October 2026 (Asia/Jakarta). Local-only revision; no hosting or source synchronization was performed.

## Realistic infected update

The active horde now uses three textured Mixamo bodies (Romero/WorldWar, Yaku, Parasite), with retargeted walking, running, attack and death clips. The 40-character pool and existing combat rules remain. Clothing uses alpha cutouts, repairing a source opacity value that hid a shirt. Credits and license records are in `public/assets/infected-provenance.json`; these are royalty-free game assets, not open-source or Left 4 Dead assets.

All **21 automated checks pass**, including loading every GLB in Babylon's NullEngine, instantiating the rigs, evaluating all eight clip slots, checking standing head height and confirming the death poses fall to the ground. Production build passes. `infected-preview.png` is a separate CPU-rendered comparison of the actual skinned meshes and original textures, not an in-game screenshot. `?qa=infected` opens the in-game lineup in development.

The previous browser results below describe the earlier art revision. The new browser combat run did not complete: its timed first-click assertion failed while the preview/capture tooling was stalling, and screenshot/download capture timed out. Full browser combat, final in-game lighting, flying-body framing and the 32-character performance target need rechecking on this art revision. Idle holds a pose; both attack slots share one motion and both death slots share one motion. Hit reaction is locally authored.

## Verified behavior

- Production build and TypeScript compilation pass. All **19 rules/navigation tests** pass. Both maps connect their spawn, entrances, objective locations and every walkable cell. Map changes reset collision and flow data. Original ammo, shop, scoring, health and survival progression checks remain green.
- **72 browser assertions pass**: the existing 32 combat/shop/restart checks and 38 map/mission/flying-enemy checks, plus two close-attack checks proving descent precedes damage and one dive deals eight damage. Both maps complete power, signal and extraction objectives through actual held-E input, with trader breaks. Remote interaction is rejected. Restart resets the run; map/mode selection can be reopened from pause or results.
- Repeated Hospital → Depot → Hospital switches finish loading and retain stable mesh/material counts. Browser testing found a shared engine BRDF texture incorrectly included in level disposal; shared scene textures are now excluded. Warm-up enables the representative wing rig, compiles its materials, then hides it. New dynamic textures are uploaded before readiness checks.
- Flying infected hover and animate wings, use elevated head/body hitboxes, descend before close attacks, obey walls, award ordinary kill/headshot credits once, and remain within the 32-enemy cap with no more than four flyers. Ground-level rays miss a hovering target; wall obstruction blocks airborne headshots.
- Main-menu title, map/mode selection, depot appearance, mission HUD and flying target were visually inspected in the actual browser. The earlier pistol/knife framing corrections remain in place.
- Map loading waits for textures and shader readiness before enabling entry. Failed loading retains the retry path. Existing pointer-lock fallback, audio activation, pause and restart behavior remain.

## Performance

Current mixed-horde smoke measurement: **Apple M4 / 16 GB, Codex in-app browser, Balanced 1280×720, 32 active infected including four flyers**. After ten seconds of warm-up: 6,896 sampled frames over approximately 115 seconds, rounded average **60 FPS**, **p95 18.1 ms**, **zero sampled frames above 50 ms**. This is a stationary scenario with normal AI/animation/attacks and invulnerability to sustain the run. It does not establish all movement, firing or map workloads. Current result: `public/benchmark-maps.json`.

The previous trader-only revision's five-minute result remains in `public/benchmark.json` as a historical baseline; it does not certify the new maps/flyers. A full five-minute acceptance run of this revision and Intel Iris Xe / Chrome, Edge and Firefox remain **unverified**. No universal zero-lag guarantee is claimed.

## Presentation and scope

Two playable starting maps are provided, each supporting Survival and Objective. More definitions can be added in `src/maps/maps.ts`; a new visual theme belongs in `src/world/world.ts`. Current objective maps use three stages with encounter counts 12/20/28 and hold times 3/4/5 seconds. Objective completions add 150 points and heal up to 25 health before the first two trader breaks.

The Shrieker uses the existing credited zombie body and clips, with original local membrane/tendon wings, a procedural skin texture, flapping, flight and descent. It has 60 health and 8 attack damage. It follows the shared navigable corridors and does not fly through walls or above low props. Dedicated flying-body animation remains a presentation limitation. Added weapons also retain shared donor hand clips rather than bespoke hand animation.

All new art uses existing local assets or original code-created geometry/textures. No new downloads or dependencies. No multiplayer, mobile controls, jumping, crouching, dismemberment or destructible scenery. Credits and modification records: `public/ASSET-CREDITS.md`.

## Expanded maps, sway and horde approaches

Both maps use a 53 by 45 grid with the original cell size: approximately 61 by 51 metres of playable bounding area, over four times the original walkable floor area. Four connected sectors and a central junction retain connectivity for every walkable cell, entrance and objective. Fixture coverage and prop collision footprints extend to all sectors. Wall leaks and floor stains merge by material. Spawn ranking prefers hidden nearby entrances over the farthest corners.

Crosshair markup, styling and update calls are removed. Idle angular sway affects both the gun and shot ray, falls by 85% at full ADS, and respects reduced motion. Source pistol/rifle sights are physical three-dimensional metal notches and blades; authored guns have separated rear/front geometry, including the shotguns and plasma rifle. ADS translation aligns their tips, and the held idle pose prevents donor animation from knocking the sights off axis. The browser `?qa=sights` check passes all eight firearms with a maximum 4 mm camera-space deviation.

Infected split into direct and flanking approaches, add collision-checked weaving, stagger their walk pace, and vary runner speed. They abandon lateral offsets within 3.2 metres and weave only outside 1.5 metres. Existing attack reach, damage, walls and population limits remain. Automated checks cover sector connectivity/size, reduced ADS sway, and varied bounded approaches. Performance at the 32-infected acceptance target and sustained player movement still need measurement on this revision.

Current validation: all **24 automated checks**, TypeScript and the production build pass. Browser checks confirm quick mouse firing, first-headshot damage and all eight sight alignments. The full timed combat suite stopped at its second headshot assertion: that call did not consume a round while the simulation was running slowly in the preview. The entire combat suite is therefore not certified for this revision. The corrected pistol sights and absence of a crosshair were visually inspected; capture: `.tmp/iron-sights-check.jpg`.

## Local L4D2 port — 30 October 2026

The installed No Mercy hospital interior was converted with SourceIO fe24260 / Blender 4.2.9. Original BSP brush geometry and 194 prop models are included; the patched NAV has exactly 976 unique areas and no dangling connection IDs. Five native infected have eight mapped gameplay clips each. All eight firearms and the knife have native rigs and textured weapon/arm meshes; the knife includes its native slash. Bill's body and idle animation are loaded in the starting area, and Bill's arms are used by the viewmodels. Local proprietary files are git-ignored.

Browser port combat checks pass: find a firing lane unobstructed by actual hospital meshes, spawn a native infected, aim at its native head bone, kill with two pistol shots, consume exactly two rounds, then move using the imported navigation. The check caught and fixed fixed-height torso spheres intercepting shots aimed at slumped native heads. All eight native firearm sight anchors pass camera alignment checks; pistol ADS has been visually inspected. Diffuse paths use case-insensitive Source lookup, fixing white weapon/prop materials. Map coordinates account for Babylon's GLTF root rotation. Static prop meshes are batched by material.

26 automated tests pass, including the optional local-pack check for native clips, skeletons, every infected/weapon diffuse texture, navigation cardinality and connections, plus stacked floors and slope movement. TypeScript and production build pass. The earlier timed full combat suite and 32-infected sustained performance target have not been certified for this port.

Adaptation limits: Source entity I/O, original baked lighting, dynamic doors, physics/ragdolls and the original director are not emulated. The elevator transfers between its authored landings when E is pressed nearby; Objective stage two must finish before the ascent. This revision is a local browser adaptation of the supplied assets, not a full Source-engine campaign runtime.

Port preview capture: `.tmp/l4d2-port.jpg`. Eight final native sight checks and the hospital combat/movement check passed in the browser after final framing adjustments. The local GLBs total approximately 169 MB. Sustained gameplay performance remains unmeasured on this Windows setup.

### Hospital port repair — 30 October 2026

Native lighting now uses 89 authored map light entities (up to four nearby fixtures active), reduced ambient fill and a neutral flashlight. The old moving lights placed from NAV areas are disabled for Mercy. The converter retains translucent/alpha-tested materials, sets prop skins and default poses, and skips physics-only map ragdolls and importer helper meshes. Bill's floating full-body lobby preview is removed; his first-person arms remain.

Source XY root motion is removed before conversion rather than deleting Blender bone-local XY channels. Native spawns use walkers/runners; flying shriekers remain in the fallback game only. Stopped enemies idle, turn toward travel, and corpses settle using their evaluated mesh floor contact. Weapon actions blend briefly and fire clips fit the firing interval. Additive knife motion is composed with idle before export. First-person shoulders are cropped/capped to prevent looking into hollow sleeves; pistol ADS uses its measured sight plane with greater eye clearance.

The native slash regression samples the skinned pose at start/mid/end and checks that the weapon stays ahead of the camera, below shoulder-height bind pose, and actually moves. Original baked lightmaps, interactive Source doors and ragdoll physics remain outside this browser adaptation.
Final repair checks: 27 automated tests pass. Browser hospital combat/movement and all eight native sight alignment checks pass. The knife is now composed from its idle pose and reframed inward; screenshot inspection confirms the previous bind-pose disappearance is removed. Pistol ADS eye distance and sleeve cropping remove the camera-inside-arm artifact. Source ragdolls are omitted rather than represented as suspended static bodies. There are 200 posed/skinned prop variants and 12 translucent materials in the rebuilt hospital. No original baked lightmap or ragdoll-physics parity is claimed.
Browser visual evidence for the final visible knife framing and authored-fixture lighting: `.tmp/hospital-repair.jpg`. Final production build passed after the framing change. Full Source lightmaps/physics are still not reproduced.
