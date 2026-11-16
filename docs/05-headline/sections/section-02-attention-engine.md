# Section 02: attention engine

## Contract
### REQ-HDL-03
Behavior: `wordThreads` merges word pieces (rows averaged, columns summed), drops markers and self, renormalises
rows; `hogShare` is the largest average share one word receives; `AttentionReader` loads the worker once, caches
readings per sentence and surfaces errors; the worker reads only `/models/`.
Expected: attention.test.ts and attention-client.test.ts (fake port) pass.
Command: pnpm test src/engine/pretrained

## Owned files
- src/engine/pretrained/
- public/models/attention-minilm/
- scripts/copy-runtime.ts
- scripts/export-attention-model.py
- package.json, pnpm-lock.yaml, pnpm-workspace.yaml, .gitignore

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New engine folder, assets and a build step; existing scripts keep their behaviour."}
```

## Evidence
See the shared plan (model, size, licence, runtime hosting).

## Review
Verdict: pass
Reviewed: no cross-origin fetch path remains (remote models off, wasm paths local).
