# WARD ZERO — Asset credits

Models, animations, recordings and texture images retain their original licenses. Game code and original hospital geometry do not replace those licenses.

## FPS AK-74m animations

Author: Cransh; AK model by creationwasteland; FP arms by DJMaesen. License: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).

Original: https://sketchfab.com/3d-models/fps-ak-74m-animations-94be8385c402474cacd39bc096c6ca14

Download mirror: https://github.com/rohanvashisht1234/threejs-zombieshooter-game/blob/main/public/fps_gun_person_view.glb

Changes: Runtime position, scale and clip speed adjusted; glTF coordinate conversion preserved.

## FPS pistol animations

Author: Cransh; pistol by raimeiyonke; FP arms by DJMaesen. License: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).

Original: https://sketchfab.com/3d-models/fps-pistol-animations-0d7a343dcb6f401197a73c91aee93f6d

Download mirror: https://github.com/xssl9/ZERO_FRAME/tree/main/assets/weapons/pistol

Changes: Original glTF/binary/textures packed into GLB; textures resized to1024 and JPEG encoded; runtime pose and clip timing adjusted.

## Knife

```json
{
  "file": "knife.glb",
  "title": "knife Animated",
  "author": "DJMaesen (bumstrum)",
  "attribution": "knife Animated by DJMaesen, licensed CC BY4.0; FBX conversion, texture resizing, and weapon-hand constraint repair.",
  "license": "CC-BY-4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
  "originalSource": "https://sketchfab.com/3d-models/knife-animated-f3140db917cc43389c14b5b2536c1dc8",
  "downloadSource": "https://raw.githubusercontent.com/dendrocat/Dungeon/main/Assets/Models/Player/Knife.fbx",
  "mirrorAttribution": "https://github.com/dendrocat/Dungeon/blob/main/ReadMe.md",
  "originalLicenseVerified": true,
  "byteSize": 3996236,
  "sha256": "603abcb763356e7bab184b69e28057eb1c1eab732508def47586b1712c7209f3",
  "triangles": 16546,
  "meshCount": 2,
  "skinCount": 2,
  "materialCount": 2,
  "textures": "Original embedded diffuse and tangent normal maps for arms and knife;4 textures resized2048->1024, embeddedPNG",
  "clips": [
    {
      "name": "Knife_Attack",
      "seconds": 1.3666666746139526,
      "channels": 23
    },
    {
      "name": "attack_knife",
      "seconds": 1.3666666746139526,
      "channels": 23
    }
  ],
  "animationRoles": {
    "attack": "Knife_Attack",
    "idle": "Hold Knife_Attack frame0"
  },
  "changes": [
    "Converted the source FBX with Godot4.7.1 ufbx importer and GLTFDocument exporter.",
    "Retained authored arm attack animations. Source FBX knife parent constraint was not baked; repaired knife attachment to animated right wrist while preserving real knife geometry.",
    "Resampled embedded original textures to1024; restored normal map intensity and PBR metallic/roughness."
  ],
  "transformNotes": [
    "Y-up glTF. Do not rescale from the raw unskinned bounding box: internal bone root scales100 are compensated by inverse binds. Evaluate skinned bounds instead.",
    "Initial skinned arms bounds x[-0.37943,0.47884], y[-0.27215,0.05363], z[-0.61007,0.04241].",
    "Initial skinned knife bounds x[-0.36334,-0.32662], y[-0.259,-0.17125], z[-0.06802,0.27615].",
    "Knife handle repaired at mean right-finger root position[-0.34498,-0.21862,0.00630]. Verify framing and grip in runtime asset lab.",
    "Animation is1.3667 seconds. A0.65-second gameplay swing requires speedRatio~2.1026."
  ],
  "validation": {
    "glbHeader": true,
    "bufferViewsWithinBin": true,
    "sceneGraphAcyclic": true,
    "allNodesReachable": true,
    "animationAccessorCountsMatch": true
  }
}
```

## Zombie

```json
{
  "file": "zombie.glb",
  "title": "Thin Zombie [Awake Zombie Asset]",
  "author": "Rosswet Mobile",
  "attribution": "Thin Zombie by Rosswet Mobile, licensed CC BY 3.0. Converted to GLB/PBR and fitted to game scale.",
  "license": "CC-BY-3.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
  "originalSource": "https://opengameart.org/content/thin-zombie-awake-zombie-asset",
  "downloadSource": "https://walking.morgannriu.fr/assets/models/zombie-real-2.glb",
  "conversionCreditsSource": "https://walking.morgannriu.fr/assets/models/CREDITS.md",
  "originalLicenseVerified": true,
  "mixamoRequired": false,
  "byteSize": 2088128,
  "sha256": "a00336b0e8efb0f9ce4cd9d292033676fdcf9b9a50dc445dd6f38ecb1923b993",
  "triangles": 3340,
  "vertices": 10020,
  "skinCount": 1,
  "materialCount": 1,
  "texture": {
    "type": "image/png",
    "width": 1024,
    "height": 1024,
    "embedded": true
  },
  "animationRoles": {
    "idle": "idle",
    "walk": "walk",
    "run": "run",
    "attack": "attack1_r",
    "attackAlternate": "attack2",
    "hit": "hurt",
    "death": "dead1",
    "deathAlternate": "dead2"
  },
  "clips": [
    {
      "name": "attack1_l",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "attack1_r",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "attack2",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "attack3",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "dead1",
      "seconds": 1.625,
      "channels": 123
    },
    {
      "name": "dead2",
      "seconds": 0.9583333333333334,
      "channels": 123
    },
    {
      "name": "dead3",
      "seconds": 1.2916666666666667,
      "channels": 123
    },
    {
      "name": "enter_side",
      "seconds": 2.5416666666666665,
      "channels": 123
    },
    {
      "name": "hurt",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "hurt_b",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "hurt_head",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "hurt_l",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "hurt_r",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "idle",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "run",
      "seconds": 1.6666666666666667,
      "channels": 123
    },
    {
      "name": "walk",
      "seconds": 1.25,
      "channels": 123
    },
    {
      "name": "walk2",
      "seconds": 1.7083333333333333,
      "channels": 123
    }
  ],
  "transformNotes": [
    "GLB is Y-up, root Armature scale ~0.9553075; mesh POSITION bounds y=0..2.02605 before root/skin transforms. Measure actual loaded animated hierarchy, then uniformly fit to desired 1.8\u20131.85m height.",
    "walk/run/walk2 are already looping in-place (first/last hips match); do not delete vertical hip bob or separate foot-control animation channels.",
    "Skeleton contains named head and hips nodes, suitable for hitbox attachment.",
    "Do not play dead1/dead2 in a loop; hold final frame until pooled corpse expires.",
    "Check facing yaw visually in Babylon.js, which handles GLB handedness via its loader root."
  ]
}
```

## Textures and sounds

### Plaster003

Author: ambientCG / Lennart Demes. License: CC0-1.0.

Source: https://ambientcg.com/view?id=Plaster003

Changes: Selected Color, NormalGL and Roughness maps from the official 1K-JPG release; re-encoded at JPEG quality 78, 1024 pixels. No displacement or metallic map shipped.

### Tiles074

Author: ambientCG / Lennart Demes. License: CC0-1.0.

Source: https://ambientcg.com/view?id=Tiles074

Changes: Selected Color, NormalGL and Roughness maps from the official 1K-JPG release; re-encoded at JPEG quality 78, 1024 pixels. No displacement or metallic map shipped.

### Metal023

Author: ambientCG / Lennart Demes. License: CC0-1.0.

Source: https://ambientcg.com/view?id=Metal023

Changes: Selected Color, NormalGL and Roughness maps from the official 1K-JPG release; re-encoded at JPEG quality 78, 1024 pixels. No displacement or metallic map shipped.

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

### Leaking003

Author: ambientCG / Lennart Demes. License: CC0-1.0.

Source: https://ambientcg.com/view?id=Leaking003

Changes: Packed original 1024x512 Color RGB and Opacity grayscale into one lossless RGBA PNG. Original aspect and full 0–255 alpha retained. No other edits.

## Runtime

Babylon.js: Apache License2.0, https://github.com/BabylonJS/Babylon.js.

Vite: MIT. TypeScript: Apache2.0. Sharp is a development-only asset preparation tool and is not a browser dependency.

Babylon.js license and notice are bundled under /licenses/.


## Local arsenal additions — 29 October 2026

Kite-9, Kite-45, Warden Pump, Warden 1887, Warden AX and Helix Plasma: original geometry created locally for WARD ZERO in `src/weapons/weapon-art.ts`. No additional models, recordings or textures were downloaded for this revision. They reuse the existing CC BY 4.0 rifle arm rig and clips credited above. Imported firearm meshes are hidden for these six variants. Static parts are merged by material; bolts, detachable magazines/cell, pump, lever, loading shell and cooling vanes are articulated separately. The lever shotgun performs a full turn around its loop contact between shots.

Presentation modifications: pistol camera framing and reload/aim blending adjusted; knife idle pose evaluated explicitly and raised into view. Existing firearm recordings are pitch-varied for the added ballistic weapons. Plasma sound is synthesized locally with Web Audio; beams use bounded original geometry. Added models currently use local material colors rather than individually authored texture maps, and share donor hand motions rather than bespoke weapon-specific hand animation.

Babylon's Meshopt decoder is bundled from the installed package to avoid runtime CDN requests.


## Maps, rebrand and flying infected — 29 October 2026

Game renamed from WARD ZERO to One More Room In Hell. Original source credits above remain unchanged. Freight Depot layout, cargo props, terminal beacon, door favicon and map-selection graphics were authored locally, reusing the existing credited CC0 surface textures.

Flying Shrieker: derived from the existing Rosswet Mobile / Morgan Nriu zombie body and clips credited above, with a smaller scale, altitude-driven movement, original torn membrane/tendon wings, procedural flapping, an original noise-and-vein membrane texture, and a descent before close attacks. No new character model or mocap was downloaded. Wing membranes and tendons are original geometry in `src/enemies/flyer-art.ts`; flight behavior and elevated hitboxes are in `src/enemies/enemies.ts`. Existing vocal recordings are pitch-varied for its screech.

## Realistic infected variants

WorldWar zombie (local name Romero), Yaku zombie and Parasite zombie - Adobe / Mixamo. Original textured geometry and skin weights retained; animations retargeted and packed into self-contained GLBs, runtime scale adapted. Mixamo permits royalty-free use of its characters and animations in games; these assets are not open source and are not offered as a standalone model pack.

- [Adobe usage terms](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
- [Model download mirror](https://github.com/alexanderbenjamin4516-png/zombie-hunter/tree/main/models)
- [Motion download mirror](https://github.com/Barrsum/Vajra/tree/492b7134ddca16ce1c0206d5d7ef0c5c807ac271/assets)
- Source filenames, transformations and build notes: `assets/infected-provenance.json`.

The earlier Thin Zombie asset remains in the source archive; active infected now use the three Mixamo models. Flying infected combine these bodies with the original locally authored wings. Idle holds a mapped pose; both death slots share one clip.

## Local L4D2 assets — 30 October 2026

Optional local conversion of the user's installed Left 4 Dead 2 files: Valve Corporation. No Mercy hospital interior `c8m4_interior`, patched navigation data, hospital/common infected, native weapon viewmodels, Bill and Bill's arms. These are proprietary Valve assets, retained locally in the git-ignored `source-private/l4d2` directory. The SourceIO conversion tool is [REDxEYE/SourceIO](https://github.com/REDxEYE/SourceIO), revision fe24260, MIT; see `scripts/SOURCEIO-LICENSE.txt`. The game installation is left unchanged. The Mixamo pack remains the fallback when this local pack is absent.
