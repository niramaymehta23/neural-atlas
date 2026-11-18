# Neural Atlas — Architecture and Code Conventions

Shared facts every split spec links to. Source: [requirements.md](requirements.md).
The repository root (`neural-atlas/`) is the app.

## Directory layout

```text
neural-atlas/
├── docs/                         requirements, this file, split specs (NN-name/spec.md)
├── public/
│   ├── models/                   self-hosted pretrained weights, lazy-loaded per module
│   └── _headers                  COOP/COEP headers (SharedArrayBuffer) for static hosting
├── e2e/                          Playwright: platform flows + one smoke spec per world
├── scripts/                      build, serve and check scripts (copy-runtime, check-build, check-model, serve-static)
└── src/
    ├── app/                      Next.js routes only; thin pages that compose layers below
    │   ├── layout.tsx            fonts, theme, global providers, command palette
    │   ├── page.tsx              constellation home
    │   ├── learn/[moduleId]/     module page (static params from the catalog)
    │   ├── styleguide/
    │   └── sandbox/ puzzle/ journeys/[id]/ museum/ theatre/
    ├── design/                   tokens.css (ivory default + charcoal night), fonts.ts (Fraunces, Inter),
    │                             motion.ts (settling springs), encodings.ts (value → thickness / warmth /
    │                             speed), copy.ts (plain-number formatting: "98 out of 100 right")
    ├── ui/                       DOM primitives: PaperCard, Dial, Slider, Toggle, SegmentedControl,
    │                             HoverNote, StoryCaption, TermTag, MissionCard, UnderTheHoodDrawer,
    │                             CommandPalette, CompareSplit, TimelineScrubber
    │   └── illustrations/        cut-paper shapes and recurring characters (robot learner, dog)
    ├── visuals/                  2D kit (SVG/Canvas, the default): NetworkView, NeuronDot, Edge,
    │                             FlowParticles, Board (grid worlds), Chart
    ├── scene3d/                  R3F, only where depth is the idea: LossLandscape, IdeaSpace
    │                             (latent / word maps), CameraRig. Soft light, no bloom or glow
    ├── engine/                   pure TypeScript — no React, no DOM; runs in workers
    │   ├── autodiff/             Value, Neuron, Layer, MLP, losses, optimisers
    │   ├── model/                ModelEngine (main thread), worker.ts (its one training worker), protocol.ts,
    │   │                         backends/{autodiff,tfjs}.ts
    │   ├── timeline/             ring-buffer Timeline, ghost runs
    │   ├── ml/                   classic algorithms (World 2)
    │   ├── rl/                   environments + agents (gridworld first, World 6 the rest)
    │   ├── pretrained/           Transformers.js / ONNX loaders and cache
    │   └── random.ts             seeded RNG (determinism for snapshots, puzzles, replays)
    ├── data/                     datasets, PaintCanvas, DecisionField (2D boundary renderer)
    ├── platform/                 contract.ts (defineModule + types), ModuleShell, missions/,
    │                             predictions/, progress/, snapshot/, companion/, puzzle/
    ├── catalog/                  world-1.ts … world-6.ts: the ONLY source of module metadata
    │                             (id, everyday title, real term, world,
    │                             prerequisites, everyday idea) + lazy loader; index.ts
    ├── constellation/            home scene, galaxy layout, camera flights
    ├── features/                 feature-library components used by ≥2 modules, grouped by
    │                             library section: building/ inside/ generative/ language/ rl/ classic/
    ├── modules/
    │   └── w1-foundations/ w2-classic-ml/ w3-neural-networks/ w4-deep-architectures/
    │       w5-transformers/ w6-reinforcement/
    │       └── <module-id>/      index.ts (defineModule) · scene.tsx · controls.tsx · captions.ts
    │                             · missions.ts · predictions.ts · model.ts (only if it trains)
    └── experiences/              journeys, museum, theatre, two-player, sound
```

## Dependency direction

Imports flow one way; ESLint (`eslint-plugin-boundaries`) fails the build on a violation.

| Layer | May import |
|---|---|
| `engine`, `design` | nothing in `src` |
| `ui` | design |
| `visuals`, `scene3d` | design, engine (types only) |
| `data` | design, ui, engine |
| `platform` | design, ui, visuals, scene3d, data, engine |
| `features` | platform and everything below it |
| `modules/*` | features and everything below; **never another module** |
| `catalog` | platform types; modules via dynamic `import()` only |
| `constellation`, `experiences` | catalog, features and below |
| `app` | anything (thin composition only) |

## Conventions

- **TypeScript strict**, `noUncheckedIndexedAccess`, no `any`, no non-null `!` outside tests.
- **Named exports only**; default exports only where Next.js requires them. No barrel files except
  `modules/<world>/<module>/index.ts` (the contract entry) and `catalog/index.ts`.
- **One owner per fact.** Colours, spacing and radii live only in `design/tokens.css`; springs only in
  `design/motion.ts`; every value-to-visual mapping only in `design/encodings.ts`; module metadata
  only in `catalog/`. No hex literals or easing curves elsewhere (lint rule).
- **A helper earns its place.** Code used by one module stays in that module folder. It moves to
  `features/` (or lower) when a second module needs it, in the same change. No speculative abstractions.
- **Engine is pure.** Anything that trains or simulates lives in `engine/`, is deterministic given a
  seed, and runs in the single worker via a typed discriminated-union protocol.
- **State.** One Zustand store per module, created by the platform's `createModuleStore`, whose state
  is plain serialisable data (that shape *is* the snapshot format). Derived values are computed, not stored.
- **Files** are kebab-case except React components (PascalCase). One component per file. Files over
  ~300 lines are a smell to split by responsibility, not by line count.
- **Tests** are colocated (`*.test.ts`, Vitest). Engine maths is tested against numerical references;
  UI is tested through behaviour, not structure. Each world has a Playwright smoke spec.
- **Plain language is reviewed, not hoped for.** Every learner-facing string lives in a module's
  `captions.ts`, `missions.ts`, `predictions.ts` or the catalog, so it is all in a few files that are easy to
  review. No jargon in
  titles, buttons or missions; numbers reach the screen only through `design/copy.ts`.
- **2D by default.** `scene3d/` is imported only by the home map, the downhill landscape and idea-space
  flights; everything else draws with `visuals/`.
- **Accessibility and motion are built in**, not retrofitted: every control is a Radix primitive or
  keyboard-operable, and every animation reads `useReducedMotion()` from `design/motion.ts`.

## Module Definition of Done

Every curriculum module (split specs refer to this as **DoD**) must:

1. Export `defineModule({ scene, controls, captions, missions, predictions })`; metadata stays in `catalog/`.
2. Open on an everyday situation as a live, manipulable scene; a story caption appears after the first
   interaction; the real term appears only at the end as a `TermTag`.
3. Include one predict-then-reveal moment and at least two plain-named `Dial`s ("How big a step").
   One idea per screen; no formulas or raw numbers on the main screen.
4. Record training in the Timeline when anything trains (scrubbable, ghost-run capable).
5. Offer a compare split when a setting has a clear alternative.
6. Put Mechanics and Maths in the `UnderTheHoodDrawer`, closed by default.
7. Ship its break-it mission as a predicate over store/timeline state, with success replay and caption.
8. Keep 60 fps on the reference laptop while training (training in the worker).
9. Round-trip through a snapshot link to the same view.
10. Pass its world's Playwright smoke test (opens, responds to one interaction, mission predicate fires).
11. Have every string it adds reviewed, by the session that writes it, against "would a smart 12-year-old
    follow this?" (a review, not an automated or model check).

## Hosting constraint

`SharedArrayBuffer` needs cross-origin isolation (COOP `same-origin`, COEP `require-corp`). Therefore
fonts are self-hosted via `next/font`, and all model weights are served from `public/models/` — never
fetched cross-origin at runtime. Size limits, caching and the deploy are in "Hosting and CI" below.

## Toolchain facts (from stage 01)

- pnpm 12, Node 24, Next 16, TypeScript 6 (typescript-eslint lacks TS 7), ESLint 10, Tailwind 4, Vitest 5,
  Playwright 1.65. jsdom pinned to 29 (30+ needs Node 24.15).
- `pnpm e2e` serves the static `out/` export through `scripts/serve-static.ts` with `public/_headers`; build first.
- `public/_headers` is the one source of COOP/COEP. `scripts/headers.ts` parses it for the e2e server and for
  `next dev` (`next.config.ts` returns it as `headers()` in the dev phase only), so `crossOriginIsolated` and
  `SharedArrayBuffer` work in dev too. Dev prints a harmless "headers will not automatically work with output:
  export" warning. `agentRules: false` stops `next dev` writing an `AGENTS.md`.
- `pnpm add` of a package with a postinstall needs an `allowBuilds` entry in `pnpm-workspace.yaml`
  (`core-js: false` came with TensorFlow.js 4.22).
- A new `src/<layer>` folder must be added to `LAYERS` in `eslint.config.mjs`.
- Colour, font, easing and spring literals are lint-banned outside `src/design`; use token classes
  (`bg-paper`, `text-ink`, `bg-accent`) or `var(--…)`. Motion via `useSpring` / `useReducedMotion` from
  `src/design/motion.ts`; tests mock with `mockReducedMotion`.
- Learner-facing words live only in module `captions.ts` / `missions.ts` / `predictions.ts`, `src/catalog/*.ts`,
  `src/ui/captions.ts`, `src/platform/captions.ts` and `src/constellation/captions.ts`, so the "smart
  12-year-old" review covers a handful of files. There is no automated caption check (the Gemini check was
  removed by owner decision).
- **Autodiff** (`engine/autodiff`): `Value`, `Neuron`/`Layer`/`MLP` (`call` builds a graph, `predict` is the fast
  no-learning pass), losses take raw scores (`binaryCrossEntropy` from a logit, `softmaxCrossEntropy`, `meanSquared`),
  `createOptimiser({ kind: "sgd" | "momentum" | "adam", learningRate })` steps any `{ data, grad }`, so a ball on
  a landscape can use it too. Activations: relu, leakyRelu, tanh, sigmoid, plus `"identity"` (the word "linear"
  is lint-banned as an easing name). Parameter order everywhere: layer, neuron, weights then bias.
- **ModelEngine** (`engine/model`): `new ModelEngine({ backend, model, data, train, onSnapshot })`, then `run`,
  `pause`, `step(n)`, `configure`, `setData`, `restore(snapshot)`, `predict(inputs)`, `readLive()`. Snapshots
  arrive every `train.snapshotEvery` epochs and on pause; `readLive()` reads the newest parameters from a
  `SharedArrayBuffer` (seqlock) each frame without messages. All logic is in `trainer.ts`, testable in-process
  (see `trainer.test.ts` for wiring a fake `WorkerPort`). Restoring does not restore optimiser memory.
- **TF.js backend**: same `ModelSpec`, loaded on demand; picks WebGPU, then WebGL, then CPU and reports which
  (`ready` → `"tfjs-webgl"` in headless Chromium, `"tfjs-cpu"` in Vitest). Parameters are converted to the autodiff
  order, so visuals read both backends alike.
- **Timeline** (`engine/timeline`): `record`, `scrub(epoch)`, `seek(index)`, `stepForward/Back`, `play/pause`,
  `tick(seconds)` from the caller's frame loop, `goLive`, `newRun` (current run becomes the ghost),
  `ghostAt(epoch)`; `subscribe`/`getState` suit `useSyncExternalStore`. `ui/TimelineScrubber` takes plain props;
  binding it to a Timeline is the platform's job (stage 03), as `src/app/styleguide/engines/TrainingLab.tsx` shows.
- **Colours on canvas/WebGL**: encodings return CSS strings; `design/paint.ts` (`resolveColours`, `colourTable`,
  `useResolvedColours`, `useColourTable`) turns them into RGB per theme. New encodings: `weightTone` (sage up,
  rose down), `fullness`, `classTone`/`regionTone` (groups are sky, sage, warm grey; clay and rose stay reserved),
  `tileTone`, `linePath`/`extent`. GSAP camera timing is `cameraGlide` in `design/motion.ts`.
- **Data**: `makeDataset(name, { count, noise, seed, classes })` in −1…1, `toSamples`, `gridInputs(128)` for
  `DecisionField` (which marks each redraw as the `decision-field-paint` performance measure).
- **3D**: `LossLandscape` and `IdeaSpace` each own a `SoftStage` canvas (demand frame loop, ambient + one
  directional light, rough materials); `CameraRig` glides between framings, so nothing needs rotating.
- **Determinism**: same seed, same engine → bit-identical runs. Node and Chrome can differ in the last digit of
  `Math.sin`/`cos`, so anything server-rendered from seeded maths must round what it puts in the DOM (Edge and
  PaintCanvas do) or hydration fails.
- **Evidence page**: `/styleguide/engines`; `e2e/engines.spec.ts` measures 60 fps while training and with 200
  wiggling edges, saves a Chrome trace to `test-results/engines-training-trace.json`, and checks field redraws
  stay under 16 ms.


## Platform hand-over (from stage 03)

- **Contract** (`platform/contract.ts`): a module's `index.ts` does
  `export const definition = defineModule<State>({ initialState, scene, controls, captions, missions, predictions,
  underTheHood?, compare?, trains? })`. `State` is a `type` (not an `interface`) of plain JSON data; it is the
  snapshot body, so keep derived values out of it. Scene, controls and drawer get `{ state, update, timeline, side }`;
  the first `update` counts as the learner's first touch. A training module records its `ModelEngine` snapshots
  into `timeline` (frames need `epoch` and `loss`) and sets `trains: true`. `missions` and `predictions` each need at
  least one entry (mastery needs both).
- **Compare split**: shown when both `compare(state) → alternative state` and `captions.compare` exist. The right
  half gets `side: "alternative"`, a no-op `update` and a private timeline, so it must not drive the learner's run.
- **Snapshot moment**: a snapshot carries state, guesses, first touch and the timeline position, not frames. A
  training scene must rebuild its recorded frames from state (same seed, same run) after mount; the shell seeks to
  the saved moment as soon as it has been recorded.
- **Words**: `captions.ts` exports `{ opening, story, compare? }` for the shell plus every other learner-facing
  word the module shows (dial names, `describe` words, buttons, scene labels, drawer text), so the 12-year-old
  review sees all of it. `missions.ts`: `{ id, goal, hint?, success, replay: { before, after }, when(state, newestFrame) }`;
  `predictions.ts`: `{ id, question, choices: { id, label }[], answer(state, frame) → choice id | null }` (null keeps
  the reveal waiting; the answer at the reveal is stored with the guess). `platform/fixture/` is the worked example.
- **Catalog**: to switch a lesson on, add to its entry in `catalog/world-N.ts`
  `load: () => import("@/modules/<world>/<id>").then(({ definition }) => definition)`. Ids are everyday slugs
  (`rolling-downhill`); `/learn/[id]` is static for all 74, and an entry without `load` shows the locked page.
  `lessons` (curriculum order, with `world`), `worlds` and `lessonById` come from `@/catalog`. Prerequisites were
  authored in stage 03 (v2 lists none); RLHF needs "Treats and tricks", which is how RL joins the language world.
- **Shell behaviour**: story caption after the first touch; the real term (`TermTag`) once any mission is done.
  The mission card shows the daily puzzle's mission (`#mission=<id>`), else the one that just fired (with why and
  its replay, then "next mission"), else the first unfinished one. Predictions work the same way, one at a time.
  The timeline shows only when `trains`. A replay plays `before` moments before the one the mission fired on to
  `after` after it; the window is kept as epochs, so it survives the ring buffer dropping old frames.
- **Progress** (`platform/progress`): IndexedDB key `progress-v1`; `useProgress(selector)`, `isMastered`,
  `starCount`, `nextSuggested(lessons, progress)` = first unmastered lesson in curriculum order whose built
  prerequisites are all mastered (an unbuilt one cannot hold others back), built lessons first, null when all are
  mastered. Home (stage 04) should use these.
- **Companion** (`platform/companion`): `useCompanion(selector)`, `companionStore.update({ hidden, activation,
  convolution })`, `reset()`; IndexedDB key `companion-v1`. Persisted writes wait for hydration and apply to the
  freshly saved value, so two tabs do not erase each other's changes (an open tab only sees them after a reload).
- **Snapshots**: `#s=<base64url deflate-raw JSON>` with `v: 1`; other versions, other lessons and links over 32k
  characters are ignored. Bump the version (and keep a reader for the old one) if a module changes its state shape
  incompatibly. Restore happens when the lesson opens; changing only the hash of an open lesson does nothing.
- **Puzzle**: `pickDaily(key, items)` is FNV-1a + `createRandom`; the lesson pick uses the local date
  `YYYY-MM-DD`, the mission pick `date/lessonId`. `/puzzle` waits until a lesson is built.
- **Palette**: the root layout mounts the catalog-fed `CommandPalette` (search by everyday name or real term) on
  every page; do not mount a second one.
- **Evidence page**: `/styleguide/platform` runs the fixture lesson (`platform/fixture/`) in the real shell;
  `e2e/platform.spec.ts` covers layout, phone stacking, scrubbing, mission + star after reload, snapshot restore,
  companion persistence, locked page, palette and puzzle.

## Home map hand-over (from stage 04)

- **Home** (`/`) is `constellation/HomeMap`: heading, world filter bar and the 3D map, which loads after first paint
  through `next/dynamic` (`ssr: false`). `layoutConstellation(lessons)` places every catalog lesson, so a new or
  re-ordered lesson needs no home change; links come from `prerequisites`.
- **Progress shows itself**: mastered lessons (`isMastered`) fill clay, `nextSuggested` wears a slowly breathing clay
  ring. World tints are `worldTone(world)`; `learnedTone` and `linkTone` live beside them in `design/encodings.ts`.
- **Stars are real links** (`a[data-star=<id>]` with the everyday title as name), laid over the canvas through drei
  `Html` into a sibling `nav`, because `SoftStage` is `role="img"`. Hover or focus shows the paper label and
  prefetches the lesson. They float, so Playwright pointer actions on them need `{ force: true }`.
- **Flights**: `cameraGlide` is now 1.1 s (was 1.4 s) for every `CameraRig`. The idle float loop stops when a flight
  starts; software WebGL otherwise starves the route change. Reduced motion keeps the camera still and fades `main`.
- Achievement stars (stage 11) should add to this scene rather than mount a second canvas.

## Headline lessons hand-over (from stage 05)

- **The four lessons**: `w1-foundations/rolling-downhill` (gradient descent), `w3-neural-networks/stacking-cells`
  (MLP), `w5-transformers/who-is-looking-at-whom` (attention) and `w6-reinforcement/scoring-every-move`
  (Q-learning). Each is `model.ts` (pure state, frames, run logic), `captions.ts`, `missions.ts`,
  `predictions.ts`, `scene.tsx`, `controls.tsx`, `drawer.tsx`, `index.ts`. Copy their shape for later lessons.
- **Where the work runs**: walkers and the gridworld simulate on the main thread (cheap, deterministic, replayable
  from state); stacking-cells trains in the `ModelEngine` worker and redraws its field on the main thread with
  `createFieldReader` (`engine/model/forward.ts`) from `readLive` parameters; attention runs in its own worker.
- **Replaying links**: each lesson keeps a progress counter in state (`runs`, `epochs`, `episodes`) and rebuilds
  its run from it with the same seed. Links replay with the final dots or board, not the edit history.
- **Gridworld** (`engine/rl/`): `gridworld.ts` (tiles floor/wall/goal/trap/coin, `step` slips sideways with
  `SLIP = 0.1`, which is what keeps a too-fast learner from settling) and `q-learning.ts` (`createQRunner(world,
  settings, seed)` → `advance(moves)` returns finished episodes; how moves are chunked never changes the run;
  `Episode.jump` is the mean score change per move, the "still jumping about" measure).
- **Pretrained reader** (`engine/pretrained/`): `attentionReader()` is a shared lazy worker client that remembers
  32 sentences. The model is `sentence-transformers/all-MiniLM-L6-v2` (Apache-2.0, 22.7 M parameters, 6 layers × 12
  heads), exported by `scripts/export-attention-model.py` with one `attentions` output and int8 per-channel
  quantisation: 21.4 MB in `public/models/attention-minilm/` (its README has the details). The ONNX runtime files
  are copied into `public/models/ort/` (gitignored) by `scripts/copy-runtime.ts` before `dev` and `build`.
  `env.localModelPath` must stay root-relative (`/models/`): Transformers.js 4 skips its local-file check for a full
  URL and then fails with "reading 'tokenizer_class'". No request leaves the site, as COEP requires.
- **Shared additions**: `LossLandscape` gained marker tones, `trails` and `onPick`; `Board` gained `floorTones`,
  `overlay` and `onPaint` (pointer drag or arrows + Enter); encodings gained the `coin` tile and `valueTone`;
  DataKit generators take an optional `spin` (the stacking-cells spiral uses 9 so one cell cannot fit it).
- **Evidence**: `e2e/headline.spec.ts` has a smoke test per lesson (story first, real name held back, no console
  errors, no cross-origin requests), the fly-off mission, 60 fps while the boundary morphs, threads within 3 s after
  a cached reload plus drag re-routing, and painting mid-practice plus the too-fast mission. The stability bound and
  the 50-episode re-plan are unit tests (`rolling-downhill/model.test.ts`, `engine/rl/gridworld.test.ts`).
  `e2e/frames.ts` holds the shared frame-timing helpers.

## Hosting and CI (from hardening H1)

- **Host: Cloudflare Pages** (recommended; the owner connects the account). It honours `public/_headers`, serves
  `/x.html` at `/x` and redirects `/x/` to `/x` (308), and refuses files over 25 MiB. Netlify would also work;
  Vercel ignores `_headers`; GitHub Pages cannot send COOP/COEP (and needs a sub-path), so the training and
  attention lessons would not run there. If a sub-path is ever needed, derive `MODELS_PATH` in
  `engine/pretrained/runtime.ts` from `NEXT_PUBLIC_BASE_PATH`.
- **Deploy steps**: create a Pages project named `neural-atlas` (or set the `CLOUDFLARE_PAGES_PROJECT` repository
  variable), then add the `CLOUDFLARE_API_TOKEN` (Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID` repository secrets. The
  CI `deploy` job uploads the tested `out/` with Wrangler: pushes to `main` go to production, same-repository pull
  requests to a `pr-<number>` preview. Without the secrets it posts a notice and skips. `smoke` then runs
  `e2e/hosting.spec.ts` against the deployment URL (`HOSTED_URL=… pnpm e2e:hosted` does the same by hand):
  COOP/COEP and `crossOriginIsolated` on `/` and `/learn/stacking-cells`, wasm and module content types, caching,
  the trailing-slash redirect and the attention model loading.
- **Headers** (`public/_headers`, every matching block applies): COOP/COEP on `/*`; `/_next/static/*` is
  `public, max-age=31536000, immutable` (content-hashed); `/models/*` is cached for a day. Model and runtime
  folders are versioned by name (`attention-minilm-v1`, `ort-<onnxruntime-web version>`): a changed model goes
  in a new folder, because browsers and Transformers.js's Cache API both key on the URL. `next dev` applies only
  the non-caching headers (dev files are not hashed). `scripts/serve-static.ts` mirrors the host for e2e
  (headers, `.mjs`/`.wasm`/`.onnx` types, 308 on a trailing slash).
- **Without cross-origin isolation** (a host that drops the headers) `SharedArrayBuffer` is undefined: the
  training lessons cannot start, and the ONNX runtime falls back to one thread (it already uses one). The smoke
  test catches a host that drops them; the in-lesson fallback is ENG-06 (H2).
- **Build size**: `pnpm build` ends with `scripts/check-build.ts`, which fails on any file over 24 MiB, on two
  files of 1 MiB or more with the same content, and on a missing runtime or model. It also deletes the raw
  `worker.ts` sources Turbopack copies into `_next/static/media` beside each `new Worker(new URL(…))` (it builds
  the real worker chunk too; a browser cannot run a `.ts` file, so nothing loads them). The attention lesson runs
  on `device: "wasm"`, so it uses the plain threaded runtime (`ort-wasm-simd-threaded.wasm`, 14 MB), not the
  26 MB WebGPU-capable asyncify build. `next.config.ts` aliases `onnxruntime-web/webgpu` to its external-wasm
  entry so the bundler emits no second copy. The export is about 45 MB, most of it the 21 MB model and the
  14 MB runtime.
- **Tailwind sources**: `src/app/globals.css` imports Tailwind with `source("../")`, so class names are
  found in `src/` only. Automatic detection read every tracked file from the project root: the ONNX model
  alone took ~3 minutes (the CSS step was 2.9 min of a 3-minute build, and it timed out in CI once), and the
  tokenizer's words became candidate classes. `scripts/tailwind-sources.test.ts` fails if Tailwind would scan
  anything outside `src/` or take over 5 s; the CI build step is limited to 5 minutes.
- **ONNX runtime copy**: `scripts/copy-runtime.ts` (before `dev` and `build`) copies by content hash into
  `public/models/ort-<version>/` and fails when the installed onnxruntime-web is not `RUNTIME_VERSION`
  (bump it in `runtime.ts` when Transformers.js moves) or a file is missing.
- **Model files**: plain git, not Git LFS (no extra accounts or quotas). `pnpm check-model` (CI) checks every
  model folder against the SHA-256 lines in its README; `scripts/export-attention-model.py` with
  `scripts/requirements-export.txt` (Python 3.12) and a pinned Hugging Face revision rebuilds the files byte for
  byte. Licences: `attention-minilm-v1/LICENSE` and `NOTICE` (Apache-2.0), `onnxruntime-web.LICENSE.txt` and
  `onnxruntime-web.ThirdPartyNotices.txt` (MIT, the npm package ships none). The repository's own code is MIT
  (`LICENSE`).
- **Workers**: three kinds, not one. The training `ModelEngine` worker (one per engine, so a compare split
  runs two), the attention reader's worker (shared, lazy) and ONNX runtime's own threads if ever enabled.
- **CI jobs** (`.github/workflows/ci.yml`): `checks` (format, lint, types, unit tests, model checksums),
  `build` (export plus size check, `.next/cache` cached, `out/` uploaded) and `e2e` (on the built
  `out/`) run in parallel where they can; then `deploy` and `smoke`. Actions are the Node 24 majors;
  `permissions: contents: read`; one run per branch (pull requests cancel the older run). Failed e2e runs
  upload `playwright-report/` and `test-results/`; every run uploads `test-results/perf/`.
- **No caption check in CI**: the Gemini "smart 12-year-old" check was removed by owner decision; the session
  that writes a string reviews it. CI calls no model or outside API.
- **End-to-end projects** (`playwright.config.ts`): `functional` is everything not tagged `@perf`, in parallel,
  one retry on CI. `perf` is the `@perf` tests (60 fps while training, 200 wiggling edges, the morphing
  boundary, threads after a cached reload, the home glide and first paint), one worker, after `functional`, so
  nothing competes for the CPU (a functional failure therefore leaves them unrun). Nothing runs in serial mode.
  `reuseExistingServer` is off, so a stale `out/` is never tested; `E2E_PORT` moves the server off 4173 when
  another checkout is using it. Every spec collects errors with `e2e/watch.ts`.
- **Perf profiles** (`e2e/frames.ts`): `PERF_PROFILE=reference` (default off CI) enforces the real budgets:
  mean frame ≤ 17.5 ms and p95 ≤ 25 ms, the glide 1.1 s ± 0.3, threads within 3 s, first paint within 1.5 s.
  `PERF_PROFILE=ci` (default on CI, whose runners draw WebGL in software) records the same budgets as
  `budget-missed` annotations and warnings, and fails only on gross regressions measured against an idle
  baseline from the same page: more than 100 ms of extra long tasks per 3 s, or more than 10% more dropped
  frames (gaps over 33 ms); a glide over 3 s, a lesson over 10 s to load, threads over 15 s or first paint over
  5 s. Each perf test writes its numbers to `test-results/perf/<test>.json`.
- **Styleguide and evidence pages** (`/styleguide`, `/styleguide/engines`, `/styleguide/platform`) ship in
  production on purpose: the e2e suite and the hosted smoke test use them. They are to be marked `noindex`
  (NAV-28, H2) rather than hidden behind a build flag.

## Hardening hand-over (H2: shell, design system, navigation)

What later stages copy. Items and their tests are in `docs/hardening/` (platform, home-navigation, design-accessibility,
live-testing, ENG-06/07/12).

- **Contract additions** (`platform/contract.ts`): `parseState(saved, initial)` is **required** for any lesson with numeric
  dials or arrays: clamp every number to its dial (`platform/clamp.ts`: `clampNumber`, `clampWhole`, `oneOf`, `capList`) and
  cap list lengths, because snapshot links can be hand-made. `initialFrom(companion, initial)` starts a lesson from the
  learner's own network when no link is opened. `describe(state, frame)` returns one plain sentence (words in captions.ts)
  read politely to screen readers for scenes with no text of their own. `update(change, { touch: false })` for engine
  syncs, so they do not count as the first touch; a guess is not a touch either.
- **Shell** (`ModuleShell`): every part (scene, dials, drawer) sits in a `LessonErrorBoundary`; a scene that hits an engine
  failure should `throw` it from render (keep it in state from `onError`) so the boundary shows "Something went wrong here"
  with Try again. All announcements go through one persistent `role=status` region; panels must not mount their own.
  Missions fire into a queue (shown one at a time); a link that already meets a mission primes it (no star). Until the
  learner guesses or skips, the guess card sits above the dials ("Guess first, then press start"); a guess locks once
  `answer` is non-null. The timeline sits under the scene. Focus moves to the card heading after reveal and next.
- **Snapshots v2** carry `momentEpoch` (v1 links still open by position). `decodeSnapshot` returns `{ ok, reason }` and
  LessonView shows why a link was ignored. A shared view's guesses show as "Their guess"; "Start from your own view"
  drops the link. Sharing writes the clipboard inside the click and falls back to a selectable link field.
- **Saving**: progress and companion records are salvaged field by field; unreadable values are copied to
  `<key>-corrupt-<time>` before being overwritten; `ready` settles within 2 s; `storageHealth.persistent` turns false
  where IndexedDB is missing or refuses.
- **Engines**: without cross-origin isolation `ModelEngine` falls back to posted live copies (same `readLive()`); worker
  load errors, message errors and a 20 s ready timeout reject `ready` and pending calls and reach `onError`. The
  attention reader times out (60 s first load, 10 s per read) and restarts its worker.
- **Site**: `platform/SiteNav` (map, puzzle, palette trigger, theme switch) on every page; a lesson offers "Next idea"
  once its missions are done. `app/error.tsx`, `global-error.tsx`, `learn/[moduleId]/error.tsx` and `not-found.tsx`
  use `platform/ProblemPage`. `app/template.tsx` cross-fades routes and focuses the new `main h1`. Lesson pages carry
  `description: lesson.idea`; styleguide pages are `noindex`. `fetchLesson`/`fetchedLesson` (`platform/lesson-cache.ts`)
  let a lesson fetched early open without the loading line.
- **Theme**: with no saved choice the site follows `prefers-color-scheme` (before first paint) and other tabs' choices.
- **Design tokens**: day `--ink-soft` is #5F5E58; clay as text, links and the focus ring is `text-accent-ink`
  (`text-accent` is lint-banned); text on a clay fill is `text-on-accent`. `src/design/contrast.test.ts` resolves every
  text/surface pair in both themes. Clay stays for fills of touchable or next things only.
- **Colour-free cues**: `tileMark`, `valueMark`, `weightDash`, `classMark`/`markPath` in encodings; Board and PaintCanvas
  take their spoken words as props from the lesson's captions; SegmentedControl stacks more than three options
  (pass `vertical={false}` to keep a wrapping row); HoverNote opens on tap; Dial takes arc taps; SoftStage takes a
  `fallback` for no WebGL (home: the lesson list; the valley: `ValleyMap`).
- **Words**: `src/captions-scan.test.ts` fails on JSX text, spoken attributes or page metadata written outside captions
  files (styleguide excluded). Every learner-facing string is reviewed by hand against the "smart 12-year-old" test:
  no jargon, no formulas or raw numbers on the main screen, the real term only as the end tag.
- **Checks**: `e2e/shell.spec.ts` (navigation, failures, links, guess flow, layout, theme, palette, touch),
  `e2e/a11y.spec.ts` (axe: 9 pages × day/night × 1280/320 with reduced motion), `e2e/engine-failures.spec.ts`,
  `e2e/primitives.spec.ts`, plus the home tests in `e2e/home.spec.ts`. Dev dependencies added: `@axe-core/playwright`,
  `fake-indexeddb`.

## Lessons hand-over (H3b: attention and Q-learning)

What later lessons copy. Items and their tests are in `docs/hardening/lessons.md` (ATT-*, QL-*), ENG-13, A11Y-19 and
LIVE-13/14.

- **Attention reader** (`engine/pretrained/`): `attention-session.ts` loads the model once and retries only a failed
  load (`ReaderFailure` says whether loading or reading failed); `createProgress` turns the runtime fetch and the model's
  `progress_callback` into one rising fraction, reported on every arrival (a file sent without its size still
  counts as arriving, so it is not taken for a stall); a fully arrived model gets a longer setup wait. `AttentionReader` keeps an LRU memory capped by bytes, times out a stalled
  load (reset by progress) and a slow read, and `retain()` returns a release: the worker ends after 60 s with no user.
  Words, not tokenizer pieces, are what the learner sees: `wordThreads`/`blendThreads` fold pieces into words, and
  `MOST_WORDS`/`MOST_LETTERS` bound a sentence. Tests run the real model in Node (`testing/node-model.ts`, with
  `// @vitest-environment node`); `scripts/record-attention-fixture.ts` re-records `testing/example-reading.json`.
- **Answers that do not move with the dials**: a guess's answer is computed from a fixed blend (all depths, all
  readers), never from the dials the learner is turning.
- **Layouts that fit**: `who-is-looking-at-whom/layout.ts` lays words in a row when their measured widths fit and in a
  column otherwise; overlap is checked in e2e with `expect.poll` because chips spring into place.
- **Touch that scrolls**: dragging starts only after a long press (threads) or a 300 ms hold (`Board`'s
  `PAINT_HOLD_MS`); a quick tap still acts, and a swipe scrolls the page. A non-passive `touchmove` listener blocks
  scrolling only once a hold has armed. e2e drives real touches through CDP (`Input.dispatchTouchEvent`).
- **Q-learning runs that replay exactly**: the runner is seeded, steps one move at a time (`advance(1)`), and frames come
  from the runner's own world and settings (`tryFrame`), so a run does not depend on how moves were batched. The lesson
  keeps an edit log (`model.ts`: `withEdit`, `replay`) of every board and dial change at the move it happened; a link
  replays it to the saved move. Live saves are throttled to `SYNC_MS` and flushed on pause.
- **Scrubbed views**: any edit to what is "now" calls `timeline.goLive()` first.
- **Shared visuals (additive props)**: `Chart` takes a fixed `range` and a faint `baseline`; `Board` takes `skid` and draws
  the learner as an ink puppy (`data-piece="puppy"`). Encodings: walls are half ink (calm at night) with level "brick"
  marks, treats are sand so they never look like the value tint. `design/copy.ts` gained `sentenceStart` for counts
  that open a sentence.
- **Checks**: `e2e/attention.spec.ts` and `e2e/scoring.spec.ts`; unit tests beside each lesson
  (`looking.test.ts`, `threads.test.tsx`, `scene.test.tsx`, `scoring.test.tsx`, `hardening.test.tsx`) and engine tests in
  `engine/pretrained/*.test.ts` and `engine/rl/gridworld.test.ts`.

## Lessons hand-over (H3a: Rolling downhill, Stacking cells, the training engine)

Items and their tests are in `docs/hardening/lessons.md` (DH-01..08, MLP-01..10) and `engines-ci-hosting.md`
(ENG-08..11).

- **Exact link replay (ENG-09)**: links still replay from state, not from stored parameters, but a training lesson now
  keeps a compact change log in state (`log`: the epoch and old value of every step-size change, flowers planted and
  pulled up). The scene builds the engine from the run's *beginning* (`beginning(state)`) and replays with
  `engine.step(epochs, schedule)`, where `ScheduledChange = { epoch, data?, optimiser? }` is applied when the trainer
  reaches that epoch. Replay runs in slices (`setTimeout(0)` between them) with a progress caption; `parseState` clamps
  epochs (5000) and the log (2000 entries, and it must work back to the garden it ends on). Same seed + same log ⇒
  identical parameters, checked through the real trainer in `stacking-cells.test.tsx`. Copy this for any lesson whose
  learner changes settings mid-run.
- **Trainer events** (`engine/model/protocol.ts`): `init` posts an epoch-0 snapshot (so a field shows before practice),
  validates `batchSize`/`snapshotEvery` (whole numbers ≥ 1), and answers empty data with `{ type: "idle", reason:
  "no-data" }`. A non-finite loss or parameter restores the last good parameters and posts `{ type: "diverged", epoch }`.
  `setData` and `configure` take an optional `tag` and answer `{ type: "applied", tag, epoch }` (how the lesson logs the
  epoch a change landed on). `TrainSettings.snapshotMs` throttles snapshots while running. `ModelEngine` takes
  `onIdle`, `onDiverged`, `onApplied`; `dispose()` is idempotent and drops queued messages.
- **Per-layer bends**: `ModelSpec.activation` may be a list, one bend per hidden layer (`hiddenActivation` in
  `autodiff/nn.ts`; extra layers reuse the last). `createFieldReader(model)` (`engine/model/forward.ts`) is a
  typed-array forward pass (a 48×48 field of a 4×8 team in ~2 ms) with `.hidden(params, inputs)` for each hidden cell's
  own answers.
- **TF.js** (`engine/model/backends/tfjs.ts`): depends on `tfjs-core`, `tfjs-layers` and the webgl/cpu backends only
  (REPO-18). The epoch loss is summed on the device and read once; parameters are read at most every 16 ms. On WebGPU
  device loss it rebuilds on WebGL (then CPU) from the last parameters. `configure` changes Adam's step by recreating
  it with its averages (TF.js optimisers answer `instanceof` by duck typing, so branch on `kind`).
  WebGL shader programs are compiled ahead without blocking (`compileAhead`), because WebGL's synchronous
  compile check froze the worker for over 30 s on a busy machine; a device not ready in `GPU_READY_MS` (5 s), or
  one whose reads are slow `SLOW_READS` times in a row, is left for the next device (the CPU is quick for these
  models). Keep device reads few: parameters come back in one read.
- **After merging H3b**: QL-14's PaintCanvas half was already done here (`touch-pan-y`, a 250 ms hold before a
  finger paints, then a non-passive `touchmove` that blocks scrolling only while painting; H3b's Board waits 300 ms).
- **Platform additions (minimal)**: `Mission.replay` may give `moment(frame)` (the epoch to centre the replay on) and
  `framesPerSecond` (a slower replay); `Prediction.fresh` makes a guess placed while a run is on screen wait for the
  next run before it can be revealed. `LossLandscape` gained `ghosts` (see-through markers), `rim` (a dark outline on
  markers and trails, for contrast with both ends of the ground), `orbit` + `onTurn` (drei `OrbitControls`, damped,
  no pan, limited; picking is off while turning); `ValleyMap` draws ghosts as dashed outlines. `PaintCanvas` gained
  `erasing`/`onRemove` and waits 250 ms before a finger paints (a moving finger scrolls; QL-14's PaintCanvas half);
  `DecisionField` clears when its outputs go null; `NetworkView` gained `backward` flow, `activations`, and
  `cellLabel`/`onCell`/`chosen` buttons over hidden cells.
- **Rolling downhill**: a roll is recorded whole at once and then played (a hidden tab still finishes it); turning a
  dial after a roll asks for one new roll 400 ms after the dial rests. Walker colours are fixed palette colours
  (`tones.ts`, checked by `tones.test.ts`), not theme tokens, because the ground is the same in both themes.
- **Checks**: `e2e/rolling-downhill.spec.ts` and `e2e/stacking-cells.spec.ts` (every mission, links, the garden cap, the
  hover fence, the field before practice, guesses, turning the valley, the slow replay, the biggest team at 60 fps as
  `@perf`).

## Worlds 1 and 3 hand-over (stage 06)

Plan: `docs/06-autodiff-worlds/plan.md`. Nineteen lessons, each shaped like the stage 05 ones (`model.ts`,
`captions.ts`, `missions.ts`, `predictions.ts`, `scene.tsx`, `controls.tsx`, `drawer.tsx`, `index.ts`, tests).

- **Recorded runs, not live training.** Every World 1 and 3 lesson that trains works out its whole run as a pure
  function of state (`run` generator: settings + seed + run counter) with `features/building/use-recorded-run.ts`:
  slices of ≤ 6 ms (`SLICE_MS`) so the page keeps 60 fps, then the run is recorded at once as a new run (the last
  one stays as the ghost) and played from its start (reduced motion shows the end). A hidden tab still finishes it
  (DH-01). Changing the settings a run depends on (`settings`, one string) asks for one new run once they rest
  400 ms (`SETTLE_MS`, DH-05). Frames carry the run's `key`, so missions and guesses only judge the run on screen
  (MLP-05). A link replays the same run because nothing in it depends on time or on how it was sliced. The
  `ModelEngine` worker stays for Stacking cells' open-ended practice; these models are a few hundred numbers.
- **Dense maths** (`engine/autodiff/dense.ts`): the `nn.ts` network on typed arrays, same parameter order (so
  `NetworkView` and `createFieldReader` read it), held to `Value` gradients in `dense.test.ts`. Adds `calm` (layer
  normalisation without a learned gain), `dropout`, a step size per round, `same` starts, `scale`, batches with
  seeded shuffles, and per-round `blame` (mean blame size per layer, for gradient rain). `hiddenOutputs` gives what
  every cell said (activation strip). **Fits** (`engine/fit/least-squares.ts`): `leastSquares`, `fitCurve`,
  `curveAt`, for lessons that show the answer rather than the walk.
- **Shared features** (each used by two lessons or more): `features/building/race/` (the landscape race, promoted
  from Rolling downhill: `race.ts` maths with an optional seeded `jitter` for the batch blender, `RaceView.tsx`,
  `tones.ts`); `WeightStrings` (weights on strings: pull a knob, voices on and off); `GradientRain` (blame per layer
  as drops and a puddle; `DRY_SHARE` names a dry layer in words); `use-hold-drag.ts` (mouse drags at once, a finger
  after a 300 ms hold, a tap still acts, a swipe scrolls); `features/inside/ActivationStrip` (a histogram per layer,
  silent and stuck layers named in words) and `DataLens` (a magnifying glass with sureness halos sized and dashed,
  never colour alone; `lensCount` for the lesson's own sentence). Features take every word as props from the
  lesson's captions.
- **Tests that assumed World 1 was locked** now use World 4's "The pattern torch" and "Zooming out" as the locked
  examples, and HomeMap's built count comes from the catalog. The first suggested lesson for a new learner is now
  "Teach by showing".
- **Lesson choices worth knowing**: Passing back the blame compares S-shaped cells with leaky cut-off cells
  (a plain cut-off can go silent and muddy the rain). Memorising vs understanding asks how the exam score compares
  with the past papers, because longer practice did not reliably make the exam worse. Where you start builds its own
  fully matching start (every hidden cell and every answer weight the same), so the copies stay copies; dense
  `same` starts copy each cell within a layer. `e2e/runs.ts` waits until a recorded run has played to its end.
- **Checks**: `e2e/world-1.spec.ts` and `e2e/world-3.spec.ts` smoke every built lesson of the world (story first,
  real name held back, no errors, nothing sent elsewhere, no sideways spill at 320 px); `e2e/w1-<id>.spec.ts` and
  `e2e/w3-<id>.spec.ts` cover each lesson's interaction, mission and link; `e2e/a11y.spec.ts` covers every lesson.

## World 2 hand-over (stage 07)

- **The ten lessons** live in `src/modules/w2-classic-ml/<id>/`, with the same file shape as the headline lessons,
  and are wired in `src/catalog/world-2.ts`: ask-the-neighbours (k-NN), twenty-questions (tree), wisdom-of-the-crowd
  (forest), the-mistake-relay (boosting), the-widest-road (SVM), the-spam-detective (naive Bayes),
  finding-natural-groups (k-means), the-best-shadow (PCA), a-map-of-everything (t-SNE) and
  is-99-percent-actually-good (accuracy, recall, precision, ROC).
- **Engine** (`src/engine/ml/`): pure, seeded and checked against hand-worked fixtures. `knn`, `tree` (CART with
  Gini), `forest`, `boost` (log-loss relay), `svm` (SMO with flat, bowl and bumps kernels; `lampPosts` are the
  support vectors), `bayes`, `kmeans`, `pca` (Jacobi on 3 × 3), `metrics`, and `tsne` with its worker
  (`tsne-protocol`, `tsne-host`, `tsne-worker`, `tsne-client`). `field.ts` turns any classifier into a
  DecisionField grid. Ties are broken the same way every time (see each file's comment), so links replay exactly.
- **Shared kit** (`src/features/classic/`, used by two or more lessons): `garden.ts` (presets with noise picked so
  that cramming shows on new dots, `newDots` for the "new dots" score, link parsing that caps and clamps),
  `ClassicGarden` (DataKit's PaintCanvas over a DecisionField, with `overlay` under the dots and `above` over
  them), `GardenPicker`, `BrushPicker`, `ScoreLines`, `DrawerText`, `paintWords`, and `memo.ts` (`rememberLast`,
  a one-entry cache so a render never refits a model).
- **What trains**: the relay, the magnets and the map record frames on the timeline (`trains: true`). Each keeps
  its progress in state (`runners`, `moves`, `steps`) and rebuilds its run from it with the same seed; a changed
  setting starts a new run, so the old one stays as the ghost. The map runs in its own worker and records every
  tenth step; a link redraws it to the saved step and never starts it running. Worker failures are thrown from the
  scene to the lesson's error boundary. `mapConnection.connect` lets tests connect an in-process host.
- **Limits worth knowing**: group shapes and tones exist for three groups only, so k-means stops at three magnets.
  The PCA cloud is drawn as an SVG projection (`scene3d` is reserved). The t-SNE "islands" measure is the
  Clark–Evans `spacing()` over the hull area: noise with two or three neighbours drops below 0.55 after about 500
  steps; an even spread sits near 1.
- **Shared changes**: none to `src/ui`, `src/platform`, `src/design` or `src/visuals`. The home map tests
  (`src/constellation/HomeMap*.test.tsx`) now read the built lessons from the catalog instead of naming four, so
  a newly built lesson needs no edit there.
- **Checks**: a unit test per lesson (missions, guesses, link clamping, `describe`, and the timeline for the
  lessons that train), engine tests per algorithm, and `e2e/world-2.spec.ts` (every lesson opens on its story with
  the real name held back and no errors or outside requests, every mission can be earned from the keyboard or a tap, and a thousand-point map pauses at once while it settles).

## World 4 hand-over (stage 08)

- **The twelve lessons** live in `src/modules/w4-deep-architectures/<id>/`, with the same file shape as World 3
  (model, captions, missions, predictions, scene, controls, drawer, index, one unit test), and are wired in
  `src/catalog/world-4.ts`. Vision: the-pattern-torch (convolution), how-machines-see (CNN), zooming-out
  (pooling), standing-on-giants (transfer learning). Sequence: reading-one-word-at-a-time (RNN),
  choosing-what-to-remember (LSTM / GRU). Generative: meaning-as-places (embeddings), squeeze-and-rebuild
  (autoencoder), smooth-imagination (VAE), forger-vs-detective (GAN), painting-from-fog (diffusion). Graphs:
  learning-from-friends (message passing).
- **Models** (each in a versioned folder with LICENSE, README with source, revision and SHA-256 lines checked by
  `pnpm check-model`, and a script that rebuilds it; every file is far under the 24 MiB limit `check-build`
  enforces):
  - `public/models/mobilenet-v1-025-v1/`: MobileNet v1 0.25/224 from the TensorFlow.js model store (Apache-2.0,
    tfjs-models commit e80d693), `weights.bin` 1.9 MB, plus `things.json` (the 1,000 everyday names). Rebuilt by
    `scripts/export-vision-model.ts`, which checks pinned SHA-256s of every download.
  - `public/models/faces-v1/`: our own small models trained offline on seeded cartoon faces (MIT, the repo's
    licence): `squeeze.bin` 3.2 MB (ordered autoencoder, nested dropout), `map-0/1/2.bin` 2.4 MB each (2-D map
    decoders at tidiness 0, 0.1 and 1), `fog.bin` 9.0 MB (denoiser that guesses the clear picture, 200 steps),
    `faces.bin` 1.0 MB (held-out faces), `manifest.json`. Rebuilt byte for byte by `scripts/train-faces.py`
    (pinned in `scripts/requirements-train.txt`; CPU only).
  - `public/models/photos-v1/`: 29 sample photos, 224 × 224 (CC0, one public domain), credited in its README and
    rebuilt by `scripts/fetch-photos.py` from pinned Wikimedia Commons thumbnails.
- **Vision kit**: `src/engine/vision/` runs MobileNet in one shared worker (`vision-worker.ts`, WebGL with a CPU
  fallback through `pickDevice`). `vision-client.ts` is the page's `VisionReader` (load and read timeouts, idle
  shutdown after a minute, restart after a failure; `setVisionReader` swaps in a fake). `seeing.ts` reads the top
  answers, six pattern maps at three depths (edges, shapes, parts) and the 256 deep numbers, and makes the faint
  smudge (four signed-slope steps within a set number of shades, rounded to bytes, read again). Tests use
  `testing/node-vision.ts` (the real model on Node's CPU) or `testing/fake-vision.ts`.
  `src/features/inside/` holds the picture parts two or more lessons share: `use-photo` (sample photos,
  `setPhotoReader` for tests), `use-camera` (the camera, asked only after the lesson's own plain question; off
  while the tab is hidden; a centre-square 224 grab), `use-vision` (`useSeen`, `useLiveSeen`, which reads one
  camera picture at a time as fast as the device answers), `PicturePicker` with `CameraChoice`, `PhotoCanvas` and
  `ValueMap`.
- **Camera rules**: every camera lesson finishes with photos alone; the mission and guess never need the camera.
  Snaps live only in the scene's memory: they never enter links, storage or requests, and standing-on-giants
  drops them when the camera stops. A refused, missing or failing camera says so in one line and the photos stay.
- **Measured facts the missions rest on**: a smudge of one shade turns MobileNet's "boxer" into "muzzle"; the
  picture reader loses track of the dog after the first shrink; from MobileNet's numbers, one photo per group names
  8 of 9 kept-back photos, while bare grey dots name 4 (5 with five photos). Fork measurements for the generative,
  sequence and graph lessons are named constants beside each lesson's model (for example `MUSH` and `ONE_FACE`),
  each with the measurement in its comment.
- **Other engines**: `src/engine/sequence/recurrent.ts` (plain and gated readers, backprop through time with a
  capped slope), `src/engine/generative/faces.ts` (weights reader, squeeze, rebuild, map decoders, fog clearing
  with paint steering, `sharpness`) and `gan.ts`, `src/engine/embedding/word-map.ts` (pull-and-push word map).
  Shared lesson parts: `src/features/memory/` (the two reader lessons) and `src/features/generative/` (face model
  loading with Try again, `FacePicture`).
- **Companion**: sweeping the whole photo once in the-pattern-torch sets `companion.convolution`.
- **Shared changes** (small and additive): `inkTone` in `src/design/encodings.ts`; the twelve `load` lines in
  the catalog; `*.bin` and `*.jpg` marked binary in `.gitattributes`; the new folders listed in
  `public/models/README.md`. Locked-lesson examples in `e2e/home.spec.ts`, `e2e/platform.spec.ts`,
  `e2e/a11y.spec.ts` and `src/constellation/HomeMap.test.tsx` moved to World 5's "Chopping text into pieces";
  `e2e/a11y.spec.ts` now sweeps the World 4 lessons too.
- **Checks**: a unit test per lesson, engine tests, `e2e/world-4.spec.ts` (every lesson opens on its story and
  fits a phone) and an `e2e/w4-<id>.spec.ts` per lesson: mission, guess, exact link replay and a plain failure
  message for each. The camera specs run Chromium's fake camera (`e2e/camera.ts`), a refused camera, and a
  `@perf` check that camera maps update 15 times a second (the reference profile's budget).
- **Test load**: headless Chromium draws WebGL in software, so a picture-reading page costs about four cores while
  it reads. Specs that open one (`PICTURE_LESSONS` in `e2e/gpu.ts`) are tagged `@gpu` and run in their own
  Playwright project, one at a time, after `functional` and before `perf`. The live camera loop asks for at most
  `LIVE_RATE` (20) reads a second, with one read in flight. Together these took the full e2e run from 24 minutes
  with eight load failures to under five minutes.

## World 5 hand-over (stage 09)

- **The sixteen lessons** live in `src/modules/w5-transformers/<id>/` with the World 4 file shape (model,
  captions, missions, predictions, scene, controls, drawer, index, one unit test) and are wired in
  `src/catalog/world-5.ts`. Who-is-looking-at-whom (stage 05) is unchanged. Every lesson has at least two plain
  dials; nothing calls a live chatbot or any network service: every model is a file in `public/models/`.
- **Models** (each in a versioned folder with LICENSE, README with source, revision and SHA-256 lines checked by
  `pnpm check-model`, and a rebuild script; every file is far under the 24 MiB limit):
  - `gpt2-pieces-v1/`: GPT-2's `vocab.json` (1.0 MB) and `merges.txt` (456 kB) from openai-community/gpt2 at
    revision 607a30d (Modified MIT, OpenAI). Fetched by `scripts/fetch-language-files.py`.
  - `glove-words-v1/`: GloVe 6B 50-d (fse/glove-wiki-gigaword-50 at 6d69f9a, PDDL), cut to 6,036 words and
    stored as signed bytes with a scale per word: `vectors.bin` 326 kB, `words.txt` 47 kB. Same script. The cut
    has no rare animals (no "penguin" or "bee"), so lessons use everyday words.
  - `tiny-writers-v1/`: two tiny GPTs trained here on text `scripts/train-writers.py` generates from a seed
    (MIT): the word-level storyteller (`storyteller.bin` 473 kB: 117 words, context 48) and the letter writer
    (`writer.bin` 270 kB: 48 wide, context 32), plus `manifest.json` (10 kB: animal facts, book titles, an
    everyday sample and PyTorch score fixtures).
  - `picture-words-v1/`: `matcher.json` (23 kB), a CLIP-style map fitted here (MIT) by
    `scripts/build-picture-words.ts` from MobileNet features of `photos-v1` and GloVe captions.
- **Language kit** (`src/engine/language/`): `bpe.ts` (GPT-2 pieces), `word-places.ts` (GloVe reading, analogy,
  nearest, meaning of a text), `tiny-gpt.ts` (forward, backward and Adam for the tiny GPTs, deterministic),
  `writers.ts` (weights reader), `sampling.ts` and `story.ts` (heat, top choices, seeded continuation,
  `goesInCircles`), `baby-gpt.ts` (a seeded training run with moments), `picture-words.ts`, `toy-codes.ts`
  (seeded toy vectors for the order and thinking-block lessons) and `files.ts` (cached loaders). Training runs
  in a worker (`writer-worker.ts`, `writer-host.ts`, `writer-client.ts`); `testing/in-process-writer.ts` runs the
  same host in-process for unit tests.
- **Shared lesson parts** (`src/features/language/`): `useLanguageFile` and `LanguageFileStatus` (loading line,
  plain failure message with Try again), `WordChances` (the next-word bars), `useShownFrame` (records a frame
  when a non-training lesson's picture changes) and `useWriterPractice` (drives a worker run from
  `{steps, running}` state; any setting change resets to a fresh run, and links never open running).
- **Measured facts the missions rest on** (each a named constant in the lesson's model with its test): the
  storyteller is 93% sure the hen is brown, a colour its book never gives; always taking the likeliest word
  loops within twenty words from "the cat sat on the"; baby GPT learns one sentence by heart (surprise under
  `BY_HEART`) within 100 steps; the letter writer talks like a pirate within 100 steps and, rereading no
  everyday text, its everyday surprise passes `FORGOT`; ten compliment-loving picks make the reward model a
  yes-man at the starting dials.
- **Shared changes** (small and additive): the sixteen `load` lines in the catalog; the four new folders in
  `public/models/README.md`; `e2e/a11y.spec.ts` sweeps the World 5 lessons too. Locked-lesson examples moved off
  World 5: `src/constellation/HomeMap.test.tsx` (focus test filters "Brains made of numbers"),
  `e2e/platform.spec.ts` (the "Teach by showing" link is scoped to "Good to try first") and `e2e/home.spec.ts`.
  `src/engine/language/baby-gpt.test.ts` uses a smaller model shape and one-minute waits so it holds under a full
  parallel run.
- **Checks**: a unit test per lesson (mission, guess, link clamping, describe, the star in the shell), engine
  tests against PyTorch fixtures and Transformers.js pieces, `e2e/world-5.spec.ts` (every lesson opens on its
  story and fits a phone) and an `e2e/w5-<id>.spec.ts` per lesson (interaction, star, exact link replay; shared
  steps in `e2e/w5.ts`). `w5-safe-vs-adventurous` checks the bars change before the next animation frame;
  `w5-specialising` has a `@perf` check that pirate talk appears within two minutes (the reference budget).
