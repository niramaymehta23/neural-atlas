# Section 03: sequence engine and lessons

## Contract
### REQ-W4-02
Source: spec.md#L18-L18
Behavior: `engine/sequence/` trains a small recurrent cell and a gated cell on "remember the first word" sentences with seeded, typed-array backpropagation through time; reading-one-word-at-a-time and choosing-what-to-remember record their runs with `useRecordedRun`.
Expected: gradients match finite differences; the plain cell forgets long sentences and the gated one does not; locking every gate shut leaves it guessing.
Command: pnpm vitest run src/engine/sequence src/modules/w4-deep-architectures

## Owned files
- src/engine/sequence/recurrent.ts
- src/modules/w4-deep-architectures/reading-one-word-at-a-time/index.ts
- src/modules/w4-deep-architectures/choosing-what-to-remember/index.ts

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New files only."}
```

## Evidence
`engine/autodiff/dense.ts` and `dense.test.ts` are the typed-array and gradient-check pattern.

Rollback: revert the section commit.
Ownership: single writer (this session); no other stage touches these paths.

## Review
Verdict: pass
Reviewed: runs are short enough to play in a few seconds and replay identically.
