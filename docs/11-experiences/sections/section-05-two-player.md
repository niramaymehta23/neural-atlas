# Two players

## Contract
### REQ-EXP-04
Source: spec.md#L20-L20
Behavior: Race to train and break/repair on one device.
Expected: Each finishes a round; rules are seeded and clamped.
Command: pnpm vitest run src/experiences/two-player

## Owned files
- src/experiences/two-player/TwoPlayerPage.tsx
- src/experiences/two-player/
- src/app/two-player/

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New files only."}
```

## Evidence
See [the plan](../codex-plan.md#evidence).

Rollback: revert the section's commits.
Ownership: single writer (this session).

## Review
Verdict: pass
Reviewed: the requirement, its edge cases and tests against the shared plan.
