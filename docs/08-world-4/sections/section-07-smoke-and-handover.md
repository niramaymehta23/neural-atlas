# Section 07: World 4 smoke spec and hand-over

## Contract
### REQ-W4-01
Source: spec.md#L17-L17
Behavior: `e2e/world-4.spec.ts` smokes every lesson; per-lesson specs cover an interaction, a mission and a link; the camera lessons run with Chromium's fake camera and with the camera denied; a `@perf` test checks the webcam maps' rate against the perf profiles. Tests that used World 4 as locked examples use World 5. architecture.md gains only "World 4 hand-over (stage 08)".
Expected: the full done-command passes twice in a row.
Command: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && E2E_PORT=4208 pnpm e2e && pnpm format:check

## Owned files
- e2e/world-4.spec.ts
- e2e/w4-*.spec.ts
- e2e/a11y.spec.ts
- e2e/shell.spec.ts
- e2e/platform.spec.ts
- e2e/home.spec.ts
- src/constellation/HomeMap.test.tsx
- docs/architecture.md

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Test edits swap which unbuilt lesson is the locked example; behaviour is unchanged."}
```

## Evidence
`e2e/world-smoke.ts`, `e2e/frames.ts` perf profiles.

Rollback: revert the section commit.

## Review
Verdict: pass
Reviewed: no fixed CI times; fake media flags only on the camera specs.
