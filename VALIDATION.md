# Validation — L4D-only cleanup

30 October 2026 (Asia/Jakarta). Local changes only; no commit, push or publication.

## Automated checks

`npm test`: 26 passed, zero failed, two skipped because the converted L4D model pack is absent. Coverage includes required-pack loading, missing/HTML/invalid JSON/network failures, manifest model entries, NAV references, invalid navigation/lighting, native weapon names/balance/reload styles, ground-only enemy selection, slopes and stacked floors, hotkey persistence/remapping, objectives, trader rules and combat resources.

`npm run build`: TypeScript (including unused-local and unused-parameter checks) and production bundling pass. Babylon.js retains its existing large-chunk notice.

## Browser verification

Missing-pack startup and settings are checked against the current local build. Native hospital rendering, combat, movement, all eight firearms, knife animation, ADS, authored lights, elevator access, both modes and restart remain blocked until `public/source-private/l4d2/` is restored. Historical measurements from the removed fallback maps do not certify this revision. No current performance result is claimed.

## Retained native diagnostics

Development `/?qa` includes hospital combat/movement, sight alignment, ground-only stress, armory, mission interaction and shot/reload inspection. These require the real local pack; they do not substitute synthetic assets when it is missing.

## Production contents

Retained public assets: shared audio, credits, licenses and favicon, plus the ignored native pack if restored before building. The fallback models/textures, duplicate source ZIPs, old previews and benchmark files are removed. `plasmaRifle` and `leverShotgun` remain internal compatibility IDs for AK-47 and Chrome Shotgun; plasma visuals and synthetic weapon mechanisms are removed.
