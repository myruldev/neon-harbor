# Neon Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/myruldev/neon-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/myruldev/neon-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game for the [make.fun GTA 6 bounty](https://make.fun/r/kc2xf2b1).
A sun-soaked fictional seaside city, a $50,000 debt, and one last run of jobs.
No Rockstar content: no GTA names, characters, map, art, music or assets — everything
here (city, people, story, sounds) is original.

## The story

Rook Calloway drove getaway cars for the wrong people. Now fixer **Marla Voss**
owns his $50,000 debt — and his nights. Four jobs stand between Rook and freedom:

1. **First Fare** — pick up a passenger at Sunset Beach and drive him to Hotel Lumen.
2. **Golden Getaway** — steal Dante Kroll's golden Comet GT from the docks and bring it home.
3. **Three Packages** — take three packages from Kroll's runners across the city.
4. **The Ledger** — storm Kroll's warehouse, take out his armed guards, grab the ledger,
   and escape a four-star police chase to burn your debt for good.

Courier side jobs pay cash between missions — answer the phone booth by your garage.

## The city

Six districts to explore on foot and by car: **Old Town, Crest Hills, Harbor Docks,
Sunset Beach, Neon Strip** and **Marina Bay**. Traffic and pedestrians fill the roads,
the sun sets into a neon night with headlights and police light bars, and the Harbor PD
responds to everything you do — steal a car, hit a pedestrian, fire a shot, and the
stars climb from 1 to 5.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with any static server).
No install, no network — the game is 100% offline, and all sound is synthesized
live with WebAudio.

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive (Shift to run, Space to brake) |
| E | Enter or exit a car, interact, pick up packages |
| F | Punch |
| Mouse + click | Aim and shoot (after you earn the pistol) |
| Enter | Start the next mission |
| Esc / P | Pause (save from here) |
| M | Mute |

The HUD shows money, health, wanted stars, the clock, your district, the current
objective and a live minimap. Progress saves automatically after every mission
(and every courier job) via localStorage — continue from the title screen.

## Files

- `game/` — the game itself: `index.html`, `style.css`, and ES modules under `src/`
  (`config`, `rng`, `city`, `state`, `input`, `audio`, `entities`, `missions`,
  `render`, `hud`, `main` — one clear job each).
- `screenshots/` — 4 screenshots taken from the game running in headless Chromium.
- `main.ts` — the entry program: copies `game/` + `screenshots/` to `/output` and
  writes `dossier.json` with the vendored `vendor/makefun-game.ts`.
- `LICENSE` — MIT.

## Built with

Plain JavaScript + Canvas 2D. No engine, no libraries, no build step, no assets
downloaded from anywhere — every pixel and every sound is drawn or synthesized
in code.
