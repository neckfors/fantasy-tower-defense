# Credits

## 3D models
- **KayKit – Character Pack: Adventurers 1.0** by Kay Lousberg — CC0 1.0 (public domain, commercial use OK, no attribution required; credited anyway).
  - https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
  - https://kaylousberg.itch.io/kaykit-adventurers
  - Used: `Rogue.glb`, `Rogue_Hooded.glb`, `Barbarian.glb`, `Knight.glb`, `Mage.glb` (peasants are recoloured rogues/barbarians). License copy: `assets/models/KayKit-LICENSE.txt`.

## Bosses (CC BY 4.0)
All five are licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) (commercial use and changes allowed with credit). The creators do not endorse this game.
- **Goblin Ghoul** by [Rodrigo Bento](https://sketchfab.com/rodrigobento) — https://sketchfab.com/3d-models/goblin-ghoul-a6c6fffee3d34823b6d87a7054782577 — `assets/models/bosses/goblin.glb`
- **Spider animated character** by [TheGameAssets](https://sketchfab.com/TheGameAssets) — https://sketchfab.com/3d-models/spider-animated-character-746f5c5173ce4f47ad0970b62ee4106e — `assets/models/bosses/spider.glb`
- **Troll** by [SJunior3d](https://sketchfab.com/sjunior3d) — https://sketchfab.com/3d-models/troll-bceb1cb47186457c8571a23e6aff1b8e — `assets/models/bosses/troll.glb`
- **Worm Monster** by [CR!STALLL](https://sketchfab.com/CR1STALLL) — https://sketchfab.com/3d-models/worm-monster-5563066315694125b741901681d387c5 — `assets/models/bosses/worm.glb`
- **Low-poly orc** by [Riltariki](https://sketchfab.com/Riltariki) — https://sketchfab.com/3d-models/low-poly-orc-62f1637181cb4f6aa38897f5b7ab5edf — `assets/models/bosses/orc.glb`

**Changes made:** textures reduced to 512 px and only the colour texture kept (older specular-glossiness materials converted), unused animations and stray meshes removed. In the game they are rescaled, some forward movement built into the animations is removed or shortened, glowing eyes and effects are added, and some have new in-game names.

## Software
- **Three.js** (MIT) — https://threejs.org — loaded from jsDelivr CDN.

The tower, ground, trees and standing stones are generated in code.

## Dragon
- **Dragon** by Quaternius — https://poly.pizza/m/VBvzjFIYws — License: CC0 (public domain), commercial use OK. File: `assets/models/Dragon.glb` (re-coloured in code).

## Sound
All sound effects are generated in code with the Web Audio API (`src/audio.js`). No audio files are used, so no third-party audio licenses apply.
