# Solmaris Heat — gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Vins1206/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Vins1206/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmaris Heat** is an original open-world crime game for make.fun's "Make GTA 6" bounty ($1,666, top 100 share). Everything is invented for this entry — the sun-soaked coastal city of **Solmaris**, courier **Mara Vela**, fixer **Lina Corvo**, mechanic **Bruno Serra**, the Policia Solmaris, every vehicle, shop and street name. Nothing comes from any commercial game.

## The game

A complete top-down open world in one static page — no build step, no network requests, every file under `game/`.

- **A living city** — 3,840 × 2,560 px of avenues, pastel rooftops, shops with names, parks, palms, street lamps, a beach and animated sea, across ten named districts from Coral Row to Pier Nueve.
- **On foot and by car** — walk, run, steal any of six car models (Coral Coupe, Palmera Sedan, Dune Buggy, Cargo Van, Sol Taxi, Reef Pickup), each with its own speed, acceleration and grip; handbrake drifts included.
- **Traffic & pedestrians** — lane-following traffic that brakes for you, turns at intersections and includes taxis; pedestrians stroll, chat-wait and flee from gunfire and speeding cars.
- **Wanted level & police** — a five-star heat system. Police cruisers hunt you, officers pour out on foot and grab you; heat cools only when nobody sees you. Get caught and you are **BUSTED**; get hurt and you wake up **WASTED** at Hospital del Mar.
- **A six-chapter story** — Coffee at Coral Row, The Harbor Run, Three Lost Crates, Shake the Heat, The Sunset Delivery, and One More Sunset, with dialog, timers, beacons and cash rewards.
- **Combat** — mouse-aimed punches and shooting with tracers and sparks; crimes raise your heat in front of witnesses.
- **Police roadblocks** — at four wanted stars the Policia parks cruisers across the road ahead of you.
- **Checkpoint Rush** — a timed street race through eight glowing gates (press R at the checkered flag on Sunset Strip); every gate adds time, winning pays $600 and your best time is saved.
- **Hidden film reels** — 20 golden collectibles scattered over Solmaris, tracked in the HUD, with a $500 bonus for the full set.
- **Side money** — taxi fares from waving pedestrians and golden street crates scattered over the city.
- **A dressed coast** — marina boats bobbing in the bay, beach umbrellas, sunlit window strips and a warm sunset grade over the whole city.
- **HUD & minimap** — health, cash, reputation, speedometer, wanted stars with a heat-cooling readout, mission banner with timer, objective arrow with distance, and a live minimap showing missions and flashing police.
- **Start screen, pause, and save** — progress, cash and reputation auto-save to the browser and can be continued.
- **Sound** — a tiny WebAudio synth: engine hum that follows your speed, sirens, shots, crashes, pickups and mission stingers. No audio files.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Shift | Run |
| E | Enter, steal or exit a car |
| Space | Handbrake |
| Mouse + click / F | Aim, punch and shoot |
| P | Pause |
| M | Mute |
| Enter / C | Start / continue on the title screen |

## Play locally

```sh
node serve.ts          # serves game/ at http://localhost:8080
```

Or serve the `game/` folder with any static file server and open `index.html` in desktop Chrome. The game runs fully offline.

## Hand-in program

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the unmodified vendored `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Source layout

- `game/src/city.js` — seeded city generation, roads, collisions, sea & beach
- `game/src/entities.js` — traffic, parked cars, pedestrians, police & officers
- `game/src/missions.js` — the six-chapter story, dialog and objectives
- `game/src/activities.js` — Checkpoint Rush race gates and the 20 hidden film reels
- `game/src/game.js` — player, driving, combat, wanted system, roadblocks, taxi fares, saving
- `game/src/render.js` — world, building, car and people rendering
- `game/src/hud.js` — HUD, minimap, menus and dialog boxes
- `game/src/audio.js` — synthesized sound effects and engine
- `game/src/input.js`, `game/src/config.js`, `game/src/main.js` — input, tuning, bootstrap & screenshot scenes

Screenshots in `screenshots/` are real renders of this game's own code, taken headlessly from `?shot=` scenes that drive the live systems.

License: MIT (see `LICENSE`).
