# Fantasy Tower Defense

Browser-based 3D tower defense: one tower in the middle, enemies walk in a straight line from a big outer circle. Gain XP, level up, upgrade the tower.

**Status:** stage 3 — the tower auto-shoots, kills give XP, level-ups offer 1 of 3 upgrades, endless waves, game over + retry. Enemies: peasants, rogues, warriors, wizards, trolls, giants, and a Giant Warlord boss every 10th wave. Flying dragons too. Medieval life bars on every enemy; boss bars with their name sit at the top of the screen. Level-ups can give Shadow Knights, Chain Lightning and Fire Arrows. Enemies drop coins (this run only) that you spend in the in-game Armoury sidebar (keys 1-6) on consumables and timed buffs: Repair Tower, Rally Cry, Rapid Fire, Meteor Strike, Frost Nova, Barricade. Enemies also have a small chance to drop emeralds (bosses always); emeralds are saved and spent in the menu Shop on 8 permanent bonuses. The tower life bar is wide at the bottom of the screen and the level bar sits under the Armoury. A sorcerer stands on the tower, and the tower grows cooler with every level and upgrade (gold bands, spires, crossbows, ballistas, buttresses, healing stones, beacon, orbiting runes, a crown at level 15).

**New:** coins and emeralds hop out of dead enemies and fly to the tower; spell effects (glowing arrow trails, jagged chain lightning, flames, meteors, frost nova, shield dome); pause with P/Esc or the button; Story mode lets you start from any chapter you have reached; bars never cover menus.

**Made by me and my son Sam.**

**Modes:** Story (5 chapters of 10 waves, boss at the end of each, progress saved in the browser) and Endless (best wave saved). **Sound:** generated in code (Web Audio); press M or click the speaker to mute.

**Developer mode (hidden):** type `devmode` or press F2 to open a panel: jump to any wave, add any number of coins, next boss wave, +level, kill all, god mode.

**Play:** https://neckfors.github.io/fantasy-tower-defense/`n`n## Run
```
py -3 -I -m http.server 8123
```
Open http://localhost:8123 (needs internet for the Three.js CDN). Drag to orbit, scroll to zoom.

## Credits
See [CREDITS.md](CREDITS.md) — all models are CC0.

## Support

If you like the app, you can support the author on [PayPal](https://paypal.me/neckfors). Thank you!


