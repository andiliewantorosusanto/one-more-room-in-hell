# Validation — One More Room In Hell

29 October 2026 (Asia/Jakarta). Local-only revision; no hosting or source synchronization was performed.

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
