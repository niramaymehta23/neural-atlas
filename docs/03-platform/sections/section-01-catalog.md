# section-01-catalog

## Contract
Implements REQ-PLT-01 from [codex-plan.md](../codex-plan.md#contract).
Behavior: platform contract types and `defineModule`; 74 lessons in six world files; ui strings moved to `src/ui/captions.ts`; check-captions reads ui/platform captions and skips code keys.
Expected: src/catalog/catalog.test.ts graph checks pass; scripts/check-captions.test.ts new cases pass; every existing src/ui test passes unchanged.
Command: pnpm test src/catalog scripts src/ui

## Owned files
- src/platform/contract.ts
- src/catalog/
- src/ui/captions.ts
- src/ui/*.tsx (string imports only)
- scripts/check-captions.ts
- scripts/check-captions.test.ts

## Compatibility
```json
{"version": 1, "mode": "required", "source_paths": ["src/ui/CommandPalette.tsx", "src/ui/MissionCard.tsx", "src/ui/TermTag.tsx", "src/ui/ThemeSwitch.tsx", "src/ui/TimelineScrubber.tsx", "src/ui/UnderTheHoodDrawer.tsx"], "check_paths": ["src/ui/CommandPalette.test.tsx", "src/ui/MissionCard.test.tsx", "src/ui/TermTag.test.tsx", "src/ui/ThemeSwitch.test.tsx", "src/ui/TimelineScrubber.test.tsx", "src/ui/UnderTheHoodDrawer.test.tsx"], "check_provenance": {"source": "existing", "author": "Repository maintainers"}}
```

## Review
Verdict: pass
Reviewed: catalog fields match the skip list; strings move without wording changes.
