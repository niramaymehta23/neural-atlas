# Section 04: spam, groups, shadow and score lessons

## Contract
### REQ-W2-02
Source: spec.md#L15-L16
Behavior: `the-spam-detective` (naive Bayes over a small message set in captions), `finding-natural-groups` (k-means, iterations on the timeline), `the-best-shadow` (PCA, a 3D cloud drawn in 2D SVG with its shadow) and `is-99-percent-actually-good` (confusion boxes and ROC) each meet the DoD and hardening rules as in section 03.
Expected: same per-lesson tests as section 03.
Command: pnpm vitest run src/modules/w2-classic-ml

## Owned files
- src/modules/w2-classic-ml/the-spam-detective/index.ts (and model, captions, missions, predictions, scene, controls, drawer, tests)
- src/modules/w2-classic-ml/finding-natural-groups/index.ts (same set)
- src/modules/w2-classic-ml/the-best-shadow/index.ts (same set)
- src/modules/w2-classic-ml/is-99-percent-actually-good/index.ts (same set)

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New lesson folders only."}
```

## Evidence
Groups are limited to the three class tones and shapes in design/encodings.ts, so k-means looks for one to three groups; `scene3d` is reserved for home, the valley and idea space, so the shadow lesson draws its cloud with SVG.

Rollback: revert this section's commit; it adds new files only (section 03 also adds `load` lines to the catalog).
Ownership: single writer; stage 06 owns worlds 1 and 3 and touches none of these paths.

## Review
Verdict: pass
Reviewed: no shared visuals changed; typed text is clipped in parseState and on input.
