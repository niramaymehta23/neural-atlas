# Section 06: learning from friends

## Contract
### REQ-W4-04
Source: spec.md#L20-L20
Behavior: a friendship network where each round everyone mixes in what their friends think; dials for how many rounds and how much they listen; mission: everyone identical.
Expected: unit tests for spreading, mission, guess, links and describe.
Command: pnpm vitest run src/modules/w4-deep-architectures

## Owned files
- src/modules/w4-deep-architectures/learning-from-friends/index.ts
- src/modules/w4-deep-architectures/learning-from-friends/model.ts

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New files only."}
```

## Evidence
`the-decision-curve` is the file shape.

Rollback: revert the section commit.
Ownership: single writer (this session); no other stage touches these paths.

## Review
Verdict: pass
Reviewed: people are told apart by shape and words as well as tone.
