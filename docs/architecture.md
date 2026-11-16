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
