# CarPlay integration (Phase 3)

ReadCast uses the CarPlay **audio app** pattern: a list of your listen queue plus
a Now Playing screen, all driving the same player instance as the phone app.

This is iOS-only and requires a native build. It cannot run in Expo Go or the
web preview.

## What's here

- `ios/ReadCastCarPlay.swift` / `.m` — React Native bridge module. Receives the
  listen queue and now-playing info from JS and emits `carplay:selectArticle`
  when the user taps an item in the car.
- `ios/CarPlaySceneDelegate.swift` — the CarPlay scene. Builds a `CPListTemplate`
  from the shared queue and wires selection back to the bridge.

The JS side lives in `src/playback/carplay.ts` (native) and
`src/playback/carplay.web.ts` (no-op). `PlaybackProvider` already calls
`setQueue` / `setNowPlaying` and listens for `onSelectArticle`, so once the
native module is present everything is wired.

## Enabling it

1. Add the config plugin in `app.json`:
   ```json
   "plugins": ["expo-font", "expo-sqlite", "./plugins/withCarPlay"]
   ```
2. Prebuild the iOS project:
   ```bash
   npx expo prebuild -p ios
   ```
3. Add the files in `carplay/ios/` to the Xcode target (drag into the project).
4. Adopt the UIScene lifecycle and declare the CarPlay scene in `Info.plist`
   (`UIApplicationSceneManifest` with a `CPTemplateApplicationSceneSessionRoleApplication`
   role pointing at `CarPlaySceneDelegate`).
5. Expose the `RCTBridge` from `AppDelegate` so `CarPlaySceneDelegate` can reach
   the `ReadCastCarPlay` module instance (see the TODO in that file).
6. Build to a device/simulator with a provisioning profile that includes the
   `com.apple.developer.carplay-audio` entitlement.

## Verifying

- Run on the iOS Simulator, then open **Xcode > Open Developer Tool > Simulator**
  and enable the CarPlay external display (`I/O > External Displays > CarPlay`).
- Confirm the Listen Queue list appears, selecting an item starts playback in the
  phone app, and the Now Playing template reflects title/source.

The real audio playback (and lock-screen/CarPlay Now Playing controls) will come
from swapping the simulated engine in `src/playback/engine.ts` for a
`react-native-track-player` implementation behind the same `PlaybackEngine`
interface.
