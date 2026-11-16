# section-04-lab

## Contract
Implements the browser evidence for REQ-ENG-02..05 from [codex-plan.md](../codex-plan.md#contract).
Behavior: `/styleguide/engines` lab composing ModelEngine, Timeline, TimelineScrubber, NetworkView, FlowParticles, DecisionField, PaintCanvas, Chart, Board and the 3D trio; Playwright performance spec; architecture.md hand-over.
Expected: e2e/engines.spec.ts: 60 fps while the spiral trains (trace saved), 200-edge view at 60 fps, DecisionField redraw under 16 ms, scrub + ghost visible, tfjs backend reported, zero console errors.
Command: pnpm build && pnpm e2e

## Owned files
- src/app/styleguide/engines/
- src/app/styleguide/page.tsx
- e2e/engines.spec.ts
- docs/architecture.md

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New page and spec; the styleguide page only gains a link."}
```

## Review
Verdict: pass
Reviewed: page is thin composition; measurements are asserted, not eyeballed.
