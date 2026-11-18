# The writer

## Contract
### REQ-W5-02
Source: spec.md#L18-L18
Behavior: The thinking block (seeded blocks on a residual stream; without the shortcut words blur into one); Guess the next word (word-level storyteller slot machine; mission: likeliest word every time loops); Safe vs adventurous (temperature and top-k redraw word chances in the same frame; mission: wild text the writer finds very unlikely); Short-term memory (window over a conversation; mission: the name falls out); Confident but wrong (sureness beside a truth check; mission: a book that does not exist).
Expected: storyteller forward equals the PyTorch fixture; recall works inside the window and fails outside; e2e shows a dial key press changes the bars before the next animation frame.
Command: pnpm vitest run src/modules/w5-transformers && E2E_PORT=4209 pnpm e2e e2e/w5-safe-vs-adventurous.spec.ts

## Owned files
- src/engine/language/tiny-gpt.ts, sampling.ts and tests
- src/features/language/ (word chances bars, storyteller hook)
- five lesson folders; public/models/tiny-writers-v1/; scripts/train-writers.py

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New lessons and engine only."}
```

## Evidence
Our own templated corpus (MIT), trained on CPU with pinned PyTorch. Measured constants (recall, invented titles) sit beside each model with their measurement.

Rollback: revert the section commit.
Ownership: single writer (this session); no other stage touches these paths.

## Review
Verdict: pass
Reviewed: one-frame timing judged by animation frames, not a fixed time; next-word guess reads the model at a fixed setting.
