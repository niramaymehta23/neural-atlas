# Section 02: shared classic kit

## Contract
### REQ-W2-02
Source: spec.md#L15-L16
Behavior: `src/features/classic/` holds only what two or more lessons use: the garden (PaintCanvas + DecisionField with preset gardens, a capped point list, the plant / pull-up brush and keyboard words passed in from the lesson), point guards for `parseState`, a field builder over `gridInputs`, a one-entry memo for expensive fits, and the "own dots / new dots" score lines. Words come from each lesson's captions as props.
Expected: kit tests: `parsePoints` drops malformed and out-of-square points and caps the list; garden presets are seeded and identical twice; the garden plants, pulls up and stops at the cap.
Command: pnpm vitest run src/features/classic

## Owned files
- src/features/classic/garden.ts
- src/features/classic/ClassicGarden.tsx
- src/features/classic/ScoreLines.tsx
- src/features/classic/memo.ts
- src/features/classic/*.test.ts(x)

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New folder used only by World 2 lessons."}
```

## Evidence
`stacking-cells/scene.tsx` shows the garden pattern (batched plants per frame, cap note, eraser, PAINT_WORDS); A11Y-08 shapes per group; QL-14 hold-to-paint is inside PaintCanvas already.

Rollback: revert this section's commit; it adds new files only (section 03 also adds `load` lines to the catalog).
Ownership: single writer; stage 06 owns worlds 1 and 3 and touches none of these paths.

## Review
Verdict: pass
Reviewed: kit admitted only because five 2D lessons share the garden and three share the score lines; no speculative parts.
