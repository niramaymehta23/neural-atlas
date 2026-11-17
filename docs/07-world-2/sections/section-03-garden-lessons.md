# Section 03: the five 2D garden lessons

## Contract
### REQ-W2-02
Source: spec.md#L15-L16
Behavior: `ask-the-neighbours` (k-NN), `twenty-questions` (tree), `wisdom-of-the-crowd` (forest), `the-mistake-relay` (boosting, records runners on the timeline) and `the-widest-road` (SVM) each meet the Module DoD (docs/architecture.md#module-definition-of-done) plus clamping, `describe`, exact links, shapes with colours, keyboard, touch, phone layout and reduced motion. Catalog entries gain `load`.
Expected: per lesson a unit test that the mission fires on the intended state and not on the default, the guess answer is null until its condition and then computed, `parseState` clamps a hand-made link, `describe` speaks, and the scene renders and responds to one interaction.
Command: pnpm vitest run src/modules/w2-classic-ml

## Owned files
- src/modules/w2-classic-ml/ask-the-neighbours/
- src/modules/w2-classic-ml/twenty-questions/
- src/modules/w2-classic-ml/wisdom-of-the-crowd/
- src/modules/w2-classic-ml/the-mistake-relay/
- src/modules/w2-classic-ml/the-widest-road/
- src/catalog/world-2.ts

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New lesson folders; the catalog change only adds `load` to existing World 2 entries."}
```

## Evidence
Shape copied from stacking-cells. Hardening items not to repeat: PLT-02, DH-03, DH-04, MLP-02, MLP-04, A11Y-07/08, QL-14, ATT-02.

Rollback: revert this section's commit; it adds new files only (section 03 also adds `load` lines to the catalog).
Ownership: single writer; stage 06 owns worlds 1 and 3 and touches none of these paths.

## Review
Verdict: pass
Reviewed: each lesson's mission and guess derive from the engine's output on state, so links replay exactly and answers are the real outcome.
