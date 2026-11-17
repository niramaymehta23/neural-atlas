<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 07 World 2 (Classic tricks): shared plan

Spec of record: `docs/requirements.md` World 2 table; DoD and every hand-over in `docs/architecture.md`;
the rough edges not to repeat in `docs/hardening/`.

## Contract

### REQ-W2-01
Source: spec.md#L13-L26
Behavior: `src/engine/ml/` (k-NN, tree, forest, boosting, SVM with flat and lifted kernels, naive Bayes, k-means,
PCA, t-SNE, confusion and ROC) is pure TypeScript, seeded through `engine/random.ts` only; t-SNE steps in a worker.
Expected: one hand-computed fixture per algorithm and a same-seed-twice check; the t-SNE stepper gives identical
layouts however it is sliced.
Command: pnpm vitest run src/engine/ml

### REQ-W2-02
Source: spec.md#L13-L26
Behavior: the ten World 2 lessons each meet the DoD; the five 2D lessons (neighbours, questions, crowd, relay,
road) and the groups lesson reuse DataKit (`makeDataset`, `gridInputs`) and `DecisionField` / `PaintCanvas`.
Expected: per-lesson unit tests (mission, guess, parseState, describe, scene interaction) and `e2e/world-2.spec.ts`
(each lesson opens on its story, responds, and one mission fires).
Command: pnpm vitest run src/modules/w2-classic-ml && pnpm build && E2E_PORT=4207 pnpm e2e e2e/world-2.spec.ts

## Owned files
Per section in [sections/index.md](sections/index.md).

## Decisions
- Lessons that only fit (neighbours, questions, crowd, road, spam, shadow, scores) recompute from state on the main
  thread behind a one-entry memo; nothing is stored but the learner's settings and points, so a link replays exactly.
- Runs that unfold (the relay's runners, the magnets' moves, the map settling) are recorded whole on the timeline
  (`trains: true`), rebuilt from state like rolling-downhill; t-SNE records from its worker.
- Groups are limited to the three class tones and shapes, so k-means looks for one to three groups and t-SNE data
  has three kinds.
- Overfitting is shown by a second, seeded set of "new dots" from the same garden recipe (own gardens: a held-back
  share of the learner's dots is not used; new dots exist only for the preset gardens).
- `scene3d` stays out: the shadow lesson turns its cloud with plain SVG maths.

## Risks
- t-SNE at 1,000 points: exact gradient over sparse neighbours in the worker, frames throttled; e2e checks input
  stays responsive.
- SMO on lifted kernels: capped iterations, deterministic pair choice; tests pin the road on a hand-made fixture.

## Evidence
Read: architecture.md (all hand-overs), hardening/lessons.md, design-accessibility.md headings, stacking-cells and
rolling-downhill lessons, `data/` kit, `platform/contract.ts`, `captions-scan.test.ts`, eslint layers.

Rollback: every change is a new file except `src/catalog/world-2.ts` (adds `load`) and one docs section; reverting the stage commits restores main.

## Review
Verdict: pass
Reviewed: contract coverage of both REQs, ownership against stage 06, DoD and hardening items per lesson; findings in reviews/plan-review.md applied.
