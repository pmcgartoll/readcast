# ReadCast — agent context

## Product

ReadCast is a personal read-later + listen app. Save a link, read it offline,
and listen to it as a podcast-style queue. Playback is built to extend to the
lock screen and **CarPlay** (iOS).

- **Platforms:** iOS + Android via Expo dev client. Web is for local preview and
  agent verification only (not a shipping target). CarPlay is iOS-only.
- **Privacy/keys:** no TTS keys are needed for development — `DEV_STUB_MODE`
  serves fixture articles and a sample audio clip.

## Architecture

- **Stack:** Expo SDK 56, React Native 0.85, TypeScript, React Navigation
  (stack + bottom tabs).
- **Entry:** `App.tsx` loads fonts, wraps the app in `SafeAreaProvider`,
  `LibraryProvider`, `PlaybackProvider`, and a themed `NavigationContainer`.
- **Screens:** `src/screens/` — `LibraryScreen`, `AddUrlScreen`, `ReaderScreen`,
  `ListenScreen`, `SettingsScreen`.
- **State:** `src/state/LibraryProvider.tsx` (saved articles),
  `src/playback/PlaybackProvider.tsx` (listen queue + transport), and
  `src/state/SettingsProvider.tsx` (playback speed + custom voice prompt,
  persisted via AsyncStorage). Default playback speed is 1.25×.
- **Storage seam:** `src/db/` — `ArticleStore` interface with a SQLite impl
  (`index.native.ts` -> `sqliteStore.ts`) for devices and an AsyncStorage impl
  (`index.ts` -> `asyncStore.ts`) for web/tests. Split by platform so
  `expo-sqlite` never enters the web bundle.
- **Services:** `src/services/` — `ingest` (pending -> ready/failed),
  `audio` (chunked TTS jobs), plus `textChunk`, `format`, `url`, `readerHtml`.
- **Playback seam:** `src/playback/` — `PlaybackEngine` interface with a
  simulated engine (`stubEngine.ts`) for web/dev. The native engine
  (react-native-track-player) drops in via `engine.ts` without UI changes.
- **CarPlay seam:** `src/playback/carplay.ts` (native) / `carplay.web.ts`
  (no-op), wired into `PlaybackProvider`. Native sources + config plugin live in
  `carplay/` and `plugins/withCarPlay.js`. See `carplay/README.md`.
- **Reader:** `ReaderContent.tsx` (WebView, native) vs `ReaderContent.web.tsx`
  (text, web) — Metro picks the right one per platform.
- **Backend:** `backend/` — Hono API. `POST /articles/ingest` (Readability
  extraction) and `POST /articles/:id/audio` (pluggable TTS provider; mock by
  default, OpenAI when keys are set). The audio route accepts optional `voice`
  and `instructions` (custom voice prompt) per request. Config is read from
  `backend/.env` (via `dotenv`, gitignored; see `.env.example`): default
  provider OpenAI `gpt-4o-mini-tts`, default voice `cedar`.

`DEV_STUB_MODE` (`src/config.ts`) defaults on in development and lets the whole
ingest -> read -> listen loop run with no backend or keys.

## Verification

Layered by fidelity. Run the cheap layers on every change.

### Tier 1 — static + unit (always)

```bash
npx tsc --noEmit        # app typecheck (includes tests via @types/jest)
npm test                # jest: utils, services, store, playback (39 tests)

cd backend
npm run typecheck
npm test                # vitest: extraction + routes (9 tests)
```

### Tier 2 — agent web loop (UI)

```bash
# backend (optional; stub mode does not require it)
cd backend && npm run dev

# app on a dedicated port (8081 may be taken by other Expo apps)
npx expo start --web --port 8090
```

Then drive the page with the `cursor-ide-browser` tools (or the `browser-use`
subagent): `browser_navigate` to `http://localhost:8090`, `browser_snapshot`,
then click/fill. Stable testIDs exist on key controls: `open-add-url`,
`add-url-input`, `save-button`, `article-row-<id>`, `listen-button-<id>`,
`queue-button-<id>`, `ctrl-toggle`, `seek-track`, `clear-library`.

To force a web compile from the shell without a browser:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8090/index.bundle?platform=web&dev=true&hot=false"
```

What web covers: navigation, forms/validation, library, reader layout, player UI
+ queue, simulated playback progress. What it does NOT cover: real native audio,
lock screen, CarPlay, Share Extension, on-device SQLite.

### Tier 3 — native e2e (later)

Maestro flows on the iOS Simulator for storage/audio/reader behavior the web
build can't represent. Add under `e2e/*.yaml` as Phase 2 lands.

### Tier 4 — CarPlay (manual, Phase 3)

Build to the iOS Simulator and enable the CarPlay external display in Simulator
(`I/O > External Displays > CarPlay`). See `carplay/README.md`.

## Conventions

- Keep platform branches behind the existing seams (store, engine, carplay,
  reader). Don't import `expo-sqlite`, `react-native-webview`, or native modules
  into shared code paths that run on web.
- New native/Expo deps: `npx expo install <pkg>`.
- Use theme tokens (`src/theme.ts`) and the shared components.
- Read versioned Expo docs before changing Expo APIs:
  https://docs.expo.dev/versions/v56.0.0/
- **Do not commit:** local review screenshots or `.env` files.
- **Keep this doc current:** update `AGENTS.md` in the same commit when product
  goals, architecture, or verification steps change.
```
