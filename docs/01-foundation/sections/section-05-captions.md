# section-05-captions

## Contract
Implements REQ-FND-05 from [codex-plan.md](../codex-plan.md#contract): Gemini "smart 12-year-old" check over learner-facing strings, and the CI workflow that runs every check.
Behavior: Gemini "smart 12-year-old" check over learner-facing strings, and the CI workflow that runs every check.
Expected: scripts/check-captions.test.ts: jargon fixture fails; plain strings pass; no key warns and passes locally, fails under CI.
Command: pnpm test scripts

## Owned files
- scripts/check-captions.ts
- scripts/check-captions.test.ts
- scripts/fixtures/jargon-captions.ts
- .github/workflows/ci.yml

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "Greenfield: main holds only docs/, so there is no existing executable behaviour to preserve."}
```

## Review
Verdict: pass
Reviewed: scope against the shared contract; ownership disjoint from other sections.
