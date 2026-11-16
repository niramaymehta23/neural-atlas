# Section 03: trained lessons

## Contract
### REQ-HDL-01
Behavior: rolling-downhill module; LossLandscape gains optional `trails`, per-marker `tone` and `onPick`.
Expected: model.test.ts stability-bound cases pass.
Command: pnpm test src/modules/w1-foundations

### REQ-HDL-02
Behavior: stacking-cells module; companion written on layer/cell change; compare split vs a single cell.
Expected: lesson tests: companion updated; mission fires for a one-cell spiral that stays wrong, not a fitted ring.
Command: pnpm test src/modules/w3-neural-networks

## Owned files
- src/modules/w1-foundations/rolling-downhill/
- src/modules/w3-neural-networks/stacking-cells/
- src/scene3d/LossLandscape.tsx

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "LossLandscape only gains optional props; its existing caller is unchanged and the e2e engines spec runs in final verification."}
```

## Evidence
See the shared plan.

## Review
Verdict: pass
Reviewed: DoD per lesson: opening, two dials, prediction, mission with replay, term last, drawer, captions.
