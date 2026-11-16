# Section 05: wiring, smoke tests and hand-over

## Contract
### REQ-HDL-01
Case: catalog entries for the four lessons gain `load`; platform e2e moves the locked-page case to an unbuilt
lesson and expects the puzzle to pick a built one; smoke spec per lesson; architecture hand-over added.
Expected: catalog.test.ts, platform.spec.ts and headline.spec.ts pass; check-captions collects the new strings.
Command: pnpm test src/catalog && pnpm build && pnpm e2e && pnpm check-captions

## Owned files
- src/catalog/world-1.ts
- src/catalog/world-3.ts
- src/catalog/world-5.ts
- src/catalog/world-6.ts
- e2e/headline.spec.ts
- e2e/platform.spec.ts
- docs/architecture.md

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Catalog gains load lines only; the platform e2e cases change on purpose because lessons are now built."}
```

## Evidence
See the shared plan.

## Review
Verdict: pass
Reviewed: edits to shared files are additive; stage 04 files untouched.
