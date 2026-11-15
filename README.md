# Fantasy Tower Defense

Browser-based 3D tower defense: one tower in the middle, enemies walk in a straight line from a big outer circle. Gain XP, level up, upgrade the tower.

**Status:** stage 3 — the tower auto-shoots, kills give XP, level-ups offer 1 of 3 upgrades, endless waves, game over + retry. Enemies: peasants, rogues, warriors, wizards, trolls, giants, and a Giant Warlord boss every 10th wave. Flying dragons too. A sorcerer stands on the tower, and the tower grows cooler with every level and upgrade (gold bands, spires, crossbows, ballistas, buttresses, healing stones, beacon, orbiting runes, a crown at level 15).

**Modes:** Story (5 chapters of 10 waves, boss at the end of each, progress saved in the browser) and Endless (best wave saved). **Sound:** generated in code (Web Audio); press M or click the speaker to mute.

**Developer mode (hidden):** type `devmode` or press F2 to open a panel: jump to any wave, next boss wave, +level, kill all, god mode.

**Play:** https://neckfors.github.io/fantasy-tower-defense/`n`n## Run
```
py -3 -I -m http.server 8123
```
Open http://localhost:8123 (needs internet for the Three.js CDN). Drag to orbit, scroll to zoom.

## Credits
See [CREDITS.md](CREDITS.md) — all models are CC0.

## Support

If you like the app, you can support the author on [PayPal](https://paypal.me/neckfors). Thank you!


