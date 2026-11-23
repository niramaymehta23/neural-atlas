# Theatre

## Contract
### REQ-EXP-03
Source: spec.md#L19-L19
Behavior: Full-screen ambient shows of a model thinking; pausable; bounded memory.
Expected: Heap, nodes and listeners flat after warm-up; 30-minute measurement reported.
Command: pnpm vitest run src/experiences/theatre

## Owned files
- src/experiences/theatre/TheatrePage.tsx
- src/experiences/theatre/
- src/app/theatre/

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
