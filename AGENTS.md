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
  `SettingsProvider`, `LibraryProvider`, `AudioProcessingProvider`,
  `PlaybackProvider`, and a themed `NavigationContainer`.
- **Screens:** `src/screens/` — `LibraryScreen`, `AddUrlScreen`, `ReaderScreen`,
  `ListenScreen`, `SettingsScreen`.
- **State:** `src/state/LibraryProvider.tsx` (saved articles),
  `src/state/AudioProcessingProvider.tsx` (the audio pipeline: starts a backend
  job for each ready article, polls status, exposes per-article status +
  `retry`; playback funnels through its `ensure` so work is shared),
  `src/playback/PlaybackProvider.tsx` (listen queue + transport), and
  `src/state/SettingsProvider.tsx` (playback speed + custom voice prompt,
  persisted via AsyncStorage). Default playback speed is 1.25×.
- **Storage seam:** `src/db/` — `ArticleStore` interface with a SQLite impl
  (`index.native.ts` -> `sqliteStore.ts`) for devices and an AsyncStorage impl
  (`index.ts` -> `asyncStore.ts`) for web/tests. Split by platform so
  `expo-sqlite` never enters the web bundle. The device store mirrors the
  backend audio job (status + segment URLs) and, after download, the local file
  URIs — it is a per-device cache, not the source of truth.
- **Services:** `src/services/` — `ingest` (pending -> ready/failed),
  `audio` (starts + polls backend audio jobs, in-flight de-dup, retry),
  `download` (native, `expo-file-system`) / `download.web` (no-op) downloads
  ready segments to a device cache for offline playback, plus `textChunk`,
  `format`, `url`, `readerHtml`.
- **Playback seam:** `src/playback/` — `PlaybackEngine` interface. `engine.ts`
  (native) returns the simulated `stubEngine.ts` today; the native engine
  (react-native-track-player) drops in here without UI changes. `engine.web.ts`
  is a real web engine that plays the episode's audio segments through an
  `HTMLAudioElement` (sequential playback, `setRate` via `playbackRate`), so the
  browser can actually play TTS audio when `EXPO_PUBLIC_STUB_MODE=false`.
- **CarPlay seam:** `src/playback/carplay.ts` (native) / `carplay.web.ts`
  (no-op), wired into `PlaybackProvider`. Native sources + config plugin live in
  `carplay/` and `plugins/withCarPlay.js`. See `carplay/README.md`.
- **Reader:** `ReaderContent.tsx` (WebView, native) vs `ReaderContent.web.tsx`
  (text, web) — Metro picks the right one per platform.
- **Backend:** `backend/` — Hono API, now stateful so audio is processed and
  stored once per unique content.
  - **DB:** built-in `node:sqlite` (`DatabaseSync`) at `backend/.data/readcast.db`
    (gitignored). The experimental API is isolated to `backend/src/db.ts`; the
    `dev`/`start`/`test` scripts pass `--disable-warning=ExperimentalWarning`.
    Tables: `jobs` (status/progress/voice/instructions/chunks) and `segments`
    (per-chunk duration + format, keyed by `content_hash`).
  - **Audio storage:** content-addressed files at
    `backend/.data/audio/<content_hash>/<idx>.<ext>` (`audioStorage.ts`).
  - **Process-once:** `content_hash = sha256(providerId, voice, instructions,
    chunks)` (`hash.ts`). A hash that already has segments is served `ready` with
    zero TTS calls — reused across articles, devices, and reinstalls.
  - **Worker:** `worker.ts` — single-concurrency, non-blocking; synthesizes
    missing chunks, advances progress, reuses existing chunks (cross-article +
    retry), and requeues interrupted jobs on startup.
  - **TTS providers:** `tts/` expose `synthesizeChunk` returning raw bytes + a
    provider `id`; mock (key-free, hermetic silent WAV) by default, OpenAI MP3
    when keys are set. `voice`/`instructions` are per-request.
  - **Routes:** `POST /articles/ingest` (Readability extraction),
    `POST /articles/:id/audio` (start/return job, idempotent, non-blocking),
    `GET /articles/:id/audio` (status poll), `POST /articles/:id/audio/retry`,
    and `GET /audio/<hash>/<idx>.<ext>` (static serving, immutable caching).
  - **Config:** `backend/.env` (via `dotenv`, gitignored; see `.env.example`):
    provider/keys, default model `gpt-4o-mini-tts`, default voice `cedar`, and
    `DATA_DIR`/`DB_PATH`/`AUDIO_DIR`.

`DEV_STUB_MODE` (`src/config.ts`) defaults on in development and lets the whole
ingest -> read -> listen loop run with no backend or keys (the app's audio
service uses a local stub path instead of starting/polling backend jobs).

## Verification

Layered by fidelity. Run the cheap layers on every change.

### Tier 1 — static + unit (always)

```bash
npx tsc --noEmit        # app typecheck (includes tests via @types/jest)
npm test                # jest: utils, services, store, playback (46 tests)

cd backend
npm run typecheck
npm test                # vitest: extraction + routes + audio pipeline (17 tests)
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
`queue-button-<id>`, `audio-status-<id>`, `retry-audio-button-<id>`,
`ctrl-toggle`, `seek-track`, `clear-library`. In stub mode the pipeline still
runs (sample audio), so `audio-status-<id>` shows "Preparing audio…" briefly
before `listen-button-<id>` appears.

To force a web compile from the shell without a browser:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8090/index.bundle?platform=web&dev=true&hot=false"
```

What web covers: navigation, forms/validation, library, reader layout, player UI
+ queue, simulated playback progress. What it does NOT cover: real native audio,
lock screen, CarPlay, Share Extension, on-device SQLite.

To actually hear TTS audio in the browser (real OpenAI synthesis through the web
engine), run the backend (`cd backend && npm run dev`, with `backend/.env`) and
start web with stub mode off:

```bash
EXPO_PUBLIC_STUB_MODE=false npx expo start --web --port 8090
```

In dev, `engine.web.ts` exposes the live element on `globalThis.__readcastAudio`,
so the verification loop can assert real playback (e.g. via CDP: `currentTime`
advancing, or decode `src` with `AudioContext.decodeAudioData` to check the
waveform is non-silent).

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
- **Keep docs current:** update `AGENTS.md` and `architecture.html` in the same
  commit when product goals, architecture, API boundaries, or verification steps
  change.
```
