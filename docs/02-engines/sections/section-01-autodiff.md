# section-01-autodiff

## Contract
Implements REQ-ENG-01 and the engine half of REQ-ENG-03 from [codex-plan.md](../codex-plan.md#contract).
Behavior: seeded RNG, Value/Neuron/Layer/MLP, losses, optimisers, Timeline ring buffer with ghost run.
Expected: src/engine/autodiff/value.test.ts and nn.test.ts match central differences within 1e-6; determinism test identical per seed; src/engine/timeline/timeline.test.ts round-trips scrub → restore → same loss.
Command: pnpm test src/engine

## Owned files
- src/engine/random.ts
- src/engine/random.test.ts
- src/engine/autodiff/
- src/engine/timeline/

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New folders under src/engine; no existing code or callers."}
```

## Review
Verdict: pass
Reviewed: pure TS with no React/DOM imports; determinism by seed; gradient tolerance as spec.
