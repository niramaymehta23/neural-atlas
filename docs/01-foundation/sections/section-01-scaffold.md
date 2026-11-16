# section-01-scaffold

## Contract
Implements REQ-FND-01, REQ-FND-02 from [codex-plan.md](../codex-plan.md#contract): Scaffold, packages, strict tsconfig, static export, `_headers`, ESLint boundaries and design-only bans, Vitest.
Behavior: Scaffold, packages, strict tsconfig, static export, `_headers`, ESLint boundaries and design-only bans, Vitest.
Expected: src/lint.test.ts: `ui → engine` import, hex, easing and `fontFamily` in `src/ui` each report an error; hex in `src/design` reports none.
Command: pnpm test src/lint.test.ts

## Owned files
- package.json
- tsconfig.json
- next.config.ts
- eslint.config.mjs
- vitest.config.ts
- src/lint.test.ts
- public/_headers

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Greenfield: main holds only docs/, so there is no existing executable behaviour to preserve."}
```

## Review
Verdict: pass
Reviewed: scope against the shared contract; ownership disjoint from other sections.
