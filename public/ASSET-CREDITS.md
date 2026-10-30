# One More Room In Hell — asset credits

## Local Left 4 Dead 2 assets

No Mercy hospital (`c8m4_interior`), props, navigation data, common infected, weapon viewmodels, textures, animations and Bill's first-person arms originate from the user's installed Left 4 Dead 2, by Valve Corporation. Converted proprietary game files are not included in this repository. They remain in the Git-ignored `public/source-private/l4d2/` folder and are required to run this game.

The converter preserves native textures, selected animation clips, authored fixture lights, posed props and translucent materials. Coordinates, framing, animation timing and first-person sleeve geometry are adapted for the browser. Source entity scripting, baked lightmaps, dynamic doors, ragdoll physics and the original director are not reproduced.

Conversion uses [SourceIO](https://github.com/REDxEYE/SourceIO), revision fe24260, MIT. Its license is retained in `scripts/SOURCEIO-LICENSE.txt`. The source game installation is read only.

## Shared audio

The following audio files remain bundled under `assets/audio/`. They are retained from the earlier game revision and are not original L4D recordings.

### The Free Firearm Sound Library

Author: Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney. License: CC0-1.0.

Source: https://opengameart.org/content/the-free-firearm-sound-library

Changes: Individual shots trimmed from AR-15/D_24P.wav at 0.541s for 1.25s and Walther PPQ/X_31P.wav at 1.078s for 1.35s; major transients follow within 8.3ms/7.4ms respectively. Downmixed to mono 22050Hz PCM16 WAV.

### Gun Reload Sound Effects

Author: Brian MacIntosh / BMacZero. License: CC0-1.0.

Source: https://opengameart.org/content/gun-reload-sound-effects

Changes: Renamed clipload1.wav; unmodified PCM recording.

### Fantozzi's Footsteps (Grass/Sand & Stone)

Author: Fantozzi; sliced/submitted by qubodup. License: CC0-1.0.

Source: https://opengameart.org/content/fantozzis-footsteps-grasssand-stone

Changes: StoneL1, StoneR1, StoneL2, StoneR2 converted from original Ogg to mono 22050Hz PCM16 WAV.

### Zombies Sound Pack

Author: artisticdude. License: CC0-1.0.

Source: https://opengameart.org/content/zombies-sound-pack

Changes: Selected zombie-1.wav, zombie-5.wav, zombie-10.wav, zombie-15.wav; converted to mono 22050Hz PCM16 WAV. Samples are vocal zombie reactions suitable for varied positional groans.

### RPG Sound Pack

Author: artisticdude. License: CC0-1.0.

Source: https://opengameart.org/content/rpg-sound-pack

Changes: Selected battle/swing2.wav (knife swing), NPC/beetle/bite-small.wav (body impact), inventory/metal-small1.wav (equipment); converted to mono 22050Hz PCM16 WAV.

### Electronic device loop

Author: qubodup. License: CC0-1.0.

Source: https://opengameart.org/content/electronic-device-loop

Changes: Real hard-disk/mechanical recording, low-pass filtered at 650Hz for subdued indoor machine ambience; brief edge fades; downmixed to mono 22050Hz PCM16 WAV. Not a hospital field recording.

## Runtime

Babylon.js: Apache License 2.0. Its license and notice are bundled under `licenses/`.
Vite: MIT. TypeScript: Apache License 2.0.
