# Section 05: t-SNE in a worker and its lesson

## Contract
### REQ-W2-01
Source: spec.md#L13-L26
Behavior: t-SNE steps in its own worker (`src/engine/ml/tsne-worker.ts`) through a typed message protocol and a client with a ready timeout and error reporting; the page stays interactive at 1,000 points.
Expected: the stepper gives bit-identical layouts for the same seed whether stepped in one go or in slices; a fake-port client test passes frames through; an e2e measures that the page answers input while 1,000 points settle.
Command: pnpm vitest run src/engine/ml

### REQ-W2-02
Source: spec.md#L15-L16
Behavior: `a-map-of-everything` meets the DoD: islands settle on the timeline, the noise mission fires when islands appear from pure noise, a link replays to the same step.
Expected: lesson unit tests as in section 03, plus replay to a saved step.
Command: pnpm vitest run src/modules/w2-classic-ml/a-map-of-everything

## Owned files
- src/engine/ml/tsne.ts
- src/engine/ml/tsne-worker.ts
- src/engine/ml/tsne-client.ts
- src/modules/w2-classic-ml/a-map-of-everything/

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New worker and lesson; the build's worker-source cleanup in scripts/check-build.ts already covers any `new Worker(new URL(...))`."}
```

## Evidence
Pattern: `engine/pretrained/attention-client.ts`.

Rollback: revert this section's commit; it adds new files only (section 03 also adds `load` lines to the catalog).
Ownership: single writer; stage 06 owns worlds 1 and 3 and touches none of these paths.

## Review
Verdict: pass
Reviewed: the risk note is met by stepping in the worker and posting throttled frames.
