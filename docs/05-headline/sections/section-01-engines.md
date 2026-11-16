# Section 01: engines

## Contract
### REQ-HDL-02
Behavior: `forwardMany(spec, params, inputs, count)` equals `scoresToOutputs` of the autodiff MLP, Float32Array out.
Expected: forward.test.ts agrees to 1e-6 (tanh, relu; binary and softmax heads).
Command: pnpm test src/engine/model

### REQ-HDL-04
Behavior: gridworld tiles and a seeded stepwise Q-learning runner; `advance(steps)` returns finished episodes;
chunking never changes results; tiles may change mid-run.
Expected: gridworld.test.ts: convergence, wall re-plan within 50 episodes, determinism across chunkings.
Command: pnpm test src/engine/rl

## Owned files
- src/engine/model/forward.ts
- src/engine/model/forward.test.ts
- src/engine/rl/

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New pure engine files only; existing engine modules are read, not changed."}
```

## Evidence
See the shared plan.

## Review
Verdict: pass
Reviewed: pure TypeScript, seeded, tested against references.
