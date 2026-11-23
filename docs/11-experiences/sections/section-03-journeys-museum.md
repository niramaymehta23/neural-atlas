# Journeys and museum

## Contract
### REQ-EXP-02
Source: spec.md#L18-L18
Behavior: Journeys play catalog lessons end to end; the museum timeline has playable exhibits with sourced facts.
Expected: Every id exists and is built; nothing imports src/modules.
Command: pnpm vitest run src/experiences/journeys src/experiences/museum

## Owned files
- src/experiences/journeys/JourneyPage.tsx
- src/experiences/museum/MuseumPage.tsx
- src/experiences/journeys/
- src/experiences/museum/
- src/app/journeys/
- src/app/museum/

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
