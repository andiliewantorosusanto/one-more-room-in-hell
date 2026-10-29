# Validation — WARD ZERO

Date: 29 October 2026 (Asia/Jakarta).

## Functional checks

- TypeScript compilation and production bundling pass.
- Five executable rule/navigation tests pass, covering ammunition conservation, interrupted and partial reloads, unlimited pistol reserve, knife cadence, all 212 enemies across five waves, population caps, healing, death, map connectivity, movement collision and wall raycasts.
- Browser integration suite checks quick-click input, actual rifle head/body damage, headshot counting, interrupted reloads, pistol reloads, knife range and damage, wall obstruction, pause/resume, death, restart, intermissions and victory. All 19 browser checks passed in the fixed QA build.
- Missing-rifle build fixture shows a persistent Retry Loading explanation and prevents starting a broken run.
- All four actual GLBs validate and contain authored animation clips. Textures/audio decode before play. Weapon and zombie animations were visually inspected in the browser asset viewer.
- Native Escape and weapon-selection keys were exercised in the embedded browser. Mouse capture was unavailable there, so a right-drag look fallback was implemented. Normal pointer lock remains the primary desktop control.

## Performance

Measured machine: Apple M4, 16 GB RAM. Browser: Codex in-app browser, WebGL2. Balanced quality, 1280×720 internal resolution. The 32-zombie stress scenario runs normal navigation, separation, skeletal animation and attacks, with player invulnerability solely to sustain the test. Initial warm-up is excluded.

Final five-minute measurement: **32 active zombies, 18,000 sampled frames over 300 seconds, approximately 60 FPS, p95 18.1 ms, zero sampled frames above 50 ms**. Initial 10 seconds of warm-up excluded. This is a stationary maximum-horde scenario; it does not prove every possible moving/shooting workload. Machine-readable results: public/benchmark.json.

The Intel Iris Xe reference machine was unavailable. Chrome on that hardware, Edge and Firefox are **unverified**. A 60 FPS observation on this Mac does not establish a universal zero-lag guarantee.

## Asset and implementation limits

- The zombie's old source texture contains painted highlights; its material is nonmetallic and rough.
- Rifle/pistol sleeves are olive; the knife asset has blue sleeves. These are original textured, rigged assets.
- Lighting uses bounded practical lights and a flashlight, without expensive dynamic character shadows or ragdolls. Blood effects and corpses have fixed budgets.
- No mobile/touch, multiplayer, dismemberment, shops, jumping or crouching.

Full attribution and asset modifications are in public/ASSET-CREDITS.md and public/assets/*provenance.json.
