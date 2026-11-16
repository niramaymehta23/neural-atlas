# section-02-model

## Contract
Implements REQ-ENG-02 from [codex-plan.md](../codex-plan.md#contract).
Behavior: protocol, trainer handler, worker entry, autodiff and tfjs backends, ModelEngine, SharedArrayBuffer live view; dev COOP/COEP from public/_headers through a parser shared with serve-static.
Expected: src/engine/model/trainer.test.ts trains a spiral in-process and tfjs on CPU; live.test.ts seqlock round-trip; existing e2e "is cross-origin isolated" still passes; curl on next dev shows both headers.
Command: pnpm test src/engine/model && pnpm build && pnpm e2e

## Owned files
- src/engine/model/
- next.config.ts
- scripts/headers.ts
- scripts/serve-static.ts
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml

## Compatibility
```json
{"version": 1, "mode": "required", "source_paths": ["scripts/serve-static.ts", "next.config.ts"], "check_paths": ["e2e/styleguide.spec.ts"], "check_provenance": {"source": "existing", "author": "Repository maintainers"}}
```

## Review
Verdict: pass
Reviewed: one source of truth for headers; production build still a plain static export; worker protocol typed end to end.
