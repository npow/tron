# TRON / Worlds

Four playable lightcycle missions across generated city, canyon, glacier, and reactor environments. Steer freely, boost through hazards, jump broken bridges, and cut off rivals with lethal light walls.

**Track: Gaming & Interactive Worlds**

https://github.com/user-attachments/assets/a59efd03-ae12-4019-bc70-b81906d23dbe

**[Download the 83-second demo](docs/demo.mp4)** · 1920×1080 · 30 fps · sound included

The video opens with playable interaction, explains lightcycles and lethal ribbons with a collision diagram, then introduces the problem and interaction loop. It ends with the roles of World Labs Marble and Convex. The edit has no repeated laps; the opener records real UI and keyboard input.

## Play

Requires Node.js 22+ and a browser with WebGL 2 hardware acceleration.

```sh
npm ci
npm run dev
```

Open **http://localhost:4173**, then click **Start mission**. The app opens in the playable arena. Choose a different mission with the world tabs or keys **1–4**.

The current tailnet instance is **http://odin.tail17f7a4.ts.net:4173/**. Access requires membership of that tailnet. The server binds to `0.0.0.0`; `vite.config.ts` contains its allowed DNS name.

| Input | Action |
| --- | --- |
| A / D or ← / → | Steer freely |
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| Shift | Boost; consumes energy |
| Space | Jump on ice; drift in the other worlds |
| R | Restart the mission |
| P | Pause or resume |
| 1–4 | Select a world |
| Escape | Open the optional gameplay film |

Movement continues after launching. Touch devices display steering, throttle, brake, boost, and jump/drift buttons. The game has real win/loss states and retries; it is not controlled by the film timeline.

## Four missions

| World | Challenge |
| --- | --- |
| Meridian city | Reach five checkpoints through service-street turns before pursuit catches up. |
| Solar wasteland | Slalom around rock outcrops and save boost for two closing blast shutters. |
| Cryo pass | Jump two missing bridge spans; the second gap requires boost. |
| The core | Survive 45 seconds or eliminate all three AI rivals with your trail. |

A lightcycle is a futuristic motorcycle. Every bike leaves a solid ribbon of light. Touching a ribbon, including your own, eliminates you; turns can trap other riders behind your wall.

**Interaction loop:** choose a world → ride and react → escape or survive → score and retry.

Movement runs at 120 Hz. Swept collision checks include the front of the bike and the wall’s height, so boosting cannot tunnel through a ribbon. Airborne riders can clear walls. Trail contact eliminates a rider; eliminated opponents stay dead. Solid ribbons and an offset chase camera keep trails visible even while riding straight.

## Technology roles

| Technology | Role |
| --- | --- |
| **World Labs / Marble 1.1** | Generates the four 3D surroundings and native 4608×2304 panoramas. |
| **Convex** | Persists completed runs and sends live leaderboard updates to connected players. |
| **Three.js + Spark** | Renders the bikes, courses, and generated Gaussian splats in the browser. |
| **Local game simulation** | Handles controls, hazards, jumps, AI riders, and lethal trail collisions. |

Convex is optional. A conventional database and API could serve these scores; Convex supplies the database, functions, and live subscriptions together. Gameplay continues independently of it. Scores are casual client-reported results with basic validation, rather than an anti-cheat or networked multiplayer system.

To enable shared scores, run this in another terminal:

```sh
npm run backend
```

This starts an anonymous local Convex deployment on port 3210. Vite proxies HTTP and WebSocket requests through `/backend`, including over tailnet. Local backend data stays in ignored `.convex/`; no hosted Convex account is required. A hosted deployment needs its own endpoint/proxy configuration.

## Generated worlds

The generated assets are included, so running the game needs no generation API key. Live play uses 500k SPZ files; offline movie capture uses full-resolution splats. `public/worlds/manifest.json` records source world URLs and local artifacts.

The authored roads, bridges, shutters, and collisions form the playable courses. Generated splats render as surrounding environments using a separate camera with small parallax; riders do not traverse Marble’s downloaded collider mesh. Native panoramas also provide distant sky and material reflections.

To regenerate worlds, set `WORLD_LABS_API_KEY` in the environment or ignored `.env.local` and run `python scripts/generate-worlds.py` with Python Requests installed. The script resumes recorded operations instead of submitting duplicate generations. Existing operation records and world metadata are included.

## Reproduce the video

The checked-in presentation is [docs/demo.mp4](docs/demo.mp4). Its sequence is:

| Time | Content |
| --- | --- |
| 00:00–00:08 | Real Start, steering, boost, and restart interaction |
| 00:08–00:20 | What lightcycles are and why ribbons are lethal |
| 00:20–00:30 | Four-world introduction and city gameplay |
| 00:30–00:41 | Problem, event track, and interaction loop |
| 00:41–01:12 | Canyon shutters, both ice jumps, and arena interceptions |
| 01:12–01:23 | World Labs Marble and Convex roles |

The app’s **Watch demo · 44s** shows the uninterrupted gameplay cut. The presentation opens with an actual UI and keyboard recording, adds explanatory slides and trims three seconds of travel between the ice jumps. Film trajectories and cameras are choreographed; arena eliminations use the same wall collision routine as the playable game. The cinematic highlights are not a recording of human input; the opener uses automated keyboard and button interaction with the live game.

Leave the app running and use a second terminal. FFmpeg is required.

```sh
npx playwright install chromium ffmpeg
npm run capture
npm run record-play
npm run present
python scripts/check-video.py
```

Capture produces `artifacts/tron-worlds-gameplay.mp4`; presentation assembly produces `artifacts/tron-worlds-demo.mp4`. Copy the reviewed presentation to `docs/demo.mp4` to update the committed video. The slide source is `public/slides.html`.

Use `CHROME_PATH=/path/to/chrome` to choose an installed browser. On the tested Linux NVIDIA setup, `npm run capture -- --vulkan` uses accelerated rendering. `--width`, `--height`, `--fps`, `--start`, `--seconds`, and `--output` support review exports. The in-app **Record demo** button downloads a real-time MP4 or WebM, depending on browser support.

## Verification

```sh
npm run build
npm test
npm run preview -- --port 4174
# In another terminal:
npm run verify
node scripts/check-shared-runs.mjs
python scripts/check-video.py
```

Set `TRON_URL` to change the browser-check URL and `TRON_ANGLE=gl-egl` for the tested Linux EGL path. Tests cover steering, swept ribbon contact, airborne clearance, persistent deaths, boost, bridge gaps, shutters, checkpoint wins, collision-derived film outcomes, and a timeline that only moves forward. Browser checks exercise actual input, crashes, retries, touch controls, recording, and deterministic seeking. Video verification checks the full decode, 2,490 frames, codecs, black intervals, and unintended freezes outside the three slides.

The earlier San Francisco prototype remains in `components/`, `game/`, `data/`, and `types.ts` for reference. The standalone application imports `showcase/` and `TronApp.tsx` and has no dependency on the former parent project.

Fonts are bundled with their licenses in `public/fonts/`. The electronic score is synthesized locally and uses no third-party samples.
