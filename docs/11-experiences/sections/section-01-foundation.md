# Foundation

## Contract
### REQ-EXP-06
Source: spec.md#L22-L22
Behavior: The home map's stars are spaced as the camera sees them; `/explore` hub and navigation; engine multiplication tally; experience shell (state, links, boundary).
Expected: No two stars overlap (projected, all framings); tallies equal hand counts.
Command: pnpm vitest run src/constellation src/engine/multiplications.test.ts src/app

## Owned files
- src/constellation/layout.ts
- src/engine/multiplications.ts
- src/experiences/shell/
- src/app/explore/
- src/platform/SiteNav.tsx

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Home layout and navigation change on purpose; existing home tests are the preservation check."}
```

## Evidence
See [the plan](../codex-plan.md#evidence).

Rollback: revert the section's commits.
Ownership: single writer (this session).

## Review
Verdict: pass
Reviewed: the requirement, its edge cases and tests against the shared plan.
