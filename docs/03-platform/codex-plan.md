<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 03 Module platform: shared plan

Spec of record: v2 `docs/requirements.md`; conventions in `docs/architecture.md`.

## Contract

### REQ-PLT-01
Source: spec.md#L17-L28
Behavior: `defineModule`; 74 lessons in six world files; `/learn/[moduleId]` static for all, locked without `load`.
Expected: catalog.test.ts: 74 lessons, unique ids, acyclic prerequisites; e2e locked page.
Command: pnpm test src/catalog && pnpm build && pnpm e2e
Case: check-captions also reads ui and platform `captions.ts` (spec.md#L28); code keys `load`, `when`, `answer` skipped.
Expected: check-captions.test.ts finds titles and ui strings, not real terms.
Command: pnpm test scripts src/ui

### REQ-PLT-02
Source: spec.md#L18
Behavior: ModuleShell with every listed region, TimelineScrubber bound to a Timeline; stacked below 768 px.
Expected: ModuleShell.test.tsx (caption after touch, drawer closed, term tag late); platform.spec.ts checks regions, scrubbing and 390 px stacking.
Command: pnpm test src/platform && pnpm e2e

### REQ-PLT-03
Source: spec.md#L19
Behavior: missions `{ id, goal, success, replay: { before, after }, when(state, frame) }`; a watcher fires each once; replay plays its window; firing stores a star.
Expected: missions.test.ts: fires once; replay visits `at - before` … `at + after` and stops; e2e star persists.
Command: pnpm test src/platform/missions

### REQ-PLT-04
Source: spec.md#L20
Behavior: choice predictions `{ id, question, choices, answer(state) }`; reveal needs a stored guess; the card shows guess beside result.
Expected: module-store.test.ts: reveal without guess is a no-op; PredictionCard.test.tsx shows both.
Command: pnpm test src/platform

### REQ-PLT-05
Source: spec.md#L21
Behavior: progress in IndexedDB; mastery = visited + mission + prediction; next suggested = first unmastered lesson in curriculum order with all prerequisites mastered, built ones first.
Expected: progress.test.ts covers mastery, the rule and hydration.
Command: pnpm test src/platform/progress && pnpm e2e

### REQ-PLT-06
Source: spec.md#L22
Behavior: versioned deflated base64url payload in `#s=`; unknown version or garbage → null.
Expected: snapshot.test.ts round-trips and rejects.
Command: pnpm test src/platform/snapshot && pnpm e2e

### REQ-PLT-07
Source: spec.md#L23
Behavior: companion `{ hidden, activation, convolution }` in a persisted store.
Expected: companion.test.ts rehydrates; e2e layer survives navigation and reload.
Command: pnpm test src/platform/companion && pnpm e2e

### REQ-PLT-08
Source: spec.md#L24
Behavior: `pickDaily(key, ids)` seeds the RNG from a date hash; picks a built lesson, then its mission; `/puzzle` shows it.
Expected: puzzle.test.ts: same date same pick; dates spread.
Command: pnpm test src/platform/puzzle

## Owned files
Per section in [sections/index.md](sections/index.md).

## Evidence
Platform cannot import catalog, so suggestion and puzzle take lesson lists; `Lesson` types live in platform. collectStrings calls function values, so code keys are skipped.
Decisions: ids are everyday slugs; prerequisites authored here (v2 has none); catalog keeps `playWith`, not mission text; term tag after a mission; snapshot in the hash; fixture module shown at `/styleguide/platform`.
Risks: format change (version field, unknown rejected); no IndexedDB keeps memory only. Rollback: drop the branch.

## Review
Verdict: pass
Reviewed: each REQ maps to a test; layer table respected; strings all checkable; no real lessons.
