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
├── scripts/
│   └── check-captions.ts         "smart 12-year-old" test of every learner-facing string (Gemini)
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
    │   ├── model/                ModelEngine (main thread), worker.ts (single entry), protocol.ts,
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
- **Plain language is enforced, not hoped for.** Every learner-facing string lives in a module's
  `captions.ts`, `missions.ts` or the catalog, so `scripts/check-captions.ts` can test all of it. No jargon in
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
11. Pass `check-captions` for every string it adds.

## Hosting constraint

`SharedArrayBuffer` needs cross-origin isolation (COOP `same-origin`, COEP `require-corp`). Therefore
fonts are self-hosted via `next/font`, and all model weights are served from `public/models/` — never
fetched cross-origin at runtime.

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
- `check-captions` reads module `captions.ts` / `missions.ts` / `predictions.ts`, `src/catalog/*.ts`,
  `src/ui/captions.ts` and `src/platform/captions.ts`, skipping keys `id`, `realTerm`, `term`, `prerequisites`,
  `world` and the code keys `load`, `when`, `answer`. CI needs the `GEMINI_API_KEY` secret.

## Engines hand-over (from stage 02)

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
  word the module shows (dial names, `describe` words, buttons, scene labels, drawer text); check-captions reads all
  of its exports. `missions.ts`: `{ id, goal, hint?, success, replay: { before, after }, when(state, newestFrame) }`;
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
