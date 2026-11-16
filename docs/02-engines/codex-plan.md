<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 02 Shared engines: shared plan

Spec of record: v2 in `docs/requirements.md` (Design language, Tech stack); layout and layer table in `docs/architecture.md`.

## Contract

### REQ-ENG-01
Source: spec.md#L17
Behavior: seeded RNG; Value, Neuron, Layer, MLP; three losses; SGD, Momentum, Adam; relu, leakyRelu, tanh, sigmoid.
Expected: autodiff tests match central differences within 1e-6; same seed gives identical weights and losses.
Command: pnpm test src/engine

### REQ-ENG-02
Source: spec.md#L18
Behavior: typed protocol, one worker, autodiff and tfjs backends (WebGPU, WebGL, CPU), ModelEngine with a SharedArrayBuffer live view; dev sends COOP/COEP from public/_headers.
Expected: trainer tests train a spiral in-process (tfjs on CPU); e2e keeps mean frame ≤ 17.5 ms, p95 ≤ 25 ms while training, trace saved.
Command: pnpm test src/engine && pnpm e2e

### REQ-ENG-03
Source: spec.md#L19
Behavior: Timeline ring buffer with play, pause, scrub, steps and a ghost run; TimelineScrubber with sparkline.
Expected: scrub then restore reproduces that epoch's loss exactly; ghost matches previous run per epoch; scrubber works by keyboard.
Command: pnpm test

### REQ-ENG-04
Source: spec.md#L20
Behavior: visuals NetworkView, NeuronDot, Edge, FlowParticles, Board, Chart; scene3d LossLandscape, IdeaSpace, CameraRig; encodings extended additively.
Expected: e2e animates 200 edges at mean frame ≤ 17.5 ms; 3D renders without errors; lint finds no colour literals.
Command: pnpm lint && pnpm e2e

### REQ-ENG-05
Source: spec.md#L21
Behavior: five seeded datasets, PaintCanvas, DecisionField.
Expected: datasets deterministic; PaintCanvas adds points by keyboard; 128² redraw under 16 ms in unit and e2e.
Command: pnpm test src/data && pnpm e2e

## Owned files
Per section in [sections/index.md](sections/index.md).

## Evidence
Stage 01 on main: `LAYERS` already lists engine, visuals, scene3d and data; boundaries rule allows visuals/scene3d → engine types only and data → design, ui, engine. `encodings.ts` has thickness/warmth/speed returning CSS strings; `color-mix` with `var()` cannot be parsed by canvas or three, hence `design/paint.ts` resolves a token string to RGB through a computed style once per theme (cached, refreshed on `subscribeToTheme`). Registry 2026-11-16: `@tensorflow/tfjs` and `-backend-webgpu` 4.22.0 (latest). `pnpm add` needs `core-js: false` in `allowBuilds` (banner-only postinstall). Probe: `next dev` with `output: "export"` *does* send `headers()` (curl showed COOP); `next build` warns, so headers are returned only in `PHASE_DEVELOPMENT_SERVER`. `next dev` writes an `AGENTS.md`; disabled with `agentRules: false`.
Decisions: SharedArrayBuffer is the live-parameter channel (required; site is always isolated in prod, dev and e2e); timeline snapshots go by `postMessage`. Class colours reuse tokens: sky, sage, warm grey (no new tokens); sage/rose mean "pushes up/down" for weight sign. TF.js falls back to CPU when neither WebGPU nor WebGL exists (headless CI). TimelineScrubber takes props, binding to `Timeline` happens in platform (stage 03). Demo lives at `/styleguide/engines`. FlowParticles and CameraRig honour reduced motion via `useReducedMotion`.
Risks: WebGPU availability varies (fallback chain, reported backend); headless frame timing noise (mean + p95 thresholds, trace saved). Rollback: drop the branch.

## Review
Verdict: pass
Reviewed: each REQ-ENG maps to a named test or e2e assertion; layer imports respect the table (ui→design only, visuals/scene3d→engine types only); every new visual mapping routes through encodings.ts; out-of-scope RL/classic/pretrained untouched.
