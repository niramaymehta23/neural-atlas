# section-03-shell

## Contract
Implements REQ-PLT-02 and the browser evidence for REQ-PLT-01, REQ-PLT-03, REQ-PLT-04, REQ-PLT-05, REQ-PLT-06, REQ-PLT-07, REQ-PLT-08 from [codex-plan.md](../codex-plan.md#contract).
Behavior: ModuleShell, TimelineBar, MissionPanel, PredictionCard, LessonView, LockedLesson, PuzzleView, platform captions, fixture module; routes `/learn/[moduleId]`, `/puzzle`, `/styleguide/platform`; catalog-fed CommandPalette in the root layout; Playwright spec; architecture.md "Platform hand-over".
Expected: ModuleShell and PredictionCard unit tests; e2e/platform.spec.ts (shell regions, caption after touch, mission once + star after reload, snapshot link restore, companion survives reload, locked page, palette jump, puzzle page, 390 px stacking); full suite green.
Command: pnpm build && pnpm e2e

## Owned files
- src/platform/ModuleShell.tsx
- src/platform/*.tsx and *.test.tsx
- src/platform/captions.ts
- src/platform/fixture/
- src/app/layout.tsx
- src/app/CatalogPalette.tsx
- src/app/learn/
- src/app/puzzle/
- src/app/styleguide/platform/
- src/app/styleguide/page.tsx
- e2e/platform.spec.ts
- docs/architecture.md

## Compatibility
```json
{"version": 1, "mode": "required", "source_paths": ["src/app/layout.tsx", "src/app/styleguide/page.tsx"], "check_paths": ["e2e/styleguide.spec.ts", "e2e/engines.spec.ts"], "check_provenance": {"source": "existing", "author": "Repository maintainers"}}
```

## Review
Verdict: pass
Reviewed: pages are thin composition; every shell string lives in platform/captions.ts.
