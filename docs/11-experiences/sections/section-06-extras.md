# Sound, cards, meter, achievements

## Contract
### REQ-EXP-05
Source: spec.md#L21-L21
Behavior: Training can be heard (no context until asked); idea cards from any caption; compute meter; achievement stars; browser checks and hand-over.
Expected: Fake-context tests; every caption offers a card; full done-command twice.
Command: pnpm vitest run src/experiences

## Owned files
- src/experiences/sound/training-sound.ts
- src/ui/glossary/CaptionText.tsx
- src/experiences/sound/
- src/experiences/glossary/
- src/experiences/meter/
- src/experiences/achievements/
- src/ui/glossary/

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Shared edits are additive; existing shell tests are the preservation check."}
```

## Evidence
See [the plan](../codex-plan.md#evidence).

Rollback: revert the section's commits.
Ownership: single writer (this session).

## Review
Verdict: pass
Reviewed: the requirement, its edge cases and tests against the shared plan.
