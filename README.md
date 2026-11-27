# RANGER: The Lost Sky Kingdom v0.2.0

A playable, original family-friendly Skyhaven chapter: six authored missions, 18 compass relics, six gadgets and actions, a mini-map, unlockable missions and stars, checkpoints and a three-phase mechanical guardian.

## What is new in 0.2.0: the real look
Version 0.1.0 drew everything with flat-coloured boxes and spheres. 0.2.0 replaces the graphics with a full 3D renderer built to match the Skyhaven concept art and the Ranger character sheet. The missions, controls, saves and difficulty are unchanged.

- **Renderer:** Three.js r187 (MIT licence), bundled in `vendor/three.min.js`, so the game still works offline and inside the Android app. Filmic tone mapping, warm sun from the upper left with soft shadows, sky dome with sun glow, distance haze, image-based ambient light and sun shafts.
- **Skyhaven world:** floating islands with layered sandstone cliffs, warm flagstone plazas with a gold compass-rose inlay, ruined arches with red compass banners and cyan rune panels, lanterns, rope fences, chests and barrels, grass, lupines and daisies that move in the wind, hanging vines, trees, waterfalls, a sea of clouds, cumulus clouds, distant snowy mountains and the Skyheart temple with its golden ring.
- **Ranger:** a jointed 3D model following the character sheet (orange-brown fur with white blaze and muzzle, spiky crest, aviator goggles, red bandana, cropped mustard jacket over a cream shirt, cross-body satchel with glowing compass, cargo pants with mustard stripes, fingerless gloves, mission bracelet, explorer pack, bushy tail, trail boots). Animated idle, run, sprint, jump, fall, glide (with a fold-out glider), grapple, bark, scent and pulse.
- **Mission objects:** gold relic fragments with blue cores, resonance beacons with spinning brass orreries, grapple anchors, the spectral bridge revealed by scent, sky-fox kits to rescue, corrupted scouts, a stone-and-bronze Skyheart Guardian, the golden gate and its portal, plus sparkles, rings, paw-print scent trails and a grapple beam.
- **Camera:** lower and closer, looking out over the islands.
- **Graphics setting** (menu): Battery saver (no shadows, lower resolution, less grass), Balanced (default) and High (sharper shadows, full resolution). The choice is remembered.
- **Compatibility view:** devices without WebGL 2 get a top-down map view of the same missions instead of a blank screen.

## Run
Extract the archive and serve the folder over HTTP (for example GitHub Pages, main branch, root) and open `index.html`. Opening the file directly from disk also works in most browsers. All code and artwork is local: no external APIs, servers, accounts, ads or CDNs. The first HTTPS load caches the files for offline play. The Android wrapper serves the same files from an internal origin and needs no Internet permission.

## Controls
- Mobile: left joystick; right buttons for Jump/Glide, Scent, Bark, Grapple, Pulse, Sprint. Drag open game space to turn the camera.
- Keyboard: WASD or arrows; Space jump, hold to glide; F scent, B bark, G grapple, E pulse, Shift sprint; Q/R turn camera; Escape pause.
- All relics and mission objectives must be completed before entering the golden gate. Falling returns Ranger to the last checkpoint; damage removes hearts.

## Using a sculpted Ranger model
The built-in Ranger is generated in code. To use a hand-made or generated 3D model instead:
1. Export it as glTF binary (`.glb`), standing on the ground, facing +Z, with animation clips whose names contain `idle`, `run` (or `walk`), `jump`, `fall` and `glide`.
2. Save it as `assets/ranger.glb`.
3. Add `<meta name="ranger-model" content="assets/ranger.glb">` inside `<head>` in `index.html`.
The game scales it to Ranger's height and plays the clips; if the file is missing or fails to load, the built-in model is used.

## Files
- `index.html` page, menus and HUD. `game.js` missions, rules, input, saves and camera.
- `engine.js` renderer, lighting, sky and the procedural textures. `world.js` islands, landmarks, vegetation, mission objects and effects. `ranger.js` the hero model and its animation.
- `vendor/three.min.js` and `vendor/THREE-LICENSE.txt`. `assets/` concept art used in the menus and journal, and app icons.

## Android
Open `android/` in Android Studio or build with Java 17, Android SDK 35 and Gradle 8.9 (`gradle -p android :app:assembleDebug :app:bundleRelease`). GitHub Actions automates this and uploads a debug APK and an unsigned release AAB. Version code 2, version name 0.2.0. Release signing, device testing and publishing remain outstanding.

## Tests
`node --check` on each script, then `pip install playwright && python -m playwright install chromium && python tests/smoke.py`. The smoke test serves the game over local HTTP and runs it in headless Chromium twice: with WebGL 2 (software GPU) it checks the 3D renderer, all six missions, the gameplay logic and normal movement, and saves `tests/menu-preview.png` and `tests/gameplay-preview.png`; with WebGL switched off it checks the compatibility view. See `tests/latest-results.txt`.

## Scope
This is the first playable chapter, not the full campaign. Frame rate on real phones has not been measured yet; if a phone runs hot or slow, use Battery saver. Original character and background artwork generated for this project; no third-party character assets. Sound is generated with Web Audio.
