# section-04-styleguide

## Contract
Implements REQ-FND-01, REQ-FND-04 from [codex-plan.md](../codex-plan.md#contract): Root layout with fonts and theme, `/styleguide`, static server applying `_headers`, Playwright.
Behavior: Root layout with fonts and theme, `/styleguide`, static server applying `_headers`, Playwright.
Expected: e2e/styleguide.spec.ts: every token, primitive heading and robot visible in ivory and night; `crossOriginIsolated` is true; no console errors.
Command: pnpm build && pnpm e2e

## Owned files
- src/app/layout.tsx
- src/app/globals.css
- src/app/page.tsx
- src/app/styleguide/
- playwright.config.ts
- scripts/serve-static.ts
- e2e/styleguide.spec.ts

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Greenfield: main holds only docs/, so there is no existing executable behaviour to preserve."}
```

## Review
Verdict: pass
Reviewed: scope against the shared contract; ownership disjoint from other sections.
