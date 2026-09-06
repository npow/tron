# TRON / Worlds

A single-player lightcycle game set in four environments generated with World Labs Marble. Every bike leaves a solid ribbon of light. Touch a ribbon, including your own, and you're out. Steer to trap rivals, boost through closing shutters, and jump broken bridges.

Track: Gaming & Interactive Worlds

https://github.com/user-attachments/assets/a59efd03-ae12-4019-bc70-b81906d23dbe

[Download the demo](docs/demo.mp4) · 1:23 · 1080p · 30 fps · sound included

## Play

Requires Node.js 22+ and a browser with WebGL 2 hardware acceleration. World assets are included; no generation API key is needed to play.

```sh
npm ci
npm run dev
```

Open [localhost:4173](http://localhost:4173) and click **Start mission**. Choose a mission with the world tabs or keys 1–4. On touch devices, use the on-screen driving controls.

Tailnet access: [odin.tail17f7a4.ts.net:4173](http://odin.tail17f7a4.ts.net:4173/) for members of the tailnet.

| Input | Action |
| --- | --- |
| A / D or ← / → | Steer |
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| Shift | Boost; consumes energy |
| Space | Jump on ice; drift in the other worlds |
| R | Restart the mission |
| P | Pause or resume |
| 1–4 | Select a world |
| Escape | Watch the gameplay demo |

## Missions

| World | Challenge |
| --- | --- |
| Meridian city | Reach five checkpoints through service-street turns before pursuit catches up. |
| Solar wasteland | Slalom around rock outcrops and save boost for two closing blast shutters. |
| Cryo pass | Jump two missing bridge spans; the second gap requires boost. |
| The core | Survive 45 seconds or eliminate all three AI rivals with your trail. |

Choose a world, escape or survive, then try to beat your score. Ribbons form solid walls behind each bike, so every turn changes the routes available to you and your rivals. Airborne riders can clear walls.

## Technology

| Technology | Role |
| --- | --- |
| World Labs / Marble 1.1 | Generates the four 3D environments and 4608×2304 panoramas. |
| Convex | Stores completed runs and pushes live leaderboard updates to connected players. |
| Three.js + Spark | Renders bikes, courses, and generated Gaussian splats in the browser. |
| Local game simulation | Runs controls, hazards, jumps, AI riders, and ribbon collisions at 120 Hz. |

The courses use authored roads, bridges, shutters, and collision geometry. Marble splats surround the courses, while panoramas provide distant scenery and material reflections. Live play uses 500k SPZ files; video capture uses full-resolution splats. Asset sources are recorded in [public/worlds/manifest.json](public/worlds/manifest.json).

Convex provides the database, server functions, and subscriptions for shared scores. The leaderboard accepts client-reported results with basic validation. Gameplay runs locally and works without the backend.

To enable shared scores, run this in another terminal:

```sh
npm run backend
```

This starts a local Convex deployment on port 3210 without a hosted account. Vite proxies HTTP and WebSocket requests through `/backend`, including over tailnet. Local data is stored in ignored `.convex/`.

## Development

Build and run the simulation tests:

```sh
npm run build
npm test
```

For browser checks, start `npm run preview -- --port 4174`, then run `npm run verify` in another terminal. The checks cover controls, crashes, retries, touch input, video recording, and camera seeking. Set `TRON_URL` to use another server and `CHROME_PATH` to select an installed browser. `TRON_ANGLE=gl-egl` selects EGL on Linux.

With the Convex backend running, `node scripts/check-shared-runs.mjs` checks that a saved result reaches a second connected client.

### World generation

Set `WORLD_LABS_API_KEY` in the environment or ignored `.env.local`, install Python Requests, and run:

```sh
python scripts/generate-worlds.py
```

The script resumes the operations recorded in `public/worlds/` and downloads their assets.

### Demo capture

The demo combines recorded keyboard and button input, choreographed gameplay sequences, and slides explaining the rules and technology.

With the app running on port 4173 and FFmpeg installed:

```sh
npx playwright install chromium ffmpeg
npm run capture
npm run record-play
npm run present
python scripts/check-video.py
```

The export is saved to `artifacts/tron-worlds-demo.mp4`. Slide source is in [public/slides.html](public/slides.html). Capture accepts `--width`, `--height`, `--fps`, `--start`, `--seconds`, and `--output`; `npm run capture -- --vulkan` selects Vulkan rendering. The in-app **Record demo** button exports the 44-second gameplay sequence as MP4 or WebM, depending on browser support.

Fonts and their licenses are in `public/fonts/`. The electronic score is synthesized locally without third-party samples.
