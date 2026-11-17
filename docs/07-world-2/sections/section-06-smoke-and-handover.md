# Section 06: World 2 smoke spec and hand-over

## Contract
### REQ-W2-02
Source: spec.md#L24-L26
Behavior: `e2e/world-2.spec.ts` opens each of the ten lessons (story first, real name held back, no console errors, no cross-origin requests), makes one interaction and fires one mission predicate per lesson; architecture.md gains only a "World 2 hand-over (stage 07)" section.
Expected: the full done-command passes twice in a row.
Command: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && E2E_PORT=4207 pnpm e2e && pnpm format:check

## Owned files
- e2e/world-2.spec.ts
- docs/architecture.md

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Adds one spec file and one documentation section."}
```

## Evidence
`e2e/headline.spec.ts` is the smoke pattern; `e2e/watch.ts` collects errors and outside requests.

Rollback: revert this section's commit; it adds new files only (section 03 also adds `load` lines to the catalog).
Ownership: single writer; stage 06 owns worlds 1 and 3 and touches none of these paths.

## Review
Verdict: pass
Reviewed: smoke steps use keyboard and taps only through accessible names.
