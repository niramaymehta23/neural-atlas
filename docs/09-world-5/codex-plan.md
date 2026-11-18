<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 09 World 5 (How ChatGPT-style AI works): shared plan

Spec of record: `docs/requirements.md` (World 5, "Language models"); `docs/architecture.md`; `docs/hardening/`.

## Contract

### REQ-W5-01
Source: spec.md#L17-L17
Behavior: chopping-text-into-pieces, words-as-places, many-readers-at-once and knowing-the-order meet the DoD.
Expected: tokenizer equals Transformers.js GPT-2; analogy lands on queen; lesson tests cover missions, near misses, guesses, clamping, describe.
Command: pnpm vitest run src/engine/language src/modules/w5-transformers

### REQ-W5-02
Source: spec.md#L18-L18
Behavior: the-thinking-block, guess-the-next-word, safe-vs-adventurous, short-term-memory and confident-but-wrong meet the DoD; sampling dials redraw the word chances within one frame.
Expected: storyteller forward equals its PyTorch fixture; e2e shows a dial key press changes the bars before the next animation frame.
Command: pnpm vitest run src/modules/w5-transformers && E2E_PORT=4209 pnpm e2e e2e/w5-safe-vs-adventurous.spec.ts

### REQ-W5-03
Source: spec.md#L19-L19
Behavior: reading-the-internet (baby GPT trained in a worker), bigger-and-bigger and specialising (pirate fine-tune) meet the DoD.
Expected: gradients match finite differences; loss falls with a fixed seed; `@perf` e2e shows pirate words within 2 minutes on the reference profile.
Command: pnpm vitest run src/engine/language && E2E_PORT=4209 pnpm e2e e2e/w5-specialising.spec.ts

### REQ-W5-04
Source: spec.md#L20-L20
Behavior: learning-from-thumbs-up, looking-things-up, ai-that-takes-actions and pictures-and-words-together meet the DoD with a local corpus and scripted tools; no live model or API.
Expected: unit test per lesson; `e2e/world-5.spec.ts` passes for all 17 lessons with nothing sent elsewhere.
Command: E2E_PORT=4209 pnpm e2e e2e/world-5.spec.ts

## Owned files
Per section in [sections/index.md](sections/index.md).

## Decisions
- GPT-2 tokenizer files (`openai-community/gpt2` @607a30d, MIT) with our own byte-pair code; GloVe 50d (`fse/glove-wiki-gigaword-50` @6d69f9a, PDDL) cut to frequent words, int8.
- Tiny writers (word-level storyteller, character-level writer) trained on our own corpus with pinned PyTorch on CPU (MIT); the browser runs the same maths as typed arrays, and baby GPT trains in its own worker.
- Picture words: MobileNet fingerprints of photos-v1 aligned with GloVe captions by a short offline fit (ours, MIT).
- Many readers reuses `attentionReader()`; who-is-looking-at-whom is not edited.

## Risks
- Storyteller recall and invented titles depend on training: constants are measured, recorded beside the model and pinned by tests.
- Timing (one frame, two minutes) is judged with `e2e/frames.ts` profiles, never a fixed CI time.

## Evidence
Read: architecture.md (all hand-overs), hardening lessons and live-testing, meaning-as-places, reading-one-word-at-a-time, who-is-looking-at-whom, `platform/contract.ts`, `use-recorded-run.ts`, face-files loading, `check-model.ts`, `world-smoke.ts`.

Rollback: new files except `src/catalog/world-5.ts` (adds `load`), tests that used World 5 as a locked example, one docs section, `public/models/README.md` lines.

## Review
Verdict: pass
Reviewed: four REQs, ownership, DoD and hardening per lesson; findings in reviews/plan-review.md applied.
