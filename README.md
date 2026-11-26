# Fantasy Tower Defense

Browser-based 3D tower defense: one tower in the middle, enemies march in squads out of magic doors around the arena. Gain XP, level up, upgrade the tower.

**Status:** stage 3 — the tower auto-shoots, kills give XP, level-ups offer 1 of 3 upgrades, endless waves, game over + retry. Enemies: peasants, rogues, warriors, wizards, trolls, giants, and a Giant Warlord boss every 10th wave. Flying dragons too. Medieval life bars on every enemy; boss bars with their name sit at the top of the screen. Level-ups can give Shadow Knights, a Tesla Coil (on the tower, chain lightning), Fire Arrows, a Ballista (heavy bolt every few seconds), Critical Strikes, Frost Arrows, Poison Tips, Thorns, Quick Learner, Ricochet, Sniper Shot, Blizzard, Spike Wall, Elf Archers, Baby Dragons, Lucky Charm, Reroll, Wise Tower (extra choice) and a Moat (blue, green, then purple water ring on the range ring that slows walking enemies by 30/45/60%). Most of these have 3 levels shown as stars. Level-up cards are marked New, Upgrade or Instant: gold stars are levels you own, the blinking green star is the one you are picking. Shop bonus levels use stars too; spikes, tesla, elves, baby dragons, blizzard, ricochet and sniper change colour per level (base, gold, diamond); the moat goes blue, green, purple. Enemies drop coins (this run only) that you spend in the in-game Armoury sidebar (keys 1-6) on consumables and timed buffs (each with a short description under its name): Repair Tower, Rally Cry, Rapid Fire, Meteor Strike, Frost Nova, Barricade. Enemies also have a small chance to drop emeralds (bosses always); emeralds are saved and spent in the menu Shop on 8 permanent bonuses. The tower life bar is wide at the bottom of the screen and the level bar sits under the Armoury. A sorcerer stands on the tower, and the tower grows cooler with every level and upgrade (gold bands, spires, crossbows, ballistas, buttresses, healing stones, beacon, orbiting runes, a crown at level 15).

**New:** coins and emeralds hop out of dead enemies and fly to the tower; spell effects (glowing arrow trails, jagged chain lightning, flames, meteors, frost nova, shield dome); pause with P/Esc or the button; Story mode lets you start from any chapter you have reached; bars never cover menus. Enemies hidden behind the tower or trees show as shadowy purple silhouettes; camera shake, level-up and wave rings, death poofs, fireworks on chapter clear; many new procedural sounds (spells, lightning, coins, gems, shield, pause, fanfare). Generative ambient music (mute with M).

**Game speed:** the ▶ button (or F) switches between 1× and 2×.

**Legendary upgrades:** every 10 levels (10, 20, 30…) you choose 1 of 3 legendary cards on a special golden screen. Each can be taken only once: Arcane Storm (every 15 s lightning strikes every enemy in range), Phoenix Heart (a fallen tower rises with half its health and burns nearby enemies; once used, it recharges at the next legendary level), Twin Sorcerer (a second wizard dealing 40% of your damage), Time Warp (every 30 s enemies nearly stop for 4 s), Golden Age (+50% coins, +25% XP) and Titan Walls (+50% max health and slow self-repair). The level bar, the power panel and the level-up screen tell you when the next one is coming. The ones you own stay visible in the power panel (even when it is closed) with a countdown (Arcane Storm, Time Warp), Ready, or Used ↻ with the level it comes back (Phoenix Heart), or On.

**Boss arrival:** when a Giant Warlord comes, the battle stops for a short cutscene: the camera swoops to the red portal, the boss steps out of the dark, stomps, and gets a name card. Tap or press Space / Esc to skip it.

**Your power:** a panel on the left shows your damage, fire rate and range bonuses, bolts per cast, your legendaries and your upgrades. On small screens it starts closed; tap its title to open it. Both it and the Armoury have a Less / More button that hides the explanations to take up less space (remembered).

**Day and night, fullscreen:** the ☀ / 🌙 button switches between day and night (looks only, remembered). The ⛶ button turns fullscreen on and off (Esc also leaves it); it is hidden in browsers that don't support it, such as on iPhone.

**Looks and combat:** six stone portals (more open in later waves, the boss gets a red one), glow effects, night sky, dirt roads, grass, braziers, fireflies and floating damage numbers. Your emerald count is shown at the top while playing. The sorcerer faces his target and every bolt shoots out of the wand; with several targets they leave in a narrow fan and then turn sharply towards their own enemies. Attackers don't waste shots on enemies that are already about to die, Shadow Knights pick fights they can reach in time, and enemy wizards and dragons hit the tower with visible projectiles. Poison spreads to nearby enemies.

**Balance:** damage per upgrade was measured and evened out (Baby Dragons and Spike Wall weaker, Elf Archers and Fire Arrows stronger, Shadow Knights and Fire Arrows capped at 3 levels). Big enemies and bosses have less health and level-ups come more often, so the mid-game is no longer a wall.

**Performance:** if the game runs slowly it lowers resolution, glow and shadows step by step (and goes back to full quality if that does not make it any faster). Each humanoid enemy is drawn as one mesh.

**Phones and tablets:** on upright phones the Armoury sits at the bottom in two columns (three in the compact view).

**Made by me and my son Sam.**

**Modes:** Story (5 chapters of 10 waves, boss at the end of each, progress saved in the browser) and Endless (best wave saved). **Sound:** generated in code (Web Audio); press M or click the speaker to mute.

**Developer mode (hidden):** a secret code opens a panel: jump to any wave, add any number of coins, next boss wave, +level, kill all, god mode.

**Play:** https://neckfors.github.io/fantasy-tower-defense/

The icon (a castle tower) is in `icons/`; it shows on the browser tab and when the page is added to a home screen.

## Run
```
py -3 -I -m http.server 8123
```
Open http://localhost:8123 (needs internet for the Three.js CDN). Drag to orbit, scroll to zoom.

## Credits
See [CREDITS.md](CREDITS.md) — all models are CC0. The main menu also lists the model credits.

## Support

If you like the app, you can support the author on [PayPal](https://paypal.me/neckfors). Thank you!


