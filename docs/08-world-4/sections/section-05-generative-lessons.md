# Section 05: generative lessons

## Contract
### REQ-W4-03
Source: spec.md#L19-L19
Behavior: meaning-as-places (mission: squash every word into one spot), squeeze-and-rebuild (squeeze down to one number), smooth-imagination (tear the map so gaps make nonsense), forger-vs-detective (make the forger draw only one face), painting-from-fog (skip most steps and get mush).
Expected: a unit test per lesson for missions, guesses, clamping, describe and the scene.
Command: pnpm vitest run src/modules/w4-deep-architectures

## Owned files
- src/modules/w4-deep-architectures/meaning-as-places/index.ts
- src/modules/w4-deep-architectures/squeeze-and-rebuild/index.ts
- src/modules/w4-deep-architectures/smooth-imagination/index.ts
- src/modules/w4-deep-architectures/forger-vs-detective/index.ts
- src/modules/w4-deep-architectures/painting-from-fog/index.ts
- src/engine/generative/gan.ts

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New files only."}
```

## Evidence
World 3 recorded-run lessons are the pattern for the two that train live.

Rollback: revert the section commit.
Ownership: single writer (this session); no other stage touches these paths.

## Review
Verdict: pass
Reviewed: weights load lazily with a plain failure message and Try again.
