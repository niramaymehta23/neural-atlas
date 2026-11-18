# Baby GPT

## Contract
### REQ-W5-03
Source: spec.md#L19-L19
Behavior: Reading the internet (character-level tiny GPT trained from scratch in a worker on the learner's text, recorded on the timeline; mission: one sentence learned by heart); Bigger and bigger (Chinchilla-shaped curves; mission: whole budget on one dial); Specialising (pretrained tiny writer fine-tuned on pirate talk in the worker; mission: ordinary writing forgotten).
Expected: gradients match finite differences; loss falls with a fixed seed; a link replays to the same step and loss; `@perf` e2e shows pirate words within 2 minutes on the reference profile (CI fails only on gross regressions).
Command: pnpm vitest run src/engine/language && E2E_PORT=4209 pnpm e2e e2e/w5-specialising.spec.ts

## Owned files
- src/engine/language/writer-worker.ts, writer-protocol.ts, writer-client.ts
- src/features/language/ (writer hook shared by two lessons)
- three lesson folders

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New lessons and engine only."}
```

## Evidence
Typed-array maths: a 2-layer, 48-wide character model steps in tens of milliseconds, so 2 minutes is over a thousand steps. Steps draw batches from (seed, step), so replay does not depend on chunking.

Rollback: revert the section commit.
Ownership: single writer (this session); no other stage touches these paths.

## Review
Verdict: pass
Reviewed: ENG-09 replay with progress; DH-01 hidden tabs; worker failures reach the error boundary.
