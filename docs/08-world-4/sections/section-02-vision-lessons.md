# Section 02: vision lessons

## Contract
### REQ-W4-01
Source: spec.md#L17-L17
Behavior: the-pattern-torch (design a 3×3 torch, sweep it over a photo; mission: a torch that finds nothing; gives the companion convolution), how-machines-see (camera or photo seen layer by layer; mission: fool it with a near-invisible smudge), zooming-out (pool tile by tile; mission: zoom out until the answer changes), standing-on-giants (teach your own groups from snaps or sample photos; mission: start from a blank network with five photos and fail on new ones). Each has parseState, describe, two dials, a guess, a drawer and its error boundary.
Expected: a unit test per lesson for missions, guesses, clamping and describe.
Command: pnpm vitest run src/modules/w4-deep-architectures

## Owned files
- src/modules/w4-deep-architectures/the-pattern-torch/
- src/modules/w4-deep-architectures/how-machines-see/
- src/modules/w4-deep-architectures/zooming-out/
- src/modules/w4-deep-architectures/standing-on-giants/
- src/catalog/world-4.ts

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New lesson folders; the catalog gains load lines only."}
```

## Evidence
World 3 lessons are the file shape; `who-is-looking-at-whom` the loading and failure states.

Rollback: revert the section commit.

## Review
Verdict: pass
Reviewed: camera is optional in every lesson; links carry only sample-photo picks.
