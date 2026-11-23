<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 11 Experiences: shared plan

Also: `docs/requirements.md` (feature table), `docs/architecture.md`, `docs/hardening/`.

## Contract

### REQ-EXP-01
Source: spec.md#L17-L17
Behavior: `/sandbox` pairs any garden with any dot learner, and any board with any board learner; both train live in one worker, are seeded, and a link replays to the same step.
Expected: unit tests for every pairing; e2e trains both kinds, paints, round-trips a link.
Command: pnpm vitest run src/engine/lab src/experiences/sandbox && E2E_PORT=4311 pnpm e2e e2e/x-sandbox.spec.ts

### REQ-EXP-02
Source: spec.md#L18-L18
Behavior: `/journeys/how-chatgpt-works` plays end to end through existing lessons by catalog id; `/museum` is a scrollable timeline from the 1958 perceptron to modern language models with playable exhibits.
Expected: every stop and exhibit names a built catalog lesson; nothing imports `src/modules`; e2e plays the whole journey and exhibits.
Command: pnpm vitest run src/experiences/journeys src/experiences/museum && E2E_PORT=4311 pnpm e2e e2e/x-journeys.spec.ts e2e/x-museum.spec.ts

### REQ-EXP-03
Source: spec.md#L19-L19
Behavior: `/theatre` is a full-screen ambient view of a model really thinking, pausable, that runs 30 minutes without memory growth.
Expected: e2e fast-forwards the clock and asserts heap, nodes and listeners do not grow; a real 30-minute measurement is reported.
Command: E2E_PORT=4311 pnpm e2e e2e/x-theatre.spec.ts

### REQ-EXP-04
Source: spec.md#L20-L20
Behavior: `/two-player` offers race-to-train and break/repair; each finishes a round on one device, by touch or keyboard.
Expected: unit tests for the rules (seeded, ties, caps); e2e finishes a round of each.
Command: pnpm vitest run src/experiences/two-player && E2E_PORT=4311 pnpm e2e e2e/x-two-player.spec.ts

### REQ-EXP-05
Source: spec.md#L21-L21
Behavior: loss and accuracy become sound; no audio context exists until the learner turns sound on.
Expected: unit tests with a fake context; e2e counts AudioContexts.
Command: pnpm vitest run src/experiences/sound && E2E_PORT=4311 pnpm e2e e2e/x-sound.spec.ts

### REQ-EXP-06
Source: spec.md#L22-L22
Behavior: idea cards open from any caption; the compute meter counts the engines' own multiplications; achievements add stars to the home map.
Expected: every lesson caption offers a card; tallies equal hand counts; e2e opens a card and sees an earned star.
Command: pnpm vitest run src/engine/multiplications.test.ts src/experiences/glossary src/experiences/achievements && E2E_PORT=4311 pnpm e2e e2e/x-extras.spec.ts

## Owned files
Per section in [sections/index.md](sections/index.md): `src/experiences/`, the new routes, `src/engine/lab/`, `src/engine/multiplications.ts`, `e2e/x-*.spec.ts`. Shared edits are small and additive.

## Decisions
- Experience state is a `createModuleStore`, shared with the platform's `ShareControl` and `decodeSnapshot` (id = the experience's name), so links get the same clamping, size cap and failure notes as lessons.
- Lessons inside journeys and the museum run through `LessonStage` (catalog loader + store + timeline + the module's scene and dials). Nothing in `src/experiences` imports `src/modules` (the lint boundary already forbids it).
- Sandbox and two-player training run in one paced worker (`engine/lab`); a restarted job gets a new run number.
- The meter counts multiply-adds where the kernels do them (`engine/multiplications.ts`), worker totals are posted with each moment.
- Glossary mechanics (`CaptionText`, context) sit in `src/ui`; the cards and words in `src/experiences/glossary`, provided by the root layout.
- Achievements: an additive `achievements` list in the progress record; the map draws earned ones from a prop.
- `/explore` is the hub the site navigation links to; `/two-player` is the route for REQ-EXP-04.
- Star overlap: groups are laid out evenly as the camera sees them (height is traded along the line of sight), checked by projecting every pair.

## Risks
- Inline caption buttons could collide with lesson specs that find buttons by name: run the full suite, choose phrases that clash with none.
- Heap noise: compare after forced collection, from a warmed-up baseline on the same page.

## Evidence
Read: architecture.md, hardening, platform shell, snapshot, progress, puzzle, constellation, engine (model, dense, ml, rl, language), features (building, classic, rl, language), home/a11y/w6 specs. Already there, not rebuilt: snapshot links, daily puzzle, mission stars.

Rollback: new files except the additive shared edits listed in the report.

## Review
Verdict: pass
Reviewed: each REQ against spec and requirements table; link clamping, boundaries, worker restarts, reduced motion, phone layout and memory covered by named tests.
