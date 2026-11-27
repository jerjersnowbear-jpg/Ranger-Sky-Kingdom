# RANGER: The Lost Sky Kingdom v0.1.0

A playable, original family-friendly Skyhaven chapter. Six authored missions, 18 required compass relics, six gadgets/actions, a mini-map, unlockable missions and stars, checkpoints and a three-phase mechanical guardian. Your generated hero, Skyhaven environment and character sheet are used in the menus and journal. The controllable character is an original lightweight articulated model inspired by the reference, not a rigged photorealistic mesh.

## Run
Extract the archive and open `index.html` in a browser, or open the separate self-contained Ranger-Play.html preview. For reliable offline saves and installability, host the project on GitHub Pages (main, root). All runtime artwork and code are local; no external APIs, servers, accounts, ads or CDN dependencies. First successful HTTPS load caches the web files. Browser file-origin storage behavior varies. Android wrapper uses an intercepted local origin and does not require an Internet permission.

## Controls
- Mobile: left joystick; right buttons for Jump/Glide, Scent, Bark, Grapple, Pulse, Sprint. Drag open game space to orbit camera.
- Keyboard: WASD/arrows; Space jump, hold to glide; F scent, B bark, G grapple, E pulse, Shift sprint; Q/R rotate; Escape pause.
- All relics and mission objectives must be completed before entering the gold gate. Falling respawns at last checkpoint; damage removes hearts. Scent reveals bridge, bark activates pillars or rescues creatures, grapple crosses large gaps, pulse stuns scouts or exposes the guardian after a pillar activation.

## Android
Open `android/` in Android Studio or build with Java 17, Android SDK 35, and Gradle 8.9 (`gradle -p android :app:assembleDebug :app:bundleRelease`). GitHub Actions automates these steps and uploads a debug APK and unsigned release AAB. Release signing, physical device checks, and publishing remain outstanding. The wrapper is Java + WebView, not Godot or a native 3D engine; it intentionally shares the offline game with the browser edition.

## Tests
`node --check engine.js`, `node --check game.js`, `node --check sw.js`; `pip install playwright && python -m playwright install chromium && python tests/smoke.py`. The script uses local inlined HTML/art and exercises the real game in a browser. Current environment blocks local HTTP navigation and native WebGL. Canvas compatibility rendering, six mission render paths, 10 objective/logic checks and seven normal movement checks passed. Real WebGL shader compilation, GPU performance, all complete missions through normal input, PWA caching, Android compilation and device testing are outstanding.

## Scope and assets
This is the first playable chapter, not the full eight-world/80-mission campaign, and does not include Cardboard mode, native Godot, photorealistic gameplay assets, airships or advanced skill trees. Original character and background artwork generated for this conversation; no third-party character assets. Game graphics are procedural and intentionally stylized. Sound is generated using Web Audio.
