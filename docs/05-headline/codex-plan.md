<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 05 Headline lessons: shared plan

Spec of record: v2 `docs/requirements.md` (prompts 4–7 read through the v2 rules); DoD and hand-overs in
`docs/architecture.md` (named as text so the plan stays in its folder).

## Contract

### REQ-HDL-01
Source: spec.md#L13-L19
Behavior: rolling-downhill: 3D valley, three walkers with soft trails; "How big a step" past the steady walker's
stability bound (2 ÷ steepest bend) sends it off the map and fires the mission.
Expected: model.test.ts: just above the bound flies off and the predicate fires; just below settles.
Command: pnpm test src/modules/w1-foundations

### REQ-HDL-02
Source: spec.md#L13-L20
Behavior: stacking-cells: paint dots; worker training; field recomputed from live parameters every new epoch;
layer/cell dials write the companion.
Expected: forward.test.ts matches MLP.predict; lesson test updates companionStore; e2e 60 fps while training.
Command: pnpm test src/engine/model src/modules/w3-neural-networks

### REQ-HDL-03
Source: spec.md#L13-L21
Behavior: who-is-looking-at-whom: self-hosted MiniLM via Transformers.js in a worker; curved threads; drag reorders.
Expected: attention tests; e2e threads within 3 s after caching, drag re-routes, no cross-origin request.
Command: pnpm test src/engine/pretrained

### REQ-HDL-04
Source: spec.md#L13-L26
Behavior: scoring-every-move: seeded slippery gridworld, stepwise Q-learning, paint any time.
Expected: gridworld.test.ts converges; re-plans within 50 episodes after a wall; deterministic.
Command: pnpm test src/engine/rl

Case: smoke spec per lesson (opens, one interaction, mission fires).
Expected: e2e/headline.spec.ts passes.
Command: pnpm build && pnpm e2e

## Owned files
Per section in [sections/index.md](sections/index.md).

## Evidence
Frames reach missions only through the timeline, so the attention lesson records one frame per reading.
Snapshots carry no frames, so each lesson keeps a progress counter (steps, epochs, episodes) in state and rebuilds
its run from it. Modules import features and below, never catalog.
Model: sentence-transformers/all-MiniLM-L6-v2, Apache-2.0, 22.7 M parameters, exported with an attention output,
int8 per-channel (MatMul and embeddings): 21.4 MB, mean deviation from fp32 0.005. Its middle layers point "it" at
"dog"; distilbert-base-uncased was larger with no clearer pattern. Transformers.js 4.3.2 returns every ONNX output
but defaults to CDN wasm, so `wasmPaths` points at `/models/ort/`, copied from node_modules (gitignored).
Decisions: walkers and the gridworld step on the main thread (microseconds per step); networks train in the
ModelEngine worker; attention runs in its own worker. A slippery floor makes "too fast to settle" real.
Risks: first visit downloads ~50 MB, then cached; restored links replay the run with the final dots or board.
Rollback: drop the branch.

## Review
Verdict: pass
Reviewed: each REQ maps to unit tests and the smoke spec; layer table respected; learner strings live in captions,
missions and predictions; shared edits are additive and avoid stage 04 files.
