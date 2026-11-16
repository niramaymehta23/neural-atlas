# section-02-design

## Contract
Implements REQ-FND-02 from [codex-plan.md](../codex-plan.md#contract): tokens.css (ivory default, night charcoal), fonts.ts, motion.ts, encodings.ts, copy.ts, theme.ts.
Behavior: tokens.css (ivory default, night charcoal), fonts.ts, motion.ts, encodings.ts, copy.ts, theme.ts.
Expected: src/design/*.test.ts: copy renders 0.98 as "98 out of 100"; encodings are monotonic and clamped; motion returns an instant transition when reduced; no shadow token is a coloured blur.
Command: pnpm test src/design

## Owned files
- src/design/tokens.css
- src/design/fonts.ts
- src/design/motion.ts
- src/design/encodings.ts
- src/design/copy.ts
- src/design/theme.ts

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Greenfield: main holds only docs/, so there is no existing executable behaviour to preserve."}
```

## Review
Verdict: pass
Reviewed: scope against the shared contract; ownership disjoint from other sections.
