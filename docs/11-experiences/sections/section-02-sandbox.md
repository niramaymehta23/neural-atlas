# Sandbox

## Contract
### REQ-EXP-01
Source: spec.md#L17-L17
Behavior: Pair gardens with dot learners and boards with board learners; train live in a worker; seeded links.
Expected: Every pairing trains; link replays to the same step.
Command: pnpm vitest run src/engine/lab src/experiences/sandbox

## Owned files
- src/experiences/sandbox/SandboxPage.tsx
- src/engine/lab/lab-worker.ts
- src/engine/lab/
- src/experiences/sandbox/
- src/app/sandbox/

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
